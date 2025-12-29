import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { WeatherData, WeatherForecast, GetWeatherResponse } from './types.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const WEATHER_TABLE = process.env.WEATHER_DATA_TABLE!;
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE!;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

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

    const subscriptionId = event.pathParameters?.subscriptionId;
    if (!subscriptionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Subscription ID is required' }),
      };
    }

    // Verify the subscription belongs to the user
    const subscriptionResult = await docClient.send(new GetCommand({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: { id: subscriptionId },
    }));

    if (!subscriptionResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Subscription not found' }),
      };
    }

    if (subscriptionResult.Item.userId !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: 'Forbidden' }),
      };
    }

    // Get the latest weather data for this subscription
    const weatherResult = await docClient.send(new QueryCommand({
      TableName: WEATHER_TABLE,
      IndexName: 'SubscriptionIdIndex',
      KeyConditionExpression: 'subscriptionId = :subscriptionId',
      ExpressionAttributeValues: {
        ':subscriptionId': subscriptionId,
      },
      ScanIndexForward: false, // Sort descending by timestamp
      Limit: 1,
    }));

    if (!weatherResult.Items || weatherResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'No weather data available yet' }),
      };
    }

    const weatherData = weatherResult.Items[0] as WeatherData & { forecast?: WeatherForecast[] };

    const response: GetWeatherResponse = {
      current: {
        id: weatherData.id,
        subscriptionId: weatherData.subscriptionId,
        location: weatherData.location,
        temperature: weatherData.temperature,
        feelsLike: weatherData.feelsLike,
        humidity: weatherData.humidity,
        pressure: weatherData.pressure,
        windSpeed: weatherData.windSpeed,
        windDirection: weatherData.windDirection,
        description: weatherData.description,
        icon: weatherData.icon,
        timestamp: weatherData.timestamp,
        fetchedAt: weatherData.fetchedAt,
      },
      forecast: weatherData.forecast || [],
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
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
