#!/usr/bin/env tsx
/**
 * Script de Migração: Local Storage → DigitalOcean Spaces
 * 
 * Migra todos os arquivos de mídia do storage local para o Spaces.
 * Mantém a estrutura de pastas e atualiza referências no banco de dados.
 * 
 * Uso:
 *   npx tsx scripts/migrate-local-to-spaces.ts
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { DigitalOceanSpacesService } from '../src/services/digitalocean-spaces';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const prisma = new PrismaClient();

// Configurar Spaces
const spacesConfig = {
  accessKeyId: process.env['DO_SPACES_ACCESS_KEY']!,
  secretAccessKey: process.env['DO_SPACES_SECRET_KEY']!,
  region: process.env['DO_SPACES_REGION'] || 'sfo3',
  bucket: process.env['DO_SPACES_BUCKET'] || 'whatsais3',
  endpoint: process.env['DO_SPACES_ENDPOINT'] || 'https://sfo3.digitaloceanspaces.com'
};

const spacesService = new DigitalOceanSpacesService(spacesConfig);

interface MigrationStats {
  totalFiles: number;
  migratedFiles: number;
  failedFiles: number;
  totalSize: number;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Busca recursivamente todos os arquivos em um diretório
 */
async function getAllFiles(dirPath: string, fileList: string[] = []): Promise<string[]> {
  try {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        await getAllFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    }

    return fileList;
  } catch (error) {
    console.error(`Erro ao ler diretório ${dirPath}:`, error);
    return fileList;
  }
}

/**
 * Detecta o MIME type baseado na extensão
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Migra um arquivo para o Spaces
 */
async function migrateFile(
  localPath: string,
  baseDir: string,
  stats: MigrationStats
): Promise<boolean> {
  try {
    // Ler arquivo
    const buffer = await fs.readFile(localPath);
    const fileSize = buffer.length;

    // Calcular path relativo
    const relativePath = path.relative(baseDir, localPath);
    const key = `migrated/${relativePath.replace(/\\/g, '/')}`;

    // Detectar MIME type
    const mimeType = getMimeType(localPath);

    console.log(`📤 Migrando: ${relativePath} (${formatBytes(fileSize)})`);

    // Upload para Spaces
    await spacesService.uploadFile(buffer, key, mimeType, {
      metadata: {
        'original-path': localPath,
        'migrated-at': new Date().toISOString()
      },
      acl: 'public-read'
    });

    stats.migratedFiles++;
    stats.totalSize += fileSize;

    console.log(`✅ Migrado: ${key}`);
    return true;

  } catch (error) {
    console.error(`❌ Erro ao migrar ${localPath}:`, error);
    stats.failedFiles++;
    stats.errors.push({
      file: localPath,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Formata bytes em formato legível
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Função principal de migração
 */
async function migrate() {
  console.log('🚀 Iniciando migração de arquivos locais para DigitalOcean Spaces\n');
  console.log('Configuração:');
  console.log(`  Region: ${spacesConfig.region}`);
  console.log(`  Bucket: ${spacesConfig.bucket}`);
  console.log(`  Endpoint: ${spacesConfig.endpoint}\n`);

  const stats: MigrationStats = {
    totalFiles: 0,
    migratedFiles: 0,
    failedFiles: 0,
    totalSize: 0,
    errors: []
  };

  try {
    // Diretórios a migrar
    const baseDir = './uploads/media';
    const mediaDirs = [
      path.join(baseDir, 'image'),
      path.join(baseDir, 'audio'),
      path.join(baseDir, 'document'),
      path.join(baseDir, 'sticker')
    ];

    // Buscar todos os arquivos
    console.log('📁 Buscando arquivos...\n');
    const allFiles: string[] = [];

    for (const dir of mediaDirs) {
      try {
        await fs.access(dir);
        const files = await getAllFiles(dir);
        allFiles.push(...files);
      } catch {
        console.log(`⚠️  Diretório não existe: ${dir}`);
      }
    }

    stats.totalFiles = allFiles.length;

    if (stats.totalFiles === 0) {
      console.log('ℹ️  Nenhum arquivo encontrado para migrar.');
      return;
    }

    console.log(`📊 Encontrados ${stats.totalFiles} arquivos\n`);
    console.log('Deseja continuar? (Digite "sim" para confirmar)');

    // Aguardar confirmação do usuário
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question('> ', resolve);
    });

    readline.close();

    if (answer.toLowerCase() !== 'sim') {
      console.log('❌ Migração cancelada pelo usuário.');
      return;
    }

    console.log('\n🔄 Iniciando migração...\n');

    // Migrar arquivos em lotes de 10
    const batchSize = 10;
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(file => migrateFile(file, baseDir, stats))
      );

      console.log(`\n📊 Progresso: ${stats.migratedFiles}/${stats.totalFiles}\n`);
    }

    // Exibir resumo
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRAÇÃO CONCLUÍDA');
    console.log('='.repeat(60));
    console.log(`Total de arquivos: ${stats.totalFiles}`);
    console.log(`Migrados com sucesso: ${stats.migratedFiles}`);
    console.log(`Falhas: ${stats.failedFiles}`);
    console.log(`Tamanho total: ${formatBytes(stats.totalSize)}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Erros encontrados:');
      stats.errors.forEach(({ file, error }) => {
        console.log(`  - ${file}: ${error}`);
      });
    }

    console.log('\n💡 Próximos passos:');
    console.log('  1. Verificar arquivos no Spaces (console web)');
    console.log('  2. Atualizar referências no banco de dados (se necessário)');
    console.log('  3. Alterar configuração para usar S3 em produção');
    console.log('  4. Remover arquivos locais após validação');

  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar migração
migrate()
  .then(() => {
    console.log('\n✅ Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
