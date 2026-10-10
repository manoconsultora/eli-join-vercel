import type { ComponentType } from 'react'

import {
  CircleButton,
  ContinueButton,
  LineInput,
  Review,
  Screen,
  STEP_TITLE_ID,
  Title,
} from '@/components/joinUi'
import type { JoinFormState } from '@/components/useJoinForm'

type StepProps = {
  form: JoinFormState
}

const WelcomeStep = ({ form }: StepProps) => (
  <Screen>
    <Title>
      <strong>Hola Vecino!</strong>
      <span>soy Eli..</span>
    </Title>

    <p className="mt-6 text-xl leading-relaxed font-[100] text-zinc-500">
      Bienvenido a {form.data.consorcio.name}.
    </p>

    <div className="mt-10 flex justify-center">
      <CircleButton onClick={form.next}>→</CircleButton>
    </div>
  </Screen>
)

const FirstNameStep = ({ form }: StepProps) => (
  <Screen>
    <Title>
      <strong>¿Cómo</strong>
      <span>te llamás?</span>
    </Title>

    <p className="mt-4 text-sm font-[100] text-zinc-400">
      Solo tu nombre, el apellido va después.
    </p>

    <LineInput
      inputRef={form.inputRef}
      onChange={form.setFirstName}
      onKeyDown={event => form.handleEnter(event, form.firstName)}
      placeholder="Tu nombre"
      value={form.firstName}
    />

    <ContinueButton disabled={!form.firstName.trim()} onClick={form.next} />
  </Screen>
)

const LastNameStep = ({ form }: StepProps) => (
  <Screen>
    <Title>
      <span>Perfecto, {form.firstName}.</span>
      <strong>¿Y tu apellido?</strong>
    </Title>

    <LineInput
      inputRef={form.inputRef}
      onChange={form.setLastName}
      onKeyDown={event => form.handleEnter(event, form.lastName)}
      placeholder="Tu apellido"
      value={form.lastName}
    />

    <ContinueButton disabled={!form.lastName.trim()} onClick={form.next} />
  </Screen>
)

const EmailStep = ({ form }: StepProps) => (
  <Screen>
    <Title>
      <strong>¿Cuál es</strong>
      <span>tu email?</span>
    </Title>

    <p className="mt-5 text-sm leading-relaxed font-[100] text-zinc-400">
      Lo usamos para enviarte novedades y seguimiento de tus solicitudes.
    </p>

    <LineInput
      inputRef={form.inputRef}
      onChange={form.setEmail}
      onKeyDown={form.handleEmailKeyDown}
      placeholder="nombre@email.com"
      type="email"
      value={form.email}
    />

    {/* Tono neutro: aparece mientras escribe, no es un error todavía. */}
    <p aria-live="polite" className="mt-3 min-h-5 text-sm text-zinc-400">
      {form.email.trim() && !form.emailValid
        ? 'Escribilo completo, por ejemplo nombre@email.com.'
        : ''}
    </p>

    {form.codeError && (
      <p className="mt-2 text-sm font-medium text-red-600">{form.codeError}</p>
    )}

    <ContinueButton
      disabled={!form.emailValid || form.codeBusy}
      onClick={() => void form.continueFromEmail()}
    />
  </Screen>
)

const VerifyEmailStep = ({ form }: StepProps) => (
  <Screen>
    <Title>
      <strong>Revisá</strong>
      <span>tu email.</span>
    </Title>

    <p className="mt-5 text-sm leading-relaxed font-[100] text-zinc-400">
      Te mandamos un código de 6 dígitos a {form.codeEmail}. Si no lo ves,
      fijate en spam o promociones.
    </p>

    <LineInput
      autoComplete="one-time-code"
      inputMode="numeric"
      inputRef={form.inputRef}
      onChange={form.handleCodeChange}
      onKeyDown={form.handleCodeKeyDown}
      placeholder="000000"
      value={form.code}
    />

    <p
      aria-live="polite"
      className="mt-3 min-h-5 text-sm font-medium text-red-600"
    >
      {form.codeError ?? ''}
    </p>

    <div className="mt-2 flex gap-6 text-sm">
      <button
        className="text-[#2346DD] disabled:text-zinc-400"
        disabled={form.codeBusy || form.resendSeconds > 0}
        onClick={() => void form.resendCode()}
        type="button"
      >
        {form.resendSeconds > 0
          ? `Reenviar código (${form.resendSeconds} s)`
          : 'Reenviar código'}
      </button>

      <button
        className="text-[#2346DD]"
        onClick={form.changeEmail}
        type="button"
      >
        Cambiar email
      </button>
    </div>

    <ContinueButton
      disabled={!form.validCode || form.codeBusy}
      onClick={() => void form.verifyCode()}
    />
  </Screen>
)

const PhoneStep = ({ form }: StepProps) => (
  <Screen>
    <Title>
      <strong>¿Cuál es</strong>
      <span>tu teléfono?</span>
    </Title>

    <LineInput
      inputRef={form.inputRef}
      onChange={form.setPhone}
      onKeyDown={event =>
        form.handleEnter(event, form.phoneValid ? form.phone : '')
      }
      placeholder="+54 9 11..."
      type="tel"
      value={form.phone}
    />

    {/* Tono neutro: aparece mientras escribe, no es un error todavía. */}
    <p aria-live="polite" className="mt-3 min-h-5 text-sm text-zinc-400">
      {form.phone.trim() && !form.phoneValid
        ? 'Escribilo con código de área, por ejemplo +54 9 11 1234-5678.'
        : ''}
    </p>

    <ContinueButton disabled={!form.phoneValid} onClick={form.next} />
  </Screen>
)

const UnitStep = ({ form }: StepProps) => (
  <Screen>
    <Title>
      <strong>¿En qué unidad</strong>
      <span>vivís?</span>
    </Title>

    <div className="mt-10 flex justify-end">
      <input
        aria-labelledby={STEP_TITLE_ID}
        className="w-full border-0 border-b border-zinc-300 bg-transparent pb-3 text-2xl font-[100] text-zinc-950 transition outline-none placeholder:text-zinc-300 focus:border-[#2346DD]"
        onChange={form.handleUnitSearchChange}
        placeholder="Buscá tu unidad"
        ref={form.inputRef}
        value={form.unitSearch}
      />

      <div className="mt-3 max-h-52 overflow-y-auto">
        {form.filteredUnits.map(unit => (
          <button
            className={`flex w-full items-center justify-between border-b border-zinc-100 py-4 text-left text-base transition ${
              form.unitId === unit.id
                ? 'font-semibold text-[#2346DD]'
                : 'font-[100] text-zinc-600'
            }`}
            key={unit.id}
            onClick={() => form.selectUnit(unit)}
            type="button"
          >
            <span>{unit.label}</span>
            {form.unitId === unit.id && <span>✓</span>}
          </button>
        ))}
      </div>
    </div>

    <ContinueButton disabled={!form.unitId} onClick={form.next} />
  </Screen>
)

const RelationshipStep = ({ form }: StepProps) => (
  <Screen>
    <Title>
      <strong>¿Qué relación tenés</strong>
      <span>con esa unidad?</span>
    </Title>

    <div className="mt-8 space-y-2">
      {form.data.relationships.map(item => (
        <button
          className={`w-full rounded-[18px] px-5 py-4 text-left text-base transition ${
            form.relationship === item.value
              ? 'bg-[#2346DD] font-semibold text-white'
              : 'bg-[#F4F6FA] font-[100] text-zinc-700 hover:bg-[#EBEEF5]'
          }`}
          key={item.value}
          onClick={() => form.setRelationship(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>

    <ContinueButton disabled={!form.relationship} onClick={form.next} />
  </Screen>
)

const ReviewStep = ({ form }: StepProps) => (
  <Screen>
    <Title>
      <strong>¿Está todo</strong>
      <span>bien?</span>
    </Title>

    <div className="mt-8 space-y-4">
      <Review label="Nombre" onChange={() => form.editStep(1)}>
        {form.firstName}
      </Review>

      <Review label="Apellido" onChange={() => form.editStep(2)}>
        {form.lastName}
      </Review>

      <Review label="Email" onChange={() => form.editStep(3)}>
        {form.email}
      </Review>

      <Review label="Teléfono" onChange={() => form.editStep(5)}>
        {form.phone}
      </Review>

      <Review label="Unidad" onChange={() => form.editStep(6)}>
        {form.selectedUnit?.label}
      </Review>

      <Review label="Relación" onChange={() => form.editStep(7)}>
        {
          form.data.relationships.find(item => item.value === form.relationship)
            ?.label
        }
      </Review>
    </div>

    {form.submitError && (
      <p className="mt-5 text-sm font-medium text-red-600">
        {form.submitError}
      </p>
    )}

    <form className="mt-8" onSubmit={form.submit}>
      <button
        aria-label="Enviar solicitud"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2346DD] text-2xl text-white transition hover:scale-[1.04] disabled:opacity-40"
        disabled={form.submitting}
        type="submit"
      >
        {form.submitting ? '…' : '→'}
      </button>
    </form>
  </Screen>
)

const SentStep = () => (
  <Screen>
    <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#2346DD] text-2xl text-white">
      ✓
    </div>

    <Title>
      <strong>Solicitud</strong>
      <span>enviada.</span>
    </Title>

    <p className="mt-6 text-lg leading-relaxed font-[100] text-zinc-500">
      La administración va a verificar tus datos antes de habilitar tu acceso a
      ELI.
    </p>

    <p className="mt-6 text-sm font-[100] text-zinc-400">
      Te avisaremos cuando esté listo.
    </p>
  </Screen>
)

const UpdatedStep = () => (
  <Screen>
    <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#2346DD] text-2xl text-white">
      ✓
    </div>

    <Title>
      <strong>Actualizamos</strong>
      <span>tu solicitud.</span>
    </Title>

    <p className="mt-6 text-lg leading-relaxed font-[100] text-zinc-500">
      Ya tenías una solicitud pendiente en este edificio. La administración va a
      ver tus datos nuevos.
    </p>

    <p className="mt-6 text-sm font-[100] text-zinc-400">
      Te avisaremos cuando esté listo.
    </p>
  </Screen>
)

// El índice es el número de paso: el email (3) pasa por el código (4), submit salta a
// 9 (enviada) o 10 (actualizada), y la revisión (8) vuelve a 1-7 para corregir un dato
// (useJoinForm.ts, los índices de los pasos).
export const STEPS: ComponentType<StepProps>[] = [
  WelcomeStep,
  FirstNameStep,
  LastNameStep,
  EmailStep,
  VerifyEmailStep,
  PhoneStep,
  UnitStep,
  RelationshipStep,
  ReviewStep,
  SentStep,
  UpdatedStep,
]
