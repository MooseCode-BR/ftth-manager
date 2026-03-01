// ItemModal – Componente unificado de criação e edição de itens
// mode="create" → cria novo item (comportamento do antigo CreationModal)
// mode="edit"   → edita item existente, com os mesmos campos da criação

import './styles.css';
import React, { useState, useEffect } from 'react';
import { Trash2, Settings2, Layers, PenLine } from 'lucide-react';

import { ITEM_TYPES, OBJECT_ICONS } from '../../constants';
import TagSelector from '../TagSelector';


// =============================================================================

const ItemModal = ({
    // Modo de operação
    mode = 'create', // "create" | "edit"

    // --- Props para modo CREATE ---
    config,   // { itemType, mode: 'NODE'|'CABLE'|'SPLITTER', defaultName, defaultPorts }
    standards,
    nodeColorSettings = {},

    // --- Props para modo EDIT ---
    title,
    initialValue,
    initialColor,
    initialTagIds = [],
    initialIcon,
    initialType,
    initialPorts = 0,
    initialUplinks = 4,
    initialInterfaces, // interfaces (OLT) ou cards (DIO) existentes
    showColorPicker,   // mantido para compat – agora exibido sempre que relevante

    // --- Props compartilhadas ---
    favoriteColors = [],
    availableTags = [],
    onManageTags,
    onConfirm,
    onCancel,
}) => {

    // =========================================================================
    // Derivar contexto do modo e do tipo
    // =========================================================================

    const isCreate = mode === 'create';
    const isEdit = !isCreate;

    // Tipo fixo na criação; começa em initialType na edição (pode mudar via dropdown)
    const [type, setType] = useState(
        isCreate ? config?.itemType : (initialType || null)
    );

    // Tipo "resolvido" em cada render (criação = config.itemType, edição = estado type)
    const activeType = isCreate ? config?.itemType : type;

    const itemConfig = ITEM_TYPES[activeType] || {};

    const isOLT = activeType === 'OLT';
    const isDIO = activeType === 'DIO';
    const isCable = isCreate ? config?.mode === 'CABLE' : (activeType === 'CABLE');
    const isSplitter = isCreate ? config?.mode === 'SPLITTER' : (activeType === 'SPLITTER');
    const isNode = isCreate ? config?.mode === 'NODE' : (itemConfig.category === 'NODE');
    const isPassiveContainer = isNode && ['CEO', 'CTO', 'POP', 'TOWER', 'POST'].includes(activeType);
    const isObject = activeType === 'OBJECT';
    const editCanChangeType = isEdit && activeType && ['POP', 'CEO', 'CTO', 'TOWER', 'POST', 'OBJECT'].includes(activeType);

    // =========================================================================
    // Estados
    // =========================================================================

    const [name, setName] = useState(
        isCreate ? (isOLT ? '' : (config?.defaultName || '')) : (initialValue || '')
    );

    const [ports, setPorts] = useState(
        isCreate ? (config?.defaultPorts || 0) : (initialPorts || 0)
    );

    const [uplinks, setUplinks] = useState(
        isCreate ? 4 : (initialUplinks || 4)
    );

    // Interfaces (OLT = Slots/Placas, DIO = Cards)
    const [manualInterfaces, setManualInterfaces] = useState(() => {
        if (initialInterfaces && initialInterfaces.length > 0) return initialInterfaces;
        return isDIO
            ? [{ name: 'Card 1', portCount: 12 }]
            : [{ name: 'Slot 0', portCount: 16 }];
    });

    const [selectedTags, setSelectedTags] = useState(
        isCreate ? [] : (initialTagIds || [])
    );

    // Cor unificada (usada tanto para nó quanto para cabo na edição)
    const [color, setColor] = useState(() => {
        if (isCreate) {
            return (nodeColorSettings && config?.itemType && nodeColorSettings[config.itemType])
                || ITEM_TYPES[config?.itemType]?.defaultColor
                || '#000000';
        }
        return initialColor || '#334155';
    });

    // Cor do cabo: na criação começa em slate, em edição inicializa da cor do item
    const [cableColor, setCableColor] = useState(
        isCreate ? '#334155' : (initialColor || '#334155')
    );

    const [selectedIcon, setSelectedIcon] = useState(
        isCreate ? 'MapPin' : (initialIcon || 'MapPin')
    );

    // =========================================================================
    // Efeitos
    // =========================================================================

    // Cor auto do cabo baseada nos padrões (qualquer modo - criação ou edição)
    useEffect(() => {
        if (isCable && standards && standards[ports]) {
            setCableColor(standards[ports]);
        }
    }, [ports, isCable, standards]);

    // =========================================================================
    // Handlers de interfaces (OLT/DIO)
    // =========================================================================

    const addInterfaceSlot = () => {
        const nextIdx = manualInterfaces.length;
        const defaultName = isDIO ? `Card ${nextIdx + 1}` : `Slot ${nextIdx}`;
        const defaultPorts = isDIO ? 12 : 16;
        setManualInterfaces([...manualInterfaces, { name: defaultName, portCount: defaultPorts }]);
    };

    const updateInterfaceSlot = (index, field, value) => {
        const newList = [...manualInterfaces];
        newList[index] = { ...newList[index], [field]: value };
        setManualInterfaces(newList);
    };

    const removeInterfaceSlot = (index) => {
        setManualInterfaces(manualInterfaces.filter((_, i) => i !== index));
    };

    // =========================================================================
    // Confirm
    // =========================================================================

    const handleConfirm = () => {
        if (isCreate) {
            onConfirm({
                name,
                ports,
                uplinks,
                manualInterfaces,
                cableColor,
                nodeColor: color,
                tagIds: selectedTags,
                iconType: isObject ? selectedIcon : null,
            });
        } else {
            // Edição: mesma assinatura posicional do antigo EditModal
            // + args extras: ports, uplinks, manualInterfaces
            const resolvedColor = isCable ? cableColor : color;
            const iconToSave = isObject ? selectedIcon : null;
            onConfirm(name, resolvedColor, selectedTags, iconToSave, type, ports, uplinks, manualInterfaces);
        }
    };

    // =========================================================================
    // Header
    // =========================================================================

    const renderHeader = () => {
        if (isEdit) {
            return (
                <h3 className="item-modal-header">
                    <PenLine size={18} className="item-modal-header-icon" />
                    {title || 'Editar Item'}
                </h3>
            );
        }
        return (
            <h3 className="item-modal-header">
                {activeType
                    ? React.createElement(ITEM_TYPES[activeType]?.icon || Settings2, { size: 18 })
                    : <Settings2 size={18} />}
                {isCable
                    ? 'Configurar Cabo'
                    : isSplitter
                        ? 'Configurar Splitter'
                        : `Novo ${ITEM_TYPES[activeType]?.label?.split(' ')[0] || 'Item'}`}
            </h3>
        );
    };

    // =========================================================================
    // Render
    // =========================================================================

    return (
        <div className="item-modal-overlay">
            <div className="item-modal-card">

                {renderHeader()}

                <div className="item-modal-body">

                    {/* ── DROPDOWN DE TIPO (edição – nós passivos/OBJECT) ── */}
                    {isEdit && editCanChangeType && (
                        <div>
                            <label className="input-label text-gray-900 dark:text-gray-400">Tipo do Equipamento</label>
                            <select
                                className="input-field"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            >
                                {Object.entries(ITEM_TYPES)
                                    .filter(([, cfg]) => cfg.category === 'NODE')
                                    .map(([key, cfg]) => (
                                        <option key={key} value={key}>{cfg.label}</option>
                                    ))
                                }
                            </select>
                        </div>
                    )}

                    {/* ── IDENTIFICAÇÃO / NOME ── */}
                    <div>
                        <label className="input-label text-gray-900 dark:text-gray-400">Identificação</label>
                        <input
                            autoFocus
                            className="input-field"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                        />
                    </div>

                    {/* ── COR DO NÓ (qualquer modo) ── */}
                    {isNode && (
                        <div className="color-settings-group">
                            <label className="input-label text-gray-900 dark:text-gray-400">Cor</label>

                            {/* Botão cor padrão */}
                            {nodeColorSettings && activeType && nodeColorSettings[activeType] && (
                                <div className="mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setColor(nodeColorSettings[activeType])}
                                        className="btn-default-color"
                                    >
                                        <div
                                            className="w-6 h-6 rounded border border-gray-300"
                                            style={{ backgroundColor: nodeColorSettings[activeType] }}
                                        />
                                        <span className="text-xs dark:text-gray-300">Usar cor padrão</span>
                                    </button>
                                </div>
                            )}

                            {/* Cores favoritas */}
                            {favoriteColors && favoriteColors.length > 0 && (
                                <div className="mb-2">
                                    <p className="input-label text-gray-900 dark:text-gray-400">Cores favoritas:</p>
                                    <div className="color-grid">
                                        {favoriteColors.map((favColor, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setColor(favColor)}
                                                className="color-swatch-btn"
                                                style={{ backgroundColor: favColor }}
                                                title={favColor}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="manual-color-wrapper">
                                <input
                                    type="color"
                                    className="color-input-picker"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                />
                                <input
                                    type="text"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                    className="color-input-text"
                                />
                            </div>
                        </div>
                    )}

                    {/* ── FIBRAS + COR DO CABO ── */}
                    {isCable && (
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="input-label text-gray-900 dark:text-gray-400">Fibras</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={ports}
                                    onChange={e => setPorts(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 color-settings-group">
                                <label className="input-label text-gray-900 dark:text-gray-400">Cor</label>

                                {/* Botão cor padrão (Cabo) */}
                                <div className="mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setCableColor((standards && standards[ports]) || '#334155')}
                                        className="btn-default-color"
                                    >
                                        <div
                                            className="w-6 h-6 rounded border border-gray-300"
                                            style={{ backgroundColor: (standards && standards[ports]) || '#334155' }}
                                        />
                                        <span className="text-xs dark:text-gray-300">Usar cor padrão</span>
                                    </button>
                                </div>

                                {/* Cores favoritas */}
                                {favoriteColors && favoriteColors.length > 0 && (
                                    <div className="mb-2">
                                        <p className="sub-label">Cores favoritas:</p>
                                        <div className="color-grid">
                                            {favoriteColors.map((favColor, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setCableColor(favColor)}
                                                    className="color-swatch-btn"
                                                    style={{ backgroundColor: favColor }}
                                                    title={favColor}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="manual-color-wrapper">
                                    <input
                                        type="color"
                                        className="color-input-picker"
                                        value={cableColor}
                                        onChange={e => setCableColor(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        value={cableColor}
                                        onChange={e => setCableColor(e.target.value)}
                                        className="color-input-text"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── INTERFACES OLT / DIO ── */}
                    {(isOLT || isDIO) && (
                        <>
                            <div className={`dynamic-interface-box ${isOLT ? 'box-variant-olt' : 'box-variant-dio'}`}>
                                <label className={`box-title ${isOLT ? 'text-olt' : 'text-dio'}`}>
                                    <Layers size={12} /> {isOLT ? 'Interfaces PON' : 'Bandejas/Cards'}
                                </label>

                                <div className="space-y-2">
                                    {manualInterfaces.map((iface, idx) => (
                                        <div key={idx} className="interface-row">
                                            <div className="flex-1">
                                                <label className="input-label-mini text-gray-900 dark:text-gray-400">Nome</label>
                                                <input
                                                    className="input-field-mini"
                                                    value={iface.name}
                                                    onChange={e => updateInterfaceSlot(idx, 'name', e.target.value)}
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="input-label-mini text-gray-900 dark:text-gray-400">Portas</label>
                                                <input
                                                    type="number"
                                                    className="input-field-mini"
                                                    value={iface.portCount}
                                                    onChange={e => updateInterfaceSlot(idx, 'portCount', e.target.value)}
                                                />
                                            </div>
                                            <button onClick={() => removeInterfaceSlot(idx)} className="btn-delete-slot">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={addInterfaceSlot}
                                    className={`btn-add-slot ${isOLT ? 'btn-add-olt' : 'btn-add-dio'}`}
                                >
                                    + Adicionar {isOLT ? 'Placa' : 'Card'}
                                </button>
                            </div>

                            {isOLT && (
                                <div>
                                    <label className="input-label text-gray-900 dark:text-gray-400">Uplinks/Auxiliares</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={uplinks}
                                        onChange={e => setUplinks(e.target.value)}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* ── RATIO SPLITTER ── */}
                    {isSplitter && (
                        <div>
                            <label className="input-label text-gray-900 dark:text-gray-400">Ratio</label>
                            <select
                                className="input-field"
                                value={ports}
                                onChange={e => setPorts(e.target.value)}
                            >
                                <option value="2">1:2</option>
                                <option value="4">1:4</option>
                                <option value="8">1:8</option>
                                <option value="16">1:16</option>
                            </select>
                        </div>
                    )}

                    {/* ── ÍCONE DO OBJETO ── */}
                    {isObject && (
                        <div>
                            <label className="input-label text-gray-900 dark:text-gray-400">Ícone do Objeto</label>
                            <div className="grid grid-cols-5 gap-2 mt-1 mb-3">
                                {OBJECT_ICONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setSelectedIcon(opt.id)}
                                        className={`
                                            flex flex-col items-center justify-center p-2 rounded border transition-all
                                            ${selectedIcon === opt.id
                                                ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                                            }
                                        `}
                                        title={opt.label}
                                    >
                                        {React.createElement(opt.icon, { size: 18 })}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── PORTAS (devices simples: Switch, Router, POE, Camera) ── */}
                    {!isPassiveContainer && !isCable && !isSplitter && !isOLT && !isDIO && !isObject && !isNode && (
                        <div>
                            <label className="input-label text-gray-900 dark:text-gray-400">Portas</label>
                            <input
                                type="number"
                                className="input-field"
                                value={ports}
                                onChange={e => setPorts(e.target.value)}
                            />
                        </div>
                    )}

                    {/* ── TAGS ── */}
                    <TagSelector
                        availableTags={availableTags}
                        selectedTagIds={selectedTags}
                        onChange={setSelectedTags}
                        onManageTags={onManageTags}
                    />

                </div>

                {/* Rodapé */}
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onCancel} className="btn-cancel text-gray-900 dark:text-gray-400">Cancelar</button>
                    <button onClick={handleConfirm} className="btn-confirm">
                        {isCreate ? 'Confirmar' : 'Salvar'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ItemModal;
