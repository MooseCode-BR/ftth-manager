/*
 * É como o DetailPanel, só que para objetos e postes.
 */

import './styles.css';
import React, { useState } from 'react';
import {
    X,
    Save,
    Trash2,
    Image,
    StickyNote,
    HardDrive,
    FileDown
} from 'lucide-react';
import { generateNodeReport } from '../../../utils/pdfGenerator';
import AuditInfo from '../../AuditInfo';

// Função auxiliar para calcular distância em metros (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

// Função auxiliar para calcular área de polígono geográfico em m²
const getGeodesicArea = (coordinates) => {
    let area = 0.0;
    const d2r = Math.PI / 180.0;
    let p1, p2;

    if (coordinates && coordinates.length > 2) {
        for (let i = 0; i < coordinates.length; i++) {
            p1 = coordinates[i];
            p2 = coordinates[(i + 1) % coordinates.length];

            const lng1 = (p1.lng ?? p1[1]) * d2r;
            const lat1 = (p1.lat ?? p1[0]) * d2r;
            const lng2 = (p2.lng ?? p2[1]) * d2r;
            const lat2 = (p2.lat ?? p2[0]) * d2r;

            area += ((lng2 - lng1) * (2.0 + Math.sin(lat1) + Math.sin(lat2)));
        }
        area = area * 6378137.0 * 6378137.0 / 2.0;
    }
    return Math.abs(area);
};

const GenericModal = ({
    item,
    onClose,
    onSave,
    onDelete,
    onOpenPhotos,
    onConfirmRequest,
    onAlertRequest,
    items
}) => {
    // Estados locais para edição
    const [name, setName] = useState(item.name || '');
    const [notes, setNotes] = useState(item.notes || '');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    let perimeter = 0;
    let totalArea = 0;

    if (item.type === 'AREA' && Array.isArray(item.positions) && item.positions.length > 2) {
        for (let i = 0; i < item.positions.length; i++) {
            const p1 = item.positions[i];
            const p2 = item.positions[(i + 1) % item.positions.length];
            const lat1 = p1.lat ?? p1[0];
            const lon1 = p1.lng ?? p1[1];
            const lat2 = p2.lat ?? p2[0];
            const lon2 = p2.lng ?? p2[1];
            perimeter += getDistance(lat1, lon1, lat2, lon2);
        }
        totalArea = getGeodesicArea(item.positions);
    }

    const handleDownloadReport = () => {
        onConfirmRequest("Baixar Relatório", "Deseja gerar e baixar o relatório em PDF deste item?", async () => {
            setIsGeneratingPdf(true);
            try {
                await generateNodeReport(item, items);
            } catch (error) {
                console.error("Erro ao gerar PDF:", error);
                if (onAlertRequest) {
                    onAlertRequest("Erro", "Falha ao gerar o relatório PDF. Tente novamente.");
                } else {
                    alert("Erro ao gerar relatório.");
                }
            } finally {
                setIsGeneratingPdf(false);
            }
        });
    };

    // Função para preparar os dados antes de salvar
    const handleSave = () => {
        // Passamos o objeto atualizado (nome e notas)
        onSave({
            ...item,
            name: name,
            notes: notes
        });
        onClose();
    };

    return (
        <div className="client-details-overlay">
            <div className="client-details-card">

                {/* --- CABEÇALHO --- */}
                <div className="card-header">
                    <div className="flex items-center gap-1">
                        <h3 className="card-title">
                            Detalhes
                        </h3>
                        <AuditInfo
                            createdBy={item.createdBy}
                            createdAt={item.createdAt}
                            modifiedBy={item.modifiedBy}
                            modifiedAt={item.modifiedAt}
                            mode="popover"
                        />
                    </div>
                    <button onClick={onClose} className="btn-close">
                        <X size={20} />
                    </button>
                </div>

                {/* --- CORPO --- */}
                <div className="card-body">

                    {/* Input Nome */}
                    <div>
                        <label className="input-label">Identificação / Nome</label>
                        <div className="relative">
                            <input
                                className="input-field p-3" // Padding extra para o ícone interno
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            {/* <PenLine size={16} className="absolute left-3 top-3 text-gray-400" /> */}
                        </div>
                    </div>

                    {item.type === 'AREA' && (
                        <div className="flex flex-col gap-2 my-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Perímetro Total</span>
                                <span className="text-sm font-bold text-gray-800 dark:text-white">
                                    {perimeter >= 1000 ? (perimeter / 1000).toFixed(2) + ' km' : Math.round(perimeter) + ' m'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Área Ocupada</span>
                                <span className="text-sm font-bold text-gray-800 dark:text-white">
                                    {totalArea >= 1000000 ? (totalArea / 1000000).toFixed(2) + ' km²' : Math.round(totalArea) + ' m²'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Área de Notas (Substitui o Status do Cliente) */}
                    <div className="notes-section">
                        <label className="input-label flex items-center gap-2">
                            Anotações Técnicas
                        </label>
                        <textarea
                            className="textarea-field"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Escreva observações sobre este ponto."
                        />
                    </div>


                </div>

                {/* --- RODAPÉ DE AÇÕES --- */}
                <div className="actions-wrapper">

                    {/* Botão de Fotos */}
                    <button
                        onClick={() => onOpenPhotos(item)}
                        className="btn-photos"
                    >
                        <Image size={18} className="text-purple-500" />
                        Galeria de Imagens {item.photos?.length > 0 && `(${item.photos.length})`}
                    </button>

                    {/* Botão Relatório PDF */}
                    <button
                        onClick={handleDownloadReport}
                        disabled={isGeneratingPdf}
                        className="btn-photos" // Usando o mesmo estilo do botão de fotos ou criar um novo se precisar
                    >
                        {isGeneratingPdf ? (
                            <div className="w-4 h-4 border-2 border-gray-600 dark:border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <FileDown size={18} className="text-blue-500" />
                        )}
                        Baixar Relatório PDF
                    </button>

                    <div className="actions-footer-row">
                        {/* Botão Excluir */}
                        <button
                            onClick={() => {
                                onConfirmRequest(
                                    "Excluir Item",
                                    "Tem certeza que deseja excluir este item?",
                                    () => {
                                        onDelete(item.id);
                                        onClose();
                                    }
                                );
                            }}
                            className="btn-delete"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Trash2 size={16} /> Excluir
                            </span>
                        </button>

                        {/* Botão Salvar */}
                        <button
                            onClick={handleSave}
                            className="btn-save"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Save size={16} /> Salvar
                            </span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default GenericModal;