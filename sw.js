const CACHE_NAME = "tot-cache-v6";
const CACHE_ASSETS = [
  "./",
  "./index.html",
  "./totbooks.html",
  "./manifest.json",
  "./src/css/main.css",
  "./src/css/fonts.css",
  "./src/css/base.css",
  "./src/css/layout.css",
  "./src/css/components.css",
  "./src/js/app.js",
  "./src/js/modules/auth.js",
  "./src/js/modules/birth_tracker.js",
  "./src/js/modules/editor.js",
  "./src/js/modules/export_tot.js",
  "./src/js/modules/lang.js",
  "./src/js/modules/store.js",
  "./src/js/modules/ui.js",
  "./src/js/modules/qr_transfer.js",
  "./src/js/modules/mobile.js",
  "./src/js/modules/pt_dictionary.js",
  "./src/js/modules/pt_pos_lexicon.js",
  "./src/assets/js/qrcode.min.js",
  "./src/assets/js/lz-string.min.js",
  "./src/assets/js/phosphor.js",
  "./src/assets/lingua/pt_dict_core.json",
  "./src/assets/lingua/pt_dict_chunk_1.json",
  "./src/assets/lingua/pt_dict_chunk_2.json",
  "./src/assets/lingua/pt_duvidas.json",
  "./src/assets/lingua/pt_regencias.json",
  "./src/assets/lingua/pt_pos_core.json",
  "./src/assets/lingua/pt_pos_chunk_1.json",
  "./src/assets/lingua/pt_pos_chunk_2.json",
  "./src/assets/lingua/pt_pos_chunk_3.json",
  "./src/assets/data/pt_lexicon_core.json",
  "./src/assets/data/pt_lexicon_chunk_1.json",
  "./src/assets/data/pt_lexicon_chunk_2.json",
  "./src/assets/data/pt_lexicon_chunk_3.json",
  "./src/assets/data/pt_lexicon_chunk_4.json",
  "./src/assets/data/pt_lexicon_chunk_5.json",
  "./src/assets/data/pt_lexicon_chunk_6.json",
  "./src/assets/data/pt_lexicon_chunk_7.json",
  "./src/assets/data/pt_lexicon_chunk_8.json",
  "./src/assets/data/pt_lexicon_chunk_9.json",
  "./src/assets/data/pt_lexicon_chunk_10.json",
  "./src/assets/data/pt_lexicon_chunk_11.json",
  "./src/assets/data/pt_lexicon_chunk_12.json",
  "./src/assets/data/pt_lexicon_chunk_13.json",
  "./src/assets/data/pt_lexicon_chunk_14.json",
  "./src/assets/data/pt_lexicon_chunk_15.json",
  "./src/assets/data/pt_lexicon_chunk_16.json",
  "./src/assets/data/pt_lexicon_chunk_17.json",
  "./src/assets/data/pt_lexicon_chunk_18.json",
  "./src/assets/data/pt_lexicon_chunk_19.json",
  "./src/assets/data/pt_lexicon_chunk_20.json",
  "./src/assets/data/pt_lexicon_chunk_21.json",
  "./src/assets/data/pt_lexicon_chunk_22.json",
  "./src/assets/data/pt_lexicon_chunk_23.json",
  "./src/assets/data/pt_lexicon_chunk_24.json",
  "./src/assets/data/pt_lexicon_chunk_25.json",
  "./src/assets/data/pt_lexicon_chunk_26.json",
  "./src/assets/data/pt_lexicon_chunk_27.json",
  "./src/assets/data/pt_lexicon_chunk_28.json",
  "./src/assets/data/pt_lexicon_chunk_29.json",
  "./src/assets/data/pt_lexicon_chunk_30.json",
  "./src/assets/data/pt_lexicon_chunk_31.json",
  "./src/assets/data/pt_lexicon_chunk_32.json",
  "./src/assets/data/pt_lexicon_chunk_33.json",
  "./src/assets/data/pt_lexicon_chunk_34.json",
  "./src/assets/data/pt_lexicon_chunk_35.json",
  "./src/js/modules/xray_tests.js",
  "./src/assets/audio/backspace.wav",
  "./src/assets/audio/enter.wav",
  "./src/assets/audio/music.mp3",
  "./src/assets/audio/scificannon.mp3",
  "./src/assets/audio/type.wav",
  "./src/assets/fonts/0xProtoNerdFont-Regular.ttf",
  "./src/assets/fonts/3270NerdFontMono-Regular.ttf",
  "./src/assets/fonts/BlexMonoNerdFont-Text.ttf",
  "./src/assets/fonts/FiraCodeNerdFontPropo-Regular.ttf",
  "./src/assets/fonts/iMWritingMonoNerdFont-Regular.ttf",
  "./src/assets/fonts/JetBrainsMonoNLNerdFont-Regular.ttf",
  "./src/assets/fonts/SymbolsNerdFontMono-Regular.ttf",
  "./src/assets/fonts/SymbolsNerdFont-Regular.ttf",
  "./src/assets/fonts/inter/InterVariable.woff2",
  "./src/assets/fonts/inter/InterVariable-Italic.woff2",
  "./src/assets/fonts/source-serif-4/SourceSerif4-Regular.woff2",
  "./src/assets/fonts/source-serif-4/SourceSerif4-Italic.woff2",
  "./src/assets/fonts/source-serif-4/SourceSerif4-Bold.woff2",
  "./src/assets/fonts/source-serif-4/SourceSerif4-BoldItalic.woff2",
  "./src/assets/fonts/ibm-plex-sans/IBMPlexSans-Regular.woff2",
  "./src/assets/fonts/ibm-plex-sans/IBMPlexSans-Italic.woff2",
  "./src/assets/fonts/ibm-plex-sans/IBMPlexSans-Bold.woff2",
  "./src/assets/fonts/ibm-plex-sans/IBMPlexSans-BoldItalic.woff2",
  "./src/assets/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2",
  "./src/assets/fonts/jetbrains-mono/JetBrainsMono-Italic.woff2",
  "./src/assets/fonts/jetbrains-mono/JetBrainsMono-Bold.woff2",
  "./src/assets/fonts/jetbrains-mono/JetBrainsMono-BoldItalic.woff2",
  "./src/assets/fonts/JetBrainsMonoNLNerdFont-Regular.ttf",
  "./src/assets/icons/icon-192.svg",
  "./src/assets/icons/icon-512.svg",
  "./src/assets/icons/logo-tot.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
