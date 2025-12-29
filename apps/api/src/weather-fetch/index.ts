import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ScheduledEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  LocationSubscription,
  WeatherData,
  WeatherForecast,
  OpenWeatherMapResponse,
  OpenWeatherMapForecastResponse
} from './types.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE!;
const WEATHER_TABLE = process.env.WEATHER_DATA_TABLE!;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY!;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

export const handler = async (event: ScheduledEvent): Promise<void> => {
  console.log('Fetching weather data for all subscriptions...');

  try {
    // Get all subscriptions
    const result = await docClient.send(new ScanCommand({
      TableName: SUBSCRIPTIONS_TABLE,
    }));

    const subscriptions = (result.Items || []) as LocationSubscription[];
    console.log(`Found ${subscriptions.length} subscriptions`);

    // Fetch weather data for each subscription
    const promises = subscriptions.map(subscription =>
      fetchAndStoreWeather(subscription)
    );

    await Promise.allSettled(promises);
    console.log('Weather fetch completed');
  } catch (error) {
    console.error('Error in weather fetch:', error);
    throw error;
  }
};

async function fetchAndStoreWeather(subscription: LocationSubscription): Promise<void> {
  try {
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
  } catch (error) {
    console.error(`Error fetching weather for ${subscription.location}:`, error);
    // Don't throw - we want to continue processing other subscriptions
  }
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
