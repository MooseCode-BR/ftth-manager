
// import { useState, useEffect, useRef } from 'react';
// import { collection, query, where, onSnapshot } from "firebase/firestore";
// import { db } from '../firebaseConfig';
// import { LocalNotifications } from '@capacitor/local-notifications';
// import { Capacitor } from '@capacitor/core';

// export const useProjectNotifications = (user) => {
//     const [incomingTransfers, setIncomingTransfers] = useState([]); // Transferências chegando
//     const [sharedProjects, setSharedProjects] = useState([]);       // Projetos aceitos
//     const [pendingInvites, setPendingInvites] = useState([]);       // Convites pendentes
//     const [outgoingInvites, setOutgoingInvites] = useState([]);     // Convites enviados

//     // Refs para rastrear estado anterior (usado apenas como cache temporário)
//     // A verdadeira persistência agora é localStorage
//     const prevPendingRef = useRef([]);
//     const prevTransfersRef = useRef([]);
//     const isFirstRun = useRef(true);

//     // SOLICITAR PERMISSÃO E CRIAR CANAL AO MONTAR
//     useEffect(() => {
//         const setupNotifications = async () => {
//             if (Capacitor.isNativePlatform()) {
//                 console.log('Inicializando Notificações...');

//                 try {
//                     // 1. Criar Canal (Obrigatório para Android 8+)
//                     await LocalNotifications.createChannel({
//                         id: 'default',
//                         name: 'Default',
//                         description: 'Notificações de projetos e convites',
//                         importance: 5, // 5 = High (Vibra e faz som)
//                         visibility: 1, // 1 = Public
//                         vibration: true,
//                     });
//                     console.log('Canal de notificação criado com sucesso.');

//                     // 2. Checar e Solicitar Permissões
//                     let permStatus = await LocalNotifications.checkPermissions();
//                     console.log('Status Permissão (Check):', permStatus.display);

//                     if (permStatus.display !== 'granted') {
//                         permStatus = await LocalNotifications.requestPermissions();
//                         console.log('Status Permissão (Request):', permStatus.display);
//                     }
//                 } catch (error) {
//                     console.error('Erro na configuração de notificações:', error);
//                 }
//             }
//         };

//         setupNotifications();
//     }, []);

//     useEffect(() => {
//         if (!user) {
//             // Resetar estados e referências ao deslogar
//             prevPendingRef.current = [];
//             prevTransfersRef.current = [];

//             setIncomingTransfers([]);
//             setSharedProjects([]);
//             setPendingInvites([]);
//             setOutgoingInvites([]);
//             return;
//         }

//         // Função auxiliar definida DENTRO do efeito para evitar dependências externas
//         const formatAndNotify = async (title, body) => {
//             console.log('Tentando agendar notificação:', title);
//             if (Capacitor.isNativePlatform()) {
//                 try {
//                     const safeId = Math.floor(Math.random() * 1000000000);
//                     await LocalNotifications.schedule({
//                         notifications: [{
//                             title,
//                             body,
//                             id: safeId,
//                             schedule: { at: new Date(Date.now() + 100) },
//                             sound: null,
//                             attachments: null,
//                             actionTypeId: "",
//                             extra: null,
//                             channelId: 'default'
//                         }]
//                     });
//                     console.log(`Notificação agendada! ID: ${safeId} | Title: ${title}`);
//                 } catch (error) {
//                     console.error('Erro ao agendar notificação:', error);
//                 }
//             } else {
//                 console.log('Plataforma não nativa, notificação apenas logada.');
//             }
//         };

//         // --- LÓGICA DE PERSISTÊNCIA (localStorage) ---
//         // Recuperar IDs já conhecidos para não notificar repetido
//         // Mas notificar se for NOVO mesmo que seja a primeira execução do app (re-abertura)
//         const loadKnownIds = (key) => {
//             try {
//                 const stored = localStorage.getItem(key);
//                 return stored ? JSON.parse(stored) : [];
//             } catch (e) { return []; }
//         };

//         const saveKnownIds = (key, ids) => {
//             localStorage.setItem(key, JSON.stringify(ids));
//         };

//         // 1. Monitorar CONVITES RECEBIDOS
//         const invitesRef = collection(db, 'ftth_invitations');
//         const qInvites = query(invitesRef, where('toEmail', '==', user.email));

//         const unsubInvites = onSnapshot(qInvites, (snap) => {
//             const allInvites = snap.docs.map(d => ({ id: d.id, ...d.data() }));
//             const pending = allInvites.filter(i => i.status === 'pending');
//             const accepted = allInvites.filter(i => i.status === 'accepted');

//             // Lógica de Notificação Persistente
//             const knownInviteIds = loadKnownIds(`ftth_known_invites_${user.uid}`);
//             const currentIds = pending.map(p => p.id);

//             // Novos são aqueles que estão no Pending mas NÃO estao nos Conhecidos
//             const newItems = pending.filter(p => !knownInviteIds.includes(p.id));

//             if (newItems.length > 0) {
//                 console.log('[Invites] Novos itens REAIS detectados:', newItems.map(i => i.id));
//                 newItems.forEach(item => {
//                     formatAndNotify(
//                         'Novo Convite de Projeto',
//                         `Você foi convidado para o projeto "${item.projectName}"`
//                     );
//                 });
//             }

//             // Atualiza a lista de conhecidos (Salva TODOS os pendentes atuais)
//             // Assim, na próxima execução, esses não notificam mais.
//             if (newItems.length > 0 || currentIds.length !== knownInviteIds.length) {
//                 saveKnownIds(`ftth_known_invites_${user.uid}`, currentIds);
//             }

//             setPendingInvites(pending);

//             const sharedList = accepted.map(invite => ({
//                 id: invite.projectId,
//                 name: invite.projectName,
//                 ownerId: invite.fromUid,
//                 fromEmail: invite.fromEmail,
//                 role: 'GUEST',
//                 inviteId: invite.id
//             }));
//             setSharedProjects(sharedList);
//         });

//         // 2. Monitorar TRANSFERÊNCIAS RECEBIDAS
//         const transfersQ = query(collection(db, 'ftth_transfers'), where('toEmail', '==', user.email));
//         const unsubTransfers = onSnapshot(transfersQ, (snap) => {
//             const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

//             // Lógica de Notificação Persistente
//             const knownTransferIds = loadKnownIds(`ftth_known_transfers_${user.uid}`);
//             const currentIds = list.map(l => l.id);

//             const newItems = list.filter(l => !knownTransferIds.includes(l.id));

//             if (newItems.length > 0) {
//                 console.log('[Transfers] Novos itens REAIS detectados:', newItems.map(i => i.id));
//                 newItems.forEach(item => {
//                     formatAndNotify(
//                         'Projeto Recebido!',
//                         `Alguém transferiu um projeto para você.`
//                     );
//                 });
//             }

//             if (newItems.length > 0 || currentIds.length !== knownTransferIds.length) {
//                 saveKnownIds(`ftth_known_transfers_${user.uid}`, currentIds);
//             }

//             setIncomingTransfers(list);
//         });

//         // 3. Monitorar CONVITES ENVIADOS
//         const outgoingQ = query(collection(db, 'ftth_invitations'), where('fromUid', '==', user.uid));
//         const unsubOutgoing = onSnapshot(outgoingQ, (snap) => {
//             const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
//             setOutgoingInvites(list);
//         });

//         return () => {
//             unsubInvites();
//             unsubTransfers();
//             unsubOutgoing();
//         };
//     }, [user]);

//     return {
//         incomingTransfers,
//         sharedProjects,
//         pendingInvites,
//         outgoingInvites
//     };
// };


import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from '../firebaseConfig';

// Removemos LocalNotifications e Capacitor Core pois não serão usados aqui
// Removemos Refs de persistência de notificação

export const useProjectNotifications = (user) => {
    const [incomingTransfers, setIncomingTransfers] = useState([]); 
    const [sharedProjects, setSharedProjects] = useState([]);       
    const [pendingInvites, setPendingInvites] = useState([]);       
    const [outgoingInvites, setOutgoingInvites] = useState([]);     

    useEffect(() => {
        if (!user) {
            setIncomingTransfers([]);
            setSharedProjects([]);
            setPendingInvites([]);
            setOutgoingInvites([]);
            return;
        }

        // 1. Monitorar CONVITES RECEBIDOS (Apenas Dados)
        const invitesRef = collection(db, 'ftth_invitations');
        const qInvites = query(invitesRef, where('toEmail', '==', user.email));

        const unsubInvites = onSnapshot(qInvites, (snap) => {
            const allInvites = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            const pending = allInvites.filter(i => i.status === 'pending');
            const accepted = allInvites.filter(i => i.status === 'accepted');

            // Atualiza estado da tela
            setPendingInvites(pending);

            const sharedList = accepted.map(invite => ({
                id: invite.projectId,
                name: invite.projectName,
                ownerId: invite.fromUid,
                fromEmail: invite.fromEmail,
                role: 'GUEST',
                inviteId: invite.id
            }));
            setSharedProjects(sharedList);
        });

        // 2. Monitorar TRANSFERÊNCIAS RECEBIDAS (Apenas Dados)
        const transfersQ = query(collection(db, 'ftth_transfers'), where('toEmail', '==', user.email));
        const unsubTransfers = onSnapshot(transfersQ, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setIncomingTransfers(list);
        });

        // 3. Monitorar CONVITES ENVIADOS (Apenas Dados)
        const outgoingQ = query(collection(db, 'ftth_invitations'), where('fromUid', '==', user.uid));
        const unsubOutgoing = onSnapshot(outgoingQ, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setOutgoingInvites(list);
        });

        return () => {
            unsubInvites();
            unsubTransfers();
            unsubOutgoing();
        };
    }, [user]);

    return {
        incomingTransfers,
        sharedProjects,
        pendingInvites,
        outgoingInvites
    };
};