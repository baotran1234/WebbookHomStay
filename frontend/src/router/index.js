import { createRouter, createWebHistory } from "vue-router";
import HomeComponent from "@/components/HomeComponent.vue";
import ProductList from "@/components/ProductList.vue";
import ProductDetail from "@/components/ProductDetail.vue";
import HoaDonComponent from "@/components/HoaDonComponent.vue";
import PaymentPage from "@/components/PaymentPage.vue";
import PaymentSuccess from "@/components/PaymentSuccess.vue";
import AdminDashboard from "@/components/AdminDashboard.vue";
import BookedRooms from "@/components/BookedRooms.vue";

const routes = [
    {
        path: "/",
        name: "Home",
        component: HomeComponent,
    },
    
    {
        path: "/products",
        name: "ProductList",
        component: ProductList,
    },
    {
        path: "/product/:id",
        name: "ProductDetail",
        component: ProductDetail,
        props: true,
    },
    {
        path: "/cart",
        name: "Cart",
        component: HoaDonComponent,
    },
    {
        path: "/hoadon",
        name: "HoaDon",
        component: HoaDonComponent,
    },
    {
        path: "/payment",
        name: "Payment",
        component: PaymentPage,
    },
    {
        path: "/payment-success",
        name: "PaymentSuccess",
        component: PaymentSuccess,
    },
    {
        path: "/booked-rooms",
        name: "BookedRooms",
        component: BookedRooms,
    },
    {
        path: "/admin",
        name: "AdminDashboard",
        component: AdminDashboard,
    },
];
// tạo 1 đối tượng ddeeer hiển thi nội dung
const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes,
});

export default router;
