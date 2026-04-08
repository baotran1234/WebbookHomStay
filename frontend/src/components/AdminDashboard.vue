<template>
  <div class="admin-shell">
  <section class="admin-page">
    <article v-if="!auth.isAdmin" class="panel auth-required">
      <h2>Khu vực quản trị</h2>
      <p>Bạn cần đăng nhập bằng tài khoản quản trị để truy cập trang này.</p>
      <button class="refresh-btn" type="button" @click="openAdminLogin">Đăng nhập quản trị</button>
    </article>

    <template v-else>
      <div class="admin-header">
        <div>
          <h1>Trang Quản Trị Đặt Phòng</h1>
          <p class="sub">Theo dõi lịch phòng, doanh thu và trạng thái vận hành theo thời gian thực.</p>
        </div>
        <button class="refresh-btn" type="button" @click="loadDashboard">Làm mới dữ liệu</button>
      </div>

      <p v-if="errorMessage" class="error-box">{{ errorMessage }}</p>

      <div class="kpi-grid" v-if="dashboard">
        <article class="kpi-card">
          <h3>Tổng booking</h3>
          <strong>{{ dashboard.totals.bookings }}</strong>
        </article>
        <article class="kpi-card">
          <h3>Đang chờ thanh toán</h3>
          <strong>{{ dashboard.totals.pendingPayment }}</strong>
        </article>
        <article class="kpi-card">
          <h3>Doanh thu tuần</h3>
          <strong>{{ formatMoney(dashboard.totals.revenueWeek) }}</strong>
        </article>
        <article class="kpi-card">
          <h3>Doanh thu tháng</h3>
          <strong>{{ formatMoney(dashboard.totals.revenueMonth) }}</strong>
        </article>
        <article class="kpi-card warning">
          <h3>Cảnh báo trùng lịch</h3>
          <strong>{{ dashboard.totals.conflicts }}</strong>
        </article>
      </div>

      <article class="panel" v-if="dashboard">
        <div class="board-header">
          <div>
            <h2>Bảng khung giờ theo ngày</h2>
            <p class="note">Đỏ là phòng đang được giữ, trắng là còn trống. Khung giờ chỉ trắng lại khi admin chuyển booking sang Đã trả phòng hoặc Đã hủy.</p>
          </div>
          <label class="date-filter">
            <span>Ngày xem</span>
            <input type="date" v-model="adminDate" />
          </label>
        </div>

        <div class="board-scroll">
          <div class="board-grid" :style="{ gridTemplateColumns: `180px repeat(${adminSlots.length}, 44px)` }">
            <div class="board-cell board-head room-head">Phòng</div>
            <div v-for="slot in adminSlots" :key="slot.startAt" class="board-cell board-head time-head">
              {{ slot.label }}
            </div>

            <div v-for="room in roomBoardRows" :key="`room-${room.roomId}`" class="room-row">
              <div class="board-cell room-head">{{ room.roomName }}</div>
              <button
                v-for="slot in room.slots"
                :key="`${room.roomId}-${slot.startAt}`"
                type="button"
                :disabled="slot.occupied"
                class="board-cell slot-cell"
                :class="{ occupied: slot.occupied }"
                :title="slot.title"
              >
                <span>{{ slot.occupied ? 'Đ' : 'T' }}</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      <div class="chart-grid" v-if="dashboard">
        <article class="panel">
          <h2>Biểu đồ doanh thu 7 ngày gần nhất</h2>
          <div class="bar-list">
            <div class="bar-item" v-for="(label, index) in dashboard.charts.week.labels" :key="`week-${label}`">
              <span class="bar-label">{{ label }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: `${toPercent(dashboard.charts.week.values[index], weekMax)}%` }"></div>
              </div>
              <span class="bar-value">{{ formatMoney(dashboard.charts.week.values[index]) }}</span>
            </div>
          </div>
        </article>

        <article class="panel">
          <h2>Biểu đồ doanh thu theo tháng</h2>
          <div class="bar-list">
            <div class="bar-item" v-for="(label, index) in dashboard.charts.month.labels" :key="`month-${label}`">
              <span class="bar-label">{{ label }}</span>
              <div class="bar-track">
                <div class="bar-fill alt" :style="{ width: `${toPercent(dashboard.charts.month.values[index], monthMax)}%` }"></div>
              </div>
              <span class="bar-value">{{ formatMoney(dashboard.charts.month.values[index]) }}</span>
            </div>
          </div>
        </article>
      </div>

      <article class="panel" v-if="dashboard && dashboard.conflicts && dashboard.conflicts.length">
        <h2>Các booking đang trùng lịch</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Phòng</th>
              <th>Đơn 1</th>
              <th>Đơn 2</th>
              <th>Từ</th>
              <th>Đến</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(conflict, index) in dashboard.conflicts" :key="`conflict-${index}`">
              <td>{{ conflict.roomName }}</td>
              <td>{{ conflict.firstOrderId }}</td>
              <td>{{ conflict.secondOrderId }}</td>
              <td>{{ formatDate(conflict.firstStartAt) }}</td>
              <td>{{ formatDate(conflict.secondEndAt) }}</td>
            </tr>
          </tbody>
        </table>
      </article>

      <article class="panel" v-if="dashboard">
        <h2>Lịch sử dụng theo từng phòng</h2>
        <p class="note">Mỗi dòng là một khung thời gian đã giữ phòng. Dùng bảng này để tránh xếp lịch bị chồng lấn.</p>
        <div class="timeline-room" v-for="room in dashboard.roomTimeline" :key="`room-${room.roomId}`">
          <h3>{{ room.roomName }} (Mã phòng: {{ room.roomId }})</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách</th>
                <th>Từ giờ</th>
                <th>Đến giờ</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="schedule in room.schedules" :key="`${schedule.bookingId}-${schedule.startAt}`">
                <td>{{ schedule.orderId }}</td>
                <td>{{ schedule.customerName || 'Khách lẻ' }}</td>
                <td>{{ formatDate(schedule.startAt) }}</td>
                <td>{{ formatDate(schedule.endAt) }}</td>
                <td>{{ toBookingStatusLabel(schedule.status) }} / {{ toPaymentStatusLabel(schedule.paymentStatus) }}</td>
                <td>
                  <button
                    v-if="canDeleteBooking(schedule)"
                    type="button"
                    class="delete-btn"
                    @click="deleteBooking(schedule.bookingId)"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel" v-if="bookings.length">
        <h2>Danh sách booking gần đây</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Mã booking</th>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Tổng tiền</th>
              <th>Thanh toán</th>
              <th>Trạng thái vận hành</th>
              <th>Cập nhật</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in bookings" :key="booking.bookingId">
              <td>{{ booking.bookingId }}</td>
              <td>{{ booking.orderId }}</td>
              <td>{{ booking.customer && booking.customer.name ? booking.customer.name : 'Khách lẻ' }}</td>
              <td>{{ formatMoney(booking.totalAmount) }}</td>
              <td>{{ toPaymentStatusLabel(booking.paymentStatus) }}</td>
              <td>
                <select :value="booking.status" @change="onStatusChange(booking.bookingId, $event)">
                  <option value="pending_payment">Chờ thanh toán</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="checked_in">Đã nhận phòng</option>
                  <option value="checked_out">Đã trả phòng</option>
                  <option value="completed">Hoàn tất</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </td>
              <td>{{ formatDate(booking.updatedAt || booking.createdAt) }}</td>
              <td>
                <button
                  v-if="canDeleteBooking(booking)"
                  type="button"
                  class="delete-btn"
                  @click="deleteBooking(booking.bookingId)"
                >
                  Xóa
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </template>
  </section>

  <AuthModal
    v-if="showAuth"
    initial-tab="login"
    :initial-admin-only="true"
    @close="showAuth = false"
    @success="onAuthSuccess"
  />
</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AuthModal from '@/components/AuthModal.vue'
import { useRouter } from 'vue-router'

const ADMIN_API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:4010/api/admin`
  : 'http://localhost:4010/api/admin'

const auth = useAuthStore()
const router = useRouter()
const dashboard = ref(null)
const bookings = ref([])
const errorMessage = ref('')
const showAuth = ref(false)
let dashboardRefreshTimer = null
const adminDate = ref((() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
})())

const buildIsoAtTime = (dateKey, hour, minute = 0) => {
  const paddedHour = String(hour).padStart(2, '0')
  const paddedMinute = String(minute).padStart(2, '0')
  return `${dateKey}T${paddedHour}:${paddedMinute}:00.000Z`
}

const addMinutesToIso = (isoString, minutes) => new Date(new Date(isoString).getTime() + minutes * 60000).toISOString()

const formatClock = (value) => String(value || '').slice(11, 16)

const isOverlap = (startA, endA, startB, endB) => {
  const aStart = new Date(startA).getTime()
  const aEnd = new Date(endA).getTime()
  const bStart = new Date(startB).getTime()
  const bEnd = new Date(endB).getTime()
  return aStart < bEnd && bStart < aEnd
}

const adminSlots = computed(() => {
  return Array.from({ length: 24 }, (_item, hour) => ({
    hour,
    startAt: buildIsoAtTime(adminDate.value, hour, 0),
    endAt: addMinutesToIso(buildIsoAtTime(adminDate.value, hour, 0), 60),
    label: `${String(hour).padStart(2, '0')}:00`,
  }))
})

const roomBoardRows = computed(() => {
  const rooms = Array.isArray(dashboard.value?.roomTimeline) ? dashboard.value.roomTimeline : []

  return rooms.map((room) => ({
    ...room,
    slots: adminSlots.value.map((slot) => {
      const schedule = room.schedules.find((item) => isOverlap(slot.startAt, slot.endAt, item.startAt, item.endAt))
      return {
        ...slot,
        occupied: Boolean(schedule),
        title: schedule
          ? `${schedule.orderId} - ${schedule.customerName || 'Khách lẻ'} - ${formatClock(schedule.startAt)} -> ${formatClock(schedule.endAt)} - ${toBookingStatusLabel(schedule.status)}`
          : 'Còn trống',
      }
    }),
  }))
})

const weekMax = computed(() => {
  const values = dashboard.value?.charts?.week?.values || []
  return Math.max(1, ...values)
})

const monthMax = computed(() => {
  const values = dashboard.value?.charts?.month?.values || []
  return Math.max(1, ...values)
})

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`

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
    confirmed: 'Đã xác nhận',
    checked_in: 'Đã nhận phòng',
    checked_out: 'Đã trả phòng',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
  }
  return map[String(status || '').toLowerCase()] || String(status || 'Không rõ')
}

const canDeleteBooking = (booking) => {
  const status = String(booking?.status || '').toLowerCase()
  const paymentStatus = String(booking?.paymentStatus || '').toLowerCase()
  return status === 'checked_out' && paymentStatus === 'success'
}

const toPercent = (value, maxValue) => {
  if (!maxValue) return 0
  return Math.max(0, Math.min(100, (Number(value || 0) / Number(maxValue || 1)) * 100))
}

const loadDashboard = async () => {
  if (!auth.isAdmin) return
  errorMessage.value = ''
  try {
    const [dashboardRes, bookingsRes] = await Promise.all([
      fetch(`${ADMIN_API_BASE}/dashboard`),
      fetch(`${ADMIN_API_BASE}/bookings`),
    ])

    if (!dashboardRes.ok || !bookingsRes.ok) {
      errorMessage.value = 'Không tải được dữ liệu Admin. Vui lòng kiểm tra backend cổng 4010.'
      return
    }

    const dashboardData = await dashboardRes.json()
    const bookingsData = await bookingsRes.json()
    dashboard.value = dashboardData
    bookings.value = Array.isArray(bookingsData.bookings) ? bookingsData.bookings : []
  } catch (_error) {
    errorMessage.value = 'Không kết nối được backend Admin.'
  }
}

const refreshAdminIfNeeded = () => {
  if (!auth.isAdmin) return
  loadDashboard()
}

const startAutoRefresh = () => {
  if (dashboardRefreshTimer) return
  dashboardRefreshTimer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    refreshAdminIfNeeded()
  }, 5000)
}

const stopAutoRefresh = () => {
  if (!dashboardRefreshTimer) return
  window.clearInterval(dashboardRefreshTimer)
  dashboardRefreshTimer = null
}

const onVisibilityChange = () => {
  if (document.visibilityState !== 'visible') return
  refreshAdminIfNeeded()
}

const onStatusChange = async (bookingId, event) => {
  const status = event.target.value
  try {
    const response = await fetch(`${ADMIN_API_BASE}/bookings/${encodeURIComponent(bookingId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      errorMessage.value = 'Cập nhật trạng thái thất bại.'
      return
    }

    await loadDashboard()
  } catch (_error) {
    errorMessage.value = 'Không kết nối được backend khi cập nhật trạng thái.'
  }
}

const deleteBooking = async (bookingId) => {
  if (!window.confirm('Xóa booking này khỏi lịch sử?')) return

  errorMessage.value = ''
  try {
    const response = await fetch(`${ADMIN_API_BASE}/bookings/${encodeURIComponent(bookingId)}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      let message = 'Xóa booking thất bại.'
      try {
        const payload = await response.json()
        if (payload?.message) {
          message = payload.message
        }
      } catch (_parseError) {
        if (response.status === 404 || response.status === 405) {
          message = 'Backend chưa cập nhật API xóa. Hãy restart server backend cổng 4010 rồi thử lại.'
        }
      }
      errorMessage.value = message
      return
    }

    await loadDashboard()
  } catch (_error) {
    errorMessage.value = 'Không kết nối được backend khi xóa booking.'
  }
}

const openAdminLogin = () => {
  showAuth.value = true
}

const onAuthSuccess = (payload) => {
  if (payload?.targetRoute === '/') {
    router.push('/')
    return
  }
  if (auth.isAdmin) {
    loadDashboard()
  }
}

onMounted(() => {
  if (auth.isAdmin) {
    loadDashboard()
  }
  startAutoRefresh()
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
})

onBeforeUnmount(() => {
  stopAutoRefresh()
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
})
</script>

<style scoped>
.admin-page {
  padding: 20px;
  display: grid;
  gap: 16px;
}

.admin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.admin-header h1 {
  margin: 0;
}

.sub {
  margin: 6px 0 0;
  color: #9db0cf;
}

.note {
  margin: -2px 0 10px;
  color: #9db0cf;
}

.refresh-btn {
  border: 1px solid #4e5e7b;
  background: #1a2231;
  color: #e8efff;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}

.error-box {
  margin: 0;
  border: 1px solid #d9534f;
  border-radius: 10px;
  padding: 10px;
  background: #351b20;
  color: #ffd7d6;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.kpi-card {
  border: 1px solid #2a3448;
  border-radius: 12px;
  background: #101723;
  padding: 12px;
}

.kpi-card h3 {
  margin: 0 0 8px;
  color: #9fb1d1;
  font-size: 14px;
}

.kpi-card strong {
  color: #f5f9ff;
  font-size: 18px;
}

.kpi-card.warning {
  border-color: #a47e31;
  background: #2c2312;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 12px;
}

.panel {
  border: 1px solid #2a3448;
  border-radius: 12px;
  background: #101723;
  padding: 12px;
}

.auth-required {
  max-width: 560px;
}

.panel h2 {
  margin: 0 0 12px;
}

.board-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 10px;
}

.date-filter {
  display: grid;
  gap: 6px;
  color: #9db0cf;
  font-size: 13px;
}

.date-filter input {
  background: #121926;
  border: 1px solid #3a4864;
  color: #e9f0ff;
  border-radius: 8px;
  padding: 8px 10px;
}

.board-scroll {
  overflow-x: auto;
  padding-bottom: 6px;
}

.board-grid {
  display: grid;
  gap: 4px;
  min-width: max-content;
}

.room-row {
  display: contents;
}

.board-cell {
  height: 38px;
  border-radius: 8px;
  border: 1px solid #263148;
  display: grid;
  place-items: center;
  font-size: 12px;
}

.board-head {
  background: #141e2e;
  color: #d7e1f7;
  font-weight: 700;
}

.room-head {
  justify-items: start;
  padding: 0 10px;
  text-align: left;
}

.time-head {
  font-size: 11px;
}

.slot-cell {
  background: #f4f7fb;
  color: #132033;
  cursor: default;
}

.slot-cell.occupied {
  background: #d9534f;
  border-color: #d9534f;
  color: #fff;
}

.timeline-room + .timeline-room {
  margin-top: 12px;
}

.timeline-room h3 {
  margin: 0 0 6px;
}

.bar-list {
  display: grid;
  gap: 8px;
}

.bar-item {
  display: grid;
  grid-template-columns: 104px 1fr 130px;
  gap: 8px;
  align-items: center;
}

.bar-label {
  color: #a8b8d3;
  font-size: 12px;
}

.bar-track {
  background: #0d111a;
  border: 1px solid #2a3448;
  border-radius: 999px;
  height: 12px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #20ad6d, #81d4af);
}

.bar-fill.alt {
  background: linear-gradient(90deg, #4e91ff, #8fbcff);
}

.bar-value {
  text-align: right;
  font-size: 12px;
  color: #d8e2f4;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  border: 1px solid #263148;
  padding: 8px;
  text-align: left;
  font-size: 13px;
}

.table th {
  background: #141e2e;
  color: #d7e1f7;
}

.table td {
  color: #c8d4eb;
}

.table select {
  background: #121926;
  border: 1px solid #3a4864;
  color: #e9f0ff;
  border-radius: 6px;
  padding: 6px 8px;
}

.delete-btn {
  background: #3a1518;
  border: 1px solid #d9534f;
  color: #ffe0de;
  border-radius: 6px;
  padding: 6px 12px;
  font-weight: 700;
  cursor: pointer;
}

.delete-btn:hover {
  background: #552024;
}

@media (max-width: 900px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }

  .bar-item {
    grid-template-columns: 86px 1fr 102px;
  }

  .board-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
