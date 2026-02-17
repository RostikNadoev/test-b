import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  // Загружаем переменные окружения вручную
  const env = loadEnv(mode, process.cwd(), '');
  
  console.log('🚀 Vite config loaded');
  console.log('📁 Current directory:', process.cwd());
  console.log('🔧 Mode:', mode);
  console.log('🔍 VITE_BACKEND_URL:', env.VITE_BACKEND_URL);
  console.log('🔍 VITE_WS_URL:', env.VITE_WS_URL);
  console.log('🔍 VITE_WSP_URL:', env.VITE_WSP_URL);
  
  return {
    plugins: [react()],
    base: '/', // 🔥 ДЛЯ NETLIFY: '/' или './'
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false
    },
    // Добавим явную настройку для env
    define: {
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(env.VITE_BACKEND_URL),
      'import.meta.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL),
      'import.meta.env.VITE_WSP_URL': JSON.stringify(env.VITE_WSP_URL)
    }
  }
});