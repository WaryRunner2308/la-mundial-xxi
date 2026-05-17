import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

type UserRole = 'gerencia' | 'invitado' | null;

interface AuthContextType {
  userRole: UserRole;
  login: (role: 'gerencia' | 'invitado', username?: string, password?: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TIMEOUT_INVITADO = 4 * 60 * 1000; // 4 minutos
const TIMEOUT_GERENCIA = 10 * 60 * 1000; // 10 minutos

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const userRoleRef = useRef<UserRole>(null);

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);
  useEffect(() => { userRoleRef.current = userRole; }, [userRole]);

  const getTimeoutForRole = (role: 'gerencia' | 'invitado') =>
    role === 'gerencia' ? TIMEOUT_GERENCIA : TIMEOUT_INVITADO;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (role: 'gerencia' | 'invitado') => {
    clearTimer();
    const timeout = role === 'gerencia' ? TIMEOUT_GERENCIA : TIMEOUT_INVITADO;
    console.log(`🕒 Temporizador iniciado (${role}): ${timeout / 60000} min`);
    timerRef.current = setTimeout(() => {
      if (isMounted.current) {
        console.log('⏰ Sesión expirada');
        setUserRole(null);
        localStorage.removeItem('userRole');
        localStorage.removeItem('lastActivity');
      }
    }, timeout);
  };

  // Cargar sesión al iniciar (una vez)
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole;
    const savedActivity = localStorage.getItem('lastActivity');

    if (savedRole === 'gerencia' || savedRole === 'invitado') {
      const now = Date.now();
      const lastActive = savedActivity ? parseInt(savedActivity, 10) : now;
      const elapsed = now - lastActive;
      const maxTimeout = savedRole === 'gerencia' ? TIMEOUT_GERENCIA : TIMEOUT_INVITADO;

      if (elapsed >= maxTimeout) {
        console.log('⏰ Sesión expirada al cargar');
        localStorage.removeItem('userRole');
        localStorage.removeItem('lastActivity');
      } else {
        setUserRole(savedRole);
        const remaining = maxTimeout - elapsed;
        console.log(`⏰ Tiempo restante: ${remaining / 60000} min`);
        timerRef.current = setTimeout(() => {
          if (isMounted.current) {
            setUserRole(null);
            localStorage.removeItem('userRole');
            localStorage.removeItem('lastActivity');
          }
        }, remaining);
      }
    }
  }, []);

  // Eventos de actividad (registrados UNA SOLA VEZ, usan ref para evitar cierres)
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    const handler = () => {
      const currentRole = userRoleRef.current;
      if (currentRole) {
        localStorage.setItem('lastActivity', Date.now().toString());
        clearTimer();
        const timeout = getTimeoutForRole(currentRole);
        console.log(`🔄 Actividad - reiniciando temporizador (${timeout / 60000} min)`);
        timerRef.current = setTimeout(() => {
          if (isMounted.current) {
            console.log('⏰ Tiempo agotado por inactividad');
            setUserRole(null);
            localStorage.removeItem('userRole');
            localStorage.removeItem('lastActivity');
          }
        }, timeout);
      }
    };
    events.forEach(ev => window.addEventListener(ev, handler));
    return () => events.forEach(ev => window.removeEventListener(ev, handler));
  }, []); // <-- SIN dependencias, se registra una vez

  // Pestaña oculta (usa ref)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        clearTimer();
      } else {
        const currentRole = userRoleRef.current;
        if (currentRole) {
          startTimer(currentRole);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Cierre de pestaña
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (userRoleRef.current) {
        localStorage.removeItem('userRole');
        localStorage.removeItem('lastActivity');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Sincronización entre pestañas
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'userRole' && e.newValue === null && isMounted.current) {
        setUserRole(null);
        clearTimer();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = (role: 'gerencia' | 'invitado', username?: string, password?: string): boolean => {
    if (role === 'invitado') {
      setUserRole('invitado');
      localStorage.setItem('userRole', 'invitado');
      localStorage.setItem('lastActivity', Date.now().toString());
      clearTimer();
      startTimer('invitado');
      console.log('✅ Sesión Invitado iniciada');
      return true;
    }

    if (role === 'gerencia') {
      const validUser = 'pumpo';
      const validPass = 'Laly2018';
      const inputUser = (username || '').trim().toLowerCase();
      const inputPass = (password || '').trim();

      if (inputUser === validUser && inputPass === validPass) {
        setUserRole('gerencia');
        localStorage.setItem('userRole', 'gerencia');
        localStorage.setItem('lastActivity', Date.now().toString());
        clearTimer();
        startTimer('gerencia');
        console.log('✅ Sesión Gerencia iniciada');
        return true;
      }
      console.log('❌ Credenciales incorrectas');
      return false;
    }

    return false;
  };

  const logout = () => {
    clearTimer();
    setUserRole(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('lastActivity');
    console.log('🚪 Sesión cerrada');
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
  if (context === undefined) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
}
