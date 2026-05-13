// src/hooks/usePopover.js
import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';

/**
 * Hook customizado para gerenciar estado e posicionamento inteligente de Popovers.
 * @param {number} defaultWidth - Largura estimada do popover caso o ref ainda não esteja pronto.
 * @param {number} defaultHeight - Altura estimada do popover caso o ref ainda não esteja pronto.
 * @returns {Object} Contém estados e funções para controlar o popover (isOpen, toggle, close, portalPos, btnRef, portalRef).
 */
const usePopover = (defaultWidth = 290, defaultHeight = 180) => {
    const [isOpen, setIsOpen] = useState(false);
    const [portalPos, setPortalPos] = useState({ top: 0, left: 0 });

    // As referências agora nascem dentro do hook e são exportadas para o componente
    const btnRef = useRef(null);
    const portalRef = useRef(null);

    // Função para alternar entre aberto/fechado
    const toggle = useCallback((e) => {
        if (e) e.stopPropagation();
        setIsOpen((prev) => !prev);
    }, []);

    // Função para forçar o fechamento
    const close = useCallback(() => setIsOpen(false), []);

    // Lógica principal de cálculo de posição
    const updatePosition = useCallback(() => {
        if (!btnRef.current) return;

        const rect = btnRef.current.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollX = window.scrollX || window.pageXOffset;

        const popoverWidth = portalRef.current ? portalRef.current.offsetWidth : defaultWidth;
        const popoverHeight = portalRef.current ? portalRef.current.offsetHeight : defaultHeight;

        let top = rect.bottom + scrollY + 8;
        let left = rect.left + scrollX + (rect.width / 2);

        // Prevenção de quebra de layout lateral
        if (left + popoverWidth / 2 > window.innerWidth) {
            left = window.innerWidth - popoverWidth / 2 - 16;
        } else if (left - popoverWidth / 2 < 0) {
            left = popoverWidth / 2 + 16;
        }

        // Prevenção de quebra de layout vertical (bottom)
        if (top + popoverHeight > window.innerHeight + scrollY) {
            top = rect.top + scrollY - popoverHeight - 8;
        }

        setPortalPos({ top, left });
    }, [defaultWidth, defaultHeight]);

    // Calcular posição antes da pintura da tela
    useLayoutEffect(() => {
        if (isOpen) updatePosition();
    }, [isOpen, updatePosition]);

    // Ouvintes de eventos: clique fora, scroll e redimensionamento
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (
                portalRef.current && !portalRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) {
                close();
            }
        };

        let ticking = false;
        const handleScrollOrResize = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updatePosition();
                    ticking = false;
                });
                ticking = true;
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen, updatePosition, close]);

    return { isOpen, toggle, close, portalPos, btnRef, portalRef };
};

export default usePopover;