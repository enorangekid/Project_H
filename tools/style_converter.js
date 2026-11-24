const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const sourcePreview = document.getElementById('sourcePreview');
const fileInfo = document.getElementById('fileInfo');
const convertButton = document.getElementById('convertButton');
const retryButton = document.getElementById('retryButton');
const resolution = document.getElementById('resolution');
const serverState = document.getElementById('serverState');
const jobCard = document.getElementById('jobCard');
const jobTitle = document.getElementById('jobTitle');
const jobMessage = document.getElementById('jobMessage');
const elapsed = document.getElementById('elapsed');
const resultStage = document.querySelector('.result-stage');
const resultPreview = document.getElementById('resultPreview');
const resultInfo = document.getElementById('resultInfo');
const downloadResult = document.getElementById('downloadResult');

let selectedFile = null;
let dataUrl = '';
let activeJob = null;
let pollTimer = null;
let elapsedTimer = null;

function formatBytes(size) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function setFile(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) { window.alert('PNG, JPG 또는 WEBP 이미지를 선택하세요.'); return; }
  if (file.size > 28 * 1024 * 1024) { window.alert('이미지는 28MB 이하여야 합니다.'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    selectedFile = file;
    dataUrl = reader.result;
    sourcePreview.src = dataUrl;
    dropzone.classList.add('has-image');
    fileInfo.textContent = `${file.name} · ${formatBytes(file.size)}`;
    convertButton.disabled = false;
    retryButton.disabled = false;
    jobTitle.textContent = '변환 준비 완료';
    jobMessage.textContent = '버튼을 누르면 ComfyUI 확인부터 자동으로 진행합니다.';
  };
  reader.readAsDataURL(file);
}

async function startJob() {
  if (!selectedFile || !dataUrl || activeJob) return;
  convertButton.disabled = true;
  retryButton.disabled = true;
  jobCard.classList.add('running');
  jobTitle.textContent = '작업 요청 중';
  jobMessage.textContent = '이미지를 로컬 변환 서버로 보내고 있습니다.';
  resultInfo.textContent = '변환 중';
  resultStage.classList.remove('has-image');
  resultPreview.removeAttribute('src');
  downloadResult.classList.add('disabled');
  try {
    const response = await fetch('/api/style/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selectedFile.name, dataUrl, resolution: Number(resolution.value), prompt: document.getElementById('extraPrompt').value, turbo: document.getElementById('turbo').checked }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || `서버 오류 (${response.status})`);
    activeJob = json;
    const started = Date.now();
    elapsedTimer = window.setInterval(() => { elapsed.textContent = `${Math.floor((Date.now() - started) / 60_000)}분 ${Math.floor((Date.now() - started) / 1000) % 60}초`; }, 1000);
    pollTimer = window.setInterval(pollJob, 2000);
    pollJob();
  } catch (error) {
    finishError(error.message);
  }
}

async function pollJob() {
  if (!activeJob) return;
  try {
    const response = await fetch(`/api/style/status?id=${encodeURIComponent(activeJob.id)}`, { cache: 'no-store' });
    const job = await response.json();
    if (!response.ok) throw new Error(job.error || '작업 상태를 확인할 수 없습니다.');
    activeJob = job;
    jobTitle.textContent = job.status === 'comfy' ? 'ComfyUI 준비 중' : job.status === 'running' ? '화풍 변환 중' : job.message;
    jobMessage.textContent = job.message;
    if (job.status === 'done') finishDone(job);
    else if (job.status === 'error') finishError(job.message);
  } catch (error) {
    finishError(error.message);
  }
}

function stopTimers() {
  if (pollTimer) window.clearInterval(pollTimer);
  if (elapsedTimer) window.clearInterval(elapsedTimer);
  pollTimer = null;
  elapsedTimer = null;
}

function finishDone(job) {
  stopTimers();
  jobCard.classList.remove('running');
  jobTitle.textContent = '변환 완료';
  jobMessage.textContent = job.resultName;
  resultPreview.src = `${job.resultUrl}?v=${Date.now()}`;
  resultStage.classList.add('has-image');
  resultInfo.textContent = job.resultName;
  downloadResult.href = job.resultUrl;
  downloadResult.classList.remove('disabled');
  activeJob = null;
  convertButton.disabled = false;
  retryButton.disabled = false;
}

function finishError(message) {
  stopTimers();
  jobCard.classList.remove('running');
  jobTitle.textContent = '변환 실패';
  jobMessage.textContent = message;
  resultInfo.textContent = '오류';
  activeJob = null;
  convertButton.disabled = !selectedFile;
  retryButton.disabled = !selectedFile;
}

fileInput.addEventListener('change', () => setFile(fileInput.files[0]));
['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', (event) => setFile(event.dataTransfer.files[0]));
convertButton.addEventListener('click', startJob);
retryButton.addEventListener('click', startJob);

fetch('/api/ping', { cache: 'no-store' }).then((response) => {
  if (!response.ok) throw new Error();
  serverState.textContent = '로컬 서버 연결됨';
  serverState.classList.add('connected');
}).catch(() => {
  serverState.textContent = '화풍변환기 켜기.bat로 열어야 합니다';
  convertButton.disabled = true;
  jobTitle.textContent = '로컬 서버가 필요합니다';
  jobMessage.textContent = 'Project_H의 화풍변환기 켜기.bat을 실행하세요.';
});
