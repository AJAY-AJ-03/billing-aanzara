export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface PaginationRequest {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  isDescending?: boolean;
  salesWorkerId?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  fromDate?: string;
  toDate?: string;
}

// User & Auth Types
export interface UserDto {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'Admin' | 'SalesWorker';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface LoginRequestDto {
  email: string;
  passwordHash?: string;
  password?: string;
}

export interface LoginResponseDto {
  accessToken?: string;
  userId: number;
  name: string;
  role: string;
  email: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
}

export interface UpdateUserDto {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: string;
  isActive: boolean;
}

// Category Types
export interface CategoryDto {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  productCount?: number;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

// Product Types
export interface ProductDto {
  id: number;
  sku: string;
  barcode?: string | null;
  productName: string;
  categoryId: number;
  categoryName?: string;
  description?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  gstPercentage: number;
  stockQuantity: number;
  minimumStockLevel: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateProductDto {
  sku: string;
  barcode?: string;
  productName: string;
  categoryId: number;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  gstPercentage: number;
  stockQuantity: number;
  minimumStockLevel?: number;
  unit?: string;
}

export interface UpdateProductDto {
  productName: string;
  categoryId: number;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  gstPercentage: number;
  minimumStockLevel: number;
  unit: string;
  isActive: boolean;
  barcode?: string;
}

export interface ProductSearchDto {
  id: number;
  productName: string;
  sku: string;
  barcode?: string | null;
  sellingPrice: number;
  stockQuantity: number;
  gstPercentage: number;
  unit: string;
}

// Offer Types
export interface OfferDto {
  id: number;
  name: string;
  description?: string | null;
  productId?: number | null;
  productName?: string | null;
  offerType: string;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  minimumQuantity?: number | null;
  buyQuantity?: number | null;
  freeQuantity?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateOfferDto {
  name: string;
  description?: string;
  productId?: number;
  offerType: string;
  discountPercentage?: number;
  discountAmount?: number;
  minimumQuantity?: number;
  buyQuantity?: number;
  freeQuantity?: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateOfferDto extends CreateOfferDto {}

// Stock Types
export interface StockTransactionDto {
  id: number;
  productId: number;
  productName?: string;
  transactionType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string | null;
  remarks?: string | null;
  createdBy?: number | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface StockAdjustmentDto {
  productId: number;
  transactionType: 'Adjustment' | 'Damaged' | 'Expired' | 'Return';
  quantity: number;
  remarks?: string;
}

export interface StockAdjustmentDto {
  productId: number;
  transactionType: 'Adjustment' | 'Damaged' | 'Expired' | 'Return';
  quantity: number;
  remarks?: string;
  unit?: string;
  unitsPerBox?: number;
}

export interface StockInDto {
  productId: number;
  quantity: number;
  reference?: string;
  remarks?: string;
  unit?: string;
  unitsPerBox?: number;
  manualTaxPercentage?: number;
}

export interface LowStockDto {
  id: number;
  productName: string;
  sku: string;
  stockQuantity: number;
  minimumStockLevel: number;
  unit: string;
}

// Billing Types
export interface BillingItemRequestDto {
  productId?: number | null;
  quantity: number;
  isCustom?: boolean;
  customProductName?: string;
  customUnitPrice?: number;
  customGSTPercentage?: number;
  customSKU?: string;
  customUnit?: string;
  billingUnit?: string;
  unitsPerBox?: number;
  isWholesale?: boolean;
}

export interface BillingCalculatedItemDto {
  productId?: number | null;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
  isCustom: boolean;
  unit: string;
}

export interface BillingCalculationDto {
  items: BillingCalculatedItemDto[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
}

export interface CreateBillRequestDto {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGSTIN?: string;
  shopName?: string;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Other';
  manualDiscount?: number;
  manualTaxPercentage?: number;
  agentName?: string;
  agentPhone?: string;
  items: BillingItemRequestDto[];
}

export interface BillResponseDto {
  saleId: number;
  invoiceNumber: string;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}

// Invoice Types
export interface InvoiceItemDto {
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstPercentage: number;
  gstAmount: number;
  total: number;
  unit: string;
  isCustom: boolean;
}

export interface InvoiceDto {
  invoiceNumber: string;
  invoiceDate: string;
  agentName?: string | null;
  agentPhone?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGSTIN?: string | null;
  shopName?: string | null;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessGSTIN?: string;
  businessAccountNumber?: string;   // ADDED
  businessIFSC?: string;            // ADDED
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  gstTotal: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentId?: number | null;
  transactionId?: string | null;
  items: InvoiceItemDto[];
}

// Sales & Reports Types
export interface SaleListItemDto {
  id: number;
  invoiceNumber: string;
  agentName?: string | null;
  agentPhone?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  shopName?: string | null;
  salesWorkerName?: string | null;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}

export interface PaymentDto {
  id: number;
  saleId: number;
  paymentMethod: string;
  amount: number;
  transactionId?: string | null;
  providerReference?: string | null;
  status: string;
  paidAt?: string | null;
  createdAt?: string;
}

export interface CreatePaymentDto {
  saleId: number;
  paymentMethod: string;
  amount: number;
  transactionId?: string | null;
}

export interface VerifyPaymentDto {
  paymentId: number;
  providerReference: string;
  status: string; // Success, Failed, Cancelled
}

export interface UpiQrRequestDto {
  upiId: string;
  merchantName: string;
  amount: number;
}

export interface UpdateSaleDto {
  agentName?: string | null;
  agentPhone?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGSTIN?: string | null;
  shopName?: string | null;
  paymentMethod?: string;
  manualDiscount?: number | null;
  manualTaxPercentage?: number | null;
  items?: BillingItemRequestDto[];
}

export interface SaleDto {
  id: number;
  invoiceNumber: string;
  agentName?: string | null;
  agentPhone?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGSTIN?: string | null;
  shopName?: string | null;
  salesWorkerId: number;
  salesWorkerName?: string | null;
  subtotal: number;
  discount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  saleStatus: string;
  createdAt: string;
  items: InvoiceItemDto[];
  payments: PaymentDto[];
}

export interface MonthlySalesDto {
  month: string;
  monthNumber: number;
  year?: number;
  totalSales: number;
  numberOfBills: number;
  gstCollected?: number;
  discountGiven?: number;
  netSales?: number;
}

export interface DailySalesDto {
  date: string;
  totalSales: number;
  billsCount: number;
}

export interface ProductSalesDto {
  productId: number;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface SalesReportFilterDto {
  fromDate?: string;
  toDate?: string;
  salesWorkerId?: number;
  paymentMethod?: string;
}

// Dashboard Types
export interface AdminDashboardDto {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  todaySales: number;
  todayBills: number;
  thisMonthSales: number;
  thisMonthBills: number;
  totalBills: number;
  gstCollected: number;
  monthlySales: { month: string; monthNumber: number; total: number; bills: number }[];
  topProducts: { productId: number; productName: string; quantitySold: number; revenue: number }[];
  workerPerformance: { userId: number; name: string; billsCount: number; totalSales: number }[];
  lowStockProducts: LowStockDto[];
}

export interface BillingDashboardDto {
  todayBills: number;
  todaySales: number;
  recentBills: { invoiceNumber: string; createdAt: string; grandTotal: number; paymentMethod: string }[];
}