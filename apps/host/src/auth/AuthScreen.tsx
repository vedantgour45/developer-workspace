import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from './AuthContext'
import BrandMark from '../components/BrandMark'
import PasswordStrengthMeter from './PasswordStrengthMeter'
import { passwordStrength } from './passwordStrength'

type Mode = 'signin' | 'signup'

// ---------- Zod schemas ----------
const signinSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('That doesn’t look like a valid email.'),
  password: z.string().min(1, 'Password is required.'),
})

const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Tell us your name.')
      .max(80, 'Keep your name under 80 characters.'),
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('That doesn’t look like a valid email.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(72, 'Supabase caps passwords at 72 characters.')
      .refine(
        (p) => passwordStrength(p).score >= 2,
        'Make your password harder to guess (mix length, case, numbers, symbols).',
      ),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords don’t match.',
  })

type SigninValues = z.infer<typeof signinSchema>
type SignupValues = z.infer<typeof signupSchema>

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  return (
    <Shell mode={mode}>
      {mode === 'signin' ? (
        <SignInForm onSwitch={() => setMode('signup')} />
      ) : (
        <SignUpForm onSwitch={() => setMode('signin')} />
      )}
    </Shell>
  )
}

// ============================================================
// Layout shell — split-screen (form left, hero right)
// ============================================================

function Shell({ children, mode }: { children: React.ReactNode; mode: Mode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      }}
      className="bg-canvas"
    >
      {/* LEFT: form column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 40px',
          minHeight: '100vh',
          boxSizing: 'border-box',
        }}
      >
        <div className="flex items-center gap-2.5">
          <BrandMark size={20} className="text-ink" />
          <span className="text-[15px] font-medium text-ink">Developer Workspace</span>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
          }}
        >
          <div style={{ width: '100%', maxWidth: 420 }} className="dw-fade-up">
            {children}
          </div>
        </div>

        <p className="text-[11px] text-muted-soft">
          © {new Date().getFullYear()} Developer Workspace
        </p>
      </div>

      {/* RIGHT: hero panel — only shown on wider screens */}
      <HeroPanel mode={mode} />
    </div>
  )
}

function HeroPanel({ mode }: { mode: Mode }) {
  return (
    <div
      className="relative text-on-dark overflow-hidden"
      style={{
        background: '#181715',
        minHeight: '100vh',
        padding: 48,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      {/* Decorative coral wash */}
      <span
        aria-hidden
        className="pointer-events-none"
        style={{
          position: 'absolute',
          top: -160,
          right: -160,
          width: 480,
          height: 480,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at center, rgba(255,119,89,0.40), rgba(255,119,89,0) 65%)',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none"
        style={{
          position: 'absolute',
          bottom: -220,
          left: -120,
          width: 520,
          height: 520,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at center, rgba(93,184,166,0.22), rgba(93,184,166,0) 65%)',
        }}
      />

      {/* Top — eyebrow */}
      <p
        className="text-[11px] uppercase font-medium relative z-10"
        style={{ letterSpacing: '0.18em', color: 'rgba(232,229,222,0.65)' }}
      >
        Developer Workspace · build log
      </p>

      {/* Middle — display headline */}
      <div className="relative z-10">
        <h2 className="font-display leading-[1.02]" style={{ fontSize: 56 }}>
          {mode === 'signup' ? (
            <>
              Notes, tasks,
              <br />
              and insights —
              <br />
              <span style={{ color: '#ff7759' }}>one workspace.</span>
            </>
          ) : (
            <>
              Welcome back
              <br />
              to where work
              <br />
              <span style={{ color: '#ff7759' }}>actually ships.</span>
            </>
          )}
        </h2>
        <p
          className="mt-5 max-w-md text-[15px] leading-relaxed"
          style={{ color: 'rgba(232,229,222,0.72)' }}
        >
          A federated micro-frontend workspace with live collaboration —
          everything you and your team capture in one place, synced across devices.
        </p>
      </div>

      {/* Bottom — mock product card */}
      <MockCard />
    </div>
  )
}

function MockCard() {
  return (
    <div
      className="relative z-10 self-end"
      style={{ width: '100%', maxWidth: 360 }}
    >
      {/* Floating background card (decorative second card) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'translate(14px, 14px) rotate(2deg)',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14,
        }}
      />
      <div
        style={{
          position: 'relative',
          padding: '16px 18px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-mono"
            style={{ color: 'rgba(232,229,222,0.55)' }}
          >
            DW-12
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] uppercase font-medium"
            style={{ letterSpacing: '0.14em', color: '#5db8a6' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#5db8a6' }}
            />
            In progress
          </span>
        </div>
        <p
          className="mt-2 font-medium text-[15px] leading-snug"
          style={{ color: '#f5f1ea' }}
        >
          Ship the realtime collaboration spike
        </p>
        <p
          className="mt-1 text-[12px] leading-relaxed"
          style={{ color: 'rgba(232,229,222,0.6)' }}
        >
          Wire Supabase realtime into the tasks board so two users see edits
          in under 200ms.
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center -space-x-1.5">
            {['VG', 'SK', 'AM'].map((i, idx) => (
              <span
                key={i}
                className="w-6 h-6 rounded-full text-[9px] font-medium flex items-center justify-center"
                style={{
                  background:
                    idx === 0 ? '#ff7759' : idx === 1 ? '#5db8a6' : '#d4a017',
                  color: '#181715',
                  border: '2px solid #181715',
                }}
              >
                {i}
              </span>
            ))}
          </div>
          <span
            className="text-[10px] font-mono"
            style={{ color: 'rgba(232,229,222,0.5)' }}
          >
            due 18 May
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Sign in
// ============================================================

function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const { signInWithPassword, signInWithGoogle } = useAuth()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninValues>({
    resolver: zodResolver(signinSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })

  const onGoogle = async () => {
    setTopError(null)
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setGoogleLoading(false)
      setTopError(googleErrorMessage(err))
    }
  }

  const onSubmit = async ({ email, password }: SigninValues) => {
    setTopError(null)
    try {
      await signInWithPassword(email, password)
    } catch (err) {
      setTopError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <>
      <h1 className="font-display text-[32px] leading-[1.05] text-ink">Welcome back</h1>
      <p className="text-body mt-2 text-[14px] leading-relaxed">
        Sign in to pick up where you left off.
      </p>

      <div className="mt-7">
        <GoogleButton loading={googleLoading} disabled={isSubmitting} onClick={onGoogle} />
      </div>

      <Divider />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
            className={inputClass(!!errors.email)}
          />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              aria-invalid={!!errors.password}
              {...register('password')}
              className={inputClass(!!errors.password)}
              style={{ paddingRight: 40 }}
            />
            <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </div>
        </Field>

        {topError && <FormError>{topError}</FormError>}

        <SubmitButton loading={isSubmitting} label="Sign in" loadingLabel="Signing in…" />
      </form>

      <SwitchPrompt text="Don't have an account?" ctaText="Create one" onClick={onSwitch} />
    </>
  )
}

// ============================================================
// Sign up
// ============================================================

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const { signUpWithPassword, signInWithGoogle } = useAuth()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  const password = watch('password')

  const onGoogle = async () => {
    setTopError(null)
    setInfo(null)
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setGoogleLoading(false)
      setTopError(googleErrorMessage(err))
    }
  }

  const onSubmit = async ({ name, email, password }: SignupValues) => {
    setTopError(null)
    setInfo(null)
    try {
      const { needsConfirmation } = await signUpWithPassword(email, password, name)
      if (needsConfirmation) {
        setInfo(`We sent a confirmation link to ${email}. Click it to finish signing up.`)
      }
    } catch (err) {
      setTopError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      )
    }
  }

  return (
    <>
      <h1 className="font-display text-[28px] leading-[1.05] text-ink">Create your workspace</h1>
      <p className="text-body mt-2 text-[13.5px] leading-relaxed">
        Your tasks, notes, and insights — synced across devices.
      </p>

      <div className="mt-5">
        <GoogleButton loading={googleLoading} disabled={isSubmitting} onClick={onGoogle} />
      </div>

      <Divider />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <Field label="Name" error={errors.name?.message}>
          <input
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="Your full name"
            aria-invalid={!!errors.name}
            {...register('name')}
            className={inputClass(!!errors.name)}
          />
        </Field>

        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
            className={inputClass(!!errors.email)}
          />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              aria-invalid={!!errors.password}
              {...register('password')}
              className={inputClass(!!errors.password)}
              style={{ paddingRight: 40 }}
            />
            <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </div>
          <PasswordStrengthMeter password={password ?? ''} />
        </Field>

        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-type your password"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
              className={inputClass(!!errors.confirmPassword)}
              style={{ paddingRight: 40 }}
            />
            <PasswordToggle visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
          </div>
        </Field>

        {topError && <FormError>{topError}</FormError>}
        {info && (
          <div className="text-[12.5px] text-ink bg-pale-green rounded-md px-3 py-2 border border-success/30">
            {info}
          </div>
        )}

        <SubmitButton
          loading={isSubmitting}
          label="Create account"
          loadingLabel="Creating account…"
        />
      </form>

      <SwitchPrompt text="Already have an account?" ctaText="Sign in" onClick={onSwitch} />
    </>
  )
}

// ============================================================
// Shared bits
// ============================================================

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-[11.5px] text-error">{error}</p>}
    </label>
  )
}

function inputClass(invalid: boolean): string {
  return `w-full h-10 px-3.5 rounded-md bg-canvas border text-[14px] text-ink outline-none transition-colors ${
    invalid ? 'border-error focus:border-error' : 'border-hairline focus:border-ink'
  }`
}

function PasswordToggle({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={visible ? 'Hide password' : 'Show password'}
      style={{
        position: 'absolute',
        right: 8,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 28,
        height: 28,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className="text-muted hover:text-ink hover:bg-surface-card"
    >
      {visible ? <EyeOff size={14} strokeWidth={1.7} /> : <Eye size={14} strokeWidth={1.7} />}
    </button>
  )
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12.5px] text-error bg-error/8 rounded-md px-3 py-2 border border-error/30">
      {children}
    </div>
  )
}

function SubmitButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean
  label: string
  loadingLabel: string
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-11 rounded-pill bg-primary text-on-primary text-[14px] font-medium hover:bg-primary-active transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-on-primary border-t-transparent animate-spin" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-4">
      <span className="flex-1 h-px bg-hairline" />
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-soft font-medium">
        or
      </span>
      <span className="flex-1 h-px bg-hairline" />
    </div>
  )
}

function SwitchPrompt({
  text,
  ctaText,
  onClick,
}: {
  text: string
  ctaText: string
  onClick: () => void
}) {
  return (
    <p className="text-[12.5px] text-muted mt-5 text-center">
      {text}{' '}
      <button
        type="button"
        onClick={onClick}
        className="text-ink font-medium underline underline-offset-2 hover:text-primary"
      >
        {ctaText}
      </button>
    </p>
  )
}

function GoogleButton({
  loading,
  disabled,
  onClick,
}: {
  loading: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full h-10 rounded-pill bg-canvas border border-hairline text-ink hover:border-ink text-[13px] font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2.5"
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-ink border-t-transparent animate-spin" />
      ) : (
        <GoogleGlyph />
      )}
      Continue with Google
    </button>
  )
}

function googleErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Google sign-in failed.'
  return message.toLowerCase().includes('provider')
    ? 'Google provider is not enabled in your Supabase project. Open Authentication → Providers → Google and enable it.'
    : message
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.75h3.56c2.08-1.92 3.28-4.74 3.28-8.08Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.67l-3.56-2.75c-.98.66-2.24 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.2 1.65l3.15-3.15C17.45 2.1 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}
