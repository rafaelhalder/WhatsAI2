import * as fs from 'fs';
import * as path from 'path';

export class CampaignLogger {
  private logFile: string;
  private logStream: fs.WriteStream;

  constructor(logFileName: string = 'campaign-processing.log') {
    this.logFile = path.join(process.cwd(), 'logs', logFileName);

    // Criar diretório logs se não existir
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Criar stream de escrita
    this.logStream = fs.createWriteStream(this.logFile, {
      flags: 'a', // append
      encoding: 'utf8'
    });

    this.log('🎯 [CAMPAIGN_LOGGER] Logger de campanhas inicializado');
    this.log(`📁 Arquivo de log: ${this.logFile}`);
  }

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;

    // Log no console
    console.log(logEntry);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }

    // Log no arquivo
    this.logStream.write(logEntry + '\n');
    if (data) {
      this.logStream.write(JSON.stringify(data, null, 2) + '\n');
    }
  }

  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ❌ ERROR: ${message}`;

    // Log no console
    console.error(logEntry);
    if (error) {
      console.error(error);
    }

    // Log no arquivo
    this.logStream.write(logEntry + '\n');
    if (error) {
      this.logStream.write(JSON.stringify(error, null, 2) + '\n');
    }
  }

  close() {
    this.logStream.end();
  }
}

// Instância global do logger
export const campaignLogger = new CampaignLogger();
