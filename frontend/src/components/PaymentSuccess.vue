<template>
  <section class="success-page">
    <div class="success-card">
      <h1>Thanh toan thanh cong</h1>
      <p class="subtitle">Cam on ban da dat phong. Don cua ban da duoc ghi nhan.</p>

      <div class="summary" v-if="booking">
        <p><span>Ma don hang:</span> <strong>{{ getOrderId() }}</strong></p>
        <p><span>Khach hang:</span> <strong>{{ getCustomerName() }}</strong></p>
        <p><span>Email:</span> <strong>{{ getCustomerEmail() }}</strong></p>
        <p><span>So dien thoai:</span> <strong>{{ getCustomerPhone() }}</strong></p>
        <p><span>Phuong thuc:</span> <strong>{{ paymentText }}</strong></p>
        <p><span>Tong tien:</span> <strong>{{ formatPrice(booking.totalAmount) }}</strong></p>
      </div>

      <div class="actions">
        <button type="button" class="secondary" @click="goHome">Ve trang chu</button>
        <button type="button" class="secondary ghost" @click="goBookedRooms">Phong da dat</button>
        <button type="button" class="primary" @click="goProducts">Tiep tuc dat phong</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const PAYMENT_SUCCESS_KEY = 'paymentSuccessBooking'

const router = useRouter()
const booking = ref(null)

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const getOrderId = () => {
  if (!booking.value) return 'Khong co'
  return booking.value.orderId || 'Khong co'
}

const getCustomerName = () => {
  if (!booking.value || !booking.value.customer) return 'Khach le'
  return booking.value.customer.name || 'Khach le'
}

const getCustomerEmail = () => {
  if (!booking.value || !booking.value.customer) return 'Khong co'
  return booking.value.customer.email || 'Khong co'
}

const getCustomerPhone = () => {
  if (!booking.value || !booking.value.customer) return 'Khong co'
  return booking.value.customer.fullPhone || booking.value.customer.phone || 'Khong co'
}

const paymentText = computed(() => {
  if (!booking.value?.paymentMethod) return 'Khong xac dinh'
  return booking.value.paymentMethod === 'bank' ? 'Chuyen khoan ngan hang' : 'Tien mat'
})

const goHome = () => {
  router.push('/')
}

const goProducts = () => {
  router.push('/products')
}

const goBookedRooms = () => {
  router.push('/booked-rooms')
}

onMounted(() => {
  const raw = localStorage.getItem(PAYMENT_SUCCESS_KEY)
  if (!raw) return

  try {
    booking.value = JSON.parse(raw)
  } catch (error) {
    booking.value = null
  }
})
</script>

<style scoped>
.success-page {
  background: radial-gradient(circle at top, #171b25 0%, #08090d 52%, #050507 100%);
  min-height: 100%;
  padding: 24px 20px 40px;
}

.success-card {
  max-width: 860px;
  margin: 0 auto;
  border: 1px solid #242c3c;
  border-radius: 14px;
  background: #11151d;
  padding: 20px;
}

h1 {
  margin: 0;
  color: #eef4ff;
}

.subtitle {
  color: #a9b8d4;
  margin: 8px 0 18px;
}

.summary {
  display: grid;
  gap: 10px;
}

.summary p {
  margin: 0;
  border: 1px solid #263148;
  border-radius: 8px;
  padding: 10px;
  background: #101724;
  color: #d8e2f4;
}

.summary span {
  color: #9fb1d1;
}

.actions {
  margin-top: 16px;
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

.actions .secondary.ghost {
  color: #cce1ff;
  border-color: #305f99;
}

.actions .primary {
  background: #990066;
  color: #ffe8f6;
}

@media (max-width: 900px) {
  .actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
