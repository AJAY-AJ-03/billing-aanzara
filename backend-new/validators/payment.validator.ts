import { z } from 'zod';

export const createPaymentSchema = z.object({
  saleId: z.number().int().positive('saleId is required'),
  paymentMethod: z.enum(['Cash', 'UPI', 'Card', 'Other']),
  amount: z.number().positive('Amount must be positive'),
  transactionId: z.string().optional().nullable()
});

export const verifyPaymentSchema = z.object({
  paymentId: z.number().int().positive('paymentId is required'),
  providerReference: z.string().min(1, 'Provider reference is required'),
  status: z.enum(['Success', 'Failed', 'Cancelled'])
});

export const upiQrRequestSchema = z.object({
  upiId: z.string().min(1, 'UPI ID is required'),
  merchantName: z.string().min(1, 'Merchant name is required'),
  amount: z.number().positive('Amount must be positive')
});