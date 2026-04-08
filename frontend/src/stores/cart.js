import { defineStore } from 'pinia'

const CART_STORAGE_KEY = 'cart'

const normalizeToppings = (toppings = []) => {
  return [...toppings].map(String).sort()
}

const buildItemKey = (item) => {
  const sizePart = item.size ? String(item.size) : ''
  const toppingsPart = normalizeToppings(item.toppings).join(',')
  const datePart = item.bookingDate ? String(item.bookingDate) : ''
  const startPart = item.startAt ? String(item.startAt) : ''
  const endPart = item.endAt ? String(item.endAt) : ''
  return `${item.id}__${sizePart}__${datePart}__${startPart}__${endPart}__${toppingsPart}`
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    cartItems: [],
  }),

  getters: {
    totalQuantity: (state) =>
      state.cartItems.reduce((total, item) => total + Number(item.quantity || 0), 0),

    totalAmount: (state) =>
      state.cartItems.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0),
  },

  actions: {
    loadFromStorage() {
      const raw = localStorage.getItem(CART_STORAGE_KEY)
      if (!raw) {
        this.cartItems = []
        return
      }

      try {
        const parsed = JSON.parse(raw)
        this.cartItems = Array.isArray(parsed) ? parsed : []
      } catch (error) {
        this.cartItems = []
      }
    },

    saveToStorage() {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.cartItems))
    },

    addToCart(item) {
      const newItem = {
        id: item.id,
        name: item.name,
        image: item.image,
        size: item.size || '',
        bookingDate: item.bookingDate || '',
        startAt: item.startAt || '',
        endAt: item.endAt || '',
        slotLabel: item.slotLabel || '',
        toppings: Array.isArray(item.toppings) ? item.toppings : [],
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
      }

      const key = buildItemKey(newItem)
      const existingIndex = this.cartItems.findIndex((cartItem) => buildItemKey(cartItem) === key)

      if (existingIndex >= 0) {
        this.cartItems[existingIndex].quantity += newItem.quantity
      } else {
        this.cartItems.push(newItem)
      }

      this.saveToStorage()
    },

    updateQuantity(index, quantity) {
      if (!this.cartItems[index]) return

      const nextQty = Number(quantity)
      if (!Number.isFinite(nextQty) || nextQty <= 0) {
        this.removeItem(index)
        return
      }

      this.cartItems[index].quantity = Math.floor(nextQty)
      this.saveToStorage()
    },

    increaseQuantity(index) {
      if (!this.cartItems[index]) return
      this.cartItems[index].quantity += 1
      this.saveToStorage()
    },

    decreaseQuantity(index) {
      if (!this.cartItems[index]) return
      if (this.cartItems[index].quantity <= 1) {
        this.removeItem(index)
        return
      }

      this.cartItems[index].quantity -= 1
      this.saveToStorage()
    },

    removeItem(index) {
      this.cartItems.splice(index, 1)
      this.saveToStorage()
    },

    clearCart() {
      this.cartItems = []
      this.saveToStorage()
    },
  },
})
