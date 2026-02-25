import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, '../../');
  const env = loadEnv(mode, repoRoot);
  const port = Number(env.VITE_PORT) || 3000;
  const outDir = env.VITE_BUILD_OUTDIR || 'dist';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Load env files from the repository root directory
    envDir: repoRoot,
    server: {
      port,
      open: false,
      host: false,
    },

    build: {
      outDir,
      emptyOutDir: true,
    },
  }
})
