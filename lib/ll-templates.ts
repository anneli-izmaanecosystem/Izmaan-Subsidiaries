import type { LeadStage } from './ll-types'

export interface Template {
  id: string
  label: string
  text: string
}

export const TEMPLATES: Template[] = [
  {
    id: 'intro-ll-af',
    label: 'Initial Outreach — Labour Link (Afrikaans)',
    text: `Hallo [NAAM],

Ek is Mara van Labour Link — 'n plaassekuriteitsplatform vir Suid-Afrikaanse boere.

Ons help plase om:
✅ Werkers te verifieer (biometrie & ID)
✅ Risiko's te vermy — vlagwerk werkers met misdrywe by ander plase
✅ Wetgewing na te kom sonder papierwerk

Koste: slegs R5 per werker per maand. Geen opstelkoste.

Mag ek vir jou 'n kort video stuur wat wys hoe dit werk?

Mara — Labour Link
+27 60 816 8200`,
  },
  {
    id: 'intro-ll-en',
    label: 'Initial Outreach — Labour Link (English)',
    text: `Hi [NAME],

I'm Mara from Labour Link — a farm security platform built for South African farmers.

We help farms:
✅ Verify workers (biometrics & ID)
✅ Avoid hiring risks — flag workers with incident history at other farms
✅ Stay labour law compliant without the paperwork

Cost: only R5 per worker per month. No setup fees.

Can I send you a short video showing how it works?

Mara — Labour Link
+27 60 816 8200`,
  },
  {
    id: 'followup-7',
    label: '7-Day Follow-up (no response)',
    text: `Hallo [NAAM],

Ek het verlede week vir jou gestuur oor Labour Link. Ek wou net 'n laaste keer uitreik voordat ek jou met vrede laat.

As julle ooit 'n plaassekuriteitsoplossing nodig het — werkersverifikasie, insidentelogging, of wetgewingsnakoming — is ons hier.

WhatsApp my gerus as jy ooit meer wil weet.

Mara
+27 60 816 8200`,
  },
  {
    id: 'meeting-confirm',
    label: 'Meeting Confirmation',
    text: `Hallo [NAAM],

Dankie vir jou tyd vandag. Dit was 'n plesier om met jou te gesels oor Labour Link.

Om voort te gaan, het ek die volgende nodig:

Jou kontakbesonderhede:
• E-posadres
• WhatsApp nommer

Plaasbesonderhede:
• Plaasnaam
• Pin-ligging (Google Maps-skakel of koördinate)
• Faktureringsadres

Personeeldata:
• CSV-uitvoer van alle aktiewe werknemers

Sodra ek die bogenoemde het, kan ons jou profiel opstel en gereed stel.

Mara — Labour Link`,
  },
  {
    id: 'onboarding-info',
    label: 'Onboarding Info Request',
    text: `Hallo [NAAM],

Goeie nuus — ons is gereed om jou aan boord te neem!

Stuur asseblief die volgende vir my:

1. E-posadres
2. WhatsApp nommer
3. Plaasnaam
4. Google Maps pin-ligging
5. Faktureringsadres
6. CSV-lys van alle aktiewe werknemers (naam, ID, posisie)

Sodra ek dit ontvang, gee ek dit aan ons tegniese span en julle profiel word binne 24-48 uur opgestal.

Mara`,
  },
  {
    id: 'checkin-day3',
    label: 'Day 3 Check-in (post-onboarding)',
    text: `Hallo [NAAM],

Ek hoop julle is tuis met Labour Link! Net 'n vinnige toets:

Gebruik julle die stelsel al? Het julle al 'n insident of goeie daad via WhatsApp ingevoer?

Laat weet as ek kan help met enigiets.

Mara — Labour Link`,
  },
  {
    id: 'checkin-day7',
    label: 'Day 7 Check-in (post-onboarding)',
    text: `Hallo [NAAM],

'n Week sedert julle op Labour Link is — hoe verloop dit?

• Is die werkerslyste korrek?
• Gebruik julle WhatsApp vir insidente?
• Enige tegniese vrae?

Ons wil seker maak julle kry waarde uit die stelsel. WhatsApp my gerus.

Mara`,
  },
  {
    id: 'sl-intro',
    label: 'Safe Link — Initial Outreach (Security Companies)',
    text: `Hallo [NAAM],

Ek is Mara van Labour Link. Ons het onlangs Safe Link bekendgestel — 'n digitale insidentelogging- en personeelbestuurplatform vir sekuriteitmaatskappye.

Dit stel julle in staat om:
✅ Sekuriteitspersoneel te verifieer en te registreer
✅ Insidente intyds aan te meld via WhatsApp
✅ 'n Risikobeoordelingstelsel te gebruik vir personeelbestuur

Mag ek 'n kort aanbieding reël om te wys hoe dit werk?

Mara — Labour Link
+27 60 816 8200`,
  },
  {
    id: 'rural-chair',
    label: 'Rural Safety Chairperson Outreach',
    text: `Hallo [NAAM],

Ek is Mara van Labour Link. Ons werk tans met verskeie landelike veiligheidsstrukture en plaaswagverenigings in Limpopo.

Ons Safe Link-platform help julle area om:
✅ Insidente digitaal te log via WhatsApp
✅ Verdagte persone oor die netwerk te deel
✅ 'n Sentrale databasis van insidente vir julle gebied te bou

Baie voorsitters het gevind dat een registrasie die hele omgewing se plase kan beskerm.

Mag ek 'n kort aanlynvergadering reël om dit te wys?

Mara — Labour Link
+27 60 816 8200`,
  },
  {
    id: 'dongola-fu',
    label: 'Dongola — Follow-up: Onboarding & Invoicing',
    text: `Hallo Izak,

Ek wou net gou opvolg oor Dongola se Labour Link-aanboording.

Kan jy asseblief bevestig:
1. Is alle personeellede reeds op die stelsel geonboard?
2. Is daar nog iemand uitstaande wat ons moet byvoeg?

Ek het ook julle faktureringbesonderhede nodig om die rekening op te stel:
• Maatskappynaam (soos op rekening)
• Faktureringsadres
• Kontakpersoon vir rekeninge
• E-posadres vir fakture

WhatsApp my gerus as jy vrae het.

Mara — Labour Link
+27 60 816 8200`,
  },
]

export function getTemplateForStage(
  stage: LeadStage,
  pipeline: 'll' | 'sl',
  name?: string,
): Template {
  let tpl: Template | undefined

  if (pipeline === 'sl') {
    tpl = TEMPLATES.find(t => t.id === 'sl-intro')
  } else {
    const map: Record<string, string> = {
      'New Lead':     'intro-ll-af',
      'Contacted':    'followup-7',
      'Meeting Done': 'meeting-confirm',
      'Onboarding':   'onboarding-info',
      'Active Client':'checkin-day7',
    }
    tpl = TEMPLATES.find(t => t.id === map[stage])
  }

  const base = tpl ?? TEMPLATES[0]
  if (!name) return base

  return {
    ...base,
    text: base.text
      .replace(/\[NAAM\]/g, name)
      .replace(/\[NAME\]/g, name),
  }
}

export function formatWAUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('27') ? digits : digits.startsWith('0') ? '27' + digits.slice(1) : digits
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}
