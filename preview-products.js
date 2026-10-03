const productBody = document.querySelector('#home_page_product');
const currency = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const siteRoot = new URL('.', document.currentScript.src);

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeProductCell(product) {
  const cell = makeElement('td', 'Cs7ycL TcKeCe');
  const link = makeElement('a');
  link.href = new URL(`product-detail.html?id=${encodeURIComponent(product.md5_id)}`, siteRoot).href;

  const card = makeElement('div', '_2enssu');
  const imageFrame = makeElement('div', '');
  imageFrame.style.cssText = 'position:relative;min-height:170px;min-width:170px';
  const imageWrap = makeElement('div', '_3LXIRu');
  const imageSize = makeElement('div', '_2GaeWJ');
  imageSize.style.cssText = 'width:170px;height:170px';
  const image = makeElement('img', '_2puWtW _3a3qyb');
  image.alt = product.name ?? '';

  try {
    const imageUrl = new URL(product.img1);
    image.src = imageUrl.protocol === 'https:' && imageUrl.hostname === 'cdn.shopify.com'
      ? imageUrl.href
      : new URL('assets/images/j2.jpg', siteRoot).href;
  } catch {
    image.src = new URL('assets/images/j2.jpg', siteRoot).href;
  }

  imageSize.append(image);
  imageWrap.append(imageSize);
  imageFrame.append(imageWrap);
  card.append(imageFrame);
  card.append(makeElement('div', '_24B_AU _3SexMn', product.name ?? ''));

  const mrp = Number(product.mrp) || 0;
  const price = Number(product.selling_price) || 0;
  const discount = mrp > 0 ? Math.round((mrp - price) / mrp * 100) : 0;
  const priceLine = makeElement('div', '_24B_AU _1AQnZC');
  priceLine.append(document.createTextNode(`${discount}% Off `));
  priceLine.append(makeElement('span', 'mrp', `₹${currency.format(mrp)}`));
  card.append(priceLine);

  const sellingLine = makeElement('div', '_24B_AU _1AQnZC');
  sellingLine.append(makeElement('b', 'selling-price', `₹${currency.format(price)}`));
  sellingLine.append(makeElement('span', 'filp-badge', 'Filp pick'));
  card.append(sellingLine);
  link.append(card);
  cell.append(link);
  return cell;
}

async function showProducts() {
  try {
    const response = await fetch(new URL('data/products.json', siteRoot));
    if (!response.ok) throw new Error('Product query failed');
    const result = await response.json();
    const fragment = document.createDocumentFragment();
    let row;

    result.products.slice(0, 20).forEach((product, index) => {
      if (index % 2 === 0) {
        row = document.createElement('tr');
        fragment.append(row);
      }
      row.append(makeProductCell(product));
    });

    productBody.replaceChildren(fragment);
  } catch (error) {
    productBody.replaceChildren();
    const row = document.createElement('tr');
    const cell = makeElement('td', 'no-data-found', 'Could not load local catalog.');
    row.append(cell);
    productBody.append(row);
  }
}

showProducts();