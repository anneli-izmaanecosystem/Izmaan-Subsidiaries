export type LeadStage =
  | 'New Lead'
  | 'Contacted'
  | 'Meeting Done'
  | 'Onboarding'
  | 'Implementing'
  | 'Active Client'

export type Priority = 'high' | 'medium' | 'low'
export type LeadType = 'll' | 'sl' | 'kiepersol'

export interface Lead {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  area: string
  stage: LeadStage
  notes: string
  lastContact: string
  priority: Priority
  blocker: string
  type: LeadType
  contacted?: boolean   // kiepersol only
  revenue?: number      // active clients: monthly ZAR revenue
}

export interface KPIEntry {
  id: string
  label: string
  target: number
  actual: number
}

export interface ActionItem {
  id: string
  title: string
  meta: string
  contact?: string
  type: 'overdue' | 'onboarding' | 'sl' | 'kiepersol' | 'followup' | 'new'
  priority: Priority
  accentColor: string
  tag: string
  leadId?: string
  pipeline?: LeadType
}
