import getPrismaClient from '../../database/db';
import {
  ApiResponse,
  PaginatedResult,
  PaginationRequest,
  SaleListItemDto,
  SaleDto
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

    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } }
      ];
    }

    if (request.salesWorkerId && request.salesWorkerId > 0) {
      where.salesWorkerId = request.salesWorkerId;
    }

    if (request.paymentMethod && request.paymentMethod !== 'All') {
      where.paymentMethod = request.paymentMethod;
    }

    if (request.paymentStatus && request.paymentStatus !== 'All') {
      where.paymentStatus = request.paymentStatus;
    }

    if (request.fromDate || request.toDate) {
      where.createdAt = {};
      if (request.fromDate) {
        where.createdAt.gte = new Date(request.fromDate);
      }
      if (request.toDate) {
        const to = new Date(request.toDate);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

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

export async function getSaleByIdHandler(id: number): Promise<ApiResponse<SaleDto | null>> {
  try {
    const prisma = getPrismaClient();
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        salesWorker: true,
        saleItems: { include: { product: true } },
        payments: true
      }
    });

    if (!sale) return { success: true, data: null };

    return { success: true, data: mapSaleToDto(sale) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getSaleByInvoiceHandler(invoiceNumber: string): Promise<ApiResponse<SaleDto | null>> {
  try {
    const prisma = getPrismaClient();
    const sale = await prisma.sale.findUnique({
      where: { invoiceNumber },
      include: {
        salesWorker: true,
        saleItems: { include: { product: true } },
        payments: true
      }
    });

    if (!sale) return { success: true, data: null };

    return { success: true, data: mapSaleToDto(sale) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

function mapSaleToDto(sale: any): SaleDto {
  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    agentName: sale.agentName || null,
    agentPhone: sale.agentPhone || null,
    customerId: sale.customerId,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    customerEmail: sale.customerEmail,
    customerAddress: sale.customerAddress,
    customerGSTIN: sale.customerGSTIN,
    salesWorkerId: sale.salesWorkerId,
    salesWorkerName: sale.salesWorker?.name || null,
    subtotal: sale.subtotal,
    discount: sale.discount,
    gstAmount: sale.gstAmount,
    cgstAmount: sale.cgstAmount,
    sgstAmount: sale.sgstAmount,
    grandTotal: sale.grandTotal,
    paymentMethod: sale.paymentMethod,
    paymentStatus: sale.paymentStatus,
    saleStatus: sale.saleStatus,
    createdAt: sale.createdAt.toISOString(),
    items: (sale.saleItems || []).map((item: any) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName || item.product?.productName || 'Unknown Item',
      sku: item.sku || item.product?.sku || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      gstPercentage: item.gstPercentage,
      gstAmount: item.gstAmount,
      total: item.totalAmount,
      totalAmount: item.totalAmount,
      unit: item.unit || item.product?.unit || 'Piece',
      isCustom: item.isCustom || false
    })),
    payments: (sale.payments || []).map((p: any) => ({
      id: p.id,
      paymentMethod: p.paymentMethod,
      amount: p.amount,
      transactionId: p.transactionId,
      status: p.status,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null
    }))
  };
}

export async function updateSaleHandler(
  id: number,
  dto: any,
  callingUser?: { id: number; role: string } | null
): Promise<ApiResponse<SaleDto>> {
  try {
    if (!callingUser || callingUser.role !== 'Admin') {
      return { success: false, message: 'Forbidden: Only Admin can update sales' };
    }

    const prisma = getPrismaClient();
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { saleItems: true }
    });

    if (!sale) return { success: false, message: 'Sale not found' };

    const updateData: any = {};
    if (dto.agentName !== undefined) updateData.agentName = dto.agentName;
    if (dto.agentPhone !== undefined) updateData.agentPhone = dto.agentPhone;
    if (dto.customerName !== undefined) updateData.customerName = dto.customerName;
    if (dto.customerPhone !== undefined) updateData.customerPhone = dto.customerPhone;
    if (dto.customerEmail !== undefined) updateData.customerEmail = dto.customerEmail;
    if (dto.customerAddress !== undefined) updateData.customerAddress = dto.customerAddress;
    if (dto.customerGSTIN !== undefined) updateData.customerGSTIN = dto.customerGSTIN;
    if (dto.paymentMethod && dto.paymentMethod.trim()) updateData.paymentMethod = dto.paymentMethod.trim();

    const { ConvertBillingQty, calculateBillingHandler } = require('./billing.handler');

    await prisma.$transaction(async tx => {
      // Apply direct field updates
      await tx.sale.update({
        where: { id },
        data: updateData
      });

      if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
        // Revert old stock for non-custom items
        for (const old of sale.saleItems) {
          if (!old.isCustom && old.productId) {
            const prod = await tx.product.findUnique({ where: { id: old.productId } });
            if (prod) {
              const oldBillingUnit = old.unit || prod.unit;
              const oldBaseQty = ConvertBillingQty(old.quantity, oldBillingUnit, prod.unit, null);
              const prev = prod.stockQuantity;
              const newStock = prev + oldBaseQty;

              await tx.product.update({
                where: { id: prod.id },
                data: { stockQuantity: newStock }
              });

              await tx.stockTransaction.create({
                data: {
                  productId: prod.id,
                  transactionType: 'SaleReversal',
                  quantity: oldBaseQty,
                  previousStock: prev,
                  newStock,
                  reference: `${sale.invoiceNumber}-REV`,
                  remarks: `Sale ${sale.invoiceNumber} reversed for edit`,
                  createdBy: callingUser?.id || null
                }
              });
            }
          }
        }

        // Delete old sale items
        await tx.saleItem.deleteMany({ where: { saleId: id } });

        // Recalculate bill
        const calcRes = await calculateBillingHandler(dto.items, dto.manualDiscount, dto.manualTaxPercentage);
        if (!calcRes.success || !calcRes.data) {
          throw new Error(calcRes.message || 'Recalculation failed');
        }

        const calc = calcRes.data;

        // Update sale totals
        await tx.sale.update({
          where: { id },
          data: {
            subtotal: calc.subtotal,
            discount: calc.discount,
            gstAmount: calc.gstAmount,
            cgstAmount: calc.cgstAmount,
            sgstAmount: calc.sgstAmount,
            grandTotal: calc.grandTotal
          }
        });

        // Recreate sale items and deduct stock
        for (let idx = 0; idx < calc.items.length; idx++) {
          const ci = calc.items[idx];
          const orig = dto.items.find((d: any) => d.productId === ci.productId && d.isCustom === ci.isCustom) || dto.items[idx];

          if (ci.isCustom || !ci.productId) {
            await tx.saleItem.create({
              data: {
                saleId: id,
                productId: null,
                isCustom: true,
                productName: ci.productName,
                sku: ci.sku || null,
                unit: ci.unit,
                quantity: ci.quantity,
                unitPrice: ci.unitPrice,
                discount: ci.discount,
                gstPercentage: ci.gstPercentage,
                gstAmount: ci.gstAmount,
                totalAmount: ci.totalAmount
              }
            });
          } else {
            const prod = await tx.product.findUnique({ where: { id: ci.productId } });
            if (!prod) throw new Error(`Product ${ci.productId} not found`);

            const baseQty = ConvertBillingQty(ci.quantity, ci.unit || prod.unit, prod.unit, orig?.unitsPerBox);
            if (prod.stockQuantity < baseQty) {
              throw new Error(`Insufficient stock for ${prod.productName}`);
            }

            const prev = prod.stockQuantity;
            const newStock = prev - baseQty;

            await tx.product.update({
              where: { id: prod.id },
              data: { stockQuantity: newStock }
            });

            await tx.saleItem.create({
              data: {
                saleId: id,
                productId: prod.id,
                isCustom: false,
                productName: prod.productName,
                sku: prod.sku,
                unit: ci.unit,
                quantity: ci.quantity,
                unitPrice: ci.unitPrice,
                discount: ci.discount,
                gstPercentage: ci.gstPercentage,
                gstAmount: ci.gstAmount,
                totalAmount: ci.totalAmount
              }
            });

            await tx.stockTransaction.create({
              data: {
                productId: prod.id,
                transactionType: 'Sale',
                quantity: -baseQty,
                previousStock: prev,
                newStock,
                reference: sale.invoiceNumber,
                remarks: `Sale ${sale.invoiceNumber} (edited)`,
                createdBy: callingUser?.id || null
              }
            });
          }
        }

        // Update payment amount
        await tx.payment.updateMany({
          where: { saleId: id },
          data: {
            amount: calc.grandTotal,
            paymentMethod: dto.paymentMethod || sale.paymentMethod
          }
        });
      } else if (dto.manualDiscount !== undefined || dto.manualTaxPercentage !== undefined) {
        // Recalculate tax on existing items without touching stock
        const calcItems = sale.saleItems.map(si => ({
          productId: si.productId,
          quantity: si.quantity,
          isCustom: si.isCustom,
          customProductName: si.isCustom ? si.productName : undefined,
          customUnitPrice: si.isCustom ? si.unitPrice : undefined,
          customGSTPercentage: si.isCustom ? si.gstPercentage : undefined,
          customUnit: si.isCustom ? si.unit || 'Kg' : undefined,
          billingUnit: si.unit || undefined
        }));

        const calcRes = await calculateBillingHandler(
          calcItems,
          dto.manualDiscount !== undefined ? dto.manualDiscount : sale.discount,
          dto.manualTaxPercentage
        );

        if (calcRes.success && calcRes.data) {
          const calc = calcRes.data;
          await tx.sale.update({
            where: { id },
            data: {
              subtotal: calc.subtotal,
              discount: calc.discount,
              gstAmount: calc.gstAmount,
              cgstAmount: calc.cgstAmount,
              sgstAmount: calc.sgstAmount,
              grandTotal: calc.grandTotal
            }
          });

          for (let i = 0; i < sale.saleItems.length; i++) {
            const si = sale.saleItems[i];
            const ci = calc.items[i];
            if (ci) {
              await tx.saleItem.update({
                where: { id: si.id },
                data: {
                  gstPercentage: ci.gstPercentage,
                  gstAmount: ci.gstAmount,
                  discount: ci.discount,
                  totalAmount: ci.totalAmount
                }
              });
            }
          }

          await tx.payment.updateMany({
            where: { saleId: id },
            data: { amount: calc.grandTotal }
          });
        }
      }
    });

    const updatedSale = await prisma.sale.findUnique({
      where: { id },
      include: {
        salesWorker: true,
        saleItems: { include: { product: true } },
        payments: true
      }
    });

    if (!updatedSale) return { success: false, message: 'Sale not found after update' };

    return {
      success: true,
      message: 'Sale updated successfully',
      data: mapSaleToDto(updatedSale)
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error updating sale' };
  }
}

export async function deleteSaleHandler(
  id: number,
  callingUser?: { id: number; role: string } | null
): Promise<ApiResponse<boolean>> {
  try {
    if (!callingUser || callingUser.role !== 'Admin') {
      return { success: false, message: 'Forbidden: Only Admin can delete sales' };
    }

    const prisma = getPrismaClient();
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { saleItems: true }
    });

    if (!sale) return { success: false, message: 'Sale not found' };

    const { ConvertBillingQty } = require('./billing.handler');

    await prisma.$transaction(async tx => {
      // Revert stock for non-custom items
      for (const si of sale.saleItems) {
        if (!si.isCustom && si.productId) {
          const prod = await tx.product.findUnique({ where: { id: si.productId } });
          if (prod) {
            const baseQty = ConvertBillingQty(si.quantity, si.unit || prod.unit, prod.unit, null);
            const prev = prod.stockQuantity;
            const newStock = prev + baseQty;

            await tx.product.update({
              where: { id: prod.id },
              data: { stockQuantity: newStock }
            });

            await tx.stockTransaction.create({
              data: {
                productId: prod.id,
                transactionType: 'SaleReversal',
                quantity: baseQty,
                previousStock: prev,
                newStock,
                reference: `${sale.invoiceNumber}-DEL`,
                remarks: `Sale ${sale.invoiceNumber} deleted`,
                createdBy: callingUser?.id || null
              }
            });
          }
        }
      }

      await tx.payment.deleteMany({ where: { saleId: id } });
      await tx.saleItem.deleteMany({ where: { saleId: id } });
      await tx.sale.delete({ where: { id } });
    });

    return {
      success: true,
      message: 'Sale deleted successfully',
      data: true
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error deleting sale' };
  }
}
