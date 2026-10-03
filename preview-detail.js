const currency = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const siteRoot = new URL('.', document.baseURI);
const hash = new URLSearchParams(location.search).get('id');

function safeImage(value) {
  try {
    const image = new URL(value);
    return image.protocol === 'https:' && image.hostname === 'cdn.shopify.com'
      ? image.href
      : new URL('assets/images/j2.jpg', siteRoot).href;
  } catch {
    return new URL('assets/images/j2.jpg', siteRoot).href;
  }
}

function uniqueValues(variants, key) {
  return [...new Set(variants.map((variant) => variant[key]).filter(Boolean))];
}

function addSelector(container, className, label, selected, onSelect, imageSource) {
  const item = document.createElement('div');
  item.className = `${className}-item p-2 me-2${selected ? ' active' : ''}`;
  item.setAttribute('role', 'button');
  item.tabIndex = 0;

  if (imageSource) {
    const image = document.createElement('img');
    image.src = safeImage(imageSource);
    image.alt = '';
    item.append(image);
  }

  const text = document.createElement('span');
  text.className = `${className}-name`;
  text.textContent = label;
  item.append(text);
  item.addEventListener('click', onSelect);
  item.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  });
  container.append(item);
}

async function loadProduct() {
  const response = await fetch(new URL('data/products.json', siteRoot));
  if (!response.ok) throw new Error('Product not found');
  const catalog = await response.json();
  const product = catalog.products.find((item) => item.md5_id === hash);
  if (!product) throw new Error('Product not found');
  const variants = catalog.variants.filter((variant) => variant.product_id === product.id);
  document.title = `${product.name} | Product preview`;
  document.querySelector('.product-title').textContent = product.name;

  const featureText = document.createElement('p');
  const parser = new DOMParser();
  featureText.textContent = parser.parseFromString(product.features || '', 'text/html').body.textContent.trim();
  document.querySelector('.product-details').replaceChildren(featureText);

  let activeVariant = variants[0] ?? product;
  const price = document.querySelector('.price');
  const mrp = document.querySelector('.mrp');
  const discount = document.querySelector('.discount');
  const images = [...document.querySelectorAll('#sliderX .carousel-item img')];

  function selectVariant(variant) {
    activeVariant = variant;
    const sellingPrice = Number(variant.selling_price ?? product.selling_price) || 0;
    const originalPrice = Number(variant.mrp ?? product.mrp) || 0;
    const discountRate = originalPrice > 0
      ? Math.round((originalPrice - sellingPrice) / originalPrice * 100)
      : 0;
    price.textContent = `₹${currency.format(sellingPrice)}`;
    mrp.textContent = `₹${currency.format(originalPrice)}`;
    discount.textContent = `${discountRate}% off`;
    images.forEach((image) => {
      image.src = safeImage(variant.img1 ?? product.img1);
    });
  }

  const sizeList = document.querySelector('.size-list');
  const sizes = uniqueValues(variants, 'size');
  document.querySelector('.size-div').hidden = sizes.length === 0;
  sizes.forEach((size) => {
    const variant = variants.find((item) => item.size === size);
    addSelector(sizeList, 'size', size, variant === activeVariant, () => {
      selectVariant(variant);
      sizeList.querySelectorAll('.size-item').forEach((item) => {
        item.classList.toggle('active', item.querySelector('.size-name').textContent === size);
      });
    });
  });

  const colors = uniqueValues(variants, 'color');
  const colorList = document.querySelector('.color-list');
  document.querySelector('.color-div').hidden = colors.length === 0;
  colors.forEach((color) => {
    const variant = variants.find((item) => item.color === color);
    addSelector(colorList, 'color', color, variant === activeVariant, () => selectVariant(variant), variant.img1);
  });

  const storages = uniqueValues(variants, 'storage');
  const storageList = document.querySelector('.storage-list');
  document.querySelector('.storage-div').hidden = storages.length === 0;
  storages.forEach((storage) => {
    const variant = variants.find((item) => item.storage === storage);
    addSelector(storageList, 'storage', storage, variant === activeVariant, () => selectVariant(variant));
  });

  selectVariant(activeVariant);
  document.querySelector('#back_btn').addEventListener('click', () => history.back());
}

loadProduct().catch(() => {
  document.querySelector('.product-title').textContent = 'Product not found';
  document.querySelector('.product-details').textContent = 'This product is not available in the local catalog.';
});