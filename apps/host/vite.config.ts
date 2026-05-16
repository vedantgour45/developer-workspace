import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export default defineConfig(({ mode }) => {
  // Pull env vars in. Dev falls back to the localhost preview ports so
  // `npm run dev` keeps working without any .env setup; production
  // deploys read the deployed MFE URLs from Vercel's env config.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [
      react(),
      federation({
        name: 'host',
        remotes: {
          board: {
            type: 'module',
            name: 'board',
            entry: env.VITE_BOARD_REMOTE_URL || 'http://localhost:5001/remoteEntry.js',
          },
          docs: {
            type: 'module',
            name: 'docs',
            entry: env.VITE_DOCS_REMOTE_URL || 'http://localhost:5002/remoteEntry.js',
          },
          analytics: {
            type: 'module',
            name: 'analytics',
            entry: env.VITE_ANALYTICS_REMOTE_URL || 'http://localhost:5003/remoteEntry.js',
          },
        },
        shared: {
          react: { singleton: true, requiredVersion: '^18.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
          'react-router-dom': { singleton: true, requiredVersion: '^6.0.0' },
        },
      }),
    ],
    server: { port: 5000 },
    preview: { port: 5000, strictPort: true },
    build: { target: 'esnext' },
  }
})
