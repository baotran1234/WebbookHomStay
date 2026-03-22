<template>
  <header class="site-header">
    <div class="nav-inner">
      <router-link to="/" class="brand">NESTSTAY</router-link>

      <nav class="main-nav">
        <router-link to="/">Trang chu</router-link>
        <router-link to="/products">San pham</router-link>
        <router-link to="/cart">Gio hang</router-link>
        <button type="button" class="login-btn">Dang nhap</button>
      </nav>

      <button class="cart-button" type="button" @click="goToCart">
        <svg class="cart-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
        <span class="cart-label">Dat phong</span>
        <span class="cart-quantity">{{ cartStore.totalQuantity }}</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const cartStore = useCartStore()

const goToCart = () => {
  router.push({ name: 'Cart' })
}
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #10263b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.brand {
  text-decoration: none;
  color: #f7e9cc;
  font-weight: 800;
  letter-spacing: 1px;
  font-size: 1.2rem;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 18px;
}

.main-nav a {
  color: #e7edf3;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
}

.main-nav a.router-link-exact-active {
  color: #f7e9cc;
}

.login-btn {
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: transparent;
  color: #fff;
  border-radius: 999px;
  padding: 7px 12px;
  cursor: pointer;
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
}

.cart-icon {
  width: 20px;
  height: 20px;
}

.cart-label {
  font-size: 0.9rem;
  font-weight: 600;
}

.cart-quantity {
  background: #d9534f;
  color: #fff;
  border-radius: 999px;
  min-width: 24px;
  padding: 2px 8px;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
}

@media (max-width: 900px) {
  .nav-inner {
    flex-wrap: wrap;
  }

  .main-nav {
    order: 3;
    width: 100%;
    justify-content: space-between;
  }
}
</style>