import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Build proxy configuration
  const proxyConfig = {}
  
  // Add test proxy when in test mode
  if (mode === 'test') {
    proxyConfig['/api/test'] = {
      target: 'http://localhost:5001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/test/, '')
    }
  }
  
  // Add ZAP proxy for development and test modes
  if (mode === 'development' || mode === 'test') {
    proxyConfig['/zap-api'] = {
      target: 'http://localhost:8080',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/zap-api/, ''),
      // Optional: Add headers if needed
      configure: (proxy, options) => {
        proxy.on('proxyReq', (proxyReq, req, res) => {
          // Log proxy requests for debugging (optional)
          console.log('ZAP API request:', req.url)
        })
      }
    }
  }
  
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    define: {
      'process.env.TEST_MODE': JSON.stringify(mode === 'test'),
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    server: {
      port: 5173,
      host: true,
      proxy: proxyConfig
    },
    build: {
      // Increase chunk warning limit
      chunkSizeWarningLimit: 600,
      
      // Optimize build for production
      sourcemap: mode === 'development' || mode === 'test',
      minify: mode === 'production' ? 'esbuild' : false,
      
      rollupOptions: {
        output: {
          // Better manual chunks
          manualChunks: (id) => {
            // Node modules chunking
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                if (id.includes('auth')) return 'firebase-auth'
                if (id.includes('firestore')) return 'firebase-firestore'
                if (id.includes('storage')) return 'firebase-storage'
                if (id.includes('functions')) return 'firebase-functions'
                return 'firebase-core'
              }
              if (id.includes('vue-router')) return 'vue-router'
              if (id.includes('vue')) return 'vue-vendor'
              if (id.includes('@fortawesome')) return 'fontawesome'
              if (id.includes('d3')) return 'd3'
              if (id.includes('xmlbuilder')) return 'xml'
              if (id.includes('dompurify')) return 'security'
              if (id.includes('zod')) return 'validation'
            }
            
            // App code chunking
            if (id.includes('src/services/ern')) {
              if (id.includes('ern-382')) return 'ern-legacy'
              if (id.includes('ern-42')) return 'ern-legacy'
              if (id.includes('ern-43')) return 'ern-current'
              return 'ern-core'
            }
            
            if (id.includes('src/services/apple')) return 'apple-music'
            
            if (id.includes('src/dictionaries')) {
              if (id.includes('genres/apple')) return 'genres-apple'
              if (id.includes('genres/beatport')) return 'genres-beatport'
              if (id.includes('genres/amazon')) return 'genres-amazon'
              if (id.includes('genres')) return 'genres-core'
              if (id.includes('mead')) return 'dict-mead'
              return 'dictionaries'
            }
            
            if (id.includes('src/views')) {
              if (id.includes('Migration')) return 'migration'
              if (id.includes('Testing')) return 'testing'
              if (id.includes('GenreMaps')) return 'genre-maps'
            }
          }
        }
      }
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        'firebase/functions',
        'dompurify',
        'zod'
      ]
    }
  }
})