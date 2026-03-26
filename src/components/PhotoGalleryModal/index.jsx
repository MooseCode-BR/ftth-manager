// src/components/PhotoGalleryModal.jsx (ou onde estiver seu arquivo)

import './styles.css';
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, ImageIcon, Trash2, UploadCloud, CheckCircle2, Circle, Info } from 'lucide-react';
import ImageViewer from '../ImageViewer'; // <--- 1. IMPORTANTE: Importe o componente novo
import AuditInfo from '../AuditInfo';

const PhotoGalleryModal = ({ item, onClose, onUpload, onDelete, onBatchDelete, uploading }) => {
    const fileInputRef = useRef(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // --- 2. NOVOS ESTADOS PARA O VISUALIZADOR ---
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    // Limpa seleção se o item mudar (segurança)
    useEffect(() => {
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    }, [item.id]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(item, e.target.files);
            e.target.value = '';
        }
    };

    // Função para alternar seleção de uma foto
    const toggleSelection = (photoId) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(photoId)) {
            newSet.delete(photoId);
        } else {
            newSet.add(photoId);
        }
        setSelectedIds(newSet);
    };

    // Função para deletar os selecionados
    const handleDeleteSelected = () => {
        const photosToDelete = item.photos.filter(p => selectedIds.has(p.id));
        onBatchDelete(item, photosToDelete);
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    };

    // Alternar "Selecionar Tudo"
    const toggleSelectAll = () => {
        if (selectedIds.size === item.photos.length) {
            setSelectedIds(new Set());
        } else {
            const allIds = new Set(item.photos.map(p => p.id));
            setSelectedIds(allIds);
        }
    };

    // --- 3. FUNÇÃO PARA ABRIR O VIEWER ---
    const openViewer = (index) => {
        setViewerIndex(index);
        setIsViewerOpen(true);
    };

    return (
        <div className="gallery-overlay">
            <div className="gallery-card">

                {/* Header */}
                <div className="gallery-header">
                    <div className="flex items-center gap-3">
                        {selectedIds.size > 0 ? (
                            <div className="selection-header-group">
                                <button
                                    onClick={handleDeleteSelected}
                                    className="btn-delete-selection"
                                >
                                    <Trash2 size={16} /> Excluir ({selectedIds.size})
                                </button>
                                <button
                                    onClick={() => { setSelectedIds(new Set()); setIsSelectionMode(false); }}
                                    className="btn-cancel-selection"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Camera className="header-icon" size={24} />
                                <div>
                                    <h3 className="header-title">Galeria de Fotos</h3>
                                    <p className="header-subtitle">{item.name} ({item.photos?.length || 0} fotos)</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {item.photos?.length > 0 && (
                            <button
                                onClick={() => {
                                    setIsSelectionMode(!isSelectionMode);
                                    if (isSelectionMode) setSelectedIds(new Set());
                                }}
                                className={`btn-toggle-select ${isSelectionMode ? 'toggle-active' : 'toggle-idle'}`}
                            >
                                {isSelectionMode ? 'Concluir Seleção' : 'Selecionar'}
                            </button>
                        )}
                        <button onClick={onClose} className="btn-close-gallery">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Sub-Header Selecionar Tudo */}
                {isSelectionMode && item.photos?.length > 0 && (
                    <div className="selection-bar">
                        <span className="text-gray-500">{selectedIds.size} selecionados</span>
                        <button onClick={toggleSelectAll} className="btn-select-all">
                            {selectedIds.size === item.photos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                        </button>
                    </div>
                )}

                {/* Grid de Fotos */}
                <div className="gallery-grid-container">
                    {(!item.photos || item.photos.length === 0) ? (
                        <div className="empty-state">
                            <ImageIcon size={48} />
                            <p>Nenhuma foto adicionada ainda.</p>
                        </div>
                    ) : (
                        <div className="photos-grid">
                            {item.photos.map((photo, idx) => {
                                const isSelected = selectedIds.has(photo.id);
                                return (
                                    <div
                                        key={idx}
                                        // --- 4. ALTERADO: Se não estiver selecionando, abre o viewer ao clicar no card ---
                                        onClick={() => isSelectionMode ? toggleSelection(photo.id) : openViewer(idx)}
                                        className={`photo-card ${isSelected ? 'card-selected' : 'card-idle'} ${isSelectionMode ? 'mode-selection' : ''} cursor-pointer`}
                                    >
                                        <img
                                            src={photo.url}
                                            alt="Evidência"
                                            className="photo-img"
                                            // --- 5. OTIMIZAÇÃO DAS MINIATURAS ---
                                            loading="lazy"
                                            decoding="async"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = "https://placehold.co/400?text=Imagem+Perdida";
                                                e.target.className = "photo-img opacity-50";
                                            }}
                                        />

                                        {/* Overlay de Seleção (Check) */}
                                        {isSelectionMode && (
                                            <div className="selection-indicator">
                                                {isSelected ? (
                                                    <div className="bg-white rounded-full"><CheckCircle2 className="text-blue-600 fill-white" size={24} /></div>
                                                ) : (
                                                    <Circle className="text-white drop-shadow-md bg-black/20 rounded-full" size={24} />
                                                )}
                                            </div>
                                        )}

                                        {/* Overlay de Ações (Hover) */}
                                        {!isSelectionMode && (
                                            <div className="action-overlay">
                                                {photo.uploadedBy && (
                                                    <AuditInfo
                                                        createdBy={photo.uploadedBy}
                                                        createdAt={photo.date}
                                                        mode="popover"
                                                    />
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(item, photo); }}
                                                    className="btn-delete-icon"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="date-label">
                                            {new Date(photo.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer (Upload) */}
                {!isSelectionMode && (
                    <div className="gallery-footer">
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="btn-upload"
                        >
                            {uploading ? (
                                <>
                                    <div className="spinner-upload"></div>
                                    Enviando imagens...
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={20} /> Adicionar Fotos
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* --- 7. RENDERIZA O COMPONENTE VIEWER --- */}
            {isViewerOpen && item.photos && (
                <ImageViewer
                    photos={item.photos}
                    initialIndex={viewerIndex}
                    onClose={() => setIsViewerOpen(false)}
                />
            )}
        </div>
    );
};

export default PhotoGalleryModal;