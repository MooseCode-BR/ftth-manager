# Arquitetura de Constantes e Configurações - FTTH Manager

## Visão Geral

Os arquivos de constantes e configurações definem os valores fundamentais do sistema FTTH Manager, incluindo tipos de itens, cores padrão, ícones e parâmetros de cálculo óptico.

## Arquivos

### 1. constants.js (80 linhas)
**Propósito**: Definições de constantes do sistema.

### 2. firebaseConfig.js (18 linhas)
**Propósito**: Configuração do Firebase (autenticação, banco de dados, storage).

---

# constants.js - Constantes do Sistema

## Imports

### Ícones Lucide React
```javascript
import {
    Network, User, ChevronsLeftRightEllipsis, Server, Router, 
    Video, HouseWifi, RadioTower, Zap, Route, MapPin, Building, 
    Home, Radio, Wifi, Box, Cross, Flag, AlertTriangle, Star,
    Shell, Diamond, MessageCircleMore
} from 'lucide-react';
```

### Ícones Customizados
```javascript
import { CEOIcon, CTOIcon, SplitterIcon, PostIcon } from './icons.jsx';
```

---

## 1. ABNT_COLORS - Cores Padrão de Fibras

**Propósito**: Cores padrão ABNT para identificação de fibras ópticas.

**Estrutura**:
```javascript
export const ABNT_COLORS = [
    { 
        name: 'Verde', 
        hex: '#22c55e', 
        text: 'text-green-600', 
        bg: 'bg-green-500' 
    },
    // ... 11 cores no total
];
```

**Cores Disponíveis** (12 cores):
1. **Verde** (#22c55e)
2. **Amarelo** (#eab308)
3. **Branco** (#f8fafc) - com borda
4. **Azul** (#3b82f6)
5. **Vermelho** (#ef4444)
6. **Violeta** (#a855f7)
7. **Marrom** (#854d0e)
8. **Rosa** (#ec4899)
9. **Preto** (#000000)
10. **Cinza** (#64748b)
11. **Laranja** (#f97316)
12. **Aqua** (#06b6d4)

**Uso**:
- Identificação de fibras em cabos
- Seletor de cores em modais
- Visualização de sinais

**Propriedades**:
- [name](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/App/index.jsx#2641-2678): Nome da cor em português
- [hex](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/utils.js#179-198): Código hexadecimal
- [text](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/FiberMap.jsx#953-954): Classe Tailwind para texto
- `bg`: Classe Tailwind para fundo

---

## 2. ITEM_TYPES - Tipos de Itens FTTH

**Propósito**: Definição de todos os tipos de itens suportados pelo sistema.

**Estrutura**:
```javascript
export const ITEM_TYPES = {
    [TYPE_ID]: {
        label: string,        // Nome exibido
        icon: Component,      // Componente de ícone
        category: string,     // Categoria (NODE, LINK, DEVICE, COMPONENT)
        defaultPorts: number, // Número padrão de portas
        defaultColor: string, // Cor padrão (hex)
        width: number,        // Largura no canvas (opcional)
        color: string         // Classe de cor (opcional)
    }
};
```

### Categorias

#### NODE (Nós de Rede)
Elementos físicos da rede externa.

**POP / Data Center**
```javascript
POP: { 
    label: 'POP / Data Center', 
    icon: HouseWifi, 
    category: 'NODE', 
    defaultPorts: 0, 
    defaultColor: '#4338ca', // Indigo
    width: 160 
}
```
- Ponto de presença principal
- Origem dos sinais
- Cor: Indigo (#4338ca)

**CEO (Emenda)**
```javascript
CEO: { 
    label: 'CEO (Emenda)', 
    icon: CEOIcon, 
    category: 'NODE', 
    defaultPorts: 0, 
    defaultColor: '#ea580c', // Orange
    width: 160 
}
```
- Caixa de emenda óptica
- Ponto de fusão intermediário
- Cor: Laranja (#ea580c)

**CTO (Terminação)**
```javascript
CTO: { 
    label: 'CTO (Terminação)', 
    icon: CTOIcon, 
    category: 'NODE', 
    defaultPorts: 0, 
    defaultColor: '#16a34a', // Green
    width: 160 
}
```
- Caixa de terminação óptica
- Distribuição para clientes
- Cor: Verde (#16a34a)

**Torre**
```javascript
TOWER: { 
    label: 'Torre', 
    icon: RadioTower, 
    category: 'NODE', 
    defaultPorts: 0, 
    defaultColor: '#8888ff', 
    width: 160 
}
```
- Torre de transmissão
- Infraestrutura de suporte

**Poste**
```javascript
POST: { 
    label: 'Poste', 
    icon: PostIcon, 
    category: 'NODE', 
    defaultPorts: 0, 
    defaultColor: '#0654AF', 
    width: 160 
}
```
- Poste de energia/telecomunicações
- Suporte para cabos

**Objeto**
```javascript
OBJECT: { 
    label: 'Objeto', 
    icon: MapPin, 
    category: 'NODE', 
    defaultPorts: 0, 
    defaultColor: '#587ad8', 
    width: 160 
}
```
- Marcador genérico
- Ícone customizável (ver OBJECT_ICONS)

#### LINK (Conexões)
Cabos que conectam nós.

**Cabo Externo**
```javascript
CABLE: { 
    label: 'Cabo Externo', 
    icon: Route, 
    category: 'LINK', 
    defaultPorts: 12, 
    color: 'stroke-slate-800' 
}
```
- Cabo de fibra óptica
- Padrão: 12 fibras
- Suporta waypoints (pontos intermediários)

#### DEVICE (Equipamentos Internos)
Dispositivos instalados dentro de nós.

**OLT (Optical Line Terminal)**
```javascript
OLT: { 
    label: 'OLT', 
    icon: Server, 
    category: 'DEVICE', 
    defaultPorts: 0 
}
```
- Terminal de linha óptica
- Fonte de sinais GPON/EPON

**DIO (Distribuidor Interno Óptico)**
```javascript
DIO: { 
    label: 'DIO', 
    icon: Network, 
    category: 'DEVICE', 
    defaultPorts: 0 
}
```
- Distribuidor de fibras
- Suporta múltiplos cards/slots

**Switch**
```javascript
SWITCH: { 
    label: 'Switch', 
    icon: ChevronsLeftRightEllipsis, 
    category: 'DEVICE', 
    defaultPorts: 24 
}
```
- Switch de rede
- Padrão: 24 portas

**Fonte POE**
```javascript
POE: { 
    label: 'Fonte POE', 
    icon: Zap, 
    category: 'DEVICE', 
    defaultPorts: 8 
}
```
- Power over Ethernet
- Padrão: 8 portas

**Roteador**
```javascript
ROUTER: { 
    label: 'Roteador', 
    icon: Router, 
    category: 'DEVICE', 
    defaultPorts: 5 
}
```
- Roteador de rede
- Padrão: 5 portas

**Câmera IP**
```javascript
CAMERA: { 
    label: 'Câmera IP', 
    icon: Video, 
    category: 'DEVICE', 
    defaultPorts: 1 
}
```
- Câmera de vigilância
- 1 porta de rede

#### COMPONENT (Componentes Ópticos)
Componentes passivos dentro de equipamentos.

**Splitter**
```javascript
SPLITTER: { 
    label: 'Splitter', 
    icon: SplitterIcon, 
    category: 'COMPONENT', 
    defaultPorts: 9 
}
```
- Divisor óptico passivo
- Padrão: 1:8 (1 entrada + 8 saídas = 9 portas)
- Atenuação baseada em ATTENUATION.SPLITTER_LOSS

### Tipos Comentados (Desativados)

```javascript
// CLIENT: { label: 'Cliente Final', icon: User, category: 'NODE', 
//           defaultPorts: 1, defaultColor: '#db2777', width: 160 }
// FLAG: { label: 'Marcador', icon: MapPin, category: 'FLAG', 
//         defaultColor: '#8888ff', width: 160 }
```

**Motivo**: Funcionalidades não implementadas ou substituídas por OBJECT.

---

## 3. OBJECT_ICONS - Ícones para Tipo OBJECT

**Propósito**: Lista de ícones disponíveis para objetos customizáveis.

**Estrutura**:
```javascript
export const OBJECT_ICONS = [
    { id: 'MapPin', icon: MapPin, label: 'Pino' },
    { id: 'Home', icon: Home, label: 'Casa' },
    { id: 'MessageCircleMore', icon: MessageCircleMore, label: 'Mensagem' },
    { id: 'Shell', icon: Shell, label: 'Reserva' },
    { id: 'Box', icon: Box, label: 'Caixa' },
    { id: 'Diamond', icon: Diamond, label: 'Losango' },
    { id: 'Flag', icon: Flag, label: 'Bandeira' },
    { id: 'AlertTriangle', icon: AlertTriangle, label: 'Alerta' },
    { id: 'Star', icon: Star, label: 'Destaque' }
];
```

**Uso**:
- Seletor de ícone em CreationModal
- Customização de marcadores
- 9 opções disponíveis

---

## 4. ICON_MAP - Mapeamento de Ícones

**Propósito**: Mapeamento rápido de ID → Componente de ícone.

**Estrutura**:
```javascript
export const ICON_MAP = {
    MapPin, Home, MessageCircleMore, Shell,
    Box, Diamond, Flag, AlertTriangle, Star
};
```

**Uso**:
```javascript
const IconComponent = ICON_MAP[item.iconType] || MapPin;
return <IconComponent size={24} />;
```

---

## 5. ATTENUATION - Valores de Atenuação Óptica

**Propósito**: Parâmetros para cálculo de potência óptica.

**Estrutura**:
```javascript
export const ATTENUATION = {
    DEFAULT_TX: 5.0,       // Potência de saída padrão da OLT (dBm)
    FUSION_LOSS: 0.01,     // Perda por fusão (dB)
    CONNECTOR_LOSS: 0.25,  // Perda por conector/acoplamento (dB)
    SPLITTER_LOSS: {
        2: 3.7,   // 1:2 (dB)
        4: 7.1,   // 1:4 (dB)
        8: 10.5,  // 1:8 (dB)
        16: 13.7  // 1:16 (dB)
    }
};
```

### Parâmetros Detalhados

**DEFAULT_TX (5.0 dBm)**
- Potência de transmissão padrão da OLT
- Valor típico para equipamentos GPON
- Usado como ponto de partida em [calculatePower()](file:///c:/Users/drbmr/OneDrive/Desktop/ftth-atual-editando/ftth-manager/src/utils.js#105-177)

**FUSION_LOSS (0.01 dB)**
- Perda por fusão de fibras
- Valor muito baixo (fusão de qualidade)
- Aplicado em cada ponto de emenda

**CONNECTOR_LOSS (0.25 dB)**
- Perda por conector óptico
- Inclui acoplamentos e adaptadores
- Valor típico para conectores SC/APC

**SPLITTER_LOSS**
- Atenuação teórica de splitters passivos
- Baseado em normas ITU-T
- Valores:
  - **1:2** → 3.7 dB (divide sinal em 2)
  - **1:4** → 7.1 dB (divide sinal em 4)
  - **1:8** → 10.5 dB (divide sinal em 8)
  - **1:16** → 13.7 dB (divide sinal em 16)

### Fórmula de Cálculo

```javascript
Potência Final = DEFAULT_TX 
                 - (Distância × Atenuação/km)
                 - (Nº Fusões × FUSION_LOSS)
                 - (Nº Conectores × CONNECTOR_LOSS)
                 - Σ(SPLITTER_LOSS[ratio])
```

**Exemplo**:
```
OLT (5 dBm) → 2km cabo → Splitter 1:8 → 1km cabo → Cliente

Cálculo:
5 dBm 
- (2km × 0.35 dB/km) = -0.7 dB
- (1 fusão × 0.01 dB) = -0.01 dB
- (1 splitter 1:8) = -10.5 dB
- (1km × 0.35 dB/km) = -0.35 dB
- (2 conectores × 0.25 dB) = -0.5 dB

Potência Final = 5 - 0.7 - 0.01 - 10.5 - 0.35 - 0.5 = -7.06 dBm
```

---

# firebaseConfig.js - Configuração Firebase

## Propósito

Inicialização e exportação dos serviços Firebase.

## Imports

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
```

## Configuração

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDYN2incS0xb5QZO7nrdukw0nXsHl5wwqE",
    authDomain: "ftth-mgr.firebaseapp.com",
    projectId: "ftth-mgr",
    storageBucket: "ftth-mgr.firebasestorage.app",
    messagingSenderId: "235638910340",
    appId: "1:235638910340:web:3b60dc54cee7e3983401d1"
};
```

**Projeto**: ftth-mgr

**Serviços Habilitados**:
- **Authentication**: Login de usuários
- **Firestore**: Banco de dados NoSQL
- **Storage**: Armazenamento de imagens

## Inicialização

```javascript
const app = initializeApp(firebaseConfig);
```

## Exportações

```javascript
export const auth = getAuth(app);      // Autenticação
export const db = getFirestore(app);   // Banco de dados
export const storage = getStorage(app); // Storage de arquivos
```

## Uso no Sistema

### Authentication (auth)
```javascript
import { auth } from './firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// Login
await signInWithEmailAndPassword(auth, email, password);

// Registro
await createUserWithEmailAndPassword(auth, email, password);
```

### Firestore (db)
```javascript
import { db } from './firebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

// Salvar item
await setDoc(doc(db, 'users/uid/projects/pid/items', itemId), itemData);

// Buscar itens
const snapshot = await getDocs(collection(db, 'users/uid/projects/pid/items'));
```

### Storage (storage)
```javascript
import { storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Upload de imagem
const storageRef = ref(storage, `users/${uid}/images/${itemId}/${photoId}.jpg`);
await uploadBytes(storageRef, blob);
const url = await getDownloadURL(storageRef);
```

## Estrutura de Dados no Firestore

```
ftth-mgr (projeto)
└── users/
    └── {userId}/
        ├── profile/
        │   └── data
        └── projects/
            └── {projectId}/
                ├── items/
                │   └── {itemId}
                ├── connections/
                │   └── {connectionId}
                └── settings/
                    ├── tags
                    ├── signals
                    ├── portLabels
                    └── nodeColors
```

## Estrutura de Storage

```
ftth-mgr.firebasestorage.app
└── users/
    └── {userId}/
        └── images/
            └── {itemId}/
                ├── {timestamp}_photo1.jpg
                ├── {timestamp}_photo2.jpg
                └── ...
```

---

# Integração das Constantes

## Fluxo de Uso

### 1. Criação de Item
```javascript
import { ITEM_TYPES } from './constants';

const createItem = (type) => {
    const config = ITEM_TYPES[type];
    
    return {
        id: uuidv4(),
        type,
        name: config.label,
        ports: config.defaultPorts,
        color: config.defaultColor,
        // ...
    };
};
```

### 2. Renderização de Ícone
```javascript
import { ITEM_TYPES, ICON_MAP } from './constants';

const ItemIcon = ({ item }) => {
    const config = ITEM_TYPES[item.type];
    const IconComponent = item.type === 'OBJECT' && item.iconType
        ? ICON_MAP[item.iconType]
        : config.icon;
    
    return <IconComponent size={24} color={item.color} />;
};
```

### 3. Seletor de Cores
```javascript
import { ABNT_COLORS } from './constants';

const ColorPicker = ({ onSelect }) => {
    return (
        <div className="color-grid">
            {ABNT_COLORS.map(color => (
                <button
                    key={color.hex}
                    className={color.bg}
                    onClick={() => onSelect(color.hex)}
                >
                    {color.name}
                </button>
            ))}
        </div>
    );
};
```

### 4. Cálculo de Potência
```javascript
import { ATTENUATION } from './constants';

const calculatePower = (distance, splitterRatio, fusionCount) => {
    let power = ATTENUATION.DEFAULT_TX;
    
    // Atenuação do cabo (0.35 dB/km típico)
    power -= distance * 0.35;
    
    // Fusões
    power -= fusionCount * ATTENUATION.FUSION_LOSS;
    
    // Splitter
    power -= ATTENUATION.SPLITTER_LOSS[splitterRatio] || 0;
    
    return power;
};
```

---

# Observações

## Código Comentado

**Linhas 38-39**: Tipos CLIENT e FLAG comentados.

**Motivo**: Funcionalidades não implementadas ou substituídas.

**Recomendação**: Pode ser removido após confirmação de que não serão implementados.

## Segurança

**firebaseConfig.js** contém credenciais públicas (apiKey).

**Nota**: Isso é normal para Firebase client-side. A segurança é garantida por:
- Regras de segurança do Firestore
- Regras de segurança do Storage
- Autenticação de usuários

## Extensibilidade

Para adicionar novo tipo de item:
1. Adicionar em `ITEM_TYPES`
2. Criar ícone (se necessário)
3. Adicionar lógica específica em componentes
4. Atualizar documentação

---

# Conclusão

Os arquivos de constantes e configurações estão:
- ✅ Bem organizados
- ✅ Bem documentados (agora)
- ✅ Sem código morto significativo
- ✅ Fáceis de manter e estender
- ✅ Integrados corretamente com Firebase

As constantes definem a base do sistema FTTH Manager, permitindo fácil customização de tipos, cores e parâmetros ópticos.
