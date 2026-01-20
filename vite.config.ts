import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';

// Set base for GitHub Pages deployment
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/Baseball-Sim/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'copy-mlb-logos',
        closeBundle() {
          // Copy MLB logos to dist folder after build
          try {
            const distLogoDir = path.resolve(__dirname, 'dist', 'mlb_logos');
            const srcLogoDir = path.resolve(__dirname, 'mlb_logos');
            mkdirSync(distLogoDir, { recursive: true });
            const files = readdirSync(srcLogoDir);
            files.forEach(file => {
              copyFileSync(
                path.join(srcLogoDir, file),
                path.join(distLogoDir, file)
              );
            });
            console.log('✓ MLB logos copied to dist/mlb_logos');
          } catch (err) {
            console.error('Error copying logos:', err);
          }
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
