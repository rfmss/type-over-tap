import { store } from './store.js';
import { lang } from './lang.js';
import { ui } from './ui.js';

export const auth = {
    termsVersion: {
        "pt-br": "1.0-ptbr",
        "en": "1.0-en",
        "es": "1.0-es",
        "fr": "1.0-fr"
    },
    pendingCycle: null,
    termsModal: null,
    termsBody: null,
    termsCheck: null,
    termsChoice25: null,
    termsChoice50: null,
    termsBack: null,
    termsLink: null,
    termsScrolledEnough: false,
    init() {
        this.setupTerms();
        const accepted = localStorage.getItem('tot_manifest_signed');
        if (!accepted) {
            this.showManifesto();
            return;
        }
        this.runGatekeeper();
    },

    runGatekeeper() {
        const hasKey = localStorage.getItem('lit_auth_key');
        if (!hasKey) {
            this.showSetup();
        } else {
            const isLocked = localStorage.getItem('lit_is_locked');
            if (isLocked === 'true') {
                this.lock(); 
            } else {
                this.unlock(true); 
            }
        }
        this.setupEvents();
    },

    showManifesto() {
        const modal = document.getElementById("manifestoModal");
        const choice25 = document.getElementById("manifestoChoice25");
        const choice50 = document.getElementById("manifestoChoice50");
        const body = document.getElementById("manifestoText");
        const langToggle = document.getElementById("manifestoLangToggle");
        const termsLink = document.getElementById("manifestoTermsLink");
        const verifyLink = document.getElementById("manifestoVerifyLink");
        const applyManifestoText = () => {
            if (!body) return;
            body.innerHTML = lang.t("manifesto_body");
        };
        if (!modal || !choice25 || !choice50) return;
        modal.classList.add("active");
        document.body.classList.add("manifesto-open");
        applyManifestoText();
        document.addEventListener("lang:changed", applyManifestoText);
        if (langToggle) {
            langToggle.onclick = () => lang.cycleLang();
        }
        const acceptWithDuration = (minutes) => {
            const text = document.getElementById("manifestoText");
            if (text) {
                localStorage.setItem("tot_manifest_text", text.innerText.trim());
            }
            localStorage.setItem("tot_manifest_signed", "true");
            localStorage.setItem("tot_manifest_signed_at", new Date().toISOString());
            localStorage.setItem("lit_pomo_preset", String(minutes));
            modal.classList.remove("active");
            document.body.classList.remove("manifesto-open");
            this.runGatekeeper();
        };
        this.acceptWithDuration = acceptWithDuration;
        choice25.onclick = () => this.handleManifestoChoice(25);
        choice50.onclick = () => this.handleManifestoChoice(50);
        if (termsLink) termsLink.onclick = () => this.openTermsModal();
        if (verifyLink) verifyLink.onclick = () => {
            const ev = document.getElementById("editorView");
            const bv = document.getElementById("booksView");
            const vv = document.getElementById("verifyView");
            const panel = document.querySelector(".panel");
            if (ev) ev.style.display = "none";
            if (bv) bv.style.display = "none";
            if (vv) vv.style.display = "block";
            if (panel) panel.classList.add("books-active");
            localStorage.setItem("lit_ui_view", "verify");
        };
    },

    setupEvents() {
        // Seleção de Idioma (toggle)
        const setupLangToggle = document.getElementById("setupLangToggle");
        if (setupLangToggle) {
            setupLangToggle.onclick = () => lang.cycleLang();
        }

        // Criação de Sessão
        document.getElementById('btnCreateSession').onclick = async () => {
            const p1 = document.getElementById('setupPass1').value;
            const p2 = document.getElementById('setupPass2').value;
            if (p1 && p1 === p2 && p1.trim() !== "") {
                localStorage.setItem('lit_auth_key', p1);
                const projectInput = document.getElementById('setupProjectName');
                const projectName = projectInput ? projectInput.value.trim() : "";
                if (projectName) {
                    const active = store.getActive();
                    if (active && active.id) {
                        store.renameProject(active.id, projectName);
                    } else {
                        store.createProject(projectName);
                    }
                }
                const preset = parseInt(localStorage.getItem("lit_pomo_preset"), 10);
                if (Number.isFinite(preset) && preset > 0) {
                    localStorage.removeItem("lit_pomo_preset");
                    ui.startWork(preset);
                } else {
                    localStorage.setItem('lit_pomo_prompt', 'true');
                }
                this.unlock();
            } else {
                if (window.totModal) await window.totModal.alert(lang.t("reset_invalid"));
            }
        };

        // Lógica de Desbloqueio
        const tryUnlock = () => {
            const input = document.getElementById('authPass');
            const stored = localStorage.getItem('lit_auth_key');
            
            if (input.value === stored) {
                this.unlock();
            } else {
                this.shakeInput(input);
            }
        };

        document.getElementById('btnUnlock').onclick = tryUnlock;
        document.getElementById('authPass').onkeydown = (e) => { if(e.key === 'Enter') tryUnlock(); };

        // Botão de Pânico (Caveira) - AGORA COM PROTEÇÃO
        document.getElementById('emergencyReset').onclick = async () => {
            const stored = localStorage.getItem('lit_auth_key');
            // Pede a senha para confirmar a destruição
            if (!window.totModal) return;
            const pass = await window.totModal.prompt(lang.t("reset_prompt"), { title: lang.t("modal_title") });
            
            if (pass === stored) {
                const ok = await window.totModal.confirm(lang.db[lang.current].reset_warn, { title: lang.t("modal_title") });
                if (ok) {
                    store.hardReset();
                }
            } else {
                if (window.totModal) await window.totModal.alert(lang.t("reset_cancel"));
            }
        };
    },

    setupTerms() {
        this.termsModal = document.getElementById("termsModal");
        this.termsBody = document.getElementById("termsBody");
        this.termsCheck = document.getElementById("termsCheck");
        this.termsChoice25 = document.getElementById("termsChoice25");
        this.termsChoice50 = document.getElementById("termsChoice50");
        this.termsBack = document.getElementById("termsBack");

        const updateTermsText = () => {
            if (this.termsBody) this.termsBody.innerHTML = lang.t("terms_body");
        };
        updateTermsText();
        document.addEventListener("lang:changed", updateTermsText);

        if (this.termsBody) {
            this.termsBody.addEventListener("scroll", () => this.updateTermsScrollState());
        }
        if (this.termsModal) {
            this.termsModal.addEventListener("keydown", (e) => this.handleTermsFocusTrap(e));
        }
        if (this.termsChoice25) {
            this.termsChoice25.addEventListener("click", () => this.acceptTermsWithDuration(25));
        }
        if (this.termsChoice50) {
            this.termsChoice50.addEventListener("click", () => this.acceptTermsWithDuration(50));
        }
        if (this.termsBack) {
            this.termsBack.addEventListener("click", () => this.closeTermsModal(true));
        }
    },
    handleTermsFocusTrap(e) {
        if (!this.termsModal || !this.termsModal.classList.contains("active")) return;
        if (e.key !== "Tab") return;
        const focusable = this.termsModal.querySelectorAll("button, input, [href], [tabindex]:not([tabindex='-1'])");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    },

    getTermsVersion() {
        const currentLang = lang?.state?.lang || "pt-br";
        return this.termsVersion[currentLang] || this.termsVersion["pt-br"];
    },
    getTermsAcceptedKey() {
        const currentLang = lang?.state?.lang || "pt-br";
        return `termsAccepted_${currentLang}`;
    },
    hasAcceptedTerms() {
        const version = this.getTermsVersion();
        const acceptedKey = this.getTermsAcceptedKey();
        return localStorage.getItem(acceptedKey) === "true" &&
            localStorage.getItem("termsVersion") === version;
    },

    handleManifestoChoice(minutes) {
        if (!this.hasAcceptedTerms()) {
            this.markTermsAccepted();
        }
        if (typeof this.acceptWithDuration === "function") {
            this.acceptWithDuration(minutes);
        }
    },

    openTermsModal() {
        if (!this.termsModal) return;
        document.body.classList.add("terms-open");
        this.termsModal.classList.add("active");
        this.updateTermsScrollState(true);
        this.updateTermsButtonState();
        if (this.termsChoice25) this.termsChoice25.focus();
    },

    closeTermsModal(clearPending = false) {
        if (this.termsModal) this.termsModal.classList.remove("active");
        document.body.classList.remove("terms-open");
        if (clearPending) this.pendingCycle = null;
    },

    updateTermsScrollState(force = false) {
        if (!this.termsBody) return;
        const scrollMax = this.termsBody.scrollHeight - this.termsBody.clientHeight;
        if (scrollMax <= 0) {
            this.termsScrolledEnough = true;
        } else {
            const pct = this.termsBody.scrollTop / scrollMax;
            this.termsScrolledEnough = pct >= 0.7;
        }
        if (force) this.termsBody.scrollTop = 0;
        this.updateTermsButtonState();
    },

    updateTermsButtonState() {
        const btns = [this.termsChoice25, this.termsChoice50].filter(Boolean);
        btns.forEach(btn => btn.style.display = "none");
        if (this.termsBack) {
            this.termsBack.textContent = lang.t("terms_close");
            this.termsBack.style.display = "block";
        }
    },

    async acceptTermsWithDuration(minutes) {
        const accepted = this.hasAcceptedTerms();
        const hasPending = Number.isFinite(this.pendingCycle);
        if (accepted && !hasPending) {
            this.closeTermsModal();
            return;
        }
        if (!this.termsScrolledEnough) return;
        await this.markTermsAccepted();
        const pending = Number.isFinite(minutes) ? minutes : this.pendingCycle;
        this.pendingCycle = null;
        this.closeTermsModal();
        if (Number.isFinite(pending) && typeof this.acceptWithDuration === "function") {
            this.acceptWithDuration(pending);
        }
    },

    async markTermsAccepted() {
        const acceptedKey = this.getTermsAcceptedKey();
        const currentLang = lang?.state?.lang || "pt-br";
        localStorage.setItem(acceptedKey, "true");
        localStorage.setItem(`termsAcceptedAt_${currentLang}`, new Date().toISOString());
        localStorage.setItem("termsVersion", this.getTermsVersion());
        try {
            let text = this.termsBody ? this.termsBody.innerText.trim() : "";
            if (!text) {
                const raw = lang.t("terms_body") || "";
                const temp = document.createElement("div");
                temp.innerHTML = raw;
                text = temp.innerText.trim();
            }
            if (text && window.crypto?.subtle) {
                const data = new TextEncoder().encode(text);
                const hash = await crypto.subtle.digest("SHA-256", data);
                const hashArray = Array.from(new Uint8Array(hash));
                const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
                localStorage.setItem(`termsHash_${currentLang}`, hashHex);
            }
        } catch (e) {
            console.warn("terms hash failed", e);
        }
    },

    // Ação de Bloquear (Chamada pelo Alt+L)
    lock() {
        const gate = document.getElementById('gatekeeper');
        const viewSetup = document.getElementById('viewSetup');
        const viewLock = document.getElementById('viewLock');

        localStorage.setItem('lit_is_locked', 'true'); // Grava que está trancado
        
        gate.classList.add('active');
        gate.style.display = 'flex';
        gate.style.opacity = '1';
        viewSetup.style.display = 'none';
        viewLock.style.display = 'flex';
        
        setTimeout(() => {
            const input = document.getElementById('authPass');
            if(input) input.focus();
        }, 100);
    },

    // Ação de Desbloquear
    unlock(skipAnim = false) {
        const gate = document.getElementById('gatekeeper');
        localStorage.setItem('lit_is_locked', 'false'); // Grava que está livre
        
        if (skipAnim) {
            gate.style.display = 'none';
            gate.classList.remove('active');
        } else {
            gate.style.opacity = '0';
            setTimeout(() => {
                gate.style.display = 'none';
                gate.classList.remove('active');
            }, 500);
        }
        
        // Limpa o input para a próxima vez
        const input = document.getElementById('authPass');
        if(input) input.value = '';

        const shouldPrompt = localStorage.getItem('lit_pomo_prompt') === 'true';
        const hasTarget = localStorage.getItem('lit_pomo_target');
        if (shouldPrompt && !hasTarget) {
            localStorage.removeItem('lit_pomo_prompt');
            setTimeout(() => ui.showChoiceOnly(), 100);
        }
    },

    showSetup() {
        const gate = document.getElementById('gatekeeper');
        gate.classList.add('active');
        gate.style.display = 'flex';
        document.getElementById('viewSetup').style.display = 'flex';
        document.getElementById('viewLock').style.display = 'none';
        const projectInput = document.getElementById('setupProjectName');
        if (projectInput) projectInput.value = "";
        setTimeout(() => {
            const input = document.getElementById('setupPass1');
            if (input) input.focus();
        }, 100);
    },

    shakeInput(el) {
        const msg = document.getElementById('authMsg');
        if(msg) {
            msg.innerText = lang.db[lang.current].wrong_pass;
            msg.style.color = '#ff4444';
        }
        el.value = '';
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 500);
    }
};
