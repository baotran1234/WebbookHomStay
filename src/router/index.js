import { createRouter, createWebHistory } from "vue-router";
import HomeComponent from "@/components/HomeComponent.vue";
import ProductList from "@/components/ProductList.vue";
import ProductDetail from "@/components/ProductDetail.vue";
import HoaDonComponent from "@/components/HoaDonComponent.vue";

const routes = [
    {
        path: "/",
        name: "Home",
        component: HomeComponent,
    },
    
    {
        path: "/products",
        name: "Products",
        component: ProductList,
    },
    {
        path: "/product/:id",
        name: "ProductDetail",
        component: ProductDetail,
        props: true,
    },
    {
        path: "/hoadon",
        name: "HoaDon",
        component: HoaDonComponent,
    },
];
// tạo 1 đối tượng ddeeer hiển thi nội dung
const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes,
});

export default router;