import React, { useState, useRef, useEffect } from 'react';

export default function DraggableToolbar({ children, className = '', containerStyle = {} }) {
    const [isDragging, setIsDragging] = useState(false);

    // Referências para alta performance (não acionam re-renderização)
    const toolbarRef = useRef(null);
    const currentOffset = useRef({ x: 0, y: 0 });
    const dragStart = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.target.closest('button')) return;

        e.stopPropagation();
        setIsDragging(true);
        dragStart.current = {
            x: e.clientX - currentOffset.current.x,
            y: e.clientY - currentOffset.current.y
        };
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button')) return;

        e.stopPropagation();
        setIsDragging(true);
        dragStart.current = {
            x: e.touches[0].clientX - currentOffset.current.x,
            y: e.touches[0].clientY - currentOffset.current.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !toolbarRef.current) return;
            e.stopPropagation();

            // Calculamos a nova posição
            currentOffset.current = {
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            };

            // Injetamos DIRETAMENTE no DOM (movimento instantâneo, zero lag)
            toolbarRef.current.style.transform = `translate(${currentOffset.current.x}px, ${currentOffset.current.y}px)`;
        };

        const handleTouchMove = (e) => {
            if (!isDragging || !toolbarRef.current) return;
            e.preventDefault(); // Previne que a tela role no mobile enquanto arrasta

            currentOffset.current = {
                x: e.touches[0].clientX - dragStart.current.x,
                y: e.touches[0].clientY - dragStart.current.y
            };

            toolbarRef.current.style.transform = `translate(${currentOffset.current.x}px, ${currentOffset.current.y}px)`;
        };

        const handleMouseUp = (e) => {
            if (isDragging) {
                if (e) e.stopPropagation();
                setIsDragging(false);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    return (
        /* CAMADA EXTERNA: Responsável pela física. Movimenta sem NENHUMA transição/atraso */
        <div
            ref={toolbarRef}
            className={`absolute z-[9999] touch-none ${className}`}
            style={{
                transform: `translate(${currentOffset.current.x}px, ${currentOffset.current.y}px)`,
                ...containerStyle
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={(e) => e.stopPropagation()}
        >
            {/* CAMADA INTERNA: Responsável pela estética. Mantém a transição suave de cor e escala */}
            <div
                className={`
                    p-2 flex flex-col items-center min-w-[120px] rounded-2xl border backdrop-blur-xl
                    transition-all duration-300
                    ${isDragging
                        ? 'cursor-grabbing scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-white/60 dark:bg-black/80 border-white/80 dark:border-black/80'
                        : 'cursor-grab shadow-2xl bg-white/40 dark:bg-black/60 border-white/60 dark:border-black/60'
                    }
                `}
            >
                {children}
            </div>
        </div>
    );
}