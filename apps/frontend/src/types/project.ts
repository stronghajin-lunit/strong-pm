export type ProjectStatus = 'not_started' | 'planning' | 'active' | 'done'

export type RelatedProduct = 'ODM' | 'Annotation Admin' | 'Annotation Tool'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  epicLink: string
  confluenceLink: string
  relatedProducts: RelatedProduct[]
  background?: string
  hlr?: string
  updatedAt: string
  workflowStep?: number  // 1=Kickoff, 2=PRD, 3=FeatureList, 4=Development, 5=Deployment
}
