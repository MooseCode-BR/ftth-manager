// src/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Função auxiliar para carregar imagem, corrigir rotação via Canvas e converter para Base64
const loadImage = (url) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Importante para imagens externas (Firebase)
        img.src = url;

        img.onload = () => {
            // Criamos um canvas para "re-desenhar" a imagem
            // Isso remove metadados EXIF e garante que a rotação visual seja a final
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Retorna o DataURL (imagem processada) e as dimensões originais
            try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Qualidade 0.7 para o PDF não ficar gigante
                resolve({
                    data: dataUrl,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            } catch (e) {
                console.warn("Erro ao converter imagem em canvas:", e);
                resolve(null);
            }
        };

        img.onerror = (e) => {
            console.warn("Erro ao carregar imagem para PDF:", url);
            resolve(null); // Resolve null para não quebrar o relatório
        };
    });
};

export const generateNodeReport = async (node, allItems) => {
    if (!node) return;

    // 1. Inicializa o PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20; // Posição vertical do cursor

    // --- CABEÇALHO ---
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(node.name || "Sem Nome", pageWidth / 2, currentY, { align: 'center' });

    currentY += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Tipo: ${node.type} | Gerado em: ${new Date().toLocaleDateString()}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    doc.text(`Localização: ${node.lat}, ${node.lng}`, pageWidth / 2, currentY, { align: 'center' });

    currentY += 15;

    // --- TABELA 1: EQUIPAMENTOS INTERNOS ---
    const internalItems = allItems.filter(i => i.parentId === node.id);

    if (internalItems.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Equipamentos Internos", 14, currentY);
        currentY += 5;

        const itemsData = internalItems.map(item => [
            item.name,
            item.type,
            item.ports ? `${item.ports} portas` : '-'
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Nome', 'Tipo', 'Detalhes']],
            body: itemsData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }, // Azul
        });

        currentY = doc.lastAutoTable.finalY + 15;
    } 
    // else {
    //     // doc.setFontSize(11);
    //     // doc.setTextColor(80, 80, 80);
    //     // // doc.text("- Nenhum equipamento interno cadastrado.", 14, currentY);
    //     // // currentY += 15;
    //     // doc.text("", 14, currentY);

    // }

    // --- TABELA 2: CABOS CONECTADOS ---
    const connectedCables = allItems.filter(i =>
        i.type === 'CABLE' && (i.fromNode === node.id || i.toNode === node.id)
    );

    if (connectedCables.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Cabos Conectados", 14, currentY);
        currentY += 5;

        const cablesData = connectedCables.map(cable => {
            const otherId = cable.fromNode === node.id ? cable.toNode : cable.fromNode;
            const otherNode = allItems.find(i => i.id === otherId);
            const destName = otherNode ? otherNode.name : 'Desconhecido';

            return [
                cable.name,
                destName,
                `${cable.ports || 0} fibras`
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Nome do Cabo', 'Conectado a', 'Capacidade']],
            body: cablesData,
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11] }, // Laranja
        });

        currentY = doc.lastAutoTable.finalY + 15;
    } 
    // else {
    //     doc.setFontSize(11);
    //     doc.setTextColor(80, 80, 80);
    //     // doc.text("- Nenhum cabo conectado.", 14, currentY);
    //     // currentY += 15;
    //     doc.text("", 14, currentY);

    // }

    // --- GALERIA DE IMAGENS ---
    if (node.photos && node.photos.length > 0) {
        // Verifica quebra de página antes do título
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Evidências Fotográficas (${node.photos.length})`, 14, currentY);
        currentY += 10;

        // Carrega todas as imagens processadas
        const loadedImages = await Promise.all(node.photos.map(p => loadImage(p.url)));

        // Configuração do Grid
        const boxWidth = 80;   // Largura da caixa onde a foto vai ficar
        const boxHeight = 60;  // Altura da caixa
        const gap = 15;        // Espaço entre fotos
        const xStart = 15;     // Margem esquerda
        let xPos = xStart;

        for (let i = 0; i < loadedImages.length; i++) {
            const imgObj = loadedImages[i];

            if (!imgObj) continue;

            // Verifica quebra de página para a imagem
            if (currentY + boxHeight > 280) {
                doc.addPage();
                currentY = 20;
            }

            try {
                // Lógica de Aspect Ratio (Manter proporção sem esticar)
                const ratio = Math.min(boxWidth / imgObj.width, boxHeight / imgObj.height);
                const finalWidth = imgObj.width * ratio;
                const finalHeight = imgObj.height * ratio;

                // Centraliza a imagem dentro da caixa 80x60
                const xCentered = xPos + (boxWidth - finalWidth) / 2;
                const yCentered = currentY + (boxHeight - finalHeight) / 2;

                // Adiciona a imagem processada
                doc.addImage(imgObj.data, 'JPEG', xCentered, yCentered, finalWidth, finalHeight);

                // Desenha uma borda cinza fininha em volta da "caixa" (opcional, ajuda a organizar)
                doc.setDrawColor(200, 200, 200);
                doc.rect(xPos, currentY, boxWidth, boxHeight);

                // Legenda (Data)
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                const dateStr = node.photos[i].date ? new Date(node.photos[i].date).toLocaleDateString() : '';
                doc.text(dateStr, xPos, currentY + boxHeight + 4);

            } catch (err) {
                console.error("Erro ao adicionar imagem ao PDF", err);
            }

            // Alterna Colunas
            if (xPos === xStart) {
                xPos += boxWidth + gap; // Move para direita
            } else {
                xPos = xStart; // Volta para esquerda
                currentY += boxHeight + 12; // Desce linha
            }
        }
    }

    doc.save(`Relatorio_${node.name ? node.name.replace(/\s+/g, '_') : 'Node'}.pdf`);
};