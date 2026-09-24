import getPrismaClient from '../../database/db';
import type { Prisma } from '@prisma/client';
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

/* ------------------------------------------------------------------ */
/* Money helpers — all bill arithmetic is done in whole paise          */
/* (integers) so rounding happens once per line and totals always      */
/* equal the sum of the printed lines.                                 */
/* ------------------------------------------------------------------ */

const toPaise = (rupees: number): number => Math.round((rupees + Number.EPSILON) * 100);
const toRupees = (paise: number): number => paise / 100;

/**
 * Splits `totalP` paise across lines in proportion to `weights`, using the
 * largest-remainder method so the shares add up to exactly `totalP`.
 */
function allocateProportionally(totalP: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum === 0) return weights.map(() => 0);

  const raw = weights.map(w => (totalP * w) / weightSum);
  const shares = raw.map(v => Math.floor(v));
  let remainder = totalP - shares.reduce((a, b) => a + b, 0);

  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; remainder > 0 && k < order.length; k++, remainder--) {
    shares[order[k].i] += 1;
  }
  return shares;
}

interface CalcLine {
  productId: number | null;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  isCustom: boolean;
  unit: string;
  gstPercentage: number;
  subtotalP: number;
  discountP: number;
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

    const lines: CalcLine[] = [];

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
      let subtotalP: number;
      let bestDiscountP = 0;

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
        subtotalP = toPaise(unitPrice * req.quantity);
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
        subtotalP = toPaise(baseQty * unitPrice);

        const applicableOffers = activeOffers.filter(
          o => o.productId === null || o.productId === product.id
        );

        for (const offer of applicableOffers) {
          let discountP = 0;
          const offerType = offer.offerType.toLowerCase();

          if (offerType.includes('percentage') && offer.discountPercentage !== null) {
            if (offer.minimumQuantity === null || baseQty >= offer.minimumQuantity) {
              discountP = Math.round((subtotalP * offer.discountPercentage) / 100);
            }
          } else if (offerType.includes('fixed') && offer.discountAmount !== null) {
            if (offer.minimumQuantity === null || baseQty >= offer.minimumQuantity) {
              discountP = toPaise(offer.discountAmount * baseQty);
            }
          } else if (
            offerType.includes('buy') &&
            offer.buyQuantity !== null &&
            offer.freeQuantity !== null
          ) {
            const buy = offer.buyQuantity;
            const free = offer.freeQuantity;
            const eligibleSets = Math.floor(baseQty / buy);
            const freeQty = eligibleSets * free;
            discountP = toPaise(Math.min(freeQty, Math.floor(baseQty)) * unitPrice);
          } else if (offerType.includes('bill')) {
            continue;
          }

          // A line discount can never exceed the line itself
          discountP = Math.min(discountP, subtotalP);

          if (discountP > bestDiscountP) {
            bestDiscountP = discountP;
          }
        }
      }

      if (manualTaxPercentage !== undefined && manualTaxPercentage !== null) {
        gstPercentage = manualTaxPercentage;
      }

      lines.push({
        productId,
        productName,
        sku,
        quantity: req.quantity,
        unitPrice,
        isCustom,
        unit,
        gstPercentage,
        subtotalP,
        discountP: bestDiscountP
      });
    }

    const subtotalP = lines.reduce((s, l) => s + l.subtotalP, 0);
    const lineDiscountP = lines.reduce((s, l) => s + l.discountP, 0);

    // A bill-level discount (manual, or a "bill" offer) replaces the per-line
    // discounts and is spread across the lines, so line amounts, GST and the
    // grand total all stay consistent with each other.
    let billDiscountOverrideP: number | null = null;

    if (manualDiscount !== undefined && manualDiscount !== null) {
      if (manualDiscount < 0) {
        return { success: false, message: 'Manual discount cannot be negative' };
      }
      const manualP = toPaise(manualDiscount);
      if (manualP > subtotalP) {
        return { success: false, message: 'Manual discount cannot exceed subtotal' };
      }
      billDiscountOverrideP = manualP;
    } else {
      let billOfferP = 0;
      for (const bo of activeOffers) {
        if (bo.productId !== null || !bo.offerType.toLowerCase().includes('bill')) continue;

        let d = 0;
        if (bo.discountPercentage !== null && bo.discountPercentage !== undefined) {
          d = Math.round((subtotalP * bo.discountPercentage) / 100);
        } else if (bo.discountAmount !== null && bo.discountAmount !== undefined) {
          d = toPaise(bo.discountAmount);
        }
        billOfferP = Math.max(billOfferP, d);
      }
      billOfferP = Math.min(billOfferP, subtotalP);

      // Same rule as before: the bill offer only applies if it beats the line offers
      if (billOfferP > lineDiscountP) {
        billDiscountOverrideP = billOfferP;
      }
    }

    if (billDiscountOverrideP !== null) {
      const shares = allocateProportionally(
        billDiscountOverrideP,
        lines.map(l => l.subtotalP)
      );
      lines.forEach((l, i) => {
        l.discountP = shares[i];
      });
    }

    // Final per-line amounts, in whole paise
    const finalLines = lines.map(l => {
      const taxableP = l.subtotalP - l.discountP;
      const gstP = Math.round((taxableP * l.gstPercentage) / 100);
      return { ...l, taxableP, gstP, totalP: taxableP + gstP };
    });

    const totalSubtotalP = finalLines.reduce((s, l) => s + l.subtotalP, 0);
    const totalDiscountP = finalLines.reduce((s, l) => s + l.discountP, 0);
    const totalTaxableP = finalLines.reduce((s, l) => s + l.taxableP, 0);
    const totalGstP = finalLines.reduce((s, l) => s + l.gstP, 0);
    const grandTotalP = totalTaxableP + totalGstP;

    // CGST + SGST always add up to the GST total (odd paisa goes to SGST)
    const cgstP = Math.floor(totalGstP / 2);
    const sgstP = totalGstP - cgstP;

    return {
      success: true,
      data: {
        items: finalLines.map(l => ({
          productId: l.productId,
          productName: l.productName,
          sku: l.sku,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          subtotal: toRupees(l.subtotalP),
          discount: toRupees(l.discountP),
          gstPercentage: l.gstPercentage,
          gstAmount: toRupees(l.gstP),
          totalAmount: toRupees(l.totalP),
          isCustom: l.isCustom,
          unit: l.unit
        })),
        subtotal: toRupees(totalSubtotalP),
        discount: toRupees(totalDiscountP),
        taxableAmount: toRupees(totalTaxableP),
        gstAmount: toRupees(totalGstP),
        cgstAmount: toRupees(cgstP),
        sgstAmount: toRupees(sgstP),
        grandTotal: toRupees(grandTotalP)
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error calculating bill' };
  }
}

/**
 * Returns the next invoice number for the current year, e.g. INV-2026-000042.
 * Uses a counter table so numbers are never reused, even if sales are cancelled.
 * Must be called inside the same transaction that creates the sale, so a failed
 * bill also rolls the counter back (no skipped numbers).
 */
async function getNextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // First invoice of the year (or first run after this update):
  // start the counter from the highest number already used.
  const existingCounter = await tx.invoiceCounter.findUnique({ where: { year } });
  if (!existingCounter) {
    const used = await tx.sale.findMany({
      where: { invoiceNumber: { startsWith: prefix } },
      select: { invoiceNumber: true }
    });
    const maxUsed = used.reduce((max, s) => {
      const n = parseInt(s.invoiceNumber.slice(prefix.length), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    await tx.invoiceCounter.create({ data: { year, lastNumber: maxUsed } });
  }

  const updated = await tx.invoiceCounter.update({
    where: { year },
    data: { lastNumber: { increment: 1 } }
  });

  return `${prefix}${String(updated.lastNumber).padStart(6, '0')}`;
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

      // Generate invoice number (never reused, even after cancellations)
      const invoiceNumber = await getNextInvoiceNumber(tx);

      const paymentStatus = request.paymentMethod === 'Cash' ? 'Success' : 'Pending';

      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          salesWorkerId,
          agentName,
          agentPhone: agentPhone || null,
          shopName: request.shopName && request.shopName.trim() ? request.shopName.trim() : null,
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

      // calc.items is built in the same order as request.items, so match by index.
      // (Using find() by productId picks the wrong request when the same product
      // is billed twice in different units.)
      for (let idx = 0; idx < calc.items.length; idx++) {
        const calcItem = calc.items[idx];
        const origReq = request.items[idx];

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
        const baseQtyForStock = ConvertBillingQty(
          calcItem.quantity,
          billingUnitForStock,
          product.unit,
          origReq?.unitsPerBox
        );
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
            unitsPerBox: origReq?.unitsPerBox ?? null, // saved so edit/cancel can reverse stock exactly
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