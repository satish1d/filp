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

// 1. Live Countdown Timer (Starts at 2min 41sec = 161 seconds, loops or counts down realistically)
let totalSeconds = 161;
function updateTimer() {
  if (!timerElement) return;
  if (totalSeconds <= 0) {
    totalSeconds = 180; // Reset to 3 minutes for continuous live excitement
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  timerElement.textContent = `${mins}min ${secs < 10 ? '0' : ''}${secs}sec`;
  totalSeconds--;
}
setInterval(updateTimer, 1000);
updateTimer();

// 2. Real-time Viewer Fluctuation around 14,352
let currentViewers = 14352;
setInterval(() => {
  if (!viewersElement) return;
  const delta = Math.floor(Math.random() * 15) - 7;
  currentViewers = Math.max(12000, currentViewers + delta);
  viewersElement.textContent = `${currentViewers.toLocaleString('en-IN')} People watching this sale`;
}, 3500);

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
  img.src = product.img1 || './assets/images/real/chair_opt.jpg';
  img.alt = product.name || 'Product Image';
  img.loading = 'lazy';
  img.onerror = function() {
    this.onerror = null;
    this.src = './assets/images/chair.svg';
  };

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
  } else {
    brandRow.innerHTML = `
      <img src="./assets/images/f_assured.svg" alt="Flipkart Assured" class="assured-badge-img">
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

  const discountLabel = product.discount_label || `↓ ${product.discount_percent || 90}`;
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
  infoBox.appendChild(deliveryLine);

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
    if (currentCategory.toLowerCase() === 'fashion') {
      filtered = filtered.filter(
        (p) => ['fashion', 'men', 'women', 'kids'].includes((p.category || '').toLowerCase())
      );
    } else {
      filtered = filtered.filter(
        (p) => (p.category || '').toLowerCase() === currentCategory.toLowerCase()
      );
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

  renderProducts(filtered);
}

// 6. Category Navigation Click
if (categoryNav) {
  categoryNav.querySelectorAll('.category-item').forEach((item) => {
    item.addEventListener('click', () => {
      categoryNav.querySelectorAll('.category-item').forEach((c) => c.classList.remove('active'));
      // Remove active state from fashion strip cards
      document.querySelectorAll('.fashion-cat-card').forEach((fc) => fc.classList.remove('active'));
      item.classList.add('active');
      currentCategory = item.dataset.category || 'all';
      filterProducts();
    });
  });
}

// 6b. Fashion Strip (Men, Women, Kids) Click Handler
const fashionStrip = document.getElementById('fashion-strip');
if (fashionStrip) {
  fashionStrip.querySelectorAll('.fashion-cat-card').forEach((card) => {
    card.addEventListener('click', () => {
      const selectedCat = card.dataset.category;
      const isAlreadyActive = card.classList.contains('active');

      fashionStrip.querySelectorAll('.fashion-cat-card').forEach((fc) => fc.classList.remove('active'));

      if (isAlreadyActive) {
        currentCategory = 'all';
        const forYouTab = categoryNav?.querySelector('[data-category="all"]');
        if (forYouTab) {
          categoryNav?.querySelectorAll('.category-item').forEach((c) => c.classList.remove('active'));
          forYouTab.classList.add('active');
        }
        showToast('Showing all deals');
      } else {
        card.classList.add('active');
        currentCategory = selectedCat;
        categoryNav?.querySelectorAll('.category-item').forEach((c) => c.classList.remove('active'));
        showToast(`Showing ${selectedCat}'s Deals 🛍️`);
        
        // Scroll to products
        const liveSection = document.querySelector('.live-sale-section');
        if (liveSection) {
          liveSection.scrollIntoView({ behavior: 'smooth' });
        }
      }

      filterProducts();
    });
  });
}

// 7. Search Input Listener
if (searchInput) {
  searchInput.addEventListener('input', () => {
    filterProducts();
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

// 8. Fetch Catalog Data
async function loadCatalog() {
  try {
    const res = await fetch('./data/products.json');
    if (!res.ok) throw new Error('Catalog failed to load');
    const data = await res.json();
    allProducts = data.products || [];
    renderProducts(allProducts);
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
