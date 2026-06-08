const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export interface ProductOption {
  id: number
  name: string
}

export async function fetchProducts(): Promise<ProductOption[]> {
  const res = await fetch(`${BASE_URL}/api/v1/products`)
  if (!res.ok) return []
  const data = await res.json()
  return data.products as ProductOption[]
}
