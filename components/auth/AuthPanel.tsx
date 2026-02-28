'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, Key, Mail, Shield, ShieldCheck } from 'lucide-react'

type AuthStatus = 'IDLE' | 'VALIDATING' | 'GRANTED' | 'DENIED'

function Typewriter({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    let i = 0

    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, i))
      i += 1
      if (i > text.length) clearInterval(timer)
    }, 50)

    return () => clearInterval(timer)
  }, [text])

  return (
    <span className="terminal-text text-[10px] tracking-widest text-white/40 uppercase">
      {displayedText}
      <span className="animate-pulse">_</span>
    </span>
  )
}

export default function AuthPanel() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<AuthStatus>('IDLE')
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toLowerCase())

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateEmail(email) || password.length < 8) {
      setStatus('DENIED')
      setError(true)
      setErrorMessage('Use valid email and password with at least 8 chars.')
      setTimeout(() => {
        setStatus('IDLE')
        setError(false)
        setErrorMessage('')
      }, 1800)
      return
    }

    try {
      setStatus('VALIDATING')
      setError(false)
      setErrorMessage('')

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? 'Access denied.')
      }

      setStatus('GRANTED')
      setTimeout(() => {
        router.push('/member/manage')
        router.refresh()
      }, 700)
    } catch (err) {
      setStatus('DENIED')
      setError(true)
      setErrorMessage(err instanceof Error ? err.message : 'Access denied.')
      setTimeout(() => {
        setStatus('IDLE')
        setError(false)
      }, 2200)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black text-white font-mono px-4">
      <motion.div
        className={`relative p-12 max-w-md w-full bg-black/80 border rounded-xl ${
          status === 'GRANTED'
            ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
            : status === 'DENIED'
              ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
              : 'border-white/20'
        }`}
      >
        <div className="flex flex-col items-center mb-6">
          {status === 'GRANTED' ? (
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
          ) : status === 'DENIED' ? (
            <AlertTriangle className="w-10 h-10 text-red-500" />
          ) : (
            <Shield className="w-10 h-10 text-white animate-pulse" />
          )}
          <h1 className="text-xs font-black tracking-[0.5em] uppercase text-white/90 mt-4">Kiwibit</h1>
        </div>

        <h2 className="text-2xl font-bold tracking-[0.4em] uppercase text-white text-center mb-6">
          {status === 'GRANTED'
            ? 'ACCESS_GRANTED'
            : status === 'DENIED'
              ? 'ACCESS_DENIED'
              : 'Restricted Access'}
        </h2>

        <div className="h-4 flex justify-center mb-6">
          <Typewriter text="AUTHENTICATION_REQUIRED // SECURE_SHELL_ACTIVE" />
        </div>

        <form className="space-y-4" onSubmit={handleAuthorize}>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'VALIDATING' || status === 'GRANTED'}
              placeholder="EMAIL_ADDRESS"
              required
              className={`w-full h-12 px-4 bg-transparent border border-white/20 text-white placeholder:text-white/30 rounded focus:ring-1 focus:ring-white/20 outline-none ${
                error ? 'border-red-500 ring-1 ring-red-500/30' : ''
              }`}
            />
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          </div>

          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === 'VALIDATING' || status === 'GRANTED'}
              placeholder="********"
              required
              className={`w-full h-12 px-4 bg-transparent border border-white/20 text-white placeholder:text-white/30 rounded focus:ring-1 focus:ring-white/20 outline-none ${
                error ? 'border-red-500 ring-1 ring-red-500/30' : ''
              }`}
            />
            <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          </div>

          <button
            type="submit"
            disabled={status === 'VALIDATING' || status === 'GRANTED'}
            className="w-full h-12 bg-white text-black font-black uppercase tracking-[0.5em] rounded hover:opacity-90 transition-all"
          >
            {status === 'IDLE'
              ? 'Authorize Access'
              : status === 'VALIDATING'
                ? 'VALIDATING_CREDENTIALS...'
                : status === 'GRANTED'
                  ? 'AUTHORIZED_SUCCESS'
                  : 'ACCESS_DENIED'}
          </button>
        </form>

        {errorMessage ? <p className="mt-4 text-xs text-red-300">{errorMessage}</p> : null}
        <p className="mt-6 text-[10px] text-white/45 uppercase tracking-[0.16em]">Demo password for all members: kiwi1234</p>
      </motion.div>
    </div>
  )
}
