import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAlmacenAvisos } from '../almacen/almacenAvisos';

type RolUsuario = 'gerencia' | 'invitado' | null;

interface TipoContextoAuth {
  rolUsuario: RolUsuario;
  iniciarSesion: (role: 'gerencia' | 'invitado', username?: string, password?: string) => Promise<boolean>;
  cerrarSesion: () => void;
  estaAutenticado: boolean;
}

// El usuario que escribe "pumpo" se traduce a un email real de Supabase Auth.
// Así el papá sigue usando su mismo usuario/clave, pero por detrás es una
// sesión autenticada de verdad (con JWT) que es lo que respeta el RLS.
const DOMINIO_CORREO_GERENCIA = 'lamundial.app';
const usuarioACorreo = (username: string) =>
  `${username.trim().toLowerCase()}@${DOMINIO_CORREO_GERENCIA}`;

const ContextoAuth = createContext<TipoContextoAuth | undefined>(undefined);

const INACTIVIDAD_INVITADO = 4 * 60 * 1000; // 4 minutos
const INACTIVIDAD_GERENCIA = 10 * 60 * 1000; // 10 minutos
const AVISO_ANTES_DE_EXPIRAR = 30 * 1000; // aviso 30s antes de cerrar sesion

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [rolUsuario, fijarRolUsuario] = useState<RolUsuario>(null);
  const refTemporizador = useRef<NodeJS.Timeout | null>(null);
  const refTemporizadorAviso = useRef<NodeJS.Timeout | null>(null);
  const estaMontado = useRef(true);
  const refRolUsuario = useRef<RolUsuario>(null);

  useEffect(() => { estaMontado.current = true; return () => { estaMontado.current = false; }; }, []);
  useEffect(() => { refRolUsuario.current = rolUsuario; }, [rolUsuario]);

  const inactividadSegunRol = (role: 'gerencia' | 'invitado') =>
    role === 'gerencia' ? INACTIVIDAD_GERENCIA : INACTIVIDAD_INVITADO;

  const limpiarTemporizador = () => {
    if (refTemporizador.current) {
      clearTimeout(refTemporizador.current);
      refTemporizador.current = null;
    }
    if (refTemporizadorAviso.current) {
      clearTimeout(refTemporizadorAviso.current);
      refTemporizadorAviso.current = null;
    }
  };

  // Unico punto que cierra la sesion por expiracion (antes estaba copiado 3 veces).
  const expirarSesion = () => {
    if (!estaMontado.current) return;
    fijarRolUsuario(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('lastActivity');
    supabase.auth.signOut().catch(() => {});
  };

  // Arranca el timer de cierre y, si alcanza el tiempo, uno de aviso previo.
  // remainingMs permite retomar una sesion ya empezada (ej. al recargar la pagina).
  const iniciarTemporizador = (role: 'gerencia' | 'invitado', remainingMs?: number) => {
    limpiarTemporizador();
    const tiempoLimite = remainingMs ?? inactividadSegunRol(role);
    refTemporizador.current = setTimeout(expirarSesion, tiempoLimite);

    const avisarEn = tiempoLimite - AVISO_ANTES_DE_EXPIRAR;
    if (avisarEn > 0) {
      refTemporizadorAviso.current = setTimeout(() => {
        useAlmacenAvisos.getState().mostrar('Tu sesión está por expirar. Mueve el mouse o toca la pantalla para seguir conectado.', 'info');
      }, avisarEn);
    }
  };

  // Cargar sesión al iniciar (una vez)
  useEffect(() => {
    (async () => {
      const rolGuardado = localStorage.getItem('userRole') as RolUsuario;
      const actividadGuardada = localStorage.getItem('lastActivity');

      // Para gerencia, la fuente de verdad es la sesión autenticada de Supabase.
      // Si el rol guardado dice "gerencia" pero ya no hay sesión real, no se restaura.
      if (rolGuardado === 'gerencia') {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          localStorage.removeItem('userRole');
          localStorage.removeItem('lastActivity');
          return;
        }
      }

      if (rolGuardado === 'gerencia' || rolGuardado === 'invitado') {
        const ahora = Date.now();
        const ultimaActividad = actividadGuardada ? parseInt(actividadGuardada, 10) : ahora;
        const transcurrido = ahora - ultimaActividad;
        const inactividadMaxima = inactividadSegunRol(rolGuardado);

        if (transcurrido >= inactividadMaxima) {
          localStorage.removeItem('userRole');
          localStorage.removeItem('lastActivity');
          supabase.auth.signOut().catch(() => {});
        } else if (estaMontado.current) {
          fijarRolUsuario(rolGuardado);
          iniciarTemporizador(rolGuardado, inactividadMaxima - transcurrido);
        }
      }
    })();
  }, []);

  // Eventos de actividad (registrados UNA SOLA VEZ, usan ref para evitar cierres)
  useEffect(() => {
    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    const manejador = () => {
      const rolActual = refRolUsuario.current;
      if (rolActual) {
        localStorage.setItem('lastActivity', Date.now().toString());
        iniciarTemporizador(rolActual);
      }
    };
    eventos.forEach(ev => window.addEventListener(ev, manejador));
    return () => eventos.forEach(ev => window.removeEventListener(ev, manejador));
  }, []); // <-- SIN dependencias, se registra una vez

  // Pestaña oculta (usa ref)
  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.hidden) {
        limpiarTemporizador();
      } else {
        const rolActual = refRolUsuario.current;
        if (rolActual) {
          iniciarTemporizador(rolActual);
        }
      }
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  }, []);

  // Cierre de pestaña
  useEffect(() => {
    const alCerrarPestana = () => {
      if (refRolUsuario.current) {
        localStorage.removeItem('userRole');
        localStorage.removeItem('lastActivity');
      }
    };
    window.addEventListener('beforeunload', alCerrarPestana);
    return () => window.removeEventListener('beforeunload', alCerrarPestana);
  }, []);

  // Sincronización entre pestañas
  useEffect(() => {
    const alCambiarAlmacenamiento = (e: StorageEvent) => {
      if (e.key === 'userRole' && e.newValue === null && estaMontado.current) {
        fijarRolUsuario(null);
        limpiarTemporizador();
      }
    };
    window.addEventListener('storage', alCambiarAlmacenamiento);
    return () => window.removeEventListener('storage', alCambiarAlmacenamiento);
  }, []);

  const iniciarSesion = async (role: 'gerencia' | 'invitado', username?: string, password?: string): Promise<boolean> => {
    if (role === 'invitado') {
      fijarRolUsuario('invitado');
      localStorage.setItem('userRole', 'invitado');
      localStorage.setItem('lastActivity', Date.now().toString());
      limpiarTemporizador();
      iniciarTemporizador('invitado');
      return true;
    }

    if (role === 'gerencia') {
      const usuarioEscrito = (username || '').trim();
      const claveEscrita = (password || '').trim();
      if (!usuarioEscrito || !claveEscrita) return false;

      // Autenticación REAL contra Supabase. Sin credenciales escritas en el código.
      const { error } = await supabase.auth.signInWithPassword({
        email: usuarioACorreo(usuarioEscrito),
        password: claveEscrita,
      });

      if (error) {
        return false;
      }

      fijarRolUsuario('gerencia');
      localStorage.setItem('userRole', 'gerencia');
      localStorage.setItem('lastActivity', Date.now().toString());
      limpiarTemporizador();
      iniciarTemporizador('gerencia');
      return true;
    }

    return false;
  };

  const cerrarSesion = () => {
    limpiarTemporizador();
    fijarRolUsuario(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('lastActivity');
    // Cierra también la sesión autenticada de Supabase (si la hay).
    supabase.auth.signOut().catch(() => {});
  };

  const estaAutenticado = rolUsuario !== null;

  return (
    <ContextoAuth.Provider value={{ rolUsuario, iniciarSesion, cerrarSesion, estaAutenticado }}>
      {children}
    </ContextoAuth.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(ContextoAuth);
  if (contexto === undefined) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return contexto;
}
