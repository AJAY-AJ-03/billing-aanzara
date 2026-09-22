import getPrismaClient from '../../database/db';
import {
  ApiResponse,
  BillingCalculationDto,
  BillingItemRequestDto,
  CreateBillRequestDto,
  BillResponseDto,
  ProductSearchDto
} from '../../shared/types/ipc';
import { createBillRequestSchema } from '../validators/billing.validator';

export function ConvertBillingQty(
  qty: number,
  fromUnit?: string | null,
  toUnit?: string,
  unitsPerBox?: number | null
): number {
  if (!fromUnit || !toUnit || fromUnit.trim().toLowerCase() === toUnit.trim().toLowerCase()) return qty;
  const f = fromUnit.trim().toLowerCase();
  const t = toUnit.trim().toLowerCase();
  const pieceFactors: Record<string, number> = {
    piece: 1,
    pieces: 1,
    pc: 1,
    pcs: 1,
    unit: 1,
    item: 1,
    items: 1,
    box: unitsPerBox ?? 12,
    pack: unitsPerBox ?? 6,
    dozen: 12
  };
  if (f in pieceFactors) {
    const targetFactor = pieceFactors[t] ?? 1;
    return (qty * pieceFactors[f]) / targetFactor;
  }
  const weightFactors: Record<string, number> = {
    kg: 1000,
    kilogram: 1000,
    kilograms: 1000,
    gram: 1,
    grams: 1,
    g: 1,
    liter: 1000,
    litre: 1000,
    l: 1000,
    ml: 1
  };
  if (f in weightFactors && t in weightFactors) {
    return (qty * weightFactors[f]) / weightFactors[t];
  }
  return qty;
}

export async function calculateBillingHandler(
  items: BillingItemRequestDto[],
  manualDiscount?: number | null,
  manualTaxPercentage?: number | null
): Promise<ApiResponse<BillingCalculationDto>> {
  try {
    if (!items || items.length === 0) {
      return { success: false, message: 'No items provided' };
    }

    if (manualTaxPercentage !== undefined && manualTaxPercentage !== null) {
      if (manualTaxPercentage < 0 || manualTaxPercentage > 100) {
        return { success: false, message: 'Tax must be between 0 and 100' };
      }
    }

    const prisma = getPrismaClient();
    const now = new Date();

    const activeOffers = await prisma.offer.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      }
    });

    const calcItems: any[] = [];
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;

    for (const req of items) {
      if (!req.quantity || req.quantity <= 0) {
        return { success: false, message: 'Quantity must be positive' };
      }

      const isCustom = req.isCustom || !req.productId;
      let productName: string;
      let sku: string | null = null;
      let unit: string;
      let unitPrice: number;
      let gstPercentage: number;
      let productId: number | null = null;
      let lineSubtotal: number;
      let bestDiscount = 0;

      if (isCustom) {
        if (!req.customProductName || req.customProductName.trim() === '') {
          return { success: false, message: 'Custom product name is required' };
        }
        if (req.customUnitPrice === undefined || req.customUnitPrice <= 0) {
          return { success: false, message: 'Custom unit price must be positive' };
        }
        const gst = req.customGSTPercentage ?? 0;
        if (gst < 0 || gst > 100) {
          return { success: false, message: 'Tax must be between 0 and 100 for custom product' };
        }
        productName = req.customProductName.trim();
        sku = req.customSKU || null;
        unit = req.customUnit && req.customUnit.trim() ? req.customUnit.trim() : 'Kg';
        unitPrice = req.customUnitPrice;
        gstPercentage = gst;
        lineSubtotal = unitPrice * req.quantity;
      } else {
        productId = req.productId!;
        const product = await prisma.product.findUnique({
          where: { id: productId }
        });

        if (!product) {
          return { success: false, message: `Product ID ${productId} not found` };
        }
        if (!product.isActive) {
          return { success: false, message: `Product ${product.productName} is inactive` };
        }

        productName = product.productName;
        sku = product.sku;
        const billingUnit = req.billingUnit && req.billingUnit.trim() ? req.billingUnit.trim() : product.unit;
        unit = billingUnit;
        unitPrice = product.sellingPrice;
        gstPercentage = product.gstPercentage;
        const baseQty = ConvertBillingQty(req.quantity, billingUnit, product.unit, req.unitsPerBox);
        lineSubtotal = baseQty * unitPrice;

        const applicableOffers = activeOffers.filter(
          o => o.productId === null || o.productId === product.id
        );

        for (const offer of applicableOffers) {
          let discount = 0;
          const offerType = offer.offerType.toLowerCase();

          if (offerType.includes('percentage') && offer.discountPercentage !== null) {
            if (offer.minimumQuantity === null || baseQty >= offer.minimumQuantity) {
              discount = lineSubtotal * (offer.discountPercentage / 100);
            }
          } else if (offerType.includes('fixed') && offer.discountAmount !== null) {
            if (offer.minimumQuantity === null || baseQty >= offer.minimumQuantity) {
              discount = offer.discountAmount * baseQty;
            }
            discount = Math.min(discount, lineSubtotal);
          } else if (
            offerType.includes('buy') &&
            offer.buyQuantity !== null &&
            offer.freeQuantity !== null
          ) {
            const buy = offer.buyQuantity;
            const free = offer.freeQuantity;
            const eligibleSets = Math.floor(baseQty / buy);
            const freeQty = eligibleSets * free;
            discount = Math.min(freeQty, Math.floor(baseQty)) * unitPrice;
          } else if (offerType.includes('bill')) {
            continue;
          }

          if (discount > bestDiscount) {
            bestDiscount = discount;
          }
        }
      }

      if (manualTaxPercentage !== undefined && manualTaxPercentage !== null) {
        gstPercentage = manualTaxPercentage;
      }

      const lineDiscount = bestDiscount;
      const taxable = lineSubtotal - lineDiscount;
      const gstAmt = taxable * (gstPercentage / 100);
      const total = taxable + gstAmt;

      calcItems.push({
        productId,
        productName,
        sku,
        quantity: req.quantity,
        unitPrice,
        subtotal: lineSubtotal,
        discount: lineDiscount,
        gstPercentage,
        gstAmount: gstAmt,
        totalAmount: total,
        isCustom,
        unit
      });

      subtotal += lineSubtotal;
      totalDiscount += lineDiscount;
      totalGst += gstAmt;
    }

    const billOffers = activeOffers.filter(
      o => o.productId === null && o.offerType.toLowerCase().includes('bill')
    );
    for (const bo of billOffers) {
      if (bo.discountPercentage !== null && bo.discountPercentage !== undefined) {
        const d = subtotal * (bo.discountPercentage / 100);
        totalDiscount = Math.max(totalDiscount, d);
      } else if (bo.discountAmount !== null && bo.discountAmount !== undefined) {
        totalDiscount = Math.max(totalDiscount, bo.discountAmount);
      }
    }

    if (manualDiscount !== undefined && manualDiscount !== null) {
      if (manualDiscount < 0) {
        return { success: false, message: 'Manual discount cannot be negative' };
      }
      if (manualDiscount > subtotal) {
        return { success: false, message: 'Manual discount cannot exceed subtotal' };
      }
      totalDiscount = manualDiscount;
    }

    let taxableAmount = subtotal - totalDiscount;
    if (taxableAmount < 0) taxableAmount = 0;

    if (manualDiscount !== undefined && manualDiscount !== null) {
      const factor = subtotal === 0 ? 1 : taxableAmount / subtotal;
      totalGst = 0;
      for (const item of calcItems) {
        const newTaxable = item.subtotal * factor;
        const propDiscount = item.subtotal - newTaxable;
        item.discount = propDiscount;
        item.gstAmount = newTaxable * (item.gstPercentage / 100);
        item.totalAmount = newTaxable + item.gstAmount;
        totalGst += item.gstAmount;
      }
    }

    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const grandTotal = taxableAmount + totalGst;

    return {
      success: true,
      data: {
        items: calcItems,
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(totalDiscount * 100) / 100,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        gstAmount: Math.round(totalGst * 100) / 100,
        cgstAmount: Math.round(cgst * 100) / 100,
        sgstAmount: Math.round(sgst * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error calculating bill' };
  }
}

export async function createBillHandler(
  request: CreateBillRequestDto,
  salesWorkerId: number
): Promise<ApiResponse<BillResponseDto>> {
  try {
    const parseResult = createBillRequestSchema.safeParse(request);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid bill input' };
    }

    const calcRes = await calculateBillingHandler(request.items, request.manualDiscount, request.manualTaxPercentage);
    if (!calcRes.success || !calcRes.data) {
      return { success: false, message: calcRes.message || 'Billing calculation failed' };
    }

    const calc = calcRes.data;
    const prisma = getPrismaClient();

    const result = await prisma.$transaction(async tx => {
      // Check stock for non-custom items using converted baseQty
      for (const item of request.items) {
        if (item.isCustom || !item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        const billingUnit = item.billingUnit && item.billingUnit.trim() ? item.billingUnit.trim() : product.unit;
        const baseQty = ConvertBillingQty(item.quantity, billingUnit, product.unit, item.unitsPerBox);
        if (product.stockQuantity < baseQty) {
          throw new Error(
            `Insufficient stock for ${product.productName}. Available: ${product.stockQuantity} ${product.unit}, Requested: ${item.quantity} ${billingUnit} (${baseQty.toFixed(3)} ${product.unit} after conversion)`
          );
        }
      }

      // Determine Agent Name & Phone
      let agentName = request.agentName?.trim();
      let agentPhone = request.agentPhone?.trim();

      if (!agentName && !agentPhone) {
        const worker = await tx.user.findUnique({ where: { id: salesWorkerId } });
        agentName = worker?.name || 'SAJIN CLARET';
        agentPhone = worker?.phone || '';
      } else if (!agentName) {
        const worker = await tx.user.findUnique({ where: { id: salesWorkerId } });
        agentName = worker?.name || 'SAJIN CLARET';
      } else if (!agentPhone) {
        const byName = await tx.user.findFirst({ where: { name: agentName } });
        agentPhone = byName?.phone || '';
      }

      // Generate invoice number
      const year = new Date().getFullYear();
      let invoiceNumber = '';
      let attempts = 0;
      do {
        const count = (await tx.sale.count()) + 1 + attempts;
        const pad = String(count).padStart(6, '0');
        invoiceNumber = `INV-${year}-${pad}`;
        attempts++;
        const existing = await tx.sale.findUnique({ where: { invoiceNumber } });
        if (!existing) break;
      } while (true);

      const paymentStatus = request.paymentMethod === 'Cash' ? 'Success' : 'Pending';

      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          salesWorkerId,
          agentName,
          agentPhone: agentPhone || null,
          customerName: request.customerName || null,
          customerPhone: request.customerPhone || null,
          customerEmail: request.customerEmail || null,
          customerAddress: request.customerAddress || null,
          customerGSTIN: request.customerGSTIN || null,
          subtotal: calc.subtotal,
          discount: calc.discount,
          gstAmount: calc.gstAmount,
          cgstAmount: calc.cgstAmount,
          sgstAmount: calc.sgstAmount,
          grandTotal: calc.grandTotal,
          paymentMethod: request.paymentMethod,
          paymentStatus,
          saleStatus: 'Completed'
        }
      });

      for (const calcItem of calc.items) {
        const origReq = request.items.find(
          r => (r.isCustom && calcItem.isCustom) || r.productId === calcItem.productId
        );

        if (calcItem.isCustom || !calcItem.productId) {
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: null,
              isCustom: true,
              productName: calcItem.productName,
              sku: calcItem.sku || null,
              unit: calcItem.unit,
              quantity: calcItem.quantity,
              unitPrice: calcItem.unitPrice,
              discount: calcItem.discount,
              gstPercentage: calcItem.gstPercentage,
              gstAmount: calcItem.gstAmount,
              totalAmount: calcItem.totalAmount
            }
          });
          continue;
        }

        const product = await tx.product.findUnique({ where: { id: calcItem.productId } });
        if (!product) throw new Error(`Product ${calcItem.productId} not found`);

        const billingUnitForStock = origReq?.billingUnit || calcItem.unit || product.unit;
        const baseQtyForStock = ConvertBillingQty(calcItem.quantity, billingUnitForStock, product.unit, origReq?.unitsPerBox);
        const prevStock = product.stockQuantity;
        const newStock = prevStock - baseQtyForStock;
        if (newStock < 0) throw new Error(`Negative stock for ${product.productName}`);

        await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: newStock }
        });

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: product.id,
            isCustom: false,
            productName: product.productName,
            sku: product.sku,
            unit: billingUnitForStock,
            quantity: calcItem.quantity,
            unitPrice: calcItem.unitPrice,
            discount: calcItem.discount,
            gstPercentage: calcItem.gstPercentage,
            gstAmount: calcItem.gstAmount,
            totalAmount: calcItem.totalAmount
          }
        });

        const wholesaleSuffix = origReq?.isWholesale ? ' [Wholesale]' : '';
        await tx.stockTransaction.create({
          data: {
            productId: product.id,
            transactionType: 'Sale',
            quantity: -baseQtyForStock,
            previousStock: prevStock,
            newStock,
            reference: sale.invoiceNumber,
            remarks: `Sale ${sale.invoiceNumber} (${calcItem.quantity} ${billingUnitForStock} = ${baseQtyForStock.toFixed(3)} ${product.unit})${wholesaleSuffix}`,
            createdBy: salesWorkerId
          }
        });
      }

      await tx.payment.create({
        data: {
          saleId: sale.id,
          paymentMethod: request.paymentMethod,
          amount: calc.grandTotal,
          status: paymentStatus,
          paidAt: paymentStatus === 'Success' ? new Date() : null
        }
      });

      return {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        grandTotal: sale.grandTotal,
        paymentMethod: sale.paymentMethod,
        paymentStatus,
        createdAt: sale.createdAt.toISOString()
      };
    });

    return {
      success: true,
      message: 'Bill created successfully',
      data: result
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error creating bill' };
  }
}

export async function scanBarcodeHandler(barcode: string): Promise<ApiResponse<ProductSearchDto | null>> {
  try {
    if (!barcode || !barcode.trim()) {
      return { success: false, message: 'Barcode is required' };
    }
    const prisma = getPrismaClient();
    const product = await prisma.product.findUnique({
      where: { barcode: barcode.trim() }
    });

    if (!product || !product.isActive) {
      return { success: true, data: null, message: 'Product not found or inactive' };
    }

    return {
      success: true,
      data: {
        id: product.id,
        productName: product.productName,
        sku: product.sku,
        barcode: product.barcode,
        sellingPrice: product.sellingPrice,
        stockQuantity: product.stockQuantity,
        gstPercentage: product.gstPercentage,
        unit: product.unit
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error scanning barcode' };
  }
}
