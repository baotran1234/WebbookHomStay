<template>
  <section class="detail-page" v-if="store.productid && store.productid.hinh">
    <div class="detail-card">
      <div class="image-box">
        <img :src="getImageUrl(activeImage)" :alt="store.productid.tensp" />
        <div class="extra-gallery">
          <img
            v-for="(img, index) in detailImages"
            :key="`${img}-${index}`"
            :src="getImageUrl(img)"
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
          Khong gian phong thoang mat, day du tien nghi co ban. Hinh anh va thong tin phong ban co
          the cap nhat sau trong du lieu.
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
          <label>Tien ich them:</label>
          <div class="addon-grid">
            <label v-for="t in store.toppings" :key="t.id" class="addon-item">
              <input type="checkbox" :value="t.id" v-model="selectedToppings" />
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
          <button type="button" class="solid" @click="buyNow">Mua ngay</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const store = useProductStore()
const cartStore = useCartStore()

const selectedSize = ref(null)
const selectedToppings = ref([])
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

const getImageUrl = (image) => {
  try {
    return require(`../assets/image/${image}`)
  } catch (error) {
    return ''
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

const toppingsTotal = computed(() => {
  return selectedToppings.value.reduce((sum, toppingId) => {
    const topping = store.toppings.find((t) => String(t.id) === String(toppingId))
    return sum + Number(topping?.price || 0)
  }, 0)
})

const totalPrice = computed(() => {
  const base = Number(store.productid?.gia || 0)
  const sizePrice = Number(currentSize.value?.price || 0)
  const qty = Math.max(1, Number(quantity.value || 1))
  return (base + sizePrice + toppingsTotal.value) * qty
})

const changeQuantity = (delta) => {
  const next = Math.max(1, Number(quantity.value || 1) + delta)
  quantity.value = next
}

const buildCartItem = () => {
  const toppingNames = selectedToppings.value
    .map((toppingId) => {
      const topping = store.toppings.find((t) => String(t.id) === String(toppingId))
      return topping?.tentopping
    })
    .filter(Boolean)

  return {
    id: store.productid.id,
    name: store.productid.tensp,
    image: store.productid.hinh,
    size: currentSize.value?.tensize || 'Tieu chuan',
    toppings: toppingNames,
    price: Number(totalPrice.value) / Math.max(1, Number(quantity.value || 1)),
    quantity: Math.max(1, Number(quantity.value || 1)),
  }
}

const addToCart = () => {
  if (!store.productid) return
  cartStore.addToCart(buildCartItem())
}

const buyNow = () => {
  addToCart()
  router.push({ name: 'Cart' })
}

onMounted(async () => {
  const id = route.params.id
  await Promise.all([store.fetchProductById(id), store.fetchSizes(), store.fetchToppings()])
  selectedImage.value = ''
})
</script>

<style scoped>
.detail-page {
  background: #f3f6fa;
  padding: 24px 20px 40px;
}

.detail-card {
  max-width: 1080px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 26px rgba(16, 38, 59, 0.1);
  padding: 22px;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 20px;
}

.image-box img {
  width: 100%;
  height: 420px;
  object-fit: cover;
  border-radius: 12px;
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
  border-radius: 8px;
  border: 1px solid #d9e2ee;
  cursor: pointer;
}

.extra-gallery img.active {
  border-color: #1b6b60;
  box-shadow: 0 0 0 2px rgba(27, 107, 96, 0.2);
}

.info-box h1 {
  margin-top: 0;
  color: #10263b;
}

.price {
  color: #c8432f;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 8px 0;
}

.desc {
  color: #4d5f73;
}

.selection,
.qty-wrap {
  margin-top: 16px;
}

.selection label,
.qty-wrap label {
  font-weight: 700;
  color: #10263b;
}

.options-row {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid #c6d3e2;
  border-radius: 999px;
  padding: 7px 12px;
  background: #fff;
  cursor: pointer;
}

.chip.active {
  color: #fff;
  border-color: #1b6b60;
  background: #1b6b60;
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

.qty-control {
  margin-top: 8px;
  display: inline-flex;
  border: 1px solid #d0d9e5;
  border-radius: 8px;
  overflow: hidden;
}

.qty-control button {
  width: 36px;
  border: none;
  background: #f2f6fb;
  cursor: pointer;
}

.qty-control input {
  width: 60px;
  border: none;
  text-align: center;
}

.total {
  margin-top: 18px;
  font-size: 1.15rem;
}

.total strong {
  color: #c8432f;
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
  border: 1px solid #1b6b60;
  color: #1b6b60;
  background: #fff;
}

.actions .solid {
  border: none;
  color: #fff;
  background: #1b6b60;
}

@media (max-width: 900px) {
  .detail-card {
    grid-template-columns: 1fr;
  }

  .image-box img {
    height: 280px;
  }
}
</style>
