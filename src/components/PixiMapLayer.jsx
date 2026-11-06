import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import * as PIXI from 'pixi.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { ITEM_TYPES, ICON_MAP, OBJECT_ICONS } from '../config/constants';

const REF_ZOOM = 18;
const MAX_SEGMENTS_PER_BATCH = 800;
const CLUSTER_RADIUS_PX = 50;

// ============================================================================
// 1. ATLAS DINÂMICO COMPARTILHADO NA GPU (1 ÚNICO DRAW CALL PARA NÓS/CLUSTERS)
// ============================================================================
const ATLAS_DPR = 2;
const ATLAS_PHYSICAL_SIZE = 2048; // 1024x1024 lógico @ 2x DPR
const ATLAS_CELL_PHYSICAL = 96;   // 48x48 lógico (comporta ícones 32x32 e clusters 40x40 com folga anti-bleeding)
const ATLAS_COLS = Math.floor(ATLAS_PHYSICAL_SIZE / ATLAS_CELL_PHYSICAL); // 21x21 = 441 slots por página
const ATLAS_MAX_SLOTS = ATLAS_COLS * ATLAS_COLS;

const atlasPages = [];
const iconTextureCache = new Map();     // `${iconKey}_${color}` -> PIXI.Texture
const clusterTextureCache = new Map();  // count -> PIXI.Texture
const baseIconImageCache = new Map();   // iconKey -> HTMLImageElement (silhueta preta 44x44)
const pendingBaseIcons = new Set();     // iconKey atualmente decodificando
const failedBaseIcons = new Set();      // iconKey que falhou (evita loop infinito)
const textureReadyListeners = new Set();

let fallbackEmptyTexture = null;
let refreshRafId = null;

// Canvases temporários reutilizáveis para composição síncrona (zero GC)
let tintScratchCanvas = null;
let tintScratchCtx = null;

const ensureTintScratch = () => {
    if (!tintScratchCanvas) {
        tintScratchCanvas = document.createElement('canvas');
        tintScratchCanvas.width = 44;
        tintScratchCanvas.height = 44;
        tintScratchCtx = tintScratchCanvas.getContext('2d');
    }
    return { canvas: tintScratchCanvas, ctx: tintScratchCtx };
};

const createAtlasPage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_PHYSICAL_SIZE;
    canvas.height = ATLAS_PHYSICAL_SIZE;
    const ctx = canvas.getContext('2d');
    const baseTexture = new PIXI.BaseTexture(canvas, {
        scaleMode: PIXI.SCALE_MODES.LINEAR,
        resolution: ATLAS_DPR,
    });
    const page = {
        canvas,
        ctx,
        baseTexture,
        nextSlot: 0,
        dirty: false,
    };
    atlasPages.push(page);
    return page;
};

const allocateAtlasTexture = (logicalW, logicalH, drawFn) => {
    let page = atlasPages[atlasPages.length - 1];
    if (!page || page.nextSlot >= ATLAS_MAX_SLOTS) {
        page = createAtlasPage();
    }

    const slot = page.nextSlot++;
    const col = slot % ATLAS_COLS;
    const row = Math.floor(slot / ATLAS_COLS);

    const cellPxX = col * ATLAS_CELL_PHYSICAL;
    const cellPxY = row * ATLAS_CELL_PHYSICAL;
    const padPx = 4; // 2px lógicos de margem transparente contra sangramento de textura
    const drawPxX = cellPxX + padPx;
    const drawPxY = cellPxY + padPx;

    const { ctx } = page;
    ctx.clearRect(cellPxX, cellPxY, ATLAS_CELL_PHYSICAL, ATLAS_CELL_PHYSICAL);
    ctx.save();
    ctx.translate(drawPxX, drawPxY);
    ctx.scale(ATLAS_DPR, ATLAS_DPR);
    drawFn(ctx);
    ctx.restore();

    page.dirty = true;

    const frame = new PIXI.Rectangle(
        drawPxX / ATLAS_DPR,
        drawPxY / ATLAS_DPR,
        logicalW,
        logicalH
    );
    return new PIXI.Texture(page.baseTexture, frame);
};

// Envia todas as atualizações pendentes do Atlas para a VRAM de uma só vez antes do frame
const flushDirtyAtlases = () => {
    for (let i = 0; i < atlasPages.length; i++) {
        if (atlasPages[i].dirty) {
            atlasPages[i].baseTexture.update();
            atlasPages[i].dirty = false;
        }
    }
};

const getFallbackEmptyTexture = () => {
    if (!fallbackEmptyTexture) {
        fallbackEmptyTexture = allocateAtlasTexture(32, 32, () => {});
    }
    return fallbackEmptyTexture;
};

// Agrupa (coalesce) múltiplos carregamentos assíncronos de SVG em NO MÁXIMO 1 único render por frame
const scheduleGlobalTextureRefresh = () => {
    if (refreshRafId !== null) return;
    refreshRafId = requestAnimationFrame(() => {
        refreshRafId = null;
        textureReadyListeners.forEach((listener) => listener());
    });
};

// Inicia a decodificação única da silhueta vetorial de um tipo de ícone (independente da cor!)
const loadBaseIconSilhouette = (iconKey, IconComponent) => {
    if (
        baseIconImageCache.has(iconKey) ||
        pendingBaseIcons.has(iconKey) ||
        failedBaseIcons.has(iconKey)
    ) {
        return;
    }

    if (!IconComponent) {
        failedBaseIcons.add(iconKey);
        return;
    }

    pendingBaseIcons.add(iconKey);

    try {
        const rawSvg = renderToStaticMarkup(<IconComponent size={44} />);
        const withXmlns = rawSvg.includes('xmlns=')
            ? rawSvg
            : rawSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        const blackSvg = withXmlns.replace(/currentColor/g, '#000000');
        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(blackSvg)}`;

        const img = new Image();
        img.onload = () => {
            pendingBaseIcons.delete(iconKey);
            baseIconImageCache.set(iconKey, img);
            scheduleGlobalTextureRefresh();
        };
        img.onerror = () => {
            pendingBaseIcons.delete(iconKey);
            failedBaseIcons.add(iconKey);
            scheduleGlobalTextureRefresh();
        };
        img.src = dataUrl;
    } catch (err) {
        console.warn('[PixiMapLayer] Erro ao decodificar SVG base:', iconKey, err);
        pendingBaseIcons.delete(iconKey);
        failedBaseIcons.add(iconKey);
    }
};

// Pré-aquece todos os ícones padrão do sistema em segundo plano logo ao iniciar o módulo
let iconsPrewarmed = false;
const prewarmAllStandardIcons = () => {
    if (iconsPrewarmed || typeof window === 'undefined') return;
    iconsPrewarmed = true;

    Object.entries(ITEM_TYPES).forEach(([type, cfg]) => {
        if (cfg?.icon && (cfg.category === 'NODE' || type === 'OBJECT')) {
            loadBaseIconSilhouette(type, cfg.icon);
        }
    });

    if (Array.isArray(OBJECT_ICONS)) {
        OBJECT_ICONS.forEach((entry) => {
            if (entry?.id && entry?.icon) {
                loadBaseIconSilhouette(`OBJECT_${entry.id}`, entry.icon);
            }
        });
    }

    if (ICON_MAP.MapPin) {
        loadBaseIconSilhouette('FALLBACK_PIN', ICON_MAP.MapPin);
    }
};

if (typeof window !== 'undefined') {
    setTimeout(prewarmAllStandardIcons, 0);
}

// Resolve o par (iconKey, componente, cor) para qualquer nó do mapa
const resolveNodeVisualSpec = (item) => {
    const type = item.type;
    let IconComponent = ITEM_TYPES[type]?.icon;
    let iconKey = type;

    if (type === 'OBJECT' && item?.iconType && ICON_MAP[item.iconType]) {
        IconComponent = ICON_MAP[item.iconType];
        iconKey = `OBJECT_${item.iconType}`;
    }

    if (!IconComponent) {
        IconComponent = ICON_MAP.MapPin;
        iconKey = 'FALLBACK_PIN';
    }

    const color = (item.color || ITEM_TYPES[type]?.defaultColor || '#2563eb').toLowerCase();
    return { iconKey, IconComponent, color };
};

// Constrói sincronamente (0.05ms) a textura colorida + contorno preto sólido no Atlas compartilhado
const getOrCreateNodeTexture = (item) => {
    const { iconKey, IconComponent, color } = resolveNodeVisualSpec(item);
    const cacheKey = `${iconKey}_${color}`;

    const cached = iconTextureCache.get(cacheKey);
    if (cached) return cached;

    const baseBlackImg = baseIconImageCache.get(iconKey);
    if (!baseBlackImg) {
        if (failedBaseIcons.has(iconKey)) {
            // Fallback desenhado diretamente em Canvas caso algum SVG falhe
            const fallbackPin = allocateAtlasTexture(32, 32, (ctx) => {
                ctx.beginPath();
                ctx.arc(16, 16, 8, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#000000';
                ctx.stroke();
            });
            iconTextureCache.set(cacheKey, fallbackPin);
            return fallbackPin;
        }
        loadBaseIconSilhouette(iconKey, IconComponent);
        return getFallbackEmptyTexture();
    }

    // Tinge a silhueta vetorial 44x44 com a cor exata do item de forma 100% síncrona
    const { canvas: coloredCanvas, ctx: cCtx } = ensureTintScratch();
    cCtx.globalCompositeOperation = 'source-over';
    cCtx.clearRect(0, 0, 44, 44);
    cCtx.drawImage(baseBlackImg, 0, 0, 44, 44);
    cCtx.globalCompositeOperation = 'source-in';
    cCtx.fillStyle = color;
    cCtx.fillRect(0, 0, 44, 44);
    cCtx.globalCompositeOperation = 'source-over';

    const logicalSize = 32;
    const iconSize = 22;
    const baseOffset = (logicalSize - iconSize) / 2; // 5px
    const offsets = [
        [-0.65, -0.65],
        [0.65, -0.65],
        [-0.65, 1.0],
        [1.0, 1.0],
        [0, -0.65],
        [0, 1.0],
        [-0.65, 0],
        [1.0, 0],
    ];

    const texture = allocateAtlasTexture(logicalSize, logicalSize, (ctx) => {
        for (let i = 0; i < offsets.length; i++) {
            const [ox, oy] = offsets[i];
            ctx.drawImage(baseBlackImg, baseOffset + ox, baseOffset + oy, iconSize, iconSize);
        }
        ctx.drawImage(coloredCanvas, baseOffset, baseOffset, iconSize, iconSize);
    });

    iconTextureCache.set(cacheKey, texture);
    return texture;
};

// Constrói sincronamente a bolinha de Cluster no MESMO Atlas compartilhado (zero troca de textura na GPU)
const getOrCreateClusterTexture = (count) => {
    const cached = clusterTextureCache.get(count);
    if (cached) return cached;

    let outerColor = 'rgba(181, 226, 140, 0.6)';
    let innerColor = 'rgba(110, 204, 57, 0.85)';
    if (count >= 100) {
        outerColor = 'rgba(253, 156, 115, 0.6)';
        innerColor = 'rgba(241, 128, 23, 0.85)';
    } else if (count >= 10) {
        outerColor = 'rgba(241, 211, 87, 0.6)';
        innerColor = 'rgba(240, 194, 12, 0.85)';
    }

    const size = 40;
    const center = size / 2;

    const texture = allocateAtlasTexture(size, size, (ctx) => {
        ctx.beginPath();
        ctx.arc(center, center, 20, 0, Math.PI * 2);
        ctx.fillStyle = outerColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(center, center, 15, 0, Math.PI * 2);
        ctx.fillStyle = innerColor;
        ctx.fill();

        ctx.font = 'bold 12px "Segoe UI", Roboto, Arial, sans-serif';
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(count), center, center + 0.5);
    });

    clusterTextureCache.set(count, texture);
    return texture;
};

// ============================================================================
// 2. BITMAP FONT NA GPU PARA RÓTULOS DE TEXTO (ZERO CANVAS POR NÓ / 1 DRAW CALL)
// ============================================================================
const LABEL_FONT_NAME = 'FTTHMapLabelBitmapFont';
const NON_BITMAP_CHAR_REGEX = /[^\u0020-\u007E\u00A0-\u00FF–—•°ºª]/;
let bitmapFontInitialized = false;

const FALLBACK_TEXT_STYLE = new PIXI.TextStyle({
    fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
    fontSize: 12,
    fontWeight: 'bold',
    fill: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3,
    lineJoin: 'round',
    align: 'center',
});

const ensureLabelBitmapFont = () => {
    if (bitmapFontInitialized && PIXI.BitmapFont.available[LABEL_FONT_NAME]) {
        return;
    }
    PIXI.BitmapFont.from(
        LABEL_FONT_NAME,
        {
            fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
            fontSize: 12,
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            lineJoin: 'round',
        },
        {
            chars: [[' ', '~'], ['\u00A0', '\u00FF'], '–—•°ºª'],
            resolution: 2,
            textureWidth: 1024,
            textureHeight: 1024,
            padding: 4,
            skipKerning: true, // Evita 120.000 chamadas de measureText na criação da fonte
        }
    );
    bitmapFontInitialized = true;
};

const createOrUpdateLabelDisplayObject = (existingEntry, text) => {
    const needsFallbackText = NON_BITMAP_CHAR_REGEX.test(text);

    if (existingEntry && existingEntry.isFallback === needsFallbackText) {
        if (existingEntry.lastText !== text) {
            existingEntry.displayObject.text = text;
            existingEntry.lastText = text;
        }
        return existingEntry;
    }

    if (existingEntry) {
        if (existingEntry.displayObject.parent) {
            existingEntry.displayObject.parent.removeChild(existingEntry.displayObject);
        }
        existingEntry.displayObject.destroy();
    }

    let displayObject;
    if (needsFallbackText) {
        displayObject = new PIXI.Text(text, FALLBACK_TEXT_STYLE);
        displayObject.anchor.set(0.5, 0);
        displayObject.resolution = 2;
    } else {
        ensureLabelBitmapFont();
        displayObject = new PIXI.BitmapText(text, {
            fontName: LABEL_FONT_NAME,
            fontSize: 12,
            align: 'center',
        });
        displayObject.anchor.set(0.5, 0);
    }

    return {
        displayObject,
        isFallback: needsFallbackText,
        lastText: text,
        needsMount: true,
    };
};

// ============================================================================
// 3. UTILITÁRIOS MATEMÁTICOS
// ============================================================================
const parseHexColor = (hexStr, defaultColor = 0x334155) => {
    if (!hexStr || typeof hexStr !== 'string') return defaultColor;
    let clean = hexStr.trim().replace('#', '');
    if (clean.length === 3) {
        clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    const parsed = parseInt(clean, 16);
    return Number.isNaN(parsed) ? defaultColor : parsed;
};

const pointToSegmentDistSq = (px, py, x1, y1, x2, y2) => {
    let dx = x2 - x1;
    let dy = y2 - y1;
    if (dx !== 0 || dy !== 0) {
        const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
            x1 = x2;
            y1 = y2;
        } else if (t > 0) {
            x1 += dx * t;
            y1 += dy * t;
        }
    }
    dx = px - x1;
    dy = py - y1;
    return dx * dx + dy * dy;
};

// ============================================================================
// 4. COMPONENTE PRINCIPAL DA CAMADA WEBGL (PIXIJS + LEAFLET)
// ============================================================================
const PixiMapLayer = ({
    mapNodes,
    mapCables,
    nodePositionMap,
    selectedId,
    showLabels,
    toggleCluster,
    interactionMode,
    isPickingMode,
    cableStartNodeId,
    onSelectItem,
    onNodeClick,
    onOpen,
    setOverlappingMenu,
    setForcedCablePosition,
    setContextMenuPin,
    lastItemClickRef,
    pixiHitTestRef,
    pixiNodeHitTestRef,
}) => {
    const map = useMap();

    // Referências para o motor PixiJS e containers na GPU
    const pixiAppRef = useRef(null);
    const canvasRef = useRef(null);
    const cablesContainerRef = useRef(null);
    const spiderLegsGraphicsRef = useRef(null);
    const nodesContainerRef = useRef(null);
    const labelsContainerRef = useRef(null);

    // Pools de objetos PixiJS para reutilização com zero Garbage Collection
    const cableGraphicsPoolRef = useRef([]);
    const nodeSpritesMapRef = useRef(new Map());   // id -> PIXI.Sprite
    const labelEntriesMapRef = useRef(new Map());  // id -> { displayObject, isFallback, lastText }
    const clusterSpritesPoolRef = useRef([]);

    // Listas rápidas dos itens visíveis no frame anterior (evita iterar mapas inteiros p/ ocultar)
    const prevVisibleSpritesRef = useRef([]);
    const prevVisibleLabelsRef = useRef([]);
    const prevVisibleClusterCountRef = useRef(0);
    const lastCursorRef = useRef('');

    // Cache de geometria dos cabos na GPU (evita re-triangular cabos durante pan/rotação!)
    const builtCablesStateRef = useRef({
        dirty: true,
        zoom: -999,
        scale: 1,
        anchorWx: 0,
        anchorWy: 0,
        minWx: Infinity,
        maxWx: -Infinity,
        minWy: Infinity,
        maxWy: -Infinity,
        selectedId: null,
    });

    // Estado atual de transformação de tela <-> mundo (usado no hit-test O(1) de cabos)
    const viewTransformRef = useRef({
        originX: 0,
        originY: 0,
        scale: 1,
        cosB: 1,
        sinB: 0,
    });

    // Estado interno para animação CSS zoomanim e Spiderfy
    const drawnStateRef = useRef({
        topLeftLatLng: null,
        zoom: map.getZoom(),
    });
    const spiderfyStateRef = useRef(null);
    const renderedTargetsRef = useRef({
        nodes: [],
        clusters: [],
    });

    // Referência de coordenada global projetada no zoom 18
    const refOriginWorld = useMemo(() => {
        if (mapNodes.length > 0 && mapNodes[0].lat != null && mapNodes[0].lng != null) {
            const pt = map.project([mapNodes[0].lat, mapNodes[0].lng], REF_ZOOM);
            return { lat: mapNodes[0].lat, lng: mapNodes[0].lng, x: pt.x, y: pt.y };
        }
        const pt = map.project([0, 0], REF_ZOOM);
        return { lat: 0, lng: 0, x: pt.x, y: pt.y };
    }, [map, mapNodes.length > 0 ? mapNodes[0].id : null]); // eslint-disable-line react-hooks/exhaustive-deps

    // 1. Pré-projeta todos os nós no zoom 18 apenas quando mapNodes muda
    const projectedNodes = useMemo(() => {
        prewarmAllStandardIcons();
        const ox = refOriginWorld.x;
        const oy = refOriginWorld.y;
        return mapNodes.map((node) => {
            const lat = node.lat != null ? Number(node.lat) : 0;
            const lng = node.lng != null ? Number(node.lng) : 0;
            const pt = map.project([lat, lng], REF_ZOOM);
            return {
                node,
                id: node.id,
                lat,
                lng,
                wx: pt.x - ox,
                wy: pt.y - oy,
            };
        });
    }, [map, mapNodes, refOriginWorld]);

    // Remove sprites/rótulos órfãos quando nós saem da lista visível (troca de projeto ou exclusão)
    useEffect(() => {
        const activeIds = new Set();
        for (let i = 0; i < projectedNodes.length; i++) {
            activeIds.add(projectedNodes[i].id);
        }

        const spritesMap = nodeSpritesMapRef.current;
        spritesMap.forEach((sprite, id) => {
            if (!activeIds.has(id)) {
                if (sprite.parent) sprite.parent.removeChild(sprite);
                sprite.destroy();
                spritesMap.delete(id);
            }
        });

        const labelsMap = labelEntriesMapRef.current;
        labelsMap.forEach((entry, id) => {
            if (!activeIds.has(id)) {
                if (entry.displayObject.parent) {
                    entry.displayObject.parent.removeChild(entry.displayObject);
                }
                entry.displayObject.destroy();
                labelsMap.delete(id);
            }
        });
    }, [projectedNodes]);

    // 2. Pré-projeta todos os cabos e suas Bounding Boxes no zoom 18 apenas quando mapCables/nodePositionMap mudam
    const projectedCables = useMemo(() => {
        const ox = refOriginWorld.x;
        const oy = refOriginWorld.y;
        const result = [];

        for (let i = 0; i < mapCables.length; i++) {
            const cable = mapCables[i];
            const posA = nodePositionMap.get(cable.fromNode);
            const posB = nodePositionMap.get(cable.toNode);
            if (!posA || !posB) continue;

            const waypoints = cable.waypoints || [];
            const pts = [];
            let minWx = Infinity;
            let maxWx = -Infinity;
            let minWy = Infinity;
            let maxWy = -Infinity;

            const addPt = (lat, lng) => {
                const p = map.project([lat, lng], REF_ZOOM);
                const wx = p.x - ox;
                const wy = p.y - oy;
                if (wx < minWx) minWx = wx;
                if (wx > maxWx) maxWx = wx;
                if (wy < minWy) minWy = wy;
                if (wy > maxWy) maxWy = wy;
                pts.push({ wx, wy });
            };

            addPt(posA[0], posA[1]);
            for (let w = 0; w < waypoints.length; w++) {
                const wp = waypoints[w];
                if (wp && wp.lat != null && wp.lng != null) {
                    addPt(Number(wp.lat), Number(wp.lng));
                }
            }
            addPt(posB[0], posB[1]);

            result.push({
                cable,
                id: cable.id,
                colorHex: parseHexColor(cable.color, 0x334155),
                pts,
                minWx,
                maxWx,
                minWy,
                maxWy,
            });
        }

        builtCablesStateRef.current.dirty = true;
        return result;
    }, [map, mapCables, nodePositionMap, refOriginWorld]);

    // 3. Pré-calcula agrupamentos (Clusters) por faixa de zoom em coordenadas de mundo (grade O(N))
    const clusterCacheByZoomRef = useRef(new Map());
    useEffect(() => {
        clusterCacheByZoomRef.current.clear();
        spiderfyStateRef.current = null;
    }, [projectedNodes, toggleCluster]);

    const getClustersForZoom = useCallback(
        (intZoom) => {
            if (!toggleCluster) {
                return { singleNodes: projectedNodes, clusters: [] };
            }

            const cached = clusterCacheByZoomRef.current.get(intZoom);
            if (cached) return cached;

            const scaleAtIntZoom = Math.pow(2, intZoom - REF_ZOOM);
            const radiusWorld = CLUSTER_RADIUS_PX / scaleAtIntZoom;
            const radiusWorldSq = radiusWorld * radiusWorld;
            const cellSize = radiusWorld;

            const grid = new Map();
            const clustersList = [];

            for (let i = 0; i < projectedNodes.length; i++) {
                const pNode = projectedNodes[i];
                const gx = Math.floor(pNode.wx / cellSize);
                const gy = Math.floor(pNode.wy / cellSize);

                let bestCluster = null;
                let bestDistSq = radiusWorldSq;

                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const cellClusters = grid.get(`${gx + dx},${gy + dy}`);
                        if (!cellClusters) continue;
                        for (let c = 0; c < cellClusters.length; c++) {
                            const cl = cellClusters[c];
                            const dWx = pNode.wx - cl.wx;
                            const dWy = pNode.wy - cl.wy;
                            const dSq = dWx * dWx + dWy * dWy;
                            if (dSq <= bestDistSq) {
                                bestDistSq = dSq;
                                bestCluster = cl;
                            }
                        }
                    }
                }

                if (bestCluster) {
                    const n = bestCluster.items.length;
                    bestCluster.wx = (bestCluster.wx * n + pNode.wx) / (n + 1);
                    bestCluster.wy = (bestCluster.wy * n + pNode.wy) / (n + 1);
                    if (pNode.lat < bestCluster.minLat) bestCluster.minLat = pNode.lat;
                    if (pNode.lat > bestCluster.maxLat) bestCluster.maxLat = pNode.lat;
                    if (pNode.lng < bestCluster.minLng) bestCluster.minLng = pNode.lng;
                    if (pNode.lng > bestCluster.maxLng) bestCluster.maxLng = pNode.lng;
                    bestCluster.items.push(pNode);
                } else {
                    const newCluster = {
                        wx: pNode.wx,
                        wy: pNode.wy,
                        minLat: pNode.lat,
                        maxLat: pNode.lat,
                        minLng: pNode.lng,
                        maxLng: pNode.lng,
                        items: [pNode],
                    };
                    clustersList.push(newCluster);
                    const key = `${gx},${gy}`;
                    let bucket = grid.get(key);
                    if (!bucket) {
                        bucket = [];
                        grid.set(key, bucket);
                    }
                    bucket.push(newCluster);
                }
            }

            const singleNodes = [];
            const multiClusters = [];

            for (let i = 0; i < clustersList.length; i++) {
                const cl = clustersList[i];
                if (cl.items.length === 1) {
                    singleNodes.push(cl.items[0]);
                } else {
                    multiClusters.push(cl);
                }
            }

            const res = { singleNodes, clusters: multiClusters };
            clusterCacheByZoomRef.current.set(intZoom, res);
            return res;
        },
        [projectedNodes, toggleCluster]
    );

    const renderSceneRef = useRef(() => {});

    // 4. Função principal de renderização WebGL (ultra-rápida: < 0.5ms por frame)
    const renderScene = useCallback(
        (forceCableRebuild = false) => {
            const app = pixiAppRef.current;
            const canvas = canvasRef.current;
            if (!app || !canvas || !map) return;

            if (map._animatingZoom) return;

            const size = map.getSize();
            if (size.x <= 0 || size.y <= 0) return;

            if (
                app.renderer.width !== Math.round(size.x * app.renderer.resolution) ||
                app.renderer.height !== Math.round(size.y * app.renderer.resolution)
            ) {
                app.renderer.resize(size.x, size.y);
            }

            // Alinha o canvas exatamente ao topo-esquerdo da viewport visível dentro do norotatePane
            const mapPanePos = map._getMapPanePos();
            L.DomUtil.setTransform(canvas, mapPanePos.multiplyBy(-1), 1);

            drawnStateRef.current.topLeftLatLng = map.containerPointToLatLng([0, 0]);
            drawnStateRef.current.zoom = map.getZoom();

            const currentZoom = map.getZoom();
            const scale = map.getZoomScale(currentZoom, REF_ZOOM);
            const bearingRad = map._rotate ? map._bearing || 0 : 0;
            const cosB = Math.cos(bearingRad);
            const sinB = Math.sin(bearingRad);

            const pixelOrigin = map.getPixelOrigin();
            const refLayerPt = map
                .project([refOriginWorld.lat, refOriginWorld.lng], currentZoom)
                ._subtract(pixelOrigin);
            const refContainerPt = map.layerPointToContainerPoint(refLayerPt);
            const originX = refContainerPt.x;
            const originY = refContainerPt.y;

            viewTransformRef.current = { originX, originY, scale, cosB, sinB };

            // Calcula AABB do mundo visível na tela (com margem de 80px para ícones/rótulos nas bordas)
            const pad = 80;
            const cornersScreen = [
                [-pad, -pad],
                [size.x + pad, -pad],
                [size.x + pad, size.y + pad],
                [-pad, size.y + pad],
            ];
            let viewMinWx = Infinity;
            let viewMaxWx = -Infinity;
            let viewMinWy = Infinity;
            let viewMaxWy = -Infinity;

            for (let i = 0; i < 4; i++) {
                const sx = (cornersScreen[i][0] - originX) / scale;
                const sy = (cornersScreen[i][1] - originY) / scale;
                const wx = sx * cosB + sy * sinB;
                const wy = -sx * sinB + sy * cosB;
                if (wx < viewMinWx) viewMinWx = wx;
                if (wx > viewMaxWx) viewMaxWx = wx;
                if (wy < viewMinWy) viewMinWy = wy;
                if (wy > viewMaxWy) viewMaxWy = wy;
            }

            // =========================================================================
            // A. CABOS NA GPU (Transformação por Matriz Uniforme: ZERO rebuild no Pan/Rotate!)
            // =========================================================================
            const cablesContainer = cablesContainerRef.current;
            const builtState = builtCablesStateRef.current;

            const needsCableGeometryRebuild =
                forceCableRebuild ||
                builtState.dirty ||
                builtState.selectedId !== selectedId ||
                Math.abs(currentZoom - builtState.zoom) > 0.25 ||
                viewMinWx < builtState.minWx ||
                viewMaxWx > builtState.maxWx ||
                viewMinWy < builtState.minWy ||
                viewMaxWy > builtState.maxWy;

            if (needsCableGeometryRebuild) {
                const cablePool = cableGraphicsPoolRef.current;

                // Margem generosa ao redor da tela para que arrastar/girar o mapa não precise reconstruir cabos
                const marginWorld = (Math.max(size.x, size.y) * 0.85) / scale;
                const buildMinWx = viewMinWx - marginWorld;
                const buildMaxWx = viewMaxWx + marginWorld;
                const buildMinWy = viewMinWy - marginWorld;
                const buildMaxWy = viewMaxWy + marginWorld;

                // Âncora local no centro da tela p/ precisão Float32 sub-milimétrica em qualquer zoom
                const centerSx = (size.x * 0.5 - originX) / scale;
                const centerSy = (size.y * 0.5 - originY) / scale;
                const anchorWx = centerSx * cosB + centerSy * sinB;
                const anchorWy = -centerSx * sinB + centerSy * cosB;

                let batchIdx = 0;
                let segmentsInBatch = 0;
                let currentGraphics = null;

                const getNextCableGraphics = () => {
                    let g = cablePool[batchIdx];
                    if (!g) {
                        g = new PIXI.Graphics();
                        cablePool[batchIdx] = g;
                        cablesContainer.addChild(g);
                    }
                    g.visible = true;
                    g.clear();
                    batchIdx += 1;
                    return g;
                };

                for (let i = 0; i < projectedCables.length; i++) {
                    const pCable = projectedCables[i];
                    if (pCable.id === selectedId) continue;

                    if (
                        pCable.maxWx < buildMinWx ||
                        pCable.minWx > buildMaxWx ||
                        pCable.maxWy < buildMinWy ||
                        pCable.minWy > buildMaxWy
                    ) {
                        continue;
                    }

                    const pts = pCable.pts;
                    const segCount = pts.length - 1;
                    if (segCount <= 0) continue;

                    if (!currentGraphics || segmentsInBatch + segCount > MAX_SEGMENTS_PER_BATCH) {
                        currentGraphics = getNextCableGraphics();
                        segmentsInBatch = 0;
                    }
                    segmentsInBatch += segCount;

                    const x0 = (pts[0].wx - anchorWx) * scale;
                    const y0 = (pts[0].wy - anchorWy) * scale;

                    // 1. Contorno preto (weight: 6)
                    currentGraphics.lineStyle({
                        width: 6,
                        color: 0x000000,
                        alpha: 1,
                        cap: PIXI.LINE_CAP.ROUND,
                        join: PIXI.LINE_JOIN.ROUND,
                    });
                    currentGraphics.moveTo(x0, y0);
                    for (let j = 1; j < pts.length; j++) {
                        currentGraphics.lineTo(
                            (pts[j].wx - anchorWx) * scale,
                            (pts[j].wy - anchorWy) * scale
                        );
                    }

                    // 2. Preenchimento colorido (weight: 4)
                    currentGraphics.lineStyle({
                        width: 4,
                        color: pCable.colorHex,
                        alpha: 1,
                        cap: PIXI.LINE_CAP.ROUND,
                        join: PIXI.LINE_JOIN.ROUND,
                    });
                    currentGraphics.moveTo(x0, y0);
                    for (let j = 1; j < pts.length; j++) {
                        currentGraphics.lineTo(
                            (pts[j].wx - anchorWx) * scale,
                            (pts[j].wy - anchorWy) * scale
                        );
                    }
                }

                for (let i = batchIdx; i < cablePool.length; i++) {
                    cablePool[i].clear();
                    cablePool[i].visible = false;
                }

                builtState.dirty = false;
                builtState.zoom = currentZoom;
                builtState.scale = scale;
                builtState.anchorWx = anchorWx;
                builtState.anchorWy = anchorWy;
                builtState.minWx = buildMinWx;
                builtState.maxWx = buildMaxWx;
                builtState.minWy = buildMinWy;
                builtState.maxWy = buildMaxWy;
                builtState.selectedId = selectedId;
            }

            // Aplica translação, rotação e escala fina diretamente na matriz da GPU (0.001ms!)
            const anchorScreenX =
                (builtState.anchorWx * cosB - builtState.anchorWy * sinB) * scale + originX;
            const anchorScreenY =
                (builtState.anchorWx * sinB + builtState.anchorWy * cosB) * scale + originY;
            cablesContainer.position.set(anchorScreenX, anchorScreenY);
            cablesContainer.rotation = bearingRad;
            cablesContainer.scale.set(scale / builtState.scale);

            // =========================================================================
            // B. NÓS, RÓTULOS (BITMAPTEXT) E CLUSTERS NA GPU
            // =========================================================================
            const nodesContainer = nodesContainerRef.current;
            const labelsContainer = labelsContainerRef.current;
            const spiderLegsGraphics = spiderLegsGraphicsRef.current;
            const nodeSpritesMap = nodeSpritesMapRef.current;
            const labelEntriesMap = labelEntriesMapRef.current;
            const clusterPool = clusterSpritesPoolRef.current;

            spiderLegsGraphics.clear();

            // Oculta apenas os sprites e rótulos que estavam visíveis no frame anterior (O(visíveis))
            const prevSprites = prevVisibleSpritesRef.current;
            for (let i = 0; i < prevSprites.length; i++) {
                prevSprites[i].visible = false;
            }
            const nextVisibleSprites = [];

            const prevLabels = prevVisibleLabelsRef.current;
            for (let i = 0; i < prevLabels.length; i++) {
                prevLabels[i].visible = false;
            }
            const nextVisibleLabels = [];

            const prevClusterCount = prevVisibleClusterCountRef.current;
            for (let i = 0; i < prevClusterCount; i++) {
                if (clusterPool[i]) clusterPool[i].visible = false;
            }

            const intZoom = Math.floor(currentZoom);
            const { singleNodes, clusters } = getClustersForZoom(intZoom);
            const spiderfy = spiderfyStateRef.current;

            const activeNodeTargets = [];
            const activeClusterTargets = [];

            const drawSingleNodeAt = (pNode, rx, ry, forceLabel = false) => {
                const item = pNode.node;

                // Se o nó está selecionado no modo normal (não picking), o <DraggableMarker> DOM assume ele
                if (item.id === selectedId && !isPickingMode) {
                    return;
                }

                let sprite = nodeSpritesMap.get(item.id);
                const texture = getOrCreateNodeTexture(item);

                if (!sprite) {
                    sprite = new PIXI.Sprite(texture);
                    sprite.anchor.set(0.5, 0.5);
                    nodeSpritesMap.set(item.id, sprite);
                    nodesContainer.addChild(sprite);
                } else if (sprite.texture !== texture) {
                    sprite.texture = texture;
                }

                const isHighlighted =
                    item.id === selectedId || (isPickingMode && item.id === cableStartNodeId);
                const scaleFactor = isHighlighted ? 1.4 : 1.0;

                sprite.position.set(rx, ry);
                sprite.width = 32 * scaleFactor;
                sprite.height = 32 * scaleFactor;
                sprite.visible = true;
                nextVisibleSprites.push(sprite);

                activeNodeTargets.push({
                    node: item,
                    pNode,
                    x: rx,
                    y: ry,
                    radius: 18 * scaleFactor,
                });

                if ((showLabels || isHighlighted || forceLabel) && item.name) {
                    const existingEntry = labelEntriesMap.get(item.id);
                    const entry = createOrUpdateLabelDisplayObject(existingEntry, item.name);
                    if (entry !== existingEntry) {
                        labelEntriesMap.set(item.id, entry);
                    }
                    if (entry.needsMount) {
                        labelsContainer.addChild(entry.displayObject);
                        entry.needsMount = false;
                    }
                    entry.displayObject.position.set(rx, ry + 12 * scaleFactor);
                    entry.displayObject.visible = true;
                    nextVisibleLabels.push(entry.displayObject);
                }
            };

            // 1. Nós individuais visíveis
            for (let i = 0; i < singleNodes.length; i++) {
                const pNode = singleNodes[i];
                if (
                    pNode.wx < viewMinWx ||
                    pNode.wx > viewMaxWx ||
                    pNode.wy < viewMinWy ||
                    pNode.wy > viewMaxWy
                ) {
                    continue;
                }
                if (spiderfy && spiderfy.nodeIds.has(pNode.id)) continue;

                const rx = (pNode.wx * cosB - pNode.wy * sinB) * scale + originX;
                const ry = (pNode.wx * sinB + pNode.wy * cosB) * scale + originY;
                drawSingleNodeAt(pNode, rx, ry, false);
            }

            // 2. Clusters visíveis (quando toggleCluster está ativo)
            let clusterSpriteIdx = 0;
            for (let i = 0; i < clusters.length; i++) {
                const cl = clusters[i];
                if (
                    cl.wx < viewMinWx ||
                    cl.wx > viewMaxWx ||
                    cl.wy < viewMinWy ||
                    cl.wy > viewMaxWy
                ) {
                    continue;
                }

                if (spiderfy && spiderfy.clusterKey === cl.items[0].id) {
                    continue;
                }

                const visibleItemsCount =
                    !isPickingMode && selectedId
                        ? cl.items.filter((it) => it.id !== selectedId).length
                        : cl.items.length;

                if (visibleItemsCount === 0) continue;
                if (visibleItemsCount === 1) {
                    const remaining = cl.items.find((it) => it.id !== selectedId) || cl.items[0];
                    const rx = (remaining.wx * cosB - remaining.wy * sinB) * scale + originX;
                    const ry = (remaining.wx * sinB + remaining.wy * cosB) * scale + originY;
                    drawSingleNodeAt(remaining, rx, ry, false);
                    continue;
                }

                const rx = (cl.wx * cosB - cl.wy * sinB) * scale + originX;
                const ry = (cl.wx * sinB + cl.wy * cosB) * scale + originY;

                let clSprite = clusterPool[clusterSpriteIdx];
                const clTexture = getOrCreateClusterTexture(visibleItemsCount);
                if (!clSprite) {
                    clSprite = new PIXI.Sprite(clTexture);
                    clSprite.anchor.set(0.5, 0.5);
                    clusterPool[clusterSpriteIdx] = clSprite;
                    nodesContainer.addChild(clSprite);
                } else if (clSprite.texture !== clTexture) {
                    clSprite.texture = clTexture;
                }
                clusterSpriteIdx += 1;

                clSprite.position.set(rx, ry);
                clSprite.width = 40;
                clSprite.height = 40;
                clSprite.visible = true;

                activeClusterTargets.push({
                    cluster: cl,
                    x: rx,
                    y: ry,
                    radius: 20,
                });
            }

            // 3. Efeito Aranha (Spiderfy) para nós exatamente sobrepostos
            if (spiderfy) {
                const centerRx = (spiderfy.centerWx * cosB - spiderfy.centerWy * sinB) * scale + originX;
                const centerRy = (spiderfy.centerWx * sinB + spiderfy.centerWy * cosB) * scale + originY;

                for (let i = 0; i < spiderfy.entries.length; i++) {
                    const entry = spiderfy.entries[i];
                    if (entry.pNode.id === selectedId && !isPickingMode) continue;

                    const sx = centerRx + entry.offsetX;
                    const sy = centerRy + entry.offsetY;

                    spiderLegsGraphics.lineStyle({ width: 3, color: 0x000000, alpha: 0.65 });
                    spiderLegsGraphics.moveTo(centerRx, centerRy);
                    spiderLegsGraphics.lineTo(sx, sy);

                    spiderLegsGraphics.lineStyle({ width: 1.5, color: 0xffffff, alpha: 0.9 });
                    spiderLegsGraphics.moveTo(centerRx, centerRy);
                    spiderLegsGraphics.lineTo(sx, sy);

                    drawSingleNodeAt(entry.pNode, sx, sy, true);
                }
            }

            prevVisibleSpritesRef.current = nextVisibleSprites;
            prevVisibleLabelsRef.current = nextVisibleLabels;
            prevVisibleClusterCountRef.current = clusterSpriteIdx;

            renderedTargetsRef.current = {
                nodes: activeNodeTargets,
                clusters: activeClusterTargets,
            };

            // Faz upload consolidado único de qualquer nova fatia do Atlas antes de desenhar
            flushDirtyAtlases();
            app.renderer.render(app.stage);
        },
        [
            map,
            refOriginWorld,
            projectedCables,
            getClustersForZoom,
            selectedId,
            isPickingMode,
            cableStartNodeId,
            showLabels,
        ]
    );

    useEffect(() => {
        renderSceneRef.current = renderScene;
    }, [renderScene]);

    // 5. Inicialização e ciclo de vida do Canvas WebGL (PixiJS) dentro do Leaflet
    useEffect(() => {
        if (!map) return;

        prewarmAllStandardIcons();

        const parentPane = map.getPane('norotatePane') || map.getPane('mapPane');
        let pixiPane = map.getPane('pixiWebGLPane');
        if (!pixiPane) {
            pixiPane = map.createPane('pixiWebGLPane', parentPane);
            pixiPane.style.zIndex = '450';
            pixiPane.style.pointerEvents = 'none';
        }

        const size = map.getSize();
        const canvas = document.createElement('canvas');
        canvas.className = 'leaflet-zoom-animated';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        pixiPane.appendChild(canvas);
        canvasRef.current = canvas;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const app = new PIXI.Application({
            view: canvas,
            width: Math.max(size.x, 1),
            height: Math.max(size.y, 1),
            backgroundAlpha: 0,
            antialias: true,
            resolution: dpr,
            autoDensity: true,
            autoStart: false,
            hello: false,
            powerPreference: 'high-performance',
        });
        pixiAppRef.current = app;

        const cablesContainer = new PIXI.Container();
        const spiderLegsGraphics = new PIXI.Graphics();
        const nodesContainer = new PIXI.Container();
        const labelsContainer = new PIXI.Container();

        app.stage.addChild(cablesContainer);
        app.stage.addChild(spiderLegsGraphics);
        app.stage.addChild(nodesContainer);
        app.stage.addChild(labelsContainer);

        cablesContainerRef.current = cablesContainer;
        spiderLegsGraphicsRef.current = spiderLegsGraphics;
        nodesContainerRef.current = nodesContainer;
        labelsContainerRef.current = labelsContainer;
        builtCablesStateRef.current.dirty = true;

        // Registra listener único coalescido para quando algum SVG base terminar de decodificar
        const onBaseTexturesUpdated = () => {
            renderSceneRef.current(false);
        };
        textureReadyListeners.add(onBaseTexturesUpdated);

        renderSceneRef.current(true);

        return () => {
            textureReadyListeners.delete(onBaseTexturesUpdated);

            cableGraphicsPoolRef.current = [];
            nodeSpritesMapRef.current.clear();
            labelEntriesMapRef.current.clear();
            clusterSpritesPoolRef.current = [];
            prevVisibleSpritesRef.current = [];
            prevVisibleLabelsRef.current = [];
            prevVisibleClusterCountRef.current = 0;

            app.destroy(true, { children: true, texture: false, baseTexture: false });
            pixiAppRef.current = null;
            canvasRef.current = null;
        };
    }, [map]);

    // Re-renderiza sempre que os dados ou estados visuais mudam
    useEffect(() => {
        renderScene(false);
    }, [renderScene]);

    // Helper para ativar o efeito Aranha (Spiderfy) em nós sobrepostos
    const triggerSpiderfy = useCallback((items, centerWx, centerWy, clusterKey) => {
        const count = items.length;
        const entries = [];
        const nodeIds = new Set();

        const baseRadius = count > 8 ? 36 + count * 2.5 : 36;
        const startAngle = -Math.PI / 2;

        for (let i = 0; i < count; i++) {
            const angle = startAngle + (2 * Math.PI * i) / count;
            entries.push({
                pNode: items[i],
                offsetX: Math.cos(angle) * baseRadius,
                offsetY: Math.sin(angle) * baseRadius,
            });
            nodeIds.add(items[i].id);
        }

        spiderfyStateRef.current = {
            clusterKey,
            centerWx,
            centerWy,
            entries,
            nodeIds,
        };
        renderSceneRef.current(false);
    }, []);

    // Hit-test ultrarrápido de cabos direto no espaço de mundo (zero alocação de arrays por frame)
    const findHitCablesAtScreenPoint = useCallback(
        (px, py, findAll = false) => {
            const { originX, originY, scale, cosB, sinB } = viewTransformRef.current;
            if (!scale) return [];

            const sx = (px - originX) / scale;
            const sy = (py - originY) / scale;
            const mouseWx = sx * cosB + sy * sinB;
            const mouseWy = -sx * sinB + sy * cosB;

            const thresholdWorld = 10 / scale;
            const thresholdWorldSq = thresholdWorld * thresholdWorld;
            const hits = [];

            for (let i = 0; i < projectedCables.length; i++) {
                const pCable = projectedCables[i];
                if (pCable.id === selectedId) continue;

                if (
                    mouseWx < pCable.minWx - thresholdWorld ||
                    mouseWx > pCable.maxWx + thresholdWorld ||
                    mouseWy < pCable.minWy - thresholdWorld ||
                    mouseWy > pCable.maxWy + thresholdWorld
                ) {
                    continue;
                }

                const pts = pCable.pts;
                for (let j = 0; j < pts.length - 1; j++) {
                    if (
                        pointToSegmentDistSq(
                            mouseWx,
                            mouseWy,
                            pts[j].wx,
                            pts[j].wy,
                            pts[j + 1].wx,
                            pts[j + 1].wy
                        ) <= thresholdWorldSq
                    ) {
                        hits.push(pCable.cable);
                        if (!findAll) return hits;
                        break;
                    }
                }
            }

            return hits;
        },
        [projectedCables, selectedId]
    );

    // Testa e trata clique em Nós ou Clusters (prioridade máxima)
    const handleNodeOrClusterClick = useCallback(
        (e) => {
            if (
                interactionMode === 'ADD_NODE' ||
                interactionMode === 'ADD_CLIENT' ||
                interactionMode === 'ADD_OBJECT' ||
                interactionMode === 'ADD_CIRCLE_AREA' ||
                interactionMode === 'MEASURE' ||
                interactionMode === 'ADD_AREA'
            ) {
                return false;
            }

            const pt = e.containerPoint || (e.latlng ? map.latLngToContainerPoint(e.latlng) : null);
            if (!pt) return false;
            const px = pt.x;
            const py = pt.y;
            const { nodes, clusters } = renderedTargetsRef.current;

            // 1. Verifica clique em Nós individuais
            const hitNodes = [];
            for (let i = nodes.length - 1; i >= 0; i--) {
                const n = nodes[i];
                const dx = px - n.x;
                const dy = py - n.y;
                const distSq = dx * dx + dy * dy;
                if (distSq <= n.radius * n.radius) {
                    hitNodes.push({ ...n, distSq });
                }
            }

            if (hitNodes.length > 0) {
                e._handledByPixi = true;
                if (e.originalEvent) e.originalEvent._handledByPixi = true;
                L.DomEvent.stopPropagation(e);
                if (setContextMenuPin) setContextMenuPin(null);

                hitNodes.sort((a, b) => a.distSq - b.distSq);

                if (hitNodes.length > 1 && !spiderfyStateRef.current) {
                    const first = hitNodes[0];
                    const coLocated = hitNodes.filter((h) => {
                        const ddx = h.x - first.x;
                        const ddy = h.y - first.y;
                        return ddx * ddx + ddy * ddy <= 64;
                    });
                    if (coLocated.length > 1) {
                        triggerSpiderfy(
                            coLocated.map((h) => h.pNode),
                            first.pNode.wx,
                            first.pNode.wy,
                            `colocated_${first.node.id}`
                        );
                        return true;
                    }
                }

                const clickedNode = hitNodes[0].node;
                const now = performance.now();

                if (isPickingMode) {
                    if (onNodeClick) onNodeClick(clickedNode);
                    return true;
                }

                if (
                    lastItemClickRef &&
                    lastItemClickRef.current.id === clickedNode.id &&
                    now - lastItemClickRef.current.time < 320
                ) {
                    lastItemClickRef.current = { id: null, time: 0 };
                    if (!clickedNode._readOnly && onOpen) {
                        onOpen(clickedNode.id);
                    }
                    return true;
                }

                if (lastItemClickRef) {
                    lastItemClickRef.current = { id: clickedNode.id, time: now };
                }
                onSelectItem(clickedNode.id);
                return true;
            }

            // 2. Verifica clique em Clusters
            for (let i = clusters.length - 1; i >= 0; i--) {
                const c = clusters[i];
                const dx = px - c.x;
                const dy = py - c.y;
                if (dx * dx + dy * dy <= c.radius * c.radius) {
                    e._handledByPixi = true;
                    if (e.originalEvent) e.originalEvent._handledByPixi = true;
                    L.DomEvent.stopPropagation(e);
                    if (setContextMenuPin) setContextMenuPin(null);

                    const cl = c.cluster;
                    const latSpan = Math.abs(cl.maxLat - cl.minLat);
                    const lngSpan = Math.abs(cl.maxLng - cl.minLng);
                    const isSameSpot = latSpan < 0.000015 && lngSpan < 0.000015;

                    if (isSameSpot || map.getZoom() >= 20.5) {
                        triggerSpiderfy(cl.items, cl.wx, cl.wy, cl.items[0].id);
                    } else {
                        const bounds = L.latLngBounds(
                            [cl.minLat, cl.minLng],
                            [cl.maxLat, cl.maxLng]
                        );
                        map.flyToBounds(bounds, {
                            padding: [60, 60],
                            maxZoom: 21,
                            duration: 0.5,
                        });
                    }
                    return true;
                }
            }

            return false;
        },
        [
            interactionMode,
            map,
            setContextMenuPin,
            triggerSpiderfy,
            isPickingMode,
            onNodeClick,
            lastItemClickRef,
            onOpen,
            onSelectItem,
        ]
    );

    // Função completa que testa Nós, Clusters e Cabos
    const handlePixiClick = useCallback(
        (e) => {
            if (e._handledByPixi || (e.originalEvent && e.originalEvent._handledByPixi)) {
                return true;
            }

            if (
                interactionMode === 'ADD_NODE' ||
                interactionMode === 'ADD_CLIENT' ||
                interactionMode === 'ADD_OBJECT' ||
                interactionMode === 'ADD_CIRCLE_AREA' ||
                interactionMode === 'MEASURE' ||
                interactionMode === 'ADD_AREA'
            ) {
                return false;
            }

            if (handleNodeOrClusterClick(e)) {
                return true;
            }

            if (spiderfyStateRef.current) {
                spiderfyStateRef.current = null;
                renderSceneRef.current(false);
            }

            const pt = e.containerPoint || (e.latlng ? map.latLngToContainerPoint(e.latlng) : null);
            if (!pt) return false;

            if (!isPickingMode) {
                const hitCables = findHitCablesAtScreenPoint(pt.x, pt.y, true);

                if (hitCables.length > 0) {
                    e._handledByPixi = true;
                    if (e.originalEvent) e.originalEvent._handledByPixi = true;
                    L.DomEvent.stopPropagation(e);
                    if (setContextMenuPin) setContextMenuPin(null);

                    if (hitCables.length > 1 && setOverlappingMenu) {
                        setOverlappingMenu({
                            isOpen: true,
                            position: e.latlng,
                            cables: hitCables,
                        });
                        return true;
                    }

                    const clickedCable = hitCables[0];
                    const now = performance.now();

                    if (
                        lastItemClickRef &&
                        lastItemClickRef.current.id === clickedCable.id &&
                        now - lastItemClickRef.current.time < 320
                    ) {
                        lastItemClickRef.current = { id: null, time: 0 };
                        if (onOpen) onOpen(clickedCable.id, e.latlng);
                        return true;
                    }

                    if (lastItemClickRef) {
                        lastItemClickRef.current = { id: clickedCable.id, time: now };
                    }
                    if (setForcedCablePosition) {
                        setForcedCablePosition({ id: clickedCable.id, latlng: e.latlng });
                    }
                    onSelectItem(clickedCable.id);
                    return true;
                }
            }

            return false;
        },
        [
            interactionMode,
            handleNodeOrClusterClick,
            map,
            isPickingMode,
            findHitCablesAtScreenPoint,
            setContextMenuPin,
            setOverlappingMenu,
            lastItemClickRef,
            onOpen,
            setForcedCablePosition,
            onSelectItem,
        ]
    );

    useEffect(() => {
        if (pixiNodeHitTestRef) pixiNodeHitTestRef.current = handleNodeOrClusterClick;
        if (pixiHitTestRef) pixiHitTestRef.current = handlePixiClick;
    }, [handleNodeOrClusterClick, handlePixiClick, pixiNodeHitTestRef, pixiHitTestRef]);

    const setMapCursor = useCallback(
        (cursor) => {
            if (lastCursorRef.current !== cursor) {
                lastCursorRef.current = cursor;
                map.getContainer().style.cursor = cursor;
            }
        },
        [map]
    );

    // 6. Eventos de Movimento, Zoom, Rotação e Interação de Clique/Hover na GPU
    useMapEvents({
        move() {
            renderSceneRef.current(false);
        },
        moveend() {
            renderSceneRef.current(false);
        },
        zoom() {
            renderSceneRef.current(false);
        },
        zoomstart() {
            if (spiderfyStateRef.current) {
                spiderfyStateRef.current = null;
            }
        },
        zoomanim(e) {
            const canvas = canvasRef.current;
            const topLeftLatLng = drawnStateRef.current.topLeftLatLng;
            if (!canvas || !topLeftLatLng) return;

            const scale = map.getZoomScale(e.zoom, drawnStateRef.current.zoom);
            const newLayerPt = map._latLngToNewLayerPoint(topLeftLatLng, e.zoom, e.center);
            const newPos = map._rotate ? map.rotatedPointToMapPanePoint(newLayerPt) : newLayerPt;
            L.DomUtil.setTransform(canvas, newPos, scale);
        },
        zoomend() {
            // Ao terminar o zoom, reconstrói a espessura exata (6px/4px) dos cabos visíveis
            renderSceneRef.current(true);
        },
        rotate() {
            renderSceneRef.current(false);
        },
        viewreset() {
            renderSceneRef.current(true);
        },
        resize() {
            renderSceneRef.current(false);
        },

        mousemove(e) {
            if (interactionMode !== 'SELECT' && !isPickingMode) {
                setMapCursor('');
                return;
            }

            const pt = e.containerPoint;
            if (!pt) return;
            const px = pt.x;
            const py = pt.y;
            const { nodes, clusters } = renderedTargetsRef.current;

            for (let i = nodes.length - 1; i >= 0; i--) {
                const n = nodes[i];
                const dx = px - n.x;
                const dy = py - n.y;
                if (dx * dx + dy * dy <= n.radius * n.radius) {
                    setMapCursor('pointer');
                    return;
                }
            }

            for (let i = clusters.length - 1; i >= 0; i--) {
                const c = clusters[i];
                const dx = px - c.x;
                const dy = py - c.y;
                if (dx * dx + dy * dy <= c.radius * c.radius) {
                    setMapCursor('pointer');
                    return;
                }
            }

            if (!isPickingMode && findHitCablesAtScreenPoint(px, py, false).length > 0) {
                setMapCursor('pointer');
                return;
            }

            setMapCursor('');
        },

        click(e) {
            handlePixiClick(e);
        },
    });

    return null;
};

export default React.memo(PixiMapLayer);
