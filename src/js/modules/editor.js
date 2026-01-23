import { lang } from './lang.js';
import { lexicon } from './lexicon.js';
import { xrayTests } from './xray_tests.js';
import { ptDictionary } from './pt_dictionary.js';

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
    xrayPanel: null,
    xrayVerbsEl: null,
    xrayAdjsEl: null,
    xrayEmptyEl: null,
    xrayObserver: null,
    ptLexicon: null,
    ptLexiconReady: false,
    ptLexiconLoading: false,
    ptLexiconChunks: [],
    ptLexiconChunksLoaded: 0,
    ptLexiconStatusEl: null,
    xrayAuditToggle: null,
    xrayAuditActive: false,
    xrayAuditState: new Map(),
    xrayCloseBtn: null,
    xrayHelpBtn: null,
    xrayHelp: null,
    xraySearch: null,
    xraySort: null,
    xrayFilterHigh: null,
    xrayFilterMed: null,
    xrayFilterLow: null,
    xrayFilterAmb: null,
    xrayTabs: null,
    xrayList: null,
    xraySummaryVerbs: null,
    xraySummaryAdjs: null,
    xraySummaryAmb: null,
    xrayActiveTab: "verbs",
    xrayData: null,
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
    consultModal: null,
    consultClose: null,
    consultWord: null,
    consultLemma: null,
    consultPos: null,
    consultDef: null,
    consultFlex: null,
    consultRegency: null,
    consultExamples: null,
    consultNotes: null,
    consultDoubtWrap: null,
    consultDoubt: null,
    consultNotFound: null,
    consultOutScope: null,
    consultAddPersonal: null,
    consultStatus: null,
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
        this.initDictionary();
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
                    if (window.totHelpOpen) {
                        window.totHelpOpen();
                    } else {
                        const helpModal = document.getElementById('helpModal');
                        if (!helpModal) return false;
                        helpModal.classList.add('active');
                    }
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
            case '--roll':
            case '--dice':
            case '--dado':
                this.rollInlineDice();
                return true;
            case '--xraytest':
                this.runXrayTests();
                return true;
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

    rollInlineDice() {
        const toast = document.getElementById("inlineDiceToast");
        const face = document.getElementById("inlineDiceFace");
        const valueEl = document.getElementById("inlineDiceValue");
        if (!toast || !face || !valueEl) return;
        const pips = Array.from(face.querySelectorAll(".pip"));
        const patterns = {
            1: [4],
            2: [0, 8],
            3: [0, 4, 8],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8]
        };
        const setValue = (val) => {
            pips.forEach((pip, idx) => {
                pip.classList.toggle("active", patterns[val].includes(idx));
            });
            valueEl.textContent = String(val);
        };

        const start = Date.now();
        const duration = 700;
        const tick = () => {
            const now = Date.now();
            const val = Math.floor(Math.random() * 6) + 1;
            setValue(val);
            if (now - start < duration) {
                requestAnimationFrame(tick);
            } else {
                const finalVal = Math.floor(Math.random() * 6) + 1;
                setValue(finalVal);
                toast.classList.remove("show");
                void toast.offsetWidth;
                toast.classList.add("show");
                clearTimeout(this.inlineDiceTimer);
                this.inlineDiceTimer = setTimeout(() => {
                    toast.classList.remove("show");
                }, 3000);
            }
        };
        tick();
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
            label.textContent = `PG ${String(i).padStart(2, "0")}`;
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
        this.xrayPanel = document.getElementById("xrayPanel");
        this.xrayHeader = this.xrayPanel ? this.xrayPanel.querySelector(".xray-header") : null;
        this.xrayDragHandle = document.getElementById("xrayDragBtn");
        this.xrayVerbsEl = document.getElementById("xrayVerbs");
        this.xrayAdjsEl = document.getElementById("xrayAdjs");
        this.xrayEmptyEl = document.getElementById("xrayEmpty");
        this.ptLexiconStatusEl = document.getElementById("xrayLexiconStatus");
        this.xrayAuditToggle = document.getElementById("xrayAuditToggle");
        this.xrayCloseBtn = document.getElementById("xrayCloseBtn");
        this.xrayHelpBtn = document.getElementById("xrayHelpBtn");
        this.xrayHelp = document.getElementById("xrayHelp");
        this.xraySearch = document.getElementById("xraySearch");
        this.xraySort = document.getElementById("xraySort");
        this.xrayFilterHigh = document.getElementById("xrayFilterHigh");
        this.xrayFilterMed = document.getElementById("xrayFilterMed");
        this.xrayFilterLow = document.getElementById("xrayFilterLow");
        this.xrayFilterAmb = document.getElementById("xrayFilterAmb");
        this.xrayTabs = this.xrayPanel ? Array.from(this.xrayPanel.querySelectorAll(".xray-tab")) : [];
        this.xrayList = document.getElementById("xrayList");
        this.xraySummaryVerbs = document.getElementById("xraySummaryVerbs");
        this.xraySummaryAdjs = document.getElementById("xraySummaryAdjs");
        this.xraySummaryAmb = document.getElementById("xraySummaryAmb");
        const btn = document.getElementById("btnXray");
        if (!btn || !this.xrayPanel) return;
        btn.onclick = () => this.setXrayActive(!this.xrayActive);
        if (this.xrayAuditToggle) {
            this.xrayAuditToggle.onclick = () => {
                this.xrayAuditActive = !this.xrayAuditActive;
                this.xrayAuditToggle.classList.toggle("active", this.xrayAuditActive);
                this.xrayAuditState.clear();
            };
        }
        if (this.xrayCloseBtn) this.xrayCloseBtn.onclick = () => this.setXrayActive(false);
        if (this.xrayHelpBtn && this.xrayHelp) {
            this.xrayHelpBtn.onclick = () => {
                this.xrayHelp.classList.toggle("active");
            };
        }
        if (this.xrayDragHandle && this.xrayPanel) {
            this.bindXrayDrag();
        }
        if (this.xraySearch) {
            this.xraySearch.addEventListener("input", () => this.renderXrayPanel());
        }
        if (this.xraySort) {
            this.xraySort.addEventListener("change", () => this.renderXrayPanel());
        }
        [this.xrayFilterHigh, this.xrayFilterMed, this.xrayFilterLow, this.xrayFilterAmb].forEach((el) => {
            if (el) el.addEventListener("change", () => this.renderXrayPanel());
        });
        if (this.xrayTabs && this.xrayTabs.length) {
            this.xrayTabs.forEach((tab) => {
                tab.addEventListener("click", () => {
                    this.xrayTabs.forEach(t => t.classList.remove("active"));
                    tab.classList.add("active");
                    this.xrayActiveTab = tab.getAttribute("data-tab") || "verbs";
                    this.renderXrayPanel();
                });
            });
        }
        if (this.xraySummaryAmb && this.xrayFilterAmb) {
            this.xraySummaryAmb.addEventListener("click", () => {
                this.xrayFilterAmb.checked = !this.xrayFilterAmb.checked;
                this.renderXrayPanel();
            });
        }
        this.editor.addEventListener("input", () => this.scheduleXrayUpdate());
        this.editor.addEventListener("keyup", () => this.scheduleXrayUpdate());
        this.editor.addEventListener("compositionend", () => this.scheduleXrayUpdate());
        this.editor.addEventListener("click", () => this.scheduleXrayUpdate());
        document.addEventListener("lang:changed", () => this.scheduleXrayUpdate());
        document.addEventListener("keydown", (e) => {
            if (e.key !== "Escape" || !this.xrayActive) return;
            if (this.xrayHelp && this.xrayHelp.classList.contains("active")) {
                this.xrayHelp.classList.remove("active");
                return;
            }
            this.setXrayActive(false);
        });
        if (this.editor && !this.xrayObserver) {
            this.xrayObserver = new MutationObserver(() => {
                if (this.xrayActive) this.scheduleXrayUpdate();
            });
            this.xrayObserver.observe(this.editor, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    },

    setXrayActive(active) {
        if (active && lang.current !== "pt") {
            const msg = lang.t("xray_locked_intl") || lang.t("xray_locked_ptbr");
            if (window.totModal && typeof window.totModal.alert === "function") {
                window.totModal.alert(msg);
            } else {
                alert(msg);
            }
            return;
        }
        this.xrayActive = active;
        document.body.classList.toggle("xray-active", active);
        if (this.xrayPanel) {
            this.xrayPanel.classList.toggle("show", active);
            this.xrayPanel.setAttribute("aria-hidden", active ? "false" : "true");
            if (active && !this.xrayDragged) {
                this.xrayPanel.style.left = "";
                this.xrayPanel.style.top = "";
                this.xrayPanel.style.transform = "";
            }
        }
        if (active) {
            this.clearSelection();
            this.lastSelectionRange = null;
            this.ensurePtLexicon();
            this.scheduleXrayUpdate();
        } else if (this.xrayVerbsEl && this.xrayAdjsEl && this.xrayEmptyEl) {
            this.xrayVerbsEl.innerHTML = "";
            this.xrayAdjsEl.innerHTML = "";
            this.xrayEmptyEl.style.display = "block";
        }
        if (this.xrayList) this.xrayList.innerHTML = "";
        this.xrayAuditState.clear();
        this.updateSelectionToolbar();
        this.scheduleFocusBlockUpdate();
    },

    bindXrayDrag() {
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        const startDrag = (clientX, clientY) => {
            if (!this.xrayPanel) return;
            const rect = this.xrayPanel.getBoundingClientRect();
            dragging = true;
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;
            this.xrayDragged = true;
            this.xrayPanel.classList.add("dragging");
            this.xrayPanel.style.transform = "translate(0, 0)";
        };

        const moveDrag = (clientX, clientY) => {
            if (!dragging || !this.xrayPanel) return;
            const maxX = window.innerWidth - this.xrayPanel.offsetWidth - 8;
            const maxY = window.innerHeight - this.xrayPanel.offsetHeight - 8;
            const nextLeft = Math.max(8, Math.min(maxX, clientX - offsetX));
            const nextTop = Math.max(8, Math.min(maxY, clientY - offsetY));
            this.xrayPanel.style.left = `${nextLeft}px`;
            this.xrayPanel.style.top = `${nextTop}px`;
        };

        const endDrag = () => {
            if (!dragging) return;
            dragging = false;
            if (this.xrayPanel) this.xrayPanel.classList.remove("dragging");
        };

        this.xrayDragHandle.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            startDrag(e.clientX, e.clientY);
        });
        window.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
        window.addEventListener("mouseup", endDrag);

        this.xrayDragHandle.addEventListener("touchstart", (e) => {
            const touch = e.touches && e.touches[0];
            if (!touch) return;
            startDrag(touch.clientX, touch.clientY);
        }, { passive: true });
        window.addEventListener("touchmove", (e) => {
            const touch = e.touches && e.touches[0];
            if (!touch) return;
            moveDrag(touch.clientX, touch.clientY);
        }, { passive: true });
        window.addEventListener("touchend", endDrag);
    },

    scheduleXrayUpdate() {
        if (!this.xrayActive) return;
        if (this.xrayRaf) return;
        this.xrayRaf = requestAnimationFrame(() => {
            this.xrayRaf = null;
            this.updateXrayOverlay();
        });
    },

    ensurePtLexicon() {
        if (this.ptLexiconReady || this.ptLexiconLoading) return;
        this.ptLexiconLoading = true;
        this.ptLexiconChunks = [
            "src/assets/data/pt_lexicon_core.json",
            "src/assets/data/pt_lexicon_chunk_1.json",
            "src/assets/data/pt_lexicon_chunk_2.json",
            "src/assets/data/pt_lexicon_chunk_3.json",
            "src/assets/data/pt_lexicon_chunk_4.json",
            "src/assets/data/pt_lexicon_chunk_5.json",
            "src/assets/data/pt_lexicon_chunk_6.json",
            "src/assets/data/pt_lexicon_chunk_7.json",
            "src/assets/data/pt_lexicon_chunk_8.json",
            "src/assets/data/pt_lexicon_chunk_9.json",
            "src/assets/data/pt_lexicon_chunk_10.json",
            "src/assets/data/pt_lexicon_chunk_11.json",
            "src/assets/data/pt_lexicon_chunk_12.json",
            "src/assets/data/pt_lexicon_chunk_13.json",
            "src/assets/data/pt_lexicon_chunk_14.json",
            "src/assets/data/pt_lexicon_chunk_15.json",
            "src/assets/data/pt_lexicon_chunk_16.json",
            "src/assets/data/pt_lexicon_chunk_17.json",
            "src/assets/data/pt_lexicon_chunk_18.json",
            "src/assets/data/pt_lexicon_chunk_19.json",
            "src/assets/data/pt_lexicon_chunk_20.json",
            "src/assets/data/pt_lexicon_chunk_21.json",
            "src/assets/data/pt_lexicon_chunk_22.json",
            "src/assets/data/pt_lexicon_chunk_23.json",
            "src/assets/data/pt_lexicon_chunk_24.json",
            "src/assets/data/pt_lexicon_chunk_25.json",
            "src/assets/data/pt_lexicon_chunk_26.json",
            "src/assets/data/pt_lexicon_chunk_27.json",
            "src/assets/data/pt_lexicon_chunk_28.json",
            "src/assets/data/pt_lexicon_chunk_29.json",
            "src/assets/data/pt_lexicon_chunk_30.json",
            "src/assets/data/pt_lexicon_chunk_31.json",
            "src/assets/data/pt_lexicon_chunk_32.json",
            "src/assets/data/pt_lexicon_chunk_33.json",
            "src/assets/data/pt_lexicon_chunk_34.json",
            "src/assets/data/pt_lexicon_chunk_35.json"
        ];
        this.updateLexiconStatus(0);
        fetch(this.ptLexiconChunks[0])
            .then((r) => r.json())
            .then((data) => {
                this.ptLexicon = data || null;
                this.ptLexiconReady = true;
                this.ptLexiconChunksLoaded = 1;
                this.updateLexiconStatus(1);
                this.loadLexiconChunks();
            })
            .catch(() => {
                this.ptLexicon = null;
            })
            .finally(() => {
                this.ptLexiconLoading = false;
                if (this.xrayActive) this.scheduleXrayUpdate();
            });
    },

    loadLexiconChunks() {
        if (!this.ptLexiconChunks || this.ptLexiconChunks.length <= 1) return;
        const rest = this.ptLexiconChunks.slice(1);
        rest.reduce((chain, url, idx) => {
            return chain.then(() => fetch(url).then((r) => r.json()).then((data) => {
                this.mergePtLexicon(data);
                this.ptLexiconChunksLoaded = idx + 2;
                this.updateLexiconStatus(this.ptLexiconChunksLoaded);
            }).catch(() => {}));
        }, Promise.resolve());
    },

    mergePtLexicon(extra) {
        if (!extra) return;
        if (!this.ptLexicon) this.ptLexicon = {};
        if (extra.verbs) {
            if (!this.ptLexicon.verbs) this.ptLexicon.verbs = {};
            Object.assign(this.ptLexicon.verbs, extra.verbs);
        }
        if (extra.adjectives) {
            if (!this.ptLexicon.adjectives) this.ptLexicon.adjectives = {};
            Object.assign(this.ptLexicon.adjectives, extra.adjectives);
        }
        if (extra.ambiguous) {
            if (!Array.isArray(this.ptLexicon.ambiguous)) this.ptLexicon.ambiguous = [];
            extra.ambiguous.forEach((entry) => {
                if (!this.ptLexicon.ambiguous.includes(entry)) this.ptLexicon.ambiguous.push(entry);
            });
        }
    },

    updateLexiconStatus(loaded) {
        if (!this.ptLexiconStatusEl) return;
        const total = this.ptLexiconChunks.length || 1;
        const pct = Math.min(100, Math.round((loaded / total) * 100));
        this.ptLexiconStatusEl.textContent = `${lang.t("xray_lexicon_status")} ${pct}%`;
    },

    updateXrayOverlay() {
        if (!this.xrayPanel || !this.xrayActive || !this.editor) return;
        if (!this.xrayList || !this.xrayEmptyEl) return;
        const text = this.editor.innerText || "";
        this.xrayData = this.buildXrayGroups(text);
        this.renderXrayPanel();
    },

    buildXrayStats(text) {
        const tokens = this.getXrayTokens(text);
        const langCode = lang.current || "pt";
        const verbCounts = new Map();
        const adjCounts = new Map();
        tokens.forEach((word) => {
            const lower = word.toLowerCase();
            const norm = this.normalizeXrayToken(lower);
            const verb = this.analyzeVerb(norm, lower, langCode);
            if (verb) {
                const key = `${verb.form}|${verb.lemma}|${verb.tag}|${verb.conf}|${verb.ambiguous ? "1" : "0"}`;
                const entry = verbCounts.get(key) || { word: verb.form, lemma: verb.lemma, tag: verb.tag, conf: verb.conf, ambiguous: verb.ambiguous, count: 0 };
                entry.count += 1;
                verbCounts.set(key, entry);
            }
            const adj = this.analyzeAdjective(norm, lower, langCode);
            if (adj) {
                const key = `${adj.form}|${adj.lemma}|${adj.tag}|${adj.conf}|${adj.ambiguous ? "1" : "0"}`;
                const entry = adjCounts.get(key) || { word: adj.form, lemma: adj.lemma, tag: adj.tag, conf: adj.conf, ambiguous: adj.ambiguous, count: 0 };
                entry.count += 1;
                adjCounts.set(key, entry);
            }
        });
        return {
            verbs: this.sortXrayCounts(verbCounts),
            adjs: this.sortXrayCounts(adjCounts)
        };
    },

    buildXrayGroups(text) {
        const tokens = this.getXrayTokenStream(text);
        const langCode = lang.current || "pt";
        const occurrences = [];
        tokens.forEach((token, index) => {
            if (!token || token.norm.length < 3) return;
            const verb = this.analyzeVerb(token.norm, token.raw, langCode);
            const adj = this.analyzeAdjective(token.norm, token.raw, langCode);
            const isPartCandidate = this.isPtParticipleCandidate(token.norm, verb, adj);
            if (isPartCandidate && (verb || adj)) {
                const classified = this.classifyParticipleVsAdjective(index, tokens, verb, adj);
                if (classified) {
                    const chosen = classified.label === "verb" ? verb : adj;
                    if (chosen) {
                        occurrences.push({
                            type: classified.label,
                            form: chosen.form,
                            lemma: chosen.lemma,
                            tag: chosen.tag,
                            conf: classified.confidence,
                            amb: classified.ambiguous,
                            source: chosen.source || "heur",
                            lemmaCandidates: classified.lemmaCandidates || chosen.lemmaCandidates || null,
                            rationale: classified.rationale || null,
                            alternatives: classified.alternatives || null
                        });
                    }
                    return;
                }
            }
            if (verb) {
                occurrences.push({
                    type: "verb",
                    form: verb.form,
                    lemma: verb.lemma,
                    tag: verb.tag,
                    conf: verb.conf,
                    amb: verb.ambiguous,
                    source: verb.source || "heur",
                    lemmaCandidates: verb.lemmaCandidates || null
                });
            }
            if (adj) {
                occurrences.push({
                    type: "adj",
                    form: adj.form,
                    lemma: adj.lemma,
                    tag: adj.tag,
                    conf: adj.conf,
                    amb: adj.ambiguous,
                    source: adj.source || "heur",
                    lemmaCandidates: adj.lemmaCandidates || null
                });
            }
        });
        const groups = { verbs: new Map(), adjs: new Map(), review: new Map() };
        const addToGroup = (bucket, item) => {
            const lemmaInfo = this.resolveLemmaDisplay(item);
            const key = `${item.type}|${lemmaInfo.display}`;
            if (!groups[bucket].has(key)) {
                groups[bucket].set(key, {
                    type: item.type,
                    lemma: lemmaInfo.display,
                    lemmaCandidates: lemmaInfo.candidates,
                    lemmaUnknown: lemmaInfo.unknown,
                    conf: item.conf,
                    amb: item.amb || lemmaInfo.ambiguous,
                    count: 0,
                    forms: new Map()
                });
            }
            const g = groups[bucket].get(key);
            g.count += 1;
            g.amb = g.amb || item.amb;
            g.conf = this.mergeConf(g.conf, item.conf);
            const fKey = `${item.form}|${item.tag}|${item.source}|${item.amb ? "1" : "0"}`;
            if (!g.forms.has(fKey)) {
                g.forms.set(fKey, {
                    form: item.form,
                    tag: item.tag,
                    source: item.source,
                    amb: item.amb,
                    count: 0,
                    rationale: item.rationale || null,
                    alternatives: item.alternatives || null
                });
            }
            g.forms.get(fKey).count += 1;
        };
        occurrences.forEach((item) => {
            const bucket = item.type === "verb" ? "verbs" : "adjs";
            addToGroup(bucket, item);
            if (item.amb || item.conf === "low" || item.source === "heur") {
                addToGroup("review", item);
            }
        });
        const doubtAlerts = ptDictionary.findDoubtsSync(text).map((entry) => ({
            title: `${lang.t("xray_alert_doubt")}: ${entry.key.replace(/_/g, " ")}`,
            detail: entry.item.explicacao,
            count: entry.count,
            conf: "med"
        }));
        const regencyAlerts = ptDictionary.findRegenciaAlertsSync(text).map((entry) => ({
            title: `${lang.t("xray_alert_regency")}: ${entry.verb}`,
            detail: entry.message,
            count: entry.count,
            conf: "med"
        }));
        const styleAlerts = this.buildEditorialAlerts(text);
        const alerts = doubtAlerts.concat(regencyAlerts, styleAlerts);
        alerts.forEach((alert) => {
            const key = `alert|${alert.title}`;
            if (!groups.review.has(key)) {
                groups.review.set(key, {
                    type: "alert",
                    lemma: alert.title,
                    conf: alert.conf || "med",
                    amb: false,
                    count: alert.count || 1,
                    forms: new Map()
                });
            }
            const g = groups.review.get(key);
            g.count = Math.max(g.count, alert.count || 1);
            const fKey = `${alert.detail}|ALERT`;
            if (!g.forms.has(fKey)) {
                g.forms.set(fKey, {
                    form: alert.detail,
                    tag: lang.t("xray_alert_tag"),
                    source: "heur",
                    amb: false,
                    count: alert.count || 1
                });
            }
        });
        return {
            verbs: Array.from(groups.verbs.values()),
            adjs: Array.from(groups.adjs.values()),
            review: Array.from(groups.review.values()),
            totals: {
                verbs: occurrences.filter(o => o.type === "verb").length,
                adjs: occurrences.filter(o => o.type === "adj").length,
                amb: occurrences.filter(o => o.amb).length,
                verbLemmas: groups.verbs.size,
                adjLemmas: groups.adjs.size
            }
        };
    },

    resolveLemmaDisplay(item) {
        const unknownLabel = lang.t("xray_lemma_unknown");
        const candidates = Array.isArray(item.lemmaCandidates) ? item.lemmaCandidates : null;
        const ambiguous = Boolean(candidates && candidates.length > 1);
        if (item.source !== "lex" && item.conf === "low") {
            return { display: unknownLabel, candidates: null, unknown: true, ambiguous: false };
        }
        if (ambiguous) {
            return { display: candidates.join(" / "), candidates, unknown: false, ambiguous: true };
        }
        return { display: item.lemma, candidates: null, unknown: false, ambiguous: false };
    },

    buildEditorialAlerts(text) {
        const alerts = [];
        const paragraphs = text.split(/\n{2,}/).filter(Boolean);
        const langCode = lang.current || "pt";
        paragraphs.forEach((para, idx) => {
            const tokens = this.getXrayTokens(para);
            const adjCounts = new Map();
            const verbTags = new Map();
            tokens.forEach((word) => {
                const lower = word.toLowerCase();
                const norm = this.normalizeXrayToken(lower);
                const adj = this.analyzeAdjective(norm, lower, langCode);
                if (adj) {
                    adjCounts.set(adj.lemma, (adjCounts.get(adj.lemma) || 0) + 1);
                }
                const verb = this.analyzeVerb(norm, lower, langCode);
                if (verb && verb.tag) {
                    verbTags.set(verb.tag, (verbTags.get(verb.tag) || 0) + 1);
                }
            });
            adjCounts.forEach((count, lemma) => {
                if (count >= 3) {
                    alerts.push({
                        title: lang.t("xray_alert_style_adj"),
                        detail: `${lemma} (${count}) — ${lang.t("xray_alert_paragraph")} ${idx + 1}`,
                        count,
                        conf: "low"
                    });
                }
            });
            verbTags.forEach((count, tag) => {
                if (count >= 6) {
                    alerts.push({
                        title: lang.t("xray_alert_style_tense"),
                        detail: `${tag} (${count}) — ${lang.t("xray_alert_paragraph")} ${idx + 1}`,
                        count,
                        conf: "low"
                    });
                }
            });
        });
        const tokensAll = this.getXrayTokens(text);
        let serEstar = 0;
        tokensAll.forEach((word) => {
            const lower = word.toLowerCase();
            const norm = this.normalizeXrayToken(lower);
            const verb = this.analyzeVerb(norm, lower, langCode);
            if (verb && (verb.lemma === "ser" || verb.lemma === "estar")) serEstar += 1;
        });
        if (serEstar >= 10) {
            alerts.push({
                title: lang.t("xray_alert_style_serestar"),
                detail: `${lang.t("xray_alert_occurrences")}: ${serEstar}`,
                count: serEstar,
                conf: "low"
            });
        }
        return alerts;
    },

    mergeConf(current, next) {
        const rank = { high: 3, med: 2, low: 1 };
        return rank[next] < rank[current] ? next : current;
    },

    renderXrayPanel() {
        if (!this.xrayList || !this.xrayData) return;
        const data = this.xrayData;
        const verbLabel = lang.t("xray_label_verbs");
        const adjLabel = lang.t("xray_label_adjs");
        const occLabel = lang.t("xray_label_occurrences");
        const lemmaLabel = lang.t("xray_label_lemmas");
        const ambLabel = lang.t("xray_label_amb");
        if (this.xraySummaryVerbs) {
            this.xraySummaryVerbs.textContent = `${verbLabel}: ${data.totals.verbs} ${occLabel} · ${data.totals.verbLemmas} ${lemmaLabel}`;
        }
        if (this.xraySummaryAdjs) {
            this.xraySummaryAdjs.textContent = `${adjLabel}: ${data.totals.adjs} ${occLabel} · ${data.totals.adjLemmas} ${lemmaLabel}`;
        }
        if (this.xraySummaryAmb) this.xraySummaryAmb.textContent = `${ambLabel}: ${data.totals.amb}`;

        const list = data[this.xrayActiveTab] || [];
        const query = (this.xraySearch?.value || "").trim().toLowerCase();
        const sort = this.xraySort?.value || "count";
        const confFilters = new Set();
        if (this.xrayFilterHigh?.checked) confFilters.add("high");
        if (this.xrayFilterMed?.checked) confFilters.add("med");
        if (this.xrayFilterLow?.checked) confFilters.add("low");
        const onlyAmb = this.xrayFilterAmb?.checked;

        let filtered = list.filter((g) => {
            if (!confFilters.has(g.conf)) return false;
            if (onlyAmb && !g.amb) return false;
            if (!query) return true;
            if (g.lemma.toLowerCase().includes(query)) return true;
            return Array.from(g.forms.values()).some(f => f.form.toLowerCase().includes(query));
        });

        if (sort === "alpha") {
            filtered = filtered.sort((a, b) => a.lemma.localeCompare(b.lemma));
        } else if (sort === "conf") {
            const rank = { high: 3, med: 2, low: 1 };
            filtered = filtered.sort((a, b) => rank[b.conf] - rank[a.conf]);
        } else {
            filtered = filtered.sort((a, b) => b.count - a.count);
        }

        this.xrayList.innerHTML = "";
        if (!filtered.length) {
            if (this.xrayEmptyEl) this.xrayEmptyEl.style.display = "block";
            return;
        }
        if (this.xrayEmptyEl) this.xrayEmptyEl.style.display = "none";
        filtered.forEach((group) => {
            const card = document.createElement("div");
            card.className = "xray-group";
            const header = document.createElement("div");
            header.className = "xray-group-header";
            const lemma = document.createElement("div");
            lemma.className = "xray-lemma";
            lemma.textContent = group.lemma;
            lemma.title = lang.t("xray_lemma_tooltip");
            const badges = document.createElement("div");
            badges.className = "xray-badges";
            const typeBadge = document.createElement("span");
            typeBadge.className = "xray-badge";
            if (group.type === "verb") {
                typeBadge.textContent = lang.t("xray_badge_verb");
            } else if (group.type === "adj") {
                typeBadge.textContent = lang.t("xray_badge_adj");
            } else {
                typeBadge.textContent = lang.t("xray_badge_alert");
            }
            const count = document.createElement("span");
            count.className = "xray-count";
            count.textContent = `${group.count}`;
            const confBadge = document.createElement("span");
            confBadge.className = `xray-badge ${group.conf}`;
            confBadge.textContent = group.conf === "high"
                ? lang.t("xray_conf_high").toUpperCase()
                : group.conf === "med"
                    ? lang.t("xray_conf_med").toUpperCase()
                    : lang.t("xray_conf_low").toUpperCase();
            confBadge.setAttribute("data-tip", group.conf === "high"
                ? lang.t("xray_tip_high")
                : group.conf === "med"
                    ? lang.t("xray_tip_med")
                    : lang.t("xray_tip_low"));
            badges.appendChild(typeBadge);
            if (group.lemmaUnknown) {
                const unkBadge = document.createElement("span");
                unkBadge.className = "xray-badge low";
                unkBadge.textContent = lang.t("xray_lemma_unknown_badge");
                unkBadge.setAttribute("data-tip", lang.t("xray_tip_uncertain"));
                badges.appendChild(unkBadge);
            }
            if (group.amb) {
                const ambBadge = document.createElement("span");
                ambBadge.className = "xray-badge amb";
                ambBadge.textContent = lang.t("xray_legend_amb");
                ambBadge.setAttribute("data-tip", lang.t("xray_tip_amb"));
                badges.appendChild(ambBadge);
            }
            badges.appendChild(confBadge);
            badges.appendChild(count);
            header.appendChild(lemma);
            header.appendChild(badges);

            const forms = document.createElement("div");
            forms.className = "xray-forms";
            const formList = Array.from(group.forms.values()).sort((a, b) => b.count - a.count);
            formList.forEach((form) => {
                const row = document.createElement("div");
                row.className = "xray-form-row";
                const formLabel = document.createElement("div");
                formLabel.textContent = form.form;
                const meta = document.createElement("div");
                meta.className = "xray-form-meta";
                if (form.tag) {
                    const tag = document.createElement("span");
                    tag.textContent = form.tag;
                    meta.appendChild(tag);
                }
                const src = document.createElement("span");
                src.className = `xray-badge ${form.source === "lex" ? "lex" : "heur"}`;
                src.textContent = form.source === "lex" ? lang.t("xray_legend_lex") : lang.t("xray_legend_heur");
                src.setAttribute("data-tip", form.source === "lex" ? lang.t("xray_tip_lex") : lang.t("xray_tip_heur"));
                meta.appendChild(src);
                if (form.amb) {
                    const ambBadge = document.createElement("span");
                    ambBadge.className = "xray-badge amb";
                    ambBadge.textContent = lang.t("xray_legend_amb");
                    ambBadge.setAttribute("data-tip", lang.t("xray_tip_amb"));
                    meta.appendChild(ambBadge);
                }
                const countSpan = document.createElement("span");
                countSpan.textContent = String(form.count);
                meta.appendChild(countSpan);
                row.appendChild(formLabel);
                row.appendChild(meta);
                if (form.rationale) {
                    const reason = document.createElement("div");
                    reason.className = "xray-form-rationale";
                    reason.textContent = form.rationale;
                    row.appendChild(reason);
                }
                if (form.alternatives) {
                    const alt = document.createElement("div");
                    alt.className = "xray-form-rationale";
                    alt.textContent = `${lang.t("xray_part_alternatives")}: ${form.alternatives.join(" | ")}`;
                    row.appendChild(alt);
                }
                row.addEventListener("click", () => {
                    if (this.xrayAuditActive) this.auditHighlight(form.form);
                });
                forms.appendChild(row);
            });
            header.addEventListener("click", () => {
                card.classList.toggle("open");
                if (this.xrayAuditActive) this.auditHighlight(group.lemma);
            });
            card.appendChild(header);
            card.appendChild(forms);
            this.xrayList.appendChild(card);
        });
    },

    normalizeXrayToken(word) {
        try {
            return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        } catch (_) {
            return word;
        }
    },

    getXrayTokens(text) {
        const raw = String(text || "");
        try {
            const matches = raw.match(/[\p{L}]{3,}/gu);
            return matches || [];
        } catch (_) {
            const matches = raw.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{3,}/g);
            return matches || [];
        }
    },

    getXrayTokenStream(text) {
        const raw = String(text || "");
        const tokens = [];
        try {
            const re = /[\p{L}]+/gu;
            let match;
            while ((match = re.exec(raw)) !== null) {
                const word = match[0];
                const lower = word.toLowerCase();
                tokens.push({
                    raw: word,
                    lower,
                    norm: this.normalizeXrayToken(lower),
                    index: tokens.length
                });
            }
        } catch (_) {
            const re = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;
            let match;
            while ((match = re.exec(raw)) !== null) {
                const word = match[0];
                const lower = word.toLowerCase();
                tokens.push({
                    raw: word,
                    lower,
                    norm: this.normalizeXrayToken(lower),
                    index: tokens.length
                });
            }
        }
        return tokens;
    },

    isXrayVerb(word, langCode) {
        const verbs = this.getXrayVerbList(langCode);
        if (verbs.has(word)) return true;
        if (langCode === "pt" && this.ptLexiconReady && this.ptLexicon && this.ptLexicon.verbs) {
            if (this.ptLexicon.verbs[word]) return true;
        }
        const suffixes = this.getXrayVerbSuffixes(langCode);
        return suffixes.some((suffix) => word.endsWith(suffix) && word.length > suffix.length + 1);
    },

    isXrayAdjective(word, langCode) {
        if (langCode === "pt" && this.ptLexiconReady && this.ptLexicon && this.ptLexicon.adjectives) {
            if (this.ptLexicon.adjectives[word]) return true;
        }
        const suffixes = this.getXrayAdjSuffixes(langCode);
        return suffixes.some((suffix) => word.endsWith(suffix) && word.length > suffix.length + 1);
    },

    isPtParticipleCandidate(word, verbEntry, adjEntry) {
        if (verbEntry && verbEntry.tag && verbEntry.tag.includes("PART")) return true;
        if (adjEntry && adjEntry.tag && /MASC|FEM|PL|INVAR/.test(adjEntry.tag)) return true;
        const irregulars = new Set([
            "feito", "dita", "dito", "visto", "posto",
            "escrito", "aberto", "preso", "solto", "morto"
        ]);
        if (irregulars.has(word)) return true;
        return /(ado|ada|ados|adas|ido|ida|idos|idas|to|ta|tos|tas|so|sa|sos|sas|cho|cha|chos|chas|sto|sta|stos|stas)$/.test(word);
    },

    classifyParticipleVsAdjective(index, tokens, verbEntry, adjEntry) {
        if (!tokens[index]) return null;
        const token = tokens[index];
        const auxStrong = new Set(["ter", "tinha", "tinham", "tenho", "tem", "temos", "teve", "tiveram", "haver", "havia", "houve", "haviam"]);
        const auxWeak = new Set(["ser", "estar", "ficar", "foi", "era", "estava", "foram", "sendo", "ficou"]);
        const intensifiers = new Set(["muito", "tão", "mais", "menos", "bem", "super", "quase"]);
        const determiners = new Set(["o", "a", "os", "as", "um", "uma", "uns", "umas", "este", "esta", "esse", "essa", "aquele", "aquela"]);
        const stop = new Set(["de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "por", "para", "com", "sem"]);
        let verbScore = 0;
        let adjScore = 0;
        const reasons = [];

        const prev = tokens[index - 1]?.norm || "";
        const prev2 = tokens[index - 2]?.norm || "";
        const next = tokens[index + 1]?.norm || "";
        const next2 = tokens[index + 2]?.norm || "";

        const prevAux = auxStrong.has(prev) || auxStrong.has(prev2);
        const prevAuxWeak = auxWeak.has(prev) || auxWeak.has(prev2);
        if (prevAux) {
            verbScore += 3;
            reasons.push(lang.t("xray_part_reason_aux"));
        } else if (prevAuxWeak) {
            verbScore += 2;
            reasons.push(lang.t("xray_part_reason_aux_weak"));
            if (adjEntry) adjScore += 1;
        }
        if (next === "por" || next2 === "por") {
            verbScore += 2;
            reasons.push(lang.t("xray_part_reason_passive"));
        }
        if (intensifiers.has(prev)) {
            adjScore += 2;
            reasons.push(lang.t("xray_part_reason_intensifier"));
        }
        if (prev2 && determiners.has(prev2) && prev && !stop.has(prev) && prev.length > 2) {
            adjScore += 2;
            reasons.push(lang.t("xray_part_reason_noun"));
        }
        if (next === "e" && next2 && this.lookupPtLexiconAdj(next2)) {
            adjScore += 2;
            reasons.push(lang.t("xray_part_reason_coord"));
        }
        if (verbEntry && !adjEntry) verbScore += 3;
        if (adjEntry && !verbEntry) adjScore += 3;
        if (verbEntry && adjEntry) {
            verbScore += 2;
            adjScore += 2;
        }

        const diff = Math.abs(verbScore - adjScore);
        let label = "adj";
        if (verbScore > adjScore) label = "verb";
        if (diff <= 1) label = "amb";

        const alternatives = [];
        const pushAlt = (label, entry) => {
            if (!entry) return;
            const conf = entry.conf === "high"
                ? lang.t("xray_conf_high").toUpperCase()
                : entry.conf === "med"
                    ? lang.t("xray_conf_med").toUpperCase()
                    : lang.t("xray_conf_low").toUpperCase();
            const tag = entry.tag ? ` · ${entry.tag}` : "";
            alternatives.push(`${label}: ${entry.lemma}${tag} · ${conf}`);
        };
        pushAlt(lang.t("xray_badge_adj"), adjEntry);
        pushAlt(lang.t("xray_badge_verb"), verbEntry);
        const lemmaCandidates = alternatives
            .filter((alt) => alt.source === "lex" && alt.lemma)
            .map((alt) => alt.lemma);

        let confidence = "low";
        if (label !== "amb") {
            const primary = label === "verb" ? verbEntry : adjEntry;
            if (primary && primary.source === "lex" && diff >= 2) confidence = "high";
            else if (primary && primary.source === "lex") confidence = "med";
            else confidence = "low";
        } else {
            confidence = verbEntry && adjEntry ? "med" : "low";
        }

        const rationale = diff <= 1 ? lang.t("xray_part_reason_amb") : reasons[0] || null;

        return {
            label: label === "amb" ? (adjScore >= verbScore ? "adj" : "verb") : label,
            ambiguous: label === "amb",
            confidence,
            lemmaCandidates: lemmaCandidates.length > 1 ? lemmaCandidates : null,
            rationale,
            alternatives: alternatives.length ? alternatives : null
        };
    },

    analyzeVerb(normWord, rawWord, langCode) {
        if (!this.isXrayVerb(normWord, langCode)) return null;
        if (langCode !== "pt") {
            return { form: rawWord, lemma: normWord, tag: "", conf: "low", ambiguous: false, source: "heur", lemmaCandidates: null };
        }
        const cleaned = this.stripPtClitics(normWord);
        const lex = this.lookupPtLexiconVerb(cleaned);
        if (lex) {
            const lemmaCandidates = this.getLemmaCandidates(lex.lemma, cleaned, "verb");
            return {
                form: rawWord,
                lemma: lex.lemma,
                tag: lex.tag || "",
                conf: lex.conf || "high",
                ambiguous: !!lex.ambiguous,
                source: "lex",
                lemmaCandidates
            };
        }
        const analysis = this.inferPtVerb(cleaned);
        if (!analysis) return null;
        const ambiguous = analysis.ambiguous || this.isPtAmbiguousToken(cleaned);
        return {
            form: rawWord,
            lemma: analysis.lemma,
            tag: analysis.tag,
            conf: "low",
            ambiguous,
            source: "heur",
            lemmaCandidates: null
        };
    },

    analyzeAdjective(normWord, rawWord, langCode) {
        if (!this.isXrayAdjective(normWord, langCode)) return null;
        if (langCode !== "pt") {
            return { form: rawWord, lemma: normWord, tag: "", conf: "low", ambiguous: false, source: "heur", lemmaCandidates: null };
        }
        const lex = this.lookupPtLexiconAdj(normWord);
        if (lex) {
            const lemmaCandidates = this.getLemmaCandidates(lex.lemma, normWord, "adj");
            return {
                form: rawWord,
                lemma: lex.lemma,
                tag: lex.tag || "",
                conf: lex.conf || "high",
                ambiguous: !!lex.ambiguous,
                source: "lex",
                lemmaCandidates
            };
        }
        const analysis = this.inferPtAdjective(normWord);
        const ambiguous = analysis.ambiguous || this.isPtAmbiguousToken(normWord);
        return {
            form: rawWord,
            lemma: analysis.lemma,
            tag: analysis.tag,
            conf: "low",
            ambiguous,
            source: "heur",
            lemmaCandidates: null
        };
    },

    getLemmaCandidates(primary, form, type) {
        const list = [];
        const add = (lemma) => {
            if (!lemma) return;
            if (!list.includes(lemma)) list.push(lemma);
        };
        if (primary && primary.includes("/")) {
            primary.split("/").map(s => s.trim()).forEach(add);
        } else {
            add(primary);
        }
        if (type === "verb") {
            const adj = this.lookupPtLexiconAdj(form);
            if (adj) add(adj.lemma);
            const part = this.getPtParticipleLemma(form);
            if (part) add(part);
        } else {
            const verb = this.lookupPtLexiconVerb(form);
            if (verb) add(verb.lemma);
            const part = this.getPtParticipleLemma(form);
            if (part) add(part);
        }
        return list.length > 1 ? list : null;
    },

    getPtParticipleLemma(form) {
        if (!this.ptLexiconReady || !this.ptLexicon || !this.ptLexicon.verbs) return null;
        const cleaned = this.normalizeXrayToken(form);
        const patterns = [
            { re: /(ados|adas|ado|ada)$/, lemma: "ar" },
            { re: /(idos|idas|ido|ida)$/, lemma: "er" }
        ];
        for (const pattern of patterns) {
            if (pattern.re.test(cleaned)) {
                const base = cleaned.replace(pattern.re, pattern.lemma);
                if (this.ptLexicon.verbs[base]) return base;
            }
        }
        return null;
    },

    stripPtClitics(word) {
        const cleaned = word.split("-")[0];
        return cleaned.replace(/(me|te|se|nos|vos|lhe|lhes|lo|la|los|las|no|na|nos|nas)$/i, "");
    },

    inferPtVerb(word) {
        const base = word.toLowerCase();
        if (base.length < 3) return null;
        const irregular = this.lookupPtIrregularVerb(base);
        if (irregular) return irregular;
        if (/(ar|er|ir)$/.test(base)) {
            return { lemma: base, tag: "INF", conf: "high", ambiguous: false };
        }
        if (/ando$/.test(base)) {
            return { lemma: base.replace(/ando$/, "ar"), tag: "GER", conf: "med", ambiguous: false };
        }
        if (/endo$/.test(base)) {
            return { lemma: base.replace(/endo$/, "er"), tag: "GER", conf: "med", ambiguous: false };
        }
        if (/indo$/.test(base)) {
            return { lemma: base.replace(/indo$/, "ir"), tag: "GER", conf: "med", ambiguous: false };
        }
        if (/ado$/.test(base)) {
            return { lemma: base.replace(/ado$/, "ar"), tag: "PART", conf: "med", ambiguous: true };
        }
        if (/ido$/.test(base)) {
            return { lemma: base.replace(/ido$/, "ir"), tag: "PART", conf: "med", ambiguous: true };
        }
        if (/arei$/.test(base)) {
            return { lemma: base.replace(/arei$/, "ar"), tag: "FUT/1S", conf: "med", ambiguous: false };
        }
        if (/erei$/.test(base)) {
            return { lemma: base.replace(/erei$/, "er"), tag: "FUT/1S", conf: "med", ambiguous: false };
        }
        if (/irei$/.test(base)) {
            return { lemma: base.replace(/irei$/, "ir"), tag: "FUT/1S", conf: "med", ambiguous: false };
        }
        if (/ará$/.test(base)) {
            return { lemma: base.replace(/ará$/, "ar"), tag: "FUT/3S", conf: "med", ambiguous: false };
        }
        if (/erá$/.test(base)) {
            return { lemma: base.replace(/erá$/, "er"), tag: "FUT/3S", conf: "med", ambiguous: false };
        }
        if (/irá$/.test(base)) {
            return { lemma: base.replace(/irá$/, "ir"), tag: "FUT/3S", conf: "med", ambiguous: false };
        }
        if (/ava$/.test(base)) {
            return { lemma: base.replace(/ava$/, "ar"), tag: "IMP/1-3S", conf: "med", ambiguous: false };
        }
        if (/ia$/.test(base)) {
            return { lemma: base.replace(/ia$/, "er"), tag: "IMP/1-3S", conf: "low", ambiguous: false };
        }
        if (/o$/.test(base) && base.length > 3) {
            return { lemma: base.replace(/o$/, "ar"), tag: "PRES/1S", conf: "low", ambiguous: false };
        }
        return { lemma: base, tag: "", conf: "low", ambiguous: false };
    },

    inferPtAdjective(word) {
        const base = word.toLowerCase();
        const amb = this.isPtAmbiguousToken(base);
        if (/as$/.test(base)) {
            return { lemma: base.replace(/as$/, "o"), tag: "FEM.PL", conf: amb ? "low" : "med", ambiguous: amb };
        }
        if (/os$/.test(base)) {
            return { lemma: base.replace(/os$/, "o"), tag: "MASC.PL", conf: amb ? "low" : "med", ambiguous: amb };
        }
        if (/a$/.test(base)) {
            return { lemma: base.replace(/a$/, "o"), tag: "FEM.SG", conf: amb ? "low" : "low", ambiguous: amb };
        }
        if (/o$/.test(base)) {
            return { lemma: base, tag: "MASC.SG", conf: amb ? "low" : "low", ambiguous: amb };
        }
        return { lemma: base, tag: "", conf: amb ? "low" : "low", ambiguous: amb };
    },

    lookupPtIrregularVerb(word) {
        const map = {
            sou: { lemma: "ser", tag: "PRES/1S", conf: "high", ambiguous: false },
            es: { lemma: "ser", tag: "PRES/2S", conf: "high", ambiguous: false },
            eh: { lemma: "ser", tag: "PRES/3S", conf: "high", ambiguous: false },
            somos: { lemma: "ser", tag: "PRES/1P", conf: "high", ambiguous: false },
            sao: { lemma: "ser", tag: "PRES/3P", conf: "high", ambiguous: false },
            era: { lemma: "ser", tag: "IMP/1-3S", conf: "med", ambiguous: false },
            eram: { lemma: "ser", tag: "IMP/3P", conf: "med", ambiguous: false },
            fui: { lemma: "ser/ir", tag: "PRET/1S", conf: "low", ambiguous: true },
            foi: { lemma: "ser/ir", tag: "PRET/3S", conf: "low", ambiguous: true },
            fomos: { lemma: "ser/ir", tag: "PRET/1P", conf: "low", ambiguous: true },
            foram: { lemma: "ser/ir", tag: "PRET/3P", conf: "low", ambiguous: true },
            estou: { lemma: "estar", tag: "PRES/1S", conf: "high", ambiguous: false },
            esta: { lemma: "estar", tag: "PRES/3S", conf: "high", ambiguous: false },
            estamos: { lemma: "estar", tag: "PRES/1P", conf: "high", ambiguous: false },
            estao: { lemma: "estar", tag: "PRES/3P", conf: "high", ambiguous: false },
            estava: { lemma: "estar", tag: "IMP/1-3S", conf: "med", ambiguous: false },
            tenho: { lemma: "ter", tag: "PRES/1S", conf: "high", ambiguous: false },
            tem: { lemma: "ter", tag: "PRES/3S", conf: "high", ambiguous: false },
            temos: { lemma: "ter", tag: "PRES/1P", conf: "high", ambiguous: false },
            tinha: { lemma: "ter", tag: "IMP/1-3S", conf: "med", ambiguous: false },
            vou: { lemma: "ir", tag: "PRES/1S", conf: "high", ambiguous: false },
            vai: { lemma: "ir", tag: "PRES/3S", conf: "high", ambiguous: false },
            vamos: { lemma: "ir", tag: "PRES/1P", conf: "high", ambiguous: false },
            vao: { lemma: "ir", tag: "PRES/3P", conf: "high", ambiguous: false },
            vejo: { lemma: "ver", tag: "PRES/1S", conf: "high", ambiguous: false },
            ve: { lemma: "ver", tag: "PRES/3S", conf: "high", ambiguous: false },
            posso: { lemma: "poder", tag: "PRES/1S", conf: "high", ambiguous: false },
            pode: { lemma: "poder", tag: "PRES/3S", conf: "low", ambiguous: true },
            sei: { lemma: "saber", tag: "PRES/1S", conf: "high", ambiguous: false }
        };
        const cleaned = this.normalizeXrayToken(word);
        return map[cleaned] || null;
    },

    lookupPtLexiconVerb(word) {
        if (!this.ptLexiconReady || !this.ptLexicon || !this.ptLexicon.verbs) return null;
        const cleaned = this.normalizeXrayToken(word);
        return this.ptLexicon.verbs[cleaned] || null;
    },

    lookupPtLexiconAdj(word) {
        if (!this.ptLexiconReady || !this.ptLexicon || !this.ptLexicon.adjectives) return null;
        const cleaned = this.normalizeXrayToken(word);
        return this.ptLexicon.adjectives[cleaned] || null;
    },

    isPtAmbiguousToken(word) {
        const cleaned = this.normalizeXrayToken(word);
        if (this.ptLexiconReady && this.ptLexicon && Array.isArray(this.ptLexicon.ambiguous)) {
            return this.ptLexicon.ambiguous.includes(cleaned);
        }
        const list = [
            "meio", "mesmo", "muito", "pouco", "certo", "so",
            "melhor", "pior", "maior", "menor", "pode", "falo", "cansado"
        ];
        return list.includes(cleaned);
    },

    getXrayVerbList(langCode) {
        const lists = {
            pt: ["ser", "estar", "ter", "fazer", "ir", "ver", "dar", "dizer", "poder", "querer", "saber", "ficar", "vir", "haver", "usar", "criar", "salvar", "ler", "escrever"],
            "en-uk": ["be", "have", "do", "make", "go", "see", "give", "say", "can", "want", "know", "stay", "come", "use", "create", "save", "read", "write"],
            es: ["ser", "estar", "tener", "hacer", "ir", "ver", "dar", "decir", "poder", "querer", "saber", "quedar", "venir", "haber", "usar", "crear", "guardar", "leer", "escribir"],
            fr: ["etre", "avoir", "faire", "aller", "voir", "donner", "dire", "pouvoir", "vouloir", "savoir", "rester", "venir", "utiliser", "creer", "sauver", "lire", "ecrire"]
        };
        const key = lists[langCode] ? langCode : "pt";
        return new Set(lists[key].map((word) => this.normalizeXrayToken(word)));
    },

    getXrayVerbSuffixes(langCode) {
        const base = ["ar", "er", "ir"];
        const english = ["ed", "ing", "ise", "ize", "ate", "ify"];
        const french = ["er", "ir", "re"];
        if (langCode === "en-uk") return english;
        if (langCode === "fr") return french;
        return base;
    },

    getXrayAdjSuffixes(langCode) {
        const romance = ["oso", "osa", "vel", "veis", "ivo", "iva", "ico", "ica", "ente", "ante", "avel", "ivel", "ável", "ível"];
        const english = ["ous", "able", "ible", "ive", "al", "ful", "less", "ic", "ical"];
        const french = ["eux", "euse", "able", "ible", "ant", "ente", "if", "ive", "ique"];
        if (langCode === "en-uk") return english;
        if (langCode === "fr") return french;
        return romance;
    },

    sortXrayCounts(map) {
        return Array.from(map.values())
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.word.localeCompare(b.word);
            })
            .slice(0, 10)
            .map((entry) => {
                const confLabel = lang.t(entry.conf === "high" ? "xray_conf_high" : entry.conf === "med" ? "xray_conf_med" : "xray_conf_low");
                const amb = entry.ambiguous ? " · amb" : "";
                const tag = entry.tag ? ` · ${entry.tag}` : "";
                return [`${entry.word} → ${entry.lemma}${tag}${amb} · ${confLabel}`, entry.count];
            });
    },

    renderXrayList(target, items) {
        target.innerHTML = "";
        if (!items.length) return;
        items.forEach(([word, count]) => {
            const row = document.createElement("div");
            row.className = "xray-panel-item";
            const label = document.createElement("span");
            label.textContent = word;
            label.dataset.form = word.split("→")[0].trim();
            const badge = document.createElement("strong");
            badge.textContent = String(count);
            row.appendChild(label);
            row.appendChild(badge);
            row.addEventListener("click", () => {
                if (!this.xrayAuditActive) return;
                const form = label.dataset.form || "";
                if (form) this.auditHighlight(form);
            });
            target.appendChild(row);
        });
    },

    auditHighlight(form) {
        const text = this.editor ? this.editor.innerText || "" : "";
        if (!text) return;
        const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "gi");
        const indices = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            indices.push({ start: match.index, end: match.index + match[0].length });
        }
        if (!indices.length) return;
        const key = form.toLowerCase();
        const next = (this.xrayAuditState.get(key) || 0) % indices.length;
        this.xrayAuditState.set(key, next + 1);
        const range = this.findRangeByTextOffset(indices[next].start, indices[next].end);
        if (!range) return;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        const rect = range.getBoundingClientRect();
        if (rect && this.editor) {
            const panel = this.editor.closest(".panel");
            if (panel) {
                const panelRect = panel.getBoundingClientRect();
                const top = rect.top - panelRect.top + panel.scrollTop;
                panel.scrollTo({ top: Math.max(0, top - panelRect.height / 2), behavior: "smooth" });
            }
        }
    },

    findRangeByTextOffset(start, end) {
        if (!this.editor) return null;
        const walker = document.createTreeWalker(this.editor, NodeFilter.SHOW_TEXT, null);
        let node = walker.nextNode();
        let offset = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;
        while (node) {
            const len = node.nodeValue.length;
            if (startNode === null && offset + len >= start) {
                startNode = node;
                startOffset = Math.max(0, start - offset);
            }
            if (offset + len >= end) {
                endNode = node;
                endOffset = Math.max(0, end - offset);
                break;
            }
            offset += len;
            node = walker.nextNode();
        }
        if (!startNode || !endNode) return null;
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
    },

    runXrayTests() {
        const results = [];
        xrayTests.forEach((test) => {
            const norm = this.normalizeXrayToken(test.form.toLowerCase());
            let res = null;
            if (test.type === "verb") {
                res = this.analyzeVerb(norm, test.form, "pt");
            } else {
                res = this.analyzeAdjective(norm, test.form, "pt");
            }
            const ambOk = typeof test.ambiguous === "boolean" ? (res && res.ambiguous === test.ambiguous) : true;
            const ok = res && res.lemma === test.lemma && (!test.tag || res.tag === test.tag) && ambOk;
            results.push({ ...test, ok, got: res });
        });
        const passed = results.filter(r => r.ok).length;
        const total = results.length;
        if (window.totModal?.alert) {
            window.totModal.alert(`X-RAY TESTS: ${passed}/${total} OK`);
        } else {
            console.log("X-RAY TESTS", results);
        }
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
        const btnRulerClose = document.getElementById("btnReaderRulerClose");
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
        if (btnRulerClose) {
            btnRulerClose.onclick = () => {
                if (!this.readerBox) return;
                this.readerBox.classList.remove("show-ruler");
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
                if (cmd === "consult") {
                    this.openConsult();
                    return;
                }
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

    initDictionary() {
        this.consultModal = document.getElementById("consultModal");
        this.consultClose = document.getElementById("consultClose");
        this.consultWord = document.getElementById("consultWord");
        this.consultLemma = document.getElementById("consultLemma");
        this.consultPos = document.getElementById("consultPos");
        this.consultDef = document.getElementById("consultDef");
        this.consultFlex = document.getElementById("consultFlex");
        this.consultRegency = document.getElementById("consultRegency");
        this.consultExamples = document.getElementById("consultExamples");
        this.consultNotes = document.getElementById("consultNotes");
        this.consultDoubtWrap = document.getElementById("consultDoubtWrap");
        this.consultDoubt = document.getElementById("consultDoubt");
        this.consultNotFound = document.getElementById("consultNotFound");
        this.consultOutScope = document.getElementById("consultOutScope");
        this.consultAddPersonal = document.getElementById("consultAddPersonal");
        this.consultStatus = document.getElementById("consultStatus");
        if (!this.consultModal) return;
        if (this.consultClose) {
            this.consultClose.addEventListener("click", () => this.closeConsult());
        }
        this.consultModal.addEventListener("click", (e) => {
            if (e.target === this.consultModal) this.closeConsult();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.consultModal.classList.contains("active")) {
                this.closeConsult();
            }
        });
        if (this.consultAddPersonal) {
            this.consultAddPersonal.addEventListener("click", () => this.addToPersonalDictionary());
        }
        ptDictionary.preload().catch(() => {});
    },

    getSelectedWord() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
        const range = sel.getRangeAt(0);
        if (!this.editor.contains(range.commonAncestorContainer)) return null;
        const raw = sel.toString().trim();
        if (!raw || raw.length > 40) return null;
        if (/\s/.test(raw)) return null;
        const clean = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
        if (!clean) return null;
        return { raw, clean };
    },

    async openConsult() {
        if (!this.consultModal) return;
        const selection = this.getSelectedWord();
        if (!selection) return;
        const word = selection.clean;
        const lookupKey = ptDictionary.normalizeLookupKey(selection.raw || word);
        let entry = null;
        let doubt = null;
        let lookupMeta = null;
        try {
            await ptDictionary.preload();
            lookupMeta = await ptDictionary.lookupDetailed(lookupKey);
            entry = lookupMeta.entry;
        } catch (_) {
            entry = null;
        }
        try {
            doubt = await ptDictionary.getDoubt(word);
        } catch (_) {
            doubt = null;
        }
        const norm = this.normalizeXrayToken(word.toLowerCase());
        const langCode = lang.current || "pt";
        const verb = this.analyzeVerb(norm, word.toLowerCase(), langCode);
        const adj = this.analyzeAdjective(norm, word.toLowerCase(), langCode);
        const analysis = verb || adj;
        const analysisType = verb ? "VERB" : adj ? "ADJ" : null;
        if (this.lexiconPopup) this.hideLexicon();

        if (this.consultWord) this.consultWord.textContent = word.toUpperCase();
        if (this.consultLemma) {
            const lemma = entry?.lemma
                || (analysis && analysis.source === "lex" ? analysis.lemma : null)
                || null;
            const label = lemma ? lemma.toUpperCase() : lang.t("xray_lemma_unknown");
            this.consultLemma.textContent = label;
        }
        if (this.consultPos) {
            const pos = entry?.pos?.length
                ? entry.pos.join(", ")
                : analysisType || "—";
            this.consultPos.textContent = pos;
        }
        if (this.consultDef) this.consultDef.textContent = entry?.def || "—";
        if (this.consultFlex) {
            const flex = []
                .concat(entry?.formas || [])
                .concat(entry?.flexoes || []);
            this.consultFlex.textContent = flex.length ? flex.join(", ") : "—";
        }
        if (this.consultRegency) {
            const lemma = entry?.lemma || (analysis && analysis.source === "lex" ? analysis.lemma : word);
            let regData = null;
            try {
                regData = await ptDictionary.getRegencia(lemma);
            } catch (_) {
                regData = null;
            }
            const reg = []
                .concat(entry?.regencia || [])
                .concat(regData ? Object.values(regData.sentidos || {}).map((s) => s.regencia) : []);
            const unique = Array.from(new Set(reg.filter(Boolean)));
            this.consultRegency.textContent = unique.length ? unique.join(" · ") : "—";
        }
        if (this.consultExamples) {
            const examples = entry?.exemplos || [];
            this.consultExamples.textContent = examples.length ? examples.join(" | ") : "—";
        }
        if (this.consultNotes) {
            const notes = entry?.observacoes || (analysis?.ambiguous ? lang.t("consult_amb_note") : null);
            this.consultNotes.textContent = notes || "—";
        }
        if (this.consultDoubtWrap && this.consultDoubt) {
            if (doubt) {
                this.consultDoubtWrap.style.display = "grid";
                const examples = doubt.exemplos || {};
                const correct = (examples.correto || []).join(" ");
                const wrong = (examples.incorreto || []).join(" ");
                const parts = [doubt.explicacao, correct && `✔ ${correct}`, wrong && `✕ ${wrong}`].filter(Boolean);
                this.consultDoubt.textContent = parts.join(" ");
            } else {
                this.consultDoubtWrap.style.display = "none";
                this.consultDoubt.textContent = "";
            }
        }
        if (this.consultNotFound || this.consultOutScope) {
            const found = Boolean(entry);
            const outScope = !found && !analysisType;
            if (this.consultNotFound) this.consultNotFound.style.display = found || outScope ? "none" : "block";
            if (this.consultOutScope) this.consultOutScope.style.display = outScope ? "block" : "none";
        }
        if (this.consultStatus) {
            const tried = lookupMeta && lookupMeta.tried && lookupMeta.tried.length
                ? `${lang.t("consult_status_tried")} ${lookupMeta.tried.slice(0, 6).join(", ")}`
                : lang.t("consult_status_idle");
            const statusMeta = lookupMeta?.status
                ? ` · ${Math.round(((lookupMeta.status.chunksLoaded + (lookupMeta.status.coreLoaded ? 1 : 0)) / (lookupMeta.status.chunksTotal + 1)) * 100)}%`
                : "";
            const status = `${tried}${statusMeta}`;
            this.consultStatus.textContent = status;
        }

        if (lookupMeta) {
            console.info("[CONSULT]", {
                raw: selection.raw,
                normalized: lookupKey,
                lemma: entry?.lemma || null,
                tried: lookupMeta.tried,
                status: lookupMeta.status,
                error: lookupMeta.error ? String(lookupMeta.error) : null
            });
        }

        this.consultModal.classList.add("active");
        this.consultModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("consult-open");
    },

    closeConsult() {
        if (!this.consultModal) return;
        this.consultModal.classList.remove("active");
        this.consultModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("consult-open");
    },

    addToPersonalDictionary() {
        const selection = this.getSelectedWord();
        if (!selection || !this.consultStatus) return;
        const word = selection.clean.toLowerCase();
        const stored = JSON.parse(localStorage.getItem("tot_personal_dict") || "[]");
        if (!stored.includes(word)) stored.push(word);
        localStorage.setItem("tot_personal_dict", JSON.stringify(stored));
        this.consultStatus.textContent = lang.t("consult_status_added");
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
