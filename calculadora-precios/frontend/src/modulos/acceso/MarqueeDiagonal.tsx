import React from 'react';

/**
 * Fondo decorativo: líneas diagonales de texto "LA MUNDIAL" en marquee infinito.
 * Animación 100% CSS (solo transform) para que sea fluida en PC y celular.
 */

const SEP = '  ·  ';

// Estilos embebidos en el componente: la app no importa archivos CSS
// (usa Tailwind por CDN), asi que esto garantiza que la animacion siempre cargue.
const CSS_MARQUEE = `
@keyframes lmMarqueeScroll {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
.lm-marquee-row {
  display: flex;
  white-space: nowrap;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  line-height: 1;
  user-select: none;
  pointer-events: none;
}
.lm-marquee-track {
  display: flex;
  flex-shrink: 0;
  animation: lmMarqueeScroll var(--lm-speed, 60s) linear infinite;
  animation-delay: var(--lm-delay, 0s);
  will-change: transform;
  backface-visibility: hidden;
}
.lm-marquee-track.lm-reverse {
  animation-direction: reverse;
}
`;

const VERDE = '0,154,58';
const ROJO = '200,16,46';

interface EspecificacionFila {
  rgb: string;
  contorneado: boolean;
  alReves: boolean;
  velocidad: number;
  retraso: number;
  opacity: number;
}

// Color y dirección alternados, mezcla de letras rellenas y solo contorno,
// velocidades y fases distintas para que el fondo se sienta vivo y no mecánico.
const FILAS: EspecificacionFila[] = Array.from({ length: 14 }, (_, i) => ({
  rgb: i % 2 === 0 ? VERDE : ROJO,
  contorneado: i % 4 === 1 || i % 4 === 2,
  alReves: i % 2 === 1,
  velocidad: 30 + ((i * 9) % 23),
  retraso: -(i * 7),
  opacity: 0.75 + ((i * 3) % 5) * 0.05,
}));

interface PropsMarqueeDiagonal {
  /** Palabra que se repite en las líneas */
  palabra?: string;
  /** Ángulo de las líneas: -30 = diagonal (landing), 0 = horizontal */
  angulo?: number;
  /** true = capa fija al viewport (fondo de la app); false = absoluta al contenedor */
  fijo?: boolean;
}

export function MarqueeDiagonal({ palabra = 'LA MUNDIAL', angulo = -30, fijo = false }: PropsMarqueeDiagonal) {
  const frase = React.useMemo(
    () => Array.from({ length: 14 }, () => palabra).join(SEP) + SEP,
    [palabra],
  );

  return (
    <div
      aria-hidden="true"
      className={`${fijo ? 'fixed' : 'absolute'} inset-0 overflow-hidden pointer-events-none select-none`}
      style={{ contain: 'strict' }}
    >
      <style>{CSS_MARQUEE}</style>

      {/* Capa rotada sobredimensionada para cubrir toda la pantalla en diagonal */}
      <div
        className="absolute flex flex-col justify-evenly"
        style={{
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          transform: `rotate(${angulo}deg)`,
        }}
      >
        {FILAS.map((fila, i) => {
          const estiloTexto: React.CSSProperties = fila.contorneado
            ? {
                color: 'transparent',
                WebkitTextStroke: `1.5px rgba(${fila.rgb}, 0.16)`,
              }
            : {
                color: `rgba(${fila.rgb}, 0.10)`,
              };

          return (
            <div
              key={i}
              className="lm-marquee-row"
              style={{
                fontSize: 'clamp(2.9rem, 7vw, 4.2rem)',
                letterSpacing: '0.1em',
                opacity: fila.opacity,
                ...estiloTexto,
              }}
            >
              <div
                className={`lm-marquee-track${fila.alReves ? ' lm-reverse' : ''}`}
                style={
                  {
                    '--lm-speed': `${fila.velocidad}s`,
                    '--lm-delay': `${fila.retraso}s`,
                  } as React.CSSProperties
                }
              >
                <span>{frase}</span>
                <span>{frase}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Viñeta central: oscurece el centro para que logo y tarjetas respiren */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(13,17,23,0.72) 0%, rgba(13,17,23,0.35) 55%, rgba(13,17,23,0.05) 100%)',
        }}
      />
    </div>
  );
}
