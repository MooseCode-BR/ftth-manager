import React, { useState, useEffect } from 'react';
import { X, Save, CheckSquare, Square, Package } from 'lucide-react';
import './styles.css';

const BackupModal = ({ isOpen, onClose, projects, onConfirm }) => {
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Limpa a seleção sempre que o modal abre
    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleConfirm = () => {
        const selectedProjects = projects.filter(p => selectedIds.has(p.id));
        onConfirm(selectedProjects);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch {
            return dateString;
        }
    };

    return (
        <div className="backup-modal-overlay" onClick={onClose}>
            <div className="backup-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="backup-modal-header">
                    <div className="backup-modal-title">
                        <Save size={20} className="text-blue-500" />
                        Salvar Projeto FTTH
                    </div>
                    <button className="backup-modal-close" onClick={onClose} title="Fechar">
                        <X size={18} />
                    </button>
                </div>

                <div className="backup-modal-body">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Selecione os projetos que deseja baixar. Eles serão salvos no seu dispositivo. Você pode salvar apenas projetos pessoais.
                    </p>

                    {projects && projects.length > 0 ? (
                        <div className="backup-projects-list">
                            {projects.map(project => {
                                const isSelected = selectedIds.has(project.id);
                                return (
                                    <div
                                        key={project.id}
                                        className={`backup-project-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleSelection(project.id)}
                                    >
                                        <div className="flex items-center justify-center">
                                            {isSelected ? (
                                                <CheckSquare size={18} className="text-blue-500" />
                                            ) : (
                                                <Square size={18} className="text-gray-400 dark:text-gray-500" />
                                            )}
                                        </div>
                                        <Package size={18} className="text-gray-400 dark:text-gray-500" />
                                        <div className="backup-project-info">
                                            <span className="backup-project-name">{project.name || 'Projeto sem nome'}</span>
                                            {project.createdAt && (
                                                <span className="backup-project-date">Criado em: {formatDate(project.createdAt)}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="backup-empty-state">
                            Nenhum projeto encontrado.
                        </div>
                    )}
                </div>

                <div className="backup-modal-footer">
                    <button className="backup-btn-cancel" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        className="backup-btn-confirm"
                        onClick={handleConfirm}
                        disabled={selectedIds.size === 0}
                    >
                        <Save size={16} />
                        Baixar ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BackupModal;
