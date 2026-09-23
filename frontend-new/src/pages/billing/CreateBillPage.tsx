// src/pages/billing/CreateBillPage.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type {
  BillingItemRequestDto,
  BillingCalculationDto,
  ProductSearchDto,
  CreateBillRequestDto,
} from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import {
  Barcode,
  Plus,
  Trash2,
  CheckCircle,
  Minus,
  ShoppingCart,
  Loader2,
  ChevronDown,
  Wallet,
  CornerDownLeft,
} from 'lucide-react';
import './BillingComponents.css';

interface CartItem extends BillingItemRequestDto {
  tempId: string;
  productName: string;
  sku?: string;
  unitPrice: number;
  stockAvailable?: number;
}

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Card', label: 'Card' },
  { value: 'Other', label: 'Other' },
] as const;

export const CreateBillPage: React.FC = () => {
  /* ---------- Cart & calculation ---------- */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manualDiscount, setManualDiscount] = useState<number | undefined>(undefined);
  const [manualTax, setManualTax] = useState<number | undefined>(undefined);
  const [calculation, setCalculation] = useState<BillingCalculationDto | null>(null);

  /* ---------- Draft row (inline cell search) ---------- */
  const [draftTerm, setDraftTerm] = useState('');
  const [draftResults, setDraftResults] = useState<ProductSearchDto[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftDropdownOpen, setDraftDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const draftWrapRef = useRef<HTMLDivElement>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);
  const searchDebounce = useRef<number | null>(null);

  /* ---------- Barcode ---------- */
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  /* ---------- Agent & Customer (top row) ---------- */
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentOptions, setAgentOptions] = useState<string[]>([]);
  const agentPhoneMap = useRef<Map<string, string>>(new Map());

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  /* ---------- Payment / Adjustments ---------- */
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Other'>('Cash');
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);

  /* ---------- Custom item modal ---------- */
  const [isCustomModal, setIsCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState(100);
  const [customGst, setCustomGst] = useState(5);
  const [customQty, setCustomQty] = useState(1);
  const [customUnit, setCustomUnit] = useState('Kg');
  const [customSku, setCustomSku] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  /* ---------- Init: agent defaults + focus draft ---------- */
  useEffect(() => {
    const defaultName = user?.name || 'SAJIN CLARET';
    const defaultPhone = user?.phone || '';
    setAgentName(defaultName);
    setAgentPhone(defaultPhone);
    if (defaultName) agentPhoneMap.current.set(defaultName, defaultPhone);

    const isAdmin = user?.role === 'Admin';
    if (isAdmin) {
      api.users.getPaged({ pageNumber: 1, pageSize: 100 }).then((res) => {
        if (res.success && res.data) {
          const names: string[] = [];
          res.data.items.forEach((u) => {
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
      setAgentOptions(
        [defaultName, 'SAJIN CLARET'].filter((v, i, a) => v && a.indexOf(v) === i),
      );
    }

    // Focus draft input on mount
    window.setTimeout(() => draftInputRef.current?.focus(), 0);
  }, [user]);

  /* ---------- Global shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT';
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeRef.current?.focus();
      }
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        draftInputRef.current?.focus();
      }
      if (e.key === 'Escape' && !isTyping) {
        setDraftDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- Close dropdown on outside click ---------- */
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (draftWrapRef.current && !draftWrapRef.current.contains(e.target as Node)) {
        setDraftDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  /* ---------- Recalculate on cart/discount/tax change ---------- */
  useEffect(() => {
    if (cart.length > 0) {
      recalculateBill();
    } else {
      setCalculation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, manualDiscount, manualTax]);

  const recalculateBill = async () => {
    const requestItems: BillingItemRequestDto[] = cart.map((item) => ({
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
      isWholesale: item.isWholesale,
    }));

    const res = await api.billing.calculate(requestItems, manualDiscount, manualTax);
    if (res.success && res.data) {
      setCalculation(res.data);
    } else {
      showToast(res.message || 'Calculation error', 'error');
    }
  };

  /* ---------- Barcode ---------- */
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const res = await api.billing.scanBarcode(barcodeInput.trim());
    if (res.success && res.data) {
      addProductToCart(res.data);
      setBarcodeInput('');
      showToast(`Added ${res.data.productName}`, 'success');
      barcodeRef.current?.focus();
    } else {
      showToast(res.message || 'Product barcode not found', 'error');
    }
  };

  /* ---------- Draft search ---------- */
  const runDraftSearch = useCallback((term: string) => {
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    searchDebounce.current = window.setTimeout(async () => {
      if (term.trim().length < 2) {
        setDraftResults([]);
        setDraftLoading(false);
        return;
      }
      setDraftLoading(true);
      const res = await api.products.search(term.trim());
      if (res.success && res.data) {
        setDraftResults(res.data);
        setHighlightedIdx(0);
      } else {
        setDraftResults([]);
      }
      setDraftLoading(false);
    }, 180);
  }, []);

  const handleDraftChange = (val: string) => {
    setDraftTerm(val);
    setDraftDropdownOpen(true);
    runDraftSearch(val);
  };

  const handleDraftKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!draftDropdownOpen || draftResults.length === 0) {
      if (e.key === 'Escape') setDraftTerm('');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, draftResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = draftResults[highlightedIdx];
      if (picked) {
        addProductToCart(picked);
        showToast(`Added ${picked.productName}`, 'success');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraftDropdownOpen(false);
      setDraftTerm('');
    }
  };

  /* ---------- Cart ops ---------- */
  const addProductToCart = (product: ProductSearchDto) => {
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
      isWholesale: false,
    };

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          !i.isCustom &&
          i.productId === product.id &&
          i.billingUnit === product.unit,
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prev, newItem];
    });

    // Reset draft → new empty row appears automatically
    setDraftTerm('');
    setDraftResults([]);
    setDraftDropdownOpen(false);
    setHighlightedIdx(0);
    window.setTimeout(() => draftInputRef.current?.focus(), 0);
  };

  const updateQuantity = (tempId: string, qty: number) => {
    if (qty <= 0) return;
    setCart((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, quantity: qty } : item)),
    );
  };

  const stepQuantity = (tempId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? { ...item, quantity: Math.max(0.01, Number((item.quantity + delta).toFixed(2))) }
          : item,
      ),
    );
  };

  const removeFromCart = (tempId: string) => {
    setCart((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setManualDiscount(undefined);
    setManualTax(undefined);
  };

  /* ---------- Custom item ---------- */
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
      billingUnit: customUnit,
    };

    setCart((prev) => [...prev, newItem]);
    setIsCustomModal(false);
    setCustomName('');
    setCustomPrice(100);
    setCustomGst(5);
    setCustomQty(1);
    setCustomUnit('Kg');
    setCustomSku('');
    showToast(`Added "${newItem.productName}"`, 'success');
    window.setTimeout(() => draftInputRef.current?.focus(), 0);
  };

  /* ---------- Complete bill ---------- */
  const handleCreateBill = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }

    setSubmitting(true);
    const requestPayload: CreateBillRequestDto = {
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: undefined,
      customerAddress: undefined,
      customerGSTIN: undefined,
      agentName: agentName.trim() || undefined,
      agentPhone: agentPhone.trim() || undefined,
      paymentMethod,
      manualDiscount,
      manualTaxPercentage: manualTax,
      items: cart.map((item) => ({
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
        isWholesale: item.isWholesale,
      })),
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

  const handleAgentNameChange = (nameVal: string) => {
    setAgentName(nameVal);
    const ph = agentPhoneMap.current.get(nameVal.trim());
    if (ph !== undefined) setAgentPhone(ph);
  };

  /* ---------- Derived ---------- */
  const cartCount = cart.length;
  const cartQty = useMemo(
    () => cart.reduce((s, i) => s + (i.quantity || 0), 0),
    [cart],
  );
  const grandTotal = calculation?.grandTotal ?? 0;

  return (
    <div>
      {/* ---------- Barcode + Custom Item ---------- */}
      <div className="pos-scanner is-barcode-only" style={{ marginBottom: 16 }}>
        <form onSubmit={handleBarcodeSubmit} className="pos-scanner-field is-barcode">
          <span className="pos-scanner-icon">
            <Barcode size={18} />
          </span>
          <input
            ref={barcodeRef}
            type="text"
            className="admin-input"
            placeholder="Scan barcode & press Enter  (F2)"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            autoComplete="off"
          />
        </form>

        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          style={{ height: '42px' }}
          onClick={() => setIsCustomModal(true)}
        >
          <Plus size={16} />
          <span>Custom Item</span>
        </button>
      </div>

      {/* ---------- Agent + Customer — single top row ---------- */}
      <div className="pos-meta-row">
        <div className="pos-meta-field">
          <label className="pos-meta-label">Agent Name</label>
          {agentOptions.length > 0 ? (
            <select
              className="admin-select"
              value={agentName}
              onChange={(e) => handleAgentNameChange(e.target.value)}
            >
              {agentOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="admin-input"
              placeholder="Agent Name"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
            />
          )}
        </div>

        <div className="pos-meta-field">
          <label className="pos-meta-label">Agent Phone</label>
          <input
            type="text"
            className="admin-input"
            placeholder="Agent Phone"
            value={agentPhone}
            onChange={(e) => setAgentPhone(e.target.value)}
          />
        </div>

        <div className="pos-meta-field">
          <label className="pos-meta-label">Customer Name</label>
          <input
            type="text"
            className="admin-input"
            placeholder="Optional"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="pos-meta-field">
          <label className="pos-meta-label">Customer Phone</label>
          <input
            type="text"
            className="admin-input"
            placeholder="Optional"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
      </div>

      {/* ---------- Two-column: cart + checkout ---------- */}
      <div className="pos-grid">
        {/* ===== Cart ===== */}
        <div className="pos-cart-card">
          <div className="pos-cart-header">
            <div className="pos-cart-title">
              <ShoppingCart size={16} />
              <span>Bill Line Items</span>
              <span className="pos-cart-count">{cartCount}</span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                className="pos-cart-clear"
                onClick={clearCart}
                title="Remove all items"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="pos-cart-body">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Unit Price</th>
                  <th style={{ width: 130 }}>Qty</th>
                  <th className="num">Discount</th>
                  <th className="num">Total</th>
                  <th className="num" style={{ width: 56 }}></th>
                </tr>
              </thead>
              <tbody>
                {/* Committed rows */}
                {cart.map((item) => {
                  const calcLine = calculation?.items.find(
                    (i) =>
                      i.productName === item.productName ||
                      (item.productId && i.productId === item.productId),
                  );
                  return (
                    <tr key={item.tempId}>
                      <td>
                        <div className="admin-cell-primary">{item.productName}</div>
                        {item.sku && (
                          <div className="admin-cell-secondary">
                            {item.sku}
                            {item.stockAvailable !== undefined && (
                              <> · stock {item.stockAvailable}</>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="num">₹{item.unitPrice.toFixed(2)}</td>
                      <td>
                        <div className="pos-qty-stepper">
                          <button
                            type="button"
                            className="pos-qty-btn"
                            onClick={() => stepQuantity(item.tempId, -1)}
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            className="pos-qty-input"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.tempId, Number(e.target.value))
                            }
                          />
                          <button
                            type="button"
                            className="pos-qty-btn"
                            onClick={() => stepQuantity(item.tempId, 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="num">
                        {calcLine && calcLine.discount > 0 ? (
                          <span className="pos-line-discount">
                            −₹{calcLine.discount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="pos-line-nodiscount">—</span>
                        )}
                      </td>
                      <td className="num">
                        <span className="pos-line-total">
                          ₹
                          {calcLine
                            ? calcLine.totalAmount.toFixed(2)
                            : (item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </td>
                      <td className="num">
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary admin-btn-icon"
                          onClick={() => removeFromCart(item.tempId)}
                          title="Remove item"
                        >
                          <Trash2 size={14} style={{ color: 'var(--admin-danger)' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Draft row — inline product cell search, exactly where the item name belongs */}
                <tr className="pos-draft-row">
                  <td>
                    <div className="pos-cell-input-wrap" ref={draftWrapRef}>
                      <input
                        ref={draftInputRef}
                        type="text"
                        className="pos-cell-input"
                        placeholder="Type product name or SKU…"
                        value={draftTerm}
                        onChange={(e) => handleDraftChange(e.target.value)}
                        onFocus={() => {
                          if (draftTerm.trim().length >= 2) setDraftDropdownOpen(true);
                        }}
                        onKeyDown={handleDraftKeyDown}
                        autoComplete="off"
                      />

                      {draftDropdownOpen && draftTerm.trim().length >= 2 && (
                        <div className="pos-cell-dropdown">
                          {draftLoading && (
                            <div className="pos-cell-dropdown-loading">Searching…</div>
                          )}
                          {!draftLoading && draftResults.length === 0 && (
                            <div className="pos-cell-dropdown-empty">
                              No products match "{draftTerm}"
                            </div>
                          )}
                          {!draftLoading &&
                            draftResults.map((p, idx) => (
                              <div
                                key={p.id}
                                className={`pos-cell-dropdown-item ${
                                  idx === highlightedIdx ? 'is-highlighted' : ''
                                }`}
                                onMouseEnter={() => setHighlightedIdx(idx)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  addProductToCart(p);
                                  showToast(`Added ${p.productName}`, 'success');
                                }}
                              >
                                <div>
                                  <div className="pos-cell-dropdown-name">
                                    {p.productName}
                                  </div>
                                  <div className="pos-cell-dropdown-meta">
                                    SKU: {p.sku} · Stock: {p.stockQuantity} {p.unit}
                                  </div>
                                </div>
                                <div className="pos-cell-dropdown-price">
                                  ₹{p.sellingPrice.toFixed(2)}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="num" style={{ color: 'var(--admin-text-faint)' }}>—</td>
                  <td style={{ color: 'var(--admin-text-faint)', fontSize: 12 }}>—</td>
                  <td className="num" style={{ color: 'var(--admin-text-faint)' }}>—</td>
                  <td className="num" style={{ color: 'var(--admin-text-faint)' }}>—</td>
                  <td className="num"></td>
                </tr>
              </tbody>
            </table>

            {cart.length === 0 && (
              <div className="pos-add-row-hint">
                <CornerDownLeft size={13} />
                <span>
                  Type a product name in the row above, or scan a barcode ·
                  ↑↓ navigate · Enter to add
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ===== Checkout panel ===== */}
        <div className="pos-checkout">
          {/* Summary */}
          <div className="pos-panel">
            <div className="pos-panel-title">
              <span>Billing Summary</span>
              {cartQty > 0 && (
                <span style={{ color: 'var(--admin-text-muted)', fontWeight: 500 }}>
                  {cartQty} {cartQty === 1 ? 'unit' : 'units'}
                </span>
              )}
            </div>

            {calculation ? (
              <>
                <div className="pos-sum-row">
                  <span className="pos-sum-label">Subtotal</span>
                  <span className="pos-sum-value">₹{calculation.subtotal.toFixed(2)}</span>
                </div>
                <div className="pos-sum-row is-discount">
                  <span className="pos-sum-label">Discounts</span>
                  <span className="pos-sum-value">−₹{calculation.discount.toFixed(2)}</span>
                </div>
                <div className="pos-sum-divider" />
                <div className="pos-sum-row">
                  <span className="pos-sum-label">Taxable amount</span>
                  <span className="pos-sum-value">₹{calculation.taxableAmount.toFixed(2)}</span>
                </div>
                <div className="pos-sum-row is-tax">
                  <span className="pos-sum-label">CGST</span>
                  <span className="pos-sum-value">₹{calculation.cgstAmount.toFixed(2)}</span>
                </div>
                <div className="pos-sum-row is-tax">
                  <span className="pos-sum-label">SGST</span>
                  <span className="pos-sum-value">₹{calculation.sgstAmount.toFixed(2)}</span>
                </div>
                <div className="pos-sum-divider is-dashed" />
                <div className="pos-grand-total">
                  <span className="pos-grand-label">Grand Total</span>
                  <span className="pos-grand-value">
                    ₹{calculation.grandTotal.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <div className="pos-empty-summary">
                Add items to see the bill summary.
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="pos-panel">
            <div className="pos-panel-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wallet size={14} />
                Payment Method
              </span>
            </div>
            <div className="pos-pay-pills">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`pos-pay-pill ${
                    paymentMethod === m.value ? 'is-active' : ''
                  }`}
                  onClick={() => setPaymentMethod(m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Adjustments (collapsible) */}
          <div className="pos-panel">
            <button
              type="button"
              className="pos-details-toggle"
              onClick={() => setAdjustmentsOpen((o) => !o)}
            >
              <span>Adjustments</span>
              <ChevronDown
                size={16}
                className={`pos-details-chevron ${adjustmentsOpen ? 'is-open' : ''}`}
              />
            </button>

            {adjustmentsOpen && (
              <div className="pos-details-body">
                <div className="admin-field">
                  <label className="admin-label">
                    Bill Discount (₹) <span className="optional">(optional)</span>
                  </label>
                  <div className="admin-money-wrap">
                    <span className="admin-currency">₹</span>
                    <input
                      type="number"
                      className="admin-input"
                      placeholder="0.00"
                      value={manualDiscount ?? ''}
                      onChange={(e) =>
                        setManualDiscount(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label className="admin-label">
                    Manual Tax % <span className="optional">(overrides items)</span>
                  </label>
                  <input
                    type="number"
                    className="admin-input"
                    placeholder="e.g. 5 or 12"
                    value={manualTax ?? ''}
                    onChange={(e) =>
                      setManualTax(e.target.value !== '' ? Number(e.target.value) : undefined)
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Complete button */}
          <button
            type="button"
            className="pos-complete-btn"
            disabled={submitting || cart.length === 0}
            onClick={handleCreateBill}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="admin-spin" />
                <span>Creating Invoice…</span>
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                <span>Complete &amp; Print Bill</span>
                {grandTotal > 0 && (
                  <span className="pos-complete-total">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ---------- Custom Item Modal ---------- */}
      <Modal
        isOpen={isCustomModal}
        title="Add Custom Item"
        onClose={() => setIsCustomModal(false)}
      >
        <form onSubmit={handleAddCustomItem}>
          <div className="admin-field">
            <label className="admin-label">Custom Product Name</label>
            <input
              type="text"
              className="admin-input"
              placeholder="e.g. Fresh Fruits Pack"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="admin-form-grid-3" style={{ marginTop: 16 }}>
            <div className="admin-field">
              <label className="admin-label">Price (₹)</label>
              <div className="admin-money-wrap">
                <span className="admin-currency">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="admin-input"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="admin-field">
              <label className="admin-label">GST %</label>
              <select
                className="admin-select"
                value={customGst}
                onChange={(e) => setCustomGst(Number(e.target.value))}
              >
                {[0, 5, 12, 18, 28].map((g) => (
                  <option key={g} value={g}>{g}%</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Quantity</label>
              <input
                type="number"
                min="0.01"
                step="any"
                className="admin-input"
                value={customQty}
                onChange={(e) => setCustomQty(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="admin-form-grid-2" style={{ marginTop: 16 }}>
            <div className="admin-field">
              <label className="admin-label">Unit</label>
              <select
                className="admin-select"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
              >
                {['Piece', 'Kg', 'Gram', 'Liter', 'ML', 'Box', 'Pack', 'Dozen'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">
                SKU <span className="optional">(optional)</span>
              </label>
              <input
                type="text"
                className="admin-input"
                placeholder="Custom reference"
                value={customSku}
                onChange={(e) => setCustomSku(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setIsCustomModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary">
              Add Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CreateBillPage;