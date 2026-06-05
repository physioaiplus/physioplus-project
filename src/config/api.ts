import { APP_RUNTIME_CONFIG, buildApiUrl } from './runtime';

export const FUNCTIONS_BASE_URL = APP_RUNTIME_CONFIG.functionsBaseUrl;
export const API_BASE_URL = APP_RUNTIME_CONFIG.apiBaseUrl;
export const WS_BASE_URL = APP_RUNTIME_CONFIG.wsBaseUrl;

export { buildApiUrl };
