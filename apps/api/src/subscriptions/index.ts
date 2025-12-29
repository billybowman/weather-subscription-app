import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  LocationSubscription,
  CreateSubscriptionRequest,
  WeatherData,
  WeatherForecast,
  OpenWeatherMapResponse,
  OpenWeatherMapForecastResponse
} from './types.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.SUBSCRIPTIONS_TABLE!;
const WEATHER_TABLE = process.env.WEATHER_DATA_TABLE!;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY!;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
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

    const method = event.httpMethod;
    const path = event.path;

    switch (method) {
      case 'POST':
        return await createSubscription(event, userId);
      case 'GET':
        return await listSubscriptions(userId);
      case 'DELETE':
        return await deleteSubscription(event, userId);
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

async function createSubscription(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Request body is required' }),
    };
  }

  const request: CreateSubscriptionRequest = JSON.parse(event.body);

  if (!request.location || !request.latitude || !request.longitude) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Missing required fields: location, latitude, longitude' }),
    };
  }

  const subscription: LocationSubscription = {
    id: uuidv4(),
    userId,
    location: request.location,
    latitude: request.latitude,
    longitude: request.longitude,
    city: request.city || '',
    country: request.country || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: subscription,
  }));

  // Fetch weather immediately for the new subscription
  try {
    await fetchAndStoreWeather(subscription);
    console.log(`Initial weather fetched for ${subscription.location}`);
  } catch (error) {
    console.error(`Failed to fetch initial weather for ${subscription.location}:`, error);
    // Don't fail the subscription creation if weather fetch fails
    // The scheduled Lambda will retry later
  }

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ subscription }),
  };
}

async function listSubscriptions(userId: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ subscriptions: result.Items || [] }),
  };
}

async function deleteSubscription(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  const subscriptionId = event.pathParameters?.id;

  if (!subscriptionId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Subscription ID is required' }),
    };
  }

  // First, verify the subscription belongs to the user
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: subscriptionId },
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Subscription not found' }),
    };
  }

  if (result.Item.userId !== userId) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
  }

  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { id: subscriptionId },
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Subscription deleted successfully' }),
  };
}

async function fetchAndStoreWeather(subscription: LocationSubscription): Promise<void> {
  console.log(`Fetching weather for ${subscription.location}`);

  // Fetch current weather
  const currentWeatherUrl = `${OPENWEATHER_BASE_URL}/weather?lat=${subscription.latitude}&lon=${subscription.longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const currentResponse = await fetch(currentWeatherUrl);

  if (!currentResponse.ok) {
    throw new Error(`OpenWeatherMap API error: ${currentResponse.status}`);
  }

  const currentData = await currentResponse.json() as OpenWeatherMapResponse;

  // Fetch 5-day forecast
  const forecastUrl = `${OPENWEATHER_BASE_URL}/forecast?lat=${subscription.latitude}&lon=${subscription.longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const forecastResponse = await fetch(forecastUrl);

  if (!forecastResponse.ok) {
    throw new Error(`OpenWeatherMap Forecast API error: ${forecastResponse.status}`);
  }

  const forecastData = await forecastResponse.json() as OpenWeatherMapForecastResponse;

  // Process forecast data - group by day and get daily min/max
  const dailyForecast = processForecastData(forecastData);

  // Store weather data
  const weatherData: WeatherData & { forecast: WeatherForecast[]; ttl: number } = {
    id: uuidv4(),
    subscriptionId: subscription.id,
    location: subscription.location,
    temperature: currentData.main.temp,
    feelsLike: currentData.main.feels_like,
    humidity: currentData.main.humidity,
    pressure: currentData.main.pressure,
    windSpeed: currentData.wind.speed,
    windDirection: currentData.wind.deg,
    description: currentData.weather[0]?.description || '',
    icon: currentData.weather[0]?.icon || '',
    timestamp: new Date(currentData.dt * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    forecast: dailyForecast,
    ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days TTL
  };

  await docClient.send(new PutCommand({
    TableName: WEATHER_TABLE,
    Item: weatherData,
  }));

  console.log(`Weather data stored for ${subscription.location}`);
}

function processForecastData(forecastData: OpenWeatherMapForecastResponse): WeatherForecast[] {
  // Group forecast by date
  const dailyData: Map<string, {
    temps: number[];
    descriptions: string[];
    icons: string[];
    precipitation: number[];
  }> = new Map();

  forecastData.list.forEach(item => {
    const date = new Date(item.dt * 1000).toISOString().split('T')[0];

    if (!dailyData.has(date)) {
      dailyData.set(date, {
        temps: [],
        descriptions: [],
        icons: [],
        precipitation: [],
      });
    }

    const day = dailyData.get(date)!;
    day.temps.push(item.main.temp_min, item.main.temp_max);
    day.descriptions.push(item.weather[0]?.description || '');
    day.icons.push(item.weather[0]?.icon || '');
    day.precipitation.push(item.pop);
  });

  // Convert to array and calculate daily aggregates
  const forecast: WeatherForecast[] = [];
  dailyData.forEach((data, date) => {
    forecast.push({
      date,
      tempMin: Math.min(...data.temps),
      tempMax: Math.max(...data.temps),
      description: data.descriptions[Math.floor(data.descriptions.length / 2)] || '',
      icon: data.icons[Math.floor(data.icons.length / 2)] || '',
      precipitation: Math.max(...data.precipitation),
    });
  });

  // Sort by date and return first 5 days
  return forecast.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
}
