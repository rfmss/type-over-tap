import { lang } from './lang.js';

const showAlert = (message) => {
    if (window.totModal && typeof window.totModal.alert === "function") {
        window.totModal.alert(message);
    } else {
        console.warn(message);
    }
};

export const store = {
    data: {
        projects: [],
        activeId: null,
        memo: ""
    },
    persistTimer: null,
    persistDelayMs: 500,

    init() {
        const saved = localStorage.getItem("tot_data");
        const legacy = localStorage.getItem("zel_data");
        if (saved || legacy) {
            try {
                this.data = JSON.parse(saved || legacy);
                // Validação de integridade básica
                if (!Array.isArray(this.data.projects)) this.data.projects = [];
                if (!saved && legacy) {
                    localStorage.setItem("tot_data", JSON.stringify(this.data));
                }
            } catch (e) {
                console.error("Erro ao carregar dados:", e);
                // Se der erro, mantém limpo mas não apaga o localStorage antigo por segurança
            }
        } else {
            // Cria projeto padrão se for a primeira vez
            this.createProject(lang.t("default_project"));
        }
    },

    save(content, memo, cursorPos) {
        // 1. Atualiza MEMO (Global)
        if (memo !== undefined) this.data.memo = memo;

        // 2. Atualiza PROJETO ATIVO
        if (this.data.activeId) {
            const active = this.data.projects.find(p => p.id === this.data.activeId);
            if (active) {
                // Só atualiza se veio conteúdo novo (evita undefined sobrescrever texto)
                if (content !== undefined) active.content = content;
                if (cursorPos !== undefined) active.cursorPos = cursorPos;
                
                // Atualiza data de modificação
                active.date = new Date().toLocaleString();
            }
        }

        // 3. PERSISTE NO DISCO (LocalStorage)
        this.persist();
    },

    persist(immediate = false) {
        if (immediate) {
            if (this.persistTimer) {
                clearTimeout(this.persistTimer);
                this.persistTimer = null;
            }
            localStorage.setItem("tot_data", JSON.stringify(this.data));
            return;
        }
        if (this.persistTimer) clearTimeout(this.persistTimer);
        this.persistTimer = setTimeout(() => {
            localStorage.setItem("tot_data", JSON.stringify(this.data));
            this.persistTimer = null;
        }, this.persistDelayMs);
    },

    createProject(name, content = "") {
        const id = Date.now().toString();
        const newDoc = {
            id: id,
            name: name,
            content: content, // Começa com o conteúdo passado (ou vazio)
            date: new Date().toLocaleString(),
            cursorPos: 0
        };
        this.data.projects.unshift(newDoc); // Adiciona no topo
        this.setActive(id);
        this.persist(true);
    },

    setActive(id) {
        this.data.activeId = id;
        this.persist(true);
    },

    getActive() {
        if (!this.data.activeId && this.data.projects.length > 0) {
            this.setActive(this.data.projects[0].id);
        }
        return this.data.projects.find(p => p.id === this.data.activeId);
    },

    renameProject(id, newName) {
        const p = this.data.projects.find(p => p.id === id);
        if (p) {
            p.name = newName;
            this.persist(true);
        }
    },

    deleteProject(id) {
        this.data.projects = this.data.projects.filter(p => p.id !== id);
        if (this.data.activeId === id) {
            this.data.activeId = this.data.projects.length > 0 ? this.data.projects[0].id : null;
        }
        this.persist(true);
    },

    // --- IMPORTAR BACKUP ---
    importData(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            
            // Valida se é um backup válido do TΦT
            if (!imported.projects || !Array.isArray(imported.projects)) {
                showAlert(lang.t("alert_backup_invalid"));
                return false;
            }

            // Mesclar ou Substituir? Aqui vamos SUBSTITUIR para restaurar backup exato
            this.data = imported;
            this.persist(true);
            return true;
        } catch (e) {
            console.error(e);
            showAlert(lang.t("alert_backup_json_error"));
            return false;
        }
    },

    // --- HARD RESET ---
    hardReset() {
        // Limpa todo o estado local para evitar restauração fantasma.
        try { localStorage.clear(); } catch (_) {}

        // Remove bancos locais (se existirem).
        if (window.indexedDB && typeof indexedDB.databases === "function") {
            indexedDB.databases().then((dbs) => {
                dbs.forEach((db) => {
                    if (db && db.name) indexedDB.deleteDatabase(db.name);
                });
            }).catch(() => {});
        }

        // Limpa caches do Service Worker quando disponível.
        if (window.caches && typeof caches.keys === "function") {
            caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
        }

        setTimeout(() => location.reload(), 250); // Renasce limpo
    },

    generateShareLink(text) {
        return window.location.origin + window.location.pathname + "#view=" + LZString.compressToEncodedURIComponent(text);
    }
};
