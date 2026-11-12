// Regras usadas tanto pelo servidor (Node) quanto pela versão estática (navegador):
// métricas fictícias, cálculo de métricas e validação do conteúdo do cliente.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HUB_SHARED = factory();
})(typeof self !== "undefined" ? self : this, function () {
  var DIA = 864e5;

  // gerador determinístico, para a demo sair sempre parecida
  function gerarEventosFicticios(clientes, agora) {
    var s = 42; var rnd = function () { return (s = (s * 16807) % 2147483647) / 2147483647; };
    var out = []; agora = agora || Date.now();
    clientes.forEach(function (c) {
      var alvos = (c.blocos || []).filter(function (b) { return b.estado !== "oculto"; }).map(function (b) { return b.id; });
      var base = c.slug === "diego-lima" ? 70 : 28;
      for (var d = 29; d >= 0; d--) {
        var fimDeSemana = new Date(agora - d * DIA).getDay() % 6 === 0;
        var visitas = Math.round(base * (0.7 + rnd() * 0.6) * (fimDeSemana ? 0.7 : 1) * (1 + (29 - d) * 0.012));
        for (var i = 0; i < visitas; i++) {
          var t = new Date(agora - d * DIA - Math.floor(rnd() * DIA * 0.95)).toISOString();
          out.push({ t: t, slug: c.slug, tipo: "view", alvo: "hub" });
          if (rnd() < 0.62) {
            var alvo = alvos[Math.floor(Math.pow(rnd(), 1.4) * alvos.length)] || "hub";
            out.push({ t: t, slug: c.slug, tipo: "click", alvo: alvo });
            out.push({ t: t, slug: c.slug, tipo: "view", alvo: alvo });
            if (rnd() < 0.16) out.push({ t: t, slug: c.slug, tipo: "whatsapp", alvo: alvo, origem: alvo });
            var prod = (c.blocos || []).filter(function (b) { return b.tipo === "produto" && b.id === alvo && b.estado === "ativo"; })[0];
            if (prod && rnd() < 0.05) out.push({ t: t, slug: c.slug, tipo: "venda", alvo: alvo, valor: prod.precoPor });
          } else if (rnd() < 0.08) out.push({ t: t, slug: c.slug, tipo: "whatsapp", alvo: "hub", origem: "hub" });
        }
      }
    });
    return out.sort(function (a, b) { return a.t < b.t ? -1 : 1; });
  }

  function chave(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  function calcularMetricas(eventos, leads, slug, dias) {
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var inicio = hoje.getTime() - (dias - 1) * DIA;
    var ev = eventos.filter(function (e) { return e.slug === slug && Date.parse(e.t) >= inicio; });
    var porDia = [], idx = {};
    for (var i = 0; i < dias; i++) { var k = chave(new Date(inicio + i * DIA + 36e5 * 12)); idx[k] = porDia.length; porDia.push({ d: k, visitas: 0, cliques: 0 }); }
    var conta = function (arr, k) { var m = {}; arr.forEach(function (e) { m[e[k]] = (m[e[k]] || 0) + 1; }); return Object.keys(m).map(function (a) { return { alvo: a, n: m[a] }; }).sort(function (a, b) { return b.n - a.n; }); };
    var tot = { visitas: 0, cliques: 0, whatsapp: 0, leads: 0, vendas: 0, receita: 0 };
    ev.forEach(function (e) {
      var row = porDia[idx[chave(new Date(e.t))]];
      if (e.tipo === "view" && e.alvo === "hub") { tot.visitas++; if (row) row.visitas++; }
      if (e.tipo === "click") { tot.cliques++; if (row) row.cliques++; }
      if (e.tipo === "whatsapp") tot.whatsapp++;
      if (e.tipo === "venda") { tot.vendas++; tot.receita += +e.valor || 0; }
    });
    tot.leads = leads.filter(function (l) { return l.slug === slug && Date.parse(l.t) >= inicio; }).length;
    return {
      dias: dias, totais: tot, porDia: porDia,
      cliquesPorBloco: conta(ev.filter(function (e) { return e.tipo === "click"; }), "alvo"),
      whatsPorOrigem: conta(ev.filter(function (e) { return e.tipo === "whatsapp"; }), "origem"),
      taxaClique: tot.visitas ? tot.cliques / tot.visitas : 0,
    };
  }

  function validarCliente(c, slug) {
    if (!c || typeof c !== "object") return "Conteúdo inválido.";
    if (c.slug !== slug) return "O slug não pode ser alterado por aqui.";
    if (!c.nome || typeof c.nome !== "string") return "Informe o nome.";
    if (!Array.isArray(c.blocos)) return "A lista de blocos é obrigatória.";
    if (c.whatsapp && !/^\d{12,13}$/.test(String(c.whatsapp))) return "WhatsApp deve ter só números com DDI e DDD (ex.: 5561900000000).";
    var ids = {};
    for (var i = 0; i < c.blocos.length; i++) {
      var b = c.blocos[i];
      if (!b.id || !b.tipo) return "Todo bloco precisa de id e tipo.";
      if (ids[b.id]) return "Há blocos com o mesmo id: " + b.id;
      ids[b.id] = 1;
      if (["ativo", "embreve", "oculto"].indexOf(b.estado) < 0) return "Estado inválido no bloco " + b.id;
    }
    return null;
  }

  function validarLead(b) {
    var nome = String(b.nome || "").trim().slice(0, 60), whats = String(b.whatsapp || "").replace(/\D/g, "");
    if (nome.length < 2) return { erro: "Digite seu nome." };
    if (whats.length < 10 || whats.length > 13) return { erro: "Digite um WhatsApp com DDD." };
    return { lead: { t: new Date().toISOString(), slug: b.slug, nome: nome, whatsapp: whats, interesse: String(b.interesse || "").slice(0, 40) } };
  }

  return { gerarEventosFicticios: gerarEventosFicticios, calcularMetricas: calcularMetricas, validarCliente: validarCliente, validarLead: validarLead };
});
