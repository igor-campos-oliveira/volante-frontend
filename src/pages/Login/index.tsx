import backgroundImage from '@/../public/assets/login-back.webp'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuthContext } from '@/hooks/useAuth'
import Logo from "@/../public/assets/svg/logo"
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface ILoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const form = useForm<ILoginForm>({ defaultValues: { email: '', password: '' } })

  const { login, signup, isLoading } = useAuthContext()
  const navigate = useNavigate()

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

  return (
    <div className='flex flex-1 justify-center bg-zinc-900 p-8'>
      <div className='flex max-w-[1000px] flex-1 flex-col gap-8 rounded-3xl bg-white p-4 shadow-2xl md:flex-row'>
        <img src={backgroundImage} className='hidden w-[45%] rounded-3xl object-cover md:block' />
        <div className='flex flex-1 flex-col items-center justify-between gap-8 pb-8'>
          <div className='flex flex-1 flex-col items-center justify-center'>
            <Logo width={200} />
            <p className='text-md text-zinc-700'>Sistema gerenciador de oficinas</p>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className='mb-16 flex w-full max-w-[350px] flex-1 flex-col gap-4'
            >
              <FormInput form={form} name='email' label='E-mail'>
                {(field) => <Input placeholder='Digite aqui...' className='flex-1' type='email' {...field} />}
              </FormInput>
              <FormInput form={form} name='password' label='Senha'>
                {(field) => <Input placeholder='Digite aqui...' type='password' className='flex-1' {...field} />}
              </FormInput>
              <div className='flex flex-col justify-between gap-8'>
                <Button loading={isLoading}>{mode === 'signin' ? 'Entrar' : 'Criar conta'}</Button>
                <Button
                  type='button'
                  variant='link'
                  onClick={() => setMode((current) => (current === 'signin' ? 'signup' : 'signin'))}
                >
                  {mode === 'signin' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
