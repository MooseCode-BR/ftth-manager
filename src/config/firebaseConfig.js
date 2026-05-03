// /*
//  * Arquivo responsável por configurar a conexão com o Firebase.
//  */

// import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage";
// // 1. Importa o App Check e o Provedor do reCAPTCHA
// import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// const firebaseConfig = {
//     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//     messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//     appId: import.meta.env.VITE_FIREBASE_APP_ID
// };

// // Inicializa o app base
// const app = initializeApp(firebaseConfig);

// // --- INICIALIZAÇÃO DA BLINDAGEM (APP CHECK) ---
// let appCheck;
// if (typeof window !== 'undefined') {

//     // ATENÇÃO: Descomente a linha abaixo APENAS para conseguir logar pelo localhost durante o desenvolvimento.
//     // Após pegar o token no console (F12) e cadastrar no Firebase, comente-a novamente antes de subir para produção!
//     //self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

//     appCheck = initializeAppCheck(app, {
//         // Puxa a chave do reCAPTCHA do seu arquivo .env
//         provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
//         isTokenAutoRefreshEnabled: true
//     });
// }
// // ----------------------------------------------

// export const auth = getAuth(app);
// export const db = getFirestore(app);
// export const storage = getStorage(app);



/*
 * Arquivo responsável por configurar a conexão com o Firebase.
 * Documentação: Configuração Híbrida (Web reCAPTCHA + Android Play Integrity)
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider } from "firebase/app-check";
import { Capacitor } from '@capacitor/core';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 1. Inicializa o app base
const app = initializeApp(firebaseConfig);

// --- 2. INICIALIZAÇÃO DA BLINDAGEM (APP CHECK HÍBRIDO) ---
let appCheck;

if (typeof window !== 'undefined') {
    // Verifica se está rodando nativamente no celular (APK/Capacitor)
    if (Capacitor.isNativePlatform()) {

        const appCheckProvider = new CustomProvider({
            getToken: async () => {
                try {
                    // Pede o token diretamente, pois o Android já estará configurado
                    const { token } = await FirebaseAppCheck.getToken();
                    return {
                        token,
                        expireTimeMillis: Date.now() + 60 * 60 * 1000 // 1 hora de validade
                    };
                } catch (error) {
                    console.error("Falha ao obter token nativo do App Check:", error);
                    return { token: '', expireTimeMillis: 0 };
                }
            }
        });

        appCheck = initializeAppCheck(app, {
            provider: appCheckProvider,
            isTokenAutoRefreshEnabled: true
        });

    } else {
        // Estratégia Web: reCAPTCHA Enterprise
        appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
            isTokenAutoRefreshEnabled: true
        });
    }
}
// ---------------------------------------------------------

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);