// Carregar dados do produto
let currentProduct = null;
let selectedSize = null;
let isFavorite = false;

// Função para atualizar contador do carrinho
function updateCartCount() {
  if (typeof window.updateCartCount === 'function') {
    window.updateCartCount();
  } else {
    try {
      const cart = JSON.parse(localStorage.getItem('hypex_cart') || '[]');
      const count = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
      const cartCountEl = document.querySelector('.cart-count');
      if (cartCountEl) {
        cartCountEl.textContent = count;
      }
    } catch (e) {
      console.error('Erro ao atualizar contador do carrinho:', e);
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showError();
    return;
  }

  await loadProduct(productId);
  await checkFavoriteStatus(productId);
  updateCartCount(); // Atualizar contador ao carregar a página
});

async function loadProduct(productId) {
  try {
    const response = await fetch(`/api/products/${productId}`);
    const data = await response.json();

    if (!response.ok || !data.product) {
      showError();
      return;
    }

    currentProduct = data.product;
    renderProduct(data.product);
  } catch (error) {
    console.error('Erro ao carregar produto:', error);
    showError();
  }
}

function renderProduct(product) {
  // Esconder loading e mostrar conteúdo
  document.getElementById('product-loading').style.display = 'none';
  document.getElementById('product-detail').style.display = 'grid';

  // Título
  document.getElementById('product-title').textContent = product.name;

  // Preço
  const hasDiscount = product.original_price && product.original_price > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / product.original_price) * 100) : 0;

  document.getElementById('product-price').textContent = `R$ ${Number(product.price).toFixed(2)}`;

  if (hasDiscount) {
    document.getElementById('product-original-price').textContent = `R$ ${Number(product.original_price).toFixed(2)}`;
    document.getElementById('product-original-price').style.display = 'inline';
    document.getElementById('product-discount-badge').textContent = `-${discount}% OFF`;
    document.getElementById('product-discount-badge').style.display = 'inline';
  }

  // Estoque
  const stock = Number(product.stock || 0);
  const stockElement = document.getElementById('product-stock');
  if (stock > 0) {
    stockElement.textContent = `✓ Em estoque (${stock} unidades)`;
    stockElement.className = 'product-stock in-stock';
  } else {
    stockElement.textContent = '✗ Fora de estoque';
    stockElement.className = 'product-stock out-of-stock';
  }

  // Imagens
  const images = product.images || [];
  const mainImage = images[0] || 'https://via.placeholder.com/600x800?text=HYPEX';
  document.getElementById('product-main-image').src = mainImage;
  document.getElementById('product-main-image').alt = product.name;

  // Thumbnails
  const thumbnailsContainer = document.getElementById('product-thumbnails');
  if (images.length > 1) {
    thumbnailsContainer.innerHTML = images.map((img, index) => `
      <img 
        class="product-thumbnail ${index === 0 ? 'active' : ''}" 
        src="${img}" 
        alt="${product.name} - Imagem ${index + 1}"
        data-index="${index}"
      >
    `).join('');

    // Event listeners para thumbnails
    thumbnailsContainer.querySelectorAll('.product-thumbnail').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const index = parseInt(thumb.dataset.index);
        document.getElementById('product-main-image').src = images[index];
        thumbnailsContainer.querySelectorAll('.product-thumbnail').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  } else {
    thumbnailsContainer.innerHTML = '';
  }

  // Especificações
  if (product.brand) {
    document.getElementById('product-brand').textContent = product.brand;
    document.getElementById('product-brand-spec').style.display = 'flex';
  }

  if (product.type) {
    document.getElementById('product-type').textContent = product.type;
    document.getElementById('product-type-spec').style.display = 'flex';
  }

  if (product.color) {
    document.getElementById('product-color').textContent = product.color;
    document.getElementById('product-color-spec').style.display = 'flex';
  }

  // Tamanhos
  if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
    const sizesContainer = document.getElementById('product-sizes');
    sizesContainer.innerHTML = product.sizes.map(size => `
      <span class="size-tag" data-size="${size}">${size}</span>
    `).join('');

    // Event listeners para tamanhos
    sizesContainer.querySelectorAll('.size-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        sizesContainer.querySelectorAll('.size-tag').forEach(t => t.classList.remove('selected'));
        tag.classList.add('selected');
        selectedSize = tag.dataset.size;
      });
    });

    document.getElementById('product-sizes-spec').style.display = 'flex';
  }

  // Descrição
  if (product.description) {
    document.getElementById('product-description-text').textContent = product.description;
    document.getElementById('product-description').style.display = 'block';
  }

  // Botão de adicionar ao carrinho
  const addCartBtn = document.getElementById('btn-add-cart');
  if (stock <= 0) {
    addCartBtn.disabled = true;
    addCartBtn.innerHTML = '<i class="fas fa-ban"></i><span>Fora de Estoque</span>';
  } else {
    addCartBtn.disabled = false;
    addCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i><span>Adicionar ao Carrinho</span>';
  }

  // Configurar event listeners após renderizar
  setupEventListeners();
}

function setupEventListeners() {
  // Botão de adicionar ao carrinho
  const addCartBtn = document.getElementById('btn-add-cart');
  if (addCartBtn) {
    // Remover event listeners anteriores se existirem
    const newAddCartBtn = addCartBtn.cloneNode(true);
    addCartBtn.parentNode.replaceChild(newAddCartBtn, addCartBtn);
    
    newAddCartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!currentProduct) {
        console.error('Produto não carregado');
        return;
      }

      const stock = Number(currentProduct.stock || 0);
      if (stock <= 0) {
        alert('Produto fora de estoque');
        return;
      }

      // Preparar objeto produto com todas as propriedades necessárias
      const productForCart = {
        id: currentProduct.id,
        product_id: currentProduct.id,
        name: currentProduct.name,
        price: Number(currentProduct.price || 0),
        stock: stock,
        images: currentProduct.images || [],
        size: selectedSize
      };

      // Usar função do app.js se disponível
      if (typeof window.addItemToCart === 'function') {
        try {
          window.addItemToCart(productForCart);
          // Não mostrar alert duplicado, o app.js já mostra
        } catch (error) {
          console.error('Erro ao adicionar ao carrinho:', error);
          // Fallback se houver erro
          addToCartFallback(productForCart);
        }
      } else {
        // Fallback: adicionar diretamente ao localStorage
        addToCartFallback(productForCart);
      }
    });
  }

  // Função fallback para adicionar ao carrinho
  function addToCartFallback(product) {
    try {
      const cart = JSON.parse(localStorage.getItem('hypex_cart') || '[]');
      const existingItem = cart.find(item => item.product_id === product.id);

      if (existingItem) {
        const currentQty = existingItem.qty || 0;
        if (currentQty >= product.stock) {
          alert(`Quantidade máxima disponível: ${product.stock} unidades`);
          return;
        }
        existingItem.qty += 1;
      } else {
        cart.push({
          product_id: product.id,
          name: product.name,
          price: product.price,
          image: product.images?.[0],
          stock: product.stock,
          qty: 1,
          size: product.size,
          checked: true
        });
      }

      localStorage.setItem('hypex_cart', JSON.stringify(cart));
      alert('Produto adicionado ao carrinho!');
      
      // Atualizar contador do carrinho
      updateCartCount();
      
      // Tentar abrir modal do carrinho se existir
      const cartModal = document.getElementById('cart-modal');
      if (cartModal && typeof window.renderCart === 'function') {
        window.renderCart();
        cartModal.style.display = 'block';
      }
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      alert('Erro ao adicionar produto ao carrinho. Tente novamente.');
    }
  }

  // Botão de favorito
  const favoriteBtn = document.getElementById('btn-favorite');
  if (favoriteBtn) {
    // Remover event listeners anteriores se existirem
    const newFavoriteBtn = favoriteBtn.cloneNode(true);
    favoriteBtn.parentNode.replaceChild(newFavoriteBtn, favoriteBtn);
    
    newFavoriteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!currentProduct) {
        console.error('Produto não carregado');
        return;
      }

      const icon = newFavoriteBtn.querySelector('i');

      try {
        const token = localStorage.getItem('hypex_token');
        if (!token) {
          alert('Você precisa estar logado para adicionar aos favoritos');
          window.location.href = '/pages/auth.html';
          return;
        }

        // Usar função do app.js se disponível
        if (typeof window.toggleFavorite === 'function') {
          try {
            await window.toggleFavorite(currentProduct.id, newFavoriteBtn);
            // O toggleFavorite do app.js já atualiza o ícone, mas precisamos atualizar o estado local
            // Verificar o estado atual do ícone para atualizar isFavorite
            if (icon.classList.contains('fas')) {
              isFavorite = true;
              newFavoriteBtn.classList.add('active');
            } else {
              isFavorite = false;
              newFavoriteBtn.classList.remove('active');
            }
          } catch (error) {
            console.error('Erro ao usar toggleFavorite do app.js:', error);
            // Fallback para API direta
            await toggleFavoriteFallback(currentProduct.id, newFavoriteBtn, icon);
          }
        } else {
          // Fallback: usar API diretamente
          await toggleFavoriteFallback(currentProduct.id, newFavoriteBtn, icon);
        }
      } catch (error) {
        console.error('Erro ao atualizar favorito:', error);
        alert('Erro ao atualizar favoritos');
      }
    });
  }

  // Função fallback para favoritos
  async function toggleFavoriteFallback(productId, button, icon) {
    try {
      const token = localStorage.getItem('hypex_token');
      if (!token) {
        alert('Você precisa estar logado para adicionar aos favoritos');
        window.location.href = '/pages/auth.html';
        return;
      }

      // Usar o endpoint toggle que é o padrão do app.js
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: productId })
      });

      const data = await response.json();

      if (response.ok) {
        isFavorite = data.isFavorite || false;
        if (isFavorite) {
          icon.className = 'fas fa-heart';
          button.classList.add('active');
        } else {
          icon.className = 'far fa-heart';
          button.classList.remove('active');
        }
      } else {
        alert(data.error || 'Erro ao atualizar favoritos');
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      alert('Erro ao atualizar favoritos');
    }
  }
}

async function checkFavoriteStatus(productId) {
  try {
    const token = localStorage.getItem('hypex_token');
    if (!token) return;

    const response = await fetch('/api/favorites', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const favoriteProductIds = (data.favorites || []).map(f => f.product_id);
      isFavorite = favoriteProductIds.includes(productId);

      const favoriteBtn = document.getElementById('btn-favorite');
      const icon = favoriteBtn.querySelector('i');

      if (isFavorite) {
        icon.className = 'fas fa-heart';
        favoriteBtn.classList.add('active');
      }
    }
  } catch (error) {
    console.error('Erro ao verificar favoritos:', error);
  }
}

function showError() {
  document.getElementById('product-loading').style.display = 'none';
  document.getElementById('product-error').style.display = 'block';
}

