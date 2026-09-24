const { calculateBillingHandler } = require('../dist-backend/backend-new/handlers/billing.handler');

(async () => {
  const item = { isCustom: true, customProductName: 'T', customUnitPrice: 10.1, customGSTPercentage: 5, quantity: 1 };
  const sum = (d, k) => Math.round(d.items.reduce((s, i) => s + i[k], 0) * 100) / 100;

  const a = (await calculateBillingHandler([item, item, item])).data;
  console.log('no discount :', { gst: a.gstAmount, linesGst: sum(a, 'gstAmount'), grand: a.grandTotal, linesTotal: sum(a, 'totalAmount'), cgst: a.cgstAmount, sgst: a.sgstAmount });

  const b = (await calculateBillingHandler([item, item, item], 1)).data;
  console.log('discount 1  :', { discount: b.discount, linesDiscount: sum(b, 'discount'), grand: b.grandTotal, linesTotal: sum(b, 'totalAmount') });
})();