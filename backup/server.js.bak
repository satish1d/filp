import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseCSV, transformRowToProduct, catalogToCSV, getSampleCSV, cleanBrand, cleanShortName, slugify } from './csvPipeline.js';

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
app.delete('/api/products/:id', (req, res) => {
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

    console.log(`[API] Deleted product id=${targetId} ("${deletedItem.name}"). Products remaining: ${data.products.length}`);

    res.json({
      success: true,
      message: `Product "${deletedItem.name}" deleted successfully from live database.`,
      deletedId: targetId,
      remainingCount: data.products.length
    });
  } catch (err) {
    console.error('[API] Delete product failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/products - Add a new single product
app.post('/api/products', (req, res) => {
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

    res.json({
      success: true,
      message: 'Product added successfully to live database.',
      product: transformed,
      totalCount: data.products.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. PUT /api/products/:id - Edit an existing product
app.put('/api/products/:id', (req, res) => {
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

    res.json({
      success: true,
      message: 'Product updated successfully in live database.',
      product: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/upload-csv - Upload and parse CSV to update live database
app.post('/api/upload-csv', (req, res) => {
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

    console.log(`[API] CSV imported. Mode=${mode}. Rows=${parsedRows.length}. Total live products now: ${finalList.length}`);

    res.json({
      success: true,
      message: `CSV pipeline completed! Successfully updated live website with ${finalList.length} products.`,
      mode,
      parsedRowsCount: parsedRows.length,
      totalCount: finalList.length,
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

// ----------------- STATIC ASSETS -----------------
app.use(express.static(__dirname));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Filp server running at http://0.0.0.0:${PORT}`);
});

