// Painel de detalhes de um nó. (Parte de dentro do POP, CEO, CTO...)

// IMPORTS --------------------------------------------------
import './styles.css';
import React, { useState } from 'react'; //React
import { v4 as uuidv4 } from 'uuid'; //Gera uuid unicos

//Icones
import {
    Trash2, Network, Scissors, Activity, ArrowRightLeft, Edit3, X, ChevronsLeftRightEllipsis, FileDown,
    Router, Video, ChevronDown, ChevronRight, Layers, Tag, Camera, FileText, GripVertical, Server, Zap, Route,
    RulerDimensionLine
} from 'lucide-react';

// Imports dos outros arquivos
import { ABNT_COLORS, ITEM_TYPES } from '../../constants'; //Importação de Constantes
import { SplitterIcon } from '../../icons'; //Importação de Ícones
import { findConnection, getSignalInfo, calculatePower } from '../../utils';
import { generateNodeReport } from '../../pdfGenerator';

import ConnectionWorkbench from '../ConnectionWorkbench';
import SignalModal from '../../components/SignalModal';

// FIM IMPORTS --------------------------------------------------

// PAINEL DE PROPRIEDADES DOS NÓS --------------------------------------------------
const DetailPanel = ({
    itemId, items, connections, portLabels, signalNames, close, onOpenNotes,
    openAddModal, onEditRequest, onConfirmRequest, onAlertRequest, saveConnection, deleteConnectionDB, updateLabelDB, updateSignalDB,
    saveItem, pendingConn, setPendingConn, onDelete, onOpenPhotos, onAddSlotRequest, onSplitCable, onTraceRequest, onGenericEditRequest, onOTDR
}) => {
    const item = items.find(i => i.id === itemId);
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());
    const [viewMode, setViewMode] = useState('REPORT');
    const toggleCollapse = (id) => { const newSet = new Set(collapsedGroups); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setCollapsedGroups(newSet); };
    const [draggedItem, setDraggedItem] = useState(null);
    const [signalModalConfig, setSignalModalConfig] = useState(null);
    const [portActionsExpanded, setPortActionsExpanded] = useState(new Set());

    // ── Mini-modal de renomeação (só nome, sem portas/tags) ──
    const [renameModal, setRenameModal] = useState(null); // { title, current, onSave }
    const openRenameModal = (title, current, onSave) => setRenameModal({ title, current, onSave });
    const RenameModal = () => {
        const [val, setVal] = useState(renameModal.current);
        const save = () => { if (val.trim()) { renameModal.onSave(val.trim()); setRenameModal(null); } };
        return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[70] p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xs p-5 border dark:border-gray-700 animate-in zoom-in-95 duration-200">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <Edit3 size={16} className="text-blue-600" /> {renameModal.title}
                    </h3>
                    <input
                        autoFocus
                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 mb-4"
                        value={val}
                        onChange={e => setVal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && save()}
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setRenameModal(null)} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">Cancelar</button>
                        <button onClick={save} className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors">Salvar</button>
                    </div>
                </div>
            </div>
        );
    };
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleFullscreenChange = (next) => {
        setIsFullscreen(next);
        // Ao entrar em tela cheia, garante que a aba de conexões está ativa
        if (next) setViewMode('CONNECTION');
    };

    // Inicializar todos os grupos como colapsados
    React.useEffect(() => {
        if (!item) return;

        const allIds = new Set();

        // Adicionar dispositivos internos
        const devs = items.filter(i => i.parentId === item.id);
        devs.forEach(d => {
            allIds.add(d.id);

            // Adicionar sub-itens de OLT (uplinks e interfaces)
            if (d.type === 'OLT') {
                if (d.uplinkCount > 0) allIds.add(`uplink-${d.id}`);
                d.interfaces?.forEach((_, idx) => allIds.add(`iface-${d.id}-${idx}`));
            }

            // Adicionar cards de DIO
            if (d.type === 'DIO') {
                d.cards?.forEach((_, cIdx) => allIds.add(`dio-${d.id}-card-${cIdx}`));
            }
        });

        // Adicionar cabos conectados
        const cabs = items.filter(i => (i.fromNode === item.id || i.toNode === item.id) && i.type === 'CABLE');
        cabs.forEach(c => allIds.add(c.id));

        setCollapsedGroups(allIds);
    }, [itemId]); // Reexecutar quando mudar de item

    if (!item) return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Item não encontrado.</div>;

    // ... dentro do componente DetailPanel ...
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleDownloadReport = async () => {
        setIsGeneratingPdf(true);
        try {
            // Precisamos passar 'items' (lista completa) para ele achar cabos e filhos
            // Supondo que 'items' é a prop que contém TUDO (nodes e cabos)
            await generateNodeReport(item, items);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Erro ao gerar relatório.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // --- Helpers Internos ---
    const disconnect = (id) => deleteConnectionDB(id);
    const handleConnect = (tId, p, s) => { if (pendingConn) { if (pendingConn.id === tId && pendingConn.port === p && pendingConn.side === s) { setPendingConn(null); return; } if (findConnection(connections, pendingConn.id, pendingConn.port, pendingConn.side) || findConnection(connections, tId, p, s)) { onAlertRequest("Ocupada", "Porta já conectada."); setPendingConn(null); return; } const sItem = items.find(i => i.id === pendingConn.id); const tItem = items.find(i => i.id === tId); const type = (sItem.parentId === item.id && tItem.parentId === item.id) ? 'PATCH' : 'FUSION'; saveConnection({ id: Date.now().toString(), type, fromId: pendingConn.id, fromPort: pendingConn.port, fromSide: pendingConn.side, toId: tId, toPort: p, toSide: s }); setPendingConn(null); } else { if (findConnection(connections, tId, p, s)) { onAlertRequest("Ocupada", "Porta já conectada."); return; } setPendingConn({ id: tId, port: p, side: s, name: items.find(i => i.id === tId).name }); } };
    const updatePortLabel = (k, c) => openRenameModal("Renomear Porta", c, (v) => updateLabelDB({ ...portLabels, [k]: v }));
    const handleSignalEdit = (itemId, portIndex, side) => {
        const uniqueKey = `${itemId}-${portIndex}`; let upstreamSignals = [];
        const item = items.find(i => i.id === itemId); if (item.type === 'SPLITTER' && portIndex !== 0 && portIndex !== '0') { upstreamSignals = getSignalInfo(items, connections, portLabels, signalNames, itemId, 0, 'A'); } else if (item.type === 'CABLE') { const conn = findConnection(connections, itemId, portIndex, side); if (conn) { const isT = conn.toId === itemId; upstreamSignals = getSignalInfo(items, connections, portLabels, signalNames, isT ? conn.fromId : conn.toId, isT ? conn.fromPort : conn.toPort, isT ? conn.fromSide : conn.toSide); } } else { const conn = findConnection(connections, itemId, portIndex, side); if (conn) { const isT = conn.toId === itemId; upstreamSignals = getSignalInfo(items, connections, portLabels, signalNames, isT ? conn.fromId : conn.toId, isT ? conn.fromPort : conn.toPort, isT ? conn.fromSide : conn.toSide); } } const currentConfig = signalNames[uniqueKey]; setSignalModalConfig({ portKey: uniqueKey, initialConfig: currentConfig, upstreamSignals: upstreamSignals, onSave: (newConfig) => updateSignalDB({ ...signalNames, [uniqueKey]: newConfig }), onClose: () => setSignalModalConfig(null) });
    };

    // --- Função para renomear dispositivos internos ---
    const renameDevice = (id, currentName) => onEditRequest(id, currentName);

    // Funções de CRUD internas
    const addInterface = (id) => { const it = items.find(x => x.id === id); if (it) onAddSlotRequest(it, 'OLT'); };
    const removeInterface = (id, idx) => onConfirmRequest("Remover", "Excluir placa?", () => { const it = items.find(x => x.id === id); if (it) { const ni = [...it.interfaces]; ni.splice(idx, 1); saveItem({ ...it, interfaces: ni }); } });
    const renameInterface = (id, idx, cur) => openRenameModal("Renomear Placa", cur, (v) => { const it = items.find(x => x.id === id); if (it) { const ni = [...it.interfaces]; ni[idx] = { ...ni[idx], name: v }; saveItem({ ...it, interfaces: ni }); } });

    const addDioCard = (id) => { const it = items.find(x => x.id === id); if (it) onAddSlotRequest(it, 'DIO'); };
    const removeDioCard = (id, idx) => onConfirmRequest("Remover", "Excluir card e conexões?", () => { const it = items.find(x => x.id === id); if (it && it.cards) { const newCards = [...it.cards]; newCards.splice(idx, 1); saveItem({ ...it, cards: newCards }); } });
    const renameDioCard = (id, idx, cur) => openRenameModal("Renomear Card", cur, (v) => { const it = items.find(x => x.id === id); if (it && it.cards) { const newCards = [...it.cards]; newCards[idx] = { ...newCards[idx], name: v }; saveItem({ ...it, cards: newCards }); } });

    // Drag and Drop
    const onDragStart = (e, it) => { setDraggedItem(it); e.dataTransfer.effectAllowed = "move"; };
    const onDragOver = (e, index) => { e.preventDefault(); };
    const onDrop = (e, targetIndex, list) => { e.preventDefault(); if (!draggedItem) return; const oldIndex = list.findIndex(i => i.id === draggedItem.id); if (oldIndex === targetIndex) return; const newList = [...list]; newList.splice(oldIndex, 1); newList.splice(targetIndex, 0, draggedItem); newList.forEach((it, idx) => { if (it.order !== idx) saveItem({ ...it, order: idx }); }); setDraggedItem(null); };

    // --- SUB-COMPONENTES ---

    const CollapsibleGroup = ({ title, itemId, icon: Icon, children, extraAction, customColor, onDragStart, onDrop, index, list, className = '', onEdit }) => {
        const isCollapsed = collapsedGroups.has(itemId);
        const bgColor = customColor || (document.documentElement.classList.contains('dark') ? '#1f2937' : '#cbd5e1');
        const textColor = customColor ? 'white' : (document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#1e293b');

        return (
            <div
                className={`draggable-card ${className || ''}`}
                draggable={!!onDragStart}
                onDragStart={(e) => onDragStart && onDragStart(e)}
                onDragOver={(e) => onDrop && e.preventDefault()}
                onDrop={(e) => onDrop && onDrop(e, index, list)}
            >
                <div className="card-header-wrapper">
                    {onDragStart && (
                        <div
                            className="drag-handle"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <GripVertical size={16} className="handle-icon" />
                        </div>
                    )}

                    <div
                        className="card-header-content"
                        style={{ backgroundColor: bgColor, color: textColor }}
                        onClick={() => toggleCollapse(itemId)}
                    >
                        <span className={`header-title ${customColor ? 'text-shadow-sm' : ''}`}>
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            {Icon && <Icon size={14} />}
                            {title}
                        </span>

                        <div className="header-actions">
                            {extraAction}

                            {/* Botão Editar */}
                            {onEdit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                    className={customColor ? 'btn-action-colored' : 'btn-edit-default'}
                                    title="Renomear"
                                >
                                    <Edit3 size={12} />
                                </button>
                            )}

                            {/* Botão Excluir */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(itemId); }}
                                className={customColor ? 'btn-action-colored' : 'btn-delete-default'}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="card-body">
                        {children}
                    </div>
                )}
            </div>
        )
    };

    // --- PORTROW COM CÁLCULO DE POTÊNCIA ---
    const PortRow = ({ targetItem, portIndex, side, isInput = false, overrideLabel = null, isPatchPanel = false, onOTDR }) => {
        const uKey = `${targetItem.id}-${portIndex}-${side}`;
        const conn = findConnection(connections, targetItem.id, portIndex, side);
        const sig = getSignalInfo(items, connections, portLabels, signalNames, targetItem.id, portIndex, side);
        const power = calculatePower(items, connections, targetItem.id, portIndex, side);
        const powerColor = power === null ? 'hidden' : (power < -25 ? 'bg-red-100 text-red-700 border-red-200' : (power < -8 ? 'bg-green-100 text-green-700 border-green-200' : (power < 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-blue-100 text-blue-700 border-blue-200')));

        let lbl = overrideLabel;
        if (!lbl) {
            if (targetItem.type === 'CABLE') lbl = `Fibra ${portIndex + 1}`;
            else if (targetItem.type === 'SPLITTER') lbl = isInput ? 'IN' : `Out ${portIndex}`;
            else lbl = `Porta ${portIndex + 1}`;
        }
        const disp = portLabels[uKey] || lbl;
        const isP = pendingConn && (pendingConn.id !== targetItem.id || pendingConn.port !== portIndex || pendingConn.side !== side);

        let fColor = 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300';
        if (targetItem.type === 'CABLE') { const cd = ABNT_COLORS[portIndex % 12]; fColor = `${cd.bg} text-white border-transparent`; }
        else if (isPatchPanel) { fColor = 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-700'; }
        else if (isInput) { fColor = 'bg-green-500 text-white border-transparent'; }

        const getDisplay = () => { if (targetItem.type === 'SPLITTER') return isInput ? 'IN' : portIndex; if (targetItem.type === 'OLT') { if (String(portIndex).startsWith('u-')) return 'U' + (parseInt(String(portIndex).split('-')[1]) + 1); if (String(portIndex).includes('-p-')) return parseInt(String(portIndex).split('-p-')[1]); } if (targetItem.type === 'DIO' && String(portIndex).includes('-p-')) { return parseInt(String(portIndex).split('-p-')[1]) + 1; } if (typeof portIndex === 'number') return portIndex + 1; return '•'; };

        return (
            <div className={`port-item-row ${isP ? 'row-disabled' : ''}`}>
                {/* Coluna Esquerda: Ícone e Informações */}
                <div className="port-info-group">

                    {/* Círculo da Porta */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${fColor}`}>
                        {getDisplay()}
                    </div>

                    {/* Textos e Metadados */}
                    <div className="port-details-column">

                        {/* Linha Superior: Nome e Potência */}
                        <div className="details-header-row">
                            <span className="port-label">{disp}</span>

                            <button
                                onClick={(e) => { e.stopPropagation(); updatePortLabel(uKey, disp); }}
                                className="btn-icon-action"
                            >
                                <Edit3 size={12} />
                            </button>

                            {power !== null && (
                                <span className={`power-badge ${powerColor}`}>
                                    {power.toFixed(2)} dBm
                                </span>
                            )}
                        </div>

                        {/* Linha Inferior: Accordion de Ações */}
                        <div className="details-meta-row">
                            {/* Resumo do Sinal (sempre visível) */}
                            <span onClick={(e) => { e.stopPropagation(); handleSignalEdit(targetItem.id, portIndex, side); }} className={`signal-text ${sig.length > 0 ? 'sig-active' : 'sig-empty'}`}>
                                {sig.length > 0 ? sig.map(s => s.name).join(' | ') : "Sem sinal"}
                            </span>

                            {/* Botão Toggle do Accordion */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const key = `${targetItem.id}-${portIndex}-${side}`;
                                    const newSet = new Set(portActionsExpanded);
                                    if (newSet.has(key)) newSet.delete(key);
                                    else newSet.add(key);
                                    setPortActionsExpanded(newSet);
                                }}
                                className="text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1"
                                title="Mostrar/Ocultar Ações"
                            >
                                {portActionsExpanded.has(`${targetItem.id}-${portIndex}-${side}`) ? (
                                    <>Ocultar <ChevronDown size={12} /></>
                                ) : (
                                    <>Ações <ChevronRight size={12} /></>
                                )}
                            </button>
                        </div>

                        {/* Accordion Expansível com Ações */}
                        {portActionsExpanded.has(`${targetItem.id}-${portIndex}-${side}`) && (
                            <div className="flex gap-8 mt-2 pb-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onTraceRequest(targetItem.id, portIndex, side); }}
                                    className="btn-trace-action"
                                    title="Rastrear Sinal"
                                >
                                    <Activity size={12} /> <span className="text-[10px]">Rastrear</span>
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSignalEdit(targetItem.id, portIndex, side); }}
                                    className="btn-trace-action"
                                    title="Configurar Sinal"
                                >
                                    <Tag size={12} /> <span className="text-[10px]">Sinal</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOTDR(targetItem.id, portIndex);
                                    }}
                                    className="btn-trace-action"
                                    title="OTDR (Medir Distância)"
                                >
                                    <RulerDimensionLine size={12} /> <span className="text-[10px]">OTDR</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Coluna Direita: Ações de Conexão */}
                <div onClick={e => e.stopPropagation()}>
                    {conn ? (
                        // Estado: CONECTADO
                        <button onClick={() => disconnect(conn.id)} className="connected-badge">
                            <span>
                                {conn.type === 'PATCH' ? 'Cordão' : 'Fusão'}
                            </span>
                            <span className="btn-disconnect">
                                <X size={12} />
                            </span>
                        </button>
                    ) : (
                        // Estado: DESCONECTADO (ou Pendente)
                        <button
                            onClick={() => handleConnect(targetItem.id, portIndex, side)}
                            className={`btn-connect ${pendingConn && pendingConn.id === targetItem.id && pendingConn.port === portIndex
                                ? 'btn-connect-active'
                                : 'btn-connect-idle'
                                }`}
                        >
                            {pendingConn && pendingConn.id === targetItem.id && pendingConn.port === portIndex
                                ? 'Cancelar '
                                : 'Conectar'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderBody = () => {
        // --- BLOCO DO CABO ---
        if (item.type === 'CABLE') {
            // 1. Busca os nós de Origem e Destino na lista geral
            const nodeA = items.find(i => i.id === item.fromNode);
            const nodeB = items.find(i => i.id === item.toNode);

            // 2. Define os nomes (com fallback de segurança)
            const nameA = nodeA ? nodeA.name : 'Desconhecido';
            const nameB = nodeB ? nodeB.name : 'Desconhecido';

            return (
                <div className="cable-layout">
                    <div className="cable-column">
                        <div className="cable-header-sticky flex flex-col items-center">
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-300 truncate w-full">Lado A</span>
                            <span title={nameA}>
                                {nameA}
                            </span>
                        </div>
                        {Array.from({ length: item.ports }).map((_, i) => (
                            <PortRow key={i} targetItem={item} portIndex={i} onOTDR={onOTDR} side="A" />
                        ))}
                    </div>

                    <div className="cable-column">
                        <div className="cable-header-sticky flex flex-col items-center">
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-300 truncate w-full">Lado B</span>
                            <span title={nameB}>
                                {nameB}
                            </span>
                        </div>
                        {Array.from({ length: item.ports }).map((_, i) => (
                            <PortRow key={i} targetItem={item} portIndex={i} onOTDR={onOTDR} side="B" />
                        ))}
                    </div>
                </div>
            );
        }

        const devs = items.filter(i => i.parentId === item.id).sort((a, b) => (a.order || 0) - (b.order || 0));
        const cabs = items.filter(i => (i.fromNode === item.id || i.toNode === item.id) && i.type === 'CABLE').sort((a, b) => (a.order || 0) - (b.order || 0));

        let opts = item.type === 'POP' || item.type === 'TOWER'
            ? [{ type: 'OLT', icon: Server, ports: 16 }, { type: 'DIO', icon: Network, ports: 24 }, { type: 'SWITCH', icon: ChevronsLeftRightEllipsis, ports: 24 }, { type: 'POE', icon: Zap, ports: 8 }, { type: 'ROUTER', icon: Router, ports: 5 }, { type: 'CAMERA', icon: Video, ports: 1 }, { type: 'SPLITTER', icon: SplitterIcon, ports: 8 }]
            : [{ type: 'SPLITTER', icon: SplitterIcon, ports: 8 }];

        return (
            <div className="node-view-root">
                <div className="node-toolbar">
                    <div className="toolbar-grid">
                        {opts.map(o =>
                            <button key={o.type} onClick={() => openAddModal({ mode: o.type === 'SPLITTER' ? 'SPLITTER' : 'INTERNAL_DEVICE', itemType: o.type, parentId: item.id, defaultName: `${o.type} ${devs.length + 1}`, defaultPorts: o.ports })} className="btn-add-device">
                                {React.createElement(o.icon, { size: 16 })} {o.type}
                            </button>
                        )}
                    </div>
                </div>

                <div className="node-content-scroll">
                    <div className="device-grid">
                        {devs.map((d, index) => (
                            <CollapsibleGroup
                                key={d.id}
                                itemId={d.id}
                                title={d.name}
                                icon={ITEM_TYPES[d.type].icon}
                                extraAction={null}
                                onDragStart={(e) => onDragStart(e, d)}
                                onDrop={onDrop}
                                index={index}
                                list={devs}
                                className={d.type === 'DIO' ? 'dio-col-span' : ''}
                                onEdit={() => renameDevice(d.id, d.name)}
                            >
                                <div className="device-inner-padding">
                                    {d.type === 'OLT' ? (
                                        <div>
                                            {d.uplinkCount > 0 && (
                                                <div className="device-subsection">
                                                    <div className="header-blue" onClick={() => toggleCollapse(`uplink-${d.id}`)}>
                                                        {collapsedGroups.has(`uplink-${d.id}`) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                                        <span>Uplinks</span>
                                                    </div>
                                                    {!collapsedGroups.has(`uplink-${d.id}`) && Array.from({ length: d.uplinkCount }).map((_, i) => <PortRow onOTDR={onOTDR} key={`u${i}`} targetItem={d} portIndex={`u-${i}`} side="A" overrideLabel={`Uplink ${i + 1}`} />)}
                                                </div>
                                            )}
                                            {d.interfaces?.map((iface, idx) => {
                                                const ifaceId = `iface-${d.id}-${idx}`;
                                                const isIfaceCollapsed = collapsedGroups.has(ifaceId);
                                                return (
                                                    <div key={idx} className="device-subsection">
                                                        <div className="header-gray" onClick={() => toggleCollapse(ifaceId)}>
                                                            <div className="flex items-center gap-2">
                                                                {isIfaceCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                                                <span className="font-bold-text">{iface.name}</span>
                                                            </div>
                                                            <div className="flex gap-5" onClick={e => e.stopPropagation()}>
                                                                <button onClick={() => renameInterface(d.id, idx, iface.name)} title="Renomear"><Edit3 size={12} /></button>
                                                                <button onClick={() => removeInterface(d.id, idx)} title="Remover"><Trash2 size={12} /></button>
                                                            </div>
                                                        </div>
                                                        {!isIfaceCollapsed && Array.from({ length: iface.portCount }).map((_, p) => <PortRow onOTDR={onOTDR} key={p} targetItem={d} portIndex={`i-${idx}-p-${p}`} side="A" overrideLabel={`PON ${p}`} />)}
                                                    </div>
                                                )
                                            })}
                                            <button onClick={() => addInterface(d.id)} className="btn-dashed-add text-blue-500 dark:text-blue-400">+ Placa</button>
                                        </div>
                                    ) : d.type === 'DIO' ? (
                                        <div className="space-y-2">
                                            {d.cards?.map((card, cIdx) => {
                                                const cardId = `dio-${d.id}-card-${cIdx}`;
                                                const isCardCollapsed = collapsedGroups.has(cardId);
                                                return (
                                                    <div key={cIdx} className="device-subsection">
                                                        <div className="header-purple" onClick={() => toggleCollapse(cardId)}>
                                                            <div className="flex items-center gap-2">
                                                                {isCardCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                                                <span className="font-bold-purple">{card.name}</span>
                                                            </div>
                                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                                <button onClick={() => renameDioCard(d.id, cIdx, card.name)} title="Renomear"><Edit3 size={12} className="text-purple-500" /></button>
                                                                <button onClick={() => removeDioCard(d.id, cIdx)} title="Remover"><Trash2 size={10} className="text-purple-500" /></button>
                                                            </div>
                                                        </div>
                                                        {!isCardCollapsed && (
                                                            <div className="dio-split-layout">
                                                                <div className="w-1/2">
                                                                    <div className="dio-side-label">FRENTE</div>
                                                                    {Array.from({ length: card.portCount }).map((_, p) => (<PortRow onOTDR={onOTDR} key={p} targetItem={d} portIndex={`c-${cIdx}-p-${p}`} side="FRONT" isPatchPanel={true} overrideLabel={`P${p + 1}`} />))}
                                                                </div>
                                                                <div className="w-1/2">
                                                                    <div className="dio-side-label">TRÁS</div>
                                                                    {Array.from({ length: card.portCount }).map((_, p) => (<PortRow onOTDR={onOTDR} key={p} targetItem={d} portIndex={`c-${cIdx}-p-${p}`} side="BACK" isPatchPanel={true} overrideLabel={`P${p + 1}`} />))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                            {(!d.cards || d.cards.length === 0) && d.ports > 0 && (
                                                <div className="dio-split-layout">
                                                    <div className="w-1/2">Frente{Array.from({ length: d.ports }).map((_, i) => <PortRow onOTDR={onOTDR} key={i} targetItem={d} portIndex={i} side="FRONT" isPatchPanel={true} />)}</div>
                                                    <div className="w-1/2">Trás{Array.from({ length: d.ports }).map((_, i) => <PortRow onOTDR={onOTDR} key={i} targetItem={d} portIndex={i} side="BACK" />)}</div>
                                                </div>
                                            )}
                                            <button onClick={() => addDioCard(d.id)} className="btn-dashed-add text-purple-500 dark:text-purple-400">+ Card DIO</button>
                                        </div>
                                    ) : (
                                        <div>
                                            {d.type === 'SPLITTER' && <PortRow onOTDR={onOTDR} targetItem={d} portIndex={0} side="A" isInput={true} overrideLabel="ENTRADA" />}
                                            {Array.from({ length: d.type === 'SPLITTER' ? d.ports - 1 : d.ports }).map((_, i) => <PortRow onOTDR={onOTDR} key={i} targetItem={d} portIndex={d.type === 'SPLITTER' ? i + 1 : i} side="A" isInput={false} overrideLabel={d.type === 'SPLITTER' ? `Saída ${i + 1}` : null} />)}
                                        </div>
                                    )}
                                </div>
                            </CollapsibleGroup>
                        ))}
                    </div>
                    {cabs.length > 0 && (
                        <div className="cables-container">
                            <h4 className="cables-title">Cabos Conectados</h4>
                            <div className="cables-grid">
                                {cabs.map((c, index) => (
                                    <CollapsibleGroup key={c.id} itemId={c.id} title={`${c.name} (Lado ${c.fromNode === item.id ? 'A' : 'B'})`} icon={Route} extraAction={null} customColor={c.color} onDragStart={(e) => onDragStart(e, c)} onDrop={onDrop} index={index} list={cabs} onEdit={() => renameDevice(c.id, c.name)}>
                                        <div className="cable-ports-list">
                                            {Array.from({ length: c.ports }).map((_, i) => <PortRow onOTDR={onOTDR} key={i} targetItem={c} portIndex={i} side={c.fromNode === item.id ? 'A' : 'B'} />)}
                                        </div>
                                    </CollapsibleGroup>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div
                className="detail-header-container"
                style={{
                    maxHeight: isFullscreen ? 0 : '300px',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease, opacity 0.2s ease, padding 0.3s ease',
                    paddingTop: isFullscreen ? 0 : undefined,
                    paddingBottom: isFullscreen ? 0 : undefined,
                    opacity: isFullscreen ? 0 : 1,
                    pointerEvents: isFullscreen ? 'none' : undefined,
                }}
            >
                <div className="header-row">
                    <div className="header-title-group group">
                        {React.createElement(ITEM_TYPES[item.type].icon, { size: 20, className: "header-icon-type" })}
                        <h2 className="header-title-text">{item.name}</h2>
                        <button onClick={() => onEditRequest(item.id, item.name)} className="btn-edit-title"><Edit3 size={14} /></button>
                    </div>
                    <div className="header-actions-group">
                        {/* --- SE CABO, BOTÃO CORTAR CABO --- */}
                        {item.type === 'CABLE' && (
                            <button
                                onClick={() => onSplitCable(item.id)}
                                className="btn-action-split"
                                title="Seccionar Cabo (Criar Emenda)"
                            >
                                <Scissors size={14} className="rotate-90" />
                                <span className="hidden sm:inline">Seccionar</span>
                            </button>
                        )}

                        {/* --- BOTÃO DE NOTAS --- */}
                        <button
                            onClick={() => onOpenNotes(item)}
                            className={`btn-action-base ${item.notes && item.notes.trim().length > 0 ? 'btn-notes-active' : 'btn-notes-idle'}`}
                            title="Anotações / Observações"
                        >
                            <FileText size={14} className={item.notes ? "fill-yellow-600 dark:fill-yellow-400" : ""} />
                            <span className="hidden sm:inline">Notas</span>
                        </button>

                        {/* --- BOTÃO DE FOTOS --- */}
                        <button
                            onClick={() => onOpenPhotos(item)}
                            className={`btn-action-base ${item.photos && item.photos.length > 0 ? 'btn-notes-active' : 'btn-notes-idle'}`}
                        >
                            <Camera size={14} />
                            <span className="hidden sm:inline">Fotos {item.photos?.length > 0 && `(${item.photos.length})`}</span>
                        </button>

                        {/* --- BOTÃO RELATÓRIO PDF --- */}
                        {item.type !== 'CABLE' && (
                            <button
                                onClick={handleDownloadReport}
                                disabled={isGeneratingPdf}
                                className="btn-action-base btn-notes-idle"
                                title="Gerar Relatório PDF"
                            >
                                {isGeneratingPdf ? (
                                    // Spinner simples enquanto gera
                                    <div className="w-3.5 h-3.5 border-2 border-gray-600 dark:border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FileDown size={14} />
                                )}
                                <span className="hidden sm:inline">Relatório</span>
                            </button>
                        )}

                        {/* --- BOTÃO DELETE --- */}
                        <button onClick={() => { onDelete(item.id); close(); }} className="btn-action-delete" title="Excluir Item"><Trash2 size={18} /></button>

                        {/* --- BOTÃO DE FECHAR --- */}
                        <button onClick={() => { close(); setPendingConn(null); }} className="btn-action-close"><X size={20} /></button>
                    </div>
                </div>

                {/* ABAS DE NAVEGAÇÃO */}
                {item.type !== 'CABLE' && (
                    <div className="nav-tabs-wrapper">
                        <button
                            onClick={() => setViewMode('REPORT')}
                            className={`nav-tab-btn ${viewMode === 'REPORT' ? 'nav-tab-report-active' : 'nav-tab-idle'}`}
                        >
                            <Layers size={16} /> Equipamentos
                        </button>
                        <button
                            onClick={() => setViewMode('CONNECTION')}
                            className={`nav-tab-btn ${viewMode === 'CONNECTION' ? 'nav-tab-conn-active' : 'nav-tab-idle'}`}
                        >
                            <ArrowRightLeft size={16} /> Conexões
                        </button>
                    </div>
                )}
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            {viewMode === 'REPORT' ? renderBody() : (
                <ConnectionWorkbench
                    item={item}
                    items={items}
                    connections={connections}
                    portLabels={portLabels}
                    signalNames={signalNames}
                    saveConnection={saveConnection}
                    deleteConnectionDB={deleteConnectionDB}
                    onAlertRequest={onAlertRequest}
                    pendingConn={pendingConn}
                    setPendingConn={setPendingConn}
                    saveItem={saveItem}
                    onFullscreenChange={handleFullscreenChange}
                />
            )}

            {/* MODAL DE SINAL */}
            {signalModalConfig && (
                <SignalModal
                    portKey={signalModalConfig.portKey}
                    initialConfig={signalModalConfig.initialConfig}
                    upstreamSignals={signalModalConfig.upstreamSignals}
                    onSave={signalModalConfig.onSave}
                    onClose={signalModalConfig.onClose}
                />
            )}

            {/* MINI-MODAL DE RENOMEAÇÃO */}
            {renameModal && <RenameModal />}
        </>
    )
};

export default DetailPanel;