import { supabase, supabaseSchema } from '@/data/api/config';
import { User } from '@supabase/supabase-js';

const EMPRESAS_TABLE = 'empresas' as const;
const USUARIOS_TABLE = 'usuarios' as const;
const ONBOARDING_STORAGE_KEY = 'volante.pending_onboarding';
const MAX_SLUG_ATTEMPTS = 50;

interface EmpresaRow {
  id: string;
  slug: string;
  nome: string;
  data_criacao: string | null;
}

export interface PendingOnboardingPayload {
  email: string;
  companyName: string;
  companySlug: string;
}

export interface CompleteOnboardingResult {
  status: 'completed' | 'already_completed' | 'no_pending';
  company?: EmpresaRow;
  slugAdjusted?: boolean;
}

export interface CompleteCurrentUserOnboardingResult {
  status: 'completed' | 'already_completed';
  company: EmpresaRow;
  slugAdjusted: boolean;
}

type PendingOnboardingMap = Record<string, PendingOnboardingPayload>;

const fromSchema = (tableName: string) => supabase.schema(supabaseSchema).from(tableName);

const normalizeEmailKey = (email: string) => email.trim().toLowerCase();

export const normalizeCompanySlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

const sanitizeCompanyName = (value: string) => value.trim();

const sanitizeCompanySlug = (value: string) => {
  const slug = normalizeCompanySlug(value);
  const isValidSlug = /^[a-z0-9_]+$/.test(slug);
  if (!slug || !isValidSlug) {
    throw new Error('Slug da empresa invalido. Use apenas letras minusculas, numeros e underscore.');
  }
  return slug;
};

const ensureValidPendingPayload = (payload: PendingOnboardingPayload): PendingOnboardingPayload => {
  const email = payload.email.trim();
  const companyName = sanitizeCompanyName(payload.companyName);
  const companySlug = sanitizeCompanySlug(payload.companySlug);

  if (!email) {
    throw new Error('E-mail invalido para concluir o onboarding.');
  }

  if (!companyName) {
    throw new Error('Nome da empresa e obrigatorio para concluir o onboarding.');
  }

  return { email, companyName, companySlug };
};

const readPendingMap = (): PendingOnboardingMap => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const serialized = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!serialized) {
      return {};
    }

    const parsed = JSON.parse(serialized);
    return parsed && typeof parsed === 'object' ? (parsed as PendingOnboardingMap) : {};
  } catch {
    return {};
  }
};

const writePendingMap = (map: PendingOnboardingMap) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(map));
};

const readPendingByEmail = (email?: string | null): PendingOnboardingPayload | null => {
  if (!email) return null;
  const pendingMap = readPendingMap();
  return pendingMap[normalizeEmailKey(email)] ?? null;
};

const removePendingByEmail = (email?: string | null) => {
  if (!email) return;
  const emailKey = normalizeEmailKey(email);
  const pendingMap = readPendingMap();
  if (!(emailKey in pendingMap)) return;

  delete pendingMap[emailKey];
  writePendingMap(pendingMap);
};

const readCompanyIdFromUser = (user: User | null) => {
  const userMetadata = user?.user_metadata;
  const appMetadata = user?.app_metadata;

  const fromUserMetadata = userMetadata?.empresa_id;
  if (typeof fromUserMetadata === 'string' && fromUserMetadata.trim()) {
    return fromUserMetadata.trim();
  }

  const fromAppMetadata = appMetadata?.empresa_id;
  if (typeof fromAppMetadata === 'string' && fromAppMetadata.trim()) {
    return fromAppMetadata.trim();
  }

  return null;
};

const readPendingFromUserMetadata = (user: User | null): PendingOnboardingPayload | null => {
  const metadata = user?.user_metadata;
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const email = user?.email?.trim();
  const companyNameRaw = metadata.onboarding_company_name;
  const companySlugRaw = metadata.onboarding_company_slug;

  if (!email || typeof companyNameRaw !== 'string' || typeof companySlugRaw !== 'string') {
    return null;
  }

  try {
    const companyName = sanitizeCompanyName(companyNameRaw);
    const companySlug = sanitizeCompanySlug(companySlugRaw);

    if (!companyName || !companySlug) {
      return null;
    }

    return {
      email,
      companyName,
      companySlug,
    };
  } catch {
    return null;
  }
};

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === '23505';

const findCompanyById = async (companyId: string) => {
  const { data, error } = await fromSchema(EMPRESAS_TABLE)
    .select('id, slug, nome, data_criacao')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as EmpresaRow | null;
};

const createCompanyWithAvailableSlug = async (
  companyId: string,
  companyName: string,
  companySlug: string,
) => {
  const baseSlug = sanitizeCompanySlug(companySlug);
  const normalizedName = sanitizeCompanyName(companyName);

  const existingCompany = await findCompanyById(companyId);
  if (existingCompany) {
    return {
      company: existingCompany,
      slugAdjusted: existingCompany.slug !== baseSlug,
    };
  }

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slugCandidate = attempt === 0 ? baseSlug : `${baseSlug}_${attempt + 1}`;

    const { data, error } = await fromSchema(EMPRESAS_TABLE)
      .insert({
        id: companyId,
        nome: normalizedName,
        slug: slugCandidate,
      })
      .select('id, slug, nome, data_criacao')
      .single();

    if (!error && data) {
      return {
        company: data as EmpresaRow,
        slugAdjusted: slugCandidate !== baseSlug,
      };
    }

    if (isUniqueViolation(error)) {
      const concurrentCompany = await findCompanyById(companyId);
      if (concurrentCompany) {
        return {
          company: concurrentCompany,
          slugAdjusted: concurrentCompany.slug !== baseSlug,
        };
      }

      continue;
    }

    throw error;
  }

  throw new Error('Nao foi possivel criar a empresa com um slug disponivel.');
};

const updateUserCompanyMetadata = async (company: EmpresaRow) => {
  const { error } = await supabase.auth.updateUser({
    data: {
      empresa_id: company.id,
      empresa_slug: company.slug,
      empresa_nome: company.nome,
      onboarding_company_name: null,
      onboarding_company_slug: null,
    },
  });

  if (error) {
    throw error;
  }
};

const ensureUserMembership = async (user: User, companyId: string, accessLevel: 'member' | 'admin' = 'member') => {
  const userEmail = user.email?.trim() || null;
  const { error } = await fromSchema(USUARIOS_TABLE).upsert(
    {
      empresa_id: companyId,
      user_id: user.id,
      nivel_acesso: accessLevel,
      email: userEmail,
    },
    {
      onConflict: 'empresa_id,user_id',
    },
  );

  if (error) {
    throw error;
  }
};

export const savePendingOnboarding = (payload: PendingOnboardingPayload) => {
  const sanitizedPayload = ensureValidPendingPayload(payload);
  const pendingMap = readPendingMap();
  pendingMap[normalizeEmailKey(sanitizedPayload.email)] = sanitizedPayload;
  writePendingMap(pendingMap);
};

export const completePendingOnboarding = async (
  email?: string,
  fallback?: Omit<PendingOnboardingPayload, 'email'>,
): Promise<CompleteOnboardingResult> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user ?? null;

  if (!sessionUser) {
    return { status: 'no_pending' };
  }

  const sessionEmail = sessionUser.email?.trim() ?? '';
  const selectedEmail = (email?.trim() || sessionEmail).trim();

  if (readCompanyIdFromUser(sessionUser)) {
    const existingCompanyId = readCompanyIdFromUser(sessionUser);
    if (existingCompanyId) {
      await ensureUserMembership(sessionUser, existingCompanyId, 'admin');
    }
    removePendingByEmail(selectedEmail);
    return { status: 'already_completed' };
  }

  const pendingFromFallback =
    fallback && selectedEmail
      ? ensureValidPendingPayload({
          email: selectedEmail,
          companyName: fallback.companyName,
          companySlug: fallback.companySlug,
        })
      : null;
  const pendingFromMetadata = readPendingFromUserMetadata(sessionUser);
  const pendingFromLocalStorage = readPendingByEmail(selectedEmail);
  const pendingPayload = pendingFromFallback ?? pendingFromMetadata ?? pendingFromLocalStorage;

  if (!pendingPayload) {
    return { status: 'no_pending' };
  }

  const { company, slugAdjusted } = await createCompanyWithAvailableSlug(
    sessionUser.id,
    pendingPayload.companyName,
    pendingPayload.companySlug,
  );

  await ensureUserMembership(sessionUser, company.id, 'admin');
  await updateUserCompanyMetadata(company);
  removePendingByEmail(pendingPayload.email);

  return {
    status: 'completed',
    company,
    slugAdjusted,
  };
};

export const completeCurrentUserOnboarding = async (
  companyName: string,
): Promise<CompleteCurrentUserOnboardingResult> => {
  const normalizedCompanyName = sanitizeCompanyName(companyName);
  if (!normalizedCompanyName) {
    throw new Error('Nome da empresa e obrigatorio para concluir o onboarding.');
  }

  const generatedSlug = normalizeCompanySlug(normalizedCompanyName);
  if (!generatedSlug) {
    throw new Error('Nao foi possivel gerar um slug valido para a empresa.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user ?? null;

  if (!sessionUser) {
    throw new Error('Usuario nao autenticado para concluir o onboarding.');
  }

  const companyId = readCompanyIdFromUser(sessionUser);
  if (companyId) {
    await ensureUserMembership(sessionUser, companyId, 'admin');
    const existingCompany = await findCompanyById(companyId);
    if (existingCompany) {
      return {
        status: 'already_completed',
        company: existingCompany,
        slugAdjusted: false,
      };
    }
  }

  const { company, slugAdjusted } = await createCompanyWithAvailableSlug(
    sessionUser.id,
    normalizedCompanyName,
    generatedSlug,
  );

  await ensureUserMembership(sessionUser, company.id, 'admin');
  await updateUserCompanyMetadata(company);

  return {
    status: 'completed',
    company,
    slugAdjusted,
  };
};
