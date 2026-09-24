import getPrismaClient from '../../database/db';
import ExcelJS from 'exceljs';
import {
  ApiResponse,
  MonthlySalesDto,
  DailySalesDto,
  ProductSalesDto,
  SalesReportFilterDto
} from '../../shared/types/ipc';

// Cancelled invoices are kept for the records but must not count in any report.
const NOT_CANCELLED = { saleStatus: { not: 'Cancelled' } };

export async function getMonthlySalesHandler(year: number = new Date().getFullYear()): Promise<ApiResponse<MonthlySalesDto[]>> {
  try {
    const prisma = getPrismaClient();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const sales = await prisma.sale.findMany({
      where: {
        ...NOT_CANCELLED,
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const result: MonthlySalesDto[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthSales = sales.filter(s => new Date(s.createdAt).getMonth() + 1 === m);
      const totalSales = monthSales.reduce((acc, s) => acc + s.grandTotal, 0);
      const gstCollected = monthSales.reduce((acc, s) => acc + s.gstAmount, 0);
      const discountGiven = monthSales.reduce((acc, s) => acc + s.discount, 0);
      const netSales = monthSales.reduce((acc, s) => acc + (s.subtotal - s.discount), 0);

      result.push({
        month: monthNames[m - 1],
        monthNumber: m,
        year,
        totalSales: Math.round(totalSales * 100) / 100,
        numberOfBills: monthSales.length,
        gstCollected: Math.round(gstCollected * 100) / 100,
        discountGiven: Math.round(discountGiven * 100) / 100,
        netSales: Math.round(netSales * 100) / 100
      });
    }

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getDailySalesHandler(fromStr: string, toStr: string): Promise<ApiResponse<DailySalesDto[]>> {
  try {
    const prisma = getPrismaClient();
    const from = new Date(fromStr);
    const to = new Date(toStr);

    const sales = await prisma.sale.findMany({
      where: {
        ...NOT_CANCELLED,
        createdAt: { gte: from, lte: to }
      },
      orderBy: { createdAt: 'asc' }
    });

    const grouped: { [dateKey: string]: { totalSales: number; billsCount: number } } = {};

    for (const s of sales) {
      const dateKey = new Date(s.createdAt).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { totalSales: 0, billsCount: 0 };
      }
      grouped[dateKey].totalSales += s.grandTotal;
      grouped[dateKey].billsCount += 1;
    }

    const result: DailySalesDto[] = Object.keys(grouped).map(dateKey => ({
      date: dateKey,
      totalSales: Math.round(grouped[dateKey].totalSales * 100) / 100,
      billsCount: grouped[dateKey].billsCount
    }));

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getProductSalesHandler(fromStr: string, toStr: string): Promise<ApiResponse<ProductSalesDto[]>> {
  try {
    const prisma = getPrismaClient();
    const from = new Date(fromStr);
    const to = new Date(toStr);

    const saleItems = await prisma.saleItem.findMany({
      where: {
        isCustom: false,
        productId: { not: null },
        sale: {
          ...NOT_CANCELLED,
          createdAt: { gte: from, lte: to }
        }
      }
    });

    const grouped: { [prodId: number]: { productName: string; quantitySold: number; totalRevenue: number } } = {};

    for (const item of saleItems) {
      const pid = item.productId!;
      if (!grouped[pid]) {
        grouped[pid] = { productName: item.productName, quantitySold: 0, totalRevenue: 0 };
      }
      grouped[pid].quantitySold += item.quantity;
      grouped[pid].totalRevenue += item.totalAmount;
    }

    const result: ProductSalesDto[] = Object.keys(grouped).map(pidStr => {
      const pid = Number(pidStr);
      return {
        productId: pid,
        productName: grouped[pid].productName,
        quantitySold: grouped[pid].quantitySold,
        totalRevenue: Math.round(grouped[pid].totalRevenue * 100) / 100
      };
    }).sort((a, b) => b.quantitySold - a.quantitySold);

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function exportSalesReportHandler(filter: SalesReportFilterDto): Promise<ApiResponse<string>> {
  try {
    const prisma = getPrismaClient();
    const where: any = { ...NOT_CANCELLED };

    if (filter.fromDate) where.createdAt = { ...where.createdAt, gte: new Date(filter.fromDate) };
    if (filter.toDate) where.createdAt = { ...where.createdAt, lte: new Date(filter.toDate) };
    if (filter.salesWorkerId) where.salesWorkerId = filter.salesWorkerId;
    if (filter.paymentMethod) where.paymentMethod = filter.paymentMethod;

    const sales = await prisma.sale.findMany({
      where,
      include: { salesWorker: true },
      orderBy: { createdAt: 'asc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales');

    worksheet.columns = [
      { header: 'InvoiceNumber', key: 'invoiceNumber', width: 20 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Worker', key: 'worker', width: 18 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Discount', key: 'discount', width: 15 },
      { header: 'GST', key: 'gst', width: 15 },
      { header: 'GrandTotal', key: 'grandTotal', width: 15 },
      { header: 'PaymentMethod', key: 'paymentMethod', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true };

    for (const s of sales) {
      worksheet.addRow({
        invoiceNumber: s.invoiceNumber,
        date: s.createdAt.toISOString().split('T')[0],
        customer: s.customerName || '',
        worker: s.salesWorker?.name || '',
        subtotal: s.subtotal,
        discount: s.discount,
        gst: s.gstAmount,
        grandTotal: s.grandTotal,
        paymentMethod: s.paymentMethod,
        status: s.paymentStatus
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { success: true, data: base64 };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function exportGstReportHandler(fromStr: string, toStr: string): Promise<ApiResponse<string>> {
  try {
    const prisma = getPrismaClient();
    const from = new Date(fromStr);
    const to = new Date(toStr);

    const sales = await prisma.sale.findMany({
      where: {
        ...NOT_CANCELLED,
        createdAt: { gte: from, lte: to }
      },
      orderBy: { createdAt: 'asc' }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GST');

    worksheet.columns = [
      { header: 'InvoiceNumber', key: 'invoiceNumber', width: 20 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'TaxableAmount', key: 'taxable', width: 15 },
      { header: 'CGST', key: 'cgst', width: 15 },
      { header: 'SGST', key: 'sgst', width: 15 },
      { header: 'GSTTotal', key: 'gstTotal', width: 15 },
      { header: 'GrandTotal', key: 'grandTotal', width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true };

    for (const s of sales) {
      worksheet.addRow({
        invoiceNumber: s.invoiceNumber,
        date: s.createdAt.toISOString().split('T')[0],
        taxable: s.subtotal - s.discount,
        cgst: s.cgstAmount,
        sgst: s.sgstAmount,
        gstTotal: s.gstAmount,
        grandTotal: s.grandTotal
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { success: true, data: base64 };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}