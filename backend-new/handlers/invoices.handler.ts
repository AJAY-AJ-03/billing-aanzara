import getPrismaClient from '../../database/db';
import { ApiResponse, InvoiceDto } from '../../shared/types/ipc';

export async function getInvoiceByIdHandler(saleId: number): Promise<ApiResponse<InvoiceDto>> {
  try {
    const prisma = getPrismaClient();
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: { include: { product: true } },
        payments: true
      }
    });

    if (!sale) return { success: false, message: 'Invoice not found' };

    return { success: true, data: mapSaleToInvoiceDto(sale) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getInvoiceByNumberHandler(invoiceNumber: string): Promise<ApiResponse<InvoiceDto>> {
  try {
    const prisma = getPrismaClient();
    const sale = await prisma.sale.findUnique({
      where: { invoiceNumber },
      include: {
        saleItems: { include: { product: true } },
        payments: true
      }
    });

    if (!sale) return { success: false, message: 'Invoice not found' };

    return { success: true, data: mapSaleToInvoiceDto(sale) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function generateInvoicePdfHandler(saleId: number): Promise<ApiResponse<string>> {
  try {
    const res = await getInvoiceByIdHandler(saleId);
    if (!res.success || !res.data) {
      return { success: false, message: res.message || 'Invoice not found' };
    }

    const inv = res.data;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${inv.invoiceNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #ffffff; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
          .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 14px; }
          .info-block h4 { margin: 0 0 6px 0; color: #475569; font-size: 12px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #cbd5e1; }
          td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
          .totals { width: 280px; margin-left: auto; font-size: 14px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
          .totals-row.grand { font-size: 18px; font-weight: 700; border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">AANZARA BILLING</h1>
            <div class="subtitle">Tax Invoice</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; font-size: 16px;"># ${inv.invoiceNumber}</div>
            <div style="color: #64748b; font-size: 13px;">Date: ${new Date(inv.invoiceDate).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <h4>Billed To</h4>
            <div><strong>${inv.customerName || 'Walk-in Customer'}</strong></div>
            ${inv.customerPhone ? `<div>Phone: ${inv.customerPhone}</div>` : ''}
            ${inv.customerEmail ? `<div>Email: ${inv.customerEmail}</div>` : ''}
            ${inv.customerGSTIN ? `<div>GSTIN: ${inv.customerGSTIN}</div>` : ''}
          </div>
          <div class="info-block" style="text-align: right;">
            <h4>Payment Info</h4>
            <div>Method: <strong>${inv.paymentMethod}</strong></div>
            <div>Status: <strong>${inv.paymentStatus}</strong></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>GST</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `
              <tr>
                <td>${it.productName} ${it.sku ? `<small>(${it.sku})</small>` : ''}</td>
                <td>${it.quantity} ${it.unit}</td>
                <td>₹${it.unitPrice.toFixed(2)}</td>
                <td>${it.gstPercentage}%</td>
                <td style="text-align: right;">₹${it.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row"><span>Subtotal:</span><span>₹${inv.subtotal.toFixed(2)}</span></div>
          <div class="totals-row"><span>Discount:</span><span>-₹${inv.discount.toFixed(2)}</span></div>
          <div class="totals-row"><span>CGST:</span><span>₹${inv.cgst.toFixed(2)}</span></div>
          <div class="totals-row"><span>SGST:</span><span>₹${inv.sgst.toFixed(2)}</span></div>
          <div class="totals-row grand"><span>Grand Total:</span><span>₹${inv.grandTotal.toFixed(2)}</span></div>
        </div>
      </body>
      </html>
    `;

    return { success: true, data: html };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

function mapSaleToInvoiceDto(sale: any): InvoiceDto {
  return {
    invoiceNumber: sale.invoiceNumber,
    invoiceDate: sale.createdAt.toISOString(),
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    customerEmail: sale.customerEmail,
    customerAddress: sale.customerAddress,
    customerGSTIN: sale.customerGSTIN,
    subtotal: sale.subtotal,
    discount: sale.discount,
    taxableAmount: sale.subtotal - sale.discount,
    cgst: sale.cgstAmount,
    sgst: sale.sgstAmount,
    gstTotal: sale.gstAmount,
    grandTotal: sale.grandTotal,
    paymentMethod: sale.paymentMethod,
    paymentStatus: sale.paymentStatus,
    transactionId: sale.payments && sale.payments.length > 0 ? sale.payments[0].transactionId : null,
    items: sale.saleItems.map((i: any) => ({
      productName: i.productName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      gstPercentage: i.gstPercentage,
      gstAmount: i.gstAmount,
      total: i.totalAmount,
      unit: i.unit || (i.product ? i.product.unit : 'Piece'),
      isCustom: i.isCustom
    }))
  };
}
