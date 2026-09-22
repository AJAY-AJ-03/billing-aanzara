const http = require('http');

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const targets = JSON.parse(body);
          const page = targets.find(t => t.type === 'page');
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else {
            reject(new Error('Page target not found'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runElectronUiTests() {
  const wsUrl = await getWsUrl();
  console.log('Connecting to Electron CDP at:', wsUrl);

  const ws = new WebSocket(wsUrl);
  let id = 1;

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const messageId = id++;
      const msg = JSON.stringify({ id: messageId, method, params });
      
      const onMessage = evt => {
        const parsed = JSON.parse(evt.data);
        if (parsed.id === messageId) {
          ws.removeEventListener('message', onMessage);
          if (parsed.error) reject(parsed.error);
          else resolve(parsed.result);
        }
      };

      ws.addEventListener('message', onMessage);
      ws.send(msg);
    });
  }

  await new Promise(resolve => ws.addEventListener('open', resolve));
  console.log('Connected to Electron Renderer WebContents via CDP!');

  // Enable Runtime and DOM
  await send('Runtime.enable');
  await send('DOM.enable');

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || 'Evaluation exception');
    }
    return res.result.value;
  }

  console.log('\n--- 1. Testing Login as SalesWorker & DevTools window.api Security Test ---');
  // Log in as Sales Worker (sales@example.com / Sales@123)
  const loginWorkerResult = await evaluate(`(async () => {
    const res = await window.api.auth.login({ email: 'sales@example.com', password: 'Sales@123' });
    if (res.success && res.data) {
      localStorage.setItem('aanzara_user', JSON.stringify({
        userId: res.data.userId,
        id: res.data.userId,
        name: res.data.name,
        role: res.data.role,
        email: res.data.email
      }));
    }
    return res;
  })()`);
  console.log('SalesWorker IPC Login result:', loginWorkerResult.success, 'Role:', loginWorkerResult.data?.role);

  // Requirement 1 Test: Run window.api.users.getById(<admin id = 1>) from SalesWorker session in renderer DevTools console
  console.log('Executing window.api.users.getById(1) from SalesWorker session in DevTools console...');
  const unauthorizedGetByIdRes = await evaluate(`window.api.users.getById(1)`);
  console.log('Result of unauthorized getById(1):', unauthorizedGetByIdRes);
  console.log('Security check passed:', unauthorizedGetByIdRes.success === false && unauthorizedGetByIdRes.message.includes('Forbidden'));

  // Requirement 1 Test: Run window.api.users.getById(<own worker id = 2>)
  const ownGetByIdRes = await evaluate(`window.api.users.getById(2)`);
  console.log('Result of worker fetching own profile getById(2):', ownGetByIdRes.success, 'Name:', ownGetByIdRes.data?.name);

  console.log('\n--- 2. Testing Edit & Delete Sale in Real UI context ---');
  // Log in as Admin
  const loginAdminResult = await evaluate(`(async () => {
    const res = await window.api.auth.login({ email: 'admin@example.com', password: 'Admin@123' });
    if (res.success && res.data) {
      localStorage.setItem('aanzara_user', JSON.stringify({
        userId: res.data.userId,
        id: res.data.userId,
        name: res.data.name,
        role: res.data.role,
        email: res.data.email
      }));
    }
    return res;
  })()`);
  console.log('Admin IPC Login result:', loginAdminResult.success, 'Role:', loginAdminResult.data?.role);

  // Ensure Product 4 has stock
  await evaluate(`window.api.stock.stockIn({ productId: 4, quantity: 100, reference: 'UI Prep' })`);

  // Create a bill as Admin with chosen Agent
  const createBillRes = await evaluate(`window.api.billing.create({
    customerName: 'UI Verification Customer',
    customerPhone: '9888877777',
    agentName: 'UI Chosen Agent Vijay',
    agentPhone: '9444455555',
    paymentMethod: 'Cash',
    items: [{ productId: 4, quantity: 1, billingUnit: 'Box', unitsPerBox: 12 }]
  })`);
  console.log('Created test bill as Admin:', createBillRes.success, 'Invoice:', createBillRes.data?.invoiceNumber);
  if (!createBillRes.success) {
    console.error('Bill creation failed:', createBillRes.message);
    ws.close();
    return;
  }
  const saleId = createBillRes.data.saleId;

  // Edit Sale via Admin IPC / UI handler
  console.log('Updating sale via Admin IPC (changing agent & quantity)...');
  const editSaleRes = await evaluate(`window.api.sales.update(${saleId}, {
    agentName: 'Updated Agent Raman',
    agentPhone: '9111100000',
    customerName: 'UI Edited Customer Name',
    paymentMethod: 'UPI',
    items: [{ productId: 4, quantity: 2, billingUnit: 'Box', unitsPerBox: 12 }]
  })`);
  console.log('Edit Sale result:', editSaleRes.success, 'New Grand Total:', editSaleRes.data?.grandTotal, 'Agent:', editSaleRes.data?.agentName);

  // Check product stock after edit
  const productStock = await evaluate(`(async () => {
    const res = await window.api.products.getById(4);
    return res.data ? res.data.stockQuantity : null;
  })()`);
  console.log('Product 4 Stock after edit to 2 Boxes (24 units):', productStock);

  console.log('\n--- 3. Testing PDF Generation in UI ---');
  const pdfResult = await evaluate(`window.api.invoices.generatePdf(${saleId})`);
  console.log('PDF Generation result success:', pdfResult.success, 'PDF Base64 Length:', pdfResult.data ? pdfResult.data.length : 0);

  console.log('\n--- 4. Testing Delete Sale in Real UI context ---');
  const deleteSaleRes = await evaluate(`window.api.sales.delete(${saleId})`);
  console.log('Delete Sale result:', deleteSaleRes.success, 'Message:', deleteSaleRes.message);

  const productStockAfterDelete = await evaluate(`(async () => {
    const res = await window.api.products.getById(4);
    return res.data ? res.data.stockQuantity : null;
  })()`);
  console.log('Product 4 Stock after deleting sale (restored):', productStockAfterDelete);

  ws.close();
  console.log('\n=== REAL ELECTRON UI & DevTools CDP TEST COMPLETE ===');
}

runElectronUiTests().catch(err => {
  console.error('Electron UI Test Error:', err);
  process.exit(1);
});
