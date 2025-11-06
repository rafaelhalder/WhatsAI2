import { TemplateService } from '../../services/template-service';
import { prisma } from '../../database/prisma';

// Mock Prisma
jest.mock('../../database/prisma', () => ({
  prisma: {
    messageTemplate: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn()
    }
  }
}));

describe('TemplateService', () => {
  let templateService: TemplateService;
  const mockUserId = 'test-user-id';
  const mockTemplateId = 'test-template-id';

  beforeEach(() => {
    jest.clearAllMocks();
    templateService = new TemplateService();
  });

  describe('createTemplate', () => {
    it('should create a template with extracted variables', async () => {
      const mockTemplateData = {
        name: 'Welcome Message',
        content: 'Hello {{name}}, welcome to {{company}}!',
        category: 'greeting' as const,
        tags: ['welcome', 'onboarding']
      };

      const mockCreatedTemplate = {
        id: mockTemplateId,
        userId: mockUserId,
        ...mockTemplateData,
        variables: '["name","company"]',
        tags: '["welcome","onboarding"]',
        usageCount: 0,
        isFavorite: false,
        mediaUrl: null,
        mediaType: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.messageTemplate.create as jest.Mock).mockResolvedValue(mockCreatedTemplate);

      const result = await templateService.createTemplate(mockUserId, mockTemplateData);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(mockTemplateData.name);
      expect(result.content).toBe(mockTemplateData.content);
      expect(result.variables).toEqual(['name', 'company']);
      expect(prisma.messageTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          name: mockTemplateData.name,
          content: mockTemplateData.content,
          variables: expect.any(String)
        })
      });
    });

    it('should create a template without variables', async () => {
      const mockTemplateData = {
        name: 'Simple Message',
        content: 'This is a simple message without variables.',
        category: 'custom' as const
      };

      const mockCreatedTemplate = {
        id: mockTemplateId,
        userId: mockUserId,
        ...mockTemplateData,
        variables: null,
        tags: null,
        usageCount: 0,
        isFavorite: false,
        mediaUrl: null,
        mediaType: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.messageTemplate.create as jest.Mock).mockResolvedValue(mockCreatedTemplate);

      const result = await templateService.createTemplate(mockUserId, mockTemplateData);

      expect(result.variables).toEqual([]);
    });
  });

  describe('getTemplateById', () => {
    it('should return a template by ID', async () => {
      const mockTemplate = {
        id: mockTemplateId,
        userId: mockUserId,
        name: 'Test Template',
        content: 'Test content',
        category: 'test',
        variables: '["var1"]',
        tags: '["tag1"]',
        usageCount: 5,
        isFavorite: false,
        mediaUrl: null,
        mediaType: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.messageTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await templateService.getTemplateById(mockTemplateId, mockUserId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockTemplateId);
      expect(result?.variables).toEqual(['var1']);
      expect(prisma.messageTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockTemplateId,
          userId: mockUserId
        }
      });
    });

    it('should return null if template not found', async () => {
      (prisma.messageTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await templateService.getTemplateById('nonexistent', mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('listTemplates', () => {
    it('should return list of templates with filters', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          userId: mockUserId,
          name: 'Template 1',
          content: 'Content 1',
          category: 'greeting',
          variables: null,
          tags: null,
          usageCount: 0,
          isFavorite: false,
          mediaUrl: null,
          mediaType: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (prisma.messageTemplate.count as jest.Mock).mockResolvedValue(1);
      (prisma.messageTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);

      const result = await templateService.listTemplates(mockUserId, {
        category: 'greeting',
        limit: 10,
        offset: 0
      });

      expect(result.templates).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.messageTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            category: 'greeting'
          })
        })
      );
    });

    it('should filter templates by search term', async () => {
      (prisma.messageTemplate.count as jest.Mock).mockResolvedValue(0);
      (prisma.messageTemplate.findMany as jest.Mock).mockResolvedValue([]);

      await templateService.listTemplates(mockUserId, {
        search: 'welcome'
      });

      expect(prisma.messageTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array)
          })
        })
      );
    });
  });

  describe('updateTemplate', () => {
    it('should update a template', async () => {
      const mockExistingTemplate = {
        id: mockTemplateId,
        userId: mockUserId,
        name: 'Old Name',
        content: 'Old content',
        category: 'old',
        variables: null,
        tags: null,
        usageCount: 0,
        isFavorite: false,
        mediaUrl: null,
        mediaType: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpdatedTemplate = {
        ...mockExistingTemplate,
        name: 'New Name',
        content: 'New content with {{variable}}'
      };

      (prisma.messageTemplate.findFirst as jest.Mock).mockResolvedValue(mockExistingTemplate);
      (prisma.messageTemplate.update as jest.Mock).mockResolvedValue(mockUpdatedTemplate);

      const result = await templateService.updateTemplate(mockTemplateId, mockUserId, {
        name: 'New Name',
        content: 'New content with {{variable}}'
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe('New Name');
      expect(prisma.messageTemplate.update).toHaveBeenCalled();
    });

    it('should return null if template not found', async () => {
      (prisma.messageTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await templateService.updateTemplate(mockTemplateId, mockUserId, {
        name: 'New Name'
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      const mockTemplate = {
        id: mockTemplateId,
        userId: mockUserId,
        name: 'Test',
        content: 'Test',
        category: null,
        variables: null,
        tags: null,
        usageCount: 0,
        isFavorite: false,
        mediaUrl: null,
        mediaType: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.messageTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.messageTemplate.delete as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await templateService.deleteTemplate(mockTemplateId, mockUserId);

      expect(result).toBe(true);
      expect(prisma.messageTemplate.delete).toHaveBeenCalledWith({
        where: { id: mockTemplateId }
      });
    });

    it('should return false if template not found', async () => {
      (prisma.messageTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await templateService.deleteTemplate('nonexistent', mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('renderTemplate', () => {
    it('should render template with variables', () => {
      const content = 'Hello {{name}}, your order {{orderId}} is ready!';
      const variables = {
        name: 'John',
        orderId: '12345'
      };

      const result = templateService.renderTemplate(content, variables);

      expect(result).toBe('Hello John, your order 12345 is ready!');
    });

    it('should remove unreplaced variables', () => {
      const content = 'Hello {{name}}, {{missing}} variable';
      const variables = {
        name: 'John'
      };

      const result = templateService.renderTemplate(content, variables);

      expect(result).toBe('Hello John,  variable');
      expect(result).not.toContain('{{missing}}');
    });
  });

  describe('renderTemplateById', () => {
    it('should render template by ID and increment usage count', async () => {
      const mockTemplate = {
        id: mockTemplateId,
        userId: mockUserId,
        name: 'Test',
        content: 'Hello {{name}}!',
        category: null,
        variables: '["name"]',
        tags: null,
        usageCount: 0,
        isFavorite: false,
        mediaUrl: null,
        mediaType: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.messageTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate);
      (prisma.messageTemplate.update as jest.Mock).mockResolvedValue({
        ...mockTemplate,
        usageCount: 1
      });

      const result = await templateService.renderTemplateById(
        mockTemplateId,
        mockUserId,
        { name: 'John' }
      );

      expect(result).not.toBeNull();
      expect(result?.content).toBe('Hello John!');
      expect(prisma.messageTemplate.update).toHaveBeenCalledWith({
        where: { id: mockTemplateId },
        data: { usageCount: { increment: 1 } }
      });
    });
  });

  describe('getUsageStats', () => {
    it('should return template usage statistics', async () => {
      const mockStats = [
        {
          id: 'template-1',
          name: 'Template 1',
          usageCount: 10,
          category: 'greeting',
          updatedAt: new Date()
        },
        {
          id: 'template-2',
          name: 'Template 2',
          usageCount: 5,
          category: 'farewell',
          updatedAt: new Date()
        }
      ];

      (prisma.messageTemplate.findMany as jest.Mock).mockResolvedValue(mockStats);

      const result = await templateService.getUsageStats(mockUserId, 10);

      expect(result).toHaveLength(2);
      if (result[0]) {
        expect(result[0]).toHaveProperty('templateId');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('usageCount');
        expect(result[0].usageCount).toBe(10);
      }
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate a template', async () => {
      const mockOriginal = {
        id: mockTemplateId,
        userId: mockUserId,
        name: 'Original',
        content: 'Content',
        category: 'test',
        variables: null,
        tags: '["tag1"]',
        usageCount: 5,
        isFavorite: true,
        mediaUrl: null,
        mediaType: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockDuplicate = {
        ...mockOriginal,
        id: 'new-id',
        name: 'Original (Cópia)',
        usageCount: 0,
        isFavorite: false
      };

      (prisma.messageTemplate.findFirst as jest.Mock).mockResolvedValue(mockOriginal);
      (prisma.messageTemplate.create as jest.Mock).mockResolvedValue(mockDuplicate);

      const result = await templateService.duplicateTemplate(mockTemplateId, mockUserId);

      expect(result).not.toBeNull();
      expect(result?.name).toContain('(Cópia)');
      expect(result?.usageCount).toBe(0);
      expect(result?.isFavorite).toBe(false);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates grouped by category', async () => {
      const mockGrouped = [
        { category: 'greeting', _count: { category: 5 } },
        { category: 'farewell', _count: { category: 3 } }
      ];

      (prisma.messageTemplate.groupBy as jest.Mock).mockResolvedValue(mockGrouped);

      const result = await templateService.getTemplatesByCategory(mockUserId);

      expect(result).toHaveProperty('greeting', 5);
      expect(result).toHaveProperty('farewell', 3);
    });
  });
});
