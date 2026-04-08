<template>
  <h2>Hiển thị biến Count:{{ counterStore.count }}</h2>
  <h2> hiển thị double Count:{{ counterStore.doubleCount }}</h2>
    <button @click="counterStore.increment()"> tăng Count</button>
    <button @click="counterStore.decrement()"> giảm Count</button>
</template>

<script setup >
// muốn sài store nòa thì imort đó
import { useCounterStore } from "@/stores/counterStore.js";
const counterStore = useCounterStore();

</script>

<style>

</style>