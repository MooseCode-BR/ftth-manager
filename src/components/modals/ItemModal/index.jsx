/*
 * Modal para criação e edição de itens.
 * Agora com suporte ao Sistema de Tags.
*/

import './styles.css';
import React, { useState, useEffect } from 'react';
import { Trash2, Settings2, Layers, PenLine, Tag, X, ChevronDown } from 'lucide-react';

import { ITEM_TYPES, OBJECT_ICONS } from '../../../config/constants';

const ItemModal = ({
    mode = 'create',
    config,
    standards,
    nodeColorSettings = {},
    title,
    initialValue,
    initialColor,
    initialIcon,
    initialType,
    initialPorts = 0,
    initialUplinks = 4,
    initialInterfaces,
    showColorPicker,
    favoriteColors = [],
    availableTags = [], // Novidade: Tags existentes no projeto
    initialTags = [],   // Novidade: Tags que o item já possui (edição)
    onConfirm,
    onCancel,
}) => {
    const [mountTime] = useState(Date.now());

    const isCreate = mode === 'create';
    const isEdit = !isCreate;

    const [type, setType] = useState(isCreate ? config?.itemType : (initialType || null));
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

    const [name, setName] = useState(isCreate ? (config?.defaultName || '') : (initialValue || ''));
    const [ports, setPorts] = useState(isCreate ? (config?.defaultPorts || 0) : (initialPorts || 0));
    const [uplinks, setUplinks] = useState(isCreate ? 4 : (initialUplinks || 4));

    const [manualInterfaces, setManualInterfaces] = useState(() => {
        if (initialInterfaces && initialInterfaces.length > 0) return initialInterfaces;
        return isDIO ? [{ name: 'Card 1', portCount: 12 }] : [{ name: 'Slot 0', portCount: 16 }];
    });

    const [color, setColor] = useState(() => {
        if (isCreate) {
            return (nodeColorSettings && config?.itemType && nodeColorSettings[config.itemType])
                || ITEM_TYPES[config?.itemType]?.defaultColor || '#000000';
        }
        return initialColor || '#334155';
    });

    const [cableColor, setCableColor] = useState(isCreate ? '#334155' : (initialColor || '#334155'));
    const [selectedIcon, setSelectedIcon] = useState(isCreate ? 'MapPin' : (initialIcon || 'MapPin'));

    // --- ESTADOS DO SISTEMA DE TAGS ---
    const [itemTags, setItemTags] = useState(initialTags || []);
    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);

    useEffect(() => {
        if (isCable && standards && standards[ports]) setCableColor(standards[ports]);
    }, [ports, isCable, standards]);

    // --- HANDLERS DE TAGS ---
    const handleAddTag = (tagText) => {
        const val = tagText.trim().toUpperCase(); // Sempre maiúsculo
        if (!val) return;

        // Evitar duplicatas no item atual
        if (itemTags.some(t => t.name === val)) {
            setTagInput('');
            setShowTagSuggestions(false);
            return;
        }

        // Verifica se já existe no projeto
        const existing = availableTags.find(t => t.name === val);
        if (existing) {
            setItemTags([...itemTags, { id: existing.id, name: existing.name }]);
        } else {
            // Marca como nova (isNew) para o App.jsx salvá-la no banco
            setItemTags([...itemTags, { id: `temp_${Date.now()}`, name: val, isNew: true }]);
        }

        setTagInput('');
        setShowTagSuggestions(false);
    };

    const removeTag = (idToRemove) => {
        setItemTags(itemTags.filter(t => t.id !== idToRemove));
    };

    const addInterfaceSlot = () => {
        const nextIdx = manualInterfaces.length;
        setManualInterfaces([...manualInterfaces, { name: isDIO ? `Card ${nextIdx + 1}` : `Slot ${nextIdx}`, portCount: isDIO ? 12 : 16 }]);
    };
    const updateInterfaceSlot = (index, field, value) => {
        const newList = [...manualInterfaces];
        newList[index] = { ...newList[index], [field]: value };
        setManualInterfaces(newList);
    };
    const removeInterfaceSlot = (index) => setManualInterfaces(manualInterfaces.filter((_, i) => i !== index));

    const handleConfirm = () => {
        if (isCreate) {
            onConfirm({
                name, ports, uplinks, manualInterfaces, cableColor,
                nodeColor: color, iconType: isObject ? selectedIcon : null, tags: itemTags
            });
        } else {
            const resolvedColor = isCable ? cableColor : color;
            const iconToSave = isObject ? selectedIcon : null;
            // Passamos a lista de tags no final
            onConfirm(name, resolvedColor, iconToSave, type, ports, uplinks, manualInterfaces, itemTags);
        }
    };

    const renderHeader = () => (
        <h3 className="item-modal-header">
            {isEdit ? <PenLine size={18} className="item-modal-header-icon" /> : (activeType ? React.createElement(ITEM_TYPES[activeType]?.icon || Settings2, { size: 18 }) : <Settings2 size={18} />)}
            {isEdit ? (title || 'Editar Item') : (isCable ? 'Configurar Cabo' : isSplitter ? 'Configurar Splitter' : `Novo ${ITEM_TYPES[activeType]?.label?.split(' ')[0] || 'Item'}`)}
        </h3>
    );

    // --- LÓGICA DE FILTRAGEM BLINDADA PARA O DROPDOWN ---
    // --- LÓGICA DE FILTRAGEM BLINDADA PARA O DROPDOWN (mantida da etapa anterior) ---
    const normalizedInput = tagInput.trim().toUpperCase();
    const filteredSuggestions = availableTags.filter(t => { /* ... código mantido ... */
        if (!t || !t.name) return false;
        const tagName = t.name.toUpperCase();
        const matchesSearch = tagName.includes(normalizedInput);
        const isNotAddedYet = !itemTags.some(ext => (ext.name || '').toUpperCase() === tagName);
        return matchesSearch && isNotAddedYet;
    });
    const exactMatchExists = availableTags.some(t => (t.name || '').toUpperCase() === normalizedInput);


    // >>> LOGS DE DEPURAÇÃO DO MODAL <<<
    useEffect(() => {
        console.log("=== DEBUG ITEM MODAL (Recepção de Dados) ===");
        console.log("Total de Tags Disponíveis recebidas do App:", availableTags.length);
        if (availableTags.length > 0) {
            console.log("Amostra da primeira tag recebida:", availableTags[0]);
        } else {
            console.warn("ALERTA: O App enviou ZERO tags disponíveis. O dropdown ficará vazio.");
        }
        console.log("============================================");
    }, [availableTags]);

    useEffect(() => {
        if (showTagSuggestions) {
            console.log("[DEBUG DROPDOWN ABERTO] Input digitado:", `"${tagInput}"`);
            console.log("[DEBUG DROPDOWN ABERTO] Sugestões que passaram no filtro:", filteredSuggestions);
        }
    }, [showTagSuggestions, tagInput, filteredSuggestions]);
    // ----------------------------------

    return (
        <div className="item-modal-overlay" onClick={() => { if (Date.now() - mountTime > 250) onCancel(); }}>
            <div className="item-modal-card" onClick={(e) => e.stopPropagation()}>
                {renderHeader()}
                <div className="item-modal-body">
                    {/* DROPDOWN DE TIPO */}
                    {isEdit && editCanChangeType && (
                        <div>
                            <label className="input-label text-gray-900 dark:text-gray-400">Tipo do Equipamento</label>
                            <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
                                {Object.entries(ITEM_TYPES).filter(([, cfg]) => cfg.category === 'NODE').map(([key, cfg]) => (
                                    <option key={key} value={key}>{cfg.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* IDENTIFICAÇÃO */}
                    <div>
                        <label className="input-label text-gray-900 dark:text-gray-400">Identificação</label>
                        <input autoFocus className="input-field" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleConfirm()} />
                    </div>

                    {/* --- SISTEMA DE TAGS --- */}
                    {(isNode || isCable || isObject) && (
                        <div className="mt-2">
                            <label className="input-label text-gray-900 dark:text-gray-400 flex items-center gap-1">
                                <Tag size={12} /> Tags
                            </label>

                            {/* Tags Selecionadas */}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {itemTags.map(t => (
                                    <span key={t.id} className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 dark:bg-blue-900/40 dark:text-blue-300">
                                        {t.name}
                                        <button type="button" onClick={() => removeTag(t.id)} className="hover:text-red-500"><X size={12} /></button>
                                    </span>
                                ))}
                            </div>

                            {/* Input e Sugestões */}
                            <div className="relative">
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        className="input-field pr-8"
                                        placeholder="Selecione ou digite para criar..."
                                        value={tagInput}
                                        onChange={e => {
                                            setTagInput(e.target.value.toUpperCase());
                                            setShowTagSuggestions(true);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTag(tagInput);
                                            }
                                        }}
                                        onClick={() => setShowTagSuggestions(true)}
                                        onFocus={() => setShowTagSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                        onMouseDown={(e) => {
                                            // Usar onMouseDown previne que o onBlur do input feche o menu antes de abrir
                                            e.preventDefault();
                                            setShowTagSuggestions(!showTagSuggestions);
                                        }}
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                </div>

                                {/* Menu de Sugestões (Aparece ao focar, clicar ou digitar) */}
                                {showTagSuggestions && (
                                    <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto mt-1">

                                        {/* Lista as tags existentes permitidas */}
                                        {filteredSuggestions.map(t => (
                                            <div key={t.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-xs text-gray-800 dark:text-gray-200 font-medium" onMouseDown={() => handleAddTag(t.name)}>
                                                {t.name.toUpperCase()}
                                            </div>
                                        ))}

                                        {/* Mensagem quando não há tags para sugerir e não há nada digitado */}
                                        {filteredSuggestions.length === 0 && !normalizedInput && (
                                            <div className="px-3 py-2 text-xs text-gray-500 italic dark:text-gray-400">
                                                Nenhuma tag disponível no projeto.
                                            </div>
                                        )}

                                        {/* Opção "Criar Nova" quando o input tem texto que não existe exatamente nas opções */}
                                        {normalizedInput && !exactMatchExists && (
                                            <div className="px-3 py-2 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/30 cursor-pointer text-xs text-blue-600 dark:text-blue-400 font-bold border-t border-gray-100 dark:border-gray-700" onMouseDown={() => handleAddTag(normalizedInput)}>
                                                + Criar nova tag: "{normalizedInput}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* COR DO NÓ */}
                    {isNode && (
                        <div className="color-settings-group mt-2">
                            <label className="input-label text-gray-900 dark:text-gray-400">Cor</label>
                            {/* ... Restante original da cor */}
                            <div className="manual-color-wrapper">
                                <input type="color" className="color-input-picker" value={color} onChange={e => setColor(e.target.value)} />
                                <input type="text" value={color} onChange={e => setColor(e.target.value)} className="color-input-text" />
                            </div>
                        </div>
                    )}

                    {/* FIBRAS + COR DO CABO */}
                    {isCable && (
                        <div className="flex gap-4 mt-2">
                            <div className="flex-1">
                                <label className="input-label text-gray-900 dark:text-gray-400">Fibras</label>
                                <input type="number" className="input-field" value={ports} onChange={e => setPorts(e.target.value)} />
                            </div>
                            <div className="flex-1 color-settings-group">
                                <label className="input-label text-gray-900 dark:text-gray-400">Cor</label>
                                <div className="manual-color-wrapper">
                                    <input type="color" className="color-input-picker" value={cableColor} onChange={e => setCableColor(e.target.value)} />
                                    <input type="text" value={cableColor} onChange={e => setCableColor(e.target.value)} className="color-input-text" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* INTERFACES OLT / DIO e Restante... (mantido original compacto) */}
                    {(isOLT || isDIO) && (
                        <div className={`dynamic-interface-box mt-2 ${isOLT ? 'box-variant-olt' : 'box-variant-dio'}`}>
                            <label className={`box-title ${isOLT ? 'text-olt' : 'text-dio'}`}>
                                <Layers size={12} /> {isOLT ? 'Interfaces PON' : 'Bandejas/Cards'}
                            </label>
                            <div className="space-y-2">
                                {manualInterfaces.map((iface, idx) => (
                                    <div key={idx} className="interface-row">
                                        <div className="flex-1"><input className="input-field-mini" value={iface.name} onChange={e => updateInterfaceSlot(idx, 'name', e.target.value)} /></div>
                                        <div className="w-20"><input type="number" className="input-field-mini" value={iface.portCount} onChange={e => updateInterfaceSlot(idx, 'portCount', e.target.value)} /></div>
                                        <button onClick={() => removeInterfaceSlot(idx)} className="btn-delete-slot"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addInterfaceSlot} className={`btn-add-slot ${isOLT ? 'btn-add-olt' : 'btn-add-dio'}`}>+ Adicionar {isOLT ? 'Placa' : 'Card'}</button>
                        </div>
                    )}
                    {isOLT && <div className="mt-2"><label className="input-label text-gray-900 dark:text-gray-400">Uplinks/Auxiliares</label><input type="number" className="input-field" value={uplinks} onChange={e => setUplinks(e.target.value)} /></div>}

                    {isSplitter && <div className="mt-2"><label className="input-label text-gray-900 dark:text-gray-400">Ratio</label><select className="input-field" value={ports} onChange={e => setPorts(e.target.value)}><option value="2">1:2</option><option value="4">1:4</option><option value="8">1:8</option><option value="16">1:16</option><option value="32">1:32</option><option value="64">1:64</option></select></div>}

                    {isObject && (
                        <div className="mt-2">
                            <label className="input-label text-gray-900 dark:text-gray-400">Ícone do Objeto</label>
                            <div className="grid grid-cols-5 gap-2 mt-1 mb-3">
                                {OBJECT_ICONS.map((opt) => (
                                    <button key={opt.id} type="button" onClick={() => setSelectedIcon(opt.id)} className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${selectedIcon === opt.id ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'}`} title={opt.label}>{React.createElement(opt.icon, { size: 18 })}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!isPassiveContainer && !isCable && !isSplitter && !isOLT && !isDIO && !isObject && !isNode && (
                        <div className="mt-2"><label className="input-label text-gray-900 dark:text-gray-400">Portas</label><input type="number" className="input-field" value={ports} onChange={e => setPorts(e.target.value)} /></div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onCancel} className="btn-cancel text-gray-900 dark:text-gray-400">Cancelar</button>
                    <button onClick={handleConfirm} className="btn-confirm">{isCreate ? 'Confirmar' : 'Salvar'}</button>
                </div>
            </div>
        </div>
    );
};

export default ItemModal;