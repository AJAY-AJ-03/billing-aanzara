import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type {
  BillingItemRequestDto,
  BillingCalculationDto,
  ProductSearchDto,
  CreateBillRequestDto
} from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Barcode, Search, Plus, Trash2, CheckCircle } from 'lucide-react';

interface CartItem extends BillingItemRequestDto {
  tempId: string;
  productName: string;
  sku?: string;
  unitPrice: number;
  stockAvailable?: number;
}

export const CreateBillPage: React.FC = () => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchDto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manualDiscount, setManualDiscount] = useState<number | undefined>(undefined);
  const [calculation, setCalculation] = useState<BillingCalculationDto | null>(null);

  // Agent & Customer Form
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentOptions, setAgentOptions] = useState<string[]>([]);
  const agentPhoneMap = useRef<Map<string, string>>(new Map());

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail] = useState('');
  const [customerAddress] = useState('');
  const [customerGSTIN] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Other'>('Cash');
  const [manualTax, setManualTax] = useState<number | undefined>(undefined);

  // Custom Item state
  const [isCustomModal, setIsCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState(100);
  const [customGst, setCustomGst] = useState(5);
  const [customQty, setCustomQty] = useState(1);
  const [customUnit, setCustomUnit] = useState('Kg');
  const [customSku, setCustomSku] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (barcodeRef.current) {
      barcodeRef.current.focus();
    }

    // Initialize agent details matching Angular create-bill.component.ts
    const defaultName = user?.name || 'SAJIN CLARET';
    const defaultPhone = user?.phone || '';
    setAgentName(defaultName);
    setAgentPhone(defaultPhone);
    if (defaultName) agentPhoneMap.current.set(defaultName, defaultPhone);

    const isAdmin = user?.role === 'Admin';
    if (isAdmin) {
      api.users.getPaged({ pageNumber: 1, pageSize: 100 }).then(res => {
        if (res.success && res.data) {
          const names: string[] = [];
          res.data.items.forEach(u => {
            if (u.name) {
              names.push(u.name);
              agentPhoneMap.current.set(u.name, u.phone || '');
            }
          });
          const uniqueNames = Array.from(new Set([...names, defaultName]));
          setAgentOptions(uniqueNames);
          if (agentPhoneMap.current.has(defaultName) && !defaultPhone) {
            setAgentPhone(agentPhoneMap.current.get(defaultName) || '');
          }
        }
      });
    } else {
      setAgentOptions([defaultName, 'SAJIN CLARET'].filter((v, i, a) => v && a.indexOf(v) === i));
    }
  }, [user]);

  const handleAgentNameChange = (nameVal: string) => {
    setAgentName(nameVal);
    const ph = agentPhoneMap.current.get(nameVal.trim());
    if (ph !== undefined) {
      setAgentPhone(ph);
    }
  };

  useEffect(() => {
    if (cart.length > 0) {
      recalculateBill();
    } else {
      setCalculation(null);
    }
  }, [cart, manualDiscount, manualTax]);

  const recalculateBill = async () => {
    const requestItems: BillingItemRequestDto[] = cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      isCustom: item.isCustom,
      customProductName: item.customProductName,
      customUnitPrice: item.customUnitPrice,
      customGSTPercentage: item.customGSTPercentage,
      customSKU: item.customSKU,
      customUnit: item.customUnit,
      billingUnit: item.billingUnit,
      unitsPerBox: item.unitsPerBox,
      isWholesale: item.isWholesale
    }));

    const res = await api.billing.calculate(requestItems, manualDiscount, manualTax);
    if (res.success && res.data) {
      setCalculation(res.data);
    } else {
      showToast(res.message || 'Calculation error', 'error');
    }
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const res = await api.billing.scanBarcode(barcodeInput.trim());
    if (res.success && res.data) {
      addToCart(res.data);
      setBarcodeInput('');
      showToast(`Added ${res.data.productName}`, 'success');
    } else {
      showToast(res.message || 'Product barcode not found', 'error');
    }
  };

  const handleSearchChange = async (term: string) => {
    setSearchTerm(term);
    if (term.trim().length >= 2) {
      const res = await api.products.search(term.trim());
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    } else {
      setSearchResults([]);
    }
  };

  const addToCart = (product: ProductSearchDto) => {
    const tempId = `item_${Date.now()}_${Math.random()}`;
    const newItem: CartItem = {
      tempId,
      productId: product.id,
      productName: product.productName,
      sku: product.sku,
      quantity: 1,
      unitPrice: product.sellingPrice,
      isCustom: false,
      stockAvailable: product.stockQuantity,
      billingUnit: product.unit,
      unitsPerBox: 12,
      isWholesale: false
    };

    setCart(prev => {
      const existingIdx = prev.findIndex(i => !i.isCustom && i.productId === product.id && i.billingUnit === product.unit);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prev, newItem];
    });

    setSearchTerm('');
    setSearchResults([]);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      showToast('Custom item name required', 'warning');
      return;
    }
    if (customPrice <= 0) {
      showToast('Price must be positive', 'warning');
      return;
    }

    const tempId = `custom_${Date.now()}_${Math.random()}`;
    const newItem: CartItem = {
      tempId,
      productName: customName.trim(),
      quantity: customQty,
      unitPrice: customPrice,
      isCustom: true,
      customProductName: customName.trim(),
      customUnitPrice: customPrice,
      customGSTPercentage: customGst,
      customSKU: customSku.trim() || 'CUSTOM',
      customUnit: customUnit,
      billingUnit: customUnit
    };

    setCart(prev => [...prev, newItem]);
    setIsCustomModal(false);
    setCustomName('');
    setCustomPrice(100);
    setCustomGst(5);
    setCustomQty(1);
    setCustomUnit('Kg');
    setCustomSku('');
    showToast(`Added custom product "${newItem.productName}"`, 'success');
  };

  const updateQuantity = (tempId: string, qty: number) => {
    if (qty <= 0) return;
    setCart(prev => prev.map(item => item.tempId === tempId ? { ...item, quantity: qty } : item));
  };

  const removeFromCart = (tempId: string) => {
    setCart(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleCreateBill = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }

    setSubmitting(true);
    const requestPayload: CreateBillRequestDto = {
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerGSTIN: customerGSTIN.trim() || undefined,
      agentName: agentName.trim() || undefined,
      agentPhone: agentPhone.trim() || undefined,
      paymentMethod,
      manualDiscount,
      manualTaxPercentage: manualTax,
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        isCustom: item.isCustom,
        customProductName: item.customProductName,
        customUnitPrice: item.customUnitPrice,
        customGSTPercentage: item.customGSTPercentage,
        customSKU: item.customSKU,
        customUnit: item.customUnit,
        billingUnit: item.billingUnit,
        unitsPerBox: item.unitsPerBox,
        isWholesale: item.isWholesale
      }))
    };

    const res = await api.billing.create(requestPayload, user?.id || user?.userId || 1);
    setSubmitting(false);

    if (res.success && res.data) {
      showToast(`Bill created! Invoice #${res.data.invoiceNumber}`, 'success');
      navigate(`/billing/invoice/${res.data.saleId}`);
    } else {
      showToast(res.message || 'Failed to process bill', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Section: Scanner, Cart & Items */}
        <div>
          {/* Top Scanners & Search */}
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
              <form onSubmit={handleBarcodeSubmit}>
                <div style={{ position: 'relative' }}>
                  <Barcode size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                  <input
                    ref={barcodeRef}
                    type="text"
                    className="input-control"
                    style={{ paddingLeft: '42px' }}
                    placeholder="Scan Barcode (Press Enter)..."
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                  />
                </div>
              </form>

              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  className="input-control"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Search Product Name or SKU..."
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                />

                {searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--bg-card-border)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-subtle)',
                    zIndex: 50,
                    maxHeight: '240px',
                    overflowY: 'auto'
                  }}>
                    {searchResults.map(p => (
                      <div
                        key={p.id}
                        style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                        onClick={() => addToCart(p)}
                      >
                        <div style={{ fontWeight: 600 }}>{p.productName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          SKU: {p.sku} | Price: ₹{p.sellingPrice} | Stock: {p.stockQuantity} {p.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn btn-secondary" onClick={() => setIsCustomModal(true)}>
                <Plus size={16} />
                <span>Custom Item</span>
              </button>
            </div>
          </div>

          {/* Cart Table */}
          <div className="card">
            <div className="card-title">Bill Line Items ({cart.length})</div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Unit Price</th>
                    <th style={{ width: '130px' }}>Qty</th>
                    <th>Discount</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => {
                    const calcLine = calculation?.items.find(i => i.productName === item.productName || (item.productId && i.productId === item.productId));
                    return (
                      <tr key={item.tempId}>
                        <td>
                          <strong>{item.productName}</strong>
                          {item.sku && <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{item.sku}</div>}
                        </td>
                        <td>₹{item.unitPrice.toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            className="input-control"
                            style={{ padding: '6px', textAlign: 'center' }}
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={e => updateQuantity(item.tempId, Number(e.target.value))}
                          />
                        </td>
                        <td style={{ color: 'var(--accent-warning)' }}>
                          {calcLine && calcLine.discount > 0 ? `-₹${calcLine.discount.toFixed(2)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          ₹{calcLine ? calcLine.totalAmount.toFixed(2) : (item.unitPrice * item.quantity).toFixed(2)}
                        </td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => removeFromCart(item.tempId)}>
                            <Trash2 size={14} style={{ color: 'var(--accent-danger)' }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Scan barcode or search products above to build invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Section: Calculation Summary & Checkout */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '90px' }}>
            <div className="card-title">Billing Summary</div>

            {calculation ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                  <span>₹{calculation.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-warning)' }}>
                  <span>Applied Discounts:</span>
                  <span>-₹{calculation.discount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Taxable Amount:</span>
                  <span>₹{calculation.taxableAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>CGST:</span>
                  <span>₹{calculation.cgstAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>SGST:</span>
                  <span>₹{calculation.sgstAmount.toFixed(2)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '20px',
                  fontWeight: 800,
                  borderTop: '2px dashed var(--bg-card-border)',
                  paddingTop: '12px',
                  color: 'var(--accent-success)'
                }}>
                  <span>Grand Total:</span>
                  <span>₹{calculation.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '14px' }}>Add items to view total.</div>
            )}

            <div className="form-group">
              <label className="form-label">Manual Bill Discount (₹)</label>
              <input
                type="number"
                className="input-control"
                placeholder="Optional overall discount"
                value={manualDiscount ?? ''}
                onChange={e => setManualDiscount(e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Manual Tax % (applies to all items)</label>
              <input
                type="number"
                className="input-control"
                placeholder="e.g. 5 or 12"
                value={manualTax ?? ''}
                onChange={e => setManualTax(e.target.value !== '' ? Number(e.target.value) : undefined)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="select-control"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
              >
                <option value="Cash">Cash Payment</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Other">Other Mode</option>
              </select>
            </div>

            <div style={{ borderTop: '1px solid var(--bg-card-border)', paddingTop: '16px', marginTop: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>Agent Information</div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px' }}>Agent Name</label>
                {agentOptions.length > 0 ? (
                  <select
                    className="select-control"
                    value={agentName}
                    onChange={e => handleAgentNameChange(e.target.value)}
                  >
                    {agentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Agent Name"
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                  />
                )}
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px' }}>Agent Phone</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Agent Phone"
                  value={agentPhone}
                  onChange={e => setAgentPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--bg-card-border)', paddingTop: '16px', marginTop: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>Customer Details (Optional)</div>
              <div className="form-group">
                <input
                  type="text"
                  className="input-control"
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  className="input-control"
                  placeholder="Phone Number"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <button
              className="btn btn-success"
              style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '16px' }}
              disabled={submitting || cart.length === 0}
              onClick={handleCreateBill}
            >
              <CheckCircle size={20} />
              <span>{submitting ? 'Creating Invoice...' : 'Complete & Print Bill'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Item Modal */}
      {isCustomModal && (
        <div className="modal-backdrop" onClick={() => setIsCustomModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Custom Item</h3>
              <button onClick={() => setIsCustomModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px' }}>&times;</button>
            </div>
            <form onSubmit={handleAddCustomItem}>
              <div className="form-group">
                <label className="form-label">Custom Product Name</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. Fresh Fruits Pack"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input
                    type="number"
                    className="input-control"
                    value={customPrice}
                    onChange={e => setCustomPrice(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GST %</label>
                  <select className="select-control" value={customGst} onChange={e => setCustomGst(Number(e.target.value))}>
                    {[0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g}%</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    className="input-control"
                    value={customQty}
                    onChange={e => setCustomQty(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCustomModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateBillPage;
