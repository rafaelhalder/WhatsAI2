#!/usr/bin/env node

/**
 * Script para testar se o servidor está rodando e se as rotas de áudio estão funcionando
 */

const http = require('http');

const SERVER_URL = 'http://localhost:3000';
const TIMEOUT = 5000;

// Cores para o terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function testUrl(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname,
      method: method,
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      log(`  Status: ${res.statusCode}`, res.statusCode === 200 ? colors.green : colors.yellow);
      log(`  Headers: ${JSON.stringify(res.headers, null, 2)}`, colors.cyan);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  log('\n🔍 TESTE DE CONECTIVIDADE DO SERVIDOR\n', colors.cyan);
  log('='.repeat(80));

  // Teste 1: Health check
  log('\n1️⃣  Testando health check...', colors.cyan);
  try {
    const result = await testUrl(`${SERVER_URL}/api/health`);
    log('  ✅ Servidor está rodando!', colors.green);
  } catch (error) {
    log(`  ❌ Servidor NÃO está rodando!`, colors.red);
    log(`  Erro: ${error.message}`, colors.red);
    log('\n💡 Solução: Execute "npm run dev" no terminal do servidor\n', colors.yellow);
    return;
  }

  // Teste 2: Teste de rota de áudio com HEAD
  log('\n2️⃣  Testando rota HEAD /api/media/audio/*...', colors.cyan);
  const testAudioFile = 'test_audio.ogg';
  try {
    const result = await testUrl(`${SERVER_URL}/api/media/audio/${testAudioFile}`, 'HEAD');
    if (result.status === 404) {
      log('  ⚠️  Arquivo de teste não encontrado (esperado)', colors.yellow);
    } else if (result.status === 200) {
      log('  ✅ Rota de áudio funcionando!', colors.green);
    }
  } catch (error) {
    log(`  ❌ Erro ao testar rota de áudio`, colors.red);
    log(`  Erro: ${error.message}`, colors.red);
  }

  // Teste 3: Teste de rota de áudio com GET
  log('\n3️⃣  Testando rota GET /api/media/audio/*...', colors.cyan);
  try {
    const result = await testUrl(`${SERVER_URL}/api/media/audio/${testAudioFile}`, 'GET');
    if (result.status === 404) {
      log('  ⚠️  Arquivo de teste não encontrado (esperado)', colors.yellow);
    } else if (result.status === 200) {
      log('  ✅ Rota de áudio GET funcionando!', colors.green);
    }
  } catch (error) {
    log(`  ❌ Erro ao testar rota de áudio GET`, colors.red);
    log(`  Erro: ${error.message}`, colors.red);
  }

  log('\n' + '='.repeat(80));
  log('\n✅ Testes concluídos!\n', colors.green);
  
  log('📋 PRÓXIMOS PASSOS:', colors.cyan);
  log('  1. Se o servidor não estiver rodando, execute: npm run dev');
  log('  2. Envie um áudio no WhatsApp para testar o processamento completo');
  log('  3. Verifique os logs do servidor para erros de upload');
  log('  4. Use o script diagnose-audio-issue.ts para verificar arquivos no S3\n');
}

runTests().catch(console.error);
