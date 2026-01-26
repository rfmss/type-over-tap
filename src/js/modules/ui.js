import { lang } from './lang.js';

export const ui = {
    elements: {},
    pomodoroInterval: null,
    
    init() {
        this.elements = {
            hud: document.querySelector(".hud"),
            drawer: document.getElementById("drawer"),
            drawerTitle: document.getElementById("drawerTitle"),
            projectList: document.getElementById("projectList"),
            chapterList: document.getElementById("chapterList"),
            memoArea: document.getElementById("memoArea"),
            mobileTrigger: document.getElementById("mobileTrigger"),
            panels: {
                files: document.getElementById("panelFiles"),
                nav: document.getElementById("panelNav"),
                memo: document.getElementById("panelMemo"),
                actions: document.getElementById("panelActions")
            }
        };
        this.initTheme();
        this.initMobile();
        document.addEventListener("lang:changed", () => this.refreshDrawerTitle());
    },

    // --- POMODORO SOBERANO (TIMESTAMP) ---
    initPomodoro() {
        // Cria o botão na interface se não existir
        const controls = document.querySelector(".controls-inner");
        if (controls && !document.getElementById("pomodoroBtn")) {
            const div = document.createElement("div"); div.className = "divider"; controls.appendChild(div);
            const btn = document.createElement("button");
            btn.className = "btn"; btn.id = "pomodoroBtn";
            btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="src/assets/icons/phosphor-sprite.svg#icon-tomato"></use></svg> 25:00`;
            const pomoHint = lang.t("help_pomo_short") || lang.t("pomo_btn") || "Pomodoro";
            btn.setAttribute("data-i18n-title", "help_pomo_short");
            btn.setAttribute("data-i18n-tip", "help_pomo_short");
            btn.setAttribute("aria-label", pomoHint);
            btn.setAttribute("data-tip", pomoHint);
            btn.onclick = () => this.togglePomodoro();
            controls.appendChild(btn);
        }
        this.cachePomodoroElements();
        this.bindPomodoroModal();

        // Verifica se já existe um timer rodando (Resistência a F5)
        this.checkPomodoroState();
    },

    togglePomodoro() {
        const activeTarget = localStorage.getItem("lit_pomo_target");
        if (activeTarget) {
            return;
        }
        this.showChoiceOnly();
    },

    stopPomodoro() {
        clearInterval(this.pomodoroInterval);
        localStorage.removeItem("lit_pomo_target");
        localStorage.removeItem("lit_pomo_phase");
        localStorage.removeItem("lit_pomo_duration");
        this.hidePomodoroModal();
        const btn = document.getElementById("pomodoroBtn");
        if(btn) {
            btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="src/assets/icons/phosphor-sprite.svg#icon-tomato"></use></svg> 25:00`;
            btn.classList.remove("active");
        }
    },

    checkPomodoroState() {
        const target = localStorage.getItem("lit_pomo_target");
        const phase = localStorage.getItem("lit_pomo_phase") || "work";
        if (target) {
            // Se existe um alvo salvo, verifica se ainda é válido
            if (parseInt(target) > Date.now()) {
                if (phase === "break") this.showBreakModal();
                this.startTicker(); // O tempo ainda não acabou, retoma o contador
            } else {
                if (phase === "work") {
                    this.startBreak();
                } else {
                    this.showUnlockModal();
                }
            }
        } else if (phase === "await_unlock") {
            this.showUnlockModal();
        }
    },

    startTicker() {
        const btn = document.getElementById("pomodoroBtn");
        if(!btn) return;
        
        btn.classList.add("active");
        
        // Limpa qualquer intervalo anterior para evitar duplicidade
        clearInterval(this.pomodoroInterval);

        this.pomodoroInterval = setInterval(() => {
            const target = parseInt(localStorage.getItem("lit_pomo_target"));
            if (!target) { this.stopPomodoro(); return; }
            const phase = localStorage.getItem("lit_pomo_phase") || "work";

            const now = Date.now();
            const diff = target - now;

            if (diff <= 0) {
                if (phase === "work") {
                    this.startBreak();
                } else {
                    this.showUnlockModal();
                }
            } else {
                // ATUALIZA VISOR
                const min = Math.floor((diff / 1000) / 60).toString().padStart(2, '0');
                const sec = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
                const label = phase === "break" ? lang.t("pomo_break_label") : "";
                btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="src/assets/icons/phosphor-sprite.svg#icon-tomato"></use></svg> ${label} ${min}:${sec}`.trim();
                if (phase === "break") this.updateBreakCountdown(`${min}:${sec}`);
            }
        }, 1000); // Atualiza a cada segundo
    },

    cachePomodoroElements() {
        this.pomoModal = document.getElementById("pomodoroModal");
        this.pomoBreakView = document.getElementById("pomoBreakView");
        this.pomoUnlockView = document.getElementById("pomoUnlockView");
        this.pomoCountdown = document.getElementById("pomoCountdown");
        this.pomoPassInput = document.getElementById("pomoPassInput");
        this.pomoUnlockBtn = document.getElementById("pomoUnlockBtn");
        this.pomoChoice = document.getElementById("pomoChoice");
        this.pomoMsg = document.getElementById("pomoMsg");
    },

    bindPomodoroModal() {
        if (!this.pomoModal) return;
        if (this.pomoUnlockBtn) {
            this.pomoUnlockBtn.onclick = () => this.tryUnlockPomodoro();
        }
        if (this.pomoPassInput) {
            this.pomoPassInput.onkeydown = (e) => {
                if (e.key === "Enter") this.tryUnlockPomodoro();
            };
        }
        if (this.pomoChoice) {
            this.pomoChoice.querySelectorAll("[data-duration]").forEach((btn) => {
                btn.onclick = () => {
                    const value = parseInt(btn.getAttribute("data-duration"), 10);
                    if (Number.isFinite(value)) this.startWork(value);
                };
            });
        }
    },

    startWork(minutes) {
        const targetTime = Date.now() + (minutes * 60 * 1000);
        localStorage.setItem("lit_pomo_target", targetTime);
        localStorage.setItem("lit_pomo_phase", "work");
        localStorage.setItem("lit_pomo_duration", String(minutes));
        this.hidePomodoroModal();
        this.startTicker();
    },

    startBreak() {
        const targetTime = Date.now() + (6 * 60 * 1000);
        localStorage.setItem("lit_pomo_target", targetTime);
        localStorage.setItem("lit_pomo_phase", "break");
        this.showBreakModal();
        this.startTicker();
        new Audio("src/assets/audio/enter.wav").play().catch(()=>{}); 
    },

    showBreakModal() {
        if (!this.pomoModal) return;
        this.pomoModal.classList.add("active");
        if (this.pomoBreakView) this.pomoBreakView.style.display = "block";
        if (this.pomoUnlockView) this.pomoUnlockView.style.display = "none";
        this.updateBreakCountdown("06:00");
    },

    showUnlockModal() {
        clearInterval(this.pomodoroInterval);
        localStorage.removeItem("lit_pomo_target");
        localStorage.setItem("lit_pomo_phase", "await_unlock");
        if (!this.pomoModal) return;
        this.pomoModal.classList.add("active");
        if (this.pomoBreakView) this.pomoBreakView.style.display = "none";
        if (this.pomoUnlockView) this.pomoUnlockView.style.display = "block";
        const unlockPrompt = document.getElementById("pomoUnlockPrompt");
        if (unlockPrompt) unlockPrompt.style.display = "";
        if (this.pomoPassInput) this.pomoPassInput.style.display = "";
        if (this.pomoUnlockBtn) this.pomoUnlockBtn.style.display = "";
        if (this.pomoChoice) this.pomoChoice.style.display = "block";
        if (this.pomoPassInput) this.pomoPassInput.value = "";
        if (this.pomoMsg) this.pomoMsg.innerText = "";
        if (this.pomoChoice) {
            this.pomoChoice.querySelectorAll("[data-duration]").forEach((btn) => {
                btn.disabled = true;
            });
        }
        setTimeout(() => { if (this.pomoPassInput) this.pomoPassInput.focus(); }, 50);
    },

    showChoiceOnly() {
        if (!this.pomoModal) return;
        this.pomoModal.classList.add("active");
        if (this.pomoBreakView) this.pomoBreakView.style.display = "none";
        if (this.pomoUnlockView) this.pomoUnlockView.style.display = "block";
        const unlockPrompt = document.getElementById("pomoUnlockPrompt");
        if (unlockPrompt) unlockPrompt.style.display = "none";
        if (this.pomoPassInput) this.pomoPassInput.style.display = "none";
        if (this.pomoUnlockBtn) this.pomoUnlockBtn.style.display = "none";
        if (this.pomoChoice) this.pomoChoice.style.display = "block";
        if (this.pomoMsg) this.pomoMsg.innerText = "";
        if (this.pomoChoice) {
            this.pomoChoice.querySelectorAll("[data-duration]").forEach((btn) => {
                btn.disabled = false;
            });
        }
    },

    hidePomodoroModal() {
        if (this.pomoModal) this.pomoModal.classList.remove("active");
        if (this.pomoPassInput) this.pomoPassInput.style.display = "";
        if (this.pomoUnlockBtn) this.pomoUnlockBtn.style.display = "";
    },

    updateBreakCountdown(value) {
        if (this.pomoCountdown) this.pomoCountdown.innerText = value;
    },

    tryUnlockPomodoro() {
        const stored = localStorage.getItem("lit_auth_key");
        const inputVal = this.pomoPassInput ? this.pomoPassInput.value : "";
        if (!stored || inputVal === stored) {
            if (this.pomoMsg) this.pomoMsg.innerText = lang.t("pomo_unlocked");
            if (this.pomoChoice) {
                this.pomoChoice.style.display = "block";
                this.pomoChoice.querySelectorAll("[data-duration]").forEach((btn) => {
                    btn.disabled = false;
                });
            }
        } else {
            if (this.pomoMsg) this.pomoMsg.innerText = lang.t("pomo_wrong_pass");
            if (this.pomoPassInput) {
                this.pomoPassInput.value = "";
                this.pomoPassInput.focus();
                this.pomoPassInput.classList.add("shake");
                setTimeout(() => this.pomoPassInput.classList.remove("shake"), 500);
            }
        }
    },

    // --- TEMA E UI (Mantido inalterado, apenas encapsulado corretamente) ---
    initTheme() {
        const allowed = ["paper", "chumbo", "study"];
        let currentTheme = localStorage.getItem("lit_theme_pref") || "paper";
        const legacyMap = {
            "ibm-blue": "chumbo",
            "ibm-dark": "chumbo",
            "journal": "paper",
            "mist": "paper"
        };
        if (legacyMap[currentTheme]) currentTheme = legacyMap[currentTheme];
        if (!allowed.includes(currentTheme)) currentTheme = "paper";
        document.body.setAttribute("data-theme", currentTheme);
        localStorage.setItem("lit_theme_pref", currentTheme);
    },

    toggleTheme() {
        const themes = ["paper", "chumbo", "study"];
        const current = document.body.getAttribute("data-theme");
        let nextIndex = themes.indexOf(current) + 1;
        if (nextIndex >= themes.length) nextIndex = 0;
        const newTheme = themes[nextIndex];
        document.body.setAttribute("data-theme", newTheme);
        localStorage.setItem("lit_theme_pref", newTheme);
    },

    initMobile() {
        if(this.elements.mobileTrigger) {
            this.elements.mobileTrigger.onclick = (e) => {
                e.stopPropagation();
                const drawerOpen = this.elements.drawer.classList.contains("open");
                if (drawerOpen) {
                    this.closeDrawer();
                } else {
                    document.dispatchEvent(new CustomEvent("mobile:openDrawer"));
                }
            };
        }
    },

    openDrawer(panelName, callbacks) {
        const { drawer, panels, hud } = this.elements;
        if (drawer.classList.contains("open") && panels[panelName] && panels[panelName].style.display === "block") {
            this.closeDrawer();
            return;
        }
        Object.values(panels).forEach(p => { if (p) p.style.display = "none"; });
        document.querySelectorAll(".hud-btn").forEach(b => b.classList.remove("active"));
        const isMobile = window.innerWidth <= 900;
        if (isMobile) {
            Object.values(panels).forEach(p => { if (p) p.style.display = "block"; });
            drawer.classList.add("mobile-all");
        } else if (panels[panelName]) {
            panels[panelName].style.display = "block";
            drawer.classList.remove("mobile-all");
        }
        drawer.classList.add("open");
        if(isMobile) {
            document.body.classList.add("mobile-drawer-open");
        }
        document.body.classList.add("drawer-open");

        const titles = {
            files: lang.t("drawer_files"),
            nav: lang.t("drawer_nav"),
            memo: lang.t("drawer_memo")
        };
        this.elements.drawerTitle.innerText = isMobile ? lang.t("drawer_system") : (titles[panelName] || "");

        if(panelName === 'files' && callbacks.renderFiles) callbacks.renderFiles();
        if(panelName === 'nav' && callbacks.renderNav) callbacks.renderNav();
        localStorage.setItem("lit_ui_drawer_open", "true");
        localStorage.setItem("lit_ui_drawer_panel", panelName);
    },

    closeDrawer() {
        this.elements.drawer.classList.remove("open");
        this.elements.drawer.classList.remove("mobile-all");
        document.querySelectorAll(".hud-btn").forEach(b => b.classList.remove("active"));
        if(window.innerWidth <= 900) {
            document.body.classList.remove("mobile-drawer-open");
        }
        document.body.classList.remove("drawer-open");
        Object.values(this.elements.panels || {}).forEach(p => { if (p) p.style.display = "none"; });
        localStorage.setItem("lit_ui_drawer_open", "false");
    }
    ,
    refreshDrawerTitle() {
        const panel = localStorage.getItem("lit_ui_drawer_panel");
        const titles = {
            files: lang.t("drawer_files"),
            nav: lang.t("drawer_nav"),
            memo: lang.t("drawer_memo")
        };
        if (this.elements.drawerTitle && titles[panel]) {
            this.elements.drawerTitle.innerText = titles[panel];
        }
    }
};
