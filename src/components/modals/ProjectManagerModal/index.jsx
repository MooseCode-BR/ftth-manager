/*
 * Esse é o modal que mostra os projetos disponiveis, os projetos compartilhados, 
 * os convites pendentes, os convites enviados, as transferências recebidas e as transferências enviadas.
 * Em desktop, fica sempre aberto como uma sidebar do lado esquerdo da tela, em mobile, abre em tela cheia.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Folder, Trash2, Eye, EyeOff, Edit3, Check, PenTool, FolderOpen, Search,
    Share2, UserCheck, Inbox, UserMinus, Users, ArrowRightLeft, AlertTriangle,
    Square, CheckSquare, Plus, ChevronDown, ChevronUp, X, Focus, UserPen, HardHat, LogOut
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
    onUpdateSharePermission,
    onAcceptTransfer,
    onConfirmRequest,
    onAlertRequest,
    onClose,
    isOpen,
    isDarkMode
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

    // --- ESTADO E LÓGICA DE BUSCA (FILTRO) ---
    const [searchQuery, setSearchQuery] = useState('');

    // Função que remove acentos e transforma em minúsculo
    const normalizeText = (text) => {
        if (!text) return '';
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    // Filtros dinâmicos baseados no que foi digitado
    // 1. Meus Projetos
    const filteredMyProjects = useMemo(() => {
        if (!searchQuery) return sortedMyProjects;
        const query = normalizeText(searchQuery);
        return sortedMyProjects.filter(p => normalizeText(p.name).includes(query));
    }, [sortedMyProjects, searchQuery]);

    // 2. Projetos Compartilhados
    const filteredSharedProjects = useMemo(() => {
        if (!searchQuery) return sortedSharedProjects;
        const query = normalizeText(searchQuery);
        return sortedSharedProjects.filter(p => normalizeText(p.name).includes(query));
    }, [sortedSharedProjects, searchQuery]);

    // 3. Transferências Recebidas
    const filteredIncomingTransfers = useMemo(() => {
        if (!searchQuery) return incomingTransfers;
        const query = normalizeText(searchQuery);
        return incomingTransfers.filter(t => normalizeText(t.projectName).includes(query));
    }, [incomingTransfers, searchQuery]);

    // 4. Convites Pendentes
    const filteredPendingInvites = useMemo(() => {
        if (!searchQuery) return pendingInvites;
        const query = normalizeText(searchQuery);
        return pendingInvites.filter(i => normalizeText(i.projectName).includes(query));
    }, [pendingInvites, searchQuery]);

    // --- LÓGICA DE SELEÇÃO EM MASSA (INTELIGENTE COM O FILTRO) ---
    // 1. Variável que verifica se TODOS os projetos que estão na tela estão selecionados
    const isAllVisibleSelected = filteredMyProjects.length > 0 &&
        filteredMyProjects.every(p => selectedIds.has(p.id));

    // 2. A nova função de "Selecionar Todos"
    const toggleSelectAll = () => {
        // Criamos uma cópia da seleção atual para não perdermos o que já estava marcado em outras abas/buscas
        const newSelection = new Set(selectedIds);

        if (isAllVisibleSelected) {
            // Se todos da tela já estão selecionados, nós DESMARCAMOS apenas eles
            filteredMyProjects.forEach(p => newSelection.delete(p.id));
        } else {
            // Se faltar algum, nós MARCAMOS todos os que estão na tela
            filteredMyProjects.forEach(p => newSelection.add(p.id));
        }

        setSelectedIds(newSelection); // Atualiza o estado
    };

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

    // const toggleSelectAll = () => {
    //     if (selectedIds.size === sortedMyProjects.length) {
    //         setSelectedIds(new Set());
    //     } else {
    //         setSelectedIds(new Set(sortedMyProjects.map(p => p.id)));
    //     }
    // };

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
                if (onAlertRequest) {
                    onAlertRequest("Limite", "Para transferência em massa, selecione apenas 1 e-mail de destino.");
                } else {
                    alert("Para transferência, selecione apenas 1 e-mail.");
                }
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

    const mountTime = useRef(Date.now());

    const handleOverlayClick = (e) => {
        if (e.target !== e.currentTarget) return;
        if (Date.now() - mountTime.current < 250) return;
        onClose();
    };

    return (
        <div className={`
            /* 1. VISIBILIDADE: Esconde no mobile se estiver fechado, mas SEMPRE mostra no desktop */
            ${isOpen ? 'flex' : 'hidden'} lg:flex 
            
            /* 2. MOBILE: Tela cheia, sobrepondo tudo, sem glassmorphism */
            fixed inset-0 z-[100] w-full h-full 
            
            /* 3. DESKTOP: Painel lateral estático, com largura fixa, empurrando o app */
            lg:relative lg:w-[22rem] lg:h-full lg:border-r lg:border-gray-200 lg:dark:border-neutral-900 lg:z-10
            
            /* 4. TEMA: Fundo sólido, monocromático (Preto absoluto no Dark Mode) */
            bg-white text-black dark:bg-black dark:text-gray-100
            
            flex-col transition-colors duration-200
        `}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 lg:px-3 py-4 lg:py-3 border-b border-gray-200 dark:border-neutral-900 shrink-0">
                <div className="flex items-center gap-2">
                    <FolderOpen size={18} className="text-gray-800 dark:text-gray-200" />
                    <h3 className="font-bold text-base lg:text-sm text-black dark:text-white uppercase tracking-tight">Projetos & Colaboração</h3>
                </div>

                {/* Botão Fechar: Aparece apenas no mobile */}
                <button onClick={onClose} className="lg:hidden p-1.5 rounded text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors" title="Fechar">
                    <X size={20} />
                </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-gray-200 dark:border-neutral-900 shrink-0 px-2">
                <button
                    onClick={() => setActiveTab('MY_PROJECTS')}
                    className={`flex-1 py-3 lg:py-2 text-sm lg:text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors
                        ${activeTab === 'MY_PROJECTS'
                            ? 'border-black text-black dark:border-white dark:text-white'
                            : 'border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
                >
                    <Folder size={14} /> Meus
                </button>
                <button
                    onClick={() => setActiveTab('SHARED')}
                    className={`flex-1 py-3 lg:py-2 text-sm lg:text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors
                        ${activeTab === 'SHARED'
                            ? 'border-black text-black dark:border-white dark:text-white'
                            : 'border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
                >
                    <UserCheck size={14} /> Compart.
                </button>
                <button
                    onClick={() => setActiveTab('INBOX')}
                    className={`flex-1 py-3 lg:py-2 text-sm lg:text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors relative
                        ${activeTab === 'INBOX'
                            ? 'border-black text-black dark:border-white dark:text-white'
                            : 'border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
                >
                    <Inbox size={14} /> Convites
                    {(pendingInvites.length > 0 || incomingTransfers.length > 0) && (
                        <span className="absolute top-1.5 right-2 lg:right-3 bg-black text-white dark:bg-white dark:text-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                            {pendingInvites.length + incomingTransfers.length}
                        </span>
                    )}
                </button>
            </div>

            {/* --- BARRA DE BUSCA GERAL --- */}
            <div className="px-4 lg:px-3 py-3 border-b border-gray-200 dark:border-neutral-900 shrink-0">
                <div className="relative flex items-center">
                    <Search size={14} className="absolute left-3 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar projetos"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-base lg:text-xs rounded-lg outline-none transition-colors
                                   bg-gray-100 text-black border border-transparent focus:border-gray-300
                                   dark:bg-neutral-900 dark:text-white dark:focus:border-neutral-700"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* --- BARRA DE SELEÇÃO EM MASSA --- */}
            {activeTab === 'MY_PROJECTS' && filteredMyProjects.length > 0 && (
                <div className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 px-4 lg:px-3 py-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleSelectAll}
                            className="p-1 rounded text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                            title="Selecionar Todos"
                        >
                            {/* AQUI ESTÁ A MUDANÇA: Usamos a nossa nova variável isAllVisibleSelected */}
                            {isAllVisibleSelected
                                ? <CheckSquare size={16} className="text-black dark:text-white" />
                                : <Square size={16} />}
                        </button>
                        <span className="font-medium text-xs text-gray-600 dark:text-gray-400">
                            Selecionar Todos ({selectedIds.size})
                        </span>
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => { onBulkToggleVisibility(Array.from(selectedIds)); setSelectedIds(new Set()); }}
                                className="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-black dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
                                title="Alternar Visibilidade"
                            >
                                <Eye size={16} />
                            </button>
                            <button
                                onClick={() => setBulkAction('SHARE')}
                                className="p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-black dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
                                title="Compartilhar Selecionados"
                            >
                                <Share2 size={16} />
                            </button>
                            <button
                                onClick={() => { onBulkDelete(Array.from(selectedIds)); setSelectedIds(new Set()); }}
                                className="p-1.5 rounded text-gray-500 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-500 transition-colors"
                                title="Excluir Selecionados"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* --- CONTEÚDO DA LISTA --- */}
            <div className="flex-1 overflow-y-auto p-4 lg:px-3 lg:py-4 space-y-3">

                {/* INBOX */}
                {activeTab === 'INBOX' && (
                    <div className="space-y-3">
                        {/* Transferências */}
                        {filteredIncomingTransfers.map(transfer => (
                            <div key={transfer.id} className="p-3 rounded-lg border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 flex flex-col gap-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-black dark:bg-white"></div>
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-black dark:text-white mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm lg:text-xs font-bold text-black dark:text-white">"{transfer.projectName}"</p>
                                        <p className="text-xs lg:text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                                            <span className="font-bold text-black dark:text-gray-200">{transfer.fromEmail}</span> quer transferir a propriedade.
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => onAcceptTransfer(transfer)} className="w-full bg-black text-white dark:bg-white dark:text-black py-2 lg:py-1.5 rounded text-xs font-bold transition-opacity hover:opacity-80">
                                    Aceitar Transferência
                                </button>
                            </div>
                        ))}

                        {/* Convites */}
                        {filteredPendingInvites.map(invite => (
                            <div key={invite.id} className="p-3 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-black flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    <Share2 size={18} className="text-gray-800 dark:text-gray-200 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm lg:text-xs font-bold text-black dark:text-white">{invite.projectName}</p>
                                        <p className="text-xs lg:text-[11px] text-gray-500 dark:text-gray-400 mt-1">De: <span className="font-medium text-black dark:text-gray-200">{invite.fromEmail}</span></p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-1">
                                    <button onClick={() => onRespondInvite(invite, 'accepted')} className="flex-1 bg-black text-white dark:bg-white dark:text-black py-1.5 rounded text-xs font-bold hover:opacity-80 transition-opacity">Aceitar</button>
                                    <button onClick={() => onRespondInvite(invite, 'rejected')} className="flex-1 bg-gray-100 text-black dark:bg-neutral-800 dark:text-white py-1.5 rounded text-xs font-bold hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors">Recusar</button>
                                </div>
                            </div>
                        ))}

                        {filteredPendingInvites.length === 0 && filteredIncomingTransfers.length === 0 && (
                            <div className="text-center py-8 text-sm lg:text-xs font-medium text-gray-500 dark:text-gray-500">Nada pendente no momento.</div>
                        )}
                    </div>
                )}

                {/* MEUS PROJETOS */}
                {activeTab === 'MY_PROJECTS' && (
                    <div className="space-y-2.5">
                        {filteredMyProjects.length === 0 ? (
                            <div className="text-center py-8 text-sm lg:text-xs font-medium text-gray-500 dark:text-gray-500">Nenhum projeto criado.</div>
                        ) : (
                            filteredMyProjects.map(proj => {
                                const isActive = activeProjectId === proj.id;
                                const isVisible = visibleProjectIds.includes(proj.id);
                                const isEditing = editingId === proj.id;
                                const isSelected = selectedIds.has(proj.id);
                                const isExpanded = expandedProjectIds.has(proj.id);
                                const projectShares = outgoingInvites.filter(inv => inv.projectId === proj.id);

                                return (
                                    <div key={proj.id} className={`flex flex-col rounded-lg border transition-all overflow-hidden bg-white dark:bg-black
                                        ${isSelected ? 'border-gray-400 dark:border-neutral-500 bg-gray-50 dark:bg-neutral-900' :
                                            isActive ? 'border-black dark:border-white ring-1 ring-black dark:ring-white' :
                                                'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700'}`}>

                                        <div className="p-3 lg:p-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2.5 overflow-hidden flex-1">

                                                {/* CHECKBOX */}
                                                <button onClick={() => toggleSelection(proj.id)} className="shrink-0 p-1 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white transition-colors">
                                                    {isSelected ? <CheckSquare size={18} className="text-black dark:text-white" /> : <Square size={18} />}
                                                </button>

                                                <div className="flex flex-col flex-1 min-w-0 mr-1">
                                                    {/* Título do Projeto */}
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                autoFocus
                                                                className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-black text-black dark:text-white outline-none border-gray-300 dark:border-neutral-700 focus:border-black dark:focus:border-white"
                                                                value={editNameValue}
                                                                onChange={e => setEditNameValue(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(proj.id); if (e.key === 'Escape') setEditingId(null); }}
                                                            />
                                                            <button onClick={() => saveEdit(proj.id)} className="p-1 rounded text-black bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700" title="Salvar"><Check size={14} /></button>
                                                            <button onClick={() => setEditingId(null)} className="p-1 rounded text-gray-500 bg-gray-50 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white" title="Cancelar"><X size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 group">
                                                            <span className={`font-bold text-sm lg:text-xs truncate cursor-pointer transition-colors ${isActive ? 'text-black dark:text-white' : 'text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white'}`} onClick={() => startEditing(proj)}>
                                                                {proj.name}
                                                            </span>
                                                            <button onClick={() => startEditing(proj)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-black dark:hover:text-white transition-all" title="Renomear">
                                                                <Edit3 size={12} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Botões (Desktop compact style) */}
                                                    <div className="flex items-center gap-0.5 mt-1 shrink-0">
                                                        <button
                                                            onClick={() => { onFocusProject(proj.id); setSelectedIds(new Set()); }}
                                                            className="p-1.5 rounded text-gray-400 hover:text-black hover:bg-gray-100 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
                                                            title="Centralizar no Projeto"
                                                        >
                                                            <Focus size={14} />
                                                        </button>

                                                        <button
                                                            onClick={() => { onSetActive(proj); setSelectedIds(new Set()); }}
                                                            className={`p-1.5 rounded transition-colors ${isActive ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-400 hover:text-black hover:bg-gray-100 dark:hover:text-white dark:hover:bg-neutral-800'}`}
                                                            title={isActive ? "Desativar Edição de Projeto" : "Ativar Edição de Projeto"}
                                                        >
                                                            <PenTool size={14} />
                                                        </button>

                                                        <button
                                                            onClick={() => { onToggleVisibility(proj.id); setSelectedIds(new Set()); }}
                                                            className={`p-1.5 rounded transition-colors ${isVisible ? 'text-black bg-gray-100 dark:text-white dark:bg-neutral-800' : 'text-gray-400 hover:text-black hover:bg-gray-100 dark:hover:text-white dark:hover:bg-neutral-800'}`}
                                                            title={isVisible ? "Ocultar Projeto" : "Ver Projeto"}
                                                        >
                                                            {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                        </button>

                                                        <button
                                                            onClick={() => { setSelectedIds(new Set([proj.id])); setBulkAction('SHARE'); }}
                                                            className="p-1.5 rounded text-gray-400 hover:text-black hover:bg-gray-100 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
                                                            title="Compartilhar Projeto"
                                                        >
                                                            <Share2 size={14} />
                                                        </button>

                                                        <button
                                                            onClick={() => { onDeleteProject(proj.id); setSelectedIds(new Set()); }}
                                                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-500 transition-colors"
                                                            title="Deletar Projeto"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>

                                                    {/* Status e Accordion */}
                                                    <div className="flex items-center gap-2 mt-2 text-[10px] lg:text-[9px]">
                                                        {isActive && <span className="font-bold uppercase text-black dark:text-white">● Ativo</span>}
                                                        {isVisible && <span className="font-bold uppercase text-gray-500 dark:text-gray-400">● Visível</span>}

                                                        {projectShares.length > 0 && (
                                                            <button
                                                                onClick={() => toggleExpand(proj.id)}
                                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded flex-1 transition-colors font-bold uppercase
                                                                    ${isExpanded ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:hover:bg-neutral-700'}`}
                                                            >
                                                                <Users size={10} />
                                                                {projectShares.length} Acesso{projectShares.length > 1 ? 's' : ''}
                                                                {isExpanded ? <ChevronUp size={10} className="ml-auto" /> : <ChevronDown size={10} className="ml-auto" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* LISTA DE ACESSOS (ACCORDION) */}
                                        {isExpanded && projectShares.length > 0 && (
                                            <div className="bg-gray-50 dark:bg-neutral-900/50 px-3 lg:px-2.5 py-2 border-t border-gray-200 dark:border-neutral-800">
                                                <p className="font-bold text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1 uppercase tracking-wider text-[9px]">
                                                    <Users size={10} /> Compartilhado com:
                                                </p>
                                                <div className="space-y-1.5">
                                                    {projectShares.map(share => (
                                                        <div key={share.id} className="flex items-center justify-between bg-white dark:bg-black px-2 py-1.5 rounded border border-gray-200 dark:border-neutral-800 text-xs lg:text-[10px]">
                                                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                                {/* Dot de Status Sutil */}
                                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${share.status === 'accepted' ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-neutral-600'}`} title={share.status === 'accepted' ? 'Aceito' : 'Pendente'}></div>

                                                                <span className={`truncate flex-1 ${share.status === 'pending' ? 'italic text-gray-400' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                                                                    {share.toEmail}
                                                                </span>

                                                                {/* Toggle Permissão Minimalista */}
                                                                <button
                                                                    onClick={() => onUpdateSharePermission(share.id, share.permission === 'READ_ONLY_GEOMETRY' ? 'FULL_ACCESS' : 'READ_ONLY_GEOMETRY')}
                                                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest shrink-0 transition-colors border
                                                                        ${share.permission === 'READ_ONLY_GEOMETRY'
                                                                            ? 'bg-transparent text-gray-500 border-gray-300 dark:border-neutral-700 hover:text-black dark:hover:text-white'
                                                                            : 'bg-black text-white dark:bg-white dark:text-black border-transparent'}`}
                                                                    title={share.permission === 'READ_ONLY_GEOMETRY' ? 'Técnico de Ativação (Clique para mudar para Projetista)' : 'Projetista (Clique para mudar para Técnico)'}
                                                                >
                                                                    {share.permission === 'READ_ONLY_GEOMETRY' ? 'Ativação' : 'Projetista'}
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => onRevokeShare(share.id)}
                                                                className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0"
                                                                title="Revogar Acesso"
                                                            >
                                                                <UserMinus size={14} />
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
                    <div className="space-y-2.5">
                        {filteredSharedProjects.length === 0 ? (
                            <div className="text-center py-8 text-sm lg:text-xs font-medium text-gray-500 dark:text-gray-500">Nenhum projeto compartilhado.</div>
                        ) : (
                            filteredSharedProjects.map(proj => {
                                const isActive = activeProjectId === proj.id;
                                const isVisible = visibleProjectIds.includes(proj.id);
                                const isSelected = selectedIds.has(proj.id);
                                const isExpanded = expandedProjectIds.has(proj.id);
                                const projectShares = outgoingInvites.filter(inv => inv.projectId === proj.id);

                                return (
                                    <div key={proj.id} className={`flex flex-col rounded-lg border transition-all overflow-hidden bg-white dark:bg-black
                                        ${isSelected ? 'border-gray-400 dark:border-neutral-500 bg-gray-50 dark:bg-neutral-900' :
                                            isActive ? 'border-black dark:border-white ring-1 ring-black dark:ring-white' :
                                                'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700'}`}>

                                        <div className="p-3 lg:p-2.5 flex items-center justify-between">
                                            <div className="flex flex-col flex-1 min-w-0 mr-1 gap-1.5">

                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold text-sm lg:text-xs truncate transition-colors ${isActive ? 'text-black dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                                                        {proj.name}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 border
                                                        ${proj.permission === 'READ_ONLY_GEOMETRY'
                                                            ? 'bg-transparent text-gray-500 border-gray-300 dark:border-neutral-700'
                                                            : 'bg-black text-white dark:bg-white dark:text-black border-transparent'}`}>
                                                        {proj.permission === 'READ_ONLY_GEOMETRY' ? 'Ativação' : 'Projetista'}
                                                    </span>
                                                </div>

                                                {/* Botões */}
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    <button
                                                        onClick={() => { onFocusProject(proj.id); setSelectedIds(new Set()); }}
                                                        className="p-1.5 rounded text-gray-400 hover:text-black hover:bg-gray-100 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
                                                        title="Centralizar no Projeto"
                                                    >
                                                        <Focus size={14} />
                                                    </button>

                                                    {proj.permission !== 'READ_ONLY_GEOMETRY' && (
                                                        <button
                                                            onClick={() => { onSetActive(proj); setSelectedIds(new Set()); }}
                                                            className={`p-1.5 rounded transition-colors ${isActive ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-400 hover:text-black hover:bg-gray-100 dark:hover:text-white dark:hover:bg-neutral-800'}`}
                                                            title={isActive ? "Desativar Edição de Projeto" : "Ativar Edição de Projeto"}
                                                        >
                                                            <PenTool size={14} />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => { onToggleVisibility(proj.id); setSelectedIds(new Set()); }}
                                                        className={`p-1.5 rounded transition-colors ${isVisible ? 'text-black bg-gray-100 dark:text-white dark:bg-neutral-800' : 'text-gray-400 hover:text-black hover:bg-gray-100 dark:hover:text-white dark:hover:bg-neutral-800'}`}
                                                        title={isVisible ? "Ocultar Projeto" : "Ver Projeto"}
                                                    >
                                                        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                    </button>
                                                </div>

                                                {/* Status e Dono */}
                                                <div className="flex items-center gap-2 mt-1 text-[10px] lg:text-[9px]">
                                                    {isActive && <span className="font-bold uppercase text-black dark:text-white">● Ativo</span>}
                                                    {isVisible && <span className="font-bold uppercase text-gray-500 dark:text-gray-400">● Visível</span>}

                                                    <span className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-500 truncate max-w-[150px]">
                                                        <Users size={10} /> Dono: {proj.fromEmail || "Desconhecido"}
                                                    </span>

                                                    <button
                                                        onClick={() => onRevokeShare(proj.inviteId)}
                                                        className="ml-auto p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Sair do projeto"
                                                    >
                                                        <LogOut size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ACCORDION (Apenas se houver invites originados deste share, geralmente não tem, mas mantendo a lógica) */}
                                        {isExpanded && projectShares.length > 0 && (
                                            <div className="bg-gray-50 dark:bg-neutral-900/50 px-3 lg:px-2.5 py-2 border-t border-gray-200 dark:border-neutral-800">
                                                <p className="font-bold text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1 uppercase tracking-wider text-[9px]"><Users size={10} /> Compartilhado com:</p>
                                                <div className="space-y-1.5">
                                                    {projectShares.map(share => (
                                                        <div key={share.id} className="flex items-center justify-between bg-white dark:bg-black px-2 py-1.5 rounded border border-gray-200 dark:border-neutral-800 text-xs lg:text-[10px]">
                                                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${share.status === 'accepted' ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-neutral-600'}`}></div>
                                                                <span className={`truncate flex-1 ${share.status === 'pending' ? 'italic text-gray-400' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                                                                    {share.toEmail}
                                                                </span>
                                                            </div>
                                                            <button onClick={() => onRevokeShare(share.id)} className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0">
                                                                <UserMinus size={14} />
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
                <div className="p-4 lg:p-3 border-t border-gray-200 dark:border-neutral-900 bg-white dark:bg-black shrink-0">
                    {isCreating ? (
                        <div className="flex gap-2">
                            <input
                                autoFocus
                                required
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                placeholder="Nome do projeto..."
                                className="flex-1 px-3 lg:px-2 py-2 lg:py-1.5 rounded text-sm lg:text-xs outline-none bg-gray-50 dark:bg-neutral-900 text-black dark:text-white border border-gray-200 dark:border-neutral-800 focus:border-black dark:focus:border-white transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate();
                                    if (e.key === 'Escape') { setIsCreating(false); setNewProjectName(''); }
                                }}
                            />
                            <button onClick={handleCreate} className="bg-black dark:bg-white text-white dark:text-black px-3 rounded hover:opacity-80 transition-opacity flex items-center justify-center" title="Salvar"><Check size={16} /></button>
                            <button onClick={() => { setIsCreating(false); setNewProjectName(''); }} className="bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 px-3 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center" title="Cancelar"><X size={16} /></button>
                        </div>
                    ) : (
                        <button onClick={() => setIsCreating(true)} className="w-full py-2.5 lg:py-1.5 border border-dashed border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-900 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white flex items-center justify-center gap-2 text-sm lg:text-xs font-bold transition-all" title="Criar Novo Projeto">
                            <Plus size={16} /> Criar Novo Projeto
                        </button>
                    )}
                </div>
            )}

            {/* --- MODAL DE AÇÃO EM MASSA (OVERLAY) --- */}
            {bulkAction && (
                <div className="absolute inset-0 z-50 bg-white dark:bg-black flex flex-col p-5 lg:p-4 overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <h3 className="text-lg lg:text-base font-bold flex items-center gap-2 text-black dark:text-white">
                            {bulkAction === 'SHARE' ? <Share2 className="text-black dark:text-white" size={18} /> : <ArrowRightLeft className="text-black dark:text-white" size={18} />}
                            {bulkAction === 'SHARE' ? 'Compartilhar' : 'Transferir'}
                        </h3>
                        <button onClick={() => { setBulkAction(null); setTargetEmails([]); }} className="p-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors" title="Fechar"><X size={20} /></button>
                    </div>

                    <div className="flex-1 flex flex-col gap-4">
                        <div className="bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-3 rounded-lg text-sm lg:text-xs text-gray-800 dark:text-gray-200">
                            Selecionados: <b className="text-black dark:text-white">{selectedIds.size} projetos</b>.
                            {bulkAction === 'TRANSFER' && <span className="block mt-1 text-red-600 dark:text-red-400 font-bold">Atenção: A transferência é irreversível.</span>}
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm lg:text-xs font-bold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">
                                {bulkAction === 'SHARE' ? 'E-mails dos colaboradores' : 'E-mail do novo proprietário'}
                            </label>

                            <div className="border rounded-lg p-2 focus-within:border-black dark:focus-within:border-white bg-gray-50 dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 min-h-[80px] flex flex-wrap content-start gap-2 transition-colors">
                                {targetEmails.map(email => (
                                    <span key={email} className="bg-black text-white dark:bg-white dark:text-black px-2 py-1 rounded text-[10px] lg:text-[9px] font-bold uppercase flex items-center gap-1">
                                        {email}
                                        <button onClick={() => removeEmail(email)} className="hover:opacity-70" title="Remover"><X size={10} /></button>
                                    </span>
                                ))}
                                <input
                                    value={emailInput}
                                    onChange={e => setEmailInput(e.target.value)}
                                    onKeyDown={handleKeyDownEmail}
                                    onBlur={() => addEmail(emailInput)}
                                    placeholder={targetEmails.length > 0 ? "" : "Digite o e-mail e tecle Enter..."}
                                    className="flex-1 min-w-[150px] outline-none text-sm lg:text-xs bg-transparent text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                                    autoFocus
                                />
                            </div>

                            {/* Contatos Recentes */}
                            {recentContacts.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-[10px] lg:text-[9px] font-bold text-gray-500 dark:text-gray-500 uppercase mb-2 tracking-wider">Recentes</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {recentContacts.map(contact => (
                                            <button
                                                key={contact}
                                                onClick={() => addEmail(contact)}
                                                disabled={targetEmails.includes(contact)}
                                                className="px-2 py-1 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 rounded text-[10px] text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {contact}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Seletor de Nível de Permissão (Apenas para SHARE) */}
                            {bulkAction === 'SHARE' && (
                                <div className="mt-5">
                                    <p className="text-[10px] lg:text-[9px] font-bold text-gray-500 dark:text-gray-500 uppercase mb-2 tracking-wider">Nível de Acesso</p>
                                    <div className="flex flex-col gap-2">
                                        <label className={`flex items-center gap-3 p-3 lg:p-2 rounded-lg cursor-pointer border transition-all 
                                            ${sharePermission === 'FULL_ACCESS' ? 'border-black bg-gray-50 dark:border-white dark:bg-neutral-900 ring-1 ring-black dark:ring-white' : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700'}`}>
                                            <input type="radio" name="permission" value="FULL_ACCESS" checked={sharePermission === 'FULL_ACCESS'} onChange={() => setSharePermission('FULL_ACCESS')} className="hidden" />
                                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${sharePermission === 'FULL_ACCESS' ? 'border-black dark:border-white' : 'border-gray-300 dark:border-neutral-600'}`}>
                                                {sharePermission === 'FULL_ACCESS' && <div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full"></div>}
                                            </div>
                                            <div>
                                                <span className="font-bold text-sm lg:text-xs text-black dark:text-white flex items-center gap-1.5">
                                                    <UserPen size={14} /> Projetista
                                                </span>
                                                <span className="text-xs lg:text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">Edição e criação liberada.</span>
                                            </div>
                                        </label>

                                        <label className={`flex items-center gap-3 p-3 lg:p-2 rounded-lg cursor-pointer border transition-all 
                                            ${sharePermission === 'READ_ONLY_GEOMETRY' ? 'border-black bg-gray-50 dark:border-white dark:bg-neutral-900 ring-1 ring-black dark:ring-white' : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700'}`}>
                                            <input type="radio" name="permission" value="READ_ONLY_GEOMETRY" checked={sharePermission === 'READ_ONLY_GEOMETRY'} onChange={() => setSharePermission('READ_ONLY_GEOMETRY')} className="hidden" />
                                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${sharePermission === 'READ_ONLY_GEOMETRY' ? 'border-black dark:border-white' : 'border-gray-300 dark:border-neutral-600'}`}>
                                                {sharePermission === 'READ_ONLY_GEOMETRY' && <div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full"></div>}
                                            </div>
                                            <div>
                                                <span className="font-bold text-sm lg:text-xs text-black dark:text-white flex items-center gap-1.5">
                                                    <HardHat size={14} /> Técnico
                                                </span>
                                                <span className="text-xs lg:text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">Visualiza apenas mapa e caixas.</span>
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
                        className={`w-full py-3 lg:py-2.5 rounded-lg text-white dark:text-black font-bold text-sm transition-all mt-4 shrink-0
                            ${targetEmails.length === 0
                                ? 'bg-gray-300 dark:bg-neutral-800 text-gray-500 dark:text-gray-600 cursor-not-allowed'
                                : 'bg-black dark:bg-white hover:opacity-80 shadow-md'}`}
                    >
                        {bulkAction === 'SHARE' ? `Enviar Convite para ${targetEmails.length} pessoa(s)` : 'Iniciar Transferência'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProjectManagerModal;