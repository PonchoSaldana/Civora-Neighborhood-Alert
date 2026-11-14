import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

// 1. Crear package.json ligero exclusivamente para AWS Lambda
const distPkg = {
  name: 'civora-backend',
  type: 'module',
  dependencies: {
    zod: '^3.24.1'
  }
};

writeFileSync('dist/package.json', JSON.stringify(distPkg, null, 2));

// 2. Instalar solo zod en dist/ (pesa ~3MB, no los 1.6GB de frontend/lucide-react)
console.log('[Civora] Instalando dependencias de Lambda en dist/ (~3 MB)...');
execSync('npm install --omit=dev --no-package-lock', { cwd: 'dist', stdio: 'inherit' });
console.log('[Civora] Backend listo en dist/ para AWS SAM.');

