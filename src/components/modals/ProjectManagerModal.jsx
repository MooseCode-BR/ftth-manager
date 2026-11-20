/*
 * Modal de gerenciamento de projetos, compartilhamentos, convites e transferências.
 * Comportamento unificado (visível/oculto) com abertura animada pela esquerda em todas as telas.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Folder, Trash2, Eye, EyeOff, Edit3, Check, PenTool, FolderOpen, Search, Tag,
    Share2, UserCheck, Inbox, UserMinus, Users, ArrowRightLeft, AlertTriangle, ArrowDownAZ, Clock,
    Square, CheckSquare, Plus, ChevronDown, ChevronUp, X, Focus, UserPen, HardHat, LogOut, MoreVertical
} from 'lucide-react';

const TABS = ['MY_PROJECTS', 'SHARED', 'INBOX'];

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
    onBulkRevokeShare,
    onUpdateSharePermission,
    onAcceptTransfer,
    onConfirmRequest,
    onAlertRequest,
    onClose,
    isOpen,
    isDarkMode,
    onOpenProjectTags,
    isLoadingProjects = false
}) => {
    const [activeTab, setActiveTab] = useState('MY_PROJECTS');
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editNameValue, setEditNameValue] = useState('');

    // --- ESTADO DE ORDENAÇÃO ---
    const [sortMode, setSortMode] = useState('ALPHABETICAL'); // 'ALPHABETICAL' | 'DATE'

    // --- ESTADOS DE EXPANSÃO DOS CARDS (Menu Lateral & Gerenciar Acessos) ---
    const [expandedMenuIds, setExpandedMenuIds] = useState(new Set());
    const [expandedAccessIds, setExpandedAccessIds] = useState(new Set());

    // --- MODO SELEÇÃO & AÇÕES EM MASSA ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState(null);

    // --- ESTADOS DO INPUT DE EMAIL MÚLTIPLO ---
    const [emailInput, setEmailInput] = useState('');
    const [targetEmails, setTargetEmails] = useState([]);

    // --- ESTADO DO NÍVEL DE PERMISSÃO ---
    const [sharePermission, setSharePermission] = useState('FULL_ACCESS');

    // --- BUSCA ---
    const [searchQuery, setSearchQuery] = useState('');

    // --- SWIPE HORIZONTAL INTERATIVO ENTRE ABAS (Mouse e Touch) ---
    const viewportRef = useRef(null);
    const swipeRef = useRef(null);
    const lastSwipeTimeRef = useRef(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    // Lista de contatos frequentes
    const recentContacts = useMemo(() => {
        const unique = [...new Set(outgoingInvites.map(i => i.toEmail))];
        return unique.sort();
    }, [outgoingInvites]);

    // Extrai timestamp de criação independente do formato do Firebase
    const getSortValue = (proj) => {
        if (!proj.createdAt) return 0;
        if (typeof proj.createdAt.toMillis === 'function') return proj.createdAt.toMillis();
        if (proj.createdAt.seconds) return proj.createdAt.seconds * 1000;
        return new Date(proj.createdAt).getTime() || 0;
    };

    const sortedMyProjects = useMemo(() => {
        const list = [...myProjects];
        if (sortMode === 'DATE') {
            return list.sort((a, b) => {
                const valA = getSortValue(a);
                const valB = getSortValue(b);
                if (valA === valB) return (a.name || '').localeCompare(b.name || '');
                return valB - valA;
            });
        }
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [myProjects, sortMode]);

    const sortedSharedProjects = useMemo(() => {
        const list = [...sharedProjects];
        if (sortMode === 'DATE') {
            return list.sort((a, b) => {
                const valA = getSortValue(a);
                const valB = getSortValue(b);
                if (valA === valB) return (a.name || '').localeCompare(b.name || '');
                return valB - valA;
            });
        }
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [sharedProjects, sortMode]);

    const normalizeText = (text) => {
        if (!text) return '';
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };

    const filteredMyProjects = useMemo(() => {
        if (!searchQuery) return sortedMyProjects;
        const query = normalizeText(searchQuery);
        return sortedMyProjects.filter(p => normalizeText(p.name).includes(query));
    }, [sortedMyProjects, searchQuery]);

    const filteredSharedProjects = useMemo(() => {
        if (!searchQuery) return sortedSharedProjects;
        const query = normalizeText(searchQuery);
        return sortedSharedProjects.filter(p => normalizeText(p.name).includes(query));
    }, [sortedSharedProjects, searchQuery]);

    const filteredIncomingTransfers = useMemo(() => {
        if (!searchQuery) return incomingTransfers;
        const query = normalizeText(searchQuery);
        return incomingTransfers.filter(t => normalizeText(t.projectName).includes(query));
    }, [incomingTransfers, searchQuery]);

    const filteredPendingInvites = useMemo(() => {
        if (!searchQuery) return pendingInvites;
        const query = normalizeText(searchQuery);
        return pendingInvites.filter(i => normalizeText(i.projectName).includes(query));
    }, [pendingInvites, searchQuery]);

    const activeList = activeTab === 'MY_PROJECTS'
        ? filteredMyProjects
        : (activeTab === 'SHARED' ? filteredSharedProjects : []);

    const isAllVisibleSelected = activeList.length > 0 &&
        activeList.every(p => selectedIds.has(p.id));

    // --- TROCA DE ABA ---
    const handleTabChange = (nextTab) => {
        if (nextTab === activeTab) return;
        setActiveTab(nextTab);
        setSelectedIds(new Set());
        setEditingId(null);
        if (nextTab === 'INBOX') {
            setIsSelectionMode(false);
        }
    };

    // --- MODO SELEÇÃO ---
    const toggleSelectionMode = () => {
        setIsSelectionMode(prev => {
            if (prev) {
                setSelectedIds(new Set());
            } else {
                setEditingId(null);
            }
            return !prev;
        });
    };

    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    };

    const toggleSelectAll = () => {
        const newSelection = new Set(selectedIds);
        if (isAllVisibleSelected) {
            activeList.forEach(p => newSelection.delete(p.id));
        } else {
            activeList.forEach(p => newSelection.add(p.id));
        }
        setSelectedIds(newSelection);
    };

    const toggleSelection = (id) => {
        if (Date.now() - lastSwipeTimeRef.current < 180) return;
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    // --- EXPANSÃO DO MENU DO CARD E ACESSOS ---
    const toggleMenuExpand = (id) => {
        if (Date.now() - lastSwipeTimeRef.current < 180) return;
        setExpandedMenuIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleAccessExpand = (id) => {
        setExpandedAccessIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // --- SWIPE HANDLERS INTERATIVOS (Mouse via Pointer Events + Touch 1 dedo via Touch Events não-passivos) ---
    const activeTabIndex = TABS.indexOf(activeTab);

    // Refs sempre atualizadas para os listeners nativos de touch (evita recriar listeners no meio do gesto)
    const swipeContextRef = useRef({ activeTabIndex, bulkAction, editingId, handleTabChange });
    swipeContextRef.current = { activeTabIndex, bulkAction, editingId, handleTabChange };

    // 1. TOUCH (Mobile / Tablet — 1 dedo com preventDefault não-passivo)
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;

        let touchState = null;

        const onTouchStart = (e) => {
            if (e.touches.length !== 1) {
                touchState = null;
                return;
            }
            const { bulkAction: curBulk, editingId: curEdit } = swipeContextRef.current;
            if (curBulk || curEdit) return;
            if (e.target.closest('input, textarea, select')) return;

            const t = e.touches[0];
            touchState = {
                id: t.identifier,
                startX: t.clientX,
                startY: t.clientY,
                lastX: t.clientX,
                startTime: Date.now(),
                axis: null,
                width: el.clientWidth || 368
            };
        };

        const onTouchMove = (e) => {
            if (!touchState) return;
            if (e.touches.length !== 1) {
                if (touchState.axis === 'x') {
                    setIsSwiping(false);
                    setDragOffset(0);
                }
                touchState = null;
                return;
            }

            const t = Array.from(e.touches).find(touch => touch.identifier === touchState.id) || e.touches[0];
            const dx = t.clientX - touchState.startX;
            const dy = t.clientY - touchState.startY;
            touchState.lastX = t.clientX;

            if (touchState.axis === null) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

                if (Math.abs(dx) > Math.abs(dy) * 1.15) {
                    touchState.axis = 'x';
                    setIsSwiping(true);
                } else {
                    touchState.axis = 'y';
                    return;
                }
            }

            if (touchState.axis === 'x') {
                // Impede o navegador mobile de roubar o gesto de 1 dedo para scroll/voltar
                if (e.cancelable) e.preventDefault();

                const { activeTabIndex: tabIdx } = swipeContextRef.current;
                const isAtLeftEdge = tabIdx === 0 && dx > 0;
                const isAtRightEdge = tabIdx === TABS.length - 1 && dx < 0;

                let effectiveDx = dx;
                if (isAtLeftEdge || isAtRightEdge) {
                    effectiveDx = dx * 0.28;
                } else {
                    const maxDrag = touchState.width;
                    effectiveDx = Math.max(-maxDrag, Math.min(maxDrag, dx));
                }

                setDragOffset(effectiveDx);
            }
        };

        const finishTouch = (e, cancelled) => {
            if (!touchState) return;
            const { axis, startX, lastX, startTime, width, id } = touchState;
            touchState = null;

            if (axis === 'x') {
                const changed = e.changedTouches
                    ? (Array.from(e.changedTouches).find(t => t.identifier === id) || e.changedTouches[0])
                    : null;
                const endX = changed ? changed.clientX : lastX;
                const rawDx = endX - startX;
                const dt = Math.max(1, Date.now() - startTime);
                const velocity = Math.abs(rawDx) / dt;
                const passedDistance = Math.abs(rawDx) > Math.min(width * 0.2, 75);
                const passedFlick = velocity > 0.3 && Math.abs(rawDx) > 30;

                const { activeTabIndex: tabIdx, handleTabChange: switchTab } = swipeContextRef.current;

                if (!cancelled && (passedDistance || passedFlick)) {
                    if (rawDx < 0 && tabIdx < TABS.length - 1) {
                        switchTab(TABS[tabIdx + 1]);
                    } else if (rawDx > 0 && tabIdx > 0) {
                        switchTab(TABS[tabIdx - 1]);
                    }
                }

                lastSwipeTimeRef.current = Date.now();
                setIsSwiping(false);
                setDragOffset(0);
            }
        };

        const onTouchEnd = (e) => finishTouch(e, false);
        const onTouchCancel = (e) => finishTouch(e, true);

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        el.addEventListener('touchcancel', onTouchCancel, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchCancel);
        };
    }, []);

    // 2. MOUSE (Desktop — Pointer Events apenas para mouse/caneta)
    const handlePointerDown = (e) => {
        if (e.pointerType === 'touch') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (bulkAction || editingId) return;
        if (e.target.closest('input, textarea, select')) return;

        swipeRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startTime: Date.now(),
            axis: null,
            width: viewportRef.current?.clientWidth || 368
        };
    };

    const handlePointerMove = (e) => {
        if (e.pointerType === 'touch') return;
        const swipe = swipeRef.current;
        if (!swipe || swipe.pointerId !== e.pointerId) return;

        const dx = e.clientX - swipe.startX;
        const dy = e.clientY - swipe.startY;

        if (swipe.axis === null) {
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

            if (Math.abs(dx) > Math.abs(dy) * 1.25) {
                swipe.axis = 'x';
                setIsSwiping(true);
                try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                    // Ignora caso o browser não permita capture
                }
            } else {
                swipe.axis = 'y';
                return;
            }
        }

        if (swipe.axis === 'x') {
            const isAtLeftEdge = activeTabIndex === 0 && dx > 0;
            const isAtRightEdge = activeTabIndex === TABS.length - 1 && dx < 0;

            let effectiveDx = dx;
            if (isAtLeftEdge || isAtRightEdge) {
                effectiveDx = dx * 0.28;
            } else {
                const maxDrag = swipe.width;
                effectiveDx = Math.max(-maxDrag, Math.min(maxDrag, dx));
            }

            setDragOffset(effectiveDx);
        }
    };

    const finishSwipe = (e, cancelled = false) => {
        if (e.pointerType === 'touch') return;
        const swipe = swipeRef.current;
        if (!swipe || swipe.pointerId !== e.pointerId) return;

        const { axis, startX, startTime, width } = swipe;
        swipeRef.current = null;

        try {
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch {
            // Ignora
        }

        if (axis === 'x') {
            const rawDx = e.clientX - startX;
            const dt = Math.max(1, Date.now() - startTime);
            const velocity = Math.abs(rawDx) / dt;
            const passedDistance = Math.abs(rawDx) > Math.min(width * 0.22, 85);
            const passedFlick = velocity > 0.35 && Math.abs(rawDx) > 35;

            if (!cancelled && (passedDistance || passedFlick)) {
                if (rawDx < 0 && activeTabIndex < TABS.length - 1) {
                    handleTabChange(TABS[activeTabIndex + 1]);
                } else if (rawDx > 0 && activeTabIndex > 0) {
                    handleTabChange(TABS[activeTabIndex - 1]);
                }
            }

            lastSwipeTimeRef.current = Date.now();
            setIsSwiping(false);
            setDragOffset(0);
        }
    };

    const handlePointerUp = (e) => finishSwipe(e, false);
    const handlePointerCancel = (e) => finishSwipe(e, true);

    const handleViewportClickCapture = (e) => {
        if (Date.now() - lastSwipeTimeRef.current < 180) {
            e.stopPropagation();
            e.preventDefault();
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
                if (onAlertRequest) {
                    onAlertRequest('Limite', 'Para transferência em massa, selecione apenas 1 e-mail de destino.');
                } else {
                    alert('Para transferência, selecione apenas 1 e-mail.');
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

    // Atalhos de teclado quando o modal está aberto
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
            if (isTyping) return;

            if (e.key === '+' || e.code === 'NumpadAdd') {
                e.preventDefault();
                setActiveTab('MY_PROJECTS');
                setIsCreating(true);
            }

            if (e.key === 'Escape') {
                if (editingId) {
                    setEditingId(null);
                } else if (bulkAction) {
                    setBulkAction(null);
                    setTargetEmails([]);
                } else if (isCreating) {
                    setIsCreating(false);
                    setNewProjectName('');
                } else if (isSelectionMode) {
                    exitSelectionMode();
                } else {
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, editingId, bulkAction, isCreating, isSelectionMode, onClose]);

    // Helper visual de hierarquia dos cards (contraste claro contra o fundo da lista)
    const getCardStateClasses = ({ isActive, isVisible }) => {
        if (isActive) {
            return 'relative bg-gradient-to-br from-blue-50 via-indigo-50/90 to-white dark:from-blue-950/95 dark:via-indigo-950/80 dark:to-[#131726] border border-blue-400/90 dark:border-blue-500/75 ring-2 ring-blue-500/20 dark:ring-blue-400/20 shadow-md shadow-blue-500/10 dark:shadow-lg dark:shadow-blue-950/60';
        }
        if (isVisible) {
            return 'relative bg-white dark:bg-[#17171a] border border-slate-200/90 dark:border-neutral-700/80 shadow-sm shadow-slate-900/[0.06] dark:shadow-md dark:shadow-black/50';
        }
        return 'relative bg-slate-200/55 dark:bg-[#101012] border border-slate-300/60 dark:border-neutral-800/80 shadow-none';
    };

    // Skeleton atualizado para o formato limpo de 2 linhas (sem poluição de bordas internas)
    const renderSkeletons = (count = 3) => {
        return Array.from({ length: count }).map((_, idx) => (
            <div
                key={`proj-skeleton-${idx}`}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-[#17171a] px-4 py-3 shadow-sm animate-pulse select-none"
            >
                <div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded-md w-2/3 max-w-[200px]" />
                <div className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="h-11 rounded-xl bg-slate-100 dark:bg-neutral-800/80" />
                        <div className="h-11 rounded-xl bg-slate-100 dark:bg-neutral-800/80" />
                        <div className="h-11 rounded-xl bg-slate-100 dark:bg-neutral-800/80" />
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-neutral-800/80 shrink-0" />
                </div>
            </div>
        ));
    };

    const totalInboxCount = pendingInvites.length + incomingTransfers.length;
    const swipeViewportWidth = swipeRef.current?.width || viewportRef.current?.clientWidth || 368;
    const indicatorDragPct = dragOffset !== 0 ? (-dragOffset / swipeViewportWidth) * 100 : 0;

    return (
        <aside
            aria-hidden={!isOpen}
            className={`
                fixed inset-y-0 left-0 z-[100] h-full w-full md:w-[23rem]
                md:border-r md:border-gray-200 md:dark:border-neutral-800
                bg-white text-black dark:bg-black dark:text-gray-100
                flex flex-col
                transform transition-transform duration-300 ease-in-out will-change-transform
                ${isOpen ? 'translate-x-0 pointer-events-auto shadow-2xl' : '-translate-x-full pointer-events-none shadow-none'}
            `}
        >
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 dark:border-neutral-800 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FolderOpen size={20} />
                    </div>
                    <h3 className="font-bold text-base text-black dark:text-white tracking-tight truncate">
                        Projetos
                    </h3>
                </div>

                {/* Botão Fechar: Sempre visível (Desktop e Mobile) */}
                <button
                    onClick={onClose}
                    className="h-10 w-10 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors shrink-0"
                    title="Ocultar painel de projetos"
                    aria-label="Ocultar painel de projetos"
                >
                    <X size={20} />
                </button>
            </div>

            {/* --- ABAS (Com indicador deslizante sincronizado ao swipe) --- */}
            <div className="relative flex border-b border-gray-200 dark:border-neutral-800 shrink-0 bg-gray-50/50 dark:bg-neutral-950/50">
                <button
                    onClick={() => handleTabChange('MY_PROJECTS')}
                    className={`flex-1 min-h-[48px] py-3 px-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        activeTab === 'MY_PROJECTS'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
                    }`}
                >
                    <Folder size={16} className="shrink-0" />
                    <span>Meus</span>
                </button>

                <button
                    onClick={() => handleTabChange('SHARED')}
                    className={`flex-1 min-h-[48px] py-3 px-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        activeTab === 'SHARED'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
                    }`}
                >
                    <UserCheck size={16} className="shrink-0" />
                    <span>Compart.</span>
                </button>

                <button
                    onClick={() => handleTabChange('INBOX')}
                    className={`flex-1 min-h-[48px] py-3 px-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors relative ${
                        activeTab === 'INBOX'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
                    }`}
                >
                    <Inbox size={16} className="shrink-0" />
                    <span>Convites</span>
                    {totalInboxCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-bold shadow-sm">
                            {totalInboxCount}
                        </span>
                    )}
                </button>

                {/* Barra indicadora animada que acompanha o arraste */}
                <div
                    className="absolute bottom-0 left-0 w-1/3 h-[2.5px] bg-blue-600 dark:bg-blue-400 rounded-full pointer-events-none will-change-transform"
                    style={{
                        transform: `translate3d(calc(${activeTabIndex * 100}% + ${indicatorDragPct}%), 0, 0)`,
                        transition: isSwiping ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)'
                    }}
                />
            </div>

            {/* --- BARRA DE BUSCA, ORDENAÇÃO E MODO SELEÇÃO --- */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-800 shrink-0 flex items-center gap-2">
                {/* Input de Busca */}
                <div className="relative flex flex-1 items-center min-w-0">
                    <Search size={16} className="absolute left-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar projetos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-9 text-sm rounded-xl outline-none transition-colors select-text
                                   bg-gray-100 text-black border border-gray-200 focus:border-blue-500
                                   dark:bg-neutral-900 dark:text-white dark:border-neutral-800 dark:focus:border-blue-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-1.5 h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-200/70 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors"
                            title="Limpar busca"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>

                {/* Botão de Ordenação */}
                <button
                    onClick={() => setSortMode(prev => prev === 'ALPHABETICAL' ? 'DATE' : 'ALPHABETICAL')}
                    className="h-11 w-11 shrink-0 flex items-center justify-center bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 rounded-xl text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                    title={sortMode === 'ALPHABETICAL' ? 'Ordenado de A-Z (Clique para ordenar por data)' : 'Mais recentes primeiro (Clique para ordenar de A-Z)'}
                >
                    {sortMode === 'ALPHABETICAL' ? <ArrowDownAZ size={18} /> : <Clock size={18} />}
                </button>

                {/* Botão de Ativar/Desativar Modo Seleção */}
                {(activeTab === 'MY_PROJECTS' || activeTab === 'SHARED') && (
                    <button
                        onClick={toggleSelectionMode}
                        className={`h-11 w-11 shrink-0 flex items-center justify-center rounded-xl border transition-all ${
                            isSelectionMode
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700'
                                : 'bg-gray-100 dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-neutral-700 hover:text-black dark:hover:text-white'
                        }`}
                        title={isSelectionMode ? 'Desativar Modo Seleção' : 'Ativar Modo Seleção'}
                        aria-pressed={isSelectionMode}
                    >
                        <CheckSquare size={18} />
                    </button>
                )}
            </div>

            {/* --- BARRA DE AÇÕES EM MASSA (APENAS NO MODO SELEÇÃO) --- */}
            {isSelectionMode && (activeTab === 'MY_PROJECTS' || activeTab === 'SHARED') && (
                <div className="bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/60 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
                    <button
                        onClick={toggleSelectAll}
                        disabled={activeList.length === 0}
                        className="h-10 px-2.5 rounded-xl flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-40"
                        title="Selecionar ou desmarcar todos"
                    >
                        {isAllVisibleSelected
                            ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
                            : <Square size={18} className="text-blue-600/70 dark:text-blue-400/70 shrink-0" />
                        }
                        <span>Todos ({selectedIds.size})</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                        {selectedIds.size > 0 && (
                            <>
                                <button
                                    onClick={() => {
                                        onBulkToggleVisibility(Array.from(selectedIds));
                                        setSelectedIds(new Set());
                                    }}
                                    className="h-10 w-10 rounded-xl flex items-center justify-center bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-sm"
                                    title="Ver / Ocultar Selecionados"
                                >
                                    <Eye size={18} />
                                </button>

                                {activeTab === 'MY_PROJECTS' && (
                                    <button
                                        onClick={() => setBulkAction('SHARE')}
                                        className="h-10 w-10 rounded-xl flex items-center justify-center bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-sm"
                                        title="Compartilhar Selecionados"
                                    >
                                        <Share2 size={18} />
                                    </button>
                                )}

                                {activeTab === 'MY_PROJECTS' ? (
                                    <button
                                        onClick={() => {
                                            onBulkDelete(Array.from(selectedIds));
                                            setSelectedIds(new Set());
                                        }}
                                        className="h-10 w-10 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/70 transition-colors shadow-sm"
                                        title="Excluir Selecionados"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            const invitesToRevoke = sharedProjects
                                                .filter(p => selectedIds.has(p.id))
                                                .map(p => p.inviteId);
                                            if (onBulkRevokeShare) onBulkRevokeShare(invitesToRevoke);
                                            setSelectedIds(new Set());
                                        }}
                                        className="h-10 w-10 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/70 transition-colors shadow-sm"
                                        title="Sair dos Projetos Selecionados"
                                    >
                                        <LogOut size={18} />
                                    </button>
                                )}
                            </>
                        )}

                        <button
                            onClick={exitSelectionMode}
                            className="h-10 px-2.5 rounded-xl flex items-center justify-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            title="Sair do Modo Seleção"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* --- CONTEÚDO DAS ABAS (Carrossel horizontal com fundo rebaixado para destacar os cards) --- */}
            <div
                ref={viewportRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onClickCapture={handleViewportClickCapture}
                style={{ touchAction: 'pan-y' }}
                className={`flex-1 min-h-0 overflow-hidden relative select-none bg-slate-100/90 dark:bg-[#09090b] ${isSwiping ? 'cursor-grabbing' : ''}`}
            >
                <div
                    className="flex h-full w-full will-change-transform"
                    style={{
                        transform: `translate3d(calc(${-activeTabIndex * 100}% + ${dragOffset}px), 0, 0)`,
                        transition: isSwiping ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)'
                    }}
                >
                    {/* PAINEL 1: MEUS PROJETOS */}
                    <div className="w-full h-full shrink-0 overflow-y-auto p-4 space-y-4 touch-pan-y">
                        {isLoadingProjects ? (
                            renderSkeletons(4)
                        ) : filteredMyProjects.length === 0 ? (
                            <div className="text-center py-12 text-sm font-medium text-gray-500 dark:text-gray-500">
                                Nenhum projeto encontrado.
                            </div>
                        ) : (
                            filteredMyProjects.map(proj => {
                                const isActive = activeProjectId === proj.id;
                                const isVisible = visibleProjectIds.includes(proj.id);
                                const isEditing = editingId === proj.id;
                                const isSelected = selectedIds.has(proj.id);
                                const isMenuExpanded = expandedMenuIds.has(proj.id);
                                const isAccessExpanded = expandedAccessIds.has(proj.id);
                                const projectShares = outgoingInvites.filter(inv => inv.projectId === proj.id);

                                // --- MODO SELEÇÃO: apenas caixa de seleção + nome do projeto ---
                                if (isSelectionMode) {
                                    return (
                                        <button
                                            key={proj.id}
                                            type="button"
                                            onClick={() => toggleSelection(proj.id)}
                                            className={`w-full min-h-[54px] px-4 py-3 rounded-2xl border flex items-center gap-3 text-left transition-all active:scale-[0.99] ${
                                                isSelected
                                                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/60 text-blue-950 dark:text-blue-50 ring-2 ring-blue-500/20 shadow-sm'
                                                    : 'border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-[#17171a] text-gray-800 dark:text-gray-200 shadow-sm shadow-slate-900/[0.04] hover:border-slate-300 dark:hover:border-neutral-700'
                                            }`}
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={22} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                            ) : (
                                                <Square size={22} className="text-gray-400 dark:text-neutral-500 shrink-0" />
                                            )}
                                            <span className="font-bold text-sm truncate flex-1">{proj.name}</span>
                                        </button>
                                    );
                                }

                                // --- MODO NORMAL: 2 linhas limpas + faixa lateral de estado ---
                                return (
                                    <div
                                        key={proj.id}
                                        className={`flex flex-col rounded-2xl transition-all overflow-hidden ${getCardStateClasses({
                                            isActive,
                                            isVisible,
                                            isMenuExpanded,
                                            isEditing
                                        })}`}
                                    >
                                        {/* Faixa lateral de cor indicando estado */}
                                        {isActive ? (
                                            <div className="absolute inset-y-0 left-0 w-1 bg-blue-600 dark:bg-blue-400 pointer-events-none" />
                                        ) : isVisible ? (
                                            <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500 dark:bg-emerald-400 pointer-events-none" />
                                        ) : null}

                                        <div className="pl-4 pr-3.5 py-3 flex flex-col gap-2">
                                            {/* LINHA 1: Título (+ badge apenas quando Em Edição) */}
                                            {isEditing ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        autoFocus
                                                        className="flex-1 min-w-0 h-10 px-3 text-sm rounded-xl border-2 bg-white dark:bg-black text-black dark:text-white outline-none border-blue-500 dark:border-blue-400 select-text"
                                                        value={editNameValue}
                                                        onChange={e => setEditNameValue(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') saveEdit(proj.id);
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => saveEdit(proj.id)}
                                                        className="h-10 w-10 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                                                        title="Salvar nome"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="h-10 w-10 shrink-0 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-gray-200 flex items-center justify-center transition-colors"
                                                        title="Cancelar"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-2 min-w-0 min-h-[24px]">
                                                    <span
                                                        className={`truncate text-[15px] leading-tight ${
                                                            isActive
                                                                ? 'font-extrabold text-blue-950 dark:text-blue-50'
                                                                : 'font-bold text-slate-900 dark:text-white'
                                                        }`}
                                                        title={proj.name}
                                                    >
                                                        {proj.name}
                                                    </span>

                                                    {isActive && (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-600 text-white dark:bg-blue-500 shadow-sm">
                                                            Em Edição
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* LINHA 2: 3 botões principais + Botão de Menu à direita (sem bordas competindo com o card) */}
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
                                                    {/* 1. Centralizar */}
                                                    <button
                                                        onClick={() => onFocusProject(proj.id)}
                                                        className={`h-11 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-[0.97] ${
                                                            isActive
                                                                ? 'bg-white/80 hover:bg-white dark:bg-blue-900/45 dark:hover:bg-blue-900/70 text-blue-800 dark:text-blue-200'
                                                                : isVisible
                                                                    ? 'bg-slate-100 hover:bg-slate-200/80 dark:bg-neutral-800/85 dark:hover:bg-neutral-700/90 text-slate-700 dark:text-neutral-200'
                                                                    : 'bg-white/65 hover:bg-white dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
                                                        }`}
                                                        title="Centralizar no Projeto"
                                                    >
                                                        <Focus size={17} className="shrink-0" />
                                                        <span className="truncate">Focar</span>
                                                    </button>

                                                    {/* 2. Ativar Edição */}
                                                    <button
                                                        onClick={() => onSetActive(proj)}
                                                        className={`h-11 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-[0.97] ${
                                                            isActive
                                                                ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white shadow-sm'
                                                                : isVisible
                                                                    ? 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 dark:bg-neutral-800/85 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-700 dark:text-neutral-200'
                                                                    : 'bg-white/65 hover:bg-blue-50 hover:text-blue-700 dark:bg-neutral-900/90 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-500 dark:text-neutral-400'
                                                        }`}
                                                        title={isActive ? 'Desativar Edição de Projeto' : 'Ativar Edição de Projeto'}
                                                    >
                                                        <PenTool size={17} className="shrink-0" />
                                                        <span className="truncate">Editar</span>
                                                    </button>

                                                    {/* 3. Ver / Ocultar Projeto */}
                                                    <button
                                                        onClick={() => onToggleVisibility(proj.id)}
                                                        className={`h-11 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-[0.97] ${
                                                            isVisible
                                                                ? isActive
                                                                    ? 'bg-indigo-500/15 hover:bg-indigo-500/25 dark:bg-indigo-400/20 dark:hover:bg-indigo-400/30 text-indigo-800 dark:text-indigo-200'
                                                                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                                                : 'bg-white/65 hover:bg-white dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
                                                        }`}
                                                        title={isVisible ? 'Ocultar Projeto' : 'Ver Projeto'}
                                                    >
                                                        {isVisible ? <Eye size={17} className="shrink-0" /> : <EyeOff size={17} className="shrink-0" />}
                                                        <span className="truncate">{isVisible ? 'Visível' : 'Ver'}</span>
                                                    </button>
                                                </div>

                                                {/* BOTÃO DE MENU À DIREITA (mesma linha dos botões) */}
                                                <button
                                                    onClick={() => toggleMenuExpand(proj.id)}
                                                    aria-expanded={isMenuExpanded}
                                                    className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-[0.96] ${
                                                        isMenuExpanded
                                                            ? 'bg-blue-600 text-white dark:bg-blue-500 shadow-sm'
                                                            : isActive
                                                                ? 'bg-white/80 hover:bg-white dark:bg-blue-900/45 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-200'
                                                                : isVisible
                                                                    ? 'bg-slate-100 hover:bg-slate-200/80 dark:bg-neutral-800/85 dark:hover:bg-neutral-700/90 text-slate-600 dark:text-neutral-300'
                                                                    : 'bg-white/65 hover:bg-white dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                                                    }`}
                                                    title={isMenuExpanded ? 'Fechar opções' : 'Mais opções do projeto'}
                                                >
                                                    {isMenuExpanded ? <ChevronUp size={20} /> : <MoreVertical size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* --- MENU EXPANSÍVEL DO CARD (MEUS PROJETOS) --- */}
                                        {isMenuExpanded && (
                                            <div className={`px-3.5 pb-3.5 pt-3 border-t space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150 ${
                                                isActive
                                                    ? 'border-blue-200/80 dark:border-blue-800/80 bg-white/55 dark:bg-blue-950/40'
                                                    : 'border-gray-200 dark:border-neutral-800 bg-gray-50/90 dark:bg-neutral-950/60'
                                            }`}>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedIds(new Set([proj.id]));
                                                            setBulkAction('SHARE');
                                                        }}
                                                        className="h-10 px-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                                                    >
                                                        <Share2 size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
                                                        <span className="truncate">Compartilhar</span>
                                                    </button>

                                                    <button
                                                        onClick={() => onOpenProjectTags(proj)}
                                                        className="h-10 px-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                                                    >
                                                        <Tag size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
                                                        <span className="truncate">Gerenciar Tags</span>
                                                    </button>

                                                    <button
                                                        onClick={() => startEditing(proj)}
                                                        className="h-10 px-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                                                    >
                                                        <Edit3 size={16} className="shrink-0 text-gray-600 dark:text-gray-300" />
                                                        <span className="truncate">Renomear</span>
                                                    </button>

                                                    <button
                                                        onClick={() => toggleAccessExpand(proj.id)}
                                                        className={`h-10 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${
                                                            isAccessExpanded
                                                                ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                                                                : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-800 dark:text-gray-100'
                                                        }`}
                                                    >
                                                        <Users size={16} className="shrink-0" />
                                                        <span className="truncate">
                                                            Acessos{projectShares.length > 0 ? ` (${projectShares.length})` : ''}
                                                        </span>
                                                        {isAccessExpanded
                                                            ? <ChevronUp size={14} className="shrink-0" />
                                                            : <ChevronDown size={14} className="shrink-0" />
                                                        }
                                                    </button>
                                                </div>

                                                {/* Sub-painel: Gerenciar quem tem acesso */}
                                                {isAccessExpanded && (
                                                    <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-2">
                                                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <Users size={13} /> Quem tem acesso
                                                        </p>

                                                        {projectShares.length === 0 ? (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 py-1">
                                                                Nenhum colaborador compartilhado ainda.
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {projectShares.map(share => (
                                                                    <div
                                                                        key={share.id}
                                                                        className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-black px-2.5 py-2 rounded-xl border border-gray-200 dark:border-neutral-800"
                                                                    >
                                                                        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                                                            <div
                                                                                className={`w-2 h-2 rounded-full shrink-0 ${
                                                                                    share.status === 'accepted'
                                                                                        ? 'bg-emerald-500'
                                                                                        : 'bg-amber-400'
                                                                                }`}
                                                                                title={share.status === 'accepted' ? 'Aceito' : 'Pendente'}
                                                                            />
                                                                            <span
                                                                                className={`text-xs truncate flex-1 ${
                                                                                    share.status === 'pending'
                                                                                        ? 'italic text-gray-400'
                                                                                        : 'font-semibold text-gray-800 dark:text-gray-200'
                                                                                }`}
                                                                                title={share.toEmail}
                                                                            >
                                                                                {share.toEmail}
                                                                            </span>
                                                                        </div>

                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            <button
                                                                                onClick={() => onUpdateSharePermission(
                                                                                    share.id,
                                                                                    share.permission === 'READ_ONLY_GEOMETRY' ? 'FULL_ACCESS' : 'READ_ONLY_GEOMETRY'
                                                                                )}
                                                                                className={`min-h-[34px] px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors border ${
                                                                                    share.permission === 'READ_ONLY_GEOMETRY'
                                                                                        ? 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-neutral-700 hover:text-black dark:hover:text-white'
                                                                                        : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                                                                }`}
                                                                                title={share.permission === 'READ_ONLY_GEOMETRY'
                                                                                    ? 'Técnico de Ativação (Clique para mudar para Projetista)'
                                                                                    : 'Projetista (Clique para mudar para Ativação)'}
                                                                            >
                                                                                {share.permission === 'READ_ONLY_GEOMETRY' ? 'Ativação' : 'Projetista'}
                                                                            </button>

                                                                            <button
                                                                                onClick={() => onRevokeShare(share.id)}
                                                                                className="h-[34px] w-[34px] rounded-lg flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 transition-colors shrink-0"
                                                                                title="Revogar Acesso"
                                                                            >
                                                                                <UserMinus size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Botão Excluir */}
                                                <button
                                                    onClick={() => onDeleteProject(proj.id)}
                                                    className="w-full h-10 px-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/90 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                    <span>Excluir Projeto</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* PAINEL 2: COMPARTILHADOS COMIGO */}
                    <div className="w-full h-full shrink-0 overflow-y-auto p-4 space-y-4 touch-pan-y">
                        {isLoadingProjects ? (
                            renderSkeletons(2)
                        ) : filteredSharedProjects.length === 0 ? (
                            <div className="text-center py-12 text-sm font-medium text-gray-500 dark:text-gray-500">
                                Nenhum projeto compartilhado.
                            </div>
                        ) : (
                            filteredSharedProjects.map(proj => {
                                const isActive = activeProjectId === proj.id;
                                const isVisible = visibleProjectIds.includes(proj.id);
                                const isSelected = selectedIds.has(proj.id);
                                const isMenuExpanded = expandedMenuIds.has(proj.id);
                                const canEdit = proj.permission !== 'READ_ONLY_GEOMETRY';
                                const projectShares = outgoingInvites.filter(inv => inv.projectId === proj.id);

                                // --- MODO SELEÇÃO: apenas caixa de seleção + nome do projeto ---
                                if (isSelectionMode) {
                                    return (
                                        <button
                                            key={proj.id}
                                            type="button"
                                            onClick={() => toggleSelection(proj.id)}
                                            className={`w-full min-h-[54px] px-4 py-3 rounded-2xl border flex items-center gap-3 text-left transition-all active:scale-[0.99] ${
                                                isSelected
                                                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/60 text-blue-950 dark:text-blue-50 ring-2 ring-blue-500/20 shadow-sm'
                                                    : 'border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-[#17171a] text-gray-800 dark:text-gray-200 shadow-sm shadow-slate-900/[0.04] hover:border-slate-300 dark:hover:border-neutral-700'
                                            }`}
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={22} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                            ) : (
                                                <Square size={22} className="text-gray-400 dark:text-neutral-500 shrink-0" />
                                            )}
                                            <span className="font-bold text-sm truncate flex-1">{proj.name}</span>
                                        </button>
                                    );
                                }

                                // --- MODO NORMAL ---
                                return (
                                    <div
                                        key={proj.id}
                                        className={`flex flex-col rounded-2xl transition-all overflow-hidden ${getCardStateClasses({
                                            isActive,
                                            isVisible,
                                            isMenuExpanded,
                                            isEditing: false
                                        })}`}
                                    >
                                        {/* Faixa lateral de cor indicando estado */}
                                        {isActive ? (
                                            <div className="absolute inset-y-0 left-0 w-1 bg-blue-600 dark:bg-blue-400 pointer-events-none" />
                                        ) : isVisible ? (
                                            <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500 dark:bg-emerald-400 pointer-events-none" />
                                        ) : null}

                                        <div className="pl-4 pr-3.5 py-3 flex flex-col gap-2">
                                            {/* LINHA 1: Título (+ badge apenas quando Em Edição) */}
                                            <div className="flex items-center justify-between gap-2 min-w-0 min-h-[24px]">
                                                <span
                                                    className={`truncate text-[15px] leading-tight ${
                                                        isActive
                                                            ? 'font-extrabold text-blue-950 dark:text-blue-50'
                                                            : 'font-bold text-slate-900 dark:text-white'
                                                    }`}
                                                    title={proj.name}
                                                >
                                                    {proj.name}
                                                </span>

                                                {isActive && (
                                                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-600 text-white dark:bg-blue-500 shadow-sm">
                                                        Em Edição
                                                    </span>
                                                )}
                                            </div>

                                            {/* LINHA 2: Botões principais + Botão de Menu à direita (sem bordas competindo com o card) */}
                                            <div className="flex items-center gap-2">
                                                <div className={`flex-1 min-w-0 grid gap-2 ${canEdit ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                                    <button
                                                        onClick={() => onFocusProject(proj.id)}
                                                        className={`h-11 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-[0.97] ${
                                                            isActive
                                                                ? 'bg-white/80 hover:bg-white dark:bg-blue-900/45 dark:hover:bg-blue-900/70 text-blue-800 dark:text-blue-200'
                                                                : isVisible
                                                                    ? 'bg-slate-100 hover:bg-slate-200/80 dark:bg-neutral-800/85 dark:hover:bg-neutral-700/90 text-slate-700 dark:text-neutral-200'
                                                                    : 'bg-white/65 hover:bg-white dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
                                                        }`}
                                                        title="Centralizar no Projeto"
                                                    >
                                                        <Focus size={17} className="shrink-0" />
                                                        <span className="truncate">Focar</span>
                                                    </button>

                                                    {canEdit && (
                                                        <button
                                                            onClick={() => onSetActive(proj)}
                                                            className={`h-11 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-[0.97] ${
                                                                isActive
                                                                    ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white shadow-sm'
                                                                    : isVisible
                                                                        ? 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 dark:bg-neutral-800/85 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-700 dark:text-neutral-200'
                                                                        : 'bg-white/65 hover:bg-blue-50 hover:text-blue-700 dark:bg-neutral-900/90 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-500 dark:text-neutral-400'
                                                            }`}
                                                            title={isActive ? 'Desativar Edição de Projeto' : 'Ativar Edição de Projeto'}
                                                        >
                                                            <PenTool size={17} className="shrink-0" />
                                                            <span className="truncate">Editar</span>
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => onToggleVisibility(proj.id)}
                                                        className={`h-11 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-[0.97] ${
                                                            isVisible
                                                                ? isActive
                                                                    ? 'bg-indigo-500/15 hover:bg-indigo-500/25 dark:bg-indigo-400/20 dark:hover:bg-indigo-400/30 text-indigo-800 dark:text-indigo-200'
                                                                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                                                : 'bg-white/65 hover:bg-white dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
                                                        }`}
                                                        title={isVisible ? 'Ocultar Projeto' : 'Ver Projeto'}
                                                    >
                                                        {isVisible ? <Eye size={17} className="shrink-0" /> : <EyeOff size={17} className="shrink-0" />}
                                                        <span className="truncate">{isVisible ? 'Visível' : 'Ver'}</span>
                                                    </button>
                                                </div>

                                                {/* BOTÃO DE MENU À DIREITA (mesma linha dos botões) */}
                                                <button
                                                    onClick={() => toggleMenuExpand(proj.id)}
                                                    aria-expanded={isMenuExpanded}
                                                    className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-[0.96] ${
                                                        isMenuExpanded
                                                            ? 'bg-blue-600 text-white dark:bg-blue-500 shadow-sm'
                                                            : isActive
                                                                ? 'bg-white/80 hover:bg-white dark:bg-blue-900/45 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-200'
                                                                : isVisible
                                                                    ? 'bg-slate-100 hover:bg-slate-200/80 dark:bg-neutral-800/85 dark:hover:bg-neutral-700/90 text-slate-600 dark:text-neutral-300'
                                                                    : 'bg-white/65 hover:bg-white dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                                                    }`}
                                                    title={isMenuExpanded ? 'Fechar opções' : 'Mais opções do projeto'}
                                                >
                                                    {isMenuExpanded ? <ChevronUp size={20} /> : <MoreVertical size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* --- MENU EXPANSÍVEL DO CARD (COMPARTILHADOS) --- */}
                                        {isMenuExpanded && (
                                            <div className={`px-3.5 pb-3.5 pt-3 border-t space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150 ${
                                                isActive
                                                    ? 'border-blue-200/80 dark:border-blue-800/80 bg-white/55 dark:bg-blue-950/40'
                                                    : 'border-gray-200 dark:border-neutral-800 bg-gray-50/90 dark:bg-neutral-950/60'
                                            }`}>
                                                <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-xs">
                                                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 truncate min-w-0">
                                                        <Users size={14} className="shrink-0 text-gray-400" />
                                                        <span className="truncate">Dono: <strong className="text-black dark:text-white">{proj.fromEmail || 'Desconhecido'}</strong></span>
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                                                        proj.permission === 'READ_ONLY_GEOMETRY'
                                                            ? 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300'
                                                            : 'bg-blue-600 text-white'
                                                    }`}>
                                                        {proj.permission === 'READ_ONLY_GEOMETRY' ? 'Ativação' : 'Projetista'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => onOpenProjectTags(proj)}
                                                        className="h-10 px-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                                                    >
                                                        <Tag size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
                                                        <span className="truncate">Gerenciar Tags</span>
                                                    </button>

                                                    <button
                                                        onClick={() => onRevokeShare(proj.inviteId)}
                                                        className="h-10 px-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/90 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                                                    >
                                                        <LogOut size={16} className="shrink-0" />
                                                        <span className="truncate">Sair do Projeto</span>
                                                    </button>
                                                </div>

                                                {projectShares.length > 0 && (
                                                    <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-2">
                                                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <Users size={13} /> Compartilhado com:
                                                        </p>
                                                        <div className="space-y-1.5">
                                                            {projectShares.map(share => (
                                                                <div
                                                                    key={share.id}
                                                                    className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-black px-2.5 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 text-xs"
                                                                >
                                                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${share.status === 'accepted' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                                                        <span className={`truncate flex-1 ${share.status === 'pending' ? 'italic text-gray-400' : 'font-semibold text-gray-800 dark:text-gray-200'}`}>
                                                                            {share.toEmail}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => onRevokeShare(share.id)}
                                                                        className="h-[34px] w-[34px] rounded-lg flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 transition-colors shrink-0"
                                                                        title="Revogar Acesso"
                                                                    >
                                                                        <UserMinus size={16} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* PAINEL 3: CONVITES (INBOX) */}
                    <div className="w-full h-full shrink-0 overflow-y-auto p-4 space-y-4 touch-pan-y">
                        {/* Transferências */}
                        {filteredIncomingTransfers.map(transfer => (
                            <div
                                key={transfer.id}
                                className="pl-4 pr-4 py-3.5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-[#17171a] flex flex-col gap-3 relative overflow-hidden shadow-sm shadow-slate-900/[0.06] dark:shadow-md dark:shadow-black/50"
                            >
                                <div className="absolute inset-y-0 left-0 w-1 bg-blue-600 dark:bg-blue-400" />
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-black dark:text-white truncate">
                                            "{transfer.projectName}"
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            <span className="font-bold text-black dark:text-gray-200">{transfer.fromEmail}</span> quer transferir a propriedade.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onAcceptTransfer(transfer)}
                                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                                >
                                    Aceitar Transferência
                                </button>
                            </div>
                        ))}

                        {/* Convites */}
                        {filteredPendingInvites.map(invite => (
                            <div
                                key={invite.id}
                                className="p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white dark:bg-[#17171a] flex flex-col gap-3 shadow-sm shadow-slate-900/[0.06] dark:shadow-md dark:shadow-black/50"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Share2 size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-black dark:text-white truncate">{invite.projectName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                            De: <span className="font-semibold text-black dark:text-gray-200">{invite.fromEmail}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => onRespondInvite(invite, 'accepted')}
                                        className="h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                                    >
                                        Aceitar
                                    </button>
                                    <button
                                        onClick={() => onRespondInvite(invite, 'rejected')}
                                        className="h-11 bg-slate-100 hover:bg-slate-200/80 text-slate-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white rounded-xl text-sm font-bold transition-colors"
                                    >
                                        Recusar
                                    </button>
                                </div>
                            </div>
                        ))}

                        {filteredPendingInvites.length === 0 && filteredIncomingTransfers.length === 0 && (
                            <div className="text-center py-12 text-sm font-medium text-gray-500 dark:text-gray-500">
                                Nada pendente no momento.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- FOOTER: CRIAÇÃO RÁPIDA --- */}
            {activeTab === 'MY_PROJECTS' && !bulkAction && (
                <div className="p-3.5 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-black shrink-0">
                    {isCreating ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                required
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                placeholder="Nome do novo projeto..."
                                className="flex-1 min-w-0 h-11 px-3.5 rounded-xl text-sm outline-none bg-gray-100 dark:bg-neutral-900 text-black dark:text-white border border-gray-300 dark:border-neutral-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors select-text"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate();
                                    if (e.key === 'Escape') { setIsCreating(false); setNewProjectName(''); }
                                }}
                            />
                            <button
                                onClick={handleCreate}
                                className="h-11 w-11 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center justify-center shadow-sm"
                                title="Criar projeto"
                            >
                                <Check size={18} />
                            </button>
                            <button
                                onClick={() => { setIsCreating(false); setNewProjectName(''); }}
                                className="h-11 w-11 shrink-0 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-600 dark:text-gray-300 rounded-xl transition-colors flex items-center justify-center"
                                title="Cancelar"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full h-11 border-2 border-dashed border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-blue-50/60 dark:hover:bg-blue-950/30 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center gap-2 text-sm font-bold transition-all"
                            title="Criar Novo Projeto"
                        >
                            <Plus size={18} />
                            <span>Criar Novo Projeto</span>
                        </button>
                    )}
                </div>
            )}

            {/* --- MODAL DE AÇÃO EM MASSA / COMPARTILHAMENTO (OVERLAY) --- */}
            {bulkAction && (
                <div className="absolute inset-0 z-50 bg-white dark:bg-black flex flex-col p-4 overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-5 shrink-0">
                        <h3 className="text-base font-bold flex items-center gap-2.5 text-black dark:text-white">
                            <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                {bulkAction === 'SHARE' ? <Share2 size={18} /> : <ArrowRightLeft size={18} />}
                            </span>
                            {bulkAction === 'SHARE' ? 'Compartilhar' : 'Transferir'}
                        </h3>
                        <button
                            onClick={() => { setBulkAction(null); setTargetEmails([]); }}
                            className="h-10 w-10 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                            title="Fechar"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col gap-4">
                        <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-3.5 rounded-xl text-sm text-blue-950 dark:text-blue-100">
                            Selecionados: <b className="font-extrabold">{selectedIds.size} {selectedIds.size === 1 ? 'projeto' : 'projetos'}</b>.
                            {bulkAction === 'TRANSFER' && (
                                <span className="block mt-1 text-red-600 dark:text-red-400 font-bold text-xs">
                                    Atenção: A transferência é irreversível.
                                </span>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                                {bulkAction === 'SHARE' ? 'E-mails dos colaboradores' : 'E-mail do novo proprietário'}
                            </label>

                            <div className="border-2 rounded-xl p-2.5 focus-within:border-blue-500 dark:focus-within:border-blue-400 bg-gray-50 dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 min-h-[88px] flex flex-wrap content-start gap-2 transition-colors">
                                {targetEmails.map(email => (
                                    <span
                                        key={email}
                                        className="bg-blue-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                                    >
                                        <span>{email}</span>
                                        <button
                                            onClick={() => removeEmail(email)}
                                            className="hover:opacity-75 p-0.5 rounded"
                                            title="Remover"
                                        >
                                            <X size={13} />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    value={emailInput}
                                    onChange={e => setEmailInput(e.target.value)}
                                    onKeyDown={handleKeyDownEmail}
                                    onBlur={() => addEmail(emailInput)}
                                    placeholder={targetEmails.length > 0 ? '' : 'Digite o e-mail e tecle Enter...'}
                                    className="flex-1 min-w-[150px] h-9 outline-none text-sm bg-transparent text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 select-text"
                                    autoFocus
                                />
                            </div>

                            {/* Contatos Recentes */}
                            {recentContacts.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">
                                        Recentes
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {recentContacts.map(contact => (
                                            <button
                                                key={contact}
                                                onClick={() => addEmail(contact)}
                                                disabled={targetEmails.includes(contact)}
                                                className="min-h-[36px] px-3 py-1.5 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
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
                                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">
                                        Nível de Acesso
                                    </p>
                                    <div className="flex flex-col gap-2.5">
                                        <label
                                            className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border-2 transition-all ${
                                                sharePermission === 'FULL_ACCESS'
                                                    ? 'border-blue-600 bg-blue-50/80 dark:border-blue-400 dark:bg-blue-950/40'
                                                    : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="permission"
                                                value="FULL_ACCESS"
                                                checked={sharePermission === 'FULL_ACCESS'}
                                                onChange={() => setSharePermission('FULL_ACCESS')}
                                                className="hidden"
                                            />
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                sharePermission === 'FULL_ACCESS' ? 'border-blue-600 dark:border-blue-400' : 'border-gray-300 dark:border-neutral-600'
                                            }`}>
                                                {sharePermission === 'FULL_ACCESS' && <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />}
                                            </div>
                                            <div>
                                                <span className="font-bold text-sm text-black dark:text-white flex items-center gap-1.5">
                                                    <UserPen size={16} className="text-blue-600 dark:text-blue-400" /> Projetista
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                                    Edição e criação liberada.
                                                </span>
                                            </div>
                                        </label>

                                        <label
                                            className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border-2 transition-all ${
                                                sharePermission === 'READ_ONLY_GEOMETRY'
                                                    ? 'border-blue-600 bg-blue-50/80 dark:border-blue-400 dark:bg-blue-950/40'
                                                    : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="permission"
                                                value="READ_ONLY_GEOMETRY"
                                                checked={sharePermission === 'READ_ONLY_GEOMETRY'}
                                                onChange={() => setSharePermission('READ_ONLY_GEOMETRY')}
                                                className="hidden"
                                            />
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                sharePermission === 'READ_ONLY_GEOMETRY' ? 'border-blue-600 dark:border-blue-400' : 'border-gray-300 dark:border-neutral-600'
                                            }`}>
                                                {sharePermission === 'READ_ONLY_GEOMETRY' && <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />}
                                            </div>
                                            <div>
                                                <span className="font-bold text-sm text-black dark:text-white flex items-center gap-1.5">
                                                    <HardHat size={16} className="text-blue-600 dark:text-blue-400" /> Técnico
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                                    Visualiza apenas mapa e caixas.
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
                        className={`w-full h-12 rounded-xl font-bold text-sm transition-all mt-5 shrink-0 ${
                            targetEmails.length === 0
                                ? 'bg-gray-200 dark:bg-neutral-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        }`}
                    >
                        {bulkAction === 'SHARE'
                            ? `Enviar Convite para ${targetEmails.length} pessoa(s)`
                            : 'Iniciar Transferência'}
                    </button>
                </div>
            )}
        </aside>
    );
};

export default ProjectManagerModal;
