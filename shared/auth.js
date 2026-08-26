// shared/auth.js
// Dipakai di semua halaman terproteksi (Dashboard, Directory, Hall of Fame, Tracker)

const API_URL = "https://script.google.com/macros/s/AKfycbyOp0tEIYlUKxh8T9c8_-7zE4FFjR2RZO1ixfUBCRbKTfUgFyQBMvGcL007n_GTzWdcVA/exec";

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

  try {
    const res = await fetch(`${API_URL}?action=verify&token=${encodeURIComponent(token)}`);
    const data = await res.json();

    if (!data.valid) {
      sessionStorage.removeItem("token");
      window.location.href = "../login.html";
      return null;
    }

    return {
      studentId: data.studentId,
      nama: data.nama,
      batch: data.batch,
    };
  } catch (err) {
    console.error("Gagal verifikasi login:", err);
    window.location.href = "../login.html";
    return null;
  }
}

function logout() {
  sessionStorage.removeItem("token");
  window.location.href = "../login.html";
}
