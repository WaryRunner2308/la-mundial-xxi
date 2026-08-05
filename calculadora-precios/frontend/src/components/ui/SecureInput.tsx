import React, { useEffect, useLayoutEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';

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

        const handleInputFocus = () => { setIsFocused(true); onFocus?.(); };
        const handleInputBlur  = () => { setIsFocused(false); onBlur?.(); };

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
