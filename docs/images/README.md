# 📁 Thư mục ảnh cho README

Thư mục này chứa các ảnh minh hoạ và QR code được sử dụng trong `README.md`.

---

## 📂 Cấu trúc thư mục

```
docs/images/
├── guides/          ← Ảnh hướng dẫn sử dụng (chụp màn hình)
│   ├── api-explorer-step2-select-app.png        ← Bước 2: Chọn ứng dụng
│   ├── api-explorer-step3-select-token-type.png ← Bước 3: Chọn OA Access Token
│   ├── api-explorer-step4-select-oa.png         ← Bước 4: Chọn Official Account
│   ├── api-explorer-step6-result-tokens.png     ← Bước 6: Kết quả Access/Refresh Token
│   └── n8n-credential-fill-tokens.png           ← Bước 7: Điền token vào credential n8n
│
└── donate/          ← QR code donate
    ├── qr-mbbank.png   ← QR MB Bank VietQR
    ├── qr-momo.png     ← QR MoMo
    └── qr-zalopay.png  ← QR ZaloPay
```

---

## 📸 Hướng dẫn chụp ảnh

### Ảnh hướng dẫn (`guides/`)

1. Truy cập <https://developers.zalo.me/tools/explorer>
2. Chụp màn hình từng bước theo tên file tương ứng
3. Khuyến nghị kích thước: **1200×700px** trở lên, crop sát vùng cần thiết
4. Lưu dưới định dạng `.png`

### QR Code (`donate/`)

- **qr-mbbank.png** — Tạo tại [vietqr.io](https://vietqr.io) với STK `0930113997979` MB Bank
- **qr-momo.png** — Tạo tại app MoMo → Nhận tiền → Lưu QR
- **qr-zalopay.png** — Tạo tại app ZaloPay → Nhận tiền → Lưu QR
- Kích thước khuyến nghị: **500×500px** (hình vuông)

> ⚠️ Các file `.gitkeep` trong thư mục con chỉ là placeholder để Git tracking thư mục rỗng — bạn có thể xóa sau khi thêm ảnh vào.
