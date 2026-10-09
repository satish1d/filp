// Order Success & Real-time Tracking Screen
const currencyFormatter = new Intl.NumberFormat('en-IN');

const displayOrderId = document.getElementById('display-order-id');
const orderIdBadge = document.getElementById('order-id-badge');
const successRecipientName = document.getElementById('success-recipient-name');
const successFullAddress = document.getElementById('success-full-address');
const successPhone = document.getElementById('success-phone');
const successItemsList = document.getElementById('success-items-list');
const successPaymentMode = document.getElementById('success-payment-mode');
const successTotalPaid = document.getElementById('success-total-paid');
const timelineOrderedDate = document.getElementById('timeline-ordered-date');
const btnDownloadInvoice = document.getElementById('btn-download-invoice');
const toast = document.getElementById('checkout-toast');

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

function loadOrderDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('orderId');

  let order = null;
  try {
    const rawLast = localStorage.getItem('flipkart_last_order');
    if (rawLast) order = JSON.parse(rawLast);

    if ((!order || (targetId && order.orderId !== targetId))) {
      const rawOrders = localStorage.getItem('flipkart_orders');
      if (rawOrders) {
        const orders = JSON.parse(rawOrders);
        order = orders.find(o => o.orderId === targetId) || orders[0];
      }
    }
  } catch (e) {}

  if (!order) {
    // Generate fallback display order
    order = {
      orderId: targetId || ('OD' + Math.floor(10000000000000 + Math.random() * 90000000000000)),
      totalAmount: 949,
      paymentMethod: 'UPI (Google Pay)',
      address: {
        name: 'Satish Patel',
        phone: '9876543210',
        pincode: '400001',
        address: 'Flat 402, Green Avenue, Linking Road',
        city: 'Mumbai',
        state: 'Maharashtra'
      },
      items: [
        {
          name: 'Fastrack FS1 Pro Smartwatch with 1.96 Super AMOLED Display',
          brand: 'Fastrack',
          price: 949,
          quantity: 1,
          size: 'Standard',
          img: './assets/images/chair_opt.jpg'
        }
      ]
    };
  }

  // Populate UI
  if (displayOrderId) displayOrderId.textContent = order.orderId;
  if (successRecipientName) successRecipientName.textContent = order.address?.name || 'Customer';
  if (successFullAddress) {
    const addr = order.address;
    successFullAddress.textContent = `${addr?.address || ''}, ${addr?.city || ''}, ${addr?.state || ''} - ${addr?.pincode || ''}`;
  }
  if (successPhone) successPhone.textContent = `Phone: ${order.address?.phone || '9876543210'}`;
  if (successPaymentMode) successPaymentMode.textContent = order.paymentMethod || 'Online Payment';
  if (successTotalPaid) successTotalPaid.textContent = `₹${currencyFormatter.format(order.totalAmount || 949)}`;

  const now = new Date();
  if (timelineOrderedDate) {
    timelineOrderedDate.textContent = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  // Items
  if (successItemsList) {
    successItemsList.innerHTML = '';
    const items = order.items || [];
    items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.style.cssText = 'display: flex; gap: 12px; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;';
      itemEl.innerHTML = `
        <img src="${item.img || './assets/images/chair_opt.jpg'}" alt="${escapeHtml(item.name || '')}"
             style="width: 52px; height: 58px; object-fit: contain; border-radius: 4px; border: 1px solid #eee; background: #fafafa;"
             onerror="this.src='./assets/images/chair_opt.jpg'">
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 13px; font-weight: 700; color: #212121; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(item.name || 'Product')}
          </div>
          <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
            Qty: ${item.quantity || 1} | Size: ${escapeHtml(item.size || 'Standard')}
          </div>
          <div style="font-size: 13.5px; font-weight: 800; color: #212121; margin-top: 2px;">
            ₹${currencyFormatter.format(item.price || 999)}
          </div>
        </div>
      `;
      successItemsList.appendChild(itemEl);
    });
  }
}

// Copy Order ID
if (orderIdBadge) {
  orderIdBadge.addEventListener('click', () => {
    const text = displayOrderId?.textContent || '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Order ID copied to clipboard! 📋');
    }
  });
}

// Download Invoice Simulation
if (btnDownloadInvoice) {
  btnDownloadInvoice.addEventListener('click', () => {
    showToast('Invoice downloaded successfully! 📄');
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  loadOrderDetails();
});
