import React, { useState, useRef, useEffect } from 'react';

export default function DraggableToolbar({ children, className = '', containerStyle = {} }) {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.target.closest('button')) return; // Ignore button clicks

        e.stopPropagation();
        setIsDragging(true);
        dragStart.current = {
            x: e.clientX - offset.x,
            y: e.clientY - offset.y
        };
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('button')) return;

        e.stopPropagation();
        setIsDragging(true);
        dragStart.current = {
            x: e.touches[0].clientX - offset.x,
            y: e.touches[0].clientY - offset.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            e.stopPropagation();
            setOffset({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        };

        const handleTouchMove = (e) => {
            if (!isDragging) return;
            setOffset({
                x: e.touches[0].clientX - dragStart.current.x,
                y: e.touches[0].clientY - dragStart.current.y
            });
        };

        const handleMouseUp = (e) => {
            if (isDragging) {
                e.stopPropagation();
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
        <div
            className={`cursor-grab bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600 p-1 flex flex-col items-center min-w-[120px] transition-shadow ${isDragging ? 'shadow-2xl cursor-grabbing opacity-90 scale-105' : ''} ${className}`}
            style={{
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                touchAction: 'none',
                opacity: 1, // Fix animation issues if any
                ...containerStyle
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    );
}
