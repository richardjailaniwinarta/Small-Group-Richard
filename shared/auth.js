// shared/auth.js
// Dipakai di semua halaman terproteksi (Dashboard, Directory, Hall of Fame, Tracker)

const API_URL = "https://sgr-backend.richweinz27.workers.dev";

// Cache singkat hasil verifikasi, supaya pindah antar halaman (Dashboard <->
// Directory <-> Task Tracker <-> Hall of Fame) tidak perlu menghubungi ulang
// Apps Script setiap kali — cukup dalam jendela waktu ini.
const SESSION_CACHE_KEY = "sgr_session_cache";
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit — boleh diubah sesuai kebutuhan

// Student ID yang dianggap Admin. Tambahkan ID lain ke array ini kalau
// ada admin/mentor baru. Dipakai bareng di semua halaman (Dashboard,
// Directory, Task Tracker, Hall of Fame) untuk menampilkan kontrol
// tambahan khusus admin (pilih batch/student bebas).
const ADMIN_STUDENT_IDS = ["10000001000"];

function isAdminSession(session) {
  return !!session && ADMIN_STUDENT_IDS.includes(String(session.studentId).trim());
}

function getCachedSession(token) {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.token !== token) return null; // token beda -> cache tidak valid
    if (Date.now() - parsed.ts > SESSION_CACHE_TTL_MS) return null; // sudah kadaluarsa
    return parsed.session;
  } catch (e) {
    return null;
  }
}

function setCachedSession(token, session) {
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ token, ts: Date.now(), session }));
  } catch (e) {
    // storage penuh/diblok -> abaikan, tidak fatal
  }
}

/**
 * Cek token login yang tersimpan di sessionStorage.
 * Kalau valid -> resolve dengan { studentId, nama, batch }
 * Kalau tidak valid / tidak ada -> otomatis redirect ke halaman login
 */
async function checkLogin() {
  const token = sessionStorage.getItem("token");

  if (!token) {
    window.location.href = "../login.html";
    return null;
  }

  // Pakai cache dulu kalau masih segar -> lompati panggilan ke Apps Script sama sekali
  const cached = getCachedSession(token);
  if (cached) {
    // Jaga-jaga kalau ada cache lama (sebelum fitur admin ditambahkan) yang
    // belum punya field isAdmin.
    if (cached.isAdmin === undefined) cached.isAdmin = isAdminSession(cached);
    return cached;
  }

  try {
    const res = await fetch(`${API_URL}/verify?token=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (!data.valid) {
      sessionStorage.removeItem("token");
      window.location.href = "../login.html";
      return null;
    }

    const session = {
      studentId: data.studentId,
      nama: data.nama,
      batch: data.batch,
    };
    session.isAdmin = isAdminSession(session);
    setCachedSession(token, session);
    return session;
  } catch (err) {
    console.error("Gagal verifikasi login:", err);
    window.location.href = "../login.html";
    return null;
  }
}

function logout() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem(SESSION_CACHE_KEY);
  sessionStorage.removeItem(ADMIN_VIEW_KEY);
  window.location.href = "../login.html";
}

// ============ ADMIN "SEDANG MENINJAU" STATE ============
// Dipakai supaya ketika Admin search seorang Student di satu halaman
// (Dashboard/Task Tracker/dst), lalu pindah ke halaman lain, halaman
// tsb bisa otomatis menampilkan Student yang sama tanpa perlu search ulang.
// Cukup simpan ID + nama + batch (bukan seluruh data), tiap halaman
// tetap fetch datanya sendiri-sendiri supaya selalu fresh.
const ADMIN_VIEW_KEY = "sgr_admin_viewing";

function setAdminViewing(studentId, nama, batch) {
  try {
    sessionStorage.setItem(
      ADMIN_VIEW_KEY,
      JSON.stringify({ studentId: String(studentId || "").trim(), nama: nama || "", batch: batch || "" })
    );
  } catch (e) {
    // storage penuh/diblok -> abaikan, tidak fatal
  }
}

function getAdminViewing() {
  try {
    const raw = sessionStorage.getItem(ADMIN_VIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.studentId) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function clearAdminViewing() {
  try {
    sessionStorage.removeItem(ADMIN_VIEW_KEY);
  } catch (e) {
    // storage penuh/diblok -> abaikan, tidak fatal
  }
}