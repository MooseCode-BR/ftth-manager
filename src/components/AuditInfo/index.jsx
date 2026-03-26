import './styles.css';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Info, X, User, Clock, Edit3 } from 'lucide-react';
import useUserInfo from '../../hooks/useUserInfo';

// --- Sub-componente: UserBadge ---
// Resolve nome/foto do usuário por UID via hook useUserInfo
const UserBadge = ({ userRef }) => {
    const { userInfo, loading } = useUserInfo(userRef);
    const [showTooltip, setShowTooltip] = useState(false);
    const badgeRef = useRef(null);

    // Fechar tooltip ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (badgeRef.current && !badgeRef.current.contains(e.target)) {
                setShowTooltip(false);
            }
        };
        if (showTooltip) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTooltip]);

    if (loading) return <span className="audit-no-data">Carregando...</span>;
    if (!userInfo) return <span className="audit-no-data">—</span>;

    const { displayName, email, photoURL } = userInfo;

    // Avatar sempre presente (com fallback para ícone)
    const avatar = (photoURL && photoURL.trim()) ? (
        <img src={photoURL} alt="" className="audit-avatar" referrerPolicy="no-referrer" />
    ) : (
        <div className="audit-avatar audit-avatar-fallback">
            <User size={12} />
        </div>
    );

    // Sem displayName: mostra só o email
    if (!displayName) {
        return (
            <span className="audit-user-badge" ref={badgeRef}>
                {avatar}
                <span className="audit-email-text" title={email}>{email}</span>
            </span>
        );
    }

    // Com displayName: mostra nome + tooltip com email
    return (
        <span className="audit-user-badge" ref={badgeRef}>
            {avatar}
            <span
                className="audit-username"
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                title={email}
            >
                {displayName}
            </span>
            {showTooltip && (
                <span className="audit-email-tooltip">
                    {email}
                </span>
            )}
        </span>
    );
};

// --- Formatar data ---
const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
};

// Sub-componente para o conteúdo (reutilizado por popover e inline)
const AuditContent = ({ createdBy, createdAt, modifiedBy, modifiedAt }) => {
    const hasData = createdBy || createdAt || modifiedBy || modifiedAt;

    return (
        <div className="audit-content">
            {/* Criado por */}
            <div className="audit-row">
                <div className="audit-row-icon">
                    <User size={13} />
                </div>
                <div className="audit-row-data">
                    <span className="audit-label">Criado por</span>
                    {hasData ? (
                        <div className="audit-value">
                            <UserBadge userRef={createdBy} />
                            {createdAt && <span className="audit-date">{formatDate(createdAt)}</span>}
                        </div>
                    ) : (
                        <span className="audit-no-data">Informação não disponível</span>
                    )}
                </div>
            </div>

            {/* Modificado por */}
            {(modifiedBy || modifiedAt) && (
                <div className="audit-row">
                    <div className="audit-row-icon audit-row-icon-edit">
                        <Edit3 size={13} />
                    </div>
                    <div className="audit-row-data">
                        <span className="audit-label">Última modificação</span>
                        <div className="audit-value">
                            <UserBadge userRef={modifiedBy} />
                            {modifiedAt && <span className="audit-date">{formatDate(modifiedAt)}</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Componente Principal: AuditInfo ---
const AuditInfo = ({ createdBy, createdAt, modifiedBy, modifiedAt, mode = 'popover' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef(null);
    const portalRef = useRef(null);
    const [portalPos, setPortalPos] = useState({ top: 0, left: 0 });

    // Calcular posição do portal baseado no botão
    const updatePosition = useCallback(() => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollX = window.scrollX || window.pageXOffset;

        let top = rect.bottom + scrollY + 8;
        let left = rect.left + scrollX + (rect.width / 2);

        // Verificar se o popover vai sair da tela (direita)
        const popoverWidth = 290;
        if (left + popoverWidth / 2 > window.innerWidth) {
            left = window.innerWidth - popoverWidth / 2 - 16;
        }
        if (left - popoverWidth / 2 < 0) {
            left = popoverWidth / 2 + 16;
        }

        // Verificar se vai sair de baixo da tela
        const popoverHeight = 180;
        if (top + popoverHeight > window.innerHeight + scrollY) {
            top = rect.top + scrollY - popoverHeight - 8;
        }

        setPortalPos({ top, left });
    }, []);

    // Fechar popover ao clicar fora
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (
                portalRef.current && !portalRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        const handleScroll = () => updatePosition();
        const handleResize = () => updatePosition();

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [isOpen, updatePosition]);

    // Recalcular posição ao abrir
    useEffect(() => {
        if (isOpen) updatePosition();
    }, [isOpen, updatePosition]);

    // Modo inline: sem botão, renderiza direto
    if (mode === 'inline') {
        return (
            <div className="audit-info-inline">
                <AuditContent
                    createdBy={createdBy}
                    createdAt={createdAt}
                    modifiedBy={modifiedBy}
                    modifiedAt={modifiedAt}
                />
            </div>
        );
    }

    // Modo popover: botão ℹ️ com portal
    return (
        <div className="audit-info-wrapper">
            <button
                ref={btnRef}
                className="audit-info-btn"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                title="Informações de auditoria"
            >
                <Info size={14} />
            </button>

            {isOpen && ReactDOM.createPortal(
                <div
                    ref={portalRef}
                    className="audit-popover-portal"
                    style={{ top: portalPos.top, left: portalPos.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="audit-popover-header">
                        <span className="audit-popover-title">
                            <Clock size={13} /> Histórico
                        </span>
                        <button className="audit-popover-close" onClick={() => setIsOpen(false)}>
                            <X size={14} />
                        </button>
                    </div>
                    <AuditContent
                        createdBy={createdBy}
                        createdAt={createdAt}
                        modifiedBy={modifiedBy}
                        modifiedAt={modifiedAt}
                    />
                </div>,
                document.body
            )}
        </div>
    );
};

export { UserBadge, formatDate };
export default AuditInfo;
