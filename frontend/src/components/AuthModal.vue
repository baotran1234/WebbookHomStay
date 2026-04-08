<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <button type="button" class="close" @click="emit('close')">x</button>

      <template v-if="showAdminChoice">
        <h3 class="choice-title">Đăng nhập quản trị thành công</h3>
        <p class="choice-sub">Bạn muốn đi tới trang nào?</p>
        <div class="choice-actions">
          <button type="button" class="submit" @click="finishAdminLogin('/admin')">Vào trang Admin</button>
          <button type="button" class="secondary" @click="finishAdminLogin('/')">Về trang chủ</button>
        </div>
      </template>

      <template v-else>
        <div class="tab-row">
          <button type="button" :class="{ active: tab === 'login' }" @click="tab = 'login'">Đăng nhập</button>
          <button type="button" :class="{ active: tab === 'register' }" @click="tab = 'register'">Đăng ký</button>
        </div>

        <p v-if="message" :class="['message', messageType]">{{ message }}</p>

        <form v-if="tab === 'login'" class="form" @submit.prevent="submitLogin">
          <label>
            Tên đăng nhập / Gmail / SĐT
            <input v-model.trim="loginForm.identifier" type="text" placeholder="Nhập username hoặc gmail hoặc số điện thoại" required />
          </label>
          <label>
            Mật khẩu
            <input v-model="loginForm.password" type="password" placeholder="Nhập mật khẩu" required />
          </label>
          <label class="checkbox">
            <input v-model="loginForm.adminOnly" type="checkbox" />
            Đăng nhập với quyền quản trị
          </label>
          <button type="submit" class="submit" :disabled="auth.loading">
            {{ auth.loading ? 'Đang xử lý...' : 'Đăng nhập' }}
          </button>
        </form>

        <form v-else class="form" @submit.prevent="submitRegister">
          <label>
            Tên đăng nhập
            <input v-model.trim="registerForm.username" type="text" placeholder="Ví dụ: nguyenvana" required />
          </label>
          <label>
            Họ và tên
            <input v-model.trim="registerForm.fullName" type="text" placeholder="Nhập họ tên" required />
          </label>
          <label>
            Gmail
            <input v-model.trim="registerForm.email" type="email" placeholder="abc@gmail.com" required />
          </label>
          <label>
            Số điện thoại
            <input v-model.trim="registerForm.phone" type="tel" placeholder="Chỉ nhập số (9-11 số)" required />
          </label>
          <label>
            Địa chỉ nhà
            <input v-model.trim="registerForm.address" type="text" placeholder="Nhập địa chỉ nhà" required />
          </label>
          <label>
            Mật khẩu
            <input v-model="registerForm.password" type="password" placeholder="Tối thiểu 8 ký tự, gồm hoa-thường-số-ký tự đặc biệt" required />
          </label>
          <label>
            Nhập lại mật khẩu
            <input v-model="registerForm.confirmPassword" type="password" placeholder="Nhập lại mật khẩu" required />
          </label>
          <button type="submit" class="submit" :disabled="auth.loading">
            {{ auth.loading ? 'Đang xử lý...' : 'Tạo tài khoản' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  initialTab: {
    type: String,
    default: 'login',
  },
  initialAdminOnly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'success'])

const auth = useAuthStore()
const tab = ref(props.initialTab === 'register' ? 'register' : 'login')
const message = ref('')
const messageType = ref('error')
const showAdminChoice = ref(false)

const loginForm = reactive({
  identifier: '',
  password: '',
  adminOnly: false,
})

const registerForm = reactive({
  username: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  confirmPassword: '',
})

const resetMessage = () => {
  message.value = ''
  messageType.value = 'error'
}

const finishAdminLogin = (targetRoute) => {
  emit('success', {
    user: auth.user,
    targetRoute,
  })
  emit('close')
}

const submitLogin = async () => {
  resetMessage()
  try {
    const user = await auth.login({
      identifier: loginForm.identifier,
      password: loginForm.password,
      adminOnly: loginForm.adminOnly,
    })

    if (String(user?.role || '').toLowerCase() === 'admin') {
      showAdminChoice.value = true
      return
    }

    emit('success', { user, targetRoute: '/' })
    emit('close')
  } catch (error) {
    messageType.value = 'error'
    message.value = error?.message || 'Đăng nhập thất bại.'
  }
}

const submitRegister = async () => {
  resetMessage()
  const phoneDigits = String(registerForm.phone || '').replace(/\D/g, '')
  if (phoneDigits.length < 9 || phoneDigits.length > 11) {
    message.value = 'Số điện thoại phải từ 9 đến 11 số.'
    return
  }

  if (!/^[^\s@]+@gmail\.com$/i.test(registerForm.email)) {
    message.value = 'Gmail phải có dạng ...@gmail.com.'
    return
  }

  if (registerForm.password !== registerForm.confirmPassword) {
    message.value = 'Mật khẩu nhập lại không khớp.'
    return
  }

  try {
    await auth.register({
      username: registerForm.username,
      fullName: registerForm.fullName,
      email: registerForm.email,
      phone: phoneDigits,
      address: registerForm.address,
      password: registerForm.password,
    })
    messageType.value = 'success'
    message.value = 'Đăng ký thành công. Bạn hãy đăng nhập để tiếp tục.'
    tab.value = 'login'
    loginForm.identifier = registerForm.username
    loginForm.password = ''
  } catch (error) {
    messageType.value = 'error'
    message.value = error?.message || 'Đăng ký thất bại.'
  }
}

onMounted(() => {
  loginForm.adminOnly = Boolean(props.initialAdminOnly)
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  display: grid;
  place-items: center;
  padding: 18px;
  z-index: 1200;
}

.modal {
  width: min(560px, 100%);
  background: #101722;
  border: 1px solid #2c3a52;
  border-radius: 14px;
  padding: 16px;
  position: relative;
}

.close {
  position: absolute;
  right: 10px;
  top: 10px;
  border: 1px solid #41506a;
  border-radius: 8px;
  background: #141f2d;
  color: #e8efff;
  width: 28px;
  height: 28px;
  cursor: pointer;
}

.choice-title {
  margin: 8px 0;
}

.choice-sub {
  margin: 0 0 12px;
  color: #c6d3eb;
}

.choice-actions {
  display: grid;
  gap: 8px;
}

.secondary {
  height: 40px;
  border: 1px solid #3f4f6a;
  border-radius: 8px;
  background: #162030;
  color: #e1eaff;
  font-weight: 700;
  cursor: pointer;
}

.tab-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tab-row button {
  border: 1px solid #33435e;
  border-radius: 8px;
  padding: 8px 10px;
  background: #121c2a;
  color: #dce7ff;
  cursor: pointer;
}

.tab-row button.active {
  background: #214d89;
  border-color: #2e66b0;
}

.form {
  display: grid;
  gap: 10px;
}

.form label {
  display: grid;
  gap: 6px;
  color: #d2def4;
  font-size: 14px;
}

.form input {
  height: 38px;
  border: 1px solid #32425d;
  border-radius: 8px;
  background: #0e1520;
  color: #eaf2ff;
  padding: 0 10px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox input {
  width: 16px;
  height: 16px;
}

.submit {
  margin-top: 4px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #990066;
  color: #ffe8f6;
  font-weight: 700;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.message {
  margin: 0 0 10px;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
}

.message.error {
  background: #3a1c20;
  border: 1px solid #af4f5b;
  color: #ffd9de;
}

.message.success {
  background: #183523;
  border: 1px solid #409164;
  color: #ddffe9;
}
</style>
