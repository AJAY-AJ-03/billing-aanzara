import { z } from 'zod';

export const billingItemRequestSchema = z.object({
  productId: z.number().optional().nullable(),
  quantity: z.number().positive('Quantity must be positive'),
  isCustom: z.boolean().optional(),
  customProductName: z.string().optional(),
  customUnitPrice: z.number().optional(),
  customGSTPercentage: z.number().optional(),
  customSKU: z.string().optional(),
  customUnit: z.string().optional(),
  billingUnit: z.string().optional(),
  unitsPerBox: z.number().optional().nullable(),
  isWholesale: z.boolean().optional()
});

export const createBillRequestSchema = z.object({
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  customerGSTIN: z.string().optional().nullable(),
  paymentMethod: z.enum(['Cash', 'UPI', 'Card', 'Other']),
  manualDiscount: z.number().optional().nullable(),
  manualTaxPercentage: z.number().optional().nullable(),
  agentName: z.string().optional().nullable(),
  agentPhone: z.string().optional().nullable(),
  items: z.array(billingItemRequestSchema).min(1, 'At least one item is required')
});
