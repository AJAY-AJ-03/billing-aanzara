import getPrismaClient from '../../database/db';
import bcrypt from 'bcryptjs';
import { ApiResponse, LoginRequestDto, LoginResponseDto } from '../../shared/types/ipc';
import { loginSchema } from '../validators/auth.validator';

export async function loginHandler(request: LoginRequestDto): Promise<ApiResponse<LoginResponseDto>> {
  try {
    const parseResult = loginSchema.safeParse(request);
    if (!parseResult.success) {
      return {
        success: false,
        message: parseResult.error.errors[0]?.message || 'Invalid input data'
      };
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { email: request.email }
    });

    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Account is deactivated' };
    }

    const passwordToVerify = request.password || request.passwordHash || '';
    const isPasswordValid = await bcrypt.compare(passwordToVerify, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, message: 'Invalid email or password' };
    }

    return {
      success: true,
      message: 'Login successful',
      data: {
        userId: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        accessToken: `session-${user.id}-${Date.now()}`
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'An error occurred during login' };
  }
}
export async function restoreSessionHandler(userId: number): Promise<ApiResponse<LoginResponseDto>> {
  try {
    if (!userId || typeof userId !== 'number') {
      return { success: false, message: 'Invalid session' };
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return { success: false, message: 'Session expired: account no longer exists' };
    }
    if (!user.isActive) {
      return { success: false, message: 'Session expired: account is deactivated' };
    }

    return {
      success: true,
      message: 'Session restored',
      data: {
        userId: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        accessToken: `session-${user.id}-${Date.now()}`
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to restore session' };
  }
}
