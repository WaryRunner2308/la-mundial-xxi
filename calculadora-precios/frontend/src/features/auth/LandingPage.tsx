import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  // Si ya está autenticado, redirigir
  if (isAuthenticated) {
    navigate('/products');
    return null;
  }

  const handleInvitado = () => {
    login('invitado');
    navigate('/products');
  };

  const handleGerenciaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login('gerencia', credentials.password);
    if (success) {
      setShowLogin(false);
      navigate('/products');
    } else {
      setError('Credenciales incorrectas. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header con Logo y Personajes */}
        <div className="text-center">
          {/* Logo grande */}
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="La Mundial XXI"
              className="w-48 h-48 md:w-64 md:h-64 object-contain"
            />
          </div>

          {/* Personajes */}
          <div className="flex justify-center items-end gap-8 mb-8">
            <div className="text-6xl md:text-7xl" role="img" aria-label="Personaje 1">
              👨‍💼
            </div>
            <div className="text-6xl md:text-7xl" role="img" aria-label="Personaje 2">
              👩‍💼
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Bienvenido a La Mundial XXI
          </h1>
          <p className="text-gray-600 text-lg">
            Selecciona tu modo de acceso para continuar
          </p>
        </div>

        {/* Tarjetas de Selección */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Tarjeta Invitado */}
          <button
            onClick={handleInvitado}
            className="group relative bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
              👀
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Modo Invitado
            </h2>
            <p className="text-gray-600">
              Vista limitada para clientes. Solo consulta de precios.
            </p>
            <div className="mt-4 inline-flex px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
              Acceder →
            </div>
          </button>

          {/* Tarjeta Gerencia */}
          <button
            onClick={() => setShowLogin(true)}
            className="group relative bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
              🎯
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Modo Gerencia
            </h2>
            <p className="text-gray-600">
              Control total. Acceso completo a todas las funciones.
            </p>
            <div className="mt-4 inline-flex px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium">
              Iniciar Sesión →
            </div>
          </button>
        </div>

        {/* Modal de Login Gerencia */}
        {showLogin && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">🔐</div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Acceso Gerencia
                </h2>
                <p className="text-gray-600 mt-2 text-sm">
                  Ingresa tus credenciales
                </p>
              </div>

              <form onSubmit={handleGerenciaSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    placeholder="pumpo"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoComplete="username"
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
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLogin(false);
                      setError('');
                      setCredentials({ username: '', password: '' });
                    }}
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
