'use client';
import React, { useState } from 'react';
import {
  normalizeOrderForReceipt,
  printThermalReceipt,
  downloadReceiptPdf
} from '../../services/ramroxaReceiptService';
import Icon from './Icons';

export default function RamroxaReceiptModal({ order, isOpen, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !order) return null;

  const receipt = normalizeOrderForReceipt(order);
  const receiptContainerId = 'admin-thermal-receipt-preview';

  const handlePrint = () => {
    printThermalReceipt(order);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadReceiptPdf(order, receiptContainerId);
    } catch (e) {
      console.error('Download PDF error:', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="modal-backdrop show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          color: '#000000',
          borderRadius: 12,
          maxWidth: 460,
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}
      >
        {/* Modal Top Bar with Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🧾</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: '#111827' }}>
              RECEIPT / TAX INVOICE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="icon-btn"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#374151',
                cursor: 'pointer'
              }}
              title="Print Receipt"
            >
              <Icon name="printer" size={15} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={handleDownloadPdf}
              disabled={downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#374151',
                cursor: downloading ? 'wait' : 'pointer'
              }}
              title="Download PDF"
            >
              <Icon name="download" size={15} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#6b7280',
                cursor: 'pointer'
              }}
              aria-label="Close"
              title="Close"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div
          style={{
            padding: '20px 16px',
            overflowY: 'auto',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {/* Thermal Paper Simulation matching Ramroxa Global Reference */}
          <div
            id={receiptContainerId}
            style={{
              background: '#ffffff',
              color: '#000000',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '13px',
              lineHeight: 1.35,
              width: '100%',
              maxWidth: 380,
              padding: '12px 14px 20px 14px',
              border: '1px solid #f3f4f6',
              boxSizing: 'border-box'
            }}
          >
            {/* Brand Header */}
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div
                style={{
                  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                  fontSize: '26px',
                  fontWeight: 900,
                  letterSpacing: '6px',
                  lineHeight: 1.1,
                  marginBottom: 2
                }}
              >
                {receipt.store.brandTitle}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: "'Segoe UI', system-ui, sans-serif",
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '4px',
                  marginBottom: 6
                }}
              >
                <span style={{ display: 'inline-block', width: 34, height: 1.5, background: '#000' }} />
                <span>{receipt.store.brandSub}</span>
                <span style={{ display: 'inline-block', width: 34, height: 1.5, background: '#000' }} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 3 }}>
                {receipt.store.categories}
              </div>
              <div style={{ fontSize: '12px', marginBottom: 1 }}>{receipt.store.address}</div>
              <div style={{ fontSize: '12px', marginBottom: 1 }}>PAN No: {receipt.store.panNo}</div>
              <div style={{ fontSize: '12px', marginBottom: 6 }}>Contact No. {receipt.store.contactNo}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>
                {receipt.store.invoiceTitle}
              </div>
            </div>

            {/* Dashed separator */}
            <div style={{ borderTop: '1px dashed #000', margin: '7px 0' }} />

            {/* Bill / Customer Info Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', lineHeight: 1.35 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '1px 0', width: '55%', verticalAlign: 'top' }}>
                    Bill No.&nbsp;&nbsp;: {receipt.billNo}
                  </td>
                  <td style={{ padding: '1px 0', width: '45%', verticalAlign: 'top' }}>
                    Payment By : {receipt.paymentMethod}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '1px 0', verticalAlign: 'top' }}>
                    Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {receipt.date}
                  </td>
                  <td style={{ padding: '1px 0', verticalAlign: 'top' }}>
                    Miti&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {receipt.miti}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ padding: '1px 0', verticalAlign: 'top' }}>
                    Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {receipt.customerName}
                  </td>
                </tr>
                {receipt.customerCompany ? (
                  <tr>
                    <td colSpan={2} style={{ padding: '1px 0', verticalAlign: 'top' }}>
                      Company&nbsp;&nbsp;: {receipt.customerCompany}
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td colSpan={2} style={{ padding: '1px 0', verticalAlign: 'top' }}>
                    Address&nbsp;&nbsp;: {receipt.customerAddress}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ padding: '1px 0', verticalAlign: 'top' }}>
                    PAN&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {receipt.customerPan || ''}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Dashed separator */}
            <div style={{ borderTop: '1px dashed #000', margin: '7px 0' }} />

            {/* Particulars Table Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 'bold', padding: '2px 0' }}>
              <div style={{ width: 26 }}>SN</div>
              <div style={{ flex: 1 }}>PARTICULARS</div>
              <div style={{ width: 32, textAlign: 'right' }}>QTY</div>
              <div style={{ width: 68, textAlign: 'right' }}>RATE</div>
              <div style={{ width: 76, textAlign: 'right' }}>AMOUNT</div>
            </div>

            {/* Dashed separator */}
            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* Dynamic Items List */}
            <div className="receipt-items-container">
              {receipt.items.map((it) => (
                <div key={it.sn}>
                  <div style={{ margin: '4px 0 6px 0', fontSize: '13px', lineHeight: 1.35 }}>
                    {/* Line 1: SN & Product Type */}
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ width: 26, fontWeight: 500 }}>{it.sn}</span>
                      <span style={{ fontWeight: 500 }}>{it.type}</span>
                    </div>
                    {/* Line 2: Product Name + Qty + Rate + Amount */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <div style={{ paddingLeft: 26, flex: 1, paddingRight: 8, fontWeight: 400 }}>
                        {it.name}
                      </div>
                      <div style={{ width: 32, textAlign: 'right' }}>{it.qty}</div>
                      <div style={{ width: 68, textAlign: 'right' }}>{Number(it.rate).toFixed(2)}</div>
                      <div style={{ width: 76, textAlign: 'right' }}>{Number(it.amount).toFixed(2)}</div>
                    </div>
                    {/* Line 3: Variant (Size / Colour) */}
                    {it.variant ? (
                      <div style={{ paddingLeft: 26, fontSize: '12px', color: '#111' }}>
                        {it.variant}
                      </div>
                    ) : null}
                  </div>
                  {/* Dashed line after each item */}
                  <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />
                </div>
              ))}
            </div>

            {/* Totals Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12.5px' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 240 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '2px 0', textAlign: 'left' }}>Gross Amount</td>
                    <td style={{ padding: '2px 8px', textAlign: 'center' }}>:</td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>{receipt.grossAmount}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0', textAlign: 'left' }}>Discount</td>
                    <td style={{ padding: '2px 8px', textAlign: 'center' }}>:</td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>{receipt.discount}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0', textAlign: 'left' }}>Taxable Amount</td>
                    <td style={{ padding: '2px 8px', textAlign: 'center' }}>:</td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>{receipt.taxableAmount}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0', textAlign: 'left' }}>Non-Taxable Amount</td>
                    <td style={{ padding: '2px 8px', textAlign: 'center' }}>:</td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>{receipt.nonTaxableAmount}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 0', textAlign: 'left' }}>VAT (13%)</td>
                    <td style={{ padding: '2px 8px', textAlign: 'center' }}>:</td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>{receipt.vat}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Dashed separator right before Net Amount */}
            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Net Amount */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '14px', fontWeight: 'bold' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 240 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '2px 0', textAlign: 'left' }}>Net Amount</td>
                    <td style={{ padding: '2px 8px', textAlign: 'center' }}>:</td>
                    <td style={{ padding: '2px 0', textAlign: 'right', fontSize: '15px' }}>{receipt.netAmount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Dashed separator */}
            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* In words */}
            <div style={{ fontSize: '12px', margin: '4px 0', lineHeight: 1.4 }}>
              <div>In words:</div>
              <div style={{ fontWeight: 500 }}>{receipt.words}</div>
            </div>

            {/* Dashed separator */}
            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Footer Note */}
            <div style={{ textAlign: 'center', fontSize: '11.5px', lineHeight: 1.45, margin: '8px 0' }}>
              {receipt.store.footerMessage.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            {/* Dashed separator */}
            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Social / Web Footer Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10.5px',
                marginTop: '6px',
                fontFamily: "'Segoe UI', system-ui, sans-serif"
              }}
            >
              <div>{receipt.store.website}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    border: '1px solid #000',
                    borderRadius: '50%',
                    width: 15,
                    height: 15,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 'bold'
                  }}
                >
                  f
                </span>
                <span
                  style={{
                    border: '1px solid #000',
                    borderRadius: '50%',
                    width: 15,
                    height: 15,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 'bold'
                  }}
                >
                  ig
                </span>
                <span style={{ marginLeft: 2 }}>{receipt.store.socialHandle}</span>
              </div>
              <div>{receipt.store.phone}</div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div
          style={{
            padding: '12px 18px',
            background: '#ffffff',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            Bill #{receipt.billNo} &bull; {receipt.items.length} items &bull; Total: Rs {receipt.netAmount}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                color: '#374151',
                cursor: 'pointer'
              }}
              title="Print Receipt"
            >
              <Icon name="printer" size={14} />
              <span>Print</span>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleDownloadPdf}
              disabled={downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                color: '#374151',
                cursor: downloading ? 'wait' : 'pointer'
              }}
              title="Download PDF"
            >
              <Icon name="download" size={14} />
              <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
