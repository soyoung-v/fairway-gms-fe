import { defineStore } from 'pinia'
import { ref } from 'vue'
import cartApi from '@/api/cartApi'

export const useCartStore = defineStore('cart', () => {
  const carts   = ref([])
  const loading = ref(false)
  const error   = ref('')

  // 카트 목록을 불러온다
  async function fetchCarts(golfCourseId) {
    loading.value = true
    error.value   = ''
    try {
      const data   = await cartApi.getCarts(golfCourseId)
      carts.value  = Array.isArray(data) ? data : []
    } catch {
      error.value = '카트 목록을 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }

  // 카트를 등록하고 목록에 추가한다
  async function addCart(golfCourseId, payload) {
    const created = await cartApi.createCart(golfCourseId, payload)
    carts.value   = [...carts.value, created]
    return created
  }

  // 카트 정보를 수정하고 목록에 반영한다
  async function editCart(cartId, payload) {
    const updated = await cartApi.updateCart(cartId, payload)
    _sync(cartId, updated)
    return updated
  }

  // 카트 상태를 변경하고 목록에 반영한다
  async function changeCartStatus(cartId, status) {
    const updated = await cartApi.updateCartStatus(cartId, status)
    _sync(cartId, updated)
    return updated
  }

  // 로컬 목록의 카트 항목을 갱신한다
  function _sync(cartId, updated) {
    const idx = carts.value.findIndex(c => c.cartId === cartId)
    if (idx !== -1) carts.value[idx] = updated
  }

  function $reset() {
    carts.value   = []
    loading.value = false
    error.value   = ''
  }

  return { carts, loading, error, fetchCarts, addCart, editCart, changeCartStatus, $reset }
})
