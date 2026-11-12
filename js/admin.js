// Painel: escolher cliente, ver métricas, editar perfil/tema/blocos, ver leads e editar o JSON.
(function () {
  var H = HUB, esc = H.esc, icon = H.icon, ic = H.ic;
  var fx = H.BgFx(document.getElementById("bgfx"));
  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search);
  var S = { lista: [], c: null, orig: "", tab: qs.get("tab") || "metricas", dias: 14, met: null };
  var ST = window.HUB_STATIC; // versão publicada: um cliente só, dados no navegador
  var urlPagina = function (slug, pagina) {
    if (ST) return ST.base + (pagina ? encodeURIComponent(pagina) + "/" : "");
    return "/p/" + encodeURIComponent(slug) + (pagina ? "/" + encodeURIComponent(pagina) : "");
  };
  var TIPOS = {
    consultoria: { label: "Consultoria", icone: "building-2", cor: "blue" },
    personal: { label: "Personal", icone: "dumbbell", cor: "purple" },
    resultados: { label: "Resultados", icone: "trending-up", cor: "green" },
    portfolio: { label: "Portfólio", icone: "briefcase", cor: "gold" },
    produto: { label: "Infoproduto", icone: "play-circle", cor: "orange" },
  };
  var CORES = ["gold", "blue", "green", "purple", "orange", "red", "gray"];
  var ESTADOS = { ativo: "Ativo", embreve: "Em breve", oculto: "Oculto" };
  var MODELOS = {
    consultoria: { titulo: "Minha consultoria", subtitulo: "Para academias e estúdios", intro: "Descreva em duas frases o que a consultoria resolve.", numeros: [],
      fases: [{ romano: "I", titulo: "Diagnóstico", desc: "Entender o momento do cliente.", cor: "blue" }, { romano: "II", titulo: "Plano", desc: "Definir prioridades e metas.", cor: "green" }, { romano: "III", titulo: "Execução", desc: "Acompanhar a implantação.", cor: "gold" }],
      entregaveis: ["Diagnóstico", "Plano de ação"], cta: { texto: "Falar sobre a consultoria", mensagem: "Olá! Vim pela sua página e quero saber da consultoria." } },
    personal: { titulo: "Personal trainer", subtitulo: "Presencial ou online", intro: "Como funciona o acompanhamento.", modalidades: ["Emagrecimento"],
      planos: [{ nome: "Mensal", preco: 500, periodo: "/mês", itens: ["3 sessões por semana"], destaque: true }], faq: [], cta: { texto: "Quero começar", mensagem: "Olá! Vim pela sua página e tenho interesse no plano {plano}." } },
    resultados: { titulo: "Resultados", subtitulo: "Antes e depois", intro: "", numeros: [], casos: [] },
    portfolio: { titulo: "O que eu faço", subtitulo: "Trajetória e formação", intro: "", servicos: [], trajetoria: [], certificacoes: [] },
    produto: { titulo: "Meu programa", subtitulo: "Infoproduto", intro: "", precoDe: 297, precoPor: 197, parcelas: 12, modulos: [{ titulo: "Módulo 1", aulas: 5 }], bonus: [], garantia: 7, linkPagamento: "" },
  };

  var dirty = function () { return !!S.c && JSON.stringify(S.c) !== S.orig; };
  function marcar() { var d = dirty(); $("dirty").classList.toggle("show", d); $("save").disabled = !d; $("discard").hidden = !d; }
  function setAcc(c) { document.documentElement.style.setProperty("--acc", "var(--" + c + ")"); fx.color(c, 0.25); }
  window.addEventListener("beforeunload", function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ""; } });
  var tituloDe = function (alvo) { if (alvo === "hub") return "Início (hub)"; var b = S.c.blocos.filter(function (x) { return x.id === alvo; })[0]; return b ? b.titulo : alvo; };
  var slugify = function (s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); };
  var iniciais = function (n) { return n.trim().split(/\s+/).map(function (p) { return p[0] || ""; }).slice(0, 2).join("").toUpperCase(); };

  // ---------- clientes ----------
  function carregarLista(sel) {
    return H.api("/api/clientes").then(function (l) {
      S.lista = l; renderLista();
      var alvo = sel || (S.c && S.c.slug) || qs.get("c") || (l[0] && l[0].slug);
      if (alvo && (!S.c || S.c.slug !== alvo)) abrir(alvo);
    });
  }
  function renderLista() {
    $("clist").innerHTML = S.lista.map(function (c) {
      return '<button class="citem" style="--c:var(--' + esc(c.cor) + ')" data-slug="' + esc(c.slug) + '" aria-current="' + (!!S.c && S.c.slug === c.slug) + '"><span class="face">' + esc(c.iniciais) + "</span><div><b>" + esc(c.nome) + "</b><span>" + esc(ST ? "Página de demonstração" : "/p/" + c.slug) + "</span></div></button>";
    }).join("");
  }
  function abrir(slug) {
    if (S.c && S.c.slug !== slug && dirty() && !confirm("Há alterações não salvas. Descartar e trocar de cliente?")) return;
    H.api("/api/clientes/" + encodeURIComponent(slug)).then(function (c) {
      S.c = c; S.orig = JSON.stringify(c); S.met = null;
      $("ctitle").textContent = c.nome; $("openpage").href = urlPagina(slug);
      setAcc(c.cor || "gold"); renderLista(); marcar(); previa(); render();
    }).catch(function () { H.toast("Cliente não encontrado", "x-circle"); });
  }
  function previa(pagina) {
    $("frame").src = urlPagina(S.c.slug, pagina) + "?preview=1&v=" + Date.now();
  }
  function salvar() {
    var btn = $("save"); btn.disabled = true;
    H.api("/api/clientes/" + encodeURIComponent(S.c.slug), { method: "PUT", body: S.c }).then(function (c) {
      S.c = c; S.orig = JSON.stringify(c); marcar();
      $("ctitle").textContent = c.nome; H.toast("Página publicada");
      carregarLista(); previa();
      if (S.tab === "avancado") render();
    }).catch(function (e) { H.toast(e.message, "alert-triangle"); marcar(); });
  }

  // ---------- abas ----------
  function render() {
    var url = ST ? location.pathname + (S.tab !== "metricas" ? "?tab=" + S.tab : "") : "/admin?c=" + encodeURIComponent(S.c.slug) + (S.tab !== "metricas" ? "&tab=" + S.tab : "");
    try { history.replaceState(null, "", url); } catch (e) {}
    document.querySelectorAll(".tabs button").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.tab === S.tab); });
    var p = $("panel");
    p.classList.remove("on");
    ({ metricas: tabMetricas, perfil: tabPerfil, blocos: tabBlocos, leads: tabLeads, avancado: tabAvancado })[S.tab]();
    H.stagger(p); void p.offsetWidth; p.classList.add("on"); H.icons();
  }

  // métricas
  function tabMetricas() {
    $("panel").innerHTML = '<div class="chart-head" data-a><div><div class="sec-t">Desempenho da página</div><div class="sec-d">Números fictícios da demonstração, somados aos cliques que você fizer na página.</div></div>' +
      '<div class="seg" role="group" aria-label="Período">' + [7, 14, 30].map(function (d) { return '<button data-dias="' + d + '" aria-pressed="' + (S.dias === d) + '">' + d + " dias</button>"; }).join("") + "</div></div>" +
      '<div id="mbody" class="panel"><div class="empty-s">Carregando…</div></div>';
    H.api("/api/metricas/" + encodeURIComponent(S.c.slug) + "?dias=" + S.dias).then(function (m) { S.met = m; desenharMetricas(m); });
  }
  function hbars(list) {
    if (!list.length) return '<div class="empty-s">' + icon("inbox") + "<p>Sem dados no período.</p></div>";
    var mx = list[0].n || 1;
    return '<div class="hbars">' + list.slice(0, 8).map(function (x, i) {
      var nome = tituloDe(x.alvo);
      return '<div class="hb" style="--i:' + i + '"><span class="l" title="' + esc(nome) + '">' + esc(nome) + '</span><span class="b"><i style="width:' + (x.n / mx * 100).toFixed(1) + '%"></i></span><b>' + H.num(x.n) + "</b></div>";
    }).join("") + "</div>";
  }
  function desenharMetricas(m) {
    var t = m.totais;
    var kpi = function (ico, cor, lab, val, sub, pre) {
      return '<div class="card kpi" data-a><div class="row">' + ic(ico, cor) + '<span class="lab">' + lab + '</span></div><div class="v" data-count="' + val + '" data-pre="' + (pre || "") + '">' + (pre || "") + H.num(val) + '</div><div class="s">' + sub + "</div></div>";
    };
    var mb = $("mbody");
    mb.innerHTML = '<div class="kpis">' +
      kpi("eye", "blue", "Visitas", t.visitas, "abriram a página") +
      kpi("mouse-pointer-click", "purple", "Cliques", t.cliques, H.num(m.taxaClique * 100, 1) + "% das visitas") +
      kpi("message-circle", "green", "WhatsApp", t.whatsapp, "conversas iniciadas") +
      kpi("bell", "gold", "Leads", t.leads, "na lista de espera") +
      kpi("shopping-bag", "orange", "Vendas", t.receita, t.vendas + (t.vendas === 1 ? " venda" : " vendas") + " no período", "R$ ") + "</div>" +
      '<div class="card chart-card" data-a><div class="chart-head"><div><div class="sec-t">Visitas por dia</div><div class="sec-d">Pessoas que abriram o hub</div></div><button class="linkbtn" id="vtab">' + icon("table") + '<span>Ver tabela</span></button></div><div class="chart" id="cdia"></div><div class="tw" id="tdia" hidden></div></div>' +
      '<div class="two"><div class="card chart-card" data-a><div><div class="sec-t">Cliques por bloco</div><div class="sec-d">O que mais chama atenção no hub</div></div>' + hbars(m.cliquesPorBloco) + "</div>" +
      '<div class="card chart-card" data-a><div><div class="sec-t">Conversas no WhatsApp</div><div class="sec-d">De qual página a pessoa chamou</div></div>' + hbars(m.whatsPorOrigem) + "</div></div>";
    H.stagger(mb); mb.classList.add("on"); H.icons(); H.countAll(mb);
    graficoDia();
    $("tdia").innerHTML = '<table class="table"><thead><tr><th>Dia</th><th style="text-align:right">Visitas</th><th style="text-align:right">Cliques</th></tr></thead><tbody>' +
      m.porDia.slice().reverse().map(function (d) { return "<tr><td>" + dataBR(d.d) + '</td><td class="n">' + d.visitas + '</td><td class="n">' + d.cliques + "</td></tr>"; }).join("") + "</tbody></table>";
  }
  var dataBR = function (k) { var p = k.split("-"); return p[2] + "/" + p[1]; };
  function graficoDia() {
    var el = $("cdia"); if (!el || !S.met) return;
    var data = S.met.porDia, W = Math.max(280, el.clientWidth), Hh = 220, pl = 34, pb = 24, pt = 8;
    var vmax = Math.max.apply(null, data.map(function (d) { return d.visitas; }).concat([1]));
    var passo = Math.pow(10, Math.floor(Math.log10(vmax))), top = Math.ceil(vmax / passo) * passo; if (top / passo < 3) { passo /= 2; top = Math.ceil(vmax / passo) * passo; }
    var n = data.length, slot = (W - pl) / n, gap = Math.max(2, slot * 0.28), bw = Math.max(2, slot - gap), ih = Hh - pb - pt;
    var y = function (v) { return pt + ih - v / top * ih; };
    var s = '<svg viewBox="0 0 ' + W + " " + Hh + '" height="' + Hh + '" role="img" aria-label="Visitas por dia nos últimos ' + n + ' dias">';
    for (var g = 0; g <= top; g += passo) s += '<line class="gl" x1="' + pl + '" x2="' + W + '" y1="' + y(g) + '" y2="' + y(g) + '"/><text class="ax" x="' + (pl - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + g + "</text>";
    var cada = Math.ceil(n / 7);
    data.forEach(function (d, i) {
      var x = pl + i * slot + gap / 2, h = Math.max(0, ih - (y(d.visitas) - pt)), yy = y(d.visitas), r = Math.min(4, bw / 2, h);
      var path = h > 0 ? "M" + x + " " + (yy + h) + " V" + (yy + r) + " Q" + x + " " + yy + " " + (x + r) + " " + yy + " H" + (x + bw - r) + " Q" + (x + bw) + " " + yy + " " + (x + bw) + " " + (yy + r) + " V" + (yy + h) + " Z" : "";
      s += '<path class="bar" data-k="' + i + '" style="--i:' + i + '" d="' + path + '"/>';
      if ((n - 1 - i) % cada === 0) s += '<text class="ax" x="' + (x + bw / 2) + '" y="' + (Hh - 6) + '" text-anchor="middle">' + dataBR(d.d) + "</text>";
      s += '<rect class="hit" data-k="' + i + '" x="' + (pl + i * slot) + '" y="' + pt + '" width="' + slot + '" height="' + ih + '"/>';
    });
    s += "</svg>";
    el.innerHTML = s + '<div class="tip" id="tip"></div>';
    var tip = $("tip");
    el.onmousemove = function (e) {
      var k = e.target.getAttribute && e.target.getAttribute("data-k");
      if (k == null) { el.onmouseleave(); return; }
      var d = data[+k], bars = el.querySelectorAll(".bar");
      el.classList.add("hovering"); bars.forEach(function (b) { b.classList.toggle("hot", b.dataset.k === k); });
      tip.innerHTML = "<b>" + H.num(d.visitas) + " visitas</b><span>" + dataBR(d.d) + " · " + H.num(d.cliques) + " cliques</span>";
      var box = el.getBoundingClientRect(), sx = box.width / W;
      tip.style.left = Math.min(box.width - 70, Math.max(70, (pl + (+k + 0.5) * slot) * sx)) + "px"; tip.style.top = (y(d.visitas) * sx) + "px";
      tip.classList.add("show");
    };
    el.onmouseleave = function () { el.classList.remove("hovering"); tip.classList.remove("show"); };
  }
  window.addEventListener("resize", function () { if (S.tab === "metricas") graficoDia(); });

  // perfil e tema
  function campo(k, label, opts) {
    opts = opts || {};
    var v = S.c[k] == null ? "" : S.c[k], id = "f-" + k;
    var inp = opts.area ? '<textarea class="input" id="' + id + '" data-k="' + k + '" rows="3">' + esc(v) + "</textarea>" : '<input class="input" id="' + id + '" data-k="' + k + '" value="' + esc(v) + '"' + (opts.mode ? ' inputmode="' + opts.mode + '"' : "") + ">";
    return '<div class="field' + (opts.full ? " full" : "") + '"><label for="' + id + '">' + label + "</label>" + inp + (opts.help ? '<span class="note">' + opts.help + "</span>" : "") + "</div>";
  }
  function tabPerfil() {
    var c = S.c, temProd = c.blocos.some(function (b) { return b.tipo === "produto" && b.estado === "ativo"; });
    $("panel").innerHTML =
      '<div class="card" data-a><div class="sec-t">Perfil</div><div class="sec-d" style="margin-bottom:14px">O topo da página: quem é, o que faz e como falar com a pessoa.</div><div class="form-g">' +
      campo("nome", "Nome") + campo("titulo", "O que faz") + campo("cidade", "Cidade") + campo("registro", "Registro (CREF)") +
      campo("whatsapp", "WhatsApp", { mode: "numeric", help: "Só números, com 55 e DDD." }) + campo("instagram", "Instagram (sem @)") + campo("bio", "Frase de apresentação", { area: true, full: true }) + "</div></div>" +
      '<div class="card" data-a><div class="sec-t">Números do topo</div><div class="sec-d" style="margin-bottom:14px">Aparecem com animação de contagem logo abaixo da apresentação.</div><div class="panel" style="gap:8px">' +
      (c.stats || []).map(function (s, i) {
        return '<div class="statrow"><input class="input" type="number" step="any" aria-label="Valor" data-st="' + i + '" data-sk="valor" value="' + esc(s.valor) + '"><input class="input" aria-label="Antes do número" placeholder="antes" data-st="' + i + '" data-sk="pre" value="' + esc(s.pre || "") + '"><input class="input" aria-label="Depois do número" placeholder="depois" data-st="' + i + '" data-sk="suf" value="' + esc(s.suf || "") + '"><input class="input" aria-label="Legenda" data-st="' + i + '" data-sk="label" value="' + esc(s.label) + '"></div>';
      }).join("") + "</div></div>" +
      '<div class="card" data-a><div class="sec-t">Visual</div><div class="sec-d" style="margin-bottom:14px">Cor de destaque da marca e tom do fundo.</div>' +
      '<span class="lab">Cor da marca</span><div class="colors" style="margin:10px 0 18px">' + CORES.map(function (k) { return '<button style="--c:var(--' + k + ')" data-cor="' + k + '" aria-label="Cor ' + k + '" aria-pressed="' + (c.cor === k) + '"></button>'; }).join("") + "</div>" +
      '<span class="lab">Tema</span><div class="themes" style="margin-top:10px"><button data-tema="noite" aria-pressed="' + (c.tema !== "grafite") + '"><i style="background:#0C1118"></i>Noite</button><button data-tema="grafite" aria-pressed="' + (c.tema === "grafite") + '"><i style="background:#0A0B0C"></i>Grafite</button></div></div>' +
      '<div class="card" data-a><button class="switch" role="switch" id="lanc" aria-checked="' + !!c.modoLancamento + '"><span class="k"></span><span><b>Modo lançamento</b><span>O link da bio abre direto na página do infoproduto. O resto do conteúdo continua a um toque.</span></span></button>' +
      (temProd ? "" : '<p class="note" style="margin-top:10px;color:var(--gold)">Nenhum infoproduto está ativo, então o modo lançamento não muda nada por enquanto. Ative um na aba Blocos.</p>') + "</div>";
  }

  // blocos
  function tabBlocos() {
    var bl = S.c.blocos;
    $("panel").innerHTML = '<div data-a><div class="sec-t">Blocos da página</div><div class="sec-d">A ordem aqui é a ordem dos botões no hub. <b>Em breve</b> mostra o botão com lista de espera; <b>Oculto</b> tira da página.</div></div>' +
      '<div class="blist">' + bl.map(function (b, i) {
        var T = TIPOS[b.tipo] || { label: b.tipo, cor: "gray" };
        return '<div class="card brow ' + esc(b.estado) + '" data-i="' + i + '" data-a><div class="order"><button data-mv="-1" aria-label="Subir"' + (i === 0 ? " disabled" : "") + ">" + icon("chevron-up") + '</button><button data-mv="1" aria-label="Descer"' + (i === bl.length - 1 ? " disabled" : "") + ">" + icon("chevron-down") + "</button></div>" +
          '<div class="fields"><input class="input" aria-label="Título" placeholder="Título" data-bk="titulo" value="' + esc(b.titulo) + '"><input class="input" aria-label="Subtítulo" placeholder="Subtítulo" data-bk="subtitulo" value="' + esc(b.subtitulo || "") + '">' +
          (b.tipo === "produto" ? '<div class="field"><label>Preço cheio (R$)</label><input class="input" type="number" min="0" data-bk="precoDe" value="' + esc(b.precoDe || 0) + '"></div><div class="field"><label>Preço de venda (R$)</label><input class="input" type="number" min="0" data-bk="precoPor" value="' + esc(b.precoPor || 0) + '"></div>' : "") +
          '<div class="meta"><span class="pill c-' + T.cor + '">' + icon(T.icone || "circle") + esc(T.label) + '</span><span class="note">id: ' + esc(b.id) + "</span></div></div>" +
          '<div class="right"><div class="state" role="group" aria-label="Estado">' + Object.keys(ESTADOS).map(function (v) { return '<button data-v="' + v + '" aria-pressed="' + (b.estado === v) + '">' + ESTADOS[v] + "</button>"; }).join("") + "</div>" +
          '<div class="row" style="gap:6px"><button class="iconbtn" data-ver aria-label="Ver na prévia" title="Ver na prévia">' + icon("eye") + '</button><button class="iconbtn" data-del aria-label="Remover bloco" title="Remover">' + icon("trash-2") + "</button></div></div></div>";
      }).join("") + "</div>" +
      '<div class="card" data-a><span class="lab">Adicionar bloco a partir do modelo</span><div class="addrow" style="margin-top:12px">' + Object.keys(TIPOS).map(function (t) { return '<button class="btn sm ghost" data-add="' + t + '">' + icon(TIPOS[t].icone) + TIPOS[t].label + "</button>"; }).join("") + "</div></div>";
  }

  // leads
  function tabLeads() {
    $("panel").innerHTML = '<div class="chart-head" data-a><div><div class="sec-t">Lista de espera</div><div class="sec-d">Quem pediu aviso nos blocos marcados como “Em breve”.</div></div><button class="btn sm ghost" id="csv" disabled>' + icon("download") + 'Exportar CSV</button></div><div class="card" data-a id="lbody"><div class="empty-s">Carregando…</div></div>';
    H.api("/api/leads/" + encodeURIComponent(S.c.slug)).then(function (ls) {
      var lb = $("lbody");
      if (!ls.length) { lb.innerHTML = '<div class="empty-s">' + icon("inbox") + "<p>Ninguém na lista ainda. Marque um bloco como “Em breve” e teste pela página.</p></div>"; H.icons(); return; }
      lb.innerHTML = '<div class="tw"><table class="table"><thead><tr><th>Nome</th><th>WhatsApp</th><th>Interesse</th><th>Data</th></tr></thead><tbody>' +
        ls.map(function (l) { return "<tr><td>" + esc(l.nome) + "</td><td>" + esc(l.whatsapp) + "</td><td>" + esc(tituloDe(l.interesse)) + "</td><td>" + new Date(l.t).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) + "</td></tr>"; }).join("") + "</tbody></table></div>";
      var csv = $("csv"); csv.disabled = false;
      csv.onclick = function () {
        var linhas = [["nome", "whatsapp", "interesse", "data"]].concat(ls.map(function (l) { return [l.nome, l.whatsapp, tituloDe(l.interesse), l.t]; }));
        var txt = linhas.map(function (r) { return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(";"); }).join("\n");
        var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + txt], { type: "text/csv" })); a.download = "leads-" + S.c.slug + ".csv"; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      };
    });
  }

  // avançado
  function tabAvancado() {
    $("panel").innerHTML = '<div data-a><div class="sec-t">Conteúdo completo (JSON)</div><div class="sec-d">Tudo o que a página mostra vem daqui: casos de alunos, planos, módulos, FAQ. É o que a gente preenche no fluxo “feito para você”.</div></div>' +
      '<textarea class="input json" id="json" spellcheck="false" data-a>' + esc(JSON.stringify(S.c, null, 2)) + '</textarea><p class="err" id="jerr" aria-live="polite"></p>' +
      '<div class="row" data-a><button class="btn sm" id="japply">' + icon("check") + "Aplicar JSON</button><span class=\"note\">Depois de aplicar, use “Salvar e publicar”.</span></div>";
    $("japply").onclick = function () {
      try {
        var v = JSON.parse($("json").value);
        if (v.slug !== S.c.slug) throw new Error("O slug não pode mudar por aqui.");
        if (!Array.isArray(v.blocos)) throw new Error("Falta a lista de blocos.");
        S.c = v; $("jerr").textContent = ""; marcar(); setAcc(v.cor || "gold"); H.toast("JSON aplicado. Falta salvar.", "info");
      } catch (e) { $("jerr").textContent = "Não deu para aplicar: " + e.message; }
    };
  }

  // ---------- eventos ----------
  document.querySelector(".tabs").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-tab]"); if (!b || b.dataset.tab === S.tab) return;
    S.tab = b.dataset.tab; render();
  });
  $("clist").addEventListener("click", function (e) { var b = e.target.closest("[data-slug]"); if (b) abrir(b.dataset.slug); });
  $("save").onclick = salvar;
  $("discard").onclick = function () { S.c = JSON.parse(S.orig); setAcc(S.c.cor || "gold"); marcar(); render(); };
  $("reload").onclick = function () { previa(); };
  document.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (dirty()) salvar(); } });

  var panel = $("panel");
  panel.addEventListener("input", function (e) {
    var t = e.target, c = S.c;
    if (t.dataset.k) {
      c[t.dataset.k] = t.dataset.k === "whatsapp" ? t.value.replace(/\D/g, "") : t.value;
      if (t.dataset.k === "nome") { c.iniciais = iniciais(t.value); $("ctitle").textContent = t.value || "Sem nome"; }
    } else if (t.dataset.st != null) {
      var s = c.stats[+t.dataset.st]; s[t.dataset.sk] = t.dataset.sk === "valor" ? +t.value : t.value;
    } else if (t.dataset.bk) {
      var b = c.blocos[+t.closest(".brow").dataset.i]; b[t.dataset.bk] = t.type === "number" ? +t.value : t.value;
    } else return;
    marcar();
  });
  panel.addEventListener("click", function (e) {
    var t, c = S.c;
    if ((t = e.target.closest("[data-dias]"))) { S.dias = +t.dataset.dias; render(); return; }
    if ((t = e.target.closest("#vtab"))) { var tb = $("tdia"), ch = $("cdia"), show = tb.hidden; tb.hidden = !show; ch.hidden = show; t.querySelector("span").textContent = show ? "Ver gráfico" : "Ver tabela"; if (!show) graficoDia(); return; }
    if ((t = e.target.closest("[data-cor]"))) { c.cor = t.dataset.cor; setAcc(c.cor); panel.querySelectorAll("[data-cor]").forEach(function (x) { x.setAttribute("aria-pressed", x === t); }); marcar(); return; }
    if ((t = e.target.closest("[data-tema]"))) { c.tema = t.dataset.tema; panel.querySelectorAll("[data-tema]").forEach(function (x) { x.setAttribute("aria-pressed", x === t); }); marcar(); return; }
    if ((t = e.target.closest("#lanc"))) { c.modoLancamento = !c.modoLancamento; t.setAttribute("aria-checked", c.modoLancamento); marcar(); return; }
    var row = e.target.closest(".brow"), i = row ? +row.dataset.i : -1, b = row && c.blocos[i];
    if ((t = e.target.closest("[data-mv]"))) { var j = i + +t.dataset.mv; if (j < 0 || j >= c.blocos.length) return; c.blocos.splice(j, 0, c.blocos.splice(i, 1)[0]); marcar(); render(); return; }
    if ((t = e.target.closest("[data-v]")) && b) { b.estado = t.dataset.v; marcar(); render(); return; }
    if (e.target.closest("[data-ver]") && b) {
      if (dirty()) { H.toast("Salve primeiro: a prévia mostra o que está publicado.", "info"); return; }
      if (b.estado !== "ativo") { H.toast("Só blocos ativos têm página própria.", "info"); return; }
      previa(b.id); return;
    }
    if (e.target.closest("[data-del]") && b) { if (confirm('Remover o bloco "' + b.titulo + '"?')) { c.blocos.splice(i, 1); marcar(); render(); } return; }
    if ((t = e.target.closest("[data-add]"))) {
      var tipo = t.dataset.add, id = tipo, n = 2;
      while (c.blocos.some(function (x) { return x.id === id; })) id = tipo + "-" + n++;
      var novo = JSON.parse(JSON.stringify(MODELOS[tipo])); novo.id = id; novo.tipo = tipo; novo.estado = "embreve"; novo.icone = TIPOS[tipo].icone;
      c.blocos.push(novo); marcar(); render(); H.toast("Bloco adicionado como “Em breve”", "plus-circle"); return;
    }
  });

  // novo cliente
  $("novo").onclick = function () {
    var cor = "blue", mexeuSlug = false;
    var m = H.modal('<span class="eyebrow">Fábrica</span><h3>Nova página</h3><p class="desc">Cria a página a partir do modelo padrão. Depois é só preencher o conteúdo.</p>' +
      '<form class="form" novalidate><div class="field"><label for="nn">Nome do personal</label><input class="input" id="nn" name="nome" required></div>' +
      '<div class="field"><label for="ns">Endereço da página</label><input class="input" id="ns" name="slug" required><span class="note">localhost:3000/p/<b id="nsv">…</b></span></div>' +
      '<div class="field"><label for="nw">WhatsApp (55 + DDD + número)</label><input class="input" id="nw" name="whatsapp" inputmode="numeric" placeholder="5561900000000"></div>' +
      '<div class="field"><label>Cor da marca</label><div class="colors">' + CORES.map(function (k) { return '<button type="button" style="--c:var(--' + k + ')" data-c="' + k + '" aria-label="Cor ' + k + '" aria-pressed="' + (k === cor) + '"></button>'; }).join("") + "</div></div>" +
      '<p class="err" aria-live="polite"></p><button class="btn" type="submit">' + icon("sparkles") + "Criar página</button></form>");
    var f = m.box.querySelector("form"), err = f.querySelector(".err");
    var atual = function () { $("nsv").textContent = f.slug.value || "…"; };
    f.nome.addEventListener("input", function () { if (!mexeuSlug) { f.slug.value = slugify(f.nome.value); atual(); } });
    f.slug.addEventListener("input", function () { mexeuSlug = true; f.slug.value = slugify(f.slug.value); atual(); });
    m.box.querySelectorAll("[data-c]").forEach(function (b) { b.onclick = function () { cor = b.dataset.c; m.box.querySelectorAll("[data-c]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); }; });
    f.addEventListener("submit", function (e) {
      e.preventDefault(); err.textContent = "";
      if (S.c && dirty() && !confirm("Há alterações não salvas no cliente atual. Descartar?")) return;
      var btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      H.api("/api/clientes", { method: "POST", body: { nome: f.nome.value, slug: f.slug.value, whatsapp: f.whatsapp.value, cor: cor } })
        .then(function (c) { m.close(); S.orig = S.c ? JSON.stringify(S.c) : ""; S.tab = "perfil"; carregarLista(c.slug); H.toast("Página criada a partir do modelo", "sparkles"); })
        .catch(function (x) { err.textContent = x.message; btn.disabled = false; });
    });
  };

  // versão publicada: sem "Novo cliente" (é ferramenta da agência) e com botão para restaurar a demonstração
  if (ST) {
    $("novo").hidden = true;
    document.querySelector(".logo").href = ST.base;
    var nota = document.querySelector(".side .note");
    nota.textContent = "Demonstração: o que você edita aqui fica salvo só neste navegador. Na versão real, cada personal entra com login e edita a própria página.";
    var rst = document.createElement("button"); rst.className = "btn sm ghost"; rst.innerHTML = icon("rotate-ccw") + "Restaurar demonstração";
    rst.onclick = function () { if (confirm("Voltar a página e o painel ao conteúdo original da demonstração?")) { HUB_RESET(); S.orig = ""; S.c = null; location.reload(); } };
    nota.parentNode.insertBefore(rst, nota);
    H.icons();
  }

  carregarLista();
})();
