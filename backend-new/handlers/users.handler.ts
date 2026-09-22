import getPrismaClient from '../../database/db';
import bcrypt from 'bcryptjs';
import {
  ApiResponse,
  PaginatedResult,
  PaginationRequest,
  UserDto,
  CreateUserDto,
  UpdateUserDto
} from '../../shared/types/ipc';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

export async function getPagedUsersHandler(
  request: PaginationRequest
): Promise<ApiResponse<PaginatedResult<UserDto>>> {
  try {
    const prisma = getPrismaClient();
    const pageNumber = request.pageNumber || 1;
    const pageSize = request.pageSize || 10;
    const skip = (pageNumber - 1) * pageSize;
    const search = request.search?.toLowerCase().trim() || '';

    const where: any = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } }
          ]
        }
      : {};

    const [totalCount, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'desc' }
      })
    ]);

    const mapped: UserDto[] = items.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role as 'Admin' | 'SalesWorker',
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt?.toISOString() || null
    }));

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      data: {
        items: mapped,
        pageNumber,
        pageSize,
        totalCount,
        totalPages,
        hasPreviousPage: pageNumber > 1,
        hasNextPage: pageNumber < totalPages
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getUserByIdHandler(
  id: number,
  requestingUser?: { id: number; role: string } | null
): Promise<ApiResponse<UserDto | null>> {
  try {
    if (!requestingUser) {
      return { success: false, message: 'Unauthenticated: Access denied' };
    }
    if (requestingUser.role !== 'Admin' && requestingUser.id !== id) {
      return { success: false, message: 'Forbidden: Access denied' };
    }

    const prisma = getPrismaClient();
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return { success: true, data: null };

    return {
      success: true,
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role as 'Admin' | 'SalesWorker',
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt?.toISOString() || null
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createUserHandler(dto: CreateUserDto): Promise<ApiResponse<UserDto>> {
  try {
    const parseResult = createUserSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid user data' };
    }

    const prisma = getPrismaClient();
    const existing = await prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (existing) return { success: false, message: 'Email address already in use' };

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const u = await prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        passwordHash,
        phone: dto.phone || null,
        role: dto.role,
        isActive: true
      }
    });

    return {
      success: true,
      message: 'User created successfully',
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role as 'Admin' | 'SalesWorker',
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateUserHandler(id: number, dto: UpdateUserDto): Promise<ApiResponse<UserDto>> {
  try {
    const parseResult = updateUserSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid user update data' };
    }

    const prisma = getPrismaClient();
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'User not found' };

    const emailDuplicate = await prisma.user.findFirst({
      where: { email: dto.email.trim().toLowerCase(), id: { not: id } }
    });
    if (emailDuplicate) return { success: false, message: 'Email address already in use' };

    const updateData: any = {
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone || null,
      role: dto.role,
      isActive: dto.isActive
    };

    if (dto.password && dto.password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    return {
      success: true,
      message: 'User updated successfully',
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role as 'Admin' | 'SalesWorker',
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt?.toISOString() || null
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function toggleUserActiveHandler(id: number): Promise<ApiResponse<boolean>> {
  try {
    const prisma = getPrismaClient();
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return { success: false, message: 'User not found' };

    await prisma.user.update({
      where: { id },
      data: { isActive: !u.isActive }
    });

    return { success: true, message: 'User status updated', data: !u.isActive };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
