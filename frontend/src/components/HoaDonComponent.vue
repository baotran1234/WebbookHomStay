<template>
  <section class="cart-page">
    <div class="cart-inner">
      <h1>Giỏ hàng đặt phòng</h1>

      <form class="customer-info">
        <label>
          Họ tên khách hàng
          <input v-model="customer.name" type="text" placeholder="Nhập họ tên" />
        </label>
        <label>
          Email
          <input
            v-model.trim="customer.email"
            :class="{ invalid: errors.email }"
            type="email"
            placeholder="Nhap email"
            required
            pattern="^[^\\s@]+@gmail\\.com$"
            @input="validateField('email')"
            @blur="validateField('email')"
          />
          <small v-if="errors.email" class="field-error">{{ errors.email }}</small>
        </label>
        <label>
          Số điện thoại
          <div class="phone-row">
            <select v-model="customer.countryCode" class="country-code">
              <option v-for="code in countryCodes" :key="code" :value="code">{{ code }}</option>
            </select>
            <input
              v-model="customer.phone"
              :class="{ invalid: errors.phone }"
              type="tel"
              placeholder="Nhập số điện thoại"
              inputmode="numeric"
              minlength="9"
              maxlength="11"
              required
              @input="onPhoneInput"
              @blur="validateField('phone')"
            />
          </div>
          <small v-if="errors.phone" class="field-error">{{ errors.phone }}</small>
        </label>
        <label>
          Địa chỉ
          <input v-model="customer.address" type="text" placeholder="Nhập địa chỉ" />
        </label>
      </form>

      <h2>Danh sách phòng đã chọn</h2>
      <p v-if="cartStore.cartItems.length === 0" class="empty-cart">Giỏ hàng đang trống.</p>

      <table v-else class="cart-table">
        <thead>
          <tr>
            <th>Hình</th>
            <th>Tên phòng</th>
            <th>Giá</th>
            <th>Số lượng</th>
            <th>Thành tiền</th>
            <th>Xóa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in cartStore.cartItems" :key="`${item.id}-${item.size}-${index}`">
            <td><img :src="getImageUrl(item.image)" :alt="item.name" class="cart-image" /></td>
            <td>
              <div class="room-name">{{ item.name }}</div>
              <small v-if="item.slotLabel">Khung giờ: {{ item.slotLabel }}</small>
              <small v-if="item.bookingDate">Ngày vào: {{ item.bookingDate }}</small>
              <small v-if="item.size">Loại phòng: {{ item.size }}</small>
              <small v-if="item.toppings && item.toppings.length">Tiện ích: {{ item.toppings.join(', ') }}</small>
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
            <td><button type="button" class="remove-btn" @click="cartStore.removeItem(index)">Xóa</button></td>
          </tr>
        </tbody>
      </table>

      <div class="summary">
        <div class="payment-method">
          <label><input v-model="paymentMethod" type="radio" value="cash" /> Thanh toán tiền mặt</label>
          <label><input v-model="paymentMethod" type="radio" value="bank" /> Chuyển khoản ngân hàng</label>
        </div>
        <p>Tổng tiền: <strong>{{ formatPrice(cartStore.totalAmount) }}</strong></p>
      </div>

      <div class="actions">
        <button type="button" class="secondary" @click="goHome">Tiếp tục xem phòng</button>
        <button type="button" class="primary" :disabled="cartStore.cartItems.length === 0" @click="confirmBooking">Xác nhận đặt phòng</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const cartStore = useCartStore()
const authStore = useAuthStore()
const PAYMENT_PENDING_KEY = 'pendingBooking'
const PAYMENT_SUCCESS_KEY = 'paymentSuccessBooking'
const ADMIN_API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:4010/api/admin`
  : 'http://localhost:4010/api/admin'

const paymentMethod = ref('cash')
const countryCodes = ['+84', '+1', '+44', '+61', '+65', '+81', '+82', '+86']
const customer = reactive({
  name: '',
  email: '',
  countryCode: '+84',
  phone: '',
  address: '',
})

const errors = reactive({
  email: '',
  phone: '',
})

const normalizeDigits = (value) => String(value || '').replace(/\D/g, '')

const fillCustomerFromAuth = (user) => {
  if (!user) return

  customer.name = user.fullName || user.username || customer.name
  customer.email = user.email || customer.email
  customer.phone = normalizeDigits(user.phone || user.phoneNumber || customer.phone)
  customer.address = user.address || customer.address
}

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

const validateEmail = () => {
  const email = String(customer.email || '').trim().toLowerCase()
  if (!email) {
    errors.email = 'Email là bắt buộc.'
    return false
  }

  if (!/^[^\s@]+@gmail\.com$/.test(email)) {
    errors.email = 'Email phải đúng định dạng ...@gmail.com'
    return false
  }

  errors.email = ''
  return true
}

const validatePhone = () => {
  const digits = String(customer.phone || '').replace(/\D/g, '')

  if (!digits) {
    errors.phone = 'Số điện thoại là bắt buộc.'
    return false
  }

  if (digits.length < 9 || digits.length > 11) {
    errors.phone = 'Số điện thoại phải từ 9 đến 11 số.'
    return false
  }

  errors.phone = ''
  return true
}

const validateField = (field) => {
  if (field === 'email') return validateEmail()
  if (field === 'phone') return validatePhone()
  return true
}

const validateCustomer = () => {
  const emailOk = validateEmail()
  const phoneOk = validatePhone()
  return emailOk && phoneOk
}

const onPhoneInput = (event) => {
  customer.phone = String(event.target.value || '').replace(/\D/g, '')
  validatePhone()
}

const goHome = () => {
  router.push('/')
}

const upsertBookingToBackend = async (bookingData, paymentStatus) => {
  const response = await fetch(`${ADMIN_API_BASE}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...bookingData,
      paymentStatus,
    }),
  })

  let payload = null
  try {
    payload = await response.json()
  } catch (_error) {
    payload = null
  }

  return {
    ok: response.ok,
    payload,
  }
}

const confirmBooking = async () => {
  if (!validateCustomer()) return

  const normalizedPhone = String(customer.phone || '').replace(/\D/g, '')

  const bookingData = {
    orderId: `ORD-${Date.now()}`,
    customer: {
      ...customer,
      phone: normalizedPhone,
      fullPhone: `${customer.countryCode}${normalizedPhone}`,
    },
    paymentMethod: paymentMethod.value,
    items: [...cartStore.cartItems],
    totalAmount: cartStore.totalAmount,
    createdAt: new Date().toISOString(),
  }

  if (paymentMethod.value === 'bank') {
    const created = await upsertBookingToBackend(bookingData, 'pending')
    if (!created.ok) {
      const message = created?.payload?.message || 'Không thể tạo lịch đặt phòng vì trùng lịch hoặc lỗi server.'
      const suggestions = Array.isArray(created?.payload?.suggestions) ? created.payload.suggestions : []
      const suggestionText = suggestions.length > 0
        ? `\nPhòng đề xuất: ${suggestions.map((item) => item.roomName).join(', ')}`
        : ''
      alert(`${message}${suggestionText}`)
      return
    }

    localStorage.setItem(PAYMENT_PENDING_KEY, JSON.stringify(bookingData))
    router.push('/payment')
    return
  }

  const created = await upsertBookingToBackend(bookingData, 'pending')
  if (!created.ok) {
    const message = created?.payload?.message || 'Không thể tạo lịch đặt phòng vì trùng lịch hoặc lỗi server.'
    const suggestions = Array.isArray(created?.payload?.suggestions) ? created.payload.suggestions : []
    const suggestionText = suggestions.length > 0
      ? `\nPhòng đề xuất: ${suggestions.map((item) => item.roomName).join(', ')}`
      : ''
    alert(`${message}${suggestionText}`)
    return
  }

  localStorage.setItem(PAYMENT_SUCCESS_KEY, JSON.stringify(bookingData))
  cartStore.clearCart()
  router.push('/payment-success')
}

onMounted(() => {
  cartStore.loadFromStorage()
  fillCustomerFromAuth(authStore.user)
})

watch(
  () => authStore.user,
  (user) => {
    if (!user) return
    fillCustomerFromAuth(user)
  },
  { immediate: true },
)
</script>

<style scoped>
.cart-page {
  background: radial-gradient(circle at top, #171b25 0%, #08090d 52%, #050507 100%);
  min-height: 100%;
}

.cart-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

h1,
h2 {
  color: #eef4ff;
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
  color: #c3d0e8;
  gap: 6px;
}

.customer-info input {
  height: 40px;
  border: 1px solid #2c3649;
  border-radius: 8px;
  padding: 0 10px;
  background: #121722;
  color: #e8efff;
}

.customer-info input.invalid {
  border-color: #d9534f;
}

.phone-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 8px;
}

.country-code {
  height: 40px;
  border: 1px solid #2c3649;
  border-radius: 8px;
  padding: 0 8px;
  background: #121722;
  color: #e8efff;
}

.field-error {
  color: #ff9d8d;
  font-size: 12px;
  font-weight: 500;
}

.cart-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  background: #11151d;
  border: 1px solid #242c3c;
  border-radius: 10px;
  overflow: hidden;
}

.cart-table th,
.cart-table td {
  border: 1px solid #252f42;
  padding: 10px;
  text-align: center;
  color: #d8e2f4;
}

.cart-table th:nth-child(2),
.cart-table td:nth-child(2) {
  text-align: left;
}

.room-name {
  font-weight: 700;
  color: #eef4ff;
}

.cart-table small {
  display: block;
  color: #9fafc9;
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
  border: 1px solid #2d384b;
  border-radius: 8px;
  overflow: hidden;
}

.qty-wrap button {
  width: 28px;
  border: none;
  background: #1b2230;
  color: #e8efff;
  cursor: pointer;
}

.qty-wrap input {
  width: 56px;
  border: none;
  text-align: center;
  background: #121722;
  color: #e8efff;
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
  color: #ff9d8d;
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
  background: #151b27;
  color: #f2b8de;
  border: 1px solid #990066;
}

.actions .primary {
  background: #990066;
  color: #ffe8f6;
}

.actions .primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-cart {
  margin-top: 8px;
  border: 1px dashed #2e3950;
  border-radius: 8px;
  padding: 14px;
  color: #a5b2c8;
  background: #11151d;
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
