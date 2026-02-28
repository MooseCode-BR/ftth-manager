// Modal - Relatório de Materiais

import './styles.css';
import React, { useMemo } from 'react';
import { X, Copy, FileText, Ruler } from 'lucide-react';
import { ITEM_TYPES } from '../../constants';
import { calculateCableLength } from '../../utils'; // Certifique-se de ter adicionado esta função no utils.js

const ReportModal = ({ items, connections, onClose }) => {

    // Processamento dos dados
    const report = useMemo(() => {
        const stats = {
            active: {},   // OLTs, Switches
            passive: {},  // CTOs, CEOs, DIOs
            splitters: {}, // Por tipo (1:8, 1:16)
            cables: {},   // Contagem (Quantidade)
            cableLengths: { total: 0, byType: {} }, // NOVO: Metragem (Distância)
            connections: { fusion: 0, connector: 0 } // Fusões vs Conectores
        };

        // 1. Contar Itens e Calcular Metragem
        items.forEach(item => {
            if (item.parentId) return;

            if (item.type === 'CABLE') {
                const label = `Cabo ${item.ports} FO`;

                // Contagem de Unidades (Lógica Antiga)
                stats.cables[label] = (stats.cables[label] || 0) + 1;

                // Cálculo de Metragem (Lógica Nova)
                const len = calculateCableLength(item, items);
                stats.cableLengths.total += len;
                stats.cableLengths.byType[label] = (stats.cableLengths.byType[label] || 0) + len;
            }
            else if (item.type === 'SPLITTER') {
                const ratio = item.ports - 1;
                const label = `Splitter 1:${ratio}`;
                stats.splitters[label] = (stats.splitters[label] || 0) + 1;
            }
            else {
                const typeInfo = ITEM_TYPES[item.type];
                if (typeInfo) {
                    const category = typeInfo.category === 'DEVICE' ? 'active' : 'passive';
                    const label = typeInfo.label;
                    stats[category][label] = (stats[category][label] || 0) + 1;
                }
            }
        });

        // 2. Contar Itens Internos
        items.filter(i => i.parentId).forEach(item => {
            if (item.type === 'SPLITTER') {
                const ratio = item.ports - 1;
                const label = `Splitter 1:${ratio}`;
                stats.splitters[label] = (stats.splitters[label] || 0) + 1;
            }
        });

        // 3. Contar Conexões
        if (connections) {
            connections.forEach(conn => {
                if (conn.type === 'FUSION') stats.connections.fusion++;
                else stats.connections.connector++;
            });
        }

        return stats;
    }, [items, connections]);

    // Função auxiliar de formatação (m ou km)
    const formatLength = (meters) => {
        if (!meters) return '0 m';
        if (meters > 1000) return `${(meters / 1000).toFixed(2)} km`;
        return `${Math.round(meters)} m`;
    };

    // Copiar para área de transferência (Atualizado com Metragem)
    const copyToClipboard = () => {
        let text = "RELATÓRIO DE MATERIAIS - FTTH MANAGER\n\n";

        const addSection = (title, data, suffix = "un.") => {
            if (Object.keys(data).length === 0) return;
            text += `--- ${title} ---\n`;
            Object.entries(data).forEach(([key, value]) => {
                text += `${key}: ${value} ${suffix}\n`;
            });
            text += "\n";
        };

        // Seção Especial de Cabos (Quantidade + Metragem)
        if (Object.keys(report.cables).length > 0) {
            text += `--- CABOS (QUANTIDADE E EXTENSÃO) ---\n`;
            text += `EXTENSÃO TOTAL DA REDE: ${formatLength(report.cableLengths.total)}\n\n`;

            Object.entries(report.cables).forEach(([label, count]) => {
                const length = report.cableLengths.byType[label] || 0;
                text += `${label}: ${count} lançamentos | Total: ${formatLength(length)}\n`;
            });
            text += "\n";
        }

        addSection("EQUIPAMENTOS ATIVOS", report.active);
        addSection("PASSIVOS DE REDE", report.passive);
        addSection("SPLITTERS", report.splitters);

        text += `--- CONEXÕES ---\n`;
        text += `Fusões: ${report.connections.fusion}\n`;
        text += `Conectorizações: ${report.connections.connector}\n`;

        navigator.clipboard.writeText(text);
        alert("Relatório copiado para a área de transferência!");
    };

    return (
        <div className="report-overlay">
            <div className="report-card">

                {/* Cabeçalho */}
                <div className="report-header">
                    <div className="header-content">
                        <div className="header-icon-box">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="header-title">Relatório de Materiais</h2>
                            <p className="header-subtitle">Inventário automático e metrificação</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-close">
                        <X size={24} />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="report-body">

                    {/* Card de Resumo de Metragem */}
                    {report.cableLengths.total > 0 && (
                        <div className="summary-card">
                            <div className="flex items-center gap-3">
                                <div className="summary-icon-circle">
                                    <Ruler size={20} />
                                </div>
                                <div>
                                    <p className="summary-label">Extensão Total de Fibra</p>
                                    <p className="summary-value">
                                        {formatLength(report.cableLengths.total)}
                                    </p>
                                </div>
                            </div>
                            <div className="summary-help-text">
                                Soma linear de todos os cabos desenhados no mapa (considerando curvas)
                            </div>
                        </div>
                    )}

                    {/* Grid de Tabelas */}
                    <div className="report-grid">

                        {/* Cabos (Ocupa 2 colunas no desktop) */}
                        {Object.keys(report.cables).length > 0 && (
                            <div className="table-card table-span-full">
                                <h3 className="table-header">
                                    <span>CABOS ÓPTICOS</span>
                                    <span className="table-header-sub">Qtd. / Distância</span>
                                </h3>
                                <div className="table-list">
                                    {Object.entries(report.cables).map(([label, count]) => {
                                        const length = report.cableLengths.byType[label] || 0;
                                        return (
                                            <div key={label} className="flex justify-between px-4 py-2 text-sm dark:text-gray-300 hover:dark:bg-gray-500">
                                                <span className="font-medium">{label}</span>
                                                <div className="row-right-content">
                                                    <span className="font-bold mr-3">{count} un.</span>
                                                    <span className="badge-length">
                                                        {formatLength(length)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Ativos */}
                        {Object.keys(report.active).length > 0 && (
                            <div className="bg-slate-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700 overflow-hidden">
                                <h3 className="bg-slate-200 dark:bg-gray-700 px-4 py-2 font-bold text-sm text-slate-700 dark:text-slate-200">EQUIPAMENTOS ATIVOS</h3>
                                <div className="divide-y dark:divide-gray-700">
                                    {Object.entries(report.active).map(([k, v]) => (
                                        <div key={k} className="flex justify-between px-4 py-2 text-sm dark:text-gray-300 hover:dark:bg-gray-500">
                                            <span>{k}</span>
                                            <span className="font-bold">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Passivos */}
                        {Object.keys(report.passive).length > 0 && (
                            <div className="bg-slate-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700 overflow-hidden">
                                <h3 className="bg-slate-200 dark:bg-gray-700 px-4 py-2 font-bold text-sm text-slate-700 dark:text-slate-200">PASSIVOS DE REDE</h3>
                                <div className="divide-y dark:divide-gray-700">
                                    {Object.entries(report.passive).map(([k, v]) => (
                                        <div key={k} className="flex justify-between px-4 py-2 text-sm dark:text-gray-300 hover:dark:bg-gray-500">
                                            <span>{k}</span>
                                            <span className="font-bold">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Splitters */}
                        {Object.keys(report.splitters).length > 0 && (
                            <div className="bg-slate-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700 overflow-hidden">
                                <h3 className="bg-slate-200 dark:bg-gray-700 px-4 py-2 font-bold text-sm text-slate-700 dark:text-slate-200">SPLITTERS ÓPTICOS</h3>
                                <div className="divide-y dark:divide-gray-700">
                                    {Object.entries(report.splitters).map(([k, v]) => (
                                        <div key={k} className="flex justify-between px-4 py-2 text-sm dark:text-gray-300 hover:dark:bg-gray-500">
                                            <span>{k}</span>
                                            <span className="font-bold">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Conexões (Resumo Final) */}
                    <div className="connections-summary">
                        <div className="connection-stat">
                            <div className="stat-value-fusion">{report.connections.fusion}</div>
                            <div className="stat-label-fusion">Fusões Realizadas</div>
                        </div>
                        <div className="connection-divider"></div>
                        <div className="connection-stat">
                            <div className="stat-value-connector">{report.connections.connector}</div>
                            <div className="stat-label-connector">Conectorizações</div>
                        </div>
                    </div>

                </div>

                {/* Rodapé */}
                <div className="report-footer">
                    <button onClick={copyToClipboard} className="btn-copy">
                        <Copy size={16} /> Copiar Texto Completo
                    </button>
                    <button onClick={onClose} className="btn-close-modal">
                        Fechar
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ReportModal;