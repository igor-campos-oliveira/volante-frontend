import backgroundImage from '@/../public/assets/login-back.webp'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuthContext } from '@/hooks/useAuth'
import Logo from '@/../public/assets/svg/logo'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface ILoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDirection, setFlipDirection] = useState<'right' | 'left'>('right')
  const form = useForm<ILoginForm>({
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  })
  const flipTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const animatedInputClassName =
    'flex-1 transition-all duration-200 ease-out will-change-transform focus-visible:-translate-y-0.5 focus-visible:scale-[1.01] focus-visible:shadow-md active:scale-[0.995]'

  const { login, signup, isLoading } = useAuthContext()
  const navigate = useNavigate()
  const FLIP_DURATION_MS = 520
  const MODE_SWAP_MS = Math.round(FLIP_DURATION_MS * 0.55)
  const isSignupMode = mode === 'signup'

  useEffect(() => {
    return () => {
      flipTimersRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const handleSubmit = async (data: ILoginForm) => {
    try {
      const response =
        mode === 'signin'
          ? await login(data.email, data.password)
          : await signup(data.email, data.password)

      if (response.requiresEmailConfirmation) {
        toast.success('Conta criada. Confirme seu e-mail para concluir o acesso.')
        setMode('signin')
        return
      }

      if (response.data?.access_token) {
        navigate('/')
      }
    } catch {
      form.setError('email', { type: 'custom', message: '' })
      form.setError('password', { type: 'custom', message: 'E-mail ou senha inválidos' })
      form.setFocus('email')
    }
  }

  const handleModeToggle = () => {
    if (isFlipping) return

    const nextMode = mode === 'signin' ? 'signup' : 'signin'
    setFlipDirection(mode === 'signin' ? 'right' : 'left')
    setIsFlipping(true)

    const swapTimer = setTimeout(() => setMode(nextMode), MODE_SWAP_MS)
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
            isFlipping ? (flipDirection === 'right' ? 'md:-translate-x-0.5 md:opacity-95' : 'md:translate-x-0.5 md:opacity-95') : ''
          }`}
        />

        <div
          className={`flex flex-1 transform-gpu flex-col items-center justify-between gap-8 pb-8 transition-all duration-500 ease-out ${
            isFlipping ? (flipDirection === 'right' ? 'md:translate-x-0.5 md:opacity-95' : 'md:-translate-x-0.5 md:opacity-95') : ''
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
                    required: 'E-mail é obrigatório',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'E-mail inválido',
                    },
                  }}
                >
                  {(field) => (
                    <Input placeholder='Digite aqui...' className={animatedInputClassName} type='email' {...field} />
                  )}
                </FormInput>

                <FormInput
                  form={form}
                  name='password'
                  label='Senha'
                  showValidationColors
                  rules={{
                    required: 'Senha é obrigatória',
                    minLength: {
                      value: 6,
                      message: 'A senha deve ter no mínimo 6 caracteres',
                    },
                  }}
                >
                  {(field) => (
                    <Input placeholder='Digite aqui...' type='password' className={animatedInputClassName} {...field} />
                  )}
                </FormInput>

                <div className='flex flex-col justify-between gap-8'>
                  <Button loading={isLoading} className='group'>
                    <span>{mode === 'signin' ? 'Entrar' : 'Criar conta'}</span>
                    <ArrowRight
                      size={16}
                      className='ml-2 transition-transform duration-200 ease-out group-hover:translate-x-1'
                    />
                  </Button>

                  <Button
                    type='button'
                    variant='link'
                    disabled={isFlipping}
                    onClick={handleModeToggle}
                  >
                    {mode === 'signin' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
                  </Button>
                </div>
              </form>
            </div>
          </Form>
        </div>
      </div>
    </div>
  )
}
