'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import type {
  SLOnboardingRecord, SLOnboardingStage, SLAdmin,
  LLOnboardingRecord, LLOnboardingStage,
} from '@/lib/ll-types'

// ─── SafeLink templates ───────────────────────────────────────────────────────
const SL_TPL_AF = (name: string) => `Goeiedag ${name || '[NAAM]'},

Ek benodig asseblief die volgende inligting:

📍 Distriksnaam

Ons gaan al die voorsitters op die stelsel laai sodat hulle toegang tot die dashboard kan kry. Vir elke persoon benodig ek:

• Naam en van
• E-posadres
• WhatsApp-nommer
• Sub-distrik (naam + pin location)

Koste:
R600/maand vir tot 10 admins/voorsitters.
R60/maand vir elke addisionele persoon.

Enigiemand kan die app gebruik om insidente te rapporteer — sonder addisionele koste.

Mara — Labour Link
+27 60 816 8200`

const SL_TPL_EN = (name: string) => `Good day ${name || '[NAME]'},

I need the following information please:

📍 District name

We'll load all the chairpersons/admins onto the system so they can access the dashboard. For each person I need:

• Full name
• Email address
• WhatsApp number
• Sub-district (name + pin location)

Pricing:
R600/month for up to 10 admins/chairpersons.
R60/month for each additional person.

Anyone can use the app to report incidents — at no extra cost.

Mara — Labour Link
+27 60 816 8200`

const SL_TPL_WELCOME = (name: string) => `Goeiedag ${name || '[NAAM]'},

Jy sou 'n epos ontvang het met jou login besonderhede. Jy kan met dieselfde login in die App ook inkom.

Ek stuur nou die link na die app vir jou.

Ons het dit oorspronklik gebou vir sekuriteitmaatskappye, so daar is "Security Personnel" en 'n paar ander nie-relevante goed. Ons gaan dit binnekort versteek sodat julle net relevante goed sien.

Twee kort video's om jou 'n vinnige oorsig te gee:

1️⃣ Hoe SafeLink werk vir jou Neighbourhood Watch:
https://youtu.be/qMCnNb8Au2g

2️⃣ Hoe die Security Guard App gebruik word om insidente te laai:
https://youtube.com/shorts/bhuAmJ6B3tU

Mara — Labour Link
+27 60 816 8200`

// ─── Labour Link templates ────────────────────────────────────────────────────
const LL_INFO_AF = (name: string) => `Hallo ${name || '[NAAM]'},

Om jou op die stelsel te kry, benodig ek asseblief die volgende:

Jou kontakbesonderhede
• E-posadres
• WhatsApp-nommer

Plaasbesonderhede
• Plaasnaam
• Pin-ligging (Google Maps skakel of koördinate)
• Faktureringsadres

Personeeldata
• CSV-uitvoer van alle aktiewe werknemers

Sodra ek dit het, kan ons jou profiel opstel en gereed kry.

Mara — Labour Link
+27 60 816 8200`

const LL_INFO_EN = (name: string) => `Hi ${name || '[NAME]'},

To get you set up on the system, could you please provide the following:

Your Contact Details
• Email address
• WhatsApp number

Farm Details
• Farm name
• Pin location (Google Maps link or coordinates)
• Billing address

Staff Data
• CSV export of all currently active employees

Once I have the above, we can get your profile created and ready to go.

Mara — Labour Link
+27 60 816 8200`

const LL_GOLIVE_AF = (name: string) => `Hallo ${name || '[NAAM]'},

Goeie nuus — julle Labour Link-profiel is gereed en aktief! 🎉

Hier is 'n vinnige video-oorsig van hoe die stelsel werk:
▶️ [VIDEO SKAKEL]

Met Labour Link kan julle:
✅ Werkers verifieer en registreer (biometrie & ID)
✅ Insidente intyds rapporteer — direk vanaf julle foon
✅ Risikovlae en werkersgeskiedenisse oor plase sien

Om insidente via WhatsApp te laai, stuur na:
📱 +27 60 816 8200
Formaat: Plaas | Werker se naam | Beskrywing van insident

Ons beveel sterk aan dat ons 'n volledige opleiding doen sodat julle die meeste uit die stelsel kry. Ons kan:
• 'n Virtuele vergadering (±30 min) reël
• 'n Plaasbesoek doen vir in-persoon opleiding
• Telefoniese ondersteuning bied

Skakel of WhatsApp Mara: +27 60 816 8200

Welkom aan boord!

Mara — Labour Link
+27 60 816 8200`

const LL_GOLIVE_EN = (name: string) => `Hi ${name || '[NAME]'},

Great news — your Labour Link profile is live and ready to use! 🎉

Here's a quick video overview of how the system works:
▶️ [VIDEO LINK]

With Labour Link you can:
✅ Verify and register workers (biometrics & ID)
✅ Report incidents in real time — directly from your phone
✅ See risk flags and worker history across farms

To log an incident via WhatsApp, send to:
📱 +27 60 816 8200
Format: Farm | Worker name | Incident description

We strongly recommend scheduling a full system training session to get the most out of Labour Link. We can:
• Schedule a virtual meeting (±30 min)
• Do an on-farm visit for in-person training
• Provide phone support

Call or WhatsApp Mara: +27 60 816 8200

Welcome aboard!

Mara — Labour Link
+27 60 816 8200`

// ─── Shared helpers ───────────────────────────────────────────────────────────
const SL_STAGES: SLOnboardingStage[] = ['info-requested', 'info-received', 'setup', 'onboarded']
const SL_STAGE_LABELS: Record<SLOnboardingStage, string> = {
  'info-requested': 'Info Requested',
  'info-received':  'Info Received',
  'setup':          'Dashboard Setup',
  'onboarded':      'Onboarded',
}
const SL_STAGE_COLORS: Record<SLOnboardingStage, string> = {
  'info-requested': '#d4860a',
  'info-received':  '#3a6bef',
  'setup':          '#8b5cf6',
  'onboarded':      '#18a86b',
}

const LL_STAGES: LLOnboardingStage[] = ['info-requested', 'info-received', 'technical-setup', 'review', 'ready']
const LL_STAGE_LABELS: Record<LLOnboardingStage, string> = {
  'info-requested':  'Info Requested',
  'info-received':   'Info Received',
  'technical-setup': 'Technical Setup',
  'review':          'Review',
  'ready':           'Active Client',
}
const LL_STAGE_COLORS: Record<LLOnboardingStage, string> = {
  'info-requested':  '#d4860a',
  'info-received':   '#3a6bef',
  'technical-setup': '#8b5cf6',
  'review':          '#e85d9c',
  'ready':           '#18a86b',
}

function calcSLMRR(count: number) {
  return count <= 10 ? 600 : 600 + (count - 10) * 60
}

function waUrl(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '')
  const num = digits.startsWith('27') ? digits : digits.startsWith('0') ? '27' + digits.slice(1) : digits
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-3 py-1.5 text-[11px] text-gray-600 hover:bg-gray-50">
      {copied ? '✓ Copied' : label}
    </button>
  )
}

function Section({ title, step, done = false, children }: {
  title: string; step?: number | string; done?: boolean; children: React.ReactNode
}) {
  return (
    <div className="mb-4 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        {step !== undefined && (
          <span className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
            done ? 'bg-[rgba(24,168,107,0.12)] text-[#18a86b]' : 'bg-[rgba(58,107,239,0.1)] text-[#3a6bef]',
          )}>
            {done ? '✓' : step}
          </span>
        )}
        <span className="font-[family-name:var(--font-syne)] text-[13px] font-semibold text-gray-900">{title}</span>
      </div>
      {children}
    </div>
  )
}

function TemplateBlock({ text, phone, label = 'Copy message' }: { text: string; phone?: string; label?: string }) {
  return (
    <>
      <pre className="mb-3 rounded-lg border border-[rgba(0,0,0,0.06)] bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-700 whitespace-pre-wrap">
        {text}
      </pre>
      <div className="flex gap-2">
        <CopyBtn text={text} label={label} />
        {phone && (
          <a href={waUrl(phone, text)} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-3 py-1.5 text-[11px] text-gray-600 hover:bg-gray-50">
            Open WhatsApp ↗
          </a>
        )}
      </div>
    </>
  )
}

function StageTrack<S extends string>({ stages, labels, colors, current }: {
  stages: S[]; labels: Record<S, string>; colors: Record<S, string>; current: S
}) {
  const cur = stages.indexOf(current)
  return (
    <div className="mb-5 flex flex-wrap items-center gap-0">
      {stages.map((s, i) => {
        const done = i < cur; const active = i === cur
        return (
          <div key={s as string} className="flex items-center">
            {i > 0 && <div className="h-px w-3 bg-gray-200 shrink-0" />}
            <span className={cn(
              'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium whitespace-nowrap',
              done   && 'border-[rgba(24,168,107,0.4)] bg-[rgba(24,168,107,0.08)] text-[#18a86b]',
              active && 'border-[rgba(58,107,239,0.4)] bg-[rgba(58,107,239,0.08)] text-[#3a6bef]',
              !done && !active && 'border-[rgba(0,0,0,0.08)] bg-white text-gray-400',
            )}>
              {done ? '✓ ' : ''}{labels[s]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── SL Admin form ────────────────────────────────────────────────────────────
function AdminForm({ onAdd, onCancel }: { onAdd: (a: SLAdmin) => void; onCancel: () => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState('')
  const [phone, setPhone] = useState(''); const [sub, setSub] = useState('')
  function add() {
    if (!name.trim()) return
    onAdd({ id: `adm-${Date.now()}`, name: name.trim(), email: email.trim(), phone: phone.trim(), subDistrict: sub.trim() })
  }
  return (
    <div className="mt-3 rounded-lg border border-[rgba(58,107,239,0.2)] bg-[rgba(58,107,239,0.03)] p-3">
      <div className="grid grid-cols-2 gap-2 mb-2">
        {[['Full name *', name, setName], ['Sub-district', sub, setSub], ['Email', email, setEmail], ['WhatsApp', phone, setPhone]].map(([ph, val, set]) => (
          <input key={ph as string} value={val as string} onChange={e => (set as (v: string) => void)(e.target.value)}
            placeholder={ph as string}
            className="rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3a6bef]" />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={add} className="rounded-lg bg-[#3a6bef] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#2d5adf]">Add</button>
        <button onClick={onCancel} className="rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-1 text-[11px] text-gray-500 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  )
}

// ─── SL Detail Panel ──────────────────────────────────────────────────────────
function SLDetailPanel({ record, onUpdate, onDelete }: {
  record: SLOnboardingRecord
  onUpdate: (u: Partial<SLOnboardingRecord>) => void
  onDelete: () => void
}) {
  const [tplLang, setTplLang] = useState<'af' | 'en'>('af')
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [notes, setNotes] = useState(record.notes)
  const [district, setDistrict] = useState(record.district)
  const [adminCount, setAdminCount] = useState(record.admins.length || 5)

  const mrr = calcSLMRR(adminCount)
  const infoText = tplLang === 'af' ? SL_TPL_AF(record.contactName) : SL_TPL_EN(record.contactName)
  const welcomeText = SL_TPL_WELCOME(record.contactName)
  const nextStage = SL_STAGES[SL_STAGES.indexOf(record.stage) + 1] as SLOnboardingStage | undefined

  function addAdmin(a: SLAdmin) { onUpdate({ admins: [...record.admins, a] }); setAdminCount(record.admins.length + 1); setShowAdminForm(false) }
  function removeAdmin(id: string) { const u = record.admins.filter(a => a.id !== id); onUpdate({ admins: u }); setAdminCount(u.length || 1) }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 font-[family-name:var(--font-dm-mono)]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-[20px] font-bold text-gray-900">{record.orgName}</h1>
          <p className="mt-1 text-[12px] text-gray-400">
            {record.district && <>{record.district} · </>}SafeLink · {record.admins.length} admins
            {record.contactName && <> · {record.contactName}</>}
            {record.contactPhone && <> · {record.contactPhone}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {record.leadId && (
            <a href="/labour-link/pipeline" className="inline-flex items-center gap-1 rounded-lg border border-[rgba(58,107,239,0.2)] bg-[rgba(58,107,239,0.06)] px-3 py-1.5 text-[11px] text-[#3a6bef] hover:bg-[rgba(58,107,239,0.1)]">
              → SL Pipeline
            </a>
          )}
          <button onClick={onDelete} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-[11px] text-gray-400 hover:border-red-200 hover:text-red-500">Remove</button>
        </div>
      </div>

      <StageTrack stages={SL_STAGES} labels={SL_STAGE_LABELS} colors={SL_STAGE_COLORS} current={record.stage} />

      {record.stage === 'info-requested' && (
        <>
          <Section title="Send info request to client" step={1}>
            <div className="mb-2 flex overflow-hidden rounded-lg border border-[rgba(0,0,0,0.08)]">
              {(['af', 'en'] as const).map(l => (
                <button key={l} onClick={() => setTplLang(l)}
                  className={cn('flex-1 py-1.5 text-[11px] font-medium', tplLang === l ? 'bg-[#3a6bef] text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
                  {l === 'af' ? 'Afrikaans' : 'English'}
                </button>
              ))}
            </div>
            <TemplateBlock text={infoText} phone={record.contactPhone} />
          </Section>
          <Section title="Waiting for from client" step={2}>
            <ul className="space-y-2 text-[12px] text-gray-600">
              {['District name', 'Admin list — name, email, WhatsApp, sub-district for each person'].map(item => (
                <li key={item} className="flex items-start gap-2"><span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-[rgba(0,0,0,0.15)]" />{item}</li>
              ))}
            </ul>
            <button onClick={() => onUpdate({ stage: 'info-received' })} className="mt-4 rounded-lg bg-[#3a6bef] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#2d5adf]">Mark info received →</button>
          </Section>
        </>
      )}

      {record.stage === 'info-received' && (
        <>
          <Section title="Capture district + admin details" step={2}>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-400">District</p>
                <input value={district} onChange={e => setDistrict(e.target.value)} onBlur={() => onUpdate({ district, notes })}
                  placeholder="e.g. Groter Letaba"
                  className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-gray-50 px-3 py-2 text-[12px] outline-none focus:border-[#3a6bef]" />
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-400">Expected admins</p>
                <input type="number" min={1} value={adminCount} onChange={e => setAdminCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-gray-50 px-3 py-2 text-[12px] outline-none focus:border-[#3a6bef]" />
              </div>
            </div>
            {record.admins.length > 0 && (
              <div className="mb-3 overflow-hidden rounded-lg border border-[rgba(0,0,0,0.08)]">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50"><tr>{['Name','Sub-district','Email','WhatsApp',''].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>)}</tr></thead>
                  <tbody>
                    {record.admins.map(a => (
                      <tr key={a.id} className="border-t border-[rgba(0,0,0,0.05)]">
                        <td className="px-3 py-2 text-gray-900">{a.name}</td>
                        <td className="px-3 py-2 text-gray-600">{a.subDistrict || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{a.email || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{a.phone || '—'}</td>
                        <td className="px-3 py-2"><button onClick={() => removeAdmin(a.id)} className="text-gray-300 hover:text-red-400">✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showAdminForm
              ? <AdminForm onAdd={addAdmin} onCancel={() => setShowAdminForm(false)} />
              : <button onClick={() => setShowAdminForm(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(58,107,239,0.3)] px-3 py-1.5 text-[12px] text-[#3a6bef] hover:bg-[rgba(58,107,239,0.05)]">+ Add admin</button>
            }
          </Section>
          <Section title="Pricing" step="R">
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between text-gray-600"><span>Base — up to 10 admins</span><span>R600/mo</span></div>
              {adminCount > 10 && <div className="flex justify-between text-gray-600"><span>Additional ({adminCount - 10} × R60)</span><span>R{(adminCount - 10) * 60}/mo</span></div>}
              <div className="flex justify-between border-t border-[rgba(0,0,0,0.08)] pt-1.5 font-semibold"><span>Total MRR</span><span className="text-[#18a86b]">R{mrr}/mo</span></div>
            </div>
          </Section>
          <div className="mb-4 flex items-center gap-2">
            <button onClick={() => onUpdate({ stage: 'info-requested' })} className="rounded-lg border border-[rgba(0,0,0,0.1)] px-4 py-2 text-[12px] text-gray-500 hover:bg-gray-50">← Back</button>
            <button onClick={() => onUpdate({ stage: 'setup' })} className="rounded-lg bg-[#3a6bef] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#2d5adf]">Move to dashboard setup →</button>
          </div>
        </>
      )}

      {record.stage === 'setup' && (
        <>
          <Section title="Admins captured" step={1} done>
            {record.admins.length === 0
              ? <p className="text-[12px] text-gray-400">No admins recorded.</p>
              : (
                <div className="overflow-hidden rounded-lg border border-[rgba(0,0,0,0.08)]">
                  <table className="w-full text-[11px]">
                    <thead className="bg-gray-50"><tr>{['Name','Sub-district','Email','WhatsApp'].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>)}</tr></thead>
                    <tbody>{record.admins.map(a => <tr key={a.id} className="border-t border-[rgba(0,0,0,0.05)]"><td className="px-3 py-2 text-gray-900">{a.name}</td><td className="px-3 py-2 text-gray-600">{a.subDistrict||'—'}</td><td className="px-3 py-2 text-gray-600">{a.email||'—'}</td><td className="px-3 py-2 text-gray-600">{a.phone||'—'}</td></tr>)}</tbody>
                  </table>
                </div>
              )
            }
          </Section>
          <Section title="Load to SafeLink dashboard" step={2}>
            <ul className="space-y-2 text-[12px] text-gray-600">
              {['Sub-districts configured on SafeLink platform', 'Admin accounts created — one per person', 'Login credentials sent to each admin via email'].map(item => (
                <li key={item} className="flex items-start gap-2"><span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-[rgba(0,0,0,0.15)]" />{item}</li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => onUpdate({ stage: 'info-received' })} className="rounded-lg border border-[rgba(0,0,0,0.1)] px-4 py-2 text-[12px] text-gray-500 hover:bg-gray-50">← Back</button>
              <button onClick={() => onUpdate({ stage: 'onboarded' })} className="rounded-lg bg-[#3a6bef] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#2d5adf]">Mark logins sent → Onboard</button>
            </div>
          </Section>
        </>
      )}

      {record.stage === 'onboarded' && (
        <>
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[rgba(24,168,107,0.3)] bg-[rgba(24,168,107,0.06)] px-4 py-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#18a86b] text-[13px] text-white">✓</span>
            <span className="font-[family-name:var(--font-syne)] text-[13px] font-semibold text-[#18a86b]">{record.orgName} is onboarded</span>
          </div>
          <Section title="Welcome message" step="★">
            <TemplateBlock text={welcomeText} phone={record.contactPhone} />
          </Section>
          <Section title="Billing summary" step="R">
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between text-gray-600"><span>Admins on platform</span><span>{record.admins.length}</span></div>
              <div className="flex justify-between text-gray-600"><span>Base (up to 10)</span><span>R600/mo</span></div>
              {record.admins.length > 10 && <div className="flex justify-between text-gray-600"><span>Additional ({record.admins.length - 10} × R60)</span><span>R{(record.admins.length - 10) * 60}/mo</span></div>}
              <div className="flex justify-between border-t border-[rgba(0,0,0,0.08)] pt-1.5 font-semibold"><span>Total MRR</span><span className="text-[#18a86b]">R{calcSLMRR(record.admins.length)}/mo</span></div>
            </div>
          </Section>
        </>
      )}

      <Section title="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => onUpdate({ notes })}
          rows={3} placeholder="Internal notes…"
          className="w-full resize-none rounded-lg border border-[rgba(0,0,0,0.1)] bg-gray-50 px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#3a6bef]" />
      </Section>
    </div>
  )
}

// ─── LL Detail Panel ──────────────────────────────────────────────────────────
function LLDetailPanel({ record, onUpdate, onDelete }: {
  record: LLOnboardingRecord
  onUpdate: (u: Partial<LLOnboardingRecord>) => void
  onDelete: () => void
}) {
  const [tplLang, setTplLang] = useState<'af' | 'en'>('af')
  const [notes, setNotes] = useState(record.notes)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [form, setForm] = useState({
    contactEmail: record.contactEmail,
    contactPhone: record.contactPhone,
    billingAddress: record.billingAddress,
    pinLocation: record.pinLocation,
    farmName: record.farmName,
    staffCount: record.staffCount,
    csvReceived: record.csvReceived,
  })

  const nextStage = LL_STAGES[LL_STAGES.indexOf(record.stage) + 1] as LLOnboardingStage | undefined
  const infoText = tplLang === 'af' ? LL_INFO_AF(record.contactName) : LL_INFO_EN(record.contactName)
  const goLiveText = tplLang === 'af' ? LL_GOLIVE_AF(record.contactName) : LL_GOLIVE_EN(record.contactName)

  function saveForm() { onUpdate({ ...form, notes }) }

  const reviewItems = [
    'All labourers loaded from CSV — no missing workers',
    'Farm details correct (name, pin location, billing address)',
    'WhatsApp incident reporting tested and working',
    'Client contact details confirmed on profile',
  ]

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 font-[family-name:var(--font-dm-mono)]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-[20px] font-bold text-gray-900">{record.farmName}</h1>
          <p className="mt-1 text-[12px] text-gray-400">
            {record.area && <>{record.area} · </>}Labour Link
            {record.contactName && <> · {record.contactName}</>}
            {record.contactPhone && <> · {record.contactPhone}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {record.leadId && (
            <a href="/labour-link/pipeline" className="inline-flex items-center gap-1 rounded-lg border border-[rgba(58,107,239,0.2)] bg-[rgba(58,107,239,0.06)] px-3 py-1.5 text-[11px] text-[#3a6bef] hover:bg-[rgba(58,107,239,0.1)]">
              → LL Pipeline
            </a>
          )}
          <button onClick={onDelete} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-[11px] text-gray-400 hover:border-red-200 hover:text-red-500">Remove</button>
        </div>
      </div>

      <StageTrack stages={LL_STAGES} labels={LL_STAGE_LABELS} colors={LL_STAGE_COLORS} current={record.stage} />

      {/* Lang toggle — shown on stages with templates */}
      {(record.stage === 'info-requested' || record.stage === 'ready') && (
        <div className="mb-4 flex overflow-hidden rounded-lg border border-[rgba(0,0,0,0.08)] w-fit">
          {(['af', 'en'] as const).map(l => (
            <button key={l} onClick={() => setTplLang(l)}
              className={cn('px-5 py-1.5 text-[11px] font-medium', tplLang === l ? 'bg-[#3a6bef] text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
              {l === 'af' ? 'Afrikaans' : 'English'}
            </button>
          ))}
        </div>
      )}

      {/* Stage 1 – Info Requested */}
      {record.stage === 'info-requested' && (
        <>
          <Section title="Send info request to client" step={1}>
            <TemplateBlock text={infoText} phone={record.contactPhone} />
          </Section>
          <Section title="Waiting for from client" step={2}>
            <ul className="space-y-2 text-[12px] text-gray-600">
              {['Email address', 'WhatsApp number', 'Farm name', 'Pin location (Google Maps link or coordinates)', 'Billing address', 'CSV export of all active employees'].map(item => (
                <li key={item} className="flex items-start gap-2"><span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-[rgba(0,0,0,0.15)]" />{item}</li>
              ))}
            </ul>
            <button onClick={() => onUpdate({ stage: 'info-received' })} className="mt-4 rounded-lg bg-[#3a6bef] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#2d5adf]">Mark info received →</button>
          </Section>
        </>
      )}

      {/* Stage 2 – Info Received: capture details */}
      {record.stage === 'info-received' && (
        <>
          <Section title="Capture client details" step={2}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {([
                ['Farm name', 'farmName', 'text'],
                ['Area / Region', 'area', 'text'],
                ['Contact email', 'contactEmail', 'email'],
                ['Contact WhatsApp', 'contactPhone', 'text'],
                ['Billing address', 'billingAddress', 'text'],
                ['Pin location (Maps link)', 'pinLocation', 'text'],
              ] as [string, string, string][]).map(([label, key, type]) => (
                <div key={key}>
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-400">{label}</p>
                  <input type={type}
                    value={(key === 'area' ? record.area : form[key as keyof typeof form]) as string}
                    onChange={e => key === 'area' ? onUpdate({ area: e.target.value }) : setForm(f => ({ ...f, [key]: e.target.value }))}
                    onBlur={saveForm}
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-gray-50 px-3 py-2 text-[12px] outline-none focus:border-[#3a6bef]" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-400">Number of staff</p>
                <input type="number" min={0} value={form.staffCount}
                  onChange={e => setForm(f => ({ ...f, staffCount: Number(e.target.value) }))} onBlur={saveForm}
                  className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-gray-50 px-3 py-2 text-[12px] outline-none focus:border-[#3a6bef]" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-[12px] text-gray-700">
                  <input type="checkbox" checked={form.csvReceived}
                    onChange={e => { const v = e.target.checked; setForm(f => ({ ...f, csvReceived: v })); onUpdate({ csvReceived: v }) }}
                    className="h-4 w-4 rounded accent-[#3a6bef]" />
                  CSV received
                </label>
              </div>
            </div>
          </Section>
          <div className="mb-4 flex items-center gap-2">
            <button onClick={() => onUpdate({ stage: 'info-requested' })} className="rounded-lg border border-[rgba(0,0,0,0.1)] px-4 py-2 text-[12px] text-gray-500 hover:bg-gray-50">← Back</button>
            <button onClick={() => onUpdate({ stage: 'technical-setup', ...form })} className="rounded-lg bg-[#3a6bef] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#2d5adf]">Send to technical setup →</button>
          </div>
        </>
      )}

      {/* Stage 3 – Technical Setup */}
      {record.stage === 'technical-setup' && (
        <>
          <Section title="Client details captured" step={1} done>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
              {[['Farm', record.farmName], ['Area', record.area], ['Email', record.contactEmail], ['WhatsApp', record.contactPhone], ['Billing', record.billingAddress], ['Pin', record.pinLocation], ['Staff', String(record.staffCount)], ['CSV', record.csvReceived ? 'Received ✓' : 'Not yet']].map(([k, v]) => (
                <div key={k} className="flex gap-2 py-1 border-b border-[rgba(0,0,0,0.05)]">
                  <span className="text-gray-400 w-14 shrink-0">{k}</span>
                  <span className="text-gray-800">{v || '—'}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Technical team checklist" step={2}>
            <ul className="space-y-2 text-[12px] text-gray-600">
              {['New client instance created on Labour Link platform', 'All labourers uploaded from CSV', 'Farm details added (name, pin location, billing address)', 'WhatsApp incident channel configured and tested', 'All client contact details added to profile'].map(item => (
                <li key={item} className="flex items-start gap-2"><span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-[rgba(0,0,0,0.15)]" />{item}</li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => onUpdate({ stage: 'info-received' })} className="rounded-lg border border-[rgba(0,0,0,0.1)] px-4 py-2 text-[12px] text-gray-500 hover:bg-gray-50">← Back</button>
              <button onClick={() => onUpdate({ stage: 'review' })} className="rounded-lg bg-[#3a6bef] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#2d5adf]">Technical setup done — send for review →</button>
            </div>
          </Section>
        </>
      )}

      {/* Stage 4 – Independent Review */}
      {record.stage === 'review' && (
        <>
          <Section title="Independent review" step={3}>
            <p className="mb-3 text-[11px] text-gray-500">A second person verifies everything before go-live. Tick each item once confirmed.</p>
            <ul className="space-y-2 text-[12px] text-gray-600">
              {reviewItems.map((item, i) => {
                const checked = checkedItems.has(i)
                return (
                  <li key={item} className="flex cursor-pointer items-start gap-2 select-none" onClick={() => setCheckedItems(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })}>
                    <span className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${checked ? 'border-[#18a86b] bg-[#18a86b]' : 'border-[rgba(0,0,0,0.2)]'}`}>
                      {checked && <span className="text-[9px] text-white leading-none">✓</span>}
                    </span>
                    <span className={checked ? 'line-through text-gray-400' : ''}>{item}</span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-400">Reviewer notes</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => onUpdate({ notes })}
                rows={2} placeholder="Any issues or corrections found…"
                className="w-full resize-none rounded-lg border border-[rgba(0,0,0,0.1)] bg-gray-50 px-3 py-2 text-[12px] outline-none focus:border-[#3a6bef]" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => onUpdate({ stage: 'technical-setup' })} className="rounded-lg border border-[rgba(0,0,0,0.1)] px-4 py-2 text-[12px] text-gray-500 hover:bg-gray-50">← Back</button>
              <button onClick={() => onUpdate({ stage: 'ready' })} className="rounded-lg bg-[#18a86b] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#148f5a]">Review passed — ready to go live →</button>
            </div>
          </Section>
        </>
      )}

      {/* Stage 5 – Ready / Active Client */}
      {record.stage === 'ready' && (
        <>
          {record.activeClientConfirmed
            ? (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-[rgba(24,168,107,0.3)] bg-[rgba(24,168,107,0.06)] px-4 py-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#18a86b] text-[13px] text-white">✓</span>
                <span className="font-[family-name:var(--font-syne)] text-[13px] font-semibold text-[#18a86b]">{record.farmName} is active — moved to Active Client in pipeline</span>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-[rgba(212,134,10,0.3)] bg-[rgba(212,134,10,0.05)] px-4 py-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d4860a] text-[13px] text-white">!</span>
                <span className="font-[family-name:var(--font-syne)] text-[13px] font-semibold text-[#d4860a]">Send go-live message, then confirm to move to Active Client</span>
              </div>
            )
          }
          <Section title="Send go-live message to client" step="1">
            <TemplateBlock text={goLiveText} phone={record.contactPhone} label="Copy go-live message" />
          </Section>
          {!record.activeClientConfirmed && (
            <Section title="Move to Active Client" step="2">
              <p className="mb-3 text-[11px] text-gray-500">Once the go-live message has been sent, confirm below. This moves the client to Active Client in the LL pipeline.</p>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdate({ stage: 'review' })} className="rounded-lg border border-[rgba(0,0,0,0.1)] px-4 py-2 text-[12px] text-gray-500 hover:bg-gray-50">← Back to review</button>
                <button onClick={() => onUpdate({ activeClientConfirmed: true })} className="rounded-lg bg-[#18a86b] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#148f5a]">Go-live sent — confirm Active Client ✓</button>
              </div>
            </Section>
          )}
          <Section title="Summary" step="i">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
              {[['Farm', record.farmName], ['Staff loaded', String(record.staffCount)], ['Contact', record.contactName], ['WhatsApp', record.contactPhone], ['Email', record.contactEmail]].map(([k, v]) => (
                <div key={k} className="flex gap-2 py-1 border-b border-[rgba(0,0,0,0.05)]">
                  <span className="text-gray-400 w-16 shrink-0">{k}</span>
                  <span className="text-gray-800">{v || '—'}</span>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {record.stage !== 'ready' && (
        <Section title="Notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => onUpdate({ notes })}
            rows={3} placeholder="Internal notes…"
            className="w-full resize-none rounded-lg border border-[rgba(0,0,0,0.1)] bg-gray-50 px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#3a6bef]" />
        </Section>
      )}
    </div>
  )
}

// ─── Generic new-record form ───────────────────────────────────────────────────
function NewSLForm({ onSave, onCancel }: { onSave: (r: SLOnboardingRecord) => void; onCancel: () => void }) {
  const [orgName, setOrgName] = useState(''); const [district, setDistrict] = useState('')
  const [contactName, setContact] = useState(''); const [contactPhone, setPhone] = useState('')
  function save() {
    if (!orgName.trim()) return
    const now = new Date().toISOString()
    onSave({ id: `sl-ob-${Date.now()}`, orgName: orgName.trim(), district: district.trim(), contactName: contactName.trim(), contactPhone: contactPhone.trim(), stage: 'info-requested', admins: [], notes: '', createdAt: now, updatedAt: now })
  }
  return (
    <div className="rounded-xl border border-[rgba(58,107,239,0.2)] bg-white p-4">
      <p className="font-[family-name:var(--font-syne)] mb-3 text-[13px] font-semibold text-gray-900">New SafeLink client</p>
      <div className="space-y-2">
        {[['Organisation name *', orgName, setOrgName], ['District', district, setDistrict], ['Contact person', contactName, setContact], ['WhatsApp number', contactPhone, setPhone]].map(([ph, v, set]) => (
          <input key={ph as string} value={v as string} onChange={e => (set as (s: string) => void)(e.target.value)} placeholder={ph as string}
            className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-gray-50 px-3 py-2 text-[12px] outline-none focus:border-[#3a6bef]" />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={save} className="rounded-lg bg-[#3a6bef] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#2d5adf]">Create</button>
        <button onClick={onCancel} className="rounded-lg border border-[rgba(0,0,0,0.1)] px-4 py-1.5 text-[12px] text-gray-500 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  )
}

function NewLLForm({ onSave, onCancel }: { onSave: (r: LLOnboardingRecord) => void; onCancel: () => void }) {
  const [farmName, setFarm] = useState(''); const [area, setArea] = useState('')
  const [contactName, setContact] = useState(''); const [contactPhone, setPhone] = useState('')
  function save() {
    if (!farmName.trim()) return
    const now = new Date().toISOString()
    onSave({ id: `ll-ob-${Date.now()}`, farmName: farmName.trim(), area: area.trim(), contactName: contactName.trim(), contactPhone: contactPhone.trim(), contactEmail: '', billingAddress: '', pinLocation: '', staffCount: 0, csvReceived: false, stage: 'info-requested', notes: '', createdAt: now, updatedAt: now })
  }
  return (
    <div className="rounded-xl border border-[rgba(58,107,239,0.2)] bg-white p-4">
      <p className="font-[family-name:var(--font-syne)] mb-3 text-[13px] font-semibold text-gray-900">New Labour Link client</p>
      <div className="space-y-2">
        {[['Farm name *', farmName, setFarm], ['Area / Region', area, setArea], ['Contact person', contactName, setContact], ['WhatsApp number', contactPhone, setPhone]].map(([ph, v, set]) => (
          <input key={ph as string} value={v as string} onChange={e => (set as (s: string) => void)(e.target.value)} placeholder={ph as string}
            className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-gray-50 px-3 py-2 text-[12px] outline-none focus:border-[#3a6bef]" />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={save} className="rounded-lg bg-[#3a6bef] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#2d5adf]">Create</button>
        <button onClick={onCancel} className="rounded-lg border border-[rgba(0,0,0,0.1)] px-4 py-1.5 text-[12px] text-gray-500 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
type Product = 'll' | 'sl'

export function OnboardingClient({
  initialSL,
  initialLL,
}: {
  initialSL: SLOnboardingRecord[]
  initialLL: LLOnboardingRecord[]
}) {
  const [product, setProduct]   = useState<Product>('ll')
  const [slRecords, setSL]      = useState(initialSL)
  const [llRecords, setLL]      = useState(initialLL)
  const [selectedId, setSelectedId] = useState<string | null>(initialLL[0]?.id ?? initialSL[0]?.id ?? null)
  const [showNew, setShowNew]   = useState(false)
  const [, startTransition]     = useTransition()

  const selectedSL = slRecords.find(r => r.id === selectedId) ?? null
  const selectedLL = llRecords.find(r => r.id === selectedId) ?? null

  // ── SL mutations ──
  async function mutateSL(id: string, updates: Partial<SLOnboardingRecord>) {
    setSL(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    await fetch(`/api/labour-link/onboarding/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
  }
  async function createSL(r: SLOnboardingRecord) {
    setSL(prev => [...prev, r]); setSelectedId(r.id); setShowNew(false)
    const res = await fetch('/api/labour-link/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) })
    if (res.ok) { const saved: SLOnboardingRecord = await res.json(); setSL(prev => prev.map(x => x.id === saved.id ? saved : x)) }
  }
  async function deleteSL(id: string) {
    startTransition(() => { const rem = slRecords.filter(r => r.id !== id); setSL(rem); setSelectedId(rem[0]?.id ?? llRecords[0]?.id ?? null) })
    await fetch(`/api/labour-link/onboarding/${id}`, { method: 'DELETE' })
  }

  // ── LL mutations ──
  async function mutateLL(id: string, updates: Partial<LLOnboardingRecord>) {
    setLL(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    await fetch(`/api/labour-link/ll-onboarding/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
  }
  async function createLL(r: LLOnboardingRecord) {
    setLL(prev => [...prev, r]); setSelectedId(r.id); setShowNew(false)
    const res = await fetch('/api/labour-link/ll-onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) })
    if (res.ok) { const saved: LLOnboardingRecord = await res.json(); setLL(prev => prev.map(x => x.id === saved.id ? saved : x)) }
  }
  async function deleteLL(id: string) {
    startTransition(() => { const rem = llRecords.filter(r => r.id !== id); setLL(rem); setSelectedId(rem[0]?.id ?? slRecords[0]?.id ?? null) })
    await fetch(`/api/labour-link/ll-onboarding/${id}`, { method: 'DELETE' })
  }

  const activeRecords = product === 'll'
    ? llRecords.filter(r => r.stage !== 'ready')
    : slRecords.filter(r => r.stage !== 'onboarded')
  const doneRecords = product === 'll'
    ? llRecords.filter(r => r.stage === 'ready')
    : slRecords.filter(r => r.stage === 'onboarded')

  function stageColor(r: LLOnboardingRecord | SLOnboardingRecord) {
    if ('orgName' in r) return SL_STAGE_COLORS[r.stage as SLOnboardingStage]
    return LL_STAGE_COLORS[r.stage as LLOnboardingStage]
  }
  function stageLabel(r: LLOnboardingRecord | SLOnboardingRecord) {
    if ('orgName' in r) return SL_STAGE_LABELS[r.stage as SLOnboardingStage]
    return LL_STAGE_LABELS[r.stage as LLOnboardingStage]
  }
  function recordName(r: LLOnboardingRecord | SLOnboardingRecord) {
    return 'orgName' in r ? r.orgName : r.farmName
  }

  return (
    <div className="flex h-full overflow-hidden font-[family-name:var(--font-dm-mono)]">
      {/* ── Left list ── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-[rgba(0,0,0,0.08)] bg-[#f8f9fb]">
        {/* Product tabs */}
        <div className="flex border-b border-[rgba(0,0,0,0.08)]">
          {(['ll', 'sl'] as Product[]).map(p => (
            <button key={p} onClick={() => { setProduct(p); setShowNew(false); const first = p === 'll' ? llRecords[0]?.id : slRecords[0]?.id; setSelectedId(first ?? null) }}
              className={cn('flex-1 py-2.5 text-[11px] font-medium transition-colors',
                product === p ? 'border-b-2 border-[#3a6bef] text-[#3a6bef]' : 'text-gray-500 hover:text-gray-700')}>
              {p === 'll' ? 'Labour Link' : 'Safe Link'}
            </button>
          ))}
        </div>

        <div className="px-4 py-2.5 border-b border-[rgba(0,0,0,0.08)]">
          <p className="text-[11px] text-gray-400">{activeRecords.length} active · {doneRecords.length} done</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {activeRecords.length > 0 && (
            <>
              <p className="mb-1 px-2 text-[10px] uppercase tracking-widest text-gray-400">In progress</p>
              {activeRecords.map(r => (
                <button key={r.id} onClick={() => { setSelectedId(r.id); setShowNew(false) }}
                  className={cn('mb-1 w-full rounded-lg border px-3 py-2 text-left transition-colors',
                    selectedId === r.id ? 'border-[rgba(58,107,239,0.25)] bg-[rgba(58,107,239,0.07)]' : 'border-transparent bg-white hover:bg-white')}>
                  <p className="text-[12px] font-medium text-gray-900 truncate">{recordName(r)}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: stageColor(r) }} />
                    {stageLabel(r)}
                  </p>
                </button>
              ))}
            </>
          )}
          {doneRecords.length > 0 && (
            <>
              <p className="mb-1 mt-3 px-2 text-[10px] uppercase tracking-widest text-gray-400">Onboarded</p>
              {doneRecords.map(r => (
                <button key={r.id} onClick={() => { setSelectedId(r.id); setShowNew(false) }}
                  className={cn('mb-1 w-full rounded-lg border px-3 py-2 text-left transition-colors',
                    selectedId === r.id ? 'border-[rgba(24,168,107,0.25)] bg-[rgba(24,168,107,0.06)]' : 'border-transparent bg-white hover:bg-white')}>
                  <p className="text-[12px] font-medium text-gray-900 truncate">{recordName(r)}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#18a86b]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#18a86b]" />
                    Active Client
                  </p>
                </button>
              ))}
            </>
          )}
          {activeRecords.length === 0 && doneRecords.length === 0 && !showNew && (
            <p className="px-2 pt-4 text-[12px] text-gray-400">No clients yet.</p>
          )}
          {showNew && (
            <div className="mt-2">
              {product === 'sl'
                ? <NewSLForm onSave={createSL} onCancel={() => setShowNew(false)} />
                : <NewLLForm onSave={createLL} onCancel={() => setShowNew(false)} />
              }
            </div>
          )}
        </div>

        <div className="border-t border-[rgba(0,0,0,0.08)] p-3">
          <button onClick={() => { setShowNew(true); setSelectedId(null) }}
            className="w-full rounded-lg bg-[#3a6bef] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#2d5adf]">
            + New client
          </button>
        </div>
      </aside>

      {/* ── Right detail ── */}
      <div className="flex-1 overflow-hidden bg-[#f0f2f5]">
        {product === 'sl' && selectedSL && (
          <SLDetailPanel key={selectedSL.id} record={selectedSL} onUpdate={u => mutateSL(selectedSL.id, u)} onDelete={() => deleteSL(selectedSL.id)} />
        )}
        {product === 'll' && selectedLL && (
          <LLDetailPanel key={selectedLL.id} record={selectedLL} onUpdate={u => mutateLL(selectedLL.id, u)} onDelete={() => deleteLL(selectedLL.id)} />
        )}
        {!selectedSL && !selectedLL && (
          <div className="flex h-full items-center justify-center">
            <p className="text-[13px] text-gray-400">Select a client or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  )
}
