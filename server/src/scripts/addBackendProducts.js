const BASE_URL = 'http://localhost:5000';

const newProducts = [
  {
    name: 'Ascent Tactical Windbreaker',
    slug: 'ascent-tactical-windbreaker',
    categoryId: 'c_out',
    brand: 'Ramroxa',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['windbreaker', 'outerwear', 'tactical', 'jacket'],
    basePrice: 480000,
    price: 480000,
    mrp: 620000,
    cost: 210000,
    status: 'published',
    labels: {
      featured: true,
      trending: true,
      newArrival: true,
      bestSelling: true
    },
    description: 'Technical lightweight ripstop windbreaker featuring storm-sealed taped zippers, adjustable bungee toggles, and breathable underarm ventilation. Engineered for alpine squalls and daily urban commutes.',
    options: {
      Colour: ['Matte Black', 'Cobalt Blue', 'Cement Grey'],
      Size: ['S', 'M', 'L', 'XL']
    },
    images: [
      {
        url: '/assets/57e8f8ec76e792b1.q.jpg',
        alt: 'Ascent Tactical Windbreaker in Matte Black',
        isFeatured: true
      },
      {
        url: '/assets/e2a028dd8bd0e7b5.q.jpg',
        alt: 'Ascent Tactical Windbreaker Detail',
        isFeatured: false
      }
    ],
    variants: [
      { name: 'Matte Black / S', options: { Colour: 'Matte Black', Size: 'S' }, price: 480000, stock: 35 },
      { name: 'Matte Black / M', options: { Colour: 'Matte Black', Size: 'M' }, price: 480000, stock: 50 },
      { name: 'Matte Black / L', options: { Colour: 'Matte Black', Size: 'L' }, price: 480000, stock: 45 },
      { name: 'Matte Black / XL', options: { Colour: 'Matte Black', Size: 'XL' }, price: 480000, stock: 25 },
      { name: 'Cobalt Blue / M', options: { Colour: 'Cobalt Blue', Size: 'M' }, price: 480000, stock: 30 },
      { name: 'Cobalt Blue / L', options: { Colour: 'Cobalt Blue', Size: 'L' }, price: 480000, stock: 30 },
      { name: 'Cement Grey / M', options: { Colour: 'Cement Grey', Size: 'M' }, price: 480000, stock: 25 },
      { name: 'Cement Grey / L', options: { Colour: 'Cement Grey', Size: 'L' }, price: 480000, stock: 25 }
    ]
  },
  {
    name: 'Kuro Heavyweight Crewneck',
    slug: 'kuro-heavyweight-crewneck',
    categoryId: 'c_tops',
    brand: 'Ramroxa',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['crewneck', 'sweatshirt', 'fleece', 'heavyweight'],
    basePrice: 285000,
    price: 285000,
    mrp: 360000,
    cost: 120000,
    status: 'published',
    labels: {
      featured: true,
      trending: true,
      newArrival: true,
      bestSelling: true
    },
    description: '500 GSM loopback organic French terry crewneck with dropped armholes, ribbed cross-grain side panels, and subtle tonal embroidery across the back hem.',
    options: {
      Colour: ['Washed Charcoal', 'Vintage Cream', 'Pitch Black'],
      Size: ['S', 'M', 'L', 'XL']
    },
    images: [
      {
        url: '/assets/eeac2757b9ee2e46.q.jpg',
        alt: 'Kuro Heavyweight Crewneck',
        isFeatured: true
      },
      {
        url: '/assets/67866d53aaeebcac.q.jpg',
        alt: 'Kuro Heavyweight Crewneck Detail',
        isFeatured: false
      }
    ],
    variants: [
      { name: 'Washed Charcoal / S', options: { Colour: 'Washed Charcoal', Size: 'S' }, price: 285000, stock: 40 },
      { name: 'Washed Charcoal / M', options: { Colour: 'Washed Charcoal', Size: 'M' }, price: 285000, stock: 60 },
      { name: 'Washed Charcoal / L', options: { Colour: 'Washed Charcoal', Size: 'L' }, price: 285000, stock: 55 },
      { name: 'Washed Charcoal / XL', options: { Colour: 'Washed Charcoal', Size: 'XL' }, price: 285000, stock: 30 },
      { name: 'Vintage Cream / M', options: { Colour: 'Vintage Cream', Size: 'M' }, price: 285000, stock: 45 },
      { name: 'Vintage Cream / L', options: { Colour: 'Vintage Cream', Size: 'L' }, price: 285000, stock: 40 },
      { name: 'Pitch Black / M', options: { Colour: 'Pitch Black', Size: 'M' }, price: 285000, stock: 50 },
      { name: 'Pitch Black / L', options: { Colour: 'Pitch Black', Size: 'L' }, price: 285000, stock: 45 }
    ]
  },
  {
    name: 'Solitude Wide-Leg Pleated Trousers',
    slug: 'solitude-wide-leg-pleated-trousers',
    categoryId: 'c_bottoms',
    brand: 'Ramroxa',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['trousers', 'pleated', 'tailored', 'bottoms'],
    basePrice: 340000,
    price: 340000,
    mrp: 440000,
    cost: 145000,
    status: 'published',
    labels: {
      featured: true,
      trending: false,
      newArrival: true,
      bestSelling: true
    },
    description: 'Architectural front double pleats with a drape-forward wide-leg silhouette. Tailored from a high-twist wool-poly blend that resists creasing throughout the day.',
    options: {
      Colour: ['Obsidian Black', 'Slate Grey', 'Midnight Navy'],
      Size: ['30', '32', '34', '36']
    },
    images: [
      {
        url: '/assets/9a83a5f92f7a34f6.q.jpg',
        alt: 'Solitude Wide-Leg Pleated Trousers',
        isFeatured: true
      },
      {
        url: '/assets/19eee9f8e07093fd.q.jpg',
        alt: 'Solitude Wide-Leg Pleated Trousers Detail',
        isFeatured: false
      }
    ],
    variants: [
      { name: 'Obsidian Black / 30', options: { Colour: 'Obsidian Black', Size: '30' }, price: 340000, stock: 30 },
      { name: 'Obsidian Black / 32', options: { Colour: 'Obsidian Black', Size: '32' }, price: 340000, stock: 45 },
      { name: 'Obsidian Black / 34', options: { Colour: 'Obsidian Black', Size: '34' }, price: 340000, stock: 40 },
      { name: 'Obsidian Black / 36', options: { Colour: 'Obsidian Black', Size: '36' }, price: 340000, stock: 25 },
      { name: 'Slate Grey / 32', options: { Colour: 'Slate Grey', Size: '32' }, price: 340000, stock: 35 },
      { name: 'Slate Grey / 34', options: { Colour: 'Slate Grey', Size: '34' }, price: 340000, stock: 30 },
      { name: 'Midnight Navy / 32', options: { Colour: 'Midnight Navy', Size: '32' }, price: 340000, stock: 30 },
      { name: 'Midnight Navy / 34', options: { Colour: 'Midnight Navy', Size: '34' }, price: 340000, stock: 25 }
    ]
  },
  {
    name: 'Nomad Ballistic Crossbody Sling',
    slug: 'nomad-ballistic-crossbody-sling',
    categoryId: 'c_bags',
    brand: 'Ramroxa',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['bag', 'crossbody', 'sling', 'tactical'],
    basePrice: 195000,
    price: 195000,
    mrp: 260000,
    cost: 80000,
    status: 'published',
    labels: {
      featured: true,
      trending: true,
      newArrival: true,
      bestSelling: false
    },
    description: '1050D Cordura ballistic nylon sling featuring quick-release Fidlock magnetic buckles, weather-shielded YKK Aquaguard zips, and modular Molle webbing loops.',
    options: {
      Colour: ['Tactical Black', 'Desert Sand', 'Stealth Olive'],
      Size: ['One size']
    },
    images: [
      {
        url: '/assets/e282ebdc1a55d0be.q.jpg',
        alt: 'Nomad Ballistic Crossbody Sling in Tactical Black',
        isFeatured: true
      },
      {
        url: '/assets/08accf483615b0df.q.jpg',
        alt: 'Nomad Ballistic Crossbody Sling Detail',
        isFeatured: false
      }
    ],
    variants: [
      { name: 'Tactical Black / One size', options: { Colour: 'Tactical Black', Size: 'One size' }, price: 195000, stock: 50 },
      { name: 'Desert Sand / One size', options: { Colour: 'Desert Sand', Size: 'One size' }, price: 195000, stock: 35 },
      { name: 'Stealth Olive / One size', options: { Colour: 'Stealth Olive', Size: 'One size' }, price: 195000, stock: 35 }
    ]
  },
  {
    name: 'Obsidian Distressed Selvedge Denim',
    slug: 'obsidian-distressed-selvedge-denim',
    categoryId: 'c_bottoms',
    brand: 'Ramroxa',
    gender: 'Men',
    season: 'SS26',
    tags: ['denim', 'jeans', 'selvedge', 'pants'],
    basePrice: 365000,
    price: 365000,
    mrp: 480000,
    cost: 155000,
    status: 'published',
    labels: {
      featured: true,
      trending: true,
      newArrival: true,
      bestSelling: true
    },
    description: '14.5oz Japanese selvedge denim in a relaxed barrel cut with subtle hand-sanded whiskering, reinforced pocket rivets, and custom matte silver hardware.',
    options: {
      Colour: ['Vintage Black', 'Raw Indigo'],
      Size: ['30', '32', '34', '36']
    },
    images: [
      {
        url: '/assets/2461720fa204607a.q.jpg',
        alt: 'Obsidian Distressed Selvedge Denim',
        isFeatured: true
      },
      {
        url: '/assets/39a84305ed8fadbc.q.jpg',
        alt: 'Obsidian Distressed Selvedge Denim Detail',
        isFeatured: false
      }
    ],
    variants: [
      { name: 'Vintage Black / 30', options: { Colour: 'Vintage Black', Size: '30' }, price: 365000, stock: 30 },
      { name: 'Vintage Black / 32', options: { Colour: 'Vintage Black', Size: '32' }, price: 365000, stock: 45 },
      { name: 'Vintage Black / 34', options: { Colour: 'Vintage Black', Size: '34' }, price: 365000, stock: 40 },
      { name: 'Vintage Black / 36', options: { Colour: 'Vintage Black', Size: '36' }, price: 365000, stock: 20 },
      { name: 'Raw Indigo / 30', options: { Colour: 'Raw Indigo', Size: '30' }, price: 365000, stock: 30 },
      { name: 'Raw Indigo / 32', options: { Colour: 'Raw Indigo', Size: '32' }, price: 365000, stock: 45 },
      { name: 'Raw Indigo / 34', options: { Colour: 'Raw Indigo', Size: '34' }, price: 365000, stock: 40 }
    ]
  },
  {
    name: 'Merino Wool Ribbed Beanie',
    slug: 'merino-wool-ribbed-beanie',
    categoryId: 'c_acc',
    brand: 'Ramroxa',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['beanie', 'hat', 'merino', 'wool'],
    basePrice: 120000,
    price: 120000,
    mrp: 160000,
    cost: 50000,
    status: 'published',
    labels: {
      featured: false,
      trending: true,
      newArrival: true,
      bestSelling: true
    },
    description: '100% extra-fine Merino wool chunky 7-gauge ribbed knit beanie. Soft next-to-skin touch with natural thermoregulation and odor resistance.',
    options: {
      Colour: ['Jet Black', 'Heather Grey', 'Oatmeal'],
      Size: ['One size']
    },
    images: [
      {
        url: '/assets/7f3fd1f72139111d.q.jpg',
        alt: 'Merino Wool Ribbed Beanie in Jet Black',
        isFeatured: true
      },
      {
        url: '/assets/4a9712f500002e24.q.jpg',
        alt: 'Merino Wool Ribbed Beanie Detail',
        isFeatured: false
      }
    ],
    variants: [
      { name: 'Jet Black / One size', options: { Colour: 'Jet Black', Size: 'One size' }, price: 120000, stock: 60 },
      { name: 'Heather Grey / One size', options: { Colour: 'Heather Grey', Size: 'One size' }, price: 120000, stock: 50 },
      { name: 'Oatmeal / One size', options: { Colour: 'Oatmeal', Size: 'One size' }, price: 120000, stock: 45 }
    ]
  },
  {
    name: 'Eclipse Heavyweight Boxy Tee',
    slug: 'eclipse-heavyweight-boxy-tee',
    categoryId: 'c_tops',
    brand: 'Ramroxa',
    gender: 'Unisex',
    season: 'SS26',
    tags: ['tee', 'tshirt', 'boxy', 'heavyweight'],
    basePrice: 210000,
    price: 210000,
    mrp: 270000,
    cost: 85000,
    status: 'published',
    labels: {
      featured: true,
      trending: true,
      newArrival: true,
      bestSelling: true
    },
    description: '280 GSM heavyweight combed cotton boxy tee with structured high-density ribbed crew collar and reinforced double-needle stitched cuffs.',
    options: {
      Colour: ['Pitch Black', 'Pure White', 'Muted Olive'],
      Size: ['S', 'M', 'L', 'XL']
    },
    images: [
      {
        url: '/assets/ea97fe30fd8d1dfc.q.jpg',
        alt: 'Eclipse Heavyweight Boxy Tee in Pitch Black',
        isFeatured: true
      },
      {
        url: '/assets/09789ab9b9e151f6.q.jpg',
        alt: 'Eclipse Heavyweight Boxy Tee in Pure White',
        isFeatured: false
      }
    ],
    variants: [
      { name: 'Pitch Black / S', options: { Colour: 'Pitch Black', Size: 'S' }, price: 210000, stock: 40 },
      { name: 'Pitch Black / M', options: { Colour: 'Pitch Black', Size: 'M' }, price: 210000, stock: 65 },
      { name: 'Pitch Black / L', options: { Colour: 'Pitch Black', Size: 'L' }, price: 210000, stock: 60 },
      { name: 'Pitch Black / XL', options: { Colour: 'Pitch Black', Size: 'XL' }, price: 210000, stock: 35 },
      { name: 'Pure White / M', options: { Colour: 'Pure White', Size: 'M' }, price: 210000, stock: 50 },
      { name: 'Pure White / L', options: { Colour: 'Pure White', Size: 'L' }, price: 210000, stock: 50 },
      { name: 'Muted Olive / M', options: { Colour: 'Muted Olive', Size: 'M' }, price: 210000, stock: 35 },
      { name: 'Muted Olive / L', options: { Colour: 'Muted Olive', Size: 'L' }, price: 210000, stock: 35 }
    ]
  }
];

async function addProducts() {
  console.log('🔑 Authenticating as admin...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@zylo.com.np',
      password: 'AdminPassword123!'
    })
  });

  const loginData = await loginRes.json();
  if (!loginData?.data?.accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }

  const token = loginData.data.accessToken;
  const cookie = loginRes.headers.get('set-cookie');
  console.log('✅ Admin authenticated successfully.');

  let addedCount = 0;
  for (const prod of newProducts) {
    console.log(`📦 Adding "${prod.name}"...`);
    const createRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(cookie ? { 'Cookie': cookie } : {})
      },
      body: JSON.stringify(prod)
    });

    const createData = await createRes.json();
    if (createRes.ok && createData?.data) {
      console.log(`   ✓ Created: ${prod.name} (Slug: ${prod.slug}, Price: Rs ${prod.price / 100})`);
      addedCount++;
    } else {
      console.warn(`   ! Failed to create ${prod.name}:`, createData.message || createData);
    }
  }

  console.log(`\n🎉 Successfully added ${addedCount} / ${newProducts.length} new products to backend!`);
}

addProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Execution error:', err);
    process.exit(1);
  });
