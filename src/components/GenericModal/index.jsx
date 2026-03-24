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
import { generateNodeReport } from '../../pdfGenerator';

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
                    <h3 className="card-title">
                        Detalhes
                    </h3>
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

                    {/* Área de Notas (Substitui o Status do Cliente) */}
                    <div className="notes-section">
                        <label className="input-label flex items-center gap-2">
                            Anotações Técnicas
                        </label>
                        <textarea
                            className="textarea-field"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Escreva observações sobre este ponto..."
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