<template>
  <section class="booked-page">
    <div class="booked-card">
      <div class="hero">
        <div>
          <h1>Phòng đã đặt</h1>
          <p class="subtitle">Xem lại các phòng bạn đã đặt, thời gian nhận phòng và trạng thái đơn.</p>
        </div>
        <button type="button" class="refresh-btn" @click="loadBookings">Làm mới</button>
      </div>

      <p v-if="errorMessage" class="error-box">{{ errorMessage }}</p>
      <p v-else-if="loading" class="empty-state">Đang tải danh sách booking...</p>
      <p v-else-if="!auth.isLoggedIn" class="empty-state">Bạn cần đăng nhập để xem các phòng đã đặt.</p>
      <p v-else-if="!userBookings.length" class="empty-state">Hiện chưa có booking nào thuộc tài khoản này.</p>

      <div v-else class="booking-list">
        <article v-for="booking in userBookings" :key="booking.bookingId" class="booking-card">
          <div class="booking-head">
            <div>
              <h2>{{ booking.orderId }}</h2>
              <p>{{ toBookingStatusLabel(booking.status) }} / {{ toPaymentStatusLabel(booking.paymentStatus) }}</p>
              <span v-if="canCancelBooking(booking)" class="cancel-badge">
                Hủy trong {{ getCancelRemainingText(booking) }}
              </span>
              <span v-else-if="isCancellationWindowExpired(booking)" class="cancel-badge expired">
                Hết hạn hủy sau 2 giờ
              </span>
            </div>
            <div class="booking-head-actions">
              <strong>{{ formatPrice(booking.totalAmount) }}</strong>
              <button
                v-if="canCancelBooking(booking)"
                type="button"
                class="cancel-btn"
                @click="openCancelModal(booking.bookingId)"
              >
                Hủy booking
              </button>
            </div>
          </div>

          <div class="booking-meta">
            <span>Khách: {{ getBookingCustomerField(booking, 'name', auth.displayName) }}</span>
            <span>Email: {{ getBookingCustomerField(booking, 'email', 'Không có') }}</span>
            <span>SĐT: {{ getBookingCustomerField(booking, 'phone', 'Không có') }}</span>
            <span>Cập nhật: {{ formatDate(booking.updatedAt || booking.createdAt) }}</span>
          </div>

          <div class="room-list">
            <div v-for="item in booking.items" :key="item.lineId" class="room-item">
              <div>
                <h3>{{ item.roomName }}</h3>
                <p>{{ item.size || 'Tiêu chuẩn' }}</p>
              </div>
              <div class="room-time">
                <span>{{ formatDate(item.startAt) }}</span>
                <span>{{ formatDate(item.endAt) }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-if="showCancelModal" class="modal-overlay" role="dialog" aria-modal="true" aria-live="polite">
        <div class="cancel-modal">
          <div class="modal-heading">
            <span class="modal-mark">!</span>
            <h3>Xác nhận hủy booking</h3>
          </div>
          <p>Bạn có chắc chắn muốn hủy booking này không? Hành động này không thể hoàn tác.</p>
          <div class="modal-actions">
            <button type="button" class="modal-btn secondary" @click="closeCancelModal">Giữ lại</button>
            <button type="button" class="modal-btn danger" @click="confirmCancelBooking">Xác nhận hủy</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const ADMIN_API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:4010/api/admin`
  : 'http://localhost:4010/api/admin'

const auth = useAuthStore()
const bookings = ref([])
const loading = ref(false)
const errorMessage = ref('')
const nowTick = ref(Date.now())
const showCancelModal = ref(false)
const selectedCancelBookingId = ref('')
let countdownTimer = null

const normalizeDigits = (value) => String(value || '').replace(/\D/g, '')
const normalizeText = (value) => String(value || '').trim().toLowerCase()

const isBookingOwnedByUser = (booking, user) => {
  if (!booking || !user) return false

  const bookingEmail = normalizeText(booking.customer?.email)
  const userEmail = normalizeText(user.email)
  if (bookingEmail && userEmail && bookingEmail === userEmail) return true

  const bookingPhone = normalizeDigits(booking.customer?.phone)
  const userPhone = normalizeDigits(user.phone)
  if (bookingPhone && userPhone && bookingPhone === userPhone) return true

  const bookingName = normalizeText(booking.customer?.name)
  const userName = normalizeText(user.fullName || user.username)
  return Boolean(bookingName && userName && bookingName === userName)
}

const userBookings = computed(() => {
  if (!auth.user) return []
  return bookings.value.filter((booking) => isBookingOwnedByUser(booking, auth.user))
})

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const getCancelDeadline = (booking) => new Date(new Date(booking?.createdAt || new Date().toISOString()).getTime() + 2 * 60 * 60 * 1000)

const getCancelRemainingMs = (booking) => Math.max(0, getCancelDeadline(booking).getTime() - nowTick.value)

const isCancellationWindowExpired = (booking) => getCancelRemainingMs(booking) <= 0

const getCancelRemainingText = (booking) => {
  const totalMinutes = Math.ceil(getCancelRemainingMs(booking) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (totalMinutes <= 0) return '0 phút'
  if (hours <= 0) return `${Math.max(1, minutes)} phút`
  if (minutes === 0) return `${hours} giờ`
  return `${hours} giờ ${minutes} phút`
}

const formatDate = (value) => {
  if (!value) return 'Không có'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN')
}

const toPaymentStatusLabel = (status) => {
  const map = {
    pending: 'Chờ thanh toán',
    success: 'Đã thanh toán',
    invalid: 'Thanh toán lỗi',
    expired: 'Hết hạn',
  }
  return map[String(status || '').toLowerCase()] || String(status || 'Không rõ')
}

const toBookingStatusLabel = (status) => {
  const map = {
    pending_payment: 'Chờ thanh toán',
    pending_confirmation: 'Chờ admin xác nhận',
    confirmed: 'Đã xác nhận',
    checked_in: 'Đã nhận phòng',
    checked_out: 'Đã trả phòng',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
  }
  return map[String(status || '').toLowerCase()] || String(status || 'Không rõ')
}

const canCancelBooking = (booking) => {
  const status = String(booking?.status || '').toLowerCase()
  return ['pending_payment', 'pending_confirmation', 'confirmed'].includes(status) && !isCancellationWindowExpired(booking)
}

const getBookingCustomerField = (booking, field, fallback) => {
  if (!booking || !booking.customer || booking.customer[field] == null || booking.customer[field] === '') {
    return fallback
  }
  return booking.customer[field]
}

const loadBookings = async () => {
  if (!auth.isLoggedIn) return

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await fetch(`${ADMIN_API_BASE}/bookings`)
    if (!response.ok) {
      errorMessage.value = 'Không tải được danh sách phòng đã đặt.'
      bookings.value = []
      return
    }

    const payload = await response.json()
    bookings.value = Array.isArray(payload.bookings) ? payload.bookings : []
  } catch (_error) {
    errorMessage.value = 'Không kết nối được backend để tải phòng đã đặt.'
    bookings.value = []
  } finally {
    loading.value = false
  }
}

const openCancelModal = (bookingId) => {
  selectedCancelBookingId.value = bookingId
  showCancelModal.value = true
}

const closeCancelModal = () => {
  showCancelModal.value = false
  selectedCancelBookingId.value = ''
}

const confirmCancelBooking = async () => {
  const bookingId = selectedCancelBookingId.value
  if (!bookingId) return

  errorMessage.value = ''
  try {
    const response = await fetch(`${ADMIN_API_BASE}/bookings/${encodeURIComponent(bookingId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    })

    if (!response.ok) {
      let message = 'Không thể hủy booking này.'
      try {
        const payload = await response.json()
        if (payload?.message) {
          message = payload.message
        }
      } catch (_parseError) {
        // noop
      }
      errorMessage.value = message
      return
    }

    closeCancelModal()
    await loadBookings()
  } catch (_error) {
    errorMessage.value = 'Không kết nối được backend để hủy booking.'
  }
}

onMounted(() => {
  loadBookings()
  countdownTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (countdownTimer) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<style scoped>
.booked-page {
  background: radial-gradient(circle at top, #171b25 0%, #08090d 52%, #050507 100%);
  min-height: 100%;
  padding: 24px 20px 40px;
}

.booked-card {
  max-width: 1080px;
  margin: 0 auto;
  border: 1px solid #242c3c;
  border-radius: 16px;
  background: #11151d;
  padding: 22px;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

h1 {
  margin: 0;
  color: #eef4ff;
}

.subtitle {
  margin: 8px 0 0;
  color: #9fb1d1;
}

.refresh-btn {
  border: 1px solid #475978;
  background: #182131;
  color: #eef4ff;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 700;
}

.error-box,
.empty-state {
  margin: 18px 0 0;
  border-radius: 10px;
  padding: 12px 14px;
}

.error-box {
  border: 1px solid #d9534f;
  background: #351b20;
  color: #ffd7d6;
}

.empty-state {
  border: 1px solid #2b3547;
  background: #101724;
  color: #cdd8ee;
}

.booking-list {
  margin-top: 18px;
  display: grid;
  gap: 14px;
}

.booking-card {
  border: 1px solid #263148;
  border-radius: 14px;
  background: #101724;
  padding: 16px;
}

.booking-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.booking-head-actions {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.booking-head h2 {
  margin: 0;
  color: #eef4ff;
  font-size: 1.05rem;
}

.booking-head p,
.booking-head strong {
  color: #ffd8b8;
}

.cancel-badge {
  display: inline-flex;
  align-items: center;
  margin-top: 10px;
  border: 1px solid #2f6bb1;
  border-radius: 999px;
  background: rgba(55, 128, 214, 0.16);
  color: #b8ddff;
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.cancel-badge.expired {
  border-color: #a94442;
  background: rgba(169, 68, 66, 0.18);
  color: #ffb3ae;
}

.cancel-btn {
  border: 1px solid #a94442;
  background: #34181b;
  color: #ffd7d6;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 700;
}

.cancel-btn:hover {
  background: #482023;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 50% 30%, rgba(151, 52, 67, 0.24), rgba(5, 8, 14, 0.84));
  backdrop-filter: blur(6px);
}

.cancel-modal {
  width: min(92vw, 480px);
  border: 1px solid #4f6692;
  border-radius: 16px;
  background: linear-gradient(160deg, #13203a 0%, #0d1628 55%, #0b1321 100%);
  padding: 20px;
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(247, 233, 204, 0.08);
  animation: modal-pop 0.22s ease-out;
}

.modal-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.modal-mark {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  font-weight: 800;
  color: #24110f;
  background: linear-gradient(180deg, #ffd9bf 0%, #ff8f7e 100%);
  box-shadow: 0 0 14px rgba(255, 148, 132, 0.45);
}

.cancel-modal h3 {
  margin: 0;
  color: #f8fbff;
  font-size: 1.55rem;
  letter-spacing: 0.01em;
}

.cancel-modal p {
  margin: 0;
  color: #d6e4fb;
  line-height: 1.45;
  font-size: 1.04rem;
}

.modal-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-btn {
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
}

.modal-btn.secondary {
  border: 1px solid #4f6998;
  background: #172743;
  color: #e0ecff;
}

.modal-btn.danger {
  border: 1px solid #ea6a67;
  background: linear-gradient(150deg, #6f2329 0%, #942f32 100%);
  color: #ffe9e7;
  box-shadow: 0 8px 18px rgba(183, 62, 66, 0.35);
}

.modal-btn.danger:hover {
  background: linear-gradient(150deg, #8b2c32 0%, #b33a3e 100%);
  transform: translateY(-1px);
}

@keyframes modal-pop {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.booking-meta {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  color: #bdd0ef;
  font-size: 0.92rem;
}

.room-list {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.room-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #243047;
  border-radius: 12px;
  background: #0d1420;
  padding: 12px 14px;
}

.room-item h3 {
  margin: 0;
  color: #f1f5ff;
  font-size: 1rem;
}

.room-item p,
.room-time {
  margin: 4px 0 0;
  color: #9eb2d4;
}

.room-time {
  display: grid;
  gap: 4px;
  text-align: right;
}

@media (max-width: 900px) {
  .hero,
  .booking-head,
  .room-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .room-time {
    text-align: left;
  }

  .modal-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
