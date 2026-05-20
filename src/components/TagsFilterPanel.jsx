import React from 'react';
import { Tag } from 'lucide-react';

const TagsFilterPanel = ({
    isOpen,
    projectTags,
    selectedFilterTags,
    setSelectedFilterTags
}) => {
    // Se não estiver aberto, não renderiza nada
    if (!isOpen) return null;

    // Extrai nomes únicos das tags para não haver repetição visual
    const uniqueTags = Array.from(new Set(Object.values(projectTags).map(t => t.name)));

    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-80 bg-white/90 dark:bg-black/70 backdrop-blur-xl p-4 rounded-xl shadow-2xl z-[60] border border-gray-200 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                    <Tag size={16} /> Filtrar Itens
                </h3>
                {selectedFilterTags.length > 0 && (
                    <button onClick={() => setSelectedFilterTags([])} className="text-[10px] text-gray-500 hover:text-red-500 underline transition-colors">
                        Limpar tudo
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                {uniqueTags.map(tagName => (
                    <button
                        key={tagName}
                        onClick={() => {
                            setSelectedFilterTags(prev =>
                                prev.includes(tagName)
                                    ? prev.filter(t => t !== tagName)
                                    : [...prev, tagName]
                            )
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-all ${selectedFilterTags.includes(tagName)
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                            : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        {tagName}
                    </button>
                ))}

                {uniqueTags.length === 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-full text-center py-2">
                        Nenhuma tag disponível, habilite a visibilidade de um projeto.
                    </span>
                )}
            </div>
        </div>
    );
};

export default TagsFilterPanel;