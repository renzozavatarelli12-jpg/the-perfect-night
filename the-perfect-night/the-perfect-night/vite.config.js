import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// GITHUB_PAGES lo define el workflow: en GitHub Pages la web vive en /the-perfect-night/. En Vercel queda en /.
export default defineConfig({ base: process.env.GITHUB_PAGES ? '/the-perfect-night/' : '/', plugins: [react()] })
