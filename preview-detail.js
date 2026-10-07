const currencyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

const backBtn = document.getElementById('back-btn');
const toastElement = document.getElementById('toast');
const cartBadge = document.getElementById('cart-count-badge');
const btnAddCart = document.getElementById('btn-add-cart');
const btnBuyNow = document.getElementById('btn-buy-now');
const wishlistBtn = document.getElementById('detail-wishlist-btn');
const shareBtn = document.getElementById('detail-share-btn');

function showToast(message) {
  if (!toastElement) return;
  toastElement.textContent = message;
  toastElement.classList.add('show');
  setTimeout(() => {
    toastElement.classList.remove('show');
  }, 2200);
}

// Back Button
if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });
}

// Update Cart Badge from Storage
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('flipkart_cart') || '[]');
  if (cartBadge) {
    cartBadge.textContent = cart.length || '1';
  }
}
updateCartCount();

// Parse Product ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const productIdParam = urlParams.get('id');

async function loadProductDetails() {
  try {
    const res = await fetch('./data/products.json');
    if (!res.ok) throw new Error('Catalog failed to load');
    const data = await res.json();
    const products = data.products || [];
    const variants = data.variants || [];

    // Find Product by md5_id or id
    let product = products.find(
      (p) => String(p.md5_id) === String(productIdParam) || String(p.id) === String(productIdParam)
    );

    if (!product && products.length > 0) {
      product = products[0]; // fallback to first product
    }

    if (!product) {
      document.getElementById('detail-title').textContent = 'Product Not Found';
      return;
    }

    // Set Meta & Title
    document.title = `${product.name} - Flipkart The Big Billion Days`;

    // Populate Fields
    document.getElementById('detail-img').src = product.img1 || './assets/images/chair.svg';
    document.getElementById('detail-img').alt = product.name;
    document.getElementById('detail-brand').textContent = product.brand || 'FLIPKART';
    document.getElementById('detail-title').textContent = product.name || '';
    document.getElementById('detail-rating').textContent = product.rating || '4.5';
    document.getElementById('detail-rating-count').textContent = `${product.review_count || '1,280'} Ratings & Reviews`;

    const mrp = Number(product.mrp) || 0;
    const price = Number(product.selling_price) || 0;
    const discountRate = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : product.discount_percent || 90;

    document.getElementById('detail-discount').textContent = `${discountRate}% off`;
    document.getElementById('detail-mrp').textContent = `₹${currencyFormatter.format(mrp)}`;
    document.getElementById('detail-price').textContent = `₹${currencyFormatter.format(price)}`;

    const deliveryText = product.delivery_text || 'Get it by 11 Oct';
    document.getElementById('detail-delivery').innerHTML = `Get it by <b>${deliveryText.replace('Get it by ', '')}</b> | <span style="color: #388e3c; font-weight: 700;">FREE Delivery</span>`;

    document.getElementById('detail-specs').innerHTML = product.features || '<p>High quality product with official manufacturer warranty.</p>';

    // Wishlist Button State
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

    // Product Variants Setup
    const prodVariants = variants.filter((v) => v.product_id === product.id);

    // Color Variants
    const colors = [...new Set(prodVariants.map((v) => v.color).filter(Boolean))];
    const colorWrap = document.getElementById('color-variant-wrap');
    const colorContainer = document.getElementById('color-options-container');

    if (colors.length > 0 && colorWrap && colorContainer) {
      colorWrap.style.display = 'block';
      colorContainer.innerHTML = '';
      colors.forEach((color, i) => {
        const chip = document.createElement('button');
        chip.className = `variant-chip ${i === 0 ? 'active' : ''}`;
        chip.textContent = color;
        chip.addEventListener('click', () => {
          colorContainer.querySelectorAll('.variant-chip').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
          showToast(`Selected Color: ${color}`);
        });
        colorContainer.appendChild(chip);
      });
    }

    // Size / Storage Variants
    const storages = [...new Set(prodVariants.map((v) => v.storage || v.size).filter(Boolean))];
    const sizeWrap = document.getElementById('size-variant-wrap');
    const sizeContainer = document.getElementById('size-options-container');
    const sizeLabel = document.getElementById('size-variant-label');

    if (storages.length > 0 && sizeWrap && sizeContainer) {
      sizeWrap.style.display = 'block';
      if (sizeLabel) {
        sizeLabel.textContent = prodVariants.some((v) => v.storage) ? 'Select Storage' : 'Select Size';
      }
      sizeContainer.innerHTML = '';
      storages.forEach((storage, i) => {
        const chip = document.createElement('button');
        chip.className = `variant-chip ${i === 0 ? 'active' : ''}`;
        chip.textContent = storage;
        chip.addEventListener('click', () => {
          sizeContainer.querySelectorAll('.variant-chip').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
          showToast(`Selected: ${storage}`);
        });
        sizeContainer.appendChild(chip);
      });
    }

    // Add to Cart
    if (btnAddCart) {
      btnAddCart.addEventListener('click', () => {
        const cart = JSON.parse(localStorage.getItem('flipkart_cart') || '[]');
        cart.push(product.id);
        localStorage.setItem('flipkart_cart', JSON.stringify(cart));
        updateCartCount();
        showToast('Added to Cart 🛒');
      });
    }

    // Buy Now
    if (btnBuyNow) {
      btnBuyNow.addEventListener('click', () => {
        showToast('Proceeding to Big Billion Days Instant Checkout...');
      });
    }
  } catch (err) {
    console.error('Failed to load product detail:', err);
  }
}

loadProductDetails();
