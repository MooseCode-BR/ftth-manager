import { Capacitor } from '@capacitor/core';
import { saveAs } from 'file-saver';

/**
 * Salva arquivos de forma segura para qualquer tamanho no Android/iOS e Web.
 *
 * Problema resolvido: Filesystem.writeFile do Capacitor serializa o arquivo inteiro
 * como Base64 pela ponte JS→Native. Acima de ~36 MB o heap da WebView estoura e
 * o app fecha. O capacitor-blob-writer resolve isso fazendo streaming do arquivo
 * via um servidor HTTP local, sem passar pela ponte de memória.
 *
 * @param {Blob} content  - Conteúdo do arquivo como Blob
 * @param {string} filename - Nome do arquivo com extensão
 */
export const saveFile = async (content, filename) => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        try {
            const write_blob = (await import('capacitor-blob-writer')).default;
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const { Share } = await import('@capacitor/share');
            const { Toast } = await import('@capacitor/toast');

            try { await Toast.show({ text: `Preparando: ${filename}` }); } catch (e) { }

            // Garante que o conteúdo é um Blob (caso venha como string por algum motivo)
            const blob = content instanceof Blob
                ? content
                : new Blob([content], { type: 'application/octet-stream' });

            // Escreve via streaming HTTP local — sem base64, sem overhead de memória
            await write_blob({
                path: filename,
                directory: Directory.Cache,
                blob,
                recursive: false,
                on_fallback(error) {
                    // O fallback usa appendFile em chunks — ainda seguro para arquivos grandes
                    console.warn('capacitor-blob-writer usando fallback para:', filename, error);
                }
            });

            // Pega a URI nativa do arquivo gravado para compartilhar
            const { uri } = await Filesystem.getUri({
                path: filename,
                directory: Directory.Cache
            });

            await Share.share({
                title: filename,
                url: uri,
            });

            return;

        } catch (error) {
            console.error('Erro na exportação nativa:', error);
            alert('Não foi possível compartilhar o arquivo: ' + error.message);
        }
    }

    // Fluxo Web — file-saver funciona normalmente
    saveAs(content, filename);
};
