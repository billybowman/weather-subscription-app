import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USER_POOL_ID = process.env.USER_POOL_ID!;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
const TOKENS_TABLE = process.env.API_TOKENS_TABLE!;

// Cognito JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'id',
  clientId: USER_POOL_CLIENT_ID,
});

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  console.log('Authorizer event:', JSON.stringify(event, null, 2));

  try {
    const token = event.authorizationToken;

    // Check if it's a Cognito JWT (starts with 'Bearer ')
    if (token.startsWith('Bearer ')) {
      const jwtToken = token.substring(7);
      return await validateCognitoToken(jwtToken, event.methodArn);
    }

    // Check if it's an API key (starts with 'wea_')
    if (token.startsWith('wea_')) {
      return await validateApiKey(token, event.methodArn);
    }

    // Invalid token format
    throw new Error('Invalid token format');
  } catch (error) {
    console.error('Authorization error:', error);
    throw new Error('Unauthorized');
  }
};

async function validateCognitoToken(token: string, methodArn: string): Promise<APIGatewayAuthorizerResult> {
  try {
    const payload = await verifier.verify(token);
    console.log('Cognito token validated for user:', payload.sub);

    return generatePolicy(payload.sub, 'Allow', methodArn, {
      userId: payload.sub,
      authType: 'cognito',
    });
  } catch (error) {
    console.error('Cognito token validation failed:', error);
    throw new Error('Unauthorized');
  }
}

async function validateApiKey(token: string, methodArn: string): Promise<APIGatewayAuthorizerResult> {
  try {
    // Hash the token to look up in DynamoDB
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Query by tokenHash using GSI
    const result = await docClient.send(new QueryCommand({
      TableName: TOKENS_TABLE,
      IndexName: 'TokenHashIndex',
      KeyConditionExpression: 'tokenHash = :tokenHash',
      ExpressionAttributeValues: {
        ':tokenHash': tokenHash,
      },
    }));

    if (!result.Items || result.Items.length === 0) {
      throw new Error('API key not found');
    }

    const apiToken = result.Items[0];

    // Check if token is revoked
    if (apiToken.revoked) {
      throw new Error('API key has been revoked');
    }

    // Check if token is expired
    if (apiToken.expiresAt && apiToken.expiresAt < Math.floor(Date.now() / 1000)) {
      throw new Error('API key has expired');
    }

    console.log('API key validated for user:', apiToken.userId);

    return generatePolicy(apiToken.userId, 'Allow', methodArn, {
      userId: apiToken.userId,
      tokenId: apiToken.id,
      authType: 'apikey',
    });
  } catch (error) {
    console.error('API key validation failed:', error);
    throw new Error('Unauthorized');
  }
}

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string>
): APIGatewayAuthorizerResult {
  const authResponse: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };

  if (context) {
    authResponse.context = context;
  }

  return authResponse;
}
