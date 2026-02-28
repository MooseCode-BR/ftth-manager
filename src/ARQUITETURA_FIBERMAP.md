# Arquitetura do FiberMap - Integração com Leaflet

## Visão Geral

O [FiberMap.jsx](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/FiberMap.jsx) é o componente responsável pela visualização de itens FTTH em mapa interativo usando React-Leaflet. Este arquivo implementa otimizações de performance, controles customizados e integração perfeita com o sistema Canvas.

## Estrutura do Arquivo (1634 linhas)

### 1. Imports (Linhas 1-47)
- **React Hooks**: useMemo, useEffect, useState, useRef, memo, useCallback
- **React-Leaflet**: MapContainer, TileLayer, Marker, Polyline, useMapEvents, etc
- **Leaflet Core**: L (biblioteca principal)
- **Utilitários**: renderToStaticMarkup para criar ícones SVG
- **Constantes**: ITEM_TYPES, ICON_MAP
- **Ícones**: CompassIcon, Lucide React icons

### 2. Funções de Criação de Ícones (Linhas 48-157)

#### createCustomIcon (Linhas 48-86)
Cria ícones customizados para marcadores no mapa.

**Parâmetros**:
- `type`: Tipo do item (POP, CEO, CTO, etc)
- `color`: Cor do ícone
- `isSelected`: Se o item está selecionado
- [name](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2641-2678): Nome do item (para label)
- `showLabel`: Se deve mostrar o label
- `isDarkMode`: Tema escuro/claro
- `item`: Objeto completo do item

**Lógica**:
1. Busca ícone padrão do tipo em `ITEM_TYPES`
2. Se for tipo OBJECT e tiver `iconType`, usa ícone específico do `ICON_MAP`
3. Renderiza SVG com `renderToStaticMarkup`
4. Retorna `L.divIcon` com HTML customizado

**Características**:
- Ícone circular com borda colorida
- Escala aumentada quando selecionado
- Label opcional abaixo do ícone
- Sombra e efeitos visuais

#### createHandleIcon (Linhas 91-97)
Cria ícone para waypoints (pontos de edição de cabos).

**Retorno**: Pequena bolinha branca com borda azul, cursor grab.

#### createSearchIcon (Linhas 100-157)
Cria ícone para locais encontrados na busca de endereços.

**Retorno**: Alfinete vermelho estilo Google Maps.

### 3. Componentes de Controle (Linhas 159-447)

#### MapClickHandler (Linhas 159-173)
**Propósito**: Gerencia cliques no mapa.

**Props**:
- `onMapBgClick`: Callback para cliques
- `interactionMode`: Modo de interação atual
- `onDeselect`: Callback para desselecionar

**Lógica**:
- Se modo ADD_NODE/ADD_CLIENT/ADD_OBJECT: captura coordenadas
- Caso contrário: desseleciona itens

#### MapZoomHandler (Linhas 175-186)
**Propósito**: Otimização de zoom inteligente.

**Props**:
- `onShowLabelsChange`: Callback para mostrar/ocultar labels

**Lógica**:
- Monitora evento [zoomend](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/FiberMap.jsx#179-184)
- Ativa labels apenas em zoom >= 16
- Evita re-renders desnecessários

#### FlyToHandler (Linhas 188-197)
**Propósito**: Navegação suave para coordenadas.

**Props**:
- `coords`: [lat, lng] para onde voar

**Lógica**:
- Usa `map.flyTo()` com zoom 20
- Animação suave de câmera

#### LocationControl (Linhas 199-288)
**Propósito**: Controle de geolocalização.

**Funcionalidades**:
- Botão customizado no canto inferior direito
- Animação de "piscando" durante busca
- Marcador circular azul na posição encontrada
- Tratamento de erros de GPS

**Implementação**:
- Cria controle Leaflet customizado
- Usa `map.locate()` para GPS
- Listeners para [locationfound](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/FiberMap.jsx#189-193) e [locationerror](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/FiberMap.jsx#229-234)

#### CustomRotateControl (Linhas 290-428)
**Propósito**: Controle de rotação do mapa.

**Funcionalidades**:
- Botão com ícone de bússola
- Arrastar horizontalmente para girar
- Clique para resetar ao Norte
- Ícone gira junto com o mapa
- Feedback visual (azul quando fora do Norte)

**Implementação**:
- Controle Leaflet customizado
- Event listeners para mouse (down, move, up)
- Sensibilidade ajustável (0.5 graus por pixel)
- Previne propagação de eventos para o mapa

#### RotationHandler (Linhas 430-447)
**Propósito**: Atalho de teclado "R" para resetar rotação.

**Lógica**:
- Listener global de `keydown`
- Tecla "R" reseta para Norte
- Ignora se estiver em input/textarea

### 4. Componentes Memoizados (Linhas 449-fim)

#### DraggableMarker (Linhas 449-618)
**Propósito**: Marcador arrastável otimizado.

**Otimização**: Memoizado com comparação de props específicas.

**Props comparadas**:
- `item.id`, `item.name`, `item.lat`, `item.lng`
- `item.color`, `item.iconType`, `item.type`
- `isSelected`, `showLabel`, `isPickingMode`

**Funcionalidades**:
- Drag & drop (quando desbloqueado)
- Clique simples: seleciona
- Duplo clique: abre detalhes
- Popup com toolbar de ações:
  - Travar/Destravar movimento
  - Editar propriedades
  - Abrir detalhes
  - Excluir item

**Event Handlers**:
- [dragend](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/FiberMap.jsx#479-486): Salva nova posição
- [click](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/FiberMap.jsx#127-135): Seleciona ou conecta (modo picking)
- [dblclick](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/FiberMap.jsx#497-504): Abre DetailPanel

#### MemoizedPolyline (Código comentado, linhas 620-1400+)
**Nota**: Grande bloco de código comentado para cabos editáveis.
Funcionalidade substituída por implementação mais simples.

#### FiberMap (Componente Principal)
**Propósito**: Container principal do mapa.

**Funcionalidades**:
- Renderiza MapContainer com TileLayer
- Gerencia marcadores e polylines
- Integra todos os controles
- Suporta múltiplas camadas (OSM, Satellite, etc)

## Otimizações de Performance

### 1. Memoização de Componentes
```javascript
const DraggableMarker = memo(({ ... }) => { ... }, (prev, next) => {
    return (
        prev.item.id === next.item.id &&
        prev.item.lat === next.item.lat &&
        // ... outras comparações
    );
});
```

**Impacto**: Evita re-render de marcadores que não mudaram.

### 2. useMemo para Ícones
```javascript
const icon = useMemo(() => {
    return createCustomIcon(...);
}, [item.type, item.color, isSelected, item.name, showLabel]);
```

**Impacto**: Ícones só são recriados quando propriedades relevantes mudam.

### 3. Zoom Handler Inteligente
```javascript
const MapZoomHandler = ({ onShowLabelsChange }) => {
    useMapEvents({
        zoomend(e) {
            const z = e.target.getZoom();
            onShowLabelsChange(z >= 16);
        },
    });
};
```

**Impacto**: Labels só aparecem em zoom alto, reduzindo carga visual.

### 4. MarkerClusterGroup
Agrupa marcadores próximos em clusters, melhorando performance com muitos itens.

## Integração Canvas ↔ Mapa

### Projeção de Coordenadas
- **Canvas**: Coordenadas cartesianas (x, y)
- **Mapa**: Coordenadas geográficas (lat, lng)

### Sincronização
- Itens possuem ambas as coordenadas
- Mudanças no mapa atualizam `lat/lng`
- Mudanças no canvas atualizam `x/y`
- Sistema de projeção bidirecional

## Controles Customizados

### Padrão de Implementação
```javascript
const CustomControl = () => {
    const map = useMap();
    
    useEffect(() => {
        const ControlClass = L.Control.extend({
            onAdd: function() {
                const btn = L.DomUtil.create('button', 'leaflet-bar');
                // ... configuração do botão
                return btn;
            }
        });
        
        const control = new ControlClass({ position: 'bottomright' });
        control.addTo(map);
        
        return () => control.remove();
    }, [map]);
    
    return null;
};
```

## Fluxo de Eventos

```
Usuário clica no mapa
    ↓
MapClickHandler captura evento
    ↓
Verifica interactionMode
    ↓
Se ADD_NODE: onMapBgClick(coords)
    ↓
App.jsx cria novo item
    ↓
Firestore atualiza
    ↓
Listener detecta mudança
    ↓
items state atualizado
    ↓
FiberMap re-renderiza
    ↓
Novo marcador aparece
```

## Ícones Customizados

### Técnica: renderToStaticMarkup
```javascript
const svgString = renderToStaticMarkup(
    <div style={{ ... }}>
        <ItemIconComponent size={20} />
    </div>
);

return L.divIcon({
    html: svgString,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});
```

**Vantagens**:
- Ícones totalmente customizáveis
- Usa componentes React (Lucide icons)
- Estilização com CSS-in-JS
- Suporte a temas (dark/light)

## Camadas de Mapa

### TileLayer Providers
- **OpenStreetMap**: Padrão, gratuito
- **Satellite**: Imagens de satélite (opcional)
- **Terrain**: Relevo e topografia (opcional)

### LayersControl
Permite alternar entre diferentes camadas de mapa.

## Popup vs Tooltip

### Popup (Atual)
- Aparece ao clicar
- Pode conter botões interativos
- Fecha ao clicar fora
- Melhor para ações

### Tooltip (Antigo)
- Aparece ao passar o mouse
- Sempre visível (permanent)
- Não fecha automaticamente
- Melhor para informações

## Waypoints e Edição de Cabos

### Conceito
Waypoints são pontos intermediários em um cabo, permitindo criar curvas.

### Implementação (Comentada)
- Clique na linha: adiciona waypoint
- Arrastar waypoint: move ponto
- Clique direito: remove waypoint
- Sistema de bloqueio para segurança

## Próximas Melhorias Possíveis

1. **Clustering Inteligente**: Agrupar por tipo de item
2. **Heatmap**: Visualizar densidade de clientes
3. **Medição de Distância**: Ferramenta de régua
4. **Exportação de Área**: Salvar região específica
5. **Offline Mode**: Cache de tiles para uso sem internet

## Dependências Críticas

- **react-leaflet**: ^4.x
- **leaflet**: ^1.9.x
- **leaflet-rotate**: Plugin para rotação
- **react-leaflet-cluster**: Agrupamento de marcadores

## Troubleshooting Comum

### Ícones Quebrados
**Solução**: Configurar DefaultIcon corretamente (linhas 13-23)

### Performance Lenta
**Solução**: Usar memoização e clustering

### Eventos Não Funcionam
**Solução**: Usar `L.DomEvent.stopPropagation(e)`

### Rotação Não Funciona
**Solução**: Verificar se plugin leaflet-rotate está instalado
