// /*
//  * Modal genérico de confirmação.
//  */

// import './styles.css';
// import { useEffect, useRef } from 'react';
// import { AlertTriangle } from 'lucide-react';

// // Confirmação
// const ConfirmModal = ({ title, message, onConfirm, onCancel }) => {
//     const overlayRef = useRef(null);

//     // Foca o overlay ao montar para capturar eventos de teclado localmente
//     useEffect(() => {
//         overlayRef.current?.focus();
//     }, []);

//     const handleKeyDown = (e) => {
//         if (e.key === 'Escape') {
//             e.stopPropagation();
//             onCancel();
//         }

//         if (e.key === 'Enter') {
//             e.stopPropagation();
//             onConfirm();
//         }
//     };
//     const mountTime = useRef(Date.now());

//     const handleOverlayClick = (e) => {
//         if (e.target !== e.currentTarget) return;
//         if (Date.now() - mountTime.current < 250) return;
//         onCancel();
//     };

//     return (
//         <div
//             className="confirm-overlay"
//             onClick={handleOverlayClick}
//             onKeyDown={handleKeyDown}
//             tabIndex={-1}
//             ref={overlayRef}
//         >
//             <div className="confirm-card">

//                 {/* Título com Ícone de Alerta */}
//                 <h3 className="confirm-title">
//                     <AlertTriangle size={20} className="icon-warning" />
//                     {title}
//                 </h3>

//                 {/* Mensagem do Corpo */}
//                 <p className="confirm-message">{message}</p>

//                 {/* Botões de Ação */}
//                 <div className="confirm-actions">
//                     <button onClick={onCancel} className="btn-cancel">
//                         Cancelar
//                     </button>
//                     <button onClick={onConfirm} className="btn-confirm-danger">
//                         Confirmar
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default ConfirmModal;

import React, { useState } from 'react';
import './styles.css';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ onClose, onConfirm, title, message, requireTextMatch }) => {
    const [inputValue, setInputValue] = useState('');

    const isConfirmDisabled = requireTextMatch 
        ? inputValue.trim() !== requireTextMatch.trim() 
        : false;

    return (
        <div className="confirm-overlay">
            <div className="confirm-card">
                
                {/* Cabeçalho e Texto */}
                <div>
                    <h3 className="confirm-title">
                        <AlertTriangle size={24} className="icon-warning" />
                        {title}
                    </h3>
                    <p className="confirm-message">
                        {message}
                    </p>
                </div>

                {/* --- MÓDULO DE SEGURANÇA TEXTUAL --- */}
                {requireTextMatch && (
                    <div className="p-4 bg-black/5 dark:bg-black/40 border border-gray-200/50 dark:border-gray-700/50 rounded-xl backdrop-blur-md">
                        <p className="text-xs text-gray-700 dark:text-gray-300 mb-2 font-medium">
                            Para confirmar, digite <strong className='text-red-500'>{requireTextMatch}</strong> no campo abaixo:
                        </p>
                        <input
                            type="text"
                            value={inputValue}
                            autoFocus
                            onChange={(e) => setInputValue(e.target.value)}
                            onPaste={(e) => e.preventDefault()}
                            placeholder={requireTextMatch}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white/70 dark:bg-gray-900/70 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder-gray-600"
                        />
                    </div>
                )}

                {/* Botões */}
                <div className="confirm-actions">
                    <button
                        onClick={onClose}
                        className="btn-cancel"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            if (!isConfirmDisabled) {
                                onConfirm();
                                if (onClose) onClose();
                            }
                        }}
                        disabled={isConfirmDisabled}
                        // Se estiver desativado, injeta opacidade e corta eventos
                        className={`btn-confirm-danger ${
                            isConfirmDisabled ? 'opacity-50 cursor-not-allowed saturate-0' : ''
                        }`}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;