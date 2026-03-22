<template>
  <section class="cart-page">
    <div class="cart-inner">
      <h1>Gio hang dat phong</h1>

      <form class="customer-info">
        <label>
          Ho ten khach hang
          <input v-model="customer.name" type="text" placeholder="Nhap ho ten" />
        </label>
        <label>
          Email
          <input v-model="customer.email" type="email" placeholder="Nhap email" />
        </label>
        <label>
          So dien thoai
          <input v-model="customer.phone" type="tel" placeholder="Nhap so dien thoai" />
        </label>
        <label>
          Dia chi
          <input v-model="customer.address" type="text" placeholder="Nhap dia chi" />
        </label>
      </form>

      <h2>Danh sach phong da chon</h2>
      <p v-if="cartStore.cartItems.length === 0" class="empty-cart">Gio hang dang trong.</p>

      <table v-else class="cart-table">
        <thead>
          <tr>
            <th>Hinh</th>
            <th>Ten phong</th>
            <th>Gia</th>
            <th>So luong</th>
            <th>Thanh tien</th>
            <th>Xoa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in cartStore.cartItems" :key="`${item.id}-${item.size}-${index}`">
            <td><img :src="getImageUrl(item.image)" :alt="item.name" class="cart-image" /></td>
            <td>
              <div class="room-name">{{ item.name }}</div>
              <small v-if="item.size">Loai phong: {{ item.size }}</small>
              <small v-if="item.toppings && item.toppings.length">Tien ich: {{ item.toppings.join(', ') }}</small>
            </td>
            <td>{{ formatPrice(item.price) }}</td>
            <td>
              <div class="qty-wrap">
                <button type="button" @click="cartStore.decreaseQuantity(index)">-</button>
                <input :value="item.quantity" type="number" min="1" @input="onQuantityInput(index, $event)" />
                <button type="button" @click="cartStore.increaseQuantity(index)">+</button>
              </div>
            </td>
            <td>{{ formatPrice(item.price * item.quantity) }}</td>
            <td><button type="button" class="remove-btn" @click="cartStore.removeItem(index)">Xoa</button></td>
          </tr>
        </tbody>
      </table>

      <div class="summary">
        <div class="payment-method">
          <label><input v-model="paymentMethod" type="radio" value="cash" /> Thanh toan tien mat</label>
          <label><input v-model="paymentMethod" type="radio" value="bank" /> Chuyen khoan ngan hang</label>
        </div>
        <p>Tong tien: <strong>{{ formatPrice(cartStore.totalAmount) }}</strong></p>
      </div>

      <div class="actions">
        <button type="button" class="secondary" @click="goHome">Tiep tuc xem phong</button>
        <button type="button" class="primary" :disabled="cartStore.cartItems.length === 0">Xac nhan dat phong</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const cartStore = useCartStore()

const paymentMethod = ref('cash')
const customer = reactive({
  name: '',
  email: '',
  phone: '',
  address: '',
})

const getImageUrl = (image) => {
  try {
    return require(`../assets/image/${image}`)
  } catch (error) {
    return ''
  }
}

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const onQuantityInput = (index, event) => {
  cartStore.updateQuantity(index, Number(event.target.value))
}

const goHome = () => {
  router.push('/')
}

onMounted(() => {
  cartStore.loadFromStorage()
})
</script>

<style scoped>
.cart-page {
  background: #f3f6fa;
  min-height: 100%;
}

.cart-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

h1,
h2 {
  color: #10263b;
}

.customer-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.customer-info label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  color: #3d5063;
  gap: 6px;
}

.customer-info input {
  height: 40px;
  border: 1px solid #ced8e3;
  border-radius: 8px;
  padding: 0 10px;
}

.cart-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}

.cart-table th,
.cart-table td {
  border: 1px solid #e5ebf2;
  padding: 10px;
  text-align: center;
}

.cart-table th:nth-child(2),
.cart-table td:nth-child(2) {
  text-align: left;
}

.room-name {
  font-weight: 700;
  color: #10263b;
}

.cart-table small {
  display: block;
  color: #5e7084;
}

.cart-image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
}

.qty-wrap {
  display: inline-flex;
  align-items: center;
  border: 1px solid #d0d9e5;
  border-radius: 8px;
  overflow: hidden;
}

.qty-wrap button {
  width: 28px;
  border: none;
  background: #f2f6fb;
  cursor: pointer;
}

.qty-wrap input {
  width: 56px;
  border: none;
  text-align: center;
}

.remove-btn {
  border: none;
  border-radius: 8px;
  background: #d9534f;
  color: #fff;
  padding: 8px 10px;
  cursor: pointer;
}

.summary {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.payment-method {
  display: flex;
  gap: 14px;
}

.summary strong {
  color: #c8432f;
}

.actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.actions button {
  border: none;
  border-radius: 8px;
  font-weight: 700;
  padding: 10px 14px;
  cursor: pointer;
}

.actions .secondary {
  background: #e6edf5;
  color: #10263b;
}

.actions .primary {
  background: #1b6b60;
  color: #fff;
}

.actions .primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-cart {
  margin-top: 8px;
  border: 1px dashed #cad6e2;
  border-radius: 8px;
  padding: 14px;
  color: #5a6d81;
  background: #fff;
}

@media (max-width: 900px) {
  .customer-info {
    grid-template-columns: 1fr;
  }

  .summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>