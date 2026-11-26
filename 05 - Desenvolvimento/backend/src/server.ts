import { createApp } from './app.js';
import { env } from './env.js';

createApp().listen(env.port, () => {
  console.log(`[mesai-api] ouvindo na porta ${env.port}`);
});
