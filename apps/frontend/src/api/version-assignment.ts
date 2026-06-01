import type { JiraTicket, JiraVersion } from '@/types/version-assignment'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body?.detail?.code ?? res.statusText), {
      status: res.status,
      body,
    })
  }
  return res.json() as Promise<T>
}

interface ApiVersion {
  id: string
  name: string
  release_date: string | null
}

interface ApiTicket {
  id: string
  summary: string
  status: string
  epic_id: string | null
  epic_name: string | null
}

export async function fetchVersionOptions(): Promise<JiraVersion[]> {
  const data = await apiFetch<{ versions: ApiVersion[] }>('/api/v1/version-assignment/versions')
  return data.versions.map((v) => ({
    id: v.id,
    name: v.name,
    releaseDate: v.release_date ?? '',
  }))
}

export async function fetchUnversionedTickets(period: string): Promise<JiraTicket[]> {
  const data = await apiFetch<{ tickets: ApiTicket[] }>(
    `/api/v1/version-assignment/tickets?period=${encodeURIComponent(period)}`,
  )
  return data.tickets.map((t) => ({
    id: t.id,
    summary: t.summary,
    epicId: t.epic_id,
    epicName: t.epic_name,
    status: t.status as JiraTicket['status'],
    currentVersion: null,
  }))
}

export async function assignVersion(
  ticketIds: string[],
  versionId: string,
): Promise<{ succeeded: string[]; failed: string[] }> {
  return apiFetch('/api/v1/version-assignment/assign', {
    method: 'POST',
    body: JSON.stringify({ ticket_ids: ticketIds, version_id: versionId }),
  })
}
