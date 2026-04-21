import Logo from '@/../public/assets/svg/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { completeCurrentUserOnboarding } from '@/data/services/onboardingService'
import { useAuthContext } from '@/hooks/useAuth'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const WELCOME_MESSAGE = 'Bem vindo ao volante, nosso sistema de gerenciamento de empresas automotivas.'
const TYPING_DELAY_MS = 30

const getOnboardingErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Nao foi possivel concluir o onboarding. Tente novamente.'
}

export default function OnboardingPage() {
  const [typedLength, setTypedLength] = useState(0)
  const [companyName, setCompanyName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { refreshSessionState } = useAuthContext()
  const navigate = useNavigate()

  const typedMessage = useMemo(
    () => WELCOME_MESSAGE.slice(0, typedLength),
    [typedLength],
  )

  useEffect(() => {
    if (typedLength >= WELCOME_MESSAGE.length) {
      return
    }

    const timer = setTimeout(() => {
      setTypedLength((previousLength) => Math.min(previousLength + 1, WELCOME_MESSAGE.length))
    }, TYPING_DELAY_MS)

    return () => clearTimeout(timer)
  }, [typedLength])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const normalizedCompanyName = companyName.trim()
    if (!normalizedCompanyName) {
      toast.error('Nome da empresa e obrigatorio.')
      return
    }

    try {
      setIsSubmitting(true)
      const onboardingResult = await completeCurrentUserOnboarding(normalizedCompanyName)
      await refreshSessionState()

      toast.success(
        onboardingResult.slugAdjusted
          ? `Empresa criada com slug "${onboardingResult.company.slug}".`
          : 'Empresa criada com sucesso.',
      )

      navigate('/', { replace: true })
    } catch (error) {
      toast.error(getOnboardingErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='flex flex-1 items-center justify-center bg-zinc-900 p-6 md:p-10'>
      <div className='flex w-full max-w-3xl flex-col items-center gap-10 rounded-3xl bg-white p-8 shadow-2xl md:p-12'>
        <Logo className='h-auto w-[260px] sm:w-[330px] md:w-[420px]' />

        <p className='min-h-[56px] max-w-2xl text-center text-sm text-zinc-700 sm:min-h-[64px] sm:text-base'>
          <span>{typedMessage}</span>
          <span className='ml-1 inline-block animate-pulse'>|</span>
        </p>

        <form onSubmit={handleSubmit} className='flex w-full max-w-md flex-col gap-3'>
          <label htmlFor='onboarding-company-name' className='text-sm font-medium text-zinc-700'>
            Nome da empresa
          </label>
          <Input
            id='onboarding-company-name'
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder='Ex.: Oficina Volante'
            autoComplete='organization'
            autoFocus
            disabled={isSubmitting}
          />
          <Button type='submit' loading={isSubmitting} disabled={isSubmitting}>
            Confirmar e entrar no sistema
          </Button>
        </form>
      </div>
    </div>
  )
}
