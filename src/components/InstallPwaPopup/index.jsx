// src/components/InstallPwaPopup/index.jsx
import React, { useState, useEffect } from 'react';
import './styles.css'; // Importando nosso visual Glassmorphism

const InstallPwaPopup = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        // Escuta o evento que o navegador dispara quando o app está pronto para ser instalado
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault(); // Impede a notificação padrão e feia do navegador
            setDeferredPrompt(e); // Guarda o evento no estado
            setShowPopup(true); // Exibe o nosso popup maravilhoso
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Oculta o popup automaticamente assim que o app for instalado
        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setShowPopup(false);
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    // Lida com o clique no botão de Instalar
    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt(); // Dispara o popup oficial de instalação do SO

        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Escolha do usuário: ${outcome}`);

        setDeferredPrompt(null);
        setShowPopup(false); // Esconde o nosso banner independentemente da escolha
    };

    // Lida com o botão de cancelar/dispensar
    const handleDismiss = () => {
        setShowPopup(false);
    };

    if (!showPopup) return null;

    return (
        <div className="pwa-popup-container">

            {/* Cabeçalho com Logo e Textos */}
            <div className="pwa-popup-header">
                {/* Usamos a mesma logo que configuramos no PWA */}
                <img src="/pwa-192x192.png" alt="FTTH Manager Logo" className="pwa-logo" />

                <div className="pwa-title-container">
                    <h3 className="pwa-title">FTTH Manager</h3>
                    <p className="pwa-description">
                        Instale nosso aplicativo para uma experiência mais rápida e acesso offline.
                    </p>
                </div>
            </div>

            {/* Botões de Ação */}
            <div className="pwa-actions">
                <button onClick={handleDismiss} className="pwa-btn-cancel">
                    Agora não
                </button>
                <button onClick={handleInstallClick} className="pwa-btn-install">
                    Instalar App
                </button>
            </div>

        </div>
    );
};

export default InstallPwaPopup;