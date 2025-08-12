const API = 'http://localhost:3000';

// Função para formatar telefone
function formatarTelefone(telefone) {
    const numero = telefone.replace(/\D/g, '');
    if (numero.length === 11) {
        return `(${numero.slice(0,2)}) ${numero.slice(2,7)}-${numero.slice(7)}`;
    } else if (numero.length === 10) {
        return `(${numero.slice(0,2)}) ${numero.slice(2,6)}-${numero.slice(6)}`;
    }
    return telefone;
}

// Adicionar evento de formatação ao campo de telefone
document.getElementById('cliente_telefone').addEventListener('input', function(e) {
    let telefone = e.target.value.replace(/\D/g, '');
    if (telefone.length > 11) telefone = telefone.slice(0, 11);
    e.target.value = formatarTelefone(telefone);
});

// CLIENTES CRUD
async function criarCliente() {
    const nome = document.getElementById('cliente_nome').value;
    const email = document.getElementById('cliente_email').value;
    const telefone = document.getElementById('cliente_telefone').value;
    const mensalidade = parseFloat(document.getElementById('cliente_mensalidade').value || 0);
    const res = await fetch(`${API}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, telefone, mensalidade_valor: mensalidade })
    });
    // Limpar campos
    document.getElementById('cliente_nome').value = '';
    document.getElementById('cliente_email').value = '';
    document.getElementById('cliente_telefone').value = '';
    document.getElementById('cliente_mensalidade').value = '';
    alert('Cliente criado');
    listarClientes();
}

async function listarClientes() {
    const res = await fetch(`${API}/clientes`);
    const data = await res.json();
    const ul = document.getElementById('lista_clientes');
    ul.innerHTML = '';
    data.forEach(c => {
        ul.innerHTML += `<li>${c.id} - <b>${c.nome}</b> | ${c.email} | ${c.telefone} | Mensal: R$ ${c.mensalidade_valor} | Status: ${c.status_pagamento ? 'Em dia' : 'Inadimplente'}</li>`;
    });
}

async function atualizarCliente() {
    const id = document.getElementById('cliente_id_editar').value;
    const nome = document.getElementById('cliente_nome').value;
    const email = document.getElementById('cliente_email').value;
    const telefone = document.getElementById('cliente_telefone').value;
    const mensalidade = parseFloat(document.getElementById('cliente_mensalidade').value || 0);
    if(!id) return alert('Id do cliente para editar é necessário');
    await fetch(`${API}/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, telefone, mensalidade_valor: mensalidade })
    });
    alert('Atualizado');
    listarClientes();
}

async function deletarCliente() {
    const id = document.getElementById('cliente_id_editar').value;
    if(!id) return alert('Id do cliente para excluir é necessário');
    await fetch(`${API}/clientes/${id}`, { method: 'DELETE' });
    alert('Excluído');
    listarClientes();
}

// MENSALIDADES
async function criarMensalidade() {
    const cliente_id = document.getElementById('mensal_cliente_id').value;
    const valor = document.getElementById('mensal_valor').value;
    const vencimento = document.getElementById('mensal_vencimento').value;
    await fetch(`${API}/mensalidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id, valor, vencimento })
    });
    // Limpar campos
    document.getElementById('mensal_cliente_id').value = '';
    document.getElementById('mensal_valor').value = '';
    document.getElementById('mensal_vencimento').value = '';
    alert('Mensalidade criada');
    listarMensalidades();
}

async function listarMensalidades() {
    const res = await fetch(`${API}/mensalidades`);
    const data = await res.json();
    const ul = document.getElementById('lista_mensalidades');
    ul.innerHTML = '';
    data.forEach(m => {
        ul.innerHTML += `<li>${m.id} - Cliente ${m.cliente_id} | R$ ${m.valor} | Venc: ${m.vencimento} | Paga: ${m.paga}</li>`;
    });
}

async function gerarMensalidades() {
    const mes = document.getElementById('gerar_mes').value;
    const ano = document.getElementById('gerar_ano').value;
    if(!mes || !ano) return alert('Informe mês e ano');
    const res = await fetch(`${API}/procedures/gerar_mensalidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes: parseInt(mes), ano: parseInt(ano) })
    });
    const data = await res.json();
    alert(data.message || 'Procedure executada');
    listarMensalidades();
}

async function deletarMensalidade() {
    const id = document.getElementById('mensalidade_id_excluir').value;
    if(!id) return alert('ID da mensalidade para excluir é necessário');
    await fetch(`${API}/mensalidades/${id}`, { method: 'DELETE' });
    document.getElementById('mensalidade_id_excluir').value = '';
    alert('Mensalidade excluída');
    listarMensalidades();
}

// PAGAMENTOS
async function registrarPagamento() {
    const mensalidade_id = document.getElementById('pag_mensalidade_id').value || null;
    const cliente_id = document.getElementById('pag_cliente_id').value || null;
    const valor = parseFloat(document.getElementById('pag_valor').value);
    await fetch(`${API}/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensalidade_id, cliente_id, valor })
    });
    // Limpar campos
    document.getElementById('pag_mensalidade_id').value = '';
    document.getElementById('pag_cliente_id').value = '';
    document.getElementById('pag_valor').value = '';
    alert('Pagamento registrado');
    listarPagamentos();
    listarMensalidades();
    listarClientes();
}

async function listarPagamentos() {
    const res = await fetch(`${API}/pagamentos`);
    const data = await res.json();
    const ul = document.getElementById('lista_pagamentos');
    ul.innerHTML = '';
    data.forEach(p => {
        ul.innerHTML += `<li>${p.id} - Cliente ${p.cliente_id} | Mensalidade ${p.mensalidade_id || '-'} | R$ ${p.valor} | Data: ${p.data_pagamento}</li>`;
    });
}

// RELATÓRIOS / INADIMPLENTES
async function listarInadimplentes() {
    const res = await fetch(`${API}/inadimplentes`);
    const data = await res.json();
    const ul = document.getElementById('lista_inadimplentes');
    ul.innerHTML = '';
    data.forEach(c => {
        ul.innerHTML += `<li>${c.id} - ${c.nome} | Mensal R$ ${c.mensalidade_valor}</li>`;
    });
}

async function relatorioTotais() {
    const res = await fetch(`${API}/relatorios/total_por_cliente`);
    const text = await res.text();
    document.getElementById('relatorio_totais').innerText = text;
}

async function mediaPagamentos() {
    const res = await fetch(`${API}/functions/media_pagamentos`);
    const data = await res.json();
    document.getElementById('media_pagamentos').innerText = 'Média: R$ ' + (data.media || 0);
}

// inicia
listarClientes();
listarMensalidades();
listarPagamentos();
