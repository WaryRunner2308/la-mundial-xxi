import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

type UserRole = 'gerencia' | 'invitado' | null;

interface AuthContextType {
  userRole: UserRole;
  login: (role: 'gerencia' | 'invitado', username?: string, password?: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minuto en ms

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const startInactivityTimer = () => {
    clearInactivityTimer();
    console.log('🕒 Temporizador iniciado: 1 minuto de inactividad');
    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏰ Tiempo agotado - Cerrando sesión automáticamente');
      setUserRole(null);
      localStorage.removeItem('userRole');
    }, INACTIVITY_TIMEOUT);
  };

  const resetTimerOnActivity = () => {
    if (userRole) {
      console.log('🔄 Actividad detectada - reiniciando temporizador');
      startInactivityTimer();
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resetTimerOnActivity);
    window.addEventListener('keydown', resetTimerOnActivity);
    window.addEventListener('click', resetTimerOnActivity);
    window.addEventListener('scroll', resetTimerOnActivity);
    window.addEventListener('touchstart', resetTimerOnActivity);

    return () => {
      window.removeEventListener('mousemove', resetTimerOnActivity);
      window.removeEventListener('keydown', resetTimerOnActivity);
      window.removeEventListener('click', resetTimerOnActivity);
      window.removeEventListener('scroll', resetTimerOnActivity);
      window.removeEventListener('touchstart', resetTimerOnActivity);
      clearInactivityTimer();
    };
  }, [userRole]);

  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole;
    if (savedRole === 'gerencia' || savedRole === 'invitado') {
      setUserRole(savedRole);
      startInactivityTimer();
    }
  }, []);

  const login = (role: 'gerencia' | 'invitado', username?: string, password?: string): boolean => {
    if (role === 'invitado') {
      setUserRole('invitado');
      localStorage.setItem('userRole', 'invitado');
      startInactivityTimer();
      console.log('✅ Sesión de Invitado iniciada');
      return true;
    }

    if (role === 'gerencia') {
      const validUser = 'pumpo';
      const validPass = 'Laly2018';
      const inputUser = (username || '').trim().toLowerCase();
      const inputPass = (password || '').trim();

      console.log('🔐 Intento de login:', { inputUser, inputPass, validUser, validPass });

      if (inputUser === validUser && inputPass === validPass) {
        setUserRole('gerencia');
        localStorage.setItem('userRole', 'gerencia');
        startInactivityTimer();
        console.log('✅ Sesión de Gerencia iniciada');
        return true;
      }
      console.log('❌ Credenciales incorrectas');
      return false;
    }

    return false;
  };

  const logout = () => {
    clearInactivityTimer();
    setUserRole(null);
    localStorage.removeItem('userRole');
    console.log('🚪 Sesión cerrada manualmente');
  };

  const isAuthenticated = userRole !== null;

  return (
    <AuthContext.Provider value={{ userRole, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
