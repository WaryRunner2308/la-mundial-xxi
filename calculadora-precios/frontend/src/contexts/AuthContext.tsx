import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

type UserRole = 'gerencia' | 'invitado' | null;

interface AuthContextType {
  userRole: UserRole;
  login: (role: 'gerencia' | 'invitado', username?: string, password?: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutos

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
    inactivityTimerRef.current = setTimeout(() => {
      setUserRole(null);
      localStorage.removeItem('userRole');
      console.log('🕒 Sesión cerrada por inactividad (2 minutos)');
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    const handleUserActivity = () => {
      if (userRole) {
        startInactivityTimer();
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
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
      return true;
    }

    if (role === 'gerencia') {
      const validUser = 'pumpo';
      const validPass = 'Laly2018';
      // Limpiar y normalizar usuario
      const inputUser = (username || '').trim().toLowerCase();
      // Contraseña exacta (con trim para eliminar espacios accidentales)
      const inputPass = (password || '').trim();

      if (inputUser === validUser && inputPass === validPass) {
        setUserRole('gerencia');
        localStorage.setItem('userRole', 'gerencia');
        startInactivityTimer();
        return true;
      }
      return false;
    }

    return false;
  };

  const logout = () => {
    clearInactivityTimer();
    setUserRole(null);
    localStorage.removeItem('userRole');
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
