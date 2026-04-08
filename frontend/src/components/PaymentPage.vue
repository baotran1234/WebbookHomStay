<template>
  <section class="payment-page">
    <div class="payment-card" v-if="booking">
      <h1>Thanh toan QR</h1>
      <p class="subtitle">Quet ma QR va chuyen khoan dung noi dung de he thong doi soat tu dong.</p>

      <div class="payment-grid">
        <div class="qr-wrap">
          <img v-if="qrImage" :src="qrImage" alt="Ma QR thanh toan" class="qr-image" />
          <p v-else class="qr-placeholder">Dang tao ma QR...</p>
        </div>

        <div class="payment-info">
          <p><span>Ngan hang:</span> <strong>{{ bankInfo.bankName || 'Dang cap nhat' }}</strong></p>
          <p><span>Chu tai khoan:</span> <strong>{{ bankInfo.accountName || 'Dang cap nhat' }}</strong></p>
          <p><span>So tai khoan:</span> <strong>{{ bankInfo.accountNo || 'Dang cap nhat' }}</strong></p>
          <p><span>Ma don hang:</span> <strong>{{ booking.orderId }}</strong></p>
          <p><span>Ma thanh toan:</span> <strong>{{ paymentIntentId }}</strong></p>
          <p><span>So tien:</span> <strong>{{ formatPrice(booking.totalAmount) }}</strong></p>
          <p><span>Noi dung CK:</span> <strong>{{ transferContent || booking.orderId }}</strong></p>
          <p><span>Het han:</span> <strong>{{ expiresAtText }}</strong></p>
          <p><span>Khach hang:</span> <strong>{{ getCustomerName() }}</strong></p>
          <p><span>Email:</span> <strong>{{ getCustomerEmail() }}</strong></p>
          <p><span>So dien thoai:</span> <strong>{{ getCustomerPhone() }}</strong></p>
          <p><span>Trang thai:</span> <strong>{{ paymentStatusText }}</strong></p>
        </div>
      </div>

      <div class="hint-box">
        He thong dang cho webhook/xac nhan tu cong thanh toan. Neu giao dich dung so tien va dung ma don, trang thai se tu dong chuyen sang thanh cong.
      </div>

      <div class="actions">
        <button type="button" class="primary" @click="refreshIntent">Lam moi QR</button>
        <button type="button" class="secondary" @click="goBackCart">Quay lai gio hang</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const PAYMENT_PENDING_KEY = 'pendingBooking'
const PAYMENT_SUCCESS_KEY = 'paymentSuccessBooking'
const PAYMENT_API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:4010/api`
  : 'http://localhost:4010/api'
const ADMIN_API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:4010/api/admin`
  : 'http://localhost:4010/api/admin'

const router = useRouter()
const cartStore = useCartStore()
const booking = ref(null)
const paymentStatus = ref('pending')
const backendHealthy = ref(true)
const paymentIntentId = ref('Dang tao')
const transferContent = ref('')
const qrImage = ref('')
const bankInfo = ref({})
const expiresAt = ref(null)
let paymentWatcher = null

const expiresAtText = computed(() => {
  if (!expiresAt.value) return 'Dang cap nhat'
  const date = new Date(expiresAt.value)
  if (Number.isNaN(date.getTime())) return 'Dang cap nhat'
  return date.toLocaleString('vi-VN')
})

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} d`

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

const paymentStatusText = computed(() => {
  if (paymentStatus.value === 'success') return 'Thanh toan thanh cong'
  if (paymentStatus.value === 'expired') return 'Ma QR het han. Vui long tao lai.'
  if (paymentStatus.value === 'invalid') return 'Giao dich khong hop le'
  if (paymentStatus.value === 'waiting') return 'Dang cho xac nhan giao dich'
  if (!backendHealthy.value) return 'Khong ket noi duoc backend thanh toan'
  return 'Dang cho xac nhan giao dich'
})

const finalizePayment = (transactionData) => {
  if (!booking.value || !transactionData) return false

  const expectedOrderId = String(booking.value.orderId || '')
  const expectedAmount = Number(booking.value.totalAmount || 0)
  const receivedOrderId = String(transactionData.orderId || transactionData.transferContent || '')
  const receivedAmount = Number(transactionData.amount || 0)
  const status = String(transactionData.status || '').toLowerCase()

  if (!expectedOrderId || receivedOrderId !== expectedOrderId) {
    paymentStatus.value = 'invalid'
    return false
  }

  if (receivedAmount !== expectedAmount || status !== 'success') {
    paymentStatus.value = 'invalid'
    return false
  }

  const successBooking = {
    ...booking.value,
    paymentTransaction: transactionData,
    paymentIntentId: paymentIntentId.value,
    paymentStatus: 'success',
  }

  fetch(`${ADMIN_API_BASE}/bookings/${encodeURIComponent(booking.value.orderId)}/payment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentStatus: 'success',
    }),
  }).catch(() => null)

  localStorage.setItem(PAYMENT_SUCCESS_KEY, JSON.stringify(successBooking))
  localStorage.removeItem(PAYMENT_PENDING_KEY)
  cartStore.clearCart()
  paymentStatus.value = 'success'
  router.push('/payment-success')
  return true
}

const createPaymentIntent = async () => {
  if (!booking.value) return

  try {
    const response = await fetch(`${PAYMENT_API_BASE}/payments/qr/intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: booking.value.orderId,
        amount: Number(booking.value.totalAmount || 0),
        customer: booking.value.customer || {},
      }),
    })

    if (!response.ok) {
      backendHealthy.value = false
      return
    }

    const data = await response.json()
    const payment = data?.payment || {}

    paymentIntentId.value = payment.paymentId || 'Dang tao'
    transferContent.value = payment.transferContent || booking.value.orderId
    qrImage.value = payment.qrImageUrl || ''
    bankInfo.value = payment.bankInfo || {}
    expiresAt.value = payment.expiresAt || null
    paymentStatus.value = payment.status === 'pending' ? 'waiting' : String(payment.status || 'waiting')
    backendHealthy.value = true

    localStorage.setItem(PAYMENT_PENDING_KEY, JSON.stringify({
      ...booking.value,
      paymentIntentId: paymentIntentId.value,
    }))
  } catch (_error) {
    backendHealthy.value = false
  }
}

const checkPaymentStatus = async () => {
  if (!booking.value?.orderId) return

  try {
    const response = await fetch(`${PAYMENT_API_BASE}/payments/${booking.value.orderId}`)
    if (!response.ok) {
      backendHealthy.value = false
      return
    }

    backendHealthy.value = true
    const transactionData = await response.json()
    expiresAt.value = transactionData.expiresAt || expiresAt.value
    qrImage.value = transactionData.qrImageUrl || qrImage.value
    bankInfo.value = transactionData.bankInfo || bankInfo.value
    transferContent.value = transactionData.transferContent || transferContent.value
    paymentIntentId.value = transactionData.paymentId || paymentIntentId.value

    if (transactionData.status === 'success') {
      paymentStatus.value = 'success'
      finalizePayment(transactionData)
      return
    }

    if (transactionData.status === 'expired') {
      paymentStatus.value = 'expired'
      return
    }

    paymentStatus.value = transactionData.status === 'pending' ? 'waiting' : 'invalid'
  } catch (_error) {
    backendHealthy.value = false
  }
}

const refreshIntent = async () => {
  await createPaymentIntent()
  await checkPaymentStatus()
}

const goBackCart = () => {
  router.push('/cart')
}

onMounted(() => {
  const raw = localStorage.getItem(PAYMENT_PENDING_KEY)
  if (!raw) {
    router.push('/cart')
    return
  }

  try {
    booking.value = JSON.parse(raw)
  } catch (_error) {
    localStorage.removeItem(PAYMENT_PENDING_KEY)
    router.push('/cart')
    return
  }

  createPaymentIntent().then(checkPaymentStatus)
  paymentWatcher = setInterval(checkPaymentStatus, 2000)
})

onBeforeUnmount(() => {
  if (paymentWatcher) clearInterval(paymentWatcher)
})
</script>

<style scoped>
.payment-page {
  background: radial-gradient(circle at top, #171b25 0%, #08090d 52%, #050507 100%);
  min-height: 100%;
  padding: 24px 20px 40px;
}

.payment-card {
  max-width: 1000px;
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

.payment-grid {
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: 20px;
  align-items: start;
}

.qr-wrap {
  background: #f3e9ff;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  justify-content: center;
}

.qr-image {
  width: 100%;
  max-width: 320px;
  border-radius: 8px;
  display: block;
}

.qr-placeholder {
  color: #2a3245;
  font-weight: 700;
  text-align: center;
  padding: 32px 10px;
}

.payment-info {
  display: grid;
  gap: 10px;
  color: #d8e2f4;
}

.payment-info p {
  margin: 0;
  border: 1px solid #263148;
  border-radius: 8px;
  padding: 10px;
  background: #101724;
}

.payment-info span {
  color: #9fb1d1;
}

.hint-box {
  margin-top: 16px;
  border: 1px dashed #3a4763;
  border-radius: 10px;
  padding: 12px;
  color: #a9b8d4;
  background: #0f1520;
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

.actions .primary {
  background: #990066;
  color: #ffe8f6;
}

@media (max-width: 900px) {
  .payment-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
