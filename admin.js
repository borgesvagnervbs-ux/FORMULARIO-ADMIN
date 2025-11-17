// admin.js
// Painel Admin - Firestore real-time + filtros + paginação
// IMPORTANTE: coloque suas credenciais do Firebase abaixo

// --- UI references
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const pageTitle = document.getElementById('pageTitle');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const viewName = item.dataset.view;
    showView(viewName);
  });
});

function showView(name) {
  views.forEach(v => v.classList.add('hidden'));
  document.getElementById(name).classList.remove('hidden');
  pageTitle.textContent = name === 'dashboard' ? 'Tela Principal' : 'Relatórios';
}

// --- Tabs status on dashboard
const tabBtns = document.querySelectorAll('.tab-btn');
let activeStatus = 'recebidos';
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeStatus = btn.dataset.status;
    renderCards(currentDocs); // re-render cards with new status
  });
});

// --- Cards rendering
const cardsContainer = document.getElementById('cardsContainer');
const emptyMessage = document.getElementById('emptyMessage');

function niceDate(ts) {
  if (!ts) return '-';
  // ts pode ser Firestore Timestamp ou Date
  let d;
  if (ts.toDate) d = ts.toDate();
  else d = new Date(ts);
  return d.toLocaleString();
}

// cache of docs
let currentDocs = []; // array of {id, data}

// realtime listener: mantém painel atualizado
collection.orderBy('dataCadastro', 'desc').onSnapshot(snapshot => {
  const docs = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    // padronize status
    if (!data.status) data.status = 'recebidos';
    docs.push({ id: doc.id, data });
  });
  currentDocs = docs;
  renderCards(currentDocs);
  // Se estiver na página de relatórios com filtros aplicados, não sobrescrevemos
  // os resultados filtrados automaticamente — usuário deve clicar em Aplicar Filtros.
});

// render cards com base no status ativo
function renderCards(allDocs) {
  cardsContainer.innerHTML = '';
  const filtered = allDocs.filter(d => (d.data.status || 'recebidos') === activeStatus);
  if (filtered.length === 0) {
    emptyMessage.style.display = 'block';
  } else {
    emptyMessage.style.display = 'none';
    filtered.forEach(item => {
      const d = item.data;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${escapeHtml(d.nome || '—')}</h3>
        <p><strong>CPF:</strong> ${escapeHtml(d.cpf || '—')}</p>
        <p><strong>Estabelecimento:</strong> ${escapeHtml(d.estabelecimento || '—')}</p>
        <p><strong>Função:</strong> ${escapeHtml(d.funcaoEspecialidadeCBO || d.funcao || '—')}</p>
        <div class="meta">
          <span>Recebido: ${niceDate(d.dataCadastro)}</span>
          <span>${capitalize(d.status || 'recebidos')}</span>
        </div>
        <div class="actions">
          <button class="btn small" data-id="${item.id}" data-action="view">Visualizar</button>
          <button class="btn primary small" data-id="${item.id}" data-action="edit">Editar</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });

    // attach listeners aos botões dentro das cards
    cardsContainer.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'edit') openEditModalById(id);
        else if (action === 'view') viewRecordById(id);
      });
    });
  }
}

// util helpers
function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function capitalize(s){ if(!s) return s; return s.charAt(0).toUpperCase()+s.slice(1); }

// --- Modal de edição
const editModal = document.getElementById('editModal');
const closeModalBtn = document.getElementById('closeModal');
const cancelEditBtn = document.getElementById('cancelEdit');
const saveEditBtn = document.getElementById('saveEdit');

let editingDocId = null;

closeModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

function openEditModalById(id) {
  editingDocId = id;
  collection.doc(id).get().then(doc => {
    if (!doc.exists) {
      alert('Documento não encontrado.');
      return;
    }
    const data = doc.data();
    // preenche campos
    $('#e_nome').val(data.nome || '');
    $('#e_cpf').val(data.cpf || '');
    $('#e_estabelecimento').val(data.estabelecimento || '');
    $('#e_funcao').val(data.funcaoEspecialidadeCBO || data.funcao || '');
    $('#e_ufConselho').val(data.ufConselho || '');
    $('#e_atendeSus').val(data.atendeSus || '');
    $('#e_status').val(data.status || 'recebidos');

    openEditModal();
  }).catch(err => {
    console.error('Erro ao buscar documento:', err);
    alert('Erro ao carregar dados: ' + err.message);
  });
}

function viewRecordById(id) {
  // abre mesmo modal em modo leitura simples (reaproveita modal)
  openEditModalById(id);
}

function openEditModal() {
  editModal.classList.remove('hidden');
}
function closeEditModal() {
  editModal.classList.add('hidden');
  editingDocId = null;
}

// salvar edição
saveEditBtn.addEventListener('click', () => {
  if (!editingDocId) return;
  const updated = {
    nome: $('#e_nome').val() || null,
    cpf: $('#e_cpf').val() || null,
    estabelecimento: $('#e_estabelecimento').val() || null,
    funcaoEspecialidadeCBO: $('#e_funcao').val() || null,
    ufConselho: $('#e_ufConselho').val() || null,
    atendeSus: $('#e_atendeSus').val() || null,
    status: $('#e_status').val() || 'editados',
    lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
    editedByAdmin: true
  };
  collection.doc(editingDocId).update(updated).then(() => {
    closeEditModal();
  }).catch(err => {
    console.error('Erro ao atualizar:', err);
    alert('Erro ao atualizar: ' + err.message);
  });
});

// ---------- RELATÓRIOS: filtros e paginação ----------
const applyFiltersBtn = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const perPageSelect = document.getElementById('perPage');
const resultsTbody = document.querySelector('#resultsTable tbody');
const totalFilteredSpan = document.getElementById('totalFiltered');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');

let filteredResults = []; // array of {id,data}
let currentPage = 1;
let perPage = parseInt(perPageSelect.value, 10) || 10;

// read filters
function readFilters(){
  return {
    nome: document.getElementById('f_nome').value.trim(),
    cpf: document.getElementById('f_cpf').value.trim(),
    estabelecimento: document.getElementById('f_estabelecimento').value.trim(),
    funcao: document.getElementById('f_funcao').value.trim(),
    ufConselho: document.getElementById('f_ufConselho').value,
    atendeSus: document.getElementById('f_atendeSus').value,
    status: document.getElementById('f_status').value,
    dateFrom: document.getElementById('f_dateFrom').value,
    dateTo: document.getElementById('f_dateTo').value
  };
}

// aplica filtros localmente (busca todos os docs uma vez)
function applyFilters() {
  const f = readFilters();
  // fetch ALL documents once (pode ser ajustado para queries Firestore mais eficientes)
  collection.orderBy('dataCadastro','desc').get().then(snap => {
    const docs = [];
    snap.forEach(doc => {
      const data = doc.data();
      if (!data.status) data.status = 'recebidos';
      docs.push({ id: doc.id, data });
    });

    let rows = docs;

    // filtros textuais (contains case-insensitive)
    if (f.nome) {
      rows = rows.filter(r => (r.data.nome || '').toLowerCase().includes(f.nome.toLowerCase()));
    }
    if (f.cpf) {
      rows = rows.filter(r => (r.data.cpf || '').includes(f.cpf));
    }
    if (f.estabelecimento) {
      rows = rows.filter(r => (r.data.estabelecimento || '').toLowerCase().includes(f.estabelecimento.toLowerCase()));
    }
    if (f.funcao) {
      rows = rows.filter(r => ((r.data.funcaoEspecialidadeCBO||r.data.funcao||'').toLowerCase()).includes(f.funcao.toLowerCase()));
    }
    if (f.ufConselho) {
      rows = rows.filter(r => (r.data.ufConselho || '').toUpperCase() === f.ufConselho.toUpperCase());
    }
    if (f.atendeSus) {
      rows = rows.filter(r => (r.data.atendeSus || '').toLowerCase() === f.atendeSus.toLowerCase());
    }
    if (f.status) {
      rows = rows.filter(r => (r.data.status || 'recebidos') === f.status);
    }
    // data range by dataCadastro (Firestore Timestamp)
    if (f.dateFrom) {
      const fromTs = new Date(f.dateFrom + 'T00:00:00');
      rows = rows.filter(r => {
        const dc = r.data.dataCadastro;
        if (!dc) return false;
        const d = dc.toDate ? dc.toDate() : new Date(dc);
        return d >= fromTs;
      });
    }
    if (f.dateTo) {
      const toTs = new Date(f.dateTo + 'T23:59:59');
      rows = rows.filter(r => {
        const dc = r.data.dataCadastro;
        if (!dc) return false;
        const d = dc.toDate ? dc.toDate() : new Date(dc);
        return d <= toTs;
      });
    }

    filteredResults = rows;
    currentPage = 1;
    perPage = parseInt(perPageSelect.value, 10) || 10;
    renderReportPage();
  }).catch(err => {
    console.error('Erro ao buscar para filtros:', err);
    alert('Erro ao aplicar filtros: ' + err.message);
  });
}

applyFiltersBtn.addEventListener('click', applyFilters);
clearFiltersBtn.addEventListener('click', () => {
  document.getElementById('f_nome').value = '';
  document.getElementById('f_cpf').value = '';
  document.getElementById('f_estabelecimento').value = '';
  document.getElementById('f_funcao').value = '';
  document.getElementById('f_ufConselho').value = '';
  document.getElementById('f_atendeSus').value = '';
  document.getElementById('f_status').value = '';
  document.getElementById('f_dateFrom').value = '';
  document.getElementById('f_dateTo').value = '';
  filteredResults = [];
  resultsTbody.innerHTML = '';
  totalFilteredSpan.textContent = '0';
  currentPage = 1;
  totalPagesSpan.textContent = '1';
  currentPageSpan.textContent = '1';
});

// pagination controls
perPageSelect.addEventListener('change', () => {
  perPage = parseInt(perPageSelect.value,10);
  currentPage = 1;
  renderReportPage();
});
prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; renderReportPage(); }
});
nextPageBtn.addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / perPage));
  if (currentPage < totalPages) { currentPage++; renderReportPage(); }
});

function renderReportPage() {
  const total = filteredResults.length;
  totalFilteredSpan.textContent = total;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (currentPage > totalPages) currentPage = totalPages;
  currentPageSpan.textContent = currentPage;
  totalPagesSpan.textContent = totalPages;

  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageItems = filteredResults.slice(start, end);

  resultsTbody.innerHTML = '';
  pageItems.forEach(item => {
    const d = item.data;
    const tr = document.createElement('tr');
    const dateStr = niceDate(d.dataCadastro);
    tr.innerHTML = `
      <td>${escapeHtml(dateStr)}</td>
      <td>${escapeHtml(d.nome||'—')}</td>
      <td>${escapeHtml(d.cpf||'—')}</td>
      <td>${escapeHtml(d.estabelecimento||'—')}</td>
      <td>${escapeHtml(d.funcaoEspecialidadeCBO||d.funcao||'—')}</td>
      <td>${escapeHtml(d.ufConselho||'—')}</td>
      <td>${escapeHtml(d.atendeSus||'—')}</td>
      <td>${escapeHtml(d.status||'recebidos')}</td>
      <td>
        <button class="btn small" data-id="${item.id}" data-action="edit">Editar</button>
      </td>
    `;
    resultsTbody.appendChild(tr);
  });

  // attach edit button listeners
  resultsTbody.querySelectorAll('button[data-action="edit"]').forEach(b => {
    b.addEventListener('click', () => openEditModalById(b.dataset.id));
  });
}

// initialize view
showView('dashboard');

// helper: convert Firestore Timestamp to nice string (already above)
// niceDate defined earlier

// small improvement: when user goes to reports view, pre-load recent documents
document.querySelector('[data-view="reports"]').addEventListener('click', () => {
  // if there's no filteredResults yet, load last 200 docs so admin can start filtering quickly
  if (filteredResults.length === 0) {
    collection.orderBy('dataCadastro','desc').limit(200).get().then(snap => {
      const docs = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (!data.status) data.status = 'recebidos';
        docs.push({ id: doc.id, data });
      });
      filteredResults = docs;
      totalFilteredSpan.textContent = filteredResults.length;
      renderReportPage();
    }).catch(err => {
      console.error('Erro ao pré-carregar relatórios:', err);
    });
  }
});
