import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Product, Variant, Inventory, StockMove, Warehouse, Category, Order, User, Review } from '../models/index.js';
import logger from '../config/logger.js';
import { recalculateProductRating } from './review.service.js';

export const sampleProducts20 = [
  {
    id: 'prod_nomad_tee',
    name: 'Nomad Heavyweight Boxy Tee',
    slug: 'nomad-heavyweight-boxy-tee',
    sku: 'ZYL-TOP-00101',
    brand: 'Zylo Studios',
    categoryId: 'c_tops',
    status: 'published',
    gender: 'Men',
    season: 'SS26',
    tags: ['heavyweight', 'oversized', 'basics', 'cotton'],
    basePrice: 185000,
    price: 185000,
    mrp: 240000,
    cost: 85000,
    description: 'Constructed from 280 GSM combed organic cotton with dropped shoulders and a structured collar rib. Designed for a clean drape and enduring durability.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Charcoal', 'Vintage White'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80', alt: 'Nomad Heavyweight Boxy Tee Front', isFeatured: true },
      { url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80', alt: 'Nomad Heavyweight Boxy Tee Back', isFeatured: false }
    ]
  },
  {
    id: 'prod_kyoto_linen',
    name: 'Kyoto Relaxed Linen Camp Shirt',
    slug: 'kyoto-relaxed-linen-camp-shirt',
    sku: 'ZYL-TOP-00102',
    brand: 'Zylo Atelier',
    categoryId: 'c_tops',
    status: 'published',
    gender: 'Men',
    season: 'SS26',
    tags: ['linen', 'breathable', 'camp-collar', 'summer'],
    basePrice: 275000,
    price: 275000,
    mrp: 350000,
    cost: 120000,
    description: 'Woven from 100% French flax linen, featuring an open camp collar, genuine mother-of-pearl buttons, and a relaxed boxy silhouette.',
    labels: { featured: true, trending: false, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Olive', 'Sand'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80', alt: 'Kyoto Linen Camp Shirt Front', isFeatured: true },
      { url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80', alt: 'Kyoto Linen Camp Shirt Detail', isFeatured: false }
    ]
  },
  {
    id: 'prod_raw_edge_tee',
    name: 'Minimalist Raw Edge Cotton Tee',
    slug: 'minimalist-raw-edge-cotton-tee',
    sku: 'ZYL-TOP-00103',
    brand: 'Zylo Basics',
    categoryId: 'c_tops',
    status: 'published',
    gender: 'Women',
    season: 'SS26',
    tags: ['minimalist', 'raw-edge', 'tee', 'cotton'],
    basePrice: 145000,
    price: 145000,
    mrp: 195000,
    cost: 65000,
    description: 'Everyday crewneck tee crafted from lightweight Peruvian pima cotton with subtle raw edge cuffs and a relaxed streetwear fit.',
    labels: { featured: false, trending: true, newArrival: false, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Jet Black', 'Oatmeal'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80', alt: 'Minimalist Raw Edge Tee', isFeatured: true }
    ]
  },
  {
    id: 'prod_utility_overshirt',
    name: 'Technical Utility Pocket Overshirt',
    slug: 'technical-utility-pocket-overshirt',
    sku: 'ZYL-TOP-00104',
    brand: 'Zylo Techwear',
    categoryId: 'c_tops',
    status: 'published',
    gender: 'Men',
    season: 'AW25',
    tags: ['utility', 'overshirt', 'layering', 'cordura'],
    basePrice: 360000,
    price: 360000,
    mrp: 480000,
    cost: 160000,
    description: 'Heavyweight ripstop overshirt with dual 3D chest cargo pockets, snap button closures, and reinforced elbow patches for modular layering.',
    labels: { featured: true, trending: true, newArrival: false, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Sage', 'Shadow Gray'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=80', alt: 'Technical Utility Overshirt', isFeatured: true }
    ]
  },
  {
    id: 'prod_pleated_trousers',
    name: 'Pleated Wide-Leg Tailored Trousers',
    slug: 'pleated-wide-leg-tailored-trousers',
    sku: 'ZYL-BOT-00201',
    brand: 'Zylo Atelier',
    categoryId: 'c_bottoms',
    status: 'published',
    gender: 'Women',
    season: 'SS26',
    tags: ['pleated', 'tailored', 'trousers', 'wide-leg'],
    basePrice: 320000,
    price: 320000,
    mrp: 420000,
    cost: 140000,
    description: 'Double front pleats with a relaxed high-rise waist and generous wide-leg taper. Cut from a fluid wool-viscose blend that drapes with elegant motion.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Deep Navy', 'Charcoal'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&auto=format&fit=crop&q=80', alt: 'Pleated Wide Leg Trousers', isFeatured: true }
    ]
  },
  {
    id: 'prod_ripstop_cargo',
    name: 'Urban Ripstop Articulated Cargo',
    slug: 'urban-ripstop-articulated-cargo',
    sku: 'ZYL-BOT-00202',
    brand: 'Zylo Techwear',
    categoryId: 'c_bottoms',
    status: 'published',
    gender: 'Men',
    season: 'AW25',
    tags: ['cargo', 'ripstop', 'technical', 'pockets'],
    basePrice: 385000,
    price: 385000,
    mrp: 495000,
    cost: 175000,
    description: 'Weather-resistant cotton ripstop pants with ergonomic articulated knees, cinchable ankle cords, and 6 secure magnetic pocket compartments.',
    labels: { featured: false, trending: true, newArrival: false, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Olive Drab', 'Black'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80', alt: 'Urban Ripstop Cargo', isFeatured: true }
    ]
  },
  {
    id: 'prod_french_terry_sweats',
    name: 'Relaxed French Terry Sweatpants',
    slug: 'relaxed-french-terry-sweatpants',
    sku: 'ZYL-BOT-00203',
    brand: 'Zylo Basics',
    categoryId: 'c_kids',
    status: 'published',
    gender: 'Kids',
    season: 'SS26',
    tags: ['loungewear', 'sweatpants', 'cotton', 'kids'],
    basePrice: 240000,
    price: 240000,
    mrp: 310000,
    cost: 105000,
    description: '400 GSM loopback cotton terry with an elasticated waistband, braided tonal drawstrings, and deep side welt pockets for kids active play.',
    labels: { featured: false, trending: false, newArrival: true, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Heather Gray', 'Washed Black'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&auto=format&fit=crop&q=80', alt: 'Relaxed French Terry Sweatpants', isFeatured: true }
    ]
  },
  {
    id: 'prod_selvedge_denim',
    name: 'Japanese Selvedge Straight Denim',
    slug: 'japanese-selvedge-straight-denim',
    sku: 'ZYL-BOT-00204',
    brand: 'Zylo Denim Co.',
    categoryId: 'c_bottoms',
    status: 'published',
    gender: 'Men',
    season: 'All-Season',
    tags: ['denim', 'selvedge', 'japan', 'vintage'],
    basePrice: 450000,
    price: 450000,
    mrp: 580000,
    cost: 210000,
    description: '14oz Kurabo Japanese red-line selvedge denim. Button-fly closure, copper hardware, and a timeless straight-leg cut that breaks in uniquely to the wearer.',
    labels: { featured: true, trending: false, newArrival: false, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Raw Indigo', 'Stone Washed'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop&q=80', alt: 'Japanese Selvedge Denim', isFeatured: true }
    ]
  },
  {
    id: 'prod_double_knee_pant',
    name: 'Heavy Double-Knee Workwear Pant',
    slug: 'heavy-double-knee-workwear-pant',
    sku: 'ZYL-BOT-00205',
    brand: 'Zylo Techwear',
    categoryId: 'c_bottoms',
    status: 'published',
    gender: 'Men',
    season: 'AW25',
    tags: ['workwear', 'double-knee', 'canvas', 'rugged'],
    basePrice: 375000,
    price: 375000,
    mrp: 480000,
    cost: 165000,
    description: 'Durable 12oz duck canvas with reinforced double knee panels, rivet reinforcements, and a utility hammer loop designed to withstand daily wear.',
    labels: { featured: false, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Desert Khaki', 'Washed Charcoal'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&auto=format&fit=crop&q=80', alt: 'Double Knee Workwear Pant', isFeatured: true }
    ]
  },
  {
    id: 'prod_city_trench',
    name: 'Structured City Trench Coat',
    slug: 'structured-city-trench-coat',
    sku: 'ZYL-OUT-00301',
    brand: 'Zylo Atelier',
    categoryId: 'c_outerwear',
    status: 'published',
    gender: 'Women',
    season: 'AW25',
    tags: ['trench', 'coat', 'outerwear', 'waterproof'],
    basePrice: 780000,
    price: 780000,
    mrp: 990000,
    cost: 340000,
    description: 'A modern reimagining of the classic trench coat in water-repellent gabardine twill with broad lapels, storm flap, and a detachable waist tie belt.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Camel Tan', 'Matte Black'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=800&auto=format&fit=crop&q=80', alt: 'Structured City Trench Coat', isFeatured: true }
    ]
  },
  {
    id: 'prod_shell_parka',
    name: 'Waterproof Hooded 3L Shell Parka',
    slug: 'waterproof-hooded-3l-shell-parka',
    sku: 'ZYL-OUT-00302',
    brand: 'Zylo Techwear',
    categoryId: 'c_outerwear',
    status: 'published',
    gender: 'Men',
    season: 'AW25',
    tags: ['parka', 'waterproof', 'hardshell', 'gorpcore'],
    basePrice: 640000,
    price: 640000,
    mrp: 820000,
    cost: 290000,
    description: '3-layer microporous membrane shell with fully taped seams, aquaguard YKK zippers, storm hood visor, and underarm ventilation zips.',
    labels: { featured: true, trending: false, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Forest Green', 'Storm Gray'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&auto=format&fit=crop&q=80', alt: 'Waterproof 3L Shell Parka', isFeatured: true }
    ]
  },
  {
    id: 'prod_wool_overcoat',
    name: 'Minimalist Wool Blend Overcoat',
    slug: 'minimalist-wool-blend-overcoat',
    sku: 'ZYL-OUT-00303',
    brand: 'Zylo Atelier',
    categoryId: 'c_outerwear',
    status: 'published',
    gender: 'Women',
    season: 'AW25',
    tags: ['wool', 'overcoat', 'tailored', 'winter'],
    basePrice: 890000,
    price: 890000,
    mrp: 1150000,
    cost: 410000,
    description: 'Premium 80% recycled wool blend tailored overcoat with notched lapels, horn buttons, back center vent, and a satin-lined interior.',
    labels: { featured: true, trending: true, newArrival: false, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Charcoal Melange', 'Camel'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&auto=format&fit=crop&q=80', alt: 'Minimalist Wool Overcoat', isFeatured: true }
    ]
  },
  {
    id: 'prod_quilted_bomber',
    name: 'Diamond Quilted Thermal Bomber',
    slug: 'diamond-quilted-thermal-bomber',
    sku: 'ZYL-OUT-00304',
    brand: 'Zylo Studios',
    categoryId: 'c_kids',
    status: 'published',
    gender: 'Kids',
    season: 'AW25',
    tags: ['bomber', 'quilted', 'jacket', 'kids'],
    basePrice: 495000,
    price: 495000,
    mrp: 650000,
    cost: 220000,
    description: 'Lightweight diamond quilted bomber jacket insulated with recycled Thermolite fill for kids school and outdoor wear.',
    labels: { featured: false, trending: true, newArrival: false, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Dark Moss', 'Black'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80', alt: 'Diamond Quilted Bomber', isFeatured: true }
    ]
  },
  {
    id: 'prod_ribbed_turtleneck',
    name: 'Chunky Ribbed Wool Turtleneck',
    slug: 'chunky-ribbed-wool-turtleneck',
    sku: 'ZYL-KNT-00401',
    brand: 'Zylo Knitwear',
    categoryId: 'c_knitwear',
    status: 'published',
    gender: 'Women',
    season: 'AW25',
    tags: ['knitwear', 'wool', 'turtleneck', 'chunky'],
    basePrice: 390000,
    price: 390000,
    mrp: 520000,
    cost: 170000,
    description: '5-gauge heavy ribbed knit crafted from soft merino wool. High roll neck and raglan sleeves designed to keep warm in winter temperatures.',
    labels: { featured: true, trending: false, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Cream White', 'Dark Coffee'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=80', alt: 'Chunky Ribbed Turtleneck', isFeatured: true }
    ]
  },
  {
    id: 'prod_mohair_cardigan',
    name: 'Brushed Mohair Gradient Cardigan',
    slug: 'brushed-mohair-gradient-cardigan',
    sku: 'ZYL-KNT-00402',
    brand: 'Zylo Knitwear',
    categoryId: 'c_knitwear',
    status: 'published',
    gender: 'Women',
    season: 'AW25',
    tags: ['mohair', 'cardigan', 'gradient', 'soft'],
    basePrice: 460000,
    price: 460000,
    mrp: 590000,
    cost: 205000,
    description: 'Plush brushed mohair-alpaca blend cardigan featuring a subtle ombré fade and chunky faux-horn buttons with a relaxed dropped-shoulder silhouette.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Slate Blue', 'Earth Clay'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop&q=80', alt: 'Brushed Mohair Cardigan', isFeatured: true }
    ]
  },
  {
    id: 'prod_merino_crewneck',
    name: 'Fine Gauge Merino Crewneck',
    slug: 'fine-gauge-merino-crewneck',
    sku: 'ZYL-KNT-00403',
    brand: 'Zylo Knitwear',
    categoryId: 'c_knitwear',
    status: 'published',
    gender: 'Men',
    season: 'SS26',
    tags: ['merino', 'crewneck', 'fine-knit', 'classic'],
    basePrice: 345000,
    price: 345000,
    mrp: 450000,
    cost: 155000,
    description: 'Ultra-soft 14-gauge extrafine Australian merino wool sweater. Naturally breathable, temperature regulating, and odor-resistant for refined layering.',
    labels: { featured: false, trending: false, newArrival: false, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Sage Green', 'Heather Charcoal'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?w=800&auto=format&fit=crop&q=80', alt: 'Fine Gauge Merino Crewneck', isFeatured: true }
    ]
  },
  {
    id: 'prod_waffle_pullover',
    name: 'Heavy Waffle Knit Pullover',
    slug: 'heavy-waffle-knit-pullover',
    sku: 'ZYL-KNT-00404',
    brand: 'Zylo Basics',
    categoryId: 'c_knitwear',
    status: 'published',
    gender: 'Women',
    season: 'SS26',
    tags: ['waffle', 'pullover', 'thermal', 'textured'],
    basePrice: 295000,
    price: 295000,
    mrp: 380000,
    cost: 130000,
    description: 'Textured honeycomb thermal knit in a relaxed casual cut. Provides thermal airflow with a substantial tactile hand feel.',
    labels: { featured: false, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Off-White', 'Sandstone'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop&q=80', alt: 'Heavy Waffle Knit Pullover', isFeatured: true }
    ]
  },
  {
    id: 'prod_everyday_hoodie',
    name: 'Heavyweight Everyday Zip Hoodie',
    slug: 'heavyweight-everyday-zip-hoodie',
    sku: 'ZYL-TOP-00105',
    brand: 'Zylo Basics',
    categoryId: 'c_kids',
    status: 'published',
    gender: 'Kids',
    season: 'All-Season',
    tags: ['hoodie', 'zip-up', 'fleece', 'kids'],
    basePrice: 330000,
    price: 330000,
    mrp: 420000,
    cost: 150000,
    description: '460 GSM brushed fleece zip hoodie with two-way matte steel zipper, double-layered hood, and deep kangaroo pockets.',
    labels: { featured: true, trending: true, newArrival: false, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Washed Espresso', 'Pitch Black'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80', alt: 'Heavyweight Everyday Zip Hoodie', isFeatured: true }
    ]
  },
  {
    id: 'prod_messenger_bag',
    name: 'Tactical Crossbody Messenger Bag',
    slug: 'tactical-crossbody-messenger-bag',
    sku: 'ZYL-ACC-00501',
    brand: 'Zylo Accessories',
    categoryId: 'c_accessories',
    status: 'published',
    gender: 'Men',
    season: 'All-Season',
    tags: ['bag', 'crossbody', 'cordura', 'accessories'],
    basePrice: 225000,
    price: 225000,
    mrp: 290000,
    cost: 95000,
    description: '1000D Cordura ballistic nylon crossbody bag with Fidlock magnetic buckle, padded 13-inch laptop sleeve, and waterproof zips.',
    labels: { featured: true, trending: false, newArrival: true, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Black', 'Coyote Tan'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80', alt: 'Tactical Crossbody Bag', isFeatured: true }
    ]
  },
  {
    id: 'prod_twill_cap',
    name: 'Structured Twill 6-Panel Cap',
    slug: 'structured-twill-6-panel-cap',
    sku: 'ZYL-ACC-00502',
    brand: 'Zylo Accessories',
    categoryId: 'c_accessories',
    status: 'published',
    gender: 'Women',
    season: 'SS26',
    tags: ['cap', 'hat', 'twill', 'headwear'],
    basePrice: 115000,
    price: 115000,
    mrp: 150000,
    cost: 45000,
    description: 'Heavy cotton twill 6-panel cap with curved visor, embroidered tonal eyelets, and an antique brass buckle adjustment strap.',
    labels: { featured: false, trending: true, newArrival: false, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Vintage Washed Black', 'Olive'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80', alt: 'Structured Twill Cap', isFeatured: true }
    ]
  },
  {
    id: 'prod_apex_runner',
    name: 'Apex Carbon Knit Runner',
    slug: 'apex-carbon-knit-runner',
    sku: 'ZYL-SHOE-001',
    brand: 'Zylo Footwear',
    categoryId: 'c_footwear',
    productType: 'Footwear',
    status: 'published',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['sneakers', 'footwear', 'runner', 'knit'],
    basePrice: 485000,
    price: 485000,
    mrp: 620000,
    cost: 195000,
    description: 'Ultra-lightweight breathable engineered knit runner with carbon fiber propulsion plate, responsive EVA midsole, and high-traction rubber outsole.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: true },
    options: { Size: ['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8'], Colour: ['Blue', 'Red'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80', alt: 'Apex Carbon Knit Runner in Red/Blue', isFeatured: true }
    ]
  },
  {
    id: 'prod_vertex_sneaker',
    name: 'Vertex Street Leather Low-Top',
    slug: 'vertex-street-leather-low-top',
    sku: 'ZYL-SHOE-002',
    brand: 'Zylo Footwear',
    categoryId: 'c_footwear',
    productType: 'Footwear',
    status: 'published',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['sneakers', 'footwear', 'leather', 'lowtop'],
    basePrice: 540000,
    price: 540000,
    mrp: 690000,
    cost: 220000,
    description: 'Full-grain Italian nappa leather low-top sneaker featuring custom tonal eyelets, cushioned OrthoLite insole, and vulcanized rubber sole.',
    labels: { featured: true, trending: true, newArrival: false, bestSelling: true },
    options: { Size: ['UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'], Colour: ['Blue', 'Purple'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80', alt: 'Vertex Street Leather Low-Top', isFeatured: true }
    ]
  },
  {
    id: 'prod_aero_windbreaker',
    name: 'Aero Tech Packable Windbreaker',
    slug: 'aero-tech-packable-windbreaker',
    sku: 'RMX-OUT-00401',
    brand: 'Ramroxa Techwear',
    categoryId: 'c_out',
    productType: 'Outerwear',
    status: 'published',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['windbreaker', 'packable', 'jacket', 'waterproof', 'techwear'],
    basePrice: 480000,
    price: 480000,
    mrp: 620000,
    cost: 180000,
    description: 'Featherlight 40D micro-ripstop shell engineered with DWR coating, reflective safety trim, internal pack-away pouch, and storm-proof hood.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Matte Black', 'Forest Green', 'Cyber Yellow'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&auto=format&fit=crop&q=80', alt: 'Aero Tech Packable Windbreaker Front', isFeatured: true },
      { url: 'https://images.unsplash.com/photo-1508427953056-b00b8d78ebf5?w=800&auto=format&fit=crop&q=80', alt: 'Aero Tech Packable Windbreaker Action', isFeatured: false }
    ]
  },
  {
    id: 'prod_silk_knit_polo',
    name: 'Komorebi Silk-Blend Knit Polo',
    slug: 'komorebi-silk-blend-knit-polo',
    sku: 'RMX-TOP-00201',
    brand: 'Ramroxa Atelier',
    categoryId: 'c_tops',
    productType: 'Top Wear',
    status: 'published',
    gender: 'Men',
    season: 'SS26',
    tags: ['polo', 'silk', 'knitwear', 'luxury', 'summer'],
    basePrice: 320000,
    price: 320000,
    mrp: 410000,
    cost: 130000,
    description: 'Crafted from a fluid mulberry silk and combed cotton blend with an open placket collar, ribbed hem, and subtle luster.',
    labels: { featured: true, trending: false, newArrival: true, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Vintage Cream', 'Olive', 'Midnight Navy'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1625910513413-72214300e84b?w=800&auto=format&fit=crop&q=80', alt: 'Komorebi Silk-Blend Knit Polo', isFeatured: true }
    ]
  },
  {
    id: 'prod_sculpt_leggings',
    name: 'Sculpt High-Waisted Seamless Leggings',
    slug: 'sculpt-high-waisted-seamless-leggings',
    sku: 'RMX-BOT-00301',
    brand: 'Ramroxa Studio',
    categoryId: 'c_bottoms',
    productType: 'Bottom Wear',
    status: 'published',
    gender: 'Women',
    season: 'SS26',
    tags: ['leggings', 'seamless', 'activewear', 'gym', 'bottoms'],
    basePrice: 240000,
    price: 240000,
    mrp: 300000,
    cost: 95000,
    description: 'Four-way stretch sweat-wicking knit with zoned compressive ribbing and a stay-put double-layer contour waistband for zero distraction.',
    labels: { featured: false, trending: true, newArrival: true, bestSelling: true },
    options: { Size: ['XS', 'S', 'M', 'L'], Colour: ['Charcoal', 'Sage Green', 'Pitch Black'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&auto=format&fit=crop&q=80', alt: 'Sculpt Seamless Leggings', isFeatured: true }
    ]
  },
  {
    id: 'prod_altitude_flannel',
    name: 'Altitude Heavy Flannel Overshirt',
    slug: 'altitude-heavy-flannel-overshirt',
    sku: 'RMX-TOP-00202',
    brand: 'Ramroxa Mountain',
    categoryId: 'c_tops',
    productType: 'Top Wear',
    status: 'published',
    gender: 'Men',
    season: 'AW25',
    tags: ['flannel', 'plaid', 'overshirt', 'winter', 'warm'],
    basePrice: 390000,
    price: 390000,
    mrp: 490000,
    cost: 160000,
    description: '330 GSM brushed twin-pocket heavy cotton flannel. Double-needle stitched with horn buttons and custom oversized silhouette for layering.',
    labels: { featured: true, trending: true, newArrival: false, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Washed Red', 'Pine Green'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=800&auto=format&fit=crop&q=80', alt: 'Altitude Heavy Flannel Overshirt', isFeatured: true }
    ]
  },
  {
    id: 'prod_aura_blazer',
    name: 'Aura Structured Oversized Blazer',
    slug: 'aura-structured-oversized-blazer',
    sku: 'RMX-OUT-00402',
    brand: 'Ramroxa Atelier',
    categoryId: 'c_out',
    productType: 'Outerwear',
    status: 'published',
    gender: 'Women',
    season: 'SS26',
    tags: ['blazer', 'tailored', 'oversized', 'formal', 'outerwear'],
    basePrice: 650000,
    price: 650000,
    mrp: 820000,
    cost: 260000,
    description: 'Architectural peaked lapels, padded shoulders, and a relaxed double-breasted closure cut from structured crepe twill with satin interior lining.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L'], Colour: ['Jet Black', 'Desert Sand', 'Vintage Cream'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80', alt: 'Aura Structured Oversized Blazer', isFeatured: true }
    ]
  },
  {
    id: 'prod_drift_acid_tee',
    name: 'Drift Acid-Wash Heavyweight Tee',
    slug: 'drift-acid-wash-heavyweight-tee',
    sku: 'RMX-TOP-00203',
    brand: 'Ramroxa Street',
    categoryId: 'c_tops',
    productType: 'Top Wear',
    status: 'published',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['tee', 'acid-wash', 'oversized', 'streetwear', 'vintage'],
    basePrice: 210000,
    price: 210000,
    mrp: 270000,
    cost: 85000,
    description: 'Custom mineral acid wash on 260 GSM combed cotton jersey. Drop-shoulder relaxed fit with thick 1.25-inch ribbed collar.',
    labels: { featured: false, trending: true, newArrival: true, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Acid Grey', 'Cobalt Blue', 'Pitch Black'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80', alt: 'Drift Acid-Wash Heavyweight Tee', isFeatured: true }
    ]
  },
  {
    id: 'prod_vanguard_tactical_vest',
    name: 'Vanguard Multi-Pocket Tactical Vest',
    slug: 'vanguard-multi-pocket-tactical-vest',
    sku: 'RMX-OUT-00403',
    brand: 'Ramroxa Techwear',
    categoryId: 'c_out',
    productType: 'Outerwear',
    status: 'published',
    gender: 'Men',
    season: 'AW25',
    tags: ['vest', 'tactical', 'techwear', 'utility', 'layering'],
    basePrice: 420000,
    price: 420000,
    mrp: 550000,
    cost: 170000,
    description: 'Heavyweight Cordura tactical vest with 8 modular 3D utility pockets, MOLLE webbing attachments, and adjustable quick-release side straps.',
    labels: { featured: true, trending: false, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Tactical Black', 'Desert Sand'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80', alt: 'Vanguard Tactical Vest', isFeatured: true }
    ]
  },
  {
    id: 'prod_solstice_linen_shorts',
    name: 'Solstice Relaxed Linen Drawstring Shorts',
    slug: 'solstice-relaxed-linen-drawstring-shorts',
    sku: 'RMX-BOT-00302',
    brand: 'Ramroxa Atelier',
    categoryId: 'c_bottoms',
    productType: 'Bottom Wear',
    status: 'published',
    gender: 'Men',
    season: 'SS26',
    tags: ['shorts', 'linen', 'summer', 'breathable', 'casual'],
    basePrice: 260000,
    price: 260000,
    mrp: 340000,
    cost: 105000,
    description: '100% Normandy flax linen with a 6-inch inseam, elastic drawstring waist, deep side pockets, and back welt pocket with coconut button closure.',
    labels: { featured: false, trending: true, newArrival: false, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Natural', 'Midnight Navy', 'Olive'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop&q=80', alt: 'Solstice Linen Shorts', isFeatured: true }
    ]
  },
  {
    id: 'prod_cloudsoft_mockneck',
    name: 'CloudSoft Fleece Mockneck Pullover',
    slug: 'cloudsoft-fleece-mockneck-pullover',
    sku: 'RMX-TOP-00204',
    brand: 'Ramroxa Basics',
    categoryId: 'c_tops',
    productType: 'Top Wear',
    status: 'published',
    gender: 'Women',
    season: 'AW25',
    tags: ['fleece', 'mockneck', 'pullover', 'warm', 'winter'],
    basePrice: 340000,
    price: 340000,
    mrp: 420000,
    cost: 135000,
    description: 'Plush thermal polar fleece with a structured mockneck collar, quarter-zip brass hardware, and cinchable hem drawcord for customizable styling.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Vintage Cream', 'Sage Green', 'Charcoal'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&auto=format&fit=crop&q=80', alt: 'CloudSoft Fleece Mockneck', isFeatured: true }
    ]
  },
  {
    id: 'prod_apex_rolltop_backpack',
    name: 'Apex Waterproof Roll-Top Commuter Backpack',
    slug: 'apex-waterproof-roll-top-commuter-backpack',
    sku: 'RMX-BAG-00101',
    brand: 'Ramroxa Gear',
    categoryId: 'c_bags',
    productType: 'Bags',
    status: 'published',
    gender: 'Unisex',
    season: 'All-Season',
    tags: ['backpack', 'waterproof', 'commuter', 'bag', 'laptop'],
    basePrice: 460000,
    price: 460000,
    mrp: 590000,
    cost: 190000,
    description: '28L roll-top waterproof TPU laminate backpack featuring an external 16-inch fleece-lined laptop compartment, ergonomic EVA padded straps, and magnetic Fidlock buckle.',
    labels: { featured: true, trending: false, newArrival: true, bestSelling: true },
    options: { Size: ['One size'], Colour: ['Matte Black', 'Cement Grey', 'Stealth Olive'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80', alt: 'Apex Roll-Top Backpack', isFeatured: true }
    ]
  },
  {
    id: 'prod_orbit_leather_crossbody',
    name: 'Orbit Structured Leather Crossbody Bag',
    slug: 'orbit-structured-leather-crossbody-bag',
    sku: 'RMX-BAG-00102',
    brand: 'Ramroxa Atelier',
    categoryId: 'c_bags',
    productType: 'Bags',
    status: 'published',
    gender: 'Women',
    season: 'SS26',
    tags: ['bag', 'crossbody', 'leather', 'luxury', 'handbag'],
    basePrice: 380000,
    price: 380000,
    mrp: 490000,
    cost: 155000,
    description: 'Full-grain vegetable-tanned Italian leather saddle crossbody with gold-tone hardware, magnetic clasp closure, and an adjustable wide leather strap.',
    labels: { featured: true, trending: true, newArrival: false, bestSelling: true },
    options: { Size: ['One size'], Colour: ['Espresso Brown', 'Tan', 'Jet Black'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80', alt: 'Orbit Leather Crossbody Bag', isFeatured: true }
    ]
  },
  {
    id: 'prod_zenith_cable_cardigan',
    name: 'Zenith Cable-Knit Wool Cardigan',
    slug: 'zenith-cable-knit-wool-cardigan',
    sku: 'RMX-TOP-00205',
    brand: 'Ramroxa Knitwear',
    categoryId: 'c_tops',
    productType: 'Knitwear',
    status: 'published',
    gender: 'Women',
    season: 'AW25',
    tags: ['knitwear', 'cardigan', 'wool', 'cable-knit', 'cozy'],
    basePrice: 470000,
    price: 470000,
    mrp: 600000,
    cost: 195000,
    description: 'Hand-linked 100% pure virgin wool cardigan featuring heritage Aran cable stitches, dropped shoulder seams, and genuine horn toggle buttons.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['S', 'M', 'L'], Colour: ['Vintage Cream', 'Desert Sand', 'Forest Green'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=80', alt: 'Zenith Cable-Knit Cardigan', isFeatured: true }
    ]
  },
  {
    id: 'prod_subzero_puffer_jacket',
    name: 'Subzero 700-Fill Down Puffer Jacket',
    slug: 'subzero-700-fill-down-puffer-jacket',
    sku: 'RMX-OUT-00404',
    brand: 'Ramroxa Mountain',
    categoryId: 'c_out',
    productType: 'Outerwear',
    status: 'published',
    gender: 'Unisex',
    season: 'AW25',
    tags: ['puffer', 'jacket', 'down', 'winter', 'himalayan'],
    basePrice: 840000,
    price: 840000,
    mrp: 1080000,
    cost: 360000,
    description: '700-fill responsibly sourced goose down insulation encased in a durable water-resistant ripstop shell with storm baffle, fleece-lined pockets, and detachable hood.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Pitch Black', 'Pure White', 'Cobalt Blue'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&auto=format&fit=crop&q=80', alt: 'Subzero Down Puffer Jacket', isFeatured: true }
    ]
  },
  {
    id: 'prod_strata_chino_pants',
    name: 'Strata Relaxed Tapered Chino Pants',
    slug: 'strata-relaxed-tapered-chino-pants',
    sku: 'RMX-BOT-00303',
    brand: 'Ramroxa Atelier',
    categoryId: 'c_bottoms',
    productType: 'Bottom Wear',
    status: 'published',
    gender: 'Men',
    season: 'SS26',
    tags: ['chino', 'trousers', 'pants', 'smart-casual', 'cotton'],
    basePrice: 330000,
    price: 330000,
    mrp: 420000,
    cost: 135000,
    description: '9oz stretch cotton twill garment-dyed for a soft lived-in feel. Tailored with a relaxed thigh and gentle taper toward the ankle cuff.',
    labels: { featured: false, trending: false, newArrival: false, bestSelling: true },
    options: { Size: ['30', '32', '34', '36'], Colour: ['Khaki', 'Olive', 'Midnight Navy'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&auto=format&fit=crop&q=80', alt: 'Strata Tapered Chino Pants', isFeatured: true }
    ]
  },
  {
    id: 'prod_horizon_corduroy_cap',
    name: 'Horizon Embroidered Corduroy Cap',
    slug: 'horizon-embroidered-corduroy-cap',
    sku: 'RMX-ACC-00201',
    brand: 'Ramroxa Accessories',
    categoryId: 'c_acc',
    productType: 'Accessories',
    status: 'published',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['cap', 'corduroy', 'hat', 'streetwear', 'accessories'],
    basePrice: 140000,
    price: 140000,
    mrp: 180000,
    cost: 55000,
    description: '8-wale heavy corduroy unconstructed 6-panel cap with tonal embroidered logo crest, curved brim, and adjustable leather back closure.',
    labels: { featured: false, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['One size'], Colour: ['Orange', 'Olive', 'Midnight Navy'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80', alt: 'Horizon Corduroy Cap', isFeatured: true }
    ]
  },
  {
    id: 'prod_kids_nebula_windbreaker',
    name: 'Kids Nebula Colourblock Windbreaker',
    slug: 'kids-nebula-colourblock-windbreaker',
    sku: 'RMX-KID-00101',
    brand: 'Ramroxa Kids',
    categoryId: 'c_out',
    productType: 'Outerwear',
    status: 'published',
    gender: 'Kids',
    season: 'SS26',
    tags: ['kids', 'windbreaker', 'jacket', 'colourblock', 'playwear'],
    basePrice: 280000,
    price: 280000,
    mrp: 360000,
    cost: 110000,
    description: 'Durable water-resistant nylon shell with breathable mesh lining, high-vis safety accents, and elastic cuffs for active kids outdoors.',
    labels: { featured: false, trending: true, newArrival: true, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Blue', 'Green'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=800&auto=format&fit=crop&q=80', alt: 'Kids Nebula Colourblock Windbreaker', isFeatured: true }
    ]
  },
  {
    id: 'prod_kids_organic_hoodie',
    name: 'Kids Graphic Organic Cotton Hoodie',
    slug: 'kids-graphic-organic-cotton-hoodie',
    sku: 'RMX-KID-00102',
    brand: 'Ramroxa Kids',
    categoryId: 'c_tops',
    productType: 'Top Wear',
    status: 'published',
    gender: 'Kids',
    season: 'AW25',
    tags: ['kids', 'hoodie', 'organic', 'fleece', 'cotton'],
    basePrice: 240000,
    price: 240000,
    mrp: 310000,
    cost: 95000,
    description: 'Ultra-soft 100% GOTS-certified organic cotton fleece with ribbed cuffs, safe tagless neck label, and playful embroidered chest badge.',
    labels: { featured: false, trending: false, newArrival: true, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Yellow', 'Charcoal'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80', alt: 'Kids Organic Cotton Hoodie', isFeatured: true }
    ]
  },
  {
    id: 'prod_stealth_tech_track_pants',
    name: 'Stealth Tech Track Pants',
    slug: 'stealth-tech-track-pants',
    sku: 'RMX-BOT-00304',
    brand: 'Ramroxa Techwear',
    categoryId: 'c_bottoms',
    productType: 'Bottom Wear',
    status: 'published',
    gender: 'Men',
    season: 'SS26',
    tags: ['trackpants', 'techwear', 'joggers', 'athletic', 'bottoms'],
    basePrice: 360000,
    price: 360000,
    mrp: 460000,
    cost: 145000,
    description: 'Dual-weave weather-resistant technical fabric with zipped ankle gussets, waterproof side zip pockets, and an elastic drawcord waistband.',
    labels: { featured: true, trending: true, newArrival: false, bestSelling: true },
    options: { Size: ['S', 'M', 'L', 'XL'], Colour: ['Matte Black', 'Cement Grey'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80', alt: 'Stealth Tech Track Pants', isFeatured: true }
    ]
  },
  {
    id: 'prod_solstice_platform_loafer',
    name: 'Solstice Chunky Platform Leather Loafer',
    slug: 'solstice-chunky-platform-leather-loafer',
    sku: 'RMX-SHOE-00101',
    brand: 'Ramroxa Footwear',
    categoryId: 'c_acc',
    productType: 'Footwear',
    status: 'published',
    gender: 'Women',
    season: 'SS26',
    tags: ['loafer', 'shoes', 'footwear', 'platform', 'leather'],
    basePrice: 520000,
    price: 520000,
    mrp: 680000,
    cost: 210000,
    description: 'High-shine polished box calf leather penny loafer perched on a lightweight 45mm cleated lug platform sole with padded memory foam footbed.',
    labels: { featured: true, trending: true, newArrival: true, bestSelling: false },
    options: { Size: ['UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8'], Colour: ['Jet Black', 'Burgundy'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80', alt: 'Solstice Chunky Platform Loafer', isFeatured: true }
    ]
  },
  {
    id: 'prod_merino_ribbed_beanie',
    name: 'Merino Wool Ribbed Watch Beanie',
    slug: 'merino-wool-ribbed-watch-beanie',
    sku: 'RMX-ACC-00202',
    brand: 'Ramroxa Accessories',
    categoryId: 'c_acc',
    productType: 'Accessories',
    status: 'published',
    gender: 'Unisex',
    season: 'AW25',
    tags: ['beanie', 'hat', 'merino', 'wool', 'winter', 'accessories'],
    basePrice: 120000,
    price: 120000,
    mrp: 160000,
    cost: 45000,
    description: '100% extrafine merino wool watch cap with dense 2x2 rib knit, adjustable fold-over cuff, and natural thermal temperature regulation.',
    labels: { featured: false, trending: true, newArrival: true, bestSelling: true },
    options: { Size: ['One size'], Colour: ['Oatmeal', 'Forest Green', 'Orange', 'Matte Black'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&auto=format&fit=crop&q=80', alt: 'Merino Wool Ribbed Beanie', isFeatured: true }
    ]
  }
];

export async function populate20ProductsWithVariantsAndOrders(force = false) {
  if (!force) {
    const existingCount = await Product.countDocuments();
    if (existingCount > 0) {
      logger.info('Catalog already populated in MongoDB. Preserving existing database records.');
      return;
    }
  }

  logger.info('🚀 Starting catalog population with 20 master products, variants (S/M/L/XL), inventory, and orders...');

  // Ensure default categories & warehouses exist
  const defaultWarehouses = [
    { id: 'w1', name: 'Kathmandu Central Fulfillment', code: 'WH-KTM-01', location: 'Kathmandu, Bagmati', isDefault: true, isActive: true },
    { id: 'w2', name: 'Pokhara Regional Hub', code: 'WH-PKR-02', location: 'Pokhara, Gandaki', isDefault: false, isActive: true }
  ];
  for (const wh of defaultWarehouses) {
    await Warehouse.findOneAndUpdate({ id: wh.id }, wh, { upsert: true, new: true });
  }

  // Purge any existing products and inventory if empty or force=true
  await Promise.all([
    Product.deleteMany({}),
    Variant.deleteMany({}),
    Inventory.deleteMany({}),
    StockMove.deleteMany({})
  ]);

  const allVariantsToInsert = [];
  const allInventoryToInsert = [];

  for (const p of sampleProducts20) {
    await Product.create({
      ...p,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const options = p.options || { Size: ['S', 'M', 'L', 'XL'] };
    const sizes = options.Size || ['S', 'M', 'L', 'XL'];
    const colours = options.Colour || ['Default'];

    let varIdx = 0;
    for (const size of sizes) {
      for (const colour of colours) {
        varIdx++;
        const cleanSizeStr = size.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanColStr = colour.toLowerCase().replace(/[^a-z0-9]/g, '');
        const vId = `v_${p.id}_${cleanSizeStr}_${cleanColStr}`;
        const sku = `${p.sku}-${size.replace(/\s+/g, '').toUpperCase()}-${colour.slice(0, 3).toUpperCase()}`;
        const barcode = `890${String(Date.now()).slice(-6)}${String(varIdx).padStart(3, '0')}`;

        allVariantsToInsert.push({
          id: vId,
          productId: p.id,
          sku,
          barcode,
          options: { Size: size, Colour: colour },
          price: p.basePrice,
          cost: p.cost,
          weight: 350,
          published: true,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Calculate available stock (with exact example counts for UK 3 and UK 5)
        let initialQty = 15;
        if (p.productType === 'Footwear' || p.categoryId === 'c_footwear') {
          if (size === 'UK 3' && colour === 'Blue') initialQty = 3;
          else if (size === 'UK 3' && colour === 'Red') initialQty = 5;
          else if (size === 'UK 5' && colour === 'Blue') initialQty = 7;
          else if (size === 'UK 5' && colour === 'Purple') initialQty = 3;
          else if (size === 'UK 5' && colour === 'Red') initialQty = 4;
          else if (size === 'UK 4') initialQty = 6;
          else if (size === 'UK 6') initialQty = 8;
          else if (size === 'UK 7') initialQty = 10;
          else if (size === 'UK 8') initialQty = 5;
        } else {
          initialQty = 20 + ((varIdx * 7) % 30);
        }

        // Stock in Warehouse 1 (Kathmandu Central)
        allInventoryToInsert.push({
          id: `inv_${vId}_w1`,
          variantId: vId,
          warehouseId: 'w1',
          available: initialQty,
          reserved: 0,
          damaged: 0,
          returned: 0,
          reorderLevel: 5,
          minStock: 2,
          maxStock: 100,
          archived: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Stock in Warehouse 2 (Pokhara Hub)
        allInventoryToInsert.push({
          id: `inv_${vId}_w2`,
          variantId: vId,
          warehouseId: 'w2',
          available: 20 + (varIdx * 3 % 15),
          reserved: 0,
          damaged: 0,
          returned: 0,
          reorderLevel: 5,
          minStock: 2,
          maxStock: 50,
          archived: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
  }

  if (allVariantsToInsert.length) {
    await Variant.insertMany(allVariantsToInsert);
  }
  if (allInventoryToInsert.length) {
    await Inventory.insertMany(allInventoryToInsert);
  }

  // Create sample customer profiles
  const sampleCustomerData = [
    { email: 'aarav.sharma@example.com', name: 'Aarav Sharma', phone: '9841234567', city: 'Kathmandu' },
    { email: 'prashant.adhikari@example.com', name: 'Prashant Adhikari', phone: '9812345678', city: 'Pokhara' },
    { email: 'sneha.thapa@example.com', name: 'Sneha Thapa', phone: '9801122334', city: 'Lalitpur' },
    { email: 'bikash.gurung@example.com', name: 'Bikash Gurung', phone: '9846001122', city: 'Pokhara' }
  ];

  const salt = await bcrypt.genSalt(10);
  const defaultHash = await bcrypt.hash('CustomerPass123!', salt);

  const createdCustomers = [];
  for (const cd of sampleCustomerData) {
    let custUser = await User.findOne({ email: cd.email });
    if (!custUser) {
      custUser = await User.create({
        email: cd.email,
        passwordHash: defaultHash,
        name: cd.name,
        phone: cd.phone,
        role: 'customer',
        isEmailVerified: true,
        isActive: true
      });
    }
    createdCustomers.push(custUser);
  }

  // Create sample customer orders referencing new variants
  const sampleOrders = [
    {
      orderNo: 'ZY-882190',
      user: createdCustomers[0]._id,
      guestEmail: createdCustomers[0].email,
      guestPhone: createdCustomers[0].phone,
      status: 'confirmed',
      fulfillmentStatus: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'esewa',
      currency: 'NPR',
      subtotal: 545000,
      discountTotal: 0,
      vatTotal: 70850,
      shippingTotal: 0,
      grandTotal: 545000,
      shippingAddress: {
        fullName: 'Aarav Sharma',
        phone: '9841234567',
        line1: 'Baluwatar, Ward 4',
        city: 'Kathmandu',
        state: 'Bagmati',
        postalCode: '44600',
        country: 'Nepal'
      },
      items: [
        {
          productId: 'prod_nomad_tee',
          variantId: 'v_prod_nomad_tee_l_charcoal',
          name: 'Nomad Heavyweight Boxy Tee',
          variantLabel: 'L / Charcoal',
          sku: 'ZYL-TOP-00101-L-CHA',
          qty: 1,
          unitPrice: 185000,
          lineTotal: 185000
        },
        {
          productId: 'prod_utility_overshirt',
          variantId: 'v_prod_utility_overshirt_m_sage',
          name: 'Technical Utility Pocket Overshirt',
          variantLabel: 'M / Sage',
          sku: 'ZYL-TOP-00104-M-SAG',
          qty: 1,
          unitPrice: 360000,
          lineTotal: 360000
        }
      ],
      createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 2 * 3600 * 1000)
    },
    {
      orderNo: 'ZY-774102',
      user: createdCustomers[1]._id,
      guestEmail: createdCustomers[1].email,
      guestPhone: createdCustomers[1].phone,
      status: 'shipped',
      fulfillmentStatus: 'shipped',
      paymentStatus: 'paid',
      paymentMethod: 'fonepay',
      currency: 'NPR',
      subtotal: 780000,
      discountTotal: 0,
      vatTotal: 101400,
      shippingTotal: 0,
      grandTotal: 780000,
      shippingAddress: {
        fullName: 'Prashant Adhikari',
        phone: '9812345678',
        line1: 'Lakeside, Ward 6',
        city: 'Pokhara',
        state: 'Gandaki',
        postalCode: '33700',
        country: 'Nepal'
      },
      items: [
        {
          productId: 'prod_city_trench',
          variantId: 'v_prod_city_trench_m_cameltan',
          name: 'Structured City Trench Coat',
          variantLabel: 'M / Camel Tan',
          sku: 'ZYL-OUT-00301-M-CAM',
          qty: 1,
          unitPrice: 780000,
          lineTotal: 780000
        }
      ],
      createdAt: new Date(Date.now() - 12 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 12 * 3600 * 1000)
    },
    {
      orderNo: 'ZY-663914',
      user: createdCustomers[2]._id,
      guestEmail: createdCustomers[2].email,
      guestPhone: createdCustomers[2].phone,
      status: 'pending',
      fulfillmentStatus: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cod',
      currency: 'NPR',
      subtotal: 560000,
      discountTotal: 0,
      vatTotal: 72800,
      shippingTotal: 15000,
      grandTotal: 575000,
      shippingAddress: {
        fullName: 'Sneha Thapa',
        phone: '9801122334',
        line1: 'Jhamsikhel, Ward 3',
        city: 'Lalitpur',
        state: 'Bagmati',
        postalCode: '44700',
        country: 'Nepal'
      },
      items: [
        {
          productId: 'prod_pleated_trousers',
          variantId: 'v_prod_pleated_trousers_s_deepnavy',
          name: 'Pleated Wide-Leg Tailored Trousers',
          variantLabel: 'S / Deep Navy',
          sku: 'ZYL-BOT-00201-S-DEE',
          qty: 1,
          unitPrice: 320000,
          lineTotal: 320000
        },
        {
          productId: 'prod_french_terry_sweats',
          variantId: 'v_prod_french_terry_sweats_s_heathergray',
          name: 'Relaxed French Terry Sweatpants',
          variantLabel: 'S / Heather Gray',
          sku: 'ZYL-BOT-00203-S-HEA',
          qty: 1,
          unitPrice: 240000,
          lineTotal: 240000
        }
      ],
      createdAt: new Date(Date.now() - 24 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 24 * 3600 * 1000)
    },
    {
      orderNo: 'ZY-551098',
      user: createdCustomers[3]._id,
      guestEmail: createdCustomers[3].email,
      guestPhone: createdCustomers[3].phone,
      status: 'delivered',
      fulfillmentStatus: 'delivered',
      paymentStatus: 'paid',
      paymentMethod: 'cod',
      currency: 'NPR',
      subtotal: 450000,
      discountTotal: 0,
      vatTotal: 58500,
      shippingTotal: 0,
      grandTotal: 450000,
      shippingAddress: {
        fullName: 'Bikash Gurung',
        phone: '9846001122',
        line1: 'Mahendrapool',
        city: 'Pokhara',
        state: 'Gandaki',
        postalCode: '33700',
        country: 'Nepal'
      },
      items: [
        {
          productId: 'prod_selvedge_denim',
          variantId: 'v_prod_selvedge_denim_xl_rawindigo',
          name: 'Japanese Selvedge Straight Denim',
          variantLabel: 'XL / Raw Indigo',
          sku: 'ZYL-BOT-00204-XL-RAW',
          qty: 1,
          unitPrice: 450000,
          lineTotal: 450000
        }
      ],
      createdAt: new Date(Date.now() - 48 * 3600 * 1000),
      updatedAt: new Date(Date.now() - 48 * 3600 * 1000)
    }
  ];

  await Order.deleteMany({});
  await Order.insertMany(sampleOrders);
  logger.info(`✅ Created ${sampleOrders.length} customer orders.`);

  // Seed Authentic Sample Customer Reviews
  const sampleReviews = [
    {
      productId: 'prod_nomad_tee',
      user: createdCustomers[0]._id,
      userName: createdCustomers[0].name,
      userEmail: createdCustomers[0].email,
      rating: 5,
      title: 'Best heavyweight tee in Nepal',
      comment: 'The 280 GSM fabric has substantial weight and zero shrinkage after cold wash. Collar holds its shape perfectly.',
      color: 'Charcoal',
      size: 'L',
      variantLabel: 'L / Charcoal',
      verifiedPurchase: true,
      status: 'published',
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000)
    },
    {
      productId: 'prod_nomad_tee',
      user: createdCustomers[1]._id,
      userName: createdCustomers[1].name,
      userEmail: createdCustomers[1].email,
      rating: 5,
      title: 'Flawless boxy cut',
      comment: 'Dropped shoulders drape very nicely. Vintage white colorway is clean and versatile.',
      color: 'Vintage White',
      size: 'M',
      variantLabel: 'M / Vintage White',
      verifiedPurchase: true,
      status: 'published',
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000)
    },
    {
      productId: 'prod_selvedge_denim',
      user: createdCustomers[3]._id,
      userName: createdCustomers[3].name,
      userEmail: createdCustomers[3].email,
      rating: 5,
      title: 'Exceptional selvedge quality',
      comment: 'Rigid 14oz denim that breaks in wonderfully. The stitching and hardware details match high-end Japanese brands.',
      color: 'Raw Indigo',
      size: 'XL',
      variantLabel: 'XL / Raw Indigo',
      verifiedPurchase: true,
      status: 'published',
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000)
    },
    {
      productId: 'prod_french_terry_sweats',
      user: createdCustomers[2]._id,
      userName: createdCustomers[2].name,
      userEmail: createdCustomers[2].email,
      rating: 4,
      title: 'Super soft and comfortable',
      comment: 'Very cozy loopback interior. Elastic cuffs stay in place and waistband is comfortable all day.',
      color: 'Heather Gray',
      size: 'S',
      variantLabel: 'S / Heather Gray',
      verifiedPurchase: true,
      status: 'published',
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000)
    }
  ];

  await Review.deleteMany({});
  for (const sr of sampleReviews) {
    const pDoc = await Product.findOne({ id: sr.productId });
    if (pDoc) {
      await Review.create({
        ...sr,
        product: pDoc._id
      });
      await recalculateProductRating(pDoc.id);
    }
  }

  logger.info(`✅ Created ${sampleReviews.length} customer reviews and updated ratings.`);

  return {
    productsCount: sampleProducts20.length,
    variantsCount: allVariantsToInsert.length,
    inventoryCount: allInventoryToInsert.length,
    customersCount: createdCustomers.length,
    ordersCount: sampleOrders.length,
    reviewsCount: sampleReviews.length
  };
}

export default populate20ProductsWithVariantsAndOrders;
