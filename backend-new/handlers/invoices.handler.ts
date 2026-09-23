import getPrismaClient from '../../database/db';
import { ApiResponse, InvoiceDto } from '../../shared/types/ipc';
import PDFDocument from 'pdfkit';
import { resolveAssetPath, assetExists } from '../utils/assetPath';

export async function getInvoiceByIdHandler(saleId: number): Promise<ApiResponse<InvoiceDto>> {
  try {
    const prisma = getPrismaClient();
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        salesWorker: true,
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
        salesWorker: true,
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

    // Calculate totals matching QuestPDF / InvoiceService.cs formulas
    const totalQty = inv.items.reduce((s, i) => s + i.quantity, 0);
    const totalMrp = inv.items.reduce((s, i) => s + i.unitPrice, 0);
    const totalOurMrp = inv.items.reduce((s, i) => {
      const q = i.quantity === 0 ? 1 : i.quantity;
      return s + (i.unitPrice * i.quantity - i.discount + i.gstAmount) / q;
    }, 0);
    const totalProfitVal = inv.items.reduce((s, i) => {
      const q = i.quantity === 0 ? 1 : i.quantity;
      const ourMrp = (i.unitPrice * i.quantity - i.discount + i.gstAmount) / q;
      return s + (i.unitPrice - ourMrp);
    }, 0);
    const avgDisc = inv.items.length
      ? Math.round(
          inv.items.reduce((s, i) => {
            const sub = i.unitPrice * i.quantity;
            return s + (sub > 0 ? (i.discount / sub) * 100 : 0);
          }, 0) / inv.items.length
        )
      : 0;
    const totalGstAmt = inv.items.reduce((s, i) => s + i.gstAmount, 0);

    const doc = new PDFDocument({ size: 'A4', margin: 18 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));
    });

    const left = 18;
    const width = 559.28;
    let y = 18;

    // Title Banner (with logo, matching the original Angular invoice layout)
    const bannerH = 34;
    doc.rect(left, y, width, bannerH).lineWidth(1.5).stroke('#000000');
    if (assetExists('Logo.jpeg')) {
      doc.image(resolveAssetPath('Logo.jpeg'), left + 4, y + 3, { width: bannerH - 6, height: bannerH - 6 });
    }
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('AANZARA FMCG - INVOICE', left, y + (bannerH - 11) / 2, { width, align: 'center' });
    y += bannerH + 4;

    // Customer & Agent Header Table (4 columns)
    const colW1 = 110, colW2 = 170, colW3 = 110, colW4 = 169.28;
    const rowH = 18;

    const drawHeaderRow = (yPos: number, c1Label: string, c1Val: string, c2Label: string, c2Val: string) => {
      // Cell 1 Label
      doc.rect(left, yPos, colW1, rowH).stroke('#000000');
      doc.font('Helvetica-Bold').fontSize(8).text(c1Label, left + 4, yPos + 5);
      // Cell 1 Value
      doc.rect(left + colW1, yPos, colW2, rowH).stroke('#000000');
      doc.font('Helvetica').fontSize(8).text(c1Val, left + colW1 + 4, yPos + 5, { width: colW2 - 8 });

      // Cell 2 Label
      doc.rect(left + colW1 + colW2, yPos, colW3, rowH).stroke('#000000');
      doc.font('Helvetica-Bold').fontSize(8).text(c2Label, left + colW1 + colW2 + 4, yPos + 5);
      // Cell 2 Value
      doc.rect(left + colW1 + colW2 + colW3, yPos, colW4, rowH).stroke('#000000');
      doc.font('Helvetica').fontSize(8).text(c2Val, left + colW1 + colW2 + colW3 + 4, yPos + 5, { width: colW4 - 8 });
    };

    drawHeaderRow(y, 'Customer Name:', inv.customerName || '—', 'Agent Name', inv.agentName || 'SAJIN CLARET');
    y += rowH;
    drawHeaderRow(y, 'Mobile Number :', inv.customerPhone || '—', 'Mobile Number', inv.agentPhone || '—');
    y += rowH;
    drawHeaderRow(y, 'Address :', inv.customerAddress || inv.businessAddress || '—', '', '');
    y += rowH;

    // Summary row inside grid
    doc.rect(left, y, colW1 + colW2, rowH).stroke('#000000');
    doc.font('Helvetica-Bold').fontSize(8).text('Product Count', left + 4, y + 5);
    doc.font('Helvetica').fontSize(8).text(`${totalQty}`, left + colW1 + 4, y + 5);

    doc.rect(left + colW1 + colW2, y, colW3, rowH).stroke('#000000');
    doc.font('Helvetica-Bold').fontSize(8).text('Total Price', left + colW1 + colW2 + 4, y + 5);
    doc.rect(left + colW1 + colW2 + colW3, y, colW4, rowH).stroke('#000000');
    doc.font('Helvetica-Bold').fontSize(8).text(`Rs.${inv.grandTotal.toFixed(1)}/-`, left + colW1 + colW2 + colW3 + 4, y + 5);
    y += rowH + 6;

    // Product Table Headers (7 columns)
    const pCols = [155, 45, 65, 65, 45, 90, 94.28];
    const headers = ['Product Name', 'Qty', 'MRP Price', 'Discount %', 'TAX', 'OUR MRP Price', 'Customer Profit'];

    let currX = left;
    doc.rect(left, y, width, 18).fillAndStroke('#e2e8f0', '#000000').fillColor('#000000');
    for (let i = 0; i < headers.length; i++) {
      doc.font('Helvetica-Bold').fontSize(7).text(headers[i], currX + 2, y + 5, { width: pCols[i] - 4, align: 'center' });
      currX += pCols[i];
    }
    y += 18;

    // Product Rows
    for (const item of inv.items) {
      const sub = item.unitPrice * item.quantity;
      const discPct = sub > 0 ? Math.round((item.discount / sub) * 100) : 0;
      const q = item.quantity === 0 ? 1 : item.quantity;
      const ourMrp = (sub - item.discount + item.gstAmount) / q;
      const profit = item.unitPrice - ourMrp;

      const rowVals = [
        item.productName,
        `${item.quantity}`,
        `${item.unitPrice}`,
        `${discPct}%`,
        `${item.gstPercentage}`,
        `${ourMrp.toFixed(1)}`,
        `${profit.toFixed(1)}`
      ];

      doc.rect(left, y, width, 18).stroke('#000000');
      currX = left;
      for (let i = 0; i < rowVals.length; i++) {
        doc.font('Helvetica').fontSize(7).text(rowVals[i], currX + 2, y + 5, { width: pCols[i] - 4, align: i === 0 ? 'left' : 'center' });
        currX += pCols[i];
      }
      y += 18;
    }

    // Total Row
    const totalRowVals = [
      'TOTAL',
      `${totalQty}`,
      `${totalMrp}`,
      `${avgDisc}%`,
      `${totalGstAmt.toFixed(0)}`,
      `${totalOurMrp.toFixed(1)}`,
      `${totalProfitVal.toFixed(1)}`
    ];
    doc.rect(left, y, width, 18).fillAndStroke('#e2e8f0', '#000000').fillColor('#000000');
    currX = left;
    for (let i = 0; i < totalRowVals.length; i++) {
      doc.font('Helvetica-Bold').fontSize(7).text(totalRowVals[i], currX + 2, y + 5, { width: pCols[i] - 4, align: i === 0 ? 'left' : 'center' });
      currX += pCols[i];
    }
    y += 22;

    // Customer Profit & Amount Paid Banners
    doc.rect(left, y, width, 18).stroke('#000000');
    doc.font('Helvetica').fontSize(8).fillColor('#000000').text(`Total profit of Customer : Rs. ${totalProfitVal.toFixed(1)} / -`, left + 6, y + 5);
    y += 18;

    doc.rect(left, y, width, 20).stroke('#000000');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000').text(`TOTAL AMOUNT PAID : Rs. ${inv.grandTotal.toFixed(1)} / -`, left + 6, y + 5);
    y += 24;

    // Business Footer Info
    doc.rect(left, y, width, 14).stroke('#000000');
    doc.font('Helvetica-Bold').fontSize(5).text('AANZARA CORPORATE @ ENSURE GROWTH SOLUTION PRIVATE LIMITED is an active Indian private limited company in the financial activities sector, incorporated on May 16, 2023 / CIN - U66190TN2023PTC160474', left, y + 4, { width, align: 'center' });
    y += 14;

    doc.rect(left, y, width, 14).stroke('#000000');
    doc.font('Helvetica').fontSize(5).text('Email : Egsfinance2025@gmail.com, Aanzaracorporate@gmail.com, aanzarabusiness@gmail.com / for compliance - +91 8754850826', left, y + 4, { width, align: 'center' });
    y += 14;

    doc.rect(left, y, width, 14).stroke('#000000');
    doc.font('Helvetica-Bold').fontSize(6).text('Managing Director : PRETHIVIRAJ, RAJAN JASMINE / MOBILE - +91 8754850826', left, y + 4, { width, align: 'center' });
    y += 18;

    // Terms & Conditions + QR Code Section
    const termsW = 419.28;
    const qrW = 140;

    doc.rect(left, y, termsW, 110).stroke('#000000');
    doc.font('Helvetica-Bold').fontSize(6).text('Terms & Conditions', left + 6, y + 6);
    const termsText = [
      '1. Subscription refund will not be provided under any circumstances.',
      '2. Stock order amount refund is applicable only if cancellation request is submitted before booking closes. Once booking is closed, no refund will be issued.',
      '3. Only stock order amount is refundable; subscription fee is non-refundable.',
      '4. If product is defective or unsatisfactory, replacement will be provided upon proof of product movement. No cash refund will be given.',
      '5. Advance notice (at least 60 days before expiry date) is mandatory for return/replacement of products. Post-expiry items will not be accepted.'
    ];

    let tY = y + 16;
    for (const term of termsText) {
      doc.font('Helvetica').fontSize(5.5).text(term, left + 6, tY, { width: termsW - 12 });
      tY += 16;
    }

    // QR Box
    doc.rect(left + termsW, y, qrW, 110).stroke('#000000');
    const qrBoxSize = 55;
    const qrBoxX = left + termsW + (qrW - qrBoxSize) / 2;
    const qrBoxY = y + 8;
    doc.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize).stroke('#000000');
    if (assetExists('qr.png')) {
      doc.image(resolveAssetPath('qr.png'), qrBoxX + 1, qrBoxY + 1, { width: qrBoxSize - 2, height: qrBoxSize - 2 });
    } else {
      doc.font('Helvetica-Bold').fontSize(8).text('QR', qrBoxX, qrBoxY + qrBoxSize / 2 - 4, { width: qrBoxSize, align: 'center' });
    }

    doc.font('Helvetica').fontSize(5).text('Scan to Verify', left + termsW, y + 66, { width: qrW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(6).text('AANZARA FMCG', left + termsW, y + 74, { width: qrW, align: 'center' });
    doc.font('Helvetica').fontSize(5).text(`Total: Rs.${inv.grandTotal.toFixed(1)}`, left + termsW, y + 83, { width: qrW, align: 'center' });
    doc.font('Helvetica').fontSize(5).text(inv.invoiceNumber, left + termsW, y + 92, { width: qrW, align: 'center' });

    y += 114;

    // Signature Block
    const sigW = width / 2;
    doc.rect(left, y, sigW, 40).stroke('#000000');
    doc.font('Helvetica-Bold').fontSize(7).text('Company Seal / Signature', left + 6, y + 26);

    doc.rect(left + sigW, y, sigW, 40).stroke('#000000');
    doc.font('Helvetica-Bold').fontSize(7).text('Customer Signature', left + sigW + 6, y + 26, { width: sigW - 12, align: 'right' });

    y += 44;
    doc.font('Helvetica').fontSize(6).text('1/1', left, y, { width, align: 'right' });

    doc.end();

    const pdfBuffer = await pdfBufferPromise;
    return { success: true, data: pdfBuffer.toString('base64') };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

function mapSaleToInvoiceDto(sale: any): InvoiceDto {
  return {
    invoiceNumber: sale.invoiceNumber,
    invoiceDate: sale.createdAt.toISOString(),
    agentName: sale.agentName || sale.salesWorker?.name || 'SAJIN CLARET',
    agentPhone: sale.agentPhone || sale.salesWorker?.phone || '',
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    customerEmail: sale.customerEmail,
    customerAddress: sale.customerAddress,
    customerGSTIN: sale.customerGSTIN,
    businessName: 'AANZARA FOOD AND FMCG',
    businessAddress: 'NO C,Vadakku valiyoor,opposite to sugam hospital valiyoor,tirunelveli-627117',
    businessPhone: '8754850826',
    businessEmail: 'Aanzaracorporate@gmail.com',
    businessGSTIN: '',
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
    items: (sale.saleItems || []).map((i: any) => ({
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