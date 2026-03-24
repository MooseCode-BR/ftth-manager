// src/components/ImageViewer.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import LoadingFiber from '../../assets/loadingfiber';

const ImageViewer = ({ photos, initialIndex = 0, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isLoading, setIsLoading] = useState(true);

    // Garante que o índice é válido
    if (!photos || photos.length === 0) return null;

    const currentPhoto = photos[currentIndex];

    // Navegação
    const handleNext = useCallback(() => {
        setIsLoading(true);
        setCurrentIndex((prev) => (prev + 1) % photos.length); // Loop infinito
    }, [photos.length]);

    const handlePrev = useCallback(() => {
        setIsLoading(true);
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length); // Loop infinito reverso
    }, [photos.length]);

    // Teclado (Setas e ESC)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, handleNext, handlePrev]);

    const mountTime = useRef(Date.now());
    const handleOverlayClick = (e) => {
        if (Date.now() - mountTime.current < 250) return;
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">

            {/* Botão Fechar */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 p-2 rounded-full transition-colors z-50"
            >
                <X size={28} />
            </button>

            {/* Botão Download (Opcional, útil já que tiramos o link direto) */}
            {/* <a
                href={currentPhoto.url}
                download
                target="_blank"
                rel="noreferrer"
                className="absolute top-4 right-20 text-white/70 hover:text-white bg-black/50 p-2 rounded-full transition-colors z-50"
                title="Abrir original / Baixar"
                onClick={(e) => e.stopPropagation()} // Evita fechar se clicar aqui
            >
                <Download size={28} />
            </a> */}

            {/* Área da Imagem Central */}
            <div className="relative w-full h-full flex items-center justify-center p-4" onClick={handleOverlayClick}>
                {/* Loader enquanto carrega a alta resolução */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LoadingFiber size={150} />
                    </div>
                )}

                <img
                    src={currentPhoto.url}
                    alt="Visualização"
                    className={`max-w-full max-h-full object-contain shadow-2xl transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsLoading(false)}
                    onClick={(e) => e.stopPropagation()} // Clicar na imagem não fecha
                />

                {/* Contador de Fotos */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-1 rounded-full text-white text-sm font-medium">
                    {currentIndex + 1} / {photos.length}
                </div>

                {/* Data/Nome da Foto (se houver) */}
                <div className="absolute bottom-6 left-6 text-white/80 text-xs">
                    {new Date(parseInt(currentPhoto.createdAt || Date.now())).toLocaleDateString()}
                </div>
            </div>

            {/* Seta Esquerda (Só mostra se tiver mais de 1 foto) */}
            {photos.length > 1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/20 hover:bg-black/50 p-3 rounded-full transition-all"
                >
                    <ChevronLeft size={40} />
                </button>
            )}

            {/* Seta Direita */}
            {photos.length > 1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/20 hover:bg-black/50 p-3 rounded-full transition-all"
                >
                    <ChevronRight size={40} />
                </button>
            )}
        </div>
    );
};

export default ImageViewer;