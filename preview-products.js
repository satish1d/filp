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

// 3. Render Product Cards (Exact Replica of Screenshots)
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  // Image Box
  const imageBox = document.createElement('div');
  imageBox.className = 'product-image-box';

  // Wishlist Button
  const wishlistBtn = document.createElement('button');
  wishlistBtn.className = 'wishlist-btn';
  wishlistBtn.setAttribute('aria-label', 'Add to Wishlist');
  wishlistBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  `;

  // Wishlist State from LocalStorage
  const savedWishlist = JSON.parse(localStorage.getItem('flipkart_wishlist') || '[]');
  const isWishlisted = savedWishlist.includes(product.id);
  if (isWishlisted) {
    wishlistBtn.classList.add('active');
  }

  wishlistBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const list = JSON.parse(localStorage.getItem('flipkart_wishlist') || '[]');
    const index = list.indexOf(product.id);
    if (index > -1) {
      list.splice(index, 1);
      wishlistBtn.classList.remove('active');
      showToast('Removed from Wishlist');
    } else {
      list.push(product.id);
      wishlistBtn.classList.add('active');
      showToast('Added to Wishlist ❤️');
    }
    localStorage.setItem('flipkart_wishlist', JSON.stringify(list));
  });

  // Rating Pill Badge (Bottom-Left)
  const ratingBadge = document.createElement('div');
  ratingBadge.className = 'product-rating-badge';
  ratingBadge.innerHTML = `
    <span>${product.rating || '4.5'}</span>
    <span class="rating-star-icon">★</span>
    <span class="rating-divider">|</span>
    <span class="rating-count">${product.review_count || '1k+'}</span>
  `;

  // Product Image
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

  // AD tag (Image 1 top left)
  if (product.ad) {
    const adTag = document.createElement('span');
    adTag.className = 'card-ad-tag';
    adTag.textContent = 'AD';
    imageBox.appendChild(adTag);
  }

  // Brand Authorized Seller Shield (Image 1 bottom right)
  if (product.authorized_seller) {
    const shield = document.createElement('img');
    shield.src = './assets/images/brand_seller.svg';
    shield.alt = 'Brand Authorized Seller';
    shield.className = 'card-auth-shield';
    imageBox.appendChild(shield);
  }

  imageBox.appendChild(wishlistBtn);
  imageBox.appendChild(img);
  imageBox.appendChild(ratingBadge);

  // Info Box
  const infoBox = document.createElement('div');
  infoBox.className = 'product-info-box';

  // Assured + Brand Row
  const brandRow = document.createElement('div');
  brandRow.className = 'brand-assured-row';
  if ((product.brand || '').toUpperCase() === 'FLIPKART') {
    brandRow.innerHTML = `
      <img src="./assets/images/f_assured.svg" alt="Flipkart Assured" class="assured-badge-img">
      <img src="./assets/images/flipkart_full_logo.svg" alt="Flipkart" style="height: 16px; width: auto; display: inline-block;">
    `;
  } else if (product.assured) {
    brandRow.innerHTML = `
      <span class="brand-name">${escapeHtml(product.brand || '')}</span>
    `;
  } else {
    brandRow.innerHTML = `
      <span class="brand-name">${escapeHtml(product.brand || '')}</span>
    `;
  }

  // Truncated Product Title
  const title = document.createElement('div');
  title.className = 'product-title-text';
  title.textContent = product.short_name || product.name || '';

  // Pricing Line
  const priceRow = document.createElement('div');
  priceRow.className = 'pricing-row';

  const discountLabel = product.discount_label || `↓ ${product.discount_percent || 90}%`;
  const mrpValue = Number(product.mrp) || 0;
  const sellingValue = Number(product.selling_price) || 0;

  priceRow.innerHTML = `
    <span class="discount-tag">${discountLabel}</span>
    <span class="mrp-strikethrough">₹${currencyFormatter.format(mrpValue)}</span>
    <span class="selling-price-bold">₹${currencyFormatter.format(sellingValue)}</span>
  `;

  // Delivery Line
  const deliveryLine = document.createElement('div');
  deliveryLine.className = 'delivery-info-text';
  const deliveryText = product.delivery_text || 'Get it by 11 Oct';
  deliveryLine.innerHTML = formatDeliveryText(deliveryText);

  infoBox.appendChild(brandRow);
  infoBox.appendChild(title);
  infoBox.appendChild(priceRow);

  // Big Billion Days / Event Price Badge (Image 1)
  if (product.badge) {
    const badgeEl = document.createElement('div');
    badgeEl.className = `card-event-badge ${product.badge.includes('Lowest') ? 'lowest-price' : 'bbd-price'}`;
    badgeEl.textContent = product.badge;
    infoBox.appendChild(badgeEl);
  } else {
    infoBox.appendChild(deliveryLine);
  }

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

// 6b. Fashion Strip (Men, Women, Kids) Click Handler
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

// 8. Fetch Catalog Data
async function loadCatalog() {
  try {
    updateHomeCartBadge();
    const res = await fetch('./data/products.json?v=' + Date.now());
    if (!res.ok) throw new Error('Catalog failed to load');
    const data = await res.json();
    allProducts = data.products || [];

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
