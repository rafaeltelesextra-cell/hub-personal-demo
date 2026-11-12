// Página pública: lê o JSON do cliente e monta o hub de links (/p/<slug>) ou uma página interna (/p/<slug>/<bloco>).
(function () {
  var H = HUB, esc = H.esc, icon = H.icon, ic = H.ic;
  // Com servidor: /p/<slug>/<pagina>. Versão publicada (HUB_STATIC): <base>/<pagina>/, com um só cliente.
  var ST = window.HUB_STATIC, slug, pagina;
  if (ST) { slug = ST.slug; pagina = location.pathname.slice(ST.base.length).split("/").filter(Boolean)[0] || null; }
  else { var partes = location.pathname.split("/").filter(Boolean); slug = partes[1]; pagina = partes[2] || null; }
  var PREVIEW = new URLSearchParams(location.search).has("preview");
  // links internos mantêm o modo prévia (sem contar métricas) quando abertos dentro do painel
  var href = function (p) {
    var q = PREVIEW ? "?preview=1" : "";
    if (ST) return ST.base + (p ? encodeURIComponent(p) + "/" : "") + q;
    return "/p/" + encodeURIComponent(slug) + (p ? "/" + encodeURIComponent(p) : "") + q;
  };
  var hubHref = function () { return href(produtoLancado() ? "links" : ""); };
  var produtoLancado = function () { return C.modoLancamento && C.blocos.filter(function (b) { return b.tipo === "produto" && b.estado === "ativo"; })[0]; };
  var TIPO = {
    consultoria: { label: "Consultoria", cor: "blue" },
    personal: { label: "Personal", cor: "purple" },
    resultados: { label: "Resultados", cor: "green" },
    portfolio: { label: "Portfólio", cor: "gold" },
    produto: { label: "Programa online", cor: "orange" },
  };
  var C = null, ATUAL = null; // ATUAL = bloco da página aberta (null no hub)
  var fx = H.BgFx(document.getElementById("bgfx"));
  var $ = function (id) { return document.getElementById(id); };

  // ---------- utilidades ----------
  function track(tipo, alvo, extra) {
    if (PREVIEW) return;
    var b = { slug: slug, tipo: tipo, alvo: alvo };
    for (var k in extra || {}) b[k] = extra[k];
    H.api("/api/track", { method: "POST", body: b, keepalive: true }).catch(function () {});
  }
  var corDe = function (b) { return b.cor || (TIPO[b.tipo] || {}).cor || "blue"; };
  var nome1 = function () { return C.nome.split(" ")[0]; };
  var bloco = function (id) { return C.blocos.filter(function (b) { return b.id === id; })[0]; };
  var countSpan = function (s, cls) {
    var casas = s.casas || 0;
    return '<span class="' + (cls || "") + '" data-count="' + s.valor + '" data-pre="' + esc(s.pre || "") + '" data-suf="' + esc(s.suf || "") + '" data-casas="' + casas + '">' + esc((s.pre || "") + H.num(s.valor, casas) + (s.suf || "")) + "</span>";
  };
  var gridDe = function (n) { return n >= 4 ? "g4" : n === 3 ? "g3" : n === 2 ? "g2" : ""; };

  // silhueta ilustrativa (a largura acompanha o % de gordura)
  var silId = 0;
  function silhueta(g, cor) {
    var id = "sg" + silId++, sh = 30 + g * 0.18, wa = 10 + g * 0.55, hip = 15 + g * 0.5, arm = 4.5 + g * 0.09, leg = 6 + g * 0.14;
    var X = function (v) { return (100 + v).toFixed(1); };
    var torso = "M" + X(-sh) + " 78 Q100 66 " + X(sh) + " 78 L" + X(wa + 3) + " 140 Q" + X(hip + 4) + " 158 " + X(hip) + " 178 L" + X(-hip) + " 178 Q" + X(-hip - 4) + " 158 " + X(-wa - 3) + " 140 Z";
    return '<svg viewBox="0 0 200 270" aria-hidden="true"><defs><linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="270"><stop offset="0" stop-color="' + cor + '" stop-opacity=".6"/><stop offset="1" stop-color="' + cor + '" stop-opacity=".12"/></linearGradient></defs>' +
      '<g stroke="url(#' + id + ')" stroke-linecap="round" fill="none">' +
      '<line x1="' + X(-sh - arm + 2) + '" y1="86" x2="' + X(-sh - arm - 8) + '" y2="164" stroke-width="' + (arm * 2).toFixed(1) + '"/>' +
      '<line x1="' + X(sh + arm - 2) + '" y1="86" x2="' + X(sh + arm + 8) + '" y2="164" stroke-width="' + (arm * 2).toFixed(1) + '"/>' +
      '<line x1="' + X(-leg - 2) + '" y1="186" x2="' + X(-leg - 4) + '" y2="258" stroke-width="' + (leg * 2).toFixed(1) + '"/>' +
      '<line x1="' + X(leg + 2) + '" y1="186" x2="' + X(leg + 4) + '" y2="258" stroke-width="' + (leg * 2).toFixed(1) + '"/></g>' +
      '<path d="' + torso + '" fill="url(#' + id + ')" stroke="' + cor + '" stroke-opacity=".55" stroke-width="1.5"/>' +
      '<circle cx="100" cy="38" r="21" fill="url(#' + id + ')" stroke="' + cor + '" stroke-opacity=".55" stroke-width="1.5"/></svg>';
  }

  // ---------- telas ----------
  function hubHTML() {
    var visiveis = C.blocos.filter(function (b) { return b.estado !== "oculto"; });
    var lanc = produtoLancado();
    var h = '<div class="in narrow">';
    if (lanc) h += '<a class="card hi launch c-' + corDe(lanc) + '" style="--acc:var(--' + corDe(lanc) + ')" href="' + href(lanc.id) + '" data-track="' + esc(lanc.id) + '" data-a><span class="pill">' + icon("zap") + 'LANÇAMENTO</span><span class="t"><b>' + esc(lanc.titulo) + "</b><span>" + esc(lanc.subtitulo || "") + '</span></span><span class="go">' + icon("arrow-right") + "</span></a>";
    h += '<div class="profile"><div class="avatar" data-a><svg viewBox="0 0 116 116" aria-hidden="true"><circle class="bgc" cx="58" cy="58" r="55"/><circle class="fgc" cx="58" cy="58" r="55" data-pct="78"/></svg><div class="face">' + esc(C.iniciais || nome1()[0]) + '</div><span class="dot" title="Atendendo"></span></div>' +
      '<h1 class="name" data-a>' + esc(C.nome) + '</h1><p class="role" data-a>' + esc(C.titulo || "") + "</p>" +
      '<p class="meta" data-a>' + esc([C.cidade, C.registro].filter(Boolean).join("  ·  ")) + "</p>" +
      (C.bio ? '<p class="bio" data-a>' + esc(C.bio) + "</p>" : "") + "</div>";
    if ((C.stats || []).length) h += '<div class="stats" data-a>' + C.stats.map(function (s) { return '<div class="stat-mini"><b>' + countSpan(s) + "</b><span>" + esc(s.label) + "</span></div>"; }).join("") + "</div>";
    h += '<nav class="links" aria-label="Conteúdos">' + visiveis.map(function (b) {
      var soon = b.estado === "embreve", miolo = ic(b.icone || "circle") + '<span class="t"><b>' + esc(b.titulo) + "</b><span>" + esc(b.subtitulo || "") + "</span></span>";
      if (soon) return '<button class="card link soon c-' + corDe(b) + '" data-soon="' + esc(b.id) + '" data-a>' + miolo + '<span class="pill">EM BREVE</span></button>';
      return '<a class="card link c-' + corDe(b) + '" href="' + href(b.id) + '" data-track="' + esc(b.id) + '" data-a>' + miolo + '<span class="go">' + icon("arrow-right") + "</span></a>";
    }).join("") + "</nav>";
    h += '<div class="ctas" data-a><button class="btn wa" data-wa="hub">' + icon("message-circle") + "Falar no WhatsApp</button>" +
      '<a class="btn ghost" href="https://instagram.com/' + encodeURIComponent(C.instagram || "") + '" target="_blank" rel="noopener" aria-label="Instagram de ' + esc(C.nome) + '">' + icon("instagram") + "</a></div>";
    h += '<p class="foot" data-a>Página criada com ' + (ST ? "Hub Personal" : '<a href="/">Hub Personal</a>') + "</p></div>";
    return h;
  }

  function head(b, extra) {
    return '<div class="head">' + (extra || "") + '<span class="eyebrow" data-a>' + esc(TIPO[b.tipo].label) + '</span><h2 class="h2" data-a>' + esc(b.titulo) + "</h2>" +
      (b.intro ? '<p class="desc" data-a>' + esc(b.intro) + "</p>" : "") + "</div>";
  }
  function numeros(lista) {
    if (!lista || !lista.length) return "";
    return '<div class="grid ' + gridDe(lista.length) + '">' + lista.map(function (s) { return '<div class="card" data-a><div class="big">' + countSpan(s) + '</div><p class="desc" style="margin-top:6px">' + esc(s.label) + "</p></div>"; }).join("") + "</div>";
  }

  var RENDER = {
    consultoria: function (b) {
      return '<div class="in">' + head(b) + numeros(b.numeros) +
        '<span class="lab" data-a>Como funciona</span>' +
        '<div class="grid ' + gridDe((b.fases || []).length) + '">' + (b.fases || []).map(function (f) {
          return '<div class="card phase c-' + esc(f.cor || "blue") + '" data-a><div class="roman">' + esc(f.romano) + "</div><h3>" + esc(f.titulo) + '</h3><p class="desc">' + esc(f.desc) + '</p><div class="bar"><i></i></div></div>';
        }).join("") + "</div>" +
        '<span class="lab" data-a>Entregáveis</span><div class="grid g2">' + (b.entregaveis || []).map(function (e) { return '<div class="card deliv" data-a>' + ic("check", "green") + "<p>" + esc(e) + "</p></div>"; }).join("") + "</div>" +
        '<div class="card hi ctabox" data-a><div><span class="lab">Próximo passo</span><div class="mid" style="margin-top:6px">' + esc(b.cta && b.cta.titulo || "Vamos conversar sobre a sua academia?") + '</div></div><button class="btn" data-cta>' + icon("calendar-check") + esc(b.cta && b.cta.texto || "Falar agora") + "</button></div></div>";
    },
    personal: function (b) {
      var planos = b.planos || [];
      return '<div class="in">' + head(b) +
        ((b.modalidades || []).length ? '<div class="chips" data-a>' + b.modalidades.map(function (m) { return '<span class="pill">' + esc(m) + "</span>"; }).join("") + "</div>" : "") +
        '<div class="grid ' + gridDe(planos.length) + '" style="margin-top:8px">' + planos.map(function (p) {
          return '<div class="card plan' + (p.destaque ? " hi" : "") + '" data-a>' + (p.destaque ? '<span class="pill tag">' + icon("star") + "MAIS ESCOLHIDO</span>" : "") +
            '<span class="lab">' + esc(p.nome) + '</span><div class="price">' + countSpan({ valor: p.preco, pre: "R$ " }) + "<small>" + esc(p.periodo || "") + "</small></div>" +
            "<ul>" + (p.itens || []).map(function (i) { return "<li>" + icon("check") + esc(i) + "</li>"; }).join("") + "</ul>" +
            '<button class="btn' + (p.destaque ? "" : " ghost") + '" data-plano="' + esc(p.nome) + '">' + esc(b.cta && b.cta.texto || "Escolher") + "</button></div>";
        }).join("") + "</div>" +
        ((b.faq || []).length ? '<span class="lab" data-a>Perguntas frequentes</span><div class="faq">' + b.faq.map(function (f) { return "<details data-a><summary>" + esc(f.p) + icon("plus") + "</summary><p>" + esc(f.r) + "</p></details>"; }).join("") + "</div>" : "") +
        "</div>";
    },
    resultados: function (b) {
      var casos = b.casos || [], cor = H.HEX[corDe(b)];
      var objs = casos.map(function (c) { return c.objetivo; }).filter(function (o, i, a) { return a.indexOf(o) === i; });
      var delta = function (a, d, u) { var v = Math.round((d - a) * 10) / 10; return (v > 0 ? "+" : v < 0 ? "−" : "") + H.num(Math.abs(v), v % 1 ? 1 : 0) + u; };
      var row = function (l, a, d, u) { var mx = Math.max(a, d) || 1; return '<div class="mrow"><span class="l">' + l + '</span><span class="bars"><i class="a" style="width:' + (a / mx * 100) + '%"></i><i class="d" style="width:' + (d / mx * 100) + '%"></i></span><b>' + delta(a, d, u) + "</b></div>"; };
      return '<div class="in">' + head(b) + numeros(b.numeros) +
        (objs.length > 1 ? '<div class="filters" data-a><button class="pill" aria-pressed="true" data-f="*">Todos</button>' + objs.map(function (o) { return '<button class="pill" aria-pressed="false" data-f="' + esc(o) + '">' + esc(o) + "</button>"; }).join("") + "</div>" : "") +
        '<div class="grid g2">' + casos.map(function (c, i) {
          return '<article class="card case" data-a data-obj="' + esc(c.objetivo) + '">' +
            '<div class="who"><div><b>' + esc(c.nome) + "</b><span>" + esc(c.idade) + " anos · " + esc(c.tempo) + '</span></div><span class="pill">' + esc(c.objetivo) + "</span></div>" +
            '<div class="ba"><div class="side antes">' + silhueta(c.antes.gordura, "#8FA0B3") + '<span class="tg">ANTES</span><span class="kg">' + H.num(c.antes.peso) + ' kg</span></div>' +
            '<div class="side depois">' + silhueta(c.depois.gordura, cor) + '<span class="tg">DEPOIS</span><span class="kg">' + H.num(c.depois.peso) + " kg</span></div>" +
            '<input type="range" min="0" max="100" value="50" aria-label="Arraste para comparar antes e depois de ' + esc(c.nome) + '"><span class="handle"></span><span class="ilus">ILUSTRAÇÃO · DEMO</span></div>' +
            '<div class="meas">' + row("Peso", c.antes.peso, c.depois.peso, " kg") + row("Gordura", c.antes.gordura, c.depois.gordura, " p.p.") + "</div>" +
            '<p class="quote">“' + esc(c.depoimento) + "”</p>" +
            '<button class="more" aria-expanded="false" aria-controls="st-' + i + '">Ler a história ' + icon("chevron-down") + "</button>" +
            '<div class="story" id="st-' + i + '"><div><p>' + esc(c.historia) + "</p></div></div></article>";
        }).join("") + "</div></div>";
    },
    portfolio: function (b) {
      return '<div class="in">' + head(b) +
        ((b.servicos || []).length ? '<div class="grid g3">' + b.servicos.map(function (s) { return '<div class="card" data-a><div class="row">' + ic(s.icone || "circle") + "<b>" + esc(s.titulo) + '</b></div><p class="desc" style="margin-top:12px">' + esc(s.desc) + "</p></div>"; }).join("") + "</div>" : "") +
        ((b.trajetoria || []).length ? '<span class="lab" data-a>Trajetória</span><div class="vt">' + b.trajetoria.map(function (t) { return '<div class="card" data-a><span class="when">' + esc(t.quando) + "</span><div><b>" + esc(t.titulo) + "</b><p>" + esc(t.desc) + "</p></div></div>"; }).join("") + "</div>" : "") +
        ((b.certificacoes || []).length ? '<span class="lab" data-a>Formação</span><div class="chips" data-a>' + b.certificacoes.map(function (c) { return '<span class="pill">' + icon("award") + esc(c) + "</span>"; }).join("") + "</div>" : "") +
        "</div>";
    },
    produto: function (b) {
      var aulas = (b.modulos || []).reduce(function (s, m) { return s + (+m.aulas || 0); }, 0);
      var top = produtoLancado() === b ? '<div class="chips" data-a><span class="pill">' + icon("zap") + 'LANÇAMENTO</span><a class="pill c-gray" href="' + hubHref() + '">' + icon("layout-grid") + "Ver tudo de " + esc(nome1()) + "</a></div>" : "";
      return '<div class="in">' + head(b, top) +
        '<div class="offer"><div class="card hi pricebox" data-a><span class="lab">Investimento</span>' +
        (b.precoDe ? '<span class="strike">De ' + H.brl(b.precoDe) + "</span>" : "") +
        '<div class="big">' + countSpan({ valor: b.precoPor, pre: "R$ " }) + "</div>" +
        (b.parcelas > 1 ? '<p class="inst">ou ' + b.parcelas + "x de " + H.brl(b.precoPor / b.parcelas, 2) + " no cartão</p>" : "") +
        '<button class="btn" data-buy style="margin-top:8px">' + icon("shopping-bag") + "Quero garantir minha vaga</button>" +
        '<p class="note">' + icon("lock", "") + " Pagamento pela plataforma parceira</p></div>" +
        '<div class="card guar" data-a><div class="ring"><svg viewBox="0 0 96 96" aria-hidden="true"><circle class="bgc" cx="48" cy="48" r="40"/><circle class="fgc" cx="48" cy="48" r="40" data-pct="100"/></svg><b>' + esc(b.garantia || 7) + '</b></div><div><span class="lab">Garantia</span><p class="mid" style="margin-top:6px">' + esc(b.garantia || 7) + ' dias de garantia</p><p class="desc" style="margin-top:6px">Não gostou? Devolução de 100% do valor, sem perguntas.</p></div></div></div>' +
        ((b.modulos || []).length ? '<span class="lab" data-a>O que tem dentro · ' + aulas + ' aulas</span><div class="mods">' + b.modulos.map(function (m, i) { return '<div class="mod" data-a><span class="n">' + String(i + 1).padStart(2, "0") + '</span><span class="t">' + esc(m.titulo) + '</span><span class="tag">' + esc(m.aulas) + " AULAS</span></div>"; }).join("") + "</div>" : "") +
        ((b.bonus || []).length ? '<span class="lab" data-a>Bônus</span><div class="grid ' + gridDe(Math.min(3, b.bonus.length)) + '">' + b.bonus.map(function (x) { return '<div class="card deliv" data-a>' + ic("gift", "gold") + "<p>" + esc(x) + "</p></div>"; }).join("") + "</div>" : "") +
        "</div>";
    },
  };

  // ---------- modais ----------
  function abrirWhats(msg, origem) {
    var hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    var m = H.modal('<span class="eyebrow" style="color:var(--green)">WhatsApp</span><h3>Falar com ' + esc(nome1()) + "</h3>" +
      '<p class="desc">A conversa abre com esta mensagem pronta, assim ' + esc(nome1()) + " sabe de qual página você veio.</p>" +
      '<div class="chat"><div class="to">Para: ' + esc(C.nome) + " · +" + esc(C.whatsapp) + '</div><div class="bub">' + esc(msg) + "<small>" + hora + "</small></div></div>" +
      '<div class="mbtns"><a class="btn wa" href="' + esc("https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(msg)) + '" target="_blank" rel="noopener" data-open>' + icon("message-circle") + "Abrir no WhatsApp</a>" +
      '<button class="btn ghost" data-copy>' + icon("copy") + 'Copiar mensagem</button></div><p class="note center" style="margin-top:12px">Demonstração: o número é fictício.</p>');
    m.box.querySelector("[data-open]").addEventListener("click", function () { track("whatsapp", origem, { origem: origem }); H.toast("Abrindo o WhatsApp…", "message-circle"); setTimeout(m.close, 200); });
    m.box.querySelector("[data-copy]").addEventListener("click", function () {
      try { navigator.clipboard.writeText(msg).then(function () { H.toast("Mensagem copiada"); }); } catch (e) { H.toast("Não deu para copiar", "x-circle"); }
    });
  }

  function abrirEmBreve(b) {
    var m = H.modal('<span class="eyebrow" style="color:var(--' + corDe(b) + ')">Em breve</span><h3>' + esc(b.titulo) + "</h3>" +
      '<p class="desc">' + esc(nome1()) + " está preparando esta parte. Deixe seu contato e receba o aviso primeiro.</p>" +
      '<form class="form" novalidate><div class="field"><label for="ln">Nome</label><input class="input" id="ln" name="nome" autocomplete="name" required></div>' +
      '<div class="field"><label for="lw">WhatsApp com DDD</label><input class="input" id="lw" name="whatsapp" inputmode="tel" autocomplete="tel" placeholder="(61) 90000-0000" required></div>' +
      '<p class="err" aria-live="polite"></p><button class="btn" type="submit" style="--acc:var(--' + corDe(b) + ')">' + icon("bell") + "Entrar na lista de espera</button></form>");
    var f = m.box.querySelector("form"), err = f.querySelector(".err");
    f.addEventListener("submit", function (e) {
      e.preventDefault(); err.textContent = "";
      var btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      H.api("/api/leads", { method: "POST", body: { slug: slug, nome: f.nome.value, whatsapp: f.whatsapp.value, interesse: b.id } })
        .then(function () {
          m.box.innerHTML = '<button class="x" aria-label="Fechar">' + icon("x") + '</button><div class="center"><div class="okmark">' + icon("check") + '</div><h3 style="padding:0">Pronto, você está na lista!</h3><p class="desc" style="margin-top:8px">Quando "' + esc(b.titulo) + '" sair, ' + esc(nome1()) + ' avisa você pelo WhatsApp.</p><div class="mbtns"><button class="btn ghost" data-ok>Fechar</button></div></div>';
          H.icons(); m.box.querySelector("[data-ok]").onclick = m.close;
        })
        .catch(function (x) { err.textContent = x.message; btn.disabled = false; });
    });
  }

  function abrirCheckout(b) {
    var m = H.modal('<span class="eyebrow">Checkout · simulação</span><h3>' + esc(b.titulo) + "</h3>" +
      '<div class="sum"><span>Total</span><b>' + H.brl(b.precoPor) + "</b></div>" +
      '<span class="lab" style="display:block;margin-top:16px">Forma de pagamento</span>' +
      '<div class="pay"><button aria-pressed="true" data-m="pix">' + icon("qr-code") + 'Pix</button><button aria-pressed="false" data-m="cartao">' + icon("credit-card") + "Cartão</button></div>" +
      '<p class="note">Demonstração: nenhum dado de pagamento é pedido aqui. Na versão real, este passo abre o checkout da plataforma escolhida (Hotmart, Kiwify ou Mercado Pago).</p>' +
      '<div class="mbtns"><button class="btn" data-pay>' + icon("check") + "Simular pagamento aprovado</button></div>");
    m.box.querySelectorAll(".pay button").forEach(function (x) { x.onclick = function () { m.box.querySelectorAll(".pay button").forEach(function (y) { y.setAttribute("aria-pressed", y === x); }); }; });
    var pay = m.box.querySelector("[data-pay]");
    pay.onclick = function () {
      pay.disabled = true; pay.innerHTML = '<span class="spin"></span>Processando…';
      setTimeout(function () {
        track("venda", b.id, { valor: b.precoPor });
        m.box.innerHTML = '<button class="x" aria-label="Fechar">' + icon("x") + '</button><div class="center"><div class="okmark">' + icon("party-popper") + '</div><h3 style="padding:0">Compra aprovada!</h3><p class="desc" style="margin-top:8px">Na versão real, o aluno recebe o acesso a "' + esc(b.titulo) + '" por e-mail na hora, e a venda aparece no painel.</p><div class="mbtns"><button class="btn ghost" data-ok>Fechar</button></div></div>';
        H.icons(); m.box.querySelector("[data-ok]").onclick = m.close;
      }, 1300);
    };
  }

  // ---------- montagem ----------
  function rings(s) {
    s.querySelectorAll(".fgc").forEach(function (c) {
      var L = 2 * Math.PI * +c.getAttribute("r");
      c.style.strokeDasharray = "0 " + L; void c.getBoundingClientRect();
      c.style.strokeDasharray = (L * c.dataset.pct / 100) + " " + L;
    });
  }
  function wipe(s) {
    if (H.reduce) return;
    s.querySelectorAll(".ba").forEach(function (ba, i) {
      var inp = ba.querySelector("input"), t0 = null, from = 92, to = 50;
      ba.style.setProperty("--pos", from + "%"); inp.value = from;
      setTimeout(function () {
        requestAnimationFrame(function step(t) {
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - p, 3), v = from + (to - from) * e;
          ba.style.setProperty("--pos", v + "%"); inp.value = v;
          if (p < 1) requestAnimationFrame(step);
        });
      }, 500 + i * 120);
    });
  }

  // rodapé das páginas internas: voltar para os links + WhatsApp
  function rodape(b) {
    return '<div class="in endnav"><div class="card endcard" data-a><div><span class="lab">Gostou do que viu?</span><div class="mid" style="margin-top:6px">Fale com ' + esc(nome1()) + " pelo WhatsApp</div></div>" +
      '<div class="endbtns"><a class="btn ghost" href="' + hubHref() + '">' + icon("arrow-left") + 'Ver todos os links</a><button class="btn wa" data-wa="' + esc(b.id) + '">' + icon("message-circle") + "WhatsApp</button></div></div></div>";
  }

  function mostrar(html, cor, intensidade) {
    var main = $("main");
    main.innerHTML = '<section class="page" style="--acc:var(--' + cor + ')">' + html + "</section>";
    var s = main.firstChild;
    H.stagger(s); H.icons();
    document.documentElement.style.setProperty("--acc", "var(--" + cor + ")");
    fx.color(cor, intensidade);
    void s.offsetWidth; s.classList.add("on");
    H.countAll(s); rings(s);
    return s;
  }

  function abrirHub() {
    ATUAL = null;
    $("top").hidden = true;
    mostrar(hubHTML(), C.cor || "gold", 1);
    track("view", "hub");
  }
  function abrirPagina(b) {
    ATUAL = b;
    var cor = corDe(b);
    document.title = b.titulo + " · " + C.nome;
    $("top").hidden = false;
    $("back").href = hubHref();
    $("seclabel").textContent = TIPO[b.tipo].label.toUpperCase();
    var s = mostrar(RENDER[b.tipo](b) + rodape(b), cor, 0);
    if (b.tipo === "resultados") wipe(s);
    track("view", b.id);
  }
  function naoEncontrada(msg) {
    $("top").hidden = false; $("back").href = hubHref(); $("seclabel").textContent = "";
    mostrar('<div class="in narrow" style="min-height:70vh;justify-content:center;text-align:center"><p class="eyebrow" data-a>Indisponível</p><h1 class="h2" data-a>' + esc(msg) + '</h1><p data-a style="margin-top:8px"><a class="btn ghost" href="' + hubHref() + '">' + icon("arrow-left") + "Ver todos os links</a></p></div>", C.cor || "gold", 1);
  }

  // ---------- eventos ----------
  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-track]"))) { track("click", t.dataset.track); return; } // o link segue normalmente
    if ((t = e.target.closest("[data-soon]"))) { track("click", t.dataset.soon); abrirEmBreve(bloco(t.dataset.soon)); return; }
    if ((t = e.target.closest("[data-wa]"))) {
      var o = t.dataset.wa;
      abrirWhats(o === "hub" ? "Olá, " + nome1() + "! Vim pela sua página no Instagram e queria saber mais." : "Olá, " + nome1() + '! Vi a página "' + bloco(o).titulo + '" e queria saber mais.', o);
      return;
    }
    var b = ATUAL;
    if (!b) return;
    if (e.target.closest("[data-cta]")) { abrirWhats(b.cta.mensagem, b.id); return; }
    if ((t = e.target.closest("[data-plano]"))) { abrirWhats(String(b.cta && b.cta.mensagem || "Olá! Tenho interesse no plano {plano}.").replace("{plano}", t.dataset.plano), b.id); return; }
    if (e.target.closest("[data-buy]")) { abrirCheckout(b); return; }
    var pg = e.target.closest(".page");
    if ((t = e.target.closest(".filters button"))) {
      var f = t.dataset.f;
      pg.querySelectorAll(".filters button").forEach(function (x) { x.setAttribute("aria-pressed", x === t); });
      pg.querySelectorAll(".case").forEach(function (c, k) {
        var show = f === "*" || c.dataset.obj === f;
        c.classList.toggle("out", !show);
        if (show) { c.style.setProperty("--i", k % 2); c.style.animation = "none"; void c.offsetWidth; c.style.animation = ""; }
      });
      return;
    }
    if ((t = e.target.closest(".more"))) {
      var st = document.getElementById(t.getAttribute("aria-controls")), open = t.getAttribute("aria-expanded") !== "true";
      t.setAttribute("aria-expanded", open); st.classList.toggle("open", open);
      t.firstChild.nodeValue = open ? "Fechar a história " : "Ler a história ";
    }
  });
  document.addEventListener("input", function (e) { if (e.target.matches(".ba input")) e.target.parentNode.style.setProperty("--pos", e.target.value + "%"); });
  // volta pelo botão do navegador refaz a animação de entrada
  window.addEventListener("pageshow", function (e) { if (e.persisted) location.reload(); });

  // ---------- início ----------
  H.api("/api/clientes/" + encodeURIComponent(slug || ""))
    .then(function (c) {
      C = c;
      document.title = C.nome + " · " + (C.titulo || "Hub Personal");
      document.documentElement.dataset.tema = C.tema || "noite";
      document.documentElement.style.setProperty("--brand", "var(--" + (C.cor || "gold") + ")");
      fx.bg(C.tema === "grafite" ? "#0A0B0C" : "#0C1118");
      $("bname").textContent = C.nome.toUpperCase();
      $("bname").href = hubHref();
      $("loading").remove(); $("app").hidden = false;
      // sem página no endereço: hub de links, ou o produto quando o modo lançamento está ligado
      var lanc = produtoLancado();
      if (!pagina) { if (lanc) abrirPagina(lanc); else abrirHub(); return; }
      if (pagina === "links") { abrirHub(); return; }
      var b = bloco(pagina);
      if (b && b.estado === "ativo" && RENDER[b.tipo]) abrirPagina(b);
      else naoEncontrada(b && b.estado === "embreve" ? '"' + b.titulo + '" ainda está sendo preparada.' : "Esta página não existe.");
    })
    .catch(function () {
      $("loading").remove();
      document.body.insertAdjacentHTML("beforeend", '<div class="empty" style="position:relative;z-index:1;height:100%"><div><p class="eyebrow">404</p><h1 class="h2" style="margin:10px 0">Página não encontrada</h1><p class="desc">Confira o endereço ou volte para a <a href="' + (ST ? ST.base : "/") + '">página inicial</a>.</p></div></div>');
    });
})();
