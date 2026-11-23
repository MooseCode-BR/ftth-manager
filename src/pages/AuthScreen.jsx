/*
 * Tela inicial / autenticação do FTTH Manager Cloud:
 * - Navbar transparente flutuante sobre a imagem do Hero (ganha vidro fosco ao rolar)
 * - Suporte completo a Modo Claro (Light) e Modo Escuro (Dark) sincronizado com localStorage
 * - Hero cinematográfico full-bleed responsivo (mobile, tablet e monitores ultrawide)
 * - Grade "Novidades" (3 colunas estilo Newswire) e "Módulos em Destaque" (4 pôsteres 3:4)
 * - Banner de plataforma, rodapé minimalista e botão flutuante de voltar ao topo
 * - Modal completo de autenticação (Login, Cadastro, Verificação de E-mail, Recuperação e Google Sign-In)
 */

// ============================================================================
// IMPORTS
// ============================================================================

// React
import React, { useState, useEffect, useCallback, useRef } from 'react';

// Firebase Auth
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    verifyPasswordResetCode,
    confirmPasswordReset,
    applyActionCode,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signInWithCredential
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

// Ícones e APIs Nativas
import {
    Mail,
    Lock,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Eye,
    EyeOff,
    MailCheck,
    RefreshCw,
    LogOut,
    User,
    X,
    Menu,
    Globe,
    ArrowUpRight,
    Layers,
    Cpu,
    Smartphone,
    ShieldCheck,
    Share2,
    Map as MapIcon,
    Sun,
    Moon
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

// Configurações Internas
import { VERSAO } from '../config/constants';

// ============================================================================
// CONSTANTES E CONTEÚDO DA LANDING PAGE
// ============================================================================

const THEME_STORAGE_KEY = 'ftth_theme';
const MIN_PASSWORD_LENGTH = 8;
const RESET_REDIRECT_DELAY_MS = 3000;
const RESEND_COOLDOWN_SECONDS = 60;
const HERO_AUTOPLAY_MS = 6500;

// Links oficiais das lojas (preencha as URLs quando os apps forem publicados)
const STORE_LINKS = {
    playStore: '', // Ex: 'https://play.google.com/store/apps/details?id=com.ftthmanager.app'
    appStore: ''   // Ex: 'https://apps.apple.com/br/app/ftth-manager/id0000000000'
};

/**
 * Slides do carrossel principal (Hero responsivo).
 */
const HERO_SLIDES = [
    {
        id: 'webgl-engine',
        eyebrow: 'FTTH Manager Cloud',
        title: 'Engine WebGL de Alta Performance',
        subtitle: 'Renderize milhares de cabos, CTOs e CEOs diretamente na GPU com fluidez instantânea no mapa.',
        ctaLabel: 'Acessar Plataforma',
        accent: '#fcaf17',
        gradient: 'from-[#0f2136] via-[#0a101c] to-[#05070b]',
        tag: 'MOTOR GRÁFICO GPU'
    },
    {
        id: 'optical-signal',
        eyebrow: 'Segmentação Óptica',
        title: 'Controle Total de Sinais e Fusões',
        subtitle: 'Mapeie splitters, bandejas, fusões e rastreamento de sinal óptico de ponta a ponta em tempo real.',
        ctaLabel: 'Criar Conta Grátis',
        accent: '#38bdf8',
        gradient: 'from-[#08243a] via-[#0b152c] to-[#05070b]',
        tag: 'GESTÃO DE FIBRAS'
    },
    {
        id: 'multi-platform',
        eyebrow: 'Web, PWA & Android',
        title: 'Sua Rede no Escritório e em Campo',
        subtitle: 'Sincronização na nuvem em tempo real para projetistas e equipes técnicas com permissões dedicadas.',
        ctaLabel: 'Entrar Agora',
        accent: '#22c55e',
        gradient: 'from-[#0a271f] via-[#091518] to-[#05070b]',
        tag: 'COLABORAÇÃO EM NUVEM'
    }
];

/**
 * Cards da seção "Novidades" (estilo Newswire 3 colunas).
 */
const NEWSWIRE_ITEMS = [
    {
        id: 'news-1',
        category: 'FTTH Cloud',
        date: `Versão ${VERSAO}`,
        title: 'Login Híbrido com Google e Verificação Obrigatória de E-mail',
        accent: 'from-amber-500/35 via-orange-950/65 to-neutral-950',
        badge: 'SEGURANÇA',
        icon: ShieldCheck
    },
    {
        id: 'news-2',
        category: 'Interface',
        date: 'Atualização',
        title: 'Novo Gerenciador de Projetos com Swipe Horizontal e Modo Seleção',
        accent: 'from-sky-500/35 via-blue-950/65 to-neutral-950',
        badge: 'PRODUTIVIDADE',
        icon: Layers
    },
    {
        id: 'news-3',
        category: 'Performance',
        date: 'Engine WebGL',
        title: 'Renderização Acelerada por GPU com PixiJS para Redes de Grande Porte',
        accent: 'from-emerald-500/35 via-teal-950/65 to-neutral-950',
        badge: 'VELOCIDADE',
        icon: Cpu
    },
    {
        id: 'news-4',
        category: 'Colaboração',
        date: 'Equipes',
        title: 'Compartilhamento de Projetos com Perfis de Projetista e Ativação',
        accent: 'from-indigo-500/35 via-slate-900/75 to-neutral-950',
        badge: 'ACESSO',
        icon: Share2
    },
    {
        id: 'news-5',
        category: 'Mapeamento',
        date: 'Georreferenciamento',
        title: 'Áreas Poligonais, Tags Personalizadas e Exportação Completa em KML',
        accent: 'from-purple-500/35 via-neutral-950/75 to-neutral-950',
        badge: 'MAPAS',
        icon: MapIcon
    },
    {
        id: 'news-6',
        category: 'Mobile',
        date: 'Android App',
        title: 'Experiência Nativa em Campo com Notificações Push e Deep Links',
        accent: 'from-rose-500/35 via-neutral-950/75 to-neutral-950',
        badge: 'MOBILE',
        icon: Smartphone
    }
];

/**
 * Pôsteres verticais da seção "Módulos em Destaque" (4 colunas 3:4).
 */
const FEATURED_MODULES = [
    {
        id: 'mod-map',
        title: 'MAPA FTTH',
        subtitle: 'WEBGL ENGINE',
        gradient: 'from-[#291e00] via-[#4a3400] to-[#0a0a0a]',
        accentText: 'text-[#fcaf17]',
        borderHover: 'hover:border-[#fcaf17]'
    },
    {
        id: 'mod-splice',
        title: 'FUSÕES & SINAIS',
        subtitle: 'DETAIL PANEL',
        gradient: 'from-[#002036] via-[#003c60] to-[#0a0a0a]',
        accentText: 'text-sky-400',
        borderHover: 'hover:border-sky-400'
    },
    {
        id: 'mod-projects',
        title: 'PROJETOS CLOUD',
        subtitle: 'MULTI-USUÁRIO',
        gradient: 'from-[#072c1f] via-[#0e4a35] to-[#0a0a0a]',
        accentText: 'text-emerald-400',
        borderHover: 'hover:border-emerald-400'
    },
    {
        id: 'mod-mobile',
        title: 'CAMPO MOBILE',
        subtitle: 'PWA & ANDROID',
        gradient: 'from-[#221438] via-[#3a1f62] to-[#0a0a0a]',
        accentText: 'text-purple-400',
        borderHover: 'hover:border-purple-400'
    }
];

/**
 * Lista de domínios de e-mail temporário/descartável bloqueados no cadastro.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
    '10minutemail.com',
    '10minutemail.net',
    'burnermail.io',
    'crazymailing.com',
    'discard.email',
    'dispostable.com',
    'emailondeck.com',
    'fakeinbox.com',
    'getairmail.com',
    'getnada.com',
    'guerrillamail.biz',
    'guerrillamail.com',
    'guerrillamail.de',
    'guerrillamail.info',
    'guerrillamail.net',
    'guerrillamail.org',
    'guerrillamailblock.com',
    'harakirimail.com',
    'inboxbear.com',
    'mailcatch.com',
    'maildrop.cc',
    'mailinator.com',
    'mailnesia.com',
    'mintemail.com',
    'moakt.com',
    'mohmal.com',
    'mytemp.email',
    'nada.email',
    'sharklasers.com',
    'spam4.me',
    'temp-mail.io',
    'temp-mail.org',
    'tempail.com',
    'tempmail.com',
    'tempmail.net',
    'tempmailo.com',
    'throwawaymail.com',
    'tmpmail.net',
    'tmpmail.org',
    'trashmail.com',
    'yopmail.com',
    'yopmail.fr',
    'yopmail.net'
]);

// ============================================================================
// UTILITÁRIOS PUROS
// ============================================================================

const getInitialTheme = () => {
    if (typeof window === 'undefined') return true;
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) return savedTheme === 'dark';
    return true;
};

const isDisposableEmail = (emailValue) => {
    const parts = String(emailValue || '').trim().toLowerCase().split('@');
    if (parts.length !== 2) return false;
    return DISPOSABLE_EMAIL_DOMAINS.has(parts[1]);
};

const mapAuthErrorMessage = (err) => {
    switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'E-mail ou senha incorretos.';
        case 'auth/email-already-in-use':
            return 'Este e-mail já está cadastrado.';
        case 'auth/password-does-not-meet-requirements':
        case 'auth/weak-password':
            return 'A senha precisa conter:\n- Letras MAIÚSCULAS\n- Letras minúsculas\n- Números\n- Símbolos (!@#$)\n- 8 caracteres ou mais';
        case 'auth/invalid-email':
            return 'O formato do e-mail é inválido.';
        case 'auth/too-many-requests':
            return 'Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.';
        case 'auth/network-request-failed':
            return 'Erro de conexão com o servidor.';
        case 'auth/expired-action-code':
            return 'O link expirou. Por favor, solicite um novo.';
        case 'auth/invalid-action-code':
            return 'Link inválido ou já utilizado.';
        case 'auth/account-exists-with-different-credential':
            return 'Já existe uma conta cadastrada com este e-mail usando outro método de login.';
        case 'auth/unauthorized-domain':
            return 'Domínio não autorizado no Firebase Auth.';
        case 'auth/operation-not-allowed':
            return 'Login com Google não está habilitado no Firebase Console.';
        default:
            return `Erro: ${err.message}`;
    }
};

const mapResetErrorMessage = (err) => {
    if (err.code === 'auth/user-not-found') return 'Não existe conta com este e-mail.';
    if (err.code === 'auth/invalid-email') return 'E-mail inválido.';
    return 'Erro ao enviar e-mail.';
};

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64z"
        />
        <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.29v3.09A12 12 0 0 0 12 24z"
        />
        <path
            fill="#FBBC05"
            d="M5.28 14.29A7.18 7.18 0 0 1 4.9 12c0-.8.14-1.57.38-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.99-3.09z"
        />
        <path
            fill="#EA4335"
            d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.99 3.09C6.23 6.87 8.88 4.76 12 4.76z"
        />
    </svg>
);

// ============================================================================
// DETECÇÃO DE APLICATIVO INSTALADO (ANDROID / iOS CAPACITOR / PWA STANDALONE)
// ============================================================================

/**
 * Retorna true quando o usuário está no app nativo (Android/iOS) ou PWA instalado.
 * Facilidade de teste no navegador:
 * - `?app=1` (ou `?app=true`): força a tela direta de login/cadastro do app
 * - `?app=0` (ou `?app=false`): força a Landing Page web
 */
const isInstalledAppMode = () => {
    try {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const forcedMode = params.get('app');
            if (forcedMode === '1' || forcedMode === 'true') return true;
            if (forcedMode === '0' || forcedMode === 'false') return true; // RETIRAR O TRUE E COLOCAR O FALSE QUANDO FOR PUBLICAR COM A LANDING PAGE (Tem um mais pra baixo um pouco)
        }
    } catch {
        // Ignora erros de URL
    }

    if (Capacitor.isNativePlatform()) {
        return true;
    }

    try {
        if (typeof window !== 'undefined') {
            const isStandaloneMedia = window.matchMedia?.('(display-mode: standalone)')?.matches;
            const isIOSStandalone = window.navigator?.standalone === true;
            if (isStandaloneMedia || isIOSStandalone) {
                return true;
            }
        }
    } catch {
        // Ignora erros de matchMedia
    }

    return true; // RETIRAR O TRUE E COLOCAR O FALSE QUANDO FOR PUBLICAR COM A LANDING PAGE (Tem um mais pra cima um pouco)
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const AuthScreen = ({ unverifiedUser = null, onEmailVerified = null }) => {
    // ------------------------------------------------------------------------
    // 1. ESTADOS DA LANDING PAGE, PLATAFORMA E TEMA
    // ------------------------------------------------------------------------
    const [isAppMode] = useState(isInstalledAppMode);
    const scrollContainerRef = useRef(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(Boolean(unverifiedUser));
    const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);

    // ------------------------------------------------------------------------
    // 2. ESTADOS DE AUTENTICAÇÃO E FORMULÁRIO
    // ------------------------------------------------------------------------
    const [isLogin, setIsLogin] = useState(true);
    const [isResetting, setIsResetting] = useState(false);
    const [isPasswordChangeMode, setIsPasswordChangeMode] = useState(false);
    const [oobCode, setOobCode] = useState(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [checkingVerification, setCheckingVerification] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // ------------------------------------------------------------------------
    // 3. HELPERS DE VERIFICAÇÃO DE E-MAIL
    // ------------------------------------------------------------------------
    const checkEmailVerificationStatus = useCallback(async (silent = false) => {
        const targetUser = auth.currentUser || unverifiedUser;
        if (!targetUser) return false;

        if (!silent) {
            setCheckingVerification(true);
            setError('');
        }

        try {
            await targetUser.reload();
            const refreshedUser = auth.currentUser || targetUser;

            if (refreshedUser.emailVerified) {
                await refreshedUser.getIdToken(true);
                if (onEmailVerified) {
                    onEmailVerified(refreshedUser);
                }
                return true;
            }

            if (!silent) {
                setError('Seu e-mail ainda não foi confirmado. Clique no link enviado para sua caixa de entrada (ou spam) e tente novamente.');
            }
            return false;
        } catch (err) {
            if (!silent) {
                setError(mapAuthErrorMessage(err));
            }
            return false;
        } finally {
            if (!silent) {
                setCheckingVerification(false);
            }
        }
    }, [unverifiedUser, onEmailVerified]);

    // ------------------------------------------------------------------------
    // 4. EFEITOS COLATERAIS
    // ------------------------------------------------------------------------

    // Sincroniza tema claro/escuro com <html> e localStorage
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem(THEME_STORAGE_KEY, 'light');
        }
    }, [isDarkMode]);

    // Mantém o modal aberto automaticamente quando existe usuário aguardando confirmação de e-mail
    useEffect(() => {
        if (unverifiedUser) {
            setIsAuthModalOpen(true);
        }
    }, [unverifiedUser]);

    // Autoplay do carrossel Hero (desativado no modo App ou enquanto o modal estiver aberto)
    useEffect(() => {
        if (isAppMode || isAuthModalOpen) return;
        const interval = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
        }, HERO_AUTOPLAY_MS);
        return () => clearInterval(interval);
    }, [isAppMode, isAuthModalOpen]);

    // Captura retorno de login via redirect (fallback Web quando o navegador bloqueia popups)
    useEffect(() => {
        if (Capacitor.isNativePlatform()) return;
        getRedirectResult(auth).catch((err) => {
            if (err?.code && !['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err.code)) {
                setError(mapAuthErrorMessage(err));
                setIsAuthModalOpen(true);
            }
        });
    }, []);

    // Cooldown do botão de reenviar confirmação de e-mail
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Checagem silenciosa ao retornar para a aba/app após clicar no link do e-mail
    useEffect(() => {
        if (!unverifiedUser) return;

        const handleReturnToApp = () => {
            if (document.visibilityState === 'visible') {
                checkEmailVerificationStatus(true);
            }
        };

        window.addEventListener('focus', handleReturnToApp);
        document.addEventListener('visibilitychange', handleReturnToApp);

        return () => {
            window.removeEventListener('focus', handleReturnToApp);
            document.removeEventListener('visibilitychange', handleReturnToApp);
        };
    }, [unverifiedUser, checkEmailVerificationStatus]);

    // Intercepta links do Firebase Auth (resetPassword e verifyEmail) em Web, PWA e Capacitor
    useEffect(() => {
        const processAuthActionLink = async (urlStr) => {
            try {
                const url = new URL(urlStr, window.location.origin);
                const mode = url.searchParams.get('mode');
                const code = url.searchParams.get('oobCode');

                if (!mode || !code) return;

                if (mode === 'resetPassword') {
                    setOobCode(code);
                    setIsPasswordChangeMode(true);
                    setIsLogin(false);
                    setIsResetting(false);
                    setIsAuthModalOpen(true);

                    verifyPasswordResetCode(auth, code).catch(() => {
                        setError('Este link de recuperação expirou ou é inválido. Solicite um novo.');
                    });
                } else if (mode === 'verifyEmail') {
                    setIsAuthModalOpen(true);
                    setLoading(true);
                    setError('');
                    try {
                        await applyActionCode(auth, code);
                        window.history.replaceState({}, document.title, window.location.pathname);

                        const verifiedNow = await checkEmailVerificationStatus(true);
                        if (!verifiedNow) {
                            setIsLogin(true);
                            setIsResetting(false);
                            setIsPasswordChangeMode(false);
                            setSuccessMsg('E-mail confirmado com sucesso! Agora você já pode fazer login.');
                        }
                    } catch (err) {
                        setError(mapAuthErrorMessage(err));
                    } finally {
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error('Erro ao processar URL de ação do Firebase Auth:', err);
            }
        };

        processAuthActionLink(window.location.href);

        const handlePopState = () => processAuthActionLink(window.location.href);
        window.addEventListener('popstate', handlePopState);

        let deepLinkListener = null;
        const setupCapacitorListener = async () => {
            try {
                deepLinkListener = await CapacitorApp.addListener('appUrlOpen', (data) => {
                    processAuthActionLink(data.url);
                });
            } catch {
                // Ambiente web
            }
        };
        setupCapacitorListener();

        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (deepLinkListener) deepLinkListener.remove();
        };
    }, [checkEmailVerificationStatus]);

    // Fecha modal de autenticação com tecla Escape
    useEffect(() => {
        if (!isAuthModalOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape' && !unverifiedUser && !isPasswordChangeMode) {
                setIsAuthModalOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isAuthModalOpen, unverifiedUser, isPasswordChangeMode]);

    // ------------------------------------------------------------------------
    // 5. HELPERS DE NAVEGAÇÃO, TEMA E FORMULÁRIO
    // ------------------------------------------------------------------------
    const toggleTheme = () => setIsDarkMode((prev) => !prev);

    const clearFeedback = () => {
        setError('');
        setSuccessMsg('');
    };

    const openAuthModal = (mode = 'login') => {
        clearFeedback();
        setIsPasswordChangeMode(false);
        setIsResetting(false);
        setIsLogin(mode === 'login');
        setIsMobileMenuOpen(false);
        setIsAuthModalOpen(true);
    };

    const scrollToSection = (sectionId) => {
        setIsMobileMenuOpen(false);
        const el = document.getElementById(sectionId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleScroll = (e) => {
        const top = e.currentTarget.scrollTop;
        setIsScrolled(top > 24);
        setShowBackToTop(top > 120);
    };

    const formTitle = isPasswordChangeMode
        ? 'Criar Nova Senha'
        : isResetting
            ? 'Recuperar Senha'
            : isLogin
                ? 'Entrar na Conta'
                : 'Criar Nova Conta';

    const submitLabel = isPasswordChangeMode
        ? 'Salvar Nova Senha'
        : isResetting
            ? 'Enviar Link de Recuperação'
            : isLogin
                ? 'Entrar'
                : 'Criar Conta';

    const passwordsMismatch = Boolean(confirmPassword && password !== confirmPassword);
    const isAwaitingEmailVerification = Boolean(unverifiedUser && !isPasswordChangeMode);
    const currentSlide = HERO_SLIDES[activeSlide];

    // ------------------------------------------------------------------------
    // 6. HANDLERS DE AUTENTICAÇÃO
    // ------------------------------------------------------------------------
    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (isPasswordChangeMode) {
                if (password !== confirmPassword) {
                    setError('As senhas não coincidem.');
                    return;
                }
                if (password.length < MIN_PASSWORD_LENGTH) {
                    setError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
                    return;
                }

                await confirmPasswordReset(auth, oobCode, password);
                setSuccessMsg('Senha alterada com sucesso! Redirecionando...');

                setTimeout(() => {
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setIsPasswordChangeMode(false);
                    setIsLogin(true);
                    setSuccessMsg('');
                    setPassword('');
                    setConfirmPassword('');
                }, RESET_REDIRECT_DELAY_MS);
            } else if (isLogin) {
                const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
                if (!credential.user.emailVerified) {
                    setSuccessMsg('Confirme seu e-mail para liberar o acesso ao sistema.');
                }
            } else {
                const cleanEmail = email.trim();

                if (isDisposableEmail(cleanEmail)) {
                    setError('E-mails temporários ou descartáveis não são permitidos. Utilize um e-mail pessoal ou corporativo válido.');
                    return;
                }
                if (password !== confirmPassword) {
                    setError('As senhas não coincidem.');
                    return;
                }

                const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
                await sendEmailVerification(credential.user);
                setResendCooldown(RESEND_COOLDOWN_SECONDS);
                setSuccessMsg('Conta criada! Enviamos um link de confirmação para o seu e-mail. Verifique sua caixa de entrada (e spam).');
            }
        } catch (err) {
            setError(mapAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        clearFeedback();
        setGoogleLoading(true);

        try {
            if (Capacitor.isNativePlatform()) {
                const result = await FirebaseAuthentication.signInWithGoogle();
                const idToken = result?.credential?.idToken;

                if (!idToken) {
                    throw new Error('Não foi possível obter a credencial do Google.');
                }

                const credential = GoogleAuthProvider.credential(idToken);
                await signInWithCredential(auth, credential);
            } else {
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });

                try {
                    await signInWithPopup(auth, provider);
                } catch (popupErr) {
                    if (popupErr?.code === 'auth/popup-blocked') {
                        await signInWithRedirect(auth, provider);
                        return;
                    }
                    throw popupErr;
                }
            }
        } catch (err) {
            const cancelledCodes = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
            const msgLower = String(err?.message || '').toLowerCase();
            const wasUserCancelled =
                cancelledCodes.includes(err?.code) ||
                msgLower.includes('cancel') ||
                msgLower.includes('12501');

            if (!wasUserCancelled) {
                setError(mapAuthErrorMessage(err));
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Digite seu e-mail para recuperar a senha.');
            return;
        }

        clearFeedback();
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email.trim());
            setSuccessMsg('E-mail de redefinição enviado! Verifique sua caixa de entrada (e spam).');
        } catch (err) {
            console.error(err);
            setError(mapResetErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        const targetUser = auth.currentUser || unverifiedUser;
        if (!targetUser || resendCooldown > 0) return;

        clearFeedback();
        setLoading(true);

        try {
            await sendEmailVerification(targetUser);
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            setSuccessMsg('Novo e-mail de confirmação enviado! Verifique sua caixa de entrada (e spam).');
        } catch (err) {
            setError(mapAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSignOutUnverified = async () => {
        clearFeedback();
        setLoading(true);
        try {
            await signOut(auth);
            setPassword('');
            setConfirmPassword('');
            setIsLogin(true);
        } catch (err) {
            setError(mapAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    // ------------------------------------------------------------------------
    // 7. BLOCO COMPARTILHADO DO FORMULÁRIO DE AUTENTICAÇÃO (WEB MODAL + APP)
    // ------------------------------------------------------------------------
    const authCardContent = isAwaitingEmailVerification ? (
        <div className="space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#fcaf17]/15 border border-[#fcaf17]/30 flex items-center justify-center text-amber-600 dark:text-[#fcaf17]">
                <MailCheck size={32} />
            </div>

            <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    Confirme seu e-mail
                </h3>
                <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
                    Enviamos um link de confirmação para:
                </p>
                <p className="text-sm font-bold text-amber-700 dark:text-[#fcaf17] break-all bg-slate-100 dark:bg-black/60 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
                    {unverifiedUser.email}
                </p>
                <p className="text-xs text-slate-500 dark:text-neutral-400 pt-1">
                    Abra sua caixa de entrada (ou pasta de spam), clique no link de confirmação e depois clique no botão abaixo.
                </p>
            </div>

            {error && (
                <div className="p-3.5 rounded-lg border flex items-start gap-2 text-sm text-left bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 font-medium">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line">{error}</span>
                </div>
            )}
            {successMsg && (
                <div className="p-3.5 rounded-lg border flex items-center gap-2 text-sm text-left bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            <div className="space-y-3 pt-2">
                <button
                    type="button"
                    onClick={() => checkEmailVerificationStatus(false)}
                    disabled={checkingVerification || loading}
                    className="w-full bg-[#fcaf17] hover:bg-[#e59b0c] active:scale-[0.98] text-black font-black py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {checkingVerification ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <>
                            <CheckCircle2 size={18} />
                            <span>Já confirmei meu e-mail</span>
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading || resendCooldown > 0}
                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <>
                            <RefreshCw size={16} />
                            <span>
                                {resendCooldown > 0
                                    ? `Reenviar e-mail em ${resendCooldown}s`
                                    : 'Reenviar e-mail de confirmação'}
                            </span>
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={handleSignOutUnverified}
                    disabled={loading}
                    className="w-full text-sm text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white font-medium py-2 flex items-center justify-center gap-1.5 transition-colors"
                >
                    <LogOut size={15} />
                    <span>Sair / Usar outro e-mail</span>
                </button>
            </div>
        </div>
    ) : (
        <>
            <div className="mb-7">
                {!isAppMode && (
                    <span className="font-brand text-xs uppercase tracking-[0.25em] text-amber-600 dark:text-[#fcaf17]">
                        FTTH MANAGER CLOUD
                    </span>
                )}
                <h3 className={`text-2xl font-black text-slate-900 dark:text-white ${isAppMode ? '' : 'mt-1'}`}>
                    {formTitle}
                </h3>
            </div>

            <form onSubmit={isResetting ? handleResetPassword : handleAuth} className="space-y-4">
                {!isPasswordChangeMode && (
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                            E-MAIL
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-neutral-500" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Digite o seu e-mail"
                                autoFocus={!isPasswordChangeMode && !isAppMode}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 outline-none focus:border-[#fcaf17] text-[15px] transition-colors"
                                required
                            />
                        </div>
                    </div>
                )}

                {!isResetting && (
                    <>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                {isPasswordChangeMode ? 'NOVA SENHA' : 'SENHA'}
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-neutral-500" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={isPasswordChangeMode ? 'Digite a nova senha' : 'Digite a sua senha'}
                                    autoFocus={isPasswordChangeMode}
                                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-300 dark:border-neutral-800 bg-slate-50 dark:bg-black text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 outline-none focus:border-[#fcaf17] text-[15px] transition-colors"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:text-neutral-500 dark:hover:text-white transition-colors"
                                    tabIndex="-1"
                                >
                                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                        </div>

                        {(isPasswordChangeMode || !isLogin) && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    CONFIRMAR SENHA
                                </label>
                                <div className="relative">
                                    <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-neutral-500" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Digite a sua senha novamente"
                                        className={`w-full pl-10 pr-10 py-3 rounded-lg border bg-slate-50 dark:bg-black text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 outline-none text-[15px] transition-colors ${passwordsMismatch
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-slate-300 dark:border-neutral-800 focus:border-[#fcaf17]'
                                            }`}
                                        required
                                    />
                                </div>
                                {passwordsMismatch && (
                                    <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">
                                        As senhas não coincidem
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}

                {isLogin && !isResetting && !isPasswordChangeMode && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setIsResetting(true);
                                clearFeedback();
                            }}
                            className="text-xs font-semibold text-amber-600 dark:text-[#fcaf17] hover:underline"
                        >
                            Esqueceu a senha?
                        </button>
                    </div>
                )}

                {error && (
                    <div className="p-3.5 rounded-lg border flex items-start gap-2 text-sm bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 font-medium">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span className="whitespace-pre-line">{error}</span>
                    </div>
                )}
                {successMsg && (
                    <div className="p-3.5 rounded-lg border flex items-center gap-2 text-sm bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium">
                        <CheckCircle2 size={16} className="shrink-0" />
                        <span>{successMsg}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full bg-[#fcaf17] hover:bg-[#e59b0c] active:scale-[0.98] text-black font-black uppercase tracking-wider text-sm py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : submitLabel}
                </button>
            </form>

            {!isResetting && !isPasswordChangeMode && (
                <div className="mt-5 space-y-4">
                    <div className="relative flex items-center justify-center">
                        <div className="w-full border-t border-slate-200 dark:border-neutral-800" />
                        <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 shrink-0">
                            ou
                        </span>
                        <div className="w-full border-t border-slate-200 dark:border-neutral-800" />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading || googleLoading}
                        className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 active:scale-[0.98] text-slate-900 dark:text-white font-bold py-3.5 px-4 rounded-lg border border-slate-300 dark:border-neutral-700 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                    >
                        {googleLoading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                <GoogleIcon />
                                <span>Continuar com Google</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {!isPasswordChangeMode && (
                <div className="mt-7 pt-5 border-t border-slate-200 dark:border-neutral-800 text-center">
                    {isResetting ? (
                        <button
                            type="button"
                            onClick={() => {
                                setIsResetting(false);
                                clearFeedback();
                            }}
                            className="text-sm text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white font-semibold flex items-center justify-center gap-1 mx-auto transition-colors"
                        >
                            <ChevronLeft size={16} /> Voltar para o Login
                        </button>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-neutral-400">
                            {isLogin ? 'Ainda não tem conta?' : 'Já possui cadastro?'}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogin((prev) => !prev);
                                    clearFeedback();
                                }}
                                className="ml-1.5 text-amber-600 dark:text-[#fcaf17] font-bold hover:underline"
                            >
                                {isLogin ? 'Criar agora' : 'Fazer Login'}
                            </button>
                        </p>
                    )}
                </div>
            )}
        </>
    );

    // ------------------------------------------------------------------------
    // 8. RENDERIZAÇÃO MODO APP (ANDROID / iOS / PWA INSTALADO / ?app=1)
    //    Pula a Landing Page e abre direto na tela limpa de Login / Cadastro
    // ------------------------------------------------------------------------
    if (isAppMode) {
        return (
            <div className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-[#0b0b0b] dark:text-white font-sans selection:bg-[#fcaf17] selection:text-black transition-colors duration-300 flex flex-col">
                {/* Barra superior discreta com toggle de tema Claro/Escuro */}
                <div className="flex items-center justify-end px-4 sm:px-6 pt-4 pb-1 shrink-0">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center text-slate-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-[#fcaf17] transition-colors"
                        title={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                        aria-label={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                    >
                        <span className="relative w-5 h-5 flex items-center justify-center">
                            <Sun
                                size={19}
                                className={`absolute transition-all duration-500 ease-in-out ${isDarkMode
                                    ? 'opacity-100 rotate-0 scale-100'
                                    : 'opacity-0 rotate-180 scale-0'
                                    }`}
                            />
                            <Moon
                                size={19}
                                className={`absolute transition-all duration-500 ease-in-out ${isDarkMode
                                    ? 'opacity-0 -rotate-180 scale-0'
                                    : 'opacity-100 rotate-0 scale-100'
                                    }`}
                            />
                        </span>
                    </button>
                </div>

                {/* Conteúdo centralizado do Login / Cadastro */}
                <div className="flex-1 flex flex-col items-center justify-center px-5 pt-2 pb-10">
                    {/* Identidade da Aplicação */}
                    <div className="flex flex-col items-center text-center mb-6">
                        {/* Logotipo cabeçalho canto superior esquerdo amarelo com fundo transparente */}
                        <div className="relative flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 27093.32 27093.32"
                                className="w-24 h-24 sm:w-15 sm:h-15"
                                aria-hidden="true"
                            >
                                <g fill="#fcaf17">
                                    <path d="M6679.35 13395.7l0 1719.08c-464.88,0 -845.12,-380.08 -845.12,-845l0 -29.04c0,-464.96 380.24,-845.04 845.12,-845.04z" />
                                    <path d="M5866.15 17483.34l15360.98 0c396.08,0 720.2,324.08 720.2,720.2l0 1459.83c0,396.12 -324.12,720.2 -720.2,720.2l-15360.98 0c-396.04,0 -720.2,-324.08 -720.2,-720.2l0 -1459.83c0,-396.12 324.16,-720.2 720.2,-720.2z" />
                                    <path d="M15734.68 20129.21l2449.98 0 0 3322.76c0,203.48 -249,369.48 -553.56,369.48l-1342.86 0c-304.62,0 -553.56,-166 -553.56,-369.48l0 -3322.76z" />
                                    <path d="M12227.32 20129.21l2450.04 0 0 3322.76c0,203.48 -249,369.48 -553.56,369.48l-1342.86 0c-304.62,0 -553.62,-166 -553.62,-369.48l0 -3322.76z" />
                                    <path d="M8773.78 20129.21l2449.98 0 0 3322.76c0,203.48 -249,369.48 -553.56,369.48l-1342.86 0c-304.62,0 -553.56,-166 -553.56,-369.48l0 -3322.76z" />
                                    <path d="M12188.26 8998.67l464.28 0 0 -5696.68c547.92,-36.2 1085.16,-44.36 1633.48,1.44l0 5695.24 463.96 0 0 1719.07 -463.96 0 0 6491.28 -1633.48 0 0 -6491.28 -464.28 0 0 -1719.07z" />
                                    <path d="M9339.02 8998.67l473.84 0 0 -3562.6c0,-128.88 760.52,-497.96 1375.76,-590 89.92,-13.48 176.8,-21.04 257.72,-21.04l0 4173.64 454.36 0 0 1719.07 -454.36 0 0 6491.28 -1633.48 0 0 -6491.28 -144.12 0 -329.72 0 0 -1719.07z" />
                                    <path d="M6693.79 8998.67l259.88 0 0 -1663.52c0,-1174.28 816.68,-3132.84 4492.67,-3884.4l0 996.44c-54.64,7.08 -107.84,14.92 -160.44,23.16 -2490.11,389.48 -2698.87,2061.24 -2698.87,2864.8l0 1663.52 464.51 0 0 1719.07 -464.51 0 0 4179.04 0 2312.24c-544.52,0 -1088.76,0 -1633.36,0l0 -6491.28 -259.88 0c-472.8,0 -859.56,-386.76 -859.56,-859.32l0 -0.44c0,-472.52 386.76,-859.31 859.56,-859.31z" />
                                    <path d="M20005.93 17209.02l-1633.32 0 0 -6491.28 -1227.39 0 0 6491.28 -1633.08 0 0 -6491.28 -464.24 0 0 -1719.07 464.24 0 0 -5540.52c565.28,97.84 1074.48,238.88 1633.08,456l0 5084.52 1227.39 0 0 -4452.12c816.64,570.08 1633.32,1437.56 1633.32,2780l0 9882.47z" />
                                </g>
                            </svg>
                        </div>
                        <h1 className="font-brand text-2xl tracking-[0.18em] uppercase text-slate-900 dark:text-white leading-none">
                            FTTH MANAGER
                        </h1>
                        <span className="font-brand text-[11px] tracking-[0.34em] uppercase text-amber-600 dark:text-[#fcaf17] mt-1">
                            CLOUD
                        </span>
                    </div>

                    {/* Card de Autenticação */}
                    <div className="w-full max-w-md bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden">
                        <div className="h-1 w-full bg-[#fcaf17]" />
                        <div className="p-6 sm:p-8">
                            {authCardContent}
                        </div>
                    </div>

                    {/* Rodapé discreto com versão */}
                    <p className="mt-6 text-[11px] font-medium text-slate-400 dark:text-neutral-600">
                        <span className="font-brand tracking-wider uppercase">FTTH Manager Cloud</span> v{VERSAO}
                    </p>
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------------------
    // 9. RENDERIZAÇÃO MODO WEB — LANDING PAGE + MODAL DE AUTENTICAÇÃO
    // ------------------------------------------------------------------------
    return (
        <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden scroll-smooth bg-slate-50 text-slate-900 dark:bg-[#0b0b0b] dark:text-white font-sans selection:bg-[#fcaf17] selection:text-black transition-colors duration-300"
        >

            {/* ==============================================================
                1. NAVBAR FLUTUANTE TRANSPARENTE NO TOPO (imagem aparece por baixo)
                   Ao rolar, ganha fundo translúcido com blur adaptado ao tema
            ============================================================== */}
            <header
                className={`fixed top-0 left-0 right-0 z-40 h-20 transition-all duration-300 ${isScrolled || isMobileMenuOpen
                    ? 'bg-white/90 dark:bg-black/85 backdrop-blur-md'
                    : 'bg-gradient-to-b from-black/55 via-black/20 to-transparent'
                    }`}
            >
                <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">

                    {/* Esquerda: Emblema estilo R* adaptado para FTTH */}
                    <button
                        type="button"
                        onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex items-center gap-3 group shrink-0"
                    >
                        {/* Logotipo central amarelo com fundo transparente */}
                        <div className="relative flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 27093.32 27093.32"
                                className="w-10 h-10 sm:w-10 sm:h-10"
                                aria-hidden="true"
                            >
                                <g fill="#fcaf17">
                                    <path d="M6679.35 13395.7l0 1719.08c-464.88,0 -845.12,-380.08 -845.12,-845l0 -29.04c0,-464.96 380.24,-845.04 845.12,-845.04z" />
                                    <path d="M5866.15 17483.34l15360.98 0c396.08,0 720.2,324.08 720.2,720.2l0 1459.83c0,396.12 -324.12,720.2 -720.2,720.2l-15360.98 0c-396.04,0 -720.2,-324.08 -720.2,-720.2l0 -1459.83c0,-396.12 324.16,-720.2 720.2,-720.2z" />
                                    <path d="M15734.68 20129.21l2449.98 0 0 3322.76c0,203.48 -249,369.48 -553.56,369.48l-1342.86 0c-304.62,0 -553.56,-166 -553.56,-369.48l0 -3322.76z" />
                                    <path d="M12227.32 20129.21l2450.04 0 0 3322.76c0,203.48 -249,369.48 -553.56,369.48l-1342.86 0c-304.62,0 -553.62,-166 -553.62,-369.48l0 -3322.76z" />
                                    <path d="M8773.78 20129.21l2449.98 0 0 3322.76c0,203.48 -249,369.48 -553.56,369.48l-1342.86 0c-304.62,0 -553.56,-166 -553.56,-369.48l0 -3322.76z" />
                                    <path d="M12188.26 8998.67l464.28 0 0 -5696.68c547.92,-36.2 1085.16,-44.36 1633.48,1.44l0 5695.24 463.96 0 0 1719.07 -463.96 0 0 6491.28 -1633.48 0 0 -6491.28 -464.28 0 0 -1719.07z" />
                                    <path d="M9339.02 8998.67l473.84 0 0 -3562.6c0,-128.88 760.52,-497.96 1375.76,-590 89.92,-13.48 176.8,-21.04 257.72,-21.04l0 4173.64 454.36 0 0 1719.07 -454.36 0 0 6491.28 -1633.48 0 0 -6491.28 -144.12 0 -329.72 0 0 -1719.07z" />
                                    <path d="M6693.79 8998.67l259.88 0 0 -1663.52c0,-1174.28 816.68,-3132.84 4492.67,-3884.4l0 996.44c-54.64,7.08 -107.84,14.92 -160.44,23.16 -2490.11,389.48 -2698.87,2061.24 -2698.87,2864.8l0 1663.52 464.51 0 0 1719.07 -464.51 0 0 4179.04 0 2312.24c-544.52,0 -1088.76,0 -1633.36,0l0 -6491.28 -259.88 0c-472.8,0 -859.56,-386.76 -859.56,-859.32l0 -0.44c0,-472.52 386.76,-859.31 859.56,-859.31z" />
                                    <path d="M20005.93 17209.02l-1633.32 0 0 -6491.28 -1227.39 0 0 6491.28 -1633.08 0 0 -6491.28 -464.24 0 0 -1719.07 464.24 0 0 -5540.52c565.28,97.84 1074.48,238.88 1633.08,456l0 5084.52 1227.39 0 0 -4452.12c816.64,570.08 1633.32,1437.56 1633.32,2780l0 9882.47z" />
                                </g>
                            </svg>
                        </div>
                        <div className="hidden sm:flex flex-col text-left leading-none font-brand">
                            <span
                                className={`text-base tracking-[0.16em] uppercase transition-colors ${isScrolled || isMobileMenuOpen
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-white drop-shadow'
                                    }`}
                            >
                                FTTH MANAGER
                            </span>
                            <span className="text-[11px] tracking-[0.28em] uppercase text-[#fcaf17] mt-0.5">
                                CLOUD
                            </span>
                        </div>
                    </button>

                    {/* Centro: Links de navegação */}
                    <nav
                        className={`hidden md:flex items-center gap-8 text-sm font-semibold transition-colors ${isScrolled
                            ? 'text-slate-600 dark:text-neutral-300'
                            : 'text-white/90 drop-shadow'
                            }`}
                    >
                        <button
                            type="button"
                            onClick={() => scrollToSection('novidades')}
                            className={`transition-colors py-1 border-b-2 border-transparent hover:border-[#fcaf17] ${isScrolled ? 'hover:text-slate-950 dark:hover:text-white' : 'hover:text-white'
                                }`}
                        >
                            Novidades
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('modulos')}
                            className={`transition-colors py-1 border-b-2 border-transparent hover:border-[#fcaf17] ${isScrolled ? 'hover:text-slate-950 dark:hover:text-white' : 'hover:text-white'
                                }`}
                        >
                            Módulos
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('app-banner')}
                            className={`transition-colors py-1 border-b-2 border-transparent hover:border-[#fcaf17] ${isScrolled ? 'hover:text-slate-950 dark:hover:text-white' : 'hover:text-white'
                                }`}
                        >
                            Plataformas
                        </button>
                    </nav>

                    {/* Direita: Toggle Claro/Escuro + Perfil + Menu Mobile + CTA Teste Grátis na extrema direita */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                        {/* Botão Modo Light / Dark (fundo transparente + animação de giro Sol/Lua) */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className={`w-10 h-10 rounded-full bg-transparent flex items-center justify-center transition-colors ${isScrolled || isMobileMenuOpen
                                ? 'text-slate-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-[#fcaf17]'
                                : 'text-white hover:text-[#fcaf17] drop-shadow'
                                }`}
                            title={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                            aria-label={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                        >
                            <span className="relative w-5 h-5 flex items-center justify-center">
                                <Sun
                                    size={19}
                                    className={`absolute transition-all duration-500 ease-in-out ${isDarkMode
                                        ? 'opacity-100 rotate-0 scale-100'
                                        : 'opacity-0 rotate-180 scale-0'
                                        }`}
                                />
                                <Moon
                                    size={19}
                                    className={`absolute transition-all duration-500 ease-in-out ${isDarkMode
                                        ? 'opacity-0 -rotate-180 scale-0'
                                        : 'opacity-100 rotate-0 scale-100'
                                        }`}
                                />
                            </span>
                        </button>

                        {/* Botão Perfil (fundo transparente) */}
                        <button
                            type="button"
                            onClick={() => openAuthModal('login')}
                            className={`w-10 h-10 rounded-full bg-transparent flex items-center justify-center transition-colors ${isScrolled || isMobileMenuOpen
                                ? 'text-slate-700 hover:text-slate-950 dark:text-neutral-200 dark:hover:text-[#fcaf17]'
                                : 'text-white hover:text-[#fcaf17] drop-shadow'
                                }`}
                            title="Entrar na Conta"
                            aria-label="Entrar na Conta"
                        >
                            <User size={19} />
                        </button>

                        {/* Menu Mobile */}
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                            className={`md:hidden w-10 h-10 rounded-full bg-transparent flex items-center justify-center transition-colors ${isScrolled || isMobileMenuOpen
                                ? 'text-slate-800 hover:text-amber-600 dark:text-neutral-200 dark:hover:text-[#fcaf17]'
                                : 'text-white hover:text-[#fcaf17] drop-shadow'
                                }`}
                            aria-label="Abrir menu"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        {/* CTA Teste Grátis arredondado na extrema direita */}
                        <button
                            type="button"
                            onClick={() => openAuthModal('register')}
                            className="ml-1 bg-[#fcaf17] hover:bg-[#e59b0c] active:scale-[0.98] text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider px-5 sm:px-6 py-2.5 rounded-full transition-all shadow-md"
                        >
                            Teste Grátis
                        </button>
                    </div>
                </div>

                {/* Menu Dropdown Mobile */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white/95 dark:bg-black/95 backdrop-blur-md px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <button
                            type="button"
                            onClick={() => scrollToSection('novidades')}
                            className="block w-full text-left py-2 text-base font-bold text-slate-800 dark:text-neutral-200 hover:text-[#fcaf17]"
                        >
                            Novidades
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('modulos')}
                            className="block w-full text-left py-2 text-base font-bold text-slate-800 dark:text-neutral-200 hover:text-[#fcaf17]"
                        >
                            Módulos
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('app-banner')}
                            className="block w-full text-left py-2 text-base font-bold text-slate-800 dark:text-neutral-200 hover:text-[#fcaf17]"
                        >
                            Plataformas
                        </button>
                    </div>
                )}
            </header>

            {/* ==============================================================
                2. HERO FULL-BLEED RESPONSIVO (Imagem começa desde o topo y=0)
                2. HERO FULL-WIDTH RESPONSIVO (Imagem em tela cheia + conteúdo abaixo)
            ============================================================== */}
            <section className="w-full bg-white dark:bg-black border-b border-slate-200 dark:border-neutral-900 transition-colors duration-300">
                <div className="w-full flex flex-col">

                    {/* Palco visual 100% largura desde o topo (y = 0) */}
                    <div className={`w-full relative overflow-hidden bg-gradient-to-br ${currentSlide.gradient} min-h-[380px] sm:min-h-[460px] md:min-h-[540px] lg:min-h-[68vh] xl:min-h-[72vh] max-h-[780px] pt-24 pb-12 sm:pt-28 sm:pb-16 px-12 sm:px-16 flex items-center justify-center transition-all duration-700`}>
                        {/* Grade topográfica / linhas de fibra óptica responsivas em SVG */}
                        <svg
                            className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
                            viewBox="0 0 1200 720"
                            preserveAspectRatio="xMidYMid slice"
                            aria-hidden="true"
                        >
                            <defs>
                                <pattern id="ftth-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="1200" height="720" fill="url(#ftth-grid)" />
                            <path
                                d="M -60 540 C 220 430, 380 170, 620 265 S 980 500, 1260 155"
                                fill="none"
                                stroke={currentSlide.accent}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                            />
                            <path
                                d="M -40 310 C 260 285, 480 490, 760 355 S 1060 135, 1250 320"
                                fill="none"
                                stroke="rgba(255,255,255,0.35)"
                                strokeWidth="1.5"
                                strokeDasharray="8 8"
                            />
                            <circle cx="330" cy="315" r="9" fill={currentSlide.accent} />
                            <circle cx="330" cy="315" r="22" fill="none" stroke={currentSlide.accent} strokeOpacity="0.4" strokeWidth="2" />
                            <circle cx="620" cy="265" r="11" fill="#ffffff" />
                            <circle cx="620" cy="265" r="28" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" />
                            <circle cx="910" cy="345" r="9" fill={currentSlide.accent} />
                            <circle cx="910" cy="345" r="22" fill="none" stroke={currentSlide.accent} strokeOpacity="0.4" strokeWidth="2" />
                        </svg>

                        {/* Brilho radial responsivo */}
                        <div
                            className="absolute w-[280px] h-[280px] sm:w-[440px] sm:h-[440px] xl:w-[620px] xl:h-[620px] rounded-full blur-[120px] opacity-25 pointer-events-none transition-colors duration-700"
                            style={{ backgroundColor: currentSlide.accent }}
                        />

                        {/* Destaque tipográfico central responsivo */}
                        <div className="relative z-10 text-center max-w-3xl mx-auto">
                            <span
                                className="inline-block text-[10px] sm:text-[11px] font-black uppercase tracking-[0.26em] sm:tracking-[0.3em] px-3 py-1.5 rounded border mb-4 sm:mb-5 bg-black/45 backdrop-blur-sm"
                                style={{ borderColor: currentSlide.accent, color: currentSlide.accent }}
                            >
                                {currentSlide.tag}
                            </span>
                            <h2 className="font-brand text-4xl sm:text-6xl lg:text-7xl xl:text-8xl uppercase tracking-wider leading-[0.95] text-white drop-shadow-2xl">
                                FTTH MANAGER
                                <span
                                    className="block font-brand text-lg sm:text-2xl lg:text-3xl tracking-[0.28em] sm:tracking-[0.35em] mt-2 sm:mt-3"
                                    style={{ color: currentSlide.accent }}
                                >
                                    CLOUD v{VERSAO}
                                </span>
                            </h2>
                        </div>

                        {/* Controles laterais do carrossel responsivos */}
                        <button
                            type="button"
                            onClick={() => setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-black/55 hover:bg-black/85 border border-white/20 flex items-center justify-center text-white transition-all backdrop-blur-sm"
                            aria-label="Slide anterior"
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
                            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-black/55 hover:bg-black/85 border border-white/20 flex items-center justify-center text-white transition-all backdrop-blur-sm"
                            aria-label="Próximo slide"
                        >
                            <ChevronRight size={22} />
                        </button>
                    </div>

                    {/* Conteúdo editorial logo abaixo da imagem (PC e Mobile) */}
                    <div className="w-full bg-white dark:bg-black transition-colors duration-300">
                        <div className="max-w-[1380px] mx-auto px-5 lg:px-10 py-8 sm:py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div className="space-y-3 max-w-2xl">
                                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500 dark:text-neutral-400">
                                    {currentSlide.eyebrow}
                                </p>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-[1.1] text-slate-900 dark:text-white">
                                    {currentSlide.title}
                                </h1>
                                <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400 leading-relaxed">
                                    {currentSlide.subtitle}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => openAuthModal(activeSlide === 1 ? 'register' : 'login')}
                                    className="px-8 py-3.5 rounded border-2 border-slate-900 text-slate-900 dark:border-white dark:text-white hover:bg-[#fcaf17] hover:border-[#fcaf17] hover:text-black dark:hover:bg-[#fcaf17] dark:hover:border-[#fcaf17] dark:hover:text-black font-extrabold text-xs sm:text-sm uppercase tracking-[0.14em] transition-all"
                                >
                                    {currentSlide.ctaLabel}
                                </button>

                                {/* Indicadores horizontais assinatura Rockstar */}
                                <div className="flex items-center gap-2.5">
                                    {HERO_SLIDES.map((slide, idx) => (
                                        <button
                                            key={slide.id}
                                            type="button"
                                            onClick={() => setActiveSlide(idx)}
                                            aria-label={`Ir para slide ${idx + 1}`}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlide
                                                ? 'w-14 bg-slate-900 dark:bg-white'
                                                : 'w-4 bg-slate-300 hover:bg-slate-400 dark:bg-neutral-700 dark:hover:bg-neutral-500'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==============================================================
                3. SEÇÃO "NOVIDADES" (Grade Newswire — 3 colunas)
            ============================================================== */}
            <section id="novidades" className="max-w-[1380px] mx-auto px-5 lg:px-10 py-14 lg:py-20">
                <div className="flex items-end justify-between mb-8">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        Novidades
                    </h2>
                    <button
                        type="button"
                        onClick={() => openAuthModal('login')}
                        className="text-sm font-bold text-slate-700 dark:text-neutral-300 hover:text-amber-600 dark:hover:text-[#fcaf17] pb-0.5 border-b-2 border-[#fcaf17] transition-colors flex items-center gap-1"
                    >
                        Explorar na Plataforma <ArrowUpRight size={15} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
                    {NEWSWIRE_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <article
                                key={item.id}
                                onClick={() => openAuthModal('login')}
                                className="group cursor-pointer bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 hover:border-slate-400 dark:hover:border-neutral-600 rounded-md overflow-hidden flex flex-col shadow-sm hover:shadow-xl dark:shadow-none transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Capa 16:9 estilizada */}
                                <div className={`aspect-video relative overflow-hidden bg-gradient-to-br ${item.accent} flex items-center justify-center`}>
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_70%)]" />
                                    <div className="w-16 h-16 rounded-2xl bg-black/55 border border-white/15 flex items-center justify-center text-white group-hover:scale-110 group-hover:text-[#fcaf17] transition-all duration-300">
                                        <Icon size={30} />
                                    </div>
                                    <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded bg-black/75 border border-white/10 text-neutral-200">
                                        {item.badge}
                                    </span>
                                </div>

                                {/* Conteúdo editorial */}
                                <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-xs font-bold">
                                            <span className="text-slate-900 dark:text-white">{item.category}</span>
                                            <span className="text-slate-500 dark:text-neutral-500">{item.date}</span>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-extrabold leading-snug text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-[#fcaf17] transition-colors">
                                            {item.title}
                                        </h3>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* ==============================================================
                4. SEÇÃO "MÓDULOS EM DESTAQUE" (4 pôsteres verticais 3:4)
            ============================================================== */}
            <section id="modulos" className="max-w-[1380px] mx-auto px-5 lg:px-10 py-10 lg:py-16">
                <div className="flex items-end justify-between mb-8">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        Módulos em Destaque
                    </h2>
                    <button
                        type="button"
                        onClick={() => openAuthModal('register')}
                        className="text-sm font-bold text-slate-700 dark:text-neutral-300 hover:text-amber-600 dark:hover:text-[#fcaf17] pb-0.5 border-b-2 border-[#fcaf17] transition-colors"
                    >
                        Começar agora
                    </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-7">
                    {FEATURED_MODULES.map((mod) => (
                        <button
                            key={mod.id}
                            type="button"
                            onClick={() => openAuthModal('login')}
                            className={`group relative aspect-[3/4] rounded-md overflow-hidden border border-slate-300 dark:border-neutral-800 ${mod.borderHover} bg-gradient-to-b ${mod.gradient} p-5 sm:p-6 flex flex-col justify-between text-left transition-all duration-300 hover:scale-[1.02] shadow-lg`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="w-8 h-1 rounded-full bg-white/30 group-hover:bg-[#fcaf17] transition-colors" />
                                <ArrowUpRight size={18} className="text-neutral-400 group-hover:text-white transition-colors" />
                            </div>

                            <div className="space-y-1.5">
                                <p className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.22em] sm:tracking-[0.25em] ${mod.accentText}`}>
                                    {mod.subtitle}
                                </p>
                                <h3 className="text-lg sm:text-2xl lg:text-3xl font-black uppercase tracking-tight leading-none text-white">
                                    {mod.title}
                                </h3>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* ==============================================================
                5. BANNER DE PLATAFORMA
            ============================================================== */}
            <section id="app-banner" className="max-w-[1380px] mx-auto px-5 lg:px-10 py-12 lg:py-14">
                <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-neutral-800 bg-gradient-to-r from-white via-slate-50 to-amber-50/80 dark:from-black dark:via-neutral-950 dark:to-[#1a1304] p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 shadow-sm dark:shadow-none">
                    <div className="space-y-4 max-w-xl">
                        <span className="inline-block font-brand text-xs uppercase tracking-[0.25em] text-amber-600 dark:text-[#fcaf17]">
                            FTTH MANAGER CLOUD
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                            Pronto para mapear sua rede de fibra óptica com velocidade?
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400">
                            Entre com sua conta Google ou crie seu acesso verificado em segundos — sincronizado entre navegador, PWA e aplicativos Android e iOS.
                        </p>

                        {/* Botões oficiais das lojas (prontos para receber os links em STORE_LINKS) */}
                        <div className="pt-2 flex flex-wrap items-center gap-3">
                            <a
                                href={STORE_LINKS.playStore || '#app-banner'}
                                target={STORE_LINKS.playStore ? '_blank' : undefined}
                                rel={STORE_LINKS.playStore ? 'noopener noreferrer' : undefined}
                                onClick={(e) => {
                                    if (!STORE_LINKS.playStore) e.preventDefault();
                                }}
                                aria-label="Disponível no Google Play"
                                title={STORE_LINKS.playStore ? 'Baixar no Google Play' : 'Em breve no Google Play'}
                                className="inline-flex items-center gap-3 bg-black hover:bg-neutral-900 text-white border border-slate-800 dark:border-neutral-700 hover:border-[#fcaf17] rounded-lg px-4 py-2.5 min-w-[172px] transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="#4285F4" d="M3.61 1.814L13.793 12 3.61 22.186a1.75 1.75 0 0 1-.61-1.34V3.154c0-.525.23-.998.61-1.34z" />
                                    <path fill="#34A853" d="M17.205 8.588L13.793 12l3.412 3.412 3.854-2.192c.78-.444.78-1.996 0-2.44l-3.854-2.192z" />
                                    <path fill="#FBBC05" d="M3.61 22.186L13.793 12l3.412 3.412-11.67 6.637c-.765.435-1.51.404-1.925.137z" />
                                    <path fill="#EA4335" d="M17.205 8.588L5.535 1.951c-.415-.267-1.16-.298-1.925.137L13.793 12l3.412-3.412z" />
                                </svg>
                                <span className="flex flex-col text-left leading-tight">
                                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-300">
                                        Disponível no
                                    </span>
                                    <span className="text-[15px] font-bold tracking-tight text-white">
                                        Google Play
                                    </span>
                                </span>
                            </a>

                            <a
                                href={STORE_LINKS.appStore || '#app-banner'}
                                target={STORE_LINKS.appStore ? '_blank' : undefined}
                                rel={STORE_LINKS.appStore ? 'noopener noreferrer' : undefined}
                                onClick={(e) => {
                                    if (!STORE_LINKS.appStore) e.preventDefault();
                                }}
                                aria-label="Baixar na App Store"
                                title={STORE_LINKS.appStore ? 'Baixar na App Store' : 'Em breve na App Store'}
                                className="inline-flex items-center gap-3 bg-black hover:bg-neutral-900 text-white border border-slate-800 dark:border-neutral-700 hover:border-[#fcaf17] rounded-lg px-4 py-2.5 min-w-[172px] transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <svg className="w-6 h-6 shrink-0 fill-current text-white" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.33c.64-.78 1.08-1.86.96-2.94-.93.04-2.06.62-2.72 1.4-.58.68-1.1 1.79-.96 2.84 1.04.08 2.08-.52 2.72-1.3z" />
                                </svg>
                                <span className="flex flex-col text-left leading-tight">
                                    <span className="text-[9px] font-semibold tracking-[0.04em] text-neutral-300">
                                        Baixar na
                                    </span>
                                    <span className="text-[15px] font-bold tracking-tight text-white">
                                        App Store
                                    </span>
                                </span>
                            </a>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 shrink-0">
                        <button
                            type="button"
                            onClick={() => openAuthModal('login')}
                            className="bg-[#fcaf17] hover:bg-[#e59b0c] text-black font-black text-xs sm:text-sm uppercase tracking-[0.14em] px-8 py-4 rounded transition-colors shadow-md"
                        >
                            Entrar Agora
                        </button>
                        <button
                            type="button"
                            onClick={() => openAuthModal('register')}
                            className="border-2 border-slate-900/70 hover:border-slate-900 text-slate-900 dark:border-white/60 dark:hover:border-white dark:text-white font-extrabold text-xs sm:text-sm uppercase tracking-[0.14em] px-8 py-4 rounded transition-colors"
                        >
                            Criar Conta
                        </button>
                    </div>
                </div>
            </section>

            {/* ==============================================================
                6. RODAPÉ MINIMALISTA
            ============================================================== */}
            <footer className="bg-white dark:bg-black border-t border-slate-200 dark:border-neutral-900 mt-8 transition-colors duration-300">
                <div className="max-w-[1380px] mx-auto px-5 lg:px-10 py-12 space-y-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-slate-700 dark:text-neutral-300">
                            <button type="button" onClick={() => openAuthModal('login')} className="hover:text-amber-600 dark:hover:text-[#fcaf17] transition-colors">
                                Acessar Conta
                            </button>
                            <button type="button" onClick={() => openAuthModal('register')} className="hover:text-amber-600 dark:hover:text-[#fcaf17] transition-colors">
                                Criar Conta
                            </button>
                            <button type="button" onClick={() => scrollToSection('novidades')} className="hover:text-amber-600 dark:hover:text-[#fcaf17] transition-colors">
                                Novidades
                            </button>
                            <button type="button" onClick={() => scrollToSection('modulos')} className="hover:text-amber-600 dark:hover:text-[#fcaf17] transition-colors">
                                Módulos
                            </button>
                        </div>

                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-700 dark:text-neutral-300">
                            <Globe size={14} className="text-amber-600 dark:text-[#fcaf17]" />
                            <span>Português (Brasil)</span>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-200 dark:border-neutral-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-semibold text-slate-500 dark:text-neutral-500">
                        <span><span className="font-brand text-sm tracking-wider uppercase text-slate-700 dark:text-neutral-300">FTTH Manager Cloud</span> — Gestão Avançada de Redes de Fibra Óptica</span>
                        <span>&copy; 2026 <span className="font-brand tracking-wider uppercase">FTTH Manager Cloud</span> v{VERSAO} Beta. Todos os direitos reservados.</span>
                    </div>
                </div>
            </footer>

            {/* ==============================================================
                BOTÃO FLUTUANTE: VOLTAR AO TOPO (aparece ao sair do topo)
            ============================================================== */}
            <button
                type="button"
                onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Voltar ao topo"
                title="Voltar ao topo"
                className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#fcaf17] hover:bg-[#e59b0c] active:scale-95 text-black shadow-2xl shadow-black/40 flex items-center justify-center transition-all duration-300 ${showBackToTop && !isAuthModalOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
            >
                <ChevronUp size={24} strokeWidth={2.75} />
            </button>

            {/* ==============================================================
                7. MODAL DE AUTENTICAÇÃO (Light + Dark)
            ============================================================== */}
            {isAuthModalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !unverifiedUser && !isPasswordChangeMode) {
                            setIsAuthModalOpen(false);
                        }
                    }}
                >
                    <div className="relative w-full max-w-md bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden text-slate-900 dark:text-white my-auto">
                        {/* Faixa superior dourada */}
                        <div className="h-1 w-full bg-[#fcaf17]" />

                        {!unverifiedUser && !isPasswordChangeMode && (
                            <button
                                type="button"
                                onClick={() => setIsAuthModalOpen(false)}
                                className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white flex items-center justify-center transition-colors"
                                aria-label="Fechar"
                            >
                                <X size={18} />
                            </button>
                        )}

                        <div className="p-7 sm:p-9">
                            {authCardContent}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthScreen;
