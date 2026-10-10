'use client'

import { useEffect, useState } from 'react'

import { STEPS } from '@/components/joinSteps'
import { type JoinData, useJoinForm } from '@/components/useJoinForm'

function useJoinData(token: string) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [data, setData] = useState<JoinData | null>(null)

  useEffect(
    function loadJoinData() {
      async function load() {
        try {
          const response = await fetch(`/api/join/${encodeURIComponent(token)}`)

          if (!response.ok) {
            setLoadError(true)
            return
          }

          const result = (await response.json()) as JoinData
          setData(result)
        } catch {
          setLoadError(true)
        } finally {
          setLoading(false)
        }
      }

      void load()
    },
    [token],
  )

  return { data, loadError, loading }
}

const LoadingScreen = () => (
  <main className="flex min-h-screen items-center justify-center bg-[#EEF2FA]">
    <div className="flex h-[780px] w-full max-w-[430px] items-center justify-center rounded-[42px] bg-[#2346DD] text-white shadow-[0_24px_70px_rgba(40,61,120,0.18)]">
      <span className="animate-pulse text-sm font-semibold tracking-[0.35em]">
        ELI
      </span>
    </div>
  </main>
)

const UnavailableScreen = () => (
  <main className="flex min-h-screen items-center justify-center bg-[#EEF2FA] px-5">
    <div className="flex min-h-[720px] w-full max-w-[430px] items-center justify-center rounded-[42px] bg-[#2346DD] px-10 text-center text-white shadow-[0_24px_70px_rgba(40,61,120,0.18)]">
      <div>
        <h1 className="text-4xl leading-tight font-bold">
          Este acceso no está disponible.
        </h1>

        <p className="mt-5 text-lg font-[100] text-white/70">
          El enlace puede haber vencido o ya no estar activo.
        </p>
      </div>
    </div>
  </main>
)

function JoinForm({ data, token }: { data: JoinData; token: string }) {
  const form = useJoinForm({ data, token })
  const CurrentStep = STEPS[form.step]

  return (
    <main className="min-h-screen bg-[#EEF2FA] px-4 py-8 md:flex md:items-center md:justify-center md:py-10">
      <div className="relative mx-auto min-h-[780px] w-full max-w-[430px] overflow-hidden rounded-[42px] bg-[#2346DD] shadow-[0_30px_90px_rgba(48,70,140,0.22)]">
        <header className="relative h-[285px] bg-[#2346DD] px-8 pt-8 text-white">
          <div className="text-sm font-semibold tracking-[0.35em]">ELI</div>

          <div className="absolute right-8 bottom-12 left-8">
            <p className="text-sm font-[100] text-white/70">
              {data.consorcio.address}
            </p>
          </div>
        </header>

        <section className="relative -mt-7 min-h-[522px] rounded-t-[42px] bg-white px-8 pt-12 pb-10">
          <div
            className={`mx-auto flex min-h-[430px] max-w-[330px] flex-col justify-center transition-all duration-[420ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
              form.transitioning
                ? '-translate-y-8 opacity-0'
                : 'translate-y-0 opacity-100'
            }`}
          >
            {form.resumed && (
              // Retoma lo guardado en este navegador; en una computadora compartida puede no ser suyo.
              <p className="mb-6 text-sm font-[100] text-zinc-400">
                Seguimos con tu solicitud
                {form.firstName ? `, ${form.firstName}` : ''}. ¿No sos vos?{' '}
                <button
                  className="text-[#2346DD]"
                  onClick={form.startOver}
                  type="button"
                >
                  Empezar de nuevo
                </button>
              </p>
            )}

            <CurrentStep form={form} />
          </div>
        </section>
      </div>
    </main>
  )
}

export function JoinOnboarding({ token }: { token: string }) {
  const { data, loadError, loading } = useJoinData(token)

  if (loading) {
    return <LoadingScreen />
  }

  if (loadError || !data) {
    return <UnavailableScreen />
  }

  return <JoinForm data={data} token={token} />
}
