<template>
  <section class="list-page">
    <div class="list-inner">
      <h1>Danh sách phòng homestay</h1>

      <div class="toolbar">
        <input v-model.trim="keyword" type="text" placeholder="Tìm theo tên phòng..." />

        <select v-model="selectedCategory">
          <option value="all">Tất cả danh mục</option>
          <option v-for="cate in store.categories" :key="cate.id" :value="String(cate.id)">
            {{ cate.tendm }}
          </option>
        </select>

        <select v-model="selectedPriceRange">
          <option value="all">Tất cả mức giá</option>
          <option value="0-400000">Dưới 400.000đ</option>
          <option value="400000-700000">400.000đ - 700.000đ</option>
          <option value="700000-9999999">Trên 700.000đ</option>
        </select>

        <select v-model="sortBy">
          <option value="newest">Mới nhất</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
        </select>
      </div>

      <div class="room-grid">
        <article class="room-card" v-for="room in filteredRooms" :key="room.id" @click="goToDetail(room.id)">
          <img :src="getImageUrl(room.hinh)" :alt="room.tensp" />
          <div class="room-content">
            <h3>{{ room.tensp }}</h3>
            <p class="room-price">{{ formatPrice(room.gia) }} / đêm </p>
            <div class="card-actions">
              <button type="button" @click.stop="goToDetail(room.id)">Xem chi tiết</button>
            </div>
          </div>
        </article>
      </div>

      <p v-if="filteredRooms.length === 0" class="empty-note">
        Không tìm thấy phòng phù hợp với bộ lọc hiện tại.
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'

const store = useProductStore()
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
  background: radial-gradient(circle at top, #171b25 0%, #08090d 52%, #050507 100%);
  min-height: 100%;
}

.list-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

h1 {
  margin: 0 0 16px;
  color: #eef4ff;
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
  border: 1px solid #2c3649;
  border-radius: 8px;
  padding: 0 10px;
  background: #121722;
  color: #e8efff;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 14px;
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
  color: #eaf1ff;
}

.room-price {
  margin: 6px 0 12px;
  color: #ff9d8d;
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
  background: #990066;
  color: #ffe8f6;
}

@media (prefers-reduced-motion: reduce) {
  .room-card {
    transition: none;
  }

  .room-card:hover {
    transform: none;
  }
}

.empty-note {
  margin-top: 14px;
  color: #a5b2c8;
}

@media (max-width: 900px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
}
</style>