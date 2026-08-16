'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { loadDB } from '../../services/dataStore';
import Icon from '../../components/admin/Icons';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [db, setDb] = useState(null);

  useEffect(() => {
    // Theme persistence
    const savedTheme = localStorage.getItem('zylo-theme');
    if (savedTheme === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    // Keyboard shortcut ⌘K / Ctrl+K
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchModalOpen) {
      setDb(loadDB());
    }
  }, [searchModalOpen]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (typeof document !== 'undefined') {
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('zylo-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('zylo-theme', 'light');
      }
    }
  };

  if (pathname === '/admin/login') {
    return <div className="login-screen">{children}</div>;
  }

  const navItems = [
    { section: 'Menu' },
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Categories', route: '/admin/categories', icon: 'cms' },
    { label: 'Master products', route: '/admin/products', icon: 'products' },
    { label: 'Orders', route: '/admin/orders', icon: 'orders' },
    { label: 'Customers', route: '/admin/customers', icon: 'customers' },
    { label: 'Inventory', route: '/admin/inventory', icon: 'inventory' },
    { label: 'Published stock', route: '/admin/published', icon: 'products' },
    { section: 'Accounts' },
    { label: 'Sales', route: '/admin/sales', icon: 'sales' },
    { label: 'Sales returns', route: '/admin/returns', icon: 'arrowDown' },
    { label: 'Purchases', route: '/admin/purchases', icon: 'purchases' },
    { label: 'Finance', route: '/admin/finance', icon: 'finance' },
    { label: 'Reports', route: '/admin/reports', icon: 'reports' },
    { label: 'IRD / VAT', route: '/admin/ird', icon: 'ird' },
    { section: 'Content' },
    { label: 'CMS', route: '/admin/cms', icon: 'cms' },
    { label: 'Settings', route: '/admin/settings', icon: 'settings' }
  ];

  // Global search filtering
  const q = searchQuery.toLowerCase().trim();
  const searchResults = [];
  if (db && q) {
    // Products
    (db.products || []).forEach(p => {
      if (p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) {
        searchResults.push({ type: 'Product', label: `${p.name} (${p.sku})`, route: '/admin/products' });
      }
    });
    // Orders
    (db.orders || []).forEach(o => {
      if (o.no.toLowerCase().includes(q) || (o.customer || '').toLowerCase().includes(q)) {
        searchResults.push({ type: 'Order', label: `Order ${o.no} - ${o.customer}`, route: '/admin/orders' });
      }
    });
    // Sales
    (db.sales || []).forEach(s => {
      if (s.invoice.toLowerCase().includes(q) || (s.customer || '').toLowerCase().includes(q)) {
        searchResults.push({ type: 'Sale', label: `${s.invoice} - ${s.customer}`, route: '/admin/sales' });
      }
    });
    // Customers
    (db.customers || []).forEach(c => {
      if (c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q)) {
        searchResults.push({ type: 'Customer', label: `${c.name} (${c.phone || ''})`, route: '/admin/customers' });
      }
    });
    // Categories
    (db.categories || []).forEach(c => {
      if (c.name.toLowerCase().includes(q)) {
        searchResults.push({ type: 'Category', label: c.name, route: '/admin/categories' });
      }
    });
  }

  const handleNavigate = (route) => {
    setSearchModalOpen(false);
    router.push(route);
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">Zylo admin</div>
        {navItems.map((item, idx) => {
          if (item.section) {
            return <div key={idx} className="sidebar-section-label">{item.section}</div>;
          }
          const isActive = pathname === item.route;
          return (
            <Link
              key={item.route}
              href={item.route}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="ic"><Icon name={item.icon} size={16} /></span>
              {item.label}
            </Link>
          );
        })}
      </aside>

      <div className="main">
        <header className="topbar">
          <div
            className="search-box"
            onClick={() => setSearchModalOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            <Icon name="search" size={15} />
            <span>Search</span>
            <kbd>⌘K</kbd>
          </div>
          <div className="topbar-right">
            <button className="icon-btn" aria-label="Notifications" onClick={() => alert('No new notifications')}>
              <Icon name="bell" size={17} />
            </button>
            <button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
              <Icon name={dark ? 'sun' : 'moon'} size={17} />
            </button>
            <div className="user-chip">
              <div className="avatar">SA</div>
              <div>
                <div style={{ fontWeight: 500 }}>Zylo Super Admin</div>
                <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Super Admin</div>
              </div>
              <Link href="/admin/login" style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginLeft: '8px' }}>
                Sign out
              </Link>
            </div>
          </div>
        </header>

        <div className="content">
          {children}
        </div>
      </div>

      {/* GLOBAL SEARCH MODAL */}
      {searchModalOpen && (
        <div className="modal-backdrop" onClick={() => setSearchModalOpen(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px', top: '15%', position: 'relative' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '14px' }}>
              <Icon name="search" size={18} />
              <input
                type="text"
                placeholder="Search products, orders, customers, invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', width: '100%', color: 'var(--primary)' }}
              />
              <kbd style={{ fontSize: '11px', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px' }}>ESC</kbd>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {searchQuery ? (
                searchResults.length > 0 ? (
                  searchResults.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => handleNavigate(r.route)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '2px',
                        transition: 'background 0.12s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontWeight: 500 }}>{r.label}</span>
                      <span className="badge badge-muted" style={{ fontSize: '11px' }}>{r.type}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '20px' }}>
                    No results found for &ldquo;{searchQuery}&rdquo;
                  </div>
                )
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', padding: '10px' }}>
                  Quick links:
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {navItems.filter(n => !n.section).map(n => (
                      <span
                        key={n.route}
                        onClick={() => handleNavigate(n.route)}
                        style={{ background: 'var(--muted)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        {n.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
