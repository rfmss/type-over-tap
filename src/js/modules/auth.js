import { store } from './store.js';
import { lang } from './lang.js';
import { ui } from './ui.js';

export const auth = {
    init() {
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
        const agree = document.getElementById("manifestoAgree");
        const body = document.getElementById("manifestoText");
        const langToggle = document.getElementById("manifestoLangToggle");
        const applyManifestoText = () => {
            if (!body) return;
            body.innerHTML = lang.t("manifesto_body");
        };
        if (!modal || !agree) return;
        modal.classList.add("active");
        applyManifestoText();
        document.addEventListener("lang:changed", applyManifestoText);
        if (langToggle) {
            langToggle.onclick = () => lang.cycleLang();
        }
        agree.onclick = () => {
            const text = document.getElementById("manifestoText");
            if (text) {
                localStorage.setItem("tot_manifest_text", text.innerText.trim());
            }
            localStorage.setItem("tot_manifest_signed", "true");
            localStorage.setItem("tot_manifest_signed_at", new Date().toISOString());
            modal.classList.remove("active");
            this.runGatekeeper();
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
                localStorage.setItem('lit_pomo_prompt', 'true');
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
