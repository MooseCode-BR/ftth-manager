import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Loader2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const ProjectTagsModal = ({
    isOpen,
    onClose,
    project,
    onSaveTag,   // Callback para criar/editar no App.jsx
    onDeleteTag  // Callback para excluir no App.jsx
}) => {
    const [newTagName, setNewTagName] = useState('');
    const [editingTagId, setEditingTagId] = useState(null);
    const [editingTagName, setEditingTagName] = useState('');
    
    // Estados autônomos do componente
    const [localTags, setLocalTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // EFEITO AUTÔNOMO: Busca as tags direto do banco de dados quando o modal abre
    useEffect(() => {
        if (!isOpen || !project) {
            setLocalTags([]);
            return;
        }

        setIsLoading(true);
        const tagRef = doc(db, `artifacts/ftth-production/users/${project.ownerId}/projects/${project.id}/settings`, 'tags');
        
        // onSnapshot escuta o banco em tempo real. Não depende da visibilidade do mapa!
        const unsubscribe = onSnapshot(tagRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Filtra metadados e ordena alfabeticamente
                const tagsArray = Object.values(data)
                    .filter(t => typeof t === 'object' && t.id && t.name)
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                setLocalTags(tagsArray);
            } else {
                setLocalTags([]);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar tags do projeto oculto:", error);
            setIsLoading(false);
        });

        // Limpa o listener ao fechar o modal para economizar memória
        return () => unsubscribe();
    }, [isOpen, project]);

    if (!isOpen || !project) return null;

    const handleCreate = (e) => {
        e.preventDefault();
        const cleanedName = newTagName.trim().toUpperCase();
        if (!cleanedName) return;

        // Evita duplicados verificando o estado local
        if (localTags.some(t => t.name === cleanedName)) {
            alert('ESTA TAG JÁ EXISTE NESTE PROJETO!');
            return;
        }

        const newId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        onSaveTag(project.id, project.ownerId, newId, cleanedName);
        setNewTagName('');
    };

    const handleStartEdit = (tag) => {
        setEditingTagId(tag.id);
        setEditingTagName(tag.name);
    };

    const handleSaveEdit = (tagId) => {
        const cleanedName = editingTagName.trim().toUpperCase();
        if (!cleanedName) return;

        if (localTags.some(t => t.name === cleanedName && t.id !== tagId)) {
            alert('JÁ EXISTE OUTRA TAG COM ESSE NOME NESTE PROJETO!');
            return;
        }

        onSaveTag(project.id, project.ownerId, tagId, cleanedName);
        setEditingTagId(null);
        setEditingTagName('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Gerenciar Tags do Projeto</h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400 truncate max-w-[300px] font-medium">{project.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Form para Criar Nova Tag */}
                <form onSubmit={handleCreate} className="p-4 border-b border-gray-100 dark:border-gray-800 flex gap-2 bg-white dark:bg-gray-900">
                    <input
                        type="text"
                        placeholder="NOVA TAG (EX: ASSINANTE)"
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-2 text-xs font-semibold uppercase bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
                    />
                    <button type="submit" disabled={isLoading} className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center">
                        <Plus size={16} />
                    </button>
                </form>

                {/* Lista de Tags Cadastradas */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50 dark:bg-gray-950/20 custom-scrollbar relative min-h-[150px]">
                    
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 size={24} className="animate-spin mb-2 text-blue-500" />
                            <span className="text-xs">Carregando tags...</span>
                        </div>
                    ) : (
                        <>
                            {localTags.map(tag => (
                                <div key={tag.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-lg shadow-sm group">
                                    
                                    {editingTagId === tag.id ? (
                                        <input
                                            type="text"
                                            value={editingTagName}
                                            onChange={e => setEditingTagName(e.target.value.toUpperCase())}
                                            autoFocus
                                            className="flex-1 mr-2 px-2 py-1 text-xs font-bold uppercase border border-blue-500 dark:border-blue-400 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none"
                                            onKeyDown={e => e.key === 'Enter' && handleSaveEdit(tag.id)}
                                        />
                                    ) : (
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded">
                                            {tag.name}
                                        </span>
                                    )}

                                    <div className="flex items-center gap-1.5 opacity-80 min-[1100px]:opacity-0 min-[1100px]:group-hover:opacity-100 transition-opacity">
                                        {editingTagId === tag.id ? (
                                            <button onClick={() => handleSaveEdit(tag.id)} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded transition-colors" title="Salvar alteração">
                                                <Check size={14} />
                                            </button>
                                        ) : (
                                            <button onClick={() => handleStartEdit(tag)} className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Editar nome">
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                        <button onClick={() => onDeleteTag(project.id, project.ownerId, tag.id, tag.name)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors" title="Excluir tag">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                </div>
                            ))}

                            {localTags.length === 0 && (
                                <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-6 italic">
                                    Nenhuma tag criada para este projeto ainda.
                                </p>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ProjectTagsModal;