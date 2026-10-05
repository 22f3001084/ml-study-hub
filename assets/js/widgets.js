/* Interactive widgets for the lessons. Each one is a tiny SVG toy: move a slider, watch the maths react. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function html(tag, attrs, parent, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.innerHTML = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function slider(parent, label, min, max, step, val, onchange) {
    var wrap = html("div", { "class": "row" }, parent);
    var lab = html("label", {}, wrap, label + ": ");
    var inp = html("input", { type: "range", min: min, max: max, step: step, value: val }, wrap);
    var out = html("span", { "class": "out" }, wrap, String(val));
    inp.addEventListener("input", function () { out.textContent = (+inp.value).toFixed(2); onchange(+inp.value); });
    inp.set = function (v) { inp.value = v; out.textContent = (+v).toFixed(2); };
    out.textContent = (+val).toFixed(2);
    return inp;
  }
  function button(parent, text, fn, ghost) {
    var b = html("button", { "class": "btn" + (ghost ? " ghost" : ""), type: "button" }, parent, text);
    b.style.marginRight = "8px"; b.addEventListener("click", fn); return b;
  }
  function plot(parent, w, h) {
    var s = el("svg", { viewBox: "0 0 " + w + " " + h, role: "img" });
    parent.appendChild(s); return s;
  }
  function clear(s) { while (s.firstChild) s.removeChild(s.firstChild); }
  var C = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888"; };
  function colors(w) { var cs = getComputedStyle(w.closest("body") || document.body); return { acc: cs.getPropertyValue("--acc").trim(), text: cs.getPropertyValue("--text").trim(), muted: cs.getPropertyValue("--muted").trim(), line: cs.getPropertyValue("--line").trim(), ok: cs.getPropertyValue("--ok").trim(), bad: cs.getPropertyValue("--bad").trim() }; }

  var W = {};

  /* ---------------- gradient descent on a bowl ---------------- */
  W.gd = function (box) {
    var f = function (x) { return (x - 3) * (x - 3) + 1; }, g = function (x) { return 2 * (x - 3); };
    var st = { x: -0.5, eta: 0.15, trail: [] };
    var out = html("div", {}, box), svg = plot(box, 560, 260);
    var info = html("div", {}, box);
    function draw() {
      var c = colors(box); clear(svg);
      var X = function (x) { return 30 + (x + 1) / 8 * 500; }, Y = function (y) { return 235 - Math.min(y, 30) / 30 * 205; };
      var d = ""; for (var x = -1; x <= 7.001; x += 0.1) d += (d ? "L" : "M") + X(x) + "," + Y(f(x));
      el("path", { d: d, stroke: c.muted, fill: "none", "stroke-width": 2 }, svg);
      el("line", { x1: 30, y1: 235, x2: 530, y2: 235, stroke: c.line }, svg);
      st.trail.forEach(function (p, i) { el("circle", { cx: X(p), cy: Y(f(p)), r: 4, fill: c.acc, opacity: 0.35 + 0.65 * i / Math.max(1, st.trail.length) }, svg); });
      var ball = el("circle", { cx: X(st.x), cy: Y(f(st.x)), r: 8, fill: c.acc }, svg);
      var t = el("text", { x: X(3), y: 252, "text-anchor": "middle", fill: c.muted, "font-size": 12 }, svg); t.textContent = "lowest point x = 3";
      info.innerHTML = "<span class='out'>x = " + st.x.toFixed(4) + "</span><span class='out'>f(x) = " + f(st.x).toFixed(4) +
        "</span><span class='out'>slope = " + g(st.x).toFixed(3) + "</span><span class='out'>steps: " + (st.trail.length - 1) + "</span>" +
        (Math.abs(st.x) > 40 ? "<p><b>Boom - it flew off.</b> The step size was too big, so every step overshot further than the last.</p>" : "") +
        (st.eta >= 1 && Math.abs(st.x) <= 40 ? "<p>With eta this big the ball just bounces from side to side. Try a smaller step.</p>" : "");
    }
    function step() { st.x = st.x - st.eta * g(st.x); st.trail.push(st.x); if (Math.abs(st.x) > 1e6) st.x = 1e6 * Math.sign(st.x); draw(); }
    function reset() { st.x = -0.5; st.trail = [st.x]; draw(); }
    slider(out, "step size (eta)", 0.02, 1.2, 0.01, st.eta, function (v) { st.eta = v; reset(); });
    var row = html("div", { "class": "row" }, out);
    button(row, "Take one step", step); button(row, "Take 10 steps", function () { for (var i = 0; i < 10; i++) step(); });
    button(row, "Reset", reset, true);
    reset();
  };

  /* ---------------- least squares line ---------------- */
  W.lsq = function (box) {
    var xs = [1, 2, 3, 4, 5, 6], ys = [2.1, 2.9, 4.2, 4.8, 6.3, 6.9];
    var n = xs.length, mx = 3.5, my = ys.reduce(function (a, b) { return a + b; }, 0) / n;
    var sxy = 0, sxx = 0; for (var i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); }
    var bestM = sxy / sxx, bestB = my - bestM * mx;
    var st = { m: 0.2, b: 3 };
    var ctl = html("div", {}, box), svg = plot(box, 560, 280), info = html("div", {}, box);
    function sse(m, b) { var s = 0; for (var i = 0; i < n; i++) { var e = ys[i] - (m * xs[i] + b); s += e * e; } return s; }
    function draw() {
      var c = colors(box); clear(svg);
      var X = function (x) { return 40 + x / 7 * 490; }, Y = function (y) { return 250 - y / 9 * 230; };
      el("line", { x1: 40, y1: 250, x2: 530, y2: 250, stroke: c.line }, svg); el("line", { x1: 40, y1: 20, x2: 40, y2: 250, stroke: c.line }, svg);
      for (var i = 0; i < n; i++) {
        var yh = st.m * xs[i] + st.b;
        el("line", { x1: X(xs[i]), y1: Y(ys[i]), x2: X(xs[i]), y2: Y(yh), stroke: c.bad, "stroke-width": 2 }, svg);
        el("rect", { x: X(xs[i]) - 3, y: Y(Math.max(ys[i], yh)), width: Math.abs(Y(ys[i]) - Y(yh)) * 0.0 + 0, height: 0, fill: "none" }, svg);
      }
      el("line", { x1: X(0), y1: Y(st.b), x2: X(7), y2: Y(st.m * 7 + st.b), stroke: c.acc, "stroke-width": 3 }, svg);
      for (var j = 0; j < n; j++) el("circle", { cx: X(xs[j]), cy: Y(ys[j]), r: 6, fill: c.text }, svg);
      var s = sse(st.m, st.b), best = sse(bestM, bestB);
      info.innerHTML = "<span class='out'>your line: y = " + st.m.toFixed(2) + "x + " + st.b.toFixed(2) + "</span>" +
        "<span class='out'>sum of squared errors = " + s.toFixed(2) + "</span><span class='out'>best possible = " + best.toFixed(2) + "</span>" +
        "<p>The red sticks are the mistakes. Least squares squares every stick, adds them up, and finds the line that makes that total smallest.</p>";
    }
    var sm = slider(ctl, "slope", -1, 2, 0.01, st.m, function (v) { st.m = v; draw(); });
    var sb = slider(ctl, "intercept", -2, 8, 0.01, st.b, function (v) { st.b = v; draw(); });
    var row = html("div", { "class": "row" }, ctl);
    button(row, "Snap to the best line", function () { st.m = bestM; st.b = bestB; sm.set(bestM); sb.set(bestB); draw(); });
    draw();
  };

  /* ---------------- projection = shadow ---------------- */
  W.proj = function (box) {
    var P = [3, 2], st = { th: 10 };
    var ctl = html("div", {}, box), svg = plot(box, 520, 340), info = html("div", {}, box);
    function draw() {
      var c = colors(box); clear(svg);
      var cx = 90, cy = 290, S = 62; var X = function (x) { return cx + x * S; }, Y = function (y) { return cy - y * S; };
      el("line", { x1: 20, y1: cy, x2: 500, y2: cy, stroke: c.line }, svg); el("line", { x1: cx, y1: 320, x2: cx, y2: 20, stroke: c.line }, svg);
      var t = st.th * Math.PI / 180, ux = Math.cos(t), uy = Math.sin(t);
      el("line", { x1: X(-1 * ux), y1: Y(-1 * uy), x2: X(6.8 * ux), y2: Y(6.8 * uy), stroke: c.acc, "stroke-width": 3 }, svg);
      var d = P[0] * ux + P[1] * uy, fx = d * ux, fy = d * uy;
      el("line", { x1: X(P[0]), y1: Y(P[1]), x2: X(fx), y2: Y(fy), stroke: c.bad, "stroke-width": 2.5, "stroke-dasharray": "5 4" }, svg);
      el("circle", { cx: X(fx), cy: Y(fy), r: 7, fill: c.acc }, svg);
      el("circle", { cx: X(P[0]), cy: Y(P[1]), r: 8, fill: c.text }, svg);
      var tx = el("text", { x: X(P[0]) + 12, y: Y(P[1]) - 8, fill: c.text, "font-size": 13 }, svg); tx.textContent = "point (3, 2)";
      var t2 = el("text", { x: X(fx) + 10, y: Y(fy) + 20, fill: c.acc, "font-size": 13 }, svg); t2.textContent = "its shadow";
      var dist = Math.sqrt((P[0] - fx) * (P[0] - fx) + (P[1] - fy) * (P[1] - fy));
      info.innerHTML = "<span class='out'>shadow length = " + Math.abs(d).toFixed(3) + "</span><span class='out'>distance to line = " + dist.toFixed(3) +
        "</span><span class='out'>shadow&sup2; + distance&sup2; = " + (d * d + dist * dist).toFixed(3) + "</span>" +
        "<p>Whatever angle you pick, the red dashed stick meets the line at a right angle - that is what makes the shadow the <b>closest</b> point on the line. The total (3&sup2;+2&sup2; = 13) never changes: Pythagoras.</p>";
    }
    slider(ctl, "tilt of the line (degrees)", -20, 90, 1, st.th, function (v) { st.th = v; draw(); });
    var row = html("div", { "class": "row" }, ctl);
    button(row, "Aim the line right at the point", function () { st.th = Math.atan2(2, 3) * 180 / Math.PI; ctl.querySelector("input").set(st.th); draw(); }, true);
    draw();
  };

  /* ---------------- eigenvectors: which arrows only stretch? ---------------- */
  W.eig = function (box) {
    var A = [[4, 1], [2, 3]], st = { th: 20 };
    var ctl = html("div", {}, box), svg = plot(box, 520, 340), info = html("div", {}, box);
    function draw() {
      var c = colors(box); clear(svg);
      var cx = 260, cy = 170, S = 28; var X = function (x) { return cx + x * S; }, Y = function (y) { return cy - y * S; };
      el("line", { x1: 10, y1: cy, x2: 510, y2: cy, stroke: c.line }, svg); el("line", { x1: cx, y1: 10, x2: cx, y2: 330, stroke: c.line }, svg);
      var t = st.th * Math.PI / 180, vx = Math.cos(t), vy = Math.sin(t);
      var ax = A[0][0] * vx + A[0][1] * vy, ay = A[1][0] * vx + A[1][1] * vy;
      var cross = vx * ay - vy * ax, dot = vx * ax + vy * ay, len = Math.hypot(ax, ay);
      var ang = Math.atan2(cross, dot) * 180 / Math.PI;
      var aligned = Math.abs(cross) < 0.08;
      [[[vx, vy], c.acc, "v"], [[ax, ay], aligned ? c.ok : c.bad, "Av"]].forEach(function (a) {
        var p = a[0];
        el("line", { x1: X(0), y1: Y(0), x2: X(p[0]), y2: Y(p[1]), stroke: a[1], "stroke-width": 3.5 }, svg);
        el("circle", { cx: X(p[0]), cy: Y(p[1]), r: 6, fill: a[1] }, svg);
        var tx = el("text", { x: X(p[0]) + 8, y: Y(p[1]) - 8, fill: a[1], "font-size": 14, "font-weight": 700 }, svg); tx.textContent = a[2];
      });
      info.innerHTML = "<span class='out'>angle of v = " + st.th.toFixed(0) + "&deg;</span><span class='out'>length of Av = " + len.toFixed(2) +
        "</span><span class='out'>Av is turned by " + ang.toFixed(1) + "&deg; from v</span>" +
        "<p>" + (aligned ? "<b>Av points along v: v is an eigenvector.</b> The stretch factor (eigenvalue) is " + ((dot >= 0 ? 1 : -1) * len).toFixed(2) + "."
          : "Av is the arrow after the matrix has acted on v. Most arrows get turned. Find the two angles where they do not.") + "</p>";
    }
    var sl = slider(ctl, "angle of v (degrees)", 0, 180, 1, st.th, function (v) { st.th = v; draw(); });
    var row = html("div", { "class": "row" }, ctl);
    button(row, "Jump to eigenvector 1", function () { st.th = 45; sl.set(45); draw(); }, true);
    button(row, "Jump to eigenvector 2", function () { st.th = 116.565; sl.set(116.565); draw(); }, true);
    draw();
  };

  /* ---------------- PCA: rotate an axis ---------------- */
  W.pca = function (box) {
    var raw = [[-4, -2.1], [-3.2, -1.2], [-2.6, -1.9], [-1.8, -0.4], [-1.1, -1.0], [-0.4, 0.3], [0.3, -0.5], [0.9, 0.8], [1.5, 0.2], [2.2, 1.4], [2.9, 0.7], [3.4, 1.9], [4.1, 1.1], [4.6, 2.5]];
    var mx = 0, my = 0; raw.forEach(function (p) { mx += p[0]; my += p[1]; }); mx /= raw.length; my /= raw.length;
    var pts = raw.map(function (p) { return [p[0] - mx, p[1] - my]; });
    var n = pts.length, sxx = 0, syy = 0, sxy = 0;
    pts.forEach(function (p) { sxx += p[0] * p[0]; syy += p[1] * p[1]; sxy += p[0] * p[1]; }); sxx /= n; syy /= n; sxy /= n;
    var bestTh = 0.5 * Math.atan2(2 * sxy, sxx - syy) * 180 / Math.PI, total = sxx + syy;
    var st = { th: 100 };
    var ctl = html("div", {}, box), svg = plot(box, 560, 340), info = html("div", {}, box);
    function draw() {
      var c = colors(box); clear(svg);
      var cx = 280, cy = 170, S = 50; var X = function (x) { return cx + x * S; }, Y = function (y) { return cy - y * S; };
      var t = st.th * Math.PI / 180, ux = Math.cos(t), uy = Math.sin(t);
      el("line", { x1: X(-6 * ux), y1: Y(-6 * uy), x2: X(6 * ux), y2: Y(6 * uy), stroke: c.acc, "stroke-width": 3 }, svg);
      var v = 0, err = 0;
      pts.forEach(function (p) {
        var d = p[0] * ux + p[1] * uy; v += d * d; var fx = d * ux, fy = d * uy;
        err += (p[0] - fx) * (p[0] - fx) + (p[1] - fy) * (p[1] - fy);
        el("line", { x1: X(p[0]), y1: Y(p[1]), x2: X(fx), y2: Y(fy), stroke: c.bad, "stroke-width": 1.5, opacity: 0.6 }, svg);
        el("circle", { cx: X(fx), cy: Y(fy), r: 3.5, fill: c.acc }, svg);
      });
      pts.forEach(function (p) { el("circle", { cx: X(p[0]), cy: Y(p[1]), r: 5.5, fill: c.text }, svg); });
      v /= n; err /= n;
      var atBest = Math.abs(((st.th - bestTh) % 180 + 180) % 180) < 3 || Math.abs(((st.th - bestTh) % 180 + 180) % 180 - 180) < 3;
      info.innerHTML = "<span class='out'>spread of shadows (variance) = " + v.toFixed(3) + "</span><span class='out'>squashing loss (avg squared error) = " + err.toFixed(3) +
        "</span><span class='out'>total = " + (v + err).toFixed(3) + "</span>" +
        "<p>" + (atBest ? "<b>That's the principal component.</b> The shadows are as spread out as they can be, and the squashing loss is as small as it can be - the same answer, because the total never changes."
          : "Black dots are your data, orange dots are their shadows on the axis, red sticks are what we lose by squashing. Spin the axis until the shadows are as spread out as possible.") + "</p>";
    }
    var sl = slider(ctl, "angle of the axis (degrees)", 0, 180, 1, st.th, function (v) { st.th = v; draw(); });
    var row = html("div", { "class": "row" }, ctl);
    button(row, "Snap to the principal component", function () { st.th = (bestTh + 180) % 180; sl.set(st.th); draw(); }, true);
    draw();
  };

  /* ---------------- k-means stepper ---------------- */
  W.kmeans = function (box) {
    var pts = [[1, 1], [1.5, 2], [2, 1.2], [1.2, 2.4], [2.3, 2.1], [6, 1], [6.8, 1.6], [7.2, 0.8], [6.4, 2.2], [7.4, 2.0], [3.8, 6], [4.4, 6.8], [3.5, 7.2], [4.9, 6.2], [4.1, 7.6]];
    var init = [[2, 6], [3, 3], [4, 1]];
    var st = { cen: null, asg: null, phase: 0, iter: 0 };
    var ctl = html("div", {}, box), svg = plot(box, 560, 320), info = html("div", {}, box);
    var COLS = ["#d9742c", "#2f9a56", "#4a72d9"];
    function reset() { st.cen = init.map(function (c) { return c.slice(); }); st.asg = null; st.phase = 0; st.iter = 0; draw("Centres placed badly on purpose. Press Assign."); }
    function assign() { st.asg = pts.map(function (p) { var b = 0, bd = 1e9; st.cen.forEach(function (c, k) { var d = (p[0] - c[0]) * (p[0] - c[0]) + (p[1] - c[1]) * (p[1] - c[1]); if (d < bd) { bd = d; b = k; } }); return b; }); st.phase = 1; draw("Every point joined its nearest centre. Now press Update."); }
    function update() {
      if (!st.asg) return;
      var old = JSON.stringify(st.cen);
      st.cen = st.cen.map(function (c, k) { var sx = 0, sy = 0, m = 0; pts.forEach(function (p, i) { if (st.asg[i] === k) { sx += p[0]; sy += p[1]; m++; } }); return m ? [sx / m, sy / m] : c; });
      st.iter++; st.phase = 0; var same = old === JSON.stringify(st.cen);
      draw(same ? "Nothing moved - k-means has converged." : "Each centre moved to the average of its group. Press Assign again.");
    }
    function cost() { if (!st.asg) return null; var s = 0; pts.forEach(function (p, i) { var c = st.cen[st.asg[i]]; s += (p[0] - c[0]) * (p[0] - c[0]) + (p[1] - c[1]) * (p[1] - c[1]); }); return s; }
    function draw(msg) {
      var c0 = colors(box); clear(svg);
      var X = function (x) { return 30 + x / 9 * 500; }, Y = function (y) { return 295 - y / 9 * 270; };
      pts.forEach(function (p, i) { el("circle", { cx: X(p[0]), cy: Y(p[1]), r: 6, fill: st.asg ? COLS[st.asg[i]] : c0.muted, opacity: st.asg ? 0.9 : 0.8 }, svg); });
      st.cen.forEach(function (c, k) { el("rect", { x: X(c[0]) - 9, y: Y(c[1]) - 9, width: 18, height: 18, fill: COLS[k], stroke: c0.text, "stroke-width": 2 }, svg); });
      var J = cost();
      info.innerHTML = "<span class='out'>rounds finished: " + st.iter + "</span>" + (J === null ? "" : "<span class='out'>total squared distance = " + J.toFixed(2) + "</span>") + "<p>" + msg + "</p>";
    }
    var row = html("div", { "class": "row" }, ctl);
    button(row, "1. Assign points", assign); button(row, "2. Update centres", update); button(row, "Reset", reset, true);
    reset();
  };

  /* ---------------- sigmoid / logistic ---------------- */
  W.sigmoid = function (box) {
    var data = [[1, 0], [2, 0], [2.5, 0], [3.2, 0], [3.8, 1], [4.5, 0], [5, 1], [6, 1], [7, 1], [8, 1]];
    var st = { w: 0.5, b: -1 };
    var ctl = html("div", {}, box), svg = plot(box, 560, 280), info = html("div", {}, box);
    var sig = function (z) { return 1 / (1 + Math.exp(-z)); };
    function draw() {
      var c = colors(box); clear(svg);
      var X = function (x) { return 40 + x / 9 * 490; }, Y = function (y) { return 240 - y * 210; };
      el("line", { x1: 40, y1: 240, x2: 530, y2: 240, stroke: c.line }, svg); el("line", { x1: 40, y1: Y(0.5), x2: 530, y2: Y(0.5), stroke: c.line, "stroke-dasharray": "4 4" }, svg);
      var d = ""; for (var x = 0; x <= 9.001; x += 0.1) d += (d ? "L" : "M") + X(x) + "," + Y(sig(st.w * x + st.b));
      el("path", { d: d, stroke: c.acc, "stroke-width": 3, fill: "none" }, svg);
      var loss = 0;
      data.forEach(function (p) { var q = sig(st.w * p[0] + st.b); loss += -(p[1] * Math.log(Math.max(q, 1e-9)) + (1 - p[1]) * Math.log(Math.max(1 - q, 1e-9))); el("circle", { cx: X(p[0]), cy: Y(p[1]), r: 6, fill: p[1] ? c.ok : c.bad }, svg); });
      loss /= data.length;
      var cut = st.w !== 0 ? -st.b / st.w : null;
      if (cut !== null && cut > 0 && cut < 9) el("line", { x1: X(cut), y1: 20, x2: X(cut), y2: 240, stroke: c.text, "stroke-dasharray": "6 4" }, svg);
      info.innerHTML = "<span class='out'>w = " + st.w.toFixed(2) + "</span><span class='out'>b = " + st.b.toFixed(2) + "</span>" +
        "<span class='out'>decision point x = " + (cut === null ? "none" : cut.toFixed(2)) + "</span><span class='out'>average log-loss = " + loss.toFixed(3) + "</span>" +
        "<p>Green dots = passed (1), red dots = failed (0), x = hours studied. The curve is the model's probability of passing. Try to make the log-loss as small as you can: <b>w</b> controls how steep the curve is, <b>b</b> slides it left or right.</p>";
    }
    slider(ctl, "w (steepness)", -1, 4, 0.01, st.w, function (v) { st.w = v; draw(); });
    slider(ctl, "b (shift)", -12, 4, 0.01, st.b, function (v) { st.b = v; draw(); });
    draw();
  };

  /* ---------------- Beta prior + data -> posterior ---------------- */
  function lgamma(z) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var x = z, y = z, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); var ser = 1.000000000190015;
    for (var j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function betaPdf(x, a, b) { return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) + lgamma(a + b) - lgamma(a) - lgamma(b)); }
  W.beta = function (box) {
    var st = { a: 2, b: 2, h: 7, t: 3 };
    var ctl = html("div", {}, box), svg = plot(box, 560, 260), info = html("div", {}, box);
    function draw() {
      var c = colors(box); clear(svg);
      var X = function (x) { return 30 + x * 500; }, ymax = 6, Y = function (y) { return 230 - Math.min(y, ymax) / ymax * 200; };
      el("line", { x1: 30, y1: 230, x2: 530, y2: 230, stroke: c.line }, svg);
      function curve(a, b, col, dash, wd) {
        var d = ""; for (var x = 0.005; x < 1; x += 0.005) d += (d ? "L" : "M") + X(x) + "," + Y(betaPdf(x, a, b));
        el("path", { d: d, stroke: col, fill: "none", "stroke-width": wd, "stroke-dasharray": dash }, svg);
      }
      curve(st.a, st.b, c.muted, "6 5", 2); curve(st.a + st.h, st.b + st.t, c.acc, "", 3.5);
      var n = st.h + st.t, mle = n ? st.h / n : null, A = st.a + st.h, B = st.b + st.t;
      var mean = A / (A + B), mode = (A > 1 && B > 1) ? (A - 1) / (A + B - 2) : null;
      [[0, "0"], [0.5, "0.5"], [1, "1"]].forEach(function (p) { var t = el("text", { x: X(p[0]), y: 250, "text-anchor": "middle", fill: c.muted, "font-size": 12 }, svg); t.textContent = p[1]; });
      info.innerHTML = "<span class='out'>prior Beta(" + st.a.toFixed(0) + "," + st.b.toFixed(0) + ") dashed</span><span class='out'>posterior Beta(" + A.toFixed(0) + "," + B.toFixed(0) + ")</span>" +
        "<span class='out'>MLE = " + (mle === null ? "n/a" : mle.toFixed(3)) + "</span><span class='out'>posterior mean = " + mean.toFixed(3) + "</span><span class='out'>MAP (mode) = " + (mode === null ? "n/a" : mode.toFixed(3)) + "</span>" +
        "<p>The orange curve is what you believe about the coin's heads-probability <i>after</i> the data. Add data and watch it narrow and drift from the prior towards the MLE.</p>";
    }
    slider(ctl, "prior a (pretend heads)", 1, 10, 1, st.a, function (v) { st.a = v; draw(); });
    slider(ctl, "prior b (pretend tails)", 1, 10, 1, st.b, function (v) { st.b = v; draw(); });
    slider(ctl, "observed heads", 0, 40, 1, st.h, function (v) { st.h = v; draw(); });
    slider(ctl, "observed tails", 0, 40, 1, st.t, function (v) { st.t = v; draw(); });
    draw();
  };

  /* ---------------- k-NN: click to place a query ---------------- */
  W.knn = function (box) {
    var P = [[1, 1, 1], [1.5, 2.5, 1], [2, 1.5, 1], [2.5, 3.2, 1], [3, 2.2, 1], [3.6, 4.4, 1], [4.2, 3.4, 1],
             [6, 5.5, 0], [6.8, 4.6, 0], [7.4, 6.4, 0], [5.4, 6.8, 0], [4.6, 5.4, 0], [7.8, 3.4, 0], [3.6, 6.4, 0], [2.6, 5.2, 0], [5.2, 2.2, 0]];
    var st = { k: 3, q: [4, 4] };
    var ctl = html("div", {}, box), svg = plot(box, 520, 340), info = html("div", {}, box);
    var X = function (x) { return 30 + x / 9 * 470; }, Y = function (y) { return 310 - y / 8 * 290; };
    function draw() {
      var c = colors(box); clear(svg);
      var d = P.map(function (p, i) { return { i: i, d: Math.hypot(p[0] - st.q[0], p[1] - st.q[1]) }; }).sort(function (a, b) { return a.d - b.d; });
      var nn = d.slice(0, st.k), votes = 0; nn.forEach(function (o) { votes += P[o.i][2] ? 1 : 0; });
      var pred = votes * 2 > st.k ? 1 : (votes * 2 < st.k ? 0 : null);
      el("circle", { cx: X(st.q[0]), cy: Y(st.q[1]), r: nn[nn.length - 1].d / 9 * 470, fill: "none", stroke: c.muted, "stroke-dasharray": "5 5" }, svg);
      P.forEach(function (p, i) {
        var inn = nn.some(function (o) { return o.i === i; });
        el("circle", { cx: X(p[0]), cy: Y(p[1]), r: inn ? 9 : 6, fill: p[2] ? c.acc : c.ok, stroke: inn ? c.text : "none", "stroke-width": 2.5 }, svg);
      });
      el("rect", { x: X(st.q[0]) - 8, y: Y(st.q[1]) - 8, width: 16, height: 16, fill: c.text, transform: "rotate(45 " + X(st.q[0]) + " " + Y(st.q[1]) + ")" }, svg);
      info.innerHTML = "<span class='out'>k = " + st.k + "</span><span class='out'>votes: orange " + votes + ", green " + (st.k - votes) + "</span><span class='out'>prediction: " +
        (pred === null ? "tie" : pred ? "orange" : "green") + "</span><p>Click anywhere on the picture to move the query (black diamond). The ringed dots are its k nearest neighbours. Try k = 1 and then k = 15.</p>";
    }
    svg.addEventListener("click", function (e) {
      var r = svg.getBoundingClientRect(), sx = 520 / r.width, sy = 340 / r.height;
      var px = (e.clientX - r.left) * sx, py = (e.clientY - r.top) * sy;
      st.q = [(px - 30) / 470 * 9, (310 - py) / 290 * 8]; draw();
    });
    slider(ctl, "k (number of neighbours)", 1, 15, 1, st.k, function (v) { st.k = Math.round(v); draw(); });
    draw();
  };

  /* ---------------- ridge vs LASSO on one number ---------------- */
  W.ridge = function (box) {
    var st = { lam: 2 };
    var ctl = html("div", {}, box), svg = plot(box, 560, 280), info = html("div", {}, box);
    function draw() {
      var c = colors(box); clear(svg);
      var X = function (w) { return 40 + (w + 1) / 5 * 490; }, Y = function (v) { return 250 - Math.min(v, 22) / 22 * 225; };
      el("line", { x1: 40, y1: 250, x2: 530, y2: 250, stroke: c.line }, svg); el("line", { x1: X(0), y1: 20, x2: X(0), y2: 250, stroke: c.line, "stroke-dasharray": "4 4" }, svg);
      function curve(f, col) { var d = ""; for (var w = -1; w <= 4.001; w += 0.05) d += (d ? "L" : "M") + X(w) + "," + Y(f(w)); el("path", { d: d, stroke: col, fill: "none", "stroke-width": 3 }, svg); }
      var L = st.lam;
      curve(function (w) { return (w - 3) * (w - 3) + L * w * w; }, c.acc);
      curve(function (w) { return (w - 3) * (w - 3) + L * Math.abs(w); }, c.ok);
      var wr = 3 / (1 + L), wl = Math.max(0, 3 - L / 2);
      el("circle", { cx: X(wr), cy: Y((wr - 3) * (wr - 3) + L * wr * wr), r: 7, fill: c.acc }, svg);
      el("circle", { cx: X(wl), cy: Y((wl - 3) * (wl - 3) + L * wl), r: 7, fill: c.ok }, svg);
      var t1 = el("text", { x: X(3), y: 270, "text-anchor": "middle", fill: c.muted, "font-size": 12 }, svg); t1.textContent = "unpenalised best = 3";
      info.innerHTML = "<span class='out' style='border-left:4px solid " + c.acc + "'>ridge: w = " + wr.toFixed(3) + "</span><span class='out' style='border-left:4px solid " + c.ok + "'>LASSO: w = " + wl.toFixed(3) + "</span>" +
        "<p>The curves are (w&minus;3)&sup2; plus a penalty. <b>Ridge</b> (orange) pulls w towards 0 smoothly but never lands exactly on it. <b>LASSO</b> (green) has a sharp corner at 0 that can catch w, switching the feature off completely once the penalty is big enough (lambda &ge; 6 here).</p>";
    }
    slider(ctl, "penalty strength (lambda)", 0, 10, 0.1, st.lam, function (v) { st.lam = v; draw(); });
    draw();
  };

  /* ---------------- SVM margin ---------------- */
  W.margin = function (box) {
    var P = [[1, 1, -1], [1.6, 2.2, -1], [2.4, 0.8, -1], [4.8, 4.2, 1], [5.6, 3.0, 1], [6.2, 5.0, 1]];
    var st = { th: 40, off: 3.0 };
    var ctl = html("div", {}, box), svg = plot(box, 520, 340), info = html("div", {}, box);
    var X = function (x) { return 30 + x / 8 * 470; }, Y = function (y) { return 310 - y / 6.5 * 290; };
    function eval_(th, off) {
      var t = th * Math.PI / 180, nx = Math.cos(t), ny = Math.sin(t), ok_ = true, m = 1e9;
      P.forEach(function (p) { var s = nx * p[0] + ny * p[1] - off; if (s * p[2] <= 0) ok_ = false; m = Math.min(m, Math.abs(s)); });
      return { ok: ok_, m: m, nx: nx, ny: ny };
    }
    var best = (function () { var b = { m: -1, th: 0, off: 0 }; for (var th = 0; th < 180; th += 0.5) for (var o = 0; o < 9; o += 0.02) { var r = eval_(th, o); if (r.ok && r.m > b.m) b = { m: r.m, th: th, off: o }; } return b; })();
    function draw() {
      var c = colors(box); clear(svg);
      var r = eval_(st.th, st.off), nx = r.nx, ny = r.ny, ux = -ny, uy = nx;
      function line(off, col, dash, wd) {
        var cx = nx * off, cy = ny * off; el("line", { x1: X(cx - ux * 9), y1: Y(cy - uy * 9), x2: X(cx + ux * 9), y2: Y(cy + uy * 9), stroke: col, "stroke-dasharray": dash, "stroke-width": wd }, svg);
      }
      if (r.ok) { line(st.off + r.m, c.muted, "6 5", 1.5); line(st.off - r.m, c.muted, "6 5", 1.5); }
      line(st.off, r.ok ? c.acc : c.bad, "", 3.5);
      P.forEach(function (p) {
        var s = Math.abs(nx * p[0] + ny * p[1] - st.off), sv = r.ok && Math.abs(s - r.m) < 0.05;
        el("circle", { cx: X(p[0]), cy: Y(p[1]), r: sv ? 10 : 6.5, fill: p[2] > 0 ? c.ok : c.bad, stroke: sv ? c.text : "none", "stroke-width": 2.5 }, svg);
      });
      info.innerHTML = "<span class='out'>" + (r.ok ? "separates the classes" : "does NOT separate the classes") + "</span><span class='out'>margin width = " + (r.ok ? (2 * r.m).toFixed(3) : "-") + "</span><span class='out'>best possible width = " + (2 * best.m).toFixed(3) + "</span>" +
        "<p>Rotate and slide the line so every green dot is on one side and every red dot on the other, with the widest empty street between them. The ringed dots touching the street edges are the <b>support vectors</b>: only they decide the line.</p>";
    }
    var s1 = slider(ctl, "tilt (degrees)", 0, 179, 1, st.th, function (v) { st.th = v; draw(); });
    var s2 = slider(ctl, "position of the line", 0, 8, 0.05, st.off, function (v) { st.off = v; draw(); });
    var row = html("div", { "class": "row" }, ctl);
    button(row, "Show the maximum-margin line", function () { st.th = best.th; st.off = best.off; s1.set(best.th); s2.set(best.off); draw(); }, true);
    draw();
  };

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".widget[data-w]"), function (b) {
      var fn = W[b.getAttribute("data-w")]; if (fn) fn(b);
    });
  });
})();
