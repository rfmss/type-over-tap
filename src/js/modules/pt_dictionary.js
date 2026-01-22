const DICT_CORE_URL = "src/assets/lingua/pt_dict_core.json";
const DICT_CHUNKS = [
    "src/assets/lingua/pt_dict_chunk_1.json",
    "src/assets/lingua/pt_dict_chunk_2.json"
];
const DOUBTS_URL = "src/assets/lingua/pt_duvidas.json";
const REG_URL = "src/assets/lingua/pt_regencias.json";

const fetchJson = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha ao carregar ${url}`);
    return res.json();
};

export const ptDictionary = {
    entries: new Map(),
    formIndex: new Map(),
    coreLoaded: false,
    chunksLoaded: new Set(),
    doubts: null,
    regencias: null,

    normalize(word) {
        try {
            return word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        } catch (_) {
            return word.toLowerCase();
        }
    },

    normalizeLookupKey(raw) {
        if (!raw) return "";
        const trimmed = String(raw).trim();
        const cleaned = trimmed.replace(/^[\s"'“”‘’.,;:!?()\\[\\]{}<>«»—-]+|[\s"'“”‘’.,;:!?()\\[\\]{}<>«»—-]+$/g, "");
        try {
            return cleaned.toLowerCase().normalize("NFC");
        } catch (_) {
            return cleaned.toLowerCase();
        }
    },

    deaccent(word) {
        try {
            return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        } catch (_) {
            return word;
        }
    },

    singularizePt(word) {
        if (!word || word.length < 4) return word;
        if (/ões$/.test(word)) return word.replace(/ões$/, "ão");
        if (/ães$/.test(word)) return word.replace(/ães$/, "ão");
        if (/ais$/.test(word)) return word.replace(/ais$/, "al");
        if (/éis$/.test(word)) return word.replace(/éis$/, "el");
        if (/óis$/.test(word)) return word.replace(/óis$/, "ol");
        if (/is$/.test(word)) return word.replace(/is$/, "il");
        if (/ns$/.test(word)) return word.replace(/ns$/, "m");
        if (/es$/.test(word) && word.length > 4) return word.replace(/es$/, "e");
        if (/s$/.test(word) && word.length > 3) return word.replace(/s$/, "");
        return word;
    },

    addEntries(data) {
        Object.keys(data || {}).forEach((lemma) => {
            const entry = data[lemma];
            if (!entry) return;
            const cleanLemma = this.normalize(lemma);
            const enriched = { ...entry, lemma };
            this.entries.set(cleanLemma, enriched);
            const forms = []
                .concat(entry.formas || [])
                .concat(entry.flexoes || [])
                .concat(lemma);
            forms.forEach((form) => {
                const cleanForm = this.normalize(String(form));
                if (!this.formIndex.has(cleanForm)) {
                    this.formIndex.set(cleanForm, cleanLemma);
                }
            });
        });
    },

    async loadCore() {
        if (this.coreLoaded) return;
        const data = await fetchJson(DICT_CORE_URL);
        this.addEntries(data);
        this.coreLoaded = true;
    },

    async loadChunk(idx) {
        if (this.chunksLoaded.has(idx)) return;
        const url = DICT_CHUNKS[idx];
        if (!url) return;
        const data = await fetchJson(url);
        this.addEntries(data);
        this.chunksLoaded.add(idx);
    },

    async lookup(word) {
        const result = await this.lookupDetailed(word);
        return result.entry || null;
    },

    async lookupDetailed(word) {
        if (!word) return { entry: null, tried: [], status: null };
        let loadError = null;
        try {
            await this.loadCore();
        } catch (err) {
            loadError = err;
            console.warn("[DICT] core load failed", err);
        }
        const raw = this.normalizeLookupKey(word);
        const clean = this.normalize(raw);
        const singular = this.singularizePt(raw);
        const singularClean = this.normalize(singular);
        const deaccent = this.deaccent(raw);
        const deaccentClean = this.normalize(deaccent);
        const deaccentSing = this.singularizePt(deaccent);
        const deaccentSingClean = this.normalize(deaccentSing);
        const tried = [];

        const tryKey = (key) => {
            if (!key) return null;
            tried.push(key);
            const cleanKey = this.normalize(key);
            const lemmaKey = this.entries.has(cleanKey) ? cleanKey : this.formIndex.get(cleanKey);
            return lemmaKey && this.entries.has(lemmaKey) ? this.entries.get(lemmaKey) : null;
        };

        let entry = tryKey(raw)
            || tryKey(clean)
            || tryKey(singular)
            || tryKey(singularClean)
            || tryKey(deaccent)
            || tryKey(deaccentClean)
            || tryKey(deaccentSing)
            || tryKey(deaccentSingClean);

        if (!entry) {
            for (let i = 0; i < DICT_CHUNKS.length; i += 1) {
                if (!this.chunksLoaded.has(i)) {
                    try {
                        await this.loadChunk(i);
                    } catch (err) {
                        loadError = loadError || err;
                        console.warn("[DICT] chunk load failed", DICT_CHUNKS[i], err);
                    }
                }
                entry = tryKey(raw)
                    || tryKey(clean)
                    || tryKey(singular)
                    || tryKey(singularClean)
                    || tryKey(deaccent)
                    || tryKey(deaccentClean)
                    || tryKey(deaccentSing)
                    || tryKey(deaccentSingClean);
                if (entry) break;
            }
        }

        const status = {
            coreLoaded: this.coreLoaded,
            chunksLoaded: this.chunksLoaded.size,
            chunksTotal: DICT_CHUNKS.length
        };
        return { entry: entry || null, tried, raw, singular, deaccent, status, error: loadError };
    },

    async loadDoubts() {
        if (this.doubts) return;
        this.doubts = await fetchJson(DOUBTS_URL);
    },

    async loadRegencias() {
        if (this.regencias) return;
        this.regencias = await fetchJson(REG_URL);
    },

    async getDoubt(word) {
        await this.loadDoubts();
        if (!this.doubts) return null;
        const clean = this.normalize(word);
        const raw = word.toLowerCase();
        const entries = Object.entries(this.doubts);
        for (const [key, item] of entries) {
            const patterns = item.patterns || [];
            for (const pattern of patterns) {
                try {
                    const re = new RegExp(pattern, "i");
                    if (re.test(raw) || re.test(clean)) return { key, ...item };
                } catch (_) {
                    continue;
                }
            }
        }
        return this.doubts[clean] ? { key: clean, ...this.doubts[clean] } : null;
    },

    async findDoubts(text) {
        await this.loadDoubts();
        if (!this.doubts || !text) return [];
        const found = [];
        Object.entries(this.doubts).forEach(([key, item]) => {
            const patterns = item.patterns || [];
            for (const pattern of patterns) {
                try {
                    const re = new RegExp(pattern, "gi");
                    const matches = text.match(re);
                    if (matches && matches.length) {
                        found.push({ key, item, count: matches.length });
                        break;
                    }
                } catch (_) {
                    return;
                }
            }
        });
        return found;
    },

    findDoubtsSync(text) {
        if (!this.doubts || !text) return [];
        const found = [];
        Object.entries(this.doubts).forEach(([key, item]) => {
            const patterns = item.patterns || [];
            for (const pattern of patterns) {
                try {
                    const re = new RegExp(pattern, "gi");
                    const matches = text.match(re);
                    if (matches && matches.length) {
                        found.push({ key, item, count: matches.length });
                        break;
                    }
                } catch (_) {
                    return;
                }
            }
        });
        return found;
    },

    async getRegencia(lemma) {
        await this.loadRegencias();
        if (!this.regencias) return null;
        const clean = this.normalize(lemma);
        return this.regencias[clean] || null;
    },

    async findRegenciaAlerts(text) {
        await this.loadRegencias();
        if (!this.regencias || !text) return [];
        const alerts = [];
        const lower = text.toLowerCase();
        if (this.regencias.assistir) {
            const re = /\bassistir\s+(o|a|os|as|um|uma|uns|umas)\b/gi;
            const matches = lower.match(re);
            if (matches && matches.length) {
                alerts.push({
                    verb: "assistir",
                    count: matches.length,
                    message: "Regência usual: assistir a algo."
                });
            }
        }
        if (this.regencias.preferir) {
            const re = /\bpreferir\s+[^.]{0,40}\bdo\b/gi;
            const matches = lower.match(re);
            if (matches && matches.length) {
                alerts.push({
                    verb: "preferir",
                    count: matches.length,
                    message: "Regência usual: preferir X a Y."
                });
            }
        }
        return alerts;
    },

    findRegenciaAlertsSync(text) {
        if (!this.regencias || !text) return [];
        const alerts = [];
        const lower = text.toLowerCase();
        if (this.regencias.assistir) {
            const re = /\bassistir\s+(o|a|os|as|um|uma|uns|umas)\b/gi;
            const matches = lower.match(re);
            if (matches && matches.length) {
                alerts.push({
                    verb: "assistir",
                    count: matches.length,
                    message: "Regência usual: assistir a algo."
                });
            }
        }
        if (this.regencias.preferir) {
            const re = /\bpreferir\s+[^.]{0,40}\bdo\b/gi;
            const matches = lower.match(re);
            if (matches && matches.length) {
                alerts.push({
                    verb: "preferir",
                    count: matches.length,
                    message: "Regência usual: preferir X a Y."
                });
            }
        }
        return alerts;
    },

    async preload() {
        await this.loadCore();
        await Promise.all([this.loadDoubts(), this.loadRegencias()]);
    }
};
