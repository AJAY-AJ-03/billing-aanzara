import getPrismaClient from '../../database/db';
import ExcelJS from 'exceljs';
import {
  ApiResponse,
  PaginatedResult,
  PaginationRequest,
  ProductDto,
  CreateProductDto,
  UpdateProductDto,
  ProductSearchDto
} from '../../shared/types/ipc';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';

export async function getPagedProductsHandler(
  request: PaginationRequest
): Promise<ApiResponse<PaginatedResult<ProductDto>>> {
  try {
    const prisma = getPrismaClient();
    const pageNumber = request.pageNumber || 1;
    const pageSize = request.pageSize || 10;
    const skip = (pageNumber - 1) * pageSize;
    const search = request.search?.toLowerCase().trim() || '';

    const where: any = search
      ? {
          OR: [
            { productName: { contains: search } },
            { sku: { contains: search } },
            { barcode: { contains: search } }
          ]
        }
      : {};

    const [totalCount, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        include: { category: true },
        orderBy: { id: 'desc' }
      })
    ]);

    const mappedItems: ProductDto[] = items.map(p => ({
      id: p.id,
      sku: p.sku,
      barcode: p.barcode,
      productName: p.productName,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      description: p.description,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      gstPercentage: p.gstPercentage,
      stockQuantity: p.stockQuantity,
      minimumStockLevel: p.minimumStockLevel,
      unit: p.unit,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt?.toISOString() || null
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
    return { success: false, message: error.message || 'Failed to retrieve products' };
  }
}

export async function getProductByIdHandler(id: number): Promise<ApiResponse<ProductDto | null>> {
  try {
    const prisma = getPrismaClient();
    const p = await prisma.product.findUnique({
      where: { id },
      include: { category: true }
    });

    if (!p) return { success: true, data: null };

    return {
      success: true,
      data: {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        productName: p.productName,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        description: p.description,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        gstPercentage: p.gstPercentage,
        stockQuantity: p.stockQuantity,
        minimumStockLevel: p.minimumStockLevel,
        unit: p.unit,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt?.toISOString() || null
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createProductHandler(dto: CreateProductDto): Promise<ApiResponse<ProductDto>> {
  try {
    const parseResult = createProductSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid product data' };
    }

    const prisma = getPrismaClient();

    const existingSku = await prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existingSku) return { success: false, message: 'SKU already exists' };

    if (dto.barcode && dto.barcode.trim()) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode: dto.barcode.trim() } });
      if (existingBarcode) return { success: false, message: 'Barcode already exists' };
    }

    const category = await prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) return { success: false, message: 'Category not found' };

    const result = await prisma.$transaction(async tx => {
      const p = await tx.product.create({
        data: {
          sku: dto.sku,
          barcode: dto.barcode && dto.barcode.trim() ? dto.barcode.trim() : null,
          productName: dto.productName,
          categoryId: dto.categoryId,
          description: dto.description || null,
          purchasePrice: dto.purchasePrice,
          sellingPrice: dto.sellingPrice,
          gstPercentage: dto.gstPercentage,
          stockQuantity: dto.stockQuantity,
          minimumStockLevel: dto.minimumStockLevel ?? 5,
          unit: dto.unit || 'Piece',
          isActive: true
        },
        include: { category: true }
      });

      if (dto.stockQuantity > 0) {
        await tx.stockTransaction.create({
          data: {
            productId: p.id,
            transactionType: 'StockIn',
            quantity: dto.stockQuantity,
            previousStock: 0,
            newStock: dto.stockQuantity,
            reference: 'Initial Stock',
            remarks: 'Product created'
          }
        });
      }

      return p;
    });

    return {
      success: true,
      message: 'Product created successfully',
      data: {
        id: result.id,
        sku: result.sku,
        barcode: result.barcode,
        productName: result.productName,
        categoryId: result.categoryId,
        categoryName: result.category.name,
        description: result.description,
        purchasePrice: result.purchasePrice,
        sellingPrice: result.sellingPrice,
        gstPercentage: result.gstPercentage,
        stockQuantity: result.stockQuantity,
        minimumStockLevel: result.minimumStockLevel,
        unit: result.unit,
        isActive: result.isActive,
        createdAt: result.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to create product' };
  }
}

export async function updateProductHandler(id: number, dto: UpdateProductDto): Promise<ApiResponse<ProductDto>> {
  try {
    const parseResult = updateProductSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid product update data' };
    }

    const prisma = getPrismaClient();
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Product not found' };

    if (dto.barcode && dto.barcode.trim()) {
      const barcodeUser = await prisma.product.findFirst({
        where: { barcode: dto.barcode.trim(), id: { not: id } }
      });
      if (barcodeUser) return { success: false, message: 'Barcode already exists' };
    }

    const category = await prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) return { success: false, message: 'Category not found' };

    const updated = await prisma.product.update({
      where: { id },
      data: {
        productName: dto.productName,
        categoryId: dto.categoryId,
        description: dto.description || null,
        purchasePrice: dto.purchasePrice,
        sellingPrice: dto.sellingPrice,
        gstPercentage: dto.gstPercentage,
        minimumStockLevel: dto.minimumStockLevel,
        unit: dto.unit,
        isActive: dto.isActive,
        barcode: dto.barcode && dto.barcode.trim() ? dto.barcode.trim() : null
      },
      include: { category: true }
    });

    return {
      success: true,
      message: 'Product updated successfully',
      data: {
        id: updated.id,
        sku: updated.sku,
        barcode: updated.barcode,
        productName: updated.productName,
        categoryId: updated.categoryId,
        categoryName: updated.category.name,
        description: updated.description,
        purchasePrice: updated.purchasePrice,
        sellingPrice: updated.sellingPrice,
        gstPercentage: updated.gstPercentage,
        stockQuantity: updated.stockQuantity,
        minimumStockLevel: updated.minimumStockLevel,
        unit: updated.unit,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt?.toISOString() || null
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to update product' };
  }
}

export async function toggleProductActiveHandler(id: number): Promise<ApiResponse<boolean>> {
  try {
    const prisma = getPrismaClient();
    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) return { success: false, message: 'Product not found' };

    await prisma.product.update({
      where: { id },
      data: { isActive: !p.isActive }
    });

    return { success: true, message: 'Product status updated', data: !p.isActive };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function searchProductsHandler(term: string): Promise<ApiResponse<ProductSearchDto[]>> {
  try {
    const prisma = getPrismaClient();
    const s = term.toLowerCase().trim();
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { productName: { contains: s } },
          { sku: { contains: s } },
          { barcode: { contains: s } }
        ]
      },
      take: 20
    });

    const data: ProductSearchDto[] = products.map(p => ({
      id: p.id,
      productName: p.productName,
      sku: p.sku,
      barcode: p.barcode,
      sellingPrice: p.sellingPrice,
      stockQuantity: p.stockQuantity,
      gstPercentage: p.gstPercentage,
      unit: p.unit
    }));

    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function exportProductsHandler(): Promise<ApiResponse<string>> {
  try {
    const prisma = getPrismaClient();
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { productName: 'asc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    worksheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Barcode', key: 'barcode', width: 15 },
      { header: 'ProductName', key: 'productName', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'PurchasePrice', key: 'purchasePrice', width: 15 },
      { header: 'SellingPrice', key: 'sellingPrice', width: 15 },
      { header: 'GSTPercentage', key: 'gstPercentage', width: 15 },
      { header: 'StockQuantity', key: 'stockQuantity', width: 15 },
      { header: 'MinimumStockLevel', key: 'minimumStockLevel', width: 18 },
      { header: 'Unit', key: 'unit', width: 12 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    worksheet.getRow(1).font = { bold: true };

    for (const p of products) {
      worksheet.addRow({
        sku: p.sku,
        barcode: p.barcode || '',
        productName: p.productName,
        category: p.category?.name || '',
        description: p.description || '',
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        gstPercentage: p.gstPercentage,
        stockQuantity: p.stockQuantity,
        minimumStockLevel: p.minimumStockLevel,
        unit: p.unit,
        status: p.isActive ? 'Active' : 'Inactive'
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { success: true, data: base64 };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to export products' };
  }
}

export async function importProductsHandler(
  fileBase64: string
): Promise<ApiResponse<{ importedCount: number; errorCount: number; errors: string[] }>> {
  try {
    const prisma = getPrismaClient();
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { success: false, message: 'Invalid Excel file: No worksheet found' };
    }

    let importedCount = 0;
    const errors: string[] = [];

    const getCellValue = (row: ExcelJS.Row, colIndex: number): string => {
      const cell = row.getCell(colIndex);
      if (cell.value === null || cell.value === undefined) return '';
      if (typeof cell.value === 'object') {
        if ('result' in cell.value) return String(cell.value.result || '');
        if ('text' in cell.value) return String(cell.value.text || '');
      }
      return String(cell.value).trim();
    };

    const getNumValue = (row: ExcelJS.Row, colIndex: number, defaultValue: number = 0): number => {
      const valStr = getCellValue(row, colIndex);
      const num = parseFloat(valStr);
      return isNaN(num) ? defaultValue : num;
    };

    const rowCount = worksheet.rowCount;

    for (let r = 2; r <= rowCount; r++) {
      const row = worksheet.getRow(r);
      const sku = getCellValue(row, 1);
      const barcode = getCellValue(row, 2);
      const productName = getCellValue(row, 3);
      const categoryName = getCellValue(row, 4);
      const description = getCellValue(row, 5);
      const purchasePrice = getNumValue(row, 6, 0);
      const sellingPrice = getNumValue(row, 7, 0);
      const gstPercentage = getNumValue(row, 8, 5);
      const stockQuantity = getNumValue(row, 9, 0);
      const minimumStockLevel = getNumValue(row, 10, 5);
      const unit = getCellValue(row, 11) || 'Piece';

      if (!productName && !sku && !categoryName) continue;

      if (!productName) {
        errors.push(`Row ${r}: Product name is required`);
        continue;
      }

      if (!categoryName) {
        errors.push(`Row ${r}: Category name is required for "${productName}"`);
        continue;
      }

      let category = await prisma.category.findUnique({
        where: { name: categoryName }
      });

      if (!category) {
        category = await prisma.category.create({
          data: { name: categoryName, description: 'Auto-created via Excel Import', isActive: true }
        });
      }

      const productSku = sku || `SKU-${Date.now().toString().slice(-5)}-${r}`;
      const productBarcode = barcode || null;

      const existing = await prisma.product.findUnique({
        where: { sku: productSku }
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            productName,
            categoryId: category.id,
            description: description || null,
            purchasePrice,
            sellingPrice,
            gstPercentage,
            stockQuantity,
            minimumStockLevel,
            unit,
            barcode: productBarcode || existing.barcode
          }
        });
      } else {
        await prisma.product.create({
          data: {
            sku: productSku,
            barcode: productBarcode,
            productName,
            categoryId: category.id,
            description: description || null,
            purchasePrice,
            sellingPrice,
            gstPercentage,
            stockQuantity,
            minimumStockLevel,
            unit,
            isActive: true
          }
        });
      }

      importedCount++;
    }

    return {
      success: true,
      message: `Excel import processed ${importedCount} product(s) successfully.`,
      data: {
        importedCount,
        errorCount: errors.length,
        errors
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to import products from Excel file' };
  }
}
