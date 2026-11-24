/*
 * Painel de Detalhes dedicado exclusivamente a CABOS ÓPTICOS (CABLE).
 * Layout em coluna única: exibe no topo a rota (Lado A ↔ Lado B com suas caixas/nós)
 * e abaixo a lista unificada de fibras com cores ABNT, sinais presentes, potência (dBm),
 * rastreio e status de conexão em cada extremidade.
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Activity, Edit3, X } from 'lucide-react';

import { ABNT_COLORS } from '../../config/constants';
import { findConnection, getSignalInfo, calculatePower } from '../../utils';
import { DS, ICON_SIZES, cn } from '../../theme/designSystem';

import {
    useDetailPanelState,
    DetailHeader,
    DetailAuxModals,
} from './shared';

const CableDetailPanel = (props) => {
    const {
        item,
        items,
        connections,
        portLabels,
        signalNames,
        close,
        onOpenNotes,
        onEditRequest,
        pendingConn,
        setPendingConn,
        onDelete,
        onOpenPhotos,
        onTraceRequest,
    } = props;

    const state = useDetailPanelState(props);
    const [expandedSide, setExpandedSide] = useState(null); // null | 'A' | 'B'

    // Reseta a expansão ao trocar de cabo ou reabrir o painel
    useEffect(() => {
        setExpandedSide(null);
    }, [item?.id]);

    const isHoverPointer = () =>
        typeof window !== 'undefined' &&
        window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;

    const handleSideHoverEnter = (side) => {
        if (isHoverPointer()) {
            setExpandedSide(side);
        }
    };

    const handleSideHoverLeave = () => {
        if (isHoverPointer()) {
            setExpandedSide(null);
        }
    };

    const handleSideClick = (side) => {
        // No desktop com mouse, a expansão acontece apenas via hover; no smartphone/touch, via clique
        if (isHoverPointer()) return;
        setExpandedSide((prev) => (prev === side ? null : side));
    };

    const nodeA = items.find((i) => i.id === item.fromNode);
    const nodeB = items.find((i) => i.id === item.toNode);
    const nameA = nodeA ? nodeA.name : 'Desconhecido';
    const nameB = nodeB ? nodeB.name : 'Desconhecido';

    return (
        <div
            className={cn('flex flex-col h-full w-full', DS.surface.page)}
            onClick={() => {
                if (pendingConn) setPendingConn(null);
            }}
        >
            <DetailHeader
                item={item}
                typeBadge={`Cabo Óptico · ${item.ports} Fibras`}
                showTabs={false}
                showReport={false}
                compactActions={true}
                onEditRequest={onEditRequest}
                onOpenNotes={onOpenNotes}
                onOpenPhotos={onOpenPhotos}
                onDelete={onDelete}
                onClose={() => {
                    setExpandedSide(null);
                    close();
                    setPendingConn(null);
                }}
            />

            {/* Área rolável única: Banner da Rota + Lista em Coluna Única das Fibras */}
            <div className="flex-1 overflow-y-auto px-3.5 py-3.5">
                <div className="w-full space-y-3.5">
                    {/* Banner da Rota do Cabo (Lado A ↔ Lado B) com expansão direcional animada (hover no desktop / clique no mobile) */}
                    <div
                        onMouseLeave={handleSideHoverLeave}
                        className="p-3 rounded-xl bg-[var(--ds-surface-card)] border border-[var(--ds-border-default)] shadow-sm"
                    >
                        <div className="flex items-stretch overflow-hidden">
                            {/* Lado A — expande da esquerda para a direita */}
                            <button
                                type="button"
                                onMouseEnter={() => handleSideHoverEnter('A')}
                                onClick={() => handleSideClick('A')}
                                aria-expanded={expandedSide === 'A'}
                                title={nameA}
                                className={cn(
                                    'text-left rounded-lg bg-[var(--ds-surface-subtle)] border border-[var(--ds-border-default)] hover:border-[var(--ds-brand-primary)] transition-all duration-300 ease-in-out overflow-hidden',
                                    expandedSide === 'B'
                                        ? 'flex-[0_0_0%] w-0 min-w-0 px-0 py-0 opacity-0 border-0 pointer-events-none'
                                        : expandedSide === 'A'
                                            ? 'flex-1 min-w-0 px-3 py-2 opacity-100 border-[var(--ds-brand-primary)]'
                                            : 'flex-1 min-w-0 px-2.5 py-2 opacity-100'
                                )}
                            >
                                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[var(--ds-text-accent)] whitespace-nowrap">
                                    Lado A
                                </span>
                                <span
                                    className={cn(
                                        'block text-xs sm:text-sm font-bold text-[var(--ds-text-primary)] mt-0.5',
                                        expandedSide === 'A' ? 'whitespace-normal break-words' : 'truncate'
                                    )}
                                >
                                    {nameA}
                                </span>
                            </button>

                            {/* Ícone central — recolhe suavemente quando um dos lados expande */}
                            <div
                                className={cn(
                                    'flex items-center justify-center shrink-0 text-[var(--ds-text-accent)] transition-all duration-300 ease-in-out overflow-hidden',
                                    expandedSide !== null
                                        ? 'w-0 mx-0 opacity-0 scale-0 pointer-events-none'
                                        : 'w-7 mx-2 opacity-100 scale-100'
                                )}
                            >
                                <div className="w-7 h-7 rounded-full bg-[var(--ds-brand-soft-bg)] border border-[var(--ds-brand-soft-border)] flex items-center justify-center">
                                    <ArrowLeftRight size={12} />
                                </div>
                            </div>

                            {/* Lado B — expande da direita para a esquerda */}
                            <button
                                type="button"
                                onMouseEnter={() => handleSideHoverEnter('B')}
                                onClick={() => handleSideClick('B')}
                                aria-expanded={expandedSide === 'B'}
                                title={nameB}
                                className={cn(
                                    'text-right rounded-lg bg-[var(--ds-surface-subtle)] border border-[var(--ds-border-default)] hover:border-[var(--ds-brand-primary)] transition-all duration-300 ease-in-out overflow-hidden',
                                    expandedSide === 'A'
                                        ? 'flex-[0_0_0%] w-0 min-w-0 px-0 py-0 opacity-0 border-0 pointer-events-none'
                                        : expandedSide === 'B'
                                            ? 'flex-1 min-w-0 px-3 py-2 opacity-100 border-[var(--ds-brand-primary)]'
                                            : 'flex-1 min-w-0 px-2.5 py-2 opacity-100'
                                )}
                            >
                                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[var(--ds-text-accent)] whitespace-nowrap">
                                    Lado B
                                </span>
                                <span
                                    className={cn(
                                        'block text-xs sm:text-sm font-bold text-[var(--ds-text-primary)] mt-0.5',
                                        expandedSide === 'B' ? 'whitespace-normal break-words' : 'truncate'
                                    )}
                                >
                                    {nameB}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Lista em Coluna Única das Fibras e seus Sinais */}
                    <div className="rounded-xl border border-[var(--ds-border-default)] bg-[var(--ds-surface-card)] overflow-hidden shadow-sm">
                        {/* Faixa com a cor do cabo no mapa */}
                        {item.color && (
                            <div className="h-1.5 w-full" style={{ backgroundColor: item.color }} />
                        )}

                        <div className="px-4 py-2.5 bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-default)] flex items-center justify-between">
                            <span className={DS.text.muted}>Padrão ABNT</span>
                        </div>

                        <div className="divide-y divide-[var(--ds-border-subtle)]">
                            {Array.from({ length: item.ports }).map((_, portIndex) => {
                                const cd = ABNT_COLORS[portIndex % 12];
                                const isBlackFiber = cd.id === 9; // Preto -> texto branco; demais cores -> texto preto

                                // Rótulo da fibra (usa Lado A como padrão, com fallback para Lado B)
                                const keyA = `${item.id}-${portIndex}-A`;
                                const keyB = `${item.id}-${portIndex}-B`;
                                const fiberLabel = portLabels[keyA] || portLabels[keyB] || `Fibra ${portIndex + 1}`;

                                // Conexões em cada ponta
                                const connA = findConnection(connections, item.id, portIndex, 'A');
                                const connB = findConnection(connections, item.id, portIndex, 'B');

                                // Sinais presentes na fibra (unifica sem duplicar nomes)
                                const sigA = getSignalInfo(items, connections, portLabels, signalNames, item.id, portIndex, 'A');
                                const sigB = getSignalInfo(items, connections, portLabels, signalNames, item.id, portIndex, 'B');
                                const mergedSignals = [];
                                const seenNames = new Set();
                                [...sigA, ...sigB].forEach((s) => {
                                    if (s?.name && !seenNames.has(s.name)) {
                                        seenNames.add(s.name);
                                        mergedSignals.push(s);
                                    }
                                });

                                // Potência óptica (prioriza Lado A, com fallback para Lado B)
                                const powerA = calculatePower(items, connections, item.id, portIndex, 'A');
                                const powerB = calculatePower(items, connections, item.id, portIndex, 'B');
                                const power = powerA !== null ? powerA : powerB;
                                const traceSide = powerA !== null || connA ? 'A' : 'B';

                                const powerColor =
                                    power === null
                                        ? ''
                                        : power < -25
                                            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                                            : power < -8
                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                                : power < 0
                                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                                    : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';

                                return (
                                    <div
                                        key={portIndex}
                                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--ds-surface-subtle)]/50 transition-colors"
                                    >
                                        {/* Esquerda: Bolinha ABNT centralizada verticalmente + Nome, Sinal e Potência */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div
                                                className={cn(
                                                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 border border-black/15',
                                                    cd.bg,
                                                    isBlackFiber ? 'text-white' : 'text-black'
                                                )}
                                                title={`Fibra ${portIndex + 1} — ${cd.name}`}
                                            >
                                                {portIndex + 1}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center flex-wrap gap-1.5">
                                                    <span className="text-sm font-bold text-[var(--ds-text-primary)] truncate">
                                                        {fiberLabel}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => state.updatePortLabel(keyA, fiberLabel)}
                                                        className="p-1 rounded text-[var(--ds-text-muted)] hover:text-[var(--ds-text-accent)] hover:bg-[var(--ds-surface-subtle)] transition-colors"
                                                        title="Renomear fibra"
                                                    >
                                                        <Edit3 size={11} />
                                                    </button>
                                                    {power !== null && (
                                                        <span
                                                            className={cn(
                                                                'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
                                                                powerColor
                                                            )}
                                                        >
                                                            {power.toFixed(2)} dBm
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Sinais presentes na fibra */}
                                                <div className="mt-1">
                                                    <span
                                                        onClick={() => state.handleSignalEdit(item.id, portIndex, traceSide)}
                                                        className={cn(
                                                            'text-xs cursor-pointer transition-colors',
                                                            mergedSignals.length > 0
                                                                ? 'font-semibold text-[var(--ds-text-accent)] hover:underline'
                                                                : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)]'
                                                        )}
                                                        title="Clique para editar o sinal desta fibra"
                                                    >
                                                        {mergedSignals.length > 0
                                                            ? mergedSignals.map((s) => s.name).join(' | ')
                                                            : 'Sem sinal'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Direita: Botão Rastrear fixado à direita e centralizado verticalmente */}
                                        <div className="flex items-center shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => onTraceRequest(item.id, portIndex, traceSide)}
                                                className="px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-[var(--ds-brand-soft-bg)] hover:bg-[var(--ds-brand-primary)] hover:text-[var(--ds-brand-on-primary)] border border-[var(--ds-brand-soft-border)] text-[var(--ds-text-accent)] flex items-center gap-1 transition-colors active:scale-95"
                                                title="Rastrear sinal desta fibra"
                                            >
                                                <Activity size={12} />
                                                <span>Rastrear</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <DetailAuxModals
                signalModalConfig={state.signalModalConfig}
                renameModal={state.renameModal}
                setRenameModal={state.setRenameModal}
            />
        </div>
    );
};

export default CableDetailPanel;
