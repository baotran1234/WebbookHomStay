<template>
  <section class="success-page">
    <div class="success-card">
      <h1>Thanh toán thành công</h1>
      <p class="subtitle">Cảm ơn bạn đã đặt phòng. Đơn của bạn đã được ghi nhận.</p>

      <div class="summary" v-if="booking">
        <p><span>Mã đơn hàng:</span> <strong>{{ getOrderId() }}</strong></p>
        <p><span>Khách hàng:</span> <strong>{{ getCustomerName() }}</strong></p>
        <p><span>Email:</span> <strong>{{ getCustomerEmail() }}</strong></p>
        <p><span>Số điện thoại:</span> <strong>{{ getCustomerPhone() }}</strong></p>
        <p><span>Phương thức:</span> <strong>{{ paymentText }}</strong></p>
        <p><span>Tổng tiền:</span> <strong>{{ formatPrice(booking.totalAmount) }}</strong></p>
      </div>

      <div class="actions">
        <button type="button" class="secondary" @click="goHome">Về trang chủ</button>
        <button type="button" class="secondary ghost" @click="goBookedRooms">Phòng đã đặt</button>
        <button type="button" class="primary" @click="goProducts">Tiếp tục đặt phòng</button>
      </div>

      <div v-if="showCelebrate" class="celebrate-modal" role="dialog" aria-live="polite">
        <div class="celebrate-card">
          <h2>Bạn đã đặt phòng thành công!</h2>
          <p>Cảm ơn bạn. Đang chuyển đến trang đặt phòng...</p>
          <button type="button" class="secondary ghost" @click="finishCelebrate">Đi ngay</button>
        </div>
        <div class="confetti-layer" aria-hidden="true">
          <span
            v-for="item in confettiItems"
            :key="item.id"
            class="confetti"
            :style="{
              left: `${item.left}%`,
              background: item.color,
              animationDelay: `${item.delay}s`,
              animationDuration: `${item.duration}s`,
            }"
          ></span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const PAYMENT_SUCCESS_KEY = 'paymentSuccessBooking'

const router = useRouter()
const booking = ref(null)
const showCelebrate = ref(false)
let redirectTimer = null

const confettiPalette = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f2b8de', '#cce1ff']
const confettiItems = Array.from({ length: 48 }, (_item, index) => ({
  id: `cf-${index}`,
  left: Math.floor(Math.random() * 100),
  delay: Number((Math.random() * 0.8).toFixed(2)),
  duration: Number((2.2 + Math.random() * 1.2).toFixed(2)),
  color: confettiPalette[index % confettiPalette.length],
}))

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const getOrderId = () => {
  if (!booking.value) return 'Không có'
  return booking.value.orderId || 'Không có'
}

const getCustomerName = () => {
  if (!booking.value || !booking.value.customer) return 'Khách lẻ'
  return booking.value.customer.name || 'Khách lẻ'
}

const getCustomerEmail = () => {
  if (!booking.value || !booking.value.customer) return 'Không có'
  return booking.value.customer.email || 'Không có'
}

const getCustomerPhone = () => {
  if (!booking.value || !booking.value.customer) return 'Không có'
  return booking.value.customer.fullPhone || booking.value.customer.phone || 'Không có'
}

const paymentText = computed(() => {
  if (!booking.value?.paymentMethod) return 'Không xác định'
  return booking.value.paymentMethod === 'bank' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt'
})

const goHome = () => {
  router.push('/')
}

const goProducts = () => {
  showCelebrate.value = true
  if (redirectTimer) {
    window.clearTimeout(redirectTimer)
  }
  redirectTimer = window.setTimeout(() => {
    finishCelebrate()
  }, 3000)
}

const finishCelebrate = () => {
  showCelebrate.value = false
  if (redirectTimer) {
    window.clearTimeout(redirectTimer)
    redirectTimer = null
  }
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

onBeforeUnmount(() => {
  if (!redirectTimer) return
  window.clearTimeout(redirectTimer)
  redirectTimer = null
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

.celebrate-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(8, 10, 14, 0.58);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.celebrate-card {
  width: min(92vw, 460px);
  border: 1px solid #375688;
  border-radius: 14px;
  background: linear-gradient(160deg, #101a29 0%, #0d1422 100%);
  padding: 20px;
  text-align: center;
  position: relative;
  z-index: 2;
}

.celebrate-card h2 {
  margin: 0 0 8px;
  color: #f7e9cc;
}

.celebrate-card p {
  margin: 0 0 14px;
  color: #cce1ff;
}

.confetti-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.confetti {
  position: absolute;
  top: -10%;
  width: 8px;
  height: 14px;
  border-radius: 2px;
  opacity: 0.95;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-iteration-count: 1;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(-10vh) rotate(0deg);
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  100% {
    transform: translateY(115vh) rotate(560deg);
    opacity: 0.2;
  }
}

@media (max-width: 900px) {
  .actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
