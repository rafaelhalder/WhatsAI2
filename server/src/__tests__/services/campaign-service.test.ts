import { CampaignService } from '../../services/campaign-service';
import { prisma } from '../../database/prisma';
import { templateService } from '../../services/template-service';

// Mock Prisma
jest.mock('../../database/prisma', () => ({
  prisma: {
    whatsAppInstance: {
      findFirst: jest.fn()
    },
    campaign: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn()
    },
    campaignMessage: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn()
    }
  }
}));

// Mock template service
jest.mock('../../services/template-service', () => ({
  templateService: {
    getTemplateById: jest.fn()
  }
}));

describe('CampaignService', () => {
  let campaignService: CampaignService;
  const mockUserId = 'test-user-id';
  const mockInstanceId = 'test-instance-id';
  const mockCampaignId = 'test-campaign-id';

  beforeEach(() => {
    jest.clearAllMocks();
    campaignService = new CampaignService();
  });

  afterEach(() => {
    // Clear any running campaigns
    campaignService.removeAllListeners();
  });

  describe('createCampaign', () => {
    it('should create a campaign successfully', async () => {
      const mockInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: 'Test Instance'
      };

      const mockCampaignData = {
        name: 'Test Campaign',
        instanceId: mockInstanceId,
        message: 'Hello {{name}}!',
        recipients: [
          { phone: '5511999999999', variables: { name: 'John' } },
          { phone: '5511888888888', variables: { name: 'Jane' } }
        ],
        rateLimit: 10
      };

      const mockCreatedCampaign = {
        id: mockCampaignId,
        userId: mockUserId,
        ...mockCampaignData,
        templateId: null,
        mediaUrl: null,
        mediaType: null,
        scheduledFor: null,
        totalRecipients: 2,
        sentCount: 0,
        failedCount: 0,
        pendingCount: 2,
        recipientsData: JSON.stringify(mockCampaignData.recipients),
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.whatsAppInstance.findFirst as jest.Mock).mockResolvedValue(mockInstance);
      (prisma.campaign.create as jest.Mock).mockResolvedValue(mockCreatedCampaign);
      (prisma.campaignMessage.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await campaignService.createCampaign(mockUserId, mockCampaignData);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(mockCampaignData.name);
      expect(result.totalRecipients).toBe(2);
      expect(prisma.campaign.create).toHaveBeenCalled();
      expect(prisma.campaignMessage.createMany).toHaveBeenCalled();
    });

    it('should throw error if instance not found', async () => {
      (prisma.whatsAppInstance.findFirst as jest.Mock).mockResolvedValue(null);

      const mockCampaignData = {
        name: 'Test Campaign',
        instanceId: 'nonexistent',
        message: 'Test',
        recipients: [],
        rateLimit: 10
      };

      await expect(
        campaignService.createCampaign(mockUserId, mockCampaignData)
      ).rejects.toThrow('Instância não encontrada');
    });

    it('should throw error if template not found', async () => {
      const mockInstance = {
        id: mockInstanceId,
        userId: mockUserId
      };

      (prisma.whatsAppInstance.findFirst as jest.Mock).mockResolvedValue(mockInstance);
      (templateService.getTemplateById as jest.Mock).mockResolvedValue(null);

      const mockCampaignData = {
        name: 'Test Campaign',
        instanceId: mockInstanceId,
        templateId: 'nonexistent',
        message: 'Test',
        recipients: [],
        rateLimit: 10
      };

      await expect(
        campaignService.createCampaign(mockUserId, mockCampaignData)
      ).rejects.toThrow('Template não encontrado');
    });

    it('should create scheduled campaign', async () => {
      const mockInstance = {
        id: mockInstanceId,
        userId: mockUserId
      };

      const scheduledDate = new Date(Date.now() + 86400000); // Tomorrow
      const mockCampaignData = {
        name: 'Scheduled Campaign',
        instanceId: mockInstanceId,
        message: 'Test',
        recipients: [],
        rateLimit: 10,
        scheduledFor: scheduledDate.toISOString()
      };

      const mockCreatedCampaign = {
        id: mockCampaignId,
        userId: mockUserId,
        ...mockCampaignData,
        scheduledFor: scheduledDate,
        status: 'SCHEDULED',
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
        pendingCount: 0,
        recipientsData: '[]',
        templateId: null,
        mediaUrl: null,
        mediaType: null,
        rateLimit: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.whatsAppInstance.findFirst as jest.Mock).mockResolvedValue(mockInstance);
      (prisma.campaign.create as jest.Mock).mockResolvedValue(mockCreatedCampaign);
      (prisma.campaignMessage.createMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await campaignService.createCampaign(mockUserId, mockCampaignData);

      expect(result.status).toBe('SCHEDULED');
    });
  });

  describe('getCampaignById', () => {
    it('should return campaign by ID', async () => {
      const mockCampaign = {
        id: mockCampaignId,
        userId: mockUserId,
        name: 'Test Campaign',
        instanceId: mockInstanceId,
        message: 'Test message',
        templateId: null,
        mediaUrl: null,
        mediaType: null,
        scheduledFor: null,
        totalRecipients: 10,
        sentCount: 5,
        failedCount: 0,
        pendingCount: 5,
        recipientsData: '[]',
        status: 'RUNNING',
        rateLimit: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);

      const result = await campaignService.getCampaignById(mockCampaignId, mockUserId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockCampaignId);
      expect(prisma.campaign.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCampaignId,
          userId: mockUserId
        }
      });
    });

    it('should return null if campaign not found', async () => {
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await campaignService.getCampaignById('nonexistent', mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('listCampaigns', () => {
    it('should return list of campaigns with filters', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          userId: mockUserId,
          name: 'Campaign 1',
          instanceId: mockInstanceId,
          message: 'Test',
          status: 'COMPLETED',
          totalRecipients: 10,
          sentCount: 10,
          failedCount: 0,
          pendingCount: 0,
          recipientsData: '[]',
          templateId: null,
          mediaUrl: null,
          mediaType: null,
          scheduledFor: null,
          rateLimit: 10,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (prisma.campaign.count as jest.Mock).mockResolvedValue(1);
      (prisma.campaign.findMany as jest.Mock).mockResolvedValue(mockCampaigns);

      const result = await campaignService.listCampaigns(mockUserId, {
        status: 'COMPLETED',
        limit: 10,
        offset: 0
      });

      expect(result.campaigns).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            status: 'COMPLETED'
          })
        })
      );
    });

    it('should filter by instance', async () => {
      (prisma.campaign.count as jest.Mock).mockResolvedValue(0);
      (prisma.campaign.findMany as jest.Mock).mockResolvedValue([]);

      await campaignService.listCampaigns(mockUserId, {
        instanceId: mockInstanceId
      });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            instanceId: mockInstanceId
          })
        })
      );
    });
  });

  describe('deleteCampaign', () => {
    it('should delete a campaign', async () => {
      const mockCampaign = {
        id: mockCampaignId,
        userId: mockUserId,
        name: 'Test',
        status: 'DRAFT'
      };

      (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.campaign.delete as jest.Mock).mockResolvedValue(mockCampaign);

      const result = await campaignService.deleteCampaign(mockCampaignId, mockUserId);

      expect(result).toBe(true);
      expect(prisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: mockCampaignId }
      });
    });

    it('should return false if campaign not found', async () => {
      (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await campaignService.deleteCampaign('nonexistent', mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('getCampaignProgress', () => {
    it('should return campaign progress', async () => {
      const mockCampaign = {
        id: mockCampaignId,
        userId: mockUserId,
        totalRecipients: 100,
        sentCount: 60,
        failedCount: 5,
        pendingCount: 35,
        status: 'RUNNING'
      };

      (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);

      const result = await campaignService.getCampaignProgress(mockCampaignId, mockUserId);

      expect(result).not.toBeNull();
      expect(result?.totalRecipients).toBe(100);
      expect(result?.sentCount).toBe(60);
      expect(result?.failedCount).toBe(5);
      expect(result?.pendingCount).toBe(35);
      expect(result?.progress).toBeGreaterThanOrEqual(0);
      expect(result?.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('getCampaignStats', () => {
    it('should return general campaign statistics', async () => {
      const mockCampaigns = [
        { status: 'COMPLETED', _count: { status: 10 } },
        { status: 'RUNNING', _count: { status: 3 } },
        { status: 'FAILED', _count: { status: 1 } }
      ];

      const mockTotalRecipients = { _sum: { totalRecipients: 1000 } };
      const mockSentCount = { _sum: { sentCount: 850 } };

      (prisma.campaign.groupBy as jest.Mock).mockResolvedValue(mockCampaigns);
      (prisma.campaign.aggregate as jest.Mock)
        .mockResolvedValueOnce(mockTotalRecipients)
        .mockResolvedValueOnce(mockSentCount);

      const result = await campaignService.getCampaignStats(mockUserId);

      expect(result).toHaveProperty('totalCampaigns');
      expect(result).toHaveProperty('campaignsByStatus');
      expect(result).toHaveProperty('totalMessagesSent');
      expect(result.totalCampaigns).toBe(14);
    });
  });
});
