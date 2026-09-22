import getPrismaClient from '../../database/db';
import ExcelJS from 'exceljs';
import {
  ApiResponse,
  PaginatedResult,
  PaginationRequest,
  StockTransactionDto,
  StockAdjustmentDto,
  StockInDto,
  LowStockDto
} from '../../shared/types/ipc';
import { stockAdjustmentSchema, stockInSchema } from '../validators/stock.validator';

export async function getStockTransactionsHandler(
  productId: number,
  request: PaginationRequest
): Promise<ApiResponse<PaginatedResult<StockTransactionDto>>> {
  try {
    const prisma = getPrismaClient();
    const pageNumber = request.pageNumber || 1;
    const pageSize = request.pageSize || 10;
    const skip = (pageNumber - 1) * pageSize;

    const where: any = productId > 0 ? { productId } : {};

    const [totalCount, items] = await Promise.all([
      prisma.stockTransaction.count({ where }),
      prisma.stockTransaction.findMany({
        where,
        skip,
        take: pageSize,
        include: { product: true, creator: true },
        orderBy: { id: 'desc' }
      })
    ]);

    const mapped: StockTransactionDto[] = items.map(tx => ({
      id: tx.id,
      productId: tx.productId,
      productName: tx.product?.productName,
      transactionType: tx.transactionType,
      quantity: tx.quantity,
      previousStock: tx.previousStock,
      newStock: tx.newStock,
      reference: tx.reference,
      remarks: tx.remarks,
      createdBy: tx.createdBy,
      createdByName: tx.creator?.name,
      createdAt: tx.createdAt.toISOString()
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

export async function stockAdjustHandler(
  dto: StockAdjustmentDto,
  userId?: number
): Promise<ApiResponse<StockTransactionDto>> {
  try {
    const parseResult = stockAdjustmentSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid adjustment data' };
    }

    const prisma = getPrismaClient();
    const product = await prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) return { success: false, message: 'Product not found' };

    const prev = product.stockQuantity;
    let newStock = prev;

    switch (dto.transactionType) {
      case 'Adjustment':
        newStock = prev + dto.quantity;
        break;
      case 'Damaged':
      case 'Expired':
        newStock = prev - Math.abs(dto.quantity);
        break;
      case 'Return':
        newStock = prev + Math.abs(dto.quantity);
        break;
      default:
        newStock = prev + dto.quantity;
        break;
    }

    if (newStock < 0) {
      return { success: false, message: 'Stock cannot be negative' };
    }

    const result = await prisma.$transaction(async tx => {
      await tx.product.update({
        where: { id: product.id },
        data: { stockQuantity: newStock }
      });

      const transactionLog = await tx.stockTransaction.create({
        data: {
          productId: product.id,
          transactionType: dto.transactionType,
          quantity: dto.quantity,
          previousStock: prev,
          newStock,
          remarks: dto.remarks || null,
          createdBy: userId || null
        },
        include: { product: true, creator: true }
      });

      return transactionLog;
    });

    return {
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        id: result.id,
        productId: result.productId,
        productName: result.product.productName,
        transactionType: result.transactionType,
        quantity: result.quantity,
        previousStock: result.previousStock,
        newStock: result.newStock,
        remarks: result.remarks,
        createdBy: result.createdBy,
        createdByName: result.creator?.name,
        createdAt: result.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function stockInHandler(
  dto: StockInDto,
  userId?: number
): Promise<ApiResponse<StockTransactionDto>> {
  try {
    const parseResult = stockInSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid stock-in data' };
    }

    const prisma = getPrismaClient();
    const product = await prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) return { success: false, message: 'Product not found' };

    const prev = product.stockQuantity;
    const newStock = prev + dto.quantity;

    const result = await prisma.$transaction(async tx => {
      await tx.product.update({
        where: { id: product.id },
        data: { stockQuantity: newStock }
      });

      const transactionLog = await tx.stockTransaction.create({
        data: {
          productId: product.id,
          transactionType: 'StockIn',
          quantity: dto.quantity,
          previousStock: prev,
          newStock,
          reference: dto.reference || null,
          remarks: dto.remarks || null,
          createdBy: userId || null
        },
        include: { product: true, creator: true }
      });

      return transactionLog;
    });

    return {
      success: true,
      message: 'Stock updated successfully',
      data: {
        id: result.id,
        productId: result.productId,
        productName: result.product.productName,
        transactionType: result.transactionType,
        quantity: result.quantity,
        previousStock: result.previousStock,
        newStock: result.newStock,
        reference: result.reference,
        remarks: result.remarks,
        createdBy: result.createdBy,
        createdByName: result.creator?.name,
        createdAt: result.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getLowStockProductsHandler(): Promise<ApiResponse<LowStockDto[]>> {
  try {
    const prisma = getPrismaClient();
    const products = await prisma.product.findMany({
      where: {
        stockQuantity: { gt: 0 }
      }
    });

    const lowStock = products
      .filter(p => p.stockQuantity <= p.minimumStockLevel)
      .map(p => ({
        id: p.id,
        productName: p.productName,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        minimumStockLevel: p.minimumStockLevel,
        unit: p.unit
      }));

    return { success: true, data: lowStock };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getOutOfStockProductsHandler(): Promise<ApiResponse<LowStockDto[]>> {
  try {
    const prisma = getPrismaClient();
    const products = await prisma.product.findMany({
      where: {
        stockQuantity: { lte: 0 }
      }
    });

    const outOfStock = products.map(p => ({
      id: p.id,
      productName: p.productName,
      sku: p.sku,
      stockQuantity: p.stockQuantity,
      minimumStockLevel: p.minimumStockLevel,
      unit: p.unit
    }));

    return { success: true, data: outOfStock };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function exportStockHandler(): Promise<ApiResponse<string>> {
  try {
    const prisma = getPrismaClient();
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { productName: 'asc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stock');

    worksheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Product', key: 'productName', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'StockQuantity', key: 'stockQuantity', width: 15 },
      { header: 'MinimumStockLevel', key: 'minimumStockLevel', width: 18 },
      { header: 'Unit', key: 'unit', width: 12 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true };

    for (const p of products) {
      const status = p.stockQuantity <= 0 ? 'OutOfStock' : p.stockQuantity <= p.minimumStockLevel ? 'LowStock' : 'InStock';
      worksheet.addRow({
        sku: p.sku,
        productName: p.productName,
        category: p.category?.name || '',
        stockQuantity: p.stockQuantity,
        minimumStockLevel: p.minimumStockLevel,
        unit: p.unit,
        status
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { success: true, data: base64 };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
