/*
 * Componentes, hooks e helpers compartilhados pelos painéis de detalhes
 * (BoxDetailPanel, PopDetailPanel, TowerDetailPanel e CableDetailPanel).
 * Estilizado integralmente com o Design System centralizado (Light + Dark).
 */

import React, { useState, useEffect } from 'react';
import {
    Trash2, Activity, ArrowRightLeft, Edit3, X, FileDown,
    ChevronDown, ChevronRight, Layers, Camera, FileText,
    GripVertical, Route
} from 'lucide-react';

import { ABNT_COLORS, ITEM_TYPES } from '../../config/constants';
import { findConnection, getSignalInfo, calculatePower } from '../../utils';
import { generateNodeReport } from '../../utils/pdfGenerator';
import { DS, ICON_SIZES, cn } from '../../theme/designSystem';

import AuditInfo from '../../components/AuditInfo';
import SignalModal from '../../components/modals/SignalModal';

// ============================================================================
// HOOK COMPARTILHADO DE ESTADO E AÇÕES DOS PAINÉIS DE DETALHE
// ============================================================================

export const useDetailPanelState = ({
    item,
    items,
    connections,
    portLabels,
    signalNames,
    onEditRequest,
    onConfirmRequest,
    onAlertRequest,
    saveConnection,
    deleteConnectionDB,
    updateLabelDB,
    updateSignalDB,
    saveItem,
    pendingConn,
    setPendingConn,
}) => {
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());
    const [viewMode, setViewMode] = useState('REPORT');
    const [draggedItem, setDraggedItem] = useState(null);
    const [signalModalConfig, setSignalModalConfig] = useState(null);
    const [portActionsExpanded, setPortActionsExpanded] = useState(new Set());
    const [renameModal, setRenameModal] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Inicializa todos os grupos como colapsados ao trocar o item aberto
    useEffect(() => {
        if (!item) return;

        const allIds = new Set();
        const devs = items.filter((i) => i.parentId === item.id);
        devs.forEach((d) => {
            allIds.add(d.id);
            if (d.type === 'OLT') {
                if (d.uplinkCount > 0) allIds.add(`uplink-${d.id}`);
                d.interfaces?.forEach((_, idx) => allIds.add(`iface-${d.id}-${idx}`));
            }
            if (d.type === 'DIO') {
                d.cards?.forEach((_, cIdx) => allIds.add(`dio-${d.id}-card-${cIdx}`));
            }
        });

        const cabs = items.filter(
            (i) => (i.fromNode === item.id || i.toNode === item.id) && i.type === 'CABLE'
        );
        cabs.forEach((c) => allIds.add(c.id));

        setCollapsedGroups(allIds);
        setViewMode('REPORT');
        setIsFullscreen(false);
    }, [item?.id]);

    const toggleCollapse = (id) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const togglePortActions = (key) => {
        setPortActionsExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const openRenameModal = (title, current, onSave) => {
        setRenameModal({ title, current, onSave });
    };

    const handleFullscreenChange = (next) => {
        setIsFullscreen(next);
        if (next) setViewMode('CONNECTION');
    };

    const handleDownloadReport = () => {
        if (!item) return;
        onConfirmRequest(
            'Baixar Relatório',
            'Deseja gerar e baixar o relatório em PDF deste item?',
            async () => {
                setIsGeneratingPdf(true);
                try {
                    await generateNodeReport(item, items);
                } catch (error) {
                    console.error('Erro ao gerar PDF:', error);
                    if (onAlertRequest) {
                        onAlertRequest('Erro', 'Falha ao gerar o relatório PDF. Tente novamente.');
                    } else {
                        alert('Erro ao gerar relatório.');
                    }
                } finally {
                    setIsGeneratingPdf(false);
                }
            }
        );
    };

    const disconnect = (connId) => {
        onConfirmRequest(
            'Remover Conexão',
            'Deseja realmente remover esta conexão?',
            () => deleteConnectionDB(connId)
        );
    };

    const handleConnect = (tId, p, s) => {
        if (pendingConn) {
            if (pendingConn.id === tId && pendingConn.port === p && pendingConn.side === s) {
                setPendingConn(null);
                return;
            }
            if (
                findConnection(connections, pendingConn.id, pendingConn.port, pendingConn.side) ||
                findConnection(connections, tId, p, s)
            ) {
                onAlertRequest('Ocupada', 'Porta já conectada.');
                return;
            }
            const sItem = items.find((i) => i.id === pendingConn.id);
            const tItem = items.find((i) => i.id === tId);
            const type =
                sItem?.parentId === item?.id && tItem?.parentId === item?.id ? 'PATCH' : 'FUSION';

            saveConnection({
                id: Date.now().toString(),
                type,
                fromId: pendingConn.id,
                fromPort: pendingConn.port,
                fromSide: pendingConn.side,
                toId: tId,
                toPort: p,
                toSide: s,
            });
            setPendingConn(null);
        } else {
            if (findConnection(connections, tId, p, s)) {
                onAlertRequest('Ocupada', 'Porta já conectada.');
                return;
            }
            const target = items.find((i) => i.id === tId);
            setPendingConn({ id: tId, port: p, side: s, name: target?.name || '' });
        }
    };

    const updatePortLabel = (key, current) => {
        openRenameModal('Renomear Porta', current, (val) => updateLabelDB({ [key]: val }));
    };

    const handleSignalEdit = (targetId, portIndex, side) => {
        const uniqueKey = `${targetId}-${portIndex}`;
        let upstreamSignals = [];
        const target = items.find((i) => i.id === targetId);

        if (target?.type === 'SPLITTER' && portIndex !== 0 && portIndex !== '0') {
            upstreamSignals = getSignalInfo(items, connections, portLabels, signalNames, targetId, 0, 'A');
        } else {
            const conn = findConnection(connections, targetId, portIndex, side);
            if (conn) {
                const isT = conn.toId === targetId;
                upstreamSignals = getSignalInfo(
                    items,
                    connections,
                    portLabels,
                    signalNames,
                    isT ? conn.fromId : conn.toId,
                    isT ? conn.fromPort : conn.toPort,
                    isT ? conn.fromSide : conn.toSide
                );
            }
        }

        const currentConfig = signalNames[uniqueKey];
        setSignalModalConfig({
            portKey: uniqueKey,
            initialConfig: currentConfig,
            upstreamSignals,
            onSave: (newConfig) => updateSignalDB({ [uniqueKey]: newConfig }, targetId),
            onClose: () => setSignalModalConfig(null),
        });
    };

    const renameDevice = (id, currentName) => onEditRequest(id, currentName);

    const onDragStart = (e, it) => {
        setDraggedItem(it);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = (e, targetIndex, list) => {
        e.preventDefault();
        if (!draggedItem) return;
        const oldIndex = list.findIndex((i) => i.id === draggedItem.id);
        if (oldIndex === targetIndex) return;
        const newList = [...list];
        newList.splice(oldIndex, 1);
        newList.splice(targetIndex, 0, draggedItem);
        newList.forEach((it, idx) => {
            if (it.order !== idx) saveItem({ ...it, order: idx });
        });
        setDraggedItem(null);
    };

    return {
        collapsedGroups,
        toggleCollapse,
        viewMode,
        setViewMode,
        signalModalConfig,
        setSignalModalConfig,
        portActionsExpanded,
        togglePortActions,
        renameModal,
        setRenameModal,
        openRenameModal,
        isFullscreen,
        handleFullscreenChange,
        isGeneratingPdf,
        handleDownloadReport,
        disconnect,
        handleConnect,
        updatePortLabel,
        handleSignalEdit,
        renameDevice,
        onDragStart,
        onDrop,
    };
};

// ============================================================================
// MINI-MODAL DE RENOMEAÇÃO (COM DESIGN SYSTEM)
// ============================================================================

export const RenameModal = ({ modal, onClose }) => {
    const [val, setVal] = useState(modal?.current || '');

    if (!modal) return null;

    const save = () => {
        if (val.trim()) {
            modal.onSave(val.trim());
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[70] bg-[var(--ds-surface-overlay)] backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className={cn(DS.modal.container, 'max-w-xs')}>
                <div className={DS.card.accentBar} />
                <div className="p-5">
                    <h3 className={cn(DS.text.cardTitle, 'text-base mb-4 flex items-center gap-2')}>
                        <Edit3 size={ICON_SIZES.sm} className="text-[var(--ds-text-accent)]" />
                        <span>{modal.title}</span>
                    </h3>

                    <input
                        autoFocus
                        className={cn(DS.input.base, 'mb-5')}
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && save()}
                    />

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(DS.button.neutral, 'py-2 px-3.5 text-xs')}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={save}
                            className={cn(DS.button.primary, 'py-2 px-4 text-xs')}
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// CABEÇALHO UNIFICADO DOS PAINÉIS DE DETALHE (COM DESIGN SYSTEM)
// ============================================================================

export const DetailHeader = ({
    item,
    typeBadge = null,
    isFullscreen = false,
    viewMode = 'REPORT',
    setViewMode = null,
    showTabs = true,
    showReport = true,
    isGeneratingPdf = false,
    onEditRequest,
    onOpenNotes,
    onOpenPhotos,
    onDownloadReport,
    onDelete,
    onClose,
}) => {
    const TypeIcon = ITEM_TYPES[item.type]?.icon;
    const hasNotes = Boolean(item.notes && item.notes.trim().length > 0);
    const hasPhotos = Boolean(item.photos && item.photos.length > 0);

    return (
        <div
            className={cn(
                'shrink-0 bg-[var(--ds-surface-card)] border-b border-[var(--ds-border-default)] transition-all duration-300',
                isFullscreen ? 'max-h-0 opacity-0 overflow-hidden pointer-events-none border-b-0' : 'max-h-[320px] opacity-100'
            )}
        >
            {/* Faixa superior dourada da identidade visual */}
            <div className={DS.card.accentBar} />

            <div className="px-4 sm:px-6 pt-3.5 pb-3 space-y-3">
                {/* Linha principal: Ícone + Título + Ações */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 group">
                        <div className="w-9 h-9 rounded-lg bg-[var(--ds-brand-soft-bg)] border border-[var(--ds-brand-soft-border)] flex items-center justify-center text-[var(--ds-text-accent)] shrink-0">
                            {TypeIcon && <TypeIcon size={ICON_SIZES.md} />}
                        </div>

                        <div className="min-w-0">
                            {typeBadge && (
                                <span className="block font-brand text-[10px] uppercase tracking-[0.22em] text-[var(--ds-text-accent)] leading-none mb-0.5">
                                    {typeBadge}
                                </span>
                            )}
                            <div className="flex items-center gap-1.5 min-w-0">
                                <h2 className="text-base sm:text-lg font-black tracking-tight text-[var(--ds-text-primary)] truncate">
                                    {item.name}
                                </h2>
                                <AuditInfo
                                    createdBy={item.createdBy}
                                    createdAt={item.createdAt}
                                    modifiedBy={item.modifiedBy}
                                    modifiedAt={item.modifiedAt}
                                />
                                <button
                                    type="button"
                                    onClick={() => onEditRequest(item.id, item.name)}
                                    className="p-1.5 rounded-md text-[var(--ds-text-muted)] hover:text-[var(--ds-text-accent)] hover:bg-[var(--ds-surface-subtle)] transition-colors shrink-0"
                                    title="Renomear"
                                >
                                    <Edit3 size={ICON_SIZES.xs} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Botões de ação à direita */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => onOpenNotes(item)}
                            className={cn(
                                DS.button.selectableBase,
                                'px-2.5 sm:px-3 py-1.5',
                                hasNotes ? DS.button.selectableActive : DS.button.selectableIdle
                            )}
                            title="Anotações / Observações"
                        >
                            <FileText size={ICON_SIZES.xs} />
                            <span className="hidden sm:inline">Notas</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onOpenPhotos(item)}
                            className={cn(
                                DS.button.selectableBase,
                                'px-2.5 sm:px-3 py-1.5',
                                hasPhotos ? DS.button.selectableActive : DS.button.selectableIdle
                            )}
                            title="Galeria de Fotos"
                        >
                            <Camera size={ICON_SIZES.xs} />
                            <span className="hidden sm:inline">
                                Fotos {item.photos?.length > 0 && `(${item.photos.length})`}
                            </span>
                        </button>

                        {showReport && (
                            <button
                                type="button"
                                onClick={onDownloadReport}
                                disabled={isGeneratingPdf}
                                className={cn(
                                    DS.button.selectableBase,
                                    DS.button.selectableIdle,
                                    'px-2.5 sm:px-3 py-1.5 disabled:opacity-50'
                                )}
                                title="Gerar Relatório PDF"
                            >
                                {isGeneratingPdf ? (
                                    <div className="w-3.5 h-3.5 border-2 border-[var(--ds-text-primary)] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FileDown size={ICON_SIZES.xs} />
                                )}
                                <span className="hidden sm:inline">Relatório</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                onDelete(item.id);
                                onClose();
                            }}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--ds-error-text)] hover:bg-[var(--ds-error-bg)] transition-colors"
                            title="Excluir Item"
                        >
                            <Trash2 size={ICON_SIZES.md} />
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className={DS.button.iconSurface}
                            title="Fechar"
                            aria-label="Fechar"
                        >
                            <X size={ICON_SIZES.lg} />
                        </button>
                    </div>
                </div>

                {/* Abas de Navegação (Equipamentos / Conexões) */}
                {showTabs && setViewMode && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setViewMode('REPORT')}
                            className={cn(
                                DS.button.selectableBase,
                                'py-2',
                                viewMode === 'REPORT' ? DS.button.selectableActive : DS.button.selectableIdle
                            )}
                        >
                            <Layers size={ICON_SIZES.sm} />
                            <span>Equipamentos</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('CONNECTION')}
                            className={cn(
                                DS.button.selectableBase,
                                'py-2',
                                viewMode === 'CONNECTION' ? DS.button.selectableActive : DS.button.selectableIdle
                            )}
                        >
                            <ArrowRightLeft size={ICON_SIZES.sm} />
                            <span>Conexões</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// GRUPO COLAPSÁVEL COM DRAG & DROP (EQUIPAMENTOS E CABOS)
// ============================================================================

export const CollapsibleGroup = ({
    title,
    itemId,
    icon: Icon,
    children,
    extraAction,
    customColor,
    collapsedGroups,
    toggleCollapse,
    pendingConn,
    onDragStart,
    onDrop,
    index,
    list,
    className = '',
    onEdit,
    onDelete,
    auditData,
}) => {
    const isCollapsed = collapsedGroups.has(itemId);

    return (
        <div
            className={cn(
                'rounded-xl border border-[var(--ds-border-default)] bg-[var(--ds-surface-card)] overflow-hidden shadow-sm transition-colors duration-200',
                className
            )}
            draggable={Boolean(onDragStart)}
            onDragStart={(e) => onDragStart && onDragStart(e)}
            onDragOver={(e) => onDrop && e.preventDefault()}
            onDrop={(e) => onDrop && onDrop(e, index, list)}
        >
            <div className="flex items-stretch">
                {onDragStart && (
                    <div
                        className="px-2 flex items-center justify-center cursor-grab active:cursor-grabbing bg-[var(--ds-surface-subtle)] border-r border-[var(--ds-border-default)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] transition-colors"
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Arrastar para reordenar"
                    >
                        <GripVertical size={ICON_SIZES.sm} />
                    </div>
                )}

                <div
                    className={cn(
                        'flex-1 px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors',
                        customColor
                            ? 'text-white'
                            : 'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle-hover)]'
                    )}
                    style={customColor ? { backgroundColor: customColor } : undefined}
                    onClick={() => toggleCollapse(itemId)}
                >
                    <span className="flex items-center gap-2 text-xs sm:text-sm font-bold min-w-0 truncate">
                        {isCollapsed ? <ChevronRight size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                        {Icon && <Icon size={14} className="shrink-0" />}
                        <span className="truncate">{title}</span>
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {extraAction}

                        {auditData && (
                            <AuditInfo
                                createdBy={auditData.createdBy}
                                createdAt={auditData.createdAt}
                                modifiedBy={auditData.modifiedBy}
                                modifiedAt={auditData.modifiedAt}
                                mode="popover"
                            />
                        )}

                        {onEdit && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (pendingConn) return;
                                    onEdit();
                                }}
                                className={cn(
                                    'p-1.5 rounded-md transition-colors',
                                    customColor
                                        ? 'text-white/90 hover:bg-black/20'
                                        : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text-accent)] hover:bg-[var(--ds-surface-card)]',
                                    pendingConn && 'opacity-50 cursor-not-allowed'
                                )}
                                title="Renomear"
                            >
                                <Edit3 size={12} />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (pendingConn) return;
                                onDelete(itemId);
                            }}
                            className={cn(
                                'p-1.5 rounded-md transition-colors',
                                customColor
                                    ? 'text-white/90 hover:bg-black/20'
                                    : 'text-[var(--ds-error-text)] hover:bg-[var(--ds-error-bg)]',
                                pendingConn && 'opacity-50 cursor-not-allowed'
                            )}
                            title="Excluir"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {!isCollapsed && (
                <div className="bg-[var(--ds-surface-card)] border-t border-[var(--ds-border-default)]">
                    {children}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// LINHA DE PORTA / FIBRA COM POTÊNCIA ÓPTICA, SINAL, DUPLEX E CONEXÃO
// ============================================================================

export const PortRow = ({
    targetItem,
    portIndex,
    basePortIndex,
    side,
    isInput = false,
    overrideLabel = null,
    isPatchPanel = false,
    items,
    connections,
    portLabels,
    signalNames,
    pendingConn,
    portActionsExpanded,
    togglePortActions,
    updatePortLabel,
    handleSignalEdit,
    handleConnect,
    disconnect,
    onTraceRequest,
    onConfirmRequest,
    deleteConnectionDB,
    saveItem,
}) => {
    const indexToUse = basePortIndex !== undefined ? basePortIndex : portIndex;
    const uKey = `${targetItem.id}-${portIndex}-${side}`;
    const conn = findConnection(connections, targetItem.id, portIndex, side);
    const sig = getSignalInfo(items, connections, portLabels, signalNames, targetItem.id, portIndex, side);
    const power = calculatePower(items, connections, targetItem.id, portIndex, side);

    // Cores técnicas semânticas para potência óptica (dBm)
    const powerColor =
        power === null
            ? 'hidden'
            : power < -25
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                : power < -8
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : power < 0
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';

    let lbl = overrideLabel;
    if (!lbl) {
        if (targetItem.type === 'CABLE') lbl = `Fibra ${portIndex + 1}`;
        else if (targetItem.type === 'SPLITTER') lbl = isInput ? 'IN' : `Out ${portIndex}`;
        else lbl = `Porta ${portIndex + 1}`;
    }
    const disp = portLabels[uKey] || lbl;
    const isPendingOther =
        pendingConn &&
        (pendingConn.id !== targetItem.id || pendingConn.port !== portIndex || pendingConn.side !== side);
    const isPendingSelf =
        pendingConn &&
        pendingConn.id === targetItem.id &&
        pendingConn.port === portIndex &&
        pendingConn.side === side;

    // Cor do círculo da porta / fibra (mantém padrão ABNT para cabos)
    let circleClass =
        'bg-[var(--ds-surface-subtle)] border-[var(--ds-border-input)] text-[var(--ds-text-secondary)]';
    if (targetItem.type === 'CABLE') {
        const cd = ABNT_COLORS[portIndex % 12];
        const isBlackFiber = cd.id === 9; // Preto -> texto branco; demais cores -> texto preto
        circleClass = `${cd.bg} ${isBlackFiber ? 'text-white' : 'text-black'} border-black/15`;
    } else if (isPatchPanel) {
        circleClass =
            'bg-[var(--ds-brand-soft-bg)] text-[var(--ds-text-accent)] border-[var(--ds-brand-soft-border)]';
    } else if (isInput) {
        circleClass = 'bg-emerald-500 text-white border-transparent';
    }

    const getDisplay = () => {
        if (targetItem.type === 'SPLITTER') return isInput ? 'IN' : portIndex;
        if (targetItem.type === 'OLT') {
            if (String(portIndex).startsWith('u-')) return 'U' + (parseInt(String(portIndex).split('-')[1], 10) + 1);
            if (String(portIndex).includes('-p-')) return parseInt(String(portIndex).split('-p-')[1], 10);
        }
        if (targetItem.type === 'DIO' && String(portIndex).includes('-p-')) {
            return parseInt(String(portIndex).split('-p-')[1], 10) + 1;
        }
        if (typeof portIndex === 'number') return portIndex + 1;
        return '•';
    };

    const isExpanded = portActionsExpanded.has(uKey);

    return (
        <div
            className={cn(
                'px-3 py-2.5 flex items-start justify-between gap-2 border-b last:border-b-0 border-[var(--ds-border-subtle)] transition-opacity',
                isPendingOther && 'opacity-50'
            )}
        >
            {/* Esquerda: Círculo + Informações da porta */}
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div
                    className={cn(
                        'w-6 h-6 mt-0.5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 border',
                        circleClass
                    )}
                >
                    {getDisplay()}
                </div>

                <div className="min-w-0 flex-1">
                    {/* Linha 1: Rótulo + Editar + Potência */}
                    <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-[var(--ds-text-primary)] truncate">
                            {disp}
                        </span>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (pendingConn) return;
                                updatePortLabel(uKey, disp);
                            }}
                            className={cn(
                                'p-1 rounded text-[var(--ds-text-muted)] hover:text-[var(--ds-text-accent)] hover:bg-[var(--ds-surface-subtle)] transition-colors',
                                pendingConn && 'opacity-50 cursor-not-allowed'
                            )}
                            title="Renomear porta"
                        >
                            <Edit3 size={11} />
                        </button>

                        {power !== null && (
                            <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border', powerColor)}>
                                {power.toFixed(2)} dBm
                            </span>
                        )}
                    </div>

                    {/* Linha 2: Sinal + Toggle Ações */}
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                if (pendingConn) return;
                                handleSignalEdit(targetItem.id, portIndex, side);
                            }}
                            className={cn(
                                'text-xs cursor-pointer transition-colors',
                                sig.length > 0
                                    ? 'font-semibold text-[var(--ds-text-accent)] hover:underline'
                                    : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)]',
                                pendingConn && 'opacity-50 cursor-not-allowed'
                            )}
                            title="Clique para editar o sinal"
                        >
                            {sig.length > 0 ? sig.map((s) => s.name).join(' | ') : 'Sem sinal'}
                        </span>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (pendingConn) return;
                                togglePortActions(uKey);
                            }}
                            className={cn(
                                'text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--ds-surface-subtle)] hover:bg-[var(--ds-surface-subtle-hover)] text-[var(--ds-text-secondary)] flex items-center gap-1 transition-colors',
                                pendingConn && 'opacity-50 cursor-not-allowed'
                            )}
                            title="Mostrar/Ocultar Ações"
                        >
                            {isExpanded ? (
                                <>
                                    Ocultar <ChevronDown size={11} />
                                </>
                            ) : (
                                <>
                                    Ações <ChevronRight size={11} />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Accordion de Ações (Duplex / Rastrear) */}
                    {isExpanded && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-[var(--ds-border-subtle)]">
                            {['OLT', 'SWITCH', 'ROUTER'].includes(targetItem.type) && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const isDuplex = targetItem.portConfigs?.[indexToUse] === 'duplex';
                                        const connectionsToDelete = connections.filter((c) => {
                                            if (c.fromId !== targetItem.id && c.toId !== targetItem.id) return false;
                                            const portInConn = c.fromId === targetItem.id ? c.fromPort : c.toPort;
                                            return isDuplex
                                                ? portInConn === `${indexToUse}-TX` || portInConn === `${indexToUse}-RX`
                                                : portInConn === indexToUse;
                                        });

                                        const applyConfig = () => {
                                            const newConfigs = { ...(targetItem.portConfigs || {}) };
                                            if (isDuplex) delete newConfigs[indexToUse];
                                            else newConfigs[indexToUse] = 'duplex';
                                            saveItem({ ...targetItem, portConfigs: newConfigs });
                                        };

                                        if (connectionsToDelete.length > 0) {
                                            onConfirmRequest(
                                                'Aviso de Desconexão',
                                                `Esta ação irá desconectar ${connectionsToDelete.length} fibra(s) atrelada(s) a esta porta. Deseja continuar?`,
                                                () => {
                                                    connectionsToDelete.forEach((c) => deleteConnectionDB(c.id));
                                                    applyConfig();
                                                }
                                            );
                                            return;
                                        }
                                        applyConfig();
                                    }}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[var(--ds-surface-subtle)] hover:bg-[var(--ds-surface-subtle-hover)] border border-[var(--ds-border-default)] text-[var(--ds-text-primary)] flex items-center gap-1 transition-colors"
                                    title="Alternar entre Simplex (1 fibra) e Duplex (2 fibras)"
                                >
                                    <Layers size={12} />
                                    <span>{targetItem.portConfigs?.[indexToUse] === 'duplex' ? 'Padrão' : 'Duplex'}</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTraceRequest(targetItem.id, portIndex, side);
                                }}
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[var(--ds-brand-soft-bg)] hover:bg-[var(--ds-brand-primary)] hover:text-[var(--ds-brand-on-primary)] border border-[var(--ds-brand-soft-border)] text-[var(--ds-text-accent)] flex items-center gap-1 transition-colors"
                                title="Rastrear Sinal"
                            >
                                <Activity size={12} />
                                <span>Rastrear</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Direita: Conectar / Desconectar */}
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                {conn ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (pendingConn) return;
                            disconnect(conn.id);
                        }}
                        className={cn(
                            'px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 bg-[var(--ds-success-bg)] border-[var(--ds-success-border)] text-[var(--ds-success-text)] hover:bg-[var(--ds-error-bg)] hover:border-[var(--ds-error-border)] hover:text-[var(--ds-error-text)] transition-colors',
                            pendingConn && 'opacity-50 cursor-not-allowed'
                        )}
                        title="Clique para desconectar"
                    >
                        <span>{conn.type === 'PATCH' ? 'Cordão' : 'Fusão'}</span>
                        <X size={12} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => handleConnect(targetItem.id, portIndex, side)}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all active:scale-95',
                            isPendingSelf
                                ? 'bg-[var(--ds-error-solid)] text-white'
                                : 'bg-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-primary-hover)] text-[var(--ds-brand-on-primary)]'
                        )}
                    >
                        {isPendingSelf ? 'Cancelar' : 'Conectar'}
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// SEÇÃO COMPARTILHADA DE CABOS CONECTADOS AO NÓ (BOX, POP, TOWER)
// ============================================================================

export const ConnectedCablesSection = ({
    nodeId,
    cables,
    collapsedGroups,
    toggleCollapse,
    pendingConn,
    onDragStart,
    onDrop,
    renameDevice,
    onDelete,
    portRowProps,
}) => {
    if (!cables || cables.length === 0) return null;

    return (
        <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className={DS.text.eyebrow}>Cabos Conectados ({cables.length})</h4>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {cables.map((c, index) => (
                    <CollapsibleGroup
                        key={c.id}
                        itemId={c.id}
                        title={`${c.name} (Lado ${c.fromNode === nodeId ? 'A' : 'B'})`}
                        icon={Route}
                        customColor={c.color}
                        collapsedGroups={collapsedGroups}
                        toggleCollapse={toggleCollapse}
                        pendingConn={pendingConn}
                        onDragStart={(e) => onDragStart(e, c)}
                        onDrop={onDrop}
                        index={index}
                        list={cables}
                        onEdit={() => renameDevice(c.id, c.name)}
                        onDelete={onDelete}
                        auditData={{
                            createdBy: c.createdBy,
                            createdAt: c.createdAt,
                            modifiedBy: c.modifiedBy,
                            modifiedAt: c.modifiedAt,
                        }}
                    >
                        <div>
                            {Array.from({ length: c.ports }).map((_, i) => (
                                <PortRow
                                    key={i}
                                    targetItem={c}
                                    portIndex={i}
                                    side={c.fromNode === nodeId ? 'A' : 'B'}
                                    {...portRowProps}
                                />
                            ))}
                        </div>
                    </CollapsibleGroup>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// RENDERIZADOR DOS MODAIS AUXILIARES (SINAL + RENOMEAÇÃO)
// ============================================================================

export const DetailAuxModals = ({ signalModalConfig, renameModal, setRenameModal }) => (
    <>
        {signalModalConfig && (
            <SignalModal
                portKey={signalModalConfig.portKey}
                initialConfig={signalModalConfig.initialConfig}
                upstreamSignals={signalModalConfig.upstreamSignals}
                onSave={signalModalConfig.onSave}
                onClose={signalModalConfig.onClose}
            />
        )}
        {renameModal && <RenameModal modal={renameModal} onClose={() => setRenameModal(null)} />}
    </>
);
