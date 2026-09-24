import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

import { getPrismaClient, ensureSchemaUpToDate  } from '../database/db';
import { seedDatabase } from '../database/seed';

import { calculateBillingHandler, createBillHandler, scanBarcodeHandler } from '../backend-new/handlers/billing.handler';
import {
  getPagedProductsHandler,
  getProductByIdHandler,
  createProductHandler,
  updateProductHandler,
  toggleProductActiveHandler,
  searchProductsHandler,
  exportProductsHandler,
  importProductsHandler
} from '../backend-new/handlers/products.handler';
import {
  getPagedCategoriesHandler,
  getAllActiveCategoriesHandler,
  getCategoryByIdHandler,
  createCategoryHandler,
  updateCategoryHandler,
  toggleCategoryActiveHandler
} from '../backend-new/handlers/categories.handler';
import {
  getStockTransactionsHandler,
  stockAdjustHandler,
  stockInHandler,
  getLowStockProductsHandler,
  getOutOfStockProductsHandler,
  exportStockHandler
} from '../backend-new/handlers/stock.handler';
import {
  getPagedOffersHandler,
  getActiveOffersHandler,
  getOfferByIdHandler,
  createOfferHandler,
  updateOfferHandler,
  toggleOfferActiveHandler
} from '../backend-new/handlers/offers.handler';
import {
  getPagedSalesHandler,
  getSaleByIdHandler,
  getSaleByInvoiceHandler,
  updateSaleHandler,
  cancelSaleHandler
} from '../backend-new/handlers/sales.handler';
import {
  getMonthlySalesHandler,
  getDailySalesHandler,
  getProductSalesHandler,
  exportSalesReportHandler,
  exportGstReportHandler
} from '../backend-new/handlers/reports.handler';
import { getAdminDashboardHandler, getBillingDashboardHandler } from '../backend-new/handlers/dashboard.handler';
import {
  getPagedUsersHandler,
  getUserByIdHandler,
  createUserHandler,
  updateUserHandler,
  toggleUserActiveHandler
} from '../backend-new/handlers/users.handler';
import {
  getInvoiceByIdHandler,
  getInvoiceByNumberHandler,
  generateInvoicePdfHandler
} from '../backend-new/handlers/invoices.handler';
import {
  createPaymentHandler,
  verifyPaymentHandler,
  generateUpiUrlHandler
} from '../backend-new/handlers/payments.handler';
import { loginHandler, restoreSessionHandler } from '../backend-new/handlers/auth.handler';  // CHANGED (added restoreSessionHandler)

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Aanzara Billing Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const devUrl = 'http://localhost:5173';
  const prodIndex = path.join(__dirname, '../../frontend-new/dist/index.html');

  if (process.env.NODE_ENV === 'development' || !fs.existsSync(prodIndex)) {
    mainWindow.loadURL(devUrl).catch(() => {
      if (fs.existsSync(prodIndex)) {
        mainWindow?.loadFile(prodIndex).catch(() => {});
      }
    });
  } else {
    mainWindow.loadFile(prodIndex);
  }

  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log(`[RENDERER CONSOLE]: ${message}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[ELECTRON MAIN]: Window finished loading page successfully.');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

let currentSession: { id: number; name: string; email: string; role: string } | null = null;

function registerIpcHandlers() {
  // Auth
  ipcMain.handle('auth:login', async (_, request) => {
    console.log('[IPC MAIN]: Received auth:login IPC request for email:', request?.email);
    const res = await loginHandler(request);
    if (res.success && res.data) {
      currentSession = {
        id: res.data.userId,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role
      };
      console.log('[IPC MAIN]: Auth session created in main process for user:', currentSession);
    }
    return res;
  });

  // ADDED — called once by the renderer at startup if it has a cached user in localStorage
  ipcMain.handle('auth:restoreSession', async (_, userId: number) => {
    console.log('[IPC MAIN]: Received auth:restoreSession IPC request for userId:', userId);
    const res = await restoreSessionHandler(userId);
    if (res.success && res.data) {
      currentSession = {
        id: res.data.userId,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role
      };
      console.log('[IPC MAIN]: Session restored in main process for user:', currentSession);
    } else {
      currentSession = null;
      console.log('[IPC MAIN]: Session restore failed:', res.message);
    }
    return res;
  });

  ipcMain.handle('auth:logout', async () => {
    console.log('[IPC MAIN]: Received auth:logout IPC request. Clearing session.');
    currentSession = null;
    return { success: true, message: 'Logged out successfully' };
  });

  // Billing
  ipcMain.handle('billing:calculate', async (_, items, manualDiscount, manualTaxPercentage) =>
    calculateBillingHandler(items, manualDiscount, manualTaxPercentage)
  );
  ipcMain.handle('billing:create', async (_, request, salesWorkerId) => {
    const workerId = salesWorkerId || currentSession?.id || 1;
    return createBillHandler(request, workerId);
  });
  ipcMain.handle('billing:scanBarcode', async (_, barcode) => scanBarcodeHandler(barcode));

  // Products
  ipcMain.handle('products:getPaged', async (_, req) => getPagedProductsHandler(req));
  ipcMain.handle('products:getById', async (_, id) => getProductByIdHandler(id));
  ipcMain.handle('products:create', async (_, dto) => createProductHandler(dto));
  ipcMain.handle('products:update', async (_, id, dto) => updateProductHandler(id, dto));
  ipcMain.handle('products:toggle', async (_, id) => toggleProductActiveHandler(id));
  ipcMain.handle('products:search', async (_, term) => searchProductsHandler(term));
  ipcMain.handle('products:export', async (_) => exportProductsHandler());
  ipcMain.handle('products:import', async (_, base64Data) => importProductsHandler(base64Data));

  // Categories
  ipcMain.handle('categories:getPaged', async (_, req) => getPagedCategoriesHandler(req));
  ipcMain.handle('categories:getAllActive', async (_) => getAllActiveCategoriesHandler());
  ipcMain.handle('categories:getById', async (_, id) => getCategoryByIdHandler(id));
  ipcMain.handle('categories:create', async (_, dto) => createCategoryHandler(dto));
  ipcMain.handle('categories:update', async (_, id, dto) => updateCategoryHandler(id, dto));
  ipcMain.handle('categories:toggle', async (_, id) => toggleCategoryActiveHandler(id));

  // Stock
  ipcMain.handle('stock:getTransactions', async (_, productId, req) => getStockTransactionsHandler(productId, req));
  ipcMain.handle('stock:adjust', async (_, dto, userId) => stockAdjustHandler(dto, userId || currentSession?.id));
  ipcMain.handle('stock:stockIn', async (_, dto, userId) => stockInHandler(dto, userId || currentSession?.id));
  ipcMain.handle('stock:getLowStock', async (_) => getLowStockProductsHandler());
  ipcMain.handle('stock:getOutOfStock', async (_) => getOutOfStockProductsHandler());
  ipcMain.handle('stock:export', async (_) => exportStockHandler());

  // Offers
  ipcMain.handle('offers:getPaged', async (_, req) => getPagedOffersHandler(req));
  ipcMain.handle('offers:getActive', async (_) => getActiveOffersHandler());
  ipcMain.handle('offers:getById', async (_, id) => getOfferByIdHandler(id));
  ipcMain.handle('offers:create', async (_, dto) => createOfferHandler(dto));
  ipcMain.handle('offers:update', async (_, id, dto) => updateOfferHandler(id, dto));
  ipcMain.handle('offers:toggle', async (_, id) => toggleOfferActiveHandler(id));

  // Sales
  ipcMain.handle('sales:getPaged', async (_, req) => getPagedSalesHandler(req));
  ipcMain.handle('sales:getById', async (_, id) => getSaleByIdHandler(id));
  ipcMain.handle('sales:getByInvoice', async (_, invNum) => getSaleByInvoiceHandler(invNum));
  ipcMain.handle('sales:update', async (_, id, dto) => updateSaleHandler(id, dto, currentSession));
    ipcMain.handle('sales:delete', async (_, id) => cancelSaleHandler(id, currentSession));
  // Reports
  ipcMain.handle('reports:monthlySales', async (_, year) => getMonthlySalesHandler(year));
  ipcMain.handle('reports:dailySales', async (_, from, to) => getDailySalesHandler(from, to));
  ipcMain.handle('reports:productSales', async (_, from, to) => getProductSalesHandler(from, to));
  ipcMain.handle('reports:exportSales', async (_, filter) => exportSalesReportHandler(filter));
  ipcMain.handle('reports:exportGst', async (_, from, to) => exportGstReportHandler(from, to));

  // Dashboard
  ipcMain.handle('dashboard:admin', async (_) => getAdminDashboardHandler());
  ipcMain.handle('dashboard:billing', async (_, workerId) => getBillingDashboardHandler(workerId || currentSession?.id || 1));

  // Payments
  ipcMain.handle('payments:create', async (_, dto) => {
    if (!currentSession) return { success: false, message: 'Unauthenticated: please log in' };
    return createPaymentHandler(dto);
  });
  ipcMain.handle('payments:verify', async (_, dto) => {
    if (!currentSession) return { success: false, message: 'Unauthenticated: please log in' };
    return verifyPaymentHandler(dto);
  });
  ipcMain.handle('payments:upiQr', async (_, upiId, merchantName, amount) => {
    if (!currentSession) return { success: false, message: 'Unauthenticated: please log in' };
    return generateUpiUrlHandler(upiId, merchantName, amount);
  });

  // Users
  ipcMain.handle('users:getPaged', async (_, req) => getPagedUsersHandler(req));
  ipcMain.handle('users:getById', async (_, id) => getUserByIdHandler(id, currentSession));
  ipcMain.handle('users:create', async (_, dto) => createUserHandler(dto));
  ipcMain.handle('users:update', async (_, id, dto) => updateUserHandler(id, dto));
  ipcMain.handle('users:toggle', async (_, id) => toggleUserActiveHandler(id));

  // Invoices & Printing
  ipcMain.handle('invoices:getById', async (_, id) => getInvoiceByIdHandler(id));
  ipcMain.handle('invoices:getByNumber', async (_, invNum) => getInvoiceByNumberHandler(invNum));
  ipcMain.handle('invoices:generatePdf', async (_, id) => generateInvoicePdfHandler(id));

  ipcMain.handle('app:print', async () => {
    if (!mainWindow) return { success: false, message: 'No window available' };
    mainWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
      console.log('Print result:', success, failureReason);
    });
    return { success: true };
  });

  ipcMain.handle('app:savePdfDialog', async (_, base64Data: string, defaultFilename: string) => {
    if (!mainWindow) return { success: false, message: 'No window available' };

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Invoice PDF',
      defaultPath: defaultFilename || `Invoice_${Date.now()}.pdf`,
      filters: [
        { name: 'PDF Documents', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, message: 'Save cancelled by user' };
    }

    try {
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
      return { success: true, message: `PDF saved successfully to ${filePath}`, data: filePath };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to save PDF to file' };
    }
  });
}

app.whenReady().then(async () => {
  try {
    getPrismaClient();
    await ensureSchemaUpToDate();
    await seedDatabase();
  } catch (err) {
    console.error('Database setup error:', err);
  }

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});