# Ghi chú dự án Lộc Cộc (cho trợ lý AI trong Cursor)

- Website tĩnh một trang: toàn bộ HTML/CSS/JS nằm trong `index.html`, không có bước build.
- Triển khai: Vercel tự deploy mỗi khi push lên nhánh `master` (tên miền loccoc.com.vn).
- Điều hướng bằng hash: `#/`, `#/basic`, `#/basic-0` … `#/basic-9`, `#/san-pham`, `#/mau-N`, `#/thiet-ke`, `#/lien-he`…
- Kiểm tra bằng cách mở `index.html` trực tiếp trên trình duyệt trước khi push.

## Dòng Basic (10 mẫu, đồng giá)

- `var B=[...]`: mỗi mẫu là [tên, mô tả ngắn, đoạn giới thiệu, quai, gỗ & đế, hợp với].
- `var BI=[...]`: ảnh nền trắng (WebP base64) theo đúng thứ tự `B`. Dùng ở trang Basic, lưới 10 mẫu
  trên trang chủ và là ảnh đầu tiên trong bộ ảnh chi tiết.
- `var PRICE`: giá chung.
- `var BG=[...]`: thư mục ảnh chụp của mẫu `B[i]` (B01–B10).
  - Ảnh gốc PNG ở `anh_sanpham_basic/Bxx/`, không dùng trực tiếp trên web (6–8 MB/ảnh).
  - Bản nén cho web: `img/basic/Bxx-k.webp` (1200px) và `img/basic/Bxx-k-600.webp` (600px),
    với k = 1 cận quai, 2 cận đế gỗ, 3 khi mang.
- Chữ "10 mẫu" xuất hiện ở nhiều chỗ: đổi số mẫu thì sửa hết.

## Font

- Chỉ dùng Plus Jakarta Sans (đủ dấu tiếng Việt, độ đậm tối đa 800). Không dùng lại DM Sans:
  font đó thiếu dấu tiếng Việt nên các chữ như ộ, ố, ữ bị hiện bằng font khác.
- Chữ viền: không dùng `color:transparent` + `-webkit-text-stroke` vì lộ nét chồng bên trong chữ.
  Dùng `color:<màu nền>; -webkit-text-stroke:<gấp đôi độ dày>; paint-order:stroke fill`.
- Khối "Sẵn sàng lộc cộc chưa?" dùng Bricolage Grotesque + Fraunces, chỉ tải các ký tự liệt kê ở
  tham số `text=` của link Google Fonts: thêm chữ mới vào khối này thì thêm ký tự vào `text=`.

## Lưu ý khi sửa

- `index.html` dùng lẫn hai kiểu xuống dòng CRLF/LF. Trình soạn thảo có thể chuẩn hóa khi lưu,
  làm diff trông như đổi cả file: không ảnh hưởng tới việc chạy web.
