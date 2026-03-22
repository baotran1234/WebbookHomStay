// tọa ra kho Dl để lưu trữ dữ liệu sản phẩm
import { defineStore } from "pinia";
import { APIURL } from "../Constraint.js";
import axios from "axios";
export const useProductStore = defineStore("product", {
    state: () => ({
        products: [],
        productid:null,
        sizes:[],
        toppings:[],
        error: null
    }),
    actions: {
        // lấy dữ liệu sản phẩm từ json server
        /* cú pháp:
        async tên_hàm() {
            try {
                const response = await axios.get(`${APIURL}/products`);
                this.products = response.data;
    }         catch (error) {
                console.error("Lỗi khi lấy dữ liệu sản phẩm:", error);
        */
        async fetchProducts() {// lấy product đó ra
            try {
                const response = await axios.get(`${APIURL}/products`);//resonse là trả về dữ liệu từ json server, lấy dữ liệu từ APIURL/products
                this.products = response.data;
            } catch (error) {
                this.error = "Lỗi khi lấy dữ liệu sản phẩm";
                console.error("Lỗi khi lấy dữ liệu sản phẩm:", this.error);
            }
        },
        //phương thức ì trả về sản phẩm theo id
        async fetchProductById(id) {
            try {
                const response = await axios.get(`${APIURL}/products/${id}`);
                this.productid = response.data;
            } catch (error) {
                this.error = "Lỗi khi lấy dữ liệu sản phẩm theo ID";
                console.error("Lỗi khi lấy dữ liệu sản phẩm theo ID:", this.error);
            }

        },
        async fetchSizes() {// lấy product đó ra
            try {
                const response = await axios.get(`${APIURL}/sizes`);//resonse là trả về dữ liệu từ json server, lấy dữ liệu từ APIURL/products
                this.sizes = response.data;
            } catch (error) {
                this.error = "Lỗi khi lấy dữ liệu size";
                console.error("Lỗi khi lấy dữ liệu size:", this.error);
            }
        },
        //phương thức ì trả về sản phẩm theo id
        async fetchToppings() {
            try {
                const response = await axios.get(`${APIURL}/toppings`);
                this.toppings = response.data;
            } catch (error) {
                this.error = "Lỗi khi lấy dữ liệu topping";
                console.error("Lỗi khi lấy dữ liệu topping:", this.error);
            }

        }
    }
    
    
});
