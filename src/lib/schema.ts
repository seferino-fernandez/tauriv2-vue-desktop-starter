export interface Response<T> {
  success: boolean
  data?: T
  error?: string
}
