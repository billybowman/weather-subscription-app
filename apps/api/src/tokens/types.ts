export interface ApiToken {
  id: string;
  userId: string;
  tokenHash: string;
  name: string;
  prefix: string; // First 8 chars of token for display (e.g., "wea_12345678...")
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: number; // Unix timestamp for DynamoDB TTL
  revoked: boolean;
}

export interface CreateTokenRequest {
  name: string;
  expiresInDays?: number; // Optional, max 365 days
}

export interface CreateTokenResponse {
  token: string; // Plain text token - only shown once!
  tokenInfo: Omit<ApiToken, 'tokenHash'>; // Return everything except the hash
}

export interface ListTokensResponse {
  tokens: Omit<ApiToken, 'tokenHash'>[]; // Never return the hash
}
