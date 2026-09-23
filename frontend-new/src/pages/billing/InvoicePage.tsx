import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type { InvoiceDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Printer, Download, ArrowLeft, Edit, Trash2, X, Check } from 'lucide-react';

export const InvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'Admin';

  // Edit State (Item 2)
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    agentName: '',
    agentPhone: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerGSTIN: '',
    paymentMethod: 'Cash',
    manualDiscount: null,
    manualTaxPercentage: null
  });
  const [editItems, setEditItems] = useState<any[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [upiUrl, setUpiUrl] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  useEffect(() => {
    if (id) {
      loadInvoice(Number(id));
    }
  }, [id]);

  const loadInvoice = async (saleId: number) => {
    setLoading(true);
    const res = await api.invoices.getById(saleId);
    if (res.success && res.data) {
      setInvoice(res.data);
      setEditForm({
        agentName: res.data.agentName || 'SAJIN CLARET',
        agentPhone: res.data.agentPhone || '',
        customerName: res.data.customerName || '',
        customerPhone: res.data.customerPhone || '',
        customerEmail: res.data.customerEmail || '',
        customerAddress: res.data.customerAddress || '',
        customerGSTIN: res.data.customerGSTIN || '',
        paymentMethod: res.data.paymentMethod || 'Cash',
        manualDiscount: null,
        manualTaxPercentage: null
      });
      setEditItems(
        res.data.items ? res.data.items.map((it: any) => ({ ...it, saleItemId: it.id })) : []
      );

      if (res.data.paymentMethod === 'UPI') {
        const qr = await api.payments.upiQr('merchant@upi', 'Aanzara FMCG', res.data.grandTotal);
        if (qr.success && qr.data) setUpiUrl(qr.data.upiUrl);
      } else {
        setUpiUrl('');
      }
    } else {
      showToast(res.message || 'Invoice not found', 'error');
    }
    setLoading(false);
  };

  const handleVerifyPayment = async () => {
    if (!invoice?.paymentId) {
      showToast('No payment record found for this invoice', 'error');
      return;
    }
    setVerifyingPayment(true);
    const res = await api.payments.verify({
      paymentId: invoice.paymentId,
      providerReference: `manual-${Date.now()}`,
      status: 'Success'
    });
    if (res.success) {
      showToast('Payment marked as paid', 'success');
      if (id) await loadInvoice(Number(id));
    } else {
      showToast(res.message || 'Failed to verify payment', 'error');
    }
    setVerifyingPayment(false);
  };

  const handlePrint = async () => {
    await api.app.print();
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    const res = await api.invoices.generatePdf(Number(id));
    if (res.success && res.data) {
      const defaultFilename = `Invoice_${invoice?.invoiceNumber || id}.pdf`;
      const saveRes = await api.app.savePdfDialog(res.data, defaultFilename);
      if (saveRes.success) {
        showToast('Invoice PDF saved to file', 'success');
      } else if (saveRes.message && !saveRes.message.includes('cancelled')) {
        showToast(saveRes.message, 'error');
      }
    } else {
      showToast(res.message || 'Failed to generate PDF', 'error');
    }
  };

  // Item 4 Helper formulas matching Angular invoice.component.ts
  const totalQty = () => {
    return invoice?.items?.reduce((s, it) => s + Number(it.quantity), 0) || 0;
  };

  const totalMrp = () => {
    return invoice?.items?.reduce((s, it) => s + Number(it.unitPrice), 0) || 0;
  };

  const discountPercent = (it: any) => {
    const sub = Number(it.unitPrice) * Number(it.quantity);
    return sub ? Math.round((Number(it.discount) / sub) * 100) : 0;
  };

  const ourMrp = (it: any) => {
    const sub = Number(it.unitPrice) * Number(it.quantity);
    const q = Number(it.quantity) || 1;
    const our = (sub - Number(it.discount) + Number(it.gstAmount || 0)) / q;
    return isFinite(our) ? our : Number(it.unitPrice);
  };

  const customerProfit = (it: any) => {
    return Number(it.unitPrice) - ourMrp(it);
  };

  const avgDiscount = () => {
    const items = invoice?.items || [];
    if (!items.length) return 0;
    const sum = items.reduce((s, it) => s + discountPercent(it), 0);
    return Math.round(sum / items.length);
  };

  const totalTax = () => {
    return invoice?.items?.reduce((s, it) => s + Number(it.gstAmount || 0), 0) || 0;
  };

  const totalOurMrp = () => {
    return invoice?.items?.reduce((s, it) => s + ourMrp(it), 0) || 0;
  };

  const totalProfit = () => {
    return invoice?.items?.reduce((s, it) => s + customerProfit(it), 0) || 0;
  };

  // Admin Edit Save
  const handleSaveEdit = async () => {
    if (!id) return;
    setSubmittingEdit(true);

    const payload = {
      agentName: editForm.agentName?.trim() || null,
      agentPhone: editForm.agentPhone?.trim() || null,
      customerName: editForm.customerName?.trim() || null,
      customerPhone: editForm.customerPhone?.trim() || null,
      customerEmail: editForm.customerEmail?.trim() || null,
      customerAddress: editForm.customerAddress?.trim() || null,
      customerGSTIN: editForm.customerGSTIN?.trim() || null,
      paymentMethod: editForm.paymentMethod,
      manualDiscount: editForm.manualDiscount !== null && editForm.manualDiscount !== '' ? Number(editForm.manualDiscount) : null,
      manualTaxPercentage: editForm.manualTaxPercentage !== null && editForm.manualTaxPercentage !== '' ? Number(editForm.manualTaxPercentage) : null,
      items: editItems.map((it: any) => ({
        saleItemId: it.saleItemId || it.id,
        productId: it.productId,
        isCustom: !!it.isCustom,
        customProductName: it.isCustom ? it.productName : null,
        customUnitPrice: it.isCustom ? it.unitPrice : null,
        customGSTPercentage: it.isCustom ? it.gstPercentage : null,
        customUnit: it.isCustom ? it.unit : null,
        billingUnit: it.unit,
        quantity: Number(it.quantity)
      }))
    };

    const res = await api.sales.update(Number(id), payload);
    setSubmittingEdit(false);

    if (res.success && res.data) {
      showToast('Invoice updated successfully', 'success');
      setShowEditModal(false);
      loadInvoice(Number(id));
    } else {
      showToast(res.message || 'Failed to update invoice', 'error');
    }
  };

  // Admin Delete Action
  const handleDeleteSale = async () => {
    if (!id) return;
    setSubmittingDelete(true);

    const res = await api.sales.delete(Number(id));
    setSubmittingDelete(false);

    if (res.success) {
      showToast('Invoice deleted and stock reversed', 'success');
      setShowDeleteModal(false);
      navigate('/admin/sales');
    } else {
      showToast(res.message || 'Failed to delete invoice', 'error');
    }
  };

  const updateEditItemQty = (idx: number, qty: number) => {
    const updated = [...editItems];
    updated[idx].quantity = qty;
    setEditItems(updated);
  };

  const removeEditItem = (idx: number) => {
    const updated = [...editItems];
    updated.splice(idx, 1);
    setEditItems(updated);
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading Invoice...</div>;
  if (!invoice) return <div style={{ padding: '40px', color: 'var(--accent-danger)' }}>Invoice record not found.</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/billing/create')}>
          <ArrowLeft size={16} />
          <span>Back to POS</span>
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <>
              <button className="btn btn-secondary" style={{ background: '#eab308', color: '#000', border: 'none' }} onClick={() => setShowEditModal(true)}>
                <Edit size={16} />
                <span>Edit Invoice</span>
              </button>
              <button className="btn btn-secondary" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </>
          )}

          <button className="btn btn-secondary" onClick={handleDownloadPdf}>
            <Download size={16} />
            <span>Download PDF</span>
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Container — A4 Styled Container */}
      <div className="card" style={{ background: '#ffffff', color: '#0f172a', padding: '30px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            {/* Header Title */}
            <tr>
              <td colSpan={7} style={{ border: '2px solid #000', padding: '8px', textAlign: 'center', fontWeight: 800, fontSize: '16px' }}>
                AANZARA FMCG - INVOICE
              </td>
            </tr>

            {/* Customer & Agent Info Row 1 */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700, width: '16%' }}>Customer Name:</td>
              <td colSpan={2} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{invoice.customerName || '—'}</td>
              <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700, width: '16%' }}>Agent Name</td>
              <td colSpan={3} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{invoice.agentName || 'SAJIN CLARET'}</td>
            </tr>

            {/* Mobile Number Row 2 */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700 }}>Mobile Number :</td>
              <td colSpan={2} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{invoice.customerPhone || '—'}</td>
              <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700 }}>Mobile Number</td>
              <td colSpan={3} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{invoice.agentPhone || '—'}</td>
            </tr>

            {/* Address & Summary Grid */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700 }} rowSpan={2}>Address :</td>
              <td colSpan={2} style={{ border: '1px solid #000', padding: '6px' }} rowSpan={2}>{invoice.customerAddress || invoice.businessAddress || '—'}</td>
              <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700 }}>Product Count</td>
              <td colSpan={3} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{totalQty()}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 700 }}>Total Price</td>
              <td colSpan={3} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 800 }}>Rs.{invoice.grandTotal.toFixed(1)}/-</td>
            </tr>

            {/* Product Table Headers */}
            <tr style={{ background: '#f1f5f9', fontWeight: 700, textAlign: 'center' }}>
              <td style={{ border: '1px solid #000', padding: '6px', width: '25%', textAlign: 'left' }}>Product Name</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>Qty</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>MRP Price</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>Discount %</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>TAX</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>OUR MRP Price</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>Customer Profit</td>
            </tr>

            {/* Product Item Rows */}
            {invoice.items.map((item, idx) => (
              <tr key={idx} style={{ textAlign: 'center' }}>
                <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>
                  {item.productName} {item.sku && <span style={{ color: '#64748b', fontSize: '11px' }}>({item.sku})</span>}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{item.unitPrice}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{discountPercent(item)}%</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{item.gstPercentage}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{ourMrp(item).toFixed(1)}</td>
                <td style={{ border: '1px solid #000', padding: '6px' }}>{customerProfit(item).toFixed(1)}</td>
              </tr>
            ))}

            {/* Total Row */}
            <tr style={{ background: '#f1f5f9', fontWeight: 700, textAlign: 'center' }}>
              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>TOTAL</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>{totalQty()}</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>{totalMrp()}</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>{avgDiscount()}%</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>{totalTax().toFixed(0)}</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>{totalOurMrp().toFixed(1)}</td>
              <td style={{ border: '1px solid #000', padding: '6px' }}>{totalProfit().toFixed(1)}</td>
            </tr>

            {/* Profit & Paid Summary Banners */}
            <tr>
              <td colSpan={7} style={{ border: '1px solid #000', padding: '6px', fontWeight: 700 }}>
                Total profit of Customer : Rs. {totalProfit().toFixed(1)} / -
              </td>
            </tr>
            <tr>
              <td colSpan={7} style={{ border: '1px solid #000', padding: '6px', fontWeight: 800, fontSize: '13px' }}>
                TOTAL AMOUNT PAID : Rs. {invoice.grandTotal.toFixed(1)} / -
              </td>
            </tr>

            {/* Company Registration & Compliance Lines */}
            <tr>
              <td colSpan={7} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px', fontWeight: 600 }}>
                AANZARA CORPORATE @ ENSURE GROWTH SOLUTION PRIVATE LIMITED is an active Indian private limited company in the financial activities sector, incorporated on May 16, 2023 / CIN - U66190TN2023PTC160474
              </td>
            </tr>
            <tr>
              <td colSpan={7} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px' }}>
                Email : Egsfinance2025@gmail.com, Aanzaracorporate@gmail.com, aanzarabusiness@gmail.com / for compliance - +91 8754850826
              </td>
            </tr>
            <tr>
              <td colSpan={7} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 700 }}>
                Managing Director : PRETHIVIRAJ, RAJAN JASMINE / MOBILE - +91 8754850826
              </td>
            </tr>

            {/* Terms & Conditions + QR Box */}
            <tr>
              <td colSpan={5} style={{ border: '1px solid #000', padding: '10px', verticalAlign: 'top', fontSize: '10px', lineHeight: '1.4' }}>
                <strong style={{ fontSize: '11px' }}>Terms & Conditions</strong><br />
                1. Subscription தொகை எந்த நிலையிலும் refund செய்யப்படாது.<br />
                2. Stock order-க்கு செலுத்திய தொகை மட்டும் booking close ஆகும் முன் cancellation request கொடுத்தால் refund செய்யப்படும். Booking once confirm ஆகி close செய்யப்பட்ட பிறகு, அந்த amount எந்த சூழலிலும் refund செய்யப்படாது.<br />
                3. Only stock order amount மட்டுமே refund செய்யப்படும், subscription amount-க்கு refund கிடையாது.<br />
                4. Product குறித்து dissatisfaction இருந்தாலோ அல்லது product movement ஆதாரம் இருந்தாலோ, அந்த product-ஐ return எடுத்து replacement வழங்கப்படும்.<br />
                5. Product expiry ஆகும் முன் முன்கூட்டியே தகவல் வழங்குவது கட்டாயம். (குறைந்தது 60 நாட்களுக்கு முன்).
              </td>
              <td colSpan={2} style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', verticalAlign: 'middle' }}>
                <div style={{ border: '1px solid #000', width: '70px', height: '70px', margin: '0 auto 6px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                  QR
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700 }}>AANZARA FMCG</div>
                <div style={{ fontSize: '10px' }}>Total: Rs.{invoice.grandTotal.toFixed(1)}</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>{invoice.invoiceNumber}</div>
                {upiUrl && (
                  <div style={{ fontSize: '8px', color: '#64748b', wordBreak: 'break-all', marginTop: '4px' }}>
                    UPI: {upiUrl}
                  </div>
                )}
                {isAdmin && invoice.paymentMethod === 'UPI' && invoice.paymentStatus === 'Pending' && (
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: '8px', fontSize: '11px', padding: '4px 8px' }}
                    disabled={verifyingPayment}
                    onClick={handleVerifyPayment}
                  >
                    {verifyingPayment ? 'Verifying…' : 'Mark as Paid'}
                  </button>
                )}
              </td>
            </tr>

            {/* Signature Blocks */}
            <tr>
              <td colSpan={4} style={{ border: '1px solid #000', padding: '16px 8px 6px 8px', fontWeight: 700, verticalAlign: 'bottom' }}>
                Company Seal / Signature
              </td>
              <td colSpan={3} style={{ border: '1px solid #000', padding: '16px 8px 6px 8px', fontWeight: 700, textAlign: 'right', verticalAlign: 'bottom' }}>
                Customer Signature
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>1/1</div>
      </div>

      {/* Admin Edit Modal (Item 2) */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Invoice — #{invoice.invoiceNumber}</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Agent Name</label>
                  <input className="input-control" value={editForm.agentName} onChange={e => setEditForm({ ...editForm, agentName: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Agent Phone</label>
                  <input className="input-control" value={editForm.agentPhone} onChange={e => setEditForm({ ...editForm, agentPhone: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Customer Name</label>
                  <input className="input-control" value={editForm.customerName} onChange={e => setEditForm({ ...editForm, customerName: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Customer Phone</label>
                  <input className="input-control" value={editForm.customerPhone} onChange={e => setEditForm({ ...editForm, customerPhone: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Payment Method</label>
                  <select className="select-control" value={editForm.paymentMethod} onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value })}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Manual Discount (₹)</label>
                  <input type="number" className="input-control" placeholder="Discount override" value={editForm.manualDiscount ?? ''} onChange={e => setEditForm({ ...editForm, manualDiscount: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Manual Tax %</label>
                  <input type="number" className="input-control" placeholder="e.g. 5" value={editForm.manualTaxPercentage ?? ''} onChange={e => setEditForm({ ...editForm, manualTaxPercentage: e.target.value })} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--bg-card-border)', paddingTop: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Line Items</div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: '90px' }}>Qty</th>
                        <th>Unit</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.productName}</td>
                          <td>
                            <input
                              type="number"
                              className="input-control"
                              style={{ padding: '4px' }}
                              value={it.quantity}
                              onChange={e => updateEditItemQty(idx, Number(e.target.value))}
                            />
                          </td>
                          <td>{it.unit}</td>
                          <td>
                            <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => removeEditItem(idx)}>
                              <Trash2 size={14} style={{ color: 'var(--accent-danger)' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={submittingEdit} onClick={handleSaveEdit}>
                  <Check size={16} />
                  <span>{submittingEdit ? 'Saving...' : 'Save & Refresh Invoice'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete Modal (Item 2) */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--accent-danger)' }}>Delete Invoice?</h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                Are you sure you want to delete invoice <strong>#{invoice.invoiceNumber}</strong>?
                Stock will be automatically reversed for all non-custom products. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} disabled={submittingDelete} onClick={handleDeleteSale}>
                  <span>{submittingDelete ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePage;
