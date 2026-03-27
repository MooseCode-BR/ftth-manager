// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   base: './',
// })


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// 1. Importamos o plugin do PWA
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // 2. Adicionamos o VitePWA na lista de plugins
    VitePWA({
      // registerType: 'autoUpdate' faz com que o app atualize sozinho quando houver nova versão
      registerType: 'autoUpdate',

      // MÁGICA AQUI: Habilita o PWA enquanto usamos o 'npm run dev'
      devOptions: {
        enabled: true,
        // Opcional: suprime avisos no console durante o dev
        type: 'module',
      },

      // Arquivos extras que você quer que o PWA guarde em cache (se tiver)
      includeAssets: 'favicon.svg',

      // 3. Configuração do Manifest (A "identidade" do seu App)
      manifest: {
        id: '/',
        name: 'FTTH Manager Cloud', // Nome completo do seu app
        short_name: 'FTTH Manager', // Nome curto (usado debaixo do ícone no celular)
        description: 'Gestão Avançada de Redes de Fibra Óptica', // Uma breve descrição
        theme_color: '#000000', // A cor da barra de status do celular (ajuste para a sua cor principal)
        background_color: '#ffff00', // A cor de fundo durante o carregamento
        display: 'standalone', // Faz o app parecer nativo (esconde a barra de endereço do navegador)
        // Define a página inicial do app
        start_url: '/',

        // 4. Ícones obrigatórios para o PWA funcionar e o navegador aceitar a instalação
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],

        screenshots: [
          {
            src: '/screenshot-desktop.png', // Crie uma print do seu sistema no PC
            sizes: '1916x875',
            type: 'image/png',
            form_factor: 'wide' // Indica que é para telas de computador
          },
          {
            src: '/screenshot-mobile.png', // Crie uma print do seu sistema no celular
            sizes: '1290x2796',
            type: 'image/png'
            // Sem form_factor 'wide', o Chrome entende que é para mobile
          }
        ],

        display_override: ["window-controls-overlay"]
      }
    })
  ],
});