'use client';
import React from 'react';
import Landing from './Landing';
import RamroxaHomepage from './RamroxaHomepage';
import { placeOrderApi, fetchUserOrdersApi } from '../services/orderService';
import { fetchProducts } from '../services/productService';
import { api } from '../services/apiClient';
import { loadHomepageConfig } from '../services/homepageCms';

const DEFAULT_CATALOG = [
  {
    id: "m1",
    name: "Monolith Tee",
    slug: "monolith-tee",
    sku: "ZYL-APP-00001",
    categoryId: "c_tops",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["tee", "core"],
    price: 1800,
    compare: 2200,
    labels: { featured: false, trending: false, newArrival: true, bestSelling: true },
    description: "240 GSM heavy jersey tee with drop-shoulder fit and high ribbed collar.",
    options: { Colour: ["Black", "White"], Size: ["S", "M", "L"] },
    img1: "/assets/ea97fe30fd8d1dfc.q.jpg",
    img2: "/assets/09789ab9b9e151f6.q.jpg"
  },
  {
    id: "m2",
    name: "Grid Hoodie",
    slug: "grid-hoodie",
    sku: "ZYL-APP-00002",
    categoryId: "c_tops",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["hoodie", "fleece"],
    price: 3800,
    compare: 4500,
    labels: { featured: true, trending: true, newArrival: false, bestSelling: false },
    description: "420 GSM loopback French terry hoodie with double-layer hood.",
    options: { Colour: ["Black"], Size: ["S", "M", "L"] },
    img1: "/assets/eeac2757b9ee2e46.q.jpg",
    img2: "/assets/67866d53aaeebcac.q.jpg"
  },
  {
    id: "m3",
    name: "Aperture Cap",
    slug: "aperture-cap",
    sku: "ZYL-ACC-00001",
    categoryId: "c_acc",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["cap", "hat"],
    price: 1500,
    compare: 1800,
    labels: { featured: true, trending: false, newArrival: true, bestSelling: false },
    description: "Low-profile six-panel cap in water-repellent nylon taslan.",
    options: { Colour: ["Black"], Size: ["One size"] },
    img1: "/assets/7f3fd1f72139111d.q.jpg",
    img2: "/assets/4a9712f500002e24.q.jpg"
  },
  {
    id: "m4",
    name: "Ledger Tote",
    slug: "ledger-tote",
    sku: "ZYL-BAG-00001",
    categoryId: "c_bags",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["bag", "canvas"],
    price: 2200,
    compare: 2600,
    labels: { featured: false, trending: true, newArrival: false, bestSelling: false },
    description: "16oz heavy cotton canvas tote with interior zipped pocket.",
    options: { Colour: ["Natural", "Black"], Size: ["One size"] },
    img1: "/assets/e282ebdc1a55d0be.q.jpg",
    img2: "/assets/08accf483615b0df.q.jpg"
  },
  {
    id: "m5",
    name: "Contour Jacket",
    slug: "contour-jacket",
    sku: "ZYL-OUT-00001",
    categoryId: "c_out",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["jacket"],
    price: 7200,
    compare: 8600,
    labels: { featured: true, trending: false, newArrival: false, bestSelling: false },
    description: "Cropped shell with taped seams.",
    options: { Colour: ["Black"], Size: ["S", "M", "L"] },
    img1: "/assets/57e8f8ec76e792b1.q.jpg",
    img2: "/assets/e2a028dd8bd0e7b5.q.jpg"
  },
  {
    id: "m6",
    name: "Frame Trousers",
    slug: "frame-trousers",
    sku: "ZYL-APP-00003",
    categoryId: "c_bottoms",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["trousers"],
    price: 3000,
    compare: 3600,
    labels: { featured: false, trending: false, newArrival: false, bestSelling: false },
    description: "Straight leg with articulated knee.",
    options: { Colour: ["Black"], Size: ["30", "32", "34"] },
    img1: "/assets/9a83a5f92f7a34f6.q.jpg",
    img2: "/assets/19eee9f8e07093fd.q.jpg"
  },
  {
    id: "p_ascent_windbreaker",
    name: "Ascent Tactical Windbreaker",
    slug: "ascent-tactical-windbreaker",
    sku: "ZYL-OUT-WND-01",
    categoryId: "c_out",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["windbreaker", "outerwear", "tactical", "jacket"],
    price: 4800,
    compare: 6200,
    labels: { featured: true, trending: true, newArrival: true, bestSelling: true },
    description: "Technical lightweight ripstop windbreaker featuring storm-sealed taped zippers, adjustable bungee toggles, and breathable underarm ventilation. Engineered for alpine squalls and daily urban commutes.",
    options: { Colour: ["Matte Black", "Cobalt Blue", "Cement Grey"], Size: ["S", "M", "L", "XL"] },
    img1: "/assets/57e8f8ec76e792b1.q.jpg",
    img2: "/assets/e2a028dd8bd0e7b5.q.jpg"
  },
  {
    id: "p_kuro_crewneck",
    name: "Kuro Heavyweight Crewneck",
    slug: "kuro-heavyweight-crewneck",
    sku: "ZYL-TOP-CRW-01",
    categoryId: "c_tops",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["crewneck", "sweatshirt", "fleece", "heavyweight"],
    price: 2850,
    compare: 3600,
    labels: { featured: true, trending: true, newArrival: true, bestSelling: true },
    description: "500 GSM loopback organic French terry crewneck with dropped armholes, ribbed cross-grain side panels, and subtle tonal embroidery across the back hem.",
    options: { Colour: ["Washed Charcoal", "Vintage Cream", "Pitch Black"], Size: ["S", "M", "L", "XL"] },
    img1: "/assets/eeac2757b9ee2e46.q.jpg",
    img2: "/assets/67866d53aaeebcac.q.jpg"
  },
  {
    id: "p_solitude_trousers",
    name: "Solitude Wide-Leg Pleated Trousers",
    slug: "solitude-wide-leg-pleated-trousers",
    sku: "ZYL-BOT-SLT-01",
    categoryId: "c_bottoms",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["trousers", "pleated", "tailored", "bottoms"],
    price: 3400,
    compare: 4400,
    labels: { featured: true, trending: false, newArrival: true, bestSelling: true },
    description: "Architectural front double pleats with a drape-forward wide-leg silhouette. Tailored from a high-twist wool-poly blend that resists creasing throughout the day.",
    options: { Colour: ["Obsidian Black", "Slate Grey", "Midnight Navy"], Size: ["30", "32", "34", "36"] },
    img1: "/assets/9a83a5f92f7a34f6.q.jpg",
    img2: "/assets/19eee9f8e07093fd.q.jpg"
  },
  {
    id: "p_nomad_crossbody",
    name: "Nomad Ballistic Crossbody Sling",
    slug: "nomad-ballistic-crossbody-sling",
    sku: "ZYL-BAG-SLN-01",
    categoryId: "c_bags",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["bag", "crossbody", "sling", "tactical"],
    price: 1950,
    compare: 2600,
    labels: { featured: true, trending: true, newArrival: true, bestSelling: false },
    description: "1050D Cordura ballistic nylon sling featuring quick-release Fidlock magnetic buckles, weather-shielded YKK Aquaguard zips, and modular Molle webbing loops.",
    options: { Colour: ["Tactical Black", "Desert Sand", "Stealth Olive"], Size: ["One size"] },
    img1: "/assets/e282ebdc1a55d0be.q.jpg",
    img2: "/assets/08accf483615b0df.q.jpg"
  },
  {
    id: "p_obsidian_denim",
    name: "Obsidian Distressed Selvedge Denim",
    slug: "obsidian-distressed-selvedge-denim",
    sku: "ZYL-BOT-OBS-01",
    categoryId: "c_bottoms",
    brand: "Ramroxa",
    gender: "Men",
    season: "SS26",
    tags: ["denim", "jeans", "selvedge", "pants"],
    price: 3650,
    compare: 4800,
    labels: { featured: true, trending: true, newArrival: true, bestSelling: true },
    description: "14.5oz Japanese selvedge denim in a relaxed barrel cut with subtle hand-sanded whiskering, reinforced pocket rivets, and custom matte silver hardware.",
    options: { Colour: ["Vintage Black", "Raw Indigo"], Size: ["30", "32", "34", "36"] },
    img1: "/assets/2461720fa204607a.q.jpg",
    img2: "/assets/39a84305ed8fadbc.q.jpg"
  },
  {
    id: "p_merino_beanie",
    name: "Merino Wool Ribbed Beanie",
    slug: "merino-wool-ribbed-beanie",
    sku: "ZYL-ACC-MRN-01",
    categoryId: "c_acc",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["beanie", "hat", "merino", "wool"],
    price: 1200,
    compare: 1600,
    labels: { featured: false, trending: true, newArrival: true, bestSelling: true },
    description: "100% extra-fine Merino wool chunky 7-gauge ribbed knit beanie. Soft next-to-skin touch with natural thermoregulation and odor resistance.",
    options: { Colour: ["Jet Black", "Heather Grey", "Oatmeal"], Size: ["One size"] },
    img1: "/assets/7f3fd1f72139111d.q.jpg",
    img2: "/assets/4a9712f500002e24.q.jpg"
  },
  {
    id: "p_eclipse_tee",
    name: "Eclipse Heavyweight Boxy Tee",
    slug: "eclipse-heavyweight-boxy-tee",
    sku: "ZYL-TOP-ECL-01",
    categoryId: "c_tops",
    brand: "Ramroxa",
    gender: "Unisex",
    season: "SS26",
    tags: ["tee", "tshirt", "boxy", "heavyweight"],
    price: 2100,
    compare: 2700,
    labels: { featured: true, trending: true, newArrival: true, bestSelling: true },
    description: "280 GSM heavyweight combed cotton boxy tee with structured high-density ribbed crew collar and reinforced double-needle stitched cuffs.",
    options: { Colour: ["Pitch Black", "Pure White", "Muted Olive"], Size: ["S", "M", "L", "XL"] },
    img1: "/assets/ea97fe30fd8d1dfc.q.jpg",
    img2: "/assets/09789ab9b9e151f6.q.jpg"
  },
  {
    id: "p_knit_shirt",
    name: "Textured Knitted Shirt",
    slug: "textured-knitted-shirt",
    sku: "ZYL-TOP-KNIT-01",
    categoryId: "c_tops",
    brand: "Ramroxa",
    gender: "Men",
    season: "SS26",
    tags: ["knit", "shirt", "summer"],
    price: 1750,
    compare: 2350,
    labels: { newArrival: true, featured: true, bestSelling: false },
    description: "An open-weave knit shirt with a relaxed boxy cut. Breathable texture that layers cleanly over a plain tee for everyday wear.",
    options: { Colour: ["Oatmeal", "Black"], Size: ["S", "M", "L", "XL"] },
    img1: "/assets/98eab38550301ca9.q.jpg",
    img2: "/assets/248028cbf9d4d390.q.jpg"
  },
  {
    id: "p_trench_coat",
    name: "Structured Trench Coat",
    slug: "structured-trench-coat",
    sku: "ZYL-OUT-TRN-01",
    categoryId: "c_out",
    brand: "Ramroxa",
    gender: "Men",
    season: "SS26",
    tags: ["trench", "coat", "outerwear"],
    price: 6300,
    compare: 8400,
    labels: { newArrival: true, featured: false, bestSelling: false },
    description: "A sharply tailored trench in a water-resistant twill. Structured shoulders and a clean drape built for the city.",
    options: { Colour: ["Khaki", "Black"], Size: ["M", "L", "XL"] },
    img1: "/assets/ee2608e46a586391.q.jpg",
    img2: "/assets/0e72c7de7ec1a38e.q.jpg"
  },
  {
    id: "p_denim_overalls",
    name: "Mini Denim Overalls",
    slug: "mini-denim-overalls",
    sku: "ZYL-BOT-OVR-01",
    categoryId: "c_bottoms",
    brand: "Ramroxa",
    gender: "Kids",
    season: "SS26",
    tags: ["overalls", "denim", "kids"],
    price: 1350,
    compare: 1800,
    labels: { newArrival: true, featured: false, bestSelling: false },
    description: "Kid-sized denim overalls in a mid-blue wash. Reinforced stitching and adjustable straps for growing frames.",
    options: { Colour: ["Indigo"], Size: ["4Y", "6Y", "8Y", "10Y"] },
    img1: "/assets/e282ebdc1a55d0be.q.jpg",
    img2: "/assets/08accf483615b0df.q.jpg"
  },
  {
    id: "p_riviera_shirt",
    name: "Riviera Collar Shirt",
    slug: "riviera-collar-shirt",
    sku: "ZYL-TOP-RIV-01",
    categoryId: "c_tops",
    brand: "Ramroxa",
    gender: "Women",
    season: "SS26",
    tags: ["camp", "shirt", "gauze"],
    price: 1350,
    compare: 1800,
    labels: { newArrival: true, featured: false, bestSelling: false },
    description: "A camp-collar shirt in crinkled cotton gauze. Light, airy and made for warm afternoons.",
    options: { Colour: ["White", "Sage"], Size: ["XS", "S", "M", "L"] },
    img1: "/assets/a22003dc69fc0fc1.q.jpg",
    img2: "/assets/b3a1fbdacd69bcda.q.jpg"
  },
  {
    id: "p_jersey_tee",
    name: "Stretch Jersey Tee",
    slug: "stretch-jersey-tee",
    sku: "ZYL-TOP-TEE-01",
    categoryId: "c_tops",
    brand: "Ramroxa",
    gender: "Men",
    season: "SS26",
    tags: ["tee", "jersey", "essential"],
    price: 1950,
    compare: 2850,
    labels: { newArrival: true, featured: false, bestSelling: false },
    description: "A heavyweight jersey tee with a touch of stretch. Holds its shape wash after wash.",
    options: { Colour: ["Black", "Heather Grey"], Size: ["S", "M", "L", "XL"] },
    img1: "/assets/ea97fe30fd8d1dfc.q.jpg",
    img2: "/assets/09789ab9b9e151f6.q.jpg"
  },
  {
    id: "p_utility_cargo",
    name: "Urban Utility Cargo",
    slug: "urban-utility-cargo",
    sku: "ZYL-BOT-CRG-01",
    categoryId: "c_bottoms",
    brand: "Ramroxa",
    gender: "Men",
    season: "SS26",
    tags: ["cargo", "utility", "canvas"],
    price: 2700,
    compare: 3600,
    labels: { newArrival: true, featured: false, bestSelling: false },
    description: "Roomy cargo trousers with angled utility pockets and a drawcord hem. Hard-wearing cotton canvas.",
    options: { Colour: ["Olive", "Black"], Size: ["30", "32", "34", "36"] },
    img1: "/assets/2461720fa204607a.q.jpg",
    img2: "/assets/39a84305ed8fadbc.q.jpg"
  },
  {
    id: "p_boxy_tee",
    name: "Classic Boxy Tee",
    slug: "classic-boxy-tee",
    sku: "ZYL-TOP-BOX-01",
    categoryId: "c_tops",
    brand: "Ramroxa",
    gender: "Women",
    season: "SS26",
    tags: ["tee", "boxy", "cotton"],
    price: 1050,
    compare: 1350,
    labels: { newArrival: true, featured: false, bestSelling: false },
    description: "The everyday tee — boxy fit, dropped shoulder, midweight combed cotton in a clean solid.",
    options: { Colour: ["White", "Charcoal"], Size: ["XS", "S", "M", "L"] },
    img1: "/assets/0d3fac373da0bd1f.q.jpg",
    img2: "/assets/bbb4f22211e2dc51.q.jpg"
  },
  {
    id: "p_smart_trousers",
    name: "Pleated Smart Trousers",
    slug: "pleated-smart-trousers",
    sku: "ZYL-BOT-PLT-01",
    categoryId: "c_bottoms",
    brand: "Ramroxa",
    gender: "Men",
    season: "SS26",
    tags: ["trousers", "pleated", "formal"],
    price: 2300,
    compare: 3000,
    labels: { newArrival: true, featured: false, bestSelling: false },
    description: "Double-pleated trousers with a tapered leg. Polished enough for work, easy enough for weekends.",
    options: { Colour: ["Charcoal", "Navy"], Size: ["30", "32", "34", "36"] },
    img1: "/assets/9a83a5f92f7a34f6.q.jpg",
    img2: "/assets/19eee9f8e07093fd.q.jpg"
  },
  {
    id: "p_terry_shorts",
    name: "French Terry Shorts",
    slug: "french-terry-shorts",
    sku: "ZYL-BOT-SHT-01",
    categoryId: "c_bottoms",
    brand: "Ramroxa",
    gender: "Women",
    season: "SS26",
    tags: ["shorts", "terry", "loungewear"],
    price: 1200,
    compare: 1650,
    labels: { newArrival: true, featured: false, bestSelling: false },
    description: "Loopback french terry shorts with a relaxed rise and side pockets. Off-duty essential.",
    options: { Colour: ["Cream", "Black"], Size: ["S", "M", "L"] },
    img1: "/assets/b81e3eb6af13055d.q.jpg",
    img2: "/assets/d4ddd6f6c7954c6b.q.jpg"
  },
  {
    id: "p_oversized_hoodie",
    name: "Heavyweight Oversized Hoodie",
    slug: "heavyweight-oversized-hoodie",
    sku: "ZYL-TOP-HOD-01",
    categoryId: "c_tops",
    brand: "Ramroxa",
    gender: "Men",
    season: "SS26",
    tags: ["hoodie", "fleece", "oversized"],
    price: 2550,
    compare: 3300,
    labels: { bestSelling: true, featured: true, newArrival: false },
    description: "Our signature 480gsm fleece hoodie. Oversized through the body with a double-lined hood and ribbed cuffs.",
    options: { Colour: ["Vintage Black", "Ash Grey"], Size: ["S", "M", "L", "XL"] },
    img1: "/assets/eeac2757b9ee2e46.q.jpg",
    img2: "/assets/67866d53aaeebcac.q.jpg"
  },
  {
    id: "p_knit_sweater",
    name: "Patterned Knit Sweater",
    slug: "patterned-knit-sweater",
    sku: "ZYL-TOP-SWT-01",
    categoryId: "c_tops",
    brand: "Ramroxa",
    gender: "Women",
    season: "SS26",
    tags: ["sweater", "jacquard", "knit"],
    price: 1350,
    compare: 2700,
    labels: { bestSelling: true, featured: false, newArrival: false },
    description: "A jacquard-knit sweater in a tonal stripe. Soft-spun yarn with a regular fit.",
    options: { Colour: ["Monochrome Stripe"], Size: ["XS", "S", "M", "L"] },
    img1: "/assets/3b9adec96400865c.q.jpg",
    img2: "/assets/ea5bdbd64c598cff.q.jpg"
  },
  {
    id: "p_quilted_bomber",
    name: "Quilted Bomber Jacket",
    slug: "quilted-bomber-jacket",
    sku: "ZYL-OUT-BOM-01",
    categoryId: "c_out",
    brand: "Ramroxa",
    gender: "Men",
    season: "SS26",
    tags: ["bomber", "jacket", "quilted"],
    price: 4350,
    compare: 5400,
    labels: { bestSelling: true, featured: true, newArrival: false },
    description: "A diamond-quilted bomber with matte hardware and ribbed trims. Warm without the bulk.",
    options: { Colour: ["Matte Black", "Olive"], Size: ["M", "L", "XL"] },
    img1: "/assets/57e8f8ec76e792b1.q.jpg",
    img2: "/assets/e2a028dd8bd0e7b5.q.jpg"
  },
  {
    id: "p_puffer_vest",
    name: "Hooded Puffer Vest",
    slug: "hooded-puffer-vest",
    sku: "ZYL-OUT-VST-01",
    categoryId: "c_out",
    brand: "Ramroxa",
    gender: "Kids",
    season: "SS26",
    tags: ["vest", "puffer", "kids"],
    price: 1350,
    compare: 2250,
    labels: { bestSelling: true, featured: false, newArrival: false },
    description: "A lightweight puffer vest with a stowable hood. Layer it over knits when the mercury drops.",
    options: { Colour: ["Black", "Yellow"], Size: ["4Y", "6Y", "8Y", "10Y"] },
    img1: "/assets/7f3fd1f72139111d.q.jpg",
    img2: "/assets/4a9712f500002e24.q.jpg"
  },
  {
    id: "p_leather_leggings",
    name: "Vegan Leather Leggings",
    slug: "vegan-leather-leggings",
    sku: "ZYL-BOT-LEG-01",
    categoryId: "c_bottoms",
    brand: "Ramroxa",
    gender: "Women",
    season: "SS26",
    tags: ["leggings", "leather", "stretch"],
    price: 2250,
    compare: 2950,
    labels: { bestSelling: true, featured: false, newArrival: false },
    description: "High-rise leggings in a matte vegan leather with four-way stretch and a clean ankle zip.",
    options: { Colour: ["Black"], Size: ["XS", "S", "M", "L"] },
    img1: "/assets/54f4ed23bf992cef.q.jpg",
    img2: "/assets/365d4729feaf7290.q.jpg"
  },
  {
    id: "p_boxy_blazer",
    name: "Cropped Boxy Blazer",
    slug: "cropped-boxy-blazer",
    sku: "ZYL-OUT-BLZ-01",
    categoryId: "c_out",
    brand: "Ramroxa",
    gender: "Women",
    season: "SS26",
    tags: ["blazer", "tailored", "suit"],
    price: 3900,
    compare: 5250,
    labels: { bestSelling: true, featured: true, newArrival: false },
    description: "A cropped blazer with a boxy shoulder and single-button close. Sharp over anything.",
    options: { Colour: ["Black", "Pinstripe"], Size: ["XS", "S", "M", "L"] },
    img1: "/assets/c71fd29c3338e4a5.q.jpg",
    img2: "/assets/dac45b43062fbe55.q.jpg"
  },
  {
    id: "prod_apex_runner",
    name: "Apex Carbon Knit Runner",
    slug: "apex-carbon-knit-runner",
    sku: "ZYL-SHOE-001",
    categoryId: "c_footwear",
    brand: "Zylo Footwear",
    gender: "Unisex",
    season: "SS26",
    tags: ["sneakers", "footwear", "runner", "knit"],
    price: 4850,
    compare: 6200,
    labels: { bestSelling: true, featured: true, newArrival: true },
    description: "Ultra-lightweight breathable engineered knit runner with carbon fiber propulsion plate, responsive EVA midsole, and high-traction rubber outsole.",
    options: { Colour: ["Blue", "Red"], Size: ["UK 3", "UK 4", "UK 5", "UK 6", "UK 7", "UK 8"] },
    img1: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
    img2: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod_vertex_sneaker",
    name: "Vertex Street Leather Low-Top",
    slug: "vertex-street-leather-low-top",
    sku: "ZYL-SHOE-002",
    categoryId: "c_footwear",
    brand: "Zylo Footwear",
    gender: "Unisex",
    season: "SS26",
    tags: ["sneakers", "footwear", "leather", "lowtop"],
    price: 5400,
    compare: 6900,
    labels: { bestSelling: true, featured: true, newArrival: false },
    description: "Full-grain Italian nappa leather low-top sneaker featuring custom tonal eyelets, cushioned OrthoLite insole, and vulcanized rubber sole.",
    options: { Colour: ["Blue", "Purple"], Size: ["UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10"] },
    img1: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80",
    img2: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod_phantom_velocity",
    name: "Phantom Velocity Trail Runner",
    slug: "phantom-velocity-trail-runner",
    sku: "ZYL-SHOE-003",
    categoryId: "c_footwear",
    brand: "Ramroxa Footwear",
    gender: "Unisex",
    season: "SS26",
    tags: ["shoes", "sneakers", "runner", "footwear", "trail", "carbon", "vibram"],
    price: 5800,
    compare: 7500,
    labels: { bestSelling: true, featured: true, newArrival: true },
    description: "Engineered for rugged terrains and urban concrete alike. Features a multi-directional Vibram® Megagrip lugged outsole, breathable ripstop Cordura® upper with TPU film overlays, and an energy-returning dual-density nitrogen-infused midsole.",
    options: { Colour: ["Triple Black", "Desert Sand", "Alpine Green"], Size: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
    img1: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&auto=format&fit=crop&q=80",
    img2: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80"
  }
];

const slugForProduct = (p, i) => (p?.slug || (p?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || String(i));

function formatProductItem(p, i) {
  const featuredImg = (p.images || []).find((img) => img.isFeatured) || (p.images || [])[0];
  const secondImg = (p.images || [])[1] || featuredImg;
  const priceNpr = p.basePrice !== undefined ? Math.round(p.basePrice / 100) : (p.price || 0);
  const mrpNpr = p.mrp !== undefined ? Math.round(p.mrp / 100) : (p.compare || priceNpr);
  const idx = p.idx !== undefined ? p.idx : (typeof i === 'number' ? i : 0);
  return {
    idx,
    id: p.id || p._id || `p_${idx}`,
    name: p.name,
    tag: p.labels?.newArrival ? 'NEW ARRIVAL' : (p.labels?.bestSelling ? 'BEST SELLER' : (p.labels?.featured ? 'FEATURED' : 'LATEST DROP')),
    labels: p.labels || {},
    price: priceNpr,
    compare: mrpNpr || priceNpr,
    desc: p.description || '',
    img1: featuredImg?.url || p.img1 || '/assets/ea97fe30fd8d1dfc.q.jpg',
    img2: secondImg?.url || p.img2 || featuredImg?.url || '/assets/ea97fe30fd8d1dfc.q.jpg',
    images: p.images || [{ url: featuredImg?.url || p.img1, isFeatured: true }],
    slug: p.slug || slugForProduct(p, idx),
    gender: p.gender || 'Unisex',
    brand: p.brand || p.brandName || (p.tags && p.tags.length ? p.tags[0] : 'Ramroxa'),
    category: p.category || p.categoryId || '',
    categoryId: p.categoryId || '',
    tags: p.tags || [],
    options: p.options || {},
    variantGroups: p.variantGroups || [],
    variants: p.variants || [],
    allVariants: p.allVariants || p.variants || [],
    totalStock: p.totalStock !== undefined ? p.totalStock : (p.availableStock !== undefined ? p.availableStock : 10),
    colors: (Array.isArray(p.colors) && p.colors.length > 0)
      ? p.colors
      : (Array.isArray(p.options?.Colour || p.options?.Color || p.options?.colours || p.options?.colors)
        ? (p.options?.Colour || p.options?.Color || p.options?.colours || p.options?.colors)
        : ((p.options?.Colour || p.options?.Color || p.options?.colours || p.options?.colors)
          ? [p.options?.Colour || p.options?.Color || p.options?.colours || p.options?.colors]
          : (Array.isArray(p.variants) && p.variants.length > 0
            ? Array.from(new Set(p.variants.flatMap(v => [
              ...(Array.isArray(v.subVariants) ? v.subVariants.map(sv => (sv.name || '').split('/').pop().trim()) : []),
              (v.name || '').split('/').pop().trim()
            ]).filter(Boolean)))
            : []))),
    createdAt: p.createdAt || new Date().toISOString()
  };
}

function buildFullCatalog() {
  return DEFAULT_CATALOG.map((item, idx) => ({
    ...item,
    idx,
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
  red: '#dc2626',
  blue: '#2563eb',
  navy: '#1e3a8a',
  green: '#16a34a',
  olive: '#65a30d',
  yellow: '#facc15',
  orange: '#ea580c',
  brown: '#78350f',
  beige: '#d4b996',
  cream: '#fffdd0',
  grey: '#9ca3af',
  gray: '#9ca3af',
  charcoal: '#374151',
  pink: '#ec4899',
  purple: '#9333ea',
  maroon: '#800000',
  burgundy: '#800020',
  tan: '#d2b48c',
  khaki: '#c3b091',
  oatmeal: '#e3dac9',
  natural: '#f2eecb',
  indigo: '#2e4482',
  denim: '#466d98',
  sage: '#9caf88',
  'heather grey': '#9e9e9e',
  'matte black': '#1a1a1a',
  'cobalt blue': '#1e40af',
  'cement grey': '#94a3b8',
  'washed charcoal': '#475569',
  'vintage cream': '#fef3c7',
  'pitch black': '#09090b',
  'obsidian black': '#0f172a',
  'slate grey': '#64748b',
  'midnight navy': '#0f172a',
  'tactical black': '#18181b',
  'desert sand': '#d4b996',
  'stealth olive': '#3f4f38',
  'vintage black': '#27272a',
  'raw indigo': '#1e3a8a',
  'jet black': '#050505',
  'pure white': '#ffffff',
  'muted olive': '#556b2f',
  'ash grey': '#b0b0b0',
  'monochrome stripe': '#222222',
  pinstripe: '#333333'
};

function getProductCardVariants(p) {
  if (!p) return { sizes: [], colours: [] };

  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', '28', '30', '32', '34', '36', '38', '40'];

  // 1. Dynamic Sizes
  const sizeSet = new Set();
  const rawSizes = p.options?.Size || p.options?.size || p.options?.sizes || p.sizes || [];
  (Array.isArray(rawSizes) ? rawSizes : [rawSizes]).forEach(s => {
    if (s) sizeSet.add(String(s).trim());
  });

  if (Array.isArray(p.variantGroups)) {
    const sizeGroup = p.variantGroups.find(vg => /size|sizes/i.test(vg.name || ''));
    if (sizeGroup && Array.isArray(sizeGroup.values)) {
      sizeGroup.values.forEach(v => { if (v.name) sizeSet.add(String(v.name).trim()); });
    } else if (p.variantGroups.length > 0 && Array.isArray(p.variantGroups[0]?.values)) {
      p.variantGroups[0].values.forEach(v => { if (v.name) sizeSet.add(String(v.name).trim()); });
    }
  }

  // Extract from variants / allVariants
  const allVars = Array.isArray(p.allVariants) && p.allVariants.length ? p.allVariants : (Array.isArray(p.variants) ? p.variants : []);
  allVars.forEach(v => {
    const optSize = v.options?.Size || v.options?.size;
    if (optSize) {
      sizeSet.add(String(optSize).trim());
    } else if (v.name && !v.parentVariantId) {
      const cleanName = v.name.replace(/^(Size|Variant)\s*:\s*/i, '').trim();
      if (cleanName && !cleanName.includes('/')) sizeSet.add(cleanName);
    }
  });

  const sizes = Array.from(sizeSet).sort((a, b) => {
    const idxA = sizeOrder.indexOf(a);
    const idxB = sizeOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  // 2. Dynamic Colours & solid colour values from Master Products sub-variants
  const colourMap = new Map();

  // From Master Products variantGroups subsets
  if (Array.isArray(p.variantGroups)) {
    p.variantGroups.forEach(vg => {
      (vg.values || []).forEach(val => {
        (val.subsets || []).forEach(sub => {
          const subName = (sub.name || '').trim();
          if (subName && !colourMap.has(subName.toLowerCase())) {
            const hex = sub.colorHex || COLOR_HEX_MAP[subName.toLowerCase()] || '#333333';
            const isAvail = sub.status !== 'Archived' && sub.status !== 'Disabled';
            colourMap.set(subName.toLowerCase(), { name: subName, hex, available: isAvail });
          }
        });
      });
    });
  }

  // From variants & subvariants
  allVars.forEach(v => {
    const optCol = v.options?.Colour || v.options?.colour || v.options?.Color || v.options?.color;
    if (optCol) {
      const colName = String(optCol).trim();
      if (!colourMap.has(colName.toLowerCase())) {
        const hex = v.colorHex || COLOR_HEX_MAP[colName.toLowerCase()] || '#333333';
        const isAvail = v.status !== 'archived' && v.available !== false;
        colourMap.set(colName.toLowerCase(), { name: colName, hex, available: isAvail });
      }
    } else if (v.name && v.name.includes('/')) {
      const parts = v.name.split('/');
      const colName = parts[parts.length - 1].trim();
      if (colName && !colourMap.has(colName.toLowerCase())) {
        const hex = COLOR_HEX_MAP[colName.toLowerCase()] || '#333333';
        colourMap.set(colName.toLowerCase(), { name: colName, hex, available: true });
      }
    }
  });

  // From product options (Colour / Color)
  const rawColours = p.options?.Colour || p.options?.Color || p.options?.colours || p.options?.colors || p.colors || [];
  const colourList = Array.isArray(rawColours) ? rawColours : (rawColours ? [rawColours] : []);
  colourList.forEach(col => {
    const colName = String(typeof col === 'string' ? col : (col.name || '')).trim();
    if (colName && !colourMap.has(colName.toLowerCase())) {
      const hex = typeof col === 'object' && col.hex ? col.hex : (COLOR_HEX_MAP[colName.toLowerCase()] || (colName.startsWith('#') ? colName : '#333333'));
      colourMap.set(colName.toLowerCase(), { name: colName, hex, available: true });
    }
  });

  const colours = Array.from(colourMap.values());
  return { sizes, colours };
}

function getVariantStock(p, selectedSize, selectedColor) {
  if (!p) return { stock: 0, variant: null, isOutOfStock: true };

  const clean = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetSize = clean(selectedSize);
  const targetColor = clean(selectedColor);

  const variants = Array.isArray(p.variants) ? p.variants : [];
  const allVariants = Array.isArray(p.allVariants) && p.allVariants.length ? p.allVariants : variants;

  if (variants.length > 0 || allVariants.length > 0) {
    const topVars = variants.filter(v => !v.parentVariantId);
    const subVars = allVariants.filter(v => !!v.parentVariantId).concat(variants.flatMap(v => Array.isArray(v.subVariants) ? v.subVariants : []));

    const getVarSize = (v) => clean(v.options?.Size || v.options?.size || (v.name && !v.parentVariantId ? v.name.replace(/^(Size|Variant)\s*:\s*/i, '') : ''));
    const getVarColor = (v) => clean(v.options?.Colour || v.options?.colour || v.options?.Color || v.options?.color || (v.name && v.name.includes('/') ? v.name.split('/').pop() : ''));
    const getVarAvail = (v) => Number(v.availableStock ?? v.stock ?? 0);

    // Case 1: Both Size and Colour are selected
    if (targetSize && targetColor) {
      // 1. Try finding matching sub-variant
      const matchedSub = subVars.find(sv => {
        const sSize = getVarSize(sv);
        const sCol = getVarColor(sv);
        let parentSize = '';
        if (sv.parentVariantId) {
          const parent = topVars.find(tv => tv.id === sv.parentVariantId);
          if (parent) parentSize = getVarSize(parent);
        }
        const sizeMatches = (sSize && (sSize === targetSize || sSize.includes(targetSize) || targetSize.includes(sSize))) ||
          (parentSize && (parentSize === targetSize || parentSize.includes(targetSize) || targetSize.includes(parentSize)));
        const colMatches = sCol && (sCol === targetColor || sCol.includes(targetColor) || targetColor.includes(sCol));
        return sizeMatches && colMatches;
      });

      if (matchedSub) {
        const stock = getVarAvail(matchedSub);
        return { stock: Math.max(0, stock), variant: matchedSub, isOutOfStock: stock <= 0 };
      }

      // 2. Try topVars directly matching
      const matchedTop = topVars.find(tv => {
        const tSize = getVarSize(tv);
        const tCol = getVarColor(tv);
        const sizeMatches = tSize && (tSize === targetSize || tSize.includes(targetSize) || targetSize.includes(tSize));
        const colMatches = tCol && (tCol === targetColor || tCol.includes(targetColor) || targetColor.includes(tCol));
        return sizeMatches && (colMatches || !tCol);
      });

      if (matchedTop) {
        const childSubs = subVars.filter(sv => sv.parentVariantId === matchedTop.id);
        if (childSubs.length > 0) {
          const matchedChild = childSubs.find(sv => {
            const sCol = getVarColor(sv);
            return sCol && (sCol === targetColor || sCol.includes(targetColor) || targetColor.includes(sCol));
          });
          if (matchedChild) {
            const stock = getVarAvail(matchedChild);
            return { stock: Math.max(0, stock), variant: matchedChild, isOutOfStock: stock <= 0 };
          }
        }
        const topStock = getVarAvail(matchedTop);
        return { stock: Math.max(0, topStock), variant: matchedTop, isOutOfStock: topStock <= 0 };
      }
    }

    // Case 2: Only Size is selected
    if (targetSize) {
      const matchedTop = topVars.find(tv => {
        const tSize = getVarSize(tv);
        return tSize && (tSize === targetSize || tSize.includes(targetSize) || targetSize.includes(tSize));
      });

      if (matchedTop) {
        const childSubs = subVars.filter(sv => sv.parentVariantId === matchedTop.id);
        let stock = 0;
        if (childSubs.length > 0) {
          stock = childSubs.reduce((sum, sv) => sum + getVarAvail(sv), 0);
        } else {
          stock = getVarAvail(matchedTop);
        }
        return { stock: Math.max(0, stock), variant: matchedTop, isOutOfStock: stock <= 0 };
      }
    }

    // Case 3: Only Colour is selected
    if (targetColor) {
      const matchedSubs = subVars.filter(sv => {
        const sCol = getVarColor(sv);
        return sCol && (sCol === targetColor || sCol.includes(targetColor) || targetColor.includes(sCol));
      });

      if (matchedSubs.length > 0) {
        const stock = matchedSubs.reduce((sum, sv) => sum + getVarAvail(sv), 0);
        return { stock: Math.max(0, stock), variant: matchedSubs[0], isOutOfStock: stock <= 0 };
      }
    }

    // Fallback: Product totalStock or first variant
    const totStock = p.totalStock !== undefined ? Number(p.totalStock) : (p.availableStock !== undefined ? Number(p.availableStock) : 0);
    return { stock: Math.max(0, totStock), variant: topVars[0] || allVariants[0], isOutOfStock: totStock <= 0 };
  }

  const defaultStock = p.totalStock !== undefined ? Number(p.totalStock) : (p.availableStock !== undefined ? Number(p.availableStock) : 0);
  return { stock: Math.max(0, defaultStock), variant: null, isOutOfStock: defaultStock <= 0 };
}

const FREE_OVER = 5000;
const rs = n => 'Rs ' + (n || 0).toLocaleString('en-US');
const asset = h => `/assets/${h}.q.jpg`;
const formatBannerUrl = (url) => {
  if (!url) return '/hero-slide-1.jpg';
  const s = String(url).trim();
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/') || s.startsWith('data:')) {
    return s;
  }
  return `/assets/${s}.q.jpg`;
};
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
  } catch (e) { }
}

function loadStoredWishlist() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('zylo-store-wishlist');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredWishlist(wishlist) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('zylo-store-wishlist', JSON.stringify(wishlist || []));
  } catch (e) { }
}

export default class StoreApp extends React.Component {
  constructor(props) {
    super(props);
    const initialCatalog = buildFullCatalog();
    let initialSel = 0;
    let initialSize = 'M';
    let initialColor = '';
    if (props.initialProductSlug) {
      const foundIdx = initialCatalog.findIndex((p, i) =>
        slugForProduct(p, i) === props.initialProductSlug ||
        p.slug === props.initialProductSlug ||
        p.id === props.initialProductSlug ||
        String(i) === props.initialProductSlug
      );
      if (foundIdx >= 0) {
        initialSel = foundIdx;
        const initialProd = initialCatalog[foundIdx];
        const { sizes: initSizes, colours: initColours } = getProductCardVariants(initialProd);
        initialSize = (initSizes && initSizes[0]) || 'M';
        initialColor = (initColours && initColours[0]?.name) || '';
      }
    } else if (props.initialProduct != null) {
      initialSel = props.initialProduct;
      const initialProd = initialCatalog[initialSel];
      const { sizes: initSizes, colours: initColours } = getProductCardVariants(initialProd);
      initialSize = (initSizes && initSizes[0]) || 'M';
      initialColor = (initColours && initColours[0]?.name) || '';
    }

    let initialCart = [];
    let initialWishlist = [];
    let initialName = '';
    let initialPhone = '';
    let initialAddress = '';
    let initialAddress2 = '';
    let initialReceiverPhone = '';
    let initialCity = 'Kathmandu';
    let initialPay = 'cod';
    let initialUser = null;

    if (typeof window !== 'undefined') {
      initialCart = loadStoredCart();
      initialWishlist = loadStoredWishlist();
      try {
        initialName = localStorage.getItem('zylo-c-name') || '';
        initialPhone = localStorage.getItem('zylo-c-phone') || '';
        initialAddress = localStorage.getItem('zylo-c-address') || '';
        initialAddress2 = localStorage.getItem('zylo-c-address2') || '';
        initialReceiverPhone = localStorage.getItem('zylo-c-receiver-phone') || '';
        initialCity = localStorage.getItem('zylo-c-city') || 'Kathmandu';
        initialPay = localStorage.getItem('zylo-c-pay') || 'cod';
        const storedUser = localStorage.getItem('zylo_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          if (u && (u._id || u.id || u.email)) {
            initialUser = u;
            if (!initialAddress && (u.permanentAddress || u.address)) {
              initialAddress = u.permanentAddress || u.address;
            }
            if (!initialAddress2 && u.temporaryAddress) {
              initialAddress2 = u.temporaryAddress;
            }
            if (!initialReceiverPhone && u.receiverPhone) {
              initialReceiverPhone = u.receiverPhone;
            }
            if (!initialName && u.name) initialName = u.name;
            if (!initialPhone && u.phone) initialPhone = u.phone;
          }
        }
      } catch (e) { }
    }

    this.state = {
      catalog: initialCatalog,
      view: props.initialView || 'shop',
      accountTab: props.initialAccountTab || 'orders',
      userOrders: [],
      loadingOrders: false,
      profileName: initialUser?.name || '',
      profilePhone: initialUser?.phone || '',
      profileReceiverPhone: initialUser?.receiverPhone || initialReceiverPhone || '',
      profilePermanentAddress: initialUser?.permanentAddress || initialAddress || '',
      profileTemporaryAddress: initialUser?.temporaryAddress || initialAddress2 || '',
      cName: initialName,
      cPhone: initialPhone,
      cAddress: initialAddress,
      cAddress2: initialAddress2,
      cReceiverPhone: initialReceiverPhone,
      cCity: initialCity,
      savingProfile: false,
      accountDropdownOpen: false,
      cart: initialCart,
      wishlist: initialWishlist,
      pay: initialPay,
      orderId: null,
      orderTotal: 0,
      sel: initialSel,
      selImg: 0,
      selSize: initialSize,
      selColor: initialColor,
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
      filterCategory: props.initialFilterCategory || 'all',
      collectionsDropdownOpen: false,
      filterPriceBucket: 'all',
      filterMinPrice: '',
      filterMaxPrice: '',
      debouncedMinPrice: '',
      debouncedMaxPrice: '',
      filterBrands: [],
      filterColors: [],
      showMoreColors: false,
      sortBy: 'featured',
      showMobileFilters: false,
      mobileMenuOpen: false,
      landingScale: 1,
      currentUser: initialUser,
      showProfileModal: false,
      heroPreset: 'Arctic',
      showGoToTop: false,
      cmsConfig: typeof window !== 'undefined' ? loadHomepageConfig() : null,
      collectionsSlideIdx: 0
    };
  }

  isLoggedIn = () => {
    if (this.state.currentUser) return true;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('zylo_user');
        if (stored) {
          const u = JSON.parse(stored);
          if (u && (u._id || u.id || u.email)) return true;
        }
        const token = localStorage.getItem('zylo_access_token') || localStorage.getItem('zylo_admin_token');
        if (token) return true;
        if (document.cookie && (document.cookie.includes('zylo_access_token=') || document.cookie.includes('XSRF-TOKEN='))) {
          return true;
        }
      } catch (e) { }
    }
    return false;
  };

  getCatalog = () => {
    return this.state.catalog || buildFullCatalog();
  };

  goToView = (v, extraState = {}, updateUrl = true) => {
    const urlMap = {
      shop: '/',
      collections: '/shop',
      cart: '/cart',
      wishlist: '/wishlist',
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

    if (v === 'checkout') {
      let u = this.state.currentUser;
      if (!u && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('zylo_user');
          if (raw) u = JSON.parse(raw);
        } catch (e) { }
      }
      if (u) {
        const addr1 = this.state.profilePermanentAddress || u.permanentAddress || u.address || '';
        const addr2 = this.state.profileTemporaryAddress || u.temporaryAddress || '';
        const recPhone = this.state.profileReceiverPhone || u.receiverPhone || '';
        if (addr1) extraState.cAddress = addr1;
        if (addr2) extraState.cAddress2 = addr2;
        if (recPhone) extraState.cReceiverPhone = recPhone;
        if (!this.state.cName && u.name) {
          extraState.cName = u.name;
        }
        if (!this.state.cPhone && u.phone) {
          extraState.cPhone = u.phone;
        }
        if (!this.state.currentUser) {
          extraState.currentUser = u;
        }
      }
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
    const cat = this.getCatalog();
    const p = cat[i];
    const { sizes = [], colours = [] } = p ? getProductCardVariants(p) : {};
    const defaultSize = (sizes && sizes[0]) || 'M';
    const defaultColour = (colours && colours[0]?.name) || '';
    const { stock, isOutOfStock } = getVariantStock(p, defaultSize, defaultColour);
    this.goToView('detail', {
      sel: i,
      selImg: 0,
      selSize: defaultSize,
      selColor: defaultColour,
      selQty: isOutOfStock || stock <= 0 ? 1 : 1
    });
  };

  toggleMobileMenu = () => this.setState(s => ({ mobileMenuOpen: !s.mobileMenuOpen }));
  closeMobileMenu = () => this.setState({ mobileMenuOpen: false });

  componentDidMount() {
    const loadDynamicCatalog = async () => {
      try {
        const apiProds = await fetchProducts({ limit: 100 });
        if (Array.isArray(apiProds) && apiProds.length > 0) {
          const apiCatalog = apiProds.map((p, idx) => formatProductItem(p, idx));

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
              const targetProd = apiCatalog[foundIdx];
              const { sizes: tSizes, colours: tColours } = getProductCardVariants(targetProd);
              const validSize = (this.state.selSize && tSizes.includes(this.state.selSize)) ? this.state.selSize : (tSizes[0] || 'M');
              const validColor = (this.state.selColor && tColours.some(c => (c.name || '').toLowerCase() === (this.state.selColor || '').toLowerCase())) ? this.state.selColor : (tColours[0]?.name || '');
              this.setState({
                catalog: apiCatalog,
                sel: selIdx,
                view,
                selSize: validSize,
                selColor: validColor,
                selQty: 1
              });
              return;
            }
          }

          this.setState({ catalog: apiCatalog, sel: selIdx, view });
        }
        if (typeof window !== 'undefined') {
          this.setState({ cmsConfig: loadHomepageConfig() });
        }
      } catch (err) {
        console.warn('API fetchProducts notice:', err.message);
      }
    };
    loadDynamicCatalog();

    // Listen for live CMS changes from Admin Builder
    this._cmsUpdateHandler = (e) => {
      this.setState({ cmsConfig: e?.detail || loadHomepageConfig() });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('rmx-homepage-updated', this._cmsUpdateHandler);
    }

    this._cmsStorageHandler = (e) => {
      if (e.key === 'rmx-homepage-config') {
        this.setState({ cmsConfig: loadHomepageConfig() });
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this._cmsStorageHandler);
      const storedCart = loadStoredCart();
      if (Array.isArray(storedCart) && storedCart.length > 0) {
        this.setState({ cart: storedCart });
      }
    }

    // Collections Hero Carousel Auto-timer
    this._collectionsHeroInterval = setInterval(() => {
      const { cmsConfig, collectionsSlideIdx } = this.state;
      const heroSec = cmsConfig?.sections?.find(s => s.type === 'hero' && s.enabled !== false);
      const slides = heroSec?.config?.slides || [];
      if (slides.length > 1 && heroSec?.config?.autoplay !== false) {
        this.setState({ collectionsSlideIdx: (collectionsSlideIdx + 1) % slides.length });
      }
    }, 6000);

    const checkAuthSession = async () => {
      try {
        let user = this.state.currentUser;
        if (!user && typeof window !== 'undefined') {
          const stored = localStorage.getItem('zylo_user');
          if (stored) {
            try {
              user = JSON.parse(stored);
            } catch (e) { }
          }
        }
        if (user) {
          const defAddr = user.permanentAddress || user.address || '';
          const defAddr2 = user.temporaryAddress || '';
          const defReceiver = user.receiverPhone || '';
          this.setState({
            currentUser: user,
            profileName: user.name || '',
            profilePhone: user.phone || '',
            profileReceiverPhone: defReceiver || this.state.profileReceiverPhone || '',
            profilePermanentAddress: user.permanentAddress || '',
            profileTemporaryAddress: user.temporaryAddress || '',
            cName: user.name || this.state.cName || '',
            cPhone: user.phone || this.state.cPhone || '',
            cAddress: defAddr || this.state.cAddress || '',
            cAddress2: defAddr2 || this.state.cAddress2 || '',
            cReceiverPhone: defReceiver || this.state.cReceiverPhone || ''
          });
        }
        try {
          const meData = await api.get('/api/auth/me');
          if (meData?.data?.user) {
            user = meData.data.user;
            const defAddr = user.permanentAddress || user.address || '';
            const defAddr2 = user.temporaryAddress || '';
            const defReceiver = user.receiverPhone || '';
            this.setState({
              currentUser: user,
              profileName: user.name || '',
              profilePhone: user.phone || '',
              profileReceiverPhone: defReceiver || this.state.profileReceiverPhone || '',
              profilePermanentAddress: user.permanentAddress || '',
              profileTemporaryAddress: user.temporaryAddress || '',
              cName: user.name || this.state.cName || '',
              cPhone: user.phone || this.state.cPhone || '',
              cAddress: defAddr || this.state.cAddress || '',
              cAddress2: defAddr2 || this.state.cAddress2 || '',
              cReceiverPhone: defReceiver || this.state.cReceiverPhone || ''
            });
            if (typeof window !== 'undefined') {
              localStorage.setItem('zylo_user', JSON.stringify(user));
            }
          }
        } catch (meErr) { }

        if (user && (this.state.view === 'account' || this.props.initialView === 'account')) {
          this.loadUserOrders();
        }
      } catch (e) { }
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
      } else if (path === '/wishlist') {
        this.setState({ view: 'wishlist', mobileMenuOpen: false });
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

    // 50% Scroll Detection for "Go to Top" button
    this._onScroll = () => {
      if (typeof window === 'undefined') return;
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 150) {
        const progress = scrollY / docHeight;
        const shouldShow = progress >= 0.48; // 50% threshold
        if (shouldShow !== this.state.showGoToTop) {
          this.setState({ showGoToTop: shouldShow });
        }
      } else {
        if (this.state.showGoToTop) {
          this.setState({ showGoToTop: false });
        }
      }
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });
    this._onScroll();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateLandingScale);
    window.removeEventListener('popstate', this._popstateHandler);
    if (this._onScroll) {
      window.removeEventListener('scroll', this._onScroll);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('rmx-homepage-updated', this._cmsUpdateHandler);
      window.removeEventListener('storage', this._cmsStorageHandler);
    }
    clearInterval(this._collectionsHeroInterval);
    document.removeEventListener('click', this._click, true);
    clearInterval(this._logoT);
    clearTimeout(this._toastT);
  }

  scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
    const { sizes = [], colours = [] } = p ? getProductCardVariants(p) : {};
    const selIdx = this.state.sel;
    const selSize = (this.state.selSize && sizes.includes(this.state.selSize)) ? this.state.selSize : ((sizes && sizes[0]) || 'M');
    const rawColours = colours && colours.length ? colours : (p.colors || []).map(c => typeof c === 'string' ? { name: c } : c);
    const selColor = (this.state.selColor && rawColours.some(c => (c.name || '').toLowerCase() === this.state.selColor.toLowerCase()))
      ? this.state.selColor
      : ((rawColours && rawColours[0]?.name) || '');
    const selQty = Math.max(1, this.state.selQty || 1);

    // Check available stock
    const { stock: availableStock, isOutOfStock } = getVariantStock(p, selSize, selColor);
    if (isOutOfStock || availableStock <= 0) {
      this.showToast(`"${p?.name || 'This item'}" (${selSize}${selColor ? ' / ' + selColor : ''}) is currently out of stock.`);
      return;
    }

    const cart = [...this.state.cart];
    const i = cart.findIndex(l => l.idx === selIdx && l.size === selSize && (l.color || '') === (selColor || ''));
    const currentInCart = i >= 0 ? cart[i].qty : 0;

    if (currentInCart + selQty > availableStock) {
      const remainingAddable = availableStock - currentInCart;
      if (remainingAddable <= 0) {
        this.showToast(`Cannot add more. You already have all ${availableStock} available in your cart.`);
        return;
      }
      this.showToast(`Only ${availableStock} available. Adding ${remainingAddable} to cart.`);
      if (i >= 0) cart[i] = { ...cart[i], qty: availableStock };
      else cart.push({ idx: selIdx, size: selSize, color: selColor, qty: remainingAddable });
    } else {
      if (i >= 0) cart[i] = { ...cart[i], qty: cart[i].qty + selQty };
      else cart.push({ idx: selIdx, size: selSize, color: selColor, qty: selQty });
      if (!goCheckout) {
        this.showToast('Added ' + (p ? p.name : 'product') + ' to cart');
      }
    }

    saveStoredCart(cart);
    this.setState({ cart }, () => {
      if (goCheckout) {
        this.goToView('checkout');
      }
    });
  }

  bump(i, d) {
    const item = this.state.cart[i];
    if (!item) return;
    const cat = this.getCatalog();
    const p = cat[item.idx];
    const { stock: availableStock } = getVariantStock(p, item.size, item.color);

    if (d > 0 && item.qty + d > availableStock) {
      this.showToast(`Only ${availableStock} available for "${p?.name || 'this item'}" (${item.size}${item.color ? ' / ' + item.color : ''}).`);
      return;
    }

    const newCart = this.state.cart.map((l, j) => j === i ? { ...l, qty: l.qty + d } : l).filter(l => l.qty > 0);
    saveStoredCart(newCart);
    this.setState({ cart: newCart });
  }

  removeFromCart = (i) => {
    const cat = this.getCatalog();
    const item = this.state.cart[i];
    const p = item ? cat[item.idx] : null;
    const newCart = this.state.cart.filter((_, j) => j !== i);
    saveStoredCart(newCart);
    this.setState({ cart: newCart });
    this.showToast(`Removed "${p ? p.name : 'item'}" from cart`);
  };

  clearCart = () => {
    saveStoredCart([]);
    this.setState({ cart: [] });
    this.showToast('Cart cleared');
  };

  isWishlisted = (productOrSlug) => {
    if (!productOrSlug) return false;
    const { wishlist = [] } = this.state;
    const idOrSlug = typeof productOrSlug === 'string'
      ? productOrSlug
      : (productOrSlug.id || productOrSlug.slug || productOrSlug._id || productOrSlug.name);

    return wishlist.some(item => {
      if (typeof item === 'string') return item === idOrSlug;
      return (
        (item.id && item.id === idOrSlug) ||
        (item.slug && item.slug === idOrSlug) ||
        (item._id && item._id === idOrSlug) ||
        (item.name && productOrSlug.name && item.name === productOrSlug.name)
      );
    });
  };

  toggleWishlist = (p) => {
    if (!p) return;
    const { wishlist = [], currentUser } = this.state;
    const idOrSlug = typeof p === 'string' ? p : (p.id || p.slug || p._id || p.name);
    const exists = this.isWishlisted(p);

    let newWishlist;
    if (exists) {
      newWishlist = wishlist.filter(item => {
        if (typeof item === 'string') return item !== idOrSlug;
        return !(
          (item.id && item.id === idOrSlug) ||
          (item.slug && item.slug === idOrSlug) ||
          (item._id && item._id === idOrSlug) ||
          (item.name && p.name && item.name === p.name)
        );
      });
      this.showToast('Removed from wishlist');
    } else {
      const itemToAdd = typeof p === 'string'
        ? { id: p, slug: p, name: p, price: 0 }
        : {
          id: p.id || p._id || p.slug,
          slug: p.slug || slugForProduct(p, 0),
          name: p.name || 'Product',
          price: p.price || (p.basePrice ? Math.round(p.basePrice / 100) : 0),
          compare: p.compare || p.price || 0,
          brand: p.brand || 'Ramroxa',
          img1: p.img1 || (p.images && p.images[0]?.url) || '',
          tag: p.tag || '',
          colors: p.colors || []
        };
      newWishlist = [itemToAdd, ...wishlist];
      this.showToast(`Saved "${p.name || 'item'}" to your wishlist ❤️`);
    }

    saveStoredWishlist(newWishlist);
    this.setState({ wishlist: newWishlist });

    if (currentUser && typeof window !== 'undefined') {
      const targetId = typeof p === 'string' ? p : (p.id || p.slug || p._id);
      if (targetId) {
        api.post(`/wishlist/toggle/${targetId}`, {}).catch(() => { });
      }
    }
  };

  addToCartFromWishlist = (item) => {
    const cat = this.getCatalog();
    const foundIdx = cat.findIndex(p => (
      p.slug === item.slug || p.id === item.id || p.name === item.name
    ));
    const targetIdx = foundIdx >= 0 ? foundIdx : 0;
    const p = cat[targetIdx];
    const targetSize = item.size || 'M';
    const targetColor = item.color || '';

    const { stock: availableStock, isOutOfStock } = getVariantStock(p, targetSize, targetColor);
    if (isOutOfStock || availableStock <= 0) {
      this.showToast(`"${item.name || 'This product'}" is currently out of stock.`);
      return;
    }

    const cart = [...this.state.cart];
    const i = cart.findIndex(l => l.idx === targetIdx && l.size === targetSize && (l.color || '') === targetColor);
    const currentInCart = i >= 0 ? cart[i].qty : 0;
    if (currentInCart + 1 > availableStock) {
      this.showToast(`Only ${availableStock} available for "${item.name || 'this item'}".`);
      return;
    }

    if (i >= 0) cart[i] = { ...cart[i], qty: cart[i].qty + 1 };
    else cart.push({ idx: targetIdx, size: targetSize, color: targetColor, qty: 1 });

    saveStoredCart(cart);
    this.setState({ cart }, () => {
      this.showToast(`Added ${item.name || 'product'} to cart`);
    });
  };

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

    let user = this.state.currentUser;
    if (!user && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('zylo_user');
        if (stored) user = JSON.parse(stored);
      } catch (e) { }
    }
    const customerName = (this.state.cName || user?.name || '').trim();
    const customerPhone = (this.state.cPhone || user?.phone || '').trim();
    const customerAddress = (this.state.cAddress || user?.permanentAddress || user?.address || '').trim();
    const customerAddress2 = (this.state.cAddress2 || user?.temporaryAddress || '').trim();
    const customerReceiverPhone = (this.state.cReceiverPhone || user?.receiverPhone || '').trim();

    if (!customerName) {
      this.showToast('Please enter your Full Name.');
      return;
    }
    if (!customerPhone || customerPhone.length < 6) {
      this.showToast('Please enter your Phone Number.');
      return;
    }
    if (!customerAddress) {
      this.showToast('Please enter Address 1 (Delivery Address).');
      return;
    }

    // Persist customer inputs to localStorage before checking auth
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zylo-c-name', customerName);
        localStorage.setItem('zylo-c-phone', customerPhone);
        localStorage.setItem('zylo-c-address', customerAddress);
        localStorage.setItem('zylo-c-address2', customerAddress2);
        localStorage.setItem('zylo-c-receiver-phone', customerReceiverPhone);
        localStorage.setItem('zylo-c-pay', this.state.pay || 'cod');
        saveStoredCart(this.state.cart);
      } catch (e) { }
    }

    const isUserLoggedIn = this.isLoggedIn() || (user && (user._id || user.id || user.email));

    // If user is guest / not logged in -> redirect to login/signup page
    if (!isUserLoggedIn) {
      this.showToast('Please sign in or create an account to complete your order.');
      if (typeof window !== 'undefined') {
        window.location.href = '/login?redirect=/checkout';
      }
      return;
    }

    const cat = this.getCatalog();

    // Verify stock availability for all cart items before placing order
    for (const l of this.state.cart) {
      const p = cat[l.idx] || {};
      const { stock: availableStock, isOutOfStock } = getVariantStock(p, l.size, l.color);
      if (isOutOfStock || availableStock <= 0) {
        this.showToast(`Sorry, "${p.name || 'Item'}" (${l.size}${l.color ? ' / ' + l.color : ''}) is out of stock.`);
        return;
      }
      if (l.qty > availableStock) {
        this.showToast(`Sorry, only ${availableStock} available for "${p.name || 'Item'}" (${l.size}${l.color ? ' / ' + l.color : ''}). Please adjust your cart.`);
        return;
      }
    }

    const cartItems = this.state.cart.map(l => {
      const p = cat[l.idx] || {};
      const { variant: matchedVar } = getVariantStock(p, l.size, l.color);
      const itemImg = l.img || l.image || p.img1 || (p.images && (p.images.find(img => img.isFeatured)?.url || p.images[0]?.url || (typeof p.images[0] === 'string' ? p.images[0] : null))) || '';
      return {
        productId: p.id || ('prod_' + l.idx),
        variantId: matchedVar?.id || p.variants?.[0]?.id || p.id || ('v_' + l.idx),
        name: p.name || 'Product',
        size: l.size || 'M',
        color: l.color || '',
        colour: l.color || '',
        qty: l.qty || 1,
        unitPrice: (p.price || 0) * 100,
        image: itemImg
      };
    });

    let createdOrder = null;
    try {
      const res = await placeOrderApi({
        items: cartItems,
        shippingAddress: {
          fullName: customerName,
          phone: customerPhone,
          receiverPhone: customerReceiverPhone,
          receiverNumber: customerReceiverPhone,
          line1: customerAddress,
          line2: customerAddress2,
          city: (customerAddress.includes(',') ? customerAddress.split(',').pop()?.trim() : '') || customerAddress || 'Kathmandu'
        },
        paymentMethod: (this.state.pay || 'cod').toLowerCase(),
        guestEmail: user?.email || this.state.currentUser?.email || undefined,
        guestPhone: customerPhone
      });
      createdOrder = res?.data?.order || res?.order || res;
    } catch (e) {
      console.warn('Order dispatch notice:', e);
      const errMsg = e.response?.data?.message || e.message || 'Failed to place order';
      this.showToast(errMsg);
      return;
    }

    const serverOrderNo = createdOrder?.orderNo || ('ZY-' + Math.floor(100000 + Math.random() * 900000));

    // Refresh dynamic catalog in background to reflect deducted stock
    fetchProducts({ limit: 100 }).then(apiProds => {
      if (Array.isArray(apiProds) && apiProds.length > 0) {
        const apiCatalog = apiProds.map((prod, idx) => formatProductItem(prod, idx));
        this.setState({ catalog: apiCatalog });
      }
    }).catch(() => { });

    // Refresh user orders in state
    await this.loadUserOrders();

    // Clear cart in local storage and state
    saveStoredCart([]);
    this.setState({
      cart: [],
      orderId: serverOrderNo,
      orderTotal: total,
      placedOrder: createdOrder
    });

    this.goToView('confirmed');
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
      const permanentAddr = this.state.profilePermanentAddress || '';
      const temporaryAddr = this.state.profileTemporaryAddress || '';
      const receiverPhone = this.state.profileReceiverPhone || '';
      const res = await api.put('/api/auth/me', {
        name: this.state.profileName,
        phone: this.state.profilePhone,
        receiverPhone,
        address: permanentAddr || temporaryAddr,
        permanentAddress: permanentAddr,
        temporaryAddress: temporaryAddr
      });
      if (res?.data?.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('zylo_user', JSON.stringify(res.data.user));
          if (permanentAddr) localStorage.setItem('zylo-c-address', permanentAddr);
          if (temporaryAddr) localStorage.setItem('zylo-c-address2', temporaryAddr);
          if (receiverPhone) localStorage.setItem('zylo-c-receiver-phone', receiverPhone);
        }
        this.setState({
          currentUser: res.data.user,
          toast: 'Profile and addresses updated successfully!',
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
    } catch (e) { }
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

  handleAccountEnter = () => {
    if (this._accountTimeout) clearTimeout(this._accountTimeout);
    this.setState({ accountDropdownOpen: true });
  };

  handleAccountLeave = () => {
    if (this._accountTimeout) clearTimeout(this._accountTimeout);
    this._accountTimeout = setTimeout(() => {
      this.setState({ accountDropdownOpen: false });
    }, 250);
  };

  handleCollectionsEnter = () => {
    if (this._colTimeout) clearTimeout(this._colTimeout);
    this.setState({ collectionsDropdownOpen: true });
  };

  handleCollectionsLeave = () => {
    if (this._colTimeout) clearTimeout(this._colTimeout);
    this._colTimeout = setTimeout(() => {
      this.setState({ collectionsDropdownOpen: false });
    }, 250);
  };

  header() {
    const { view, cart, wishlist = [], mobileMenuOpen, currentUser } = this.state;
    const totalItems = cart.reduce((t, l) => t + l.qty, 0);
    const totalWishlist = wishlist.length;
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
              <div onClick={this.nav('shop')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}><img src="/assets/ramroxa-logo.png" alt="Ramroxa" style={{ height: 22, filter: 'brightness(0) invert(1)' }} /></div>
              <div className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28, marginLeft: 8 }}>
                {link('HOME', view === 'shop', this.nav('shop'))}

                {/* Collections & Categories Hover Dropdown */}
                <div
                  className="zylo-nav-dropdown-wrapper"
                  onMouseEnter={this.handleCollectionsEnter}
                  onMouseLeave={this.handleCollectionsLeave}
                >
                  <button
                    onClick={() => this.goToView('collections', { colFilter: 'all', filterCategory: 'all', collectionsDropdownOpen: false })}
                    className="zylo-nav-dropdown-trigger"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '8px 0',
                      fontSize: 13,
                      letterSpacing: 1,
                      color: view === 'collections' ? '#fff' : '#a1a1a1',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: 'inherit'
                    }}
                  >
                    <span>COLLECTIONS</span>
                    <svg width="9" height="5" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s ease', transform: this.state.collectionsDropdownOpen ? 'rotate(180deg)' : 'none' }}>
                      <path d="M1 1L5 5L9 1" />
                    </svg>
                  </button>

                  {/* Mega Dropdown Menu */}
                  <div className={`zylo-categories-dropdown ${this.state.collectionsDropdownOpen ? 'open' : ''}`}>
                    <div className="zylo-categories-dropdown-inner">
                      <div className="zylo-categories-dropdown-cols">
                        {/* Column 1: Categories */}
                        <div className="zylo-cat-col">
                          <h4 className="zylo-cat-col-title">By Category</h4>
                          <ul className="zylo-cat-list">
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { filterCategory: 'all', colFilter: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">All Products</span>
                                  <span className="zylo-cat-sub">Complete catalog ({this.getCatalog().length} items)</span>
                                </div>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { filterCategory: 'c_tops', colFilter: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Tops &amp; Tees</span>
                                  <span className="zylo-cat-sub">T-shirts, hoodies, knit shirts, sweaters</span>
                                </div>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { filterCategory: 'c_bottoms', colFilter: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Bottoms &amp; Denim</span>
                                  <span className="zylo-cat-sub">Trousers, cargos, selvedge denim, shorts</span>
                                </div>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { filterCategory: 'c_out', colFilter: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Outerwear &amp; Jackets</span>
                                  <span className="zylo-cat-sub">Windbreakers, trench coats, bombers</span>
                                </div>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { filterCategory: 'c_bags', colFilter: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Bags &amp; Slings</span>
                                  <span className="zylo-cat-sub">Tactical crossbody, heavy canvas totes</span>
                                </div>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { filterCategory: 'c_acc', colFilter: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Accessories &amp; Headwear</span>
                                  <span className="zylo-cat-sub">Merino beanies, taslan caps, hats</span>
                                </div>
                              </button>
                            </li>
                          </ul>
                        </div>

                        {/* Column 2: By Gender / Collection */}
                        <div className="zylo-cat-col">
                          <h4 className="zylo-cat-col-title">By Collection</h4>
                          <ul className="zylo-cat-list">
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { colFilter: 'men', filterCategory: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Men's Collection</span>
                                  <span className="zylo-cat-sub">Tailored cuts &amp; everyday staples</span>
                                </div>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { colFilter: 'women', filterCategory: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Women's Collection</span>
                                  <span className="zylo-cat-sub">Modern silhouettes &amp; layered sets</span>
                                </div>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { colFilter: 'kids', filterCategory: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Kids' Collection</span>
                                  <span className="zylo-cat-sub">Overalls, vests, and minis</span>
                                </div>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { colFilter: 'unisex', filterCategory: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Unisex Core</span>
                                  <span className="zylo-cat-sub">Universal luxury streetwear cuts</span>
                                </div>
                              </button>
                            </li>
                          </ul>
                        </div>

                        {/* Column 3: Curations & Special Drops */}
                        <div className="zylo-cat-col zylo-cat-col-featured">
                          <h4 className="zylo-cat-col-title">Curated Drops</h4>
                          <ul className="zylo-cat-list">
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { sortBy: 'bestselling', filterCategory: 'all', colFilter: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Best Sellers</span>
                                  <span className="zylo-cat-sub">Top rated customer favorites</span>
                                </div>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { sortBy: 'newest', filterCategory: 'all', colFilter: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">New Arrivals</span>
                                  <span className="zylo-cat-sub">Latest season drops &amp; additions</span>
                                </div>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => this.goToView('collections', { sortBy: 'featured', filterCategory: 'all', colFilter: 'all', collectionsDropdownOpen: false })}
                                className="zylo-cat-item-btn"
                              >
                                <div>
                                  <span className="zylo-cat-name">Featured Drops</span>
                                  <span className="zylo-cat-sub">Hand-picked spotlight styles</span>
                                </div>
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {link('CONTACT', view === 'contact', this.nav('contact'))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Amazon-style Account & Lists Button with Flyout Dropdown */}
              <div
                className="zylo-nav-account-wrapper"
                onMouseEnter={this.handleAccountEnter}
                onMouseLeave={this.handleAccountLeave}
              >
                {/* Account Trigger Button */}
                <button
                  type="button"
                  onClick={() => this.setState(s => ({ accountDropdownOpen: !s.accountDropdownOpen }))}
                  className="zylo-nav-cart-btn"
                  title="Account & Lists"
                  aria-label="Account & Lists"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.57757 15.4816C5.1628 16.324 1.45336 18.0441 3.71266 20.1966C4.81631 21.248 6.04549 22 7.59087 22H16.4091C17.9545 22 19.1837 21.248 20.2873 20.1966C22.5466 18.0441 18.8372 16.324 17.4224 15.4816C14.1048 13.5061 9.89519 13.5061 6.57757 15.4816Z" />
                    <path d="M16.5 6.5C16.5 8.98528 14.4853 11 12 11C9.51472 11 7.5 8.98528 7.5 6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5Z" />
                  </svg>
                </button>

                {/* Mobile Backdrop */}
                {this.state.accountDropdownOpen && (
                  <div
                    className="zylo-account-backdrop open"
                    onClick={() => this.setState({ accountDropdownOpen: false })}
                  />
                )}

                {/* Flyout Panel / Right Drawer */}
                <div className={`zylo-account-flyout ${this.state.accountDropdownOpen ? 'open' : ''}`}>
                  <div className="zylo-account-flyout-inner">
                    <div className="zylo-flyout-mobile-header">
                      <span className="zylo-flyout-mobile-title">Account &amp; Lists</span>
                      <button
                        type="button"
                        className="zylo-flyout-close-btn"
                        onClick={() => this.setState({ accountDropdownOpen: false })}
                        aria-label="Close"
                      >
                        &times;
                      </button>
                    </div>

                    {currentUser ? (
                      <div className="zylo-flyout-auth-header logged-in">
                        <div className="zylo-flyout-user-info">
                          <span className="zylo-flyout-greeting">Hello,</span>
                          <span className="zylo-flyout-username">{currentUser.name}</span>
                          {currentUser.email && <span className="zylo-flyout-email">{currentUser.email}</span>}
                        </div>
                        <button
                          type="button"
                          className="zylo-flyout-profile-btn"
                          onClick={() => this.goToView('account', { accountTab: 'profile', accountDropdownOpen: false })}
                        >
                          Profile
                        </button>
                      </div>
                    ) : (
                      <div className="zylo-flyout-signin-row">
                        <a href="/login" className="zylo-flyout-signin-btn" onClick={() => this.setState({ accountDropdownOpen: false })}>
                          Sign in
                        </a>
                        <p className="zylo-flyout-new-cust">
                          New customer? <a href="/signup" onClick={() => this.setState({ accountDropdownOpen: false })}>Start here.</a>
                        </p>
                      </div>
                    )}

                    <div className="zylo-flyout-divider" />

                    <div className="zylo-flyout-columns">
                      {/* Left Column: Your Lists */}
                      <div className="zylo-flyout-col">
                        <h4 className="zylo-flyout-col-title">Your Lists</h4>
                        <ul className="zylo-flyout-list">
                          <li>
                            <button onClick={() => { this.goToView('wishlist'); this.setState({ accountDropdownOpen: false }); }}>
                              My Wishlist ({totalWishlist})
                            </button>
                          </li>
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

              {/* Wishlist Header Button */}
              <button
                onClick={this.nav('wishlist')}
                className="zylo-nav-cart-btn"
                title="Wishlist"
                style={{ padding: '0 8px' }}
              >
                <div className="zylo-nav-cart-icon-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {totalWishlist > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -8,
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '10px',
                        fontWeight: 800,
                        borderRadius: 999,
                        minWidth: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 3px',
                        lineHeight: 1
                      }}
                    >
                      {totalWishlist}
                    </span>
                  )}
                </div>
              </button>

              {/* Cart Button */}
              <button
                onClick={this.nav('cart')}
                className="zylo-nav-cart-btn"
                title="Shopping Cart"
              >
                <div className="zylo-nav-cart-icon-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.32352 13.0113C3.6739 10.009 4.18586 7.75784 4.66063 6.15851C5.04994 4.84711 5.24459 4.19141 6.04283 3.5957C6.84107 3 7.65697 3 9.28876 3H14.7113C16.3431 3 17.159 3 17.9572 3.5957C18.7554 4.19141 18.9501 4.84711 19.3394 6.15851C19.8142 7.75784 20.3261 10.009 20.6765 13.0113C21.0895 16.5497 21.2959 18.3189 20.1027 19.6594C18.9095 21 16.9758 21 13.1084 21H10.8916C7.02422 21 5.09052 21 3.89731 19.6594C2.70411 18.3189 2.91058 16.5497 3.32352 13.0113Z" />
                    <path d="M9 7C9 8.65685 10.3431 10 12 10C13.6569 10 15 8.65685 15 7" />
                  </svg>
                  {totalItems > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -8,
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '10px',
                        fontWeight: 800,
                        borderRadius: 999,
                        minWidth: 16,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 3px',
                        lineHeight: 1
                      }}
                    >
                      {totalItems}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid #222', paddingBottom: 16 }}>
            <img src="/assets/ramroxa-logo.png" alt="Ramroxa" style={{ height: 20, filter: 'brightness(0) invert(1)' }} />
            <button onClick={this.closeMobileMenu} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', padding: 8 }}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <button className="mobile-nav-link" onClick={this.nav('shop')}>HOME</button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="mobile-nav-link" onClick={this.nav('collections', 'all')}>COLLECTIONS (ALL)</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 14, borderLeft: '1px solid #333', marginLeft: 4, marginTop: 4 }}>
                <button className="mobile-nav-sub-link" onClick={() => this.goToView('collections', { filterCategory: 'c_tops', colFilter: 'all', mobileMenuOpen: false })}>Tops &amp; Tees</button>
                <button className="mobile-nav-sub-link" onClick={() => this.goToView('collections', { filterCategory: 'c_bottoms', colFilter: 'all', mobileMenuOpen: false })}>Bottoms &amp; Denim</button>
                <button className="mobile-nav-sub-link" onClick={() => this.goToView('collections', { filterCategory: 'c_out', colFilter: 'all', mobileMenuOpen: false })}>Outerwear &amp; Jackets</button>
                <button className="mobile-nav-sub-link" onClick={() => this.goToView('collections', { filterCategory: 'c_bags', colFilter: 'all', mobileMenuOpen: false })}>Bags &amp; Slings</button>
                <button className="mobile-nav-sub-link" onClick={() => this.goToView('collections', { filterCategory: 'c_acc', colFilter: 'all', mobileMenuOpen: false })}>Accessories &amp; Headwear</button>
              </div>
            </div>

            <button className="mobile-nav-link" onClick={this.nav('wishlist')}>WISHLIST ({totalWishlist})</button>
            <button className="mobile-nav-link" onClick={this.nav('cart')}>CART ({totalItems})</button>
            <button className="mobile-nav-link" onClick={this.nav('contact')}>CONTACT US</button>
          </div>

          <div style={{ marginTop: 24, borderTop: '1px solid #222', paddingTop: 16 }}>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' }}>ACCOUNT &amp; LISTS</div>
            {currentUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#aaa', marginBottom: 4 }}>
                  Signed in as <strong style={{ color: '#fff' }}>{currentUser.name}</strong>
                </div>
                <button
                  className="mobile-nav-sub-link"
                  onClick={() => this.goToView('account', { accountTab: 'profile', mobileMenuOpen: false })}
                  style={{ textAlign: 'left', width: '100%', fontSize: 13 }}
                >
                  👤 Account Profile
                </button>
                <button
                  className="mobile-nav-sub-link"
                  onClick={() => this.goToView('account', { accountTab: 'orders', mobileMenuOpen: false })}
                  style={{ textAlign: 'left', width: '100%', fontSize: 13 }}
                >
                  📦 Orders &amp; Purchases
                </button>
                <button
                  className="mobile-nav-sub-link"
                  onClick={() => this.goToView('account', { accountTab: 'addresses', mobileMenuOpen: false })}
                  style={{ textAlign: 'left', width: '100%', fontSize: 13 }}
                >
                  📍 Saved Addresses
                </button>
                <button
                  className="mobile-nav-sub-link"
                  onClick={() => {
                    this.handleLogout();
                    this.closeMobileMenu();
                  }}
                  style={{ textAlign: 'left', width: '100%', color: '#ef4444', fontSize: 13, marginTop: 4 }}
                >
                  ↪ Sign Out
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <a
                    href="/login"
                    onClick={this.closeMobileMenu}
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
                    onClick={this.closeMobileMenu}
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
              <img src="/assets/ramroxa-logo.png" alt="Ramroxa" style={{ height: 24, filter: 'brightness(0) invert(1)', marginBottom: 12 }} />
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
            <span>&copy; {new Date().getFullYear()} Ramroxa Pvt. Ltd. All rights reserved.</span>
            <span>Thamel, Kathmandu &middot; PAN: 601234567</span>
          </div>
          <div style={{ width: '100%', overflow: 'hidden', textAlign: 'center', marginTop: 32, opacity: 0.16, pointerEvents: 'none', userSelect: 'none' }}>
            <span style={{ fontFamily: "'Geist', sans-serif", fontSize: 'clamp(44px, 11vw, 150px)', fontWeight: 700, letterSpacing: 'clamp(4px, 1vw, 10px)', color: '#ffffff', lineHeight: 0.85, display: 'block' }}>
              RAMROXA
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
      filterCategory = 'all',
      filterPriceBucket,
      filterMinPrice,
      filterMaxPrice,
      debouncedMinPrice,
      debouncedMaxPrice,
      filterBrands,
      filterColors,
      sortBy,
      showMobileFilters,
      showMoreColors
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

    // 3b. Dynamic Category Counts
    const categoryCounts = {
      all: catList.length,
      c_tops: catList.filter(p => {
        const catId = (p.categoryId || p.category || '').toLowerCase();
        return catId === 'c_tops' || catId.includes('top') || (p.tags || []).some(t => ['tee', 'tshirt', 'hoodie', 'shirt', 'sweater', 'crewneck', 'fleece'].includes(t.toLowerCase()));
      }).length,
      c_bottoms: catList.filter(p => {
        const catId = (p.categoryId || p.category || '').toLowerCase();
        return catId === 'c_bottoms' || catId.includes('bot') || (p.tags || []).some(t => ['trousers', 'cargo', 'denim', 'jeans', 'shorts', 'overalls', 'leggings', 'pants'].includes(t.toLowerCase()));
      }).length,
      c_out: catList.filter(p => {
        const catId = (p.categoryId || p.category || '').toLowerCase();
        return catId === 'c_out' || catId.includes('out') || (p.tags || []).some(t => ['jacket', 'bomber', 'trench', 'windbreaker', 'coat', 'outerwear', 'vest'].includes(t.toLowerCase()));
      }).length,
      c_bags: catList.filter(p => {
        const catId = (p.categoryId || p.category || '').toLowerCase();
        return catId === 'c_bags' || catId.includes('bag') || (p.tags || []).some(t => ['bag', 'crossbody', 'sling', 'tote', 'backpack'].includes(t.toLowerCase()));
      }).length,
      c_acc: catList.filter(p => {
        const catId = (p.categoryId || p.category || '').toLowerCase();
        return catId === 'c_acc' || catId.includes('acc') || (p.tags || []).some(t => ['cap', 'hat', 'beanie', 'belt', 'accessories'].includes(t.toLowerCase()));
      }).length,
    };

    // 4. Filter Items
    let items = catList.filter(p => {
      // Category Filter
      if (filterCategory && filterCategory !== 'all') {
        const catId = (p.categoryId || p.category || '').toLowerCase();
        const catMatch = catId === filterCategory.toLowerCase() ||
          (filterCategory === 'c_tops' && (catId.includes('top') || (p.tags || []).some(t => ['tee', 'tshirt', 'hoodie', 'shirt', 'sweater', 'crewneck', 'fleece'].includes(t.toLowerCase())))) ||
          (filterCategory === 'c_bottoms' && (catId.includes('bot') || (p.tags || []).some(t => ['trousers', 'cargo', 'denim', 'jeans', 'shorts', 'overalls', 'leggings', 'pants'].includes(t.toLowerCase())))) ||
          (filterCategory === 'c_out' && (catId.includes('out') || (p.tags || []).some(t => ['jacket', 'bomber', 'trench', 'windbreaker', 'coat', 'outerwear', 'vest'].includes(t.toLowerCase())))) ||
          (filterCategory === 'c_bags' && (catId.includes('bag') || (p.tags || []).some(t => ['bag', 'crossbody', 'sling', 'tote', 'backpack'].includes(t.toLowerCase())))) ||
          (filterCategory === 'c_acc' && (catId.includes('acc') || (p.tags || []).some(t => ['cap', 'hat', 'beanie', 'belt', 'accessories'].includes(t.toLowerCase()))));
        if (!catMatch) return false;
      }

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
      (filterCategory && filterCategory !== 'all') ||
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
                filterCategory: 'all',
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

        {/* 0. Category Filter */}
        <div className="zylo-filter-section">
          <h4 className="zylo-filter-section-title">Category</h4>
          <div className="zylo-filter-options-list">
            {[
              { id: 'all', label: 'All Categories', count: categoryCounts.all },
              { id: 'c_tops', label: 'Tops & Tees', count: categoryCounts.c_tops },
              { id: 'c_bottoms', label: 'Bottoms & Denim', count: categoryCounts.c_bottoms },
              { id: 'c_out', label: 'Outerwear & Jackets', count: categoryCounts.c_out },
              { id: 'c_bags', label: 'Bags & Slings', count: categoryCounts.c_bags },
              { id: 'c_acc', label: 'Accessories & Headwear', count: categoryCounts.c_acc }
            ].map(({ id, label, count }) => (
              <label key={id} className={`zylo-filter-option-row ${filterCategory === id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="sidebarCategoryFilter"
                  checked={filterCategory === id}
                  onChange={() => this.setState({ filterCategory: id })}
                  className="zylo-filter-radio"
                />
                <span className="zylo-filter-option-name">{label}</span>
                <span className="zylo-filter-option-count">({count})</span>
              </label>
            ))}
          </div>
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
              {(showMoreColors ? allColors : allColors.slice(0, 10)).map(colName => {
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
            {allColors.length > 10 && (
              <button
                type="button"
                onClick={() => this.setState(s => ({ showMoreColors: !s.showMoreColors }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#09090b',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px 0 2px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'inherit',
                  textDecoration: 'underline'
                }}
              >
                {showMoreColors ? 'Show less −' : `Show more (+${allColors.length - 10}) +`}
              </button>
            )}
          </div>
        )}
      </div>
    );

    return (
      <div style={{ background: '#fff', width: '100%', margin: '0 auto', minHeight: 'calc(100vh - 60px)', boxSizing: 'border-box', padding: 0 }}>
        {/* Single Collections Hero Banner */}
        {(() => {
          const { cmsConfig, collectionsSlideIdx = 0 } = this.state;
          const heroSec = (cmsConfig?.sections || []).find(s => s.type === 'hero' && s.enabled !== false)
            || (cmsConfig?.sections || []).find(s => s.type === 'hero')
            || {
            id: 'sec_hero_default',
            type: 'hero',
            config: {
              slides: [
                {
                  id: 'slide-1',
                  image: '/hero-slide-1.jpg',
                  eyebrow: 'Shop',
                  heading: 'Elevate your daily\nwardrobe with ease',
                  description: 'Explore our handpicked modern silhouettes crafted from sustainable fabrics.',
                  primaryCta: 'Explore styles',
                  primaryCtaUrl: '/shop',
                  secondaryCta: 'About us',
                  secondaryCtaUrl: '/contact'
                }
              ]
            }
          };

          const rawSlides = (heroSec?.config?.slides && heroSec.config.slides.length > 0)
            ? heroSec.config.slides
            : [
              {
                id: 'slide-1',
                image: '/hero-slide-1.jpg',
                eyebrow: 'Shop',
                heading: 'Elevate your daily\nwardrobe with ease',
                description: 'Explore our handpicked modern silhouettes crafted from sustainable fabrics.',
                primaryCta: 'Explore styles',
                primaryCtaUrl: '/shop',
                secondaryCta: 'About us',
                secondaryCtaUrl: '/contact'
              }
            ];

          const activeSlides = rawSlides.filter(s => s.active !== false);
          const slidesToUse = activeSlides.length > 0 ? activeSlides : rawSlides;
          const currentSlideIdx = collectionsSlideIdx % slidesToUse.length;
          const currentSlide = slidesToUse[currentSlideIdx] || slidesToUse[0];

          const bannerImg = formatBannerUrl(currentSlide?.image || currentSlide?.url);
          const bannerEyebrow = currentSlide?.eyebrow || 'Shop';
          const bannerHeading = currentSlide?.heading || 'Elevate your daily\nwardrobe with ease';
          const bannerDesc = currentSlide?.description || 'Explore our handpicked modern silhouettes crafted from sustainable fabrics.';
          const bannerPrimaryCta = currentSlide?.primaryCta || 'Explore styles';
          const bannerPrimaryCtaUrl = currentSlide?.primaryCtaUrl || '';
          const bannerSecondaryCta = currentSlide?.secondaryCta || 'About us';
          const bannerSecondaryCtaUrl = currentSlide?.secondaryCtaUrl || '/contact';

          return (
            <div className="zylo-collections-hero-fullwidth">
              <section
                className="zylo-collections-hero"
                style={{
                  backgroundImage: `url('${bannerImg}')`,
                  backgroundPosition: 'center 30%',
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: '#111',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
                <div style={{ position: 'relative', textAlign: 'center', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 580, margin: '0 auto', padding: '0 16px', zIndex: 2 }}>
                  {bannerEyebrow && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, background: '#fff', color: '#000', borderRadius: 999, padding: '4px 12px' }}>{bannerEyebrow}</span>
                      <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '4px 12px' }}>The new season</span>
                    </div>
                  )}
                  <h1 className="zylo-hero-title">{bannerHeading}</h1>
                  {bannerDesc && <p className="zylo-hero-sub">{bannerDesc}</p>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {bannerPrimaryCta && (
                      <button
                        onClick={() => {
                          if (bannerPrimaryCtaUrl && bannerPrimaryCtaUrl !== '/shop') {
                            this.goToView(bannerPrimaryCtaUrl.replace(/^\//, ''));
                          } else {
                            const el = document.getElementById('zylo-shop-main');
                            if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
                          }
                        }}
                        style={{ ...font, fontSize: 13, background: '#fff', color: '#000', border: 'none', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
                      >
                        {bannerPrimaryCta}
                      </button>
                    )}
                    {bannerSecondaryCta && (
                      <button
                        onClick={() => {
                          if (bannerSecondaryCtaUrl.startsWith('http')) {
                            window.open(bannerSecondaryCtaUrl, '_blank');
                          } else {
                            this.goToView(bannerSecondaryCtaUrl.replace(/^\//, '') || 'contact');
                          }
                        }}
                        style={{ ...font, fontSize: 13, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
                      >
                        {bannerSecondaryCta}
                      </button>
                    )}
                  </div>
                </div>

                {/* Hero Carousel Navigation if multiple slides */}
                {slidesToUse.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="rmx-hero-arrow prev"
                      onClick={() => this.setState({ collectionsSlideIdx: (collectionsSlideIdx - 1 + slidesToUse.length) % slidesToUse.length })}
                      aria-label="Previous Slide"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="rmx-hero-arrow next"
                      onClick={() => this.setState({ collectionsSlideIdx: (collectionsSlideIdx + 1) % slidesToUse.length })}
                      aria-label="Next Slide"
                    >
                      ›
                    </button>
                    <div className="rmx-hero-dots">
                      {slidesToUse.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          type="button"
                          className={`rmx-hero-dot ${dotIdx === currentSlideIdx ? 'active' : ''}`}
                          onClick={() => this.setState({ collectionsSlideIdx: dotIdx })}
                          aria-label={`Go to slide ${dotIdx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>
          );
        })()}

        {/* Collections Content Area */}
        <div className="zylo-collections-content">
          {/* Collections Toolbar: Results Title & Count on Left, Sort & Mobile Filters on Right */}
          <div id="zylo-shop-main" className="zylo-collections-toolbar">
            <div className="zylo-toolbar-left">
              <h2 className="zylo-toolbar-title">
                {(() => {
                  const catNames = {
                    c_tops: 'Tops & Tees',
                    c_bottoms: 'Bottoms & Denim',
                    c_out: 'Outerwear & Jackets',
                    c_bags: 'Bags & Slings',
                    c_acc: 'Accessories & Headwear'
                  };
                  const genNames = {
                    men: "Men's Collection",
                    women: "Women's Collection",
                    kids: "Kids' Collection",
                    unisex: "Unisex Core"
                  };
                  if (filterCategory && filterCategory !== 'all' && catNames[filterCategory]) {
                    if (colFilter && colFilter !== 'all' && genNames[colFilter]) {
                      return `${genNames[colFilter]} — ${catNames[filterCategory]}`;
                    }
                    return catNames[filterCategory];
                  }
                  if (colFilter && colFilter !== 'all' && genNames[colFilter]) {
                    return genNames[colFilter];
                  }
                  if (sortBy === 'bestselling') return 'Best Sellers';
                  if (sortBy === 'newest') return 'New Arrivals';
                  return 'All Products';
                })()}
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
                    const { sizes: pSizes, colours: pColours } = getProductCardVariants(p);
                    return (
                      <div key={p.idx} onClick={() => this.openProduct(p.idx)} className="zylo-product-card">
                        <div className="zylo-product-img-wrap" style={{ background: img(p.img1), backgroundColor: '#eee', position: 'relative' }}>
                          <span className={`zylo-product-tag-badge ${best ? 'best-seller' : 'new'}`}>
                            {best ? '★ Best seller' : (p.tag || '✦ New')}
                          </span>
                          <button
                            type="button"
                            className={`rmx-wishlist-heart-btn ${this.isWishlisted(p) ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              this.toggleWishlist(p);
                            }}
                            aria-label={this.isWishlisted(p) ? 'Remove from wishlist' : 'Add to wishlist'}
                            title={this.isWishlisted(p) ? 'Remove from wishlist' : 'Add to wishlist'}
                          >
                            <svg className="rmx-heart-svg" viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          </button>
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
                            </div>

                            {/* Size Information Row */}
                            {pSizes && pSizes.length > 0 && (
                              <div className="zylo-card-size-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717a', marginTop: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, color: '#18181b', letterSpacing: '0.4px' }}>Size:</span>
                                <span style={{ color: '#52525b', letterSpacing: '0.6px', fontWeight: 500 }}>{pSizes.join('  ')}</span>
                              </div>
                            )}

                            {/* Colour sub-variant swatches directly under size */}
                            {pColours && pColours.length > 0 && (
                              <div className="zylo-card-colour-block" style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#18181b', letterSpacing: '0.4px' }}>Colour:</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  {pColours.map((colItem) => (
                                    <span
                                      key={colItem.name}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (colItem.available !== false) {
                                          this.goToView('detail', { sel: p.idx, selImg: 0, selSize: pSizes[0] || 'M', selColor: colItem.name, selQty: 1 });
                                        } else {
                                          this.openProduct(p.idx);
                                        }
                                      }}
                                      title={colItem.available !== false ? colItem.name : `${colItem.name} (Unavailable)`}
                                      style={{
                                        width: '11px',
                                        height: '11px',
                                        borderRadius: '50%',
                                        backgroundColor: colItem.hex,
                                        display: 'inline-block',
                                        border: colItem.hex.toLowerCase() === '#ffffff' || colItem.hex.toLowerCase() === '#fff' ? '1px solid #d4d4d8' : '1px solid rgba(0,0,0,0.18)',
                                        cursor: colItem.available !== false ? 'pointer' : 'not-allowed',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                        transition: 'transform 0.15s ease',
                                        opacity: colItem.available !== false ? 1 : 0.35
                                      }}
                                      onMouseEnter={(e) => {
                                        if (colItem.available !== false) e.currentTarget.style.transform = 'scale(1.35)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
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
          className="zylo-detail-back-link"
        >
          &larr; Back to all products
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
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <button
                type="button"
                className={`rmx-wishlist-heart-btn ${this.isWishlisted(p) ? 'active' : ''}`}
                onClick={() => this.toggleWishlist(p)}
                aria-label={this.isWishlisted(p) ? 'Remove from wishlist' : 'Add to wishlist'}
                title={this.isWishlisted(p) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <svg className="rmx-heart-svg" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>
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
              <h2 style={{ margin: 0, fontSize: 34, fontWeight: 300, letterSpacing: 0.5, lineHeight: 1.2 }}>
                {p.name}
              </h2>
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

            {/* Size & Colour Selector and Inventory Stock Display */}
            {(() => {
              const { sizes: pSizes, colours: pColours } = getProductCardVariants(p);
              const availableSizes = pSizes && pSizes.length ? pSizes : ['S', 'M', 'L', 'XL'];
              const currentSize = (selSize && availableSizes.includes(selSize)) ? selSize : (availableSizes[0] || 'M');
              const rawColours = pColours && pColours.length ? pColours : (p.colors || []).map(c => typeof c === 'string' ? { name: c, hex: COLOR_HEX_MAP[c.toLowerCase()] || '#cccccc' } : c);
              const availableColours = rawColours.filter(Boolean);
              const currentColor = (this.state.selColor && availableColours.some(c => (c.name || '').toLowerCase() === this.state.selColor.toLowerCase()))
                ? this.state.selColor
                : (availableColours[0]?.name || '');

              const { stock: availableStock, isOutOfStock } = getVariantStock(p, currentSize, currentColor);
              const effectiveQty = isOutOfStock ? 0 : Math.min(selQty || 1, Math.max(1, availableStock));

              return (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, letterSpacing: 2, color: '#888' }}>SIZE</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {availableSizes.map(sz => {
                        const szStockInfo = getVariantStock(p, sz, currentColor);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => {
                              const newStock = getVariantStock(p, sz, currentColor);
                              this.setState(st => ({
                                selSize: sz,
                                selQty: newStock.isOutOfStock ? 1 : Math.min(st.selQty, Math.max(1, newStock.stock))
                              }));
                            }}
                            style={{
                              ...font,
                              fontSize: 14,
                              minWidth: 44,
                              height: 44,
                              padding: '0 12px',
                              borderRadius: 999,
                              cursor: 'pointer',
                              border: sz === currentSize ? '1.5px solid #000' : '1px solid #ccc',
                              background: sz === currentSize ? '#000' : '#fff',
                              color: sz === currentSize ? '#fff' : '#000',
                              transition: 'all 0.15s ease',
                              opacity: szStockInfo.isOutOfStock ? 0.45 : 1
                            }}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {availableColours.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 12, letterSpacing: 2, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>COLOUR</span>
                        {currentColor && <strong style={{ color: '#111', fontSize: 12, letterSpacing: 0.5 }}>({currentColor})</strong>}
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {availableColours.map(col => {
                          const isSel = (currentColor || '').toLowerCase() === (col.name || '').toLowerCase();
                          const hex = col.hex || COLOR_HEX_MAP[(col.name || '').toLowerCase()] || '#cccccc';
                          const colStockInfo = getVariantStock(p, currentSize, col.name);
                          return (
                            <button
                              key={col.name}
                              type="button"
                              onClick={() => {
                                const newStock = getVariantStock(p, currentSize, col.name);
                                this.setState(st => ({
                                  selColor: col.name,
                                  selQty: newStock.isOutOfStock ? 1 : Math.min(st.selQty, Math.max(1, newStock.stock))
                                }));
                              }}
                              title={`${col.name} (${colStockInfo.isOutOfStock ? 'Out of stock' : colStockInfo.stock + ' in stock'})`}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                backgroundColor: hex,
                                border: isSel ? '2.5px solid #000' : (hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff' ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.15)'),
                                outline: isSel ? '2px solid #000' : 'none',
                                outlineOffset: 2,
                                cursor: 'pointer',
                                padding: 0,
                                transition: 'all 0.15s ease',
                                opacity: colStockInfo.isOutOfStock ? 0.4 : 1
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Real-time Available Stock Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 6px' }}>
                    {isOutOfStock ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 6,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: 0.5
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626' }} />
                        Out of Stock
                      </span>
                    ) : availableStock <= 5 ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 6,
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        color: '#b45309',
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: 0.5
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706' }} />
                        Only {availableStock} available in stock!
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        borderRadius: 6,
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#15803d',
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: 0.5
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
                        In Stock ({availableStock} available)
                      </span>
                    )}
                  </div>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, letterSpacing: 2, color: '#888' }}>QUANTITY</div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: isOutOfStock ? '1.5px solid #ccc' : '1.5px solid #000',
                      borderRadius: 999,
                      width: 'fit-content',
                      opacity: isOutOfStock ? 0.5 : 1
                    }}>
                      <button
                        type="button"
                        disabled={isOutOfStock || selQty <= 1}
                        onClick={() => this.setState(st => ({ selQty: Math.max(1, st.selQty - 1) }))}
                        style={{
                          ...font,
                          fontSize: 18,
                          width: 40,
                          height: 40,
                          background: 'none',
                          border: 'none',
                          cursor: (isOutOfStock || selQty <= 1) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: (isOutOfStock || selQty <= 1) ? '#bbb' : '#000'
                        }}
                      >
                        −
                      </button>
                      <span style={{ minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: 500 }}>
                        {isOutOfStock ? 0 : (selQty > availableStock ? availableStock : selQty)}
                      </span>
                      <button
                        type="button"
                        disabled={isOutOfStock || selQty >= availableStock}
                        onClick={() => {
                          if (isOutOfStock || availableStock <= 0) {
                            this.showToast('This item is currently out of stock.');
                            return;
                          }
                          if (selQty >= availableStock) {
                            this.showToast(`Only ${availableStock} available.`);
                            return;
                          }
                          this.setState(st => ({ selQty: Math.min(availableStock, st.selQty + 1) }));
                        }}
                        style={{
                          ...font,
                          fontSize: 18,
                          width: 40,
                          height: 40,
                          background: 'none',
                          border: 'none',
                          cursor: (isOutOfStock || selQty >= availableStock) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: (isOutOfStock || selQty >= availableStock) ? '#bbb' : '#000'
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="zylo-detail-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={isOutOfStock || availableStock <= 0}
                      onClick={() => this.addLine(false)}
                      style={{
                        ...pillBtn(true),
                        flex: 2,
                        minWidth: 160,
                        padding: '14px 16px',
                        fontSize: 14,
                        textAlign: 'center',
                        background: isOutOfStock ? '#e5e7eb' : '#000',
                        color: isOutOfStock ? '#9ca3af' : '#fff',
                        borderColor: isOutOfStock ? '#e5e7eb' : '#000',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isOutOfStock ? 'Out of Stock' : `Add to cart — ${rs(p.price * Math.max(1, effectiveQty))}`}
                    </button>
                    <button
                      type="button"
                      disabled={isOutOfStock || availableStock <= 0}
                      onClick={() => this.addLine(true)}
                      style={{
                        ...pillBtn(false),
                        flex: 1,
                        minWidth: 100,
                        padding: '14px 16px',
                        fontSize: 14,
                        textAlign: 'center',
                        background: isOutOfStock ? '#f3f4f6' : '#fff',
                        color: isOutOfStock ? '#9ca3af' : '#000',
                        borderColor: isOutOfStock ? '#e5e7eb' : '#000',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isOutOfStock ? 'Unavailable' : 'Buy now'}
                    </button>
                    <button
                      type="button"
                      onClick={() => this.toggleWishlist(p)}
                      className={`zylo-detail-wishlist-btn ${this.isWishlisted(p) ? 'active' : ''}`}
                      title={this.isWishlisted(p) ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <svg className="rmx-heart-svg" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </button>
                  </div>
                </>
              );
            })()}

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

  renderWishlist() {
    const { wishlist = [] } = this.state;
    const cat = this.getCatalog();

    return (
      <div style={{ width: '100%', maxWidth: 1188, margin: '0 auto', padding: '48px 24px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: 2, background: '#000', color: '#fff', padding: '4px 12px', borderRadius: 999, display: 'inline-block', marginBottom: 12 }}>
              SAVED ITEMS &amp; FAVORITES
            </span>
            <h2 style={{ fontSize: 40, margin: '0 0 8px', fontWeight: 300, letterSpacing: 1 }}>YOUR WISHLIST</h2>
            <p style={{ color: '#666', fontSize: 15, margin: 0 }}>
              {wishlist.length === 0
                ? 'Keep track of pieces you love across our collections.'
                : `You have ${wishlist.length} saved ${wishlist.length === 1 ? 'item' : 'items'} in your wishlist.`}
            </p>
          </div>
          {wishlist.length > 0 && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  wishlist.forEach(item => this.addToCartFromWishlist(item));
                  this.showToast('All items added to cart!');
                }}
                style={{ ...pillBtn(true), fontSize: 13, padding: '10px 22px' }}
              >
                ADD ALL TO CART
              </button>
              <button
                type="button"
                onClick={() => {
                  saveStoredWishlist([]);
                  this.setState({ wishlist: [] });
                  this.showToast('Wishlist cleared');
                }}
                style={{ ...pillBtn(false), fontSize: 13, padding: '10px 20px', color: '#888' }}
              >
                CLEAR ALL
              </button>
            </div>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fff', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 500, margin: '0 0 10px' }}>Your Wishlist Is Empty</h2>
            <p style={{ color: '#666', fontSize: 14.5, maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Explore our drops and tap the heart icon on any garment to save your favorite fits right here.
            </p>
            <button
              type="button"
              onClick={() => this.goToView('collections', { colFilter: 'all' })}
              style={{ ...pillBtn(true), fontSize: 14, padding: '12px 32px' }}
            >
              EXPLORE COLLECTION &rarr;
            </button>
          </div>
        ) : (
          <div className="zylo-products-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '28px 20px' }}>
            {wishlist.map((item, idx) => {
              const fullProd = cat.find(p => p.slug === item.slug || p.id === item.id || p.name === item.name) || item;
              const imgSrc = item.img1 || fullProd.img1 || '';
              const priceNpr = item.price || fullProd.price || 0;
              const compare = item.compare || fullProd.compare || priceNpr;

              return (
                <div key={item.id || item.slug || idx} className="zylo-product-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div
                    className="zylo-product-img-wrap"
                    style={{ background: img(imgSrc), backgroundColor: '#eee', cursor: 'pointer', position: 'relative' }}
                    onClick={() => {
                      const catIdx = cat.findIndex(p => p.slug === item.slug || p.id === item.id || p.name === item.name);
                      if (catIdx >= 0) this.openProduct(catIdx);
                      else this.goToView('collections');
                    }}
                  >
                    <button
                      type="button"
                      className="rmx-wishlist-heart-btn active"
                      onClick={(e) => {
                        e.stopPropagation();
                        this.toggleWishlist(item);
                      }}
                      title="Remove from wishlist"
                      aria-label="Remove from wishlist"
                    >
                      <svg className="rmx-heart-svg" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </button>
                  </div>
                  <div className="zylo-product-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div className="zylo-product-card-info">
                      <span className="zylo-product-brand-tag">{item.brand || fullProd.brand || 'Ramroxa'}</span>
                      <span
                        className="zylo-product-name"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const catIdx = cat.findIndex(p => p.slug === item.slug || p.id === item.id || p.name === item.name);
                          if (catIdx >= 0) this.openProduct(catIdx);
                        }}
                      >
                        {item.name}
                      </span>
                      <div className="zylo-product-price-row">
                        <div className="zylo-product-prices">
                          <span className="zylo-product-price">{rs(priceNpr)}</span>
                          {compare > priceNpr && <span className="zylo-product-compare">{rs(compare)}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button
                        type="button"
                        onClick={() => this.addToCartFromWishlist(item)}
                        style={{ ...pillBtn(true), flex: 1, fontSize: 12, padding: '9px 12px', textAlign: 'center' }}
                      >
                        Add to Cart
                      </button>
                      <button
                        type="button"
                        onClick={() => this.toggleWishlist(item)}
                        style={{ ...pillBtn(false), fontSize: 12, padding: '9px 12px', color: '#dc2626', borderColor: '#fca5a5' }}
                        title="Remove item"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  renderCart() {
    const { cart } = this.state;
    const { subtotal, delivery, total } = this.totals();
    const cat = this.getCatalog();
    const totalCount = cart.reduce((t, l) => t + l.qty, 0);

    if (!cart.length) {
      return (
        <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fafafa', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 12 }}>YOUR CART IS EMPTY</h2>
          <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>Explore our latest collection of garments built for longevity.</p>
          <button onClick={() => this.goToView('collections', { colFilter: 'all' })} style={{ ...pillBtn(true), padding: '12px 32px' }}>SHOP NOW</button>
        </div>
      );
    }

    return (
      <div className="zylo-cart-page" style={{ width: '100%', maxWidth: 1188, margin: '0 auto', padding: '48px 24px', boxSizing: 'border-box' }}>
        <div className="zylo-cart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 36, fontWeight: 300, margin: '0 0 6px', letterSpacing: 0.5 }}>SHOPPING CART</h2>
            <span style={{ color: '#666', fontSize: 14 }}>{totalCount} {totalCount === 1 ? 'item' : 'items'} in your bag</span>
          </div>
          <button
            type="button"
            onClick={this.clearCart}
            style={{ ...pillBtn(false), fontSize: 12.5, padding: '8px 16px', color: '#888', borderColor: '#ddd' }}
            title="Remove all items from cart"
          >
            Clear Cart
          </button>
        </div>

        <div className="zylo-cart-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 40, alignItems: 'start' }}>
          <div>
            {cart.map((l, i) => {
              const p = cat[l.idx] || { name: 'Item', price: 0, img1: '', brand: 'Ramroxa' };
              const lineTotal = (p.price || 0) * (l.qty || 1);

              return (
                <div key={i} className="zylo-cart-item-row">
                  {/* Product Thumbnail */}
                  <div
                    className="zylo-cart-item-img"
                    style={{ backgroundImage: `url('${p.img1 || (p.images && p.images[0]?.url) || ''}')` }}
                    onClick={() => this.openProduct(l.idx)}
                    title="View product details"
                  />

                  {/* Product Details */}
                  <div className="zylo-cart-item-info">
                    <span className="zylo-cart-item-brand">{p.brand || 'Ramroxa'}</span>
                    <a
                      className="zylo-cart-item-title"
                      onClick={() => this.openProduct(l.idx)}
                    >
                      {p.name}
                    </a>
                    <div className="zylo-cart-item-meta">
                      <span className="zylo-cart-item-size-badge">Size: {l.size}{l.color ? ` / Colour: ${l.color}` : ''}</span>
                      <span className="zylo-cart-item-price">{rs(p.price)}</span>
                      {l.qty > 1 && (
                        <span style={{ fontSize: 12, color: '#888' }}>
                          ({rs(lineTotal)} total)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stepper and Remove Action */}
                  <div className="zylo-cart-item-actions">
                    <div className="zylo-cart-stepper">
                      <button
                        type="button"
                        onClick={() => this.bump(i, -1)}
                        className="zylo-cart-stepper-btn"
                        title="Decrease quantity"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="zylo-cart-stepper-qty">{l.qty}</span>
                      <button
                        type="button"
                        onClick={() => this.bump(i, 1)}
                        className="zylo-cart-stepper-btn"
                        title="Increase quantity"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    {/* Dedicated Remove Button */}
                    <button
                      type="button"
                      onClick={() => this.removeFromCart(i)}
                      className="zylo-cart-remove-btn"
                      title={`Remove ${p.name} from cart`}
                      aria-label={`Remove ${p.name} from cart`}
                    >
                      <svg className="zylo-cart-remove-icon" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="zylo-cart-summary" style={{ background: '#f5f5f5', padding: 28, borderRadius: 16, border: '1px solid #eaeaea', position: 'sticky', top: 80 }}>
            <h3 style={{ fontSize: 18, margin: '0 0 18px', fontWeight: 600, letterSpacing: 0.5 }}>ORDER SUMMARY</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
              <span style={{ color: '#555' }}>Subtotal ({totalCount} items)</span>
              <span style={{ fontWeight: 600 }}>{rs(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14 }}>
              <span style={{ color: '#555' }}>Delivery</span>
              <span style={{ color: delivery === 0 ? '#10b981' : '#111', fontWeight: 600 }}>
                {delivery === 0 ? 'FREE' : rs(delivery)}
              </span>
            </div>
            {subtotal < FREE_OVER && (
              <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12.5, color: '#666' }}>
                Add <strong>{rs(FREE_OVER - subtotal)}</strong> more to unlock <strong>FREE Delivery</strong> across Nepal!
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: 16, marginBottom: 24, fontSize: 18, fontWeight: 700 }}>
              <span>Estimated Total</span>
              <span>{rs(total)}</span>
            </div>
            <button
              type="button"
              onClick={() => this.goToView('checkout')}
              style={{ ...pillBtn(true), width: '100%', textAlign: 'center', padding: '16px 20px', fontSize: 14, fontWeight: 700 }}
            >
              PROCEED TO CHECKOUT &rarr;
            </button>
            <div style={{ marginTop: 20, borderTop: '1px solid #e5e5e5', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#777' }}>
              <span>✓ Pay via Cash on Delivery, eSewa, or Fonepay</span>
              <span>✓ 100% genuine guaranteed garments</span>
              <span>✓ Delivery in 2–4 business days</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderCheckout() {
    const { cart, pay, cName, cPhone, cAddress, cAddress2, cReceiverPhone, currentUser, profilePermanentAddress, profileTemporaryAddress, profileReceiverPhone } = this.state;
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
      <div className="zylo-checkout-page" style={{ width: '100%', maxWidth: 1188, margin: '0 auto', padding: '48px 24px', boxSizing: 'border-box' }}>
        <h2 className="zylo-checkout-title" style={{ fontSize: 36, fontWeight: 300, marginBottom: 32 }}>CHECKOUT</h2>
        <div className="zylo-checkout-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40, alignItems: 'start' }}>
          {/* Left: Customer & Shipping Details */}
          <div className="zylo-checkout-form">
            <div style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 24, marginBottom: 24, background: '#fff' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, letterSpacing: 0.5 }}>1. SHIPPING & CONTACT</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6, fontWeight: 600 }}>FULL NAME *</label>
                  <input
                    value={cName}
                    onChange={e => {
                      this.setState({ cName: e.target.value });
                      if (typeof window !== 'undefined') localStorage.setItem('zylo-c-name', e.target.value);
                    }}
                    placeholder="e.g. Aarav Sharma"
                    style={{ ...input, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6, fontWeight: 600 }}>PHONE NUMBER (PRIMARY) *</label>
                  <input
                    value={cPhone}
                    onChange={e => {
                      this.setState({ cPhone: e.target.value });
                      if (typeof window !== 'undefined') localStorage.setItem('zylo-c-phone', e.target.value);
                    }}
                    placeholder="e.g. 9801234567"
                    style={{ ...input, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6, fontWeight: 600 }}>ADDRESS 1 (PERMANENT / PRIMARY ADDRESS) *</label>
                  {(() => {
                    const defaultSavedAddr = profilePermanentAddress || currentUser?.permanentAddress || currentUser?.address || '';
                    const activeAddress = cAddress || defaultSavedAddr || '';
                    return (
                      <input
                        value={activeAddress}
                        onChange={e => {
                          this.setState({ cAddress: e.target.value });
                          if (typeof window !== 'undefined') localStorage.setItem('zylo-c-address', e.target.value);
                        }}
                        placeholder="e.g. Ward 4, Baluwatar, Kathmandu (Street / House No.)"
                        style={{ ...input, width: '100%', height: 44 }}
                      />
                    );
                  })()}
                </div>
                <div>
                  <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6, fontWeight: 600 }}>ADDRESS 2 (TEMPORARY / DELIVERY / LANDMARK) (OPTIONAL)</label>
                  {(() => {
                    const defaultSavedAddr2 = profileTemporaryAddress || currentUser?.temporaryAddress || '';
                    const activeAddress2 = cAddress2 || defaultSavedAddr2 || '';
                    return (
                      <input
                        value={activeAddress2}
                        onChange={e => {
                          this.setState({ cAddress2: e.target.value });
                          if (typeof window !== 'undefined') localStorage.setItem('zylo-c-address2', e.target.value);
                        }}
                        placeholder="e.g. Apartment 3B, Opposite City Center, Thamel"
                        style={{ ...input, width: '100%', height: 44 }}
                      />
                    );
                  })()}
                </div>
                <div>
                  <label style={{ fontSize: 12, letterSpacing: 1.5, display: 'block', marginBottom: 6, fontWeight: 600 }}>RECEIVER NUMBER (OPTIONAL / ALTERNATE CONTACT)</label>
                  {(() => {
                    const defaultReceiver = profileReceiverPhone || currentUser?.receiverPhone || '';
                    const activeReceiver = cReceiverPhone || defaultReceiver || '';
                    return (
                      <input
                        value={activeReceiver}
                        onChange={e => {
                          this.setState({ cReceiverPhone: e.target.value });
                          if (typeof window !== 'undefined') localStorage.setItem('zylo-c-receiver-phone', e.target.value);
                        }}
                        placeholder="e.g. 9841234567 (Alternate receiver contact for delivery)"
                        style={{ ...input, width: '100%', height: 44 }}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 24, background: '#fff' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, letterSpacing: 0.5 }}>2. PAYMENT METHOD</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { id: 'cod', title: 'Cash on Delivery', desc: 'Pay with cash upon package delivery' },
                  { id: 'esewa', title: 'eSewa Mobile Wallet', desc: 'Instant online payment via eSewa Nepal' },
                  { id: 'fonepay', title: 'Fonepay QR / Direct Banking', desc: 'Scan and pay using any Nepali banking app' }
                ].map(method => (
                  <label
                    key={method.id}
                    onClick={() => {
                      this.setState({ pay: method.id });
                      if (typeof window !== 'undefined') localStorage.setItem('zylo-c-pay', method.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 8,
                      border: `1px solid ${pay === method.id ? '#000' : '#e0e0e0'}`,
                      background: pay === method.id ? '#fcfcfc' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="checkout-payment"
                      checked={pay === method.id}
                      onChange={() => {
                        this.setState({ pay: method.id });
                        if (typeof window !== 'undefined') localStorage.setItem('zylo-c-pay', method.id);
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{method.title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{method.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order Items & Pricing Summary */}
          <div className="zylo-checkout-summary" style={{ background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 16, padding: 28, position: 'sticky', top: 80 }}>
            <h3 style={{ fontSize: 18, margin: '0 0 20px', fontWeight: 600 }}>ORDER REVIEW</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, maxHeight: 320, overflowY: 'auto' }}>
              {cart.map((it, idx) => {
                const p = cat[it.idx] || {};
                const itemImg = it.img || it.image || p.img1 || p.img || (p.images && (p.images.find(img => img.isFeatured)?.url || p.images[0]?.url || (typeof p.images[0] === 'string' ? p.images[0] : null))) || '/assets/ea97fe30fd8d1dfc.q.jpg';
                return (
                  <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
                    <div style={{ width: 44, height: 54, borderRadius: 6, overflow: 'hidden', background: '#eee', flexShrink: 0 }}>
                      <img src={itemImg} alt={p.name || 'Garment'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#111' }}>{p.name || 'Garment'}</div>
                      <div style={{ fontSize: 11.5, color: '#666' }}>Size: {it.size}{it.color ? ` • ${it.color}` : ''} • Qty: {it.qty}</div>
                    </div>
                    <div style={{ fontWeight: 600, color: '#111' }}>
                      {rs((p.price || 0) * (it.qty || 1))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Subtotal</span>
                <span>{rs(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Delivery</span>
                <span>{delivery === 0 ? <strong style={{ color: '#10b981' }}>FREE</strong> : rs(delivery)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', paddingTop: 12, marginTop: 6, fontSize: 18, fontWeight: 700 }}>
                <span>Total</span>
                <span>{rs(total)}</span>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                type="button"
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
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 12 }}>
              Secure checkout &bull; Instant order confirmation
            </p>
          </div>
        </div>
      </div>
    );
  }

  renderConfirmed() {
    const { orderId, orderTotal, placedOrder } = this.state;
    return (
      <div style={{ maxWidth: 640, margin: '60px auto 100px auto', textAlign: 'center', padding: '0 24px' }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#10b981',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          margin: '0 auto 20px auto',
          boxShadow: '0 8px 24px rgba(16,185,129,0.25)'
        }}>
          ✓
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 10px', letterSpacing: 0.5 }}>ORDER CONFIRMED!</h2>
        <p style={{ color: '#666', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
          Thank you for your order. Your order reference is <strong style={{ color: '#000' }}>#{orderId || 'ZY-104928'}</strong>.
        </p>

        <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', padding: 24, borderRadius: 14, marginBottom: 28, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: 14, marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', letterSpacing: 0.5 }}>CURRENT STATUS</span>
              <span style={{ fontSize: 12, fontWeight: 700, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', padding: '3px 10px', borderRadius: 999, display: 'inline-block', marginTop: 4 }}>
                PENDING FULFILLMENT
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', letterSpacing: 0.5 }}>TOTAL PAID / DUE</span>
              <strong style={{ fontSize: 18, color: '#000' }}>{rs(orderTotal || 3800)}</strong>
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
            Our Kathmandu logistics team has received your order and is preparing fulfillment. You can track live status updates marked by our team directly in your account.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', maxWidth: 360, margin: '0 auto' }}>
          <button
            onClick={() => this.goToView('account', { accountTab: 'orders' })}
            style={{
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '14px 28px',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1.5,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)'
            }}
          >
            VIEW IN ORDER HISTORY &rarr;
          </button>
          <button
            onClick={() => this.goToView('shop')}
            style={{
              background: '#fff',
              color: '#000',
              border: '1px solid #000',
              borderRadius: 8,
              padding: '14px 28px',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1.5,
              cursor: 'pointer'
            }}
          >
            CONTINUE SHOPPING
          </button>
        </div>
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
        q: 'What is Ramroxa?',
        a: 'Ramroxa is a contemporary streetwear and lifestyle label based in Kathmandu, Nepal. We craft premium heavyweight t-shirts, relaxed bottoms, hoodies, and everyday essentials focusing on structured cuts, durable craft, and sustainable textile sourcing.'
      },
      {
        q: 'How long does delivery take across Nepal?',
        a: 'Orders inside Kathmandu Valley are typically delivered within 24 to 48 hours. Orders for other major cities and districts across Nepal are dispatched via express courier network and arrive in 2 to 4 business days.'
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We provide full payment flexibility: Cash on Delivery (COD) across all major cities and districts in Nepal, as well as instant and secure digital payments via eSewa and Fonepay QR.'
      },
      {
        q: 'What is your return & exchange policy?',
        a: 'We offer an easy 7-day exchange window for all unwashed, unworn garments with original tags attached. Simply submit an inquiry with your Order ID or connect with our support team on WhatsApp to initiate an exchange.'
      },
      {
        q: 'How do I choose the right size and fit?',
        a: 'Each product page includes detailed size specifications and model dimensions. Our silhouettes generally feature relaxed and modern boxy cuts. If you are between sizes or need tailored styling advice, our team is always here to assist.'
      },
      {
        q: 'Can I visit your physical showroom in Kathmandu?',
        a: 'Yes! Our flagship showroom in Thamel, Kathmandu (near Garden of Dreams) is open 7 days a week from 10:00 AM to 8:00 PM for in-person fittings, fabric previews, and direct order pickups.'
      },
      {
        q: 'Do you accept corporate or custom bulk orders?',
        a: 'Yes, we collaborate with creative studios, events, companies, and bulk buyers across Nepal. Select "Wholesale & custom" in our inquiry form or contact us directly on WhatsApp for custom catalog pricing.'
      }
    ];

    return (
      <div style={{ width: '100%', maxWidth: 1188, margin: '0 auto', padding: '48px 24px', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: 36 }}>
          <span style={{ fontSize: 11, letterSpacing: 2, background: '#000', color: '#fff', padding: '4px 12px', borderRadius: 999, display: 'inline-block', marginBottom: 12 }}>
            CUSTOMER SUPPORT & INQUIRIES
          </span>
          <h2 style={{ fontSize: 40, margin: '0 0 10px', fontWeight: 300, letterSpacing: 1 }}>CONTACT RAMROXA</h2>
          <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
            Have questions about an existing order, sizing guidance, custom orders, or wholesale? Our Kathmandu team is here to assist you.
          </p>
        </div>

        <div className="resp-contact-grid" id="contactFormSection">
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
                      id="contactNameInput"
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

        {/* FAQs Section (Modern 2-Column Split Layout) */}
        <div className="contact-faq-wrapper" id="faqSection">
          <div className="contact-faq-layout">
            {/* Left Column: Heading & Callout Card */}
            <div className="faq-left-col">
              <div className="faq-badge">
                <span className="faq-badge-icon">?</span>
                <span>FAQS</span>
              </div>
              <h2 className="faq-title">
                Frequently asked<br />
                <span className="faq-title-highlight">questions.</span>
              </h2>
              <p className="faq-desc">
                Get clear answers about sizing, express delivery across Nepal, payment methods (COD, eSewa, Fonepay), exchanges, and order tracking.
              </p>

              <div className="faq-callout-card">
                <h3 className="faq-callout-title">Got questions? We've got answers.</h3>
                <p className="faq-callout-desc">
                  Whether you're exploring our collection, choosing the right size, or finding where to start, get clear answers to the questions that matter.
                </p>
                <button
                  type="button"
                  className="faq-ask-btn"
                  onClick={() => {
                    const formEl = document.getElementById('contactFormSection');
                    if (formEl) {
                      formEl.scrollIntoView({ behavior: 'smooth' });
                      setTimeout(() => {
                        const inputEl = document.getElementById('contactNameInput') || formEl.querySelector('input, textarea');
                        if (inputEl) inputEl.focus();
                      }, 400);
                    }
                  }}
                >
                  <span>Ask A Question</span>
                  <span className="faq-ask-icon">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            {/* Right Column: Accordion List */}
            <div className="faq-right-col">
              <div className="faq-accordion-list">
                {faqs.map((faq, idx) => {
                  const isOpen = activeFaq === idx;
                  return (
                    <div
                      key={idx}
                      className={`faq-accordion-item ${isOpen ? 'open' : ''}`}
                    >
                      <button
                        type="button"
                        className="faq-question-btn"
                        onClick={() => this.setState({ activeFaq: isOpen ? null : idx })}
                        aria-expanded={isOpen}
                      >
                        <span className="faq-question-text">{faq.q}</span>
                        <span className="faq-toggle-circle">
                          {isOpen ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          )}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="faq-answer-content">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderAccount = () => {
    const { currentUser, accountTab, userOrders, loadingOrders, savingProfile, profileName, profilePhone, profilePermanentAddress, profileTemporaryAddress, profileReceiverPhone } = this.state;

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
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 300, letterSpacing: 0.5, color: '#111' }}>
                  {currentUser.name}
                </h2>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {userOrders.map((ord) => {
                  const statusColors = {
                    delivered: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', label: 'DELIVERED', step: 5 },
                    shipped: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', label: 'SHIPPED / IN TRANSIT', step: 4 },
                    processing: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', label: 'PROCESSING', step: 3 },
                    confirmed: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe', label: 'ORDER CONFIRMED', step: 2 },
                    pending: { bg: '#fef9c3', text: '#854d0e', border: '#fde047', label: 'PENDING FULFILLMENT', step: 1 },
                    cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', label: 'CANCELLED', step: 0 },
                    returned: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', label: 'RETURNED', step: 0 }
                  };
                  const currentStatusKey = (ord.fulfillmentStatus || 'pending').toLowerCase();
                  const st = statusColors[currentStatusKey] || statusColors.pending;
                  const orderDate = ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
                  const totalNpr = ord.grandTotal != null ? Math.round(ord.grandTotal / 100) : (ord.total || 0);

                  const catalog = this.getCatalog();
                  const steps = [
                    { num: 1, label: 'Placed' },
                    { num: 2, label: 'Confirmed' },
                    { num: 3, label: 'Processing' },
                    { num: 4, label: 'Shipped' },
                    { num: 5, label: 'Delivered' }
                  ];

                  return (
                    <div key={ord._id || ord.orderNo} style={{
                      background: '#fff',
                      border: '1px solid #e5e5e5',
                      borderRadius: 16,
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                    }}>
                      {/* Order Header */}
                      <div style={{
                        background: '#fafafa',
                        borderBottom: '1px solid #e5e5e5',
                        padding: '16px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', letterSpacing: 0.5 }}>ORDER REFERENCE</span>
                            <strong style={{ fontSize: 15, color: '#111' }}>#{ord.orderNo}</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', letterSpacing: 0.5 }}>PLACED ON</span>
                            <span style={{ fontSize: 13, color: '#333' }}>{orderDate}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', letterSpacing: 0.5 }}>PAYMENT</span>
                            <span style={{ fontSize: 13, color: '#333', textTransform: 'uppercase' }}>
                              {ord.paymentMethod || 'COD'} {ord.paymentStatus ? `(${ord.paymentStatus})` : ''}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{
                            background: st.bg,
                            color: st.text,
                            border: `1px solid ${st.border}`,
                            padding: '6px 14px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: 0.5
                          }}>
                            {st.label}
                          </span>
                        </div>
                      </div>

                      {/* Visual Order Progress Tracker */}
                      {st.step > 0 && (
                        <div style={{ background: '#fcfcfc', borderBottom: '1px solid #eee', padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                            <div style={{
                              position: 'absolute',
                              top: 14,
                              left: '8%',
                              right: '8%',
                              height: 3,
                              background: '#e5e7eb',
                              zIndex: 1
                            }}>
                              <div style={{
                                height: '100%',
                                background: '#111',
                                width: `${((Math.min(st.step, 5) - 1) / 4) * 100}%`,
                                transition: 'width 0.4s ease'
                              }} />
                            </div>

                            {steps.map((step) => {
                              const isCompleted = step.num < st.step;
                              const isCurrent = step.num === st.step;
                              return (
                                <div key={step.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                                  <div style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: isCurrent ? '#000' : (isCompleted ? '#10b981' : '#fff'),
                                    border: isCurrent ? '2px solid #000' : (isCompleted ? '2px solid #10b981' : '2px solid #d1d5db'),
                                    color: (isCurrent || isCompleted) ? '#fff' : '#6b7280',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    boxShadow: isCurrent ? '0 0 0 4px rgba(0,0,0,0.1)' : 'none'
                                  }}>
                                    {isCompleted ? '✓' : step.num}
                                  </div>
                                  <span style={{
                                    fontSize: 11.5,
                                    fontWeight: isCurrent ? 700 : (isCompleted ? 600 : 500),
                                    color: isCurrent ? '#000' : (isCompleted ? '#10b981' : '#888'),
                                    marginTop: 6
                                  }}>
                                    {step.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Order Items */}
                      <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                          {(ord.items || []).map((it, idx) => {
                            const catItem = catalog.find(p => p.id === it.productId || p.id === it.product || p.name?.toLowerCase() === it.name?.toLowerCase() || p.slug === it.productId) || {};
                            const unitPriceNpr = it.unitPrice != null ? Math.round(it.unitPrice / 100) : (it.price != null ? (it.price > 10000 ? Math.round(it.price / 100) : it.price) : (it.rate || 0));
                            const qty = it.qty || 1;
                            const itemImg = it.image || it.img || it.imageUrl || catItem.img1 || catItem.img || (catItem.images && (catItem.images.find(img => img.isFeatured)?.url || catItem.images[0]?.url || (typeof catItem.images[0] === 'string' ? catItem.images[0] : null))) || '/assets/ea97fe30fd8d1dfc.q.jpg';
                            const variantDetails = it.variantLabel || [it.size ? `Size: ${it.size}` : '', it.color || it.colour ? `Colour: ${it.color || it.colour}` : ''].filter(Boolean).join(' • ');

                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: idx < ord.items.length - 1 ? '1px solid #f0f0f0' : 'none', paddingBottom: idx < ord.items.length - 1 ? 16 : 0 }}>
                                <div style={{
                                  width: 58,
                                  height: 72,
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  background: '#f5f5f5',
                                  flexShrink: 0
                                }}>
                                  <img src={itemImg} alt={it.name || 'Item'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#111' }}>{it.name || 'Ramroxa Garment'}</h4>
                                  <div style={{ fontSize: 12.5, color: '#666', marginTop: 4 }}>
                                    {variantDetails ? `${variantDetails} • ` : ''}Qty: {qty}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <strong style={{ fontSize: 15, color: '#111' }}>{rs(unitPriceNpr * qty)}</strong>
                                  <div style={{ fontSize: 11.5, color: '#888', marginTop: 2 }}>{rs(unitPriceNpr)} each</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Order Address & Totals Footer */}
                        <div style={{
                          borderTop: '1px solid #eee',
                          paddingTop: 16,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          flexWrap: 'wrap',
                          gap: 16
                        }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', letterSpacing: 0.5 }}>DELIVERY ADDRESS</span>
                            <div style={{ fontSize: 13, color: '#222', marginTop: 3 }}>
                              <strong>{ord.shippingAddress?.fullName || currentUser.name}</strong> • {ord.shippingAddress?.phone || currentUser.phone}
                              {(ord.shippingAddress?.receiverPhone || ord.shippingAddress?.receiverNumber) && (
                                <span style={{ color: '#0284c7' }}> (Receiver: {ord.shippingAddress?.receiverPhone || ord.shippingAddress?.receiverNumber})</span>
                              )}
                            </div>
                            <div style={{ fontSize: 12.5, color: '#555', marginTop: 2 }}>
                              {(() => {
                                const sAddr = ord.shippingAddress;
                                if (!sAddr) return currentUser?.permanentAddress || currentUser?.temporaryAddress || currentUser?.address || 'Kathmandu, Nepal';
                                if (typeof sAddr === 'string') return sAddr;
                                const parts = [];
                                const l1 = (sAddr.line1 || sAddr.address1 || sAddr.street || '').trim();
                                const l2 = (sAddr.line2 || '').trim();
                                if (l1) parts.push(l1);
                                if (l2 && l2 !== l1) parts.push(l2);
                                if (!parts.length) {
                                  return sAddr.city || 'Kathmandu, Nepal';
                                }
                                return parts.join(', ');
                              })()}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', letterSpacing: 0.5 }}>TOTAL AMOUNT</span>
                              <span style={{ fontSize: 20, fontWeight: 800, color: '#000' }}>{rs(totalNpr)}</span>
                            </div>

                            <button
                              onClick={() => {
                                const newItems = (ord.items || []).map(i => {
                                  const catItem = catalog.find(p => p.id === i.productId || p.id === i.product || p.name?.toLowerCase() === i.name?.toLowerCase() || p.slug === i.productId) || {};
                                  const itemImg = i.image || i.img || i.imageUrl || catItem.img1 || catItem.img || (catItem.images && (catItem.images.find(img => img.isFeatured)?.url || catItem.images[0]?.url || (typeof catItem.images[0] === 'string' ? catItem.images[0] : null))) || '/assets/ea97fe30fd8d1dfc.q.jpg';
                                  return {
                                    id: i.productId || i.id,
                                    idx: 0,
                                    name: i.name,
                                    size: i.size || 'M',
                                    color: i.color || i.colour || '',
                                    price: i.unitPrice != null ? Math.round(i.unitPrice / 100) : (i.price != null ? (i.price > 10000 ? Math.round(i.price / 100) : i.price) : 0),
                                    qty: i.qty || 1,
                                    img: itemImg
                                  };
                                });
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
                                borderRadius: 8,
                                padding: '10px 18px',
                                fontSize: 12.5,
                                fontWeight: 700,
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
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111' }}>Saved Delivery Addresses & Contacts</h2>
              <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Keep your primary delivery addresses and contact numbers updated for rapid checkout.</p>
            </div>

            <form onSubmit={this.handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 540 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                  ADDRESS 1 (PERMANENT / PRIMARY ADDRESS)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ward 4, Baluwatar, Kathmandu (Street / House No.)"
                  value={profilePermanentAddress || ''}
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
                  ADDRESS 2 (TEMPORARY / DELIVERY / LANDMARK)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apartment 3B, Opposite City Center, Thamel"
                  value={profileTemporaryAddress || ''}
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

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, color: '#333' }}>
                  RECEIVER NUMBER (ALTERNATE DELIVERY CONTACT)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9841234567 (Secondary receiver contact number for delivery)"
                  value={profileReceiverPhone || ''}
                  onChange={(e) => this.setState({ profileReceiverPhone: e.target.value })}
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
            <RamroxaHomepage
              catalog={this.getCatalog()}
              onOpenProduct={this.openProduct}
              onNav={this.goToView}
              wishlist={this.state.wishlist}
              onToggleWishlist={this.toggleWishlist}
              isWishlisted={this.isWishlisted}
            />
          )}
          {view === 'collections' && this.renderCollections()}
          {view === 'detail' && this.renderDetail()}
          {view === 'wishlist' && this.renderWishlist()}
          {view === 'cart' && this.renderCart()}
          {view === 'checkout' && this.renderCheckout()}
          {view === 'confirmed' && this.renderConfirmed()}
          {view === 'contact' && this.renderContact()}
          {view === 'account' && this.renderAccount()}
        </main>
        {this.footer()}

        {/* 50% Scroll Go-To-Top Button */}
        <button
          type="button"
          onClick={this.scrollToTop}
          className={`rmx-go-to-top ${this.state.showGoToTop ? 'visible' : 'hidden'}`}
          aria-label="Back to top"
          title="Back to top"
        >
          <svg className="rmx-go-to-top-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          <span>Top</span>
        </button>
      </div>
    );
  }
}

