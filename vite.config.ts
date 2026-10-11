import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/beybladeCup/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
