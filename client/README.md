# Zylo Storefront — Next.js

Monochrome fashion storefront (WEARIX-derived design, rebranded Zylo) with NPR pricing and
Nepali payment methods (Cash on Delivery, eSewa, Fonepay).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

## Structure

- `app/` — App Router: layout (fonts, global CSS, design tokens) and the single page.
- `components/Landing.js` — the full landing page, generated from the original Figma file
  (static, pixel-faithful; images under `public/assets/`).
- `components/StoreApp.jsx` — the interactive shell: sticky nav, product detail, cart,
  checkout with COD / eSewa / Fonepay, collections page, contact page. It also wires
  click-through interactions onto the static landing markup (product cards, nav links,
  hero banner swap, community marquee).
- `public/assets/` — 76 optimized product/editorial images.

## Notes

- eSewa / Fonepay steps are simulated UI flows — swap the "simulate" button handlers in
  `StoreApp.jsx` (`completePayment`) for real gateway redirects when integrating.
- All prices are hard-coded NPR in `StoreApp.jsx` (`CATALOG`).
