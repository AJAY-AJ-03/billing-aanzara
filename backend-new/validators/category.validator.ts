import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category Name is required').max(100),
  description: z.string().optional()
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category Name is required').max(100),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});
