import { AuthAPI, IAuthResult, ICredential, SignupMetadata } from '@/data/api/LoginAPI';
import { supabase, supabaseSchema } from '@/utils/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

interface IAuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<IAuthResult>;
  signup: (email: string, password: string, metadata?: SignupMetadata) => Promise<IAuthResult>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  credentials: ICredential | null;
  userEmail: string | null;
  userCompanyName: string | null;
  userCompanyId: string | null;
  requiresOnboarding: boolean;
  refreshSessionState: () => Promise<void>;
}

export const AuthContext = createContext<IAuthContext>({
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ data: null }),
  signup: async () => ({ data: null }),
  resendSignupConfirmation: async () => {},
  logout: async () => {},
  credentials: null,
  userEmail: null,
  userCompanyName: null,
  userCompanyId: null,
  requiresOnboarding: false,
  refreshSessionState: async () => {},
});

const readCompanyNameFromUser = (user: User | null) => {
  const fromUserMetadata = user?.user_metadata?.empresa_nome;
  if (typeof fromUserMetadata === 'string' && fromUserMetadata.trim()) {
    return fromUserMetadata.trim();
  }

  const fromAppMetadata = user?.app_metadata?.empresa_nome;
  if (typeof fromAppMetadata === 'string' && fromAppMetadata.trim()) {
    return fromAppMetadata.trim();
  }

  const onboardingCompanyName = user?.user_metadata?.onboarding_company_name;
  if (typeof onboardingCompanyName === 'string' && onboardingCompanyName.trim()) {
    return onboardingCompanyName.trim();
  }

  return null;
};

const readCompanyIdFromUser = (user: User | null) => {
  const fromUserMetadata = user?.user_metadata?.empresa_id;
  if (typeof fromUserMetadata === 'string' && fromUserMetadata.trim()) {
    return fromUserMetadata.trim();
  }

  const fromAppMetadata = user?.app_metadata?.empresa_id;
  if (typeof fromAppMetadata === 'string' && fromAppMetadata.trim()) {
    return fromAppMetadata.trim();
  }

  return null;
};

const readCompanyIdFromMembership = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .schema(supabaseSchema)
      .from('usuarios')
      .select('empresa_id, data_criacao')
      .eq('user_id', userId)
      .order('data_criacao', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    const companyId = data?.empresa_id;
    if (typeof companyId === 'string' && companyId.trim()) {
      return companyId.trim();
    }
  } catch {
    return null;
  }

  return null;
};

const resolveCompanyNameFromUser = async (user: User | null) => {
  const companyNameFromMetadata = readCompanyNameFromUser(user);
  const companyIdFromMetadata = readCompanyIdFromUser(user);
  const companyIdFromMembership = user?.id ? await readCompanyIdFromMembership(user.id) : null;
  const attachedCompanyId = companyIdFromMetadata ?? companyIdFromMembership ?? null;
  const fallbackCompanyIdFromUser = user?.id?.trim() || null;
  const companyIds = [attachedCompanyId, fallbackCompanyIdFromUser].filter(
    (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index,
  );

  if (companyNameFromMetadata) {
    return {
      companyId: attachedCompanyId,
      companyName: companyNameFromMetadata,
    };
  }

  if (!companyIds.length) {
    return {
      companyId: attachedCompanyId,
      companyName: null,
    };
  }

  for (const companyId of companyIds) {
    try {
      const { data, error } = await supabase
        .schema(supabaseSchema)
        .from('empresas')
        .select('nome')
        .eq('id', companyId)
        .maybeSingle();

      if (error) {
        continue;
      }

      const companyName = data?.nome;
      if (typeof companyName === 'string' && companyName.trim()) {
        return {
          companyId: attachedCompanyId,
          companyName: companyName.trim(),
        };
      }
    } catch {
      continue;
    }
  }

  return {
    companyId: attachedCompanyId,
    companyName: null,
  };
};

const AuthProvider = ({ children }: any) => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<ICredential | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCompanyName, setUserCompanyName] = useState<string | null>(null);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  const syncSessionState = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (session?.access_token && session.refresh_token) {
      const resolvedCompany = await resolveCompanyNameFromUser(session.user ?? null);

      setCredentials({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expiration: session.expires_at ?? Math.floor(Date.now() / 1000),
      });
      setUserEmail(session.user?.email ?? null);
      setUserCompanyId(resolvedCompany.companyId);
      setUserCompanyName(resolvedCompany.companyName);
      setAuthenticated(true);
      return;
    }

    setCredentials(null);
    setUserEmail(null);
    setUserCompanyId(null);
    setUserCompanyName(null);
    setAuthenticated(false);
  };

  useEffect(() => {
    let isMounted = true;

    const bootSession = async () => {
      if (!isMounted) return;

      await syncSessionState();
      setLoading(false);
    };

    bootSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      void (async () => {
        if (session?.access_token && session.refresh_token) {
          const resolvedCompany = await resolveCompanyNameFromUser(session.user ?? null);
          setCredentials({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expiration: session.expires_at ?? Math.floor(Date.now() / 1000),
          });
          setUserEmail(session.user?.email ?? null);
          setUserCompanyId(resolvedCompany.companyId);
          setUserCompanyName(resolvedCompany.companyName);
          setAuthenticated(true);
        } else {
          setCredentials(null);
          setUserEmail(null);
          setUserCompanyId(null);
          setUserCompanyName(null);
          setAuthenticated(false);
        }
        setLoading(false);
      })();
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
        const { data: sessionData } = await supabase.auth.getSession();
        const resolvedCompany = await resolveCompanyNameFromUser(sessionData.session?.user ?? null);
        setUserCompanyId(resolvedCompany.companyId);
        setUserCompanyName(resolvedCompany.companyName);
        setAuthenticated(true);
      }

      return response;
    } catch (error) {
      setAuthenticated(false);
      setCredentials(null);
      setUserEmail(null);
      setUserCompanyId(null);
      setUserCompanyName(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, metadata?: SignupMetadata) => {
    try {
      setLoading(true);
      const response = await AuthAPI.signup(email, password, metadata);

      if (response.data?.access_token) {
        queryClient.resetQueries();
        setCredentials(response.data);
        setUserEmail(email);
        const { data: sessionData } = await supabase.auth.getSession();
        const resolvedCompany = await resolveCompanyNameFromUser(sessionData.session?.user ?? null);
        setUserCompanyId(resolvedCompany.companyId);
        setUserCompanyName(resolvedCompany.companyName);
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
      setUserCompanyId(null);
      setUserCompanyName(null);
      setAuthenticated(false);
      setLoading(false);
      queryClient.clear();
    }
  };

  const resendSignupConfirmation = async (email: string) => {
    try {
      setLoading(true);
      await AuthAPI.resendSignupConfirmation(email);
    } finally {
      setLoading(false);
    }
  };

  const refreshSessionState = async () => {
    await syncSessionState();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        signup,
        resendSignupConfirmation,
        logout,
        credentials,
        userEmail,
        userCompanyName,
        userCompanyId,
        requiresOnboarding: isAuthenticated && !isLoading && !userCompanyId,
        refreshSessionState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
export const useAuthContext = () => useContext(AuthContext);
