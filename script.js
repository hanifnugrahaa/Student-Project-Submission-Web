// ─── Config ──────────────────────────────────────────────────
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

// URL Apps Script sudah di-embed langsung
const FIXED_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx--uu0q6W953GBeKPyzvHu9qDjUfBytiWul5okD75vWhOk88TCv_3UYG5XX1TEpMQz/exec';

// ─── State ───────────────────────────────────────────────────
let selectedFiles = [];

// ─── Drop Zone ───────────────────────────────────────────────
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  addFiles([...e.dataTransfer.files]);
});

fileInput.addEventListener('change', () => {
  addFiles([...fileInput.files]);
  fileInput.value = '';
});

// ─── File Management ─────────────────────────────────────────
function addFiles(files) {
  files.forEach(f => {
    if (f.size > MAX_SIZE) {
      toast(`${f.name} terlalu besar (maks 25MB)`, 'error');
      return;
    }
    if (!selectedFiles.find(x => x.name === f.name && x.size === f.size)) {
      selectedFiles.push(f);
    }
  });
  renderFileList();
}

function removeFile(idx) {
  selectedFiles.splice(idx, 1);
  renderFileList();
}

function renderFileList() {
  const list = document.getElementById('file-list');
  list.innerHTML = '';
  selectedFiles.forEach((f, i) => {
    const ext = f.name.split('.').pop().slice(0, 4) || 'file';
    const size = f.size < 1024 * 1024
      ? (f.size / 1024).toFixed(1) + ' KB'
      : (f.size / 1024 / 1024).toFixed(2) + ' MB';

    list.innerHTML += `
      <div class="file-item">
        <div class="file-ext">${ext}</div>
        <div class="file-info">
          <div class="file-name">${f.name}</div>
          <div class="file-size">${size}</div>
        </div>
        <button class="file-remove" onclick="removeFile(${i})" title="Hapus">✕</button>
      </div>
    `;
  });
}

// ─── Upload ──────────────────────────────────────────────────
async function startUpload() {
  if (selectedFiles.length === 0) return toast('Pilih file terlebih dahulu', 'error');

  const btn = document.getElementById('btn-upload');
  const progressWrap = document.getElementById('progress-wrap');
  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const resultsSection = document.getElementById('results-section');
  const resultsList = document.getElementById('results-list');

  btn.disabled = true;
  progressWrap.style.display = 'block';
  resultsSection.style.display = 'none';
  resultsList.innerHTML = '';

  const results = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    const pct = Math.round(((i) / selectedFiles.length) * 100);
    progressBar.style.width = pct + '%';
    progressLabel.textContent = `Mengupload ${i + 1} dari ${selectedFiles.length}: ${file.name}`;

    try {
      const base64 = await toBase64(file);
      const resp = await fetch(FIXED_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          file: base64
        })
      });

      const json = await resp.json();
      results.push({ name: file.name, success: json.success, error: json.error });
    } catch (err) {
      results.push({ name: file.name, success: false, error: err.message });
    }
  }

  progressBar.style.width = '100%';
  progressLabel.textContent = 'Selesai!';

  // Show results
  resultsList.innerHTML = results.map(r => `
    <div class="result-item">
      <span class="result-name">📄 ${r.name}</span>
      <span class="result-badge ${r.success ? '' : 'fail'}">
        ${r.success ? '✓ Berhasil' : '✗ Gagal'}
      </span>
    </div>
  `).join('');

  resultsSection.style.display = 'block';

  const ok = results.filter(r => r.success).length;
  const fail = results.length - ok;

  if (ok > 0) toast(`${ok} file berhasil diupload ke Drive 🎉`, 'success');
  if (fail > 0) toast(`${fail} file gagal diupload`, 'error');

  selectedFiles = [];
  renderFileList();
  btn.disabled = false;
  setTimeout(() => {
    progressWrap.style.display = 'none';
    progressBar.style.width = '0%';
  }, 3000);
}

// ─── Utilities ───────────────────────────────────────────────
function toBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// ─── Toast ───────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = (type === 'success' ? '✅' : '❌') + ' ' + msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}