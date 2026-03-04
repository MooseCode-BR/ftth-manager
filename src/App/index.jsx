// IMPORTS ========================================================================
import './styles.css';
// ============================================================================
// IMPORTS DO REACT
// ============================================================================
// Biblioteca principal do React para construção de interfaces de usuário

// useState: Hook para gerenciar estado local de componentes
// useRef: Hook para criar referências mutáveis que persistem entre renders
// useEffect: Hook para executar efeitos colaterais (side effects) como chamadas de API, listeners, etc
// useMemo: Hook para memoizar valores computados e otimizar performance
// useCallback: Hook para memoizar funções e evitar re-criações desnecessárias
// memo: Higher-Order Component para memoizar componentes e evitar re-renders desnecessários
import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';

// ============================================================================
// GERAÇÃO DE IDs ÚNICOS E RENDERIZAÇÃO
// ============================================================================
// uuid: Gera identificadores únicos universais (UUID v4) para novos itens
import { v4 as uuidv4 } from 'uuid';
// ReactDOM: Permite criar portais para renderizar componentes fora da hierarquia DOM
import ReactDOM from 'react-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';

// ============================================================================
// ÍCONES - LUCIDE REACT
// ============================================================================
// Biblioteca de ícones SVG modernos e leves utilizados em toda a interface
import {
    Trash2, Box, Scissors, Activity, User, ArrowRightLeft, Edit3, Save, X, CircleUserRound, ZoomIn, ZoomOut,
    LogOut, Mail, Search, ShieldAlert, MapPin, Loader2, Lock, Unlock, Info, PackagePlus
} from 'lucide-react';

// ============================================================================
// IMPORTS DE ARQUIVOS DO PROJETO
// ============================================================================

// Constantes e Tipos de Itens
// ITEM_TYPES: Define todos os tipos de equipamentos (POP, CEO, CTO, SPLITTER, DIO, etc)
// ICON_MAP: Mapeia tipos de objetos para seus ícones correspondentes
import { ITEM_TYPES, ICON_MAP, VERSAO } from '../constants';

// Funções Utilitárias
// findConnection: Busca conexões específicas entre itens e portas
// downloadKML: Exporta projeto para formato KML (Google Earth)
// parseKMLImport: Importa e processa arquivos KML
// analyzeDuplicates: Detecta e analisa itens duplicados na importação
import { findConnection, downloadKML, parseKMLImport, analyzeDuplicates } from '../utils';

// Sistema de Backup
// generateBackupFile: Cria arquivo de backup completo do projeto
// restoreFromBackup: Restaura projeto a partir de arquivo de backup
import { generateBackupFile, restoreFromBackup } from '../backupSystem';

// ============================================================================
// COMPONENTES - AUTENTICAÇÃO E MODAIS
// ============================================================================

// Tela de Login/Registro
import AuthScreen from '../AuthScreen';

// Modais de Gerenciamento de Itens
import AddSlotModal from '../components/AddSlotModal'; // Adicionar slots em DIO/OLT
import AlertModal from '../components/AlertModal'; // Diálogos de alerta simples
//import ClientModal from '../components/ClientModal'; // Informações detalhadas de cliente
import ClientNameModal from '../components/ClientNameModal'; // Identificação de cliente na criação
import ConfirmModal from '../components/ConfirmModal'; // Confirmações de ações destrutivas
import ItemModal from '../components/ItemModal'; // Modal unificado de criação e edição de itens
import Dock from '../components/Dock'; // Barra de ferramentas inferior
import DuplicatesModal from '../components/DuplicatesModal'; // Tratamento de duplicatas na importação
import FixConnectionsModal from '../components/FixConnectionsModal'; // Correção de conexões na importação
import ImportModal from '../components/ImportModal'; // Configuração de importação KML
import InfoModal from '../components/InfoModal'; // Exibição de informações gerais
import NodeColorsModal from '../components/NodeColorsModal'; // Configuração de cores padrão de nós
import NotesModal from '../components/NotesModal'; // Edição de notas de itens
import PhotoGalleryModal from '../components/PhotoGalleryModal'; // Galeria de fotos de itens
import PortPickerModal from '../components/PortPickerModal'; // Seleção de portas disponíveis
import ProjectManagerModal from '../components/ProjectManagerModal'; // Gerenciador de projetos
import ReportModal from '../components/ReportModal'; // Geração de relatórios
import SettingsModal from '../components/SettingsModal'; // Configurações gerais
import StandardsModal from '../components/StandardModal'; // Padrões de cores de cabos
import TagManagerModal from '../components/TagManagerModal'; // Gerenciamento de tags
import TraceModal from '../components/TraceModal'; // Rastreamento de sinal óptico
import DetailPanel from '../itemsProp/DetailPanel'; // Painel lateral de detalhes

// ============================================================================
// FIREBASE - AUTENTICAÇÃO E BANCO DE DADOS
// ============================================================================
import { auth, db, storage } from '../firebaseConfig';
import { onAuthStateChanged, signOut, updateProfile, updatePassword, deleteUser } from "firebase/auth";
import {
    collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch, getDoc, updateDoc, getDocs,
    addDoc, where, deleteField
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// ============================================================================
// COMPONENTES ADICIONAIS
// ============================================================================
import FiberMap from '../FiberMap'; // Componente de mapa com Leaflet
import GenericModal from '../components/GenericModal'; // Modal genérico para itens simples
import { useProjectNotifications } from '../hooks/useProjectNotifications';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { ProfileModal } from '../components/ProfileModal';
// import SignalModal from '../components/SignalModal'; // Configuração de sinais
// import TagSelector from '../components/TagSelector'; // Seletor de tags para filtros
// import ConnectionWorkbench from '../itemsProp/ConnectionWorkbench'; // Bancada de conexões
// FIM IMPORTS ========================================================================


// FUNCOES ========================================================================

// COMPONENTES MEMOIZADOS (PERFORMANCE) ========================================================================
// 1. Nó do Canvas (Caixas, Clientes, etc)
// Só re-renderiza se a posição, cor, nome ou seleção mudarem.
const CanvasNodes = memo(({ node, config, isSelected, isCableStart, isDragging, onStart, onEnd, onDoubleClick, onEdit, onDelete, onSelect, onOpen }) => {

    // Estado local de bloqueio
    const [isUnlocked, setIsUnlocked] = useState(false);

    // Reseta bloqueio se perder seleção
    useEffect(() => {
        if (!isSelected) setIsUnlocked(false);
    }, [isSelected]);

    // LÓGICA DE CLIQUE E ARRASTE
    const handleNodeClick = (e) => {
        e.stopPropagation();
        if (!isSelected) {
            onSelect(node.id);
        }
        if (isUnlocked) {
            onStart(e, node);
        }
    };

    // --- LÓGICA DE ÍCONE DINÂMICO ---
    // Se for OBJECT e tiver iconType, usa ele. Se não, usa o ícone da config do tipo (config.icon)
    const IconComponent = (node.type === 'OBJECT' && node.iconType && ICON_MAP[node.iconType])
        ? ICON_MAP[node.iconType]
        : (config.icon || Settings2);

    return (
        <div
            onMouseDown={handleNodeClick}
            onMouseUp={(e) => onEnd(e, node)}
            onTouchStart={handleNodeClick}
            onTouchEnd={(e) => onEnd(e, node)}
            onDoubleClick={(e) => onDoubleClick(e, node)}
            style={{
                left: node.x,
                top: node.y,
                width: config.width,
                // Se for arrastado, muda a ordem Z para ficar por cima de tudo
                zIndex: isDragging ? 100 : (isSelected ? 50 : 10)
            }}
            className={`
                absolute rounded-lg border-2 transition-all 
                ${isSelected
                    ? 'border-blue-600 shadow-xl ring-2 ring-blue-300 dark:ring-blue-900'
                    : 'border-slate-300 dark:border-gray-600 hover:border-blue-400 shadow-sm'
                } 
                ${isDragging ? 'opacity-80 cursor-grabbing' : ''}
                ${isUnlocked ? 'cursor-grab' : 'cursor-default'} 
                bg-white dark:bg-gray-800 group select-none
            `}
        >
            {/* Faixa Colorida no Topo */}
            <div className="h-2 rounded-t-md w-full transition-colors" style={{ backgroundColor: node.color || config.defaultColor || '#000000' }}></div>

            {/* Conteúdo do Card */}
            <div className="p-3 flex flex-col gap-1">
                {/* Cabeçalho do Card (Ícone + Tipo) */}
                <div className="flex items-center gap-2 opacity-70">
                    <IconComponent size={14} className="text-gray-600 dark:text-gray-300" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">
                        {config.label}
                    </span>
                </div>

                {/* Nome do Node */}
                <div className="font-semibold text-sm truncate text-gray-800 dark:text-gray-100" title={node.name}>
                    {node.name}
                </div>
            </div>

            {/* --- TOOLBAR (MENU DE AÇÕES) --- 
                Renderiza acima do node, estilo "Popup" igual ao do mapa
            */}
            {/* Toolbar: não exibe quando o nó é o 1º selecionado no modo DRAW_CABLE */}
            {isSelected && !isCableStart && (
                <div
                    className="absolute -top-[76px] left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-2 fade-in duration-200"
                    onMouseDown={(e) => e.stopPropagation()} // Clicar na toolbar não arrasta o node
                >
                    {/* Seta/Triângulo embaixo do popup */}
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-gray-800 border-b border-r border-gray-300 dark:border-gray-600 rotate-45 transform z-0"></div>

                    {/* Container Principal do Popup */}
                    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600 p-1 flex flex-col items-center min-w-[120px] z-10">

                        {/* 1. Nome no Topo (Header) */}
                        <div className="w-full text-center border-b border-gray-200 dark:border-gray-700 pb-1 mb-1">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 block truncate max-w-[140px] mx-auto px-1">
                                {node.name}
                            </span>
                        </div>

                        {/* 2. Botões de Ação (Linha) */}
                        <div className="flex items-center gap-1">
                            {/* TRAVAR / DESTRAVAR */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsUnlocked(!isUnlocked); }}
                                className={`p-1.5 rounded flex items-center justify-center transition-colors border ${isUnlocked
                                    ? 'bg-green-500 text-white border-green-600'
                                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                    }`}
                                title={isUnlocked ? "Bloquear Posição" : "Liberar Movimento"}
                                style={{ width: '26px', height: '26px' }}
                            >
                                {isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
                            </button>

                            {/* EDITAR */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(node.id, node.name); }}
                                className="bg-white text-blue-500 border border-blue-200 p-1.5 rounded hover:bg-blue-50 dark:bg-gray-700 dark:border-gray-600 dark:text-blue-400 flex items-center justify-center"
                                style={{ width: '26px', height: '26px' }}
                                title="Editar"
                            >
                                <Edit3 size={14} />
                            </button>

                            {/* DETALHES (Novo) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); if (onOpen) onOpen(node.id); }}
                                className="bg-white text-green-600 border border-green-200 p-1.5 rounded hover:bg-green-50 dark:bg-gray-700 dark:border-gray-600 dark:text-green-400 flex items-center justify-center"
                                style={{ width: '26px', height: '26px' }}
                                title="Detalhes"
                            >
                                <Info size={14} />
                            </button>

                            {/* EXCLUIR */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                                className="bg-white text-red-500 border border-red-200 p-1.5 rounded hover:bg-red-50 dark:bg-gray-700 dark:border-gray-600 dark:text-red-400 flex items-center justify-center"
                                style={{ width: '26px', height: '26px' }}
                                title="Excluir"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}, (prev, next) => { // Só re-renderiza os ícones caso algum desses parametro mudar
    return (
        prev.node.x === next.node.x &&
        prev.node.y === next.node.y &&
        prev.node.name === next.node.name &&
        prev.node.color === next.node.color &&
        prev.node.iconType === next.node.iconType &&
        prev.isSelected === next.isSelected &&
        prev.isDragging === next.isDragging &&
        prev.node.type === next.node.type
    );
});

// 2. Cabo Otimizado
// Recebe index e count calculados pelo Pai, evitando filtro O(N^2) interno
const CableLine = memo(({ cable, nodeA, nodeB, index, count, itemTypes, onSelect, onOpen, onDelete, onEdit, isSelected }) => {

    const [isHovered, setIsHovered] = useState(false);

    // Estados para controle igual ao EditableCable
    //const [isUnlocked, setIsUnlocked] = useState(false);
    const [clickPosition, setClickPosition] = useState(null);

    // Reseta estado se perder seleção
    useEffect(() => {
        if (!isSelected) {
            //setIsUnlocked(false);
            setClickPosition(null);
        }
    }, [isSelected]);

    if (!nodeA || !nodeB) return null;

    // --- Cálculos de Geometria (Mantidos) ---
    const isCurved = count > 1;
    const spread = 40;
    const curvature = isCurved ? (index - (count - 1) / 2) * spread : 0;

    // Pegar dimensões baseadas no tipo ou padrão
    const widthA = itemTypes[nodeA.type]?.width || 100; // Ajuste conforme sua config
    const widthB = itemTypes[nodeB.type]?.width || 100;

    // Centro aproximado dos nós (ajuste o +30 se necessário para alinhar com o centro vertical do node)
    const centerA = { x: nodeA.x + (widthA / 2), y: nodeA.y + 30 };
    const centerB = { x: nodeB.x + (widthB / 2), y: nodeB.y + 30 };

    const strokeColor = cable.color || '#334155';
    const displayColor = strokeColor === '#334155' ? '#94a3b8' : strokeColor;

    let d = '';
    let midX = (centerA.x + centerB.x) / 2;
    let midY = (centerA.y + centerB.y) / 2;

    if (isCurved) {
        const dx = centerB.x - centerA.x;
        const dy = centerB.y - centerA.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;

        // Ponto de controle da curva Bezier
        const cx = midX + nx * curvature;
        const cy = midY + ny * curvature;

        d = `M ${centerA.x} ${centerA.y} Q ${cx} ${cy} ${centerB.x} ${centerB.y}`;

        // Recalcula o meio baseado na curva para posicionar o texto corretamente
        midX = 0.25 * centerA.x + 0.5 * cx + 0.25 * centerB.x;
        midY = 0.25 * centerA.y + 0.5 * cy + 0.25 * centerB.y;
    } else {
        d = `M ${centerA.x} ${centerA.y} L ${centerB.x} ${centerB.y}`;
    }
    // -------------------------------------------

    // MANIPULAÇÃO DE CLIQUES
    const handleClick = (e) => {
        e.stopPropagation();

        // Captura a posição do clique relativa ao SVG (aproximada)
        // e.nativeEvent.offsetX/Y pega a posição dentro do elemento SVG container
        setClickPosition({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });

        if (!isSelected) {
            onSelect(cable.id);
        }
    };

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        if (onOpen) onOpen(cable.id);
    };

    // --- PORTAL DO POPUP ---
    const tooltipLayer = document.getElementById('cable-tooltips-layer');

    // Determina a posição do popup: 
    // Prioriza onde foi clicado (clickPosition). Se não tiver (ex: seleção via lista), usa o meio da linha (midX/midY).
    const popupX = clickPosition ? clickPosition.x : midX;
    const popupY = clickPosition ? clickPosition.y : midY;

    const toolbarPortal = (isSelected && tooltipLayer) ? ReactDOM.createPortal(
        <div
            className="absolute pointer-events-auto z-[60] animate-in slide-in-from-bottom-2 fade-in"
            style={{
                left: popupX,
                top: popupY - 10, // Um pouco acima do clique
                transform: 'translate(-50%, -100%)' // Centraliza e joga pra cima
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}

        >
            {/* Setinha do balão */}
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-gray-800 border-b border-r border-gray-300 dark:border-gray-600 rotate-45 transform z-0"></div>

            {/* Container do Popup (Mesmo estilo do CanvasNodes) */}
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600 p-1 flex flex-col items-center min-w-[120px] z-10">

                {/* 1. Nome no Topo */}
                <div className="w-full text-center border-b border-gray-200 dark:border-gray-700 pb-1 mb-1">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 block truncate max-w-[140px] mx-auto px-1">
                        {cable.name}
                    </span>
                </div>

                {/* 2. Botões */}
                <div className="flex items-center gap-1">

                    {/* TRAVAR/DESTRAVAR */}
                    {/* <button
                        onClick={(e) => { e.stopPropagation(); setIsUnlocked(!isUnlocked); }}
                        className={`p-1.5 rounded flex items-center justify-center transition-colors border ${isUnlocked
                            ? 'bg-green-500 text-white border-green-600'
                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                        }`}
                        title={isUnlocked ? "Bloquear" : "Desbloquear"}
                        style={{ width: '26px', height: '26px' }}
                    >
                        {isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
                    </button> */}

                    {/* EDITAR */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(cable.id, cable.name); }}
                        className="bg-white text-blue-500 border border-blue-200 p-1.5 rounded hover:bg-blue-50 dark:bg-gray-700 dark:border-gray-600 dark:text-blue-400 flex items-center justify-center"
                        style={{ width: '26px', height: '26px' }}
                        title="Editar"
                    >
                        <Edit3 size={14} />
                    </button>

                    {/* DETALHES (Novo) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); if (onOpen) onOpen(cable.id); }}
                        className="bg-white text-green-600 border border-green-200 p-1.5 rounded hover:bg-green-50 dark:bg-gray-700 dark:border-gray-600 dark:text-green-400 flex items-center justify-center"
                        style={{ width: '26px', height: '26px' }}
                        title="Detalhes"
                    >
                        <Info size={14} />
                    </button>

                    {/* EXCLUIR */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(cable.id); }}
                        className="bg-white text-red-500 border border-red-200 p-1.5 rounded hover:bg-red-50 dark:bg-gray-700 dark:border-gray-600 dark:text-red-400 flex items-center justify-center"
                        style={{ width: '26px', height: '26px' }}
                        title="Excluir"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>,
        tooltipLayer
    ) : null;

    return (
        <>
            {/* Renderiza a toolbar via Portal */}
            {toolbarPortal}

            <g
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="cursor-pointer hover:opacity-80 group transition-all pointer-events-auto"
            >
                {/* Linha grossa invisível para facilitar o clique (Hitbox) */}
                <path d={d} stroke="transparent" strokeWidth="20" fill="none" />

                {/* Linha visível */}
                <path
                    d={d}
                    stroke={isSelected ? '#3b82f6' : displayColor}
                    strokeWidth={isSelected ? "6" : "4"}
                    fill="none"
                    className={!isSelected ? "dark:stroke-opacity-80" : ""}
                // Se quiser linha pontilhada quando desbloqueado/editando:
                //strokeDasharray={ (isSelected && isUnlocked) ? "5,5" : "none" }
                />

                {/* Linha central branca tracejada quando selecionado */}
                {isSelected && <path d={d} stroke="#fff" strokeWidth="2" strokeDasharray="4" fill="none" />}

                {/* Rótulo com o Nome (Sempre visível no meio da linha) */}
                <foreignObject
                    x={midX - 50}
                    y={midY - 10}
                    width="100"
                    height="20"
                    className="pointer-events-none overflow-visible"
                >
                    <div className="flex items-center justify-center w-full h-full">
                        <div className={`
                            bg-white dark:bg-gray-800 border rounded px-2 py-0.5 text-[10px] text-center shadow-sm truncate select-none font-medium max-w-full 
                            ${isSelected ? 'border-blue-500 text-blue-600' : 'border-slate-300 text-slate-700 dark:text-gray-300'}
                        `}>
                            {cable.name}
                        </div>
                    </div>
                </foreignObject>
            </g>
        </>
    );
}, (prev, next) => {
    return (
        prev.cable.id === next.cable.id &&
        prev.cable.name === next.cable.name &&
        prev.cable.color === next.cable.color &&
        prev.nodeA.x === next.nodeA.x && prev.nodeA.y === next.nodeA.y &&
        prev.nodeB.x === next.nodeB.x && prev.nodeB.y === next.nodeB.y &&
        prev.index === next.index &&
        prev.count === next.count &&
        prev.isSelected === next.isSelected
    );
});

// 3. Drop Otimizado (Recebe coordenadas diretas)
const DropLine = memo(({ x1, y1, x2, y2 }) => {
    if (x1 === undefined || x2 === undefined) return null;
    return (
        <g className="pointer-events-none">
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth="2" strokeDasharray="6,4" className="opacity-40 dark:opacity-80" />
            <circle cx={x1} cy={y1} r="3" fill="#94a3b8" className="opacity-80" />
        </g>
    );
});


// FIM COMPONENTES MEMOIZADOS (PERFORMANCE) ========================================================================

//Salva todo o texto do input antes de passar ao componente App
// Componente Input que "segura" a digitação por 300ms
const DebouncedInput = ({ value, onChange, ...props }) => {
    const [localValue, setLocalValue] = useState(value);

    // Sincroniza se o pai mudar o valor externamente (ex: limpar busca)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // O "Freio" da digitação
    useEffect(() => {
        const handler = setTimeout(() => {
            // Só avisa o pai se o valor mudou
            if (localValue !== value) {
                onChange(localValue); // Passamos o VALOR direto, não o evento 'e'
            }
        }, 200);

        return () => clearTimeout(handler);
    }, [localValue]);

    return (
        <input
            {...props} // Repassa onKeyDown, className, onFocus, etc.
            id='barra-de-busca'
            name='Barra de Busca'
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)} // Atualiza localmente instantâneo
        />
    );
};
// FIM FUNCOES ========================================================================


// CANVAS (PRINCIPAL) ========================================================================
const App = () => {
    // useState (ESTADOS)------------------------------------------------------------------------------------------------------------------------------------------
    // --- ESTADOS DE PROJETOS & COLABORAÇÃO ---
    // Hook customizado que gerencia convites, transferências e notificações

    const [myProjects, setMyProjects] = useState([]);      // Projetos que EU criei

    // O activeProjectId continua sendo o ID do projeto selecionado
    const [activeProjectId, setActiveProjectId] = useState(null);  // O projeto "Caneta"
    const [visibleProjectIds, setVisibleProjectIds] = useState([]); // Os projetos "Olho"
    const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false); // Abre o modal de gerencia de projetos
    const [projectDataCache, setProjectDataCache] = useState({}); // Cache de dados separado por projeto: { [projectId]: { items: [], connections: [] } }

    // --- ESTADOS PARA MULTI-USUÁRIO ---
    const [projectOwnerId, setProjectOwnerId] = useState(null); // Quem é o dono dos dados que estou vendo? //idDonoProjeto, definirIdDonoProjeto
    const [userRole, setUserRole] = useState('OWNER'); //funçãoDoUsuario, definirFunçãoDoUsuario

    const [user, setUser] = useState(null); //Usuario
    // Hook customizado movido para cá (pois depende de 'user')
    const {
        incomingTransfers,
        sharedProjects,
        pendingInvites,
        outgoingInvites
    } = useProjectNotifications(user);
    // Hook de Push Notifications (FCM)
    usePushNotifications(user);

    const [items, setItems] = useState([]); //Itens - OLT, DIO, Splitter, etc...
    const [connections, setConnections] = useState([]); //Conexões de cabos em nós
    const [portLabels, setPortLabels] = useState({}); //Nome de Portas
    const [signalNames, setSignalNames] = useState({}); //Nomes de Sinais
    const [cableColorStandards, setCableColorStandards] = useState({}); //Padrao de cores dos cabos (definidos pelo usuario)
    const [nodeColorSettings, setNodeColorSettings] = useState({}); //Padrao de cores dos nós (definidos pelo usuario)
    const [favoriteColors, setFavoriteColors] = useState([]); //Cores favoritas (definidos pelo usuario)
    const [nodeColorsModalOpen, setNodeColorsModalOpen] = useState(false); //Modal padrao de cores dos nós
    const [loading, setLoading] = useState(false);
    const [reportOpen, setReportOpen] = useState(false); //Modal Relatório
    const [clientWizard, setClientWizard] = useState({ step: null, data: {} });
    const [photoModalData, setPhotoModalData] = useState(null); //Modal fotos
    const [uploadingPhoto, setUploadingPhoto] = useState(false); //Janela de importar fotos 
    const [slotModalConfig, setSlotModalConfig] = useState(null); //Modal de configuração de slots (Card de DIO ou OLT)
    const [splitModalData, setSplitModalData] = useState(null); //Seccionar cabo
    const [traceModalData, setTraceModalData] = useState(null); //Rastreio de sinal
    const [newClientPosition, setNewClientPosition] = useState(null); //Posição de novo cliente
    const [isLoading, setIsLoading] = useState(true);  //Está carregando?
    const [mapStartConfig, setMapStartConfig] = useState(null); // Guarda o centro do mapa salvo

    // --- ESTADOS DE INTERFACE ---
    const [pendingConn, setPendingConn] = useState(null); //Conexao pendente
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [detailId, setDetailId] = useState(null);
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    const [modalConfig, setModalConfig] = useState(null); //Define se o creationModal está trabalhando com nós, cabos ou itens
    const [editModalConfig, setEditModalConfig] = useState(null); //Define se o modal de edição está trabalhando com nós, cabos ou itens
    const [infoModalConfig, setInfoModalConfig] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState(null);
    const [alertConfig, setAlertConfig] = useState(null);

    const [standardsModalOpen, setStandardsModalOpen] = useState(false);
    const [interactionMode, setInteractionMode] = useState('SELECT');
    const [cableStartNode, setCableStartNode] = useState(null);
    // REF PARALELA: Mantém o valor atual de cableStartNode acessível
    // dentro de callbacks estáveis sem precisar de re-renders.
    const cableStartNodeRef = useRef(null);

    // Reset automático ao sair do modo DRAW_CABLE (troca de ferramenta)
    useEffect(() => {
        if (interactionMode !== 'DRAW_CABLE') {
            cableStartNodeRef.current = null;
            setCableStartNode(null);
        }
    }, [interactionMode]);
    const [nodeTypeToAdd, setNodeTypeToAdd] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [hasCentered, setHasCentered] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false); //Modal de perfil
    const [searchMode, setSearchMode] = useState('ITEMS'); // 'ITEMS' ou 'ADDRESS'
    const [flyToCoords, setFlyToCoords] = useState(null); // Coordenada para enviar ao mapa
    const [isSearchingAddr, setIsSearchingAddr] = useState(false); // Loading da busca
    const [suggestions, setSuggestions] = useState([]); // Lista de endereços encontrados
    const [showSuggestions, setShowSuggestions] = useState(false); // Se a lista aparece ou não
    const [isDarkMode, setIsDarkMode] = useState(() => { return localStorage.getItem('ftth_theme') === 'dark'; });
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [draggingNode, setDraggingNode] = useState(null);
    const [selectionBox, setSelectionBox] = useState(null);
    const [selectedItemsOffset, setSelectedItemsOffset] = useState({ dx: 0, dy: 0 });
    const [viewMode, setViewMode] = useState('MAP'); // Novo estado: 'CANVAS' ou 'MAP'
    const [importModalData, setImportModalData] = useState(null); // Estado para controlar os dados da importação antes de salvar
    const [fixConnectionsData, setFixConnectionsData] = useState(null);
    const [duplicatesData, setDuplicatesData] = useState(null);    // Estado para controlar os conflitos de duplicidade
    const [tempCleanItems, setTempCleanItems] = useState([]);    // Precisamos guardar os itens "limpos" temporariamente enquanto o usuário decide sobre os "sujos"
    const [myTags, setMyTags] = useState([]);           // Tags do próprio usuário logado
    const [sharedOwnerTags, setSharedOwnerTags] = useState([]); // Tags do dono do projeto compartilhado
    // Merge das duas fontes: owner vem primeiro, as do usuário têm prioridade (sobrescrevem)
    const availableTags = useMemo(() => {
        const tagMap = {};
        sharedOwnerTags.forEach(t => { if (t?.id) tagMap[t.id] = t; });
        myTags.forEach(t => { if (t?.id) tagMap[t.id] = t; });
        return Object.values(tagMap);
    }, [myTags, sharedOwnerTags]);
    const [tagManagerOpen, setTagManagerOpen] = useState(false); // Modal de gestão

    // --- ESTADOS DE FILTRO (TAGS)---
    const [filterTags, setFilterTags] = useState([]); // IDs selecionados
    const [filterMode, setFilterMode] = useState('OR'); // 'OR', 'AND', 'EXACT'

    const [notesModalConfig, setNotesModalConfig] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false); // Para mostrar/esconder a barra de filtros

    // Estados para Tela de Carregamento Global
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');

    // Estado para controlar o foco automático após o carregamento
    const [pendingFocusProjectId, setPendingFocusProjectId] = useState(null);




    // useRef (REFERENCIAS)------------------------------------------------------------------------------------------------------------------------------
    const backupInputRef = useRef(null); //Backup
    const canvasRef = useRef(null);
    const dragStartPosRef = useRef({ x: 0, y: 0 });
    const clickTimeoutRef = useRef(null);
    const touchRef = useRef({ dist: 0 });
    const boxSelectionRef = useRef(null);
    const fileInputRef = useRef(null); // KML/Fotos





    // useEffect (EFEITOS)---------------------------------------------------------------------------------------------------------------------
    // --- LISTENER DE AUTENTICAÇÃO ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser); // Atualiza o estado: O React agora sabe que você logou!

            if (!currentUser) {
                // Se deslogou, limpa tudo
                setProjectOwnerId(null);
                setMyProjects([]);
                setSharedProjects([]);
                setActiveProjectId(null);
            }
        });

        return () => unsubscribe();
    }, []);

    // --- DEEP LINKING (GEO INTENTS) ---
    useEffect(() => {
        CapacitorApp.addListener('appUrlOpen', data => {
            console.log('App opened with URL:', data.url);

            try {
                // Formatos esperados:
                // 1. geo:lat,lng
                // 2. https://maps.google.com/?q=lat,lng
                // 3. https://www.google.com/maps/search/?api=1&query=lat,lng

                let lat = null;
                let lng = null;

                if (data.url.startsWith('geo:')) {
                    // geo:-23.123,-46.123
                    // Remover prefixo e parâmetros extras se houver (ex: ?z=10)
                    const coordsPart = data.url.split(':')[1].split('?')[0];
                    const coords = coordsPart.split(',');
                    lat = parseFloat(coords[0]);
                    lng = parseFloat(coords[1]);
                } else if (data.url.includes('google.com')) {
                    const url = new URL(data.url);
                    const q = url.searchParams.get('q') || url.searchParams.get('query');
                    if (q) {
                        const parts = q.split(',');
                        if (parts.length >= 2) {
                            lat = parseFloat(parts[0]);
                            lng = parseFloat(parts[1]);
                        }
                    }
                }

                if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                    // Força modo mapa e voa para lá
                    setViewMode('MAP');
                    setFlyToCoords([lat, lng]);

                    // Feedback visual temporário (opcional, pode ser um toast)
                    // alert(`Navegando para: ${lat}, ${lng}`);
                }
            } catch (error) {
                console.error('Erro ao processar Deep Link:', error);
            }
        });
    }, []);

    // --- TEMA LIGHT/DARK ---
    useEffect(() => {
        localStorage.setItem('ftth_theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);
    // --- TEMA LIGHT/DARK ---
    useEffect(() => {
        if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('ftth_theme', 'dark'); }
        else { document.documentElement.classList.remove('dark'); localStorage.setItem('ftth_theme', 'light'); }
    }, [isDarkMode]);

    // CARREGAMENTO INICIAL E GERENCIAMENTO DE PROJETOS
    useEffect(() => {
        if (!user) return; // Só roda se estiver logado

        // A. Carregar MEUS Projetos
        const myProjectsRef = collection(db, `artifacts/ftth-production/users/${user.uid}/projects`);
        const unsubMyProjects = onSnapshot(myProjectsRef, async (snap) => {
            const list = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                ownerId: user.uid,
                role: 'OWNER'
            }));

            // // CRIAÇÃO AUTOMÁTICA (Se a pasta foi deletada ou usuário é novo)
            // if (list.length === 0) {
            //     // GERA UM ID ÚNICO LIMPO (Ex: proj_1705432100000)
            //     // Usar Date.now() garante que seja único e cronológico
            //     const defaultId = `proj_${Date.now()}`;

            //     await setDoc(doc(db, `artifacts/ftth-production/users/${user.uid}/projects`, defaultId), {
            //         name: 'Meu Primeiro Projeto',
            //         createdAt: new Date().toISOString()
            //     });

            //     // Nota: Não precisamos fazer mais nada aqui. 
            //     // Ao salvar no banco, este listener (onSnapshot) vai rodar de novo automaticamente,
            //     // cairá no 'else' abaixo e carregará o projeto recém-criado.
            // } else {
            setMyProjects(list);
            // }
        });

        // B. Monitorar CONVITES e TRANSFERÊNCIAS (Agora via Hook useProjectNotifications)
        // ... Lógica movida para useProjectNotifications.js ...

        return () => {
            unsubMyProjects();
        };
    }, [user]); // Depende apenas do usuário logado

    // Carrega DADOS (Itens, Conexões e SETTINGS)
    useEffect(() => {
        if (!user || visibleProjectIds.length === 0) {
            setProjectDataCache({});
            return;
        }

        const unsubscribers = [];
        const allAvailableProjects = [...myProjects, ...sharedProjects];

        // A. Carregar dados ESPECÍFICOS DE CADA PROJETO (Itens, Conexões, Sinais, Labels)
        visibleProjectIds.forEach(pid => {
            const projMeta = allAvailableProjects.find(p => p.id === pid);
            if (!projMeta) return;

            const targetOwnerId = projMeta.ownerId;
            const basePath = `artifacts/ftth-production/users/${targetOwnerId}/projects/${pid}`;

            const createListener = (colName, cacheKey) => {
                return onSnapshot(collection(db, `${basePath}/${colName}`), (snap) => {
                    const dataList = snap.docs.map(d => ({
                        id: d.id,
                        ...d.data(),
                        _projectId: pid
                    }));

                    setProjectDataCache(prev => ({
                        ...prev,
                        [pid]: { ...prev[pid], [cacheKey]: dataList }
                    }));
                });
            };

            unsubscribers.push(createListener('items', 'items'));
            unsubscribers.push(createListener('connections', 'connections'));
            // Mantemos 'settings' aqui APENAS para coisas locais (Sinais e PortLabels)
            // Tags, Cores e Standards serão carregados no useEffect abaixo (Global)
            unsubscribers.push(createListener('settings', 'settings'));
        });

        return () => {
            unsubscribers.forEach(u => u());
        };
    }, [user, JSON.stringify(visibleProjectIds), myProjects.length, sharedProjects.length]);

    // Carrega CONFIGURAÇÕES GLOBAIS DO USUÁRIO (Tags, Cores, Padrões)
    // IMPORTANTE: Depende de `user` (não de `projectOwnerId`) pois essas configurações
    // pertencem ao usuário logado e devem estar disponíveis desde o login,
    // independentemente de qualquer projeto estar ativo.
    useEffect(() => {
        if (!user) return;

        // Caminho Global: users/{uid}/settings — sempre usa o UID do próprio usuário logado
        const globalSettingsRef = collection(db, `artifacts/ftth-production/users/${user.uid}/settings`);

        const unsubGlobal = onSnapshot(globalSettingsRef, (snap) => {
            let mergedTags = [];
            let mergedColors = {};
            let mergedFavorites = [];
            let mergedStandards = {};

            snap.docs.forEach(doc => {
                const data = doc.data();

                if (doc.id === 'tags') {
                    // Transforma o objeto { id: data } em array
                    const tagsArray = Object.values(data).filter(v => typeof v === 'object' && v.id);
                    mergedTags = tagsArray;
                }
                if (doc.id === 'nodeColors') {
                    if (data.settings) {
                        mergedColors = { ...data.settings };
                    } else {
                        // Legado
                        const { id, _migrated, ...colors } = data;
                        mergedColors = { ...colors };
                    }
                    if (data.favorites && Array.isArray(data.favorites)) {
                        mergedFavorites = [...data.favorites];
                    }
                }
                if (doc.id === 'standards') {
                    const { id, _migrated, ...standards } = data;
                    mergedStandards = { ...standards };
                }
            });

            setMyTags(mergedTags);
            setNodeColorSettings(mergedColors);
            setFavoriteColors(mergedFavorites);
            setCableColorStandards(mergedStandards);
        });

        return () => unsubGlobal();

    }, [user]); // Depende do usuário logado — recarrega ao logar/deslogar

    // Carrega tags do DONO do projeto compartilhado (para merge de visibilidade)
    // Só ativo quando o projeto aberto pertence a OUTRO usuário.
    useEffect(() => {
        setSharedOwnerTags([]); // Sempre limpa ao mudar de contexto

        if (!user || !projectOwnerId || projectOwnerId === user.uid) return;

        // Escuta apenas o documento de tags do dono do projeto compartilhado
        const ownerTagsRef = doc(db, `artifacts/ftth-production/users/${projectOwnerId}/settings`, 'tags');

        const unsubOwnerTags = onSnapshot(ownerTagsRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const tagsArray = Object.values(data).filter(v => typeof v === 'object' && v.id);
                setSharedOwnerTags(tagsArray);
            } else {
                setSharedOwnerTags([]);
            }
        });

        return () => unsubOwnerTags();

    }, [user, projectOwnerId]); // Recarrega ao mudar o dono do projeto ativo

    // 3. Unifica e Processa o Cache (Apenas Itens, Conexões e Configs Locais)
    useEffect(() => {
        const visibleData = Object.entries(projectDataCache)
            .filter(([projectId]) => visibleProjectIds.includes(projectId))
            .map(([, data]) => data);

        // 1. Itens e Conexões
        const allItems = visibleData.flatMap(p => p?.items || []);
        const allConns = visibleData.flatMap(p => p?.connections || []);

        setItems(allItems);
        setConnections(allConns);

        // 2. Processar Settings LOCAIS (Sinais, PortLabels)
        // Tags e Cores agora são tratadas no useEffect global acima
        let mergedSignals = {};
        let mergedPortLabels = {};

        visibleData.forEach(projectData => {
            if (projectData.settings) {
                projectData.settings.forEach(doc => {
                    if (doc.id === 'signals') {
                        const { id, _migrated, _projectId, ...signals } = doc;
                        mergedSignals = { ...mergedSignals, ...signals };
                    }
                    if (doc.id === 'portLabels') {
                        const { id, _migrated, _projectId, ...labels } = doc;
                        mergedPortLabels = { ...mergedPortLabels, ...labels };
                    }
                    // Ignoramos tags, nodeColors e standards aqui pois vêm do Global agora
                });
            }
        });

        setSignalNames(mergedSignals);
        setPortLabels(mergedPortLabels);

        // availableTags, nodeColorSettings, etc já foram setados no listener global

        setLoading(false);

    }, [projectDataCache, visibleProjectIds]);

    // Centralizar em um node
    useEffect(() => {
        if (!loading && items.length > 0 && !hasCentered) {
            const visibleNodes = items.filter(i => !i.parentId && ITEM_TYPES[i.type]?.category === 'NODE');
            if (visibleNodes.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                visibleNodes.forEach(node => {
                    const width = ITEM_TYPES[node.type]?.width || 120;
                    const height = 100;
                    if (node.x < minX) minX = node.x;
                    if (node.y < minY) minY = node.y;
                    if (node.x + width > maxX) maxX = node.x + width;
                    if (node.y + height > maxY) maxY = node.y + height;
                });
                const contentW = maxX - minX;
                const contentH = maxY - minY;
                const screenW = window.innerWidth;
                const screenH = window.innerHeight;
                const padding = 100;
                const scaleX = (screenW - padding * 2) / contentW;
                const scaleY = (screenH - padding * 2) / contentH;
                const newScale = Math.min(scaleX, scaleY, 1);
                const contentCenterX = minX + (contentW / 2);
                const contentCenterY = minY + (contentH / 2);
                const newPanX = (screenW / 2) - (contentCenterX * newScale);
                const newPanY = (screenH / 2) - (contentCenterY * newScale);
                setPan({ x: newPanX, y: newPanY });
                setScale(newScale);
                setHasCentered(true);
            }
        }
    }, [loading, items.length, hasCentered]);

    // Busca Endereços (API) ou Itens (Local)
    useEffect(() => {
        // Se a busca estiver vazia, limpa sugestões
        if (!searchTerm || searchTerm.trim() === '') {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {

            // --- MODO 1: BUSCA DE ENDEREÇO (API) ---
            if (viewMode === 'MAP' && searchMode === 'ADDRESS') {
                if (searchTerm.length < 3) return;

                // Ignora se for coordenada
                if (/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/.test(searchTerm)) {
                    setSuggestions([]);
                    return;
                }

                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(searchTerm)}`);
                    const data = await response.json();
                    const formatted = data.map(d => ({ ...d, display_name: d.display_name, type: 'ADDRESS' }));
                    setSuggestions(formatted);
                    setShowSuggestions(true);
                } catch (error) {
                    console.error("Erro no autocomplete:", error);
                }
            }

            // --- MODO 2: BUSCA DE ITENS (LOCAL) - OTIMIZADO ---
            else {
                const lowerTerm = searchTerm.toLowerCase();
                const results = [];
                const MAX_RESULTS = 50; // Limite de segurança

                // Usamos 'for...of' porque ele permite usar 'break' para PARAR o loop
                // O .filter() original era obrigado a ler a lista inteira até o fim
                for (const item of items) {
                    // Se já achamos 50 itens, PARA DE PROCURAR IMEDIATAMENTE.
                    // Isso evita travar o navegador processando milhares de itens.
                    if (results.length >= MAX_RESULTS) break;

                    if (item.name && item.name.toLowerCase().includes(lowerTerm)) {
                        results.push({
                            display_name: item.name,
                            type: 'ITEM',
                            data: item
                        });
                    }
                }

                setSuggestions(results);
                if (results.length > 0) setShowSuggestions(true);
            }
        }, 300); // <--- CORRIGIDO: 300ms (era 3000ms/3segundos)

        return () => clearTimeout(timer);
    }, [searchTerm, searchMode, viewMode, items]);

    // Atalhos de teclado
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Verificação de segurança para inputs (para não atrapalhar digitação)
            const activeTag = document.activeElement.tagName;
            const isEditable = document.activeElement.isContentEditable;
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT' || isEditable) {
                return;
            }

            // --- ATALHO 1: ESPAÇO (Ferramenta Seleção) ---
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                setInteractionMode('SELECT');
            }

            // --- ATALHO 2: SHIFT (Seleção em Área) ---
            if (e.key === 'Shift') {
                // Só ativa se estiver no modo CANVAS
                if (viewMode === 'CANVAS') {
                    e.preventDefault(); // Opcional no Shift, mas mal não faz
                    setInteractionMode('BOX_SELECT');
                }
            }

            // --- ATALHO 3: "1" (Ferramenta POP) ---
            if (e.key === '1') {
                setInteractionMode('ADD_NODE');
                setNodeTypeToAdd("POP");
            }

            // --- ATALHO 4: "2" (Ferramenta CEO) ---
            if (e.key === '2') {
                setInteractionMode('ADD_NODE');
                setNodeTypeToAdd("CEO");
            }

            // --- ATALHO 5: "3" (Ferramenta CTO) ---
            if (e.key === '3') {
                setInteractionMode('ADD_NODE');
                setNodeTypeToAdd("CTO");
            }

            // --- ATALHO 6: "4" (Ferramenta Desenhar Cabo) ---
            if (e.key === '4') {
                setInteractionMode('DRAW_CABLE');
            }

            // --- ATALHO 7: "R" (Relatório) VOU MUDAR. RELATORIO NÃO VAI MAIS TER ATALHO E O 'R' SERA PARA NORTEAR O MAPA---
            // if (e.key.toLowerCase() === 'r') {
            //     setReportOpen(prev => !prev);
            // }

            // --- ATALHO 8: "M" (MAPA/CANVAS) ---
            if (e.key.toLowerCase() === 'm') {
                setViewMode(viewMode === 'CANVAS' ? 'MAP' : 'CANVAS');
            }

            // --- ATALHO 9: "N" (Novo Cliente) ---
            // if (e.key.toLowerCase() === 'n') {
            //     setInteractionMode('ADD_CLIENT');
            // }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [viewMode]);

    // COMPONENTES -----------
    // OTIMIZAÇÃO: Agrupar cabos (Bundles) para curvatura
    // Isso evita rodar um .filter() dentro de cada cabo no render (O(N^2) -> O(N))
    const cableGroups = useMemo(() => {
        const groups = {};
        items.filter(i => i.type === 'CABLE').forEach(c => {
            // Cria uma chave única baseada nos IDs dos nós (ordem alfabética para ser agnóstico de direção)
            const [n1, n2] = [c.fromNode, c.toNode].sort();
            const key = `${n1}-${n2}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });
        // Ordena para manter consistência visual (quem fica em cima/baixo)
        Object.values(groups).forEach(g => g.sort((a, b) => a.id.localeCompare(b.id)));
        return groups;
    }, [items]);
    // Lida com a seleção do arquivo de restauração de BackUp   
    const handleRestore = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Confirmação de Segurança
        const confirmRestore = window.confirm(
            "ATENÇÃO: Restaurar um arquivo FTTH irá SUBSTITUIR TODOS os dados atuais do projeto selecionado.\n\n" +
            "Todos os itens e conexões atuais serão apagados e substituídos pelo arquivo selecionado.\n\n" +
            "Deseja continuar?"
        );

        if (!confirmRestore) {
            event.target.value = ''; // Limpa input
            return;
        }

        setIsProcessing(true);
        setProcessingMessage("Restaurando arquivo, aguarde a conclusão!");
        // setLoading(true);
        try {
            await restoreFromBackup(file, projectOwnerId, activeProjectId, (status, percent) => {
                // Aqui você poderia atualizar um estado de progresso se tivesse uma barra
                console.log(status);
            });
            // setProcessingMessage("Sucesso", "Arquivo restaurado com sucesso! O sistema será recarregado.");
            openAlert("Sucesso", "Backup restaurado com sucesso! O sistema será recarregado.");
            setTimeout(() => window.location.reload(), 2000); // Recarrega para garantir estado limpo

        } catch (error) {
            console.error(error);
            openAlert("Erro Crítico", "Falha ao restaurar backup. É necessário que o projeto atual esteja ativo para criações. Caso esteja, verifique o arquivo selecionado.");
        } finally {
            // setLoading(false);
            setIsProcessing(false);
            setProcessingMessage("");
            event.target.value = ''; // Limpa input
        }
    };

    // --- GERENCIAMENTO DE TAGS (Settings) ---
    // REGRA DE ESCRITA:
    //   - Usa `projectOwnerId` como destino (igual a todos os outros dados do projeto).
    //   - Assim, tags criadas num projeto compartilhado ficam no espaço do DONO
    //     e são imediatamente visíveis para ele.
    //   - Fallback para `user.uid` caso nenhum projeto esteja ativo.
    const saveTagDefinition = async (tag) => {
        if (!user) return;
        const targetOwner = projectOwnerId || user.uid;

        try {
            const tagId = tag.id || `tag_${Date.now()}`;
            const finalTag = { ...tag, id: tagId };

            const docRef = doc(db, `artifacts/ftth-production/users/${targetOwner}/settings`, 'tags');
            await setDoc(docRef, { [tagId]: finalTag }, { merge: true });

        } catch (error) {
            console.error("Erro ao salvar tag:", error);
            openAlert("Erro", "Falha ao salvar etiqueta.");
        }
    };
    const deleteTagDefinition = async (tagId) => {
        if (!user) return;
        const targetOwner = projectOwnerId || user.uid;

        try {
            const docRef = doc(db, `artifacts/ftth-production/users/${targetOwner}/settings`, 'tags');
            await updateDoc(docRef, { [tagId]: deleteField() });

        } catch (error) {
            console.error("Erro ao excluir tag:", error);
            openAlert("Erro", "Falha ao excluir etiqueta.");
        }
    };

    // Sugestão na barra de pesquisa com centralização no item
    const handleSelectSuggestion = (suggestion) => {
        // ATUALIZA O TEXTO DA BARRA
        setSearchTerm(suggestion.display_name);
        setSuggestions([]);
        setShowSuggestions(false);

        // CASO 1: É UM ENDEREÇO (MODO MAPA)
        if (suggestion.type === 'ADDRESS') {
            const lat = parseFloat(suggestion.lat);
            const lon = parseFloat(suggestion.lon);
            setFlyToCoords([lat, lon]);
        }

        // CASO 2: É UM ITEM (EQUIPAMENTO/CLIENTE)
        else if (suggestion.type === 'ITEM') {
            const rawItem = suggestion.data; // O item exato que foi clicado (ex: Splitter)
            let targetItem = rawItem;        // O item que vamos abrir na tela

            // LÓGICA DE REDIRECIONAMENTO:
            // Se o item tiver 'parentId', significa que ele está dentro de outro.
            // Nesse caso, devemos abrir o PAI, não o filho.
            if (rawItem.parentId) {
                const parent = items.find(i => i.id === rawItem.parentId);
                if (parent) {
                    targetItem = parent; // O alvo passa a ser o Pai (ex: POP, CTO)

                    // Opcional: Mostra um alerta rápido avisando o usuário
                    openAlert("Redirecionando", `Item localizado dentro de: ${parent.name}`);
                }
            }

            // A partir daqui, usamos 'targetItem' (que será o Pai ou o próprio item se não tiver pai)

            //setDetailId(targetItem.id); // Abre o Detail Painel do item 
            setSelectedIds(new Set([targetItem.id])); // Seleciona o item, tipo um clique simples

            // Se estiver no MODO MAPA, voa até as coordenadas do ALVO
            if (viewMode === 'MAP') {
                // Verifica coordenadas (Nós filhos geralmente não têm lat/lng próprias, usam a do pai)
                if (targetItem.lat !== undefined && targetItem.lng !== undefined) {
                    setFlyToCoords([targetItem.lat, targetItem.lng]);
                } else {
                    openAlert("Aviso", "Este item não possui localização no mapa.");
                }
            }

            // Se estiver no MODO CANVAS, centraliza no ALVO com ZOOM
            if (viewMode === 'CANVAS') {
                const rect = canvasRef.current.getBoundingClientRect();

                // 1. Defina o Zoom que você quer aplicar ao focar (Ex: 1.5 = 150%)
                const targetZoom = 1.5;

                // 2. Atualiza o estado do Zoom
                setScale(targetZoom);

                // 3. Calcula o Pan usando o NOVO ZOOM (targetZoom)
                // Importante: Não use a variável 'scale' antiga aqui, use 'targetZoom'
                setPan({
                    x: (rect.width / 2) - (targetItem.x * targetZoom) - (ITEM_TYPES[targetItem.type]?.width || 0),
                    y: (rect.height / 2) - (targetItem.y * targetZoom)
                });
            }
        }
    };

    // --- LÓGICA DE SUBMISSÃO (COM PROJEÇÃO AUTOMÁTICA CANVAS -> MAPA) ---
    const handleModalSubmit = (data) => {
        const id = Date.now().toString();
        const tagIds = data.tagIds || [];

        // 1. DEFINIÇÃO DO PONTO ZERO (ÂNCORA)
        // Se tivermos uma config de mapa salva, usamos ela. Se não, usamos o centro de SP como fallback.
        const anchorLat = mapStartConfig?.center?.[0] || -23.550520;
        const anchorLng = mapStartConfig?.center?.[1] || -46.633308;

        // 2. FATOR DE ESCALA (Pixel -> Grau)
        // 0.00001 grau é aprox. 1 metro. 
        // Multiplicamos o X/Y do canvas para espalhar os itens no mapa mantendo o desenho relativo.
        const pixelToDegree = 0.00001;

        // 3. FUNÇÃO AUXILIAR DE CÁLCULO
        // Se já tem lat/lng (veio do clique no mapa), usa.
        // Se não tem (veio do canvas), calcula baseado no X/Y relativo ao 0,0 do canvas.
        const getLat = (manualLat, canvasY) => manualLat || (anchorLat - (canvasY * pixelToDegree));
        const getLng = (manualLng, canvasX) => manualLng || (anchorLng + (canvasX * pixelToDegree));

        // --- NOVA LÓGICA: HERANÇA DE PROJETO (FIX) ---
        // Se o item que estamos criando tem um Pai (está dentro de algo),
        // ele DEVE pertencer ao mesmo projeto do Pai, ignorando o projeto ativo atual.
        let inheritedProjectId = null;

        if (modalConfig.parentId) {
            // Busca o item Pai na lista de itens carregados
            const parentItem = items.find(i => i.id === modalConfig.parentId);

            // Se achou o pai e ele tem um projeto definido, usamos ele.
            if (parentItem && parentItem._projectId) {
                inheritedProjectId = parentItem._projectId;
            }
        }

        if (modalConfig.mode === 'NODE') {
            saveItem({
                id,
                type: modalConfig.itemType,
                name: data.name,
                x: modalConfig.x || 0,
                y: modalConfig.y || 0,

                // --- AQUI ACONTECE A MÁGICA ---
                lat: getLat(modalConfig.lat, modalConfig.y),
                lng: getLng(modalConfig.lng, modalConfig.x),
                // -------------------------------

                ports: 0,
                color: data.nodeColor,
                parentId: null,
                tagIds: tagIds,
                iconType: data.iconType

                // Nó raiz usa o projeto ativo padrão (saveItem lida com isso se não passarmos _projectId)
            });
        }
        else if (modalConfig.mode === 'CABLE') {
            // Tenta descobrir o projeto baseado no nó de origem (fromNode)
            // Se o nó de origem tiver _projectId (veio do cache), usamos ele.
            let cableProjectId = modalConfig.fromNode._projectId || activeProjectId;
            // Cabos não têm lat/lng próprio (dependem dos nós), então segue normal
            saveItem({
                id,
                type: 'CABLE',
                name: data.name,
                ports: parseInt(data.ports),
                color: data.cableColor || '#334155',
                fromNode: modalConfig.fromNode.id,
                toNode: modalConfig.toNode.id,
                tagIds: tagIds,
                _projectId: cableProjectId // <--- FORÇA O PROJETO DO NÓ DE ORIGEM
            });
        }
        else if (modalConfig.mode === 'INTERNAL_DEVICE') {
            // Equipamentos internos (OLT/DIO) não precisam de Lat/Lng pois herdam do Pai (POP/Caixa)
            if (modalConfig.itemType === 'OLT') {
                const interfaces = data.manualInterfaces.map((iface, i) => ({ id: Date.now() + i, name: iface.name, portCount: parseInt(iface.portCount) }));
                saveItem({ id, type: 'OLT', name: data.name, uplinkCount: parseInt(data.uplinks), interfaces, parentId: modalConfig.parentId, tagIds: tagIds, _projectId: inheritedProjectId }); //_projectId: inheritedProjectId  <--- Força o projeto do pai
            } else if (modalConfig.itemType === 'DIO') {
                const cards = data.manualInterfaces.map((iface, i) => ({ id: Date.now() + i, name: iface.name, portCount: parseInt(iface.portCount) }));
                saveItem({ id, type: 'DIO', name: data.name, cards, parentId: modalConfig.parentId, ports: 0, tagIds: tagIds, _projectId: inheritedProjectId }); //_projectId: inheritedProjectId  <--- Força o projeto do pai
            } else {
                saveItem({ id, type: modalConfig.itemType, name: data.name, ports: parseInt(data.ports), parentId: modalConfig.parentId, tagIds: tagIds, _projectId: inheritedProjectId }); //_projectId: inheritedProjectId  <--- Força o projeto do pai
            }
        }
        else if (modalConfig.mode === 'SPLITTER') {
            saveItem({ id, type: 'SPLITTER', name: data.name, ports: parseInt(data.ports) + 1, parentId: modalConfig.parentId, tagIds: tagIds, _projectId: inheritedProjectId }); //_projectId: inheritedProjectId  <--- Força o projeto do pai
        }

        setModalConfig(null);
        cableStartNodeRef.current = null; // Zera a ref junto com o state
        setCableStartNode(null);
        setPendingConn(null);
        setInteractionMode('SELECT');
    };

    // 1. Clique no Fundo do Mapa (Adicionar Nó)
    const handleMapBgClick = (latlng) => {
        if (!latlng) {
            setSelectedIds(new Set());
            setDetailId(null);
            return;
        }
        if (interactionMode === 'ADD_NODE' && nodeTypeToAdd) {
            setModalConfig({
                mode: 'NODE',
                itemType: nodeTypeToAdd,
                lat: latlng.lat,
                lng: latlng.lng,
                defaultName: `${ITEM_TYPES[nodeTypeToAdd].label} ${items.filter(i => i.type === nodeTypeToAdd).length + 1}`
            });
        }
        else if (interactionMode === 'ADD_CLIENT') {
            // MUDANÇA: Guarda na memória dedicada
            setNewClientPosition({ lat: latlng.lat, lng: latlng.lng });
            setClientWizard({ step: 'NAME', data: {} });
            setInteractionMode('SELECT');
        }
    };

    // 2. Clique em um Nó no Mapa (Conectar Cabo, Cliente ou Selecionar)
    const handleMapNodeClick = (node) => {
        // Lógica de desenhar cabo (Igual ao Canvas)
        if (interactionMode === 'DRAW_CABLE') {
            // LÊ o valor ATUAL via ref (sem stale closure)
            const currentStart = cableStartNodeRef.current;
            console.log('[App] handleMapNodeClick chamado | nó:', node.name, '| cableStartNode:', currentStart?.name || 'null');
            if (!currentStart) {
                console.log('[App] -> Definindo 1º nó:', node.name);
                cableStartNodeRef.current = node;  // Atualiza ref IMEDIATAMENTE
                setCableStartNode(node);            // Atualiza state para UI/canvas
            } else if (currentStart.id !== node.id) {
                console.log('[App] -> Criando cabo entre:', currentStart.name, 'e', node.name);
                setModalConfig({
                    mode: 'CABLE',
                    fromNode: currentStart,
                    toNode: node,
                    defaultName: `Cabo ${items.filter(i => i.type === 'CABLE').length + 1}`,
                    defaultPorts: 12
                });
            }
        }

        // if (interactionMode === 'PICK_RECONNECT_NODE') {
        //     executeReconnection(node);
        //     return;
        // }
        // Lógica de adicionar Cliente (Igual ao Canvas)
        else if (clientWizard.step === 'PICK_CTO') {
            if (node.type !== 'CTO') {
                openAlert("Atenção", "Selecione uma CTO válida.");
                return;
            }
            // (Reutiliza lógica de buscar splitter dentro da CTO)
            const splitter = items.find(i => i.parentId === node.id && i.type === 'SPLITTER');
            if (!splitter) {
                openAlert("Erro", "Esta CTO não possui Splitter instalado.");
                return;
            }
            const freePorts = [];
            for (let i = 1; i < splitter.ports; i++) {
                const isBusy = findConnection(connections, splitter.id, i, 'A');
                if (!isBusy) freePorts.push({ id: i, label: i, splitterId: splitter.id });
            }
            if (freePorts.length === 0) {
                openAlert("Lotada", "Esta CTO não tem portas disponíveis.");
                return;
            }
            setClientWizard({
                step: 'PICK_PORT',
                data: { ...clientWizard.data, ctoNode: node, splitter, freePorts }
            });
        }
        // Seleção Normal
        else {
            setDetailId(node.id);
            setSelectedIds(new Set([node.id]));
        }
    };

    // Função auxiliar para garantir que só acessamos o banco se tiver usuário
    const dbAction = (fn) => { if (user && db) fn(); };

    // const saveItem = (i) => dbAction(async () => {
    //     // 1. Define o projeto alvo: Se o item já tem projeto (edição ou herança do pai), usa ele.
    //     // Senão, usa o projeto ativo (criação de nós raiz).
    //     const targetProjectId = i._projectId || activeProjectId;

    //     if (!targetProjectId) {
    //         openAlert("Erro", "Nenhum projeto ativo selecionado.");
    //         setIsProjectManagerOpen(true);
    //         return;
    //     }

    //     // --- CORREÇÃO AQUI ---
    //     // Descobre quem é o DONO deste projeto específico.
    //     // Procuramos na lista combinada de "Meus Projetos" + "Compartilhados Comigo"
    //     const allProjects = [...myProjects, ...sharedProjects];
    //     const targetProjectData = allProjects.find(p => p.id === targetProjectId);

    //     // Se achou o projeto, usa o dono dele. Se não (caso raro de erro), usa o dono atual como fallback.
    //     const targetOwnerId = targetProjectData ? targetProjectData.ownerId : projectOwnerId;
    //     // ---------------------

    //     // Caminho atualizado usando targetOwnerId em vez de projectOwnerId
    //     const itemRef = doc(db, `artifacts/ftth-production/users/${targetOwnerId}/projects/${targetProjectId}/items`, i.id);

    //     const payload = JSON.parse(JSON.stringify(i));
    //     // Removemos a flag interna _projectId antes de salvar para não sujar o banco
    //     delete payload._projectId;

    //     await setDoc(itemRef, {
    //         ...payload,
    //         updatedAt: new Date(),
    //         lastEditor: user.uid // Rastreia quem fez a alteração (você)
    //     });
    // });

    const saveItem = (item) => dbAction(async () => {
        let finalProjectId = null;

        // 1. VERIFICAÇÃO INTELIGENTE DE PROJETO
        const existingItem = items.find(i => i.id === item.id);

        if (existingItem) {
            // CASO 1: EDIÇÃO -> Mantém o projeto original do item (não importa qual está ativo)
            finalProjectId = existingItem._projectId;
        } else if (item.parentId) {
            // CASO 2: NOVO ITEM DENTRO DE OUTRO (Ex: Placa na OLT) -> Herda do Pai
            const parent = items.find(i => i.id === item.parentId);
            if (parent) {
                finalProjectId = parent._projectId;
            }
        }

        // Fallback: Se não caiu nos casos acima, tenta usar o projeto ativo (ex: criar poste novo no mapa)
        if (!finalProjectId) finalProjectId = activeProjectId;

        // Se mesmo assim não tiver projeto, bloqueia
        if (!finalProjectId) {
            openAlert("Atenção", "Selecione um projeto ativo para criar novos itens na raiz.");
            setIsProjectManagerOpen(true);
            return;
        }

        // 2. DESCOBRIR O DONO DO PROJETO ALVO
        const allProjects = [...myProjects, ...sharedProjects];
        const targetProjectData = allProjects.find(p => p.id === finalProjectId);
        // Se não achar (raro), usa o dono atual como segurança
        const targetOwnerId = targetProjectData ? targetProjectData.ownerId : projectOwnerId;

        // 3. PREPARAR DADOS
        const payload = JSON.parse(JSON.stringify(item));
        delete payload._projectId; // Não salvamos isso no documento, pois é inferido pela pasta

        // Atualiza timestamp e editor
        payload.updatedAt = new Date().toISOString();
        payload.lastEditor = user.uid;

        // 4. SALVAR NO CAMINHO CERTO
        const itemRef = doc(db, `artifacts/ftth-production/users/${targetOwnerId}/projects/${finalProjectId}/items`, item.id);
        await setDoc(itemRef, payload);
    });

    // const saveConnection = (c) => dbAction(async () => {
    //     const targetProjectId = c._projectId || activeProjectId;

    //     if (!targetProjectId) {
    //         console.error("Erro ao salvar conexão: Projeto indefinido");
    //         return;
    //     }

    //     // --- CORREÇÃO AQUI ---
    //     const allProjects = [...myProjects, ...sharedProjects];
    //     const targetProjectData = allProjects.find(p => p.id === targetProjectId);
    //     const targetOwnerId = targetProjectData ? targetProjectData.ownerId : projectOwnerId;
    //     // ---------------------

    //     await setDoc(doc(db, `artifacts/ftth-production/users/${targetOwnerId}/projects/${targetProjectId}/connections`, c.id), c);
    // });
    const saveConnection = (conn) => dbAction(async () => {
        // 1. Busca o item de origem para descobrir o projeto dele
        const sourceItem = items.find(i => i.id === conn.fromId);

        // Se achou a origem, usa o projeto dela. Se não, tenta o ativo.
        const targetProjectId = (sourceItem && sourceItem._projectId) ? sourceItem._projectId : activeProjectId;

        if (!targetProjectId) {
            console.error("Erro: Não foi possível identificar o projeto para esta conexão.");
            return;
        }

        // 2. Descobre o dono do projeto
        const allProjects = [...myProjects, ...sharedProjects];
        const targetProjectData = allProjects.find(p => p.id === targetProjectId);
        const targetOwnerId = targetProjectData ? targetProjectData.ownerId : projectOwnerId;

        // 3. Salva
        await setDoc(doc(db, `artifacts/ftth-production/users/${targetOwnerId}/projects/${targetProjectId}/connections`, conn.id), conn);
    });


    const deleteItemDB = (id) => { batchDelete([id]); };

    const cleanUpClientSignal = async (conn) => {
        // Verifica se a conexão existe
        if (!conn) return;

        const targetItem = items.find(i => i.id === conn.toId);
        const sourceItem = items.find(i => i.id === conn.fromId);

        // Descobre quem é o Splitter e quem é o Cliente na relação
        let splitterId = null;
        let portId = null;

        // Caso 1: Splitter -> Cliente (Padrão)
        if (sourceItem?.type === 'SPLITTER' && targetItem?.type === 'CLIENT') {
            splitterId = sourceItem.id;
            portId = conn.fromPort;
        }
        // Caso 2: Cliente -> Splitter (Raro, mas possível se desenhar ao contrário)
        else if (targetItem?.type === 'SPLITTER' && sourceItem?.type === 'CLIENT') {
            splitterId = targetItem.id;
            portId = conn.toPort;
        }

        // Se achou um par Splitter-Cliente, limpa o sinal
        if (splitterId && portId !== null) {
            const signalKey = `${splitterId}-${portId}`;
            const currentConfig = signalNames[signalKey];

            if (currentConfig && currentConfig.local) {
                // Remove apenas os sinais que começam com 'client-'
                const newLocal = currentConfig.local.filter(s => !s.id.startsWith('client-'));

                const newConfig = { ...currentConfig, local: newLocal };

                // ALTERADO: user.uid -> projectOwnerId
                // Assim, a limpeza do sinal reflete para toda a equipe
                await setDoc(doc(db, `artifacts/ftth-production/users/${projectOwnerId}/projects/${activeProjectId}/settings`, 'signals'), { [signalKey]: newConfig }, { merge: true });
            }
        }
    };

    const deleteConnectionDB = (id) => dbAction(async () => {
        // 1. Busca a conexão na lista atual para pegar os dados e o _projectId
        const conn = connections.find(c => c.id === id);

        if (conn) {
            // Define o projeto alvo: Prioridade para a origem da conexão, senão o projeto ativo
            const targetProjectId = conn._projectId || activeProjectId;

            if (!targetProjectId) {
                console.error("Erro Crítico: Tentativa de deletar conexão sem projeto definido.");
                return;
            }

            // 2. Tenta limpar o sinal do cliente (Mantém sua lógica existente)
            await cleanUpClientSignal(conn);

            // 3. Apaga a conexão no caminho NOVO (dentro de projects/{id})
            await deleteDoc(doc(db, `artifacts/ftth-production/users/${projectOwnerId}/projects/${targetProjectId}/connections`, id));
        }
    });

    const handleCreateProject = async (name) => {
        // Gera um ID único
        const newId = `proj_${Date.now()}`;

        // CORREÇÃO: Usa user.uid (Eu) em vez de projectOwnerId (O dono do projeto atual)
        // Isso garante que o projeto seja criado na MINHA conta, mesmo se eu estiver visitando outra.
        await setDoc(doc(db, `artifacts/ftth-production/users/${user.uid}/projects`, newId), {
            name,
            createdAt: new Date().toISOString()
        });

        // Ao criar, mudamos o foco para este novo projeto
        setActiveProjectId(newId);
        setProjectOwnerId(user.uid); // <--- IMPORTANTE: Força o "Dono Atual" ser eu mesmo
        setVisibleProjectIds(prev => [...new Set([...prev, newId])]);
    };

    const handleDeleteProject = async (id) => {
        const confirm = window.confirm(
            "ATENÇÃO: Esta ação é IRREVERSÍVEL.\n\n" +
            "Isso apagará PERMANENTEMENTE todos os Itens, Conexões e Configurações deste projeto.\n" +
            "Todos os convidados perderão o acesso imediatamente.\n\n" +
            "Deseja realmente continuar?"
        );
        if (!confirm) return;

        setLoading(true); // Mostra loading pois pode demorar

        try {
            const uid = user.uid;
            const projectPath = `artifacts/ftth-production/users/${uid}/projects/${id}`;

            // Lista de todas as possíveis subcoleções que podem existir dentro do projeto
            // (Inclui 'items', 'connections', 'settings' e as legadas da migração se houver)
            const subCollections = [
                'items',
                'connections',
                'settings',
                // 'tags' removido: tags agora são globais por usuário (users/{uid}/settings/tags)
                // e não devem ser apagadas ao deletar um projeto específico.
                'nodeColors',
                'signals',
                'portLabels'
            ];

            // Função auxiliar para deletar uma coleção inteira em lotes
            const deleteCollection = async (colName) => {
                const colRef = collection(db, `${projectPath}/${colName}`);
                const snapshot = await getDocs(colRef);

                if (snapshot.empty) return;

                const docs = snapshot.docs;
                const CHUNK_SIZE = 400; // Limite de segurança do Firestore

                for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
                    const batch = writeBatch(db);
                    const chunk = docs.slice(i, i + CHUNK_SIZE);

                    chunk.forEach(doc => batch.delete(doc.ref));

                    await batch.commit();
                }
            };

            // 1. Apagar todas as subcoleções sequencialmente
            for (const colName of subCollections) {
                await deleteCollection(colName);
            }

            // 2. Apagar o documento do Projeto e os Convites (Agora via Batch final)
            const finalBatch = writeBatch(db);

            // Deleta o Doc do Projeto
            const projectRef = doc(db, `artifacts/ftth-production/users/${uid}/projects`, id);
            finalBatch.delete(projectRef);

            // Deleta Convites
            const invitesQuery = query(collection(db, 'ftth_invitations'), where('projectId', '==', id));
            const invitesSnap = await getDocs(invitesQuery);
            invitesSnap.forEach(inv => {
                finalBatch.delete(inv.ref);
            });

            await finalBatch.commit();

            // 3. Limpeza do Estado Local
            if (activeProjectId === id) {
                setActiveProjectId(null);
                setProjectOwnerId(uid); // Volta para mim mesmo
                setItems([]);
                setConnections([]);
            }

            setVisibleProjectIds(prev => prev.filter(p => p !== id));
            openAlert("Sucesso", "Projeto e todos os seus dados foram excluídos.");

        } catch (error) {
            console.error("Erro ao deletar projeto:", error);
            openAlert("Erro", "Falha ao excluir projeto completamente. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };

    const handleRenameProject = async (id, newName) => {
        if (!newName.trim()) return;

        try {
            const batch = writeBatch(db);

            // 1. Atualiza o Projeto em Si
            const projectRef = doc(db, `artifacts/ftth-production/users/${user.uid}/projects`, id);
            batch.update(projectRef, { name: newName });

            // 2. Atualiza os Convites Atrelados (Para os convidados verem o nome novo)
            const invitesQuery = query(collection(db, 'ftth_invitations'), where('projectId', '==', id));
            const invitesSnap = await getDocs(invitesQuery);

            invitesSnap.forEach(inv => {
                batch.update(inv.ref, { projectName: newName });
            });

            await batch.commit();

        } catch (error) {
            console.error("Erro ao renomear projeto:", error);
            openAlert("Erro", "Não foi possível renomear o projeto.");
        }
    };

    const handleToggleProjectVisibility = (id) => {
        // 1. LÓGICA NOVA: Segurança da Caneta
        // Verificamos: O projeto clicado é o Ativo? E ele está visível atualmente?
        // Se sim, significa que vamos ocultá-lo, logo devemos desligar a caneta.
        if (activeProjectId === id && visibleProjectIds.includes(id)) {
            setActiveProjectId(null);
        }

        // 2. Lógica Original: Alternar Visibilidade
        setVisibleProjectIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(p => p !== id); // Remove da lista (Oculta)
            } else {
                return [...prev, id]; // Adiciona na lista (Mostra)
            }
        });
    };

    // Função: Enviar Convite
    const handleShareProject = async (projectId, email) => {
        const project = myProjects.find(p => p.id === projectId);
        if (!project) return;

        try {
            await addDoc(collection(db, 'ftth_invitations'), {
                fromUid: user.uid,
                fromEmail: user.email,
                toEmail: email.trim(), // Importante: deve ser exato
                projectId: project.id,
                projectName: project.name,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            openAlert("Sucesso", `Convite enviado para ${email}!`);
        } catch (error) {
            console.error(error);
            openAlert("Erro", "Não foi possível enviar o convite.");
        }
    };

    // --- FUNÇÕES DE OPERAÇÃO EM MASSA (BULK) ---
    // ------------- pode substituir a handleShareProject antiga ou adicionar estas novas ---------
    // 1. Compartilhar Vários Projetos com Vários Emails
    const handleBulkShare = async (projectIds, emails) => {
        if (projectIds.length === 0 || emails.length === 0) return;

        setLoading(true);
        try {
            const allOperations = [];
            const timestamp = new Date().toISOString();

            // Cria uma operação para cada combinação de Projeto x Email
            projectIds.forEach(pid => {
                const project = myProjects.find(p => p.id === pid);
                if (!project) return;

                emails.forEach(email => {
                    allOperations.push({
                        fromUid: user.uid,
                        fromEmail: user.email,
                        toEmail: email.trim(),
                        projectId: project.id,
                        projectName: project.name,
                        status: 'pending',
                        createdAt: timestamp
                    });
                });
            });

            // Executa em Lotes de 450 (Limite do Firebase é 500)
            const CHUNK_SIZE = 450;
            for (let i = 0; i < allOperations.length; i += CHUNK_SIZE) {
                const chunk = allOperations.slice(i, i + CHUNK_SIZE);
                const batch = writeBatch(db);

                chunk.forEach(data => {
                    const newRef = doc(collection(db, 'ftth_invitations')); // Gera ID auto
                    batch.set(newRef, data);
                });

                await batch.commit();
            }

            openAlert("Sucesso", `${allOperations.length} convites enviados com sucesso!`);

        } catch (error) {
            console.error("Erro no envio em massa:", error);
            openAlert("Erro", "Falha ao enviar convites em massa.");
        } finally {
            setLoading(false);
        }
    };

    // Função: Aceitar/Recusar Convite
    const handleRespondInvite = async (invite, response) => {
        try {
            if (response === 'rejected') {
                // Se recusar, apaga o convite
                await deleteDoc(doc(db, 'ftth_invitations', invite.id));
            } else {
                // Se aceitar, atualiza status
                await updateDoc(doc(db, 'ftth_invitations', invite.id), {
                    status: 'accepted',
                    acceptedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(error);
            openAlert("Erro", "Falha ao processar convite.");
        }
    };

    // Função para trocar o projeto ATIVO (A Caneta) - Com Toggle
    const handleSetActiveProject = (project) => {
        // Verifica se o projeto clicado JÁ É o ativo
        if (activeProjectId === project.id) {
            // --- DESATIVAR (Toggle OFF) ---
            setActiveProjectId(null);

            // Volta o "dono" para o seu próprio usuário por segurança
            // Isso evita tentar salvar coisas no banco de outra pessoa sem projeto definido
            setProjectOwnerId(user.uid);
        } else {
            // --- ATIVAR (Toggle ON) - Lógica Original ---

            // 1. Define o ID ativo
            setActiveProjectId(project.id);

            // 2. Define quem é o DONO dos dados
            setProjectOwnerId(project.ownerId);

            // 3. Garante que ele fique visível (Olho aberto)
            setVisibleProjectIds(prev => [...new Set([...prev, project.id])]);
        }
    };

    const handleRevokeShare = async (inviteId) => {
        const confirm = window.confirm("Deseja revogar o acesso deste usuário?");
        if (!confirm) return;

        try {
            await deleteDoc(doc(db, 'ftth_invitations', inviteId));
            openAlert("Sucesso", "Acesso revogado.");
        } catch (error) {
            console.error(error);
            openAlert("Erro", "Falha ao revogar acesso.");
        }
    };

    // 2. Transferir Vários Projetos Simultaneamente (Geralmente para 1 pessoa)
    const handleBulkTransfer = async (projectIds, email) => {
        if (projectIds.length === 0 || !email) return;

        const confirm = window.confirm(`ATENÇÃO: Você vai transferir ${projectIds.length} projetos para ${email}.\n\nVocê perderá o acesso a todos eles se o destinatário aceitar.\n\nContinuar?`);
        if (!confirm) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);

            projectIds.forEach(pid => {
                const project = myProjects.find(p => p.id === pid);
                if (project) {
                    const newRef = doc(collection(db, 'ftth_transfers'));
                    batch.set(newRef, {
                        fromUid: user.uid,
                        fromEmail: user.email,
                        toEmail: email.trim(),
                        projectId: project.id,
                        projectName: project.name,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    });
                }
            });

            await batch.commit();
            openAlert("Sucesso", "Solicitações de transferência enviadas!");

        } catch (error) {
            console.error(error);
            openAlert("Erro", "Falha na transferência em massa.");
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptTransfer = async (transfer) => {
        setLoading(true);
        try {
            const oldOwnerId = transfer.fromUid;
            const projectId = transfer.projectId;

            // 1. Referências
            const oldProjRef = doc(db, `artifacts/ftth-production/users/${oldOwnerId}/projects`, projectId);
            const oldItemsRef = collection(db, `artifacts/ftth-production/users/${oldOwnerId}/projects/${projectId}/items`);
            const oldConnsRef = collection(db, `artifacts/ftth-production/users/${oldOwnerId}/projects/${projectId}/connections`);
            const oldSettingsRef = collection(db, `artifacts/ftth-production/users/${oldOwnerId}/projects/${projectId}/settings`);

            // Referências de TAGS (Origem e Destino)
            const oldGlobalTagsRef = doc(db, `artifacts/ftth-production/users/${oldOwnerId}/settings/tags`);
            const myGlobalTagsRef = doc(db, `artifacts/ftth-production/users/${user.uid}/settings/tags`);

            // 2. Buscar tudo (incluindo as SUAS tags atuais)
            const projSnap = await getDoc(oldProjRef);

            if (!projSnap.exists()) {
                openAlert("Erro", "O projeto original não existe mais.");
                await deleteDoc(doc(db, 'ftth_transfers', transfer.id));
                setLoading(false);
                return;
            }

            // Promise.all expandido
            const [itemsSnap, connsSnap, settingsSnap, sourceTagsSnap, myTagsSnap] = await Promise.all([
                getDocs(oldItemsRef),
                getDocs(oldConnsRef),
                getDocs(oldSettingsRef),
                getDoc(oldGlobalTagsRef), // Tags dele
                getDoc(myGlobalTagsRef)   // Tags suas
            ]);

            // 3. Preparar Operações
            const allOperations = [];
            const newProjectId = projectId;
            const usedTagIds = new Set(); // Rastrear quais tags o projeto usa

            // A. Criar Projeto
            allOperations.push({
                type: 'SET',
                ref: doc(db, `artifacts/ftth-production/users/${user.uid}/projects`, newProjectId),
                data: { ...projSnap.data(), transferredAt: new Date().toISOString() }
            });

            // B. Itens (e rastrear tags)
            itemsSnap.forEach(d => {
                const itemData = d.data();
                if (itemData.tags && Array.isArray(itemData.tags)) {
                    itemData.tags.forEach(tagId => usedTagIds.add(tagId));
                }
                allOperations.push({
                    type: 'SET',
                    ref: doc(db, `artifacts/ftth-production/users/${user.uid}/projects/${newProjectId}/items`, d.id),
                    data: itemData
                });
                allOperations.push({ type: 'DELETE', ref: d.ref });
            });

            // C. Conexões
            connsSnap.forEach(d => {
                allOperations.push({
                    type: 'SET',
                    ref: doc(db, `artifacts/ftth-production/users/${user.uid}/projects/${newProjectId}/connections`, d.id),
                    data: d.data()
                });
                allOperations.push({ type: 'DELETE', ref: d.ref });
            });

            // D. Settings Locais
            settingsSnap.forEach(d => {
                allOperations.push({
                    type: 'SET',
                    ref: doc(db, `artifacts/ftth-production/users/${user.uid}/projects/${newProjectId}/settings`, d.id),
                    data: d.data()
                });
                allOperations.push({ type: 'DELETE', ref: d.ref });
            });

            // --- E. LÓGICA DE TAGS (MANUAL MERGE) ---
            if (sourceTagsSnap.exists() && usedTagIds.size > 0) {
                const sourceTags = sourceTagsSnap.data(); // Tags do antigo dono

                // 1. Começa com as tuas tags atuais (ou objeto vazio se não tiveres nenhuma)
                const finalTags = myTagsSnap.exists() ? { ...myTagsSnap.data() } : {};
                let modified = false;

                // 2. Adiciona/Sobrescreve apenas as tags que o projeto usa
                usedTagIds.forEach(tagId => {
                    if (sourceTags[tagId]) {
                        // Copia a definição da tag para o teu objeto
                        finalTags[tagId] = sourceTags[tagId];
                        modified = true;
                    }
                });

                // 3. Se houve alteração, grava o objeto inteiro (SET sem merge)
                if (modified) {
                    allOperations.push({
                        type: 'SET',
                        ref: myGlobalTagsRef,
                        data: finalTags // Objeto completo (Tuas tags + Novas tags)
                    });
                }
            }

            // F. Limpeza
            allOperations.push({ type: 'DELETE', ref: oldProjRef });
            allOperations.push({ type: 'DELETE', ref: doc(db, 'ftth_transfers', transfer.id) });

            // 4. Executar Batch
            const CHUNK_SIZE = 450;
            for (let i = 0; i < allOperations.length; i += CHUNK_SIZE) {
                const chunk = allOperations.slice(i, i + CHUNK_SIZE);
                const batch = writeBatch(db);

                chunk.forEach(op => {
                    if (op.type === 'SET') batch.set(op.ref, op.data); // SET padrão (sobrescreve/cria)
                    if (op.type === 'DELETE') batch.delete(op.ref);
                });

                await batch.commit();
            }

            // 5. Limpar Convites
            const oldInvitesQ = query(collection(db, 'ftth_invitations'), where('projectId', '==', projectId));
            const invitesSnap = await getDocs(oldInvitesQ);
            if (!invitesSnap.empty) {
                const batchInvites = writeBatch(db);
                invitesSnap.forEach(inv => batchInvites.delete(inv.ref));
                await batchInvites.commit();
            }

            openAlert("Sucesso", "Projeto aceito!");

        } catch (error) {
            console.error("Erro na transferência:", error);
            openAlert("Erro", "Falha ao transferir projeto.");
        } finally {
            setLoading(false);
        }
    };

    const updateLabelDB = (v) => dbAction(async () => {
        // v é um objeto tipo { 'itemId-portIndex-side': 'Novo Nome' }
        // Pegamos a primeira chave para descobrir quem é o item dono
        const key = Object.keys(v)[0];
        if (!key) return;

        // Extrai o ID do item da string (tudo antes do primeiro hífen)
        // Ex: "node_12345-0-false" -> "node_12345"
        const itemId = key.split('-')[0];
        const item = items.find(i => i.id === itemId);

        // Define projeto: Do item ou Ativo
        const targetProjectId = (item && item._projectId) ? item._projectId : activeProjectId;
        if (!targetProjectId) return;

        // Descobre dono
        const allProjects = [...myProjects, ...sharedProjects];
        const targetProj = allProjects.find(p => p.id === targetProjectId);
        const targetOwner = targetProj ? targetProj.ownerId : projectOwnerId;

        await setDoc(doc(db, `artifacts/ftth-production/users/${targetOwner}/projects/${targetProjectId}/settings`, 'portLabels'), v, { merge: true });
    });

    const updateSignalDB = (v) => dbAction(async () => {
        // v é { 'itemId-portIndex': ... }
        const key = Object.keys(v)[0];
        if (!key) return;

        const itemId = key.split('-')[0];
        const item = items.find(i => i.id === itemId);

        const targetProjectId = (item && item._projectId) ? item._projectId : activeProjectId;
        if (!targetProjectId) return;

        const allProjects = [...myProjects, ...sharedProjects];
        const targetProj = allProjects.find(p => p.id === targetProjectId);
        const targetOwner = targetProj ? targetProj.ownerId : projectOwnerId;

        await setDoc(doc(db, `artifacts/ftth-production/users/${targetOwner}/projects/${targetProjectId}/settings`, 'signals'), v, { merge: true });
    });

    // Padrões de Cabo - GLOBAL
    const updateStandardsDB = (v) => dbAction(async () => {
        if (!projectOwnerId) return;

        const docRef = doc(db, `artifacts/ftth-production/users/${projectOwnerId}/settings`, 'standards');
        await setDoc(docRef, v);
    });

    // Salvar Cores (Padrões + Favoritas) - GLOBAL
    const updateNodeColorsDB = (settings, favorites) => dbAction(async () => {
        // Usa projectOwnerId para salvar na conta do dono (global)
        if (!projectOwnerId) return;

        const docRef = doc(db, `artifacts/ftth-production/users/${projectOwnerId}/settings`, 'nodeColors');

        await setDoc(docRef, {
            settings: settings,
            favorites: favorites
        }, { merge: true });

        // O listener global atualizará o estado automaticamente
    });

    // --- FUNÇÃO UNIFICADA DE EXCLUSÃO (BATCH) ---
    const batchDelete = (ids) => dbAction(async () => {
        if (!ids || ids.length === 0) return;

        // 1. ATIVA A TELA DE CARREGAMENTO
        setIsProcessing(true);
        setProcessingMessage("Analisando dependências e itens conectados...");

        const allItemIdsToDelete = new Set(ids);

        // --- LÓGICA DE BUSCA (Mantivemos igual) ---
        const getAllDescendants = (rootId) => {
            const children = items.filter(i => i.parentId === rootId);
            let descendants = [];
            children.forEach(child => {
                descendants.push(child.id);
                descendants = [...descendants, ...getAllDescendants(child.id)];
            });
            return descendants;
        };

        ids.forEach(rootId => {
            const descendants = getAllDescendants(rootId);
            descendants.forEach(childId => allItemIdsToDelete.add(childId));
        });

        items.filter(i => i.type === 'CABLE').forEach(cable => {
            if (allItemIdsToDelete.has(cable.fromNode) || allItemIdsToDelete.has(cable.toNode)) {
                allItemIdsToDelete.add(cable.id);
            }
        });

        const connIdsToDelete = new Set();
        connections.forEach(c => {
            if (allItemIdsToDelete.has(c.fromId) || allItemIdsToDelete.has(c.toId)) {
                connIdsToDelete.add(c.id);
            }
        });

        // ------------------------------------------------------------------
        // [NOVO] LÓGICA DE LIMPEZA DO STORAGE (IMAGENS)
        // ------------------------------------------------------------------
        setProcessingMessage("Verificando imagens para exclusão...");

        // 1. Filtra itens da lista de exclusão que possuem fotos
        const itemsWithPhotos = items.filter(i =>
            allItemIdsToDelete.has(i.id) && i.photos && i.photos.length > 0
        );

        if (itemsWithPhotos.length > 0) {
            setProcessingMessage(`Removendo imagens de ${itemsWithPhotos.length} itens...`);

            const imageDeletionPromises = [];

            itemsWithPhotos.forEach(item => {
                item.photos.forEach(photo => {
                    // Só conseguimos apagar se tivermos o 'path'. 
                    // Se for sistema antigo só com URL, o backup não funcionará, mas o código não quebra.
                    if (photo.path) {
                        const imageRef = ref(storage, photo.path);
                        // Adicionamos um catch individual para cada foto.
                        // Se a foto já não existir (404), não queremos travar a exclusão do item.
                        const promise = deleteObject(imageRef).catch(err => {
                            console.warn(`Aviso: Não foi possível apagar a imagem ${photo.path}`, err.code);
                        });
                        imageDeletionPromises.push(promise);
                    }
                });
            });

            // Aguarda todas as tentativas de exclusão de imagem antes de prosseguir para o banco
            await Promise.all(imageDeletionPromises);
        }
        // ------------------------------------------------------------------
        // [FIM DA LÓGICA NOVA]
        // ------------------------------------------------------------------

        // Atualiza mensagem para o usuário
        setProcessingMessage(`Excluindo dados: ${allItemIdsToDelete.size} itens e ${connIdsToDelete.size} conexões...`);

        const allProjectsList = [...myProjects, ...sharedProjects];
        const getOwnerIdForProject = (projId) => {
            if (!projId) return projectOwnerId;
            const foundProj = allProjectsList.find(p => p.id === projId);
            return foundProj ? foundProj.ownerId : projectOwnerId;
        };

        const operations = [];

        // --- PREPARAÇÃO DE OPERAÇÕES (Mantido igual) ---

        // A. Conexões
        for (const connId of connIdsToDelete) {
            const conn = connections.find(c => c.id === connId);
            if (conn) {
                try { await cleanUpClientSignal(conn); } catch (e) { console.warn(e); }
                const targetProjectId = conn._projectId || activeProjectId;
                const targetOwner = getOwnerIdForProject(targetProjectId);
                if (targetProjectId && targetOwner) {
                    const ref = doc(db, `artifacts/ftth-production/users/${targetOwner}/projects/${targetProjectId}/connections`, connId);
                    operations.push({ type: 'DELETE', ref });
                }
            }
        }

        // B. Settings (Sinais e Labels)
        const settingsUpdates = {};
        for (const itemId of allItemIdsToDelete) {
            const item = items.find(i => i.id === itemId);
            if (item) {
                const targetProjectId = item._projectId || activeProjectId;
                const targetOwner = getOwnerIdForProject(targetProjectId);
                if (targetProjectId && targetOwner) {
                    const basePath = `artifacts/ftth-production/users/${targetOwner}/projects/${targetProjectId}/settings`;

                    // Signals
                    const signalsPath = `${basePath}/signals`;
                    const signalKeys = Object.keys(signalNames).filter(k => k.startsWith(`${itemId}-`));
                    if (signalKeys.length > 0) {
                        if (!settingsUpdates[signalsPath]) settingsUpdates[signalsPath] = {};
                        signalKeys.forEach(k => settingsUpdates[signalsPath][k] = deleteField());
                    }
                    // PortLabels
                    const labelsPath = `${basePath}/portLabels`;
                    const labelKeys = Object.keys(portLabels).filter(k => k.startsWith(`${itemId}-`));
                    if (labelKeys.length > 0) {
                        if (!settingsUpdates[labelsPath]) settingsUpdates[labelsPath] = {};
                        labelKeys.forEach(k => settingsUpdates[labelsPath][k] = deleteField());
                    }
                }
            }
        }
        Object.entries(settingsUpdates).forEach(([path, fields]) => {
            const ref = doc(db, path);
            operations.push({ type: 'UPDATE', ref, data: fields });
        });

        // C. Itens Físicos
        for (const itemId of allItemIdsToDelete) {
            const item = items.find(i => i.id === itemId);
            if (item) {
                const targetProjectId = item._projectId || activeProjectId;
                const targetOwner = getOwnerIdForProject(targetProjectId);
                if (targetProjectId && targetOwner) {
                    const ref = doc(db, `artifacts/ftth-production/users/${targetOwner}/projects/${targetProjectId}/items`, itemId);
                    operations.push({ type: 'DELETE', ref });
                }
            }
        }

        // --- EXECUÇÃO EM FATIAS (Mantido igual) ---
        const CHUNK_SIZE = 450;
        const totalBatches = Math.ceil(operations.length / CHUNK_SIZE);
        let batchCount = 0;

        try {
            for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
                batchCount++;
                setProcessingMessage(`Excluindo registros: Lote ${batchCount} de ${totalBatches}...`);

                const chunk = operations.slice(i, i + CHUNK_SIZE);
                const batch = writeBatch(db);

                chunk.forEach(op => {
                    if (op.type === 'DELETE') batch.delete(op.ref);
                    if (op.type === 'UPDATE') batch.set(op.ref, op.data, { merge: true });
                });

                await batch.commit();
                await new Promise(r => setTimeout(r, 100));
            }

            openAlert("Sucesso", "Limpeza concluída.");

        } catch (error) {
            console.error("Erro crítico no batchDelete:", error);
            openAlert("Erro", "Falha durante a exclusão. Verifique sua conexão.");
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');

            setSelectedIds(new Set());
            if (detailId && allItemIdsToDelete.has(detailId)) {
                setDetailId(null);
            }
        }
    });

    // Função auxiliar para abrir modal de edição
    // Função auxiliar para abrir modal de edição
    const openEditModal = (
        t, iv, cb, ic, scp,
        initialTagIds = [],
        isObject = false,
        initialIcon = null,
        initialType = null,
        initialPorts = 0,
        initialUplinks = 4,
        initialInterfaces = null,
    ) => {
        setEditModalConfig({
            title: t,
            initialValue: iv,
            initialColor: ic,
            initialTagIds: initialTagIds,
            showColorPicker: scp,
            favoriteColors: favoriteColors,
            isObject: isObject,
            initialIcon: initialIcon,
            initialType: initialType,
            initialPorts: initialPorts,
            initialUplinks: initialUplinks,
            initialInterfaces: initialInterfaces,

            // Callback: (nome, cor, tags, ícone, tipo, portas, uplinks, interfaces)
            onConfirm: (val, col, tags, icon, type, ports, uplinks, interfaces) => {
                cb(val, col, tags, icon, type, ports, uplinks, interfaces);
                setEditModalConfig(null);
            }
        });
    };

    const openInfoModal = (t, l) => setInfoModalConfig({ title: t, lines: l, onClose: () => setInfoModalConfig(null) });

    const openConfirm = (t, m, onC) => setConfirmConfig({ title: t, message: m, onConfirm: () => { onC(); setConfirmConfig(null); } });

    const openAlert = (t, m) => setAlertConfig({ title: t, message: m });

    // // Configurações de Perfil
    // const ProfileModal = ({ user, onClose, onUpdateName, onUpdatePassword, onDeleteAccount, onLogout }) => { // <--- Adicione onLogout aqui
    //     const [newName, setNewName] = useState(user?.displayName || "");
    //     const [newPassword, setNewPassword] = useState("");
    //     const [confirmDelete, setConfirmDelete] = useState("");
    //     const [activeTab, setActiveTab] = useState('general');

    //     return (
    //         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
    //             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border dark:border-gray-700">

    //                 {/* Header */}
    //                 <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b dark:border-gray-700 flex justify-between items-center">
    //                     <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
    //                         <CircleUserRound size={20} className="text-blue-600" />
    //                         Configurações da Conta
    //                     </h3>
    //                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
    //                 </div>

    //                 <div className="flex min-h-[300px]">
    //                     {/* Sidebar do Modal */}
    //                     <div className="w-1/3 bg-gray-50 dark:bg-gray-900/30 border-r dark:border-gray-700 p-2 space-y-1">
    //                         <button
    //                             onClick={() => setActiveTab('general')}
    //                             className={`w-full text-left px-3 py-2 rounded text-xs font-bold flex items-center gap-2 ${activeTab === 'general' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
    //                         >
    //                             <User size={14} /> Perfil
    //                         </button>
    //                         <button
    //                             onClick={() => setActiveTab('danger')}
    //                             className={`w-full text-left px-3 py-2 rounded text-xs font-bold flex items-center gap-2 ${activeTab === 'danger' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-500'}`}
    //                         >
    //                             <ShieldAlert size={14} /> Zona de Perigo
    //                         </button>
    //                     </div>

    //                     {/* Conteúdo */}
    //                     <div className="w-2/3 p-5 flex flex-col">
    //                         {activeTab === 'general' && (
    //                             <div className="space-y-5 flex-1">
    //                                 <div>
    //                                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Email Logado</label>
    //                                     <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded border dark:border-gray-600">
    //                                         <Mail size={14} /> {user?.email}
    //                                     </div>
    //                                 </div>

    //                                 <div>
    //                                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Usuário</label>
    //                                     <div className="flex gap-2">
    //                                         <input
    //                                             className="w-full border dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
    //                                             value={newName}
    //                                             onChange={(e) => setNewName(e.target.value)}
    //                                             placeholder="Seu Nome"
    //                                         />
    //                                         <button onClick={() => onUpdateName(newName)} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700" title="Salvar Nome"><Save size={16} /></button>
    //                                     </div>
    //                                 </div>

    //                                 <div>
    //                                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Alterar Senha</label>
    //                                     <div className="flex gap-2">
    //                                         <input
    //                                             type="password"
    //                                             className="w-full border dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
    //                                             value={newPassword}
    //                                             onChange={(e) => setNewPassword(e.target.value)}
    //                                             placeholder="Nova Senha"
    //                                         />
    //                                         <button onClick={() => onUpdatePassword(newPassword)} className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600" title="Atualizar Senha"><Save size={16} /></button>
    //                                     </div>
    //                                 </div>

    //                                 {/* --- NOVO BOTÃO DE SAIR --- */}
    //                                 <div className="pt-4 mt-auto border-t dark:border-gray-700">
    //                                     <button
    //                                         onClick={onLogout}
    //                                         className="w-full flex items-center justify-center gap-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-sm font-bold"
    //                                     >
    //                                         <LogOut size={16} /> Sair da Conta
    //                                     </button>
    //                                 </div>
    //                                 {/* ------------------------ */}
    //                             </div>
    //                         )}

    //                         {activeTab === 'danger' && (
    //                             <div className="space-y-4">
    //                                 <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg text-red-800 dark:text-red-200 text-xs leading-relaxed">
    //                                     <strong>Atenção:</strong> Ao excluir sua conta, todos os seus dados serão apagados permanentemente. Esta ação é irreversível.
    //                                 </div>

    //                                 <div>
    //                                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Digite "DELETAR" para confirmar</label>
    //                                     <input
    //                                         className="w-full border border-red-300 dark:border-red-800 rounded p-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
    //                                         value={confirmDelete}
    //                                         onChange={(e) => setConfirmDelete(e.target.value)}
    //                                         placeholder="DELETAR"
    //                                     />
    //                                 </div>

    //                                 <button
    //                                     disabled={confirmDelete !== 'DELETAR'}
    //                                     onClick={onDeleteAccount}
    //                                     className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center justify-center gap-2"
    //                                 >
    //                                     <Trash2 size={16} /> Excluir Minha Conta
    //                                 </button>
    //                             </div>
    //                         )}
    //                     </div>
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // };

    // Logout
    const handleLogout = async () => {
        try {
            setIsProfileOpen(false);
            // Chama o logout oficial do Firebase passando a instância auth
            await signOut(auth);
            // Limpa o estado do usuário localmente para forçar a tela de login aparecer
            setUser(null);
        } catch (error) {
            openAlert("Erro", "Falha ao desconectar.");
        }
    };

    // --- FUNÇÕES DE PERFIL ---
    const handleUpdateProfileName = async (newName) => {
        if (!auth.currentUser || !newName.trim()) return;
        try {
            await updateProfile(auth.currentUser, { displayName: newName });
            openAlert("Sucesso", "Nome de perfil atualizado!");
            // Força atualização do estado local do usuário
            setUser({ ...auth.currentUser, displayName: newName });
        } catch (error) {
            console.error(error);
            openAlert("Erro", "Não foi possível atualizar o nome.");
        }
    };

    const handleUpdatePhoto = async (file) => {
        if (!auth.currentUser || !file) return;
        setUploadingPhoto(true);
        try {
            const fileRef = ref(storage, `artifacts/ftth-production/users/${auth.currentUser.uid}/profilePicture`);
            await uploadBytes(fileRef, file);
            const photoURL = await getDownloadURL(fileRef);

            await updateProfile(auth.currentUser, { photoURL });

            setUser({ ...auth.currentUser, photoURL });
            openAlert("Sucesso", "Foto de perfil atualizada!");
        } catch (error) {
            console.error("Erro ao atualizar foto:", error);
            openAlert("Erro", "Não foi possível atualizar a foto de perfil.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleDeletePhoto = async () => {
        if (!auth.currentUser || !auth.currentUser.photoURL) return;
        setUploadingPhoto(true);
        try {
            const fileRef = ref(storage, `artifacts/ftth-production/users/${auth.currentUser.uid}/profilePicture`);
            await deleteObject(fileRef);
            await updateProfile(auth.currentUser, { photoURL: "" });
            setUser({ ...auth.currentUser, photoURL: "" });
            openAlert("Sucesso", "Foto de perfil removida!");
        } catch (error) {
            console.error("Erro ao remover foto:", error);
            // Fallback in case the file doesn't exist but the profile still has the URL
            await updateProfile(auth.currentUser, { photoURL: "" });
            setUser({ ...auth.currentUser, photoURL: "" });
            openAlert("Sucesso", "Foto de perfil removida!");
        } finally {
            setUploadingPhoto(false);
        }
    };

    // const handleUpdatePassword = async (newPass) => {
    //     if (!auth.currentUser || !newPass || newPass.length < 8) {
    //         openAlert("Atenção", "A senha deve ter pelo menos 8 caracteres.");
    //         return;
    //     }
    //     try {
    //         await updatePassword(auth.currentUser, newPass);
    //         openAlert("Sucesso", "Senha alterada! Você será desconectado automaticamente, realize login novamente.");
    //         setIsProfileOpen(false);
    //         handleLogout(); // Desloga por segurança
    //     } catch (error) {
    //         console.error(error);
    //         // Firebase exige login recente para trocar senha
    //         if (error.code === 'auth/requires-recent-login') {
    //             openAlert("Segurança", "Para mudar a senha, faça logout e login novamente antes de tentar.");
    //         } else {
    //             openAlert("Erro", "Falha ao atualizar senha.");
    //         }
    //     }
    // };

    const handleUpdatePassword = async (newPass) => {
        if (!auth.currentUser || !newPass || newPass.length < 8) {
            openAlert("Atenção", "A senha deve ter pelo menos 8 caracteres.");
            return;
        }
        try {
            await updatePassword(auth.currentUser, newPass);

            // O código vai PARAR aqui e esperar o usuário clicar em "OK"
            await Dialog.alert({
                title: 'Sucesso',
                message: 'Senha alterada! Você será desconectado automaticamente, realize login novamente.',
            });
            setIsProfileOpen(false);
            // Só executa o logout DEPOIS que a janela for fechada
            handleLogout();
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                openAlert("Segurança", "Para mudar a senha, faça logout e login novamente antes de tentar.");
            } else {
                openAlert("Erro", "Falha ao atualizar senha.");
            }
        }
    };

    // Excluir usuario e todos os dados
    const handleDeleteAccountFull = async () => {
        if (!auth.currentUser) return;

        const confirmFinal = window.confirm("ATENÇÃO: Isso apagará TODOS os seus dados e sua conta permanentemente. Deseja continuar?");
        if (!confirmFinal) return;

        setIsLoading(true); // Bloqueia a tela

        try {
            const uid = auth.currentUser.uid;

            // 1. APAGAR FOTOS DO STORAGE
            // (O try/catch aqui garante que se a foto não existir, o código continua)
            const itemsWithPhotos = items.filter(i => i.photos && i.photos.length > 0);
            for (const item of itemsWithPhotos) {
                for (const photo of item.photos) {
                    try {
                        const imageRef = ref(storage, photo.path);
                        await deleteObject(imageRef);
                    } catch (err) {
                        // Apenas avisa no console e segue o baile
                        console.warn("Ignorando foto não encontrada:", err.message);
                    }
                }
            }

            // 2. APAGAR CONEXÕES (Firestore)
            const deleteConnsPromises = connections.map(conn =>
                deleteDoc(doc(db, `artifacts/ftth-production/users/${uid}/connections`, conn.id))
            );
            await Promise.all(deleteConnsPromises);

            // 3. APAGAR ITENS (Firestore)
            const deleteItemsPromises = items.map(item =>
                deleteDoc(doc(db, `artifacts/ftth-production/users/${uid}/items`, item.id))
            );
            await Promise.all(deleteItemsPromises);

            // 4. LIMPAR TODAS AS CONFIGURAÇÕES (Settings)
            const settingsToDelete = [
                'tags',
                'signals',
                'nodeColors',
                'portLabels',
                'standards',
                'mapConfig'
            ];

            const deleteSettingsPromises = settingsToDelete.map(docName =>
                deleteDoc(doc(db, `artifacts/ftth-production/users/${uid}/settings`, docName))
            );
            await Promise.all(deleteSettingsPromises);

            // 5. FINALMENTE: APAGAR USUÁRIO DO AUTH
            await deleteUser(auth.currentUser);

            alert("Conta e todos os dados foram excluídos com sucesso.");

        } catch (error) {
            console.error("Erro ao excluir conta:", error);

            if (error.code === 'auth/requires-recent-login') {
                openAlert("Segurança", "Para excluir a conta, faça Logout e Login novamente e tente imediatamente.");
            } else {
                openAlert("Erro", "Ocorreu um erro, mas partes dos dados podem ter sido apagadas. Verifique o console.");
            }
        } finally {
            // CORREÇÃO: Garante que a tela de carregamento suma SEMPRE
            setIsLoading(false);
            setResolvingProfile(false); // Garante que não fique preso em 'resolvendo perfil'
            setUser(null); // Força a limpeza do estado local para exibir o AuthScreen
        }
    };

    const handleAddSlotConfirm = async (name, portCount) => {
        if (!slotModalConfig) return;
        const { item, type } = slotModalConfig;

        // Recupera o item mais atual (para não sobrescrever mudanças)
        const currentItem = items.find(i => i.id === item.id);
        if (!currentItem) return;

        try {
            if (type === 'OLT') {
                const newInterface = {
                    id: Date.now(),
                    name: name,
                    portCount: parseInt(portCount)
                };
                const updatedInterfaces = [...(currentItem.interfaces || []), newInterface];
                await saveItem({ ...currentItem, interfaces: updatedInterfaces });
            }
            else if (type === 'DIO') {
                const newCard = {
                    id: Date.now(),
                    name: name,
                    portCount: parseInt(portCount)
                };
                const updatedCards = [...(currentItem.cards || []), newCard];
                await saveItem({ ...currentItem, cards: updatedCards });
            }
        } catch (error) {
            console.error(error);
            openAlert("Erro", "Falha ao adicionar slot.");
        } finally {
            setSlotModalConfig(null);
        }
    };

    const handleSearchSelect = (item) => {
        let tId = item.id;
        let tItem = item;
        if (item.parentId) {
            tId = item.parentId;
            tItem = items.find(i => i.id === tId);
        }
        if (tItem) {
            const w = ITEM_TYPES[tItem.type]?.width || 120;
            setPan({
                x: (window.innerWidth / 2) - (tItem.x * scale) - ((w * scale) / 2),
                y: (window.innerHeight / 2) - (tItem.y * scale) - (50 * scale)
            });
            setDetailId(tId);
            setSearchTerm('');
        }
    };

    const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Atualiza a posição do nó APENAS no state local (sem write ao Firestore).
    // O salvamento no banco ocorre apenas no handleEnd (ao soltar o item).
    const updateNodePosition = (id, x, y) => {
        setItems(prev => prev.map(i =>
            i.id === id
                ? { ...i, x, y }
                : i
        ));
    };

    const renameItem = (id, oldName) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const initialColor = item.color ||
            (item.type === 'CABLE' ? item.color :
                (nodeColorSettings && nodeColorSettings[item.type]) ||
                ITEM_TYPES[item.type]?.defaultColor || '#000000');

        const showPicker = item.type === 'CABLE' || ['POP', 'CEO', 'CTO', 'TOWER', 'POST', 'OBJECT'].includes(item.type);

        openEditModal(
            "Editar Item",            // 1. Título
            oldName,                  // 2. Valor Inicial

            // 3. CALLBACK
            (newName, newColor, newTagIds, newIcon, newType, newPorts, newUplinks, newInterfaces) => {
                const updatedItem = {
                    ...item,
                    name: newName,
                    color: newColor,
                    tagIds: newTagIds,
                    ...(newIcon ? { iconType: newIcon } : {}),
                    ...(newType ? { type: newType } : {}),
                };

                // Salva interfaces/cards da OLT ou DIO
                if (item.type === 'OLT' && newInterfaces) {
                    updatedItem.interfaces = newInterfaces.map(i => ({
                        ...i,
                        portCount: parseInt(i.portCount) || 0
                    }));
                    updatedItem.uplinks = parseInt(newUplinks) || 0;
                }
                if (item.type === 'DIO' && newInterfaces) {
                    updatedItem.cards = newInterfaces.map(i => ({
                        ...i,
                        portCount: parseInt(i.portCount) || 0
                    }));
                }

                // Salva fibras do cabo
                if (item.type === 'CABLE') {
                    updatedItem.ports = parseInt(newPorts) || 0;
                }

                // Salva ratio do splitter
                if (item.type === 'SPLITTER') {
                    updatedItem.ports = parseInt(newPorts) || 0;
                }

                // Salva portas de devices simples
                if (['SWITCH', 'POE', 'ROUTER', 'CAMERA'].includes(item.type)) {
                    updatedItem.ports = parseInt(newPorts) || 0;
                }

                saveItem(updatedItem);
            },

            initialColor,             // 4. Cor Inicial
            showPicker,               // 5. Mostrar ColorPicker
            item.tagIds || [],        // 6. Tags Iniciais
            item.type === 'OBJECT',   // 7. isObject
            item.iconType,            // 8. initialIcon
            item.type,                // 9. initialType
            item.ports || 0,      // 10. initialPorts
            item.uplinks || 4,      // 11. initialUplinks
            item.interfaces || item.cards || null, // 12. initialInterfaces
        );
    };

    const deleteItem = (id) => {
        // 1. VERIFICAÇÃO DE CABOS (Proteção de Topologia)
        // Se houver algum cabo chegando ou saindo deste nó, bloqueia.
        const attachedCables = items.filter(i => i.type === 'CABLE' && (i.fromNode === id || i.toNode === id));

        if (attachedCables.length > 0) {
            openAlert(
                "Ação Bloqueada",
                `Não é possível excluir este item pois ele possui ${attachedCables.length} cabo(s) conectado(s). Desfaça as conexões dos cabos primeiro.`
            );
            return;
        }

        // 2. VERIFICAÇÃO DE CLIENTES (Proteção de Clientes)
        // Verifica se há clientes conectados em qualquer equipamento DENTRO desta caixa (ex: Splitters)

        // Pega o ID da própria caixa + IDs de tudo que está dentro dela (Splitters, DIOs, etc)
        const internalIds = items.filter(i => i.parentId === id).map(i => i.id);
        const allRelatedIds = [id, ...internalIds];

        // Procura se existe alguma conexão ativa ligando esta caixa a um Cliente
        const hasClientConnection = connections.some(c => {
            // Verifica se um dos lados da conexão pertence a esta caixa
            const isFromBox = allRelatedIds.includes(c.fromId);
            const isToBox = allRelatedIds.includes(c.toId);

            // Se sai da caixa e vai para um Cliente
            if (isFromBox && !isToBox) {
                const target = items.find(i => i.id === c.toId);
                return target && target.type === 'CLIENT';
            }
            // Se (raramente) sai de um Cliente e entra na caixa
            if (isToBox && !isFromBox) {
                const source = items.find(i => i.id === c.fromId);
                return source && source.type === 'CLIENT';
            }
            return false;
        });

        if (hasClientConnection) {
            openAlert(
                "Ação Bloqueada",
                "Não é possível excluir este item pois existem Clientes conectados a ele. Desconecte os clientes ou remova os drops primeiro."
            );
            return;
        }

        // 3. SE PASSOU NAS VERIFICAÇÕES, CONFIRMA A EXCLUSÃO
        openConfirm("Remover Item", "Tem certeza que deseja excluir este item permanentemente?", () => {
            deleteItemDB(id);
            // A função deleteItemDB (que atualizamos antes) já cuida de limpar conexões internas órfãs,
            // mas agora garantimos que não sobrarão cabos externos quebrados.

            if (selectedIds.has(id)) {
                const newSet = new Set(selectedIds);
                newSet.delete(id);
                setSelectedIds(newSet);
            }
            if (detailId === id) setDetailId(null);
        });
    };

    const deleteSelected = () => { openConfirm("Excluir Múltiplos", `Deseja excluir ${selectedIds.size} itens?`, () => { batchDelete(Array.from(selectedIds)); setSelectedIds(new Set()); }); };

    const getClientPos = (e) => { if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY }; if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }; return { x: e.clientX, y: e.clientY }; };

    const getTouchDistance = (t1, t2) => { const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY; return Math.sqrt(dx * dx + dy * dy); };

    const handleEnd = (e, node) => {
        if (draggingNode?.isMultiSelect) { setSelectedItemsOffset({ dx: 0, dy: 0 }); } if (e.touches && e.touches.length < 2) { touchRef.current.dist = 0; } if (interactionMode === 'SELECT') { if (node) { const pos = getClientPos(e.changedTouches ? e.changedTouches[0] : e); const dist = Math.sqrt(Math.pow(pos.x - dragStartPosRef.current.x, 2) + Math.pow(pos.y - dragStartPosRef.current.y, 2)); if (dist < 5) { if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current); clickTimeoutRef.current = setTimeout(() => { setSelectedIds(new Set([node.id])); setDetailId(null); }, 250); } } else { const pos = getClientPos(e.changedTouches ? e.changedTouches[0] : e); const dist = Math.sqrt(Math.pow(pos.x - dragStartPosRef.current.x, 2) + Math.pow(pos.y - dragStartPosRef.current.y, 2)); if (dist < 5) { setSelectedIds(new Set()); setDetailId(null); } } } else if (interactionMode === 'DRAW_CABLE' && node) {
            // USA REF para evitar stale closure (igual ao modo mapa)
            const currentStart = cableStartNodeRef.current;
            if (!currentStart) {
                cableStartNodeRef.current = node; // atualiza ref IMEDIATAMENTE
                setCableStartNode(node);          // atualiza state para UI
            } else if (currentStart.id !== node.id) {
                setModalConfig({ mode: 'CABLE', fromNode: currentStart, toNode: node, defaultName: `Cabo ${items.filter(i => i.type === 'CABLE').length + 1}`, defaultPorts: 12 });
            }
        } else if (interactionMode === 'BOX_SELECT' && boxSelectionRef.current) {
            const selBox = selectionBox;
            if (selBox) {
                const newSelection = new Set();

                // 1. ITERAÇÃO DE NÓS (Corrigido para usar visibleItems)
                // Antes: items.filter(...) -> Agora: visibleItems.filter(...)
                visibleItems.filter(i => !i.parentId && ITEM_TYPES[i.type].category === 'NODE').forEach(item => {
                    const w = ITEM_TYPES[item.type].width;
                    const h = 100;
                    // Verifica colisão
                    if (item.x < selBox.x + selBox.w &&
                        item.x + w > selBox.x &&
                        item.y < selBox.y + selBox.h &&
                        item.y + h > selBox.y) {
                        newSelection.add(item.id);
                    }
                });

                // 2. ITERAÇÃO DE CABOS (Corrigido para usar visibleItems)
                // Antes: items.filter(...) -> Agora: visibleItems.filter(...)
                visibleItems.filter(i => i.type === 'CABLE').forEach(cable => {
                    // Nota: Aqui mantemos 'items.find' para buscar as pontas (nA e nB),
                    // pois precisamos das coordenadas delas mesmo que estejam ocultas,
                    // já que decidiste que cabos podem aparecer sem os nós.
                    const nA = items.find(n => n.id === cable.fromNode);
                    const nB = items.find(n => n.id === cable.toNode);

                    if (nA && nB) {
                        const wA = ITEM_TYPES[nA.type].width;
                        const wB = ITEM_TYPES[nB.type].width;
                        const cAx = nA.x + wA / 2;
                        const cAy = nA.y + 30;
                        const cBx = nB.x + wB / 2;
                        const cBy = nB.y + 30;

                        const midX = (cAx + cBx) / 2;
                        const midY = (cAy + cBy) / 2;

                        if (midX >= selBox.x && midX <= selBox.x + selBox.w &&
                            midY >= selBox.y && midY <= selBox.y + selBox.h) {
                            newSelection.add(cable.id);
                        }
                    }
                });

                setSelectedIds(newSelection);
                if (newSelection.size > 0) setInteractionMode('SELECT');
            }
            setSelectionBox(null);
            boxSelectionRef.current = null;
        }
        // SALVAR NO FIRESTORE AO SOLTAR: Uma única write por item, com a posição final.
        // Usamos setItems com callback para garantir as posições mais atuais (sem stale closure).
        if (draggingNode) {
            setItems(currentItems => {
                if (draggingNode.isMultiSelect && selectedIds.size > 1) {
                    // Multi-select: salva todos os itens arrastados
                    selectedIds.forEach(id => {
                        const movedItem = currentItems.find(i => i.id === id);
                        if (movedItem && !movedItem.parentId) {
                            saveItem({ ...movedItem });
                        }
                    });
                } else {
                    // Single: salva apenas o item arrastado
                    const movedItem = currentItems.find(i => i.id === draggingNode.id);
                    if (movedItem) {
                        saveItem({ ...movedItem });
                    }
                }
                return currentItems; // Não muda o state, só aproveita o callback para ler o valor atual
            });
        }
        setIsDraggingCanvas(false); setDraggingNode(null);
    };

    const handleNodeDoubleClick = (e, node) => { e.stopPropagation(); if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current); setDetailId(node.id); setSelectedIds(new Set([node.id])); };

    const handleCanvasClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clickX = (e.clientX - rect.left - pan.x) / scale;
        const clickY = (e.clientY - rect.top - pan.y) / scale;

        if (interactionMode === 'ADD_NODE' && nodeTypeToAdd) {
            setModalConfig({
                mode: 'NODE',
                itemType: nodeTypeToAdd,
                x: clickX,
                y: clickY,
                defaultName: `${ITEM_TYPES[nodeTypeToAdd].label} ${items.filter(i => i.type === nodeTypeToAdd).length + 1}`
            });
        }
        else if (interactionMode === 'ADD_CLIENT') {
            // MUDANÇA: Guarda na memória dedicada
            setNewClientPosition({ x: clickX, y: clickY });
            setClientWizard({ step: 'NAME', data: {} });
            setInteractionMode('SELECT');
        }
    };

    const handleZoom = (delta) => setScale(s => Math.min(Math.max(0.1, s + delta), 5));

    // 1. Início do Toque (Captura a distância inicial)
    const handleStart = (e, node) => {
        // Se o elemento clicado (ou o pai dele) tiver a classe 'prevent-pan', PARE.
        if (e.target.closest('.prevent-pan')) {
            return;
        }

        if (e.touches && e.touches.length === 2) {
            e.preventDefault(); // Evita zoom nativo do navegador
            touchRef.current.dist = getTouchDistance(e.touches[0], e.touches[1]);
            return;
        }
        const pos = getClientPos(e);
        dragStartPosRef.current = pos;

        if (interactionMode === 'SELECT') {
            if (node) {
                // --- LÓGICA NOVA: SELECIONAR CTO PARA O CLIENTE ---
                if (clientWizard.step === 'PICK_CTO') {
                    e.stopPropagation();
                    if (node.type !== 'CTO') {
                        openAlert("Atenção", "Selecione uma CTO válida (Caixa de Terminação).");
                        return;
                    }

                    // Buscar Splitter dentro da CTO
                    const splitter = items.find(i => i.parentId === node.id && i.type === 'SPLITTER');
                    if (!splitter) {
                        openAlert("Erro", "Esta CTO não possui Splitter instalado.");
                        return;
                    }

                    // Calcular portas livres
                    const freePorts = [];
                    // Começamos do 1 porque 0 é entrada
                    for (let i = 1; i < splitter.ports; i++) {
                        // Verifica se tem conexão nesta porta (Lado A é a saída do splitter)
                        const isBusy = findConnection(connections, splitter.id, i, 'A');
                        if (!isBusy) {
                            freePorts.push({ id: i, label: i, splitterId: splitter.id });
                        }
                    }

                    if (freePorts.length === 0) {
                        openAlert("Lotada", "Esta CTO não tem portas disponíveis.");
                        return;
                    }

                    // Avança para o passo de escolher a porta
                    setClientWizard({
                        step: 'PICK_PORT',
                        data: { ...clientWizard.data, ctoNode: node, splitter, freePorts }
                    });
                    return;
                }
                // --------------------------------------------------            
                e.stopPropagation();

                // Se o nó clicado está entre os selecionados, move todos os selecionados
                if (selectedIds.has(node.id)) {
                    // Armazena o ponto inicial do arrasto
                    dragStartPosRef.current = { x: pos.x, y: pos.y };
                    setDraggingNode({ id: node.id, isMultiSelect: true });
                } else {
                    // Move apenas o nó clicado
                    setDraggingNode({ id: node.id, isMultiSelect: false });
                }
            } else {
                setIsDraggingCanvas(true);
                setDragStart({ x: pos.x - pan.x, y: pos.y - pan.y });
            }
        }
        else if (interactionMode === 'BOX_SELECT') {
            const rect = canvasRef.current.getBoundingClientRect();
            const mapX = (pos.x - rect.left - pan.x) / scale;
            const mapY = (pos.y - rect.top - pan.y) / scale;
            boxSelectionRef.current = { startX: mapX, startY: mapY };
            setSelectionBox({ x: mapX, y: mapY, w: 0, h: 0 });
        }
    };

    // 2. Movimento (Pinça Suave e Zoom no Centro dos Dedos)
    const handleMove = useCallback((e) => {
        if (e.touches && e.touches.length === 2) {
            e.preventDefault();
            const newDist = getTouchDistance(e.touches[0], e.touches[1]);
            const oldDist = touchRef.current.dist;

            if (oldDist < 10) return;

            const ratio = newDist / oldDist;
            const newScale = Math.min(Math.max(0.1, scale * ratio), 5);

            const rect = canvasRef.current.getBoundingClientRect();
            const midX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            const midY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;

            const scaleChange = newScale / scale;
            const newPanX = midX - (midX - pan.x) * scaleChange;
            const newPanY = midY - (midY - pan.y) * scaleChange;

            setScale(newScale);
            setPan({ x: newPanX, y: newPanY });
            touchRef.current.dist = newDist;
            return;
        }
        // Lógica de Arraste (Pan) normal
        const pos = getClientPos(e);
        if (isDraggingCanvas) {
            setPan({ x: pos.x - dragStart.x, y: pos.y - dragStart.y });
        }
        else if (draggingNode) {
            const rect = canvasRef.current.getBoundingClientRect();
            const newX = (pos.x - rect.left - pan.x) / scale;
            const newY = (pos.y - rect.top - pan.y) / scale;

            if (draggingNode.isMultiSelect && selectedIds.size > 1) {
                // Move todos os itens selecionados
                const draggedItem = items.find(i => i.id === draggingNode.id);
                if (!draggedItem) return;

                // Calcula o deslocamento desde o início do arrasto
                const itemWidth = ITEM_TYPES[draggedItem.type]?.width || 120;
                const deltaX = newX - draggedItem.x - (itemWidth / 2);
                const deltaY = newY - draggedItem.y;

                // Atualiza o deslocamento
                setSelectedItemsOffset({ dx: deltaX, dy: deltaY });

                // Move cada item selecionado
                selectedIds.forEach(id => {
                    const item = items.find(i => i.id === id);
                    if (item && !item.parentId) { // Só move itens no canvas principal (não filhos)
                        const newItemX = item.x + deltaX;
                        const newItemY = item.y + deltaY;
                        updateNodePosition(item.id, newItemX, newItemY);
                    }
                });

                // Reseta o deslocamento para o próximo frame
                setSelectedItemsOffset({ dx: 0, dy: 0 });
            } else {
                // Move apenas o item arrastado (comportamento original)
                updateNodePosition(draggingNode.id, newX - (ITEM_TYPES[items.find(i => i.id === draggingNode.id).type].width / 2), newY);
            }
        }
        else if (interactionMode === 'BOX_SELECT' && boxSelectionRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const currX = (pos.x - rect.left - pan.x) / scale;
            const currY = (pos.y - rect.top - pan.y) / scale;
            const startX = boxSelectionRef.current.startX;
            const startY = boxSelectionRef.current.startY;
            setSelectionBox({ x: Math.min(startX, currX), y: Math.min(startY, currY), w: Math.abs(currX - startX), h: Math.abs(currY - startY) });
        }
    }, [scale, pan, isDraggingCanvas, draggingNode, interactionMode]); // Adicione useCallback

    // 3. Roda do Mouse (Zoom Suave no Cursor)
    const handleWheel = (e) => {
        // Permite scroll normal se não estiver no canvas ou se o usuário quiser (opcional)
        // Aqui vamos focar no zoom do canvas
        if (!isDraggingCanvas) {
            // Fator de suavização (0.001 é bem suave, aumente se quiser mais rápido)
            const zoomIntensity = 0.001;
            const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomIntensity), 5);

            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Matemática do Zoom no Cursor
            const scaleRatio = newScale / scale;
            const newPanX = mouseX - (mouseX - pan.x) * scaleRatio;
            const newPanY = mouseY - (mouseY - pan.y) * scaleRatio;

            setPan({ x: newPanX, y: newPanY });
            setScale(newScale);
        }
    };

    const handleClientFinish = async (portSelection) => {
        const { ctoNode, name, existingClientId } = clientWizard.data;

        if (!ctoNode) return;

        try {
            let finalClientId = existingClientId;
            let finalClientName = name;

            if (!finalClientId) {
                finalClientName = name || "Novo Cliente";

                // Posição padrão (Fallback)
                const offset = 80;
                const angle = Math.random() * Math.PI * 2;

                let x = ctoNode.x + Math.cos(angle) * offset;
                let y = ctoNode.y + Math.sin(angle) * offset;
                let lat = null;
                let lng = null;

                // NOVA ABORDAGEM: Lê da memória dedicada 'newClientPosition'
                if (newClientPosition) {
                    if (newClientPosition.x !== undefined) {
                        x = newClientPosition.x;
                        y = newClientPosition.y;
                    }
                    if (newClientPosition.lat !== undefined) {
                        lat = newClientPosition.lat;
                        lng = newClientPosition.lng;
                    }
                }

                const newClient = {
                    id: Date.now().toString(),
                    type: 'CLIENT',
                    x,
                    y,
                    lat,
                    lng,
                    name: finalClientName,
                    ports: 1,
                    color: '#ec4899'
                };

                await saveItem(newClient);
                finalClientId = newClient.id;

                // Limpa a memória depois de usar
                setNewClientPosition(null);
            }

            // ... Lógica de Conexão (Mantida igual) ...
            let sourceId = ctoNode.id;
            let sourcePort = portSelection;

            if (typeof portSelection === 'object' && portSelection !== null) {
                if (portSelection.splitterId) {
                    sourceId = portSelection.splitterId;
                    sourcePort = portSelection.id;
                } else {
                    sourcePort = portSelection.id ?? 0;
                }
            }

            const newConnection = {
                id: Date.now().toString() + '_conn',
                type: 'DROP',
                fromId: sourceId,
                fromPort: sourcePort,
                fromSide: 'A',
                toId: finalClientId,
                toPort: 0,
                toSide: 'A'
            };

            await saveConnection(newConnection);

            // ... Lógica de Sinal (Mantida igual) ...
            const signalKey = `${sourceId}-${sourcePort}`;
            const currentData = signalNames[signalKey];
            let localSignals = [];
            let currentAllowed = null;
            if (currentData) {
                if (Array.isArray(currentData)) { localSignals = [...currentData]; }
                else if (typeof currentData === 'object') { localSignals = Array.isArray(currentData.local) ? [...currentData.local] : []; currentAllowed = currentData.allowed || null; }
                else if (typeof currentData === 'string') { localSignals = [{ id: 'legacy', name: currentData }]; }
            }
            const alreadyExists = localSignals.some(s => s.name && s.name.includes(finalClientName));
            if (!alreadyExists) {
                const newSignal = { id: `client-${finalClientId}`, name: `${finalClientName}`, type: 'GPON' };
                const newConfig = { local: [...localSignals, newSignal], allowed: currentAllowed };
                await updateSignalDB({ ...signalNames, [signalKey]: newConfig });
            }

            openAlert("Sucesso", existingClientId ? "Cliente reconectado!" : "Cliente criado com sucesso!");

        } catch (error) {
            console.error("Erro ao finalizar cliente:", error);
            openAlert("Erro", "Falha ao salvar conexão.");
        } finally {
            setClientWizard({ step: null, data: {} });
        }
    };

    const handlePhotoUpload = async (item, filesInput) => {
        if (!user || !filesInput) return;
        setUploadingPhoto(true);
        try {
            // --- CORREÇÃO: Descobrir o Dono Real do Item ---
            // 1. Identifica o projeto do item (ou usa o ativo como fallback)
            const targetProjectId = item._projectId || activeProjectId;

            // 2. Busca os dados desse projeto na lista unificada
            const allProjects = [...myProjects, ...sharedProjects];
            const targetProjectData = allProjects.find(p => p.id === targetProjectId);

            // 3. Define o ID do Dono para salvar na pasta correta no Storage
            const targetOwnerId = targetProjectData ? targetProjectData.ownerId : projectOwnerId;
            // -----------------------------------------------

            // Prepara a lista de arquivos
            const files = filesInput.length !== undefined && typeof filesInput !== 'string'
                ? Array.from(filesInput)
                : [filesInput];

            const newPhotos = [];

            // 2. Faz o upload usando o targetOwnerId no caminho
            await Promise.all(files.map(async (file) => {
                // CAMINHO CORRIGIDO: Usa targetOwnerId em vez de projectOwnerId
                const path = `users/${targetOwnerId}/images/${item.id}/${Date.now()}_${file.name}`;

                const storageRef = ref(storage, path);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);

                newPhotos.push({
                    url,
                    path, // Guardamos o caminho completo para poder deletar depois
                    date: new Date().toISOString(),
                    id: Date.now().toString() + Math.random().toString().slice(2, 5)
                });
            }));

            // 3. Atualiza o banco DEPOIS que todas subirem
            const currentPhotos = item.photos || [];
            const updatedItem = { ...item, photos: [...currentPhotos, ...newPhotos] };

            // O saveItem já foi corrigido anteriormente, então ele vai salvar
            // os metadados (links das fotos) no projeto correto automaticamente.
            await saveItem(updatedItem);

            // Atualiza o modal localmente
            setPhotoModalData(updatedItem);

        } catch (error) {
            console.error("Erro no upload:", error);
            openAlert("Erro", "Falha ao enviar algumas imagens.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handlePhotoDelete = async (item, photoToDelete) => {
        if (!user) return;
        openConfirm("Excluir Foto", "Tem certeza que deseja apagar esta foto permanentemente?", async () => {
            try {
                // 1. Tenta apagar do Storage (bucket)
                try {
                    const imageRef = ref(storage, photoToDelete.path);
                    await deleteObject(imageRef);
                } catch (storageError) {
                    // --- AQUI ESTÁ A CORREÇÃO DO BACKUP ---
                    // Se o erro for 'object-not-found', significa que a imagem não existe mais fisicamente.
                    // Nós ignoramos esse erro e deixamos o código continuar para apagar o link do banco.
                    if (storageError.code === 'storage/object-not-found') {
                        console.warn("Imagem fantasma: não encontrada no storage, removendo apenas referência.");
                    } else {
                        // Se for outro erro (ex: sem permissão), paramos tudo
                        throw storageError;
                    }
                }

                // 2. Apagar referência do Firestore (Banco de Dados)
                const currentPhotos = item.photos || [];
                const updatedPhotos = currentPhotos.filter(p => p.id !== photoToDelete.id);
                const updatedItem = { ...item, photos: updatedPhotos };

                await saveItem(updatedItem);
                setPhotoModalData(updatedItem);

            } catch (error) {
                console.error("Erro ao excluir:", error);
                openAlert("Erro", "Falha ao excluir imagem.");
            }
        });
    };

    // --- NOVO: Função para apagar várias fotos ---
    const handleBatchPhotoDelete = async (item, photosToDelete) => {
        if (!user || !photosToDelete || photosToDelete.length === 0) return;

        openConfirm("Excluir Fotos", `Tem a certeza que deseja apagar ${photosToDelete.length} fotos?`, async () => {
            try {
                // 1. Apagar do Storage (Loop)
                // Usamos map para criar um array de promessas e esperar todas terminarem
                await Promise.all(photosToDelete.map(async (photo) => {
                    try {
                        const imageRef = ref(storage, photo.path);
                        await deleteObject(imageRef);
                    } catch (storageError) {
                        // Ignora erro se a imagem já não existir (Fantasma)
                        if (storageError.code !== 'storage/object-not-found') {
                            console.error(`Erro ao apagar ${photo.path}:`, storageError);
                        }
                    }
                }));

                // 2. Apagar referências do Banco de Dados
                // Criamos um Set com os IDs que vamos apagar para facilitar a filtragem
                const idsToDelete = new Set(photosToDelete.map(p => p.id));

                const currentPhotos = item.photos || [];
                // Mantém apenas as fotos que NÃO estão na lista de exclusão
                const updatedPhotos = currentPhotos.filter(p => !idsToDelete.has(p.id));

                const updatedItem = { ...item, photos: updatedPhotos };

                await saveItem(updatedItem);
                setPhotoModalData(updatedItem); // Atualiza o modal aberto

                openAlert("Sucesso", "Fotos excluídas com sucesso.");

            } catch (error) {
                console.error("Erro na exclusão em massa:", error);
                openAlert("Erro", "Falha ao excluir algumas imagens.");
            }
        });
    };

    const splitCable = (cableId) => {
        const cable = items.find(i => i.id === cableId);
        if (!cable) return;
        setSplitModalData({ cableId, cableName: cable.name });
    };

    const executeSplitCable = async (isCaraACara) => {
        if (!splitModalData) return;
        const { cableId } = splitModalData;
        setSplitModalData(null);

        const cable = items.find(i => i.id === cableId);
        if (!cable) return;

        try {
            // 1. Identificar pontas
            const nodeA = items.find(i => i.id === cable.fromNode);
            const nodeB = items.find(i => i.id === cable.toNode);
            if (!nodeA || !nodeB) return;

            const existingConnections = connections.filter(c => c.fromId === cableId || c.toId === cableId);

            // 2. Calcular ponto médio
            const midX = (nodeA.x + nodeB.x) / 2;
            const midY = (nodeA.y + nodeB.y) / 2;

            // 3. Criar a Nova Caixa
            const newBoxId = `node_${Date.now()}`;
            const newBox = {
                id: newBoxId,
                type: 'CEO',
                name: 'CX Emenda (Reparo)',
                x: midX,
                y: midY,
                ports: 0,
                cards: [{ id: Date.now(), name: 'Bandeja Principal', portCount: Math.max(12, cable.ports) }]
            };

            // 4. Criar os dois novos cabos
            // Trecho 1: Liga NodeA -> Nova Caixa
            const cable1 = { ...cable, id: `cable_${Date.now()}_1`, fromNode: cable.fromNode, toNode: newBoxId, name: `${cable.name} (Trecho 1)` };

            // Trecho 2: Liga Nova Caixa -> NodeB
            const cable2 = { ...cable, id: `cable_${Date.now()}_2`, fromNode: newBoxId, toNode: cable.toNode, name: `${cable.name} (Trecho 2)` };

            // 5. Preparar conexões RECUPERADAS (A CORREÇÃO ESTÁ AQUI)
            const restoredConnections = existingConnections.map(conn => {
                let newConn = { ...conn, id: `restored_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };

                // Função auxiliar para descobrir se o "vizinho" está na ponta A
                const isItemAtNodeA = (targetId) => {
                    if (targetId === nodeA.id) return true; // Conexão na própria caixa

                    const item = items.find(i => i.id === targetId);
                    if (!item) return false;

                    // Caso 1: Item interno (Splitter, DIO, OLT) - Tem parentId
                    if (item.parentId === nodeA.id) return true;

                    // Caso 2: Outro Cabo (Fusão de cabo com cabo)
                    // Verifica se o OUTRO cabo toca na caixa A
                    if (item.type === 'CABLE') {
                        return item.fromNode === nodeA.id || item.toNode === nodeA.id;
                    }

                    return false;
                };

                // Lógica de Direcionamento
                if (conn.fromId === cableId) {
                    // O cabo antigo era a origem. Verificamos o destino.
                    if (isItemAtNodeA(conn.toId)) newConn.fromId = cable1.id;
                    else newConn.fromId = cable2.id;
                }
                else if (conn.toId === cableId) {
                    // O cabo antigo era o destino. Verificamos a origem.
                    if (isItemAtNodeA(conn.fromId)) newConn.toId = cable1.id;
                    else newConn.toId = cable2.id;
                }

                return newConn;
            });

            // 6. Preparar conexões CARA-A-CARA (Internas)
            let internalFusions = [];
            if (isCaraACara) {
                for (let i = 0; i < cable.ports; i++) {
                    internalFusions.push({
                        id: `fusion_auto_${Date.now()}_${i}`,
                        type: 'FUSION',
                        fromId: cable1.id, fromPort: i, fromSide: 'B',
                        toId: cable2.id, toPort: i, toSide: 'A'
                    });
                }
            }

            // 7. Salvar tudo
            await saveItem(newBox);
            await saveItem(cable1);
            await saveItem(cable2);

            const allNewConnections = [...restoredConnections, ...internalFusions];
            for (const conn of allNewConnections) await saveConnection(conn);

            await deleteItemDB(cableId);

            // 8. Atualizar Estado Local
            setItems(prev => {
                const listWithoutOld = prev.filter(i => i.id !== cableId);
                return [...listWithoutOld, newBox, cable1, cable2];
            });
            setConnections(prev => {
                const cleanList = prev.filter(c => c.fromId !== cableId && c.toId !== cableId);
                return [...cleanList, ...allNewConnections];
            });

            setSelectedIds(new Set([newBoxId]));
            setDetailId(newBoxId);

            openAlert("Sucesso", isCaraACara ? "Cabo seccionado com fusões cara-a-cara!" : "Cabo seccionado.");

        } catch (error) {
            console.error(error);
            openAlert("Erro", "Falha ao seccionar cabo.");
        }
    };

    const SplitModal = ({ data, onConfirm, onCancel }) => {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border dark:border-gray-700 animate-in zoom-in-95">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                            <Scissors size={24} className="rotate-90" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Seccionar Cabo</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Criação de caixa de emenda/reparo</p>
                        </div>
                    </div>

                    <div className="mb-6 space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Você está prestes a cortar o cabo <strong>{data.cableName}</strong>.
                            Uma nova CEO será criada no meio do trajeto e as fusões das pontas externas serão preservadas.
                        </p>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Deseja realizar fusão automática?</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                O modo "Cara-a-cara" reconecta todas as fibras automaticamente dentro da nova caixa (1-com-1, 2-com-2, etc).
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onConfirm(false)}
                            className="py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Apenas Cortar
                        </button>
                        <button
                            onClick={() => onConfirm(true)}
                            className="py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowRightLeft size={16} />
                            Sim, Cara-a-cara
                        </button>
                    </div>
                    <button onClick={onCancel} className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                        Cancelar operação
                    </button>
                </div>
            </div>
        );
    };

    const handleTraceSignal = (startItemId, startPort, startSide) => {

        // 1. Função Auxiliar: Cria o "Passo" visual para o relatório
        const createStep = (item, port, side, isClicked = false) => {
            let detail = "";

            // --- PRIORIDADE 1: NOME DEFINIDO PELO USUÁRIO ---
            // Se o usuário editou o nome desta porta/fibra, mostramos exatamente o que ele escreveu.
            if (item.portLabels && item.portLabels[port] && item.portLabels[port].trim() !== "") {
                detail = item.portLabels[port];

                // Opcional: Se for DIO e tiver label, talvez queira manter o nome do Card antes?
                // Se quiser APENAS o label do usuário, mantenha como está acima.
                // Se quiser algo como "Card 1 : NomeUsuario", me avise. Por enquanto vou deixar só o label (mais limpo).
            }
            else {
                // --- PRIORIDADE 2: NOMENCLATURA PADRÃO AUTOMÁTICA ---

                // Padrão Genérico
                detail = `Porta: ${port} (${side})`;

                if (item.type === 'CABLE') {
                    detail = `Fibra ${parseInt(port) + 1}`;
                }
                else if (item.type === 'SPLITTER') {
                    detail = (port === 0 || port === '0') ? 'Entrada (IN)' : `Saída ${port}`;
                }
                else if (item.type === 'DIO') {
                    const portStr = String(port);
                    if (portStr.startsWith('c-')) {
                        const match = portStr.match(/c-(\d+)-p-(\d+)/);
                        if (match) {
                            const cardIdx = parseInt(match[1]);
                            const portIdx = parseInt(match[2]);
                            const cardName = item.cards && item.cards[cardIdx] ? item.cards[cardIdx].name : `Card ${cardIdx + 1}`;
                            detail = `${cardName} : Porta ${portIdx + 1}`;
                        }
                    } else {
                        detail = `Porta DIO: ${parseInt(port) + 1}`;
                    }
                }
                else if (item.type === 'OLT') {
                    const portStr = String(port);

                    // Regex para Uplink (u-0, u-1, etc)
                    const matchUplink = portStr.match(/u-(\d+)/);

                    // Regex para PON (i-0-p-0)
                    const matchPon = portStr.match(/i-(\d+)-p-(\d+)/);

                    if (matchUplink) {
                        // Correção: Soma +1 para u-0 virar Uplink 1
                        const uplinkNum = parseInt(matchUplink[1]) + 1;
                        detail = `Uplink ${uplinkNum}`;
                    }
                    else if (matchPon) {
                        detail = `Interface ${matchPon[1]} : Pon ${matchPon[2]}`;
                    }
                    else {
                        detail = `Porta OLT: ${portStr}`;
                    }
                }
                else if (item.type === 'CLIENT' || item.type === 'CAMERA' || item.type === 'ROUTER') {
                    // Para clientes, não mostramos detalhe técnico se não tiver label
                    detail = null;
                }
            }

            return {
                id: item.id,
                deviceName: item.name,
                type: item.type,
                icon: ITEM_TYPES[item.type]?.icon || Circle,
                detail: detail,
                isClicked: isClicked
            };
        };

        // 2. Função Auxiliar: Encontra conexão
        const findConn = (itemId, port, side) => {
            return connections.find(c =>
                (c.fromId === itemId && c.fromPort === port && c.fromSide === side) ||
                (c.toId === itemId && c.toPort === port && c.toSide === side)
            );
        };

        // 3. O CÉREBRO: Segue um caminho
        const followPath = (startConn, originItemId) => {
            let path = [];
            let hasSource = false;

            let nextId = startConn.fromId === originItemId ? startConn.toId : startConn.fromId;
            let nextPort = startConn.fromId === originItemId ? startConn.toPort : startConn.fromPort;
            let nextSide = startConn.fromId === originItemId ? startConn.toSide : startConn.fromSide;

            for (let i = 0; i < 50; i++) {
                const item = items.find(x => x.id === nextId);
                if (!item) break;

                path.push(createStep(item, nextPort, nextSide));

                if (item.type === 'OLT') {
                    hasSource = true;
                    break;
                }
                if (item.type === 'CLIENT' || item.type === 'CAMERA' || item.type === 'ROUTER') {
                    break;
                }

                // Lógica de trânsito (Entrada -> Saída)
                let exitPort = null;
                let exitSide = null;

                if (item.type === 'CABLE') {
                    exitSide = nextSide === 'A' ? 'B' : 'A';
                    exitPort = nextPort;
                }
                else if (item.type === 'DIO' || item.type === 'PATCH_PANEL') {
                    exitSide = nextSide === 'FRONT' ? 'BACK' : 'FRONT';
                    exitPort = nextPort;
                }
                else if (item.type === 'SPLITTER') {
                    if (nextPort !== 0 && nextPort !== '0') {
                        exitPort = 0;
                        exitSide = 'A';
                    } else {
                        break;
                    }
                }
                else {
                    break;
                }

                const nextConn = findConn(item.id, exitPort, exitSide);
                if (nextConn) {
                    nextId = nextConn.fromId === item.id ? nextConn.toId : nextConn.fromId;
                    nextPort = nextConn.fromId === item.id ? nextConn.toPort : nextConn.fromPort;
                    nextSide = nextConn.fromId === item.id ? nextConn.toSide : nextConn.fromSide;
                } else {
                    break;
                }
            }
            return { path, hasSource };
        };

        // --- EXECUÇÃO ---
        const centerItem = items.find(i => i.id === startItemId);
        if (!centerItem) return;

        const centerStep = createStep(centerItem, startPort, startSide, true);

        let pathA = { path: [], hasSource: false };
        let pathB = { path: [], hasSource: false };

        if (centerItem.type === 'DIO' || centerItem.type === 'PATCH_PANEL') {
            const connFront = findConn(centerItem.id, startPort, 'FRONT');
            const connBack = findConn(centerItem.id, startPort, 'BACK');
            if (connFront) pathA = followPath(connFront, centerItem.id);
            if (connBack) pathB = followPath(connBack, centerItem.id);
        }
        else if (centerItem.type === 'CABLE') {
            const connA = findConn(centerItem.id, startPort, 'A');
            const connB = findConn(centerItem.id, startPort, 'B');
            if (connA) pathA = followPath(connA, centerItem.id);
            if (connB) pathB = followPath(connB, centerItem.id);
        }
        else if (centerItem.type === 'SPLITTER') {
            if (startPort !== 0 && startPort !== '0') {
                const connOut = findConn(centerItem.id, startPort, startSide);
                if (connOut) pathA = followPath(connOut, centerItem.id);
                const connIn = findConn(centerItem.id, 0, 'A');
                if (connIn) pathB = followPath(connIn, centerItem.id);
            } else {
                const connIn = findConn(centerItem.id, 0, 'A');
                if (connIn) pathA = followPath(connIn, centerItem.id);
            }
        }
        else if (centerItem.type === 'CLIENT' || centerItem.type === 'OLT') {
            const conn = findConn(centerItem.id, startPort, startSide);
            if (conn) pathA = followPath(conn, centerItem.id);
        }

        let fullPath = [];
        if (pathA.hasSource) {
            fullPath = [...pathA.path.reverse(), centerStep, ...pathB.path];
        } else if (pathB.hasSource) {
            fullPath = [...pathB.path.reverse(), centerStep, ...pathA.path];
        } else {
            fullPath = [...pathB.path.reverse(), centerStep, ...pathA.path];
        }

        setTraceModalData(fullPath);
    };

    // --- FUNÇÃO OTDR (CÁLCULO DE DISTÂNCIA FÍSICA) ---
    const handleOTDR = (startItemId, startPort) => {
        const inputDist = window.prompt("Distância medida pelo OTDR (em metros):");
        if (!inputDist) return;

        let remainingDist = parseFloat(inputDist);
        if (isNaN(remainingDist) || remainingDist <= 0) {
            openAlert("Erro", "Distância inválida.");
            return;
        }

        // --- CORREÇÃO: Busca robusta (aceita texto ou número na porta) ---
        const findConn = (itemId, port, side) => {
            return connections.find(c =>
                (c.fromId === itemId && c.fromPort == port && c.fromSide === side) || // Usa == em vez de ===
                (c.toId === itemId && c.toPort == port && c.toSide === side)
            );
        };

        let currentId = startItemId;
        let currentPort = startPort;
        let currentSide = 'A';

        // Tenta achar a conexão de saída
        // 1. Tenta Lado A (Padrão para OLT/Splitter)
        let startConn = findConn(currentId, currentPort, 'A');

        // 2. Se não achou, tenta Frente (DIO)
        if (!startConn) startConn = findConn(currentId, currentPort, 'FRONT');

        // 3. Se não achou, tenta Trás (DIO)
        if (!startConn) startConn = findConn(currentId, currentPort, 'BACK');

        // 4. Se não achou, tenta Lado B (Raro, mas possível em cabos)
        if (!startConn) startConn = findConn(currentId, currentPort, 'B');

        if (!startConn) {
            openAlert("Sem Link", "Não foi encontrado cabo conectado nesta porta/fibra.");
            return;
        }

        // Define o primeiro "Pulo"
        let nextId = startConn.fromId === currentId ? startConn.toId : startConn.fromId;
        let nextPort = startConn.fromId === currentId ? startConn.toPort : startConn.fromPort;
        let nextSide = startConn.fromId === currentId ? startConn.toSide : startConn.fromSide;

        // LOOP DE NAVEGAÇÃO
        for (let i = 0; i < 100; i++) {
            const item = items.find(x => x.id === nextId);
            if (!item) break;

            // --- CASO 1: É UM CABO (CALCULAR METRAGEM) ---
            if (item.type === 'CABLE') {
                const nodeA = items.find(n => n.id === item.fromNode);
                const nodeB = items.find(n => n.id === item.toNode);

                if (nodeA && nodeB) {
                    // Monta geometria: [Inicio, ...waypoints, Fim]
                    let points = [{ lat: nodeA.lat, lng: nodeA.lng }, ...(item.waypoints || []), { lat: nodeB.lat, lng: nodeB.lng }];

                    // Se entramos pelo lado B, invertemos para andar na direção certa
                    if (nextSide === 'B') {
                        points = points.reverse();
                    }

                    // Percorre cada segmento do cabo
                    for (let j = 0; j < points.length - 1; j++) {
                        const p1 = points[j];
                        const p2 = points[j + 1];

                        // Haversine simplificado
                        const R = 6371e3;
                        const rad = Math.PI / 180;
                        const φ1 = p1.lat * rad, φ2 = p2.lat * rad;
                        const Δφ = (p2.lat - p1.lat) * rad, Δλ = (p2.lng - p1.lng) * rad;
                        const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        const segmentDist = R * c;

                        // ACHAMOS O PONTO?
                        if (remainingDist <= segmentDist) {
                            const ratio = remainingDist / segmentDist;
                            const finalLat = p1.lat + (p2.lat - p1.lat) * ratio;
                            const finalLng = p1.lng + (p2.lng - p1.lng) * ratio;

                            // CENTRALIZA E MARCA
                            setViewMode('MAP');
                            setFlyToCoords([finalLat, finalLng]);
                            setDetailId(null);

                            // (Opcional) Poderíamos criar um marcador temporário aqui
                            openAlert("Localizado", `Ponto encontrado a ${inputDist}m da origem.`);
                            return;
                        }

                        remainingDist -= segmentDist;
                    }
                }

                // Se o cabo acabou e não achou, vai para o próximo item
                const exitSide = nextSide === 'A' ? 'B' : 'A';

                // Pega a conexão na saída do cabo
                const exitConn = findConn(item.id, nextPort, exitSide);
                if (exitConn) {
                    nextId = exitConn.fromId === item.id ? exitConn.toId : exitConn.fromId;
                    nextPort = exitConn.fromId === item.id ? exitConn.toPort : exitConn.fromPort;
                    nextSide = exitConn.fromId === item.id ? exitConn.toSide : exitConn.fromSide;
                } else {
                    openAlert("Fim de Rede", `A fibra termina neste cabo (Sobra de ${remainingDist.toFixed(1)}m).`);
                    return;
                }
            }

            // --- CASO 2: ITEM PASSIVO (FUSÃO/SPLITTER) ---
            else {
                let exitSide = null;
                let exitPort = null;

                if (item.type === 'DIO' || item.type === 'PATCH_PANEL') {
                    exitSide = nextSide === 'FRONT' ? 'BACK' : 'FRONT';
                    exitPort = nextPort;
                } else if (item.type === 'SPLITTER') {
                    if (nextPort != 0) { // Entrou na saída, sai na entrada
                        exitPort = 0;
                        exitSide = 'A';
                    } else {
                        openAlert("Splitter", "O sinal chegou na entrada do Splitter e se dividiu. Selecione a porta de saída manualmente para continuar.");
                        return;
                    }
                } else if (item.type === 'CEO' || item.type === 'CTO' || item.type === 'POP') {
                    // Se for apenas o nó (caixa), assume fusão passante se houver
                    // A lógica aqui depende de como você modelou a fusão interna. 
                    // Se a fusão liga Cabo A direto no Cabo B, o 'nextId' já teria pulado a caixa e ido pro Cabo B.
                    // Se caiu aqui, é porque parou na caixa.
                    openAlert("Caixa", `Chegou em ${item.name}. Verifique as fusões internas.`);
                    setDetailId(item.id); // Abre a caixa para inspeção
                    return;
                }

                if (exitSide) {
                    const conn = findConn(item.id, exitPort, exitSide);
                    if (conn) {
                        nextId = conn.fromId === item.id ? conn.toId : conn.fromId;
                        nextPort = conn.fromId === item.id ? conn.toPort : conn.fromPort;
                        nextSide = conn.fromId === item.id ? conn.toSide : conn.fromSide;
                    } else {
                        openAlert("Fim", "Fim da conexão no " + item.name);
                        return;
                    }
                }
            }
        }
        openAlert("Limite", "Distância maior que a rede desenhada.");
    };

    // Função para buscar endereço na API e mandar pro mapa
    const handleAddressSearch = async () => {
        if (!searchTerm || searchMode !== 'ADDRESS') return;

        setIsSearchingAddr(true);

        // 1. Verifica se é coordenada (lat, lng)
        const coordRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
        const match = searchTerm.match(coordRegex);

        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[3]);
            setFlyToCoords([lat, lng]);
            setIsSearchingAddr(false);
            return;
        }

        // 2. Busca endereço no Nominatim
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                setFlyToCoords([lat, lon]);
            } else {
                openAlert("Não encontrado", "Endereço não localizado.");
            }
        } catch (error) {
            console.error(error);
            openAlert("Erro", "Falha ao buscar endereço.");
        } finally {
            setIsSearchingAddr(false);
        }
    };

    // Importação de KML
    const handleFileImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            try {
                setLoading(true);
                const importedItems = parseKMLImport(text);

                if (importedItems.length === 0) {
                    openAlert("Erro", "Nenhum item válido encontrado no KML.");
                    setLoading(false);
                    return;
                }

                // --- 1. ANALISAR DUPLICATAS ---
                const { cleanItems, conflicts } = analyzeDuplicates(importedItems, items);

                // Se houver conflitos, abre o Modal de Julgamento
                if (conflicts.length > 0) {
                    setTempCleanItems(cleanItems); // Guarda os bons
                    setDuplicatesData(conflicts);  // Mostra os ruins
                    setLoading(false);
                    return; // PAUSA O PROCESSO AQUI
                }

                // Se não houver conflitos, segue direto para o passo de Configuração (Cores)
                proceedToConfiguration(importedItems);

            } catch (error) {
                console.error("Erro na importação:", error);
                openAlert("Erro", "Falha ao ler o arquivo KML.");
                setLoading(false);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    // Função auxiliar para ir ao próximo passo (Configurar Cores)
    const proceedToConfiguration = (finalItemsList) => {
        if (finalItemsList.length === 0) {
            openAlert("Info", "Nenhum item selecionado para importação.");
            setLoading(false);
            return;
        }

        const cables = finalItemsList.filter(i => i.type === 'CABLE');
        const uniqueColors = [...new Set(cables.map(c => c.color))];

        setImportModalData({
            items: finalItemsList,
            colors: uniqueColors
        });
        setLoading(false);
    };

    // Função auxiliar para cor aleatória (caso crie nova tag)
    const getRandomTagColor = () => {
        const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const processImportConfiguration = async ({ colorMap, textRules }) => {
        if (!importModalData) return;
        setLoading(true); // Importante: Ativar loading pois vamos falar com o banco

        const { items } = importModalData;

        // --- 1. LÓGICA DE TAGS (NOVA) ---
        // Coletar todas as pastas únicas encontradas no KML
        const uniqueFolders = new Set();
        items.forEach(i => {
            if (i.kmlFolders && i.kmlFolders.length > 0) {
                i.kmlFolders.forEach(folder => uniqueFolders.add(folder));
            }
        });

        // Mapa para converter "Nome da Pasta" -> "ID da Tag"
        const folderToTagId = {};
        const newTagsToCreate = [];

        // Verifica quais tags já existem e quais precisam ser criadas
        // (Nota: availableTags vem do seu estado do App.jsx)
        uniqueFolders.forEach(folderName => {
            // Ignora pastas com nomes muito genéricos se quiser (ex: "KML")
            //if (folderName.length < 2) return;

            const existingTag = availableTags.find(t => t.name.toLowerCase() === folderName.toLowerCase());

            if (existingTag) {
                folderToTagId[folderName] = existingTag.id;
            } else {
                // Cria nova tag
                const newId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                folderToTagId[folderName] = newId;

                newTagsToCreate.push({
                    id: newId,
                    name: folderName,
                    color: getRandomTagColor()
                });
            }
        });

        // Salvar as NOVAS tags no Firebase antes de prosseguir
        if (newTagsToCreate.length > 0) {
            try {
                // Grava no espaço do DONO DO PROJETO (igual aos demais dados do projeto)
                // Fallback para user.uid se nenhum projeto estiver ativo
                const targetOwner = projectOwnerId || user.uid;
                const settingsRef = doc(db, `artifacts/ftth-production/users/${targetOwner}/settings`, 'tags');

                const tagsUpdate = {};
                newTagsToCreate.forEach(tag => {
                    tagsUpdate[tag.id] = tag;
                });

                await setDoc(settingsRef, tagsUpdate, { merge: true });

            } catch (err) {
                console.error("Erro ao criar tags automáticas:", err);
                openAlert("Aviso", "Algumas tags de pasta não puderam ser criadas.");
            }
        }
        // --------------------------------


        // --- 2. LÓGICA DE ITENS (EXISTENTE + ATRIBUIÇÃO DE TAGS) ---
        const updatedItems = items.map(item => {
            // A. Resolve IDs das Tags
            let finalTagIds = item.tagIds || []; // Mantém tags que já existam

            if (item.kmlFolders) {
                const folderTags = item.kmlFolders
                    .map(fName => folderToTagId[fName]) // Converte nome -> ID
                    .filter(id => id !== undefined);    // Remove undefined

                // Junta e remove duplicados
                finalTagIds = [...new Set([...finalTagIds, ...folderTags])];
            }

            // B. Resolve Fibras e Cores (Seu código original)
            if (item.type === 'CABLE') {
                let assignedFibers = 12;
                let ruleApplied = false;

                // Lógica de Regras de Texto
                if (textRules && textRules.length > 0) {
                    const itemNameUpper = (item.name || '').toUpperCase();
                    for (const rule of textRules) {
                        const keyword = rule.keyword.toUpperCase();
                        if (keyword && itemNameUpper.includes(keyword)) {
                            assignedFibers = rule.fibers;
                            ruleApplied = true;
                            break;
                        }
                    }
                }

                // Lógica de Cores
                if (!ruleApplied && colorMap) {
                    const colorKey = item.color || '#000000';
                    if (colorMap[colorKey] !== undefined) {
                        assignedFibers = colorMap[colorKey];
                    }
                }

                // Retorna item com portas atualizadas e TAGS
                return { ...item, ports: parseInt(assignedFibers), tagIds: finalTagIds };
            }

            // Retorna item (Nó) com TAGS
            return { ...item, tagIds: finalTagIds };
        });

        setLoading(false);
        setImportModalData(null);
        setFixConnectionsData(updatedItems);
    };

    const handleDuplicatesResolved = (selectedDuplicates) => {
        // Junta os itens que eram limpos + os duplicados que o usuário escolheu forçar
        const finalBatch = [...tempCleanItems, ...selectedDuplicates];

        setDuplicatesData(null); // Fecha modal
        setTempCleanItems([]);   // Limpa temp

        proceedToConfiguration(finalBatch); // Segue o fluxo
    };

    // Passo 3: Salva tudo no banco após correções
    const saveImportedData = async (fixes) => {
        if (!fixConnectionsData) return;
        setLoading(true);

        // Identifica quais cabos o usuário marcou para excluir
        // Se alguma ponta (A ou B) estiver marcada como DELETE, deletamos o cabo inteiro
        const cablesToDelete = fixes
            .filter(f => f.nodeId === '__DELETE__')
            .map(f => f.cableId);

        // Filtra a lista, removendo os excluídos
        const itemsToSave = fixConnectionsData.filter(item => !cablesToDelete.includes(item.id));

        // Aplica as correções nos restantes
        fixes.forEach(fix => {
            // Se for para deletar ou manter vazio, ignoramos aqui (já filtramos ou não tem ação)
            if (fix.nodeId === '__DELETE__' || fix.nodeId === '') return;

            const cable = itemsToSave.find(i => i.id === fix.cableId);
            if (cable) {
                if (fix.side === 'A') cable.fromNode = fix.nodeId;
                if (fix.side === 'B') cable.toNode = fix.nodeId;
            }
        });

        try {
            let count = 0;
            for (const item of itemsToSave) {
                // Remove propriedades temporárias antes de salvar no Firebase
                delete item._startCoords;
                delete item._endCoords;

                await saveItem(item);
                count++;
            }

            const deletedCount = cablesToDelete.length > 0 ? [...new Set(cablesToDelete)].length : 0;

            let msg = `Sucesso! ${count} itens importados.`;
            if (deletedCount > 0) msg += ` (${deletedCount} cabos ignorados)`;

            openAlert("Importação Concluída", msg);
        } catch (error) {
            console.error(error);
            openAlert("Erro", "Falha ao salvar itens.");
        } finally {
            setFixConnectionsData(null);
            setLoading(false);
        }
    };


    // EFEITO: Monitora se existe um foco pendente E se os itens chegaram (TRABALHA EM CONJUNTO COM handleFocusProject)
    useEffect(() => {
        // Se não tem nada pendente, não faz nada
        if (!pendingFocusProjectId) return;

        // Filtra os itens do projeto que estamos esperando
        const projectItems = items.filter(i => i._projectId === pendingFocusProjectId);

        // Se ainda não tem itens, SAI e espera a próxima atualização do 'items'
        // (O useEffect rodará de novo automaticamente quando o Firebase entregar os dados)
        if (projectItems.length === 0) {
            // Pequena segurança: Se o projeto estiver visível há muito tempo e não tiver itens, 
            // pode ser que ele esteja realmente vazio. 
            // Mas para simplificar, vamos assumir que estamos esperando o load.
            return;
        }

        // --- SE CHEGAMOS AQUI, OS ITENS EXISTEM! VAMOS FOCAR. ---

        // (Opcional) Desliga loading se tiver ligado
        // setIsProcessing(false);

        if (viewMode === 'CANVAS') {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let hasValidCoords = false;

            projectItems.forEach(node => {
                if (node.x !== undefined && node.y !== undefined && ITEM_TYPES[node.type]?.category === 'NODE') {
                    const width = ITEM_TYPES[node.type]?.width || 100;
                    const height = 100;
                    if (node.x < minX) minX = node.x;
                    if (node.y < minY) minY = node.y;
                    if (node.x + width > maxX) maxX = node.x + width;
                    if (node.y + height > maxY) maxY = node.y + height;
                    hasValidCoords = true;
                }
            });

            if (hasValidCoords && minX !== Infinity) {
                const contentW = maxX - minX;
                const contentH = maxY - minY;
                const screenW = window.innerWidth;
                const screenH = window.innerHeight;
                const padding = 150;

                const scaleX = (screenW - padding * 2) / contentW;
                const scaleY = (screenH - padding * 2) / contentH;
                const newScale = Math.min(scaleX, scaleY, 1.2);

                const contentCenterX = minX + (contentW / 2);
                const contentCenterY = minY + (contentH / 2);

                setPan({
                    x: (screenW / 2) - (contentCenterX * newScale),
                    y: (screenH / 2) - (contentCenterY * newScale)
                });
                setScale(newScale);
            } else {
                openAlert("Projeto Vazio", "Este projeto não possui itens desenhados no Canvas.");
            }
        }
        else if (viewMode === 'MAP') {
            let totalLat = 0, totalLng = 0, count = 0;
            projectItems.forEach(i => {
                // 1. Verifica se tem coordenadas básicas
                if (!i.lat || !i.lng) return;

                // 2. FILTRO NOVO: Considera APENAS itens da categoria 'NODE'
                // (Ignora Cabos, Splitters, DIOs, Clientes ou qualquer coisa que não seja estrutural)
                if (ITEM_TYPES[i.type]?.category !== 'NODE') return;

                const lat = parseFloat(i.lat);
                const lng = parseFloat(i.lng);

                // 3. Filtro extra de segurança para "Null Island" (0,0)
                if (Math.abs(lat) < 0.1 && Math.abs(lng) < 0.1) return;

                totalLat += lat;
                totalLng += lng;
                count++;
            });

            if (count > 0) {
                setFlyToCoords([totalLat / count, totalLng / count]);
            } else {
                openAlert("Sem GPS", "Itens deste projeto não possuem coordenadas.");
            }
        }

        // IMPORTANTE: Limpa a pendência para não ficar focando toda vez que você criar um item novo
        setPendingFocusProjectId(null);

    }, [items, pendingFocusProjectId, viewMode]); // Roda sempre que 'items' atualiza ou mudamos o foco
    // Função para focar em um projeto específico
    const handleFocusProject = (projectId) => {
        // 1. Fecha o gerenciador
        setIsProjectManagerOpen(false);

        // 2. Garante que o projeto esteja visível
        if (!visibleProjectIds.includes(projectId)) {
            setVisibleProjectIds(prev => [...prev, projectId]);
        }

        // 3. Define como projeto Ativo (Caneta)
        // const project = [...myProjects, ...sharedProjects].find(p => p.id === projectId);
        // if (project) setActiveProjectId(projectId);

        // 4. Define este projeto como "Pendente de Foco"
        // Isso vai ativar o useEffect abaixo
        setPendingFocusProjectId(projectId);

        // Se já tivermos itens carregados, mostramos um loading spinner global opcional
        // ou apenas deixamos o usuário ver a tela atualizar.
        if (!items.some(i => i._projectId === projectId)) {
            // Opcional: Feedback visual rápido
            // setProcessingMessage("Carregando itens do projeto...");
            // setIsProcessing(true);
        }
    };

    // --- LÓGICA DE FILTRAGEM (Visualização de ITENS: Nós e Cabos de Backbone) ---
    const visibleItems = React.useMemo(() => {
        // Se não tiver tags selecionadas, mostra TUDO
        if (filterTags.length === 0) return items;

        return items.filter(item => {
            const itemTags = item.tagIds || [];

            // LÓGICA DE FILTRO PADRÃO
            if (filterMode === 'OR') {
                return filterTags.some(tagId => itemTags.includes(tagId));
            }

            if (filterMode === 'AND') {
                return filterTags.every(tagId => itemTags.includes(tagId));
            }

            if (filterMode === 'EXACT') {
                return itemTags.length === filterTags.length &&
                    itemTags.every(tagId => filterTags.includes(tagId));
            }

            return true;
        });
    }, [items, filterTags, filterMode]);

    // --- FILTRO DE CONEXÕES (Drops e Patch Cords) ---
    const visibleConnections = React.useMemo(() => {
        // Se não houver filtro, mostra todas as conexões existentes
        if (filterTags.length === 0) return connections;

        return connections.filter(conn => {
            // Busca os itens nas pontas (usando a lista completa 'items' para garantir que achamos)
            const nodeA = items.find(i => i.id === conn.fromId);
            const nodeB = items.find(i => i.id === conn.toId);

            if (!nodeA || !nodeB) return false; // Se algum nó não existe, não desenha

            // Verifica se é um Drop (Conectado a Cliente)
            const isClientA = nodeA.type === 'CLIENT';
            const isClientB = nodeB.type === 'CLIENT';

            if (isClientA || isClientB) {
                // REGRA DO DROP:
                // Só aparece se o Cliente estiver na lista de itens visíveis (visibleItems)
                // O visibleItems já foi filtrado pelas tags anteriormente
                const clientNode = isClientA ? nodeA : nodeB;
                const isClientVisible = visibleItems.some(v => v.id === clientNode.id);

                return isClientVisible;
            }

            // OUTRAS CONEXÕES (Ex: Patch cords internos ou fusões, se desenhados no canvas)
            // Só aparecem se AMBOS os lados estiverem visíveis
            const isAVisible = visibleItems.some(v => v.id === nodeA.id);
            const isBVisible = visibleItems.some(v => v.id === nodeB.id);

            return isAVisible && isBVisible;
        });
    }, [connections, items, visibleItems, filterTags]);

    // Verifica login salvo ao iniciar
    useEffect(() => {
        const savedUser = localStorage.getItem('ftth_user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }

        // Pequeno timeout artificial (opcional) para evitar piscada muito rápida
        // ou apenas setIsLoading(false) direto se preferir velocidade máxima
        setTimeout(() => {
            setIsLoading(false);
        }, 1000); // 1 segundo de tela de load para dar uma sensação suave
    }, []);

    // --- 1. TELA DE CARREGAMENTO (SPLASH SCREEN) ---
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                <div className="flex flex-col items-center animate-pulse">
                    {/* Logo ou Ícone do App */}
                    <div className="p-4 mb-6">
                        <img
                            src="https://cdn-icons-png.flaticon.com/512/2463/2463046.png"
                            alt="Ícone Network"
                            className="w-16 h-16"
                        />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        FTTH Manager
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                        Carregando Sistema...
                    </p>

                    {/* Spinner Girando */}
                    <Loader2 size={32} className="text-blue-600 animate-spin" />
                </div>
            </div>
        );
    }
    // Se não tiver usuário, mostra Login
    if (!user) {
        return <AuthScreen onLogin={() => { }} />; // Ajuste para o seu componente de Login
    }

    // --- LÓGICA DE TRADUÇÃO DO DOCK PARA O APP ---
    const handleDockChange = (toolId) => {
        // 1. Ferramentas de Seleção
        if (toolId === 'SELECT') {
            setInteractionMode('SELECT');
        }
        else if (toolId === 'RULER') {
            // Assumindo que RULER ativa o Box Select ou régua se tiver
            setInteractionMode('BOX_SELECT');
        }
        else if (toolId === 'MEASURE') {
            setInteractionMode('MEASURE');
        }
        // 2. Ferramentas de Desenho
        else if (toolId === 'ADD_POP') {
            setInteractionMode('ADD_NODE');
            setNodeTypeToAdd('POP');
        }
        else if (toolId === 'ADD_CEO') {
            setInteractionMode('ADD_NODE');
            setNodeTypeToAdd('CEO');
        }
        else if (toolId === 'ADD_CTO') {
            setInteractionMode('ADD_NODE');
            setNodeTypeToAdd('CTO');
        }
        else if (toolId === 'ADD_CABLE') {
            setInteractionMode('DRAW_CABLE');
        }
        else if (toolId === 'ADD_TOWER') {
            setInteractionMode('ADD_NODE');
            setNodeTypeToAdd('TOWER');
        }
        else if (toolId === 'ADD_POST') {
            setInteractionMode('ADD_NODE');
            setNodeTypeToAdd('POST');
        }
        else if (toolId === 'ADD_OBJECT') {
            setInteractionMode('ADD_NODE');
            setNodeTypeToAdd('OBJECT');
        }
        // 3. Clientes
        else if (toolId === 'ADD_CLIENT') {
            setInteractionMode('ADD_CLIENT');
        }
    };

    // Helper para saber qual botão deixar ativo visualmente no Dock
    const getActiveDockTool = () => {
        if (interactionMode === 'SELECT') return 'SELECT';
        if (interactionMode === 'BOX_SELECT') return 'RULER';
        if (interactionMode === 'MEASURE') return 'MEASURE';
        if (interactionMode === 'DRAW_CABLE') return 'ADD_CABLE';
        if (interactionMode === 'ADD_CLIENT') return 'ADD_CLIENT';
        if (interactionMode === 'ADD_NODE') {
            if (nodeTypeToAdd === 'POP') return 'ADD_POP';
            if (nodeTypeToAdd === 'CEO') return 'ADD_CEO';
            if (nodeTypeToAdd === 'CTO') return 'ADD_CTO';
            if (nodeTypeToAdd === 'TOWER') return 'ADD_TOWER';
            if (nodeTypeToAdd === 'POST') return 'ADD_POST';
            if (nodeTypeToAdd === 'OBJECT') return 'ADD_OBJECT';
        }
        return null;
    };

    // const App return
    return (
        <div className={`h-screen w-screen relative overflow-hidden flex flex-col font-sans select-none ${isDarkMode ? 'dark' : ''} bg-white dark:bg-black`}>

            {/* 1. ÁREA PRINCIPAL (MAPA OU CANVAS) - Ocupa toda a tela (z-0) */}
            <div className="flex-1 relative z-0 overflow-hidden">
                {viewMode === 'CANVAS' ? (
                    /* --- MODO CANVAS --- */
                    <div
                        ref={canvasRef}
                        className={`w-full h-full relative overflow-hidden bg-[#ddd] dark:bg-[#222] ${interactionMode === 'SELECT' ? (isDraggingCanvas ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'} touch-none`}
                        onMouseDown={(e) => handleStart(e, null)}
                        onMouseMove={handleMove}
                        onMouseUp={(e) => handleEnd(e, null)}
                        onClick={handleCanvasClick}
                        onTouchStart={(e) => handleStart(e, null)}
                        onTouchMove={handleMove}
                        onTouchEnd={(e) => handleEnd(e, null)}
                        onWheel={handleWheel}
                        style={{ backgroundImage: isDarkMode ? 'radial-gradient(#333 1px, transparent 1px)' : 'radial-gradient(#bbb 1px, transparent 1px)', backgroundSize: `${20 * scale}px ${20 * scale}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}
                    >
                        <div className="origin-top-left absolute top-0 left-0 w-full h-full pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
                            <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
                                {/* 1. Cabos Otimizados */}
                                {visibleItems.filter(i => i.type === 'CABLE').map(c => {
                                    const nodeA = items.find(n => n.id === c.fromNode);
                                    const nodeB = items.find(n => n.id === c.toNode);
                                    if (!nodeA || !nodeB) return null;

                                    // Recupera dados do grupo (topoologia)
                                    const [n1, n2] = [c.fromNode, c.toNode].sort();
                                    const group = cableGroups[`${n1}-${n2}`] || [c];
                                    const index = group.findIndex(g => g.id === c.id);
                                    const count = group.length;

                                    return (
                                        <CableLine
                                            key={c.id}
                                            cable={c}
                                            nodeA={nodeA} // Passamos o nó inteiro
                                            nodeB={nodeB}
                                            index={index} // Passamos a posição já calculada
                                            count={count}
                                            itemTypes={ITEM_TYPES}
                                            onSelect={(id) => setSelectedIds(new Set([id]))}
                                            onOpen={setDetailId}
                                            onDelete={deleteItem}
                                            onEdit={renameItem}
                                            isSelected={selectedIds.has(c.id)}
                                        />
                                    );
                                })}

                                {/* 2. Drops Otimizados */}
                                {/* {visibleConnections.filter(c => c.type === 'DROP').map(c => {
                                    const client = items.find(i => i.id === c.toId);
                                    let sourceItem = items.find(i => i.id === c.fromId);
                                    if (!client) return null;
                                    if (sourceItem?.parentId) sourceItem = items.find(i => i.id === sourceItem.parentId);
                                    if (!sourceItem) return null;

                                    // Calculamos aqui para o componente ser "burro" e rápido
                                    const x1 = (sourceItem.x || 0) + 60;
                                    const y1 = (sourceItem.y || 0) + 40;
                                    const x2 = (client.x || 0) + 60;
                                    const y2 = (client.y || 0) + 40;

                                    return <DropLine key={c.id} x1={x1} y1={y1} x2={x2} y2={y2} />;
                                })} */}

                                {/* Linha de desenho (Mantém igual) */}
                                {interactionMode === 'DRAW_CABLE' && cableStartNode && <line x1={cableStartNode.x + ITEM_TYPES[cableStartNode.type].width / 2} y1={cableStartNode.y + 30} x2={draggingNode ? draggingNode.x : 0} y2={0} stroke={isDarkMode ? "white" : "black"} strokeDasharray="4" />}
                            </svg>

                            {/* Caixa de Seleção */}
                            {selectionBox && <div style={{ position: 'absolute', left: selectionBox.x, top: selectionBox.y, width: selectionBox.w, height: selectionBox.h, border: '1px dashed #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', pointerEvents: 'none' }}></div>}

                            {/* Nós (Caixas e Clientes) */}
                            <div className="pointer-events-auto">
                                {visibleItems.filter(i => !i.parentId && ITEM_TYPES[i.type].category === 'NODE').map(n => (
                                    <CanvasNodes
                                        key={n.id}
                                        node={n}
                                        config={ITEM_TYPES[n.type]}
                                        isSelected={selectedIds.has(n.id)}
                                        isCableStart={interactionMode === 'DRAW_CABLE' && n.id === cableStartNode?.id}
                                        isDragging={draggingNode?.isMultiSelect && selectedIds.has(n.id)}
                                        onStart={handleStart}
                                        onEnd={handleEnd}
                                        onDoubleClick={handleNodeDoubleClick}
                                        onOpen={(id) => {
                                            setDetailId(id);
                                            setSelectedIds(new Set([id]));
                                        }}
                                        onEdit={renameItem}
                                        onDelete={deleteItem}
                                        onSelect={(id) => {
                                            setSelectedIds(new Set([id]));
                                        }}
                                    />
                                ))}

                                {/* Esta div é invisível e serve apenas como destino para os tooltips dos cabos saltarem para frente de tudo */}
                                <div
                                    id="cable-tooltips-layer"
                                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                    style={{ zIndex: 9999 }} // Z-index altíssimo para garantir
                                ></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* --- MODO MAPA --- */
                    <div className={`w-full h-full relative overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-gray-200'}`}>
                        <FiberMap
                            items={visibleItems}
                            allItems={items}
                            saveItem={saveItem}
                            isDarkMode={isDarkMode}
                            connections={visibleConnections}
                            signalNames={signalNames}

                            interactionMode={interactionMode}
                            onMapClick={handleMapBgClick}
                            onNodeClick={handleMapNodeClick}
                            isPickingMode={interactionMode === 'DRAW_CABLE' || clientWizard.step === 'PICK_CTO'}
                            flyToCoords={flyToCoords}
                            onClearSearch={() => setFlyToCoords(null)}
                            searchTerm={searchTerm}
                            searchMode={searchMode}
                            onEdit={renameItem}
                            onDelete={deleteItem}
                            onOpen={setDetailId}      // Duplo Clique -> Abre DetailPanel
                            onSwitchToCanvas={() => setViewMode('CANVAS')}
                            cableStartNodeId={cableStartNode?.id}

                        />
                    </div>
                )}
            </div>

            {/* 2. BARRA DE BUSCA */}
            <div className="absolute top-2 left-4 md:left-8 z-[40] w-[90%] md:w-full max-w-[500px] flex flex-col items-start pointer-events-none">
                <div className="w-full flex items-center justify-between gap-5 px-1 py-1 bg-white/40 dark:bg-black/60 border border-white/60 dark:border-black/60 backdrop-blur-xl rounded-full shadow-2xl transition-all relative z-20 pointer-events-auto">

                    {/* Switch de Troca de Modo (Item vs Endereço) */}
                    {viewMode === 'MAP' ? (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setSearchMode(prev => prev === 'ITEMS' ? 'ADDRESS' : 'ITEMS');
                                setSuggestions([]);
                            }}
                            className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-all shrink-0"
                            title={searchMode === 'ITEMS' ? "Mudar para Busca de Endereço" : "Mudar para Filtro de Itens"}
                        >
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${searchMode === 'ITEMS' ? 'bg-blue-600 shadow-md text-white' : 'text-gray-400'}`}>
                                <Search size={20} />
                            </div>
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${searchMode === 'ADDRESS' ? 'bg-blue-600 shadow-md text-white' : 'text-gray-400'}`}>
                                <MapPin size={20} />
                            </div>
                        </div>
                    ) : (
                        <div
                            className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full p-0.5 transition-all shrink-0"
                        >
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 bg-blue-600 shadow-md text-white`}>
                                <Search size={20} />
                            </div>
                        </div>
                    )}

                    {/* Input Otimizado (Debounced) */}
                    <DebouncedInput
                        className="ml-2 bg-transparent outline-none text-sm w-full text-black dark:text-white placeholder-black dark:placeholder-white"
                        placeholder={viewMode === 'MAP' && searchMode === 'ADDRESS' ? "Pesquisar endereço" : "Pesquisar itens"}
                        value={searchTerm}

                        /* 1. MUDANÇA NO ONCHANGE: Recebe o valor direto (val) em vez do evento */
                        onChange={(val) => {
                            setSearchTerm(val);
                            if (val === '') setShowSuggestions(false);
                        }}

                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}

                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();

                                // Pega o texto ATUAL do input (mesmo que o searchTerm ainda não tenha atualizado)
                                const currentText = e.target.value;

                                // 1. Tenta pegar a primeira sugestão visível
                                let target = suggestions.length > 0 ? suggestions[0] : null;

                                // 2. Se não tem sugestão, busca pelo texto exato que está no input agora
                                if (!target && searchMode === 'ITEMS' && currentText) {
                                    const found = items.find(i => i.name.toLowerCase().includes(currentText.toLowerCase()));
                                    if (found) {
                                        target = { type: 'ITEM', data: found, display_name: found.name };
                                    }
                                }

                                // 3. Ação Final
                                if (target) {
                                    handleSelectSuggestion(target);
                                    setSearchTerm('');
                                    setShowSuggestions(false);
                                } else if (searchMode === 'ADDRESS') {
                                    handleAddressSearch();
                                }
                            }
                        }}
                    />

                    {/* Botão de Perfil (Sempre Visível) */}
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="mr-1 p-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-sm flex items-center justify-center shrink-0 w-10 h-10 overflow-hidden"
                        title="Meu Perfil"
                    >
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Perfil" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User size={20} />
                        )}
                    </button>
                </div>

                {/* Lista de Sugestões de Busca (Dropdown) */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="w-full bg-white/40 dark:bg-black/60 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/60 dark:border-black/60 overflow-hidden mt-2 z-10 animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto pointer-events-auto">

                        {/* OTIMIZAÇÃO 1: Preparamos um "Dicionário" de projetos antes do loop.
                           Isso é muuuito mais rápido do que procurar com .find() item por item.
                        */}
                        {(() => {
                            // Cria um objeto rápido: { 'id_projeto': 'Nome do Projeto' }
                            const projectMap = {};
                            [...myProjects, ...sharedProjects].forEach(p => {
                                projectMap[p.id] = p.name;
                            });

                            // OTIMIZAÇÃO 2: .slice(0, 50) 
                            // Garante que só renderizamos no máximo 50 itens para não travar a tela
                            return suggestions.slice(0, 50).map((item, index) => {

                                const IconComponent = item.type === 'ADDRESS' ? MapPin : (ITEM_TYPES[item.data?.type]?.icon || Box);
                                const iconColor = item.type === 'ADDRESS' ? "text-blue-500" : "text-orange-500";

                                // Busca instantânea no mapa que criamos acima
                                const projectName = (item.type === 'ITEM' && item.data?._projectId)
                                    ? projectMap[item.data._projectId]
                                    : null;

                                return (
                                    <div
                                        key={index}
                                        onClick={() => {
                                            handleSelectSuggestion(item);
                                            setSearchTerm('');
                                            setShowSuggestions(false);
                                        }}
                                        className="px-4 py-2 text-xs border-b border-gray-300 dark:border-gray-700 last:border-0 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer text-black dark:text-white flex items-center gap-2"
                                    >
                                        <IconComponent size={12} className={`shrink-0 ${iconColor}`} />

                                        {projectName && (
                                            <span className="shrink-0 bg-gray-200 dark:bg-gray-600 text-black dark:text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                {projectName}
                                            </span>
                                        )}

                                        <span className="line-clamp-1 font-medium">{item.display_name}</span>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}
            </div>

            {/* 3. PAINEL DE FILTROS FLUTUANTE (Novo Passo C) */}
            {isFilterPanelOpen && (
                <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[45] bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border dark:border-gray-700 w-[90%] max-w-lg animate-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Filtrar por Etiquetas</h3>
                        <div className="flex justify-between items-right mb-2 gap-5">
                            <button onClick={() => setFilterTags([])} className="text-xs text-red-500 hover:underline">Limpar</button>
                            <button onClick={() => setIsFilterPanelOpen(false)} className="text-xs text-blue-500 hover:underline">Fechar</button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {availableTags.sort((a, b) => a.name.localeCompare(b.name)).map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => {
                                    const newTags = filterTags.includes(tag.id) ? filterTags.filter(t => t !== tag.id) : [...filterTags, tag.id];
                                    setFilterTags(newTags);
                                }}
                                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all  ${filterTags.includes(tag.id)
                                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-300'
                                    : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-transparent hover:bg-blue-600 dark:hover:bg-blue-300'
                                    }`}
                            >
                                {tag.name}
                            </button>
                        ))}
                        {availableTags.length === 0 && <p className="text-xs text-gray-400">Nenhuma etiqueta criada.</p>}
                    </div>
                    <div className="flex gap-2 mt-3 pt-2 border-t dark:border-gray-700">
                        {['OR', 'AND', 'EXACT'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setFilterMode(mode)}
                                className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${filterMode === mode
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {mode === 'OR' ? 'Qualquer (OU)' : mode === 'AND' ? 'Todas (E)' : 'Exato'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. DOCK (Substitui a Sidebar) */}
            {userRole !== 'ATIVACAO' && (
                <Dock
                    activeTool={getActiveDockTool()}
                    setActiveTool={handleDockChange}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onNewClient={() => setInteractionMode('ADD_CLIENT')}
                    toggleFilterPanel={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    onManageProjects={() => setIsProjectManagerOpen(true)}
                />
            )}

            {/* 5. SETTINGS MODAL (Novo Centralizador) */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onExportKML={() => {
                    const mapNodes = items.filter(i => !i.parentId && (ITEM_TYPES[i.type]?.category === 'NODE' || i.type === 'CLIENT'));
                    const mapCables = items.filter(i => i.type === 'CABLE');
                    const success = downloadKML(mapNodes, mapCables, connections, signalNames, items);
                    if (success) openAlert("Sucesso", "Arquivo KML gerado");
                    setIsSettingsOpen(false);
                }}
                onImportKML={() => {
                    fileInputRef.current.click();
                    setIsSettingsOpen(false);
                }}
                onBackup={() => {
                    // 1. Filtra APENAS nos teus projetos ('myProjects')
                    // Se houver um projeto compartilhado visível, ele será ignorado aqui
                    const projectsToBackup = myProjects.filter(p => visibleProjectIds.includes(p.id));

                    // Opcional: Adicionar uma verificação extra para não chamar a função à toa
                    if (projectsToBackup.length === 0) {
                        // Podes usar o teu openAlert aqui se quiseres ser mais específico
                        openAlert("Sem projetos selecionados", "Você precisa deixar ao menos um projeto próprio visível para salvar. Não é possível salvar projetos compartilhados.");
                        return;
                    }

                    // 2. Chama a função passando a lista filtrada
                    generateBackupFile(
                        { items, connections, availableTags, signalNames, portLabels, nodeColorSettings },
                        projectsToBackup
                    );

                    setIsSettingsOpen(false);
                }}
                onRestore={() => {
                    backupInputRef.current.click();
                    setIsSettingsOpen(false);
                }}
                onManageTags={() => {
                    setTagManagerOpen(true);
                    setIsSettingsOpen(false);
                }}
                onOpenNodeColors={() => { setNodeColorsModalOpen(true); setIsSettingsOpen(false); }}
                onOpenCableColors={() => { setStandardsModalOpen(true); setIsSettingsOpen(false); }}
                onOpenReport={() => { setReportOpen(true); setIsSettingsOpen(false); }}
                onManageProjects={() => { setIsProjectManagerOpen(true); setIsSettingsOpen(false); }}
            />

            {/* Painel de Detalhes (Lógica existente) */}
            {detailId && (() => {
                const detailedItem = items.find(i => i.id === detailId);
                if (!detailedItem) return null;
                if (detailedItem.type === 'POST' || detailedItem.type === 'OBJECT') {
                    return (
                        <GenericModal
                            item={detailedItem}
                            onClose={() => setDetailId(null)}
                            onSave={(updatedItem) => saveItem(updatedItem)}
                            onDelete={(id) => {
                                deleteItem(id);
                                setDetailId(null);
                            }}
                            onOpenPhotos={(item) => setPhotoModalData(item)}
                        />
                    );
                }
                return (
                    <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50 flex flex-col transition-transform overflow-hidden">
                        <DetailPanel onOTDR={handleOTDR} itemId={detailId} items={items} connections={connections} portLabels={portLabels} signalNames={signalNames} setConnections={setConnections} setItems={setItems} /*setPortLabels={setPortLabels}*/ close={() => setDetailId(null)} openAddModal={setModalConfig} onEditRequest={renameItem} onGenericEditRequest={openEditModal} onConfirmRequest={openConfirm} onAlertRequest={openAlert} saveConnection={saveConnection} deleteConnectionDB={deleteConnectionDB} updateLabelDB={updateLabelDB} updateSignalDB={updateSignalDB} saveItem={saveItem} deleteItemDB={deleteItemDB} pendingConn={pendingConn} setPendingConn={setPendingConn} onInfoRequest={openInfoModal} onDelete={(id) => deleteItem(id)} onOpenPhotos={(item) => setPhotoModalData(item)} onAddSlotRequest={(item, type) => { const nextIndex = type === 'OLT' ? (item.interfaces?.length || 0) : (item.cards?.length || 0); setSlotModalConfig({ item, type, nextIndex }); }} onSplitCable={splitCable} onTraceRequest={handleTraceSignal} onOpenNotes={(item) => setNotesModalConfig({ itemId: item.id, title: `Nota: ${item.name}`, initialNotes: item.notes, onSave: (newText) => { saveItem({ ...item, notes: newText }); setNotesModalConfig(null); }, onClose: () => setNotesModalConfig(null) })} />
                    </div>
                );
            })()}

            {/* 6. MODAIS EXISTENTES E INPUTS INVISÍVEIS */}



            {/* Controles de Zoom (Canvas) */}
            {viewMode === 'CANVAS' && (
                <div className="absolute bottom-24 right-2.5 z-20 flex flex-col gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <button onClick={() => handleZoom(0.1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"><ZoomIn size={18} /></button>
                    <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
                    <button onClick={() => handleZoom(-0.1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"><ZoomOut size={18} /></button>
                </div>
            )}

            {/* Barra de Múltipla Seleção */}
            {selectedIds.size > 1 && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-xl rounded-full px-4 py-2 flex items-center gap-4 animate-in slide-in-from-top-2">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{selectedIds.size} itens selecionados</span>
                    <button onClick={deleteSelected} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1 rounded text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center gap-1">
                        <Trash2 size={14} /> Excluir Itens
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={16} />
                    </button>
                </div>
            )}



            {/* Inputs de Arquivo */}
            <input type="file" ref={backupInputRef} style={{ display: 'none' }} onChange={handleRestore} accept=".ftth,.json" />
            <input type="file" accept=".kml,.xml" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileImport} />

            {/* TELA DE CARREGAMENTO GLOBAL */}
            {isProcessing && (
                <div className="processing-overlay">
                    <div className="processing-box">
                        <div className="processing-spinner"></div>
                        <h3 className="processing-title">Processando</h3>
                        <p className="processing-text">{processingMessage}</p>
                    </div>
                </div>
            )}

            {/* Modais de Lógica */}
            {modalConfig && <ItemModal mode="create" config={modalConfig} standards={cableColorStandards} nodeColorSettings={nodeColorSettings} favoriteColors={favoriteColors} availableTags={availableTags} onManageTags={() => setTagManagerOpen(true)} onConfirm={handleModalSubmit} onCancel={() => { setModalConfig(null); cableStartNodeRef.current = null; setCableStartNode(null); }} />}
            {editModalConfig && <ItemModal mode="edit" {...editModalConfig} standards={cableColorStandards} nodeColorSettings={nodeColorSettings} favoriteColors={favoriteColors} availableTags={availableTags} onManageTags={() => setTagManagerOpen(true)} onCancel={() => setEditModalConfig(null)} />}
            {standardsModalOpen && <StandardsModal standards={cableColorStandards} onClose={() => setStandardsModalOpen(false)} onSave={(newStds) => { updateStandardsDB(newStds); setStandardsModalOpen(false); }} />}
            {nodeColorsModalOpen &&
                <NodeColorsModal
                    nodeSettings={nodeColorSettings}
                    favoriteColors={favoriteColors}
                    onClose={() => setNodeColorsModalOpen(false)}
                    onSave={(settings, favorites) => { updateNodeColorsDB(settings, favorites); }}
                />
            }
            {infoModalConfig && <InfoModal {...infoModalConfig} />}
            {confirmConfig && <ConfirmModal {...confirmConfig} onCancel={() => setConfirmConfig(null)} />}
            {alertConfig && <AlertModal {...alertConfig} onClose={() => setAlertConfig(null)} />}
            {reportOpen && (<ReportModal items={items} connections={connections} onClose={() => setReportOpen(false)} />)}

            {/* Wizard Cliente */}
            {clientWizard.step === 'NAME' && <ClientNameModal onConfirm={(name) => { setClientWizard({ step: 'PICK_CTO', data: { name } }); openAlert("Selecione a CTO", "Agora clique na CTO onde o cliente será conectado."); }} onCancel={() => setClientWizard({ step: null, data: {} })} />}
            {clientWizard.step === 'PICK_PORT' && <PortPickerModal ctoName={clientWizard.data.ctoNode.name} availablePorts={clientWizard.data.freePorts} onSelect={handleClientFinish} onCancel={() => setClientWizard({ step: null, data: {} })} />}

            {/* Outros Modais */}
            {photoModalData &&
                <PhotoGalleryModal
                    item={photoModalData}
                    onClose={() => setPhotoModalData(null)}
                    onUpload={handlePhotoUpload}
                    onDelete={handlePhotoDelete}
                    onBatchDelete={handleBatchPhotoDelete}
                    uploading={uploadingPhoto}
                />
            }
            {slotModalConfig && <AddSlotModal config={slotModalConfig} onConfirm={handleAddSlotConfirm} onCancel={() => setSlotModalConfig(null)} />}
            {splitModalData && <SplitModal data={splitModalData} onConfirm={executeSplitCable} onCancel={() => setSplitModalData(null)} />}
            {isProfileOpen && auth.currentUser && <ProfileModal user={auth.currentUser} onClose={() => setIsProfileOpen(false)} onUpdateName={handleUpdateProfileName} onUpdatePassword={handleUpdatePassword} onDeleteAccount={handleDeleteAccountFull} onLogout={handleLogout} onUpdatePhoto={handleUpdatePhoto} onDeletePhoto={handleDeletePhoto} />}
            {traceModalData && <TraceModal path={traceModalData} onClose={() => setTraceModalData(null)} />}

            {duplicatesData && <DuplicatesModal conflicts={duplicatesData} onCancel={() => { setDuplicatesData(null); setTempCleanItems([]); }} onConfirm={handleDuplicatesResolved} />}
            {importModalData && <ImportModal colors={importModalData.colors} itemCount={importModalData.items.length} onClose={() => setImportModalData(null)} onConfirm={processImportConfiguration} />}
            {fixConnectionsData && <FixConnectionsModal items={fixConnectionsData} onClose={() => setFixConnectionsData(null)} onConfirm={saveImportedData} />}
            {tagManagerOpen &&
                <TagManagerModal
                    tags={availableTags}
                    onClose={() => setTagManagerOpen(false)}
                    onSaveTag={saveTagDefinition}
                    onDeleteTag={deleteTagDefinition}
                />
            }
            {notesModalConfig && <NotesModal title={notesModalConfig.title} initialNotes={notesModalConfig.initialNotes} onSave={notesModalConfig.onSave} onClose={notesModalConfig.onClose} />}
            {isProjectManagerOpen && (
                <ProjectManagerModal
                    myProjects={myProjects}
                    sharedProjects={sharedProjects}
                    pendingInvites={pendingInvites}
                    outgoingInvites={outgoingInvites}
                    onRevokeShare={handleRevokeShare}

                    activeProjectId={activeProjectId}
                    visibleProjectIds={visibleProjectIds}
                    currentUserEmail={user.email}

                    onCreateProject={handleCreateProject}
                    onDeleteProject={handleDeleteProject}
                    onRenameProject={handleRenameProject}

                    onToggleVisibility={handleToggleProjectVisibility}

                    onSetActive={handleSetActiveProject}

                    onShareProject={handleShareProject}
                    onBulkShare={handleBulkShare}
                    onBulkTransfer={handleBulkTransfer}
                    onRespondInvite={handleRespondInvite}
                    incomingTransfers={incomingTransfers}
                    onAcceptTransfer={handleAcceptTransfer}

                    onFocusProject={handleFocusProject}

                    onClose={() => setIsProjectManagerOpen(false)}
                />
            )}

            {/* Crédito de Versão (Centralizado na Margem Inferior) */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1.5 text-[9px] text-gray-800 dark:text-gray-500 font-medium select-none pointer-events-none opacity-100">
                <img
                    src="https://cdn-icons-png.flaticon.com/512/2463/2463046.png"
                    alt="Ícone Network"
                    className="w-3 h-3"
                />
                <span>{VERSAO.NUMERO_VERSAO}</span>
            </div>
        </div>
    );
};
// FIM CANVAS (PRINCIPAL)--------------------------------------------------


export default App; // Export do arquivo completo