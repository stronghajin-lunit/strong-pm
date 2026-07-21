export interface ProductOption {
  id: number
  name: string
}

export async function fetchProducts(): Promise<ProductOption[]> {
  const res = await fetch('/api/v1/products')
  if (!res.ok) return []
  const data = await res.json()
  return data.products as ProductOption[]
}
