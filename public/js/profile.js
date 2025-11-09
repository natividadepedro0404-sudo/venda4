document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('hypex_token');
  const userSpan = document.getElementById('user-name');
  const emailSpan = document.getElementById('user-email');
  const addrEl = document.getElementById('addr');
  const ordersList = document.getElementById('orders-list');
  const logoutBtn = document.getElementById('logout-btn');

  if (!token) {
    window.location.href = '/pages/auth.html?redirect=/pages/profile.html';
    return;
  }

  // Load profile info from localStorage first
  try {
    const user = JSON.parse(localStorage.getItem('hypex_user') || 'null');
    if (user) {
      userSpan.textContent = user.name || '-';
      emailSpan.textContent = user.email || '-';
      addrEl.value = user.address || '';
    }
  } catch (e) {}

  // Fetch latest profile
  fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` }})
    .then(r => r.json())
    .then(data => {
      if (data.user) {
        userSpan.textContent = data.user.name || '-';
        emailSpan.textContent = data.user.email || '-';
        addrEl.value = data.user.address || '';
        localStorage.setItem('hypex_user', JSON.stringify(data.user));
      }
    }).catch(console.error);

  // Load user orders
  function loadOrders() {
    ordersList.innerHTML = '<p>Carregando pedidos...</p>';
    fetch('/api/orders/mine', { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json())
      .then(data => {
        if (!data.orders || !data.orders.length) {
          ordersList.innerHTML = '<p>Você ainda não fez pedidos.</p>';
          return;
        }

        ordersList.innerHTML = '';
        data.orders.forEach(o => {
          const el = document.createElement('div');
          el.className = 'order-card';
          el.innerHTML = `
            <h4>Pedido #${o.id} — <small>${o.status}</small></h4>
            <div><strong>Total:</strong> R$ ${Number(o.total).toFixed(2)}</div>
            <div><strong>Criado:</strong> ${new Date(o.created_at).toLocaleString()}</div>
            <div class="order-items">${(o.items||[]).map(i => `<div>${i.qty}x ${i.name} — R$ ${Number(i.price).toFixed(2)}</div>`).join('')}</div>
          `;
          ordersList.appendChild(el);
        });
      }).catch(err => {
        ordersList.innerHTML = '<p>Erro ao carregar pedidos.</p>';
        console.error(err);
      });
  }

  loadOrders();

  // Save address
  document.getElementById('address-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const address = addrEl.value.trim();
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Endereço atualizado');
        localStorage.setItem('hypex_user', JSON.stringify(data.user));
      } else {
        throw new Error(data.error || 'Erro ao salvar endereço');
      }
    } catch (err) {
      alert(err.message);
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('hypex_token');
    localStorage.removeItem('hypex_user');
    window.location.href = '/';
  });
});
