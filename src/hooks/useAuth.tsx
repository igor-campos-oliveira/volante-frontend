import { api, estimateService } from '@/data/api/config';
import { AuthAPI, ICredential } from '@/data/api/LoginAPI';
import { createContext, useContext, useLayoutEffect, useState } from 'react';
import useLocalStorage from './useLocalStorage';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosInstance } from 'axios';
interface IAuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ data: ICredential } | void>;
  logout: () => void;
  credentials: ICredential | null;
}

export const AuthContext = createContext<IAuthContext>({
  isAuthenticated: false,
  isLoading: false,
  login: async () => {},
  logout: () => {},
  credentials: null,
});

const AuthProvider = ({ children }: any) => {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [credentials, setCredentials] = useLocalStorage<ICredential | null>('token');
  let isRefreshing = false;
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    // setAuthenticated(true)
    const createRequestInteceptor = (_api: AxiosInstance) => {
      return _api.interceptors.request.use((config) => {
        if (credentials?.access_token) {
          config.headers.Authorization = `Bearer ${credentials?.access_token}`;
        } else {
          logout();
        }
        return config;
      });
    };

    const createResponseinteceptor = (_api: AxiosInstance) => {
      return _api.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;
          if (
            (error.response.status === 401 ||
              error.response?.data?.code === 'FAST_JWT_MALFORMED') &&
            credentials?.refresh_token &&
            credentials?.access_token !== 'mock-admin-token'
          ) {
            if (!isRefreshing) {
              isRefreshing = true;

              try {
                const response = await AuthAPI.refresh(credentials.refresh_token);
                const newCredentials = response.data;
                setCredentials(newCredentials);
                isRefreshing = false;
                return new Promise((resolve) => {
                  originalRequest.headers.Authorization = `Bearer ${newCredentials.access_token}`;
                  resolve(api(originalRequest));
                });
              } catch (refreshError) {
                isRefreshing = false;
                logout();
                return Promise.reject(refreshError);
              }
            }
          }
        },
      );
    };

    const authInterceptor = createRequestInteceptor(api);
    const refreshInterceptor = createResponseinteceptor(api);
    const estimateReqInterceptor = createRequestInteceptor(estimateService);
    const estimateResInterceptor = createResponseinteceptor(estimateService);

    if (credentials) {
      setAuthenticated(true);
    }

    return () => {
      api.interceptors.request.eject(authInterceptor);
      api.interceptors.request.eject(refreshInterceptor);
      estimateService.interceptors.request.eject(estimateReqInterceptor);
      estimateService.interceptors.request.eject(estimateResInterceptor);
    };
  }, [credentials]);

  const DEFAULT_ADMIN = { username: 'admin', password: '123456' };
  const MOCK_CREDENTIALS: ICredential = {
    access_token: 'mock-admin-token',
    refresh_token: 'mock-admin-refresh-token',
    expiration: Date.now() / 1000 + 86400,
  };

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);

      if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
        queryClient.resetQueries();
        setCredentials(MOCK_CREDENTIALS);
        setAuthenticated(true);
        return Promise.resolve({ data: MOCK_CREDENTIALS });
      }

      const response = await AuthAPI.login(username, password);
      // const response: {data: ICredential} = {
      //     data: {
      //     "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJpZ29yIiwiZXhwIjoxNzMyNDE4Mjk2LCJ0ZW5hbnQiOiI5OGI3Mzg2NC00NzI3LTQzM2EtYjNlNS03M2Y3YTY4OWYyZjQiLCJyb2xlIjpudWxsLCJmZWF0dXJlcyI6W10sInBlcm1pc3Npb25zIjpbXSwicmVmcmVzaF90b2tlbiI6ZmFsc2V9.E5MCWgdNtVL_ToAEYkFzw3fH7567UqsOPAJmGbzWjN4",
      //     "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJpZ29yIiwiZXhwIjoxNzMyNDE4Mjk2LCJ0ZW5hbnQiOiI5OGI3Mzg2NC00NzI3LTQzM2EtYjNlNS03M2Y3YTY4OWYyZjQiLCJyb2xlIjpudWxsLCJmZWF0dXJlcyI6W10sInBlcm1pc3Npb25zIjpbXSwicmVmcmVzaF90b2tlbiI6ZmFsc2V9.E5MCWgdNtVL_ToAEYkFzw3fH7567UqsOPAJmGbzWjN4",
      //     "expiration": 1732405897
      //     }
      // }
      if (response.data.access_token) {
        queryClient.resetQueries();
        setCredentials(response.data);
        setAuthenticated(true);
      }
      return Promise.resolve(response);
    } catch (e) {
      setAuthenticated(false);
      setCredentials(null);
      return Promise.reject(e);
    } finally {
      setLoading(false);
    }
  };
  const logout = () => {
    setCredentials(null);
    setAuthenticated(false);
    setLoading(false);
    queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, credentials, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
export const useAuthContext = () => useContext(AuthContext);
