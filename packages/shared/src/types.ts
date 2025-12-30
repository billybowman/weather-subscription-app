// User types
export interface User {
  id: string;
  email: string;
  cognitoSub: string;
  createdAt: string;
}

// Location subscription types
export interface LocationSubscription {
  id: string;
  userId: string;
  location: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

// Weather data types
export interface WeatherData {
  id: string;
  subscriptionId: string;
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  icon: string;
  timestamp: string;
  fetchedAt: string;
}

export interface WeatherForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
  precipitation: number;
}

export interface DetailedWeather extends WeatherData {
  forecast: WeatherForecast[];
}

// API request/response types
export interface CreateSubscriptionRequest {
  location: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

export interface CreateSubscriptionResponse {
  subscription: LocationSubscription;
}

export interface GetSubscriptionsResponse {
  subscriptions: LocationSubscription[];
}

export interface GetWeatherResponse {
  current: WeatherData;
  forecast: WeatherForecast[];
}

// API Token types
export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  prefix: string; // First 12 chars for display (e.g., "wea_12345678...")
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: number; // Unix timestamp
  revoked: boolean;
}

export interface CreateTokenRequest {
  name: string;
  expiresInDays?: number; // Optional, max 365 days
}

export interface CreateTokenResponse {
  token: string; // Plain text token - only shown once!
  tokenInfo: Omit<ApiToken, 'tokenHash'>;
}

export interface ListTokensResponse {
  tokens: Omit<ApiToken, 'tokenHash'>[];
}

// OpenWeatherMap API types
export interface OpenWeatherMapResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  dt: number;
  name: string;
}

export interface OpenWeatherMapForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp_min: number;
      temp_max: number;
    };
    weather: Array<{
      description: string;
      icon: string;
    }>;
    pop: number; // Probability of precipitation
  }>;
}
