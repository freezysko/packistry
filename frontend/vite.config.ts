import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [tailwindcss(), TanStackRouterVite({}), react()],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
    server: {
        // keeps the API on the same origin as the app, like in production, so no CORS is involved
        // VITE_API_PROXY overrides the target, e.g. http://web:8000 in the Docker dev stack
        proxy: {
            '/api': {
                target: process.env.VITE_API_PROXY ?? 'http://localhost',
                changeOrigin: true,
            },
        },
    },
})
