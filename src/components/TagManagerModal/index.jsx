// Modal gerenciador de etiquetas

import './styles.css';
import React, { useState } from 'react';
import { Tag, Plus, Trash2, Save, X, Edit3 } from 'lucide-react';

const TagManagerModal = ({ tags = [], onClose, onSaveTag, onDeleteTag }) => {
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("#3b82f6");

    // Estado para nova tag
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState("#3b82f6");

    const handleCreate = () => {
        if (!newTagName.trim()) return;
        const newTag = {
            id: Date.now().toString(), // ID único
            name: newTagName,
            color: newTagColor
        };
        onSaveTag(newTag);
        setNewTagName("");
    };

    const startEditing = (tag) => {
        setEditingId(tag.id);
        setEditName(tag.name);
        setEditColor(tag.color);
    };

    const saveEdit = () => {
        if (!editingId || !editName.trim()) return;
        onSaveTag({ id: editingId, name: editName, color: editColor });
        setEditingId(null);
    };

    // Cria uma cópia ordenada das tags ---
    const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="tag-manager-overlay">
            <div className="tag-manager-card">
                
                {/* Header */}
                <div className="card-header">
                    <h3 className="header-title">
                        <Tag size={20} className="header-icon"/> Gerenciar Etiquetas
                    </h3>
                    <button onClick={onClose} className="btn-close">
                        <X size={20}/>
                    </button>
                </div>

                {/* Lista de Tags */}
                <div className="tag-list-container">
                    {tags.length === 0 && <p className="empty-msg">Nenhuma etiqueta criada.</p>}
                    
                    {sortedTags.map(tag => (
                        <div key={tag.id} className="tag-row">
                            {editingId === tag.id ? (
                                // Modo Edição
                                <>
                                    <input 
                                        type="color" 
                                        value={editColor} 
                                        onChange={e=>setEditColor(e.target.value)} 
                                        className="color-input-edit"
                                    />
                                    <input 
                                        autoFocus 
                                        className="name-input-edit" 
                                        value={editName} 
                                        onChange={e=>setEditName(e.target.value)}
                                    />
                                    <button onClick={saveEdit} className="btn-save-edit">
                                        <Save size={16}/>
                                    </button>
                                    <button onClick={()=>setEditingId(null)} className="btn-cancel-edit">
                                        <X size={16}/>
                                    </button>
                                </>
                            ) : (
                                // Modo Visualização
                                <>
                                    <div className="tag-color-dot" style={{backgroundColor: tag.color}}></div>
                                    <span className="tag-name-text">{tag.name}</span>
                                    <button onClick={() => startEditing(tag)} className="btn-edit-action">
                                        <Edit3 size={14}/>
                                    </button>
                                    <button onClick={() => onDeleteTag(tag.id)} className="btn-delete-action">
                                        <Trash2 size={14}/>
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Criar Nova Tag */}
                <div className="create-section">
                    <label className="section-label">Nova Etiqueta</label>
                    <div className="create-form-row">
                        <div className="color-picker-wrapper">
                            <input 
                                type="color" 
                                value={newTagColor} 
                                onChange={e => setNewTagColor(e.target.value)}
                                className="color-input-hidden" 
                            />
                            <div className="color-preview-box">
                                <div className="color-preview-dot" style={{backgroundColor: newTagColor}}></div>
                            </div>
                        </div>
                        <input 
                            className="new-tag-input" 
                            placeholder="Nome da tag (ex: Projeto X)"
                            value={newTagName}
                            onChange={e => setNewTagName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                        <button 
                            onClick={handleCreate}
                            className="btn-create"
                        >
                            <Plus size={16}/> Criar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TagManagerModal;