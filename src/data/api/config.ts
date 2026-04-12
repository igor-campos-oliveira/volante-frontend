import axios from 'axios';
import { supabase, supabaseKey, supabaseSchema } from '@/utils/supabase';
import { InternalAxiosRequestConfig } from 'axios';

const TIMEOUT = 1000;

export const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'https://volante-backend.fly.dev/'
    : 'https://volante-backend.fly.dev/',
  timeout: TIMEOUT,
});

export { supabase, supabaseSchema };

export const estimateService = axios.create({
  baseURL: import.meta.env.DEV
    ? 'https://estimate-svc.fly.dev/v1/estimate/'
    : 'https://estimate-svc.fly.dev/v1/estimate/',
  timeout: TIMEOUT,
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
estimateService.interceptors.request.use(appendAuthHeaders);
