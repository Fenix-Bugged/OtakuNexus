const fs = require('fs');
const targetFolderPath = './src/environments';

// Aseguramos que la carpeta exista
if (!fs.existsSync(targetFolderPath)) {
  fs.mkdirSync(targetFolderPath, { recursive: true });
}

// Para Jikan API no se necesita API Key, pero estructuramos el script para que sea escalable profesionalmente
const envConfigFile = `export const environment = {
  production: true,
  baseUrl: 'https://api.jikan.moe/v4'
};
`;

fs.writeFileSync(`${targetFolderPath}/environment.ts`, envConfigFile);
console.log('🤖 Archivo environment.ts de producción generado de forma segura para Vercel.');
