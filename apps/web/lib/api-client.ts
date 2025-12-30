import { apiConfig } from './amplify-config';
import type {
  LocationSubscription,
  CreateSubscriptionRequest,
  GetSubscriptionsResponse,
  GetWeatherResponse,
  CreateTokenRequest,
  CreateTokenResponse,
  ListTokensResponse,
  ApiToken,
} from '@weather-app/shared';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = apiConfig.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    idToken?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getSubscriptions(idToken: string): Promise<LocationSubscription[]> {
    const response = await this.request<GetSubscriptionsResponse>(
      '/subscriptions',
      { method: 'GET' },
      idToken
    );
    return response.subscriptions;
  }

  async createSubscription(
    data: CreateSubscriptionRequest,
    idToken: string
  ): Promise<LocationSubscription> {
    const response = await this.request<{ subscription: LocationSubscription }>(
      '/subscriptions',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      idToken
    );
    return response.subscription;
  }

  async deleteSubscription(id: string, idToken: string): Promise<void> {
    await this.request(
      `/subscriptions/${id}`,
      { method: 'DELETE' },
      idToken
    );
  }

  async getWeather(subscriptionId: string, idToken: string): Promise<GetWeatherResponse> {
    return this.request<GetWeatherResponse>(
      `/weather/${subscriptionId}`,
      { method: 'GET' },
      idToken
    );
  }

  // API Token methods
  async createToken(data: CreateTokenRequest, idToken: string): Promise<CreateTokenResponse> {
    return this.request<CreateTokenResponse>(
      '/tokens',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      idToken
    );
  }

  async listTokens(idToken: string): Promise<Omit<ApiToken, 'tokenHash'>[]> {
    const response = await this.request<ListTokensResponse>(
      '/tokens',
      { method: 'GET' },
      idToken
    );
    return response.tokens;
  }

  async revokeToken(tokenId: string, idToken: string): Promise<void> {
    await this.request(
      `/tokens/${tokenId}`,
      { method: 'DELETE' },
      idToken
    );
  }
}

export const apiClient = new ApiClient();
