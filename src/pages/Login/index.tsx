import backgroundImage from '@/../public/assets/login-back.webp'
import Logo from '@/../public/assets/svg/logo'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  completePendingOnboarding,
} from '@/data/services/onboardingService'
import { useAuthContext } from '@/hooks/useAuth'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface ILoginForm {
  email: string
  password: string
  confirmPassword: string
}

const SIGNUP_BACKOFF_MS = 60_000
const SIGNUP_EMAIL_RATE_LIMIT_BACKOFF_MS = 60_000
const SIGNUP_EMAIL_RATE_LIMIT_STORAGE_KEY = 'volante.signup_email_rate_limit'

type SignupEmailRateLimitMap = Record<string, number>

const normalizeEmailKey = (value: string) => value.trim().toLowerCase()

const readSignupEmailRateLimitMap = (): SignupEmailRateLimitMap => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const serialized = window.localStorage.getItem(SIGNUP_EMAIL_RATE_LIMIT_STORAGE_KEY)
    if (!serialized) {
      return {}
    }

    const parsed = JSON.parse(serialized)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    const now = Date.now()
    const maxAllowedUntil = now + SIGNUP_EMAIL_RATE_LIMIT_BACKOFF_MS
    let shouldPersistSanitizedMap = false

    const sanitizedMap = Object.entries(parsed as Record<string, unknown>).reduce<SignupEmailRateLimitMap>((acc, entry) => {
      const [email, expiresAt] = entry

      if (typeof expiresAt !== 'number') {
        shouldPersistSanitizedMap = true
        return acc
      }

      if (expiresAt <= now) {
        shouldPersistSanitizedMap = true
        return acc
      }

      const normalizedExpiresAt = Math.min(expiresAt, maxAllowedUntil)
      if (normalizedExpiresAt !== expiresAt) {
        shouldPersistSanitizedMap = true
      }

      acc[email] = normalizedExpiresAt
      return acc
    }, {})

    if (shouldPersistSanitizedMap) {
      window.localStorage.setItem(SIGNUP_EMAIL_RATE_LIMIT_STORAGE_KEY, JSON.stringify(sanitizedMap))
    }

    return sanitizedMap
  } catch {
    return {}
  }
}

const writeSignupEmailRateLimitMap = (map: SignupEmailRateLimitMap) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SIGNUP_EMAIL_RATE_LIMIT_STORAGE_KEY, JSON.stringify(map))
}

const readSignupEmailRateLimitUntil = (email: string) => {
  if (!email.trim()) {
    return null
  }

  const map = readSignupEmailRateLimitMap()
  return map[normalizeEmailKey(email)] ?? null
}

const saveSignupEmailRateLimitUntil = (email: string, expiresAt: number) => {
  if (!email.trim()) {
    return
  }

  const map = readSignupEmailRateLimitMap()
  map[normalizeEmailKey(email)] = expiresAt
  writeSignupEmailRateLimitMap(map)
}

const clearSignupEmailRateLimitUntil = (email: string) => {
  if (!email.trim()) {
    return
  }

  const emailKey = normalizeEmailKey(email)
  const map = readSignupEmailRateLimitMap()
  if (!(emailKey in map)) {
    return
  }

  delete map[emailKey]
  writeSignupEmailRateLimitMap(map)
}

const readAuthErrorCode = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null
  }

  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

const isEmailSendRateLimitError = (error: unknown) => {
  const errorCode = readAuthErrorCode(error)
  if (errorCode === 'over_email_send_rate_limit') {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  return error.message.toLowerCase().includes('email rate limit exceeded')
}

const getEmailRateLimitMessage = (remainingSeconds: number) =>
  `Limite de envio de e-mail atingido. Aguarde ${remainingSeconds}s antes de tentar novamente.`

const getPendingConfirmationMessage = (remainingSeconds?: number) => {
  if (remainingSeconds && remainingSeconds > 0) {
    return `Esse e-mail ja foi cadastrado. Confirme o e-mail recebido ou aguarde ${remainingSeconds}s para reenviar.`
  }

  return 'Esse e-mail ja foi cadastrado. Confirme seu e-mail e use "Reenviar" se necessario.'
}

const getAuthErrorMessage = (error: unknown, mode: 'signin' | 'signup') => {
  const fallbackMessage =
    mode === 'signin'
      ? 'E-mail ou senha invalidos'
      : 'Nao foi possivel concluir o cadastro. Tente novamente.'

  if (!(error instanceof Error)) {
    return fallbackMessage
  }

  const normalizedMessage = error.message.toLowerCase()

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'E-mail ou senha invalidos'
  }

  if (normalizedMessage.includes('user already registered')) {
    return 'Ja existe uma conta com esse e-mail.'
  }

  if (normalizedMessage.includes('password should be at least')) {
    return 'A senha deve ter no minimo 6 caracteres.'
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Confirme seu e-mail para concluir o acesso.'
  }

  if (normalizedMessage.includes('email rate limit exceeded')) {
    return 'Limite de envio de e-mail atingido. Aguarde e tente novamente.'
  }

  return error.message || fallbackMessage
}

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDirection, setFlipDirection] = useState<'right' | 'left'>('right')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signupRetryAvailableAt, setSignupRetryAvailableAt] = useState<number | null>(null)
  const [signupRateLimitByEmailUntil, setSignupRateLimitByEmailUntil] = useState<number | null>(null)
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null)
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null)
  const [timeTickMs, setTimeTickMs] = useState(() => Date.now())
  const form = useForm<ILoginForm>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })
  const flipTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const submitLockRef = useRef(false)

  const animatedInputClassName =
    'flex-1 transition-all duration-200 ease-out will-change-transform focus-visible:-translate-y-0.5 focus-visible:scale-[1.01] focus-visible:shadow-md active:scale-[0.995]'

  const { login, signup, resendSignupConfirmation, isLoading } = useAuthContext()
  const navigate = useNavigate()
  const FLIP_DURATION_MS = 520
  const MODE_SWAP_MS = Math.round(FLIP_DURATION_MS * 0.55)
  const isSignupMode = mode === 'signup'
  const watchedEmail = form.watch('email')
  const normalizedWatchedEmail = normalizeEmailKey(watchedEmail || '')
  const isFormSubmitting = isLoading || isSubmitting
  const effectiveSignupBackoffUntil = Math.max(signupRetryAvailableAt ?? 0, signupRateLimitByEmailUntil ?? 0) || null
  const pendingEmailRateLimitUntil = pendingConfirmationEmail
    ? readSignupEmailRateLimitUntil(pendingConfirmationEmail)
    : null
  const effectiveResendAvailableAt = Math.max(resendAvailableAt ?? 0, pendingEmailRateLimitUntil ?? 0) || null
  const signupBackoffRemainingSeconds = effectiveSignupBackoffUntil
    ? Math.max(0, Math.ceil((effectiveSignupBackoffUntil - timeTickMs) / 1000))
    : 0
  const resendRemainingSeconds = effectiveResendAvailableAt
    ? Math.max(0, Math.ceil((effectiveResendAvailableAt - timeTickMs) / 1000))
    : 0
  const isSignupBackoffActive = isSignupMode && signupBackoffRemainingSeconds > 0
  const isSignupEmailRateLimitActive =
    isSignupMode && signupRateLimitByEmailUntil !== null && signupRateLimitByEmailUntil > timeTickMs
  const isResendCooldownActive = resendRemainingSeconds > 0

  useEffect(() => {
    return () => {
      flipTimersRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    if (!normalizedWatchedEmail) {
      setSignupRateLimitByEmailUntil(null)
      return
    }

    setSignupRateLimitByEmailUntil(readSignupEmailRateLimitUntil(normalizedWatchedEmail))
  }, [normalizedWatchedEmail, timeTickMs])

  useEffect(() => {
    const hasActiveBackoff =
      (effectiveSignupBackoffUntil !== null && effectiveSignupBackoffUntil > Date.now()) ||
      (effectiveResendAvailableAt !== null && effectiveResendAvailableAt > Date.now())

    if (!hasActiveBackoff) {
      return
    }

    const timer = setInterval(() => {
      setTimeTickMs(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [effectiveSignupBackoffUntil, effectiveResendAvailableAt])

  useEffect(() => {
    const maxAllowedUntil = Date.now() + SIGNUP_EMAIL_RATE_LIMIT_BACKOFF_MS

    if (signupRetryAvailableAt && signupRetryAvailableAt > maxAllowedUntil) {
      setSignupRetryAvailableAt(maxAllowedUntil)
    }

    if (signupRateLimitByEmailUntil && signupRateLimitByEmailUntil > maxAllowedUntil) {
      setSignupRateLimitByEmailUntil(maxAllowedUntil)
    }

    if (resendAvailableAt && resendAvailableAt > maxAllowedUntil) {
      setResendAvailableAt(maxAllowedUntil)
    }
  }, [signupRetryAvailableAt, signupRateLimitByEmailUntil, resendAvailableAt])

  const clearPendingConfirmation = () => {
    setPendingConfirmationEmail(null)
    setResendAvailableAt(null)
  }

  const clearPendingConfirmationOnInputChange = () => {
    if (!pendingConfirmationEmail) {
      return
    }

    clearPendingConfirmation()
  }

  const handleSubmit = async (data: ILoginForm) => {
    if (submitLockRef.current || isFormSubmitting) {
      return
    }

    const currentMode = mode
    const normalizedEmail = data.email.trim().toLowerCase()
    const persistedSignupRateLimitUntil = readSignupEmailRateLimitUntil(normalizedEmail)
    const normalizedPendingConfirmationEmail = pendingConfirmationEmail ? normalizeEmailKey(pendingConfirmationEmail) : null
    const isSamePendingConfirmationEmail =
      currentMode === 'signup' &&
      normalizedPendingConfirmationEmail !== null &&
      normalizedPendingConfirmationEmail === normalizedEmail

    if (currentMode === 'signup' && persistedSignupRateLimitUntil && persistedSignupRateLimitUntil > Date.now()) {
      setSignupRateLimitByEmailUntil(persistedSignupRateLimitUntil)
      const remainingSeconds = Math.max(1, Math.ceil((persistedSignupRateLimitUntil - Date.now()) / 1000))
      const rateLimitMessage = getEmailRateLimitMessage(remainingSeconds)
      form.setError('email', { type: 'custom', message: rateLimitMessage })
      form.setFocus('email')
      toast.error(rateLimitMessage)
      return
    }

    if (isSamePendingConfirmationEmail) {
      const remainingSeconds = effectiveResendAvailableAt
        ? Math.max(0, Math.ceil((effectiveResendAvailableAt - Date.now()) / 1000))
        : 0
      const pendingMessage = getPendingConfirmationMessage(remainingSeconds)

      setMode('signin')
      form.setValue('password', '')
      form.setValue('confirmPassword', '')
      form.setError('email', { type: 'custom', message: pendingMessage })
      form.setFocus('email')
      toast.error(pendingMessage)
      return
    }

    if (currentMode === 'signup' && signupRetryAvailableAt && signupRetryAvailableAt > Date.now()) {
      const remainingSeconds = Math.max(1, Math.ceil((signupRetryAvailableAt - Date.now()) / 1000))
      const retryMessage = `Aguarde ${remainingSeconds}s antes de tentar criar a conta novamente.`
      form.setError('password', { type: 'custom', message: retryMessage })
      toast.error(retryMessage)
      return
    }

    try {
      submitLockRef.current = true
      setIsSubmitting(true)

      if (currentMode === 'signin') {
        const response = await login(normalizedEmail, data.password)

        if (response.data?.access_token) {
          const onboardingResult = await completePendingOnboarding(normalizedEmail)

          if (onboardingResult.status === 'completed') {
            toast.success(
              onboardingResult.slugAdjusted
                ? `Empresa criada com slug "${onboardingResult.company?.slug}".`
                : 'Empresa criada com sucesso.',
            )
          }

          navigate('/')
        }

        return
      }

      const response = await signup(normalizedEmail, data.password)

      if (response.requiresEmailConfirmation) {
        setSignupRetryAvailableAt(null)
        clearSignupEmailRateLimitUntil(normalizedEmail)
        setSignupRateLimitByEmailUntil(null)
        setPendingConfirmationEmail(normalizedEmail)
        setResendAvailableAt(Date.now() + SIGNUP_BACKOFF_MS)
        toast.success('Conta criada. Confirme seu e-mail para concluir o acesso.')
        setMode('signin')
        form.setValue('password', '')
        form.setValue('confirmPassword', '')
        return
      }

      if (response.data?.access_token) {
        setSignupRetryAvailableAt(null)
        clearSignupEmailRateLimitUntil(normalizedEmail)
        setSignupRateLimitByEmailUntil(null)
        clearPendingConfirmation()
        const onboardingResult = await completePendingOnboarding(normalizedEmail)

        if (onboardingResult.status === 'completed') {
          toast.success(
            onboardingResult.slugAdjusted
              ? `Empresa criada com slug "${onboardingResult.company?.slug}".`
              : 'Conta e empresa criadas com sucesso.',
          )
        }

        navigate('/')
      }
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error, currentMode)

      if (currentMode === 'signin') {
        form.setError('email', { type: 'custom', message: '' })
        form.setError('password', { type: 'custom', message: errorMessage })
        form.setFocus('email')
      } else {
        if (isEmailSendRateLimitError(error)) {
          const rateLimitUntil = Date.now() + SIGNUP_EMAIL_RATE_LIMIT_BACKOFF_MS
          const remainingSeconds = Math.max(1, Math.ceil((rateLimitUntil - Date.now()) / 1000))
          const rateLimitMessage = getEmailRateLimitMessage(remainingSeconds)

          saveSignupEmailRateLimitUntil(normalizedEmail, rateLimitUntil)
          setSignupRateLimitByEmailUntil(rateLimitUntil)
          setSignupRetryAvailableAt(rateLimitUntil)
          clearPendingConfirmation()
          form.setError('email', {
            type: 'custom',
            message: rateLimitMessage,
          })
          form.setFocus('email')
          toast.error(rateLimitMessage)
          return
        }

        setSignupRetryAvailableAt(Date.now() + SIGNUP_BACKOFF_MS)
        clearPendingConfirmation()
        form.setError('password', {
          type: 'custom',
          message: errorMessage,
        })
        form.setFocus('email')
      }

      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      submitLockRef.current = false
    }
  }

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail || submitLockRef.current || isFormSubmitting) {
      return
    }

    const persistedResendRateLimitUntil = readSignupEmailRateLimitUntil(pendingConfirmationEmail)
    const effectiveResendCooldownUntil = Math.max(resendAvailableAt ?? 0, persistedResendRateLimitUntil ?? 0) || null

    if (effectiveResendCooldownUntil && effectiveResendCooldownUntil > Date.now()) {
      const remainingSeconds = Math.max(1, Math.ceil((effectiveResendCooldownUntil - Date.now()) / 1000))
      toast.error(`Aguarde ${remainingSeconds}s para reenviar o e-mail de confirmacao.`)
      return
    }

    try {
      submitLockRef.current = true
      setIsSubmitting(true)
      await resendSignupConfirmation(pendingConfirmationEmail)
      clearSignupEmailRateLimitUntil(pendingConfirmationEmail)
      setResendAvailableAt(Date.now() + SIGNUP_BACKOFF_MS)
      toast.success('E-mail de confirmacao reenviado.')
    } catch (error) {
      if (isEmailSendRateLimitError(error)) {
        const rateLimitUntil = Date.now() + SIGNUP_EMAIL_RATE_LIMIT_BACKOFF_MS
        saveSignupEmailRateLimitUntil(pendingConfirmationEmail, rateLimitUntil)
        setResendAvailableAt(rateLimitUntil)
        const remainingSeconds = Math.max(1, Math.ceil((rateLimitUntil - Date.now()) / 1000))
        toast.error(getEmailRateLimitMessage(remainingSeconds))
        return
      }

      setResendAvailableAt(Date.now() + SIGNUP_BACKOFF_MS)
      const errorMessage = getAuthErrorMessage(error, 'signup')
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      submitLockRef.current = false
    }
  }

  const handleModeToggle = () => {
    if (isFlipping) return

    const nextMode = mode === 'signin' ? 'signup' : 'signin'
    setFlipDirection(mode === 'signin' ? 'right' : 'left')
    setIsFlipping(true)

    const swapTimer = setTimeout(() => {
      setMode(nextMode)
      form.clearErrors()
    }, MODE_SWAP_MS)
    const endTimer = setTimeout(() => setIsFlipping(false), FLIP_DURATION_MS)
    flipTimersRef.current = [swapTimer, endTimer]
  }

  return (
    <div className='login-card-perspective flex flex-1 justify-center bg-zinc-900 p-8'>
      <div
        className={`flex max-w-[1000px] flex-1 flex-col gap-8 rounded-3xl bg-white p-4 shadow-2xl ${
          isSignupMode ? 'md:flex-row-reverse' : 'md:flex-row'
        } ${
          isFlipping ? (flipDirection === 'right' ? 'login-card-flip-right' : 'login-card-flip-left') : ''
        }`}
      >
        <img
          src={backgroundImage}
          className={`hidden w-[45%] rounded-3xl object-cover md:block md:transform-gpu md:transition-all md:duration-500 md:ease-out ${
            isFlipping
              ? flipDirection === 'right'
                ? 'md:-translate-x-0.5 md:opacity-95'
                : 'md:translate-x-0.5 md:opacity-95'
              : ''
          }`}
        />

        <div
          className={`flex flex-1 transform-gpu flex-col items-center justify-between gap-8 pb-8 transition-all duration-500 ease-out ${
            isFlipping
              ? flipDirection === 'right'
                ? 'md:translate-x-0.5 md:opacity-95'
                : 'md:-translate-x-0.5 md:opacity-95'
              : ''
          }`}
        >
          <div className='flex flex-1 flex-col items-center justify-center'>
            <Logo className='h-auto w-[220px] sm:w-[280px] md:w-[360px]' />
            <p className='text-md text-zinc-700'>
              {isSignupMode ? 'Cadastre-se e inclua nosso sistema em sua oficina.' : 'Sistema gerenciador de oficinas'}
            </p>
          </div>

          <Form {...form}>
            <div className='mb-16 w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-sm'>
              <form onSubmit={form.handleSubmit(handleSubmit)} className='flex flex-1 flex-col gap-4'>
                <FormInput
                  form={form}
                  name='email'
                  label='E-mail'
                  showValidationColors
                  rules={{
                    required: 'E-mail e obrigatorio',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'E-mail invalido',
                    },
                  }}
                >
                  {(field) => (
                    <Input
                      placeholder='Digite aqui...'
                      className={animatedInputClassName}
                      type='email'
                      autoComplete='email'
                      {...field}
                      onChange={(event) => {
                        clearPendingConfirmationOnInputChange()
                        field.onChange(event)
                      }}
                    />
                  )}
                </FormInput>

                <FormInput
                  form={form}
                  name='password'
                  label='Senha'
                  showValidationColors
                  rules={{
                    required: 'Senha e obrigatoria',
                    minLength: {
                      value: 6,
                      message: 'A senha deve ter no minimo 6 caracteres',
                    },
                  }}
                >
                  {(field) => (
                    <Input
                      placeholder='Digite aqui...'
                      type='password'
                      className={animatedInputClassName}
                      autoComplete={isSignupMode ? 'new-password' : 'current-password'}
                      {...field}
                      onChange={(event) => {
                        clearPendingConfirmationOnInputChange()
                        field.onChange(event)
                      }}
                    />
                  )}
                </FormInput>

                {isSignupMode && (
                  <>
                    <FormInput
                      form={form}
                      name='confirmPassword'
                      label='Confirmacao de senha'
                      showValidationColors
                      rules={{
                        validate: (value: string) => {
                          if (!value.trim()) return 'Confirmacao de senha obrigatoria'
                          if (value !== form.getValues('password')) return 'As senhas nao coincidem'
                          return true
                        },
                      }}
                    >
                      {(field) => (
                        <Input
                          placeholder='Confirme sua senha'
                          type='password'
                          className={animatedInputClassName}
                          autoComplete='new-password'
                          {...field}
                          onChange={(event) => {
                            clearPendingConfirmationOnInputChange()
                            field.onChange(event)
                          }}
                        />
                      )}
                    </FormInput>

                  </>
                )}

                <div className='flex flex-col justify-between gap-8'>
                  <Button type='submit' loading={isFormSubmitting} disabled={isSignupBackoffActive} className='group'>
                    <span>{mode === 'signin' ? 'Entrar' : 'Criar conta'}</span>
                    <ArrowRight
                      size={16}
                      className='ml-2 transition-transform duration-200 ease-out group-hover:translate-x-1'
                    />
                  </Button>

                  {isSignupBackoffActive && (
                    <p className='text-xs text-zinc-500'>
                      {isSignupEmailRateLimitActive
                        ? `Limite de envio do provedor ativo. Tente novamente em ${signupBackoffRemainingSeconds}s.`
                        : `Nova tentativa de cadastro em ${signupBackoffRemainingSeconds}s.`}
                    </p>
                  )}

                  <Button type='button' variant='link' disabled={isFlipping || isFormSubmitting} onClick={handleModeToggle}>
                    {mode === 'signin' ? 'Ainda nao tem conta? Cadastre-se' : 'Ja tem conta? Entrar'}
                  </Button>

                  {pendingConfirmationEmail && (
                    <div className='rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700'>
                      <p>Conta criada para {pendingConfirmationEmail}. Confirme seu e-mail para concluir o acesso.</p>
                      <div className='mt-2 flex items-center justify-between gap-3'>
                        <span>
                          {isResendCooldownActive
                            ? `Reenvio disponivel em ${resendRemainingSeconds}s.`
                            : 'Nao recebeu o e-mail?'}
                        </span>
                        <Button
                          type='button'
                          variant='link'
                          className='h-auto p-0 text-xs'
                          disabled={isResendCooldownActive || isFormSubmitting}
                          onClick={handleResendConfirmation}
                        >
                          Reenviar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </Form>
        </div>
      </div>
    </div>
  )
}
