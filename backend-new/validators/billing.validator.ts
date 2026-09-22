import { z } from 'zod';

export const billingItemRequestSchema = z.object({
  productId: z.number().optional().nullable(),
  quantity: z.number().positive('Quantity must be positive'),
  isCustom: z.boolean().optional(),
  customProductName: z.string().optional(),
  customUnitPrice: z.number().optional(),
  customGSTPercentage: z.number().optional(),
  customSKU: z.string().optional(),
  customUnit: z.string().optional()
});

export const createBillRequestSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  customerAddress: z.string().optional(),
  customerGSTIN: z.string().optional(),
  paymentMethod: z.enum(['Cash', 'UPI', 'Card', 'Other']),
  manualDiscount: z.number().optional(),
  items: z.array(billingItemRequestSchema).min(1, 'At least one item is required')
});
