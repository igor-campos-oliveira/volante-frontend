import { AuthAPI, IAuthResult, ICredential } from '@/data/api/LoginAPI';
import { supabase } from '@/utils/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';

interface IAuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<IAuthResult>;
  signup: (email: string, password: string) => Promise<IAuthResult>;
  logout: () => Promise<void>;
  credentials: ICredential | null;
  userEmail: string | null;
}

export const AuthContext = createContext<IAuthContext>({
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ data: null }),
  signup: async () => ({ data: null }),
  logout: async () => {},
  credentials: null,
  userEmail: null,
});

const AuthProvider = ({ children }: any) => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<ICredential | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (data.session?.access_token && data.session.refresh_token) {
        setCredentials({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expiration: data.session.expires_at ?? Math.floor(Date.now() / 1000),
        });
        setUserEmail(data.session.user?.email ?? null);
        setAuthenticated(true);
      } else {
        setCredentials(null);
        setUserEmail(null);
        setAuthenticated(false);
      }
      setLoading(false);
    };

    bootSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.access_token && session.refresh_token) {
        setCredentials({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expiration: session.expires_at ?? Math.floor(Date.now() / 1000),
        });
        setUserEmail(session.user?.email ?? null);
        setAuthenticated(true);
      } else {
        setCredentials(null);
        setUserEmail(null);
        setAuthenticated(false);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await AuthAPI.login(email, password);

      if (response.data?.access_token) {
        queryClient.resetQueries();
        setCredentials(response.data);
        setUserEmail(email);
        setAuthenticated(true);
      }

      return response;
    } catch (error) {
      setAuthenticated(false);
      setCredentials(null);
      setUserEmail(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await AuthAPI.signup(email, password);

      if (response.data?.access_token) {
        queryClient.resetQueries();
        setCredentials(response.data);
        setUserEmail(email);
        setAuthenticated(true);
      }

      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } finally {
      setCredentials(null);
      setUserEmail(null);
      setAuthenticated(false);
      setLoading(false);
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, signup, logout, credentials, userEmail }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
export const useAuthContext = () => useContext(AuthContext);
