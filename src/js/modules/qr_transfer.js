import { store } from './store.js';
import { buildTotPayload, importTot } from './export_tot.js';
import { lang } from './lang.js';

const QR_VERSION = 'v1';
const CHUNK_SIZE = 250;
const FRAME_INTERVAL_MS = 380;

const qrTransfer = (() => {
  let streamTimer = null;
  let streamIndex = 0;
  let streamChunks = [];
  let streamTotal = 0;
  let streamBackupId = '';
  let qrInstance = null;

  let scanActive = false;
  let scanBusy = false;
  let scanStream = null;
  let scanDetector = null;
  let scanSession = null;
  let scanCells = [];
  let scanCanvas = null;
  let scanCtx = null;
  let scanMode = null;
  let scanLastAt = 0;

  let onRestore = null;

  const els = {};

  function cacheElements() {
    els.streamModal = document.getElementById('qrStreamModal');
    els.streamCode = document.getElementById('qrStreamCode');
    els.streamStatus = document.getElementById('qrStreamStatus');
    els.streamMeta = document.getElementById('qrStreamMeta');
    els.streamPause = document.getElementById('qrStreamPause');

    els.scanModal = document.getElementById('qrScanModal');
    els.scanVideo = document.getElementById('qrScanVideo');
    els.scanStatus = document.getElementById('qrScanStatus');
    els.scanGrid = document.getElementById('qrScanGrid');
    els.scanProgress = document.getElementById('qrScanProgress');
    els.scanStop = document.getElementById('qrScanStop');
    els.scanImport = document.getElementById('qrScanImport');
    els.scanFile = document.getElementById('qrScanFile');
    els.scanPaste = document.getElementById('qrScanPaste');
    els.scanRestore = document.getElementById('qrScanRestore');
  }

  function buildBackupBase64() {
    if (!window.LZString) {
      throw new Error('LZString not available.');
    }
    const editorEl = document.getElementById('editor');
    const memoEl = document.getElementById('memoArea');
    if (editorEl) {
      store.save(editorEl.innerHTML, memoEl ? memoEl.value : undefined);
    }
    const payload = buildTotPayload(store);
    const json = JSON.stringify(payload);
    return window.LZString.compressToBase64(json);
  }

  function decodeBackupBase64(base64) {
    if (!window.LZString) return null;
    const json = window.LZString.decompressFromBase64(base64.trim());
    if (!json) return null;
    const payload = importTot(json);
    return payload || null;
  }

  function downloadBase64Backup() {
    const base64 = buildBackupBase64();
    const blob = new Blob([base64], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TOT_QR_${Date.now()}.b64`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function initStream() {
    if (!els.streamCode) return;
    const base64 = buildBackupBase64();
    streamBackupId = Date.now().toString().slice(-6);
    streamChunks = base64.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) || [];
    streamTotal = streamChunks.length;
    streamIndex = 0;
    if (els.streamPause) els.streamPause.textContent = lang.t('qr_stream_pause');

    if (!qrInstance) {
      qrInstance = new QRCode(els.streamCode, {
        width: 256,
        height: 256,
        correctLevel: QRCode.CorrectLevel.L
      });
    }

    if (!streamChunks.length) {
      if (els.streamStatus) els.streamStatus.textContent = lang.t('qr_stream_empty');
      return;
    }

    updateStreamFrame();

    if (streamTimer) clearInterval(streamTimer);
    streamTimer = setInterval(updateStreamFrame, FRAME_INTERVAL_MS);
    setStreamStatus();
  }

  function updateStreamFrame() {
    if (!streamChunks.length) return;
    const chunk = streamChunks[streamIndex];
    const checksum = crc32(chunk);
    const frame = `${QR_VERSION}|${streamBackupId}|${streamIndex + 1}|${streamTotal}|${checksum}|${chunk}`;
    qrInstance.clear();
    qrInstance.makeCode(frame);
    setStreamStatus();
    streamIndex = (streamIndex + 1) % streamTotal;
  }

  function setStreamStatus(paused = false) {
    if (!els.streamStatus) return;
    const status = paused ? lang.t('qr_stream_paused') : lang.t('qr_stream_active');
    els.streamStatus.textContent = `${status} | ID ${streamBackupId}`;
    if (els.streamMeta) {
      els.streamMeta.textContent = `${lang.t('qr_frame')} ${String(streamIndex + 1).padStart(3, '0')} / ${String(streamTotal).padStart(3, '0')}`;
    }
  }

  function stopStream() {
    if (streamTimer) {
      clearInterval(streamTimer);
      streamTimer = null;
    }
  }

  function toggleStreamPause() {
    if (streamTimer) {
      stopStream();
      if (els.streamPause) els.streamPause.textContent = lang.t('qr_stream_resume');
      setStreamStatus(true);
    } else {
      streamTimer = setInterval(updateStreamFrame, FRAME_INTERVAL_MS);
      if (els.streamPause) els.streamPause.textContent = lang.t('qr_stream_pause');
    }
  }

  async function startScan() {
    if (!els.scanVideo) {
      updateScanStatus(lang.t('qr_camera_missing'));
      return;
    }

    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      els.scanVideo.srcObject = scanStream;
      await els.scanVideo.play();

      if ('BarcodeDetector' in window) {
        scanDetector = new BarcodeDetector({ formats: ['qr_code'] });
        scanMode = 'barcode';
      } else if (window.jsQR) {
        scanMode = 'jsqr';
        scanCanvas = document.createElement('canvas');
        scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
      } else {
        updateScanStatus(lang.t('qr_no_detector'));
        stopScan();
        return;
      }
      scanActive = true;
      scanSession = null;
      scanCells = [];
      if (scanMode === 'jsqr') {
        updateScanStatus(lang.t('qr_using_fallback'));
      } else {
        updateScanStatus(lang.t('qr_scan_wait'));
      }
      scanLoop();
    } catch (err) {
      updateScanStatus(lang.t('qr_camera_blocked'));
    }
  }

  function stopScan() {
    scanActive = false;
    scanBusy = false;
    if (scanStream) {
      scanStream.getTracks().forEach(track => track.stop());
      scanStream = null;
    }
    if (els.scanVideo) {
      els.scanVideo.srcObject = null;
    }
    scanCanvas = null;
    scanCtx = null;
    scanMode = null;
  }

  function updateScanStatus(text) {
    if (els.scanStatus) els.scanStatus.textContent = text;
  }

  async function scanLoop() {
    if (!scanActive) return;
    if (scanBusy) {
      requestAnimationFrame(scanLoop);
      return;
    }
    if (!els.scanVideo || els.scanVideo.readyState < 2) {
      requestAnimationFrame(scanLoop);
      return;
    }
    scanBusy = true;
    try {
      if (scanMode === 'barcode') {
        const codes = await scanDetector.detect(els.scanVideo);
        if (codes && codes.length > 0) {
          handleScanFrame(codes[0].rawValue || '');
        }
      } else if (scanMode === 'jsqr' && scanCtx && scanCanvas) {
        const now = performance.now();
        if (now - scanLastAt < 90) {
          scanBusy = false;
          requestAnimationFrame(scanLoop);
          return;
        }
        scanLastAt = now;
        const width = els.scanVideo.videoWidth || 640;
        const height = els.scanVideo.videoHeight || 480;
        scanCanvas.width = width;
        scanCanvas.height = height;
        scanCtx.drawImage(els.scanVideo, 0, 0, width, height);
        const imageData = scanCtx.getImageData(0, 0, width, height);
        const result = window.jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
        if (result && result.data) {
          handleScanFrame(result.data);
        }
      }
    } catch (_) {
      // Ignore detection errors; keep scanning.
    } finally {
      scanBusy = false;
      requestAnimationFrame(scanLoop);
    }
  }

  function handleScanFrame(raw) {
    const frame = parseFrame(raw);
    if (!frame) return;

    if (!scanSession || scanSession.id !== frame.id) {
      scanSession = {
        id: frame.id,
        total: frame.total,
        received: new Map()
      };
      setupScanGrid(frame.total);
    }

    if (scanSession.total !== frame.total) return;
    if (scanSession.received.has(frame.index)) return;

    scanSession.received.set(frame.index, frame.data);
    markScanCell(frame.index - 1);

    const receivedCount = scanSession.received.size;
    updateScanStatus(`${lang.t('qr_receiving')} ${receivedCount}/${scanSession.total}`);
    if (els.scanProgress) {
      const pct = Math.max(0, Math.min(100, (receivedCount / scanSession.total) * 100));
      els.scanProgress.style.width = `${pct}%`;
    }

    if (receivedCount === scanSession.total) {
      finalizeScan();
    }
  }

  function setupScanGrid(total) {
    if (!els.scanGrid) return;
    els.scanGrid.innerHTML = '';
    scanCells = [];
    const columns = Math.ceil(Math.sqrt(total));
    els.scanGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    if (els.scanProgress) els.scanProgress.style.width = '0%';
    for (let i = 0; i < total; i += 1) {
      const cell = document.createElement('div');
      cell.className = 'qr-progress-cell';
      els.scanGrid.appendChild(cell);
      scanCells.push(cell);
    }
  }

  function markScanCell(index) {
    const cell = scanCells[index];
    if (cell) cell.classList.add('active');
  }

  function finalizeScan() {
    const ordered = [];
    for (let i = 1; i <= scanSession.total; i += 1) {
      ordered.push(scanSession.received.get(i) || '');
    }
    const base64 = ordered.join('');
    const payload = decodeBackupBase64(base64);
    if (payload) {
      updateScanStatus(lang.t('qr_restore_in_progress'));
      if (onRestore) onRestore(payload);
    } else {
      updateScanStatus(lang.t('qr_decode_fail'));
    }
    stopScan();
  }

  function parseFrame(raw) {
    const parts = raw.split('|');
    if (parts.length < 6) return null;
    const [version, id, idxRaw, totalRaw, checksum, data] = parts;
    if (version !== QR_VERSION) return null;
    const index = parseInt(idxRaw, 10);
    const total = parseInt(totalRaw, 10);
    if (!Number.isFinite(index) || !Number.isFinite(total)) return null;
    if (!id || !data) return null;
    if (crc32(data) !== checksum) return null;
    return { id, index, total, data };
  }

  function crc32(str) {
    let crc = 0 ^ -1;
    for (let i = 0; i < str.length; i += 1) {
      const byte = str.charCodeAt(i);
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
    }
    return ((crc ^ -1) >>> 0).toString(16).padStart(8, '0');
  }

  const CRC_TABLE = (() => {
    const table = [];
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let j = 0; j < 8; j += 1) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table.push(c >>> 0);
    }
    return table;
  })();

  function bindUi() {
    const btnStream = document.getElementById('actionQrStream');
    const btnBase64 = document.getElementById('actionQrString');
    const btnScan = document.getElementById('btnScanQr');

    if (btnStream) {
      btnStream.onclick = () => {
        document.getElementById('exportModal').classList.remove('active');
        if (els.streamModal) els.streamModal.classList.add('active');
        initStream();
      };
    }

    if (btnBase64) {
      btnBase64.onclick = () => {
        downloadBase64Backup();
        document.getElementById('exportModal').classList.remove('active');
      };
    }

    if (btnScan) {
      btnScan.onclick = () => {
        if (els.scanModal) els.scanModal.classList.add('active');
        startScan();
      };
    }

    const closeStream = document.getElementById('closeModalQrStream');
    if (closeStream) {
      closeStream.onclick = () => {
        if (els.streamModal) els.streamModal.classList.remove('active');
        stopStream();
      };
    }

    const closeScan = document.getElementById('closeModalQrScan');
    if (closeScan) {
      closeScan.onclick = () => {
        if (els.scanModal) els.scanModal.classList.remove('active');
        stopScan();
      };
    }

    if (els.streamPause) {
      els.streamPause.onclick = () => toggleStreamPause();
    }

    if (els.scanStop) {
      els.scanStop.onclick = () => {
        if (els.scanModal) els.scanModal.classList.remove('active');
        stopScan();
      };
    }
    if (els.scanImport && els.scanFile) {
      els.scanImport.onclick = () => els.scanFile.click();
      els.scanFile.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const payload = decodeBackupBase64(evt.target.result || '');
          if (payload && onRestore) {
            updateScanStatus(lang.t('qr_restore_in_progress'));
            onRestore(payload);
          } else {
            updateScanStatus(lang.t('qr_decode_fail'));
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      };
    }
    if (els.scanRestore && els.scanPaste) {
      els.scanRestore.onclick = () => {
        const raw = (els.scanPaste.value || '').trim();
        if (!raw) return;
        const payload = decodeBackupBase64(raw);
        if (payload && onRestore) {
          updateScanStatus(lang.t('qr_restore_in_progress'));
          onRestore(payload);
        } else {
          updateScanStatus(lang.t('qr_decode_fail'));
        }
      };
    }

    document.addEventListener('click', (e) => {
      if (els.streamModal && e.target === els.streamModal) {
        els.streamModal.classList.remove('active');
        stopStream();
      }
      if (els.scanModal && e.target === els.scanModal) {
        els.scanModal.classList.remove('active');
        stopScan();
      }
    });

    if (els.scanModal) {
      let touchStartY = 0;
      els.scanModal.addEventListener('touchstart', (e) => {
        if (!e.touches || !e.touches[0]) return;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      els.scanModal.addEventListener('touchend', (e) => {
        const endY = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : touchStartY;
        if (touchStartY - endY > 60) {
          els.scanModal.classList.remove('active');
          stopScan();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (els.streamModal && els.streamModal.classList.contains('active')) {
        stopStream();
      }
      if (els.scanModal && els.scanModal.classList.contains('active')) {
        stopScan();
      }
    });
  }

  function init(options = {}) {
    onRestore = options.onRestore || null;
    cacheElements();
    bindUi();
  }

  return {
    init,
    decodeBackupBase64,
    downloadBase64Backup
  };
})();

export { qrTransfer };
