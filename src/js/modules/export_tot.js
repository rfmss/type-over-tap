// src/js/modules/export_tot.js
// TOT/1 — Transfer Only Text (cápsula offline)

function downloadTextAsFile(text, filename) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function exportTot(store) {
  buildTotPayloadWithChain(store).then((payload) => {
    const filename = `TOT_${Date.now()}.tot`;
    downloadTextAsFile(JSON.stringify(payload, null, 2), filename);
  });
}

export function importTot(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.HEADER || !parsed.ARCHIVE_STATE) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function normalizeText(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function htmlToText(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.innerText || "";
}

function collectWorkbenchState() {
  const state = { registry: [], pages: {}, positions: {}, titles: {}, colors: {} };
  const registry = localStorage.getItem("totbook_registry");
  if (registry) {
    try {
      state.registry = JSON.parse(registry);
    } catch (_) {
      state.registry = [];
    }
  }
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith("pages_")) state.pages[key] = localStorage.getItem(key);
    if (key.startsWith("pos_")) state.positions[key] = localStorage.getItem(key);
    if (key.startsWith("title_")) state.titles[key] = localStorage.getItem(key);
    if (key.startsWith("color_")) state.colors[key] = localStorage.getItem(key);
  }
  return state;
}

export function buildTotPayload(store) {
  const data = store.data || {};
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const active = projects.find(p => p.id === data.activeId) || projects[0] || null;
  const activeHtml = active ? active.content : "";
  const masterText = normalizeText(htmlToText(activeHtml));

  const birthRaw = localStorage.getItem("lit_birth_tracker");
  let birth = null;
  try { birth = birthRaw ? JSON.parse(birthRaw) : null; } catch (_) { birth = null; }

  return {
    HEADER: {
      VERSION: "TOT/2",
      APP: "TΦT Writer - Type over Tap",
      CREATED: new Date().toISOString(),
      CERT: birth && birth.cert ? birth.cert : "UNKNOWN"
    },
    MANIFEST: {
      accepted: localStorage.getItem("tot_manifest_signed") === "true",
      accepted_at: localStorage.getItem("tot_manifest_signed_at") || "",
      text: localStorage.getItem("tot_manifest_text") || ""
    },
    ACCESS: {
      count: parseInt(localStorage.getItem("tot_access_count"), 10) || 0
    },
    SESSION_CONFIG: {
      theme: localStorage.getItem("lit_theme_pref") || "paper",
      fontIndex: localStorage.getItem("lit_pref_font") || "0",
      fontSize: localStorage.getItem("lit_pref_font_size") || "",
      lang: localStorage.getItem("lit_lang") || "pt"
    },
    MASTER_TEXT: masterText,
    ARCHIVE_STATE: data,
    WORKBENCH_STATE: collectWorkbenchState()
  };
}

export async function buildTotPayloadWithChain(store) {
  const payload = buildTotPayload(store);
  const chain = await buildBirthChain(payload.MASTER_TEXT || "");
  payload.BIRTH_CHAIN = chain;
  return payload;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function buildBirthChain(text) {
  const prevRaw = localStorage.getItem("tot_birth_chain");
  const historyRaw = localStorage.getItem("tot_birth_chain_history");
  let prev = null;
  let history = [];
  try { prev = prevRaw ? JSON.parse(prevRaw) : null; } catch (_) { prev = null; }
  try { history = historyRaw ? JSON.parse(historyRaw) : []; } catch (_) { history = []; }
  if (!Array.isArray(history)) history = [];

  const prevHash = prev && prev.hash ? prev.hash : "";
  const createdAt = new Date().toISOString();
  const hash = await sha256Hex(`${text}\n${prevHash}`);
  const entry = {
    algo: "SHA-256",
    created_at: createdAt,
    prev_hash: prevHash || null,
    hash
  };
  history.push(entry);
  const chain = {
    algo: "SHA-256",
    created_at: createdAt,
    prev_hash: prevHash || null,
    hash,
    history
  };
  localStorage.setItem("tot_birth_chain", JSON.stringify({ hash, created_at: createdAt }));
  localStorage.setItem("tot_birth_chain_history", JSON.stringify(history));
  return chain;
}
