import getPrismaClient from '../../database/db';
import { ApiResponse, CreatePaymentDto, PaymentDto, VerifyPaymentDto } from '../../shared/types/ipc';
import { createPaymentSchema, verifyPaymentSchema, upiQrRequestSchema } from '../validators/payment.validator';

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
 * Create a standalone payment record against an existing sale.
 * Mirrors PaymentService.CreateAsync — always lands in "Pending" status;
 * use verifyPaymentHandler to confirm it.
 */
export async function createPaymentHandler(dto: CreatePaymentDto): Promise<ApiResponse<PaymentDto>> {
  try {
    const parseResult = createPaymentSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid payment data' };
    }

    const prisma = getPrismaClient();
    const sale = await prisma.sale.findUnique({ where: { id: dto.saleId } });
    if (!sale) {
      return { success: false, message: 'Sale not found' };
    }

    const payment = await prisma.payment.create({
      data: {
        saleId: dto.saleId,
        paymentMethod: dto.paymentMethod,
        amount: dto.amount,
        transactionId: dto.transactionId || null,
        status: 'Pending'
      }
    });

    return { success: true, message: 'Payment created', data: mapPayment(payment) };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error creating payment' };
  }
}

/**
 * Confirm/reject a pending payment. On "Success" this also flips the
 * parent Sale's paymentStatus to "Success" — mirrors PaymentService.VerifyAsync.
 */
export async function verifyPaymentHandler(dto: VerifyPaymentDto): Promise<ApiResponse<PaymentDto>> {
  try {
    const parseResult = verifyPaymentSchema.safeParse(dto);
    if (!parseResult.success) {
      return { success: false, message: parseResult.error.errors[0]?.message || 'Invalid verification data' };
    }

    const prisma = getPrismaClient();
    const payment = await prisma.payment.findUnique({ where: { id: dto.paymentId } });
    if (!payment) {
      return { success: false, message: 'Payment not found' };
    }

    const updated = await prisma.$transaction(async tx => {
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
 * Build a `upi://pay` deep link for the given amount — mirrors
 * PaymentService.GenerateUpiUrlAsync. Pure string formatting, no DB access.
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