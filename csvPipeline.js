// CSV Processing and Product Pipeline
// Handles RFC 4180 CSV parsing, field normalization, image validation,
// and transformation into complete Flipkart storefront product objects.

export function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  // Strip UTF-8 BOM if present
  let text = csvText.replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote ("") inside quoted string
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Push final field and row if any
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  // Header detection with normalized keys
  const headers = rows[0].map(h => normalizeHeader(h));
  const dataRows = rows.slice(1);

  const parsedObjects = [];
  for (const row of dataRows) {
    if (row.length === 0 || row.every(val => !val)) continue;
    const obj = {};
    headers.forEach((header, index) => {
      if (header) {
        obj[header] = row[index] !== undefined ? row[index] : '';
      }
    });
    parsedObjects.push(obj);
  }

  return parsedObjects;
}

function normalizeHeader(raw) {
  if (!raw) return '';
  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (['id', 'productid', 'sku', 'itemid', 'srno', 'sno'].includes(clean)) return 'id';
  if (['name', 'productname', 'title', 'producttitle', 'itemname', 'itemtitle', 'descriptiontitle'].includes(clean)) return 'name';
  if (['price', 'sellingprice', 'sp', 'dealprice', 'finalprice', 'discountedprice', 'saleprice'].includes(clean)) return 'selling_price';
  if (['mrp', 'regularprice', 'originalprice', 'listprice', 'actualprice', 'baseprice'].includes(clean)) return 'mrp';
  if (['category', 'cat', 'department', 'type', 'prodtype'].includes(clean)) return 'category';
  if (['brand', 'brandname', 'maker', 'manufacturer'].includes(clean)) return 'brand';
  if (['img', 'image', 'images', 'imageurl', 'imgurl', 'img1', 'image1', 'photo', 'picture'].includes(clean)) return 'img1';
  if (['rating', 'rate', 'stars', 'ratingstars'].includes(clean)) return 'rating';
  if (['reviews', 'reviewcount', 'numreviews', 'ratingscount'].includes(clean)) return 'review_count';
  if (['description', 'features', 'details', 'about', 'desc'].includes(clean)) return 'features';
  if (['specs', 'specifications'].includes(clean)) return 'specs';
  if (['delivery', 'deliverytext'].includes(clean)) return 'delivery_text';
  if (['seller', 'sellername'].includes(clean)) return 'seller_name';
  
  return clean;
}

const KNOWN_BRANDS = [
  'ACTIVA', 'Amazon Basics', 'Atomberg', 'Bosch', 'Cello', 'Faber',
  'Havells', 'HIFRESH', 'Hindware', 'IBELL', 'Larah by Borosil', 'Larah',
  'LG', 'Lifelong', 'LONGWAY', 'MILTON', 'Nirlon', 'NUUK', 'Philips',
  'Pigeon', 'Polycab', 'Preethi', 'Prestige', 'Sunshine', 'SUPER TOY', 'Symphony',
  'USHA', 'V-Guard', 'Vinod', 'Whirlpool', 'Wonderchef', 'Sujata', 'Bajaj',
  'Crompton', 'Wipro', 'Borosil', 'Sunmeet', 'Libra', 'Vidiem',
  'Orpat', 'KWER', 'LOMESH', 'PAGASUS', 'CostarMatter', 'FLIPZON', 'Synergy',
  'LiMETRO STEEL', 'LiMETRO', 'AGARO', 'Glen', 'KENT', 'Butterfly', 'Hawkins', 'Morphy Richards'
];

export function cleanBrand(title, explicitBrand) {
  if (explicitBrand && explicitBrand.trim()) {
    return explicitBrand.trim();
  }
  if (!title) return 'Kitchen Pro';
  for (const b of KNOWN_BRANDS) {
    if (title.toLowerCase().startsWith(b.toLowerCase())) {
      return b;
    }
  }
  const parts = title.trim().split(/\s+/);
  return parts[0] || 'Kitchen';
}

export function cleanShortName(name) {
  if (!name) return 'Kitchen Product';
  const clean = name.replace(/\s+/g, ' ').trim();
  return clean.length <= 32 ? clean : clean.slice(0, 29) + '...';
}

export function slugify(text) {
  if (!text) return 'item';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 40);
}

export function parseNumber(val, defaultVal = 0) {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return Math.round(val);
  const cleanStr = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? defaultVal : Math.round(num);
}

export function buildFeaturesAndSpecs(name, brand, category, sp, mrp, userFeatures) {
  if (userFeatures && userFeatures.trim() && userFeatures.includes('<')) {
    return {
      features: userFeatures.trim(),
      specs: {
        'Brand': brand,
        'Category': category,
        'Warranty': '1 Year Manufacturer Warranty',
        'Flipkart Assured': 'Yes - 100% Genuine Quality Check Verified',
        'Package Contents': '1 Main Unit, User Manual, Warranty Card',
        'Material': 'Food-Grade Stainless Steel / Non-Stick / Toughened Glass',
        'Dishwasher Safe': 'Yes',
        'Compatibility': 'Gas Stove & Induction Compatible'
      }
    };
  }

  const tLower = (name || '').toLowerCase();
  let features = [];
  let specs = {
    'Brand': brand,
    'Category': category,
    'Warranty': '1 Year Manufacturer Warranty',
    'Flipkart Assured': 'Yes - 100% Genuine Quality Check Verified',
    'Package Contents': '1 Main Unit, User Manual, Warranty Card'
  };

  if (tLower.includes('cook') || tLower.includes('pan') || tLower.includes('pot') || tLower.includes('tawa') || tLower.includes('kadhai')) {
    features = [
      '<b>Non-Stick / Food-Grade Cooking:</b> Scratch-resistant surface designed for low oil and uniform heating.',
      '<b>Heavy-Gauge Base:</b> Resists warping and maintains structural durability over years.',
      '<b>Cool-Touch Ergonomic Handle:</b> Bakelite heat-insulated handle ensuring safe and comfortable grip.',
      '<b>Warranty:</b> 1 Year standard manufacturer replacement warranty.'
    ];
    specs['Material'] = 'Hard Anodised / Food-Grade Aluminium';
    specs['Dishwasher Safe'] = 'Yes';
    specs['Compatibility'] = 'Gas Stove & Induction Base Compatible';
  } else if (tLower.includes('mixer') || tLower.includes('grinder') || tLower.includes('juicer') || tLower.includes('blender')) {
    features = [
      '<b>Heavy-Duty Copper Motor:</b> High-torque motor for ultra-fine grinding of tough spices and batter.',
      '<b>Stainless Steel Jars:</b> 3 food-grade rust-resistant stainless steel jars with flow breakers.',
      '<b>Overload Protection:</b> Automatic thermal circuit breaker preventing motor overheat.',
      '<b>Warranty:</b> 2 Years on motor, 1 Year comprehensive warranty.'
    ];
    specs['Motor Power'] = '750W High Torque';
    specs['Jar Material'] = '100% Food-Grade Stainless Steel';
    specs['Speed Settings'] = '3 Speed Control + Pulse';
    specs['Locking Mechanism'] = 'Hands-Free Jar Lock';
  } else if (tLower.includes('kettle') || tLower.includes('boiler') || tLower.includes('toaster') || tLower.includes('sandwich')) {
    features = [
      '<b>Instant Rapid Heating:</b> Concealed heating element for fast boiling and uniform browning.',
      '<b>Auto Cut-off & Dry Boil Protection:</b> Switches off automatically once operation is complete.',
      '<b>Food-Grade Interior:</b> Pure stainless steel housing keeping water and food 100% odor-free.',
      '<b>Warranty:</b> 1 Year brand warranty.'
    ];
    specs['Operating Voltage'] = '220V - 240V AC';
    specs['Housing Material'] = 'Food-Grade Stainless Steel';
    specs['Auto Cut-Off'] = 'Yes (Bi-metallic sensor)';
  } else {
    features = [
      `<b>Premium Build & Safety:</b> Heavy-gauge durable construction with high thermal resistance.`,
      `<b>Scratch-Resistant Finish:</b> Designed for everyday kitchen use with uniform heat distribution.`,
      `<b>Easy to Clean:</b> Stain resistant non-stick / food-grade stainless steel surface.`,
      `<b>Warranty:</b> 1 Year standard manufacturer warranty.`
    ];
    specs['Material'] = 'Food-Grade Aluminium / Stainless Steel / Toughened Glass';
    specs['Dishwasher Safe'] = 'Yes';
    specs['Compatibility'] = 'Gas Stove & Induction Compatible';
  }

  const featuresHtml = `<p><b>${brand} - Official Big Billion Days Selection</b></p><ul>` +
    features.map(f => `<li>${f}</li>`).join('') + `</ul>`;

  return { features: featuresHtml, specs };
}

// Transform raw CSV row into fully-populated storefront Product
export function transformRowToProduct(row, index, existingMaxId = 0) {
  // 1. Determine ID
  let id = row.id ? parseNumber(row.id, 0) : 0;
  if (!id || id <= 0) {
    id = existingMaxId + index + 1;
  }

  // 2. Name & Category
  const name = (row.name || row.title || `Kitchen Appliance ${id}`).trim();
  const category = (row.category || 'Kitchen').trim() || 'Kitchen';
  const brand = cleanBrand(name, row.brand);
  const short_name = cleanShortName(name);

  // 3. Pricing
  let sp = parseNumber(row.selling_price || row.price, 0);
  let mrp = parseNumber(row.mrp, 0);

  if (sp <= 0 && mrp > 0) {
    sp = Math.max(99, Math.round(mrp * 0.7));
  } else if (mrp <= 0 && sp > 0) {
    mrp = Math.round(sp * 1.8);
  } else if (sp <= 0 && mrp <= 0) {
    sp = 499;
    mrp = 1499;
  }

  if (mrp < sp) {
    mrp = Math.round(sp * 1.4);
  }

  let discount_percent = Math.round((1.0 - (sp / mrp)) * 100);
  discount_percent = Math.max(5, Math.min(95, discount_percent));
  const discount_label = `↓ ${discount_percent}%`;
  const deal_price = Math.max(49, sp - 30);

  // 4. Rating & Reviews
  const ratingNum = parseFloat(row.rating) || (4.2 + (id % 7) * 0.1);
  const rating_stars = Math.min(5.0, Math.max(3.5, parseFloat(ratingNum.toFixed(1))));
  const rating = rating_stars.toFixed(1);
  const review_count = row.review_count || `${(800 + (id * 97) % 3500).toLocaleString('en-IN')}`;

  // 5. Images pipeline: ensure strict matching per row
  let rawImg = row.img1 || row.image || row.images || '';
  let imageList = [];
  if (rawImg) {
    // Check if separated by comma, semicolon, or newline
    const splits = rawImg.split(/[,;\n|]/).map(s => s.trim()).filter(Boolean);
    if (splits.length > 0) {
      imageList = splits;
    }
  }

  const defaultKitchenImg = 'https://cdn.shopify.com/s/files/1/0596/9743/0617/files/81-sJRhEapL._SX679.jpg?v=1713050191';
  const primaryImg = imageList.length > 0 ? imageList[0] : defaultKitchenImg;
  const finalImages = imageList.length > 0 ? imageList : [primaryImg];

  // 6. Slug & MD5 ID
  const slug = `${slugify(brand)}-${slugify(name.slice(0, 20))}-${id}`;

  // 7. Features & Specs
  const { features, specs } = buildFeaturesAndSpecs(name, brand, category, sp, mrp, row.features);

  return {
    id,
    md5_id: slug,
    name,
    short_name,
    brand,
    category,
    rating,
    rating_stars,
    review_count,
    ad: id % 5 === 0,
    authorized_seller: true,
    discount_label,
    discount_percent,
    mrp,
    selling_price: sp,
    deal_price,
    badge: 'Big Billion Days Price',
    delivery_text: row.delivery_text || 'Delivery in 2-3 Days',
    seller_name: row.seller_name || 'RetailNet',
    seller_rating: '4.4 ★ • 5 years with Flipkart',
    img1: primaryImg,
    images: finalImages,
    features,
    specs,
    assured: true
  };
}

// Convert JSON Catalog back into downloadable CSV
export function catalogToCSV(products) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return 'id,name,brand,category,selling_price,mrp,img1,rating,review_count\n';
  }

  const headers = ['id', 'name', 'brand', 'category', 'selling_price', 'mrp', 'discount_percent', 'img1', 'rating', 'review_count', 'delivery_text'];

  const rows = products.map(p => {
    return headers.map(header => {
      let val = p[header];
      if (val === undefined || val === null) val = '';
      if (typeof val === 'string') {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

// Generate a clean sample CSV for user download
export function getSampleCSV() {
  return [
    'id,name,brand,category,selling_price,mrp,img1,rating,review_count',
    '101,"Amazon Basics Non-Stick 8-Piece Cookware Set (Black)","Amazon Basics","Kitchen",311,2999,"https://cdn.shopify.com/s/files/1/0596/9743/0617/files/81-sJRhEapL._SX679.jpg?v=1713050191",4.5,"1,248"',
    '102,"Prestige 750W Iris Mixer Grinder with 3 Stainless Steel Jars","Prestige","Kitchen",1299,3495,"https://cdn.shopify.com/s/files/1/0596/9743/0617/files/81r1j1NlTJL._SX679.jpg?v=1713050191",4.4,"3,820"',
    '103,"Pigeon by Stovekraft 1.5 Litre Electric Kettle (Silver)","Pigeon","Kitchen",449,1195,"https://cdn.shopify.com/s/files/1/0596/9743/0617/files/81Wn05k7yLL._SX679.jpg?v=1713050191",4.3,"5,410"',
    '104,"Milton Thermosteel Flip Lid Flask 1000ml (Silver)","MILTON","Kitchen",599,1060,"https://cdn.shopify.com/s/files/1/0596/9743/0617/files/71c8-i6d8xL._SX679.jpg?v=1713050191",4.6,"2,150"',
    '105,"Cello Prima Induction Base Non-Stick Dosa Tawa 280mm","Cello","Kitchen",399,990,"https://cdn.shopify.com/s/files/1/0596/9743/0617/files/61eU8L3E86L._SX679.jpg?v=1713050191",4.2,"940"'
  ].join('\r\n');
}
