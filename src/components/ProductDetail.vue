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

        <div class="selection" v-if="requiresDateRange">
          <label>Ngay vao - ngay ra:</label>
          <div class="options-row">
            <input class="date-input" type="date" v-model="checkInDate" />
            <input class="date-input" type="date" :min="checkInDate || undefined" v-model="checkOutDate" />
          </div>
        </div>

        <div class="selection" v-else>
          <label>Ngay dat phong:</label>
          <div class="options-row">
            <input class="date-input" type="date" v-model="bookingDate" />
          </div>
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

const selectedSize = ref(null)
const selectedTopping = ref(null)
const selectedSurcharges = ref([])
const bookingDate = ref('')
const checkInDate = ref('')
const checkOutDate = ref('')
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

const requiresDateRange = computed(() => {
  const normalized = String(selectedTimePrice.value?.tentopping || '').toLowerCase()
  return normalized.includes('quá đêm') || normalized.includes('ban ngày') || normalized.includes('2nd')
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

const buildCartItem = () => {
  const selectedSurchargeNames = surchargeOptions.value
    .filter((t) => selectedSurcharges.value.some((id) => String(id) === String(t.id)))
    .map((t) => t.tentopping)
  const toppingNames = [selectedTimePrice.value?.tentopping, ...selectedSurchargeNames].filter(Boolean)

  return {
    id: store.productid.id,
    name: store.productid.tensp,
    image: store.productid.hinh,
    bookingDate: requiresDateRange.value ? null : bookingDate.value || null,
    checkInDate: requiresDateRange.value ? checkInDate.value || null : null,
    checkOutDate: requiresDateRange.value ? checkOutDate.value || null : null,
    size: currentSize.value?.tensize || 'Tieu chuan',
    toppings: toppingNames,
    price: Number(totalPrice.value) / Math.max(1, Number(quantity.value || 1)),
    quantity: Math.max(1, Number(quantity.value || 1)),
  }
}

watch(requiresDateRange, (isRange) => {
  if (isRange) {
    bookingDate.value = ''
    return
  }

  checkInDate.value = ''
  checkOutDate.value = ''
})

const addToCart = () => {
  if (!store.productid) return
  cartStore.addToCart(buildCartItem())
}

const buyNow = () => {
  addToCart()
  router.push({ name: 'Cart' })
}

const resetSelections = () => {
  selectedSize.value = null
  selectedSurcharges.value = []
  bookingDate.value = ''
  checkInDate.value = ''
  checkOutDate.value = ''
  quantity.value = 1
  selectedImage.value = ''
}

const loadProductDetail = async (id) => {
  await Promise.all([store.fetchProductById(id), store.fetchSizes(), store.fetchToppings(), store.fetchProducts()])
  resetSelections()
  selectedTopping.value = timePriceOptions.value[0]?.id || null
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
}
</style>
