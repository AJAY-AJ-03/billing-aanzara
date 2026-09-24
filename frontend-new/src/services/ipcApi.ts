import type {
  ApiResponse,
  LoginRequestDto,
  LoginResponseDto,
  PaginationRequest,
  PaginatedResult,
  ProductDto,
  CreateProductDto,
  UpdateProductDto,
  ProductSearchDto,
  CategoryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  StockTransactionDto,
  StockAdjustmentDto,
  StockInDto,
  LowStockDto,
  OfferDto,
  CreateOfferDto,
  UpdateOfferDto,
  SaleListItemDto,
  SaleDto,
  MonthlySalesDto,
  DailySalesDto,
  ProductSalesDto,
  SalesReportFilterDto,
  AdminDashboardDto,
  BillingDashboardDto,
  UserDto,
  CreateUserDto,
  UpdateUserDto,
  InvoiceDto,
  BillingItemRequestDto,
  BillingCalculationDto,
  CreateBillRequestDto,
  BillResponseDto,
  PaymentDto,
  CreatePaymentDto,
  VerifyPaymentDto
} from '../../../shared/types/ipc';

declare global {
  interface Window {
    api?: any;
  }
}

// Fallback dummy responses if window.api is missing (e.g. standard browser preview)
const getApi = () => {
  if (typeof window !== 'undefined' && window.api) {
    return window.api;
  }
  console.warn('Electron window.api is not available. Using browser fallback mode.');
  return null;
};

// Global error handling wrapper for IPC responses (Item 8)
async function handleResponse<T>(callPromise: Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
  try {
    const res = await callPromise;
    if (!res.success) {
      const msg = res.message || 'Operation failed';
      if (msg.includes('Session expired') || msg.includes('Unauthenticated')) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return res;
  } catch (err: any) {
    const message = err?.message || 'IPC Execution error';
    return { success: false, message };
  }
}

export const api = {
  auth: {
    login: async (req: LoginRequestDto): Promise<ApiResponse<LoginResponseDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.auth.login(req));
      return { success: false, message: 'Electron context bridge not available' };
    },
    restoreSession: async (userId: number): Promise<ApiResponse<LoginResponseDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.auth.restoreSession(userId));
      return { success: false, message: 'Electron context bridge not available' };
    },
    logout: async (): Promise<ApiResponse<void>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.auth.logout());
      return { success: true };
    }
  },
  billing: {
    calculate: async (items: BillingItemRequestDto[], manualDiscount?: number, manualTaxPercentage?: number): Promise<ApiResponse<BillingCalculationDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.billing.calculate(items, manualDiscount, manualTaxPercentage));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    create: async (req: CreateBillRequestDto, salesWorkerId?: number): Promise<ApiResponse<BillResponseDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.billing.create(req, salesWorkerId));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    scanBarcode: async (barcode: string): Promise<ApiResponse<ProductSearchDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.billing.scanBarcode(barcode));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  products: {
    getPaged: async (req: PaginationRequest): Promise<ApiResponse<PaginatedResult<ProductDto>>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.products.getPaged(req));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getById: async (id: number): Promise<ApiResponse<ProductDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.products.getById(id));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    create: async (dto: CreateProductDto): Promise<ApiResponse<ProductDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.products.create(dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    update: async (id: number, dto: UpdateProductDto): Promise<ApiResponse<ProductDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.products.update(id, dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    toggle: async (id: number): Promise<ApiResponse<boolean>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.products.toggle(id));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    search: async (term: string): Promise<ApiResponse<ProductSearchDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.products.search(term));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    export: async (): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.products.export());
      return { success: false, message: 'IPC bridge unavailable' };
    },
    import: async (base64Data: string): Promise<ApiResponse<{ importedCount: number; errorCount: number; errors: string[] }>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.products.import(base64Data));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  categories: {
    getPaged: async (req: PaginationRequest): Promise<ApiResponse<PaginatedResult<CategoryDto>>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.categories.getPaged(req));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getAllActive: async (): Promise<ApiResponse<CategoryDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.categories.getAllActive());
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getById: async (id: number): Promise<ApiResponse<CategoryDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.categories.getById(id));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    create: async (dto: CreateCategoryDto): Promise<ApiResponse<CategoryDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.categories.create(dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    update: async (id: number, dto: UpdateCategoryDto): Promise<ApiResponse<CategoryDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.categories.update(id, dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    toggle: async (id: number): Promise<ApiResponse<boolean>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.categories.toggle(id));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  stock: {
    getTransactions: async (productId: number, req: PaginationRequest): Promise<ApiResponse<PaginatedResult<StockTransactionDto>>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.stock.getTransactions(productId, req));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    adjust: async (dto: StockAdjustmentDto, userId?: number): Promise<ApiResponse<StockTransactionDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.stock.adjust(dto, userId));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    stockIn: async (dto: StockInDto, userId?: number): Promise<ApiResponse<StockTransactionDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.stock.stockIn(dto, userId));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getLowStock: async (): Promise<ApiResponse<LowStockDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.stock.getLowStock());
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getOutOfStock: async (): Promise<ApiResponse<LowStockDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.stock.getOutOfStock());
      return { success: false, message: 'IPC bridge unavailable' };
    },
    export: async (): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.stock.export());
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  offers: {
    getPaged: async (req: PaginationRequest): Promise<ApiResponse<PaginatedResult<OfferDto>>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.offers.getPaged(req));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getActive: async (): Promise<ApiResponse<OfferDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.offers.getActive());
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getById: async (id: number): Promise<ApiResponse<OfferDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.offers.getById(id));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    create: async (dto: CreateOfferDto): Promise<ApiResponse<OfferDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.offers.create(dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    update: async (id: number, dto: UpdateOfferDto): Promise<ApiResponse<OfferDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.offers.update(id, dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    toggle: async (id: number): Promise<ApiResponse<boolean>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.offers.toggle(id));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  sales: {
    getPaged: async (req: PaginationRequest): Promise<ApiResponse<PaginatedResult<SaleListItemDto>>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.sales.getPaged(req));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getById: async (id: number): Promise<ApiResponse<SaleDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.sales.getById(id));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getByInvoice: async (invNum: string): Promise<ApiResponse<SaleDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.sales.getByInvoice(invNum));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    update: async (id: number, dto: any): Promise<ApiResponse<SaleDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.sales.update(id, dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    delete: async (id: number): Promise<ApiResponse<boolean>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.sales.delete(id));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  reports: {
    monthlySales: async (year?: number): Promise<ApiResponse<MonthlySalesDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.reports.monthlySales(year));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    dailySales: async (from: string, to: string): Promise<ApiResponse<DailySalesDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.reports.dailySales(from, to));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    productSales: async (from: string, to: string): Promise<ApiResponse<ProductSalesDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.reports.productSales(from, to));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    exportSales: async (filter: SalesReportFilterDto): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.reports.exportSales(filter));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    exportGst: async (from: string, to: string): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.reports.exportGst(from, to));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  dashboard: {
    admin: async (): Promise<ApiResponse<AdminDashboardDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.dashboard.admin());
      return { success: false, message: 'IPC bridge unavailable' };
    },
    billing: async (workerId?: number): Promise<ApiResponse<BillingDashboardDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.dashboard.billing(workerId));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  users: {
    getPaged: async (req: PaginationRequest): Promise<ApiResponse<PaginatedResult<UserDto>>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.users.getPaged(req));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getById: async (id: number): Promise<ApiResponse<UserDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.users.getById(id));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    create: async (dto: CreateUserDto): Promise<ApiResponse<UserDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.users.create(dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    update: async (id: number, dto: UpdateUserDto): Promise<ApiResponse<UserDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.users.update(id, dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    toggle: async (id: number): Promise<ApiResponse<boolean>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.users.toggle(id));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  invoices: {
    getById: async (id: number): Promise<ApiResponse<InvoiceDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.invoices.getById(id));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getByNumber: async (invNum: string): Promise<ApiResponse<InvoiceDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.invoices.getByNumber(invNum));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    generatePdf: async (id: number): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.invoices.generatePdf(id));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  payments: {
    create: async (dto: CreatePaymentDto): Promise<ApiResponse<PaymentDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.payments.create(dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    verify: async (dto: VerifyPaymentDto): Promise<ApiResponse<PaymentDto>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.payments.verify(dto));
      return { success: false, message: 'IPC bridge unavailable' };
    },
    upiQr: async (upiId: string, merchantName: string, amount: number): Promise<ApiResponse<{ upiUrl: string }>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.payments.upiQr(upiId, merchantName, amount));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  app: {
    print: async (): Promise<ApiResponse<void>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.app.print());
      window.print();
      return { success: true };
    },
    savePdfDialog: async (base64Data: string, filename?: string): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return handleResponse(electronApi.app.savePdfDialog(base64Data, filename));
      return { success: false, message: 'IPC bridge unavailable' };
    }
  }
};

export default api;