const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path data
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');

// Helper membaca dan menulis file JSON
function readJSON(file, defaultData = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return defaultData;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
}

// Inisialisasi data bawaan jika belum ada
function initDefaultData() {
  const defaultConfig = {
    schoolName: "SMA Negeri 1 Prestasi Nusantara",
    schoolAddress: "Jl. Pendidikan No. 45, Jakarta",
    schoolLogo: "https://cdn-icons-png.flaticon.com/512/2997/2997295.png",
    checkInStart: "06:00",
    checkInLate: "07:15",
    checkInEnd: "11:00",
    checkOutStart: "13:30",
    checkOutEnd: "18:00"
  };

  if (!fs.existsSync(CONFIG_FILE)) {
    writeJSON(CONFIG_FILE, defaultConfig);
  }

  const defaultTeachers = [
    {
      id: "G001",
      nip: "198001012005011001",
      name: "Drs. Budi Santoso, M.Pd",
      role: "Kepala Sekolah & Guru Fisika",
      phone: "081234567801",
      gender: "L",
      qrCode: "TEACHER_198001012005011001",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    },
    {
      id: "G002",
      nip: "198505122008012003",
      name: "Siti Rahmawati, S.Pd",
      role: "Wali Kelas X-A & Guru Matematika",
      phone: "081234567802",
      gender: "P",
      qrCode: "TEACHER_198505122008012003",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
    },
    {
      id: "G003",
      nip: "198903202012011004",
      name: "Ahmad Fauzi, S.Kom",
      role: "Guru Informatika & TIK",
      phone: "081234567803",
      gender: "L",
      qrCode: "TEACHER_198903202012011004",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    },
    {
      id: "G004",
      nip: "199207152016012005",
      name: "Dewi Lestari, M.Hum",
      role: "Guru Bahasa Indonesia",
      phone: "081234567804",
      gender: "P",
      qrCode: "TEACHER_199207152016012005",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
    },
    {
      id: "G005",
      nip: "199011112015011006",
      name: "Rizky Ramadhan, S.Pd",
      role: "Guru Pendidikan Jasmani & Olahraga",
      phone: "081234567805",
      gender: "L",
      qrCode: "TEACHER_199011112015011006",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
    }
  ];

  if (!fs.existsSync(TEACHERS_FILE)) {
    writeJSON(TEACHERS_FILE, defaultTeachers);
  }

  const defaultStudents = [
    { id: "S001", nis: "20261001", nisn: "0078123401", name: "Muhammad Alif Pratama", class: "X-A", gender: "L", phone: "085200000001", qrCode: "STUDENT_20261001" },
    { id: "S002", nis: "20261002", nisn: "0078123402", name: "Anisa Nur Fadilah", class: "X-A", gender: "P", phone: "085200000002", qrCode: "STUDENT_20261002" },
    { id: "S003", nis: "20261003", nisn: "0078123403", name: "Bagas Surya Kencana", class: "X-A", gender: "L", phone: "085200000003", qrCode: "STUDENT_20261003" },
    { id: "S004", nis: "20261004", nisn: "0078123404", name: "Clarissa Putri Ayuningtyas", class: "X-A", gender: "P", phone: "085200000004", qrCode: "STUDENT_20261004" },
    { id: "S005", nis: "20261005", nisn: "0078123405", name: "Dimas Aditya Wardhana", class: "X-A", gender: "L", phone: "085200000005", qrCode: "STUDENT_20261005" },
    { id: "S006", nis: "20261006", nisn: "0078123406", name: "Eva Rosalina", class: "X-A", gender: "P", phone: "085200000006", qrCode: "STUDENT_20261006" },
    { id: "S007", nis: "20261007", nisn: "0078123407", name: "Fajar Nugraha", class: "X-A", gender: "L", phone: "085200000007", qrCode: "STUDENT_20261007" },
    { id: "S008", nis: "20261008", nisn: "0078123408", name: "Gita Maharani", class: "X-A", gender: "P", phone: "085200000008", qrCode: "STUDENT_20261008" },
    
    { id: "S009", nis: "20262001", nisn: "0078123409", name: "Hafiz Maulana", class: "X-B", gender: "L", phone: "085200000009", qrCode: "STUDENT_20262001" },
    { id: "S010", nis: "20262002", nisn: "0078123410", name: "Intan Permatasari", class: "X-B", gender: "P", phone: "085200000010", qrCode: "STUDENT_20262002" },
    { id: "S011", nis: "20262003", nisn: "0078123411", name: "Jonathan Kevin", class: "X-B", gender: "L", phone: "085200000011", qrCode: "STUDENT_20262003" },
    { id: "S012", nis: "20262004", nisn: "0078123412", name: "Kurniawati Dewi", class: "X-B", gender: "P", phone: "085200000012", qrCode: "STUDENT_20262004" },

    { id: "S013", nis: "20251001", nisn: "0068123413", name: "Luthfi Hakim", class: "XI-IPA 1", gender: "L", phone: "085200000013", qrCode: "STUDENT_20251001" },
    { id: "S014", nis: "20251002", nisn: "0068123414", name: "Maya Salsabila", class: "XI-IPA 1", gender: "P", phone: "085200000014", qrCode: "STUDENT_20251002" },
    { id: "S015", nis: "20251003", nisn: "0068123415", name: "Naufal Zaidan", class: "XI-IPA 1", gender: "L", phone: "085200000015", qrCode: "STUDENT_20251003" },

    { id: "S016", nis: "20241001", nisn: "0058123416", name: "Putri Anggraini", class: "XII-MIPA", gender: "P", phone: "085200000016", qrCode: "STUDENT_20241001" },
    { id: "S017", nis: "20241002", nisn: "0058123417", name: "Rendra Danuarta", class: "XII-MIPA", gender: "L", phone: "085200000017", qrCode: "STUDENT_20241002" },
    { id: "S018", nis: "20241003", nisn: "0058123418", name: "Siti Nurhaliza", class: "XII-IPS", gender: "P", phone: "085200000018", qrCode: "STUDENT_20241003" }
  ];

  if (!fs.existsSync(STUDENTS_FILE)) {
    writeJSON(STUDENTS_FILE, defaultStudents);
  }

  // Attendance awal (hari ini)
  const todayStr = getTodayDateString();
  if (!fs.existsSync(ATTENDANCE_FILE)) {
    const sampleAttendance = [
      {
        id: "att_init_1",
        type: "teacher",
        memberId: "G001",
        identifier: "198001012005011001",
        name: "Drs. Budi Santoso, M.Pd",
        subInfo: "Kepala Sekolah",
        date: todayStr,
        checkInTime: "06:45:10",
        checkOutTime: null,
        status: "Hadir",
        method: "QR_CARD_SCAN",
        notes: "Tepat Waktu"
      },
      {
        id: "att_init_2",
        type: "teacher",
        memberId: "G002",
        identifier: "198505122008012003",
        name: "Siti Rahmawati, S.Pd",
        subInfo: "Wali Kelas X-A",
        date: todayStr,
        checkInTime: "06:55:40",
        checkOutTime: null,
        status: "Hadir",
        method: "QR_CARD_SCAN",
        notes: "Tepat Waktu"
      },
      {
        id: "att_init_3",
        type: "student",
        memberId: "S001",
        identifier: "20261001",
        name: "Muhammad Alif Pratama",
        subInfo: "X-A",
        date: todayStr,
        checkInTime: "07:02:15",
        checkOutTime: null,
        status: "Hadir",
        method: "QR_CARD_SCAN",
        notes: "Tepat Waktu"
      },
      {
        id: "att_init_4",
        type: "student",
        memberId: "S002",
        identifier: "20261002",
        name: "Anisa Nur Fadilah",
        subInfo: "X-A",
        date: todayStr,
        checkInTime: "07:22:05",
        checkOutTime: null,
        status: "Terlambat",
        method: "QR_CARD_SCAN",
        notes: "Terlambat 7 menit"
      }
    ];
    writeJSON(ATTENDANCE_FILE, sampleAttendance);
  }
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTimeString() {
  const now = new Date();
  return now.toTimeString().split(' ')[0]; // HH:mm:ss
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

initDefaultData();

// ================= API ENDPOINTS =================

// 1. INFO SERVER & KONFIGURASI
app.get('/api/info', async (req, res) => {
  const localIp = getLocalIpAddress();
  const localUrl = `http://${localIp}:${PORT}`;
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(localUrl, { margin: 1, width: 220 });
  } catch (e) {
    console.error('Failed to generate IP QR code:', e);
  }

  const config = readJSON(CONFIG_FILE);
  const teachers = readJSON(TEACHERS_FILE);
  const students = readJSON(STUDENTS_FILE);
  const attendance = readJSON(ATTENDANCE_FILE);
  const today = getTodayDateString();
  const todayAttendance = attendance.filter(a => a.date === today);

  const teacherPresent = todayAttendance.filter(a => a.type === 'teacher' && (a.status === 'Hadir' || a.status === 'Terlambat')).length;
  const studentPresent = todayAttendance.filter(a => a.type === 'student' && (a.status === 'Hadir' || a.status === 'Terlambat')).length;
  const studentLate = todayAttendance.filter(a => a.type === 'student' && a.status === 'Terlambat').length;
  const teacherLate = todayAttendance.filter(a => a.type === 'teacher' && a.status === 'Terlambat').length;

  res.json({
    status: 'online',
    serverTime: new Date().toISOString(),
    today,
    localIp,
    localUrl,
    ipQrCode: qrCodeDataUrl,
    config,
    stats: {
      totalTeachers: teachers.length,
      totalStudents: students.length,
      teacherPresent,
      studentPresent,
      studentLate,
      teacherLate,
      totalTodayLogs: todayAttendance.length
    }
  });
});

// 2. CONFIGURATION
app.get('/api/config', (req, res) => {
  res.json(readJSON(CONFIG_FILE));
});

app.post('/api/config', (req, res) => {
  const current = readJSON(CONFIG_FILE);
  const updated = { ...current, ...req.body };
  writeJSON(CONFIG_FILE, updated);
  res.json({ success: true, config: updated });
});

// 3. TEACHERS (GURU)
app.get('/api/teachers', (req, res) => {
  res.json(readJSON(TEACHERS_FILE));
});

app.post('/api/teachers', (req, res) => {
  const teachers = readJSON(TEACHERS_FILE);
  const { nip, name, role, phone, gender } = req.body;
  if (!nip || !name) {
    return res.status(400).json({ error: 'NIP dan Nama wajib diisi' });
  }

  // Cek duplikasi NIP
  if (teachers.some(t => t.nip === nip)) {
    return res.status(400).json({ error: 'Guru dengan NIP tersebut sudah terdaftar' });
  }

  const newTeacher = {
    id: `G${String(teachers.length + 1).padStart(3, '0')}_${Date.now().toString().slice(-4)}`,
    nip,
    name,
    role: role || 'Guru Mata Pelajaran',
    phone: phone || '-',
    gender: gender || 'L',
    qrCode: `TEACHER_${nip}`
  };

  teachers.push(newTeacher);
  writeJSON(TEACHERS_FILE, teachers);
  res.json({ success: true, teacher: newTeacher });
});

app.put('/api/teachers/:id', (req, res) => {
  const teachers = readJSON(TEACHERS_FILE);
  const index = teachers.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Guru tidak ditemukan' });

  teachers[index] = { ...teachers[index], ...req.body };
  if (req.body.nip) {
    teachers[index].qrCode = `TEACHER_${req.body.nip}`;
  }
  writeJSON(TEACHERS_FILE, teachers);
  res.json({ success: true, teacher: teachers[index] });
});

app.delete('/api/teachers/:id', (req, res) => {
  let teachers = readJSON(TEACHERS_FILE);
  teachers = teachers.filter(t => t.id !== req.params.id);
  writeJSON(TEACHERS_FILE, teachers);
  res.json({ success: true });
});

// 4. STUDENTS (SISWA)
app.get('/api/students', (req, res) => {
  const students = readJSON(STUDENTS_FILE);
  const { class: className } = req.query;
  if (className && className !== 'ALL') {
    return res.json(students.filter(s => s.class === className));
  }
  res.json(students);
});

app.post('/api/students', (req, res) => {
  const students = readJSON(STUDENTS_FILE);
  const { nis, nisn, name, class: className, gender, phone } = req.body;
  if (!nis || !name || !className) {
    return res.status(400).json({ error: 'NIS, Nama, dan Kelas wajib diisi' });
  }

  if (students.some(s => s.nis === nis)) {
    return res.status(400).json({ error: 'Siswa dengan NIS tersebut sudah terdaftar' });
  }

  const newStudent = {
    id: `S${String(students.length + 1).padStart(3, '0')}_${Date.now().toString().slice(-4)}`,
    nis,
    nisn: nisn || '-',
    name,
    class: className,
    gender: gender || 'L',
    phone: phone || '-',
    qrCode: `STUDENT_${nis}`
  };

  students.push(newStudent);
  writeJSON(STUDENTS_FILE, students);
  res.json({ success: true, student: newStudent });
});

app.put('/api/students/:id', (req, res) => {
  const students = readJSON(STUDENTS_FILE);
  const index = students.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

  students[index] = { ...students[index], ...req.body };
  if (req.body.nis) {
    students[index].qrCode = `STUDENT_${req.body.nis}`;
  }
  writeJSON(STUDENTS_FILE, students);
  res.json({ success: true, student: students[index] });
});

app.delete('/api/students/:id', (req, res) => {
  let students = readJSON(STUDENTS_FILE);
  students = students.filter(s => s.id !== req.params.id);
  writeJSON(STUDENTS_FILE, students);
  res.json({ success: true });
});

// 5. ATTENDANCE (PRESENSI)
app.get('/api/attendance', (req, res) => {
  const attendance = readJSON(ATTENDANCE_FILE);
  const { date, type, class: className, status } = req.query;
  const targetDate = date || getTodayDateString();

  let filtered = attendance.filter(a => a.date === targetDate);

  if (type && type !== 'all') {
    filtered = filtered.filter(a => a.type === type);
  }

  if (className && className !== 'ALL') {
    filtered = filtered.filter(a => a.subInfo === className);
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter(a => a.status === status);
  }

  // Urutkan paling baru di atas
  filtered.sort((a, b) => (b.checkInTime || '').localeCompare(a.checkInTime || ''));
  res.json(filtered);
});

// 6. PROSES SCAN QR UTAMA
app.post('/api/attendance/scan', async (req, res) => {
  const { qrData, actionOverride } = req.body;
  if (!qrData) {
    return res.status(400).json({ success: false, message: 'Data QR tidak boleh kosong' });
  }

  const rawCode = String(qrData).trim();
  const config = readJSON(CONFIG_FILE);
  const teachers = readJSON(TEACHERS_FILE);
  const students = readJSON(STUDENTS_FILE);
  const attendance = readJSON(ATTENDANCE_FILE);

  const today = getTodayDateString();
  const nowTime = getCurrentTimeString(); // "HH:mm:ss"
  const nowHourMin = nowTime.slice(0, 5); // "HH:mm"

  let member = null;
  let type = '';

  // Mode 1: Kartu Guru atau Siswa
  if (rawCode.startsWith('TEACHER_')) {
    const nip = rawCode.replace('TEACHER_', '');
    member = teachers.find(t => t.nip === nip || t.qrCode === rawCode);
    type = 'teacher';
  } else if (rawCode.startsWith('STUDENT_')) {
    const nis = rawCode.replace('STUDENT_', '');
    member = students.find(s => s.nis === nis || s.qrCode === rawCode);
    type = 'student';
  } else if (rawCode.startsWith('SESI_')) {
    // QR Sesi Sekolah yang discan oleh Siswa/Guru dari HP
    // Format: SESI_MASUK_<DATE> atau SESI_PULANG_<DATE> atau SESI_KELAS_<CLASS>
    return res.json({
      success: true,
      isSessionQR: true,
      sessionData: rawCode,
      message: 'QR Sesi Terdeteksi. Pilih identitas Anda untuk mencatat kehadiran.'
    });
  } else {
    // Coba cari langsung berdasarkan NIS / NIP atau ID
    member = teachers.find(t => t.nip === rawCode || t.id === rawCode);
    if (member) {
      type = 'teacher';
    } else {
      member = students.find(s => s.nis === rawCode || s.id === rawCode);
      if (member) {
        type = 'student';
      }
    }
  }

  if (!member) {
    return res.status(404).json({
      success: false,
      message: `Kode QR "${rawCode}" tidak terdaftar dalam sistem sekolah.`
    });
  }

  const memberId = member.id;
  const identifier = type === 'teacher' ? member.nip : member.nis;
  const name = member.name;
  const subInfo = type === 'teacher' ? member.role : member.class;

  // Cek apakah sudah pernah absen hari ini
  let existing = attendance.find(a => a.date === today && a.memberId === memberId);

  // Tentukan apakah ini Check-in (Masuk) atau Check-out (Pulang)
  const isLate = nowHourMin > config.checkInLate;
  const statusAttendance = isLate ? 'Terlambat' : 'Hadir';

  if (!existing) {
    // Catat Absen MASUK
    const newLog = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      memberId,
      identifier,
      name,
      subInfo,
      date: today,
      checkInTime: nowTime,
      checkOutTime: null,
      status: statusAttendance,
      method: 'QR_CARD_SCAN',
      notes: isLate ? `Terlambat (Lewat dari ${config.checkInLate})` : 'Tepat Waktu'
    };

    attendance.push(newLog);
    writeJSON(ATTENDANCE_FILE, attendance);

    return res.json({
      success: true,
      action: 'MASUK',
      person: {
        id: memberId,
        identifier,
        name,
        type: type === 'teacher' ? 'Guru / Tenaga Pendidik' : 'Siswa',
        subInfo,
        avatar: member.avatar || null
      },
      log: newLog,
      message: `✅ Absen MASUK Berhasil! Selamat datang, ${name}. Status: ${statusAttendance} (${nowTime})`
    });
  } else {
    // Sudah ada catatan Masuk
    if (actionOverride === 'FORCE_PULANG' || !existing.checkOutTime) {
      // Catat Jam Pulang
      // Batasi agar tidak langsung tercatat pulang jika baru saja absen dalam waktu 3 menit
      const [hIn, mIn] = existing.checkInTime.split(':').map(Number);
      const [hNow, mNow] = nowTime.split(':').map(Number);
      const diffMinutes = (hNow * 60 + mNow) - (hIn * 60 + mIn);

      if (diffMinutes < 3 && actionOverride !== 'FORCE_PULANG') {
        return res.json({
          success: true,
          action: 'ALREADY_IN',
          alreadyRecorded: true,
          person: {
            id: memberId,
            identifier,
            name,
            subInfo
          },
          log: existing,
          message: `ℹ️ ${name} sudah absen masuk hari ini pada pukul ${existing.checkInTime}.`
        });
      }

      existing.checkOutTime = nowTime;
      existing.method = `${existing.method}+QR_PULANG`;
      writeJSON(ATTENDANCE_FILE, attendance);

      return res.json({
        success: true,
        action: 'PULANG',
        person: {
          id: memberId,
          identifier,
          name,
          type: type === 'teacher' ? 'Guru / Tenaga Pendidik' : 'Siswa',
          subInfo,
          avatar: member.avatar || null
        },
        log: existing,
        message: `🏁 Absen PULANG Berhasil! Terima kasih, ${name}. Waktu pulang: ${nowTime}`
      });
    } else {
      return res.json({
        success: true,
        action: 'COMPLETE',
        alreadyRecorded: true,
        person: {
          id: memberId,
          identifier,
          name,
          subInfo
        },
        log: existing,
        message: `ℹ️ ${name} sudah lengkap absen Masuk (${existing.checkInTime}) dan Pulang (${existing.checkOutTime}).`
      });
    }
  }
});

// 7. INPUT / UPDATE MANUAL PRESENSI (IZIN, SAKIT, ALPA)
app.post('/api/attendance/manual', (req, res) => {
  const { memberId, type, date, status, notes } = req.body;
  if (!memberId || !type || !status) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }

  const teachers = readJSON(TEACHERS_FILE);
  const students = readJSON(STUDENTS_FILE);
  const attendance = readJSON(ATTENDANCE_FILE);

  let member = null;
  if (type === 'teacher') {
    member = teachers.find(t => t.id === memberId || t.nip === memberId);
  } else {
    member = students.find(s => s.id === memberId || s.nis === memberId);
  }

  if (!member) {
    return res.status(404).json({ error: 'Orang tidak ditemukan' });
  }

  const targetDate = date || getTodayDateString();
  const identifier = type === 'teacher' ? member.nip : member.nis;
  const name = member.name;
  const subInfo = type === 'teacher' ? member.role : member.class;

  let existing = attendance.find(a => a.date === targetDate && a.memberId === member.id);

  if (existing) {
    existing.status = status;
    existing.notes = notes || existing.notes || '';
    if (status === 'Sakit' || status === 'Izin' || status === 'Alpa') {
      existing.checkInTime = '-';
      existing.checkOutTime = '-';
    }
    writeJSON(ATTENDANCE_FILE, attendance);
    return res.json({ success: true, log: existing });
  } else {
    const newLog = {
      id: `att_man_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      memberId: member.id,
      identifier,
      name,
      subInfo,
      date: targetDate,
      checkInTime: (status === 'Hadir' || status === 'Terlambat') ? getCurrentTimeString() : '-',
      checkOutTime: null,
      status,
      method: 'MANUAL',
      notes: notes || '-'
    };
    attendance.push(newLog);
    writeJSON(ATTENDANCE_FILE, attendance);
    return res.json({ success: true, log: newLog });
  }
});

// 8. HAPUS LOG PRESENSI
app.delete('/api/attendance/:id', (req, res) => {
  let attendance = readJSON(ATTENDANCE_FILE);
  attendance = attendance.filter(a => a.id !== req.params.id);
  writeJSON(ATTENDANCE_FILE, attendance);
  res.json({ success: true });
});

// 9. DYNAMIC BROADCAST SESSION QR (Untuk Ditampilkan di Proyektor Layar Sekolah)
app.get('/api/session/current', async (req, res) => {
  const { sessionType, targetClass } = req.query; // 'MASUK', 'PULANG', 'KELAS'
  const today = getTodayDateString();
  const sessionToken = `SESI_${sessionType || 'MASUK'}_${targetClass || 'ALL'}_${today}_${Math.floor(Date.now() / 60000)}`; // ganti tiap menit

  try {
    const qrDataUrl = await QRCode.toDataURL(sessionToken, {
      margin: 2,
      width: 380,
      color: {
        dark: '#1e3a8a',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      token: sessionToken,
      qrDataUrl,
      today,
      type: sessionType || 'MASUK',
      class: targetClass || 'ALL',
      expiresIn: 60 - (Math.floor(Date.now() / 1000) % 60) // sisa detik
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat QR Sesi' });
  }
});

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`\n======================================================`);
  console.log(`🚀 Aplikasi Presensi QR Guru & Siswa Siap Digunakan!`);
  console.log(`------------------------------------------------------`);
  console.log(`💻 Akses di Laptop/Komputer : http://localhost:${PORT}`);
  console.log(`📱 Akses di HP (Jaringan WiFi): http://${localIp}:${PORT}`);
  console.log(`======================================================\n`);
});
