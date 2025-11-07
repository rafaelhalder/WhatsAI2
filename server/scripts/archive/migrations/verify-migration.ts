#!/usr/bin/env tsx
/**
 * Verificar Arquivos Migrados no Spaces
 */

import { DigitalOceanSpacesService } from '../src/services/digitalocean-spaces';
import { config } from 'dotenv';

config();

const spacesService = new DigitalOceanSpacesService({
  accessKeyId: process.env['DO_SPACES_ACCESS_KEY']!,
  secretAccessKey: process.env['DO_SPACES_SECRET_KEY']!,
  region: process.env['DO_SPACES_REGION'] || 'sfo3',
  bucket: process.env['DO_SPACES_BUCKET'] || 'whatsais3',
  endpoint: process.env['DO_SPACES_ENDPOINT'] || 'https://sfo3.digitaloceanspaces.com'
});

async function verifyMigration() {
  console.log('🔍 Verificando arquivos migrados no Spaces...\n');

  const files = [
    'migrated/image/test-image-1.txt',
    'migrated/image/test-image-2.txt',
    'migrated/document/test-doc-1.txt'
  ];

  for (const file of files) {
    console.log(`📄 Verificando: ${file}`);
    
    try {
      const exists = await spacesService.fileExists(file);
      
      if (exists) {
        const info = await spacesService.getFileInfo(file);
        const content = await spacesService.downloadFile(file);
        
        console.log(`   ✅ Arquivo encontrado!`);
        console.log(`   📊 Tamanho: ${info?.size} bytes`);
        console.log(`   📅 Modificado: ${info?.modified}`);
        console.log(`   📝 Conteúdo (primeiras 50 chars):`);
        console.log(`      "${content.toString('utf-8').substring(0, 50).trim()}..."`);
        console.log();
      } else {
        console.log(`   ❌ Arquivo NÃO encontrado!\n`);
      }
    } catch (error) {
      console.log(`   ❌ Erro ao verificar: ${error}\n`);
    }
  }

  console.log('✅ Verificação concluída!\n');
  console.log('🌐 URLs públicas:');
  files.forEach(file => {
    const url = `https://whatsais3.sfo3.digitaloceanspaces.com/${file}`;
    console.log(`   ${url}`);
  });
}

verifyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro:', error);
    process.exit(1);
  });
