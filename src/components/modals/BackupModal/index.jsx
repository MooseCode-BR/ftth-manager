/*
 * Modal para salvar projetos FTTH.
 */

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

    const toggleAll = () => {
        if (selectedIds.size === projects.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(projects.map(p => p.id)));
        }
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

    const allSelected = projects.length > 0 && selectedIds.size === projects.length;


    return (
        <div className="backup-modal-overlay" onClick={onClose}>
            <div className="backup-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="backup-modal-header">
                    <div className="backup-modal-title">
                        <Save size={20} className="text-white" />
                        Salvar Projeto FTTH
                    </div>
                    <button className="backup-modal-close" onClick={onClose} title="Fechar">
                        <X size={18} />
                    </button>
                </div>

                <div className="backup-modal-body">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Selecione os projetos que deseja salvar. Cada projeto gerará um arquivo <strong>.zip</strong> separado. Este arquivo é compatível apenas com o FTTH Manager Cloud. Apenas projetos pessoais podem ser exportados.
                    </p>

                    {projects && projects.length > 0 ? (
                        <>
                            {/* Botão Selecionar Todos */}
                            <button
                                onClick={toggleAll}
                                className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3 transition-colors"
                            >
                                {allSelected
                                    ? <CheckSquare size={14} className="text-blue-500" />
                                    : <Square size={14} />
                                }
                                {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                            </button>

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
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="backup-project-name">{project.name || 'Projeto sem nome'}</span>
                                                {project.createdAt && (
                                                    <span className="backup-project-date">Criado em: {formatDate(project.createdAt)}</span>
                                                )}
                                                {project.updatedAt && (
                                                    <span className="backup-project-date">Última modificação: {formatDate(project.updatedAt)}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
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
