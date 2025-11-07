import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../../database/prisma';
import { AuthenticatedRequest } from '../../../types';
import bcrypt from 'bcrypt';

// Validation schema
const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const deleteAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate request body
    const validatedData = deleteAccountSchema.parse(req.body);
    const { password } = validatedData;
    
    // Get user ID from JWT middleware
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação inválido'
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Senha incorreta'
      });
    }

    // Delete user (cascade will delete related data)
    await prisma.user.delete({
      where: { id: userId }
    });

    // Log account deletion
    console.log(`✅ Account deleted successfully for user: ${user.email}`);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Conta excluída com sucesso'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};
