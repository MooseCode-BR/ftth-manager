import { ATTENUATION } from '../config/constants';
import { saveFile } from './fileDownloader';
//import tokml from 'tokml';


// Busca conexões de cabos em nós ====================//
export const findConnection = (connections, itemId, portId, side = 'A') => {
    return connections.find(
        c => (c.fromId === itemId && c.fromPort === portId && c.fromSide === side) || (c.toId === itemId && c.toPort === portId && c.toSide === side));
};
//===================================================//



// Trata as Informações de Sinal (Nome do sinal) ===//
export const getSignalInfo = (items, connections, portLabels, signalConfigs, itemId, portId, side = 'A', visited = new Set()) => {
    const key = `${itemId}-${portId}-${side}`;
    // Evita loops infinitos (ex: A liga em B, B liga em A)
    if (visited.has(key)) return [];
    visited.add(key);

    const item = items.find(i => i.id === itemId);
    if (!item) return [];

    const uniqueKey = `${itemId}-${portId}`;
    const config = signalConfigs[uniqueKey];

    // 1. Recupera sinais criados manualmente nesta porta (Local)
    let localSignals = [];
    let allowedIds = null;

    if (config) {
        if (typeof config === 'string') {
            localSignals = [{ id: 'legacy-' + uniqueKey, name: config }];
        }
        else {
            localSignals = config.local || [];
            allowedIds = config.allowed || null;
        }
    }

    // 2. Identifica de onde vêm os sinais (Fontes / Upstream)
    let sources = [];

    if (item.type === 'DIO') {
        if (side === 'BACK') {
            // O lado de trás apenas reflete o da frente (passagem direta interna)
            return getSignalInfo(items, connections, portLabels, signalConfigs, itemId, portId, 'FRONT', visited);
        } else {
            // Lado da FRENTE: Recebe sinal da conexão frontal E da conexão traseira (passagem)
            const frontConn = findConnection(connections, itemId, portId, 'FRONT');
            if (frontConn) sources.push(frontConn);

            const backConn = findConnection(connections, itemId, portId, 'BACK');
            if (backConn) sources.push(backConn);
        }
    }
    else if (item.type === 'POE') {
        if (side === 'LAN') {
            // Lado LAN reflete o lado POE (passagem interna)
            return getSignalInfo(items, connections, portLabels, signalConfigs, itemId, portId, 'POE', visited);
        } else {
            // Lado POE: Recebe sinal de ambas as conexões (POE e LAN)
            const poeConn = findConnection(connections, itemId, portId, 'POE');
            if (poeConn) sources.push(poeConn);

            const lanConn = findConnection(connections, itemId, portId, 'LAN');
            if (lanConn) sources.push(lanConn);
        }
    }
    else if (item.type === 'SPLITTER') {
        if (portId !== 0 && portId !== '0') {
            // Saídas (1-8): recebem sinal da entrada (porta 0)
            const inputConn = findConnection(connections, itemId, 0, 'A');
            if (inputConn) sources.push(inputConn);
        }
        else {
            // Entrada (0): recebe sinal da conexão externa nela mesma
            const c = findConnection(connections, itemId, portId, 'A');
            if (c) sources.push(c);
        }
    }
    else if (item.type === 'CABLE') {
        // Cabo é bidirecional.
        // O sinal nesta fibra é a soma do que entra por ESTE lado + o que vem do OUTRO lado.

        // Fonte 1: Conexão direta neste lado (ex: OLT ligada aqui)
        const c1 = findConnection(connections, itemId, portId, side);
        if (c1) sources.push(c1);

        // Fonte 2: Conexão do outro lado (passando por dentro da fibra)
        const otherSide = side === 'A' ? 'B' : 'A';
        const c2 = findConnection(connections, itemId, portId, otherSide);
        if (c2) sources.push(c2);
    }
    else {
        // Outros equipamentos (OLT, Switch, Cliente): sinal vem da conexão direta na porta
        const c = findConnection(connections, itemId, portId, side);
        if (c) sources.push(c);
    }

    // 3. Processa recursivamente todas as fontes encontradas
    let upstreamSignals = [];
    sources.forEach(conn => {
        const isT = conn.toId === itemId;
        // Pega recursivamente os sinais do item vizinho
        const s = getSignalInfo(items, connections, portLabels, signalConfigs, isT ? conn.fromId : conn.toId, isT ? conn.fromPort : conn.toPort, isT ? conn.fromSide : conn.toSide, visited);
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
//==================================================//



// Cálculo de potencia ============================//
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
        else if (item.type === 'POE') {
            // POE Patch Panel: LAN reflete POE (passagem interna)
            if (side === 'POE') upstreamConn = findConnection(connections, itemId, portId, 'POE');
            else if (side === 'LAN') return calculatePower(items, connections, itemId, portId, 'POE', visited);
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
//=================================================//



// Escapa caracteres especiais XML para evitar que quebrem o arquivo KML
const escapeXML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

// EXPORTAÇÃO KML =================================//
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
    let text = `=== MAPA DE SINAIS ===\n\n`;

    for (let i = 0; i < cable.ports; i++) {
        // Pega o sinal (Lado A é suficiente para verificar o que passa na fibra)
        const signals = getSignalInfo(allItems, connections, {}, signalConfigs, cable.id, i, 'A');
        const signalText = signals.length > 0
            ? signals.map(s => s.name).join(', ')
            : 'Livre';

        text += `[FO ${i + 1}]: ${signalText}\n`;
    }

    if (cable.notes) {
        text += `\n=== ANOTAÇÕES ===\n`;
        text += `${cable.notes}\n`;
    }

    return `<![CDATA[${escapeXML(text.trim())}]]>`; // CDATA evita problemas com caracteres especiais
};
// 2. Gera o Plano de Fusão do Nó (O que conecta com o que)
const generateNodeDescription = (node, allItems, connections, signalConfigs) => {
    // Encontra todos os cabos conectados a este nó (externamente)
    const attachedCables = allItems.filter(i =>
        i.type === 'CABLE' && (i.fromNode === node.id || i.toNode === node.id)
    );

    let text = ``;

    // Se não tiver cabos, retorna descrição básica
    if (attachedCables.length === 0) {
        text += `Tipo: ${node.type}\nSem cabos conectados.\n\n`;
    } else {
        text += `=== PLANO DE FUSÃO ===\n\n`;

        // Para cada cabo conectado a esta caixa...
        attachedCables.forEach(cable => {
            // Descobre qual lado do cabo entra nesta caixa (A ou B)
            const mySide = cable.fromNode === node.id ? 'A' : 'B';

            text += `--- Cabo: ${cable.name || 'Sem nome'} (Lado ${mySide}) ---\n`;

            for (let i = 0; i < cable.ports; i++) {
                // Busca o que está conectado nesta fibra, deste lado (mySide)
                const conn = findConnection(connections, cable.id, i, mySide);

                // Busca o sinal que passa aqui
                const signals = getSignalInfo(allItems, connections, {}, signalConfigs, cable.id, i, mySide);
                const signalText = signals.length > 0
                    ? signals.map(s => s.name).join(', ')
                    : '-';

                let destText = 'Livre';

                if (conn) {
                    // Identifica o destino
                    const targetId = conn.toId === cable.id ? conn.fromId : conn.toId;
                    let targetItem = allItems.find(x => x.id === targetId);
                    const targetPort = conn.toId === cable.id ? conn.fromPort : conn.toPort;

                    if (targetItem) {
                        let targetName = targetItem.name || 'Sem nome';
                        let targetDetail = '';

                        if (targetItem.type === 'CABLE') {
                            targetDetail = `(Fibra ${parseInt(targetPort) + 1})`;
                            destText = `${targetName} ${targetDetail}`;
                        }
                        else if (targetItem.type === 'SPLITTER') {
                            targetDetail = (targetPort === 0 || targetPort === '0') ? '(IN)' : `(OUT ${targetPort})`;
                            destText = `Splitter: ${targetName} ${targetDetail}`;
                        }
                        else if (targetItem.type === 'DIO' || targetItem.type === 'OLT') {
                            destText = `${targetItem.type}: ${targetName} (Porta ${parseInt(targetPort) + 1})`;
                        }
                        else {
                            destText = `${targetName}`;
                        }
                    }
                }

                text += `[FO ${i + 1}] -> ${destText} | Sinal: ${signalText}\n`;
            }
            text += `\n`;
        });
    }

    if (node.notes) {
        text += `=== ANOTAÇÕES ===\n`;
        text += `${node.notes}\n`;
    }

    return `<![CDATA[${escapeXML(text.trim())}]]>`;
};
// 2. Retorna o ícone KML específico com base no tipo e iconType
const getNodeKmlIcon = (node) => {
    switch (node.type) {
        case 'POP': return 'http://maps.google.com/mapfiles/kml/shapes/target.png';
        case 'CEO': return 'http://maps.google.com/mapfiles/kml/shapes/triangle.png';
        case 'CTO': return 'http://maps.google.com/mapfiles/kml/shapes/donut.png';
        case 'TOWER': return 'http://maps.google.com/mapfiles/kml/paddle/wht-diamond.png';
        case 'POST': return 'http://maps.google.com/mapfiles/kml/shapes/placemark_square.png';
        case 'OBJECT':
            switch (node.iconType) {
                case 'MapPin': return 'http://maps.google.com/mapfiles/kml/pushpin/wht-pushpin.png';
                case 'Home': return 'http://maps.google.com/mapfiles/kml/shapes/homegardenbusiness.png';
                case 'Shell': return 'http://maps.google.com/mapfiles/kml/shapes/square.png';
                case 'Diamond': return 'http://maps.google.com/mapfiles/kml/shapes/open-diamond.png';
                default: return 'http://maps.google.com/mapfiles/kml/pushpin/wht-pushpin.png';
            }
        default: return 'http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png';
    }
};

// 3. Função Principal de Download
export const downloadKML = async (selectedProjects, data, signalConfigs) => {
    if (!selectedProjects || selectedProjects.length === 0) return false;

    const { items, connections } = data;

    // Imports feitos uma vez fora do loop
    const { getDocs, getDoc, query, collection, doc } = await import('firebase/firestore');
    const { db } = await import('../config/firebaseConfig');

    for (const project of selectedProjects) {
        try {
            const projectPath = `artifacts/ftth-production/users/${project.ownerId}/projects/${project.id}`;

            // Busca itens do projeto — usa memória se disponível, senão vai ao Firestore
            let projectItems = items.filter(i => i._projectId === project.id);
            let projectConnections = connections.filter(c => c._projectId === project.id);

            if (projectItems.length === 0) {
                const itemsSnap = await getDocs(query(collection(db, `${projectPath}/items`)));
                projectItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data(), _projectId: project.id, _ownerId: project.ownerId }));

                const connSnap = await getDocs(query(collection(db, `${projectPath}/connections`)));
                projectConnections = connSnap.docs.map(d => ({ id: d.id, ...d.data(), _projectId: project.id, _ownerId: project.ownerId }));
            }

            // Sempre busca os sinais do próprio projeto no Firestore para garantir que as
            // configurações de sinal reflitam este projeto, independente do que está no state global
            let projectSignalConfigs = signalConfigs || {};
            try {
                const signalsDoc = await getDoc(doc(db, `${projectPath}/settings`, 'signals'));
                if (signalsDoc.exists()) {
                    projectSignalConfigs = signalsDoc.data();
                }
            } catch (e) {
                console.warn(`Não foi possível buscar sinais do projeto ${project.name}. Usando estado global.`, e);
            }

            // Separa nós e cabos
            const areas = projectItems.filter(i => i.type === 'AREA');
            const nodes = projectItems.filter(i => !i.parentId && i.type !== 'CABLE' && i.type !== 'AREA');
            const cables = projectItems.filter(i => i.type === 'CABLE');

            // Monta o KML do projeto
            let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        <name>${escapeXML(project.name)}</name>
        <description>Exportado do FTTH Manager Cloud</description>`;

            // --- PONTOS (Caixas / Clientes) ---
            nodes.forEach(node => {
                if (node.lat && node.lng) {
                    const color = hexToKmlColor(node.color || '#ffffff');
                    const description = generateNodeDescription(node, projectItems, projectConnections, projectSignalConfigs);
                    const iconUrl = getNodeKmlIcon(node);
                    kmlContent += `
        <Placemark>
            <name>${escapeXML(node.name || '')}</name>
            <description>${description}</description>
            <Style>
                <IconStyle>
                    <color>${color}</color>
                    <scale>1.1</scale>
                    <Icon>
                        <href>${iconUrl}</href>
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

            // --- ÁREAS (Polígonos) ---
            areas.forEach(area => {
                if (area.positions && area.positions.length >= 3) {
                    const strokeColor = hexToKmlColor(area.color || '#3b82f6');
                    const fillColor = hexToKmlColor(area.fillColor || '#3b82f6');

                    const opacityHex = Math.round((area.fillOpacity || 40) * 2.55).toString(16).padStart(2, '0');
                    const strokeOpacityHex = Math.round((area.colorOpacity != null ? area.colorOpacity : 100) * 2.55).toString(16).padStart(2, '0');
                    const kmlFillColor = opacityHex + fillColor.substring(2);
                    const kmlStrokeColor = strokeOpacityHex + strokeColor.substring(2);

                    let coordsString = '';
                    area.positions.forEach(p => {
                        const lat = Array.isArray(p) ? p[0] : p.lat;
                        const lng = Array.isArray(p) ? p[1] : p.lng;
                        coordsString += `${lng},${lat},0 `;
                    });
                    const firstLat = Array.isArray(area.positions[0]) ? area.positions[0][0] : area.positions[0].lat;
                    const firstLng = Array.isArray(area.positions[0]) ? area.positions[0][1] : area.positions[0].lng;
                    coordsString += `${firstLng},${firstLat},0`;

                    kmlContent += `
        <Placemark>
            <name>${escapeXML(area.name || 'Área')}</name>
            <description>${escapeXML(area.notes || '')}</description>
            <Style>
                <LineStyle>
                    <color>${kmlStrokeColor}</color>
                    <width>2</width>
                </LineStyle>
                <PolyStyle>
                    <color>${kmlFillColor}</color>
                    <fill>1</fill>
                    <outline>1</outline>
                </PolyStyle>
            </Style>
            <Polygon>
                <tessellate>1</tessellate>
                <outerBoundaryIs>
                    <LinearRing>
                        <coordinates>${coordsString}</coordinates>
                    </LinearRing>
                </outerBoundaryIs>
            </Polygon>
        </Placemark>`;
                }
            });

            // --- LINHAS (Cabos) ---
            cables.forEach(cable => {
                const nodeA = nodes.find(n => n.id === cable.fromNode);
                const nodeB = nodes.find(n => n.id === cable.toNode);

                if (nodeA && nodeB && nodeA.lat && nodeB.lat) {
                    const strokeColor = hexToKmlColor(cable.color || '#000000');
                    const description = generateCableDescription(cable, projectItems, projectConnections, projectSignalConfigs);

                    let coordsString = `${nodeA.lng},${nodeA.lat},0`;
                    if (cable.waypoints && cable.waypoints.length > 0) {
                        cable.waypoints.forEach(wp => { coordsString += ` ${wp.lng},${wp.lat},0`; });
                    }
                    coordsString += ` ${nodeB.lng},${nodeB.lat},0`;

                    kmlContent += `
        <Placemark>
            <name>${escapeXML(cable.name || 'Cabo')}</name>
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

            // Dispara o download individual ou compartilha nativamente
            const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
            const safeName = project.name.replace(/[^a-z0-9à-ú ]/gi, '_');

            await saveFile(blob, `${safeName}.kml`);

        } catch (error) {
            console.error(`Erro ao gerar KML do projeto ${project.name}:`, error);
        }
    }

    return true;
};
//=================================================//


// IMPORTAÇÃO KML =================================//
// Converte cor KML (aabbggrr) para Hex Web (#rrggbb)
const kmlColorToHex = (kmlColor) => {
    if (!kmlColor) return '#000000';
    let c = kmlColor.trim();

    if (c.length === 8) {
        const blue = c.substring(2, 4);
        const green = c.substring(4, 6);
        const red = c.substring(6, 8);
        return `#${red}${green}${blue}`;
    } else if (c.length === 6) {
        const blue = c.substring(0, 2);
        const green = c.substring(2, 4);
        const red = c.substring(4, 6);
        return `#${red}${green}${blue}`;
    }
    return '#000000';
};
const kmlColorToHexAndOpacity = (kmlColor) => {
    if (!kmlColor) return { hex: '#000000', opacity: 100 };
    let c = kmlColor.trim();
    if (c.length === 8) {
        const alphaHex = c.substring(0, 2);
        const blue = c.substring(2, 4);
        const green = c.substring(4, 6);
        const red = c.substring(6, 8);
        return {
            hex: `#${red}${green}${blue}`,
            opacity: Math.round(parseInt(alphaHex, 16) / 2.55) || 100
        };
    } else if (c.length === 6) {
        const blue = c.substring(0, 2);
        const green = c.substring(2, 4);
        const red = c.substring(4, 6);
        return { hex: `#${red}${green}${blue}`, opacity: 100 };
    }
    return { hex: '#000000', opacity: 100 };
};
// 1. Função que tenta adivinhar o tipo do item pelo nome
const guessTypeByName = (name) => {
    const n = name.toUpperCase();
    if (n.includes('CTO') || n.includes('ATENDIMENTO')) return 'CTO';
    if (n.includes('CEO') || n.includes('EMENDA')) return 'CEO';
    if (n.includes('POP') || n.includes('OLT') || n.includes('DATA CENTER')) return 'POP';
    if (n.includes('CLIENTE') || n.includes('CASA')) return 'CLIENT';
    if (n.includes('TORRE') || n.includes('BASE')) return 'TOWER';
    if (n.includes('POSTE') || n.includes('POSTEAMENTO')) return 'POST';
    return 'OBJECT';
};
// 2. Função principal de processamento do texto KML
export const parseKMLImport = (kmlText) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, "text/xml");

    const styleMap = {};
    const polyStyleMap = {};
    const lineStyleMap = {};

    // 1. MAPEAMENTO DE ESTILOS
    const styles = xmlDoc.getElementsByTagName("Style");
    for (let i = 0; i < styles.length; i++) {
        const style = styles[i];
        const id = style.getAttribute("id");
        if (id) {
            // Tenta pegar a cor da linha (Cabos)
            const lineStyle = style.getElementsByTagName("LineStyle")[0];
            const lineColor = lineStyle?.getElementsByTagName("color")[0]?.textContent;

            // Tenta pegar a cor do ícone (Nós/Caixas)
            const iconStyle = style.getElementsByTagName("IconStyle")[0];
            const iconColor = iconStyle?.getElementsByTagName("color")[0]?.textContent;

            // Tenta pegar a cor do polígono (Preenchimento)
            const polyStyle = style.getElementsByTagName("PolyStyle")[0];
            const polyColor = polyStyle?.getElementsByTagName("color")[0]?.textContent;

            // Define a cor a ser usada (prioriza a cor do ícone, depois a da linha)
            const colorToUse = iconColor || lineColor;

            if (colorToUse) {
                styleMap[`#${id}`] = kmlColorToHex(colorToUse.trim());
            }
            if (polyColor) {
                polyStyleMap[`#${id}`] = polyColor.trim();
            }
            if (lineColor) {
                lineStyleMap[`#${id}`] = lineColor.trim();
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
            if (targetStyleUrl) {
                if (styleMap[targetStyleUrl]) styleMap[`#${id}`] = styleMap[targetStyleUrl];
                if (polyStyleMap[targetStyleUrl]) polyStyleMap[`#${id}`] = polyStyleMap[targetStyleUrl];
                if (lineStyleMap[targetStyleUrl]) lineStyleMap[`#${id}`] = lineStyleMap[targetStyleUrl];
            }
        }
    }

    // 2. TRAVESSIA RECURSIVA OTIMIZADA (Sem lógica de pastas)
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    const rawPoints = [];
    const rawLines = [];
    const rawAreas = [];

    const getTextByTagName = (parent, tagName) => {
        let nodes = parent.getElementsByTagName(tagName);
        if (nodes.length === 0) nodes = parent.getElementsByTagNameNS("*", tagName);
        if (nodes.length === 0) {
            // Tenta achar ignorando prefixos manualmente caso o parser falhe
            const children = parent.children;
            for (let i = 0; i < children.length; i++) {
                const childName = (children[i].localName || children[i].nodeName || '').replace(/^.*:/, '').toLowerCase();
                if (childName === tagName.toLowerCase()) return children[i].textContent;
            }
        }
        return nodes.length > 0 ? nodes[0].textContent : "";
    };

    // O processPlacemark agora recebe as pastas (tags) onde ele se encontra
    const processPlacemark = (p, currentTags) => {
        const name = getTextByTagName(p, "name").trim() || "";
        const description = getTextByTagName(p, "description").trim() || "";

        let itemColor = null;
        const styleUrl = getTextByTagName(p, "styleUrl").trim();
        if (styleUrl && styleMap[styleUrl]) {
            itemColor = styleMap[styleUrl];
        }

        const inlineStyle = p.getElementsByTagName("Style")[0];
        if (inlineStyle) {
            const inlineLineColor = inlineStyle.getElementsByTagName("LineStyle")[0]?.getElementsByTagName("color")[0]?.textContent;
            const inlineIconColor = inlineStyle.getElementsByTagName("IconStyle")[0]?.getElementsByTagName("color")[0]?.textContent;

            const colorToUse = inlineIconColor || inlineLineColor;
            if (colorToUse) {
                itemColor = kmlColorToHex(colorToUse.trim());
            }
        }

        const point = p.getElementsByTagName("Point")[0];
        const line = p.getElementsByTagName("LineString")[0];

        if (point) {
            const coords = point.getElementsByTagName("coordinates")[0]?.textContent;
            if (coords) {
                const [lng, lat] = coords.trim().split(',').map(parseFloat);
                if (!isNaN(lat) && !isNaN(lng)) {
                    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
                    minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
                    rawPoints.push({ name, lat, lng, color: itemColor, notes: description, tempTags: currentTags });
                }
            }
        }
        else if (line) {
            const coordsStr = line.getElementsByTagName("coordinates")[0]?.textContent;
            if (coordsStr) {
                const points = coordsStr.trim().split(/\s+/).map(pair => {
                    const [lng, lat] = pair.split(',').map(parseFloat);
                    return { lat, lng };
                }).filter(p => !isNaN(p.lat));

                if (points.length > 1) {
                    rawLines.push({ name, points, color: itemColor, notes: description, tempTags: currentTags });
                }
            }
        }
        else {
            const polygon = p.getElementsByTagName("Polygon")[0];
            if (polygon) {
                const coordString = polygon.getElementsByTagName("coordinates")[0]?.textContent;
                if (coordString) {
                    const points = coordString.trim().split(/\s+/).map(c => {
                        const [lng, lat] = c.split(',').map(Number);
                        return { lat, lng };
                    }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));

                    if (points.length >= 3) {
                        let fillColor = itemColor || '#3b82f6';
                        let fillOpacity = 40;
                        let outlineColor = itemColor || '#3b82f6';
                        let colorOpacity = 100;

                        // Check if we mapped PolyStyle and LineStyle specifically
                        if (styleUrl && polyStyleMap[styleUrl]) {
                            const polyRes = kmlColorToHexAndOpacity(polyStyleMap[styleUrl]);
                            fillColor = polyRes.hex;
                            fillOpacity = polyRes.opacity;
                        }
                        if (styleUrl && lineStyleMap[styleUrl]) {
                            const lineRes = kmlColorToHexAndOpacity(lineStyleMap[styleUrl]);
                            outlineColor = lineRes.hex;
                            colorOpacity = lineRes.opacity;
                        }

                        if (inlineStyle) {
                            const polyStyle = inlineStyle.getElementsByTagName("PolyStyle")[0];
                            if (polyStyle) {
                                const polyColor = polyStyle.getElementsByTagName("color")[0]?.textContent;
                                if (polyColor) {
                                    const polyRes = kmlColorToHexAndOpacity(polyColor);
                                    fillColor = polyRes.hex;
                                    fillOpacity = polyRes.opacity;
                                }
                            }
                            const lineStyle = inlineStyle.getElementsByTagName("LineStyle")[0];
                            if (lineStyle) {
                                const lineColor = lineStyle.getElementsByTagName("color")[0]?.textContent;
                                if (lineColor) {
                                    const lineRes = kmlColorToHexAndOpacity(lineColor);
                                    outlineColor = lineRes.hex;
                                    colorOpacity = lineRes.opacity;
                                }
                            }
                        }

                        rawAreas.push({ name, positions: points, color: outlineColor, colorOpacity, fillColor, fillOpacity, notes: description, tempTags: currentTags });
                    }
                }
            }
        }
    };

    // Função de travessia inteligente que acumula os nomes das pastas
    const traverse = (node, pathTags = []) => {
        let nodeTags = [...pathTags];

        // Remove prefixos como 'kml:' para garantir compatibilidade com qualquer software gerador
        const cleanNodeName = (node.localName || node.nodeName || '').replace(/^.*:/, '');

        if (cleanNodeName === 'Folder') {
            // Busca o nome da pasta também ignorando prefixos
            const nameNode = Array.from(node.children).find(c => (c.localName || c.nodeName || '').replace(/^.*:/, '') === 'name');
            if (nameNode && nameNode.textContent) {
                const folderName = nameNode.textContent.trim().toUpperCase();
                if (folderName && !nodeTags.includes(folderName)) {
                    nodeTags.push(folderName);
                }
            }
        }

        if (cleanNodeName === 'Placemark') {
            processPlacemark(node, nodeTags);
        }

        // O loop varre todos os filhos sem se importar com o tipo restrito de tag
        for (let i = 0; i < node.children.length; i++) {
            traverse(node.children[i], nodeTags);
        }
    };

    traverse(xmlDoc.documentElement, []);

    // 3. GERAÇÃO DOS ITENS
    if (rawPoints.length === 0 && rawLines.length === 0 && rawAreas.length === 0) return [];

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
            notes: pt.notes,
            // Injeta a cor do KML ou força Branco se não existir
            color: pt.color || '#ffffff',
            _tempTagNames: pt.tempTags || [] // Mantém a lógica de tags importadas
        };
        createdNodes.push(newNode);
        newItems.push(newNode);
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
            notes: line.notes,
            _tempTagNames: line.tempTags || []
        });
    });

    // Áreas
    rawAreas.forEach((area, index) => {
        newItems.push({
            id: `imp_area_${Date.now()}_${index}`,
            type: 'AREA',
            name: area.name || `Área ${index}`,
            positions: area.positions,
            color: area.color || '#3b82f6',
            colorOpacity: area.colorOpacity !== undefined ? area.colorOpacity : 100,
            fillColor: area.fillColor || '#3b82f6',
            fillOpacity: area.fillOpacity !== undefined ? area.fillOpacity : 40,
            notes: area.notes,
            _tempTagNames: area.tempTags || []
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

        // 1. Verifica CABOS e ÁREAS (Pelo nome exato)
        if (newItem.type === 'CABLE' || newItem.type === 'AREA') {
            match = existingItems.find(existing =>
                existing.type === newItem.type &&
                newItem.name && existing.name &&
                String(newItem.name).trim() === String(existing.name).trim()
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
//==================================================//



// CÁLCULO DE DISTÂNCIA E METRIFICAÇÃO =============//
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
//==================================================//



// Função auxiliar para apagar imagens do Storage =//
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
//=================================================//

export const calculateCirclePositions = (center, radius, angle, direction) => {
    let finalPositions = [];
    const pointsCount = 64;
    const R = 6378137;
    const rLat = radius / R;
    const rLng = radius / (R * Math.cos(Math.PI * center.lat / 180));

    // Se o ângulo é menor que 360, incluímos o centro para fechar o "fatia de pizza"
    if (angle < 360) {
        finalPositions.push({ lat: center.lat, lng: center.lng });
    }

    const startCompassAngle = direction - (angle / 2);

    for (let i = 0; i <= (angle < 360 ? pointsCount : pointsCount - 1); i++) {
        const fraction = i / pointsCount;
        const currentCompassAngle = startCompassAngle + (fraction * angle);

        // Converte de "Compass Angle" (0=Norte) para trigonométrico (0=Leste)
        const theta = (90 - currentCompassAngle) * (Math.PI / 180);

        const ptLat = center.lat + (rLat * Math.sin(theta)) * (180 / Math.PI);
        const ptLng = center.lng + (rLng * Math.cos(theta)) * (180 / Math.PI);
        finalPositions.push({ lat: ptLat, lng: ptLng });
    }
    return finalPositions;
};