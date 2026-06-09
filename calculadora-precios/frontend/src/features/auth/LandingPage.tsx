import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SecureInput } from '@/components/ui/SecureInput';
import { Eye, Lock, ShieldCheck, ChevronRight } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-[#070e0b] p-4 relative overflow-hidden">

      {/* Background decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 50%, rgba(0,154,58,0.07) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 50% 40% at 80% 50%, rgba(200,16,46,0.06) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-xl w-full space-y-8 relative z-10">

        {/* Header */}
        <div className="animate-fade-up text-center">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,154,58,0.2) 0%, transparent 70%)' }} />
              <img
                src="/logo.png"
                alt="La Mundial XXI"
                className="w-24 h-24 md:w-28 md:h-28 object-contain relative z-10"
              />
            </div>
          </div>

          <h1
            className="font-black text-[#e8f0eb] mb-1 uppercase tracking-widest"
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              letterSpacing: '0.12em',
            }}
          >
            La Mundial{' '}
            <span className="text-[#009A3A]">XXI</span>
          </h1>

          <p className="text-[#4d6b58] text-xs uppercase tracking-[0.25em] font-semibold mt-1">
            Sistema de Gestión de Precios
          </p>

          {/* Portugal flag divider */}
          <div className="flex justify-center mt-5">
            <div className="flex h-[2px] w-40 rounded-full overflow-hidden">
              <div className="bg-[#009A3A]" style={{ flex: 2 }} />
              <div className="bg-[#C8102E]" style={{ flex: 3 }} />
            </div>
          </div>
        </div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Invitado */}
          <button
            onClick={handleInvitado}
            className="animate-fade-up-1 card-lift group relative bg-[#0d1612] border border-[#1a2e22] rounded-2xl p-6 hover:border-[#009A3A]/40 transition-all duration-300 text-left overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
              style={{ background: 'radial-gradient(ellipse at top left, rgba(0,154,58,0.08) 0%, transparent 60%)' }}
            />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#009A3A]/10 border border-[#009A3A]/20 flex items-center justify-center mb-4 group-hover:bg-[#009A3A]/20 transition-colors">
                <Eye size={18} className="text-[#009A3A]" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-black text-[#e8f0eb] mb-1.5" style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.06em' }}>
                MODO INVITADO
              </h2>
              <p className="text-[#8aad95] text-sm mb-5 leading-relaxed">
                Consulta rápida de precios. Acceso limitado a visualización.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#009A3A]/10 text-[#009A3A] border border-[#009A3A]/25 group-hover:bg-[#009A3A] group-hover:text-white group-hover:border-[#009A3A] rounded-xl font-bold text-sm transition-all duration-300">
                Entrar como Invitado
                <ChevronRight size={14} strokeWidth={2.5} />
              </div>
            </div>
          </button>

          {/* Gerencia */}
          <button
            onClick={() => setShowLogin(true)}
            className="animate-fade-up-2 card-lift group relative bg-[#0d1612] border border-[#1a2e22] rounded-2xl p-6 hover:border-[#C8102E]/40 transition-all duration-300 text-left overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
              style={{ background: 'radial-gradient(ellipse at top left, rgba(200,16,46,0.08) 0%, transparent 60%)' }}
            />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#C8102E]/10 border border-[#C8102E]/20 flex items-center justify-center mb-4 group-hover:bg-[#C8102E]/20 transition-colors">
                <ShieldCheck size={18} className="text-[#C8102E]" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-black text-[#e8f0eb] mb-1.5" style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.06em' }}>
                MODO GERENCIA
              </h2>
              <p className="text-[#8aad95] text-sm mb-5 leading-relaxed">
                Control total. Acceso completo a todas las funciones administrativas.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8102E]/10 text-[#C8102E] border border-[#C8102E]/25 group-hover:bg-[#C8102E] group-hover:text-white group-hover:border-[#C8102E] rounded-xl font-bold text-sm transition-all duration-300">
                Iniciar Sesión
                <ChevronRight size={14} strokeWidth={2.5} />
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <p className="animate-fade-up-3 text-center text-[#4d6b58] text-xs uppercase tracking-widest">
          LA MUNDIAL XXI · 2025
        </p>
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0d1612] border border-[#1a2e22] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-fade-up">

            {/* Portugal flag strip */}
            <div className="flex h-[3px] rounded-full overflow-hidden mb-6">
              <div className="bg-[#009A3A]" style={{ flex: 2 }} />
              <div className="bg-[#C8102E]" style={{ flex: 3 }} />
            </div>

            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#C8102E]/10 border border-[#C8102E]/20 flex items-center justify-center">
                <Lock size={22} className="text-[#C8102E]" strokeWidth={2} />
              </div>
              <h2
                className="text-2xl font-black text-[#e8f0eb]"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.08em' }}
              >
                ACCESO GERENCIA
              </h2>
              <p className="text-[#8aad95] mt-2 text-sm">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleGerenciaSubmit} className="space-y-4" autoComplete="off" noValidate>
              <div>
                <label className="block text-xs font-semibold text-[#8aad95] mb-2 uppercase tracking-wider">
                  Usuario
                </label>
                <SecureInput
                  value={credentials.username}
                  onChange={(value) => setCredentials({ ...credentials, username: value })}
                  placeholder=""
                  inputMode="text"
                  editable
                  noRing
                  displayClassName="!bg-[#112016] !border-[#1a2e22] !text-[#e8f0eb] !rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8aad95] mb-2 uppercase tracking-wider">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder=""
                  className="w-full px-4 py-3 bg-[#112016] border border-[#1a2e22] rounded-xl text-[#e8f0eb] outline-none transition focus:border-[#009A3A]/50 text-base min-h-[48px]"
                  autoComplete="current-password"
                  style={{ fontFamily: 'inherit' }}
                />
              </div>

              {error && (
                <div className="p-3 bg-[#C8102E]/10 border border-[#C8102E]/25 rounded-xl text-[#e05070] text-sm flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancelarLogin}
                  className="flex-1 px-4 py-3 border border-[#1a2e22] rounded-xl text-[#8aad95] font-semibold hover:bg-[#112016] hover:text-[#e8f0eb] transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#C8102E] hover:bg-[#a00d25] text-white font-bold rounded-xl shadow transition text-sm"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.06em', fontSize: '0.95rem' }}
                >
                  ENTRAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
