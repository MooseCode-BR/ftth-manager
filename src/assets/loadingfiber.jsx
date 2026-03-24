import React, { useState, useEffect } from 'react';

import bandeja from './bandeja.svg';

// Tabela de Cores ABNT/Telebrás (NBR 14771)
const ABNT_COLORS = [
    { id: 1, name: 'Verde', hex: '#22c55e', text: 'text-green-500' },
    { id: 2, name: 'Amarelo', hex: '#eab308', text: 'text-yellow-500' },
    { id: 3, name: 'Branco', hex: '#ffffff', text: 'text-white' },
    { id: 4, name: 'Azul', hex: '#3b82f6', text: 'text-blue-500' },
    { id: 5, name: 'Vermelho', hex: '#ef4444', text: 'text-red-500' },
    { id: 6, name: 'Violeta', hex: '#a855f7', text: 'text-purple-500' },
    { id: 7, name: 'Marrom', hex: '#b45309', text: 'text-amber-700' },
    { id: 8, name: 'Rosa', hex: '#ec4899', text: 'text-pink-500' },
    { id: 9, name: 'Preto', hex: '#171717', text: 'text-slate-900' },
    { id: 10, name: 'Cinza', hex: '#6b7280', text: 'text-gray-500' },
    { id: 11, name: 'Laranja', hex: '#f97316', text: 'text-orange-500' },
    { id: 12, name: 'Água', hex: '#06b6d4', text: 'text-cyan-500' }
];

// Rota atualizada conforme solicitado
// 1. Entra pela esquerda
// 2. Dá uma volta completa na bandeja
// 3. Entra por baixo no berço esquerdo
const FIBER_PATH =
    "M 80 480 " +               // 1. Início dentro do tubo inferior esquerdo
    "L 80 375 " +               // 2. Sobe para dentro da bandeja
    "C 80 340 60 360 60 280 " + // 3. Curva para a pista externa esquerda
    "L 60 160 " +                // 4. Sobe acompanhando a lateral esquerda
    "C 60 40 340 40 340 160 " +  // 5. Faz a volta completa no topo até a direita
    "L 340 320 " +               // 6. Desce acompanhando a lateral direita
    "C 340 420 110 420 110 340 " + // 7. Faz a curva inferior (1 VOLTA COMPLETA) voltando à esquerda
    "C 110 230 110 230 110 230 " +// 8. S-Curve: sobe e faz o loop para entrar no berço ESQUERDO por BAIXO
    "L 110 230";                 // 9. Acomoda no slot do berço de emenda esquerdo

const PATH_LENGTH = 1750; // Aumentado para cobrir a volta extra completa
const ANIMATION_SPEED = 36;

export default function LoadingFiber({ size = 100, className = "" }) {
    const [fibers, setFibers] = useState([]);
    const [progress, setProgress] = useState(0);
    const [activeFiberIdx, setActiveFiberIdx] = useState(0);

    useEffect(() => {

        let reqId;
        let currentProgress = progress;

        const animateLoop = () => {
            currentProgress += ANIMATION_SPEED;

            if (currentProgress >= PATH_LENGTH) {
                setFibers(prev => {
                    const nextState = prev.length >= 48 ? prev.slice(1) : prev;
                    return [...nextState, {
                        id: activeFiberIdx,
                        color: ABNT_COLORS[activeFiberIdx % 12],
                        dx: Math.sin(activeFiberIdx * 2.1) * 3,
                        dy: Math.cos(activeFiberIdx * 1.7) * 3
                    }];
                });

                setActiveFiberIdx(prev => prev + 1);
                currentProgress = 0;
            }

            setProgress(currentProgress);
            reqId = requestAnimationFrame(animateLoop);
        };

        reqId = requestAnimationFrame(animateLoop);
        return () => cancelAnimationFrame(reqId);
    }, [activeFiberIdx]);

    const currentActiveColor = ABNT_COLORS[activeFiberIdx % 12];

    return (
        <svg
            viewBox="0 0 400 500"
            className={`max-w-full h-auto shadow-2xl ${className}`}
            style={{ width: size }}
        >
            {/* =======================
              BANDEJA ORIGINAL DO USUÁRIO
              Mantendo o seu arquivo intacto usando a tag image
              ======================= */}
            <g id="bandeja-base">
                <image href={bandeja} x="-75" y="0" width="550" height="500" preserveAspectRatio="none" />
            </g>

            {/* =======================
              FIBRAS JÁ ACOMODADAS
              ======================= */}
            <g id="fibras-acomodadas">
                {fibers.map((fiber) => (
                    <path
                        key={`fiber-${fiber.id}`}
                        d={FIBER_PATH}
                        fill="none"
                        stroke={fiber.color.hex}
                        strokeWidth="12px"
                        strokeLinecap="round"
                        style={{
                            transform: `translate(${fiber.dx}px, ${fiber.dy}px)`,
                            transition: 'opacity 0.3s ease',
                            opacity: 0.85
                        }}
                    />
                ))}
            </g>

            {/* =======================
              FIBRA ANIMADA ATUAL
              ======================= */}
            <g id="fibra-animada">
                <path
                    d={FIBER_PATH}
                    fill="none"
                    stroke={currentActiveColor.hex}
                    strokeWidth="12px"
                    strokeLinecap="round"
                    strokeDasharray={PATH_LENGTH}
                    strokeDashoffset={PATH_LENGTH - progress}
                    style={{
                        transform: `translate(${Math.sin(activeFiberIdx * 2.1) * 3}px, ${Math.cos(activeFiberIdx * 1.7) * 3}px)`,
                        filter: 'drop-shadow(0px 0px 4px rgba(255,255,255,0.4))'
                    }}
                />
            </g>
        </svg>
    );
}