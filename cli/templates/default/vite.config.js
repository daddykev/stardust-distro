import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      vue()
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    define: {
      // Make test mode available to the app
      'process.env.TEST_MODE': JSON.stringify(mode === 'test'),
      // Optional: expose other env variables if needed
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    server: {
      port: 5173,
      host: true,
      // Add proxy for test endpoints when in test mode
      proxy: mode === 'test' ? {
        '/api/test': {
          target: 'http://localhost:5001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/test/, '')
        }
      } : {}
    },
    build: {
      // Optimize build for production
      sourcemap: mode === 'development' || mode === 'test',
      minify: mode === 'production' ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/functions'],
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'fontawesome': ['@fortawesome/fontawesome-svg-core', '@fortawesome/free-solid-svg-icons', '@fortawesome/vue-fontawesome']
          }
        }
      }
    },
    // Add test-specific configuration
    test: {
      environment: 'jsdom',
      globals: true
    }
  }
})