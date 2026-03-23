import React, { useState } from 'react';

const ThemeToggleButton = ({ isDarkMode, toggleTheme, className = "" }) => {
    const [isHovered, setIsHovered] = useState(false);

    let beamOpacity = 0;
    if (isDarkMode) {
        beamOpacity = isHovered ? 0.8 : 0;
    } else {
        beamOpacity = isHovered ? 0.3 : 1;
    }

    const isLaserActive = beamOpacity > 0;

    return (
        <button
            onClick={toggleTheme}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`group focus:outline-none active:scale-[0.98] transition-transform duration-200 ${className}`}
            aria-label="Alternar tema"
        >
            <svg
                width="175"
                height="42"
                viewBox="0 0 500 160"
                className="overflow-visible drop-shadow-xl scale-75 lg:scale-100 origin-right"
            >
                <defs>
                    {/* Gradiente do Feixe de Luz Vermelho */}
                    <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ff0000" stopOpacity="0" />
                        <stop offset="60%" stopColor="#ff0000" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#ff0000" stopOpacity="1" />
                    </linearGradient>

                    {/* Gradientes para dar efeito 3D cilíndrico à lanterna */}
                    <linearGradient id="metalBody" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#71717a" />
                        <stop offset="30%" stopColor="#d4d4d8" />
                        <stop offset="70%" stopColor="#a1a1aa" />
                        <stop offset="100%" stopColor="#52525b" />
                    </linearGradient>

                    <linearGradient id="darkBody" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3f3f46" />
                        <stop offset="30%" stopColor="#71717a" />
                        <stop offset="70%" stopColor="#52525b" />
                        <stop offset="100%" stopColor="#27272a" />
                    </linearGradient>

                    {/* Filtro de brilho (Glow) para o laser */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    <filter id="ledGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* FEIXE DE LUZ (Lado Esquerdo) */}
                <g style={{ opacity: beamOpacity, transition: 'opacity 0.4s ease-in-out' }}>
                    <polygon
                        points="0,20 220,55 220,105 0,140"
                        fill="url(#beamGrad)"
                        filter="url(#glow)"
                    />
                    <polygon
                        points="0,60 220,75 220,85 0,100"
                        fill="#ffcccc"
                        filter="url(#glow)"
                        opacity="0.8"
                    />
                    <line x1="0" y1="80" x2="220" y2="80" stroke="#ffffff" strokeWidth="2" filter="url(#glow)" />
                </g>

                {/* CORPO DA VFL */}
                <g transform="translate(220, 0)">
                    <path d="M -8 55 L 15 55 L 15 105 L -8 105 Q -15 80 -8 55 Z" fill="#0ea5e9" />
                    <rect x="15" y="45" width="40" height="70" rx="3" fill="url(#darkBody)" />
                    <rect x="55" y="40" width="100" height="80" rx="6" fill="url(#darkBody)" />
                    <rect x="65" y="45" width="80" height="70" rx="4" fill="#3f3f46" opacity="0.5" />
                    <circle
                        cx="105" cy="55" r="4"
                        fill={isLaserActive ? "#ef4444" : "#52525b"}
                        filter={isLaserActive ? "url(#ledGlow)" : ""}
                        style={{ transition: 'fill 0.3s ease' }}
                    />
                    <rect x="80" y="65" width="50" height="26" rx="10" fill="#27272a" />
                    <rect x="83" y="68" width="44" height="20" rx="8" fill="#52525b" />
                    <rect x="155" y="45" width="115" height="70" rx="2" fill="url(#metalBody)" />
                    <rect x="160" y="50" width="105" height="5" fill="#a1a1aa" opacity="0.3" />
                    <rect x="160" y="105" width="105" height="5" fill="#27272a" opacity="0.3" />
                    <rect x="270" y="45" width="10" height="70" rx="3" fill="url(#darkBody)" />
                </g>
            </svg>
        </button>
    );
};

export default ThemeToggleButton;
