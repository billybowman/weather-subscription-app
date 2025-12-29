# Weather Subscription API

AWS SAM-based serverless API for the Weather Subscription App.

## Architecture

- **API Gateway**: REST API with Cognito authorization
- **Lambda Functions**:
  - `SubscriptionsFunction`: Handle CRUD operations for location subscriptions
  - `WeatherFunction`: Retrieve weather data for a subscription
  - `WeatherFetchFunction`: Scheduled job to fetch weather from OpenWeatherMap every 30 minutes
- **DynamoDB Tables**:
  - `WeatherSubscriptions`: Store user location subscriptions
  - `WeatherData`: Store fetched weather data (with 30-day TTL)
- **EventBridge**: Triggers weather fetch every 30 minutes

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. AWS SAM CLI installed (`brew install aws-sam-cli` on macOS)
3. Node.js 20.x
4. OpenWeatherMap API key ([Get one here](https://openweathermap.org/api))
5. Cognito User Pool (for authentication)

## Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in:
   - `OPENWEATHER_API_KEY`: Your OpenWeatherMap API key
   - `COGNITO_USER_POOL_ARN`: Your Cognito User Pool ARN
   - `AWS_REGION`: AWS region to deploy to

3. Install dependencies for the Lambda layer:
   ```bash
   cd layers/dependencies && npm install && cd ../..
   ```

## Build

Build all Lambda functions:

```bash
sam build
```

## Local Testing

Start the API locally:

```bash
sam local start-api
```

The API will be available at `http://localhost:3000`

## Deployment

### First-time deployment:

```bash
sam deploy --guided
```

Follow the prompts and provide:
- Stack name (e.g., `weather-subscription-app`)
- AWS Region
- OpenWeatherMap API Key
- Cognito User Pool ARN

### Subsequent deployments:

```bash
sam deploy
```

## API Endpoints

All endpoints require Cognito authentication (except OPTIONS for CORS).

### Subscriptions

- `POST /subscriptions` - Create a new location subscription
  ```json
  {
    "location": "New York, NY",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "city": "New York",
    "country": "US"
  }
  ```

- `GET /subscriptions` - List all subscriptions for the authenticated user

- `DELETE /subscriptions/{id}` - Delete a subscription

### Weather

- `GET /weather/{subscriptionId}` - Get current weather and 5-day forecast for a subscription

## Monitoring

View Lambda logs:

```bash
sam logs -n SubscriptionsFunction --tail
sam logs -n WeatherFunction --tail
sam logs -n WeatherFetchFunction --tail
```

## Cleanup

Delete the stack and all resources:

```bash
sam delete
```
