// API endpoints
export const API_ENDPOINTS = {
  SUBSCRIPTIONS: '/subscriptions',
  WEATHER: '/weather',
} as const;

// DynamoDB table names (will be set via environment variables)
export const TABLE_NAMES = {
  SUBSCRIPTIONS: process.env.SUBSCRIPTIONS_TABLE || 'WeatherSubscriptions',
  WEATHER_DATA: process.env.WEATHER_DATA_TABLE || 'WeatherData',
} as const;

// Weather fetch interval (in minutes)
export const WEATHER_FETCH_INTERVAL = 30;

// OpenWeatherMap API
export const OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';
