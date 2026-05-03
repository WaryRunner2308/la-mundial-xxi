import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

type UserRole = 'gerencia' | 'invitado' | null;

interface AuthContextType {
  userRole: UserRole;
  login: (role: 'gerencia' | 'invitado', username?: string, password?: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT_INVITADO = 5 * 60 * 1000; // 5 minutos
const INACTIVITY_TIMEOUT_GERENCIA = 10 * 60 * 1000; // 10 minutos

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const startInactivityTimer = (role: 'gerencia' | 'invitado' | null = userRole) => {
    clearInactivityTimer();
    const timeout = role === 'gerencia' ? INACTIVITY_TIMEOUT_GERENCIA : INACTIVITY_TIMEOUT_INVITADO;
    console.log(`🕒 Temporizador iniciado (${role === 'gerencia' ? 'Gerencia' : 'Invitado'}): ${timeout / 60000} minutos`);
    inactivityTimerRef.current = setTimeout(() => {
      console.log(`⏰ Tiempo agotado (${role === 'gerencia' ? 'Gerencia' : 'Invitado'}) - Cerrando sesión automáticamente`);
      setUserRole(null);
      localStorage.removeItem('userRole');
      localStorage.removeItem('lastActivity');
    }, timeout);
  };

  const resetTimerOnActivity = () => {
    if (userRole) {
      console.log('🔄 Actividad detectada - reiniciando temporizador');
      localStorage.setItem('lastActivity', Date.now().toString());
      startInactivityTimer(userRole);
    }
  };

  useEffect(() => {
    const handleActivity = () => {
      resetTimerOnActivity();
    };

    const handleVisibilityChange = () => {
      if (document.hidden && userRole) {
        console.log('👀 Pestaña oculta - pausando temporizador');
        clearInactivityTimer();
      } else if (!document.hidden && userRole) {
        console.log('👀 Pestaña activa - reiniciando temporizador');
        startInactivityTimer(userRole);
      }
    };

    const handleBeforeUnload = () => {
      if (userRole) {
        console.log('🚪 Cerrando pestaña/navegador - limpiando sesión');
        localStorage.removeItem('userRole');
        localStorage.removeItem('lastActivity');
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userRole' && e.newValue === null) {
        console.log('🔄 Sesión limpiada en otra pestaña - cerrando local');
        localStorage.removeItem('lastActivity');
        setUserRole(null);
        clearInactivityTimer();
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('storage', handleStorageChange);
      clearInactivityTimer();
    };
  }, [userRole]);

  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole;
    const savedLastActivity = localStorage.getItem('lastActivity');

    if (savedRole === 'gerencia' || savedRole === 'invitado') {
      const now = Date.now();
      const lastActive = savedLastActivity ? parseInt(savedLastActivity, 10) : now;
      const timeSinceLastActivity = now - lastActive;
      const maxTimeout = savedRole === 'gerencia' ? INACTIVITY_TIMEOUT_GERENCIA : INACTIVITY_TIMEOUT_INVITADO;

      if (timeSinceLastActivity > maxTimeout) {
        console.log(`⏰ Sesión expirada por inactividad al cargar (${savedRole})`);
        localStorage.removeItem('userRole');
        localStorage.removeItem('lastActivity');
        setUserRole(null);
      } else {
        setUserRole(savedRole);
        const remainingTime = maxTimeout - timeSinceLastActivity;
        startInactivityTimer(savedRole);
        // Ajustar el temporizador al tiempo restante
        clearInactivityTimer();
        console.log(`⏰ Tiempo restante al cargar: ${remainingTime / 60000} minutos`);
        inactivityTimerRef.current = setTimeout(() => {
          console.log(`⏰ Tiempo agotado (${savedRole}) - Cerrando sesión automáticamente`);
          setUserRole(null);
          localStorage.removeItem('userRole');
          localStorage.removeItem('lastActivity');
        }, remainingTime);
      }
    }
  }, []);

  const login = (role: 'gerencia' | 'invitado', username?: string, password?: string): boolean => {
    if (role === 'invitado') {
      setUserRole('invitado');
      localStorage.setItem('userRole', 'invitado');
      localStorage.setItem('lastActivity', Date.now().toString());
      startInactivityTimer('invitado');
      console.log('✅ Sesión de Invitado iniciada');
      return true;
    }

    if (role === 'gerencia') {
      const validUser = 'pumpo';
      const validPass = 'Laly2018'; // EXACTA: L mayúscula
      const inputUser = (username || '').trim().toLowerCase();
      const inputPass = (password || '').trim();

      console.log('🔐 Intento de login:', { inputUser, inputPass, validUser, validPass });

      if (inputUser === validUser && inputPass === validPass) {
        setUserRole('gerencia');
        localStorage.setItem('userRole', 'gerencia');
        localStorage.setItem('lastActivity', Date.now().toString());
        startInactivityTimer('gerencia');
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
    localStorage.removeItem('lastActivity');
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
