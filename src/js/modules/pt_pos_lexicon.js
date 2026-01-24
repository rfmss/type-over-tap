const POS_CORE_URL = "src/assets/lingua/pt_pos_core.json";
const POS_CHUNKS = [
    "src/assets/lingua/pt_pos_chunk_1.json",
    "src/assets/lingua/pt_pos_chunk_2.json",
    "src/assets/lingua/pt_pos_chunk_3.json"
];

const CHUNK_RANGES = [
    /[a-f]/i,
    /[g-o]/i,
    /[p-z]/i
];

const fetchJson = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha ao carregar ${url}`);
    return res.json();
};

export const ptPosLexicon = {
    entries: new Map(),
    coreLoaded: false,
    chunksLoaded: new Set(),

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

    normalize(word) {
        try {
            return word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        } catch (_) {
            return word.toLowerCase();
        }
    },

    addEntries(data) {
        Object.entries(data || {}).forEach(([word, entry]) => {
            if (!entry) return;
            const clean = this.normalize(word);
            this.entries.set(clean, { word, ...entry });
        });
    },

    async loadCore() {
        if (this.coreLoaded) return;
        const data = await fetchJson(POS_CORE_URL);
        this.addEntries(data);
        this.coreLoaded = true;
    },

    async loadChunkFor(word) {
        const first = (word || "").charAt(0);
        const idx = CHUNK_RANGES.findIndex((re) => re.test(first));
        if (idx < 0) return;
        if (this.chunksLoaded.has(idx)) return;
        const url = POS_CHUNKS[idx];
        if (!url) return;
        const data = await fetchJson(url);
        this.addEntries(data);
        this.chunksLoaded.add(idx);
    },

    async lookup(raw) {
        if (!raw) return null;
        await this.loadCore();
        const key = this.normalizeLookupKey(raw);
        const clean = this.normalize(key);
        let entry = this.entries.get(clean) || null;
        if (!entry) {
            await this.loadChunkFor(clean);
            entry = this.entries.get(clean) || null;
        }
        return entry;
    },

    guess(raw) {
        if (!raw) return null;
        const key = this.normalizeLookupKey(raw);
        if (!key) return null;
        const lower = key.toLowerCase();

        if (/^\d+$/.test(lower)) return { pos: ["NUM"], probable: true };
        if (/mente$/.test(lower)) return { pos: ["ADV"], probable: true };
        if (/(ção|ções|mento|mentos|dade|dades|ismo|ismos|agem|agens|são|sões|ez|eza)$/.test(lower)) {
            return { pos: ["SUBST"], probable: true };
        }
        if (/(ável|ível|oso|osa|ivo|iva|al|ais|ico|ica|ário|ária|nte)$/.test(lower)) {
            return { pos: ["ADJ"], probable: true };
        }
        if (/(ar|er|ir)$/.test(lower) && lower.length > 3) {
            return { pos: ["VERB"], probable: true };
        }
        if (/^(meu|minha|teu|tua|seu|sua|nosso|nossa|este|esta|esse|essa|aquele|aquela|isso|aquilo|alguém|ninguém|todos|cada|qualquer)$/.test(lower)) {
            return { pos: ["PRON"], probable: true };
        }
        return null;
    },

    async disambiguate(raw, contextTokens = []) {
        if (!raw) return null;
        const token = this.normalizeLookupKey(raw);
        const lower = token.toLowerCase();
        const tokens = contextTokens.map((t) => this.normalizeLookupKey(t));
        const idx = tokens.findIndex((t) => t === lower);
        const prev = idx > 0 ? tokens[idx - 1] : "";
        const next = idx >= 0 && idx < tokens.length - 1 ? tokens[idx + 1] : "";
        const prevEntry = prev ? await this.lookup(prev) : null;
        const nextEntry = next ? await this.lookup(next) : null;
        const prevPos = prevEntry?.pos || [];
        const nextPos = nextEntry?.pos || [];

        if (lower === "muito") {
            if (nextPos.includes("ADJ")) return { pos: ["ADV"], contextual: true };
            if (nextPos.includes("SUBST")) return { pos: ["ADJ"], contextual: true };
        }
        if (lower === "meio") {
            if (nextPos.includes("ADJ")) return { pos: ["ADV"], contextual: true };
            if (nextPos.includes("SUBST")) return { pos: ["ADJ"], contextual: true };
        }
        if (lower === "só") {
            if (nextPos.includes("VERB")) return { pos: ["ADV"], contextual: true };
            return { pos: ["ADJ"], contextual: true };
        }
        if (lower === "que") {
            if (["o", "a", "os", "as", "um", "uma", "uns", "umas"].includes(prev)) {
                return { pos: ["PRON"], contextual: true };
            }
            return { pos: ["CONJ"], contextual: true };
        }
        if (lower === "como") {
            if (["tão", "assim", "tal", "mais", "menos", "tanto"].includes(prev)) {
                return { pos: ["ADV"], contextual: true };
            }
            return { pos: ["CONJ"], contextual: true };
        }
        if (lower === "se") {
            if (nextPos.includes("VERB")) return { pos: ["PRON"], contextual: true };
            return { pos: ["CONJ"], contextual: true };
        }
        if (lower === "logo") {
            if (!prev) return { pos: ["CONJ"], contextual: true };
            return { pos: ["ADV"], contextual: true };
        }
        if (lower === "mais" || lower === "menos") {
            if (nextPos.includes("ADJ")) return { pos: ["ADV"], contextual: true };
            if (nextPos.includes("SUBST")) return { pos: ["ADJ"], contextual: true };
        }
        return null;
    }
};
