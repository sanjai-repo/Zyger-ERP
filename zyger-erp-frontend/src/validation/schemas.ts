import { z } from 'zod';

// ===== Auth Schemas =====

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  displayName: z.string().min(1, 'Name is required'),
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/\d/, 'Must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  confirmPassword: z.string(),
  agreeTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree with Terms & Policy' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

// ===== Sales Schemas =====

export const salesOrderLineSchema = z.object({
  itemCode: z.string().min(1, 'Item code is required'),
  itemName: z.string().optional(),
  orderQty: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Price cannot be negative').optional(),
  discount: z.number().min(0, 'Discount cannot be negative').optional(),
  tax: z.number().min(0).max(100, 'Tax must be between 0 and 100').optional(),
  drawingRevision: z.string().optional(),
  requiredDeliveryDate: z.string().optional(),
  remarks: z.string().optional(),
});

export const createSalesOrderSchema = z.object({
  customer: z.string().min(1, 'Customer name is required'),
  customerCode: z.string().optional(),
  orderDate: z.string().min(1, 'Order date is required'),
  deliveryDate: z.string().optional(),
  soType: z.string().optional(),
  notes: z.string().optional(),
  remarks: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentTerms: z.string().optional(),
  lines: z.array(salesOrderLineSchema).min(1, 'At least one line item is required'),
});

export const createProformaInvoiceSchema = z.object({
  customer: z.string().min(1, 'Customer name is required'),
  piDate: z.string().min(1, 'PI date is required'),
  notes: z.string().optional(),
  lines: z.array(salesOrderLineSchema).min(1, 'At least one line item is required'),
});

// ===== Purchase Schemas =====

export const purchaseOrderLineSchema = z.object({
  itemCode: z.string().min(1, 'Item code is required'),
  itemName: z.string().optional(),
  orderQty: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Price cannot be negative').optional(),
  discount: z.number().min(0, 'Discount cannot be negative').optional(),
  tax: z.number().min(0).max(100, 'Tax must be between 0 and 100').optional(),
  remarks: z.string().optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplier: z.string().min(1, 'Supplier name is required'),
  supplierCode: z.string().optional(),
  orderDate: z.string().min(1, 'Order date is required'),
  deliveryDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  remarks: z.string().optional(),
  deliveryAddress: z.string().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1, 'At least one line item is required'),
});

// ===== Action Schema =====

export const actionRequestSchema = z.object({
  note: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

// ===== Generic Search =====

export const searchFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.number().min(0).optional(),
  size: z.number().min(1).max(100).optional(),
});

// ===== Type exports =====
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type ActionRequestInput = z.infer<typeof actionRequestSchema>;
export type SearchFilterInput = z.infer<typeof searchFilterSchema>;
