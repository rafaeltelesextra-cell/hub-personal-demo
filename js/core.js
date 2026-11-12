// Utilitários compartilhados entre a página pública e o painel.
(function (w) {
  var HEX = { blue: "#408BE5", green: "#35B888", purple: "#A081E5", gold: "#D9AC53", gray: "#8FA0B3", red: "#E36A6A", orange: "#E8915A" };
  var reduce = w.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var brl = function (v, casas) { return "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); };
  var num = function (v, casas) { return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); };
  var icon = function (name, cls) { return '<i data-lucide="' + esc(name) + '"' + (cls ? ' class="' + cls + '"' : "") + "></i>"; };
  var ic = function (name, c) { return '<span class="ic' + (c ? " c-" + c : "") + '">' + icon(name) + "</span>"; };
  var icons = function () { try { if (w.lucide) w.lucide.createIcons(); } catch (e) {} };

  // números que sobem (data-count, data-pre, data-suf, data-casas)
  function countUp(el, delay) {
    var end = +el.dataset.count, pre = el.dataset.pre || "", suf = el.dataset.suf || "", casas = +el.dataset.casas || 0;
    var fin = pre + num(end, casas) + suf;
    if (reduce) { el.textContent = fin; return; }
    var t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + num(end * e, casas) + suf;
      if (p < 1) requestAnimationFrame(step); else el.textContent = fin;
    }
    el.textContent = pre + num(0, casas) + suf;
    var d0 = delay == null ? 320 : delay;
    setTimeout(function () { requestAnimationFrame(step); }, d0);
    setTimeout(function () { el.textContent = fin; }, d0 + 1500); // garante o valor final se o navegador pausar a animação
  }
  var countAll = function (root) { root.querySelectorAll("[data-count]").forEach(function (el) { countUp(el); }); };
  var stagger = function (root) { root.querySelectorAll("[data-a]").forEach(function (el, i) { el.style.setProperty("--i", i); }); };

  // fundo: grade técnica com brilho na cor da seção (mesma ideia da proposta)
  function BgFx(canvas) {
    var ctx = canvas.getContext("2d");
    var hexRgb = function (h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; };
    var fx = { c: hexRgb(HEX.blue), to: hexRgb(HEX.blue), k: 1, kTo: 1, t: 0, bg: "12,17,24" };
    function size() { var dp = Math.min(2, w.devicePixelRatio || 1); canvas.width = innerWidth * dp; canvas.height = innerHeight * dp; ctx.setTransform(dp, 0, 0, dp, 0, 0); }
    function draw() {
      var W = innerWidth, H = innerHeight, i;
      for (i = 0; i < 3; i++) fx.c[i] += (fx.to[i] - fx.c[i]) * 0.04;
      fx.k += (fx.kTo - fx.k) * 0.04; fx.t += 0.004;
      var rgb = fx.c.map(Math.round).join(",");
      ctx.clearRect(0, 0, W, H);
      var cx = W * (0.78 + 0.08 * Math.sin(fx.t)), cy = H * (0.22 + 0.08 * Math.cos(fx.t * 0.8)), R = Math.max(W, H) * (0.6 + 0.2 * fx.k);
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, "rgba(" + rgb + "," + (0.16 + 0.14 * fx.k) + ")"); g.addColorStop(1, "rgba(" + fx.bg + ",0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var st = 56, off = (fx.t * 60) % st;
      ctx.lineWidth = 1;
      for (var x = -st + off; x < W; x += st) { var a = Math.max(0, 0.07 - Math.abs(x - cx) / W * 0.08); ctx.strokeStyle = "rgba(" + rgb + "," + a + ")"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (var y = -st + off; y < H; y += st) { var b = Math.max(0, 0.07 - Math.abs(y - cy) / H * 0.08); ctx.strokeStyle = "rgba(" + rgb + "," + b + ")"; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      if (!reduce) requestAnimationFrame(draw);
    }
    size(); w.addEventListener("resize", function () { size(); if (reduce) draw(); });
    draw();
    return {
      color: function (name, intensidade) { fx.to = hexRgb(HEX[name] || name); fx.kTo = intensidade == null ? 0 : intensidade; if (reduce) draw(); },
      bg: function (hex) { fx.bg = hexRgb(hex).join(","); },
    };
  }

  // toast
  var toastEl, toastT;
  function toast(msg, iconName) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.innerHTML = icon(iconName || "check-circle-2") + "<span>" + esc(msg) + "</span>"; icons();
    toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }

  // modal genérico: devolve {box, close}
  function modal(html, onClose) {
    var m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = '<div class="box"><button class="x" aria-label="Fechar">' + icon("x") + "</button>" + html + "</div>";
    document.body.appendChild(m); icons();
    var prev = document.activeElement;
    setTimeout(function () { m.classList.add("show"); var f = m.querySelector("input, button.btn, a.btn"); if (f) f.focus(); }, 20);
    function close() { m.classList.remove("show"); setTimeout(function () { m.remove(); }, 300); document.removeEventListener("keydown", onKey, true); if (prev && prev.focus) prev.focus(); if (onClose) onClose(); }
    function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); close(); } }
    document.addEventListener("keydown", onKey, true);
    m.addEventListener("click", function (e) { if (e.target === m || e.target.closest(".x")) close(); });
    return { box: m.querySelector(".box"), close: close, el: m };
  }

  var api = function (url, opts) {
    opts = opts || {};
    if (w.HUB_LOCAL_API) return w.HUB_LOCAL_API(url, opts); // versão publicada sem servidor
    return fetch(url, { method: opts.method || "GET", headers: { "Content-Type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined, keepalive: !!opts.keepalive })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.erro || "Erro"); return j; }); });
  };

  w.HUB = { HEX: HEX, reduce: reduce, esc: esc, brl: brl, num: num, icon: icon, ic: ic, icons: icons, countUp: countUp, countAll: countAll, stagger: stagger, BgFx: BgFx, toast: toast, modal: modal, api: api };
})(window);
