import * as cron from 'node-cron';
import { prisma } from '../database/prisma';
import { campaignService } from '../services/campaign-service';

/**
 * Campaign Scheduler
 * Verifica a cada minuto se há campanhas agendadas para iniciar
 */
class CampaignScheduler {
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Inicia o scheduler
   */
  start(): void {
    if (this.task) {
      console.log('[CAMPAIGN SCHEDULER] Scheduler já está rodando');
      return;
    }

    // Executa a cada minuto: */1 * * * *
    this.task = cron.schedule('* * * * *', async () => {
      await this.checkScheduledCampaigns();
    });

    console.log('[CAMPAIGN SCHEDULER] ✅ Scheduler iniciado (verificação a cada 1 minuto)');
  }

  /**
   * Para o scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[CAMPAIGN SCHEDULER] ⏹️ Scheduler parado');
    }
  }

  /**
   * Verifica e inicia campanhas agendadas
   */
  private async checkScheduledCampaigns(): Promise<void> {
    // Evita execuções paralelas
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const now = new Date();

      // Busca campanhas agendadas que já passaram do horário
      const scheduledCampaigns = await prisma.campaign.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledFor: {
            lte: now // Menor ou igual ao horário atual
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          instance: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        }
      });

      if (scheduledCampaigns.length === 0) {
        return;
      }

      console.log(`[CAMPAIGN SCHEDULER] 📢 Encontradas ${scheduledCampaigns.length} campanha(s) agendada(s) para iniciar`);

      // Inicia cada campanha
      for (const campaign of scheduledCampaigns) {
        try {
          // Verifica se a instância está conectada
          if (campaign.instance.status !== 'CONNECTED') {
            console.warn(`[CAMPAIGN SCHEDULER] ⚠️ Campanha ${campaign.id} - Instância ${campaign.instance.name} não está conectada`);
            
            // Marca como falha
            await prisma.campaign.update({
              where: { id: campaign.id },
              data: { 
                status: 'FAILED',
                completedAt: new Date()
              }
            });

            // TODO: Notificar usuário por email/websocket
            continue;
          }

          console.log(`[CAMPAIGN SCHEDULER] 🚀 Iniciando campanha agendada: ${campaign.name} (ID: ${campaign.id})`);

          // Inicia a campanha usando o serviço
          await campaignService.startCampaign(campaign.id, campaign.userId);

          console.log(`[CAMPAIGN SCHEDULER] ✅ Campanha ${campaign.name} iniciada com sucesso`);

          // TODO: Notificar usuário via WebSocket
          // socketService.notifyUser(campaign.userId, {
          //   type: 'CAMPAIGN_STARTED',
          //   data: { campaignId: campaign.id, campaignName: campaign.name }
          // });

        } catch (error: any) {
          console.error(`[CAMPAIGN SCHEDULER] ❌ Erro ao iniciar campanha ${campaign.id}:`, error);

          // Marca como falha
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { 
              status: 'FAILED',
              completedAt: new Date()
            }
          });

          // TODO: Notificar usuário sobre o erro
        }
      }

    } catch (error: any) {
      console.error('[CAMPAIGN SCHEDULER] ❌ Erro ao verificar campanhas agendadas:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Verifica o status do scheduler
   */
  isActive(): boolean {
    return this.task !== null;
  }
}

// Exporta instância única
export const campaignScheduler = new CampaignScheduler();
