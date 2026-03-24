import { writeBatch, doc, collection, getDocs, query } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from './firebaseConfig';
import JSZip from 'jszip';

// --- 1. GERAR BACKUP (COM IMAGENS EM ZIP) ---
export const generateBackupFile = async (data, visibleProjects) => {
    const {
        items, connections, availableTags, signalNames, portLabels, nodeColorSettings
    } = data;

    if (!visibleProjects || visibleProjects.length === 0) {
        return;
    }

    // Função para baixar a imagem via URL e retornar um Blob
    const fetchImageBlob = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Falha na rede");
            return await response.blob();
        } catch (error) {
            console.warn("Não foi possível baixar imagem para backup:", url);
            return null;
        }
    };

    // Itera sobre cada projeto visível
    for (const project of visibleProjects) {
        const zip = new JSZip();
        const imgFolder = zip.folder("images");

        // 1. Filtra dados do projeto
        const projectItems = items.filter(i => i._projectId === project.id);
        const projectConnections = connections.filter(c => c._projectId === project.id);

        // 2. Processar Imagens
        // Vamos varrer todos os itens, achar as fotos, baixar e colocar no ZIP
        const itemsWithLocalRefs = JSON.parse(JSON.stringify(projectItems)); // Clone para não alterar o original

        const imagePromises = [];

        itemsWithLocalRefs.forEach(item => {
            if (item.photos && item.photos.length > 0) {
                item.photos.forEach((photo, index) => {
                    // Promessa para baixar cada foto
                    const promise = (async () => {
                        const blob = await fetchImageBlob(photo.url);
                        if (blob) {
                            // Cria um nome único para a imagem dentro do ZIP
                            // Ex: nodeID_timestamp.jpg
                            const extension = photo.name ? photo.name.split('.').pop() : 'jpg';
                            const zipFileName = `${item.id}_${photo.id}.${extension}`;

                            // Salva no ZIP
                            imgFolder.file(zipFileName, blob);

                            // ATENÇÃO: No JSON que vai pro backup, substituímos a URL da nuvem
                            // pelo nome do arquivo local no ZIP. Isso ajuda no Restore.
                            // Guardamos a URL original em 'originalUrl' caso precise de fallback
                            photo.backupFileName = zipFileName;
                            photo.originalUrl = photo.url;
                        }
                    })();
                    imagePromises.push(promise);
                });
            }
        });

        // Espera todas as imagens baixarem
        await Promise.all(imagePromises);

        // 3. Monta o JSON de dados (agora com referências locais nas fotos)
        const backupObject = {
            meta: {
                appName: "FTTH Manager",
                version: "0.4.0 (ZipImages)",
                createdAt: new Date().toISOString(),
                projectName: project.name,
                projectId: project.id,
                totalItems: projectItems.length,
                totalConnections: projectConnections.length
            },
            data: {
                items: itemsWithLocalRefs, // Usamos a lista modificada
                connections: projectConnections,
                settings: {
                    tags: availableTags,
                    signals: signalNames,
                    portLabels: portLabels,
                    nodeColors: nodeColorSettings
                }
            }
        };

        // Adiciona o JSON ao ZIP
        zip.file("data.json", JSON.stringify(backupObject, null, 2));

        // 4. Gera o arquivo ZIP e baixa
        const zipContent = await zip.generateAsync({ type: "blob" });
        const safeName = project.name.replace(/[^a-z0-9à-ú ]/gi, '_');

        const url = URL.createObjectURL(zipContent);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeName}.zip`; // Agora é .zip (ou pode manter .ftth se quiseres ser chique)
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
};


// --- 2. RESTAURAR BACKUP (Lê ZIP e Re-upa Imagens) ---
// export const restoreFromBackup = async (file, projectOwnerId, targetProjectId, onProgress) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             const zip = new JSZip();
//             const loadedZip = await zip.loadAsync(file);

//             // 1. Ler o JSON de dados
//             if (!loadedZip.file("data.json")) {
//                 throw new Error("Arquivo de backup inválido: 'data.json' não encontrado.");
//             }

//             const content = await loadedZip.file("data.json").async("string");
//             const parsed = JSON.parse(content);
//             const { items, connections, settings } = parsed.data;

//             if (onProgress) onProgress("Estrutura lida. Limpando projeto...", 10);

//             // 2. Limpeza (Wipe)
//             await wipeProjectDatabase(projectOwnerId, targetProjectId);

//             const projectPath = `artifacts/ftth-production/users/${projectOwnerId}/projects/${targetProjectId}`;

//             // 3. Restaurar ITENS e Re-upar IMAGENS
//             // Aqui está o pulo do gato: Se o item tem fotos com 'backupFileName',
//             // precisamos achar esse arquivo no ZIP, subir pro Firebase e atualizar a URL.

//             const totalItems = items.length;
//             const batchSize = 100; // Lote menor pois upload de imagem demora

//             for (let i = 0; i < totalItems; i++) {
//                 const item = items[i];

//                 // Processar Fotos do Item
//                 if (item.photos && item.photos.length > 0) {
//                     const newPhotos = [];

//                     for (const photo of item.photos) {
//                         // Se tem nome de arquivo no ZIP, tenta restaurar
//                         if (photo.backupFileName && loadedZip.file(`images/${photo.backupFileName}`)) {
//                             try {
//                                 // Pega o binário do ZIP
//                                 const photoBlob = await loadedZip.file(`images/${photo.backupFileName}`).async("blob");

//                                 // Cria referência no Storage (Pasta do Dono -> Images -> ItemID)
//                                 const storagePath = `users/${projectOwnerId}/images/${item.id}/${Date.now()}_${photo.backupFileName}`;
//                                 const storageRef = ref(storage, storagePath);

//                                 // Upload
//                                 const snapshot = await uploadBytes(storageRef, photoBlob);
//                                 const newUrl = await getDownloadURL(snapshot.ref);

//                                 // Atualiza o objeto da foto com a NOVA URL
//                                 newPhotos.push({
//                                     ...photo,
//                                     url: newUrl,
//                                     path: storagePath, // Importante para poder deletar depois
//                                     backupFileName: undefined // Limpa esse campo temporário
//                                 });

//                             } catch (err) {
//                                 console.error("Falha ao restaurar imagem:", photo.backupFileName, err);
//                                 // Se falhar, tenta manter a URL original se existir, ou ignora
//                                 if (photo.originalUrl) {
//                                     newPhotos.push({ ...photo, url: photo.originalUrl });
//                                 }
//                             }
//                         } else {
//                             // Backup antigo ou imagem perdida, mantém como está
//                             newPhotos.push(photo);
//                         }
//                     }
//                     item.photos = newPhotos;
//                 }

//                 // Salva o Item no Firestore
//                 const { _projectId, _ownerId, ...cleanItem } = item;
//                 // cleanItem._projectId = targetProjectId; // Opcional
//                 await dbActionSave(doc(db, `${projectPath}/items`, item.id), cleanItem);

//                 // Progresso detalhado
//                 if (onProgress && i % 5 === 0) {
//                     const percent = 20 + (i / totalItems) * 50; // De 20% a 70%
//                     onProgress(`Restaurando Itens e Imagens... (${i + 1}/${totalItems})`, percent);
//                 }
//             }

//             // 4. Restaurar CONEXÕES (Rápido)
//             if (onProgress) onProgress("Restaurando Conexões...", 75);
//             await batchSaveHelper(connections, `${projectPath}/connections`);

//             // 5. Restaurar CONFIGURAÇÕES
//             if (onProgress) onProgress("Restaurando Configurações...", 90);
//             const batchSettings = writeBatch(db);

//             if (settings.tags) {
//                 const tagsObj = Array.isArray(settings.tags) 
//                     ? settings.tags.reduce((acc, t) => ({...acc, [t.id]: t}), {}) 
//                     : settings.tags;
//                 batchSettings.set(doc(db, `${projectPath}/settings`, 'tags'), tagsObj);
//             }
//             if (settings.signals) batchSettings.set(doc(db, `${projectPath}/settings`, 'signals'), settings.signals);
//             if (settings.portLabels) batchSettings.set(doc(db, `${projectPath}/settings`, 'portLabels'), settings.portLabels);
//             if (settings.nodeColors) {
//                 let payload = settings.nodeColors;
//                  if (!payload.settings && !payload.favorites) payload = { settings: payload, favorites: [] };
//                 batchSettings.set(doc(db, `${projectPath}/settings`, 'nodeColors'), payload);
//             }
//             await batchSettings.commit();

//             if (onProgress) onProgress("Concluído!", 100);
//             resolve(parsed.meta);

//         } catch (error) {
//             console.error("Erro fatal no restore:", error);
//             reject(error);
//         }
//     });
// };
// --- 2. RESTAURAR BACKUP (Lê ZIP e Re-upa Imagens) ---
export const restoreFromBackup = async (file, projectOwnerId, targetProjectId, onProgress) => {
    return new Promise(async (resolve, reject) => {
        try {
            const zip = new JSZip();
            const loadedZip = await zip.loadAsync(file);

            // 1. Ler o JSON de dados
            if (!loadedZip.file("data.json")) {
                throw new Error("Arquivo de backup inválido: 'data.json' não encontrado.");
            }

            const content = await loadedZip.file("data.json").async("string");
            const parsed = JSON.parse(content);
            const { items, connections, settings } = parsed.data;

            if (onProgress) onProgress("Estrutura lida. Limpando projeto...", 10);

            // 2. Limpeza (Wipe)
            await wipeProjectDatabase(projectOwnerId, targetProjectId);

            const projectPath = `artifacts/ftth-production/users/${projectOwnerId}/projects/${targetProjectId}`;

            // 3. Restaurar ITENS e Re-upar IMAGENS
            const totalItems = items.length;

            for (let i = 0; i < totalItems; i++) {
                const item = items[i];

                // Processar Fotos do Item
                if (item.photos && item.photos.length > 0) {
                    const newPhotos = [];

                    for (const photo of item.photos) {
                        // Clona o objeto para não alterar a referência original
                        let photoToSave = { ...photo };

                        // Se tem nome de arquivo no ZIP, tenta restaurar
                        if (photo.backupFileName && loadedZip.file(`images/${photo.backupFileName}`)) {
                            try {
                                // Pega o binário do ZIP
                                const photoBlob = await loadedZip.file(`images/${photo.backupFileName}`).async("blob");

                                // Cria referência no Storage
                                const storagePath = `users/${projectOwnerId}/images/${item.id}/${Date.now()}_${photo.backupFileName}`;
                                const storageRef = ref(storage, storagePath);

                                // Upload
                                const snapshot = await uploadBytes(storageRef, photoBlob);
                                const newUrl = await getDownloadURL(snapshot.ref);

                                // Atualiza a URL e o Path
                                photoToSave.url = newUrl;
                                photoToSave.path = storagePath;

                            } catch (err) {
                                console.error("Falha ao restaurar imagem:", photo.backupFileName, err);
                                // Se falhar, tenta manter a URL original se existir
                                if (photo.originalUrl) {
                                    photoToSave.url = photo.originalUrl;
                                }
                            }
                        }

                        // --- CORREÇÃO DO ERRO ---
                        // Removemos as propriedades temporárias totalmente
                        // O Firestore odeia 'undefined', então usamos delete
                        delete photoToSave.backupFileName;
                        delete photoToSave.originalUrl; // Opcional: removemos também a url antiga para limpar

                        newPhotos.push(photoToSave);
                    }
                    item.photos = newPhotos;
                }

                // Salva o Item no Firestore
                const { _projectId, _ownerId, ...cleanItem } = item;

                await dbActionSave(doc(db, `${projectPath}/items`, item.id), cleanItem);

                // Progresso detalhado
                if (onProgress && i % 5 === 0) {
                    const percent = 20 + (i / totalItems) * 50;
                    onProgress(`Restaurando Itens e Imagens... (${i + 1}/${totalItems})`, percent);
                }
            }

            // 4. Restaurar CONEXÕES (Rápido)
            if (onProgress) onProgress("Restaurando Conexões...", 75);
            await batchSaveHelper(connections, `${projectPath}/connections`);

            // 5. Restaurar CONFIGURAÇÕES
            if (onProgress) onProgress("Restaurando Configurações...", 90);
            const batchSettings = writeBatch(db);

            if (settings.tags) {
                const tagsObj = Array.isArray(settings.tags)
                    ? settings.tags.reduce((acc, t) => ({ ...acc, [t.id]: t }), {})
                    : settings.tags;
                // Tags são globais por usuário — gravar no caminho correto com merge
                // para não apagar tags que o usuário já possui.
                const userTagsRef = doc(db, `artifacts/ftth-production/users/${projectOwnerId}/settings`, 'tags');
                batchSettings.set(userTagsRef, tagsObj, { merge: true });
            }
            if (settings.signals) batchSettings.set(doc(db, `${projectPath}/settings`, 'signals'), settings.signals);
            if (settings.portLabels) batchSettings.set(doc(db, `${projectPath}/settings`, 'portLabels'), settings.portLabels);
            if (settings.nodeColors) {
                let payload = settings.nodeColors;
                if (!payload.settings && !payload.favorites) payload = { settings: payload, favorites: [] };
                batchSettings.set(doc(db, `${projectPath}/settings`, 'nodeColors'), payload);
            }
            await batchSettings.commit();

            if (onProgress) onProgress("Concluído!", 100);
            resolve(parsed.meta);

        } catch (error) {
            console.error("Erro fatal no restore:", error);
            reject(error);
        }
    });
};

// --- Helpers Auxiliares ---

// Salva um documento único (usado no loop de itens para garantir upload síncrono das fotos)
const dbActionSave = async (ref, data) => {
    const batch = writeBatch(db);
    batch.set(ref, data);
    await batch.commit();
}

// Salva em lote (para conexões que não têm arquivos pesados)
const batchSaveHelper = async (list, collectionPath) => {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < list.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = list.slice(i, i + CHUNK_SIZE);
        chunk.forEach(obj => {
            const { _projectId, _ownerId, ...cleanObj } = obj;
            batch.set(doc(db, collectionPath, obj.id), cleanObj);
        });
        await batch.commit();
    }
};

const wipeProjectDatabase = async (projectOwnerId, projectId) => {
    const basePath = `artifacts/ftth-production/users/${projectOwnerId}/projects/${projectId}`;
    const itemsRef = collection(db, `${basePath}/items`);
    const itemsSnap = await getDocs(query(itemsRef));
    const itemsToDelete = itemsSnap.docs.map(d => d.id);
    await batchDeleteHelper(itemsToDelete, `${basePath}/items`);

    const connsRef = collection(db, `${basePath}/connections`);
    const connsSnap = await getDocs(query(connsRef));
    const connsToDelete = connsSnap.docs.map(d => d.id);
    await batchDeleteHelper(connsToDelete, `${basePath}/connections`);

    // Nota: 'tags' não está incluído pois agora são globais por usuário
    // (caminho: users/{uid}/settings/tags) e não devem ser apagadas ao limpar o projeto.
    const settingsDocs = ['signals', 'portLabels', 'nodeColors', 'standards'];
    const batch = writeBatch(db);
    settingsDocs.forEach(docId => batch.delete(doc(db, `${basePath}/settings`, docId)));
    await batch.commit();
};

const batchDeleteHelper = async (ids, collectionPath) => {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        chunk.forEach(id => batch.delete(doc(db, collectionPath, id)));
        await batch.commit();
    }
};