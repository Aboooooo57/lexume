/* Karaoke player + stacked dictionary modal
   Expects globals: player (audio element), WORD_TIMINGS, MD_SOURCE, HAS_TIMINGS */

(function () {
  const player    = document.getElementById("player");
  const stage     = document.getElementById("stage");
  const overlay   = document.getElementById("overlay");
  const stackWrap = document.getElementById("stack-wrap");

  // ── Render markdown then map word timings onto text nodes ────────────────
  if (stage && HAS_TIMINGS) {
    stage.innerHTML = marked.parse(MD_SOURCE);

    let wordIdx = 0;

    function wrapTextNode(node) {
      const parts = node.textContent.split(/([ \t\n]+)/);
      if (parts.length === 1 && /^[ \t\n]*$/.test(parts[0] || "")) return;
      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        if (!part) return;
        if (/^[ \t\n]+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else {
          if (wordIdx < WORD_TIMINGS.length) {
            const t  = WORD_TIMINGS[wordIdx++];
            const sp = document.createElement("span");
            sp.className = "w";
            sp.dataset.s = t.start;
            sp.dataset.e = t.end;
            sp.dataset.w = part;
            sp.textContent = part;
            frag.appendChild(sp);
          } else {
            frag.appendChild(document.createTextNode(part));
          }
        }
      });
      node.parentNode.replaceChild(frag, node);
    }

    (function walk(el) {
      [...el.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) wrapTextNode(child);
        else if (child.nodeType === Node.ELEMENT_NODE) walk(child);
      });
    })(stage);
  }

  const spans = stage ? [...stage.querySelectorAll(".w")] : [];
  let lastActive = -1;

  // ── Karaoke highlight ────────────────────────────────────────────────────
  if (player && HAS_TIMINGS) {
    player.addEventListener("timeupdate", () => {
      const t = player.currentTime;
      let lo = 0, hi = WORD_TIMINGS.length - 1, found = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if      (WORD_TIMINGS[mid].end   < t) lo = mid + 1;
        else if (WORD_TIMINGS[mid].start > t) hi = mid - 1;
        else { found = mid; break; }
      }
      if (found === lastActive) return;
      const from = lastActive >= 0 ? lastActive : 0;
      const to   = found >= 0 ? found : WORD_TIMINGS.length;
      for (let i = from; i < to; i++) {
        spans[i].classList.remove("active");
        spans[i].classList.add("spoken");
      }
      if (found >= 0) {
        spans[found].classList.add("active");
        spans[found].classList.remove("spoken");
        spans[found].scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      lastActive = found;
    });

    player.addEventListener("seeked", () => {
      const t = player.currentTime;
      spans.forEach((sp, i) => {
        sp.classList.remove("active", "spoken");
        if (WORD_TIMINGS[i].end < t) sp.classList.add("spoken");
      });
      lastActive = -1;
    });

    // Karaoke word click → seek + lookup
    spans.forEach(sp => {
      sp.addEventListener("click", e => {
        e.stopPropagation();
        player.currentTime = parseFloat(sp.dataset.s);
        player.play();
        lookupWord(sp.dataset.w);
      });
    });
  }

  // ── Modal stack ──────────────────────────────────────────────────────────
  let stack = window._dictStack = window._dictStack || [];

  window.rebuildStack = function () {
    stackWrap.innerHTML = "";
    if (!stack.length) { overlay.classList.remove("open"); return; }
    overlay.classList.add("open");

    stack.slice(0, -1).forEach((item, i) => {
      const depth = stack.length - 1 - i;
      const ghost = document.createElement("div");
      ghost.className = "modal-card under";
      ghost.style.cssText = `
        transform: scale(${1 - depth * 0.04}) translateY(${-depth * 10}px);
        transform-origin: top center;
        opacity: ${Math.max(0, 1 - depth * 0.3)};
        z-index: ${900 + i};
        height: 80px;
        top: ${depth * -6}px;
      `;
      ghost.innerHTML = `<div class="dict-word" style="font-size:1.1rem;opacity:.5">${item.word}</div>`;
      stackWrap.appendChild(ghost);
    });

    const top  = stack[stack.length - 1];
    const card = document.createElement("div");
    card.className = "modal-card top";
    card.style.zIndex = 900 + stack.length;
    card.style.position = "relative";

    const hdr = document.createElement("div");
    hdr.className = "card-header";

    if (stack.length > 1) {
      const btnBack = document.createElement("button");
      btnBack.className = "btn-back";
      btnBack.title = "Back";
      btnBack.innerHTML = "←";
      btnBack.onclick = () => { stack.pop(); rebuildStack(); };
      hdr.appendChild(btnBack);

      const bc = document.createElement("div");
      bc.className = "breadcrumb";
      bc.innerHTML = stack.slice(0, -1).map((s, i) =>
        `<span style="cursor:pointer;text-decoration:underline dotted"
               onclick="popTo(${i + 1})">${s.word}</span>`
      ).join(" › ");
      hdr.appendChild(bc);
    }

    const btnClose = document.createElement("button");
    btnClose.className = "btn-close";
    btnClose.title = "Close";
    btnClose.innerHTML = "✕";
    btnClose.onclick = closeAll;
    hdr.appendChild(btnClose);

    card.appendChild(hdr);

    const body = document.createElement("div");
    body.innerHTML = top.html;
    makeClickable(body);
    card.appendChild(body);
    stackWrap.appendChild(card);
  };

  window.popTo = function (depth) {
    stack = stack.slice(0, depth);
    rebuildStack();
  };

  window.closeAll = function () {
    stack = [];
    rebuildStack();
  };

  overlay.addEventListener("click", e => { if (e.target === overlay) closeAll(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (stack.length > 1) { stack.pop(); rebuildStack(); }
      else closeAll();
    }
  });

  // ── Phonetic audio ───────────────────────────────────────────────────────
  let currentPhonAudio = null;
  window.playPhonetic = function (btn) {
    if (currentPhonAudio) {
      currentPhonAudio.pause();
      document.querySelectorAll(".phon-btn.playing").forEach(b => b.classList.remove("playing"));
      if (currentPhonAudio._btn === btn) { currentPhonAudio = null; return; }
    }
    const url = btn.dataset.audio;
    if (!url) return;
    const audio = new Audio(url);
    audio._btn = btn;
    btn.classList.add("playing");
    audio.play();
    audio.addEventListener("ended",  () => { btn.classList.remove("playing"); currentPhonAudio = null; });
    audio.addEventListener("error",  () => { btn.classList.remove("playing"); currentPhonAudio = null; });
    currentPhonAudio = audio;
  };

  // ── Make container words clickable ───────────────────────────────────────
  window.makeClickable = function (container) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
      const parts = node.textContent.split(/([ \t\n]+)/);
      if (parts.length <= 1) return;
      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        if (!part || /^[ \t\n]+$/.test(part)) {
          frag.appendChild(document.createTextNode(part || ""));
        } else {
          const sp = document.createElement("span");
          sp.className = "dl";
          sp.textContent = part;
          sp.addEventListener("click", e => { e.stopPropagation(); lookupWord(part); });
          frag.appendChild(sp);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  };

  // ── Dictionary entry HTML ────────────────────────────────────────────────
  window.buildEntryHTML = function (entry) {
    const phonetics = entry.phonetics || [];
    const phonetic  = entry.phonetic || phonetics.map(p => p.text).filter(Boolean)[0] || "";
    const audioUrl  = phonetics.map(p => p.audio).filter(Boolean)[0] || "";

    let h = `<div class="dict-word">${entry.word}</div>`;
    if (phonetic || audioUrl) {
      h += `<div class="dict-phon">`;
      if (phonetic) h += `<span class="phon-text">${phonetic}</span>`;
      if (audioUrl) h += `<button class="phon-btn" data-audio="${audioUrl}" onclick="playPhonetic(this)">
          <span class="phon-icon">🔊</span>${phonetic || "Listen"}
        </button>`;
      h += `</div>`;
    }
    (entry.meanings || []).slice(0, 4).forEach((m, mi) => {
      if (mi > 0) h += `<hr class="dict-hr">`;
      h += `<div class="dict-pos">${m.partOfSpeech}</div>`;
      (m.definitions || []).slice(0, 3).forEach(d => {
        h += `<div class="dict-def">· ${d.definition}</div>`;
        if (d.example) h += `<div class="dict-ex">"${d.example}"</div>`;
      });
      const syns = (m.synonyms || []).slice(0, 6);
      if (syns.length) h += `<div class="dict-syns">Synonyms: ${syns.join(" · ")}</div>`;
    });
    return h;
  };

  // ── Lookup + push to stack ───────────────────────────────────────────────
  window.lookupWord = async function (raw) {
    const word = raw.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
    if (!word || word.length < 2) return;

    stack.push({ word, html: `<div class="spinner">Looking up <strong>${word}</strong>…</div>` });
    rebuildStack();

    try {
      const r = await fetch(`/dictionary/${encodeURIComponent(word)}`);
      if (!r.ok) throw 0;
      const data = await r.json();
      stack[stack.length - 1] = { word, html: buildEntryHTML(data) };
    } catch (_) {
      stack[stack.length - 1] = {
        word,
        html: `<div class="dict-word">${word}</div>
               <p class="not-found">No entry found for "<em>${word}</em>".</p>`,
      };
    }
    rebuildStack();
  };
})();
