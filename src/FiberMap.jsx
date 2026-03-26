import React, { useMemo, useEffect, useState, useRef, memo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, LayersControl, useMap, CircleMarker, ZoomControl, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { ITEM_TYPES, ICON_MAP } from './constants';
import { CompassIcon } from './icons';
import {
    ChevronUp, Info, Lock, Unlock, Edit3, Trash2, Ruler, MapPin, Scissors,
    Group, Ungroup, Crosshair,
    DoorOpen
} from 'lucide-react';
import DraggableToolbar from './components/DraggableToolbar/DraggableToolbar';

// Configuração padrão do ícone do Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Waypoints - Bolinhas d edição do cabo
// Adicionei 'item' como último parâmetro
const createCustomIcon = (type, color, isSelected, name, showLabel, isDarkMode, item) => {

    // 1. Pega o ícone padrão do tipo (ex: MapPin para OBJECT)
    let ItemIconComponent = ITEM_TYPES[type]?.icon;

    // 2. Lógica de Sobrescrita:
    // Se for do tipo OBJECT e tiver um iconType salvo (ex: 'Wifi'), usa ele.
    if (type === 'OBJECT' && item?.iconType && ICON_MAP[item.iconType]) {
        ItemIconComponent = ICON_MAP[item.iconType];
    }

    // Fallback se nada for encontrado
    if (!ItemIconComponent) return DefaultIcon;

    const iconColor = color || '#000000';

    // Borda sólida via múltiplos drop-shadow (mesma técnica do text-shadow em 4 direções).
    // drop-shadow NÃO suporta spread como box-shadow; a solução é usar 4 offsets diagonais.
    const outlineColor = 'black';
    const outlineFilter = [
        `drop-shadow(-0.5px -0.5px 0 ${outlineColor})`,
        `drop-shadow( 0.5px -0.5px 0 ${outlineColor})`,
        `drop-shadow(-0.5px  1px 0 ${outlineColor})`,
        `drop-shadow( 1px  1px 0 ${outlineColor})`,
    ].join(' ');

    const svgString = renderToStaticMarkup(
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            {/* Ícone sem fundo/círculo — apenas com borda sólida via filter */}
            <div style={{
                color: iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: outlineFilter,
                transform: isSelected ? 'scale(1.4)' : 'scale(1)',
                zIndex: 20,
                transition: 'transform 0.15s ease'
            }}>
                <ItemIconComponent size={22} />
            </div>

            {/* Etiqueta com borda sólida nas letras via text-shadow */}
            {showLabel && (
                <div style={{
                    position: 'absolute',
                    top: '28px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '12px',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    zIndex: 20,
                    pointerEvents: 'none',
                    fontWeight: 'bold',
                    // Borda sólida nas letras: shadows em 4 direções
                    textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                }}>
                    {name}
                </div>
            )}
        </div>
    );

    return L.divIcon({
        html: svgString,
        className: 'custom-leaflet-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};


// ============================================================================
// CRIAÇÃO DE ÍCONES PARA WAYPOINTS E BUSCA
// ============================================================================

// Cria ícone para waypoints (pontos de edição de cabos)
const createHandleIcon = () => {
    return L.divIcon({
        className: 'bg-transparent',
        html: `<div style="width: 12px; height: 12px; background-color: white; border: 2px solid #2563eb; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); cursor: grab;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
    });
};

// Ícone de Local Encontrado com PopUp
const createSearchIcon = () => {
    const svgString = renderToStaticMarkup(
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.4))'
        }}>
            <MapPin size={40} fill="#ef4444" color="#7f1d1d" strokeWidth={1.5} />
        </div>
    );

    return L.divIcon({
        html: svgString,
        className: 'bg-transparent', // Remove fundo quadrado padrão
        iconSize: [40, 40],
        iconAnchor: [20, 38], // Ponta do alfinete no local exato
        popupAnchor: [0, -38] // Popup aparece acima do alfinete
    });
};

// --- COMPONENTES DE CONTROLE ---
// Pega coordenadas para cliques no mapa adicionando Nós ou Clientes / Desseleciona qualquer seleção se clicar no mapa
const MapClickHandler = ({ onMapBgClick, interactionMode, onDeselect }) => {
    const map = useMap();
    useMapEvents({
        click() {
            if (interactionMode === 'ADD_NODE' || interactionMode === 'ADD_CLIENT' || interactionMode === 'ADD_OBJECT') {
                // Usa o centro do mapa (mira) em vez do local do clique
                onMapBgClick(map.getCenter());
            } else {
                onMapBgClick(null);
                if (onDeselect) onDeselect();
            }
        },
    });
    return null;
};

// OTIMIZAÇÃO 1: Handler de Zoom Inteligente
// Só dispara atualização se cruzar o limiar de visibilidade (ex: zoom 16)
const MapZoomHandler = ({ onShowLabelsChange }) => {
    useMapEvents({
        zoomend(e) {
            const z = e.target.getZoom();
            // Define que rótulos aparecem acima do zoom 16
            onShowLabelsChange(z >= 16);
        },
    });
    return null;
};

// Voar para coordenadas
const FlyToHandler = ({ coords }) => {
    const map = useMap();
    useEffect(() => {
        if (coords && coords.length === 2) {
            map.flyTo(coords, 20, { duration: 1.5 }); // duration em segundos, padrão varia pela distância, 0.6s é super rápido
        }
    }, [coords, map]);
    return null;
};

const LocationControl = ({ onLocationFound, onAlertRequest }) => {
    const map = useMap();
    const [position, setPosition] = useState(null);

    // 1. Criamos uma referência para "agarrar" o botão HTML depois de criado
    const buttonRef = useRef(null);

    // Função que inicia a busca e ativa o visual
    const startLocating = useCallback(() => {
        // Ativa a classe CSS de piscar
        if (buttonRef.current) {
            buttonRef.current.classList.add('locating-active');
        }
        // Inicia a busca no Leaflet sem mudar a view nativamente
        map.locate({ setView: false, maxZoom: 18 });
    }, [map]);

    // Função que para o visual (sucesso ou erro)
    const stopLocating = useCallback(() => {
        if (buttonRef.current) {
            buttonRef.current.classList.remove('locating-active');
        }
    }, []);

    // 2. Escuta os eventos do mapa para saber quando parar de piscar
    useMapEvents({
        locationfound(e) {
            setPosition(e.latlng);
            stopLocating(); // Parar animação
            map.flyTo(e.latlng, 18, { duration: 0.6 }); // Animação rápida pro local
            if (onLocationFound) onLocationFound(e.latlng); // Notifica o App
        },
        locationerror(e) {
            console.warn("GPS Indisponível:", e.message);
            stopLocating();
            if (onAlertRequest) {
                onAlertRequest("GPS", "Não foi possível obter sua localização. Verifique as permissões de localização do navegador.");
            } else {
                alert("Não foi possível obter sua localização.");
            }
        }
    });

    useEffect(() => {
        const LocateControlClass = L.Control.extend({
            onAdd: function () {
                const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');

                // Estilos base
                btn.style.backgroundColor = 'white';
                btn.style.width = '45px';
                btn.style.height = '45px';
                btn.style.display = 'flex';
                btn.style.alignItems = 'center';
                btn.style.justifyContent = 'center';
                btn.style.cursor = 'pointer';
                btn.style.border = '2px solid rgba(0,0,0,0.2)';
                btn.style.borderRadius = '4px';
                btn.title = "Onde estou";
                btn.style.transition = 'all 0.3s ease'; // Suaviza a troca de cor

                btn.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`;

                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startLocating(); // <--- Chama a nossa função nova
                };

                // 3. Salva o elemento HTML na nossa referência React
                buttonRef.current = btn;

                return btn;
            }
        });

        const control = new LocateControlClass({ position: 'bottomright' });
        control.addTo(map);

        // ---  Inicia a busca automaticamente ao carregar o componente ---
        // startLocating();

        return () => {
            control.remove();
            buttonRef.current = null; // Limpa a ref ao desmontar
        };
    }, [map, startLocating]); // Dependência map

    // SVG e Estilos adaptados do tecnico.html para JSX para criar um ícone personalizado:
    const technicianIcon = useMemo(() => {
        const svgString = renderToStaticMarkup(
            <div style={{ width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <style>
                    {`
                        .waving-arm {
                            transform-origin: 125px 100px;
                            animation: wave 0.45s infinite alternate ease-in-out;
                        }
                        @keyframes wave {
                            0% { transform: rotate(-15deg); }
                            100% { transform: rotate(25deg); }
                        }
                        .character {
                            animation: breathe 1.5s infinite alternate ease-in-out;
                        }
                        @keyframes breathe {
                            0% { transform: translateY(0px); }
                            100% { transform: translateY(5px); }
                        }
                        .eyes {
                            transform-origin: 125px 73px;
                            animation: blink 3.5s infinite;
                        }
                        @keyframes blink {
                            0%, 90%, 100% { transform: scaleY(1); }
                            95% { transform: scaleY(0.1); }
                        }
                    `}
                </style>
                <svg viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', overflow: 'visible', filter: 'drop-shadow(0px 8px 8px rgba(0,0,0,0.5))' }}>
                    {/* Definição do filtro para criar o contorno da silhueta */}
                    <defs>
                        <filter id="contorno-branco" x="-20%" y="-20%" width="140%" height="140%">
                            {/* Expande a forma (alpha) do desenho */}
                            <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="expandido" />
                            {/* Preenche a forma expandida com preto */}
                            <feFlood floodColor="#ffffff" result="cor-branca" />
                            {/* Aplica a cor preta apenas na área expandida */}
                            <feComposite in="cor-branca" in2="expandido" operator="in" result="contorno" />
                            {/* Junta o contorno preto (atrás) com o desenho original (frente) */}
                            <feMerge>
                                <feMergeNode in="contorno" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Sombra no chão (fora do filtro para não ter contorno) */}
                    <ellipse cx="125" cy="210" rx="55" ry="6" fill="#444444" />

                    {/* Grupo principal do personagem animado COM O FILTRO DE CONTORNO APLICADO */}
                    <g className="character" filter="url(#contorno-branco)">
                        {/* ================= CORPO ================= */}
                        {/* Pernas */}
                        <line x1="125" y1="150" x2="105" y2="205" stroke="#000000" strokeWidth="11" strokeLinecap="round" />
                        <line x1="125" y1="150" x2="145" y2="205" stroke="#000000" strokeWidth="11" strokeLinecap="round" />

                        {/* Tronco */}
                        <line x1="125" y1="91" x2="125" y2="155" stroke="#000000" strokeWidth="15" strokeLinecap="round" />

                        {/* Braço esquerdo segurando a escada (mão no trilho inferior) */}
                        <path d="M 125 98 Q 110 115 92 107" fill="none" stroke="#000000" strokeWidth="8"
                            strokeLinecap="round" />
                        <circle cx="92" cy="107" r="4" fill="#000000" />

                        {/* ================= ESCADA NO OMBRO (Cor Laranja) ================= */}
                        <g transform="translate(125, 80) rotate(-20)">
                            {/* Trilhos laterais */}
                            <line x1="-80" y1="-14" x2="70" y2="-14" stroke="#FF6B00" strokeWidth="10" strokeLinecap="round" />
                            <line x1="-80" y1="14" x2="70" y2="14" stroke="#FF6B00" strokeWidth="10" strokeLinecap="round" />
                            {/* Degraus */}
                            <line x1="-65" y1="-14" x2="-65" y2="14" stroke="#FF6B00" strokeWidth="5" />
                            <line x1="-40" y1="-14" x2="-40" y2="14" stroke="#FF6B00" strokeWidth="5" />
                            <line x1="-15" y1="-14" x2="-15" y2="14" stroke="#FF6B00" strokeWidth="5" />
                            <line x1="10" y1="-14" x2="10" y2="14" stroke="#FF6B00" strokeWidth="5" />
                            <line x1="35" y1="-14" x2="35" y2="14" stroke="#FF6B00" strokeWidth="5" />
                            <line x1="60" y1="-14" x2="60" y2="14" stroke="#FF6B00" strokeWidth="5" />
                        </g>

                        {/* ================= BRAÇO DIREITO (Dando Tchau) ================= */}
                        <g className="waving-arm">
                            <path d="M 125 100 Q 155 105 162 65" fill="none" stroke="#000000" strokeWidth="8"
                                strokeLinecap="round" />
                            {/* Mão direita (bolinha) */}
                            <circle cx="162" cy="65" r="4" fill="#000000" />
                        </g>

                        {/* EPI: Suspensórios (Tiras no ombro) e Fita Peitoral */}
                        <path d="M 125 95 L 118 135" stroke="#FF6B00" strokeWidth="4" />
                        <path d="M 125 95 L 132 135" stroke="#FF6B00" strokeWidth="4" />
                        <line x1="119" y1="115" x2="131" y2="115" stroke="#FF6B00" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="125" cy="115" r="2.5" fill="none" stroke="#000000" strokeWidth="1.5" />
                        {/* Argola frontal */}

                        {/* ================= EPI: CINTURÃO DE SEGURANÇA ================= */}
                        <rect x="110" y="132" width="30" height="14" rx="4" fill="#FF6B00" />
                        <rect x="122" y="132" width="6" height="14" rx="1.5" fill="#CC5500" /> {/* Fivela */}

                        {/* Argolas laterais do EPI */}
                        <circle cx="110" cy="139" r="3" fill="none" stroke="#000000" strokeWidth="2" />
                        <circle cx="140" cy="139" r="3" fill="none" stroke="#000000" strokeWidth="2" />

                        {/* EPI: Talabarte (Corda de segurança com mosquetão) */}
                        <path d="M 140 139 Q 155 155 145 185" fill="none" stroke="#FF6B00" strokeWidth="5"
                            strokeLinecap="round" />
                        <rect x="142" y="185" width="6" height="12" rx="3" fill="none" stroke="#000000" strokeWidth="3" />
                        {/* Mosquetão */}

                        {/* EPI: Perneiras (Tiras nas coxas) */}
                        <line x1="111" y1="168" x2="123" y2="162" stroke="#FF6B00" strokeWidth="8" strokeLinecap="round" />
                        <line x1="139" y1="168" x2="127" y2="162" stroke="#FF6B00" strokeWidth="8" strokeLinecap="round" />

                        {/* ================= CABEÇA ================= */}
                        {/* Rosto */}
                        <circle cx="125" cy="75" r="16" fill="#000" stroke="#000" strokeWidth="2.5" />

                        {/* Sorriso simpático */}
                        <path d="M 120 83 Q 125 88 130 83" fill="none" stroke="#fff" strokeWidth="2.5"
                            strokeLinecap="round" />

                        {/* ================= CAPACETE (Cor Laranja) ================= */}
                        {/* Domo do capacete */}
                        <path d="M 107 72 A 18 18 0 0 1 143 72 Z" fill="#FF6B00" stroke="#000000" strokeWidth="3"
                            strokeLinejoin="round" />
                        {/* Aba do capacete */}
                        <path d="M 103 72 Q 125 72 147 72" fill="none" stroke="#000000" strokeWidth="6"
                            strokeLinecap="round" />



                    </g>
                </svg>
            </div>
        );

        return L.divIcon({
            className: 'bg-transparent',
            html: svgString,
            iconSize: [60, 60],
            iconAnchor: [30, 50], // Posicionando o eixo da imagem aproximadamente nos pés da animação
        });
    }, []);

    return position ? (
        <Marker
            position={position}
            icon={technicianIcon}
            zIndexOffset={2000} // Ficar acima do resto
        >
            <Popup className="text-center font-bold text-gray-800">
                Você está aqui!
            </Popup>
        </Marker>
    ) : null;
};

// --- FUNÇÃO AUXILIAR: Reseta Rotação Animada ---
const smoothResetBearing = (map) => {
    let current = map.getBearing();
    // Escolhe o caminho mais curto (ex: 350° vira -10° para não dar a volta inteira)
    while (current > 180) current -= 360;
    while (current < -180) current += 360;

    const startBearing = current;
    const startTime = performance.now();
    const duration = 500; // 0.5 segundos (500ms)

    const animate = (time) => {
        const elapsed = time - startTime;
        let progress = Math.min(elapsed / duration, 1);

        // Easing out (desacelera no final) pra ficar mais suave: easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);

        map.setBearing(startBearing * (1 - ease));

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            map.setBearing(0); // Garante 0 exato no fim
        }
    };
    requestAnimationFrame(animate);
};

const CustomRotateControl = () => {
    const map = useMap();
    const buttonRef = useRef(null);
    const iconRef = useRef(null);

    // 1. Atualiza o visual do ícone quando o mapa gira
    useMapEvents({
        rotate: () => {
            if (iconRef.current) {
                const bearing = map.getBearing();
                // Gira o ícone para apontar o Norte
                iconRef.current.style.transform = `rotate(${bearing}deg)`;

                // Feedback visual (Azul se fora do Norte)
                if (Math.abs(bearing) > 1) {
                    iconRef.current.classList.add('text-blue-600');
                    if (buttonRef.current) buttonRef.current.classList.add('border-blue-500');
                } else {
                    iconRef.current.classList.remove('text-blue-600');
                    if (buttonRef.current) buttonRef.current.classList.remove('border-blue-500');
                }
            }
        }
    });

    useEffect(() => {
        const RotateControlClass = L.Control.extend({
            onAdd: function () {
                const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');

                // Estilos
                btn.style.backgroundColor = 'white';
                btn.style.width = '45px';
                btn.style.height = '45px';
                btn.style.display = 'flex';
                btn.style.alignItems = 'center';
                btn.style.justifyContent = 'center';
                btn.style.cursor = 'grab';
                btn.style.border = '2px solid rgba(0,0,0,0.2)';
                btn.style.borderRadius = '4px';
                btn.title = "Arrastar p/ Girar | Clique p/ Norte (R)";

                // IMPORTANTE: Previne que cliques e rolagens passem para o mapa
                L.DomEvent.disableClickPropagation(btn);
                L.DomEvent.disableScrollPropagation(btn);

                const iconHtml = renderToStaticMarkup(
                    <div
                        className="compass-icon-wrapper"
                        style={{
                            pointerEvents: 'none',
                            transition: 'transform 0.1s linear',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {/* Aqui está o ícone do Lucide */}
                        <CompassIcon size={30} strokeWidth={1} />
                    </div>
                );
                btn.innerHTML = iconHtml;

                // --- NOVA LÓGICA DE INTERAÇÃO (LINEAR) ---

                let isDragging = false;
                let startX = 0;           // Posição inicial do mouse (Horizontal)
                let startBearing = 0;     // Rotação inicial do mapa

                const onMouseDown = (e) => {
                    L.DomEvent.stopPropagation(e);
                    e.preventDefault();

                    isDragging = false;
                    btn.style.cursor = 'grabbing';

                    // Captura onde o mouse está na tela (X) e a rotação atual
                    startX = e.clientX;
                    startBearing = map.getBearing();

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                };

                const onMouseMove = (e) => {
                    // Calculamos quanto o mouse andou para os lados
                    const deltaX = e.clientX - startX;

                    // Se moveu mais de 2 pixels, consideramos arraste (para não atrapalhar o clique)
                    if (Math.abs(deltaX) > 2) {
                        isDragging = true;

                        // SENSIBILIDADE: 
                        // 1 pixel de movimento = 1 grau de rotação. 
                        // Se quiser mais rápido, multiplique (ex: deltaX * 1.5)
                        // Se quiser mais lento, divida (ex: deltaX * 0.5)
                        const sensitivity = 0.5;

                        map.setBearing(startBearing + (deltaX * sensitivity));
                    }
                };

                const onMouseUp = () => {
                    btn.style.cursor = 'grab';

                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    // Se foi apenas um clique rápido (sem arrastar), reseta pro Norte
                    if (!isDragging) {
                        smoothResetBearing(map);
                    }
                };

                // Listeners
                btn.addEventListener('mousedown', onMouseDown);
                btn.addEventListener('touchstart', (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (e.cancelable) e.preventDefault(); // Boa prática checar se é cancelável
                    smoothResetBearing(map); // Mobile: apenas reseta suavemente
                }, { passive: false });

                buttonRef.current = btn;
                iconRef.current = btn.querySelector('.compass-icon-wrapper');

                return btn;
            }
        });

        const control = new RotateControlClass({ position: 'bottomright' });
        control.addTo(map);

        return () => {
            control.remove();
        };
    }, [map]);

    return null;
};

// --- COMPONENTE NOVO: Handler para o Atalho "R" ---
const RotationHandler = () => {
    const map = useMap();

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Se apertar 'r' ou 'R' e não estiver digitando texto
            if (e.key.toLowerCase() === 'r' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                smoothResetBearing(map); // Reseta para o Norte com animação suave
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [map]);

    return null;
};

// --- COMPONENTES MEMOIZADOS (A CHAVE DA PERFORMANCE) ---

// OTIMIZAÇÃO 2: Memoização do Marcador
// Compara props antigas e novas. Só renderiza se algo relevante mudar.
const DraggableMarker = memo(({ item, position, saveItem, onNodeClick, isSelected, showLabel, onSelectLocal, isPickingMode, isPickingSelected, onEdit, onDelete, onOpen }) => {

    const [isUnlocked, setIsUnlocked] = useState(false);
    const markerRef = useRef(null);

    // CORREÇÃO CRÍTICA: Stale Closure
    // O memo() impede re-renders quando onNodeClick muda (referência nova a cada render do pai).
    // Usamos uma ref para sempre ter acesso à versão mais atual da função,
    // sem precisar que o DraggableMarker re-renderize.
    const onNodeClickRef = useRef(onNodeClick);
    useEffect(() => {
        onNodeClickRef.current = onNodeClick;
    }, [onNodeClick]);

    useEffect(() => {
        if (!isSelected) setIsUnlocked(false);
    }, [isSelected]);

    const icon = useMemo(() => {
        const typeInfo = ITEM_TYPES[item.type];
        const color = item.color || typeInfo?.defaultColor || '#000';
        // Escala o ícone se estiver selecionado OU se for o 1º nó escolhido no modo picking
        const shouldShowLabel = showLabel || isSelected;
        return createCustomIcon(
            item.type,
            color,
            isSelected || isPickingSelected,  // ← scale 1.4 em ambos os casos
            item.name,
            shouldShowLabel,
            false,
            item
        );
    }, [item, item.type, item.color, isSelected, isPickingSelected, item.name, showLabel]);

    // --- EVENTOS ---
    const eventHandlers = useMemo(() => ({
        dragend(e) {
            const marker = e.target;
            if (marker != null) {
                const newPos = marker.getLatLng();
                saveItem({ ...item, lat: newPos.lat, lng: newPos.lng });
            }
        },
        click(e) {
            L.DomEvent.stopPropagation(e);

            // Se estiver no modo de conectar cabos
            if (isPickingMode) {
                // Fecha o popup imediatamente caso o Leaflet o tenha aberto nativamente
                if (markerRef.current) {
                    markerRef.current.closePopup();
                }
                // USA A REF em vez de onNodeClick diretamente.
                // Isso garante que estamos chamando a versão mais atual do handler,
                // que já enxerga o cableStartNode atualizado pelo 1º clique.
                console.log('[FiberMap] Clique em nó no modo picking:', item.name, '| isPickingMode:', isPickingMode);
                onNodeClickRef.current(item);
            } else {
                // Seleciona o nó (isso fará o isSelected virar true e mostrar o Popup)
                onSelectLocal(item.id);
            }
        },
        dblclick(e) {
            L.DomEvent.stopPropagation(e);
            // Bloqueia duplo clique para itens de projetos restritos
            if (item._readOnly) return;
            // Duplo clique -> Abre o DetailPanel direto
            if (!isPickingMode && onOpen) {
                onOpen(item.id);
            }
        }
    }), [item, saveItem, onNodeClick, onSelectLocal, isPickingMode, onOpen]);

    return (
        <Marker
            ref={markerRef}
            draggable={isUnlocked && !item._readOnly}
            eventHandlers={eventHandlers}
            position={position}
            icon={icon}
            title={item.name}
            zIndexOffset={isSelected ? 1000 : 0}
        >
            {/* SUBSTITUIÇÃO: Tooltip -> Popup 
               Renderiza apenas se estiver selecionado.
               Reutilizamos a classe 'custom-cable-popup' para manter o estilo idêntico.
            */}
            {/* Não renderiza o Popup quando está no modo de seleção de nós para cabos,
                pois o Leaflet abre o popup nativamente ao clicar no Marker,
                interrompendo o fluxo de seleção do 2º nó. */}
            {!isPickingMode && !item._readOnly && (
                <Popup
                    closeButton={false}
                    autoPan={false}
                    className="hide-leaflet-popup-tail"
                    offset={[0, -10]} // Offset maior para ficar acima do ícone do pino
                >
                    <DraggableToolbar>
                        {/* --- NOME DO NODE (EM CIMA) --- */}
                        <div className="w-full text-center border-b border-gray-300/50 dark:border-gray-600/50 pb-1.5 mb-1.5">
                            <span className="text-[10px] font-bold text-black dark:text-white block truncate max-w-[180px] mx-auto px-1">
                                {item.name}
                            </span>
                        </div>

                        {/* --- BOTÕES (EMBAIXO, LADO A LADO) --- */}
                        <div className="flex flex-row items-center justify-center gap-1.5 w-full"
                            onPointerDown={(e) => {
                                // L.DomEvent.stopPropagation não é suficiente para interact.js ou native draggables no Leaflet,
                                // O e.stopPropagation() já é feito no DraggableToolbar
                            }}>

                            {/* Botão MOVER / TRAVAR */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setIsUnlocked(!isUnlocked);
                                }}
                                className={`p-1.5 rounded-full flex items-center justify-center transition-colors border ${isUnlocked
                                    ? 'bg-green-500/90 text-white border-green-500/50 shadow-sm'
                                    : 'bg-transparent text-gray-700 dark:text-gray-200 border-transparent hover:bg-white/50 dark:hover:bg-gray-700/50'
                                    }`}
                                title={isUnlocked ? "Bloquear Posição" : "Liberar Movimento"}
                                style={{ width: '28px', height: '28px' }}
                            >
                                {isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
                            </button>

                            {/* Botão EDITAR */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onEdit) onEdit(item.id, item.name);
                                }}
                                className="bg-transparent text-gray-700 dark:text-gray-200 border border-transparent p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 flex items-center justify-center transition-colors"
                                style={{ width: '28px', height: '28px' }}
                                title="Editar Propriedades"
                            >
                                <Edit3 size={14} />
                            </button>

                            {/* Botão DETALHES (Novo, para igualar ao cabo) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpen) onOpen(item.id);
                                }}
                                className="bg-transparent text-gray-700 dark:text-gray-200 border border-transparent p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 flex items-center justify-center transition-colors"
                                style={{ width: '28px', height: '28px' }}
                                title="Abrir Detalhes"
                            >
                                <DoorOpen size={14} />
                            </button>

                            {/* Botão EXCLUIR */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDelete) onDelete(item.id);
                                }}
                                className="bg-transparent text-red-600 dark:text-red-400 border border-transparent p-1.5 rounded-full hover:bg-red-100/50 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors shadow-none"
                                style={{ width: '28px', height: '28px' }}
                                title="Excluir Item"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </DraggableToolbar>
                </Popup>
            )}
        </Marker>
    );
}, (prev, next) => { // Só re-renderiza os ícones caso algum desses parametro mudar
    return (
        prev.item.id === next.item.id &&
        prev.item.name === next.item.name &&
        prev.item.lat === next.item.lat &&
        prev.item.lng === next.item.lng &&
        prev.item.color === next.item.color &&
        prev.item.iconType === next.item.iconType &&
        prev.isSelected === next.isSelected &&
        prev.isPickingSelected === next.isPickingSelected &&
        prev.showLabel === next.showLabel &&
        prev.isPickingMode === next.isPickingMode &&
        prev.item.type === next.item.type &&
        prev.item._readOnly === next.item._readOnly
    );
});

const EditableCable = memo(({ cable, posA, posB, saveItem, isSelected, onSelect, onEdit, onDelete, onOpen, onSplit }) => {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [clickPosition, setClickPosition] = useState(null);

    // Reseta estado se perder seleção
    useEffect(() => {
        if (!isSelected) {
            setIsUnlocked(false);
            setClickPosition(null);
        }
    }, [isSelected]);

    const waypointsArr = useMemo(() => (cable.waypoints || []).map(wp => [wp.lat, wp.lng]), [cable.waypoints]);
    const positions = [posA, ...waypointsArr, posB];

    // Clique na Linha
    const handleLineClick = (e) => {
        L.DomEvent.stopPropagation(e);

        // 1. GRAVA A POSIÇÃO IMEDIATAMENTE
        setClickPosition(e.latlng);

        if (!isSelected) {
            onSelect(cable.id);
            return;
        }

        if (!isUnlocked) return;

        // Lógica de adicionar ponto (waypoint)
        const { lat, lng } = e.latlng;
        const newWaypoints = [...(cable.waypoints || [])];

        let bestIndex = newWaypoints.length;
        let minAddedDist = Infinity;
        const allPoints = [L.latLng(posA), ...newWaypoints.map(wp => L.latLng(wp)), L.latLng(posB)];
        const clickPt = L.latLng(lat, lng);

        for (let i = 0; i < allPoints.length - 1; i++) {
            const p1 = allPoints[i];
            const p2 = allPoints[i + 1];
            const originalDist = p1.distanceTo(p2);
            const newDist = p1.distanceTo(clickPt) + clickPt.distanceTo(p2);
            const addedDist = newDist - originalDist;

            if (addedDist < minAddedDist) {
                minAddedDist = addedDist;
                bestIndex = i;
            }
        }

        newWaypoints.splice(bestIndex, 0, { lat, lng });
        saveItem({ ...cable, waypoints: newWaypoints });
    };

    const handleLineDblClick = (e) => {
        L.DomEvent.stopPropagation(e);
        e.originalEvent.preventDefault();
        if (onOpen) onOpen(cable.id, e.latlng);
    };

    const handleDragHandle = (index, lat, lng) => {
        const newWaypointsList = [...(cable.waypoints || [])];
        newWaypointsList[index] = { lat, lng };
        saveItem({ ...cable, waypoints: newWaypointsList });
    };

    const handleRemoveHandle = (index) => {
        const newWaypointsList = (cable.waypoints || []).filter((_, i) => i !== index);
        saveItem({ ...cable, waypoints: newWaypointsList });
    };

    const showEditControls = isSelected && isUnlocked;

    return (
        <>
            {/* Linha Invisível (Hitbox maior) */}
            <Polyline
                positions={positions}
                pathOptions={{ color: 'transparent', weight: 20 }}
                eventHandlers={{ click: handleLineClick, dblclick: handleLineDblClick }}
            />

            {/* Linha Visível */}
            <Polyline
                positions={positions}
                pathOptions={{
                    color: cable.color || '#334155',
                    weight: isSelected ? 5 : 4,
                    opacity: isSelected ? 1 : 0.8,
                    dashArray: showEditControls ? '10, 10' : null
                }}
                eventHandlers={{ click: handleLineClick, dblclick: handleLineDblClick }}
            />
            {/* --- O POPUP AGORA ESTÁ AQUI FORA (IRMÃO DA POLYLINE) --- */}
            {isSelected && clickPosition && (
                <Popup
                    position={clickPosition}
                    closeButton={false}
                    className="hide-leaflet-popup-tail"
                    offset={[0, -5]}
                    autoPan={false}
                >
                    <DraggableToolbar>
                        {/* --- NOME DO CABO (EM CIMA) --- */}
                        <div className="w-full text-center border-b border-gray-300/50 dark:border-gray-600/50 pb-1.5 mb-1.5">
                            <span className="text-[10px] font-bold text-black dark:text-white block truncate max-w-[180px] mx-auto px-1">
                                {cable.name}
                            </span>
                        </div>

                        {/* --- BOTÕES (EMBAIXO, LADO A LADO) --- */}
                        <div className="flex flex-row items-center justify-center gap-1.5 w-full">

                            <button
                                onClick={(e) => { e.stopPropagation(); setIsUnlocked(!isUnlocked); }}
                                className={`p-1.5 rounded-full flex items-center justify-center transition-colors border ${isUnlocked ? 'bg-green-500/90 text-white border-green-500/50 shadow-sm' : 'bg-transparent text-gray-700 dark:text-gray-200 border-transparent hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                                title={isUnlocked ? "Bloquear" : "Desbloquear"}
                                style={{ width: '28px', height: '28px' }}
                            >
                                {isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(cable.id, cable.name); }}
                                className="bg-transparent text-gray-700 dark:text-gray-200 border border-transparent p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 flex items-center justify-center transition-colors"
                                style={{ width: '28px', height: '28px' }}
                                title="Editar"
                            >
                                <Edit3 size={14} />
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); if (onOpen) onOpen(cable.id, clickPosition); }}
                                className="bg-transparent text-gray-700 dark:text-gray-200 border border-transparent p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50 flex items-center justify-center transition-colors"
                                style={{ width: '28px', height: '28px' }}
                                title="Detalhes"
                            >
                                <DoorOpen size={14} />
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(cable.id); }}
                                className="bg-transparent text-red-600 dark:text-red-400 border border-transparent p-1.5 rounded-full hover:bg-red-100/50 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors shadow-none"
                                style={{ width: '28px', height: '28px' }}
                                title="Excluir"
                            >
                                <Trash2 size={14} />
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); if (onSplit) onSplit(cable.id, clickPosition); }}
                                className="bg-transparent text-orange-600 dark:text-orange-400 border border-transparent p-1.5 rounded-full hover:bg-orange-100/50 dark:hover:bg-orange-900/40 flex items-center justify-center transition-colors shadow-none"
                                style={{ width: '28px', height: '28px' }}
                                title="Seccionar (Dividir)"
                            >
                                <Scissors size={14} className="rotate-90" />
                            </button>
                        </div>
                    </DraggableToolbar>
                </Popup>
            )}

            {/* Waypoints (Handles) */}
            {showEditControls && waypointsArr.map((wp, idx) => (
                <Marker
                    key={`${cable.id}-wp-${idx}`}
                    position={wp}
                    icon={createHandleIcon()}
                    draggable={true}
                    eventHandlers={{
                        dragend: (e) => { const { lat, lng } = e.target.getLatLng(); handleDragHandle(idx, lat, lng); },
                        contextmenu: (e) => { L.DomEvent.stopPropagation(e); handleRemoveHandle(idx); },
                        click: (e) => L.DomEvent.stopPropagation(e)
                    }}
                />
            ))}
        </>
    );
}, (prev, next) => {
    return (
        prev.cable.id === next.cable.id &&
        prev.cable.name === next.cable.name &&
        prev.cable.color === next.cable.color &&
        JSON.stringify(prev.cable.waypoints) === JSON.stringify(next.cable.waypoints) &&
        prev.posA[0] === next.posA[0] && prev.posA[1] === next.posA[1] &&
        prev.posB[0] === next.posB[0] && prev.posB[1] === next.posB[1] &&
        prev.isSelected === next.isSelected
    );
});

// --- FERRAMENTA DE RÉGUA ---
const RulerTool = ({ isActive, onDistanceChange }) => {
    const map = useMap(); // Acesso direto à instância do mapa para pegar o centro
    const [points, setPoints] = useState([]);
    const [centerPos, setCenterPos] = useState(null); // Guarda a posição central do mapa

    // 1. Configuração inicial e Reset
    useEffect(() => {
        if (isActive) {
            // Assim que ativa, pega o centro atual para a linha elástica já aparecer
            setCenterPos(map.getCenter());
        } else {
            // Limpa tudo ao desligar
            setPoints([]);
            setCenterPos(null);
            if (onDistanceChange) onDistanceChange(0);
        }
    }, [isActive, map, onDistanceChange]);

    useMapEvents({
        // 2. Detecta quando o mapa é movido (arrastado)
        move() {
            if (!isActive) return;
            // Atualiza a ponta da linha elástica para o novo centro
            setCenterPos(map.getCenter());
        },
        // 3. Ao clicar em QUALQUER lugar, o ponto é criado no CENTRO
        click() {
            if (!isActive) return;
            const currentCenter = map.getCenter();
            setPoints(prev => [...prev, currentCenter]);
        },
        // 4. Botão direito para desfazer (Undo)
        contextmenu(e) {
            if (!isActive) return;
            L.DomEvent.stopPropagation(e);
            e.originalEvent.preventDefault();
            // Remove o último ponto
            setPoints(prev => {
                if (prev.length > 0) return prev.slice(0, -1);
                return prev;
            });
        }
    });

    // 5. Cálculo da Distância Total
    const totalDistance = useMemo(() => {
        // Se não houver pontos nem posição central, a distância é 0
        if (points.length === 0 && !centerPos) return 0;

        let dist = 0;

        // Soma a distância entre os pontos fixos já criados
        for (let i = 0; i < points.length - 1; i++) {
            dist += points[i].distanceTo(points[i + 1]);
        }

        // Soma a distância do último ponto até a mira central (o elástico)
        if (points.length > 0 && centerPos) {
            dist += points[points.length - 1].distanceTo(centerPos);
        }

        return dist;
    }, [points, centerPos]);

    // Envia para o pai exibir na tela (COM PROTEÇÃO ANTI-LOOP)
    useEffect(() => {
        if (onDistanceChange) {
            // setTimeout joga a atualização para o final da fila de execução,
            // quebrando o ciclo síncrono que causa o erro "Maximum update depth"
            const timer = setTimeout(() => {
                onDistanceChange(totalDistance);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [totalDistance, onDistanceChange]);

    if (!isActive) return null;

    return (
        <>
            {/* Linha Fixa (segmentos já confirmados) */}
            {points.length > 1 && (
                <Polyline
                    positions={points}
                    pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.8 }}
                />
            )}

            {/* Linha Elástica (do último ponto até o centro da tela) */}
            {points.length > 0 && centerPos && (
                <Polyline
                    positions={[points[points.length - 1], centerPos]}
                    pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '10, 10', opacity: 0.6 }}
                />
            )}

            {/* Marcadores dos pontos fixos */}
            {points.map((p, i) => (
                <CircleMarker
                    key={i}
                    center={p}
                    radius={4}
                    pathOptions={{ color: '#fff', fillColor: '#f59e0b', fillOpacity: 1, weight: 2 }}
                />
            ))}

            <div className="map-regua"><Crosshair size={25} strokeWidth={2} style={{ filter: 'drop-shadow(0 0 0 2px black)' }} /></div>
        </>
    );
};

const FiberMap = ({
    items, saveItem, isDarkMode, interactionMode, onMapClick, onNodeClick, isPickingMode, flyToCoords,
    allItems, onEdit, onDelete, onOpen, onSplit, onClearSearch, cableStartNodeId, onLocationFound, onAlertRequest
}) => {
    const defaultCenter = [0, 0];
    const [selectedId, setSelectedId] = useState(null);
    const [showLabels, setShowLabels] = useState(false); // Substituiu zoomLevel numérico por booleano
    const [isHelpExpanded, setIsHelpExpanded] = useState(false); // Começa aberto
    const [measureDistance, setMeasureDistance] = useState(0);
    const [toggleCluster, setToggleCluster] = useState(true); // Cluster ativado por padrão

    const searchIcon = useMemo(() => createSearchIcon(), []);

    // Função para formatar metros/km
    const formatDist = (d) => {
        if (d < 1000) return `${Math.round(d)} m`;
        return `${(d / 1000).toFixed(2)} km`;
    };

    // Memoização das listas para evitar recálculo de filtros a cada render
    const mapNodes = useMemo(() => items.filter(i =>
        !i.parentId &&
        (ITEM_TYPES[i.type]?.category === 'NODE' || i.type === 'CLIENT')
    ), [items]);

    const mapCables = useMemo(() => items.filter(i => i.type === 'CABLE'), [items]);

    // Otimização: getNodePosition agora busca direto no Map (dicionário) se possível
    // Mas como allItems é array, mantemos o find. Porém, só rodará dentro do render dos cabos.
    const getNodePosition = (nodeId) => {
        const sourceList = allItems || items;
        let node = sourceList.find(i => i.id === nodeId);
        if (!node) return null;
        if (node.parentId) node = sourceList.find(i => i.id === node.parentId);
        if (!node) return null;
        if (node.lat !== undefined && node.lng !== undefined) return [node.lat, node.lng];
        return null;
    };

    const tileLayerInfo = isDarkMode ? {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors'
    } : {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    };

    // FUNÇÃO AUXILIAR: Para limpar a busca e selecionar o item ao mesmo tempo
    const handleSelection = (id) => {
        setSelectedId(id);
        if (onClearSearch) onClearSearch(); // Remove o pin vermelho
    };

    // --- LÓGICA NOVA: Identifica o item selecionado ---
    const selectedItem = useMemo(() => items.find(i => i.id === selectedId), [items, selectedId]);

    // Defina qual layer começa ativa (no seu caso, parece ser Satélite)
    const [activeBaseLayer, setActiveBaseLayer] = useState('Satélite');
    // Componente para "ouvir" a troca de layer do mapa
    const LayerTracker = ({ setLayer }) => {
        useMapEvents({
            baselayerchange: (e) => {
                setLayer(e.name); // Atualiza o estado com o nome da layer ("Ruas" ou "Satélite")
            }
        });
        return null;
    };

    return ( // const FiberMap
        <div className="w-full h-full relative z-0">

            {/* --- MIRA CENTRAL (adição de nodes/clientes por centro) --- */}
            {(interactionMode === 'ADD_NODE' || interactionMode === 'ADD_CLIENT' || interactionMode === 'ADD_OBJECT') && (
                <div
                    className="absolute inset-0 pointer-events-none z-[900] flex items-center justify-center"
                    aria-hidden="true"
                >
                    <Crosshair size={25} strokeWidth={2} className="text-blue" style={{ filter: 'drop-shadow(0 0 0 2px black)' }} />
                </div>
            )}

            {/* --- CAIXA FLUTUANTE DA RÉGUA --- */}
            {interactionMode === 'MEASURE' && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-lg flex items-center gap-2 animate-in slide-in-from-top-4 fade-in">
                    <Ruler size={20} />
                    <span>{formatDist(measureDistance)}</span>
                </div>
            )}

            <MapContainer
                center={defaultCenter}
                zoom={1}
                zoomSnap={0} // 1. O segredo da fluidez: 0 permite qualquer valor decimal (ex: 5.12)
                zoomDelta={1} // 2. Define quanto o zoom pula ao clicar nos botões + e - ou duplo clique
                wheelPxPerZoomLevel={30} // 3. Ajusta a sensibilidade do scroll do mouse (quanto menor, mais rápido o zoom)
                maxBounds={[[-90, -180], [90, 180]]} // 4. Define os limites geográficos do mapa
                maxBoundsViscosity={1.0} // 5. Define a viscosidade dos limites geográficos
                zoomAnimation={true} // 6. Habilita a animação de zoom
                zoomAnimationDuration={1} // 7. Define a duração da animação de zoom

                minZoom={3}
                style={{ height: '100%', width: '100%' }}

                // 1. ZoomControl false (vamos adicionar manualmente na ordem certa)
                zoomControl={false}
                attributionControl={false}
                boxZoom={true}

                // 2. RotateControl (PRIMEIRO DA LISTA - TOP)
                rotate={true}
                touchRotate={true}
                rotateControl={false}
            >

                {/* Botão de Toggle do Cluster */}
                <button
                    onClick={() => setToggleCluster(!toggleCluster)}
                    className={`absolute top-20 right-3 z-[900] max-w-[50px] p-2 backdrop-blur-xl rounded-2xl shadow-2xl border transition-all ${toggleCluster
                        ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
                        : 'bg-white/40 dark:bg-black/60 text-black dark:text-white border-white/60 dark:border-black/60 hover:bg-white/60 dark:hover:bg-black/80'
                        }`}
                    title={toggleCluster ? 'Desagrupar Ícones' : 'Agrupar Ícones'}
                >
                    {toggleCluster ? <Ungroup size={24} /> : <Group size={24} />}
                </button>

                <CustomRotateControl />

                {/* 5. ZoomControl (QUARTO DA LISTA - BOTTOM) */}
                <ZoomControl position="bottomright" />

                {/* 4. LocationControl (TERCEIRO DA LISTA) */}
                <LocationControl onLocationFound={onLocationFound} onAlertRequest={onAlertRequest} />

                {/* 3. LayersControl (SEGUNDO DA LISTA) */}
                <LayerTracker setLayer={setActiveBaseLayer} />
                <LayersControl position="bottomright">
                    <LayersControl.BaseLayer
                        checked={activeBaseLayer === 'Ruas'}
                        name="Ruas"
                    >
                        <TileLayer
                            // REMOVI A KEY DAQUI para evitar que ele desmonte o componente
                            attribution={tileLayerInfo.attribution}
                            url={tileLayerInfo.url}
                            maxNativeZoom={19}
                            maxZoom={20}
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer
                        checked={activeBaseLayer === 'Satélite'}
                        name="Satélite"
                    >
                        <TileLayer
                            attribution='Tiles &copy; Esri'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            maxNativeZoom={17}
                            maxZoom={20}
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                <FlyToHandler coords={flyToCoords} />
                {/* --- NOVO: MARCADOR DE BUSCA --- */}
                {flyToCoords && (
                    <Marker
                        position={[flyToCoords[0], flyToCoords[1]]}
                        icon={searchIcon} // <--- Agora usamos a variável criada no topo
                        zIndexOffset={2000}
                    >
                        {/* <Tooltip direction="top" offset={[0, -40]} opacity={1} permanent>
                            <div className="text-xs font-bold text-red-600 px-1">
                                Local Encontrado
                            </div>
                        </Tooltip> */}
                    </Marker>
                )}

                <MapClickHandler onMapBgClick={onMapClick} interactionMode={interactionMode} onDeselect={() => { setSelectedId(null); if (onClearSearch) onClearSearch(); }} />

                {/* Aqui está o segredo do zoom: Só atualiza estado se mudar a visibilidade */}
                <MapZoomHandler onShowLabelsChange={setShowLabels} />

                <RulerTool
                    isActive={interactionMode === 'MEASURE'}
                    onDistanceChange={setMeasureDistance}
                />

                <RotationHandler />

                {mapCables.map(cable => {
                    const posA = getNodePosition(cable.fromNode);
                    const posB = getNodePosition(cable.toNode);
                    if (posA && posB) {
                        return (
                            <EditableCable
                                key={cable.id}
                                cable={cable}
                                posA={posA}
                                posB={posB}
                                saveItem={saveItem}
                                isSelected={selectedId === cable.id}
                                onSelect={handleSelection}
                                onEdit={() => onEdit(cable.id, cable.name)}
                                onDelete={() => onDelete(cable.id)}
                                onOpen={() => onOpen(cable.id)}
                                onSplit={onSplit}
                            // onReconnect={onReconnect}
                            />
                        );
                    }
                    return null;
                })}

                {/* INÍCIO DO CLUSTER */}
                {/* chunkedLoading ajuda a carregar milhares de pontos sem travar */}
                <MarkerClusterGroup
                    key={toggleCluster ? 'cluster-on' : 'cluster-off'}
                    chunkedLoading

                    /* SOLUÇÃO 2: Desliga o agrupamento quando chegas perto (Zoom 16 ou mais) */
                    disableClusteringAtZoom={toggleCluster ? 21 : 1}

                    /* Ajuste visual: Aumenta um pouco o raio para ficar mais organizado */
                    maxClusterRadius={50}

                    /* Se tiveres itens EXATAMENTE no mesmo lugar, ele ainda faz o efeito aranha */
                    spiderfyOnMaxZoom={true}

                    /* Ajuste fino: Se clicares na bolinha, ele dá zoom até mostrar os itens */
                    zoomToBoundsOnClick={true}
                >
                    {mapNodes.map(node => {
                        const hasPosition = node.lat !== undefined && node.lat !== null && node.lng !== undefined && node.lng !== null;
                        const position = hasPosition ? [node.lat, node.lng] : defaultCenter;

                        return (
                            <DraggableMarker
                                key={node.id}
                                item={node}
                                position={position}
                                saveItem={saveItem}
                                onNodeClick={onNodeClick}
                                isSelected={selectedId === node.id}
                                showLabel={showLabels}
                                onSelectLocal={handleSelection}
                                isPickingMode={isPickingMode}
                                isPickingSelected={isPickingMode && node.id === cableStartNodeId}
                                onEdit={() => onEdit(node.id, node.name)}
                                onDelete={() => onDelete(node.id)}
                                onOpen={onOpen}
                            />
                        );
                    })}

                </MarkerClusterGroup>
                {/* FIM DO CLUSTER */}

            </MapContainer>

            {/* --- CAIXA DE AJUDA / INSTRUÇÕES (Glassmorphic) --- */}
            <div className={`
                absolute top-20 left-3 z-[900] 
                bg-white/40 dark:bg-black/60 
                border border-white/60 dark:border-black/60 
                backdrop-blur-xl rounded-2xl shadow-2xl
                text-black dark:text-white
                transition-all duration-300 ease-in-out overflow-hidden
                ${isHelpExpanded ? 'max-w-[220px] p-4' : 'max-w-[50px] p-2'}
            `}>

                {/* Cabeçalho com Botão Toggle */}
                <div
                    className={`flex items-center ${isHelpExpanded ? 'justify-between pb-2 mb-2 border-b border-white/60 dark:border-black/60' : 'justify-center'} cursor-pointer`}
                    onClick={() => setIsHelpExpanded(!isHelpExpanded)}
                    title={isHelpExpanded ? "Minimizar" : "Mostrar Instruções"}
                >
                    {isHelpExpanded ? (
                        <span className="font-bold text-xs flex items-center gap-1.5">
                            <Info size={14} className="text-blue-600" />
                            Instruções
                        </span>
                    ) : (
                        <Info size={24} className="text-blue-600 dark:text-blue-400" />
                    )}

                    {isHelpExpanded && (
                        <button className="opacity-60 hover:opacity-100 transition-opacity">
                            <ChevronUp size={14} />
                        </button>
                    )}
                </div>

                {/* Conteúdo (Só renderiza se estiver expandido) */}
                {isHelpExpanded && (
                    <div className="text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                        {interactionMode === 'SELECT' ? (
                            <>
                                <p className="font-bold mb-1">Navegação</p>
                                <ul className="opacity-80 space-y-1 list-disc pl-3 leading-tight">
                                    <li><strong>Arrastar:</strong> Move o mapa.</li>
                                    <li><strong>Clique no item:</strong> Seleciona itens.</li>
                                    <li><strong>Duplo clique no item:</strong> Abre detalhes.</li>
                                </ul>
                            </>
                        ) : interactionMode === 'MEASURE' ? (
                            <>
                                <p className="font-bold mb-1">Régua</p>
                                <ul className="opacity-80 space-y-1 list-disc pl-3 leading-tight">
                                    <li><strong>Arrastar:</strong> Move o mapa.</li>
                                    <li><strong>Clique/Botão Esq. Mouse:</strong> Adiciona pontos.</li>
                                    <li><strong>Clique Longo/Botão Dir. Mouse:</strong> Remove último ponto adicionado.</li>
                                </ul>
                            </>
                        ) : interactionMode === 'ADD_NODE' ? (
                            <>
                                <p className="font-bold mb-1">Adicionar Equipamento</p>
                                <ul className="opacity-80 space-y-1 list-disc pl-3 leading-tight">
                                    <li><strong>Posicione a mira</strong> sobre o local desejado.</li>
                                    <li><strong>Clique</strong> em qualquer lugar para confirmar.</li>
                                </ul>
                            </>
                        ) : interactionMode === 'ADD_CLIENT' ? (
                            <>
                                <p className="font-bold mb-1">Adicionar Cliente</p>
                                <ul className="opacity-80 space-y-1 list-disc pl-3 leading-tight">
                                    <li><strong>Posicione a mira</strong> sobre o local desejado.</li>
                                    <li><strong>Clique</strong> em qualquer lugar para adicionar.</li>
                                </ul>
                            </>
                        ) : interactionMode === 'DRAW_CABLE' ? (
                            <>
                                <p className="font-bold mb-1">Adicionar Cabo</p>
                                <ul className="opacity-80 space-y-1 list-disc pl-3 leading-tight">
                                    <li><strong>Clique no 1º equipamento</strong> para definir a origem do cabo.</li>
                                    <li><strong>Clique no 2º equipamento</strong> para definir o destino e criar o cabo.</li>
                                    <li>Após criar, selecione o cabo e desbloqueie o cadeado para ajustar a rota.</li>
                                </ul>
                            </>
                        ) : (
                            <>
                                <p className="font-bold mb-1">Navegação</p>
                                <ul className="opacity-80 space-y-1 list-disc pl-3 leading-tight">
                                    <li><strong>Arrastar:</strong> Move o mapa.</li>
                                    <li><strong>Clique no item:</strong> Seleciona itens.</li>
                                    <li><strong>Duplo clique no item:</strong> Abre detalhes.</li>
                                </ul>
                            </>
                        )}
                        {/* --- MENSAGEM DE SELEÇÃO --- */}
                        {selectedItem && (
                            <>
                                <div className="border-t border-white/60 dark:border-black/60 my-2" />
                                <p className="font-bold mb-2">{selectedItem.type === 'CABLE' ? "Cabo Selecionado" : "Item Selecionado"}</p>
                                <ul className="opacity-80 space-y-2 leading-tight">

                                    <li className="flex items-center gap-2">
                                        <Lock size={12} />
                                        {selectedItem.type === 'CABLE' ? <span>Desbloqueia o cabo para ajustar a rota</span> : <span>Desbloqueia o item para arrastar</span>}
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <Edit3 size={12} />
                                        {selectedItem.type === 'CABLE' ? <span>Editar propriedades do cabo</span> : <span>Editar propriedades do item</span>}
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <DoorOpen size={12} />
                                        {selectedItem.type === 'CABLE' ? <span>Abrir detalhes do cabo</span> : <span>Abrir detalhes do item</span>}
                                    </li>

                                    <li className="flex items-center gap-2">
                                        <Trash2 size={12} />
                                        {selectedItem.type === 'CABLE' ? <span>Excluir cabo</span> : <span>Excluir item</span>}
                                    </li>

                                    {selectedItem.type === 'CABLE' && (
                                        <li className="flex items-center gap-2">
                                            <Scissors size={12} />
                                            <span>Seccionar (Cortar) cabo</span>
                                        </li>
                                    )}

                                </ul>
                            </>
                        )}
                    </div>
                )}


            </div>


        </div >
    );
};

export default memo(FiberMap);