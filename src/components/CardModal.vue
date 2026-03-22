<template>
  <div v-if="props.show" class="cart-modal-overlay" @click.self="close">
    <div class="cart-modal">
      <h2>Giỏ hàng</h2>
      <div v-if="props.carItems.length===0" >Giỏ hàng trống</div>
      <div v-else>
        <div v-for="item in props.carItems" :key="item.id" class="cart-item">
          <img v-if="item.image" :src="require(`@/assets/image/${item.image}`)" alt="Hình món" class="cart-item-img" />
          <div class="cart-item-info">
            <div class="cart-item-name">{{item.name}}</div>
            <div class="cart-item-size">Size: {{item.size.namesize}}</div>
            <div class="cart-item-qty">
              <button @click="decreaseQty(item)" >-</button>
              <span>{{item.quantity}}</span>
              <button @click="increaseQty(item)">+</button>{{item.price}}
            </div>
          </div>
          <button class="cart-item-remove" @click="removeItem(item)" >Xóa</button>
        </div>
        <div class="cart-total">
          <span>Tổng tiền:</span>
          <span class="cart-total-value">{{totalprice}} đ</span>
        </div>
      </div>
      <button class="cart-modal-close" @click="close" >Đóng</button>
      <button v-if="props.carItems.length" class="cart-modal-pay" @click="showBill=true">Thanh Toán</button>
    </div>
    <HoaDonComponent v-if="showBill" :cartItems="props.carItems" @close="onHoaDonClose" />
  </div>
</template>

<script setup>
import HoaDonComponent from './HoaDonComponent.vue'
import {defineProps,computed, ref} from 'vue'
import {defineEmits} from 'vue'


// khai báo biến hiển thị hoadon, ban đầu ko có hóa đơn
const showBill=ref(false)
// con nhận dữ liệu từ cha truyền qua thì dùng prop
// con ko đc quyền sửa dữ liệu mà thông báo cho cha $emit
const props=defineProps({
  show:{
    type:Boolean,
    default:false
  },
  carItems:{
    type:Array,
    required:true
  }
});
// con truyền tính hiệu là muốn đóng cho cha
// con truyền tính hiệu là muốn thay đổi số lượng cho cha
// số lượng trong giỏ hàng
// cha sẽ làm
const emit=defineEmits(["close","update:carItems"])
function close()
{
  emit('close')
}
const totalprice=computed(()=>{
  return props.carItems.reduce((total,item)=>{
    return total+(item.price*item.quantity)
  },0)
})
function decreaseQty(item)
{
  if(item.quantity>1)
  {
    item.quantity--;
    //emit(tentruyendi,data)
    emit("update:carItems",[...props.carItems]);
  }
  else{
    // viết pt remove
    removeItem(item)
  }
}
function increaseQty(item)
{
  item.quantity++;
  emit("update:carItems",[...props.carItems])
}
function removeItem(item)
{
  const idx=props.carItems.findIndex(i=>{
    // so sanh id
    if(i.id!==item.id)return false;
    // so sánh về size
    // toán tử tùy chọn?.: nó đảm bảo thuộc tinh ko bị bull hoặc undefined
    // Kiểm tra xem thuộc tính size của đối tượng i có tồn tại và khác null hay không
    //Nếu i.size là null hoặc undefined, toàn bộ biểu thức i.size?.id trả về undefined thay vì lỗi
    if(i.size?.idsize!==item.size?.idsize)return false;
    // if(i.size.id!== item.size.id)
    // so sánh tới topping
    if(i.topping?.length !==item.topping?.length) return false
    if(i.topping&& item.topping)
    {
      const itopping=i.topping.map(t=>t.id).sort();
      const itemtopping=item.topping.map(t=>t.id).sort();
      if(JSON.stringify(itopping)!==JSON.stringify(itemtopping)) return false
    }
    return true;
  })
  if(idx!==-1)
  {
    const newItems=[...props.carItems];
    newItems.splice(idx,1);
    emit("update:carItems",newItems)
  }
}
function onHoaDonClose()
{
  showBill.value=false
  close();
}
</script>

<style scoped>
.cart-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.cart-modal {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  min-width: 350px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
}
.cart-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}
.cart-item-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  margin-right: 12px;
}
.cart-item-info {
  flex: 1;
}
.cart-item-name {
  font-weight: bold;
}
.cart-item-size {
  font-size: 13px;
  color: #888;
}
.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.cart-item-qty button {
  width: 24px;
  height: 24px;
  border: none;
  background: #eee;
  border-radius: 4px;
  cursor: pointer;
}
.cart-item-remove {
  background: #ff4d4f;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  margin-left: 8px;
}
.cart-modal-close {
  margin-top: 16px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
}
.cart-total {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
  margin-top: 18px;
  gap: 10px;
}
.cart-total-value {
  color: #b30404;
  font-size: 20px;
}
.cart-modal-pay{
  background: #4caf50;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.cart-modal-pay:hover{
  background:#4caf50;
}
</style>
