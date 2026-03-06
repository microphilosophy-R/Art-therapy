import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  plugins: {
    tailwindcss: {
      config: path.join(__dirname, 'tailwind.config.ts'),
    },
    autoprefixer: {},
  },
};
