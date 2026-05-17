import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { VERSAO } from '../config/constants';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Função para comparar versões
const isVersionOutdated = (localVersion, requiredVersion) => {
    if (!localVersion || !requiredVersion) return false;

    const cleanLocal = localVersion.split('-')[0].trim();
    const cleanRequired = requiredVersion.split('-')[0].trim();

    const lParts = cleanLocal.split('.').map(Number);
    const rParts = cleanRequired.split('.').map(Number);

    for (let i = 0; i < Math.max(lParts.length, rParts.length); i++) {
        const l = lParts[i] || 0;
        const r = rParts[i] || 0;
        if (l < r) return true;
        if (l > r) return false;
    }
    return false;
};

// MUDANÇA 1: Adicionamos o { children } aqui nos parâmetros
const ForceUpdateController = ({ children }) => {
    const [isOutdated, setIsOutdated] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    useEffect(() => {
        const configRef = doc(db, 'system', 'config');

        const unsubscribe = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const requiredVersion = data.min_version;
                const localVersion = VERSAO;

                if (isVersionOutdated(localVersion, requiredVersion)) {
                    setIsOutdated(true);
                }
            }
        }, (error) => {
            console.error("Erro ao checar versão:", error);
        });

        return () => unsubscribe();
    }, []);

    const handleForceUpdate = async () => {
        setIsClearing(true);
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }

            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            }

            window.location.reload(true);
        } catch (error) {
            console.error("Erro ao limpar cache:", error);
            window.location.reload(true);
        }
    };

    // MUDANÇA 2: Se NÃO estiver desatualizado, ele renderiza o aplicativo inteiro (children)
    if (!isOutdated) {
        return <>{children}</>;
    }

    // MUDANÇA 3: Se ESTIVER desatualizado, ele retorna SÓ a tela preta.
    // O aplicativo (<App />) é completamente apagado da memória.
    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <div className="bg-neutral-900 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <AlertTriangle size={32} />
                </div>

                <h2 className="text-2xl font-bold text-white mb-3">Atualização Disponível</h2>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    Uma nova versão do FTTH Manager Cloud foi lançada. Sua versão atual (<span className="text-white font-mono">{VERSAO}</span>) não é mais suportada e foi bloqueada por motivos de segurança e compatibilidade. Por favor, atualize para a versão mais recente para continuar usando o sistema.
                </p>

                <button
                    onClick={handleForceUpdate}
                    disabled={isClearing}
                    className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isClearing ? (
                        <><RefreshCw className="animate-spin" size={20} /> Atualizando sistema...</>
                    ) : (
                        <><RefreshCw size={20} /> Atualizar Agora</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ForceUpdateController;