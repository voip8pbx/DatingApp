import { API_URL } from '@env';

export const Config = {
  // Use the API_URL from .env or default to localhost for development
  API_URL: API_URL || 'http://localhost:3000',
  
  // You can add more global config here
  IS_DEV: __DEV__,
  
  TIMEOUT: 10000,
};
