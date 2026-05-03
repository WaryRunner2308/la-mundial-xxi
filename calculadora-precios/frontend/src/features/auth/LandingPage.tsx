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
    // No navegación explícita - el cambio de estado en App activa la redirección natural
  };

  const handleGerenciaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Enviar username y password al login
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
      <div className="max-w-2xl w-full space-y-6">
        {/* Header con Logo Grande y Personajes Oficiales */}
        <div className="text-center">
          {/* Logo principal */}
          <div className="flex justify-center mb-3">
            <img
              src="/logo.png"
              alt="La Mundial XXI"
              className="w-28 h-28 md:w-36 md:h-36 object-contain"
            />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Bienvenido a La Mundial XXI
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Sistema de Gestión de Precios
          </p>
        </div>

        {/* Tarjetas de Selección - Diseño Elevado, Sin Scroll */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Tarjeta Invitado */}
          <button
            onClick={handleInvitado}
            className="group relative bg-white border-2 border-stone-200 rounded-2xl p-6 md:p-8 hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left h-full overflow-hidden"
            style={{ minHeight: '200px' }}
          >
            <div className="relative z-10">
              <div className="text-4xl md:text-5xl mb-3 group-hover:scale-110 transition-transform">
                🔍
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                Modo Invitado
              </h2>
              <p className="text-gray-600 text-sm md:text-base mb-4">
                Consulta rápida de precios. Acceso limitado a visualización.
              </p>
              <div className="inline-flex px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm md:text-base">
                Entrar como Invitado →
              </div>
            </div>
          </button>

          {/* Tarjeta Gerencia */}
          <button
            onClick={() => setShowLogin(true)}
            className="group relative bg-white border-2 border-stone-200 rounded-2xl p-6 md:p-8 hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left h-full overflow-hidden"
            style={{ minHeight: '200px' }}
          >
            <div className="relative z-10">
              <div className="text-4xl md:text-5xl mb-3 group-hover:scale-110 transition-transform">
                🎯
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                Modo Gerencia
              </h2>
              <p className="text-gray-600 text-sm md:text-base mb-4">
                Control total. Acceso completo a todas las funciones administrativas.
              </p>
              <div className="inline-flex px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium text-sm md:text-base">
                Iniciar Sesión →
              </div>
            </div>
          </button>
        </div>

        {/* Modal de Login Gerencia - Estilo Minimalista */}
        {showLogin && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">🔐</div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Acceso Gerencia
                </h2>
                <p className="text-gray-600 mt-2 text-sm">
                  Ingresa tus credenciales para continuar
                </p>
              </div>

               <form onSubmit={handleGerenciaSubmit} className="space-y-4" autoComplete="off" noValidate>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Usuario
                   </label>
                   <SecureInput
                     value={credentials.username}
                     onChange={(value) => setCredentials({ ...credentials, username: value })}
                     placeholder=""
                     inputMode="text"
                     editable
                     noRing={true}
                     displayClassName="border border-gray-300 rounded-lg px-4 py-3 outline-none transition bg-white focus:ring-0 focus:border-gray-300"
                    />
                  </div>

                  <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Contraseña
                   </label>
                   <input
                     type="password"
                     value={credentials.password}
                     onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                     placeholder=""
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-0 focus:border-gray-300"
                     autoComplete="current-password"
                   />
                 </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm animate-pulse">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelarLogin}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition"
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
