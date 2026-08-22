'use client';
import React from 'react';
import Landing from './Landing';
import { placeOrderApi } from '../services/orderService';
import { fetchProducts } from '../services/productService';

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
    price: priceNpr,
    compare: mrpNpr || priceNpr,
    desc: p.description || '',
    img1: featuredImg?.url || p.img1 || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
    img2: secondImg?.url || p.img2 || featuredImg?.url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
    slug: p.slug || slugForProduct(p, 0),
    gender: p.gender || 'Unisex',
    category: p.category || p.categoryId || '',
    categoryId: p.categoryId || '',
    tags: p.tags || [],
    options: p.options || {},
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
const font = { fontFamily: "'Share Tech', sans-serif" };
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
      colFilter: 'all',
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
      confirmed: '/order-confirmed'
    };

    let targetUrl = urlMap[v] || '/';
    if (v === 'detail') {
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
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('zylo_user');
          if (stored) {
            this.setState({ currentUser: JSON.parse(stored) });
          }
        }
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.data?.user) {
            this.setState({ currentUser: meData.data.user });
            if (typeof window !== 'undefined') {
              localStorage.setItem('zylo_user', JSON.stringify(meData.data.user));
            }
          }
        }
      } catch (e) {}
    };
    checkAuthSession();

    this.updateLandingScale = () => {
      if (typeof window === 'undefined') return;
      const vw = window.innerWidth;
      const scale = Math.min(1, Math.max(0.2, vw / 1188));
      if (Math.abs(scale - (this.state.landingScale || 1)) > 0.005) {
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
        const hero = [...document.querySelectorAll('div')].find(d => d.style.width === '1188px' && d.style.height === '616px' && (d.style.background || '').includes('/assets/'));
        if (hero) {
          hero.style.transition = 'opacity 0.25s';
          hero.style.opacity = '0.15';
          setTimeout(() => { hero.style.background = `url('${asset(HERO_SWAP[label])}') 50% 30% / cover no-repeat`; hero.style.opacity = '1'; }, 250);
        }
        return;
      }
      if (label.length < 30) {
        if (/^(Contact|Contact us|Contact Zylo)$/.test(label)) { stop(); this.goToView('contact'); return; }
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

    // community marquee injection on landing page
    this._marqueeT = setInterval(() => {
      if (this.state.view !== 'shop') return;
      const target = [...document.querySelectorAll('div')].find(d => d.style.height === '828.7px' && d.style.width === '1188px' && !d.dataset.wxMarquee);
      if (!target) return;
      target.dataset.wxMarquee = '1';
      target.innerHTML = '';
      Object.assign(target.style, { display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: '44px', overflow: 'hidden' });
      const head = document.createElement('div');
      head.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;max-width:560px;margin:0 auto;font-family:'Share Tech',sans-serif;color:#000;";
      const mkBtn = (labelTxt, dark, onclick) => {
        const b = document.createElement('button');
        b.textContent = labelTxt;
        b.style.cssText = `font-family:'Share Tech',sans-serif;font-size:14px;border-radius:999px;padding:11px 22px;cursor:pointer;border:1px solid #000;${dark ? 'background:#000;color:#fff;' : 'background:#fff;color:#000;'}`;
        b.onclick = ev => { ev.stopPropagation(); onclick(); window.scrollTo(0, 0); };
        return b;
      };
      const pill = document.createElement('span');
      pill.textContent = 'Stay connected';
      pill.style.cssText = 'font-size:12px;background:#000;color:#fff;border-radius:999px;padding:5px 14px;';
      const h = document.createElement('div');
      h.textContent = 'See our community in modern silhouettes';
      h.style.cssText = 'font-size:38px;line-height:1.2;';
      const sub = document.createElement('div');
      sub.textContent = 'Connect with us on social media for a daily dose of fresh style, featuring exclusive looks from our community.';
      sub.style.cssText = 'font-size:14px;color:#6e6e6e;line-height:1.6;max-width:420px;';
      const btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:10px;margin-top:4px;';
      btns.appendChild(mkBtn('See collections', true, () => this.goToView('collections', { colFilter: 'all' })));
      btns.appendChild(mkBtn('Contact us', false, () => this.goToView('contact')));
      head.append(pill, h, sub, btns);
      target.appendChild(head);
      const photos = ['0a2b25e8589810d9', 'da603fa7c11e12e8', '9c231fc7d5547a35', '9a4bd33b220401bc', 'e0350954131e3cc1', '68d15b42fff470e0', '4f278f47b512c52f'];
      const dims = [[200, 260, -3], [165, 215, 2], [150, 190, -2], [165, 215, 3], [200, 260, -2], [165, 215, 2], [150, 190, -3]];
      const track = document.createElement('div');
      track.style.cssText = 'display:flex;gap:28px;align-items:center;width:max-content;animation:wx-marquee 32s linear infinite;padding-left:28px;';
      for (let rep = 0; rep < 2; rep++) for (let i = 0; i < photos.length; i++) {
        const [w, hh, rot] = dims[i];
        const card = document.createElement('div');
        card.style.cssText = `width:${w}px;height:${hh}px;border-radius:16px;flex:none;transform:rotate(${rot}deg);box-shadow:0 8px 22px rgba(0,0,0,0.15);background:url('${asset(photos[i])}') 50% 15% / cover no-repeat #eee;`;
        track.appendChild(card);
      }
      target.appendChild(track);
    }, 600);

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
    clearInterval(this._marqueeT);
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

  handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zylo_user');
    }
    this.setState({ currentUser: null, showProfileModal: false, toast: 'Signed out successfully' });
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
              <div onClick={this.nav('shop')} style={{ fontSize: 24, letterSpacing: 4, cursor: 'pointer' }}>ZYLO</div>
              <div className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28, marginLeft: 8 }}>
                {link('HOME', view === 'shop', this.nav('shop'))}
                {link('COLLECTIONS', view === 'collections', this.nav('collections', 'all'))}
                {link('CONTACT', view === 'contact', this.nav('contact'))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {currentUser ? (
                <button
                  onClick={() => this.setState((s) => ({ showProfileModal: !s.showProfileModal }))}
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

              <button
                onClick={this.nav('cart')}
                className="zylo-nav-cart-btn"
                title="Shopping Cart"
              >
                <div className="zylo-nav-cart-icon-wrap">
                  <span className="zylo-nav-cart-count">{totalItems}</span>
                  <svg className="zylo-nav-cart-svg" viewBox="0 0 38 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M1 3h5.5l3.8 15h16.4l3.8-10.8H8.8"
                      stroke="#ffffff"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="13" cy="24" r="2.2" fill="#ffffff" />
                    <circle cx="25" cy="24" r="2.2" fill="#ffffff" />
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
            <span style={{ fontSize: 22, letterSpacing: 4, fontWeight: 'bold' }}>ZYLO</span>
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
                  onClick={() => this.setState({ showProfileModal: true, mobileMenuOpen: false })}
                  style={{ textAlign: 'left', width: '100%', marginBottom: 12, fontSize: 13 }}
                >
                  👤 MY PROFILE & ADDRESSES
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
              <div style={{ fontSize: 28, letterSpacing: 4, marginBottom: 12 }}>ZYLO</div>
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
            <span style={{ fontFamily: "'Share Tech', sans-serif", fontSize: 'clamp(56px, 15vw, 210px)', fontWeight: 700, letterSpacing: 'clamp(8px, 2.5vw, 28px)', color: '#ffffff', lineHeight: 0.85, display: 'block' }}>
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
                  onClick={() => this.setState({ heroPreset: preset.key })}
                  className={`zylo-hero-thumb-btn ${isActive ? 'active' : ''}`}
                  style={{
                    backgroundImage: `url('${asset(preset.hash)}')`
                  }}
                  title={`Switch to ${preset.label}`}
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
    const { colFilter } = this.state;
    const catList = this.getCatalog();
    let items = [];
    if (colFilter === 'all') {
      items = catList.map((p, idx) => ({ ...p, idx }));
    } else if (colFilter === 'men') {
      items = catList.map((p, idx) => ({ ...p, idx })).filter(p => {
        const g = (p.gender || '').toLowerCase();
        const c = (p.category || p.categoryId || '').toLowerCase();
        return g === 'men' || g === 'unisex' || c.includes('men');
      });
    } else if (colFilter === 'women') {
      items = catList.map((p, idx) => ({ ...p, idx })).filter(p => {
        const g = (p.gender || '').toLowerCase();
        const c = (p.category || p.categoryId || '').toLowerCase();
        return g === 'women' || g === 'unisex' || c.includes('women');
      });
    } else if (colFilter === 'kids') {
      items = catList.map((p, idx) => ({ ...p, idx })).filter(p => {
        const g = (p.gender || '').toLowerCase();
        const c = (p.category || p.categoryId || '').toLowerCase();
        return g === 'kids' || c.includes('kids');
      });
    }

    const filterTabs = [
      ['all', 'All Products'],
      ['men', 'Men'],
      ['women', 'Women'],
      ['kids', 'Kids']
    ];

    return (
      <div style={{ background: '#fff', width: '100%', maxWidth: 1188, margin: '0 auto', minHeight: 'calc(100vh - 60px)', boxSizing: 'border-box' }}>
        {/* Collections Hero */}
        <div className="zylo-collections-hero-wrapper">
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
                  onClick={() => { const el = document.getElementById('col-grid'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); }}
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

        {/* Category Filter Pills & Products Grid */}
        <div className="zylo-collections-content">
          <div id="col-grid" className="zylo-filter-pills">
            {filterTabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => this.goToView('collections', { colFilter: id })}
                className="zylo-filter-pill-btn"
                style={{
                  border: id === colFilter ? '1px solid #000' : '1px solid #ddd',
                  background: id === colFilter ? '#000' : '#fff',
                  color: id === colFilter ? '#fff' : '#000'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="zylo-products-grid">
            {items.map(p => {
              const best = p.tag === 'BEST SELLER';
              return (
                <div key={p.idx} onClick={() => this.openProduct(p.idx)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', aspectRatio: '368/420', width: '100%', borderRadius: 12, background: img(p.img1), backgroundColor: '#eee', backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden' }}>
                    <span style={{ position: 'absolute', left: 8, top: 8, fontSize: 10, background: best ? '#000' : '#fff', color: best ? '#fff' : '#000', border: '1px solid #000', borderRadius: 999, padding: '2px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {best ? '★ Best seller' : '✦ New'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, width: '100%', minWidth: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{p.name}</span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{rs(p.price)}</span>
                        {p.compare > p.price && <span style={{ fontSize: 11, color: '#a1a1a1', textDecoration: 'line-through' }}>{rs(p.compare)}</span>}
                      </div>
                    </div>
                    <div className="zylo-swatch-group" style={{ display: 'flex', gap: 3, flexShrink: 0, marginTop: 2 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #ddd', background: img(p.img1), backgroundColor: '#eee' }} />
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #ddd', background: img(p.img2 || p.img1), backgroundColor: '#eee' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
              <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 12, letterSpacing: 1 }}>ZYLO SHOWROOM</div>
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
                  <a href="mailto:hello@zylo.com.np" style={{ fontWeight: 600, color: '#000', textDecoration: 'none' }}>hello@zylo.com.np</a>
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
                <div style={{ width: `${1188 * landingScale}px`, height: `${(8090 - 616) * landingScale}px`, flexShrink: 0, position: 'relative', overflow: 'hidden', background: '#ffffff' }}>
                  <div style={{ width: '1188px', height: '8090px', transform: `scale(${landingScale})`, transformOrigin: 'top left', position: 'absolute', top: -616, left: 0, background: '#ffffff' }}>
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
        </main>
        {this.footer()}

        {/* Customer Account & Saved Addresses Modal */}
        {this.state.showProfileModal && this.state.currentUser && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20
            }}
            onClick={(e) => { if (e.target === e.currentTarget) this.setState({ showProfileModal: false }); }}
          >
            <div style={{
              background: '#fff',
              color: '#111',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 28,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>CUSTOMER ACCOUNT</h3>
                <button
                  onClick={() => this.setState({ showProfileModal: false })}
                  style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}
                >
                  &times;
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: 1, display: 'block' }}>FULL NAME</span>
                  <strong style={{ fontSize: 16 }}>{this.state.currentUser.name}</strong>
                </div>

                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: 1, display: 'block' }}>EMAIL ADDRESS</span>
                  <span>{this.state.currentUser.email}</span>
                </div>

                {this.state.currentUser.phone && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: 1, display: 'block' }}>PHONE NUMBER</span>
                    <span>{this.state.currentUser.phone}</span>
                  </div>
                )}

                <div style={{ background: '#f8f8f8', padding: 14, borderRadius: 10, border: '1px solid #eaeaea' }}>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#666', letterSpacing: 1, display: 'block', marginBottom: 2 }}>PERMANENT ADDRESS</span>
                    <strong style={{ color: '#222' }}>{this.state.currentUser.permanentAddress || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#666', letterSpacing: 1, display: 'block', marginBottom: 2 }}>TEMPORARY / CURRENT ADDRESS</span>
                    <strong style={{ color: '#222' }}>{this.state.currentUser.temporaryAddress || 'Not specified'}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #eee' }}>
                <button
                  onClick={this.handleLogout}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Sign Out
                </button>
                <button
                  onClick={() => this.setState({ showProfileModal: false })}
                  style={{
                    background: '#000',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
