// Modal de informações de um cliente existente

import './styles.css';
// IMPORTS --------------------------------------------------
import React, { useState } from 'react'; //React
import { v4 as uuidv4 } from 'uuid'; //Gera uuid unicos

//Icones
import { Network, Cable, User, X, Unplug, Camera } from 'lucide-react';


const ClientModal = ({ item, items, connections, onClose, onSave, onDelete, onOpenPhotos, onDisconnect, onConnect }) => {
    const [name, setName] = useState(item.name);

    const conn = connections.find(c => c.toId === item.id || c.fromId === item.id);

    let connectedToName = "Não conectado";
    let connectedPortLabel = "-";
    let isConnected = false;

    if (conn) {
        isConnected = true;
        const sourceId = conn.toId === item.id ? conn.fromId : conn.toId;
        const sourcePort = conn.toId === item.id ? conn.fromPort : conn.toPort;
        const sourceItem = items.find(i => i.id === sourceId);

        if (sourceItem) {
            // Lógica para mostrar o nome correto (Se for splitter, mostra o pai também)
            const parentBox = sourceItem.parentId ? items.find(i => i.id === sourceItem.parentId) : null;
            if (parentBox) {
                connectedToName = `${parentBox.name} > ${sourceItem.name}`;
            } else {
                connectedToName = sourceItem.name;
            }

            // --- CORREÇÃO DA NUMERAÇÃO DA PORTA ---
            if (typeof sourcePort === 'object') {
                connectedPortLabel = sourcePort.label || "Porta desconhecida";
            } else {
                // Se for splitter ou similar: 0 é Entrada, 1 é Porta 1
                const pIndex = parseInt(sourcePort);

                if (sourceItem.type === 'SPLITTER') {
                    if (pIndex === 0) connectedPortLabel = "ENTRADA";
                    else connectedPortLabel = `Porta ${pIndex}`; // Sem somar +1
                } else {
                    // Para outros equipamentos (Switch, OLT), mantemos o índice ou ajustamos conforme seu padrão.
                    // Assumindo que OLT também segue o padrão visual do seu splitter:
                    connectedPortLabel = `Porta ${pIndex}`;
                }
            }
            // --------------------------------------
        }
    }

    const handleSave = () => {
        onSave(name);
        onClose();
    };

    return (
        <div className="client-details-overlay">
            <div className="client-details-card">

                {/* Cabeçalho */}
                <div className="card-header">
                    <h3 className="card-title">
                        <User size={22} className="icon-title" />
                        Detalhes do Cliente
                    </h3>
                    <button onClick={onClose} className="btn-close">
                        <X size={20} />
                    </button>
                </div>

                {/* Corpo do Cartão */}
                <div className="card-body">

                    {/* Input Nome */}
                    <div>
                        <label className="input-label">Nome do Cliente</label>
                        <input
                            className="input-field"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: João da Silva"
                        />
                    </div>

                    {/* Seção de Status */}
                    <div className="status-box">
                        <label className="status-header-label">
                            <Network size={14} /> Status da Conexão
                        </label>

                        {isConnected ? (
                            <>
                                <div className="status-info-group">
                                    <div className="status-row border-b border-blue-200 dark:border-blue-800/50 pb-2">
                                        <span className="status-key">Origem</span>
                                        <span className="status-value truncate max-w-[150px]" title={connectedToName}>
                                            {connectedToName}
                                        </span>
                                    </div>
                                    <div className="status-row">
                                        <span className="status-key">Porta</span>
                                        <span className="status-value">{connectedPortLabel}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { if (window.confirm("Desconectar cliente?")) onDisconnect(conn.id); }}
                                    className="btn-disconnect"
                                >
                                    <Unplug size={14} /> Desconectar
                                </button>
                            </>
                        ) : (
                            <div className="status-disconnected">
                                <p className="status-text">Cliente desconectado.</p>
                                <button
                                    onClick={onConnect}
                                    className="btn-reconnect"
                                >
                                    <Cable size={16} /> Reconectar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ações do Rodapé */}
                <div className="actions-wrapper">
                    <button
                        onClick={() => onOpenPhotos(item)}
                        className="btn-photos"
                    >
                        <Camera size={18} className="text-blue-500" />
                        Ver Fotos {item.photos?.length > 0 && `(${item.photos.length})`}
                    </button>

                    <div className="actions-footer-row">
                        <button
                            onClick={() => { if (window.confirm("Excluir cliente?")) onDelete(item.id); }}
                            className="btn-delete"
                        >
                            Excluir
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn-save"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientModal;