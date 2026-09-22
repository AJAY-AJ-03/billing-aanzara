import { z } from 'zod';

export const stockAdjustmentSchema = z.object({
  productId: z.number().int().positive('Product is required'),
  transactionType: z.enum(['Adjustment', 'Damaged', 'Expired', 'Return']),
  quantity: z.number().refine(v => v !== 0, { message: 'Quantity cannot be zero' }),
  remarks: z.string().optional()
});

export const stockInSchema = z.object({
  productId: z.number().int().positive('Product is required'),
  quantity: z.number().positive('Quantity must be positive'),
  reference: z.string().optional(),
  remarks: z.string().optional()
});
