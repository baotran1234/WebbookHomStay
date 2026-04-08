// tạo kho lưu trữ
import { defineStore } from "pinia";
export const useCounterStore = defineStore("counter", { // tên của kho lưu trữ là  useCounterStore
    // trạng thái của kho lưu trữ(khai cáo thuốc tính)
    // functiion trả về object
  state: () => ({
    count: 0,
    }),
    // hành động để thay đổi trạng thái, giống như methods trong Vue component
    
    actions: {
        increment() {
            this.count++;
        },
        decrement() {
            this.count--;
        }
    },
    // getters để tính toán giá trị dựa trên trạng thái, giống như computed trong Vue component
    getters: {
        doubleCount: (state) => state.count * 2,
    },
});