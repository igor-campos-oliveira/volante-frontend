import axios from 'axios';
import { supabase, supabaseKey, supabaseSchema } from '@/utils/supabase';
import { InternalAxiosRequestConfig } from 'axios';

const API_TIMEOUT = 10_000;
const ESTIMATE_TIMEOUT = 60_000;

export const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'https://volante-backend.fly.dev/'
    : 'https://volante-backend.fly.dev/',
  timeout: API_TIMEOUT,
});

export { supabase, supabaseSchema };

export const estimateService = axios.create({
  baseURL: import.meta.env.DEV
    ? 'https://estimate-svc.fly.dev/v1/estimate/'
    : 'https://estimate-svc.fly.dev/v1/estimate/',
  timeout: ESTIMATE_TIMEOUT,
});

const appendAuthHeaders = async (config: InternalAxiosRequestConfig) => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (supabaseKey && !config.headers.apikey) {
    config.headers.apikey = supabaseKey;
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
};

api.interceptors.request.use(appendAuthHeaders);
// Nao adicionamos Authorization/apikey automaticamente no estimateService para evitar
// preflight CORS desnecessario em chamadas de upload/listagem de fotos.
