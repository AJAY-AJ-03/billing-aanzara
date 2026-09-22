import { z } from 'zod';

export const createOfferSchema = z.object({
  name: z.string().min(1, 'Offer name is required').max(200),
  description: z.string().optional(),
  productId: z.number().optional().nullable(),
  offerType: z.string().min(1, 'Offer type is required'),
  discountPercentage: z.number().optional().nullable(),
  discountAmount: z.number().optional().nullable(),
  minimumQuantity: z.number().optional().nullable(),
  buyQuantity: z.number().optional().nullable(),
  freeQuantity: z.number().optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().optional().default(true)
});

export const updateOfferSchema = createOfferSchema;
