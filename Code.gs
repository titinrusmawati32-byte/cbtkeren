/**
 * ============================================================================
 * BACKEND GOOGLE APPS SCRIPT (GAS) UNTUK APLIKASI EDUCBT LINGORA
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
  PENGATURAN: 'pengaturan'
};

/**
 * Handle HTTP GET Request
 */
function doGet(e) {
  try {
    initDatabaseSheets(); // Pastikan seluruh sheet dan header sudah siap

    const action = e.parameter.action || 'getAllData';

    if (action === 'getAllData') {
      const data = fetchAllDatabase();
      return jsonResponse({ status: 'success', data: data });
    }

    if (action === 'ping') {
      return jsonResponse({ status: 'success', message: 'Backend Google Apps Script EduCBT Aktif!' });
    }

    return jsonResponse({ status: 'error', message: 'Action GET tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Handle HTTP POST Request (CRUD Data)
 */
function doPost(e) {
  try {
    initDatabaseSheets();

    let requestData = {};
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      requestData = e.parameter;
    }

    const action = requestData.action;
    const payload = requestData.payload || {};

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      // 1. AUTENTIKASI ADMIN
      case 'loginAdmin': {
        const setSheet = ss.getSheetByName(SHEETS.PENGATURAN);
        const setRows = sheetToObjects(setSheet);
        const config = setRows[0] || {};
        const adminEmail = (config.admin_email || 'admin@educbt.id').toLowerCase();
        const adminPass = config.admin_password || 'admin123';

        if (payload.email.toLowerCase() === adminEmail && payload.password === adminPass) {
          return jsonResponse({
            status: 'success',
            user: {
              id: 'admin-gas',
              role: 'admin',
              nama: config.nama_kepsek || 'Administrator Guru',
              email: payload.email,
              poin: 999
            }
          });
        } else {
          return jsonResponse({ status: 'error', message: 'Email atau Password Admin tidak cocok!' });
        }
      }

      // 2. AUTENTIKASI SISWA
      case 'loginSiswa': {
        const siswaSheet = ss.getSheetByName(SHEETS.SISWA);
        const siswaList = sheetToObjects(siswaSheet);
        const found = siswaList.find(s => String(s.nisn).trim() === String(payload.nisn).trim() && String(s.password).trim() === String(payload.password).trim());

        if (found) {
          return jsonResponse({
            status: 'success',
            user: {
              id: found.id,
              role: 'siswa',
              nama: found.nama_lengkap,
              nisn: found.nisn,
              kelas_id: found.kelas_id,
              poin: Number(found.poin || 100)
            }
          });
        } else {
          return jsonResponse({ status: 'error', message: 'NISN atau Password siswa tidak cocok!' });
        }
      }

      // 3. CRUD KELAS
      case 'saveKelas': {
        const sheet = ss.getSheetByName(SHEETS.KELAS);
        const id = payload.id || 'kls-' + Utilities.getUuid();
        const row = [id, payload.nama_kelas, payload.wali_kelas, new Date().toISOString()];
        upsertRowById(sheet, id, row);
        return jsonResponse({ status: 'success', id: id, allData: fetchAllDatabase() });
      }

      case 'deleteKelas': {
        const sheet = ss.getSheetByName(SHEETS.KELAS);
        deleteRowById(sheet, payload.id);
        return jsonResponse({ status: 'success', allData: fetchAllDatabase() });
      }

      // 4. CRUD SISWA
      case 'saveSiswa': {
        const sheet = ss.getSheetByName(SHEETS.SISWA);
        const id = payload.id || 'sis-' + Utilities.getUuid();
        const row = [id, String(payload.nisn), payload.nama_lengkap, payload.password, payload.kelas_id, Number(payload.poin || 100), new Date().toISOString()];
        upsertRowById(sheet, id, row);
        return jsonResponse({ status: 'success', id: id, allData: fetchAllDatabase() });
      }

      case 'importSiswaBatch': {
        const sheet = ss.getSheetByName(SHEETS.SISWA);
        const list = payload.list || [];
        list.forEach(item => {
          const id = item.id || 'sis-' + Utilities.getUuid();
          const row = [id, String(item.nisn), item.nama_lengkap, item.password || '123456', item.kelas_id, Number(item.poin || 100), new Date().toISOString()];
          upsertRowByColumnValue(sheet, 2, String(item.nisn), row); // Kolom 2 adalah NISN
        });
        return jsonResponse({ status: 'success', count: list.length, allData: fetchAllDatabase() });
      }

      case 'deleteSiswa': {
        const sheet = ss.getSheetByName(SHEETS.SISWA);
        deleteRowById(sheet, payload.id);
        return jsonResponse({ status: 'success', allData: fetchAllDatabase() });
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
        return jsonResponse({ status: 'success', id: id, allData: fetchAllDatabase() });
      }

      case 'deleteJadwal': {
        const sheet = ss.getSheetByName(SHEETS.JADWAL);
        deleteRowById(sheet, payload.id);
        // Hapus juga butir soal terkait
        const soalSheet = ss.getSheetByName(SHEETS.SOAL);
        deleteRowsByForeignKey(soalSheet, 2, payload.id); // kolom 2 adalah jadwal_id
        return jsonResponse({ status: 'success', allData: fetchAllDatabase() });
      }

      // 6. CRUD SOAL
      case 'saveSoal': {
        const sheet = ss.getSheetByName(SHEETS.SOAL);
        const id = payload.id || 'soal-' + Utilities.getUuid();
        const row = [
          id,
          payload.jadwal_id,
          payload.pertanyaan,
          payload.gambar_url || '',
          payload.opsi_a,
          payload.opsi_b,
          payload.opsi_c,
          payload.opsi_d || '-',
          payload.opsi_e || '-',
          payload.kunci_jawaban || 'A',
          Number(payload.bobot || 10),
          new Date().toISOString()
        ];
        upsertRowById(sheet, id, row);
        return jsonResponse({ status: 'success', id: id, allData: fetchAllDatabase() });
      }

      case 'deleteSoal': {
        const sheet = ss.getSheetByName(SHEETS.SOAL);
        deleteRowById(sheet, payload.id);
        return jsonResponse({ status: 'success', allData: fetchAllDatabase() });
      }

      // 7. SUBMIT UJIAN & REKAP NILAI
      case 'saveRekap': {
        const sheet = ss.getSheetByName(SHEETS.REKAP);
        const id = 'rek-' + Utilities.getUuid();
        const row = [
          id,
          payload.siswa_id,
          payload.jadwal_id,
          Number(payload.benar || 0),
          Number(payload.salah || 0),
          Number(payload.nilai_akhir || 0),
          JSON.stringify(payload.jawaban_json || {}),
          payload.waktu_selesai || new Date().toISOString()
        ];
        sheet.appendRow(row);

        // Update Poin XP Siswa jika ada
        if (payload.siswa_id) {
          const siswaSheet = ss.getSheetByName(SHEETS.SISWA);
          const dataSiswa = siswaSheet.getDataRange().getValues();
          for (let i = 1; i < dataSiswa.length; i++) {
            if (String(dataSiswa[i][0]) === String(payload.siswa_id)) {
              const currentPoin = Number(dataSiswa[i][5] || 0);
              const newPoin = currentPoin + Number(payload.nilai_akhir || 0);
              siswaSheet.getRange(i + 1, 6).setValue(newPoin);
              break;
            }
          }
        }

        return jsonResponse({ status: 'success', id: id, allData: fetchAllDatabase() });
      }

      case 'deleteRekap': {
        const sheet = ss.getSheetByName(SHEETS.REKAP);
        deleteRowById(sheet, payload.id);
        return jsonResponse({ status: 'success', allData: fetchAllDatabase() });
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
        return jsonResponse({ status: 'success', allData: fetchAllDatabase() });
      }

      default:
        return jsonResponse({ status: 'error', message: 'Action POST tidak dikenal: ' + action });
    }
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Mengambil Seluruh Isi Database dari Spreadsheet
 */
function fetchAllDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    kelas: sheetToObjects(ss.getSheetByName(SHEETS.KELAS)),
    siswa: sheetToObjects(ss.getSheetByName(SHEETS.SISWA)),
    mapel_jadwal: sheetToObjects(ss.getSheetByName(SHEETS.JADWAL)),
    soal: sheetToObjects(ss.getSheetByName(SHEETS.SOAL)),
    rekap_nilai: sheetToObjects(ss.getSheetByName(SHEETS.REKAP)),
    pengaturan: sheetToObjects(ss.getSheetByName(SHEETS.PENGATURAN))[0] || {}
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
 * Inisialisasi Otomatis Semua Sheet dan Header Kolom
 */
function initDatabaseSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

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
      headers: ['id', 'jadwal_id', 'pertanyaan', 'gambar_url', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'opsi_e', 'kunci_jawaban', 'bobot', 'created_at'],
      initial: [
        ['soal-1', 'jdw-1', 'Hasil turunan pertama dari fungsi f(x) = 3x² + 5x - 7 adalah...', '', '6x + 5', '3x + 5', '6x - 7', '6x² + 5', '3x² + 5', 'A', 50, new Date().toISOString()],
        ['soal-2', 'jdw-1', 'Nilai dari integral tentu ∫(2x) dx dengan batas bawah 1 hingga batas atas 3 adalah...', '', '6', '8', '9', '10', '12', 'B', 50, new Date().toISOString()]
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
          'EduCBT Lingora',
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
