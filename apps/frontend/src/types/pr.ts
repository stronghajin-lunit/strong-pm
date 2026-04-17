export interface PRAuthor {
  login: string
  avatarUrl: string
}

export interface PullRequest {
  id: string
  title: string
  description: string
  repo: string
  date: string
  author: PRAuthor
  linkedProjectId: string | null
}
