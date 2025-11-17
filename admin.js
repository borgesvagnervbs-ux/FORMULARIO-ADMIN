// admin.js
// Painel Admin com tela de edição completa (opção B)

(function(){
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
    pageTitle.textContent = name === 'dashboard' ? 'Tela Principal' : (name === 'reports' ? 'Relatórios' : 'Editar Registro');
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
    let d;
    if (ts.toDate) d = ts.toDate();
    else d = new Date(ts);
    return d.toLocaleString();
  }

  // cache of docs
  let currentDocs = []; // array of {id, data}

  // helper: escape
  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function capitalize(s){ if(!s) return s; return s.charAt(0).toUpperCase()+s.slice(1); }

  // --- wait for collection (same approach as client)
  function whenCollectionReady(callback, maxAttempts = 50, intervalMs = 120) {
    if (window.cnesCollection) {
      return callback(window.cnesCollection);
    }
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      if (window.cnesCollection) {
        clearInterval(iv);
        callback(window.cnesCollection);
      } else if (attempts >= maxAttempts) {
        clearInterval(iv);
        const msg = 'Firestore não inicializado. Verifique inclusão de firebase-config.js e das libs do Firebase v8 antes do script.';
        console.error(msg);
        alert(msg);
      }
    }, intervalMs);
  }

  // --- main init: wait for collection
  whenCollectionReady((collection) => {
    // collection is window.cnesCollection (Firestore CollectionReference)
    // realtime listener: mantém painel atualizado
    collection.orderBy('dataCadastro', 'desc').onSnapshot(snapshot => {
      const docs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.status) data.status = 'recebidos';
        docs.push({ id: doc.id, data });
      });
      currentDocs = docs;
      // Se estamos na view de edição não sobrescrevemos o formulário atual,
      // mas renderizamos cartões caso esteja na dashboard.
      if (!document.getElementById('editView').classList.contains('hidden')) {
        // se estiver editando, não forçar mudança de view
      } else {
        renderCards(currentDocs);
      }
    }, err => {
      console.error('Erro no snapshot:', err);
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
            if (action === 'edit') openEditFullView(id);
            else if (action === 'view') openEditFullView(id); // usa mesma tela em modo leitura/edição
          });
        });
      }
    }

    // --- REPORTS variables and functions (copiado do seu admin.js original)
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

    function applyFilters() {
      const f = readFilters();
      collection.orderBy('dataCadastro','desc').get().then(snap => {
        const docs = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (!data.status) data.status = 'recebidos';
          docs.push({ id: doc.id, data });
        });

        let rows = docs;
        if (f.nome) rows = rows.filter(r => (r.data.nome || '').toLowerCase().includes(f.nome.toLowerCase()));
        if (f.cpf) rows = rows.filter(r => (r.data.cpf || '').includes(f.cpf));
        if (f.estabelecimento) rows = rows.filter(r => (r.data.estabelecimento || '').toLowerCase().includes(f.estabelecimento.toLowerCase()));
        if (f.funcao) rows = rows.filter(r => ((r.data.funcaoEspecialidadeCBO||r.data.funcao||'').toLowerCase()).includes(f.funcao.toLowerCase()));
        if (f.ufConselho) rows = rows.filter(r => (r.data.ufConselho || '').toUpperCase() === f.ufConselho.toUpperCase());
        if (f.atendeSus) rows = rows.filter(r => (r.data.atendeSus || '').toLowerCase() === f.atendeSus.toLowerCase());
        if (f.status) rows = rows.filter(r => (r.data.status || 'recebidos') === f.status);

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
        b.addEventListener('click', () => openEditFullView(b.dataset.id));
      });
    }

    // pre-load recent docs when opening reports
    document.querySelector('[data-view="reports"]').addEventListener('click', () => {
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

    // --- EDIT FULL VIEW logic
    const editViewEl = document.getElementById('editView');
    const backToDashboardBtn = document.getElementById('backToDashboard');
    const cancelEditFullBtn = document.getElementById('cancelEditFull');
    const saveAsEditedBtn = document.getElementById('saveAsEdited');
    const saveAsSentBtn = document.getElementById('saveAsSent');
    const adminEditMessage = document.getElementById('adminEditMessage');

    let editingDocId = null;

    function formatMetaForEdit(data) {
      const parts = [];
      if (data.dataCadastro) parts.push('Recebido: ' + niceDate(data.dataCadastro));
      if (data.status) parts.push('Status: ' + data.status);
      return parts.join(' • ');
    }

    function openEditFullView(id) {
      editingDocId = id;
      // load doc
      collection.doc(id).get().then(doc => {
        if (!doc.exists) {
          alert('Documento não encontrado.');
          return;
        }
        const d = doc.data();
        // fill fields (prefix a_)
        $('#a_nome').val(d.nome || '');
        $('#a_cpf').val(d.cpf || '');
        $('#a_dataNascimento').val(d.dataNascimento || '');
        $('#a_nomeMae').val(d.nomeMae || '');
        $('#a_municipioNascimento').val(d.municipioNascimento || '');
        $('#a_ufNascimento').val(d.ufNascimento || '');
        $('#a_identidade').val(d.identidade || '');
        $('#a_ufEmissorId').val(d.ufEmissorId || '');
        $('#a_orgaoEmissor').val(d.orgaoEmissor || '');
        $('#a_dataEmissao').val(d.dataEmissao || '');

        $('#a_rua').val(d.rua || '');
        $('#a_numero').val(d.numero || '');
        $('#a_complemento').val(d.complemento || '');
        $('#a_bairro').val(d.bairro || '');
        $('#a_cep').val(d.cep || '');
        $('#a_municipioResidencial').val(d.municipioResidencial || '');
        $('#a_telefone').val(d.telefone || '');
        $('#a_email').val(d.email || '');

        $('#a_estabelecimento').val(d.estabelecimento || '');
        $('#a_dataInicio').val(d.dataInicio || '');
        $('#a_cargaHoraria').val(d.cargaHorariaSemanal || d.cargaHoraria || '');
        $('#a_escolaridade').val(d.escolaridade || '');
        $('#a_funcao').val(d.funcaoEspecialidadeCBO || d.funcao || '');
        $('#a_registroConselho').val(d.registroConselho || '');
        $('#a_ufConselho').val(d.ufConselho || '');
        $('#a_empresaVinculo').val(d.empresaVinculo || '');
        $('#a_CNPJ').val(d.CNPJ || d.cnpj || '');

        // atendeSus radio
        if (d.atendeSus === 'Sim') { $('#a_atendeSus_sim').prop('checked', true); }
        else if (d.atendeSus === 'Não') { $('#a_atendeSus_nao').prop('checked', true); }
        else { $('#a_atendeSus_sim,#a_atendeSus_nao').prop('checked', false); }

        // vinculoEstabelecimento radios
        if (d.vinculoEstabelecimento) {
          $(`input[name="a_vinculoEstabelecimento"][value="${d.vinculoEstabelecimento}"]`).prop('checked', true);
        } else {
          $(`input[name="a_vinculoEstabelecimento"]`).prop('checked', false);
        }

        // meta
        document.getElementById('editMeta').textContent = formatMetaForEdit(d);

        // apply masks for admin edit form
        applyMasksToAdminForm();

        // switch view
        showView('editView');
        // scroll to top
        window.scrollTo(0,0);
      }).catch(err => {
        console.error('Erro ao buscar documento para edição:', err);
        alert('Erro ao carregar dados: ' + err.message);
      });
    }

    backToDashboardBtn.addEventListener('click', () => {
      editingDocId = null;
      showView('dashboard');
    });
    cancelEditFullBtn.addEventListener('click', () => {
      editingDocId = null;
      showView('dashboard');
    });

    // busca CEP para admin form
    document.getElementById('a_btnBuscarCep').addEventListener('click', () => {
      const cep = $('#a_cep').val().replace(/\D/g, '');
      if (cep.length !== 8) {
        showAdminEditMessage('CEP inválido.', 'error');
        return;
      }
      $('#a_rua').val('...');
      $('#a_bairro').val('...');
      $('#a_municipioResidencial').val('...');
      $.getJSON(`https://viacep.com.br/ws/${cep}/json/`)
        .done(function(dados) {
          if (!("erro" in dados)) {
            $('#a_rua').val(dados.logradouro);
            $('#a_bairro').val(dados.bairro);
            $('#a_municipioResidencial').val(dados.localidade + " / " + dados.uf);
            $('#a_numero').focus();
            showAdminEditMessage('', 'clear');
          } else {
            showAdminEditMessage('CEP não encontrado.', 'error');
            $('#a_rua').val('');
            $('#a_bairro').val('');
            $('#a_municipioResidencial').val('');
          }
        }).fail(function() {
          showAdminEditMessage('Erro ao consultar o serviço de CEP.', 'error');
        });
    });

    function showAdminEditMessage(text, type) {
      const el = adminEditMessage;
      if (type === 'clear') {
        el.className = 'hidden';
        el.textContent = '';
        return;
      }
      el.classList.remove('hidden');
      el.classList.remove('success','error');
      if (type === 'success') el.classList.add('success');
      else if (type === 'error') el.classList.add('error');
      el.textContent = text;
    }

    // apply masks similar to client
    function applyMasksToAdminForm() {
      $('#a_cpf').mask('000.000.000-00', {reverse: true});
      $('#a_dataNascimento, #a_dataEmissao, #a_dataInicio').mask('00/00/0000');
      $('#a_cep').mask('00000-000');
      $('#a_CNPJ').mask('00.000.000/0000-00');

      var SPMaskBehavior = function (val) {
          return val.replace(/\D/g, '').length === 11 ? '(00) 00000-0000' : '(00) 0000-00009';
      },
      spOptions = {
          onKeyPress: function(val, e, field, options) {
              field.mask(SPMaskBehavior.apply({}, arguments), options);
          }
      };
      $('#a_telefone').mask(SPMaskBehavior, spOptions);
    }

    // collect form values from admin edit form
    function readAdminFormValues() {
      return {
        nome: $('#a_nome').val() || null,
        cpf: $('#a_cpf').val() || null,
        dataNascimento: $('#a_dataNascimento').val() || null,
        nomeMae: $('#a_nomeMae').val() || null,
        municipioNascimento: $('#a_municipioNascimento').val() || null,
        ufNascimento: $('#a_ufNascimento').val() || null,
        identidade: $('#a_identidade').val() || null,
        ufEmissorId: $('#a_ufEmissorId').val() || null,
        orgaoEmissor: $('#a_orgaoEmissor').val() || null,
        dataEmissao: $('#a_dataEmissao').val() || null,

        rua: $('#a_rua').val() || null,
        numero: $('#a_numero').val() || null,
        complemento: $('#a_complemento').val() || null,
        bairro: $('#a_bairro').val() || null,
        cep: $('#a_cep').val() || null,
        municipioResidencial: $('#a_municipioResidencial').val() || null,
        telefone: $('#a_telefone').val() || null,
        email: $('#a_email').val() || null,

        estabelecimento: $('#a_estabelecimento').val() || null,
        dataInicio: $('#a_dataInicio').val() || null,
        cargaHorariaSemanal: $('#a_cargaHoraria').val() || null,
        escolaridade: $('#a_escolaridade').val() || null,
        funcaoEspecialidadeCBO: $('#a_funcao').val() || null,
        registroConselho: $('#a_registroConselho').val() || null,
        ufConselho: $('#a_ufConselho').val() || null,
        empresaVinculo: $('#a_empresaVinculo').val() || null,
        CNPJ: $('#a_CNPJ').val() || null,

        atendeSus: $('input[name="a_atendeSus"]:checked').val() || null,
        vinculoEstabelecimento: $('input[name="a_vinculoEstabelecimento"]:checked').val() || null
      };
    }

    // save helpers
    function saveAdminEditsWithStatus(status) {
      if (!editingDocId) return showAdminEditMessage('Documento inválido.', 'error');

      // basic validation: vinculoEstabelecimento required
      const vals = readAdminFormValues();
      if (!vals.vinculoEstabelecimento) {
        return showAdminEditMessage('Por favor, selecione um vínculo com o estabelecimento.', 'error');
      }

      // prepare update object
      const updated = Object.assign({}, vals);
      updated.status = status;
      updated.lastEditedAt = firebase.firestore.FieldValue.serverTimestamp();
      updated.editedByAdmin = true;

      // keep dataCadastro intact (we're updating other fields)
      collection.doc(editingDocId).update(updated).then(() => {
        showAdminEditMessage('Atualizado com sucesso.', 'success');
        // switch back to dashboard after short delay
        setTimeout(() => {
          editingDocId = null;
          showView('dashboard');
        }, 600);
      }).catch(err => {
        console.error('Erro ao atualizar doc:', err);
        showAdminEditMessage('Erro ao atualizar: ' + err.message, 'error');
      });
    }

    saveAsEditedBtn.addEventListener('click', () => {
      saveAdminEditsWithStatus('editados');
    });
    saveAsSentBtn.addEventListener('click', () => {
      saveAdminEditsWithStatus('enviados');
    });

    // initial render of dashboard
    showView('dashboard');

  }); // whenCollectionReady end

})(); // IIFE end
