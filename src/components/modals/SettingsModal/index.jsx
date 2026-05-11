/*
 * Esse é o modal que mostra as configurações do usuário.
 */

import './styles.css';

import React, { useEffect } from 'react';
import {
    X, FileText, Download, Upload, Database,
    Palette, Settings
} from 'lucide-react';

// Componente Interno do Botão (Extraído para limpeza)
const SettingsOptionButton = ({ icon: Icon, label, onClick, colorClass = "text-gray-700 dark:text-gray-200" }) => (
    <button
        onClick={onClick}
        className="settings-option-btn cursor-pointer"
    >
        <div className={`option-icon-wrapper ${colorClass}`}>
            <Icon size={24} />
        </div>
        <span className="option-label">{label}</span>
    </button>
);

const SettingsModal = ({
    isOpen, onClose,
    onExportKML, onImportKML,
    onBackup, onRestore,
    onOpenNodeColors, onOpenCableColors,
    onOpenReport
}) => {
    if (!isOpen) return null;

    // Fechar com ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                const higherModals = document.querySelectorAll(
                    '.report-overlay, .node-colors-overlay, .standards-overlay, .tag-manager-overlay, .backup-modal-overlay, .projects-overlay'
                );
                if (higherModals.length > 0) return;

                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Fechar ao clicar fora
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="settings-overlay" onClick={handleOverlayClick}>
            <div className="settings-card">

                {/* Cabeçalho */}
                <div className="settings-header">
                    <h2 className="header-title">
                        <Settings className=" text-gray-800 dark:text-white" />
                        Configurações & Ferramentas
                    </h2>
                    <button onClick={onClose} className="btn-close">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Grid de Opções */}
                <div className="settings-grid">

                    {/* Grupo: Arquivos */}
                    <div className="grid-section-header">
                        <p className="section-title">Dados & Arquivos</p>
                    </div>

                    <SettingsOptionButton icon={Download} label="Exportar KML" onClick={onExportKML} />
                    <SettingsOptionButton icon={Upload} label="Importar KML" onClick={onImportKML} />
                    <SettingsOptionButton icon={Database} label="Salvar Projeto FTTH" onClick={onBackup} />
                    <SettingsOptionButton icon={Upload} label="Restaurar Projeto FTTH" onClick={onRestore} />
                    <SettingsOptionButton icon={FileText} label="Relatório" onClick={onOpenReport} />

                    {/* Grupo: Personalização */}
                    <div className="grid-section-header mt-4">
                        <p className="section-title">Personalização</p>
                    </div>

                    <SettingsOptionButton icon={Palette} label="Cores dos Nós" onClick={onOpenNodeColors} />
                    <SettingsOptionButton icon={Palette} label="Cores dos Cabos" onClick={onOpenCableColors} />
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;