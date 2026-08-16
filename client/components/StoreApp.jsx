'use client';
import React from 'react';
import Landing from './Landing';
import { createOrder } from '../services/orderService';

const CATALOG = [
  { name: 'Textured Knitted Shirt', tag: 'LATEST DROP', price: 1750, compare: 2350, img1: '98eab38550301ca9', img2: '248028cbf9d4d390', desc: 'An open-weave knit shirt with a relaxed boxy cut. Breathable texture that layers cleanly over a plain tee for everyday wear.' },
  { name: 'Structured Trench Coat', tag: 'LATEST DROP', price: 6300, compare: 8400, img1: 'ee2608e46a586391', img2: '0e72c7de7ec1a38e', desc: 'A sharply tailored trench in a water-resistant twill. Structured shoulders and a clean drape built for the city.' },
  { name: 'Mini Denim Overalls', tag: 'LATEST DROP', price: 1350, compare: 1800, img1: 'e282ebdc1a55d0be', img2: '08accf483615b0df', desc: 'Kid-sized denim overalls in a mid-blue wash. Reinforced stitching and adjustable straps for growing frames.' },
  { name: 'Riviera Collar Shirt', tag: 'LATEST DROP', price: 1350, compare: 1800, img1: 'a22003dc69fc0fc1', img2: 'b3a1fbdacd69bcda', desc: 'A camp-collar shirt in crinkled cotton gauze. Light, airy and made for warm afternoons.' },
  { name: 'Stretch Jersey Tee', tag: 'LATEST DROP', price: 1950, compare: 2850, img1: 'ea97fe30fd8d1dfc', img2: '09789ab9b9e151f6', desc: 'A heavyweight jersey tee with a touch of stretch. Holds its shape wash after wash.' },
  { name: 'Urban Utility Cargo', tag: 'LATEST DROP', price: 2700, compare: 3600, img1: '2461720fa204607a', img2: '39a84305ed8fadbc', desc: 'Roomy cargo trousers with angled utility pockets and a drawcord hem. Hard-wearing cotton canvas.' },
  { name: 'Classic Boxy Tee', tag: 'LATEST DROP', price: 1050, compare: 1350, img1: '0d3fac373da0bd1f', img2: 'bbb4f22211e2dc51', desc: 'The everyday tee — boxy fit, dropped shoulder, midweight combed cotton in a clean solid.' },
  { name: 'Pleated Smart Trousers', tag: 'LATEST DROP', price: 2300, compare: 3000, img1: '9a83a5f92f7a34f6', img2: '19eee9f8e07093fd', desc: 'Double-pleated trousers with a tapered leg. Polished enough for work, easy enough for weekends.' },
  { name: 'French Terry Shorts', tag: 'LATEST DROP', price: 1200, compare: 1650, img1: 'b81e3eb6af13055d', img2: 'd4ddd6f6c7954c6b', desc: 'Loopback french terry shorts with a relaxed rise and side pockets. Off-duty essential.' },
  { name: 'Heavyweight Oversized Hoodie', tag: 'BEST SELLER', price: 2550, compare: 3300, img1: 'eeac2757b9ee2e46', img2: '67866d53aaeebcac', desc: 'Our signature 480gsm fleece hoodie. Oversized through the body with a double-lined hood and ribbed cuffs.' },
  { name: 'Patterned Knit Sweater', tag: 'BEST SELLER', price: 1350, compare: 2700, img1: '3b9adec96400865c', img2: 'ea5bdbd64c598cff', desc: 'A jacquard-knit sweater in a tonal stripe. Soft-spun yarn with a regular fit.' },
  { name: 'Quilted Bomber Jacket', tag: 'BEST SELLER', price: 4350, compare: 5400, img1: '57e8f8ec76e792b1', img2: 'e2a028dd8bd0e7b5', desc: 'A diamond-quilted bomber with matte hardware and ribbed trims. Warm without the bulk.' },
  { name: 'Hooded Puffer Vest', tag: 'BEST SELLER', price: 1350, compare: 2250, img1: '7f3fd1f72139111d', img2: '4a9712f500002e24', desc: 'A lightweight puffer vest with a stowable hood. Layer it over knits when the mercury drops.' },
  { name: 'Vegan Leather Leggings', tag: 'BEST SELLER', price: 2250, compare: 2950, img1: '54f4ed23bf992cef', img2: '365d4729feaf7290', desc: 'High-rise leggings in a matte vegan leather with four-way stretch and a clean ankle zip.' },
  { name: 'Cropped Boxy Blazer', tag: 'BEST SELLER', price: 3900, compare: 5250, img1: 'c71fd29c3338e4a5', img2: 'dac45b43062fbe55', desc: 'A cropped blazer with a boxy shoulder and single-button close. Sharp over anything.' },
];

const slugForProduct = (p, i) => (p?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || String(i);

const COLLECTIONS = [
  { id: 'men', items: [0, 1, 4, 5, 7, 9, 11] },
  { id: 'women', items: [3, 6, 8, 10, 13, 14] },
  { id: 'kids', items: [2, 12] },
];

const METHODS = [
  { id: 'cod', name: 'Cash on Delivery', desc: 'Pay in cash when the order arrives at your door. No advance payment required.' },
  { id: 'esewa', name: 'eSewa', desc: "Nepal's digital wallet. You will be redirected to eSewa's payment flow to complete payment before your order is confirmed." },
  { id: 'fonepay', name: 'Fonepay', desc: "Nepal's QR / bank payment network. Scan a Fonepay QR with your bank app to pay before confirmation." },
];

const FREE_OVER = 5000;
const rs = n => 'Rs ' + (n || 0).toLocaleString('en-US');
const asset = h => `/assets/${h}.q.jpg`;
const img = h => `url('${asset(h)}') 50% 20% / cover no-repeat`;
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

export default class StoreApp extends React.Component {
  constructor(props) {
    super(props);
    let initialSel = 0;
    if (props.initialProductSlug) {
      const foundIdx = CATALOG.findIndex((p, i) => slugForProduct(p, i) === props.initialProductSlug || String(i) === props.initialProductSlug);
      if (foundIdx >= 0) initialSel = foundIdx;
    } else if (props.initialProduct != null) {
      initialSel = props.initialProduct;
    }

    this.state = {
      view: props.initialView || 'shop',
      cart: [],
      pay: 'cod',
      orderId: null,
      orderTotal: 0,
      sel: initialSel,
      selImg: 0,
      selSize: 'M',
      selQty: 1,
      toast: null,
      cName: '', cPhone: '', cMsg: '', cTopic: 'Order status', contactSent: false, colFilter: 'all',
      mobileMenuOpen: false,
      landingScale: 1
    };
  }

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
      const p = CATALOG[selIndex];
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
        const idx = CATALOG.findIndex((p, i) => slugForProduct(p, i) === slug || String(i) === slug);
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
      for (let d = 0; d < 14 && el && el !== document.body; d++, el = el.parentElement) {
        const t = el.textContent || '';
        if (t.length > 160) continue;
        const idx = CATALOG.findIndex(p => t.includes(p.name));
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
      if (this.state.view !== 'shop') return;
      const logo = [...document.querySelectorAll('div')].find(d => (d.style.background || '').includes('8b049d5a714cb207'));
      if (logo && !logo.dataset.wxSwapped) {
        logo.dataset.wxSwapped = '1';
        logo.style.background = 'none';
        logo.innerHTML = "<span style=\"font-family:'Share Tech',sans-serif;font-size:32px;letter-spacing:6px;font-weight:700;color:#000;display:inline-block;cursor:pointer;\">ZYLO</span>";
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
    this._toastT = setTimeout(() => this.setState({ toast: null }), 2200);
  }

  addLine(goCheckout) {
    const p = CATALOG[this.state.sel];
    this.setState(s => {
      const cart = [...s.cart];
      const i = cart.findIndex(l => l.idx === s.sel && l.size === s.selSize);
      if (i >= 0) cart[i] = { ...cart[i], qty: cart[i].qty + s.selQty };
      else cart.push({ idx: s.sel, size: s.selSize, qty: s.selQty });
      return { cart };
    });

    if (goCheckout) {
      this.goToView('checkout');
    } else {
      this.showToast('Added ' + p.name + ' to cart');
    }
  }

  bump(i, d) {
    this.setState(s => ({ cart: s.cart.map((l, j) => j === i ? { ...l, qty: l.qty + d } : l).filter(l => l.qty > 0) }));
  }

  totals() {
    const subtotal = this.state.cart.reduce((t, l) => t + CATALOG[l.idx].price * l.qty, 0);
    const delivery = subtotal === 0 ? 0 : (subtotal >= FREE_OVER ? 0 : 150);
    return { subtotal, delivery, total: subtotal + delivery };
  }

  placeOrder = () => {
    const id = 'ZY-' + Math.floor(100000 + Math.random() * 900000);
    const { total } = this.totals();
    try {
      createOrder({
        no: id,
        customer: this.state.cName || 'Storefront Customer',
        phone: this.state.cPhone || '',
        total: total,
        method: this.state.pay
      });
    } catch (e) {}

    const isCod = this.state.pay === 'cod';
    this.goToView(isCod ? 'confirmed' : this.state.pay, {
      orderId: id,
      orderTotal: total,
      cart: isCod ? [] : this.state.cart
    });
  };

  header() {
    const { view, cart, mobileMenuOpen } = this.state;
    const totalItems = cart.reduce((t, l) => t + l.qty, 0);
    const link = (label, active, onClick) => (
      <span onClick={onClick} style={{ fontSize: 13, letterSpacing: 1, color: active ? '#fff' : '#a1a1a1', cursor: 'pointer' }}>{label}</span>
    );
    return (
      <>
        <header className="header-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: 60, background: '#000', color: '#fff', position: 'sticky', top: 0, zIndex: 40 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div onClick={this.nav('cart')} style={{ fontSize: 13, letterSpacing: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>CART</span>
              <span style={{ background: '#fff', color: '#000', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{totalItems}</span>
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
          <div style={{ marginTop: 40, borderTop: '1px solid #222', paddingTop: 24 }}>
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
        <div style={{ maxWidth: 1200, margin: '0 auto', borderTop: '1px solid #222', paddingTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', flexWrap: 'wrap', gap: 12 }}>
          <span>&copy; {new Date().getFullYear()} Zylo Pvt. Ltd. All rights reserved.</span>
          <span>Thamel, Kathmandu &middot; PAN: 601234567</span>
        </div>
      </footer>
    );
  }

  renderCollections() {
    const { colFilter } = this.state;
    const cat = COLLECTIONS.find(c => c.id === colFilter);
    const items = cat ? cat.items.map(i => ({ ...CATALOG[i], idx: i })) : CATALOG.map((p, idx) => ({ ...p, idx }));
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 2, color: '#888' }}>CATALOG</div>
            <h1 style={{ fontSize: 44, margin: '4px 0 0', fontWeight: 400 }}>COLLECTIONS</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', 'men', 'women', 'kids'].map(k => (
              <button
                key={k}
                onClick={() => this.goToView('collections', { colFilter: k })}
                style={{ ...pillBtn(colFilter === k), padding: '8px 18px', fontSize: 12 }}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 28 }}>
          {items.map(p => (
            <div key={p.idx} onClick={() => this.openProduct(p.idx)} style={{ cursor: 'pointer' }}>
              <div style={{ aspectRatio: '3/4', background: img(p.img1), borderRadius: 12, marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', top: 12, left: 12, background: '#000', color: '#fff', fontSize: 10, letterSpacing: 1.5, padding: '4px 10px', borderRadius: 999 }}>{p.tag}</span>
              </div>
              <div style={{ fontSize: 15, marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <span style={{ fontWeight: 700 }}>{rs(p.price)}</span>
                {p.compare > p.price && <span style={{ color: '#888', textDecoration: 'line-through', fontSize: 12 }}>{rs(p.compare)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderDetail() {
    const p = CATALOG[this.state.sel];
    const { selImg, selSize, selQty } = this.state;
    const thumbs = [p.img1, p.img2].filter(Boolean);
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <div onClick={() => this.goToView('collections', { colFilter: 'all' })} style={{ fontSize: 12, letterSpacing: 1.5, cursor: 'pointer', marginBottom: 24, color: '#888' }}>
          &larr; BACK TO CATALOG
        </div>
        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48 }}>
          <div>
            <div style={{ aspectRatio: '3/4', background: img(thumbs[selImg] || p.img1), borderRadius: 16, marginBottom: 16 }} />
            {thumbs.length > 1 && (
              <div style={{ display: 'flex', gap: 12 }}>
                {thumbs.map((t, i) => (
                  <div
                    key={i}
                    onClick={() => this.setState({ selImg: i })}
                    style={{ width: 80, height: 100, background: img(t), borderRadius: 8, cursor: 'pointer', border: selImg === i ? '2px solid #000' : '1px solid transparent' }}
                  />
                ))}
              </div>
            )}
          </div>
          <div>
            <span style={{ fontSize: 11, letterSpacing: 2, background: '#000', color: '#fff', padding: '4px 10px', borderRadius: 999 }}>{p.tag}</span>
            <h1 style={{ fontSize: 36, margin: '14px 0 8px', fontWeight: 400 }}>{p.name}</h1>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 24, fontWeight: 700 }}>{rs(p.price)}</span>
              {p.compare > p.price && <span style={{ color: '#888', textDecoration: 'line-through', fontSize: 16 }}>{rs(p.compare)}</span>}
            </div>
            <p style={{ color: '#555', lineHeight: 1.6, fontSize: 14, marginBottom: 28 }}>{p.desc}</p>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, letterSpacing: 1.5, marginBottom: 8 }}>SELECT SIZE</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['S', 'M', 'L', 'XL'].map(s => (
                  <button
                    key={s}
                    onClick={() => this.setState({ selSize: s })}
                    style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid #000', background: selSize === s ? '#000' : '#fff', color: selSize === s ? '#fff' : '#000', cursor: 'pointer', ...font }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, letterSpacing: 1.5, marginBottom: 8 }}>QUANTITY</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => this.setState(s => ({ selQty: Math.max(1, s.selQty - 1) }))} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #000', background: '#fff', cursor: 'pointer', ...font }}>-</button>
                <span style={{ minWidth: 24, textAlign: 'center', fontSize: 16 }}>{selQty}</span>
                <button onClick={() => this.setState(s => ({ selQty: s.selQty + 1 }))} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #000', background: '#fff', cursor: 'pointer', ...font }}>+</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => this.addLine(false)} style={pillBtn(false)}>ADD TO CART</button>
              <button onClick={() => this.addLine(true)} style={pillBtn(true)}>BUY NOW &rarr;</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderCart() {
    const { cart } = this.state;
    const { subtotal, delivery, total } = this.totals();
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
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 400, marginBottom: 28 }}>SHOPPING CART</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 40 }}>
          <div>
            {cart.map((l, i) => {
              const p = CATALOG[l.idx];
              return (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid #e0e0e0', alignItems: 'center' }}>
                  <div style={{ width: 70, height: 90, background: img(p.img1), borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
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
    const { total } = this.totals();
    const { pay, cName, cPhone } = this.state;
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 400, marginBottom: 28 }}>CHECKOUT</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div>
            <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6 }}>FULL NAME</label>
            <input value={cName} onChange={e => this.setState({ cName: e.target.value })} placeholder="e.g. Aarav Sharma" style={{ ...input, width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6 }}>PHONE NUMBER</label>
            <input value={cPhone} onChange={e => this.setState({ cPhone: e.target.value })} placeholder="e.g. +977 9801234567" style={{ ...input, width: '100%' }} />
          </div>
        </div>
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 10 }}>PAYMENT METHOD</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {METHODS.map(m => (
              <label key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, border: '1px solid #000', borderRadius: 8, background: pay === m.id ? '#000' : '#fff', color: pay === m.id ? '#fff' : '#000', cursor: 'pointer' }}>
                <input type="radio" name="pay" checked={pay === m.id} onChange={() => this.setState({ pay: m.id })} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: pay === m.id ? '#ccc' : '#666', marginTop: 2 }}>{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, fontSize: 20, fontWeight: 700 }}>
          <span>TOTAL DUE</span><span>{rs(total)}</span>
        </div>
        <button onClick={this.placeOrder} style={{ ...pillBtn(true), width: '100%' }}>PLACE ORDER &rarr;</button>
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
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
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
            <div style={{ background: '#f5f5f5', borderRadius: 16, padding: '20px 24px', fontSize: 12, color: '#555', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🚚</span>
                <span><strong>Free delivery</strong> across Nepal on orders over Rs 5,000</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>💳</span>
                <span><strong>Flexible Payments:</strong> Cash on Delivery, eSewa & Fonepay</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔄</span>
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
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
              <div style={{ width: `${1188 * landingScale}px`, height: `${11684 * landingScale}px`, flexShrink: 0, position: 'relative' }}>
                <div style={{ width: '1188px', height: '11684px', transform: `scale(${landingScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                  <Landing />
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
        {view !== 'shop' && this.footer()}
      </div>
    );
  }
}
