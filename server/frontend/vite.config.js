import {defineConfig} from 'vite';
export default defineConfig({base: '/static/', build: {outDir: 'dist', emptyOutDir: true}, server: {proxy: {'/djangoapp': 'http://127.0.0.1:8000'}}});
