<template>
  <section class="home-page">
    <div class="hero-slider">
      <div class="hero-slide" v-for="(slide, index) in slides" :key="slide.title" v-show="activeSlide === index">
        <img :src="slide.image" :alt="slide.title" />
        <div class="hero-overlay">
          <p class="kicker">NESTSTAY HOMESTAY</p>
          <h1>{{ slide.title }}</h1>
          <p>{{ slide.subtitle }}</p>
          <router-link to="/products" class="hero-cta">Kham pha phong</router-link>
        </div>
      </div>
      <div class="dots">
        <button
          v-for="(_, index) in slides"
          :key="index"
          :class="['dot', { active: activeSlide === index }]"
          type="button"
          @click="activeSlide = index"
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
              {{ formatPrice(getSalePrice(room)) }} / đêm
              <span class="old-price">{{ formatPrice(room.gia) }}</span>
            </p>
            <div class="actions">
              <button type="button" @click.stop="addToCart(room, true)">Thêm vao gio hang</button>
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
        <article class="room-card" v-for="room in vipRooms" :key="`vip-${room.id}`" @click="goToDetail(room.id)">
          <img :src="getImageUrl(room.hinh)" :alt="room.tensp" />
          <div class="room-info">
            <div class="room-top-row">
              <span class="room-tag vip">VIP</span>
            </div>
            <h3>{{ room.tensp }}</h3>
            <p class="price">{{ formatPrice(room.gia) }} / dem</p>
            <div class="actions">
              <button type="button" @click.stop="addToCart(room, false)">Them vao gio hang</button>
            </div>
          </div>
        </article>
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
              <button type="button" @click.stop="addToCart(room, false)">Them vao gio hang</button>
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
import { useCartStore } from '@/stores/cart'

const store = useProductStore()
const cartStore = useCartStore()
const router = useRouter()
const activeSlide = ref(0)
let sliderTimer = null

const slides = [
  {
    title: 'Khong gian yen binh gan thien nhien',
    subtitle: 'Dat phong nhanh, check-in linh hoat, uu dai cuoi tuan.',
    image: require('@/assets/image/mauneww.jpg'),
  },
  {
    title: 'Phong sang trong cho ky nghi tron ven',
    subtitle: 'Lua chon da dang tu studio den family room.',
    image: require('@/assets/image/mauneww2.jpg'),
  },
  {
    title: 'Dat lich de dang, xac nhan ngay lap tuc',
    subtitle: 'Toi uu tren mobile va desktop, quan ly dat phong tien loi.',
    image: require('@/assets/image/mauneww3.jpg'),
  },
]

const saleRooms = computed(() => [...store.products].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)).slice(0, 4))

const vipRooms = computed(() =>
  store.products
    .filter((room) => Number(room.gia || 0) >= 600000)
    .sort((a, b) => Number(b.gia || 0) - Number(a.gia || 0))
    .slice(0, 4)
)

const classicRooms = computed(() =>
  store.products
    .filter((room) => Number(room.gia || 0) < 600000)
    .sort((a, b) => Number(b.gia || 0) - Number(a.gia || 0))
    .slice(0, 4)
)

const getSalePrice = (room) => Math.round(Number(room?.gia || 0) * 0.9)

const roomTypeLabel = (room) => (Number(room?.gia || 0) >= 600000 ? 'VIP' : 'Classic')

const roomTypeClass = (room) => (Number(room?.gia || 0) >= 600000 ? 'vip' : 'classic')

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const getImageUrl = (image) => {
  try {
    return require(`../assets/image/${image}`)
  } catch (error) {
    return ''
  }
}

const addToCart = (room, useSale = true) => {
  const finalPrice = useSale ? getSalePrice(room) : Number(room.gia || 0)

  cartStore.addToCart({
    id: room.id,
    name: room.tensp,
    image: room.hinh,
    size: roomTypeLabel(room),
    toppings: [],
    price: finalPrice,
    quantity: 1,
  })
}

const goToDetail = (id) => {
  router.push(`/product/${id}`)
}

onMounted(async () => {
  await store.fetchProducts()
  sliderTimer = setInterval(() => {
    activeSlide.value = (activeSlide.value + 1) % slides.length
  }, 3000)
})

onBeforeUnmount(() => {
  if (sliderTimer) clearInterval(sliderTimer)
})
</script>

<style scoped>
.home-page {
  background: #f3f6fa;
  padding-bottom: 36px;
}

.hero-slider {
  max-width: 1180px;
  margin: 0 auto;
  padding: 18px 20px;
  position: relative;
}

.hero-slide {
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  min-height: 420px;
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
  color: #fff;
  background: linear-gradient(transparent, rgba(8, 19, 32, 0.82));
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
  color: #10263b;
  background: #f7e9cc;
  border-radius: 999px;
  padding: 9px 14px;
  font-weight: 700;
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
  background: #aac0d5;
  cursor: pointer;
}

.dot.active {
  background: #10263b;
}

.featured-wrap {
  max-width: 1180px;
  margin: 0 auto;
  padding: 10px 20px 0;
}

.vip-wrap {
  padding-top: 18px;
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
  color: #12273d;
}

.section-head a {
  color: #12273d;
  font-weight: 700;
}

.featured-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.room-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 22px rgba(16, 38, 59, 0.08);
  cursor: pointer;
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
  color: #12273d;
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
  background: #0f4d46;
  color: #fff;
}

.room-tag.classic {
  background: #e7f0fb;
  color: #16324f;
}

.sale-chip {
  background: #ffe8e3;
  color: #b63a28;
}

.price {
  color: #c8432f;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.old-price {
  color: #8d9eb1;
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
  color: #fff;
  background: #1b6b60;
}
</style>