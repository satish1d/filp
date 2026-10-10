import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { parseCSV, transformRowToProduct, catalogToCSV, getSampleCSV, cleanBrand, cleanShortName, slugify } from './csvPipeline.js';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');

// Body parsers with generous limits for bulk CSV and image payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '50mb' }));

// Anti-cache middleware for data and API routes so live website updates instantly
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/data')) {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
  }
  next();
});

// Helper to safely read products data
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { products: [], similar_products: [], reviews: [], review_photos: [] };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading data file:', err);
    return { products: [], similar_products: [], reviews: [], review_photos: [] };
  }
}

// Helper to safely write products data atomically
function writeData(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('Error writing data file:', err);
    throw err;
  }
}

// ----------------- REST API ROUTES -----------------

// 0. GET & POST /api/config - Safe public client Supabase config (NEVER exposes secret service role key)
function sanitizeSupabaseUrl(url) {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

function getSupabaseServerClient() {
  const url = sanitizeSupabaseUrl(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

app.get('/api/config', (req, res) => {
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  res.json({
    supabaseUrl: sanitizeSupabaseUrl(rawUrl),
    supabaseAnonKey: (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim()
  });
});

// GET /api/supabase/status - Detailed backend status check
app.get('/api/supabase/status', async (req, res) => {
  try {
    const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
    const hasAnon = Boolean(process.env.VITE_SUPABASE_ANON_KEY);
    const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!supabaseUrl || (!hasAnon && !hasService)) {
      return res.json({
        configured: false,
        connected: false,
        supabaseUrl,
        tablesExist: false,
        message: 'Supabase URL or keys not configured yet.'
      });
    }

    const sb = getSupabaseServerClient();
    if (!sb) {
      return res.json({ configured: false, connected: false, message: 'Could not create Supabase client instance.' });
    }

    // Ping products table in Supabase
    const { data, count, error } = await sb.from('products').select('id', { count: 'exact' }).limit(1);

    if (error) {
      const isMissingTable = error.code === 'PGRST205' || (error.message && error.message.includes('schema cache'));
      return res.json({
        configured: true,
        connected: true,
        supabaseUrl,
        tablesExist: false,
        error: error.message,
        errorCode: error.code,
        sqlEditorUrl: `https://supabase.com/dashboard/project/${supabaseUrl.replace('https://', '').split('.')[0]}/sql/new`,
        message: isMissingTable
          ? "Supabase project reachable, but table 'public.products' has not been created yet. Run the master SQL setup in Supabase SQL Editor."
          : error.message
      });
    }

    return res.json({
      configured: true,
      connected: true,
      supabaseUrl,
      tablesExist: true,
      productCount: count !== null && count !== undefined ? count : (data ? data.length : 0),
      message: 'Supabase tables and real-time backend are fully active and connected!'
    });
  } catch (err) {
    res.status(500).json({ configured: false, connected: false, error: err.message });
  }
});

// GET /api/supabase/sql - Get full setup SQL script
app.get('/api/supabase/sql', (req, res) => {
  try {
    const sqlPath = path.join(__dirname, 'supabase', 'setup_all.sql');
    if (!fs.existsSync(sqlPath)) {
      return res.status(404).json({ error: 'SQL setup file not found' });
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', 'attachment; filename="flipkart_supabase_backend_setup.sql"');
      res.setHeader('Content-Type', 'application/sql');
      return res.send(sql);
    }
    const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
    const projectId = supabaseUrl.replace('https://', '').split('.')[0] || 'your-project-ref';
    res.json({
      success: true,
      sql,
      bytes: sql.length,
      projectId,
      sqlEditorUrl: `https://supabase.com/dashboard/project/${projectId}/sql/new`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/supabase/sync - Upsert local 54 products into Supabase
app.post('/api/supabase/sync', async (req, res) => {
  try {
    const sb = getSupabaseServerClient();
    if (!sb) {
      return res.status(400).json({ success: false, error: 'Supabase client could not be initialized' });
    }

    const data = readData();
    const products = data.products || [];

    // Verify table exists before attempting bulk upsert
    const check = await sb.from('products').select('id').limit(1);
    if (check.error) {
      return res.status(400).json({
        success: false,
        error: check.error.message,
        errorCode: check.error.code,
        tablesExist: false,
        hint: 'Please run the setup SQL in Supabase SQL Editor first, then click Sync.'
      });
    }

    // Format all products helper
function formatProductForSupabase(p) {
  return {
    id: Number(p.id),
    md5_id: p.md5_id || String(p.id),
    name: p.name || '',
    short_name: p.short_name || cleanShortName(p.name || ''),
    brand: p.brand || cleanBrand(p.name || '', ''),
    category: p.category || 'Kitchen',
    selling_price: Number(p.selling_price) || 0,
    mrp: Number(p.mrp) || 0,
    deal_price: Number(p.deal_price) || 0,
    discount_percent: Number(p.discount_percent) || 0,
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
    img1: p.img1 || (Array.isArray(p.images) && p.images[0]) || '',
    images: Array.isArray(p.images) ? p.images : (p.img1 ? [p.img1] : []),
    features: p.features || '',
    specs: (typeof p.specs === 'object' && p.specs !== null) ? p.specs : {}
  };
}

    const rows = products.map(formatProductForSupabase);

    let upserted = 0;
    for (let i = 0; i < rows.length; i += 25) {
      const chunk = rows.slice(i, i + 25);
      const { error: upsertErr } = await sb.from('products').upsert(chunk, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
      upserted += chunk.length;
    }

    res.json({
      success: true,
      message: `Successfully synced all ${upserted} products to Supabase!`,
      count: upserted
    });
  } catch (err) {
    console.error('Supabase sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const { supabaseUrl, supabaseAnonKey } = req.body || {};
    if (supabaseUrl) {
      process.env.VITE_SUPABASE_URL = sanitizeSupabaseUrl(supabaseUrl);
    }
    if (supabaseAnonKey) {
      process.env.VITE_SUPABASE_ANON_KEY = supabaseAnonKey.trim();
    }

    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (/^VITE_SUPABASE_URL=/m.test(envContent)) {
      envContent = envContent.replace(/^VITE_SUPABASE_URL=.*$/m, `VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL || ''}`);
    } else {
      envContent += `\nVITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL || ''}`;
    }

    if (/^VITE_SUPABASE_ANON_KEY=/m.test(envContent)) {
      envContent = envContent.replace(/^VITE_SUPABASE_ANON_KEY=.*$/m, `VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY || ''}`);
    } else {
      envContent += `\nVITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY || ''}`;
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

    res.json({
      success: true,
      message: 'Supabase configuration updated successfully',
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      configured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. GET /api/products - Get all products with summary stats
app.get('/api/products', (req, res) => {
  try {
    const data = readData();
    const products = data.products || [];
    const kitchenCount = products.filter(p => (p.category || '').toLowerCase() === 'kitchen').length;
    
    // Extract unique categories and brands
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];

    res.json({
      success: true,
      count: products.length,
      kitchenCount,
      categories,
      brands,
      products
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /api/products/:id - Get single product
app.get('/api/products/:id', (req, res) => {
  try {
    const data = readData();
    const targetId = req.params.id;
    const prod = (data.products || []).find(p => String(p.id) === targetId || String(p.md5_id) === targetId);
    if (!prod) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product: prod });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. DELETE /api/products/:id - Delete product from database in real time
app.delete('/api/products/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    const data = readData();
    const originalLength = (data.products || []).length;

    const deletedItem = data.products.find(p => String(p.id) === targetId || String(p.md5_id) === targetId);
    if (!deletedItem) {
      return res.status(404).json({ success: false, error: `Product with ID "${targetId}" not found in database` });
    }

    // Filter out from products list
    data.products = data.products.filter(p => String(p.id) !== targetId && String(p.md5_id) !== targetId);

    // Also remove from similar_products if present
    if (Array.isArray(data.similar_products)) {
      data.similar_products = data.similar_products.filter(p => String(p.id) !== targetId && String(p.md5_id) !== targetId);
    }

    writeData(data);

    // Synchronize deletion to Supabase PostgreSQL table in real time
    let sbDeleted = false;
    try {
      const sb = getSupabaseServerClient();
      if (sb) {
        if (/^\d+$/.test(String(targetId))) {
          await sb.from('products').delete().or(`id.eq.${targetId},md5_id.eq.${targetId}`);
        } else {
          await sb.from('products').delete().eq('md5_id', targetId);
        }
        sbDeleted = true;
      }
    } catch (sbErr) {
      console.warn('[API Delete] Supabase deletion sync note:', sbErr.message);
    }

    console.log(`[API] Deleted product id=${targetId} ("${deletedItem.name}"). Supabase sync: ${sbDeleted}. Remaining: ${data.products.length}`);

    res.json({
      success: true,
      message: `Product "${deletedItem.name}" deleted successfully from live database.`,
      deletedId: targetId,
      remainingCount: data.products.length,
      supabaseSynced: sbDeleted
    });
  } catch (err) {
    console.error('[API] Delete product failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/products - Add a new single product
app.post('/api/products', async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.name) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }

    const data = readData();
    const existing = data.products || [];
    const maxId = existing.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
    const newId = body.id ? Number(body.id) : (maxId + 1);

    const transformed = transformRowToProduct({
      id: newId,
      name: body.name,
      category: body.category || 'Kitchen',
      brand: body.brand,
      selling_price: body.selling_price || body.price,
      mrp: body.mrp,
      img1: body.img1 || body.image,
      rating: body.rating,
      review_count: body.review_count,
      features: body.features
    }, 0, maxId);

    // Prepend or append
    data.products.unshift(transformed);
    writeData(data);

    // Sync to Supabase in real time
    let sbSynced = false;
    try {
      const sb = getSupabaseServerClient();
      if (sb) {
        const row = formatProductForSupabase(transformed);
        await sb.from('products').upsert(row, { onConflict: 'id' });
        sbSynced = true;
      }
    } catch (sbErr) {
      console.warn('[API Add] Supabase upsert note:', sbErr.message);
    }

    res.json({
      success: true,
      message: 'Product added successfully to live database.',
      product: transformed,
      totalCount: data.products.length,
      supabaseSynced: sbSynced
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. PUT /api/products/:id - Edit an existing product
app.put('/api/products/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    const body = req.body;
    const data = readData();
    const index = (data.products || []).findIndex(p => String(p.id) === targetId || String(p.md5_id) === targetId);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const current = data.products[index];
    const sp = body.selling_price !== undefined ? Number(body.selling_price) : current.selling_price;
    const mrp = body.mrp !== undefined ? Number(body.mrp) : current.mrp;
    const disc = mrp > sp ? Math.max(5, Math.min(95, Math.round((1 - (sp / mrp)) * 100))) : 50;

    const updated = {
      ...current,
      name: body.name || current.name,
      short_name: cleanShortName(body.name || current.name),
      brand: cleanBrand(body.name || current.name, body.brand || current.brand),
      category: body.category || current.category,
      selling_price: sp,
      mrp: mrp,
      deal_price: Math.max(49, sp - 30),
      discount_percent: disc,
      discount_label: `↓ ${disc}%`,
      img1: body.img1 || current.img1,
      images: body.images || (body.img1 ? [body.img1] : current.images),
      rating: body.rating !== undefined ? String(body.rating) : current.rating,
      review_count: body.review_count || current.review_count
    };

    data.products[index] = updated;
    writeData(data);

    // Sync to Supabase in real time
    let sbSynced = false;
    try {
      const sb = getSupabaseServerClient();
      if (sb) {
        const row = formatProductForSupabase(updated);
        await sb.from('products').upsert(row, { onConflict: 'id' });
        sbSynced = true;
      }
    } catch (sbErr) {
      console.warn('[API Edit] Supabase update note:', sbErr.message);
    }

    res.json({
      success: true,
      message: 'Product updated successfully in live database.',
      product: updated,
      supabaseSynced: sbSynced
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/upload-csv - Upload and parse CSV to update live database
app.post('/api/upload-csv', async (req, res) => {
  try {
    let csvText = '';
    let mode = 'replace'; // 'replace' or 'append'

    if (typeof req.body === 'string') {
      csvText = req.body;
      mode = req.query.mode || 'replace';
    } else if (req.body && typeof req.body === 'object') {
      csvText = req.body.csv || req.body.csvContent || '';
      mode = req.body.mode || req.query.mode || 'replace';
    }

    if (!csvText || !csvText.trim()) {
      return res.status(400).json({ success: false, error: 'Empty CSV content received. Please provide valid CSV data.' });
    }

    const parsedRows = parseCSV(csvText);
    if (!parsedRows || parsedRows.length === 0) {
      return res.status(400).json({ success: false, error: 'Could not parse any product rows from the provided CSV. Check headers and format.' });
    }

    const currentData = readData();
    const existingProducts = currentData.products || [];
    const maxExistingId = existingProducts.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);

    const transformedProducts = parsedRows.map((row, idx) => {
      return transformRowToProduct(row, idx, maxExistingId);
    });

    let finalList = [];
    let addedCount = 0;
    let updatedCount = 0;

    if (mode === 'append') {
      const existingMap = new Map();
      existingProducts.forEach(p => existingMap.set(String(p.id), p));

      transformedProducts.forEach(newProd => {
        const idKey = String(newProd.id);
        if (existingMap.has(idKey)) {
          existingMap.set(idKey, newProd);
          updatedCount++;
        } else {
          existingMap.set(idKey, newProd);
          addedCount++;
        }
      });
      finalList = Array.from(existingMap.values());
    } else {
      // Replace mode: entire catalog is replaced with the uploaded CSV
      finalList = transformedProducts;
      addedCount = transformedProducts.length;
    }

    currentData.products = finalList;
    writeData(currentData);

    // Real-time synchronization to Supabase
    let supabaseSynced = false;
    let supabaseSyncMessage = '';
    try {
      const sb = getSupabaseServerClient();
      if (sb) {
        const rows = finalList.map(formatProductForSupabase);
        for (let i = 0; i < rows.length; i += 25) {
          const chunk = rows.slice(i, i + 25);
          const { error: upErr } = await sb.from('products').upsert(chunk, { onConflict: 'id' });
          if (upErr) throw upErr;
        }

        if (mode === 'replace') {
          const keepIds = new Set(finalList.map(p => Number(p.id)));
          const { data: dbRows } = await sb.from('products').select('id');
          if (dbRows && dbRows.length > 0) {
            const deleteIds = dbRows.map(r => r.id).filter(id => !keepIds.has(Number(id)));
            if (deleteIds.length > 0) {
              for (let i = 0; i < deleteIds.length; i += 25) {
                const chunk = deleteIds.slice(i, i + 25);
                await sb.from('products').delete().in('id', chunk);
              }
            }
          }
        }
        supabaseSynced = true;
        supabaseSyncMessage = ` • Synced ${finalList.length} products to Supabase`;
      }
    } catch (sbErr) {
      console.warn('[API CSV] Supabase live sync notice (local database updated):', sbErr.message);
    }

    console.log(`[API] CSV imported. Mode=${mode}. Rows=${parsedRows.length}. Supabase sync=${supabaseSynced}. Total live products now: ${finalList.length}`);

    res.json({
      success: true,
      message: `CSV pipeline completed! Successfully updated live website with ${finalList.length} products.${supabaseSyncMessage}`,
      mode,
      parsedRowsCount: parsedRows.length,
      totalCount: finalList.length,
      supabaseSynced,
      sample: finalList.slice(0, 3)
    });
  } catch (err) {
    console.error('[API] CSV Upload failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. GET /api/export-csv - Download current catalog as CSV file
app.get('/api/export-csv', (req, res) => {
  try {
    const data = readData();
    const csvContent = catalogToCSV(data.products || []);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="flipkart_kitchen_catalog.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET /api/sample-csv - Download sample template CSV file
app.get('/api/sample-csv', (req, res) => {
  try {
    const sample = getSampleCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sample_kitchen_products_template.csv"');
    res.send(sample);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. POST /checkout/cashfree - Cashfree Hosted Checkout API endpoint
app.post('/checkout/cashfree', async (req, res) => {
  try {
    const orderData = req.body || {};
    const amount = Number(orderData.amount) || Number(orderData.totalAmount) || 999;
    const orderId = orderData.orderId || ('OD' + Math.floor(10000000000000 + Math.random() * 90000000000000));
    const customerPhone = String(orderData.phone || '9876543210').replace(/\D/g, '').slice(-10) || '9876543210';
    const customerName = orderData.name || 'Customer';

    const cfAppId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
    const cfSecret = process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET;
    const cfEnv = process.env.CASHFREE_ENV || 'TEST';

    let redirectUrl = null;

    if (cfAppId && cfSecret) {
      const cfBaseUrl = cfEnv === 'PROD' 
        ? 'https://api.cashfree.com/pg' 
        : 'https://sandbox.cashfree.com/pg';
      
      const cfResponse = await fetch(`${cfBaseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cfAppId,
          'x-client-secret': cfSecret,
          'x-api-version': '2023-08-01'
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: amount,
          order_currency: 'INR',
          customer_details: {
            customer_id: 'CUST_' + customerPhone,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: orderData.email || `${customerPhone}@customer.com`
          },
          order_meta: {
            return_url: `${req.protocol}://${req.get('host')}/order-success.html?orderId=${orderId}`
          }
        })
      });

      if (cfResponse.ok) {
        const cfData = await cfResponse.json();
        redirectUrl = cfData.payment_link || (cfData.payment_session_id ? `https://${cfEnv === 'PROD' ? 'payments' : 'sandbox'}.cashfree.com/pg/orders/${cfData.order_id}` : null);
      } else {
        const errBody = await cfResponse.text();
        console.warn('[Cashfree] Gateway responded with error:', errBody);
      }
    }

    // Default return redirect URL if testing without live Cashfree credentials
    if (!redirectUrl) {
      redirectUrl = `/order-success.html?orderId=${encodeURIComponent(orderId)}`;
    }

    return res.json({
      success: true,
      redirect_url: redirectUrl,
      order_id: orderId
    });
  } catch (err) {
    console.error('[Cashfree] Order processing failed:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process payment request',
      message: err.message
    });
  }
});

// ----------------- STATIC ASSETS -----------------
app.use(express.static(__dirname));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Filp server running at http://0.0.0.0:${PORT}`);
});

