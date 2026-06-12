import React from 'react';

/**
 * Fondo decorativo: líneas diagonales de texto "LA MUNDIAL" en marquee infinito.
 * Animación 100% CSS (solo transform) para que sea fluida en PC y celular.
 */

const SEP = '  ·  ';
const PHRASE = Array.from({ length: 14 }, () => 'LA MUNDIAL').join(SEP) + SEP;

// Estilos embebidos en el componente: la app no importa archivos CSS
// (usa Tailwind por CDN), asi que esto garantiza que la animacion siempre cargue.
const MARQUEE_CSS = `
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

interface RowSpec {
  rgb: string;
  outlined: boolean;
  reverse: boolean;
  speed: number;
  delay: number;
  opacity: number;
}

// Color y dirección alternados, mezcla de letras rellenas y solo contorno,
// velocidades y fases distintas para que el fondo se sienta vivo y no mecánico.
const ROWS: RowSpec[] = Array.from({ length: 14 }, (_, i) => ({
  rgb: i % 2 === 0 ? VERDE : ROJO,
  outlined: i % 4 === 1 || i % 4 === 2,
  reverse: i % 2 === 1,
  speed: 22 + ((i * 9) % 22),
  delay: -(i * 7),
  opacity: 0.75 + ((i * 3) % 5) * 0.05,
}));

export function DiagonalMarquee() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ contain: 'strict' }}
    >
      <style>{MARQUEE_CSS}</style>

      {/* Capa rotada sobredimensionada para cubrir toda la pantalla en diagonal */}
      <div
        className="absolute flex flex-col justify-evenly"
        style={{
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          transform: 'rotate(-30deg)',
        }}
      >
        {ROWS.map((row, i) => {
          const textStyle: React.CSSProperties = row.outlined
            ? {
                color: 'transparent',
                WebkitTextStroke: `1.5px rgba(${row.rgb}, 0.16)`,
              }
            : {
                color: `rgba(${row.rgb}, 0.10)`,
              };

          return (
            <div
              key={i}
              className="lm-marquee-row"
              style={{
                fontSize: 'clamp(2.1rem, 6vw, 4.2rem)',
                letterSpacing: '0.1em',
                opacity: row.opacity,
                ...textStyle,
              }}
            >
              <div
                className={`lm-marquee-track${row.reverse ? ' lm-reverse' : ''}`}
                style={
                  {
                    '--lm-speed': `${row.speed}s`,
                    '--lm-delay': `${row.delay}s`,
                  } as React.CSSProperties
                }
              >
                <span>{PHRASE}</span>
                <span>{PHRASE}</span>
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
