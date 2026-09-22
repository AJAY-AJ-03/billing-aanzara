import getPrismaClient from '../../database/db';
import {
  ApiResponse,
  PaginatedResult,
  PaginationRequest,
  SaleListItemDto
} from '../../shared/types/ipc';

export async function getPagedSalesHandler(
  request: PaginationRequest
): Promise<ApiResponse<PaginatedResult<SaleListItemDto>>> {
  try {
    const prisma = getPrismaClient();
    const pageNumber = request.pageNumber || 1;
    const pageSize = request.pageSize || 10;
    const skip = (pageNumber - 1) * pageSize;
    const search = request.search?.toLowerCase().trim() || '';

    const where: any = search
      ? {
          OR: [
            { invoiceNumber: { contains: search } },
            { customerName: { contains: search } },
            { customerPhone: { contains: search } }
          ]
        }
      : {};

    const [totalCount, items] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: pageSize,
        include: { salesWorker: true },
        orderBy: { id: 'desc' }
      })
    ]);

    const mapped: SaleListItemDto[] = items.map(s => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      salesWorkerName: s.salesWorker?.name,
      grandTotal: s.grandTotal,
      paymentMethod: s.paymentMethod,
      paymentStatus: s.paymentStatus,
      createdAt: s.createdAt.toISOString()
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
