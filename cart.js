import { fetchProducts } from './api.js';

const STORAGE_KEY = 'techstore-cart-v1';

const state = {
  products: [],
  cart: []
};

const elements = {
  productList: document.querySelector('#product-list'),
  cartToggle: document.querySelector('#cart-toggle'),
  cartCount: document.querySelector('#cart-count'),
  cartSidebar: document.querySelector('#cart-sidebar'),
  cartOverlay: document.querySelector('#cart-overlay'),
  closeCartButton: document.querySelector('#close-cart'),
  cartItems: document.querySelector('#cart-items'),
  cartSubtotal: document.querySelector('#cart-subtotal'),
  cartTotal: document.querySelector('#cart-total'),
  clearCartButton: document.querySelector('#clear-cart-button'),
  checkoutButton: document.querySelector('#checkout-button'),
  toast: document.querySelector('#toast')
};

let toastTimer;

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS'
});

function escapeHtml(value) {
  const characters = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return String(value).replace(/[&<>"']/g, (character) => characters[character]);
}

function formatMoney(value) {
  return moneyFormatter.format(value);
}

function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedCart) ? savedCart : [];
  } catch (error) {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
}

function getCartQuantity() {
  return state.cart.reduce((total, item) => total + item.quantity, 0);
}

function getCartSubtotal() {
  return state.cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function renderLoadingProducts() {
  elements.productList.innerHTML = '<div class="product-loading">Cargando productos desde la API...</div>';
}

function renderProducts(products) {
  if (!products.length) {
    elements.productList.innerHTML = '<div class="product-loading">No se encontraron productos.</div>';
    return;
  }

  elements.productList.innerHTML = products.map((product) => {
    const image = product.image
      ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">`
      : `<span class="placeholder-icon">${escapeHtml(product.shortName)}</span>`;

    return `
      <article class="product-card" data-product-id="${escapeHtml(product.id)}">
        <div class="product-media">${image}</div>
        <div class="product-body">
          <span class="badge">${escapeHtml(product.category)}</span>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description)}</p>
          <strong class="product-price">${formatMoney(product.price)}</strong>
          <div class="product-actions">
            <button class="button button-primary" type="button" data-add-to-cart="${escapeHtml(product.id)}">
              Agregar al carrito
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function renderCart() {
  const quantity = getCartQuantity();
  const subtotal = getCartSubtotal();

  elements.cartCount.textContent = String(quantity);
  elements.cartSubtotal.textContent = formatMoney(subtotal);
  elements.cartTotal.textContent = formatMoney(subtotal);
  elements.clearCartButton.disabled = state.cart.length === 0;
  elements.checkoutButton.disabled = state.cart.length === 0;

  if (!state.cart.length) {
    elements.cartItems.innerHTML = `
      <div class="empty-cart">
        <h3>El carrito está vacío</h3>
        <p>Agregá productos desde el catálogo para empezar tu compra.</p>
      </div>
    `;
    return;
  }

  elements.cartItems.innerHTML = state.cart.map((item) => `
    <article class="cart-item">
      <div class="cart-item-image">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : `<span>${escapeHtml(item.shortName)}</span>`}
      </div>
      <div class="cart-item-details">
        <h3>${escapeHtml(item.name)}</h3>
        <p>${formatMoney(item.price)}</p>
        <div class="cart-quantity" aria-label="Cantidad de ${escapeHtml(item.name)}">
          <button class="quantity-button" type="button" data-quantity-change="-1" data-product-id="${escapeHtml(item.id)}" aria-label="Reducir cantidad de ${escapeHtml(item.name)}">−</button>
          <span class="quantity-value">${escapeHtml(item.quantity)}</span>
          <button class="quantity-button" type="button" data-quantity-change="1" data-product-id="${escapeHtml(item.id)}" aria-label="Aumentar cantidad de ${escapeHtml(item.name)}">+</button>
        </div>
      </div>
      <button class="cart-item-remove" type="button" data-remove-from-cart="${escapeHtml(item.id)}" aria-label="Eliminar ${escapeHtml(item.name)} del carrito">
        Eliminar
      </button>
    </article>
  `).join('');
}

function addToCart(product) {
  const existingItem = state.cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    state.cart.push({
      ...product,
      quantity: 1
    });
  }

  saveCart();
  renderCart();
  showToast(`${product.name} agregado al carrito`);
  pulseCartButton();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.id !== productId);
  saveCart();
  renderCart();
}

function changeQuantity(productId, change) {
  const item = state.cart.find((cartItem) => cartItem.id === productId);

  if (!item) {
    return;
  }

  item.quantity += change;

  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  saveCart();
  renderCart();
}

function clearCart() {
  state.cart = [];
  saveCart();
  renderCart();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');

  toastTimer = setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 2200);
}

function pulseCartButton() {
  elements.cartToggle.classList.add('is-pulsing');

  setTimeout(() => {
    elements.cartToggle.classList.remove('is-pulsing');
  }, 450);
}

function openCart() {
  elements.cartOverlay.hidden = false;
  elements.cartSidebar.hidden = false;

  requestAnimationFrame(() => {
    elements.cartOverlay.classList.add('is-open');
    elements.cartSidebar.classList.add('is-open');
    elements.cartSidebar.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
  });
}

function closeCart() {
  elements.cartOverlay.classList.remove('is-open');
  elements.cartSidebar.classList.remove('is-open');
  elements.cartSidebar.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cart-open');

  setTimeout(() => {
    if (!elements.cartSidebar.classList.contains('is-open')) {
      elements.cartOverlay.hidden = true;
      elements.cartSidebar.hidden = true;
    }
  }, 260);
}

function handleProductClick(event) {
  const button = event.target.closest('[data-add-to-cart]');

  if (!button) {
    return;
  }

  const productId = Number(button.dataset.addToCart);
  const product = state.products.find((item) => item.id === productId);

  if (product) {
    addToCart(product);
  }
}

function handleCartClick(event) {
  const removeButton = event.target.closest('[data-remove-from-cart]');

  if (removeButton) {
    removeFromCart(Number(removeButton.dataset.removeFromCart));
    return;
  }

  const quantityButton = event.target.closest('[data-quantity-change]');

  if (quantityButton) {
    changeQuantity(
      Number(quantityButton.dataset.productId),
      Number(quantityButton.dataset.quantityChange)
    );
  }
}

function handleCheckout() {
  if (!state.cart.length) {
    showToast('El carrito está vacío');
    return;
  }

  showToast('Compra finalizada correctamente');
  clearCart();
  closeCart();
}

function init() {
  state.cart = loadCart();
  renderCart();
  renderLoadingProducts();

  elements.productList.addEventListener('click', handleProductClick);
  elements.cartToggle.addEventListener('click', openCart);
  elements.closeCartButton.addEventListener('click', closeCart);
  elements.cartOverlay.addEventListener('click', closeCart);
  elements.cartItems.addEventListener('click', handleCartClick);
  elements.clearCartButton.addEventListener('click', clearCart);
  elements.checkoutButton.addEventListener('click', handleCheckout);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCart();
    }
  });

  fetchProducts().then((products) => {
    state.products = products;
    renderProducts(products);
  });
}

init();
