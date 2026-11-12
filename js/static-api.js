// Versão publicada sem servidor: imita a API do server.js dentro do navegador.
// O conteúdo inicial vem de js/data.js (window.HUB_STATIC); edições, cliques e leads
// ficam no localStorage deste navegador. HUB_RESET() volta ao estado original.
(function (w) {
  var S = w.HUB_STATIC; if (!S) return;
  var SH = w.HUB_SHARED, K = "hubdemo:" + S.slug + ":";
  var copia = function (v) { return JSON.parse(JSON.stringify(v)); };
  var ler = function (k, fb) { try { var v = localStorage.getItem(K + k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
  var gravar = function (k, v) { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) {} };
  var cliente = function () { return ler("cliente", null) || copia(S.cliente); };
  var base = null;
  var eventos = function () { if (!base) base = SH.gerarEventosFicticios([S.cliente]); return base.concat(ler("eventos", [])); };
  var leads = function () { return S.leads.concat(ler("leads", [])); };
  var ok = function (v) { return new Promise(function (r) { setTimeout(function () { r(copia(v)); }, 60); }); };
  var erro = function (m) { return Promise.reject(new Error(m)); };
  var addEvento = function (e) { var l = ler("eventos", []); l.push(e); gravar("eventos", l.slice(-3000)); };

  w.HUB_LOCAL_API = function (url, opts) {
    opts = opts || {};
    var m = opts.method || "GET", u = new URL(url, location.href), p = u.pathname.split("/").filter(Boolean);
    var i = p.indexOf("api"), rec = p[i + 1], id = p[i + 2] && decodeURIComponent(p[i + 2]), b = opts.body || {};
    if (rec === "clientes" && !id && m === "GET") { var c = cliente(); return ok([{ slug: c.slug, nome: c.nome, titulo: c.titulo, cor: c.cor, tema: c.tema, iniciais: c.iniciais, modoLancamento: !!c.modoLancamento, blocos: c.blocos.length }]); }
    if (rec === "clientes" && !id && m === "POST") return erro("Na demonstração não dá para criar outras páginas.");
    if (rec === "clientes" && id) {
      if (id !== S.slug) return erro("Cliente não encontrado.");
      if (m === "GET") return ok(cliente());
      if (m === "PUT") { var e = SH.validarCliente(b, id); if (e) return erro(e); b.atualizadoEm = new Date().toISOString(); gravar("cliente", b); return ok(b); }
    }
    if (rec === "track" && m === "POST") {
      var ev = { t: new Date().toISOString(), slug: S.slug, tipo: b.tipo, alvo: String(b.alvo || "hub").slice(0, 40) };
      if (b.origem) ev.origem = String(b.origem).slice(0, 40);
      if (b.tipo === "venda") ev.valor = Math.max(0, +b.valor || 0);
      addEvento(ev); return ok({ ok: true });
    }
    if (rec === "metricas" && id) { var d = +u.searchParams.get("dias"); return ok(SH.calcularMetricas(eventos(), leads(), S.slug, [7, 14, 30].indexOf(d) >= 0 ? d : 14)); }
    if (rec === "leads" && m === "POST") {
      var r = SH.validarLead({ slug: S.slug, nome: b.nome, whatsapp: b.whatsapp, interesse: b.interesse });
      if (r.erro) return erro(r.erro);
      var ls = ler("leads", []); ls.push(r.lead); gravar("leads", ls);
      addEvento({ t: r.lead.t, slug: S.slug, tipo: "lead", alvo: r.lead.interesse || "hub" });
      return ok({ ok: true });
    }
    if (rec === "leads" && id) return ok(leads().slice().reverse());
    return erro("Rota não encontrada.");
  };
  w.HUB_RESET = function () { ["cliente", "eventos", "leads"].forEach(function (k) { try { localStorage.removeItem(K + k); } catch (e) {} }); };
})(window);
