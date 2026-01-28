import { store } from './store.js';
import { ui } from './ui.js';
import { lang } from './lang.js';
import { qrTransfer } from './qr_transfer.js';

const MOBILE_NOTES_KEY = "tot_mobile_notes_v1";
let mobileNotesCache = [];
let mobileNotesFilter = { search: "", folder: "" };
let mobileEditingId = null;

const downloadText = (text, filename, mime) => {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

const normalizeTag = (tag) => String(tag || "").trim().replace(/^#/, "").toLowerCase();
const normalizeFolder = (folder) => String(folder || "").trim();
const getActiveProject = () => (store.getActive && store.getActive());

const buildNoteExcerpt = (text) => {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return lang.t("mobile_memo_ph");
    return clean.length > 140 ? `${clean.slice(0, 140)}…` : clean;
};

const loadMobileNotes = () => {
    if (Array.isArray(store.data.mobileNotes) && store.data.mobileNotes.length) return store.data.mobileNotes;
    try {
        const raw = localStorage.getItem(MOBILE_NOTES_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
};

const saveMobileNotes = (notes) => {
    store.data.mobileNotes = Array.isArray(notes) ? notes : [];
    store.persist(true);
    localStorage.setItem(MOBILE_NOTES_KEY, JSON.stringify(notes));
};

const updateMobileViewCounts = () => {
    const notesCount = document.getElementById("mobileNotesCount");
    const filesCount = document.getElementById("mobileFilesCount");
    const favCount = document.getElementById("mobileFavCount");
    const projCount = document.getElementById("mobileProjectsCount");
    const tagsCount = document.getElementById("mobileTagsCount");
    if (notesCount) notesCount.textContent = mobileNotesCache.length;
    const folders = Array.from(new Set(mobileNotesCache.map(n => normalizeFolder(n.folder)).filter(Boolean)));
    if (filesCount) filesCount.textContent = folders.length;
    const tags = new Set();
    mobileNotesCache.forEach(note => (note.tags || []).forEach(tag => tags.add(normalizeTag(tag))));
    if (tagsCount) tagsCount.textContent = tags.size;
    const favs = mobileNotesCache.filter(note => (note.tags || []).map(normalizeTag).includes("fav") || (note.tags || []).map(normalizeTag).includes("favorito") || (note.tags || []).map(normalizeTag).includes("φ"));
    if (favCount) favCount.textContent = favs.length;
    if (projCount) projCount.textContent = (store.data.projects || []).length;
};

const renderMobileFolders = () => {
    const list = document.getElementById("mobileFoldersList");
    if (!list) return;
    const folders = Array.from(new Set(mobileNotesCache.map(n => normalizeFolder(n.folder)).filter(Boolean)));
    list.innerHTML = "";
    if (!folders.length) {
        list.innerHTML = `<span class="mobile-memo-meta">${lang.t("mobile_files_hint")}</span>`;
        return;
    }
    const allBtn = document.createElement("button");
    allBtn.className = "mobile-memo-tag";
    allBtn.type = "button";
    allBtn.textContent = lang.t("mobile_files_all");
    allBtn.onclick = () => {
        mobileNotesFilter.folder = "";
        renderMobileNotes();
    };
    list.appendChild(allBtn);
    folders.forEach(folder => {
        const btn = document.createElement("button");
        btn.className = "mobile-memo-tag";
        btn.type = "button";
        btn.textContent = folder;
        btn.onclick = () => {
            mobileNotesFilter.folder = folder;
            renderMobileNotes();
        };
        list.appendChild(btn);
    });
    updateMobileViewCounts();
};

const renderMobileTags = () => {
    const list = document.getElementById("mobileTagsList");
    if (!list) return;
    const tags = new Set();
    mobileNotesCache.forEach(note => {
        (note.tags || []).forEach(tag => tags.add(normalizeTag(tag)));
    });
    list.innerHTML = "";
    if (!tags.size) {
        list.innerHTML = `<span class="mobile-memo-meta">${lang.t("mobile_memo_tags")}</span>`;
        return;
    }
    Array.from(tags).forEach(tag => {
        const btn = document.createElement("button");
        btn.className = "mobile-memo-tag";
        btn.type = "button";
        btn.textContent = `#${tag}`;
        btn.onclick = () => {
            const search = document.getElementById("mobileMemoSearch");
            if (search) search.value = `#${tag}`;
            mobileNotesFilter.search = `#${tag}`;
            renderMobileNotes();
        };
        list.appendChild(btn);
    });
    updateMobileViewCounts();
};

const buildChapterBlock = (title, withDivider) => {
    const divider = withDivider
        ? `<div style="border-bottom:1px dashed var(--color-accent); opacity:0.5; margin:30px 0;"></div>`
        : "";
    return `${divider}<h2 class="chapter-mark" style="color:var(--color-accent); margin-top:0;">${title}</h2><p></p>`;
};

const openMobileProjectNote = (proj) => {
    const titleEl = document.getElementById("mobileProjectNoteTitle");
    const inputEl = document.getElementById("mobileProjectNoteInput");
    if (!titleEl || !inputEl) return;
    titleEl.textContent = proj ? proj.name : lang.t("mobile_project_note_empty");
    inputEl.value = proj && proj.mobileNote ? proj.mobileNote : "";
    inputEl.oninput = (e) => {
        const active = getActiveProject();
        if (!active) return;
        active.mobileNote = e.target.value;
        store.persist(true);
    };
};

const createMobileProject = (name) => {
    const chapter1 = lang.t("mobile_chapter_1");
    const chapter2 = lang.t("mobile_chapter_2");
    const content = [
        buildChapterBlock(chapter1, false),
        buildChapterBlock(chapter2, true)
    ].join("");
    store.createProject(name, content);
    const active = store.getActive();
    if (active) {
        active.mobileNote = "";
        store.persist(true);
        openMobileProjectNote(active);
    }
    if (document.getElementById("mobileProjectList")) {
        renderMobileProjects();
    }
};

const renderMobileProjects = () => {
    const list = document.getElementById("mobileProjectList");
    if (!list) return;
    list.innerHTML = "";
    const projects = Array.isArray(store.data.projects) ? store.data.projects : [];
    const projectQr = document.getElementById("btnMobileProjectQr");
    const projectJson = document.getElementById("btnMobileProjectJson");
    projects.forEach((proj) => {
        const card = document.createElement("div");
        card.className = "mobile-memo-card";
        const title = document.createElement("div");
        title.textContent = proj.name || "TΦT";
        title.className = "mobile-memo-meta";
        card.appendChild(title);
        const excerpt = document.createElement("div");
        excerpt.textContent = buildNoteExcerpt(proj.mobileNote || "");
        card.appendChild(excerpt);
        card.onclick = () => {
            store.setActive(proj.id);
            if (typeof window.totLoadActiveDocument === "function") {
                window.totLoadActiveDocument();
            }
            openMobileProjectNote(store.getActive());
            if (sessionStorage.getItem("mobile_project_hint") !== "1") {
                if (window.totModal) window.totModal.alert(lang.t("mobile_project_hint"));
                sessionStorage.setItem("mobile_project_hint", "1");
            }
        };
        list.appendChild(card);
    });
    const active = getActiveProject();
    if (projectQr) projectQr.disabled = !active;
    if (projectJson) projectJson.disabled = !active;
    updateMobileViewCounts();
};

const renderMobileNotes = () => {
    const list = document.getElementById("mobileMemoList");
    if (!list) return;
    let notes = [...mobileNotesCache];
    const search = String(mobileNotesFilter.search || "").trim();
    const folder = normalizeFolder(mobileNotesFilter.folder);
    if (folder) notes = notes.filter(n => normalizeFolder(n.folder) === folder);
    if (search) {
        if (search.startsWith("#")) {
            const tag = normalizeTag(search);
            notes = notes.filter(n => (n.tags || []).map(normalizeTag).includes(tag));
        } else {
            const q = search.toLowerCase();
            notes = notes.filter(n => (n.text || "").toLowerCase().includes(q));
        }
    }
    list.innerHTML = "";
    notes.forEach(note => {
        const card = document.createElement("div");
        card.className = "mobile-memo-card";
        const meta = document.createElement("div");
        meta.className = "mobile-memo-meta";
        const folderLabel = note.folder ? `• ${note.folder}` : "";
        meta.textContent = `${new Date(note.updatedAt || note.createdAt).toLocaleDateString()} ${folderLabel}`.trim();
        card.appendChild(meta);
        const text = document.createElement("div");
        text.textContent = buildNoteExcerpt(note.text);
        card.appendChild(text);
        if (note.tags && note.tags.length) {
            const tags = document.createElement("div");
            tags.className = "mobile-memo-tags-list";
            note.tags.forEach(tag => {
                const chip = document.createElement("span");
                chip.className = "mobile-memo-tag";
                chip.textContent = `#${tag}`;
                tags.appendChild(chip);
            });
            card.appendChild(tags);
        }
        const actions = document.createElement("div");
        actions.className = "mobile-memo-actions-row";
        const editBtn = document.createElement("button");
        editBtn.className = "mobile-memo-btn";
        editBtn.textContent = lang.t("mobile_memo_edit") || "EDITAR";
        editBtn.onclick = (e) => {
            e.stopPropagation();
            const input = document.getElementById("mobileMemoInput");
            const tags = document.getElementById("mobileMemoTags");
            const folderInput = document.getElementById("mobileMemoFolder");
            if (input) input.value = note.text || "";
            if (tags) tags.value = (note.tags || []).join(", ");
            if (folderInput) folderInput.value = note.folder || "";
            mobileEditingId = note.id;
        };
        actions.appendChild(editBtn);
        const copyBtn = document.createElement("button");
        copyBtn.className = "mobile-memo-btn";
        copyBtn.textContent = lang.t("mobile_memo_to_project") || "NO PROJETO";
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            const active = getActiveProject();
            if (!active) return;
            const next = (active.mobileNote || "").trim();
            active.mobileNote = next ? `${next}\n\n${note.text}` : note.text;
            openMobileProjectNote(active);
            store.save(undefined, undefined);
        };
        actions.appendChild(copyBtn);
        const delBtn = document.createElement("button");
        delBtn.className = "mobile-memo-btn danger";
        delBtn.textContent = lang.t("mobile_memo_delete");
        delBtn.onclick = (e) => {
            e.stopPropagation();
            mobileNotesCache = mobileNotesCache.filter(n => n.id !== note.id);
            saveMobileNotes(mobileNotesCache);
            renderMobileNotes();
            renderMobileFolders();
            renderMobileTags();
        };
        actions.appendChild(delBtn);
        card.appendChild(actions);
        list.appendChild(card);
    });
    updateMobileViewCounts();
};

const addOrUpdateMobileNote = (text, tagsRaw, folderRaw) => {
    const tags = tagsRaw.split(",").map(normalizeTag).filter(Boolean);
    const folder = normalizeFolder(folderRaw);
    const now = new Date().toISOString();
    if (mobileEditingId) {
        const existing = mobileNotesCache.find(n => n.id === mobileEditingId);
        if (existing) {
            existing.text = text;
            existing.tags = tags;
            existing.folder = folder;
            existing.updatedAt = now;
        }
        mobileEditingId = null;
    } else {
        mobileNotesCache.unshift({
            id: `note_${Date.now()}`,
            text,
            tags,
            folder,
            createdAt: now,
            updatedAt: now
        });
    }
    saveMobileNotes(mobileNotesCache);
};

const initMobileMemos = () => {
    const memoInput = document.getElementById("mobileMemoInput");
    const memoTags = document.getElementById("mobileMemoTags");
    const memoFolder = document.getElementById("mobileMemoFolder");
    const memoSearch = document.getElementById("mobileMemoSearch");
    const viewItems = document.querySelectorAll(".mobile-view-item");
    const addBtn = document.getElementById("btnAddMobileMemo");
    if (!memoInput) return;

    mobileNotesCache = loadMobileNotes();
    renderMobileNotes();
    renderMobileFolders();
    renderMobileTags();
    renderMobileProjects();

    if (memoSearch) {
        memoSearch.addEventListener("input", (e) => {
            mobileNotesFilter.search = e.target.value;
            renderMobileNotes();
        });
    }

    if (viewItems && viewItems.length) {
        viewItems.forEach(btn => {
            btn.addEventListener("click", () => {
                const target = btn.getAttribute("data-target");
                const filter = btn.getAttribute("data-filter");
                if (filter) {
                    if (memoSearch) memoSearch.value = filter;
                    mobileNotesFilter.search = filter;
                    renderMobileNotes();
                }
                if (target) {
                    const el = document.querySelector(target);
                    if (el && el.scrollIntoView) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                }
            });
        });
    }

    if (addBtn) {
        addBtn.onclick = () => {
            const text = memoInput.value.trim();
            if (!text) return;
            addOrUpdateMobileNote(text, memoTags ? memoTags.value : "", memoFolder ? memoFolder.value : "");
            memoInput.value = "";
            if (memoTags) memoTags.value = "";
            if (memoFolder) memoFolder.value = "";
            renderMobileNotes();
            renderMobileFolders();
            renderMobileTags();
        };
    }

    const btnMobileScan = document.getElementById("btnMobileScan");
    if (btnMobileScan) {
        btnMobileScan.onclick = () => {
            const scanBtn = document.getElementById("btnScanQr");
            if (scanBtn) scanBtn.click();
        };
    }

    const projectQr = document.getElementById("btnMobileProjectQr");
    const projectJson = document.getElementById("btnMobileProjectJson");
    if (projectQr) {
        projectQr.onclick = () => {
            const active = getActiveProject();
            if (!active) return;
            const payload = {
                protocol: "TΦT Mobile Project",
                version: "1.0",
                created_at: new Date().toISOString(),
                project: active
            };
            qrTransfer.startCustomStream(payload, active.name || "TΦT");
        };
    }
    if (projectJson) {
        projectJson.onclick = () => {
            const active = getActiveProject();
            if (!active) return;
            const payload = {
                protocol: "TΦT Mobile Project",
                version: "1.0",
                created_at: new Date().toISOString(),
                project: active
            };
            const safe = (active.name || "tft").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
            downloadText(JSON.stringify(payload, null, 2), `${safe || "tft"}-mobile-project.json`, "application/json");
        };
    }
};

const initMobileIntro = () => {
    if (window.innerWidth > 900) return;
    const intro = document.getElementById("mobileIntroModal");
    const close = document.getElementById("closeMobileIntro");
    const ok = document.getElementById("mobileIntroOk");
    const seen = localStorage.getItem("lit_mobile_intro") === "true";
    if (!intro || seen) return;
    intro.classList.add("active");
    const dismiss = () => {
        intro.classList.remove("active");
        localStorage.setItem("lit_mobile_intro", "true");
    };
    if (close) close.onclick = dismiss;
    if (ok) ok.onclick = dismiss;
    const btnScan = document.getElementById("btnScanQr");
    if (btnScan) btnScan.click();
};

const initMobileFullToggle = () => {
    if (window.innerWidth > 900) return;
    return;
    const btn = document.getElementById("btnMobileFullToggle");
    if (!btn) return;
    const updateLabel = () => {
        const isLite = document.body.classList.contains("mobile-lite");
        btn.textContent = isLite ? lang.t("mobile_full_enable") : lang.t("mobile_full_disable");
    };
    const setFullMode = (enabled) => {
        if (enabled) {
            document.body.classList.remove("mobile-lite");
            localStorage.setItem("lit_mobile_full", "true");
        } else {
            document.body.classList.add("mobile-lite");
            localStorage.setItem("lit_mobile_full", "false");
        }
        enforceMobileLitePanels();
        updateLabel();
    };
    updateLabel();
    btn.onclick = () => {
        const isLite = document.body.classList.contains("mobile-lite");
        setFullMode(isLite);
    };
    document.addEventListener("lang:changed", updateLabel);
    window.setMobileFullMode = setFullMode;
};

const initMobileTapToEdit = () => {
    if (window.innerWidth > 900) return;
    return;
    const panel = document.querySelector(".panel");
    const editorEl = document.getElementById("editor");
    if (!panel) return;
    panel.addEventListener("click", () => {
        if (!document.body.classList.contains("mobile-lite")) return;
        if (typeof window.setMobileFullMode === "function") {
            window.setMobileFullMode(true);
        } else {
            document.body.classList.remove("mobile-lite");
            localStorage.setItem("lit_mobile_full", "true");
            const btn = document.getElementById("btnMobileFullToggle");
            if (btn) btn.textContent = lang.t("mobile_full_disable");
        }
        if (editorEl) editorEl.focus();
    });
};

const initMobileEdgeHandle = () => {
    if (window.innerWidth > 900) return;
    let edgeTimer = null;
    const showEdge = () => {
        document.body.classList.add("mobile-edge");
        if (edgeTimer) clearTimeout(edgeTimer);
        edgeTimer = setTimeout(() => {
            document.body.classList.remove("mobile-edge");
        }, 1200);
    };
    document.addEventListener("touchstart", (e) => {
        const touch = e.touches && e.touches[0];
        if (!touch) return;
        if (touch.clientX <= 18) {
            showEdge();
        }
    }, { passive: true });
};

const enforceMobileLitePanels = () => {
    const isLite = document.body.classList.contains("mobile-lite");
    const panelActions = document.getElementById("panelActions");
    const panelNav = document.getElementById("panelNav");
    if (!panelActions || !panelNav) return;
    if (isLite) {
        panelActions.style.display = "none";
        panelNav.style.display = "none";
    } else {
        panelActions.style.display = "";
        panelNav.style.display = "";
    }
};

export const initMobileFeatures = () => {
    if (window.innerWidth > 900) return;
    initMobileMemos();
    initMobileIntro();
    initMobileFullToggle();
    enforceMobileLitePanels();
    initMobileTapToEdit();
    initMobileEdgeHandle();

    window.totMobileRenderProjects = renderMobileProjects;
    window.totMobileCreateProject = createMobileProject;
    window.totMobileOpenProjectNote = openMobileProjectNote;
};
