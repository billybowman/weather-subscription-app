# Weather Subscription Web App

Next.js 15 frontend for the Weather Subscription App with AWS Cognito authentication.

## Features

- AWS Cognito authentication (sign up, sign in, email verification)
- Location subscription management
- Real-time weather data display
- 5-day weather forecast
- Responsive design with Tailwind CSS
- Dark mode support

## Prerequisites

- Node.js 20.x or later
- Deployed AWS backend (see `apps/api/README.md`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```

3. Update `.env.local` with your AWS deployment outputs:
   - `NEXT_PUBLIC_API_URL`: API Gateway endpoint (from SAM deploy)
   - `NEXT_PUBLIC_AWS_REGION`: AWS region (e.g., `us-east-1`)
   - `NEXT_PUBLIC_USER_POOL_ID`: Cognito User Pool ID (from SAM deploy)
   - `NEXT_PUBLIC_USER_POOL_CLIENT_ID`: Cognito Client ID (from SAM deploy)

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Authentication Flow (Cognito)

1. **Sign Up**: User creates account with email and password
2. **Verification**: Cognito sends verification code to email
3. **Confirm**: User enters code to verify account
4. **Sign In**: User authenticates with Cognito
5. **ID Token**: Frontend receives JWT token for API requests

### API Integration

The app uses AWS Amplify to handle Cognito authentication:

```typescript
// lib/auth-context.tsx - Amplify Cognito integration
// lib/api-client.ts - API requests with JWT tokens
```

All API requests include the Cognito ID token in the Authorization header:

```typescript
headers: {
  'Authorization': `Bearer ${idToken}`
}
```

API Gateway validates the token against the Cognito User Pool.

### Pages

- `/` - Home (redirects to login or dashboard)
- `/login` - Sign in page
- `/signup` - Sign up with email verification
- `/dashboard` - Main app (requires authentication)

### Components

- `WeatherCard` - Displays current weather and 5-day forecast
- `AddSubscriptionModal` - Form to add new location subscriptions

## Architecture

```
Frontend (Next.js)
  ↓ (Cognito ID Token)
API Gateway
  ↓ (validates token)
Lambda Functions
  ↓
DynamoDB Tables
```

## Building for Production

```bash
npm run build
npm start
```

## Deployment

Deploy to Vercel:

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard.

## Learning Cognito Integration

Key files to understand Cognito integration:

1. `lib/amplify-config.ts` - Amplify configuration
2. `lib/auth-context.tsx` - Authentication context with Cognito methods
3. `app/signup/page.tsx` - Sign up flow with email verification
4. `app/login/page.tsx` - Sign in flow
5. `lib/api-client.ts` - Authenticated API requests

The ID token is a JWT that contains user claims (sub, email, etc.) and is validated by API Gateway using the Cognito User Pool.
