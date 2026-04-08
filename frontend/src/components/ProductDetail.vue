<template>
  <section class="detail-page" v-if="store.productid && store.productid.hinh">
    <div class="detail-card">
      <div class="image-box">
        <img :src="getImageUrl(activeImage)" :alt="store.productid.tensp" />
        <div class="extra-gallery">
          <img
            v-for="(img, index) in detailImages"
            :key="`${img}-${index}`"
            :src="getImageUrl(img, store.productid ? store.productid.hinh : 'mau.png')"
            :alt="`Anh phong ${index + 1}`"
            :class="{ active: activeImage === img }"
            @click="setActiveImage(img)"
          />
        </div>
      </div>

      <div class="info-box">
        <h1>{{ store.productid.tensp }}</h1>
        <p class="price">{{ formatPrice(store.productid.gia) }} / dem</p>
        <p class="desc">
          Khong gian phong thoang mat, day du tien nghi co ban. 
        </p>

        <div class="selection">
          <label>Loai phong:</label>
          <div class="options-row">
            <button
              v-for="s in store.sizes"
              :key="s.id"
              type="button"
              :class="['chip', { active: String(selectedSize) === String(s.id) }]"
              @click="selectedSize = s.id"
            >
              {{ s.tensize }} (+{{ formatPrice(s.price) }})
            </button>
          </div>
        </div>

        <div class="selection">
          <label>Mức giá cho 2 người vào các khung giờ:</label>
          <div class="addon-grid">
            <label v-for="t in timePriceOptions" :key="t.id" class="addon-item">
              <input type="radio" name="time-price" :value="t.id" v-model="selectedTopping" />
              {{ t.tentopping }} ({{ formatPrice(t.price) }})
            </label>
          </div>
        </div>

        <div class="selection">
          <div class="slot-head">
            <label>Ngay vao:</label>
            <span class="slot-legend">Trạng thái: trắng là còn trống, đỏ là đã được giữ cho đến khi admin xác nhận đã trả phòng</span>
          </div>
          <div class="options-row">
            <input class="date-input" type="date" v-model="selectedDate" @change="refreshAvailability" />
          </div>
        </div>

        <div class="selection">
          <div class="slot-head">
            <label>Chon khung gio vao:</label>
            <span class="slot-legend">{{ selectedPackageLabel }}</span>
          </div>
          <p v-if="availabilityLoading" class="slot-note">Dang tai khung gio...</p>
          <p v-else-if="availabilityError" class="slot-note error">{{ availabilityError }}</p>
          <div class="slot-grid">
            <button
              v-for="slot in availableSlots"
              :key="slot.startAt"
              type="button"
              :disabled="slot.occupied"
              :aria-pressed="selectedSlotStartAt === slot.startAt"
              :title="slot.title"
              :class="['slot-card', { occupied: slot.occupied, selected: selectedSlotStartAt === slot.startAt }]"
              @click="selectSlot(slot)"
            >
              <span class="slot-time">{{ slot.label }}</span>
              <span class="slot-status">{{ slot.occupied ? 'Đang được giữ' : 'Còn trống' }}</span>
            </button>
          </div>
          <p v-if="selectedSlotLabel" class="slot-picked">Đã chọn: {{ selectedSlotLabel }}</p>
        </div>

        <div class="selection">
          <label>Phu thu:</label>
          <div class="addon-grid">
            <label v-for="t in surchargeOptions" :key="`surcharge-${t.id}`" class="addon-item">
              <input type="radio" :value="t.id" v-model="selectedSurcharges" />
              {{ t.tentopping }} (+{{ formatPrice(t.price) }})
            </label>
          </div>
        </div>

        <div class="qty-wrap">
          <label>So luong phong:</label>
          <div class="qty-control">
            <button type="button" @click="changeQuantity(-1)">-</button>
            <input type="number" min="1" v-model.number="quantity" />
            <button type="button" @click="changeQuantity(1)">+</button>
          </div>
        </div>

        <div class="total">Tong tien: <strong>{{ formatPrice(totalPrice) }}</strong></div>

        <div class="actions">
          <button type="button" class="outline" @click="addToCart">Them vao gio</button>
          <button type="button" class="solid" @click="buyNow">Đặt ngay</button>
        </div>
      </div>

      <div class="alternative-section" v-if="alternativeRooms.length">
          <label>Lua chon khac:</label>
          <div class="alternative-grid">
            <button
              v-for="room in alternativeRooms"
              :key="`alt-${room.id}`"
              type="button"
              class="alternative-card"
              @click="goToAlternativeRoom(room.id)"
            >
              <img :src="getImageUrl(room.hinh)" :alt="room.tensp" />
              <span class="alternative-name">{{ room.tensp }}</span>
              <span class="alternative-price">{{ formatPrice(room.gia) }} / dem</span>
              <span class="sale-badge">Deal -10%</span>
            </button>
          </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const store = useProductStore()
const cartStore = useCartStore()
const ROOM_API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:4010/api`
  : 'http://localhost:4010/api'

const todayKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const selectedDate = ref(todayKey())
const selectedSlot = ref(null)
const availability = ref({ occupiedRanges: [] })
const availabilityLoading = ref(false)
const availabilityError = ref('')

const selectedSize = ref(null)
const selectedTopping = ref(null)
const selectedSurcharges = ref([])
const quantity = ref(1)
const selectedImage = ref('')
const defaultDetailImages = ['mau1.png', 'mau2.png', 'mau3.png']

const detailImages = computed(() => {
  const images = store.productid?.hinhPhu
  if (Array.isArray(images) && images.length > 0) {
    return images.slice(0, 3)
  }

  return defaultDetailImages
})

const activeImage = computed(() => selectedImage.value || store.productid?.hinh || '')

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} d`

const getImageUrl = (image, fallbackImage = 'mau.png') => {
  try {
    return require(`../assets/image/${image}`)
  } catch (error) {
    try {
      return require(`../assets/image/${fallbackImage}`)
    } catch (fallbackError) {
      return ''
    }
  }
}

const setActiveImage = (image) => {
  selectedImage.value = image
}

const currentSize = computed(() => {
  const firstSize = store.sizes[0]
  const sizeId = selectedSize.value || firstSize?.id
  return store.sizes.find((s) => String(s.id) === String(sizeId)) || firstSize
})

const isSurchargeOption = (name = '') => {
  const normalized = String(name).toLowerCase()
  return normalized.includes('người thứ 3') || normalized.includes('book chụp hình')
}

const timePriceOptions = computed(() => store.toppings.filter((t) => !isSurchargeOption(t.tentopping)))

const surchargeOptions = computed(() => store.toppings.filter((t) => isSurchargeOption(t.tentopping)))

const alternativeRooms = computed(() => {
  const currentId = String(store.productid?.id || '')
  const currentCategory = String(store.productid?.category_id || '')
  const rooms = Array.isArray(store.products) ? store.products : []
  const others = rooms.filter((room) => String(room.id) !== currentId)
  const sameCategory = others.filter((room) => String(room.category_id) === currentCategory)
  const differentCategory = others.filter((room) => String(room.category_id) !== currentCategory)
  return [...sameCategory, ...differentCategory].slice(0, 3)
})

const selectedTimePrice = computed(() => {
  const firstTimePrice = timePriceOptions.value[0]
  const toppingId = selectedTopping.value || firstTimePrice?.id
  return timePriceOptions.value.find((t) => String(t.id) === String(toppingId)) || firstTimePrice
})

const selectedPackageLabel = computed(() => selectedTimePrice.value?.tentopping || '3 tiếng')

const selectedSlotStartAt = computed(() => selectedSlot.value?.startAt || '')
const selectedSlotLabel = computed(() => selectedSlot.value?.label || '')

const normalizePackageName = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const selectedPackageName = computed(() => normalizePackageName(selectedTimePrice.value?.tentopping || '3 tiếng'))

const slotPlan = computed(() => {
  const name = selectedPackageName.value
  if (name.includes('qua dem')) {
    return { durationMinutes: 13 * 60, startHours: [20] }
  }
  if (name.includes('ban ngay')) {
    return { durationMinutes: 8 * 60, startHours: [10] }
  }
  if (name.includes('2nd')) {
    return { durationMinutes: 22 * 60, startHours: [15] }
  }
  if (name.includes('4 tieng')) {
    return { durationMinutes: 4 * 60, startHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] }
  }
  return { durationMinutes: 3 * 60, startHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] }
})

const buildIsoAtTime = (dateKey, hour, minute = 0) => {
  const paddedHour = String(hour).padStart(2, '0')
  const paddedMinute = String(minute).padStart(2, '0')
  return `${dateKey}T${paddedHour}:${paddedMinute}:00.000Z`
}

const formatClock = (isoString) => String(isoString || '').slice(11, 16)

const addMinutesToIso = (isoString, minutes) => new Date(new Date(isoString).getTime() + minutes * 60000).toISOString()

const isOverlap = (startA, endA, startB, endB) => {
  const aStart = new Date(startA).getTime()
  const aEnd = new Date(endA).getTime()
  const bStart = new Date(startB).getTime()
  const bEnd = new Date(endB).getTime()
  return aStart < bEnd && bStart < aEnd
}

const availableSlots = computed(() => {
  const occupiedRanges = Array.isArray(availability.value?.occupiedRanges) ? availability.value.occupiedRanges : []

  return slotPlan.value.startHours.map((hour) => {
    const startAt = buildIsoAtTime(selectedDate.value, hour, 0)
    const endAt = addMinutesToIso(startAt, slotPlan.value.durationMinutes)
    const matchedRange = occupiedRanges.find((range) => isOverlap(startAt, endAt, range.startAt, range.endAt))
    const occupied = Boolean(matchedRange)
    return {
      label: `${String(hour).padStart(2, '0')}:00 - ${formatClock(endAt)}`,
      startAt,
      endAt,
      occupied,
      title: occupied
        ? `Khung giờ này đang được giữ (${formatClock(matchedRange.startAt)} - ${formatClock(matchedRange.endAt)}). Chỉ mở lại khi admin xác nhận đã trả phòng.`
        : 'Còn trống',
    }
  })
})

const toppingsTotal = computed(() => {
  return Number(selectedTimePrice.value?.price || 0)
})

const surchargesTotal = computed(() => {
  if (!Array.isArray(selectedSurcharges.value) || selectedSurcharges.value.length === 0) {
    return 0
  }

  return surchargeOptions.value
    .filter((t) => selectedSurcharges.value.some((id) => String(id) === String(t.id)))
    .reduce((sum, t) => sum + Number(t.price || 0), 0)
})

const totalPrice = computed(() => {
  const base = Number(toppingsTotal.value || store.productid?.gia || 0)
  const sizePrice = Number(currentSize.value?.price || 0)
  const surcharge = Number(surchargesTotal.value || 0)
  const qty = Math.max(1, Number(quantity.value || 1))
  return (base + sizePrice + surcharge) * qty
})

const changeQuantity = (delta) => {
  const next = Math.max(1, Number(quantity.value || 1) + delta)
  quantity.value = next
}

const refreshAvailability = async () => {
  if (!store.productid?.id || !selectedDate.value) return

  availabilityLoading.value = true
  availabilityError.value = ''
  try {
    const response = await fetch(`${ROOM_API_BASE}/rooms/${encodeURIComponent(store.productid.id)}/availability?date=${encodeURIComponent(selectedDate.value)}`)
    if (!response.ok) {
      throw new Error('Khong tai duoc khung gio.')
    }

    const payload = await response.json()
    availability.value = payload?.availability || { occupiedRanges: [] }

    if (selectedSlot.value) {
      const matched = availableSlots.value.find((slot) => slot.startAt === selectedSlot.value.startAt)
      if (!matched || matched.occupied) {
        selectedSlot.value = null
      }
    }
  } catch (_error) {
    availability.value = { occupiedRanges: [] }
    availabilityError.value = 'Khong tai duoc khung gio. Vui long thu lai.'
  } finally {
    availabilityLoading.value = false
  }
}

const selectSlot = (slot) => {
  if (slot.occupied) return
  selectedSlot.value = slot
}

const buildCartItem = () => {
  if (!selectedSlot.value) {
    return null
  }

  const selectedSurchargeNames = surchargeOptions.value
    .filter((t) => selectedSurcharges.value.some((id) => String(id) === String(t.id)))
    .map((t) => t.tentopping)
  const toppingNames = [selectedTimePrice.value?.tentopping, ...selectedSurchargeNames].filter(Boolean)

  return {
    id: store.productid.id,
    name: store.productid.tensp,
    image: store.productid.hinh,
    bookingDate: selectedDate.value,
    startAt: selectedSlot.value.startAt,
    endAt: selectedSlot.value.endAt,
    slotLabel: selectedSlot.value.label,
    size: currentSize.value?.tensize || 'Tieu chuan',
    toppings: toppingNames,
    price: Number(totalPrice.value) / Math.max(1, Number(quantity.value || 1)),
    quantity: Math.max(1, Number(quantity.value || 1)),
  }
}

const addToCart = async () => {
  if (!store.productid) return
  await refreshAvailability()
  const item = buildCartItem()
  if (!item) {
    alert('Vui lòng chọn khung giờ trước khi thêm vào giỏ.')
    return false
  }
  const latestSlot = availableSlots.value.find((slot) => slot.startAt === item.startAt)
  if (!latestSlot || latestSlot.occupied) {
    selectedSlot.value = null
    alert('Khung giờ này vừa được đặt hoặc đang bị giữ. Vui lòng chọn khung giờ khác.')
    return false
  }
  cartStore.addToCart(item)
  return true
}

const buyNow = async () => {
  const added = await addToCart()
  if (!added) return
  router.push({ name: 'Cart' })
}

const resetSelections = () => {
  selectedSize.value = null
  selectedSurcharges.value = []
  selectedDate.value = todayKey()
  selectedSlot.value = null
  quantity.value = 1
  selectedImage.value = ''
}

const loadProductDetail = async (id) => {
  await Promise.all([store.fetchProductById(id), store.fetchSizes(), store.fetchToppings(), store.fetchProducts()])
  resetSelections()
  selectedTopping.value = timePriceOptions.value[0]?.id || null
  await refreshAvailability()
}

const goToAlternativeRoom = async (id) => {
  if (String(id) === String(route.params.id)) return
  await router.push({ name: 'ProductDetail', params: { id } })
}

onMounted(async () => {
  await loadProductDetail(route.params.id)
})

watch(
  () => route.params.id,
  async (id) => {
    if (!id) return
    await loadProductDetail(id)
  }
)

watch(
  [() => store.productid?.id, selectedDate, selectedTopping],
  async ([roomId]) => {
    if (!roomId || !selectedDate.value) return
    await refreshAvailability()
  }
)

watch(selectedTopping, () => {
  selectedSlot.value = null
})
</script>

<style scoped>
.detail-page {
  background: radial-gradient(circle at top, #171b25 0%, #08090d 52%, #050507 100%);
  padding: 18px 24px 36px;
}

.detail-card {
  width: 100%;
  max-width: none;
  margin: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 28px;
}

.image-box img {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 10;
  max-height: 420px;
  object-fit: cover;
  object-position: center;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  border-radius: 12px;
  border: 1px solid #2a3345;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.45);
}

.extra-gallery {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.extra-gallery img {
  width: 100%;
  height: 96px;
  object-fit: cover;
  object-position: center;
  border-radius: 8px;
  border: 1px solid #2b3446;
  cursor: pointer;
  transition: box-shadow 0.16s ease, border-color 0.16s ease;
}

.extra-gallery img:hover {
  border-color: #b30077;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.35);
}

.extra-gallery img.active {
  border-color: #990066;
  box-shadow: 0 0 0 2px rgba(153, 0, 102, 0.35);
}

.info-box h1 {
  margin-top: 0;
  color: #eef4ff;
}

.info-box {
  padding-right: 8px;
}

.price {
  color: #ff9d8d;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 8px 0;
}

.desc {
  color: #aebad0;
}

.selection,
.qty-wrap {
  margin-top: 16px;
}

.selection label,
.qty-wrap label {
  font-weight: 700;
  color: #e8efff;
}

.options-row {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid #2d384b;
  border-radius: 999px;
  padding: 7px 12px;
  background: #121722;
  color: #e6eeff;
  cursor: pointer;
}

.chip.active {
  color: #ffe8f6;
  border-color: #b30077;
  background: #990066;
}

.addon-grid {
  margin-top: 8px;
  display: grid;
  gap: 8px;
}

.addon-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slot-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.slot-legend,
.slot-note {
  color: #a8b8d3;
  font-size: 12px;
}

.slot-note.error {
  color: #ff9d8d;
}

.slot-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 10px;
}

.slot-card {
  border: 1px solid #d6dce8;
  border-radius: 12px;
  background: #ffffff;
  color: #102033;
  min-height: 68px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.slot-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #990066;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
}

.slot-card.selected {
  border-color: #0066cc;
  background: linear-gradient(180deg, #1f5fbf 0%, #0f3d85 100%);
  color: #fff;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.35);
  transform: translateY(-1px);
}

.slot-card.occupied {
  background: #d9534f;
  border-color: #d9534f;
  color: #fff;
  cursor: not-allowed;
  opacity: 0.95;
}

.slot-card:disabled {
  cursor: not-allowed;
}

.slot-time {
  font-size: 0.95rem;
  font-weight: 800;
}

.slot-status {
  font-size: 0.8rem;
  font-weight: 700;
  opacity: 0.9;
}

.slot-picked {
  margin: 10px 0 0;
  color: #8cc1ff;
  font-weight: 700;
}

.alternative-section {
  grid-column: 1 / -1;
  margin-top: 6px;
}

.alternative-section label {
  font-weight: 700;
  color: #e8efff;
}

.alternative-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.alternative-card {
  border: 1px solid #2a3345;
  border-radius: 12px;
  background: linear-gradient(180deg, #141a25 0%, #0f131c 100%);
  padding: 9px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 7px;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.alternative-card:hover {
  transform: translateY(-2px);
  border-color: #990066;
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.42);
}

.alternative-card img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  min-height: 112px;
  object-fit: cover;
  object-position: center;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  border-radius: 8px;
  border: 1px solid #2f394c;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
  transition: box-shadow 0.2s ease;
}

.alternative-name {
  color: #eaf1ff;
  font-size: 0.95rem;
  line-height: 1.35;
  font-weight: 700;
}

.alternative-price {
  color: #ff9d8d;
  font-size: 0.95rem;
  font-weight: 700;
}

.sale-badge {
  display: inline-flex;
  width: fit-content;
  background: #990066;
  color: #ffe8f6;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 0.74rem;
  font-weight: 700;
}

.date-input {
  min-height: 38px;
  border: 1px solid #2d384b;
  border-radius: 8px;
  padding: 8px 10px;
  color: #e8efff;
  background: #121722;
}

.qty-control {
  margin-top: 8px;
  display: inline-flex;
  border: 1px solid #2d384b;
  border-radius: 8px;
  overflow: hidden;
}

.qty-control button {
  width: 36px;
  border: none;
  background: #1b2230;
  color: #e8efff;
  cursor: pointer;
}

.qty-control input {
  width: 60px;
  border: none;
  text-align: center;
  background: #121722;
  color: #e8efff;
}

.total {
  margin-top: 18px;
  font-size: 1.15rem;
}

.total strong {
  color: #ff9d8d;
}

.actions {
  margin-top: 18px;
  display: flex;
  gap: 8px;
}

.actions button {
  flex: 1;
  border-radius: 8px;
  height: 42px;
  font-weight: 700;
  cursor: pointer;
}

.actions .outline {
  border: 1px solid #990066;
  color: #f2b8de;
  background: #151b27;
}

.actions .solid {
  border: none;
  color: #ffe8f6;
  background: #990066;
}

@media (max-width: 900px) {
  .detail-card {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .image-box img {
    max-height: 320px;
  }

  .detail-page {
    padding: 14px 14px 28px;
  }

  .alternative-grid {
    grid-template-columns: 1fr;
  }

  .alternative-card img {
    min-height: 176px;
  }

  .slot-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
