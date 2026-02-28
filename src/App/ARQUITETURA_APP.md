# Arquitetura do FTTH Manager - App Principal

## Visão Geral

O [App/index.jsx](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx) é o componente principal do sistema FTTH Manager, responsável por gerenciar toda a lógica de negócio, estado global e renderização da interface. Este documento explica a arquitetura e organização do código.

## Estrutura do Arquivo (4857 linhas)

### 1. Imports (Linhas 1-80)
- **React Hooks**: useState, useRef, useEffect, useMemo, useCallback, memo
- **Ícones**: Lucide React (40+ ícones)
- **Bibliotecas**: uuid, react-leaflet, Firebase
- **Componentes**: 26 modais + componentes auxiliares
- **Utilitários**: constants.js, utils.js, backupSystem.js

### 2. Componentes Memoizados (Linhas 81-600)

#### DropLine (Linha ~81)
Renderiza linhas de drop (conexões de clientes) no Canvas com otimização de performance.

#### CanvasNodes (Linha ~100)
Componente memoizado que renderiza nós individuais (POP, CEO, CTO, etc) no Canvas.
- **Otimização**: Compara props específicas para evitar re-renders desnecessários
- **Funcionalidades**: Drag & drop, toolbar de ações, seleção

#### CableLine (Linha ~300)
Renderiza cabos entre nós com suporte a múltiplos cabos curvados.
- **Otimização**: Memoização com comparação de props
- **Funcionalidades**: Seleção, edição, exclusão, tooltip com ações

#### DebouncedInput (Linha ~500)
Input com debounce para otimizar buscas e evitar chamadas excessivas.

### 3. Estados do Aplicativo (Linhas 600-700)

#### Estados de Autenticação e Usuário
```javascript
const [user, setUser] = useState(null);              // Usuário autenticado (Firebase Auth)
const [userRole, setUserRole] = useState('ADMIN');   // Papel do usuário no sistema
```

#### Estados de Projetos e Colaboração
```javascript
const [myProjects, setMyProjects] = useState([]);           // Projetos próprios
const [sharedProjects, setSharedProjects] = useState([]);   // Projetos compartilhados
const [activeProjectId, setActiveProjectId] = useState(null); // Projeto ativo (caneta)
const [projectOwnerId, setProjectOwnerId] = useState(null);   // Dono do projeto ativo
const [visibleProjectIds, setVisibleProjectIds] = useState([]); // Projetos visíveis (olho)
```

#### Estados de Dados
```javascript
const [items, setItems] = useState([]);           // Todos os itens (nós, cabos, clientes)
const [connections, setConnections] = useState([]); // Conexões (fusões, drops, patch cords)
const [portLabels, setPortLabels] = useState({}); // Labels customizados de portas
const [signalNames, setSignalNames] = useState({}); // Configurações de sinais
```

#### Estados de Interface
```javascript
const [viewMode, setViewMode] = useState('CANVAS');     // 'CANVAS' ou 'MAP'
const [interactionMode, setInteractionMode] = useState('SELECT'); // Modo de interação
const [isDarkMode, setIsDarkMode] = useState(false);    // Tema escuro/claro
const [scale, setScale] = useState(1);                  // Zoom do canvas
const [pan, setPan] = useState({ x: 0, y: 0 });        // Posição do canvas
```

#### Estados de Filtros e Tags
```javascript
const [filterTags, setFilterTags] = useState([]);       // Tags selecionadas para filtro
const [filterMode, setFilterMode] = useState('OR');     // Modo de filtro: OR, AND, EXACT
const [availableTags, setAvailableTags] = useState([]); // Tags disponíveis globalmente
```

### 4. useEffect Hooks (Linhas 700-1000)

#### Listener de Autenticação (Linha ~605)
```javascript
useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        // Limpa estados se logout
    });
    return () => unsubscribe();
}, []);
```
**Propósito**: Monitora mudanças no estado de autenticação do Firebase.

#### Gerenciamento de Tema (Linhas ~622-629)
```javascript
useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}, [isDarkMode]);
```
**Propósito**: Aplica/remove classe CSS para tema dark mode.

#### Carregamento de Projetos (Linha ~632)
```javascript
useEffect(() => {
    if (!user) return;
    // Listener para projetos próprios
    // Listener para projetos compartilhados
    // Listener para convites pendentes
}, [user]);
```
**Propósito**: Carrega lista de projetos do usuário e convites.

#### Carregamento de Dados por Projeto (Linha ~715)
```javascript
useEffect(() => {
    if (!user || visibleProjectIds.length === 0) return;
    
    visibleProjectIds.forEach(pid => {
        // Listener para items
        // Listener para connections
        // Listener para settings
    });
}, [user, visibleProjectIds]);
```
**Propósito**: Carrega dados (items, connections, settings) de cada projeto visível.

#### Configurações Globais do Usuário (Linha ~760)
```javascript
useEffect(() => {
    if (!projectOwnerId) return;
    // Listener para tags globais
    // Listener para cores de nós
    // Listener para padrões de cabos
}, [projectOwnerId]);
```
**Propósito**: Carrega configurações globais do dono do projeto ativo.

#### Processamento de Cache (Linha ~809)
```javascript
useEffect(() => {
    // Processa projectDataCache
    // Mescla dados de múltiplos projetos
}, [projectDataCache]);
```
**Propósito**: Otimiza carregamento mesclando dados de cache.

#### Centralização Automática (Linha ~852)
```javascript
useEffect(() => {
    if (shouldAutoCenter && items.length > 0) {
        // Calcula bounds e centraliza canvas
    }
}, [items, shouldAutoCenter]);
```
**Propósito**: Centraliza automaticamente o canvas quando há novos itens.

#### Busca e Sugestões (Linha ~885)
```javascript
useEffect(() => {
    if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
    }
    // Filtra itens por nome
    // Gera sugestões
}, [searchTerm, items, searchMode]);
```
**Propósito**: Gera sugestões de busca em tempo real.

#### Atalhos de Teclado (Linha ~946)
```javascript
useEffect(() => {
    const handleKeyDown = (e) => {
        // Space: SELECT mode
        // Shift: BOX_SELECT mode
        // M: Toggle MAP/CANVAS
        // Delete: Excluir selecionados
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, [viewMode]);
```
**Propósito**: Implementa atalhos de teclado globais.

### 5. Funções de Gerenciamento de Projetos (Linhas 1000-1800)

#### handleCreateProject
Cria novo projeto no Firestore com estrutura inicial.

#### handleDeleteProject
Deleta projeto e todas as subcoleções (items, connections, settings).

#### handleRenameProject
Renomeia projeto e atualiza convites relacionados.

#### handleToggleProjectVisibility
Alterna visibilidade do projeto (olho aberto/fechado).

#### handleSetActiveProject
Define projeto ativo (caneta) com toggle on/off.

#### handleShareProject / handleBulkShare
Envia convites para compartilhar projetos com outros usuários.

#### handleBulkTransfer
Transfere propriedade de múltiplos projetos para outro usuário.

#### handleAcceptTransfer
Aceita transferência de projeto, movendo todos os dados para o novo dono.

### 6. Funções de Manipulação de Dados (Linhas 1800-2500)

#### saveItem
Salva item no Firestore com lógica inteligente de herança de projeto.
- Edição: mantém projeto original
- Novo item com parent: herda projeto do pai
- Fallback: usa projeto ativo

#### saveConnection
Salva conexão determinando projeto correto baseado no item de origem.

#### deleteItemDB / batchDelete
Exclusão de itens com limpeza de dependências:
- Remove filhos recursivamente
- Remove cabos conectados
- Limpa conexões órfãs
- Remove sinais e labels
- **NOVO**: Remove fotos do Storage

#### updateLabelDB / updateSignalDB
Atualiza labels e sinais descobrindo automaticamente o projeto correto.

### 7. Funções de Interface (Linhas 2500-3500)

#### handleModalSubmit
Processa criação de itens via modal com projeção Canvas→Mapa.

#### handleSelectSuggestion
Navega para item selecionado na busca.

#### handleCanvasClick
Gerencia cliques no canvas para adicionar nós/clientes.

#### handleStart / handleMove / handleEnd
Gerenciam interações de mouse/touch (pan, zoom, drag).

#### handleWheel
Zoom suave com roda do mouse centrado no cursor.

### 8. Funções Avançadas (Linhas 3500-4000)

#### handleTraceSignal
Rastreia caminho de sinal desde um ponto até a OLT.
- Segue conexões recursivamente
- Identifica fonte de sinal
- Gera relatório visual

#### handleOTDR
Localiza ponto físico em cabo baseado em distância medida.
- Calcula metragem usando Haversine
- Percorre waypoints
- Centraliza mapa no ponto encontrado

#### splitCable / executeSplitCable
Secciona cabo criando caixa de emenda no meio.
- Opção cara-a-cara (fusão automática)
- Preserva conexões externas

#### handlePhotoUpload / handlePhotoDelete
Gerencia fotos de itens no Firebase Storage.
- Upload com path correto do dono
- Exclusão com fallback para fotos fantasma

### 9. Importação/Exportação (Linhas 4000-4200)

#### handleFileImport
Importa KML com análise de duplicatas.

#### processImportConfiguration
Configura fibras e cores de cabos importados.

#### saveImportedData
Salva itens importados após correções.

#### downloadKML
Exporta projeto para formato KML.

### 10. Renderização (Linhas 4200-4857)

#### Estrutura Principal
```
<div> (Container principal)
  ├─ Canvas ou Mapa (modo alternável)
  ├─ Barra de Busca
  ├─ Painel de Filtros
  ├─ Dock (ferramentas)
  ├─ DetailPanel (lateral)
  └─ 26+ Modais
```

## Otimizações de Performance

### 1. Memoização de Componentes
- `CanvasNodes`, `CableLine`, `DropLine` são memoizados
- Comparação específica de props para evitar re-renders

### 2. useMemo para Cálculos Pesados
```javascript
const cableGroups = useMemo(() => {
    // Agrupa cabos entre mesmos nós
}, [items]);

const visibleItems = useMemo(() => {
    // Filtra itens por tags
}, [items, filterTags, filterMode]);
```

### 3. Debounce em Inputs
- Busca com delay de 200ms
- Evita chamadas excessivas

### 4. Batching de Operações Firestore
- Batch writes limitados a 450 operações
- Chunks para grandes volumes

## Fluxo de Dados

```
Firebase Auth → user
    ↓
Firestore Projects → myProjects, sharedProjects
    ↓
visibleProjectIds → Listeners de dados
    ↓
items, connections, settings → Estado local
    ↓
Renderização (Canvas/Mapa)
```

## Padrões de Código

### 1. Salvamento Inteligente
Funções [saveItem](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#1400-1445) e [saveConnection](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#1460-1482) descobrem automaticamente:
- Projeto correto (herança, edição, ativo)
- Dono correto (próprio ou compartilhado)

### 2. Limpeza Automática
Exclusões removem:
- Itens filhos recursivamente
- Conexões dependentes
- Configurações relacionadas
- Arquivos no Storage

### 3. Multi-projeto
Sistema suporta:
- Múltiplos projetos visíveis simultaneamente
- Colaboração em tempo real
- Transferência de propriedade

## Próximos Passos de Refatoração

1. ✅ Remover código morto
2. ✅ Documentar arquitetura
3. ⏳ Adicionar comentários críticos inline
4. ⏳ Considerar divisão em hooks customizados
5. ⏳ Extrair lógica de negócio para services
