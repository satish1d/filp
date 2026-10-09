// Real-time Flipkart Cart Management
const currencyFormatter = new Intl.NumberFormat('en-IN');

// Elements
const cartItemsList = document.getElementById('cart-items-list');
const emptyCartBox = document.getElementById('empty-cart-box');
const cartHeaderTitle = document.getElementById('cart-header-title');
const cartHeaderSubtitle = document.getElementById('cart-header-subtitle');
const offersCard = document.getElementById('offers-card');
const priceDetailsCard = document.getElementById('price-details-card');
const cartBottomBar = document.getElementById('cart-bottom-bar');
const btnPlaceOrder = document.getElementById('btn-place-order');
const btnBack = document.getElementById('btn-back');
const toast = document.getElementById('checkout-toast');

// Price elements
const priceItemsLabel = document.getElementById('price-items-label');
const priceTotalMrp = document.getElementById('price-total-mrp');
const priceDiscountAmt = document.getElementById('price-discount-amt');
const couponRow = document.getElementById('coupon-row');
const couponDiscountAmt = document.getElementById('coupon-discount-amt');
const priceFinalTotal = document.getElementById('price-final-total');
const totalSavingsText = document.getElementById('total-savings-text');
const bottomBarPrice = document.getElementById('bottom-bar-price');
const btnToggleCoupon = document.getElementById('btn-toggle-coupon');

// Address preview
const stripRecipient = document.getElementById('strip-recipient');
const stripAddressText = document.getElementById('strip-address-text');

let isCouponApplied = false;

// 1. Toast Helper
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

// 2. Load and Default Delivery Address
function loadDeliveryAddress() {
  const saved = localStorage.getItem('flipkart_delivery_address');
  let addr;
  if (saved) {
    try { addr = JSON.parse(saved); } catch (e) {}
  }
  if (!addr) {
    addr = {
      name: 'Satish Patel',
      phone: '9876543210',
      pincode: '400001',
      locality: 'Green Avenue',
      address: 'Flat 402, Green Avenue, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      type: 'Home'
    };
    localStorage.setItem('flipkart_delivery_address', JSON.stringify(addr));
  }

  if (stripRecipient) stripRecipient.textContent = `${addr.name}, ${addr.pincode}`;
  if (stripAddressText) stripAddressText.textContent = `${addr.address}, ${addr.city}`;
}

// 3. Cart State Retrieval
function getCartItems() {
  try {
    const raw = localStorage.getItem('flipkart_cart');
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (e) {
    return [];
  }
}

function saveCartItems(items) {
  localStorage.setItem('flipkart_cart', JSON.stringify(items));
}

// 4. Calculate Totals
function calculateTotals(items) {
  let totalMrp = 0;
  let totalSelling = 0;
  let totalQty = 0;

  items.forEach(item => {
    const qty = item.quantity || 1;
    totalQty += qty;
    const selling = Number(item.price) || 0;
    const mrp = Number(item.mrp) || Math.round(selling * 2.5);
    totalSelling += selling * qty;
    totalMrp += mrp * qty;
  });

  const discount = Math.max(0, totalMrp - totalSelling);
  const couponDiscount = isCouponApplied ? 50 : 0;
  const finalPayable = Math.max(0, totalSelling - couponDiscount);
  const totalSavings = discount + couponDiscount;

  return { totalMrp, totalSelling, totalQty, discount, couponDiscount, finalPayable, totalSavings };
}

// 5. Update UI in Real Time
function renderCart() {
  const items = getCartItems();

  if (items.length === 0) {
    if (cartItemsList) cartItemsList.style.display = 'none';
    if (offersCard) offersCard.style.display = 'none';
    if (priceDetailsCard) priceDetailsCard.style.display = 'none';
    if (cartBottomBar) cartBottomBar.style.display = 'none';
    if (emptyCartBox) emptyCartBox.classList.add('show');
    if (cartHeaderTitle) cartHeaderTitle.textContent = 'My Cart';
    if (cartHeaderSubtitle) cartHeaderSubtitle.textContent = '0 Items';
    return;
  }

  if (cartItemsList) cartItemsList.style.display = 'block';
  if (offersCard) offersCard.style.display = 'flex';
  if (priceDetailsCard) priceDetailsCard.style.display = 'block';
  if (cartBottomBar) cartBottomBar.style.display = 'flex';
  if (emptyCartBox) emptyCartBox.classList.remove('show');

  const { totalMrp, totalSelling, totalQty, discount, couponDiscount, finalPayable, totalSavings } = calculateTotals(items);

  // Headers
  if (cartHeaderTitle) cartHeaderTitle.textContent = 'My Cart';
  if (cartHeaderSubtitle) cartHeaderSubtitle.textContent = `${totalQty} ${totalQty === 1 ? 'Item' : 'Items'}`;

  // Price details
  if (priceItemsLabel) priceItemsLabel.textContent = `Price (${totalQty} ${totalQty === 1 ? 'item' : 'items'})`;
  if (priceTotalMrp) priceTotalMrp.textContent = `₹${currencyFormatter.format(totalMrp)}`;
  if (priceDiscountAmt) priceDiscountAmt.textContent = `-₹${currencyFormatter.format(discount)}`;
  if (couponRow) couponRow.style.display = isCouponApplied ? 'flex' : 'none';
  if (couponDiscountAmt) couponDiscountAmt.textContent = `-₹50`;
  if (priceFinalTotal) priceFinalTotal.textContent = `₹${currencyFormatter.format(finalPayable)}`;
  if (totalSavingsText) totalSavingsText.textContent = `₹${currencyFormatter.format(totalSavings)}`;
  if (bottomBarPrice) bottomBarPrice.textContent = `₹${currencyFormatter.format(finalPayable)}`;

  // Render Items List
  cartItemsList.innerHTML = '';
  items.forEach((item, index) => {
    const qty = item.quantity || 1;
    const price = Number(item.price) || 0;
    const mrp = Number(item.mrp) || Math.round(price * 2.5);
    const discountPct = item.discount_pct || (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

    const card = document.createElement('div');
    card.className = 'cart-item-card-wrapper';
    card.innerHTML = `
      <div class="cart-item-card">
        <div class="cart-item-thumb">
          <img src="${item.img || './assets/images/chair_opt.jpg'}" alt="${escapeHtml(item.name || 'Product')}"
               onerror="this.src='./assets/images/chair_opt.jpg'">
        </div>
        <div class="cart-item-details">
          <span class="cart-item-brand">${escapeHtml(item.brand || 'Flipkart')}</span>
          <h3 class="cart-item-title">${escapeHtml(item.name || 'Item')}</h3>
          <div class="cart-item-variant">
            <span>Size: <strong>${escapeHtml(item.size || 'Standard')}</strong></span>
            <span>•</span>
            <span class="cart-item-seller">
              <img src="./assets/images/f_assured.svg" alt="Assured" class="f-assured-pill">
            </span>
          </div>
          <div class="cart-item-pricing">
            <span class="price-current">₹${currencyFormatter.format(price)}</span>
            <span class="price-original">₹${currencyFormatter.format(mrp)}</span>
            <span class="price-discount">${discountPct}% off</span>
          </div>
          <div class="delivery-promise">
            <span>🚚 Free delivery by <strong>Tomorrow, 11 PM</strong></span>
          </div>
        </div>
      </div>
      <div class="cart-item-actions">
        <div class="qty-control">
          <button class="qty-btn btn-qty-minus" data-index="${index}" aria-label="Decrease quantity">−</button>
          <span class="qty-display">${qty}</span>
          <button class="qty-btn btn-qty-plus" data-index="${index}" aria-label="Increase quantity">+</button>
        </div>
        <div class="action-buttons-group">
          <button class="btn-item-action btn-save-later" data-index="${index}">Save for later</button>
          <button class="btn-item-action remove-btn btn-remove-item" data-index="${index}">✕ Remove</button>
        </div>
      </div>
    `;
    cartItemsList.appendChild(card);
  });

  attachItemEvents();
}

// 6. Action Events
function attachItemEvents() {
  document.querySelectorAll('.btn-qty-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      const items = getCartItems();
      if (items[idx]) {
        items[idx].quantity = (items[idx].quantity || 1) + 1;
        saveCartItems(items);
        renderCart();
        showToast('Quantity updated');
      }
    });
  });

  document.querySelectorAll('.btn-qty-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      const items = getCartItems();
      if (items[idx]) {
        if ((items[idx].quantity || 1) > 1) {
          items[idx].quantity -= 1;
          saveCartItems(items);
          renderCart();
          showToast('Quantity updated');
        } else {
          // If 1, ask to remove
          if (confirm('Do you want to remove this item from your cart?')) {
            items.splice(idx, 1);
            saveCartItems(items);
            renderCart();
            showToast('Item removed from cart');
          }
        }
      }
    });
  });

  document.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      const items = getCartItems();
      if (items[idx]) {
        const removedName = items[idx].name;
        items.splice(idx, 1);
        saveCartItems(items);
        renderCart();
        showToast(`Removed from cart`);
      }
    });
  });

  document.querySelectorAll('.btn-save-later').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Item moved to Save for Later 📌');
    });
  });
}

// 7. Toggle Coupon
if (btnToggleCoupon) {
  btnToggleCoupon.addEventListener('click', () => {
    isCouponApplied = !isCouponApplied;
    btnToggleCoupon.textContent = isCouponApplied ? 'Remove' : 'Apply';
    btnToggleCoupon.style.borderColor = isCouponApplied ? '#dc2626' : 'var(--fk-blue)';
    btnToggleCoupon.style.color = isCouponApplied ? '#dc2626' : 'var(--fk-blue)';
    renderCart();
    showToast(isCouponApplied ? 'Coupon BBD50 applied! Saved ₹50 🎉' : 'Coupon removed');
  });
}

// 8. Navigation & Checkout
if (btnPlaceOrder) {
  btnPlaceOrder.addEventListener('click', () => {
    const items = getCartItems();
    if (items.length === 0) {
      showToast('Your cart is empty');
      return;
    }
    // Proceed to Step 2: Address
    window.location.href = 'checkout-address.html';
  });
}

if (btnBack) {
  btnBack.addEventListener('click', () => {
    if (document.referrer && document.referrer.includes(window.location.host)) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDeliveryAddress();
  renderCart();
});
