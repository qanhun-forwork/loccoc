/**
 * LỘC CỘC — nhận đơn hàng & liên hệ từ website vào Google Sheet  ·  PHIÊN BẢN 3
 * Dự án học tập môn Truyền thông số — Trường Đại học Văn Lang
 *
 * Mỗi lần khách gửi form trên loccoc.com.vn:
 *   • Đặt hàng từ giỏ  → 1 dòng ở "🛒 Đơn hàng" (mã LC-0001…) + mỗi đôi 1 dòng ở "📦 Chi tiết đơn"
 *   • Form còn lại     → 1 dòng ở "💬 Liên hệ" (mã LH-0001…), cột "Nguồn" = form khách đã gửi
 *   • Khách nhận email cảm ơn + mã đơn + thông báo đây là dự án môn học (không thu tiền, không giao hàng)
 *   • "📊 Báo cáo" tự cập nhật: thẻ số liệu, xu hướng 30 ngày, mẫu bán chạy, size, nguồn, khung giờ
 * Dữ liệu được ghi THEO TÊN CỘT (không theo vị trí), nên đổi thứ tự cột cũng không bị xô dữ liệu.
 *
 * ── CÀI ĐẶT (làm đúng thứ tự) ─────────────────────────────────────────────
 * 1. Sheet → Tiện ích mở rộng → Apps Script → xoá hết code cũ → dán file này → Lưu.
 * 2. Chọn hàm "xoaHetVaCaiDatLai" → Chạy → cấp quyền (có quyền "gửi email thay bạn").
 * 3. Triển khai → Quản lý triển khai → bút chì ✎ → Phiên bản: "Phiên bản mới" → Triển khai.
 *    ⚠ Bỏ bước 3 thì website vẫn chạy CODE CŨ (lỗi xô cột, không gửi email).
 * 4. Mở URL ứng dụng web trên trình duyệt: phải thấy "phienBan":"3.0".
 * Sau đó dùng menu "Lộc Cộc" ngay trên thanh menu của Sheet (tải lại Sheet nếu chưa thấy).
 * ───────────────────────────────────────────────────────────────────────────
 */

var PHIEN_BAN = '3.0';
var TEN_GUI = 'Lộc Cộc';            // tên người gửi trong email
var GIA_BASIC = 350000;             // giá dòng Basic (tính lại ở máy chủ, không tin giá từ trình duyệt)
var GIOI_HAN_MOI_GIO = 3;           // tối đa email gửi tới cùng 1 địa chỉ trong 1 giờ

var TAB = { BC: '📊 Báo cáo', DON: '🛒 Đơn hàng', CT: '📦 Chi tiết đơn', LH: '💬 Liên hệ', SL: '⚙ Số liệu' };
var COT = {
  DON: ['Mã đơn', 'Thời gian', 'Ngày', 'Giờ', 'Tên khách', 'Số điện thoại', 'Email', 'Sản phẩm', 'Số đôi',
    'Tạm tính (đ)', 'Ghi chú của khách', 'Email xác nhận', 'Ghi chú nội bộ'],
  CT: ['Mã đơn', 'Thời gian', 'Ngày', 'Mẫu', 'Dòng', 'Size', 'Khắc tên', 'Số lượng', 'Đơn giá (đ)', 'Thành tiền (đ)'],
  LH: ['Mã', 'Thời gian', 'Ngày', 'Giờ', 'Nguồn', 'Tên khách', 'Số điện thoại', 'Email', 'Size chân',
    'Mã đơn cần tra', 'Nội dung', 'Email xác nhận', 'Ghi chú nội bộ']
};
// các form trên website (tên = tiêu đề trang chứa form)
var NGUON = ['Liên hệ', 'Yêu cầu thiết kế riêng', 'Tư vấn 1:1', 'Chăm sóc đặc biệt', 'Tình trạng đơn hàng',
  'Hỗ trợ đơn hàng', 'Lộc Cộc Family', 'Lộc Cộc Buddy'];

// giao diện: font có đủ dấu tiếng Việt + màu thương hiệu (be #E8DCC8 · đỏ #800E13 · nâu #5A3E32)
var FONT = 'Be Vietnam Pro';
var C = { red: '#800E13', nau: '#5A3E32', be: '#E8DCC8', beL: '#F3EBDD', beXL: '#FAF6EF', line: '#E3D6C1',
  ink: '#2A1C16', mute: '#8A7565', white: '#FFFFFF', ok: '#24461A', okBg: '#D3E5C4', errBg: '#F6E1DE' };

/* ═════════════════════════ 1. NHẬN DỮ LIỆU TỪ WEBSITE ═════════════════════════ */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (x) {
    return json_({ ok: false, loi: 'Hệ thống đang bận, bạn thử lại sau vài giây nhé.' });
  }
  try {
    var d;
    try { d = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
    catch (x) { return json_({ ok: false, loi: 'Dữ liệu gửi lên không hợp lệ.' }); }
    if (d.website) return json_({ ok: true, ma: '', phienBan: PHIEN_BAN }); // ô ẩn chống bot

    var now = new Date();
    var info = {
      laDon: d.nhom === 'don', ten: chu_(d.ten, 120), sdt: chu_(d.sdt, 30), email: chu_(d.email, 200),
      noiDung: chu_(d.noiDung, 3000), loai: chu_(d.loai, 80) || 'Liên hệ', items: [], soDoi: 0, tien: 0
    };
    var sh, row;
    if (info.laDon) {
      info.items = chuanHoaSP_(d);
      if (!info.items.length) return json_({ ok: false, loi: 'Giỏ hàng đang trống.' });
      info.items.forEach(function (x) { info.soDoi += x.sl; info.tien += x.sl * x.gia; });
      info.ma = maMoi_('DON', 'LC-');
      sh = tab_(TAB.DON);
      row = ghi_(sh, {
        'Mã đơn': info.ma, 'Thời gian': now, 'Tên khách': info.ten, 'Số điện thoại': info.sdt, 'Email': info.email,
        'Sản phẩm': info.items.map(moTa_).join('\n'), 'Số đôi': info.soDoi, 'Tạm tính (đ)': info.tien,
        'Ghi chú của khách': info.noiDung, 'Email xác nhận': 'Đang gửi…'
      });
      var ct = tab_(TAB.CT);
      info.items.forEach(function (x) {
        ghi_(ct, {
          'Mã đơn': info.ma, 'Thời gian': now, 'Mẫu': x.mau, 'Dòng': x.dong, 'Size': x.size, 'Khắc tên': x.khac,
          'Số lượng': x.sl, 'Đơn giá (đ)': x.gia, 'Thành tiền (đ)': x.gia * x.sl
        });
      });
    } else {
      info.ma = maMoi_('LH', 'LH-');
      sh = tab_(TAB.LH);
      row = ghi_(sh, {
        'Mã': info.ma, 'Thời gian': now, 'Nguồn': info.loai, 'Tên khách': info.ten, 'Số điện thoại': info.sdt,
        'Email': info.email, 'Size chân': chu_(d.size, 20), 'Mã đơn cần tra': chu_(d.maDon, 40),
        'Nội dung': info.noiDung, 'Email xác nhận': 'Đang gửi…'
      });
    }
    SpreadsheetApp.flush(); // chốt dữ liệu trước khi gửi email
    var kq = guiXacNhan_(info);
    datO_(sh, row, 'Email xác nhận', kq);
    return json_({ ok: true, ma: info.ma, email: kq, phienBan: PHIEN_BAN });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, loi: 'Lỗi máy chủ: ' + String(err).slice(0, 160) });
  } finally {
    lock.releaseLock();
  }
}

// mở URL web app trên trình duyệt để kiểm tra phiên bản đang chạy
function doGet() {
  return json_({ ok: true, app: 'loccoc', phienBan: PHIEN_BAN, don: soDong_(TAB.DON), lienHe: soDong_(TAB.LH) });
}

// chuẩn hoá giỏ hàng: ưu tiên danh sách có cấu trúc, dự phòng đọc từ chữ (web bản cũ)
function chuanHoaSP_(d) {
  var out = [];
  (Array.isArray(d.items) ? d.items.slice(0, 30) : []).forEach(function (x) {
    if (!x) return;
    var mau = chu_(x.ten, 60);
    if (!mau) return;
    var dong = chu_(x.dong, 30) || 'Basic';
    var size = parseInt(x.size, 10);
    out.push({ mau: mau, dong: dong, size: isNaN(size) ? chu_(x.size, 10) : size, khac: chu_(x.khac, 40),
      sl: Math.max(1, Math.min(20, parseInt(x.sl, 10) || 1)), gia: dong === 'Basic' ? GIA_BASIC : 0 });
  });
  if (!out.length && d.gioHang) {
    String(d.gioHang).split('\n').forEach(function (l) {
      var m = l.match(/^\s*-?\s*(.+?) \(([^,)]+)[^)]*\), size ([^,]+?)(?:, khắc "([^"]*)")?, (?:SL|số lượng) (\d+)/);
      if (m) out.push({ mau: m[1].trim(), dong: m[2].trim(), size: parseInt(m[3], 10) || m[3].trim(),
        khac: m[4] || '', sl: Math.max(1, Math.min(20, +m[5])), gia: m[2].trim() === 'Basic' ? GIA_BASIC : 0 });
    });
  }
  return out;
}

function moTa_(x) {
  return x.mau + ' · size ' + x.size + (x.khac ? ' · khắc "' + x.khac + '"' : '') + ' × ' + x.sl;
}

/* ═════════════════════════ 2. EMAIL XÁC NHẬN ═════════════════════════ */

function guiXacNhan_(info) {
  var to = String(info.email || '').trim();
  if (!to) return 'Thiếu email';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return 'Email không hợp lệ';
  try {
    var cache = CacheService.getScriptCache(), k = 'mail_' + to.toLowerCase();
    var n = Number(cache.get(k) || 0);
    if (n >= GIOI_HAN_MOI_GIO) return 'Không gửi: quá ' + GIOI_HAN_MOI_GIO + ' lần/giờ';
    if (MailApp.getRemainingDailyQuota() < 1) return 'Không gửi: hết hạn mức email hôm nay';
    var m = noiDungEmail_(info);
    MailApp.sendEmail({ to: to, subject: m.subject, body: m.text, htmlBody: m.html, name: TEN_GUI });
    cache.put(k, String(n + 1), 3600);
    return 'Đã gửi';
  } catch (err) {
    return 'Không gửi được: ' + String(err).slice(0, 120);
  }
}

function noiDungEmail_(info) {
  var ten = info.ten || 'bạn';
  var tien = function (v) { return Number(v || 0).toLocaleString('vi-VN') + 'đ'; };
  var subject, mo, chiTiet = '', chiTietText = '', luuY;
  if (info.laDon) {
    subject = 'Lộc Cộc đã nhận đơn ' + info.ma + ', cảm ơn bạn nhiều!';
    mo = 'Cảm ơn bạn đã chọn Lộc Cộc! Chúng mình đã nhận được đơn hàng <b>' + esc_(info.ma) + '</b> của bạn:';
    chiTiet = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">' +
      info.items.map(function (x) {
        return '<tr><td style="padding:12px 0;border-bottom:1px solid #E3D6C1;font-size:15px;color:#2A1C16">' +
          '<b>' + esc_(x.mau) + '</b> <span style="color:#8A7565">(' + esc_(x.dong) + ')</span><br>' +
          '<span style="font-size:13px;color:#5A3E32">Size ' + esc_(x.size) + (x.khac ? ' · Khắc "' + esc_(x.khac) + '"' : '') + '</span></td>' +
          '<td align="right" style="padding:12px 0;border-bottom:1px solid #E3D6C1;font-size:15px;color:#5A3E32;white-space:nowrap">× ' + x.sl + '</td></tr>';
      }).join('') +
      '<tr><td style="padding:14px 0 0;font-size:15px;color:#5A3E32">' + info.soDoi + ' đôi</td>' +
      '<td align="right" style="padding:14px 0 0;font-size:16px;color:#800E13"><b>' + (info.tien ? 'Tạm tính ' + tien(info.tien) : '') + '</b></td></tr></table>';
    chiTietText = info.items.map(function (x) { return '- ' + moTa_(x); }).join('\n') +
      '\n' + info.soDoi + ' đôi' + (info.tien ? ' · Tạm tính ' + tien(info.tien) : '');
    luuY = 'Đơn hàng này chỉ nhằm mục đích trải nghiệm và thử nghiệm website: <b>bạn sẽ không bị thu tiền và cũng sẽ không có sản phẩm nào được giao</b>.';
  } else {
    subject = 'Lộc Cộc đã nhận tin nhắn của bạn (' + info.ma + ')';
    mo = 'Cảm ơn bạn đã liên hệ với Lộc Cộc! Chúng mình đã nhận được yêu cầu <b>' + esc_(info.loai) +
      '</b> của bạn, mã <b>' + esc_(info.ma) + '</b>.';
    if (info.noiDung) {
      chiTiet = '<div style="margin:16px 0;padding:14px 16px;background:#FAF6EF;border-left:3px solid #800E13;border-radius:8px;font-size:15px;color:#5A3E32;white-space:pre-line">' + esc_(info.noiDung) + '</div>';
      chiTietText = 'Nội dung: ' + info.noiDung;
    }
    luuY = 'Yêu cầu này chỉ nhằm mục đích trải nghiệm và thử nghiệm website: <b>sẽ không có giao dịch, tư vấn bán hàng hay thu phí nào phát sinh</b>.';
  }
  var thongBao = 'Lộc Cộc là <b>dự án học tập</b> thuộc môn <b>Truyền thông số</b> của sinh viên <b>Trường Đại học Văn Lang</b>. ' + luuY;
  var html =
    '<div style="margin:0;padding:28px 12px;background:#E8DCC8;font-family:\'Be Vietnam Pro\',\'Segoe UI\',Arial,sans-serif">' +
    '<table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:18px;overflow:hidden">' +
    '<tr><td style="background:#800E13;padding:26px 28px">' +
    '<div style="font-size:28px;font-weight:800;letter-spacing:-1px;color:#F3EBDD">lộc cộc</div>' +
    '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E9CFC9;margin-top:6px">Dáng mộc ôm chân · Cân mọi outfit</div>' +
    '</td></tr><tr><td style="padding:28px 28px 8px;color:#2A1C16;font-size:15px;line-height:1.6">' +
    '<p style="margin:0 0 12px;font-size:20px;font-weight:700">Chào ' + esc_(ten) + ',</p>' +
    '<p style="margin:0">' + mo + '</p>' + chiTiet +
    '<div style="margin:22px 0;padding:16px 18px;background:#F3EBDD;border-radius:12px;font-size:14px;color:#5A3E32;line-height:1.6">' +
    '<div style="font-weight:700;color:#800E13;margin-bottom:6px">Lưu ý nhỏ từ Lộc Cộc</div>' + thongBao + '</div>' +
    '<p style="margin:0 0 6px">Cảm ơn bạn đã dành thời gian trải nghiệm và ủng hộ dự án của chúng mình. Mỗi lượt ghé thăm đều là một bước "lộc cộc" thật đáng quý!</p>' +
    '<p style="margin:18px 0 0">Thân mến,<br><b>Team Lộc Cộc</b></p></td></tr>' +
    '<tr><td style="padding:22px 28px 26px;border-top:1px solid #E3D6C1;font-size:12px;color:#8A7565;line-height:1.6">' +
    '<i>Chỉn chu từng chi tiết để lựa chọn không hối tiếc.</i><br>Email tự động từ website Lộc Cộc · loccoc.com.vn · Mã: ' + esc_(info.ma) +
    '</td></tr></table></div>';
  var text = 'Chào ' + ten + ',\n\n' + mo.replace(/<[^>]+>/g, '') + '\n\n' + (chiTietText ? chiTietText + '\n\n' : '') +
    'LƯU Ý: ' + thongBao.replace(/<[^>]+>/g, '') + '\n\nCảm ơn bạn đã dành thời gian trải nghiệm và ủng hộ dự án của chúng mình!\n\nThân mến,\nTeam Lộc Cộc\nloccoc.com.vn';
  return { subject: subject, html: html, text: text };
}

/* ═════════════════════════ 3. MENU + HÀM CHẠY TAY ═════════════════════════ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Lộc Cộc')
    .addItem('Làm mới báo cáo & giao diện', 'lamMoiBaoCao')
    .addItem('Kiểm tra hệ thống', 'kiemTra')
    .addItem('Gửi email thử cho tôi', 'guiEmailThu')
    .addSeparator()
    .addItem('Xoá hết dữ liệu và cài đặt lại…', 'xoaHetVaCaiDatLai')
    .addToUi();
}

// ★ Cài đặt từ đầu: XOÁ TOÀN BỘ các tab trong file, tạo lại cấu trúc + báo cáo, đặt lại mã về 0001
function xoaHetVaCaiDatLai() {
  // chạy từ menu: hỏi xác nhận; chạy từ trình soạn thảo Apps Script: không có hộp thoại, chạy luôn
  var ui = ui_();
  if (ui) {
    var tl = null;
    try { tl = ui.alert('Xoá toàn bộ dữ liệu?', 'Mọi tab trong file sẽ bị xoá và tạo lại từ đầu. Không hoàn tác được.', ui.ButtonSet.YES_NO); } catch (e) { tl = null; }
    if (tl !== null && tl !== ui.Button.YES) return;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tam = ss.insertSheet('_tam_' + Date.now());
  ss.getSheets().forEach(function (s) { if (s.getSheetId() !== tam.getSheetId()) ss.deleteSheet(s); });
  var p = PropertiesService.getScriptProperties();
  p.deleteProperty('so_DON'); p.deleteProperty('so_LH');
  tab_(TAB.DON); tab_(TAB.CT); tab_(TAB.LH);
  taoSoLieu_(); taoBaoCao_();
  ss.deleteSheet(tam);
  sapXepTab_();
  thongBao_('Đã cài đặt lại. Hạn mức email còn hôm nay: ' + MailApp.getRemainingDailyQuota() +
    '. Nhớ cập nhật triển khai lên "Phiên bản mới".');
}

// làm mới giao diện + báo cáo, KHÔNG xoá dữ liệu
function lamMoiBaoCao() {
  [TAB.DON, TAB.CT, TAB.LH].forEach(function (t) { lamDepBang_(tab_(t)); });
  taoSoLieu_(); taoBaoCao_(); sapXepTab_();
  thongBao_('Đã làm mới báo cáo.');
}

function kiemTra() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), dong = [];
  dong.push('Phiên bản code: ' + PHIEN_BAN + ' (URL web app phải trả về cùng số này)');
  dong.push('Tài khoản chạy: ' + Session.getEffectiveUser().getEmail());
  dong.push('File: ' + ss.getName());
  [['DON', TAB.DON], ['CT', TAB.CT], ['LH', TAB.LH]].forEach(function (k) {
    var sh = ss.getSheetByName(k[1]);
    if (!sh) { dong.push('✗ Thiếu tab ' + k[1]); return; }
    var hd = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    var thieu = COT[k[0]].filter(function (c) { return hd.indexOf(c) < 0; });
    dong.push((thieu.length ? '✗ ' : '✓ ') + k[1] + ': ' + soDong_(k[1]) + ' dòng' + (thieu.length ? ' · thiếu cột ' + thieu.join(', ') : ''));
  });
  dong.push((ss.getSheetByName(TAB.BC) ? '✓ ' : '✗ Thiếu ') + TAB.BC);
  dong.push('Định dạng công thức của Sheet: ngăn bằng "' + sep_() + '"');
  dong.push('Múi giờ Sheet: ' + ss.getSpreadsheetTimeZone());
  dong.push('Hạn mức email còn hôm nay: ' + MailApp.getRemainingDailyQuota());
  var thu = chuanHoaSP_({ items: [{ ten: 'Bạc Hà', dong: 'Basic', size: '37', khac: 'Lan', sl: 2 }] });
  dong.push('Thử đọc giỏ hàng: ' + (thu.length === 1 && thu[0].gia === GIA_BASIC && thu[0].sl === 2 ? '✓ ' : '✗ ') + moTa_(thu[0]));
  thongBao_(dong.join('\n'));
}

function guiEmailThu() {
  var toi = Session.getEffectiveUser().getEmail();
  var kq = guiXacNhan_({ laDon: true, ma: 'LC-THU', ten: 'Bạn', email: toi, soDoi: 2, tien: 2 * GIA_BASIC,
    items: [{ mau: 'Bạc Hà', dong: 'Basic', size: 37, khac: 'Lan', sl: 1, gia: GIA_BASIC },
      { mau: 'Nơ Hồng', dong: 'Basic', size: 36, khac: '', sl: 1, gia: GIA_BASIC }] });
  thongBao_('Gửi email thử tới ' + toi + ': ' + kq);
}

/* ═════════════════════════ 4. BẢNG DỮ LIỆU ═════════════════════════ */

function khoaTab_(ten) { for (var k in TAB) if (TAB[k] === ten) return k; return null; }

// lấy tab; nếu chưa có thì tạo + định dạng; nếu thiếu cột thì thêm cột vào cuối
function tab_(ten) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), cot = COT[khoaTab_(ten)];
  var sh = ss.getSheetByName(ten);
  if (!sh) {
    sh = ss.insertSheet(ten);
    sh.getRange(1, 1, 1, cot.length).setValues([cot]);
    lamDepBang_(sh);
    return sh;
  }
  var w = Math.max(1, sh.getLastColumn());
  var hd = sh.getRange(1, 1, 1, w).getValues()[0].map(String);
  if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, cot.length).setValues([cot]); lamDepBang_(sh); return sh; }
  var thieu = cot.filter(function (c) { return hd.indexOf(c) < 0; });
  if (thieu.length) { sh.getRange(1, w + 1, 1, thieu.length).setValues([thieu]); lamDepBang_(sh); }
  return sh;
}

// ghi 1 dòng theo TÊN CỘT; tự điền Ngày/Giờ bằng công thức lấy từ cột Thời gian (theo múi giờ của Sheet)
function ghi_(sh, obj) {
  var hd = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(hd.map(function (h) { return Object.prototype.hasOwnProperty.call(obj, h) ? an_(obj[h]) : ''; }));
  var r = sh.getLastRow();
  var cT = hd.indexOf('Thời gian') + 1, cN = hd.indexOf('Ngày') + 1, cG = hd.indexOf('Giờ') + 1;
  if (cT && cN) sh.getRange(r, cN).setFormulaR1C1('=INT(R[0]C[' + (cT - cN) + '])');
  if (cT && cG) sh.getRange(r, cG).setFormulaR1C1('=HOUR(R[0]C[' + (cT - cG) + '])');
  return r;
}

function datO_(sh, r, tenCot, v) {
  var c = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String).indexOf(tenCot) + 1;
  if (c) sh.getRange(r, c).setValue(an_(v));
}

// mã tự tăng, không trùng kể cả khi xoá bớt dòng
function maMoi_(k, tien) {
  var p = PropertiesService.getScriptProperties();
  var n = Math.max(Number(p.getProperty('so_' + k)) || 0, soDong_(TAB[k])) + 1;
  p.setProperty('so_' + k, String(n));
  return tien + ('000' + n).slice(-4);
}

var RONG = { 'Mã đơn': 92, 'Mã': 92, 'Thời gian': 132, 'Ngày': 88, 'Giờ': 48, 'Tên khách': 170, 'Số điện thoại': 112,
  'Email': 210, 'Sản phẩm': 320, 'Số đôi': 64, 'Tạm tính (đ)': 108, 'Ghi chú của khách': 240, 'Email xác nhận': 150,
  'Ghi chú nội bộ': 200, 'Mẫu': 150, 'Dòng': 76, 'Size': 56, 'Khắc tên': 120, 'Số lượng': 76, 'Đơn giá (đ)': 100,
  'Thành tiền (đ)': 112, 'Nguồn': 170, 'Size chân': 76, 'Mã đơn cần tra': 112, 'Nội dung': 360 };

function lamDepBang_(sh) {
  var ten = sh.getName(), mau = ten === TAB.LH ? C.nau : (ten === TAB.CT ? '#9A5B3C' : C.red);
  var n = sh.getLastColumn(), maxR = sh.getMaxRows();
  if (maxR < 600) { sh.insertRowsAfter(maxR, 600 - maxR); maxR = 600; }
  var hd = sh.getRange(1, 1, 1, n).getValues()[0].map(String);
  var all = sh.getRange(1, 1, maxR, n);
  all.setFontFamily(FONT).setFontSize(10).setFontColor(C.ink).setVerticalAlignment('middle');
  sh.setHiddenGridlines(true); sh.setTabColor(mau); sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, n).setBackground(mau).setFontColor(C.beL).setFontWeight('bold').setWrap(true);
  sh.setRowHeight(1, 40); sh.setRowHeights(2, maxR - 1, 30);
  sh.getBandings().forEach(function (b) { b.remove(); });
  all.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
    .setHeaderRowColor(mau).setFirstRowColor(C.white).setSecondRowColor(C.beXL);
  var cot = function (name) { var i = hd.indexOf(name); return i < 0 ? null : sh.getRange(2, i + 1, maxR - 1, 1); };
  hd.forEach(function (h, i) { sh.setColumnWidth(i + 1, RONG[h] || 120); });
  [['Thời gian', 'dd/MM/yyyy HH:mm'], ['Ngày', 'dd/MM/yyyy'], ['Giờ', '0"h"'], ['Tạm tính (đ)', '#,##0'],
    ['Đơn giá (đ)', '#,##0'], ['Thành tiền (đ)', '#,##0']].forEach(function (f) { var r = cot(f[0]); if (r) r.setNumberFormat(f[1]); });
  ['Mã đơn', 'Mã'].forEach(function (h) { var r = cot(h); if (r) r.setFontWeight('bold').setFontColor(C.red); });
  ['Tên khách', 'Mẫu'].forEach(function (h) { var r = cot(h); if (r) r.setFontWeight('bold'); });
  ['Ngày', 'Giờ', 'Thời gian'].forEach(function (h) { var r = cot(h); if (r) r.setFontColor(C.mute); });
  ['Giờ', 'Số đôi', 'Size', 'Số lượng', 'Size chân'].forEach(function (h) { var r = cot(h); if (r) r.setHorizontalAlignment('center'); });
  ['Sản phẩm', 'Nội dung', 'Ghi chú của khách', 'Ghi chú nội bộ'].forEach(function (h) { var r = cot(h); if (r) r.setWrap(true); });
  var rules = [];
  var em = cot('Email xác nhận');
  if (em) { em.setHorizontalAlignment('center').setFontWeight('bold').setWrap(true); rules = nhanEmail_(em); }
  sh.setConditionalFormatRules(rules);
}

function nhanEmail_(range) {
  var b = SpreadsheetApp.newConditionalFormatRule;
  return [
    b().whenTextEqualTo('Đã gửi').setFontColor(C.ok).setBackground(C.okBg).setRanges([range]).build(),
    b().whenTextEqualTo('Thiếu email').setFontColor('#7A7A7A').setBackground('#EDEDED').setRanges([range]).build(),
    b().whenTextEqualTo('Email không hợp lệ').setFontColor(C.red).setBackground(C.errBg).setRanges([range]).build(),
    b().whenTextStartsWith('Không').setFontColor(C.red).setBackground(C.errBg).setRanges([range]).build(),
    b().whenTextStartsWith('Đang').setFontColor(C.nau).setBackground(C.beL).setRanges([range]).build()
  ];
}

/* ═════════════════════════ 5. SỐ LIỆU CHO BÁO CÁO ═════════════════════════ */

// tham chiếu cột theo tên: R_('DON','Ngày') → "'🛒 Đơn hàng'!C2:C"
function L_(k, name) { var i = COT[k].indexOf(name); if (i < 0) throw new Error('Thiếu cột ' + name); return colChu_(i + 1); }
function R_(k, name, tu) { var l = L_(k, name); return "'" + TAB[k] + "'!$" + l + '$' + (tu || 2) + ':$' + l; }
function colChu_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

function taoSoLieu_() {
  var sh = lamMoiTab_(TAB.SL, 40, 20);
  sh.setTabColor('#9E9E9E');
  var DN = R_('DON', 'Ngày'), DG = R_('DON', 'Giờ'), LN = R_('LH', 'Ngày'), LG = R_('LH', 'Giờ');
  // A: 30 ngày gần nhất
  sh.getRange('A1:E1').setValues([['Ngày', 'Đơn hàng', 'Liên hệ', 'Số đôi', 'Tạm tính']]);
  ct_(sh, 'A2', '=SEQUENCE(30,1,TODAY()-29,1)');
  var fA = [];
  for (var i = 2; i <= 31; i++) fA.push([
    '=COUNTIF(' + DN + ',$A' + i + ')', '=COUNTIF(' + LN + ',$A' + i + ')',
    '=SUMIF(' + DN + ',$A' + i + ',' + R_('DON', 'Số đôi') + ')', '=SUMIF(' + DN + ',$A' + i + ',' + R_('DON', 'Tạm tính (đ)') + ')']);
  cts_(sh, 'B2:E31', fA);
  sh.getRange('A2:A31').setNumberFormat('dd/MM');
  // G: mẫu được đặt nhiều nhất (cột Mẫu..Số lượng của Chi tiết đơn)
  var ctM = L_('CT', 'Mẫu'), ctS = L_('CT', 'Số lượng'), ctZ = L_('CT', 'Size');
  ct_(sh, 'G1', '=IFERROR(QUERY(\'' + TAB.CT + '\'!$' + ctM + '$1:$' + ctS + ',"select ' + ctM + ', sum(' + ctS + ') where ' + ctM +
    ' <> \'\' group by ' + ctM + ' order by sum(' + ctS + ') desc limit 10 label ' + ctM + ' \'Mẫu\', sum(' + ctS + ') \'Số đôi\'",1),"Chưa có")');
  // J: phân bố size
  ct_(sh, 'J1', '=IFERROR(QUERY(\'' + TAB.CT + '\'!$' + ctZ + '$1:$' + ctS + ',"select ' + ctZ + ', sum(' + ctS + ') where ' + ctZ +
    ' is not null group by ' + ctZ + ' order by ' + ctZ + ' label ' + ctZ + ' \'Size\', sum(' + ctS + ') \'Số đôi\'",1),"Chưa có")');
  // M: nguồn khách gửi form
  var nguon = [['Nguồn', 'Lượt gửi'], ['Đặt hàng (giỏ hàng)', '']].concat(NGUON.map(function (x) { return [x, '']; })).concat([['Khác', '']]);
  sh.getRange(1, 13, nguon.length, 2).setValues(nguon);
  var fN = [['=COUNTA(' + R_('DON', 'Mã đơn') + ')']];
  NGUON.forEach(function (x, j) { fN.push(['=COUNTIF(' + R_('LH', 'Nguồn') + ',$M' + (j + 3) + ')']); });
  fN.push(['=COUNTA(' + R_('LH', 'Mã') + ')-SUM(N3:N' + (NGUON.length + 2) + ')']);
  cts_(sh, 'N2:N' + (nguon.length), fN);
  // P: khung giờ
  sh.getRange('P1:R1').setValues([['Giờ', 'Đơn hàng', 'Liên hệ']]);
  ct_(sh, 'P2', '=SEQUENCE(24,1,0,1)');
  var fG = [];
  for (var h = 2; h <= 25; h++) fG.push(['=COUNTIF(' + DG + ',$P' + h + ')', '=COUNTIF(' + LG + ',$P' + h + ')']);
  cts_(sh, 'Q2:R25', fG);
  sh.getRange('P2:P25').setNumberFormat('0"h"');
  sh.getRange('A1:R1').setFontWeight('bold').setBackground(C.beL);
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily(FONT).setFontSize(10);
  sh.getRange('T1').setValue('Tab này chỉ để tính số liệu cho "📊 Báo cáo" — không cần sửa.').setFontColor(C.mute);
}

/* ═════════════════════════ 6. DASHBOARD BÁO CÁO ═════════════════════════ */

function taoBaoCao_() {
  var tk = lamMoiTab_(TAB.BC, 90, 14);
  var S = "'" + TAB.SL + "'!";
  var DM = R_('DON', 'Mã đơn'), DN = R_('DON', 'Ngày'), LM = R_('LH', 'Mã'), LN = R_('LH', 'Ngày');
  tk.getRange(1, 1, tk.getMaxRows(), tk.getMaxColumns())
    .setFontFamily(FONT).setFontColor(C.ink).setBackground(C.beXL).setVerticalAlignment('middle');
  tk.setHiddenGridlines(true); tk.setTabColor(C.ink);
  tk.setColumnWidth(1, 24); tk.setColumnWidths(2, 12, 96); tk.setColumnWidth(14, 24);
  tk.setRowHeights(1, 90, 24); tk.setRowHeight(1, 14);

  tk.getRange('B2:M2').merge().setValue('LỘC CỘC  ·  BÁO CÁO ĐƠN HÀNG & LIÊN HỆ')
    .setBackground(C.red).setFontColor(C.beL).setFontSize(18).setFontWeight('bold');
  tk.setRowHeight(2, 56);
  tk.getRange('B3:M3').merge().setBackground(C.red).setFontColor('#E9CFC9').setFontSize(9);
  ct_(tk, 'B3', '="Cập nhật lúc "&TEXT(NOW(),"dd/mm/yyyy hh:mm")&"  ·  Dữ liệu tự động từ loccoc.com.vn  ·  Dự án học tập môn Truyền thông số, Trường Đại học Văn Lang"');
  tk.setRowHeight(3, 26); tk.setRowHeight(4, 16);

  var hn = function (rng) { return 'COUNTIF(' + rng + ',TODAY())'; };
  var hq = function (rng) { return 'COUNTIF(' + rng + ',TODAY()-1)'; };
  var t7 = function (rng) { return 'COUNTIF(' + rng + ',">="&(TODAY()-6))'; };
  var p7 = function (rng) { return '(COUNTIF(' + rng + ',">="&(TODAY()-13))-' + t7(rng) + ')'; };
  var dTxt = function (cur, prev, chu) {
    return '=IF(' + prev + '=0,IF(' + cur + '=0,"Bằng ' + chu + '","▲ mới so với ' + chu + '"),IF(' + cur + '>=' + prev +
      ',"▲ ","▼ ")&TEXT(ABS(' + cur + '-' + prev + ')/' + prev + ',"0%")&" so với ' + chu + '")';
  };
  var cot = ['B', 'E', 'H', 'K'];
  the_(tk, 5, cot[0], 'TỔNG SỐ ĐƠN', '=COUNTA(' + DM + ')', '="Hôm nay: "&' + hn(DN), C.red, '0');
  the_(tk, 5, cot[1], 'TỔNG SỐ ĐÔI ĐẶT', '=SUM(' + R_('DON', 'Số đôi') + ')', '="Trung bình "&ROUND(IFERROR(SUM(' + R_('DON', 'Số đôi') + ')/COUNTA(' + DM + '),0),1)&" đôi/đơn"', C.red, '0');
  the_(tk, 5, cot[2], 'TẠM TÍNH', '=SUM(' + R_('DON', 'Tạm tính (đ)') + ')', '="Chỉ mang tính minh hoạ"', C.red, '#,##0" đ"');
  the_(tk, 5, cot[3], 'TỔNG LIÊN HỆ', '=COUNTA(' + LM + ')', '="Hôm nay: "&' + hn(LN), C.nau, '0');
  the_(tk, 10, cot[0], 'ĐƠN HÔM NAY', '=' + hn(DN), dTxt(hn(DN), hq(DN), 'hôm qua'), C.red, '0');
  the_(tk, 10, cot[1], 'ĐƠN 7 NGÀY QUA', '=' + t7(DN), dTxt(t7(DN), p7(DN), '7 ngày trước'), C.red, '0');
  the_(tk, 10, cot[2], 'LIÊN HỆ HÔM NAY', '=' + hn(LN), dTxt(hn(LN), hq(LN), 'hôm qua'), C.nau, '0');
  var guiOk = 'COUNTIF(' + R_('DON', 'Email xác nhận') + ',"Đã gửi")+COUNTIF(' + R_('LH', 'Email xác nhận') + ',"Đã gửi")';
  var tongEm = 'COUNTA(' + R_('DON', 'Email xác nhận') + ')+COUNTA(' + R_('LH', 'Email xác nhận') + ')';
  the_(tk, 10, cot[3], 'EMAIL XÁC NHẬN ĐÃ GỬI', '=' + guiOk, '="Chưa gửi được: "&(' + tongEm + '-(' + guiOk + '))', C.nau, '0');
  tk.setRowHeight(9, 12); tk.setRowHeight(14, 18);
  var notes = tk.getRange('B13:M13');
  var b = SpreadsheetApp.newConditionalFormatRule;
  var rules = [
    b().whenTextStartsWith('▲').setFontColor('#2F6B22').setRanges([notes]).build(),
    b().whenTextStartsWith('▼').setFontColor(C.red).setRanges([notes]).build()
  ];

  // biểu đồ
  tieuDe_(tk, 'B15:M15', 'XU HƯỚNG 30 NGÀY: ĐƠN HÀNG & LIÊN HỆ', C.red);
  chart_(tk, Charts.ChartType.COLUMN, S + 'A1:C31', 16, 2, 1150, 300, { colors: [C.red, '#B08A5E'], legend: 'top' });
  tieuDe_(tk, 'B30:G30', 'MẪU ĐƯỢC ĐẶT NHIỀU NHẤT', C.red);
  tieuDe_(tk, 'H30:M30', 'PHÂN BỐ SIZE CHÂN', C.red);
  chart_(tk, Charts.ChartType.BAR, S + 'G1:H11', 31, 2, 570, 300, { colors: [C.red], legend: 'none' });
  chart_(tk, Charts.ChartType.COLUMN, S + 'J1:K16', 31, 8, 570, 300, { colors: [C.nau], legend: 'none' });
  tieuDe_(tk, 'B45:G45', 'KHÁCH GỬI TỪ FORM NÀO', C.nau);
  tieuDe_(tk, 'H45:M45', 'KHUNG GIỜ KHÁCH GỬI FORM', C.nau);
  chart_(tk, Charts.ChartType.PIE, S + 'M1:N11', 46, 2, 570, 300,
    { colors: [C.red, C.nau, '#B08A5E', '#D8C7AA', '#9A1A20', '#3E2A21', '#C9A27E', '#7A5C4E', '#E3D6C1', '#5E0A0E'], legend: 'right', pieHole: 0.5 });
  chart_(tk, Charts.ChartType.COLUMN, S + 'P1:R25', 46, 8, 570, 300, { colors: [C.red, '#B08A5E'], legend: 'top', stacked: true });

  // bảng mới nhất
  var D = "'" + TAB.DON + "'!", L = "'" + TAB.LH + "'!";
  tieuDe_(tk, 'B60:M60', '10 ĐƠN HÀNG MỚI NHẤT', C.red);
  var q1 = 'select ' + ['Mã đơn', 'Thời gian', 'Tên khách', 'Số đôi', 'Tạm tính (đ)', 'Email xác nhận', 'Sản phẩm'].map(function (h) { return L_('DON', h); }).join(', ') +
    ' where ' + L_('DON', 'Mã đơn') + " <> '' order by " + L_('DON', 'Thời gian') + ' desc limit 10';
  ct_(tk, 'B61', '=IFERROR(QUERY(' + D + 'A1:' + colChu_(COT.DON.length) + ',"' + q1 + '",1),"Chưa có đơn")');
  bangNho_(tk, 'B61:M61', 'B62:M71');
  tk.getRange('B62:B71').setFontWeight('bold').setFontColor(C.red);
  tk.getRange('C62:C71').setNumberFormat('dd/MM HH:mm').setFontColor(C.mute);
  tk.getRange('E62:E71').setHorizontalAlignment('center');
  tk.getRange('F62:F71').setNumberFormat('#,##0" đ"');
  tk.getRange('G62:G71').setFontSize(9).setHorizontalAlignment('center');
  tk.getRange('H62:H71').setWrap(false);
  rules = rules.concat(nhanEmail_(tk.getRange('G62:G71')));

  tieuDe_(tk, 'B73:M73', '5 LIÊN HỆ MỚI NHẤT', C.nau);
  var q2 = 'select ' + ['Mã', 'Thời gian', 'Nguồn', 'Tên khách', 'Email xác nhận', 'Nội dung'].map(function (h) { return L_('LH', h); }).join(', ') +
    ' where ' + L_('LH', 'Mã') + " <> '' order by " + L_('LH', 'Thời gian') + ' desc limit 5';
  ct_(tk, 'B74', '=IFERROR(QUERY(' + L + 'A1:' + colChu_(COT.LH.length) + ',"' + q2 + '",1),"Chưa có liên hệ")');
  bangNho_(tk, 'B74:M74', 'B75:M79');
  tk.getRange('B75:B79').setFontWeight('bold').setFontColor(C.nau);
  tk.getRange('C75:C79').setNumberFormat('dd/MM HH:mm').setFontColor(C.mute);
  tk.getRange('F75:F79').setFontSize(9).setHorizontalAlignment('center');
  tk.getRange('G75:G79').setWrap(false);
  rules = rules.concat(nhanEmail_(tk.getRange('F75:F79')));
  tk.setConditionalFormatRules(rules);
}

function the_(tk, r, c0, nhan, fSo, fGhiChu, mau, fmt) {
  var c = tk.getRange(c0 + '1').getColumn();
  var khoi = tk.getRange(r, c, 4, 3);
  khoi.setBackground(C.white);
  tk.getRange(r, c, 1, 3).merge().setValue(nhan).setFontSize(8).setFontWeight('bold')
    .setFontColor(C.mute).setHorizontalAlignment('center').setVerticalAlignment('bottom');
  tk.getRange(r + 1, c, 2, 3).merge().setFontSize(26).setFontWeight('bold').setFontColor(mau)
    .setHorizontalAlignment('center').setNumberFormat(fmt);
  ct_(tk, colChu_(c) + (r + 1), fSo);
  tk.getRange(r + 3, c, 1, 3).merge().setFontSize(8).setFontColor(C.mute)
    .setHorizontalAlignment('center').setVerticalAlignment('top');
  ct_(tk, colChu_(c) + (r + 3), fGhiChu);
  khoi.setBorder(true, true, true, true, null, null, C.beXL, SpreadsheetApp.BorderStyle.SOLID_THICK);
  tk.getRange(r, c, 1, 3).setBorder(true, null, null, null, null, null, mau, SpreadsheetApp.BorderStyle.SOLID_THICK);
  tk.setRowHeight(r, 30); tk.setRowHeights(r + 1, 2, 26); tk.setRowHeight(r + 3, 24);
}

function tieuDe_(tk, a1, chu, mau) {
  tk.getRange(a1).merge().setValue(chu).setFontSize(10).setFontWeight('bold').setFontColor(mau)
    .setVerticalAlignment('bottom')
    .setBorder(null, null, true, null, null, null, mau, SpreadsheetApp.BorderStyle.SOLID);
  tk.setRowHeight(tk.getRange(a1).getRow(), 30);
}

function bangNho_(tk, dau, than) {
  tk.getRange(dau).setBackground(C.beL).setFontWeight('bold').setFontColor(C.nau).setFontSize(9);
  tk.getRange(than).setBackground(C.white).setFontSize(10)
    .setBorder(null, null, null, null, null, true, C.line, SpreadsheetApp.BorderStyle.SOLID);
}

function chart_(tk, loai, a1, row, col, w, h, o) {
  var src = SpreadsheetApp.getActiveSpreadsheet().getRange(a1);
  var b = tk.newChart().setChartType(loai).addRange(src).setNumHeaders(1).setPosition(row, col, 0, 6)
    .setOption('width', w).setOption('height', h).setOption('fontName', FONT)
    .setOption('backgroundColor', C.white).setOption('colors', o.colors)
    .setOption('legend', { position: o.legend, textStyle: { color: C.ink, fontSize: 10 } })
    .setOption('chartArea', { left: 60, top: 30, width: '75%', height: '70%' });
  if (o.pieHole) b = b.setOption('pieHole', o.pieHole).setOption('chartArea', { left: 20, top: 20, width: '90%', height: '85%' });
  if (o.stacked) b = b.setOption('isStacked', true);
  if (loai !== Charts.ChartType.PIE) b = b.setOption('vAxis', { minValue: 0, gridlines: { color: C.line } });
  tk.insertChart(b.build());
}

/* ═════════════════════════ 7. TIỆN ÍCH ═════════════════════════ */

// tạo mới (hoặc làm sạch) một tab báo cáo/số liệu: xoá biểu đồ, gộp ô, định dạng, nội dung
function lamMoiTab_(ten, soDong, soCot) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ten) || ss.insertSheet(ten);
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
  sh.clear(); sh.clearConditionalFormatRules();
  if (sh.getMaxRows() < soDong) sh.insertRowsAfter(sh.getMaxRows(), soDong - sh.getMaxRows());
  if (sh.getMaxColumns() < soCot) sh.insertColumnsAfter(sh.getMaxColumns(), soCot - sh.getMaxColumns());
  return sh;
}

function sapXepTab_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [TAB.BC, TAB.DON, TAB.CT, TAB.LH, TAB.SL].forEach(function (t, i) {
    var sh = ss.getSheetByName(t);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); }
  });
  var bc = ss.getSheetByName(TAB.BC);
  if (bc) ss.setActiveSheet(bc);
}

// dấu ngăn đối số trong công thức của Sheet: "," (định dạng Mỹ) hoặc ";" (định dạng Việt Nam…)
var SEP_CACHE_ = null;
function sep_() {
  if (SEP_CACHE_) return SEP_CACHE_;
  var ss = SpreadsheetApp.getActiveSpreadsheet(), tam = ss.insertSheet('_thu_' + Date.now());
  var r = tam.getRange('A1');
  r.setFormula('=IF(TRUE,7,8)');
  SpreadsheetApp.flush();
  SEP_CACHE_ = r.getValue() === 7 ? ',' : ';';
  ss.deleteSheet(tam);
  return SEP_CACHE_;
}
function f_(s) {
  if (sep_() === ',') return s;
  var out = '', q = false;
  for (var i = 0; i < s.length; i++) { var c = s.charAt(i); if (c === '"') q = !q; out += (c === ',' && !q) ? ';' : c; }
  return out;
}
function ct_(sh, a1, f) { sh.getRange(a1).setFormula(f_(f)); }
function cts_(sh, a1, arr) { sh.getRange(a1).setFormulas(arr.map(function (r) { return r.map(f_); })); }

function soDong_(ten) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ten);
  return sh ? Math.max(0, sh.getLastRow() - 1) : 0;
}

// chuỗi gọn, cắt độ dài
function chu_(v, max) { return String(v == null ? '' : v).replace(/\s+$/g, '').replace(/^\s+/g, '').slice(0, max || 500); }
// chống chuỗi bị Sheet hiểu thành công thức; giữ số 0 đầu của SĐT
function an_(v) {
  if (typeof v !== 'string' || v === '') return v;
  return /^[=+\-@0]/.test(v) ? "'" + v : v;
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function ui_() { try { return SpreadsheetApp.getUi(); } catch (e) { return null; } }
function thongBao_(msg) {
  Logger.log(msg);
  var ui = ui_();
  if (ui) { try { ui.alert('Lộc Cộc', msg, ui.ButtonSet.OK); } catch (e) { } }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
