const currencyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

// DOM Elements
const backBtn = document.getElementById('pd-back-btn');
const toastElement = document.getElementById('toast');
const cartBadge = document.getElementById('pd-cart-count');
const cartBtn = document.getElementById('pd-cart-btn');
const wishlistBtn = document.getElementById('pd-wishlist-btn');
const shareBtn = document.getElementById('pd-share-btn');
const btnAddCart = document.getElementById('pd-btn-add-cart');
const btnBuyNow = document.getElementById('pd-btn-buy-now');

// Size Pills
const sizePillsContainer = document.getElementById('pd-size-pills');
let selectedSize = '38';

// WOW! DEAL Elements
const dealToggle = document.getElementById('pd-deal-toggle');
const dealBody = document.getElementById('pd-deal-body');
const btnApplyAxis = document.getElementById('btn-apply-axis');
const btnApplySbi = document.getElementById('btn-apply-sbi');

// Location & Checkout Modals
const locationModal = document.getElementById('location-modal');
const btnSelectLocation = document.getElementById('btn-select-location');
const btnCloseLocation = document.getElementById('btn-close-location');
const btnApplyPincode = document.getElementById('btn-apply-pincode');
const inputPincode = document.getElementById('input-pincode');
const currentLocation = document.getElementById('pd-current-location');

const checkoutModal = document.getElementById('checkout-modal');
const btnCloseCheckout = document.getElementById('btn-close-checkout');
const btnConfirmOrder = document.getElementById('btn-confirm-order');

// Accordion Toggles
const highlightsToggle = document.getElementById('pd-highlights-toggle');
const highlightsBody = document.getElementById('pd-highlights-body');
const highlightsArrow = document.getElementById('pd-highlights-arrow');

const detailsToggle = document.getElementById('pd-details-toggle');
const detailsBody = document.getElementById('pd-details-body');

const reviewsToggle = document.getElementById('pd-reviews-toggle');
const reviewsBody = document.getElementById('pd-reviews-body');

let currentProduct = null;
let currentSellingPrice = 999;
let isBankDiscountApplied = false;

// Toast Function
function showToast(message) {
  if (!toastElement) return;
  toastElement.textContent = message;
  toastElement.classList.add('show');
  setTimeout(() => {
    toastElement.classList.remove('show');
  }, 2300);
}

// HTML Escaping Helper
function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
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

// 2. Wishlist State
if (wishlistBtn) {
  const isWishlisted = localStorage.getItem('wishlist_mufti') === 'true';
  if (isWishlisted) wishlistBtn.classList.add('active');

  wishlistBtn.addEventListener('click', () => {
    const active = wishlistBtn.classList.toggle('active');
    localStorage.setItem('wishlist_mufti', active ? 'true' : 'false');
    showToast(active ? 'Added to Wishlist ❤️' : 'Removed from Wishlist');
  });
}

// 3. Share Button
if (shareBtn) {
  shareBtn.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Product link copied to clipboard! 📋');
    }
  });
}

// 4. Cart Count & Add to Cart
function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('flipkart_cart') || '[]');
  if (cartBadge) {
    cartBadge.textContent = cart.length || '1';
  }
}
updateCartBadge();

if (cartBtn) {
  cartBtn.addEventListener('click', () => {
    showToast(`Flipkart Cart: ${cartBadge.textContent} item(s)`);
  });
}

if (btnAddCart) {
  btnAddCart.addEventListener('click', () => {
    const cart = JSON.parse(localStorage.getItem('flipkart_cart') || '[]');
    cart.push({
      id: currentProduct?.id || 1,
      name: currentProduct?.name || 'Product',
      size: selectedSize || '1 Unit',
      price: currentSellingPrice,
      img: currentProduct?.img1 || 'assets/images/chair_opt.jpg',
    });
    localStorage.setItem('flipkart_cart', JSON.stringify(cart));
    updateCartBadge();
    const toastMsg = currentProduct?.sizes ? `Added Size ${selectedSize} to Cart 🛒` : `Added to Cart 🛒`;
    showToast(toastMsg);
  });
}

// 5. Size Selection
if (sizePillsContainer) {
  sizePillsContainer.querySelectorAll('.pd-size-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      if (pill.classList.contains('disabled')) {
        showToast(`Size ${pill.dataset.size} is currently out of stock`);
        return;
      }
      sizePillsContainer.querySelectorAll('.pd-size-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      selectedSize = pill.dataset.size;
      showToast(`Selected Size: ${selectedSize}`);
    });
  });
}

// 6. WOW! DEAL Coupon Toggle & Application
if (dealToggle && dealBody) {
  dealToggle.addEventListener('click', () => {
    const isClosed = dealBody.style.display === 'none';
    dealBody.style.display = isClosed ? 'block' : 'none';
    dealToggle.querySelector('span:last-child').textContent = isClosed ? '▲' : '▼';
  });
}

function handleApplyCoupon(btn, bankName) {
  if (isBankDiscountApplied) {
    // Remove discount
    isBankDiscountApplied = false;
    currentSellingPrice = currentProduct?.selling_price || 999;
    btn.textContent = 'Apply';
    btn.classList.remove('applied');
    btnBuyNow.textContent = `Buy at ₹${currencyFormatter.format(currentSellingPrice)}`;
    showToast(`Removed ${bankName} discount`);
  } else {
    // Apply discount
    isBankDiscountApplied = true;
    currentSellingPrice = (currentProduct?.selling_price || 999) - 50;
    btn.textContent = 'Applied ✓';
    btn.classList.add('applied');
    btnBuyNow.textContent = `Buy at ₹${currencyFormatter.format(currentSellingPrice)}`;
    showToast(`₹50 Instant Discount Applied with ${bankName}! 🎉`);
  }
}

if (btnApplyAxis) {
  btnApplyAxis.addEventListener('click', () => handleApplyCoupon(btnApplyAxis, 'Flipkart Axis'));
}
if (btnApplySbi) {
  btnApplySbi.addEventListener('click', () => handleApplyCoupon(btnApplySbi, 'Flipkart SBI'));
}

// 7. Live Cutoff Timer (Order in 01h 59m 25s)
let cutoffSeconds = 1 * 3600 + 59 * 60 + 25;
const orderTimerEl = document.getElementById('pd-order-timer');

function updateCutoffTimer() {
  if (!orderTimerEl) return;
  if (cutoffSeconds <= 0) cutoffSeconds = 2 * 3600;
  const h = Math.floor(cutoffSeconds / 3600);
  const m = Math.floor((cutoffSeconds % 3600) / 60);
  const s = cutoffSeconds % 60;
  orderTimerEl.textContent = `Order in ${h < 10 ? '0' : ''}${h}h ${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
  cutoffSeconds--;
}
setInterval(updateCutoffTimer, 1000);
updateCutoffTimer();

// 8. Location Modal
if (btnSelectLocation && locationModal) {
  btnSelectLocation.addEventListener('click', () => {
    locationModal.classList.add('show');
  });
}
if (btnCloseLocation && locationModal) {
  btnCloseLocation.addEventListener('click', () => {
    locationModal.classList.remove('show');
  });
}
if (btnApplyPincode && inputPincode && currentLocation) {
  btnApplyPincode.addEventListener('click', () => {
    const val = inputPincode.value.trim();
    if (val.length === 6 && /^\d+$/.test(val)) {
      currentLocation.textContent = `Delivering to ${val}`;
      locationModal.classList.remove('show');
      showToast(`Pincode ${val} Verified! Next Day Delivery Available 🚚`);
    } else {
      showToast('Please enter a valid 6-digit Pincode');
    }
  });
}

// 9. Accordion Collapses
if (highlightsToggle && highlightsBody) {
  highlightsToggle.addEventListener('click', () => {
    const isHidden = highlightsBody.style.display === 'none';
    highlightsBody.style.display = isHidden ? 'block' : 'none';
    highlightsArrow.textContent = isHidden ? '▲' : '▼';
  });
}

if (detailsToggle && detailsBody) {
  detailsToggle.addEventListener('click', () => {
    const isHidden = detailsBody.style.display === 'none';
    detailsBody.style.display = isHidden ? 'block' : 'none';
    detailsToggle.querySelector('span:last-child').textContent = isHidden ? '▲' : '▼';
  });
}

if (reviewsToggle && reviewsBody) {
  reviewsToggle.addEventListener('click', () => {
    const isHidden = reviewsBody.style.display === 'none';
    reviewsBody.style.display = isHidden ? 'block' : 'none';
    reviewsToggle.querySelector('span:last-child').textContent = isHidden ? '▲' : '▼';
  });
}

// 10. Buy Now Modal Flow
if (btnBuyNow && checkoutModal) {
  btnBuyNow.addEventListener('click', () => {
    document.getElementById('checkout-size').textContent = selectedSize;
    document.getElementById('checkout-total').textContent = `Total: ₹${currencyFormatter.format(currentSellingPrice)}`;
    checkoutModal.classList.add('show');
  });
}

if (btnCloseCheckout && checkoutModal) {
  btnCloseCheckout.addEventListener('click', () => {
    checkoutModal.classList.remove('show');
  });
}

if (btnConfirmOrder && checkoutModal) {
  btnConfirmOrder.addEventListener('click', () => {
    checkoutModal.classList.remove('show');
    showToast(`Order Placed Successfully! Arriving by 10 Oct, Sat 📦`);
  });
}

// 11. Load Product Data from products.json
async function loadProduct() {
  try {
    const res = await fetch('./data/products.json');
    if (!res.ok) throw new Error('Catalog failed to load');
    const data = await res.json();
    const products = data.products || [];
    const similarProducts = data.similar_products || [];

    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('id');

    let prod = null;
    if (paramId) {
      prod = products.find((p) => String(p.md5_id) === String(paramId) || String(p.id) === String(paramId));
    }
    // Default to MUFTI shirt (product id 1) matching screenshots
    if (!prod) {
      prod = products.find((p) => p.brand === 'MUFTI') || products[0];
    }
    currentProduct = prod;
    currentSellingPrice = Number(prod.selling_price) || 999;

    // Populate Page Elements
    document.title = `${prod.name} - Flipkart`;
    const titleEl = document.getElementById('pd-title');
    if (titleEl) titleEl.textContent = prod.name;

    const brandStoreEl = document.getElementById('pd-brand-store');
    if (brandStoreEl) brandStoreEl.textContent = `Visit ${prod.brand || 'brand'} store`;

    // Setup Swipeable Full Catalog Image Carousel
    const carouselTrack = document.getElementById('pd-carousel-track');
    const dotsContainer = document.getElementById('pd-carousel-dots');

    // Collect full catalog images for this product
    const catalogImages = [];
    if (prod.img1) catalogImages.push(prod.img1);
    if (Array.isArray(prod.images)) {
      prod.images.forEach((img) => {
        if (img && !catalogImages.includes(img)) catalogImages.push(img);
      });
    }

    // Add related catalog images from same category
    const sameCategoryProds = products.filter(
      (p) => String(p.category).toLowerCase() === String(prod.category).toLowerCase() && p.id !== prod.id
    );
    for (const p of sameCategoryProds) {
      if (p.img1 && !catalogImages.includes(p.img1)) {
        catalogImages.push(p.img1);
        if (catalogImages.length >= 6) break;
      }
    }

    // If still less than 4, add from general catalog products
    if (catalogImages.length < 4) {
      for (const p of products) {
        if (p.img1 && !catalogImages.includes(p.img1)) {
          catalogImages.push(p.img1);
          if (catalogImages.length >= 4) break;
        }
      }
    }

    if (carouselTrack) {
      carouselTrack.innerHTML = catalogImages.map((src, idx) => `
        <div class="pd-carousel-slide" data-index="${idx}">
          <img src="${src}" alt="${escapeHtml(prod.name)} - Slide ${idx + 1}" ${idx === 0 ? 'id="pd-main-img"' : ''} onerror="this.src='./assets/images/chair_opt.jpg';">
        </div>
      `).join('');

      // Render matching carousel dots
      if (dotsContainer) {
        dotsContainer.innerHTML = catalogImages.map((_, idx) => `
          <span class="pd-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
        `).join('');

        // Dot click to slide
        dotsContainer.querySelectorAll('.pd-dot').forEach((dot) => {
          dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetIdx = Number(dot.dataset.index);
            const slideWidth = carouselTrack.clientWidth || carouselTrack.offsetWidth;
            carouselTrack.scrollTo({ left: targetIdx * slideWidth, behavior: 'smooth' });
            updateActiveDot(targetIdx);
          });
        });
      }

      function updateActiveDot(activeIdx) {
        if (!dotsContainer) return;
        dotsContainer.querySelectorAll('.pd-dot').forEach((dot, idx) => {
          if (idx === activeIdx) {
            dot.classList.add('active');
          } else {
            dot.classList.remove('active');
          }
        });
      }

      // Live touch scroll tracking for dots
      let scrollRaf = null;
      carouselTrack.addEventListener('scroll', () => {
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        scrollRaf = requestAnimationFrame(() => {
          const slideWidth = carouselTrack.clientWidth || carouselTrack.offsetWidth;
          if (slideWidth > 0) {
            const currentIdx = Math.round(carouselTrack.scrollLeft / slideWidth);
            updateActiveDot(currentIdx);
          }
        });
      }, { passive: true });

      // Mouse drag support for desktop
      let isMouseDown = false;
      let startX = 0;
      let startScroll = 0;

      carouselTrack.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        startX = e.pageX;
        startScroll = carouselTrack.scrollLeft;
        carouselTrack.style.scrollBehavior = 'auto';
      });

      window.addEventListener('mouseup', () => {
        if (isMouseDown) {
          isMouseDown = false;
          carouselTrack.style.scrollBehavior = 'smooth';
          const slideWidth = carouselTrack.clientWidth || carouselTrack.offsetWidth;
          const targetIdx = Math.round(carouselTrack.scrollLeft / slideWidth);
          carouselTrack.scrollTo({ left: targetIdx * slideWidth, behavior: 'smooth' });
          updateActiveDot(targetIdx);
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        e.preventDefault();
        const diffX = e.pageX - startX;
        carouselTrack.scrollLeft = startScroll - diffX;
      });
    } else {
      const mainImg = document.getElementById('pd-main-img');
      if (mainImg) {
        mainImg.src = prod.img1 || './assets/images/chair_opt.jpg';
        mainImg.alt = prod.name;
        mainImg.onerror = function() {
          if (!this._retried) {
            this._retried = true;
            this.src = './assets/images/chair_opt.jpg';
          }
        };
      }
    }

    const ratingVal = document.getElementById('pd-rating-val');
    if (ratingVal) ratingVal.textContent = prod.rating || '4.5';

    const reviewVal = document.getElementById('pd-review-val');
    if (reviewVal) reviewVal.textContent = prod.review_count || '1,248';

    const discountEl = document.getElementById('pd-discount');
    if (discountEl) discountEl.textContent = prod.discount_label || `↓ ${prod.discount_percent}%`;

    const mrpEl = document.getElementById('pd-mrp');
    if (mrpEl) mrpEl.textContent = `₹${currencyFormatter.format(prod.mrp || 2999)}`;

    const priceEl = document.getElementById('pd-price');
    if (priceEl) priceEl.textContent = `₹${currencyFormatter.format(currentSellingPrice)}`;

    if (btnBuyNow) {
      btnBuyNow.textContent = `Buy at ₹${currencyFormatter.format(currentSellingPrice)}`;
    }

    const badgeEl = document.getElementById('pd-badge');
    if (badgeEl) {
      badgeEl.textContent = prod.badge || 'Big Billion Days Price';
    }

    const deliveryEl = document.getElementById('pd-delivery-text');
    if (deliveryEl) {
      deliveryEl.textContent = prod.delivery_text || 'Delivery by 10 Oct, Sat';
    }

    const sellerNameEl = document.getElementById('pd-seller-name');
    if (sellerNameEl) sellerNameEl.textContent = prod.seller_name || 'RetailNet';

    const fullDescEl = document.getElementById('pd-full-description');
    if (fullDescEl) {
      fullDescEl.innerHTML = prod.features || `<p>${prod.name} with authentic 100% genuine quality check.</p>`;
    }

    // AD tag & Authorized Seller Shield visibility
    const adTagEl = document.getElementById('pd-ad-tag');
    if (adTagEl) {
      adTagEl.style.display = prod.ad ? 'block' : 'none';
    }

    const authBadgeEl = document.getElementById('pd-auth-badge');
    if (authBadgeEl) {
      authBadgeEl.style.display = prod.authorized_seller ? 'block' : 'none';
    }

    const dealPriceText = document.getElementById('pd-deal-price-text');
    if (dealPriceText) {
      const dealVal = prod.deal_price || (currentSellingPrice - 30);
      dealPriceText.textContent = `Buy at ₹${currencyFormatter.format(dealVal)}`;
    }

    // Size section: Show for products with sizes, hide for electronics/appliances
    const sizeSection = document.querySelector('.pd-size-section');
    if (sizeSection) {
      if (prod.sizes && Array.isArray(prod.sizes) && prod.sizes.length > 0) {
        sizeSection.style.display = 'block';
        if (sizePillsContainer) {
          const avail = prod.available_sizes || prod.sizes;
          sizePillsContainer.innerHTML = prod.sizes.map((s, idx) => {
            const isAvail = avail.includes(s);
            const isActive = idx === 0 && isAvail;
            if (isActive) selectedSize = s;
            return `<div class="pd-size-pill ${isActive ? 'active' : ''} ${!isAvail ? 'disabled' : ''}" data-size="${s}">${s}</div>`;
          }).join('');

          sizePillsContainer.querySelectorAll('.pd-size-pill').forEach((pill) => {
            pill.addEventListener('click', () => {
              if (pill.classList.contains('disabled')) {
                showToast(`Size ${pill.dataset.size} is out of stock`);
                return;
              }
              sizePillsContainer.querySelectorAll('.pd-size-pill').forEach((p) => p.classList.remove('active'));
              pill.classList.add('active');
              selectedSize = pill.dataset.size;
              showToast(`Selected Size: ${selectedSize}`);
            });
          });
        }
      } else {
        sizeSection.style.display = 'none';
        selectedSize = '1 Unit';
      }
    }

    // Populate Specs
    const specsGrid = document.getElementById('pd-specs-grid');
    if (specsGrid) {
      if (prod.specs && typeof prod.specs === 'object' && Object.keys(prod.specs).length > 0) {
        specsGrid.innerHTML = Object.entries(prod.specs).map(([label, val]) => `
          <div class="pd-spec-item"><span class="pd-spec-label">${escapeHtml(label)}</span><span class="pd-spec-value">${escapeHtml(String(val))}</span></div>
        `).join('');
      } else if (prod.fabric) {
        specsGrid.innerHTML = `
          <div class="pd-spec-item"><span class="pd-spec-label">Pack of</span><span class="pd-spec-value">${prod.pack_of || '1'}</span></div>
          <div class="pd-spec-item"><span class="pd-spec-label">Fabric</span><span class="pd-spec-value">${prod.fabric || 'Pure Cotton'}</span></div>
          <div class="pd-spec-item"><span class="pd-spec-label">Sleeve</span><span class="pd-spec-value">${prod.sleeve || 'Full Sleeve'}</span></div>
          <div class="pd-spec-item"><span class="pd-spec-label">Pattern</span><span class="pd-spec-value">${prod.pattern || 'Checkered'}</span></div>
          <div class="pd-spec-item"><span class="pd-spec-label">Collar</span><span class="pd-spec-value">${prod.collar || 'Spread'}</span></div>
          <div class="pd-spec-item"><span class="pd-spec-label">Color</span><span class="pd-spec-value">${prod.color || 'Blue, White, Yellow'}</span></div>
        `;
      } else {
        specsGrid.innerHTML = `
          <div class="pd-spec-item"><span class="pd-spec-label">Brand</span><span class="pd-spec-value">${escapeHtml(prod.brand || 'Flipkart')}</span></div>
          <div class="pd-spec-item"><span class="pd-spec-label">Category</span><span class="pd-spec-value">${escapeHtml(prod.category || 'General')}</span></div>
          <div class="pd-spec-item"><span class="pd-spec-label">Warranty</span><span class="pd-spec-value">1 Year Manufacturer Warranty</span></div>
          <div class="pd-spec-item"><span class="pd-spec-label">Flipkart Assured</span><span class="pd-spec-value">Verified Quality Checked</span></div>
        `;
      }
    }

    // Populate Similar Products
    const similarGrid = document.getElementById('pd-similar-grid');
    if (similarGrid && similarProducts.length > 0) {
      similarGrid.innerHTML = '';
      similarProducts.forEach((item) => {
        const itemCard = document.createElement('div');
        itemCard.className = 'pd-similar-card';
        itemCard.innerHTML = `
          <div class="pd-similar-img-box">
            <img src="${item.img1}" alt="${item.name}" onerror="this.src='./assets/images/cat_men.jpg';">
            <span class="pd-similar-rating">${item.rating} ★</span>
          </div>
          <div class="pd-similar-info">
            <div class="pd-similar-title-txt">${item.short_name || item.name}</div>
            <div class="pd-similar-price-row">
              <span class="pd-similar-discount">${item.discount_label}</span>
              <span class="pd-similar-price">₹${currencyFormatter.format(item.selling_price)}</span>
            </div>
            ${item.badge ? `<div style="background: #6a1b9a; color: #fff; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; margin-top: 4px; display: inline-block;">${item.badge}</div>` : ''}
          </div>
        `;
        itemCard.addEventListener('click', () => {
          window.location.href = `product-detail.html?id=${item.id}`;
        });
        similarGrid.appendChild(itemCard);
      });
    }
  } catch (err) {
    console.error('Failed to load product details:', err);
  }
}

loadProduct();
