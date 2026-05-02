import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

type UserRole = 'gerencia' | 'invitado' | null;

interface AuthContextType {
  userRole: UserRole;
  login: (role: 'gerencia' | 'invitado', password?: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutos en ms

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Función para limpiar temporizador
  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  // Función para iniciar temporizador de inactividad
  const startInactivityTimer = () => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      //Auto-logout tras 2 minutos de inactividad
      setUserRole(null);
      localStorage.removeItem('userRole');
      console.log('🕒 Sesión cerrada por inactividad (2 minutos)');
    }, INACTIVITY_TIMEOUT);
  };

  // Reiniciar temporizador en actividad del usuario
  useEffect(() => {
    const handleUserActivity = () => {
      if (userRole) {
        startInactivityTimer();
      }
    };

    // Eventos que indican actividad
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

  // Cargar rol desde localStorage al iniciar
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole;
    if (savedRole === 'gerencia' || savedRole === 'invitado') {
      setUserRole(savedRole);
      // Iniciar temporizador al cargar rol existente
      startInactivityTimer();
    }
  }, []);

  const login = (role: 'gerencia' | 'invitado', password?: string): boolean => {
    if (role === 'invitado') {
      setUserRole('invitado');
      localStorage.setItem('userRole', 'invitado');
      startInactivityTimer(); // Iniciar timer
      return true;
    }

    if (role === 'gerencia') {
      // Credenciales: usuario pumpo (case-insensitive), contraseña Laly2018 (exacta)
      const validUser = 'pumpo';
      const validPass = 'Laly2018';
      const inputUser = (password?.toLowerCase() || '').trim();

      if (inputUser === validUser && password === validPass) {
        setUserRole('gerencia');
        localStorage.setItem('userRole', 'gerencia');
        startInactivityTimer(); // Iniciar timer
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
