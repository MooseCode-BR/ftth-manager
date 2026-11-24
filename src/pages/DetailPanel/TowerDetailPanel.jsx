/*
 * Painel de Detalhes dedicado exclusivamente à TORRE (TOWER).
 * Arquivo independente do POP para facilitar futuras evoluções específicas
 * de torres (rádios, antenas, setores, energia solar/nobreak, etc.).
 */

import React from 'react';
import {
    Network, ChevronsLeftRightEllipsis, Router, Video,
    ChevronDown, ChevronRight, Server, Zap, Edit3, Trash2
} from 'lucide-react';

import { ITEM_TYPES } from '../../config/constants';
import { SplitterIcon } from '../../components/icons';
import { DS, ICON_SIZES, cn } from '../../theme/designSystem';

import ConnectionWorkbench from './ConnectionWorkbench';
import {
    useDetailPanelState,
    DetailHeader,
    CollapsibleGroup,
    PortRow,
    ConnectedCablesSection,
    DetailAuxModals,
} from './shared';

const TOWER_DEVICE_OPTIONS = [
    { type: 'OLT', icon: Server, ports: 16 },
    { type: 'DIO', icon: Network, ports: 24 },
    { type: 'SWITCH', icon: ChevronsLeftRightEllipsis, ports: 24 },
    { type: 'POE', icon: Zap, ports: 8 },
    { type: 'ROUTER', icon: Router, ports: 5 },
    { type: 'CAMERA', icon: Video, ports: 1 },
    { type: 'SPLITTER', icon: SplitterIcon, ports: 8 },
];

const TowerDetailPanel = (props) => {
    const {
        item,
        items,
        connections,
        portLabels,
        signalNames,
        close,
        onOpenNotes,
        openAddModal,
        onEditRequest,
        onConfirmRequest,
        onAlertRequest,
        saveConnection,
        deleteConnectionDB,
        saveItem,
        pendingConn,
        setPendingConn,
        onDelete,
        onOpenPhotos,
        onAddSlotRequest,
        onTraceRequest,
    } = props;

    const state = useDetailPanelState(props);

    const devices = items
        .filter((i) => i.parentId === item.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const cables = items
        .filter((i) => (i.fromNode === item.id || i.toNode === item.id) && i.type === 'CABLE')
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    // CRUD de placas de OLT e cards de DIO
    const addInterface = (id) => {
        const it = items.find((x) => x.id === id);
        if (it) onAddSlotRequest(it, 'OLT');
    };
    const removeInterface = (id, idx) =>
        onConfirmRequest('Remover', 'Excluir placa?', () => {
            const it = items.find((x) => x.id === id);
            if (it) {
                const ni = [...it.interfaces];
                ni.splice(idx, 1);
                saveItem({ ...it, interfaces: ni });
            }
        });
    const renameInterface = (id, idx, cur) =>
        state.openRenameModal('Renomear Placa', cur, (v) => {
            const it = items.find((x) => x.id === id);
            if (it) {
                const ni = [...it.interfaces];
                ni[idx] = { ...ni[idx], name: v };
                saveItem({ ...it, interfaces: ni });
            }
        });

    const addDioCard = (id) => {
        const it = items.find((x) => x.id === id);
        if (it) onAddSlotRequest(it, 'DIO');
    };
    const removeDioCard = (id, idx) =>
        onConfirmRequest('Remover', 'Excluir card e conexões?', () => {
            const it = items.find((x) => x.id === id);
            if (it && it.cards) {
                const newCards = [...it.cards];
                newCards.splice(idx, 1);
                saveItem({ ...it, cards: newCards });
            }
        });
    const renameDioCard = (id, idx, cur) =>
        state.openRenameModal('Renomear Card', cur, (v) => {
            const it = items.find((x) => x.id === id);
            if (it && it.cards) {
                const newCards = [...it.cards];
                newCards[idx] = { ...newCards[idx], name: v };
                saveItem({ ...it, cards: newCards });
            }
        });

    const portRowProps = {
        items,
        connections,
        portLabels,
        signalNames,
        pendingConn,
        portActionsExpanded: state.portActionsExpanded,
        togglePortActions: state.togglePortActions,
        updatePortLabel: state.updatePortLabel,
        handleSignalEdit: state.handleSignalEdit,
        handleConnect: state.handleConnect,
        disconnect: state.disconnect,
        onTraceRequest,
        onConfirmRequest,
        deleteConnectionDB,
        saveItem,
    };

    return (
        <div
            className={cn('flex flex-col h-full w-full', DS.surface.page)}
            onClick={() => {
                if (pendingConn) setPendingConn(null);
            }}
        >
            <DetailHeader
                item={item}
                typeBadge="Torre"
                isFullscreen={state.isFullscreen}
                viewMode={state.viewMode}
                setViewMode={state.setViewMode}
                showTabs={true}
                showReport={true}
                isGeneratingPdf={state.isGeneratingPdf}
                onEditRequest={onEditRequest}
                onOpenNotes={onOpenNotes}
                onOpenPhotos={onOpenPhotos}
                onDownloadReport={state.handleDownloadReport}
                onDelete={onDelete}
                onClose={() => {
                    close();
                    setPendingConn(null);
                }}
            />

            {state.viewMode === 'REPORT' ? (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Toolbar de equipamentos da Torre */}
                    <div className="shrink-0 px-4 sm:px-6 py-3 bg-[var(--ds-surface-card)] border-b border-[var(--ds-border-default)]">
                        <div className="flex flex-wrap items-center gap-2">
                            {TOWER_DEVICE_OPTIONS.map((opt) => {
                                const OptIcon = opt.icon;
                                return (
                                    <button
                                        key={opt.type}
                                        type="button"
                                        onClick={() =>
                                            openAddModal({
                                                mode: opt.type === 'SPLITTER' ? 'SPLITTER' : 'INTERNAL_DEVICE',
                                                itemType: opt.type,
                                                parentId: item.id,
                                                defaultName: `${opt.type} ${devices.length + 1}`,
                                                defaultPorts: opt.ports,
                                            })
                                        }
                                        className={cn(
                                            DS.button.selectableBase,
                                            DS.button.selectableIdle,
                                            'px-3 py-1.5 text-xs hover:border-[var(--ds-brand-primary)] hover:text-[var(--ds-text-accent)]'
                                        )}
                                    >
                                        <OptIcon size={ICON_SIZES.xs} />
                                        <span>+ {opt.type}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Área rolável de equipamentos internos e cabos conectados */}
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
                        {devices.length === 0 && cables.length === 0 ? (
                            <div className="py-12 text-center rounded-xl border border-dashed border-[var(--ds-border-default)] bg-[var(--ds-surface-card)]">
                                <p className={DS.text.secondary}>
                                    Nenhum equipamento cadastrado nesta torre ainda.
                                </p>
                                <p className={cn(DS.text.muted, 'mt-1')}>
                                    Adicione equipamentos acima ou conecte cabos pelo mapa.
                                </p>
                            </div>
                        ) : (
                            <>
                                {devices.length > 0 && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {devices.map((d, index) => (
                                            <CollapsibleGroup
                                                key={d.id}
                                                itemId={d.id}
                                                title={d.name}
                                                icon={ITEM_TYPES[d.type]?.icon}
                                                collapsedGroups={state.collapsedGroups}
                                                toggleCollapse={state.toggleCollapse}
                                                pendingConn={pendingConn}
                                                onDragStart={(e) => state.onDragStart(e, d)}
                                                onDrop={state.onDrop}
                                                index={index}
                                                list={devices}
                                                className={d.type === 'DIO' ? 'lg:col-span-2' : ''}
                                                onEdit={() => state.renameDevice(d.id, d.name)}
                                                onDelete={onDelete}
                                                auditData={{
                                                    createdBy: d.createdBy,
                                                    createdAt: d.createdAt,
                                                    modifiedBy: d.modifiedBy,
                                                    modifiedAt: d.modifiedAt,
                                                }}
                                            >
                                                <div className="p-2 space-y-2">
                                                    {d.type === 'OLT' ? (
                                                        <div className="space-y-2">
                                                            {d.uplinkCount > 0 && (
                                                                <div className="rounded-lg border border-[var(--ds-border-default)] overflow-hidden">
                                                                    <div
                                                                        className="px-3 py-2 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-2 cursor-pointer select-none"
                                                                        onClick={() => state.toggleCollapse(`uplink-${d.id}`)}
                                                                    >
                                                                        {state.collapsedGroups.has(`uplink-${d.id}`) ? (
                                                                            <ChevronRight size={12} />
                                                                        ) : (
                                                                            <ChevronDown size={12} />
                                                                        )}
                                                                        <span>Uplinks</span>
                                                                    </div>
                                                                    {!state.collapsedGroups.has(`uplink-${d.id}`) &&
                                                                        Array.from({ length: d.uplinkCount }).map((_, i) => {
                                                                            const bIdx = `u-${i}`;
                                                                            const isDuplex = d.portConfigs?.[bIdx] === 'duplex';
                                                                            if (isDuplex) {
                                                                                return (
                                                                                    <div
                                                                                        key={`u${i}`}
                                                                                        className="ml-2 pl-2 border-l-2 border-sky-400 my-1"
                                                                                    >
                                                                                        <PortRow
                                                                                            targetItem={d}
                                                                                            basePortIndex={bIdx}
                                                                                            portIndex={`${bIdx}-TX`}
                                                                                            side="A"
                                                                                            overrideLabel={`Uplink ${i + 1} (TX)`}
                                                                                            {...portRowProps}
                                                                                        />
                                                                                        <PortRow
                                                                                            targetItem={d}
                                                                                            basePortIndex={bIdx}
                                                                                            portIndex={`${bIdx}-RX`}
                                                                                            side="A"
                                                                                            overrideLabel={`Uplink ${i + 1} (RX)`}
                                                                                            {...portRowProps}
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <PortRow
                                                                                    key={`u${i}`}
                                                                                    targetItem={d}
                                                                                    basePortIndex={bIdx}
                                                                                    portIndex={bIdx}
                                                                                    side="A"
                                                                                    overrideLabel={`Uplink ${i + 1}`}
                                                                                    {...portRowProps}
                                                                                />
                                                                            );
                                                                        })}
                                                                </div>
                                                            )}

                                                            {d.interfaces?.map((iface, idx) => {
                                                                const ifaceId = `iface-${d.id}-${idx}`;
                                                                const isIfaceCollapsed = state.collapsedGroups.has(ifaceId);
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="rounded-lg border border-[var(--ds-border-default)] overflow-hidden"
                                                                    >
                                                                        <div
                                                                            className="px-3 py-2 bg-[var(--ds-surface-subtle)] text-[var(--ds-text-primary)] text-xs font-bold flex items-center justify-between cursor-pointer select-none"
                                                                            onClick={() => state.toggleCollapse(ifaceId)}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                {isIfaceCollapsed ? (
                                                                                    <ChevronRight size={12} />
                                                                                ) : (
                                                                                    <ChevronDown size={12} />
                                                                                )}
                                                                                <span>{iface.name}</span>
                                                                            </div>
                                                                            <div
                                                                                className="flex items-center gap-3"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => renameInterface(d.id, idx, iface.name)}
                                                                                    className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text-accent)]"
                                                                                    title="Renomear"
                                                                                >
                                                                                    <Edit3 size={12} />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeInterface(d.id, idx)}
                                                                                    className="text-[var(--ds-error-text)] hover:opacity-80"
                                                                                    title="Remover"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {!isIfaceCollapsed &&
                                                                            Array.from({ length: iface.portCount }).map((_, p) => {
                                                                                const bIdx = `i-${idx}-p-${p}`;
                                                                                const isDuplex = d.portConfigs?.[bIdx] === 'duplex';
                                                                                if (isDuplex) {
                                                                                    return (
                                                                                        <div
                                                                                            key={p}
                                                                                            className="ml-2 pl-2 border-l-2 border-sky-400 my-1"
                                                                                        >
                                                                                            <PortRow
                                                                                                targetItem={d}
                                                                                                basePortIndex={bIdx}
                                                                                                portIndex={`${bIdx}-TX`}
                                                                                                side="A"
                                                                                                overrideLabel={`PON ${p} (TX)`}
                                                                                                {...portRowProps}
                                                                                            />
                                                                                            <PortRow
                                                                                                targetItem={d}
                                                                                                basePortIndex={bIdx}
                                                                                                portIndex={`${bIdx}-RX`}
                                                                                                side="A"
                                                                                                overrideLabel={`PON ${p} (RX)`}
                                                                                                {...portRowProps}
                                                                                            />
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return (
                                                                                    <PortRow
                                                                                        key={p}
                                                                                        targetItem={d}
                                                                                        basePortIndex={bIdx}
                                                                                        portIndex={bIdx}
                                                                                        side="A"
                                                                                        overrideLabel={`PON ${p}`}
                                                                                        {...portRowProps}
                                                                                    />
                                                                                );
                                                                            })}
                                                                    </div>
                                                                );
                                                            })}

                                                            <button
                                                                type="button"
                                                                onClick={() => addInterface(d.id)}
                                                                className="w-full py-2 rounded-lg border border-dashed border-[var(--ds-border-input)] hover:border-[var(--ds-brand-primary)] text-xs font-bold text-[var(--ds-text-accent)] hover:bg-[var(--ds-brand-soft-bg)] transition-colors"
                                                            >
                                                                + Placa OLT
                                                            </button>
                                                        </div>
                                                    ) : d.type === 'DIO' ? (
                                                        <div className="space-y-2">
                                                            {d.cards?.map((card, cIdx) => {
                                                                const cardId = `dio-${d.id}-card-${cIdx}`;
                                                                const isCardCollapsed = state.collapsedGroups.has(cardId);
                                                                return (
                                                                    <div
                                                                        key={cIdx}
                                                                        className="rounded-lg border border-[var(--ds-border-default)] overflow-hidden"
                                                                    >
                                                                        <div
                                                                            className="px-3 py-2 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-between cursor-pointer select-none"
                                                                            onClick={() => state.toggleCollapse(cardId)}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                {isCardCollapsed ? (
                                                                                    <ChevronRight size={12} />
                                                                                ) : (
                                                                                    <ChevronDown size={12} />
                                                                                )}
                                                                                <span>{card.name}</span>
                                                                            </div>
                                                                            <div
                                                                                className="flex items-center gap-3"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => renameDioCard(d.id, cIdx, card.name)}
                                                                                    className="hover:opacity-80"
                                                                                    title="Renomear"
                                                                                >
                                                                                    <Edit3 size={12} />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeDioCard(d.id, cIdx)}
                                                                                    className="text-[var(--ds-error-text)] hover:opacity-80"
                                                                                    title="Remover"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {!isCardCollapsed && (
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--ds-border-default)]">
                                                                                <div>
                                                                                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-[var(--ds-surface-subtle)] text-[var(--ds-text-muted)] text-center">
                                                                                        FRENTE
                                                                                    </div>
                                                                                    {Array.from({ length: card.portCount }).map((_, p) => (
                                                                                        <PortRow
                                                                                            key={p}
                                                                                            targetItem={d}
                                                                                            portIndex={`c-${cIdx}-p-${p}`}
                                                                                            side="FRONT"
                                                                                            isPatchPanel={true}
                                                                                            overrideLabel={`P${p + 1}`}
                                                                                            {...portRowProps}
                                                                                        />
                                                                                    ))}
                                                                                </div>
                                                                                <div>
                                                                                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-[var(--ds-surface-subtle)] text-[var(--ds-text-muted)] text-center">
                                                                                        TRÁS
                                                                                    </div>
                                                                                    {Array.from({ length: card.portCount }).map((_, p) => (
                                                                                        <PortRow
                                                                                            key={p}
                                                                                            targetItem={d}
                                                                                            portIndex={`c-${cIdx}-p-${p}`}
                                                                                            side="BACK"
                                                                                            isPatchPanel={true}
                                                                                            overrideLabel={`P${p + 1}`}
                                                                                            {...portRowProps}
                                                                                        />
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}

                                                            {(!d.cards || d.cards.length === 0) && d.ports > 0 && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--ds-border-default)] rounded-lg border border-[var(--ds-border-default)] overflow-hidden">
                                                                    <div>
                                                                        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-[var(--ds-surface-subtle)] text-[var(--ds-text-muted)] text-center">
                                                                            FRENTE
                                                                        </div>
                                                                        {Array.from({ length: d.ports }).map((_, i) => (
                                                                            <PortRow
                                                                                key={i}
                                                                                targetItem={d}
                                                                                portIndex={i}
                                                                                side="FRONT"
                                                                                isPatchPanel={true}
                                                                                {...portRowProps}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <div>
                                                                        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-[var(--ds-surface-subtle)] text-[var(--ds-text-muted)] text-center">
                                                                            TRÁS
                                                                        </div>
                                                                        {Array.from({ length: d.ports }).map((_, i) => (
                                                                            <PortRow
                                                                                key={i}
                                                                                targetItem={d}
                                                                                portIndex={i}
                                                                                side="BACK"
                                                                                {...portRowProps}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => addDioCard(d.id)}
                                                                className="w-full py-2 rounded-lg border border-dashed border-[var(--ds-border-input)] hover:border-purple-400 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors"
                                                            >
                                                                + Card DIO
                                                            </button>
                                                        </div>
                                                    ) : d.type === 'POE' ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--ds-border-default)] rounded-lg border border-[var(--ds-border-default)] overflow-hidden">
                                                            <div>
                                                                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-[var(--ds-surface-subtle)] text-[var(--ds-text-muted)] text-center">
                                                                    POE
                                                                </div>
                                                                {Array.from({ length: d.ports }).map((_, p) => (
                                                                    <PortRow
                                                                        key={p}
                                                                        targetItem={d}
                                                                        portIndex={p}
                                                                        side="POE"
                                                                        isPatchPanel={true}
                                                                        overrideLabel={`POE ${p + 1}`}
                                                                        {...portRowProps}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <div>
                                                                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-[var(--ds-surface-subtle)] text-[var(--ds-text-muted)] text-center">
                                                                    LAN
                                                                </div>
                                                                {Array.from({ length: d.ports }).map((_, p) => (
                                                                    <PortRow
                                                                        key={p}
                                                                        targetItem={d}
                                                                        portIndex={p}
                                                                        side="LAN"
                                                                        isPatchPanel={true}
                                                                        overrideLabel={`LAN ${p + 1}`}
                                                                        {...portRowProps}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            {d.type === 'SPLITTER' && (
                                                                <PortRow
                                                                    targetItem={d}
                                                                    portIndex={0}
                                                                    side="A"
                                                                    isInput={true}
                                                                    overrideLabel="ENTRADA"
                                                                    {...portRowProps}
                                                                />
                                                            )}
                                                            {Array.from({
                                                                length: d.type === 'SPLITTER' ? d.ports - 1 : d.ports,
                                                            }).map((_, i) => {
                                                                const pIndex = d.type === 'SPLITTER' ? i + 1 : i;
                                                                const isDuplex =
                                                                    d.portConfigs?.[pIndex] === 'duplex' && d.type !== 'SPLITTER';

                                                                if (isDuplex) {
                                                                    return (
                                                                        <div
                                                                            key={i}
                                                                            className="ml-2 pl-2 border-l-2 border-sky-400 my-1"
                                                                        >
                                                                            <PortRow
                                                                                targetItem={d}
                                                                                basePortIndex={pIndex}
                                                                                portIndex={`${pIndex}-TX`}
                                                                                side="A"
                                                                                overrideLabel={`Porta ${pIndex + 1} (TX)`}
                                                                                {...portRowProps}
                                                                            />
                                                                            <PortRow
                                                                                targetItem={d}
                                                                                basePortIndex={pIndex}
                                                                                portIndex={`${pIndex}-RX`}
                                                                                side="A"
                                                                                overrideLabel={`Porta ${pIndex + 1} (RX)`}
                                                                                {...portRowProps}
                                                                            />
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <PortRow
                                                                        key={i}
                                                                        targetItem={d}
                                                                        basePortIndex={pIndex}
                                                                        portIndex={pIndex}
                                                                        side="A"
                                                                        isInput={false}
                                                                        overrideLabel={
                                                                            d.type === 'SPLITTER' ? `Saída ${pIndex}` : null
                                                                        }
                                                                        {...portRowProps}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </CollapsibleGroup>
                                        ))}
                                    </div>
                                )}

                                <ConnectedCablesSection
                                    nodeId={item.id}
                                    cables={cables}
                                    collapsedGroups={state.collapsedGroups}
                                    toggleCollapse={state.toggleCollapse}
                                    pendingConn={pendingConn}
                                    onDragStart={state.onDragStart}
                                    onDrop={state.onDrop}
                                    renameDevice={state.renameDevice}
                                    onDelete={onDelete}
                                    portRowProps={portRowProps}
                                />
                            </>
                        )}
                    </div>
                </div>
            ) : (
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
                    onFullscreenChange={state.handleFullscreenChange}
                    onConfirmRequest={onConfirmRequest}
                />
            )}

            <DetailAuxModals
                signalModalConfig={state.signalModalConfig}
                renameModal={state.renameModal}
                setRenameModal={state.setRenameModal}
            />
        </div>
    );
};

export default TowerDetailPanel;
