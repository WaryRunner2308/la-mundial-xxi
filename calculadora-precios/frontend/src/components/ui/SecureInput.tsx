import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

// Generate unique field identifier to prevent Chrome from matching against history
function generateFieldId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

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
}

export const SecureInput = forwardRef<HTMLDivElement, SecureInputProps>(
    ({ value, onChange, onFocus, onBlur, placeholder, inputMode = 'text', className = '', label, autoFocus }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const inputRef = useRef<HTMLInputElement>(null);
        const [fieldId] = useState(() => generateFieldId('secure'));

        useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

        // Handle focus from external ref
        useEffect(() => {
            if (autoFocus && inputRef.current) {
                inputRef.current.focus();
            }
        }, [autoFocus]);

        const handleContainerClick = () => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            let newValue = e.target.value;
            // Apply input mode restrictions
            if (inputMode === 'decimal' || inputMode === 'numeric') {
                newValue = newValue.replace(/[^0-9.,]/g, '');
                const parts = newValue.split('.');
                if (parts.length > 2) {
                    newValue = parts[0] + '.' + parts.slice(1).join('');
                }
            } else if (inputMode === 'numeric') {
                newValue = newValue.replace(/[^0-9]/g, '');
            }
            onChange(newValue);
        };

        const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            onFocus?.();
        };

        const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            onBlur?.();
        };

        // Prevent default browser autocomplete behaviors
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
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        // Unique autocomplete value prevents Chrome from matching history
                        autoComplete={`new-${fieldId}`}
                        inputMode={inputMode}
                        // Additional prevention
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        // Random name each render
                        name={fieldId}
                        id={fieldId}
                        value={value}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder={placeholder}
                        // Hide the actual input but keep it functional
                        className="absolute opacity-0 pointer-events-none w-px h-px overflow-hidden"
                        style={{
                            position: 'absolute',
                            left: '-9999px',
                            top: 0,
                            width: '1px',
                            height: '1px',
                            opacity: 0,
                            pointerEvents: 'none'
                        }}
                    />
                    {/* Visual display - controlled via CSS to prevent autocomplete */}
                    <div
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base min-h-[48px] bg-white"
                        style={{ outline: 'none' }}
                        onClick={handleContainerClick}
                    >
                        {value || <span className="text-gray-400">{placeholder}</span>}
                    </div>
                </div>

                {/* CSS to prevent autofill styling and popup */}
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
          div:-webkit-autofill-preview {
            opacity: 0 !important;
          }
        `}</style>
            </div>
        );
    }
);

SecureInput.displayName = 'SecureInput';

// Simplified version for forms with editable display
interface SecureEditableInputProps {
    value: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
    inputMode?: 'text' | 'decimal' | 'numeric';
    className?: string;
    displayClassName?: string;
    placeholder?: string;
    suppressAutofill?: boolean;
}

export const SecureEditableInput = forwardRef<HTMLDivElement, SecureEditableInputProps>(
    ({ value, onChange, onFocus, inputMode = 'text', className = '', displayClassName = '', placeholder }, ref) => {
        const displayRef = useRef<HTMLDivElement>(null);
        const inputRef = useRef<HTMLInputElement>(null);
        const [fieldId] = useState(() => generateFieldId('edit'));
        const [displayValue, setDisplayValue] = useState(value);

        useImperativeHandle(ref, () => displayRef.current as HTMLDivElement);

        // Sync display value with prop
        useEffect(() => {
            setDisplayValue(value);
            if (displayRef.current && displayRef.current.textContent !== value) {
                displayRef.current.textContent = value;
            }
        }, [value]);

        const handleFocus = () => {
            // Redirect focus to hidden input
            if (inputRef.current) {
                inputRef.current.focus();
            }
            onFocus?.();
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

            setDisplayValue(newValue);
            onChange(newValue);

            // Update visual display
            if (displayRef.current) {
                displayRef.current.textContent = newValue;
            }
        };

        // Handle input blur to keep display synced
        const handleInputBlur = () => {
            if (displayRef.current && value) {
                displayRef.current.textContent = value;
            }
        };

        return (
            <>
                {/* Hidden input that captures all input events */}
                <input
                    ref={inputRef}
                    type="text"
                    autoComplete={`new-${fieldId}`}
                    inputMode={inputMode === 'decimal' ? 'decimal' : inputMode}
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    name={fieldId}
                    id={fieldId}
                    value={value}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="sr-only"
                    style={{
                        position: 'absolute',
                        width: '1px',
                        height: '1px',
                        padding: 0,
                        margin: '-1px',
                        overflow: 'hidden',
                        clip: 'rect(0, 0, 0, 0)',
                        whiteSpace: 'nowrap',
                        border: 0
                    }}
                />

                {/* Visual display using contentEditable */}
                <div
                    ref={displayRef}
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={handleFocus}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base min-h-[48px] bg-white ${displayClassName}`}
                    style={{
                        outline: 'none',
                        // Prevent any browser handling
                        pointerEvents: 'auto'
                    }}
                    {...(placeholder && !value ? { 'data-placeholder': placeholder } : {})}
                />

                <style>{`
          div[contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
          /* Kill autofill */
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-text-fill-color: transparent !important;
            color: transparent !important;
            background: transparent !important;
            transition: background-color 5000s ease-in-out 0s !important;
          }
        `}</style>
            </>
        );
    }
);

SecureEditableInput.displayName = 'SecureEditableInput';
