import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './', // istalgan papkaga / hostingga qo'yish mumkin
  plugins: [react(), tailwindcss()],
});
