/*
 * Tela de autenticação do sistema: login, criação de conta, envio de e-mail
 * de recuperação e redefinição de senha (com suporte a Web, PWA e Capacitor).
 */

// ============================================================================
// IMPORTS
// ============================================================================

// React
import React, { useState, useEffect } from 'react';

// Firebase Auth
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset
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
    Eye,
    EyeOff
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';

// Configurações e Componentes Internos
import { VERSAO } from '../config/constants';
import ThemeToggleButton from '../components/ThemeToggleButton';

// ============================================================================
// CONSTANTES E UTILITÁRIOS PUROS
// ============================================================================

const THEME_STORAGE_KEY = 'ftth_theme';
const MIN_PASSWORD_LENGTH = 8;
const RESET_REDIRECT_DELAY_MS = 3000;

/**
 * Determina o tema inicial a partir do localStorage.
 * Caso o usuário nunca tenha escolhido um tema, inicia no modo escuro.
 */
const getInitialTheme = () => {
    if (typeof window === 'undefined') return true;
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) return savedTheme === 'dark';
    return true;
};

/**
 * Converte códigos de erro do Firebase Auth (login, cadastro e troca de senha)
 * em mensagens amigáveis para exibição ao usuário.
 */
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
            return 'Muitas tentativas falhadas. Tente novamente mais tarde.';
        case 'auth/network-request-failed':
            return 'Erro de conexão com o servidor.';
        case 'auth/expired-action-code':
            return 'O link expirou. Por favor, solicite um novo.';
        case 'auth/invalid-action-code':
            return 'Link inválido ou já utilizado.';
        default:
            return `Erro: ${err.message}`;
    }
};

/**
 * Converte códigos de erro do envio de e-mail de redefinição de senha.
 */
const mapResetErrorMessage = (err) => {
    if (err.code === 'auth/user-not-found') return 'E-mail incorreto.';
    if (err.code === 'auth/invalid-email') return 'O formato do e-mail é inválido.';
    return 'Erro ao enviar e-mail.';
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const AuthScreen = () => {
    // ------------------------------------------------------------------------
    // 1. ESTADOS DE NAVEGAÇÃO / MODO DA TELA
    // ------------------------------------------------------------------------
    const [isLogin, setIsLogin] = useState(true);                         // Alterna entre Login (true) e Cadastro (false)
    const [isResetting, setIsResetting] = useState(false);                // Exibe o formulário de solicitação de recuperação de senha
    const [isPasswordChangeMode, setIsPasswordChangeMode] = useState(false); // Exibe o formulário de criação de nova senha via oobCode
    const [oobCode, setOobCode] = useState(null);                         // Código de verificação extraído do link de recuperação

    // ------------------------------------------------------------------------
    // 2. ESTADOS DOS CAMPOS DO FORMULÁRIO
    // ------------------------------------------------------------------------
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);              // Controla visibilidade dos campos de senha

    // ------------------------------------------------------------------------
    // 3. ESTADOS DE INTERFACE E FEEDBACK
    // ------------------------------------------------------------------------
    const [error, setError] = useState('');                               // Estado para mensagens de erro
    const [successMsg, setSuccessMsg] = useState('');                     // Estado para mensagens de sucesso
    const [loading, setLoading] = useState(false);                        // Estado para indicar carregamento dentro do botão "Entrar"
    const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);        // Estado para indicar tema escuro

    // ------------------------------------------------------------------------
    // 4. EFEITOS COLATERAIS (useEffect)
    // ------------------------------------------------------------------------

    // Sincroniza a classe "dark" no elemento raiz <html> e persiste no localStorage
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

    // Detecta e valida links de redefinição de senha vindos de URL Web, PWA ou Deep Link Capacitor
    useEffect(() => {
        const processResetLink = (urlStr) => {
            try {
                const url = new URL(urlStr, window.location.origin);
                const mode = url.searchParams.get('mode');
                const code = url.searchParams.get('oobCode');

                if (mode === 'resetPassword' && code) {
                    setOobCode(code);
                    setIsPasswordChangeMode(true);
                    setIsLogin(false);
                    setIsResetting(false);

                    // Valida o código no Firebase silenciosamente para alertar se já expirou
                    verifyPasswordResetCode(auth, code).catch(() => {
                        setError('Este link de recuperação expirou ou é inválido. Solicite um novo.');
                    });
                }
            } catch (err) {
                console.error('Erro ao processar URL de recuperação:', err);
            }
        };

        // A) Checagem inicial ao abrir ou recarregar a página
        processResetLink(window.location.href);

        // B) Checagem PWA quando o navegador reaproveita a aba existente
        const handlePopState = () => processResetLink(window.location.href);
        window.addEventListener('popstate', handlePopState);

        // C) Checagem Mobile Nativo via deep link do Capacitor
        let deepLinkListener = null;
        const setupCapacitorListener = async () => {
            try {
                deepLinkListener = await CapacitorApp.addListener('appUrlOpen', (data) => {
                    processResetLink(data.url);
                });
            } catch {
                // Ignora silenciosamente quando executando apenas no navegador web
            }
        };
        setupCapacitorListener();

        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (deepLinkListener) deepLinkListener.remove();
        };
    }, []);

    // ------------------------------------------------------------------------
    // 5. FUNÇÕES AUXILIARES (HELPERS)
    // ------------------------------------------------------------------------

    /** Alterna entre tema claro e tema escuro. */
    const toggleTheme = () => {
        setIsDarkMode((prev) => !prev);
    };

    /** Limpa mensagens de erro e sucesso ao mudar entre modos da tela. */
    const clearFeedback = () => {
        setError('');
        setSuccessMsg('');
    };

    // Textos dinâmicos derivados do modo atual da tela
    const formTitle = isPasswordChangeMode
        ? 'Criar Nova Senha'
        : isResetting
            ? 'Recuperar Senha'
            : isLogin
                ? 'Bem-vindo de volta'
                : 'Criar nova conta';

    const submitLabel = isPasswordChangeMode
        ? 'Salvar Nova Senha'
        : isResetting
            ? 'Enviar Link de Recuperação'
            : isLogin
                ? 'Entrar'
                : 'Criar Conta';

    const passwordsMismatch = Boolean(confirmPassword && password !== confirmPassword);

    // ------------------------------------------------------------------------
    // 6. HANDLERS DE AUTENTICAÇÃO
    // ------------------------------------------------------------------------

    /**
     * Processa o envio do formulário nos modos:
     * - Troca de senha via código de recuperação (confirmPasswordReset)
     * - Login com e-mail e senha (signInWithEmailAndPassword)
     * - Criação de nova conta (createUserWithEmailAndPassword)
     */
    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
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

                // Limpa os parâmetros da URL e retorna para o login após breve feedback
                setTimeout(() => {
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setIsPasswordChangeMode(false);
                    setIsLogin(true);
                    setSuccessMsg('');
                    setPassword('');
                    setConfirmPassword('');
                }, RESET_REDIRECT_DELAY_MS);
            } else if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                if (password !== confirmPassword) {
                    setError('As senhas não coincidem.');
                    return;
                }
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(mapAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    /**
     * Envia o e-mail de redefinição de senha para o endereço informado.
     */
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Digite seu e-mail para recuperar a senha.');
            return;
        }

        clearFeedback();
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMsg('E-mail de redefinição enviado! Verifique sua caixa de entrada (e spam).');
        } catch (err) {
            console.error(err);
            setError(mapResetErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    // ------------------------------------------------------------------------
    // 7. RENDERIZAÇÃO
    // ------------------------------------------------------------------------
    return (
        <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center lg:justify-between min-h-screen p-6 lg:p-12 relative overflow-hidden transition-all duration-500 ease-in-out bg-gradient-to-br from-slate-200 via-slate-300 to-slate-200 dark:from-black dark:via-slate-800 dark:to-black">

            {/* Alternador de tema Claro / Escuro */}
            <ThemeToggleButton
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                className="absolute top-4 right-4 lg:top-8 lg:right-8 z-50"
            />

            {/* Cabeçalho / Identidade visual da aplicação */}
            <div className="w-full lg:w-1/2 flex flex-row lg:flex-col items-center lg:items-start justify-start z-10 mb-8 lg:mb-0 transition-all duration-500 ease-in-out">
                {/* Logotipo */}
                <div className="shrink-0 transition-all duration-500 ease-in-out">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 bg-black/10 dark:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30 dark:border-white/10 transition-all duration-500 ease-in-out">
                        <img
                            src="/favicon.svg"
                            alt="FTTH Manager"
                            className="w-10 h-10 lg:w-12 lg:h-12 drop-shadow-md transition-all duration-500 ease-in-out text-sky-500"
                        />
                    </div>
                </div>

                {/* Título e subtítulo */}
                <div className="flex flex-col justify-center ml-4 lg:ml-0 lg:mt-auto lg:mb-auto transition-all duration-500 ease-in-out flex-1 lg:pr-10 xl:pl-8">
                    <h1 className="text-2xl lg:text-5xl xl:text-7xl font-extrabold tracking-wide text-gray-800 dark:text-white leading-none lg:mb-2 drop-shadow-lg transition-all duration-500 ease-in-out">
                        FTTH MANAGER
                    </h1>
                    <h2 className="text-[15px] lg:text-3xl xl:text-4xl font-bold text-sky-500 tracking-[0.2em] lg:tracking-[0.4em] mb-0.5 lg:mb-6 drop-shadow-md transition-all duration-500 ease-in-out">
                        CLOUD
                    </h2>
                    <div className="hidden lg:block w-24 h-1.5 bg-sky-500 rounded-full mb-6 opacity-80 transition-all duration-500 ease-in-out" />
                    <p className="text-[12px] sm:text-xs lg:text-xl xl:text-2xl font-normal text-black dark:text-white max-w-md transition-all duration-500 ease-in-out leading-tight">
                        Gestão Avançada de Redes de Fibra Óptica
                    </p>
                </div>
            </div>

            {/* Card principal de autenticação */}
            <div className="w-full max-w-md self-center bg-white/20 dark:bg-black/40 border border-white/60 dark:border-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden text-black dark:text-white transition-all duration-500 ease-in-out lg:mr-8 xl:mr-16 z-10">
                <div className="p-8 sm:p-10">
                    <h3 className="text-2xl font-bold mb-8 text-center text-gray-800 dark:text-white">
                        {formTitle}
                    </h3>

                    <form onSubmit={isResetting ? handleResetPassword : handleAuth} className="space-y-5">

                        {/* Campo de E-mail (oculto no modo de definição de nova senha) */}
                        {!isPasswordChangeMode && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider opacity-70 ml-1 text-gray-700 dark:text-gray-300">
                                    E-MAIL
                                </label>
                                <div className="relative">
                                    <Mail
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Digite o seu e-mail"
                                        autoFocus={!isPasswordChangeMode}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border bg-white/50 dark:bg-black/50 outline-none transition-all duration-500 text-[16px] border-white/60 dark:border-white/10 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Campos de Senha e Confirmação (ocultos ao solicitar e-mail de recuperação) */}
                        {!isResetting && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider opacity-70 ml-1 text-gray-700 dark:text-gray-300">
                                        {isPasswordChangeMode ? 'NOVA SENHA' : 'SENHA'}
                                    </label>
                                    <div className="relative">
                                        <Lock
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-400"
                                            size={18}
                                        />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={isPasswordChangeMode ? 'Digite a nova senha' : 'Digite a sua senha'}
                                            autoFocus={isPasswordChangeMode}
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border bg-white/50 dark:bg-black/50 outline-none transition-all duration-500 text-[16px] border-white/60 dark:border-white/10 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity text-gray-600 dark:text-gray-300"
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirmação de senha (exibida no Cadastro e na Troca de Senha) */}
                                {(isPasswordChangeMode || !isLogin) && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                        <label className="text-[11px] font-bold uppercase tracking-wider opacity-70 ml-1 text-gray-700 dark:text-gray-300">
                                            CONFIRMAR SENHA
                                        </label>
                                        <div className="relative">
                                            <CheckCircle2
                                                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-400"
                                                size={18}
                                            />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Digite a sua senha novamente"
                                                className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-white/50 dark:bg-black/50 outline-none transition-all duration-500 text-[16px] ${passwordsMismatch
                                                    ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-500'
                                                    : 'border-white/60 dark:border-white/10 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500'
                                                    }`}
                                                required
                                            />
                                        </div>
                                        {passwordsMismatch && (
                                            <p className="text-[11px] text-red-500 font-medium ml-1 mt-1">
                                                As senhas não coincidem
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Atalho para recuperação de senha (visível apenas no modo Login) */}
                        {isLogin && !isResetting && !isPasswordChangeMode && (
                            <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsResetting(true);
                                        clearFeedback();
                                    }}
                                    className="text-xs font-medium text-sky-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                                >
                                    Esqueceu a senha?
                                </button>
                            </div>
                        )}

                        {/* Mensagens de feedback (erro / sucesso) */}
                        {error && (
                            <div className="p-3.5 rounded-xl border flex items-start gap-2 text-sm animate-in fade-in backdrop-blur-sm mt-4 bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 font-medium">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span className="whitespace-pre-line">{error}</span>
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-3.5 rounded-xl border flex items-center gap-2 text-sm animate-in fade-in backdrop-blur-sm mt-4 bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 font-medium">
                                <CheckCircle2 size={16} className="shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        {/* Botão principal de submissão */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-sky-500 hover:bg-blue-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : submitLabel}
                        </button>
                    </form>

                    {/* Rodapé de alternância entre Login, Cadastro e Recuperação */}
                    {!isPasswordChangeMode && (
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10 text-center">
                            {isResetting ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsResetting(false);
                                        clearFeedback();
                                    }}
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
                                >
                                    <ChevronLeft size={16} /> Voltar para o Login
                                </button>
                            ) : (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {isLogin ? 'Ainda não tem conta?' : 'Já possui cadastro?'}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsLogin((prev) => !prev);
                                            clearFeedback();
                                        }}
                                        className="ml-1.5 text-sky-500 font-bold hover:underline transition-colors"
                                    >
                                        {isLogin ? 'Criar agora' : 'Fazer Login'}
                                    </button>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Rodapé de copyright e versão */}
            <div className="absolute bottom-4 text-xs font-medium text-gray-400 dark:text-gray-500 text-center w-full flex items-center justify-center gap-1">
                &copy; 2026 FTTH Manager Cloud v{VERSAO} Beta. Todos os direitos reservados.
            </div>
        </div>
    );
};

export default AuthScreen;