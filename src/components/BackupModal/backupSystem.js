import { writeBatch, doc, collection, getDocs, query, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '../../firebaseConfig';
import JSZip from 'jszip';

import { saveFile } from '../../utils/fileDownloader';

// ─────────────────────────────────────────────────────────
//  HELPERS INTERNOS
// ─────────────────────────────────────────────────────────

/**
 * Baixa uma imagem via URL e retorna um Blob, ou null em caso de falha.
 */
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

/**
 * Re-gera uma miniatura WebP (300px) a partir de um Blob de imagem.
 * Usado na restauração quando o ZIP não contém o arquivo thumb_ (backups antigos).
 * Roda no browser via Canvas API.
 */
const generateThumbnailFromBlob = (blob, maxWidth = 300) => {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            const ratio = maxWidth / img.width;
            const canvas = document.createElement('canvas');
            canvas.width = maxWidth;
            canvas.height = img.height * ratio;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            canvas.toBlob((thumbBlob) => {
                resolve(thumbBlob);
            }, 'image/webp', 0.7);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null); // não bloqueia a restauração se falhar
        };
        img.src = url;
    });
};


// ─────────────────────────────────────────────────────────
//  1. GERAR BACKUP (COM IMAGENS E MINIATURAS NO ZIP)
// ─────────────────────────────────────────────────────────
export const generateBackupFile = async (data, visibleProjects) => {
    const {
        items, connections, availableTags, signalNames, portLabels, nodeColorSettings
    } = data;

    if (!visibleProjects || visibleProjects.length === 0) {
        return;
    }

    // Itera sobre cada projeto visível
    for (const project of visibleProjects) {
        const zip = new JSZip();
        const imgFolder = zip.folder("images");

        // 1. Busca dados do projeto diretamente do banco para garantir que pega tudo
        // independentemente do projeto estar visível na tela (memória) ou não.
        const projectPath = `artifacts/ftth-production/users/${project.ownerId}/projects/${project.id}`;

        let projectItems = items.filter(i => i._projectId === project.id);
        let projectConnections = connections.filter(c => c._projectId === project.id);
        const finalSettings = { tags: availableTags, signals: signalNames, portLabels: portLabels, nodeColors: nodeColorSettings };

        try {
            // Se o projeto não está carregado na memória, ou por precaução, tenta buscar no banco:
            if (projectItems.length === 0) {
                const itemsSnap = await getDocs(query(collection(db, `${projectPath}/items`)));
                projectItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data(), _projectId: project.id, _ownerId: project.ownerId }));

                const connSnap = await getDocs(query(collection(db, `${projectPath}/connections`)));
                projectConnections = connSnap.docs.map(d => ({ id: d.id, ...d.data(), _projectId: project.id, _ownerId: project.ownerId }));
            }

            // Busca configurações específicas do projeto
            const signalsDoc = await getDoc(doc(db, `${projectPath}/settings`, 'signals'));
            if (signalsDoc.exists()) finalSettings.signals = signalsDoc.data();

            const portLabelsDoc = await getDoc(doc(db, `${projectPath}/settings`, 'portLabels'));
            if (portLabelsDoc.exists()) finalSettings.portLabels = portLabelsDoc.data();

            const nodeColorsDoc = await getDoc(doc(db, `${projectPath}/settings`, 'nodeColors'));
            if (nodeColorsDoc.exists()) {
                const ncData = nodeColorsDoc.data();
                finalSettings.nodeColors = ncData;
            }
        } catch (error) {
            console.error(`Erro ao buscar dados completos do projeto ${project.name}:`, error);
        }

        // 2. Processar Imagens (original + miniatura)
        const itemsWithLocalRefs = JSON.parse(JSON.stringify(projectItems)); // Clone para não alterar o original

        const imagePromises = [];

        itemsWithLocalRefs.forEach(item => {
            if (item.photos && item.photos.length > 0) {
                item.photos.forEach((photo) => {

                    const promise = (async () => {
                        const extension = photo.name ? photo.name.split('.').pop() : 'jpg';
                        const zipFileName = `${item.id}_${photo.id}.${extension}`;

                        // ── Imagem ORIGINAL ──
                        if (photo.url) {
                            const blob = await fetchImageBlob(photo.url);
                            if (blob) {
                                imgFolder.file(zipFileName, blob);
                                photo.backupFileName = zipFileName;
                                photo.originalUrl = photo.url;
                            }
                        }

                        // ── MINIATURA (thumbnailUrl) ──
                        // Incluímos o blob da miniatura no ZIP com o prefixo "thumb_"
                        // Isso garante que a restauração vai re-subir a miniatura sem precisar
                        // re-gerar via canvas (mais rápido e sem perda de qualidade extra).
                        if (photo.thumbnailUrl) {
                            const thumbBlob = await fetchImageBlob(photo.thumbnailUrl);
                            if (thumbBlob) {
                                const thumbZipFileName = `thumb_${zipFileName}`;
                                imgFolder.file(thumbZipFileName, thumbBlob);
                                // Guarda o nome do arquivo no ZIP para o restore saber onde encontrar
                                photo.backupThumbFileName = thumbZipFileName;
                                photo.originalThumbnailUrl = photo.thumbnailUrl;
                            }
                        }

                    })();
                    imagePromises.push(promise);
                });
            }
        });

        // Espera todas as imagens e miniaturas baixarem
        await Promise.all(imagePromises);

        // 3. Monta o JSON de dados (agora com referências locais nas fotos)
        const backupObject = {
            meta: {
                appName: "FTTH Manager",
                version: "0.7.0 (ZipImages+Thumbs)",
                createdAt: new Date().toISOString(),
                projectName: project.name,
                projectId: project.id,
                totalItems: projectItems.length,
                totalConnections: projectConnections.length
            },
            data: {
                items: itemsWithLocalRefs, // Usamos a lista modificada (com backupFileName e backupThumbFileName)
                connections: projectConnections,
                settings: finalSettings
            }
        };

        // Adiciona o JSON ao ZIP
        zip.file("data.json", JSON.stringify(backupObject, null, 2));

        // 4. Gera o arquivo ZIP como Blob e distribui via download/share
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const safeName = project.name.replace(/[^a-z0-9à-ú ]/gi, '_');

        await saveFile(zipBlob, `${safeName}.zip`);
    }
};


// ─────────────────────────────────────────────────────────
//  2. RESTAURAR BACKUP (Abordagem Transacional / Tudo ou Nada)
// ─────────────────────────────────────────────────────────
export const restoreFromBackup = async (file, projectOwnerId, targetProjectId, onProgress) => {
    return new Promise(async (resolve, reject) => {
        // Armazena as referências dos uploads para podermos apagá-las se algo der erro (Rollback)
        const uploadedStorageRefs = [];

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
            const projectPath = `artifacts/ftth-production/users/${projectOwnerId}/projects/${targetProjectId}`;

            if (onProgress) onProgress("Preparando dados e imagens", 10);

            // ── FASE 1: PREPARAÇÃO E UPLOAD DE IMAGENS (ORIGINAL + MINIATURA) ──
            // Nenhuma alteração é feita no Firestore ainda.
            const itemsToSave = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const { _projectId, _ownerId, ...cleanItem } = item; // Limpa chaves obsoletas

                if (cleanItem.photos && cleanItem.photos.length > 0) {
                    const newPhotos = [];
                    for (const photo of cleanItem.photos) {
                        let photoToSave = { ...photo };

                        // ── Restaurar imagem ORIGINAL ──
                        if (photo.backupFileName && loadedZip.file(`images/${photo.backupFileName}`)) {
                            const photoBlob = await loadedZip.file(`images/${photo.backupFileName}`).async("blob");
                            const storagePath = `users/${projectOwnerId}/images/${cleanItem.id}/${Date.now()}_${photo.backupFileName}`;
                            const storageRefToUpload = ref(storage, storagePath);

                            const extension = photo.backupFileName.split('.').pop().toLowerCase();
                            let mimeType = 'image/jpeg';
                            if (extension === 'png') mimeType = 'image/png';
                            else if (extension === 'jpg') mimeType = 'image/jpeg';
                            else if (extension === 'webp') mimeType = 'image/webp';
                            else if (extension === 'gif') mimeType = 'image/gif';
                            else if (extension === 'svg') mimeType = 'image/svg+xml';

                            const snapshot = await uploadBytes(storageRefToUpload, photoBlob, { contentType: mimeType });
                            uploadedStorageRefs.push(snapshot.ref);

                            photoToSave.url = await getDownloadURL(snapshot.ref);
                            photoToSave.path = storagePath;

                            // ── Restaurar MINIATURA ──
                            // Cenário A: o ZIP contém o arquivo de miniatura (backup novo, v0.5+)
                            // Cenário B: o ZIP NÃO contém miniatura (backup antigo) → re-gera via canvas
                            const thumbZipPath = `images/${photo.backupThumbFileName || `thumb_${photo.backupFileName}`}`;
                            let thumbBlob = null;

                            if (photo.backupThumbFileName && loadedZip.file(thumbZipPath)) {
                                // Cenário A: pega do ZIP
                                thumbBlob = await loadedZip.file(thumbZipPath).async("blob");
                            } else {
                                // Cenário B: re-gera via canvas a partir do original já baixado
                                thumbBlob = await generateThumbnailFromBlob(photoBlob);
                            }

                            if (thumbBlob) {
                                const thumbFileName = `thumb_${photo.backupFileName.replace(/\.[^.]+$/, '.webp')}`;
                                const thumbStoragePath = `users/${projectOwnerId}/images/${cleanItem.id}/${Date.now()}_${thumbFileName}`;
                                const thumbRef = ref(storage, thumbStoragePath);

                                const thumbSnapshot = await uploadBytes(thumbRef, thumbBlob, { contentType: 'image/webp' });
                                uploadedStorageRefs.push(thumbSnapshot.ref);

                                photoToSave.thumbnailUrl = await getDownloadURL(thumbSnapshot.ref);
                                photoToSave.thumbnailPath = thumbStoragePath;
                            } else {
                                // Se falhar na geração da miniatura, usa a original como fallback
                                photoToSave.thumbnailUrl = photoToSave.url;
                                photoToSave.thumbnailPath = storagePath;
                            }

                        } else if (photo.originalUrl) {
                            // Foto sem backupFileName (backup muito antigo, só tinha URL online)
                            photoToSave.url = photo.originalUrl;
                            // Nesse caso, thumbnailUrl também vira fallback para a original
                            photoToSave.thumbnailUrl = photo.originalThumbnailUrl || photo.originalUrl;
                        }

                        // Limpa campos temporários de backup
                        delete photoToSave.backupFileName;
                        delete photoToSave.backupThumbFileName;
                        delete photoToSave.originalUrl;
                        delete photoToSave.originalThumbnailUrl;

                        newPhotos.push(photoToSave);
                    }
                    cleanItem.photos = newPhotos;
                }
                itemsToSave.push(cleanItem);

                if (onProgress) {
                    const percent = 10 + (i / items.length) * 40; // Vai de 10% a 50%
                    onProgress(`Restaurando itens (${i + 1}/${items.length})`, percent);
                }
            }

            // ── FASE 2: PREPARAÇÃO DO FIRESTORE (O Delta) ──
            if (onProgress) onProgress("Analisando o que precisa ser substituído...", 60);

            // Puxa o que existe ATUALMENTE no banco para descobrirmos o que precisa ser deletado
            const currentItemsSnap = await getDocs(query(collection(db, `${projectPath}/items`)));
            const currentConnectionsSnap = await getDocs(query(collection(db, `${projectPath}/connections`)));

            const newItemsIds = itemsToSave.map(i => i.id);
            const newConnectionsIds = connections.map(c => c.id);

            // Filtramos para apagar SOMENTE o que existe no banco atual mas NÃO existe no backup.
            const itemsToDelete = currentItemsSnap.docs.map(d => d.id).filter(id => !newItemsIds.includes(id));
            const connectionsToDelete = currentConnectionsSnap.docs.map(d => d.id).filter(id => !newConnectionsIds.includes(id));

            // Centralizamos todas as operações de banco em um grande array
            const firestoreOperations = [];

            // 1. Operações de Deleção do que sobrou
            itemsToDelete.forEach(id => firestoreOperations.push({ type: 'delete', ref: doc(db, `${projectPath}/items`, id) }));
            connectionsToDelete.forEach(id => firestoreOperations.push({ type: 'delete', ref: doc(db, `${projectPath}/connections`, id) }));

            // 2. Operações de Criação/Atualização dos novos itens
            itemsToSave.forEach(item => {
                firestoreOperations.push({ type: 'set', ref: doc(db, `${projectPath}/items`, item.id), data: item });
            });

            // 3. Operações das Conexões
            connections.forEach(conn => {
                const { _projectId, _ownerId, ...cleanConn } = conn;
                firestoreOperations.push({ type: 'set', ref: doc(db, `${projectPath}/connections`, cleanConn.id), data: cleanConn });
            });

            // 4. Operações das Configurações
            if (settings.tags) {
                const tagsObj = Array.isArray(settings.tags) ? settings.tags.reduce((acc, t) => ({ ...acc, [t.id]: t }), {}) : settings.tags;
                const userTagsRef = doc(db, `artifacts/ftth-production/users/${projectOwnerId}/settings`, 'tags');
                firestoreOperations.push({ type: 'set', ref: userTagsRef, data: tagsObj, merge: true });
            }
            if (settings.signals) firestoreOperations.push({ type: 'set', ref: doc(db, `${projectPath}/settings`, 'signals'), data: settings.signals });
            if (settings.portLabels) firestoreOperations.push({ type: 'set', ref: doc(db, `${projectPath}/settings`, 'portLabels'), data: settings.portLabels });
            if (settings.nodeColors) {
                let payload = settings.nodeColors;
                if (!payload.settings && !payload.favorites) payload = { settings: payload, favorites: [] };
                firestoreOperations.push({ type: 'set', ref: doc(db, `${projectPath}/settings`, 'nodeColors'), data: payload });
            }

            // ── FASE 3: EXECUÇÃO DOS LOTES (COMMIT FINAL) ──
            if (onProgress) onProgress("Gravando novos dados no projeto", 80);

            const CHUNK_SIZE = 450;
            for (let i = 0; i < firestoreOperations.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db);
                const chunk = firestoreOperations.slice(i, i + CHUNK_SIZE);

                chunk.forEach(op => {
                    if (op.type === 'set') {
                        if (op.merge) batch.set(op.ref, op.data, { merge: true });
                        else batch.set(op.ref, op.data);
                    } else if (op.type === 'delete') {
                        batch.delete(op.ref);
                    }
                });

                await batch.commit();
            }

            if (onProgress) onProgress("Restauração Concluída com Sucesso!", 100);
            resolve(parsed.meta);

        } catch (error) {
            console.error("Erro fatal na restauração. Iniciando Rollback de segurança", error);
            if (onProgress) onProgress("Falha detectada. Revertendo arquivos e cancelando operação", 0);

            // ── ROLLBACK DE SEGURANÇA ──
            // Se ocorreu um erro, tentamos apagar TODAS as imagens (originais + miniaturas)
            // que foram subidas para o Storage durante essa tentativa falha.
            if (uploadedStorageRefs.length > 0) {
                try {
                    const rollbackPromises = uploadedStorageRefs.map(storageReference =>
                        deleteObject(storageReference).catch(e => console.warn("Não foi possível apagar arquivo no rollback", e))
                    );
                    await Promise.all(rollbackPromises);
                    console.log("Rollback de imagens concluído. O banco de dados não foi afetado.");
                } catch (rollbackError) {
                    console.error("Erro durante o processo de Rollback:", rollbackError);
                }
            }

            reject(error);
        }
    });
};


// ─────────────────────────────────────────────────────────
//  Helpers Auxiliares (internos)
// ─────────────────────────────────────────────────────────

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

const batchDeleteHelper = async (ids, collectionPath) => {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        chunk.forEach(id => batch.delete(doc(db, collectionPath, id)));
        await batch.commit();
    }
};