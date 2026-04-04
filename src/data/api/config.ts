import axios from 'axios';
import { supabase } from '@/utils/supabase';

const TIMEOUT = 1000;

export const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'https://volante-backend.fly.dev/'
    : 'https://volante-backend.fly.dev/',
  timeout: TIMEOUT,
});

export { supabase };

export const auth = axios.create({
  baseURL: import.meta.env.DEV ? 'https://security-svc.fly.dev/' : 'https://security-svc.fly.dev/',
  timeout: TIMEOUT,
});

export const estimateService = axios.create({
  baseURL: import.meta.env.DEV
    ? 'https://estimate-svc.fly.dev/v1/estimate/'
    : 'https://estimate-svc.fly.dev/v1/estimate/',
  timeout: TIMEOUT,
});
