import { Router, Request, Response } from 'express';
import { autoResponseService } from '../../services/auto-response-service';
import { authMiddleware } from '../middlewares/auth-middleware';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

/**
 * @route   POST /api/auto-responses
 * @desc    Criar nova auto-resposta
 * @access  Private
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado',
      });
    }

    const autoResponse = await autoResponseService.createAutoResponse(
      userId,
      req.body
    );

    return res.status(201).json({
      success: true,
      data: autoResponse,
    });
  } catch (error: any) {
    console.error('[AUTO_RESPONSES] Create error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create auto-response',
    });
  }
});

/**
 * @route   GET /api/auto-responses/detail/:id
 * @desc    Obter auto-resposta específica
 * @access  Private
 */
router.get('/detail/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado',
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Auto-response ID is required',
      });
    }

    const autoResponse = await autoResponseService.getAutoResponse(userId, id);

    return res.json({
      success: true,
      data: autoResponse,
    });
  } catch (error: any) {
    console.error('[AUTO_RESPONSES] Get error:', error);
    return res.status(404).json({
      success: false,
      message: error.message || 'Auto-response not found',
    });
  }
});

/**
 * @route   GET /api/auto-responses/stats/:instanceId
 * @desc    Obter estatísticas de automação
 * @access  Private
 */
router.get('/stats/:instanceId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { instanceId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado',
      });
    }

    if (!instanceId) {
      return res.status(400).json({
        success: false,
        message: 'Instance ID is required',
      });
    }

    const stats = await autoResponseService.getAutomationStats(
      userId,
      instanceId
    );

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[AUTO_RESPONSES] Stats error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get automation stats',
    });
  }
});

/**
 * @route   GET /api/auto-responses/:instanceId
 * @desc    Listar auto-respostas de uma instância
 * @access  Private
 */
router.get('/:instanceId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { instanceId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado',
      });
    }

    if (!instanceId) {
      return res.status(400).json({
        success: false,
        message: 'Instance ID is required',
      });
    }

    const autoResponses = await autoResponseService.listAutoResponses(
      userId,
      instanceId
    );

    return res.json({
      success: true,
      data: autoResponses,
    });
  } catch (error: any) {
    console.error('[AUTO_RESPONSES] List error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to list auto-responses',
    });
  }
});

/**
 * @route   PUT /api/auto-responses/:id
 * @desc    Atualizar auto-resposta
 * @access  Private
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado',
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Auto-response ID is required',
      });
    }

    const autoResponse = await autoResponseService.updateAutoResponse(
      userId,
      id,
      req.body
    );

    return res.json({
      success: true,
      data: autoResponse,
    });
  } catch (error: any) {
    console.error('[AUTO_RESPONSES] Update error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update auto-response',
    });
  }
});

/**
 * @route   DELETE /api/auto-responses/:id
 * @desc    Deletar auto-resposta
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado',
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Auto-response ID is required',
      });
    }

    await autoResponseService.deleteAutoResponse(userId, id);

    return res.json({
      success: true,
      message: 'Auto-response deleted successfully',
    });
  } catch (error: any) {
    console.error('[AUTO_RESPONSES] Delete error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete auto-response',
    });
  }
});

/**
 * @route   POST /api/auto-responses/:id/toggle
 * @desc    Ativar/desativar auto-resposta
 * @access  Private
 */
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado',
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Auto-response ID is required',
      });
    }

    const autoResponse = await autoResponseService.toggleAutoResponse(
      userId,
      id
    );

    return res.json({
      success: true,
      data: autoResponse,
    });
  } catch (error: any) {
    console.error('[AUTO_RESPONSES] Toggle error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to toggle auto-response',
    });
  }
});

export default router;
