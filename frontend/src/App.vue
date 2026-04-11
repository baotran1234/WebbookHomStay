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
<!-- json-server --watch db.json -->
<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #e6ecf8;
  background: radial-gradient(circle at top, #161a24 0%, #0a0b10 55%, #050507 100%);
  min-height: 100vh;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #050507;
  color: #e6ecf8;
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 72px;
}

@media (max-width: 900px) {
  .main-content {
    padding-top: 96px;
  }
}
</style>
