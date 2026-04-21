const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const app = express()
const PORT = Number(process.env.PAYMENT_PORT || 4010)
const STORE_PATH = path.join(__dirname, 'payment-store.json')
const BOOKING_STORE_PATH = path.join(__dirname, 'booking-store.json')
const DB_PATH = path.join(__dirname, '..', 'db.json')

const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  INVALID: 'invalid',
  EXPIRED: 'expired',
}

const DEFAULT_BANK_INFO = {
  bankCode: process.env.QR_BANK_CODE || 'MOMO',
  bankName: process.env.QR_BANK_NAME || 'MoMo',
  accountNo: process.env.QR_ACCOUNT_NO || '0933390617',
  accountName: process.env.QR_ACCOUNT_NAME || 'TRAN SANG BAO BAO',
}

const INTENT_EXPIRE_MINUTES = Number(process.env.PAYMENT_EXPIRE_MINUTES || 15)
const BOOKING_CANCEL_WINDOW_MINUTES = 120
let bookingStoreMutationQueue = Promise.resolve()

app.use(cors())
app.use(express.json())
ensureDefaultAdmin()

function nowIso() {
  return new Date().toISOString()
}

function normalizeString(value) {
  return String(value || '').trim()
}

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase()
}

function buildOrderId() {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function toVietQrImageUrl({ bankCode, accountNo, accountName, amount, transferContent }) {
  const encodedName = encodeURIComponent(accountName)
  const encodedContent = encodeURIComponent(transferContent)
  return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`
}

function readStore() {
  if (!fs.existsSync(STORE_PATH)) {
    return { payments: [] }
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.payments)) {
      return { payments: [] }
    }
    return parsed
  } catch (_error) {
    return { payments: [] }
  }
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8')
}

function findPaymentByOrderId(orderId) {
  const normalizedOrderId = normalizeString(orderId)
  if (!normalizedOrderId) return null

  const store = readStore()
  const payment = store.payments.find((item) => item.orderId === normalizedOrderId)
  return payment || null
}

function savePayment(payment) {
  const store = readStore()
  const index = store.payments.findIndex((item) => item.orderId === payment.orderId)

  if (index >= 0) {
    store.payments[index] = payment
  } else {
    store.payments.push(payment)
  }

  writeStore(store)
  return payment
}

function appendEvent(payment, event) {
  const nextEvents = Array.isArray(payment.events) ? payment.events : []
  nextEvents.push({
    at: nowIso(),
    ...event,
  })
  return nextEvents
}

function createPendingIntent(input) {
  const orderId = normalizeString(input.orderId) || buildOrderId()
  const amount = Number(input.amount || 0)
  const customer = input.customer && typeof input.customer === 'object' ? input.customer : {}

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'amount must be a positive number' }
  }

  const existing = findPaymentByOrderId(orderId)
  if (existing && existing.status === PAYMENT_STATUS.SUCCESS) {
    return { payment: existing, reused: true }
  }

  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + INTENT_EXPIRE_MINUTES * 60 * 1000).toISOString()
  const transferContent = orderId

  const bankInfo = { ...DEFAULT_BANK_INFO }
  const qrImageUrl = toVietQrImageUrl({
    ...bankInfo,
    amount,
    transferContent,
  })

  const payment = {
    paymentId: existing?.paymentId || `PAY-${Date.now()}`,
    orderId,
    amount,
    currency: 'VND',
    customer: {
      name: normalizeString(customer.name),
      email: normalizeString(customer.email),
      phone: normalizeString(customer.fullPhone || customer.phone),
    },
    status: PAYMENT_STATUS.PENDING,
    method: 'bank_qr',
    provider: 'vietqr',
    transferContent,
    bankInfo,
    qrImageUrl,
    createdAt: existing?.createdAt || createdAt,
    expiresAt,
    transactionId: existing?.transactionId || null,
    raw: existing?.raw || null,
    updatedAt: createdAt,
    events: appendEvent(existing || {}, {
      type: existing ? 'intent_refreshed' : 'intent_created',
      source: 'frontend',
    }),
  }

  savePayment(payment)
  return { payment, reused: Boolean(existing) }
}

function computePaymentStatus(payment) {
  if (!payment) return PAYMENT_STATUS.PENDING
  if (payment.status === PAYMENT_STATUS.SUCCESS || payment.status === PAYMENT_STATUS.INVALID) {
    return payment.status
  }

  if (payment.expiresAt && Date.now() > new Date(payment.expiresAt).getTime()) {
    return PAYMENT_STATUS.EXPIRED
  }

  return PAYMENT_STATUS.PENDING
}

async function updatePaymentFromTransaction(input, options = {}) {
  const orderId = normalizeString(input.orderId || input.transferContent)
  if (!orderId) return { error: 'orderId is required' }

  const payment = findPaymentByOrderId(orderId)
  if (!payment) return { error: 'payment intent not found' }

  const amount = Number(input.amount || 0)
  const transactionId = normalizeString(input.transactionId || input.transId || input.id) || `TX-${Date.now()}`
  const requestedStatus = normalizeStatus(input.status)
  const statusByResultCode = Number(input.resultCode) === 0 ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.INVALID
  const finalStatus = requestedStatus || statusByResultCode
  const amountValid = amount === payment.amount

  const nextStatus = !amountValid
    ? PAYMENT_STATUS.INVALID
    : (finalStatus === PAYMENT_STATUS.SUCCESS ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.INVALID)

  const updated = {
    ...payment,
    status: nextStatus,
    amountReceived: amount,
    transactionId,
    raw: input,
    updatedAt: nowIso(),
    events: appendEvent(payment, {
      type: 'payment_updated',
      source: options.source || 'webhook',
      status: nextStatus,
      amountReceived: amount,
      amountExpected: payment.amount,
    }),
  }

  savePayment(updated)
  await syncBookingPaymentStatus(updated.orderId, updated.status)
  return { payment: updated }
}

function toClientPaymentResponse(payment) {
  const status = computePaymentStatus(payment)
  return {
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    amount: payment.amount,
    currency: payment.currency || 'VND',
    status,
    transferContent: payment.transferContent,
    transactionId: payment.transactionId || null,
    qrImageUrl: payment.qrImageUrl,
    bankInfo: payment.bankInfo,
    createdAt: payment.createdAt,
    expiresAt: payment.expiresAt,
    updatedAt: payment.updatedAt,
  }
}

function readDbProducts() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.products) ? parsed.products : []
  } catch (_error) {
    return []
  }
}

function readBookingStore() {
  if (!fs.existsSync(BOOKING_STORE_PATH)) {
    return { bookings: [] }
  }

  try {
    const raw = fs.readFileSync(BOOKING_STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.bookings) ? parsed : { bookings: [] }
  } catch (_error) {
    return { bookings: [] }
  }
}

function writeBookingStore(store) {
  fs.writeFileSync(BOOKING_STORE_PATH, JSON.stringify(store, null, 2), 'utf8')
}

function queueBookingStoreMutation(task) {
  const run = bookingStoreMutationQueue.then(() => task())
  bookingStoreMutationQueue = run.catch(() => {})
  return run
}

function toDayIso(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function parseDateRangeFromItem(item, fallbackAt) {
  const explicitStartAt = normalizeString(item.startAt)
  const explicitEndAt = normalizeString(item.endAt)
  if (explicitStartAt && explicitEndAt) {
    return {
      startAt: explicitStartAt,
      endAt: explicitEndAt,
    }
  }

  const bookingDate = normalizeString(item.bookingDate)
  const checkInDate = normalizeString(item.checkInDate)
  const checkOutDate = normalizeString(item.checkOutDate)
  const toppings = Array.isArray(item.toppings) ? item.toppings.map((value) => String(value).toLowerCase()) : []
  const slot = toppings.join(' ')
  const looksLike3Hours = slot.includes('3') && (slot.includes('tieng') || slot.includes('ti'))
  const looksLike4Hours = slot.includes('4') && (slot.includes('tieng') || slot.includes('ti'))
  const looksLikeDayUse = slot.includes('ban ngay') || (slot.includes('ban') && slot.includes('ngay'))
  const looksLikeOvernight = slot.includes('qua dem') || (slot.includes('qua') && slot.includes('dem'))
  const looksLikeSecondNight = slot.includes('2nd')

  if (checkInDate && checkOutDate) {
    return {
      startAt: `${checkInDate}T14:00:00.000Z`,
      endAt: `${checkOutDate}T12:00:00.000Z`,
    }
  }

  const date = bookingDate || toDayIso(fallbackAt || nowIso())

  if (looksLike3Hours) {
    return { startAt: `${date}T09:00:00.000Z`, endAt: `${date}T12:00:00.000Z` }
  }
  if (looksLike4Hours) {
    return { startAt: `${date}T13:00:00.000Z`, endAt: `${date}T17:00:00.000Z` }
  }
  if (looksLikeDayUse) {
    return { startAt: `${date}T10:00:00.000Z`, endAt: `${date}T18:00:00.000Z` }
  }
  if (looksLikeOvernight) {
    const next = new Date(`${date}T00:00:00.000Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    return {
      startAt: `${date}T20:00:00.000Z`,
      endAt: `${toDayIso(next)}T09:00:00.000Z`,
    }
  }
  if (looksLikeSecondNight) {
    const next = new Date(`${date}T00:00:00.000Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    return {
      startAt: `${date}T15:00:00.000Z`,
      endAt: `${toDayIso(next)}T13:00:00.000Z`,
    }
  }

  const next = new Date(`${date}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return {
    startAt: `${date}T14:00:00.000Z`,
    endAt: `${toDayIso(next)}T12:00:00.000Z`,
  }
}

function isOverlap(startA, endA, startB, endB) {
  const aStart = new Date(startA).getTime()
  const aEnd = new Date(endA).getTime()
  const bStart = new Date(startB).getTime()
  const bEnd = new Date(endB).getTime()
  return aStart < bEnd && bStart < aEnd
}

function isBookingReleased(booking) {
  const status = String(booking?.status || '').toLowerCase()
  return ['checked_out', 'cancelled'].includes(status)
}

function isBookingBlockingSlot(booking) {
  return !isBookingReleased(booking)
}

function isRevenueRecognizedBooking(booking) {
  const status = String(booking?.status || '').toLowerCase()
  const paymentStatus = String(booking?.paymentStatus || '').toLowerCase()
  return paymentStatus === 'success' && ['confirmed', 'checked_in', 'checked_out', 'completed'].includes(status)
}

function getBookingCancelDeadline(booking) {
  const createdAt = new Date(booking?.createdAt || nowIso())
  return new Date(createdAt.getTime() + BOOKING_CANCEL_WINDOW_MINUTES * 60 * 1000)
}

function canBookingBeCancelled(booking) {
  const status = String(booking?.status || '').toLowerCase()
  if (!['pending_payment', 'pending_confirmation', 'confirmed'].includes(status)) {
    return false
  }

  return Date.now() <= getBookingCancelDeadline(booking).getTime()
}

function buildBookingRecord(payload) {
  const orderId = normalizeString(payload.orderId) || buildOrderId()
  const customer = payload.customer && typeof payload.customer === 'object' ? payload.customer : {}
  const items = Array.isArray(payload.items) ? payload.items : []
  const totalAmount = Number(payload.totalAmount || 0)
  const createdAt = normalizeString(payload.createdAt) || nowIso()
  const paymentMethod = normalizeString(payload.paymentMethod || 'cash')
  const paymentStatus = normalizeStatus(payload.paymentStatus || 'pending')

  const normalizedItems = items.map((item, index) => {
    const roomId = Number(item.id || item.roomId || 0)
    const range = parseDateRangeFromItem(item, createdAt)

    return {
      lineId: `${orderId}-${index + 1}`,
      roomId,
      roomName: normalizeString(item.name || `Room #${roomId || index + 1}`),
      quantity: Math.max(1, Number(item.quantity || 1)),
      unitPrice: Number(item.price || 0),
      amount: Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)),
      size: normalizeString(item.size),
      toppings: Array.isArray(item.toppings) ? item.toppings : [],
      bookingDate: normalizeString(item.bookingDate) || null,
      checkInDate: normalizeString(item.checkInDate) || null,
      checkOutDate: normalizeString(item.checkOutDate) || null,
      startAt: range.startAt,
      endAt: range.endAt,
    }
  })

  return {
    bookingId: `BKG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderId,
    customer: {
      name: normalizeString(customer.name),
      email: normalizeString(customer.email),
      phone: normalizeString(customer.fullPhone || customer.phone),
      address: normalizeString(customer.address),
    },
    paymentMethod,
    paymentStatus,
    status: paymentStatus === 'success' ? 'pending_confirmation' : 'pending_payment',
    totalAmount,
    createdAt,
    updatedAt: nowIso(),
    items: normalizedItems,
  }
}

function findBookingConflicts(nextBooking, allBookings) {
  const active = allBookings.filter((booking) => isBookingBlockingSlot(booking))
  const conflicts = []

  nextBooking.items.forEach((line) => {
    active.forEach((existingBooking) => {
      if (existingBooking.orderId === nextBooking.orderId) return
      const existingLines = Array.isArray(existingBooking.items) ? existingBooking.items : []
      existingLines.forEach((existingLine) => {
        if (Number(existingLine.roomId) !== Number(line.roomId)) return
        if (!isOverlap(line.startAt, line.endAt, existingLine.startAt, existingLine.endAt)) return

        conflicts.push({
          roomId: line.roomId,
          roomName: line.roomName,
          orderId: existingBooking.orderId,
          bookingId: existingBooking.bookingId,
          startAt: existingLine.startAt,
          endAt: existingLine.endAt,
        })
      })
    })
  })

  return conflicts
}

function findSelfBookingConflicts(booking) {
  const lines = Array.isArray(booking?.items) ? booking.items : []
  const conflicts = []

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index]
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const next = lines[nextIndex]
      if (Number(current?.roomId) !== Number(next?.roomId)) continue
      if (!isOverlap(current?.startAt, current?.endAt, next?.startAt, next?.endAt)) continue

      conflicts.push({
        roomId: current.roomId,
        roomName: current.roomName || next.roomName,
        firstLineId: current.lineId,
        firstStartAt: current.startAt,
        firstEndAt: current.endAt,
        secondLineId: next.lineId,
        secondStartAt: next.startAt,
        secondEndAt: next.endAt,
      })
    }
  }

  return conflicts
}

function findSuggestedRooms(booking, bookings) {
  const products = readDbProducts()
  const bookedRoomIds = new Set()

  booking.items.forEach((line) => {
    bookings.forEach((existingBooking) => {
      const existingLines = Array.isArray(existingBooking.items) ? existingBooking.items : []
      existingLines.forEach((existingLine) => {
        if (Number(existingLine.roomId) === Number(line.roomId)
          && isOverlap(line.startAt, line.endAt, existingLine.startAt, existingLine.endAt)
          && isBookingBlockingSlot(existingBooking)) {
          bookedRoomIds.add(Number(line.roomId))
        }
      })
    })
  })

  return products
    .filter((room) => !bookedRoomIds.has(Number(room.id)))
    .slice(0, 6)
    .map((room) => ({
      roomId: Number(room.id),
      roomName: room.tensp,
      price: Number(room.gia || 0),
    }))
}

function getRoomAvailability(roomId, dateKey) {
  const normalizedRoomId = Number(roomId)
  const normalizedDate = normalizeString(dateKey) || toDayIso(nowIso())
  const store = readBookingStore()
  const bookings = Array.isArray(store.bookings) ? store.bookings : []
  const activeBookings = bookings.filter((booking) => isBookingBlockingSlot(booking))
  const roomProducts = readDbProducts()
  const roomInfo = roomProducts.find((room) => Number(room.id) === normalizedRoomId)
  const occupiedRanges = []

  activeBookings.forEach((booking) => {
    const lines = Array.isArray(booking.items) ? booking.items : []
    lines.forEach((line) => {
      if (Number(line.roomId) !== normalizedRoomId) return

      const startAt = normalizeString(line.startAt)
      const endAt = normalizeString(line.endAt)
      if (!startAt || !endAt) return

      if (toDayIso(startAt) !== normalizedDate && toDayIso(endAt) !== normalizedDate) {
        const dayStart = `${normalizedDate}T00:00:00.000Z`
        const dayEnd = `${normalizedDate}T23:59:59.999Z`
        if (!isOverlap(startAt, endAt, dayStart, dayEnd)) return
      }

      occupiedRanges.push({
        bookingId: booking.bookingId,
        orderId: booking.orderId,
        customerName: booking.customer?.name || '',
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        status: booking.status,
        startAt,
        endAt,
      })
    })
  })

  occupiedRanges.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  return {
    roomId: normalizedRoomId,
    roomName: roomInfo?.tensp || `Room ${normalizedRoomId}`,
    date: normalizedDate,
    occupiedRanges,
  }
}

function collectRevenueStats(bookings) {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const paidBookings = bookings.filter((booking) => isRevenueRecognizedBooking(booking))

  const revenueWeek = paidBookings
    .filter((booking) => new Date(booking.updatedAt || booking.createdAt) >= weekStart)
    .reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0)

  const revenueMonth = paidBookings
    .filter((booking) => new Date(booking.updatedAt || booking.createdAt) >= monthStart)
    .reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0)

  const dayLabels = []
  const dayRevenue = []
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(now)
    day.setDate(now.getDate() - i)
    day.setHours(0, 0, 0, 0)
    const dayStr = toDayIso(day)
    dayLabels.push(dayStr)

    const revenue = paidBookings
      .filter((booking) => toDayIso(booking.updatedAt || booking.createdAt) === dayStr)
      .reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0)

    dayRevenue.push(revenue)
  }

  const monthLabels = []
  const monthRevenue = []
  for (let i = 1; i <= 12; i += 1) {
    const label = `${now.getFullYear()}-${String(i).padStart(2, '0')}`
    monthLabels.push(label)
    const revenue = paidBookings
      .filter((booking) => {
        const date = new Date(booking.updatedAt || booking.createdAt)
        return date.getFullYear() === now.getFullYear() && (date.getMonth() + 1) === i
      })
      .reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0)
    monthRevenue.push(revenue)
  }

  return {
    revenueWeek,
    revenueMonth,
    charts: {
      week: { labels: dayLabels, values: dayRevenue },
      month: { labels: monthLabels, values: monthRevenue },
    },
  }
}

function readDbData() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (_error) {
    return {}
  }
}

function writeDbData(nextDb) {
  fs.writeFileSync(DB_PATH, JSON.stringify(nextDb, null, 2), 'utf8')
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password || '')).digest('hex')
}

function sanitizeUser(user) {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role || 'user',
    createdAt: user.createdAt || null,
  }
}

function normalizeUserFromDb(user) {
  if (!user || typeof user !== 'object') return null
  const username = normalizeString(user.username || user.ten || user.name || user.fullname)
  const email = normalizeString(user.email)
  const phone = normalizeString(user.phone || user.sodt)
  const address = normalizeString(user.address || user.diachi)
  const fullName = normalizeString(user.fullName || user.fullname || user.ten || user.name)
  const role = normalizeString(user.role || (username.toLowerCase() === 'admin' ? 'admin' : 'user')) || 'user'
  let passwordHash = normalizeString(user.passwordHash)
  if (!passwordHash) {
    const legacyPassword = normalizeString(user.password || user.matkhau)
    passwordHash = legacyPassword ? hashPassword(legacyPassword) : ''
  }
  return {
    ...user,
    username,
    email,
    phone,
    address,
    fullName,
    role,
    passwordHash,
  }
}

function readUsers() {
  const db = readDbData()
  const users = Array.isArray(db.users) ? db.users : []
  return users.map(normalizeUserFromDb).filter(Boolean)
}

function writeUsers(users) {
  const db = readDbData()
  db.users = users
  writeDbData(db)
}

function validatePasswordComplexity(password) {
  const value = String(password || '')
  if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.'
  if (!/[A-Z]/.test(value)) return 'Mật khẩu phải có ít nhất 1 chữ hoa.'
  if (!/[a-z]/.test(value)) return 'Mật khẩu phải có ít nhất 1 chữ thường.'
  if (!/\d/.test(value)) return 'Mật khẩu phải có ít nhất 1 số.'
  if (!/[^A-Za-z0-9]/.test(value)) return 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt.'
  return ''
}

function ensureDefaultAdmin() {
  const users = readUsers()
  const hasAdmin = users.some((user) => String(user.role || '').toLowerCase() === 'admin')
  if (hasAdmin) return

  const maxId = users.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0)
  users.push({
    id: maxId + 1,
    username: 'admin',
    fullName: 'Quản trị viên',
    email: 'admin@gmail.com',
    phone: '0900000000',
    address: 'Văn phòng',
    role: 'admin',
    passwordHash: hashPassword('Admin@123'),
    createdAt: nowIso(),
  })
  writeUsers(users)
}

function syncBookingPaymentStatus(orderId, paymentStatus) {
  const normalizedOrderId = normalizeString(orderId)
  if (!normalizedOrderId) return Promise.resolve()

  return queueBookingStoreMutation(() => {
    const store = readBookingStore()
    const index = store.bookings.findIndex((item) => item.orderId === normalizedOrderId)
    if (index < 0) return null

    const nextStatus = normalizeStatus(paymentStatus)
    const current = store.bookings[index]
    store.bookings[index] = {
      ...current,
      paymentStatus: nextStatus,
      status: nextStatus === 'success' ? 'pending_confirmation' : current.status,
      updatedAt: nowIso(),
    }
    writeBookingStore(store)
    return store.bookings[index]
  })
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'payment-backend',
    time: nowIso(),
  })
})

app.post('/api/auth/register', (req, res) => {
  const body = req.body || {}
  const fullName = normalizeString(body.fullName)
  const username = normalizeString(body.username).toLowerCase()
  const email = normalizeString(body.email).toLowerCase()
  const phone = normalizeString(body.phone)
  const address = normalizeString(body.address)
  const password = String(body.password || '')

  if (!fullName || !username || !email || !phone || !address || !password) {
    res.status(400).json({ ok: false, message: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' })
    return
  }

  if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
    res.status(400).json({ ok: false, message: 'Email phải đúng định dạng ...@gmail.com.' })
    return
  }

  if (!/^\d{9,11}$/.test(phone)) {
    res.status(400).json({ ok: false, message: 'Số điện thoại phải gồm 9 đến 11 chữ số.' })
    return
  }

  const passwordError = validatePasswordComplexity(password)
  if (passwordError) {
    res.status(400).json({ ok: false, message: passwordError })
    return
  }

  const users = readUsers()
  const duplicated = users.find((item) =>
    item.username === username || item.email === email || item.phone === phone
  )
  if (duplicated) {
    res.status(409).json({ ok: false, message: 'Tên đăng nhập, email hoặc số điện thoại đã tồn tại.' })
    return
  }

  const maxId = users.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0)
  const newUser = {
    id: maxId + 1,
    username,
    fullName,
    email,
    phone,
    address,
    role: 'user',
    passwordHash: hashPassword(password),
    createdAt: nowIso(),
  }
  users.push(newUser)
  writeUsers(users)
  res.json({ ok: true, user: sanitizeUser(newUser) })
})

app.post('/api/auth/login', (req, res) => {
  const body = req.body || {}
  const identifier = normalizeString(body.identifier).toLowerCase()
  const password = String(body.password || '')
  const adminOnly = Boolean(body.adminOnly)

  if (!identifier || !password) {
    res.status(400).json({ ok: false, message: 'Vui lòng nhập tên đăng nhập/email/sđt và mật khẩu.' })
    return
  }

  const users = readUsers()
  const user = users.find((item) =>
    item.username === identifier || item.email === identifier || item.phone === identifier
  )

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ ok: false, message: 'Thông tin đăng nhập không đúng.' })
    return
  }

  if (adminOnly && String(user.role || '').toLowerCase() !== 'admin') {
    res.status(403).json({ ok: false, message: 'Tài khoản này không có quyền quản trị.' })
    return
  }

  res.json({
    ok: true,
    user: sanitizeUser(user),
    token: `mock-${Date.now()}`,
  })
})

app.post('/api/auth/logout', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/payments/config', (_req, res) => {
  res.json({
    bankInfo: DEFAULT_BANK_INFO,
    expireMinutes: INTENT_EXPIRE_MINUTES,
  })
})

app.post('/api/payments/qr/intents', (req, res) => {
  const result = createPendingIntent(req.body || {})
  if (result.error) {
    res.status(400).json({ ok: false, message: result.error })
    return
  }

  res.json({
    ok: true,
    reused: result.reused,
    payment: toClientPaymentResponse(result.payment),
  })
})

app.get('/api/payments/:orderId', (req, res) => {
  const orderId = normalizeString(req.params.orderId)
  const payment = findPaymentByOrderId(orderId)

  if (!payment) {
    res.json({
      paymentId: null,
      orderId,
      amount: 0,
      currency: 'VND',
      status: PAYMENT_STATUS.PENDING,
      transferContent: orderId,
      transactionId: null,
      qrImageUrl: null,
      bankInfo: DEFAULT_BANK_INFO,
      createdAt: null,
      expiresAt: null,
      updatedAt: null,
    })
    return
  }

  const computedStatus = computePaymentStatus(payment)
  if (computedStatus !== payment.status && computedStatus === PAYMENT_STATUS.EXPIRED) {
    const expired = {
      ...payment,
      status: PAYMENT_STATUS.EXPIRED,
      updatedAt: nowIso(),
      events: appendEvent(payment, {
        type: 'payment_expired',
        source: 'system',
      }),
    }
    savePayment(expired)
    res.json(toClientPaymentResponse(expired))
    return
  }

  res.json(toClientPaymentResponse(payment))
})

app.get('/api/rooms/:roomId/availability', (req, res) => {
  const roomId = Number(req.params.roomId)
  if (!Number.isFinite(roomId) || roomId <= 0) {
    res.status(400).json({ ok: false, message: 'invalid roomId' })
    return
  }

  const date = normalizeString(req.query?.date) || toDayIso(nowIso())
  res.json({
    ok: true,
    availability: getRoomAvailability(roomId, date),
  })
})

app.post('/api/payments/:orderId/confirm-manual', async (req, res) => {
  const payload = {
    ...(req.body || {}),
    orderId: normalizeString(req.params.orderId),
    status: 'success',
  }

  const result = await updatePaymentFromTransaction(payload, { source: 'manual_confirm' })
  if (result.error) {
    res.status(400).json({ ok: false, message: result.error })
    return
  }

  res.json({ ok: true, payment: toClientPaymentResponse(result.payment) })
})

app.post('/api/webhooks/payment', async (req, res) => {
  const result = await updatePaymentFromTransaction(req.body || {}, { source: 'generic_webhook' })
  if (result.error) {
    res.status(400).json({ ok: false, message: result.error })
    return
  }

  res.json({ ok: true, payment: toClientPaymentResponse(result.payment) })
})

app.post('/api/webhooks/momo', async (req, res) => {
  const payload = req.body || {}
  const normalized = {
    orderId: payload.orderId,
    amount: payload.amount,
    transferContent: payload.extraData || payload.orderId,
    transactionId: payload.transId || payload.requestId,
    resultCode: payload.resultCode,
    status: Number(payload.resultCode) === 0 ? 'success' : 'invalid',
  }

  const result = await updatePaymentFromTransaction(normalized, { source: 'momo_webhook' })
  if (result.error) {
    res.status(400).json({ resultCode: 1, message: result.error })
    return
  }

  res.json({
    resultCode: 0,
    message: 'ok',
    payment: toClientPaymentResponse(result.payment),
  })
})

app.post('/api/admin/bookings', async (req, res) => {
  const payload = req.body || {}
  const booking = buildBookingRecord(payload)
  const selfConflicts = findSelfBookingConflicts(booking)
  if (selfConflicts.length > 0) {
    res.status(409).json({
      ok: false,
      message: 'Booking contains overlapping time ranges for the same room',
      conflicts: selfConflicts,
    })
    return
  }

  const result = await queueBookingStoreMutation(() => {
    const store = readBookingStore()
    const existingIndex = store.bookings.findIndex((item) => item.orderId === booking.orderId)

    if (existingIndex >= 0) {
      const updated = {
        ...store.bookings[existingIndex],
        ...booking,
        bookingId: store.bookings[existingIndex].bookingId,
        updatedAt: nowIso(),
      }
      const tempBookings = [...store.bookings]
      tempBookings[existingIndex] = updated
      const conflicts = findBookingConflicts(updated, tempBookings)

      if (conflicts.length > 0) {
        return {
          statusCode: 409,
          body: {
            ok: false,
            message: 'Booking schedule conflicts with existing reservations',
            conflicts,
            suggestions: findSuggestedRooms(updated, tempBookings),
          },
        }
      }

      store.bookings[existingIndex] = updated
      writeBookingStore(store)
      return {
        statusCode: 200,
        body: { ok: true, booking: updated, conflicts: [] },
      }
    }

    const conflicts = findBookingConflicts(booking, store.bookings)
    if (conflicts.length > 0) {
      return {
        statusCode: 409,
        body: {
          ok: false,
          message: 'Booking schedule conflicts with existing reservations',
          conflicts,
          suggestions: findSuggestedRooms(booking, store.bookings),
        },
      }
    }

    store.bookings.push(booking)
    writeBookingStore(store)
    return {
      statusCode: 200,
      body: { ok: true, booking, conflicts: [] },
    }
  })

  res.status(result.statusCode).json(result.body)
})

app.patch('/api/admin/bookings/:orderId/payment', async (req, res) => {
  const orderId = normalizeString(req.params.orderId)
  const nextPaymentStatus = normalizeStatus(req.body?.paymentStatus || 'success')
  const result = await queueBookingStoreMutation(() => {
    const store = readBookingStore()
    const index = store.bookings.findIndex((item) => item.orderId === orderId)

    if (index < 0) {
      return {
        statusCode: 404,
        body: { ok: false, message: 'booking not found' },
      }
    }

    const current = store.bookings[index]
    const updated = {
      ...current,
      paymentStatus: nextPaymentStatus,
      status: nextPaymentStatus === 'success' ? 'pending_confirmation' : current.status,
      updatedAt: nowIso(),
    }
    store.bookings[index] = updated
    writeBookingStore(store)
    return {
      statusCode: 200,
      body: { ok: true, booking: updated },
    }
  })

  res.status(result.statusCode).json(result.body)
})

app.patch('/api/admin/bookings/:bookingId/status', async (req, res) => {
  const bookingId = normalizeString(req.params.bookingId)
  const nextStatus = normalizeStatus(req.body?.status || '')
  const validStatuses = new Set(['pending_payment', 'pending_confirmation', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed'])
  if (!validStatuses.has(nextStatus)) {
    res.status(400).json({ ok: false, message: 'invalid status' })
    return
  }

  const result = await queueBookingStoreMutation(() => {
    const store = readBookingStore()
    const index = store.bookings.findIndex((item) => item.bookingId === bookingId)
    if (index < 0) {
      return {
        statusCode: 404,
        body: { ok: false, message: 'booking not found' },
      }
    }

    const current = store.bookings[index]
    if (nextStatus === 'cancelled' && !canBookingBeCancelled(current)) {
      return {
        statusCode: 400,
        body: {
          ok: false,
          message: 'Chi duoc huy booking trong 2 gio sau khi dat.',
        },
      }
    }

    const updated = {
      ...current,
      status: nextStatus,
      paymentStatus: nextStatus === 'checked_in' ? 'success' : current.paymentStatus,
      updatedAt: nowIso(),
    }
    store.bookings[index] = updated
    writeBookingStore(store)
    return {
      statusCode: 200,
      body: { ok: true, booking: updated },
    }
  })

  res.status(result.statusCode).json(result.body)
})

app.delete('/api/admin/bookings/:bookingId', async (req, res) => {
  const bookingId = normalizeString(req.params.bookingId)
  const result = await queueBookingStoreMutation(() => {
    const store = readBookingStore()
    const index = store.bookings.findIndex((item) => item.bookingId === bookingId)

    if (index < 0) {
      return {
        statusCode: 404,
        body: { ok: false, message: 'booking not found' },
      }
    }

    const booking = store.bookings[index]
    const canDelete = String(booking?.status || '').toLowerCase() === 'checked_out'
      && String(booking?.paymentStatus || '').toLowerCase() === 'success'

    if (!canDelete) {
      return {
        statusCode: 400,
        body: { ok: false, message: 'booking is not eligible for deletion' },
      }
    }

    store.bookings.splice(index, 1)
    writeBookingStore(store)
    return {
      statusCode: 200,
      body: { ok: true, bookingId },
    }
  })

  res.status(result.statusCode).json(result.body)
})

app.get('/api/admin/bookings', (_req, res) => {
  const store = readBookingStore()
  const sorted = [...store.bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json({
    ok: true,
    count: sorted.length,
    bookings: sorted,
  })
})

app.get('/api/admin/dashboard', (_req, res) => {
  const store = readBookingStore()
  const bookings = [...store.bookings].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const stats = collectRevenueStats(bookings)
  const activeBookings = bookings.filter((item) => isBookingBlockingSlot(item))

  const roomTimeline = {}
  activeBookings.forEach((booking) => {
    const lines = Array.isArray(booking.items) ? booking.items : []
    lines.forEach((line) => {
      const key = String(line.roomId || 'unknown')
      if (!roomTimeline[key]) {
        roomTimeline[key] = {
          roomId: Number(line.roomId || 0),
          roomName: line.roomName || `Room ${key}`,
          schedules: [],
        }
      }

      roomTimeline[key].schedules.push({
        bookingId: booking.bookingId,
        orderId: booking.orderId,
        startAt: line.startAt,
        endAt: line.endAt,
        status: booking.status,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        customerName: booking.customer?.name || '',
      })
    })
  })

  Object.values(roomTimeline).forEach((room) => {
    room.schedules.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  })

  const conflicts = []
  const roomValues = Object.values(roomTimeline)
  roomValues.forEach((room) => {
    for (let i = 0; i < room.schedules.length - 1; i += 1) {
      const current = room.schedules[i]
      const next = room.schedules[i + 1]
      if (isOverlap(current.startAt, current.endAt, next.startAt, next.endAt)) {
        conflicts.push({
          roomId: room.roomId,
          roomName: room.roomName,
          firstOrderId: current.orderId,
          secondOrderId: next.orderId,
          firstStartAt: current.startAt,
          firstEndAt: current.endAt,
          secondStartAt: next.startAt,
          secondEndAt: next.endAt,
        })
      }
    }
  })

  res.json({
    ok: true,
    totals: {
      bookings: bookings.length,
      pendingPayment: bookings.filter((item) => item.paymentStatus === 'pending').length,
      confirmed: bookings.filter((item) => item.status === 'confirmed').length,
      conflicts: conflicts.length,
      revenueWeek: stats.revenueWeek,
      revenueMonth: stats.revenueMonth,
    },
    charts: stats.charts,
    roomTimeline: roomValues,
    conflicts,
    latestBookings: [...bookings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20),
  })
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Payment backend running at http://localhost:${PORT}`)
})
