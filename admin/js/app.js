/* ------------------------------------------------------------------
   Safe storage shim.
   localStorage throws (not just returns null) when the page is on an
   opaque origin, cookies are blocked, or storage is full. An unguarded
   call at load time kills the whole script, so everything goes through
   this wrapper, which falls back to in-memory storage.
   ------------------------------------------------------------------ */
var SAFE_STORE = (function () {
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

function icon(name, size) {
  size = size || 18;
  return '<svg class="hi" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" aria-hidden="true">' + (ICONS[name] || "") + '</svg>';
}
function paintIcons(root) {
  var scope = root || document;
  scope.querySelectorAll("[data-icon]").forEach(function (el) {
    if (el.getAttribute("data-painted")) return;
    el.innerHTML = icon(el.getAttribute("data-icon"), Number(el.getAttribute("data-size")) || 18);
    el.setAttribute("data-painted", "1");
  });
  scope.querySelectorAll("[data-icon-prefix]").forEach(function (el) {
    if (el.getAttribute("data-painted")) return;
    el.insertAdjacentHTML("afterbegin", icon(el.getAttribute("data-icon-prefix"), 15));
    el.setAttribute("data-painted", "1");
  });
}

/* ================= Theme ================= */
(function () {
  var stored = SAFE_STORE.getItem("zylo-theme");
  var prefers = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", stored ? stored === "dark" : prefers);
})();
function toggleTheme() {
  var d = document.documentElement.classList.toggle("dark");
  SAFE_STORE.setItem("zylo-theme", d ? "dark" : "light");
  syncThemeIcon();
}
function syncThemeIcon() {
  var btn = document.querySelector('[data-icon="sun"], [data-icon="moon"]');
  if (!btn) return;
  var dark = document.documentElement.classList.contains("dark");
  btn.setAttribute("data-icon", dark ? "sun" : "moon");
  btn.innerHTML = icon(dark ? "sun" : "moon", 17);
}

/* ================= Helpers ================= */
function money(n) {
  return "Rs " + Math.round(n).toLocaleString("en-IN");
}
function money2(n) {
  return Math.round(n * 100) / 100;
}
function today() { return new Date().toISOString().slice(0, 10); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function showToast(msg) {
  var t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--primary);color:var(--primary-foreground);padding:9px 18px;border-radius:8px;font-size:13px;z-index:999;box-shadow:0 4px 14px rgba(0,0,0,.18);";
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 1900);
}
function downloadCsv(filename, rows) {
  var csv = rows.map(function (r) {
    return r.map(function (c) { return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"'; }).join(",");
  }).join("\n");
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast("Downloaded " + filename);
}

/* ================= Data store ================= */
var APP_VERSION = "1.5.0";
var DB_VERSION = 5;

/* ============================================================
   DEFAULTS - the single source of truth for seed data.
   Used by first install, migrations, reset, import and tests.
   Every provider returns a fresh deep copy so callers can never
   mutate the canonical definition by accident.
   ============================================================ */
var DEFAULTS = {
  settings: function () {
    return {
      company: "Zylo Pvt. Ltd.", address: "Thamel, Kathmandu", pan: "601234567",
      vatRate: 13, invPrefix: "INV-", currency: "NPR", locale: "en-IN",
      timezone: "Asia/Kathmandu", dateFormat: "YYYY-MM-DD", fiscalYear: "2082/83"
    };
  },
  currencies: function () {
    return [
      { code: "NPR", symbol: "Rs", name: "Nepalese Rupee", rate: 1, base: true },
      { code: "USD", symbol: "$", name: "US Dollar", rate: 0.0075, base: false },
      { code: "INR", symbol: "Rs", name: "Indian Rupee", rate: 0.625, base: false }
    ];
  },
  units: function () {
    return [
      { code: "pcs", name: "Pieces" }, { code: "pair", name: "Pair" },
      { code: "set", name: "Set" }, { code: "box", name: "Box" },
      { code: "m", name: "Metre" }, { code: "kg", name: "Kilogram" }
    ];
  },
  roles: function () {
    return [
      { id: "r_super", name: "Super Admin", permissions: ["*"] },
      { id: "r_admin", name: "Admin", permissions: ["products:*", "orders:*", "inventory:*", "finance:*", "cms:*", "settings:read"] },
      { id: "r_manager", name: "Manager", permissions: ["products:*", "orders:*", "inventory:*", "finance:read"] },
      { id: "r_sales", name: "Sales", permissions: ["products:read", "orders:*", "customers:*"] },
      { id: "r_finance", name: "Finance", permissions: ["finance:*", "orders:read", "reports:*"] },
      { id: "r_warehouse", name: "Warehouse", permissions: ["inventory:*", "products:read"] },
      { id: "r_content", name: "Content Editor", permissions: ["cms:*", "products:read"] }
    ];
  },
  users: function () {
    return [
      { id: "u_admin", name: "Zylo Super Admin", email: "admin@zylo.com.np", roleId: "r_super", active: true, createdAt: nowIso() }
    ];
  },
  brands: function () {
    return [
      { id: "b_zylo", name: "Zylo", slug: "zylo", logo: "", description: "House label", active: true },
      { id: "b_zylolab", name: "Zylo Lab", slug: "zylo-lab", logo: "", description: "Experimental line", active: true }
    ];
  },
  collections: function () {
    return [
      { id: "col_ss26", name: "SS26 Drop", slug: "ss26-drop", description: "Spring/summer 2026", featured: true, active: true, productIds: [] },
      { id: "col_core", name: "Core Essentials", slug: "core-essentials", description: "Permanent range", featured: true, active: true, productIds: [] },
      { id: "col_sale", name: "Monsoon Sale", slug: "monsoon-sale", description: "Seasonal markdowns", featured: false, active: true, productIds: [] }
    ];
  },
  warehouses: function () {
    return [
      { id: "w1", name: "Kathmandu DC", code: "KTM", location: "Balaju, Kathmandu", active: true },
      { id: "w2", name: "Pokhara Store", code: "PKR", location: "Lakeside, Pokhara", active: true }
    ];
  },
  categories: function () {
    return [
    { id: "c_men", name: "Men", slug: "men", parentId: null, sortOrder: 0, featured: true, visible: true, status: "active", description: "Menswear", image: "", banner: "", icon: "", metaTitle: "Men", metaDesc: "" },
    { id: "c_app", name: "Apparel", slug: "apparel", parentId: "c_men", sortOrder: 0, featured: true, visible: true, status: "active", description: "Tops, bottoms and layers", image: "", banner: "", icon: "", metaTitle: "Apparel", metaDesc: "" },
    { id: "c_tops", name: "Tops", slug: "tops", parentId: "c_app", sortOrder: 0, featured: false, visible: true, status: "active", description: "", image: "", banner: "", icon: "", metaTitle: "", metaDesc: "" },
    { id: "c_bottoms", name: "Bottoms", slug: "bottoms", parentId: "c_app", sortOrder: 1, featured: false, visible: true, status: "active", description: "", image: "", banner: "", icon: "", metaTitle: "", metaDesc: "" },
    { id: "c_out", name: "Outerwear", slug: "outerwear", parentId: "c_men", sortOrder: 1, featured: false, visible: true, status: "active", description: "Shells and jackets", image: "", banner: "", icon: "", metaTitle: "", metaDesc: "" },
    { id: "c_acc", name: "Accessories", slug: "accessories", parentId: null, sortOrder: 1, featured: true, visible: true, status: "active", description: "Caps, socks and small goods", image: "", banner: "", icon: "", metaTitle: "", metaDesc: "" },
    { id: "c_bags", name: "Bags", slug: "bags", parentId: null, sortOrder: 2, featured: false, visible: true, status: "active", description: "", image: "", banner: "", icon: "", metaTitle: "", metaDesc: "" }
  ];
  },
  products: function () {
    return [
    { id: "m1", name: "Monolith Tee", slug: "monolith-tee", sku: "ZYL-APP-00001", categoryId: "c_tops", brand: "Zylo", brandId: "b_zylo",
      gender: "Unisex", season: "SS26", tags: ["tee", "core"], price: 1800, mrp: 2200, cost: 900,
      status: "published", labels: { featured: false, trending: false, newArrival: true, bestSelling: true },
      description: "Heavyweight cotton tee, garment-dyed.",
      options: { Colour: ["Black", "White"], Size: ["S", "M", "L"] } },
    { id: "m2", name: "Grid Hoodie", slug: "grid-hoodie", sku: "ZYL-APP-00002", categoryId: "c_tops", brand: "Zylo", brandId: "b_zylo",
      gender: "Unisex", season: "SS26", tags: ["hoodie", "new"], price: 3800, mrp: 4500, cost: 2100,
      status: "published", labels: { featured: true, trending: false, newArrival: true, bestSelling: false },
      description: "Brushed-back fleece with raised grid seams.",
      options: { Colour: ["Black"], Size: ["S", "M", "L", "XL"] } },
    { id: "m3", name: "Aperture Cap", slug: "aperture-cap", sku: "ZYL-ACC-00001", categoryId: "c_acc", brand: "Zylo", brandId: "b_zylo",
      gender: "Unisex", season: "SS26", tags: ["cap"], price: 1500, mrp: 0, cost: 700,
      status: "published", labels: { featured: false, trending: false, newArrival: false, bestSelling: false },
      description: "Six-panel cap with debossed ring logo.",
      options: { Colour: ["Black"], Size: ["One size"] } },
    { id: "m4", name: "Ledger Tote", slug: "ledger-tote", sku: "ZYL-BAG-00001", categoryId: "c_bags", brand: "Zylo", brandId: "b_zylo",
      gender: "Unisex", season: "SS26", tags: ["bag"], price: 2200, mrp: 0, cost: 1100,
      status: "published", labels: { featured: true, trending: false, newArrival: false, bestSelling: false },
      description: "Waxed canvas tote with reinforced base.",
      options: { Colour: ["Natural", "Black"], Size: ["One size"] } },
    { id: "m5", name: "Contour Jacket", slug: "contour-jacket", sku: "ZYL-OUT-00001", categoryId: "c_out", brand: "Zylo", brandId: "b_zylo",
      gender: "Unisex", season: "SS26", tags: ["jacket"], price: 7200, mrp: 8600, cost: 4200,
      status: "draft", labels: { featured: true, trending: false, newArrival: false, bestSelling: false },
      description: "Cropped shell with taped seams.",
      options: { Colour: ["Black"], Size: ["S", "M", "L"] } },
    { id: "m6", name: "Frame Trousers", slug: "frame-trousers", sku: "ZYL-APP-00003", categoryId: "c_bottoms", brand: "Zylo", brandId: "b_zylo",
      gender: "Unisex", season: "SS26", tags: ["trousers"], price: 3000, mrp: 3600, cost: 1500,
      status: "draft", labels: { featured: false, trending: false, newArrival: false, bestSelling: false },
      description: "Straight leg with articulated knee.",
      options: { Colour: ["Black"], Size: ["30", "32", "34"] } }
  ];
  },
  sales: function () {
    return [
    { id: "s1", invoice: "INV-2029", orderNo: "ZY-1040", customerPhone: "+977 98-09-112233", date: offsetDate(-32), customer: "Anjali Shrestha", payment: "eSewa", vatable: true,
      items: [{ desc: "Contour Jacket", qty: 1, rate: 6372 }] },
    { id: "s2", invoice: "INV-2030", orderNo: "ZY-1041", customerPhone: "+977 98-04-556677", date: offsetDate(-12), customer: "Bikash Thapa", payment: "COD", vatable: true,
      items: [{ desc: "Monolith Tee", qty: 2, rate: 1593 }] },
    { id: "s3", invoice: "INV-2031", orderNo: "ZY-1042", customerPhone: "+977 98-01-234567", date: offsetDate(-5), customer: "Sita Rai", payment: "Cash", vatable: true,
      items: [{ desc: "Grid Hoodie", qty: 1, rate: 3363 }] },
    { id: "s4", invoice: "INV-2032", orderNo: "", customerPhone: "", date: offsetDate(-1), customer: "Walk-in customer", payment: "Cash", vatable: true,
      items: [{ desc: "Aperture Cap", qty: 2, rate: 1327 }, { desc: "Signal Beanie", qty: 1, rate: 1062 }] },
    { id: "s5", invoice: "INV-2033", orderNo: "ZY-1039", customerPhone: "+977 98-05-998877", date: offsetDate(-4), customer: "Prakash Gurung", payment: "Fonepay", vatable: true,
      items: [{ desc: "Ledger Tote", qty: 3, rate: 1947 }] },
    { id: "s6", invoice: "INV-2034", orderNo: "ZY-1038", customerPhone: "+977 98-02-334455", date: offsetDate(-3), customer: "Nisha Karki", payment: "Credit", vatable: true,
      items: [{ desc: "Frame Trousers", qty: 2, rate: 2655 }, { desc: "Monolith Tee", qty: 3, rate: 1593 }] },
    { id: "s7", invoice: "INV-2035", orderNo: "", customerPhone: "", date: offsetDate(-2), customer: "Retail counter", payment: "Cash", vatable: true,
      items: [{ desc: "Grid Hoodie", qty: 4, rate: 3363 }] },
    { id: "s8", invoice: "INV-2036", orderNo: "", customerPhone: "+977 98-01-234567", date: today(), customer: "Sita Rai", payment: "eSewa", vatable: true,
      items: [{ desc: "Contour Jacket", qty: 2, rate: 6372 }, { desc: "Halftone Socks", qty: 2, rate: 885 }] }
  ];
  },
  purchases: function () {
    return [
    { id: "p1", bill: "BILL-501", date: offsetDate(-30), supplier: "Kathmandu Textiles", head: "Purchases (stock)", vatable: true,
      items: [{ desc: "Fleece fabric roll", qty: 20, rate: 1800 }] },
    { id: "p2", bill: "BILL-502", date: offsetDate(-15), supplier: "Everest Logistics", head: "Freight and delivery", vatable: true,
      items: [{ desc: "Courier charges", qty: 1, rate: 8500 }] },
    { id: "p3", bill: "BILL-503", date: offsetDate(-3), supplier: "Thamel Properties", head: "Rent", vatable: false,
      items: [{ desc: "Shop rent (monthly)", qty: 1, rate: 45000 }] }
  ];
  },
  pages: function () {
    return [
    { id: "pg1", title: "Homepage", slug: "/", status: "published", updated: offsetDate(-1), meta: "Zylo - Monochrome essentials", content: "<h3>Welcome to Zylo</h3><p>Monochrome essentials, built to last.</p>" },
    { id: "pg2", title: "About", slug: "/about", status: "published", updated: offsetDate(-5), meta: "About Zylo", content: "<p>Zylo is a black-and-white essentials label based in Kathmandu.</p>" },
    { id: "pg3", title: "Returns policy", slug: "/returns", status: "published", updated: offsetDate(-13), meta: "Returns", content: "<p>Free returns within 30 days of delivery.</p>" },
    { id: "pg4", title: "Monsoon sale", slug: "/campaigns/monsoon", status: "scheduled", updated: offsetDate(3), meta: "Monsoon sale", content: "<p>Up to 40% off selected styles.</p>" },
    { id: "pg5", title: "FAQ", slug: "/faq", status: "draft", updated: offsetDate(-2), meta: "FAQ", content: "<h3>Do you deliver outside the valley?</h3><p>Yes, nationwide.</p>" }
  ];
  },
  orders: function () {
    return [
    { no: "ZY-1042", customer: "Sita Rai", date: offsetDate(0), total: 3800, pay: "COD", status: "pending" },
    { no: "ZY-1041", customer: "Bikash Thapa", date: offsetDate(-1), total: 1800, pay: "eSewa", status: "delivered" },
    { no: "ZY-1040", customer: "Anjali Shrestha", date: offsetDate(-1), total: 7200, pay: "Fonepay", status: "shipped" },
    { no: "ZY-1039", customer: "Prakash Gurung", date: offsetDate(-2), total: 2200, pay: "COD", status: "confirmed" },
    { no: "ZY-1038", customer: "Nisha Karki", date: offsetDate(-3), total: 1200, pay: "COD", status: "cancelled" }
  ];
  },
  customers: function () {
    return [
    { name: "Sita Rai", phone: "+977 98-01-234567", city: "Kathmandu", orders: 4, spend: 14200 },
    { name: "Bikash Thapa", phone: "+977 98-04-556677", city: "Pokhara", orders: 2, spend: 5600 },
    { name: "Anjali Shrestha", phone: "+977 98-09-112233", city: "Lalitpur", orders: 7, spend: 28900 },
    { name: "Prakash Gurung", phone: "+977 98-05-998877", city: "Bhaktapur", orders: 1, spend: 2200 },
      { name: "Nisha Karki", phone: "+977 98-02-334455", city: "Kathmandu", orders: 1, spend: 1200 }
  ];
  },
  variants: function () { return []; },
  inventory: function () { return []; },
  stockMoves: function () { return []; },
  returns: function () { return []; },
  auditLog: function () { return []; }
};

function nowIso() { return new Date().toISOString(); }
function deepCopy(x) { return JSON.parse(JSON.stringify(x)); }

/* Collections that must always exist. Missing ones are created from
   DEFAULTS during migration, so a new release never lands on undefined. */
var COLLECTION_KEYS = ["settings", "currencies", "units", "roles", "users", "brands",
  "collections", "warehouses", "categories", "products", "variants", "inventory",
  "stockMoves", "sales", "purchases", "pages", "orders", "customers", "returns", "auditLog"];

function freshDB() {
  var db = { version: DB_VERSION, appVersion: APP_VERSION, createdAt: nowIso(), lastMigratedAt: nowIso() };
  COLLECTION_KEYS.forEach(function (k) { db[k] = DEFAULTS[k](); });
  return db;
}

var DB = freshDB();

function uid(prefix) {
  return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function offsetDate(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function saveDB() { SAFE_STORE.setItem("zylo-db", JSON.stringify(DB)); }

/* Resolves sale line items to catalogue variants and back-fills order
   line items. Shared by seedDB() and migration v5 so a fresh install and
   an upgrade end up with identical structure. */
function linkSalesToCatalog(db) {
  var stats = { skued: 0, orders: 0, phones: 0 };
  var phoneByName = {};
  (db.customers || []).forEach(function (c) { phoneByName[c.name] = c.phone; });
  var masterByName = {};
  (db.products || []).forEach(function (m) { masterByName[m.name.toLowerCase()] = m; });
  var firstVariantOf = {};
  (db.variants || []).forEach(function (v) { if (!firstVariantOf[v.productId]) firstVariantOf[v.productId] = v; });

  (db.sales || []).forEach(function (s) {
    if (!s.customerPhone) { s.customerPhone = phoneByName[s.customer] || ""; if (s.customerPhone) stats.phones++; }
    if (s.orderNo === undefined) s.orderNo = "";
    (s.items || []).forEach(function (it) {
      if (it.variantId) return;
      var m = masterByName[String(it.desc || "").toLowerCase()];
      var v = m ? firstVariantOf[m.id] : null;
      it.sku = v ? v.sku : (it.sku || "");
      it.variantId = v ? v.id : null;
      if (v) stats.skued++;
    });
  });
  (db.orders || []).forEach(function (o) {
    if (Array.isArray(o.items) && o.items.length) return;
    var sale = (db.sales || []).filter(function (s) { return s.orderNo === o.no; })[0];
    o.items = sale ? deepCopy(sale.items) : [];
    o.invoice = sale ? sale.invoice : (o.invoice || "");
    stats.orders++;
  });
  return stats;
}

/* Build the demo dataset: defaults plus the derived records that depend
   on them (variants from product options, inventory from variants). */
function seedDB() {
  DB = freshDB();
  DB.products.forEach(function (m) { generateVariants(m, true); });
  DB.variants.forEach(function (v, i) {
    var qty = [42, 18, 4, 0, 12, 7, 0, 25, 9, 31, 3, 16][i % 12];
    addInventoryRecord({
      variantId: v.id, warehouseId: "w1", available: qty,
      reserved: i % 5 === 0 ? 2 : 0, incoming: i % 7 === 0 ? 20 : 0,
      damaged: i % 11 === 0 ? 1 : 0, returned: 0,
      reorderLevel: 5, minStock: 2, maxStock: 120
    }, true);
    if (i % 3 === 0) {
      addInventoryRecord({
        variantId: v.id, warehouseId: "w2", available: Math.max(0, Math.round(qty / 3)),
        reserved: 0, incoming: 0, damaged: 0, returned: 0,
        reorderLevel: 3, minStock: 1, maxStock: 60
      }, true);
    }
  });
  setVariantState(m_sku("ZYL-APP-00001", "White", "L"), { status: "out_of_stock", published: true });
  setVariantState(m_sku("ZYL-APP-00002", "Black", "XL"), { status: "disabled", published: false });
  setVariantState(m_sku("ZYL-OUT-00001", "Black", "S"), { status: "discontinued", published: false });
  linkSalesToCatalog(DB);
  DB.auditLog.unshift({
    id: uid("audit"), at: nowIso(), type: "install",
    from: null, to: DB_VERSION,
    summary: {
      fromVersion: null, toVersion: DB_VERSION, migrated: 0, updated: 0,
      created: DB.products.length + DB.variants.length + DB.inventory.length,
      removed: 0, steps: ["Fresh installation at schema v" + DB_VERSION],
      notes: ["Seeded " + DB.products.length + " master products, " + DB.variants.length +
              " variants and " + DB.inventory.length + " inventory records"],
      warnings: [], errors: [], repairs: [], finishedAt: nowIso()
    }
  });
  saveDB();
}
/* Kept for callers that predate DEFAULTS */
function defaultCategories() { return DEFAULTS.categories(); }

/* ============================================================
   MIGRATION ENGINE
   One entry per schema step. Each is idempotent: running it twice
   must produce the same result. The engine records what changed so
   the outcome is auditable rather than invisible.
   ============================================================ */
var MIGRATIONS = [
  {
    to: 2,
    describe: "Category tree, master products and variants",
    run: function (db, r) {
      if (!db.categories || !db.categories.length) {
        db.categories = DEFAULTS.categories();
        r.created += db.categories.length;
        r.notes.push("Seeded " + db.categories.length + " default categories");
      }
      var legacy = db.products || [];
      var looksLegacy = legacy.length && legacy[0] && legacy[0].id === undefined;
      if (looksLegacy) {
        var byName = {};
        db.categories.forEach(function (c) { byName[c.name.toLowerCase()] = c.id; });
        db.products = legacy.map(function (p, i) {
          return {
            id: "m_mig" + i, name: p.name, slug: slugify(p.name), sku: p.sku,
            categoryId: byName[String(p.cat || "").toLowerCase()] || null,
            brand: "Zylo", gender: "", season: "", tags: [],
            price: p.price, mrp: 0, cost: 0, status: p.status || "draft",
            labels: { featured: false, trending: false, newArrival: false, bestSelling: false },
            description: "", options: { Size: ["One size"] }
          };
        });
        r.migrated += db.products.length;
        r.notes.push("Converted " + db.products.length + " flat products to master products");
        db.variants = [];
        withDB(db, function () {
          db.products.forEach(function (m) { generateVariants(m, true); });
        });
        r.created += db.variants.length;
        r.notes.push("Generated " + db.variants.length + " variants");
      }
      if (!db.variants) db.variants = [];
    }
  },
  {
    to: 3,
    describe: "Warehouses, variant-level inventory and stock ledger",
    run: function (db, r) {
      if (!db.warehouses || !db.warehouses.length) {
        db.warehouses = DEFAULTS.warehouses();
        r.created += db.warehouses.length;
        r.notes.push("Seeded " + db.warehouses.length + " warehouses");
      }
      if (!db.stockMoves) db.stockMoves = [];
      var legacyInv = Array.isArray(db.inventory) ? db.inventory : [];
      var looksLegacyInv = legacyInv.length && legacyInv[0] && legacyInv[0].variantId === undefined;
      if (looksLegacyInv || !legacyInv.length) {
        var qtyBySku = {};
        if (looksLegacyInv) {
          legacyInv.forEach(function (rec) { if (rec.sku) qtyBySku[rec.sku] = Number(rec.qty) || 0; });
          r.notes.push("Carried " + Object.keys(qtyBySku).length + " legacy stock quantities across by SKU");
        }
        db.inventory = [];
        // Legacy rows were keyed on the product SKU, while variant SKUs carry
        // an option suffix. Match the variant SKU first, then fall back to the
        // master SKU - but only when that master has a single variant, so
        // stock is never duplicated across a matrix.
        var variantsPerMaster = {};
        (db.variants || []).forEach(function (v) {
          variantsPerMaster[v.productId] = (variantsPerMaster[v.productId] || 0) + 1;
        });
        var masterSkuById = {};
        (db.products || []).forEach(function (m) { masterSkuById[m.id] = m.sku; });
        var carried = 0;
        withDB(db, function () {
          (db.variants || []).forEach(function (v) {
            var qty = qtyBySku[v.sku];
            if (qty == null && variantsPerMaster[v.productId] === 1) {
              qty = qtyBySku[masterSkuById[v.productId]];
            }
            if (qty != null) carried++;
            addInventoryRecord({
              variantId: v.id, warehouseId: "w1",
              available: qty != null ? qty : 0,
              reserved: 0, incoming: 0, damaged: 0, returned: 0,
              reorderLevel: 5, minStock: 0, maxStock: 0
            }, true);
          });
        });
        if (carried) r.notes.push("Matched " + carried + " legacy stock quantities to variants");
        r.created += db.inventory.length;
        r.notes.push("Created " + db.inventory.length + " inventory records");
      }
    }
  },
  {
    to: 4,
    describe: "Brands, collections, roles, users, currencies and units",
    run: function (db, r) {
      ["brands", "collections", "roles", "users", "currencies", "units", "auditLog"].forEach(function (k) {
        if (!Array.isArray(db[k]) || (!db[k].length && k !== "auditLog")) {
          db[k] = DEFAULTS[k]();
          if (db[k].length) {
            r.created += db[k].length;
            r.notes.push("Seeded " + db[k].length + " " + k);
          }
        }
      });
      // Products carried a free-text brand string; map it onto brand records.
      var byName = {};
      db.brands.forEach(function (b) { byName[b.name.toLowerCase()] = b.id; });
      var linked = 0;
      (db.products || []).forEach(function (p) {
        if (p.brandId) return;
        var key = String(p.brand || "").toLowerCase();
        p.brandId = byName[key] || db.brands[0].id;
        linked++;
      });
      if (linked) { r.updated += linked; r.notes.push("Linked " + linked + " products to brand records"); }
      // Fill in settings keys added since the user's version
      var defs = DEFAULTS.settings();
      var added = 0;
      db.settings = db.settings || {};
      Object.keys(defs).forEach(function (k) {
        if (db.settings[k] === undefined) { db.settings[k] = defs[k]; added++; }
      });
      if (added) { r.updated += added; r.notes.push("Added " + added + " missing settings keys"); }
    }
  },
  {
    to: 5,
    describe: "Sales returns: order links, customer phones and line-item SKUs",
    run: function (db, r) {
      if (!Array.isArray(db.returns)) db.returns = [];
      // Pair sales with orders of the same customer and amount before linking.
      var ordersByCustomer = {};
      (db.orders || []).forEach(function (o) {
        (ordersByCustomer[o.customer] = ordersByCustomer[o.customer] || []).push(o);
      });
      var linked = 0;
      (db.sales || []).forEach(function (s) {
        if (s.orderNo) return;
        var net = (s.items || []).reduce(function (a, i) { return a + (Number(i.qty) || 0) * (Number(i.rate) || 0); }, 0);
        var gross = Math.round(net * (s.vatable ? 1 + ((db.settings || {}).vatRate || 13) / 100 : 1));
        var hit = (ordersByCustomer[s.customer] || []).filter(function (o) {
          return Math.abs(o.total - gross) <= 2 || Math.abs(o.total - net) <= 2;
        })[0];
        s.orderNo = hit ? hit.no : "";
        if (hit) linked++;
      });
      var stats = linkSalesToCatalog(db);
      if (linked) { r.updated += linked; r.notes.push("Linked " + linked + " sales to order numbers"); }
      if (stats.skued) { r.updated += stats.skued; r.notes.push("Resolved SKUs on " + stats.skued + " sale line items"); }
      if (stats.orders) { r.updated += stats.orders; r.notes.push("Back-filled line items on " + stats.orders + " orders"); }
    }
  }
];

/* Temporarily points the global DB at another object so helper functions
   that operate on DB can be reused inside migrations. */
function withDB(db, fn) {
  var saved = DB;
  DB = db;
  try { fn(); } finally { DB = saved; }
}

function runMigrations(db) {
  var report = {
    startedAt: nowIso(), fromVersion: db.version || 1, toVersion: DB_VERSION,
    migrated: 0, updated: 0, created: 0, removed: 0,
    steps: [], notes: [], warnings: [], errors: [], repairs: []
  };
  if (!db.version) {
    report.warnings.push("No schema version found - treating this database as version 1");
    db.version = 1;
  }
  MIGRATIONS.forEach(function (step) {
    if (db.version >= step.to) return;
    try {
      step.run(db, report);
      db.version = step.to;
      report.steps.push("v" + (step.to - 1) + " to v" + step.to + ": " + step.describe);
    } catch (e) {
      report.errors.push("Migration to v" + step.to + " failed: " + e.message);
    }
  });
  // Any collection still missing gets its default, whatever the version path.
  COLLECTION_KEYS.forEach(function (k) {
    if (db[k] === undefined || db[k] === null) {
      db[k] = DEFAULTS[k]();
      report.warnings.push("Collection '" + k + "' was missing and has been created");
    }
  });
  db.appVersion = APP_VERSION;
  db.lastMigratedAt = nowIso();
  var validation = validateDB(db, true);
  report.repairs = validation.repairs;
  report.warnings = report.warnings.concat(validation.warnings);
  report.errors = report.errors.concat(validation.errors);
  report.removed += validation.removed;
  report.finishedAt = nowIso();
  db.auditLog = db.auditLog || [];
  db.auditLog.unshift({
    id: uid("audit"), at: report.finishedAt, type: "migration",
    from: report.fromVersion, to: db.version, summary: report
  });
  if (db.auditLog.length > 50) db.auditLog = db.auditLog.slice(0, 50);
  return report;
}

/* ============================================================
   VALIDATION AND REPAIR
   Repairs the safely-fixable, reports the rest rather than
   silently dropping user data.
   ============================================================ */
function validateDB(db, repair) {
  var out = { repairs: [], warnings: [], errors: [], removed: 0 };
  var catIds = {}, brandIds = {}, masterIds = {}, variantIds = {};
  (db.categories || []).forEach(function (c) { catIds[c.id] = 1; });
  (db.brands || []).forEach(function (b) { brandIds[b.id] = 1; });
  (db.products || []).forEach(function (m) { masterIds[m.id] = 1; });
  (db.variants || []).forEach(function (v) { variantIds[v.id] = 1; });

  // Category parents must exist, or the tree becomes unreachable
  (db.categories || []).forEach(function (c) {
    if (c.parentId && !catIds[c.parentId]) {
      if (repair) { c.parentId = null; out.repairs.push("Category '" + c.name + "' had a missing parent - moved to top level"); }
      else out.warnings.push("Category '" + c.name + "' references a missing parent");
    }
  });
  // Products must point at a real category and brand
  (db.products || []).forEach(function (m) {
    if (m.categoryId && !catIds[m.categoryId]) {
      if (repair) { m.categoryId = null; out.repairs.push("Product '" + m.name + "' had a missing category - set to uncategorised"); }
      else out.warnings.push("Product '" + m.name + "' references a missing category");
    }
    if (m.brandId && !brandIds[m.brandId]) {
      if (repair) { m.brandId = (db.brands[0] || {}).id || null; out.repairs.push("Product '" + m.name + "' had a missing brand - reassigned"); }
      else out.warnings.push("Product '" + m.name + "' references a missing brand");
    }
    if (!m.options || !Object.keys(m.options).length) {
      if (repair) { m.options = { Size: ["One size"] }; out.repairs.push("Product '" + m.name + "' had no options - given a default"); }
    }
  });
  // Orphan variants
  var beforeV = (db.variants || []).length;
  if (repair) {
    db.variants = (db.variants || []).filter(function (v) { return masterIds[v.productId]; });
    var lostV = beforeV - db.variants.length;
    if (lostV) { out.removed += lostV; out.repairs.push("Removed " + lostV + " orphan variant(s) with no master product"); }
    (db.variants || []).forEach(function (v) { variantIds[v.id] = 1; });
  } else {
    var orphanV = (db.variants || []).filter(function (v) { return !masterIds[v.productId]; }).length;
    if (orphanV) out.warnings.push(orphanV + " orphan variant(s)");
  }
  // Orphan inventory
  var whIds = {};
  (db.warehouses || []).forEach(function (w) { whIds[w.id] = 1; });
  var beforeI = (db.inventory || []).length;
  if (repair) {
    db.inventory = (db.inventory || []).filter(function (r) { return variantIds[r.variantId] && whIds[r.warehouseId]; });
    var lostI = beforeI - db.inventory.length;
    if (lostI) { out.removed += lostI; out.repairs.push("Removed " + lostI + " orphan inventory record(s)"); }
  } else {
    var orphanI = (db.inventory || []).filter(function (r) { return !variantIds[r.variantId] || !whIds[r.warehouseId]; }).length;
    if (orphanI) out.warnings.push(orphanI + " orphan inventory record(s)");
  }
  // Duplicate variant SKUs would break stock lookups
  var seen = {};
  (db.variants || []).forEach(function (v) {
    if (seen[v.sku]) {
      if (repair) { var fixed = v.sku + "-D" + Math.floor(Math.random() * 900 + 100); out.repairs.push("Duplicate SKU '" + v.sku + "' renamed to '" + fixed + "'"); v.sku = fixed; }
      else out.warnings.push("Duplicate variant SKU '" + v.sku + "'");
    }
    seen[v.sku] = 1;
  });
  // Money fields must be numbers or every total silently becomes NaN
  (db.sales || []).concat(db.purchases || []).forEach(function (doc) {
    (doc.items || []).forEach(function (it) {
      if (typeof it.qty !== "number" || typeof it.rate !== "number") {
        if (repair) { it.qty = Number(it.qty) || 0; it.rate = Number(it.rate) || 0; out.repairs.push("Coerced non-numeric amounts on " + (doc.invoice || doc.bill)); }
        else out.errors.push("Non-numeric amounts on " + (doc.invoice || doc.bill));
      }
    });
  });
  return out;
}

/* Read-only scan used by the integrity checker UI */
function integrityScan() {
  var issues = [];
  function add(kind, detail, fixable) { issues.push({ kind: kind, detail: detail, fixable: !!fixable }); }
  var catIds = {}; DB.categories.forEach(function (c) { catIds[c.id] = 1; });
  var brandIds = {}; DB.brands.forEach(function (b) { brandIds[b.id] = 1; });
  var masterIds = {}; DB.products.forEach(function (m) { masterIds[m.id] = 1; });
  var variantIds = {}; DB.variants.forEach(function (v) { variantIds[v.id] = 1; });

  DB.products.forEach(function (m) {
    if (m.categoryId && !catIds[m.categoryId]) add("Broken category reference", m.name, true);
    else if (!m.categoryId) add("Uncategorised product", m.name, false);
    if (m.brandId && !brandIds[m.brandId]) add("Broken brand reference", m.name, true);
    else if (!m.brandId) add("Product without brand", m.name, true);
  });
  var skus = {}, slugs = {}, bars = {};
  DB.products.forEach(function (m) {
    if (slugs[m.slug]) add("Duplicate slug", m.slug + " (" + m.name + ")", true);
    slugs[m.slug] = 1;
  });
  DB.variants.forEach(function (v) {
    if (skus[v.sku]) add("Duplicate SKU", v.sku, true);
    skus[v.sku] = 1;
    if (v.barcode) { if (bars[v.barcode]) add("Duplicate barcode", v.barcode, true); bars[v.barcode] = 1; }
    if (!masterIds[v.productId]) add("Orphan variant", v.sku, true);
    var hasStock = DB.inventory.some(function (r) { return r.variantId === v.id; });
    if (!hasStock) add("Variant without stock record", v.sku, true);
  });
  DB.inventory.forEach(function (r) {
    if (!variantIds[r.variantId]) add("Orphan inventory record", r.id, true);
  });
  var custNames = {}; DB.customers.forEach(function (c) { custNames[c.name] = 1; });
  DB.orders.forEach(function (o) {
    if (o.customer && !custNames[o.customer]) add("Order references unknown customer", o.no + " (" + o.customer + ")", false);
  });
  return issues;
}

function repairAll() {
  var before = integrityScan().length;
  var res = validateDB(DB, true);
  // Give every variant lacking stock a zero record in the primary warehouse
  var fallbackBrand = (DB.brands[0] || {}).id;
  if (fallbackBrand) {
    DB.products.forEach(function (m) {
      if (!m.brandId) { m.brandId = fallbackBrand; res.repairs.push("Assigned default brand to " + m.name); }
    });
  }
  var wh = (DB.warehouses[0] || {}).id;
  if (wh) {
    DB.variants.forEach(function (v) {
      if (!DB.inventory.some(function (r) { return r.variantId === v.id; })) {
        addInventoryRecord({ variantId: v.id, warehouseId: wh, available: 0, reorderLevel: 5 }, true);
        res.repairs.push("Created a zero-stock record for " + v.sku);
      }
    });
  }
  DB.auditLog.unshift({ id: uid("audit"), at: nowIso(), type: "repair",
    summary: { repairs: res.repairs, removed: res.removed } });
  saveDB();
  return { before: before, after: integrityScan().length, repairs: res.repairs };
}

function loadDB() {
  var raw = SAFE_STORE.getItem("zylo-db");
  if (!raw) { seedDB(); return { fresh: true }; }
  var parsed;
  try { parsed = JSON.parse(raw); } catch (e) {
    seedDB();
    return { fresh: true, corrupt: true, message: "Stored data was unreadable and has been reset" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    seedDB();
    return { fresh: true, corrupt: true, message: "Stored data was not a valid database and has been reset" };
  }
  var report = runMigrations(parsed);
  DB = parsed;
  saveDB();
  return { fresh: false, report: report };
}

function lastMigrationReport() {
  var entry = (DB.auditLog || []).filter(function (a) {
    return a.type === "migration" || a.type === "install";
  })[0];
  return entry ? entry.summary : null;
}

/* ============================================================
   Category tree helpers
   Unlimited depth via self-referencing parentId, so a simple
   product needs no filler levels while deep chains still work.
   ============================================================ */
function catById(id) {
  for (var i = 0; i < DB.categories.length; i++) if (DB.categories[i].id === id) return DB.categories[i];
  return null;
}
function catChildren(parentId) {
  return DB.categories.filter(function (c) { return (c.parentId || null) === (parentId || null); })
    .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
}
function catPath(id) {
  var out = [], guard = 0;
  var c = catById(id);
  while (c && guard++ < 20) { out.unshift(c.name); c = c.parentId ? catById(c.parentId) : null; }
  return out.join(" / ");
}
function catDepth(id) {
  var d = 0, guard = 0;
  var c = catById(id);
  while (c && c.parentId && guard++ < 20) { d++; c = catById(c.parentId); }
  return d;
}
function catDescendants(id) {
  var out = [];
  (function walk(pid) {
    catChildren(pid).forEach(function (c) { out.push(c.id); walk(c.id); });
  })(id);
  return out;
}
/* Flattened tree for select boxes and the tree view */
function catFlat() {
  var out = [];
  (function walk(pid, depth) {
    catChildren(pid).forEach(function (c) {
      out.push({ cat: c, depth: depth });
      walk(c.id, depth + 1);
    });
  })(null, 0);
  return out;
}

/* ============================================================
   Variant engine
   A master product holds its option sets; variants are the
   cartesian product of those options and are the only sellable,
   stock-carrying, publishable records.
   ============================================================ */
function optionNames(master) {
  return Object.keys(master.options || {});
}
function variantCombos(master) {
  var names = optionNames(master);
  if (!names.length) return [{}];
  var combos = [{}];
  names.forEach(function (n) {
    var next = [];
    combos.forEach(function (base) {
      (master.options[n] || []).forEach(function (v) {
        var copy = {};
        Object.keys(base).forEach(function (k) { copy[k] = base[k]; });
        copy[n] = v;
        next.push(copy);
      });
    });
    combos = next;
  });
  return combos;
}
function shortCode(s) {
  return String(s).replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
}
function m_sku(masterSku, colour, size) {
  var parts = [masterSku];
  if (colour) parts.push(shortCode(colour));
  if (size) parts.push(shortCode(size));
  return parts.join("-");
}
function variantSkuFor(master, combo) {
  var parts = [master.sku];
  optionNames(master).forEach(function (n) { if (combo[n]) parts.push(shortCode(combo[n])); });
  return parts.join("-");
}
function variantsOf(masterId) {
  return DB.variants.filter(function (v) { return v.productId === masterId; });
}
function variantBySku(sku) {
  for (var i = 0; i < DB.variants.length; i++) if (DB.variants[i].sku === sku) return DB.variants[i];
  return null;
}
function setVariantState(sku, patch) {
  var v = variantBySku(sku);
  if (!v) return;
  Object.keys(patch).forEach(function (k) { v[k] = patch[k]; });
}
/* Rebuilds a master's variant matrix, preserving existing rows by SKU so
   status, price overrides and stock are never silently wiped. */
function generateVariants(master, seeding) {
  var existing = {};
  variantsOf(master.id).forEach(function (v) { existing[v.sku] = v; });
  var combos = variantCombos(master);
  var kept = [];
  combos.forEach(function (combo) {
    var sku = variantSkuFor(master, combo);
    if (existing[sku]) {
      existing[sku].options = combo;
      kept.push(existing[sku]);
      delete existing[sku];
    } else {
      kept.push({
        id: uid("v"), productId: master.id, sku: sku, barcode: "",
        options: combo, price: null,
        status: master.status === "published" ? "active" : "draft",
        published: master.status === "published"
      });
    }
  });
  // Drop rows whose option combination no longer exists
  DB.variants = DB.variants.filter(function (v) {
    return v.productId !== master.id || !existing[v.sku];
  });
  var others = DB.variants.filter(function (v) { return v.productId !== master.id; });
  DB.variants = others.concat(kept);
  if (!seeding) saveDB();
  return kept;
}
function variantLabel(v) {
  var parts = [];
  Object.keys(v.options || {}).forEach(function (k) { parts.push(v.options[k]); });
  return parts.join(" / ") || "Default";
}
function variantPrice(v) {
  if (v.price != null && v.price !== "") return Number(v.price);
  var m = masterById(v.productId);
  return m ? m.price : 0;
}
function masterById(id) {
  for (var i = 0; i < DB.products.length; i++) if (DB.products[i].id === id) return DB.products[i];
  return null;
}

var VARIANT_STATUSES = ["active", "draft", "published", "hidden", "out_of_stock", "discontinued", "archived"];
var VARIANT_STATUS_LABEL = {
  active: "Active", draft: "Draft", published: "Published", hidden: "Hidden",
  out_of_stock: "Out of stock", discontinued: "Discontinued", archived: "Archived"
};
var VARIANT_STATUS_BADGE = {
  active: "badge-success", published: "badge-success", draft: "badge-muted",
  hidden: "badge-muted", out_of_stock: "badge-warning",
  discontinued: "badge-danger", archived: "badge-danger"
};

/* ================= Money maths ================= */
function docSubtotal(doc) {
  return doc.items.reduce(function (s, i) { return s + (Number(i.qty) || 0) * (Number(i.rate) || 0); }, 0);
}
function docVat(doc) {
  return doc.vatable ? docSubtotal(doc) * (DB.settings.vatRate / 100) : 0;
}
function docTotal(doc) { return docSubtotal(doc) + docVat(doc); }

/* ================= Double-entry engine ================= */
// Sale:     Dr Cash/Receivable (total) | Cr Sales revenue (net) + Cr VAT payable (vat)
// Purchase: Dr Expense head (net) + Dr VAT receivable (vat) | Cr Cash/Payable (total)
function buildJournal() {
  var entries = [];
  DB.sales.forEach(function (s) {
    var net = docSubtotal(s), vat = docVat(s), tot = net + vat;
    var debitAcct = s.payment === "Credit" ? "Accounts receivable" : "Cash and bank";
    var lines = [{ account: debitAcct, dr: tot, cr: 0 }, { account: "Sales revenue", dr: 0, cr: net }];
    if (vat > 0) lines.push({ account: "VAT payable", dr: 0, cr: vat });
    entries.push({ date: s.date, voucher: s.invoice, type: "Sale",
      narration: "Sale to " + s.customer, lines: lines });
  });
  // Credit notes for approved sales returns: reverse revenue and the VAT
  // originally collected, and show the cash going back out.
  (DB.returns || []).filter(returnIsPosted).forEach(function (rt) {
    var net = rt.refundNet || 0, vat = rt.refundVat || 0, tot = rt.refundTotal || 0;
    if (tot <= 0) return;
    var creditAcct = rt.payment === "Credit" ? "Accounts receivable" : "Cash and bank";
    var lines = [{ account: "Sales revenue", dr: net, cr: 0 }];
    if (vat > 0) lines.push({ account: "VAT payable", dr: vat, cr: 0 });
    lines.push({ account: creditAcct, dr: 0, cr: tot });
    entries.push({ date: rt.updatedAt ? rt.updatedAt.slice(0, 10) : rt.createdAt.slice(0, 10),
      voucher: rt.no, type: "Sales return",
      narration: "Credit note for " + rt.customer + " against " + rt.invoice, lines: lines });
  });
  DB.purchases.forEach(function (p) {
    var net = docSubtotal(p), vat = docVat(p), tot = net + vat;
    var creditAcct = "Cash and bank";
    var lines = [{ account: p.head, dr: net, cr: 0 }];
    if (vat > 0) lines.push({ account: "VAT receivable", dr: vat, cr: 0 });
    lines.push({ account: creditAcct, dr: 0, cr: tot });
    entries.push({ date: p.date, voucher: p.bill, type: "Purchase",
      narration: "Purchase from " + p.supplier, lines: lines });
  });
  entries.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return entries;
}
var INCOME_ACCTS = ["Sales revenue"];
function isExpenseAccount(a) {
  return ["Purchases (stock)", "Freight and delivery", "Rent", "Salaries", "Utilities", "Marketing", "Other expenses"].indexOf(a) !== -1;
}

/* ================= SPA nav ================= */
function showPage(id) {
  document.querySelectorAll(".page").forEach(function (p) { p.classList.toggle("visible", p.id === id); });
  var shell = document.getElementById("appShell");
  if (shell) shell.classList.toggle("hidden", id === "loginPage");
  document.querySelectorAll(".nav-item[data-page]").forEach(function (n) {
    n.classList.toggle("active", n.getAttribute("data-page") === id);
  });
  window.scrollTo(0, 0);
  if (id === "categoriesPage") renderCategories();
  if (id === "inventoryPage") renderInventory();
  if (id === "publishedPage") renderPublished();
  if (id === "productsPage") renderMasters();
  if (id === "salesPage") renderSales();
  if (id === "returnsPage") renderReturns();
  if (id === "purchasesPage") renderPurchases();
  if (id === "financePage") { renderJournal(); renderLedgerAccounts(); renderLedger(); renderDaybook(); renderTrial(); renderPL(); }
  if (id === "reportsPage") renderReport();
  if (id === "irdPage") renderIrd();
  if (id === "cmsPage") renderCms();
  if (id === "dashboardPage") renderDashboard();
}
function signIn(e) {
  if (e && e.preventDefault) e.preventDefault();
  try {
    showPage("dashboardPage");
    showToast("Signed in (prototype only)");
  } catch (err) {
    // Never leave the user stuck on the login screen because a dashboard
    // widget threw. Force the shell open, then surface the problem.
    var lp = document.getElementById("loginPage");
    var shell = document.getElementById("appShell");
    if (lp) lp.classList.remove("visible");
    if (shell) shell.classList.remove("hidden");
    bootError("Signed in, but a dashboard widget failed: " + err.message);
  }
  return false;
}

/* Shows a visible banner instead of failing silently. */
function bootError(msg) {
  var bar = document.createElement("div");
  bar.setAttribute("role", "alert");
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#dc2626;color:#fff;" +
    "padding:10px 16px;font:13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
  bar.textContent = msg;
  document.body.appendChild(bar);
}
function signOut() { if (confirm("Sign out?")) showPage("loginPage"); }
function showTab(groupId, panelId, el) {
  var group = document.getElementById(groupId);
  group.querySelectorAll("a").forEach(function (a) { a.classList.remove("active"); });
  el.classList.add("active");
  var panels = group.parentElement.querySelectorAll(".tab-panel");
  panels.forEach(function (p) { p.classList.toggle("visible", p.id === panelId); });
}

/* ================= Dashboard ================= */
function renderDashboard() {
  var t = today();
  var salesToday = DB.sales.filter(function (s) { return s.date === t; });
  var m = t.slice(0, 7);
  var monthSales = DB.sales.filter(function (s) { return s.date.slice(0, 7) === m; });
  var monthPurch = DB.purchases.filter(function (p) { return p.date.slice(0, 7) === m; });
  var rev = monthSales.reduce(function (a, s) { return a + docSubtotal(s); }, 0);
  var exp = monthPurch.reduce(function (a, p) { return a + docSubtotal(p); }, 0);
  var vatOut = monthSales.reduce(function (a, s) { return a + docVat(s); }, 0);
  var vatIn = monthPurch.reduce(function (a, p) { return a + docVat(p); }, 0);
  document.getElementById("dashSalesToday").textContent = salesToday.length;
  document.getElementById("dashRevMonth").textContent = money(rev);
  document.getElementById("dashVat").textContent = money(Math.max(0, vatOut - vatIn));
  document.getElementById("dashProfit").textContent = money(rev - exp);
  var recent = DB.sales.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).slice(0, 5);
  document.getElementById("dashRecentSales").innerHTML = recent.length ? recent.map(function (s) {
    return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);">' +
      '<div><div style="font-weight:500;">' + esc(s.invoice) + '</div>' +
      '<div style="font-size:12px;color:var(--muted-foreground);">' + esc(s.customer) + ' &middot; ' + s.date + '</div></div>' +
      '<div>' + money(docTotal(s)) + '</div></div>';
  }).join("") : '<div class="empty-state">No sales yet.</div>';
}

/* ================= Products / orders / customers / inventory ================= */
function renderStaticTables() {
  // Master product table is rendered by renderMasters()
  var ob = { pending: "badge-warning", confirmed: "badge-accent", shipped: "badge-accent", delivered: "badge-success", cancelled: "badge-danger" };
  document.getElementById("ordersBody").innerHTML = DB.orders.map(function (o) {
    return '<tr><td style="font-weight:500;">' + esc(o.no) + '</td><td>' + esc(o.customer) + '</td>' +
      '<td style="color:var(--muted-foreground);">' + o.date + '</td><td class="num">' + money(o.total) + '</td>' +
      '<td><span class="badge badge-muted">' + esc(o.pay) + '</span></td>' +
      '<td><span class="badge ' + ob[o.status] + '">' + o.status + '</span></td></tr>';
  }).join("");

  document.getElementById("customersBody").innerHTML = DB.customers.map(function (c) {
    return '<tr><td style="font-weight:500;">' + esc(c.name) + '</td>' +
      '<td style="color:var(--muted-foreground);">' + esc(c.phone) + '</td><td>' + esc(c.city) + '</td>' +
      '<td class="num">' + c.orders + '</td><td class="num">' + money(c.spend) + '</td></tr>';
  }).join("");

  // Inventory is rendered by renderInventory()
}
function exportProductsCsv() {
  var rows = [["Name", "SKU", "Category", "Price NPR", "Stock", "Status"]];
  DB.products.forEach(function (p) { rows.push([p.name, p.sku, p.cat, p.price, p.stock, p.status]); });
  downloadCsv("zylo-products.csv", rows);
}

/* ================= SALES ================= */
var editingSaleId = null;
function openSaleModal(id) {
  editingSaleId = id || null;
  var s = id ? DB.sales.find(function (x) { return x.id === id; }) : null;
  document.getElementById("saleModalTitle").textContent = s ? "Edit sale" : "Add sale";
  document.getElementById("saleInvoice").value = s ? s.invoice : nextInvoiceNo();
  document.getElementById("saleDate").value = s ? s.date : today();
  document.getElementById("saleCustomer").value = s ? s.customer : "";
  document.getElementById("salePayment").value = s ? s.payment : "Cash";
  document.getElementById("saleVatable").checked = s ? s.vatable : true;
  var box = document.getElementById("saleLines");
  box.innerHTML = "";
  (s ? s.items : [{ desc: "", qty: 1, rate: "" }]).forEach(function (it) { addSaleLine(it); });
  recalcSale();
  document.getElementById("saleModal").classList.add("show");
}
function nextInvoiceNo() {
  var max = 2000;
  DB.sales.forEach(function (s) {
    var n = parseInt(String(s.invoice).replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return DB.settings.invPrefix + (max + 1);
}
function lineRowHtml(it, onchange) {
  var d = document.createElement("div");
  d.className = "line-row";
  d.innerHTML = '<input class="l-desc" placeholder="Item description" value="' + esc(it.desc) + '">' +
    '<input class="l-qty" type="number" min="0" step="1" value="' + esc(it.qty) + '">' +
    '<input class="l-rate" type="number" min="0" step="0.01" placeholder="0.00" value="' + esc(it.rate) + '">' +
    '<span class="lt">Rs 0</span>' +
    '<button type="button" class="icon-btn">' + icon("close",14) + '</button>';
  d.querySelectorAll("input").forEach(function (i) { i.addEventListener("input", onchange); });
  d.querySelector("button").addEventListener("click", function () {
    if (d.parentElement.children.length > 1) { d.remove(); onchange(); }
  });
  return d;
}
function addSaleLine(it) {
  document.getElementById("saleLines").appendChild(lineRowHtml(it || { desc: "", qty: 1, rate: "" }, recalcSale));
  recalcSale();
}
function readLines(containerId) {
  return Array.prototype.map.call(document.getElementById(containerId).children, function (row) {
    return {
      desc: row.querySelector(".l-desc").value,
      qty: Number(row.querySelector(".l-qty").value) || 0,
      rate: Number(row.querySelector(".l-rate").value) || 0
    };
  });
}
function paintLineTotals(containerId, items) {
  Array.prototype.forEach.call(document.getElementById(containerId).children, function (row, i) {
    row.querySelector(".lt").textContent = money(items[i].qty * items[i].rate);
  });
}
function recalcSale() {
  var items = readLines("saleLines");
  paintLineTotals("saleLines", items);
  var doc = { items: items, vatable: document.getElementById("saleVatable").checked };
  document.getElementById("saleSub").textContent = money(docSubtotal(doc));
  document.getElementById("saleVat").textContent = money(docVat(doc));
  document.getElementById("saleTotal").textContent = money(docTotal(doc));
}
function saveSale() {
  var items = readLines("saleLines").filter(function (i) { return i.desc.trim() && i.qty > 0; });
  if (!items.length) { showToast("Add at least one item with a description and quantity"); return; }
  var rec = {
    id: editingSaleId || "s" + Date.now(),
    invoice: document.getElementById("saleInvoice").value.trim() || nextInvoiceNo(),
    date: document.getElementById("saleDate").value || today(),
    customer: document.getElementById("saleCustomer").value.trim() || "Walk-in customer",
    payment: document.getElementById("salePayment").value,
    vatable: document.getElementById("saleVatable").checked,
    items: items
  };
  if (editingSaleId) {
    DB.sales = DB.sales.map(function (s) { return s.id === editingSaleId ? rec : s; });
  } else {
    DB.sales.push(rec);
  }
  saveDB(); closeModal("saleModal"); renderSales(); renderDashboard();
  showToast(editingSaleId ? "Sale updated" : "Sale added");
}
function deleteSale(id) {
  if (!confirm("Delete this sale? The journal entry goes with it.")) return;
  DB.sales = DB.sales.filter(function (s) { return s.id !== id; });
  saveDB(); renderSales(); renderDashboard(); showToast("Sale deleted");
}
function renderSales() {
  var rows = DB.sales.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  document.getElementById("salesBody").innerHTML = rows.length ? rows.map(function (s) {
    return '<tr><td style="font-weight:500;">' + esc(s.invoice) + '</td><td>' + s.date + '</td>' +
      '<td>' + esc(s.customer) + '</td><td><span class="badge badge-muted">' + esc(s.payment) + '</span></td>' +
      '<td class="num">' + money(docSubtotal(s)) + '</td><td class="num">' + money(docVat(s)) + '</td>' +
      '<td class="num" style="font-weight:500;">' + money(docTotal(s)) + '</td>' +
      '<td style="text-align:right;white-space:nowrap;">' +
      '<button class="icon-btn" title="Edit" onclick="openSaleModal(\'' + s.id + '\')">' + icon('edit',15) + '</button>' +
      '<button class="icon-btn" title="Delete" onclick="deleteSale(\'' + s.id + '\')">' + icon('trash',15) + '</button></td></tr>';
  }).join("") : '<tr><td colspan="8"><div class="empty-state">No sales recorded yet. Use "Add sale" to enter one manually.</div></td></tr>';
  document.getElementById("salesTotalCount").textContent = DB.sales.length;
  document.getElementById("salesNetTotal").textContent = money(DB.sales.reduce(function (a, s) { return a + docSubtotal(s); }, 0));
  document.getElementById("salesVatTotal").textContent = money(DB.sales.reduce(function (a, s) { return a + docVat(s); }, 0));
}
function exportSalesCsv() {
  var rows = [["Invoice", "Date", "Customer", "Payment", "Taxable", "VAT", "Total"]];
  DB.sales.forEach(function (s) {
    rows.push([s.invoice, s.date, s.customer, s.payment, money2(docSubtotal(s)), money2(docVat(s)), money2(docTotal(s))]);
  });
  downloadCsv("zylo-sales-register.csv", rows);
}

/* ================= PURCHASES ================= */
var editingPurchId = null;
function openPurchaseModal(id) {
  editingPurchId = id || null;
  var p = id ? DB.purchases.find(function (x) { return x.id === id; }) : null;
  document.getElementById("purchaseModalTitle").textContent = p ? "Edit purchase" : "Add purchase";
  document.getElementById("purchBill").value = p ? p.bill : "BILL-" + (500 + DB.purchases.length + 1);
  document.getElementById("purchDate").value = p ? p.date : today();
  document.getElementById("purchSupplier").value = p ? p.supplier : "";
  document.getElementById("purchHead").value = p ? p.head : "Purchases (stock)";
  document.getElementById("purchVatable").checked = p ? p.vatable : true;
  var box = document.getElementById("purchLines");
  box.innerHTML = "";
  (p ? p.items : [{ desc: "", qty: 1, rate: "" }]).forEach(function (it) { addPurchLine(it); });
  recalcPurch();
  document.getElementById("purchaseModal").classList.add("show");
}
function addPurchLine(it) {
  document.getElementById("purchLines").appendChild(lineRowHtml(it || { desc: "", qty: 1, rate: "" }, recalcPurch));
  recalcPurch();
}
function recalcPurch() {
  var items = readLines("purchLines");
  paintLineTotals("purchLines", items);
  var doc = { items: items, vatable: document.getElementById("purchVatable").checked };
  document.getElementById("purchSub").textContent = money(docSubtotal(doc));
  document.getElementById("purchVat").textContent = money(docVat(doc));
  document.getElementById("purchTotal").textContent = money(docTotal(doc));
}
function savePurchase() {
  var items = readLines("purchLines").filter(function (i) { return i.desc.trim() && i.qty > 0; });
  if (!items.length) { showToast("Add at least one item with a description and quantity"); return; }
  var rec = {
    id: editingPurchId || "p" + Date.now(),
    bill: document.getElementById("purchBill").value.trim() || "BILL-" + Date.now(),
    date: document.getElementById("purchDate").value || today(),
    supplier: document.getElementById("purchSupplier").value.trim() || "Unnamed supplier",
    head: document.getElementById("purchHead").value,
    vatable: document.getElementById("purchVatable").checked,
    items: items
  };
  if (editingPurchId) {
    DB.purchases = DB.purchases.map(function (p) { return p.id === editingPurchId ? rec : p; });
  } else {
    DB.purchases.push(rec);
  }
  saveDB(); closeModal("purchaseModal"); renderPurchases(); renderDashboard();
  showToast(editingPurchId ? "Purchase updated" : "Purchase added");
}
function deletePurchase(id) {
  if (!confirm("Delete this purchase? The journal entry goes with it.")) return;
  DB.purchases = DB.purchases.filter(function (p) { return p.id !== id; });
  saveDB(); renderPurchases(); renderDashboard(); showToast("Purchase deleted");
}
function renderPurchases() {
  var rows = DB.purchases.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  document.getElementById("purchasesBody").innerHTML = rows.length ? rows.map(function (p) {
    return '<tr><td style="font-weight:500;">' + esc(p.bill) + '</td><td>' + p.date + '</td>' +
      '<td>' + esc(p.supplier) + '</td><td><span class="badge badge-muted">' + esc(p.head) + '</span></td>' +
      '<td class="num">' + money(docSubtotal(p)) + '</td><td class="num">' + money(docVat(p)) + '</td>' +
      '<td class="num" style="font-weight:500;">' + money(docTotal(p)) + '</td>' +
      '<td style="text-align:right;white-space:nowrap;">' +
      '<button class="icon-btn" title="Edit" onclick="openPurchaseModal(\'' + p.id + '\')">' + icon('edit',15) + '</button>' +
      '<button class="icon-btn" title="Delete" onclick="deletePurchase(\'' + p.id + '\')">' + icon('trash',15) + '</button></td></tr>';
  }).join("") : '<tr><td colspan="8"><div class="empty-state">No purchases recorded yet.</div></td></tr>';
  document.getElementById("purchTotalCount").textContent = DB.purchases.length;
  document.getElementById("purchNetTotal").textContent = money(DB.purchases.reduce(function (a, p) { return a + docSubtotal(p); }, 0));
  document.getElementById("purchVatTotal").textContent = money(DB.purchases.reduce(function (a, p) { return a + docVat(p); }, 0));
}
function exportPurchasesCsv() {
  var rows = [["Bill no", "Date", "Supplier", "Head", "Taxable", "VAT", "Total"]];
  DB.purchases.forEach(function (p) {
    rows.push([p.bill, p.date, p.supplier, p.head, money2(docSubtotal(p)), money2(docVat(p)), money2(docTotal(p))]);
  });
  downloadCsv("zylo-purchase-register.csv", rows);
}
function closeModal(id) { document.getElementById(id).classList.remove("show"); }

/* ================= FINANCE: journal ================= */
function renderJournal() {
  var entries = buildJournal();
  var html = "", totDr = 0, totCr = 0;
  entries.forEach(function (e) {
    e.lines.forEach(function (l, idx) {
      totDr += l.dr; totCr += l.cr;
      html += '<tr>' +
        '<td>' + (idx === 0 ? e.date : "") + '</td>' +
        '<td>' + (idx === 0 ? esc(e.voucher) : "") + '</td>' +
        '<td' + (l.cr > 0 ? ' style="padding-left:34px;"' : '') + '>' + esc(l.account) + '</td>' +
        '<td style="color:var(--muted-foreground);">' + (idx === 0 ? esc(e.narration) : "") + '</td>' +
        '<td class="num">' + (l.dr ? money(l.dr) : "") + '</td>' +
        '<td class="num">' + (l.cr ? money(l.cr) : "") + '</td></tr>';
    });
  });
  document.getElementById("journalBody").innerHTML = html || '<tr><td colspan="6"><div class="empty-state">No transactions yet.</div></td></tr>';
  document.getElementById("journalFoot").innerHTML = entries.length ?
    '<tr><td colspan="4">Totals</td><td class="num">' + money(totDr) + '</td><td class="num">' + money(totCr) + '</td></tr>' : "";
}

/* ================= FINANCE: ledger ================= */
function allAccounts() {
  var set = {};
  buildJournal().forEach(function (e) { e.lines.forEach(function (l) { set[l.account] = 1; }); });
  return Object.keys(set).sort();
}
function renderLedgerAccounts() {
  var sel = document.getElementById("ledgerAccount");
  var current = sel.value;
  var accts = allAccounts();
  sel.innerHTML = accts.map(function (a) { return '<option>' + esc(a) + '</option>'; }).join("");
  if (accts.indexOf(current) !== -1) sel.value = current;
}
function renderLedger() {
  var acct = document.getElementById("ledgerAccount").value;
  var bal = 0, html = "";
  buildJournal().forEach(function (e) {
    e.lines.forEach(function (l) {
      if (l.account !== acct) return;
      bal += l.dr - l.cr;
      var contra = e.lines.filter(function (x) { return x.account !== acct; }).map(function (x) { return x.account; }).join(", ");
      html += '<tr><td>' + e.date + '</td><td>' + esc(e.voucher) + '</td>' +
        '<td style="color:var(--muted-foreground);">' + esc(contra) + '</td>' +
        '<td class="num">' + (l.dr ? money(l.dr) : "") + '</td>' +
        '<td class="num">' + (l.cr ? money(l.cr) : "") + '</td>' +
        '<td class="num" style="font-weight:500;">' + money(Math.abs(bal)) + (bal < 0 ? " Cr" : " Dr") + '</td></tr>';
    });
  });
  document.getElementById("ledgerBody").innerHTML = html || '<tr><td colspan="6"><div class="empty-state">No entries for this account.</div></td></tr>';
}

/* ================= FINANCE: daybook ================= */
function renderDaybook() {
  var d = document.getElementById("daybookDate");
  if (!d.value) d.value = today();
  var target = d.value, html = "", totDr = 0, totCr = 0;
  buildJournal().filter(function (e) { return e.date === target; }).forEach(function (e) {
    e.lines.forEach(function (l, idx) {
      totDr += l.dr; totCr += l.cr;
      html += '<tr><td>' + (idx === 0 ? esc(e.voucher) : "") + '</td>' +
        '<td>' + (idx === 0 ? '<span class="badge badge-accent">' + e.type + '</span>' : "") + '</td>' +
        '<td' + (l.cr > 0 ? ' style="padding-left:34px;"' : '') + '>' + esc(l.account) + '</td>' +
        '<td class="num">' + (l.dr ? money(l.dr) : "") + '</td>' +
        '<td class="num">' + (l.cr ? money(l.cr) : "") + '</td></tr>';
    });
  });
  document.getElementById("daybookBody").innerHTML = html || '<tr><td colspan="5"><div class="empty-state">No transactions on this date.</div></td></tr>';
  document.getElementById("daybookFoot").innerHTML = html ?
    '<tr><td colspan="3">Totals</td><td class="num">' + money(totDr) + '</td><td class="num">' + money(totCr) + '</td></tr>' : "";
}

/* ================= FINANCE: trial balance ================= */
function renderTrial() {
  var bal = {};
  buildJournal().forEach(function (e) {
    e.lines.forEach(function (l) { bal[l.account] = (bal[l.account] || 0) + l.dr - l.cr; });
  });
  var totDr = 0, totCr = 0, html = "";
  Object.keys(bal).sort().forEach(function (a) {
    var v = bal[a];
    if (Math.abs(v) < 0.005) return;
    var dr = v > 0 ? v : 0, cr = v < 0 ? -v : 0;
    totDr += dr; totCr += cr;
    html += '<tr><td>' + esc(a) + '</td><td class="num">' + (dr ? money(dr) : "") + '</td><td class="num">' + (cr ? money(cr) : "") + '</td></tr>';
  });
  document.getElementById("trialBody").innerHTML = html || '<tr><td colspan="3"><div class="empty-state">No balances yet.</div></td></tr>';
  document.getElementById("trialFoot").innerHTML = html ?
    '<tr><td>Totals</td><td class="num">' + money(totDr) + '</td><td class="num">' + money(totCr) + '</td></tr>' : "";
}

/* ================= FINANCE: profit & loss ================= */
function renderPL() {
  var f = document.getElementById("plFrom"), t = document.getElementById("plTo");
  if (!f.value) f.value = offsetDate(-365);
  if (!t.value) t.value = today();
  var from = f.value, to = t.value;
  var income = {}, expense = {};
  DB.sales.forEach(function (s) {
    if (s.date < from || s.date > to) return;
    income["Sales revenue"] = (income["Sales revenue"] || 0) + docSubtotal(s);
  });
  (DB.returns || []).forEach(function (rt) {
    if (!returnIsPosted(rt)) return;
    var d = (rt.updatedAt || rt.createdAt).slice(0, 10);
    if (d < from || d > to) return;
    income["Sales revenue"] = (income["Sales revenue"] || 0) - rt.refundNet;
  });
  DB.purchases.forEach(function (p) {
    if (p.date < from || p.date > to) return;
    expense[p.head] = (expense[p.head] || 0) + docSubtotal(p);
  });
  var totInc = Object.keys(income).reduce(function (a, k) { return a + income[k]; }, 0);
  var totExp = Object.keys(expense).reduce(function (a, k) { return a + expense[k]; }, 0);
  var net = totInc - totExp;
  var rowsInc = Object.keys(income).map(function (k) {
    return '<tr><td>' + esc(k) + '</td><td class="num">' + money(income[k]) + '</td></tr>';
  }).join("") || '<tr><td colspan="2" style="color:var(--muted-foreground);">No income in this period</td></tr>';
  var rowsExp = Object.keys(expense).sort().map(function (k) {
    return '<tr><td>' + esc(k) + '</td><td class="num">' + money(expense[k]) + '</td></tr>';
  }).join("") || '<tr><td colspan="2" style="color:var(--muted-foreground);">No expenses in this period</td></tr>';
  document.getElementById("plReport").innerHTML =
    '<div class="report-head"><h2>' + esc(DB.settings.company) + '</h2>' +
    '<p>Profit and loss statement &middot; ' + from + ' to ' + to + '</p></div>' +
    '<table><thead><tr><th>Income</th><th class="num">Amount</th></tr></thead><tbody>' + rowsInc + '</tbody>' +
    '<tfoot><tr><td>Total income</td><td class="num">' + money(totInc) + '</td></tr></tfoot></table>' +
    '<div style="height:18px;"></div>' +
    '<table><thead><tr><th>Expenses</th><th class="num">Amount</th></tr></thead><tbody>' + rowsExp + '</tbody>' +
    '<tfoot><tr><td>Total expenses</td><td class="num">' + money(totExp) + '</td></tr></tfoot></table>' +
    '<div style="margin-top:18px;padding:14px;border-radius:10px;background:' +
    (net >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)') + ';display:flex;justify-content:space-between;font-weight:500;">' +
    '<span>' + (net >= 0 ? "Net profit" : "Net loss") + '</span><span>' + money(Math.abs(net)) + '</span></div>' +
    '<p style="font-size:11px;color:var(--muted-foreground);margin-top:12px;">Cash-basis summary from recorded sales and purchases. VAT is excluded from both sides since it is collected on behalf of the IRD, not income.</p>';
}

/* ================= REPORTS ================= */
function periodKey(dateStr, mode) {
  var d = new Date(dateStr + "T00:00:00");
  if (mode === "daily") return dateStr;
  if (mode === "weekly") {
    var t = new Date(d);
    t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); // Monday start
    return "Week of " + t.toISOString().slice(0, 10);
  }
  if (mode === "monthly") return dateStr.slice(0, 7);
  if (mode === "quarterly") return d.getFullYear() + " Q" + (Math.floor(d.getMonth() / 3) + 1);
  return String(d.getFullYear());
}
function renderReport() {
  var f = document.getElementById("reportFrom"), t = document.getElementById("reportTo");
  if (!f.value) f.value = offsetDate(-365);
  if (!t.value) t.value = today();
  var mode = document.getElementById("reportPeriod").value;
  var rows = DB.sales.filter(function (s) { return s.date >= f.value && s.date <= t.value; });
  var groups = {};
  rows.forEach(function (s) {
    var k = periodKey(s.date, mode);
    if (!groups[k]) groups[k] = { count: 0, taxable: 0, vat: 0, total: 0 };
    groups[k].count++;
    groups[k].taxable += docSubtotal(s);
    groups[k].vat += docVat(s);
    groups[k].total += docTotal(s);
  });
  var keys = Object.keys(groups).sort();
  var tc = 0, tx = 0, tv = 0, tt = 0;
  document.getElementById("reportBody").innerHTML = keys.length ? keys.map(function (k) {
    var g = groups[k];
    tc += g.count; tx += g.taxable; tv += g.vat; tt += g.total;
    return '<tr><td style="font-weight:500;">' + esc(k) + '</td><td class="num">' + g.count + '</td>' +
      '<td class="num">' + money(g.taxable) + '</td><td class="num">' + money(g.vat) + '</td>' +
      '<td class="num">' + money(g.total) + '</td></tr>';
  }).join("") : '<tr><td colspan="5"><div class="empty-state">No sales in the selected range.</div></td></tr>';
  document.getElementById("reportFoot").innerHTML = keys.length ?
    '<tr><td>Totals</td><td class="num">' + tc + '</td><td class="num">' + money(tx) + '</td>' +
    '<td class="num">' + money(tv) + '</td><td class="num">' + money(tt) + '</td></tr>' : "";
  document.getElementById("repCount").textContent = tc;
  document.getElementById("repTaxable").textContent = money(tx);
  document.getElementById("repVat").textContent = money(tv);
  document.getElementById("repTotal").textContent = money(tt);
}
function exportReportCsv() {
  var mode = document.getElementById("reportPeriod").value;
  var rows = [["Period (" + mode + ")", "Invoices", "Taxable", "VAT", "Total"]];
  Array.prototype.forEach.call(document.getElementById("reportBody").querySelectorAll("tr"), function (tr) {
    var tds = tr.querySelectorAll("td");
    if (tds.length === 5) rows.push([tds[0].textContent, tds[1].textContent, tds[2].textContent, tds[3].textContent, tds[4].textContent]);
  });
  downloadCsv("zylo-sales-report-" + mode + ".csv", rows);
}

/* ================= IRD / VAT ================= */
function renderIrd() {
  var el = document.getElementById("irdMonth");
  if (!el.value) el.value = today().slice(0, 7);
  var m = el.value;
  var sales = DB.sales.filter(function (s) { return s.date.slice(0, 7) === m; });
  var purch = DB.purchases.filter(function (p) { return p.date.slice(0, 7) === m; });
  var sTaxable = sales.filter(function (s) { return s.vatable; }).reduce(function (a, s) { return a + docSubtotal(s); }, 0);
  var sExempt = sales.filter(function (s) { return !s.vatable; }).reduce(function (a, s) { return a + docSubtotal(s); }, 0);
  var sVat = sales.reduce(function (a, s) { return a + docVat(s); }, 0);
  // Approved returns credit back output VAT in the month they were settled.
  var rets = (DB.returns || []).filter(function (rt) {
    return returnIsPosted(rt) && (rt.updatedAt || rt.createdAt).slice(0, 7) === m;
  });
  var rNet = rets.reduce(function (a, rt) { return a + rt.refundNet; }, 0);
  var rVat = rets.reduce(function (a, rt) { return a + rt.refundVat; }, 0);
  sTaxable -= rNet;
  sVat -= rVat;
  var pTaxable = purch.filter(function (p) { return p.vatable; }).reduce(function (a, p) { return a + docSubtotal(p); }, 0);
  var pExempt = purch.filter(function (p) { return !p.vatable; }).reduce(function (a, p) { return a + docSubtotal(p); }, 0);
  var pVat = purch.reduce(function (a, p) { return a + docVat(p); }, 0);
  var net = sVat - pVat;

  var salesRows = sales.length ? sales.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (s) {
    return '<tr><td>' + s.date + '</td><td>' + esc(s.invoice) + '</td><td>' + esc(s.customer) + '</td>' +
      '<td class="num">' + money(docSubtotal(s)) + '</td><td class="num">' + money(docVat(s)) + '</td>' +
      '<td class="num">' + money(docTotal(s)) + '</td></tr>';
  }).join("") : '<tr><td colspan="6" style="color:var(--muted-foreground);">No sales this month</td></tr>';

  var purchRows = purch.length ? purch.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (p) {
    return '<tr><td>' + p.date + '</td><td>' + esc(p.bill) + '</td><td>' + esc(p.supplier) + '</td>' +
      '<td class="num">' + money(docSubtotal(p)) + '</td><td class="num">' + money(docVat(p)) + '</td>' +
      '<td class="num">' + money(docTotal(p)) + '</td></tr>';
  }).join("") : '<tr><td colspan="6" style="color:var(--muted-foreground);">No purchases this month</td></tr>';

  document.getElementById("irdReport").innerHTML =
    '<div class="report-head"><h2>' + esc(DB.settings.company) + '</h2>' +
    '<p>' + esc(DB.settings.address) + ' &middot; PAN ' + esc(DB.settings.pan) + '</p>' +
    '<p style="margin-top:6px;font-weight:500;color:var(--primary);">VAT return summary &mdash; ' + m + '</p></div>' +

    '<div class="metric-grid" style="grid-template-columns:repeat(3,1fr);">' +
    '<div class="metric"><div class="label">Output VAT (sales)</div><div class="value">' + money(sVat) + '</div></div>' +
    '<div class="metric"><div class="label">Input VAT (purchases)</div><div class="value">' + money(pVat) + '</div></div>' +
    '<div class="metric"><div class="label">' + (net >= 0 ? "Net VAT payable" : "Credit carried forward") + '</div><div class="value">' + money(Math.abs(net)) + '</div></div>' +
    '</div>' +

    '<table style="margin-bottom:8px;"><thead><tr><th>Summary</th><th class="num">Taxable</th><th class="num">Exempt / non-VAT</th><th class="num">VAT</th></tr></thead><tbody>' +
    '<tr><td>Sales (output)</td><td class="num">' + money(sTaxable) + '</td><td class="num">' + money(sExempt) + '</td><td class="num">' + money(sVat) + '</td></tr>' +
    '<tr><td>Purchases (input)</td><td class="num">' + money(pTaxable) + '</td><td class="num">' + money(pExempt) + '</td><td class="num">' + money(pVat) + '</td></tr>' +
    (rets.length ? '<tr><td>Sales returns (credit notes)</td><td class="num">-' + money(rNet) + '</td><td class="num">-</td><td class="num">-' + money(rVat) + '</td></tr>' : "") +
    '</tbody><tfoot><tr><td colspan="3">' + (net >= 0 ? "Net VAT payable to IRD" : "Excess input credit") + '</td>' +
    '<td class="num">' + money(Math.abs(net)) + '</td></tr></tfoot></table>' +

    '<div style="height:20px;"></div><div class="section-title">Sales register (Bikri Khata)</div>' +
    '<table><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th class="num">Taxable</th><th class="num">VAT</th><th class="num">Total</th></tr></thead>' +
    '<tbody>' + salesRows + '</tbody></table>' +

    '<div style="height:20px;"></div><div class="section-title">Purchase register (Kharid Khata)</div>' +
    '<table><thead><tr><th>Date</th><th>Bill no</th><th>Supplier</th><th class="num">Taxable</th><th class="num">VAT</th><th class="num">Total</th></tr></thead>' +
    '<tbody>' + purchRows + '</tbody></table>' +

    '<p style="font-size:11px;color:var(--muted-foreground);margin-top:16px;">Prepared from records entered in this system at ' +
    DB.settings.vatRate + '% VAT. Dates are Gregorian; convert to Bikram Sambat before filing. This is a working summary, ' +
    'not a substitute for the official IRD return form or advice from a registered accountant.</p>';
}
function exportIrdCsv() {
  var m = document.getElementById("irdMonth").value;
  var rows = [["Zylo VAT return", m], [], ["SALES REGISTER"], ["Date", "Invoice", "Customer", "Taxable", "VAT", "Total"]];
  DB.sales.filter(function (s) { return s.date.slice(0, 7) === m; }).forEach(function (s) {
    rows.push([s.date, s.invoice, s.customer, money2(docSubtotal(s)), money2(docVat(s)), money2(docTotal(s))]);
  });
  rows.push([], ["PURCHASE REGISTER"], ["Date", "Bill no", "Supplier", "Taxable", "VAT", "Total"]);
  DB.purchases.filter(function (p) { return p.date.slice(0, 7) === m; }).forEach(function (p) {
    rows.push([p.date, p.bill, p.supplier, money2(docSubtotal(p)), money2(docVat(p)), money2(docTotal(p))]);
  });
  downloadCsv("zylo-ird-vat-" + m + ".csv", rows);
}



/* ============================================================
   Inventory engine - variant level
   One record per variant per warehouse. Every quantity change
   writes a stock movement, so the ledger explains any balance.
   ============================================================ */
function warehouseById(id) {
  for (var i = 0; i < DB.warehouses.length; i++) if (DB.warehouses[i].id === id) return DB.warehouses[i];
  return null;
}
function variantById(id) {
  for (var i = 0; i < DB.variants.length; i++) if (DB.variants[i].id === id) return DB.variants[i];
  return null;
}
function invById(id) {
  for (var i = 0; i < DB.inventory.length; i++) if (DB.inventory[i].id === id) return DB.inventory[i];
  return null;
}
function invFor(variantId, warehouseId) {
  for (var i = 0; i < DB.inventory.length; i++) {
    if (DB.inventory[i].variantId === variantId && DB.inventory[i].warehouseId === warehouseId) return DB.inventory[i];
  }
  return null;
}
function addInventoryRecord(rec, seeding) {
  if (invFor(rec.variantId, rec.warehouseId)) return null;
  var full = {
    id: uid("inv"), variantId: rec.variantId, warehouseId: rec.warehouseId,
    available: Number(rec.available) || 0, reserved: Number(rec.reserved) || 0,
    incoming: Number(rec.incoming) || 0, damaged: Number(rec.damaged) || 0,
    returned: Number(rec.returned) || 0,
    reorderLevel: Number(rec.reorderLevel) || 0,
    minStock: Number(rec.minStock) || 0, maxStock: Number(rec.maxStock) || 0,
    archived: false
  };
  DB.inventory.push(full);
  if (full.available) logMove(full, "opening", full.available, "Opening balance", "", 0, full.available);
  if (!seeding) saveDB();
  return full;
}
function logMove(inv, type, change, reason, reference, before, after) {
  DB.stockMoves.push({
    id: uid("mv"), date: today(), variantId: inv.variantId, warehouseId: inv.warehouseId,
    type: type, change: change, reason: reason || "", reference: reference || "",
    before: before, after: after, user: "Zylo Super Admin", at: new Date().toISOString()
  });
}
/* mode: increase | decrease | replace | correction */
function adjustStock(invId, mode, qty, reason, reference) {
  var inv = invById(invId);
  if (!inv) return null;
  qty = Number(qty) || 0;
  var before = inv.available, after = before;
  if (mode === "increase") after = before + qty;
  else if (mode === "decrease") after = before - qty;
  else after = qty; // replace / correction set an absolute figure
  if (after < 0) { showToast("That would take stock below zero"); return null; }
  inv.available = after;
  logMove(inv, mode, after - before, reason, reference, before, after);
  saveDB();
  return inv;
}
function transferStock(fromInvId, toWarehouseId, qty, reason) {
  var from = invById(fromInvId);
  if (!from) return null;
  qty = Number(qty) || 0;
  if (qty <= 0) { showToast("Enter a quantity to transfer"); return null; }
  if (qty > from.available) { showToast("Only " + from.available + " available at source"); return null; }
  if (from.warehouseId === toWarehouseId) { showToast("Pick a different destination warehouse"); return null; }
  var to = invFor(from.variantId, toWarehouseId);
  if (!to) {
    to = addInventoryRecord({ variantId: from.variantId, warehouseId: toWarehouseId,
      available: 0, reorderLevel: from.reorderLevel, minStock: from.minStock, maxStock: from.maxStock }, true);
  }
  var fb = from.available, tb = to.available;
  from.available -= qty; to.available += qty;
  var ref = "TRF-" + Date.now().toString(36).toUpperCase();
  logMove(from, "transfer_out", -qty, reason || "Transfer to " + warehouseById(toWarehouseId).name, ref, fb, from.available);
  logMove(to, "transfer_in", qty, reason || "Transfer from " + warehouseById(from.warehouseId).name, ref, tb, to.available);
  saveDB();
  return { from: from, to: to };
}
/* Merge every other warehouse's stock for this variant into the target record */
function mergeInventory(targetInvId) {
  var target = invById(targetInvId);
  if (!target) return 0;
  var others = DB.inventory.filter(function (r) {
    return r.variantId === target.variantId && r.id !== target.id && !r.archived;
  });
  var moved = 0;
  others.forEach(function (r) {
    if (!r.available) return;
    var tb = target.available, rb = r.available;
    target.available += r.available;
    moved += r.available;
    logMove(target, "merge_in", rb, "Merged from " + warehouseById(r.warehouseId).name, "", tb, target.available);
    logMove(r, "merge_out", -rb, "Merged into " + warehouseById(target.warehouseId).name, "", rb, 0);
    r.available = 0;
  });
  saveDB();
  return moved;
}
function splitInventory(invId, toWarehouseId, qty) {
  return transferStock(invId, toWarehouseId, qty, "Split to " + (warehouseById(toWarehouseId) || {}).name);
}
function deleteInventoryRecord(invId) {
  var inv = invById(invId);
  if (!inv) return;
  DB.inventory = DB.inventory.filter(function (r) { return r.id !== invId; });
  DB.stockMoves.push({
    id: uid("mv"), date: today(), variantId: inv.variantId, warehouseId: inv.warehouseId,
    type: "deleted", change: -inv.available, reason: "Inventory record deleted", reference: "",
    before: inv.available, after: 0, user: "Zylo Super Admin", at: new Date().toISOString()
  });
  saveDB();
}
function stockState(inv) {
  if (inv.available <= 0) return "out";
  if (inv.reorderLevel && inv.available <= inv.reorderLevel) return "low";
  return "ok";
}
var STOCK_BADGE = {
  ok: '<span class="badge badge-success">in stock</span>',
  low: '<span class="badge badge-warning">low stock</span>',
  out: '<span class="badge badge-danger">out of stock</span>'
};
function movesFor(variantId, warehouseId) {
  return DB.stockMoves.filter(function (m) {
    return m.variantId === variantId && (!warehouseId || m.warehouseId === warehouseId);
  }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
}
/* Total sellable stock for a variant across all warehouses */
function variantStock(variantId) {
  return DB.inventory.filter(function (r) { return r.variantId === variantId && !r.archived; })
    .reduce(function (n, r) { return n + r.available; }, 0);
}


/* ============================================================
   Inventory UI
   ============================================================ */
function fillWarehouseSelect(sel, includeAll) {
  if (!sel) return;
  sel.innerHTML = (includeAll ? '<option value="">All warehouses</option>' : "") +
    DB.warehouses.map(function (w) { return '<option value="' + w.id + '">' + esc(w.name) + '</option>'; }).join("");
}
function invRowContext(r) {
  var v = variantById(r.variantId);
  var m = v ? masterById(v.productId) : null;
  return { v: v, m: m, w: warehouseById(r.warehouseId) };
}
function renderInventory() {
  var wSel = document.getElementById("invWarehouse");
  if (wSel && !wSel.dataset.filled) { fillWarehouseSelect(wSel, true); wSel.dataset.filled = "1"; }
  var q = (document.getElementById("invSearch").value || "").trim().toLowerCase();
  var wf = document.getElementById("invWarehouse").value;
  var sf = document.getElementById("invStatus").value;

  var rows = DB.inventory.filter(function (r) {
    if (r.archived) return false;
    var c = invRowContext(r);
    if (!c.v || !c.m) return false;
    if (wf && r.warehouseId !== wf) return false;
    if (sf && stockState(r) !== sf) return false;
    if (q) {
      var hay = (c.m.name + " " + variantLabel(c.v) + " " + c.v.sku).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });

  document.getElementById("inventoryBody").innerHTML = rows.length ? rows.map(function (r) {
    var c = invRowContext(r);
    var st = stockState(r);
    return '<tr>' +
      '<td style="font-weight:500;">' + esc(c.m.name) + '</td>' +
      '<td style="color:var(--muted-foreground);">' + esc(variantLabel(c.v)) + '</td>' +
      '<td style="color:var(--muted-foreground);font-size:12px;">' + esc(c.v.sku) + '</td>' +
      '<td>' + esc(c.w ? c.w.name : "-") + '</td>' +
      '<td class="num" style="font-weight:500;">' + r.available + '</td>' +
      '<td class="num">' + (r.reserved || "") + '</td>' +
      '<td class="num">' + (r.incoming || "") + '</td>' +
      '<td class="num">' + (r.damaged || "") + '</td>' +
      '<td class="num">' + (r.returned || "") + '</td>' +
      '<td class="num" style="color:var(--muted-foreground);">' + r.reorderLevel + '</td>' +
      '<td>' + STOCK_BADGE[st] + '</td>' +
      '<td style="text-align:right;white-space:nowrap;">' + invActions(r.id) + '</td>' +
      '</tr>';
  }).join("") : '<tr><td colspan="12"><div class="empty-state">No inventory records match.</div></td></tr>';

  var units = rows.reduce(function (n, r) { return n + r.available; }, 0);
  document.getElementById("invCountOut").textContent = rows.length;
  document.getElementById("invUnitsOut").textContent = units.toLocaleString("en-IN");
  document.getElementById("invLowOut").textContent = rows.filter(function (r) { return stockState(r) === "low"; }).length;
  document.getElementById("invOutOut").textContent = rows.filter(function (r) { return stockState(r) === "out"; }).length;
  document.getElementById("invSubtitle").textContent =
    DB.inventory.length + " records across " + DB.warehouses.length + " warehouses";
}
function invActions(id) {
  return '<button class="icon-btn" title="Adjust stock" onclick="openAdjust(\'' + id + '\')">' + icon("edit", 14) + '</button>' +
    '<button class="icon-btn" title="Transfer" onclick="openTransfer(\'' + id + '\')">' + icon("arrowDown", 14) + '</button>' +
    '<button class="icon-btn" title="Stock history" onclick="openHistory(\'' + id + '\')">' + icon("reports", 14) + '</button>' +
    '<button class="icon-btn" title="Barcode / QR" onclick="openLabel(\'' + id + '\')">' + icon("products", 14) + '</button>' +
    '<button class="icon-btn" title="Merge other warehouses in" onclick="doMerge(\'' + id + '\')">' + icon("copy", 14) + '</button>' +
    '<button class="icon-btn" title="Delete record" onclick="doDeleteInv(\'' + id + '\')">' + icon("trash", 14) + '</button>';
}
var editingInvId = null;
function openInvRecord(id) {
  editingInvId = id || null;
  var r = id ? invById(id) : null;
  document.getElementById("invModalTitle").textContent = r ? "Edit inventory record" : "Add inventory record";
  var vs = document.getElementById("ivVariant");
  vs.innerHTML = DB.variants.map(function (v) {
    var m = masterById(v.productId);
    return '<option value="' + v.id + '">' + esc((m ? m.name : "?") + " - " + variantLabel(v) + " (" + v.sku + ")") + '</option>';
  }).join("");
  fillWarehouseSelect(document.getElementById("ivWarehouse"), false);
  if (r) {
    vs.value = r.variantId; vs.disabled = true;
    document.getElementById("ivWarehouse").value = r.warehouseId;
    document.getElementById("ivWarehouse").disabled = true;
  } else { vs.disabled = false; document.getElementById("ivWarehouse").disabled = false; }
  document.getElementById("ivAvailable").value = r ? r.available : 0;
  document.getElementById("ivReserved").value = r ? r.reserved : 0;
  document.getElementById("ivIncoming").value = r ? r.incoming : 0;
  document.getElementById("ivDamaged").value = r ? r.damaged : 0;
  document.getElementById("ivReturned").value = r ? r.returned : 0;
  document.getElementById("ivReorder").value = r ? r.reorderLevel : 5;
  document.getElementById("ivMin").value = r ? r.minStock : 0;
  document.getElementById("ivMax").value = r ? r.maxStock : 0;
  document.getElementById("invModal").classList.add("show");
}
function saveInvRecord() {
  var vid = document.getElementById("ivVariant").value;
  var wid = document.getElementById("ivWarehouse").value;
  var vals = {
    available: Number(document.getElementById("ivAvailable").value) || 0,
    reserved: Number(document.getElementById("ivReserved").value) || 0,
    incoming: Number(document.getElementById("ivIncoming").value) || 0,
    damaged: Number(document.getElementById("ivDamaged").value) || 0,
    returned: Number(document.getElementById("ivReturned").value) || 0,
    reorderLevel: Number(document.getElementById("ivReorder").value) || 0,
    minStock: Number(document.getElementById("ivMin").value) || 0,
    maxStock: Number(document.getElementById("ivMax").value) || 0
  };
  if (editingInvId) {
    var r = invById(editingInvId);
    var before = r.available;
    Object.keys(vals).forEach(function (k) { r[k] = vals[k]; });
    if (before !== r.available) logMove(r, "correction", r.available - before, "Edited via inventory form", "", before, r.available);
    saveDB();
  } else {
    if (invFor(vid, wid)) { showToast("That variant already has a record in this warehouse"); return; }
    vals.variantId = vid; vals.warehouseId = wid;
    addInventoryRecord(vals);
  }
  closeModal("invModal"); renderInventory(); renderPublished();
  showToast(editingInvId ? "Inventory updated" : "Inventory record added");
}
var adjustingId = null;
function openAdjust(id) {
  adjustingId = id;
  var r = invById(id), c = invRowContext(r);
  document.getElementById("adjustContext").textContent =
    c.m.name + " - " + variantLabel(c.v) + " at " + c.w.name + " - currently " + r.available + " available";
  document.getElementById("adjQty").value = 1;
  document.getElementById("adjReason").value = "";
  document.getElementById("adjRef").value = "";
  document.getElementById("adjustModal").classList.add("show");
}
function applyAdjust() {
  var mode = document.getElementById("adjMode").value;
  var qty = Number(document.getElementById("adjQty").value);
  var reason = document.getElementById("adjReason").value.trim();
  if (!reason) { showToast("Give a reason - it goes on the stock ledger"); return; }
  var out = adjustStock(adjustingId, mode, qty, reason, document.getElementById("adjRef").value.trim());
  if (!out) return;
  closeModal("adjustModal"); renderInventory(); renderPublished();
  showToast("Stock now " + out.available);
}
var transferringId = null;
function openTransfer(id) {
  transferringId = id;
  var r = invById(id), c = invRowContext(r);
  document.getElementById("transferContext").textContent =
    c.m.name + " - " + variantLabel(c.v) + " - " + r.available + " available at " + c.w.name;
  var sel = document.getElementById("trfTo");
  sel.innerHTML = DB.warehouses.filter(function (w) { return w.id !== r.warehouseId; })
    .map(function (w) { return '<option value="' + w.id + '">' + esc(w.name) + '</option>'; }).join("");
  document.getElementById("trfQty").value = 1;
  document.getElementById("trfReason").value = "";
  document.getElementById("transferModal").classList.add("show");
}
function applyTransfer() {
  var out = transferStock(transferringId, document.getElementById("trfTo").value,
    Number(document.getElementById("trfQty").value), document.getElementById("trfReason").value.trim());
  if (!out) return;
  closeModal("transferModal"); renderInventory(); renderPublished();
  showToast("Transferred - source now " + out.from.available + ", destination " + out.to.available);
}
function doMerge(id) {
  var r = invById(id), c = invRowContext(r);
  if (!confirm("Merge stock for " + c.m.name + " - " + variantLabel(c.v) + " from all other warehouses into " + c.w.name + "?")) return;
  var moved = mergeInventory(id);
  renderInventory(); renderPublished();
  showToast(moved ? "Merged " + moved + " units in" : "Nothing to merge");
}
function doDeleteInv(id) {
  var r = invById(id), c = invRowContext(r);
  if (!confirm("Delete the inventory record for " + c.m.name + " - " + variantLabel(c.v) + " at " + c.w.name + "?\n" + r.available + " units will be written off.")) return;
  deleteInventoryRecord(id); renderInventory(); renderPublished();
  showToast("Inventory record deleted");
}
function openHistory(id) {
  var r = invById(id), c = invRowContext(r);
  document.getElementById("historyContext").textContent =
    c.m.name + " - " + variantLabel(c.v) + " at " + c.w.name;
  var moves = movesFor(r.variantId, r.warehouseId);
  document.getElementById("historyBody").innerHTML = moves.length ? moves.map(function (m) {
    var sign = m.change > 0 ? "+" : "";
    return '<tr><td>' + m.date + '</td>' +
      '<td><span class="badge badge-accent">' + esc(m.type.replace(/_/g, " ")) + '</span></td>' +
      '<td style="color:var(--muted-foreground);">' + esc(m.reason || "-") + '</td>' +
      '<td style="color:var(--muted-foreground);font-size:12px;">' + esc(m.reference || "-") + '</td>' +
      '<td class="num" style="color:' + (m.change < 0 ? "var(--danger)" : "var(--success)") + ';">' + sign + m.change + '</td>' +
      '<td class="num">' + m.after + '</td></tr>';
  }).join("") : '<tr><td colspan="6"><div class="empty-state">No movements recorded.</div></td></tr>';
  document.getElementById("historyModal").classList.add("show");
}
/* Simple Code39-style barcode drawn as bars, plus a QR-ish block grid.
   Both are visual placeholders sized for label printing, not scanner-grade. */
function openLabel(id) {
  var r = invById(id), c = invRowContext(r);
  var sku = c.v.sku;
  var bars = "";
  for (var i = 0; i < sku.length; i++) {
    var code = sku.charCodeAt(i);
    for (var b = 0; b < 4; b++) {
      var wide = (code >> b) & 1;
      bars += '<span style="display:inline-block;width:' + (wide ? 3 : 1) + 'px;height:52px;background:' +
        (b % 2 ? "#fff" : "#000") + ';"></span>';
    }
  }
  document.getElementById("labelTitle").textContent = "Label - " + c.m.name;
  document.getElementById("labelBody").innerHTML =
    '<div style="font-size:13px;font-weight:600;margin-bottom:2px;">' + esc(c.m.name) + '</div>' +
    '<div style="font-size:11px;color:#555;margin-bottom:10px;">' + esc(variantLabel(c.v)) + ' &middot; ' + esc(c.w.name) + '</div>' +
    '<div style="line-height:0;white-space:nowrap;overflow:hidden;">' + bars + '</div>' +
    '<div style="font-family:monospace;font-size:11px;letter-spacing:2px;margin-top:6px;">' + esc(sku) + '</div>' +
    '<div style="font-size:12px;margin-top:8px;">' + money(variantPrice(c.v)) + '</div>' +
    '<p style="font-size:10px;color:#888;margin-top:10px;">Visual label only &mdash; not scanner-verified.</p>';
  document.getElementById("labelModal").classList.add("show");
}
function exportInventoryCsv() {
  var rows = [["Product", "Variant", "SKU", "Warehouse", "Available", "Reserved", "Incoming", "Damaged", "Returned", "Reorder", "Status"]];
  DB.inventory.forEach(function (r) {
    var c = invRowContext(r);
    if (!c.v || !c.m) return;
    rows.push([c.m.name, variantLabel(c.v), c.v.sku, c.w ? c.w.name : "", r.available, r.reserved,
      r.incoming, r.damaged, r.returned, r.reorderLevel, stockState(r)]);
  });
  downloadCsv("zylo-inventory.csv", rows);
}

/* ============================================================
   Published inventory - the operational sell-side view
   ============================================================ */
function publishedRows() {
  var out = [];
  DB.variants.forEach(function (v) {
    if (!v.published) return;
    var m = masterById(v.productId);
    if (!m || m.status === "archived") return;
    var recs = DB.inventory.filter(function (r) { return r.variantId === v.id && !r.archived; });
    if (!recs.length) { out.push({ v: v, m: m, r: null }); return; }
    recs.forEach(function (r) { out.push({ v: v, m: m, r: r }); });
  });
  return out;
}
function renderPublished() {
  var wSel = document.getElementById("pubWarehouse");
  if (wSel && !wSel.dataset.filled) { fillWarehouseSelect(wSel, true); wSel.dataset.filled = "1"; }
  var q = (document.getElementById("pubSearch").value || "").trim().toLowerCase();
  var wf = document.getElementById("pubWarehouse").value;

  var rows = publishedRows().filter(function (x) {
    if (wf && (!x.r || x.r.warehouseId !== wf)) return false;
    if (q && (x.m.name + " " + x.v.sku).toLowerCase().indexOf(q) === -1) return false;
    return true;
  });

  document.getElementById("publishedBody").innerHTML = rows.length ? rows.map(function (x) {
    var w = x.r ? warehouseById(x.r.warehouseId) : null;
    var st = x.r ? stockState(x.r) : "out";
    return '<tr data-vid="' + x.v.id + '"' + (x.r ? ' data-invid="' + x.r.id + '"' : '') + '>' +
      '<td><input type="checkbox" data-row-check value="' + x.v.id + '"></td>' +
      '<td style="font-weight:500;">' + esc(x.m.name) + '</td>' +
      '<td style="color:var(--muted-foreground);">' + esc(variantLabel(x.v)) + '</td>' +
      '<td style="color:var(--muted-foreground);font-size:12px;">' + esc(x.v.sku) + '</td>' +
      '<td>' + esc(w ? w.name : "no record") + '</td>' +
      '<td class="num"><input class="p-price" type="number" value="' + variantPrice(x.v) + '" style="height:28px;width:92px;text-align:right;font-size:12px;padding:0 6px;" onchange="inlinePrice(this)"></td>' +
      '<td class="num">' + (x.r
        ? '<input class="p-stock" type="number" value="' + x.r.available + '" style="height:28px;width:78px;text-align:right;font-size:12px;padding:0 6px;" onchange="inlineStock(this)">'
        : '<span style="color:var(--muted-foreground);">-</span>') + '</td>' +
      '<td>' + STOCK_BADGE[st] + '</td>' +
      '<td><span class="badge ' + (VARIANT_STATUS_BADGE[x.v.status] || "badge-muted") + '">' +
        esc(VARIANT_STATUS_LABEL[x.v.status] || x.v.status) + '</span></td>' +
      '</tr>';
  }).join("") : '<tr><td colspan="9"><div class="empty-state">No published variants. Publish some from a master product.</div></td></tr>';
}
function inlinePrice(el) {
  var v = variantById(el.closest("tr").getAttribute("data-vid"));
  if (!v) return;
  var m = masterById(v.productId);
  var val = Number(el.value) || 0;
  v.price = (m && val === m.price) ? null : val;
  saveDB(); showToast("Price updated");
}
function inlineStock(el) {
  var tr = el.closest("tr");
  var r = invById(tr.getAttribute("data-invid"));
  if (!r) return;
  var before = r.available, after = Number(el.value) || 0;
  if (before === after) return;
  r.available = after;
  logMove(r, "correction", after - before, "Inline edit on published stock", "", before, after);
  saveDB(); renderInventory(); showToast("Stock updated");
}
function initPublishedBulk() {
  var table = document.getElementById("publishedTable");
  var bar = document.getElementById("pubBulkBar");
  if (!table || !bar) return;
  var countEl = bar.querySelector("[data-selected-count]");
  function boxes() { return Array.prototype.slice.call(table.querySelectorAll("tbody [data-row-check]")); }
  function refresh() {
    var sel = boxes().filter(function (c) { return c.checked; });
    bar.classList.toggle("show", sel.length > 0);
    if (countEl) countEl.textContent = sel.length + " selected";
  }
  var all = table.querySelector("[data-select-all]");
  if (all) all.addEventListener("change", function () { boxes().forEach(function (c) { c.checked = all.checked; }); refresh(); });
  table.addEventListener("change", function (e) { if (e.target.matches("[data-row-check]")) refresh(); });
  bar.querySelectorAll("[data-bulk-action]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var action = btn.getAttribute("data-bulk-action");
      var ids = boxes().filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      if (!ids.length) return;
      if (action === "price") {
        var p = prompt("Set price for " + ids.length + " variant(s), in NPR:");
        if (p === null) return;
        var val = Number(p) || 0;
        ids.forEach(function (id) { var v = variantById(id); if (v) v.price = val; });
      } else if (action === "stock") {
        var s = prompt("Set available stock for " + ids.length + " variant(s):");
        if (s === null) return;
        var q = Number(s) || 0;
        ids.forEach(function (id) {
          DB.inventory.filter(function (r) { return r.variantId === id; }).forEach(function (r) {
            var b = r.available; r.available = q;
            if (b !== q) logMove(r, "correction", q - b, "Bulk stock update", "", b, q);
          });
        });
      } else {
        ids.forEach(function (id) {
          var v = variantById(id);
          if (v) v.published = (action === "publish");
        });
      }
      saveDB(); renderPublished(); renderInventory(); renderMasters();
      showToast(ids.length + " variant(s) updated");
    });
  });
  refresh();
}
function exportPublishedCsv() {
  var rows = [["Product", "Variant", "SKU", "Warehouse", "Price", "Stock", "Stock status", "Variant status"]];
  publishedRows().forEach(function (x) {
    var w = x.r ? warehouseById(x.r.warehouseId) : null;
    rows.push([x.m.name, variantLabel(x.v), x.v.sku, w ? w.name : "", variantPrice(x.v),
      x.r ? x.r.available : 0, x.r ? stockState(x.r) : "out", x.v.status]);
  });
  downloadCsv("zylo-published-inventory.csv", rows);
}


/* ============================================================
   Sales returns
   A return is always anchored to an original sale. Refunds post
   a credit note through buildJournal(), so the P&L and the VAT
   return stay correct without any manual entry.
   ============================================================ */
var RETURN_REASONS = [
  "Wrong Size", "Wrong Colour", "Damaged Product", "Defective Product",
  "Wrong Item Delivered", "Customer Changed Mind", "Delivery Damage",
  "Missing Item", "Duplicate Order", "Quality Issue", "Late Delivery", "Other"
];
var RETURN_STATUSES = ["pending", "under_review", "approved", "rejected", "refund_processed", "completed"];
var RETURN_STATUS_LABEL = {
  pending: "Pending", under_review: "Under review", approved: "Approved",
  rejected: "Rejected", refund_processed: "Refund processed", completed: "Completed"
};
var RETURN_STATUS_BADGE = {
  pending: "badge-warning", under_review: "badge-accent", approved: "badge-success",
  rejected: "badge-danger", refund_processed: "badge-accent", completed: "badge-success"
};
var RESTOCK_TARGETS = {
  available: "Return to available stock",
  damaged: "Return to damaged stock",
  inspection: "Return to inspection stock"
};
var MAX_UPLOAD_BYTES = 400 * 1024;   // per file
var MAX_UPLOAD_TOTAL = 1500 * 1024;  // per return - browser storage is finite
var ACCEPTED_UPLOADS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function saleById(id) {
  for (var i = 0; i < DB.sales.length; i++) if (DB.sales[i].id === id) return DB.sales[i];
  return null;
}
function returnById(id) {
  for (var i = 0; i < DB.returns.length; i++) if (DB.returns[i].id === id) return DB.returns[i];
  return null;
}
/* Returns raised against a sale that still count against it. Rejected
   ones are excluded so a rejection frees the quantity up again. */
function activeReturnsForSale(saleId, excludeId) {
  return DB.returns.filter(function (r) {
    return r.saleId === saleId && r.id !== excludeId && r.status !== "rejected";
  });
}
function returnedQtyForLine(saleId, lineIndex, excludeId) {
  return activeReturnsForSale(saleId, excludeId).reduce(function (n, r) {
    var line = (r.lines || []).filter(function (l) { return l.lineIndex === lineIndex; })[0];
    return n + (line ? line.qty : 0);
  }, 0);
}
function refundedTotalForSale(saleId, excludeId) {
  return activeReturnsForSale(saleId, excludeId).reduce(function (n, r) { return n + (r.refundTotal || 0); }, 0);
}
function saleGrossTotal(sale) { return docTotal(sale); }

/* Search across every field the spec asks for, including SKU and barcode
   on the line items and their variants. */
function searchSales(query) {
  var q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  return DB.sales.filter(function (s) {
    var hay = [s.invoice, s.orderNo, s.customer, s.customerPhone, s.payment, s.date].join(" ").toLowerCase();
    if (hay.indexOf(q) !== -1) return true;
    return (s.items || []).some(function (it) {
      if (String(it.sku || "").toLowerCase().indexOf(q) !== -1) return true;
      if (String(it.desc || "").toLowerCase().indexOf(q) !== -1) return true;
      var v = it.variantId ? variantById(it.variantId) : null;
      return !!(v && v.barcode && String(v.barcode).toLowerCase().indexOf(q) !== -1);
    });
  }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
}

/* Computes refund figures for a draft return without saving anything. */
function computeReturn(draft) {
  var sale = saleById(draft.saleId);
  if (!sale) return null;
  var vatRate = sale.vatable ? (DB.settings.vatRate || 13) / 100 : 0;
  var net = 0;
  (draft.lines || []).forEach(function (l) {
    var item = sale.items[l.lineIndex];
    if (!item) return;
    net += (Number(l.qty) || 0) * (Number(item.rate) || 0);
  });
  if (draft.type === "custom") {
    var gross = Number(draft.customAmount) || 0;
    net = vatRate ? gross / (1 + vatRate) : gross;
    return { net: net, vat: gross - net, total: gross };
  }
  var vat = net * vatRate;
  return { net: net, vat: vat, total: net + vat };
}

function validateReturn(draft) {
  var errors = [];
  var sale = saleById(draft.saleId);
  if (!sale) { errors.push("Select the original sale first."); return errors; }

  if (draft.type !== "custom") {
    var totalQty = (draft.lines || []).reduce(function (n, l) { return n + (Number(l.qty) || 0); }, 0);
    if (totalQty <= 0) errors.push("Select at least one item and quantity to return.");
    (draft.lines || []).forEach(function (l) {
      var item = sale.items[l.lineIndex];
      if (!item) { errors.push("A selected line no longer exists on the sale."); return; }
      var already = returnedQtyForLine(sale.id, l.lineIndex, draft.id);
      var remaining = item.qty - already;
      if (l.qty > remaining) {
        errors.push('Cannot return ' + l.qty + ' x "' + item.desc + '" - only ' + remaining +
          ' of ' + item.qty + ' remain returnable' + (already ? " (" + already + " already returned)" : "") + ".");
      }
    });
  }

  var calc = computeReturn(draft);
  var alreadyRefunded = refundedTotalForSale(sale.id, draft.id);
  var saleTotal = saleGrossTotal(sale);
  if (draft.type === "custom") {
    if (!(Number(draft.customAmount) > 0)) errors.push("Enter a refund amount.");
  }
  if (calc && calc.total - 0.01 > saleTotal - alreadyRefunded) {
    errors.push("Refund of " + money(calc.total) + " exceeds the " + money(saleTotal - alreadyRefunded) +
      " still refundable on this sale.");
  }
  if (!draft.reason) errors.push("Choose a return reason.");
  if (draft.reason === "Other" && !String(draft.customReason || "").trim()) {
    errors.push("Describe the reason when choosing Other.");
  }
  var bytes = (draft.files || []).reduce(function (n, f) { return n + (f.size || 0); }, 0);
  if (bytes > MAX_UPLOAD_TOTAL) {
    errors.push("Attachments total " + Math.round(bytes / 1024) + "KB - keep under " + Math.round(MAX_UPLOAD_TOTAL / 1024) + "KB.");
  }
  return errors;
}

function nextReturnNo() {
  var max = 0;
  DB.returns.forEach(function (r) {
    var n = parseInt(String(r.no).replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return "RET-" + String(max + 1001).padStart(4, "0");
}

function logReturnEvent(rec, text) {
  rec.timeline = rec.timeline || [];
  rec.timeline.unshift({ at: nowIso(), by: "Zylo Super Admin", text: text });
}

function saveReturn(draft) {
  var errors = validateReturn(draft);
  if (errors.length) return { ok: false, errors: errors };
  var calc = computeReturn(draft);
  var existing = draft.id ? returnById(draft.id) : null;
  var rec = existing || {
    id: uid("ret"), no: nextReturnNo(), status: "pending",
    createdAt: nowIso(), timeline: [], restocked: false, posted: false
  };
  var sale = saleById(draft.saleId);
  rec.saleId = draft.saleId;
  rec.invoice = sale.invoice;
  rec.orderNo = sale.orderNo || "";
  rec.customer = sale.customer;
  rec.customerPhone = sale.customerPhone || "";
  rec.saleDate = sale.date;
  rec.saleTotal = saleGrossTotal(sale);
  rec.payment = sale.payment;
  rec.type = draft.type;
  rec.lines = deepCopy(draft.lines || []);
  rec.customAmount = Number(draft.customAmount) || 0;
  rec.reason = draft.reason;
  rec.customReason = draft.customReason || "";
  rec.internalNotes = draft.internalNotes || "";
  rec.restockTo = draft.restockTo || "available";
  rec.refundMethod = draft.refundMethod || "Cash";
  rec.files = deepCopy(draft.files || []);
  rec.refundNet = calc.net;
  rec.refundVat = calc.vat;
  rec.refundTotal = calc.total;
  rec.updatedAt = nowIso();
  if (!existing) {
    DB.returns.push(rec);
    logReturnEvent(rec, "Return created against " + sale.invoice);
  } else {
    logReturnEvent(rec, "Return details updated");
  }
  saveDB();
  return { ok: true, rec: rec };
}

/* Status transitions. Approval restocks inventory; the credit note is
   derived by buildJournal() from the status, so nothing is double-posted. */
function setReturnStatus(id, status) {
  var rec = returnById(id);
  if (!rec) return { ok: false, errors: ["Return not found"] };
  if (rec.status === status) return { ok: true, rec: rec };
  var prev = rec.status;
  rec.status = status;
  rec.updatedAt = nowIso();
  logReturnEvent(rec, "Status changed from " + RETURN_STATUS_LABEL[prev] + " to " + RETURN_STATUS_LABEL[status]);

  if ((status === "approved" || status === "refund_processed" || status === "completed") && !rec.restocked) {
    var moved = restockReturn(rec);
    rec.restocked = true;
    logReturnEvent(rec, moved
      ? "Restocked " + moved + " unit(s) to " + RESTOCK_TARGETS[rec.restockTo].toLowerCase()
      : "No stock movement - custom refund or unmatched items");
  }
  if (status === "rejected") {
    logReturnEvent(rec, "Rejected - quantities released and no accounting entry posted");
  }
  saveDB();
  return { ok: true, rec: rec };
}

function restockReturn(rec) {
  var sale = saleById(rec.saleId);
  if (!sale || rec.type === "custom") return 0;
  var wh = (DB.warehouses[0] || {}).id;
  if (!wh) return 0;
  var moved = 0;
  (rec.lines || []).forEach(function (l) {
    var item = sale.items[l.lineIndex];
    if (!item || !item.variantId) return;
    var inv = invFor(item.variantId, wh);
    if (!inv) {
      inv = addInventoryRecord({ variantId: item.variantId, warehouseId: wh, available: 0, reorderLevel: 5 }, true);
    }
    var qty = Number(l.qty) || 0;
    if (qty <= 0) return;
    var before, after;
    if (rec.restockTo === "available") {
      before = inv.available; inv.available += qty; after = inv.available;
      logMove(inv, "return_in", qty, "Return " + rec.no + " to available", rec.no, before, after);
    } else if (rec.restockTo === "damaged") {
      before = inv.damaged || 0; inv.damaged = before + qty; after = inv.damaged;
      logMove(inv, "return_damaged", qty, "Return " + rec.no + " to damaged", rec.no, before, after);
    } else {
      before = inv.returned || 0; inv.returned = before + qty; after = inv.returned;
      logMove(inv, "return_inspection", qty, "Return " + rec.no + " held for inspection", rec.no, before, after);
    }
    moved += qty;
  });
  return moved;
}

function deleteReturn(id) {
  var rec = returnById(id);
  if (!rec) return;
  DB.returns = DB.returns.filter(function (r) { return r.id !== id; });
  saveDB();
}

/* Only these statuses represent money actually given back. */
function returnIsPosted(rec) {
  return rec.status === "approved" || rec.status === "refund_processed" || rec.status === "completed";
}


/* ============================================================
   Sales returns UI
   ============================================================ */
var retDraft = null;

function renderReturns() {
  var q = (document.getElementById("retSearch").value || "").trim().toLowerCase();
  var sf = document.getElementById("retStatusFilter").value;
  var rows = DB.returns.filter(function (r) {
    if (sf && r.status !== sf) return false;
    if (q && [r.no, r.invoice, r.customer, r.orderNo, r.reason].join(" ").toLowerCase().indexOf(q) === -1) return false;
    return true;
  }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });

  document.getElementById("returnsBody").innerHTML = rows.length ? rows.map(function (r) {
    var typeLabel = { full: "Full order", item: "Item based", quantity: "Quantity", custom: "Custom refund" }[r.type] || r.type;
    return '<tr><td style="font-weight:500;">' + esc(r.no) + '</td>' +
      '<td style="color:var(--muted-foreground);">' + esc(r.invoice) + (r.orderNo ? '<br><span style="font-size:11px;">' + esc(r.orderNo) + '</span>' : '') + '</td>' +
      '<td>' + esc(r.customer) + '</td>' +
      '<td style="color:var(--muted-foreground);">' + esc(r.createdAt.slice(0, 10)) + '</td>' +
      '<td><span class="badge badge-muted">' + esc(typeLabel) + '</span></td>' +
      '<td style="color:var(--muted-foreground);">' + esc(r.reason === "Other" ? "Other - " + (r.customReason || "").slice(0, 24) : r.reason) + '</td>' +
      '<td class="num" style="font-weight:500;">' + money(r.refundTotal) + '</td>' +
      '<td><span class="badge ' + RETURN_STATUS_BADGE[r.status] + '">' + RETURN_STATUS_LABEL[r.status] + '</span></td>' +
      '<td style="text-align:right;white-space:nowrap;">' +
      '<button class="icon-btn" title="View" onclick="viewReturn(\'' + r.id + '\')">' + icon("eye", 14) + '</button>' +
      (r.status === "pending" || r.status === "under_review"
        ? '<button class="icon-btn" title="Edit" onclick="openReturn(\'' + r.id + '\')">' + icon("edit", 14) + '</button>' : '') +
      '<button class="icon-btn" title="Delete" onclick="removeReturn(\'' + r.id + '\')">' + icon("trash", 14) + '</button>' +
      '</td></tr>';
  }).join("") : '<tr><td colspan="9"><div class="empty-state">No returns yet. Use "New return" and search for the original sale.</div></td></tr>';

  var posted = DB.returns.filter(returnIsPosted);
  document.getElementById("retCountOut").textContent = DB.returns.length;
  document.getElementById("retPendingOut").textContent =
    DB.returns.filter(function (r) { return r.status === "pending" || r.status === "under_review"; }).length;
  document.getElementById("retRefundedOut").textContent =
    money(posted.reduce(function (n, r) { return n + r.refundTotal; }, 0));
  document.getElementById("retVatOut").textContent =
    money(posted.reduce(function (n, r) { return n + r.refundVat; }, 0));
}

function openReturn(id) {
  var existing = id ? returnById(id) : null;
  retDraft = existing
    ? { id: existing.id, saleId: existing.saleId, type: existing.type, lines: deepCopy(existing.lines),
        customAmount: existing.customAmount, reason: existing.reason, customReason: existing.customReason,
        internalNotes: existing.internalNotes, restockTo: existing.restockTo, files: deepCopy(existing.files || []) }
    : { saleId: null, type: "full", lines: [], customAmount: 0, reason: "", customReason: "",
        internalNotes: "", restockTo: "available", files: [] };

  document.getElementById("returnModalTitle").textContent = existing ? "Edit sales return" : "New sales return";
  document.getElementById("retReason").innerHTML =
    '<option value="">Select a reason...</option>' +
    RETURN_REASONS.map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + '</option>'; }).join("");
  document.getElementById("retSaleSearch").value = "";
  document.getElementById("retSaleResults").innerHTML =
    '<p style="font-size:12px;color:var(--muted-foreground);padding:8px 0;">Start typing to find the sale.</p>';
  document.getElementById("retErrors").innerHTML = "";

  if (retDraft.saleId) showReturnForm(); else clearSelectedSale();
  document.getElementById("returnModal").classList.add("show");
}

function clearSelectedSale() {
  retDraft.saleId = null;
  retDraft.lines = [];
  document.getElementById("retStepSearch").style.display = "";
  document.getElementById("retStepForm").style.display = "none";
  document.getElementById("retSaveBtn").style.display = "none";
}

function renderSaleSearch() {
  var q = document.getElementById("retSaleSearch").value;
  var host = document.getElementById("retSaleResults");
  if (!q.trim()) {
    host.innerHTML = '<p style="font-size:12px;color:var(--muted-foreground);padding:8px 0;">Start typing to find the sale.</p>';
    return;
  }
  var hits = searchSales(q);
  if (!hits.length) {
    host.innerHTML = '<p style="font-size:12px;color:var(--muted-foreground);padding:8px 0;">No sale matches that. A return must be linked to an existing sale.</p>';
    return;
  }
  host.innerHTML = '<table><thead><tr><th>Invoice</th><th>Order</th><th>Customer</th><th>Date</th><th class="num">Total</th><th></th></tr></thead><tbody>' +
    hits.slice(0, 12).map(function (s) {
      var refunded = refundedTotalForSale(s.id, retDraft.id);
      return '<tr><td style="font-weight:500;">' + esc(s.invoice) + '</td>' +
        '<td style="color:var(--muted-foreground);">' + esc(s.orderNo || "-") + '</td>' +
        '<td>' + esc(s.customer) + '</td>' +
        '<td style="color:var(--muted-foreground);">' + s.date + '</td>' +
        '<td class="num">' + money(docTotal(s)) + (refunded ? '<br><span style="font-size:11px;color:var(--warning);">' + money(refunded) + ' refunded</span>' : '') + '</td>' +
        '<td style="text-align:right;"><button class="btn btn-sm" type="button" onclick="selectSale(\'' + s.id + '\')">Select</button></td></tr>';
    }).join("") + '</tbody></table>';
}

function selectSale(saleId) {
  retDraft.saleId = saleId;
  var sale = saleById(saleId);
  retDraft.lines = sale.items.map(function (it, i) {
    var already = returnedQtyForLine(saleId, i, retDraft.id);
    return { lineIndex: i, qty: Math.max(0, it.qty - already) };
  });
  retDraft.type = "full";
  document.getElementById("retType").value = "full";
  showReturnForm();
}

function showReturnForm() {
  var sale = saleById(retDraft.saleId);
  document.getElementById("retStepSearch").style.display = "none";
  document.getElementById("retStepForm").style.display = "";
  document.getElementById("retSaveBtn").style.display = "";

  var prior = activeReturnsForSale(sale.id, retDraft.id);
  document.getElementById("retSaleSummary").innerHTML =
    '<div style="font-weight:500;margin-bottom:4px;">' + esc(sale.invoice) +
    (sale.orderNo ? ' &middot; ' + esc(sale.orderNo) : '') + '</div>' +
    '<div style="color:var(--muted-foreground);">' + esc(sale.customer) +
    (sale.customerPhone ? ' &middot; ' + esc(sale.customerPhone) : '') + '</div>' +
    '<div style="color:var(--muted-foreground);">Purchased ' + sale.date + ' &middot; paid by ' + esc(sale.payment) +
    ' &middot; total ' + money(docTotal(sale)) + '</div>' +
    (prior.length
      ? '<div style="color:var(--warning);margin-top:4px;">' + prior.length + ' previous return(s): ' +
        esc(prior.map(function (r) { return r.no + " (" + money(r.refundTotal) + ")"; }).join(", ")) + '</div>'
      : '');

  document.getElementById("retReason").value = retDraft.reason || "";
  document.getElementById("retCustomReason").value = retDraft.customReason || "";
  document.getElementById("retNotes").value = retDraft.internalNotes || "";
  document.getElementById("retRestock").value = retDraft.restockTo || "available";
  document.getElementById("retCustomAmount").value = retDraft.customAmount || "";
  document.getElementById("retType").value = retDraft.type;
  onReasonChange();
  onReturnTypeChange();
  renderFileList();
}

function onReturnTypeChange() {
  retDraft.type = document.getElementById("retType").value;
  var sale = saleById(retDraft.saleId);
  var isCustom = retDraft.type === "custom";
  document.getElementById("retCustomWrap").style.display = isCustom ? "" : "none";
  document.getElementById("retLinesWrap").style.display = isCustom ? "none" : "";

  if (retDraft.type === "full") {
    retDraft.lines = sale.items.map(function (it, i) {
      return { lineIndex: i, qty: Math.max(0, it.qty - returnedQtyForLine(sale.id, i, retDraft.id)) };
    });
  } else if (retDraft.type === "item" || retDraft.type === "quantity") {
    if (!retDraft.lines.length) {
      retDraft.lines = sale.items.map(function (it, i) { return { lineIndex: i, qty: 0 }; });
    }
  }
  renderReturnLines();
  recalcReturn();
}

function renderReturnLines() {
  var sale = saleById(retDraft.saleId);
  var locked = retDraft.type === "full";
  document.getElementById("retLinesBody").innerHTML = sale.items.map(function (it, i) {
    var already = returnedQtyForLine(sale.id, i, retDraft.id);
    var remaining = it.qty - already;
    var line = retDraft.lines.filter(function (l) { return l.lineIndex === i; })[0] || { qty: 0 };
    return '<tr>' +
      '<td>' + (locked ? '' : '<input type="checkbox" class="ret-pick" data-i="' + i + '"' +
        (line.qty > 0 ? " checked" : "") + (remaining <= 0 ? " disabled" : "") + ' onchange="onLinePick(this)">') + '</td>' +
      '<td>' + esc(it.desc) + '</td>' +
      '<td style="color:var(--muted-foreground);font-size:12px;">' + esc(it.sku || "-") + '</td>' +
      '<td class="num">' + money(it.rate) + '</td>' +
      '<td class="num">' + it.qty + '</td>' +
      '<td class="num"' + (already ? ' style="color:var(--warning);"' : '') + '>' + (already || "") + '</td>' +
      '<td class="num"><input type="number" class="ret-qty" data-i="' + i + '" min="0" max="' + remaining + '"' +
      ' value="' + line.qty + '"' + (locked || remaining <= 0 ? " disabled" : "") +
      ' style="height:28px;width:74px;text-align:right;font-size:12px;padding:0 6px;" oninput="onLineQty(this)"></td>' +
      '</tr>';
  }).join("");
}
function onLinePick(el) {
  var i = Number(el.getAttribute("data-i"));
  var sale = saleById(retDraft.saleId);
  var remaining = sale.items[i].qty - returnedQtyForLine(sale.id, i, retDraft.id);
  setLineQty(i, el.checked ? (retDraft.type === "quantity" ? 1 : remaining) : 0);
  renderReturnLines(); recalcReturn();
}
function onLineQty(el) {
  setLineQty(Number(el.getAttribute("data-i")), Number(el.value) || 0);
  recalcReturn();
}
function setLineQty(i, qty) {
  var found = retDraft.lines.filter(function (l) { return l.lineIndex === i; })[0];
  if (found) found.qty = qty;
  else retDraft.lines.push({ lineIndex: i, qty: qty });
}
function onReasonChange() {
  retDraft.reason = document.getElementById("retReason").value;
  document.getElementById("retCustomReasonWrap").style.display = retDraft.reason === "Other" ? "" : "none";
}
function recalcReturn() {
  if (!retDraft || !retDraft.saleId) return;
  retDraft.customAmount = Number(document.getElementById("retCustomAmount").value) || 0;
  var sale = saleById(retDraft.saleId);
  var calc = computeReturn(retDraft) || { net: 0, vat: 0, total: 0 };
  var saleTotal = docTotal(sale);
  var already = refundedTotalForSale(sale.id, retDraft.id);
  document.getElementById("retOriginalOut").textContent = money(saleTotal);
  document.getElementById("retAlreadyOut").textContent = money(already);
  document.getElementById("retNetOut").textContent = money(calc.net);
  document.getElementById("retVatLineOut").textContent = money(calc.vat);
  document.getElementById("retTotalOut").textContent = money(calc.total);
  document.getElementById("retRemainOut").textContent = money(Math.max(0, saleTotal - already - calc.total));
}

/* ---------- attachments ---------- */
function initReturnUpload() {
  var zone = document.getElementById("retUploadZone");
  if (!zone || zone.dataset.wired) return;
  zone.dataset.wired = "1";
  var input = document.createElement("input");
  input.type = "file"; input.multiple = true;
  input.accept = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";
  input.style.display = "none";
  zone.appendChild(input);
  zone.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () { acceptFiles(input.files); input.value = ""; });
  zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.style.background = "var(--muted)"; });
  zone.addEventListener("dragleave", function () { zone.style.background = ""; });
  zone.addEventListener("drop", function (e) { e.preventDefault(); zone.style.background = ""; acceptFiles(e.dataTransfer.files); });
}
function acceptFiles(files) {
  Array.prototype.forEach.call(files, function (f) {
    if (ACCEPTED_UPLOADS.indexOf(f.type) === -1) { showToast(f.name + ": only JPG, PNG, WEBP or PDF"); return; }
    if (f.size > MAX_UPLOAD_BYTES) {
      showToast(f.name + " is " + Math.round(f.size / 1024) + "KB - keep files under " + Math.round(MAX_UPLOAD_BYTES / 1024) + "KB");
      return;
    }
    var used = (retDraft.files || []).reduce(function (n, x) { return n + x.size; }, 0);
    if (used + f.size > MAX_UPLOAD_TOTAL) { showToast("Attachment limit reached for this return"); return; }
    var reader = new FileReader();
    reader.onload = function () {
      retDraft.files.push({ name: f.name, type: f.type, size: f.size, data: reader.result });
      renderFileList();
    };
    reader.readAsDataURL(f);
  });
}
function renderFileList() {
  var host = document.getElementById("retFileList");
  if (!host) return;
  var files = retDraft.files || [];
  if (!files.length) { host.innerHTML = '<p style="font-size:12px;color:var(--muted-foreground);">No documents attached.</p>'; return; }
  host.innerHTML = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">' +
    files.map(function (f, i) {
      var thumb = f.type === "application/pdf"
        ? '<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--muted);font-size:11px;color:var(--muted-foreground);">PDF</div>'
        : '<div style="aspect-ratio:1;background:var(--muted);"><img src="' + f.data + '" alt="" style="width:100%;height:100%;object-fit:cover;"></div>';
      return '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;">' + thumb +
        '<div style="padding:6px;font-size:11px;">' +
        '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + esc(f.name) + '">' + esc(f.name) + '</div>' +
        '<div style="color:var(--muted-foreground);">' + Math.round(f.size / 1024) + 'KB</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:4px;">' +
        '<a href="' + f.data + '" download="' + esc(f.name) + '" style="color:var(--accent);">Download</a>' +
        '<button type="button" class="icon-btn" style="width:20px;height:20px;" onclick="removeReturnFile(' + i + ')">' + icon("close", 12) + '</button>' +
        '</div></div></div>';
    }).join("") + '</div>';
}
function removeReturnFile(i) {
  retDraft.files.splice(i, 1);
  renderFileList();
}

function submitReturn() {
  retDraft.reason = document.getElementById("retReason").value;
  retDraft.customReason = document.getElementById("retCustomReason").value;
  retDraft.internalNotes = document.getElementById("retNotes").value;
  retDraft.restockTo = document.getElementById("retRestock").value;
  retDraft.customAmount = Number(document.getElementById("retCustomAmount").value) || 0;
  if (retDraft.type !== "custom") {
    retDraft.lines = retDraft.lines.filter(function (l) { return l.qty > 0; });
  }
  var res = saveReturn(retDraft);
  var errBox = document.getElementById("retErrors");
  if (!res.ok) {
    errBox.innerHTML = '<div style="padding:10px 12px;border-radius:8px;background:var(--danger-soft);color:var(--danger);font-size:12px;">' +
      res.errors.map(function (e) { return "&bull; " + esc(e); }).join("<br>") + '</div>';
    return;
  }
  errBox.innerHTML = "";
  closeModal("returnModal");
  renderReturns(); renderInventory(); renderDashboard();
  showToast("Return " + res.rec.no + " saved as " + RETURN_STATUS_LABEL[res.rec.status].toLowerCase());
}

function viewReturn(id) {
  var r = returnById(id);
  if (!r) return;
  var sale = saleById(r.saleId);
  document.getElementById("retViewTitle").textContent = r.no + " - " + r.customer;
  var lineRows = (r.lines || []).map(function (l) {
    var it = sale ? sale.items[l.lineIndex] : null;
    return '<tr><td>' + esc(it ? it.desc : "line " + l.lineIndex) + '</td>' +
      '<td style="color:var(--muted-foreground);">' + esc(it ? (it.sku || "-") : "-") + '</td>' +
      '<td class="num">' + l.qty + '</td>' +
      '<td class="num">' + money(it ? it.rate * l.qty : 0) + '</td></tr>';
  }).join("");
  document.getElementById("retViewBody").innerHTML =
    '<table><tbody>' +
    '<tr><td style="color:var(--muted-foreground);">Original sale</td><td>' + esc(r.invoice) + (r.orderNo ? " / " + esc(r.orderNo) : "") + '</td></tr>' +
    '<tr><td style="color:var(--muted-foreground);">Customer</td><td>' + esc(r.customer) + (r.customerPhone ? " &middot; " + esc(r.customerPhone) : "") + '</td></tr>' +
    '<tr><td style="color:var(--muted-foreground);">Purchase date</td><td>' + esc(r.saleDate) + '</td></tr>' +
    '<tr><td style="color:var(--muted-foreground);">Payment</td><td>' + esc(r.payment) + '</td></tr>' +
    '<tr><td style="color:var(--muted-foreground);">Reason</td><td>' + esc(r.reason) + (r.customReason ? " - " + esc(r.customReason) : "") + '</td></tr>' +
    '<tr><td style="color:var(--muted-foreground);">Restock to</td><td>' + esc(RESTOCK_TARGETS[r.restockTo]) + (r.restocked ? " (done)" : " (on approval)") + '</td></tr>' +
    (r.internalNotes ? '<tr><td style="color:var(--muted-foreground);">Internal notes</td><td>' + esc(r.internalNotes) + '</td></tr>' : "") +
    '<tr><td style="color:var(--muted-foreground);">Status</td><td><span class="badge ' + RETURN_STATUS_BADGE[r.status] + '">' + RETURN_STATUS_LABEL[r.status] + '</span></td></tr>' +
    '</tbody></table>' +
    (lineRows ? '<div class="section-title" style="margin-top:14px;">Items returned</div><table><thead><tr><th>Item</th><th>SKU</th><th class="num">Qty</th><th class="num">Value</th></tr></thead><tbody>' + lineRows + '</tbody></table>' : "") +
    '<div class="totals-box" style="margin-left:0;">' +
    '<div><span>Original amount</span><span>' + money(r.saleTotal) + '</span></div>' +
    '<div><span>Refund net</span><span>' + money(r.refundNet) + '</span></div>' +
    '<div><span>Refund VAT</span><span>' + money(r.refundVat) + '</span></div>' +
    '<div class="grand"><span>Refund total</span><span>' + money(r.refundTotal) + '</span></div>' +
    '<div><span>Remaining balance</span><span>' + money(Math.max(0, r.saleTotal - refundedTotalForSale(r.saleId, null))) + '</span></div>' +
    '</div>' +
    ((r.files || []).length ? '<div class="section-title" style="margin-top:14px;">Documents</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + r.files.map(function (f) {
        return '<a href="' + f.data + '" download="' + esc(f.name) + '" class="btn btn-sm">' + esc(f.name) + '</a>';
      }).join("") + '</div>' : "") +
    '<div class="section-title" style="margin-top:14px;">Approval history</div>' +
    '<div class="timeline">' + (r.timeline || []).map(function (t) {
      return '<div class="timeline-item"><div class="when">' + esc(t.at.slice(0, 19).replace("T", " ")) + ' &middot; ' + esc(t.by) + '</div>' +
        '<div class="what">' + esc(t.text) + '</div></div>';
    }).join("") + '</div>';

  var actions = [];
  var flow = { pending: ["under_review", "rejected"], under_review: ["approved", "rejected"],
    approved: ["refund_processed"], refund_processed: ["completed"], rejected: [], completed: [] };
  (flow[r.status] || []).forEach(function (next) {
    actions.push('<button class="btn ' + (next === "rejected" ? "btn-danger" : "btn-primary") +
      '" onclick="advanceReturn(\'' + r.id + '\',\'' + next + '\')">' + RETURN_STATUS_LABEL[next] + '</button>');
  });
  actions.push('<button class="btn" onclick="closeModal(\'returnViewModal\')">Close</button>');
  document.getElementById("retViewActions").innerHTML = actions.join("");
  document.getElementById("returnViewModal").classList.add("show");
}
function advanceReturn(id, status) {
  var res = setReturnStatus(id, status);
  if (!res.ok) { showToast(res.errors[0]); return; }
  renderReturns(); renderInventory(); renderPublished(); renderDashboard();
  viewReturn(id);
  showToast("Marked " + RETURN_STATUS_LABEL[status].toLowerCase());
}
function removeReturn(id) {
  var r = returnById(id);
  if (!r) return;
  var warn = returnIsPosted(r)
    ? "\n\nThis return has already been posted - deleting it will reverse its credit note and its refund will disappear from the VAT return."
    : "";
  if (!confirm("Delete return " + r.no + "?" + warn)) return;
  deleteReturn(id);
  renderReturns(); renderDashboard();
  showToast("Return deleted");
}
function exportReturnsCsv() {
  var rows = [["Return", "Invoice", "Order", "Customer", "Date", "Type", "Reason", "Refund net", "Refund VAT", "Refund total", "Status"]];
  DB.returns.forEach(function (r) {
    rows.push([r.no, r.invoice, r.orderNo, r.customer, r.createdAt.slice(0, 10), r.type,
      r.reason === "Other" ? "Other: " + r.customReason : r.reason,
      money2(r.refundNet), money2(r.refundVat), money2(r.refundTotal), RETURN_STATUS_LABEL[r.status]]);
  });
  downloadCsv("zylo-sales-returns.csv", rows);
}

/* ============================================================
   Categories UI
   ============================================================ */
function productCountInCat(catId, includeChildren) {
  var ids = [catId].concat(includeChildren ? catDescendants(catId) : []);
  return DB.products.filter(function (p) { return ids.indexOf(p.categoryId) !== -1; }).length;
}
function renderCategories() {
  var rows = catFlat();
  document.getElementById("categoriesBody").innerHTML = rows.length ? rows.map(function (n) {
    var c = n.cat;
    var indent = n.depth * 22;
    var own = productCountInCat(c.id, false);
    var deep = productCountInCat(c.id, true);
    return '<tr>' +
      '<td><div style="display:flex;align-items:center;padding-left:' + indent + 'px;">' +
      (n.depth ? '<span style="color:var(--muted-foreground);margin-right:8px;">&#8627;</span>' : '') +
      '<span style="font-weight:500;">' + esc(c.name) + '</span></div></td>' +
      '<td style="color:var(--muted-foreground);">' + esc(c.slug) + '</td>' +
      '<td class="num">' + own + (deep !== own ? ' <span style="color:var(--muted-foreground);">(' + deep + ')</span>' : '') + '</td>' +
      '<td>' + (c.featured ? '<span class="badge badge-accent">featured</span>' : '<span style="color:var(--muted-foreground);">&mdash;</span>') + '</td>' +
      '<td>' + (c.visible ? '<span class="badge badge-success">visible</span>' : '<span class="badge badge-muted">hidden</span>') + '</td>' +
      '<td><span class="badge ' + (c.status === "active" ? "badge-success" : "badge-muted") + '">' + esc(c.status) + '</span></td>' +
      '<td style="text-align:right;white-space:nowrap;">' +
      '<button class="icon-btn" title="Move up" onclick="moveCategory(\'' + c.id + '\',-1)">' + icon("arrowUp", 14) + '</button>' +
      '<button class="icon-btn" title="Move down" onclick="moveCategory(\'' + c.id + '\',1)">' + icon("arrowDown", 14) + '</button>' +
      '<button class="icon-btn" title="Edit" onclick="openCategory(\'' + c.id + '\')">' + icon("edit", 14) + '</button>' +
      '<button class="icon-btn" title="Delete" onclick="deleteCategory(\'' + c.id + '\')">' + icon("trash", 14) + '</button>' +
      '</td></tr>';
  }).join("") : '<tr><td colspan="7"><div class="empty-state">No categories yet.</div></td></tr>';
}
function moveCategory(id, dir) {
  var c = catById(id);
  var sibs = catChildren(c.parentId);
  var i = sibs.findIndex(function (s) { return s.id === id; });
  var t = i + dir;
  if (t < 0 || t >= sibs.length) return;
  var a = sibs[i], b = sibs[t];
  var tmp = a.sortOrder || 0; a.sortOrder = b.sortOrder || 0; b.sortOrder = tmp;
  if (a.sortOrder === b.sortOrder) { a.sortOrder = i; b.sortOrder = t; }
  saveDB(); renderCategories();
}
var editingCatId = null;
function fillCategorySelect(sel, excludeId, includeNone, noneLabel) {
  var blocked = excludeId ? [excludeId].concat(catDescendants(excludeId)) : [];
  var html = includeNone ? '<option value="">' + (noneLabel || "None (top level)") + '</option>' : "";
  catFlat().forEach(function (n) {
    if (blocked.indexOf(n.cat.id) !== -1) return;
    html += '<option value="' + n.cat.id + '">' +
      new Array(n.depth + 1).join("&mdash; ") + esc(n.cat.name) + '</option>';
  });
  sel.innerHTML = html;
}
function openCategory(id) {
  editingCatId = id || null;
  var c = id ? catById(id) : null;
  document.getElementById("categoryModalTitle").textContent = c ? "Edit category" : "New category";
  fillCategorySelect(document.getElementById("cParent"), id, true);
  document.getElementById("cName").value = c ? c.name : "";
  document.getElementById("cSlug").value = c ? c.slug : "";
  document.getElementById("cParent").value = c ? (c.parentId || "") : "";
  document.getElementById("cSort").value = c ? (c.sortOrder || 0) : 0;
  document.getElementById("cImage").value = c ? (c.image || "") : "";
  document.getElementById("cBanner").value = c ? (c.banner || "") : "";
  document.getElementById("cIcon").value = c ? (c.icon || "") : "";
  document.getElementById("cStatus").value = c ? c.status : "active";
  document.getElementById("cMetaTitle").value = c ? (c.metaTitle || "") : "";
  document.getElementById("cMetaDesc").value = c ? (c.metaDesc || "") : "";
  document.getElementById("cDesc").value = c ? (c.description || "") : "";
  document.getElementById("cFeatured").checked = c ? !!c.featured : false;
  document.getElementById("cVisible").checked = c ? c.visible !== false : true;
  document.getElementById("categoryModal").classList.add("show");
}
function cAutoSlug() {
  var s = document.getElementById("cSlug");
  if (!editingCatId && !s.dataset.touched) s.value = slugify(document.getElementById("cName").value);
}
function saveCategory() {
  var name = document.getElementById("cName").value.trim();
  if (!name) { showToast("Give the category a name"); return; }
  var parentId = document.getElementById("cParent").value || null;
  var rec = {
    id: editingCatId || uid("c"),
    name: name,
    slug: document.getElementById("cSlug").value.trim() || slugify(name),
    parentId: parentId,
    sortOrder: Number(document.getElementById("cSort").value) || 0,
    image: document.getElementById("cImage").value.trim(),
    banner: document.getElementById("cBanner").value.trim(),
    icon: document.getElementById("cIcon").value.trim(),
    status: document.getElementById("cStatus").value,
    metaTitle: document.getElementById("cMetaTitle").value.trim(),
    metaDesc: document.getElementById("cMetaDesc").value.trim(),
    description: document.getElementById("cDesc").value.trim(),
    featured: document.getElementById("cFeatured").checked,
    visible: document.getElementById("cVisible").checked
  };
  if (editingCatId) DB.categories = DB.categories.map(function (c) { return c.id === editingCatId ? rec : c; });
  else DB.categories.push(rec);
  saveDB(); closeModal("categoryModal"); renderCategories(); renderMasters();
  showToast(editingCatId ? "Category updated" : "Category created");
}
function deleteCategory(id) {
  var kids = catDescendants(id).length;
  var used = productCountInCat(id, true);
  var msg = "Delete this category?";
  if (kids) msg += "\n" + kids + " sub-categories will also be deleted.";
  if (used) msg += "\n" + used + " product(s) will become uncategorised.";
  if (!confirm(msg)) return;
  var doomed = [id].concat(catDescendants(id));
  DB.categories = DB.categories.filter(function (c) { return doomed.indexOf(c.id) === -1; });
  DB.products.forEach(function (p) { if (doomed.indexOf(p.categoryId) !== -1) p.categoryId = null; });
  saveDB(); renderCategories(); renderMasters(); showToast("Category deleted");
}
function exportCategoriesCsv() {
  var rows = [["Path", "Name", "Slug", "Parent", "Products", "Featured", "Visible", "Status"]];
  catFlat().forEach(function (n) {
    var c = n.cat;
    rows.push([catPath(c.id), c.name, c.slug, c.parentId ? catById(c.parentId).name : "",
      productCountInCat(c.id, true), c.featured ? "Yes" : "No", c.visible ? "Yes" : "No", c.status]);
  });
  downloadCsv("zylo-categories.csv", rows);
}

/* ============================================================
   Master products list
   ============================================================ */
function publishedVariantCount(masterId) {
  return variantsOf(masterId).filter(function (v) {
    return v.published && v.status !== "archived" && v.status !== "discontinued";
  }).length;
}
function productArt(seed, label) {
  var shapes = [
    '<rect width="600" height="600" fill="#f4f4f4"/><polygon points="0,600 600,0 600,600" fill="#0a0a0a"/>',
    '<rect width="600" height="600" fill="#f4f4f4"/><circle cx="300" cy="300" r="180" fill="none" stroke="#0a0a0a" stroke-width="26"/><circle cx="300" cy="300" r="70" fill="#0a0a0a"/>',
    '<rect width="600" height="600" fill="#0a0a0a"/><rect x="60" y="120" width="480" height="60" fill="#fff"/><rect x="60" y="270" width="480" height="60" fill="#fff"/><rect x="60" y="420" width="300" height="60" fill="#fff"/>',
    '<rect width="600" height="600" fill="#f4f4f4"/><circle cx="80" cy="80" r="18" fill="#0a0a0a"/><circle cx="170" cy="80" r="18" fill="#0a0a0a"/><circle cx="260" cy="80" r="18" fill="#0a0a0a"/><circle cx="350" cy="80" r="18" fill="#0a0a0a"/><circle cx="440" cy="80" r="18" fill="#0a0a0a"/><circle cx="530" cy="80" r="18" fill="#0a0a0a"/>',
    '<rect width="600" height="600" fill="#f4f4f4"/><polygon points="0,150 300,350 600,150 600,230 300,430 0,230" fill="#0a0a0a"/>'
  ];
  var textFill = ((seed || 0) % shapes.length === 2) ? "#fff" : "#0a0a0a";
  return '<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;">' +
    shapes[(seed || 0) % shapes.length] +
    '<text x="300" y="566" text-anchor="middle" font-family="monospace" font-size="17" letter-spacing="5" fill="' +
    textFill + '" opacity="0.5">' + esc(String(label || "").toUpperCase()) + '</text></svg>';
}

function renderMasters() {
  var catSel = document.getElementById("masterCategoryFilter");
  if (catSel && !catSel.dataset.filled) {
    fillCategorySelect(catSel, null, true, "All categories");
    catSel.dataset.filled = "1";
  }
  var q = (document.getElementById("masterSearch").value || "").trim().toLowerCase();
  var cf = document.getElementById("masterCategoryFilter").value;
  var sf = document.getElementById("masterStatusFilter").value;
  var catScope = cf ? [cf].concat(catDescendants(cf)) : null;

  var list = DB.products.filter(function (m) {
    if (q && (m.name + " " + m.sku).toLowerCase().indexOf(q) === -1) return false;
    if (catScope && catScope.indexOf(m.categoryId) === -1) return false;
    if (sf && m.status !== sf) return false;
    return true;
  });

  document.getElementById("mastersBody").innerHTML = list.length ? list.map(function (m) {
    var vs = variantsOf(m.id);
    var pub = publishedVariantCount(m.id);
    var badge = m.status === "published" ? "badge-success" : m.status === "draft" ? "badge-muted" : "badge-danger";
    var thumbHtml = (m.images && m.images.length > 0 && m.images[0].url)
      ? '<img src="' + esc(m.images[0].url) + '" style="width:100%;height:100%;object-fit:cover;">'
      : productArt(m.art || 0, m.name);
    return '<tr><td><input type="checkbox" data-row-check value="' + m.id + '"></td>' +
      '<td><div class="name-cell"><span class="row-thumb" style="overflow:hidden;padding:0;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;">' + thumbHtml + '</span>' +
      '<a style="font-weight:500;cursor:pointer;" onclick="openMaster(\'' + m.id + '\')">' + esc(m.name) + '</a></div></td>' +
      '<td style="color:var(--muted-foreground);">' + esc(m.sku) + '</td>' +
      '<td style="color:var(--muted-foreground);">' + esc(m.categoryId ? catPath(m.categoryId) : "Uncategorised") + '</td>' +
      '<td class="num">' + money(m.price) + '</td>' +
      '<td class="num">' + vs.length + '</td>' +
      '<td class="num">' + (pub ? pub : '<span style="color:var(--muted-foreground);">0</span>') + '</td>' +
      '<td><span class="badge ' + badge + '">' + esc(m.status) + '</span></td>' +
      '<td style="text-align:right;white-space:nowrap;">' +
      '<button class="icon-btn" title="Edit" onclick="openMaster(\'' + m.id + '\')">' + icon("edit", 14) + '</button>' +
      '<button class="icon-btn" title="Duplicate" onclick="duplicateMaster(\'' + m.id + '\')">' + icon("copy", 14) + '</button>' +
      '<button class="icon-btn" title="Delete" onclick="deleteMaster(\'' + m.id + '\')">' + icon("trash", 14) + '</button>' +
      '</td></tr>';
  }).join("") : '<tr><td colspan="9"><div class="empty-state">No master products match.</div></td></tr>';

  document.getElementById("productsCount").textContent =
    list.length + " of " + DB.products.length + " master products &middot; " +
    DB.variants.length + " variants";
  document.getElementById("productsCount").innerHTML =
    list.length + " of " + DB.products.length + " master products &middot; " +
    DB.variants.length + " variants total";
}
function deleteMaster(id) {
  var n = variantsOf(id).length;
  if (!confirm("Delete this master product and its " + n + " variant(s)?")) return;
  DB.products = DB.products.filter(function (m) { return m.id !== id; });
  DB.variants = DB.variants.filter(function (v) { return v.productId !== id; });
  saveDB(); renderMasters(); showToast("Master product deleted");
}
function duplicateMaster(id) {
  var src = masterById(id);
  if (!src) return;
  var copy = JSON.parse(JSON.stringify(src));
  copy.id = uid("m");
  copy.name = src.name + " (copy)";
  copy.slug = slugify(copy.name);
  copy.sku = src.sku + "-C" + String(DB.products.length + 1);
  copy.status = "draft";
  DB.products.push(copy);
  generateVariants(copy, true);
  variantsOf(copy.id).forEach(function (v) { v.published = false; v.status = "draft"; });
  saveDB(); renderMasters(); showToast("Duplicated as draft");
}
function exportMastersCsv() {
  var rows = [["Master", "SKU", "Category", "Price", "Variants", "Published variants", "Status"]];
  DB.products.forEach(function (m) {
    rows.push([m.name, m.sku, m.categoryId ? catPath(m.categoryId) : "", m.price,
      variantsOf(m.id).length, publishedVariantCount(m.id), m.status]);
  });
  downloadCsv("zylo-master-products.csv", rows);
}


/* Bulk actions on the master product list */
function initMasterBulk() {
  var table = document.getElementById("mastersTable");
  var bar = document.getElementById("mastersBulkBar");
  if (!table || !bar) return;
  var countEl = bar.querySelector("[data-selected-count]");
  function boxes() { return Array.prototype.slice.call(table.querySelectorAll("tbody [data-row-check]")); }
  function refresh() {
    var sel = boxes().filter(function (c) { return c.checked; });
    bar.classList.toggle("show", sel.length > 0);
    if (countEl) countEl.textContent = sel.length + " selected";
  }
  var all = table.querySelector("[data-select-all]");
  if (all) all.addEventListener("change", function () {
    boxes().forEach(function (c) { c.checked = all.checked; }); refresh();
  });
  table.addEventListener("change", function (e) { if (e.target.matches("[data-row-check]")) refresh(); });
  bar.querySelectorAll("[data-bulk-action]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var action = btn.getAttribute("data-bulk-action");
      var ids = boxes().filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      if (!ids.length) return;
      if (action === "duplicate") { ids.forEach(duplicateMaster); showToast(ids.length + " duplicated"); return; }
      ids.forEach(function (id) {
        var m = masterById(id); if (!m) return;
        if (action === "publish") {
          m.status = "published";
          variantsOf(id).forEach(function (v) {
            if (["disabled","discontinued","archived","hidden"].indexOf(v.status) !== -1) return;
            v.published = true; if (v.status === "draft") v.status = "active";
          });
        } else if (action === "unpublish") {
          m.status = "draft";
          variantsOf(id).forEach(function (v) { v.published = false; });
        } else if (action === "archive") {
          m.status = "archived";
          variantsOf(id).forEach(function (v) { v.published = false; v.status = "archived"; });
        }
      });
      saveDB(); renderMasters();
      showToast(ids.length + " master product(s) " + action + "ed");
    });
  });
  refresh();
}

/* ============================================================
   Master product editor
   ============================================================ */
var editingMasterId = null;
var draftOptions = {};

function openMaster(id) {
  editingMasterId = id || null;
  var m = id ? masterById(id) : null;
  document.getElementById("masterEditTitle").textContent = m ? "Edit master product" : "New master product";
  document.getElementById("masterEditSub").textContent = m
    ? m.name + " - " + variantsOf(m.id).length + " variant(s)"
    : "Define options, then publish the variants you want live.";
  fillCategorySelect(document.getElementById("mCategory"), null, true, "Uncategorised");
  document.getElementById("mName").value = m ? m.name : "";
  document.getElementById("mSlug").value = m ? m.slug : "";
  document.getElementById("mSku").value = m ? m.sku : "";
  document.getElementById("mBrand").value = m ? (m.brand || "Zylo") : "Zylo";
  document.getElementById("mCategory").value = m ? (m.categoryId || "") : "";
  document.getElementById("mStatus").value = m ? m.status : "draft";
  document.getElementById("mGender").value = m ? (m.gender || "") : "";
  document.getElementById("mSeason").value = m ? (m.season || "") : "";
  document.getElementById("mTags").value = m ? (m.tags || []).join(", ") : "";
  document.getElementById("mPrice").value = m ? m.price : "";
  document.getElementById("mMrp").value = m && m.mrp ? m.mrp : "";
  document.getElementById("mCost").value = m && m.cost ? m.cost : "";
  document.getElementById("mDesc").value = m ? (m.description || "") : "";
  var L = (m && m.labels) || {};
  document.getElementById("mFeatured").checked = !!L.featured;
  document.getElementById("mTrending").checked = !!L.trending;
  document.getElementById("mNew").checked = !!L.newArrival;
  document.getElementById("mBest").checked = !!L.bestSelling;
  draftOptions = m ? JSON.parse(JSON.stringify(m.options || {})) : { Colour: ["Black"], Size: ["One size"] };
  renderOptionRows();
  renderVariantMatrix();
  mCalc();
  showPage("productEditPage");
}
function mAutoSlug() {
  if (!editingMasterId) document.getElementById("mSlug").value = slugify(document.getElementById("mName").value);
}
function mGenSku() {
  var cid = document.getElementById("mCategory").value;
  var c = cid ? catById(cid) : null;
  var code = c ? shortCode(c.name).slice(0, 3) : "GEN";
  while (code.length < 3) code += "X";
  var n = DB.products.filter(function (p) { return (p.sku || "").indexOf("ZYL-" + code) === 0; }).length + 1;
  document.getElementById("mSku").value = "ZYL-" + code + "-" + String(n).padStart(5, "0");
}
function mCalc() {
  var p = Number(document.getElementById("mPrice").value) || 0;
  var mr = Number(document.getElementById("mMrp").value) || 0;
  var co = Number(document.getElementById("mCost").value) || 0;
  var parts = [];
  if (mr > p && p > 0) parts.push("Discount: <strong>" + Math.round((mr - p) / mr * 100) + "%</strong> off MRP");
  if (co > 0 && p > 0) parts.push("Margin: <strong>" + Math.round((p - co) / p * 100) + "%</strong>");
  document.getElementById("mCalcOut").innerHTML = parts.join(" &nbsp;&nbsp; ");
}
function renderOptionRows() {
  var host = document.getElementById("mOptionRows");
  var names = Object.keys(draftOptions);
  host.innerHTML = names.length ? names.map(function (n) {
    return '<div style="display:grid;grid-template-columns:150px 1fr auto;gap:8px;margin-bottom:8px;align-items:center;">' +
      '<input value="' + esc(n) + '" onchange="renameOption(\'' + esc(n) + '\', this.value)" placeholder="Option name">' +
      '<input value="' + esc((draftOptions[n] || []).join(", ")) + '" onchange="setOptionValues(\'' + esc(n) + '\', this.value)" placeholder="Values, comma separated">' +
      '<button type="button" class="icon-btn" onclick="removeOption(\'' + esc(n) + '\')">' + icon("close", 14) + '</button>' +
      '</div>';
  }).join("") : '<p style="font-size:12px;color:var(--muted-foreground);">No options - this product will have a single default variant.</p>';
}
function mAddOption() {
  var base = "Option", i = 1;
  while (draftOptions[base + " " + i]) i++;
  draftOptions[base + " " + i] = [];
  renderOptionRows(); previewMatrix();
}
function renameOption(oldName, newName) {
  newName = (newName || "").trim();
  if (!newName || newName === oldName || draftOptions[newName]) { renderOptionRows(); return; }
  var next = {};
  Object.keys(draftOptions).forEach(function (k) { next[k === oldName ? newName : k] = draftOptions[k]; });
  draftOptions = next; renderOptionRows(); previewMatrix();
}
function setOptionValues(name, csv) {
  draftOptions[name] = csv.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  previewMatrix();
}
function removeOption(name) {
  delete draftOptions[name];
  renderOptionRows(); previewMatrix();
}
/* Shows what the matrix will become before saving, without mutating stored data */
function previewMatrix() {
  var fake = { id: editingMasterId || "__preview__", sku: document.getElementById("mSku").value || "SKU",
    options: draftOptions, price: Number(document.getElementById("mPrice").value) || 0,
    status: document.getElementById("mStatus").value };
  var combos = variantCombos(fake);
  var existing = {};
  if (editingMasterId) variantsOf(editingMasterId).forEach(function (v) { existing[v.sku] = v; });
  var rows = combos.map(function (combo) {
    var sku = variantSkuFor(fake, combo);
    var v = existing[sku] || { sku: sku, options: combo, price: null, status: "draft", published: false, barcode: "" };
    return v;
  });
  paintVariantRows(rows, true);
}
function renderVariantMatrix() {
  paintVariantRows(editingMasterId ? variantsOf(editingMasterId) : [], false);
}
function paintVariantRows(rows, isPreview) {
  document.getElementById("mVariantCount").textContent =
    "(" + rows.length + (isPreview ? " after save" : "") + ")";
  document.getElementById("mVariantBody").innerHTML = rows.length ? rows.map(function (v, i) {
    var statusOpts = VARIANT_STATUSES.map(function (s) {
      return '<option value="' + s + '"' + (v.status === s ? " selected" : "") + '>' + VARIANT_STATUS_LABEL[s] + '</option>';
    }).join("");
    return '<tr data-vsku="' + esc(v.sku) + '">' +
      '<td><input type="checkbox" class="v-check"></td>' +
      '<td style="font-weight:500;">' + esc(variantLabel(v)) + '</td>' +
      '<td style="color:var(--muted-foreground);font-size:12px;">' + esc(v.sku) + '</td>' +
      '<td><input class="v-barcode" value="' + esc(v.barcode || "") + '" style="height:30px;font-size:12px;padding:0 8px;" placeholder="-"></td>' +
      '<td><input class="v-price" type="number" value="' + (v.price != null && v.price !== "" ? v.price : "") + '" placeholder="inherit" style="height:30px;font-size:12px;padding:0 8px;width:90px;text-align:right;"></td>' +
      '<td><select class="v-status" style="height:30px;font-size:12px;padding:0 6px;">' + statusOpts + '</select></td>' +
      '<td style="text-align:center;"><input type="checkbox" class="v-pub"' + (v.published ? " checked" : "") + '></td>' +
      '</tr>';
  }).join("") : '<tr><td colspan="7"><div class="empty-state">Add option values to build the matrix.</div></td></tr>';
}
function mSelectAllVariants(on) {
  document.querySelectorAll("#mVariantBody .v-check").forEach(function (c) { c.checked = !!on; });
}
function mBulkVariant(action) {
  var n = 0;
  document.querySelectorAll("#mVariantBody tr").forEach(function (tr) {
    var chk = tr.querySelector(".v-check");
    if (!chk || !chk.checked) return;
    var pub = tr.querySelector(".v-pub");
    var st = tr.querySelector(".v-status");
    if (action === "publish") { pub.checked = true; if (st.value === "draft") st.value = "active"; }
    else { pub.checked = false; }
    n++;
  });
  showToast(n ? n + " variant(s) " + (action === "publish" ? "marked to publish" : "unpublished") + " - save to apply"
              : "Select some variants first");
}
function collectVariantEdits() {
  var edits = {};
  document.querySelectorAll("#mVariantBody tr[data-vsku]").forEach(function (tr) {
    edits[tr.getAttribute("data-vsku")] = {
      barcode: tr.querySelector(".v-barcode").value.trim(),
      price: tr.querySelector(".v-price").value === "" ? null : Number(tr.querySelector(".v-price").value),
      status: tr.querySelector(".v-status").value,
      published: tr.querySelector(".v-pub").checked
    };
  });
  return edits;
}
function saveMaster(silent) {
  var name = document.getElementById("mName").value.trim();
  if (!name) { showToast("Give the product a name"); return null; }
  var sku = document.getElementById("mSku").value.trim();
  if (!sku) { showToast("Master SKU is required"); return null; }
  var clash = DB.products.filter(function (p) { return p.sku === sku && p.id !== editingMasterId; });
  if (clash.length) { showToast("That master SKU is already used by " + clash[0].name); return null; }

  var edits = collectVariantEdits();
  var rec = {
    id: editingMasterId || uid("m"),
    name: name,
    slug: document.getElementById("mSlug").value.trim() || slugify(name),
    sku: sku,
    brand: document.getElementById("mBrand").value.trim(),
    categoryId: document.getElementById("mCategory").value || null,
    status: document.getElementById("mStatus").value,
    gender: document.getElementById("mGender").value.trim(),
    season: document.getElementById("mSeason").value.trim(),
    tags: document.getElementById("mTags").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean),
    price: Number(document.getElementById("mPrice").value) || 0,
    mrp: Number(document.getElementById("mMrp").value) || 0,
    cost: Number(document.getElementById("mCost").value) || 0,
    description: document.getElementById("mDesc").value.trim(),
    labels: {
      featured: document.getElementById("mFeatured").checked,
      trending: document.getElementById("mTrending").checked,
      newArrival: document.getElementById("mNew").checked,
      bestSelling: document.getElementById("mBest").checked
    },
    options: JSON.parse(JSON.stringify(draftOptions))
  };
  if (editingMasterId) DB.products = DB.products.map(function (p) { return p.id === editingMasterId ? rec : p; });
  else DB.products.push(rec);
  editingMasterId = rec.id;

  generateVariants(rec, true);
  variantsOf(rec.id).forEach(function (v) {
    var e = edits[v.sku];
    if (e) { v.barcode = e.barcode; v.price = e.price; v.status = e.status; v.published = e.published; }
  });
  saveDB();
  renderVariantMatrix();
  renderMasters();
  document.getElementById("masterEditSub").textContent = rec.name + " - " + variantsOf(rec.id).length + " variant(s)";
  if (!silent) showToast("Saved - " + variantsOf(rec.id).length + " variant(s)");
  return rec;
}
function publishMaster() {
  var rec = saveMaster(true);
  if (!rec) return;
  rec.status = "published";
  document.getElementById("mStatus").value = "published";
  var n = 0;
  variantsOf(rec.id).forEach(function (v) {
    if (v.status === "disabled" || v.status === "discontinued" || v.status === "archived" || v.status === "hidden") return;
    v.published = true;
    if (v.status === "draft") v.status = "active";
    n++;
  });
  saveDB(); renderVariantMatrix(); renderMasters();
  showToast("Published master and " + n + " variant(s)");
}
function duplicateMasterCurrent() {
  if (!editingMasterId) { showToast("Save the product first"); return; }
  duplicateMaster(editingMasterId);
}

/* ================= CMS ================= */
var editingPageId = null;
function renderCms() {
  var badge = { published: "badge-success", draft: "badge-muted", scheduled: "badge-accent" };
  document.getElementById("cmsBody").innerHTML = DB.pages.map(function (p) {
    return '<tr><td style="font-weight:500;">' + esc(p.title) + '</td>' +
      '<td style="color:var(--muted-foreground);">' + esc(p.slug) + '</td>' +
      '<td><span class="badge ' + badge[p.status] + '">' + p.status + '</span></td>' +
      '<td style="color:var(--muted-foreground);">' + p.updated + '</td>' +
      '<td style="text-align:right;white-space:nowrap;">' +
      '<button class="btn btn-sm" onclick="openPageModal(\'' + p.id + '\')">Edit</button> ' +
      '<button class="icon-btn" onclick="deletePage(\'' + p.id + '\')">' + icon('trash',15) + '</button></td></tr>';
  }).join("");
}
function openPageModal(id) {
  editingPageId = id || null;
  var p = id ? DB.pages.find(function (x) { return x.id === id; }) : null;
  document.getElementById("pageModalTitle").textContent = p ? "Edit page" : "New page";
  document.getElementById("pgTitle").value = p ? p.title : "";
  document.getElementById("pgSlug").value = p ? p.slug : "";
  document.getElementById("pgStatus").value = p ? p.status : "draft";
  document.getElementById("pgMeta").value = p ? (p.meta || "") : "";
  document.getElementById("pgContent").innerHTML = p ? p.content : "<p></p>";
  document.getElementById("pageModal").classList.add("show");
}
function savePage() {
  var title = document.getElementById("pgTitle").value.trim();
  if (!title) { showToast("Give the page a title"); return; }
  var rec = {
    id: editingPageId || "pg" + Date.now(),
    title: title,
    slug: document.getElementById("pgSlug").value.trim() || "/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    status: document.getElementById("pgStatus").value,
    meta: document.getElementById("pgMeta").value.trim(),
    content: document.getElementById("pgContent").innerHTML,
    updated: today()
  };
  if (editingPageId) {
    DB.pages = DB.pages.map(function (p) { return p.id === editingPageId ? rec : p; });
  } else {
    DB.pages.push(rec);
  }
  saveDB(); closeModal("pageModal"); renderCms();
  showToast(editingPageId ? "Page updated" : "Page created");
}
function deletePage(id) {
  if (!confirm("Delete this page?")) return;
  DB.pages = DB.pages.filter(function (p) { return p.id !== id; });
  saveDB(); renderCms(); showToast("Page deleted");
}

/* ================= Settings ================= */
function saveSettings() {
  DB.settings.company = document.getElementById("cfgCompany").value.trim() || DB.settings.company;
  DB.settings.address = document.getElementById("cfgAddress").value.trim();
  DB.settings.pan = document.getElementById("cfgPan").value.trim();
  DB.settings.vatRate = Number(document.getElementById("cfgVatRate").value) || 13;
  DB.settings.invPrefix = document.getElementById("cfgInvPrefix").value.trim() || "INV-";
  saveDB(); showToast("Settings saved");
}


/* ============================================================
   Database tools - Settings > General
   ============================================================ */
function paintDataInfo() {
  var el = document.getElementById("dbAppVer");
  if (!el) return;
  el.textContent = DB.appVersion || APP_VERSION;
  document.getElementById("dbSchemaVer").textContent =
    "v" + (DB.version || 1) + " (current v" + DB_VERSION + ")";
  document.getElementById("dbLastMig").textContent =
    DB.lastMigratedAt ? DB.lastMigratedAt.slice(0, 19).replace("T", " ") : "never";

  var stats = [
    ["Categories", DB.categories.length], ["Brands", DB.brands.length],
    ["Collections", DB.collections.length], ["Master products", DB.products.length],
    ["Variants", DB.variants.length], ["Inventory records", DB.inventory.length],
    ["Stock movements", DB.stockMoves.length], ["Warehouses", DB.warehouses.length],
    ["Orders", DB.orders.length], ["Customers", DB.customers.length],
    ["Sales", DB.sales.length], ["Purchases", DB.purchases.length],
    ["CMS pages", DB.pages.length], ["Users", DB.users.length],
    ["Roles", DB.roles.length], ["Audit entries", DB.auditLog.length]
  ];
  var half = Math.ceil(stats.length / 2);
  var rows = "";
  for (var i = 0; i < half; i++) {
    var a = stats[i], b = stats[i + half];
    rows += '<tr><td style="color:var(--muted-foreground);">' + a[0] + '</td><td class="num">' + a[1] + '</td>' +
      (b ? '<td style="color:var(--muted-foreground);">' + b[0] + '</td><td class="num">' + b[1] + '</td>' : '<td></td><td></td>') +
      '</tr>';
  }
  document.getElementById("dbStatsBody").innerHTML = rows;
}

function verifyIntegrity() {
  var issues = integrityScan();
  var host = document.getElementById("integrityOut");
  if (!issues.length) {
    host.innerHTML = '<div style="padding:12px;border-radius:8px;background:var(--success-soft);color:var(--success);font-size:13px;">' +
      'No integrity problems found. All relationships are intact.</div>';
    return;
  }
  var grouped = {};
  issues.forEach(function (i) { (grouped[i.kind] = grouped[i.kind] || []).push(i); });
  var fixable = issues.filter(function (i) { return i.fixable; }).length;
  host.innerHTML =
    '<div style="padding:12px;border-radius:8px;background:var(--warning-soft);color:var(--warning);font-size:13px;margin-bottom:10px;">' +
    issues.length + ' issue(s) found, ' + fixable + ' automatically repairable.</div>' +
    '<div class="table-wrap"><table><thead><tr><th>Issue</th><th class="num">Count</th><th>Examples</th><th>Repairable</th></tr></thead><tbody>' +
    Object.keys(grouped).map(function (k) {
      var g = grouped[k];
      return '<tr><td style="font-weight:500;">' + esc(k) + '</td><td class="num">' + g.length + '</td>' +
        '<td style="color:var(--muted-foreground);font-size:12px;">' +
        esc(g.slice(0, 3).map(function (x) { return x.detail; }).join(", ")) + (g.length > 3 ? "..." : "") + '</td>' +
        '<td>' + (g[0].fixable ? '<span class="badge badge-success">yes</span>' : '<span class="badge badge-muted">manual</span>') + '</td></tr>';
    }).join("") + '</tbody></table></div>' +
    (fixable ? '<button class="btn btn-sm" style="margin-top:10px;" onclick="doRepairAll()">Repair ' + fixable + ' issue(s)</button>' : "");
}
function doRepairAll() {
  var res = repairAll();
  showToast("Repaired - " + res.before + " issues down to " + res.after);
  renderCategories(); renderMasters(); renderInventory(); renderPublished();
  paintDataInfo(); verifyIntegrity();
}
function rerunMigration() {
  var report = runMigrations(DB);
  saveDB(); paintDataInfo();
  showMigrationReport();
  showToast(report.steps.length ? "Applied " + report.steps.length + " migration step(s)" : "Already up to date");
}
function showMigrationReport() {
  var r = lastMigrationReport();
  var host = document.getElementById("migReportBody");
  document.getElementById("reportTitle").textContent =
    (r && r.fromVersion === null) ? "Installation report" : "Migration report";
  if (!r) { host.innerHTML = '<p style="color:var(--muted-foreground);">No migration or installation has been recorded.</p>'; }
  else {
    function list(title, arr, colour) {
      if (!arr || !arr.length) return "";
      return '<div style="margin-top:12px;"><div style="font-weight:500;margin-bottom:4px;' +
        (colour ? "color:" + colour + ";" : "") + '">' + title + ' (' + arr.length + ')</div>' +
        '<ul style="margin:0;padding-left:18px;color:var(--muted-foreground);">' +
        arr.map(function (x) { return '<li>' + esc(typeof x === "string" ? x : JSON.stringify(x)) + '</li>'; }).join("") +
        '</ul></div>';
    }
    host.innerHTML =
      '<table><tbody>' +
      '<tr><td style="color:var(--muted-foreground);">Previous schema</td><td>' + (r.fromVersion === null ? "fresh install" : "v" + r.fromVersion) + '</td></tr>' +
      '<tr><td style="color:var(--muted-foreground);">New schema</td><td>v' + r.toVersion + '</td></tr>' +
      '<tr><td style="color:var(--muted-foreground);">Records migrated</td><td>' + r.migrated + '</td></tr>' +
      '<tr><td style="color:var(--muted-foreground);">Records updated</td><td>' + r.updated + '</td></tr>' +
      '<tr><td style="color:var(--muted-foreground);">Records created</td><td>' + r.created + '</td></tr>' +
      '<tr><td style="color:var(--muted-foreground);">Records removed</td><td>' + r.removed + '</td></tr>' +
      '<tr><td style="color:var(--muted-foreground);">Finished</td><td>' + esc(String(r.finishedAt || "").slice(0, 19).replace("T", " ")) + '</td></tr>' +
      '</tbody></table>' +
      list("Steps applied", r.steps) +
      list("Notes", r.notes) +
      list("Auto repairs", r.repairs, "var(--success)") +
      list("Warnings", r.warnings, "var(--warning)") +
      list("Errors", r.errors, "var(--danger)");
  }
  document.getElementById("reportModal").classList.add("show");
}
function backupDatabase() {
  var payload = JSON.stringify({ exportedAt: nowIso(), appVersion: APP_VERSION, schema: DB.version, data: DB }, null, 2);
  var blob = new Blob([payload], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = "zylo-backup-" + today() + ".json"; a.click();
  URL.revokeObjectURL(url);
  DB.lastBackupAt = nowIso(); saveDB(); paintDataInfo();
  showToast("Backup downloaded");
}
function restoreDatabase(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    var parsed;
    try { parsed = JSON.parse(reader.result); }
    catch (e) { showToast("That file is not valid JSON"); input.value = ""; return; }
    var data = parsed && parsed.data ? parsed.data : parsed;
    if (!data || typeof data !== "object" || !Array.isArray(data.products)) {
      showToast("That file does not look like a Zylo backup"); input.value = ""; return;
    }
    if (!confirm("Restore this backup? Everything currently in this browser will be replaced.")) { input.value = ""; return; }
    var report = runMigrations(data);
    DB = data; saveDB();
    renderCategories(); renderMasters(); renderInventory(); renderPublished();
    renderSales(); renderPurchases(); renderCms(); renderDashboard(); renderStaticTables();
    paintDataInfo();
    showToast("Restored" + (report.steps.length ? " and migrated " + report.steps.length + " step(s)" : ""));
    input.value = "";
  };
  reader.readAsText(file);
}
function exportAllCsv() {
  exportMastersCsv(); exportCategoriesCsv(); exportInventoryCsv(); exportSalesCsv(); exportPurchasesCsv();
  showToast("Exported 5 CSV files");
}
function resetData() {
  if (!confirm("Reset all admin data to the demo set?\n\nThis erases every sale, purchase, product and page you have entered in this browser.")) return;
  seedDB();
  renderCategories(); renderMasters(); renderInventory(); renderPublished();
  renderStaticTables(); renderSales(); renderPurchases(); renderCms(); renderDashboard();
  paintDataInfo();
  var out = document.getElementById("integrityOut"); if (out) out.innerHTML = "";
  showToast("Data reset to the demo set");
}

/* ================= Rich text ================= */
function rteCmd(cmd, arg) { document.execCommand(cmd, false, arg || null); }
function rteLink() { var u = prompt("URL"); if (u) document.execCommand("createLink", false, u); }

/* ================= Shared widgets ================= */
document.querySelectorAll(".switch").forEach(function (el) {
  el.addEventListener("click", function () { el.classList.toggle("on"); });
});
document.querySelectorAll("[data-table-search]").forEach(function (input) {
  var table = document.getElementById(input.getAttribute("data-table-search"));
  if (!table) return;
  input.addEventListener("input", function () {
    var q = input.value.trim().toLowerCase();
    table.querySelectorAll("tbody tr").forEach(function (row) {
      row.classList.toggle("row-hidden", row.textContent.toLowerCase().indexOf(q) === -1);
    });
  });
});
document.querySelectorAll("[data-table-filter]").forEach(function (sel) {
  var table = document.getElementById(sel.getAttribute("data-table-filter"));
  var col = parseInt(sel.getAttribute("data-filter-col"), 10);
  if (!table) return;
  sel.addEventListener("change", function () {
    var v = sel.value.trim().toLowerCase();
    table.querySelectorAll("tbody tr").forEach(function (row) {
      if (!v) { row.classList.remove("row-hidden"); return; }
      var cell = row.children[col];
      row.classList.toggle("row-hidden", !cell || cell.textContent.toLowerCase().indexOf(v) === -1);
    });
  });
});
function initBulkSelection(tableId, barId) {
  var table = document.getElementById(tableId), bar = document.getElementById(barId);
  if (!table || !bar) return;
  var selectAll = table.querySelector("[data-select-all]");
  var countEl = bar.querySelector("[data-selected-count]");
  function boxes() { return Array.prototype.slice.call(table.querySelectorAll("tbody [data-row-check]")); }
  function refresh() {
    var checked = boxes().filter(function (c) { return c.checked; });
    bar.classList.toggle("show", checked.length > 0);
    if (countEl) countEl.textContent = checked.length + " selected";
  }
  if (selectAll) selectAll.addEventListener("change", function () {
    boxes().forEach(function (c) { if (!c.closest("tr").classList.contains("row-hidden")) c.checked = selectAll.checked; });
    refresh();
  });
  table.addEventListener("change", function (e) { if (e.target.matches("[data-row-check]")) refresh(); });
  bar.querySelectorAll("[data-bulk-action]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var action = btn.getAttribute("data-bulk-action");
      var sel = boxes().filter(function (c) { return c.checked; });
      if (action === "delete") {
        if (!confirm("Delete " + sel.length + " item(s)?")) return;
        sel.forEach(function (c) { c.closest("tr").remove(); });
      } else {
        sel.forEach(function (c) {
          var b = c.closest("tr").querySelector(".badge");
          if (!b) return;
          b.className = "badge " + (action === "publish" ? "badge-success" : "badge-muted");
          b.textContent = action === "publish" ? "published" : "draft";
        });
      }
      refresh();
    });
  });
  refresh();
}
function initTagInput(id) {
  var c = document.getElementById(id); if (!c) return;
  var input = c.querySelector("input");
  function wire(pill) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = "\u00d7";
    b.addEventListener("click", function () { pill.remove(); });
    pill.appendChild(b);
  }
  c.querySelectorAll(".tag-pill").forEach(wire);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      var v = input.value.trim(); if (!v) return;
      var pill = document.createElement("span");
      pill.className = "tag-pill"; pill.textContent = v;
      wire(pill); c.insertBefore(pill, input); input.value = "";
    } else if (e.key === "Backspace" && input.value === "") {
      var pills = c.querySelectorAll(".tag-pill");
      if (pills.length) pills[pills.length - 1].remove();
    }
  });
}
function initImageUploader(zoneId, gridId) {
  var zone = document.getElementById(zoneId), grid = document.getElementById(gridId);
  if (!zone || !grid) return;
  var fi = document.createElement("input");
  fi.type = "file"; fi.accept = "image/*"; fi.multiple = true; fi.style.display = "none";
  zone.appendChild(fi);
  function drag(tile) {
    tile.addEventListener("dragstart", function () { tile.classList.add("dragging"); });
    tile.addEventListener("dragend", function () { tile.classList.remove("dragging"); });
  }
  function addTile(url) {
    var t = document.createElement("div");
    t.className = "image-tile"; t.draggable = true;
    t.innerHTML = '<div class="thumb"><img src="' + url + '" alt=""></div>' +
      '<div class="meta"><input placeholder="Alt text"><input placeholder="Caption">' +
      '<div style="display:flex;justify-content:flex-end;"><button type="button" class="icon-btn" style="width:22px;height:22px;">' + icon("close",13) + '</button></div></div>';
    t.querySelector("button").addEventListener("click", function () { t.remove(); });
    drag(t); grid.appendChild(t);
  }
  grid.addEventListener("dragover", function (e) {
    e.preventDefault();
    var d = grid.querySelector(".dragging"); if (!d) return;
    var after = Array.prototype.slice.call(grid.children).find(function (ch) {
      if (ch === d) return false;
      var r = ch.getBoundingClientRect();
      return e.clientY <= r.top + r.height / 2 || e.clientX <= r.left + r.width / 2;
    });
    if (after) grid.insertBefore(d, after); else grid.appendChild(d);
  });
  function handle(files) {
    Array.prototype.forEach.call(files, function (f) {
      if (f.type.indexOf("image/") !== 0) return;
      var r = new FileReader();
      r.onload = function () { addTile(r.result); };
      r.readAsDataURL(f);
    });
  }
  zone.addEventListener("click", function () { fi.click(); });
  fi.addEventListener("change", function () { handle(fi.files); });
  zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.style.background = "var(--muted)"; });
  zone.addEventListener("dragleave", function () { zone.style.background = ""; });
  zone.addEventListener("drop", function (e) { e.preventDefault(); zone.style.background = ""; handle(e.dataTransfer.files); });
}
function initVariants(containerId, btnId) {
  var c = document.getElementById(containerId), b = document.getElementById(btnId);
  if (!c) return;
  function wire(btn) {
    btn.addEventListener("click", function () {
      if (c.querySelectorAll(".variant-row").length > 1) btn.closest(".variant-row").remove();
    });
  }
  c.querySelectorAll(".variant-row button").forEach(wire);
  if (b) b.addEventListener("click", function () {
    var r = document.createElement("div");
    r.className = "variant-row";
    r.innerHTML = '<input placeholder="SKU"><input placeholder="Size"><input placeholder="Color">' +
      '<input placeholder="Material"><input placeholder="Price override">' +
      '<button type="button" class="icon-btn">' + icon("close",14) + '</button>';
    wire(r.querySelector("button")); c.appendChild(r);
  });
}
function initPricingCalc(p, m, co, out) {
  var pe = document.getElementById(p), me = document.getElementById(m),
      ce = document.getElementById(co), oe = document.getElementById(out);
  if (!pe || !oe) return;
  function calc() {
    var price = parseFloat(pe.value) || 0, mrp = parseFloat(me.value) || 0, cost = parseFloat(ce.value) || 0;
    var parts = [];
    if (mrp > price && price > 0) parts.push("Discount: <strong>" + Math.round((mrp - price) / mrp * 100) + "%</strong> off MRP");
    if (cost > 0 && price > 0) parts.push("Margin: <strong>" + Math.round((price - cost) / price * 100) + "%</strong>");
    oe.innerHTML = parts.join(" &nbsp;&nbsp; ");
  }
  [pe, me, ce].forEach(function (e) { if (e) e.addEventListener("input", calc); });
  calc();
}
function initSkuGenerator(btnId, inputId, catId) {
  var b = document.getElementById(btnId), i = document.getElementById(inputId), c = document.getElementById(catId);
  if (!b || !i) return;
  var counters = {};
  b.addEventListener("click", function () {
    var cat = c ? c.value : "General";
    var code = (cat.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "GEN");
    while (code.length < 3) code += "X";
    counters[code] = (counters[code] || Math.floor(Math.random() * 40) + 1) + 1;
    i.value = "ZYL-" + code + "-" + String(counters[code]).padStart(5, "0");
  });
}
function initSectionReorder(id) {
  var c = document.getElementById(id); if (!c) return;
  c.querySelectorAll("[data-move]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var row = btn.closest(".hb-row"), dir = btn.getAttribute("data-move");
      if (dir === "up" && row.previousElementSibling) c.insertBefore(row, row.previousElementSibling);
      else if (dir === "down" && row.nextElementSibling) c.insertBefore(row.nextElementSibling, row);
    });
  });
}
function setDevice(btn, size) {
  document.querySelectorAll(".device-toggle button").forEach(function (b) { b.classList.remove("active"); });
  btn.classList.add("active");
  var f = document.getElementById("previewFrame");
  if (f) f.className = "preview-frame" + (size !== "desktop" ? " " + size : "");
}
function copyPreviewLink() {
  if (navigator.clipboard) navigator.clipboard.writeText(window.location.href);
  showToast("Preview link copied");
}
document.querySelectorAll(".modal-backdrop").forEach(function (m) {
  m.addEventListener("click", function (e) { if (e.target === m) m.classList.remove("show"); });
});

/* ================= Boot ================= */
try {
  var __boot = loadDB();
  if (__boot && __boot.corrupt) {
    setTimeout(function () { showToast(__boot.message || "Stored data was reset"); }, 400);
  } else if (__boot && __boot.report && __boot.report.steps.length) {
    setTimeout(function () {
      showToast("Database upgraded to v" + DB.version + " - see Settings for the report");
    }, 400);
  }
  renderStaticTables();
  renderCategories();
  renderMasters();
  initMasterBulk();
  renderInventory();
  renderPublished();
  initPublishedBulk();
  renderReturns();
  initReturnUpload();
  paintDataInfo();
  initTagInput("tagInput");
  initImageUploader("uploadZone", "imageGrid");
  initVariants("variantRows", "addVariantBtn");
  initPricingCalc("priceInput", "mrpInput", "costInput", "calcOut");
  initSkuGenerator("generateSkuBtn", "skuInput", "categorySelect");
  initSectionReorder("homepageSections");
  document.getElementById("cfgCompany").value = DB.settings.company;
  document.getElementById("cfgAddress").value = DB.settings.address;
  document.getElementById("cfgPan").value = DB.settings.pan;
  document.getElementById("cfgVatRate").value = DB.settings.vatRate;
  document.getElementById("cfgInvPrefix").value = DB.settings.invPrefix;
  renderCms();
  renderDashboard();
  paintIcons();
  syncThemeIcon();
} catch (bootErr) {
  bootError("Startup problem: " + bootErr.message + " - the login screen still works.");
  if (window.console && console.error) console.error(bootErr);
}

/* Belt-and-braces: a direct click handler as well as the form submit, so
   sign-in still works if submit handling is intercepted. */
(function () {
  var btn = document.getElementById("loginBtn");
  if (btn) btn.addEventListener("click", function (e) { signIn(e); });
})();
