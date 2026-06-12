import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { SecureInput } from '@/components/ui/SecureInput';
import { Eye, Lock, ShieldCheck, ChevronRight } from 'lucide-react';
import { DiagonalMarquee } from './DiagonalMarquee';

export function LandingPage() {
  const { login } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleInvitado = () => login('invitado');

  const handleGerenciaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login('gerencia', credentials.username, credentials.password);
    if (!success) setError('Credenciales incorrectas. Verifica usuario y contraseña.');
  };

  const handleCancelarLogin = () => {
    setShowLogin(false);
    setError('');
    setCredentials({ username: '', password: '' });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0d1117' }}
    >
      {/* Marquee diagonal "LA MUNDIAL" */}
      <DiagonalMarquee />

      {/* Atmospheric glows */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: [
          'radial-gradient(ellipse 55% 45% at 15% 40%, rgba(0,154,58,0.08) 0%, transparent 60%)',
          'radial-gradient(ellipse 45% 40% at 85% 65%, rgba(200,16,46,0.06) 0%, transparent 60%)',
          'radial-gradient(ellipse 30% 30% at 50% 50%, rgba(0,154,58,0.03) 0%, transparent 60%)',
        ].join(', '),
      }} />

      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: 0.4,
      }} />

      <div className="max-w-2xl w-full space-y-8 relative z-10">

        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
            className="flex justify-center mb-6"
          >
            <img
              src="/logo.png"
              alt="La Mundial"
              className="w-28 h-28 md:w-32 md:h-32 object-contain"
              style={{ filter: 'drop-shadow(0 0 32px rgba(0,154,58,0.35)) drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}
            />
          </motion.div>

          <h1
            className="font-black text-[#e6edf3] uppercase mb-2"
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: 'clamp(2.4rem, 7vw, 4rem)',
              letterSpacing: '0.14em',
              textShadow: '0 0 60px rgba(0,154,58,0.25)',
            }}
          >
            La Mundial <span style={{ color: '#009A3A' }}>XXI</span>
          </h1>
          <p className="text-[#484f58] text-xs uppercase tracking-[0.3em] font-semibold">
            Sistema de Gestión de Precios
          </p>

          <div className="flex justify-center mt-5">
            <div className="flex h-[2px] w-48 rounded-full overflow-hidden">
              <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
              <div style={{ flex: 3, background: '#C8102E' }} />
            </div>
          </div>
        </motion.div>

        {/* ─── Mode Cards ─── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Invitado */}
          <motion.button
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.025, y: -5 }}
            whileTap={{ scale: 0.975 }}
            onClick={handleInvitado}
            className="group relative text-left overflow-hidden rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg,#1c2128 0%,#161b22 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            }}
          >
            {/* Hover glow */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at top left, rgba(0,154,58,0.09) 0%, transparent 65%)' }} />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(0,154,58,0.1)', border: '1px solid rgba(0,154,58,0.2)' }}>
                <Eye size={20} style={{ color: '#009A3A' }} strokeWidth={2} />
              </div>
              <h2 className="text-xl font-black text-[#e6edf3] mb-2"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.08em' }}>
                MODO INVITADO
              </h2>
              <p className="text-[#8b949e] text-sm mb-5 leading-relaxed">
                Consulta rápida de precios. Acceso limitado a visualización y calculadora.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
                style={{
                  background: 'rgba(0,154,58,0.1)',
                  border: '1px solid rgba(0,154,58,0.2)',
                  color: '#009A3A',
                }}>
                Entrar como Invitado <ChevronRight size={14} strokeWidth={2.5} />
              </div>
            </div>
          </motion.button>

          {/* Gerencia */}
          <motion.button
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.025, y: -5 }}
            whileTap={{ scale: 0.975 }}
            onClick={() => setShowLogin(true)}
            className="group relative text-left overflow-hidden rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg,#1a1215 0%,#161b22 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            }}
          >
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at top left, rgba(200,16,46,0.09) 0%, transparent 65%)' }} />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.2)' }}>
                <ShieldCheck size={20} style={{ color: '#C8102E' }} strokeWidth={2} />
              </div>
              <h2 className="text-xl font-black text-[#e6edf3] mb-2"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.08em' }}>
                MODO GERENCIA
              </h2>
              <p className="text-[#8b949e] text-sm mb-5 leading-relaxed">
                Control total. Acceso completo a todas las funciones administrativas.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
                style={{
                  background: 'rgba(200,16,46,0.1)',
                  border: '1px solid rgba(200,16,46,0.2)',
                  color: '#C8102E',
                }}>
                Iniciar Sesión <ChevronRight size={14} strokeWidth={2.5} />
              </div>
            </div>
          </motion.button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-[#484f58] text-xs uppercase tracking-widest"
        >
          LA MUNDIAL XXI · 2025
        </motion.p>
      </div>

      {/* ─── Login Modal ─── */}
      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
            onClick={handleCancelarLogin}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 28 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="max-w-md w-full rounded-2xl p-6 md:p-8"
              style={{
                background: '#161b22',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-[3px] rounded-full overflow-hidden mb-6">
                <div style={{ flex: 2, background: 'linear-gradient(90deg,#009A3A,#1ebb60)' }} />
                <div style={{ flex: 3, background: '#C8102E' }} />
              </div>

              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.2)' }}>
                  <Lock size={22} style={{ color: '#C8102E' }} strokeWidth={2} />
                </div>
                <h2 className="text-2xl font-black text-[#e6edf3] uppercase tracking-widest"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                  ACCESO GERENCIA
                </h2>
                <p className="text-[#8b949e] mt-2 text-sm">Ingresa tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleGerenciaSubmit} className="space-y-4" autoComplete="off" noValidate>
                <div>
                  <label className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">
                    Usuario
                  </label>
                  <SecureInput
                    value={credentials.username}
                    onChange={(value) => setCredentials({ ...credentials, username: value })}
                    placeholder=""
                    inputMode="text"
                    editable
                    noRing
                    displayClassName="!border-white/10 !rounded-xl !bg-[#1c2128] !text-[#e6edf3]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#009A3A] mb-2 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-[#e6edf3] text-base min-h-[48px] outline-none transition"
                    style={{
                      background: '#1c2128',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(0,154,58,0.4)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    autoComplete="current-password"
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 rounded-xl text-sm flex items-center gap-2 text-[#C8102E]"
                      style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.2)' }}
                    >
                      <span>⚠️</span> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelarLogin}
                    className="flex-1 px-4 py-3 rounded-xl text-[#8b949e] font-semibold hover:text-[#e6edf3] transition text-sm"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 text-white font-bold rounded-xl transition text-sm"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      letterSpacing: '0.08em',
                      background: 'linear-gradient(135deg,#C8102E,#a00d25)',
                      boxShadow: '0 4px 20px rgba(200,16,46,0.35)',
                    }}
                  >
                    ENTRAR
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
