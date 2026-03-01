// Seletor de Etiquetas - DropDown

import './styles.css';
import React, { useState } from 'react';
import { Tag, ChevronDown, Check } from 'lucide-react';

const TagSelector = ({ availableTags = [], selectedTagIds = [], onChange, onManageTags }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleTag = (tagId) => {
        let newIds;
        if (selectedTagIds.includes(tagId)) {
            newIds = selectedTagIds.filter(id => id !== tagId);
        } else {
            newIds = [...selectedTagIds, tagId];
        }
        onChange(newIds);
    };

    // 1. Prepara as listas separadas e ordenadas
    const selectedList = availableTags
        .filter(tag => selectedTagIds.includes(tag.id))
        .sort((a, b) => a.name.localeCompare(b.name));

    const unselectedList = availableTags
        .filter(tag => !selectedTagIds.includes(tag.id))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="tag-selector-wrapper">
            <div className="selector-header">
                <label className="input-label text-gray-900 dark:text-gray-400">Etiquetas</label>
                <button
                    type="button"
                    onClick={onManageTags}
                    className="btn-manage"
                >
                    <Tag size={10} /> Gerenciar
                </button>
            </div>

            {/* Área de Visualização das Tags Selecionadas (No campo) */}
            <div
                className="selector-input-area"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedTagIds.length === 0 && <span className="placeholder-text">Nenhuma etiqueta...</span>}

                {selectedTagIds.map(id => {
                    const tag = availableTags.find(t => t.id === id);
                    if (!tag) return null;
                    return (
                        <span
                            key={id}
                            className="tag-pill-display"
                            style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color, color: tag.color }}
                        >
                            {tag.name}
                        </span>
                    );
                })}
                <button type="button" className="btn-chevron"><ChevronDown size={16} /></button>
            </div>

            {/* Dropdown de Seleção */}
            {isOpen && (
                <div className="selector-dropdown">
                    {availableTags.length === 0 ? (
                        <div className="empty-dropdown-msg">Nenhuma tag cadastrada.</div>
                    ) : (
                        <>
                            {/* GRUPO 1: SELECIONADAS */}
                            {selectedList.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    className="dropdown-item item-selected"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="tag-dot" style={{ backgroundColor: tag.color }}></div>
                                        <span className="tag-name">{tag.name}</span>
                                    </div>
                                    <Check size={14} className="text-blue-600" />
                                </button>
                            ))}

                            {/* Separador (Apenas se houver itens em ambos os grupos) */}
                            {selectedList.length > 0 && unselectedList.length > 0 && (
                                <div className="dropdown-divider"></div>
                            )}

                            {/* GRUPO 2: NÃO SELECIONADAS */}
                            {unselectedList.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    className="dropdown-item item-idle"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="tag-dot" style={{ backgroundColor: tag.color }}></div>
                                        <span className="tag-name">{tag.name}</span>
                                    </div>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TagSelector;