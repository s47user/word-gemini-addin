import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1x1 transparent PNG base64
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(base64Png, 'base64');
const assetsDir = path.resolve(__dirname, '../public/assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

['icon-16.png', 'icon-32.png', 'icon-64.png', 'icon-80.png'].forEach(file => {
  fs.writeFileSync(path.join(assetsDir, file), buffer);
});

console.log('Icons created successfully in public/assets/');
