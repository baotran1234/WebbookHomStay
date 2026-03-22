<template>
  <header class="hero">
    <div class="navbar">
      <router-link to="/" class="logo">COFFEE&TEA</router-link>
      <nav>
        <router-link to="/">TRANG CHỦ</router-link>
        <a href="">VỀ COFFEE&TEA</a>
       
        <a href="#">MENU</a>
      </nav>
      <!-- Tìm kiếm sản phẩm -->
      <div class="header-search">
        <!-- blur: khi người dùng click ra khỏi input -->
        <input placeholder="Tìm kiếm sản phẩm..." type="text" name="" id="" />
        <button class="search-btn" >Tìm kiếm</button>
        <!-- tạo dropdown để phục tìm kiếm sau này-->
        <div class="search-dropdown" >
          <template>
            <div 
              
              class="search-item"
              
            >
             <span>Hiển thị tên sản phẩm</span>
            </div>
          </template>
          <template>
            <div class="search-item not-found">Không có sản phẩm nào cả</div>
          </template>
        </div>
      </div>
      <div class="auth-buttons">
          <button class="btn-login" >Đăng nhập</button>
          <button class="btn-register" >Đăng ký</button>
      </div>
      <button class="cart-button" type="button" @click="goToCart">
        <svg
          class="cart-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 4H5L7.2 14.2C7.3 14.7 7.8 15 8.3 15H17.6C18.1 15 18.6 14.7 18.7 14.2L20 8H6"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="9" cy="19" r="1.5" fill="currentColor" />
          <circle cx="17" cy="19" r="1.5" fill="currentColor" />
        </svg>
        <span class="cart-label">Gio hang</span>
        <span class="cart-quantity">{{ cartStore.totalQuantity }}</span>
      </button>
    </div>
    <!-- End tìm kiếm -->

    <div class="banner">
      <img :src="require('@/assets/Banner_1.jpg')" alt="Banner Matcha" />
    </div>
  </header>
  
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const cartStore = useCartStore()

const goToCart = () => {
  router.push({ name: 'HoaDon' })
}

</script>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
}
.navbar {
  background: #0c2b44;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 50px;
}

/* Logo */
.navbar .logo {
  font-size: 28px;
  color: #d39e63;
  font-weight: bold;
  letter-spacing: 2px;
  text-decoration: none;
}

/* Menu */
.navbar nav {
  display: flex;
  align-items: center;
  gap: 25px;
}

.navbar nav a {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  transition: 0.3s;
}

.navbar nav a:hover {
  color: #d39e63;
}
.cart-icon-wrapper {
  position: relative;
  margin-left: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.cart-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  color: #fff;
  border-radius: 999px;
  padding: 7px 12px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.cart-button:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #d39e63;
}
.cart-icon {
  width: 20px;
  height: 20px;
  color: currentColor;
}
.cart-label {
  font-size: 0.92rem;
  font-weight: 600;
}
.banner {
  position: relative;
  overflow: hidden;
  animation: dropDownSmooth 1.2s ease forwards;
  opacity: 0;
}
@keyframes dropDownSmooth {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.banner img {
  width: 100%;
  display: block;
}
</style>
<style scoped>
.header-search {
  position: relative;
  display: flex;
  align-items: center;
  margin-right: 18px;
}
.header-search input {
  padding: 12px 18px;
  border-radius: 20px;
  border: 2px solid #e0e0e0;
  font-size: 1.08rem;
  min-width: 240px;
  outline: none;
  margin-right: 10px;
  background: #f9fafb;
  color: #222;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.06);
  transition: border 0.22s, box-shadow 0.22s;
}
.header-search input:focus {
  border: 2px solid #4caf50;
  background: #fff;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.13);
}
.header-search input::placeholder {
  color: #bdbdbd;
  font-size: 1.05rem;
  opacity: 1;
  font-style: italic;
}
.search-btn {
  background: #4caf50;
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 10px 18px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.search-btn:hover {
  background: #388e3c;
}
.search-dropdown {
  position: absolute;
  top: 110%;
  left: 0;
  width: 100%;
  background: #fff;
  border: 1.5px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 260px;
  overflow-y: auto;
  margin-top: 4px;
}
.search-item {
  padding: 12px 18px;
  cursor: pointer;
  font-size: 1.04rem;
  color: #222;
  transition: background 0.18s;
}
.search-item:hover {
  background: #f1f8e9;
}
.search-item.not-found {
  color: #bdbdbd;
  font-style: italic;
  cursor: default;
}
.cart-quantity {
  background: #b30404;
  color: #fff;
  border-radius: 999px;
  min-width: 24px;
  padding: 2px 8px;
  font-size: 0.85rem;
  font-weight: bold;
  text-align: center;
}
.auth-buttons
{
  display: flex;
  gap:10px;
  align-items: center;
}
.btn-login,
.btn-register{
  padding: 10px 24px;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
}
.btn-login{
  background: transparent;
  color: #fff;
  border: 2px solid #fff;
}
.btn-login:hover{
  background: #fff;
  color: #388e3c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255,255,255,0.3);
}
.btn-register{
  background: #ff4d4f;
  color: #fff;
  border: 2px solid #ff4d4f;
}
.btn-register:hover{
  background: #d39e63;
  border-color: #d39e63;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255,255,255,0.3);
}
</style>
