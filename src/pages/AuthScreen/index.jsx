/*
 * Tela de login, autenticação e recuperação de senha do sistema.
 */

import React, { useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset
} from "firebase/auth";
import { auth } from '../../config/firebaseConfig';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { VERSAO } from '../../config/constants';
import ThemeToggleButton from '../../components/ThemeToggleButton';

const AuthScreen = ({ onLogin }) => {
    // Estados de Controle de Tela
    const [isLogin, setIsLogin] = useState(true);
    const [isResetting, setIsResetting] = useState(false);

    // NOVO: Estados para a Troca Real de Senha
    const [isPasswordChangeMode, setIsPasswordChangeMode] = useState(false);
    const [oobCode, setOobCode] = useState(null);

    // Estados dos Campos
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Estado para mostrar/ocultar senha
    const [showPassword, setShowPassword] = useState(false);

    // Estados de Feedback
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Estado inicial inteligente
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const temaSalvo = localStorage.getItem('ftth_theme');
            if (temaSalvo) return temaSalvo === 'dark';
            return true; // Primeira vez: modo escuro
        }
        return true;
    });

    // 2. Sincronização com o HTML e LocalStorage
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('ftth_theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('ftth_theme', 'light');
        }
    }, [isDarkMode]);

    // 3. Verifica se veio do e-mail de recuperação
    // useEffect(() => {
    //     const urlParams = new URLSearchParams(window.location.search);
    //     const mode = urlParams.get('mode');
    //     const code = urlParams.get('oobCode');

    //     if (mode === 'resetPassword' && code) {
    //         setOobCode(code);
    //         setIsPasswordChangeMode(true);
    //         setIsLogin(false);
    //         setIsResetting(false);

    //         // Valida o link silenciosamente
    //         verifyPasswordResetCode(auth, code).catch(() => {
    //             setError('Este link de recuperação expirou ou é inválido. Solicite um novo.');
    //         });
    //     }
    // }, []);

    // 3. Verifica a URL (AGORA COM SUPORTE A PWA E DEEP LINKS MOBILE)
    useEffect(() => {
        const processResetLink = (urlStr) => {
            try {
                // Monta a URL de forma segura para não quebrar se o formato vier estranho
                const url = new URL(urlStr, window.location.origin);
                const mode = url.searchParams.get('mode');
                const code = url.searchParams.get('oobCode');

                if (mode === 'resetPassword' && code) {
                    setOobCode(code);
                    setIsPasswordChangeMode(true);
                    setIsLogin(false);
                    setIsResetting(false);

                    // Valida o link no Google silenciosamente
                    verifyPasswordResetCode(auth, code).catch(() => {
                        setError('Este link de recuperação expirou ou é inválido. Solicite um novo.');
                    });
                }
            } catch (error) {
                console.error("Erro ao processar URL de recuperação:", error);
            }
        };

        // A) Checagem inicial: Roda quando o app abre do zero (Nova aba/Recarregamento)
        processResetLink(window.location.href);

        // B) Checagem PWA: Ouve mudanças de histórico se o navegador reaproveitar a aba
        const handlePopState = () => processResetLink(window.location.href);
        window.addEventListener('popstate', handlePopState);

        // C) Checagem Mobile Nativo: Captura o clique no email se o app Capacitor interceptar o link
        let deepLinkListener = null;
        const setupCapacitor = async () => {
            try {
                deepLinkListener = await CapacitorApp.addListener('appUrlOpen', (data) => {
                    processResetLink(data.url);
                });
            } catch (e) {
                // Falha silenciosa segura caso esteja rodando apenas no navegador web
            }
        };
        setupCapacitor();

        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (deepLinkListener) deepLinkListener.remove();
        };
    }, []);

    // 4. Função do botão de toggle
    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    // Limpa mensagens ao trocar de modo
    const clearFeedback = () => {
        setError('');
        setSuccessMsg('');
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isPasswordChangeMode) {
                // --- NOVA LÓGICA: SALVAR NOVA SENHA ---
                if (password !== confirmPassword) {
                    setError("As senhas não coincidem.");
                    setLoading(false);
                    return;
                }
                if (password.length < 8) {
                    setError("A senha deve ter pelo menos 8 caracteres.");
                    setLoading(false);
                    return;
                }

                await confirmPasswordReset(auth, oobCode, password);
                setSuccessMsg("Senha alterada com sucesso! Redirecionando...");

                // Limpa a tela após 3 segundos
                setTimeout(() => {
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setIsPasswordChangeMode(false);
                    setIsLogin(true);
                    setSuccessMsg('');
                    setPassword('');
                    setConfirmPassword('');
                }, 3000);

            } else if (isLogin) {
                // --- LOGIN ---
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                // --- CADASTRO ---
                if (password !== confirmPassword) {
                    setError("As senhas não coincidem.");
                    setLoading(false);
                    return;
                }
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            let msg = "Ocorreu um erro inesperado. Tente novamente.";
            switch (err.code) {
                case 'auth/invalid-credential':
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    msg = "E-mail ou senha incorretos.";
                    break;
                case 'auth/email-already-in-use':
                    msg = "Este e-mail já está cadastrado.";
                    break;
                case 'auth/password-does-not-meet-requirements':
                case 'auth/weak-password':
                    msg = "A senha precisa conter:\n- Letras MAIÚSCULAS\n- Letras minúsculas\n- Números\n- Símbolos (!@#$)\n- 8 caracteres ou mais";
                    break;
                case 'auth/invalid-email':
                    msg = "O formato do e-mail é inválido.";
                    break;
                case 'auth/too-many-requests':
                    msg = "Muitas tentativas falhadas. Tente novamente mais tarde.";
                    break;
                case 'auth/network-request-failed':
                    msg = "Erro de conexão com o servidor.";
                    break;
                case 'auth/expired-action-code':
                    msg = "O link expirou. Por favor, solicite um novo.";
                    break;
                case 'auth/invalid-action-code':
                    msg = "Link inválido ou já utilizado.";
                    break;
                default:
                    msg = "Erro: " + err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!email) {
            setError("Digite seu e-mail para recuperar a senha.");
            return;
        }
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMsg("E-mail de redefinição enviado! Verifique sua caixa de entrada (e spam).");
        } catch (err) {
            console.error(err);
            let msg = "Erro ao enviar e-mail.";
            if (err.code === 'auth/user-not-found') msg = "Não existe conta com este e-mail.";
            if (err.code === 'auth/invalid-email') msg = "E-mail inválido.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center lg:justify-between min-h-screen p-6 lg:p-12 relative overflow-hidden transition-all duration-500 ease-in-out bg-gradient-to-br from-slate-200 via-slate-300 to-slate-200 dark:from-black dark:via-slate-800 dark:to-black">

            {/* --- Botão de Toggle Light/Dark Mode --- */}
            <ThemeToggleButton
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                className="absolute top-4 right-4 lg:top-8 lg:right-8 z-50"
            />

            {/* --- Área do Cabeçalho / Destaque Animado --- */}
            <div className="w-full lg:w-1/2 flex flex-row lg:flex-col items-center lg:items-start justify-start z-10 mb-8 lg:mb-0 transition-all duration-500 ease-in-out">
                {/* Logo */}
                <div className="shrink-0 transition-all duration-500 ease-in-out">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 bg-black/10 dark:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30 dark:border-white/10 transition-all duration-500 ease-in-out">
                        <img src="/favicon.svg" alt="FTTH Manager" className="w-10 h-10 lg:w-12 lg:h-12 drop-shadow-md transition-all duration-500 ease-in-out text-sky-500" />
                    </div>
                </div>

                {/* Textos da Aplicação */}
                <div className="flex flex-col justify-center ml-4 lg:ml-0 lg:mt-auto lg:mb-auto transition-all duration-500 ease-in-out flex-1 lg:pr-10 xl:pl-8">
                    <h1 className="text-2xl lg:text-5xl xl:text-7xl font-extrabold tracking-wide text-gray-800 dark:text-white leading-none lg:mb-2 drop-shadow-lg transition-all duration-500 ease-in-out">FTTH MANAGER</h1>
                    <h2 className="text-[15px] lg:text-3xl xl:text-4xl font-bold text-sky-500 tracking-[0.2em] lg:tracking-[0.4em] mb-0.5 lg:mb-6 drop-shadow-md transition-all duration-500 ease-in-out">CLOUD</h2>
                    <div className="hidden lg:block w-24 h-1.5 bg-sky-500 rounded-full mb-6 opacity-80 transition-all duration-500 ease-in-out"></div>
                    <p className="text-[12px] sm:text-xs lg:text-xl xl:text-2xl font-normal text-black dark:text-white max-w-md transition-all duration-500 ease-in-out leading-tight">Gestão Avançada de Redes de Fibra Óptica</p>
                </div>
            </div>

            {/* --- Card de Autenticação (Direita) --- */}
            <div className="w-full max-w-md self-center bg-white/20 dark:bg-black/40 border border-white/60 dark:border-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden text-black dark:text-white transition-all duration-500 ease-in-out lg:mr-8 xl:mr-16 z-10">
                <div className="p-8 sm:p-10">
                    <h3 className="text-2xl font-bold mb-8 text-center text-gray-800 dark:text-white">
                        {isPasswordChangeMode ? "Criar Nova Senha" : (isResetting ? "Recuperar Senha" : (isLogin ? "Bem-vindo de volta" : "Criar nova conta"))}
                    </h3>

                    <form onSubmit={isResetting ? handleResetPassword : handleAuth} className="space-y-5">

                        {/* E-MAIL (Esconde se estiver no modo de Troca de Senha) */}
                        {!isPasswordChangeMode && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider opacity-70 ml-1 text-gray-700 dark:text-gray-300">E-MAIL</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-400" size={18} />
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

                        {/* SENHA (Não mostra na aba de enviar e-mail de recuperação) */}
                        {!isResetting && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider opacity-70 ml-1 text-gray-700 dark:text-gray-300">
                                        {isPasswordChangeMode ? "NOVA SENHA" : "SENHA"}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-400" size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={isPasswordChangeMode ? "Digite a nova senha" : "Digite a sua senha"}
                                            autoFocus={isPasswordChangeMode}
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border bg-white/50 dark:bg-black/50 outline-none transition-all duration-500 text-[16px] border-white/60 dark:border-white/10 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity text-gray-600 dark:text-gray-300"
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* CONFIRMAR SENHA (Mostra no Cadastro E na Troca de Senha Real) */}
                                {(isPasswordChangeMode || !isLogin) && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                        <label className="text-[11px] font-bold uppercase tracking-wider opacity-70 ml-1 text-gray-700 dark:text-gray-300">CONFIRMAR SENHA</label>
                                        <div className="relative">
                                            <CheckCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-400" size={18} />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Digite a sua senha novamente"
                                                className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-white/50 dark:bg-black/50 outline-none transition-all duration-500 text-[16px] ${confirmPassword && password !== confirmPassword
                                                    ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-500'
                                                    : 'border-white/60 dark:border-white/10 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500'
                                                    }`}
                                                required
                                            />
                                        </div>
                                        {confirmPassword && password !== confirmPassword && (
                                            <p className="text-[11px] text-red-500 font-medium ml-1 mt-1">As senhas não coincidem</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Link Esqueci Minha Senha */}
                        {isLogin && !isResetting && !isPasswordChangeMode && (
                            <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsResetting(true); clearFeedback(); }}
                                    className="text-xs font-medium text-sky-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                                >
                                    Esqueceu a senha?
                                </button>
                            </div>
                        )}

                        {/* MENSAGENS DE FEEDBACK */}
                        {error && (
                            <div className="p-3.5 rounded-xl border flex items-start gap-2 text-sm animate-in fade-in backdrop-blur-sm mt-4 bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 font-medium">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span className="whitespace-pre-line">{error}</span>
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-3.5 rounded-xl border flex items-start gap-2 text-sm animate-in fade-in backdrop-blur-sm mt-4 bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 items-center font-medium">
                                <CheckCircle2 size={16} className="shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        {/* BOTÃO PRINCIPAL */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-sky-500 hover:bg-blue-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : (
                                <>
                                    {isPasswordChangeMode ? "Salvar Nova Senha" : (isResetting ? "Enviar Link de Recuperação" : (isLogin ? "Entrar" : "Criar Conta"))}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Rodapé - Troca de Modo (Oculto no modo de troca de senha) */}
                    {!isPasswordChangeMode && (
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10 text-center">
                            {isResetting ? (
                                <button
                                    onClick={() => { setIsResetting(false); clearFeedback(); }}
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
                                >
                                    <ChevronLeft size={16} /> Voltar para o Login
                                </button>
                            ) : (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {isLogin ? "Ainda não tem conta?" : "Já possui cadastro?"}
                                    <button
                                        onClick={() => { setIsLogin(!isLogin); clearFeedback(); }}
                                        className="ml-1.5 text-sky-500 font-bold hover:underline transition-colors"
                                    >
                                        {isLogin ? "Criar agora" : "Fazer Login"}
                                    </button>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Copyright */}
            <div className="absolute bottom-4 text-xs font-medium text-gray-400 dark:text-gray-500 text-center w-full flex items-center justify-center gap-1">
                &copy; 2026 {VERSAO.NUMERO_VERSAO}. Todos os direitos reservados.
            </div>
        </div>
    );
};

export default AuthScreen;