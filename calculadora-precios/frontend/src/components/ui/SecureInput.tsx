import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface SecureInputProps {
    value: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    placeholder?: string;
    inputMode?: 'text' | 'decimal' | 'numeric' | 'email' | 'tel';
    className?: string;
    label?: string;
    autoFocus?: boolean;
    editable?: boolean;
    displayClassName?: string;
}

export const SecureInput = forwardRef<HTMLDivElement, SecureInputProps>(
    ({ value, onChange, onFocus, onBlur, placeholder, inputMode = 'text', className = '', label, autoFocus, editable = false, displayClassName = '' }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const inputRef = useRef<HTMLInputElement>(null);
        const displayRef = useRef<HTMLDivElement>(null);

        // Nombre único por montaje para derrotar autocompletado
        const fieldName = useRef<string>(`field_${Math.random().toString(36).substring(2, 15)}`);

        useImperativeHandle(ref, () => containerRef.current!);

        useEffect(() => {
            if (autoFocus && inputRef.current) {
                inputRef.current.focus();
            }
        }, [autoFocus]);

        const handleContainerClick = () => {
            inputRef.current?.focus();
        };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            let newValue = e.target.value;
            if (inputMode === 'decimal') {
                newValue = newValue.replace(/[^0-9.,]/g, '');
                const parts = newValue.split('.');
                if (parts.length > 2) {
                    newValue = parts[0] + '.' + parts.slice(1).join('.');
                }
            } else if (inputMode === 'numeric') {
                newValue = newValue.replace(/[^0-9]/g, '');
            }
            onChange(newValue);
        };

        const handleInputFocus = () => {
            onFocus?.();
        };

        const handleInputBlur = () => {
            onBlur?.();
        };

        const handleDisplayFocus = () => {
            inputRef.current?.focus();
            onFocus?.();
        };

        const handleDisplayInput = (e: React.FormEvent<HTMLDivElement>) => {
            e.preventDefault();
            inputRef.current?.focus();
        };

        // Sincronizar valor visual
        useEffect(() => {
            if (displayRef.current && displayRef.current.textContent !== value) {
                displayRef.current.textContent = value;
            }
        }, [value]);

        return (
            <div
                ref={containerRef}
                onClick={handleContainerClick}
                className={`w-full relative ${className}`}
            >
                {label && (
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                        {label}
                    </span>
                )}

                {/* Input invisible de 1px para capturar teclado */}
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
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    style={{
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        width: '1px',
                        height: '1px',
                        opacity: 0,
                        zIndex: 0,
                        pointerEvents: 'auto',
                    }}
                    data-lpignore="true"
                    data-1p-ignore="true"
                />

                {/* Elemento visible */}
                {editable ? (
                    <div
                        ref={displayRef}
                        contentEditable
                        suppressContentEditableWarning
                        onFocus={handleDisplayFocus}
                        onInput={handleDisplayInput}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base min-h-[48px] bg-white ${displayClassName}`}
                        style={{ outline: 'none', pointerEvents: 'auto', userSelect: 'text' }}
                        {...(placeholder && !value ? { 'data-placeholder': placeholder } : {})}
                    />
                ) : (
                    <div
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-base min-h-[48px] flex items-center ${value ? 'text-gray-900' : 'text-gray-400'} ${displayClassName}`}
                    >
                        {value || placeholder}
                    </div>
                )}

                {/* CSS anti-autofill */}
                <style>{`
                    input:-webkit-autofill,
                    input:-webkit-autofill:hover,
                    input:-webkit-autofill:focus,
                    input:-webkit-autofill:active,
                    input:-webkit-autofill::first-line,
                    input:-webkit-autofill::before {
                        -webkit-text-fill-color: transparent !important;
                        color: transparent !important;
                        background: transparent !important;
                        transition: background-color 5000s ease-in-out 0s !important;
                    }
                    div[contenteditable]:empty:before {
                        content: attr(data-placeholder);
                        color: #9ca3af;
                        pointer-events: none;
                    }
                `}</style>
            </div>
        );
    }
);

SecureInput.displayName = 'SecureInput';
