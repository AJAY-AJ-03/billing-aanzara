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

  // Customer & Payment Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail] = useState('');
  const [customerAddress] = useState('');
  const [customerGSTIN] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Other'>('Cash');

  // Custom Item state
  const [isCustomModal, setIsCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState(100);
  const [customGst, setCustomGst] = useState(5);
  const [customQty, setCustomQty] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      recalculateBill();
    } else {
      setCalculation(null);
    }
  }, [cart, manualDiscount]);

  const recalculateBill = async () => {
    const requestItems: BillingItemRequestDto[] = cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      isCustom: item.isCustom,
      customProductName: item.customProductName,
      customUnitPrice: item.customUnitPrice,
      customGSTPercentage: item.customGSTPercentage,
      customSKU: item.customSKU,
      customUnit: item.customUnit
    }));

    const res = await api.billing.calculate(requestItems, manualDiscount);
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
    const existingIndex = cart.findIndex(c => c.productId === product.id && !c.isCustom);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          tempId: Math.random().toString(),
          productId: product.id,
          productName: product.productName,
          sku: product.sku,
          unitPrice: product.sellingPrice,
          quantity: 1,
          stockAvailable: product.stockQuantity,
          isCustom: false
        }
      ]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || customPrice <= 0) {
      showToast('Please enter valid custom product details', 'warning');
      return;
    }

    setCart([
      ...cart,
      {
        tempId: Math.random().toString(),
        isCustom: true,
        customProductName: customName.trim(),
        productName: `${customName.trim()} (Custom)`,
        unitPrice: customPrice,
        quantity: customQty,
        customUnitPrice: customPrice,
        customGSTPercentage: customGst,
        customUnit: 'Kg'
      }
    ]);

    setIsCustomModal(false);
    setCustomName('');
    setCustomPrice(100);
    showToast('Custom item added', 'info');
  };

  const updateQuantity = (tempId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(tempId);
      return;
    }
    setCart(cart.map(c => c.tempId === tempId ? { ...c, quantity: qty } : c));
  };

  const removeFromCart = (tempId: string) => {
    setCart(cart.filter(c => c.tempId !== tempId));
  };

  const handleCreateBill = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }

    setSubmitting(true);
    const request: CreateBillRequestDto = {
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerGSTIN,
      paymentMethod,
      manualDiscount,
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        isCustom: item.isCustom,
        customProductName: item.customProductName,
        customUnitPrice: item.customUnitPrice,
        customGSTPercentage: item.customGSTPercentage,
        customSKU: item.customSKU,
        customUnit: item.customUnit
      }))
    };

    const res = await api.billing.create(request, user?.userId || 1);
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
