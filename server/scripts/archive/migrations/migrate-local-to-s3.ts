/**
 * Script para migrar arquivos locais para DigitalOcean Spaces (S3)
 * 
 * Este script:
 * 1. Escaneia o diretório de uploads local
 * 2. Faz upload de cada arquivo para o S3
 * 3. Atualiza os registros no banco de dados
 * 4. Remove arquivos locais (opcional)
 * 
 * Usage:
 *   npx tsx server/scripts/migrate-local-to-s3.ts [--delete-local] [--dry-run]
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { DigitalOceanSpacesService, SpacesConfig } from '../src/services/digitalocean-spaces';

const prisma = new PrismaClient();

// Configuração do S3
const spacesConfig: SpacesConfig = {
  accessKeyId: process.env.DO_SPACES_KEY || '',
  secretAccessKey: process.env.DO_SPACES_SECRET || '',
  region: process.env.DO_SPACES_REGION || 'sfo3',
  bucket: process.env.DO_SPACES_BUCKET || 'whatsais3',
  endpoint: process.env.DO_SPACES_ENDPOINT || `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`
};

const LOCAL_UPLOADS_PATH = process.env.UPLOAD_DIR || './uploads/media';

// Argumentos de linha de comando
const args = process.argv.slice(2);
const DELETE_LOCAL = args.includes('--delete-local');
const DRY_RUN = args.includes('--dry-run');

interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  totalSize: number;
}

interface FileToMigrate {
  localPath: string;
  relativePath: string;
  s3Key: string;
  size: number;
  mediaType: 'image' | 'audio' | 'document' | 'sticker' | 'unknown';
}

/**
 * Detecta o tipo de mídia baseado no caminho
 */
function detectMediaType(filePath: string): 'image' | 'audio' | 'document' | 'sticker' | 'unknown' {
  if (filePath.includes('/image/')) return 'image';
  if (filePath.includes('/audio/')) return 'audio';
  if (filePath.includes('/document/')) return 'document';
  if (filePath.includes('/sticker/')) return 'sticker';
  return 'unknown';
}

/**
 * Detecta o MIME type baseado na extensão
 */
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.mp3': 'audio/mp3',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/m4a',
    '.aac': 'audio/aac',
    '.mp4': 'video/mp4',
    '.avi': 'video/avi',
    '.mov': 'video/mov',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.csv': 'text/csv'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Escaneia diretório recursivamente e retorna lista de arquivos
 */
async function scanDirectory(dir: string, baseDir: string = dir): Promise<FileToMigrate[]> {
  const files: FileToMigrate[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursivamente escanear subdiretórios
        const subFiles = await scanDirectory(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        const mediaType = detectMediaType(fullPath);
        
        // Gerar chave S3 baseada no caminho relativo
        const s3Key = `media/${relativePath}`;
        
        files.push({
          localPath: fullPath,
          relativePath,
          s3Key,
          size: stats.size,
          mediaType
        });
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao escanear diretório ${dir}:`, error);
  }
  
  return files;
}

/**
 * Faz upload de um arquivo para o S3
 */
async function uploadFileToS3(
  file: FileToMigrate,
  spacesService: DigitalOceanSpacesService
): Promise<boolean> {
  try {
    const buffer = await fs.readFile(file.localPath);
    const mimeType = getMimeType(file.localPath);
    
    console.log(`  📤 Uploading ${file.relativePath} (${formatSize(file.size)})`);
    
    const result = await spacesService.uploadFile(buffer, file.s3Key, mimeType, {
      metadata: {
        originalPath: file.relativePath,
        mediaType: file.mediaType,
        migratedAt: new Date().toISOString()
      },
      acl: 'public-read'
    });
    
    console.log(`  ✅ Uploaded: ${result.url}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to upload ${file.relativePath}:`, error);
    return false;
  }
}

/**
 * Atualiza URLs no banco de dados
 */
async function updateDatabaseUrls(
  files: FileToMigrate[],
  spacesService: DigitalOceanSpacesService
): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;
  
  console.log('\n📝 Atualizando URLs no banco de dados...\n');
  
  for (const file of files) {
    try {
      const oldUrl = `/uploads/media/${file.relativePath}`;
      const newUrl = spacesService.getCdnUrl(file.s3Key);
      
      // Atualizar mensagens que usam este arquivo
      const result = await prisma.message.updateMany({
        where: {
          OR: [
            { mediaUrl: { contains: file.relativePath } },
            { mediaUrl: oldUrl }
          ]
        },
        data: {
          mediaUrl: newUrl
        }
      });
      
      if (result.count > 0) {
        console.log(`  ✅ Atualizadas ${result.count} mensagens para: ${path.basename(file.relativePath)}`);
        updated += result.count;
      }
    } catch (error) {
      console.error(`  ❌ Erro ao atualizar URLs para ${file.relativePath}:`, error);
      errors++;
    }
  }
  
  return { updated, errors };
}

/**
 * Remove arquivos locais após migração
 */
async function deleteLocalFiles(files: FileToMigrate[]): Promise<number> {
  let deleted = 0;
  
  console.log('\n🗑️  Removendo arquivos locais...\n');
  
  for (const file of files) {
    try {
      await fs.unlink(file.localPath);
      console.log(`  ✅ Removido: ${file.relativePath}`);
      deleted++;
    } catch (error) {
      console.error(`  ❌ Erro ao remover ${file.relativePath}:`, error);
    }
  }
  
  return deleted;
}

/**
 * Formata tamanho de arquivo
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Função principal de migração
 */
async function main() {
  console.log('🚀 Migração de Arquivos Locais para DigitalOcean Spaces\n');
  console.log(`📁 Diretório local: ${LOCAL_UPLOADS_PATH}`);
  console.log(`☁️  Bucket S3: ${spacesConfig.bucket}`);
  console.log(`🌐 Region: ${spacesConfig.region}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - Nenhuma alteração será feita\n');
  }
  
  if (DELETE_LOCAL) {
    console.log('\n⚠️  MODO DELETE LOCAL ATIVO - Arquivos locais serão removidos após upload\n');
  }
  
  const stats: MigrationStats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    totalSize: 0
  };
  
  try {
    // Verificar se o diretório local existe
    try {
      await fs.access(LOCAL_UPLOADS_PATH);
    } catch {
      console.log('❌ Diretório de uploads não encontrado:', LOCAL_UPLOADS_PATH);
      return;
    }
    
    // Inicializar serviço S3
    const spacesService = new DigitalOceanSpacesService(spacesConfig);
    
    // Escanear arquivos
    console.log('\n📂 Escaneando arquivos locais...\n');
    const files = await scanDirectory(LOCAL_UPLOADS_PATH);
    
    if (files.length === 0) {
      console.log('ℹ️  Nenhum arquivo encontrado para migrar.');
      return;
    }
    
    stats.total = files.length;
    stats.totalSize = files.reduce((sum, f) => sum + f.size, 0);
    
    console.log(`\n📊 Encontrados ${files.length} arquivos (${formatSize(stats.totalSize)})\n`);
    
    // Agrupar por tipo
    const byType = files.reduce((acc, f) => {
      acc[f.mediaType] = (acc[f.mediaType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Por tipo:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} arquivos`);
    });
    
    if (DRY_RUN) {
      console.log('\n✅ Dry run completo - nenhuma alteração feita');
      return;
    }
    
    // Confirmar antes de prosseguir
    console.log('\n⚠️  Pressione CTRL+C para cancelar, ou aguarde 5 segundos para continuar...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Upload de arquivos
    console.log('\n📤 Iniciando upload de arquivos...\n');
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n[${i + 1}/${files.length}] Processando: ${file.relativePath}`);
      
      // Verificar se já existe no S3
      const exists = await spacesService.fileExists(file.s3Key);
      if (exists) {
        console.log(`  ⏭️  Arquivo já existe no S3, pulando...`);
        stats.skipped++;
        continue;
      }
      
      // Upload
      const success = await uploadFileToS3(file, spacesService);
      if (success) {
        stats.success++;
      } else {
        stats.failed++;
      }
      
      // Pausa de 100ms entre uploads para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Atualizar banco de dados
    const { updated, errors } = await updateDatabaseUrls(files, spacesService);
    
    // Remover arquivos locais se solicitado
    if (DELETE_LOCAL && stats.success > 0) {
      const deleted = await deleteLocalFiles(files.filter((_, i) => i < stats.success));
      console.log(`\n✅ ${deleted} arquivos locais removidos`);
    }
    
    // Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL DE MIGRAÇÃO');
    console.log('='.repeat(60));
    console.log(`Total de arquivos:     ${stats.total}`);
    console.log(`✅ Sucesso:            ${stats.success}`);
    console.log(`❌ Falhas:             ${stats.failed}`);
    console.log(`⏭️  Pulados:            ${stats.skipped}`);
    console.log(`📝 URLs atualizadas:   ${updated}`);
    console.log(`💾 Tamanho total:      ${formatSize(stats.totalSize)}`);
    console.log('='.repeat(60));
    
    if (stats.failed > 0) {
      console.log('\n⚠️  Alguns arquivos falharam. Verifique os logs acima.');
    } else {
      console.log('\n✅ Migração concluída com sucesso!');
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal durante migração:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar migração
main().catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});
