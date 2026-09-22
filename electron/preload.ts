import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (req: any) => ipcRenderer.invoke('auth:login', req),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  billing: {
    calculate: (items: any, manualDiscount?: number, manualTaxPercentage?: number) =>
      ipcRenderer.invoke('billing:calculate', items, manualDiscount, manualTaxPercentage),
    create: (req: any, salesWorkerId?: number) => ipcRenderer.invoke('billing:create', req, salesWorkerId),
    scanBarcode: (barcode: string) => ipcRenderer.invoke('billing:scanBarcode', barcode)
  },
  products: {
    getPaged: (req: any) => ipcRenderer.invoke('products:getPaged', req),
    getById: (id: number) => ipcRenderer.invoke('products:getById', id),
    create: (dto: any) => ipcRenderer.invoke('products:create', dto),
    update: (id: number, dto: any) => ipcRenderer.invoke('products:update', id, dto),
    toggle: (id: number) => ipcRenderer.invoke('products:toggle', id),
    search: (term: string) => ipcRenderer.invoke('products:search', term),
    export: () => ipcRenderer.invoke('products:export'),
    import: (base64Data: string) => ipcRenderer.invoke('products:import', base64Data)
  },
  categories: {
    getPaged: (req: any) => ipcRenderer.invoke('categories:getPaged', req),
    getAllActive: () => ipcRenderer.invoke('categories:getAllActive'),
    getById: (id: number) => ipcRenderer.invoke('categories:getById', id),
    create: (dto: any) => ipcRenderer.invoke('categories:create', dto),
    update: (id: number, dto: any) => ipcRenderer.invoke('categories:update', id, dto),
    toggle: (id: number) => ipcRenderer.invoke('categories:toggle', id)
  },
  stock: {
    getTransactions: (productId: number, req: any) => ipcRenderer.invoke('stock:getTransactions', productId, req),
    adjust: (dto: any, userId?: number) => ipcRenderer.invoke('stock:adjust', dto, userId),
    stockIn: (dto: any, userId?: number) => ipcRenderer.invoke('stock:stockIn', dto, userId),
    getLowStock: () => ipcRenderer.invoke('stock:getLowStock'),
    getOutOfStock: () => ipcRenderer.invoke('stock:getOutOfStock'),
    export: () => ipcRenderer.invoke('stock:export')
  },
  offers: {
    getPaged: (req: any) => ipcRenderer.invoke('offers:getPaged', req),
    getActive: () => ipcRenderer.invoke('offers:getActive'),
    getById: (id: number) => ipcRenderer.invoke('offers:getById', id),
    create: (dto: any) => ipcRenderer.invoke('offers:create', dto),
    update: (id: number, dto: any) => ipcRenderer.invoke('offers:update', id, dto),
    toggle: (id: number) => ipcRenderer.invoke('offers:toggle', id)
  },
  sales: {
    getPaged: (req: any) => ipcRenderer.invoke('sales:getPaged', req),
    getById: (id: number) => ipcRenderer.invoke('sales:getById', id),
    getByInvoice: (invNum: string) => ipcRenderer.invoke('sales:getByInvoice', invNum),
    update: (id: number, dto: any) => ipcRenderer.invoke('sales:update', id, dto),
    delete: (id: number) => ipcRenderer.invoke('sales:delete', id)
  },
  reports: {
    monthlySales: (year?: number) => ipcRenderer.invoke('reports:monthlySales', year),
    dailySales: (from?: string, to?: string) => ipcRenderer.invoke('reports:dailySales', from, to),
    productSales: (from?: string, to?: string) => ipcRenderer.invoke('reports:productSales', from, to),
    exportSales: (filter?: any) => ipcRenderer.invoke('reports:exportSales', filter),
    exportGst: (from?: string, to?: string) => ipcRenderer.invoke('reports:exportGst', from, to)
  },
  dashboard: {
    admin: () => ipcRenderer.invoke('dashboard:admin'),
    billing: (workerId?: number) => ipcRenderer.invoke('dashboard:billing', workerId)
  },
  users: {
    getPaged: (req: any) => ipcRenderer.invoke('users:getPaged', req),
    getById: (id: number) => ipcRenderer.invoke('users:getById', id),
    create: (dto: any) => ipcRenderer.invoke('users:create', dto),
    update: (id: number, dto: any) => ipcRenderer.invoke('users:update', id, dto),
    toggle: (id: number) => ipcRenderer.invoke('users:toggle', id)
  },
  invoices: {
    getById: (id: number) => ipcRenderer.invoke('invoices:getById', id),
    getByNumber: (invNum: string) => ipcRenderer.invoke('invoices:getByNumber', invNum),
    generatePdf: (id: number) => ipcRenderer.invoke('invoices:generatePdf', id)
  },
  app: {
    print: () => ipcRenderer.invoke('app:print'),
    savePdfDialog: (base64Data: string, filename?: string) => ipcRenderer.invoke('app:savePdfDialog', base64Data, filename)
  }
});
