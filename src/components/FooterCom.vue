<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <h4>NestStay Homestay</h4>
        <p>Dia chi: 123 Le Loi, Da Nang</p>
        <p>Hotline: 0912 345 678</p>
      </div>

      <div>
        <h4>Lien he</h4>
        <p>Email: support@neststay.vn</p>
        <p>Thoi gian ho tro: 08:00 - 22:00</p>
      </div>

      <div>
        <h4>Chinh sach</h4>
        <p>Chinh sach dat phong</p>
        <p>Hoan huy va doi lich</p>
      </div>
    </div>
    <p class="copyright">© 2026 NestStay. All rights reserved.</p>
  </footer>
</template>

<style scoped>
.site-footer {
  background: #10263b;
  color: #dde7f1;
  margin-top: 30px;
}

.footer-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 26px 20px 18px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

h4 {
  margin: 0 0 8px;
  color: #f7e9cc;
}

p {
  margin: 4px 0;
}

.copyright {
  margin: 0;
  padding: 10px 20px 16px;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  color: #bccbd9;
}
</style>