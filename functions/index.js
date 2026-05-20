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
const GEOMETRY_ONLY_FIELDS = ['id', 'color', 'lat', 'lng', 'x', 'y', 'w', 'h', 'width', 'height', 'name', 'lastEditor', 'type', 'fromNode', 'toNode', 'waypoints', 'parentId', 'fiberCount'];

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
            .filter(item => ['CTO'].includes(item.type))
            .map(item => {
                const filtered = {};
                GEOMETRY_ONLY_FIELDS.forEach(field => {
                    if (item[field] !== undefined) {
                        filtered[field] = item[field];
                    }
                });

                // ATUALIZAÇÃO 2: Prevenção contra o erro de NaN!
                // Se o nó acabou de ser importado pelo KML e ainda não tem X/Y, forçamos um número (0)
                filtered.x = filtered.x || 0;
                filtered.y = filtered.y || 0;

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










// // ... (Seu código existente acima) ...

// // Constantes para a nova automação
// const USER_ID_FOR_AUTOMATION = '8Pl6hsT9OVc69IWmsFrhSiBKR9X2'; // O ID do usuário dono da coleção
// const PROJECT_ID_FOR_AUTOMATION = 'I599DdeVJ1uxTw4oobBe'; // O ID do projeto dentro do usuário
// const TARGET_TAG_FOR_AUTOMATION = 'tag_1779103952429_11b97';
// const NEW_FIELD_NAME_FOR_AUTOMATION = 'iconType';
// const NEW_FIELD_VALUE_FOR_AUTOMATION = 'Diamond';

// /**
//  * Callable Function: Automação para atualizar itens com uma tag específica
//  * Adiciona o campo "iconType: Diamond" aos itens que possuem a TARGET_TAG_FOR_AUTOMATION.
//  *
//  * Esta função deve ser acionada manualmente via HTTP.
//  *
//  * Exemplo de URL para acionar (substitua REGION e PROJECT_ID):
//  * https://REGION-PROJECT_ID.cloudfunctions.net/updateItemsWithTag
//  */
// exports.updateItemsWithTag = functions.https.onRequest(async (req, res) => {
//     // --- MECANISMO DE SEGURANÇA ---
//     // É ALTAMENTE RECOMENDADO ADICIONAR UM MECANISMO DE SEGURANÇA AQUI
//     // para evitar que qualquer pessoa acione esta função em produção.
//     // Por exemplo, você pode exigir um "token secreto" na query string.
//     //
//     // if (req.query.secretToken !== functions.config().autotasks.secret_token) {
//     //     logger.warn('Tentativa de acesso não autorizado à função updateItemsWithTag');
//     //     return res.status(403).send('Acesso negado. Token de segurança inválido ou ausente.');
//     // }
//     // --- FIM DO MECANISMO DE SEGURANÇA ---

//     try {
//         logger.log(`Iniciando atualização para itens com a tag: ${TARGET_TAG_FOR_AUTOMATION}`);

//         const collectionPath = `artifacts/ftth-production/users/${USER_ID_FOR_AUTOMATION}/projects/${PROJECT_ID_FOR_AUTOMATION}/items`;
//         const itemsRef = db.collection(collectionPath);

//         // 1. Consulta os documentos que correspondem à tag
//         const snapshot = await itemsRef.where('tags', 'array-contains', TARGET_TAG_FOR_AUTOMATION).get();
//         // Nota: Mudei para 'array-contains' se 'tags' for um array de strings.
//         // Se 'tags' for uma única string, use '==' como no exemplo anterior.
//         // Verifique a estrutura exata do seu campo 'tags'.

//         if (snapshot.empty) {
//             logger.log('Nenhum documento encontrado com a tag especificada.');
//             return res.status(200).send('Nenhum documento encontrado para atualização.');
//         }

//         const batch = db.batch();
//         let updatedCount = 0;

//         // 2. Itera sobre os documentos e adiciona a atualização ao batch
//         snapshot.forEach(doc => {
//             batch.update(doc.ref, { [NEW_FIELD_NAME_FOR_AUTOMATION]: NEW_FIELD_VALUE_FOR_AUTOMATION });
//             updatedCount++;
//         });

//         // 3. Confirma as escritas em lote
//         await batch.commit();

//         logger.log(`Sucesso! ${updatedCount} documentos foram atualizados na coleção: ${collectionPath}`);
//         res.status(200).send(`Automação concluída: ${updatedCount} documentos foram atualizados.`);

//     } catch (error) {
//         logger.error('Erro ao executar a automação updateItemsWithTag:', error);
//         res.status(500).send(`Erro interno do servidor: ${error.message}`);
//     }
// });
