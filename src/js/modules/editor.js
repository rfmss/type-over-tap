import { lang } from './lang.js';
import { lexicon } from './lexicon.js';

export const editorFeatures = {
    editor: null,
    fontList: [
        { family: '"IBM-Font", monospace', baseSize: 22, lineHeight: "1.7" },
        { family: '"Georgia", "Times New Roman", serif', baseSize: 20, lineHeight: "1.75" },
        { family: '"Terminal-Font", "IBM-Font", monospace', baseSize: 22, lineHeight: "1.7" }
    ],
    lastSearchValue: "",
    statsRaf: null,
    scrollRaf: null,
    statsUpdateFn: null,
    paginationRaf: null,
    pageMarkers: null,
    pageOverlay: null,
    pageOverlayNumber: null,
    lastPageIndex: 1,
    pageOverlayRaf: null,
    xrayActive: false,
    xrayRaf: null,
    xrayOverlay: null,
    readerModal: null,
    readerBox: null,
    readerContent: null,
    readerGlossary: null,
    lastSelectionRange: null,
    lexiconPopup: null,
    lexiconWord: null,
    lexiconDef: null,
    lexiconTrans: null,
    lexiconRaf: null,
    goalStars: null,
    goalModal: null,
    goalTitle: null,
    goalBody: null,
    goalCompleted: false,
    goalMilestonesDone: [],
    
    // SFX Objects
    sfx: {
        type: new Audio("src/assets/audio/type.wav"),
        enter: new Audio("src/assets/audio/enter.wav"),
        backspace: new Audio("src/assets/audio/backspace.wav"),
        music: new Audio("src/assets/audio/music.mp3")
    },
    
    // Audio Engine
    audioCtx: null, sfxBuffers: {}, gainNode: null,
    musicPlayer: new Audio("src/assets/audio/music.mp3"),
    focusTimer: null,
    focusBlockRaf: null,
    activeBlock: null,
    lastUserScrollTime: 0,
    
    init(editorElement) {
        this.editor = editorElement;
        this.initFonts();
        this.initAudioEngine(); 
        this.initAudioUI();
        this.initSearch();
        this.initThemeObserver();
        this.initSensoryFeatures(); 
        this.initCleanPaste();
        this.initInlineCommands(); // Slash Commands
        this.initStats();
        this.initPagination();
        this.initXray();
        this.initReaderMode();
        this.initSelectionToolbar();
        this.initLexicon();
        this.initGoal();
    },

    // --- COMANDOS INLINE (MÁGICA DO TECLADO) ---
    initInlineCommands() {
        this.editor.addEventListener('input', (e) => {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            
            const node = sel.focusNode;
            if (node.nodeType !== 3) return; // Garante nó de texto

            const text = node.textContent;
            
            // Regex para capturar --comando no final
            const match = text.match(/(--[a-zA-Z]+)$/);
            
            if (match) {
                const command = match[1]; 
                
                if (this.executeInlineCommand(command)) {
                    // Apaga o comando do texto visualmente
                    const newText = text.substring(0, match.index);
                    node.textContent = newText;
                    
                    // Restaura cursor no final
                    const range = document.createRange();
                    range.setStart(node, newText.length);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        });
    },

    executeInlineCommand(cmd) {
        switch(cmd) {
            case '--h': // Agora é --h (Mais rápido)
                {
                    const helpModal = document.getElementById('helpModal');
                    if (!helpModal) return false;
                    helpModal.classList.add('active');
                }
                // Foca na aba ativa para navegação imediata via teclado
                setTimeout(() => {
                    const activeTab = document.querySelector('.help-tab.active');
                    if(activeTab) activeTab.focus();
                }, 50);
                return this.flashInlineData();
            case '--save':
                document.getElementById('exportModal').classList.add('active');
                return this.flashInlineData();
            case '--open':
                document.getElementById('btnImport').click();
                return this.flashInlineData();
            case '--theme':
                document.getElementById('btnThemeToggle').click();
                return this.flashInlineData();
            case '--dark':
                document.body.setAttribute("data-theme", "tva");
                localStorage.setItem("lit_theme_pref", "tva");
                return this.flashInlineData();
            case '--light':
                document.body.setAttribute("data-theme", "ibm-light");
                localStorage.setItem("lit_theme_pref", "ibm-light");
                return this.flashInlineData();
            case '--zen':
            case '--fs':
                this.toggleFullscreen();
                return this.flashInlineData();
            case '--music':
                document.getElementById('btnAudio').click();
                return this.flashInlineData();
            case '--pomo':
                const pBtn = document.getElementById('pomodoroBtn');
                if(pBtn) pBtn.click();
                return this.flashInlineData();
            default: return false; 
        }
    },

    flashInlineData() {
        this.showInlineData();
        return true;
    },

    showInlineData() {
        const toast = document.getElementById("inlineDataToast");
        const body = document.getElementById("inlineDataBody");
        if (!toast || !body) return;
        const text = this.editor ? (this.editor.innerText || "") : "";
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        let birth = null;
        try {
            birth = JSON.parse(localStorage.getItem("lit_birth_tracker") || "null");
        } catch (_) {
            birth = null;
        }
        const keys = birth && typeof birth.keystrokeCount === "number" ? birth.keystrokeCount : 0;
        const cert = birth && birth.cert ? birth.cert : "ENABLED";
        const first = birth && birth.firstKeyTime ? new Date(birth.firstKeyTime).toLocaleTimeString() : "--";
        const last = birth && birth.lastKeyTime ? new Date(birth.lastKeyTime).toLocaleTimeString() : "--";
        body.innerHTML = `
            <div class="inline-data-row"><span>${this.escapeHtml(lang.t("inline_data_words"))}</span><strong>${words}</strong></div>
            <div class="inline-data-row"><span>${this.escapeHtml(lang.t("inline_data_chars"))}</span><strong>${chars}</strong></div>
            <div class="inline-data-row"><span>${this.escapeHtml(lang.t("inline_data_keys"))}</span><strong>${keys}</strong></div>
            <div class="inline-data-row"><span>${this.escapeHtml(lang.t("inline_data_cert"))}</span><strong>${this.escapeHtml(cert)}</strong></div>
            <div class="inline-data-row"><span>${this.escapeHtml(lang.t("inline_data_session"))}</span><strong>${this.escapeHtml(first)}–${this.escapeHtml(last)}</strong></div>
        `;
        toast.classList.remove("show");
        void toast.offsetWidth;
        toast.classList.add("show");
        clearTimeout(this.inlineDataTimer);
        this.inlineDataTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    },

    // --- CLEAN PASTE ---
    initCleanPaste() {
        this.editor.addEventListener("paste", (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData("text/plain");
            const clean = this.sanitizePlainText(text);
            document.execCommand("insertText", false, clean);
            this.playSound('type');
        });
        this.editor.addEventListener("drop", (e) => {
            e.preventDefault();
        });
    },
    sanitizePlainText(text) {
        return String(text || "")
            .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u017F]/g, "")
            .replace(/\u00A0/g, " ");
    },

    // --- AUDIO ENGINE ---
    initAudioEngine() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = 0.3; 
        this.gainNode.connect(this.audioCtx.destination);

        this.loadBuffer('type', 'src/assets/audio/type.wav');
        this.loadBuffer('enter', 'src/assets/audio/enter.wav');
        this.loadBuffer('backspace', 'src/assets/audio/backspace.wav');
        
        this.musicPlayer.volume = 0.5;
        this.musicPlayer.loop = true;
    },

    async loadBuffer(name, url) {
        try {
            const r = await fetch(url);
            const b = await r.arrayBuffer();
            this.sfxBuffers[name] = await this.audioCtx.decodeAudioData(b);
        } catch (e) { console.warn(`Erro som ${name}:`, e); }
    },

    playSound(name) {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const b = this.sfxBuffers[name];
        if (!b) return;
        const s = this.audioCtx.createBufferSource();
        s.buffer = b; s.connect(this.gainNode); s.start(0);
    },

    // --- SENSORY ---
    initSensoryFeatures() {
        const panel = document.querySelector(".panel");
        if (panel) {
            panel.addEventListener("scroll", () => {
                this.lastUserScrollTime = Date.now();
            });
            panel.addEventListener("wheel", () => {
                this.lastUserScrollTime = Date.now();
            }, { passive: true });
        }
        this.editor.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.playSound('enter');
            else if (e.key === "Backspace") this.playSound('backspace');
            else if (!e.metaKey && !e.ctrlKey) this.playSound('type');
            
            this.triggerFocusMode();
            this.handleTypewriterScroll();
            this.scheduleFocusBlockUpdate();
        });
        this.editor.addEventListener("input", () => {
            this.handleTypewriterScroll();
        });
        this.editor.addEventListener("keyup", () => {
            this.handleTypewriterScroll();
        });
        document.addEventListener("click", (e) => { if (e.target !== this.editor) this.resetFocusMode(false); });
        this.editor.addEventListener("input", () => this.scheduleFocusBlockUpdate());
        this.editor.addEventListener("click", () => this.scheduleFocusBlockUpdate());
        this.editor.addEventListener("keyup", () => this.scheduleFocusBlockUpdate());
        document.addEventListener("selectionchange", () => this.scheduleFocusBlockUpdate());
    },

    triggerFocusMode() {
        document.body.classList.remove("slow-return"); 
        document.body.classList.add("focus-active"); 
        clearTimeout(this.focusTimer);
        this.focusTimer = setTimeout(() => { this.resetFocusMode(true); }, 10000);
    },

    resetFocusMode(slow) {
        clearTimeout(this.focusTimer);
        if (slow) document.body.classList.add("slow-return");
        document.body.classList.remove("focus-active");
        this.clearFocusBlocks();
    },

    scheduleFocusBlockUpdate() {
        if (!document.body.classList.contains("focus-active")) return;
        if (this.focusBlockRaf) return;
        this.focusBlockRaf = requestAnimationFrame(() => {
            this.focusBlockRaf = null;
            this.updateFocusBlocks();
        });
    },

    updateFocusBlocks() {
        if (!document.body.classList.contains("focus-active")) return;
        const blocks = this.editor.querySelectorAll("p, div, h1, h2, h3, li, blockquote");
        blocks.forEach((b) => {
            b.classList.add("focus-dim");
            b.classList.remove("focus-active-block");
        });

        const active = this.getActiveBlock();
        if (active && this.editor.contains(active)) {
            active.classList.add("focus-active-block");
            active.classList.remove("focus-dim");
            this.activeBlock = active;
        }
    },

    clearFocusBlocks() {
        const blocks = this.editor.querySelectorAll(".focus-dim, .focus-active-block");
        blocks.forEach((b) => {
            b.classList.remove("focus-dim");
            b.classList.remove("focus-active-block");
        });
    },

    getActiveBlock() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        let node = sel.focusNode;
        if (!node) return null;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        if (!node) return null;
        const block = node.closest("p, h1, h2, h3, li, blockquote, div");
        if (block && this.editor.contains(block)) return block;
        return null;
    },

    handleTypewriterScroll() {
        if (this.scrollRaf) return;
        this.scrollRaf = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.scrollRaf = null;
                const scroller = this.editor.closest(".panel");
                if (!scroller) return;
                this.centerCaretInPanel(scroller);
            });
        });
    },

    centerCaretInPanel(scroller) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const original = sel.getRangeAt(0);
        if (!this.editor.contains(original.commonAncestorContainer)) return;
        const range = original.cloneRange();
        range.collapse(true);

        const marker = document.createElement("span");
        marker.textContent = "\u200b";
        marker.style.display = "inline-block";
        marker.style.width = "0";
        marker.style.height = "1em";
        marker.style.pointerEvents = "none";
        range.insertNode(marker);

        const panelRect = scroller.getBoundingClientRect();
        const rect = marker.getBoundingClientRect();
        const caretTop = rect.top - panelRect.top + scroller.scrollTop;
        const panelHeight = panelRect.height || 1;
        const editorStyle = window.getComputedStyle(this.editor);
        const fontSize = parseFloat(editorStyle.fontSize) || 20;
        const lineHeightRaw = editorStyle.lineHeight;
        const lineHeight = lineHeightRaw === "normal"
            ? fontSize * 1.7
            : parseFloat(lineHeightRaw) || fontSize * 1.7;
        const targetY = Math.max(0, panelHeight * 0.5);
        if (caretTop > targetY) {
            marker.scrollIntoView({ block: "center", behavior: "smooth" });
            scroller.scrollBy({ top: -lineHeight, behavior: "smooth" });
        }

        marker.remove();
        sel.removeAllRanges();
        sel.addRange(original);
    },

    getCaretRect() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const original = sel.getRangeAt(0);
        if (!this.editor.contains(original.commonAncestorContainer)) return null;
        const range = original.cloneRange();
        range.collapse(true);
        const rects = range.getClientRects();
        if (rects && rects.length) {
            return rects[0];
        }
        const marker = document.createElement("span");
        marker.textContent = "\u200b";
        marker.style.display = "inline-block";
        marker.style.width = "0";
        marker.style.height = "1em";
        marker.style.pointerEvents = "none";
        range.insertNode(marker);
        const rect = marker.getBoundingClientRect();
        marker.remove();
        sel.removeAllRanges();
        sel.addRange(original);
        return rect;
    },

    initLexicon() {
        this.lexiconPopup = document.getElementById("lexiconPopup");
        this.lexiconWord = document.getElementById("lexiconWord");
        this.lexiconDef = document.getElementById("lexiconDef");
        this.lexiconTrans = document.getElementById("lexiconTrans");
        if (!this.lexiconPopup) return;
        const schedule = () => this.scheduleLexiconUpdate();
        document.addEventListener("selectionchange", schedule);
        this.editor.addEventListener("keyup", schedule);
        this.editor.addEventListener("mouseup", schedule);
        document.addEventListener("click", (e) => {
            if (!this.lexiconPopup.contains(e.target)) this.hideLexicon();
        });
        document.addEventListener("lang:changed", schedule);
    },

    scheduleLexiconUpdate() {
        if (this.lexiconRaf) return;
        this.lexiconRaf = requestAnimationFrame(() => {
            this.lexiconRaf = null;
            this.updateLexicon();
        });
    },

    updateLexicon() {
        if (!this.lexiconPopup || !this.lexiconWord || !this.lexiconDef || !this.lexiconTrans) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            this.hideLexicon();
            return;
        }
        const range = sel.getRangeAt(0);
        if (!this.editor.contains(range.commonAncestorContainer)) {
            this.hideLexicon();
            return;
        }
        const raw = sel.toString().trim();
        if (!raw || raw.length > 40) {
            this.hideLexicon();
            return;
        }
        if (/\s/.test(raw)) {
            this.hideLexicon();
            return;
        }
        const clean = raw.replace(/^[^\\p{L}]+|[^\\p{L}]+$/gu, "");
        if (!clean) {
            this.hideLexicon();
            return;
        }
        const entry = lexicon.lookup(clean);
        if (!entry) {
            this.hideLexicon();
            return;
        }

        const currentLang = lang.current;
        this.lexiconWord.textContent = clean.toUpperCase();
        this.lexiconDef.textContent = lexicon.definition(entry, currentLang);
        this.lexiconTrans.textContent = lexicon.translations(entry, currentLang);

        const rect = range.getBoundingClientRect();
        const popupRect = this.lexiconPopup.getBoundingClientRect();
        let top = rect.top - popupRect.height - 10;
        if (top < 8) top = rect.bottom + 10;
        let left = rect.left + rect.width / 2 - popupRect.width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - popupRect.width - 8));
        this.lexiconPopup.style.top = `${top}px`;
        this.lexiconPopup.style.left = `${left}px`;
        this.lexiconPopup.classList.add("active");
        this.lexiconPopup.setAttribute("aria-hidden", "false");
    },

    hideLexicon() {
        if (!this.lexiconPopup) return;
        this.lexiconPopup.classList.remove("active");
        this.lexiconPopup.setAttribute("aria-hidden", "true");
    },

    // --- THEME & FONT ---
    initThemeObserver() {
        const obs = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.attributeName === "data-theme") {
                    this.applyFont();
                    this.refreshSearchHighlight();
                }
            });
        });
        obs.observe(document.body, { attributes: true });
    },

    initFonts() {
        this.applyFont();
        document.getElementById("btnFontType").onclick = () => {
            let i = parseInt(localStorage.getItem("lit_pref_font")) || 0;
            i = (i + 1) % this.fontList.length;
            localStorage.setItem("lit_pref_font", i);
            this.applyFont();
        };
        document.getElementById("fontPlus").onclick = () => {
            let s = parseInt(window.getComputedStyle(this.editor).fontSize);
            const next = s + 2;
            this.editor.style.fontSize = next + "px";
            localStorage.setItem("lit_pref_font_size", next);
            this.schedulePaginationUpdate();
        };
        document.getElementById("fontMinus").onclick = () => {
            let s = parseInt(window.getComputedStyle(this.editor).fontSize);
            const next = s - 2;
            this.editor.style.fontSize = next + "px";
            localStorage.setItem("lit_pref_font_size", next);
            this.schedulePaginationUpdate();
        };
    },

    applyFont() {
        const storedSize = parseInt(localStorage.getItem("lit_pref_font_size"));
        let i = parseInt(localStorage.getItem("lit_pref_font")) || 0;
        if (i < 0 || i >= this.fontList.length) i = 0;
        const entry = this.fontList[i];
        this.editor.style.fontFamily = entry.family;
        const size = Number.isFinite(storedSize) ? storedSize : entry.baseSize;
        this.editor.style.fontSize = `${size}px`;
        this.editor.style.lineHeight = entry.lineHeight || "1.7";
        this.schedulePaginationUpdate();
        this.scheduleXrayUpdate();
    },

    initAudioUI() {
        const btn = document.getElementById("btnAudio");
        btn.onclick = () => {
            if(this.musicPlayer.paused) { 
                // Fade In
                this.musicPlayer.volume = 0;
                this.musicPlayer.play().catch(e => {}); 
                let vol = 0;
                const fade = setInterval(() => { if (vol < 0.5) { vol += 0.05; this.musicPlayer.volume = vol; } else clearInterval(fade); }, 100);
                btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="src/assets/icons/phosphor-sprite.svg#icon-pause"></use></svg> ${lang.t("audio_btn")}`; btn.classList.add("active");
            } else { 
                // Fade Out
                let vol = this.musicPlayer.volume;
                const fade = setInterval(() => { 
                    if (vol > 0.05) { vol -= 0.05; this.musicPlayer.volume = vol; } 
                    else { clearInterval(fade); this.musicPlayer.pause(); } 
                }, 100);
                btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="src/assets/icons/phosphor-sprite.svg#icon-music-notes"></use></svg> ${lang.t("audio_btn")}`; btn.classList.remove("active");
            }
        };
        document.addEventListener("lang:changed", () => {
            if (!btn) return;
            const icon = this.musicPlayer.paused ? "src/assets/icons/phosphor-sprite.svg#icon-music-notes" : "src/assets/icons/phosphor-sprite.svg#icon-pause";
            btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="${icon}"></use></svg> ${lang.t("audio_btn")}`;
        });
    },

    initSearch() {
        const i = document.getElementById("search");
        const b = document.getElementById("btnSearch");
        const prevBtn = document.getElementById("btnSearchPrev");
        const nextBtn = document.getElementById("btnSearchNext");
        const c = document.getElementById("btnClear");
        const storedValue = localStorage.getItem("lit_search_value") || "";
        const storedActive = localStorage.getItem("lit_search_active") === "true";
        if (i) i.value = storedValue;
        if (storedActive && storedValue) {
            this.lastSearchValue = storedValue;
            this.refreshSearchHighlight();
        }
        const s = () => {
            const v = i.value.trim();
            if (!v) return;
            this.lastSearchValue = v;
            localStorage.setItem("lit_search_value", v);
            localStorage.setItem("lit_search_active", "true");
            this.applySearchHighlight(v);
        };
        b.onclick = s;
        if (prevBtn) prevBtn.onclick = () => this.searchPrev();
        if (nextBtn) nextBtn.onclick = () => this.searchNext();
        if (i) {
            i.addEventListener("input", () => {
                localStorage.setItem("lit_search_value", i.value);
            });
            i.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    const current = i.value.trim();
                    if (this.lastSearchValue && this.lastSearchValue === current && this.searchMarks && this.searchMarks.length) {
                        this.searchNext();
                    } else {
                        s();
                    }
                }
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    this.searchNext();
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    this.searchPrev();
                }
                if (e.key === "Escape") {
                    e.preventDefault();
                    this.clearSearchHighlight();
                    i.value = "";
                    localStorage.setItem("lit_search_value", "");
                    localStorage.setItem("lit_search_active", "false");
                    i.blur();
                }
            });
        }
        c.onclick = () => {
            this.clearSearchHighlight();
            i.value = "";
            localStorage.setItem("lit_search_value", "");
            localStorage.setItem("lit_search_active", "false");
        };
    },

    initPagination() {
        this.pageMarkers = document.getElementById("pageMarkers");
        if (!this.pageMarkers) return;
        this.pageOverlay = document.getElementById("pageOverlay");
        this.pageOverlayNumber = document.getElementById("pageOverlayNumber");
        const schedule = () => this.schedulePaginationUpdate();
        const panel = this.editor.closest(".panel");
        this.editor.addEventListener("input", schedule);
        window.addEventListener("resize", schedule);
        if (panel) {
            panel.addEventListener("scroll", () => this.schedulePageOverlayUpdate());
            panel.addEventListener("wheel", () => this.schedulePageOverlayUpdate(), { passive: true });
        }
        this.schedulePaginationUpdate();
    },

    schedulePaginationUpdate() {
        if (!this.pageMarkers) return;
        if (this.paginationRaf) return;
        this.paginationRaf = requestAnimationFrame(() => {
            this.paginationRaf = null;
            this.updatePaginationMarkers();
        });
    },

    updatePaginationMarkers() {
        if (!this.pageMarkers) return;
        const rootStyles = window.getComputedStyle(document.documentElement);
        const pageHeightRaw = rootStyles.getPropertyValue("--page-height").trim();
        const pageHeight = parseFloat(pageHeightRaw) || 960;
        const totalHeight = Math.max(this.editor.scrollHeight, this.editor.offsetHeight);
        const pageCount = Math.max(1, Math.ceil(totalHeight / pageHeight));

        this.pageMarkers.innerHTML = "";
        this.pageMarkers.style.height = `${totalHeight}px`;

        for (let i = 1; i <= pageCount; i += 1) {
            const top = (i - 1) * pageHeight;
            const marker = document.createElement("div");
            marker.className = "page-marker";
            marker.style.top = `${top}px`;

            const label = document.createElement("div");
            label.className = "page-marker-label";
            label.textContent = `PG - ${String(i).padStart(2, "0")}`;
            marker.appendChild(label);

            this.pageMarkers.appendChild(marker);
        }
        this.schedulePageOverlayUpdate();
    },

    schedulePageOverlayUpdate() {
        if (this.pageOverlayRaf) return;
        this.pageOverlayRaf = requestAnimationFrame(() => {
            this.pageOverlayRaf = null;
            this.updatePageOverlay();
        });
    },

    updatePageOverlay() {
        if (!this.pageOverlay || !this.pageOverlayNumber) return;
        const panel = this.editor.closest(".panel");
        if (!panel) return;
        const rootStyles = window.getComputedStyle(document.documentElement);
        const pageHeightRaw = rootStyles.getPropertyValue("--page-height").trim();
        const pageHeight = parseFloat(pageHeightRaw) || 960;
        const scrollTop = panel.scrollTop || 0;
        const pageIndex = Math.max(1, Math.floor(scrollTop / pageHeight) + 1);
        if (pageIndex === this.lastPageIndex) return;
        this.lastPageIndex = pageIndex;
        this.pageOverlayNumber.textContent = String(pageIndex).padStart(2, "0");
        this.pageOverlay.classList.remove("show");
        void this.pageOverlay.offsetWidth;
        this.pageOverlay.classList.add("show");
    },

    initXray() {
        this.xrayOverlay = document.getElementById("xrayOverlay");
        const btn = document.getElementById("btnXray");
        if (!btn || !this.xrayOverlay) return;
        btn.onclick = () => this.setXrayActive(!this.xrayActive);
        this.editor.addEventListener("input", () => this.scheduleXrayUpdate());
        this.editor.addEventListener("keyup", () => this.scheduleXrayUpdate());
        this.editor.addEventListener("mouseup", () => this.scheduleXrayUpdate());
        document.addEventListener("selectionchange", () => this.scheduleXrayUpdate());
    },

    setXrayActive(active) {
        this.xrayActive = active;
        document.body.classList.toggle("xray-active", active);
        if (active) {
            this.clearSelection();
            this.lastSelectionRange = null;
            this.scheduleXrayUpdate();
        }
        this.updateSelectionToolbar();
        this.scheduleFocusBlockUpdate();
    },

    scheduleXrayUpdate() {
        if (!this.xrayActive) return;
        if (this.xrayRaf) return;
        this.xrayRaf = requestAnimationFrame(() => {
            this.xrayRaf = null;
            this.updateXrayOverlay();
        });
    },

    updateXrayOverlay() {
        if (!this.xrayOverlay || !this.xrayActive || !this.editor) return;
        const style = window.getComputedStyle(this.editor);
        this.xrayOverlay.style.fontFamily = style.fontFamily;
        this.xrayOverlay.style.fontSize = style.fontSize;
        this.xrayOverlay.style.lineHeight = style.lineHeight;
        const text = this.editor.innerText || "";
        const html = this.buildXrayHtml(text);
        this.xrayOverlay.innerHTML = html;
    },

    buildXrayHtml(text) {
        let html = this.escapeHtml(text);
        const verbRegex = /\b(?:ser|estar|ter|fazer|ir|ver|dar|dizer|poder|querer|saber|ficar|vir|haver|usar|criar|salvar|ler|escrever|[a-z]{2,}(?:ar|er|ir))\b/gi;
        const adjRegex = /\b[a-z]{3,}(?:oso|osa|vel|veis|ivo|iva|ico|ica|ente|ante|avel|ivel|ous|able|ible|ive|al|ful|less)\b/gi;
        html = html.replace(verbRegex, (match) => `<span class="xray-verb">${match}</span>`);
        html = html.replace(adjRegex, (match) => `<span class="xray-adj">${match}</span>`);
        html = html.replace(/\n/g, "<br>");
        return html;
    },

    escapeHtml(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    },

    initReaderMode() {
        this.readerModal = document.getElementById("readerModal");
        this.readerBox = this.readerModal ? this.readerModal.querySelector(".reader-modal") : null;
        this.readerBody = this.readerModal ? this.readerModal.querySelector(".reader-body") : null;
        this.readerContent = document.getElementById("readerContent");
        this.readerGlossary = document.getElementById("readerGlossary");
        this.readerRuler = document.querySelector(".reader-ruler");
        this.readerGlass = document.querySelector(".reader-glass");
        this.readerPlay = document.getElementById("btnReaderPlay");
        this.readerSpeedDown = document.getElementById("btnReaderSpeedDown");
        this.readerSpeedUp = document.getElementById("btnReaderSpeedUp");
        this.readerAutoScroll = false;
        this.readerAutoScrollRaf = null;
        this.readerAutoScrollSpeed = 1;
        const btn = document.getElementById("btnReader");
        const close = document.getElementById("closeModalReader");
        const btnGlossary = document.getElementById("btnReaderGlossary");
        const btnRuler = document.getElementById("btnReaderRuler");
        const btnFont = document.getElementById("btnReaderFont");
        const btnTheme = document.getElementById("btnReaderTheme");
        if (btn) btn.onclick = () => this.openReaderMode();
        if (close) close.onclick = () => this.closeReaderMode();
        if (btnGlossary) {
            btnGlossary.onclick = () => {
                if (this.readerBox) this.readerBox.classList.toggle("show-glossary");
            };
        }
        if (btnRuler) {
            btnRuler.onclick = () => {
                if (!this.readerBox || !this.readerRuler || !this.readerBody) return;
                this.readerBox.classList.toggle("show-ruler");
                if (this.readerBox.classList.contains("show-ruler")) {
                    const modalRect = this.readerBody.getBoundingClientRect();
                    const rulerRect = this.readerRuler.getBoundingClientRect();
                    const targetTop = Math.max(60, (modalRect.height - rulerRect.height) / 2);
                    this.readerRuler.style.top = `${targetTop}px`;
                    this.syncReaderRuler();
                }
            };
        }
        if (btnFont) {
            btnFont.onclick = () => {
                if (this.readerContent) this.readerContent.classList.toggle("reader-font-serif");
            };
        }
        if (btnTheme) {
            btnTheme.onclick = () => {
                if (this.readerBox) this.readerBox.classList.toggle("reader-theme-light");
            };
        }
        if (this.readerPlay) {
            this.readerPlay.onclick = () => this.toggleReaderAutoScroll();
        }
        if (this.readerSpeedDown) {
            this.readerSpeedDown.onclick = () => this.adjustReaderSpeed(-0.3);
        }
        if (this.readerSpeedUp) {
            this.readerSpeedUp.onclick = () => this.adjustReaderSpeed(0.3);
        }
        if (this.readerRuler && this.readerBody) {
            let dragging = false;
            let startY = 0;
            let startTop = 0;
            const onMove = (e) => {
                if (!dragging || !this.readerRuler || !this.readerBody) return;
                const delta = e.clientY - startY;
                const modalRect = this.readerBody.getBoundingClientRect();
                const rulerRect = this.readerRuler.getBoundingClientRect();
                const minTop = 60;
                const maxTop = modalRect.height - rulerRect.height - 40;
                let nextTop = startTop + delta;
                nextTop = Math.max(minTop, Math.min(maxTop, nextTop));
                this.readerRuler.style.top = `${nextTop}px`;
                this.syncReaderRuler();
            };
            const onUp = () => {
                if (!this.readerRuler) return;
                dragging = false;
                this.readerRuler.classList.remove("dragging");
                document.removeEventListener("pointermove", onMove);
                document.removeEventListener("pointerup", onUp);
            };
            this.readerRuler.addEventListener("pointerdown", (e) => {
                if (!this.readerBox || !this.readerBox.classList.contains("show-ruler")) return;
                dragging = true;
                startY = e.clientY;
                const computedTop = parseFloat(window.getComputedStyle(this.readerRuler).top) || 0;
                startTop = computedTop;
                this.readerRuler.classList.add("dragging");
                document.addEventListener("pointermove", onMove);
                document.addEventListener("pointerup", onUp);
            });
        }
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.readerModal && this.readerModal.classList.contains("active")) {
                this.closeReaderMode();
            }
            if (!this.readerModal || !this.readerModal.classList.contains("active")) return;
            if (!this.readerContent) return;
            if (e.key === "ArrowDown") {
                e.preventDefault();
                const scrollEl = this.getReaderScrollEl();
                if (scrollEl) scrollEl.scrollBy({ top: 48, behavior: "smooth" });
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                const scrollEl = this.getReaderScrollEl();
                if (scrollEl) scrollEl.scrollBy({ top: -48, behavior: "smooth" });
            }
        });
        if (this.readerContent) {
            this.readerContent.addEventListener("wheel", () => this.stopReaderAutoScroll(), { passive: true });
            this.readerContent.addEventListener("touchstart", () => this.stopReaderAutoScroll(), { passive: true });
        }
        if (this.readerBody) {
            this.readerBody.addEventListener("wheel", () => this.stopReaderAutoScroll(), { passive: true });
            this.readerBody.addEventListener("touchstart", () => this.stopReaderAutoScroll(), { passive: true });
        }
    },

    syncReaderRuler() {
        if (!this.readerRuler || !this.readerBody) return;
        const rulerRect = this.readerRuler.getBoundingClientRect();
        const modalRect = this.readerBody.getBoundingClientRect();
        const top = Math.max(0, rulerRect.top - modalRect.top);
        const height = rulerRect.height;
        this.readerBody.style.setProperty("--ruler-top", `${top}px`);
        this.readerBody.style.setProperty("--ruler-height", `${height}px`);
    },

    getReaderScrollEl() {
        if (!this.readerContent) return null;
        if (this.readerContent.scrollHeight > this.readerContent.clientHeight + 1) {
            return this.readerContent;
        }
        if (this.readerBody && this.readerBody.scrollHeight > this.readerBody.clientHeight + 1) {
            return this.readerBody;
        }
        return this.readerContent;
    },

    adjustReaderSpeed(delta) {
        const next = Math.max(0.2, Math.min(3, (this.readerAutoScrollSpeed || 1) + delta));
        this.readerAutoScrollSpeed = next;
        if (this.readerSpeedDown) {
            this.readerSpeedDown.title = `Lento (${next.toFixed(1)}x)`;
        }
        if (this.readerSpeedUp) {
            this.readerSpeedUp.title = `Rápido (${next.toFixed(1)}x)`;
        }
    },

    toggleReaderAutoScroll() {
        if (!this.readerContent || !this.readerPlay) return;
        if (this.readerAutoScroll) {
            this.stopReaderAutoScroll();
            return;
        }
        this.readerAutoScroll = true;
        if (this.readerBox) this.readerBox.classList.add("autoscroll-active");
        this.readerPlay.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="src/assets/icons/phosphor-sprite.svg#icon-pause"></use></svg>`;
        const step = () => {
            if (!this.readerAutoScroll) return;
            const scrollEl = this.getReaderScrollEl();
            if (!scrollEl) return;
            const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
            if (scrollEl.scrollTop >= maxScroll) {
                this.stopReaderAutoScroll();
                return;
            }
            scrollEl.scrollTop += this.readerAutoScrollSpeed || 1;
            this.readerAutoScrollRaf = requestAnimationFrame(step);
        };
        this.readerAutoScrollRaf = requestAnimationFrame(step);
    },

    stopReaderAutoScroll() {
        if (!this.readerAutoScroll) return;
        this.readerAutoScroll = false;
        if (this.readerAutoScrollRaf) cancelAnimationFrame(this.readerAutoScrollRaf);
        this.readerAutoScrollRaf = null;
        if (this.readerBox) this.readerBox.classList.remove("autoscroll-active");
        if (this.readerPlay) {
            this.readerPlay.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="src/assets/icons/phosphor-sprite.svg#icon-play-circle"></use></svg>`;
        }
    },

    openReaderMode() {
        if (!this.readerModal || !this.readerContent || !this.readerGlossary || !this.readerBox) return;
        const text = this.editor.innerText || "";
        this.readerContent.textContent = text;
        this.readerContent.scrollTop = 0;
        this.readerGlossary.innerHTML = "";
        this.updateGlossary(text);
        this.readerModal.classList.add("active");
        this.readerBox.classList.remove("show-glossary");
        this.readerBox.classList.remove("show-ruler");
        this.readerBox.classList.remove("reader-theme-light");
        if (this.readerContent) this.readerContent.classList.remove("reader-font-serif");
        if (this.readerModal.requestFullscreen) {
            this.readerModal.requestFullscreen().catch(() => {});
        }
        if (this.readerRuler && this.readerBody) {
            this.readerRuler.style.top = "42%";
            this.syncReaderRuler();
        }
        this.stopReaderAutoScroll();
        this.adjustReaderSpeed(0);
        setTimeout(() => this.readerContent.focus(), 50);
    },

    closeReaderMode() {
        this.stopReaderAutoScroll();
        if (this.readerModal) this.readerModal.classList.remove("active");
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    },

    updateGlossary(text) {
        if (!this.readerGlossary) return;
        const words = (text || "").toLowerCase().match(/[a-zà-ÿ]{4,}/gi) || [];
        const freq = new Map();
        words.forEach((w) => {
            freq.set(w, (freq.get(w) || 0) + 1);
        });
        const top = Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
        top.forEach(([word, count]) => {
            const row = document.createElement("div");
            row.className = "reader-glossary-item";
            row.innerHTML = `<span>${word}</span><span>${count}</span>`;
            this.readerGlossary.appendChild(row);
        });
    },

    initStats() {
        const statsEl = document.getElementById("liveStats");
        if (!statsEl) return;
        const update = () => {
            const text = this.editor.innerText || "";
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const charsLabel = lang.t("stats_chars");
            const wordsLabel = lang.t("stats_words");
            statsEl.textContent = `${charsLabel}: ${text.length} | ${wordsLabel}: ${words}`;
            this.updateGoalProgress(words);
        };
        update();
        this.statsUpdateFn = update;
        this.editor.addEventListener("input", () => {
            if (this.statsRaf) return;
            this.statsRaf = requestAnimationFrame(() => {
                this.statsRaf = null;
                update();
            });
        });
        document.addEventListener("lang:changed", () => update());
    },

    refreshStats() {
        if (this.statsUpdateFn) this.statsUpdateFn();
    },

    initSelectionToolbar() {
        const toolbar = document.getElementById("selectionToolbar");
        if (!toolbar) return;

        toolbar.querySelectorAll(".selection-btn").forEach((btn) => {
            btn.addEventListener("mousedown", (e) => {
                e.preventDefault();
                this.captureSelection();
            });
            btn.addEventListener("click", (e) => {
                const cmd = btn.getAttribute("data-cmd");
                if (!cmd) return;
                const range = this.captureSelection();
                if (cmd === "h1" || cmd === "h2") {
                    this.applyHeading(cmd, range);
                } else {
                    document.execCommand(cmd, false, null);
                }
                this.updateSelectionToolbar();
            });
        });

        document.addEventListener("selectionchange", () => this.updateSelectionToolbar());
        this.editor.addEventListener("keyup", () => this.updateSelectionToolbar());
        this.editor.addEventListener("mouseup", () => this.updateSelectionToolbar());
        window.addEventListener("resize", () => this.updateSelectionToolbar());
    },

    updateSelectionToolbar() {
        const toolbar = document.getElementById("selectionToolbar");
        if (!toolbar) return;
        if (this.xrayActive) {
            toolbar.classList.remove("visible");
            toolbar.setAttribute("aria-hidden", "true");
            return;
        }
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            toolbar.classList.remove("visible");
            toolbar.setAttribute("aria-hidden", "true");
            this.lastSelectionRange = null;
            return;
        }
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
            toolbar.classList.remove("visible");
            toolbar.setAttribute("aria-hidden", "true");
            return;
        }
        if (!this.editor.contains(range.commonAncestorContainer)) {
            toolbar.classList.remove("visible");
            toolbar.setAttribute("aria-hidden", "true");
            this.lastSelectionRange = null;
            return;
        }

        this.lastSelectionRange = range.cloneRange();
        const padding = 8;
        const top = Math.max(8, rect.top - toolbar.offsetHeight - padding);
        let left = rect.left + rect.width / 2 - toolbar.offsetWidth / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - toolbar.offsetWidth - 8));
        toolbar.style.top = `${top}px`;
        toolbar.style.left = `${left}px`;
        toolbar.classList.add("visible");
        toolbar.setAttribute("aria-hidden", "false");
    },

    captureSelection() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        if (!this.editor.contains(range.commonAncestorContainer)) return null;
        this.lastSelectionRange = range.cloneRange();
        return this.lastSelectionRange;
    },

    applyHeading(tag, range) {
        const targetRange = range || this.lastSelectionRange;
        if (!targetRange || targetRange.collapsed) return;
        if (!this.editor.contains(targetRange.commonAncestorContainer)) return;
        const wrapper = document.createElement(tag);
        const contents = targetRange.extractContents();
        wrapper.appendChild(contents);
        targetRange.insertNode(wrapper);
        const sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        const after = document.createRange();
        after.setStartAfter(wrapper);
        after.collapse(true);
        sel.addRange(after);
    },

    clearSelection() {
        const sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
    },

    refreshSearchHighlight() {
        const input = document.getElementById("search");
        const v = (input && input.value.trim()) || this.lastSearchValue;
        if (!v) {
            this.clearSearchHighlight();
            return;
        }
        this.applySearchHighlight(v);
    },

    clearSearchHighlight() {
        this.preserveSelection(() => {
            this.clearSearchHighlightRaw();
        });
        this.lastSearchValue = "";
        this.searchMarks = [];
        this.searchIndex = -1;
    },

    clearSearchHighlightRaw() {
        const marks = this.editor.querySelectorAll("mark");
        marks.forEach((mark) => {
            const parent = mark.parentNode;
            if (!parent) return;
            while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
            parent.removeChild(mark);
            parent.normalize();
        });
    },

    applySearchHighlight(value) {
        const v = value.trim();
        if (!v) return;
        const escaped = this.escapeRegExp(v);
        const re = new RegExp(escaped, "gi");
        this.preserveSelection(() => {
            this.clearSearchHighlightRaw();
            this.highlightRegex(re);
        });
        this.searchMarks = Array.from(this.editor.querySelectorAll("mark"));
        this.searchIndex = this.searchMarks.length ? 0 : -1;
        if (this.searchMarks.length) this.setActiveSearchMark(this.searchIndex);
    },

    highlightRegex(re) {
        const walker = document.createTreeWalker(
            this.editor,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
                    const parent = node.parentNode;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    if (parent.nodeName === "MARK") return NodeFilter.FILTER_REJECT;
                    if (parent.closest && parent.closest("mark")) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodes = [];
        let node = walker.nextNode();
        while (node) {
            nodes.push(node);
            node = walker.nextNode();
        }

        nodes.forEach((textNode) => {
            const text = textNode.nodeValue;
            if (!text) return;
            re.lastIndex = 0;
            if (!re.test(text)) return;
            re.lastIndex = 0;
            const frag = document.createDocumentFragment();
            let lastIndex = 0;
            let match = re.exec(text);
            while (match) {
                const start = match.index;
                if (start > lastIndex) {
                    frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
                }
                const mark = document.createElement("mark");
                mark.textContent = match[0];
                frag.appendChild(mark);
                lastIndex = start + match[0].length;
                if (match[0].length === 0) break;
                match = re.exec(text);
            }
            if (lastIndex < text.length) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            if (textNode.parentNode) textNode.parentNode.replaceChild(frag, textNode);
        });
    },

    setActiveSearchMark(index) {
        if (!this.searchMarks || this.searchMarks.length === 0) return;
        this.searchMarks.forEach((mark) => mark.classList.remove("search-active"));
        const target = this.searchMarks[index];
        if (!target) return;
        target.classList.add("search-active");
        target.scrollIntoView({ block: "center", behavior: "smooth" });
    },

    searchNext() {
        if (!this.searchMarks || this.searchMarks.length === 0) {
            this.refreshSearchHighlight();
            return;
        }
        this.searchIndex = (this.searchIndex + 1) % this.searchMarks.length;
        this.setActiveSearchMark(this.searchIndex);
    },

    searchPrev() {
        if (!this.searchMarks || this.searchMarks.length === 0) {
            this.refreshSearchHighlight();
            return;
        }
        this.searchIndex = (this.searchIndex - 1 + this.searchMarks.length) % this.searchMarks.length;
        this.setActiveSearchMark(this.searchIndex);
    },

    escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    preserveSelection(fn) {
        const sel = window.getSelection();
        let pos = null;
        if (sel && sel.rangeCount > 0 && this.editor.contains(sel.anchorNode)) {
            pos = this.getCursorPos();
        }
        fn();
        if (pos !== null) this.setCursorPos(pos);
    },

    getCursorPos() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return 0;
        const range = sel.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(this.editor);
        preRange.setEnd(range.endContainer, range.endOffset);
        return preRange.toString().length;
    },

    setCursorPos(pos) {
        const sel = window.getSelection();
        if (!sel) return;
        const range = document.createRange();
        let current = 0;
        const walker = document.createTreeWalker(this.editor, NodeFilter.SHOW_TEXT, null);
        let node = walker.nextNode();
        while (node) {
            const next = current + node.textContent.length;
            if (pos <= next) {
                range.setStart(node, Math.max(0, pos - current));
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                return;
            }
            current = next;
            node = walker.nextNode();
        }
        range.selectNodeContents(this.editor);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    },

    exportTxt() {
        const b = new Blob([this.editor.innerText], {type:"text/plain"});
        const a = document.createElement("a"); a.href = window.URL.createObjectURL(b);
        a.download = `TOT_Doc_${Date.now()}.txt`; a.click();
    },

    insertChapter() {
        const title = lang.t("chapter_title");
        const placeholder = lang.t("chapter_placeholder");
        document.execCommand('insertHTML', false, `<br><div style="border-bottom:1px dashed var(--color-accent); opacity:0.5; margin:30px 0;"></div><h2 class="chapter-mark" style="color:var(--color-accent); margin-top:0;">${title}</h2><p>${placeholder}</p>`);
        if (this.editor) {
            this.editor.focus();
            this.triggerFocusMode();
            this.scheduleFocusBlockUpdate();
        }
    },
    
    toggleFullscreen() {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else if (document.exitFullscreen) document.exitFullscreen();
    },

    initGoal() {
        this.goalStars = document.querySelectorAll(".goal-star");
        this.goalModal = document.getElementById("goalModal");
        this.goalTitle = document.getElementById("goalTitle");
        this.goalBody = document.getElementById("goalBody");
        const storedMilestones = localStorage.getItem("lit_goal_milestones");
        this.goalMilestonesDone = storedMilestones ? storedMilestones.split("|").map((v) => parseInt(v, 10)).filter(Number.isFinite) : [];
        this.updateGoalProgress();
    },

    updateGoalProgress(wordCount) {
        if (!this.goalStars || this.goalStars.length === 0) return;
        const count = Number.isFinite(wordCount) ? wordCount : (this.editor.innerText || "").trim().split(/\s+/).filter(Boolean).length;
        const ratio = Math.min(1, count / 2000);
        const filled = Math.floor(ratio * this.goalStars.length);
        this.goalStars.forEach((star, idx) => {
            if (idx < filled) star.classList.add("filled");
            else star.classList.remove("filled");
        });
        if (count < 500) {
            this.goalCompleted = false;
            if (this.goalStars) {
                const wrap = document.getElementById("goalStars");
                if (wrap) wrap.classList.remove("goal-complete");
            }
        }
        const milestones = [500, 1000, 1500, 2000];
        const reached = milestones.filter((m) => count >= m);
        const latest = reached[reached.length - 1];
        if (latest && !this.goalMilestonesDone.includes(latest)) {
            this.goalMilestonesDone.push(latest);
            localStorage.setItem("lit_goal_milestones", this.goalMilestonesDone.join("|"));
            this.showGoalMessage(latest);
        }
        if (!this.goalCompleted && count >= 2000) {
            this.goalCompleted = true;
            const wrap = document.getElementById("goalStars");
            if (wrap) wrap.classList.add("goal-complete");
        }
    },

    showGoalMessage(milestone) {
        if (!this.goalModal || !this.goalTitle || !this.goalBody) return;
        const copy = {
            500: {
                title: lang.t("goal_500_title"),
                body: lang.t("goal_500_body")
            },
            1000: {
                title: lang.t("goal_1000_title"),
                body: lang.t("goal_1000_body")
            },
            1500: {
                title: lang.t("goal_1500_title"),
                body: lang.t("goal_1500_body")
            },
            2000: {
                title: lang.t("goal_2000_title"),
                body: lang.t("goal_2000_body")
            }
        };
        const data = copy[milestone];
        if (!data) return;
        this.goalTitle.textContent = data.title;
        this.goalBody.textContent = data.body;
        this.goalModal.classList.add("active");
        this.goalModal.classList.toggle("goal-celebrate", milestone === 2000);
        setTimeout(() => {
            this.goalModal.classList.remove("active");
            this.goalModal.classList.remove("goal-celebrate");
        }, 4000);
    }
};
