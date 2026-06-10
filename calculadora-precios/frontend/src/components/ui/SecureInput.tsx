import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';

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
        const displayRef = useRef<HTMLDivElement>(null);
        const [isFocused, setIsFocused] = useState(false);

        const fieldName = useRef<string>(`field_${Math.random().toString(36).substring(2, 15)}`);

        useImperativeHandle(ref, () => containerRef.current!);

        useEffect(() => {
            if (autoFocus && inputRef.current) {
                inputRef.current.focus();
            }
        }, [autoFocus]);

        const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
            if (inputRef.current) {
                if (e.pointerType === 'touch') {
                    e.preventDefault();
                }
                e.stopPropagation();
                inputRef.current.focus();
                requestAnimationFrame(() => {
                    if (inputRef.current) {
                        const len = inputRef.current.value.length;
                        inputRef.current.setSelectionRange(len, len);
                    }
                });
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

            const newCursor = Math.max(0, cursorBefore + (newValue.length - lengthBefore));
            onChange(newValue);

            requestAnimationFrame(() => {
                if (inputRef.current) {
                    inputRef.current.setSelectionRange(newCursor, newCursor);
                }
            });
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

        useEffect(() => {
            if (displayRef.current && displayRef.current.textContent !== value) {
                displayRef.current.textContent = value;
            }
        }, [value]);

        return (
            <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                className={`w-full relative ${className}`}
                style={{ touchAction: 'manipulation' }}
            >
                {label && (
                    <span className="block text-sm font-medium text-[#8b949e] mb-2">{label}</span>
                )}

                {/* Invisible real input */}
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
                        zIndex: 9999,
                        margin: 0,
                        padding: '0.75rem 1rem',
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

                {/* Visible display element */}
                {editable ? (
                    <div
                        ref={displayRef}
                        contentEditable
                        suppressContentEditableWarning
                        className={`
                            w-full px-4 py-3 border border-white/10 rounded-lg
                            ${noRing ? '' : isFocused ? 'ring-2 ring-[#009A3A]/40 border-[#009A3A]/40' : ''}
                            outline-none transition text-base min-h-[48px] bg-[#1c2128] text-[#e6edf3]
                            ${displayClassName}
                        `}
                        style={{ position: 'relative', zIndex: 1, userSelect: 'text', WebkitUserSelect: 'text' }}
                        {...(placeholder && !value ? { 'data-placeholder': placeholder } : {})}
                    />
                ) : (
                    <div
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
                    div[contenteditable]:empty:before {
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
