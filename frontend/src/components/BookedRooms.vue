<template>
  <section class="booked-page">
    <div class="booked-card">
      <div class="hero">
        <div>
          <h1>Phong Da Dat</h1>
          <p class="subtitle">Xem lai cac phong ban da dat, thoi gian nhan phong va trang thai don.</p>
        </div>
        <button type="button" class="refresh-btn" @click="loadBookings">Lam moi</button>
      </div>

      <p v-if="errorMessage" class="error-box">{{ errorMessage }}</p>
      <p v-else-if="loading" class="empty-state">Dang tai danh sach booking...</p>
      <p v-else-if="!auth.isLoggedIn" class="empty-state">Ban can dang nhap de xem cac phong da dat.</p>
      <p v-else-if="!userBookings.length" class="empty-state">Hien chua co booking nao thuoc tai khoan nay.</p>

      <div v-else class="booking-list">
        <article v-for="booking in userBookings" :key="booking.bookingId" class="booking-card">
          <div class="booking-head">
            <div>
              <h2>{{ booking.orderId }}</h2>
              <p>{{ toBookingStatusLabel(booking.status) }} / {{ toPaymentStatusLabel(booking.paymentStatus) }}</p>
              <span v-if="canCancelBooking(booking)" class="cancel-badge">
                Huy trong {{ getCancelRemainingText(booking) }}
              </span>
              <span v-else-if="isCancellationWindowExpired(booking)" class="cancel-badge expired">
                Het han huy sau 2 gio
              </span>
            </div>
            <div class="booking-head-actions">
              <strong>{{ formatPrice(booking.totalAmount) }}</strong>
              <button
                v-if="canCancelBooking(booking)"
                type="button"
                class="cancel-btn"
                @click="cancelBooking(booking.bookingId)"
              >
                Huy booking
              </button>
            </div>
          </div>

          <div class="booking-meta">
            <span>Khach: {{ booking.customer?.name || auth.displayName }}</span>
            <span>Email: {{ booking.customer?.email || 'Khong co' }}</span>
            <span>SDT: {{ booking.customer?.phone || 'Khong co' }}</span>
            <span>Cap nhat: {{ formatDate(booking.updatedAt || booking.createdAt) }}</span>
          </div>

          <div class="room-list">
            <div v-for="item in booking.items" :key="item.lineId" class="room-item">
              <div>
                <h3>{{ item.roomName }}</h3>
                <p>{{ item.size || 'Tieu chuan' }}</p>
              </div>
              <div class="room-time">
                <span>{{ formatDate(item.startAt) }}</span>
                <span>{{ formatDate(item.endAt) }}</span>
              </div>
            </div>
          </div>
        </article>
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

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} d`

const getCancelDeadline = (booking) => new Date(new Date(booking?.createdAt || new Date().toISOString()).getTime() + 2 * 60 * 60 * 1000)

const getCancelRemainingMs = (booking) => Math.max(0, getCancelDeadline(booking).getTime() - nowTick.value)

const isCancellationWindowExpired = (booking) => getCancelRemainingMs(booking) <= 0

const getCancelRemainingText = (booking) => {
  const totalMinutes = Math.ceil(getCancelRemainingMs(booking) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (totalMinutes <= 0) return '0 phut'
  if (hours <= 0) return `${Math.max(1, minutes)} phut`
  if (minutes === 0) return `${hours} gio`
  return `${hours} gio ${minutes} phut`
}

const formatDate = (value) => {
  if (!value) return 'Khong co'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN')
}

const toPaymentStatusLabel = (status) => {
  const map = {
    pending: 'Cho thanh toan',
    success: 'Da thanh toan',
    invalid: 'Thanh toan loi',
    expired: 'Het han',
  }
  return map[String(status || '').toLowerCase()] || String(status || 'Khong ro')
}

const toBookingStatusLabel = (status) => {
  const map = {
    pending_payment: 'Cho thanh toan',
    pending_confirmation: 'Cho admin xac nhan',
    confirmed: 'Da xac nhan',
    checked_in: 'Da nhan phong',
    checked_out: 'Da tra phong',
    completed: 'Hoan tat',
    cancelled: 'Da huy',
  }
  return map[String(status || '').toLowerCase()] || String(status || 'Khong ro')
}

const canCancelBooking = (booking) => {
  const status = String(booking?.status || '').toLowerCase()
  return ['pending_payment', 'pending_confirmation', 'confirmed'].includes(status) && !isCancellationWindowExpired(booking)
}

const loadBookings = async () => {
  if (!auth.isLoggedIn) return

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await fetch(`${ADMIN_API_BASE}/bookings`)
    if (!response.ok) {
      errorMessage.value = 'Khong tai duoc danh sach phong da dat.'
      bookings.value = []
      return
    }

    const payload = await response.json()
    bookings.value = Array.isArray(payload.bookings) ? payload.bookings : []
  } catch (_error) {
    errorMessage.value = 'Khong ket noi duoc backend de tai phong da dat.'
    bookings.value = []
  } finally {
    loading.value = false
  }
}

const cancelBooking = async (bookingId) => {
  if (!window.confirm('Ban co chac muon huy booking nay khong?')) return

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
      let message = 'Khong the huy booking nay.'
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

    await loadBookings()
  } catch (_error) {
    errorMessage.value = 'Khong ket noi duoc backend de huy booking.'
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
}
</style>
