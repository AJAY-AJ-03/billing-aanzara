import getPrismaClient from '../../database/db';
import { ApiResponse, CreatePaymentDto, PaymentDto, VerifyPaymentDto } from '../../shared/types/ipc';
import { createPaymentSchema, verifyPaymentSchema, upiQrRequestSchema } from '../validators/payment.validator';

// Compare money in whole paise to avoid floating point mismatches
const toPaise = (rupees: number): number => Math.round((rupees + Number.EPSILON) * 100);
const fmt = (rupees: number): string => `₹${rupees.toFixed(2)}`;

function mapPayment(p: any): PaymentDto {
  return {
    id: p.id,
    saleId: p.saleId,
    paymentMethod: p.paymentMethod,
    amount: p.amount,
    transactionId: p.transactionId,
    providerReference: p.providerReference,
    status: p.status,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    createdAt: p.createdAt ? p.createdAt.toISOString() : undefined
  };
}

/**
 * Create a payment record against an existing sale.
 * A sale has one live payment at a time, so this is only allowed when:
 *  - the sale is not cancelled,
 *  - the sale is not already paid,
 *  - there is no other pending payment (verify or fail it first),
 *  - the amount equals the invoice total (no partial payments).
 * The new payment always lands in "Pending"; use verifyPaymentHandler to confirm it.
 */
export async function createPaymentHandler(dto: CreatePaymentDto): Promise<ApiResponse<PaymentDto>> {
  try {
    const parseResult = createPaymentSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid payment data' };
    }

    const prisma = getPrismaClient();

    const payment = await prisma.$transaction(async tx => {
      const sale = await tx.sale.findUnique({
        where: { id: dto.saleId },
        include: { payments: true }
      });

      if (!sale) {
        throw new Error('Sale not found');
      }
      if (sale.saleStatus === 'Cancelled') {
        throw new Error('Cannot add a payment to a cancelled invoice');
      }
      if (sale.paymentStatus === 'Success' || sale.payments.some(p => p.status === 'Success')) {
        throw new Error('This invoice is already paid');
      }
      if (sale.payments.some(p => p.status === 'Pending')) {
        throw new Error('This invoice already has a pending payment. Verify it, or mark it Failed/Cancelled first');
      }
      if (toPaise(dto.amount) !== toPaise(sale.grandTotal)) {
        throw new Error(`Payment amount must equal the invoice total (${fmt(sale.grandTotal)})`);
      }

      return tx.payment.create({
        data: {
          saleId: dto.saleId,
          paymentMethod: dto.paymentMethod,
          amount: dto.amount,
          transactionId: dto.transactionId || null,
          status: 'Pending'
        }
      });
    });

    return { success: true, message: 'Payment created', data: mapPayment(payment) };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error creating payment' };
  }
}

/**
 * Confirm/reject a pending payment. On "Success" this also flips the
 * parent Sale's paymentStatus to "Success".
 *
 * Rules:
 *  - only a Pending payment can be verified (final states cannot be changed),
 *  - the invoice must not be cancelled,
 *  - to mark Success, the payment amount must equal the invoice total,
 *    (and amountReceived, if given, must equal it too),
 *  - an invoice can have only one successful payment.
 */
export async function verifyPaymentHandler(dto: VerifyPaymentDto): Promise<ApiResponse<PaymentDto>> {
  try {
    const parseResult = verifyPaymentSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid verification data' };
    }

    const prisma = getPrismaClient();

    const updated = await prisma.$transaction(async tx => {
      const payment = await tx.payment.findUnique({
        where: { id: dto.paymentId },
        include: { sale: true }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }
      if (payment.status !== 'Pending') {
        throw new Error(`This payment is already ${payment.status}. Only pending payments can be verified`);
      }
      if (payment.sale.saleStatus === 'Cancelled') {
        throw new Error('Cannot verify a payment on a cancelled invoice');
      }

      if (dto.status === 'Success') {
        const expectedP = toPaise(payment.sale.grandTotal);

        if (toPaise(payment.amount) !== expectedP) {
          throw new Error(
            `Payment amount ${fmt(payment.amount)} does not match the invoice total ${fmt(payment.sale.grandTotal)}`
          );
        }
        if (dto.amountReceived !== undefined && dto.amountReceived !== null) {
          if (toPaise(dto.amountReceived) !== expectedP) {
            throw new Error(
              `Amount received ${fmt(dto.amountReceived)} does not match the invoice total ${fmt(payment.sale.grandTotal)}`
            );
          }
        }

        const alreadyPaid = await tx.payment.count({
          where: { saleId: payment.saleId, status: 'Success' }
        });
        if (alreadyPaid > 0) {
          throw new Error('This invoice already has a successful payment');
        }
      }

      const p = await tx.payment.update({
        where: { id: dto.paymentId },
        data: {
          providerReference: dto.providerReference,
          status: dto.status,
          paidAt: dto.status === 'Success' ? new Date() : payment.paidAt
        }
      });

      if (dto.status === 'Success') {
        await tx.sale.update({
          where: { id: p.saleId },
          data: { paymentStatus: 'Success' }
        });
      }

      return p;
    });

    return { success: true, message: 'Payment verified', data: mapPayment(updated) };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error verifying payment' };
  }
}

/**
 * Build a `upi://pay` deep link for the given amount.
 * Pure string formatting, no DB access.
 */
export async function generateUpiUrlHandler(
  upiId: string,
  merchantName: string,
  amount: number
): Promise<ApiResponse<{ upiUrl: string }>> {
  try {
    const parseResult = upiQrRequestSchema.safeParse({ upiId, merchantName, amount });
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid UPI request' };
    }

    const url = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      merchantName
    )}&am=${amount.toFixed(2)}&cu=INR`;

    return { success: true, data: { upiUrl: url } };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error generating UPI URL' };
  }
}