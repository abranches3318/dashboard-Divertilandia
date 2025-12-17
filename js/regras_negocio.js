// =====================================================


if (!snap.exists) {
return {
ok: false,
problems: [{ item: itemId, reason: "ITEM_NAO_EXISTE" }]
};
}


const itemData = snap.data();
const quantidadeTotal = Number(itemData.quantidade || 0);


if (quantidadeTotal <= 0) {
return {
ok: false,
problems: [{ item: itemData.nome || itemId, reason: "SEM_ESTOQUE" }]
};
}


const reservas = mapaReservas[itemId] || [];


// Se não há reservas, ok
if (reservas.length === 0) continue;


// Contar conflitos simultâneos
for (const r of reservas) {
let simultaneos = 1; // inclui o novo


for (const r2 of reservas) {
if (r === r2) continue;
if (intervalosConflitam(r.ini, r.fim, r2.ini, r2.fim)) {
simultaneos++;
}
}


if (simultaneos > quantidadeTotal) {
return {
ok: false,
problems: [
{
item: itemData.nome || itemId,
reason: "ESTOQUE_INSUFICIENTE",
quantidade: quantidadeTotal
}
]
};
}
}
}


return { ok: true };
} catch (err) {
console.error("checkConflitoPorEstoqueAsync:", err);
return { ok: false, error: true };
}
};


// -----------------------------------------------------
// Duplicidade (mesmo endereço + data + horário)
// -----------------------------------------------------


regrasNegocio.checarDuplicidade = function (existingBookings, formData) {
if (!Array.isArray(existingBookings)) return false;


const ini = parseHora(formData.horario);
if (ini === null) return false;


return existingBookings.some(ag => {
if (formData.id && ag.id === formData.id) return false;


if (ag.data !== formData.data) return false;
if (!ag.endereco || !formData.endereco) return false;


const e1 = ag.endereco;
const e2 = formData.endereco;


const mesmoEndereco =
String(e1.rua).trim().toLowerCase() ===
String(e2.rua).trim().toLowerCase() &&
String(e1.numero) === String(e2.numero) &&
String(e1.bairro).trim().toLowerCase() ===
String(e2.bairro).trim().toLowerCase();


if (!mesmoEndereco) return false;


const iniAg = parseHora(ag.horario);
if (iniAg === null) return false;


return ini === iniAg;
});
};


// -----------------------------------------------------
// Exporta no window
// -----------------------------------------------------


window.regrasNegocio = regrasNegocio;
})();
