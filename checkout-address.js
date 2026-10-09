// Real-time Delivery Address Management for Flipkart Checkout
const currencyFormatter = new Intl.NumberFormat('en-IN');

// Elements
const savedAddressesList = document.getElementById('saved-addresses-list');
const btnToggleAddForm = document.getElementById('btn-toggle-add-form');
const addressFormSection = document.getElementById('address-form-section');
const btnCloseForm = document.getElementById('btn-close-form');
const btnSaveAddress = document.getElementById('btn-save-address');
const btnContinuePayment = document.getElementById('btn-continue-payment');
const btnBackToCart = document.getElementById('btn-back-to-cart');
const toast = document.getElementById('checkout-toast');

// Inputs
const inputName = document.getElementById('input-name');
const inputPhone = document.getElementById('input-phone');
const inputPincode = document.getElementById('input-pincode');
const inputCity = document.getElementById('input-city');
const inputState = document.getElementById('input-state');
const inputFlat = document.getElementById('input-flat');
const inputArea = document.getElementById('input-area');
const inputLandmark = document.getElementById('input-landmark');
const typePills = document.querySelectorAll('.type-pill-btn');

// Summary elements
const addrOrderTotal = document.getElementById('addr-order-total');
const addrItemsCount = document.getElementById('addr-items-count');
const bottomAddrPrice = document.getElementById('bottom-addr-price');
const bottomRecipientInfo = document.getElementById('bottom-recipient-info');

let selectedAddressIndex = 0;
let selectedAddressType = 'Home';

// Pincode directory for instant lookup
const PINCODE_MAP = {
  '400001': { city: 'Mumbai', state: 'Maharashtra' },
  '400050': { city: 'Mumbai', state: 'Maharashtra' },
  '400051': { city: 'Mumbai', state: 'Maharashtra' },
  '110001': { city: 'New Delhi', state: 'Delhi' },
  '560001': { city: 'Bengaluru', state: 'Karnataka' },
  '380001': { city: 'Ahmedabad', state: 'Gujarat' },
  '395001': { city: 'Surat', state: 'Gujarat' },
  '395006': { city: 'Surat', state: 'Gujarat' },
  '364001': { city: 'Bhavnagar', state: 'Gujarat' },
  '500001': { city: 'Hyderabad', state: 'Telangana' },
  '600001': { city: 'Chennai', state: 'Tamil Nadu' },
  '700001': { city: 'Kolkata', state: 'West Bengal' },
  '411001': { city: 'Pune', state: 'Maharashtra' },
  '302001': { city: 'Jaipur', state: 'Rajasthan' },
  '226001': { city: 'Lucknow', state: 'Uttar Pradesh' }
};

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

// 1. Saved Addresses
function getSavedAddresses() {
  try {
    const raw = localStorage.getItem('flipkart_saved_addresses');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch (e) {}

  // Defaults
  const defaults = [
    {
      name: 'Satish Patel',
      phone: '9876543210',
      pincode: '400001',
      flat: 'Flat 402, Green Avenue',
      area: 'Linking Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      landmark: 'Near National College',
      type: 'Home'
    },
    {
      name: 'Satish Patel',
      phone: '9876543210',
      pincode: '400051',
      flat: '5th Floor, Tower B, Cyber One',
      area: 'BKC, Bandra Kurla Complex',
      city: 'Mumbai',
      state: 'Maharashtra',
      landmark: 'Opposite ICICI Tower',
      type: 'Work'
    }
  ];
  localStorage.setItem('flipkart_saved_addresses', JSON.stringify(defaults));
  return defaults;
}

function saveAddresses(arr) {
  localStorage.setItem('flipkart_saved_addresses', JSON.stringify(arr));
}

// 2. Render Addresses
function renderAddresses() {
  const addresses = getSavedAddresses();
  if (!savedAddressesList) return;

  savedAddressesList.innerHTML = '';
  addresses.forEach((addr, idx) => {
    const isSelected = idx === selectedAddressIndex;
    const card = document.createElement('div');
    card.className = `saved-address-card ${isSelected ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="address-radio-row">
        <input type="radio" name="selected_addr" id="addr_radio_${idx}" ${isSelected ? 'checked' : ''} data-index="${idx}">
        <div class="address-info-col">
          <div class="address-name-row">
            <span class="address-recipient-name">${escapeHtml(addr.name)}</span>
            <span class="address-type-tag">${escapeHtml(addr.type || 'HOME')}</span>
          </div>
          <div class="address-full-text">
            ${escapeHtml(addr.flat)}, ${escapeHtml(addr.area)}, ${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} - <strong>${escapeHtml(addr.pincode)}</strong>
            ${addr.landmark ? `<br><span style="color: #64748b; font-size: 11.5px;">Landmark: ${escapeHtml(addr.landmark)}</span>` : ''}
          </div>
          <div class="address-phone-text">📞 Mobile: ${escapeHtml(addr.phone)}</div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      selectedAddressIndex = idx;
      updateActiveAddress();
      renderAddresses();
    });

    savedAddressesList.appendChild(card);
  });

  updateActiveAddress();
}

function updateActiveAddress() {
  const addresses = getSavedAddresses();
  const current = addresses[selectedAddressIndex] || addresses[0];
  if (current) {
    const activeObj = {
      name: current.name,
      phone: current.phone,
      pincode: current.pincode,
      address: `${current.flat}, ${current.area}`,
      city: current.city,
      state: current.state,
      type: current.type
    };
    localStorage.setItem('flipkart_delivery_address', JSON.stringify(activeObj));

    if (bottomRecipientInfo) {
      bottomRecipientInfo.textContent = `Deliver to: ${current.name}, ${current.city}`;
    }
  }
}

// 3. Pincode Auto Lookup
if (inputPincode) {
  inputPincode.addEventListener('input', (e) => {
    const pin = e.target.value.trim();
    if (pin.length === 6 && PINCODE_MAP[pin]) {
      const match = PINCODE_MAP[pin];
      if (inputCity) inputCity.value = match.city;
      if (inputState) inputState.value = match.state;
      showToast(`Location detected: ${match.city}, ${match.state} 📍`);
    }
  });
}

// 4. Address Type Pills
typePills.forEach(pill => {
  pill.addEventListener('click', () => {
    typePills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedAddressType = pill.getAttribute('data-type') || 'Home';
  });
});

// 5. Toggle Form
if (btnToggleAddForm && addressFormSection) {
  btnToggleAddForm.addEventListener('click', () => {
    addressFormSection.style.display = 'block';
    addressFormSection.scrollIntoView({ behavior: 'smooth' });
    if (inputName) inputName.focus();
  });
}

if (btnCloseForm && addressFormSection) {
  btnCloseForm.addEventListener('click', () => {
    addressFormSection.style.display = 'none';
  });
}

// 6. Save New Address
if (btnSaveAddress) {
  btnSaveAddress.addEventListener('click', () => {
    const name = (inputName?.value || '').trim();
    const phone = (inputPhone?.value || '').trim();
    const pin = (inputPincode?.value || '').trim();
    const city = (inputCity?.value || '').trim();
    const state = (inputState?.value || '').trim();
    const flat = (inputFlat?.value || '').trim();
    const area = (inputArea?.value || '').trim();
    const landmark = (inputLandmark?.value || '').trim();

    if (!name) {
      showToast('Please enter your full name');
      inputName?.focus();
      return;
    }
    if (!phone || phone.length < 10) {
      showToast('Please enter valid 10-digit mobile number');
      inputPhone?.focus();
      return;
    }
    if (!pin || pin.length !== 6) {
      showToast('Please enter 6-digit pincode');
      inputPincode?.focus();
      return;
    }
    if (!flat || !area || !city || !state) {
      showToast('Please fill all required address fields');
      return;
    }

    const newAddr = {
      name,
      phone,
      pincode: pin,
      flat,
      area,
      city,
      state,
      landmark,
      type: selectedAddressType
    };

    const addresses = getSavedAddresses();
    addresses.unshift(newAddr); // Add to top
    saveAddresses(addresses);
    selectedAddressIndex = 0;

    renderAddresses();
    if (addressFormSection) addressFormSection.style.display = 'none';
    showToast('New address saved successfully! ✅');

    // Scroll back to list
    savedAddressesList?.scrollIntoView({ behavior: 'smooth' });
  });
}

// 7. Cart Price Summary & Delivery Button
function loadCartSummary() {
  try {
    const raw = localStorage.getItem('flipkart_cart');
    const items = raw ? JSON.parse(raw) : [];
    let totalSelling = 0;
    let totalQty = 0;

    items.forEach(item => {
      const qty = item.quantity || 1;
      totalQty += qty;
      totalSelling += (Number(item.price) || 0) * qty;
    });

    if (totalSelling === 0) totalSelling = 999;
    if (totalQty === 0) totalQty = 1;

    const formatted = `₹${currencyFormatter.format(totalSelling)}`;
    if (addrOrderTotal) addrOrderTotal.textContent = formatted;
    if (bottomAddrPrice) bottomAddrPrice.textContent = formatted;
    if (addrItemsCount) addrItemsCount.textContent = `${totalQty} ${totalQty === 1 ? 'Item' : 'Items'}`;
  } catch (e) {}
}

// 8. Navigation
if (btnContinuePayment) {
  btnContinuePayment.addEventListener('click', () => {
    updateActiveAddress();
    // Navigate to Step 3: Payment
    window.location.href = 'checkout-payment.html';
  });
}

if (btnBackToCart) {
  btnBackToCart.addEventListener('click', () => {
    window.location.href = 'cart.html';
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderAddresses();
  loadCartSummary();
});
