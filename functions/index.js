const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const logger = require("firebase-functions/logger");

setGlobalOptions({ region: 'southamerica-east1', maxInstances: 10 });

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// Função auxiliar para buscar usuário no caminho correto
async function getUserTokensByEmail(email) {
    // CAMINHO CORRETO: artifacts/ftth-production/users
    const usersRef = db.collection('artifacts').doc('ftth-production').collection('users');
    
    // Busca pelo campo 'email' que adicionamos no Frontend
    const q = usersRef.where('email', '==', email).limit(1);
    const userSnap = await q.get();

    if (userSnap.empty) {
        logger.log(`Usuário não encontrado no DB para o email: ${email}`);
        return null;
    }

    const userData = userSnap.docs[0].data();
    return userData.fcmTokens || [];
}

/**
 * Trigger: Novo CONVITE
 */
exports.sendInviteNotification = onDocumentCreated("ftth_invitations/{inviteId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const invite = snapshot.data();
    const toEmail = invite.toEmail;
    const projectName = invite.projectName;
    const fromEmail = invite.fromEmail;

    if (!toEmail) return;

    try {
        const tokens = await getUserTokensByEmail(toEmail);

        if (!tokens || tokens.length === 0) {
            logger.log("Nenhum token encontrado para enviar push.");
            return;
        }

        const message = {
            notification: {
                title: 'Novo Convite',
                body: `"${fromEmail}" te convidou para "${projectName}"`
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                    icon: 'ic_launcher',
                    priority: 'high',
                    defaultSound: true
                }
            },
            tokens: tokens
        };

        const response = await messaging.sendEachForMulticast(message);
        logger.log(`Invite Push: ${response.successCount} envios.`);
    } catch (error) {
        logger.error("Erro Invite:", error);
    }
});

/**
 * Trigger: Nova TRANSFERÊNCIA
 * Atenção: O gatilho deve apontar para onde as transferências são salvas.
 * Se elas também ficam dentro de artifacts, ajuste o caminho abaixo. 
 * Vou assumir que 'ftth_transfers' é uma coleção na raiz (como estava antes).
 */
exports.sendTransferNotification = onDocumentCreated("ftth_transfers/{transferId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const transfer = snapshot.data();
    const toEmail = transfer.toEmail;
    const fromEmail = transfer.fromEmail;
    const projectName = transfer.projectName || "um projeto";

    if (!toEmail) return;

    try {
        const tokens = await getUserTokensByEmail(toEmail);

        if (!tokens || tokens.length === 0) return;

        const message = {
            notification: {
                title: 'Projeto Recebido!',
                body: `"${fromEmail}" transferiu "${projectName}" para você.`
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                    icon: 'ic_launcher',
                    priority: 'high',
                    defaultSound: true
                }
            },
            tokens: tokens
        };

        const response = await messaging.sendEachForMulticast(message);
        logger.log(`Transfer Push: ${response.successCount} envios.`);

    } catch (error) {
        logger.error("Erro Transfer:", error);
    }
});