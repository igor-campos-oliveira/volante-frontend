import { Session } from '@supabase/supabase-js';
import { supabase } from './config';

export interface ICredential {
  access_token: string;
  refresh_token: string;
  expiration: number;
}

export interface IAuthResult {
  data: ICredential | null;
  requiresEmailConfirmation?: boolean;
}

const mapSessionToCredential = (session: Session | null): ICredential | null => {
  if (!session?.access_token || !session?.refresh_token) {
    return null;
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expiration: session.expires_at ?? Math.floor(Date.now() / 1000),
  };
};

export const AuthAPI = {
  login: async (email: string, password: string): Promise<IAuthResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return { data: mapSessionToCredential(data.session) };
  },
  signup: async (email: string, password: string): Promise<IAuthResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return {
      data: mapSessionToCredential(data.session),
      requiresEmailConfirmation: !data.session,
    };
  },
  refresh: async (): Promise<IAuthResult> => {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      throw error;
    }

    return { data: mapSessionToCredential(data.session) };
  },
};
