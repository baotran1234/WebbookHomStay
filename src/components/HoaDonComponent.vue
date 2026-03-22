<template>
  <div class="hoadon-modal">
    <div class="hoadon-content">
      <h2>Giỏ Hàng</h2>

      <form class="customer-info">
        <label>Họ tên khách hàng:
          <input v-model="customer.name" type="text" required />
        </label>
        <label>Email:
          <input v-model="customer.email" type="email" required />
        </label>
        <label>Số điện thoại:
          <input v-model="customer.phone" type="tel" required />
        </label>
        <label>Địa chỉ:
          <input v-model="customer.address" type="text" required />
        </label>
      </form>

      <h3>Danh sách sản phẩm đã chọn</h3>
      <div v-if="cartStore.cartItems.length === 0" class="empty-cart">Giỏ hàng đang trống.</div>

      <table v-else class="cart-table">
        <thead>
          <tr>
            <th>Hình</th>
            <th>Tên sản phẩm</th>
            <th>Giá</th>
            <th>Số lượng</th>
            <th>Thành tiền</th>
            <th>Xóa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in cartStore.cartItems" :key="`${item.id}-${item.size}-${index}`">
            <td>
              <img :src="getImageUrl(item.image)" :alt="item.name" class="cart-image" />
            </td>
            <td class="product-details-cell">
              <div class="product-name">{{ item.name }}</div>
              <div class="product-specs">
                <small v-if="item.size" class="spec-item">📏 {{ item.size }}</small>
                <small v-if="item.toppings && item.toppings.length" class="spec-item">🍯 {{ item.toppings.join(', ') }}</small>
              </div>
            </td>
            <td>{{ formatPrice(item.price) }}</td>
            <td>
              <div class="qty-wrap">
                <button type="button" @click="cartStore.decreaseQuantity(index)">-</button>
                <input
                  :value="item.quantity"
                  type="number"
                  min="1"
                  @input="onQuantityInput(index, $event)"
                />
                <button type="button" @click="cartStore.increaseQuantity(index)">+</button>
              </div>
            </td>
            <td>{{ formatPrice(item.price * item.quantity) }}</td>
            <td>
              <button type="button" class="remove-btn" @click="cartStore.removeItem(index)">Xóa</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="total">Tổng tiền: <b>{{ formatPrice(cartStore.totalAmount) }}</b></div>

      <div class="payment-method">
        <label>
          <input v-model="paymentMethod" type="radio" value="cash" /> Tiền mặt
        </label>
        <label>
          <input v-model="paymentMethod" type="radio" value="bank" /> Ngân hàng
        </label>
      </div>

      <div class="hoadon-actions">
        <button class="close-btn" type="button" formnovalidate @click="handleClose">Đóng</button>
        <button class="pay-btn" type="button" :disabled="cartStore.cartItems.length === 0">Xác nhận thanh toán</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineEmits, reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const emit = defineEmits(['close'])
const router = useRouter()
const route = useRoute()
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
  } catch (e) {
    return ''
  }
}

const onQuantityInput = (index, event) => {
  const value = Number(event.target.value)
  cartStore.updateQuantity(index, value)
}

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const handleClose = () => {
  if (route.name === 'HoaDon') {
    router.push('/')
    return
  }

  emit('close')
}

onMounted(() => {
  cartStore.loadFromStorage()
})
</script>

<style scoped>
.hoadon-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25);
}
.hoadon-content {
  background: #fff;
  border-radius: 12px;
  padding: 32px 28px 18px 28px;
  min-width: 380px;
  max-width: 1100px;
  width: 95vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}
.empty-cart {
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 18px;
  text-align: center;
  color: #666;
  margin-bottom: 12px;
}
.payment-method {
  margin: 18px 0 10px 0;
  font-weight: 500;
  display: flex;
  gap: 24px;
}
.payment-method label {
  cursor: pointer;
}
.qr-section {
  text-align: center;
  margin-bottom: 12px;
}
.qr-title {
  font-weight: 600;
  margin-bottom: 6px;
}
.qr-image {
  width: 180px;
  height: 180px;
  object-fit: contain;
  margin-bottom: 6px;
}
.qr-note {
  font-size: 0.95rem;
  color: #388e3c;
  margin-bottom: 8px;
}
.customer-info label {
  display: block;
  margin-bottom: 10px;
  font-weight: 500;
}
.customer-info input {
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #bdbdbd;
  margin-top: 3px;
  margin-bottom: 8px;
}
.cart-table {
  width: 100%;
  border-collapse: collapse;
  margin: 18px 0 10px 0;
}
.cart-table th, .cart-table td {
  border: 1px solid #e0e0e0;
  padding: 7px 10px;
  text-align: center;
}
.cart-table th:nth-child(2), .cart-table td:nth-child(2) {
  text-align: left;
}
.product-details-cell {
  min-width: 180px;
}
.product-name {
  font-weight: 600;
  color: #0c2b44;
  margin-bottom: 4px;
}
.product-specs {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.spec-item {
  font-size: 0.85rem;
  color: #666;
  display: block;
}
.cart-image {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  object-fit: cover;
}
.qty-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.qty-wrap button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: #f1f1f1;
  cursor: pointer;
}
.qty-wrap input {
  width: 54px;
  text-align: center;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.remove-btn {
  background: #ef5350;
  border: none;
  border-radius: 4px;
  color: #fff;
  padding: 6px 10px;
  cursor: pointer;
}
.total {
  text-align: right;
  font-size: 1.1rem;
  margin: 10px 0 18px 0;
}
.hoadon-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.close-btn, .pay-btn {
  padding: 8px 18px;
  border-radius: 6px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.close-btn {
  background: #e0e0e0;
  color: #333;
}
.pay-btn {
  background: #4caf50;
  color: #fff;
}
.pay-btn:hover {
  background: #388e3c;
}
.pay-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
