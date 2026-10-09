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
    window.location.href = 'checkout.html';
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
      img: currentProduct?.img1 || '',
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

// 10. Buy Now Flow -> Full Cart, Address & Payment Page
if (btnBuyNow) {
  btnBuyNow.addEventListener('click', () => {
    const checkoutItem = {
      id: currentProduct?.id,
      md5_id: currentProduct?.md5_id,
      name: currentProduct?.name || 'Product',
      brand: currentProduct?.brand || 'Brand',
      size: selectedSize || 'Standard',
      price: currentSellingPrice,
      mrp: currentProduct?.mrp || (currentSellingPrice * 2),
      discount_label: currentProduct?.discount_label || '↓ 50%',
      discount_percent: currentProduct?.discount_percent || 50,
      img: currentProduct?.img1 || '',
      delivery_text: currentProduct?.delivery_text || 'Free Delivery by 12 Oct',
      seller_name: currentProduct?.seller_name || 'RetailNet',
      quantity: 1,
    };
    localStorage.setItem('flipkart_checkout_item', JSON.stringify(checkoutItem));
    window.location.href = `checkout.html?id=${encodeURIComponent(currentProduct?.md5_id || currentProduct?.id || 1)}`;
  });
}

// 11. Load Product Data from products.json
async function loadProduct() {
  try {
    const res = await fetch('./data/products.json?v=' + Date.now());
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
    // Default to first product in catalog if not matched
    if (!prod) {
      prod = products[0];
    }
    currentProduct = prod;
    currentSellingPrice = Number(prod.selling_price) || 999;

    // Populate Page Elements
    document.title = `${prod.name} - Flipkart`;
    const titleEl = document.getElementById('pd-title');
    if (titleEl) titleEl.textContent = prod.name;

    const brandStoreEl = document.getElementById('pd-brand-store');
    if (brandStoreEl) brandStoreEl.textContent = `Visit ${prod.brand || 'brand'} store`;

    // Product Sub-Type Classification Helper
    function getProductType(name, category) {
      const t = (name || '').toLowerCase();
      const c = (category || '').toLowerCase();
      if (c.includes('men') || c.includes('women') || c.includes('kid') || c.includes('fashion') || t.includes('shirt') || t.includes('kurta') || t.includes('anarkali') || t.includes('lehenga') || t.includes('ethnic')) {
        return 'fashion';
      }
      if (t.includes('fan') || t.includes('bldc') || t.includes('pedestal') || t.includes('tower fan') || t.includes('ceiling')) {
        return 'fan';
      }
      if (t.includes('mixer') || t.includes('grinder') || t.includes('juicer') || t.includes('blender') || t.includes('nutri-blend') || t.includes('food processor')) {
        return 'mixer';
      }
      if (t.includes('cooker') || t.includes('casserole') || t.includes('dinner set') || t.includes('cookware') || t.includes('kadhai') || t.includes('kitchen set') || t.includes('kitchen in the box') || t.includes('opalware') || t.includes('pan')) {
        return 'cookware';
      }
      if (t.includes('stove') || t.includes('hob') || t.includes('cooktop') || t.includes('burner') || t.includes('induction')) {
        return 'stove';
      }
      if (t.includes('cooler') || t.includes('air cooler')) {
        return 'cooler';
      }
      if (t.includes('iron') || t.includes('steamer') || t.includes('cloth dry') || t.includes('dryer') || t.includes('hanger') || t.includes('rack')) {
        return 'iron_laundry';
      }
      if (t.includes('kettle') || t.includes('egg boiler') || t.includes('sandwich')) {
        return 'kettle_small_appliance';
      }
      if (t.includes('smartwatch') || t.includes('band') || t.includes('reflex') || t.includes('pulse')) {
        return 'smartwatch';
      }
      if (t.includes('headset') || t.includes('buds') || t.includes('speaker') || t.includes('soundbar') || t.includes('guitar') || t.includes('truesport')) {
        return 'audio';
      }
      if (t.includes('vacuum') || t.includes('cleaner') || t.includes('purifier') || t.includes('sewing') || t.includes('calf')) {
        return 'home_utility';
      }
      if (t.includes('pen drive') || t.includes('flash drive') || t.includes('laptop table')) {
        return 'gadget_storage';
      }
      return 'general';
    }

    const currentType = getProductType(prod.name, prod.category);

    // Filter products belonging strictly to the SAME sub-type
    const sameTypeProds = products.filter(
      (p) => p.id !== prod.id && getProductType(p.name, p.category) === currentType
    );

    // Setup Product Image Carousel (strictly showing only this product's own images)
    const carouselTrack = document.getElementById('pd-carousel-track');
    const dotsContainer = document.getElementById('pd-carousel-dots');

    // Strictly this product's authentic images
    const rawImages = (Array.isArray(prod.images) && prod.images.length > 0)
      ? prod.images.filter(Boolean)
      : [prod.img1].filter(Boolean);
    const catalogImages = rawImages.length > 0 ? rawImages : (prod.img1 ? [prod.img1] : []);

    if (carouselTrack) {
      carouselTrack.innerHTML = catalogImages.map((src, idx) => `
        <div class="pd-carousel-slide" data-index="${idx}">
          <img src="${src}" alt="${escapeHtml(prod.name)} - Slide ${idx + 1}" ${idx === 0 ? 'id="pd-main-img"' : ''} onerror="this.onerror=null; if(this.src.includes('?')){this.src=this.src.split('?')[0];}">
        </div>
      `).join('');

      // Render carousel dots only if there are multiple images for this product
      if (dotsContainer) {
        if (catalogImages.length > 1) {
          dotsContainer.style.display = 'flex';
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
        } else {
          dotsContainer.style.display = 'none';
          dotsContainer.innerHTML = '';
        }
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

    // Product-Specific Reviews, Loved Tags, and Review Photos
    const PRODUCT_REVIEWS_MAP = {
      fan: {
        lovedTags: ['Air Delivery', 'Silent Motor', 'Energy Saving', 'Remote Control', 'Design'],
        reviews: [
          {
            rating: 5,
            title: 'Super silent & energy efficient fan',
            time: '2 weeks ago',
            text: 'Amazing BLDC fan! Absolutely whisper-quiet even on full speed. Remote works from anywhere in the bedroom and it consumes barely 28-35 watts. Worth every rupee during Big Billion Days.',
          },
          {
            rating: 5,
            title: 'Strong air delivery across the room',
            time: '1 month ago',
            text: 'The air throw is very wide and covers all corners of our large room. Delivered safely with all mounting accessories, canopy, and genuine brand warranty card.',
          },
          {
            rating: 4,
            title: 'Modern look and high speed',
            time: '2 months ago',
            text: 'Looks very elegant on the ceiling. Installation was straightforward and cooling is top notch.',
          },
        ],
      },
      mixer: {
        lovedTags: ['Grinding Power', 'Jar Build Quality', 'Motor Speed', 'Easy to Clean', 'Safety Switch'],
        reviews: [
          {
            rating: 5,
            title: 'Heavy duty grinding power',
            time: '10 days ago',
            text: 'Grinds tough spices, turmeric and thick dosa batter effortlessly in seconds. The stainless steel jars have strong locks and heavy handles.',
          },
          {
            rating: 5,
            title: 'Superb motor and sharp blades',
            time: '3 weeks ago',
            text: 'The motor is very powerful and quick cool ventilation keeps it running without overheating. Chutney jar makes ultra-fine paste quickly.',
          },
          {
            rating: 4,
            title: 'Value for money mixer grinder',
            time: '1 month ago',
            text: 'Does the job wonderfully for daily cooking. 3 speed settings with pulse function give great control. Very easy to wash and clean.',
          },
        ],
      },
      stove: {
        lovedTags: ['Even Flame', 'Toughened Glass', 'Auto-Ignition', 'Easy to Clean', 'Brass Burners'],
        reviews: [
          {
            rating: 5,
            title: 'Sturdy glass top & uniform flame',
            time: '2 weeks ago',
            text: 'The toughened glass top looks sleek and wipes clean with a wet cloth. Burners produce high efficiency blue flame with zero soot.',
          },
          {
            rating: 5,
            title: 'Smooth auto ignition',
            time: '1 month ago',
            text: 'Knobs turn smoothly and ignition sparks reliably on the first click. Pan supports hold heavy kadais firmly without wobbling.',
          },
          {
            rating: 4,
            title: 'Solid construction',
            time: '2 months ago',
            text: 'Spill proof design makes everyday kitchen cleaning very easy. Good spacing between all burners.',
          },
        ],
      },
      cookware: {
        lovedTags: ['Even Heating', 'Non-Stick Coating', 'Sturdy Handles', 'Easy to Clean', 'Food-Grade'],
        reviews: [
          {
            rating: 5,
            title: 'True non-stick & healthy cooking',
            time: '1 week ago',
            text: 'Hardly requires a drop of oil to cook dosas and vegetables. Very easy to clean with a soft sponge, no scrubbing needed.',
          },
          {
            rating: 5,
            title: 'Heavy gauge material',
            time: '3 weeks ago',
            text: 'Uniform heat distribution ensures food cooks evenly without burning at the bottom. Handles stay cool while on the gas stove.',
          },
          {
            rating: 4,
            title: 'Complete kitchen combo',
            time: '1 month ago',
            text: 'Very practical set for daily family cooking. Durable coating and looks premium on the dining table.',
          },
        ],
      },
      cooler: {
        lovedTags: ['Instant Cooling', 'Honeycomb Pads', 'Ice Chamber', 'Air Throw', 'Inverter Support'],
        reviews: [
          {
            rating: 5,
            title: 'Chills the room fast',
            time: '2 weeks ago',
            text: 'Thick honeycomb pads hold water well and the ice chamber gives instant cold air during peak afternoon heat.',
          },
          {
            rating: 5,
            title: 'Smooth multi-speed airflow',
            time: '1 month ago',
            text: 'Air delivery reaches across the entire hall. Castor wheels make moving it between rooms very convenient.',
          },
        ],
      },
      iron_laundry: {
        lovedTags: ['Smooth Glide', 'Quick Heating', 'Steam Burst', 'Lightweight', 'Fabric Safety'],
        reviews: [
          {
            rating: 5,
            title: 'Glides like butter on clothes',
            time: '5 days ago',
            text: 'Non-stick soleplate does not stick to cotton or synthetics. Fast heating in under 30 seconds makes morning ironing a breeze.',
          },
          {
            rating: 5,
            title: 'Heavy crease removal',
            time: '3 weeks ago',
            text: 'Lightweight yet removes stubborn wrinkles with ease. 360 degree swivel cord gives full flexibility.',
          },
        ],
      },
      kettle_small_appliance: {
        lovedTags: ['Fast Boiling', 'Auto Cut-Off', 'Stainless Steel Interior', 'Cool Touch Body'],
        reviews: [
          {
            rating: 5,
            title: 'Boils in under 2 minutes',
            time: '1 week ago',
            text: 'Boils water for tea and coffee rapidly. Auto cut-off triggers safely and keep warm function is very handy.',
          },
          {
            rating: 4,
            title: 'Durable build quality',
            time: '3 weeks ago',
            text: 'Food grade stainless steel interior with wide opening makes cleaning very simple. Solid everyday appliance.',
          },
        ],
      },
      smartwatch: {
        lovedTags: ['Display Clarity', 'Battery Life', 'Bluetooth Calling', 'SpO2 & Heart Rate', 'Watch Faces'],
        reviews: [
          {
            rating: 5,
            title: 'Crisp bright display & clear calls',
            time: '1 week ago',
            text: 'Bluetooth calling audio is surprisingly clear through the built-in speaker. Battery easily lasts 6-7 days on normal usage.',
          },
          {
            rating: 5,
            title: 'Accurate health metrics',
            time: '2 weeks ago',
            text: 'Heart rate and SpO2 tracking match clinical monitors closely. Step counter and sleep analysis are very helpful.',
          },
        ],
      },
      audio: {
        lovedTags: ['Deep Bass', 'Battery Backup', 'Noise Cancellation', 'Comfortable Fit', 'Clear Calling'],
        reviews: [
          {
            rating: 5,
            title: 'Thumping bass and crystal vocals',
            time: '10 days ago',
            text: 'Sound quality is crisp with deep punchy bass. Connectivity connects instantly without any audio latency.',
          },
          {
            rating: 5,
            title: 'Comfortable ergonomic fit',
            time: '3 weeks ago',
            text: 'Can wear them for hours without ear fatigue. Battery life with charging case lasts days.',
          },
        ],
      },
      home_utility: {
        lovedTags: ['Powerful Suction', 'Quiet Operation', 'Easy Maintenance', 'Durable Motor'],
        reviews: [
          {
            rating: 5,
            title: 'Remarkable cleaning power',
            time: '2 weeks ago',
            text: 'High suction power cleans deep dust from carpets, sofas, and floor tiles. Multiple accessories included are very useful.',
          },
        ],
      },
      fashion: {
        lovedTags: ['Fabric Quality', 'Vibrant Color', 'Comfortable Fit', 'Stitching Finish'],
        reviews: [
          {
            rating: 5,
            title: 'Premium pure cotton fabric',
            time: '2 weeks ago',
            text: 'Very comfortable breathable cotton material. Fitting is true to size and colors remain vibrant after washing.',
          },
          {
            rating: 4,
            title: 'Festive look and fine stitching',
            time: '1 month ago',
            text: 'Received exactly as shown in images. Perfect for festivals and party wear.',
          },
        ],
      },
      general: {
        lovedTags: ['Build Quality', 'Value for Money', 'Packaging', 'Performance'],
        reviews: [
          {
            rating: 5,
            title: 'Excellent purchase in Big Billion Days',
            time: '1 week ago',
            text: 'Original brand product received in genuine company packaging. Fast delivery and working flawlessly.',
          },
        ],
      },
    };

    const revConfig = PRODUCT_REVIEWS_MAP[currentType] || PRODUCT_REVIEWS_MAP.general;

    const bigRatingEl = document.getElementById('pd-big-rating');
    if (bigRatingEl) bigRatingEl.textContent = `${prod.rating || '4.5'} ★`;

    const ratingStatusEl = document.getElementById('pd-rating-status');
    if (ratingStatusEl) {
      ratingStatusEl.textContent = Number(prod.rating || 4.5) >= 4.4 ? 'Very Good' : 'Good';
    }

    const ratingVerifiedEl = document.getElementById('pd-rating-verified');
    if (ratingVerifiedEl) {
      ratingVerifiedEl.textContent = `based on ${prod.review_count || '1,248'} ratings by ✓ Verified Buyers`;
    }

    // Features customers loved
    const lovedRowEl = document.getElementById('pd-loved-features-row');
    if (lovedRowEl && revConfig.lovedTags) {
      lovedRowEl.innerHTML = revConfig.lovedTags.map(
        (tag) => `<span class="pd-loved-tag">${escapeHtml(tag)}</span>`
      ).join('');
    }

    // Customer review photos (strictly this product's own image)
    const reviewPhotosStripEl = document.getElementById('pd-review-photos-strip');
    if (reviewPhotosStripEl) {
      const revPhotos = (Array.isArray(prod.images) && prod.images.length > 0)
        ? prod.images.filter(Boolean)
        : [prod.img1].filter(Boolean);
      reviewPhotosStripEl.innerHTML = revPhotos.map(
        (src) => `<img src="${src}" alt="${escapeHtml(prod.name)}" class="pd-rev-img" onerror="this.onerror=null; if(this.src.includes('?')){this.src=this.src.split('?')[0];}">`
      ).join('');
    }

    // Verified review list
    const reviewListEl = document.getElementById('pd-review-cards-list');
    if (reviewListEl && revConfig.reviews) {
      reviewListEl.innerHTML = revConfig.reviews.map((rev) => `
        <div class="pd-review-card">
          <div class="pd-rev-top">
            <span class="pd-rev-star">${rev.rating} ★</span>
            <span class="pd-rev-title">${escapeHtml(rev.title)}</span>
            <span class="pd-rev-time">${escapeHtml(rev.time)}</span>
          </div>
          <div class="pd-rev-text">${escapeHtml(rev.text)}</div>
        </div>
      `).join('');
    }

    // Populate Similar Products with matching SUB-TYPE only!
    const similarGrid = document.getElementById('pd-similar-grid');
    if (similarGrid) {
      similarGrid.innerHTML = '';
      let similarList = sameTypeProds.slice(0, 4);
      if (similarList.length === 0) {
        similarList = products.filter((p) => p.id !== prod.id && p.category === prod.category).slice(0, 4);
      }
      similarList.forEach((item) => {
        const itemCard = document.createElement('div');
        itemCard.className = 'pd-similar-card';
        itemCard.innerHTML = `
          <div class="pd-similar-img-box">
            <img src="${item.img1}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null; if(this.src.includes('?')){this.src=this.src.split('?')[0];}">
            <span class="pd-similar-rating">${item.rating} ★</span>
          </div>
          <div class="pd-similar-info">
            <div class="pd-similar-title-txt">${escapeHtml(item.short_name || item.name)}</div>
            <div class="pd-similar-price-row">
              <span class="pd-similar-discount">${escapeHtml(item.discount_label)}</span>
              <span class="pd-similar-price">₹${currencyFormatter.format(item.selling_price)}</span>
            </div>
            ${item.badge ? `<div style="background: #6a1b9a; color: #fff; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; margin-top: 4px; display: inline-block;">${escapeHtml(item.badge)}</div>` : ''}
          </div>
        `;
        itemCard.addEventListener('click', () => {
          window.location.href = `product-detail.html?id=${encodeURIComponent(item.md5_id || item.id)}`;
        });
        similarGrid.appendChild(itemCard);
      });
    }
  } catch (err) {
    console.error('Failed to load product details:', err);
  }
}

loadProduct();
