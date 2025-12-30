import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ApiToken, CreateTokenRequest, CreateTokenResponse, ListTokensResponse } from './types.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.API_TOKENS_TABLE!;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

const MAX_EXPIRY_DAYS = 365;
const TOKEN_PREFIX = 'wea_';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    const method = event.httpMethod;

    switch (method) {
      case 'POST':
        return await createToken(event, userId);
      case 'GET':
        return await listTokens(userId);
      case 'DELETE':
        return await revokeToken(event, userId);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

async function createToken(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Request body is required' }),
    };
  }

  const request: CreateTokenRequest = JSON.parse(event.body);

  if (!request.name || request.name.trim().length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Token name is required' }),
    };
  }

  // Validate expiry
  if (request.expiresInDays !== undefined) {
    if (request.expiresInDays < 1 || request.expiresInDays > MAX_EXPIRY_DAYS) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: `Expiry must be between 1 and ${MAX_EXPIRY_DAYS} days`
        }),
      };
    }
  }

  // Generate secure random token
  const randomPart = randomBytes(32).toString('base64url'); // URL-safe base64
  const token = `${TOKEN_PREFIX}${randomPart}`;

  // Hash the token for storage
  const tokenHash = createHash('sha256').update(token).digest('hex');

  // Create token prefix for display (first 12 chars)
  const prefix = token.substring(0, 12);

  // Calculate expiry timestamp if provided
  let expiresAt: number | undefined;
  if (request.expiresInDays) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + request.expiresInDays);
    expiresAt = Math.floor(expiryDate.getTime() / 1000); // Unix timestamp for DynamoDB TTL
  }

  const apiToken: ApiToken = {
    id: uuidv4(),
    userId,
    tokenHash,
    name: request.name.trim(),
    prefix,
    createdAt: new Date().toISOString(),
    expiresAt,
    revoked: false,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: apiToken,
  }));

  // Return the token WITHOUT the hash
  const { tokenHash: _, ...tokenInfo } = apiToken;

  const response: CreateTokenResponse = {
    token, // Plain text token - only shown this once!
    tokenInfo,
  };

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(response),
  };
}

async function listTokens(userId: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  }));

  // Remove tokenHash from all results
  const tokens = (result.Items || []).map((item) => {
    const { tokenHash, ...tokenInfo } = item as ApiToken;
    return tokenInfo;
  });

  const response: ListTokensResponse = { tokens };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response),
  };
}

async function revokeToken(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  const tokenId = event.pathParameters?.id;

  if (!tokenId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Token ID is required' }),
    };
  }

  // First, verify the token belongs to the user
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: tokenId },
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Token not found' }),
    };
  }

  if (result.Item.userId !== userId) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
  }

  // Mark as revoked (we keep the record for audit purposes)
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: tokenId },
    UpdateExpression: 'SET revoked = :revoked',
    ExpressionAttributeValues: {
      ':revoked': true,
    },
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Token revoked successfully' }),
  };
}
