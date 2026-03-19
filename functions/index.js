const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
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

// ============================================================================
// VISUALIZADOR RESTRITO DE CTOs — Cloud Functions de Controle de Acesso
// ============================================================================

// Campos permitidos para READ_ONLY_GEOMETRY
const GEOMETRY_ONLY_FIELDS = ['id', 'color', 'lat', 'lng', 'name', 'lastEditor', 'tagIds', 'type', 'fromNode', 'toNode', 'waypoints', 'parentId', 'fiberCount'];

/**
 * Função auxiliar: Verifica o nível de permissão de um usuário em um projeto
 * Retorna: { hasAccess: boolean, permission: string|null, invite: object|null }
 */
async function checkUserPermission(userEmail, projectId) {
    const invitesRef = db.collection('ftth_invitations');
    const q = invitesRef
        .where('toEmail', '==', userEmail)
        .where('projectId', '==', projectId)
        .where('status', '==', 'accepted')
        .limit(1);
    
    const snap = await q.get();
    
    if (snap.empty) {
        return { hasAccess: false, permission: null, invite: null };
    }

    const inviteData = snap.docs[0].data();
    return {
        hasAccess: true,
        permission: inviteData.permission || 'FULL_ACCESS',
        invite: inviteData
    };
}

/**
 * Callable Function: Buscar itens de um projeto compartilhado com filtragem
 * 
 * Para READ_ONLY_GEOMETRY: retorna apenas campos de geometria
 * Para FULL_ACCESS: retorna dados completos
 * 
 * Parâmetros: { projectId: string, ownerId: string }
 */
exports.getRestrictedProjectItems = onCall(async (request) => {
    // 1. Verificar autenticação
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { projectId, ownerId } = request.data;
    if (!projectId || !ownerId) {
        throw new HttpsError('invalid-argument', 'projectId e ownerId são obrigatórios.');
    }

    const userEmail = request.auth.token.email;
    const userId = request.auth.uid;

    // 2. Se o usuário é o dono, retorna tudo
    if (userId === ownerId) {
        const itemsSnap = await db.collection(`artifacts/ftth-production/users/${ownerId}/projects/${projectId}/items`).get();
        return {
            permission: 'OWNER',
            items: itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        };
    }

    // 3. Verificar permissão do convite
    const access = await checkUserPermission(userEmail, projectId);
    
    if (!access.hasAccess) {
        throw new HttpsError('permission-denied', 'Você não tem acesso a este projeto.');
    }

    // 4. Buscar itens
    const itemsSnap = await db.collection(`artifacts/ftth-production/users/${ownerId}/projects/${projectId}/items`).get();
    let items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 5. DATA SCRUBBING para READ_ONLY_GEOMETRY: Apenas CTOs com campos de geometria
    if (access.permission === 'READ_ONLY_GEOMETRY') {
        items = items
            .filter(item => item.type === 'CTO') // SOMENTE CTOs
            .map(item => {
                const filtered = {};
                GEOMETRY_ONLY_FIELDS.forEach(field => {
                    if (item[field] !== undefined) {
                        filtered[field] = item[field];
                    }
                });
                return filtered;
        });
    }

    return {
        permission: access.permission,
        items
    };
});

/**
 * Callable Function: Validar permissão de escrita
 * 
 * Chamada pelo frontend antes de operações de escrita em projetos compartilhados.
 * Retorna 403 (permission-denied) para READ_ONLY_GEOMETRY.
 * 
 * Parâmetros: { projectId: string, operation: string }
 */
exports.validateWritePermission = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { projectId, operation } = request.data;
    if (!projectId) {
        throw new HttpsError('invalid-argument', 'projectId é obrigatório.');
    }

    const userEmail = request.auth.token.email;
    const access = await checkUserPermission(userEmail, projectId);

    if (!access.hasAccess) {
        throw new HttpsError('permission-denied', 'Você não tem acesso a este projeto.');
    }

    if (access.permission === 'READ_ONLY_GEOMETRY') {
        logger.warn(`Tentativa de escrita bloqueada: ${userEmail} tentou ${operation || 'operação'} no projeto ${projectId}`);
        throw new HttpsError(
            'permission-denied',
            'Acesso restrito. Você tem permissão somente de visualização neste projeto.'
        );
    }

    return { allowed: true, permission: access.permission };
});