import { Router, Request, Response } from 'express';
import { campaignService } from '../../services/campaign-service';
import { 
  createCampaignSchema, 
  updateCampaignSchema, 
  listCampaignsQuerySchema,
  campaignActionSchema 
} from '../../schemas/campaign-schemas';
import { authMiddleware } from '../middlewares/auth-middleware';
import { checkCampaignLimit } from '../../middleware/check-limits';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/', checkCampaignLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    console.log('[CAMPAIGN] Creating campaign with data:', JSON.stringify(req.body, null, 2));
    const data = createCampaignSchema.parse(req.body);
    
    const campaign = await campaignService.createCampaign(userId, data);
    
    return res.status(201).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[CAMPAIGN] Validation error:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else if (error instanceof Error) {
      console.error('[CAMPAIGN] Error:', error.message);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('[CAMPAIGN] Unknown error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * GET /api/campaigns
 * List campaigns with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const query = listCampaignsQuerySchema.parse(req.query);
    
    const result = await campaignService.listCampaigns(userId, query);
    
    res.json({
      success: true,
      data: result.campaigns,
      meta: {
        total: result.total,
        limit: query.limit || 50,
        offset: query.offset || 0
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * GET /api/campaigns/stats
 * Get campaign statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const stats = await campaignService.getCampaignStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/campaigns/:id
 * Get campaign by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id: campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }
    
    const campaign = await campaignService.getCampaignById(campaignId, userId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    return res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update campaign
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id: campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }
    
    const data = updateCampaignSchema.parse(req.body);
    
    const campaign = await campaignService.updateCampaign(campaignId, userId, data);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    return res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id: campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }
    
    const deleted = await campaignService.deleteCampaign(campaignId, userId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * POST /api/campaigns/:id/actions
 * Perform campaign actions (start, pause, resume, cancel)
 */
router.post('/:id/actions', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id: campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }
    
    const { action } = campaignActionSchema.parse(req.body);
    
    let campaign;
    
    switch (action) {
      case 'start':
        campaign = await campaignService.startCampaign(campaignId, userId);
        break;
      case 'pause':
        campaign = await campaignService.pauseCampaign(campaignId, userId);
        break;
      case 'resume':
        campaign = await campaignService.resumeCampaign(campaignId, userId);
        break;
      case 'cancel':
        campaign = await campaignService.cancelCampaign(campaignId, userId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }
    
    return res.json({
      success: true,
      data: campaign,
      message: `Campaign ${action}ed successfully`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * GET /api/campaigns/:id/report
 * Get detailed campaign report with statistics
 */
router.get('/:id/report', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id: campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }
    
    const report = await campaignService.getCampaignReport(campaignId, userId);
    
    return res.json({
      success: true,
      data: report
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * GET /api/campaigns/:id/export
 * Export campaign results to CSV
 */
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id: campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }
    
    const csv = await campaignService.exportCampaignToCSV(campaignId, userId);
    
    // Get campaign name for filename
    const campaign = await campaignService.getCampaignById(campaignId, userId);
    const filename = campaign 
      ? `campanha-${campaign.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`
      : `campanha-${campaignId}.csv`;
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.send('\ufeff' + csv); // Add BOM for Excel UTF-8 support
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * GET /api/campaigns/:id/progress
 * Get campaign progress
 */
router.get('/:id/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id: campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required'
      });
    }
    
    const progress = await campaignService.getCampaignProgress(campaignId, userId);
    
    return res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

export default router;
