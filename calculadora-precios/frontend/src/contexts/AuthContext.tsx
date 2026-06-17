import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type UserRole = 'gerencia' | 'invitado' | null;

interface AuthContextType {
  userRole: UserRole;
  login: (role: 'gerencia' | 'invitado', username?: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// El usuario que escribe "pumpo" se traduce a un email real de Supabase Auth.
// Así el papá sigue usando su mismo usuario/clave, pero por detrás es una
// sesión autenticada de verdad (con JWT) que es lo que respeta el RLS.
const GERENCIA_EMAIL_DOMAIN = 'lamundial.app';
const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${GERENCIA_EMAIL_DOMAIN}`;

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
    (async () => {
      const savedRole = localStorage.getItem('userRole') as UserRole;
      const savedActivity = localStorage.getItem('lastActivity');

      // Para gerencia, la fuente de verdad es la sesión autenticada de Supabase.
      // Si el rol guardado dice "gerencia" pero ya no hay sesión real, no se restaura.
      if (savedRole === 'gerencia') {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          console.log('⏰ Sesión de gerencia no válida al cargar');
          localStorage.removeItem('userRole');
          localStorage.removeItem('lastActivity');
          return;
        }
      }

      if (savedRole === 'gerencia' || savedRole === 'invitado') {
        const now = Date.now();
        const lastActive = savedActivity ? parseInt(savedActivity, 10) : now;
        const elapsed = now - lastActive;
        const maxTimeout = savedRole === 'gerencia' ? TIMEOUT_GERENCIA : TIMEOUT_INVITADO;

        if (elapsed >= maxTimeout) {
          console.log('⏰ Sesión expirada al cargar');
          localStorage.removeItem('userRole');
          localStorage.removeItem('lastActivity');
          supabase.auth.signOut().catch(() => {});
        } else if (isMounted.current) {
          setUserRole(savedRole);
          const remaining = maxTimeout - elapsed;
          console.log(`⏰ Tiempo restante: ${remaining / 60000} min`);
          timerRef.current = setTimeout(() => {
            if (isMounted.current) {
              setUserRole(null);
              localStorage.removeItem('userRole');
              localStorage.removeItem('lastActivity');
              supabase.auth.signOut().catch(() => {});
            }
          }, remaining);
        }
      }
    })();
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

  const login = async (role: 'gerencia' | 'invitado', username?: string, password?: string): Promise<boolean> => {
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
      const inputUser = (username || '').trim();
      const inputPass = (password || '').trim();
      if (!inputUser || !inputPass) return false;

      // Autenticación REAL contra Supabase. Sin credenciales escritas en el código.
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(inputUser),
        password: inputPass,
      });

      if (error) {
        console.log('❌ Credenciales incorrectas');
        return false;
      }

      setUserRole('gerencia');
      localStorage.setItem('userRole', 'gerencia');
      localStorage.setItem('lastActivity', Date.now().toString());
      clearTimer();
      startTimer('gerencia');
      console.log('✅ Sesión Gerencia iniciada');
      return true;
    }

    return false;
  };

  const logout = () => {
    clearTimer();
    setUserRole(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('lastActivity');
    // Cierra también la sesión autenticada de Supabase (si la hay).
    supabase.auth.signOut().catch(() => {});
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
