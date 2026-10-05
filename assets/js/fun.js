/* Kid-friendly layer: sounds (WebAudio, no files), confetti, mascot, scroll reveal. Everything degrades silently. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var soundOn = store.get("sound") !== "off";
  var ctx = null;

  function tone(freq, start, len, type, vol) {
    if (!soundOn) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + start;
      o.type = type || "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + len + 0.05);
    } catch (e) {}
  }
  var sfx = {
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.25, "triangle"); }); },
    oops: function () { tone(220, 0, 0.18, "sawtooth", 0.08); tone(165, 0.14, 0.28, "sawtooth", 0.08); },
    pop: function () { tone(660, 0, 0.08, "sine", 0.08); },
    done: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.08, 0.3, "triangle"); }); }
  };

  function confetti(n) {
    if (reduce) return;
    var box = document.createElement("div"); box.className = "confetti"; box.setAttribute("aria-hidden", "true");
    var cols = ["#ff5e7e", "#ffb100", "#2fc27b", "#3b82f6", "#a855f7", "#14b8a6"];
    for (var i = 0; i < (n || 60); i++) {
      var p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = cols[i % cols.length];
      p.style.animationDelay = Math.random() * 0.4 + "s";
      p.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
      p.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 3500);
  }

  /* quiz feedback: runs after site.js has marked right/wrong */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest && t.closest(".qcheck, .check, .quiz button")) {
      setTimeout(function () {
        var q = t.closest(".quiz, .qitem, li, section") || document;
        var wrong = q.querySelector("li.wrong"), picked = q.querySelectorAll("li.right").length;
        if (wrong) { sfx.oops(); shake(wrong); }
        else if (picked) { sfx.win(); confetti(40); }
      }, 60);
    } else if (t.closest && t.closest("#donebtn")) {
      sfx.done(); confetti(110);
    } else if (t.closest && t.closest("ol.opts li, .chip, .btn")) {
      sfx.pop();
    }
  });
  function shake(el) { if (reduce) return; el.classList.add("shake"); setTimeout(function () { el.classList.remove("shake"); }, 600); }

  /* mascot + sound switch */
  var tips = [
    "Hi! I am Pip. Watch the video first, then read.",
    "Stuck? Say it out loud like you are teaching a friend.",
    "Do the quiz at the end of each section. Wrong answers teach the most!",
    "Exam trick: read the options, then cross out the silly ones first.",
    "Little and often beats one giant night. Try 25 minutes, 5 minute break.",
    "Formulas are just short sentences. Say what each letter means.",
    "Great job turning up today. Keep going!"
  ];
  var dock = document.createElement("div"); dock.className = "pip-dock";
  dock.innerHTML = "<div class='pip-bubble' role='status' hidden></div>" +
    "<button type='button' class='pip' aria-label='Study buddy Pip: tap for a tip'><span aria-hidden='true'>🦉</span></button>" +
    "<button type='button' class='snd' aria-label='Sound on or off' aria-pressed='" + soundOn + "'><span aria-hidden='true'>" + (soundOn ? "🔊" : "🔇") + "</span></button>";
  document.body.appendChild(dock);
  var bub = dock.querySelector(".pip-bubble"), ti = 0, bt;
  dock.querySelector(".pip").addEventListener("click", function () {
    sfx.pop(); bub.textContent = tips[ti++ % tips.length]; bub.hidden = false;
    clearTimeout(bt); bt = setTimeout(function () { bub.hidden = true; }, 5000);
  });
  var sb = dock.querySelector(".snd");
  sb.addEventListener("click", function () {
    soundOn = !soundOn; store.set("sound", soundOn ? "on" : "off");
    sb.setAttribute("aria-pressed", soundOn); sb.firstChild.textContent = soundOn ? "🔊" : "🔇"; sfx.pop();
  });

  /* scroll reveal */
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".callout, .eli5, .concept, .example, .practice, .trap, .recap, .exam, .tip, .twin, .vidbox, .vcard, .widget, .fig, figure, article h2")
      .forEach(function (el) { el.classList.add("rv"); io.observe(el); });
  }

  /* lazy-play videos only one at a time */
  document.addEventListener("play", function (e) {
    document.querySelectorAll("video").forEach(function (v) { if (v !== e.target) v.pause(); });
  }, true);
})();
