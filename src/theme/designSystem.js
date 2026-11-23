/*
 * ============================================================================
 * FTTH MANAGER CLOUD — DESIGN SYSTEM & IDENTIDADE VISUAL CENTRALIZADA
 * ============================================================================
 * Fonte única de verdade para cores (Light & Dark), tipografia, botões,
 * inputs, cards, modais, alertas, ícones, espaçamentos e animações.
 *
 * COMO FUNCIONA:
 * 1. Altere qualquer cor em `THEME_COLORS` abaixo -> automaticamente todas as
 *    telas e modais que usam `DS.*` (ou `var(--ds-*)`) recebem a nova cor.
 * 2. Altere qualquer preset de componente em `DS` (padding, raio, fonte, hover)
 *    -> todas as telas que usam aquele preset atualizam em conjunto.
 * 3. Use `cn(DS.button.primary, 'w-full')` para combinar presets com ajustes pontuais.
 */

// ============================================================================
// 1. CORES — FONTE ÚNICA DE VERDADE (EDITE AQUI PARA MUDAR O APP INTEIRO)
// ============================================================================

export const THEME_COLORS = {
    // Cores fixas da marca (iguais nos dois temas ou usadas em elementos fixos)
    brand: {
        primary: '#fcaf17',
        primaryHover: '#e59b0c',
        onPrimary: '#000000',
        softBg: 'rgba(252, 175, 23, 0.15)',
        softBorder: 'rgba(252, 175, 23, 0.30)',
        splashFixedBg: '#0b0b0b',
    },

    // Cores auxiliares para módulos, categorias e destaques técnicos
    accents: {
        sky: '#38bdf8',
        emerald: '#34d399',
        emeraldSolid: '#22c55e',
        purple: '#c084fc',
        rose: '#fb7185',
    },

    // Tokens do MODO CLARO (Light)
    light: {
        // Texto
        textPrimary: '#0f172a',        // slate-900
        textSecondary: '#475569',      // slate-600
        textMuted: '#64748b',          // slate-500
        textSubtle: '#94a3b8',         // slate-400
        textAccent: '#d97706',         // amber-600 (contraste seguro no fundo claro)
        textOnDark: '#ffffff',

        // Superfícies / Fundos
        surfacePage: '#f8fafc',        // slate-50
        surfaceCard: '#ffffff',
        surfaceSection: '#ffffff',
        surfaceInput: '#f8fafc',       // slate-50
        surfaceSubtle: '#f1f5f9',      // slate-100
        surfaceSubtleHover: '#e2e8f0', // slate-200
        surfaceGlass: 'rgba(255, 255, 255, 0.90)',
        surfaceOverlay: 'rgba(0, 0, 0, 0.75)',

        // Bordas e Divisores
        borderSubtle: '#e2e8f0',       // slate-200
        borderDefault: '#e2e8f0',      // slate-200
        borderInput: '#cbd5e1',        // slate-300
        borderHover: '#94a3b8',        // slate-400
        borderStrong: '#0f172a',       // slate-900 (botão outline)
        borderFocus: '#fcaf17',

        // Estados Semânticos (Feedback)
        errorText: '#dc2626',          // red-600
        errorBg: 'rgba(239, 68, 68, 0.10)',
        errorBorder: 'rgba(239, 68, 68, 0.30)',
        errorSolid: '#ef4444',

        successText: '#047857',        // emerald-700
        successBg: 'rgba(16, 185, 129, 0.10)',
        successBorder: 'rgba(16, 185, 129, 0.30)',

        infoText: '#0369a1',           // sky-700
        infoBg: 'rgba(14, 165, 233, 0.10)',
        infoBorder: 'rgba(14, 165, 233, 0.30)',

        warningText: '#b45309',        // amber-700
        warningBg: 'rgba(245, 158, 11, 0.12)',
        warningBorder: 'rgba(245, 158, 11, 0.32)',
    },

    // Tokens do MODO ESCURO (Dark)
    dark: {
        // Texto
        textPrimary: '#ffffff',
        textSecondary: '#a3a3a3',      // neutral-400
        textMuted: '#737373',          // neutral-500
        textSubtle: '#525252',         // neutral-600
        textAccent: '#fcaf17',         // dourado principal da marca
        textOnDark: '#ffffff',

        // Superfícies / Fundos
        surfacePage: '#0b0b0b',
        surfaceCard: '#111111',
        surfaceSection: '#000000',
        surfaceInput: '#000000',
        surfaceSubtle: '#171717',      // neutral-900
        surfaceSubtleHover: '#262626', // neutral-800
        surfaceGlass: 'rgba(0, 0, 0, 0.85)',
        surfaceOverlay: 'rgba(0, 0, 0, 0.75)',

        // Bordas e Divisores
        borderSubtle: '#171717',       // neutral-900
        borderDefault: '#262626',      // neutral-800
        borderInput: '#262626',        // neutral-800
        borderHover: '#525252',        // neutral-600
        borderStrong: '#ffffff',       // botão outline
        borderFocus: '#fcaf17',

        // Estados Semânticos (Feedback)
        errorText: '#f87171',          // red-400
        errorBg: 'rgba(239, 68, 68, 0.10)',
        errorBorder: 'rgba(239, 68, 68, 0.30)',
        errorSolid: '#ef4444',

        successText: '#34d399',        // emerald-400
        successBg: 'rgba(16, 185, 129, 0.10)',
        successBorder: 'rgba(16, 185, 129, 0.30)',

        infoText: '#38bdf8',           // sky-400
        infoBg: 'rgba(56, 189, 248, 0.10)',
        infoBorder: 'rgba(56, 189, 248, 0.30)',

        warningText: '#fbbf24',        // amber-400
        warningBg: 'rgba(251, 191, 36, 0.12)',
        warningBorder: 'rgba(251, 191, 36, 0.32)',
    },
};

// ============================================================================
// 2. INJETOR AUTOMÁTICO DE VARIÁVEIS CSS (:root e .dark)
// ============================================================================

const toKebabCase = (str) =>
    str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const buildCssBlock = (prefix, obj) =>
    Object.entries(obj)
        .map(([key, value]) => `  --ds-${prefix}${toKebabCase(key)}: ${value};`)
        .join('\n');

/**
 * Injeta as variáveis CSS do Design System no <head> (executado no boot em main.jsx).
 * Sempre que `THEME_COLORS` for alterado, todo o aplicativo reflete automaticamente
 * as novas cores em modo Light e Dark sem precisar editar cada tela.
 */
export const applyDesignSystemTheme = () => {
    if (typeof document === 'undefined') return;

    const styleId = 'ftth-design-system-vars';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
:root {
${buildCssBlock('brand-', THEME_COLORS.brand)}
${buildCssBlock('accent-', THEME_COLORS.accents)}
${buildCssBlock('', THEME_COLORS.light)}
}

.dark {
${buildCssBlock('', THEME_COLORS.dark)}
}
`;
};

// ============================================================================
// 3. UTILITÁRIO DE COMPOSIÇÃO DE CLASSES
// ============================================================================

/**
 * Combina múltiplas classes/presets ignorando valores falsy.
 * Exemplo: cn(DS.button.primary, isFull && 'w-full')
 */
export const cn = (...classes) => classes.filter(Boolean).join(' ');

// ============================================================================
// 4. TAMANHOS E CONFIGURAÇÕES PADRÃO DE ÍCONES
// ============================================================================

export const ICON_SIZES = {
    xs: 14,          // Badges, metadados, inline pequeno
    sm: 16,          // Alertas, links com seta, botões compactos
    md: 18,          // Inputs, botões de ação, botão fechar (X)
    header: 19,      // Ícones de cabeçalho (Tema, Perfil)
    lg: 20,          // Menu mobile, spinners (Loader2)
    carousel: 22,    // Controles de carrossel
    fab: 24,         // Botão flutuante (Voltar ao topo, ações flutuantes)
    feature: 30,     // Ícones dentro de caixas de destaque (cards)
    hero: 32,        // Ícone principal de telas de estado (ex.: confirmação de e-mail)
};

export const ICON_STROKES = {
    default: 2,
    bold: 2.5,
    fab: 2.75,
};

// ============================================================================
// 5. PRESETS DE CLASSES REUTILIZÁVEIS (USAR EM TODAS AS TELAS E MODAIS)
// ============================================================================

export const DS = {
    // ------------------------------------------------------------------------
    // A. SUPERFÍCIES / FUNDOS
    // ------------------------------------------------------------------------
    surface: {
        page: 'bg-[var(--ds-surface-page)] text-[var(--ds-text-primary)] font-sans selection:bg-[var(--ds-brand-primary)] selection:text-[var(--ds-brand-on-primary)] transition-colors duration-300',
        card: 'bg-[var(--ds-surface-card)] text-[var(--ds-text-primary)] border border-[var(--ds-border-default)] transition-colors duration-300',
        section: 'bg-[var(--ds-surface-section)] text-[var(--ds-text-primary)] transition-colors duration-300',
        subtle: 'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-primary)]',
        glass: 'bg-[var(--ds-surface-glass)] backdrop-blur-md transition-all duration-300',
        overlay: 'bg-[var(--ds-surface-overlay)] backdrop-blur-md',
        splashFixed: 'bg-[var(--ds-brand-splash-fixed-bg)] text-white',
    },

    // ------------------------------------------------------------------------
    // B. BORDAS E DIVISORES
    // ------------------------------------------------------------------------
    border: {
        default: 'border border-[var(--ds-border-default)]',
        subtle: 'border border-[var(--ds-border-subtle)]',
        dividerTop: 'border-t border-[var(--ds-border-default)]',
        dividerBottom: 'border-b border-[var(--ds-border-subtle)]',
        dividerLine: 'w-full border-t border-[var(--ds-border-default)]',
    },

    // ------------------------------------------------------------------------
    // C. TIPOGRAFIA E HIERARQUIA DE TEXTOS
    // ------------------------------------------------------------------------
    text: {
        // Identidade da Marca (Share Tech)
        brandTitle: 'font-brand uppercase tracking-[0.16em] text-[var(--ds-text-primary)] leading-none',
        brandSubtitle: 'font-brand uppercase tracking-[0.28em] text-[var(--ds-text-accent)]',
        brandEyebrow: 'font-brand text-xs uppercase tracking-[0.25em] text-[var(--ds-text-accent)]',

        // Títulos
        heroDisplay: 'font-brand text-4xl sm:text-6xl lg:text-7xl xl:text-8xl uppercase tracking-wider leading-[0.95] text-white drop-shadow-2xl',
        h1: 'text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-[1.1] text-[var(--ds-text-primary)]',
        h2: 'text-2xl sm:text-3xl font-black tracking-tight text-[var(--ds-text-primary)]',
        h3: 'text-xl sm:text-2xl font-black text-[var(--ds-text-primary)]',
        cardTitle: 'text-lg sm:text-xl font-extrabold leading-snug text-[var(--ds-text-primary)]',

        // Corpo e auxiliares
        primary: 'text-[var(--ds-text-primary)]',
        secondary: 'text-sm sm:text-base text-[var(--ds-text-secondary)] leading-relaxed',
        body: 'text-sm text-[var(--ds-text-secondary)] leading-relaxed',
        muted: 'text-xs font-medium text-[var(--ds-text-muted)]',
        subtle: 'text-[11px] font-medium text-[var(--ds-text-subtle)]',
        accent: 'text-[var(--ds-text-accent)]',
        eyebrow: 'text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--ds-text-muted)]',
        label: 'text-[11px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)]',
        mono: 'font-mono text-xs text-[var(--ds-text-secondary)]',
    },

    // ------------------------------------------------------------------------
    // D. BOTÕES (PADDING, RAIO, HOVER, ACTIVE, SELECTED E DISABLED)
    // ------------------------------------------------------------------------
    button: {
        // Botão CTA Principal (formulários e ações primárias)
        primary:
            'bg-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-primary-hover)] active:scale-[0.98] text-[var(--ds-brand-on-primary)] font-black uppercase tracking-wider text-sm px-5 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:pointer-events-none',

        // Botão CTA Pill arredondado (ex.: Teste Grátis no cabeçalho)
        primaryPill:
            'bg-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-primary-hover)] active:scale-[0.98] text-[var(--ds-brand-on-primary)] font-extrabold text-xs sm:text-sm uppercase tracking-wider px-5 sm:px-6 py-2.5 rounded-full transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none',

        // Botão Secundário Outline (preenche de amarelo no hover)
        secondaryOutline:
            'border-2 border-[var(--ds-border-strong)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-brand-primary)] hover:border-[var(--ds-brand-primary)] hover:text-[var(--ds-brand-on-primary)] active:scale-[0.98] font-extrabold text-xs sm:text-sm uppercase tracking-[0.14em] px-8 py-3.5 rounded transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none',

        // Botão Neutro / Social (Google, Cancelar, Reenviar)
        neutral:
            'bg-[var(--ds-surface-subtle)] hover:bg-[var(--ds-surface-subtle-hover)] active:scale-[0.98] text-[var(--ds-text-primary)] font-bold text-sm py-3 px-4 rounded-lg border border-[var(--ds-border-input)] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none',

        // Botão Destrutivo (Excluir / Remover)
        danger:
            'bg-[var(--ds-error-solid)] hover:opacity-90 active:scale-[0.98] text-white font-bold text-sm px-5 py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none',

        // Botão de Ícone Transparente (Tema, Perfil, Menu)
        iconGhost:
            'w-10 h-10 rounded-full bg-transparent flex items-center justify-center text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-accent)] active:scale-95 transition-colors',

        // Botão de Ícone Transparente sobre imagens escuras (Hero)
        iconGhostOnDark:
            'w-10 h-10 rounded-full bg-transparent flex items-center justify-center text-white hover:text-[var(--ds-brand-primary)] active:scale-95 drop-shadow transition-colors',

        // Botão de Ícone com Superfície (Fechar modal X, ações em toolbar)
        iconSurface:
            'w-9 h-9 rounded-lg bg-[var(--ds-surface-subtle)] hover:bg-[var(--ds-surface-subtle-hover)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] active:scale-95 flex items-center justify-center transition-colors',

        // Item / Botão Selecionável (ex.: abas, chips, opções selecionadas)
        selectableBase:
            'px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]',
        selectableIdle:
            'bg-[var(--ds-surface-subtle)] border-[var(--ds-border-default)] text-[var(--ds-text-secondary)] hover:border-[var(--ds-border-hover)] hover:text-[var(--ds-text-primary)]',
        selectableActive:
            'bg-[var(--ds-brand-soft-bg)] border-[var(--ds-brand-primary)] text-[var(--ds-text-accent)] shadow-sm',

        // Link de Navegação (sublinhado dourado no hover / ativo)
        navLink:
            'py-1 text-sm font-semibold border-b-2 border-transparent hover:border-[var(--ds-brand-primary)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors',
        navLinkActive:
            'py-1 text-sm font-bold border-b-2 border-[var(--ds-brand-primary)] text-[var(--ds-text-primary)]',

        // Botão estilo Link de Texto
        textLink:
            'text-xs sm:text-sm font-bold text-[var(--ds-text-accent)] hover:underline transition-colors',

        // Botão Flutuante (FAB — Voltar ao topo / Ação flutuante)
        fab:
            'fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-primary-hover)] active:scale-95 text-[var(--ds-brand-on-primary)] shadow-2xl shadow-black/40 flex items-center justify-center transition-all duration-300',
    },

    // ------------------------------------------------------------------------
    // E. INPUTS E FORMULÁRIOS
    // ------------------------------------------------------------------------
    input: {
        group: 'space-y-1.5',
        label: 'block text-[11px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)]',
        wrapper: 'relative',
        base:
            'w-full px-4 py-3 rounded-lg border border-[var(--ds-border-input)] bg-[var(--ds-surface-input)] text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-subtle)] outline-none focus:border-[var(--ds-border-focus)] text-[15px] transition-colors disabled:opacity-60',
        withLeftIcon: 'pl-10',
        withRightIcon: 'pr-10',
        error: 'border-[var(--ds-error-solid)] focus:border-[var(--ds-error-solid)]',
        leftIcon:
            'absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--ds-text-subtle)]',
        rightButton:
            'absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-primary)] transition-colors',
        errorText: 'text-[11px] text-[var(--ds-error-text)] font-medium',
        helperText: 'text-[11px] text-[var(--ds-text-muted)]',
    },

    // ------------------------------------------------------------------------
    // F. CARDS E MODAIS
    // ------------------------------------------------------------------------
    card: {
        base: 'bg-[var(--ds-surface-card)] border border-[var(--ds-border-default)] rounded-xl shadow-sm transition-colors duration-300',
        elevated: 'bg-[var(--ds-surface-card)] border border-[var(--ds-border-default)] rounded-2xl shadow-xl overflow-hidden transition-colors duration-300',
        interactive:
            'group cursor-pointer bg-[var(--ds-surface-section)] border border-[var(--ds-border-default)] hover:border-[var(--ds-border-hover)] rounded-md overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1',
        accentBar: 'h-1 w-full bg-[var(--ds-brand-primary)]',
    },

    modal: {
        overlay:
            'fixed inset-0 z-50 bg-[var(--ds-surface-overlay)] backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200',
        container:
            'relative w-full max-w-md bg-[var(--ds-surface-card)] border border-[var(--ds-border-default)] rounded-xl shadow-2xl overflow-hidden text-[var(--ds-text-primary)] my-auto',
        containerLg:
            'relative w-full max-w-2xl bg-[var(--ds-surface-card)] border border-[var(--ds-border-default)] rounded-xl shadow-2xl overflow-hidden text-[var(--ds-text-primary)] my-auto',
        body: 'p-6 sm:p-8',
        closeButton:
            'absolute top-4 right-4 w-9 h-9 rounded-lg bg-[var(--ds-surface-subtle)] hover:bg-[var(--ds-surface-subtle-hover)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] flex items-center justify-center transition-colors',
    },

    // ------------------------------------------------------------------------
    // G. ALERTAS E BADGES
    // ------------------------------------------------------------------------
    alert: {
        error:
            'p-3.5 rounded-lg border flex items-start gap-2 text-sm font-medium bg-[var(--ds-error-bg)] border-[var(--ds-error-border)] text-[var(--ds-error-text)]',
        success:
            'p-3.5 rounded-lg border flex items-center gap-2 text-sm font-medium bg-[var(--ds-success-bg)] border-[var(--ds-success-border)] text-[var(--ds-success-text)]',
        info:
            'p-3.5 rounded-lg border flex items-start gap-2 text-sm font-medium bg-[var(--ds-info-bg)] border-[var(--ds-info-border)] text-[var(--ds-info-text)]',
        warning:
            'p-3.5 rounded-lg border flex items-start gap-2 text-sm font-medium bg-[var(--ds-warning-bg)] border-[var(--ds-warning-border)] text-[var(--ds-warning-text)]',
    },

    badge: {
        brand:
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-[0.2em] bg-[var(--ds-brand-soft-bg)] border border-[var(--ds-brand-soft-border)] text-[var(--ds-text-accent)]',
        subtle:
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--ds-surface-subtle)] border border-[var(--ds-border-default)] text-[var(--ds-text-secondary)]',
        darkGlass:
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-[0.2em] bg-black/75 border border-white/10 text-neutral-200 backdrop-blur-sm',
    },

    // ------------------------------------------------------------------------
    // H. ANIMAÇÕES, LAYOUT E Z-INDEX
    // ------------------------------------------------------------------------
    motion: {
        colors: 'transition-colors duration-300',
        all: 'transition-all duration-300',
        press: 'active:scale-[0.98]',
        themeIconWrapper: 'relative w-5 h-5 flex items-center justify-center',
        themeSunActive: 'absolute transition-all duration-500 ease-in-out opacity-100 rotate-0 scale-100',
        themeSunHidden: 'absolute transition-all duration-500 ease-in-out opacity-0 rotate-180 scale-0',
        themeMoonActive: 'absolute transition-all duration-500 ease-in-out opacity-100 rotate-0 scale-100',
        themeMoonHidden: 'absolute transition-all duration-500 ease-in-out opacity-0 -rotate-180 scale-0',
    },

    layout: {
        container: 'max-w-[1380px] mx-auto px-5 lg:px-10',
        navbarContainer: 'max-w-[1440px] mx-auto h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4',
        fullScreenScroll: 'h-[100dvh] w-full overflow-y-auto overflow-x-hidden scroll-smooth',
    },

    zIndex: {
        content: 'z-10',
        header: 'z-40',
        fab: 'z-40',
        modal: 'z-50',
        splash: 'z-[9999]',
    },
};

export default DS;
