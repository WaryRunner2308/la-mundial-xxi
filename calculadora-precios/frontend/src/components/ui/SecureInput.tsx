import React, { useEffect, useLayoutEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';

// ============================================================================
//  Control de la escala de la página al editar campos.
//
//  Problema: en iOS, Safari hace zoom al enfocar un input con letra menor a
//  16px. Aquí el input hereda el tamaño del div visible (lo copia el
//  useLayoutEffect de abajo) y en las tablas ese div es de 14px, así que el zoom
//  ocurría siempre.
//
//  Se intentó deshacer el zoom AL SALIR del campo, y fue peor: rescalar mueve el
//  scroll, así que al terminar de editar la pantalla saltaba y la fila que se
//  estaba editando aparecía en otro sitio.
//
//  Enfoque actual: impedir el zoom ANTES de que el campo reciba el foco. Si el
//  zoom nunca ocurre, no hay nada que deshacer y la pantalla no se mueve. La
//  escala se libera al salir, para no dejar la app sin pinch-zoom.
// ============================================================================

// Contenido original del viewport mientras hay un campo en edición
let viewportOriginal: string | null = null;
// Liberación pendiente: al pasar de un campo a otro, el blur del anterior llega
// DESPUÉS del pointerdown del nuevo. Sin esta espera se liberaría la escala en
// medio del cambio y el zoom se colaría.
let liberacionPendiente: number | null = null;

function fijarEscala() {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    if (liberacionPendiente !== null) {
        window.clearTimeout(liberacionPendiente);
        liberacionPendiente = null;
    }
    if (viewportOriginal === null) viewportOriginal = meta.getAttribute('content');
    meta.setAttribute('content', `${viewportOriginal ?? 'width=device-width, initial-scale=1.0'}, maximum-scale=1.0`);
}

function liberarEscala() {
    if (viewportOriginal === null) return;
    liberacionPendiente = window.setTimeout(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        if (meta && viewportOriginal !== null) meta.setAttribute('content', viewportOriginal);
        viewportOriginal = null;
        liberacionPendiente = null;
    }, 250);
}

interface SecureInputProps {
    value: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onSubmit?: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string;
    inputMode?: 'text' | 'decimal' | 'numeric' | 'email' | 'tel';
    className?: string;
    label?: string;
    autoFocus?: boolean;
    editable?: boolean;
    displayClassName?: string;
    noRing?: boolean;
}

export const SecureInput = forwardRef<HTMLDivElement, SecureInputProps>(
    ({ value, onChange, onFocus, onBlur, onSubmit, onKeyDown, placeholder, inputMode = 'text', className = '', label, autoFocus, editable = false, displayClassName = '', noRing = false }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const inputRef = useRef<HTMLInputElement>(null);

        // displayRef: solo para el div contenteditable (sincroniza textContent)
        const displayRef = useRef<HTMLDivElement | null>(null);
        // visibleRef: apunta al div visible activo (editable o estático) — usado para sincronizar padding
        const visibleRef = useRef<HTMLDivElement | null>(null);

        const [isFocused, setIsFocused] = useState(false);
        // Cursor deseado tras cada onChange — restaurado en useLayoutEffect antes del paint
        const savedCursor = useRef<number | null>(null);

        const fieldName = useRef<string>(`field_${Math.random().toString(36).substring(2, 15)}`);

        useImperativeHandle(ref, () => containerRef.current!);

        useEffect(() => {
            if (autoFocus && inputRef.current) {
                inputRef.current.focus();
            }
        }, [autoFocus]);

        const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
            if (!inputRef.current) return;
            // Antes del foco: es el único momento en que Safari respeta el
            // maximum-scale y decide no hacer zoom.
            fijarEscala();
            if (e.pointerType === 'touch') {
                // En touch: prevenir default + foco + cursor al final (comportamiento esperado en móvil)
                e.preventDefault();
                inputRef.current.focus();
                requestAnimationFrame(() => {
                    if (inputRef.current) {
                        const len = inputRef.current.value.length;
                        inputRef.current.setSelectionRange(len, len);
                    }
                });
            } else {
                // En mouse: el input (z-index:9999) recibe el click directamente,
                // el browser posiciona el cursor donde se hizo clic. Solo evitamos propagación.
                e.stopPropagation();
            }
        }, []);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const input = e.target;
            const cursorBefore = input.selectionStart ?? input.value.length;
            const lengthBefore = input.value.length;

            let newValue = input.value;
            if (inputMode === 'decimal') {
                newValue = newValue.replace(/[^0-9.,]/g, '');
                const parts = newValue.split('.');
                if (parts.length > 2) {
                    newValue = parts[0] + '.' + parts.slice(1).join('.');
                }
            } else if (inputMode === 'numeric') {
                newValue = newValue.replace(/[^0-9]/g, '');
            }

            // Guardamos posición de cursor ANTES del re-render.
            // useLayoutEffect la restaura sincrónicamente (antes del paint) para que no haya
            // ningún frame visible con el cursor en posición incorrecta.
            const newCursor = Math.max(0, cursorBefore + (newValue.length - lengthBefore));
            savedCursor.current = newCursor;
            onChange(newValue);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onSubmit?.();
            }
            onKeyDown?.(e);
        };

        // También al enfocar, no solo al tocar: cubre el foco por teclado (Tab) y
        // el autoFocus, donde no hay pointerdown.
        const handleInputFocus = () => { fijarEscala(); setIsFocused(true); onFocus?.(); };
        const handleInputBlur  = () => { setIsFocused(false); liberarEscala(); onBlur?.(); };

        // Sincroniza el contenido del div contenteditable con el value prop
        useEffect(() => {
            if (displayRef.current && displayRef.current.textContent !== value) {
                displayRef.current.textContent = value;
            }
        }, [value]);

        // Sincroniza el padding del input invisible con el del div visible, y restaura el cursor.
        // Sin deps array: corre tras cada render.
        //
        // CAUSA RAÍZ del bug: el input tiene padding-left: 1rem (16px) fijo, pero displayClassName
        // puede cambiar el padding del div visible (ej: pl-9 = 36px para el buscador con ícono).
        // El cursor (del input) quedaría 20px a la izquierda del texto → parece "estar en el medio".
        // Solución: leer el paddingLeft computado del div visible y aplicarlo al input en cada render.
        useLayoutEffect(() => {
            if (inputRef.current && visibleRef.current) {
                const cs = window.getComputedStyle(visibleRef.current);
                inputRef.current.style.paddingLeft  = cs.paddingLeft;
                inputRef.current.style.paddingRight = cs.paddingRight;
                inputRef.current.style.paddingTop    = cs.paddingTop;
                inputRef.current.style.paddingBottom = cs.paddingBottom;
                // El caret vive en el input invisible: si su tipografía o alineación no
                // coinciden con el div visible (ej: !text-center !text-xs en la tabla),
                // el caret aparece desplazado y "salta" al escribir. Igualamos todo.
                inputRef.current.style.textAlign     = cs.textAlign;
                inputRef.current.style.fontSize      = cs.fontSize;
                inputRef.current.style.fontFamily    = cs.fontFamily;
                inputRef.current.style.fontWeight    = cs.fontWeight;
                inputRef.current.style.letterSpacing = cs.letterSpacing;
                inputRef.current.style.lineHeight    = cs.lineHeight;
            }
            // Restaura posición de cursor después del commit de React, antes del paint
            if (inputRef.current && savedCursor.current !== null) {
                inputRef.current.setSelectionRange(savedCursor.current, savedCursor.current);
                savedCursor.current = null;
            }
        });

        return (
            <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                className={`w-full relative ${className}`}
                style={{ touchAction: 'manipulation' }}
            >
                {label && (
                    <label htmlFor={fieldName.current} className="block text-sm font-medium text-[#8b949e] mb-2">{label}</label>
                )}

                {/* Input invisible: recibe el input real, muestra solo el caret */}
                <input
                    ref={inputRef}
                    type="text"
                    inputMode={inputMode === 'decimal' ? 'decimal' : inputMode}
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    name={fieldName.current}
                    id={fieldName.current}
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    style={{
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        width: '100%',
                        height: '100%',
                        // Solo tiene que quedar encima de su propio div visible (z-index 1).
                        // Con 9999 se elevaba por encima de TODA la app: el buscador seguía
                        // recibiendo toques y pintando el caret por encima del sidebar y de
                        // los modales, porque el contenedor relative no crea contexto de
                        // apilamiento propio y el 9999 competía en la raíz.
                        zIndex: 2,
                        margin: 0,
                        padding: '0.75rem 1rem', // punto de partida; useLayoutEffect lo sobreescribe con el del div visible
                        border: '1px solid transparent',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: 'transparent',
                        caretColor: '#009A3A',
                        fontSize: '16px',
                        lineHeight: '1.5',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box' as const,
                        pointerEvents: 'auto',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                    data-lpignore="true"
                    data-1p-ignore="true"
                />

                {/* Div visible: muestra el texto formateado.
                    NO es contentEditable: en iOS un contentEditable puede robar el foco
                    (toque largo / doble tap), lo que abría el teclado de letras y
                    duplicaba el caret. La edición real vive solo en el input invisible. */}
                {editable ? (
                    <div
                        ref={(el) => {
                            // Asignar a ambos refs: displayRef para sync de textContent,
                            // visibleRef para sync de padding con el input real
                            displayRef.current = el;
                            visibleRef.current = el;
                        }}
                        data-secure-display
                        className={`
                            w-full px-4 py-3 border border-white/10 rounded-lg
                            ${noRing ? '' : isFocused ? 'ring-2 ring-[#009A3A]/40 border-[#009A3A]/40' : ''}
                            outline-none transition text-base min-h-[48px] bg-[#1c2128] text-[#e6edf3]
                            ${displayClassName}
                        `}
                        style={{ position: 'relative', zIndex: 1, userSelect: 'none', WebkitUserSelect: 'none' }}
                        {...(placeholder && !value ? { 'data-placeholder': placeholder } : {})}
                    />
                ) : (
                    <div
                        ref={visibleRef}
                        className={`
                            w-full px-4 py-3 border border-white/10 rounded-lg bg-[#1c2128]
                            text-base min-h-[48px] flex items-center
                            ${value ? 'text-[#e6edf3]' : 'text-[#484f58]'}
                            ${!noRing && isFocused ? 'ring-2 ring-[#009A3A]/40 border-[#009A3A]/40' : ''}
                            ${displayClassName}
                        `}
                        style={{ position: 'relative', zIndex: 1 }}
                    >
                        {value || placeholder}
                    </div>
                )}

                <style>{`
                    input:-webkit-autofill,
                    input:-webkit-autofill:hover,
                    input:-webkit-autofill:focus,
                    input:-webkit-autofill:active {
                        -webkit-text-fill-color: transparent !important;
                        color: transparent !important;
                        background: transparent !important;
                        transition: background-color 5000s ease-in-out 0s !important;
                    }
                    div[data-secure-display]:empty:before {
                        content: attr(data-placeholder);
                        color: #484f58;
                        pointer-events: none;
                    }
                `}</style>
            </div>
        );
    }
);

SecureInput.displayName = 'SecureInput';
