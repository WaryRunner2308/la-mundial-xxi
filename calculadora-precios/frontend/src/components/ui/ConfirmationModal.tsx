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
       className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
       onClick={onCancel}
     >
       <div
         className="bg-white border border-[#e4ede6] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl animate-fade-in"
         onClick={(e) => e.stopPropagation()}
       >
         {/* Portugal flag strip */}
         <div className="flex h-[3px] rounded-full overflow-hidden mb-6">
           <div className="bg-[#009A3A]" style={{ flex: 2 }} />
           <div className="bg-[#C8102E]" style={{ flex: 3 }} />
         </div>

         <div className="flex justify-center mb-4">
           <div className="w-14 h-14 rounded-full bg-[#fde8ec] border border-[#C8102E]/15 flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#C8102E]">
               <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
               <path d="M12 9v4"/>
               <path d="M12 17h.01"/>
             </svg>
           </div>
         </div>

         <h3
           className="font-black text-[#0d1f14] text-center mb-2 uppercase tracking-wide"
           style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.3rem', letterSpacing: '0.06em' }}
         >
           {title}
         </h3>
         <p className="text-[#7aaa8a] text-center mb-6 text-sm leading-relaxed">{message}</p>

         <div className="flex gap-3">
           <button
             onClick={onCancel}
             className="flex-1 px-4 py-3 border border-[#e4ede6] rounded-xl font-semibold text-[#3d6b4f] hover:bg-[#f5f8f5] hover:text-[#0d1f14] transition text-sm"
           >
             {cancelText}
           </button>
           <button
             onClick={onConfirm}
             className="flex-1 px-4 py-3 bg-[#C8102E] hover:bg-[#a00d25] text-white font-bold rounded-xl shadow-lg transition text-sm"
             style={{ fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.06em', fontSize: '0.95rem' }}
           >
             {confirmText}
           </button>
         </div>
       </div>
     </div>
   );
}
