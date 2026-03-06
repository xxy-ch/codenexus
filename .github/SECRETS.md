# GitHub Secrets Configuration

This document outlines the required GitHub secrets for the Online Judge CI/CD pipeline.

## Required Secrets

### Docker Hub Credentials
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password or access token

### Application Secrets
- `JWT_SECRET`: Secret key for JWT token generation
- `DATABASE_URL`: Production database connection string
- `REDIS_URL`: Production Redis connection string

### Optional Secrets
- `CODECOV_TOKEN`: Codecov token for coverage reports
- `SLACK_WEBHOOK`: Slack webhook for notifications

## Setup Instructions

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret listed above

## Example Values

```bash
# Docker Hub
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-access-token

# Application
JWT_SECRET=your-super-secret-jwt-key-here
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379

# Optional
CODECOV_TOKEN=your-codecov-token
SLACK_WEBHOOK=your-slack-webhook-url
```

## Security Notes

- Never commit secrets to the repository
- Use strong, unique secrets
- Rotate secrets regularly
- Use access tokens instead of passwords when possible
- Limit secret access to necessary workflows only