/* ============================================================
   Zylo Central Data Store & Safe Persistence Service
   Full Feature Support for Next.js Admin & Storefront
   ============================================================ */

export const SAFE_STORE = (function () {
  if (typeof window === "undefined") {
    var memServer = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memServer, k) ? memServer[k] : null; },
      setItem: function (k, v) { memServer[k] = String(v); },
      removeItem: function (k) { delete memServer[k]; }
    };
  }
  try {
    var probe = "__zylo_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (e) {
    var mem = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; }
    };
  }
})();

export var APP_VERSION = "1.5.0";
export var DB_VERSION = 5;

export function nowIso() { return new Date().toISOString(); }
export function today() { return new Date().toISOString().slice(0, 10); }
export function offsetDate(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

export function money(n) {
  var paisa = Math.round(Number(n) || 0);
  return "Rs " + Math.round(paisa / 100).toLocaleString("en-IN");
}

export function moneyNpr(amount) {
  return "Rs " + Math.round(Number(amount) || 0).toLocaleString("en-IN");
}

export function slugify(str) {
  return String(str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function periodKey(dateStr, mode) {
  var d = new Date(dateStr + "T00:00:00");
  if (mode === "daily") return dateStr;
  if (mode === "weekly") {
    var t = new Date(d);
    t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); // Monday start
    return "Week of " + t.toISOString().slice(0, 10);
  }
  if (mode === "monthly") return dateStr ? dateStr.slice(0, 7) : today().slice(0, 7);
  if (mode === "quarterly") return d.getFullYear() + " Q" + (Math.floor(d.getMonth() / 3) + 1);
  return String(d.getFullYear());
}

export var DEFAULTS = {
  settings: function () {
    return {
      company: "Zylo Pvt. Ltd.",
      email: "hello@zylo.com.np",
      phone: "+977 1-4123456",
      address: "Thamel, Kathmandu",
      pan: "601234567",
      vatRate: 13,
      invPrefix: "INV-",
      currency: "NPR",
      locale: "en-IN",
      timezone: "Asia/Kathmandu",
      dateFormat: "YYYY-MM-DD",
      fiscalYear: "2082/83",
      gateways: {
        cod: true,
        esewa: false,
        fonepay: false
      }
    };
  },
  categories: function () {
    return [
      { id: "c_men", name: "Men", slug: "men", parentId: null, sortOrder: 0, featured: true, visible: true, status: "active", description: "Menswear" },
      { id: "c_app", name: "Apparel", slug: "apparel", parentId: "c_men", sortOrder: 0, featured: true, visible: true, status: "active", description: "Tops, bottoms and layers" },
      { id: "c_tops", name: "Tops", slug: "tops", parentId: "c_app", sortOrder: 0, featured: false, visible: true, status: "active", description: "" },
      { id: "c_bottoms", name: "Bottoms", slug: "bottoms", parentId: "c_app", sortOrder: 1, featured: false, visible: true, status: "active", description: "" },
      { id: "c_out", name: "Outerwear", slug: "outerwear", parentId: "c_men", sortOrder: 1, featured: false, visible: true, status: "active", description: "Shells and jackets" },
      { id: "c_acc", name: "Accessories", slug: "accessories", parentId: null, sortOrder: 1, featured: true, visible: true, status: "active", description: "Caps, socks and small goods" },
      { id: "c_bags", name: "Bags", slug: "bags", parentId: null, sortOrder: 2, featured: false, visible: true, status: "active", description: "" }
    ];
  },
  products: function () {
    return [
      { id: "m1", name: "Monolith Tee", slug: "monolith-tee", sku: "ZYL-APP-00001", categoryId: "c_tops", brand: "Zylo",
        gender: "Unisex", season: "SS26", tags: ["tee", "core"], price: 180000, mrp: 220000, cost: 90000,
        status: "published", labels: { featured: false, trending: false, newArrival: true, bestSelling: true },
        description: "Heavyweight cotton tee, garment-dyed.", options: { Colour: ["Black", "White"], Size: ["S", "M", "L"] },
        images: [
          { url: "/assets/ea97fe30fd8d1dfc.q.jpg", alt: "Monolith Tee", isFeatured: true, format: "webp" },
          { url: "/assets/09789ab9b9e151f6.q.jpg", alt: "Monolith Tee detail", isFeatured: false, format: "webp" }
        ] },
      { id: "m2", name: "Grid Hoodie", slug: "grid-hoodie", sku: "ZYL-APP-00002", categoryId: "c_tops", brand: "Zylo",
        gender: "Unisex", season: "SS26", tags: ["hoodie", "new"], price: 380000, mrp: 450000, cost: 210000,
        status: "published", labels: { featured: true, trending: false, newArrival: true, bestSelling: false },
        description: "Brushed-back fleece with raised grid seams.", options: { Colour: ["Black"], Size: ["S", "M", "L", "XL"] },
        images: [
          { url: "/assets/eeac2757b9ee2e46.q.jpg", alt: "Grid Hoodie", isFeatured: true, format: "webp" },
          { url: "/assets/67866d53aaeebcac.q.jpg", alt: "Grid Hoodie detail", isFeatured: false, format: "webp" }
        ] },
      { id: "m3", name: "Aperture Cap", slug: "aperture-cap", sku: "ZYL-ACC-00001", categoryId: "c_acc", brand: "Zylo",
        gender: "Unisex", season: "SS26", tags: ["cap"], price: 150000, mrp: 0, cost: 70000,
        status: "published", labels: { featured: false, trending: false, newArrival: false, bestSelling: false },
        description: "Six-panel cap with debossed ring logo.", options: { Colour: ["Black"], Size: ["One size"] },
        images: [
          { url: "/assets/7f3fd1f72139111d.q.jpg", alt: "Aperture Cap", isFeatured: true, format: "webp" },
          { url: "/assets/4a9712f500002e24.q.jpg", alt: "Aperture Cap detail", isFeatured: false, format: "webp" }
        ] },
      { id: "m4", name: "Ledger Tote", slug: "ledger-tote", sku: "ZYL-BAG-00001", categoryId: "c_bags", brand: "Zylo",
        gender: "Unisex", season: "SS26", tags: ["bag"], price: 220000, mrp: 0, cost: 110000,
        status: "published", labels: { featured: true, trending: false, newArrival: false, bestSelling: false },
        description: "Waxed canvas tote with reinforced base.", options: { Colour: ["Natural", "Black"], Size: ["One size"] },
        images: [
          { url: "/assets/e282ebdc1a55d0be.q.jpg", alt: "Ledger Tote", isFeatured: true, format: "webp" },
          { url: "/assets/08accf483615b0df.q.jpg", alt: "Ledger Tote detail", isFeatured: false, format: "webp" }
        ] },
      { id: "m5", name: "Contour Jacket", slug: "contour-jacket", sku: "ZYL-OUT-00001", categoryId: "c_out", brand: "Zylo",
        gender: "Unisex", season: "SS26", tags: ["jacket"], price: 720000, mrp: 860000, cost: 420000,
        status: "published", labels: { featured: true, trending: false, newArrival: false, bestSelling: false },
        description: "Cropped shell with taped seams.", options: { Colour: ["Black"], Size: ["S", "M", "L"] },
        images: [
          { url: "/assets/57e8f8ec76e792b1.q.jpg", alt: "Contour Jacket", isFeatured: true, format: "webp" },
          { url: "/assets/e2a028dd8bd0e7b5.q.jpg", alt: "Contour Jacket detail", isFeatured: false, format: "webp" }
        ] },
      { id: "m6", name: "Frame Trousers", slug: "frame-trousers", sku: "ZYL-APP-00003", categoryId: "c_bottoms", brand: "Zylo",
        gender: "Unisex", season: "SS26", tags: ["trousers"], price: 300000, mrp: 360000, cost: 150000,
        status: "published", labels: { featured: false, trending: false, newArrival: false, bestSelling: false },
        description: "Straight leg with articulated knee.", options: { Colour: ["Black"], Size: ["30", "32", "34"] },
        images: [
          { url: "/assets/9a83a5f92f7a34f6.q.jpg", alt: "Frame Trousers", isFeatured: true, format: "webp" },
          { url: "/assets/19eee9f8e07093fd.q.jpg", alt: "Frame Trousers detail", isFeatured: false, format: "webp" }
        ] }
    ];
  },
  sales: function () {
    return [
      { id: "s1", invoice: "INV-2029", orderNo: "ZY-1040", customerPhone: "+977 98-09-112233", date: offsetDate(-32), customer: "Anjali Shrestha", payment: "eSewa", vatable: true, items: [{ desc: "Contour Jacket", qty: 1, rate: 637200, sku: "ZYL-OUT-00001-BLA-S" }] },
      { id: "s2", invoice: "INV-2030", orderNo: "ZY-1041", customerPhone: "+977 98-04-556677", date: offsetDate(-12), customer: "Bikash Thapa", payment: "COD", vatable: true, items: [{ desc: "Monolith Tee", qty: 2, rate: 159300, sku: "ZYL-APP-00001-BLA-M" }] },
      { id: "s3", invoice: "INV-2031", orderNo: "ZY-1042", customerPhone: "+977 98-01-234567", date: offsetDate(-5), customer: "Sita Rai", payment: "Cash", vatable: true, items: [{ desc: "Grid Hoodie", qty: 1, rate: 336300, sku: "ZYL-APP-00002-BLA-M" }] }
    ];
  },
  purchases: function () {
    return [
      { id: "p1", bill: "BILL-501", date: offsetDate(-30), supplier: "Kathmandu Textiles", head: "Purchases (stock)", vatable: true, items: [{ desc: "Fleece fabric roll", qty: 20, rate: 180000 }] },
      { id: "p2", bill: "BILL-502", date: offsetDate(-15), supplier: "Everest Logistics", head: "Freight and delivery", vatable: true, items: [{ desc: "Courier charges", qty: 1, rate: 850000 }] },
      { id: "p3", bill: "BILL-503", date: offsetDate(-3), supplier: "Thamel Properties", head: "Rent", vatable: false, items: [{ desc: "Shop rent (monthly)", qty: 1, rate: 4500000 }] }
    ];
  },
  orders: function () {
    return [
      { no: "ZY-1042", customer: "Sita Rai", date: offsetDate(0), total: 380000, pay: "COD", status: "pending", items: [{ desc: "Grid Hoodie", qty: 1, rate: 336300 }] },
      { no: "ZY-1041", customer: "Bikash Thapa", date: offsetDate(-1), total: 180000, pay: "eSewa", status: "delivered", items: [{ desc: "Monolith Tee", qty: 1, rate: 159300 }] },
      { no: "ZY-1040", customer: "Anjali Shrestha", date: offsetDate(-1), total: 720000, pay: "Fonepay", status: "shipped", items: [{ desc: "Contour Jacket", qty: 1, rate: 637200 }] }
    ];
  },
  customers: function () {
    return [
      { name: "Sita Rai", phone: "+977 98-01-234567", city: "Kathmandu", orders: 4, spend: 1420000, email: "sita.rai@example.com" },
      { name: "Bikash Thapa", phone: "+977 98-04-556677", city: "Pokhara", orders: 2, spend: 560000, email: "bikash@example.com" },
      { name: "Anjali Shrestha", phone: "+977 98-09-112233", city: "Lalitpur", orders: 7, spend: 2890000, email: "anjali.s@example.com" }
    ];
  },
  warehouses: function () {
    return [
      { id: "w1", name: "Main Warehouse (Kathmandu)", code: "WH-KTM" },
      { id: "w2", name: "Secondary Store (Pokhara)", code: "WH-PKR" }
    ];
  },
  pages: function () {
    return [
      { id: "pg1", title: "About Zylo", slug: "/about", status: "published", updated: today(), meta: "About Zylo Nepal", content: "<p>Zylo designs minimalist everyday garments built for utility, longevity and modern living in Kathmandu.</p>" },
      { id: "pg2", title: "Shipping & Delivery", slug: "/shipping", status: "published", updated: today(), meta: "Shipping policy", content: "<p>We provide express shipping across Nepal with 24-48h delivery inside Kathmandu Valley.</p>" },
      { id: "pg3", title: "Returns & Exchanges", slug: "/returns", status: "published", updated: today(), meta: "Returns policy", content: "<p>Hassle-free 7-day returns for unworn items in original packaging.</p>" }
    ];
  }
};

function generateDefaultVariantsAndInventory(products) {
  var variants = [];
  var inventory = [];
  var stockMoves = [];

  var shortCode = function (s) { return String(s || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase(); };

  products.forEach(function (p) {
    var opts = p.options || {};
    var names = Object.keys(opts);
    var combos = [{}];
    names.forEach(function (n) {
      var next = [];
      (opts[n] || []).forEach(function (v) {
        combos.forEach(function (base) {
          var copy = { ...base };
          copy[n] = v;
          next.push(copy);
        });
      });
      combos = next;
    });

    combos.forEach(function (combo, idx) {
      var parts = [p.sku];
      names.forEach(function (n) {
        if (combo[n]) parts.push(shortCode(combo[n]));
      });
      var sku = parts.join("-");
      var vId = "v_" + p.id + "_" + idx;
      
      var variant = {
        id: vId,
        productId: p.id,
        sku: sku,
        options: combo,
        price: null,
        status: p.status === "published" ? "active" : "draft",
        published: p.status === "published",
        barcode: "890" + Math.floor(100000000 + Math.random() * 900000000)
      };
      variants.push(variant);

      // Inventory record
      var stockQty = [42, 18, 14, 25, 12, 8, 30, 16][idx % 8];
      var invId = "inv_" + vId + "_w1";
      inventory.push({
        id: invId,
        variantId: vId,
        warehouseId: "w1",
        available: stockQty,
        reserved: idx % 4 === 0 ? 1 : 0,
        incoming: idx % 6 === 0 ? 15 : 0,
        damaged: 0,
        returned: 0,
        reorderLevel: 5,
        minStock: 2,
        maxStock: 100
      });

      if (idx % 2 === 0) {
        inventory.push({
          id: "inv_" + vId + "_w2",
          variantId: vId,
          warehouseId: "w2",
          available: Math.floor(stockQty / 2),
          reserved: 0,
          incoming: 0,
          damaged: 0,
          returned: 0,
          reorderLevel: 3,
          minStock: 1,
          maxStock: 50
        });
      }
    });
  });

  return { variants: variants, inventory: inventory, stockMoves: stockMoves };
}

export function freshDB() {
  var prods = DEFAULTS.products();
  var seeded = generateDefaultVariantsAndInventory(prods);

  return {
    version: DB_VERSION,
    appVersion: APP_VERSION,
    createdAt: nowIso(),
    lastMigratedAt: nowIso(),
    settings: DEFAULTS.settings(),
    categories: DEFAULTS.categories(),
    products: prods,
    variants: seeded.variants,
    inventory: seeded.inventory,
    stockMoves: seeded.stockMoves,
    warehouses: DEFAULTS.warehouses(),
    sales: DEFAULTS.sales(),
    purchases: DEFAULTS.purchases(),
    orders: DEFAULTS.orders(),
    customers: DEFAULTS.customers(),
    pages: DEFAULTS.pages(),
    returns: []
  };
}

export function loadDB() {
  try {
    var raw = SAFE_STORE.getItem("zylo-db");
    if (raw) {
      var db = JSON.parse(raw);
      // Migration / back-fill if missing variants or warehouses
      var modified = false;
      if (!db.warehouses || !db.warehouses.length) {
        db.warehouses = DEFAULTS.warehouses();
        modified = true;
      }
      if (!db.pages || !db.pages.length) {
        db.pages = DEFAULTS.pages();
        modified = true;
      }
      if (!db.variants || !db.variants.length) {
        var seeded = generateDefaultVariantsAndInventory(db.products || DEFAULTS.products());
        db.variants = seeded.variants;
        if (!db.inventory || !db.inventory.length) {
          db.inventory = seeded.inventory;
        }
        if (!db.stockMoves) {
          db.stockMoves = seeded.stockMoves;
        }
        modified = true;
      }
      if (!db.returns) {
        db.returns = [];
        modified = true;
      }
      if (db.products && db.products.length) {
        var defProds = DEFAULTS.products();
        db.products.forEach(function (p) {
          if (!p.images || !p.images.length || !p.images[0] || !p.images[0].url) {
            var def = defProds.find(function (dp) { return dp.id === p.id || dp.sku === p.sku || dp.slug === p.slug; });
            if (def && def.images && def.images.length) {
              p.images = def.images;
              modified = true;
            } else {
              var thumb = getProductThumbnail(p);
              p.images = [{ url: thumb, alt: p.name || 'Product', isFeatured: true, format: 'webp' }];
              modified = true;
            }
          }
        });
      }
      if (modified) saveDB(db);
      return db;
    }
  } catch (e) {}
  var fresh = freshDB();
  saveDB(fresh);
  return fresh;
}

export function getProductThumbnail(p) {
  if (!p) return '/assets/98eab38550301ca9.q.jpg';
  if (p.images && p.images.length > 0) {
    var feat = p.images.find(function (img) { return img && (img.isFeatured || img.featured); }) || p.images[0];
    if (typeof feat === 'string') return feat;
    if (feat && feat.url) return feat.url;
    if (feat && feat.src) return feat.src;
  }
  var idMap = {
    m1: '/assets/ea97fe30fd8d1dfc.q.jpg',
    m2: '/assets/eeac2757b9ee2e46.q.jpg',
    m3: '/assets/7f3fd1f72139111d.q.jpg',
    m4: '/assets/e282ebdc1a55d0be.q.jpg',
    m5: '/assets/57e8f8ec76e792b1.q.jpg',
    m6: '/assets/9a83a5f92f7a34f6.q.jpg'
  };
  if (p.id && idMap[p.id]) return idMap[p.id];
  var name = (p.name || '').toLowerCase();
  if (name.includes('tee') || name.includes('shirt') || name.includes('knit')) return '/assets/98eab38550301ca9.q.jpg';
  if (name.includes('hoodie') || name.includes('sweat')) return '/assets/eeac2757b9ee2e46.q.jpg';
  if (name.includes('jacket') || name.includes('coat') || name.includes('bomber') || name.includes('blazer')) return '/assets/57e8f8ec76e792b1.q.jpg';
  if (name.includes('trouser') || name.includes('pant') || name.includes('cargo') || name.includes('denim') || name.includes('legging')) return '/assets/2461720fa204607a.q.jpg';
  if (name.includes('cap') || name.includes('hat')) return '/assets/7f3fd1f72139111d.q.jpg';
  if (name.includes('bag') || name.includes('tote')) return '/assets/e282ebdc1a55d0be.q.jpg';
  return '/assets/98eab38550301ca9.q.jpg';
}

export function saveDB(db) {
  try {
    SAFE_STORE.setItem("zylo-db", JSON.stringify(db));
  } catch (e) {}
}

/* Document Subtotals & VAT Calculation */
export function docSubtotal(doc) {
  if (!doc || !doc.items) return 0;
  return doc.items.reduce(function (sum, item) {
    return sum + (Number(item.qty || 0) * Number(item.rate || 0));
  }, 0);
}

export function docVat(doc, vatRate) {
  vatRate = vatRate != null ? vatRate : 13;
  if (!doc || !doc.vatable) return 0;
  var sub = docSubtotal(doc);
  return Math.round(sub * (vatRate / 100));
}

export function docTotal(doc, vatRate) {
  return docSubtotal(doc) + docVat(doc, vatRate);
}

/* Double-entry Accounting Engine */
export function buildJournal(db) {
  db = db || loadDB();
  var entries = [];
  var vatRate = db.settings ? db.settings.vatRate : 13;

  (db.sales || []).forEach(function (s) {
    var sub = docSubtotal(s);
    var vat = docVat(s, vatRate);
    var tot = sub + vat;
    entries.push({
      date: s.date,
      voucher: s.invoice,
      account: s.payment === "Credit" ? "Accounts Receivable" : "Cash & Bank",
      narration: "Sale to " + s.customer,
      debit: tot,
      credit: 0
    });
    entries.push({
      date: s.date,
      voucher: s.invoice,
      account: "Sales Revenue",
      narration: "Sale revenue (net)",
      debit: 0,
      credit: sub
    });
    if (vat > 0) {
      entries.push({
        date: s.date,
        voucher: s.invoice,
        account: "VAT Payable",
        narration: "Output VAT @ " + vatRate + "%",
        debit: 0,
        credit: vat
      });
    }
  });

  (db.purchases || []).forEach(function (p) {
    var sub = docSubtotal(p);
    var vat = docVat(p, vatRate);
    var tot = sub + vat;
    entries.push({
      date: p.date,
      voucher: p.bill,
      account: p.head || "Purchases (stock)",
      narration: "Purchase from " + p.supplier,
      debit: sub,
      credit: 0
    });
    if (vat > 0) {
      entries.push({
        date: p.date,
        voucher: p.bill,
        account: "VAT Receivable",
        narration: "Input VAT @ " + vatRate + "%",
        debit: vat,
        credit: 0
      });
    }
    entries.push({
      date: p.date,
      voucher: p.bill,
      account: "Cash & Bank",
      narration: "Payment to " + p.supplier,
      debit: 0,
      credit: tot
    });
  });

  return entries.sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
}

/* Data Integrity Check */
export function verifyIntegrity(db) {
  db = db || loadDB();
  var logs = [];
  var issueCount = 0;

  var products = db.products || [];
  var variants = db.variants || [];
  var inventory = db.inventory || [];
  var categories = db.categories || [];
  var sales = db.sales || [];
  var orders = db.orders || [];

  // Check product SKUs & categories
  var catIds = new Set(categories.map(c => c.id));
  products.forEach(p => {
    if (p.categoryId && !catIds.has(p.categoryId)) {
      logs.push(`⚠️ Product "${p.name}" (${p.sku}) references missing category ID "${p.categoryId}"`);
      issueCount++;
    }
  });

  // Check variants orphaned
  var prodIds = new Set(products.map(p => p.id));
  variants.forEach(v => {
    if (!prodIds.has(v.productId)) {
      logs.push(`⚠️ Variant "${v.sku}" is orphaned (Product ID "${v.productId}" not found)`);
      issueCount++;
    }
  });

  // Check inventory records
  var varIds = new Set(variants.map(v => v.id));
  inventory.forEach(inv => {
    if (!varIds.has(inv.variantId)) {
      logs.push(`⚠️ Inventory record ID "${inv.id}" points to missing variant ID "${inv.variantId}"`);
      issueCount++;
    }
  });

  if (issueCount === 0) {
    logs.push("✓ All collections schema valid. Zero orphaned records detected.");
    logs.push(`✓ Products: ${products.length} | Variants: ${variants.length} | Inventory: ${inventory.length} | Categories: ${categories.length} | Sales: ${sales.length} | Orders: ${orders.length}`);
  }

  return { issues: issueCount, logs: logs };
}
