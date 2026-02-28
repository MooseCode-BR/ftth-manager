# Arquitetura dos Utilitários - FTTH Manager

## Visão Geral

Os arquivos utilitários fornecem funcionalidades essenciais para o FTTH Manager, incluindo cálculos de sinal, exportação/importação KML, sistema de backup/restore e geração de relatórios PDF.

## Arquivos Documentados

1. **utils.js** (834 linhas, 20 funções) - Utilitários gerais
2. **backupSystem.js** (407 linhas, 9 funções) - Backup e restore
3. **pdfGenerator.js** (213 linhas, 5 funções) - Geração de PDFs

---

# 1. utils.js - Utilitários Gerais

## Imports
- `ATTENUATION` de `./constants` - Valores de atenuação para cálculos
- `tokml` - Biblioteca para conversão GeoJSON → KML

## Funções Principais

### 1.1 findConnection
**Propósito**: Busca conexões de cabos em nós específicos.

**Assinatura**:
```javascript
findConnection(connections, itemId, portId, side = 'A')
```

**Parâmetros**:
- `connections`: Array de todas as conexões
- `itemId`: ID do item (nó ou cabo)
- `portId`: ID da porta
- `side`: Lado da conexão ('A' ou 'B')

**Retorno**: Objeto de conexão encontrado ou `undefined`

**Uso**: Fundamental para rastreamento de sinais e fusões.

---

### 1.2 getSignalInfo
**Propósito**: Rastreia informações de sinal através da rede FTTH.

**Assinatura**:
```javascript
getSignalInfo(items, connections, portLabels, signalConfigs, itemId, portId, side = 'A', visited = new Set())
```

**Parâmetros**:
- `items`: Todos os itens da rede
- `connections`: Todas as conexões
- `portLabels`: Labels customizados de portas
- `signalConfigs`: Configurações de sinais
- `itemId`: ID do item inicial
- `portId`: Porta inicial
- `side`: Lado inicial ('A' ou 'B')
- `visited`: Set para evitar loops infinitos

**Retorno**: Objeto com informações do sinal:
```javascript
{
    name: string,      // Nome do sinal
    color: string,     // Cor do sinal
    sourceId: string,  // ID da fonte
    sourceName: string // Nome da fonte
}
```

**Algoritmo**:
1. Verifica se já visitou este nó (prevenção de loops)
2. Busca conexão na porta especificada
3. Se encontrou, navega para o próximo item
4. Continua recursivamente até encontrar a fonte do sinal
5. Retorna informações agregadas

**Complexidade**: O(N) onde N é o número de saltos até a fonte

---

### 1.3 calculatePower
**Propósito**: Calcula potência óptica considerando atenuações.

**Assinatura**:
```javascript
calculatePower(items, connections, itemId, portId, side = 'A', visited = new Set())
```

**Parâmetros**: Similares a [getSignalInfo](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/utils.js#9-105)

**Retorno**: Objeto com cálculos de potência:
```javascript
{
    power: number,           // Potência final (dBm)
    totalAttenuation: number, // Atenuação total (dB)
    path: Array              // Caminho percorrido
}
```

**Algoritmo**:
1. Inicia com potência da fonte (OLT)
2. Para cada segmento:
   - Calcula distância do cabo
   - Aplica atenuação por km
   - Aplica atenuação de fusões
   - Aplica atenuação de splitters
3. Retorna potência final e caminho

**Fórmula**:
```
Potência Final = Potência Inicial - Σ(Atenuações)
Atenuação = (Distância × Atenuação/km) + Fusões + Splitters
```

---

## Exportação KML

### 1.4 hexToKmlColor
**Propósito**: Converte cor HEX (#RRGGBB) para formato KML (aabbggrr).

**Assinatura**:
```javascript
hexToKmlColor(hex)
```

**Exemplo**:
```javascript
hexToKmlColor('#FF5733') // → 'ff3357ff'
```

**Lógica**: Inverte ordem RGB → BGR e adiciona alpha (ff = opaco)

---

### 1.5 generateCableDescription
**Propósito**: Gera descrição HTML do mapa de sinais do cabo.

**Assinatura**:
```javascript
generateCableDescription(cable, allItems, connections, signalConfigs)
```

**Retorno**: String HTML com tabela fibra-a-fibra

**Formato**:
```html
<table>
  <tr><th>Fibra</th><th>Sinal A</th><th>Sinal B</th></tr>
  <tr><td>1</td><td>OLT-1</td><td>Cliente-A</td></tr>
  ...
</table>
```

---

### 1.6 generateNodeDescription
**Propósito**: Gera plano de fusão do nó (mapa de conexões).

**Assinatura**:
```javascript
generateNodeDescription(node, allItems, connections, signalConfigs)
```

**Retorno**: String HTML com tabela de fusões

**Formato**:
```html
<h3>Plano de Fusão - [Nome do Nó]</h3>
<table>
  <tr><th>Cabo</th><th>Fibra</th><th>→</th><th>Cabo</th><th>Fibra</th></tr>
  <tr><td>Cabo-1</td><td>1</td><td>→</td><td>Cabo-2</td><td>3</td></tr>
  ...
</table>
```

---

### 1.7 downloadKML
**Propósito**: Exporta projeto para arquivo KML (Google Earth).

**Assinatura**:
```javascript
downloadKML(nodes, cables, connections, signalConfigs, allItems)
```

**Processo**:
1. **Cria GeoJSON**:
   - Nós → Point features
   - Cabos → LineString features
2. **Adiciona Metadados**:
   - Nome, tipo, cor
   - Descrições HTML (fusões, sinais)
3. **Converte para KML** usando `tokml`
4. **Baixa arquivo** via blob URL

**Estrutura GeoJSON**:
```javascript
{
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        name: "POP-1",
        description: "<html>...</html>",
        stroke: "#ff0000",
        fill: "#ff0000"
      }
    },
    ...
  ]
}
```

---

## Importação KML

### 1.8 kmlColorToHex
**Propósito**: Converte cor KML (aabbggrr) para HEX (#rrggbb).

**Inverso de**: [hexToKmlColor](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/utils.js#179-198)

---

### 1.9 guessTypeByName
**Propósito**: Tenta adivinhar tipo do item pelo nome.

**Assinatura**:
```javascript
guessTypeByName(name)
```

**Lógica**:
```javascript
if (name.includes('POP')) return 'POP';
if (name.includes('CEO')) return 'CEO';
if (name.includes('CTO')) return 'CTO';
if (name.includes('CLIENTE')) return 'CLIENT';
// ... etc
return 'NODE'; // Padrão
```

---

### 1.10 parseKMLImport
**Propósito**: Processa arquivo KML e converte para estrutura do app.

**Assinatura**:
```javascript
parseKMLImport(kmlText)
```

**Retorno**:
```javascript
{
  items: Array,      // Nós e cabos importados
  connections: Array // Conexões inferidas
}
```

**Algoritmo Complexo**:

1. **Parse XML**:
   ```javascript
   const parser = new DOMParser();
   const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
   ```

2. **Extrai Placemarks**:
   - Percorre estrutura de pastas
   - Identifica Points (nós) e LineStrings (cabos)

3. **Processa Nós**:
   ```javascript
   {
     id: uuid(),
     name: placemark.name,
     type: guessTypeByName(name),
     lat: coordinates[1],
     lng: coordinates[0],
     color: kmlColorToHex(style.color)
   }
   ```

4. **Processa Cabos**:
   - Extrai coordenadas de início e fim
   - Busca nós mais próximos (função [findNearestNode](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/utils.js#654-666))
   - Cria waypoints para pontos intermediários

5. **Infere Conexões**:
   - Analisa descrições HTML
   - Busca padrões de fusão
   - Cria objetos de conexão

**Função Auxiliar - findNearestNode**:
```javascript
findNearestNode(lat, lng) {
  let minDist = Infinity;
  let nearest = null;
  
  for (const node of nodes) {
    const dist = getDistanceInMeters(lat, lng, node.lat, node.lng);
    if (dist < minDist && dist < 50) { // Threshold de 50m
      minDist = dist;
      nearest = node;
    }
  }
  
  return nearest;
}
```

---

### 1.11 findNearbyCandidates
**Propósito**: Busca N candidatos mais próximos de uma coordenada.

**Assinatura**:
```javascript
findNearbyCandidates(targetLat, targetLng, allNodes, limit = 3)
```

**Retorno**: Array de objetos:
```javascript
[
  { node: {...}, distance: 45.2 },
  { node: {...}, distance: 67.8 },
  { node: {...}, distance: 102.5 }
]
```

**Uso**: Resolução de duplicatas em importação KML

---

### 1.12 analyzeDuplicates
**Propósito**: Analisa duplicatas entre itens novos e existentes.

**Assinatura**:
```javascript
analyzeDuplicates(newItems, existingItems)
```

**Retorno**:
```javascript
{
  exactMatches: Array,    // Nomes idênticos
  nearMatches: Array,     // Coordenadas próximas (< 10m)
  unique: Array           // Itens únicos
}
```

**Algoritmo**:
1. Para cada item novo:
   - Busca nome exato em existentes
   - Se não encontrou, busca coordenadas próximas
   - Classifica como exact/near/unique

---

## Cálculos Geográficos

### 1.13 getDistanceInMeters
**Propósito**: Calcula distância entre dois pontos GPS.

**Assinatura**:
```javascript
getDistanceInMeters(lat1, lon1, lat2, lon2)
```

**Fórmula**: Haversine

```javascript
const R = 6371000; // Raio da Terra em metros
const φ1 = lat1 * Math.PI / 180;
const φ2 = lat2 * Math.PI / 180;
const Δφ = (lat2 - lat1) * Math.PI / 180;
const Δλ = (lon2 - lon1) * Math.PI / 180;

const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
          
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
const distance = R * c;
```

**Precisão**: ±0.5% para distâncias < 1000km

---

### 1.14 calculateCableLength
**Propósito**: Calcula comprimento total de um cabo (com waypoints).

**Assinatura**:
```javascript
calculateCableLength(cable, allItems)
```

**Algoritmo**:
1. Busca nós de início e fim
2. Cria array de pontos: [início, ...waypoints, fim]
3. Soma distâncias entre pontos consecutivos

**Exemplo**:
```javascript
const cable = {
  fromNode: 'node-1',
  toNode: 'node-2',
  waypoints: [
    { lat: -23.5, lng: -46.6 },
    { lat: -23.51, lng: -46.61 }
  ]
};

const length = calculateCableLength(cable, allItems);
// → 245.7 (metros)
```

---

### 1.15 deleteNodeImages
**Propósito**: Apaga imagens do Firebase Storage ao deletar nó.

**Assinatura**:
```javascript
deleteNodeImages(node)
```

**Processo**:
1. Itera sobre `node.photos`
2. Para cada foto com `path`:
   ```javascript
   const storageRef = ref(storage, photo.path);
   await deleteObject(storageRef);
   ```
3. Trata erros silenciosamente (imagem já deletada)

---

# 2. backupSystem.js - Backup e Restore

## Imports
- Firebase Firestore: `writeBatch`, `doc`, `collection`, `getDocs`, `query`
- Firebase Storage: `ref`, `uploadBytes`, `getDownloadURL`
- `JSZip` - Criação e leitura de arquivos ZIP

## Funções Principais

### 2.1 generateBackupFile
**Propósito**: Gera arquivo ZIP de backup com dados e imagens.

**Assinatura**:
```javascript
generateBackupFile(data, visibleProjects)
```

**Parâmetros**:
- `data`: Objeto com items, connections, settings
- `visibleProjects`: Array de projetos a fazer backup

**Processo Detalhado**:

1. **Cria ZIP**:
   ```javascript
   const zip = new JSZip();
   const imgFolder = zip.folder("images");
   ```

2. **Filtra Dados do Projeto**:
   ```javascript
   const projectItems = items.filter(i => i._projectId === project.id);
   const projectConnections = connections.filter(c => c._projectId === project.id);
   ```

3. **Baixa e Empacota Imagens**:
   ```javascript
   for (const photo of item.photos) {
     const blob = await fetchImageBlob(photo.url);
     const zipFileName = `${item.id}_${photo.id}.jpg`;
     imgFolder.file(zipFileName, blob);
     photo.backupFileName = zipFileName; // Referência local
   }
   ```

4. **Cria JSON de Metadados**:
   ```javascript
   const backupObject = {
     meta: {
       appName: "FTTH Manager",
       version: "0.4.0 (ZipImages)",
       createdAt: new Date().toISOString(),
       projectName: project.name,
       totalItems: projectItems.length
     },
     data: {
       items: itemsWithLocalRefs,
       connections: projectConnections,
       settings: { tags, signals, portLabels, nodeColors }
     }
   };
   ```

5. **Gera e Baixa ZIP**:
   ```javascript
   zip.file("data.json", JSON.stringify(backupObject, null, 2));
   const zipContent = await zip.generateAsync({ type: "blob" });
   // Download via blob URL
   ```

**Estrutura do ZIP**:
```
projeto.zip
├── data.json
└── images/
    ├── node-1_photo-1.jpg
    ├── node-1_photo-2.jpg
    ├── node-2_photo-1.jpg
    └── ...
```

---

### 2.2 restoreFromBackup
**Propósito**: Restaura projeto a partir de arquivo ZIP.

**Assinatura**:
```javascript
restoreFromBackup(file, projectOwnerId, targetProjectId, onProgress)
```

**Parâmetros**:
- [file](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2333-2452): Arquivo ZIP de backup
- `projectOwnerId`: ID do dono do projeto
- `targetProjectId`: ID do projeto destino
- `onProgress`: Callback de progresso [(message, percent) => {}](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#543-4894)

**Processo Complexo**:

1. **Lê ZIP**:
   ```javascript
   const zip = new JSZip();
   const loadedZip = await zip.loadAsync(file);
   const content = await loadedZip.file("data.json").async("string");
   const parsed = JSON.parse(content);
   ```

2. **Limpa Projeto** (Wipe):
   ```javascript
   await wipeProjectDatabase(projectOwnerId, targetProjectId);
   ```

3. **Restaura Itens e Re-upa Imagens**:
   ```javascript
   for (const item of items) {
     if (item.photos) {
       for (const photo of item.photos) {
         if (photo.backupFileName) {
           // Extrai do ZIP
           const photoBlob = await loadedZip
             .file(`images/${photo.backupFileName}`)
             .async("blob");
           
           // Re-upa para Firebase Storage
           const storagePath = `users/${projectOwnerId}/images/${item.id}/${Date.now()}_${photo.backupFileName}`;
           const storageRef = ref(storage, storagePath);
           const snapshot = await uploadBytes(storageRef, photoBlob);
           const newUrl = await getDownloadURL(snapshot.ref);
           
           // Atualiza URL
           photo.url = newUrl;
           photo.path = storagePath;
         }
         
         // CRÍTICO: Remove campos temporários
         delete photo.backupFileName;
         delete photo.originalUrl;
       }
     }
     
     // Salva item no Firestore
     await dbActionSave(doc(db, `${projectPath}/items`, item.id), cleanItem);
   }
   ```

4. **Restaura Conexões** (Batch):
   ```javascript
   await batchSaveHelper(connections, `${projectPath}/connections`);
   ```

5. **Restaura Configurações**:
   ```javascript
   const batchSettings = writeBatch(db);
   batchSettings.set(doc(db, `${projectPath}/settings`, 'tags'), tagsObj);
   batchSettings.set(doc(db, `${projectPath}/settings`, 'signals'), signals);
   // ... etc
   await batchSettings.commit();
   ```

**Progresso Reportado**:
- 10%: Estrutura lida
- 20-70%: Restaurando itens e imagens
- 75%: Restaurando conexões
- 90%: Restaurando configurações
- 100%: Concluído

---

### 2.3 dbActionSave (Helper)
**Propósito**: Salva documento único no Firestore.

**Uso**: Garantir upload síncrono de fotos durante restore.

---

### 2.4 batchSaveHelper (Helper)
**Propósito**: Salva lista de documentos em lotes.

**Lógica**:
```javascript
const CHUNK_SIZE = 400; // Limite do Firestore
for (let i = 0; i < list.length; i += CHUNK_SIZE) {
  const batch = writeBatch(db);
  const chunk = list.slice(i, i + CHUNK_SIZE);
  chunk.forEach(obj => {
    batch.set(doc(db, collectionPath, obj.id), cleanObj);
  });
  await batch.commit();
}
```

---

### 2.5 wipeProjectDatabase (Helper)
**Propósito**: Limpa todos os dados de um projeto.

**Processo**:
1. Deleta todos os itens
2. Deleta todas as conexões
3. Deleta todas as configurações

**Uso**: Preparar projeto para restore limpo.

---

### 2.6 batchDeleteHelper (Helper)
**Propósito**: Deleta documentos em lotes.

**Similar a**: [batchSaveHelper](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/backupSystem.js#367-380), mas usa `batch.delete()`

---

## Observações sobre Código Comentado

**backupSystem.js** contém ~118 linhas comentadas (linhas 120-237):
- Versão antiga de [restoreFromBackup](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/backupSystem.js#232-357)
- Mantida para referência histórica
- Diferenças principais:
  - Tratamento de `undefined` em campos temporários
  - Lógica de fallback para URLs originais
- **Recomendação**: Pode ser removida após validação completa da versão atual

---

# 3. pdfGenerator.js - Geração de Relatórios

## Imports
- `jsPDF` - Biblioteca para criação de PDFs
- `jspdf-autotable` - Plugin para tabelas

## Funções Principais

### 3.1 loadImage (Helper)
**Propósito**: Carrega imagem, corrige rotação EXIF e converte para Base64.

**Assinatura**:
```javascript
loadImage(url)
```

**Retorno**: Promise com:
```javascript
{
  data: string,    // DataURL Base64
  width: number,   // Largura original
  height: number   // Altura original
}
```

**Processo**:
1. **Cria Image**:
   ```javascript
   const img = new Image();
   img.crossOrigin = 'Anonymous'; // CORS para Firebase
   img.src = url;
   ```

2. **Re-desenha em Canvas** (Remove EXIF):
   ```javascript
   const canvas = document.createElement('canvas');
   canvas.width = img.naturalWidth;
   canvas.height = img.naturalHeight;
   ctx.drawImage(img, 0, 0);
   ```

3. **Converte para DataURL**:
   ```javascript
   const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% qualidade
   ```

**Por que Canvas?**
- Remove metadados EXIF (rotação automática)
- Garante orientação correta no PDF
- Comprime imagem (qualidade 0.7)

---

### 3.2 generateNodeReport
**Propósito**: Gera relatório PDF completo de um nó.

**Assinatura**:
```javascript
generateNodeReport(node, allItems)
```

**Estrutura do PDF**:

#### Cabeçalho
```
┌─────────────────────────────────┐
│        [Nome do Nó]             │
│  Tipo: CTO | Gerado em: 16/02   │
│  Localização: -23.5, -46.6      │
└─────────────────────────────────┘
```

#### Tabela 1: Equipamentos Internos
```
┌──────────────┬──────┬──────────┐
│ Nome         │ Tipo │ Detalhes │
├──────────────┼──────┼──────────┤
│ Splitter-1   │ DIO  │ 8 portas │
│ ONU-Cliente  │ ONU  │ -        │
└──────────────┴──────┴──────────┘
```

#### Tabela 2: Cabos Conectados
```
┌────────────┬──────────────┬────────────┐
│ Nome Cabo  │ Conectado a  │ Capacidade │
├────────────┼──────────────┼────────────┤
│ Cabo-1     │ POP-Central  │ 12 fibras  │
│ Cabo-2     │ CTO-Vizinho  │ 6 fibras   │
└────────────┴──────────────┴────────────┘
```

#### Galeria de Imagens
```
┌──────────────┬──────────────┐
│   [Foto 1]   │   [Foto 2]   │
│  16/02/2026  │  16/02/2026  │
├──────────────┼──────────────┤
│   [Foto 3]   │   [Foto 4]   │
│  15/02/2026  │  15/02/2026  │
└──────────────┴──────────────┘
```

**Lógica de Paginação**:
```javascript
let currentY = 20; // Cursor vertical

// Verifica se precisa quebrar página
if (currentY + boxHeight > 280) {
  doc.addPage();
  currentY = 20;
}
```

**Grid de Imagens**:
- 2 colunas
- Largura da caixa: 80mm
- Altura da caixa: 60mm
- Gap: 15mm
- Aspect ratio preservado

**Aspect Ratio**:
```javascript
const ratio = Math.min(boxWidth / imgObj.width, boxHeight / imgObj.height);
const finalWidth = imgObj.width * ratio;
const finalHeight = imgObj.height * ratio;

// Centraliza na caixa
const xCentered = xPos + (boxWidth - finalWidth) / 2;
const yCentered = currentY + (boxHeight - finalHeight) / 2;
```

**Cores das Tabelas**:
- Equipamentos: Azul `[59, 130, 246]`
- Cabos: Laranja `[245, 158, 11]`

---

## Observações sobre Código Comentado

**pdfGenerator.js** contém ~18 linhas comentadas (linhas 90-97, 132-139):
- Blocos `else` para mensagens "Nenhum item cadastrado"
- **Motivo**: Decisão de design - não mostrar mensagens vazias
- **Recomendação**: Pode ser removido (não afeta funcionalidade)

---

# Fluxos de Integração

## Fluxo de Backup
```
App.jsx
  ↓
generateBackupFile()
  ↓
1. Filtra dados do projeto
2. Baixa imagens do Firebase
3. Empacota em ZIP
4. Cria data.json
5. Download do arquivo
```

## Fluxo de Restore
```
App.jsx
  ↓
restoreFromBackup()
  ↓
1. Lê ZIP
2. Limpa projeto (wipe)
3. Para cada item:
   - Extrai imagens do ZIP
   - Re-upa para Firebase Storage
   - Salva item no Firestore
4. Restaura conexões (batch)
5. Restaura configurações
```

## Fluxo de Exportação KML
```
App.jsx
  ↓
downloadKML()
  ↓
1. Cria GeoJSON
2. Para cada nó/cabo:
   - Gera descrição HTML
   - Adiciona propriedades
3. Converte GeoJSON → KML (tokml)
4. Download do arquivo
```

## Fluxo de Importação KML
```
App.jsx
  ↓
parseKMLImport()
  ↓
1. Parse XML
2. Extrai Placemarks
3. Para cada Placemark:
   - Identifica tipo (Point/LineString)
   - Cria item
   - Busca nós próximos (cabos)
4. Analisa duplicatas
5. Retorna items e connections
```

## Fluxo de Geração de PDF
```
App.jsx
  ↓
generateNodeReport()
  ↓
1. Cria jsPDF
2. Adiciona cabeçalho
3. Gera tabelas (autoTable)
4. Para cada foto:
   - Carrega via loadImage()
   - Processa em canvas
   - Adiciona ao PDF
5. Download do arquivo
```

---

# Otimizações e Boas Práticas

## Backup System
- **Batching**: Usa lotes de 400 docs (limite Firestore)
- **Async/Await**: Upload síncrono de imagens para garantir integridade
- **Cleanup**: Remove campos temporários antes de salvar no Firestore
- **Progress**: Callbacks detalhados para UX

## PDF Generator
- **Compressão**: Imagens em 70% qualidade
- **Canvas**: Remove metadados EXIF
- **Paginação**: Quebra automática de páginas
- **Aspect Ratio**: Preserva proporções das imagens

## Utils
- **Memoização**: Set `visited` evita loops infinitos
- **Haversine**: Cálculo preciso de distâncias GPS
- **Threshold**: 50m para busca de nós próximos
- **Recursão**: Rastreamento de sinais até a fonte

---

# Dependências Críticas

- **jsPDF**: ^2.x - Geração de PDFs
- **jspdf-autotable**: ^3.x - Tabelas em PDFs
- **JSZip**: ^3.x - Manipulação de arquivos ZIP
- **tokml**: ^0.4.x - Conversão GeoJSON → KML
- **Firebase**: Storage e Firestore

---

# Troubleshooting Comum

## Backup/Restore
**Problema**: Imagens não restauram
**Solução**: Verificar CORS do Firebase Storage

**Problema**: Erro "undefined" no Firestore
**Solução**: Usar [delete](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2679-2740) em vez de atribuir `undefined`

## PDF
**Problema**: Imagens rotacionadas incorretamente
**Solução**: Usar canvas para remover EXIF (já implementado)

**Problema**: PDF muito grande
**Solução**: Ajustar qualidade JPEG (linha 24: `0.7`)

## KML
**Problema**: Cores incorretas
**Solução**: Verificar conversão HEX ↔ KML (aabbggrr)

**Problema**: Cabos não conectam
**Solução**: Aumentar threshold de 50m (linha findNearestNode)
