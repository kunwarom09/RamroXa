'use client';
import React from 'react';
import Landing from './Landing';
import { placeOrderApi, fetchUserOrdersApi } from '../services/orderService';
import { fetchProducts } from '../services/productService';
import { api } from '../services/apiClient';

const DEFAULT_CATALOG = [];

const slugForProduct = (p, i) => (p?.slug || (p?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || String(i));

function formatProductItem(p) {
  const featuredImg = (p.images || []).find((img) => img.isFeatured) || (p.images || [])[0];
  const secondImg = (p.images || [])[1] || featuredImg;
  const priceNpr = p.basePrice !== undefined ? Math.round(p.basePrice / 100) : (p.price || 0);
  const mrpNpr = p.mrp !== undefined ? Math.round(p.mrp / 100) : 0;
  return {
    name: p.name,
    tag: p.labels?.newArrival ? 'NEW ARRIVAL' : (p.labels?.bestSelling ? 'BEST SELLER' : (p.labels?.featured ? 'FEATURED' : 'LATEST DROP')),
    labels: p.labels || {},
    price: priceNpr,
    compare: mrpNpr || priceNpr,
    desc: p.description || '',
    img1: featuredImg?.url || p.img1 || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
    img2: secondImg?.url || p.img2 || featuredImg?.url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
    slug: p.slug || slugForProduct(p, 0),
    gender: p.gender || 'Unisex',
    brand: p.brand || p.brandName || (p.tags && p.tags.length ? p.tags[0] : 'Ramroxa'),
    category: p.category || p.categoryId || '',
    categoryId: p.categoryId || '',
    tags: p.tags || [],
    options: p.options || {},
    colors: Array.isArray(p.options?.Colour || p.options?.Color || p.options?.colours || p.options?.colors || p.colors)
      ? (p.options?.Colour || p.options?.Color || p.options?.colours || p.options?.colors || p.colors)
      : ((p.options?.Colour || p.options?.Color || p.options?.colours || p.options?.colors || p.colors)
        ? [p.options?.Colour || p.options?.Color || p.options?.colours || p.options?.colors || p.colors]
        : []),
    createdAt: p.createdAt || new Date().toISOString(),
    id: p.id
  };
}

function buildFullCatalog() {
  return DEFAULT_CATALOG.map((item, idx) => ({
    ...item,
    slug: slugForProduct(item, idx)
  }));
}

const METHODS = [
  { id: 'cod', name: 'Cash on Delivery', desc: 'Pay in cash when the order arrives at your door. No advance payment required.' },
  { id: 'esewa', name: 'eSewa', desc: "Nepal's digital wallet. You will be redirected to eSewa's payment flow to complete payment before your order is confirmed." },
  { id: 'fonepay', name: 'Fonepay', desc: "Nepal's QR / bank payment network. Scan a Fonepay QR with your bank app to pay before confirmation." },
];

const HERO_PRESETS = [
  { key: 'Urban', hash: '7f7ad2764f25606b', label: 'Urban' },
  { key: 'Latest', hash: 'ed11bf6e660fdaa2', label: 'Latest' },
  { key: 'Premium', hash: '78948356fa487da5', label: 'Premium' },
  { key: 'Arctic', hash: 'dbacea851225e2bf', label: 'Arctic' },
  { key: 'Casual', hash: '0ca944ebbae726b8', label: 'Casual' },
  { key: 'Iconic', hash: '44312e50fe56c782', label: 'Iconic' },
  { key: 'Unique', hash: 'c2dbe0a9de9b2d4c', label: 'Unique' }
];

const COLOR_HEX_MAP = {
  black: '#111111',
  white: '#ffffff',
  khaki: '#c3b091',
  oatmeal: '#e3dac9',
  natural: '#f2eecb',
  blue: '#3b5998',
  indigo: '#2e4482',
  denim: '#466d98',
  brown: '#6e4a2e',
  grey: '#888888',
  'heather grey': '#9e9e9e',
  charcoal: '#374151',
  olive: '#556b2f',
  sage: '#9caf88',
  navy: '#1e293b',
  cream: '#fdfbf7',
  beige: '#e6dfd5',
  red: '#dc2626',
  burgundy: '#800020',
  orange: '#ea580c',
  yellow: '#eab308'
};

const FREE_OVER = 5000;
const rs = n => 'Rs ' + (n || 0).toLocaleString('en-US');
const asset = h => `/assets/${h}.q.jpg`;
const img = (h) => {
  if (!h) return "url('/assets/98eab38550301ca9.q.jpg') 50% 20% / cover no-repeat";
  if (String(h).startsWith('http') || String(h).startsWith('/') || String(h).startsWith('data:')) {
    return `url('${h}') 50% 20% / cover no-repeat`;
  }
  return `url('/assets/${h}.q.jpg') 50% 20% / cover no-repeat`;
};
const font = { fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif" };
const pillBtn = (dark) => ({ ...font, fontSize: 14, letterSpacing: 1, background: dark ? '#000' : '#fff', color: dark ? '#fff' : '#000', border: '1px solid #000', borderRadius: 999, padding: '14px 28px', cursor: 'pointer' });
const input = { ...font, fontSize: 14, border: '1px solid #000', borderRadius: 8, padding: 12, outline: 'none', background: '#fff' };

function QR() {
  const n = 21, cells = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const finder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let on;
    if (finder(r, c)) {
      const rr = r >= n - 7 ? r - (n - 7) : r, cc = c >= n - 7 ? c - (n - 7) : c;
      on = rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
    } else on = rnd() > 0.5;
    cells.push(<div key={r + '-' + c} style={{ background: on ? '#000' : '#fff' }} />);
  }
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(21, 1fr)', width: '100%', height: '100%' }}>{cells}</div>;
}

function loadStoredCart() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('zylo-store-cart');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredCart(cart) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('zylo-store-cart', JSON.stringify(cart || []));
  } catch (e) {}
}

export default class StoreApp extends React.Component {
  constructor(props) {
    super(props);
    const initialCatalog = buildFullCatalog();
    let initialSel = 0;
    if (props.initialProductSlug) {
      const foundIdx = initialCatalog.findIndex((p, i) => slugForProduct(p, i) === props.initialProductSlug || String(i) === props.initialProductSlug);
      if (foundIdx >= 0) initialSel = foundIdx;
    } else if (props.initialProduct != null) {
      initialSel = props.initialProduct;
    }

    let initialCart = [];
    let initialName = '';
    let initialPhone = '';
    let initialAddress = '';
    let initialCity = 'Kathmandu';

    if (typeof window !== 'undefined') {
      initialCart = loadStoredCart();
      try {
        initialName = localStorage.getItem('zylo-c-name') || '';
        initialPhone = localStorage.getItem('zylo-c-phone') || '';
        initialAddress = localStorage.getItem('zylo-c-address') || '';
        initialCity = localStorage.getItem('zylo-c-city') || 'Kathmandu';
      } catch (e) {}
    }

    this.state = {
      catalog: initialCatalog,
      view: props.initialView || 'shop',
      accountTab: props.initialAccountTab || 'orders',
      userOrders: [],
      loadingOrders: false,
      profileName: '',
      profilePhone: '',
      profilePermanentAddress: '',
      profileTemporaryAddress: '',
      savingProfile: false,
      accountDropdownOpen: false,
      cart: initialCart,
      pay: 'cod',
      orderId: null,
      orderTotal: 0,
      sel: initialSel,
      selImg: 0,
      selSize: 'M',
      selQty: 1,
      toast: null,
      cName: initialName,
      cPhone: initialPhone,
      cAddress: initialAddress,
      cCity: initialCity,
      cMsg: '',
      cTopic: 'Order status',
      contactSent: false,
      colFilter: props.initialColFilter || 'all',
      filterPriceBucket: 'all',
      filterMinPrice: '',
      filterMaxPrice: '',
      debouncedMinPrice: '',
      debouncedMaxPrice: '',
      filterBrands: [],
      filterColors: [],
      sortBy: 'featured',
      showMobileFilters: false,
      mobileMenuOpen: false,
      landingScale: 1,
      currentUser: null,
      showProfileModal: false,
      heroPreset: 'Arctic'
    };
  }

  getCatalog = () => {
    return this.state.catalog || buildFullCatalog();
  };

  goToView = (v, extraState = {}, updateUrl = true) => {
    const urlMap = {
      shop: '/',
      collections: '/shop',
      cart: '/cart',
      checkout: '/checkout',
      contact: '/contact',
      confirmed: '/order-confirmed',
      account: '/account'
    };

    let targetUrl = urlMap[v] || '/';
    if (v === 'account') {
      const tab = extraState.accountTab !== undefined ? extraState.accountTab : this.state.accountTab;
      if (tab === 'orders') {
        targetUrl = '/account/orders';
      }
    } else if (v === 'detail') {
      const selIndex = extraState.sel !== undefined ? extraState.sel : this.state.sel;
      const cat = this.getCatalog();
      const p = cat[selIndex] || cat[0];
      targetUrl = `/product/${slugForProduct(p, selIndex)}`;
    }

    if (updateUrl && targetUrl && typeof window !== 'undefined' && window.history && window.location.pathname !== targetUrl) {
      window.history.pushState({ view: v, ...extraState }, '', targetUrl);
    }

    this.setState({ view: v, mobileMenuOpen: false, ...extraState });
    window.scrollTo(0, 0);

    if (v === 'account' && (extraState.accountTab === 'orders' || (!extraState.accountTab && this.state.accountTab === 'orders'))) {
      this.loadUserOrders();
    }
  };

  nav = (v, colFilter) => () => {
    this.goToView(v, colFilter ? { colFilter } : {});
  };

  openProduct = (i) => {
    this.goToView('detail', { sel: i, selImg: 0, selSize: 'M', selQty: 1 });
  };

  toggleMobileMenu = () => this.setState(s => ({ mobileMenuOpen: !s.mobileMenuOpen }));
  closeMobileMenu = () => this.setState({ mobileMenuOpen: false });

  componentDidMount() {
    const loadDynamicCatalog = async () => {
      try {
        const apiProds = await fetchProducts();
        const apiCatalog = (apiProds || []).map(formatProductItem);
        
        let selIdx = this.state.sel;
        let view = this.state.view;

        let currentSlug = this.props.initialProductSlug;
        if (!currentSlug && typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path.startsWith('/product/')) {
            currentSlug = path.replace('/product/', '').replace(/\/$/, '');
          }
        }

        if (currentSlug && apiCatalog.length > 0) {
          const foundIdx = apiCatalog.findIndex((p, i) =>
            slugForProduct(p, i) === currentSlug ||
            p.slug === currentSlug ||
            p.id === currentSlug ||
            String(i) === currentSlug
          );
          if (foundIdx >= 0) {
            selIdx = foundIdx;
            view = 'detail';
          }
        }

        this.setState({ catalog: apiCatalog, sel: selIdx, view });
      } catch (err) {
        console.warn('API fetchProducts notice:', err.message);
      }
    };
    loadDynamicCatalog();

    const checkAuthSession = async () => {
      try {
        let user = null;
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('zylo_user');
          if (stored) {
            user = JSON.parse(stored);
            this.setState({
              currentUser: user,
              profileName: user.name || '',
              profilePhone: user.phone || '',
              profilePermanentAddress: user.permanentAddress || '',
              profileTemporaryAddress: user.temporaryAddress || ''
            });
          }
        }
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.data?.user) {
            user = meData.data.user;
            this.setState({
              currentUser: user,
              profileName: user.name || '',
              profilePhone: user.phone || '',
              profilePermanentAddress: user.permanentAddress || '',
              profileTemporaryAddress: user.temporaryAddress || ''
            });
            if (typeof window !== 'undefined') {
              localStorage.setItem('zylo_user', JSON.stringify(user));
            }
          }
        }
        if (user && (this.state.view === 'account' || this.props.initialView === 'account')) {
          this.loadUserOrders();
        }
      } catch (e) {}
    };
    checkAuthSession();

    this.updateLandingScale = () => {
      if (typeof window === 'undefined') return;
      const vw = window.innerWidth;
      const scale = vw / 1188;
      if (Math.abs(scale - (this.state.landingScale || 1)) > 0.002) {
        this.setState({ landingScale: scale });
      }
    };
    this.updateLandingScale();
    window.addEventListener('resize', this.updateLandingScale);

    // Sync state with browser URL on popstate
    this._popstateHandler = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      const cat = this.getCatalog();
      if (path === '/' || path === '') {
        this.setState({ view: 'shop', mobileMenuOpen: false });
      } else if (path === '/shop' || path.startsWith('/shop')) {
        this.setState({ view: 'collections', mobileMenuOpen: false });
      } else if (path === '/cart') {
        this.setState({ view: 'cart', mobileMenuOpen: false });
      } else if (path === '/checkout') {
        this.setState({ view: 'checkout', mobileMenuOpen: false });
      } else if (path === '/contact') {
        this.setState({ view: 'contact', mobileMenuOpen: false });
      } else if (path === '/order-confirmed') {
        this.setState({ view: 'confirmed', mobileMenuOpen: false });
      } else if (path === '/account/orders' || path === '/orders') {
        this.setState({ view: 'account', accountTab: 'orders', mobileMenuOpen: false });
        this.loadUserOrders();
      } else if (path === '/account' || path.startsWith('/account')) {
        this.setState({ view: 'account', accountTab: 'profile', mobileMenuOpen: false });
      } else if (path.startsWith('/product/')) {
        const slug = path.replace('/product/', '').replace(/\/$/, '');
        const idx = cat.findIndex((p, i) => slugForProduct(p, i) === slug || p.slug === slug || p.id === slug || String(i) === slug);
        if (idx >= 0) {
          this.setState({ view: 'detail', sel: idx, mobileMenuOpen: false });
        }
      }
    };
    window.addEventListener('popstate', this._popstateHandler);

    this._click = (e) => {
      if (this.state.view !== 'shop') return;
      const label = (e.target.textContent || '').trim();
      const stop = () => { e.preventDefault(); e.stopPropagation(); };
      const HERO_SWAP = { Urban: '7f7ad2764f25606b', Latest: 'ed11bf6e660fdaa2', Premium: '78948356fa487da5', Arctic: 'dbacea851225e2bf', Casual: '0ca944ebbae726b8', Iconic: '44312e50fe56c782', Unique: 'c2dbe0a9de9b2d4c' };
      if (HERO_SWAP[label]) {
        stop();
        this.setState({ heroPreset: label });
        return;
      }
      if (label.length < 30) {
        if (/^(Contact|Contact us|Contact Ramroxa|Contact Zylo)$/.test(label)) { stop(); this.goToView('contact'); return; }
        if (/^Home$/.test(label)) { stop(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        if (/^(Shop|Shop all items)$/.test(label)) { stop(); this.goToView('collections', { colFilter: 'all' }); return; }
        if (/^See all collections$/.test(label)) { stop(); this.goToView('collections', { colFilter: 'all' }); return; }
        if (/^(Mens's wear|Men's wear)$/.test(label)) { stop(); this.goToView('collections', { colFilter: 'men' }); return; }
        if (/^Women's wear$/.test(label)) { stop(); this.goToView('collections', { colFilter: 'women' }); return; }
        if (/^Children's wear$/.test(label)) { stop(); this.goToView('collections', { colFilter: 'kids' }); return; }
        if (/^About$/.test(label)) { stop(); this.scrollToText('voice of quality'); return; }
        if (/^Blog$/.test(label)) { stop(); this.scrollToText('daily style journey'); return; }
      }
      let el = e.target;
      const cat = this.getCatalog();
      for (let d = 0; d < 14 && el && el !== document.body; d++, el = el.parentElement) {
        const t = el.textContent || '';
        if (t.length > 160) continue;
        const idx = cat.findIndex(p => t.includes(p.name));
        if (idx >= 0) { stop(); this.openProduct(idx); return; }
      }
    };
    document.addEventListener('click', this._click, true);

    // ZYLO wordmark swap
    this._logoT = setInterval(() => {
      const logo = document.querySelector('.logo-area');
      if (logo && logo.querySelector('span')) {
        logo.querySelector('span').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 400);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateLandingScale);
    window.removeEventListener('popstate', this._popstateHandler);
    document.removeEventListener('click', this._click, true);
    clearInterval(this._logoT);
    clearTimeout(this._toastT);
  }

  scrollToText(snippet) {
    const el = [...document.querySelectorAll('div, p, h1, h2, h3, span')].find(d => (d.textContent || '').toLowerCase().includes(snippet.toLowerCase()));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showToast(msg) {
    clearTimeout(this._toastT);
    this.setState({ toast: msg });
    this._toastT = setTimeout(() => this.setState({ toast: null }), 2400);
  }

  addLine(goCheckout) {
    const cat = this.getCatalog();
    const p = cat[this.state.sel] || cat[0];
    const selIdx = this.state.sel;
    const selSize = this.state.selSize;
    const selQty = this.state.selQty;

    const cart = [...this.state.cart];
    const i = cart.findIndex(l => l.idx === selIdx && l.size === selSize);
    if (i >= 0) cart[i] = { ...cart[i], qty: cart[i].qty + selQty };
    else cart.push({ idx: selIdx, size: selSize, qty: selQty });

    saveStoredCart(cart);
    this.setState({ cart }, () => {
      if (goCheckout) {
        this.goToView('checkout');
      } else {
        this.showToast('Added ' + (p ? p.name : 'product') + ' to cart');
      }
    });
  }

  bump(i, d) {
    const newCart = this.state.cart.map((l, j) => j === i ? { ...l, qty: l.qty + d } : l).filter(l => l.qty > 0);
    saveStoredCart(newCart);
    this.setState({ cart: newCart });
  }

  totals() {
    const cat = this.getCatalog();
    const subtotal = this.state.cart.reduce((t, l) => {
      const item = cat[l.idx];
      return t + (item ? item.price : 0) * l.qty;
    }, 0);
    const delivery = subtotal === 0 ? 0 : (subtotal >= FREE_OVER ? 0 : 150);
    return { subtotal, delivery, total: subtotal + delivery };
  }

  placeOrder = async () => {
    const { total, subtotal, delivery } = this.totals();
    if (!this.state.cart.length || subtotal <= 0) {
      this.showToast('Your cart is empty! Please add a product first.');
      return;
    }

    const customerName = (this.state.cName || '').trim();
    const customerPhone = (this.state.cPhone || '').trim();
    const customerAddress = (this.state.cAddress || 'Kathmandu').trim();
    const customerCity = (this.state.cCity || 'Kathmandu').trim();

    if (!customerName) {
      this.showToast('Please enter your Full Name.');
      return;
    }
    if (!customerPhone || customerPhone.length < 6) {
      this.showToast('Please enter your Phone Number.');
      return;
    }

    // Persist customer inputs
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zylo-c-name', customerName);
        localStorage.setItem('zylo-c-phone', customerPhone);
        localStorage.setItem('zylo-c-address', customerAddress);
        localStorage.setItem('zylo-c-city', customerCity);
      } catch (e) {}
    }

    const id = 'ZY-' + Math.floor(100000 + Math.random() * 900000);
    const cat = this.getCatalog();
    const cartItems = this.state.cart.map(l => {
      const p = cat[l.idx] || {};
      return {
        productId: p.id || ('prod_' + l.idx),
        variantId: p.variants?.[0]?.id || p.id || ('v_' + l.idx),
        name: p.name || 'Product',
        size: l.size || 'M',
        qty: l.qty || 1,
        unitPrice: (p.price || 0) * 100
      };
    });

    try {
      await placeOrderApi({
        items: cartItems,
        shippingAddress: {
          fullName: customerName,
          phone: customerPhone,
          line1: customerAddress,
          city: customerCity
        },
        paymentMethod: (this.state.pay || 'cod').toLowerCase(),
        guestPhone: customerPhone
      });
    } catch (e) {
      console.warn('Order dispatch notice:', e);
    }

    // Clear cart in local storage and state
    saveStoredCart([]);
    const isCod = this.state.pay === 'cod';
    this.goToView(isCod ? 'confirmed' : this.state.pay, {
      orderId: id,
      orderTotal: total,
      cart: []
    });
  };

  loadUserOrders = async () => {
    if (!this.state.currentUser) return;
    this.setState({ loadingOrders: true });
    try {
      const orders = await fetchUserOrdersApi();
      this.setState({ userOrders: Array.isArray(orders) ? orders : [], loadingOrders: false });
    } catch (e) {
      console.warn('loadUserOrders notice:', e.message);
      this.setState({ loadingOrders: false });
    }
  };

  handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    this.setState({ savingProfile: true });
    try {
      const res = await api.put('/api/auth/me', {
        name: this.state.profileName,
        phone: this.state.profilePhone,
        permanentAddress: this.state.profilePermanentAddress,
        temporaryAddress: this.state.profileTemporaryAddress
      });
      if (res?.data?.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('zylo_user', JSON.stringify(res.data.user));
        }
        this.setState({
          currentUser: res.data.user,
          toast: 'Profile updated successfully!',
          savingProfile: false
        });
        setTimeout(() => this.setState({ toast: null }), 3000);
      }
    } catch (err) {
      this.setState({
        savingProfile: false,
        toast: err.message || 'Failed to update profile'
      });
      setTimeout(() => this.setState({ toast: null }), 3000);
    }
  };

  handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zylo_user');
    }
    this.setState({
      currentUser: null,
      showProfileModal: false,
      accountDropdownOpen: false,
      userOrders: [],
      toast: 'Signed out successfully'
    });
    if (this.state.view === 'account') {
      this.goToView('shop');
    }
    setTimeout(() => this.setState({ toast: null }), 3000);
  };

  header() {
    const { view, cart, mobileMenuOpen, currentUser } = this.state;
    const totalItems = cart.reduce((t, l) => t + l.qty, 0);
    const link = (label, active, onClick) => (
      <span onClick={onClick} style={{ fontSize: 13, letterSpacing: 1, color: active ? '#fff' : '#a1a1a1', cursor: 'pointer' }}>{label}</span>
    );
    return (
      <>
        <header className="header-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60, background: '#000', color: '#fff', position: 'sticky', top: 0, zIndex: 40, margin: 0 }}>
          <div style={{ maxWidth: 1188, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <button onClick={this.toggleMobileMenu} className="mobile-nav-toggle" aria-label="Toggle Navigation Menu">
                <div className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`}>
                  <span />
                  <span />
                  <span />
                </div>
              </button>
              <div onClick={this.nav('shop')} style={{ fontSize: 24, letterSpacing: 4, cursor: 'pointer' }}>RAMROXA</div>
              <div className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28, marginLeft: 8 }}>
                {link('HOME', view === 'shop', this.nav('shop'))}
                {link('COLLECTIONS', view === 'collections', this.nav('collections', 'all'))}
                {link('CONTACT', view === 'contact', this.nav('contact'))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Amazon-style Account & Lists Button with Flyout Dropdown */}
              <div
                className="zylo-nav-account-wrapper"
                onMouseEnter={() => this.setState({ accountDropdownOpen: true })}
                onMouseLeave={() => this.setState({ accountDropdownOpen: false })}
              >
                {currentUser ? (
                  <button
                    onClick={() => this.goToView('account', { accountTab: 'profile', accountDropdownOpen: false })}
                    className="zylo-nav-account-btn"
                    title="Account Profile & Saved Addresses"
                  >
                    <span className="zylo-nav-account-hello">
                      Hello, {currentUser.name ? currentUser.name.split(' ')[0] : 'Member'}
                    </span>
                    <div className="zylo-nav-account-title-row">
                      <span className="zylo-nav-account-title">Account &amp; Lists</span>
                      <span className="zylo-nav-account-arrow">▾</span>
                    </div>
                  </button>
                ) : (
                  <a
                    href="/login"
                    className="zylo-nav-account-btn"
                    title="Sign in to your account"
                  >
                    <span className="zylo-nav-account-hello">Hello, sign in</span>
                    <div className="zylo-nav-account-title-row">
                      <span className="zylo-nav-account-title">Account &amp; Lists</span>
                      <span className="zylo-nav-account-arrow">▾</span>
                    </div>
                  </a>
                )}

                {/* Flyout Menu */}
                <div className={`zylo-account-flyout ${this.state.accountDropdownOpen ? 'open' : ''}`}>
                  <div className="zylo-account-flyout-arrow" />

                  <div className="zylo-account-flyout-card">
                    {!currentUser ? (
                      <div className="zylo-flyout-auth-header">
                        <a href="/login" className="zylo-flyout-signin-btn">
                          Sign in
                        </a>
                        <div className="zylo-flyout-new-customer">
                          New customer? <a href="/signup" className="zylo-flyout-start-link">Start here.</a>
                        </div>
                      </div>
                    ) : (
                      <div className="zylo-flyout-auth-header logged-in">
                        <div className="zylo-flyout-user-info">
                          <span className="zylo-flyout-greeting">Hello,</span>
                          <strong className="zylo-flyout-username">{currentUser.name}</strong>
                          <span className="zylo-flyout-email">{currentUser.email}</span>
                        </div>
                        <button
                          onClick={() => this.goToView('account', { accountTab: 'profile', accountDropdownOpen: false })}
                          className="zylo-flyout-profile-btn"
                        >
                          Manage Profile
                        </button>
                      </div>
                    )}

                    <div className="zylo-flyout-divider" />

                    <div className="zylo-flyout-columns">
                      {/* Left Column: Your Lists */}
                      <div className="zylo-flyout-col">
                        <h4 className="zylo-flyout-col-title">Your Lists</h4>
                        <ul className="zylo-flyout-list">
                          <li>
                            <button onClick={() => { this.goToView('collections', 'all'); this.setState({ accountDropdownOpen: false }); }}>
                              Explore Collections
                            </button>
                          </li>
                          <li>
                            <button onClick={() => { this.goToView('shop'); this.setState({ accountDropdownOpen: false }); }}>
                              New Arrivals &amp; Drops
                            </button>
                          </li>
                          <li>
                            <button onClick={() => { this.goToView('cart'); this.setState({ accountDropdownOpen: false }); }}>
                              Shopping Cart ({totalItems})
                            </button>
                          </li>
                        </ul>
                      </div>

                      {/* Right Column: Your Account */}
                      <div className="zylo-flyout-col">
                        <h4 className="zylo-flyout-col-title">Your Account</h4>
                        <ul className="zylo-flyout-list">
                          <li>
                            <button onClick={() => {
                              if (currentUser) {
                                this.goToView('account', { accountTab: 'profile', accountDropdownOpen: false });
                              } else {
                                window.location.href = '/login';
                              }
                            }}>
                              Account Profile
                            </button>
                          </li>
                          <li>
                            <button onClick={() => {
                              if (currentUser) {
                                this.goToView('account', { accountTab: 'orders', accountDropdownOpen: false });
                              } else {
                                window.location.href = '/login';
                              }
                            }}>
                              Orders &amp; Purchases
                            </button>
                          </li>
                          <li>
                            <button onClick={() => {
                              if (currentUser) {
                                this.goToView('account', { accountTab: 'addresses', accountDropdownOpen: false });
                              } else {
                                window.location.href = '/login';
                              }
                            }}>
                              Saved Addresses
                            </button>
                          </li>
                          <li>
                            <button onClick={() => { this.goToView('contact'); this.setState({ accountDropdownOpen: false }); }}>
                              Help &amp; Contact Us
                            </button>
                          </li>
                          {currentUser && (
                            <li className="zylo-flyout-signout-item">
                              <button
                                onClick={() => {
                                  this.handleLogout();
                                  this.setState({ accountDropdownOpen: false });
                                }}
                                className="zylo-flyout-signout-btn"
                              >
                                Sign Out
                              </button>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={this.nav('cart')}
                className="zylo-nav-cart-btn"
                title="Shopping Cart"
              >
                <div className="zylo-nav-cart-icon-wrap">
                  <svg className="zylo-nav-cart-svg" viewBox="0 0 46 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Top pill badge loop */}
                    <rect x="16" y="2" width="13" height="15" rx="6.5" stroke="#ffffff" strokeWidth="2.2" fill="#000000" />
                    
                    {/* Cart body wireframe */}
                    <path
                      d="M 2 7 h 5.5 l 4.2 14.5 h 18.2 l 4.2 -11.5 H 9.5"
                      stroke="#ffffff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Wheels */}
                    <circle cx="14.5" cy="27.5" r="2.5" fill="#ffffff" />
                    <circle cx="29.5" cy="27.5" r="2.5" fill="#ffffff" />

                    {/* Centered locked white count */}
                    <text
                      x="22.5"
                      y="10.5"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#ffffff"
                      fontSize="11.5"
                      fontWeight="700"
                      fontFamily="'Geist', sans-serif"
                    >
                      {totalItems}
                    </text>
                  </svg>
                </div>
                <span className="zylo-nav-cart-label">Cart</span>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid #222', paddingBottom: 16 }}>
            <span style={{ fontSize: 22, letterSpacing: 4, fontWeight: 'bold' }}>RAMROXA</span>
            <button onClick={this.closeMobileMenu} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', padding: 8 }}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <button className="mobile-nav-link" onClick={this.nav('shop')}>HOME</button>
            <button className="mobile-nav-link" onClick={this.nav('collections', 'all')}>COLLECTIONS</button>
            <button className="mobile-nav-link" onClick={this.nav('cart')}>CART ({totalItems})</button>
            <button className="mobile-nav-link" onClick={this.nav('contact')}>CONTACT US</button>
          </div>

          <div style={{ marginTop: 24, borderTop: '1px solid #222', paddingTop: 16 }}>
            {currentUser ? (
              <div>
                <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>
                  Signed in as <strong style={{ color: '#fff' }}>{currentUser.name}</strong>
                </div>
                <button
                  className="mobile-nav-link"
                  onClick={() => this.goToView('account', { accountTab: 'profile', mobileMenuOpen: false })}
                  style={{ textAlign: 'left', width: '100%', marginBottom: 12, fontSize: 13 }}
                >
                  MY ACCOUNT &amp; ORDERS
                </button>
                <button
                  className="mobile-nav-link"
                  onClick={this.handleLogout}
                  style={{ textAlign: 'left', width: '100%', color: '#ef4444', fontSize: 13 }}
                >
                  SIGN OUT
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <a
                  href="/login"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    background: '#fff',
                    color: '#000',
                    padding: '10px 0',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  SIGN IN
                </a>
                <a
                  href="/signup"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    border: '1px solid #fff',
                    color: '#fff',
                    padding: '10px 0',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  REGISTER
                </a>
              </div>
            )}
          </div>

          <div style={{ marginTop: 28, borderTop: '1px solid #222', paddingTop: 20 }}>
            <div style={{ fontSize: 12, color: '#888', letterSpacing: 1.5, marginBottom: 16 }}>QUICK CATEGORIES</div>
            <button className="mobile-drawer-cat-btn" onClick={() => this.goToView('collections', { colFilter: 'all' })}>✦ All Products</button>
            <button className="mobile-drawer-cat-btn" onClick={() => this.goToView('collections', { colFilter: 'men' })}>✦ Men's Wear</button>
            <button className="mobile-drawer-cat-btn" onClick={() => this.goToView('collections', { colFilter: 'women' })}>✦ Women's Wear</button>
            <button className="mobile-drawer-cat-btn" onClick={() => this.goToView('collections', { colFilter: 'kids' })}>✦ Children's Wear</button>
          </div>
        </div>
        {mobileMenuOpen && <div className="mobile-nav-overlay" onClick={this.closeMobileMenu} />}
      </>
    );
  }

  footer() {
    return (
      <footer className="store-footer">
        <div className="store-footer-inner">
          <div className="store-footer-grid">
            <div>
              <div style={{ fontSize: 28, letterSpacing: 4, marginBottom: 12 }}>RAMROXA</div>
              <p style={{ color: '#888', fontSize: 13, lineHeight: 1.6, maxWidth: 320 }}>
                Objects for the everyday grid. Minimal garments made for longevity, utility and form. Designed in Kathmandu, shipped across Nepal.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, marginBottom: 16, color: '#aaa' }}>SHOP</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <span onClick={() => this.goToView('collections', { colFilter: 'all' })} style={{ cursor: 'pointer', color: '#888' }}>All collections</span>
                <span onClick={() => this.goToView('collections', { colFilter: 'men' })} style={{ cursor: 'pointer', color: '#888' }}>Men</span>
                <span onClick={() => this.goToView('collections', { colFilter: 'women' })} style={{ cursor: 'pointer', color: '#888' }}>Women</span>
                <span onClick={() => this.goToView('collections', { colFilter: 'kids' })} style={{ cursor: 'pointer', color: '#888' }}>Kids</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, marginBottom: 16, color: '#aaa' }}>HELP</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <span onClick={this.nav('contact')} style={{ cursor: 'pointer', color: '#888' }}>Contact us</span>
                <span onClick={this.nav('contact')} style={{ cursor: 'pointer', color: '#888' }}>Shipping policy</span>
                <span onClick={this.nav('contact')} style={{ cursor: 'pointer', color: '#888' }}>Returns & exchanges</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, marginBottom: 16, color: '#aaa' }}>PAYMENTS</div>
              <p style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>Cash on delivery across Nepal. eSewa and Fonepay accepted.</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #222', paddingTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', flexWrap: 'wrap', gap: 12 }}>
            <span>&copy; {new Date().getFullYear()} Zylo Pvt. Ltd. All rights reserved.</span>
            <span>Thamel, Kathmandu &middot; PAN: 601234567</span>
          </div>
          <div style={{ width: '100%', overflow: 'hidden', textAlign: 'center', marginTop: 32, opacity: 0.16, pointerEvents: 'none', userSelect: 'none' }}>
            <span style={{ fontFamily: "'Geist', sans-serif", fontSize: 'clamp(56px, 15vw, 210px)', fontWeight: 700, letterSpacing: 'clamp(8px, 2.5vw, 28px)', color: '#ffffff', lineHeight: 0.85, display: 'block' }}>
              ZYLO
            </span>
          </div>
        </div>
      </footer>
    );
  }

  renderHomeHero() {
    const { heroPreset = 'Arctic' } = this.state;
    const currentPreset = HERO_PRESETS.find((p) => p.key === heroPreset) || HERO_PRESETS[3];

    return (
      <section className="zylo-home-hero-full">
        <div
          key={currentPreset.key}
          className="zylo-home-hero-bg"
          style={{
            backgroundImage: `url('${asset(currentPreset.hash)}')`
          }}
        />
        <div className="zylo-home-hero-overlay" />

        {/* Center Content */}
        <div className="zylo-home-hero-center">
          <div className="zylo-hero-badge">
            <span className="zylo-hero-badge-tag">Soft</span>
            <span className="zylo-hero-badge-sub">Warm Winter Layers</span>
          </div>

          <h1 className="zylo-home-hero-title">
            Premium wear<br />for modern living
          </h1>

          <p className="zylo-home-hero-desc">
            Discover our new range of soft clothes made for your daily look and your best days with the finest fabrics.
          </p>

          <div className="zylo-home-hero-actions">
            <button
              onClick={this.nav('collections', 'all')}
              className="zylo-hero-btn-primary"
            >
              See all collections
            </button>
            <button
              onClick={this.nav('contact')}
              className="zylo-hero-btn-secondary"
            >
              Contact us
            </button>
          </div>
        </div>

        {/* Bottom Thumbnails Carousel */}
        <div className="zylo-home-hero-thumbnails-wrap">
          <div className="zylo-home-hero-thumbnails">
            {HERO_PRESETS.map((preset) => {
              const isActive = preset.key === heroPreset;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.setState({ heroPreset: preset.key });
                  }}
                  className={`zylo-hero-thumb-btn ${isActive ? 'active' : ''}`}
                  style={{
                    backgroundImage: `url('${asset(preset.hash)}')`
                  }}
                  title={`Switch background to ${preset.label}`}
                >
                  <span className="zylo-hero-thumb-label">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  renderCollections() {
    const {
      colFilter,
      filterPriceBucket,
      filterMinPrice,
      filterMaxPrice,
      debouncedMinPrice,
      debouncedMaxPrice,
      filterBrands,
      filterColors,
      sortBy,
      showMobileFilters
    } = this.state;

    const catList = this.getCatalog().map((p, idx) => ({
      ...p,
      idx,
      brand: p.brand || 'Ramroxa',
      gender: p.gender || 'Unisex',
      price: p.price || 0,
      colors: p.colors || p.options?.Colour || p.options?.Color || p.options?.colours || p.options?.colors || []
    }));

    // 1. Dynamic Brands List & Counts
    const allBrands = Array.from(new Set(catList.map(p => p.brand).filter(Boolean)));
    const brandCounts = allBrands.reduce((acc, b) => {
      acc[b] = catList.filter(p => p.brand === b).length;
      return acc;
    }, {});

    // 2. Dynamic Colors List & Counts
    const allColors = Array.from(
      new Set(
        catList.flatMap(p => (p.colors || []).map(c => String(c).trim())).filter(Boolean)
      )
    );
    const colorCounts = allColors.reduce((acc, col) => {
      acc[col] = catList.filter(p =>
        (p.colors || []).map(c => String(c).toLowerCase()).includes(String(col).toLowerCase())
      ).length;
      return acc;
    }, {});

    // 3. Dynamic Gender Counts
    const genderCounts = {
      all: catList.length,
      men: catList.filter(p => {
        const g = (p.gender || '').toLowerCase();
        const c = (p.category || p.categoryId || '').toLowerCase();
        return g === 'men' || g === 'unisex' || c.includes('men');
      }).length,
      women: catList.filter(p => {
        const g = (p.gender || '').toLowerCase();
        const c = (p.category || p.categoryId || '').toLowerCase();
        return g === 'women' || g === 'unisex' || c.includes('women');
      }).length,
      kids: catList.filter(p => {
        const g = (p.gender || '').toLowerCase();
        const c = (p.category || p.categoryId || '').toLowerCase();
        return g === 'kids' || c.includes('kids');
      }).length,
      unisex: catList.filter(p => (p.gender || '').toLowerCase() === 'unisex').length
    };

    // 4. Filter Items
    let items = catList.filter(p => {
      // Gender Filter
      if (colFilter && colFilter !== 'all') {
        const g = (p.gender || '').toLowerCase();
        const c = (p.category || p.categoryId || '').toLowerCase();
        if (colFilter === 'men' && !(g === 'men' || g === 'unisex' || c.includes('men'))) return false;
        if (colFilter === 'women' && !(g === 'women' || g === 'unisex' || c.includes('women'))) return false;
        if (colFilter === 'kids' && !(g === 'kids' || c.includes('kids'))) return false;
        if (colFilter === 'unisex' && g !== 'unisex') return false;
      }

      // Price Bucket Filter
      const price = p.price;
      if (filterPriceBucket === 'under-2000' && price >= 2000) return false;
      if (filterPriceBucket === '2000-5000' && (price < 2000 || price > 5000)) return false;
      if (filterPriceBucket === '5000-10000' && (price < 5000 || price > 10000)) return false;
      if (filterPriceBucket === 'above-10000' && price <= 10000) return false;

      // Custom Min/Max Price Filter
      const minVal = debouncedMinPrice !== '' ? Number(debouncedMinPrice) : null;
      const maxVal = debouncedMaxPrice !== '' ? Number(debouncedMaxPrice) : null;
      const hasValidMin = minVal !== null && !isNaN(minVal) && minVal > 0;
      const hasValidMax = maxVal !== null && !isNaN(maxVal) && maxVal > 0;
      const rangeInvalid = hasValidMin && hasValidMax && minVal > maxVal;
      if (!rangeInvalid) {
        if (hasValidMin && price < minVal) return false;
        if (hasValidMax && price > maxVal) return false;
      }

      // Brand Filter
      if (filterBrands && filterBrands.length > 0 && !filterBrands.includes(p.brand)) return false;

      // Color Filter
      if (filterColors && filterColors.length > 0) {
        const pCols = (p.colors || []).map(c => String(c).toLowerCase());
        const match = filterColors.some(c => pCols.includes(String(c).toLowerCase()));
        if (!match) return false;
      }

      return true;
    });

    // 5. Sort Items
    if (sortBy === 'price-asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price-desc') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'newest') {
      items.sort((a, b) => (b.labels?.newArrival ? 1 : 0) - (a.labels?.newArrival ? 1 : 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'bestselling') {
      items.sort((a, b) => (b.labels?.bestSelling ? 1 : 0) - (a.labels?.bestSelling ? 1 : 0));
    } else if (sortBy === 'name-asc') {
      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const hasActiveFilters = colFilter !== 'all' ||
      filterPriceBucket !== 'all' ||
      (filterBrands && filterBrands.length > 0) ||
      (filterColors && filterColors.length > 0) ||
      filterMinPrice !== '' ||
      filterMaxPrice !== '' ||
      debouncedMinPrice !== '' ||
      debouncedMaxPrice !== '';

    const renderFilterControls = () => (
      <div className="zylo-filter-sidebar-inner">
        <div className="zylo-filter-sidebar-header">
          <h3 className="zylo-filter-main-title">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={() => this.setState({
                colFilter: 'all',
                filterPriceBucket: 'all',
                filterMinPrice: '',
                filterMaxPrice: '',
                debouncedMinPrice: '',
                debouncedMaxPrice: '',
                filterBrands: [],
                filterColors: []
              })}
              className="zylo-filter-clear-btn"
            >
              Clear all
            </button>
          )}
        </div>

        {/* 1. Gender Filter */}
        <div className="zylo-filter-section">
          <h4 className="zylo-filter-section-title">Gender</h4>
          <div className="zylo-filter-options-list">
            {[
              { id: 'all', label: 'All Products', count: genderCounts.all },
              { id: 'men', label: 'Men', count: genderCounts.men },
              { id: 'women', label: 'Women', count: genderCounts.women },
              { id: 'kids', label: 'Kids', count: genderCounts.kids },
              { id: 'unisex', label: 'Unisex', count: genderCounts.unisex }
            ].map(({ id, label, count }) => (
              <label key={id} className={`zylo-filter-option-row ${colFilter === id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="sidebarColFilter"
                  checked={colFilter === id}
                  onChange={() => this.setState({ colFilter: id })}
                  className="zylo-filter-radio"
                />
                <span className="zylo-filter-option-name">{label}</span>
                <span className="zylo-filter-option-count">({count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* 2. Price Range Filter */}
        <div className="zylo-filter-section">
          <h4 className="zylo-filter-section-title">Price Range</h4>
          <div className="zylo-filter-options-list">
            {[
              { id: 'all', label: 'All Prices' },
              { id: 'under-2000', label: 'Under Rs 2,000' },
              { id: '2000-5000', label: 'Rs 2,000 – Rs 5,000' },
              { id: '5000-10000', label: 'Rs 5,000 – Rs 10,000' },
              { id: 'above-10000', label: 'Above Rs 10,000' }
            ].map(({ id, label }) => (
              <label key={id} className={`zylo-filter-option-row ${filterPriceBucket === id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="sidebarPriceBucket"
                  checked={filterPriceBucket === id}
                  onChange={() => this.setState({ filterPriceBucket: id, filterMinPrice: '', filterMaxPrice: '' })}
                  className="zylo-filter-radio"
                />
                <span className="zylo-filter-option-name">{label}</span>
              </label>
            ))}
          </div>

          {/* Custom Min / Max Price Inputs */}
          <div className="zylo-custom-price-block">
            <span className="zylo-custom-price-title">Custom Range (Rs)</span>
            <div className="zylo-custom-price-row">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={filterMinPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  this.setState({
                    filterMinPrice: val,
                    filterPriceBucket: (val !== '' || filterMaxPrice !== '') ? 'custom' : 'all'
                  });
                  clearTimeout(this._minPriceDebounce);
                  this._minPriceDebounce = setTimeout(() => {
                    this.setState({ debouncedMinPrice: val });
                  }, 600);
                }}
                className="zylo-price-input"
              />
              <span className="zylo-price-divider">–</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={filterMaxPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  this.setState({
                    filterMaxPrice: val,
                    filterPriceBucket: (filterMinPrice !== '' || val !== '') ? 'custom' : 'all'
                  });
                  clearTimeout(this._maxPriceDebounce);
                  this._maxPriceDebounce = setTimeout(() => {
                    this.setState({ debouncedMaxPrice: val });
                  }, 600);
                }}
                className="zylo-price-input"
              />
            </div>
          </div>
        </div>

        {/* 3. Brands Filter */}
        {allBrands.length > 0 && (
          <div className="zylo-filter-section">
            <h4 className="zylo-filter-section-title">Brands</h4>
            <div className="zylo-filter-options-list">
              {allBrands.map(brandName => {
                const isChecked = filterBrands.includes(brandName);
                return (
                  <label key={brandName} className={`zylo-filter-option-row ${isChecked ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? filterBrands.filter(b => b !== brandName)
                          : [...filterBrands, brandName];
                        this.setState({ filterBrands: next });
                      }}
                      className="zylo-filter-checkbox"
                    />
                    <span className="zylo-filter-option-name">{brandName}</span>
                    <span className="zylo-filter-option-count">({brandCounts[brandName] || 0})</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Color Filter */}
        {allColors.length > 0 && (
          <div className="zylo-filter-section">
            <h4 className="zylo-filter-section-title">Colour</h4>
            <div className="zylo-filter-options-list">
              {allColors.map(colName => {
                const isChecked = filterColors.includes(colName);
                const hex = COLOR_HEX_MAP[colName.toLowerCase()] || '#cccccc';
                return (
                  <label key={colName} className={`zylo-filter-option-row ${isChecked ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? filterColors.filter(c => c !== colName)
                          : [...filterColors, colName];
                        this.setState({ filterColors: next });
                      }}
                      className="zylo-filter-checkbox"
                    />
                    <span className="zylo-filter-option-name">
                      <span
                        className="zylo-color-swatch-dot"
                        style={{ backgroundColor: hex }}
                      />
                      {colName}
                    </span>
                    <span className="zylo-filter-option-count">({colorCounts[colName] || 0})</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );

    return (
      <div style={{ background: '#fff', width: '100%', margin: '0 auto', minHeight: 'calc(100vh - 60px)', boxSizing: 'border-box', padding: 0 }}>
        {/* Collections Hero */}
        <div className="zylo-collections-hero-fullwidth">
          <section className="zylo-collections-hero" style={{ background: `url('${asset('dbacea851225e2bf')}') 50% 30% / cover no-repeat #111` }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
            <div style={{ position: 'relative', textAlign: 'center', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 640 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, background: '#fff', color: '#000', borderRadius: 999, padding: '4px 12px' }}>Shop</span>
                <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '4px 12px' }}>The new season</span>
              </div>
              <h1 className="zylo-hero-title">Elevate your daily wardrobe with ease</h1>
              <p className="zylo-hero-sub">Explore our handpicked modern silhouettes crafted from sustainable fabrics.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => { const el = document.getElementById('zylo-shop-main'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); }}
                  style={{ ...font, fontSize: 13, background: '#fff', color: '#000', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
                >
                  Explore styles
                </button>
                <button
                  onClick={() => this.goToView('contact')}
                  style={{ ...font, fontSize: 13, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
                >
                  About us
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Collections Content Area */}
        <div className="zylo-collections-content">
        {/* Collections Toolbar: Results Title & Count on Left, Sort & Mobile Filters on Right */}
        <div id="zylo-shop-main" className="zylo-collections-toolbar">
          <div className="zylo-toolbar-left">
            <h2 className="zylo-toolbar-title">
              {colFilter === 'all' ? 'All Products' : (colFilter === 'men' ? "Men's Collection" : (colFilter === 'women' ? "Women's Collection" : (colFilter === 'kids' ? "Kids' Collection" : "Unisex Collection")))}
            </h2>
            <span className="zylo-toolbar-count">Showing {items.length} {items.length === 1 ? 'item' : 'items'}</span>
          </div>

          <div className="zylo-toolbar-right">
            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => this.setState({ showMobileFilters: true })}
              className="zylo-mobile-filter-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              <span>Filters {hasActiveFilters ? '•' : ''}</span>
            </button>

            {/* Top Right Sort Option */}
            <div className="zylo-sort-wrapper">
              <label htmlFor="zylo-sort-select" className="zylo-sort-label">Sort by:</label>
              <select
                id="zylo-sort-select"
                value={sortBy}
                onChange={(e) => this.setState({ sortBy: e.target.value })}
                className="zylo-sort-select"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
                <option value="bestselling">Best Sellers</option>
                <option value="name-asc">Product Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips / Pills */}
        {hasActiveFilters && (
          <div className="zylo-active-filter-chips">
            <span className="zylo-active-chips-label">Active Filters:</span>
            {colFilter !== 'all' && (
              <span className="zylo-filter-chip">
                Gender: {colFilter.toUpperCase()}
                <button onClick={() => this.setState({ colFilter: 'all' })}>&times;</button>
              </span>
            )}
            {filterPriceBucket !== 'all' && filterPriceBucket !== 'custom' && (
              <span className="zylo-filter-chip">
                Price: {filterPriceBucket.replace('-', ' to ').replace('under-', 'Under Rs ').replace('above-', 'Above Rs ')}
                <button onClick={() => this.setState({ filterPriceBucket: 'all' })}>&times;</button>
              </span>
            )}
            {(filterMinPrice !== '' || filterMaxPrice !== '' || debouncedMinPrice !== '' || debouncedMaxPrice !== '') && (
              <span className="zylo-filter-chip">
                Price: Rs {filterMinPrice || debouncedMinPrice || '0'} – Rs {filterMaxPrice || debouncedMaxPrice || '∞'}
                <button onClick={() => this.setState({ filterMinPrice: '', filterMaxPrice: '', debouncedMinPrice: '', debouncedMaxPrice: '', filterPriceBucket: 'all' })}>&times;</button>
              </span>
            )}
            {filterBrands.map(b => (
              <span key={b} className="zylo-filter-chip">
                Brand: {b}
                <button onClick={() => this.setState(s => ({ filterBrands: s.filterBrands.filter(brand => brand !== b) }))}>&times;</button>
              </span>
            ))}
            {filterColors.map(c => (
              <span key={c} className="zylo-filter-chip">
                Color: {c}
                <button onClick={() => this.setState(s => ({ filterColors: s.filterColors.filter(color => color !== c) }))}>&times;</button>
              </span>
            ))}
            <button
              onClick={() => this.setState({
                colFilter: 'all',
                filterPriceBucket: 'all',
                filterMinPrice: '',
                filterMaxPrice: '',
                debouncedMinPrice: '',
                debouncedMaxPrice: '',
                filterBrands: [],
                filterColors: []
              })}
              className="zylo-clear-all-chips-btn"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Main 2-Column Layout: Left Filters Sidebar + Right Product Grid */}
        <div className="zylo-shop-layout">
          {/* Desktop Left Sidebar */}
          <aside className="zylo-filter-sidebar">
            {renderFilterControls()}
          </aside>

          {/* Right Column: Products Grid */}
          <div className="zylo-shop-products-column">
            {items.length === 0 ? (
              <div className="zylo-no-products-box">
                <div className="zylo-no-products-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3>No products match your filters</h3>
                <p>Try adjusting your gender, price range, brand, or color criteria to see available items.</p>
                <button
                  onClick={() => this.setState({
                    colFilter: 'all',
                    filterPriceBucket: 'all',
                    filterMinPrice: '',
                    filterMaxPrice: '',
                    debouncedMinPrice: '',
                    debouncedMaxPrice: '',
                    filterBrands: [],
                    filterColors: []
                  })}
                  className="zylo-reset-filters-btn"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="zylo-products-grid">
                {items.map(p => {
                  const best = p.tag === 'BEST SELLER';
                  const pColors = (p.colors && p.colors.length > 0)
                    ? p.colors
                    : (p.options?.Colour || p.options?.Color || []);
                  return (
                    <div key={p.idx} onClick={() => this.openProduct(p.idx)} className="zylo-product-card">
                      <div className="zylo-product-img-wrap" style={{ background: img(p.img1), backgroundColor: '#eee' }}>
                        <span className={`zylo-product-tag-badge ${best ? 'best-seller' : 'new'}`}>
                          {best ? '★ Best seller' : (p.tag || '✦ New')}
                        </span>
                      </div>
                      <div className="zylo-product-card-body">
                        <div className="zylo-product-card-info">
                          <span className="zylo-product-brand-tag">{p.brand || 'Ramroxa'}</span>
                          <span className="zylo-product-name">{p.name}</span>
                          <div className="zylo-product-price-row">
                            <div className="zylo-product-prices">
                              <span className="zylo-product-price">{rs(p.price)}</span>
                              {p.compare > p.price && <span className="zylo-product-compare">{rs(p.compare)}</span>}
                            </div>
                            {pColors && pColors.length > 0 && (
                              <div className="zylo-card-color-swatches" title={`Available in: ${pColors.join(', ')}`}>
                                {pColors.map(col => {
                                  const hex = COLOR_HEX_MAP[String(col).toLowerCase().trim()] || '#333333';
                                  return (
                                    <span
                                      key={col}
                                      className="zylo-card-color-dot"
                                      style={{ backgroundColor: hex }}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </div>{/* end zylo-collections-content */}

        {/* Mobile Filter Slide-in Drawer Modal */}
        {showMobileFilters && (
          <div className="zylo-mobile-filter-modal-overlay" onClick={() => this.setState({ showMobileFilters: false })}>
            <div className="zylo-mobile-filter-modal" onClick={(e) => e.stopPropagation()}>
              <div className="zylo-mobile-filter-modal-header">
                <h3>Filters</h3>
                <button onClick={() => this.setState({ showMobileFilters: false })}>&times;</button>
              </div>
              <div className="zylo-mobile-filter-modal-body">
                {renderFilterControls()}
              </div>
              <div className="zylo-mobile-filter-modal-footer">
                <button
                  onClick={() => this.setState({ showMobileFilters: false })}
                  className="zylo-mobile-apply-btn"
                >
                  Show {items.length} {items.length === 1 ? 'Result' : 'Results'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  renderDetail() {
    const cat = this.getCatalog();
    const p = cat[this.state.sel] || cat[0];
    if (!p) {
      return (
        <main className="zylo-page-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2 style={{ fontSize: 28, fontWeight: 400, marginBottom: 12 }}>Product Not Found</h2>
          <button onClick={() => this.goToView('collections', { colFilter: 'all' })} style={pillBtn(true)}>Back to Shop</button>
        </main>
      );
    }
    const { selImg, selSize, selQty } = this.state;
    const thumbs = [p.img1, p.img2].filter(Boolean);
    const activeImg = thumbs[selImg] || p.img1;
    const discountPct = p.compare > p.price ? Math.round((1 - p.price / p.compare) * 100) : 0;

    return (
      <main className="zylo-page-container">
        <a
          onClick={() => this.goToView('collections', { colFilter: 'all' })}
          style={{
            ...font,
            fontSize: 13,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
            color: '#000',
            textDecoration: 'none'
          }}
        >
          &larr; Back to store
        </a>

        <div className="zylo-detail-grid">
          {/* Left Column: Images */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                aspectRatio: '368/420',
                width: '100%',
                maxHeight: 520,
                borderRadius: 12,
                background: img(activeImg),
                backgroundColor: '#eee',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                overflow: 'hidden'
              }}
            />
            {thumbs.length > 1 && (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {thumbs.map((t, i) => (
                  <div
                    key={i}
                    onClick={() => this.setState({ selImg: i })}
                    style={{
                      width: 68,
                      height: 78,
                      borderRadius: 8,
                      border: i === selImg ? '2px solid #000' : '1px solid #ddd',
                      background: img(t),
                      backgroundColor: '#eee',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: '#888', textTransform: 'uppercase' }}>
                {p.tag || 'BEST SELLER'}
              </div>
              <h1 style={{ margin: 0, fontSize: 34, fontWeight: 400, letterSpacing: 0.5, lineHeight: 1.2 }}>
                {p.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 600 }}>{rs(p.price)}</span>
                {p.compare > p.price && (
                  <span style={{ fontSize: 15, color: '#a1a1a1', textDecoration: 'line-through' }}>
                    {rs(p.compare)}
                  </span>
                )}
                {discountPct > 0 && (
                  <span style={{ fontSize: 12, border: '1px solid #000', borderRadius: 999, padding: '2px 10px', fontWeight: 500 }}>
                    {discountPct}% OFF
                  </span>
                )}
              </div>
            </div>

            <div
              className="rich-text-desc"
              style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#444' }}
              dangerouslySetInnerHTML={{ __html: p.desc }}
            />

            {/* Size Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, letterSpacing: 2, color: '#888' }}>SIZE</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['S', 'M', 'L', 'XL'].map(sz => (
                  <button
                    key={sz}
                    onClick={() => this.setState({ selSize: sz })}
                    style={{
                      ...font,
                      fontSize: 14,
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      cursor: 'pointer',
                      border: sz === selSize ? '1px solid #000' : '1px solid #ccc',
                      background: sz === selSize ? '#000' : '#fff',
                      color: sz === selSize ? '#fff' : '#000',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Stepper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, letterSpacing: 2, color: '#888' }}>QUANTITY</div>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #000', borderRadius: 999, width: 'fit-content' }}>
                <button
                  onClick={() => this.setState(st => ({ selQty: Math.max(1, st.selQty - 1) }))}
                  style={{ ...font, fontSize: 18, width: 40, height: 40, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  −
                </button>
                <span style={{ minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: 500 }}>{selQty}</span>
                <button
                  onClick={() => this.setState(st => ({ selQty: st.selQty + 1 }))}
                  style={{ ...font, fontSize: 18, width: 40, height: 40, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="zylo-detail-actions">
              <button
                onClick={() => this.addLine(false)}
                style={{ ...pillBtn(true), flex: 1, padding: '14px 16px', fontSize: 14, textAlign: 'center' }}
              >
                Add to cart — {rs(p.price * selQty)}
              </button>
              <button
                onClick={() => this.addLine(true)}
                style={{ ...pillBtn(false), flex: 1, padding: '14px 16px', fontSize: 14, textAlign: 'center' }}
              >
                Buy now
              </button>
            </div>

            {/* Feature bullets */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#6e6e6e' }}>
              <span>— Free delivery on orders over Rs 5,000</span>
              <span>— Ships across Nepal in 2–4 days</span>
              <span>— Pay by Cash on Delivery, eSewa or Fonepay</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  renderCart() {
    const { cart } = this.state;
    const { subtotal, delivery, total } = this.totals();
    const cat = this.getCatalog();
    if (!cart.length) {
      return (
        <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
          <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 12 }}>YOUR CART IS EMPTY</h2>
          <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>Explore our latest collection of garments built for longevity.</p>
          <button onClick={() => this.goToView('collections', { colFilter: 'all' })} style={pillBtn(true)}>SHOP NOW</button>
        </div>
      );
    }
    return (
      <div style={{ width: '100%', maxWidth: 1188, margin: '0 auto', padding: '48px 24px', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: 36, fontWeight: 400, marginBottom: 28 }}>SHOPPING CART</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 40 }}>
          <div>
            {cart.map((l, i) => {
              const p = cat[l.idx] || { name: 'Item', price: 0, img1: '' };
              return (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid #e0e0e0', alignItems: 'center' }}>
                  <div style={{ width: 70, height: 90, background: img(p.img1), borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#888', margin: '2px 0 6px' }}>Size: {l.size}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{rs(p.price)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => this.bump(i, -1)} style={{ width: 28, height: 28, border: '1px solid #000', borderRadius: 4, background: '#fff', cursor: 'pointer', ...font }}>-</button>
                    <span style={{ minWidth: 18, textAlign: 'center', fontSize: 13 }}>{l.qty}</span>
                    <button onClick={() => this.bump(i, 1)} style={{ width: 28, height: 28, border: '1px solid #000', borderRadius: 4, background: '#fff', cursor: 'pointer', ...font }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background: '#f5f5f5', padding: 24, borderRadius: 12, height: 'fit-content' }}>
            <h3 style={{ fontSize: 18, margin: '0 0 16px', fontWeight: 500 }}>ORDER SUMMARY</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
              <span>Subtotal</span><span>{rs(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14 }}>
              <span>Delivery</span><span>{delivery === 0 ? 'FREE' : rs(delivery)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: 16, marginBottom: 24, fontSize: 18, fontWeight: 700 }}>
              <span>Total</span><span>{rs(total)}</span>
            </div>
            <button onClick={() => this.goToView('checkout')} style={{ ...pillBtn(true), width: '100%', textAlign: 'center' }}>PROCEED TO CHECKOUT</button>
          </div>
        </div>
      </div>
    );
  }

  renderCheckout() {
    const { cart, pay, cName, cPhone, cAddress, cCity } = this.state;
    const { subtotal, delivery, total } = this.totals();
    const cat = this.getCatalog();

    if (!cart.length || subtotal <= 0) {
      return (
        <div style={{ width: '100%', maxWidth: 1188, margin: '80px auto', textAlign: 'center', padding: '0 24px', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 12 }}>YOUR CART IS EMPTY</h2>
          <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>Please add items to your cart before proceeding to checkout.</p>
          <button onClick={() => this.goToView('collections', { colFilter: 'all' })} style={pillBtn(true)}>DISCOVER GARMENTS</button>
        </div>
      );
    }

    return (
      <div style={{ width: '100%', maxWidth: 1188, margin: '0 auto', padding: '48px 24px', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: 36, fontWeight: 400, marginBottom: 32 }}>CHECKOUT</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40, alignItems: 'start' }}>
          {/* Left: Customer & Shipping Details */}
          <div>
            <div style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, letterSpacing: 0.5 }}>1. SHIPPING & CONTACT</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6, fontWeight: 600 }}>FULL NAME *</label>
                  <input
                    value={cName}
                    onChange={e => this.setState({ cName: e.target.value })}
                    placeholder="e.g. Aarav Sharma"
                    style={{ ...input, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6, fontWeight: 600 }}>PHONE NUMBER *</label>
                  <input
                    value={cPhone}
                    onChange={e => this.setState({ cPhone: e.target.value })}
                    placeholder="e.g. 9801234567"
                    style={{ ...input, width: '100%' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6, fontWeight: 600 }}>CITY / DISTRICT</label>
                    <input
                      value={cCity}
                      onChange={e => this.setState({ cCity: e.target.value })}
                      placeholder="Kathmandu"
                      style={{ ...input, width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6, fontWeight: 600 }}>STREET / LANDMARK</label>
                    <input
                      value={cAddress}
                      onChange={e => this.setState({ cAddress: e.target.value })}
                      placeholder="e.g. Durbar Marg, House 12"
                      style={{ ...input, width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, letterSpacing: 0.5 }}>2. PAYMENT METHOD</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {METHODS.map(m => (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 14,
                      border: pay === m.id ? '2px solid #000' : '1px solid #ddd',
                      borderRadius: 8,
                      background: pay === m.id ? '#000' : '#fff',
                      color: pay === m.id ? '#fff' : '#000',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="pay"
                      checked={pay === m.id}
                      onChange={() => this.setState({ pay: m.id })}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: pay === m.id ? '#ccc' : '#666', marginTop: 2 }}>{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order Summary & Place Button */}
          <div style={{ background: '#f9f9f9', border: '1px solid #eaeaea', padding: 24, borderRadius: 12, position: 'sticky', top: 80 }}>
            <h3 style={{ fontSize: 18, margin: '0 0 16px', fontWeight: 600 }}>ORDER ITEMS ({cart.reduce((s, l) => s + l.qty, 0)})</h3>
            <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16, borderBottom: '1px solid #e0e0e0', paddingBottom: 8 }}>
              {cart.map((l, i) => {
                const p = cat[l.idx] || { name: 'Item', price: 0, img1: '' };
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', alignItems: 'center' }}>
                    <div style={{ width: 44, height: 56, background: img(p.img1), borderRadius: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>Size: {l.size} &times; {l.qty}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{rs(p.price * l.qty)}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
              <span>Subtotal</span>
              <span>{rs(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14 }}>
              <span>Delivery</span>
              <span style={{ color: delivery === 0 ? '#10b981' : '#000', fontWeight: delivery === 0 ? 600 : 400 }}>
                {delivery === 0 ? 'FREE' : rs(delivery)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: 16, marginBottom: 24, fontSize: 18, fontWeight: 700 }}>
              <span>Total Due</span>
              <span>{rs(total)}</span>
            </div>
            <button
              onClick={this.placeOrder}
              style={{
                ...pillBtn(true),
                width: '100%',
                textAlign: 'center',
                padding: '16px 20px',
                fontSize: 14,
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              CONFIRM ORDER &rarr;
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 12 }}>
              Secure checkout &bull; Instant order confirmation
            </p>
          </div>
        </div>
      </div>
    );
  }

  renderConfirmed() {
    const { orderId, orderTotal } = this.state;
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
        <span style={{ fontSize: 48 }}>✓</span>
        <h1 style={{ fontSize: 36, fontWeight: 400, margin: '16px 0 8px' }}>ORDER CONFIRMED</h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>Order #{orderId || 'ZY-104928'} has been received.</p>
        <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 12, marginBottom: 28, fontSize: 15 }}>
          <div>Total: <strong>{rs(orderTotal || 3800)}</strong></div>
          <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>You will receive an SMS confirmation before delivery.</div>
        </div>
        <button onClick={() => this.goToView('shop')} style={pillBtn(true)}>BACK TO HOME</button>
      </div>
    );
  }

  submitContact = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!this.state.cName.trim()) {
      this.showToast('Please enter your name');
      return;
    }
    if (!this.state.cPhone.trim() && !this.state.cEmail.trim()) {
      this.showToast('Please provide a phone number or email');
      return;
    }
    this.setState({ contactSent: true });
    this.showToast('Message sent successfully!');
  };

  renderContact() {
    const { cName, cPhone, cEmail, cOrderNo, cMsg, cTopic, contactSent, activeFaq } = this.state;
    const topics = [
      'Order status & tracking',
      'Returns & exchanges',
      'Size & fit guidance',
      'Wholesale & custom',
      'General inquiry'
    ];

    const faqs = [
      {
        q: 'How long does shipping take across Nepal?',
        a: 'Orders inside Kathmandu Valley are typically delivered within 24 to 48 hours. Outside valley orders are shipped via express courier and arrive in 2 to 4 business days.'
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept Cash on Delivery (COD) across all major cities and districts in Nepal. We also accept instant digital payments via eSewa and Fonepay.'
      },
      {
        q: 'What is your return & exchange policy?',
        a: 'We offer an easy 7-day exchange policy for unwashed, unworn garments with original tags attached. Reach out with your Order ID to initiate an exchange.'
      },
      {
        q: 'Can I visit your physical showroom in Kathmandu?',
        a: 'Yes! Our flagship showroom in Thamel, Kathmandu is open 7 days a week for in-person fittings, product previews, and direct order pickups.'
      }
    ];

    return (
      <div style={{ width: '100%', maxWidth: 1188, margin: '0 auto', padding: '48px 24px', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: 36 }}>
          <span style={{ fontSize: 11, letterSpacing: 2, background: '#000', color: '#fff', padding: '4px 12px', borderRadius: 999, display: 'inline-block', marginBottom: 12 }}>
            CUSTOMER SUPPORT & INQUIRIES
          </span>
          <h1 style={{ fontSize: 40, margin: '0 0 10px', fontWeight: 400, letterSpacing: 1 }}>CONTACT ZYLO</h1>
          <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
            Have questions about an existing order, sizing guidance, custom orders, or wholesale? Our Kathmandu team is here to assist you.
          </p>
        </div>

        <div className="resp-contact-grid">
          {/* Left Column: Interactive Contact Form or Confirmation */}
          <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: 16, padding: '32px 28px' }}>
            {contactSent ? (
              <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>
                  ✓
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 500, margin: '0 0 12px' }}>Message Received</h2>
                <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6, maxWidth: 440, margin: '0 auto 24px' }}>
                  Thank you, <strong>{cName}</strong>. We have received your inquiry regarding <strong>{cTopic}</strong>. Our team will contact you via phone or WhatsApp shortly.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => this.setState({ contactSent: false, cName: '', cPhone: '', cEmail: '', cOrderNo: '', cMsg: '' })}
                    style={{ ...pillBtn(false), fontSize: 13, padding: '10px 22px' }}
                  >
                    SEND ANOTHER MESSAGE
                  </button>
                  <button
                    onClick={() => this.goToView('shop')}
                    style={{ ...pillBtn(true), fontSize: 13, padding: '10px 22px' }}
                  >
                    CONTINUE SHOPPING
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={this.submitContact} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 12, letterSpacing: 1.2, fontWeight: 600, display: 'block', marginBottom: 8, color: '#333' }}>
                    INQUIRY TOPIC
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {topics.map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => this.setState({ cTopic: t })}
                        style={{
                          ...font,
                          fontSize: 12,
                          padding: '7px 14px',
                          borderRadius: 999,
                          cursor: 'pointer',
                          border: cTopic === t ? '1px solid #000' : '1px solid #ddd',
                          background: cTopic === t ? '#000' : '#fff',
                          color: cTopic === t ? '#fff' : '#444',
                          transition: 'all 0.15s'
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="resp-form-2col">
                  <div>
                    <label style={{ fontSize: 12, letterSpacing: 1.2, fontWeight: 600, display: 'block', marginBottom: 6, color: '#333' }}>
                      FULL NAME <span style={{ color: '#e53935' }}>*</span>
                    </label>
                    <input
                      value={cName}
                      onChange={e => this.setState({ cName: e.target.value })}
                      placeholder="e.g. Aarav Sharma"
                      style={{ ...input, width: '100%' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, letterSpacing: 1.2, fontWeight: 600, display: 'block', marginBottom: 6, color: '#333' }}>
                      PHONE NUMBER <span style={{ color: '#e53935' }}>*</span>
                    </label>
                    <input
                      value={cPhone}
                      onChange={e => this.setState({ cPhone: e.target.value })}
                      placeholder="e.g. +977 9801234567"
                      style={{ ...input, width: '100%' }}
                      required
                    />
                  </div>
                </div>

                <div className="resp-form-2col">
                  <div>
                    <label style={{ fontSize: 12, letterSpacing: 1.2, fontWeight: 600, display: 'block', marginBottom: 6, color: '#333' }}>
                      EMAIL ADDRESS
                    </label>
                    <input
                      type="email"
                      value={cEmail}
                      onChange={e => this.setState({ cEmail: e.target.value })}
                      placeholder="e.g. aarav@example.com"
                      style={{ ...input, width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, letterSpacing: 1.2, fontWeight: 600, display: 'block', marginBottom: 6, color: '#333' }}>
                      ORDER NUMBER (OPTIONAL)
                    </label>
                    <input
                      value={cOrderNo}
                      onChange={e => this.setState({ cOrderNo: e.target.value })}
                      placeholder="e.g. ZY-104928"
                      style={{ ...input, width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, letterSpacing: 1.2, fontWeight: 600, display: 'block', marginBottom: 6, color: '#333' }}>
                    YOUR MESSAGE <span style={{ color: '#e53935' }}>*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={cMsg}
                    onChange={e => this.setState({ cMsg: e.target.value })}
                    placeholder="Provide details about your query, sizing questions, or order requirements..."
                    style={{ ...input, width: '100%', height: 'auto', resize: 'vertical' }}
                    required
                  />
                </div>

                <button type="submit" style={{ ...pillBtn(true), width: '100%', marginTop: 6, fontWeight: 600 }}>
                  SUBMIT INQUIRY &rarr;
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Studio, Direct Channels & Support Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Showroom Card */}
            <div style={{ background: '#000', color: '#fff', borderRadius: 16, padding: '28px 24px' }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: '#aaa', marginBottom: 8 }}>FLAGSHIP STUDIO</div>
              <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 12, letterSpacing: 1 }}>RAMROXA SHOWROOM</div>
              <div style={{ fontSize: 13, color: '#bbb', lineHeight: 1.6, marginBottom: 16 }}>
                Thamel Marg, Ward 29<br />
                Kathmandu 44600, Nepal<br />
                <span style={{ color: '#888', fontSize: 12 }}>(Near Garden of Dreams)</span>
              </div>
              <div style={{ borderTop: '1px solid #262626', paddingTop: 14, fontSize: 12, color: '#aaa', lineHeight: 1.6 }}>
                <div><strong>Sunday – Friday:</strong> 10:00 AM – 8:00 PM</div>
                <div><strong>Saturday:</strong> 11:00 AM – 6:00 PM</div>
              </div>
            </div>

            {/* Quick Contact Lines */}
            <div style={{ border: '1px solid #e5e5e5', borderRadius: 16, padding: '24px', background: '#fff' }}>
              <div style={{ fontSize: 12, letterSpacing: 1.5, fontWeight: 700, marginBottom: 16 }}>DIRECT CHANNELS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Phone / Hotline:</span>
                  <a href="tel:+97714123456" style={{ fontWeight: 600, color: '#000', textDecoration: 'none' }}>+977 1-4123456</a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>WhatsApp Support:</span>
                  <a href="https://wa.me/9779801234567" target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: '#000', textDecoration: 'none' }}>+977 9801234567</a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Inquiry Email:</span>
                  <a href="mailto:hello@ramroxa.com.np" style={{ fontWeight: 600, color: '#000', textDecoration: 'none' }}>hello@ramroxa.com.np</a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Tax / PAN:</span>
                  <span style={{ fontWeight: 600, color: '#000' }}>601234567</span>
                </div>
              </div>
            </div>

            {/* Service Highlights */}
            <div style={{ background: '#f5f5f5', borderRadius: 16, padding: '20px 24px', fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span><strong>Free delivery</strong> across Nepal on orders over Rs 5,000</span>
              </div>
              <div>
                <span><strong>Flexible Payments:</strong> Cash on Delivery, eSewa & Fonepay</span>
              </div>
              <div>
                <span><strong>7-Day Easy Exchange:</strong> Hassle-free sizing exchanges</span>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs Section */}
        <div style={{ marginTop: 56, borderTop: '1px solid #eaeaea', paddingTop: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, color: '#888' }}>HELP & ANSWERS</span>
            <h2 style={{ fontSize: 28, fontWeight: 400, margin: '6px 0 0' }}>FREQUENTLY ASKED QUESTIONS</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid #e8e8e8',
                  borderRadius: 12,
                  padding: '20px 22px',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border-color 0.2s'
                }}
                onClick={() => this.setState({ activeFaq: activeFaq === idx ? null : idx })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111', lineHeight: 1.4 }}>{faq.q}</div>
                  <span style={{ fontSize: 16, color: '#888', flexShrink: 0 }}>{activeFaq === idx ? '−' : '+'}</span>
                </div>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginTop: 10, display: activeFaq === idx ? 'block' : 'none' }}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  renderAccount = () => {
    const { currentUser, accountTab, userOrders, loadingOrders, savingProfile, profileName, profilePhone, profilePermanentAddress, profileTemporaryAddress } = this.state;

    if (!currentUser) {
      return (
        <div style={{ maxWidth: 640, margin: '60px auto 100px auto', padding: '0 20px', textAlign: 'center' }}>
          <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 16, padding: '48px 32px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', letterSpacing: 0.5 }}>Sign In to Your Account</h2>
            <p style={{ fontSize: 14, color: '#666', margin: '0 0 28px 0', lineHeight: 1.6 }}>
              View your order history, track past purchases, manage your delivery addresses, and update your personal information.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 280, margin: '0 auto' }}>
              <a
                href="/login"
                style={{
                  display: 'block',
                  background: '#000',
                  color: '#fff',
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  textDecoration: 'none',
                  textAlign: 'center'
                }}
              >
                SIGN IN
              </a>
              <a
                href="/signup"
                style={{
                  display: 'block',
                  background: '#fff',
                  color: '#000',
                  border: '1px solid #000',
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  textDecoration: 'none',
                  textAlign: 'center'
                }}
              >
                CREATE AN ACCOUNT
              </a>
            </div>
          </div>
        </div>
      );
    }

    const initials = (currentUser.name || 'Member')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const activeTab = accountTab || 'orders';

    return (
      <div style={{ maxWidth: 1080, width: '100%', margin: '0 auto', padding: '40px 20px 80px 20px' }}>
        {/* Back Link */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => this.goToView('shop')}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
          >
            &larr; Back to Shopping
          </button>
        </div>

        {/* User Hero Header Card */}
        <div style={{
          background: '#fff',
          border: '1px solid #e5e5e5',
          borderRadius: 16,
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          marginBottom: 32
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#000',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 0.5, color: '#111' }}>
                  {currentUser.name}
                </h1>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#f0f0f0', color: '#444', padding: '3px 8px', borderRadius: 999, letterSpacing: 1 }}>
                  {currentUser.role === 'admin' ? 'ADMIN' : 'VERIFIED MEMBER'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
                {currentUser.email} {currentUser.phone ? `• ${currentUser.phone}` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={this.handleLogout}
              style={{
                background: '#fff',
                border: '1px solid #e5e5e5',
                color: '#b91c1c',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e5e5'; }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: 10,
          borderBottom: '1px solid #e5e5e5',
          marginBottom: 32,
          overflowX: 'auto',
          paddingBottom: 4
        }}>
          <button
            onClick={() => { this.goToView('account', { accountTab: 'orders' }); this.loadUserOrders(); }}
            style={{
              background: activeTab === 'orders' ? '#000' : '#f5f5f5',
              color: activeTab === 'orders' ? '#fff' : '#444',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              padding: '12px 20px',
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: 0.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <span>Orders &amp; Purchases</span>
            <span style={{
              background: activeTab === 'orders' ? 'rgba(255,255,255,0.25)' : '#e5e5e5',
              color: activeTab === 'orders' ? '#fff' : '#222',
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 999,
              fontWeight: 700
            }}>
              {userOrders.length}
            </span>
          </button>

          <button
            onClick={() => this.goToView('account', { accountTab: 'profile' })}
            style={{
              background: activeTab === 'profile' ? '#000' : '#f5f5f5',
              color: activeTab === 'profile' ? '#fff' : '#444',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              padding: '12px 20px',
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: 0.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <span>Personal Profile</span>
          </button>

          <button
            onClick={() => this.goToView('account', { accountTab: 'addresses' })}
            style={{
              background: activeTab === 'addresses' ? '#000' : '#f5f5f5',
              color: activeTab === 'addresses' ? '#fff' : '#444',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              padding: '12px 20px',
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: 0.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <span>Saved Addresses</span>
          </button>
        </div>

        {/* Tab 1: Orders & Purchases */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111' }}>Your Order History</h2>
                <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Track, view, and manage all your past orders.</p>
              </div>
              <button
                onClick={this.loadUserOrders}
                style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Refresh
              </button>
            </div>

            {loadingOrders ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: 16 }}>
                <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Loading your orders...</p>
              </div>
            ) : userOrders.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#fff',
                border: '1px solid #e5e5e5',
                borderRadius: 16,
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
              }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px 0', color: '#111' }}>No orders placed yet</h3>
                <p style={{ fontSize: 13, color: '#666', maxWidth: 400, margin: '0 auto 20px auto', lineHeight: 1.5 }}>
                  You have not placed any orders yet. Discover our curated collections and place your first order today!
                </p>
                <button
                  onClick={() => this.goToView('shop')}
                  style={{
                    background: '#000',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 24px',
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: 1,
                    cursor: 'pointer'
                  }}
                >
                  START SHOPPING &rarr;
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {userOrders.map((ord) => {
                  const statusColors = {
                    delivered: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', label: 'DELIVERED' },
                    shipped: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', label: 'SHIPPED' },
                    processing: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', label: 'PROCESSING' },
                    confirmed: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe', label: 'CONFIRMED' },
                    pending: { bg: '#fef9c3', text: '#854d0e', border: '#fde047', label: 'PENDING' },
                    cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', label: 'CANCELLED' }
                  };
                  const st = statusColors[(ord.fulfillmentStatus || 'pending').toLowerCase()] || statusColors.pending;
                  const orderDate = ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
                  const totalNpr = ord.grandTotal !== undefined ? (ord.grandTotal / 100) : (ord.total || 0);

                  return (
                    <div key={ord._id || ord.orderNo} style={{
                      background: '#fff',
                      border: '1px solid #e5e5e5',
                      borderRadius: 14,
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                    }}>
                      {/* Order Header */}
                      <div style={{
                        background: '#fafafa',
                        borderBottom: '1px solid #e5e5e5',
                        padding: '14px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', letterSpacing: 0.5 }}>ORDER NUMBER</span>
                            <strong style={{ fontSize: 14, color: '#111' }}>{ord.orderNo}</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', letterSpacing: 0.5 }}>ORDER DATE</span>
                            <span style={{ fontSize: 13, color: '#333' }}>{orderDate}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', letterSpacing: 0.5 }}>PAYMENT METHOD</span>
                            <span style={{ fontSize: 13, color: '#333', textTransform: 'uppercase' }}>{ord.paymentMethod || 'COD'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{
                            background: st.bg,
                            color: st.text,
                            border: `1px solid ${st.border}`,
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: 0.5
                          }}>
                            {st.label}
                          </span>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
                          {(ord.items || []).map((it, idx) => {
                            const itemPrice = it.price !== undefined ? (it.price / 100) : (it.unitPrice || 0);
                            const itemImg = it.image || it.img || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300';
                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: idx < ord.items.length - 1 ? '1px solid #f0f0f0' : 'none', paddingBottom: idx < ord.items.length - 1 ? 14 : 0 }}>
                                <div style={{
                                  width: 54,
                                  height: 68,
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  background: '#f5f5f5',
                                  flexShrink: 0
                                }}>
                                  <img src={itemImg} alt={it.name || 'Item'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111' }}>{it.name || 'Zylo Garment'}</h4>
                                  <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>
                                    {it.size ? `Size: ${it.size} • ` : ''}Quantity: {it.qty || 1}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <strong style={{ fontSize: 14, color: '#111' }}>{rs(itemPrice * (it.qty || 1))}</strong>
                                  <div style={{ fontSize: 11, color: '#888' }}>{rs(itemPrice)} each</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Order Address & Totals Footer */}
                        <div style={{
                          borderTop: '1px solid #eee',
                          paddingTop: 14,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          flexWrap: 'wrap',
                          gap: 16
                        }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', letterSpacing: 0.5 }}>SHIPPING TO</span>
                            <div style={{ fontSize: 12.5, color: '#333', marginTop: 2 }}>
                              <strong>{ord.shippingAddress?.fullName || currentUser.name}</strong> • {ord.shippingAddress?.phone || currentUser.phone}
                            </div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              {ord.shippingAddress?.address1 || ord.shippingAddress?.street || ord.shippingAddress?.line1}, {ord.shippingAddress?.city || 'Nepal'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', letterSpacing: 0.5 }}>GRAND TOTAL</span>
                              <span style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>{rs(totalNpr)}</span>
                            </div>

                            <button
                              onClick={() => {
                                const newItems = (ord.items || []).map(i => ({
                                  id: i.productId || i.id,
                                  idx: 0,
                                  name: i.name,
                                  size: i.size || 'M',
                                  price: i.price !== undefined ? Math.round(i.price / 100) : (i.unitPrice || 0),
                                  qty: i.qty || 1,
                                  img: i.image || i.img
                                }));
                                this.setState(s => ({
                                  cart: [...s.cart, ...newItems],
                                  toast: `Added ${newItems.length} items to cart!`
                                }));
                                saveStoredCart([...this.state.cart, ...newItems]);
                                setTimeout(() => this.setState({ toast: null }), 3000);
                              }}
                              style={{
                                background: '#000',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '8px 16px',
                                fontSize: 12,
                                fontWeight: 600,
                                letterSpacing: 0.5,
                                cursor: 'pointer'
                              }}
                            >
                              BUY AGAIN
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Personal Profile */}
        {activeTab === 'profile' && (
          <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 16, padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ marginBottom: 24, borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111' }}>Personal Information</h2>
              <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Manage your basic profile information and contact details.</p>
            </div>

            <form onSubmit={this.handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 540 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => this.setState({ profileName: e.target.value })}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #d4d4d4',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #e5e5e5',
                    fontSize: 14,
                    background: '#f9f9f9',
                    color: '#666',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'not-allowed'
                  }}
                />
                <span style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'block' }}>Email address is registered to this account.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                  PHONE NUMBER
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9801234567"
                  value={profilePhone}
                  onChange={(e) => this.setState({ profilePhone: e.target.value })}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #d4d4d4',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ paddingTop: 10 }}>
                <button
                  type="submit"
                  disabled={savingProfile}
                  style={{
                    background: savingProfile ? '#666' : '#000',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 28px',
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: 1.5,
                    cursor: savingProfile ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingProfile ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Saved Addresses */}
        {activeTab === 'addresses' && (
          <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 16, padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ marginBottom: 24, borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111' }}>Saved Delivery Addresses</h2>
              <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Keep your shipping addresses up to date for rapid checkout.</p>
            </div>

            <form onSubmit={this.handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 540 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                  PERMANENT ADDRESS
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ward 4, Baluwatar, Kathmandu"
                  value={profilePermanentAddress}
                  onChange={(e) => this.setState({ profilePermanentAddress: e.target.value })}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #d4d4d4',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                  TEMPORARY / CURRENT DELIVERY ADDRESS
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pulchowk, Lalitpur (Opposite Labim Mall)"
                  value={profileTemporaryAddress}
                  onChange={(e) => this.setState({ profileTemporaryAddress: e.target.value })}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #d4d4d4',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ paddingTop: 10 }}>
                <button
                  type="submit"
                  disabled={savingProfile}
                  style={{
                    background: savingProfile ? '#666' : '#000',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 28px',
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: 1.5,
                    cursor: savingProfile ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingProfile ? 'SAVING...' : 'SAVE ADDRESSES'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  };

  render() {
    const { view, toast, landingScale } = this.state;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', ...font, background: '#fff', color: '#000', width: '100%', overflowX: 'hidden' }}>
        {toast && (
          <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#000', color: '#fff', padding: '12px 20px', borderRadius: 999, fontSize: 13, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            {toast}
          </div>
        )}
        {this.header()}
        <main style={{ flex: 1, width: '100%', overflowX: 'hidden' }}>
          {view === 'shop' && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', background: '#ffffff' }}>
              {this.renderHomeHero()}
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%', overflow: 'hidden', background: '#ffffff' }}>
                <div style={{ width: `${1188 * landingScale}px`, height: `${(8280 - 616) * landingScale}px`, flexShrink: 0, position: 'relative', overflow: 'hidden', background: '#ffffff' }}>
                  <div style={{ width: '1188px', height: '8280px', transform: `scale(${landingScale})`, transformOrigin: 'top left', position: 'absolute', top: `${-616 * landingScale}px`, left: 0, background: '#ffffff' }}>
                    <Landing />
                  </div>
                </div>
              </div>
            </div>
          )}
          {view === 'collections' && this.renderCollections()}
          {view === 'detail' && this.renderDetail()}
          {view === 'cart' && this.renderCart()}
          {view === 'checkout' && this.renderCheckout()}
          {view === 'confirmed' && this.renderConfirmed()}
          {view === 'contact' && this.renderContact()}
          {view === 'account' && this.renderAccount()}
        </main>
        {this.footer()}
      </div>
    );
  }
}

