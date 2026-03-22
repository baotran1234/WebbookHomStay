<template>
  <div class="app-layout">
    <HeaderCom />
    <main class="main-content">
      <router-view />
    </main>
    
    <FooterCom />
   
  </div>
</template>

<script>
import HeaderCom from "./components/HeaderCom.vue";


import FooterCom from "./components/FooterCom.vue";


export default {
  name: 'App',
  components: {
    HeaderCom,
    
   
    FooterCom,
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}
</style>
