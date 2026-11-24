// ==========================================
// APLIKASI PRESENSI QR SEKOLAH (GURU & SISWA)
// ==========================================

const STATE = {
  activeTab: 'tab-scan',
  scanMode: 'card', // 'card' atau 'session'
  html5QrCode: null,
  isScanning: false,
  cameras: [],
  currentCameraId: null,
  facingMode: 'environment', // default kamera belakang HP
  isCooldown: false,
  serverInfo: null,
  teachers: [],
  students: [],
  attendance: [],
  sessionTimer: null,
  sessionRemaining: 60,
  activeMasterTab: 'student' // 'student' atau 'teacher'
};

// ==========================================
// AUDIO SYNTHESIZER (Web Audio API)
// ==========================================
function playBeep(type = 'success') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'success') {
      // Pleasant dual chime (Ding-Dong!)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.12);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.4);
    } else if (type === 'warning') {
      // Double buzz for duplicate or warning
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // Low error buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.warn('Audio feedback error:', e);
  }

  // Trigger vibration if supported on phone
  if (navigator.vibrate) {
    if (type === 'success') navigator.vibrate([100, 50, 100]);
    else if (type === 'warning') navigator.vibrate([150]);
    else navigator.vibrate([250, 100, 250]);
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-500 text-slate-900',
    info: 'bg-blue-600 text-white'
  };

  toast.className = `px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto ${colors[type] || colors.info}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();

  startLiveClock();
  initNavigation();
  initQuickTestButtons();
  initModals();
  initFormListeners();
  initPWAInstall();

  await loadServerInfo();
  await loadData();
  await initScanner();

  // Set today's date in recap filter
  const today = getTodayFormatted();
  document.getElementById('recapFilterDate').value = today;
  document.getElementById('manualDate').value = today;

  renderRecapTable();
  renderCardsGrid();
  renderMasterTable();
  renderRecentActivity();
  startSessionQR();
});

// ==========================================
// PWA INSTALLATION & SERVICE WORKER
// ==========================================
let deferredInstallPrompt = null;

function initPWAInstall() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('PWA ServiceWorker registered:', reg.scope))
      .catch(err => console.log('ServiceWorker registration failed:', err));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    
    // Tampilkan tombol pasang jika didukung
    const btnInstall = document.getElementById('btnInstallPWA');
    if (btnInstall) {
      btnInstall.classList.remove('hidden');
      btnInstall.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('Aplikasi berhasil dipasang di HP!', 'success');
        }
        deferredInstallPrompt = null;
        btnInstall.classList.add('hidden');
      });
    }
  });
}

// ==========================================
// LIVE CLOCK & DATE
// ==========================================
function startLiveClock() {
  const clockEl = document.getElementById('liveClock');
  const dateEl = document.getElementById('liveDate');

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function update() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${h}:${m}:${s} WIB`;

    if (dateEl) {
      const dayName = days[now.getDay()];
      const day = now.getDate();
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();
      dateEl.textContent = `${dayName}, ${day} ${monthName} ${year}`;
    }
  }

  update();
  setInterval(update, 1000);
}

function getTodayFormatted() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==========================================
// NAVIGATION & TABS
// ==========================================
function initNavigation() {
  // Desktop Nav Tabs
  const desktopTabs = document.querySelectorAll('.nav-tab');
  desktopTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-target'));
    });
  });

  // Mobile Bottom Nav
  const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
  mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-target'));
    });
  });

  // Scan Mode Switcher (Kartu ID vs QR Sesi)
  document.getElementById('btnModeCard')?.addEventListener('click', () => {
    setScanMode('card');
  });
  document.getElementById('btnModeSession')?.addEventListener('click', () => {
    setScanMode('session');
  });

  // Master Data Tab Switcher
  document.getElementById('btnSwitchMasterStudent')?.addEventListener('click', () => {
    switchMasterTab('student');
  });
  document.getElementById('btnSwitchMasterTeacher')?.addEventListener('click', () => {
    switchMasterTab('teacher');
  });
}

function switchTab(targetId) {
  STATE.activeTab = targetId;

  // Hide all sections
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.add('hidden');
    section.classList.remove('block');
  });

  // Show active section
  const targetSection = document.getElementById(targetId);
  if (targetSection) {
    targetSection.classList.remove('hidden');
    targetSection.classList.add('block');
  }

  // Update Desktop Tab Styles
  document.querySelectorAll('.nav-tab').forEach(tab => {
    const isTarget = tab.getAttribute('data-target') === targetId;
    tab.classList.toggle('active', isTarget);
    tab.classList.toggle('text-blue-600', isTarget);
    tab.classList.toggle('border-blue-600', isTarget);
    tab.classList.toggle('text-slate-600', !isTarget);
    tab.classList.toggle('border-transparent', !isTarget);
  });

  // Update Mobile Nav Styles
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    const isTarget = btn.getAttribute('data-target') === targetId;
    btn.classList.toggle('active', isTarget);
    btn.classList.toggle('text-blue-600', isTarget);
    btn.classList.toggle('text-slate-500', !isTarget);
  });

  // Trigger re-render if necessary
  if (targetId === 'tab-cards') renderCardsGrid();
  if (targetId === 'tab-recap') renderRecapTable();
  if (targetId === 'tab-session') refreshSessionQR();
  if (targetId === 'tab-master') renderMasterTable();

  if (window.lucide) lucide.createIcons();
}

function setScanMode(mode) {
  STATE.scanMode = mode;
  const btnCard = document.getElementById('btnModeCard');
  const btnSession = document.getElementById('btnModeSession');

  if (mode === 'card') {
    btnCard.className = 'px-2.5 py-1 rounded-md bg-white text-blue-700 shadow-sm transition';
    btnSession.className = 'px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 transition';
  } else {
    btnSession.className = 'px-2.5 py-1 rounded-md bg-white text-blue-700 shadow-sm transition';
    btnCard.className = 'px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 transition';
  }
}

function switchMasterTab(type) {
  STATE.activeMasterTab = type;
  const btnStudent = document.getElementById('btnSwitchMasterStudent');
  const btnTeacher = document.getElementById('btnSwitchMasterTeacher');
  const title = document.getElementById('masterListTitle');
  const addBtnLabel = document.getElementById('lblAddMember');

  if (type === 'student') {
    btnStudent.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm transition';
    btnTeacher.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
    title.textContent = 'Daftar Siswa Terdaftar';
    addBtnLabel.textContent = 'Tambah Siswa';
  } else {
    btnTeacher.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm transition';
    btnStudent.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
    title.textContent = 'Daftar Guru / Tenaga Pendidik';
    addBtnLabel.textContent = 'Tambah Guru';
  }

  renderMasterTable();
}

// ==========================================
// LOAD API DATA
// ==========================================
async function loadServerInfo() {
  try {
    const res = await fetch('/api/info');
    if (!res.ok) return;
    const data = await res.json();
    STATE.serverInfo = data;

    // Update Header and Config elements
    if (data.config) {
      document.getElementById('headerSchoolName').textContent = data.config.schoolName || 'Presensi QR Sekolah';
      document.getElementById('statRuleLate').textContent = data.config.checkInLate || '07:15';
      document.getElementById('statRuleOut').textContent = data.config.checkOutStart || '13:30';

      // Prefill settings form
      document.getElementById('cfgSchoolName').value = data.config.schoolName || '';
      document.getElementById('cfgSchoolAddress').value = data.config.schoolAddress || '';
      document.getElementById('cfgCheckInStart').value = data.config.checkInStart || '06:00';
      document.getElementById('cfgCheckInLate').value = data.config.checkInLate || '07:15';
      document.getElementById('cfgCheckOutStart').value = data.config.checkOutStart || '13:30';
      document.getElementById('cfgCheckOutEnd').value = data.config.checkOutEnd || '18:00';
    }

    // Update phone connect modal QR
    if (data.ipQrCode) {
      document.getElementById('qrLocalIpImg').src = data.ipQrCode;
      document.getElementById('localUrlText').textContent = data.localUrl;
    }

    updateStatCounts(data.stats);
  } catch (err) {
    console.error('Failed to load server info:', err);
  }
}

async function loadData() {
  try {
    const [tRes, sRes, aRes] = await Promise.all([
      fetch('/api/teachers'),
      fetch('/api/students'),
      fetch(`/api/attendance?date=${getTodayFormatted()}`)
    ]);

    if (tRes.ok) STATE.teachers = await tRes.json();
    if (sRes.ok) STATE.students = await sRes.json();
    if (aRes.ok) STATE.attendance = await aRes.json();

    populateManualMemberDropdown();
  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

function updateStatCounts(stats) {
  if (!stats) return;
  document.getElementById('statStudentCount').textContent = `${stats.studentPresent}/${stats.totalStudents}`;
  document.getElementById('statTeacherCount').textContent = `${stats.teacherPresent}/${stats.totalTeachers}`;
  document.getElementById('statLateCount').textContent = `${stats.studentLate + stats.teacherLate}`;
}

// ==========================================
// CAMERA SCANNER (Html5Qrcode)
// ==========================================
async function initScanner() {
  const readerElement = document.getElementById('reader');
  if (!readerElement) return;

  STATE.html5QrCode = new Html5Qrcode("reader");

  // Switch camera button
  document.getElementById('btnToggleCamera')?.addEventListener('click', toggleCamera);
  document.getElementById('btnTestBeep')?.addEventListener('click', () => playBeep('success'));
  document.getElementById('btnStartCamera')?.addEventListener('click', startCamera);

  await startCamera();
}

async function startCamera() {
  const idleState = document.getElementById('cameraIdleState');
  if (idleState) idleState.classList.add('hidden');

  try {
    const cameras = await Html5Qrcode.getCameras();
    STATE.cameras = cameras;

    const qrConfig = {
      fps: 15,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    // Use rear camera by default on phones
    const cameraSettings = { facingMode: STATE.facingMode };

    await STATE.html5QrCode.start(
      cameraSettings,
      qrConfig,
      onScanSuccess,
      onScanFailure
    );

    STATE.isScanning = true;
  } catch (err) {
    console.warn("Camera start error (showing idle button):", err);
    STATE.isScanning = false;
    if (idleState) idleState.classList.remove('hidden');
  }
}

async function toggleCamera() {
  if (!STATE.html5QrCode || !STATE.isScanning) return;
  try {
    await STATE.html5QrCode.stop();
    // Toggle facing mode between environment and user
    STATE.facingMode = STATE.facingMode === 'environment' ? 'user' : 'environment';
    document.getElementById('lblSwitchCamera').textContent =
      STATE.facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan';
    await startCamera();
  } catch (e) {
    console.error('Failed to toggle camera:', e);
  }
}

function onScanFailure(error) {
  // Silent frame parse error
}

// ==========================================
// PROCESS SCAN RESULT
// ==========================================
async function onScanSuccess(decodedText, decodedResult) {
  if (STATE.isCooldown) return;
  STATE.isCooldown = true;

  console.log("QR Terdeteksi:", decodedText);
  await processAttendanceScan(decodedText);

  // Cooldown countdown for next scan (1.5 seconds)
  let count = 1.5;
  const countdownEl = document.getElementById('scanCountdown');
  if (countdownEl) countdownEl.textContent = `${count.toFixed(1)}s`;

  const interval = setInterval(() => {
    count -= 0.5;
    if (countdownEl) countdownEl.textContent = `${Math.max(0, count).toFixed(1)}s`;
    if (count <= 0) {
      clearInterval(interval);
      STATE.isCooldown = false;
      if (countdownEl) countdownEl.textContent = 'Siap!';
    }
  }, 500);
}

async function processAttendanceScan(qrData) {
  try {
    const res = await fetch('/api/attendance/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData, scanMode: STATE.scanMode })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      playBeep('error');
      showScanError(data.message || 'QR Code tidak valid atau belum terdaftar.');
      return;
    }

    if (data.isSessionQR) {
      playBeep('info');
      showToast('QR Sesi Terbaca. Pilih identitas Anda di menu presensi.', 'info');
      return;
    }

    // Success response
    if (data.alreadyRecorded) {
      playBeep('warning');
    } else {
      playBeep('success');
      if (window.confetti && data.action === 'MASUK' && data.log.status === 'Hadir') {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      }
    }

    displayScanResult(data);
    await loadServerInfo();
    await refreshAttendanceList();
  } catch (err) {
    console.error('Scan process error:', err);
    playBeep('error');
    showScanError('Terjadi kesalahan sambungan ke server.');
  }
}

function displayScanResult(data) {
  const placeholder = document.getElementById('scanResultPlaceholder');
  const activeResult = document.getElementById('scanResultActive');
  if (placeholder) placeholder.classList.add('hidden');
  if (activeResult) activeResult.classList.remove('hidden');

  const banner = document.getElementById('resultStatusBanner');
  const actionText = document.getElementById('resultActionText');
  const statusSub = document.getElementById('resultStatusSub');
  const timeBadge = document.getElementById('resultTimeBadge');
  const icon = document.getElementById('resultStatusIcon');

  const avatar = document.getElementById('resultAvatar');
  const nameEl = document.getElementById('resultName');
  const idEl = document.getElementById('resultIdentifier');
  const subInfoEl = document.getElementById('resultSubInfo');
  const typeBadge = document.getElementById('resultTypeBadge');
  const msgEl = document.getElementById('resultMessage');

  const p = data.person || {};
  const log = data.log || {};

  nameEl.textContent = p.name || '-';
  idEl.textContent = `${p.type === 'Siswa' ? 'NIS' : 'NIP'}: ${p.identifier || '-'}`;
  subInfoEl.textContent = p.subInfo || '-';
  typeBadge.textContent = p.type || 'Siswa';
  msgEl.textContent = data.message || 'Presensi berhasil dicatat.';

  // Initial avatar
  const initials = (p.name || 'AB').split(' ').map(n => n[0]).slice(0, 2).join('');
  avatar.textContent = initials;

  timeBadge.textContent = log.checkInTime || log.checkOutTime || '--:--';

  if (data.action === 'MASUK') {
    if (log.status === 'Terlambat') {
      banner.className = 'p-3 rounded-xl flex items-center justify-between mb-4 bg-amber-50 border border-amber-200 text-amber-900';
      icon.className = 'w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold';
      actionText.textContent = 'ABSEN MASUK (TERLAMBAT)';
      statusSub.textContent = `Tercatat pukul ${log.checkInTime} (${log.notes || 'Terlambat'})`;
    } else {
      banner.className = 'p-3 rounded-xl flex items-center justify-between mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800';
      icon.className = 'w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold';
      actionText.textContent = 'ABSEN MASUK (TEPAT WAKTU)';
      statusSub.textContent = `Tercatat pukul ${log.checkInTime}`;
    }
  } else if (data.action === 'PULANG') {
    banner.className = 'p-3 rounded-xl flex items-center justify-between mb-4 bg-blue-50 border border-blue-200 text-blue-900';
    icon.className = 'w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold';
    actionText.textContent = 'ABSEN PULANG SELESAI';
    statusSub.textContent = `Waktu pulang: ${log.checkOutTime}`;
  } else {
    banner.className = 'p-3 rounded-xl flex items-center justify-between mb-4 bg-slate-100 border border-slate-300 text-slate-800';
    icon.className = 'w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center font-bold';
    actionText.textContent = 'SUDAH TERCATAT HARI INI';
    statusSub.textContent = `Masuk: ${log.checkInTime} | Pulang: ${log.checkOutTime || '-'}`;
  }

  if (window.lucide) lucide.createIcons();
}

function showScanError(msg) {
  showToast(msg, 'error');
}

// ==========================================
// SIMULASI SCAN CEPAT (TEST BUTTONS)
// ==========================================
function initQuickTestButtons() {
  const container = document.getElementById('quickTestContainer');
  if (!container) return;

  const testSamples = [
    { label: 'Siswa: Alif (X-A)', code: 'STUDENT_20261001', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Siswa: Anisa (X-A)', code: 'STUDENT_20261002', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Guru: Pak Budi', code: 'TEACHER_198001012005011001', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { label: 'Guru: Bu Siti', code: 'TEACHER_198505122008012003', color: 'bg-purple-50 text-purple-700 border-purple-200' }
  ];

  container.innerHTML = testSamples.map(s => `
    <button class="btn-quick-test px-2.5 py-1.5 rounded-lg border text-left text-xs font-semibold ${s.color} hover:brightness-95 active:scale-95 transition truncate" data-code="${s.code}">
      ${s.label}
    </button>
  `).join('');

  container.querySelectorAll('.btn-quick-test').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      processAttendanceScan(code);
    });
  });
}

// ==========================================
// RECENT ACTIVITY LIST (TODAY)
// ==========================================
async function refreshAttendanceList() {
  const date = getTodayFormatted();
  const res = await fetch(`/api/attendance?date=${date}`);
  if (res.ok) {
    STATE.attendance = await res.json();
    renderRecentActivity();
    renderRecapTable();
  }
}

function renderRecentActivity() {
  const listEl = document.getElementById('recentActivityList');
  if (!listEl) return;

  const recent = STATE.attendance.slice(0, 8); // Top 8 most recent

  if (recent.length === 0) {
    listEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">Belum ada aktivitas presensi hari ini.</div>`;
    return;
  }

  listEl.innerHTML = recent.map(item => {
    const isLate = item.status === 'Terlambat';
    const isOut = Boolean(item.checkOutTime);
    const badgeColor = isLate
      ? 'bg-amber-100 text-amber-800'
      : item.status === 'Hadir'
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-slate-100 text-slate-800';

    return `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition text-xs">
        <div class="flex items-center space-x-3 min-w-0">
          <div class="w-8 h-8 rounded-full ${item.type === 'teacher' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} flex items-center justify-center font-bold text-[11px] flex-shrink-0">
            ${item.name.substring(0, 2).toUpperCase()}
          </div>
          <div class="min-w-0">
            <h4 class="font-bold text-slate-800 truncate">${item.name}</h4>
            <p class="text-[11px] text-slate-500 truncate">${item.subInfo} • ${item.identifier}</p>
          </div>
        </div>
        <div class="text-right flex-shrink-0 ml-2">
          <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">
            ${item.status} ${isOut ? '(Pulang)' : ''}
          </span>
          <p class="text-[10px] font-mono text-slate-400 mt-0.5">
            ${item.checkOutTime || item.checkInTime || '-'}
          </p>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// TAB 2: QR SESI DINAMIS (PROYEKTOR / DISPLAY KELAS)
// ==========================================
function startSessionQR() {
  refreshSessionQR();

  // Fullscreen Handler
  document.getElementById('btnSessionFullscreen')?.addEventListener('click', () => {
    const sessionSection = document.getElementById('tab-session');
    if (!document.fullscreenElement) {
      sessionSection.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  // Session Type Buttons
  document.querySelectorAll('.btn-session-type').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-session-type').forEach(b => {
        b.className = 'btn-session-type px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
      });
      btn.className = 'btn-session-type active px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm transition';
      refreshSessionQR();
    });
  });

  // Timer countdown
  if (STATE.sessionTimer) clearInterval(STATE.sessionTimer);
  STATE.sessionTimer = setInterval(() => {
    STATE.sessionRemaining--;
    const countdownEl = document.getElementById('sessionCountdown');
    if (countdownEl) countdownEl.textContent = `${STATE.sessionRemaining}s`;

    if (STATE.sessionRemaining <= 0) {
      STATE.sessionRemaining = 60;
      refreshSessionQR();
    }
  }, 1000);
}

async function refreshSessionQR() {
  const activeBtn = document.querySelector('.btn-session-type.active');
  const sessionType = activeBtn?.getAttribute('data-type') || 'MASUK';

  try {
    const res = await fetch(`/api/session/current?sessionType=${sessionType}`);
    if (!res.ok) return;
    const data = await res.json();

    const canvasContainer = document.getElementById('sessionQrCanvas');
    if (canvasContainer) {
      canvasContainer.innerHTML = '';
      new QRCode(canvasContainer, {
        text: data.token,
        width: 280,
        height: 280,
        colorDark: sessionType === 'MASUK' ? '#1d4ed8' : '#047857',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }

    const tokenText = document.getElementById('sessionTokenText');
    if (tokenText) tokenText.textContent = data.token;
  } catch (err) {
    console.error('Failed to refresh session QR:', err);
  }
}

// ==========================================
// TAB 3: KARTU QR DIGITAL (ID BADGES)
// ==========================================
function renderCardsGrid() {
  const container = document.getElementById('cardsGrid');
  if (!container) return;

  const filterType = document.getElementById('cardFilterType')?.value || 'student';
  const filterClass = document.getElementById('cardFilterClass')?.value || 'ALL';

  let list = [];
  if (filterType === 'student') {
    list = STATE.students.filter(s => filterClass === 'ALL' || s.class === filterClass);
  } else {
    list = STATE.teachers;
  }

  if (list.length === 0) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 text-sm">Tidak ada data ditemukan.</div>`;
    return;
  }

  container.innerHTML = list.map(item => {
    const isStudent = filterType === 'student';
    const identifier = isStudent ? item.nis : item.nip;
    const idLabel = isStudent ? 'NIS' : 'NIP';
    const subLabel = isStudent ? `Kelas: ${item.class}` : item.role;
    const headerClass = isStudent ? 'id-card-header-student' : 'id-card-header-teacher';
    const qrTargetId = `qr_card_${item.id}`;

    return `
      <div class="id-card-badge p-4 flex flex-col justify-between">
        <!-- Card Header Banner -->
        <div class="${headerClass} -mx-4 -mt-4 px-4 py-2.5 text-white flex items-center justify-between mb-3">
          <div class="flex items-center gap-1.5">
            <i data-lucide="shield" class="w-3.5 h-3.5"></i>
            <span class="text-[10px] font-bold uppercase tracking-wider">${isStudent ? 'KARTU TANDA PELAJAR' : 'KARTU IDENTITAS PENDIDIK'}</span>
          </div>
          <span class="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-mono">${isStudent ? item.class : 'GURU'}</span>
        </div>

        <!-- Person Content -->
        <div class="flex items-center space-x-3 mb-3">
          <div class="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 flex-shrink-0 text-sm overflow-hidden">
            ${item.name.substring(0, 2).toUpperCase()}
          </div>
          <div class="min-w-0">
            <h4 class="font-extrabold text-slate-900 text-xs leading-tight truncate">${item.name}</h4>
            <p class="text-[11px] font-mono text-slate-500 mt-0.5">${idLabel}: ${identifier}</p>
            <p class="text-[10px] text-blue-700 font-semibold truncate">${subLabel}</p>
          </div>
        </div>

        <!-- QR Code Canvas for Scanning -->
        <div class="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center my-auto">
          <div id="${qrTargetId}" class="w-28 h-28 flex items-center justify-center"></div>
          <span class="text-[9px] font-mono text-slate-400 mt-1">${item.qrCode}</span>
        </div>

        <!-- School Footer -->
        <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
          <span>SMA N 1 Prestasi</span>
          <span>Th. Ajaran 2026/2027</span>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();

  // Generate QR code for each card
  list.forEach(item => {
    const el = document.getElementById(`qr_card_${item.id}`);
    if (el) {
      new QRCode(el, {
        text: item.qrCode,
        width: 105,
        height: 105,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  });
}

// ==========================================
// TAB 4: REKAPITULASI & LAPORAN
// ==========================================
function renderRecapTable() {
  const tbody = document.getElementById('recapTableBody');
  const countEl = document.getElementById('recapTableCount');
  if (!tbody) return;

  const targetDate = document.getElementById('recapFilterDate')?.value || getTodayFormatted();
  const filterType = document.getElementById('recapFilterType')?.value || 'all';
  const filterStatus = document.getElementById('recapFilterStatus')?.value || 'ALL';
  const searchQuery = (document.getElementById('recapSearchInput')?.value || '').toLowerCase();

  let rows = STATE.attendance.filter(a => a.date === targetDate);

  if (filterType !== 'all') {
    rows = rows.filter(a => a.type === filterType);
  }

  if (filterStatus !== 'ALL') {
    rows = rows.filter(a => a.status === filterStatus);
  }

  if (searchQuery) {
    rows = rows.filter(a =>
      a.name.toLowerCase().includes(searchQuery) ||
      a.identifier.includes(searchQuery) ||
      a.subInfo.toLowerCase().includes(searchQuery)
    );
  }

  if (countEl) countEl.textContent = `Menampilkan ${rows.length} catatan kehadiran`;

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="py-8 text-center text-slate-400 text-xs">
          Belum ada catatan presensi pada tanggal dan filter yang dipilih.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map((r, idx) => {
    const statusBadges = {
      Hadir: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Terlambat: 'bg-amber-100 text-amber-800 border-amber-200',
      Izin: 'bg-blue-100 text-blue-800 border-blue-200',
      Sakit: 'bg-purple-100 text-purple-800 border-purple-200',
      Alpa: 'bg-rose-100 text-rose-800 border-rose-200'
    };

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-2.5 px-4 font-mono text-slate-400">${idx + 1}</td>
        <td class="py-2.5 px-4">
          <div class="font-bold text-slate-800">${r.name}</div>
          <div class="text-[11px] font-mono text-slate-400">${r.identifier}</div>
        </td>
        <td class="py-2.5 px-4">
          <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${r.type === 'teacher' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}">
            ${r.type === 'teacher' ? 'Guru' : 'Siswa'}
          </span>
          <div class="text-[11px] text-slate-600 font-medium mt-0.5">${r.subInfo}</div>
        </td>
        <td class="py-2.5 px-4 font-mono font-semibold text-slate-700">${r.checkInTime || '-'}</td>
        <td class="py-2.5 px-4 font-mono text-slate-500">${r.checkOutTime || '-'}</td>
        <td class="py-2.5 px-4">
          <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadges[r.status] || 'bg-slate-100 text-slate-700'}">
            ${r.status}
          </span>
        </td>
        <td class="py-2.5 px-4 text-slate-500 text-[11px]">
          ${r.method === 'QR_CARD_SCAN' ? 'Scan Kartu' : r.method === 'MANUAL' ? 'Manual' : 'Scan Sesi'}
        </td>
        <td class="py-2.5 px-4 text-slate-500 text-[11px] max-w-[140px] truncate" title="${r.notes || '-'}">
          ${r.notes || '-'}
        </td>
        <td class="py-2.5 px-4 text-center">
          <button class="btn-delete-log p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" data-id="${r.id}" title="Hapus Catatan">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();

  // Attach delete buttons
  tbody.querySelectorAll('.btn-delete-log').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Apakah Anda yakin ingin menghapus catatan presensi ini?')) {
        await deleteAttendanceLog(id);
      }
    });
  });
}

async function deleteAttendanceLog(id) {
  try {
    const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Catatan presensi berhasil dihapus', 'success');
      await refreshAttendanceList();
      await loadServerInfo();
    }
  } catch (err) {
    showToast('Gagal menghapus presensi', 'error');
  }
}

// ==========================================
// EXCEL EXPORT (SheetJS)
// ==========================================
function exportToExcel() {
  const targetDate = document.getElementById('recapFilterDate')?.value || getTodayFormatted();
  const filterType = document.getElementById('recapFilterType')?.value || 'all';
  const rows = STATE.attendance.filter(a => a.date === targetDate);

  if (rows.length === 0) {
    alert('Tidak ada data presensi pada tanggal tersebut untuk diekspor.');
    return;
  }

  const excelData = rows.map((r, i) => ({
    "No": i + 1,
    "Tanggal": r.date,
    "Tipe": r.type === 'teacher' ? 'Guru' : 'Siswa',
    "NIS/NIP": r.identifier,
    "Nama Lengkap": r.name,
    "Kelas / Jabatan": r.subInfo,
    "Jam Masuk": r.checkInTime || '-',
    "Jam Pulang": r.checkOutTime || '-',
    "Status": r.status,
    "Metode Presensi": r.method,
    "Keterangan": r.notes || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Presensi_${targetDate}`);

  // Download File
  XLSX.writeFile(workbook, `Rekap_Presensi_${targetDate}.xlsx`);
  showToast('File Excel berhasil diunduh!', 'success');
}

// ==========================================
// TAB 5: MASTER DATA (GURU & SISWA)
// ==========================================
function renderMasterTable() {
  const tbody = document.getElementById('masterTableBody');
  const headers = document.getElementById('masterTableHeaders');
  const searchInput = (document.getElementById('masterSearchInput')?.value || '').toLowerCase();
  if (!tbody) return;

  const isStudent = STATE.activeMasterTab === 'student';

  if (headers) {
    headers.innerHTML = `
      <th class="py-2.5 px-4">${isStudent ? 'NIS / NISN' : 'NIP'}</th>
      <th class="py-2.5 px-4">Nama Lengkap</th>
      <th class="py-2.5 px-4">${isStudent ? 'Kelas' : 'Mata Pelajaran / Jabatan'}</th>
      <th class="py-2.5 px-4">Kode QR</th>
      <th class="py-2.5 px-4 text-center">Aksi</th>
    `;
  }

  let list = isStudent ? STATE.students : STATE.teachers;

  if (searchInput) {
    list = list.filter(item =>
      item.name.toLowerCase().includes(searchInput) ||
      (isStudent ? item.nis.includes(searchInput) : item.nip.includes(searchInput))
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">Tidak ada data ditemukan.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const idVal = isStudent ? `${item.nis} (${item.nisn || '-'})` : item.nip;
    const subVal = isStudent ? item.class : item.role;

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-2.5 px-4 font-mono font-medium text-slate-700">${idVal}</td>
        <td class="py-2.5 px-4 font-bold text-slate-800">${item.name}</td>
        <td class="py-2.5 px-4 text-slate-600">${subVal}</td>
        <td class="py-2.5 px-4 font-mono text-[11px] text-blue-600">${item.qrCode}</td>
        <td class="py-2.5 px-4 text-center">
          <button class="btn-delete-member p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition" data-id="${item.id}" data-type="${isStudent ? 'students' : 'teachers'}" title="Hapus">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();

  tbody.querySelectorAll('.btn-delete-member').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      if (confirm('Hapus anggota ini dari sistem sekolah?')) {
        await deleteMember(type, id);
      }
    });
  });
}

async function deleteMember(type, id) {
  try {
    const res = await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Data berhasil dihapus', 'success');
      await loadData();
      renderMasterTable();
      renderCardsGrid();
      await loadServerInfo();
    }
  } catch (err) {
    showToast('Gagal menghapus data', 'error');
  }
}

// ==========================================
// MODALS & FORMS
// ==========================================
function initModals() {
  // Phone Connect Modal
  const modalPhone = document.getElementById('modalPhoneConnect');
  document.getElementById('btnOpenPhoneConnect')?.addEventListener('click', () => {
    modalPhone.classList.remove('hidden');
  });
  document.getElementById('btnClosePhoneModal')?.addEventListener('click', () => {
    modalPhone.classList.add('hidden');
  });
  document.getElementById('btnDonePhoneModal')?.addEventListener('click', () => {
    modalPhone.classList.add('hidden');
  });
  document.getElementById('btnCopyLocalUrl')?.addEventListener('click', () => {
    const url = document.getElementById('localUrlText').textContent;
    navigator.clipboard?.writeText(url);
    showToast('Alamat URL berhasil disalin!', 'success');
  });

  // Manual Attendance Modal
  const modalManual = document.getElementById('modalManualAttendance');
  document.getElementById('btnOpenManualModal')?.addEventListener('click', () => {
    modalManual.classList.remove('hidden');
  });
  document.getElementById('btnCloseManualModal')?.addEventListener('click', () => {
    modalManual.classList.add('hidden');
  });

  // Manual Scan Input Prompt (Ketik NIS/NIP)
  document.getElementById('btnOpenManualScan')?.addEventListener('click', () => {
    const code = prompt('Masukkan NIS Siswa atau NIP Guru untuk absen:');
    if (code) processAttendanceScan(code.trim());
  });

  // Add Member Modal
  const modalAdd = document.getElementById('modalAddMember');
  document.getElementById('btnAddNewMember')?.addEventListener('click', () => {
    const isStudent = STATE.activeMasterTab === 'student';
    document.getElementById('modalAddMemberTitle').textContent = isStudent ? 'Tambah Siswa Baru' : 'Tambah Guru Baru';
    document.getElementById('lblAddId').textContent = isStudent ? 'Nomor Induk Siswa (NIS)' : 'Nomor Induk Pegawai (NIP)';
    document.getElementById('fieldAddClass').classList.toggle('hidden', !isStudent);
    document.getElementById('fieldAddRole').classList.toggle('hidden', isStudent);
    modalAdd.classList.remove('hidden');
  });
  document.getElementById('btnCloseAddMember')?.addEventListener('click', () => {
    modalAdd.classList.add('hidden');
  });

  // Print Buttons
  document.getElementById('btnPrintCards')?.addEventListener('click', () => window.print());
  document.getElementById('btnPrintRecap')?.addEventListener('click', () => window.print());
  document.getElementById('btnExportExcel')?.addEventListener('click', exportToExcel);

  // Filter change listeners
  document.getElementById('cardFilterType')?.addEventListener('change', renderCardsGrid);
  document.getElementById('cardFilterClass')?.addEventListener('change', renderCardsGrid);
  document.getElementById('recapFilterDate')?.addEventListener('change', renderRecapTable);
  document.getElementById('recapFilterType')?.addEventListener('change', renderRecapTable);
  document.getElementById('recapFilterStatus')?.addEventListener('change', renderRecapTable);
  document.getElementById('recapSearchInput')?.addEventListener('input', renderRecapTable);
  document.getElementById('masterSearchInput')?.addEventListener('input', renderMasterTable);
  document.getElementById('btnRefreshRecent')?.addEventListener('click', refreshAttendanceList);
}

function populateManualMemberDropdown() {
  const select = document.getElementById('manualMemberSelect');
  const typeSelect = document.getElementById('manualType');
  if (!select || !typeSelect) return;

  function update() {
    const isStudent = typeSelect.value === 'student';
    const list = isStudent ? STATE.students : STATE.teachers;
    select.innerHTML = list.map(item => `
      <option value="${item.id}">${item.name} (${isStudent ? item.class : item.role})</option>
    `).join('');
  }

  typeSelect.addEventListener('change', update);
  update();
}

function initFormListeners() {
  // Submit Form Izin/Sakit Manual
  document.getElementById('formManualAttendance')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('manualType').value;
    const memberId = document.getElementById('manualMemberSelect').value;
    const date = document.getElementById('manualDate').value;
    const status = document.getElementById('manualStatus').value;
    const notes = document.getElementById('manualNotes').value;

    try {
      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, memberId, date, status, notes })
      });

      if (res.ok) {
        showToast('Presensi manual berhasil disimpan', 'success');
        document.getElementById('modalManualAttendance').classList.add('hidden');
        await refreshAttendanceList();
        await loadServerInfo();
      }
    } catch (err) {
      showToast('Gagal menyimpan presensi manual', 'error');
    }
  });

  // Submit Form Tambah Member (Guru / Siswa)
  document.getElementById('formAddMember')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isStudent = STATE.activeMasterTab === 'student';
    const identifier = document.getElementById('addMemberIdentifier').value.trim();
    const name = document.getElementById('addMemberName').value.trim();
    const gender = document.getElementById('addMemberGender').value;
    const phone = document.getElementById('addMemberPhone').value.trim();

    let payload = {};
    let endpoint = '';

    if (isStudent) {
      endpoint = '/api/students';
      payload = {
        nis: identifier,
        name,
        class: document.getElementById('addMemberClass').value,
        gender,
        phone
      };
    } else {
      endpoint = '/api/teachers';
      payload = {
        nip: identifier,
        name,
        role: document.getElementById('addMemberRole').value.trim() || 'Guru Mata Pelajaran',
        gender,
        phone
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Gagal menyimpan data');
        return;
      }

      showToast(`Data ${isStudent ? 'Siswa' : 'Guru'} berhasil ditambahkan!`, 'success');
      document.getElementById('modalAddMember').classList.add('hidden');
      document.getElementById('formAddMember').reset();

      await loadData();
      renderMasterTable();
      renderCardsGrid();
      await loadServerInfo();
    } catch (err) {
      showToast('Gagal menyimpan anggota baru', 'error');
    }
  });

  // Submit Form Konfigurasi Sekolah
  document.getElementById('formSchoolConfig')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const configData = {
      schoolName: document.getElementById('cfgSchoolName').value,
      schoolAddress: document.getElementById('cfgSchoolAddress').value,
      checkInStart: document.getElementById('cfgCheckInStart').value,
      checkInLate: document.getElementById('cfgCheckInLate').value,
      checkOutStart: document.getElementById('cfgCheckOutStart').value,
      checkOutEnd: document.getElementById('cfgCheckOutEnd').value
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });
      if (res.ok) {
        showToast('Pengaturan jam sekolah berhasil disimpan!', 'success');
        await loadServerInfo();
      }
    } catch (e) {
      showToast('Gagal menyimpan pengaturan', 'error');
    }
  });
}
