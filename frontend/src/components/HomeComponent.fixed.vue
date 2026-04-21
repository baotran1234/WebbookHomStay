<template>
  <section class="home-page">
    <div class="hero-slider">
      <div class="hero-viewport">
        <div class="hero-track" :style="heroTrackStyle">
          <div class="hero-slide" v-for="slide in slides" :key="slide.title">
            <img :src="slide.image" :alt="slide.title" />
            <div class="hero-overlay">
              <p class="kicker">NESTSTAY HOMESTAY</p>
              <h1>{{ slide.title }}</h1>
              <p>{{ slide.subtitle }}</p>
              <div class="hero-actions">
                <router-link to="/products" class="hero-cta">Kham pha phong</router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="dots">
        <button
          v-for="(_, index) in slides"
          :key="index"
          :class="['dot', { active: activeSlide === index }]"
          type="button"
          @click="goToSlide(index)"
        />
      </div>
    </div>

    <div class="featured-wrap">
      <div class="section-head">
        <h2>Phong sale</h2>
        <router-link to="/products">Xem tat ca</router-link>
      </div>
      <div class="featured-grid">
        <article class="room-card" v-for="room in saleRooms" :key="room.id" @click="goToDetail(room.id)">
          <img :src="getImageUrl(room.hinh)" :alt="room.tensp" />
          <div class="room-info">
            <div class="room-top-row">
              <span :class="['room-tag', roomTypeClass(room)]">{{ roomTypeLabel(room) }}</span>
              <span class="sale-chip">Sale -10%</span>
            </div>
            <h3>{{ room.tensp }}</h3>
            <p class="price">
              {{ formatPrice(getSalePrice(room)) }} / dem
              <span class="old-price">{{ formatPrice(room.gia) }}</span>
            </p>
            <div class="actions">
              <button type="button" @click.stop="goToDetail(room.id)">Xem chi tiet</button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div class="featured-wrap vip-wrap">
      <div class="section-head">
        <h2>Phong VIP</h2>
        <router-link to="/products">Xem tat ca</router-link>
      </div>
      <div class="featured-grid">
        <article class="room-card" v-for="room in pagedVipRooms" :key="`vip-${room.id}`" @click="goToDetail(room.id)">
          <img :src="getImageUrl(room.hinh)" :alt="room.tensp" />
          <div class="room-info">
            <div class="room-top-row">
              <span class="room-tag vip">VIP</span>
            </div>
            <h3>{{ room.tensp }}</h3>
            <p class="price">{{ formatPrice(room.gia) }} / dem</p>
            <div class="actions">
              <button type="button" @click.stop="goToDetail(room.id)">Xem chi tiet</button>
            </div>
          </div>
        </article>
      </div>
      <div v-if="vipTotalPages > 1" class="vip-pagination">
        <button v-if="canPrevVipPage" type="button" class="vip-page-btn" @click="goToPrevVipPage">Pre</button>
        <span class="vip-page-indicator">Trang {{ vipPage }} / {{ vipTotalPages }}</span>
        <button v-if="canNextVipPage" type="button" class="vip-page-btn" @click="goToNextVipPage">Next</button>
      </div>
    </div>

    <div class="featured-wrap classic-wrap">
      <div class="section-head">
        <h2>Phong Classic</h2>
        <router-link to="/products">Xem tat ca</router-link>
      </div>
      <div class="featured-grid">
        <article class="room-card" v-for="room in classicRooms" :key="`classic-${room.id}`" @click="goToDetail(room.id)">
          <img :src="getImageUrl(room.hinh)" :alt="room.tensp" />
          <div class="room-info">
            <div class="room-top-row">
              <span class="room-tag classic">Classic</span>
            </div>
            <h3>{{ room.tensp }}</h3>
            <p class="price">{{ formatPrice(room.gia) }} / dem</p>
            <div class="actions">
              <button type="button" @click.stop="goToDetail(room.id)">Xem chi tiet</button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'

const store = useProductStore()
const router = useRouter()
const activeSlide = ref(0)
let sliderTimer = null
const SLIDE_INTERVAL = 2000

const slides = [
  {
    title: 'Khong gian yen binh gan thien nhien',
    subtitle: 'Dat phong nhanh, check-in linh hoat, uu dai cuoi tuan.',
    image: require('@/assets/image/happy.jpg'),
  },
  {
    title: 'Phong sang trong cho ky nghi tron ven',
    subtitle: 'Lua chon da dang tu studio den family room.',
    image: require('@/assets/image/happy1.jpg'),
  },
  {
    title: 'Dat lich de dang, xac nhan ngay lap tuc',
    subtitle: 'Toi uu tren mobile va desktop, quan ly dat phong tien loi.',
    image: require('@/assets/image/happy2.jpg'),
  },
  {
    title: 'Dich vu tan tam, trai nghiem dang nho',
    subtitle: 'Doi ngu ho tro 24/7, cam ket hai long khach hang.',
    image: require('@/assets/image/happy3.jpg'),
  },
]

const heroTrackStyle = computed(() => ({
  transform: `translateX(-${activeSlide.value * 100}%)`,
}))

const saleRooms = computed(() => [...store.products].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)).slice(0, 4))

const VIP_ROOM_IDS = [1, 2, 3, 9, 10, 11]
const isVipRoom = (room) => VIP_ROOM_IDS.includes(Number(room?.id || 0))
const vipPage = ref(1)
const vipPerPage = 3

const vipRooms = computed(() =>
  store.products
    .filter((room) => isVipRoom(room))
    .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
)

const vipTotalPages = computed(() => Math.max(1, Math.ceil(vipRooms.value.length / vipPerPage)))

const pagedVipRooms = computed(() => {
  const currentPage = Math.min(vipPage.value, vipTotalPages.value)
  const start = (currentPage - 1) * vipPerPage
  return vipRooms.value.slice(start, start + vipPerPage)
})

const canPrevVipPage = computed(() => vipPage.value > 1)
const canNextVipPage = computed(() => vipPage.value < vipTotalPages.value)

const classicRooms = computed(() =>
  store.products
    .filter((room) => !isVipRoom(room))
    .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
    .slice(0, 4)
)

const getSalePrice = (room) => Math.round(Number(room?.gia || 0) * 0.9)

const roomTypeLabel = (room) => (isVipRoom(room) ? 'VIP' : 'Classic')

const roomTypeClass = (room) => (isVipRoom(room) ? 'vip' : 'classic')

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`

const getImageUrl = (image) => {
  try {
    return require(`../assets/image/${image}`)
  } catch (error) {
    return ''
  }
}

const goToDetail = (id) => {
  router.push(`/product/${id}`)
}

const goToPrevVipPage = () => {
  if (!canPrevVipPage.value) return
  vipPage.value -= 1
}

const goToNextVipPage = () => {
  if (!canNextVipPage.value) return
  vipPage.value += 1
}

const nextSlide = () => {
  activeSlide.value = (activeSlide.value + 1) % slides.length
}

const stopSlider = () => {
  if (sliderTimer) {
    clearInterval(sliderTimer)
    sliderTimer = null
  }
}

const startSlider = () => {
  stopSlider()
  sliderTimer = setInterval(nextSlide, SLIDE_INTERVAL)
}

const goToSlide = (index) => {
  activeSlide.value = index
  startSlider()
}

onMounted(async () => {
  await store.fetchProducts()
  startSlider()
})

onBeforeUnmount(() => {
  stopSlider()
})
</script>

<style scoped>
.home-page {
  background: radial-gradient(circle at top, #171b25 0%, #08090d 52%, #050507 100%);
  padding-bottom: 36px;
}

.hero-slider {
  max-width: 1180px;
  margin: 0 auto;
  padding: 18px 20px;
  position: relative;
}

.hero-viewport {
  overflow: hidden;
  border-radius: 16px;
}

.hero-track {
  display: flex;
  transition: transform 0.7s ease-in-out;
  will-change: transform;
}

.hero-slide {
  flex: 0 0 100%;
  position: relative;
  min-height: 420px;
  overflow: hidden;
}

.hero-slide img {
  width: 100%;
  height: 420px;
  object-fit: cover;
  display: block;
}

.hero-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24px;
  color: #eef4ff;
  background: linear-gradient(transparent, rgba(3, 5, 10, 0.92));
}

.kicker {
  font-size: 0.85rem;
  letter-spacing: 2px;
  margin: 0;
}

.hero-overlay h1 {
  margin: 8px 0;
  font-size: 2rem;
}

.hero-cta {
  display: inline-block;
  margin-top: 8px;
  text-decoration: none;
  color: #f7f9ff;
  background: #990066;
  border: 1px solid #b30077;
  border-radius: 999px;
  padding: 9px 14px;
  font-weight: 700;
}

.hero-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 10px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: none;
  background: #5b6882;
  cursor: pointer;
}

.dot.active {
  background: #990066;
}

.featured-wrap {
  max-width: 1180px;
  margin: 0 auto;
  padding: 10px 20px 0;
}

.vip-wrap {
  padding-top: 18px;
}

.vip-pagination {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.vip-page-btn {
  min-width: 84px;
  border: 1px solid #b30077;
  border-radius: 999px;
  background: #990066;
  color: #ffe8f6;
  padding: 9px 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.vip-page-btn:hover {
  background: #b30077;
  box-shadow: 0 10px 18px rgba(179, 0, 119, 0.28);
  transform: translateY(-1px);
}

.vip-page-indicator {
  color: #d7e4ff;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.classic-wrap {
  padding-top: 18px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-head h2 {
  margin: 0;
  color: #f0f5ff;
}

.section-head a {
  color: #f2b8de;
  font-weight: 700;
}

.featured-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.room-card {
  background: #11151d;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #242c3c;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.42);
  cursor: pointer;
  transform: translateY(0);
  transition:
    transform 0.28s ease,
    box-shadow 0.28s ease,
    border-color 0.28s ease;
}

.room-card:hover {
  transform: translateY(-12px) scale(1.02);
  box-shadow:
    0 22px 42px rgba(0, 0, 0, 0.58),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  border-color: #4a5775;
}

.featured-grid .room-card:nth-child(2n) {
  animation-delay: 0.35s;
}

.featured-grid .room-card:nth-child(3n) {
  animation-delay: 0.7s;
}

.featured-grid .room-card:nth-child(4n) {
  animation-delay: 1s;
}

.room-card img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.room-info {
  padding: 12px;
}

.room-info h3 {
  margin: 0;
  color: #eaf1ff;
}

.room-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.room-tag,
.sale-chip {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
}

.room-tag.vip {
  background: #990066;
  color: #ffe8f6;
}

.room-tag.classic {
  background: #2a2f3b;
  color: #d8e3f8;
}

.sale-chip {
  background: #4d2330;
  color: #ffd5df;
}

.price {
  color: #ff9d8d;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.old-price {
  color: #8b97ad;
  font-size: 0.85rem;
  text-decoration: line-through;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  flex: 1;
  text-align: center;
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  font-weight: 700;
  cursor: pointer;
}

.actions button {
  color: #ffe8f6;
  background: #990066;
}

@media (prefers-reduced-motion: reduce) {
  .hero-track {
    transition: none;
  }

  .room-card {
    transition: none;
  }

  .room-card:hover {
    transform: none;
  }
}
</style>
