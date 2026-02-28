import { ATTENUATION } from './constants';
import tokml from 'tokml';

// Busca conexões de cabos em nós
export const findConnection = (connections, itemId, portId, side = 'A') => {
    return connections.find(
        c => (c.fromId === itemId && c.fromPort === portId && c.fromSide === side) || (c.toId === itemId && c.toPort === portId && c.toSide === side));
};
// Trata as Informações de Sinal (Nome do sinal)
export const getSignalInfo = (items, connections, portLabels, signalConfigs, itemId, portId, side = 'A', visited = new Set()) => {
    const key = `${itemId}-${portId}-${side}`;
    // Evita loops infinitos (ex: A liga em B, B liga em A)
    if(visited.has(key)) return []; 
    visited.add(key);

    const item = items.find(i=>i.id===itemId);
    if(!item) return [];

    const uniqueKey = `${itemId}-${portId}`;
    const config = signalConfigs[uniqueKey]; 

    // 1. Recupera sinais criados manualmente nesta porta (Local)
    let localSignals = [];
    let allowedIds = null; 

    if (config) {
        if (typeof config === 'string') {
            localSignals = [{ id: 'legacy-'+uniqueKey, name: config }];
        } 
        else {
            localSignals = config.local || [];
            allowedIds = config.allowed || null;
        }
    }

    // 2. Identifica de onde vêm os sinais (Fontes / Upstream)
    let sources = [];

    if(item.type==='DIO') { 
        if(side==='BACK') {
            // O lado de trás apenas reflete o da frente (passagem direta interna)
            return getSignalInfo(items, connections, portLabels, signalConfigs, itemId, portId, 'FRONT', visited); 
        } else {
            // Lado da FRENTE: Recebe sinal da conexão frontal E da conexão traseira (passagem)
            const frontConn = findConnection(connections, itemId, portId, 'FRONT');
            if(frontConn) sources.push(frontConn);
            
            const backConn = findConnection(connections, itemId, portId, 'BACK');
            if(backConn) sources.push(backConn);
        }
    } 
    else if(item.type==='SPLITTER') { 
        if(portId!==0 && portId!=='0') { 
            // Saídas (1-8): recebem sinal da entrada (porta 0)
            const inputConn = findConnection(connections, itemId, 0, 'A'); 
            if(inputConn) sources.push(inputConn);
        } 
        else {
            // Entrada (0): recebe sinal da conexão externa nela mesma
            const c = findConnection(connections, itemId, portId, 'A'); 
            if(c) sources.push(c);
        }
    } 
    else if(item.type==='CABLE') {
        // Cabo é bidirecional.
        // O sinal nesta fibra é a soma do que entra por ESTE lado + o que vem do OUTRO lado.
        
        // Fonte 1: Conexão direta neste lado (ex: OLT ligada aqui)
        const c1 = findConnection(connections, itemId, portId, side);
        if(c1) sources.push(c1);
        
        // Fonte 2: Conexão do outro lado (passando por dentro da fibra)
        const otherSide = side === 'A' ? 'B' : 'A';
        const c2 = findConnection(connections, itemId, portId, otherSide);
        if(c2) sources.push(c2);
    }
    else {
        // Outros equipamentos (OLT, Switch, Cliente): sinal vem da conexão direta na porta
        const c = findConnection(connections, itemId, portId, side);
        if(c) sources.push(c);
    }

    // 3. Processa recursivamente todas as fontes encontradas
    let upstreamSignals = [];
    sources.forEach(conn => {
        const isT = conn.toId === itemId; 
        // Pega recursivamente os sinais do item vizinho
        const s = getSignalInfo(items, connections, portLabels, signalConfigs, isT?conn.fromId:conn.toId, isT?conn.fromPort:conn.toPort, isT?conn.fromSide:conn.toSide, visited); 
        upstreamSignals = [...upstreamSignals, ...s];
    });

    // 4. Limpeza e Retorno
    // Remove duplicatas (agora essencial, pois podemos pegar o mesmo sinal por caminhos diferentes)
    const uniqueSignals = Array.from(new Map(upstreamSignals.map(s => [s.id, s])).values());

    // Aplica filtros de permissão (allowedIds) se houver
    const filtered = allowedIds ? uniqueSignals.filter(s => allowedIds.includes(s.id)) : uniqueSignals;
    
    // Junta com os sinais locais
    const result = [...filtered, ...localSignals];
    
    // Remove duplicatas finais
    return Array.from(new Map(result.map(s => [s.id, s])).values());
};
// Cálculo de potencia
export const calculatePower = (items, connections, itemId, portId, side = 'A', visited = new Set()) => {
    const key = `${itemId}-${portId}-${side}`;
    if (visited.has(key)) return null; // Evita loop infinito
    visited.add(key);

    const item = items.find(i => i.id === itemId);
    if (!item) return null;

    // 1. BASE: Se for OLT (Porta PON), retorna a potência inicial
    if (item.type === 'OLT') {
        // Assume que portas PON (não uplinks) emitem sinal
        if (String(portId).includes('-p-')) return ATTENUATION.DEFAULT_TX; 
        return null; // Uplinks não emitem sinal PON downstream
    }

    // 2. BUSCA UPSTREAM (De onde vem o sinal?)
    let prevPower = null;
    let connectionLoss = 0;
    let componentLoss = 0;

    // Lógica para Splitter (Entrada -> Saída)
    if (item.type === 'SPLITTER') {
        if (portId === 0 || portId === '0') {
            // Se estou na entrada do splitter, busco o cabo conectado aqui
            const conn = findConnection(connections, itemId, 0, 'A');
            if (conn) {
                const isT = conn.toId === itemId;
                prevPower = calculatePower(items, connections, isT ? conn.fromId : conn.toId, isT ? conn.fromPort : conn.toPort, isT ? conn.fromSide : conn.toSide, visited);
                connectionLoss = conn.type === 'FUSION' ? ATTENUATION.FUSION_LOSS : ATTENUATION.CONNECTOR_LOSS;
            }
        } 
        else {
            // Se estou na saída, o sinal vem da porta de entrada (0)
            // Recursividade interna: pega a potência da porta 0 e subtrai a perda do splitter
            prevPower = calculatePower(items, connections, itemId, 0, 'A', visited);
            // Calcula perda baseada no número de portas (ratio)
            // Se ports = 9 (1 entrada + 8 saídas), ratio é 8.
            const ratio = item.ports - 1; 
            componentLoss = ATTENUATION.SPLITTER_LOSS[ratio] || 10.5; // Default para 1:8 se não achar
        }
    } 
    // Lógica para Cabos e Passivos (Passagem direta)
    else {
        let upstreamConn = null;
        
        if (item.type === 'CABLE') {
            // Cabo passa o sinal do lado A para B (ou vice-versa)
            const otherSide = side === 'A' ? 'B' : 'A';
            upstreamConn = findConnection(connections, itemId, portId, otherSide);
        } 
        else if (item.type === 'DIO' || item.type === 'CEO' || item.type === 'CTO') {
             // Passivos comuns: buscam conexão na mesma porta (ou frente/trás no DIO)
             if (side === 'FRONT') upstreamConn = findConnection(connections, itemId, portId, 'FRONT'); // DIO Front
             else if (side === 'BACK') return calculatePower(items, connections, itemId, portId, 'FRONT', visited); // DIO Back pede pro Front
             else upstreamConn = findConnection(connections, itemId, portId, side);
        }

        if (upstreamConn) {
            const isT = upstreamConn.toId === itemId;
            prevPower = calculatePower(items, connections, isT ? upstreamConn.fromId : upstreamConn.toId, isT ? upstreamConn.fromPort : upstreamConn.toPort, isT ? upstreamConn.fromSide : upstreamConn.toSide, visited);
            connectionLoss = upstreamConn.type === 'FUSION' ? ATTENUATION.FUSION_LOSS : ATTENUATION.CONNECTOR_LOSS;
        }
    }

    // 3. CÁLCULO FINAL
    if (prevPower !== null) {
        return prevPower - connectionLoss - componentLoss;
    }

    return null;
};


// EXPORTAÇÃO KML ----------------------------------------------------------------
// 1. Função auxiliar para converter cor HEX (#RRGGBB) para KML (aabbggrr)
const hexToKmlColor = (hex) => {
    if (!hex) return 'ff000000'; // Preto padrão
    const cleanHex = hex.replace('#', '');
    
    // Se for curto (ex: #fff), expande
    const fullHex = cleanHex.length === 3 
        ? cleanHex.split('').map(c => c + c).join('') 
        : cleanHex;

    // Separa R, G, B
    const r = fullHex.substring(0, 2);
    const g = fullHex.substring(2, 4);
    const b = fullHex.substring(4, 6);

    // Retorna Alpha(ff) + Blue + Green + Red (Formato KML)
    return `ff${b}${g}${r}`;
};
// 1. Gera o mapa de sinais do Cabo (Fibra a Fibra)
const generateCableDescription = (cable, allItems, connections, signalConfigs) => {
    let html = `
        <div style="font-family: Arial, sans-serif; font-size: 12px;">
        <h3>Mapa de Sinais</h3>
        <table border="1" cellpadding="2" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f0f0f0;">
                <th>Fibra</th>
                <th>Sinal Passante</th>
            </tr>
    `;

    for (let i = 0; i < cable.ports; i++) {
        // Pega o sinal (Lado A é suficiente para verificar o que passa na fibra)
        const signals = getSignalInfo(allItems, connections, {}, signalConfigs, cable.id, i, 'A');
        const signalText = signals.length > 0 
            ? signals.map(s => `<b>${s.name}</b>`).join(', ') 
            : '<span style="color: #ccc;">Sem sinal</span>';

        html += `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${signalText}</td>
            </tr>
        `;
    }

    html += `</table></div>`;
    return `<![CDATA[${html}]]>`; // Envolve em CDATA para o KML aceitar HTML
};
// 2. Gera o Plano de Fusão do Nó (O que conecta com o que)
const generateNodeDescription = (node, allItems, connections, signalConfigs) => {
    // Encontra todos os cabos conectados a este nó (externamente)
    const attachedCables = allItems.filter(i => 
        i.type === 'CABLE' && (i.fromNode === node.id || i.toNode === node.id)
    );

    // Se não tiver cabos, retorna descrição básica
    if (attachedCables.length === 0) {
        return `<![CDATA[Tipo: ${node.type}<br>Sem cabos conectados.]]>`;
    }

    let html = `
        <div style="font-family: Arial, sans-serif; font-size: 12px;">
        <h3>Plano de Fusão - ${node.name}</h3>
    `;

    // Para cada cabo conectado a esta caixa...
    attachedCables.forEach(cable => {
        // Descobre qual lado do cabo entra nesta caixa (A ou B)
        const mySide = cable.fromNode === node.id ? 'A' : 'B';
        
        html += `<h4 style="margin-bottom: 5px; margin-top: 15px; color: ${cable.color || '#000'}; border-bottom: 1px solid #ccc;">
            Cabo: ${cable.name} (Lado ${mySide})
        </h4>`;
        
        html += `
        <table border="0" cellpadding="2" cellspacing="0" style="width: 100%; border-bottom: 1px solid #eee;">
            <tr style="background-color: #f9f9f9; text-align: left;">
                <th width="15%">Fibra</th>
                <th width="45%">Conectado a</th>
                <th width="40%">Sinal</th>
            </tr>
        `;

        for (let i = 0; i < cable.ports; i++) {
            // Busca o que está conectado nesta fibra, deste lado (mySide)
            const conn = findConnection(connections, cable.id, i, mySide);
            
            // Busca o sinal que passa aqui
            const signals = getSignalInfo(allItems, connections, {}, signalConfigs, cable.id, i, mySide);
            const signalText = signals.length > 0 
                ? signals.map(s => `<span style="color:green">${s.name}</span>`).join(', ') 
                : '<span style="color:#ccc">-</span>';

            let destText = '<span style="color: #999;">Livre / Cortado</span>';

            if (conn) {
                // Identifica o destino
                const targetId = conn.toId === cable.id ? conn.fromId : conn.toId;
                let targetItem = allItems.find(x => x.id === targetId);
                const targetPort = conn.toId === cable.id ? conn.fromPort : conn.toPort;

                if (targetItem) {
                    // Se o destino for um sub-item (Splitter/DIO dentro da caixa), pegamos o nome dele
                    // Se for outro cabo (Fusão direta), pegamos o nome do cabo
                    let targetName = targetItem.name;
                    let targetDetail = '';

                    if (targetItem.type === 'CABLE') {
                        targetDetail = `(Fibra ${parseInt(targetPort) + 1})`;
                        destText = `<b>${targetName}</b> ${targetDetail}`;
                    } 
                    else if (targetItem.type === 'SPLITTER') {
                        targetDetail = (targetPort === 0 || targetPort === '0') ? '(IN)' : `(OUT ${targetPort})`;
                        destText = `<b>Splitter: ${targetName}</b> ${targetDetail}`;
                    }
                    else if (targetItem.type === 'DIO' || targetItem.type === 'OLT') {
                         destText = `<b>${targetItem.type}: ${targetName}</b> (Porta ${parseInt(targetPort)+1})`;
                    }
                    else {
                        destText = `<b>${targetName}</b>`;
                    }
                }
            }

            html += `
                <tr>
                    <td style="border-bottom: 1px solid #eee;">${i + 1}</td>
                    <td style="border-bottom: 1px solid #eee;">${destText}</td>
                    <td style="border-bottom: 1px solid #eee; font-size: 10px;">${signalText}</td>
                </tr>
            `;
        }
        html += `</table>`;
    });

    html += `</div>`;
    return `<![CDATA[${html}]]>`;
};
// 2. Função Principal de Download
export const downloadKML = (nodes, cables, connections, signalConfigs, allItems) => {
    try {
        let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
                                <kml xmlns="http://www.opengis.net/kml/2.2">
                                    <Document>
                                        <name>Rede FTTH Export</name>
                                        <description>Exportado do FTTH Manager Cloud</description>`;

        // --- GERAR PONTOS (CAIXAS/CLIENTES) ---
        nodes.forEach(node => {
            if (node.lat && node.lng) {
                const color = hexToKmlColor(node.color || '#ffffff');
                
                // GERA DESCRIÇÃO AVANÇADA (FUSÕES)
                const description = generateNodeDescription(node, allItems, connections, signalConfigs);

                kmlContent += `
                <Placemark>
                    <name>${node.name || 'Sem Nome'}</name>
                    <description>${description}</description>
                    <Style>
                        <IconStyle>
                            <color>${color}</color>
                            <scale>1.1</scale>
                            <Icon>
                                <href>http://maps.google.com/mapfiles/kml/pushpin/wht-pushpin.png</href>
                            </Icon>
                        </IconStyle>
                        <LabelStyle>
                            <scale>0.8</scale>
                        </LabelStyle>
                    </Style>
                    <Point>
                        <coordinates>${node.lng},${node.lat},0</coordinates>
                    </Point>
                </Placemark>`;
            }
        });

        // --- GERAR LINHAS (CABOS) ---
        cables.forEach(cable => {
            const nodeA = nodes.find(n => n.id === cable.fromNode);
            const nodeB = nodes.find(n => n.id === cable.toNode);

            if (nodeA && nodeB && nodeA.lat && nodeB.lat) {
                const strokeColor = hexToKmlColor(cable.color || '#000000');
                
                // GERA DESCRIÇÃO AVANÇADA (SINAIS)
                const description = generateCableDescription(cable, allItems, connections, signalConfigs);

                let coordsString = `${nodeA.lng},${nodeA.lat},0`; 
                if (cable.waypoints && cable.waypoints.length > 0) {
                    cable.waypoints.forEach(wp => {
                        coordsString += ` ${wp.lng},${wp.lat},0`;
                    });
                }
                coordsString += ` ${nodeB.lng},${nodeB.lat},0`; 

                kmlContent += `
                <Placemark>
                    <name>${cable.name || 'Cabo'}</name>
                    <description>${description}</description>
                    <Style>
                        <LineStyle>
                            <color>${strokeColor}</color>
                            <width>5</width>
                        </LineStyle>
                    </Style>
                    <LineString>
                        <tessellate>1</tessellate>
                        <coordinates>${coordsString}</coordinates>
                    </LineString>
                </Placemark>`;
            }
        });

        kmlContent += `
            </Document>
        </kml>`;

        const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `rede_ftth_${new Date().toISOString().slice(0,10)}.kml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;

  } catch (error) {
    console.error("Erro ao gerar KML:", error);
    return false;
  }
};


// --- IMPORTAÇÃO KML -----------------------------------------------------------------
// Converte cor KML (aabbggrr) para Hex Web (#rrggbb)
const kmlColorToHex = (kmlColor) => {
    if (!kmlColor) return '#000000'; // Preto padrão
    
    // Remove espaços e quebras de linha
    let c = kmlColor.trim();
    
    // O KML pode vir como aabbggrr ou só bbggrr. Geralmente são 8 chars.
    if (c.length === 8) {
        // Ignora os 2 primeiros (Alpha - Transparência)
        const blue = c.substring(2, 4);
        const green = c.substring(4, 6);
        const red = c.substring(6, 8);
        return `#${red}${green}${blue}`;
    } 
    // Caso raro de vir sem alpha (6 chars: bbggrr)
    else if (c.length === 6) {
        const blue = c.substring(0, 2);
        const green = c.substring(2, 4);
        const red = c.substring(4, 6);
        return `#${red}${green}${blue}`;
    }
    
    return '#000000';
};
// 1. Função que tenta adivinhar o tipo do item pelo nome
const guessTypeByName = (name) => {
    const n = name.toUpperCase();
    if (n.includes('CTO')) return 'CTO';
    if (n.includes('CEO') || n.includes('EMENDA')) return 'CEO';
    if (n.includes('POP') || n.includes('OLT') || n.includes('DATA CENTER')) return 'POP';
    if (n.includes('CLIENTE') || n.includes('CASA')) return 'CLIENT';
    if (n.includes('TORRE')) return 'TOWER';
    if (n.includes('POSTE')) return 'POST';
    return 'OBJECT'; // Padrão se não soubermos (melhor assumir caixa de emenda)
};
// 2. Função principal de processamento do texto KML
export const parseKMLImport = (kmlText) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, "text/xml");
    
    const styleMap = {};

    // 1. MAPEAMENTO DE ESTILOS
    const styles = xmlDoc.getElementsByTagName("Style");
    for (let i = 0; i < styles.length; i++) {
        const style = styles[i];
        const id = style.getAttribute("id");
        if (id) {
            const lineStyle = style.getElementsByTagName("LineStyle")[0];
            const lineColor = lineStyle?.getElementsByTagName("color")[0]?.textContent;
            if (lineColor) {
                styleMap[`#${id}`] = kmlColorToHex(lineColor.trim());
            }
        }
    }

    const styleMaps = xmlDoc.getElementsByTagName("StyleMap");
    for (let i = 0; i < styleMaps.length; i++) {
        const sm = styleMaps[i];
        const id = sm.getAttribute("id");
        if (id) {
            const pairs = sm.getElementsByTagName("Pair");
            let targetStyleUrl = null;
            for (let j = 0; j < pairs.length; j++) {
                const key = pairs[j].getElementsByTagName("key")[0]?.textContent?.trim();
                const url = pairs[j].getElementsByTagName("styleUrl")[0]?.textContent?.trim();
                if (key === 'normal') {
                    targetStyleUrl = url;
                    break;
                }
            }
            if (!targetStyleUrl && pairs.length > 0) {
                 targetStyleUrl = pairs[0].getElementsByTagName("styleUrl")[0]?.textContent?.trim();
            }
            if (targetStyleUrl && styleMap[targetStyleUrl]) {
                styleMap[`#${id}`] = styleMap[targetStyleUrl];
            }
        }
    }

    // 2. TRAVESSIA RECURSIVA
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    const rawPoints = [];
    const rawLines = [];

    const processPlacemark = (p, currentFolders) => {
        const name = p.getElementsByTagName("name")[0]?.textContent || "Item Desconhecido";
        
        // --- NOVO: Extrair Descrição ---
        // O textContent pega o texto cru, ignorando tags HTML se não estiverem em CDATA.
        // Se estiver em CDATA (comum no Google Earth), virá com HTML. 
        // Se quiser remover HTML, teríamos que usar regex, mas geralmente é útil manter.
        const description = p.getElementsByTagName("description")[0]?.textContent?.trim() || "";
        // -------------------------------

        let itemColor = null;
        const styleUrl = p.getElementsByTagName("styleUrl")[0]?.textContent?.trim();
        if (styleUrl && styleMap[styleUrl]) {
            itemColor = styleMap[styleUrl];
        }
        
        const inlineStyle = p.getElementsByTagName("Style")[0];
        if (inlineStyle) {
            const inlineLineColor = inlineStyle.getElementsByTagName("LineStyle")[0]?.getElementsByTagName("color")[0]?.textContent;
            if (inlineLineColor) {
                itemColor = kmlColorToHex(inlineLineColor);
            }
        }

        const point = p.getElementsByTagName("Point")[0];
        const line = p.getElementsByTagName("LineString")[0];

        if (point) {
            const coords = point.getElementsByTagName("coordinates")[0]?.textContent.trim();
            if (coords) {
                const [lng, lat] = coords.split(',').map(parseFloat);
                if (!isNaN(lat) && !isNaN(lng)) {
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                    minLng = Math.min(minLng, lng);
                    maxLng = Math.max(maxLng, lng);
                    
                    rawPoints.push({ 
                        name, 
                        lat, 
                        lng, 
                        color: itemColor,
                        kmlFolders: [...currentFolders],
                        notes: description // <--- Passamos a descrição para cá
                    });
                }
            }
        } 
        else if (line) {
            const coordsStr = line.getElementsByTagName("coordinates")[0]?.textContent.trim();
            if (coordsStr) {
                const points = coordsStr.split(/\s+/).map(pair => {
                    const [lng, lat] = pair.split(',').map(parseFloat);
                    return { lat, lng };
                }).filter(p => !isNaN(p.lat));

                if (points.length > 1) {
                    rawLines.push({ 
                        name, 
                        points, 
                        color: itemColor,
                        kmlFolders: [...currentFolders],
                        notes: description // <--- Passamos a descrição para cá
                    });
                }
            }
        }
    };

    const traverse = (node, folderStack) => {
        let currentStack = [...folderStack];

        if (node.nodeName === 'Folder' || node.nodeName === 'Document') {
            let folderName = null;
            for (let i = 0; i < node.children.length; i++) {
                if (node.children[i].nodeName === 'name') {
                    folderName = node.children[i].textContent.trim();
                    break;
                }
            }
            if (folderName) {
                currentStack.push(folderName);
            }
        }

        if (node.nodeName === 'Placemark') {
            processPlacemark(node, currentStack);
        }

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (['Folder', 'Document', 'Placemark', 'kml'].includes(child.nodeName)) {
                traverse(child, currentStack);
            }
        }
    };

    traverse(xmlDoc.documentElement, []);

    // 3. GERAÇÃO DOS ITENS
    if (rawPoints.length === 0 && rawLines.length === 0) return [];

    const CANVAS_SIZE = 5000;
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const createdNodes = [];
    const newItems = [];

    // Nós
    rawPoints.forEach((pt, index) => {
        const type = guessTypeByName(pt.name);
        const x = ((pt.lng - minLng) / lngRange) * CANVAS_SIZE;
        const y = CANVAS_SIZE - ((pt.lat - minLat) / latRange) * CANVAS_SIZE;

        const nodeId = `imp_node_${Date.now()}_${index}`;

        const newNode = {
            id: nodeId,
            type: type,
            name: pt.name,
            x: Math.round(x),
            y: Math.round(y),
            lat: pt.lat,
            lng: pt.lng,
            ports: 0,
            parentId: null,
            kmlFolders: pt.kmlFolders,
            notes: pt.notes // <--- Copiamos para o item final
        };
        createdNodes.push(newNode);
        newItems.push(newNode);

        // if (type === 'CTO') {
        //     newItems.push({
        //         id: `imp_split_${Date.now()}_${index}`,
        //         type: 'SPLITTER',
        //         name: 'Splitter 1:8',
        //         parentId: nodeId, 
        //         ports: 9, 
        //         kmlFolders: pt.kmlFolders 
        //     });
        // }
    });

    // Cabos
    rawLines.forEach((line, index) => {
        const startPt = line.points[0];
        const endPt = line.points[line.points.length - 1];

        const findNearestNode = (lat, lng) => {
            let nearest = null;
            let minDist = 0.0002; 
            createdNodes.forEach(node => {
                const d = Math.sqrt(Math.pow(node.lat - lat, 2) + Math.pow(node.lng - lng, 2));
                if (d < minDist) {
                    minDist = d;
                    nearest = node;
                }
            });
            return nearest;
        };

        const nodeA = findNearestNode(startPt.lat, startPt.lng);
        const nodeB = findNearestNode(endPt.lat, endPt.lng);

        newItems.push({
            id: `imp_cable_${Date.now()}_${index}`,
            type: 'CABLE',
            name: line.name || `Cabo ${index}`,
            fromNode: nodeA ? nodeA.id : null, 
            toNode: nodeB ? nodeB.id : null,   
            ports: 12,
            waypoints: line.points.slice(1, -1),
            color: line.color || '#000000',
            _startCoords: startPt,
            _endCoords: endPt,
            kmlFolders: line.kmlFolders,
            notes: line.notes // <--- Copiamos para o item final
        });
    });

    return newItems;
};
// Busca candidatos próximos para uma coordenada específica
export const findNearbyCandidates = (targetLat, targetLng, allNodes, limit = 3) => {
    // Raio de busca expandido para sugestão (ex: ~100 metros)
    const SEARCH_RADIUS = 0.001; 
    
    const candidates = allNodes
        .map(node => {
            const dist = Math.sqrt(Math.pow(node.lat - targetLat, 2) + Math.pow(node.lng - targetLng, 2));
            // Converte graus para metros (aproximado) para exibir ao usuário
            // 1 grau lat ~ 111km. 0.00001 ~ 1.1m
            const meters = Math.round(dist * 111320); 
            return { node, dist, meters };
        })
        .filter(item => item.dist < SEARCH_RADIUS)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, limit);

    return candidates;
};
// --- ANÁLISE DE DUPLICATAS ---
export const analyzeDuplicates = (newItems, existingItems) => {
    // Distância de ~5 metros para considerar "suspeito"
    const THRESHOLD = 0.00005; 

    const cleanItems = [];
    const conflicts = [];

    newItems.forEach(newItem => {
        let match = null;

        // 1. Verifica CABOS (Pelo nome exato)
        if (newItem.type === 'CABLE') {
            match = existingItems.find(existing => 
                existing.type === 'CABLE' && 
                newItem.name && existing.name && 
                newItem.name.trim() === existing.name.trim()
            );
        }
        // 2. Verifica NÓS (Distância + Tipo)
        else {
            match = existingItems.find(existing => {
                if (existing.type !== newItem.type) return false;
                
                const dLat = Math.abs(existing.lat - newItem.lat);
                const dLng = Math.abs(existing.lng - newItem.lng);
                
                // Se está muito perto
                if (dLat < THRESHOLD && dLng < THRESHOLD) {
                    return true; 
                }
                return false;
            });
        }

        if (match) {
            conflicts.push({
                newItem: newItem,
                existingItem: match,
                reason: newItem.type === 'CABLE' ? 'Nome Idêntico' : 'Localização Coincidente'
            });
        } else {
            cleanItems.push(newItem);
        }
    });

    return { cleanItems, conflicts };
};

// --- CÁLCULO DE DISTÂNCIA E METRIFICAÇÃO ---
// 1. Fórmula de Haversine (Distância entre dois pontos GPS em metros)
export const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

    const R = 6371e3; // Raio da Terra em metros
    const toRad = (val) => val * Math.PI / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Retorna metros
};
// 2. Calcula comprimento total de um cabo (considerando curvas)
export const calculateCableLength = (cable, allItems) => {
    const nodeA = allItems.find(i => i.id === cable.fromNode);
    const nodeB = allItems.find(i => i.id === cable.toNode);

    if (!nodeA || !nodeB) return 0;

    let totalDistance = 0;
    let currentPoint = { lat: nodeA.lat, lng: nodeA.lng };

    // Se tiver curvas (waypoints), soma segmento por segmento
    if (cable.waypoints && cable.waypoints.length > 0) {
        cable.waypoints.forEach(wp => {
            totalDistance += getDistanceInMeters(currentPoint.lat, currentPoint.lng, wp.lat, wp.lng);
            currentPoint = wp; // O ponto atual avança para a curva
        });
    }

    // Soma o último segmento (da última curva até o destino)
    totalDistance += getDistanceInMeters(currentPoint.lat, currentPoint.lng, nodeB.lat, nodeB.lng);

    return totalDistance;
};

// Função auxiliar para apagar imagens do Storage
const deleteNodeImages = async (node) => {
    // Se o node não tem fotos, não faz nada
    if (!node.photos || node.photos.length === 0) return;

    const deletePromises = node.photos.map(photo => {
        // Precisamos do 'path' (caminho interno) para apagar.
        // Se no teu sistema antigo só salvavas a 'url', teremos de tentar extrair o path
        // Mas assumindo que segues o padrão novo que fizemos no backup:
        
        let pathToDelete = photo.path;

        // FALLBACK: Se não tiver 'path' salvo, tentamos adivinhar ou usar a URL
        // (Geralmente é melhor ter o path salvo no objeto da foto)
        if (!pathToDelete) {
             console.warn("Imagem sem path definido, ignorando:", photo.url);
             return Promise.resolve();
        }

        const imageRef = ref(storage, pathToDelete);
        
        // Retorna a promessa de delete (com tratamento de erro individual)
        return deleteObject(imageRef).catch(error => {
            // Se a imagem já não existir (404), não tem problema, segue o jogo
            if (error.code === 'storage/object-not-found') {
                return; 
            }
            console.error("Erro ao apagar imagem do storage:", error);
        });
    });

    // Espera todas as imagens serem apagadas
    await Promise.all(deletePromises);
};