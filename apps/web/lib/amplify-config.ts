export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        email: true,
      },
    },
  },
};

export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  region: process.env.NEXT_PUBLIC_AWS_REGION!,
};
