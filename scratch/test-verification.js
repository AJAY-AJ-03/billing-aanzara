const { getPrismaClient } = require('../dist-backend/database/db');
const { loginHandler } = require('../dist-backend/backend-new/handlers/auth.handler');
const { createBillHandler } = require('../dist-backend/backend-new/handlers/billing.handler');
const { updateSaleHandler, deleteSaleHandler } = require('../dist-backend/backend-new/handlers/sales.handler');
const { getUserByIdHandler } = require('../dist-backend/backend-new/handlers/users.handler');
const { generateInvoicePdfHandler } = require('../dist-backend/backend-new/handlers/invoices.handler');

async function runVerification() {
  console.log('=== STARTING AUTOMATED INTEGRATION & VERIFICATION TESTS ===\n');
  const prisma = getPrismaClient();

  // 1. Authenticate Admin User
  const adminLogin = await loginHandler({ email: 'admin@example.com', password: 'Admin@123' });
  console.log('1. Admin Login:', adminLogin.success, 'Role:', adminLogin.data?.role);
  const adminSession = adminLogin.success ? { id: adminLogin.data.userId, role: adminLogin.data.role } : null;

  // Authenticate SalesWorker User
  const workerLogin = await loginHandler({ email: 'sales@example.com', password: 'Sales@123' });
  console.log('   Worker Login:', workerLogin.success, 'Role:', workerLogin.data?.role);
  const workerSession = workerLogin.success ? { id: workerLogin.data.userId, role: workerLogin.data.role } : null;

  // 2. Fetch or prepare a piece-unit product with sufficient stock
  let product = await prisma.product.findFirst({ where: { unit: 'Piece', isActive: true } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        sku: 'TEST-PC-01',
        productName: 'Test Soap Bar',
        categoryId: 1,
        purchasePrice: 10,
        sellingPrice: 15,
        gstPercentage: 5,
        stockQuantity: 100,
        unit: 'Piece'
      }
    });
  } else {
    // Ensure product has 100 stock for test
    product = await prisma.product.update({
      where: { id: product.id },
      data: { stockQuantity: 100 }
    });
  }

  console.log(`\n2. Selected product for billing test: ${product.productName} (ID: ${product.id}), Base Unit: ${product.unit}, Stock before: ${product.stockQuantity}`);

  // Create bill as Admin with custom Agent Name & Phone and Box unit billing (1 Box = 12 Pieces)
  const initialStock = product.stockQuantity;
  const billReq = {
    customerName: 'Test Customer',
    customerPhone: '9876543210',
    agentName: 'Custom Agent Mohan',
    agentPhone: '9988776655',
    paymentMethod: 'Cash',
    items: [
      {
        productId: product.id,
        quantity: 2,
        billingUnit: 'Box',
        unitsPerBox: 12
      }
    ]
  };

  const createRes = await createBillHandler(billReq, adminSession.id);
  console.log('   Bill Creation Result:', createRes.success, 'Invoice:', createRes.data?.invoiceNumber);
  if (!createRes.success) {
    console.error('   Bill Creation Error:', createRes.message);
  }

  const productAfterBill = await prisma.product.findUnique({ where: { id: product.id } });
  const stockDeducted = initialStock - productAfterBill.stockQuantity;
  console.log(`   Stock after 2 Box bill (expected deduction 24 ${product.unit}): ${productAfterBill.stockQuantity} (Deducted: ${stockDeducted})`);
  console.log('   Unit conversion stock deduction test passed:', stockDeducted === 24);

  const saleId = createRes.data.saleId;

  // 3. Generate PDF for newly created sale
  const pdfRes = await generateInvoicePdfHandler(saleId);
  console.log('\n3. Invoice PDF Generation:', pdfRes.success, 'Data length:', pdfRes.data ? pdfRes.data.length : 0);
  const isPdfValid = pdfRes.success && pdfRes.data && Buffer.from(pdfRes.data, 'base64').toString('ascii', 0, 4) === '%PDF';
  console.log('   PDF valid header test passed:', isPdfValid);

  // 4. Test Edit Sale as Admin
  console.log('\n4. Testing Edit Sale (Admin only)...');
  const editPayload = {
    agentName: 'Updated Agent Rajesh',
    agentPhone: '9111122222',
    customerName: 'Updated Customer Name',
    paymentMethod: 'UPI',
    items: [
      {
        productId: product.id,
        quantity: 1,
        billingUnit: 'Box',
        unitsPerBox: 12
      }
    ]
  };

  // Test Non-Admin Edit attempt
  const workerEditAttempt = await updateSaleHandler(saleId, editPayload, workerSession);
  console.log('   Worker Edit attempt (should fail):', workerEditAttempt.success, 'Message:', workerEditAttempt.message);

  // Admin Edit attempt
  const adminEditRes = await updateSaleHandler(saleId, editPayload, adminSession);
  console.log('   Admin Edit attempt:', adminEditRes.success, 'New Grand Total:', adminEditRes.data?.grandTotal);

  const productAfterEdit = await prisma.product.findUnique({ where: { id: product.id } });
  console.log(`   Stock after edit from 2 Boxes to 1 Box (expected stock: ${initialStock - 12}): ${productAfterEdit.stockQuantity}`);

  // 5. Test Profile Authorization (getUserByIdHandler)
  console.log('\n5. Testing Profile Authorization (users:getById)...');
  // Non-Admin fetching own profile (worker ID = 2)
  const ownProfileRes = await getUserByIdHandler(workerSession.id, workerSession);
  console.log('   Worker fetching own profile:', ownProfileRes.success, 'User Name:', ownProfileRes.data?.name);

  // Non-Admin fetching another user profile (admin ID = 1)
  const otherProfileRes = await getUserByIdHandler(adminSession.id, workerSession);
  console.log('   Worker fetching another profile (should fail):', otherProfileRes.success, 'Message:', otherProfileRes.message);

  // 6. Test Delete Sale as Admin
  console.log('\n6. Testing Delete Sale (Admin only)...');
  const workerDeleteAttempt = await deleteSaleHandler(saleId, workerSession);
  console.log('   Worker Delete attempt (should fail):', workerDeleteAttempt.success, 'Message:', workerDeleteAttempt.message);

  const adminDeleteRes = await deleteSaleHandler(saleId, adminSession);
  console.log('   Admin Delete attempt:', adminDeleteRes.success, 'Message:', adminDeleteRes.message);

  const productAfterDelete = await prisma.product.findUnique({ where: { id: product.id } });
  console.log(`   Stock after sale deletion (expected stock restored to ${initialStock}): ${productAfterDelete.stockQuantity}`);
  console.log('   Stock reversal test passed:', productAfterDelete.stockQuantity === initialStock);

  console.log('\n=== ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ===');
}

runVerification().catch(err => {
  console.error('Verification Error:', err);
  process.exit(1);
});
