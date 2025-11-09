document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('hypex_token');
  const user = JSON.parse(localStorage.getItem('hypex_user') || '{}');

  if (!token || user.role !== 'admin') {
    document.querySelectorAll('.admin-section').forEach(section => {
      section.innerHTML = '<p>Você precisa estar logado como admin para acessar esta área.</p>';
    });
    return;
  }

  // Nav Tabs
  document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
      document.getElementById(section).classList.add('active');
      link.classList.add('active');
    });
  });

  // Load Orders
  const ordersList = document.getElementById('orders-list');
  fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` }})
    .then(r => r.json())
    .then(data => {
      if (!data.orders) {
        ordersList.innerHTML = '<p>Sem pedidos ou acesso negado.</p>';
        return;
      }

      // Organizar pedidos por status
      const ordersByStatus = {
        'pedido feito': [],
        'em separacao': [],
        'enviado': [],
        'entregue': [],
        'outros': []
      };

      data.orders.forEach(o => {
        const status = o.status || 'pedido feito';
        if (ordersByStatus[status]) {
          ordersByStatus[status].push(o);
        } else {
          ordersByStatus['outros'].push(o);
        }
      });

      // Ordem de exibição: pedido feito primeiro (destacado), depois os outros
      const statusOrder = ['pedido feito', 'em separacao', 'enviado', 'entregue', 'outros'];
      const statusLabels = {
        'pedido feito': 'Pedidos Feitos',
        'em separacao': 'Em Separação',
        'enviado': 'Enviados',
        'entregue': 'Entregues',
        'outros': 'Outros Status'
      };

      ordersList.innerHTML = '';

      // Renderizar pedidos agrupados por status
      statusOrder.forEach(status => {
        const orders = ordersByStatus[status];
        if (orders.length === 0) return;

        // Criar seção de status
        const statusSection = document.createElement('div');
        statusSection.className = 'orders-status-section';
        if (status === 'pedido feito') {
          statusSection.classList.add('status-highlighted');
        }

        const statusTitle = document.createElement('h4');
        statusTitle.className = 'status-section-title';
        statusTitle.textContent = `${statusLabels[status]} (${orders.length})`;
        statusSection.appendChild(statusTitle);

        const statusContainer = document.createElement('div');
        statusContainer.className = 'status-orders-container';
        statusSection.appendChild(statusContainer);

        orders.forEach(o => {
  const el = document.createElement('div');
  el.className = 'order-card';
  // Destacar pedidos com status "pedido feito"
  if ((o.status || 'pedido feito') === 'pedido feito') {
    el.classList.add('order-highlighted');
  }

  // Monta HTML dos itens (usa name se existir, senão mostra product_id)
  const itemsHtml = (Array.isArray(o.items) ? o.items : []).map(i => {
    const prodName = i.name || i.product_id || 'Produto';
    const qty = Number(i.qty || 1);
    const price = Number(i.price || 0);
    return `<li>${prodName} — ${qty} x R$ ${price.toFixed(2)} <small>(subtotal R$ ${(qty * price).toFixed(2)})</small></li>`;
  }).join('');

  // Formatar endereço do pedido ou do usuário
  function formatAddress(address) {
    if (!address) return '<em class="text-muted">— sem endereço cadastrado —</em>';
    
    // Se for string, retornar como está (pode ser endereço simples)
    if (typeof address === 'string') {
      return address.trim() || '<em class="text-muted">— endereço vazio —</em>';
    }
    
    // Se for objeto, formatar de forma estruturada
    if (typeof address === 'object') {
      const parts = [];
      
      // Rua e número
      if (address.street || address.rua) {
        const street = address.street || address.rua;
        const number = address.number || address.numero;
        if (number) {
          parts.push(`${street}, ${number}`);
        } else {
          parts.push(street);
        }
      }
      
      // Complemento
      if (address.complement || address.complemento) {
        parts.push(address.complement || address.complemento);
      }
      
      // Bairro
      if (address.neighborhood || address.bairro) {
        parts.push(address.neighborhood || address.bairro);
      }
      
      // Cidade e Estado
      if (address.city || address.cidade) {
        const city = address.city || address.cidade;
        const state = address.state || address.estado || address.uf;
        if (state) {
          parts.push(`${city} - ${state}`);
        } else {
          parts.push(city);
        }
      }
      
      // CEP
      if (address.zipcode || address.cep || address.zip) {
        const cep = address.zipcode || address.cep || address.zip;
        parts.push(`CEP: ${cep}`);
      }
      
      // Se não encontrou nenhum campo conhecido, tentar exibir como JSON formatado
      if (parts.length === 0) {
        // Tentar outros formatos possíveis
        if (address.address) {
          return formatAddress(address.address);
        }
        return '<em class="text-muted">— formato de endereço não reconhecido —</em>';
      }
      
      return parts.join(', ');
    }
    
    return '<em class="text-muted">— endereço inválido —</em>';
  }

  // Priorizar endereço do pedido, senão usar do usuário
  const deliveryAddress = o.address || o.user_address;
  const formattedAddress = formatAddress(deliveryAddress);

  el.innerHTML = `
    <div class="order-header">
      <h4>Pedido #${o.id.substring(0, 8)}... — <small>${o.status}</small></h4>
      <div class="order-meta">
        <div><strong>Cliente:</strong> ${o.user_name || 'Usuário'} ${o.user_email ? `(${o.user_email})` : ''}</div>
        <div><strong>Total:</strong> R$ ${Number(o.total || 0).toFixed(2)}</div>
        <div><strong>Data:</strong> ${new Date(o.created_at).toLocaleString('pt-BR')}</div>
      </div>
    </div>

    <div class="order-address-section">
      <h5><i class="fas fa-map-marker-alt"></i> Endereço de Entrega</h5>
      <div class="address-display">${formattedAddress}</div>
    </div>

    <div class="order-items">
      <h5><i class="fas fa-shopping-bag"></i> Itens do Pedido</h5>
      <ul>
        ${itemsHtml || '<li>(nenhum item)</li>'}
      </ul>
    </div>

    <div class="admin-actions">
      <select data-order-id="${o.id}" class="status-select">
        <option value="pedido feito">Pedido feito</option>
        <option value="em separacao">Em separação</option>
        <option value="enviado">Enviado</option>
        <option value="entregue">Entregue</option>
      </select>
      <button data-order-id="${o.id}" class="save-status btn btn-outline">Salvar Status</button>
    </div>
  `;

  // setar o valor atual do select (pois as opções são estáticas)
  const statusSelect = el.querySelector('.status-select');
  if (statusSelect) statusSelect.value = o.status || 'pedido feito';

  statusContainer.appendChild(el);
        });

        ordersList.appendChild(statusSection);
      });

      // Set current statuses
      document.querySelectorAll('.status-select').forEach(sel => {
        const id = sel.getAttribute('data-order-id');
        const order = data.orders.find(x => String(x.id) === String(id));
        if (order) sel.value = order.status;
      });

      document.querySelectorAll('.save-status').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = btn.getAttribute('data-order-id');
          const sel = document.querySelector(`.status-select[data-order-id="${id}"]`);
          const status = sel.value;
          try {
            const res = await fetch(`/api/orders/${id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ status })
            });
            const json = await res.json();
            if (res.ok) {
              alert('Status atualizado');
              // Recarregar pedidos para reorganizar por status
              location.reload();
            } else {
              throw new Error(json.error || 'Erro');
            }
          } catch (err) {
            alert(err.message);
          }
        });
      });
    }).catch(err => {
      ordersList.innerHTML = '<p>Erro ao carregar pedidos.</p>';
      console.error(err);
    });

  // Products Management
  const productModal = document.getElementById('product-modal');
  const productForm = document.getElementById('product-form');
  const addProductBtn = document.getElementById('add-product');
  const productsGrid = document.querySelector('#products-list .products-grid');
  let currentProduct = null;

  // Load Products
  async function loadProducts() {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (!data.products) throw new Error('Sem produtos.');

      productsGrid.innerHTML = '';
      data.products.forEach(p => {
        const el = document.createElement('div');
        el.className = 'product-card';
        const img = p.image || (p.images && p.images.length ? p.images[0] : null) || 'https://via.placeholder.com/300x400';
        const sizesText = p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0 
          ? p.sizes.join(', ') 
          : 'N/A';
        const typeText = p.type || 'N/A';
        const colorText = p.color || 'N/A';
        const brandText = p.brand || 'N/A';
        
        el.innerHTML = `
          <img src="${img}" alt="${p.name}">
          <div class="product-info">
            <h4>${p.name}</h4>
            <p>R$ ${Number(p.price).toFixed(2)}</p>
            <p><small>Em estoque: ${p.stock}</small></p>
            <p><small><strong>Marca:</strong> ${brandText} | <strong>Tipo:</strong> ${typeText} | <strong>Cor:</strong> ${colorText}</small></p>
            <p><small><strong>Tamanhos:</strong> ${sizesText}</small></p>
            <div class="admin-actions">
              <button class="btn btn-outline edit-product" data-id="${p.id}">Editar</button>
              <button class="btn btn-outline delete-product" data-id="${p.id}">Excluir</button>
            </div>
          </div>
        `;
        productsGrid.appendChild(el);

        // Edit button
        el.querySelector('.edit-product').addEventListener('click', () => editProduct(p));
        
        // Delete button
        el.querySelector('.delete-product').addEventListener('click', async () => {
          if (!confirm('Tem certeza que deseja excluir este produto?')) return;
          try {
            const res = await fetch(`/api/products/${p.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              el.remove();
              alert('Produto excluído com sucesso.');
            } else {
              throw new Error('Erro ao excluir produto.');
            }
          } catch (err) {
            alert(err.message);
          }
        });
      });
    } catch (err) {
      productsGrid.innerHTML = '<p>Erro ao carregar produtos.</p>';
      console.error(err);
    }
  }

  // Função para atualizar contador de tamanhos e validar limite
  function updateSizesCounter() {
    const checkboxes = productForm.querySelectorAll('.size-checkbox');
    const checked = productForm.querySelectorAll('.size-checkbox:checked');
    const count = checked.length;
    const maxSizes = 9;
    
    const counter = document.getElementById('sizes-counter');
    const limitMessage = document.getElementById('sizes-limit-message');
    
    if (counter) {
      counter.textContent = `(${count}/${maxSizes} selecionados)`;
      if (count >= maxSizes) {
        counter.style.color = '#dc3545';
        counter.style.fontWeight = '600';
      } else {
        counter.style.color = '#666';
        counter.style.fontWeight = 'normal';
      }
    }
    
    if (limitMessage) {
      if (count >= maxSizes) {
        limitMessage.style.display = 'block';
      } else {
        limitMessage.style.display = 'none';
      }
    }
    
    // Desabilitar checkboxes não selecionados quando o limite for atingido
    checkboxes.forEach(cb => {
      if (count >= maxSizes && !cb.checked) {
        cb.disabled = true;
      } else {
        cb.disabled = false;
      }
    });
  }

  // Adicionar event listeners para os checkboxes de tamanhos
  // Usar delegação de eventos para garantir que funcione mesmo se os elementos forem recriados
  productForm.addEventListener('change', (e) => {
    if (e.target.classList.contains('size-checkbox')) {
      const checked = productForm.querySelectorAll('.size-checkbox:checked');
      const maxSizes = 9;
      
      // Se tentar marcar e já tiver 9 selecionados, desmarcar
      if (e.target.checked && checked.length > maxSizes) {
        e.target.checked = false;
        alert('Você pode selecionar no máximo 9 tamanhos.');
        updateSizesCounter(); // Atualizar contador mesmo após desmarcar
        return;
      }
      
      updateSizesCounter();
    }
  });

  // Atualizar contador quando o formulário for resetado
  productForm.addEventListener('reset', () => {
    setTimeout(() => updateSizesCounter(), 0); // Usar setTimeout para garantir que o reset aconteceu
  });

  // Inicializar contador ao carregar
  updateSizesCounter();

  // Open modal to add product
  addProductBtn.addEventListener('click', () => {
    currentProduct = null;
    productForm.reset();
    productForm.querySelector('[name=id]').value = '';
    productForm.querySelector('.image-preview').innerHTML = '';
    updateSizesCounter(); // Resetar contador
    productModal.style.display = 'flex';
  });

  // Close modal
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      productModal.style.display = 'none';
    });
  });

  // Edit product
  function editProduct(product) {
    currentProduct = product;
    productForm.querySelector('[name=id]').value = product.id;
    productForm.querySelector('[name=name]').value = product.name;
    productForm.querySelector('[name=description]').value = product.description;
    productForm.querySelector('[name=price]').value = product.price;
    productForm.querySelector('[name=stock]').value = product.stock;
    productForm.querySelector('[name=type]').value = product.type || '';
    productForm.querySelector('[name=color]').value = product.color || '';
    productForm.querySelector('[name=brand]').value = product.brand || '';

    // Limpar checkboxes de tamanhos
    productForm.querySelectorAll('[name=sizes]').forEach(cb => {
      cb.checked = false;
    });

    // Marcar tamanhos selecionados
    if (product.sizes && Array.isArray(product.sizes)) {
      product.sizes.forEach(size => {
        const checkbox = productForm.querySelector(`[name=sizes][value="${size}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    // Atualizar contador de tamanhos após marcar
    updateSizesCounter();

    const preview = productForm.querySelector('.image-preview');
    preview.innerHTML = '';
    if (product.images) {
      product.images.forEach(img => {
        preview.innerHTML += `<img src="${img}" alt="Preview">`;
      });
    }

    productModal.style.display = 'flex';
  }

  // Handle form submit
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);
    const id = formData.get('id');
    const isEdit = id && currentProduct;

    // Processar tamanhos selecionados
    const selectedSizes = [];
    productForm.querySelectorAll('[name=sizes]:checked').forEach(cb => {
      selectedSizes.push(cb.value);
    });

    // Validar limite de tamanhos antes de enviar
    if (selectedSizes.length > 9) {
      alert('Você pode selecionar no máximo 9 tamanhos. Por favor, desmarque alguns tamanhos.');
      return;
    }

    try {
      // For edit, convert FormData to JSON since we're not handling files in edit
      if (isEdit) {
        // Construir objeto de dados apenas com campos que devem ser atualizados
        // NÃO incluir 'images' pois não estamos fazendo upload de novas imagens na edição
        const data = {
          name: formData.get('name'),
          description: formData.get('description'),
          price: Number(formData.get('price') || 0),
          stock: Number(formData.get('stock') || 0),
          type: formData.get('type') || null,
          color: formData.get('color') || null,
          brand: formData.get('brand') || null,
          sizes: selectedSizes.length > 0 ? selectedSizes : []
        };
        
        const res = await fetch(`/api/products/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(data)
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Erro ao salvar produto.');
        }
        productModal.style.display = 'none';
        loadProducts();
        alert('Produto atualizado com sucesso!');
      } else {
        // For create, processar FormData e adicionar tamanhos
        // Adicionar cada tamanho selecionado ao FormData
        selectedSizes.forEach(size => {
          formData.append('sizes', size);
        });
        
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData // FormData sets its own Content-Type with boundary
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Erro ao criar produto.');
        productModal.style.display = 'none';
        loadProducts();
        alert('Produto criado com sucesso!');
      }
    } catch (err) {
      alert(err.message);
    }
  });

  // Coupons Management
  const couponsList = document.getElementById('coupons-list');

  async function loadCoupons() {
    try {
      const res = await fetch('/api/coupons', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const coupons = data.coupons || [];

      // Sempre mostrar o botão de adicionar cupom
      couponsList.innerHTML = `
        <div class="section-header">
          <button class="btn btn-primary" id="add-coupon">
            <i class="fas fa-plus"></i> Novo Cupom
          </button>
        </div>
        <div class="coupons-grid"></div>
      `;

      const grid = couponsList.querySelector('.coupons-grid');
      
      if (coupons.length === 0) {
        grid.innerHTML = '<p>Nenhum cupom cadastrado. Clique em "Novo Cupom" para adicionar um.</p>';
      } else {
        coupons.forEach(c => {
        const expires = new Date(c.expires_at).toLocaleDateString();
        const el = document.createElement('div');
        el.className = 'coupon-card';
        el.innerHTML = `
          <div class="coupon-info">
            <h4>${c.code}</h4>
            <p>${c.type === 'percentage' ? c.value + '%' : 'R$ ' + Number(c.value).toFixed(2)} de desconto</p>
            <p><small>Expira em: ${expires}</small></p>
            <p><small>Limite de uso: ${c.usage_limit === null || typeof c.usage_limit === 'undefined' ? 'Ilimitado' : c.usage_limit}</small></p>
            <div class="admin-actions">
              <button class="btn btn-outline edit-coupon" data-id="${c.id}">Editar</button>
              <button class="btn btn-outline delete-coupon" data-id="${c.id}">Excluir</button>
            </div>
          </div>
        `;
        grid.appendChild(el);

        // Delete button
        el.querySelector('.delete-coupon').addEventListener('click', async () => {
          if (!confirm('Tem certeza que deseja excluir este cupom?')) return;
          try {
            const res = await fetch(`/api/coupons/${c.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              el.remove();
              alert('Cupom excluído com sucesso.');
            } else {
              throw new Error('Erro ao excluir cupom.');
            }
          } catch (err) {
            alert(err.message);
          }
        });

        // Edit button
        el.querySelector('.edit-coupon').addEventListener('click', () => {
          showCouponModal(c);
        });
      });
      }

      const addBtn = document.getElementById('add-coupon');
      addBtn.addEventListener('click', () => showCouponModal());
    } catch (err) {
      couponsList.innerHTML = `
        <div class="section-header">
          <button class="btn btn-primary" id="add-coupon">
            <i class="fas fa-plus"></i> Novo Cupom
          </button>
        </div>
        <p>Erro ao carregar cupons.</p>
      `;
      const addBtn = document.getElementById('add-coupon');
      if (addBtn) {
        addBtn.addEventListener('click', () => showCouponModal());
      }
      console.error(err);
    }
  }

  function showCouponModal(coupon = null) {
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h4>${coupon ? 'Editar' : 'Novo'} Cupom</h4>
          <button class="close-modal">&times;</button>
        </div>
        <form id="coupon-form" class="admin-form">
          <input type="hidden" name="id" value="${coupon?.id || ''}">
          <div class="form-group">
            <label for="code">Código do Cupom</label>
            <input type="text" id="code" name="code" required value="${coupon?.code || ''}"
              pattern="[A-Za-z0-9]+" title="Apenas letras e números">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="type">Tipo de Desconto</label>
              <select id="type" name="type" required>
                <option value="percentage" ${coupon?.type === 'percentage' ? 'selected' : ''}>Porcentagem</option>
                <option value="fixed" ${coupon?.type === 'fixed' ? 'selected' : ''}>Valor Fixo</option>
              </select>
            </div>
            <div class="form-group">
              <label for="value">Valor do Desconto</label>
              <input type="number" id="value" name="value" required min="0" step="0.01" 
                value="${coupon?.value || ''}">
            </div>
          </div>
          <div class="form-group">
            <label for="expires">Data de Expiração</label>
            <input type="date" id="expires" name="expires_at" required 
              value="${coupon?.expires_at ? coupon.expires_at.split('T')[0] : ''}">
          </div>
          <div class="form-group">
            <label for="usage_limit">Limite de Uso (opcional)</label>
            <input type="number" id="usage_limit" name="usage_limit" min="0" step="1"
              value="${typeof coupon?.usage_limit !== 'undefined' && coupon?.usage_limit !== null ? coupon.usage_limit : ''}">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Salvar Cupom</button>
            <button type="button" class="btn btn-outline close-modal">Cancelar</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal
    modal.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });

    // Handle form submit
    const form = modal.querySelector('#coupon-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      const isEdit = data.id;

      try {
        // Construir payload apenas com campos válidos
        const payload = {
          code: data.code?.trim(),
          type: data.type,
          value: Number(data.value),
          expires_at: data.expires_at // Já vem no formato YYYY-MM-DD do input type="date"
        };
        
        // Incluir usage_limit apenas se tiver um valor válido
        const usageLimit = data.usage_limit?.trim();
        if (usageLimit && usageLimit !== '' && !isNaN(Number(usageLimit)) && Number(usageLimit) >= 0) {
          payload.usage_limit = Number(usageLimit);
        }
        
        const res = await fetch(isEdit ? `/api/coupons/${data.id}` : '/api/coupons', {
          method: isEdit ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (res.ok) {
          modal.remove();
          loadCoupons();
          alert(isEdit ? 'Cupom atualizado com sucesso!' : 'Cupom criado com sucesso!');
        } else {
          // Mostrar detalhes da validação se disponíveis
          let errorMsg = json.error || 'Erro ao salvar cupom.';
          
          // Se houver mensagens formatadas, usar elas
          if (json.messages && Array.isArray(json.messages) && json.messages.length > 0) {
            errorMsg = json.messages.join('\n');
          } else if (json.details && Array.isArray(json.details) && json.details.length > 0) {
            // Fallback para detalhes não formatados
            const details = json.details.map(d => {
              const field = d.param || d.path || '';
              const msg = d.msg || d.message || '';
              return field ? `${field}: ${msg}` : msg;
            }).join('\n');
            errorMsg = `Erro de validação:\n${details}`;
          }
          
          throw new Error(errorMsg);
        }
      } catch (err) {
        alert(err.message);
        console.error('Erro ao salvar cupom:', err);
      }
    });
  }

  // Load Site Settings
  async function loadSiteSettings() {
    const settingsList = document.getElementById('site-settings-list');
    if (!settingsList) return;

    try {
      const response = await fetch('/api/site-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Verificar status da resposta
      if (!response.ok) {
        const text = await response.text();
        console.error('Erro HTTP:', response.status, text.substring(0, 500));
        settingsList.innerHTML = `
          <div style="padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 4px;">
            <p><strong>Erro ao carregar configurações (Status ${response.status}):</strong></p>
            <p>A tabela 'site_settings' pode não existir no banco de dados.</p>
            <p>Por favor, execute o SQL em <code>sql/add_site_settings_table.sql</code> no Supabase.</p>
            <details style="margin-top: 0.5rem;">
              <summary style="cursor: pointer; color: #666;">Detalhes do erro</summary>
              <pre style="margin-top: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; overflow-x: auto; font-size: 0.75rem;">${text.substring(0, 500)}</pre>
            </details>
          </div>
        `;
        return;
      }
      
      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Resposta não é JSON. Content-Type:', contentType);
        console.error('Resposta:', text.substring(0, 500));
        settingsList.innerHTML = `
          <div style="padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 4px;">
            <p><strong>Erro ao carregar configurações:</strong></p>
            <p>A resposta não é JSON (Content-Type: ${contentType || 'não especificado'}).</p>
            <p>A tabela 'site_settings' pode não existir no banco de dados.</p>
            <p>Por favor, execute o SQL em <code>sql/add_site_settings_table.sql</code> no Supabase.</p>
            <details style="margin-top: 0.5rem;">
              <summary style="cursor: pointer; color: #666;">Detalhes da resposta</summary>
              <pre style="margin-top: 0.5rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; overflow-x: auto; font-size: 0.75rem;">${text.substring(0, 500)}</pre>
            </details>
          </div>
        `;
        return;
      }
      
      const data = await response.json();

      if (!data.settings) {
        settingsList.innerHTML = '<p>Erro ao carregar configurações.</p>';
        return;
      }

      const settings = data.settings;
      settingsList.innerHTML = `
        <div class="settings-form">
          <div class="setting-item">
            <label for="announcement_text">
              <strong>Texto do Anúncio (Frete Grátis)</strong>
              <small>Texto exibido no banner superior do site</small>
            </label>
            <input type="text" id="announcement_text" value="${(settings.announcement_text?.value || '').replace(/"/g, '&quot;')}" 
              placeholder="Frete grátis em compras acima de R$ 199">
            <button type="button" class="btn btn-primary save-setting" data-key="announcement_text">Salvar</button>
          </div>

          <div class="setting-item">
            <label for="hero_banner_title">
              <strong>Título do Banner Principal</strong>
              <small>Título exibido no banner hero (ex: "Nova Coleção")</small>
            </label>
            <input type="text" id="hero_banner_title" value="${(settings.hero_banner_title?.value || '').replace(/"/g, '&quot;')}" 
              placeholder="Nova Coleção">
            <button type="button" class="btn btn-primary save-setting" data-key="hero_banner_title">Salvar</button>
          </div>

          <div class="setting-item">
            <label for="hero_banner_subtitle">
              <strong>Subtítulo do Banner Principal</strong>
              <small>Subtítulo exibido no banner hero (ex: "Até 70% OFF + 20% no primeiro pedido")</small>
            </label>
            <input type="text" id="hero_banner_subtitle" value="${(settings.hero_banner_subtitle?.value || '').replace(/"/g, '&quot;')}" 
              placeholder="Até 70% OFF + 20% no primeiro pedido">
            <button type="button" class="btn btn-primary save-setting" data-key="hero_banner_subtitle">Salvar</button>
          </div>

          <div class="setting-item">
            <label for="hero_banner_background">
              <strong>Imagem de Background do Banner</strong>
              <small>URL da imagem ou faça upload de uma nova imagem</small>
            </label>
            <div style="margin-bottom: 0.5rem;">
              <input type="text" id="hero_banner_background_url" value="${(settings.hero_banner_background?.value || '').replace(/"/g, '&quot;')}" 
                placeholder="https://exemplo.com/imagem.jpg" style="width: 100%; margin-bottom: 0.5rem;">
              <button type="button" class="btn btn-primary save-setting" data-key="hero_banner_background" style="margin-right: 0.5rem;">Salvar URL</button>
            </div>
            <div>
              <input type="file" id="hero_banner_background_file" accept="image/*" style="margin-bottom: 0.5rem; width: 100%;">
              <button type="button" class="btn btn-outline upload-image" data-key="hero_banner_background">Fazer Upload</button>
            </div>
            ${settings.hero_banner_background?.value ? `
              <div style="margin-top: 1rem;">
                <img src="${settings.hero_banner_background.value}" alt="Preview" 
                  style="max-width: 100%; max-height: 200px; border-radius: 4px; border: 1px solid #ddd;">
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Event listeners para salvar configurações
      document.querySelectorAll('.save-setting').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const key = btn.getAttribute('data-key');
          let value = '';

          if (key === 'hero_banner_background') {
            value = document.getElementById('hero_banner_background_url').value.trim();
          } else {
            const input = document.getElementById(key);
            value = input ? input.value.trim() : '';
          }

          if (!value && key !== 'hero_banner_background') {
            alert('Por favor, preencha o campo antes de salvar.');
            return;
          }

          try {
            const response = await fetch(`/api/site-settings/${key}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ value })
            });

            const result = await response.json();
            if (response.ok) {
              alert('Configuração salva com sucesso!');
              loadSiteSettings(); // Recarregar para atualizar preview
            } else {
              alert(`Erro: ${result.error || 'Falha ao salvar configuração'}`);
            }
          } catch (err) {
            alert(`Erro ao salvar: ${err.message}`);
            console.error('Erro ao salvar configuração:', err);
          }
        });
      });

      // Event listener para upload de imagem
      document.querySelectorAll('.upload-image').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const key = btn.getAttribute('data-key');
          const fileInput = document.getElementById(`${key}_file`);
          const file = fileInput?.files[0];

          if (!file) {
            alert('Por favor, selecione uma imagem antes de fazer upload.');
            return;
          }

          const formData = new FormData();
          formData.append('image', file);

          try {
            btn.disabled = true;
            btn.textContent = 'Enviando...';

            const response = await fetch(`/api/site-settings/${key}/upload`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`
              },
              body: formData
            });

            const result = await response.json();
            if (response.ok) {
              alert('Imagem enviada com sucesso!');
              loadSiteSettings(); // Recarregar para atualizar preview
            } else {
              alert(`Erro: ${result.error || 'Falha ao enviar imagem'}`);
            }
          } catch (err) {
            alert(`Erro ao enviar: ${err.message}`);
            console.error('Erro ao enviar imagem:', err);
          } finally {
            btn.disabled = false;
            btn.textContent = 'Fazer Upload';
          }
        });
      });

    } catch (err) {
      settingsList.innerHTML = `<p>Erro ao carregar configurações: ${err.message}</p>`;
      console.error('Erro ao carregar configurações:', err);
    }
  }

  // Carregar configurações quando a seção for ativada
  let settingsLoaded = false;
  document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const section = link.getAttribute('data-section');
      if (section === 'site-settings' && !settingsLoaded) {
        loadSiteSettings();
        settingsLoaded = true;
      }
    });
  });

  // Initial loads
  loadProducts();
  loadCoupons();
});
