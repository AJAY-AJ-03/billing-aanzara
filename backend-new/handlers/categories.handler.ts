import getPrismaClient from '../../database/db';
import {
  ApiResponse,
  PaginatedResult,
  PaginationRequest,
  CategoryDto,
  CreateCategoryDto,
  UpdateCategoryDto
} from '../../shared/types/ipc';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';

export async function getPagedCategoriesHandler(
  request: PaginationRequest
): Promise<ApiResponse<PaginatedResult<CategoryDto>>> {
  try {
    const prisma = getPrismaClient();
    const pageNumber = request.pageNumber || 1;
    const pageSize = request.pageSize || 10;
    const skip = (pageNumber - 1) * pageSize;
    const search = request.search?.toLowerCase().trim() || '';

    const where: any = search ? { name: { contains: search } } : {};

    const [totalCount, items] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        skip,
        take: pageSize,
        include: { _count: { select: { products: true } } },
        orderBy: { id: 'desc' }
      })
    ]);

    const mappedItems: CategoryDto[] = items.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt?.toISOString() || null,
      productCount: c._count.products
    }));

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      data: {
        items: mappedItems,
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

export async function getAllActiveCategoriesHandler(): Promise<ApiResponse<CategoryDto[]>> {
  try {
    const prisma = getPrismaClient();
    const items = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    const mapped: CategoryDto[] = items.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString()
    }));

    return { success: true, data: mapped };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getCategoryByIdHandler(id: number): Promise<ApiResponse<CategoryDto | null>> {
  try {
    const prisma = getPrismaClient();
    const c = await prisma.category.findUnique({ where: { id } });
    if (!c) return { success: true, data: null };

    return {
      success: true,
      data: {
        id: c.id,
        name: c.name,
        description: c.description,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createCategoryHandler(dto: CreateCategoryDto): Promise<ApiResponse<CategoryDto>> {
  try {
    const parseResult = createCategorySchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid category data' };
    }

    const prisma = getPrismaClient();
    const existing = await prisma.category.findUnique({ where: { name: dto.name.trim() } });
    if (existing) return { success: false, message: 'Category name already exists' };

    const c = await prisma.category.create({
      data: {
        name: dto.name.trim(),
        description: dto.description || null,
        isActive: true
      }
    });

    return {
      success: true,
      message: 'Category created successfully',
      data: {
        id: c.id,
        name: c.name,
        description: c.description,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateCategoryHandler(id: number, dto: UpdateCategoryDto): Promise<ApiResponse<CategoryDto>> {
  try {
    const parseResult = updateCategorySchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid category data' };
    }

    const prisma = getPrismaClient();
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Category not found' };

    const nameDuplicate = await prisma.category.findFirst({
      where: { name: dto.name.trim(), id: { not: id } }
    });
    if (nameDuplicate) return { success: false, message: 'Category name already exists' };

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        description: dto.description || null,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive
      }
    });

    return {
      success: true,
      message: 'Category updated successfully',
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function toggleCategoryActiveHandler(id: number): Promise<ApiResponse<boolean>> {
  try {
    const prisma = getPrismaClient();
    const c = await prisma.category.findUnique({ where: { id } });
    if (!c) return { success: false, message: 'Category not found' };

    await prisma.category.update({
      where: { id },
      data: { isActive: !c.isActive }
    });

    return { success: true, message: 'Category status updated', data: !c.isActive };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
