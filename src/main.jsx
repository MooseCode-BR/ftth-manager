import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App/index.jsx'
import './index.css' // <--- Importante: Isso carrega o Tailwind
import { Analytics } from '@vercel/analytics/react'

// 1. Importa o Leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 2. TRUQUE: Expõe o 'L' para a janela global
// Isso faz o plugin achar que está num site antigo e funcionar
window.L = L;

// 3. AGORA sim, importa o plugin de rotação (e o de clusters)
import 'leaflet-rotate';


import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>,
)