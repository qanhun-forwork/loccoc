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
- Gmail cá nhân gửi tối đa khoảng 100 email/ngày; mỗi địa chỉ tối đa 3 email/giờ (chống lạm dụng).

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
