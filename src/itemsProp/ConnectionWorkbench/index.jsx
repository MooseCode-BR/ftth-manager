// Aba Conexões dentro do painel de detalhes de um nó. Mesa de fusão
// Preciso ajustar alguns CSSs ainda.

// IMPORTS --------------------------------------------------
import './styles.css';
import React, { useState, useRef, useEffect, memo, useCallback } from 'react'; //React
import { v4 as uuidv4 } from 'uuid'; //Gera uuid unicos

//Icones
import { X, ZoomIn, ZoomOut, ChevronDown, ChevronRight, Tag, Zap, Maximize2, Minimize2, ScanLine } from 'lucide-react';

import { ABNT_COLORS, ITEM_TYPES } from '../../constants'; //Importação de Constantes
import { findConnection, getSignalInfo } from '../../utils';
import AuditInfo from '../../components/AuditInfo';
// FIM IMPORTS --------------------------------------------------

// CANVAS (MESA DE FUSAO)--------------------------------------------------
const ConnectionWorkbench = ({ item, items, connections, portLabels, signalNames, saveConnection, deleteConnectionDB, onAlertRequest, saveItem, onFullscreenChange, onConfirmRequest }) => {

    const [dragLine, setDragLine] = useState(null);
    const [portPositions, setPortPositions] = useState({});
    const [hoveredPort, setHoveredPort] = useState(null);
    const [collapsedCards, setCollapsedCards] = useState(new Set());
    const [hoveredLineId, setHoveredLineId] = useState(null);
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [draggingNode, setDraggingNode] = useState(null);
    const [dragNodeStart, setDragNodeStart] = useState({ x: 0, y: 0 });
    const [showTags, setShowTags] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const isDarkMode = document.documentElement.classList.contains('dark');

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(f => {
            const next = !f;
            if (onFullscreenChange) onFullscreenChange(next);
            return next;
        });
    }, [onFullscreenChange]);

    // ─── Refs para drag fluído (sem setState em cada frame) ─────────────
    const dragNodeStartRef = useRef({ x: 0, y: 0 });
    // Posição acumulada DURANTE o drag (sem salvar no DB até soltar)
    const dragNodePosRef = useRef(null);

    const touchDistRef = useRef(0);
    const workbenchRef = useRef(null);
    const hasCenteredWorkbench = useRef(false);

    useEffect(() => {
        const devs = items.filter(i => i.parentId === item.id);
        const cabs = items.filter(i => (i.fromNode === item.id || i.toNode === item.id) && i.type === 'CABLE');

        devs.forEach((d, idx) => {
            if (d.x === undefined || d.y === undefined) {
                saveItem({ ...d, x: 50 + (idx % 3) * 250, y: 50 + Math.floor(idx / 3) * 300 });
            }
        });
        cabs.forEach((c, idx) => {
            const isSource = c.fromNode === item.id;
            const posKey = isSource ? 'localPosA' : 'localPosB';
            if (!c[posKey]) {
                saveItem({ ...c, [posKey]: { x: 50 + (idx * 150), y: 400 } });
            }
        });
    }, [item.id, items]);

    useEffect(() => {
        // Aguarda 350ms para garantir que todos os cards foram renderizados com altura real
        const t = setTimeout(() => {
            if (hasCenteredWorkbench.current) return;
            fitAllToScreen();
            hasCenteredWorkbench.current = true;
        }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleCard = (id) => { const newSet = new Set(collapsedCards); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setCollapsedCards(newSet); };

    // ─── Ajusta zoom e pan para que todos os itens couban na área visível ───
    const fitAllToScreen = () => {
        if (!workbenchRef.current) return;
        const container = workbenchRef.current;
        const containerRect = container.getBoundingClientRect();
        const nodes = container.querySelectorAll('[data-node-id]');
        if (nodes.length === 0) return;

        // Converte coords de tela para coords do canvas (espaço antes do transform)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(el => {
            const r = el.getBoundingClientRect();
            // A posição em canvas é: (screenPos - containerOrigin - pan) / scale
            const cx = (r.left - containerRect.left - pan.x) / scale;
            const cy = (r.top - containerRect.top - pan.y) / scale;
            const cw = r.width / scale;
            const ch = r.height / scale;
            if (cx < minX) minX = cx;
            if (cy < minY) minY = cy;
            if (cx + cw > maxX) maxX = cx + cw;
            if (cy + ch > maxY) maxY = cy + ch;
        });

        if (minX === Infinity) return;

        const PADDING = 48; // px de margem ao redor do conteúdo
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const contentW = maxX - minX;
        const contentH = maxY - minY;
        const scaleX = (cw - PADDING * 2) / Math.max(contentW, 1);
        const scaleY = (ch - PADDING * 2) / Math.max(contentH, 1);
        const newScale = Math.min(scaleX, scaleY, 2); // limita zoom máximo a 200%

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        setPan({ x: cw / 2 - centerX * newScale, y: ch / 2 - centerY * newScale });
        setScale(newScale);
    };

    const getPortKey = (itemId, portIndex, side) => `${itemId}-${portIndex}-${side}`;

    const getAllPorts = () => {
        const ports = [];
        const devs = items.filter(i => i.parentId === item.id);
        devs.forEach(d => {
            if (d.type === 'OLT') {
                for (let i = 0; i < (d.uplinkCount || 0); i++) {
                    const bIdx = `u-${i}`;
                    if (d.portConfigs?.[bIdx] === 'duplex') {
                        ports.push({ item: d, portIndex: `${bIdx}-TX`, side: 'A', label: `Uplink ${i + 1} TX`, isUplink: true });
                        ports.push({ item: d, portIndex: `${bIdx}-RX`, side: 'A', label: `Uplink ${i + 1} RX`, isUplink: true });
                    } else {
                        ports.push({ item: d, portIndex: bIdx, side: 'A', label: `Uplink ${i + 1}`, isUplink: true });
                    }
                }
                (d.interfaces || []).forEach((iface, idx) => {
                    for (let p = 0; p < iface.portCount; p++) {
                        const bIdx = `i-${idx}-p-${p}`;
                        if (d.portConfigs?.[bIdx] === 'duplex') {
                            ports.push({ item: d, portIndex: `${bIdx}-TX`, side: 'A', label: `${iface.name} PON ${p} TX` });
                            ports.push({ item: d, portIndex: `${bIdx}-RX`, side: 'A', label: `${iface.name} PON ${p} RX` });
                        } else {
                            ports.push({ item: d, portIndex: bIdx, side: 'A', label: `${iface.name} PON ${p}` });
                        }
                    }
                });
            } else if (d.type === 'DIO') {
                if (d.cards && d.cards.length > 0) {
                    d.cards.forEach((card, cIdx) => { for (let p = 0; p < card.portCount; p++) { ports.push({ item: d, portIndex: `c-${cIdx}-p-${p}`, side: 'FRONT', label: `C${cIdx + 1}-P${p + 1} F`, isPatchPanel: true, cardId: `dio-${d.id}-card-${cIdx}` }); ports.push({ item: d, portIndex: `c-${cIdx}-p-${p}`, side: 'BACK', label: `C${cIdx + 1}-P${p + 1} T`, cardId: `dio-${d.id}-card-${cIdx}` }); } });
                } else { for (let i = 0; i < d.ports; i++) { ports.push({ item: d, portIndex: i, side: 'FRONT', label: `Frente ${i + 1}`, isPatchPanel: true }); ports.push({ item: d, portIndex: i, side: 'BACK', label: `Trás ${i + 1}` }); } }
            } else if (d.type === 'SPLITTER') {
                ports.push({ item: d, portIndex: 0, side: 'A', label: 'ENTRADA', isInput: true }); for (let i = 1; i < d.ports; i++) ports.push({ item: d, portIndex: i, side: 'A', label: `Saída ${i}` });
            } else if (d.type === 'POE') {
                for (let i = 0; i < (d.ports || 1); i++) {
                    ports.push({ item: d, portIndex: i, side: 'POE', label: `POE ${i + 1}`, isPatchPanel: true });
                    ports.push({ item: d, portIndex: i, side: 'LAN', label: `LAN ${i + 1}` });
                }
            } else {
                for (let i = 0; i < (d.ports || 1); i++) {
                    if (d.portConfigs?.[i] === 'duplex') {
                        ports.push({ item: d, portIndex: `${i}-TX`, side: 'A', label: `Porta ${i + 1} TX` });
                        ports.push({ item: d, portIndex: `${i}-RX`, side: 'A', label: `Porta ${i + 1} RX` });
                    } else {
                        ports.push({ item: d, portIndex: i, side: 'A', label: `Porta ${i + 1}` });
                    }
                }
            }
        });
        const cabs = items.filter(i => (i.fromNode === item.id || i.toNode === item.id) && i.type === 'CABLE');
        cabs.forEach(c => { const side = c.fromNode === item.id ? 'A' : 'B'; for (let i = 0; i < c.ports; i++) { ports.push({ item: c, portIndex: i, side, label: `${c.name} - Fibra ${i + 1}`, color: ABNT_COLORS[i % 12], isCable: true, cableColor: c.color }); } });
        return ports;
    };

    const getClientPos = (e) => { if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY }; if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }; return { x: e.clientX, y: e.clientY }; };

    const handleMouseDownCanvas = (e) => { setIsDraggingCanvas(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); };

    const handleMouseDownNode = useCallback((e, nodeId, isCable = false, isSource = true) => {
        e.stopPropagation();
        setDraggingNode({ id: nodeId, isCable, isSource });
        dragNodeStartRef.current = { x: e.clientX, y: e.clientY };
        if (isCable) {
            const cab = items.find(i => i.id === nodeId);
            dragNodePosRef.current = cab ? (isSource ? (cab.localPosA || { x: 0, y: 0 }) : (cab.localPosB || { x: 0, y: 0 })) : { x: 0, y: 0 };
        } else {
            const dev = items.find(i => i.id === nodeId);
            dragNodePosRef.current = dev ? { x: dev.x || 0, y: dev.y || 0 } : { x: 0, y: 0 };
        }
    }, [items]);

    const handleTouchStartNode = useCallback((e, nodeId, isCable = false, isSource = true) => {
        e.stopPropagation();
        setDraggingNode({ id: nodeId, isCable, isSource });
        const pos = getClientPos(e);
        dragNodeStartRef.current = { x: pos.x, y: pos.y };
        if (isCable) {
            const cab = items.find(i => i.id === nodeId);
            dragNodePosRef.current = cab ? (isSource ? (cab.localPosA || { x: 0, y: 0 }) : (cab.localPosB || { x: 0, y: 0 })) : { x: 0, y: 0 };
        } else {
            const dev = items.find(i => i.id === nodeId);
            dragNodePosRef.current = dev ? { x: dev.x || 0, y: dev.y || 0 } : { x: 0, y: 0 };
        }
    }, [items]);

    const handleMouseMove = useCallback((e) => {
        if (isDraggingCanvas) {
            setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        } else if (draggingNode) {
            // Calcula nova posição sem salvar no DB
            const dx = (e.clientX - dragNodeStartRef.current.x) / scale;
            const dy = (e.clientY - dragNodeStartRef.current.y) / scale;
            const newPos = {
                x: dragNodePosRef.current.x + dx,
                y: dragNodePosRef.current.y + dy,
            };
            // Aplica translação direto no DOM (sem re-render)
            const nodeEl = workbenchRef.current?.querySelector(`[data-node-id="${draggingNode.id}"]`);
            if (nodeEl) {
                nodeEl.style.left = `${newPos.x}px`;
                nodeEl.style.top = `${newPos.y}px`;
            }
        }
    }, [isDraggingCanvas, draggingNode, dragStart, pan, scale]);

    const handleTouchStartCanvas = (e) => {
        if (e.touches && e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            if (touchDistRef.current !== undefined) touchDistRef.current = Math.sqrt(dx * dx + dy * dy);
            return;
        }
        if (e.target === e.currentTarget || e.target.tagName === 'svg') {
            setIsDraggingCanvas(true);
            const pos = getClientPos(e);
            setDragStart({ x: pos.x - pan.x, y: pos.y - pan.y });
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches && e.touches.length === 2 && touchDistRef.current) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDist = Math.sqrt(dx * dx + dy * dy);
            const oldDist = touchDistRef.current;
            if (oldDist < 10) return;
            const ratio = newDist / oldDist;
            const newScale = Math.min(Math.max(0.1, scale * ratio), 5);
            const rect = workbenchRef.current.getBoundingClientRect();
            const midX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            const midY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
            const scaleChange = newScale / scale;
            const newPanX = midX - (midX - pan.x) * scaleChange;
            const newPanY = midY - (midY - pan.y) * scaleChange;
            setScale(newScale);
            setPan({ x: newPanX, y: newPanY });
            touchDistRef.current = newDist;
            return;
        }
        const pos = getClientPos(e);
        if (isDraggingCanvas) {
            setPan({ x: pos.x - dragStart.x, y: pos.y - dragStart.y });
        }
        else if (draggingNode) {
            // Mesma lógica que o mouse: atualiza DOM diretamente
            const dx = (pos.x - dragNodeStartRef.current.x) / scale;
            const dy = (pos.y - dragNodeStartRef.current.y) / scale;
            const newPos = {
                x: dragNodePosRef.current.x + dx,
                y: dragNodePosRef.current.y + dy,
            };
            const nodeEl = workbenchRef.current?.querySelector(`[data-node-id="${draggingNode.id}"]`);
            if (nodeEl) {
                nodeEl.style.left = `${newPos.x}px`;
                nodeEl.style.top = `${newPos.y}px`;
            }
        }
    };

    const handleWheel = (e) => {
        const zoomIntensity = 0.001;
        const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomIntensity), 5);
        const rect = workbenchRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const scaleRatio = newScale / scale;
        const newPanX = mouseX - (mouseX - pan.x) * scaleRatio;
        const newPanY = mouseY - (mouseY - pan.y) * scaleRatio;
        setPan({ x: newPanX, y: newPanY });
        setScale(newScale);
    };

    // --- LÓGICA DE CONEXÃO REUTILIZÁVEL ---
    const attemptConnection = (sourcePort, targetPort) => {
        const targetKey = getPortKey(targetPort.item.id, targetPort.portIndex, targetPort.side);
        const startKey = getPortKey(sourcePort.item.id, sourcePort.portIndex, sourcePort.side);

        if (targetKey !== startKey) {
            const targetConn = findConnection(connections, targetPort.item.id, targetPort.portIndex, targetPort.side);
            if (targetConn) {
                onAlertRequest("Ocupada", "Porta de destino já está conectada.");
            } else {
                const sourceItem = sourcePort.item;
                const targetItem = targetPort.item;
                const type = (sourceItem.parentId === item.id && targetItem.parentId === item.id) ? 'PATCH' : 'FUSION';
                saveConnection({
                    id: Date.now().toString(),
                    type,
                    fromId: sourceItem.id,
                    fromPort: sourcePort.portIndex,
                    fromSide: sourcePort.side,
                    toId: targetItem.id,
                    toPort: targetPort.portIndex,
                    toSide: targetPort.side
                });
            }
        }
        setDragLine(null); // Reseta a linha ao final de qualquer tentativa
    };

    const handleMouseUp = useCallback((e) => {
        // Salva a posição final do node (apenas uma vez, no mouseUp)
        if (draggingNode) {
            const nodeEl = workbenchRef.current?.querySelector(`[data-node-id="${draggingNode.id}"]`);
            if (nodeEl) {
                const finalX = parseFloat(nodeEl.style.left) || 0;
                const finalY = parseFloat(nodeEl.style.top) || 0;
                if (draggingNode.isCable) {
                    const cab = items.find(i => i.id === draggingNode.id);
                    if (cab) {
                        const field = draggingNode.isSource ? 'localPosA' : 'localPosB';
                        saveItem({ ...cab, [field]: { x: finalX, y: finalY } });
                    }
                } else {
                    const dev = items.find(i => i.id === draggingNode.id);
                    if (dev) saveItem({ ...dev, x: finalX, y: finalY });
                }
            }
        }

        setIsDraggingCanvas(false);
        setDraggingNode(null);
    }, [draggingNode, items, saveItem]);

    const handleTouchEnd = (e) => {
        handleMouseUp(e);
    };

    const lastPortClick = useRef(0);

    const handlePortClick = (e, portInfo) => {
        // Permitimos propagação no onTouchStart mas paramos a continuação do mouseDown se houver (por segurança)
        e.stopPropagation();

        // Evita disparo duplo em smartphones (TouchStart seguido de MouseDown sintético)
        const now = Date.now();
        if (now - lastPortClick.current < 250) return;
        lastPortClick.current = now;

        const key = getPortKey(portInfo.item.id, portInfo.portIndex, portInfo.side);
        const conn = findConnection(connections, portInfo.item.id, portInfo.portIndex, portInfo.side);

        if (dragLine) {
            if (dragLine.startKey === key) {
                // Cancelar seleção clicando na mesma porta
                setDragLine(null);
            } else {
                if (conn) {
                    onAlertRequest("Ocupada", "Esta porta já está conectada. Desconecte primeiro para religar.");
                    return;
                }
                // Tenta conectar à nova porta clicada
                attemptConnection(dragLine.portInfo, portInfo);
            }
        } else {
            if (conn) {
                // Clicou numa porta conectada sem intenção de conectar outra fibra
                onConfirmRequest(
                    "Remover Conexão",
                    "Deseja realmente remover esta conexão?",
                    () => {
                        deleteConnectionDB(conn.id);
                        setDragLine(null); // Limpo a seleção ao confirmar
                    },
                    () => setDragLine(null) // Limpo a seleção ao cancelar
                );
            }
            // Verifica se a porta JÁ ESTÁ conectada E NÃO ESTÁ em modo de arrasto (dragLine)
            // Se já estiver conectada, abriu o modal ali em cima. NÃO SELECIONE a porta.
            if (!conn) {
                // SÓ SELECIONA a primeira porta se ELA NÃO ESTIVER CONECTADA
                const pos = portPositions[key];
                if (pos) {
                    setDragLine({ startKey: key, startX: pos.x, startY: pos.y, portInfo });
                }
            }
        }
    };

    useEffect(() => { let isMounted = true; const timer = setInterval(() => { if (!isMounted) return; if (workbenchRef.current) { const portElements = workbenchRef.current.querySelectorAll('[data-port-key]'); const containerRect = workbenchRef.current.getBoundingClientRect(); const newPositions = {}; portElements.forEach(el => { const key = el.getAttribute('data-port-key'); const rect = el.getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2; const canvasX = (centerX - containerRect.left - pan.x) / scale; const canvasY = (centerY - containerRect.top - pan.y) / scale; newPositions[key] = { x: canvasX, y: canvasY }; }); setPortPositions(newPositions); } }, 500); return () => { isMounted = false; clearInterval(timer); }; }, [items, connections, collapsedCards, pan, scale]);

    const allPorts = getAllPorts();

    const devs = items.filter(i => i.parentId === item.id);

    const cabs = items.filter(i => (i.fromNode === item.id || i.toNode === item.id) && i.type === 'CABLE');

    const getConnectionLines = () => { const lines = []; connections.forEach(conn => { if (collapsedCards.has(conn.fromId) || collapsedCards.has(conn.toId)) return; const checkCollapse = (itemId, portIndex) => { const portStr = String(portIndex); if (portStr.startsWith('c-')) { const cIdx = portStr.split('-')[1]; if (collapsedCards.has(`dio-${itemId}-card-${cIdx}`)) return true; } if (portStr.startsWith('u-')) { if (collapsedCards.has(`olt-${itemId}-uplinks`)) return true; } if (portStr.includes('-p-') && !portStr.startsWith('c-')) { const ifaceIdx = portStr.split('-')[1]; if (collapsedCards.has(`olt-${itemId}-iface-${ifaceIdx}`)) return true; } return false; }; if (checkCollapse(conn.fromId, conn.fromPort) || checkCollapse(conn.toId, conn.toPort)) return; const fromKey = getPortKey(conn.fromId, conn.fromPort, conn.fromSide); const toKey = getPortKey(conn.toId, conn.toPort, conn.toSide); const fromPos = portPositions[fromKey]; const toPos = portPositions[toKey]; const fromPortInfo = allPorts.find(p => getPortKey(p.item.id, p.portIndex, p.side) === fromKey); const toPortInfo = allPorts.find(p => getPortKey(p.item.id, p.portIndex, p.side) === toKey); if (fromPos && toPos) { const dx = toPos.x - fromPos.x; const dy = toPos.y - fromPos.y; let x1 = fromPos.x; let y1 = fromPos.y; let x2 = toPos.x; let y2 = toPos.y; const angle = Math.atan2(dy, dx); x1 += Math.cos(angle) * 12; y1 += Math.sin(angle) * 12; x2 -= Math.cos(angle) * 12; y2 -= Math.sin(angle) * 12; const midX = (x1 + x2) / 2; const isHovered = hoveredLineId === conn.id; const signalInfo = isHovered ? getSignalInfo(items, connections, portLabels, signalNames, conn.fromId, conn.fromPort, conn.fromSide) : []; lines.push({ id: conn.id, type: conn.type, x1, y1, x2, y2, d: `M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`, fromColor: fromPortInfo?.color?.hex || '#94a3b8', toColor: toPortInfo?.color?.hex || '#94a3b8', signals: signalInfo, createdBy: conn.createdBy, createdAt: conn.createdAt, modifiedBy: conn.modifiedBy, modifiedAt: conn.modifiedAt }); } }); return lines; };

    const getPortDisplay = (info) => {
        // Lógica Nova: Se for Duplex, mostramos TX ou RX
        if (typeof info.portIndex === 'string') {
            if (info.portIndex.endsWith('-TX')) return 'TX';
            if (info.portIndex.endsWith('-RX')) return 'RX';
        }

        if (info.item.type === 'SPLITTER') return info.isInput ? 'IN' : info.portIndex;
        if (info.item.type === 'OLT') {
            if (String(info.portIndex).startsWith('u-')) return 'U' + (parseInt(info.portIndex.split('-')[1]) + 1);
            if (String(info.portIndex).includes('-p-')) return parseInt(info.portIndex.split('-p-')[1]);
        }
        if (typeof info.portIndex === 'number') return info.portIndex + 1;
        if (typeof info.portIndex === 'string' && info.portIndex.includes('-p-')) {
            return parseInt(info.portIndex.split('-p-')[1]) + 1;
        }
        return '•';
    };
    const SignalLabel = ({ portInfo }) => {
        if (!showTags) return null;
        const isDIO = portInfo.item.type === 'DIO' || portInfo.item.name.includes('DIO');
        const isFrontSide = portInfo.side === 'FRONT';
        if (isDIO && isFrontSide) return null;
        const sigs = getSignalInfo(items, connections, portLabels, signalNames, portInfo.item.id, portInfo.portIndex, portInfo.side);
        if (sigs.length === 0) return null;
        const text = sigs.map(s => s.name).join(' | ');
        return (<div className="signal-label"> {text} </div>);
    };

    const PortCircle = ({ portInfo }) => {
        const key = getPortKey(portInfo.item.id, portInfo.portIndex, portInfo.side);
        const conn = findConnection(connections, portInfo.item.id, portInfo.portIndex, portInfo.side);
        const isConnected = !!conn;
        const isDragging = dragLine && dragLine.startKey === key;
        const isHovered = hoveredPort && getPortKey(hoveredPort.item.id, hoveredPort.portIndex, hoveredPort.side) === key;
        let bgColor = 'bg-gray-300 dark:bg-gray-600';
        if (portInfo.color) bgColor = portInfo.color.bg; else if (portInfo.isPatchPanel) bgColor = 'bg-yellow-400'; else if (portInfo.isInput) bgColor = 'bg-green-500'; else if (portInfo.isUplink) bgColor = 'bg-blue-500';

        return (
            <div className="port-wrapper">
                <div
                    data-port-key={key}
                    className={`
                        port-circle-base
                        ${isConnected ? 'port-connected' : 'port-idle'}
                        ${isDragging ? 'port-dragging cursor-crosshair ring-2 ring-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : ''}
                        ${bgColor} 
                        ${portInfo.color ? 'text-light' : 'text-dark'}
                    `}
                    onMouseDown={(e) => handlePortClick(e, portInfo)}
                    onTouchStart={(e) => handlePortClick(e, portInfo)}
                    onClick={(e) => e.stopPropagation()}
                    title={`${portInfo.label}${isConnected ? ' (Conectado)' : ''}`}
                >
                    {getPortDisplay(portInfo)}
                </div>
                <SignalLabel portInfo={portInfo} />
            </div>
        );
    };

    const renderLines = () => {
        const lines = getConnectionLines();
        const activeLine = hoveredLineId ? lines.find(l => l.id === hoveredLineId) : null;
        return (
            <>
                <defs>
                    {lines.map(line => (
                        <linearGradient key={`grad-${line.id}`} id={`grad-${line.id}`} gradientUnits="userSpaceOnUse" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}>
                            <stop offset="50%" stopColor={line.fromColor} />
                            <stop offset="50%" stopColor={line.toColor} />
                        </linearGradient>
                    ))
                    }
                </defs >

                {
                    lines.map(line => {
                        const isHovered = hoveredLineId === line.id;
                        return (
                            <g key={line.id}>
                                {/* Linha invisível grossa para facilitar o clique */}
                                <path
                                    d={line.d}
                                    className="connection-path-hitbox"
                                    strokeWidth="20"
                                    onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHoveredLineId(line.id); }}
                                    onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHoveredLineId(null); }}
                                    onClick={(e) => { e.stopPropagation(); setHoveredLineId(prev => prev === line.id ? null : line.id); }}
                                />
                                {/* Linha visível */}
                                <path
                                    d={line.d}
                                    fill="none"
                                    stroke={`url(#grad-${line.id})`}
                                    strokeWidth={isHovered ? "6" : "3"}
                                    className="connection-path-visible"
                                />
                            </g>
                        );
                    })
                }

                {/* Tooltip de Sinais da Linha Ativa */}
                {
                    activeLine && (
                        <g>
                            {(() => {
                                const midX = (activeLine.x1 + activeLine.x2) / 2;
                                const midY = (activeLine.y1 + activeLine.y2) / 2;
                                const hasSignals = activeLine.signals && activeLine.signals.length > 0;
                                const hasAudit = activeLine.createdBy || activeLine.createdAt;
                                const boxHeight = (hasSignals ? activeLine.signals.length * 20 + 20 : 0) + (hasAudit ? 80 : 0) + 10;
                                return (
                                    <foreignObject x={midX - 100} y={midY - (boxHeight / 2)} width="220" height={boxHeight + 10} style={{ pointerEvents: 'none', zIndex: 9999, overflow: 'visible' }}>
                                        <div className="line-tooltip-wrapper" style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHoveredLineId(activeLine.id); }}>
                                            <div className="line-tooltip-box">
                                                {hasSignals && activeLine.signals.map((s, i) => (
                                                    <div key={s.id || i} className="truncate max-w-[180px] text-center">{s.name}</div>
                                                ))}
                                                {hasAudit && (
                                                    <div style={{ borderTop: hasSignals ? '1px solid rgba(128,128,128,0.3)' : 'none', paddingTop: hasSignals ? 4 : 0, marginTop: hasSignals ? 4 : 0 }}>
                                                        <AuditInfo
                                                            createdBy={activeLine.createdBy}
                                                            createdAt={activeLine.createdAt}
                                                            modifiedBy={activeLine.modifiedBy}
                                                            modifiedAt={activeLine.modifiedAt}
                                                            mode="inline"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </foreignObject>
                                );
                            })()}
                        </g>
                    )
                }
            </>
        );
    };

    return (
        <div
            className="relative flex-1 overflow-hidden bg-[#ddd] dark:bg-[#222] cursor-move touch-none"
            ref={workbenchRef}
            onMouseDown={handleMouseDownCanvas}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStartCanvas}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            onClick={() => { if (dragLine) setDragLine(null); if (hoveredLineId) setHoveredLineId(null); }}
            style={{
                backgroundImage: isDarkMode ? 'radial-gradient(#333 1px, transparent 1px)' : 'radial-gradient(#bbb 1px, transparent 1px)',
                backgroundSize: `${20 * scale}px ${20 * scale}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
        >            <div className="absolute top-4 right-4 z-30 flex flex-col gap-1 bg-white dark:bg-gray-800 p-1 rounded shadow border dark:border-gray-700">
                <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Zoom In"><ZoomIn size={16} /></button>
                <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Zoom Out"><ZoomOut size={16} /></button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-0.5"></div>
                <button onClick={fitAllToScreen} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded" title="Encaixar tudo na tela (F4)"><ScanLine size={16} /></button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-0.5"></div>
                <button onClick={() => setShowTags(!showTags)} className={`p-1 rounded ${showTags ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`} title="Mostrar/Ocultar Sinais"><Tag size={16} /></button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-0.5"></div>
                <button
                    onClick={toggleFullscreen}
                    className={`p-1 rounded transition-colors ${isFullscreen ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                    title={isFullscreen ? 'Sair de tela cheia' : 'Tela cheia'}
                >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
            </div>
            <div className="w-full h-full origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
                <svg className="absolute top-0 left-0 overflow-visible z-30" style={{ width: 1, height: 1, pointerEvents: 'none' }}> {renderLines()} </svg>
                <div className="relative z-20">
                    {devs.map(d => {
                        const isCollapsed = collapsedCards.has(d.id);
                        const isDIO = d.type === 'DIO';
                        const isOLT = d.type === 'OLT';
                        const isPOE = d.type === 'POE';
                        const ports = allPorts.filter(p => p.item.id === d.id);
                        return (
                            <div
                                key={d.id}
                                data-node-id={d.id}
                                className={`absolute bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-md ${isDIO || isOLT || isPOE ? 'w-32' : 'w-20'}`}
                                style={{ left: d.x || 0, top: d.y || 0 }}
                            >
                                {/* Cabeçalho colorido por tipo de dispositivo */}
                                <div
                                    className="px-1 pt-1.5 pb-1 rounded-t-lg cursor-grab active:cursor-grabbing flex flex-col items-center justify-center gap-0.5"
                                    style={{ backgroundColor: ITEM_TYPES[d.type]?.defaultColor ? ITEM_TYPES[d.type].defaultColor + '22' : undefined }}
                                    onMouseDown={(e) => handleMouseDownNode(e, d.id)}
                                    onTouchStart={(e) => handleTouchStartNode(e, d.id)}
                                >
                                    <button onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={() => toggleCard(d.id)}
                                        style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.8))' }}
                                    >
                                        {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                    <span className="text-[10px] font-bold text-center break-words leading-tight select-none w-full" style={{ WebkitTextStroke: '0.4px black', textShadow: '0 0 3px rgba(0,0,0,0.5)' }}>{d.name}</span>
                                </div>
                                {!isCollapsed && (
                                    <div className="p-2 flex flex-col items-center gap-2">
                                        {isDIO && d.cards ? (d.cards.map((card, cIdx) => { const cardId = `dio-${d.id}-card-${cIdx}`; const isCardCollapsed = collapsedCards.has(cardId); return (<div key={cIdx} className="w-full border dark:border-gray-600 rounded mb-1"> <div className="bg-purple-100 dark:bg-purple-900/40 px-1 py-0.5 text-[8px] font-bold text-purple-800 dark:text-purple-200 text-center cursor-pointer flex justify-between items-center" onMouseDown={(e) => e.stopPropagation()} onClick={() => toggleCard(cardId)}> <span>{card.name}</span> {isCardCollapsed ? <ChevronRight size={8} /> : <ChevronDown size={8} />} </div> {!isCardCollapsed && (<div className="p-1 space-y-1"> {Array.from({ length: card.portCount }).map((_, i) => { const pStr = `c-${cIdx}-p-${i}`; const front = ports.find(p => p.side === 'FRONT' && p.portIndex === pStr); const back = ports.find(p => p.side === 'BACK' && p.portIndex === pStr); return (<div key={i} className="flex justify-between gap-2 w-full px-1 items-center"> {front && <PortCircle portInfo={front} />} <div className="flex-1 h-px border-t border-dashed border-gray-300 dark:border-gray-400 opacity-60"></div> {back && <PortCircle portInfo={back} />} </div>) })} </div>)} </div>) })) : isOLT ? (
                                            <div className="w-full flex flex-col gap-2">
                                                {d.uplinkCount > 0 && (<div className="w-full border dark:border-gray-600 rounded"> <div className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 text-[8px] font-bold text-blue-800 dark:text-blue-200 text-center flex justify-between items-center cursor-pointer" onMouseDown={(e) => e.stopPropagation()} onClick={() => toggleCard(`olt-${d.id}-uplinks`)}> <span>Uplinks</span> {collapsedCards.has(`olt-${d.id}-uplinks`) ? <ChevronRight size={8} /> : <ChevronDown size={8} />} </div> {!collapsedCards.has(`olt-${d.id}-uplinks`) && (<div className="p-1 flex flex-col items-center gap-1"> {Array.from({ length: d.uplinkCount }).map((_, i) => {
                                                    const pStr = `u-${i}`;
                                                    if (d.portConfigs?.[pStr] === 'duplex') {
                                                        const txPort = ports.find(p => p.portIndex === `${pStr}-TX`);
                                                        const rxPort = ports.find(p => p.portIndex === `${pStr}-RX`);
                                                        return (
                                                            <div key={i} className="flex flex-col items-center gap-1 border border-blue-300 dark:border-blue-700 rounded p-1 bg-blue-50/50 dark:bg-blue-900/20 w-full mb-1">
                                                                <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400">U{i + 1}</span>
                                                                <div className="flex gap-1 justify-center">
                                                                    {txPort && <PortCircle portInfo={txPort} />}
                                                                    {rxPort && <PortCircle portInfo={rxPort} />}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    const port = ports.find(p => p.portIndex === pStr);
                                                    return port && <PortCircle key={i} portInfo={port} />
                                                })} </div>)}
                                                </div>)}
                                                {d.interfaces?.map((iface, idx) => {
                                                    const ifaceId = `olt-${d.id}-iface-${idx}`; const isIfaceCollapsed = collapsedCards.has(ifaceId); return (<div key={idx} className="w-full border dark:border-gray-600 rounded mb-1"> <div className="bg-blue-50 dark:bg-blue-900/20 px-1 py-0.5 text-[8px] font-bold text-gray-600 dark:text-gray-300 text-center cursor-pointer flex justify-between items-center" onMouseDown={(e) => e.stopPropagation()} onClick={() => toggleCard(ifaceId)}> <span>{iface.name}</span> {isIfaceCollapsed ? <ChevronRight size={8} /> : <ChevronDown size={8} />} </div> {!isIfaceCollapsed && (<div className="p-1 flex flex-col items-center gap-1"> {Array.from({ length: iface.portCount }).map((_, p) => {
                                                        const pStr = `i-${idx}-p-${p}`;
                                                        if (d.portConfigs?.[pStr] === 'duplex') {
                                                            const txPort = ports.find(pt => pt.portIndex === `${pStr}-TX`);
                                                            const rxPort = ports.find(pt => pt.portIndex === `${pStr}-RX`);
                                                            return (
                                                                <div key={p} className="flex flex-col items-center gap-1 border border-blue-300 dark:border-blue-700 rounded p-1 bg-blue-50/50 dark:bg-blue-900/20 w-full mb-1">
                                                                    <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400">PON {p}</span>
                                                                    <div className="flex gap-1 justify-center">
                                                                        {txPort && <PortCircle portInfo={txPort} />}
                                                                        {rxPort && <PortCircle portInfo={rxPort} />}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        const port = ports.find(pt => pt.portIndex === pStr);
                                                        return port && <PortCircle key={p} portInfo={port} />
                                                    })} </div>)}
                                                    </div>)
                                                })}
                                            </div>
                                        ) : isDIO ? (Array.from({ length: d.ports }).map((_, i) => { const front = ports.find(p => p.side === 'FRONT' && p.portIndex === i); const back = ports.find(p => p.side === 'BACK' && p.portIndex === i); return (<div key={i} className="flex justify-between gap-2 w-full px-1 items-center"> {front && <PortCircle portInfo={front} />} <div className="flex-1 h-px border-t border-dashed border-gray-300 dark:border-gray-600 mx-1 opacity-50"></div> {back && <PortCircle portInfo={back} />} </div>) })) : isPOE ? (Array.from({ length: d.ports || 1 }).map((_, i) => { const poe = ports.find(p => p.side === 'POE' && p.portIndex === i); const lan = ports.find(p => p.side === 'LAN' && p.portIndex === i); return (<div key={i} className="flex justify-between gap-2 w-full px-1 items-center"> {poe && <PortCircle portInfo={poe} />} <div className="flex-1 h-px border-t border-dashed border-gray-300 dark:border-gray-600 mx-1 opacity-50"></div> {lan && <PortCircle portInfo={lan} />} </div>) })) : (Array.from({ length: d.ports || 1 }).map((_, i) => {
                                            if (d.portConfigs?.[i] === 'duplex') {
                                                const txPort = ports.find(p => p.portIndex === `${i}-TX`);
                                                const rxPort = ports.find(p => p.portIndex === `${i}-RX`);
                                                return (
                                                    <div key={i} className="flex flex-col items-center gap-1 border border-blue-300 dark:border-blue-700 rounded p-1 bg-blue-50/50 dark:bg-blue-900/20 w-full mb-1">
                                                        <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400">P{i + 1}</span>
                                                        <div className="flex gap-1 justify-center w-full px-1">
                                                            {txPort && <PortCircle portInfo={txPort} />}
                                                            {rxPort && <PortCircle portInfo={rxPort} />}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            const port = ports.find(p => p.portIndex === i);
                                            return port && <PortCircle key={i} portInfo={port} />;
                                        }))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {cabs.map(c => {
                        const isSource = c.fromNode === item.id;
                        const pos = isSource ? (c.localPosA || { x: 0, y: 0 }) : (c.localPosB || { x: 0, y: 0 });
                        const isCollapsed = collapsedCards.has(c.id);
                        const sidePorts = allPorts.filter(p => p.item.id === c.id && p.side === (isSource ? 'A' : 'B'));
                        // Usa a cor do cabo no cabeçalho
                        const cableHeaderBg = c.color || '#1e293b';
                        return (
                            <div
                                key={c.id}
                                data-node-id={c.id}
                                className="absolute bg-white dark:bg-gray-800 rounded-lg border-2 shadow-md w-20"
                                style={{ left: pos.x, top: pos.y, borderColor: cableHeaderBg }}
                            >
                                <div
                                    className="px-1 pt-1.5 pb-1 rounded-t cursor-grab active:cursor-grabbing flex flex-col items-center justify-center gap-0.5"
                                    style={{ backgroundColor: cableHeaderBg }}
                                    onMouseDown={(e) => handleMouseDownNode(e, c.id, true, isSource)}
                                    onTouchStart={(e) => handleTouchStartNode(e, c.id, true, isSource)}
                                >
                                    <button
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onClick={() => toggleCard(c.id)}
                                        className="text-white opacity-80"
                                        style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.9))' }}
                                    >{isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}</button>
                                    <span className="text-[10px] font-bold text-center break-words leading-tight select-none w-full text-white" style={{ WebkitTextStroke: '0.4px black', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{c.name} ({isSource ? 'A' : 'B'})</span>
                                </div>
                                {!isCollapsed && <div className="p-2 flex flex-col items-center gap-2">{sidePorts.map((p, i) => <PortCircle key={i} portInfo={p} />)}</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default memo(ConnectionWorkbench);