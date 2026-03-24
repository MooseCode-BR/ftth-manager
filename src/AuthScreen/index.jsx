import './styles.css';
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from '../firebaseConfig';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, ChevronLeft, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { VERSAO } from '../constants';
import { CEOIcon } from '../icons';
import ThemeToggleButton from '../components/ThemeToggleButton';
import LoadingFiber from '../assets/loadingfiber';

const AuthScreen = ({ onLogin }) => {
    // Estados de Controle de Tela
    const [isLogin, setIsLogin] = useState(true);
    const [isResetting, setIsResetting] = useState(false);

    // Estados dos Campos
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // NOVO: Estado para mostrar/ocultar senha
    const [showPassword, setShowPassword] = useState(false);

    // Estados de Feedback
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Estado inicial inteligente
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Verificação de segurança para garantir que estamos no navegador (evita erros em SSR como Next.js)
        if (typeof window !== 'undefined') {
            const temaSalvo = localStorage.getItem('ftth_theme_preference');

            // Se o utilizador já escolheu antes, usamos a escolha dele
            if (temaSalvo) {
                return temaSalvo === 'dark';
            }

            // Se é a primeira vez, verificamos a preferência do Windows/Mac/Android do utilizador
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // 2. Sincronização com o HTML e LocalStorage
    useEffect(() => {
        const root = document.documentElement;

        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('ftth_theme_preference', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('ftth_theme_preference', 'light');
        }
    }, [isDarkMode]); // O array [isDarkMode] diz ao React: "Roda isto sempre que isDarkMode mudar"

    // 3. Função do botão de toggle super simples
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
            if (isLogin) {
                // LOGIN
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                // CADASTRO
                if (password !== confirmPassword) {
                    setError("As senhas não coincidem.");
                    setLoading(false);
                    return;
                }

                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            let msg = "Ocorreu um erro inesperado. Tente novamente.";

            // SWITCH CASE DETALHADO
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
        <div className="auth-wrapper">

            {/* --- Botão de Toggle Light/Dark Mode (Lanterna VFL) --- */}
            <ThemeToggleButton
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                className="absolute top-4 right-4 lg:top-8 lg:right-8 z-50"
            />

            {/* --- Área do Cabeçalho / Destaque Animado --- */}
            <div className="hero-container">

                {/* Logo */}
                <div className="logo-wrapper">
                    <div className="logo-container-fixed">
                        <img src="/favicon.svg" alt="FTTH Manager" className="logo-img" />
                    </div>
                </div>

                {/* Textos da Aplicação */}
                <div className="hero-text-wrapper">
                    <h1 className="hero-title">FTTH MANAGER</h1>
                    <h2 className="hero-subtitle">CLOUD</h2>
                    <div className="hero-divider"></div>
                    <p className="hero-description">Gestão Avançada de Redes de Fibra Óptica</p>
                </div>
            </div>

            {/* --- Card de Autenticação (Direita) --- */}
            <div className="auth-card">
                <div className="auth-body">
                    <h3 className="form-title">
                        {isResetting ? "Recuperar Senha" : (isLogin ? "Bem-vindo de volta" : "Criar nova conta")}
                    </h3>

                    <form onSubmit={isResetting ? handleResetPassword : handleAuth} className="auth-form">

                        {/* E-MAIL */}
                        <div className="input-group">
                            <label className="input-label">E-MAIL</label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    autoFocus
                                    className="text-input pl-10"
                                    required
                                />
                            </div>
                        </div>

                        {!isResetting && (
                            <>
                                {/* SENHA */}
                                <div className="input-group">
                                    <label className="input-label">SENHA</label>
                                    <div className="input-wrapper">
                                        <Lock className="input-icon" size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="text-input pl-10 pr-10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="btn-toggle-password"
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* CONFIRMAR SENHA */}
                                {!isLogin && (
                                    <div className="input-group animate-in slide-in-from-top-2">
                                        <label className="input-label">CONFIRMAR SENHA</label>
                                        <div className="input-wrapper">
                                            <CheckCircle2 className="input-icon" size={18} />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Repita a senha"
                                                className={`text-input pl-10 pr-10 ${confirmPassword && password !== confirmPassword ? 'input-error' : 'input-default'}`}
                                                required
                                            />
                                        </div>
                                        {confirmPassword && password !== confirmPassword && (
                                            <p className="error-msg-tiny">As senhas não coincidem</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Link Esqueci Minha Senha */}
                        {isLogin && !isResetting && (
                            <div className="forgot-password-row">
                                <button
                                    type="button"
                                    onClick={() => { setIsResetting(true); clearFeedback(); }}
                                    className="btn-forgot"
                                >
                                    Esqueceu a senha?
                                </button>
                            </div>
                        )}

                        {/* MENSAGENS DE FEEDBACK */}
                        {error && (
                            <div className="feedback-box error-box">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span className="whitespace-pre-line">{error}</span>
                            </div>
                        )}
                        {successMsg && (
                            <div className="feedback-box success-box">
                                <CheckCircle2 size={16} className="shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        {/* BOTÃO PRINCIPAL */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-submit"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : (
                                <>
                                    {isResetting ? "Enviar Link de Recuperação" : (isLogin ? "Entrar" : "Criar Conta")}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Rodapé - Troca de Modo */}
                    <div className="auth-footer-actions">
                        {isResetting ? (
                            <button
                                onClick={() => { setIsResetting(false); clearFeedback(); }}
                                className="btn-back-login"
                            >
                                <ChevronLeft size={16} /> Voltar para o Login
                            </button>
                        ) : (
                            <p className="toggle-mode-text">
                                {isLogin ? "Ainda não tem conta?" : "Já possui cadastro?"}
                                <button
                                    onClick={() => { setIsLogin(!isLogin); clearFeedback(); }}
                                    className="btn-toggle-mode"
                                >
                                    {isLogin ? "Criar agora" : "Fazer Login"}
                                </button>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Copyright */}
            <div className="copyright-text">
                &copy; 2026 {VERSAO.NUMERO_VERSAO}. Todos os direitos reservados.
            </div>
        </div>
    );
};

export default AuthScreen;