// Import de Ícones da Biblioteca e Ícones Personalizados
import {
    Network, User, ChevronsLeftRightEllipsis, Server, Router, Video, HouseWifi, RadioTower, Zap, Route,
    MapPin, Building, Home, Radio, Wifi,
    Box, Cross, Flag, AlertTriangle, Star,
    Shell,
    Diamond,
    MessageCircleMore
} from 'lucide-react';

import { CEOIcon, CTOIcon, SplitterIcon, PostIcon } from './icons.jsx';


// --- CONSTANTES ---
export const ABNT_COLORS = [
    { name: 'Verde', hex: '#22c55e', text: 'text-green-600', bg: 'bg-green-500' },
    { name: 'Amarelo', hex: '#eab308', text: 'text-yellow-600', bg: 'bg-yellow-500' },
    { name: 'Branco', hex: '#f8fafc', text: 'text-slate-400', bg: 'bg-slate-100 border border-slate-300' },
    { name: 'Azul', hex: '#3b82f6', text: 'text-blue-600', bg: 'bg-blue-500' },
    { name: 'Vermelho', hex: '#ef4444', text: 'text-red-600', bg: 'bg-red-500' },
    { name: 'Violeta', hex: '#a855f7', text: 'text-purple-600', bg: 'bg-purple-500' },
    { name: 'Marrom', hex: '#854d0e', text: 'text-amber-800', bg: 'bg-amber-800' },
    { name: 'Rosa', hex: '#ec4899', text: 'text-pink-600', bg: 'bg-pink-500' },
    { name: 'Preto', hex: '#000000', text: 'text-black', bg: 'bg-black' },
    { name: 'Cinza', hex: '#64748b', text: 'text-slate-500', bg: 'bg-slate-500' },
    { name: 'Laranja', hex: '#f97316', text: 'text-orange-600', bg: 'bg-orange-500' },
    { name: 'Aqua', hex: '#06b6d4', text: 'text-cyan-600', bg: 'bg-cyan-500' },
];

export const ITEM_TYPES = {
    POP: { label: 'POP / Data Center', icon: HouseWifi, category: 'NODE', defaultPorts: 0, defaultColor: '#4338ca', width: 160 }, // Indigo
    CEO: { label: 'CEO (Emenda)', icon: CEOIcon, category: 'NODE', defaultPorts: 0, defaultColor: '#ea580c', width: 160 }, // Orange
    CTO: { label: 'CTO (Terminação)', icon: CTOIcon, category: 'NODE', defaultPorts: 0, defaultColor: '#16a34a', width: 160 }, // Green
    TOWER: { label: 'Torre', icon: RadioTower, category: 'NODE', defaultPorts: 0, defaultColor: '#8888ff', width: 160 }, // Tipo azul
    POST: { label: 'Poste', icon: PostIcon, category: 'NODE', defaultPorts: 0, defaultColor: '#0654AF', width: 160 },
    OBJECT: { label: 'Objeto', icon: MapPin, category: 'NODE', defaultPorts: 0, defaultColor: '#587ad8', width: 160 },
    CABLE: { label: 'Cabo Externo', icon: Route, category: 'LINK', defaultPorts: 12, color: 'stroke-slate-800' },
    // CLIENT: { label: 'Cliente Final', icon: User, category: 'NODE', defaultPorts: 1, defaultColor: '#db2777', width: 160 }, // Pink
    // FLAG: { label: 'Marcador', icon: MapPin, category: 'FLAG', defaultColor: '#8888ff', width: 160 }, // Tipo azul


    OLT: { label: 'OLT', icon: Server, category: 'DEVICE', defaultPorts: 0 },
    DIO: { label: 'DIO', icon: Network, category: 'DEVICE', defaultPorts: 0 },
    SWITCH: { label: 'Switch', icon: ChevronsLeftRightEllipsis, category: 'DEVICE', defaultPorts: 24 },
    POE: { label: 'Fonte POE', icon: Zap, category: 'DEVICE', defaultPorts: 8 },
    ROUTER: { label: 'Roteador', icon: Router, category: 'DEVICE', defaultPorts: 5 },
    CAMERA: { label: 'Câmera IP', icon: Video, category: 'DEVICE', defaultPorts: 1 },
    SPLITTER: { label: 'Splitter', icon: SplitterIcon, category: 'COMPONENT', defaultPorts: 9 },
};

// Lista de opções para o tipo OBJECT
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

export const ICON_MAP = {
    MapPin, Home, MessageCircleMore, Shell,
    Box, Diamond, Flag, AlertTriangle, Star
};

// Valores de Referência (Atenuação em dB)
export const ATTENUATION = {
    DEFAULT_TX: 5.0,       // Potência de saída padrão da OLT (dBm)
    FUSION_LOSS: 0.01,      // Perda por fusão
    CONNECTOR_LOSS: 0.25,   // Perda por conector/acoplamento
    SPLITTER_LOSS: {
        2: 3.7,   // 1:2
        4: 7.1,   // 1:4
        8: 10.5,  // 1:8
        16: 13.7  // 1:16
    }
};

export const VERSAO = {
    NUMERO_VERSAO: "FTTH Manager v0.3.4 Beta"
}