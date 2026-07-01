import { redis } from './redis'
import type { Lead, KPIEntry, SLOnboardingRecord, LLOnboardingRecord, WAInteraction } from './ll-types'
import { TEMPLATES, type Template } from './ll-templates'

// ─── Redis keys ───────────────────────────────────────────────────────────────
const KEYS = {
  ll:      'll:leads:ll',
  sl:      'll:leads:sl',
  kp:      'll:leads:kiepersol',
  kpis:    (m: string) => `ll:kpis:${m}`,
  checked: 'll:action-checked',
  seeded:  'll:seeded',
}

function leadKey(type: 'll' | 'sl' | 'kiepersol') {
  return type === 'll' ? KEYS.ll : type === 'sl' ? KEYS.sl : KEYS.kp
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function getLeads(type: 'll' | 'sl' | 'kiepersol'): Promise<Lead[]> {
  return (await redis.get<Lead[]>(leadKey(type))) ?? []
}

export async function setLeads(type: 'll' | 'sl' | 'kiepersol', leads: Lead[]): Promise<void> {
  await redis.set(leadKey(type), leads)
}

export async function updateLead(
  type: 'll' | 'sl' | 'kiepersol',
  id: string,
  updates: Partial<Lead>,
): Promise<Lead | null> {
  const leads = await getLeads(type)
  const i = leads.findIndex(l => l.id === id)
  if (i === -1) return null
  leads[i] = { ...leads[i], ...updates }
  await setLeads(type, leads)
  return leads[i]
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
export async function getKPIs(month: string): Promise<KPIEntry[]> {
  return (await redis.get<KPIEntry[]>(KEYS.kpis(month))) ?? []
}

export async function setKPIs(month: string, kpis: KPIEntry[]): Promise<void> {
  await redis.set(KEYS.kpis(month), kpis)
}

export async function updateKPIActual(month: string, id: string, actual: number): Promise<void> {
  const kpis = await getKPIs(month)
  const i = kpis.findIndex(k => k.id === id)
  if (i !== -1) { kpis[i].actual = actual; await setKPIs(month, kpis) }
}

// ─── Action checked state ─────────────────────────────────────────────────────
export async function getActionChecked(): Promise<Record<string, boolean>> {
  return (await redis.get<Record<string, boolean>>(KEYS.checked)) ?? {}
}

export async function toggleActionChecked(id: string): Promise<boolean> {
  const checked = await getActionChecked()
  checked[id] = !checked[id]
  await redis.set(KEYS.checked, checked)
  return !!checked[id]
}

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES_KEY = 'll:templates'

export async function getTemplates(): Promise<Template[]> {
  const stored = await redis.get<Template[]>(TEMPLATES_KEY)
  if (stored && stored.length > 0) return stored
  await redis.set(TEMPLATES_KEY, TEMPLATES)
  return TEMPLATES
}

export async function setTemplates(templates: Template[]): Promise<void> {
  await redis.set(TEMPLATES_KEY, templates)
}

export async function upsertTemplate(template: Template): Promise<void> {
  const templates = await getTemplates()
  const i = templates.findIndex(t => t.id === template.id)
  if (i === -1) templates.push(template)
  else templates[i] = template
  await setTemplates(templates)
}

export async function deleteTemplate(id: string): Promise<void> {
  const templates = await getTemplates()
  await setTemplates(templates.filter(t => t.id !== id))
}

// ─── Interaction logs ─────────────────────────────────────────────────────────
function interactionKey(leadId: string) { return `ll:interactions:${leadId}` }

export async function getInteractions(leadId: string): Promise<WAInteraction[]> {
  return (await redis.get<WAInteraction[]>(interactionKey(leadId))) ?? []
}

export async function addInteraction(entry: WAInteraction): Promise<void> {
  const existing = await getInteractions(entry.leadId)
  await redis.set(interactionKey(entry.leadId), [entry, ...existing])
}

// ─── Move lead across pipelines ───────────────────────────────────────────────
export async function moveLead(
  fromType: 'll' | 'sl' | 'kiepersol',
  toType:   'll' | 'sl' | 'kiepersol',
  id: string,
  extraUpdates: Partial<Lead> = {},
): Promise<Lead | null> {
  const from = await getLeads(fromType)
  const i = from.findIndex(l => l.id === id)
  if (i === -1) return null

  const lead: Lead = { ...from[i], ...extraUpdates, type: toType }
  await setLeads(fromType, from.filter(l => l.id !== id))
  await setLeads(toType, [...(await getLeads(toType)), lead])
  return lead
}

// ─── SafeLink Onboarding ──────────────────────────────────────────────────────
const OB_KEY = 'sl:onboarding'

export async function getOnboardingRecords(): Promise<SLOnboardingRecord[]> {
  return (await redis.get<SLOnboardingRecord[]>(OB_KEY)) ?? []
}

export async function upsertOnboardingRecord(record: SLOnboardingRecord): Promise<void> {
  const records = await getOnboardingRecords()
  const i = records.findIndex(r => r.id === record.id)
  if (i === -1) records.push(record)
  else records[i] = record
  await redis.set(OB_KEY, records)
}

export async function deleteOnboardingRecord(id: string): Promise<void> {
  const records = await getOnboardingRecords()
  await redis.set(OB_KEY, records.filter(r => r.id !== id))
}

// ─── Labour Link Onboarding ───────────────────────────────────────────────────
const LL_OB_KEY = 'll:onboarding'

export async function getLLOnboardingRecords(): Promise<LLOnboardingRecord[]> {
  return (await redis.get<LLOnboardingRecord[]>(LL_OB_KEY)) ?? []
}

export async function upsertLLOnboardingRecord(record: LLOnboardingRecord): Promise<void> {
  const records = await getLLOnboardingRecords()
  const i = records.findIndex(r => r.id === record.id)
  if (i === -1) records.push(record)
  else records[i] = record
  await redis.set(LL_OB_KEY, records)
}

export async function deleteLLOnboardingRecord(id: string): Promise<void> {
  const records = await getLLOnboardingRecords()
  await redis.set(LL_OB_KEY, records.filter(r => r.id !== id))
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
export async function isSeeded(): Promise<boolean> {
  return !!(await redis.get(KEYS.seeded))
}

export async function seedAll(): Promise<void> {
  const month = new Date().toISOString().slice(0, 7)
  await Promise.all([
    redis.set(KEYS.ll, SEED_LL),
    redis.set(KEYS.sl, SEED_SL),
    redis.set(KEYS.kp, SEED_KIEPERSOL),
    redis.set(KEYS.kpis(month), SEED_KPIS),
    redis.set(KEYS.checked, {}),
    redis.set(KEYS.seeded, '1'),
  ])
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_LL: Lead[] = [
  { id:'ll1',  name:'PM Boerdery',              contact:'Wayne du Toit',       phone:'0834682329', email:'wayne@pmboerdery.co.za',       area:'Limpopo',       stage:'Meeting Done', notes:'Intro meeting complete. Unable to confirm onboarding date.',          lastContact:'2024-02-09', priority:'high',   blocker:'Cannot confirm onboarding date',       type:'ll' },
  { id:'ll2',  name:'Evelyn Game Ranch',        contact:'Dr Quintis Richter',  phone:'0827725150', email:'quintis@evelyngameranch.com',  area:'Limpopo',       stage:'Onboarding',   notes:'3/6 employees onboarded. Pending ID documents. Small farm.',          lastContact:'2025-06-01', priority:'high',   blocker:'Pending ID documents',                 type:'ll' },
  { id:'ll3',  name:'Mapesu Private Game Reserve', contact:'Quinten Knipping', phone:'0783316896', email:'hr@mapesu.com',               area:'Limpopo',       stage:'Meeting Done', notes:'HR discharged — pending appointment of new HR.',                      lastContact:'2025-01-01', priority:'high',   blocker:'New HR not yet appointed',             type:'ll' },
  { id:'ll4',  name:'Mopani Bush Lodge',        contact:'Quinten Knipping',    phone:'0783316896', email:'hr@mapesu.com',               area:'Limpopo',       stage:'Meeting Done', notes:'Same HR contact as Mapesu. Pending new HR appointment.',              lastContact:'2025-01-01', priority:'medium', blocker:'Same HR blocker as Mapesu',            type:'ll' },
  { id:'ll5',  name:'Dongola',                  contact:'Izak',                phone:'',           email:'',                            area:'Limpopo',       stage:'Onboarding',   notes:'Ensure all staff are onboarded. Follow up with Izak for invoicing details.', lastContact:'2026-06-01', priority:'high', blocker:'Confirm full onboarding + get invoicing details from Izak', type:'ll' },
  { id:'ll6',  name:'Noordgrens Boerdery',      contact:'Adriaan Roodt',       phone:'0722213759', email:'weipe.admin@noordgrens.co.za', area:'Weipe/Limpopo', stage:'Contacted',    notes:'Intro email sent 01/06/2025. No documentation received.',             lastContact:'2025-06-01', priority:'medium', blocker:'No documentation',                    type:'ll' },
  { id:'ll7',  name:'Oppierandjie Boerdery',    contact:'Rudolf Nel',          phone:'0764586778', email:'rudolf.oppierandjie@lantic.net', area:'Limpopo',    stage:'Contacted',    notes:'Intro email sent. No documentation received.',                        lastContact:'2025-06-01', priority:'medium', blocker:'No documentation',                    type:'ll' },
  { id:'ll8',  name:'Junior Boerdery',          contact:'Michiel Nel / Carita',phone:'0786765756', email:'carita@juniorboerdery.co.za', area:'Limpopo',       stage:'Contacted',    notes:'Intro email sent. No documentation received.',                        lastContact:'2025-06-01', priority:'medium', blocker:'No documentation',                    type:'ll' },
  { id:'ll9',  name:'Mount Stuart Boerdery',    contact:'Christo Vorster',     phone:'0828157709', email:'Christovorster890@gmail.com', area:'Limpopo',       stage:'Onboarding',   notes:'Contract pending. Needs another site visit.',                         lastContact:'2025-06-01', priority:'high',   blocker:'Contract still pending',               type:'ll' },
  { id:'ll10', name:'Sterkfontein',             contact:'Brett Apker',         phone:'0846227388', email:'sales@anglecrafts.co.za',     area:'Limpopo',       stage:'Contacted',    notes:'Client not on farm. Follow up when back on site.',                    lastContact:'2025-06-01', priority:'low',    blocker:'Client not on farm',                   type:'ll' },
  { id:'ll11', name:'Terblanchehoek Game Farm', contact:'Richard Paardenkooper', phone:'0823945331', email:'maintenance@herdreserve.org.za', area:'Limpopo',  stage:'Contacted',    notes:'HR on sick leave. Follow up once HR is back.',                        lastContact:'2025-06-01', priority:'medium', blocker:'HR on sick leave',                    type:'ll' },
  { id:'ll12', name:'Hastings',                 contact:'Francois Hoffman',    phone:'0839846077', email:'francoish.hoffman@gmail.com', area:'Limpopo',       stage:'Contacted',    notes:'Intro email sent. No response.',                                      lastContact:'2025-06-01', priority:'low',    blocker:'No response',                          type:'ll' },
  { id:'ll13', name:'Lankgewag Boerdery',       contact:'Kobus Strydom / Cynthia', phone:'0824973244', email:'admin@lankgewagbdy.co.za', area:'Limpopo',     stage:'Contacted',    notes:'Not interested. Needs site visit to re-engage.',                      lastContact:'2025-06-01', priority:'low',    blocker:'Not interested — re-engage',           type:'ll' },
  { id:'ll14', name:'Luben',                    contact:'Gerrie Van Der Merwe',phone:'0789413407', email:'baobabwe@gmail.com',          area:'Limpopo',       stage:'Contacted',    notes:'No response. Follow up required.',                                    lastContact:'2025-06-01', priority:'low',    blocker:'No response',                          type:'ll' },
  { id:'ll15', name:'Mirror Boerdery',          contact:'Kobus van der Walt',  phone:'0810110995', email:'Mirrior@lantic.net',          area:'Limpopo',       stage:'Contacted',    notes:'No response.',                                                        lastContact:'2025-06-01', priority:'low',    blocker:'No response',                          type:'ll' },
  { id:'ll16', name:'Karia',                    contact:'Ri-Jan / Greta',      phone:'0827840920', email:'kariabeleggings1@gmail.com',  area:'Limpopo',       stage:'Meeting Done', notes:'Client hesitant due to pending labour dispute.',                      lastContact:'2025-01-15', priority:'medium', blocker:'Pending labour dispute',               type:'ll' },
  { id:'ll17', name:'Sakkie Muller Boerdery',   contact:'Sakkie Muller / Jacobie', phone:'0721014165', email:'sakkiemuller9@gmail.com', area:'Limpopo',      stage:'Contacted',    notes:'Intro email sent 09/05/2025.',                                        lastContact:'2025-05-09', priority:'medium', blocker:'',                                     type:'ll' },
  { id:'ll18', name:'HJ Vervoer',               contact:'HJ / Yolanda',        phone:'0823336965', email:'hjsmitvervoer@gmail.com',     area:'Vivo',          stage:'Contacted',    notes:'Intro email sent 09/05/2025.',                                        lastContact:'2025-05-09', priority:'medium', blocker:'',                                     type:'ll' },
  { id:'ll19', name:'Bandur Safaris',           contact:'Martin vd Merwe / Lilane', phone:'0710454251', email:'bandursafaris1@gmail.com', area:'Limpopo',    stage:'Contacted',    notes:'Intro email sent 09/10/2025.',                                        lastContact:'2025-10-09', priority:'medium', blocker:'',                                     type:'ll' },
  { id:'ll20', name:'Verdant Orchards',         contact:'Unknown',             phone:'',           email:'antone.vcl@verdant-orchards.com', area:'Limpopo',  stage:'Contacted',    notes:'Email sent. No contact person confirmed.',                            lastContact:'2025-06-01', priority:'medium', blocker:'No contact person',                    type:'ll' },
  { id:'ll21', name:'Lox Africana (Samaria)',   contact:'Ryno Gouws',          phone:'0718659743', email:'loxafri@gmail.com',           area:'Limpopo',       stage:'Active Client',notes:'Active. Client wife handles admin. Check in monthly.',               lastContact:'2025-04-09', priority:'low',    blocker:'',                                     type:'ll', revenue: 600 },
  { id:'ll22', name:'Petrus Visagie Boerdery',  contact:'Petrus Visagie',      phone:'0825472934', email:'petrus@saboergoat.co.za',     area:'Limpopo',       stage:'Active Client',notes:'Continuing biometrics on own. Weekly check-up required.',            lastContact:'2025-01-17', priority:'medium', blocker:'',                                     type:'ll', revenue: 600 },
  { id:'ll23', name:'Secrabje',                 contact:'Bertie / Miche',      phone:'0661737237', email:'hr@secrabje.co.za',           area:'Limpopo',       stage:'Active Client',notes:'Onboarded April 2025.',                                             lastContact:'2025-04-01', priority:'low',    blocker:'',                                     type:'ll', revenue: 600 },
]

const SEED_SL: Lead[] = [
  { id:'sl1',  name:'DRS Security',                    contact:'Dion Svoboda',      phone:'082 933 9025', email:'drsltt@hotmail.com',             area:'Limpopo',    stage:'Meeting Done',  notes:'Meeting done. Interested. Safe Link not yet implemented.',                              lastContact:'2026-02-26', priority:'high',   blocker:'Not yet implemented',               type:'sl' },
  { id:'sl2',  name:'Musina Suid Plaaswag',            contact:'Cecil Henry Nel',   phone:'082 876 0731', email:'',                               area:'Limpopo',    stage:'Meeting Done',  notes:'Will join if they can form part of Soutpansberg Noord Landelike Veiligheid.',          lastContact:'2026-03-21', priority:'high',   blocker:'Conditional on group formation',     type:'sl' },
  { id:'sl3',  name:'Limpopo Landelike Veiligheid',    contact:'Deirdre Carter',    phone:'082 831 9168', email:'ceo@limag.co.za',                area:'Limpopo',    stage:'Meeting Done',  notes:'District coordinators interested. System already active at Vhembe & Mopani.',         lastContact:'2026-03-26', priority:'high',   blocker:'District rollout coordination',      type:'sl' },
  { id:'sl4',  name:'BBS Protection',                  contact:'Willie',            phone:'',             email:'Willie@bbsprotection.co.za',     area:'Gauteng',    stage:'Meeting Done',  notes:'Post first meeting. Details pending.',                                                  lastContact:'2026-01-01', priority:'medium', blocker:'Pending details',                    type:'sl' },
  { id:'sl5',  name:'Soutpansberg Landelike Veiligheid Wes', contact:'Japie van der Goot', phone:'083 286 3128', email:'',                       area:'Limpopo',    stage:'Contacted',     notes:'Arranging neighbourhood watch meeting.',                                                lastContact:'2026-03-16', priority:'medium', blocker:'',                                   type:'sl' },
  { id:'sl6',  name:'Hazeyview Plaaswag',              contact:'Cheryl Calmeyer',   phone:'072 586 7600', email:'',                               area:'Mpumalanga', stage:'Contacted',     notes:'Referred to group leaders. Follow up.',                                                 lastContact:'2026-03-17', priority:'medium', blocker:'Referred to group leaders',          type:'sl' },
  { id:'sl7',  name:'Defendum Security',               contact:'Ockert De Lange',   phone:'072 505 6107', email:'',                               area:'Limpopo',    stage:'Contacted',     notes:'Arranging meeting.',                                                                    lastContact:'2026-03-16', priority:'medium', blocker:'',                                   type:'sl' },
  { id:'sl8',  name:'Pontdrift Plaaswag',              contact:'Ruhan Gouws',       phone:'082 560 5916', email:'',                               area:'Limpopo',    stage:'Contacted',     notes:'Arranging neighbourhood watch meeting.',                                                lastContact:'2026-03-16', priority:'medium', blocker:'',                                   type:'sl' },
  { id:'sl9',  name:'Agri Limpopo',                    contact:'Deirdre Carter',    phone:'082 831 9168', email:'ceo@limag.co.za',                area:'Limpopo',    stage:'Contacted',     notes:'Same contact as Limpopo Landelike Veiligheid.',                                         lastContact:'2026-03-16', priority:'medium', blocker:'',                                   type:'sl' },
  { id:'sl10', name:'Bravo Span Security',             contact:'Unknown',           phone:'087 151 4883', email:'info@bravospansecurity.co.za',   area:'Polokwane',  stage:'New Lead',      notes:'Not yet contacted.',                                                                    lastContact:'',           priority:'low',    blocker:'',                                   type:'sl' },
  { id:'sl11', name:'Letaba Security (Pty) Ltd',       contact:'Unknown',           phone:'015 307 1529', email:'letabasecurity@tzaneen.co.za',   area:'Tzaneen',    stage:'New Lead',      notes:'Not yet contacted.',                                                                    lastContact:'',           priority:'low',    blocker:'',                                   type:'sl' },
  { id:'sl12', name:'Mabuzitha Security',              contact:'Warren Zitha',      phone:'079 954 4077', email:'Warrenzitha83@gmail.com',        area:'Tzaneen',    stage:'New Lead',      notes:'Not yet contacted.',                                                                    lastContact:'',           priority:'low',    blocker:'',                                   type:'sl' },
  { id:'sl13', name:'Vision Tactical',                 contact:'Sameer',            phone:'084 222 2222', email:'sameer@visiontactical.co.za',    area:'Johannesburg',stage:'New Lead',     notes:'Not yet contacted.',                                                                    lastContact:'',           priority:'low',    blocker:'',                                   type:'sl' },
]

const SEED_KIEPERSOL: Lead[] = [
  { id:'k1',  name:'Always Good To Invest',  contact:'Bill',             phone:'082 771 6986', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k2',  name:'AP Vos',                 contact:'Pieter',           phone:'082 388 4087', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k3',  name:'Avomak Boerdery',        contact:'Francois Minnaar', phone:'082 499 0956', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k4',  name:'BJ Voster / Songloed',   contact:'Gerrie Bam',       phone:'083 400 0398', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k5',  name:'Buffelspruit Boerdery',  contact:'Adam Botha',       phone:'0823144445',   email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k6',  name:'Burpak',                 contact:'Steyn Prinsloo',   phone:'082 408 2103', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k7',  name:'Danroc',                 contact:'Gavin Hearne',     phone:'0784608780',   email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k8',  name:'Die Prins Vennootskap',  contact:'Andries Prins',    phone:'072 524 8046', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k9',  name:'Emmanuel Boerdery',      contact:'Deon v Heerden',   phone:'083 546 0122', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k10', name:'Fruit Farm Group',       contact:'Andre Bam',        phone:'082 552 8812', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k11', name:'Hilltop Farms',          contact:'Frans Grey',       phone:'083 325 1859', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k12', name:'Ilala Boerdery',         contact:'Judy & Arno Roua', phone:'068 563 6324', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k13', name:'JJ Prinsloo Boerdery',   contact:'Steyn Prinsloo',   phone:'082 408 2103', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k14', name:'Katope',                 contact:'Andre Bam',        phone:'082 552 8812', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k15', name:'Kina Boerdery',          contact:'Neels de Beer',    phone:'079 416 4253', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k16', name:'Koeltehof',              contact:'Patric',           phone:'082 804 4110', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k17', name:'Langbult Boerdery',      contact:'Carel van Heerden Lee', phone:'083 357 1877', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k18', name:'Mac View East Farm',     contact:'Wolfgang',         phone:'0743853537',   email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k19', name:'Morceau Boerdery',       contact:'Morrees du Toit',  phone:'083 627 1458', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k20', name:'Navobani Boerdery',      contact:'Edzard',           phone:'083 303 0116', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k21', name:'NST Boerdery',           contact:'Bruce Valentine',  phone:'082 804 5947', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k22', name:'Rene Joubert Trust',     contact:'Jan Joubert',      phone:'082 735 3795', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k23', name:'Selde So',               contact:'Francois Badenhorst', phone:'082 922 2089', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k24', name:'Swart Familie Trust',    contact:'Ben Swart',        phone:'082 388 0574', email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k25', name:'Talamati Fruits',        contact:'Unknown',          phone:'',             email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
  { id:'k26', name:'Harmony Queen',          contact:'Unknown',          phone:'',             email:'', area:'Kiepersol', stage:'New Lead', notes:'', lastContact:'', priority:'medium', blocker:'', type:'kiepersol', contacted:false },
]

const SEED_KPIS: KPIEntry[] = [
  { id:'kpi1', label:'LL Leads Contacted',              target:15, actual:0 },
  { id:'kpi2', label:'SL Leads Contacted',              target:10, actual:0 },
  { id:'kpi3', label:'Rural Safety Chairs Contacted',   target:3,  actual:0 },
  { id:'kpi4', label:'Labour Broker Contacts',          target:5,  actual:0 },
  { id:'kpi5', label:'Meetings Arranged (all types)',   target:8,  actual:0 },
  { id:'kpi6', label:'WhatsApp Outreach Sent',          target:50, actual:0 },
  { id:'kpi7', label:'7-Day Follow-ups Sent',           target:30, actual:0 },
]
