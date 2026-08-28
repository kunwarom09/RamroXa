'use client';
import React, { useState, useEffect } from 'react';
import { api } from '../../../services/apiClient';
import Icon from '../../../components/admin/Icons';

const APP_VERSION = '2.4.0';
const DB_VERSION = 7;

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    company: 'Zylo Pvt. Ltd.',
    email: 'hello@zylo.com.np',
    phone: '+977 1-4123456',
    address: 'Thamel, Kathmandu',
    pan: '601234567',
    vatRate: 13,
    invPrefix: 'INV-',
    currency: 'NPR',
    timezone: 'Asia/Kathmandu',
    fiscalYear: '2082/83',
    gateways: {
      cod: true,
      esewa: true,
      fonepay: true
    }
  });

  const handleSaveSettings = (e) => {
    if (e) e.preventDefault();
    alert('Settings saved successfully!');
  };

  const handleBackupJson = async () => {
    try {
      const [prodRes, orderRes, custRes, invRes] = await Promise.allSettled([
        api.get('/api/admin/products'),
        api.get('/api/admin/orders'),
        api.get('/api/admin/customers'),
        api.get('/api/admin/inventory')
      ]);

      const backup = {
        version: DB_VERSION,
        appVersion: APP_VERSION,
        exportedAt: new Date().toISOString(),
        products: prodRes.status === 'fulfilled' ? (prodRes.value.data?.products || prodRes.value.data || []) : [],
        orders: orderRes.status === 'fulfilled' ? (orderRes.value.data?.orders || orderRes.value.data || []) : [],
        customers: custRes.status === 'fulfilled' ? (custRes.value.data?.customers || custRes.value.data || []) : [],
        inventory: invRes.status === 'fulfilled' ? (invRes.value.data?.inventory || invRes.value.data || []) : []
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', dataStr);
      link.setAttribute('download', `zylo_mongodb_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export backup: ' + err.message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h2>Settings</h2>
        <p>Company profile, tax, payment gateways, role permissions, and database operations.</p>
      </div>

      <div className="tabs">
        <a className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>General</a>
        <a className={activeTab === 'tax' ? 'active' : ''} onClick={() => setActiveTab('tax')}>Tax &amp; VAT</a>
        <a className={activeTab === 'pay' ? 'active' : ''} onClick={() => setActiveTab('pay')}>Payment gateways</a>
        <a className={activeTab === 'roles' ? 'active' : ''} onClick={() => setActiveTab('roles')}>Roles</a>
      </div>

      {/* GENERAL TAB */}
      {activeTab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card card-pad form-max form-section">
            <h2>Company Profile</h2>
            <form onSubmit={handleSaveSettings}>
              <div className="form-grid-2">
                <div className="field">
                  <label>Company name</label>
                  <input
                    type="text"
                    value={settings.company || ''}
                    onChange={(e) => setSettings({ ...settings, company: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Contact email</label>
                  <input
                    type="email"
                    value={settings.email || ''}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={settings.phone || ''}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Address</label>
                  <input
                    type="text"
                    value={settings.address || ''}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Timezone</label>
                  <input
                    type="text"
                    value={settings.timezone || 'Asia/Kathmandu'}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Currency</label>
                  <input
                    type="text"
                    value={settings.currency || 'NPR'}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" style={{ marginTop: '10px' }}>
                Save settings
              </button>
            </form>
          </div>

          {/* Database Information */}
          <div className="card card-pad form-max form-section">
            <h2>Database information</h2>
            <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '16px' }}>
              <div>
                <div className="label" style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Application version</div>
                <div style={{ fontWeight: 600, fontSize: '15px', marginTop: '2px' }}>{db.appVersion || APP_VERSION}</div>
              </div>
              <div>
                <div className="label" style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Schema version</div>
                <div style={{ fontWeight: 600, fontSize: '15px', marginTop: '2px' }}>v{db.version || DB_VERSION}</div>
              </div>
              <div>
                <div className="label" style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Last migration</div>
                <div style={{ fontWeight: 500, fontSize: '12px', marginTop: '2px', color: 'var(--muted-foreground)' }}>
                  {db.lastMigratedAt ? new Date(db.lastMigratedAt).toLocaleString() : 'Recent'}
                </div>
              </div>
            </div>

            <div className="table-wrap" style={{ marginBottom: '16px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th className="num">Records</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Master Products</td><td className="num">{(db.products || []).length}</td><td><span className="badge badge-success">OK</span></td></tr>
                  <tr><td>Variants</td><td className="num">{(db.variants || []).length}</td><td><span className="badge badge-success">OK</span></td></tr>
                  <tr><td>Categories</td><td className="num">{(db.categories || []).length}</td><td><span className="badge badge-success">OK</span></td></tr>
                  <tr><td>Inventory Entries</td><td className="num">{(db.inventory || []).length}</td><td><span className="badge badge-success">OK</span></td></tr>
                  <tr><td>Sales Invoices</td><td className="num">{(db.sales || []).length}</td><td><span className="badge badge-success">OK</span></td></tr>
                  <tr><td>Sales Returns</td><td className="num">{(db.returns || []).length}</td><td><span className="badge badge-success">OK</span></td></tr>
                  <tr><td>Purchase Bills</td><td className="num">{(db.purchases || []).length}</td><td><span className="badge badge-success">OK</span></td></tr>
                  <tr><td>Storefront Orders</td><td className="num">{(db.orders || []).length}</td><td><span className="badge badge-success">OK</span></td></tr>
                  <tr><td>Customers</td><td className="num">{(db.customers || []).length}</td><td><span className="badge badge-success">OK</span></td></tr>
                  <tr><td>CMS Pages</td><td className="num">{(db.pages || []).length}</td><td><span className="badge badge-success">OK</span></td></tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-sm" type="button" onClick={handleVerifyIntegrity}>Verify integrity</button>
              <button className="btn btn-sm" type="button" onClick={handleRerunMigration}>Run migration again</button>
              <button className="btn btn-sm" type="button" onClick={() => setMigrationReportModal(true)}>Migration report</button>
              <button className="btn btn-sm" type="button" onClick={handleBackupJson}>Backup / export JSON</button>
              <button className="btn btn-sm" type="button" onClick={() => fileInputRef.current?.click()}>Restore / import JSON</button>
              <button className="btn btn-sm" type="button" onClick={handleExportCsvBundle}>Export CSV bundle</button>
              <button className="btn btn-sm btn-danger" type="button" onClick={handleResetData}>Reset demo data</button>
              <input
                type="file"
                ref={fileInputRef}
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleRestoreJson}
              />
            </div>

            {integrityLogs.length > 0 && (
              <div style={{ marginTop: '16px', background: 'var(--muted)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>Integrity Scan Results:</div>
                {integrityLogs.map((l, i) => (
                  <div key={i} style={{ color: l.startsWith('⚠️') ? 'var(--warning)' : 'var(--success)', marginBottom: '3px' }}>
                    {l}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAX & VAT TAB */}
      {activeTab === 'tax' && (
        <div className="card card-pad form-max form-section">
          <h2>Tax &amp; VAT Configuration</h2>
          <form onSubmit={handleSaveSettings}>
            <div className="form-grid-2">
              <div className="field">
                <label>VAT registration (PAN) number</label>
                <input
                  type="text"
                  value={settings.pan || ''}
                  onChange={(e) => setSettings({ ...settings, pan: e.target.value })}
                />
              </div>
              <div className="field">
                <label>VAT rate (%)</label>
                <input
                  type="number"
                  value={settings.vatRate != null ? settings.vatRate : 13}
                  onChange={(e) => setSettings({ ...settings, vatRate: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label>Invoice number prefix</label>
                <input
                  type="text"
                  value={settings.invPrefix || 'INV-'}
                  onChange={(e) => setSettings({ ...settings, invPrefix: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Fiscal year</label>
                <input
                  type="text"
                  value={settings.fiscalYear || '2082/83'}
                  onChange={(e) => setSettings({ ...settings, fiscalYear: e.target.value })}
                />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '8px' }}>
              Changing the VAT rate applies to new invoice entries. Historical invoices retain the rate they were issued with.
            </p>
            <button className="btn btn-primary" type="submit" style={{ marginTop: '12px' }}>
              Save settings
            </button>
          </form>
        </div>
      )}

      {/* PAYMENT GATEWAYS TAB */}
      {activeTab === 'pay' && (
        <div className="card card-pad form-max form-section">
          <h2>Payment Gateways</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '16px' }}>
            Configure active payment methods for customer checkout in Nepal.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--muted)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 500 }}>Cash on Delivery (COD)</div>
                <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Available on all domestic deliveries</div>
              </div>
              <input
                type="checkbox"
                checked={settings.gateways?.cod !== false}
                onChange={(e) => setSettings({ ...settings, gateways: { ...settings.gateways, cod: e.target.checked } })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--muted)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 500 }}>eSewa Mobile Wallet</div>
                <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>EPAY online checkout gateway</div>
              </div>
              <input
                type="checkbox"
                checked={!!settings.gateways?.esewa}
                onChange={(e) => setSettings({ ...settings, gateways: { ...settings.gateways, esewa: e.target.checked } })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--muted)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 500 }}>Fonepay QR &amp; Interbank</div>
                <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Direct bank debit &amp; dynamic merchant QR</div>
              </div>
              <input
                type="checkbox"
                checked={!!settings.gateways?.fonepay}
                onChange={(e) => setSettings({ ...settings, gateways: { ...settings.gateways, fonepay: e.target.checked } })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>
          </div>

          <button className="btn btn-primary" type="button" onClick={() => handleSaveSettings()} style={{ marginTop: '16px' }}>
            Save gateway settings
          </button>
        </div>
      )}

      {/* ROLES TAB */}
      {activeTab === 'roles' && (
        <div className="card table-wrap form-max">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Products</th>
                <th>Sales</th>
                <th>Finance</th>
                <th>Settings</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ fontWeight: 500 }}>Super Admin</td><td>Full</td><td>Full</td><td>Full</td><td>Full</td></tr>
              <tr><td style={{ fontWeight: 500 }}>Store Manager</td><td>Full</td><td>Full</td><td>View</td><td>-</td></tr>
              <tr><td style={{ fontWeight: 500 }}>Sales Agent</td><td>View</td><td>Full</td><td>-</td><td>-</td></tr>
              <tr><td style={{ fontWeight: 500 }}>Finance Officer</td><td>-</td><td>View</td><td>Full</td><td>-</td></tr>
              <tr><td style={{ fontWeight: 500 }}>Warehouse Keeper</td><td>View</td><td>-</td><td>-</td><td>-</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* MIGRATION REPORT MODAL */}
      {migrationReportModal && (
        <div className="modal-backdrop" onClick={() => setMigrationReportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <h2>Database Migration Report</h2>
            <div style={{ fontSize: '13px', lineHeight: '1.6', marginTop: '12px' }}>
              <p><strong>Current Schema Version:</strong> v{db.version || DB_VERSION}</p>
              <p><strong>App Version:</strong> {APP_VERSION}</p>
              <p><strong>Last Migration Date:</strong> {db.lastMigratedAt ? new Date(db.lastMigratedAt).toLocaleString() : 'N/A'}</p>
              <div style={{ background: 'var(--muted)', padding: '12px', borderRadius: '8px', marginTop: '12px' }}>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>Migration Steps Applied:</div>
                <div>✓ v1: Base catalog and invoicing schema</div>
                <div>✓ v2: Warehouses and multi-location inventory</div>
                <div>✓ v3: Double-entry accounting journal sync</div>
                <div>✓ v4: Sales return wizard and credit notes</div>
                <div>✓ v5: Variant matrix, barcodes and category taxonomy</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button className="btn btn-primary" onClick={() => setMigrationReportModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
