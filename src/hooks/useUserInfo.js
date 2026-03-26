// Hook para buscar informações de usuário a partir de um UID
// Funciona com o formato "novo" (uid string) e o "antigo" (objeto { uid, email, displayName })
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Cache em memória para evitar múltiplas buscas ao mesmo UID
const userCache = new Map();
const pendingFetches = new Map();

// Função utilitária para sincronizar perfil do usuário logado no Firestore
export const syncUserProfile = async (firebaseUser) => {
    if (!firebaseUser?.uid) return;
    try {
        const profileRef = doc(db, 'artifacts/ftth-production/userProfiles', firebaseUser.uid);
        const profileData = {
            displayName: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            updatedAt: new Date().toISOString()
        };
        await setDoc(profileRef, profileData, { merge: true });
        // Atualiza cache local
        userCache.set(firebaseUser.uid, profileData);
    } catch (error) {
        console.warn('Erro ao sincronizar perfil:', error);
    }
};

const useUserInfo = (userRef) => {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Sem referência
        if (!userRef) {
            setUserInfo(null);
            setLoading(false);
            return;
        }

        // Formato legado: objeto completo { uid, email, displayName }
        if (typeof userRef === 'object' && userRef !== null) {
            // Tenta buscar dados atualizados pelo uid, mas usa o objeto como fallback
            const uid = userRef.uid;
            if (uid && userCache.has(uid)) {
                setUserInfo(userCache.get(uid));
                setLoading(false);
                return;
            }
            if (uid) {
                // Busca atualizado, mas já mostra o que tem
                setUserInfo({
                    displayName: userRef.displayName || '',
                    email: userRef.email || '',
                    photoURL: userRef.photoURL || ''
                });
                setLoading(false);

                // Tenta buscar dados mais recentes em background
                fetchFromFirestore(uid).then(data => {
                    if (data) setUserInfo(data);
                });
            } else {
                setUserInfo({
                    displayName: userRef.displayName || '',
                    email: userRef.email || '',
                    photoURL: userRef.photoURL || ''
                });
                setLoading(false);
            }
            return;
        }

        // Formato novo: uid como string
        if (typeof userRef === 'string') {
            const uid = userRef;

            // Verifica cache
            if (userCache.has(uid)) {
                setUserInfo(userCache.get(uid));
                setLoading(false);
                return;
            }

            // Busca no Firestore
            setLoading(true);
            fetchFromFirestore(uid).then(data => {
                setUserInfo(data);
                setLoading(false);
            });
        }
    }, [userRef]);

    return { userInfo, loading };
};

async function fetchFromFirestore(uid) {
    // Evita buscas duplicadas paralelas ao mesmo UID
    if (pendingFetches.has(uid)) {
        return pendingFetches.get(uid);
    }

    const promise = (async () => {
        try {
            const profileRef = doc(db, 'artifacts/ftth-production/userProfiles', uid);
            const snap = await getDoc(profileRef);
            if (snap.exists()) {
                const data = snap.data();
                userCache.set(uid, data);
                return data;
            }
            // Se não existe perfil, retorna placeholder com o uid
            const fallback = { displayName: '', email: uid, photoURL: '' };
            userCache.set(uid, fallback);
            return fallback;
        } catch (err) {
            console.warn('Erro ao buscar perfil do usuário:', err);
            return { displayName: '', email: uid, photoURL: '' };
        } finally {
            pendingFetches.delete(uid);
        }
    })();

    pendingFetches.set(uid, promise);
    return promise;
}

export default useUserInfo;
