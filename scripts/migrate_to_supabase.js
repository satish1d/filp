// Automated Supabase Migration Script
// Reads data/products.json and safely upserts all 54 products into Supabase

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_URL = rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Migration Error] Missing Supabase credentials!');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  const dataPath = path.join(__dirname, '..', 'data', 'products.json');
  if (!fs.existsSync(dataPath)) {
    console.error('[Migration Error] data/products.json not found at:', dataPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(raw);
  const products = data.products || [];

  console.log(`[Migration] Preparing to migrate ${products.length} products to Supabase...`);

  // Transform to table row format matching schema
  const rows = products.map(p => ({
    id: p.id,
    md5_id: p.md5_id,
    name: p.name,
    short_name: p.short_name,
    brand: p.brand,
    category: p.category || 'Kitchen',
    selling_price: p.selling_price || 0,
    mrp: p.mrp || 0,
    deal_price: p.deal_price || 0,
    discount_percent: p.discount_percent || 0,
    discount_label: p.discount_label || '',
    rating: String(p.rating || '4.4'),
    rating_stars: Number(p.rating_stars || 4.4),
    review_count: String(p.review_count || '1,248'),
    ad: Boolean(p.ad),
    authorized_seller: p.authorized_seller !== false,
    assured: p.assured !== false,
    badge: p.badge || 'Big Billion Days Price',
    delivery_text: p.delivery_text || 'Free Delivery by 12 Oct',
    seller_name: p.seller_name || 'RetailNet',
    seller_rating: p.seller_rating || '4.4 ★ • 5 years with Flipkart',
    img1: p.img1 || '',
    images: Array.isArray(p.images) ? p.images : (p.img1 ? [p.img1] : []),
    features: p.features || '',
    specs: p.specs || {}
  }));

  // Batch upsert in chunks of 25 to avoid payload limits
  const chunkSize = 25;
  let successCount = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data: result, error } = await supabase
      .from('products')
      .upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.error(`[Migration Error] Failed on chunk ${i} - ${i + chunk.length}:`, error);
      throw error;
    }
    successCount += chunk.length;
    console.log(`[Migration] Upserted ${successCount}/${rows.length} products successfully.`);
  }

  console.log(`\n🎉 [Migration Complete] Successfully migrated all ${successCount} products to Supabase!`);
}

runMigration().catch(err => {
  console.error('[Fatal Migration Error]', err);
  process.exit(1);
});
