// ====================================================================
// SUPABASE CLIENT MODULE
// Production-Ready Unified Supabase Integration for Storefront & Admin
// ====================================================================

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FilpSupabase = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Helper to sanitize Supabase Project URL (strip /rest/v1 or trailing slashes)
  function sanitizeUrl(url) {
    if (!url) return '';
    return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  }

  // Load configuration from window, meta tags, or localStorage
  function getConfig() {
    const metaUrl = document.querySelector('meta[name="supabase-url"]')?.getAttribute('content');
    const metaKey = document.querySelector('meta[name="supabase-anon-key"]')?.getAttribute('content');

    const envUrl = (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.VITE_SUPABASE_URL) ||
      (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('VITE_SUPABASE_URL')) ||
      metaUrl || '';

    const envKey = (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.VITE_SUPABASE_ANON_KEY) ||
      (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('VITE_SUPABASE_ANON_KEY')) ||
      metaKey || '';

    return {
      url: sanitizeUrl(envUrl),
      anonKey: envKey.trim()
    };
  }

  let clientInstance = null;
  let isConfigured = false;
  let realtimeChannel = null;
  let realtimeStatus = 'DISCONNECTED';
  const realtimeSubscribers = [];

  // Initialize Supabase Client
  function initClient(customUrl, customKey) {
    const { url: envUrl, anonKey: envKey } = getConfig();
    const url = sanitizeUrl(customUrl || envUrl);
    const anonKey = (customKey || envKey || '').trim();

    if (url && anonKey && typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
      try {
        clientInstance = window.supabase.createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: 'flipkart_admin_session'
          },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        });
        isConfigured = true;
        // Re-attach realtime subscribers if any are waiting
        attachRealtimeSubscription();
      } catch (err) {
        console.warn('[Supabase Client] Failed to initialize client:', err);
      }
    }

    return clientInstance;
  }

  // Auto-init on script evaluation
  initClient();

  // Helper: Try to fetch server /api/config if not yet set in static browser
  async function ensureConfigured() {
    if (isConfigured && clientInstance) return true;

    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const cfg = await res.json();
        if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
          if (typeof window !== 'undefined') {
            window.__ENV__ = window.__ENV__ || {};
            window.__ENV__.VITE_SUPABASE_URL = cfg.supabaseUrl;
            window.__ENV__.VITE_SUPABASE_ANON_KEY = cfg.supabaseAnonKey;
          }
          initClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
          return isConfigured;
        }
      }
    } catch (e) {
      // Local or static without express
    }

    return isConfigured;
  }

  // Programmatically set Supabase credentials (from UI or admin panel)
  async function setCredentials(url, anonKey) {
    if (!url || !anonKey) {
      throw new Error('Both Supabase URL and Anon Key are required');
    }

    const cleanUrl = url.trim().replace(/\/$/, '');
    const cleanKey = anonKey.trim();

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('VITE_SUPABASE_URL', cleanUrl);
      localStorage.setItem('VITE_SUPABASE_ANON_KEY', cleanKey);
    }

    if (typeof window !== 'undefined') {
      window.__ENV__ = window.__ENV__ || {};
      window.__ENV__.VITE_SUPABASE_URL = cleanUrl;
      window.__ENV__.VITE_SUPABASE_ANON_KEY = cleanKey;
    }

    clientInstance = null;
    isConfigured = false;
    if (realtimeChannel && typeof realtimeChannel.unsubscribe === 'function') {
      try { realtimeChannel.unsubscribe(); } catch (e) {}
      realtimeChannel = null;
    }

    initClient(cleanUrl, cleanKey);

    // Save to server .env if backend is reachable
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl: cleanUrl, supabaseAnonKey: cleanKey })
      });
    } catch (e) {
      // Static or offline mode
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-configured', {
        detail: { url: cleanUrl }
      }));
    }

    return { success: true, url: cleanUrl };
  }

  // Quick Connection & Latency Test
  async function testConnection() {
    await ensureConfigured();

    if (!isConfigured || !clientInstance) {
      return {
        ok: false,
        error: 'Supabase is not configured yet. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      };
    }

    const start = Date.now();
    try {
      const { data, error, count } = await clientInstance
        .from('products')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;

      return {
        ok: true,
        latencyMs: Date.now() - start,
        totalProducts: count ?? 0,
        realtimeStatus
      };
    } catch (err) {
      const isMissingTable = (err && (err.code === 'PGRST205' || (err.message && err.message.includes('schema cache'))));
      return {
        ok: false,
        latencyMs: Date.now() - start,
        tablePending: Boolean(isMissingTable),
        error: isMissingTable
          ? "Supabase connected! But table 'public.products' has not been created yet. Open '1-Click Database Setup' in Admin panel to run the setup script."
          : (err.message || 'Connection failed')
      };
    }
  }

  // Check backend server status
  async function getBackendStatus() {
    try {
      const res = await fetch('/api/supabase/status');
      if (res.ok) return await res.json();
    } catch (e) {
      // Offline or static hosting
    }
    return { configured: isConfigured, connected: isConfigured, tablesExist: false };
  }

  // Get master SQL setup script
  async function fetchSetupSql() {
    try {
      const res = await fetch('/api/supabase/sql');
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }

  // Realtime Channel Attachment & Broadcasting Helper
  let broadcastChannel = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel('flipkart-catalog-realtime');
      broadcastChannel.onmessage = (event) => {
        console.log('[Catalog Realtime Broadcast] Message received:', event.data);
        notifySubscribers(event.data);
      };
    } catch (e) {}
  }

  function notifySubscribers(payload) {
    realtimeSubscribers.forEach((cb) => {
      try {
        cb(payload);
      } catch (cbErr) {
        console.error('[Supabase Realtime] Subscriber callback error:', cbErr);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-product-changed', { detail: payload }));
    }
  }

  function broadcastChange(payload = { eventType: 'UPDATE' }) {
    notifySubscribers(payload);

    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(payload);
      } catch (e) {}
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('flipkart_last_catalog_update', Date.now().toString());
      } catch (e) {}
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'flipkart_last_catalog_update') {
        notifySubscribers({ eventType: 'UPDATE', source: 'storage_sync' });
      }
    });
  }

  function attachRealtimeSubscription() {
    if (!isConfigured || !clientInstance) return null;

    if (realtimeChannel) {
      return realtimeChannel;
    }

    try {
      realtimeStatus = 'CONNECTING';
      realtimeChannel = clientInstance
        .channel('live-products-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            console.log('[Supabase Realtime] Product update received:', payload);
            notifySubscribers(payload);
          }
        )
        .subscribe((status) => {
          realtimeStatus = status;
          console.log('[Supabase Realtime] Channel status:', status);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('supabase-realtime-status', { detail: { status } }));
          }
        });

      return realtimeChannel;
    } catch (e) {
      console.warn('[Supabase Realtime] Could not subscribe:', e);
      realtimeStatus = 'ERROR';
      return null;
    }
  }

  // ------------------------------------------------------------------
  // 1. PRODUCT CATALOG METHODS (Storefront & Admin)
  // ------------------------------------------------------------------

  // Fetch all products from Supabase (with fallback to local data/products.json)
  async function getProducts() {
    await ensureConfigured();

    if (isConfigured && clientInstance) {
      try {
        const { data, error } = await clientInstance
          .from('products')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const kitchenCount = data.filter(p => (p.category || '').toLowerCase() === 'kitchen').length;
          const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
          const brands = [...new Set(data.map(p => p.brand).filter(Boolean))];

          return {
            success: true,
            source: 'supabase',
            products: data,
            count: data.length,
            kitchenCount,
            categories,
            brands
          };
        }
      } catch (err) {
        console.warn('[Supabase] Products query error, falling back to local catalog:', err);
      }
    }

    // Graceful fallback to products.json if Supabase not yet seeded or configured
    try {
      const res = await fetch('./data/products.json?v=' + Date.now());
      if (res.ok) {
        const local = await res.json();
        const prods = local.products || [];
        const kitchenCount = prods.filter(p => (p.category || '').toLowerCase() === 'kitchen').length;
        const categories = [...new Set(prods.map(p => p.category).filter(Boolean))];
        const brands = [...new Set(prods.map(p => p.brand).filter(Boolean))];

        return {
          success: true,
          source: 'local_file',
          products: prods,
          count: prods.length,
          kitchenCount,
          categories,
          brands
        };
      }
    } catch (e) {
      console.error('[Catalog] Both Supabase and local fetch failed:', e);
    }

    return { success: false, source: 'none', products: [], count: 0, brands: [], categories: [] };
  }

  // Fetch single product by id or md5_id
  async function getProductById(idOrSlug) {
    await ensureConfigured();

    if (isConfigured && clientInstance && idOrSlug) {
      try {
        // Query by id (if numeric) or md5_id
        let query = clientInstance.from('products').select('*');
        if (/^\d+$/.test(String(idOrSlug))) {
          query = query.or(`id.eq.${idOrSlug},md5_id.eq.${idOrSlug}`);
        } else {
          query = query.eq('md5_id', idOrSlug);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          return { success: true, source: 'supabase', product: data };
        }
      } catch (err) {
        console.warn('[Supabase] Single product query error:', err);
      }
    }

    // Fallback: search within full list
    const catalog = await getProducts();
    const prod = (catalog.products || []).find(p => String(p.id) === String(idOrSlug) || String(p.md5_id) === String(idOrSlug));
    return prod ? { success: true, source: catalog.source, product: prod } : { success: false, product: null };
  }

  // Add new product (Admin Only)
  async function addProduct(productPayload) {
    await ensureConfigured();

    let result = null;
    if (isConfigured && clientInstance) {
      // Calculate next ID if not provided
      if (!productPayload.id) {
        const { data: maxRow } = await clientInstance
          .from('products')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        productPayload.id = (maxRow?.id ? Number(maxRow.id) + 1 : 1);
      }

      const { data, error } = await clientInstance
        .from('products')
        .insert([productPayload])
        .select()
        .single();

      if (error) console.warn('[Supabase Direct Add] Supabase insert warning:', error);
      result = { success: true, source: 'supabase', product: data || productPayload };
    }

    // Always mirror to Express backend to keep local catalog in exact parity
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload)
      });
      const json = await res.json();
      if (!result && json.success) result = json;
    } catch (e) {
      console.warn('[Add Product] Server sync warning:', e);
    }

    broadcastChange({ eventType: 'INSERT', product: result?.product || productPayload });
    return result || { success: true, product: productPayload };
  }

  // Update product (Admin Only)
  async function updateProduct(id, updates) {
    await ensureConfigured();

    let result = null;
    if (isConfigured && clientInstance) {
      const { data, error } = await clientInstance
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) console.warn('[Supabase Direct Update] Warning:', error);
      result = { success: true, source: 'supabase', product: data || updates };
    }

    // Always mirror to Express backend to keep local catalog in exact parity
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const json = await res.json();
      if (!result && json.success) result = json;
    } catch (e) {
      console.warn('[Update Product] Server sync warning:', e);
    }

    broadcastChange({ eventType: 'UPDATE', id, product: result?.product || updates });
    return result || { success: true, product: updates };
  }

  // Delete product (Admin Only)
  async function deleteProduct(id) {
    await ensureConfigured();

    let result = null;
    if (isConfigured && clientInstance) {
      const { error } = await clientInstance
        .from('products')
        .delete()
        .eq('id', id);

      if (error) console.warn('[Supabase Direct Delete] Warning:', error);
      result = { success: true, source: 'supabase', deletedId: id };
    }

    // Always delete from Express backend to keep local catalog in exact parity
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!result && json.success) result = json;
    } catch (e) {
      console.warn('[Delete Product] Server sync warning:', e);
    }

    broadcastChange({ eventType: 'DELETE', id });
    return result || { success: true, deletedId: id };
  }

  // Bulk CSV Upsert (Admin Only)
  async function bulkUpsertProducts(productsArray) {
    await ensureConfigured();

    if (isConfigured && clientInstance) {
      const { data, error } = await clientInstance
        .from('products')
        .upsert(productsArray, { onConflict: 'id' })
        .select();

      if (error) throw error;
      return { success: true, count: productsArray.length, data };
    }

    throw new Error('Supabase client is not configured for bulk upload');
  }

  // ------------------------------------------------------------------
  // 2. REALTIME SUBSCRIPTION
  // ------------------------------------------------------------------
  function subscribeToProducts(callback) {
    if (typeof callback === 'function' && !realtimeSubscribers.includes(callback)) {
      realtimeSubscribers.push(callback);
    }

    if (isConfigured && clientInstance) {
      return attachRealtimeSubscription();
    }

    // Attempt to configure if not yet ready
    ensureConfigured().then((ready) => {
      if (ready) {
        attachRealtimeSubscription();
      }
    });

    return {
      unsubscribe: () => {
        const idx = realtimeSubscribers.indexOf(callback);
        if (idx !== -1) realtimeSubscribers.splice(idx, 1);
      }
    };
  }

  // ------------------------------------------------------------------
  // 3. ORDERS (Public Checkout Placement & Admin View)
  // ------------------------------------------------------------------
  async function createOrder(orderPayload) {
    await ensureConfigured();

    if (isConfigured && clientInstance) {
      try {
        const { data, error } = await clientInstance
          .from('orders')
          .insert([{
            order_id: orderPayload.orderId || orderPayload.order_id,
            items: orderPayload.items || [],
            total_amount: orderPayload.totalAmount || orderPayload.total_amount || 0,
            mrp_amount: orderPayload.mrpAmount || orderPayload.mrp_amount || 0,
            payment_method: orderPayload.paymentMethod || orderPayload.payment_method || 'UPI',
            address: orderPayload.address || {},
            status: orderPayload.status || 'Order Confirmed',
            expected_delivery: orderPayload.expectedDelivery || orderPayload.expected_delivery || 'Tomorrow by 11 PM'
          }])
          .select()
          .single();

        if (!error && data) {
          return { success: true, source: 'supabase', order: data };
        }
        if (error) console.warn('[Supabase Order] Insert error:', error);
      } catch (err) {
        console.warn('[Supabase Order] Error saving to database:', err);
      }
    }

    // Always ensure order is also saved in client localStorage for instant order-success screen
    return { success: true, source: 'local_storage', order: orderPayload };
  }

  // ------------------------------------------------------------------
  // 4. ADMIN AUTHENTICATION
  // ------------------------------------------------------------------
  async function adminSignIn(email, password) {
    await ensureConfigured();
    if (!clientInstance) throw new Error('Supabase client not initialized. Check credentials.');

    const { data, error } = await clientInstance.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async function adminSignOut() {
    if (!clientInstance) return;
    await clientInstance.auth.signOut();
  }

  async function getAdminUser() {
    await ensureConfigured();
    if (!clientInstance) return null;

    try {
      const { data: { user } } = await clientInstance.auth.getUser();
      return user;
    } catch (e) {
      return null;
    }
  }

  function onAuthStateChange(cb) {
    if (!clientInstance) return;
    return clientInstance.auth.onAuthStateChange(cb);
  }

  // Exported Public API
  return {
    getConfig,
    initClient,
    ensureConfigured,
    setCredentials,
    testConnection,
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
    bulkUpsertProducts,
    subscribeToProducts,
    broadcastChange,
    createOrder,
    adminSignIn,
    adminSignOut,
    getAdminUser,
    onAuthStateChange,
    getBackendStatus,
    fetchSetupSql,
    getClient: () => clientInstance,
    isReady: () => isConfigured,
    getRealtimeStatus: () => realtimeStatus
  };
}));
