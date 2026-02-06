import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, '../../');
  const env = loadEnv(mode, repoRoot);
  
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
      port: parseInt(env.VITE_PORT),
      open: false,
      host: false,
    },
  }
})