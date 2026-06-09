import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SecureInput } from '@/components/ui/SecureInput';

export function LandingPage() {
  const { login } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleInvitado = () => {
    login('invitado');
  };

  const handleGerenciaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login('gerencia', credentials.username, credentials.password);
    if (!success) {
      setError('Credenciales incorrectas. Verifica usuario y contraseña.');
    }
  };

  const handleCancelarLogin = () => {
    setShowLogin(false);
    setError('');
    setCredentials({ username: '', password: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="max-w-xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="La Mundial XXI"
              className="w-24 h-24 md:w-32 md:h-32 object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight mb-1.5">
            La Mundial XXI
          </h1>
          <p className="text-ink-3 text-sm md:text-base">
            Sistema de Gestión de Precios
          </p>
        </div>

        {/* Role cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Invitado */}
          <button
            onClick={handleInvitado}
            className="group bg-surface border border-line rounded-xl p-6 md:p-8 hover:border-price hover:bg-surface-raised transition-all duration-200 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-price-subtle flex items-center justify-center mb-4 group-hover:bg-price/15 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-price">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            <h2 className="text-base font-semibold text-ink mb-1">
              Modo Invitado
            </h2>
            <p className="text-ink-3 text-sm mb-4 leading-relaxed">
              Consulta rápida de precios. Acceso a visualización.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-price">
              Entrar como invitado
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </span>
          </button>

          {/* Gerencia */}
          <button
            onClick={() => setShowLogin(true)}
            className="group bg-surface border border-line rounded-xl p-6 md:p-8 hover:border-profit hover:bg-surface-raised transition-all duration-200 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-profit-subtle flex items-center justify-center mb-4 group-hover:bg-profit/15 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-profit">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2 className="text-base font-semibold text-ink mb-1">
              Modo Gerencia
            </h2>
            <p className="text-ink-3 text-sm mb-4 leading-relaxed">
              Control total. Acceso completo a todas las funciones.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-profit">
              Iniciar sesión
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </span>
          </button>
        </div>

        {/* Login modal */}
        {showLogin && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-line rounded-xl p-6 md:p-8 max-w-sm w-full shadow-xl">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-profit-subtle flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-profit">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-ink">Acceso Gerencia</h2>
                <p className="text-ink-3 mt-1 text-sm">Ingresa tus credenciales</p>
              </div>

              <form onSubmit={handleGerenciaSubmit} className="space-y-4" autoComplete="off" noValidate>
                <div>
                  <label className="block text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2">
                    Usuario
                  </label>
                  <SecureInput
                    value={credentials.username}
                    onChange={(value) => setCredentials({ ...credentials, username: value })}
                    placeholder=""
                    inputMode="text"
                    editable
                    noRing={true}
                    displayClassName="border border-line-strong rounded-lg px-4 py-3 outline-none transition bg-surface focus:ring-0 focus:border-price w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder=""
                    className="w-full px-4 py-3 border border-line-strong rounded-lg outline-none transition bg-surface focus:ring-0 focus:border-price text-ink"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-danger-subtle border border-danger/20 rounded-lg text-danger text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelarLogin}
                    className="flex-1 px-4 py-2.5 border border-line rounded-lg text-ink-2 font-medium hover:bg-surface transition text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-profit hover:bg-profit-hover text-surface-overlay font-semibold rounded-lg transition text-sm"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
