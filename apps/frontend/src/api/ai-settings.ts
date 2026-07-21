import type { AiSettingsResponse } from '@/types/settings'

const BASE = '/api/v1/ai-settings'

export async function getAiSettings(): Promise<AiSettingsResponse> {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error('Failed to fetch AI settings')
  return res.json()
}

export async function updateAiSettings(
  settings: Record<string, string>
): Promise<AiSettingsResponse> {
  const res = await fetch(BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  })
  if (!res.ok) throw new Error('Failed to update AI settings')
  return res.json()
}
