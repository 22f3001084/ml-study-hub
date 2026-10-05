/* ML Study Hub - small, dependency-free helpers. Everything degrades gracefully without JS. */
(function () {
  "use strict";
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- theme ---------- */
  var root = document.documentElement;
  var saved = ls.get("theme");
  if (saved) root.setAttribute("data-theme", saved);
  var tb = $("#themebtn");
  if (tb) tb.addEventListener("click", function () {
    var cur = root.getAttribute("data-theme");
    var sys = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var next = (cur || sys) === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next); ls.set("theme", next);
  });

  /* ---------- progress ---------- */
  function doneSet() { try { return JSON.parse(ls.get("done") || "{}"); } catch (e) { return {}; } }
  function paintProgress() {
    var d = doneSet();
    $$("[data-wk]").forEach(function (a) { a.classList.toggle("done", !!d[a.getAttribute("data-wk")]); });
    var b = $("#donebtn");
    if (b) {
      var k = b.getAttribute("data-key");
      b.textContent = d[k] ? "Marked as done (click to undo)" : "Mark this week as done";
      b.classList.toggle("ghost", !!d[k]);
    }
    $$(".progress-count").forEach(function (el) {
      var pre = el.getAttribute("data-pre");
      var n = Object.keys(d).filter(function (k) { return k.indexOf(pre) === 0; }).length;
      el.textContent = n + " / 12 weeks done";
    });
  }
  var db = $("#donebtn");
  if (db) db.addEventListener("click", function () {
    var d = doneSet(), k = db.getAttribute("data-key");
    if (d[k]) delete d[k]; else d[k] = 1;
    ls.set("done", JSON.stringify(d)); paintProgress();
  });
  paintProgress();

  /* ---------- mobile week menu ---------- */
  var wb = $("#weeksbtn");
  if (wb) wb.addEventListener("click", function () { $(".side").classList.toggle("open"); });

  /* ---------- TOC highlight ---------- */
  var tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          tocLinks.forEach(function (a) { a.classList.remove("on"); });
          map[e.target.id].classList.add("on");
        }
      });
    }, { rootMargin: "-80px 0px -70% 0px" });
    $$("article h2[id]").forEach(function (h) { io.observe(h); });
  }

  /* ---------- lesson quizzes ---------- */
  $$(".quiz-item").forEach(function (item) {
    var multi = item.getAttribute("data-multi") === "1";
    var lis = $$(".qopts li", item);
    lis.forEach(function (li) {
      li.addEventListener("click", function () {
        if (item.classList.contains("locked")) return;
        if (multi) li.classList.toggle("sel");
        else { lis.forEach(function (x) { x.classList.remove("sel"); }); li.classList.add("sel"); }
      });
    });
    $(".qcheck", item).addEventListener("click", function () {
      var right = item.getAttribute("data-correct").split(",");
      lis.forEach(function (li) {
        var i = li.getAttribute("data-i"), isRight = right.indexOf(i) >= 0;
        li.classList.remove("sel");
        if (isRight) li.classList.add("right");
        else if (li.dataset.picked) li.classList.add("wrong");
      });
      item.classList.add("locked");
      $(".qexp", item).classList.add("show");
    });
    lis.forEach(function (li) {
      li.addEventListener("click", function () { li.dataset.picked = li.classList.contains("sel") ? "1" : ""; });
    });
  });

  /* ---------- paper practice mode ---------- */
  var paper = $("#paper");
  if (paper) {
    var qs = $$(".q[data-type]", paper);
    qs.forEach(function (q) {
      var multi = q.getAttribute("data-type") === "MSQ";
      var lis = $$("ol.opts li", q);
      lis.forEach(function (li) {
        li.addEventListener("click", function () {
          if (q.classList.contains("locked")) return;
          if (multi) li.classList.toggle("sel");
          else { lis.forEach(function (x) { x.classList.remove("sel"); }); li.classList.add("sel"); }
        });
      });
    });
    var grade = function () {
      var got = 0, tot = 0, right = 0, answered = 0, keyed = 0;
      qs.forEach(function (q) {
        var mark = parseFloat(q.getAttribute("data-mark")) || 0;
        var lis = $$("ol.opts li", q), fb = $(".fb", q), ok = null;
        q.classList.add("locked");
        if (lis.length) {
          var corr = (q.getAttribute("data-correct") || "").split(",").filter(Boolean);
          if (corr.length) {
            keyed++; tot += mark;
            var picked = lis.map(function (li, i) { return li.classList.contains("sel") ? String(i) : null; }).filter(function (x) { return x !== null; });
            if (picked.length) answered++;
            ok = picked.length === corr.length && corr.every(function (c) { return picked.indexOf(c) >= 0; });
            lis.forEach(function (li, i) {
              li.classList.remove("sel");
              if (corr.indexOf(String(i)) >= 0) li.classList.add("right");
              else if (picked.indexOf(String(i)) >= 0) li.classList.add("wrong");
            });
          }
        } else if (q.getAttribute("data-lo") !== null && q.getAttribute("data-lo") !== "") {
          keyed++; tot += mark;
          var inp = $(".numin input", q), v = parseFloat(inp && inp.value);
          var lo = parseFloat(q.getAttribute("data-lo")), hi = parseFloat(q.getAttribute("data-hi"));
          if (isNaN(hi)) hi = lo;
          if (inp && inp.value.trim() !== "") answered++;
          ok = !isNaN(v) && v >= Math.min(lo, hi) - 1e-9 && v <= Math.max(lo, hi) + 1e-9;
          fb.dataset.ans = lo === hi ? lo : (lo + " to " + hi);
        }
        if (ok === null) { fb.className = "fb show nokey"; fb.textContent = "No answer key on the source site for this one."; return; }
        if (ok) { got += mark; right++; }
        fb.className = "fb show " + (ok ? "good" : "bad");
        fb.textContent = ok ? "Correct (+" + mark + ")" :
          (fb.dataset.ans ? "Not quite. Accepted answer: " + fb.dataset.ans : "Not quite. Correct option(s) are highlighted green.");
      });
      var box = $("#scorebox");
      box.classList.add("show");
      box.innerHTML = "<b style='font-size:1.4rem'>" + got.toFixed(1).replace(/\.0$/, "") + " / " + tot.toFixed(1).replace(/\.0$/, "") +
        "</b> marks &nbsp;&middot;&nbsp; " + right + " of " + keyed + " questions fully right &nbsp;&middot;&nbsp; " + answered + " attempted" +
        "<div style='color:var(--muted);font-size:.88rem;margin-top:4px'>Strict marking: a multi-select question needs every correct option and no wrong ones.</div>";
      box.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    var reset = function () {
      qs.forEach(function (q) {
        q.classList.remove("locked");
        $$("ol.opts li", q).forEach(function (li) { li.classList.remove("sel", "right", "wrong"); });
        var i = $(".numin input", q); if (i) i.value = "";
        var fb = $(".fb", q); if (fb) fb.className = "fb";
      });
      $("#scorebox").classList.remove("show"); window.scrollTo({ top: 0, behavior: "smooth" });
    };
    var g = $("#gradebtn"), r = $("#resetbtn");
    if (g) g.addEventListener("click", grade);
    if (r) r.addEventListener("click", reset);
    var t0 = Date.now(), clock = $("#clock");
    if (clock) setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      clock.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    }, 1000);
    var kt = $("#keytoggle");
    if (kt) kt.addEventListener("click", function () {
      var k = $(".keysec"); var open = k.style.display === "block";
      k.style.display = open ? "none" : "block"; kt.textContent = open ? "Show answer key" : "Hide answer key";
    });
  }

  /* ---------- search ---------- */
  var box = $("#q"), res = $("#results");
  if (box && res) {
    var idx = null;
    var load = function (cb) {
      if (window.SEARCH_INDEX) return cb(window.SEARCH_INDEX);
      var s = document.createElement("script");
      s.src = (window.ROOT || "") + "assets/js/search-index.js";
      s.onload = function () { cb(window.SEARCH_INDEX || []); };
      document.head.appendChild(s);
    };
    var run = function () {
      var q = box.value.trim().toLowerCase();
      if (q.length < 2) { res.style.display = "none"; return; }
      load(function (ix) {
        var terms = q.split(/\s+/);
        var hits = ix.map(function (e) {
          var hay = (e.t + " " + e.k).toLowerCase(), sc = 0;
          for (var i = 0; i < terms.length; i++) {
            if (hay.indexOf(terms[i]) < 0) return null;
            if (e.t.toLowerCase().indexOf(terms[i]) >= 0) sc += 5;
            sc += 1;
          }
          return { e: e, s: sc };
        }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 12);
        res.innerHTML = hits.length ? hits.map(function (h) {
          return "<a href='" + (window.ROOT || "") + h.e.u + "'>" + h.e.t + "<small>" + h.e.s + "</small></a>";
        }).join("") : "<div style='padding:10px;color:var(--muted)'>Nothing found. Try a simpler word.</div>";
        res.style.display = "block";
      });
    };
    box.addEventListener("input", run);
    document.addEventListener("click", function (e) { if (e.target !== box && !res.contains(e.target)) res.style.display = "none"; });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); box.focus(); }
    });
  }

  /* ---------- responsive helpers ---------- */
  // mobile menu
  var mb = $("#menubtn"), nav = $("#nav");
  if (mb && nav) {
    mb.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      mb.setAttribute("aria-expanded", open ? "true" : "false");
      mb.textContent = open ? "Close" : "Menu";
      setHeader();
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); mb.textContent = "Menu"; mb.setAttribute("aria-expanded", "false"); }); });
  }
  // label every table cell so tables can stack into cards on phones
  $$(".tablewrap table").forEach(function (t) {
    var heads = $$("thead th", t).map(function (h) { return h.textContent.trim(); });
    $$("tbody tr", t).forEach(function (tr) {
      $$("td", tr).forEach(function (td, i) { td.setAttribute("data-label", heads[i] || ""); });
    });
  });
  // keep sticky bars below the header whatever its height is
  function setHeader() {
    var top = $(".top");
    var h = 0;
    if (top && getComputedStyle(top).position === "sticky") h = Math.ceil(top.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--hdr", h + "px");
  }
  // shrink formulas that are wider than their box instead of cutting them or scrolling sideways
  function boxOf(k) {
    var c = k.closest("td,th,li,p,summary,blockquote,.mathblock,.official,.needs,.pq,.qq,.clabel,div");
    return c || k.parentElement;
  }
  function availWidth(c) {
    var cs = getComputedStyle(c);
    return c.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
  }
  function fitMath() {
    $$(".katex").forEach(function (k) { k.style.fontSize = ""; k.classList.remove("wrapmath"); });
    $$(".katex").forEach(function (k) {
      var html = k.querySelector(".katex-html");
      if (!html) return;
      var display = !!k.closest(".katex-display");
      var c = boxOf(k), avail = availWidth(c);
      if (!(avail > 0)) return;
      var w = 0, lo = 1e9, hi = -1e9;
      Array.prototype.forEach.call(html.children, function (b) {
        var r = b.getBoundingClientRect();
        if (r.width > 0) { lo = Math.min(lo, r.left); hi = Math.max(hi, r.right); }
      });
      w = hi > lo ? hi - lo : html.getBoundingClientRect().width;
      if (w > avail) {
        var f = avail / w;
        if (display && f < 0.72) {            // too long to shrink and stay readable: let it wrap onto several lines
          k.classList.add("wrapmath");
          var mb = 0;
          Array.prototype.forEach.call(html.children, function (b) { mb = Math.max(mb, b.getBoundingClientRect().width); });
          f = mb > avail ? avail / mb : 1;
          if (f >= 1) return;
        }
        k.style.fontSize = (1.06 * Math.max(0.4, f * 0.96)).toFixed(3) + "em";
      }
    });
  }
  function fitTables() {
    $$(".tablewrap").forEach(function (wr) {
      var t = wr.querySelector("table"); if (!t) return;
      wr.classList.remove("stack");
      if (window.innerWidth <= 700 || t.getBoundingClientRect().width > wr.clientWidth + 1) wr.classList.add("stack");
    });
  }
  function layoutAll() { setHeader(); fitTables(); fitMath(); fitTables(); fitMath(); }
  layoutAll();
  window.addEventListener("load", layoutAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutAll);
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(layoutAll, 80); });
})();
