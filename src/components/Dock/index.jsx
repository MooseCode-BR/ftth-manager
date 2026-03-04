// Dock uai

import './styles.css';
import React, { useState } from 'react';
import {
    MousePointer2, BoxSelect,
    PackagePlus, Network, Filter, Ruler, FolderOpen, FolderClosed,
    Map as MapIcon, RadioTower,
    Sun, Moon, Settings, HouseWifi,
    Route,
    MapPin
} from 'lucide-react';
import { CEOIcon, CTOIcon, PostIcon } from '../../icons'; //Importação de Ícones

// Botão Genérico do Dock (Compacto)
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
            className={`dock-btn ${isActive ? 'dock-btn-active' : 'dock-btn-idle'}`}
            title={label}
        >
            <DisplayIcon size={20} className={isActive ? "dock-icon-active" : (colorClass || "dock-icon-default")} />

            <span className="dock-tooltip">
                {label}
            </span>
        </button>
    );
};

const Divider = () => (
    <div className="dock-divider"></div>
);

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

    const categories = [
        {
            id: 'select',
            defaultIcon: MousePointer2,
            label: 'Seleção',
            items: [
                { id: 'SELECT', icon: MousePointer2, label: 'Ponteiro', action: () => setActiveTool('SELECT') },
                ...(viewMode === 'CANVAS' ? [{ id: 'RULER', icon: BoxSelect, label: 'Área', action: () => setActiveTool('RULER') }] : [{ id: 'MEASURE', icon: Ruler, label: 'Régua', action: () => setActiveTool('MEASURE') }])
            ]
        },
        {
            id: 'add', //draw
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
    ];

    // 2. Função auxiliar para descobrir qual ícone mostrar no botão da categoria
    const getCategoryIcon = (category) => {
        // Busca se algum item desta categoria é a ferramenta ativa no momento
        const activeItem = category.items.find(item => item.id === activeTool);

        // Se achou o item ativo, retorna o ícone dele. Se não, retorna o ícone padrão.
        return activeItem ? activeItem.icon : category.defaultIcon;
    };

    return (
        <div
            className="dock-wrapper"
            onMouseLeave={() => setActiveCategory(null)}
        >

            {/* --- EXTENSÃO DO DOCK (SUB-MENU) --- */}
            {activeCategory && (
                <div className="dock-submenu-container">
                    {categories.find(c => c.id === activeCategory)?.items.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { item.action(); setActiveCategory(null) }}
                            className={`dock-submenu-item ${activeTool === item.id
                                ? 'submenu-item-active'
                                : 'submenu-item-idle'
                                }`}
                        >
                            <item.icon size={14} />
                            {item.label}
                        </button>
                    ))}
                </div>
            )}

            {/* --- DOCK PRINCIPAL --- */}
            <div className="dock-main-bar">
                {/* 5.5 Gerenciador de Projetos */}
                <DockBtn
                    icon={FolderClosed}
                    hoverIcon={FolderOpen}
                    label="Projetos"
                    isActive={false}
                    onClick={() => { onManageProjects(); setActiveCategory(null); }}
                //colorClass="text-blue-600 dark:text-blue-400"
                />

                <Divider />

                {/* 1. Categorias Expansíveis (MOBILE) vs Itens Individuais (DESKTOP) */}
                {categories.map((cat, catIdx) => (
                    <React.Fragment key={cat.id}>
                        {/* Mobile: Botão da Categoria */}
                        <div className="md:hidden">
                            {(() => {
                                const activeItem = cat.items.find(item => item.id === activeTool);
                                const currentIcon = activeItem ? activeItem.icon : cat.defaultIcon;
                                const currentColor = activeItem ? "text-blue-600 dark:text-blue-600" : undefined;
                                return (
                                    <DockBtn
                                        icon={currentIcon}
                                        label={cat.label}
                                        isActive={activeCategory === cat.id}
                                        onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                                        onMouseEnter={() => setActiveCategory(cat.id)}
                                        colorClass={currentColor}
                                    />
                                );
                            })()}
                        </div>

                        {/* Desktop: Todos os itens da Categoria diretamente */}
                        <div className="hidden md:flex items-center gap-2">
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

                        {/* Divisor entre categorias no Desktop */}
                        {catIdx < categories.length - 1 && <div className="hidden md:block"><Divider /></div>}
                    </React.Fragment>
                ))}

                <Divider />

                {/* 2. Novo Cliente */}
                {/* <DockBtn
                    icon={UserPlus}
                    label="Novo Cliente"
                    isActive={activeTool === 'ADD_CLIENT'}
                    onClick={() => {
                        setActiveTool(activeTool === 'ADD_CLIENT' ? 'SELECT' : 'ADD_CLIENT');
                        setActiveCategory(null);
                    }}
                    colorClass="text-emerald-600 dark:text-emerald-400"
                />

                <Divider /> */}

                {/* 3. Filtro */}
                <DockBtn
                    icon={Filter}
                    label="Filtros"
                    isActive={false}
                    onClick={() => { toggleFilterPanel(); setActiveCategory(null) }}
                />

                {/* 4. Alternar Visualização */}
                <DockBtn
                    icon={viewMode === 'MAP' ? Network : MapIcon}
                    label={viewMode === 'MAP' ? "Topologia" : "Mapa"}
                    isActive={false}
                    onClick={() => setViewMode(prev => prev === 'MAP' ? 'CANVAS' : 'MAP')}
                />

                {/* 5. Tema */}
                <DockBtn
                    icon={isDarkMode ? Sun : Moon}
                    label="Tema"
                    isActive={false}
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    colorClass="text-black dark:text-yellow-400"
                />

                <Divider />

                {/* 6. Configurações */}
                <DockBtn
                    icon={Settings}
                    label="Configurações"
                    isActive={false}
                    onClick={() => { onOpenSettings(); setActiveCategory(null); }}
                    colorClass="text-black dark:text-white"
                />
            </div>
        </div>
    );
};

export default Dock;