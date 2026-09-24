import getPrismaClient from '../../database/db';
import {
  ApiResponse,
  AdminDashboardDto,
  BillingDashboardDto
} from '../../shared/types/ipc';

// Cancelled invoices are kept for the records but must not count in any totals.
const NOT_CANCELLED = { saleStatus: { not: 'Cancelled' } };

export async function getAdminDashboardHandler(): Promise<ApiResponse<AdminDashboardDto>> {
  try {
    const prisma = getPrismaClient();

    const totalProducts = await prisma.product.count();

    const allProducts = await prisma.product.findMany();
    const totalStock = allProducts.reduce((acc, p) => acc + p.stockQuantity, 0);
    const lowStockCount = allProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minimumStockLevel).length;
    const outOfStockCount = allProducts.filter(p => p.stockQuantity <= 0).length;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todaySalesRecords = await prisma.sale.findMany({
      where: { ...NOT_CANCELLED, createdAt: { gte: startOfToday, lte: endOfToday } }
    });
    const todaySales = todaySalesRecords.reduce((acc, s) => acc + s.grandTotal, 0);
    const todayBills = todaySalesRecords.length;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSalesRecords = await prisma.sale.findMany({
      where: { ...NOT_CANCELLED, createdAt: { gte: startOfMonth } }
    });
    const thisMonthSales = monthSalesRecords.reduce((acc, s) => acc + s.grandTotal, 0);
    const thisMonthBills = monthSalesRecords.length;

    const totalBills = await prisma.sale.count({ where: NOT_CANCELLED });
    const allSales = await prisma.sale.findMany({ where: NOT_CANCELLED });
    const gstCollected = allSales.reduce((acc, s) => acc + s.gstAmount, 0);

    // Monthly breakdown for current year
    const year = now.getFullYear();
    const yearSales = await prisma.sale.findMany({
      where: {
        ...NOT_CANCELLED,
        createdAt: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59)
        }
      }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySales = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const mSales = yearSales.filter(s => new Date(s.createdAt).getMonth() + 1 === month);
      return {
        month: monthNames[i],
        monthNumber: month,
        total: Math.round(mSales.reduce((acc, s) => acc + s.grandTotal, 0) * 100) / 100,
        bills: mSales.length
      };
    });

    // Top products
    const saleItems = await prisma.saleItem.findMany({
      where: { isCustom: false, productId: { not: null }, sale: NOT_CANCELLED }
    });
    const topProdMap: { [pid: number]: { productName: string; quantitySold: number; revenue: number } } = {};
    for (const item of saleItems) {
      const pid = item.productId!;
      if (!topProdMap[pid]) {
        topProdMap[pid] = { productName: item.productName, quantitySold: 0, revenue: 0 };
      }
      topProdMap[pid].quantitySold += item.quantity;
      topProdMap[pid].revenue += item.totalAmount;
    }
    const topProducts = Object.keys(topProdMap)
      .map(pidStr => {
        const pid = Number(pidStr);
        return {
          productId: pid,
          productName: topProdMap[pid].productName,
          quantitySold: topProdMap[pid].quantitySold,
          revenue: Math.round(topProdMap[pid].revenue * 100) / 100
        };
      })
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    // Worker performance
    const salesWithWorkers = await prisma.sale.findMany({
      where: NOT_CANCELLED,
      include: { salesWorker: true }
    });
    const workerMap: { [uid: number]: { name: string; billsCount: number; totalSales: number } } = {};
    for (const s of salesWithWorkers) {
      const uid = s.salesWorkerId;
      if (!workerMap[uid]) {
        workerMap[uid] = { name: s.salesWorker?.name || 'Worker', billsCount: 0, totalSales: 0 };
      }
      workerMap[uid].billsCount += 1;
      workerMap[uid].totalSales += s.grandTotal;
    }
    const workerPerformance = Object.keys(workerMap)
      .map(uidStr => {
        const uid = Number(uidStr);
        return {
          userId: uid,
          name: workerMap[uid].name,
          billsCount: workerMap[uid].billsCount,
          totalSales: Math.round(workerMap[uid].totalSales * 100) / 100
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);

    // Low stock products
    const lowStockProducts = allProducts
      .filter(p => p.stockQuantity <= p.minimumStockLevel)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        productName: p.productName,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        minimumStockLevel: p.minimumStockLevel,
        unit: p.unit
      }));

    return {
      success: true,
      data: {
        totalProducts,
        totalStock,
        lowStockCount,
        outOfStockCount,
        todaySales: Math.round(todaySales * 100) / 100,
        todayBills,
        thisMonthSales: Math.round(thisMonthSales * 100) / 100,
        thisMonthBills,
        totalBills,
        gstCollected: Math.round(gstCollected * 100) / 100,
        monthlySales,
        topProducts,
        workerPerformance,
        lowStockProducts
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getBillingDashboardHandler(salesWorkerId: number): Promise<ApiResponse<BillingDashboardDto>> {
  try {
    const prisma = getPrismaClient();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todaySalesRecords = await prisma.sale.findMany({
      where: {
        ...NOT_CANCELLED,
        salesWorkerId,
        createdAt: { gte: startOfToday, lte: endOfToday }
      }
    });

    const todayBills = todaySalesRecords.length;
    const todaySales = todaySalesRecords.reduce((acc, s) => acc + s.grandTotal, 0);

    const recentSales = await prisma.sale.findMany({
      where: { ...NOT_CANCELLED, salesWorkerId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const recentBills = recentSales.map(s => ({
      invoiceNumber: s.invoiceNumber,
      createdAt: s.createdAt.toISOString(),
      grandTotal: s.grandTotal,
      paymentMethod: s.paymentMethod
    }));

    return {
      success: true,
      data: {
        todayBills,
        todaySales: Math.round(todaySales * 100) / 100,
        recentBills
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}