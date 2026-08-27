// shared/auth.js
// Dipakai di semua halaman terproteksi (Dashboard, Directory, Hall of Fame, Tracker)

const API_URL = "https://script.google.com/macros/s/AKfycbyOp0tEIYlUKxh8T9c8_-7zE4FFjR2RZO1ixfUBCRbKTfUgFyQBMvGcL007n_GTzWdcVA/exec";

// Cache singkat hasil verifikasi, supaya pindah antar halaman (Dashboard <->
// Directory <-> Task Tracker <-> Hall of Fame) tidak perlu menghubungi ulang
// Apps Script setiap kali — cukup dalam jendela waktu ini.
const SESSION_CACHE_KEY = "sgr_session_cache";
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit — boleh diubah sesuai kebutuhan

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
  if (cached) return cached;

  try {
    const res = await fetch(`${API_URL}?action=verify&token=${encodeURIComponent(token)}`);
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
  window.location.href = "../login.html";
}