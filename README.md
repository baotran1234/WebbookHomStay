# WebbookHomStay

## Cấu trúc mới (Frontend + Backend)

```
my-project/
  frontend/                # Vue app
    src/
    public/
    babel.config.js
    jsconfig.json
    vue.config.js
    package.json

  backend/                 # API services
    db.json                # json-server data
    server/
      index.js             # payment backend (Express)
    package.json

  package.json             # orchestration scripts
  .gitignore
  README.md
```

## Cài đặt

```bash
npm install
npm run setup
```

## Chạy môi trường dev full stack

```bash
npm run dev
```

Lệnh này sẽ chạy đồng thời:
- Frontend Vue tại `http://localhost:8080`
- Json server tại `http://localhost:3010`
- Payment backend tại `http://localhost:4010`

## Admin dashboard

- Truy cap: `http://localhost:8080/admin`
- Chuc nang:
  - Theo doi booking theo phong va khung gio
  - Canh bao trung lich
  - Goi y phong trong neu bi trung lich
  - Quan ly trang thai booking (confirmed, checked_in, completed, cancelled)
  - Xem doanh thu 7 ngay va 12 thang dang bar chart

## Dang ky / Dang nhap

- Dang ky bat buoc: ten dang nhap, ho ten, gmail, so dien thoai, dia chi nha, mat khau.
- Mat khau phai co:
  - it nhat 8 ky tu
  - 1 chu hoa, 1 chu thuong, 1 so, 1 ky tu dac biet
- Dang nhap bang: ten dang nhap hoac gmail hoac so dien thoai.
- Dang nhap quan tri:
  - tu trang chu (nut `Dang nhap quan tri`)
  - hoac truy cap thang `/admin` de dang nhap.

Tai khoan admin mac dinh:
- username: `admin`
- password: `Admin@123`

## Build frontend

```bash
npm run build
```

## Lint frontend

```bash
npm run lint
```
