// Modal de correção de conexões de cabos na hora de importar KML

import './styles.css';
import React, { useState, useEffect } from 'react';
import { Unplug, Link, ArrowRight, CheckCircle, Trash2, Loader2, Network } from 'lucide-react'; // Adicionei Loader2 e Network
import { findNearbyCandidates } from '../../utils';
import LoadingFiber from '../../assets/loadingfiber';

const FixConnectionsModal = ({ items, onClose, onConfirm }) => {
    // Lista de problemas detectados
    const [issues, setIssues] = useState([]);

    // Novo Estado de Carregamento
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const nodes = items.filter(i => i.type !== 'CABLE');
        const cables = items.filter(i => i.type === 'CABLE');

        const detectedIssues = [];

        cables.forEach(cable => {
            // Verifica Ponta A (Início)
            if (!cable.fromNode) {
                const candidates = findNearbyCandidates(cable._startCoords.lat, cable._startCoords.lng, nodes);
                detectedIssues.push({
                    cableId: cable.id,
                    cableName: cable.name,
                    side: 'A', // Início
                    coords: cable._startCoords,
                    candidates: candidates,
                    selectedNodeId: candidates.length > 0 ? candidates[0].node.id : ''
                });
            }

            // Verifica Ponta B (Fim)
            if (!cable.toNode) {
                const candidates = findNearbyCandidates(cable._endCoords.lat, cable._endCoords.lng, nodes);
                detectedIssues.push({
                    cableId: cable.id,
                    cableName: cable.name,
                    side: 'B', // Fim
                    coords: cable._endCoords,
                    candidates: candidates,
                    selectedNodeId: candidates.length > 0 ? candidates[0].node.id : ''
                });
            }
        });

        setIssues(detectedIssues);
    }, [items]);

    const handleSelectionChange = (index, nodeId) => {
        const newIssues = [...issues];
        newIssues[index].selectedNodeId = nodeId;
        setIssues(newIssues);
    };

    const handleConfirm = () => {
        // 1. Ativa o modo de carregamento visual
        setIsSaving(true);

        // 2. Usa o setTimeout para permitir que o React desenhe o spinner
        setTimeout(() => {
            const fixes = issues.map(issue => ({
                cableId: issue.cableId,
                side: issue.side,
                nodeId: issue.selectedNodeId
            }));
            onConfirm(fixes);
        }, 100);
    };

    // --- RENDERIZAÇÃO ---

    // 1. Tela de "Tudo Certo" (Se não houver problemas)
    if (issues.length === 0) {
        return (
            <div className="success-overlay">
                <div className="success-card">
                    <CheckCircle className="success-icon" />
                    <h2 className="success-title">Conexões Perfeitas!</h2>
                    <p className="success-message">Nenhum cabo desconectado encontrado.</p>
                    <button onClick={() => onConfirm([])} className="btn-continue">Continuar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fix-modal-overlay">
            <div className="fix-modal-card">

                {/* --- MODO SALVANDO/CARREGANDO --- */}
                {isSaving ? (
                    <div className="loading-state-container">
                        <div className="flex justify-center items-center p-4">
                            <LoadingFiber size={200} />
                        </div>

                        <div>
                            <h3 className="loading-title">Finalizando Importação</h3>
                            <p className="loading-desc">
                                Aplicando correções em {issues.length} conexões...<br />
                                Salvando no banco de dados.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* --- MODO LISTA DE CORREÇÕES --- */
                    <>
                        {/* Header */}
                        <div className="fix-header">
                            <div className="flex items-center gap-3">
                                <div className="header-icon-box">
                                    <Unplug size={24} />
                                </div>
                                <div>
                                    <h3 className="header-title">Revisar Conexões Soltas</h3>
                                    <p className="header-subtitle">
                                        Encontramos {issues.length} pontas de cabos soltas.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Lista de Problemas */}
                        <div className="issue-list-container">
                            {issues.map((issue, idx) => {
                                // Verifica se o usuário escolheu excluir este cabo
                                const isDeleting = issue.selectedNodeId === '__DELETE__';

                                return (
                                    <div key={idx} className={`issue-row ${isDeleting ? 'row-deleting' : 'row-idle'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="issue-title">
                                                <Link size={14} /> {issue.cableName}
                                            </span>
                                            <span className="issue-tag">
                                                Ponta {issue.side === 'A' ? 'Inicial' : 'Final'} Solta
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {isDeleting ? <Trash2 className="text-red-500" /> : <ArrowRight className="text-gray-400" />}

                                            <div className="flex-1">
                                                <label className="action-label">
                                                    Ação:
                                                </label>
                                                <select
                                                    className={`action-select ${isDeleting ? 'select-deleting' : 'select-normal'}`}
                                                    value={issue.selectedNodeId}
                                                    onChange={(e) => handleSelectionChange(idx, e.target.value)}
                                                >
                                                    <option value="">-- Manter Desconectado (Ignorar) --</option>

                                                    {/* OPÇÃO NOVA: EXCLUIR */}
                                                    <option value="__DELETE__" className="opt-delete">
                                                        ❌ NÃO IMPORTAR ESTE CABOs
                                                    </option>

                                                    <optgroup label="Conectar em Nó Próximo:">
                                                        {issue.candidates.map(cand => (
                                                            <option key={cand.node.id} value={cand.node.id}>
                                                                🔗 {cand.node.name} ({cand.node.type}) — {cand.meters}m
                                                            </option>
                                                        ))}
                                                    </optgroup>

                                                    {issue.candidates.length === 0 && (
                                                        <option disabled>Nenhum nó próximo encontrado</option>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <button onClick={onClose} className="btn-cancel-import">
                                Cancelar Importação
                            </button>
                            <button onClick={handleConfirm} className="btn-apply-fixes">
                                Aplicar Correções e Salvar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FixConnectionsModal;