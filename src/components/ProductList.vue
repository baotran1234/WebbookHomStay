<template>
  <div class="product" @click="gotoDetail" >
    <img :src="require(`@/assets/image/${props.product.hinh}`)" alt="" />
    <h3>{{ props.product.tensp }}</h3>
  </div>
  <!-- <div >
    <span>Sản phẩm không hợp lệ</span>
  </div> -->

</template>

<script setup>
// component này sẽ nhận dl sp từ component HomeComponent để hiển thị
// tạo props để nhận dl sp từ component HomeComponent
import { defineProps } from 'vue'
import { useRouter } from 'vue-router'
const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
})
const router= useRouter()
// thực hiện phương thức chuyển hướng đến trang chi tiết sản phẩm khi click vào sản phẩm
const gotoDetail = () => {
  // chuyển hướng đến trang chi tiết sản phẩm với id của sản phẩm
  router.push({ name: 'ProductDetail', params: { id: props.product.id } })
}


</script>

<style scoped>

.product {
  background: #f5f2ed;
  padding: 20px;
  width: 220px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  text-align: center;
}
.product:hover {
  transform: translateY(-10px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
.product h3 {
  margin-top: 15px;
  font-size: 18px;
  color: #333;
}
.product::after {
  content: "Mua";
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: rgba(179, 4, 4, 0.7);
  color: #fff;
  padding: 5px 15px;
  border-radius: 20px;
  opacity: 0;
  transition: opacity 0.4s, transform 0.4s;
}
.product:hover::after {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.product img{
  width: 100px;
  height: 100px;
}
</style>
