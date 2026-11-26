import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: { NODE_ENV: 'test', UPLOAD_DIR: './uploads-test' },
  },
});
