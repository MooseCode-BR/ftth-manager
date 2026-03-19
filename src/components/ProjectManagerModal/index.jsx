//Gerenciador de Projetos e Colaboração

import './styles.css';
import React, { useState, useMemo, useEffect } from 'react';
import {
    Folder, Trash2, Eye, EyeOff, Edit3, Check, PenTool, FolderOpen,
    Share2, UserCheck, Inbox, UserMinus, Users, ArrowRightLeft, AlertTriangle,
    Square, CheckSquare, Plus, ChevronDown, ChevronUp, X, Focus, UserPen, HardHat
} from 'lucide-react';

const ProjectManagerModal = ({
    myProjects,
    sharedProjects,
    pendingInvites,
    outgoingInvites,
    incomingTransfers,
    activeProjectId,
    visibleProjectIds,
    onCreateProject,
    onDeleteProject,
    onRenameProject,
    onToggleVisibility,
    onFocusProject,
    onSetActive,
    onBulkShare,
    onBulkTransfer,
    onBulkDelete,
    onBulkToggleVisibility,
    onRespondInvite,
    onRevokeShare,
    onAcceptTransfer,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState('MY_PROJECTS');
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editNameValue, setEditNameValue] = useState('');

    // --- ESTADOS DE EXPANSÃO (Sanfona) ---
    // Guarda quais projetos estão com a lista de compartilhamento aberta
    const [expandedProjectIds, setExpandedProjectIds] = useState(new Set());

    // --- ESTADOS DE SELEÇÃO EM MASSA ---
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState(null);

    // --- ESTADOS DO INPUT DE EMAIL MÚLTIPLO ---
    const [emailInput, setEmailInput] = useState('');
    const [targetEmails, setTargetEmails] = useState([]);

    // --- ESTADO DO NÍVEL DE PERMISSÃO ---
    const [sharePermission, setSharePermission] = useState('FULL_ACCESS');

    // Lista de contatos frequentes
    const recentContacts = useMemo(() => {
        const unique = [...new Set(outgoingInvites.map(i => i.toEmail))];
        return unique.sort();
    }, [outgoingInvites]);

    // Ordenação alfabética dos projetos
    const sortedMyProjects = useMemo(() => {
        return [...myProjects].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [myProjects]);

    const sortedSharedProjects = useMemo(() => {
        return [...sharedProjects].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [sharedProjects]);

    // --- FUNÇÕES DE EXPANSÃO ---
    const toggleExpand = (id) => {
        const newSet = new Set(expandedProjectIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedProjectIds(newSet);
    };

    // --- FUNÇÕES DE CHECKBOX ---
    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === sortedMyProjects.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sortedMyProjects.map(p => p.id)));
        }
    };

    // --- FUNÇÕES DE EMAIL MÚLTIPLO ---
    const addEmail = (email) => {
        const clean = email.trim();
        if (clean && !targetEmails.includes(clean)) {
            setTargetEmails([...targetEmails, clean]);
        }
        setEmailInput('');
    };

    const removeEmail = (email) => {
        setTargetEmails(targetEmails.filter(e => e !== email));
    };

    const handleKeyDownEmail = (e) => {
        if (['Enter', ',', ' '].includes(e.key)) {
            e.preventDefault();
            addEmail(emailInput);
        }
    };

    // --- EXECUÇÃO DAS AÇÕES EM MASSA ---
    const executeBulkAction = () => {
        if (targetEmails.length === 0) return;
        const idsArray = Array.from(selectedIds);

        if (bulkAction === 'SHARE') {
            onBulkShare(idsArray, targetEmails, sharePermission);
        } else if (bulkAction === 'TRANSFER') {
            if (targetEmails.length > 1) {
                alert("Para transferência, selecione apenas 1 e-mail.");
                return;
            }
            onBulkTransfer(idsArray, targetEmails[0]);
        }
        setBulkAction(null);
        setSelectedIds(new Set());
        setTargetEmails([]);
        setSharePermission('FULL_ACCESS');
    };

    // --- FUNÇÕES CRUD ---
    const handleCreate = () => {
        if (!newProjectName.trim()) return;
        onCreateProject(newProjectName);
        setNewProjectName('');
        setIsCreating(false);
    };

    const startEditing = (proj) => {
        setEditingId(proj.id);
        setEditNameValue(proj.name);
    };

    const saveEdit = (id) => {
        if (editNameValue.trim()) onRenameProject(id, editNameValue);
        setEditingId(null);
    };

    // Atalho de teclado para criar projeto (+)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // 1. Verifica se o usuário não está digitando em um input
            // Isso evita que o modal abra se você estiver escrevendo "2+2" em algum campo de texto
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

            if (isTyping) return;

            // 2. Verifica se a tecla pressionada foi '+' ou '=' (muitas vezes o + é Shift+=)
            // e.key === '+' cobre tanto o teclado numérico quanto o shift + =
            if (e.key === '+' || e.code === 'NumpadAdd') {
                e.preventDefault(); // Evita escrever o + na tela se possível
                setIsCreating(true);
            }

            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Limpeza do evento quando o componente desmontar
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <div className="projects-overlay" onClick={onClose}>
            <div className="projects-card" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="card-header mb-0">
                    <div className="header-title-group">
                        <FolderOpen size={20} />
                        <h3 className="header-title">Projetos & Colaboração</h3>
                    </div>
                    <button onClick={onClose} className="btn-close-header" title="Fechar">
                        <X size={20} />
                    </button>
                </div>

                {/* Abas */}
                <div className="tabs-bar">
                    <button onClick={() => setActiveTab('MY_PROJECTS')} className={`tab-item ${activeTab === 'MY_PROJECTS' ? 'tab-my-projects' : 'tab-inactive'}`}>
                        <Folder size={16} /> Meus Projetos
                    </button>
                    <button onClick={() => setActiveTab('SHARED')} className={`tab-item ${activeTab === 'SHARED' ? 'tab-shared' : 'tab-inactive'}`}>
                        <UserCheck size={16} /> Compartilhados
                    </button>
                    <button onClick={() => setActiveTab('INBOX')} className={`tab-item ${activeTab === 'INBOX' ? 'tab-inbox' : 'tab-inactive'}`}>
                        <Inbox size={16} /> Convites
                        {(pendingInvites.length > 0 || incomingTransfers.length > 0) && (
                            <span className="badge-notification">{pendingInvites.length + incomingTransfers.length}</span>
                        )}
                    </button>
                </div>

                {/* --- BARRA DE SELEÇÃO EM MASSA --- */}
                {activeTab === 'MY_PROJECTS' && sortedMyProjects.length > 0 && (
                    <div className="bulk-selection-bar">
                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                            <button
                                onClick={toggleSelectAll}
                                className="btn-checkbox"
                                title="Selecionar Todos"
                            >
                                {selectedIds.size === sortedMyProjects.length && sortedMyProjects.length > 0 ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                            </button>
                            <span className="font-bold text-sm text-gray-600 dark:text-gray-400">
                                Selecionar Todos ({selectedIds.size})
                            </span>
                        </div>

                        {selectedIds.size > 0 && (
                            <div className="actions-group">
                                <button
                                    onClick={() => { onBulkToggleVisibility(Array.from(selectedIds)); setSelectedIds(new Set()); }}
                                    className="btn-visibility vis-idle"
                                    title="Alternar Visibilidade"
                                >
                                    <Eye size={20} />
                                </button>
                                <button
                                    onClick={() => setBulkAction('SHARE')}
                                    className="btn-visibility vis-idle"
                                    title="Compartilhar Selecionados"
                                >
                                    <Share2 size={20} />
                                </button>
                                <button
                                    onClick={() => setBulkAction('TRANSFER')}
                                    className="btn-visibility vis-idle"
                                    title="Transferir Selecionados"
                                >
                                    <ArrowRightLeft size={20} />
                                </button>
                                <button
                                    onClick={() => { onBulkDelete(Array.from(selectedIds)); setSelectedIds(new Set()); }}
                                    className="btn-delete-project"
                                    title="Excluir Selecionados"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* --- CONTEÚDO DA LISTA --- */}
                <div className="content-area">

                    {/* INBOX */}
                    {activeTab === 'INBOX' && (
                        <div className="inbox-list">
                            {/* Transferências */}
                            {incomingTransfers.map(transfer => (
                                <div key={transfer.id} className="transfer-card">
                                    <div className="transfer-indicator"></div>
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle size={20} className="text-yellow-600" />
                                        <div>
                                            <p className="transfer-title">"{transfer.projectName}"</p>
                                            <p className="transfer-desc"><span className="font-bold">{transfer.fromEmail}</span> quer transferir a propriedade.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => onAcceptTransfer(transfer)} className="btn-accept-transfer">Aceitar Transferência</button>
                                </div>
                            ))}

                            {/* Convites */}
                            {pendingInvites.map(invite => (
                                <div key={invite.id} className="invite-card">
                                    <div className="flex items-start gap-3">
                                        <Share2 size={20} className="text-blue-500" />
                                        <div>
                                            <p className="invite-title">{invite.projectName}</p>
                                            <p className="invite-desc">De: <b>{invite.fromEmail}</b></p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <button onClick={() => onRespondInvite(invite, 'accepted')} className="btn-accept-invite">Aceitar</button>
                                        <button onClick={() => onRespondInvite(invite, 'rejected')} className="btn-reject-invite">Recusar</button>
                                    </div>
                                </div>
                            ))}

                            {pendingInvites.length === 0 && incomingTransfers.length === 0 && <div className="empty-state-msg">Nada pendente.</div>}
                        </div>
                    )}

                    {/* MEUS PROJETOS */}
                    {activeTab === 'MY_PROJECTS' && (
                        <div className="projects-list">
                            {sortedMyProjects.length === 0 ? (
                                <div className="empty-state-msg">Nenhum projeto criado.</div>
                            ) : (
                                sortedMyProjects.map(proj => {
                                    const isActive = activeProjectId === proj.id;
                                    const isVisible = visibleProjectIds.includes(proj.id);
                                    const isEditing = editingId === proj.id;
                                    const isSelected = selectedIds.has(proj.id);
                                    const isExpanded = expandedProjectIds.has(proj.id);
                                    const projectShares = outgoingInvites.filter(inv => inv.projectId === proj.id);

                                    return (
                                        <div key={proj.id} className={`project-card ${isSelected ? 'card-selected' : isActive ? 'card-active' : 'card-idle'}`}>
                                            <div className="project-card-header">
                                                <div className="flex items-center gap-3 overflow-hidden flex-1">

                                                    {/* CHECKBOX */}
                                                    <button onClick={() => toggleSelection(proj.id)} className="btn-checkbox">
                                                        {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                                    </button>

                                                    <div className="flex flex-col flex-1 min-w-0 mr-2">
                                                        {/* Título do Projeto */}
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-3">
                                                                <input autoFocus className="input-edit-name" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(proj.id); if (e.key === 'Escape') setEditingId(null); }} />
                                                                <button onClick={() => saveEdit(proj.id)} className="text-green-600" title="Salvar"><Check size={14} /></button>
                                                                <button onClick={() => setEditingId(null)} className="text-red-600" title="Cancelar"><X size={14} /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="title-row-group gap-3">
                                                                <span className={`project-name ${isActive ? 'name-active' : 'name-idle'}`} onClick={() => startEditing(proj)}>{proj.name}</span>
                                                                <button onClick={() => startEditing(proj)} className="btn-rename" title="Renomear"><Edit3 size={12} /></button>
                                                            </div>
                                                        )}

                                                        {/* Botões */}
                                                        <div className="actions-group">
                                                            {/* --- BOTÃO DE FOCO --- */}
                                                            <button
                                                                onClick={() => { onFocusProject(proj.id); setSelectedIds(new Set()); }}
                                                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                                                title="Localizar e Focar esse Projeto"
                                                            >
                                                                <Focus size={20} />
                                                            </button>

                                                            {/* BOTÃO DE ATIVAR/DESATIVAR PROJETO */}
                                                            <button
                                                                onClick={() => { onSetActive(proj); setSelectedIds(new Set()); }}
                                                                className={`btn-visibility ${isActive ? 'vis-active' : 'vis-idle'}`}
                                                                title={isActive ? "Desativar Projeto" : "Ativar Projeto"}
                                                            >
                                                                <PenTool size={20} />
                                                            </button>

                                                            {/* BOTÃO DE VISÍVEL/INVISÍVEL */}
                                                            <button
                                                                onClick={() => { onToggleVisibility(proj.id); setSelectedIds(new Set()); }}
                                                                className={`btn-visibility ${isVisible ? 'vis-active' : 'vis-idle'}`}
                                                                title={isVisible ? "Ocultar Projeto" : "Ver Projeto"}
                                                            >
                                                                {isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                                                            </button>

                                                            {/* BOTÃO DE COMPARTILHAR INDIVIDUAL */}
                                                            <button
                                                                onClick={() => { setSelectedIds(new Set([proj.id])); setBulkAction('SHARE'); }}
                                                                className="btn-visibility vis-idle"
                                                                title="Compartilhar Projeto"
                                                            >
                                                                <Share2 size={20} />
                                                            </button>

                                                            {/* BOTÃO DE TRANSFERIR INDIVIDUAL */}
                                                            <button
                                                                onClick={() => { setSelectedIds(new Set([proj.id])); setBulkAction('TRANSFER'); }}
                                                                className="btn-visibility vis-idle"
                                                                title="Transferir Projeto"
                                                            >
                                                                <ArrowRightLeft size={20} />
                                                            </button>

                                                            {/* BOTÃO PRA DELETAR PROJETO */}
                                                            <button
                                                                onClick={() => { onDeleteProject(proj.id); setSelectedIds(new Set()); }}
                                                                className="btn-visibility text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 hover:bg-white/30 dark:hover:bg-white/10"
                                                                title="Deletar Projeto"
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>

                                                        {/* Status e Accordion */}
                                                        <div className="status-row">
                                                            {isActive && <span className="status-badge-blue">● Editando</span>}
                                                            {isVisible && <span className="status-badge-green">● Visível</span>}

                                                            {/* Botão de Toggle do Accordion */}
                                                            {projectShares.length > 0 && (
                                                                <button
                                                                    onClick={() => toggleExpand(proj.id)}
                                                                    className={`btn-toggle-accordion ${isExpanded ? 'accordion-open' : 'accordion-closed'}`}
                                                                >
                                                                    <Users size={10} />
                                                                    {projectShares.length} acesso(s)
                                                                    {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Botões */}

                                            </div>

                                            {/* LISTA DE ACESSOS (ACCORDION) */}
                                            {isExpanded && projectShares.length > 0 && (
                                                <div className="accordion-content">
                                                    <p className="accordion-title"><Users size={10} /> Acesso concedido a:</p>
                                                    <div className="space-y-1">
                                                        {projectShares.map(share => (
                                                            <div key={share.id} className="share-row">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className={`status-dot ${share.status === 'accepted' ? 'bg-green-500' : 'bg-blue-400'}`} title={share.status === 'accepted' ? 'Aceito' : 'Pendente'}></div>
                                                                    <span className={`share-email ${share.status === 'pending' ? 'italic text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                        {share.toEmail}
                                                                    </span>
                                                                    {/* Badge de Permissão */}
                                                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${share.permission === 'READ_ONLY_GEOMETRY'
                                                                        ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                                                        : 'bg-green-500/20 text-green-600 dark:text-green-400'
                                                                        }`}>
                                                                        {share.permission === 'READ_ONLY_GEOMETRY' ? 'Técnico de Ativação' : 'Projetista'}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => onRevokeShare(share.id)}
                                                                    className="btn-revoke"
                                                                    title="Revogar Acesso"
                                                                >
                                                                    <UserMinus size={20} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* ABA COMPARTILHADOS COMIGO */}
                    {activeTab === 'SHARED' && (
                        <div className="projects-list">
                            {sortedSharedProjects.length === 0 ? (
                                <div className="empty-state-msg">Nenhum projeto compartilhado com você.</div>
                            ) : (
                                sortedSharedProjects.map(proj => {
                                    const isActive = activeProjectId === proj.id;
                                    const isVisible = visibleProjectIds.includes(proj.id);
                                    const isEditing = editingId === proj.id;
                                    const isSelected = selectedIds.has(proj.id);
                                    const isExpanded = expandedProjectIds.has(proj.id);
                                    const projectShares = outgoingInvites.filter(inv => inv.projectId === proj.id);

                                    return (
                                        <div key={proj.id} className={`project-card ${isSelected ? 'card-selected' : isActive ? 'card-active' : 'card-idle'}`}>
                                            <div className="project-card-header">
                                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                    <div className="flex flex-col flex-1 min-w-0 mr-2 gap-2">
                                                        <div className="title-row-group gap-3">
                                                            {/* Nome do Projeto */}
                                                            <span className={`font-bold text-sm truncate ${isActive ? 'name-active' : 'name-idle'}`}>{proj.name}</span>
                                                            {/* Badge de Permissão do Projeto Compartilhado */}
                                                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${proj.permission === 'READ_ONLY_GEOMETRY'
                                                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                                                : 'bg-green-500/20 text-green-600 dark:text-green-400'
                                                                }`}>
                                                                {proj.permission === 'READ_ONLY_GEOMETRY' ? 'Técnico de Ativação' : 'Projetista'}
                                                            </span>
                                                        </div>

                                                        {/* Botões */}
                                                        <div className="actions-group">
                                                            {/* --- BOTÃO DE FOCO --- */}
                                                            <button
                                                                onClick={() => { onFocusProject(proj.id); setSelectedIds(new Set()); }}
                                                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                                                title="Localizar e Focar esse Projeto"
                                                            >
                                                                <Focus size={20} />
                                                            </button>

                                                            {/* BOTÃO DE ATIVAR/DESATIVAR PROJETO (Oculto para Ativação) */}
                                                            {proj.permission !== 'READ_ONLY_GEOMETRY' && (
                                                                <button
                                                                    onClick={() => { onSetActive(proj); setSelectedIds(new Set()); }}
                                                                    className={`btn-visibility ${isActive ? 'vis-active' : 'vis-idle'}`}
                                                                    title={isActive ? "Desativar Projeto" : "Ativar Projeto"}
                                                                >
                                                                    <PenTool size={20} />
                                                                </button>
                                                            )}

                                                            {/* BOTÃO DE VISÍVEL/INVISÍVEL */}
                                                            <button
                                                                onClick={() => { onToggleVisibility(proj.id); setSelectedIds(new Set()); }}
                                                                className={`btn-visibility ${isVisible ? 'vis-active' : 'vis-idle'}`}
                                                                title={isVisible ? "Ocultar Projeto" : "Ver Projeto"}
                                                            >
                                                                {isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                                                            </button>
                                                        </div>

                                                        {/* Status e Accordion */}
                                                        <div className="status-row">
                                                            {isActive && <span className="status-badge-blue">● Editando</span>}
                                                            {isVisible && <span className="status-badge-green">● Visível</span>}
                                                            <span
                                                                title={proj.fromEmail}
                                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold bg-white/30 dark:bg-white/10 text-gray-600 dark:text-gray-300`}
                                                            >
                                                                <Users size={10} />
                                                                Dono: {proj.fromEmail || "Desconhecido"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* LISTA DE ACESSOS (ACCORDION) */}
                                            {isExpanded && projectShares.length > 0 && (
                                                <div className="accordion-content">
                                                    <p className="accordion-title"><Users size={10} /> Acesso concedido a:</p>
                                                    <div className="space-y-1">
                                                        {projectShares.map(share => (
                                                            <div key={share.id} className="share-row">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className={`status-dot ${share.status === 'accepted' ? 'bg-green-500' : 'bg-blue-400'}`} title={share.status === 'accepted' ? 'Aceito' : 'Pendente'}></div>
                                                                    <span className={`share-email ${share.status === 'pending' ? 'italic text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                        {share.toEmail}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => onRevokeShare(share.id)}
                                                                    className="btn-revoke"
                                                                    title="Revogar Acesso"
                                                                >
                                                                    <UserMinus size={20} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* --- FOOTER: CRIAÇÃO RÁPIDA --- */}
                {activeTab === 'MY_PROJECTS' && !bulkAction && (
                    <div className="footer-create">
                        {isCreating ? (
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    required
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                    placeholder="Novo projeto..."
                                    className="input-new-project"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreate();
                                        if (e.key === 'Escape') { setIsCreating(false); setNewProjectName(''); }
                                    }}
                                />
                                <button onClick={handleCreate} className="btn-confirm-create" title="Salvar"><Check size={18} /></button>
                                <button onClick={() => { setIsCreating(false); setNewProjectName(''); }} className="btn-cancel-create" title="Cancelar"><X size={18} /></button>
                            </div>
                        ) : (
                            <button onClick={() => setIsCreating(true)} className="btn-start-create" title="Criar Novo Projeto">
                                <Plus size={18} /> Criar Novo Projeto
                            </button>
                        )}
                    </div>
                )}

                {/* --- MODAL DE AÇÃO EM MASSA (OVERLAY) --- */}
                {bulkAction && (
                    <div className="bulk-action-overlay">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="bulk-title">
                                {bulkAction === 'SHARE' ? <Share2 className="text-blue-600" /> : <ArrowRightLeft className="text-blue-600" />}
                                {bulkAction === 'SHARE' ? 'Compartilhar em Massa' : 'Transferir Propriedade'}
                            </h3>
                            <button onClick={() => { setBulkAction(null); setTargetEmails([]); }} className="btn-close-header" title="Fechar"><X size={20} /></button>
                        </div>

                        <div className="flex-1 flex flex-col gap-4">
                            <div className="bulk-info-box">
                                Você selecionou <b>{selectedIds.size} projetos</b>.
                                {bulkAction === 'TRANSFER' && " Atenção: A transferência é irreversível após o aceite."}
                            </div>

                            <div className="flex-1">
                                <label className="bulk-input-label">
                                    {bulkAction === 'SHARE' ? 'Adicionar pessoas (E-mails)' : 'E-mail do novo proprietário'}
                                </label>

                                <div className="email-chips-container">
                                    {targetEmails.map(email => (
                                        <span key={email} className="email-chip">
                                            {email}
                                            <button onClick={() => removeEmail(email)} className="hover:text-red-500" title="Remover"><X size={12} /></button>
                                        </span>
                                    ))}
                                    <input
                                        value={emailInput}
                                        onChange={e => setEmailInput(e.target.value)}
                                        onKeyDown={handleKeyDownEmail}
                                        onBlur={() => addEmail(emailInput)}
                                        placeholder={targetEmails.length > 0 ? "" : "Digite e tecle Enter..."}
                                        className="input-email-add"
                                        autoFocus
                                    />
                                </div>

                                {/* Contatos Recentes */}
                                {recentContacts.length > 0 && (
                                    <div className="mt-4">
                                        <p className="recent-contacts-label">Contatos Recentes</p>
                                        <div className="flex flex-wrap gap-2">
                                            {recentContacts.map(contact => (
                                                <button
                                                    key={contact}
                                                    onClick={() => addEmail(contact)}
                                                    disabled={targetEmails.includes(contact)}
                                                    className="btn-recent-contact"
                                                >
                                                    {contact}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Seletor de Nível de Permissão (Apenas para SHARE) */}
                                {bulkAction === 'SHARE' && (
                                    <div className="mt-4">
                                        <p className="recent-contacts-label">Nível de Permissão</p>
                                        <div className="flex flex-col gap-2 mt-2">
                                            <label
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${sharePermission === 'FULL_ACCESS'
                                                    ? 'border-green-500/50 bg-green-500/10'
                                                    : 'border-transparent bg-white/5 hover:bg-white/10'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="permission"
                                                    value="FULL_ACCESS"
                                                    checked={sharePermission === 'FULL_ACCESS'}
                                                    onChange={() => setSharePermission('FULL_ACCESS')}
                                                    className="accent-green-500"
                                                />
                                                <div>
                                                    <span className="font-bold text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                                                        <UserPen size={14} /> Projetista
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        Pode ver todos os dados, editar e criar itens.
                                                    </span>
                                                </div>
                                            </label>
                                            <label
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${sharePermission === 'READ_ONLY_GEOMETRY'
                                                    ? 'border-yellow-500/50 bg-yellow-500/10'
                                                    : 'border-transparent bg-white/5 hover:bg-white/10'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="permission"
                                                    value="READ_ONLY_GEOMETRY"
                                                    checked={sharePermission === 'READ_ONLY_GEOMETRY'}
                                                    onChange={() => setSharePermission('READ_ONLY_GEOMETRY')}
                                                    className="accent-yellow-500"
                                                />
                                                <div>
                                                    <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                                                        <HardHat size={14} /> Técnico de Ativação
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        Vê apenas as CTOs
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={executeBulkAction}
                            disabled={targetEmails.length === 0}
                            className={`btn-execute-bulk ${targetEmails.length === 0
                                ? 'btn-disabled'
                                : bulkAction === 'SHARE' ? 'btn-execute-share' : 'btn-execute-transfer'
                                }`}
                        >
                            {bulkAction === 'SHARE' ? `Enviar Convites (${selectedIds.size} proj. x ${targetEmails.length} pessoas)` : 'Iniciar Transferência'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectManagerModal;