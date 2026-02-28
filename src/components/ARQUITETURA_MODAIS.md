# Arquitetura dos Modais - FTTH Manager

## Visão Geral

O FTTH Manager possui **26 componentes modais** organizados em pastas individuais, cada um com seu próprio [index.jsx](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx) e arquivo de estilos CSS. Os modais seguem padrões consistentes de design e implementação.

## Organização

Todos os modais estão em `src/components/[NomeModal]/`:
- [index.jsx](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx) - Componente React
- `styles.css` ou `style.css` - Estilos específicos

## Categorização por Complexidade

### Modais Simples (< 50 linhas)
Componentes de apresentação pura, sem estado complexo.

#### AlertModal (20 linhas)
**Propósito**: Exibir mensagens de alerta ao usuário.

**Props**:
- `title`: Título do alerta
- `message`: Mensagem a exibir
- [onClose](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2327-2328): Callback ao fechar

**Estrutura**:
```jsx
<div className="alert-overlay">
  <div className="alert-card">
    <h3>{title}</h3>
    <p>{message}</p>
    <button onClick={onClose}>OK</button>
  </div>
</div>
```

**Uso**: Notificações, avisos, confirmações simples.

---

#### ConfirmModal
**Propósito**: Confirmação de ações destrutivas.

**Props**:
- `title`: Título da confirmação
- `message`: Mensagem explicativa
- [onConfirm](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2319-2324): Callback ao confirmar
- `onCancel`: Callback ao cancelar

**Padrão**: Botões "Cancelar" (cinza) e "Confirmar" (vermelho para ações destrutivas).

---

#### PortPickerModal (48 linhas)
**Propósito**: Seleção de porta livre em CTO.

**Props**:
- `ctoName`: Nome da CTO
- `availablePorts`: Array de portas livres
- `onSelect`: Callback com porta selecionada
- `onCancel`: Callback ao cancelar

**Funcionalidades**:
- Grid visual de portas
- Estado vazio (sem portas livres)
- Seleção por clique

**Estrutura**:
```jsx
<div className="ports-grid">
  {availablePorts.map(port => (
    <button onClick={() => onSelect(port)}>
      <div className="port-circle">{port.label}</div>
    </button>
  ))}
</div>
```

---

### Modais Médios (50-200 linhas)
Componentes com estado local e lógica de negócio moderada.

#### DuplicatesModal (125 linhas)
**Propósito**: Resolução de conflitos em importação KML.

**Props**:
- `conflicts`: Array de conflitos detectados
- [onConfirm](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2319-2324): Callback com itens a importar
- `onCancel`: Callback ao cancelar

**Estado**:
```javascript
const [decisions, setDecisions] = useState({});
// { itemId: boolean } - true = importar, false = ignorar
```

**Funcionalidades**:
1. **Decisão Individual**: Toggle por item
2. **Ações em Massa**:
   - "Ignorar Todos"
   - "Importar Todos"
3. **Visualização de Conflito**:
   - Item novo (KML)
   - Item existente (Mapa)
   - Razão do conflito (nome igual, coordenadas próximas)

**Lógica de Confirmação**:
```javascript
const handleConfirm = () => {
  const itemsToForceImport = conflicts
    .filter(c => decisions[c.newItem.id])
    .map(c => c.newItem);
  onConfirm(itemsToForceImport);
};
```

**UX**:
- Checkbox visual (Check/X)
- Cores: verde (importar), cinza (ignorar)
- Ícone de alerta para razão do conflito

---

#### ClientNameModal
**Propósito**: Entrada de nome de cliente ao criar conexão.

**Props**:
- [onConfirm](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2319-2324): Callback com nome digitado
- `onCancel`: Callback ao cancelar

**Estado**: Input controlado para nome.

---

#### NotesModal
**Propósito**: Edição de notas/observações de itens.

**Props**:
- `initialNotes`: Texto inicial
- [onSave](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#4752-4753): Callback com notas editadas
- [onClose](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2327-2328): Callback ao fechar

**Funcionalidades**:
- Textarea com auto-resize
- Contador de caracteres
- Salvar/Cancelar

---

### Modais Complexos (200+ linhas)
Componentes com múltiplos estados, validações e lógica avançada.

#### ImportModal (223 linhas)
**Propósito**: Configuração de importação KML (cores e regras de texto).

**Props**:
- `colors`: Objeto com cores detectadas no KML
- `itemCount`: Número de itens a importar
- [onClose](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2327-2328): Callback ao cancelar
- [onConfirm](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2319-2324): Callback com configurações

**Estados**:
```javascript
const [colorMappings, setColorMappings] = useState({});
// { kmlColor: 'POP' | 'CEO' | 'CTO' | ... }

const [textRules, setTextRules] = useState([]);
// [{ id, pattern, type }]
```

**Funcionalidades**:

1. **Mapeamento de Cores**:
   - Para cada cor KML detectada
   - Usuário escolhe tipo de item
   - Dropdown com tipos disponíveis

2. **Regras de Texto**:
   - Padrão de busca (ex: "POP")
   - Tipo a aplicar
   - Adicionar/Remover regras
   - Validação de padrões

**Lógica de Salvamento**:
```javascript
const handleSave = () => {
  setIsLoading(true);
  
  const config = {
    colorMappings,
    textRules: textRules.filter(r => r.pattern && r.type)
  };
  
  setTimeout(() => {
    onConfirm(config);
  }, 500); // Delay para UX
};
```

**Validações**:
- Cores sem mapeamento → aviso
- Regras vazias → filtradas
- Padrões duplicados → permitido (ordem importa)

---

#### ProjectManagerModal (548 linhas)
**Propósito**: Gerenciamento completo de projetos e colaboração.

**Props** (20 props!):
- `myProjects`: Projetos do usuário
- `sharedProjects`: Projetos compartilhados
- `pendingInvites`: Convites pendentes
- `outgoingInvites`: Convites enviados
- `incomingTransfers`: Transferências recebidas
- `activeProjectId`: Projeto ativo
- `visibleProjectIds`: Projetos visíveis
- `onCreateProject`: Criar projeto
- `onDeleteProject`: Deletar projeto
- `onRenameProject`: Renomear projeto
- `onToggleVisibility`: Mostrar/ocultar projeto
- `onFocusProject`: Focar projeto
- `onSetActive`: Definir projeto ativo
- `onBulkShare`: Compartilhar em massa
- `onBulkTransfer`: Transferir em massa
- `onRespondInvite`: Responder convite
- `onRevokeShare`: Revogar compartilhamento
- `onAcceptTransfer`: Aceitar transferência
- [onClose](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2327-2328): Fechar modal

**Estados**:
```javascript
const [newProjectName, setNewProjectName] = useState('');
const [editingId, setEditingId] = useState(null);
const [editName, setEditName] = useState('');
const [expandedSections, setExpandedSections] = useState({});
const [selectedProjects, setSelectedProjects] = useState([]);
const [bulkAction, setBulkAction] = useState('');
const [emailList, setEmailList] = useState([]);
const [emailInput, setEmailInput] = useState('');
```

**Funcionalidades**:

1. **CRUD de Projetos**:
   - Criar novo projeto
   - Renomear (inline editing)
   - Deletar (com confirmação)
   - Atalho Enter para salvar

2. **Visibilidade e Foco**:
   - Toggle visibilidade (Eye/EyeOff)
   - Definir projeto ativo (Target)
   - Focar projeto no mapa

3. **Seleção em Massa**:
   - Checkboxes por projeto
   - "Selecionar Todos"
   - Ações em lote:
     - Compartilhar
     - Transferir propriedade

4. **Compartilhamento**:
   - Input de múltiplos emails
   - Adicionar/Remover emails
   - Enter para adicionar
   - Lista visual de emails

5. **Convites e Transferências**:
   - Aceitar/Recusar convites
   - Revogar compartilhamentos
   - Aceitar transferências de propriedade

6. **Seções Expansíveis**:
   - Meus Projetos
   - Projetos Compartilhados
   - Convites Pendentes
   - Convites Enviados
   - Transferências Recebidas

**Lógica de Ações em Massa**:
```javascript
const executeBulkAction = () => {
  if (bulkAction === 'share') {
    onBulkShare(selectedProjects, emailList);
  } else if (bulkAction === 'transfer') {
    onBulkTransfer(selectedProjects, emailList[0]);
  }
  
  // Reset
  setSelectedProjects([]);
  setEmailList([]);
  setBulkAction('');
};
```

**Atalhos de Teclado**:
```javascript
const handleKeyDown = (e) => {
  if (e.key === 'Enter') {
    if (editingId) saveEdit(editingId);
    else if (newProjectName) handleCreate();
  }
  if (e.key === 'Escape') {
    setEditingId(null);
    setNewProjectName('');
  }
};
```

---

#### PhotoGalleryModal
**Propósito**: Galeria de fotos com upload e visualização.

**Funcionalidades**:
- Upload de múltiplas fotos
- Preview de imagens
- Zoom e navegação
- Deletar fotos
- Metadata (data, localização)

---

#### TagManagerModal
**Propósito**: Gerenciamento de tags do sistema.

**Funcionalidades**:
- Criar tags
- Editar nome e cor
- Deletar tags
- Visualizar itens usando cada tag

---

#### FixConnectionsModal
**Propósito**: Correção de conexões quebradas.

**Funcionalidades**:
- Lista de conexões inválidas
- Sugestões de correção
- Deletar conexões
- Reconectar automaticamente

---

## Padrões Comuns

### 1. Estrutura de Overlay
Todos os modais seguem o padrão:
```jsx
<div className="[modal-name]-overlay">
  <div className="[modal-name]-card">
    {/* Conteúdo */}
  </div>
</div>
```

**CSS**:
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}
```

### 2. Footer com Ações
```jsx
<div className="modal-footer">
  <button onClick={onCancel} className="btn-cancel">
    Cancelar
  </button>
  <button onClick={onConfirm} className="btn-confirm">
    Confirmar
  </button>
</div>
```

### 3. Validação de Entrada
```javascript
const handleConfirm = () => {
  if (!inputValue.trim()) {
    alert('Campo obrigatório');
    return;
  }
  onConfirm(inputValue);
};
```

### 4. Estado de Loading
```javascript
const [isLoading, setIsLoading] = useState(false);

const handleSave = async () => {
  setIsLoading(true);
  try {
    await onSave(data);
  } finally {
    setIsLoading(false);
  }
};
```

### 5. Atalhos de Teclado
```javascript
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') handleConfirm();
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

## Lista Completa de Modais

| # | Modal | Linhas | Complexidade | Propósito |
|---|-------|--------|--------------|-----------|
| 1 | AlertModal | 20 | Simples | Alertas e avisos |
| 2 | ConfirmModal | ~30 | Simples | Confirmação de ações |
| 3 | PortPickerModal | 48 | Simples | Seleção de porta CTO |
| 4 | ClientNameModal | ~50 | Simples | Nome de cliente |
| 5 | GenericModal | ~40 | Simples | Modal genérico reutilizável |
| 6 | InfoModal | ~35 | Simples | Informações gerais |
| 7 | DuplicatesModal | 125 | Médio | Resolução de conflitos KML |
| 8 | NotesModal | ~80 | Médio | Edição de notas |
| 9 | ClientModal | ~100 | Médio | Cadastro de cliente |
| 10 | EditModal | ~120 | Médio | Edição de propriedades |
| 11 | CreationModal | ~150 | Médio | Criação de itens |
| 12 | AddSlotModal | ~90 | Médio | Adicionar slot em DIO |
| 13 | SignalModal | ~110 | Médio | Configuração de sinais |
| 14 | TraceModal | ~130 | Médio | Rastreamento de sinal |
| 15 | StandardModal | ~100 | Médio | Padrões de nomenclatura |
| 16 | ImportModal | 223 | Complexo | Configuração de importação KML |
| 17 | ProjectManagerModal | 548 | Complexo | Gerenciamento de projetos |
| 18 | PhotoGalleryModal | ~200 | Complexo | Galeria de fotos |
| 19 | TagManagerModal | ~180 | Complexo | Gerenciamento de tags |
| 20 | FixConnectionsModal | ~160 | Complexo | Correção de conexões |
| 21 | NodeColorsModal | ~140 | Médio | Cores de nós |
| 22 | SettingsModal | ~200 | Complexo | Configurações gerais |
| 23 | ReportModal | ~150 | Médio | Geração de relatórios |
| 24 | TagSelector | ~70 | Simples | Seletor de tags |
| 25 | Dock | ~250 | Complexo | Painel lateral de ferramentas |
| 26 | ImageViewer | ~60 | Simples | Visualizador de imagens |

**Total estimado**: ~3500 linhas de código modal

## Integração com App.jsx

### Controle de Visibilidade
```javascript
// App.jsx
const [showAlertModal, setShowAlertModal] = useState(false);
const [alertData, setAlertData] = useState({ title: '', message: '' });

const openAlert = (title, message) => {
  setAlertData({ title, message });
  setShowAlertModal(true);
};

// Renderização
{showAlertModal && (
  <AlertModal
    title={alertData.title}
    message={alertData.message}
    onClose={() => setShowAlertModal(false)}
  />
)}
```

### Padrão de Callback
```javascript
const handleConfirmAction = async (data) => {
  setShowModal(false);
  
  try {
    await performAction(data);
    openAlert('Sucesso', 'Ação realizada com sucesso');
  } catch (error) {
    openAlert('Erro', error.message);
  }
};
```

## Otimizações

### 1. Lazy Loading
```javascript
const ProjectManagerModal = lazy(() => 
  import('./components/ProjectManagerModal')
);

// Uso
<Suspense fallback={<LoadingSpinner />}>
  {showProjectManager && <ProjectManagerModal {...props} />}
</Suspense>
```

### 2. Memoização
```javascript
const MemoizedModal = memo(AlertModal, (prev, next) => {
  return prev.title === next.title && prev.message === next.message;
});
```

### 3. Portal para Modais
```javascript
import { createPortal } from 'react-dom';

const Modal = ({ children }) => {
  return createPortal(
    <div className="modal-overlay">{children}</div>,
    document.body
  );
};
```

## Acessibilidade

### Boas Práticas Implementadas
- **Focus trap**: Foco permanece no modal
- **ESC para fechar**: Atalho universal
- **ARIA labels**: Títulos e descrições
- **Contraste**: Cores acessíveis

### Melhorias Sugeridas
- [ ] `role="dialog"` e `aria-modal="true"`
- [ ] `aria-labelledby` e `aria-describedby`
- [ ] Focus automático no primeiro input
- [ ] Restaurar foco ao fechar

## Temas (Dark/Light)

Os modais suportam tema escuro através de classes CSS:
```css
.dark .modal-card {
  background: #1f2937;
  color: #f9fafb;
}

.dark .btn-cancel {
  background: #374151;
  color: #d1d5db;
}
```

## Troubleshooting Comum

### Modal não fecha
**Problema**: Click no overlay não fecha
**Solução**: Verificar `stopPropagation` no card

### Scroll travado
**Problema**: Body continua scrollando
**Solução**: Adicionar `overflow: hidden` ao body quando modal aberto

### Z-index conflitos
**Problema**: Modal atrás de outros elementos
**Solução**: Usar z-index consistente (1000+)

## Código Comentado Observado

Nenhum código morto significativo foi identificado nos modais analisados. Os componentes estão limpos e bem mantidos.

## Conclusão

Os 26 modais do FTTH Manager seguem padrões consistentes e bem definidos:
- ✅ Organização clara (pasta por modal)
- ✅ Separação de responsabilidades
- ✅ Props bem definidas
- ✅ Estados locais apropriados
- ✅ Validações implementadas
- ✅ UX consistente

A arquitetura modal é sólida e escalável, facilitando manutenção e adição de novos modais.
