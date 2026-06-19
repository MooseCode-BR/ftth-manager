import React, { useState, useEffect } from 'react';
import { Hexagon, Tag, X, ChevronDown, CircleDashed, Minus } from 'lucide-react';
import '../ItemModal/styles.css';

const AreaModal = ({
    isCircleMode = false,
    initialValue = '',
    initialColor = '#3b82f6',
    initialColorOpacity = 100,
    initialFillColor = '#3b82f6',
    initialFillOpacity = 40,
    initialRadius = 10,
    initialAngle = 90,
    initialDirection = 0,
    availableTags = [],
    initialTags = [],
    onConfirm,
    onCancel,
    onLiveUpdate,
    currentDirection
}) => {
    const [mountTime] = useState(Date.now());

    const [name, setName] = useState(initialValue);
    const [color, setColor] = useState(initialColor);
    const [colorOpacity, setColorOpacity] = useState(initialColorOpacity != null ? initialColorOpacity : 100);
    const [fillColor, setFillColor] = useState(initialFillColor);
    const [fillOpacity, setFillOpacity] = useState(initialFillOpacity != null ? initialFillOpacity : 100);

    const [radius, setRadius] = useState(initialRadius);
    const [angle, setAngle] = useState(initialAngle);
    const [direction, setDirection] = useState(initialDirection);

    const [itemTags, setItemTags] = useState(initialTags || []);
    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);

    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        if (currentDirection !== undefined && currentDirection !== direction) {
            setDirection(currentDirection);
        }
    }, [currentDirection]);

    useEffect(() => {
        if (onLiveUpdate) {
            onLiveUpdate({
                name,
                color,
                colorOpacity: parseInt(colorOpacity, 10),
                fillColor,
                fillOpacity: parseInt(fillOpacity, 10),
                radius: isCircleMode ? parseFloat(radius) : null,
                angle: isCircleMode ? parseFloat(angle) : null,
                direction: isCircleMode ? parseFloat(direction) : null,
                tags: itemTags
            });
        }
    }, [name, color, colorOpacity, fillColor, fillOpacity, radius, angle, direction, itemTags]);

    const handleAddTag = (tagText) => {
        const val = tagText.trim().toUpperCase();
        if (!val) return;
        if (itemTags.some(t => t.name === val)) {
            setTagInput('');
            setShowTagSuggestions(false);
            return;
        }
        const existing = availableTags.find(t => t.name === val);
        if (existing) {
            setItemTags([...itemTags, { id: existing.id, name: existing.name }]);
        } else {
            setItemTags([...itemTags, { id: `temp_${Date.now()}`, name: val, isNew: true }]);
        }
        setTagInput('');
        setShowTagSuggestions(false);
    };

    const removeTag = (idToRemove) => {
        setItemTags(itemTags.filter(t => t.id !== idToRemove));
    };

    const handleConfirm = () => {
        if (isCircleMode) {
            const numAngle = parseFloat(angle);
            const numRadius = parseFloat(radius);
            const numDirection = parseFloat(direction);

            if (isNaN(numAngle) || numAngle <= 0 || numAngle > 360) {
                alert("O ângulo deve ser maior que 0 e menor ou igual a 360.");
                return;
            }
            if (isNaN(numRadius) || numRadius <= 0) {
                alert("A distância (raio) deve ser maior que 0.");
                return;
            }
            if (isNaN(numDirection) || numDirection < 0 || numDirection > 360) {
                alert("A direção deve ser entre 0 e 360.");
                return;
            }
        }

        onConfirm({
            name,
            color,
            colorOpacity: parseInt(colorOpacity, 10),
            fillColor,
            fillOpacity: parseInt(fillOpacity, 10),
            radius: isCircleMode ? parseFloat(radius) : null,
            angle: isCircleMode ? parseFloat(angle) : null,
            direction: isCircleMode ? parseFloat(direction) : null,
            tags: itemTags
        });
    };

    const normalizedInput = tagInput.trim().toUpperCase();
    const filteredSuggestions = availableTags.filter(t => {
        if (!t || !t.name) return false;
        const tagName = t.name.toUpperCase();
        const matchesSearch = tagName.includes(normalizedInput);
        const isNotAddedYet = !itemTags.some(ext => (ext.name || '').toUpperCase() === tagName);
        return matchesSearch && isNotAddedYet;
    });
    const exactMatchExists = availableTags.some(t => (t.name || '').toUpperCase() === normalizedInput);

    if (isMinimized) {
        return (
            <div className="fixed top-24 right-4 md:right-10 z-[2000] pointer-events-auto">
                <button
                    onClick={() => setIsMinimized(false)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                    title="Restaurar Configuração da Área"
                >
                    {isCircleMode ? <CircleDashed size={24} /> : <Hexagon size={24} />}
                </button>
            </div>
        );
    }

    const overlayClass = "fixed inset-0 z-[2000] flex justify-end pointer-events-none";

    const cardClass = "pointer-events-auto w-full md:max-w-sm h-[100dvh] overflow-y-auto bg-white/90 dark:bg-black/80 backdrop-blur-xl shadow-2xl border-l border-white/60 dark:border-white/20 flex flex-col p-5 animate-in slide-in-from-right duration-200";

    return (
        <div className={overlayClass}>
            <div className={cardClass} onClick={(e) => e.stopPropagation()}>
                <h3 className="item-modal-header flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {isCircleMode ? <CircleDashed size={18} className="item-modal-header-icon" /> : <Hexagon size={18} className="item-modal-header-icon" />}
                        {isCircleMode ? 'Configurar Área Circular' : 'Configurar Área'}
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsMinimized(true)}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md text-gray-500 transition-colors"
                        title="Minimizar"
                    >
                        <Minus size={16} />
                    </button>
                </h3>
                <div className="item-modal-body">
                    <div>
                        <label className="input-label text-gray-900 dark:text-gray-400">Nome da Área</label>
                        <input autoFocus className="input-field" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleConfirm()} placeholder="Ex: Área de Cobertura POP 1" />
                    </div>

                    {isCircleMode && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider">Dimensões</label>
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="input-label text-gray-900 dark:text-gray-400">Raio (m)</label>
                                    <input type="number" min="1" step="1" className="input-field" value={radius} onChange={e => {
                                        let val = e.target.value;
                                        if (val === '') { setRadius(''); return; }
                                        let num = parseFloat(val);
                                        if (num < 1) num = 1;
                                        setRadius(num);
                                    }} />
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="input-label text-gray-900 dark:text-gray-400">Abertura (1-360º)</label>
                                        <input type="number" min="1" max="360" step="1" className="input-field" value={angle} onChange={e => {
                                            let val = e.target.value;
                                            if (val === '') { setAngle(''); return; }
                                            let num = parseFloat(val);
                                            if (num < 1) num = 1;
                                            if (num > 360) num = 360;
                                            setAngle(num);
                                        }} />
                                    </div>
                                    <div className="flex-1">
                                        <label className="input-label text-gray-900 dark:text-gray-400">Direção (0-360º)</label>
                                        <input type="number" min="0" max="360" step="1" className="input-field" value={direction} onChange={e => {
                                            let val = e.target.value;
                                            if (val === '') { setDirection(''); return; }
                                            let num = parseFloat(val);
                                            if (num < 0) num = 0;
                                            if (num > 360) num = 360;
                                            setDirection(num);
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider">Contorno</label>
                        <div className="flex flex-col gap-3">
                            <div className="color-settings-group">
                                <label className="input-label text-gray-900 dark:text-gray-400">Cor</label>
                                <div className="manual-color-wrapper">
                                    <input type="color" className="color-input-picker" value={color} onChange={e => setColor(e.target.value)} />
                                    <input type="text" value={color} onChange={e => setColor(e.target.value)} className="color-input-text flex-1" />
                                </div>
                            </div>
                            <div>
                                <label className="input-label text-gray-900 dark:text-gray-400 flex justify-between">
                                    <span>Opacidade</span>
                                    <span>{colorOpacity}%</span>
                                </label>
                                <input type="range" min="0" max="100" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" value={colorOpacity} onChange={e => setColorOpacity(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider">Preenchimento</label>
                        <div className="flex flex-col gap-3">
                            <div className="color-settings-group">
                                <label className="input-label text-gray-900 dark:text-gray-400">Cor</label>
                                <div className="manual-color-wrapper">
                                    <input type="color" className="color-input-picker" value={fillColor} onChange={e => setFillColor(e.target.value)} />
                                    <input type="text" value={fillColor} onChange={e => setFillColor(e.target.value)} className="color-input-text flex-1" />
                                </div>
                            </div>
                            <div>
                                <label className="input-label text-gray-900 dark:text-gray-400 flex justify-between">
                                    <span>Opacidade</span>
                                    <span>{fillOpacity}%</span>
                                </label>
                                <input type="range" min="0" max="100" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" value={fillOpacity} onChange={e => setFillOpacity(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-2">
                        <label className="input-label text-gray-900 dark:text-gray-400 flex items-center gap-1">
                            <Tag size={12} /> Tags
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {itemTags.map(t => (
                                <span key={t.id} className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 dark:bg-blue-900/40 dark:text-blue-300">
                                    {t.name}
                                    <button type="button" onClick={() => removeTag(t.id)} className="hover:text-red-500"><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                        <div className="relative">
                            <div className="flex items-center">
                                <input type="text" className="input-field pr-8" placeholder="Selecione ou digite para criar..." value={tagInput} onChange={e => { setTagInput(e.target.value.toUpperCase()); setShowTagSuggestions(true); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(tagInput); } }} onClick={() => setShowTagSuggestions(true)} onFocus={() => setShowTagSuggestions(true)} onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)} />
                                <button type="button" className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer" onMouseDown={(e) => { e.preventDefault(); setShowTagSuggestions(!showTagSuggestions); }}>
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                            {showTagSuggestions && (
                                <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
                                    {filteredSuggestions.map(t => (
                                        <div key={t.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-xs text-gray-800 dark:text-gray-200 font-medium" onMouseDown={() => handleAddTag(t.name)}>
                                            {t.name.toUpperCase()}
                                        </div>
                                    ))}
                                    {filteredSuggestions.length === 0 && !normalizedInput && (
                                        <div className="px-3 py-2 text-xs text-gray-500 italic dark:text-gray-400">
                                            Nenhuma tag disponível no projeto.
                                        </div>
                                    )}
                                    {normalizedInput && !exactMatchExists && (
                                        <div className="px-3 py-2 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/30 cursor-pointer text-xs text-blue-600 dark:text-blue-400 font-bold border-t border-gray-100 dark:border-gray-700" onMouseDown={() => handleAddTag(normalizedInput)}>
                                            + Criar nova tag: "{normalizedInput}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onCancel} className="btn-cancel text-gray-900 dark:text-gray-400">Cancelar</button>
                    <button onClick={handleConfirm} className="btn-confirm">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export default AreaModal;
