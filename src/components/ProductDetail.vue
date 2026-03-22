<template>
  <div class="product-detail" v-if="store.productid && store.productid.hinh">
    <div class="detail-content">
      <div class="image-box">
        <img 
          :src="require(`../assets/image/${store.productid.hinh}`)"
          alt=""
        />
      </div>
      <div class="info-box">
        <h1 class="product-title">{{ store.productid.tensp }}</h1>
        <p class="price">Tổng giá: {{ store.productid.gia }}</p>
        <div class="size-select">
          <label>Chọn size:</label>
          <div class="size-btn-group">
            <button
              v-for="s in store.sizes" :key="s.id"
              :class="['size-btn',{active:Number(selectedSize) === Number(s.id)}]"
              @click="selectedSize = s.id"
              type="button"
            >
            {{ s.tensize }} (+{{ s.price }})
            </button>
          </div>
        </div>
        <div class="topping-select">
          <label>Chọn topping:</label>
          <div class="topping-list">
            <label
              v-for="t in store.toppings" :key="t.id"
              class="topping-item"
            >
              <input
                type="checkbox" 
                :value="t.id"
                v-model="selectedToppings"
              />
            {{ t.tentopping }} (+{{ t.price }})
            </label>
          </div>
        </div>
        <button class="add-cart-btn" @click="addToCart">
          Thêm vào giỏ hàng
        </button>
      </div>
    </div>
  </div>
  <!-- <div v-elese>
    <p>Không tìm thấy sản phẩm.</p>
  </div> -->
</template>

<script setup>
import { ref,onMounted } from 'vue'
import { useProductStore } from '@/stores/product'
import { useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'



const route = useRoute()
const store = useProductStore()
const cartStore = useCartStore()
const selectedSize = ref(null)
const selectedToppings = ref([])
const addToCart = () => {
  if (!store.productid) return

  const firstSize = store.sizes[0]
  const sizeId = selectedSize.value || firstSize?.id
  const selectedSizeObj =
    store.sizes.find((s) => String(s.id) === String(sizeId)) || firstSize

  const baseprice = Number(store.productid.gia || 0)
  const sizePrice = Number(selectedSizeObj?.price || 0)
  const toppingsPrice = selectedToppings.value.reduce((total, toppingId) => {
    const topping = store.toppings.find((t) => String(t.id) === String(toppingId))
    return total + Number(topping?.price || 0)
  }, 0)

  const totalPrice = baseprice + sizePrice + toppingsPrice

  const cartItem = {
    id: store.productid.id,
    name: store.productid.tensp,
    image: store.productid.hinh,
    size: selectedSizeObj?.tensize || '',
    toppings: selectedToppings.value
      .map((toppingId) => {
        const topping = store.toppings.find((t) => String(t.id) === String(toppingId))
        return topping?.tentopping
      })
      .filter(Boolean),
    price: totalPrice,
    quantity: 1,
  }

  cartStore.addToCart(cartItem)
  };
onMounted(async () => {
  // Lấy id sản phẩm từ route
  const id = route.params.id
  // Gọi API để lấy chi tiết sản phẩm theo id
  // Nếu có dữ liệu thì hiển thị, nếu không có thì hiển thị thông báo không tìm thấy sản phẩm
  await Promise.all([
    store.fetchProductById(id),
    store.fetchSizes(),
    store.fetchToppings()
    // gọi API lấy chi tiết sản phẩm
    // gọi API lấy danh sách size và giá theo id sản phẩm
    // gọi API lấy danh sách topping và giá theo id sản phẩm
    
  ])
})
</script>

<style scoped>
.product-detail {
  width: 100%;
  max-width: 900px;
  margin: 40px auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  padding: 40px 32px;
}
.detail-content {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}
.image-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-box img {
  width: 320px;
  height: 320px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.info-box {
  flex: 2;
  text-align: left;
}
.product-title {
  font-size: 2.2rem;
  color: #0c2b44;
  margin-bottom: 18px;
}
.price {
  font-size: 1.3rem;
  color: #b30404;
  margin-bottom: 18px;
}
.size-select,
.topping-select {
  margin-bottom: 22px;
}
.size-btn-group {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
.size-btn {
  padding: 8px 18px;
  border: 1px solid #b30404;
  background: #fff;
  color: #b30404;
  border-radius: 20px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s, color 0.2s;
}
.size-btn.active,
.size-btn:hover {
  background: #b30404;
  color: #fff;
}
.topping-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  margin-top: 8px;
}
.topping-item {
  font-size: 1rem;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
}
.add-cart-btn {
  margin-top: 28px;
  padding: 12px 32px;
  background: #0c2b44;
  color: #fff;
  border: none;
  border-radius: 24px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.add-cart-btn:hover {
  background: #b30404;
}
</style>
