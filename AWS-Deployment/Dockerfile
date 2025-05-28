FROM n8nio/n8n

# Add your published node from npm
RUN npm install n8n-nodes-cronlytic

# Optional: copy custom assets if needed
# COPY ./custom /home/node/.n8n/custom

# Ensure n8n picks it up
ENV N8N_CUSTOM_EXTENSIONS="/home/node/.n8n"

# Set defaults
ENV N8N_PORT=5678
EXPOSE 5678
