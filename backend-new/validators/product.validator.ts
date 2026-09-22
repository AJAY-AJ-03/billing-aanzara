import { z } from 'zod';

const validGst = [0, 5, 12, 18, 28];

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().optional(),
  productName: z.string().min(1, 'Product Name is required').max(200),
  categoryId: z.number().int().positive('Category is required'),
  description: z.string().optional(),
  purchasePrice: z.number().min(0, 'Purchase price must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  gstPercentage: z.number().refine(val => validGst.includes(val), { message: 'GST must be 0, 5, 12, 18, or 28' }),
  stockQuantity: z.number().min(0, 'Stock quantity cannot be negative'),
  minimumStockLevel: z.number().min(0).optional().default(5),
  unit: z.string().optional().default('Piece')
});

export const updateProductSchema = z.object({
  productName: z.string().min(1, 'Product Name is required').max(200),
  categoryId: z.number().int().positive('Category is required'),
  description: z.string().optional(),
  purchasePrice: z.number().min(0, 'Purchase price must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  gstPercentage: z.number().refine(val => validGst.includes(val), { message: 'GST must be 0, 5, 12, 18, or 28' }),
  minimumStockLevel: z.number().min(0),
  unit: z.string().min(1),
  isActive: z.boolean(),
  barcode: z.string().optional()
});
