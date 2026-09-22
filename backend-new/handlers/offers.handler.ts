import getPrismaClient from '../../database/db';
import {
  ApiResponse,
  PaginatedResult,
  PaginationRequest,
  OfferDto,
  CreateOfferDto,
  UpdateOfferDto
} from '../../shared/types/ipc';
import { createOfferSchema } from '../validators/offer.validator';

export async function getPagedOffersHandler(
  request: PaginationRequest
): Promise<ApiResponse<PaginatedResult<OfferDto>>> {
  try {
    const prisma = getPrismaClient();
    const pageNumber = request.pageNumber || 1;
    const pageSize = request.pageSize || 10;
    const skip = (pageNumber - 1) * pageSize;
    const search = request.search?.toLowerCase().trim() || '';

    const where: any = search ? { name: { contains: search } } : {};

    const [totalCount, items] = await Promise.all([
      prisma.offer.count({ where }),
      prisma.offer.findMany({
        where,
        skip,
        take: pageSize,
        include: { product: true },
        orderBy: { id: 'desc' }
      })
    ]);

    const mapped: OfferDto[] = items.map(o => ({
      id: o.id,
      name: o.name,
      description: o.description,
      productId: o.productId,
      productName: o.product?.productName || null,
      offerType: o.offerType,
      discountPercentage: o.discountPercentage,
      discountAmount: o.discountAmount,
      minimumQuantity: o.minimumQuantity,
      buyQuantity: o.buyQuantity,
      freeQuantity: o.freeQuantity,
      startDate: o.startDate.toISOString(),
      endDate: o.endDate.toISOString(),
      isActive: o.isActive,
      createdAt: o.createdAt.toISOString()
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

export async function getActiveOffersHandler(): Promise<ApiResponse<OfferDto[]>> {
  try {
    const prisma = getPrismaClient();
    const now = new Date();
    const items = await prisma.offer.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: { product: true },
      orderBy: { id: 'desc' }
    });

    const mapped: OfferDto[] = items.map(o => ({
      id: o.id,
      name: o.name,
      description: o.description,
      productId: o.productId,
      productName: o.product?.productName || null,
      offerType: o.offerType,
      discountPercentage: o.discountPercentage,
      discountAmount: o.discountAmount,
      minimumQuantity: o.minimumQuantity,
      buyQuantity: o.buyQuantity,
      freeQuantity: o.freeQuantity,
      startDate: o.startDate.toISOString(),
      endDate: o.endDate.toISOString(),
      isActive: o.isActive,
      createdAt: o.createdAt.toISOString()
    }));

    return { success: true, data: mapped };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getOfferByIdHandler(id: number): Promise<ApiResponse<OfferDto | null>> {
  try {
    const prisma = getPrismaClient();
    const o = await prisma.offer.findUnique({
      where: { id },
      include: { product: true }
    });
    if (!o) return { success: true, data: null };

    return {
      success: true,
      data: {
        id: o.id,
        name: o.name,
        description: o.description,
        productId: o.productId,
        productName: o.product?.productName || null,
        offerType: o.offerType,
        discountPercentage: o.discountPercentage,
        discountAmount: o.discountAmount,
        minimumQuantity: o.minimumQuantity,
        buyQuantity: o.buyQuantity,
        freeQuantity: o.freeQuantity,
        startDate: o.startDate.toISOString(),
        endDate: o.endDate.toISOString(),
        isActive: o.isActive,
        createdAt: o.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createOfferHandler(dto: CreateOfferDto): Promise<ApiResponse<OfferDto>> {
  try {
    const parseResult = createOfferSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid offer data' };
    }

    const prisma = getPrismaClient();
    const o = await prisma.offer.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        productId: dto.productId || null,
        offerType: dto.offerType,
        discountPercentage: dto.discountPercentage !== undefined ? dto.discountPercentage : null,
        discountAmount: dto.discountAmount !== undefined ? dto.discountAmount : null,
        minimumQuantity: dto.minimumQuantity !== undefined ? dto.minimumQuantity : null,
        buyQuantity: dto.buyQuantity !== undefined ? dto.buyQuantity : null,
        freeQuantity: dto.freeQuantity !== undefined ? dto.freeQuantity : null,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive !== undefined ? dto.isActive : true
      },
      include: { product: true }
    });

    return {
      success: true,
      message: 'Offer created successfully',
      data: {
        id: o.id,
        name: o.name,
        description: o.description,
        productId: o.productId,
        productName: o.product?.productName || null,
        offerType: o.offerType,
        discountPercentage: o.discountPercentage,
        discountAmount: o.discountAmount,
        minimumQuantity: o.minimumQuantity,
        buyQuantity: o.buyQuantity,
        freeQuantity: o.freeQuantity,
        startDate: o.startDate.toISOString(),
        endDate: o.endDate.toISOString(),
        isActive: o.isActive,
        createdAt: o.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateOfferHandler(id: number, dto: UpdateOfferDto): Promise<ApiResponse<OfferDto>> {
  try {
    const prisma = getPrismaClient();
    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Offer not found' };

    const updated = await prisma.offer.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description || null,
        productId: dto.productId || null,
        offerType: dto.offerType,
        discountPercentage: dto.discountPercentage !== undefined ? dto.discountPercentage : null,
        discountAmount: dto.discountAmount !== undefined ? dto.discountAmount : null,
        minimumQuantity: dto.minimumQuantity !== undefined ? dto.minimumQuantity : null,
        buyQuantity: dto.buyQuantity !== undefined ? dto.buyQuantity : null,
        freeQuantity: dto.freeQuantity !== undefined ? dto.freeQuantity : null,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive
      },
      include: { product: true }
    });

    return {
      success: true,
      message: 'Offer updated successfully',
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        productId: updated.productId,
        productName: updated.product?.productName || null,
        offerType: updated.offerType,
        discountPercentage: updated.discountPercentage,
        discountAmount: updated.discountAmount,
        minimumQuantity: updated.minimumQuantity,
        buyQuantity: updated.buyQuantity,
        freeQuantity: updated.freeQuantity,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate.toISOString(),
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function toggleOfferActiveHandler(id: number): Promise<ApiResponse<boolean>> {
  try {
    const prisma = getPrismaClient();
    const o = await prisma.offer.findUnique({ where: { id } });
    if (!o) return { success: false, message: 'Offer not found' };

    await prisma.offer.update({
      where: { id },
      data: { isActive: !o.isActive }
    });

    return { success: true, message: 'Offer status updated', data: !o.isActive };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
