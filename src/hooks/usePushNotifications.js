import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
// IMPORTANTE: Adicione setDoc aqui
import { doc, setDoc, arrayUnion } from 'firebase/firestore'; 
import { db } from '../firebaseConfig';

export const usePushNotifications = (user) => {
    useEffect(() => {
        if (!user || !Capacitor.isNativePlatform()) return;

        const setupPush = async () => {
            try {
                // 1. Criar Canal (Obrigatório)
                await PushNotifications.createChannel({
                    id: 'default',
                    name: 'Geral',
                    description: 'Notificações do App',
                    importance: 5,
                    visibility: 1,
                    vibration: true,
                });

                // 2. Limpar e Registrar Listeners
                await PushNotifications.removeAllListeners();

                // SUCESSO AO OBTER TOKEN
                await PushNotifications.addListener('registration', async (token) => {
                    console.log('🔥 TOKEN NOVO:', token.value);
                    
                    if (user && user.uid) {
                        // CAMINHO CORRETO: artifacts -> ftth-production -> users -> {uid}
                        const userRef = doc(db, 'artifacts', 'ftth-production', 'users', user.uid);
                        
                        // Usamos setDoc com merge: true
                        // Isso cria o documento se ele só tiver subcoleções ou não existir
                        // E salvamos o EMAIL, senão a Function não consegue achar esse usuário depois!
                        await setDoc(userRef, {
                            fcmTokens: arrayUnion(token.value),
                            email: user.email // OBRIGATÓRIO para a busca da Function
                        }, { merge: true })
                        .then(() => console.log('✅ Token e Email salvos no caminho correto!'))
                        .catch(err => console.error('❌ Erro ao salvar no Firestore:', err));
                    }
                });

                await PushNotifications.addListener('registrationError', (err) => {
                    console.error('❌ Erro no registro:', err);
                });

                // 3. Pedir Permissão e Registrar
                let perm = await PushNotifications.checkPermissions();
                if (perm.receive === 'prompt') {
                    perm = await PushNotifications.requestPermissions();
                }

                if (perm.receive === 'granted') {
                    await PushNotifications.register();
                }

            } catch (error) {
                console.error('Erro fatal no setup do Push:', error);
            }
        };

        setupPush();

        return () => {
            PushNotifications.removeAllListeners();
        };

    }, [user]);
};