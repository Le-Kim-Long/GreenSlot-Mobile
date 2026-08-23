# 📱 HƯỚNG DẪN CHẠY DEMO MOBILE & GIẢI PHÁP THANH TOÁN VNPAY

Tài liệu này hướng dẫn chi tiết cho các thành viên trong nhóm GreenSlot:
1. **Hiểu rõ nguyên nhân & khắc phục triệt để lỗi thanh toán VNPay trên Mobile.**
2. **Cài đặt và chạy ứng dụng Mobile ở môi trường LOCAL (Expo Go / LAN / Tunnel).**
3. **Build file APK trực tiếp (EAS Build) để cài vào điện thoại Android không cần máy tính.**
4. **Kịch bản kiểm thử (Test Checklist) các tính năng mới đồng bộ.**

---

## 🔍 PHẦN 1: GIẢI THÍCH NGUYÊN NHÂN LỖI THANH TOÁN VNPAY & CÁCH SỬA

### 1. Tại sao trước đó bạn trong nhóm test báo "Thanh toán không chạy được / Bị kẹt Pending"?

Quy trình thanh toán VNPay diễn ra như sau:
1. Mobile App gọi Backend tạo URL thanh toán VNPay.
2. Mobile mở trình duyệt (In-App Browser) đưa người dùng vào cổng Sandbox của VNPay.
3. Người dùng nhập thẻ test và bấm thanh toán.
4. **VNPay điều hướng trình duyệt quay về địa chỉ `vnp_ReturnUrl` do Backend chỉ định.**
5. **Backend nhận callback $\to$ Cập nhật trạng thái `SUCCESS` cho Transaction & kích hoạt Hợp đồng `ACTIVE` $\to$ Redirect về deep link `greenslot://payment-result` $\to$ Ứng dụng Mobile nhận kết quả.**

> [!CAUTION]
> **NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):**
> Trong file cấu hình Backend (`application.yml`), địa chỉ `returnUrl` mặc định là `http://localhost:8080/api/payments/vnpay-return`.
> Khi test trên **Điện thoại thật**:
> - Sau khi thanh toán xong trên VNPay, trình duyệt trên điện thoại cố gắng truy cập `http://localhost:8080/...`.
> - Nhưng trên điện thoại, `localhost` chính là **bản thân chiếc điện thoại**, KHÔNG PHẢI là máy tính đang chạy Spring Boot!
> - Trình duyệt điện thoại báo lỗi **"Không thể kết nối máy chủ (ERR_CONNECTION_REFUSED)"**.
> - Backend trên máy tính **không nhận được request**, nên không thể cập nhật trạng thái trong Database từ `PENDING` sang `SUCCESS`. Hợp đồng bị kẹt ở `PENDING`.

---

### 2. Cách cấu hình đúng 100% để thanh toán thành công trên Mobile

#### Cách A: Dùng chung mạng Wi-Fi (Khuyên dùng khi test nhóm nội bộ)
1. **Lấy IP LAN của máy tính chạy Backend:**
   - Mở PowerShell / CMD gõ: `ipconfig`
   - Tìm dòng `IPv4 Address` (Ví dụ: `192.168.1.15`).
2. **Cấu hình Backend (`GreenSlot-BackEnd`):**
   - Mở file `GreenSlot-BackEnd/GreeenSlot/src/main/resources/application.yml` (hoặc set biến môi trường):
   ```yaml
   greeenslot:
     vnpay:
       returnUrl: http://192.168.1.15:8080/api/payments/vnpay-return
       mobileReturnUrl: greenslot://payment-result
   ```
   *(Thay `192.168.1.15` bằng IP máy tính của bạn)*
3. **Cấu hình Mobile (`GreenSlot-Mobile/GreenSlot-Mobile`):**
   - Mở file `.env` (nếu chưa có thì tạo mới):
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.15:8080/api
   ```

#### Cách B: Dùng Tunnel (Ngrok / Cloudflare) khi các thành viên ở xa khác Wi-Fi
1. Mở terminal chạy Ngrok trỏ vào cổng 8080 của Backend:
   ```bash
   ngrok http 8080
   ```
   *(Giả sử được URL: `https://abcd-1234.ngrok-free.app`)*
2. Cấu hình Backend `application.yml`:
   ```yaml
   greeenslot:
     vnpay:
       returnUrl: https://abcd-1234.ngrok-free.app/api/payments/vnpay-return
   ```
3. Cấu hình Mobile `.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://abcd-1234.ngrok-free.app/api
   ```

---

### 3. Thông tin thẻ test VNPay Sandbox

Khi chuyển sang màn hình thanh toán VNPay, chọn **Thẻ nội địa / Tài khoản ngân hàng** và nhập:
- **Ngân hàng:** `NCB`
- **Số thẻ:** `9704198526191432198`
- **Tên chủ thẻ:** `NGUYEN VAN A`
- **Ngày phát hành:** `07/15`
- **Mã xác thực OTP:** `123456`

---

## 🚀 PHẦN 2: HƯỚNG DẪN CHẠY DEMO LOCAL (EXPO GO)

### Bước 1: Chuẩn bị
- Điện thoại cài ứng dụng **Expo Go** (từ Google Play trên Android hoặc App Store trên iOS).
- Máy tính đã cài **Node.js (>= 18)**.
- Điện thoại và máy tính kết nối **chung 1 mạng Wi-Fi** (hoặc laptop bắt Wi-Fi từ điện thoại phát).

### Bước 2: Cài đặt thư viện
Mở terminal tại thư mục `GreenSlot-Mobile/GreenSlot-Mobile`:
```bash
npm install
```

### Bước 3: Cấu hình biến môi trường
Tạo file `.env` trong thư mục `GreenSlot-Mobile/GreenSlot-Mobile`:
```env
EXPO_PUBLIC_API_URL=http://<IP_LAN_MAY_TINH>:8080/api
```
*(Ví dụ: `EXPO_PUBLIC_API_URL=http://192.168.1.15:8080/api`)*

### Bước 4: Khởi động ứng dụng
```bash
npx expo start -c
```

### Bước 5: Mở ứng dụng trên điện thoại
- **Android:** Mở ứng dụng **Expo Go** $\to$ bấm **Scan QR code** $\to$ quét mã QR trên màn hình terminal.
- **iOS:** Mở ứng dụng **Camera** mặc định $\to$ quét mã QR $\to$ chạm vào thông báo mở bằng **Expo Go**.
- **Nếu gặp lỗi mạng hoặc khác Wi-Fi:** Chạy chế độ tunnel:
  ```bash
  npx expo start --tunnel
  ```

---

## 📦 PHẦN 3: HƯỚNG DẪN BUILD FILE APK CHO ANDROID (CÀI TRỰC TIẾP)

Dành cho trường hợp muốn xuất ra file `.apk` cài trực tiếp vào điện thoại Android của các thành viên trong nhóm mà không cần cài đặt Node.js hay mở Expo Go.

### Cách 1: Build trên Cloud bằng EAS Build (Khuyên dùng - Nhanh, Không nặng máy)

1. **Cài đặt EAS CLI toàn cục:**
   ```bash
   npm install -g eas-cli
   ```

2. **Đăng nhập tài khoản Expo (Tạo tài khoản miễn phí tại [expo.dev](https://expo.dev)):**
   ```bash
   eas login
   ```

3. **Chạy lệnh build APK:**
   ```bash
   eas build --profile preview --platform android
   ```

4. **Nhận file APK:**
   - Quá trình build chạy trên máy chủ Expo Cloud trong khoảng 5 - 10 phút.
   - Khi hoàn tất, terminal sẽ hiển thị link tải trực tiếp file `.apk` và mã QR.
   - Gửi link này cho các bạn trong nhóm tải về điện thoại và bấm cài đặt.

### Cách 2: Build Local trên máy cá nhân (Cần có Android Studio + Android SDK)
```bash
eas build --profile preview --platform android --local
```
File `.apk` sẽ được xuất ra ngay tại thư mục máy tính của bạn.

---

## ✅ PHẦN 4: KỊCH BẢN KIỂM THỬ ĐẦY ĐỦ (TEST CHECKLIST)

Các thành viên nhóm có thể test theo đúng luồng người dùng thực tế:

| STT | Tính năng | Các bước thực hiện | Kết quả mong đợi |
|---|---|---|---|
| 1 | **Đăng ký & Xác thực OTP** | Đăng ký tài khoản mới $\to$ Nhập mã OTP gửi về Email. | Xác thực thành công và tự động đăng nhập. |
| 2 | **Thuê ô vườn đa trụ** | Chọn ô vườn $\to$ Tùy chọn nhiều trụ $\to$ Chọn giống rau cho từng trụ $\to$ Xem bảng bóc tách chi phí. | Chi phí tính đúng theo công thức: Tiền thuê ô + (Số hốc / 24 * Giá giống). |
| 3 | **Thanh toán VNPay** | Bấm "Thanh toán VNPay" $\to$ Nhập thẻ test NCB (`9704198526191432198` / `07/15` / OTP `123456`). | Trình duyệt tự đóng, App chuyển về màn hình kết quả thành công, Hợp đồng chuyển sang `ACTIVE`. |
| 4 | **Xem Hóa đơn & PDF** | Vào tab **Tài khoản** $\to$ **Lịch sử thanh toán** $\to$ Chọn 1 giao dịch $\to$ Bấm "Xem hóa đơn PDF". | Modal hiện chi tiết hóa đơn; PDF mở trong trình duyệt / tải về. |
| 5 | **Giám sát IoT thông minh** | Vào tab **Giám sát IoT** $\to$ Chọn ô vườn đang thuê từ menu dropdown. | Hiển thị chính xác thông số Cảm biến (Nhiệt độ, Độ ẩm đất, Ánh sáng, pH) của ô đó. |
| 6 | **Lịch sử thu hoạch** | Vào tab **Tài khoản** $\to$ **Lịch sử thu hoạch**. | Hiển thị danh sách các đợt đã thu hoạch, hình thức tự hái / nông trại hái và ngày thu hoạch. |
| 7 | **Yêu cầu trồng cây mới** | Vào Hợp đồng thuê $\to$ Yêu cầu gieo trồng mới $\to$ Chọn trụ cụ thể $\to$ Thanh toán tiền giống. | Tạo yêu cầu thành công, thanh toán cập nhật trạng thái `APPROVED`. |
| 8 | **Hủy hợp đồng chờ** | Chọn đơn thuê đang ở trạng thái `PENDING` $\to$ Bấm "Hủy đơn". | Đơn được hủy thành công, ô vườn trả về trạng thái `AVAILABLE`. |
