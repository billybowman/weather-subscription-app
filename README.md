# Weather Subscription App

A full-stack serverless application for subscribing to weather updates using AWS services.

## Architecture

### Backend (AWS SAM)
- **API Gateway**: REST API with Cognito authorization
- **Lambda Functions**:
  - Subscriptions management (create, list, delete)
  - Weather data retrieval
  - Scheduled weather fetching (every 30 min)
- **DynamoDB**: Storage for subscriptions and weather data
- **Cognito**: User authentication and authorization
- **EventBridge**: Triggers for scheduled weather updates
- **OpenWeatherMap API**: Weather data source

### Frontend (Next.js 15)
- **Authentication**: AWS Amplify + Cognito integration
- **UI**: React with Tailwind CSS
- **Features**: Sign up, sign in, location management, weather display

## Project Structure

```
weather-subscription-app/
├── apps/
│   ├── api/                  # AWS SAM backend
│   │   ├── template.yaml     # CloudFormation/SAM template
│   │   ├── src/
│   │   │   ├── subscriptions/   # Subscription Lambda
│   │   │   ├── weather/         # Weather retrieval Lambda
│   │   │   └── weather-fetch/   # Scheduled fetch Lambda
│   │   └── layers/
│   │       └── dependencies/    # Shared Lambda layer
│   └── web/                  # Next.js frontend
│       ├── app/              # Next.js 15 app router
│       ├── components/       # React components
│       └── lib/              # Auth context, API client
└── packages/
    └── shared/               # Shared TypeScript types
```

## Quick Start

### Prerequisites

1. **AWS Account** with CLI configured
2. **OpenWeatherMap API Key** - Get free key at https://openweathermap.org/api
3. **Node.js 20.x**
4. **AWS SAM CLI** - `brew install aws-sam-cli`

### 1. Deploy Backend to AWS

```bash
cd apps/api

# Install dependencies
npm run install:all

# Deploy (will prompt for config)
sam build && sam deploy --guided
```

During deployment, provide:
- Stack name (e.g., `weather-subscription-app`)
- AWS Region (e.g., `us-east-1`)
- OpenWeatherMap API Key

**Save the outputs:**
- `ApiEndpoint`
- `UserPoolId`
- `UserPoolClientId`

### 2. Configure Frontend

```bash
cd apps/web

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
```

Edit `.env.local` with your deployment outputs:

```env
NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Run Frontend Locally

```bash
npm run dev
```

Open http://localhost:3000

## How It Works

### Authentication Flow

1. User signs up with email and password
2. Cognito sends verification code to email
3. User verifies account with code
4. User signs in and receives JWT ID token
5. Frontend includes token in all API requests
6. API Gateway validates token against Cognito

### Data Flow

1. **User adds location** → Lambda creates subscription in DynamoDB
2. **Every 30 minutes** → EventBridge triggers weather-fetch Lambda
3. **Weather-fetch Lambda**:
   - Scans all subscriptions
   - Fetches current weather + forecast from OpenWeatherMap
   - Stores data in DynamoDB (with 30-day TTL)
4. **User views dashboard** → Frontend fetches latest weather data

### API Endpoints

All endpoints require Cognito JWT token in `Authorization: Bearer <token>` header:

- `POST /subscriptions` - Create location subscription
- `GET /subscriptions` - List user's subscriptions
- `DELETE /subscriptions/{id}` - Delete subscription
- `GET /weather/{subscriptionId}` - Get current weather + forecast

## Learning Resources

### Understanding Cognito Integration

The app demonstrates:
- **Sign up flow** with email verification (`app/signup/page.tsx`)
- **Sign in flow** with JWT tokens (`app/login/page.tsx`)
- **Authenticated API calls** (`lib/api-client.ts`)
- **Cognito authorizer** in API Gateway (`template.yaml`)

Key concepts:
- **User Pool**: Directory of users
- **User Pool Client**: App-specific settings
- **ID Token**: JWT containing user claims
- **API Gateway Authorizer**: Validates JWT against User Pool

### Understanding Lambda + API Gateway

The app demonstrates:
- **SAM template** defining infrastructure (`apps/api/template.yaml`)
- **Lambda functions** as API handlers (`apps/api/src/`)
- **Environment variables** for configuration
- **Lambda layers** for shared dependencies
- **EventBridge rules** for scheduled execution

## Development Tips

### Testing API Locally

Note: Local SAM testing requires Docker. For macOS 12 and earlier, Docker Desktop is not supported.

Alternative: Deploy to AWS and test against real endpoints (recommended for learning).

### Viewing Logs

```bash
cd apps/api

# View Lambda logs
sam logs -n SubscriptionsFunction --tail
sam logs -n WeatherFunction --tail
sam logs -n WeatherFetchFunction --tail
```

### Updating Backend

```bash
cd apps/api
sam build && sam deploy
```

### Testing Cognito Flow

1. Sign up at http://localhost:3000/signup
2. Check email for verification code
3. Verify and sign in
4. Check browser DevTools Network tab to see:
   - Cognito API calls
   - JWT tokens in request headers
   - API Gateway responses

## Cleanup

Delete all AWS resources:

```bash
cd apps/api
sam delete
```

## Cost Estimate

With AWS Free Tier:
- **Cognito**: Free for first 50,000 MAU
- **Lambda**: Free for 1M requests/month
- **DynamoDB**: Free for 25GB storage + 25 RCU/WCU
- **API Gateway**: Free for 1M requests/month
- **EventBridge**: Free

Expected cost: **$0-5/month** for personal use

## Troubleshooting

### Frontend can't connect to API

- Check `.env.local` has correct API URL
- Verify API Gateway allows CORS
- Check browser console for errors

### Authentication fails

- Verify Cognito User Pool ID and Client ID
- Check user confirmed their email
- Look at browser Network tab for Cognito errors

### Weather data not appearing

- Wait 30 minutes for first scheduled fetch
- Check Lambda logs for errors
- Verify OpenWeatherMap API key is valid

## Next Steps

- Add email notifications for weather alerts
- Implement weather thresholds (notify if temp > X)
- Add location search with geocoding API
- Deploy frontend to Vercel
- Add unit tests for Lambda functions
- Implement CI/CD pipeline

## License

MIT
