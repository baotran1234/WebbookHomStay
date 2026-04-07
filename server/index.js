const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PAYMENT_PORT || 4010
const STORE_PATH = path.join(__dirname, 'payment-store.json')

app.use(cors())
app.use(express.json())

function readStore() {
  if (!fs.existsSync(STORE_PATH)) {
    return { payments: [] }
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.payments) ? parsed : { payments: [] }
  } catch (error) {
    return { payments: [] }
  }
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8')
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase()
}

function toMomoPaymentStatus(resultCode) {
  if (Number(resultCode) === 0) return 'success'
  return 'invalid'
}

function upsertPayment(transaction) {
  const store = readStore()
  const orderId = String(transaction.orderId || transaction.transferContent || '').trim()

  if (!orderId) {
    return null
  }

  const record = {
    transactionId: String(transaction.transactionId || transaction.id || `TX-${Date.now()}`),
    orderId,
    amount: Number(transaction.amount || 0),
    transferContent: String(transaction.transferContent || orderId),
    status: normalizeStatus(transaction.status || 'pending'),
    raw: transaction,
    updatedAt: new Date().toISOString(),
  }

  const existingIndex = store.payments.findIndex((item) => item.orderId === orderId)
  if (existingIndex >= 0) {
    store.payments[existingIndex] = record
  } else {
    store.payments.push(record)
  }

  writeStore(store)
  return record
}

function getPayment(orderId) {
  const store = readStore()
  return store.payments.find((item) => item.orderId === orderId) || null
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'payment-backend' })
})

app.get('/api/payments/:orderId', (req, res) => {
  const payment = getPayment(req.params.orderId)

  if (!payment) {
    res.json({
      orderId: req.params.orderId,
      status: 'pending',
      amount: 0,
      transferContent: req.params.orderId,
      transactionId: null,
      updatedAt: null,
    })
    return
  }

  res.json(payment)
})

app.post('/api/webhooks/payment', (req, res) => {
  const transaction = req.body || {}
  const orderId = String(transaction.orderId || transaction.transferContent || '').trim()

  if (!orderId) {
    res.status(400).json({ ok: false, message: 'orderId is required' })
    return
  }

  const record = upsertPayment(transaction)
  res.json({ ok: true, payment: record })
})

app.post('/api/payments/momo/confirm', (req, res) => {
  const transaction = req.body || {}
  const orderId = String(transaction.orderId || transaction.transferContent || '').trim()

  if (!orderId) {
    res.status(400).json({ ok: false, message: 'orderId is required' })
    return
  }

  const amount = Number(transaction.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ ok: false, message: 'amount is required' })
    return
  }

  const transactionId = String(transaction.transactionId || '').trim()
  if (!transactionId) {
    res.status(400).json({ ok: false, message: 'transactionId is required' })
    return
  }

  const record = upsertPayment({
    orderId,
    amount,
    transferContent: String(transaction.transferContent || orderId),
    transactionId,
    provider: 'momo',
    status: 'success',
    source: 'manual-momo-confirm',
    raw: transaction,
  })

  res.json({ ok: true, payment: record })
})

app.post('/api/webhooks/momo', (req, res) => {
  const payload = req.body || {}
  const orderId = String(payload.orderId || '').trim()
  const amount = Number(payload.amount || 0)
  const transactionId = String(payload.transId || payload.requestId || `MOMO-${Date.now()}`)
  const transferContent = String(payload.extraData || orderId)

  if (!orderId) {
    res.status(400).json({ resultCode: 1, message: 'orderId is required' })
    return
  }

  const record = upsertPayment({
    orderId,
    amount,
    transferContent,
    transactionId,
    provider: 'momo',
    status: toMomoPaymentStatus(payload.resultCode),
    raw: payload,
  })

  res.json({ resultCode: 0, message: 'ok', payment: record })
})

app.listen(PORT, () => {
  console.log(`Payment backend running at http://localhost:${PORT}`)
})