from __future__ import annotations

import base64
import json
import os
import re
import tempfile

import streamlit as st
import streamlit.components.v1 as components
from dotenv import load_dotenv

from main import (
    DEFAULT_ELEVENLABS_MODEL,
    DEFAULT_GEMINI_MODEL,
    extract_text_from_gemini,
    fetch_word_definition,
    generate_with_timestamps,
    get_pdf_page_count,
    identify_key_terms,
    parse_page_ranges,
    stream_to_elevenlabs,
    strip_markdown,
)

load_dotenv()

# ── Model catalogues ──────────────────────────────────────────────────────────
GEMINI_MODELS: list[tuple[str, str]] = [
    ("gemini-2.5-flash",       "Gemini 2.5 Flash — best price/performance ✦ default"),
    ("gemini-2.5-pro",         "Gemini 2.5 Pro — most capable, deep reasoning"),
    ("gemini-2.5-flash-lite",  "Gemini 2.5 Flash Lite — fastest & cheapest"),
    ("gemini-3-flash-preview", "Gemini 3 Flash Preview — frontier class"),
    ("gemini-3.1-pro-preview", "Gemini 3.1 Pro Preview — advanced agentic"),
]
ELEVENLABS_MODELS: list[tuple[str, str]] = [
    ("eleven_multilingual_v2", "Multilingual v2 — high quality, 29 languages ✦ default"),
    ("eleven_v3",              "Eleven v3 — most expressive (alpha)"),
    ("eleven_turbo_v2_5",      "Turbo v2.5 — low latency, 32 languages"),
    ("eleven_turbo_v2",        "Turbo v2 — low latency, English"),
    ("eleven_flash_v2_5",      "Flash v2.5 — ultra-fast, 32 languages"),
    ("eleven_flash_v2",        "Flash v2 — ultra-fast, English"),
    ("eleven_monolingual_v1",  "Monolingual v1 — English classic"),
]

GEMINI_MODEL_IDS    = [m[0] for m in GEMINI_MODELS]
GEMINI_MODEL_LABELS = [m[1] for m in GEMINI_MODELS]
ELEVEN_MODEL_IDS    = [m[0] for m in ELEVENLABS_MODELS]
ELEVEN_MODEL_LABELS = [m[1] for m in ELEVENLABS_MODELS]

MOCK_TEXT = (
    "# Chapter 3\n"
    "## Asyncio Walk-Through\n\n"
    "**Asyncio** provides another tool for **concurrent programming** in Python, that is more "
    "lightweight than *threads* or *multiprocessing*. In a very simple sense it does this by "
    "having an **event loop** execute a collection of tasks, with a key difference being that "
    "each task chooses when to yield control back to the event loop.\n\n"
    "—Philip Jones, *\"Understanding Asyncio\"*"
)
MOCK_KEY_TERMS = ["asyncio", "concurrent", "multiprocessing", "lightweight", "yield"]

# ── Helpers ───────────────────────────────────────────────────────────────────
def split_paragraphs(text: str) -> list[str]:
    parts = re.split(r"\n{2,}", text)
    return [p.strip() for p in parts if p.strip()]


def render_karaoke(audio_bytes: bytes, word_timings: list[dict], markdown_text: str = "") -> None:
    """Karaoke player: markdown-rendered text with per-word highlighting + stacked dictionary."""
    audio_b64   = base64.b64encode(audio_bytes).decode()
    words_json  = json.dumps(word_timings)
    md_json     = json.dumps(markdown_text)   # safely escape for JS

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: transparent;
    padding: 12px 4px 16px;
    color-scheme: light dark;
  }}

  /* ── Audio ── */
  audio {{ width: 100%; margin-bottom: 20px; border-radius: 8px; }}

  /* ── Markdown stage ── */
  #stage {{ color: light-dark(#1a1a1a, #e8e8e8); line-height: 1.9; }}
  #stage h1   {{ font-size: 1.7rem;  font-weight: 700; margin: 0 0 4px; }}
  #stage h2   {{ font-size: 1.3rem;  font-weight: 600; margin: 16px 0 6px; color: light-dark(#333,#ccc); }}
  #stage h3   {{ font-size: 1.1rem;  font-weight: 600; margin: 12px 0 4px; }}
  #stage p    {{ font-size: 1.15rem; margin: 10px 0; }}
  #stage strong {{ font-weight: 700; }}
  #stage em     {{ font-style: italic; }}
  #stage blockquote {{
    border-left: 3px solid light-dark(#ddd,#444);
    padding-left: 12px; margin: 8px 0;
    color: light-dark(#555,#aaa);
  }}

  /* ── Word spans ── */
  .w {{
    display: inline;
    padding: 2px 3px;
    border-radius: 4px;
    cursor: pointer;
    transition: background .07s, color .07s;
  }}
  .w:hover  {{ background: light-dark(rgba(0,0,0,.07), rgba(255,255,255,.1)); }}
  .w.spoken {{ color: light-dark(#bbb, #4a4a4a); }}
  .w.active {{
    background: #facc15; color: #111 !important;
    font-weight: 700; box-shadow: 0 1px 5px rgba(0,0,0,.2);
  }}

  /* ── Overlay ── */
  #overlay {{
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,.5);
    z-index: 900;
    align-items: center; justify-content: center;
  }}
  #overlay.open {{ display: flex; }}

  /* ── Modal stack container ── */
  #stack-wrap {{
    position: relative;
    width: min(520px, 94vw);
    /* height determined by top card; lower cards peek behind */
  }}

  /* Each card in the stack */
  .modal-card {{
    background: light-dark(#fff, #1e1e1e);
    color: light-dark(#111, #eee);
    border-radius: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,.4);
    padding: 22px 26px 26px;
    width: 100%;
    max-height: 78vh;
    overflow-y: auto;
    position: relative;
  }}
  /* Cards below the top one sit behind, slightly scaled down */
  .modal-card.under {{
    position: absolute;
    top: 0; left: 0;
    pointer-events: none;
    overflow: hidden;
  }}

  @keyframes slideIn {{
    from {{ transform: translateY(18px) scale(.97); opacity: 0; }}
    to   {{ transform: translateY(0)    scale(1);   opacity: 1; }}
  }}
  .modal-card.top {{ animation: slideIn .18s ease; }}

  /* ── Card header row ── */
  .card-header {{
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 16px;
  }}
  .btn-back, .btn-close {{
    background: light-dark(#f0f0f0, #2a2a2a);
    border: none; border-radius: 50%;
    width: 30px; height: 30px;
    font-size: .88rem; cursor: pointer; color: inherit;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background .1s;
  }}
  .btn-back:hover, .btn-close:hover {{
    background: light-dark(#e2e2e2, #3a3a3a);
  }}
  .breadcrumb {{
    font-size: .8rem;
    color: light-dark(#999, #666);
    flex: 1;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }}
  .breadcrumb strong {{ color: light-dark(#555, #aaa); }}

  /* ── Dictionary content ── */
  .dict-word  {{ font-size: 2rem; font-weight: 700; letter-spacing: -.5px; margin-bottom: 2px; }}
  .dict-phon  {{
    font-size: .95rem; color: light-dark(#666, #aaa);
    margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }}
  .phon-text {{
    font-family: "Segoe UI", "Noto Sans", sans-serif;
  }}
  .phon-btn {{
    display: inline-flex; align-items: center; gap: 4px;
    cursor: pointer;
    background: light-dark(#f0f4ff, #1a2340);
    color: #2563eb;
    border: 1px solid light-dark(#c7d8ff, #2a3d6e);
    border-radius: 20px;
    padding: 2px 10px 2px 7px;
    font-size: .88rem;
    transition: background .12s, box-shadow .12s;
    user-select: none;
  }}
  .phon-btn:hover {{
    background: light-dark(#ddeaff, #223060);
    box-shadow: 0 1px 6px rgba(37,99,235,.2);
  }}
  .phon-btn.playing {{
    background: #2563eb;
    color: #fff;
    border-color: #2563eb;
  }}
  .phon-icon {{ font-size: 1rem; }}
  .dict-pos   {{ font-size: .75rem; font-weight: 700; text-transform: uppercase;
                 letter-spacing: .09em; color: light-dark(#888, #666); margin: 14px 0 5px; }}
  .dict-def   {{ font-size: .97rem; line-height: 1.6; margin: 5px 0 3px 10px; }}
  .dict-ex    {{ font-size: .88rem; font-style: italic;
                 color: light-dark(#777, #888); margin: 2px 0 6px 10px; }}
  .dict-syns  {{ font-size: .82rem; color: light-dark(#888, #666); margin-top: 6px; }}
  .dict-hr    {{ border: none; border-top: 1px solid light-dark(#eee, #2e2e2e); margin: 14px 0; }}
  .not-found  {{ color: light-dark(#888, #777); font-style: italic; padding: 12px 0; }}
  .spinner    {{ text-align: center; padding: 24px;
                 font-size: .9rem; color: light-dark(#888, #777); }}

  /* ── Clickable words inside modal ── */
  .dl {{
    cursor: pointer;
    border-bottom: 1px dotted light-dark(#bbb, #555);
    transition: color .1s, border-color .1s;
  }}
  .dl:hover {{
    color: #2563eb;
    border-bottom-color: #2563eb;
  }}
</style>
</head>
<body>

<audio id="player" controls preload="auto">
  <source src="data:audio/mpeg;base64,{audio_b64}" type="audio/mpeg">
</audio>
<div id="stage"></div>

<div id="overlay">
  <div id="stack-wrap"></div>
</div>

<script>
const timings   = {words_json};
const mdSource  = {md_json};
const player    = document.getElementById("player");
const stage     = document.getElementById("stage");
const overlay   = document.getElementById("overlay");
const stackWrap = document.getElementById("stack-wrap");

// ── Render markdown then map word timings sequentially onto text nodes ─────
stage.innerHTML = marked.parse(mdSource);

let wordIdx = 0;

function wrapTextNode(node) {{
  const parts = node.textContent.split(/([ \\t\\n]+)/);
  // Don't skip single-word nodes — they need spans too (e.g. **bold** or *italic* words)
  if (parts.length === 1 && /^[ \\t\\n]*$/.test(parts[0] || "")) return;
  const frag = document.createDocumentFragment();
  parts.forEach(part => {{
    if (!part) return;
    if (/^[ \\t\\n]+$/.test(part)) {{
      frag.appendChild(document.createTextNode(part));
    }} else {{
      if (wordIdx < timings.length) {{
        const t  = timings[wordIdx++];
        const sp = document.createElement("span");
        sp.className = "w";
        sp.dataset.s = t.start; sp.dataset.e = t.end; sp.dataset.w = part;
        sp.textContent = part;
        frag.appendChild(sp);
      }} else {{
        frag.appendChild(document.createTextNode(part));
      }}
    }}
  }});
  node.parentNode.replaceChild(frag, node);
}}

// Walk all text nodes in the rendered markdown
(function walk(el) {{
  const children = [...el.childNodes];
  children.forEach(child => {{
    if (child.nodeType === Node.TEXT_NODE) wrapTextNode(child);
    else if (child.nodeType === Node.ELEMENT_NODE) walk(child);
  }});
}})(stage);

const spans = stage.querySelectorAll(".w");
let lastActive = -1;

// ── Karaoke highlight ─────────────────────────────────────────────────────
player.addEventListener("timeupdate", () => {{
  const t = player.currentTime;
  let lo = 0, hi = timings.length - 1, found = -1;
  while (lo <= hi) {{
    const mid = (lo + hi) >> 1;
    if      (timings[mid].end   < t) lo = mid + 1;
    else if (timings[mid].start > t) hi = mid - 1;
    else {{ found = mid; break; }}
  }}
  if (found === lastActive) return;
  // Mark every word from lastActive up to (not including) found as spoken
  const from = lastActive >= 0 ? lastActive : 0;
  const to   = found >= 0 ? found : timings.length;
  for (let i = from; i < to; i++) {{
    spans[i].classList.remove("active");
    spans[i].classList.add("spoken");
  }}
  if (found >= 0) {{
    spans[found].classList.add("active");
    spans[found].classList.remove("spoken");
    spans[found].scrollIntoView({{ behavior:"smooth", block:"nearest" }});
  }}
  lastActive = found;
}});

player.addEventListener("seeked", () => {{
  const t = player.currentTime;
  spans.forEach((sp,i) => {{
    sp.classList.remove("active","spoken");
    if (timings[i].end < t) sp.classList.add("spoken");
  }});
  lastActive = -1;
}});

// ── Modal stack ───────────────────────────────────────────────────────────
let stack = []; // array of {{ word, html }}

function cleanWord(w) {{
  return w.replace(/[^a-zA-Z'-]/g,"").toLowerCase();
}}

function rebuildStack() {{
  stackWrap.innerHTML = "";
  if (!stack.length) {{ overlay.classList.remove("open"); return; }}
  overlay.classList.add("open");

  // Render ghost cards behind (bottom → top-1)
  stack.slice(0, -1).forEach((item, i) => {{
    const depth = stack.length - 1 - i;          // distance from top
    const scale = 1 - depth * 0.04;
    const translateY = -depth * 10;
    const ghost = document.createElement("div");
    ghost.className = "modal-card under";
    ghost.style.cssText = `
      transform: scale(${{scale}}) translateY(${{translateY}}px);
      transform-origin: top center;
      opacity: ${{Math.max(0, 1 - depth * 0.3)}};
      z-index: ${{900 + i}};
      height: 80px;          /* only the top strip is visible */
      top: ${{depth * -6}}px;
    `;
    ghost.innerHTML = `<div class="dict-word" style="font-size:1.1rem;opacity:.5">${{item.word}}</div>`;
    stackWrap.appendChild(ghost);
  }});

  // Render top card
  const top = stack[stack.length - 1];
  const card = document.createElement("div");
  card.className = "modal-card top";
  card.style.zIndex = 900 + stack.length;
  card.style.position = "relative";

  // Header
  const hdr = document.createElement("div");
  hdr.className = "card-header";

  if (stack.length > 1) {{
    const btnBack = document.createElement("button");
    btnBack.className = "btn-back";
    btnBack.title = "Back";
    btnBack.innerHTML = "←";
    btnBack.onclick = () => {{ stack.pop(); rebuildStack(); }};
    hdr.appendChild(btnBack);

    const bc = document.createElement("div");
    bc.className = "breadcrumb";
    bc.innerHTML = stack.slice(0,-1).map((s,i) =>
      `<span style="cursor:pointer;text-decoration:underline dotted"
             onclick="popTo(${{i+1}})">${{s.word}}</span>`
    ).join(" › ");
    hdr.appendChild(bc);
  }}

  const btnClose = document.createElement("button");
  btnClose.className = "btn-close";
  btnClose.title = "Close";
  btnClose.innerHTML = "✕";
  btnClose.onclick = closeAll;
  hdr.appendChild(btnClose);

  card.appendChild(hdr);

  // Body
  const body = document.createElement("div");
  body.innerHTML = top.html;
  makeClickable(body);
  card.appendChild(body);
  stackWrap.appendChild(card);
}}

function popTo(depth) {{
  stack = stack.slice(0, depth);
  rebuildStack();
}}

function closeAll() {{
  stack = [];
  rebuildStack();
}}

overlay.addEventListener("click", e => {{ if (e.target === overlay) closeAll(); }});
document.addEventListener("keydown", e => {{
  if (e.key === "Escape") {{
    if (stack.length > 1) {{ stack.pop(); rebuildStack(); }}
    else closeAll();
  }}
}});

// ── Phonetic audio playback ───────────────────────────────────────────────
let currentPhonAudio = null;
function playPhonetic(btn) {{
  // Stop any already-playing phonetic
  if (currentPhonAudio) {{
    currentPhonAudio.pause();
    document.querySelectorAll(".phon-btn.playing").forEach(b => b.classList.remove("playing"));
    if (currentPhonAudio._btn === btn) {{      // toggle off if same button
      currentPhonAudio = null;
      return;
    }}
  }}
  const url = btn.dataset.audio;
  if (!url) return;
  const audio = new Audio(url);
  audio._btn  = btn;
  btn.classList.add("playing");
  audio.play();
  audio.addEventListener("ended",  () => {{ btn.classList.remove("playing"); currentPhonAudio = null; }});
  audio.addEventListener("error",  () => {{ btn.classList.remove("playing"); currentPhonAudio = null; }});
  currentPhonAudio = audio;
}}

// ── Make every word in a container clickable ──────────────────────────────
function makeClickable(container) {{
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);

  nodes.forEach(node => {{
    const parts = node.textContent.split(/([ \\t\\n]+)/);
    if (parts.length <= 1) return;
    const frag = document.createDocumentFragment();
    parts.forEach(part => {{
      if (!part || /^[ \\t\\n]+$/.test(part)) {{
        frag.appendChild(document.createTextNode(part));
      }} else {{
        const sp = document.createElement("span");
        sp.className = "dl";
        sp.textContent = part;
        sp.addEventListener("click", e => {{
          e.stopPropagation();
          lookupWord(part);
        }});
        frag.appendChild(sp);
      }}
    }});
    node.parentNode.replaceChild(frag, node);
  }});
}}

// ── Fetch + push to stack ─────────────────────────────────────────────────
function buildEntryHTML(entry) {{
  // Find the best phonetic text + audio URL
  const phonetics = entry.phonetics || [];
  const phonetic  = entry.phonetic
    || phonetics.map(p => p.text).filter(Boolean)[0] || "";
  const audioUrl  = phonetics.map(p => p.audio).filter(Boolean)[0] || "";

  let h = `<div class="dict-word">${{entry.word}}</div>`;

  if (phonetic || audioUrl) {{
    h += `<div class="dict-phon">`;
    if (phonetic) h += `<span class="phon-text">${{phonetic}}</span>`;
    if (audioUrl) h += `<button class="phon-btn" data-audio="${{audioUrl}}"
        onclick="playPhonetic(this)">
        <span class="phon-icon">🔊</span>${{phonetic || "Listen"}}
      </button>`;
    h += `</div>`;
  }}
  (entry.meanings||[]).slice(0,4).forEach((m,mi) => {{
    if (mi>0) h += `<hr class="dict-hr">`;
    h += `<div class="dict-pos">${{m.partOfSpeech}}</div>`;
    (m.definitions||[]).slice(0,3).forEach(d => {{
      h += `<div class="dict-def">· ${{d.definition}}</div>`;
      if (d.example) h += `<div class="dict-ex">"${{d.example}}"</div>`;
    }});
    const syns = (m.synonyms||[]).slice(0,6);
    if (syns.length) h += `<div class="dict-syns">Synonyms: ${{syns.join(" · ")}}</div>`;
  }});
  return h;
}}

async function lookupWord(raw) {{
  const word = cleanWord(raw);
  if (!word || word.length < 2) return;

  // Seek on karaoke click
  const kSpan = [...spans].find(s => s.dataset.w === raw);
  if (kSpan) {{ player.currentTime = parseFloat(kSpan.dataset.s); player.play(); }}

  // Push spinner card immediately
  stack.push({{ word, html: `<div class="spinner">Looking up <strong>${{word}}</strong>…</div>` }});
  rebuildStack();

  try {{
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${{word}}`);
    if (!res.ok) throw 0;
    const data = await res.json();
    stack[stack.length-1] = {{ word, html: buildEntryHTML(data[0]) }};
  }} catch (_) {{
    stack[stack.length-1] = {{
      word,
      html: `<div class="dict-word">${{word}}</div>
             <p class="not-found">No entry found for "<em>${{word}}</em>".</p>`
    }};
  }}
  rebuildStack();
}}

// ── Karaoke word click ────────────────────────────────────────────────────
spans.forEach(sp => {{
  sp.addEventListener("click", e => {{
    e.stopPropagation();
    lookupWord(sp.dataset.w);
  }});
}});
</script>
</body>
</html>"""

    lines = max(4, len(word_timings) // 7)
    components.html(html, height=110 + lines * 50, scrolling=False)


@st.cache_data(show_spinner=False)
def cached_definition(word: str) -> dict | None:
    return fetch_word_definition(word)


@st.cache_data(show_spinner=False)
def cached_key_terms(text: str, model: str, key: str) -> list[str]:
    return identify_key_terms(text, gemini_model=model, api_key=key)


# ── Dictionary card ───────────────────────────────────────────────────────────
def render_dictionary_card(entry: dict) -> None:
    """Render a single macOS-Dictionary-style card for a word entry."""
    with st.container(border=True):
        # Word + phonetic header
        h_col, p_col = st.columns([3, 2])
        with h_col:
            st.markdown(f"## {entry['word']}")
        with p_col:
            phonetic = entry.get("phonetic") or next(
                (p.get("text", "") for p in entry.get("phonetics", []) if p.get("text")), ""
            )
            if phonetic:
                st.markdown(f"<br><span style='color:gray;font-size:1rem'>{phonetic}</span>",
                            unsafe_allow_html=True)

        # Meanings
        for meaning in entry.get("meanings", [])[:3]:
            pos = meaning.get("partOfSpeech", "")
            st.markdown(f"*{pos}*")
            for defn in meaning.get("definitions", [])[:2]:
                st.markdown(f"&nbsp;&nbsp;**·** {defn['definition']}")
                if defn.get("example"):
                    st.markdown(
                        f"<span style='color:#888;font-size:0.85rem;margin-left:1.2rem'>"
                        f"&ldquo;{defn['example']}&rdquo;</span>",
                        unsafe_allow_html=True,
                    )
            # Synonyms
            syns = meaning.get("synonyms", [])[:5]
            if syns:
                st.caption("Synonyms: " + " · ".join(syns))


# ── Dialog ────────────────────────────────────────────────────────────────────
@st.dialog("📖 Paragraph", width="large")
def paragraph_dialog(paragraph: str, index: int) -> None:
    st.caption(f"Paragraph {index + 1}")
    st.markdown(paragraph)
    st.divider()

    # ── Dictionary section ────────────────────────────────────────────────────
    st.subheader("📚 Dictionary")

    g_key   = st.session_state.get("g_key", "")
    g_model = st.session_state.get("g_model", DEFAULT_GEMINI_MODEL)
    is_mock = st.session_state.get("mock_gemini", False)

    with st.spinner("Finding key terms…"):
        try:
            terms = MOCK_KEY_TERMS if is_mock else cached_key_terms(paragraph, g_model, g_key)
        except Exception as e:
            st.warning(f"Could not identify key terms: {e}")
            terms = []

    if not terms:
        st.info("No key terms found.")
        return

    st.caption(f"Gemini selected: {' · '.join(terms)}")
    st.write("")

    found_any = False
    for word in terms:
        with st.spinner(f"Looking up *{word}*…"):
            entry = cached_definition(word)
        if entry:
            found_any = True
            render_dictionary_card(entry)
            st.write("")
        else:
            st.caption(f"_{word}: no entry found_")

    if not found_any:
        st.info("No dictionary entries found for the selected terms.")

    st.divider()
    # ── Translation placeholder ───────────────────────────────────────────────
    st.subheader("🌐 Translation")
    st.info("Translation feature coming soon — a Translate API will be wired here.", icon="🔧")


# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="English Reader & Translator",
    page_icon="🎙️",
    layout="wide",
)

# ── Session state init ────────────────────────────────────────────────────────
for key, default in [("audio_bytes", None), ("word_timings", []),
                     ("paragraphs", []), ("extracted", ""),
                     ("g_key", ""), ("g_model", DEFAULT_GEMINI_MODEL),
                     ("mock_gemini", False)]:
    if key not in st.session_state:
        st.session_state[key] = default

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Settings")

    st.subheader("API Keys")
    gemini_key = st.text_input("Gemini API Key",     value=os.environ.get("GEMINI_API_KEY", ""),     type="password")
    eleven_key = st.text_input("ElevenLabs API Key", value=os.environ.get("ELEVENLABS_API_KEY", ""), type="password")
    voice_id   = st.text_input(
        "ElevenLabs Voice ID",
        value=os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb"),
        help="Find voice IDs at elevenlabs.io/voice-library",
    )

    st.divider()
    mock_gemini = st.checkbox("Mock Gemini (skip API call)",     value=False, help="Use hardcoded text")
    mock_eleven = st.checkbox("Mock ElevenLabs (skip API call)", value=False, help="Use bundled mock_audio.mp3")

    # Keep session state in sync so the dialog can read them
    st.session_state.g_key      = gemini_key.strip()
    st.session_state.g_model    = None  # filled after model selectbox below
    st.session_state.mock_gemini = mock_gemini

    st.divider()
    st.subheader("Models")
    gemini_model_idx = st.selectbox(
        "Gemini Model",
        options=range(len(GEMINI_MODELS)),
        format_func=lambda i: GEMINI_MODEL_LABELS[i],
        index=GEMINI_MODEL_IDS.index(DEFAULT_GEMINI_MODEL),
    )
    selected_gemini_model = GEMINI_MODEL_IDS[gemini_model_idx]
    st.session_state.g_model = selected_gemini_model

    eleven_model_idx = st.selectbox(
        "ElevenLabs Model",
        options=range(len(ELEVENLABS_MODELS)),
        format_func=lambda i: ELEVEN_MODEL_LABELS[i],
        index=ELEVEN_MODEL_IDS.index(DEFAULT_ELEVENLABS_MODEL),
    )
    selected_eleven_model = ELEVEN_MODEL_IDS[eleven_model_idx]

    st.divider()
    st.subheader("Voice Settings")
    stability  = st.slider("Stability",        0.0, 1.0, 0.5,  0.05)
    similarity = st.slider("Similarity Boost", 0.0, 1.0, 0.75, 0.05)
    speed      = st.slider("Speed",            0.5, 2.0, 1.0,  0.05)
    style      = st.slider("Style",            0.0, 1.0, 0.0,  0.05)

# ── Main area ─────────────────────────────────────────────────────────────────
st.title("🎙️ English Reader & Translator")
st.caption(
    f"**Gemini:** `{selected_gemini_model}` &nbsp;|&nbsp; "
    f"**ElevenLabs:** `{selected_eleven_model}`"
)

tab_file, tab_text = st.tabs(["📄 Upload File", "✏️ Paste Text"])

# ── Tab 1: File ───────────────────────────────────────────────────────────────
with tab_file:
    uploaded     = st.file_uploader("Upload PDF, TXT or MD", type=["pdf", "txt", "md"], label_visibility="collapsed")
    page_indices = None
    tmp_pdf_path = None

    if uploaded:
        suffix = "." + uploaded.name.rsplit(".", 1)[-1].lower()
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(uploaded.read())
            tmp_pdf_path = tmp.name

        if suffix == ".pdf":
            total_pages = get_pdf_page_count(tmp_pdf_path)
            st.info(f"📑 PDF has **{total_pages}** page(s)")
            use_all = st.checkbox("Process all pages", value=True)
            if not use_all:
                col1, col2 = st.columns([3, 1])
                with col1:
                    page_input = st.text_input("Pages", placeholder="e.g. 1-3, 5, 7-9")
                with col2:
                    st.write(""); st.write("")
                    if page_input:
                        try:
                            page_indices = parse_page_ranges(page_input, total_pages)
                            st.success(f"{len(page_indices)} page(s)")
                        except Exception:
                            st.error("Invalid format")
                            page_indices = None

    generate_file = st.button("🚀 Generate Audio", key="btn_file", disabled=uploaded is None)

# ── Tab 2: Text ───────────────────────────────────────────────────────────────
with tab_text:
    pasted_text = st.text_area("Paste text", height=280,
                               placeholder="Type or paste text…", label_visibility="collapsed")
    generate_text = st.button("🚀 Generate Audio", key="btn_text",
                              disabled=not pasted_text.strip())

# ── Pipeline ──────────────────────────────────────────────────────────────────
def run_pipeline(input_path: str | None, inline_text: str | None, indices: list[int] | None) -> None:
    g_key = gemini_key.strip()
    e_key = eleven_key.strip()

    if not g_key: st.error("Enter your Gemini API Key in the sidebar."); return
    if not e_key: st.error("Enter your ElevenLabs API Key in the sidebar."); return

    voice_settings = {"stability": stability, "similarity_boost": similarity,
                      "speed": speed, "style": style, "use_speaker_boost": True}

    with st.status("Processing…", expanded=True) as status:
        # Step 1: Gemini
        if mock_gemini:
            st.write("🧪 Using mock text (Gemini skipped)")
            extracted = MOCK_TEXT
        else:
            st.write(f"🤖 Sending to **{selected_gemini_model}**…")
            try:
                extracted = extract_text_from_gemini(
                    input_path, inline_text, indices, selected_gemini_model, api_key=g_key
                )
            except Exception as e:
                st.error(f"Gemini error: {e}")
                status.update(label="Failed", state="error")
                return

        st.write(f"✅ Text extracted — {len(extracted):,} characters")
        st.session_state.extracted  = extracted
        st.session_state.paragraphs = split_paragraphs(extracted)

        # Step 2: ElevenLabs
        if mock_eleven:
            st.write("🧪 Using mock audio (ElevenLabs skipped — karaoke unavailable)")
            mock_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_audio.mp3")
            with open(mock_path, "rb") as mf:
                st.session_state.audio_bytes = mf.read()
            st.session_state.word_timings = []
        else:
            st.write(f"🔊 Generating audio + word timestamps via **{selected_eleven_model}**…")
            try:
                audio_bytes, word_timings = generate_with_timestamps(
                    extracted,
                    voice_settings=voice_settings,
                    elevenlabs_model=selected_eleven_model,
                    voice_id=voice_id.strip() or None,
                    api_key=e_key,
                )
                st.session_state.audio_bytes  = audio_bytes
                st.session_state.word_timings = word_timings
            except Exception as e:
                st.error(f"ElevenLabs error: {e}")
                status.update(label="Failed", state="error")
                return

        status.update(label="✅ Ready!", state="complete")


if generate_file and uploaded:
    run_pipeline(tmp_pdf_path, None, page_indices)
if generate_text and pasted_text.strip():
    run_pipeline(None, pasted_text.strip(), None)

# ── Results: karaoke player ───────────────────────────────────────────────────
if st.session_state.audio_bytes:
    st.divider()
    col_title, col_dl = st.columns([4, 1])
    with col_title:
        st.subheader("🎧 Listen")
    with col_dl:
        st.write("")
        st.download_button("⬇️ Download MP3", data=st.session_state.audio_bytes,
                           file_name="output.mp3", mime="audio/mpeg")

    if st.session_state.word_timings:
        render_karaoke(
            st.session_state.audio_bytes,
            st.session_state.word_timings,
            st.session_state.get("extracted", ""),
        )
    else:
        # Mock mode fallback — plain audio player
        st.audio(st.session_state.audio_bytes, format="audio/mp3")
        st.caption("ℹ️ Word highlighting requires real ElevenLabs (disable Mock ElevenLabs)")

# ── Results: paragraph cards ──────────────────────────────────────────────────
if st.session_state.paragraphs:
    st.divider()
    st.subheader(f"📄 Paragraphs  ({len(st.session_state.paragraphs)})")
    st.caption("Click 👁️ on any paragraph to see its dictionary entries.")

    for i, para in enumerate(st.session_state.paragraphs):
        with st.container(border=True):
            col_text, col_btn = st.columns([11, 1])
            with col_text:
                # Render full markdown; truncate plain preview for long paragraphs
                plain = strip_markdown(para)
                if len(plain) > 220:
                    st.markdown(para)          # full markdown (headings, bold, etc.)
                    st.caption(f"{plain[220:].split()[0] and '…' or ''}")
                else:
                    st.markdown(para)
            with col_btn:
                if st.button("👁️", key=f"view_{i}", help="Open dictionary view"):
                    paragraph_dialog(para, i)
