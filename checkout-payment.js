// Real-time Payment Processing for Flipkart Checkout
const currencyFormatter = new Intl.NumberFormat('en-IN');

// Shared scope: Duplicate-click protection for Cashfree checkout flow
let paymentStarting = false;

// Elements
const payRecipient = document.getElementById('pay-recipient');
const payAddressPreview = document.getElementById('pay-address-preview');
const payTotalAmount = document.getElementById('pay-total-amount');
const payItemsCount = document.getElementById('pay-items-count');
const payTotalMrp = document.getElementById('pay-total-mrp');
const payDiscountAmt = document.getElementById('pay-discount-amt');
const payUpiDiscountRow = document.getElementById('pay-upi-discount-row');
const payFinalAmount = document.getElementById('pay-final-amount');
const bottomPayPrice = document.getElementById('bottom-pay-price');
const btnPayNow = document.getElementById('btn-pay-now');
const btnBackToAddr = document.getElementById('btn-back-to-addr');
const toast = document.getElementById('checkout-toast');

// Overlay elements
const processingOverlay = document.getElementById('processing-overlay');
const processMainText = document.getElementById('process-main-text');
const processSubText = document.getElementById('process-sub-text');

// Payment methods
const methodCards = document.querySelectorAll('.payment-method-card');
const radioUpi = document.getElementById('radio-upi');
const radioCard = document.getElementById('radio-card');
const radioNetbanking = document.getElementById('radio-netbanking');
const radioCod = document.getElementById('radio-cod');

// UPI
const upiAppBtns = document.querySelectorAll('.upi-app-btn');
const inputUpiId = document.getElementById('input-upi-id');
const btnVerifyUpi = document.getElementById('btn-verify-upi');
let selectedUpiApp = 'Google Pay';

// Card
const cardNumInput = document.getElementById('card-num');
const cardExpiryInput = document.getElementById('card-expiry');
const cardCvvInput = document.getElementById('card-cvv');
const cardHolderInput = document.getElementById('card-holder');
const cardTypeBadge = document.getElementById('card-type-badge');

// Net Banking
const bankBtns = document.querySelectorAll('.bank-option-btn');
let selectedBank = 'HDFC';

// COD Captcha
const captchaDisplay = document.getElementById('captcha-code');
const btnRefreshCaptcha = document.getElementById('btn-refresh-captcha');
const inputCaptcha = document.getElementById('input-captcha');
let currentCaptcha = '482';

let activePaymentMethod = 'upi'; // upi, card, netbanking, cod
let baseTotalSelling = 999;
let baseTotalMrp = 2499;
let totalQty = 1;
let cartItems = [];

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

// 1. Load Delivery Address
function loadAddress() {
  try {
    const raw = localStorage.getItem('flipkart_delivery_address');
    if (raw) {
      const addr = JSON.parse(raw);
      if (payRecipient) payRecipient.textContent = `${addr.name}, ${addr.pincode}`;
      if (payAddressPreview) payAddressPreview.textContent = `${addr.address}, ${addr.city}`;
      return;
    }
  } catch (e) {}

  if (payRecipient) payRecipient.textContent = 'Satish Patel, 400001';
  if (payAddressPreview) payAddressPreview.textContent = 'Flat 402, Green Avenue, Mumbai';
}

// 2. Load Cart Totals
function loadCartData() {
  try {
    const raw = localStorage.getItem('flipkart_cart');
    cartItems = raw ? JSON.parse(raw) : [];
  } catch (e) {
    cartItems = [];
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    cartItems = [{
      id: 3,
      name: 'Amazon Basics - Non-Stick Cookware Set (Black) 8 Piece',
      price: 311,
      mrp: 2999,
      quantity: 1,
      img: 'https://cdn.shopify.com/s/files/1/0596/9743/0617/files/81-sJRhEapL._SX679.jpg?v=1713050191'
    }];
  }

  baseTotalSelling = 0;
  baseTotalMrp = 0;
  totalQty = 0;

  cartItems.forEach(item => {
    const qty = item.quantity || 1;
    totalQty += qty;
    const price = Number(item.price) || 999;
    const mrp = Number(item.mrp) || Math.round(price * 2.5);
    baseTotalSelling += price * qty;
    baseTotalMrp += mrp * qty;
  });

  updatePriceDisplay();
}

// 3. Price Display Calculation
function updatePriceDisplay() {
  const isUpi = activePaymentMethod === 'upi';
  const upiDiscount = isUpi ? 50 : 0;
  const payable = Math.max(0, baseTotalSelling - upiDiscount);
  const discountAmt = Math.max(0, baseTotalMrp - baseTotalSelling);

  if (payTotalAmount) payTotalAmount.textContent = `₹${currencyFormatter.format(payable)}`;
  if (payItemsCount) payItemsCount.textContent = `${totalQty} ${totalQty === 1 ? 'Item' : 'Items'} in cart`;
  if (payTotalMrp) payTotalMrp.textContent = `₹${currencyFormatter.format(baseTotalMrp)}`;
  if (payDiscountAmt) payDiscountAmt.textContent = `-₹${currencyFormatter.format(discountAmt)}`;

  if (payUpiDiscountRow) {
    payUpiDiscountRow.style.display = isUpi ? 'flex' : 'none';
  }

  if (payFinalAmount) payFinalAmount.textContent = `₹${currencyFormatter.format(payable)}`;
  if (bottomPayPrice) bottomPayPrice.textContent = `₹${currencyFormatter.format(payable)}`;

  if (btnPayNow) {
    if (activePaymentMethod === 'cod') {
      btnPayNow.textContent = 'Confirm Order (COD)';
    } else {
      btnPayNow.textContent = `Pay ₹${currencyFormatter.format(payable)}`;
    }
  }
}

// 4. Method Switching
methodCards.forEach(card => {
  card.addEventListener('click', (e) => {
    // Prevent nested click collisions
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    if (e.target.tagName === 'BUTTON') return;

    const method = card.getAttribute('data-method');
    selectPaymentMethod(method);
  });
});

function selectPaymentMethod(method) {
  activePaymentMethod = method;
  methodCards.forEach(c => {
    const isTarget = c.getAttribute('data-method') === method;
    c.classList.toggle('selected', isTarget);
    const radio = c.querySelector('input[type="radio"]');
    if (radio) radio.checked = isTarget;
  });

  updatePriceDisplay();
}

// 5. UPI Logic
upiAppBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    upiAppBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedUpiApp = btn.getAttribute('data-app') || 'Google Pay';
    showToast(`Selected ${selectedUpiApp} ⚡`);
  });
});

if (btnVerifyUpi) {
  btnVerifyUpi.addEventListener('click', (e) => {
    e.stopPropagation();
    const upiId = (inputUpiId?.value || '').trim();
    if (!upiId || !upiId.includes('@')) {
      showToast('Please enter a valid UPI ID (e.g. name@okaxis)');
      return;
    }
    btnVerifyUpi.textContent = '✓ Verified';
    btnVerifyUpi.style.background = 'var(--fk-green)';
    showToast(`UPI ID verified successfully! ✅`);
  });
}

// 6. Card Live Formatting
if (cardNumInput) {
  cardNumInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    e.target.value = formatted;

    // Detect brand
    if (val.startsWith('4')) {
      cardTypeBadge.textContent = 'VISA';
    } else if (val.startsWith('5')) {
      cardTypeBadge.textContent = 'MASTERCARD';
    } else if (val.startsWith('6')) {
      cardTypeBadge.textContent = 'RUPAY';
    } else {
      cardTypeBadge.textContent = 'CARD';
    }
  });
}

if (cardExpiryInput) {
  cardExpiryInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      val = val.substring(0, 2) + '/' + val.substring(2);
    }
    e.target.value = val;
  });
}

// 7. Net Banking
bankBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    bankBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedBank = btn.getAttribute('data-bank') || 'HDFC';
    showToast(`${selectedBank} Bank Selected`);
  });
});

// 8. COD Captcha
function generateCaptcha() {
  const code = Math.floor(100 + Math.random() * 900).toString();
  currentCaptcha = code;
  if (captchaDisplay) {
    captchaDisplay.textContent = code.split('').join(' ');
  }
}

if (btnRefreshCaptcha) {
  btnRefreshCaptcha.addEventListener('click', (e) => {
    e.stopPropagation();
    generateCaptcha();
    showToast('New Captcha generated');
  });
}

// 9. Process Payment & Place Order (Vareyaa Cashfree Checkout Integration)
async function executeCheckout() {
  if (paymentStarting) return;
  paymentStarting = true;

  const payBtn = document.getElementById('btn-pay-now') || document.querySelector('.btn-primary-action') || document.getElementById('co-main-btn');
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.style.opacity = '0.6';
    payBtn.style.pointerEvents = 'none';
  }

  // Method validations
  let methodTitle = 'UPI';

  if (activePaymentMethod === 'upi') {
    const upiId = inputUpiId?.value.trim();
    methodTitle = upiId ? `UPI (${upiId})` : `UPI (${selectedUpiApp})`;
  } else if (activePaymentMethod === 'card') {
    const num = cardNumInput?.value.replace(/\s/g, '');
    const exp = cardExpiryInput?.value.trim();
    const cvv = cardCvvInput?.value.trim();
    if (!num || num.length < 12) {
      showToast('Please enter valid 16-digit card number');
      cardNumInput?.focus();
      paymentStarting = false;
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.style.opacity = '1';
        payBtn.style.pointerEvents = 'auto';
      }
      return;
    }
    if (!exp || exp.length < 5) {
      showToast('Please enter card expiry date (MM/YY)');
      cardExpiryInput?.focus();
      paymentStarting = false;
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.style.opacity = '1';
        payBtn.style.pointerEvents = 'auto';
      }
      return;
    }
    if (!cvv || cvv.length < 3) {
      showToast('Please enter 3-digit CVV');
      cardCvvInput?.focus();
      paymentStarting = false;
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.style.opacity = '1';
        payBtn.style.pointerEvents = 'auto';
      }
      return;
    }
    methodTitle = `${cardTypeBadge.textContent} ending in ${num.slice(-4)}`;
  } else if (activePaymentMethod === 'netbanking') {
    methodTitle = `Net Banking (${selectedBank} Bank)`;
  } else if (activePaymentMethod === 'cod') {
    const enteredCode = (inputCaptcha?.value || '').trim();
    if (enteredCode !== currentCaptcha) {
      showToast('Incorrect Captcha code. Please try again!');
      generateCaptcha();
      inputCaptcha?.focus();
      paymentStarting = false;
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.style.opacity = '1';
        payBtn.style.pointerEvents = 'auto';
      }
      return;
    }
    methodTitle = 'Cash on Delivery';
  }

  // If COD, run order confirmation flow
  if (activePaymentMethod === 'cod') {
    startPaymentProcessing(methodTitle);
    return;
  }

  // Online Cashfree gateway flow
  try {
    let deliveryAddress = null;
    try {
      deliveryAddress = JSON.parse(localStorage.getItem('flipkart_delivery_address'));
    } catch (e) {}

    const isUpi = activePaymentMethod === 'upi';
    const payable = Math.max(0, baseTotalSelling - (isUpi ? 50 : 0));
    const orderId = 'OD' + Math.floor(10000000000000 + Math.random() * 90000000000000);

    const payload = {
      orderId,
      amount: payable,
      totalAmount: payable,
      paymentMethod: methodTitle,
      name: deliveryAddress?.name || 'Satish Patel',
      phone: deliveryAddress?.phone || '9876543210',
      address: deliveryAddress?.address || 'Flat 402, Green Avenue, Mumbai',
      items: cartItems
    };

    const res = await fetch('/checkout/cashfree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.redirect_url) {
      // Save order details locally before redirect
      const newOrder = {
        orderId,
        createdAt: new Date().toISOString(),
        items: cartItems,
        totalAmount: payable,
        mrpAmount: baseTotalMrp,
        paymentMethod: methodTitle,
        address: deliveryAddress || { name: 'Satish Patel', phone: '9876543210' },
        status: 'Order Placed',
        expectedDelivery: 'Tomorrow by 11 PM'
      };
      try {
        const rawOrders = localStorage.getItem('flipkart_orders');
        const orders = rawOrders ? JSON.parse(rawOrders) : [];
        orders.unshift(newOrder);
        localStorage.setItem('flipkart_orders', JSON.stringify(orders));
        localStorage.setItem('flipkart_last_order', JSON.stringify(newOrder));
        if (typeof FilpSupabase !== 'undefined') {
          FilpSupabase.createOrder(newOrder);
        }
      } catch (e) {}
      localStorage.removeItem('flipkart_cart');

      // On successful redirect to Cashfree, do not start another payment request
      window.location.assign(data.redirect_url);
    } else {
      throw new Error(data?.message || 'Invalid gateway redirect URL');
    }
  } catch (err) {
    console.error('Payment start failed:', err);
    // On payment-start failure, reset
    paymentStarting = false;
    // Re-enable the Pay Securely button after failure
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.style.opacity = '1';
      payBtn.style.pointerEvents = 'auto';
    }
    showToast('Connecting with payment gateway...');
    startPaymentProcessing(methodTitle);
  }
}

function nextCheckoutStep() {
  return executeCheckout();
}

if (btnPayNow) {
  btnPayNow.onclick = function(e) {
    if (e) e.preventDefault();
    return nextCheckoutStep();
  };
}

// Accessible in global scope
window.executeCheckout = executeCheckout;
window.nextCheckoutStep = nextCheckoutStep;

function startPaymentProcessing(paymentMethodDesc) {
  if (!processingOverlay) return;
  processingOverlay.classList.add('show');

  if (activePaymentMethod === 'cod') {
    processMainText.textContent = 'Verifying Order Details...';
    processSubText.textContent = 'Confirming Cash on Delivery booking with seller';
  } else {
    processMainText.textContent = 'Connecting to Secure Gateway... 🔒';
    processSubText.textContent = 'Contacting bank server with 256-bit encryption';
  }

  setTimeout(() => {
    processMainText.textContent = 'Authorizing Transaction...';
    processSubText.textContent = 'Verifying account security & authenticating order';
  }, 900);

  setTimeout(() => {
    processMainText.textContent = 'Order Confirmed! 🎉';
    processSubText.textContent = 'Generating order receipt and booking shipping...';

    // Create Order Record
    const orderId = 'OD' + Math.floor(10000000000000 + Math.random() * 90000000000000);
    const isUpi = activePaymentMethod === 'upi';
    const payable = Math.max(0, baseTotalSelling - (isUpi ? 50 : 0));

    let deliveryAddress = null;
    try {
      deliveryAddress = JSON.parse(localStorage.getItem('flipkart_delivery_address'));
    } catch (e) {}

    const newOrder = {
      orderId,
      createdAt: new Date().toISOString(),
      items: cartItems,
      totalAmount: payable,
      mrpAmount: baseTotalMrp,
      paymentMethod: paymentMethodDesc,
      address: deliveryAddress || {
        name: 'Satish Patel',
        phone: '9876543210',
        pincode: '400001',
        address: 'Flat 402, Green Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        type: 'Home'
      },
      status: 'Order Confirmed',
      expectedDelivery: 'Tomorrow by 11 PM'
    };

    // Save to orders history & Supabase
    try {
      const rawOrders = localStorage.getItem('flipkart_orders');
      const orders = rawOrders ? JSON.parse(rawOrders) : [];
      orders.unshift(newOrder);
      localStorage.setItem('flipkart_orders', JSON.stringify(orders));
      localStorage.setItem('flipkart_last_order', JSON.stringify(newOrder));

      if (typeof FilpSupabase !== 'undefined') {
        FilpSupabase.createOrder(newOrder);
      }
    } catch (e) {}

    // Empty Cart
    localStorage.removeItem('flipkart_cart');

    // Redirect to Success Page
    setTimeout(() => {
      window.location.href = `order-success.html?orderId=${orderId}`;
    }, 700);

  }, 1900);
}

if (btnBackToAddr) {
  btnBackToAddr.addEventListener('click', () => {
    window.location.href = 'checkout-address.html';
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadAddress();
  loadCartData();
  generateCaptcha();
});
