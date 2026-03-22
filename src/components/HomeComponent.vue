<template>
  <section class="products">
    <h2>Sản Phẩm Nổi Bật</h2>
    <div class="product-list">
      <Products v-for="p in store.products" :key="p.id" :product="p" />
      
    </div>
    <!-- phân trang tại đây -->
    <div class="product-pagination" >
      <button class="page-btn">Pre</button>
      <button class="page-btn">hiển thị số trang</button>
      <button class="page-btn">Next</button>
    </div>
  </section>
</template>

<script setup>
import Products from './ProductList.vue';
import { useProductStore } from '../stores/product';
import { onMounted } from 'vue';// vòng đời
const store = useProductStore();
// Dl Sp sec đc lấy từu store và truyền vào
// componnent Products để hiển thị,pinia giúp quản lý dl sp và truyền dl sp giữa các component dễ dàng hơn

onMounted(() => {
  store.fetchProducts();
});

</script>

<style>
.products {
  background: #fff;
  padding: 60px 20px;
  text-align: center;
}
.products h2 {
  font-size: 36px;
  color: #0c2b44;
  margin-bottom: 40px;
}
.product-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 30px;
}
.product-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 18px 0 2px 0;
  gap: 8px;
}
.page-btn {
  background: #fff;
  border: 1px solid #4caf50;
  color: #4caf50;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.18s;
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-info {
  font-size: 1rem;
  color: #333;
  font-weight: 500;
}
</style>