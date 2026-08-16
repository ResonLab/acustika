// Le lecteur CLF, éprouvé contre l'outil de référence.
//
// **Ce que cette suite garde, et pourquoi elle compte plus qu'une autre.**
// Trois hypothèses de découpage ont été formées et réfutées les 15 et 16 août
// 2026. Chacune était arithmétiquement séduisante, et chacune aurait produit
// des directivités fausses avec l'aplomb des vraies — qui auraient nourri la
// carte de couverture ET le conseil de placement.
//
// Le critère retenu est donc celui qui les a tuées : **comparer à une mesure
// que le décodage n'a pas servi à produire.** Les largeurs à −6 dB ci-dessous
// sont lues dans CLF Viewer sur `cls-3300.CF1`, et n'ont joué aucun rôle dans
// l'écriture de `commun/clf.js`.
//
// Aucune installation nécessaire : `node tests/clf.mjs`.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  typeDeFichier,
  lireBallon,
  ouverture,
  ouverturesParBande,
  angleAuSeuil,
  frequencesSupposees
} from '../commun/clf.js'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

let echecs = 0
function verifier(intitule, condition, detail = '') {
  if (!condition) echecs += 1
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${intitule}`)
  if (!condition && detail) console.log(`        ${detail}`)
}

const octets = (chemin) => new Uint8Array(readFileSync(chemin))

/* ── 1. Le type se lit sur le premier octet ─────────────────────────────── */

console.log('=== Reconnaissance du format ===')

const CF1 = join(RACINE, 'tests/fichiers/cls-3300.CF1')
const CF2 = join(RACINE, 'tests/fichiers/Coax8.CF2')

verifier('cls-3300.CF1 est reconnu comme CF1', typeDeFichier(octets(CF1)) === 'CF1')
verifier('Coax8.CF2 est reconnu comme CF2', typeDeFichier(octets(CF2)) === 'CF2')
verifier(
  'un fichier qui ne commence ni par 0x40 ni par 0x41 est refusé',
  typeDeFichier(new Uint8Array(64)) === null
)

/* ── 2. Le ballon est repéré sans offset écrit en dur ───────────────────── */

console.log('\n=== Repérage du ballon ===')

const ballon = lireBallon(octets(CF1))

verifier(
  'huit bandes sont trouvées dans cls-3300.CF1',
  ballon.nombreBandes === 8,
  `${ballon.nombreBandes} bande(s)`
)
verifier(
  'le ballon commence à 0x002e58',
  ballon.offset === 0x002e58,
  `trouvé à 0x${ballon.offset.toString(16)}`
)
verifier(
  'chaque bande fait 36 arcs × 19 points',
  ballon.bandes.every((b) => b.length === 36 * 19)
)

// **La propriété qui a servi à le repérer, revérifiée sur le résultat.** φ = 0
// est l'axe : le même point physique pour les 36 arcs.
const surAxe = ballon.bandes.map((b) => {
  const valeurs = Array.from({ length: 36 }, (_, a) => b[a * 19])
  return Math.max(...valeurs) - Math.min(...valeurs)
})
verifier(
  "l'axe porte la même valeur dans les 36 arcs, pour les huit bandes",
  surAxe.every((ecart) => ecart < 0.01),
  `écart max ${Math.max(...surAxe).toFixed(3)} dB`
)
verifier(
  "l'axe vaut 0 dB, comme l'exige <BALLOON-REF> <relative>",
  ballon.bandes.every((b) => Math.abs(b[0]) < 0.01)
)

// L'étendue doit croître avec la fréquence : une enceinte devient directive
// dans l'aigu. C'est faible comme contrôle, mais un découpage faux le rate.
const etendues = ballon.bandes.map((b) => Math.max(...b) - Math.min(...b))
verifier(
  'la directivité croît de la bande la plus grave à la plus aiguë',
  etendues[0] < etendues[etendues.length - 1] && etendues[0] < 2,
  etendues.map((e) => e.toFixed(1)).join(' · ')
)

/* ── 3. LE contrôle : les largeurs lues dans CLF Viewer ─────────────────── */

console.log('\n=== Comparaison avec CLF Viewer ===')

// Relevées à l'écran sur cls-3300.CF1. **Elles n'ont servi à rien pour écrire
// le lecteur** : c'est ce qui fait d'elles une épreuve et non un ajustement.
const HORIZONTALES_ECRAN = [360, 360, 360, 206, 191, 92, 63, 71]
// Le visualiseur affiche les verticales entre parenthèses, marque d'une valeur
// interpolée : on tolère donc davantage, et on le dit.
const VERTICALES_ECRAN = [360, 360, 360, 86, 44, 21, 8, 46]

const mesure = ouverturesParBande(octets(CF1))

const ecartsH = mesure.horizontales.map((v, i) => Math.abs(v - HORIZONTALES_ECRAN[i]))
const ecartsV = mesure.verticales.map((v, i) => Math.abs(v - VERTICALES_ECRAN[i]))

console.log(
  '        horizontales : ' + mesure.horizontales.map((v) => v.toFixed(0)).join(' · ')
)
console.log('        écran        : ' + HORIZONTALES_ECRAN.join(' · '))

verifier(
  'les huit ouvertures horizontales sont celles du visualiseur, à 1° près',
  ecartsH.every((e) => e <= 1),
  `écart max ${Math.max(...ecartsH).toFixed(1)}°`
)
verifier(
  'les ouvertures verticales suivent, à 7° près (valeurs interpolées à l’écran)',
  ecartsV.every((e) => e <= 7),
  `écart max ${Math.max(...ecartsV).toFixed(1)}°`
)

/* ── 4. Un CF2, sur le même principe ────────────────────────────────────── */

console.log('\n=== Un fichier CF2 ===')

if (existsSync(CF2)) {
  const ballon2 = lireBallon(octets(CF2))
  verifier('le CF2 se lit en 72 arcs × 37 points', ballon2.geometrie.points === 37)
  verifier(
    'ses bandes font 2664 valeurs',
    ballon2.bandes.every((b) => b.length === 72 * 37)
  )
  const axe2 = ballon2.bandes.map((b) => {
    const v = Array.from({ length: 72 }, (_, a) => b[a * 37])
    return Math.max(...v) - Math.min(...v)
  })
  verifier(
    "l'axe est constant sur les 72 arcs",
    axe2.every((e) => e < 0.01),
    `écart max ${Math.max(...axe2).toFixed(3)} dB`
  )
  console.log(`        ${ballon2.nombreBandes} bande(s) à 0x${ballon2.offset.toString(16)}`)
}

/* ── 5. L'interpolation, et ce qu'on refuse d'inventer ──────────────────── */

console.log('\n=== Interpolation et honnêteté ===')

// Le seuil tombe entre deux points : sans interpolation, l'ouverture varierait
// par bonds de 20° au pas de 10°.
verifier(
  "l'angle au seuil est interpolé, pas arrondi",
  Math.abs(angleAuSeuil([0, -3, -9], 10) - 15) < 0.001,
  `obtenu ${angleAuSeuil([0, -3, -9], 10)}`
)
verifier(
  'une courbe qui ne redescend jamais rend null, pas un angle inventé',
  angleAuSeuil([0, -1, -2], 10) === null
)
verifier(
  'et l’ouverture vaut alors 360°, comme le visualiseur l’écrit',
  ouverture(ballon.bandes[0], ballon.geometrie, 'horizontal') === 360
)
verifier(
  'les fréquences supposées suivent la série d’octaves depuis 125 Hz',
  frequencesSupposees(8).join(',') === '125,250,500,1000,2000,4000,8000,16000'
)

console.log(
  echecs === 0
    ? '\nCLF : le ballon lu est celui que montre le visualiseur'
    : `\n${echecs} PROBLÈME(S)`
)
process.exit(echecs === 0 ? 0 : 1)
