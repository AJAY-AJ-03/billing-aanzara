import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/ipcApi';
import type { InvoiceDto } from '../../../../shared/types/ipc';
import { useToast } from '../../context/ToastContext';
import { Printer, Download, ArrowLeft } from 'lucide-react';

export const InvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

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
    } else {
      showToast(res.message || 'Invoice not found', 'error');
    }
    setLoading(false);
  };

  const handlePrint = async () => {
    await api.app.print();
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    const res = await api.invoices.generatePdf(Number(id));
    if (res.success && res.data) {
      const blob = new Blob([res.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoice?.invoiceNumber || id}.html`;
      link.click();
      showToast('Invoice PDF export created', 'success');
    }
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading Invoice...</div>;
  if (!invoice) return <div style={{ padding: '40px', color: 'var(--accent-danger)' }}>Invoice record not found.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/billing/create')}>
          <ArrowLeft size={16} />
          <span>Back to POS</span>
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleDownloadPdf}>
            <Download size={16} />
            <span>Download Invoice</span>
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="card" style={{ background: '#ffffff', color: '#0f172a', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#0f172a' }}>AANZARA BILLING</h1>
            <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Tax Invoice</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>#{invoice.invoiceNumber}</div>
            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
              Date: {new Date(invoice.invoiceDate).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px', fontSize: '14px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Billed To</div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{invoice.customerName || 'Walk-in Customer'}</div>
            {invoice.customerPhone && <div style={{ color: '#475569' }}>Phone: {invoice.customerPhone}</div>}
            {invoice.customerEmail && <div style={{ color: '#475569' }}>Email: {invoice.customerEmail}</div>}
            {invoice.customerGSTIN && <div style={{ color: '#475569' }}>GSTIN: {invoice.customerGSTIN}</div>}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Payment Summary</div>
            <div>Payment Mode: <strong>{invoice.paymentMethod}</strong></div>
            <div>Payment Status: <strong style={{ color: '#059669' }}>{invoice.paymentStatus}</strong></div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left', fontSize: '13px', color: '#475569' }}>
              <th style={{ padding: '10px 12px' }}>Item Description</th>
              <th style={{ padding: '10px 12px' }}>Qty</th>
              <th style={{ padding: '10px 12px' }}>Unit Price</th>
              <th style={{ padding: '10px 12px' }}>GST %</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                <td style={{ padding: '12px' }}>
                  <strong>{it.productName}</strong>
                  {it.sku && <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px' }}>({it.sku})</span>}
                </td>
                <td style={{ padding: '12px' }}>{it.quantity} {it.unit}</td>
                <td style={{ padding: '12px' }}>₹{it.unitPrice.toFixed(2)}</td>
                <td style={{ padding: '12px' }}>{it.gstPercentage}%</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>₹{it.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Breakdown */}
        <div style={{ width: '300px', marginLeft: 'auto', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ color: '#64748b' }}>Subtotal:</span>
            <span>₹{invoice.subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#d97706' }}>
            <span>Discount:</span>
            <span>-₹{invoice.discount.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ color: '#64748b' }}>CGST:</span>
            <span>₹{invoice.cgst.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ color: '#64748b' }}>SGST:</span>
            <span>₹{invoice.sgst.toFixed(2)}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '12px',
            marginTop: '6px',
            borderTop: '2px solid #0f172a',
            fontSize: '20px',
            fontWeight: 800,
            color: '#0f172a'
          }}>
            <span>Grand Total:</span>
            <span>₹{invoice.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          Thank you for shopping with Aanzara! This is a computer-generated tax invoice.
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
