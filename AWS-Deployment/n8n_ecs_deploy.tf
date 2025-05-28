terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source = "hashicorp/null"
    }
  }
  required_version = ">= 1.3.0"
}

provider "aws" {
  region = "us-east-1"
}

variable "existing_acm_cert_arn" {
  description = "ARN of the existing *.cronlytic.com certificate in ACM"
  type        = string
}

# Networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

# Security
resource "aws_security_group" "alb_sg" {
  name        = "alb-sg"
  vpc_id      = aws_vpc.main.id
  description = "Allow HTTPS"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "n8n_sg" {
  name        = "n8n-sg"
  vpc_id      = aws_vpc.main.id
  description = "Allow ECS"

  ingress {
    from_port   = 5678
    to_port     = 5678
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECR
resource "aws_ecr_repository" "n8n" {
  name         = "n8n-cronlytic"
  force_delete = true
}

resource "null_resource" "docker_push" {
  provisioner "local-exec" {
    command = <<EOT
      aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${aws_ecr_repository.n8n.repository_url}
      docker build -t n8n-custom .
      docker tag n8n-custom:latest ${aws_ecr_repository.n8n.repository_url}:latest
      docker push ${aws_ecr_repository.n8n.repository_url}:latest
    EOT
  }
}

# ECS
resource "aws_ecs_cluster" "n8n" {
  name = "n8n-cluster"
}

resource "aws_iam_role" "n8n_task_execution" {
  name = "n8n-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.n8n_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "n8n" {
  family                   = "n8n-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.n8n_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "n8n"
      image     = "${aws_ecr_repository.n8n.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 5678,
          hostPort      = 5678
        }
      ],
      environment = [
        { name = "N8N_HOST", value = "test.cronlytic.com" },
        { name = "N8N_PORT", value = "5678" },
        { name = "N8N_PROTOCOL", value = "https" },
        { name = "WEBHOOK_URL", value = "https://test.cronlytic.com/" },
        { name = "N8N_CUSTOM_EXTENSIONS", value = "/home/node/.n8n" },
        { name = "N8N_SECURE_COOKIE", value = "true" }
      ]
    }
  ])
}

resource "aws_lb_target_group" "n8n" {
  name        = "n8n-tg"
  port        = 5678
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id
}

resource "aws_ecs_service" "n8n" {
  name            = "n8n-service"
  cluster         = aws_ecs_cluster.n8n.id
  task_definition = aws_ecs_task_definition.n8n.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets         = [aws_subnet.public.id, aws_subnet.public_b.id]
    assign_public_ip = true
    security_groups  = [aws_security_group.n8n_sg.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.n8n.arn
    container_name   = "n8n"
    container_port   = 5678
  }

  depends_on = [aws_lb_listener.https]
}

# ALB + HTTPS
resource "aws_lb" "n8n" {
  name               = "n8n-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = [aws_subnet.public.id, aws_subnet.public_b.id]
  security_groups    = [aws_security_group.alb_sg.id]
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.n8n.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.existing_acm_cert_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.n8n.arn
  }
}

# DNS
data "aws_route53_zone" "primary" {
  name         = "cronlytic.com."
  private_zone = false
}

resource "aws_route53_record" "n8n_subdomain" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "test.cronlytic.com"
  type    = "A"

  alias {
    name                   = aws_lb.n8n.dns_name
    zone_id                = aws_lb.n8n.zone_id
    evaluate_target_health = true
  }
}

# Output
output "n8n_https_url" {
  description = "HTTPS endpoint for n8n via custom domain"
  value       = "https://test.cronlytic.com"
}
