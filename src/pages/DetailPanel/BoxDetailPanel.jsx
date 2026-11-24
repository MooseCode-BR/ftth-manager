/*
 * Painel de Detalhes dedicado a CAIXAS ÓPTICAS (CEO, CTO, etc.).
 * Focado em Splitters, Cabos conectados e Fusões (aba Equipamentos + aba Conexões).
 */

import React from 'react';
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

const BoxDetailPanel = (props) => {
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
        onTraceRequest,
    } = props;

    const state = useDetailPanelState(props);

    const splitters = items
        .filter((i) => i.parentId === item.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const cables = items
        .filter((i) => (i.fromNode === item.id || i.toNode === item.id) && i.type === 'CABLE')
        .sort((a, b) => (a.order || 0) - (b.order || 0));

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
                typeBadge={ITEM_TYPES[item.type]?.label || 'Caixa Óptica'}
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
                    {/* Toolbar dedicada à Caixa: adicionar Splitter */}
                    <div className="shrink-0 px-4 sm:px-6 py-3 bg-[var(--ds-surface-card)] border-b border-[var(--ds-border-default)] flex items-center justify-between gap-3">
                        <span className={DS.text.eyebrow}>
                            Splitters &amp; Fusões ({splitters.length})
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                openAddModal({
                                    mode: 'SPLITTER',
                                    itemType: 'SPLITTER',
                                    parentId: item.id,
                                    defaultName: `SPLITTER ${splitters.length + 1}`,
                                    defaultPorts: 8,
                                })
                            }
                            className={cn(DS.button.primary, 'py-2 px-4 text-xs')}
                        >
                            <SplitterIcon size={ICON_SIZES.sm} />
                            <span>+ Splitter</span>
                        </button>
                    </div>

                    {/* Área rolável de Splitters e Cabos */}
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
                        {splitters.length === 0 && cables.length === 0 ? (
                            <div className="py-12 text-center rounded-xl border border-dashed border-[var(--ds-border-default)] bg-[var(--ds-surface-card)]">
                                <p className={DS.text.secondary}>
                                    Nenhum splitter ou cabo conectado nesta caixa ainda.
                                </p>
                                <p className={cn(DS.text.muted, 'mt-1')}>
                                    Adicione um splitter acima ou conecte cabos pelo mapa.
                                </p>
                            </div>
                        ) : (
                            <>
                                {splitters.length > 0 && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {splitters.map((d, index) => (
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
                                                list={splitters}
                                                onEdit={() => state.renameDevice(d.id, d.name)}
                                                onDelete={onDelete}
                                                auditData={{
                                                    createdBy: d.createdBy,
                                                    createdAt: d.createdAt,
                                                    modifiedBy: d.modifiedBy,
                                                    modifiedAt: d.modifiedAt,
                                                }}
                                            >
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

export default BoxDetailPanel;
