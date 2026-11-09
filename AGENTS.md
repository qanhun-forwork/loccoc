# Ghi chú dự án Lộc Cộc (cho trợ lý AI: Claude Code đọc qua CLAUDE.md, Cursor đọc trực tiếp)

Dự án học tập môn Truyền thông số, Trường Đại học Văn Lang (học kỳ 261). Website guốc gỗ cách tân
Lộc Cộc tại loccoc.com.vn. Không phục vụ mục đích thương mại: đơn hàng trên web chỉ để thử nghiệm.

- Website tĩnh một trang: toàn bộ HTML/CSS/JS nằm trong `index.html`, không có bước build.
- Triển khai: Vercel tự deploy mỗi khi push lên nhánh `master` (project `loccoc-website`,
  tên miền loccoc.com.vn), mất khoảng 30–60 giây.
- Điều hướng bằng hash: `#/`, `#/basic`, `#/basic-0` … `#/basic-9`, `#/san-pham`, `#/thiet-ke`,
  `#/phoi-do`, `#/lien-he`, và các trang sinh từ `var G={...}` (`#/collection`, `#/tu-van-1-1`…).
- Kiểm tra trên trình duyệt trước khi push (xem mục "Xem trước trên máy").

## Bộ nhận diện thương hiệu (theo Brand Guideline của nhóm)

- Màu: chủ đạo Be `#E8DCC8`, nhấn Đỏ `#800E13`, phụ Nâu `#5A3E32` (chỉ dùng thêm sắc đậm/nhạt
  của ba màu này). Không dùng màu pastel.
- Tone: Tự tin · Khác biệt · Sang trọng · Tinh tế. Visual: vân gỗ thủ công, ảnh tông vintage,
  ấm áp, hoài niệm nhưng thời thượng.
- Big Idea: "Dáng mộc ôm chân, cân mọi outfit".
- Thông điệp cốt lõi (tiêu đề hero): "Chỉn chu từng chi tiết cho bạn lựa chọn không hối tiếc".
- Tiêu đề hero chia 4 tầng: chữ đặc / chữ viền (`.ol`) / dòng nối nhỏ (`.ln.cn`) / chữ nghiêng đỏ
  có gạch chân. Giữa các `.ln` phải có khoảng trắng để trình đọc màn hình không dính chữ.

## Dòng Basic (10 mẫu, đồng giá)

- `var B=[...]`: mỗi mẫu là [tên, mô tả ngắn, đoạn giới thiệu, quai, gỗ & đế, hợp với].
- `var BI=[...]`: ảnh nền trắng (WebP base64) theo đúng thứ tự `B`. Dùng ở trang Basic, lưới 10 mẫu
  trên trang chủ và là ảnh đầu tiên trong bộ ảnh chi tiết.
- `var PRICE`: giá chung (350.000đ).
- `var BG=[...]`: thư mục ảnh chụp của mẫu `B[i]` — KHÔNG theo thứ tự B01…B10
  (ví dụ Hồng Phấn là `B09`, Nơ Hồng là `B07`). Luôn tra `BG` trước khi gắn ảnh cho một mẫu.
  - Ảnh gốc PNG ở `anh_sanpham_basic/Bxx/`, không dùng trực tiếp trên web (6–8 MB/ảnh).
  - Bản nén cho web: `img/basic/Bxx-k.webp` (1200px) và `img/basic/Bxx-k-600.webp` (600px),
    với k = 1 cận quai, 2 cận đế gỗ, 3 khi mang.
- Chữ "10 mẫu" xuất hiện ở nhiều chỗ: đổi số mẫu thì sửa hết.
- 8 "mẫu gợi ý" cũ (Tím hoa, Xanh rêu…) đã bị xoá khỏi web; link cũ `#/mau-N` về trang chủ.
  Các tên "Tím hoa", "Xanh rêu"… còn lại trong Atelier 3D là tên màu quai, không phải sản phẩm.

## Font

- Chỉ dùng Plus Jakarta Sans (đủ dấu tiếng Việt, độ đậm tối đa 800). Không dùng lại DM Sans:
  font đó thiếu dấu tiếng Việt nên các chữ như ộ, ố, ữ bị hiện bằng font khác.
- Chữ viền: không dùng `color:transparent` + `-webkit-text-stroke` vì lộ nét chồng bên trong chữ.
  Dùng `color:<màu nền>; -webkit-text-stroke:<gấp đôi độ dày>; paint-order:stroke fill`.
- Khối "Sẵn sàng lộc cộc chưa?" dùng Bricolage Grotesque + Fraunces, chỉ tải các ký tự liệt kê ở
  tham số `text=` của link Google Fonts: thêm chữ mới vào khối này thì thêm ký tự vào `text=`.
  Người dùng muốn GIỮ NGUYÊN khối CTA này (màu, font, sticker).

## Form, đơn hàng và Google Sheet

- Mọi form gửi về Google Apps Script qua `var SHEET_URL` (đầu khối `<script>` thứ nhất).
  Mã Apps Script nằm ở `apps-script/Code.gs` (không deploy lên Vercel, xem `.vercelignore`).
- Web gửi JSON (Content-Type `text/plain` để không cần preflight CORS): `nhom` = `don` (giỏ hàng)
  hoặc `lienhe`, `loai` = tên form, `ten`, `sdt`, `email` (bắt buộc), `noiDung`, `items`
  (mỗi đôi: ten, dong, size, khac, sl). Apps Script trả `{ok, ma, email}` hoặc `{ok:false, loi}`;
  web hiện mã đơn (LC-0001 / LH-0001) và báo lỗi thật.
- Apps Script v3 ghi THEO TÊN CỘT vào các tab 🛒 Đơn hàng, 📦 Chi tiết đơn, 💬 Liên hệ, tự gửi
  email cảm ơn + thông báo "dự án môn học, không thu tiền, không giao hàng", dựng tab 📊 Báo cáo.
  Sheet dùng định dạng Việt Nam (công thức ngăn bằng `;`): script tự nhận và đổi dấu.
- Sau khi sửa `Code.gs`: dán vào Apps Script của Sheet "LỘC CỘC - ĐƠN HÀNG", rồi
  Triển khai → Quản lý triển khai → ✎ → Phiên bản: "Phiên bản mới". Không tạo "triển khai mới"
  (URL sẽ đổi). Kiểm tra: mở SHEET_URL trên trình duyệt phải thấy `"phienBan"` đúng số trong code.
- Email cảm ơn (v3.3) tông sáng: thân be nhạt, chữ Nâu, nhấn Đỏ; Gmail chế độ tối tự đảo phần thân
  thành nâu đậm. Riêng thanh đầu khoá màu: nền gradient `nen_()`, logo là ảnh, chữ trắng bọc `trang_()`
  (mẹo mix-blend-mode, chỉ đúng với chữ TRẮNG). Logo là `img/email/logo-trang.png` trên www.loccoc.com.vn.
- Email gửi ở NỀN: doPost chỉ ghi Sheet + xếp email vào Script Properties (`thu_<mã>`), trigger mỗi phút
  chạy `guiEmailCho` để gửi và cập nhật cột "Email xác nhận" (Chờ gửi → Đã gửi). Trigger phải bật 1 lần
  bằng menu Lộc Cộc → "Bật gửi email nền"; SHEET_URL trả `"emailNen":true` khi đã bật.
- Tab 📦 Chi tiết đơn bị ẨN (sapXepTab_): người xem đơn dùng tab 🛒 Đơn hàng; Chi tiết đơn chỉ để ⚙ Số liệu tính
  mẫu bán chạy. ⚙ Số liệu: dòng 1 tên khối, dòng 2 tiêu đề, dữ liệu từ dòng 3 (biểu đồ đọc A2:C32, G2:H12, J2:K12, M2:O26).
- Biểu đồ Sheets: KHÔNG đặt fontName/chartArea (font ngoài danh sách là biểu đồ ra khung trắng).
- Gmail cá nhân gửi tối đa khoảng 100 email/ngày; mỗi địa chỉ tối đa 3 email/giờ (chống lạm dụng).

## Quản trị website (Apps Script v4)

- Trang quản trị: `quantrivien/index.html` → https://www.loccoc.com.vn/quantrivien (người dùng chọn đường dẫn dễ nhớ;
  có `noindex`, không gắn link trên web). Đường dẫn không bí mật: bảo vệ là đăng nhập phía Apps Script.
- Tài khoản: Sheet → menu Lộc Cộc → "Đặt tài khoản quản trị…" (lưu tên + bản băm SHA-256 có muối trong Script
  Properties, không lưu mật khẩu). Sai 8 lần → khoá 15 phút. Token phiên 6 giờ trong CacheService, gia hạn khi dùng;
  đổi mật khẩu là mọi phiên cũ mất hiệu lực. Không bao giờ ghi mật khẩu vào code hay repo.
- Nhiều tài khoản (v4.2): ADMIN CHÍNH đặt bằng menu Sheet (qt_ten/qt_bam). ADMIN PHỤ do admin chính tạo trên web
  (mục "Thành viên & nhật ký"), lưu JSON trong Script Property `qt_tk`, có quyền riêng: ban / don / bai / xem.
  Máy chủ kiểm quyền ở MỖI lệnh (bảng `LENH`); giao diện chỉ ẩn mục. Khoá, xoá, đặt lại mật khẩu → phiên của
  thành viên hết hiệu lực ngay. Mọi đăng nhập (kể cả thất bại) và thao tác ghi vào tab "🕘 Nhật ký".
- doPost có `hanh`: `xem` (đếm lượt xem, không cần đăng nhập) | `dangNhap` | các lệnh cần token: `tongQuan`,
  `suaDong` (chỉ Trạng thái + Ghi chú nội bộ), `dsBai`, `luuBai`, `xoaBai`, `luotXem`, `toi`, `doiMatKhau`;
  chỉ admin chính: `dsTaiKhoan`, `taoTaiKhoan`, `suaTaiKhoan`, `xoaTaiKhoan`, `nhatKy`. Không có `hanh` = form đơn hàng/liên hệ như cũ.
  doGet `?hanh=bai` = bài đã xuất bản (cache 5 phút, lọc giờ xuất bản ở mỗi lần gọi nên bài hẹn giờ tự hiện).
- Tab mới: 📰 Bài viết (hiện), 👁 Lượt xem (ẩn, mỗi lượt xem 1 dòng, giữ vĩnh viễn). Đơn hàng/Liên hệ có thêm cột
  "Trạng thái" ở CUỐI (L_ tính vị trí cột theo COT nên chỉ thêm cột vào cuối mảng).
- Vercel Web Analytics (v4.3): menu Sheet "Kết nối Vercel Analytics…" lưu token/project/team slug vào Script
  Properties (vc_token, vc_du_an, vc_nhom; KHÔNG để token trong code/repo), chép 31 ngày rồi tạo trigger
  `dongBoVercel` mỗi ngày 3h (chép lại 3 ngày gần nhất) vào tab "▲ Vercel" (ẩn). Gói Hobby chỉ giữ 1 tháng nên
  dữ liệu cũ hơn chỉ còn ở Sheet. API chỉ có pageviews + visitors (không có bounce rate); ngày theo UTC.
- Mạng xã hội (v4.4): tab "📘 Facebook", "📸 Instagram", "🎵 TikTok" (hiện), mỗi ngày 1 dòng, đọc THEO TÊN CỘT dòng 1
  (`MXH_COT` trong Code.gs). Claude chép số từ Meta Business Suite và TikTok Studio mỗi ngày 14:30 qua trình duyệt.
  Lệnh `mangXaHoi` (quyền xem) → trang quản trị: Lượt truy cập → tab "Mạng xã hội". Đổi tên cột thì sửa cả `MXH_COT`.
- TikTok API (v4.5): app "Lộc Cộc Tracking" chế độ Sandbox (Login Kit; scope user.info.basic, user.info.stats, video.list;
  @loccoc.com.vn là Target user; Redirect URI https://www.loccoc.com.vn/quantrivien/). Key/secret dán bằng menu Sheet
  "Kết nối TikTok…" (Script Properties tt_key, tt_secret, tt_at, tt_rt…; KHÔNG để trong code/repo). Trang quản trị nhận
  ?code=&state= → lệnh `ttKetNoi`; nút "Đồng bộ ngay" ở tab Mạng xã hội gọi `dongBoVercel` + `dongBoTikTok`.
  Mỗi lần đồng bộ chụp số tổng vào tab "🎵 TikTok API" (ẩn), ghi lại "🎵 TikTok video", điền "🎵 TikTok" với cột Nguồn = API
  (v4.9.2: lượt xem/thích/bình luận/chia sẻ của ngày API = tổng API trừ tổng các dòng trước, nên cộng mọi ngày = tổng API; ngày thiếu dồn vào ngày API kế tiếp). Dòng không có Nguồn (chép từ TikTok Studio) giữ nguyên số xem/thích.
  Không xin trường `username` ở user/info: trường đó cần scope user.info.profile, thiếu là TikTok trả 401 (v4.9.1).
- Giao diện quản trị (v4.6): kính mờ (glass) toàn trang trên nền mảng màu loang `.nen-loang`; màu nhấn đọc từ biến CSS
  (--ac, --ac-grad, --b1..3). Thanh bên: Website Analytics (Lượt truy cập) và Mạng xã hội (Facebook / Instagram / TikTok,
  data-v fb/ig/tt, quyền xem). `datNen(v)` gắn lớp body nt-fb / nt-ig / nt-tt (TikTok nền tối) và đổi bảng màu biểu đồ `MAU`.
  Chỉ số: FB/IG có ER = tương tác ÷ lượt xem (theo đề cuối kỳ, dòng phụ ghi thêm ÷ người xem/tiếp cận), CTR = click liên kết ÷ lượt xem, chuyển đổi follow = theo dõi mới ÷
  lượt truy cập; TikTok có ER = (thích + bình luận + chia sẻ) ÷ lượt xem, tỉ lệ xem hồ sơ, chuyển đổi từ hồ sơ.
- v4.7: tab "📣 Quảng cáo IG" (nhập tay từ app Instagram, đọc theo tên cột) → khối Quảng cáo ở trang Instagram
  (CTR = click liên kết ÷ lượt hiển thị, chưa có hiển thị thì ÷ lượt xem từ quảng cáo; CPC, CPM cần số tiền đã chi).
  TikTok: trigger `dongBoTikTok` mỗi ngày ~23:15–23:45, tự tạo khi bấm Kết nối TikTok thành công.
- Meta Graph API (v4.8): app "Lộc Cộc Tracking" (Development). Page Access Token không hết hạn dán bằng menu Sheet
  "Kết nối Meta…" (Script Properties mt_token, mt_page, mt_ig…; KHÔNG để trong code/repo). `dongBoMeta_` ghi lại N ngày gần nhất
  vào tab FB/IG theo tên cột (`MT_FB`, `MT_IG_CHUOI`, `MT_IG_TONG` thử lần lượt tên chỉ số mới → cũ; chỉ số API không trả
  thì giữ số cũ, ghi vào mt_canh). Ngày theo giờ Thái Bình Dương như Meta Business Suite. Trigger `dongBoMeta` mỗi ngày 4h.
  FB "Lượt click liên kết" không có qua API Trang: giữ số chép tay.
  v4.9: mỗi lần đồng bộ còn lấy tổng người theo dõi hiện tại (FB `followers_count`, IG `followers_count` + `media_count`)
  lưu vào Script Property `mt_hien`; `mangXaHoi` trả `meta.hienTai`; trang FB/IG hiện khối "Tài khoản lúc này" và dòng tổng ở thẻ
  "Người theo dõi mới". Không lưu lịch sử tổng theo ngày (API chỉ trả số hiện tại).
- Báo cáo cuối kỳ (v4.10): `quantrivien/baocao.html` = slide HTML 1280×720 (≤ 20 slide theo khung 15 phần của đề), lấy số bằng
  chính các lệnh dashboard (`mangXaHoi`, `luotXem`, `vercel`, `tongQuan`) với token phiên trong sessionStorage (mở từ nút
  "Báo cáo cuối kỳ" ở thanh bên, cùng tab). Admin chính bấm "Chốt số liệu" → lệnh `chotSoLieu` lưu bản tổng hợp JSON vào tab ẩn
  "📌 Chốt số liệu"; slide mặc định đọc bản chốt mới nhất (`layChot`) để khớp PDF đã nộp. Tương tác ÷ LƯỢT XEM theo đề
  (dashboard cũng dùng công thức này để khớp khi mở nền tảng thực). Truy cập "từ bên ngoài" = phiên có nguồn ≠ "Trực tiếp". Khung `.bs` = chỗ nhóm cần bổ sung (ẩn khi in).
  Thông tin cố định (thành viên, KPI 6A/6B, BAT_DAU 26/09) ở đầu script, lấy từ "Proposal Final - cap nhat 03-11.pptx".
  Giao diện (09/11): slide tối xen slide sáng (lớp `.sang`, đổi biến màu ngay trên slide; slide có biểu đồ Chart.js giữ nền tối), thẻ kính có viền sáng
  + ánh sáng quét, thẻ hiện lần lượt, thanh/vòng % đạt chạy từ 0. Sau mỗi lần vẽ, `vua()` thu nhỏ tiêu đề quá 2 dòng và thu nhỏ (zoom) nội dung thẻ
  bị tràn, nên số liệu dài hơn vẫn không ra khỏi khung. Phần nội dung suy ra từ số liệu (PDCA 2, bài học, kế hoạch) có khung `.bs` nhắc nhóm duyệt lại.
- v4.11: `dongBoMeta_` gọi thêm `mtBaiDang_` → tab ẩn "📝 Bài đăng" (FB published_posts + video_reels, IG media; Kênh, Ngày, Giờ,
  Loại, Nội dung, Link, Thích, Bình luận); `mangXaHoi` trả `baiDang`. Slide báo cáo đếm tần suất đăng FB/IG theo tuần từ đây,
  so với kế hoạch `KH` (sheet "Tổng quan" của Content Plan - Loc Coc.xlsx). Ảnh 4 kênh cho slide 4: `quantrivien/anh-bao-cao/{fb,ig,tt,web}.jpg`.
- Bộ đếm (08/11): không đếm máy nội bộ (localStorage `lc_noibo`, đặt khi đăng nhập /quantrivien hoặc mở link `?noibo=1`,
  `?noibo=0` để bỏ); phiên vào từ link có `utm_source` ghi nguồn "utm: nguồn / phương tiện / chiến dịch".
- Form web có ô đồng ý bắt buộc (`.dy`, không có aria-label nên không bị gửi đi) + trang `#/chinh-sach-bao-mat` (Luật BVDLCN 2025).
- Đếm lượt xem dùng `fetch` với `credentials:"omit"`, KHÔNG dùng sendBeacon (luôn kèm cookie Google → mất lượt).
- Web: trang `#/tap-chi` và `#/tap-chi/<đường-dẫn>`; hàm `md()` định dạng nội dung bài có 2 bản giống hệt nhau
  (index.html và trang quản trị): sửa một chỗ thì sửa cả hai. Đếm lượt xem chỉ chạy trên tên miền loccoc.com.vn.
- Kiểm thử Code.gs không cần Google: script Node giả lập SpreadsheetApp/CacheService/Utilities (đã dùng khi viết v4).

## Mạng xã hội

- Facebook https://www.facebook.com/loccoc.com.vn · Instagram https://www.instagram.com/loccoc.com.vn/
  · TikTok https://www.tiktok.com/@loccoc.com.vn (biến `var LINKS` ở trang Liên hệ + footer).
- Đã bỏ TikTok Shop và Threads khỏi toàn trang. Zalo chưa có link, đang trỏ về `#/lien-he`.

## Xem trước trên máy

- macOS: trong thư mục repo chạy `python3 -m http.server 8765` rồi mở http://localhost:8765
- Windows: không có Python; dùng script PowerShell HttpListener hoặc mở `index.html` trực tiếp.
- Hiệu ứng mở đầu kéo dài ~2,5 giây: chụp màn hình sớm hơn sẽ thấy trang trống.

## Lưu ý khi sửa

- `index.html` dùng lẫn hai kiểu xuống dòng CRLF/LF. Trình soạn thảo có thể chuẩn hóa khi lưu,
  làm diff trông như đổi cả file: không ảnh hưởng tới việc chạy web. File có ảnh base64 rất dài:
  đừng đọc cả file một lần, hãy tìm theo chuỗi.
- Commit bằng tiếng Việt, mô tả rõ thay đổi; push lên `master` là web cập nhật ngay.
