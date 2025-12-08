// js/agendamentos.js
// Gestão de agendamentos (seção dentro do dashboard)

// Usa window.db se existente
const db = window.db || (firebase && firebase.firestore && firebase.firestore());

document.addEventListener("DOMContentLoaded", () => {
  if (!db) {
    console.error("agendamentos.js: Firestore (db) não encontrado.");
    return;
  }

  // seletores — checar existência
  const btnNovo = document.getElementById("btnNovoAgendamento");
  const btnFiltrar = document.getElementById("btnFiltrarAgendamentos");
  const tbody = document.getElementById("listaAgendamentos");
  const filtroDataEl = document.getElementById("filtroData");
  const filtroClienteEl = document.getElementById("filtroCliente");
  const filtroTelefoneEl = document.getElementById("filtroTelefone");
  const filtroStatusEl = document.getElementById("filtroStatus");

  // estado
  window.agendamentosState = window.agendamentosState || { lista: [] };

  // vincular eventos com checagem
  if (btnNovo) btnNovo.addEventListener("click", abrirModalNovoAgendamento);
  if (btnFiltrar) btnFiltrar.addEventListener("click", () => carregarAgendamentos());

  // init: carregar lista
  carregarAgendamentos();

  // ==========================
  // carregarAgendamentos
  // ==========================
  async function carregarAgendamentos(filtroDataDireta = null) {
    if (!tbody) return;
    tbody.innerHTML = "";

    try {
      const snap = await db.collection("agendamentos")
        .orderBy("data")
        .orderBy("horario")
        .get();

      const lista = [];
      snap.forEach(doc => {
        lista.push({ id: doc.id, ...doc.data() });
      });

      window.agendamentosState.lista = lista;

      // aplicar filtros
      const dataFiltro = filtroDataDireta || (filtroDataEl ? filtroDataEl.value : "");
      const clienteFiltro = filtroClienteEl ? filtroClienteEl.value.trim().toLowerCase() : "";
      const telefoneFiltro = filtroTelefoneEl ? filtroTelefoneEl.value.trim() : "";
      const statusFiltro = filtroStatusEl ? filtroStatusEl.value : "";

      const filtrada = lista.filter(a => {
        let ok = true;
        if (dataFiltro && a.data !== dataFiltro) ok = false;
        if (statusFiltro && a.status !== statusFiltro) ok = false;
        if (clienteFiltro && !(a.cliente || "").toLowerCase().includes(clienteFiltro)) ok = false;
        if (telefoneFiltro && (a.telefone || "") !== telefoneFiltro) ok = false;
        return ok;
      });

      // render
      if (!filtrada.length) {
        tbody.insertAdjacentHTML("beforeend", `<tr><td colspan="6">Nenhum agendamento encontrado.</td></tr>`);
        return;
      }

      filtrada.forEach(a => {
        const linha = `
          <tr>
            <td>${a.data || "-" } ${a.horario || ""}</td>
            <td>${a.cliente || "-"}</td>
            <td>${a.telefone || "-"}</td>
            <td class="status-${a.status || 'pendente'}">${a.status || 'pendente'}</td>
            <td>R$ ${Number(a.valor_final || a.preco || 0).toFixed(2)}</td>
            <td>
              <button class="btn" onclick="editarAgendamento('${a.id}')">Editar</button>
              <button class="btn" onclick="cancelarAgendamento('${a.id}')">Cancelar</button>
              <button class="btn" onclick="concluirAgendamento('${a.id}')">Concluir</button>
            </td>
          </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", linha);
      });

    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
      Swal.fire("Erro", "Não foi possível carregar agendamentos.", "error");
    }
  }

  // Expor função global chamada pelo calendar.js
  window.abrirAgendamentosNaData = function (dateISO) {
    if (filtroDataEl) filtroDataEl.value = dateISO;
    // garantir visibilidade da seção via nav (dashboard.js)
    if (typeof nav === "function") nav("agendamentos");
    carregarAgendamentos(dateISO);
  };

  // ==========================
  // Novo Agendamento (Swal modal)
  // ==========================
  async function abrirModalNovoAgendamento() {
    const { value: formValues } = await Swal.fire({
      title: 'Novo Agendamento',
      html:
        `<input id="sw_ag_data" type="date" class="swal2-input" placeholder="Data">
         <input id="sw_ag_horario" type="time" class="swal2-input" placeholder="Horário">
         <input id="sw_ag_cliente" class="swal2-input" placeholder="Cliente">
         <input id="sw_ag_telefone" class="swal2-input" placeholder="Telefone">
         <textarea id="sw_ag_itens" class="swal2-textarea" placeholder='[{"id":"pula-pula","qtd":1}]'></textarea>
         <input id="sw_ag_valor" type="number" class="swal2-input" placeholder="Valor final">`,
      focusConfirm: false,
      preConfirm: () => {
        return {
          data: document.getElementById('sw_ag_data')?.value,
          horario: document.getElementById('sw_ag_horario')?.value,
          cliente: document.getElementById('sw_ag_cliente')?.value,
          telefone: document.getElementById('sw_ag_telefone')?.value,
          itensRaw: document.getElementById('sw_ag_itens')?.value,
          valor: document.getElementById('sw_ag_valor')?.value
        };
      },
      showCancelButton: true
    });

    if (!formValues) return;

    // validação e salvamento
    try {
      if (!formValues.data || !formValues.horario || !formValues.cliente) {
        Swal.fire("Atenção", "Preencha data, horário e cliente.", "warning");
        return;
      }
      let itens = [];
      try {
        itens = formValues.itensRaw ? JSON.parse(formValues.itensRaw) : [];
      } catch (e) {
        Swal.fire("Atenção", "Itens devem estar em JSON válido.", "warning");
        return;
      }

      await db.collection("agendamentos").add({
        data: formValues.data,
        horario: formValues.horario,
        cliente: formValues.cliente,
        telefone: formValues.telefone || "",
        itens,
        valor_final: Number(formValues.valor || 0),
        receita_recebida: Number(formValues.valor || 0),
        status: "pendente",
        criado_em: new Date().toISOString()
      });

      Swal.fire("OK", "Agendamento criado com sucesso.", "success");
      carregarAgendamentos();
      if (typeof window.recarregarCalendario === "function") window.recarregarCalendario();

    } catch (err) {
      console.error("Erro ao criar agendamento:", err);
      Swal.fire("Erro", "Falha ao criar agendamento.", "error");
    }
  }

  // ==========================
  // Editar / Cancelar / Concluir (expõe funções globais)
  // ==========================
  window.editarAgendamento = async function (id) {
    try {
      const doc = await db.collection("agendamentos").doc(id).get();
      if (!doc.exists) { Swal.fire("Erro", "Agendamento não encontrado.", "error"); return; }
      const ag = doc.data();

      const { value: values } = await Swal.fire({
        title: 'Editar Agendamento',
        html:
          `<input id="ed_data" type="date" class="swal2-input" value="${ag.data || ""}">
           <input id="ed_horario" type="time" class="swal2-input" value="${ag.horario || ""}">
           <input id="ed_cliente" class="swal2-input" value="${ag.cliente || ""}">
           <input id="ed_telefone" class="swal2-input" value="${ag.telefone || ""}">
           <textarea id="ed_itens" class="swal2-textarea">${JSON.stringify(ag.itens || [])}</textarea>
           <input id="ed_valor" type="number" class="swal2-input" value="${ag.valor_final || 0}">`,
        focusConfirm: false,
        preConfirm: () => ({
          data: document.getElementById('ed_data')?.value,
          horario: document.getElementById('ed_horario')?.value,
          cliente: document.getElementById('ed_cliente')?.value,
          telefone: document.getElementById('ed_telefone')?.value,
          itensRaw: document.getElementById('ed_itens')?.value,
          valor: document.getElementById('ed_valor')?.value
        }),
        showCancelButton: true
      });

      if (!values) return;
      let itens = [];
      try { itens = values.itensRaw ? JSON.parse(values.itensRaw) : []; } catch { Swal.fire("Erro", "JSON de itens inválido.", "error"); return; }

      await db.collection("agendamentos").doc(id).update({
        data: values.data,
        horario: values.horario,
        cliente: values.cliente,
        telefone: values.telefone || "",
        itens,
        valor_final: Number(values.valor || 0),
        receita_recebida: Number(values.valor || 0)
      });

      Swal.fire("OK", "Agendamento atualizado.", "success");
      carregarAgendamentos();
      if (typeof window.recarregarCalendario === "function") window.recarregarCalendario();

    } catch (err) {
      console.error("editarAgendamento:", err);
      Swal.fire("Erro", "Falha ao atualizar agendamento.", "error");
    }
  };

  window.cancelarAgendamento = function (id) {
    Swal.fire({
      title: "Cancelar agendamento?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim"
    }).then(async res => {
      if (res.isConfirmed) {
        try {
          await db.collection("agendamentos").doc(id).update({ status: "cancelado" });
          Swal.fire("OK", "Agendamento cancelado.", "success");
          carregarAgendamentos();
          if (typeof window.recarregarCalendario === "function") window.recarregarCalendario();
        } catch (err) {
          console.error(err);
          Swal.fire("Erro", "Falha ao cancelar.", "error");
        }
      }
    });
  };

  window.concluirAgendamento = function (id) {
    Swal.fire({
      title: "Marcar como concluído?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim"
    }).then(async r => {
      if (r.isConfirmed) {
        try {
          await db.collection("agendamentos").doc(id).update({ status: "concluido" });
          Swal.fire("OK", "Agendamento concluído.", "success");
          carregarAgendamentos();
          if (typeof window.recarregarCalendario === "function") window.recarregarCalendario();
        } catch (err) {
          console.error(err);
          Swal.fire("Erro", "Falha ao concluir.", "error");
        }
      }
    });
  };
});
