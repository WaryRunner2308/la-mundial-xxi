import React, { useEffect } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title = 'Confirmación',
  message,
  confirmText = 'Sí, cancelar',
  cancelText = 'Continuar editando',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    // Force keyboard dismissal on mobile when modal opens
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .animate-fade-in {
        animation: fadeIn 0.2s ease-out;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [isOpen]);

   if (!isOpen) return null;

   return (
     <div
       className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
       onClick={onCancel}
     >
       <div
         className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-fade-in"
         onClick={(e) => e.stopPropagation()}
       >
         {/* Icono de advertencia */}
         <div className="flex justify-center mb-4">
           <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
               <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
               <path d="M12 9v4"/>
               <path d="M12 17h.01"/>
             </svg>
           </div>
         </div>

         <h3 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-2">{title}</h3>
         <p className="text-gray-600 text-center mb-6">{message}</p>

         <div className="flex gap-3">
           <button
             onClick={onCancel}
             className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
           >
             {cancelText}
           </button>
           <button
             onClick={onConfirm}
             className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg transition"
           >
             {confirmText}
           </button>
         </div>
       </div>
     </div>
   );
}
