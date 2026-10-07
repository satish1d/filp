const currencyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

const backBtn = document.getElementById('pd-back-btn');
const toastElement = document.getElementById('toast');
const cartBadge = document.getElementById('pd-cart-count');
const cartBtn = document.getElementById('pd-cart-btn');
const btnAddCartIcon = document.getElementById('btn-add-cart-icon');
const btnBuyEmi = document.getElementById('btn-buy-emi');
const btnBuyNowYellow = document.getElementById('btn-buy-now-yellow');
const wishlistBtn = document.getElementById('btn-detail-wishlist');
const shareBtn = document.getElementById('btn-detail-share');

// Toast Notification
function showToast(message) {
  if (!toastElement) return;
  toastElement.textContent = message;
  toastElement.classList.add('show');
  setTimeout(() => {
    toastElement.classList.remove('show');
  }, 2200);
}

// 1. Back Navigation
if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });
}

// 2. Real-time Countdown Timer (Sale starts in [ 33 ] Hrs : [ 53 ] Min : [ 37 ] Sec)
const hrsEl = document.getElementById('cd-hrs');
const minEl = document.getElementById('cd-min');
const secEl = document.getElementById('cd-sec');

let totalCountdownSecs = 33 * 3600 + 53 * 60 + 37;

function updateCountdown() {
  if (totalCountdownSecs <= 0) {
    totalCountdownSecs = 34 * 3600; // Reset loop
  }
  const hrs = Math.floor(totalCountdownSecs / 3600);
  const mins = Math.floor((totalCountdownSecs % 3600) / 60);
  const secs = totalCountdownSecs % 60;

  if (hrsEl) hrsEl.textContent = hrs;
  if (minEl) minEl.textContent = mins < 10 ? `0${mins}` : mins;
  if (secEl) secEl.textContent = secs < 10 ? `0${secs}` : secs;

  totalCountdownSecs--;
}
setInterval(updateCountdown, 1000);
updateCountdown();

// 3. Cart Badge Count
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('flipkart_cart') || '[]');
  if (cartBadge) {
    cartBadge.textContent = cart.length || '1';
  }
}
updateCartCount();

if (cartBtn) {
  cartBtn.addEventListener('click', () => {
    showToast(`You have ${cartBadge.textContent} item(s) in your Flipkart Cart 🛒`);
  });
}

// 4. Product Loader from URL param
const urlParams = new URLSearchParams(window.location.search);
const productIdParam = urlParams.get('id');

async function loadProductDetails() {
  try {
    const res = await fetch('./data/products.json');
    if (!res.ok) throw new Error('Catalog failed to load');
    const data = await res.json();
    const products = data.products || [];
    const variants = data.variants || [];

    // Default to HP Victus laptop (matching screenshot) or find by ID
    let product;
    if (productIdParam) {
      product = products.find(
        (p) => String(p.md5_id) === String(productIdParam) || String(p.id) === String(productIdParam)
      );
    }

    if (!product) {
      // Find HP Victus or fallback to first product
      product = products.find((p) => p.md5_id === 'hp-victus-14th-gen-rtx-4050') || products[0];
    }

    // Update Page Elements
    document.title = `${product.name} - Flipkart`;

    const mainImg = document.getElementById('pd-main-img');
    if (mainImg) {
      mainImg.src = product.img1 || './assets/images/hp_victus_opt.jpg';
      mainImg.alt = product.name;
      mainImg.onerror = function() {
        if (!this._retried) {
          this._retried = true;
          if (this.src.indexOf('/real/') === -1) {
            this.src = (product.img1 || '').replace('assets/images/', 'assets/images/real/');
          } else {
            this.src = (product.img1 || '').replace('assets/images/real/', 'assets/images/');
          }
        } else {
          this.src = './assets/images/hp_victus_laptop.svg';
        }
      };
    }

    const brandEl = document.getElementById('pd-brand-name');
    if (brandEl) {
      if ((product.brand || '').toUpperCase() === 'FLIPKART') {
        brandEl.innerHTML = `<img src="./assets/images/flipkart_full_logo.svg" alt="Flipkart" style="height: 18px; width: auto; vertical-align: middle;">`;
      } else {
        brandEl.textContent = product.brand || 'HP';
      }
    }
    document.getElementById('pd-title').textContent = product.name || '';
    document.getElementById('pd-rating-val').textContent = product.rating || '4.5';
    document.getElementById('pd-review-val').textContent = `${product.review_count || '1,280'} Ratings & 340 Reviews`;

    const mrp = Number(product.mrp) || 0;
    const price = Number(product.selling_price) || 0;
    const discountRate = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : product.discount_percent || 23;

    document.getElementById('pd-discount-tag').textContent = `↓ ${discountRate}%`;
    document.getElementById('pd-mrp-val').textContent = `₹${currencyFormatter.format(mrp)}`;
    document.getElementById('pd-price-val').textContent = `₹${currencyFormatter.format(price)}`;

    const deliveryText = product.delivery_text || 'Get it by 10 Oct';
    document.getElementById('pd-delivery-val').innerHTML = `Get it by <b>${deliveryText.replace('Get it by ', '')}</b> | <span style="color: #16a34a; font-weight: 700;">FREE Delivery</span>`;

    document.getElementById('pd-specs-container').innerHTML =
      product.features || '<p>High performance gaming machine with official manufacturer warranty.</p>';

    // Update Bottom Buttons
    const emiText = product.emi_price || `From ₹${currencyFormatter.format(Math.round(price / 3))}/m`;
    const btnEmiSub = document.getElementById('btn-emi-sub');
    if (btnEmiSub) btnEmiSub.textContent = emiText;

    const btnBuyNowSub = document.getElementById('btn-buynow-sub');
    if (btnBuyNowSub) btnBuyNowSub.textContent = `at ₹${currencyFormatter.format(price)}`;

    // Wishlist Toggle
    const savedWishlist = JSON.parse(localStorage.getItem('flipkart_wishlist') || '[]');
    if (savedWishlist.includes(product.id) && wishlistBtn) {
      wishlistBtn.classList.add('active');
    }

    if (wishlistBtn) {
      wishlistBtn.addEventListener('click', () => {
        const list = JSON.parse(localStorage.getItem('flipkart_wishlist') || '[]');
        const idx = list.indexOf(product.id);
        if (idx > -1) {
          list.splice(idx, 1);
          wishlistBtn.classList.remove('active');
          showToast('Removed from Wishlist');
        } else {
          list.push(product.id);
          wishlistBtn.classList.add('active');
          showToast('Added to Wishlist ❤️');
        }
        localStorage.setItem('flipkart_wishlist', JSON.stringify(list));
      });
    }

    // Share Button
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (navigator.share) {
          navigator.share({
            title: product.name,
            text: `Check out ${product.name} on Flipkart Big Billion Days!`,
            url: window.location.href,
          }).catch(() => {});
        } else {
          navigator.clipboard?.writeText(window.location.href);
          showToast('Link copied to clipboard! 📋');
        }
      });
    }

    // Variants (if available)
    const prodVariants = variants.filter((v) => v.product_id === product.id);
    const variantWrap = document.getElementById('pd-variant-wrap');
    const variantChips = document.getElementById('pd-variant-chips');

    if (prodVariants.length > 0 && variantWrap && variantChips) {
      variantWrap.style.display = 'block';
      variantChips.innerHTML = '';
      prodVariants.forEach((v, i) => {
        const chip = document.createElement('button');
        chip.className = `variant-chip ${i === 0 ? 'active' : ''}`;
        chip.textContent = v.storage || v.size || v.color;
        chip.addEventListener('click', () => {
          variantChips.querySelectorAll('.variant-chip').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
          const vPrice = Number(v.selling_price) || price;
          document.getElementById('pd-price-val').textContent = `₹${currencyFormatter.format(vPrice)}`;
          if (btnBuyNowSub) btnBuyNowSub.textContent = `at ₹${currencyFormatter.format(vPrice)}`;
          showToast(`Selected: ${chip.textContent}`);
        });
        variantChips.appendChild(chip);
      });
    } else if (variantWrap) {
      variantWrap.style.display = 'none';
    }

    // Bottom Action Handlers
    if (btnAddCartIcon) {
      btnAddCartIcon.addEventListener('click', () => {
        const cart = JSON.parse(localStorage.getItem('flipkart_cart') || '[]');
        cart.push(product.id);
        localStorage.setItem('flipkart_cart', JSON.stringify(cart));
        updateCartCount();
        showToast('Added to Cart 🛒');
      });
    }

    if (btnBuyEmi) {
      btnBuyEmi.addEventListener('click', () => {
        showToast('Select EMI Option: No Cost EMI starting at ₹52,704/month');
      });
    }

    if (btnBuyNowYellow) {
      btnBuyNowYellow.addEventListener('click', () => {
        showToast(`Proceeding to Buy ${product.short_name || 'Product'} at ₹${currencyFormatter.format(price)}!`);
      });
    }
  } catch (err) {
    console.error('Error loading product detail:', err);
  }
}

// Search input inside product page
const searchInput = document.getElementById('pd-search-input');
if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.location.href = `index.html?q=${encodeURIComponent(searchInput.value)}`;
    }
  });
}

loadProductDetails();
