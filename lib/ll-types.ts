export type LeadStage =
  | 'New Lead'
  | 'Contacted'
  | 'Meeting Done'
  | 'Onboarding'
  | 'Implementing'
  | 'Active Client'
  | 'Churned'

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
  churnReason?: string  // churned leads only
}

export interface KPIEntry {
  id: string
  label: string
  target: number
  actual: number
}

export type SLOnboardingStage = 'info-requested' | 'info-received' | 'setup' | 'onboarded'

export interface SLAdmin {
  id: string
  name: string
  email: string
  phone: string
  subDistrict: string
}

export interface SLOnboardingRecord {
  id: string
  orgName: string
  district: string
  contactName: string
  contactPhone: string
  stage: SLOnboardingStage
  admins: SLAdmin[]
  notes: string
  createdAt: string
  updatedAt: string
  leadId?: string  // linked SL pipeline lead
}

export type LLOnboardingStage =
  | 'info-requested'
  | 'info-received'
  | 'technical-setup'
  | 'review'
  | 'ready'

export interface LLOnboardingRecord {
  id: string
  farmName: string
  area: string
  contactName: string
  contactPhone: string
  contactEmail: string
  billingAddress: string
  pinLocation: string
  staffCount: number
  csvReceived: boolean
  stage: LLOnboardingStage
  activeClientConfirmed?: boolean
  notes: string
  createdAt: string
  updatedAt: string
  leadId?: string
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

export type InteractionOutcome =
  | 'responded'
  | 'no-response'
  | 'follow-up'
  | 'wrong-number'

export interface WAInteraction {
  id: string
  leadId: string
  timestamp: number
  templateId?: string
  templateLabel?: string
  text: string
  outcome: InteractionOutcome
  notes: string
}
