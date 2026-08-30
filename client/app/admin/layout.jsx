'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../../services/apiClient';
import Icon from '../../components/admin/Icons';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Completely purge legacy client-side localStorage db
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('zylo-db');
      } catch (e) {}
    }

    // Auth verification guard for admin
    if (pathname === '/admin/login') {
      setAuthChecked(true);
      return;
    }

    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await api.get('/api/auth/me');
        const user = res.data?.user;
        if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
          router.push('/admin/login');
        } else if (isMounted) {
          setCurrentUser(user);
          setAuthChecked(true);
        }
      } catch (err) {
        if (isMounted) {
          router.push('/admin/login');
        }
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    // Theme persistence
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('zylo-theme') : null;
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
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    let isCancelled = false;

    async function doSearch() {
      try {
        const [prodRes, orderRes, custRes] = await Promise.allSettled([
          api.get(`/api/admin/products?q=${encodeURIComponent(q)}`),
          api.get(`/api/admin/orders?q=${encodeURIComponent(q)}`),
          api.get(`/api/admin/customers?q=${encodeURIComponent(q)}`)
        ]);

        if (isCancelled) return;
        const results = [];

        if (prodRes.status === 'fulfilled') {
          const prods = prodRes.value.data?.products || prodRes.value.data || [];
          prods.slice(0, 5).forEach((p) => {
            results.push({ type: 'Product', label: `${p.name} (${p.sku || ''})`, route: '/admin/products' });
          });
        }

        if (orderRes.status === 'fulfilled') {
          const orders = orderRes.value.data?.orders || orderRes.value.data || [];
          orders.slice(0, 5).forEach((o) => {
            const cust = o.shippingAddress?.fullName || o.customer || o.guestPhone || 'Customer';
            results.push({ type: 'Order', label: `Order ${o.orderNo || o.no} - ${cust}`, route: '/admin/orders' });
          });
        }

        if (custRes.status === 'fulfilled') {
          const custs = custRes.value.data?.customers || custRes.value.data || [];
          custs.slice(0, 5).forEach((c) => {
            results.push({ type: 'Customer', label: `${c.name || c.email} (${c.phone || ''})`, route: '/admin/customers' });
          });
        }

        setSearchResults(results);
      } catch (err) {}
    }

    const t = setTimeout(doSearch, 200);
    return () => {
      isCancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery]);

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
    { label: 'Reviews', route: '/admin/reviews', icon: 'message' },
    { label: 'Library', route: '/admin/library', icon: 'image' },
    { label: 'Settings', route: '/admin/settings', icon: 'settings' }
  ];

  const handleNavigate = (route) => {
    setSearchModalOpen(false);
    router.push(route);
  };

  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout error:', err.message);
    }
    router.push('/admin/login');
  };

  if (!authChecked && pathname !== '/admin/login') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)', color: 'var(--muted-foreground)' }}>
        Verifying authorization...
      </div>
    );
  }

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SA';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo"><img src="/assets/ramroxa-logo.png" alt="Ramroxa" style={{ height: 20 }} /></div>
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
              <div className="avatar">{initials}</div>
              <div>
                <div style={{ fontWeight: 500 }}>{currentUser?.name || 'Zylo Super Admin'}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>
                  {currentUser?.role || 'Admin'}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '11px',
                  color: 'var(--muted-foreground)',
                  marginLeft: '8px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
              >
                Sign out
              </button>
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
