// --- ÍCONES PERSONALIZADOS ---
export const CEOIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Arco superior */}
        <path d="M 5 6 A 6 3 0 0 1 19 6" />
        {/* Linha Vertical Esquerda */}
        <line x1="5" y1="5.9" x2="5" y2="17" />
        {/* Linha Vertical Direita */}
        <line x1="19" y1="5.9" x2="19" y2="17" />
        {/* Linha Horizontal Cima */}
        <line x1="7" y1="8" x2="17" y2="8" strokeWidth="0.6" />
        {/* Linha Horizontal Meio */}
        <line x1="7" y1="11" x2="17" y2="11" strokeWidth="0.6" />
        {/* Linha Horizontal Baixo */}
        <line x1="7" y1="14" x2="17" y2="14" strokeWidth="0.6" />
        {/* Base */}
        <rect x="2.5" y="17" width="19" height="2" rx="0.1" fill="currentColor" />
        {/* Retangulo Esquerda */}
        <rect x="6" y="17" width="2" height="6" rx="0.5" fill="currentColor" />
        {/* Retangulo Meio */}
        <rect x="10" y="17" width="2" height="6" rx="0.5" fill="currentColor" />
        {/* Retangulo Direita */}
        <rect x="14" y="17" width="4" height="6" rx="0.5" fill="currentColor" />
        {/* Alça Cima */}
        <rect x="3" y="8" width="1.5" height="1.5" rx="0.2" fill="none" strokeWidth="0.5" />
        {/* Alça Baixo */}
        <rect x="3" y="12" width="1.5" height="1.5" rx="0.2" fill="none" strokeWidth="0.5" />
    </svg>
    // >
    //     <rect x="6" y="12" width="2" height="2" rx="0.5" />
    //     <rect x="6" y="7" width="2" height="2" rx="0.5" />
    //     <rect x="7.5" y="17" width="2" height="5" rx="0.7" />
    //     <rect x="10" y="17" width="2" height="5" rx="0.7" />
    //     <rect x="13" y="17" width="3.5" height="5" rx="1" />
    //     <rect x="7.5" y="1" width="9" height="18" rx="2" />
    //     <rect x="6" y="16" width="12" height="3" rx="1" />

    //     <line x1="8.5" y1="4" x2="15.5" y2="4" strokeWidth="0.2" />
    //     <line x1="8.5" y1="6" x2="15.5" y2="6" strokeWidth="0.2" />
    //     <line x1="8.5" y1="8" x2="15.5" y2="8" strokeWidth="0.2" />
    //     <line x1="8.5" y1="10" x2="15.5" y2="10" strokeWidth="0.2" />
    //     <line x1="8.5" y1="12" x2="15.5" y2="12" strokeWidth="0.2" />
    //     <line x1="8.5" y1="14" x2="15.5" y2="14" strokeWidth="0.2" />
    // </svg>
);

export const CTOIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    // >
    //     <rect x="5" y="2" width="17" height="20" rx="3" fill="none" />
    //     <rect x="18" y="6" width="4" height="4" rx="0.1" fill="currentColor" />
    //     <rect x="18" y="14" width="4" height="4" rx="0.1" fill="currentColor" />
    //     <rect x="2" y="4" width="3" height="16" rx="0.5" fill="currentColor" />
    // </svg>
    >
        <rect x="3" y="3" width="2" height="15" rx="0.2" fill="currentColor" /> {/*Dobradiça*/}
        <rect x="13" y="20" width="1.5" height="2" fill="currentColor" /> {/*Entrada cabo direita*/}
        <rect x="16" y="20" width="1.5" height="2" fill="currentColor" /> {/*Entrada cabo esquerda*/}
        <rect x="7" y="20" width="4" height="1" strokeWidth="2" /> {/*Base*/}
        <rect x="5" y="1" width="14" height="19" rx="1" strokeWidth="2" /> {/*Caixa principal*/}
        <rect x="16" y="10" width="1" height="1" rx="1" /> {/*Bolinha*/}
        <rect x="15.5" y="3.5" width="3.5" height="4" rx="0.2" fill="currentColor" /> {/*Trava superior*/}
        <rect x="15.5" y="13.5" width="3.5" height="4" rx="0.2" fill="currentColor" /> {/*Trava inferior*/}
        <line x1="15" y1="4.5" x2="15" y2="6.5" /> {/*Linha Trava Superior*/}
        <line x1="15" y1="14.5" x2="15" y2="16.5" /> {/*Linha Trava Inferior*/}

    </svg>
);

export const SplitterIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="19" cy="7" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="6" cy="5" r="2" />
        <path d="M5 17A13 12 0 0 1 5 7" />
        <path d="M5 17A15 12 0 0 1 17 7" />
    </svg>
);

export const CompassIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        //strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12 5L14.5 12L12 19L9.5 12L12 5Z" fill="currentColor" />
        <circle cx="12" cy="12" r="10" />
    </svg>
);

export const PostIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <rect x="2" y="2" width="1" height="1" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        <rect x="11.5" y="2" width="1" height="1" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        <rect x="21" y="2" width="1" height="1" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        <rect x="2" y="3" width="20" height="0.5" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="7" width="18" height="0.5" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        <rect x="11.5" y="4" width="1" height="18" fill="currentColor" stroke="currentColor" strokeWidth="2" />
    </svg>
);

export const ProjetosIcone = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Prancheta / Clipboard outline */}
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />

        {/* Símbolo de Network / Estrutura de Projetos */}
        <circle cx="12" cy="10" r="1" />
        <circle cx="8" cy="17" r="1" />
        <circle cx="16" cy="17" r="1" />

        {/* Linhas de conexão do Network */}
        <path d="M 12 10.5 v 2.5 M 8 15.5 v -1.5 h 8 v 1.5" />
    </svg>
);

export const NetworkSwitchIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Corpo centralizado */}
        <rect width="20" height="8" x="2" y="8" rx="2" />

        {/* 4 Portas alinhadas perfeitamente e espaçadas */}
        <path d="M6.01 12H6" />
        <path d="M10.01 12H10" />
        <path d="M14.01 12H14" />
        <path d="M18.01 12H18" />
    </svg>
);

/* CONJUNTO DE ÍCONES: Wi-Fi Direcional (Rosa dos Ventos)
  -----------------------------------------------------
  Nota técnica: O viewBox foi ajustado de "0 0 24 24" para "-3 -3 30 30" 
  e o strokeWidth de "2" para "2.5". Isso garante que a ponta da seta, 
  que "foge" do círculo, não seja cortada nas direções cardeais (N, S, L, O), 
  mantendo a escala e peso visual originais perfeitamente idênticos.
*/

export const WifiDirectionNorth = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="-3 -3 30 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <g transform="rotate(315 12 12)">
            <path d="M22 12A10 10 0 1 1 12 2" />
            <path d="M22 2 18 6" />
            <path d="M16 2h6v6" />
        </g>
        <g>
            <path d="M12 16h.01" />
            <path d="M9 13a4 4 0 0 1 6 0" />
            <path d="M6 10a8.5 8.5 0 0 1 12 0" />
        </g>
    </svg>
);

export const WifiDirectionNorthEast = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="-3 -3 30 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <g>
            <path d="M22 12A10 10 0 1 1 12 2" />
            <path d="M22 2 18 6" />
            <path d="M16 2h6v6" />
        </g>
        <g transform="rotate(45 12 12)">
            <path d="M12 16h.01" />
            <path d="M9 13a4 4 0 0 1 6 0" />
            <path d="M6 10a8.5 8.5 0 0 1 12 0" />
        </g>
    </svg>
);

export const WifiDirectionEast = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="-3 -3 30 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <g transform="rotate(45 12 12)">
            <path d="M22 12A10 10 0 1 1 12 2" />
            <path d="M22 2 18 6" />
            <path d="M16 2h6v6" />
        </g>
        <g transform="rotate(90 12 12)">
            <path d="M12 16h.01" />
            <path d="M9 13a4 4 0 0 1 6 0" />
            <path d="M6 10a8.5 8.5 0 0 1 12 0" />
        </g>
    </svg>
);

export const WifiDirectionSouthEast = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="-3 -3 30 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <g transform="rotate(90 12 12)">
            <path d="M22 12A10 10 0 1 1 12 2" />
            <path d="M22 2 18 6" />
            <path d="M16 2h6v6" />
        </g>
        <g transform="rotate(135 12 12)">
            <path d="M12 16h.01" />
            <path d="M9 13a4 4 0 0 1 6 0" />
            <path d="M6 10a8.5 8.5 0 0 1 12 0" />
        </g>
    </svg>
);

export const WifiDirectionSouth = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="-3 -3 30 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <g transform="rotate(135 12 12)">
            <path d="M22 12A10 10 0 1 1 12 2" />
            <path d="M22 2 18 6" />
            <path d="M16 2h6v6" />
        </g>
        <g transform="rotate(180 12 12)">
            <path d="M12 16h.01" />
            <path d="M9 13a4 4 0 0 1 6 0" />
            <path d="M6 10a8.5 8.5 0 0 1 12 0" />
        </g>
    </svg>
);

export const WifiDirectionSouthWest = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="-3 -3 30 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <g transform="rotate(180 12 12)">
            <path d="M22 12A10 10 0 1 1 12 2" />
            <path d="M22 2 18 6" />
            <path d="M16 2h6v6" />
        </g>
        <g transform="rotate(225 12 12)">
            <path d="M12 16h.01" />
            <path d="M9 13a4 4 0 0 1 6 0" />
            <path d="M6 10a8.5 8.5 0 0 1 12 0" />
        </g>
    </svg>
);

export const WifiDirectionWest = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="-3 -3 30 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <g transform="rotate(225 12 12)">
            <path d="M22 12A10 10 0 1 1 12 2" />
            <path d="M22 2 18 6" />
            <path d="M16 2h6v6" />
        </g>
        <g transform="rotate(270 12 12)">
            <path d="M12 16h.01" />
            <path d="M9 13a4 4 0 0 1 6 0" />
            <path d="M6 10a8.5 8.5 0 0 1 12 0" />
        </g>
    </svg>
);

export const WifiDirectionNorthWest = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="-3 -3 30 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <g transform="rotate(270 12 12)">
            <path d="M22 12A10 10 0 1 1 12 2" />
            <path d="M22 2 18 6" />
            <path d="M16 2h6v6" />
        </g>
        <g transform="rotate(315 12 12)">
            <path d="M12 16h.01" />
            <path d="M9 13a4 4 0 0 1 6 0" />
            <path d="M6 10a8.5 8.5 0 0 1 12 0" />
        </g>
    </svg>
);