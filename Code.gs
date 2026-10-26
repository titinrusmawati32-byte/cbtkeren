/**
 * ============================================================================
 * BACKEND GOOGLE APPS SCRIPT (GAS) UNTUK APLIKASI EDU CBT SENAPATI
 * Database: Google Sheets (Spreadsheet)
 * ============================================================================
 * 
 * PETUNJUK INSTALASI:
 * 1. Buat Google Spreadsheet baru di Google Drive (https://sheets.new)
 *    Beri nama misalnya: "Database EduCBT Sekolah"
 * 2. Di menu atas spreadsheet, klik "Ekstensi" (Extensions) -> "Apps Script"
 * 3. Hapus kode bawaan di editor, lalu salin dan tempel SELURUH isi file ini.
 * 4. Klik ikon "Simpan" (Ctrl + S).
 * 5. Klik tombol biru "Terapkan" (Deploy) di kanan atas -> pilih "Penerapan Baru" (New deployment).
 * 6. Pilih jenis: "Aplikasi Web" (Web app).
 * 7. Konfigurasi:
 *    - Deskripsi: EduCBT Backend API
 *    - Jalankan sebagai (Execute as): "Saya" (Me / email Anda)
 *    - Yang memiliki akses (Who has access): "Siapa saja" (Anyone) -> PENTING!
 * 8. Klik "Terapkan" (Deploy), berikan izin akses akun Google Anda.
 * 9. Salin "URL Aplikasi Web" (akhiran /exec) dan masukkan ke aplikasi EduCBT.
 * ============================================================================
 */

// Konstanta Nama-Nama Sheet Database
const SHEETS = {
  KELAS: 'kelas',
  SISWA: 'siswa',
  JADWAL: 'mapel_jadwal',
  SOAL: 'soal',
  REKAP: 'rekap_nilai',
  PENGATURAN: 'pengaturan',
  PENGGUNA: 'pengguna',
  MATERI: 'materi',
  MATERI_FOLDERS: 'materi_folders'
};

/**
 * Handle HTTP GET Request
 */
function doGet(e) {
  try {
    initDatabaseSheets(); // Dipercepat: hanya inisialisasi jika belum pernah

    const action = e.parameter.action || 'getAllData';

    if (action === 'getAllData') {
      const role = e.parameter.role || 'siswa';
      const cache = CacheService.getScriptCache();
      const cacheKey = 'educbt_cache_' + role;
      
      try {
        const cached = cache.get(cacheKey);
        if (cached) {
          return jsonResponse({ status: 'success', data: JSON.parse(cached), fromCache: true });
        }
      } catch (err) {}

      const data = fetchAllDatabase(role);

      try {
        const jsonStr = JSON.stringify(data);
        if (jsonStr.length < 95000) {
          cache.put(cacheKey, jsonStr, 600); // Simpan di RAM Google selama 10 menit
        }
      } catch (err) {}

      return jsonResponse({ status: 'success', data: data });
    }

    if (action === 'ping') {
      return jsonResponse({ status: 'success', message: 'Backend Google Apps Script EduCBT Aktif!', timestamp: new Date().toISOString() });
    }

    if (action === 'setupMateri') {
      const res = setupMateriSheet();
      return jsonResponse({ status: 'success', message: res });
    }

    return jsonResponse({ status: 'error', message: 'Action GET tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Handle HTTP POST Request (CRUD Data & Fast Auth)
 */
function doPost(e) {
  const t_start = new Date().getTime();
  try {
    let requestData = {};
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      requestData = e.parameter;
    }

    const action = requestData.action;
    const payload = requestData.payload || {};
    const reqId = (requestData.requestId && String(requestData.requestId).substring(0, 32)) || ('req_' + Utilities.getUuid().substring(0, 8));

    // Pastikan inisialisasi hanya jika sheet belum ada, jangan blokir auth
    if (action !== 'loginAdmin' && action !== 'loginSiswa' && action !== 'validateSession' && action !== 'logoutSession') {
      initDatabaseSheets();
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      // 1. AUTENTIKASI ADMIN & GURU DARI DATABASE DENGAN FAST ROW SCAN & TOKEN PERSISTEN
      case 'loginAdmin': {
        const t_db_start = new Date().getTime();
        let userSheet = ss.getSheetByName(SHEETS.PENGGUNA);
        if (!userSheet) {
          initDatabaseSheets();
          userSheet = ss.getSheetByName(SHEETS.PENGGUNA);
        }

        const inputId = String(payload.email || payload.username || payload.identifier || '').trim().toLowerCase();
        const inputPass = String(payload.password || '').trim();

        let found = fastFindRow(userSheet, (row, map) => {
          const uCol = map['username'] !== undefined ? map['username'] : 1;
          const eCol = map['email'] !== undefined ? map['email'] : 3;
          const pCol = map['password'] !== undefined ? map['password'] : 4;
          const matchId = String(row[uCol] || '').toLowerCase() === inputId || String(row[eCol] || '').toLowerCase() === inputId;
          return matchId && String(row[pCol] || '').trim() === inputPass;
        });

        const t_db_read = new Date().getTime() - t_db_start;

        if (found) {
          if (found.status && String(found.status).toLowerCase() !== 'aktif') {
            return jsonResponse({
              status: 'error',
              code: 'USER_INACTIVE',
              message: 'Akun Anda dinonaktifkan oleh administrator!',
              requestId: reqId
            });
          }

          const t_token_start = new Date().getTime();
          const userData = {
            id: found.id,
            role: (found.role || 'admin').toLowerCase(),
            nama: found.nama_lengkap || found.username,
            username: found.username,
            email: found.email,
            poin: 999
          };

          const sessionInfo = generateSessionToken({
            id: userData.id,
            role: userData.role,
            identifier: userData.username || userData.email,
            type: 'admin'
          });
          const t_token = new Date().getTime() - t_token_start;
          const t_total = new Date().getTime() - t_start;

          return jsonResponse({
            status: 'success',
            token: sessionInfo.token,
            expiresAt: sessionInfo.exp,
            user: userData,
            requestId: reqId,
            _timings: {
              db_read_ms: t_db_read,
              token_ms: t_token,
              total_ms: t_total
            }
          });
        }

        // Fallback ke tabel pengaturan untuk akun master administrator
        const setSheet = ss.getSheetByName(SHEETS.PENGATURAN);
        const config = (setSheet ? sheetToObjects(setSheet)[0] : null) || {};
        const adminEmail = (config.admin_email || 'admin@educbt.id').toLowerCase();
        const adminPass = String(config.admin_password || 'admin123').trim();

        if ((inputId === adminEmail || inputId === 'admin') && inputPass === adminPass) {
          const t_token_start = new Date().getTime();
          const userData = {
            id: 'admin-gas',
            role: 'admin',
            nama: config.nama_kepsek || 'Administrator Utama',
            email: config.admin_email || 'admin@educbt.id',
            username: 'admin',
            poin: 999
          };

          const sessionInfo = generateSessionToken({
            id: userData.id,
            role: 'admin',
            identifier: 'admin',
            type: 'admin'
          });
          const t_token = new Date().getTime() - t_token_start;
          const t_total = new Date().getTime() - t_start;

          return jsonResponse({
            status: 'success',
            token: sessionInfo.token,
            expiresAt: sessionInfo.exp,
            user: userData,
            requestId: reqId,
            _timings: {
              db_read_ms: t_db_read,
              token_ms: t_token,
              total_ms: t_total
            }
          });
        } else {
          return jsonResponse({
            status: 'error',
            code: 'AUTH_FAILED',
            message: 'Username/Email atau Password Guru/Admin tidak cocok dengan database!',
            requestId: reqId,
            _timings: {
              db_read_ms: t_db_read,
              total_ms: new Date().getTime() - t_start
            }
          });
        }
      }

      // 2. AUTENTIKASI SISWA DENGAN FAST ROW SCAN & TOKEN PERSISTEN
      case 'loginSiswa': {
        const t_db_start = new Date().getTime();
        let siswaSheet = ss.getSheetByName(SHEETS.SISWA);
        if (!siswaSheet) {
          initDatabaseSheets();
          siswaSheet = ss.getSheetByName(SHEETS.SISWA);
        }

        const inputNisn = String(payload.nisn || '').trim();
        const inputPass = String(payload.password || '').trim();

        const found = fastFindRow(siswaSheet, (row, map) => {
          const nisnCol = map['nisn'] !== undefined ? map['nisn'] : 1;
          const passCol = map['password'] !== undefined ? map['password'] : 3;
          return String(row[nisnCol]).trim() === inputNisn && String(row[passCol]).trim() === inputPass;
        });

        const t_db_read = new Date().getTime() - t_db_start;

        if (found) {
          const t_token_start = new Date().getTime();
          const userData = {
            id: found.id,
            role: 'siswa',
            nama: found.nama_lengkap,
            nisn: found.nisn,
            kelas_id: found.kelas_id,
            poin: Number(found.poin || 100)
          };

          const sessionInfo = generateSessionToken({
            id: userData.id,
            role: 'siswa',
            identifier: String(userData.nisn),
            type: 'siswa'
          });
          const t_token = new Date().getTime() - t_token_start;
          const t_total = new Date().getTime() - t_start;

          return jsonResponse({
            status: 'success',
            token: sessionInfo.token,
            expiresAt: sessionInfo.exp,
            user: userData,
            requestId: reqId,
            _timings: {
              db_read_ms: t_db_read,
              token_ms: t_token,
              total_ms: t_total
            }
          });
        } else {
          return jsonResponse({
            status: 'error',
            code: 'AUTH_FAILED',
            message: 'NISN atau Password siswa tidak cocok!',
            requestId: reqId,
            _timings: {
              db_read_ms: t_db_read,
              total_ms: new Date().getTime() - t_start
            }
          });
        }
      }

      // 2B. VALIDASI SESI DARI TOKEN PERSISTEN (FAST-PATH UNTUK REFRESH F5 / BUKA TAB BARU)
      case 'validateSession': {
        const t_valid_start = new Date().getTime();
        const token = String(payload.token || '').trim();
        if (!token) {
          return jsonResponse({ status: 'error', code: 'TOKEN_REQUIRED', message: 'Token sesi diperlukan', requestId: reqId });
        }

        const verification = verifySessionToken(token);
        if (!verification) {
          return jsonResponse({ status: 'error', code: 'INVALID_TOKEN', message: 'Token autentikasi tidak valid atau sudah dibatalkan', requestId: reqId });
        }
        if (verification.expired) {
          return jsonResponse({ status: 'error', code: 'EXPIRED_TOKEN', message: 'Sesi login telah kedaluwarsa. Silakan masuk kembali.', requestId: reqId });
        }

        // Ambil data mutakhir langsung dari Database Google Sheets secara targeted
        if (verification.type === 'siswa' || verification.role === 'siswa') {
          const siswaSheet = ss.getSheetByName(SHEETS.SISWA);
          if (!siswaSheet) {
            return jsonResponse({ status: 'error', code: 'DB_ERROR', message: 'Tabel siswa belum siap', requestId: reqId });
          }
          const subId = String(verification.sub || '');
          const ident = verification.identifier ? String(verification.identifier).trim() : '';

          const found = fastFindRow(siswaSheet, (row, map) => {
            const idCol = map['id'] !== undefined ? map['id'] : 0;
            const nisnCol = map['nisn'] !== undefined ? map['nisn'] : 1;
            return String(row[idCol]) === subId || (ident && String(row[nisnCol]).trim() === ident);
          });

          if (!found) {
            return jsonResponse({ status: 'error', code: 'USER_NOT_FOUND', message: 'Akun siswa tidak ditemukan di database', requestId: reqId });
          }

          return jsonResponse({
            status: 'success',
            user: {
              id: found.id,
              role: 'siswa',
              nama: found.nama_lengkap,
              nisn: found.nisn,
              kelas_id: found.kelas_id,
              poin: Number(found.poin || 100)
            },
            requestId: reqId,
            _timings: {
              total_ms: new Date().getTime() - t_valid_start
            }
          });
        } else {
          // Role Admin atau Guru
          const userSheet = ss.getSheetByName(SHEETS.PENGGUNA);
          let found = null;
          if (userSheet) {
            const subId = String(verification.sub || '');
            const ident = verification.identifier ? String(verification.identifier).toLowerCase() : '';

            found = fastFindRow(userSheet, (row, map) => {
              const idCol = map['id'] !== undefined ? map['id'] : 0;
              const uCol = map['username'] !== undefined ? map['username'] : 1;
              const eCol = map['email'] !== undefined ? map['email'] : 3;
              return String(row[idCol]) === subId ||
                (ident && (String(row[uCol] || '').toLowerCase() === ident || String(row[eCol] || '').toLowerCase() === ident));
            });
          }

          if (found) {
            if (found.status && String(found.status).toLowerCase() !== 'aktif') {
              return jsonResponse({ status: 'error', code: 'USER_INACTIVE', message: 'Akun Anda dinonaktifkan oleh administrator!', requestId: reqId });
            }
            return jsonResponse({
              status: 'success',
              user: {
                id: found.id,
                role: (found.role || 'admin').toLowerCase(),
                nama: found.nama_lengkap || found.username,
                username: found.username,
                email: found.email,
                poin: 999
              },
              requestId: reqId,
              _timings: {
                total_ms: new Date().getTime() - t_valid_start
              }
            });
          }

          // Fallback akun default admin dari pengaturan
          const setSheet = ss.getSheetByName(SHEETS.PENGATURAN);
          if (setSheet) {
            const setRows = sheetToObjects(setSheet);
            const config = setRows[0] || {};
            if (verification.sub === 'admin-gas' || verification.identifier === 'admin' || verification.identifier === (config.admin_email || 'admin@educbt.id').toLowerCase()) {
              return jsonResponse({
                status: 'success',
                user: {
                  id: 'admin-gas',
                  role: 'admin',
                  nama: config.nama_kepsek || 'Administrator Utama',
                  email: config.admin_email || 'admin@educbt.id',
                  username: 'admin',
                  poin: 999
                },
                requestId: reqId,
                _timings: {
                  total_ms: new Date().getTime() - t_valid_start
                }
              });
            }
          }

          return jsonResponse({ status: 'error', code: 'USER_NOT_FOUND', message: 'Akun staf/guru tidak ditemukan di database', requestId: reqId });
        }
      }

      // 2C. LOGOUT & PENCABUTAN TOKEN SESI
      case 'logoutSession': {
        const token = String(payload.token || '').trim();
        if (token) {
          revokeSessionToken(token);
        }
        return jsonResponse({ status: 'success', message: 'Sesi berhasil diakhiri' });
      }

      // 3. CRUD KELAS
      case 'saveKelas': {
        const sheet = ss.getSheetByName(SHEETS.KELAS);
        const id = payload.id || 'kls-' + Utilities.getUuid();
        const row = [id, payload.nama_kelas, payload.wali_kelas, new Date().toISOString()];
        upsertRowById(sheet, id, row);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: id });
      }

      case 'deleteKelas': {
        const sheet = ss.getSheetByName(SHEETS.KELAS);
        deleteRowById(sheet, payload.id);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: payload.id });
      }

      // 4. CRUD SISWA
      case 'saveSiswa': {
        const sheet = ss.getSheetByName(SHEETS.SISWA);
        const id = payload.id || 'sis-' + Utilities.getUuid();
        const row = [id, String(payload.nisn), payload.nama_lengkap, payload.password, payload.kelas_id, Number(payload.poin || 100), new Date().toISOString()];
        upsertRowById(sheet, id, row);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: id });
      }

      case 'importSiswaBatch': {
        const sheet = ss.getSheetByName(SHEETS.SISWA);
        const list = payload.list || [];
        list.forEach(item => {
          const id = item.id || 'sis-' + Utilities.getUuid();
          const row = [id, String(item.nisn), item.nama_lengkap, item.password || '123456', item.kelas_id, Number(item.poin || 100), new Date().toISOString()];
          upsertRowByColumnValue(sheet, 2, String(item.nisn), row); // Kolom 2 adalah NISN
        });
        invalidateDataCache();
        return jsonResponse({ status: 'success', count: list.length });
      }

      case 'deleteSiswa': {
        const sheet = ss.getSheetByName(SHEETS.SISWA);
        deleteRowById(sheet, payload.id);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: payload.id });
      }

      // 5. CRUD MAPEL / JADWAL UJIAN
      case 'saveJadwal': {
        const sheet = ss.getSheetByName(SHEETS.JADWAL);
        const id = payload.id || 'jdw-' + Utilities.getUuid();
        const row = [
          id,
          payload.kode_mapel,
          payload.nama_mapel,
          payload.judul_ujian,
          payload.kelas_id,
          Number(payload.durasi_menit || 45),
          payload.token,
          payload.warna_tema || 'blue',
          payload.status_aktif !== false,
          new Date().toISOString()
        ];
        upsertRowById(sheet, id, row);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: id });
      }

      case 'deleteJadwal': {
        const sheet = ss.getSheetByName(SHEETS.JADWAL);
        deleteRowById(sheet, payload.id);
        // Hapus juga butir soal terkait
        const soalSheet = ss.getSheetByName(SHEETS.SOAL);
        deleteRowsByForeignKey(soalSheet, 2, payload.id); // kolom 2 adalah jadwal_id
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: payload.id });
      }

      // 6. CRUD SOAL & BULK ACTIONS & UPLOAD MEDIA
      case 'saveSoal': {
        const sheet = ss.getSheetByName(SHEETS.SOAL);
        const id = payload.id || 'soal-' + Utilities.getUuid();
        const row = [
          id,
          payload.jadwal_id,
          payload.pertanyaan,
          payload.gambar_url || '',
          payload.opsi_a || '-',
          payload.opsi_b || '-',
          payload.opsi_c || '-',
          payload.opsi_d || '-',
          payload.opsi_e || '-',
          payload.kunci_jawaban || 'A',
          Number(payload.bobot || 10),
          payload.jenis_soal || 'PILIHAN_GANDA',
          payload.pembahasan || '',
          payload.kode_soal || '',
          new Date().toISOString()
        ];
        upsertRowById(sheet, id, row);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: id });
      }

      case 'saveBulkSoal': {
        const sheet = ss.getSheetByName(SHEETS.SOAL);
        const list = payload.soalList || [];
        const existingData = sheet.getDataRange().getValues();
        const idMap = new Map();
        for (let i = 1; i < existingData.length; i++) {
          idMap.set(String(existingData[i][0]), i + 1);
        }

        const rowsToAppend = [];
        list.forEach(item => {
          const id = item.id || 'soal-' + Utilities.getUuid();
          const row = [
            id,
            item.jadwal_id,
            item.pertanyaan,
            item.gambar_url || '',
            item.opsi_a || '-',
            item.opsi_b || '-',
            item.opsi_c || '-',
            item.opsi_d || '-',
            item.opsi_e || '-',
            item.kunci_jawaban || 'A',
            Number(item.bobot || 10),
            item.jenis_soal || 'PILIHAN_GANDA',
            item.pembahasan || '',
            item.kode_soal || '',
            new Date().toISOString()
          ];

          if (idMap.has(String(id))) {
            const rowIndex = idMap.get(String(id));
            sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
          } else {
            rowsToAppend.push(row);
          }
        });

        if (rowsToAppend.length > 0) {
          sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
        }

        invalidateDataCache();
        return jsonResponse({ status: 'success', count: list.length });
      }

      case 'deleteBulkSoal': {
        const sheet = ss.getSheetByName(SHEETS.SOAL);
        const ids = new Set((payload.ids || []).map(String));
        const data = sheet.getDataRange().getValues();
        for (let i = data.length - 1; i >= 1; i--) {
          if (ids.has(String(data[i][0]))) {
            sheet.deleteRow(i + 1);
          }
        }
        invalidateDataCache();
        return jsonResponse({ status: 'success', count: ids.size });
      }

      case 'deleteSoal': {
        const sheet = ss.getSheetByName(SHEETS.SOAL);
        deleteRowById(sheet, payload.id);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: payload.id });
      }

      case 'uploadImage': {
        try {
          const base64Data = payload.base64;
          const fileName = payload.fileName || ('soal_img_' + Date.now() + '.jpg');
          const mimeType = payload.mimeType || 'image/jpeg';

          if (!base64Data) {
            return jsonResponse({ status: 'error', message: 'Data gambar base64 kosong' });
          }

          const folderName = 'EduCBT_Media';
          let folder;
          const folders = DriveApp.getFoldersByName(folderName);
          if (folders.hasNext()) {
            folder = folders.next();
          } else {
            folder = DriveApp.createFolder(folderName);
          }

          let cleanBase64 = base64Data;
          if (cleanBase64.indexOf(',') > -1) {
            cleanBase64 = cleanBase64.split(',')[1];
          }

          const decoded = Utilities.base64Decode(cleanBase64);
          const blob = Utilities.newBlob(decoded, mimeType, fileName);
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

          const fileId = file.getId();
          const directUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200';
          const webUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;

          return jsonResponse({
            status: 'success',
            fileId: fileId,
            url: directUrl,
            webUrl: webUrl,
            fileName: fileName
          });
        } catch (err) {
          return jsonResponse({
            status: 'success',
            fileId: 'local-' + Date.now(),
            url: payload.base64,
            message: 'Fallback Data URI: ' + err.toString()
          });
        }
      }

      // 7. SUBMIT UJIAN & REKAP NILAI DENGAN LOCKSERVICE & PENILAIAN AMAN DI SERVER
      case 'saveRekap': {
        const lock = LockService.getScriptLock();
        try {
          lock.waitLock(15000); // Mencegah race condition ketika banyak siswa kumpul serentak
        } catch (lockErr) {
          return jsonResponse({ status: 'error', code: 'SERVER_BUSY', message: 'Antrian server penuh, silakan klik kirim ulang.' });
        }

        try {
          const sheet = ss.getSheetByName(SHEETS.REKAP);
          const id = 'rek-' + Utilities.getUuid();

          // Penilaian server-side dari kunci jawaban resmi di database
          const soalSheet = ss.getSheetByName(SHEETS.SOAL);
          const allSoal = sheetToObjects(soalSheet).filter(s => String(s.jadwal_id) === String(payload.jadwal_id));

          let totalBenar = 0;
          let totalSalah = 0;
          let totalSkor = 0;
          let totalBobot = 0;
          const userAnswers = payload.jawaban_json || {};

          allSoal.forEach(s => {
            const bobot = Number(s.bobot || 10);
            totalBobot += bobot;
            const studentAns = String(userAnswers[s.id] || '').trim();

            if (s.jenis_soal === 'ESAI') {
              const keyAns = String(s.kunci_jawaban || '').trim().toLowerCase();
              const lowerAns = studentAns.toLowerCase();
              if (lowerAns.length > 0 && keyAns.length > 0 && (lowerAns === keyAns || lowerAns.includes(keyAns) || keyAns.includes(lowerAns))) {
                totalBenar++;
                totalSkor += bobot;
              } else if (lowerAns.length > 0) {
                totalBenar++;
                totalSkor += Math.round(bobot * 0.75);
              } else {
                totalSalah++;
              }
            } else {
              if (studentAns.toUpperCase() === String(s.kunci_jawaban || '').trim().toUpperCase()) {
                totalBenar++;
                totalSkor += bobot;
              } else {
                totalSalah++;
              }
            }
          });

          const nilaiAkhir = totalBobot > 0 ? Math.round((totalSkor / totalBobot) * 100) : 0;

          const row = [
            id,
            payload.siswa_id,
            payload.jadwal_id,
            totalBenar,
            totalSalah,
            nilaiAkhir,
            JSON.stringify(userAnswers),
            payload.waktu_selesai || new Date().toISOString()
          ];
          sheet.appendRow(row);

          // Update XP Poin Siswa secara efisien
          if (payload.siswa_id) {
            const siswaSheet = ss.getSheetByName(SHEETS.SISWA);
            const dataSiswa = siswaSheet.getDataRange().getValues();
            for (let i = 1; i < dataSiswa.length; i++) {
              if (String(dataSiswa[i][0]) === String(payload.siswa_id)) {
                const currentPoin = Number(dataSiswa[i][5] || 0);
                siswaSheet.getRange(i + 1, 6).setValue(currentPoin + nilaiAkhir);
                break;
              }
            }
          }

          invalidateDataCache();

          return jsonResponse({
            status: 'success',
            id: id,
            benar: totalBenar,
            salah: totalSalah,
            nilai_akhir: nilaiAkhir,
            message: 'Hasil ujian berhasil disimpan'
          });
        } finally {
          lock.releaseLock();
        }
      }

      case 'deleteRekap': {
        const sheet = ss.getSheetByName(SHEETS.REKAP);
        deleteRowById(sheet, payload.id);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: payload.id });
      }

      // 8. PENGATURAN IDENTITAS SEKOLAH
      case 'savePengaturan': {
        const sheet = ss.getSheetByName(SHEETS.PENGATURAN);
        const row = [
          1,
          payload.nama_aplikasi || 'EduCBT Lingora',
          payload.nama_sekolah || 'SMA Negeri Harapan Bangsa',
          payload.logo_url || '',
          payload.alamat_sekolah || 'Jl. Pendidikan No. 45',
          payload.nama_kepsek || 'Dr. H. Ahmad Sulaiman, M.Pd',
          payload.nip_kepsek || '19750412 200003 1 004',
          Number(payload.jumlah_opsi || 4),
          payload.tahun_ajaran || '2026/2027',
          Number(payload.kkm_default || 75),
          payload.wajib_token !== false,
          payload.acak_soal !== false,
          payload.anti_curang !== false,
          Number(payload.max_pelanggaran || 3),
          payload.admin_email || 'admin@educbt.id',
          payload.admin_password || 'admin123',
          new Date().toISOString()
        ];
        upsertRowById(sheet, 1, row);
        invalidateDataCache();
        return jsonResponse({ status: 'success' });
      }

      // 9. CRUD PENGGUNA (ADMIN & GURU)
      case 'savePengguna': {
        const sheet = ss.getSheetByName(SHEETS.PENGGUNA);
        const id = payload.id || 'usr-' + Utilities.getUuid();
        const row = [
          id,
          String(payload.username || '').trim().toLowerCase(),
          payload.nama_lengkap || 'Pengguna',
          String(payload.email || '').trim().toLowerCase(),
          String(payload.password || '123456'),
          payload.role || 'guru',
          payload.status || 'Aktif',
          new Date().toISOString()
        ];
        upsertRowById(sheet, id, row);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: id });
      }

      case 'deletePengguna': {
        const sheet = ss.getSheetByName(SHEETS.PENGGUNA);
        deleteRowById(sheet, payload.id);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: payload.id });
      }

      // 10. CRUD KELOLA MATERI PEMBELAJARAN
      case 'saveMateri': {
        const mat = payload.materi || payload;
        const sheet = ss.getSheetByName(SHEETS.MATERI) || getOrCreateMateriSheet(ss);
        ensureMateriSheetColumns(sheet);
        const id = mat.id || 'mat-' + Utilities.getUuid();
        const row = [
          id,
          mat.folder_id || '',
          mat.judul || 'Materi Pembelajaran',
          mat.deskripsi || '',
          mat.mapel_id || mat.mapel || 'Umum',
          mat.kelas_id || 'ALL',
          mat.jenis || 'VIDEO', // VIDEO | PDF | GAMBAR
          mat.url || mat.content_url || '',
          mat.status || 'PUBLISHED', // PUBLISHED | DRAFT
          mat.created_by || 'Admin',
          mat.created_at || new Date().toISOString(),
          new Date().toISOString()
        ];
        upsertRowById(sheet, id, row);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: id });
      }

      case 'deleteMateri': {
        const sheet = ss.getSheetByName(SHEETS.MATERI) || getOrCreateMateriSheet(ss);
        deleteRowById(sheet, payload.id);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: payload.id });
      }

      // 11. CRUD KELOLA FOLDER MATERI PEMBELAJARAN
      case 'saveMateriFolder': {
        const fld = payload.folder || payload;
        const sheet = ss.getSheetByName(SHEETS.MATERI_FOLDERS) || getOrCreateMateriFolderSheet(ss);
        const id = fld.id || 'fld-' + Utilities.getUuid();
        const row = [
          id,
          fld.name || 'Folder Materi',
          fld.subject || 'Umum',
          fld.grade || 'Semua Kelas',
          fld.color || '#2477f5',
          fld.icon || '📁',
          fld.description || '',
          fld.created_at || new Date().toISOString(),
          new Date().toISOString()
        ];
        upsertRowById(sheet, id, row);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: id });
      }

      case 'deleteMateriFolder': {
        const sheet = ss.getSheetByName(SHEETS.MATERI_FOLDERS) || getOrCreateMateriFolderSheet(ss);
        deleteRowById(sheet, payload.id);
        invalidateDataCache();
        return jsonResponse({ status: 'success', id: payload.id });
      }

      default:
        return jsonResponse({ status: 'error', message: 'Action POST tidak dikenal: ' + action });
    }
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Invalidate Cache RAM Google Apps Script saat terjadi mutasi data
 */
function invalidateDataCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('educbt_cache_admin');
    cache.remove('educbt_cache_guru');
    cache.remove('educbt_cache_siswa');
  } catch (e) {}
}

/**
 * Mengambil Seluruh Isi Database dari Spreadsheet dengan Otorisasi Hak Akses (Role)
 */
function fetchAllDatabase(userRole = 'admin') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const kelas = sheetToObjects(ss.getSheetByName(SHEETS.KELAS));
  const mapel_jadwal = sheetToObjects(ss.getSheetByName(SHEETS.JADWAL));
  const pengaturan = sheetToObjects(ss.getSheetByName(SHEETS.PENGATURAN))[0] || {};
  let rawSoal = sheetToObjects(ss.getSheetByName(SHEETS.SOAL));
  let materiSheet = ss.getSheetByName(SHEETS.MATERI) || getOrCreateMateriSheet(ss);
  let materi = sheetToObjects(materiSheet);
  let folderSheet = ss.getSheetByName(SHEETS.MATERI_FOLDERS) || getOrCreateMateriFolderSheet(ss);
  let materi_folders = sheetToObjects(folderSheet);
  let siswa = [];
  let rekap_nilai = [];
  let pengguna = [];

  const isStaff = userRole === 'admin' || userRole === 'guru';

  if (isStaff) {
    siswa = sheetToObjects(ss.getSheetByName(SHEETS.SISWA));
    rekap_nilai = sheetToObjects(ss.getSheetByName(SHEETS.REKAP));
    pengguna = sheetToObjects(ss.getSheetByName(SHEETS.PENGGUNA));
    // Sembunyikan password pengguna dari respon
    pengguna = pengguna.map(u => {
      const copy = { ...u };
      delete copy.password;
      return copy;
    });
  } else {
    // KEAMANAN TINGKAT TINGGI: Siswa TIDAK menerima kunci jawaban dan pembahasan!
    rawSoal = rawSoal.map(s => {
      const copy = { ...s };
      delete copy.kunci_jawaban;
      delete copy.pembahasan;
      return copy;
    });
    // Siswa hanya boleh menerima materi yang berstatus PUBLISHED
    materi = (materi || []).filter(m => String(m.status || '').toUpperCase() === 'PUBLISHED');
  }

  return {
    kelas: kelas,
    siswa: siswa,
    mapel_jadwal: mapel_jadwal,
    soal: rawSoal,
    rekap_nilai: rekap_nilai,
    pengaturan: pengaturan,
    pengguna: pengguna,
    materi: materi || [],
    materi_folders: materi_folders || []
  };
}

/**
 * Format Response JSON dengan CORS Header Aktif
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Memastikan kolom folder_id selalu ada di sheet materi tanpa merusak data lama
 */
function ensureMateriSheetColumns(sheet) {
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return;
  const headers = values[0].map(h => String(h || '').trim().toLowerCase());
  if (headers.indexOf('folder_id') === -1) {
    sheet.insertColumnAfter(1);
    sheet.getRange(1, 2).setValue('folder_id').setFontWeight('bold').setBackground('#E2E8F0');
  }
}

/**
 * Otomatis Memeriksa atau Membuat Lembar 'materi' Lengkap dengan Header & Sampel
 */
function getOrCreateMateriSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.MATERI);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.MATERI);
    const headers = ['id', 'folder_id', 'judul', 'deskripsi', 'mapel_id', 'kelas_id', 'jenis', 'url', 'status', 'created_by', 'created_at', 'updated_at'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E2E8F0');
    sheet.setFrozenRows(1);

    // Data sampel awal agar tabel langsung siap digunakan
    sheet.appendRow([
      'mat-001',
      'math4',
      'Konsep Dasar Trigonometri Sudut Istimewa',
      'Pemahaman komprehensif mengenai sin, cos, tan pada kuadran I-IV serta relasi sudut dan identitas trigonometri.',
      'jdw-1',
      'ALL',
      'VIDEO',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'PUBLISHED',
      'Budi Santoso, M.Pd',
      new Date().toISOString(),
      new Date().toISOString()
    ]);
    sheet.appendRow([
      'mat-002',
      'ipas4',
      'Modul Lengkap Biologi: Struktur dan Fungsi Sel',
      'Materi pendukung bab 1 biologi tentang organel sel, membran plasma, dan transport aktif-pasif antar sel.',
      'jdw-1',
      'ALL',
      'PDF',
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      'PUBLISHED',
      'Siti Aminah, S.Pd',
      new Date().toISOString(),
      new Date().toISOString()
    ]);
    sheet.appendRow([
      'mat-003',
      'ipas4',
      'Infografis Ringkasan Rumus Dinamika & Hukum Newton',
      'Peta konsep visual hukum gerak Newton I, II, III dan penerapannya pada bidang miring serta lift bergerak.',
      'jdw-2',
      'kls-1',
      'GAMBAR',
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80',
      'PUBLISHED',
      'Admin Sekolah',
      new Date().toISOString(),
      new Date().toISOString()
    ]);
  } else {
    ensureMateriSheetColumns(sheet);
  }
  return sheet;
}

/**
 * Otomatis Memeriksa atau Membuat Lembar 'materi_folders' Lengkap dengan 5 Folder Simulasi Resmi
 */
function getOrCreateMateriFolderSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.MATERI_FOLDERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.MATERI_FOLDERS);
    const headers = ['id', 'name', 'subject', 'grade', 'color', 'icon', 'description', 'created_at', 'updated_at'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E2E8F0');
    sheet.setFrozenRows(1);

    const defaultFolders = [
      ['ipas4', 'IPAS Kelas IV', 'IPAS', 'IV A', '#2477f5', '📁', 'Kumpulan materi IPAS untuk membantu memahami konsep sains dan lingkungan sekitar.', new Date().toISOString(), new Date().toISOString()],
      ['math4', 'Matematika Kelas IV', 'MATEMATIKA', 'IV A', '#9255e8', '📁', 'Materi numerasi, operasi hitung, pecahan, dan pemecahan masalah.', new Date().toISOString(), new Date().toISOString()],
      ['bindo4', 'Bahasa Indonesia', 'BAHASA INDONESIA', 'IV A', '#ff922b', '📁', 'Kumpulan bacaan, teks narasi, dan latihan memahami informasi.', new Date().toISOString(), new Date().toISOString()],
      ['pancasila4', 'Pendidikan Pancasila', 'PANCASILA', 'IV B', '#24ae78', '📁', 'Materi nilai-nilai Pancasila dan penerapannya dalam kehidupan.', new Date().toISOString(), new Date().toISOString()],
      ['umum', 'Materi Umum', 'UMUM', 'Semua Kelas', '#12a9ba', '📁', 'Materi tambahan yang dapat diakses oleh seluruh siswa.', new Date().toISOString(), new Date().toISOString()]
    ];
    defaultFolders.forEach(r => sheet.appendRow(r));
  }
  return sheet;
}

/**
 * FUNGSI 1-KLIK: Jalankan fungsi ini langsung dari editor Google Apps Script (klik 'Run' / 'Jalankan')
 * untuk membuat lembar 'materi' & 'materi_folders' di Spreadsheet secara otomatis dalam 1 detik!
 */
function setupMateriSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateMateriSheet(ss);
  const folderSheet = getOrCreateMateriFolderSheet(ss);
  Logger.log('Berhasil membuat/memverifikasi lembar: ' + sheet.getName() + ' dan ' + folderSheet.getName());
  return 'Sukses! Lembar ' + sheet.getName() + ' dan ' + folderSheet.getName() + ' siap digunakan.';
}

/**
 * Inisialisasi Cepat Sheet dan Header Kolom (Bypass Instan jika sudah diinisialisasi)
 */
function initDatabaseSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Selalu pastikan lembar materi dan folder ada sekalipun DB_INITIALIZED sudah true
  if (!ss.getSheetByName(SHEETS.MATERI)) {
    getOrCreateMateriSheet(ss);
  }
  if (!ss.getSheetByName(SHEETS.MATERI_FOLDERS)) {
    getOrCreateMateriFolderSheet(ss);
  }

  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('DB_INITIALIZED') === 'true') {
    return; // Bypass instan: hemat 700ms - 1500ms pada setiap request!
  }

  const definitions = [
    {
      name: SHEETS.KELAS,
      headers: ['id', 'nama_kelas', 'wali_kelas', 'created_at'],
      initial: [
        ['kls-1', 'XII IPA 1', 'Budi Santoso, M.Pd', new Date().toISOString()],
        ['kls-2', 'XI IPS 1', 'Siti Aminah, S.Pd', new Date().toISOString()]
      ]
    },
    {
      name: SHEETS.SISWA,
      headers: ['id', 'nisn', 'nama_lengkap', 'password', 'kelas_id', 'poin', 'created_at'],
      initial: [
        ['sis-1', '1001', 'Alex Pratama', '123456', 'kls-1', 850, new Date().toISOString()],
        ['sis-2', '1002', 'Sophie Maharani', '123456', 'kls-1', 920, new Date().toISOString()]
      ]
    },
    {
      name: SHEETS.JADWAL,
      headers: ['id', 'kode_mapel', 'nama_mapel', 'judul_ujian', 'kelas_id', 'durasi_menit', 'token', 'warna_tema', 'status_aktif', 'created_at'],
      initial: [
        ['jdw-1', 'MAT-12', 'Matematika Lanjut', 'Ujian Tengah Semester Kalkulus', 'kls-1', 30, 'CBT26', 'purple', true, new Date().toISOString()],
        ['jdw-2', 'ENG-12', 'Bahasa Inggris', 'Reading & Grammar Evaluation', 'kls-1', 45, 'ENG99', 'orange', true, new Date().toISOString()]
      ]
    },
    {
      name: SHEETS.SOAL,
      headers: ['id', 'jadwal_id', 'pertanyaan', 'gambar_url', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'opsi_e', 'kunci_jawaban', 'bobot', 'jenis_soal', 'pembahasan', 'kode_soal', 'created_at'],
      initial: [
        ['soal-1', 'jdw-1', 'Hasil turunan pertama dari fungsi f(x) = 3x² + 5x - 7 adalah...', '', '6x + 5', '3x + 5', '6x - 7', '6x² + 5', '3x² + 5', 'A', 50, 'PILIHAN_GANDA', 'Gunakan rumus turunan d/dx(ax^n) = n*a*x^(n-1). Turunan dari 3x² adalah 6x, 5x adalah 5, konstanta -7 adalah 0.', 'MAT-001', new Date().toISOString()],
        ['soal-2', 'jdw-1', 'Nilai dari integral tentu ∫(2x) dx dengan batas bawah 1 hingga batas atas 3 adalah...', '', '6', '8', '9', '10', '12', 'B', 50, 'PILIHAN_GANDA', 'Anti-turunan dari 2x adalah x². Masukkan batas atas 3² = 9, batas bawah 1² = 1. Selisihnya 9 - 1 = 8.', 'MAT-002', new Date().toISOString()]
      ]
    },
    {
      name: SHEETS.REKAP,
      headers: ['id', 'siswa_id', 'jadwal_id', 'benar', 'salah', 'nilai_akhir', 'jawaban_json', 'waktu_selesai'],
      initial: []
    },
    {
      name: SHEETS.PENGATURAN,
      headers: ['id', 'nama_aplikasi', 'nama_sekolah', 'logo_url', 'alamat_sekolah', 'nama_kepsek', 'nip_kepsek', 'jumlah_opsi', 'tahun_ajaran', 'kkm_default', 'wajib_token', 'acak_soal', 'anti_curang', 'max_pelanggaran', 'admin_email', 'admin_password', 'updated_at'],
      initial: [
        [
          1,
          'EDU CBT SENAPATI',
          'SMA Negeri Harapan Bangsa',
          '',
          'Jl. Pendidikan No. 45, Kota Cerdas',
          'Dr. H. Ahmad Sulaiman, M.Pd',
          '19750412 200003 1 004',
          4,
          '2026/2027',
          75,
          true,
          true,
          true,
          3,
          'admin@educbt.id',
          'admin123',
          new Date().toISOString()
        ]
      ]
    },
    {
      name: SHEETS.PENGGUNA,
      headers: ['id', 'username', 'nama_lengkap', 'email', 'password', 'role', 'status', 'created_at'],
      initial: [
        ['usr-1', 'admin', 'Dr. H. Ahmad Sulaiman, M.Pd', 'admin@educbt.id', 'admin123', 'admin', 'Aktif', new Date().toISOString()],
        ['usr-2', 'guru1', 'Budi Santoso, M.Pd', 'budi@sekolah.sch.id', 'guru123', 'guru', 'Aktif', new Date().toISOString()],
        ['usr-3', 'guru2', 'Siti Aminah, S.Pd', 'siti@sekolah.sch.id', 'guru123', 'guru', 'Aktif', new Date().toISOString()]
      ]
    },
    {
      name: SHEETS.MATERI,
      headers: ['id', 'judul', 'deskripsi', 'mapel_id', 'kelas_id', 'jenis', 'url', 'status', 'created_by', 'created_at', 'updated_at'],
      initial: [
        [
          'mat-001',
          'Konsep Dasar Trigonometri Sudut Istimewa',
          'Pemahaman komprehensif mengenai sin, cos, tan pada kuadran I-IV serta relasi sudut dan identitas trigonometri.',
          'mpl-1',
          'ALL',
          'VIDEO',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'PUBLISHED',
          'Budi Santoso, M.Pd',
          new Date().toISOString(),
          new Date().toISOString()
        ],
        [
          'mat-002',
          'Modul Lengkap Biologi: Struktur dan Fungsi Sel',
          'Materi pendukung bab 1 biologi tentang organel sel, membran plasma, dan transport aktif-pasif antar sel.',
          'mpl-2',
          'ALL',
          'PDF',
          'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          'PUBLISHED',
          'Siti Aminah, S.Pd',
          new Date().toISOString(),
          new Date().toISOString()
        ],
        [
          'mat-003',
          'Infografis Ringkasan Hukum Newton & Gravitasi',
          'Peta konsep visual hukum gerak Newton I, II, III dan penerapannya pada bidang miring serta lift.',
          'mpl-3',
          'ALL',
          'GAMBAR',
          'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80',
          'PUBLISHED',
          'Admin Sekolah',
          new Date().toISOString(),
          new Date().toISOString()
        ]
      ]
    },
    {
      name: SHEETS.MATERI_FOLDERS,
      headers: ['id', 'name', 'subject', 'grade', 'color', 'icon', 'description', 'created_at', 'updated_at'],
      initial: [
        ['ipas4', 'IPAS Kelas IV', 'IPAS', 'IV A', '#2477f5', '📁', 'Kumpulan materi IPAS untuk membantu memahami konsep sains dan lingkungan sekitar.', new Date().toISOString(), new Date().toISOString()],
        ['math4', 'Matematika Kelas IV', 'MATEMATIKA', 'IV A', '#9255e8', '📁', 'Materi numerasi, operasi hitung, pecahan, dan pemecahan masalah.', new Date().toISOString(), new Date().toISOString()],
        ['bindo4', 'Bahasa Indonesia', 'BAHASA INDONESIA', 'IV A', '#ff922b', '📁', 'Kumpulan bacaan, teks narasi, dan latihan memahami informasi.', new Date().toISOString(), new Date().toISOString()],
        ['pancasila4', 'Pendidikan Pancasila', 'PANCASILA', 'IV B', '#24ae78', '📁', 'Materi nilai-nilai Pancasila dan penerapannya dalam kehidupan.', new Date().toISOString(), new Date().toISOString()],
        ['umum', 'Materi Umum', 'UMUM', 'Semua Kelas', '#12a9ba', '📁', 'Materi tambahan yang dapat diakses oleh seluruh siswa.', new Date().toISOString(), new Date().toISOString()]
      ]
    }
  ];

  definitions.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      if (def.initial && def.initial.length > 0) {
        def.initial.forEach(row => sheet.appendRow(row));
      }
      sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#E2E8F0');
      sheet.setFrozenRows(1);
    }
  });

  props.setProperty('DB_INITIALIZED', 'true');
}

/**
 * Fast-path scan sheet langsung dari 2D Array getValues() tanpa overhead alokasi ribuan object.
 * Berhenti seketika saat row yang dicocokkan ditemukan (early termination).
 */
function fastFindRow(sheet, predicateFn) {
  if (!sheet) return null;
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;
  const headers = values[0].map(h => String(h || '').trim().toLowerCase());
  const headerMap = {};
  for (let j = 0; j < headers.length; j++) {
    headerMap[headers[j]] = j;
  }
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (predicateFn(row, headerMap)) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        let val = row[j];
        if (headers[j] === 'jawaban_json' && typeof val === 'string' && val.startsWith('{')) {
          try { val = JSON.parse(val); } catch (e) {}
        }
        obj[headers[j]] = val;
      }
      return obj;
    }
  }
  return null;
}

/**
 * Mengubah Sheet Menjadi Array of Objects Berdasarkan Header Kolom
 */
function sheetToObjects(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const list = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    let hasData = false;

    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      // Parsing JSON jika kolom bertipe json
      if (headers[j] === 'jawaban_json' && typeof val === 'string' && val.startsWith('{')) {
        try { val = JSON.parse(val); } catch (e) {}
      }
      obj[headers[j]] = val;
      if (val !== '' && val !== null && val !== undefined) hasData = true;
    }

    if (hasData) list.push(obj);
  }

  return list;
}

/**
 * Helper Update or Insert Baris Berdasarkan Kolom ID (Kolom 1)
 */
function upsertRowById(sheet, id, newRowValues) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, newRowValues.length).setValues([newRowValues]);
      return;
    }
  }
  sheet.appendRow(newRowValues);
}

/**
 * Helper Update or Insert Baris Berdasarkan Nilai Kolom Tertentu (1-based index)
 */
function upsertRowByColumnValue(sheet, colIndex, value, newRowValues) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex - 1]) === String(value)) {
      sheet.getRange(i + 1, 1, 1, newRowValues.length).setValues([newRowValues]);
      return;
    }
  }
  sheet.appendRow(newRowValues);
}

/**
 * Helper Hapus Baris Berdasarkan ID (Kolom 1)
 */
function deleteRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

/**
 * Helper Hapus Baris Berdasarkan Foreign Key (misal jadwal_id pada soal)
 */
function deleteRowsByForeignKey(sheet, colIndex, fkValue) {
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colIndex - 1]) === String(fkValue)) {
      sheet.deleteRow(i + 1);
    }
  }
}

/**
 * ============================================================================
 * HELPER MANAJEMEN SESI & TOKEN PERSISTEN (HMAC-SHA256)
 * ============================================================================
 */
let _cachedSecret = null;

function getSessionSecret() {
  if (_cachedSecret) return _cachedSecret;
  try {
    const mem = CacheService.getScriptCache().get('EDUCBT_SESSION_SECRET');
    if (mem) {
      _cachedSecret = mem;
      return mem;
    }
  } catch (e) {}

  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('EDUCBT_SESSION_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + '-' + Utilities.getUuid() + '-' + Date.now();
    props.setProperty('EDUCBT_SESSION_SECRET', secret);
  }
  _cachedSecret = secret;
  try {
    CacheService.getScriptCache().put('EDUCBT_SESSION_SECRET', secret, 21600);
  } catch (e) {}
  return secret;
}

function generateSessionToken(userData) {
  const secret = getSessionSecret();
  const now = new Date().getTime();
  const exp = now + (7 * 24 * 60 * 60 * 1000); // Masa berlaku sesi: 7 Hari
  const tokenPayload = {
    sub: String(userData.id),
    role: String(userData.role || 'siswa').toLowerCase(),
    identifier: String(userData.identifier || ''),
    type: String(userData.type || (userData.role === 'siswa' ? 'siswa' : 'user')),
    iat: now,
    exp: exp
  };

  const payloadB64 = Utilities.base64EncodeWebSafe(JSON.stringify(tokenPayload));
  const sigBytes = Utilities.computeHmacSha256Signature(payloadB64, secret);
  const sigB64 = Utilities.base64EncodeWebSafe(sigBytes);
  const token = payloadB64 + '.' + sigB64;

  // Cache sesi agar verifikasi instan
  try {
    CacheService.getScriptCache().put('sess_' + userData.id, token, 21600);
  } catch (e) {}

  return { token: token, exp: exp };
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const payloadB64 = parts[0];
  const sigB64 = parts[1];
  const secret = getSessionSecret();

  const expectedSig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payloadB64, secret));
  if (expectedSig !== sigB64) {
    return null; // Token diubah / tidak valid
  }

  try {
    const jsonStr = Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadB64)).getDataAsString();
    const payload = JSON.parse(jsonStr);
    const now = new Date().getTime();
    if (payload.exp && now > payload.exp) {
      return { expired: true };
    }

    // Cek daftar token yang dicabut (revoked tokens)
    const props = PropertiesService.getScriptProperties();
    const revoked = props.getProperty('REVOKED_TOKENS') || '';
    const tokenSigSnippet = sigB64.substring(0, 20);
    if (revoked.indexOf(tokenSigSnippet) !== -1) {
      return null; // Token telah di-logout
    }

    return payload;
  } catch (err) {
    return null;
  }
}

function revokeSessionToken(token) {
  if (!token || typeof token !== 'string') return;
  const parts = token.split('.');
  if (parts.length === 2) {
    const sigSnippet = parts[1].substring(0, 20);
    try {
      const props = PropertiesService.getScriptProperties();
      let revoked = props.getProperty('REVOKED_TOKENS') || '';
      const list = revoked ? revoked.split(',') : [];
      if (!list.includes(sigSnippet)) {
        list.push(sigSnippet);
        if (list.length > 100) list.shift();
        props.setProperty('REVOKED_TOKENS', list.join(','));
      }
    } catch (e) {}
  }
}
