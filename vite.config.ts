import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'fs';
import path from 'path';
import os from 'os';

const certDir = path.join(os.homedir(), '.office-addin-dev-certs');
const certFile = path.join(certDir, 'localhost.crt');
const keyFile = path.join(certDir, 'localhost.key');

const hasOfficeCerts = fs.existsSync(certFile) && fs.existsSync(keyFile);

export default defineConfig({
  base: '/word-gemini-addin/',
  plugins: hasOfficeCerts ? [] : [basicSsl()],
  server: {
    port: 3000,
    https: hasOfficeCerts
      ? {
          cert: fs.readFileSync(certFile),
          key: fs.readFileSync(keyFile)
        }
      : true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  build: {
    outDir: 'dist'
  }
});
