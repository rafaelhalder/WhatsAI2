import { prisma } from '../database/prisma';

interface CreateAutoResponseDto {
  instanceId: string;
  name: string;
  keywords: string[];
  matchType?: 'CONTAINS' | 'EXACT' | 'STARTS_WITH' | 'ENDS_WITH';
  caseSensitive?: boolean;
  response: string;
  useVariables?: boolean;
  mediaUrl?: string;
  mediaType?: string;
  active?: boolean;
}

interface UpdateAutoResponseDto {
  name?: string;
  keywords?: string[];
  matchType?: 'CONTAINS' | 'EXACT' | 'STARTS_WITH' | 'ENDS_WITH';
  caseSensitive?: boolean;
  response?: string;
  useVariables?: boolean;
  mediaUrl?: string;
  mediaType?: string;
  active?: boolean;
}

class AutoResponseService {
  /**
   * Criar nova auto-resposta
   */
  async createAutoResponse(userId: string, data: CreateAutoResponseDto) {
    // Verificar se a instância pertence ao usuário
    const instance = await prisma.whatsAppInstance.findFirst({
      where: {
        id: data.instanceId,
        userId,
      },
    });

    if (!instance) {
      throw new Error('Instance not found or does not belong to user');
    }

    // Criar auto-resposta
    const autoResponse = await prisma.autoResponse.create({
      data: {
        instanceId: data.instanceId,
        name: data.name,
        keywords: data.keywords,
        matchType: data.matchType || 'CONTAINS',
        caseSensitive: data.caseSensitive ?? false,
        response: data.response,
        useVariables: data.useVariables ?? true,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        active: data.active ?? true,
      },
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return autoResponse;
  }

  /**
   * Listar auto-respostas de uma instância
   */
  async listAutoResponses(userId: string, instanceId: string) {
    // Verificar se a instância pertence ao usuário
    const instance = await prisma.whatsAppInstance.findFirst({
      where: {
        id: instanceId,
        userId,
      },
    });

    if (!instance) {
      throw new Error('Instance not found or does not belong to user');
    }

    const autoResponses = await prisma.autoResponse.findMany({
      where: {
        instanceId,
      },
      orderBy: [
        { active: 'desc' }, // Ativas primeiro
        { triggerCount: 'desc' }, // Mais usadas primeiro
        { createdAt: 'desc' },
      ],
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return autoResponses;
  }

  /**
   * Obter auto-resposta específica
   */
  async getAutoResponse(userId: string, autoResponseId: string) {
    const autoResponse = await prisma.autoResponse.findFirst({
      where: {
        id: autoResponseId,
        instance: {
          userId,
        },
      },
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!autoResponse) {
      throw new Error('Auto-response not found');
    }

    return autoResponse;
  }

  /**
   * Atualizar auto-resposta
   */
  async updateAutoResponse(
    userId: string,
    autoResponseId: string,
    data: UpdateAutoResponseDto
  ) {
    // Verificar se pertence ao usuário
    const existing = await this.getAutoResponse(userId, autoResponseId);

    const autoResponse = await prisma.autoResponse.update({
      where: {
        id: autoResponseId,
      },
      data,
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return autoResponse;
  }

  /**
   * Deletar auto-resposta
   */
  async deleteAutoResponse(userId: string, autoResponseId: string) {
    // Verificar se pertence ao usuário
    await this.getAutoResponse(userId, autoResponseId);

    await prisma.autoResponse.delete({
      where: {
        id: autoResponseId,
      },
    });

    return { success: true };
  }

  /**
   * Toggle ativo/inativo
   */
  async toggleAutoResponse(userId: string, autoResponseId: string) {
    const autoResponse = await this.getAutoResponse(userId, autoResponseId);

    const updated = await prisma.autoResponse.update({
      where: {
        id: autoResponseId,
      },
      data: {
        active: !autoResponse.active,
      },
      include: {
        instance: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Verificar se mensagem ativa alguma auto-resposta
   * Retorna a primeira auto-resposta que der match
   */
  async checkAutoResponses(instanceId: string, messageContent: string) {
    const autoResponses = await prisma.autoResponse.findMany({
      where: {
        instanceId,
        active: true,
      },
      orderBy: {
        triggerCount: 'desc', // Priorizar mais usadas
      },
    });

    for (const autoResponse of autoResponses) {
      const isMatch = this.checkMatch(
        messageContent,
        autoResponse.keywords,
        autoResponse.matchType,
        autoResponse.caseSensitive
      );

      if (isMatch) {
        // Incrementar contador
        await prisma.autoResponse.update({
          where: { id: autoResponse.id },
          data: {
            triggerCount: { increment: 1 },
            lastTriggeredAt: new Date(),
          },
        });

        return autoResponse;
      }
    }

    return null;
  }

  /**
   * Verificar se mensagem dá match com keywords
   */
  private checkMatch(
    message: string,
    keywords: string[],
    matchType: string,
    caseSensitive: boolean
  ): boolean {
    const msg = caseSensitive ? message : message.toLowerCase();

    for (const keyword of keywords) {
      const kw = caseSensitive ? keyword : keyword.toLowerCase();

      switch (matchType) {
        case 'EXACT':
          if (msg === kw) return true;
          break;
        case 'STARTS_WITH':
          if (msg.startsWith(kw)) return true;
          break;
        case 'ENDS_WITH':
          if (msg.endsWith(kw)) return true;
          break;
        case 'CONTAINS':
        default:
          if (msg.includes(kw)) return true;
          break;
      }
    }

    return false;
  }

  /**
   * Substituir variáveis na mensagem
   */
  replaceVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Obter estatísticas de automação
   */
  async getAutomationStats(userId: string, instanceId: string) {
    // Verificar se a instância pertence ao usuário
    const instance = await prisma.whatsAppInstance.findFirst({
      where: {
        id: instanceId,
        userId,
      },
    });

    if (!instance) {
      throw new Error('Instance not found or does not belong to user');
    }

    const autoResponses = await prisma.autoResponse.findMany({
      where: { instanceId },
    });

    const activeCount = autoResponses.filter((ar: any) => ar.active).length;
    const inactiveCount = autoResponses.filter((ar: any) => !ar.active).length;
    const totalTriggers = autoResponses.reduce(
      (sum: number, ar: any) => sum + ar.triggerCount,
      0
    );

    const mostUsed = autoResponses
      .filter((ar: any) => ar.triggerCount > 0)
      .sort((a: any, b: any) => b.triggerCount - a.triggerCount)
      .slice(0, 5);

    return {
      totalRules: autoResponses.length,
      activeRules: activeCount,
      inactiveRules: inactiveCount,
      totalTriggers,
      mostUsed: mostUsed.map((ar: any) => ({
        id: ar.id,
        name: ar.name,
        triggerCount: ar.triggerCount,
        lastTriggeredAt: ar.lastTriggeredAt,
      })),
    };
  }
}

export const autoResponseService = new AutoResponseService();
