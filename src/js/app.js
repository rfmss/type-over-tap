/* * T∅T - Editor - CORE MODULE
 * Fixes: Memo persistence bug (Ghost Data)
 */

import { store } from './modules/store.js';
import { ui } from './modules/ui.js';
import { editorFeatures } from './modules/editor.js';
import { lang } from './modules/lang.js';
import { auth } from './modules/auth.js';
import { exportTot, importTot } from './modules/export_tot.js';
import { birthTracker } from './modules/birth_tracker.js';
import { qrTransfer } from './modules/qr_transfer.js';


document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add("booting");
    setTimeout(() => document.body.classList.remove("booting"), 2000);
    console.log("🚀 T∅T SYSTEM BOOTING v5.5...");

    store.init();
    incrementAccessCount();
    const preferFull = localStorage.getItem("lit_mobile_full") === "true";
    if (window.innerWidth <= 900 && !preferFull) {
        document.body.classList.add("mobile-lite");
    }
    ui.init();
    
    lang.init();
    window.totModal = initSystemModal();
    auth.init();
    
    ui.initPomodoro();
    qrTransfer.init({
        onRestore: (payload) => {
            if (payload && applyTotPayload(payload)) {
                if (window.totModal) window.totModal.alert(lang.t("alert_backup_restored"));
                location.reload();
            } else {
                if (window.totModal) window.totModal.alert(lang.t("alert_backup_invalid"));
            }
        }
    });
    
    const editorEl = document.getElementById("editor");
    editorFeatures.init(editorEl);
    birthTracker.init(editorEl);
    
    loadActiveDocument();
    editorFeatures.schedulePaginationUpdate();
    editorFeatures.refreshStats();
    setupEventListeners();
    restoreEditorScroll();
    initMobileMemos();
    initMobileIntro();
    initMobileFullToggle();
    initMobileTapToEdit();
    initMobileEdgeHandle();

    // TRAVA DE SEGURANÇA (Anti-Close)
    window.addEventListener("beforeunload", (e) => {
        store.persist(true);
        e.preventDefault();
        e.returnValue = lang.t("confirm_exit");
    });

    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./sw.js").catch(() => {});
        });
    }
});

function initSystemModal() {
    const overlay = document.getElementById("systemModal");
    if (!overlay) {
        return {
            alert: async () => {},
            confirm: async () => false,
            prompt: async () => null,
            cancel: () => {}
        };
    }
    const titleEl = document.getElementById("systemModalTitle");
    const msgEl = document.getElementById("systemModalMessage");
    const inputEl = document.getElementById("systemModalInput");
    const btnCancel = document.getElementById("systemModalCancel");
    const btnConfirm = document.getElementById("systemModalConfirm");
    const btnClose = document.getElementById("closeSystemModal");
    const actions = overlay.querySelector(".system-modal-actions");

    let resolver = null;
    let activeType = "alert";

    const setActionsLayout = (showCancel) => {
        if (!actions) return;
        actions.classList.toggle("single", !showCancel);
        if (btnCancel) btnCancel.style.display = showCancel ? "" : "none";
    };

    const close = (result) => {
        overlay.classList.remove("active");
        if (inputEl) inputEl.value = "";
        if (resolver) {
            const resolve = resolver;
            resolver = null;
            resolve(result);
        }
    };

    const open = (type, options = {}) => new Promise((resolve) => {
        resolver = resolve;
        activeType = type;
        const title = options.title || lang.t("modal_title");
        const message = options.message || "";
        const confirmLabel = options.confirmLabel || lang.t("modal_ok");
        const cancelLabel = options.cancelLabel || lang.t("modal_cancel");

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnConfirm) btnConfirm.textContent = confirmLabel;
        if (btnCancel) btnCancel.textContent = cancelLabel;

        const wantsInput = type === "prompt";
        if (inputEl) {
            inputEl.style.display = wantsInput ? "block" : "none";
            inputEl.value = wantsInput ? (options.defaultValue || "") : "";
        }
        setActionsLayout(type !== "alert");
        overlay.classList.add("active");
        setTimeout(() => {
            if (wantsInput && inputEl) inputEl.focus();
            else if (btnConfirm) btnConfirm.focus();
        }, 20);
    });

    const handleCancel = () => {
        if (!resolver) return;
        if (activeType === "prompt") close(null);
        else close(false);
    };

    const handleConfirm = () => {
        if (!resolver) return;
        if (activeType === "prompt") close(inputEl ? inputEl.value : "");
        else close(true);
    };

    if (btnCancel) btnCancel.onclick = handleCancel;
    if (btnConfirm) btnConfirm.onclick = handleConfirm;
    if (btnClose) btnClose.onclick = handleCancel;

    overlay.addEventListener("click", (e) => {
        if (e.target !== overlay) return;
        if (activeType === "alert") close(true);
        else handleCancel();
    });

    if (inputEl) {
        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
            }
            if (e.key === "Escape") {
                e.preventDefault();
                handleCancel();
            }
        });
    }

    return {
        alert: (message, options = {}) => open("alert", { ...options, message }),
        confirm: (message, options = {}) => open("confirm", { ...options, message }),
        prompt: (message, options = {}) => open("prompt", { ...options, message }),
        cancel: handleCancel
    };
}

function loadActiveDocument() {
    const activeDoc = store.getActive();
    const editorEl = document.getElementById("editor");
    
    if (activeDoc) {
        // Carrega o conteúdo salvo
        editorEl.innerHTML = activeDoc.content || ""; 
        
        document.getElementById("currentDocLabel").innerText = activeDoc.name;
        
        // [CORREÇÃO v5.5] Força a limpeza do campo Memo
        // Usa o operador || "" para garantir que se for null/undefined, ele limpa o campo visualmente
        document.getElementById("memoArea").value = store.data.memo || "";
        
        if (activeDoc.cursorPos !== undefined && activeDoc.cursorPos !== null) {
            restoreCursorPos(activeDoc.cursorPos);
        } else {
            const gate = document.getElementById("gatekeeper");
            if (!gate || gate.style.display === "none") {
                editorEl.focus(); 
            }
        }
        editorFeatures.schedulePaginationUpdate();
        editorFeatures.refreshStats();
    }
}

function setupEventListeners() {
    initHelpTabs();

      // Views (Editor / Books)
    const showEditorView = () => {
        const ev = document.getElementById("editorView");
        const bv = document.getElementById("booksView");
        const panel = document.querySelector(".panel");
        if (ev) ev.style.display = "";
        if (bv) bv.style.display = "none";
        const editorEl = document.getElementById("editor");
        if (editorEl) editorEl.focus();
        if (panel) panel.classList.remove("books-active");
        localStorage.setItem("lit_ui_view", "editor");
    };

    const showBooksView = () => {
        const ev = document.getElementById("editorView");
        const bv = document.getElementById("booksView");
        const panel = document.querySelector(".panel");
        if (ev) ev.style.display = "none";
        if (bv) bv.style.display = "block";
        if (panel) panel.classList.add("books-active");
        localStorage.setItem("lit_ui_view", "books");
    };

    // Gavetas (abrir drawer volta para o editor)
    document.getElementById("tabFiles").onclick = () => { showEditorView(); ui.openDrawer('files', { renderFiles: renderProjectList }); };
    document.getElementById("tabNav").onclick = () => { showEditorView(); ui.openDrawer('nav', { renderNav: renderNavigation }); };
    document.getElementById("tabMemo").onclick = () => { showEditorView(); ui.openDrawer('memo', {}); };
    document.getElementById("closeDrawer").onclick = () => ui.closeDrawer();

    // Books (modo interno via iframe)
    const tabBooks = document.getElementById("tabBooks");
    if (tabBooks) tabBooks.onclick = () => { ui.closeDrawer(); showBooksView(); };


    document.addEventListener('click', (e) => {
        const d = document.getElementById("drawer");
        const h = document.querySelector(".hud");
        if (e.target.closest('#gatekeeper')) return;
        if (d.classList.contains("open") && !d.contains(e.target) && !h.contains(e.target)) ui.closeDrawer();
    });
    const panelArea = document.querySelector(".panel");
    if (panelArea) {
        panelArea.addEventListener("touchstart", () => {
            if (window.innerWidth <= 900) ui.closeDrawer();
        }, { passive: true });
    }

    // Importar/Exportar
    const btnImport = document.getElementById("btnImport");
    const fileInput = document.getElementById("fileInput");
    btnImport.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            if (file.name.endsWith('.tot')) {
                const payload = importTot(evt.target.result);
                if (payload && applyTotPayload(payload)) {
                    if (window.totModal) window.totModal.alert(lang.t("alert_capsule_restored"));
                    location.reload();
                } else {
                    if (window.totModal) window.totModal.alert(lang.t("alert_capsule_invalid"));
                }
            } else if (file.name.endsWith('.b64') || file.name.endsWith('.qr')) {
                const payload = qrTransfer.decodeBackupBase64(evt.target.result);
                if (payload && applyTotPayload(payload)) {
                    if (window.totModal) window.totModal.alert(lang.t("alert_backup_restored"));
                    location.reload();
                } else {
                    if (window.totModal) window.totModal.alert(lang.t("alert_backup_invalid"));
                }
            } else if (file.name.endsWith('.json')) {
                if (window.innerWidth <= 900) {
                    try {
                        const data = JSON.parse(evt.target.result || "{}");
                        if (data.projects && Array.isArray(data.projects)) {
                            importMobileMemosFromProjects(data.projects);
                            ui.closeDrawer();
                            return;
                        }
                    } catch (_) {
                        if (window.totModal) window.totModal.alert(lang.t("alert_backup_json_error"));
                        return;
                    }
                }
                if (store.importData(evt.target.result)) { 
                    if (window.totModal) window.totModal.alert(lang.t("alert_backup_restored")); 
                    location.reload(); 
                }
            } else {
                store.createProject(file.name, evt.target.result); 
                loadActiveDocument(); renderProjectList(); ui.closeDrawer();
            }
        };
        reader.readAsText(file);
        fileInput.value = ''; 
    };

    document.getElementById("btnSave").onclick = () => document.getElementById("exportModal").classList.add("active");
    document.getElementById("closeModalExport").onclick = () => document.getElementById("exportModal").classList.remove("active");
    const btnFediverse = document.getElementById("btnFediverseHelp");
    if (btnFediverse) {
        btnFediverse.onclick = () => {
            const modal = document.getElementById("fediverseModal");
            if (modal) modal.classList.add("active");
        };
    }
    const closeFediverse = document.getElementById("closeFediverse");
    if (closeFediverse) {
        closeFediverse.onclick = () => {
            const modal = document.getElementById("fediverseModal");
            if (modal) modal.classList.remove("active");
        };
    }
    document.querySelectorAll(".social-link").forEach((btn) => {
        btn.addEventListener("click", () => {
            const shareText = lang.t("share_message");
            const baseUrl = btn.dataset.url || "";
            const network = (btn.dataset.network || "").toLowerCase();
            let targetUrl = baseUrl;
            if (network === "x") {
                targetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
            }
            if (targetUrl) window.open(targetUrl, "_blank", "noopener");
        });
    });

    // Downloads e QR
    // Downloads (JSON / TXT / TOT)
    const btnMd = document.getElementById("actionDownloadMd");
    if (btnMd) {
        btnMd.onclick = () => {
            store.save(
                document.getElementById("editor").innerHTML,
                document.getElementById("memoArea").value
            );
            const markdown = buildMarkdownExport();
            downloadText(markdown, `TOT_EXPORT_${Date.now()}.md`, "text/markdown");
            document.getElementById("exportModal").classList.remove("active");
        };
    }

    const btnPrintReport = document.getElementById("actionPrintReport");
    if (btnPrintReport) {
        btnPrintReport.onclick = () => {
            store.save(
                document.getElementById("editor").innerHTML,
                document.getElementById("memoArea").value
            );
            const text = buildReportText();
            printRawText(text, "T∅T - RELATORIO");
            document.getElementById("exportModal").classList.remove("active");
        };
    }

    // TOT capsule (.tot)
        const btnTot = document.getElementById("actionDownloadTot");
    if (btnTot) {
        btnTot.onclick = () => {
            store.save(
                document.getElementById("editor").innerHTML,
                document.getElementById("memoArea").value
            );
            exportTot(store);
            document.getElementById("exportModal").classList.remove("active");
        };
    }

    // vamos ligar isso no próximo passo, depois que criarmos o módulo export_tot.js

    document.getElementById("closeModalHelp").onclick = () => document.getElementById("helpModal").classList.remove("active");

    // Evento do Botão Lock
    const btnLock = document.getElementById("btnLock");
    if(btnLock) btnLock.onclick = () => auth.lock();

    const btnLangToggle = document.getElementById("btnLangToggle");
    if (btnLangToggle) btnLangToggle.onclick = () => lang.cycleLang();

    // Teclas
    const searchInput = document.getElementById("search");
    const editorEl = document.getElementById("editor");
    
    document.addEventListener("keydown", (e) => {
        const gate = document.getElementById("gatekeeper");
        if (gate && gate.classList.contains("active")) return;

        const isCtrl = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        if (isCtrl) {
            const textShortcuts = ["a", "c", "x", "v"];
            const browserShortcuts = ["l", "t", "w", "r", "n", "p"];
            if (key === "s") {
                e.preventDefault();
                document.getElementById("btnSave").click();
                return;
            }
            if (textShortcuts.includes(key)) {
                e.preventDefault();
                editorEl.focus();
                if (key === "a") selectAllInEditor(editorEl);
                if (key === "c") document.execCommand("copy");
                if (key === "x") document.execCommand("cut");
                if (key === "v") document.execCommand("paste");
                return;
            }
            if (browserShortcuts.includes(key)) {
                e.preventDefault();
                return;
            }
        }

        if (e.key === "F1") { 
            e.preventDefault(); 
            document.getElementById("helpModal").classList.add("active"); 
            setTimeout(() => {
                const activeTab = document.querySelector('.help-tab.active');
                if(activeTab) activeTab.focus();
            }, 50);
        } 
        
        if ((e.ctrlKey && e.shiftKey && e.code === "KeyF") || e.key === "F11") { e.preventDefault(); editorFeatures.toggleFullscreen(); }
        if (e.key === "Enter" && document.activeElement === searchInput) document.getElementById("btnSearch").click();
        if (e.ctrlKey && e.key === "f") { e.preventDefault(); searchInput.focus(); }

        if (e.key === "Escape") {
            const systemModal = document.getElementById("systemModal");
            if (systemModal && systemModal.classList.contains("active") && window.totModal?.cancel) {
                window.totModal.cancel();
                return;
            }
            if (document.activeElement === searchInput) { document.getElementById("btnClear").click(); searchInput.blur(); }
            let closed = false;
            document.querySelectorAll(".modal-overlay.active").forEach(m => { 
                if (m.id !== "gatekeeper" && m.id !== "pomodoroModal") {
                    m.classList.remove("active"); 
                    if(m.id==="resetModal") {
                        document.getElementById("step2Reset").style.display="none"; 
                        document.getElementById("resetPassInput").value = "";
                        document.getElementById("resetMsg").innerText = "";
                    }
                    closed=true; 
                }
            });
            if(document.getElementById("drawer").classList.contains("open")) { ui.closeDrawer(); closed=true; }
            if(closed) editorEl.focus();
        }

        if (e.altKey) {
            if (e.key === "1") { e.preventDefault(); ui.openDrawer('files', { renderFiles: renderProjectList }); }
            if (e.key === "2") { e.preventDefault(); ui.openDrawer('nav', { renderNav: renderNavigation }); }
            if (e.key === "3") { e.preventDefault(); ui.openDrawer('memo', {}); }
            if (e.key === "0") { e.preventDefault(); ui.closeDrawer(); }
            if (e.code === "KeyL") { e.preventDefault(); auth.lock(); }
            if (e.code === "KeyT") { e.preventDefault(); ui.toggleTheme(); }
            if (e.code === "KeyM") { e.preventDefault(); document.getElementById("btnAudio").click(); }
            if (e.code === "KeyP") { e.preventDefault(); ui.togglePomodoro(); }
            if (e.code === "KeyF") { e.preventDefault(); document.getElementById("btnFontType").click(); }
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 's') { e.preventDefault(); document.getElementById("btnSave").click(); }
            if (e.key === 'o') { e.preventDefault(); document.getElementById("fileInput").click(); }
        }

        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const activeTag = document.activeElement.tagName.toLowerCase();
            if (activeTag !== 'input' && activeTag !== 'textarea' && document.activeElement !== editorEl) {
                e.preventDefault(); editorEl.focus();   
                const activeDoc = store.getActive();
                if(activeDoc && activeDoc.cursorPos) editorFeatures.setCursorPos(activeDoc.cursorPos);
                document.execCommand("insertText", false, e.key);
                editorFeatures.playSound('type');
                editorFeatures.triggerFocusMode();
            }
        }
    });

    const btnInsert = document.getElementById("btnInsertChapter");
    if (btnInsert) btnInsert.onclick = () => { editorFeatures.insertChapter(); ui.openDrawer('nav', { renderNav: renderNavigation }); };

    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (overlay.id === "gatekeeper" || overlay.id === "pomodoroModal") return;
            if (overlay.id === "systemModal") {
                if (e.target === overlay && window.totModal?.cancel) window.totModal.cancel();
                return;
            }
            if (e.target === overlay) {
                overlay.classList.remove("active");
                if(overlay.id === "resetModal") {
                     document.getElementById("step2Reset").style.display = "none";
                     document.getElementById("btnConfirmReset1").style.display = "none";
                     document.getElementById("step0Reset").style.display = "block";
                     document.getElementById("resetPassInput").value = "";
                     document.getElementById("resetMsg").innerText = "";
                     document.getElementById("resetProofInput").value = "";
                     document.getElementById("resetProofMsg").innerText = "";
                }
            }
        });
    });

    document.getElementById("btnNewProject").onclick = async () => {
        if (!window.totModal) return;
        const name = await window.totModal.prompt(lang.t("prompt_file_name"), { title: lang.t("modal_title") });
        if (name && name.trim()) { store.createProject(name.trim()); loadActiveDocument(); renderProjectList(); }
    };
    
    document.getElementById("btnThemeToggle").onclick = () => ui.toggleTheme();
    document.getElementById("hudFs").onclick = () => editorFeatures.toggleFullscreen();
    
    // --- LÓGICA DA CAVEIRA (Reset Interno) ---
    const resetModal = document.getElementById("resetModal");
    const step2 = document.getElementById("step2Reset");
    const passInput = document.getElementById("resetPassInput");
    const msg = document.getElementById("resetMsg");
    const step0 = document.getElementById("step0Reset");
    const proofWordEl = document.getElementById("resetProofWord");
    const proofInput = document.getElementById("resetProofInput");
    const proofMsg = document.getElementById("resetProofMsg");
    const btnProof = document.getElementById("btnConfirmReset0");
    const btnStep1 = document.getElementById("btnConfirmReset1");

    let currentProofWord = "";

    const generateProofWord = () => {
        const text = document.getElementById("editor").innerText || "";
        const words = text.split(/\s+/).map(w => w.trim()).filter(w => w.length >= 4);
        if (words.length === 0) return "";
        return words[Math.floor(Math.random() * words.length)];
    };

    document.getElementById("btnHardReset").onclick = () => {
        resetModal.classList.add("active");
        if (step2) step2.style.display = "none";
        if (btnStep1) btnStep1.style.display = "none";
        if (step0) step0.style.display = "block";
        if (proofInput) proofInput.value = "";
        if (proofMsg) proofMsg.innerText = "";
        if(passInput) passInput.value = "";
        if(msg) msg.innerText = "";
        currentProofWord = generateProofWord();
        if (proofWordEl) proofWordEl.innerText = currentProofWord ? `"${currentProofWord}"` : "[SEM CONTEÚDO]";
    };
    
    document.getElementById("closeModalReset").onclick = () => resetModal.classList.remove("active");
    
    if (btnProof) {
        btnProof.onclick = () => {
            const expected = (currentProofWord || "").toLowerCase();
            const got = (proofInput ? proofInput.value : "").trim().toLowerCase();
            if (!expected) {
                if (proofMsg) proofMsg.innerText = lang.t("reset_no_text");
                if (btnStep1) btnStep1.style.display = "block";
                if (step0) step0.style.display = "none";
                return;
            }
            if (got === expected) {
                if (proofMsg) proofMsg.innerText = lang.t("reset_proof_ok");
                if (btnStep1) btnStep1.style.display = "block";
                if (step0) step0.style.display = "none";
            } else {
                if (proofMsg) proofMsg.innerText = lang.t("reset_proof_fail");
                if (proofInput) {
                    proofInput.value = "";
                    proofInput.focus();
                    proofInput.classList.add('shake');
                    setTimeout(() => proofInput.classList.remove('shake'), 500);
                }
            }
        };
    }

    if (btnStep1) {
        btnStep1.onclick = () => {
            if (step2) step2.style.display = "block";
            setTimeout(() => { if(passInput) passInput.focus(); }, 100);
        };
    }
    
    const triggerReset = () => {
        const storedKey = localStorage.getItem('lit_auth_key');
        const inputVal = passInput ? passInput.value : "";
        
        if (!storedKey || inputVal === storedKey) {
            if(msg) msg.innerText = lang.t("reset_executing");
            setTimeout(() => store.hardReset(), 500); 
        } else {
            if(msg) msg.innerText = lang.t("reset_denied");
            if(passInput) {
                passInput.value = "";
                passInput.focus();
                passInput.classList.add('shake');
                setTimeout(() => passInput.classList.remove('shake'), 500);
            }
        }
    };

    document.getElementById("btnConfirmReset2").onclick = triggerReset;
    
    if(passInput) {
        passInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") triggerReset();
        });
    }

    editorEl.addEventListener("input", () => {
        const cursorPos = editorFeatures.getCursorPos();
        store.save(editorEl.innerHTML, document.getElementById("memoArea").value, cursorPos);
        if (window.innerWidth <= 900) {
            document.body.classList.add("mobile-typing");
            clearTimeout(window.__mobileTypingTimer);
            window.__mobileTypingTimer = setTimeout(() => {
                document.body.classList.remove("mobile-typing");
            }, 800);
        }
    });
    
    editorEl.addEventListener("keyup", () => store.save(undefined, undefined, editorFeatures.getCursorPos()));
    editorEl.addEventListener("click", () => store.save(undefined, undefined, editorFeatures.getCursorPos()));
    
    document.getElementById("memoArea").addEventListener("input", (e) => store.save(undefined, e.target.value));

    const panelEl = document.querySelector(".panel");
    if (panelEl) {
        panelEl.addEventListener("scroll", () => {
            const active = store.getActive();
            const key = (active && active.id) ? `lit_ui_editor_scroll_${active.id}` : "lit_ui_editor_scroll";
            localStorage.setItem(key, panelEl.scrollTop.toString());
        });
    }

    restoreUiState(showEditorView, showBooksView);

    const mobileThemeBtn = document.getElementById("btnMobileTheme");
    if (mobileThemeBtn) mobileThemeBtn.onclick = () => ui.toggleTheme();
}

function initMobileFullToggle() {
    if (window.innerWidth > 900) return;
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
        updateLabel();
    };
    updateLabel();
    btn.onclick = () => {
        const isLite = document.body.classList.contains("mobile-lite");
        setFullMode(isLite);
    };
    document.addEventListener("lang:changed", updateLabel);
    window.setMobileFullMode = setFullMode;
}

function initMobileTapToEdit() {
    if (window.innerWidth > 900) return;
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
}

function initMobileEdgeHandle() {
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
}

// Funções auxiliares mantidas iguais
function restoreUiState(showEditorView, showBooksView) {
    const view = localStorage.getItem("lit_ui_view");
    if (view === "books") {
        showBooksView();
    } else if (view === "editor") {
        showEditorView();
    }

    const drawerOpen = localStorage.getItem("lit_ui_drawer_open") === "true";
    const panel = localStorage.getItem("lit_ui_drawer_panel");
    const callbacks = {
        files: { renderFiles: renderProjectList },
        nav: { renderNav: renderNavigation },
        memo: {}
    };

    if (drawerOpen && callbacks[panel]) {
        ui.openDrawer(panel, callbacks[panel]);
    }
    const isMobile = window.innerWidth <= 900;
    const mobileBooted = localStorage.getItem("lit_mobile_booted") === "true";
    if (isMobile && !drawerOpen && !mobileBooted) {
        ui.openDrawer("memo", {});
        localStorage.setItem("lit_mobile_booted", "true");
    }
}

function restoreEditorScroll() {
    const panelEl = document.querySelector(".panel");
    if (!panelEl) return;
    const active = store.getActive();
    const key = (active && active.id) ? `lit_ui_editor_scroll_${active.id}` : "lit_ui_editor_scroll";
    let stored = parseInt(localStorage.getItem(key), 10);
    if (!Number.isFinite(stored) && key !== "lit_ui_editor_scroll") {
        stored = parseInt(localStorage.getItem("lit_ui_editor_scroll"), 10);
    }
    if (Number.isFinite(stored)) {
        setTimeout(() => { panelEl.scrollTop = stored; }, 0);
    }
}

function incrementAccessCount() {
    const key = "tot_access_count";
    const current = parseInt(localStorage.getItem(key), 10) || 0;
    localStorage.setItem(key, String(current + 1));
}

function getMobileMemos() {
    try {
        const raw = localStorage.getItem("tot_mobile_memos");
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        return [];
    }
}

function saveMobileMemos(list) {
    localStorage.setItem("tot_mobile_memos", JSON.stringify(list));
}

function hashMemo(text, date) {
    const input = `${text}|${date}`;
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
}

function renderMobileMemos() {
    const listEl = document.getElementById("mobileMemoList");
    if (!listEl) return;
    const memos = getMobileMemos();
    listEl.innerHTML = "";
    memos.forEach((memo) => {
        const card = document.createElement("div");
        card.className = "mobile-memo-card";
        const meta = document.createElement("div");
        meta.className = "mobile-memo-meta";
        meta.textContent = `${memo.createdAt} · ${memo.hash}`;
        const text = document.createElement("div");
        text.textContent = memo.text;
        const tagsWrap = document.createElement("div");
        tagsWrap.className = "mobile-memo-tags-list";
        (memo.tags || []).forEach((tag) => {
            const tagEl = document.createElement("span");
            tagEl.className = "mobile-memo-tag";
            tagEl.textContent = tag;
            tagsWrap.appendChild(tagEl);
        });
        const actions = document.createElement("div");
        actions.className = "mobile-memo-actions-row";
        const del = document.createElement("button");
        del.className = "mobile-memo-btn danger";
        del.textContent = lang.t("mobile_memo_delete");
        del.onclick = () => {
            const next = memos.filter((m) => m.id !== memo.id);
            saveMobileMemos(next);
            renderMobileMemos();
        };
        actions.appendChild(del);
        card.appendChild(meta);
        card.appendChild(text);
        if (memo.tags && memo.tags.length) card.appendChild(tagsWrap);
        card.appendChild(actions);
        listEl.appendChild(card);
    });
}

function initMobileMemos() {
    const memoInput = document.getElementById("mobileMemoInput");
    const memoTags = document.getElementById("mobileMemoTags");
    const addBtn = document.getElementById("btnAddMobileMemo");
    const exportBtn = document.getElementById("btnExportMobileMemos");
    if (!memoInput || !addBtn) return;
    const addMemo = () => {
        const text = memoInput.value.trim();
        if (!text) return;
        const tags = (memoTags ? memoTags.value : "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        const createdAt = new Date().toISOString();
        const hash = hashMemo(text, createdAt);
        const memos = getMobileMemos();
        memos.unshift({ id: Date.now().toString(), text, tags, createdAt, hash });
        saveMobileMemos(memos);
        memoInput.value = "";
        if (memoTags) memoTags.value = "";
        renderMobileMemos();
    };
    addBtn.onclick = addMemo;
    if (memoInput) memoInput.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") addMemo();
    });
    if (exportBtn) {
        exportBtn.onclick = () => {
            const memos = getMobileMemos();
            const projects = memos.map((memo, idx) => {
                const safe = memo.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const html = `<p>${safe.replace(/\n/g, "<br>")}</p>`;
                const label = memo.tags && memo.tags.length ? memo.tags.join(", ") : `Memo ${idx + 1}`;
                return {
                    id: `${Date.now()}-${idx}`,
                    name: label,
                    content: html,
                    date: memo.createdAt,
                    cursorPos: 0
                };
            });
            const payload = { projects, activeId: projects[0]?.id || null, memo: "" };
            downloadText(JSON.stringify(payload, null, 2), `TOT_MOBILE_${Date.now()}.json`, "application/json");
        };
    }
    renderMobileMemos();
}

function importMobileMemosFromProjects(projects) {
    const memos = [];
    projects.forEach((proj) => {
        const text = htmlToText(proj.content || "");
        const createdAt = new Date().toISOString();
        const hash = hashMemo(text, createdAt);
        memos.push({
            id: Date.now().toString() + Math.random().toString(16).slice(2),
            text,
            tags: proj.name ? [proj.name] : [],
            createdAt,
            hash
        });
    });
    saveMobileMemos(memos);
    renderMobileMemos();
    if (window.totModal) window.totModal.alert(lang.t("alert_backup_restored"));
}

function initMobileIntro() {
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
}

function applyTotPayload(payload) {
    const archive = payload.ARCHIVE_STATE;
    if (!archive || !Array.isArray(archive.projects)) return false;

    store.data = archive;
    store.persist(true);

    const cfg = payload.SESSION_CONFIG || {};
    if (cfg.theme) localStorage.setItem("lit_theme_pref", cfg.theme);
    if (cfg.fontIndex !== undefined) localStorage.setItem("lit_pref_font", cfg.fontIndex);
    if (cfg.fontSize) localStorage.setItem("lit_pref_font_size", cfg.fontSize);
    if (cfg.lang) localStorage.setItem("lit_lang", cfg.lang);

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key === "totbook_registry" || key.startsWith("pages_") || key.startsWith("pos_") || key.startsWith("title_") || key.startsWith("color_")) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    const workbench = payload.WORKBENCH_STATE || {};
    if (Array.isArray(workbench.registry)) {
        localStorage.setItem("totbook_registry", JSON.stringify(workbench.registry));
    }
    Object.entries(workbench.pages || {}).forEach(([k, v]) => localStorage.setItem(k, v));
    Object.entries(workbench.positions || {}).forEach(([k, v]) => localStorage.setItem(k, v));
    Object.entries(workbench.titles || {}).forEach(([k, v]) => localStorage.setItem(k, v));
    Object.entries(workbench.colors || {}).forEach(([k, v]) => localStorage.setItem(k, v));

    return true;
}

function restoreCursorPos(pos) {
    const attempt = () => editorFeatures.setCursorPos(pos);
    setTimeout(attempt, 0);
    setTimeout(attempt, 120);
}

function selectAllInEditor(editorEl) {
    if (!editorEl) return;
    const range = document.createRange();
    range.selectNodeContents(editorEl);
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
}

function htmlToText(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.innerText || "";
}

function htmlToMarkdown(html) {
    const container = document.createElement("div");
    container.innerHTML = html || "";

    const nodeToMd = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
        if (node.nodeType !== Node.ELEMENT_NODE) return "";
        const tag = node.tagName.toLowerCase();
        const childText = Array.from(node.childNodes).map(nodeToMd).join("");

        switch (tag) {
            case "br":
                return "\n";
            case "strong":
            case "b":
                return `**${childText}**`;
            case "em":
            case "i":
                return `*${childText}*`;
            case "h1":
                return `\n\n# ${childText}\n\n`;
            case "h2":
                return `\n\n## ${childText}\n\n`;
            case "h3":
                return `\n\n### ${childText}\n\n`;
            case "li":
                return `${childText}\n`;
            case "ul":
                return `\n${Array.from(node.children).map(li => `- ${nodeToMd(li)}`).join("")}\n`;
            case "ol":
                return `\n${Array.from(node.children).map((li, idx) => `${idx + 1}. ${nodeToMd(li)}`).join("")}\n`;
            case "p":
            case "div":
                return `\n\n${childText}\n\n`;
            default:
                return childText;
        }
    };

    const raw = Array.from(container.childNodes).map(nodeToMd).join("");
    return raw.replace(/\n{3,}/g, "\n\n").trim();
}

function downloadText(text, filename, mime) {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function buildMarkdownExport() {
    const projects = Array.isArray(store.data.projects) ? store.data.projects : [];
    const blocks = [];
    blocks.push("# T∅T Export\n");
    blocks.push(`_Gerado em ${new Date().toISOString()}_\n`);
    const manifestText = localStorage.getItem("tot_manifest_text");
    const manifestSignedAt = localStorage.getItem("tot_manifest_signed_at");
    const accessCount = localStorage.getItem("tot_access_count");
    if (manifestText) {
        blocks.push("\n## Manifesto Assinado\n");
        if (manifestSignedAt) blocks.push(`Assinado em: ${manifestSignedAt}\n`);
        if (accessCount) blocks.push(`Acessos locais: ${accessCount}\n`);
        blocks.push("\n" + manifestText + "\n");
    }

    projects.forEach((proj, idx) => {
        const title = proj.name || `DOC ${idx + 1}`;
        const md = htmlToMarkdown(proj.content || "");
        blocks.push(`\n## ${title}\n`);
        blocks.push(md || "_(vazio)_");
    });

    if (store.data.memo) {
        blocks.push(`\n## Memo\n`);
        blocks.push(store.data.memo);
    }

    const registryRaw = localStorage.getItem("totbook_registry");
    let registry = [];
    try { registry = JSON.parse(registryRaw || "[]"); } catch (_) { registry = []; }
    if (registry.length) {
        blocks.push("\n## T∅TBooks\n");
        registry.forEach((entry, idx) => {
            const id = typeof entry === "string" ? entry : entry.id;
            if (!id) return;
            const title = localStorage.getItem(`title_${id}`) || `T∅TBook ${idx + 1}`;
            blocks.push(`\n### ${title}\n`);
            let pages = [];
            try { pages = JSON.parse(localStorage.getItem(`pages_${id}`) || "[]"); } catch (_) { pages = []; }
            if (!pages.length) {
                blocks.push("_(sem paginas)_");
                return;
            }
            pages.forEach((page, pageIdx) => {
                blocks.push(`\n#### Pagina ${pageIdx + 1}\n`);
                blocks.push(htmlToMarkdown(page || "") || "_(vazio)_");
            });
        });
    }

    return blocks.join("\n").trim() + "\n";
}

function buildReportText() {
    const projects = Array.isArray(store.data.projects) ? store.data.projects : [];
    const blocks = projects.map((proj, idx) => {
        const title = proj.name || `DOC ${idx + 1}`;
        const text = htmlToText(proj.content || "");
        return `=== ${title} ===\n\n${text}`;
    });
    if (store.data.memo) {
        blocks.push(`=== MEMO ===\n\n${store.data.memo}`);
    }
    const registryRaw = localStorage.getItem("totbook_registry");
    let registry = [];
    try { registry = JSON.parse(registryRaw || "[]"); } catch (_) { registry = []; }
    if (registry.length) {
        blocks.push("=== T∅TBOOKS ===");
        registry.forEach((entry, idx) => {
            const id = typeof entry === "string" ? entry : entry.id;
            if (!id) return;
            const title = localStorage.getItem(`title_${id}`) || `T∅TBook ${idx + 1}`;
            blocks.push(`\n--- ${title} ---`);
            let pages = [];
            try { pages = JSON.parse(localStorage.getItem(`pages_${id}`) || "[]"); } catch (_) { pages = []; }
            if (!pages.length) {
                blocks.push("(sem paginas)");
                return;
            }
            pages.forEach((page, pageIdx) => {
                const text = htmlToText(page || "");
                blocks.push(`\n[Pagina ${pageIdx + 1}]\n${text}`);
            });
        });
    }
    return blocks.join("\n\n");
}

function printRawText(text, title) {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    const doc = w.document;
    doc.open();
    doc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #000; background: #fff; margin: 32px; }
pre { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
</style>
</head>
<body>
<pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`);
    doc.close();
    w.focus();
    const triggerPrint = () => {
        w.focus();
        w.print();
    };
    if (w.document.readyState === "complete") {
        triggerPrint();
    } else {
        w.addEventListener("load", triggerPrint, { once: true });
    }
}
function initHelpTabs() {
    const tabs = document.querySelectorAll('.help-tab');
    const panels = document.querySelectorAll('.help-panel');
    const helpModal = document.querySelector(".help-modal");
    const sizeHelpModal = () => {
        if (!helpModal) return;
        const panel = helpModal.querySelector(".help-panel.active");
        if (!panel) return;
        const header = helpModal.querySelector(".modal-header");
        const tabsRow = helpModal.querySelector(".help-tabs-container");
        const padding = 24;
        const panelHeight = panel.scrollHeight;
        const base = (header?.offsetHeight || 0) + (tabsRow?.offsetHeight || 0) + padding;
        helpModal.style.height = `${Math.min(520, panelHeight + base)}px`;
    };
    tabs.forEach((tab, index) => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            const panel = document.getElementById(targetId);
            panel.classList.add('active');
            sizeHelpModal();
        };
        tab.addEventListener('keydown', (e) => {
            let targetIndex = null;
            if (e.key === 'ArrowRight') targetIndex = index + 1;
            if (e.key === 'ArrowLeft') targetIndex = index - 1;
            if (targetIndex !== null) {
                if (targetIndex < 0) targetIndex = tabs.length - 1;
                if (targetIndex >= tabs.length) targetIndex = 0;
                tabs[targetIndex].focus(); tabs[targetIndex].click(); 
            }
        });
    });
    sizeHelpModal();
}

function renderProjectList() {
    const list = document.getElementById("projectList");
    list.innerHTML = "";
    store.data.projects.forEach(proj => {
        const div = document.createElement("div");
        div.className = `list-item ${proj.id === store.data.activeId ? 'active' : ''}`;
        div.style.display = "flex"; div.style.alignItems = "center"; div.style.justifyContent = "space-between"; div.style.gap = "10px";

        const infoDiv = document.createElement("div");
        infoDiv.style.flex = "1"; infoDiv.style.cursor = "pointer";
        infoDiv.innerHTML = `<div class="file-name-display">${proj.name}</div><div class="list-item-meta">${proj.date.split(',')[0]}</div>`;
        infoDiv.onclick = () => { store.setActive(proj.id); loadActiveDocument(); renderProjectList(); };

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "file-actions-inline"; actionsDiv.style.display = "flex"; actionsDiv.style.gap = "5px";

        const btnEdit = document.createElement("button");
        btnEdit.className = "btn-icon-small"; btnEdit.innerHTML = "<svg class='icon' viewBox='0 0 24 24' aria-hidden='true'><use href='src/assets/icons/phosphor-sprite.svg#icon-pencil'></use></svg>";
        btnEdit.onclick = (e) => { e.stopPropagation(); enableInlineRename(infoDiv, proj.id, proj.name); };

        const btnDel = document.createElement("button");
        btnDel.className = "btn-icon-small danger"; btnDel.innerHTML = "<svg class='icon' viewBox='0 0 24 24' aria-hidden='true'><use href='src/assets/icons/phosphor-sprite.svg#icon-trash'></use></svg>";
        btnDel.onclick = async (e) => {
            e.stopPropagation();
            if (!window.totModal) return;
            const ok = await window.totModal.confirm(`${lang.t("project_delete_confirm")} "${proj.name}"?`);
            if (ok) {
                store.deleteProject(proj.id);
                renderProjectList();
                if (store.data.projects.length > 0) loadActiveDocument();
            }
        };

        actionsDiv.appendChild(btnEdit); actionsDiv.appendChild(btnDel);
        div.appendChild(infoDiv); div.appendChild(actionsDiv);
        list.appendChild(div);
    });
}

function enableInlineRename(container, id, currentName) {
    container.onclick = null;
    container.innerHTML = `<input type="text" class="inline-rename-input" value="${currentName}">`;
    const input = container.querySelector("input"); input.focus();
    const save = () => { if(input.value.trim()) { store.renameProject(id, input.value); } renderProjectList(); };
    input.addEventListener("blur", save);
    input.addEventListener("keydown", (e) => { if(e.key === "Enter") input.blur(); });
}

function renderNavigation() {
    const list = document.getElementById("chapterList"); list.innerHTML = "";
    const headers = document.getElementById("editor").querySelectorAll("h1, h2, .chapter-mark");
    if (headers.length === 0) { list.innerHTML = `<div class='help-text'>${lang.t("nav_empty_hint")}</div>`; return; }
    headers.forEach((header, index) => {
        const div = document.createElement("div"); div.className = "list-item"; div.style.justifyContent = "space-between"; div.style.display = "flex"; div.style.alignItems = "center";
        const label = document.createElement("div");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "8px";
        label.style.flex = "1";
        label.innerHTML = `<svg class=\"icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><use href=\"src/assets/icons/phosphor-sprite.svg#icon-caret-right\"></use></svg> ${header.innerText || "Capítulo " + (index+1)}`;
        label.onclick = () => {
            header.scrollIntoView({ behavior: "smooth", block: "center" });
            const sel = window.getSelection();
            if (sel) {
                const range = document.createRange();
                range.selectNodeContents(header);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            editorFeatures.editor.focus();
            editorFeatures.triggerFocusMode();
            editorFeatures.scheduleFocusBlockUpdate();
        };

        const actions = document.createElement("div");
        actions.className = "file-actions-inline";
        actions.style.display = "flex";
        actions.style.gap = "6px";
        const btnDel = document.createElement("button");
        btnDel.className = "btn-icon-small danger";
        btnDel.innerHTML = "<svg class='icon' viewBox='0 0 24 24' aria-hidden='true'><use href='src/assets/icons/phosphor-sprite.svg#icon-trash'></use></svg>";
        btnDel.onclick = async (e) => {
            e.stopPropagation();
            const label = header.innerText || `Capítulo ${index + 1}`;
            if (!window.totModal) return;
            const ok = await window.totModal.confirm(`${lang.t("nav_delete_confirm")} "${label}"?`);
            if (ok) {
                header.remove();
                renderNavigation();
            }
        };
        actions.appendChild(btnDel);

        div.appendChild(label);
        div.appendChild(actions);
        list.appendChild(div);
    });
}
