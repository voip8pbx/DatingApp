import { Platform } from 'react-native';
import { API_URL } from '@env';

export const Config = {
  // Use the API_URL from .env or default to localhost for development
  // On Android emulator, 'localhost' must be mapped to '10.0.2.2'
  API_URL: (() => {
    let url = API_URL || 'http://10.248.116.154:3000';
    if (__DEV__ && Platform.OS === 'android' && url.includes('localhost')) {
      return url.replace('localhost', '10.0.2.2');
    }
    return url;
  })(),
  
  // You can add more global config here
  IS_DEV: __DEV__,
  
  TIMEOUT: 10000,
};
