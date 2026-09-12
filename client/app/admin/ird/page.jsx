'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { money, today } from '../../../services/formatters';
import { api } from '../../../services/apiClient';

export default function AdminIrdPage() {
  const [monthStr, setMonthStr] = useState(today().slice(0, 7));
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'sales', 'purchases', 'creditNotes', 'debitNotes'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summaryData, setSummaryData] = useState({
    summary: {
      sales: { taxable: 0, vat: 0, gross: 0, count: 0 },
      creditNotes: { taxable: 0, vat: 0, gross: 0, count: 0 },
      purchases: { taxable: 0, exempt: 0, vat: 0, gross: 0, count: 0 },
      debitNotes: { taxable: 0, vat: 0, gross: 0, count: 0 },
      netSalesVat: 0,
      netPurchasesVat: 0,
      netVatPayable: 0
    },
    salesRegister: [],
    creditNotesRegister: [],
    purchaseRegister: [],
    debitNotesRegister: [],
    vatRate: 13
  });

  const [settings, setSettings] = useState({
    company: 'Ramroxa Pvt. Ltd.',
    address: 'Kathmandu, Nepal',
    pan: '606387590',
    vatRate: 13
  });

  const loadIrdData = useCallback(async (targetMonth) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/admin/ird/vat-summary?month=${targetMonth}`);
      if (res && res.data) {
        setSummaryData(res.data);
      } else if (res && res.summary) {
        setSummaryData(res);
      }
    } catch (err) {
      console.error('Failed to load IRD VAT summary:', err);
      setError('Failed to fetch IRD VAT data. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIrdData(monthStr);
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rmx_admin_settings') || localStorage.getItem('zylo_admin_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.company) {
            setSettings(prev => ({ ...prev, company: parsed.company, pan: parsed.pan || prev.pan }));
          }
        }
      } catch (e) {}
    }
  }, [monthStr, loadIrdData]);

  const sales = summaryData.salesRegister || [];
  const creditNotes = summaryData.creditNotesRegister || summaryData.returnsRegister || [];
  const purchases = summaryData.purchaseRegister || [];
  const debitNotes = summaryData.debitNotesRegister || [];
  const summary = summaryData.summary || {};

  const exportCsv = () => {
    const rows = [
      [`INLAND REVENUE DEPARTMENT (IRD) NEPAL - STATUTORY VAT RETURN`],
      [`Company: ${settings.company}`, `PAN: ${settings.pan}`, `Period: ${monthStr}`],
      [],
      [`--- SUMMARY OF VAT RETURN (Schedule 10) ---`],
      [`Category`, `Taxable Amount (NPR)`, `13% VAT Amount (NPR)`],
      [`Gross Sales`, summary.sales?.taxable || 0, summary.sales?.vat || 0],
      [`Less: Credit Notes (Returns)`, -(summary.creditNotes?.taxable || 0), -(summary.creditNotes?.vat || 0)],
      [`Net Sales Taxable & Output VAT`, (summary.sales?.taxable || 0) - (summary.creditNotes?.taxable || 0), summary.netSalesVat || 0],
      [`Gross Purchases`, summary.purchases?.taxable || 0, summary.purchases?.vat || 0],
      [`Less: Debit Notes (Returns)`, -(summary.debitNotes?.taxable || 0), -(summary.debitNotes?.vat || 0)],
      [`Net Purchases Taxable & Input VAT`, (summary.purchases?.taxable || 0) - (summary.debitNotes?.taxable || 0), summary.netPurchasesVat || 0],
      [`NET VAT PAYABLE TO IRD`, ``, summary.netVatPayable || 0],
      [],
      [`--- SCHEDULE 8: SALES REGISTER (Bikri Khata) ---`],
      [`S.N.`, `Date`, `Invoice No`, `Buyer Name`, `Buyer PAN`, `Total Amount`, `Exempt Amount`, `Taxable Amount`, `13% VAT`, `Export`]
    ];

    sales.forEach((s, idx) => {
      rows.push([
        idx + 1,
        s.date,
        s.invoice,
        `"${s.buyerName || 'Walk-in Customer'}"`,
        `"${s.buyerPan || ''}"`,
        s.totalAmount,
        s.exemptAmount || 0,
        s.taxableAmount,
        s.vatAmount,
        0
      ]);
    });

    rows.push(
      [],
      [`--- SCHEDULE 9: PURCHASE REGISTER (Kharid Khata) ---`],
      [`S.N.`, `Date`, `Bill No`, `Supplier Name`, `Supplier PAN`, `Total Amount`, `Exempt Amount`, `Taxable (Local)`, `Taxable (Import)`, `Capital Goods`, `13% Input VAT`]
    );

    purchases.forEach((p, idx) => {
      rows.push([
        idx + 1,
        p.date,
        p.billNo,
        `"${p.supplierName || 'Supplier'}"`,
        `"${p.supplierPan || ''}"`,
        p.totalAmount,
        p.exemptAmount || 0,
        p.taxableLocal || 0,
        0,
        0,
        p.vatAmount
      ]);
    });

    rows.push(
      [],
      [`--- SCHEDULE 10: CREDIT NOTES (Sales Returns) ---`],
      [`S.N.`, `Credit Note No`, `Date`, `Original Invoice`, `Buyer Name`, `Buyer PAN`, `Reason`, `Taxable`, `13% VAT`, `Total Amount`]
    );

    creditNotes.forEach((cn, idx) => {
      rows.push([
        idx + 1,
        cn.creditNoteNo,
        cn.date,
        cn.originalInvoice,
        `"${cn.buyerName || 'Customer'}"`,
        `"${cn.buyerPan || ''}"`,
        `"${cn.reason || ''}"`,
        cn.taxableAmount,
        cn.vatAmount,
        cn.totalAmount
      ]);
    });

    rows.push(
      [],
      [`--- SCHEDULE 11: DEBIT NOTES (Purchase Returns) ---`],
      [`S.N.`, `Debit Note No`, `Date`, `Original Bill No`, `Supplier Name`, `Supplier PAN`, `Reason`, `Taxable`, `13% VAT`, `Total Amount`]
    );

    debitNotes.forEach((dn, idx) => {
      rows.push([
        idx + 1,
        dn.debitNoteNo,
        dn.date,
        dn.originalBillNo,
        `"${dn.supplierName || 'Supplier'}"`,
        `"${dn.supplierPan || ''}"`,
        `"${dn.reason || ''}"`,
        dn.taxableAmount,
        dn.vatAmount,
        dn.totalAmount
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nepal-ird-vat-return-${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      <div className="page-head">
        <h2>Nepal IRD / VAT Return System</h2>
        <p>
          Statutory Schedule 8 (Sales Book), Schedule 9 (Purchase Book), Schedule 10 (Credit Notes), and Schedule 11 (Debit Notes) in full compliance with Nepal VAT Act 2052.
        </p>
      </div>

      {/* Toolbar */}
      <div className="toolbar no-print" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600 }}>Tax Period (AD):</label>
          <input
            type="month"
            value={monthStr}
            onChange={(e) => setMonthStr(e.target.value)}
            className="text-input"
          />
        </div>

        <button className="btn btn-sm" onClick={() => loadIrdData(monthStr)} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={`btn btn-sm ${activeTab === 'summary' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('summary')}>
            VAT Return Summary
          </button>
          <button className={`btn btn-sm ${activeTab === 'sales' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('sales')}>
            Schedule 8: Sales ({sales.length})
          </button>
          <button className={`btn btn-sm ${activeTab === 'purchases' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('purchases')}>
            Schedule 9: Purchases ({purchases.length})
          </button>
          <button className={`btn btn-sm ${activeTab === 'creditNotes' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('creditNotes')}>
            Schedule 10: Credit Notes ({creditNotes.length})
          </button>
          <button className={`btn btn-sm ${activeTab === 'debitNotes' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('debitNotes')}>
            Schedule 11: Debit Notes ({debitNotes.length})
          </button>
        </div>

        <button className="btn btn-sm btn-outline" onClick={exportCsv}>
          📥 Export IRD CSV
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => window.print()}>
          🖨️ Print / PDF
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Taxpayer Header Card */}
      <div className="card card-pad" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{settings.company}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted-foreground)' }}>
              {settings.address} &middot; <strong>PAN: {settings.pan}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>Tax Period: {monthStr}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Applicable Nepal VAT Rate: 13%</div>
          </div>
        </div>

        {/* TAB 1: VAT SUMMARY */}
        {activeTab === 'summary' && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Monthly VAT Return Reconciliation (Schedule 10)</h3>
            <table style={{ width: '100%', marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th>Transaction Description</th>
                  <th className="num">Taxable Amount (NPR)</th>
                  <th className="num">13% VAT (NPR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Gross Taxable Sales (Schedule 8)</td>
                  <td className="num">{money(summary.sales?.taxable || 0)}</td>
                  <td className="num">{money(summary.sales?.vat || 0)}</td>
                </tr>
                <tr>
                  <td style={{ color: (summary.creditNotes?.taxable || 0) > 0 ? 'var(--danger)' : 'inherit' }}>
                    <em>Less:</em> Sales Returns / Credit Notes (Schedule 10)
                  </td>
                  <td className="num" style={{ color: (summary.creditNotes?.taxable || 0) > 0 ? 'var(--danger)' : 'inherit' }}>
                    ({money(summary.creditNotes?.taxable || 0)})
                  </td>
                  <td className="num" style={{ color: (summary.creditNotes?.vat || 0) > 0 ? 'var(--danger)' : 'inherit' }}>
                    ({money(summary.creditNotes?.vat || 0)})
                  </td>
                </tr>
                <tr style={{ background: 'var(--muted)', fontWeight: 600 }}>
                  <td><strong>A. Net Sales &amp; Output VAT Liability</strong></td>
                  <td className="num"><strong>{money((summary.sales?.taxable || 0) - (summary.creditNotes?.taxable || 0))}</strong></td>
                  <td className="num"><strong>{money(summary.netSalesVat || 0)}</strong></td>
                </tr>
                <tr>
                  <td>Gross Taxable Purchases (Schedule 9)</td>
                  <td className="num">{money(summary.purchases?.taxable || 0)}</td>
                  <td className="num">{money(summary.purchases?.vat || 0)}</td>
                </tr>
                <tr>
                  <td style={{ color: (summary.debitNotes?.taxable || 0) > 0 ? 'var(--danger)' : 'inherit' }}>
                    <em>Less:</em> Purchase Returns / Debit Notes (Schedule 11)
                  </td>
                  <td className="num" style={{ color: (summary.debitNotes?.taxable || 0) > 0 ? 'var(--danger)' : 'inherit' }}>
                    ({money(summary.debitNotes?.taxable || 0)})
                  </td>
                  <td className="num" style={{ color: (summary.debitNotes?.vat || 0) > 0 ? 'var(--danger)' : 'inherit' }}>
                    ({money(summary.debitNotes?.vat || 0)})
                  </td>
                </tr>
                <tr style={{ background: 'var(--muted)', fontWeight: 600 }}>
                  <td><strong>B. Net Purchases &amp; Input VAT Credit Claimed</strong></td>
                  <td className="num"><strong>{money((summary.purchases?.taxable || 0) - (summary.debitNotes?.taxable || 0))}</strong></td>
                  <td className="num"><strong>{money(summary.netPurchasesVat || 0)}</strong></td>
                </tr>
              </tbody>
            </table>

            {/* Net VAT Payable Highlight Banner */}
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '10px',
                background: (summary.netVatPayable || 0) >= 0 ? '#1e293b' : '#059669',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                  {(summary.netVatPayable || 0) >= 0 ? 'NET VAT PAYABLE TO NEPAL IRD' : 'EXCESS INPUT VAT (CARRIED FORWARD)'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
                  Statutory Rule: Due for deposit by 25th of the following Nepali month
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>
                {money(Math.abs(summary.netVatPayable || 0))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULE 8 (SALES REGISTER) */}
        {activeTab === 'sales' && (
          <div className="table-wrap">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Schedule 8: Sales Register (बिक्री खाता)</h3>
            <table>
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Buyer Name</th>
                  <th>Buyer PAN</th>
                  <th className="num">Total (NPR)</th>
                  <th className="num">Taxable (NPR)</th>
                  <th className="num">13% VAT (NPR)</th>
                </tr>
              </thead>
              <tbody>
                {sales.length > 0 ? (
                  sales.map((s) => (
                    <tr key={s.sn}>
                      <td>{s.sn}</td>
                      <td>{s.date}</td>
                      <td><code>{s.invoice}</code></td>
                      <td>{s.buyerName}</td>
                      <td>{s.buyerPan || <span style={{ color: 'var(--muted-foreground)' }}>B2C Unregistered</span>}</td>
                      <td className="num">{money(s.totalAmount)}</td>
                      <td className="num">{money(s.taxableAmount)}</td>
                      <td className="num">{money(s.vatAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>No sales recorded in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: SCHEDULE 9 (PURCHASE REGISTER) */}
        {activeTab === 'purchases' && (
          <div className="table-wrap">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Schedule 9: Purchase Register (खरिद खाता)</h3>
            <table>
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Date</th>
                  <th>Bill No</th>
                  <th>Supplier Name</th>
                  <th>Supplier PAN</th>
                  <th className="num">Total (NPR)</th>
                  <th className="num">Taxable Local (NPR)</th>
                  <th className="num">13% Input VAT (NPR)</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length > 0 ? (
                  purchases.map((p) => (
                    <tr key={p.sn}>
                      <td>{p.sn}</td>
                      <td>{p.date}</td>
                      <td><code>{p.billNo}</code></td>
                      <td>{p.supplierName}</td>
                      <td>{p.supplierPan || '-'}</td>
                      <td className="num">{money(p.totalAmount)}</td>
                      <td className="num">{money(p.taxableLocal)}</td>
                      <td className="num">{money(p.vatAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>No purchase bills recorded in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: SCHEDULE 10 (CREDIT NOTES) */}
        {activeTab === 'creditNotes' && (
          <div className="table-wrap">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Schedule 10: Credit Note Register / Sales Returns (अनुसूची १०)</h3>
            <table>
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Credit Note No</th>
                  <th>Date</th>
                  <th>Original Invoice</th>
                  <th>Buyer Name</th>
                  <th>Reason</th>
                  <th className="num">Taxable Refund</th>
                  <th className="num">13% VAT Reversed</th>
                  <th className="num">Total Refund (NPR)</th>
                </tr>
              </thead>
              <tbody>
                {creditNotes.length > 0 ? (
                  creditNotes.map((cn) => (
                    <tr key={cn.sn}>
                      <td>{cn.sn}</td>
                      <td><code>{cn.creditNoteNo}</code></td>
                      <td>{cn.date}</td>
                      <td><code>{cn.originalInvoice}</code></td>
                      <td>{cn.buyerName}</td>
                      <td>{cn.reason}</td>
                      <td className="num">{money(cn.taxableAmount)}</td>
                      <td className="num">{money(cn.vatAmount)}</td>
                      <td className="num">{money(cn.totalAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '24px' }}>No credit notes issued in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: SCHEDULE 11 (DEBIT NOTES) */}
        {activeTab === 'debitNotes' && (
          <div className="table-wrap">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Schedule 11: Debit Note Register / Purchase Returns (अनुसूची ११)</h3>
            <table>
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Debit Note No</th>
                  <th>Date</th>
                  <th>Original Bill No</th>
                  <th>Supplier Name</th>
                  <th>Supplier PAN</th>
                  <th>Reason</th>
                  <th className="num">Taxable Amount</th>
                  <th className="num">13% Input VAT Reversed</th>
                  <th className="num">Total (NPR)</th>
                </tr>
              </thead>
              <tbody>
                {debitNotes.length > 0 ? (
                  debitNotes.map((dn) => (
                    <tr key={dn.sn}>
                      <td>{dn.sn}</td>
                      <td><code>{dn.debitNoteNo}</code></td>
                      <td>{dn.date}</td>
                      <td><code>{dn.originalBillNo}</code></td>
                      <td>{dn.supplierName}</td>
                      <td>{dn.supplierPan || '-'}</td>
                      <td>{dn.reason}</td>
                      <td className="num">{money(dn.taxableAmount)}</td>
                      <td className="num">{money(dn.vatAmount)}</td>
                      <td className="num">{money(dn.totalAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="10" style={{ textAlign: 'center', padding: '24px' }}>No debit notes recorded in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
