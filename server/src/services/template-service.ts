import { prisma } from '../database/prisma';
import { MessageTemplate, RenderTemplateResponse, TemplateUsageStats } from '../types';
import { CreateTemplateInput, UpdateTemplateInput, ListTemplatesQuery } from '../schemas/template-schemas';

export class TemplateService {
  /**
   * Extract variables from template content
   * Finds patterns like {{variable_name}}
   */
  private extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const variable = match[1];
      if (variable && !variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Render template with provided variables
   */
  renderTemplate(content: string, variables: Record<string, string>): string {
    let rendered = content;

    // Replace each variable
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    });

    // Remove any remaining unreplaced variables (keep as is or remove)
    // For now, we'll remove them to avoid sending {{varname}} in messages
    rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

    return rendered;
  }

  /**
   * Create a new template
   */
  async createTemplate(userId: string, data: CreateTemplateInput): Promise<MessageTemplate> {
    // Extract variables from content
    const variables = this.extractVariables(data.content);

    // Prepare data for database
    const templateData = {
      userId,
      name: data.name,
      content: data.content,
      category: data.category || null,
      variables: variables.length > 0 ? JSON.stringify(variables) : null,
      mediaUrl: data.mediaUrl || null,
      mediaType: data.mediaType || null,
      tags: data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : null,
      isFavorite: data.isFavorite || false,
      usageCount: 0
    };

    const template = await prisma.messageTemplate.create({
      data: templateData
    });

    return this.formatTemplate(template);
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string, userId: string): Promise<MessageTemplate | null> {
    const template = await prisma.messageTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    });

    if (!template) {
      return null;
    }

    return this.formatTemplate(template);
  }

  /**
   * List templates with filters
   */
  async listTemplates(userId: string, query: Partial<ListTemplatesQuery> = {}): Promise<{
    templates: MessageTemplate[];
    total: number;
  }> {
    const {
      category,
      search,
      isFavorite,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Build where clause
    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isFavorite !== undefined) {
      where.isFavorite = isFavorite;
    }

    // Get total count
    const total = await prisma.messageTemplate.count({ where });

    // Get templates
    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset
    });

    return {
      templates: templates.map(t => this.formatTemplate(t)),
      total
    };
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    data: UpdateTemplateInput
  ): Promise<MessageTemplate | null> {
    // Check if template exists and belongs to user
    const existing = await this.getTemplateById(templateId, userId);
    if (!existing) {
      return null;
    }

    // Prepare update data
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category || null;
    if (data.mediaUrl !== undefined) updateData.mediaUrl = data.mediaUrl || null;
    if (data.mediaType !== undefined) updateData.mediaType = data.mediaType || null;
    if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;

    if (data.content !== undefined) {
      updateData.content = data.content;
      // Re-extract variables if content changed
      const variables = this.extractVariables(data.content);
      updateData.variables = variables.length > 0 ? JSON.stringify(variables) : null;
    }

    if (data.tags !== undefined) {
      updateData.tags = data.tags.length > 0 ? JSON.stringify(data.tags) : null;
    }

    const updated = await prisma.messageTemplate.update({
      where: { id: templateId },
      data: updateData
    });

    return this.formatTemplate(updated);
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<boolean> {
    // Check if template exists and belongs to user
    const existing = await this.getTemplateById(templateId, userId);
    if (!existing) {
      return false;
    }

    await prisma.messageTemplate.delete({
      where: { id: templateId }
    });

    return true;
  }

  /**
   * Render template with variables
   */
  async renderTemplateById(
    templateId: string,
    userId: string,
    variables: Record<string, string>
  ): Promise<RenderTemplateResponse | null> {
    const template = await this.getTemplateById(templateId, userId);
    if (!template) {
      return null;
    }

    // Increment usage count
    await prisma.messageTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } }
    });

    // Render content
    const renderedContent = this.renderTemplate(template.content, variables);

    return {
      content: renderedContent,
      ...(template.mediaUrl && { mediaUrl: template.mediaUrl }),
      ...(template.mediaType && { mediaType: template.mediaType })
    };
  }

  /**
   * Get template usage statistics
   */
  async getUsageStats(userId: string, limit: number = 10): Promise<TemplateUsageStats[]> {
    const templates = await prisma.messageTemplate.findMany({
      where: { userId },
      orderBy: { usageCount: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        usageCount: true,
        category: true,
        updatedAt: true
      }
    });

    return templates.map((t): TemplateUsageStats => {
      const stats: TemplateUsageStats = {
        templateId: t.id,
        name: t.name,
        usageCount: t.usageCount
      };
      
      if (t.usageCount > 0) {
        stats.lastUsed = t.updatedAt;
      }
      
      if (t.category) {
        stats.category = t.category;
      }
      
      return stats;
    });
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(templateId: string, userId: string): Promise<MessageTemplate | null> {
    const original = await this.getTemplateById(templateId, userId);
    if (!original) {
      return null;
    }

    // Create copy with "(Cópia)" suffix
    const copyData: CreateTemplateInput = {
      name: `${original.name} (Cópia)`,
      content: original.content,
      category: original.category as any,
      mediaUrl: original.mediaUrl,
      mediaType: original.mediaType as any,
      tags: original.tags,
      isFavorite: false
    };

    return this.createTemplate(userId, copyData);
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(userId: string): Promise<Record<string, number>> {
    const templates = await prisma.messageTemplate.groupBy({
      by: ['category'],
      where: { userId },
      _count: { category: true }
    });

    const result: Record<string, number> = {};
    templates.forEach(t => {
      const category = t.category || 'uncategorized';
      result[category] = t._count.category;
    });

    return result;
  }

  /**
   * Format template from database to API format
   */
  private formatTemplate(template: any): MessageTemplate {
    return {
      id: template.id,
      userId: template.userId,
      name: template.name,
      content: template.content,
      category: template.category || undefined,
      usageCount: template.usageCount,
      variables: template.variables ? JSON.parse(template.variables) : [],
      mediaUrl: template.mediaUrl || undefined,
      mediaType: template.mediaType || undefined,
      tags: template.tags ? JSON.parse(template.tags) : [],
      isFavorite: template.isFavorite,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }
}

export const templateService = new TemplateService();
