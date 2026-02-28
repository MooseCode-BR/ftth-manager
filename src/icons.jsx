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
        <path d="M 3 7 A 5 3 0 0 1 21 7" />
        <line x1="3" y1="7" x2="3" y2="17" />
        <line x1="21" y1="7" x2="21" y2="17" />
        <line x1="3" y1="7" x2="21" y2="7" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <rect x="2" y="17" width="20" height="2" fill="currentColor" />
        <rect x="5" y="17" width="3" height="6" rx="1" fill="currentColor" />
        <rect x="10.5" y="17" width="3" height="6" rx="1" fill="currentColor" />
        <rect x="16" y="17" width="3" height="6" rx="1" fill="currentColor" />
    </svg>
);

export const CTOIcon = ({ size, className }) => (
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
        <rect x="5" y="2" width="17" height="20" rx="3" fill="none" />
        <rect x="18" y="6" width="4" height="4" rx="0.1" fill="currentColor" />
        <rect x="18" y="14" width="4" height="4" rx="0.1" fill="currentColor" />
        <rect x="2" y="4" width="3" height="16" rx="0.5" fill="currentColor" />
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

export const ElectricPoleIcon = ({ size, className }) => (
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
        {/* Poste principal vertical */}
        <line x1="12" y1="3" x2="12" y2="21" />

        {/* Travessa única horizontal (crossarm) */}
        <line x1="6" y1="8" x2="18" y2="8" />

        {/* Isoladores (detalhes preenchidos conforme o estilo solicitado) */}
        <rect x="6" y="5" width="2" height="3" rx="0.5" fill="currentColor" stroke="none" />
        <rect x="11" y="5" width="2" height="3" rx="0.5" fill="currentColor" stroke="none" />
        <rect x="16" y="5" width="2" height="3" rx="0.5" fill="currentColor" stroke="none" />

        {/* Base do poste para estabilidade visual */}
        <rect x="9" y="21" width="6" height="1.5" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
);