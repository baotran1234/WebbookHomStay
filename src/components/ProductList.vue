<template>
  <section class="list-page">
    <div class="list-inner">
      <h1>Danh sach phong homestay</h1>

      <div class="toolbar">
        <input v-model.trim="keyword" type="text" placeholder="Tim theo ten phong..." />

        <select v-model="selectedCategory">
          <option value="all">Tat ca danh muc</option>
          <option v-for="cate in store.categories" :key="cate.id" :value="String(cate.id)">
            {{ cate.tendm }}
          </option>
        </select>

        <select v-model="selectedPriceRange">
          <option value="all">Tat ca muc gia</option>
          <option value="0-400000">Duoi 400.000đ</option>
          <option value="400000-700000">400.000đ - 700.000đ</option>
          <option value="700000-9999999">Tren 700.000đ</option>
        </select>

        <select v-model="sortBy">
          <option value="newest">Moi nhat</option>
          <option value="price-asc">Gia tang dan</option>
          <option value="price-desc">Gia giam dan</option>
        </select>
      </div>

      <div class="room-grid">
        <article class="room-card" v-for="room in filteredRooms" :key="room.id" @click="goToDetail(room.id)">
          <img :src="getImageUrl(room.hinh)" :alt="room.tensp" />
          <div class="room-content">
            <h3>{{ room.tensp }}</h3>
            <p class="room-price">{{ formatPrice(room.gia) }} / đêm </p>
            <div class="card-actions">
              <button type="button" @click.stop="addToCart(room)">Them vao gio hang</button>
            </div>
          </div>
        </article>
      </div>

      <p v-if="filteredRooms.length === 0" class="empty-note">
        Khong tim thay phong phu hop voi bo loc hien tai.
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import { useCartStore } from '@/stores/cart'

const store = useProductStore()
const cartStore = useCartStore()
const router = useRouter()

const keyword = ref('')
const selectedCategory = ref('all')
const selectedPriceRange = ref('all')
const sortBy = ref('newest')

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const getImageUrl = (image) => {
  try {
    return require(`../assets/image/${image}`)
  } catch (error) {
    return ''
  }
}

const addToCart = (room) => {
  cartStore.addToCart({
    id: room.id,
    name: room.tensp,
    image: room.hinh,
    size: '1 đêm',
    toppings: [],
    price: Number(room.gia || 0),
    quantity: 1,
  })
}

const goToDetail = (id) => {
  router.push(`/product/${id}`)
}

const inRange = (price, range) => {
  if (range === 'all') return true
  const [min, max] = range.split('-').map(Number)
  return price >= min && price <= max
}

const filteredRooms = computed(() => {
  const keywordLower = keyword.value.toLowerCase()
  const rooms = store.products.filter((room) => {
    const nameMatched = String(room.tensp || '').toLowerCase().includes(keywordLower)
    const categoryMatched =
      selectedCategory.value === 'all' || String(room.category_id) === String(selectedCategory.value)
    const priceMatched = inRange(Number(room.gia || 0), selectedPriceRange.value)
    return nameMatched && categoryMatched && priceMatched
  })

  if (sortBy.value === 'price-asc') {
    return [...rooms].sort((a, b) => Number(a.gia || 0) - Number(b.gia || 0))
  }

  if (sortBy.value === 'price-desc') {
    return [...rooms].sort((a, b) => Number(b.gia || 0) - Number(a.gia || 0))
  }

  return [...rooms].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
})

onMounted(async () => {
  await Promise.all([store.fetchProducts(), store.fetchCategories()])
})
</script>

<style scoped>
.list-page {
  background: #f3f6fa;
  min-height: 100%;
}

.list-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

h1 {
  margin: 0 0 16px;
  color: #10263b;
}

.toolbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.toolbar input,
.toolbar select {
  height: 40px;
  border: 1px solid #ced8e3;
  border-radius: 8px;
  padding: 0 10px;
  background: #fff;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 14px;
}

.room-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 22px rgba(16, 38, 59, 0.08);
  cursor: pointer;
}

.room-card img {
  width: 100%;
  height: 170px;
  object-fit: cover;
}

.room-content {
  padding: 12px;
}

.room-content h3 {
  margin: 0;
  color: #10263b;
}

.room-price {
  margin: 6px 0 12px;
  color: #c8432f;
  font-weight: 700;
}

.card-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.card-actions button {
  height: 36px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.card-actions button {
  background: #1b6b60;
  color: #fff;
}

.empty-note {
  margin-top: 14px;
  color: #4c5d70;
}

@media (max-width: 900px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
}
</style>