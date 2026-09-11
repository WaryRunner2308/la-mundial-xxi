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

// Tiempo sin tocar nada antes de cerrar la sesion sola. Igual para gerencia y
// para invitado. La sesion sobrevive al refresco de la pagina, asi que este
// contador es la unica proteccion si alguien deja el equipo abierto.
const INACTIVIDAD_MAXIMA = 30 * 60 * 1000; // 30 minutos
const AVISO_ANTES_DE_EXPIRAR = 60 * 1000; // aviso 1 min antes de cerrar sesion

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [rolUsuario, fijarRolUsuario] = useState<RolUsuario>(null);
  const refTemporizador = useRef<NodeJS.Timeout | null>(null);
  const refTemporizadorAviso = useRef<NodeJS.Timeout | null>(null);
  const estaMontado = useRef(true);
  const refRolUsuario = useRef<RolUsuario>(null);

  useEffect(() => { estaMontado.current = true; return () => { estaMontado.current = false; }; }, []);
  useEffect(() => { refRolUsuario.current = rolUsuario; }, [rolUsuario]);

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
  // restanteMs permite retomar una sesion ya empezada (ej. al recargar la pagina).
  const iniciarTemporizador = (restanteMs?: number) => {
    limpiarTemporizador();
    const tiempoLimite = restanteMs ?? INACTIVIDAD_MAXIMA;
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
        const guardada = actividadGuardada ? parseInt(actividadGuardada, 10) : NaN;
        // Si la marca de tiempo esta corrupta o no existe, no se adivina: se
        // trata como sesion vencida y se vuelve a pedir el acceso.
        const ultimaActividad = Number.isFinite(guardada) ? guardada : 0;
        const transcurrido = ahora - ultimaActividad;
        const inactividadMaxima = INACTIVIDAD_MAXIMA;

        if (transcurrido >= inactividadMaxima) {
          localStorage.removeItem('userRole');
          localStorage.removeItem('lastActivity');
          supabase.auth.signOut().catch(() => {});
        } else if (estaMontado.current) {
          fijarRolUsuario(rolGuardado);
          iniciarTemporizador(inactividadMaxima - transcurrido);
        }
      }
    })();
  }, []);

  // Eventos de actividad (registrados UNA SOLA VEZ, usan ref para evitar cierres)
  //
  // Van con freno de 1 segundo. Sin el, cada 'mousemove' y cada 'scroll'
  // -cientos por segundo al mover el mouse o deslizar una lista- escribia en
  // localStorage (que es sincrono y bloquea la pantalla) y rearmaba dos
  // temporizadores. En el celular eso se sentia como tirones al hacer scroll.
  // Un segundo de resolucion sobra: el cierre por inactividad son 4 o 10
  // minutos, asi que perder hasta 1 segundo de precision no cambia nada.
  useEffect(() => {
    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    const ESPERA_MINIMA_MS = 1000;
    let ultimoRegistro = 0;

    const manejador = () => {
      const rolActual = refRolUsuario.current;
      if (!rolActual) return;

      const ahora = Date.now();
      if (ahora - ultimoRegistro < ESPERA_MINIMA_MS) return;
      ultimoRegistro = ahora;

      localStorage.setItem('lastActivity', ahora.toString());
      iniciarTemporizador();
    };

    // passive: el navegador no tiene que esperar a ver si cancelamos el scroll
    eventos.forEach(ev => window.addEventListener(ev, manejador, { passive: true }));
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
          iniciarTemporizador();
        }
      }
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  }, []);

  // NO se borra la sesion en 'beforeunload'. Antes si, y eso cerraba la sesion
  // tambien al refrescar con F5, porque ese evento no distingue entre cerrar la
  // pestana y recargarla. Encima el resultado cambiaba segun el aparato: en
  // Safari de iPhone 'beforeunload' casi no dispara, asi que ahi la sesion
  // sobrevivia y en la computadora no. Ahora la sesion aguanta el refresco en
  // todos lados y lo que la cierra es el contador de INACTIVIDAD_MAXIMA, que se
  // evalua tambien al volver a abrir usando la marca 'lastActivity'.

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
      iniciarTemporizador();
      return true;
    }

    if (role === 'gerencia') {
      const usuarioEscrito = (username || '').trim();
      const claveEscrita = (password || '').trim();
      if (!usuarioEscrito || !claveEscrita) return false;

      // Autenticación REAL contra Supabase. Sin credenciales escritas en el código.
      const correo = usuarioACorreo(usuarioEscrito);
      const { error } = await supabase.auth.signInWithPassword({
        email: correo,
        password: claveEscrita,
      });

      if (error) {
        // Antes esto devolvia false y la pantalla decia "credenciales
        // incorrectas" pasara lo que pasara. Si el correo no estaba confirmado
        // en Supabase, o el usuario no existia, o la cuenta estaba bloqueada por
        // intentos, el mensaje era el mismo y no habia por donde agarrar el
        // problema. El motivo real queda en la consola del navegador.
        console.error('[Auth] Supabase rechazo el login de gerencia:', {
          correo,
          motivo: error.message,
          codigo: error.code ?? error.status,
        });
        return false;
      }

      fijarRolUsuario('gerencia');
      localStorage.setItem('userRole', 'gerencia');
      localStorage.setItem('lastActivity', Date.now().toString());
      limpiarTemporizador();
      iniciarTemporizador();
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
