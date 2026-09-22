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
  BillResponseDto
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

export const api = {
  auth: {
    login: async (req: LoginRequestDto): Promise<ApiResponse<LoginResponseDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.auth.login(req);
      return { success: false, message: 'Electron context bridge not available' };
    }
  },
  billing: {
    calculate: async (items: BillingItemRequestDto[], manualDiscount?: number): Promise<ApiResponse<BillingCalculationDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.billing.calculate(items, manualDiscount);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    create: async (req: CreateBillRequestDto, salesWorkerId: number): Promise<ApiResponse<BillResponseDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.billing.create(req, salesWorkerId);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    scanBarcode: async (barcode: string): Promise<ApiResponse<ProductSearchDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.billing.scanBarcode(barcode);
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  products: {
    getPaged: async (req: PaginationRequest): Promise<ApiResponse<PaginatedResult<ProductDto>>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.products.getPaged(req);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getById: async (id: number): Promise<ApiResponse<ProductDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.products.getById(id);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    create: async (dto: CreateProductDto): Promise<ApiResponse<ProductDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.products.create(dto);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    update: async (id: number, dto: UpdateProductDto): Promise<ApiResponse<ProductDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.products.update(id, dto);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    toggle: async (id: number): Promise<ApiResponse<boolean>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.products.toggle(id);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    search: async (term: string): Promise<ApiResponse<ProductSearchDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.products.search(term);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    export: async (): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.products.export();
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  categories: {
    getPaged: async (req: PaginationRequest): Promise<ApiResponse<PaginatedResult<CategoryDto>>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.categories.getPaged(req);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getAllActive: async (): Promise<ApiResponse<CategoryDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.categories.getAllActive();
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getById: async (id: number): Promise<ApiResponse<CategoryDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.categories.getById(id);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    create: async (dto: CreateCategoryDto): Promise<ApiResponse<CategoryDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.categories.create(dto);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    update: async (id: number, dto: UpdateCategoryDto): Promise<ApiResponse<CategoryDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.categories.update(id, dto);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    toggle: async (id: number): Promise<ApiResponse<boolean>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.categories.toggle(id);
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  stock: {
    getTransactions: async (productId: number, req: PaginationRequest): Promise<ApiResponse<PaginatedResult<StockTransactionDto>>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.stock.getTransactions(productId, req);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    adjust: async (dto: StockAdjustmentDto, userId?: number): Promise<ApiResponse<StockTransactionDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.stock.adjust(dto, userId);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    stockIn: async (dto: StockInDto, userId?: number): Promise<ApiResponse<StockTransactionDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.stock.stockIn(dto, userId);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getLowStock: async (): Promise<ApiResponse<LowStockDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.stock.getLowStock();
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getOutOfStock: async (): Promise<ApiResponse<LowStockDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.stock.getOutOfStock();
      return { success: false, message: 'IPC bridge unavailable' };
    },
    export: async (): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.stock.export();
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  offers: {
    getPaged: async (req: PaginationRequest): Promise<ApiResponse<PaginatedResult<OfferDto>>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.offers.getPaged(req);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getActive: async (): Promise<ApiResponse<OfferDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.offers.getActive();
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getById: async (id: number): Promise<ApiResponse<OfferDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.offers.getById(id);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    create: async (dto: CreateOfferDto): Promise<ApiResponse<OfferDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.offers.create(dto);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    update: async (id: number, dto: UpdateOfferDto): Promise<ApiResponse<OfferDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.offers.update(id, dto);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    toggle: async (id: number): Promise<ApiResponse<boolean>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.offers.toggle(id);
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  sales: {
    getPaged: async (req: PaginationRequest): Promise<ApiResponse<PaginatedResult<SaleListItemDto>>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.sales.getPaged(req);
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  reports: {
    monthlySales: async (year?: number): Promise<ApiResponse<MonthlySalesDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.reports.monthlySales(year);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    dailySales: async (from: string, to: string): Promise<ApiResponse<DailySalesDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.reports.dailySales(from, to);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    productSales: async (from: string, to: string): Promise<ApiResponse<ProductSalesDto[]>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.reports.productSales(from, to);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    exportSales: async (filter: SalesReportFilterDto): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.reports.exportSales(filter);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    exportGst: async (from: string, to: string): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.reports.exportGst(from, to);
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  dashboard: {
    admin: async (): Promise<ApiResponse<AdminDashboardDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.dashboard.admin();
      return { success: false, message: 'IPC bridge unavailable' };
    },
    billing: async (workerId: number): Promise<ApiResponse<BillingDashboardDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.dashboard.billing(workerId);
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  users: {
    getPaged: async (req: PaginationRequest): Promise<ApiResponse<PaginatedResult<UserDto>>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.users.getPaged(req);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getById: async (id: number): Promise<ApiResponse<UserDto | null>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.users.getById(id);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    create: async (dto: CreateUserDto): Promise<ApiResponse<UserDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.users.create(dto);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    update: async (id: number, dto: UpdateUserDto): Promise<ApiResponse<UserDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.users.update(id, dto);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    toggle: async (id: number): Promise<ApiResponse<boolean>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.users.toggle(id);
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  invoices: {
    getById: async (id: number): Promise<ApiResponse<InvoiceDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.invoices.getById(id);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    getByNumber: async (invNum: string): Promise<ApiResponse<InvoiceDto>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.invoices.getByNumber(invNum);
      return { success: false, message: 'IPC bridge unavailable' };
    },
    generatePdf: async (id: number): Promise<ApiResponse<string>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.invoices.generatePdf(id);
      return { success: false, message: 'IPC bridge unavailable' };
    }
  },
  app: {
    print: async (): Promise<ApiResponse<void>> => {
      const electronApi = getApi();
      if (electronApi) return electronApi.app.print();
      window.print();
      return { success: true };
    }
  }
};

export default api;
