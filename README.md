# @bautran1911/n8n-nodes-zalo-oa

**n8n community node** tích hợp **Zalo Official Account (Zalo OA)** vào workflow n8n — cho phép gửi ZBS Template Message qua số điện thoại và tự động quản lý Access Token.

[![npm version](https://img.shields.io/npm/v/@bautran1911/n8n-nodes-zalo-oa)](https://www.npmjs.com/package/@bautran1911/n8n-nodes-zalo-oa)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![n8n community node](https://img.shields.io/badge/n8n-community%20node-FF6D5A)](https://docs.n8n.io/integrations/community-nodes/)

---

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Cài đặt](#cài-đặt)
- [Cấu hình Credential](#cấu-hình-credential)
- [Lấy Access Token và Refresh Token từ Zalo](#lấy-access-token-và-refresh-token-từ-zalo)
- [Operations](#operations)
- [Ví dụ sử dụng](#ví-dụ-sử-dụng)
- [Compatibility](#compatibility)
- [Tài nguyên](#tài-nguyên)
- [Tác giả](#tác-giả)
- [☕ Ủng hộ tác giả](#-ủng-hộ-tác-giả)

---

## Giới thiệu

**Zalo OA** là Trang Zalo Official Account — nền tảng nhắn tin của Zalo dành cho doanh nghiệp. Node này tích hợp **Zalo ZBS (Zalo Business Solution)** API để:

- 📨 Gửi **ZBS Template Message** qua số điện thoại người dùng
- 🔄 Tự động **Refresh Access Token** khi hết hạn và ghi đè vào n8n credential
- 🔐 Bảo mật token với cơ chế auto-retry

---

## Cài đặt

### Trong n8n (khuyên dùng)

1. Vào **Settings → Community Nodes**
2. Nhấn **Install**
3. Nhập `@bautran1911/n8n-nodes-zalo-oa`
4. Nhấn **Install** và khởi động lại n8n

### Thủ công (self-hosted)

```bash
npm install @bautran1911/n8n-nodes-zalo-oa
```

---

## Cấu hình Credential

Sau khi cài node, tạo credential **Zalo OA API** với các thông tin sau:

| Trường | Mô tả |
|--------|-------|
| **Credential Name** | Tên phân biệt credential này (ví dụ: `Zalo OA - Shop Thời Trang`) |
| **App ID** | Lấy tại [developers.zalo.me](https://developers.zalo.me) → App của bạn → App ID |
| **Secret Key** | Lấy tại [developers.zalo.me](https://developers.zalo.me) → App của bạn → Secret Key |
| **Access Token** | Xem hướng dẫn bên dưới |
| **Refresh Token** | Xem hướng dẫn bên dưới |
| **n8n Instance URL** | URL n8n của bạn, ví dụ: `http://localhost:5678` hoặc `https://n8n.example.com` |
| **n8n API Key** | Tạo tại n8n → **Settings → API → Create an API key** |
| **Credential ID** | Sau khi lưu credential, xem ID trên URL trình duyệt: `.../credentials/<ID>` |

---

## Lấy Access Token và Refresh Token từ Zalo

Zalo dùng OAuth2 với flow **Authorization Code + PKCE** không chuẩn. Cách lấy token:

### Bước 1 — Tạo App trên Zalo Developer

1. Đăng nhập tại [developers.zalo.me](https://developers.zalo.me)
2. Tạo ứng dụng mới → lấy **App ID** và **Secret Key**
3. Vào mục **Official Account → Liên kết OA** → liên kết OA của bạn với App

### Bước 2 — Lấy Authorization Code

Truy cập URL sau trên trình duyệt (thay `YOUR_APP_ID`):

```
https://oauth.zaloapp.com/v4/oa/permission?app_id=YOUR_APP_ID&redirect_uri=https://yourdomain.com/callback
```

Sau khi user đồng ý, Zalo redirect về:

```
https://yourdomain.com/callback?code=AUTHORIZATION_CODE
```

### Bước 3 — Đổi Code lấy Tokens

```bash
curl -X POST https://oauth.zaloapp.com/v4/oa/access_token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "secret_key: YOUR_SECRET_KEY" \
  -d "app_id=YOUR_APP_ID&code=AUTHORIZATION_CODE&grant_type=authorization_code"
```

Response:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 86400
}
```

Copy `access_token` và `refresh_token` vào credential.

> **Lưu ý:** Access Token có hiệu lực **7 ngày**, Refresh Token có hiệu lực **3 tháng**. Node sẽ tự động refresh khi phát hiện token hết hạn (lỗi `-124` hoặc `3`).

---

## Operations

### Resource: Tin Nhắn ZBS Template

**Gửi ZBS Template Message** qua số điện thoại người nhận.

| Tham số | Bắt buộc | Mô tả |
|---------|----------|-------|
| **Số Điện Thoại Người Nhận** | ✅ | Định dạng quốc tế, ví dụ: `84987654321` |
| **Template ID** | ✅ | ID template đã được phê duyệt trên Zalo OA |
| **Dữ Liệu Template (JSON)** | ✅ | Object JSON chứa các biến của template |
| **Tracking ID** | ❌ | Mã theo dõi tuỳ chỉnh (tối đa 48 ký tự) |
| **Chế Độ Gửi** | ❌ | `Gửi Thường` (trong hạn mức) hoặc `Gửi Vượt Hạn Mức` |

### Resource: Token

**Refresh Token** — Làm mới Access Token từ Refresh Token và tự động ghi đè vào credential.

Sử dụng khi muốn chủ động làm mới token (ví dụ: chạy định kỳ mỗi 5 ngày).

---

## Ví dụ sử dụng

### Gửi thông báo đặt hàng thành công

**Template Data:**

```json
{
  "customer_name": "Nguyễn Văn A",
  "order_id": "DH-2024-001",
  "total_amount": "500.000đ",
  "delivery_date": "10/04/2024"
}
```

**Cấu hình node:**

- **Số Điện Thoại:** `84987654321`
- **Template ID:** `123456`
- **Dữ Liệu Template:** JSON ở trên

### Tự động refresh token mỗi 5 ngày

Tạo workflow với:

1. **Schedule Trigger** → mỗi 5 ngày lúc 3:00 sáng
2. **Zalo OA node** → Resource: `Token` → Operation: `Refresh Token`

---

## Compatibility

| Phiên bản | Trạng thái |
|-----------|-----------|
| n8n ≥ 1.0.0 | ✅ Tương thích |
| Node.js ≥ 22 | ✅ Tương thích |

---

## Tài nguyên

- [Tài liệu Zalo ZBS API](https://developers.zalo.me/docs/zbs/)
- [Zalo OA API Reference](https://developers.zalo.me/docs/official-account/)
- [n8n Community Nodes Docs](https://docs.n8n.io/integrations/community-nodes/)
- [GitHub Repository](https://github.com/bautran1911/n8n-nodes-zalo-oa)

---

## Tác giả

**Báu Đẹp Trai**  
📧 [bautran1911@gmail.com](mailto:bautran1911@gmail.com)  
🐙 [github.com/bautran1911](https://github.com/bautran1911)

---

## ☕ Ủng hộ tác giả

Nếu node này giúp ích cho công việc của bạn, hãy ủng hộ tác giả một ly cà phê để tiếp tục phát triển và duy trì dự án! 🙏

### 🏦 Chuyển khoản ngân hàng (Việt Nam)

| Thông tin | Chi tiết |
|-----------|----------|
| **Ngân hàng** | MB Bank (Ngân Hàng Quân Đội) |
| **Số tài khoản** | `0930113997979` |
| **Chủ tài khoản** | TRAN NGOC BAU |
| **Nội dung CK** | `donate n8n zalo oa` |

> 💡 Bạn cũng có thể dùng **MoMo**, **ZaloPay**, hoặc **VietQR** để chuyển khoản nhanh qua số tài khoản trên.

---

## Version History

### v1.0.5 (2026-04-07)

- 🎉 Ra mắt lần đầu
- ✅ Gửi ZBS Template Message qua số điện thoại
- ✅ Tự động Refresh Access Token khi hết hạn
- ✅ Ghi đè token mới vào n8n credential qua REST API
