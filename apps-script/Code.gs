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
 * 2. Chọn hàm "kiemTra" → Chạy → cấp quyền (có quyền "gửi email thay bạn"). Hàm này chỉ đọc, KHÔNG xoá gì.
 *    ⚠ KHÔNG chạy "xoaHetVaCaiDatLai" khi cập nhật code: hàm đó XOÁ SẠCH mọi tab (đơn hàng, liên hệ, bài viết…).
 *    Chỉ dùng cho file Sheet mới tinh, và chỉ chạy được từ menu Sheet (có hộp thoại xác nhận).
 * 3. Triển khai → Quản lý triển khai → bút chì ✎ → Phiên bản: "Phiên bản mới" → Triển khai.
 *    ⚠ Bỏ bước 3 thì website vẫn chạy CODE CŨ (lỗi xô cột, không gửi email).
 * 4. Mở URL ứng dụng web trên trình duyệt: phải thấy "phienBan" đúng số PHIEN_BAN bên dưới.
 * 5. (v4) Menu Lộc Cộc → "Đặt tài khoản quản trị…" = tài khoản ADMIN CHÍNH. Admin chính tạo tài khoản admin phụ
 *    cho thành viên ngay trên trang quản trị (mục Thành viên); mọi thao tác được ghi ở tab "🕘 Nhật ký".
 * Sau đó dùng menu "Lộc Cộc" ngay trên thanh menu của Sheet (tải lại Sheet nếu chưa thấy).
 * ───────────────────────────────────────────────────────────────────────────
 */

var PHIEN_BAN = '4.2';
var TEN_GUI = 'Lộc Cộc';            // tên người gửi trong email
var GIA_BASIC = 350000;             // giá dòng Basic (tính lại ở máy chủ, không tin giá từ trình duyệt)
var GIOI_HAN_MOI_GIO = 3;           // tối đa email gửi tới cùng 1 địa chỉ trong 1 giờ
var CHO_GUI = 'Chờ gửi';            // trạng thái cột "Email xác nhận" khi email còn trong hàng chờ
var HANG_CHO = 'thu_';              // tiền tố Script Properties của email chờ gửi

var TAB = { BC: '📊 Báo cáo', DON: '🛒 Đơn hàng', CT: '📦 Chi tiết đơn', LH: '💬 Liên hệ', SL: '⚙ Số liệu',
  BV: '📰 Bài viết', XEM: '👁 Lượt xem', NK: '🕘 Nhật ký' };
var COT = {
  DON: ['Mã đơn', 'Thời gian', 'Ngày', 'Giờ', 'Tên khách', 'Số điện thoại', 'Email', 'Sản phẩm', 'Số đôi',
    'Tạm tính (đ)', 'Ghi chú của khách', 'Email xác nhận', 'Ghi chú nội bộ', 'Trạng thái'],
  CT: ['Mã đơn', 'Thời gian', 'Ngày', 'Mẫu', 'Dòng', 'Size', 'Khắc tên', 'Số lượng', 'Đơn giá (đ)', 'Thành tiền (đ)'],
  LH: ['Mã', 'Thời gian', 'Ngày', 'Giờ', 'Nguồn', 'Tên khách', 'Số điện thoại', 'Email', 'Size chân',
    'Mã đơn cần tra', 'Nội dung', 'Email xác nhận', 'Ghi chú nội bộ', 'Trạng thái'],
  BV: ['Mã', 'Tiêu đề', 'Đường dẫn', 'Tóm tắt', 'Ảnh bìa', 'Nội dung', 'Trạng thái', 'Xuất bản lúc', 'Tạo lúc', 'Cập nhật lúc',
    'Tạo bởi', 'Cập nhật bởi'],
  XEM: ['Thời gian', 'Ngày', 'Khách', 'Phiên', 'Trang', 'Nguồn', 'Thiết bị'],
  NK: ['Thời gian', 'Tài khoản', 'Vai trò', 'Hành động', 'Chi tiết']
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
  var d0;
  try { d0 = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { d0 = {}; }
  if (d0.hanh === 'xem') return json_(ghiLuotXem_(d0));   // lượt xem trang: không cần khoá
  if (d0.hanh) return json_(quanTri_(d0));                // trang quản trị
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
    var sh;
    if (info.laDon) {
      info.items = chuanHoaSP_(d);
      if (!info.items.length) return json_({ ok: false, loi: 'Giỏ hàng đang trống.' });
      info.items.forEach(function (x) { info.soDoi += x.sl; info.tien += x.sl * x.gia; });
      info.ma = maMoi_('DON', 'LC-');
      sh = tab_(TAB.DON);
      ghi_(sh, [{
        'Mã đơn': info.ma, 'Thời gian': now, 'Tên khách': info.ten, 'Số điện thoại': info.sdt, 'Email': info.email,
        'Sản phẩm': info.items.map(moTa_).join('\n'), 'Số đôi': info.soDoi, 'Tạm tính (đ)': info.tien,
        'Ghi chú của khách': info.noiDung, 'Email xác nhận': CHO_GUI
      }]);
      ghi_(tab_(TAB.CT), info.items.map(function (x) {
        return {
          'Mã đơn': info.ma, 'Thời gian': now, 'Mẫu': x.mau, 'Dòng': x.dong, 'Size': x.size, 'Khắc tên': x.khac,
          'Số lượng': x.sl, 'Đơn giá (đ)': x.gia, 'Thành tiền (đ)': x.gia * x.sl
        };
      }));
    } else {
      info.ma = maMoi_('LH', 'LH-');
      sh = tab_(TAB.LH);
      ghi_(sh, [{
        'Mã': info.ma, 'Thời gian': now, 'Nguồn': info.loai, 'Tên khách': info.ten, 'Số điện thoại': info.sdt,
        'Email': info.email, 'Size chân': chu_(d.size, 20), 'Mã đơn cần tra': chu_(d.maDon, 40),
        'Nội dung': info.noiDung, 'Email xác nhận': CHO_GUI
      }]);
    }
    // email gửi ở nền (guiEmailCho, chạy mỗi phút) để khách không phải chờ MailApp
    PropertiesService.getScriptProperties().setProperty(HANG_CHO + info.ma, JSON.stringify({ tab: sh.getName(), info: info }));
    SpreadsheetApp.flush(); // chốt dữ liệu trước khi nhả khoá
    return json_({ ok: true, ma: info.ma, email: CHO_GUI, phienBan: PHIEN_BAN });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, loi: 'Lỗi máy chủ: ' + String(err).slice(0, 160) });
  } finally {
    lock.releaseLock();
  }
}

// mở URL web app trên trình duyệt để kiểm tra phiên bản đang chạy
function doGet(e) {
  if (e && e.parameter && e.parameter.hanh === 'bai') return json_({ ok: true, bai: baiCongKhai_() });
  return json_({ ok: true, app: 'loccoc', phienBan: PHIEN_BAN, don: soDong_(TAB.DON), lienHe: soDong_(TAB.LH),
    emailNen: coEmailNen_(), choGui: soEmailCho_() });
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

// ★ chạy nền mỗi phút (bật bằng menu "Lộc Cộc → Bật gửi email nền"): gửi các email trong hàng chờ
function guiEmailCho() {
  var lock = LockService.getDocumentLock(); // khoá riêng, không chặn doPost (doPost dùng ScriptLock)
  if (!lock.tryLock(1000)) return;          // lượt trước chưa xong thì bỏ qua lượt này
  try {
    var p = PropertiesService.getScriptProperties(), all = p.getProperties();
    Object.keys(all).forEach(function (k) {
      if (k.indexOf(HANG_CHO) !== 0) return;
      var job;
      try { job = JSON.parse(all[k]); } catch (e) { p.deleteProperty(k); return; }
      var kq = guiXacNhan_(job.info);
      p.deleteProperty(k);
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(job.tab);
      var o = sh && sh.createTextFinder(job.info.ma).matchEntireCell(true).findNext();
      if (o) datO_(sh, o.getRow(), 'Email xác nhận', kq);
    });
  } finally {
    lock.releaseLock();
  }
}

function batEmailNen() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'guiEmailCho') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('guiEmailCho').timeBased().everyMinutes(1).create();
  thongBao_('Đã bật gửi email nền: email cảm ơn sẽ tới khách trong khoảng 1 phút sau khi gửi form.');
}

function coEmailNen_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'guiEmailCho'; });
}

function soEmailCho_() {
  return Object.keys(PropertiesService.getScriptProperties().getProperties())
    .filter(function (k) { return k.indexOf(HANG_CHO) === 0; }).length;
}

function noiDungEmail_(info) {
  var ten = info.ten || 'bạn', M = MAU_MAIL;
  var tien = function (v) { return Number(v || 0).toLocaleString('vi-VN') + 'đ'; };
  var subject, mo, chiTiet = '', chiTietText = '', luuY;
  if (info.laDon) {
    subject = 'Lộc Cộc đã nhận đơn ' + info.ma + ', cảm ơn bạn nhiều!';
    mo = 'Cảm ơn bạn đã chọn Lộc Cộc! Chúng mình đã nhận được đơn hàng <b style="color:' + M.do + '">' + esc_(info.ma) + '</b> của bạn:';
    chiTiet = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:18px 0 6px">' +
      info.items.map(function (x) {
        return '<tr><td width="100%" style="padding:12px 12px 12px 0;border-bottom:1px solid ' + M.vach + ';font-size:15px;color:' + M.dam + '">' +
          '<b>' + esc_(x.mau) + '</b> <span style="color:' + M.mo + '">· ' + esc_(x.dong) + '</span><br>' +
          '<span style="font-size:13px;color:' + M.mo + '">Size ' + esc_(x.size) + (x.khac ? ' · Khắc "' + esc_(x.khac) + '"' : '') + '</span></td>' +
          '<td align="right" style="padding:12px 0;border-bottom:1px solid ' + M.vach + ';font-size:15px;color:' + M.nau + ';white-space:nowrap">× ' + x.sl + '</td></tr>';
      }).join('') +
      // dòng tổng là bảng riêng để chữ "Tạm tính …" không làm cột "× SL" phía trên rộng ra
      '<tr><td colspan="2" style="padding:14px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
      '<td style="font-size:15px;color:' + M.nau + '">' + info.soDoi + ' đôi</td>' +
      '<td align="right" style="font-size:17px;color:' + M.do + ';white-space:nowrap"><b>' + (info.tien ? 'Tạm tính ' + tien(info.tien) : '') + '</b></td>' +
      '</tr></table></td></tr></table>';
    chiTietText = info.items.map(function (x) { return '- ' + moTa_(x); }).join('\n') +
      '\n' + info.soDoi + ' đôi' + (info.tien ? ' · Tạm tính ' + tien(info.tien) : '');
    luuY = 'Đơn hàng này chỉ nhằm mục đích trải nghiệm và thử nghiệm website: <b>bạn sẽ không bị thu tiền và cũng sẽ không có sản phẩm nào được giao</b>.';
  } else {
    subject = 'Lộc Cộc đã nhận tin nhắn của bạn (' + info.ma + ')';
    mo = 'Cảm ơn bạn đã liên hệ với Lộc Cộc! Chúng mình đã nhận được yêu cầu <b>' + esc_(info.loai) +
      '</b> của bạn, mã <b style="color:' + M.do + '">' + esc_(info.ma) + '</b>.';
    if (info.noiDung) {
      chiTiet = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:18px 0 6px"><tr>' +
        '<td width="3" style="' + nen_(M.do) + 'font-size:0">&nbsp;</td>' +
        '<td style="background:' + M.hop + ';padding:14px 16px;font-size:15px;color:' + M.nau + ';white-space:pre-line">' + esc_(info.noiDung) + '</td></tr></table>';
      chiTietText = 'Nội dung: ' + info.noiDung;
    }
    luuY = 'Yêu cầu này chỉ nhằm mục đích trải nghiệm và thử nghiệm website: <b>sẽ không có giao dịch, tư vấn bán hàng hay thu phí nào phát sinh</b>.';
  }
  var thongBao = 'Lộc Cộc là <b>dự án học tập</b> thuộc môn <b>Truyền thông số</b> của sinh viên <b>Trường Đại học Văn Lang</b>. ' + luuY;
  // Thân email tông sáng (be nhạt, chữ nâu); khi Gmail để chế độ tối, phần này tự đảo thành nâu đậm, chữ sáng.
  // Riêng thanh đầu được khoá màu: nền gradient đỏ + logo là ảnh + chữ trắng bọc trang_() nên giữ nguyên ở mọi chế độ.
  var o = 'padding:0 32px;font-size:15px;line-height:1.65;color:' + M.nau;
  var html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
    '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
    '<style>u + .body .lc-s{background:#000;mix-blend-mode:screen}u + .body .lc-d{background:#000;mix-blend-mode:difference}</style>' +
    '</head><body class="body" style="margin:0;padding:0;background:' + M.be + '">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + M.be + ';font-family:\'Plus Jakarta Sans\',\'Be Vietnam Pro\',\'Segoe UI\',Arial,sans-serif"><tr><td style="padding:28px 12px">' +
    '<table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:' + M.the + ';border-radius:18px;overflow:hidden">' +
    '<tr><td style="' + nen_(M.do) + 'padding:28px 32px 24px">' +
    '<img src="' + LOGO_MAIL + '" width="170" alt="Lộc Cộc" style="display:block;width:170px;max-width:60%;height:auto;border:0">' +
    '<div style="font-size:13px;letter-spacing:0.3px;color:#FFFFFF;margin-top:12px">' + trang_('Chỉn chu từng chi tiết - Cho bạn lựa chọn không hối tiếc') + '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:30px 32px 0;font-size:21px;font-weight:700;color:' + M.dam + '">Chào ' + esc_(ten) + ',</td></tr>' +
    '<tr><td style="' + o + ';padding-top:10px">' + mo + '</td></tr>' +
    '<tr><td style="padding:0 32px">' + chiTiet + '</td></tr>' +
    '<tr><td style="padding:16px 32px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + M.hop + ';border-radius:12px">' +
    '<tr><td style="padding:16px 18px;font-size:14px;line-height:1.6;color:' + M.nau + '">' +
    '<div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:' + M.do + ';margin-bottom:6px">Lưu ý nhỏ từ Lộc Cộc</div>' + thongBao +
    '</td></tr></table></td></tr>' +
    '<tr><td style="' + o + '">Cảm ơn bạn đã dành thời gian trải nghiệm và ủng hộ dự án của chúng mình. Mỗi lượt ghé thăm đều là một bước "lộc cộc" thật đáng quý!</td></tr>' +
    '<tr><td style="' + o + ';padding-top:18px;padding-bottom:26px">Thân mến,<br><b style="color:' + M.dam + '">Team Lộc Cộc</b></td></tr>' +
    '<tr><td style="padding:18px 32px 24px;border-top:1px solid ' + M.vach + ';font-size:12px;line-height:1.6;color:' + M.mo + '">' +
    '<i>Dáng mộc ôm chân, cân mọi outfit.</i><br>Email tự động từ website Lộc Cộc · loccoc.com.vn · Mã: ' + esc_(info.ma) +
    '</td></tr></table></td></tr></table></body></html>';
  var text = 'Chào ' + ten + ',\n\n' + mo.replace(/<[^>]+>/g, '') + '\n\n' + (chiTietText ? chiTietText + '\n\n' : '') +
    'LƯU Ý: ' + thongBao.replace(/<[^>]+>/g, '') + '\n\nCảm ơn bạn đã dành thời gian trải nghiệm và ủng hộ dự án của chúng mình!\n\nThân mến,\nTeam Lộc Cộc\nloccoc.com.vn';
  return { subject: subject, html: html, text: text };
}

// Màu email (Brand Guideline): Be, Đỏ, Nâu + sắc đậm/nhạt của chúng
var MAU_MAIL = { be: '#E8DCC8', the: '#F7F1E7', hop: '#EFE5D5', vach: '#DDCDB5',
  do: '#800E13', nau: '#5A3E32', dam: '#3E2A21', mo: '#8A6F60' };
// Logo trắng nằm trên website (Gmail không hiện ảnh base64/SVG nên phải dùng link ảnh PNG)
var LOGO_MAIL = 'https://www.loccoc.com.vn/img/email/logo-trang.png';

// Nền bằng gradient một màu: Gmail chế độ tối không đảo màu ảnh nền
function nen_(c) { return 'background-color:' + c + ';background-image:linear-gradient(' + c + ',' + c + ');'; }
// Bọc chữ TRẮNG để Gmail chế độ tối không đổi màu (mẹo mix-blend-mode, chỉ đúng với chữ trắng)
function trang_(s) { return '<div class="lc-s"><div class="lc-d">' + s + '</div></div>'; }

/* ═════════════════════════ 3. MENU + HÀM CHẠY TAY ═════════════════════════ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Lộc Cộc')
    .addItem('Làm mới báo cáo & giao diện', 'lamMoiBaoCao')
    .addItem('Kiểm tra hệ thống', 'kiemTra')
    .addItem('Gửi email thử cho tôi', 'guiEmailThu')
    .addItem('Bật gửi email nền (chạy 1 lần)', 'batEmailNen')
    .addItem('Đặt tài khoản quản trị…', 'datTaiKhoanQuanTri')
    .addSeparator()
    .addItem('Xoá hết dữ liệu và cài đặt lại…', 'xoaHetVaCaiDatLai')
    .addToUi();
}

// ★ Cài đặt từ đầu: XOÁ TOÀN BỘ các tab trong file, tạo lại cấu trúc + báo cáo, đặt lại mã về 0001
function xoaHetVaCaiDatLai() {
  // chỉ chạy khi người dùng bấm "Có" trong hộp thoại; chạy từ trình soạn thảo (không có hộp thoại) mà Sheet
  // đã có dữ liệu thì từ chối, vì trước đây chạy nhầm từ trình soạn thảo đã xoá mất dữ liệu khách thật
  var ui = ui_(), tl = null;
  if (ui) { try { tl = ui.alert('Xoá toàn bộ dữ liệu?', 'Mọi tab trong file (đơn hàng, liên hệ, bài viết, lượt xem) sẽ bị xoá và tạo lại từ đầu. Không hoàn tác được.', ui.ButtonSet.YES_NO); } catch (e) { tl = null; } }
  if (tl === null) {
    var coDuLieu = [TAB.DON, TAB.LH, TAB.BV, TAB.XEM].some(function (t) { return soDong_(t) > 0; });
    if (coDuLieu) throw new Error('Đã dừng: Sheet đang có dữ liệu. Muốn xoá sạch thì mở Sheet → menu Lộc Cộc → "Xoá hết dữ liệu và cài đặt lại…". Để cấp quyền, hãy chạy hàm kiemTra.');
  } else if (tl !== ui.Button.YES) return;
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
  dong.push((coEmailNen_() ? '✓ Đã bật' : '✗ CHƯA bật (menu Lộc Cộc → Bật gửi email nền)') + ' gửi email nền · đang chờ gửi: ' + soEmailCho_());
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

// ghi nhiều dòng theo TÊN CỘT trong 1 lần gọi; Ngày/Giờ là công thức lấy từ cột Thời gian (theo múi giờ của Sheet)
function ghi_(sh, ds) {
  var hd = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var r0 = sh.getLastRow() + 1;
  var cT = hd.indexOf('Thời gian'), cN = hd.indexOf('Ngày'), cG = hd.indexOf('Giờ');
  var t = cT < 0 ? '' : sh.getRange(1, cT + 1).getA1Notation().replace(/\d+/g, ''); // chữ cột, vd "B"
  var rows = ds.map(function (obj, i) {
    return hd.map(function (h, j) {
      if (t && j === cN) return '=INT(' + t + (r0 + i) + ')';
      if (t && j === cG) return '=HOUR(' + t + (r0 + i) + ')';
      return Object.prototype.hasOwnProperty.call(obj, h) ? an_(obj[h]) : '';
    });
  });
  sh.getRange(r0, 1, rows.length, hd.length).setValues(rows);
  return r0;
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

// Bố cục tab Số liệu: dòng 1 = tên khối, dòng 2 = tiêu đề cột, từ dòng 3 = dữ liệu.
// Biểu đồ ở Báo cáo đọc đúng các khối này: A2:C32 (xu hướng), G2:H12 (mẫu), J2:K12 (nguồn), M2:O26 (khung giờ).
function taoSoLieu_() {
  var sh = lamMoiTab_(TAB.SL, 40, 18);
  sh.setTabColor(C.nau); sh.setHiddenGridlines(true);
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily(FONT).setFontSize(10).setFontColor(C.ink)
    .setBackground(C.white).setVerticalAlignment('middle');
  var DN = R_('DON', 'Ngày'), DG = R_('DON', 'Giờ'), LN = R_('LH', 'Ngày'), LG = R_('LH', 'Giờ');
  var SO = '#,##0;-#,##0;"–"';            // số 0 hiện thành gạch ngang mờ cho dễ nhìn
  var khoi = function (a1Ten, ten, a1Dau, dau, a1Than) {
    sh.getRange(a1Ten).merge().setValue(ten).setBackground(C.red).setFontColor(C.beL).setFontWeight('bold')
      .setFontSize(10).setHorizontalAlignment('left');
    sh.getRange(a1Dau).setValues([dau]).setBackground(C.beL).setFontColor(C.nau).setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBorder(null, null, true, null, null, null, C.nau, SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(a1Than).setBorder(null, null, true, null, null, true, C.line, SpreadsheetApp.BorderStyle.SOLID)
      .setHorizontalAlignment('center');
  };

  // A–E: 30 ngày gần nhất (+ dòng tổng)
  khoi('A1:E1', 'XU HƯỚNG 30 NGÀY', 'A2:E2', ['Ngày', 'Đơn hàng', 'Liên hệ', 'Số đôi', 'Tạm tính'], 'A3:E33');
  ct_(sh, 'A3', '=SEQUENCE(30,1,TODAY()-29,1)');
  var fA = [];
  for (var i = 3; i <= 32; i++) fA.push([
    '=COUNTIF(' + DN + ',$A' + i + ')', '=COUNTIF(' + LN + ',$A' + i + ')',
    '=SUMIF(' + DN + ',$A' + i + ',' + R_('DON', 'Số đôi') + ')', '=SUMIF(' + DN + ',$A' + i + ',' + R_('DON', 'Tạm tính (đ)') + ')']);
  cts_(sh, 'B3:E32', fA);
  sh.getRange('A33').setValue('Tổng');
  cts_(sh, 'B33:E33', [['=SUM(B3:B32)', '=SUM(C3:C32)', '=SUM(D3:D32)', '=SUM(E3:E32)']]);
  sh.getRange('A33:E33').setFontWeight('bold').setBackground(C.beL).setFontColor(C.red)
    .setBorder(true, null, null, null, null, null, C.nau, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange('A3:A32').setNumberFormat('dd/MM');
  sh.getRange('B3:D33').setNumberFormat(SO);
  sh.getRange('E3:E33').setNumberFormat('#,##0"đ";-#,##0"đ";"–"').setHorizontalAlignment('right');

  // G–H: mẫu được đặt nhiều nhất
  khoi('G1:H1', 'MẪU ĐƯỢC ĐẶT NHIỀU NHẤT', 'G2:H2', ['Mẫu', 'Số đôi'], 'G3:H12');
  var ctM = L_('CT', 'Mẫu'), ctS = L_('CT', 'Số lượng');
  sh.getRange('G2:H2').clearContent(); // QUERY tự in tiêu đề vào G2:H2; để chữ sẵn ở đây là QUERY báo lỗi #REF
  ct_(sh, 'G2', '=IFERROR(QUERY(\'' + TAB.CT + '\'!$' + ctM + '$1:$' + ctS + ',"select ' + ctM + ', sum(' + ctS + ') where ' + ctM +
    ' <> \'\' group by ' + ctM + ' order by sum(' + ctS + ') desc limit 10 label ' + ctM + ' \'Mẫu\', sum(' + ctS + ') \'Số đôi\'",1),"Chưa có đơn")');
  sh.getRange('G3:G12').setHorizontalAlignment('left');
  sh.getRange('H3:H12').setNumberFormat(SO);

  // J–K: nguồn khách gửi form
  khoi('J1:K1', 'KHÁCH GỬI TỪ FORM NÀO', 'J2:K2', ['Nguồn', 'Lượt gửi'], 'J3:K12');
  var nguon = [['Đặt hàng (giỏ hàng)']].concat(NGUON.map(function (x) { return [x]; })).concat([['Khác']]);
  sh.getRange(3, 10, nguon.length, 1).setValues(nguon).setHorizontalAlignment('left');
  var fN = [['=COUNTA(' + R_('DON', 'Mã đơn') + ')']];
  NGUON.forEach(function (x, j) { fN.push(['=COUNTIF(' + R_('LH', 'Nguồn') + ',$J' + (j + 4) + ')']); });
  fN.push(['=COUNTA(' + R_('LH', 'Mã') + ')-SUM(K4:K' + (NGUON.length + 3) + ')']);
  cts_(sh, 'K3:K' + (nguon.length + 2), fN);
  sh.getRange('K3:K12').setNumberFormat(SO);

  // M–O: khung giờ
  khoi('M1:O1', 'KHUNG GIỜ KHÁCH GỬI FORM', 'M2:O2', ['Giờ', 'Đơn hàng', 'Liên hệ'], 'M3:O26');
  ct_(sh, 'M3', '=SEQUENCE(24,1,0,1)');
  var fG = [];
  for (var h = 3; h <= 26; h++) fG.push(['=COUNTIF(' + DG + ',$M' + h + ')', '=COUNTIF(' + LG + ',$M' + h + ')']);
  cts_(sh, 'N3:O26', fG);
  sh.getRange('M3:M26').setNumberFormat('0"h"');
  sh.getRange('N3:O26').setNumberFormat(SO);

  // tô màu theo độ lớn (trắng → nâu nhạt) + làm nổi dòng hôm nay
  var b = SpreadsheetApp.newConditionalFormatRule;
  var thang = function (a1) {
    return b().setGradientMinpointWithValue(C.white, SpreadsheetApp.InterpolationType.NUMBER, '0')
      .setGradientMaxpoint('#D8C7AA').setRanges([sh.getRange(a1)]).build();
  };
  sh.setConditionalFormatRules([
    b().whenFormulaSatisfied('=$A3=TODAY()').setBold(true).setFontColor(C.red).setRanges([sh.getRange('A3:E32')]).build(),
    thang('B3:B32'), thang('C3:C32'), thang('D3:D32'), thang('E3:E32'),
    thang('H3:H12'), thang('K3:K12'), thang('N3:O26')
  ]);

  // kích thước + cột ngăn cách
  sh.setColumnWidths(1, 1, 70); sh.setColumnWidths(2, 3, 80); sh.setColumnWidth(5, 110);
  sh.setColumnWidth(7, 160); sh.setColumnWidth(8, 70);
  sh.setColumnWidth(10, 170); sh.setColumnWidth(11, 80);
  sh.setColumnWidth(13, 60); sh.setColumnWidths(14, 2, 80);
  [6, 9, 12, 16].forEach(function (c) { sh.setColumnWidth(c, 18); });
  sh.setRowHeight(1, 30); sh.setRowHeight(2, 26); sh.setRowHeights(3, 31, 22);
  sh.setFrozenRows(2);
  sh.getRange('Q1').setValue('Tab này chỉ để tính số liệu cho "📊 Báo cáo", không cần sửa. Số 0 hiện là "–".')
    .setFontColor(C.mute).setFontSize(9).setWrap(true);
  sh.setColumnWidth(17, 220);
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
  chart_(tk, Charts.ChartType.LINE, S + 'A2:C32', 16, 2, 1150, 300,
    { colors: [C.red, '#B08A5E'], legend: 'top', them: { lineWidth: 3, pointSize: 6 } });
  tieuDe_(tk, 'B30:M30', 'MẪU ĐƯỢC ĐẶT NHIỀU NHẤT', C.red);
  chart_(tk, Charts.ChartType.BAR, S + 'G2:H12', 31, 2, 1150, 300, { colors: [C.red], legend: 'none' });
  tieuDe_(tk, 'B45:G45', 'KHÁCH GỬI TỪ FORM NÀO', C.nau);
  tieuDe_(tk, 'H45:M45', 'KHUNG GIỜ KHÁCH GỬI FORM', C.nau);
  chart_(tk, Charts.ChartType.PIE, S + 'J2:K12', 46, 2, 570, 300,
    { colors: [C.red, C.nau, '#B08A5E', '#D8C7AA', '#9A1A20', '#3E2A21', '#C9A27E', '#7A5C4E', '#E3D6C1', '#5E0A0E'], legend: 'right', pieHole: 0.5 });
  chart_(tk, Charts.ChartType.COLUMN, S + 'M2:O26', 46, 8, 570, 300, { colors: [C.red, '#B08A5E'], legend: 'top', stacked: true });

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
    // không đặt fontName/chartArea: biểu đồ Sheets chỉ nhận font trong danh sách có sẵn, sai là vẽ ra khung trắng
    .setOption('width', w).setOption('height', h)
    .setOption('backgroundColor', C.white).setOption('colors', o.colors)
    .setOption('legend', { position: o.legend, textStyle: { color: C.ink, fontSize: 10 } });
  if (o.pieHole) b = b.setOption('pieHole', o.pieHole);
  if (o.stacked) b = b.setOption('isStacked', true);
  Object.keys(o.them || {}).forEach(function (k) { b = b.setOption(k, o.them[k]); });
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
  // Chi tiết đơn chỉ để Số liệu/Báo cáo đọc: ẩn đi, xem đơn ở tab Đơn hàng (cột Sản phẩm liệt kê từng đôi).
  // Ẩn sau cùng vì setActiveSheet ở trên sẽ hiện lại tab đang ẩn.
  [TAB.CT, TAB.XEM].forEach(function (t) { var x = ss.getSheetByName(t); if (x) x.hideSheet(); });
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

/* ═════════════════════════ 8. QUẢN TRỊ WEBSITE ═════════════════════════
 * Trang quản trị (đường dẫn riêng trên loccoc.com.vn) gọi doPost với "hanh":
 *   dangNhap → trả token phiên (6 giờ, gia hạn mỗi lần dùng); các lệnh khác bắt buộc có token hợp lệ.
 * Tài khoản đặt bằng menu "Lộc Cộc → Đặt tài khoản quản trị…": chỉ lưu bản băm có muối, không lưu mật khẩu.
 */
var QT = { PHIEN: 21600, SAI_TOI_DA: 8, SAI_CHUNG: 30, KHOA_GIAY: 900, VONG_BAM: 600, TK_TOI_DA: 30 };
// quyền của admin phụ (admin chính luôn có tất cả + quản lý thành viên, nhật ký)
var QUYEN = { ban: 'Tổng quan bán hàng', don: 'Đơn hàng & liên hệ', bai: 'Bài viết', xem: 'Lượt truy cập' };
var TT_DON = ['Mới', 'Đang xử lý', 'Hoàn tất', 'Huỷ'];
var TT_LH = ['Mới', 'Đã phản hồi', 'Đóng'];

function datTaiKhoanQuanTri() {
  var ui = SpreadsheetApp.getUi();
  var a = ui.prompt('Tài khoản quản trị (1/2)', 'Tên đăng nhập (chữ thường, không dấu, 3–30 ký tự):', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var ten = a.getResponseText().trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(ten)) { ui.alert('Tên đăng nhập không hợp lệ.'); return; }
  var b = ui.prompt('Tài khoản quản trị (2/2)', 'Mật khẩu (ít nhất 10 ký tự). Ô này không che chữ, hãy chắc không ai nhìn màn hình:', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  var mk = b.getResponseText();
  if (mk.length < 10) { ui.alert('Mật khẩu cần ít nhất 10 ký tự.'); return; }
  if (dsTK_()[ten]) { ui.alert('Tên "' + ten + '" đang là một admin phụ. Chọn tên khác cho admin chính.'); return; }
  var muoi = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperties({ qt_ten: ten, qt_muoi: muoi, qt_bam: bam_(muoi, mk) });
  ui.alert('Đã lưu tài khoản ADMIN CHÍNH "' + ten + '". Phiên đăng nhập cũ của admin chính hết hiệu lực ngay.');
  ghiNK_(ten, 'chinh', 'Đặt tài khoản admin chính', 'Từ menu Google Sheet');
}

function bam_(muoi, mk) {
  var h = muoi + '|' + mk;
  for (var i = 0; i < QT.VONG_BAM; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + muoi, Utilities.Charset.UTF_8));
  }
  return h;
}

// so sánh không dừng sớm, tránh đoán dần mật khẩu theo thời gian phản hồi
function bangNhau_(a, b) {
  if (a.length !== b.length) return false;
  var x = 0;
  for (var i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

/* ---------- Tài khoản ----------
 * Admin chính: qt_ten/qt_muoi/qt_bam (đặt bằng menu Sheet). Admin phụ: JSON trong Script Property "qt_tk"
 *   { ten: { hoTen, muoi, bam, quyen: ['ban','don','bai','xem'], khoa, tao, taoBoi } } do admin chính tạo trên web.
 * Phiên (CacheService "qt_p_<token>") lưu tên + 16 ký tự đầu bản băm: đổi mật khẩu, khoá hay xoá tài khoản là phiên mất hiệu lực.
 */
function dsTK_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('qt_tk') || '{}'); } catch (e) { return {}; } }
function luuDsTK_(ds) { PropertiesService.getScriptProperties().setProperty('qt_tk', JSON.stringify(ds)); }

function timTK_(ten) {
  var p = PropertiesService.getScriptProperties().getProperties();
  if (p.qt_ten && ten === p.qt_ten) return { ten: ten, hoTen: 'Admin chính', vaiTro: 'chinh', muoi: p.qt_muoi, bam: p.qt_bam, quyen: Object.keys(QUYEN) };
  var x = dsTK_()[ten];
  if (!x) return null;
  return { ten: ten, hoTen: x.hoTen, vaiTro: 'phu', muoi: x.muoi, bam: x.bam, khoa: !!x.khoa,
    quyen: (x.quyen || []).filter(function (q) { return q in QUYEN; }) };
}

function dangNhap_(d) {
  var p = PropertiesService.getScriptProperties(), cache = CacheService.getScriptCache();
  if (!p.getProperty('qt_bam')) return { ok: false, loi: 'Chưa có tài khoản quản trị. Vào Sheet → menu Lộc Cộc → Đặt tài khoản quản trị.' };
  var ten = String(d.ten || '').trim().toLowerCase().slice(0, 30);
  var kSai = 'qt_sai_' + ten.replace(/[^a-z0-9._-]/g, ''), sai = Number(cache.get(kSai) || 0), chung = Number(cache.get('qt_sai') || 0);
  if (sai >= QT.SAI_TOI_DA || chung >= QT.SAI_CHUNG) return { ok: false, loi: 'Sai quá nhiều lần. Thử lại sau 15 phút.' };
  var tk = timTK_(ten);
  // luôn băm kể cả khi không có tài khoản, để thời gian phản hồi không lộ tên nào tồn tại
  var bam = bam_(tk ? tk.muoi : 'khong-co', String(d.matKhau || ''));
  if (!tk || !bangNhau_(bam, tk.bam)) {
    cache.put(kSai, String(sai + 1), QT.KHOA_GIAY); cache.put('qt_sai', String(chung + 1), QT.KHOA_GIAY);
    ghiNK_(ten || '(trống)', '', 'Đăng nhập thất bại', 'Sai tên hoặc mật khẩu');
    return { ok: false, loi: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
  }
  if (tk.khoa) { ghiNK_(ten, tk.vaiTro, 'Đăng nhập thất bại', 'Tài khoản đang bị khoá'); return { ok: false, loi: 'Tài khoản này đang bị khoá. Liên hệ admin chính.' }; }
  cache.remove(kSai);
  var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  cache.put('qt_p_' + token, JSON.stringify({ ten: ten, ky: tk.bam.slice(0, 16) }), QT.PHIEN);
  ghiNK_(ten, tk.vaiTro, 'Đăng nhập', '');
  return { ok: true, token: token, ten: ten, hoTen: tk.hoTen, vaiTro: tk.vaiTro, quyen: tk.quyen };
}

// trả về tài khoản đang đăng nhập, hoặc null nếu phiên hết hạn / tài khoản đã đổi mật khẩu, bị khoá, bị xoá
function phien_(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) return null;
  var cache = CacheService.getScriptCache(), v = cache.get('qt_p_' + token), o;
  try { o = JSON.parse(v); } catch (e) { return null; }
  var tk = o && timTK_(o.ten);
  if (!tk || tk.khoa || o.ky !== tk.bam.slice(0, 16)) return null;
  cache.put('qt_p_' + token, v, QT.PHIEN); // gia hạn khi còn dùng
  return tk;
}

function ghiNK_(ten, vaiTro, hanhDong, chiTiet) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TAB.NK) || tab_(TAB.NK);
    sh.appendRow([new Date(), an_(String(ten)), vaiTro === 'chinh' ? 'Admin chính' : vaiTro === 'phu' ? 'Admin phụ' : '', an_(hanhDong), an_(String(chiTiet || '').slice(0, 500))]);
  } catch (e) { console.error(e); } // ghi nhật ký lỗi không được làm hỏng thao tác chính
}

// lệnh → quyền cần có (admin chính có tất cả; "chinh" = chỉ admin chính)
var LENH = { tongQuan: ['ban', 'don'], suaDong: ['don'], dsBai: ['bai'], luuBai: ['bai'], xoaBai: ['bai'], luotXem: ['xem'],
  dsTaiKhoan: 'chinh', taoTaiKhoan: 'chinh', suaTaiKhoan: 'chinh', xoaTaiKhoan: 'chinh', nhatKy: 'chinh' };

function quanTri_(d) {
  try {
    if (d.hanh === 'dangNhap') return dangNhap_(d);
    var tk = phien_(d.token);
    if (!tk) return { ok: false, hetPhien: true, loi: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' };
    var can = LENH[d.hanh];
    if (can === 'chinh' ? tk.vaiTro !== 'chinh' : can && !can.some(function (q) { return tk.quyen.indexOf(q) > -1; }))
      return { ok: false, loi: 'Tài khoản của bạn không có quyền làm việc này.' };
    var nk = function (hd, ct) { ghiNK_(tk.ten, tk.vaiTro, hd, ct); };
    switch (d.hanh) {
      case 'toi': return { ok: true, ten: tk.ten, hoTen: tk.hoTen, vaiTro: tk.vaiTro, quyen: tk.quyen };
      case 'dangXuat': CacheService.getScriptCache().remove('qt_p_' + d.token); nk('Đăng xuất', ''); return { ok: true };
      case 'doiMatKhau': return coKhoa_(function () { return doiMatKhau_(tk, d, nk); });
      case 'tongQuan': return { ok: true, don: bang_(TAB.DON), ct: bang_(TAB.CT), lh: bang_(TAB.LH), ttDon: TT_DON, ttLh: TT_LH };
      case 'suaDong': return coKhoa_(function () {
        var r = suaDong_(d);
        if (r.ok) nk('Sửa ' + (d.tab === 'LH' ? 'liên hệ' : 'đơn hàng'), d.ma + ': ' + Object.keys(d.truong || {}).map(function (k) { return k + ' = ' + String(d.truong[k]).slice(0, 80); }).join(' · '));
        return r; });
      case 'dsBai': return { ok: true, bai: bang_(TAB.BV) };
      case 'luuBai': return coKhoa_(function () {
        var b = d.bai || {}, r = luuBai_(b, tk.ten);
        if (r.ok) nk(b.ma ? 'Sửa bài viết' : 'Tạo bài viết', r.ma + ' · "' + String(b.tieuDe || '').slice(0, 80) + '" · ' + (b.trangThai === 'Xuất bản' ? 'Xuất bản ' + (b.xuatBanLuc || '') : 'Nháp'));
        return r; });
      case 'xoaBai': return coKhoa_(function () { var r = xoaBai_(d.ma); if (r.ok) nk('Xoá bài viết', d.ma + (r.tieuDe ? ' · "' + r.tieuDe + '"' : '')); return r; });
      case 'luotXem': return thongKeXem_(d.tu, d.den);
      case 'dsTaiKhoan': return { ok: true, tk: dsTaiKhoan_(), quyen: QUYEN };
      case 'taoTaiKhoan': return coKhoa_(function () { return taoTaiKhoan_(d, tk, nk); });
      case 'suaTaiKhoan': return coKhoa_(function () { return suaTaiKhoan_(d, nk); });
      case 'xoaTaiKhoan': return coKhoa_(function () { return xoaTaiKhoan_(d.ten, nk); });
      case 'nhatKy': return { ok: true, nk: bang_(TAB.NK).slice(-3000) };
    }
    return { ok: false, loi: 'Lệnh không hợp lệ.' };
  } catch (err) {
    console.error(err);
    return { ok: false, loi: 'Lỗi máy chủ: ' + String(err).slice(0, 160) };
  }
}

function kiemMK_(mk) { return String(mk || '').length >= 10 ? '' : 'Mật khẩu cần ít nhất 10 ký tự.'; }

function doiMatKhau_(tk, d, nk) {
  if (!bangNhau_(bam_(tk.muoi, String(d.cu || '')), tk.bam)) return { ok: false, loi: 'Mật khẩu hiện tại không đúng.' };
  var l = kiemMK_(d.moi); if (l) return { ok: false, loi: l };
  var muoi = Utilities.getUuid(), bam = bam_(muoi, String(d.moi));
  if (tk.vaiTro === 'chinh') PropertiesService.getScriptProperties().setProperties({ qt_muoi: muoi, qt_bam: bam });
  else { var ds = dsTK_(); ds[tk.ten].muoi = muoi; ds[tk.ten].bam = bam; luuDsTK_(ds); }
  nk('Đổi mật khẩu', 'Tự đổi mật khẩu của mình');
  return { ok: true, dangNhapLai: true };
}

function dsTaiKhoan_() {
  var p = PropertiesService.getScriptProperties().getProperty('qt_ten'), ds = dsTK_();
  return [{ ten: p, hoTen: 'Admin chính', vaiTro: 'chinh', quyen: Object.keys(QUYEN), khoa: false }].concat(Object.keys(ds).sort().map(function (k) {
    var x = ds[k]; return { ten: k, hoTen: x.hoTen, vaiTro: 'phu', quyen: x.quyen || [], khoa: !!x.khoa, tao: x.tao, taoBoi: x.taoBoi };
  }));
}

function locQuyen_(q) { return (Array.isArray(q) ? q : []).filter(function (x, i, a) { return x in QUYEN && a.indexOf(x) === i; }); }

function taoTaiKhoan_(d, tk, nk) {
  var ten = String(d.ten || '').trim().toLowerCase(), ds = dsTK_();
  if (!/^[a-z0-9._-]{3,30}$/.test(ten)) return { ok: false, loi: 'Tên đăng nhập 3–30 ký tự: chữ thường không dấu, số, dấu chấm, gạch.' };
  if (ten === PropertiesService.getScriptProperties().getProperty('qt_ten') || ds[ten]) return { ok: false, loi: 'Tên đăng nhập "' + ten + '" đã có.' };
  if (Object.keys(ds).length >= QT.TK_TOI_DA) return { ok: false, loi: 'Tối đa ' + QT.TK_TOI_DA + ' tài khoản admin phụ.' };
  var hoTen = chu_(d.hoTen, 80); if (!hoTen) return { ok: false, loi: 'Nhập họ tên thành viên.' };
  var l = kiemMK_(d.matKhau); if (l) return { ok: false, loi: l };
  var quyen = locQuyen_(d.quyen); if (!quyen.length) return { ok: false, loi: 'Chọn ít nhất một quyền.' };
  var muoi = Utilities.getUuid();
  ds[ten] = { hoTen: hoTen, muoi: muoi, bam: bam_(muoi, String(d.matKhau)), quyen: quyen, khoa: false, tao: new Date().toISOString(), taoBoi: tk.ten };
  luuDsTK_(ds);
  nk('Tạo tài khoản', ten + ' (' + hoTen + ') · quyền: ' + quyen.map(function (q) { return QUYEN[q]; }).join(', '));
  return { ok: true };
}

function suaTaiKhoan_(d, nk) {
  var ds = dsTK_(), x = ds[d.ten];
  if (!x) return { ok: false, loi: 'Không sửa được tài khoản này (admin chính đổi mật khẩu ở mục Đổi mật khẩu).' };
  var ghi = [];
  if ('hoTen' in d) { var h = chu_(d.hoTen, 80); if (!h) return { ok: false, loi: 'Họ tên không được trống.' }; if (h !== x.hoTen) { ghi.push('họ tên: ' + h); x.hoTen = h; } }
  if ('quyen' in d) { var q = locQuyen_(d.quyen); if (!q.length) return { ok: false, loi: 'Chọn ít nhất một quyền.' }; x.quyen = q; ghi.push('quyền: ' + q.map(function (k) { return QUYEN[k]; }).join(', ')); }
  if ('khoa' in d) { x.khoa = !!d.khoa; ghi.push(x.khoa ? 'khoá tài khoản' : 'mở khoá'); }
  if (d.matKhau) { var l = kiemMK_(d.matKhau); if (l) return { ok: false, loi: l }; x.muoi = Utilities.getUuid(); x.bam = bam_(x.muoi, String(d.matKhau)); ghi.push('đặt lại mật khẩu'); }
  luuDsTK_(ds);
  nk('Sửa tài khoản', d.ten + ': ' + ghi.join(' · '));
  return { ok: true };
}

function xoaTaiKhoan_(ten, nk) {
  var ds = dsTK_();
  if (!ds[ten]) return { ok: false, loi: 'Không tìm thấy tài khoản (không xoá được admin chính).' };
  var h = ds[ten].hoTen; delete ds[ten]; luuDsTK_(ds);
  nk('Xoá tài khoản', ten + ' (' + h + ')');
  return { ok: true };
}

function coKhoa_(fn) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (x) { return { ok: false, loi: 'Hệ thống đang bận, thử lại sau vài giây.' }; }
  try { var kq = fn(); SpreadsheetApp.flush(); return kq; } finally { lock.releaseLock(); }
}

// đọc cả tab thành danh sách object theo tên cột; ngày giờ đổi sang chuỗi ISO cho trình duyệt
function bang_(ten) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ten);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues(), hd = v.shift().map(String);
  return v.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var o = {};
    hd.forEach(function (h, i) { if (h) o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
    return o;
  });
}

function timDong_(sh, cotMa, ma) {
  if (!ma) return 0;
  var hd = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String), c = hd.indexOf(cotMa) + 1;
  if (!c || sh.getLastRow() < 2) return 0;
  var o = sh.getRange(2, c, sh.getLastRow() - 1, 1).createTextFinder(String(ma)).matchEntireCell(true).findNext();
  return o ? o.getRow() : 0;
}

function suaDong_(d) {
  var k = d.tab === 'LH' ? 'LH' : 'DON', sh = tab_(TAB[k]);
  var r = timDong_(sh, k === 'DON' ? 'Mã đơn' : 'Mã', d.ma);
  if (!r) return { ok: false, loi: 'Không tìm thấy ' + d.ma + '.' };
  var t = d.truong || {}, ds = k === 'DON' ? TT_DON : TT_LH;
  if ('Trạng thái' in t) {
    if (ds.indexOf(t['Trạng thái']) < 0) return { ok: false, loi: 'Trạng thái không hợp lệ.' };
    datO_(sh, r, 'Trạng thái', t['Trạng thái']);
  }
  if ('Ghi chú nội bộ' in t) datO_(sh, r, 'Ghi chú nội bộ', chu_(t['Ghi chú nội bộ'], 2000));
  return { ok: true };
}

/* ---------- Bài viết ---------- */
function duongDan_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function luuBai_(b, ai) {
  var sh = tab_(TAB.BV), now = new Date();
  var tieuDe = chu_(b.tieuDe, 200);
  if (!tieuDe) return { ok: false, loi: 'Bài viết cần có tiêu đề.' };
  var dd = duongDan_(b.duongDan || tieuDe);
  if (!dd) return { ok: false, loi: 'Đường dẫn không hợp lệ.' };
  var noiDung = String(b.noiDung || '');
  if (noiDung.length > 45000) return { ok: false, loi: 'Nội dung quá dài (tối đa 45.000 ký tự).' };
  var anh = chu_(b.anhBia, 500);
  if (anh && !/^https:\/\//i.test(anh) && !/^img\//.test(anh)) return { ok: false, loi: 'Ảnh bìa phải là đường link https://' };
  var tt = b.trangThai === 'Xuất bản' ? 'Xuất bản' : 'Nháp';
  var xb = b.xuatBanLuc ? new Date(b.xuatBanLuc) : now;
  if (isNaN(xb.getTime())) return { ok: false, loi: 'Thời gian xuất bản không hợp lệ.' };
  var cu = bang_(TAB.BV).filter(function (x) { return x['Đường dẫn'] === dd && x['Mã'] !== b.ma; });
  if (cu.length) return { ok: false, loi: 'Đường dẫn "' + dd + '" đã có ở bài ' + cu[0]['Mã'] + '. Hãy đổi đường dẫn khác.' };
  var o = { 'Tiêu đề': tieuDe, 'Đường dẫn': dd, 'Tóm tắt': chu_(b.tomTat, 400), 'Ảnh bìa': anh, 'Nội dung': noiDung,
    'Trạng thái': tt, 'Xuất bản lúc': xb, 'Cập nhật lúc': now, 'Cập nhật bởi': ai || '' };
  var r = timDong_(sh, 'Mã', b.ma), ma = b.ma;
  if (r) {
    Object.keys(o).forEach(function (h) { datO_(sh, r, h, o[h]); });
  } else {
    ma = maMoi_('BV', 'BV-');
    o['Mã'] = ma; o['Tạo lúc'] = now; o['Tạo bởi'] = ai || '';
    ghi_(sh, [o]);
  }
  CacheService.getScriptCache().remove('bai_cong_khai');
  return { ok: true, ma: ma, duongDan: dd };
}

function xoaBai_(ma) {
  var sh = tab_(TAB.BV), r = timDong_(sh, 'Mã', ma);
  if (!r) return { ok: false, loi: 'Không tìm thấy bài ' + ma + '.' };
  var hd = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var tieuDe = String(sh.getRange(r, hd.indexOf('Tiêu đề') + 1).getValue() || '').slice(0, 80);
  sh.deleteRow(r);
  CacheService.getScriptCache().remove('bai_cong_khai');
  return { ok: true, tieuDe: tieuDe };
}

// bài "Xuất bản" có giờ xuất bản đã tới; lọc giờ ở mỗi lần gọi nên bài hẹn giờ tự hiện đúng lúc
function baiCongKhai_() {
  var cache = CacheService.getScriptCache(), c = cache.get('bai_cong_khai'), ds;
  if (c) ds = JSON.parse(c);
  else {
    ds = bang_(TAB.BV).filter(function (x) { return x['Trạng thái'] === 'Xuất bản'; }).map(function (x) {
      return { ma: x['Mã'], tieuDe: x['Tiêu đề'], duongDan: x['Đường dẫn'], tomTat: x['Tóm tắt'], anhBia: x['Ảnh bìa'],
        noiDung: x['Nội dung'], xuatBanLuc: x['Xuất bản lúc'] };
    });
    try { cache.put('bai_cong_khai', JSON.stringify(ds), 300); } catch (x) { /* quá 100KB thì bỏ qua cache */ }
  }
  var now = Date.now();
  return ds.filter(function (x) { return new Date(x.xuatBanLuc).getTime() <= now; })
    .sort(function (a, b) { return new Date(b.xuatBanLuc) - new Date(a.xuatBanLuc); });
}

/* ---------- Lượt truy cập ----------
 * Mỗi lượt xem trang = 1 dòng ở tab "👁 Lượt xem" (ẩn), giữ vĩnh viễn để xem lại bất kỳ khoảng ngày nào.
 * Khách = mã ngẫu nhiên lưu ở trình duyệt; Phiên = hết hạn sau 30 phút không hoạt động. Không lưu IP hay tên.
 */
function ghiLuotXem_(d) {
  var khach = chu_(d.khach, 40), phien = chu_(d.phien, 40);
  if (!/^[a-z0-9-]{8,40}$/i.test(khach) || !/^[a-z0-9-]{8,40}$/i.test(phien)) return { ok: false };
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TAB.XEM) || tab_(TAB.XEM), now = new Date();
  var ngay = Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  // appendRow là thao tác nguyên tử nên không cần khoá; giữ đúng thứ tự COT.XEM
  sh.appendRow([now, "'" + ngay, khach, phien, an_(chu_(d.trang, 120)), an_(chu_(d.nguon, 120)), an_(chu_(d.thietBi, 20))]);
  return { ok: true };
}

function thongKeXem_(tu, den) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TAB.XEM), tz = ss.getSpreadsheetTimeZone();
  var hom = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  tu = /^\d{4}-\d{2}-\d{2}$/.test(tu || '') ? tu : '0000-00-00';
  den = /^\d{4}-\d{2}-\d{2}$/.test(den || '') ? den : hom;
  var kq = { ok: true, tu: tu, den: den, ngay: {}, trang: {}, nguon: {}, thietBi: {}, tong: { xem: 0, khach: 0, phien: 0, thoat: 0 }, dauTien: '' };
  if (!sh || sh.getLastRow() < 2) return kq;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
  var khach = {}, phien = {}, ngayKhach = {}, ngayPhien = {};
  v.forEach(function (r) {
    var n = r[1] instanceof Date ? Utilities.formatDate(r[1], tz, 'yyyy-MM-dd') : String(r[1]);
    if (!kq.dauTien || n < kq.dauTien) kq.dauTien = n;
    if (n < tu || n > den) return;
    var g = kq.ngay[n] || (kq.ngay[n] = { xem: 0, khach: 0, phien: 0, thoat: 0 });
    g.xem++; kq.tong.xem++;
    var kk = n + '|' + r[2];
    if (!ngayKhach[kk]) { ngayKhach[kk] = 1; g.khach++; }
    if (!khach[r[2]]) { khach[r[2]] = 1; kq.tong.khach++; }
    var p = phien[r[3]] || (phien[r[3]] = { n: 0, ngay: n });
    p.n++;
    if (p.n === 1) { g.phien++; kq.tong.phien++; }
    var t = String(r[4] || '#/'); kq.trang[t] = (kq.trang[t] || 0) + 1;
    if (p.n === 1) { var ng = String(r[5] || 'Trực tiếp'); kq.nguon[ng] = (kq.nguon[ng] || 0) + 1;
      var tb = String(r[6] || 'Khác'); kq.thietBi[tb] = (kq.thietBi[tb] || 0) + 1; }
  });
  // phiên thoát = phiên chỉ xem đúng 1 trang (tính vào ngày bắt đầu phiên)
  Object.keys(phien).forEach(function (k) { if (phien[k].n === 1) { kq.tong.thoat++; kq.ngay[phien[k].ngay].thoat++; } });
  return kq;
}
