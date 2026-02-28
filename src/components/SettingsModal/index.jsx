// Menu de Configurações

import './styles.css';

import React from 'react';
import {
    X, FileText, Download, Upload, Database,
    Palette, Tags, User, Users, Settings
} from 'lucide-react';

const SettingsModal = ({
    isOpen, onClose,
    onExportKML, onImportKML,
    onBackup, onRestore,
    onOpenNodeColors, onOpenCableColors,
    onManageTags, onOpenReport
}) => {
    if (!isOpen) return null;

    // Componente Interno do Botão (Extraído para limpeza)
    const SettingsOptionButton = ({ icon: Icon, label, onClick, colorClass = "icon-default", bgClass = "btn-bg-default" }) => (
        <button
            onClick={onClick}
            className={`settings-option-btn ${bgClass}`}
        >
            {/* <div className={`option-icon-wrapper ${colorClass}`}> */}
            <div className={`option-icon-wrapper icon-default`}>
                <Icon size={24} />
            </div>
            <span className="option-label">{label}</span>
        </button>
    );

    return (
        <div className="settings-overlay">
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

                    <SettingsOptionButton icon={Download} label="Exportar KML" onClick={onExportKML} colorClass="text-blue-500" />
                    <SettingsOptionButton icon={Upload} label="Importar KML" onClick={onImportKML} colorClass="text-blue-500" />
                    <SettingsOptionButton icon={Database} label="Salvar Projeto FTTH" onClick={onBackup} colorClass="text-emerald-500" />
                    <SettingsOptionButton icon={Upload} label="Restaurar Projeto FTTH" onClick={onRestore} colorClass="text-orange-500" />
                    <SettingsOptionButton icon={FileText} label="Relatório" onClick={onOpenReport} colorClass="text-purple-500" />

                    {/* Grupo: Personalização */}
                    <div className="grid-section-header mt-4">
                        <p className="section-title">Personalização</p>
                    </div>

                    <SettingsOptionButton icon={Tags} label="Gerenciar Tags" onClick={onManageTags} colorClass="text-pink-500" />
                    <SettingsOptionButton icon={Palette} label="Cores dos Nós" onClick={onOpenNodeColors} colorClass="text-indigo-500" />
                    <SettingsOptionButton icon={Palette} label="Cores dos Cabos" onClick={onOpenCableColors} colorClass="text-cyan-500" />
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;