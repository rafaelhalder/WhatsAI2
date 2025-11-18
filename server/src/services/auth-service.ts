import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '@/database/prisma';

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string | number;

  constructor() {
    this.JWT_SECRET = process.env['JWT_SECRET'] || 'your-super-secret-key-change-in-production';
    this.JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '7d';
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'USER',
        active: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        onboardingCompleted: true,
        onboardingStep: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      user,
      token
    };
  }

  /**
   * Login user
   */
  async login(data: LoginData) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.active) {
      throw new Error('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true, // ✅ IMPORTANTE: Incluir o plan
        active: true,
        onboardingCompleted: true,
        onboardingStep: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    console.log('👤 [GET_USER] User data:', {
      id: user.id,
      email: user.email,
      plan: user.plan
    });

    return user;
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: this.JWT_EXPIRES_IN as any
    };
    return jwt.sign(payload, this.JWT_SECRET, options);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: { name: string; email: string }) {
    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email,
        NOT: { id: userId }
      }
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return { user: updatedUser };
  }

  /**
   * Complete onboarding for a user
   */
  async completeOnboarding(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 5,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        onboardingCompleted: true,
        onboardingStep: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return { user };
  }
}

export const authService = new AuthService();
