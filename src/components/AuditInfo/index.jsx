import './styles.css';
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Info, X, User, Clock, Edit3 } from 'lucide-react';
import useUserInfo from '../../hooks/useUserInfo';
import usePopover from '../../hooks/usePopover';

// --- Sub-componente: UserBadge ---
const UserBadge = ({ userRef }) => {
    const { userInfo, loading } = useUserInfo(userRef);
    const [showTooltip, setShowTooltip] = useState(false);
    const badgeRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (badgeRef.current && !badgeRef.current.contains(e.target)) {
                setShowTooltip(false);
            }
        };
        if (showTooltip) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTooltip]);

    if (loading) return <span className="audit-no-data" aria-busy="true">Carregando...</span>;
    if (!userInfo) return <span className="audit-no-data">—</span>;

    const { displayName, email, photoURL } = userInfo;

    const avatar = (photoURL && photoURL.trim()) ? (
        <img src={photoURL} alt={`Avatar de ${displayName || email}`} className="audit-avatar" referrerPolicy="no-referrer" />
    ) : (
        <div className="audit-avatar audit-avatar-fallback" aria-hidden="true">
            <User size={12} />
        </div>
    );

    if (!displayName) {
        return (
            <span className="audit-user-badge" ref={badgeRef}>
                {avatar}
                <span className="audit-email-text" title={email}>{email}</span>
            </span>
        );
    }

    return (
        <span className="audit-user-badge" ref={badgeRef}>
            {avatar}
            <button
                className="audit-username btn-as-text"
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                aria-expanded={showTooltip}
                title={email}
            >
                {displayName}
            </button>
            {showTooltip && (
                <span className="audit-email-tooltip" role="tooltip">
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
        if (isNaN(d.getTime())) throw new Error("Data inválida");
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
};

// --- Sub-componente: AuditContent ---
const AuditContent = ({ createdBy, createdAt, modifiedBy, modifiedAt }) => {
    const hasData = createdBy || createdAt || modifiedBy || modifiedAt;

    return (
        <div className="audit-content">
            <div className="audit-row">
                <div className="audit-row-icon" aria-hidden="true"><User size={13} /></div>
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

            {(modifiedBy || modifiedAt) && (
                <div className="audit-row">
                    <div className="audit-row-icon audit-row-icon-edit" aria-hidden="true"><Edit3 size={13} /></div>
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
    // [MELHORIA] O componente agora invoca o Hook e consome apenas o que precisa, sem poluição matemática.
    const { isOpen, toggle, close, portalPos, btnRef, portalRef } = usePopover();

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

    return (
        <div className="audit-info-wrapper">
            <button
                ref={btnRef} // Refectada do nosso Hook
                className="audit-info-btn"
                onClick={toggle} // Lógica de toggle controlada pelo Hook
                title="Informações de auditoria"
                aria-expanded={isOpen}
                aria-haspopup="dialog"
            >
                <Info size={14} />
            </button>

            {isOpen && ReactDOM.createPortal(
                <div
                    ref={portalRef} // Refectada do nosso Hook
                    className="audit-popover-portal"
                    style={{ top: portalPos.top, left: portalPos.left }}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-label="Detalhes do Histórico"
                >
                    <div className="audit-popover-header">
                        <span className="audit-popover-title">
                            <Clock size={13} aria-hidden="true" /> Histórico
                        </span>
                        <button
                            className="audit-popover-close"
                            onClick={close} // Lógica de fechar controlada pelo Hook
                            aria-label="Fechar popover"
                        >
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