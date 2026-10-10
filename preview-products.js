// Currency Formatter
const currencyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const productGrid = document.getElementById('product-grid-container');
const timerElement = document.getElementById('countdown-timer');
const viewersElement = document.getElementById('viewers-count');
const searchInput = document.getElementById('search-input');
const toastElement = document.getElementById('toast');
const categoryNav = document.getElementById('category-nav');

let allProducts = [];
let currentCategory = 'all';

// Toast Notification
function showToast(message) {
  if (!toastElement) return;
  toastElement.textContent = message;
  toastElement.classList.add('show');
  setTimeout(() => {
    toastElement.classList.remove('show');
  }, 2200);
}

// 1. Live Countdown Timer (if timerElement exists)
let totalSeconds = 161;
function updateTimer() {
  if (!timerElement) return;
  if (totalSeconds <= 0) {
    totalSeconds = 180;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  timerElement.textContent = `${mins}min ${secs < 10 ? '0' : ''}${secs}sec`;
  totalSeconds--;
}
if (timerElement) {
  setInterval(updateTimer, 1000);
  updateTimer();
}

// 2. Real-time Viewer Fluctuation (if viewersElement exists)
let currentViewers = 14352;
if (viewersElement) {
  setInterval(() => {
    if (!viewersElement) return;
    const delta = Math.floor(Math.random() * 15) - 7;
    currentViewers = Math.max(12000, currentViewers + delta);
    viewersElement.textContent = `${currentViewers.toLocaleString('en-IN')} People watching this sale`;
  }, 3500);
}

// Green 5-star rating helper (e.g. ★★★★☆)
function getStarRatingHtml(ratingVal) {
  const r = parseFloat(ratingVal) || 4.2;
  const full = Math.min(5, Math.floor(r));
  let stars = '';
  for (let i = 0; i < 5; i++) {
    stars += i < full ? '★' : '☆';
  }
  return stars;
}

// Format Delivery Date (e.g. "Delivery by 12th Oct")
function formatDeliveryDate(rawDelivery) {
  if (!rawDelivery || typeof rawDelivery !== 'string') {
    return 'Delivery by <b>12th Oct</b>';
  }
  let cleaned = rawDelivery.trim();
  cleaned = cleaned.replace(/,\s*[A-Za-z]+$/i, '').trim();
  cleaned = cleaned.replace(/^Free delivery\s*(by)?\s*/i, '').trim();
  cleaned = cleaned.replace(/^Delivery by\s*/i, '').trim();

  if (!cleaned) {
    return 'Delivery by <b>12th Oct</b>';
  }

  cleaned = cleaned.replace(/\b(\d{1,2})\b(?!\s*(st|nd|rd|th))(?=\s+[A-Za-z]+)/gi, (match, dStr) => {
    const d = parseInt(dStr, 10);
    const suffix = (d % 10 === 1 && d !== 11) ? 'st' : (d % 10 === 2 && d !== 12) ? 'nd' : (d % 10 === 3 && d !== 13) ? 'rd' : 'th';
    return `${d}${suffix}`;
  });

  return `Delivery by <b>${cleaned}</b>`;
}

// 3. Render Product Cards (Exact Replica of Uploaded Image PHOTO-2026-10-10-14-01-21.jpg)
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  // Image Box (Clean square, NO heart icon, NO rating overlay, NO ad/shield)
  const imageBox = document.createElement('div');
  imageBox.className = 'product-image-box';

  const img = document.createElement('img');
  img.className = 'product-img';
  img.src = product.img1 || '';
  img.alt = product.name || 'Product Image';
  img.loading = 'lazy';
  img.onerror = function() {
    if (!this._retried) {
      this._retried = true;
      if (product.img1 && product.img1.includes('?')) {
        this.src = product.img1.split('?')[0];
      }
    }
  };

  imageBox.appendChild(img);

  // Info Box
  const infoBox = document.createElement('div');
  infoBox.className = 'product-info-box';

  // 1. Product Title (2-line clamp, clean font)
  const title = document.createElement('div');
  title.className = 'product-title-text';
  let cleanTitle = product.name || product.short_name || '';
  if (cleanTitle.endsWith('...') && product.name && product.name.length > cleanTitle.length) {
    cleanTitle = product.name;
  }
  title.textContent = cleanTitle;

  // 2. Rating + Reviews + Assured Row: ★★★★☆ (500) 🛡️Assured
  const ratingRow = document.createElement('div');
  ratingRow.className = 'card-rating-assured-row';
  const starsHtml = getStarRatingHtml(product.rating || product.rating_stars || 4.2);
  const rawCount = product.review_count || '500';
  const cleanCount = String(rawCount).replace(/[()]/g, '').trim();
  ratingRow.innerHTML = `
    <span class="card-stars-green">${starsHtml}</span>
    <span class="card-reviews-count">(${cleanCount})</span>
    <img src="./assets/images/f_assured_shield.svg" alt="Assured" class="card-assured-shield-img">
  `;

  // 3. Pricing Row: ↓79% ₹464 ₹99
  const priceRow = document.createElement('div');
  priceRow.className = 'pricing-row';

  const mrpValue = Number(product.mrp) || 0;
  const sellingValue = Number(product.selling_price) || 0;
  let discountPercent = product.discount_percent;
  if (!discountPercent && mrpValue > sellingValue && mrpValue > 0) {
    discountPercent = Math.round(((mrpValue - sellingValue) / mrpValue) * 100);
  }
  if (!discountPercent) discountPercent = 70;

  priceRow.innerHTML = `
    <span class="card-discount-arrow">↓${discountPercent}%</span>
    ${mrpValue > sellingValue ? `<span class="card-mrp-strike">₹${currencyFormatter.format(mrpValue)}</span>` : ''}
    <span class="card-final-price">₹${currencyFormatter.format(sellingValue)}</span>
  `;

  // 4. WOW Offer Row: [WOW!] ₹99 with offer
  const wowRow = document.createElement('div');
  wowRow.className = 'card-wow-offer-row';
  const offerPrice = product.deal_price || sellingValue;
  wowRow.innerHTML = `
    <span class="card-wow-badge">WOW!</span>
    <span class="card-wow-offer-text"><b>₹${currencyFormatter.format(offerPrice)}</b> with offer</span>
  `;

  // 5. Super deals Row
  const superDeals = document.createElement('div');
  superDeals.className = 'card-super-deals-text';
  superDeals.textContent = 'Super deals';

  // 6. Delivery Date Row: Delivery by 12th Oct
  const deliveryRow = document.createElement('div');
  deliveryRow.className = 'card-delivery-row';
  deliveryRow.innerHTML = formatDeliveryDate(product.delivery_text);

  infoBox.appendChild(title);
  infoBox.appendChild(ratingRow);
  infoBox.appendChild(priceRow);
  infoBox.appendChild(wowRow);
  infoBox.appendChild(superDeals);
  infoBox.appendChild(deliveryRow);

  card.appendChild(imageBox);
  card.appendChild(infoBox);

  // Click navigates to Product Detail page
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    window.location.href = `product-detail.html?id=${encodeURIComponent(product.md5_id || product.id)}`;
  });

  return card;
}

function formatDeliveryText(text) {
  return text.replace(/(\d+\s+[A-Za-z]+)/g, '<b>$1</b>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 4. Render Grid
function renderProducts(products) {
  if (!productGrid) return;
  productGrid.innerHTML = '';

  if (products.length === 0) {
    productGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #878787;">
        <p style="font-size: 16px; font-weight: 600;">No products found</p>
        <p style="font-size: 13px; margin-top: 6px;">Try searching with different keywords</p>
      </div>
    `;
    return;
  }

  products.forEach((product) => {
    productGrid.appendChild(createProductCard(product));
  });
}

// 5. Filter Handler
function filterProducts() {
  const query = (searchInput?.value || '').trim().toLowerCase();
  let filtered = allProducts;

  if (currentCategory !== 'all') {
    const c = currentCategory.toLowerCase();
    if (c === 'appliances') {
      filtered = filtered.filter((p) => {
        const name = (p.name || '').toLowerCase();
        return name.includes('mixer') || name.includes('grinder') || name.includes('blender') || name.includes('juicer') || name.includes('kettle') || name.includes('stove') || name.includes('cooktop') || name.includes('otg') || name.includes('sandwich');
      });
    } else if (c === 'cookware') {
      filtered = filtered.filter((p) => {
        const name = (p.name || '').toLowerCase();
        return name.includes('cookware') || name.includes('cooker') || name.includes('casserole') || name.includes('dinner set') || name.includes('pan') || name.includes('kadai') || name.includes('box') || name.includes('opalware');
      });
    } else if (c === 'home' || c === 'kitchen') {
      filtered = allProducts;
    } else {
      const subFiltered = filtered.filter(
        (p) => (p.category || '').toLowerCase() === c || (p.name || '').toLowerCase().includes(c)
      );
      filtered = subFiltered.length > 0 ? subFiltered : allProducts;
    }
  }

  if (query) {
    filtered = filtered.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(query) ||
        (p.brand || '').toLowerCase().includes(query) ||
        (p.short_name || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query)
    );
  }

  const countBadge = document.getElementById('product-count-badge');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} Kitchen Products`;
  }

  renderProducts(filtered);
}

// 6. Category Navigation Click
if (categoryNav) {
  categoryNav.querySelectorAll('.category-item').forEach((item) => {
    item.addEventListener('click', () => {
      const cat = item.dataset.category || 'all';
      currentCategory = cat;
      categoryNav.querySelectorAll('.category-item').forEach((c) => c.classList.remove('active'));
      item.classList.add('active');
      filterProducts();
      const gridSection = document.querySelector('.product-grid-section');
      if (gridSection) {
        gridSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// 6b. Home Offers Strip Click Handler
window.selectHomeOffer = function(offerId, offerName) {
  showToast(`🎁 ${offerName} Active! Select products below.`);
  const gridSection = document.querySelector('.product-grid-section');
  if (gridSection) {
    gridSection.scrollIntoView({ behavior: 'smooth' });
  }
};

const fashionStrip = document.getElementById('fashion-strip');
if (fashionStrip) {
  fashionStrip.querySelectorAll('.fashion-cat-card').forEach((card) => {
    card.addEventListener('click', () => {
      const selectedCat = card.dataset.category || 'Fashion';
      showToast(`Showing ${selectedCat} Deals 🛍️`);
      currentCategory = selectedCat;
      filterProducts();
      const gridSection = document.querySelector('.product-grid-section');
      if (gridSection) {
        gridSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// 7. Search Input Listener (Real-Time Dynamic Search)
if (searchInput) {
  searchInput.addEventListener('input', () => {
    filterProducts();
    const gridSection = document.querySelector('.product-grid-section');
    if (gridSection && searchInput.value.trim().length > 0) {
      gridSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      filterProducts();
      const gridSection = document.querySelector('.product-grid-section');
      if (gridSection) {
        gridSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

// Top Tabs switcher
const tabFlipkart = document.getElementById('tab-flipkart');
const tabTravel = document.getElementById('tab-travel');
if (tabFlipkart && tabTravel) {
  tabTravel.addEventListener('click', () => {
    showToast('Travel bookings opening soon in Big Billion Days!');
  });
  tabFlipkart.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function updateHomeCartBadge() {
  const badge = document.getElementById('bottom-cart-badge');
  if (badge) {
    try {
      const raw = localStorage.getItem('flipkart_cart');
      const cart = raw ? JSON.parse(raw) : [];
      const count = Array.isArray(cart) ? cart.reduce((acc, item) => acc + (item.quantity || 1), 0) : 0;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    } catch (e) {
      badge.textContent = '0';
      badge.style.display = 'none';
    }
  }
}

// Delivery Location Selector Interactive Handler
const btnSelectLocation = document.getElementById('btn-select-location');
const locationTextTitle = document.querySelector('.location-text-title');
if (btnSelectLocation) {
  // Load saved location if any
  const savedLoc = localStorage.getItem('flipkart_user_location');
  if (savedLoc) {
    if (locationTextTitle) locationTextTitle.textContent = `Deliver to ${savedLoc}`;
    btnSelectLocation.innerHTML = `Change <span style="font-weight: 700; font-size: 14px;">&gt;</span>`;
  }

  btnSelectLocation.addEventListener('click', () => {
    const loc = prompt('Enter Delivery Pincode or City (e.g. Mumbai 400001, Delhi, Bangalore):', savedLoc || '400001');
    if (loc && loc.trim()) {
      const trimmed = loc.trim();
      localStorage.setItem('flipkart_user_location', trimmed);
      if (locationTextTitle) locationTextTitle.textContent = `Deliver to ${trimmed}`;
      btnSelectLocation.innerHTML = `Change <span style="font-weight: 700; font-size: 14px;">&gt;</span>`;
      showToast(`Delivery location set to ${trimmed} 📍`);
    }
  });
}

// 8. Fetch Catalog Data from Supabase
let realtimeSubscribed = false;

async function loadCatalog() {
  try {
    updateHomeCartBadge();

    let products = [];
    if (typeof FilpSupabase !== 'undefined') {
      const result = await FilpSupabase.getProducts();
      products = result.products || [];
      if (!realtimeSubscribed) {
        realtimeSubscribed = true;
        FilpSupabase.subscribeToProducts(() => {
          console.log('[Storefront] Realtime update detected from admin, refreshing products...');
          loadCatalog();
        });
      }
    } else {
      const res = await fetch('./data/products.json?v=' + Date.now());
      if (!res.ok) throw new Error('Catalog failed to load');
      const data = await res.json();
      products = data.products || [];
    }

    allProducts = products;

    const countBadge = document.getElementById('product-count-badge');
    if (countBadge) {
      const kitchenItems = allProducts.filter(p => (p.category || '').toLowerCase() === 'kitchen');
      const countLabel = (kitchenItems.length > 0 && kitchenItems.length === allProducts.length)
        ? `${allProducts.length} Kitchen Products`
        : `${allProducts.length} Products`;
      countBadge.textContent = countLabel;
    }

    // Check URL parameter for active category from categories page
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('cat') || urlParams.get('category');
    if (catParam) {
      currentCategory = catParam;
      if (categoryNav) {
        categoryNav.querySelectorAll('.category-item').forEach((item) => {
          if (item.dataset.category && item.dataset.category.toLowerCase() === catParam.toLowerCase()) {
            categoryNav.querySelectorAll('.category-item').forEach((c) => c.classList.remove('active'));
            item.classList.add('active');
          }
        });
      }
      filterProducts();
    } else {
      renderProducts(allProducts);
    }
  } catch (err) {
    console.error('Failed to load products:', err);
    if (productGrid) {
      productGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #d32f2f;">
          Unable to load live sale catalog. Please reload.
        </div>
      `;
    }
  }
}

loadCatalog();
