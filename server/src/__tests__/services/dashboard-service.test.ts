import { DashboardService } from '../../services/dashboard-service';
import { prisma } from '../../database/prisma';

// Mock Prisma
jest.mock('../../database/prisma', () => ({
  prisma: {
    whatsAppInstance: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    message: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn()
    },
    conversation: {
      count: jest.fn(),
      findMany: jest.fn()
    },
    user: {
      count: jest.fn()
    }
  }
}));

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  const mockUserId = 'test-user-id';
  const mockUserRole = 'USER';
  const mockInstanceId = 'test-instance-id';

  beforeEach(() => {
    jest.clearAllMocks();
    dashboardService = new DashboardService();
  });

  describe('getMetrics', () => {
    it('should return comprehensive dashboard metrics', async () => {
      // Mock user instances
      (prisma.whatsAppInstance.findMany as jest.Mock).mockResolvedValue([
        { id: mockInstanceId }
      ]);

      // Mock counts
      (prisma.message.count as jest.Mock)
        .mockResolvedValueOnce(100) // totalMessages
        .mockResolvedValueOnce(10) // mediaMessages
        .mockResolvedValueOnce(90); // deliveredMessages

      (prisma.whatsAppInstance.count as jest.Mock)
        .mockResolvedValueOnce(3) // activeInstances
        .mockResolvedValueOnce(5); // totalInstances

      (prisma.user.count as jest.Mock).mockResolvedValue(1);
      (prisma.conversation.count as jest.Mock).mockResolvedValue(20);

      const result = await dashboardService.getMetrics(mockUserId, mockUserRole);

      expect(result).toMatchObject({
        totalMessages: 100,
        activeInstances: 3,
        totalUsers: 1,
        totalConversations: 20,
        deliveryRate: expect.any(Number),
        storageUsed: expect.any(Number),
        costs: {
          evolutionApi: expect.any(Number),
          storage: expect.any(Number),
          total: expect.any(Number)
        }
      });

      expect(result.deliveryRate).toBe(90); // 90/100 * 100
    });

    it('should return admin metrics for ADMIN role', async () => {
      (prisma.whatsAppInstance.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.count as jest.Mock).mockResolvedValue(0);
      (prisma.whatsAppInstance.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.count as jest.Mock).mockResolvedValue(10);
      (prisma.conversation.count as jest.Mock).mockResolvedValue(0);

      const result = await dashboardService.getMetrics(mockUserId, 'ADMIN');

      expect(result.totalUsers).toBe(10);
      expect(prisma.user.count).toHaveBeenCalled();
    });
  });

  describe('getMessageChartData', () => {
    it('should return message chart data for specified days', async () => {
      const days = 7;
      const mockMessages = [
        { createdAt: new Date('2024-01-01'), status: 'DELIVERED' },
        { createdAt: new Date('2024-01-01'), status: 'FAILED' },
        { createdAt: new Date('2024-01-02'), status: 'DELIVERED' }
      ];

      (prisma.whatsAppInstance.findMany as jest.Mock).mockResolvedValue([
        { id: mockInstanceId }
      ]);

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await dashboardService.getMessageChartData(mockUserId, days);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(days);
      if (result[0]) {
        expect(result[0]).toHaveProperty('date');
        expect(result[0]).toHaveProperty('messages');
        expect(result[0]).toHaveProperty('delivered');
        expect(result[0]).toHaveProperty('failed');
      }
    });

    it('should return empty array with filled dates when no instances exist', async () => {
      (prisma.whatsAppInstance.findMany as jest.Mock).mockResolvedValue([]);

      const result = await dashboardService.getMessageChartData(mockUserId, 7);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(7);
    });
  });

  describe('getInstanceStatusData', () => {
    it('should return instance status breakdown', async () => {
      const mockStatusData = [
        { status: 'connected', _count: { status: 3 } },
        { status: 'disconnected', _count: { status: 2 } }
      ];

      (prisma.whatsAppInstance.groupBy as jest.Mock).mockResolvedValue(mockStatusData);

      const result = await dashboardService.getInstanceStatusData(mockUserId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('percentage');
    });
  });

  describe('getCostData', () => {
    it('should return cost breakdown by month', async () => {
      (prisma.whatsAppInstance.count as jest.Mock).mockResolvedValue(5);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([
        { mediaUrl: 'http://example.com/media1.jpg' },
        { mediaUrl: 'http://example.com/media2.jpg' }
      ]);

      const result = await dashboardService.getCostData(mockUserId, 6);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(6);
      expect(result[0]).toHaveProperty('month');
      expect(result[0]).toHaveProperty('evolutionApi');
      expect(result[0]).toHaveProperty('storage');
      expect(result[0]).toHaveProperty('total');
      if (result[0]) {
        expect(result[0].total).toBeGreaterThan(0);
      }
    });
  });

  describe('getUserActivityData', () => {
    it('should return user activity data over time', async () => {
      const mockGroupedData = [
        { createdAt: new Date('2024-01-01'), _count: { id: 5 } },
        { createdAt: new Date('2024-01-02'), _count: { id: 3 } }
      ];

      (prisma.message.groupBy as jest.Mock).mockResolvedValue(mockGroupedData);

      const result = await dashboardService.getUserActivityData(mockUserId, 30);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(30);
      if (result[0]) {
        expect(result[0]).toHaveProperty('date');
        expect(result[0]).toHaveProperty('activeUsers');
        expect(result[0]).toHaveProperty('newUsers');
      }
    });
  });

  describe('getActivityLog', () => {
    it('should return recent activity log', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Test message',
          createdAt: new Date(),
          status: 'DELIVERED',
          instance: { id: mockInstanceId, name: 'Test Instance' }
        }
      ];

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await dashboardService.getActivityLog(mockUserId, 50);

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('metadata');
    });
  });

  describe('getPeakUsageHours', () => {
    it('should return top 5 peak usage hours', async () => {
      const mockMessages = [
        { createdAt: new Date('2024-01-01T10:00:00') },
        { createdAt: new Date('2024-01-01T10:30:00') },
        { createdAt: new Date('2024-01-01T14:00:00') }
      ];

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await dashboardService.getPeakUsageHours(mockUserId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(5);
      if (result.length > 0 && result[0]) {
        expect(result[0]).toHaveProperty('hour');
        expect(result[0]).toHaveProperty('count');
        expect(result[0].hour).toBeGreaterThanOrEqual(0);
        expect(result[0].hour).toBeLessThan(24);
      }
    });
  });

  describe('getResponseTimeStats', () => {
    it('should return response time statistics', async () => {
      const mockConversations = [
        {
          messages: [
            { createdAt: new Date('2024-01-01T10:00:00'), fromMe: false },
            { createdAt: new Date('2024-01-01T10:05:00'), fromMe: true },
            { createdAt: new Date('2024-01-01T10:10:00'), fromMe: false },
            { createdAt: new Date('2024-01-01T10:15:00'), fromMe: true }
          ]
        }
      ];

      (prisma.whatsAppInstance.findMany as jest.Mock).mockResolvedValue([
        { id: mockInstanceId }
      ]);

      (prisma.conversation.findMany as jest.Mock).mockResolvedValue(mockConversations);

      const result = await dashboardService.getResponseTimeStats(mockUserId);

      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('median');
      expect(result).toHaveProperty('min');
      expect(result).toHaveProperty('max');
      expect(result.average).toBeGreaterThanOrEqual(0);
    });

    it('should return zero stats when no conversations exist', async () => {
      (prisma.whatsAppInstance.findMany as jest.Mock).mockResolvedValue([
        { id: mockInstanceId }
      ]);

      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await dashboardService.getResponseTimeStats(mockUserId);

      expect(result.average).toBe(0);
      expect(result.median).toBe(0);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
    });
  });
});
