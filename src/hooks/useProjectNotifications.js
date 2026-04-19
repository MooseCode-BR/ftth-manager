/*
 * Hook responsável por monitorar as notificações do usuário.
 */

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from '../config/firebaseConfig';

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
                permission: invite.permission || 'FULL_ACCESS',
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