import './styles.css';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    MousePointer2, BoxSelect,
    PackagePlus, Network, Filter, Ruler, FolderOpen, FolderClosed,
    Map as MapIcon, RadioTower,
    Sun, Moon, Settings, HouseWifi,
    Route,
    MapPin
} from 'lucide-react';
import { CEOIcon, CTOIcon, PostIcon } from '../icons';

// --- Sub-componente: Botão Genérico do Dock ---
const DockBtn = ({ icon: Icon, hoverIcon: HoverIcon, label, isActive, onClick, onMouseEnter, onMouseLeave, colorClass = "dock-icon-default" }) => {
    const [isHovered, setIsHovered] = useState(false);
    const DisplayIcon = (isHovered && HoverIcon) ? HoverIcon : Icon;

    return (
        <button
            onClick={onClick}
            onMouseEnter={(e) => {
                setIsHovered(true);
                if (onMouseEnter) onMouseEnter(e);
            }}
            onMouseLeave={(e) => {
                setIsHovered(false);
                if (onMouseLeave) onMouseLeave(e);
            }}
            // [MELHORIA] Uso de aria-attributes para acessibilidade
            aria-pressed={isActive}
            aria-label={label}
            className={`dock-btn ${isActive ? 'dock-btn-active' : 'dock-btn-idle'}`}
        >
            <DisplayIcon size={20} className={isActive ? "dock-icon-active" : (colorClass || "dock-icon-default")} />

            {/* Tooltip escondido para leitores de tela, visível via CSS */}
            <span className="dock-tooltip" aria-hidden="true">
                {label}
            </span>
        </button>
    );
};

const Divider = () => <div className="dock-divider" aria-hidden="true"></div>;

// --- Componente Principal: Dock ---
const Dock = ({
    activeTool, setActiveTool,
    viewMode, setViewMode,
    isDarkMode, setIsDarkMode,
    onOpenSettings,
    onNewClient,
    toggleFilterPanel,
    onManageProjects
}) => {
    const [activeCategory, setActiveCategory] = useState(null);
    const dockRef = useRef(null);

    // [MELHORIA] Memoização do array. O React agora só recria essas regras se viewMode mudar.
    const categories = useMemo(() => [
        {
            id: 'select',
            defaultIcon: MousePointer2,
            label: 'Seleção',
            items: [
                { id: 'SELECT', icon: MousePointer2, label: 'Ponteiro', action: () => setActiveTool('SELECT') },
                ...(viewMode === 'CANVAS'
                    ? [{ id: 'RULER', icon: BoxSelect, label: 'Área', action: () => setActiveTool('RULER') }]
                    : [{ id: 'MEASURE', icon: Ruler, label: 'Régua', action: () => setActiveTool('MEASURE') }])
            ]
        },
        {
            id: 'add',
            defaultIcon: PackagePlus,
            label: 'Adicionar',
            items: [
                { id: 'ADD_POP', icon: HouseWifi, label: 'POP', action: () => setActiveTool('ADD_POP') },
                { id: 'ADD_CEO', icon: CEOIcon, label: 'CEO', action: () => setActiveTool('ADD_CEO') },
                { id: 'ADD_CTO', icon: CTOIcon, label: 'CTO', action: () => setActiveTool('ADD_CTO') },
                { id: 'ADD_CABLE', icon: Route, label: 'Cabo', action: () => setActiveTool('ADD_CABLE') },
                { id: 'ADD_TOWER', icon: RadioTower, label: 'Torre', action: () => setActiveTool('ADD_TOWER') },
                { id: 'ADD_POST', icon: PostIcon, label: 'Poste', action: () => setActiveTool('ADD_POST') },
                { id: 'ADD_OBJECT', icon: MapPin, label: 'Objeto', action: () => setActiveTool('ADD_OBJECT') },
            ]
        }
    ], [viewMode, setActiveTool]);

    // [MELHORIA] Lógica mobile: Fechar submenu ao clicar fora do Dock
    useEffect(() => {
        if (!activeCategory) return;
        const handleClickOutside = (e) => {
            if (dockRef.current && !dockRef.current.contains(e.target)) {
                setActiveCategory(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [activeCategory]);

    return (
        <div
            ref={dockRef}
            className="dock-wrapper"
            onMouseLeave={() => setActiveCategory(null)}
        >
            {/* --- SUB-MENU --- */}
            {activeCategory && (
                <div className="dock-submenu-container" role="menu">
                    {categories.find(c => c.id === activeCategory)?.items.map(item => (
                        <button
                            key={item.id}
                            role="menuitem"
                            onClick={() => { item.action(); setActiveCategory(null); }}
                            className={`dock-submenu-item ${activeTool === item.id ? 'submenu-item-active' : 'submenu-item-idle'}`}
                        >
                            <item.icon size={14} />
                            {item.label}
                        </button>
                    ))}
                </div>
            )}

            {/* --- DOCK PRINCIPAL --- */}
            <div className="dock-main-bar" role="toolbar" aria-label="Ferramentas principais">

                {/* Projetos (MOBILE/TABLET) */}
                <div className="lg:hidden contents">
                    <DockBtn
                        icon={FolderClosed}
                        hoverIcon={FolderOpen}
                        label="Projetos"
                        isActive={false}
                        onClick={() => { onManageProjects(); setActiveCategory(null); }}
                    />
                </div>

                {/* Categorias e Ferramentas */}
                {categories.map((cat, catIdx) => {
                    // [MELHORIA] Toda a lógica de extração de ícone e cor feita fora da árvore JSX
                    const activeItem = cat.items.find(item => item.id === activeTool);
                    const currentIcon = activeItem ? activeItem.icon : cat.defaultIcon;
                    const currentColor = activeItem ? "text-blue-600 dark:text-blue-500" : undefined;
                    const isCatActive = activeCategory === cat.id;

                    return (
                        <React.Fragment key={cat.id}>
                            {/* Compacto (< 1100px) */}
                            <div className="min-[1100px]:hidden contents">
                                <DockBtn
                                    icon={currentIcon}
                                    label={cat.label}
                                    isActive={isCatActive}
                                    onClick={() => setActiveCategory(isCatActive ? null : cat.id)}
                                    onMouseEnter={() => setActiveCategory(cat.id)}
                                    colorClass={currentColor}
                                />
                            </div>

                            {/* Expandido (>= 1100px) */}
                            <div className="hidden min-[1100px]:flex items-center gap-2">
                                {cat.items.map(item => (
                                    <DockBtn
                                        key={item.id}
                                        icon={item.icon}
                                        label={item.label}
                                        isActive={activeTool === item.id}
                                        onClick={() => { item.action(); setActiveCategory(null); }}
                                        colorClass={activeTool === item.id ? "text-blue-600 dark:text-blue-400" : undefined}
                                    />
                                ))}
                            </div>

                            {/* Divisor */}
                            {catIdx < categories.length - 1 && (
                                <div className="hidden min-[1100px]:block">
                                    <Divider />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}

                <Divider />

                {/* Alternar Visualização */}
                <DockBtn
                    icon={viewMode === 'MAP' ? Network : MapIcon}
                    label={viewMode === 'MAP' ? "Topologia" : "Mapa"}
                    isActive={false}
                    onClick={() => setViewMode(prev => prev === 'MAP' ? 'CANVAS' : 'MAP')}
                />

                {/* Tema */}
                <DockBtn
                    icon={isDarkMode ? Sun : Moon}
                    label="Tema"
                    isActive={false}
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    colorClass="text-gray-800 dark:text-yellow-400"
                />

                <Divider />

                {/* Configurações */}
                <DockBtn
                    icon={Settings}
                    label="Configurações"
                    isActive={false}
                    onClick={() => { onOpenSettings(); setActiveCategory(null); }}
                />
            </div>
        </div>
    );
};

export default Dock;