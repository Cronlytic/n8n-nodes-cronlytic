# Cronlytic Programmatic API Documentation

## Overview

The Cronlytic Programmatic API allows developers to manage cron jobs programmatically using REST API endpoints. This API provides full CRUD operations for cron jobs with API key-based authentication.

**Status:** ✅ Production Ready - All endpoints fully functional

## Base URL

- **Production**: `https://api.cronlytic.com/prog/`

## Authentication

All API endpoints (except `/ping`) require authentication using API keys. Include these headers in every request:

```http
X-API-Key: your_api_key_here
X-User-ID: your_user_id_here
Content-Type: application/json
```

### How to Get API Keys
1. Log into your Cronlytic dashboard
2. Navigate to "API Keys" section
3. Click "Generate New API Key"
4. Copy your API key and User ID

### Example Authentication Headers
```bash
-H "X-API-Key: your_api_key"
-H "X-User-ID: your_user_id"
-H "Content-Type: application/json"
```

## Quick Start

Here's a complete workflow to get you started:

```bash
# 1. Health check
curl -X GET "https://api.cronlytic.com/prog/ping"

# 2. Create a job
curl -X POST "https://api.cronlytic.com/prog/jobs" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-webhook",
    "url": "https://api.example.com/webhook",
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": "{\"source\": \"cronlytic\"}",
    "cron_expression": "0 9 * * *"
  }'

# 3. List your jobs
curl -X GET "https://api.cronlytic.com/prog/jobs" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id"

# 4. Pause a job
curl -X POST "https://api.cronlytic.com/prog/jobs/{job_id}/pause" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id"
```

## API Endpoints

### 1. Health Check

**GET** `/ping`

Check if the API is running.

**No authentication required**

```bash
curl -X GET "https://api.cronlytic.com/prog/ping"
```

**Response:**
```json
{
  "message": "pong"
}
```

---

### 2. Create Job

**POST** `/jobs`

Create a new cron job.

**Request Body:** All fields are required
```json
{
  "name": "my-job-name",
  "url": "https://example.com/webhook",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer token",
    "Content-Type": "application/json"
  },
  "body": "{\"key\": \"value\"}",
  "cron_expression": "*/5 * * * *"
}
```

**Example:**
```bash
curl -X POST "https://api.cronlytic.com/prog/jobs" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "health-check-job",
    "url": "https://httpbin.org/get",
    "method": "GET",
    "headers": {
      "User-Agent": "Cronlytic-Bot"
    },
    "body": "",
    "cron_expression": "*/5 * * * *"
  }'
```

**Response:**
```json
{
  "job_id": "08114f33-fbe7-46ff-9307-448f10019f7c",
  "user_id": "user-uuid",
  "name": "health-check-job",
  "url": "https://httpbin.org/get",
  "method": "GET",
  "headers": {
    "User-Agent": "Cronlytic-Bot"
  },
  "body": "",
  "cron_expression": "*/5 * * * *",
  "status": "pending",
  "last_run_at": null,
  "next_run_at": "2025-05-26T11:00:00Z"
}
```

**Status Codes:**
- `200` - Job created successfully
- `403` - Job limit exceeded for your plan
- `422` - Validation error (invalid input)

---

### 3. List Jobs

**GET** `/jobs`

Retrieve all jobs for the authenticated user.

```bash
curl -X GET "https://api.cronlytic.com/prog/jobs" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id"
```

**Response:**
```json
[
  {
    "job_id": "uuid-1",
    "user_id": "user-uuid",
    "name": "job-1",
    "url": "https://example.com/webhook1",
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": "{\"data\": \"value\"}",
    "cron_expression": "0 9 * * *",
    "status": "pending",
    "last_run_at": "2025-05-26T09:00:00Z",
    "next_run_at": "2025-05-27T09:00:00Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Invalid API key or User ID

---

### 4. Get Specific Job

**GET** `/jobs/{job_id}`

Retrieve details for a specific job.

```bash
curl -X GET "https://api.cronlytic.com/prog/jobs/uuid-here" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id"
```

**Response:** Same format as create job response.

**Status Codes:**
- `200` - Success
- `404` - Job not found

---

### 5. Update Job

**PUT** `/jobs/{job_id}`

Update an existing job. **All fields are required** - provide the complete job definition.

**Request Body:**
```json
{
  "name": "updated-job-name",
  "url": "https://new-url.com/webhook",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer new-token",
    "Content-Type": "application/json"
  },
  "body": "{\"updated\": true}",
  "cron_expression": "0 * * * *"
}
```

**Example:**
```bash
curl -X PUT "https://api.cronlytic.com/prog/jobs/uuid-here" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "updated-health-check",
    "url": "https://httpbin.org/post",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\"source\": \"cronlytic-updated\"}",
    "cron_expression": "0 * * * *"
  }'
```

**Response:** Updated job object with new `next_run_at` calculated automatically.

**Status Codes:**
- `200` - Job updated successfully
- `404` - Job not found
- `422` - Validation error

---

### 6. Delete Job

**DELETE** `/jobs/{job_id}`

Delete a job and all its associated logs permanently.

```bash
curl -X DELETE "https://api.cronlytic.com/prog/jobs/uuid-here" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id"
```

**Response:**
```json
{
  "deleted": true
}
```

**Status Codes:**
- `200` - Job deleted successfully
- `404` - Job not found

---

### 7. Pause Job

**POST** `/jobs/{job_id}/pause`

Pause a job to stop it from executing. The job will retain all its configuration but won't run until resumed.

```bash
curl -X POST "https://api.cronlytic.com/prog/jobs/uuid-here/pause" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id"
```

**Response:** Job object with status set to `"paused"`

**Status Codes:**
- `200` - Job paused successfully
- `404` - Job not found

---

### 8. Resume Job

**POST** `/jobs/{job_id}/resume`

Resume a paused job. The job will be scheduled to run according to its cron expression.

```bash
curl -X POST "https://api.cronlytic.com/prog/jobs/uuid-here/resume" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id"
```

**Response:** Job object with status set to `"pending"` and updated `next_run_at`

**Status Codes:**
- `200` - Job resumed successfully
- `404` - Job not found

---

### 9. Get Job Logs

**GET** `/jobs/{job_id}/logs`

Retrieve execution logs for a specific job (last 50 entries, sorted by timestamp descending).

```bash
curl -X GET "https://api.cronlytic.com/prog/jobs/uuid-here/logs" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id"
```

**Response:**
```json
{
  "job_id": "uuid-here",
  "logs": [
    {
      "timestamp": "2025-05-26T10:00:00Z",
      "status": "success",
      "response_code": 200,
      "response_time": 0.045,
      "error_message": ""
    },
    {
      "timestamp": "2025-05-26T09:00:00Z",
      "status": "failed",
      "response_code": 500,
      "response_time": 1.234,
      "error_message": "Connection timeout"
    }
  ]
}
```

**Log Status Values:**
- `success` - Request completed successfully
- `failed` - Request failed (network error, HTTP error, etc.)

**Status Codes:**
- `200` - Success (may return empty logs array)
- `404` - Job not found

---

## Data Schemas

### JobCreate Schema
All fields are required when creating a job:

```json
{
  "name": "string (required, 1-50 chars, alphanumeric with hyphens/underscores only)",
  "url": "string (required, valid HTTP/HTTPS URL)",
  "method": "string (required, default: 'GET')",
  "headers": "object (required, can be empty {})",
  "body": "string (required, can be empty '')",
  "cron_expression": "string (required, valid 5-field cron expression)"
}
```

### JobUpdate Schema
All fields are required when updating a job (complete replacement):

```json
{
  "name": "string (required)",
  "url": "string (required)",
  "method": "string (required)",
  "headers": "object (required)",
  "body": "string (required)",
  "cron_expression": "string (required)"
}
```

### JobResponse Schema
```json
{
  "job_id": "string (UUID)",
  "user_id": "string (UUID)",
  "name": "string",
  "url": "string",
  "method": "string",
  "headers": "object",
  "body": "string",
  "cron_expression": "string",
  "status": "string (pending|paused|success|failed)",
  "last_run_at": "datetime (ISO 8601, nullable)",
  "next_run_at": "datetime (ISO 8601, nullable)"
}
```

---

## Job Status Values

| Status | Description |
|--------|-------------|
| `pending` | Job is scheduled and will run at next_run_at |
| `paused` | Job is paused and won't execute |
| `success` | Job last execution completed successfully |
| `failed` | Job last execution failed |

---

## Validation Rules

### Job Name Validation
- **Rule**: Only letters, numbers, hyphens (-), and underscores (_) are allowed
- **Length**: 1-50 characters
- **Regex**: `^[a-zA-Z0-9_-]+$`
- **Valid Examples**: `my-job`, `test_job_1`, `API-Health-Check`
- **Invalid Examples**: `my job` (space), `test@job` (special char), `api.health` (period)

### URL Validation
- Must be a valid HTTP or HTTPS URL
- Examples: `https://api.example.com/webhook`, `http://localhost:3000/test`

### HTTP Methods
Supported methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`

### Headers
- Must be a valid JSON object
- Keys and values must be strings
- Example: `{"Content-Type": "application/json", "Authorization": "Bearer token"}`

### Body
- Can be any string (including empty)
- For JSON APIs, ensure proper JSON formatting
- Example: `"{\"key\": \"value\", \"number\": 123}"`

### Cron Expression Format
Standard 5-field cron format: `minute hour day month day-of-week`

**Common Examples:**
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour at minute 0
- `0 9 * * 1-5` - 9 AM on weekdays (Monday-Friday)
- `0 0 1 * *` - First day of every month at midnight
- `30 14 * * 0` - 2:30 PM every Sunday
- `0 6,12,18 * * *` - 6 AM, 12 PM, and 6 PM daily

**Cron Fields:**
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

---

## Error Responses

### Authentication Errors (401)
```json
{
  "detail": "Invalid API key"
}
```

### Authorization Errors (403)
```json
{
  "detail": {
    "error": "Job limit exceeded",
    "plan": "free",
    "job_count": 5,
    "max_jobs": 5,
    "hint": "Upgrade your plan to create more jobs"
  }
}
```

### Not Found Errors (404)
```json
{
  "detail": "Job not found"
}
```

### Validation Errors (422)
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "name"],
      "msg": "Name can only contain letters, numbers, hyphens (-), and underscores (_)",
      "input": "invalid name!"
    }
  ]
}
```

---

## Rate Limits and Quotas

- **API Requests**: No explicit rate limiting (reasonable use expected)
- **Job Limits**: Based on your subscription plan
  - Free: 5 jobs maximum
  - Paid plans: Higher limits
- **Execution Quota**: Monthly execution limits based on plan
- **Log Retention**: Last 50 execution logs per job

---

## Best Practices

### 1. Job Naming
```bash
# Good
"api-health-check"
"daily-backup-job"
"user-notification-sender"

# Avoid
"My API Job" (spaces)
"job#1" (special characters)
"" (empty name)
```

### 2. Error Handling
Always check response status codes:
```bash
curl -w "%{http_code}" -X GET "https://api.cronlytic.com/prog/jobs" \
  -H "X-API-Key: your_api_key" \
  -H "X-User-ID: your_user_id"
```

### 3. Webhook Security
Include authentication in your webhook calls:
```json
{
  "headers": {
    "Authorization": "Bearer your-webhook-token",
    "Content-Type": "application/json",
    "X-API-Key": "your-service-api-key"
  }
}
```

### 4. Cron Expression Testing
Test your cron expressions before creating jobs:
- Use tools like [crontab.guru](https://crontab.guru/)
- Verify the next execution time in the API response

### 5. Monitoring
- Regularly check job logs for failures
- Set up monitoring for critical jobs
- Use meaningful job names for easier identification

---

## SDK Examples

### Python Example
```python
import requests
import json
from datetime import datetime

class CronlyticAPI:
    def __init__(self, api_key, user_id, base_url="https://api.cronlytic.com/prog"):
        self.api_key = api_key
        self.user_id = user_id
        self.base_url = base_url
        self.headers = {
            "X-API-Key": api_key,
            "X-User-ID": user_id,
            "Content-Type": "application/json"
        }

    def create_job(self, name, url, method="GET", headers=None, body="", cron_expression="*/5 * * * *"):
        data = {
            "name": name,
            "url": url,
            "method": method,
            "headers": headers or {},
            "body": body,
            "cron_expression": cron_expression
        }
        response = requests.post(f"{self.base_url}/jobs", headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

    def list_jobs(self):
        response = requests.get(f"{self.base_url}/jobs", headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_job(self, job_id):
        response = requests.get(f"{self.base_url}/jobs/{job_id}", headers=self.headers)
        response.raise_for_status()
        return response.json()

    def update_job(self, job_id, name, url, method, headers=None, body="", cron_expression="*/5 * * * *"):
        data = {
            "name": name,
            "url": url,
            "method": method,
            "headers": headers or {},
            "body": body,
            "cron_expression": cron_expression
        }
        response = requests.put(f"{self.base_url}/jobs/{job_id}", headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

    def delete_job(self, job_id):
        response = requests.delete(f"{self.base_url}/jobs/{job_id}", headers=self.headers)
        response.raise_for_status()
        return response.json()

    def pause_job(self, job_id):
        response = requests.post(f"{self.base_url}/jobs/{job_id}/pause", headers=self.headers)
        response.raise_for_status()
        return response.json()

    def resume_job(self, job_id):
        response = requests.post(f"{self.base_url}/jobs/{job_id}/resume", headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_job_logs(self, job_id):
        response = requests.get(f"{self.base_url}/jobs/{job_id}/logs", headers=self.headers)
        response.raise_for_status()
        return response.json()

# Usage Example
api = CronlyticAPI("your_api_key", "your_user_id")

# Create a job
job = api.create_job(
    name="daily-report",
    url="https://api.example.com/generate-report",
    method="POST",
    headers={"Authorization": "Bearer token"},
    body='{"report_type": "daily"}',
    cron_expression="0 9 * * *"
)
print(f"Created job: {job['job_id']}")

# List all jobs
jobs = api.list_jobs()
print(f"Total jobs: {len(jobs)}")

# Pause a job
api.pause_job(job['job_id'])
print("Job paused")
```

### JavaScript/Node.js Example
```javascript
class CronlyticAPI {
    constructor(apiKey, userId, baseUrl = 'https://api.cronlytic.com/prog') {
        this.apiKey = apiKey;
        this.userId = userId;
        this.baseUrl = baseUrl;
        this.headers = {
            'X-API-Key': apiKey,
            'X-User-ID': userId,
            'Content-Type': 'application/json'
        };
    }

    async createJob(name, url, method = 'GET', headers = {}, body = '', cronExpression = '*/5 * * * *') {
        const response = await fetch(`${this.baseUrl}/jobs`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                name,
                url,
                method,
                headers,
                body,
                cron_expression: cronExpression
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    async listJobs() {
        const response = await fetch(`${this.baseUrl}/jobs`, {
            headers: this.headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    async updateJob(jobId, name, url, method, headers = {}, body = '', cronExpression = '*/5 * * * *') {
        const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify({
                name,
                url,
                method,
                headers,
                body,
                cron_expression: cronExpression
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    async pauseJob(jobId) {
        const response = await fetch(`${this.baseUrl}/jobs/${jobId}/pause`, {
            method: 'POST',
            headers: this.headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
}

// Usage
const api = new CronlyticAPI('your_api_key', 'your_user_id');

(async () => {
    try {
        // Create a job
        const job = await api.createJob(
            'webhook-job',
            'https://api.example.com/webhook',
            'POST',
            {'Content-Type': 'application/json'},
            '{"source": "cronlytic"}',
            '0 * * * *'
        );
        console.log(`Created job: ${job.job_id}`);

        // List jobs
        const jobs = await api.listJobs();
        console.log(`Total jobs: ${jobs.length}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
})();
```

### cURL Script Example
```bash
#!/bin/bash

# Configuration
API_KEY="your_api_key"
USER_ID="your_user_id"
BASE_URL="https://api.cronlytic.com/prog"

# Function to make API calls with proper error handling
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -n "$data" ]; then
        curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "X-API-Key: $API_KEY" \
            -H "X-User-ID: $USER_ID" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "X-API-Key: $API_KEY" \
            -H "X-User-ID: $USER_ID"
    fi
}

# Create a job
echo "Creating job..."
JOB_DATA='{
    "name": "example-job",
    "url": "https://httpbin.org/post",
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": "{\"source\": \"cronlytic\"}",
    "cron_expression": "0 9 * * *"
}'

RESPONSE=$(api_call "POST" "/jobs" "$JOB_DATA")
HTTP_CODE="${RESPONSE: -3}"
BODY="${RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Job created successfully"
    JOB_ID=$(echo "$BODY" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)
    echo "Job ID: $JOB_ID"
else
    echo "❌ Failed to create job (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi

# List jobs
echo -e "\nListing jobs..."
RESPONSE=$(api_call "GET" "/jobs")
HTTP_CODE="${RESPONSE: -3}"
BODY="${RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Jobs retrieved successfully"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo "❌ Failed to list jobs (HTTP $HTTP_CODE)"
fi
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failed
**Error:** `{"detail": "Invalid API key"}`
**Solution:**
- Verify your API key is correct
- Check that X-User-ID header matches your account
- Ensure both headers are included in every request

#### 2. Job Not Found
**Error:** `{"detail": "Job not found"}`
**Solutions:**
- Verify the job ID is correct
- Ensure the job belongs to your user account
- Check if the job was deleted

#### 3. Validation Errors
**Error:** `422 Unprocessable Entity`
**Solutions:**
- Check job name contains only allowed characters
- Verify cron expression is valid 5-field format
- Ensure URL is a valid HTTP/HTTPS URL
- Validate all required fields are provided

#### 4. Job Limit Exceeded
**Error:** `{"detail": {"error": "Job limit exceeded", ...}}`
**Solution:** Upgrade your plan or delete unused jobs

### Getting Help

- **Documentation Issues**: Check this README for the latest information
- **API Errors**: Check the error response for specific details
- **Support**: Contact support@cronlytic.com
- **Status Page**: Check https://status.cronlytic.com for service status

---

## Changelog

### v1.0.0 (May 26, 2025)
- ✅ Initial release with full CRUD operations
- ✅ API key authentication system
- ✅ Job management endpoints (create, read, update, delete)
- ✅ Job lifecycle management (pause, resume)
- ✅ Execution logging functionality
- ✅ Comprehensive error handling
- ✅ Input validation and security measures
- ✅ Production deployment and testing complete

---

## Support

For API support and questions:
- **Email**: support@cronlytic.com
- **Documentation**: This README
- **Status Page**: https://status.cronlytic.com
- **Test Report**: See `TEST_REPORT.md` for detailed testing information

---

**Last Updated:** May 26, 2025
**API Version:** 1.0.0
**Status:** ✅ Production Ready