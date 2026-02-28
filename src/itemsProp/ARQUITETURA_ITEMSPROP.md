# Arquitetura dos Componentes itemsProp - FTTH Manager

## Visão Geral

Os componentes `itemsProp` são responsáveis pela visualização e edição detalhada de itens FTTH. Localizados em `src/itemsProp/`, consistem em 2 componentes principais altamente complexos.

## Componentes

### 1. DetailPanel (571 linhas)
**Propósito**: Painel lateral de detalhes de nós (POP, CEO, CTO, etc).

**Localização**: `src/itemsProp/DetailPanel/index.jsx`

#### Props (15 props)
```javascript
{
  itemId,              // ID do item selecionado
  items,               // Todos os itens
  connections,         // Todas as conexões
  portLabels,          // Labels customizados de portas
  signalNames,         // Configurações de sinais
  close,               // Callback para fechar
  onOpenNotes,         // Abrir modal de notas
  openAddModal,        // Abrir modal de criação
  onEditRequest,       // Editar propriedades
  onConfirmRequest,    // Confirmação de ações
  onAlertRequest,      // Exibir alertas
  saveConnection,      // Salvar conexão
  deleteConnectionDB,  // Deletar conexão
  updateLabelDB,       // Atualizar label de porta
  updateSignalDB,      // Atualizar configuração de sinal
  saveItem,            // Salvar item
  pendingConn,         // Conexão pendente
  setPendingConn,      // Definir conexão pendente
  onDelete,            // Deletar item
  onOpenPhotos,        // Abrir galeria de fotos
  onAddSlotRequest,    // Adicionar slot em DIO
  onSplitCable,        // Dividir cabo
  onTraceRequest,      // Rastrear sinal
  onGenericEditRequest,// Edição genérica
  onOTDR               // Medição OTDR
}
```

#### Estados
```javascript
const [collapsed, setCollapsed] = useState({});
// Controla quais seções estão colapsadas

const [showSignalModal, setShowSignalModal] = useState(false);
const [signalEditData, setSignalEditData] = useState(null);
// Controle do modal de edição de sinal
```

#### Funcionalidades Principais

**1. Visualização Hierárquica**
- Informações do nó principal
- Equipamentos internos (DIOs, Splitters, ONUs)
- Cabos conectados
- Portas e conexões

**2. Geração de Relatório PDF**
```javascript
const handleDownloadReport = () => {
  const allItems = items; // Todos os itens do projeto
  generateNodeReport(item, allItems);
};
```

**3. Gerenciamento de Conexões**
```javascript
const disconnect = (id) => {
  onConfirmRequest(
    'Desconectar',
    'Tem certeza?',
    () => deleteConnectionDB(id)
  );
};

const handleConnect = (targetId, port, side) => {
  setPendingConn({ targetId, port, side });
};
```

**4. Edição de Labels de Porta**
```javascript
const updatePortLabel = (key, currentLabel) => {
  const newLabel = prompt('Novo label:', currentLabel);
  if (newLabel !== null) {
    updateLabelDB(key, newLabel);
  }
};
```

**5. Edição de Sinais**
```javascript
const handleSignalEdit = (itemId, portIndex, side) => {
  setSignalEditData({ itemId, portIndex, side });
  setShowSignalModal(true);
};
```

**6. Gerenciamento de Dispositivos Internos**
```javascript
// Renomear dispositivo
const renameDevice = (id, currentName) => {
  const newName = prompt('Novo nome:', currentName);
  if (newName) {
    const device = items.find(i => i.id === id);
    saveItem({ ...device, name: newName });
  }
};

// Adicionar interface (OLT, ONU)
const addInterface = (id) => {
  const device = items.find(i => i.id === id);
  const newInterfaces = [...(device.interfaces || []), `Interface ${(device.interfaces?.length || 0) + 1}`];
  saveItem({ ...device, interfaces: newInterfaces });
};

// Adicionar card DIO
const addDioCard = (id) => {
  const device = items.find(i => i.id === id);
  const newCards = [...(device.dioCards || []), `Card ${(device.dioCards?.length || 0) + 1}`];
  saveItem({ ...device, dioCards: newCards });
};
```

**7. Drag and Drop (Reordenação)**
```javascript
const onDragStart = (e, item) => {
  e.dataTransfer.setData('draggedItem', JSON.stringify(item));
};

const onDrop = (e, targetIndex, list) => {
  e.preventDefault();
  const draggedItem = JSON.parse(e.dataTransfer.getData('draggedItem'));
  
  // Reordena a lista
  const newList = [...list];
  const draggedIndex = newList.findIndex(i => i.id === draggedItem.id);
  newList.splice(draggedIndex, 1);
  newList.splice(targetIndex, 0, draggedItem);
  
  // Salva ordem atualizada
  saveItem({ ...parentItem, children: newList });
};
```

#### Componentes Internos

**CollapsibleGroup**
```javascript
const CollapsibleGroup = ({ 
  title, itemId, icon: Icon, children, 
  extraAction, customColor, 
  onDragStart, onDrop, index, list, 
  className, onEdit 
}) => {
  const isCollapsed = collapsed[itemId];
  
  return (
    <div 
      className={`collapsible-group ${className}`}
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, list[index])}
      onDrop={(e) => onDrop?.(e, index, list)}
    >
      <div className="group-header" onClick={() => toggleCollapse(itemId)}>
        <Icon size={18} color={customColor} />
        <span>{title}</span>
        {extraAction}
        {isCollapsed ? <ChevronDown /> : <ChevronUp />}
      </div>
      
      {!isCollapsed && (
        <div className="group-content">
          {children}
        </div>
      )}
    </div>
  );
};
```

**PortRow**
```javascript
const PortRow = ({ 
  targetItem, portIndex, side, 
  isInput = false, overrideLabel = null, 
  isPatchPanel = false, onOTDR 
}) => {
  const portKey = `${targetItem.id}-${portIndex}-${side}`;
  const conn = findConnection(connections, targetItem.id, portIndex, side);
  const label = overrideLabel || portLabels[portKey] || `Porta ${portIndex + 1}`;
  
  // Cálculo de potência
  const powerInfo = calculatePower(items, connections, targetItem.id, portIndex, side);
  
  const getDisplay = () => {
    if (!conn) return { text: 'Livre', color: '#10b981' };
    
    const otherItem = items.find(i => i.id === (
      conn.itemIdA === targetItem.id ? conn.itemIdB : conn.itemIdA
    ));
    
    return {
      text: otherItem?.name || 'Desconhecido',
      color: '#3b82f6'
    };
  };
  
  const display = getDisplay();
  
  return (
    <div className="port-row">
      <div className="port-label">{label}</div>
      <div className="port-status" style={{ color: display.color }}>
        {display.text}
      </div>
      {powerInfo && (
        <div className="port-power">
          {powerInfo.power.toFixed(2)} dBm
        </div>
      )}
      <div className="port-actions">
        {conn ? (
          <button onClick={() => disconnect(conn.id)}>
            <Unplug size={14} />
          </button>
        ) : (
          <button onClick={() => handleConnect(targetItem.id, portIndex, side)}>
            <Plug size={14} />
          </button>
        )}
        {onOTDR && (
          <button onClick={() => onOTDR(targetItem.id, portIndex, side)}>
            <Ruler size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
```

#### Estrutura de Renderização

```javascript
const renderBody = () => {
  const item = items.find(i => i.id === itemId);
  if (!item) return null;
  
  return (
    <div className="detail-panel-body">
      {/* Cabeçalho com nome e ações */}
      <div className="panel-header">
        <h2>{item.name}</h2>
        <div className="header-actions">
          <button onClick={handleDownloadReport}>
            <FileText size={16} /> Relatório
          </button>
          <button onClick={() => onOpenNotes(item)}>
            <FileText size={16} /> Notas
          </button>
          <button onClick={() => onOpenPhotos(item)}>
            <Camera size={16} /> Fotos
          </button>
        </div>
      </div>
      
      {/* Equipamentos internos */}
      {internalDevices.map(device => (
        <CollapsibleGroup
          key={device.id}
          title={device.name}
          itemId={device.id}
          icon={getIcon(device.type)}
          onEdit={() => renameDevice(device.id, device.name)}
        >
          {renderDeviceContent(device)}
        </CollapsibleGroup>
      ))}
      
      {/* Cabos conectados */}
      <CollapsibleGroup
        title="Cabos Conectados"
        itemId="cables"
        icon={Cable}
      >
        {connectedCables.map(cable => (
          <div key={cable.id} className="cable-item">
            {cable.name}
          </div>
        ))}
      </CollapsibleGroup>
      
      {/* Aba de conexões (ConnectionWorkbench) */}
      <ConnectionWorkbench
        item={item}
        items={items}
        connections={connections}
        portLabels={portLabels}
        signalNames={signalNames}
        saveConnection={saveConnection}
        deleteConnectionDB={deleteConnectionDB}
        onAlertRequest={onAlertRequest}
        saveItem={saveItem}
      />
    </div>
  );
};
```

---

### 2. ConnectionWorkbench (492 linhas)
**Propósito**: Mesa de fusão visual com canvas interativo.

**Localização**: `src/itemsProp/ConnectionWorkbench/index.jsx`

#### Props (9 props)
```javascript
{
  item,                // Item atual (nó)
  items,               // Todos os itens
  connections,         // Todas as conexões
  portLabels,          // Labels de portas
  signalNames,         // Configurações de sinais
  saveConnection,      // Salvar conexão
  deleteConnectionDB,  // Deletar conexão
  onAlertRequest,      // Exibir alertas
  saveItem             // Salvar item
}
```

#### Estados
```javascript
const [collapsedCards, setCollapsedCards] = useState({});
// Cards colapsados

const [isPanning, setIsPanning] = useState(false);
const [panStart, setPanStart] = useState({ x: 0, y: 0 });
const [offset, setOffset] = useState({ x: 0, y: 0 });
// Controle de pan (arrastar canvas)

const [scale, setScale] = useState(1);
// Zoom do canvas

const [isDragging, setIsDragging] = useState(false);
const [dragStart, setDragStart] = useState(null);
const [dragCurrent, setDragCurrent] = useState(null);
// Controle de drag para criar conexões

const [sourcePort, setSourcePort] = useState(null);
// Porta de origem da conexão
```

#### Funcionalidades Principais

**1. Canvas Interativo**
- Pan (arrastar para mover)
- Zoom (scroll do mouse)
- Suporte touch (mobile)

**2. Drag-and-Drop de Conexões**
```javascript
const handlePortMouseDown = (e, portInfo) => {
  e.stopPropagation();
  setIsDragging(true);
  setSourcePort(portInfo);
  setDragStart({ x: e.clientX, y: e.clientY });
  setDragCurrent({ x: e.clientX, y: e.clientY });
};

const handleMouseMove = (e) => {
  if (isDragging) {
    setDragCurrent({ x: e.clientX, y: e.clientY });
  } else if (isPanning) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setOffset({ x: offset.x + dx, y: offset.y + dy });
    setPanStart({ x: e.clientX, y: e.clientY });
  }
};

const handleMouseUp = (e) => {
  if (isDragging && sourcePort) {
    // Detecta porta alvo sob o cursor
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    const targetPort = targetElement?.dataset?.portInfo;
    
    if (targetPort) {
      attemptConnection(sourcePort, JSON.parse(targetPort));
    }
  }
  
  setIsDragging(false);
  setIsPanning(false);
  setSourcePort(null);
  setDragStart(null);
  setDragCurrent(null);
};
```

**3. Criação de Conexões**
```javascript
const attemptConnection = (sourcePort, targetPort) => {
  // Validações
  if (sourcePort.itemId === targetPort.itemId) {
    onAlertRequest('Erro', 'Não pode conectar o mesmo item');
    return;
  }
  
  // Verifica se porta já está conectada
  const existingConn = findConnection(
    connections, 
    sourcePort.itemId, 
    sourcePort.portIndex, 
    sourcePort.side
  );
  
  if (existingConn) {
    onAlertRequest('Erro', 'Porta já está conectada');
    return;
  }
  
  // Cria conexão
  const newConnection = {
    id: uuidv4(),
    itemIdA: sourcePort.itemId,
    portIndexA: sourcePort.portIndex,
    sideA: sourcePort.side,
    itemIdB: targetPort.itemId,
    portIndexB: targetPort.portIndex,
    sideB: targetPort.side,
    createdAt: Date.now()
  };
  
  saveConnection(newConnection);
};
```

**4. Zoom e Pan**
```javascript
const handleWheel = (e) => {
  e.preventDefault();
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.1, Math.min(3, scale * delta));
  
  setScale(newScale);
};

const handleMouseDownCanvas = (e) => {
  if (e.button === 0 && !isDragging) {
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }
};
```

**5. Suporte Touch (Mobile)**
```javascript
const handleTouchStartNode = (e, nodeId, isCable, isSource) => {
  e.preventDefault();
  const touch = e.touches[0];
  
  setIsDragging(true);
  setDragStart({ x: touch.clientX, y: touch.clientY });
  setDragCurrent({ x: touch.clientX, y: touch.clientY });
};

const handleTouchMove = (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  
  if (isDragging) {
    setDragCurrent({ x: touch.clientX, y: touch.clientY });
  } else if (isPanning) {
    const dx = touch.clientX - panStart.x;
    const dy = touch.clientY - panStart.y;
    setOffset({ x: offset.x + dx, y: offset.y + dy });
    setPanStart({ x: touch.clientX, y: touch.clientY });
  }
};
```

#### Componentes Internos

**PortCircle**
```javascript
const PortCircle = ({ portInfo }) => {
  const conn = findConnection(
    connections, 
    portInfo.itemId, 
    portInfo.portIndex, 
    portInfo.side
  );
  
  const signalInfo = getSignalInfo(
    items, connections, portLabels, signalNames,
    portInfo.itemId, portInfo.portIndex, portInfo.side
  );
  
  return (
    <div
      className={`port-circle ${conn ? 'connected' : 'free'}`}
      style={{ backgroundColor: signalInfo?.color || '#9ca3af' }}
      data-port-info={JSON.stringify(portInfo)}
      onMouseDown={(e) => handlePortMouseDown(e, portInfo)}
      onTouchStart={(e) => handlePortTouchStart(e, portInfo)}
    >
      {portInfo.portIndex + 1}
    </div>
  );
};
```

**SignalLabel**
```javascript
const SignalLabel = ({ portInfo }) => {
  const signalInfo = getSignalInfo(
    items, connections, portLabels, signalNames,
    portInfo.itemId, portInfo.portIndex, portInfo.side
  );
  
  if (!signalInfo) return null;
  
  return (
    <div className="signal-label" style={{ color: signalInfo.color }}>
      {signalInfo.name}
    </div>
  );
};
```

#### Renderização de Linhas de Conexão

```javascript
const renderLines = () => {
  const lines = [];
  
  connections.forEach(conn => {
    const itemA = items.find(i => i.id === conn.itemIdA);
    const itemB = items.find(i => i.id === conn.itemIdB);
    
    if (!itemA || !itemB) return;
    
    // Calcula posições das portas no canvas
    const portAPos = getPortPosition(conn.itemIdA, conn.portIndexA, conn.sideA);
    const portBPos = getPortPosition(conn.itemIdB, conn.portIndexB, conn.sideB);
    
    if (!portAPos || !portBPos) return;
    
    // Aplica transformações (offset e scale)
    const x1 = portAPos.x * scale + offset.x;
    const y1 = portAPos.y * scale + offset.y;
    const x2 = portBPos.x * scale + offset.x;
    const y2 = portBPos.y * scale + offset.y;
    
    // Cor baseada no sinal
    const signalInfo = getSignalInfo(
      items, connections, portLabels, signalNames,
      conn.itemIdA, conn.portIndexA, conn.sideA
    );
    
    lines.push(
      <line
        key={conn.id}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={signalInfo?.color || '#6b7280'}
        strokeWidth={2}
        className="connection-line"
      />
    );
  });
  
  // Linha de drag (temporária)
  if (isDragging && dragStart && dragCurrent) {
    lines.push(
      <line
        key="drag-line"
        x1={dragStart.x}
        y1={dragStart.y}
        x2={dragCurrent.x}
        y2={dragCurrent.y}
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="5,5"
        className="drag-line"
      />
    );
  }
  
  return lines;
};
```

#### Estrutura de Renderização

```javascript
return (
  <div className="connection-workbench">
    <div className="workbench-header">
      <h3>Mesa de Fusão</h3>
      <div className="zoom-controls">
        <button onClick={() => setScale(s => Math.min(3, s * 1.2))}>+</button>
        <span>{(scale * 100).toFixed(0)}%</span>
        <button onClick={() => setScale(s => Math.max(0.1, s / 1.2))}>-</button>
      </div>
    </div>
    
    <div
      className="canvas-container"
      onMouseDown={handleMouseDownCanvas}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStartCanvas}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <svg className="connection-svg">
        {renderLines()}
      </svg>
      
      <div
        className="nodes-container"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
        }}
      >
        {getAllPorts().map(portInfo => (
          <div key={`${portInfo.itemId}-${portInfo.portIndex}-${portInfo.side}`}>
            <PortCircle portInfo={portInfo} />
            <SignalLabel portInfo={portInfo} />
          </div>
        ))}
      </div>
    </div>
  </div>
);
```

---

## Integração entre Componentes

### DetailPanel → ConnectionWorkbench
```javascript
// DetailPanel renderiza ConnectionWorkbench como uma aba
<ConnectionWorkbench
  item={item}
  items={items}
  connections={connections}
  portLabels={portLabels}
  signalNames={signalNames}
  saveConnection={saveConnection}
  deleteConnectionDB={deleteConnectionDB}
  onAlertRequest={onAlertRequest}
  saveItem={saveItem}
/>
```

### App.jsx → DetailPanel
```javascript
{selectedItemId && (
  <DetailPanel
    itemId={selectedItemId}
    items={items}
    connections={connections}
    portLabels={portLabels}
    signalNames={signalNames}
    close={() => setSelectedItemId(null)}
    // ... outros callbacks
  />
)}
```

---

## Otimizações

### 1. Memoização do ConnectionWorkbench
```javascript
export default memo(ConnectionWorkbench);
```

Evita re-renders desnecessários quando props não mudam.

### 2. Cálculo Eficiente de Portas
```javascript
const getAllPorts = useMemo(() => {
  // Calcula todas as portas uma vez
  const ports = [];
  
  // Portas do item principal
  for (let i = 0; i < item.ports; i++) {
    ports.push({ itemId: item.id, portIndex: i, side: 'A' });
    ports.push({ itemId: item.id, portIndex: i, side: 'B' });
  }
  
  // Portas de dispositivos internos
  internalDevices.forEach(device => {
    for (let i = 0; i < device.ports; i++) {
      ports.push({ itemId: device.id, portIndex: i, side: 'A' });
    }
  });
  
  return ports;
}, [item, internalDevices]);
```

### 3. Debounce em Pan/Zoom
```javascript
const debouncedSetOffset = useMemo(
  () => debounce(setOffset, 16), // ~60fps
  []
);
```

---

## Padrões de Código

### 1. Validação de Conexões
Sempre validar antes de criar conexão:
- Não conectar mesmo item
- Verificar se porta já está ocupada
- Validar tipos compatíveis

### 2. Feedback Visual
- Linhas tracejadas durante drag
- Cores baseadas em sinais
- Estados hover/active

### 3. Suporte Multi-plataforma
- Mouse events (desktop)
- Touch events (mobile)
- Fallbacks apropriados

---

## Troubleshooting Comum

### Canvas não responde
**Problema**: Eventos não disparam
**Solução**: Verificar z-index e pointer-events

### Conexões não aparecem
**Problema**: Linhas SVG fora da viewport
**Solução**: Ajustar viewBox do SVG dinamicamente

### Performance ruim com muitas portas
**Problema**: Muitos elementos DOM
**Solução**: Virtualização ou agrupamento

---

## Conclusão

Os componentes itemsProp são o coração da interface de edição do FTTH Manager:
- ✅ DetailPanel: Visualização hierárquica completa
- ✅ ConnectionWorkbench: Mesa de fusão interativa
- ✅ Drag-and-drop intuitivo
- ✅ Suporte touch para mobile
- ✅ Cálculos de potência em tempo real
- ✅ Integração perfeita com sistema de sinais

Ambos os componentes são altamente complexos mas bem estruturados, com separação clara de responsabilidades e otimizações apropriadas.
