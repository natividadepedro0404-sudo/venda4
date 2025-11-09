const api = (p, opts) => fetch(`/api/${p}`, opts).then(r => r.json());

// Carrinho Modal
const cartModal = document.getElementById('cart-modal');
const cartIcon = document.querySelector('.cart-icon');
const closeModal = document.querySelector('.close-modal');

cartIcon.addEventListener('click', (e) => {
  e.preventDefault();
  cartModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
  cartModal.style.display = 'none';
});

// Produtos
async function loadProducts() {
  const res = await api('products');
  const list = document.getElementById('product-list');
  list.innerHTML = '';
  
  (res.products || []).forEach(p => {
    const hasDiscount = p.original_price > p.price;
    const discount = hasDiscount ? Math.round((1 - p.price / p.original_price) * 100) : 0;
    
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.productId = p.id;
    
    // Imagem principal
    const imgWrap = document.createElement('div');
    imgWrap.className = 'product-image';
    const img = document.createElement('img');
    img.alt = p.name;
    img.src = (p.images && p.images[0]) || 'https://via.placeholder.com/300x400?text=HYPEX';
    imgWrap.appendChild(img);
    
    if (hasDiscount) {
      const discountBadge = document.createElement('span');
      discountBadge.className = 'discount-badge';
      discountBadge.textContent = `-${discount}%`;
      imgWrap.appendChild(discountBadge);
    }
    
    // Quick actions
    const actions = document.createElement('div');
    actions.className = 'quick-actions';
    
    const favorite = document.createElement('button');
    favorite.innerHTML = '<i class="far fa-heart"></i>';
    favorite.title = 'Adicionar aos favoritos';
    favorite.className = 'action-btn favorite';
    favorite.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(p.id, favorite);
    });
    
    const addToCart = document.createElement('button');
    addToCart.innerHTML = '<i class="fas fa-shopping-cart"></i>';
    const stock = Number(p.stock || 0);
    if (stock <= 0) {
      addToCart.title = 'Produto fora de estoque';
      addToCart.disabled = true;
      addToCart.className = 'action-btn add-cart';
    } else {
      addToCart.title = 'Adicionar ao carrinho';
      addToCart.className = 'action-btn add-cart';
      addToCart.addEventListener('click', () => addItemToCart(p));
    }
    
    actions.appendChild(favorite);
    actions.appendChild(addToCart);
    imgWrap.appendChild(actions);
    
    card.appendChild(imgWrap);
    
    // Info do produto
    const info = document.createElement('div');
    info.className = 'product-info';
    
    const name = document.createElement('h3');
    name.className = 'product-name';
    name.textContent = p.name;
    
    const priceInfo = document.createElement('div');
    priceInfo.className = 'price-info';
    
    const currentPrice = document.createElement('span');
    currentPrice.className = 'current-price';
    currentPrice.textContent = `R$ ${Number(p.price).toFixed(2)}`;
    
    if (hasDiscount) {
      const originalPrice = document.createElement('span');
      originalPrice.className = 'original-price';
      originalPrice.textContent = `R$ ${Number(p.original_price).toFixed(2)}`;
      priceInfo.appendChild(originalPrice);
    }
    
    priceInfo.appendChild(currentPrice);
    
    info.appendChild(name);
    info.appendChild(priceInfo);
    
    // Adicionar especificações se disponíveis
    if (p.type || p.color || (p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0)) {
      const specs = document.createElement('div');
      specs.className = 'product-specs';
      specs.style.marginTop = '0.5rem';
      specs.style.fontSize = '0.875rem';
      specs.style.color = '#666';
      
      if (p.type) {
        const typeEl = document.createElement('p');
        typeEl.innerHTML = `<strong>Tipo:</strong> ${p.type}`;
        specs.appendChild(typeEl);
      }
      
      if (p.color) {
        const colorEl = document.createElement('p');
        colorEl.innerHTML = `<strong>Cor:</strong> ${p.color}`;
        specs.appendChild(colorEl);
      }
      
      if (p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0) {
        const sizesEl = document.createElement('p');
        sizesEl.innerHTML = `<strong>Tamanhos:</strong> ${p.sizes.join(', ')}`;
        specs.appendChild(sizesEl);
      }
      
      info.appendChild(specs);
    }
    
    card.appendChild(info);
    
    // Adicionar evento de clique para redirecionar para página de detalhes
    card.addEventListener('click', (e) => {
      // Ignorar se clicou nos botões de ação
      if (!e.target.closest('.quick-actions') && !e.target.closest('.action-btn')) {
        window.location.href = `/pages/product.html?id=${p.id}`;
      }
    });
    
    list.appendChild(card);
  });
  
  updateCartCount();
}

// Carrinho
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('hypex_cart') || '[]');
  } catch(e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('hypex_cart', JSON.stringify(cart));
  renderCart();
  updateCartCount();
}

window.addItemToCart = function(product) {
  const cart = getCart();
  const found = cart.find(i => i.product_id === product.id);
  const currentQty = found ? found.qty : 0;
  const stock = Number(product.stock || 0);
  
  // Validar se há estoque disponível
  if (stock <= 0) {
    alert('Produto fora de estoque!');
    return;
  }
  
  // Validar se a quantidade não excede o estoque
  if (currentQty >= stock) {
    alert(`Quantidade máxima disponível: ${stock} unidades`);
    return;
  }
  
  if (found) {
    found.qty++;
  } else {
    cart.push({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
      stock: stock, // Salvar stock para validação futura
      qty: 1,
      checked: true
    });
  }
  
  saveCart(cart);
  cartModal.style.display = 'block';
};

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelector('.cart-count').textContent = count;
}

// Variável global para cupom aplicado
let appliedCoupon = null;

function getAppliedCoupon() {
  try {
    return JSON.parse(localStorage.getItem('hypex_applied_coupon') || 'null');
  } catch(e) {
    return null;
  }
}

function saveAppliedCoupon(coupon) {
  if (coupon) {
    localStorage.setItem('hypex_applied_coupon', JSON.stringify(coupon));
  } else {
    localStorage.removeItem('hypex_applied_coupon');
  }
  appliedCoupon = coupon;
}

function calculateCartTotal(subtotal, coupon) {
  if (!coupon) return { subtotal, discount: 0, total: subtotal };
  
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = subtotal * (coupon.value / 100);
  } else if (coupon.type === 'fixed') {
    discount = Math.min(coupon.value, subtotal); // Não pode descontar mais que o total
  }
  
  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, total };
}

function renderCart() {
  const el = document.getElementById('cart-items');
  const cart = getCart();
  appliedCoupon = getAppliedCoupon();
  el.innerHTML = '';
  
  if (!cart.length) {
    el.innerHTML = '<div class="empty-cart">Seu carrinho está vazio</div>';
    document.getElementById('cart-subtotal-value').textContent = 'R$ 0,00';
    document.getElementById('cart-total-value').textContent = 'R$ 0,00';
    document.getElementById('coupon-discount').style.display = 'none';
    // Limpar cupom se carrinho estiver vazio
    saveAppliedCoupon(null);
    updateCouponUI();
    return;
  }
  
  let subtotal = 0;
  
  cart.forEach((item, idx) => {
    const itemTotal = item.price * item.qty;
    if (item.checked) subtotal += itemTotal;
    
    const row = document.createElement('div');
    row.className = 'cart-item';
    
    // Checkbox
    const cbWrap = document.createElement('div');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!item.checked;
    cb.addEventListener('change', e => {
      item.checked = e.target.checked;
      saveCart(cart);
    });
    cbWrap.appendChild(cb);
    
    // Imagem
    const img = document.createElement('img');
    img.src = item.image || 'https://via.placeholder.com/80x100?text=HYPEX';
    img.alt = item.name;
    
    // Info
    const info = document.createElement('div');
    info.className = 'item-info';
    const stock = Number(item.stock || 0);
    const canIncrease = stock > 0 && item.qty < stock;
    const canDecrease = item.qty > 1;
    
    info.innerHTML = `
      <h4>${item.name}</h4>
      <div class="item-price">R$ ${Number(item.price).toFixed(2)}</div>
      ${stock > 0 ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">Estoque: ${stock}</div>` : ''}
      <div class="item-quantity">
        <button class="qty-btn" onclick="updateQuantity(${idx}, ${item.qty - 1})" ${!canDecrease ? 'disabled' : ''}>-</button>
        <span>${item.qty}</span>
        <button class="qty-btn" onclick="updateQuantity(${idx}, ${item.qty + 1})" ${!canIncrease ? 'disabled' : ''}>+</button>
      </div>
    `;
    
    // Remove
    const remove = document.createElement('button');
    remove.className = 'remove-item';
    remove.innerHTML = '<i class="fas fa-trash"></i>';
    remove.addEventListener('click', () => {
      cart.splice(idx, 1);
      saveCart(cart);
    });
    
    row.appendChild(cbWrap);
    row.appendChild(img);
    row.appendChild(info);
    row.appendChild(remove);
    el.appendChild(row);
  });
  
  // Calcular total com desconto
  const { subtotal: finalSubtotal, discount, total } = calculateCartTotal(subtotal, appliedCoupon);
  
  document.getElementById('cart-subtotal-value').textContent = `R$ ${finalSubtotal.toFixed(2)}`;
  document.getElementById('cart-total-value').textContent = `R$ ${total.toFixed(2)}`;
  
  // Mostrar desconto se houver cupom aplicado
  if (appliedCoupon && discount > 0) {
    document.getElementById('coupon-discount').style.display = 'flex';
    document.getElementById('coupon-discount-value').textContent = `-R$ ${discount.toFixed(2)}`;
  } else {
    document.getElementById('coupon-discount').style.display = 'none';
  }
  
  updateCouponUI();
}

function updateQuantity(idx, newQty) {
  if (newQty < 1) {
    // Remove item se quantidade for 0
    const cart = getCart();
    cart.splice(idx, 1);
    saveCart(cart);
    return;
  }
  
  const cart = getCart();
  const item = cart[idx];
  const stock = Number(item.stock || 0);
  
  // Validar se a quantidade não excede o estoque
  if (newQty > stock) {
    alert(`Quantidade máxima disponível: ${stock} unidades`);
    return;
  }
  
  cart[idx].qty = newQty;
  saveCart(cart);
}

// Função para atualizar UI do cupom
function updateCouponUI() {
  const couponInput = document.getElementById('coupon-code-input');
  const couponMessage = document.getElementById('coupon-message');
  const applyCouponBtn = document.getElementById('apply-coupon-btn');
  
  if (!couponInput || !couponMessage || !applyCouponBtn) return;
  
  if (appliedCoupon) {
    couponInput.value = appliedCoupon.code;
    couponInput.disabled = true;
    couponMessage.innerHTML = `<span style="color: #28a745;"><i class="fas fa-check-circle"></i> Cupom "${appliedCoupon.code}" aplicado!</span>`;
    applyCouponBtn.textContent = 'Remover';
  } else {
    couponInput.value = '';
    couponInput.disabled = false;
    couponMessage.innerHTML = '';
    applyCouponBtn.textContent = 'Aplicar';
  }
}

// Função para aplicar cupom
async function applyCoupon() {
  const couponCode = document.getElementById('coupon-code-input').value?.trim().toUpperCase();
  const couponMessage = document.getElementById('coupon-message');
  
  if (!couponCode) {
    couponMessage.innerHTML = '<span style="color: #dc3545;">Por favor, digite um código de cupom.</span>';
    return;
  }
  
  const token = localStorage.getItem('hypex_token');
  if (!token) {
    couponMessage.innerHTML = '<span style="color: #dc3545;">Faça login para usar cupons.</span>';
    return;
  }
  
  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ code: couponCode })
    });
    
    const data = await res.json();
    
    if (res.ok && data.coupon) {
      // Verificar se o cupom está ativo
      if (!data.coupon.active) {
        couponMessage.innerHTML = '<span style="color: #dc3545;">Este cupom está inativo.</span>';
        return;
      }
      
      appliedCoupon = data.coupon;
      saveAppliedCoupon(appliedCoupon);
      renderCart(); // Re-renderizar para atualizar total
      couponMessage.innerHTML = '<span style="color: #28a745;"><i class="fas fa-check-circle"></i> Cupom aplicado com sucesso!</span>';
    } else {
      throw new Error(data.error || 'Cupom inválido ou expirado');
    }
  } catch (err) {
    couponMessage.innerHTML = `<span style="color: #dc3545;">${err.message}</span>`;
    console.error('Erro ao aplicar cupom:', err);
  }
}

// Função para remover cupom
function removeCoupon() {
  appliedCoupon = null;
  saveAppliedCoupon(null);
  renderCart(); // Re-renderizar para atualizar total
  updateCouponUI();
}

// Checkout
document.getElementById('checkout-btn').addEventListener('click', async () => {
  const token = localStorage.getItem('hypex_token');
  if (!token) {
    alert('Faça login antes de finalizar a compra');
    return;
  }
  
  const cart = getCart();
  const selectedItems = cart.filter(item => item.checked);
  
  if (!selectedItems.length) {
    alert('Selecione ao menos um item para finalizar a compra');
    return;
  }
  
  // Obter cupom aplicado se houver
  const coupon = getAppliedCoupon();
  const couponCode = coupon ? coupon.code : null;
  
  try {
    const res = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        items: selectedItems,
        address: null, // será pedido no checkout
        coupon_code: couponCode
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      // Salvar dados do pagamento no localStorage
      localStorage.setItem('hypex_pending_payment', JSON.stringify({
        pending_order_id: data.pending_order_id,
        payment: data.payment,
        order_summary: data.order_summary
      }));
      
      // Limpar itens comprados do carrinho e cupom aplicado
      const newCart = cart.filter(item => !item.checked);
      saveCart(newCart);
      saveAppliedCoupon(null);
      appliedCoupon = null;
      cartModal.style.display = 'none';
      
      // Redirecionar para página de pagamento
      window.location.href = `/pages/payment.html?pending_order_id=${data.pending_order_id}`;
    } else {
      throw new Error(data.error || 'Erro ao criar pedido');
    }
  } catch (err) {
    alert(err.message);
  }
});

// Função para alternar favorito
window.toggleFavorite = async function(productId, buttonElement) {
  try {
    const token = localStorage.getItem('hypex_token');
    if (!token) {
      alert('Faça login para adicionar produtos aos favoritos');
      window.location.href = '/pages/auth.html?redirect=' + encodeURIComponent(window.location.href);
      return;
    }

    const response = await fetch('/api/favorites/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao atualizar favorito');
    }

    // Atualizar o ícone do favorito
    const icon = buttonElement.querySelector('i');
    if (data.isFavorite) {
      icon.classList.remove('far');
      icon.classList.add('fas');
      buttonElement.title = 'Remover dos favoritos';
    } else {
      icon.classList.remove('fas');
      icon.classList.add('far');
      buttonElement.title = 'Adicionar aos favoritos';
    }
  } catch (error) {
    console.error('Erro ao alternar favorito:', error);
    alert(error.message || 'Erro ao atualizar favorito. Por favor, tente novamente.');
  }
}

// Função para verificar e atualizar status de favoritos nos produtos
async function updateFavoritesStatus() {
  const token = localStorage.getItem('hypex_token');
  if (!token) return;

  try {
    const response = await fetch('/api/favorites/', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    const favoriteProductIds = (data.favorites || []).map(f => f.product_id);

    // Atualizar ícones de favorito na página
    document.querySelectorAll('.product-card').forEach(card => {
      const productId = card.dataset?.productId;
      if (!productId) return;

      const favoriteBtn = card.querySelector('.action-btn.favorite');
      if (favoriteBtn && favoriteProductIds.includes(productId)) {
        const icon = favoriteBtn.querySelector('i');
        if (icon) {
          icon.classList.remove('far');
          icon.classList.add('fas');
          favoriteBtn.title = 'Remover dos favoritos';
        }
      }
    });
  } catch (error) {
    console.error('Erro ao verificar favoritos:', error);
  }
}

// Carregar configurações do site
async function loadSiteSettings() {
  try {
    const response = await fetch('/api/site-settings');
    
    // Verificar se a resposta é JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Se não for JSON, provavelmente a tabela não existe
      console.warn('Tabela site_settings não encontrada. Execute o SQL em sql/add_site_settings_table.sql');
      return; // Usar valores padrão do HTML
    }
    
    const data = await response.json();
    
    if (data.settings) {
      const settings = data.settings;
      
      // Atualizar texto do anúncio
      const announcementBar = document.querySelector('.announcement-bar p');
      if (announcementBar && settings.announcement_text?.value) {
        announcementBar.textContent = settings.announcement_text.value;
      }
      
      // Atualizar banner hero
      const heroBanner = document.querySelector('.hero-banner');
      const bannerTitle = document.querySelector('.banner-content h2');
      const bannerSubtitle = document.querySelector('.banner-content p');
      
      if (heroBanner) {
        // Atualizar background se houver imagem
        if (settings.hero_banner_background?.value) {
          heroBanner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${settings.hero_banner_background.value}')`;
        }
        
        // Atualizar título
        if (bannerTitle && settings.hero_banner_title?.value) {
          bannerTitle.textContent = settings.hero_banner_title.value;
        }
        
        // Atualizar subtítulo
        if (bannerSubtitle && settings.hero_banner_subtitle?.value) {
          bannerSubtitle.textContent = settings.hero_banner_subtitle.value;
        }
      }
    }
  } catch (err) {
    console.error('Erro ao carregar configurações do site:', err);
    // Não mostrar erro ao usuário, apenas usar valores padrão
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await loadSiteSettings(); // Carregar configurações primeiro
  await loadProducts();
  appliedCoupon = getAppliedCoupon();
  renderCart();
  updateFavoritesStatus();
  
  // Event listeners para cupom (só adicionar se os elementos existirem)
  const applyCouponBtn = document.getElementById('apply-coupon-btn');
  const couponInput = document.getElementById('coupon-code-input');
  
  if (applyCouponBtn) {
    applyCouponBtn.addEventListener('click', () => {
      if (appliedCoupon) {
        removeCoupon();
      } else {
        applyCoupon();
      }
    });
  }
  
  if (couponInput) {
    couponInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (appliedCoupon) {
          removeCoupon();
        } else {
          applyCoupon();
        }
      }
    });
  }
});