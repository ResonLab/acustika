import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

/**
 * Analyse d'un fichier CLF binaire — **pour comprendre, pas pour lire**.
 *
 * **La consigne de la maison est de ne pas écrire ce lecteur au jugé**, et ce
 * script existe pour la respecter, pas pour la contourner. La chaîne est :
 * fichier → directivité → carte de couverture → conseil de placement. Un octet
 * mal interprété, et Acustika conseille un placement faux avec une explication
 * parfaitement articulée. Il vaut mieux ne pas lire un fichier que le lire de
 * travers.
 *
 * Ce script ne produit donc aucune donnée d'enceinte. Il relève ce qui est
 * **mesurable** dans les deux fichiers réels de `tests/fichiers/` — leur
 * structure, leurs suites de flottants, les découpages qui tombent juste — et
 * il dit ce qui reste hors de portée. C'est un instrument de mesure, pas un
 * lecteur.
 *
 *   node scripts/analyser-clf.mjs
 */
const PROJET = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Les bandes d'octave qu'un fichier de directivité couvre habituellement. */
const BANDES_PLAUSIBLES = [6, 7, 8, 9, 10]

/** Les pas angulaires courants, en degrés, et le nombre de points d'un ballon. */
const RESOLUTIONS = [2, 5, 10, 15]

function ballon(pas) {
  // Un tour complet en azimut, un demi-tour en élévation, bornes comprises.
  return { horizontal: 360 / pas, vertical: 180 / pas + 1 }
}

function lireFlottants(tampon, debut, fin) {
  const valeurs = []
  for (let i = debut; i + 4 <= fin; i += 4) valeurs.push(tampon.readFloatLE(i))
  return valeurs
}

/** Une valeur qui ressemble à une atténuation en décibels. */
// **La borne haute a d'abord été fixée à +0,5 dB, et elle coupait les blocs.**
// Une directivité normalisée dépasse zéro dans l'axe le plus fort, et un gain de
// quelques décibels est parfaitement banal. Le critère tranchait alors un même
// ballon en cinq morceaux, dont aucun ne se factorisait — un découpage inventé
// par l'instrument, pas par le fichier.
const estUnDb = (v) => Number.isFinite(v) && v <= 20 && v >= -200

/**
 * Les plages du fichier où les flottants se tiennent : au moins `minimum`
 * valeurs consécutives qui ressemblent toutes à des décibels.
 *
 * **Le critère est volontairement grossier**, et c'est assumé : on cherche où
 * regarder, pas ce que ça veut dire. Une plage repérée ici ne prouve pas qu'on
 * a compris le format — elle dit seulement qu'il y a là une suite de nombres
 * qui se comportent comme une courbe.
 */
function plagesDeDb(tampon, minimum = 64) {
  const plages = []
  let debut = null
  for (let i = 0; i + 4 <= tampon.length; i += 4) {
    const v = tampon.readFloatLE(i)
    if (estUnDb(v)) {
      if (debut === null) debut = i
    } else {
      if (debut !== null && (i - debut) / 4 >= minimum) plages.push({ debut, fin: i })
      debut = null
    }
  }
  if (debut !== null && (tampon.length - debut) / 4 >= minimum) {
    plages.push({ debut, fin: tampon.length })
  }
  return plages
}

/** Les chaînes lisibles, avec leur position — ce sont les repères du fichier. */
function chaines(tampon, longueurMin = 6) {
  const trouvees = []
  let debut = null
  for (let i = 0; i < tampon.length; i += 1) {
    const o = tampon[i]
    const imprimable = o >= 0x20 && o <= 0x7e
    if (imprimable) {
      if (debut === null) debut = i
    } else {
      if (debut !== null && i - debut >= longueurMin) {
        trouvees.push({ position: debut, texte: tampon.toString('latin1', debut, i) })
      }
      debut = null
    }
  }
  return trouvees
}

/**
 * Les découpages qui tombent juste.
 *
 * **C'est le cœur de l'analyse, et c'est là que se trouve la preuve — ou son
 * absence.** Si une plage de flottants contient exactement
 * `bandes × horizontal × vertical` valeurs pour une résolution angulaire
 * courante, ce n'est pas une coïncidence : c'est un ballon de directivité. Si
 * aucun découpage ne tombe juste, il ne faut **rien en déduire** — et c'est ce
 * résultat-là qu'il faut écrire honnêtement plutôt qu'arrondir.
 */
function diviseurs(n) {
  const d = []
  for (let i = 1; i * i <= n; i += 1) {
    if (n % i === 0) {
      d.push(i)
      if (i !== n / i) d.push(n / i)
    }
  }
  return d.sort((x, y) => x - y)
}

function decoupagesPlausibles(nombreDeValeurs) {
  const trouves = []
  for (const pas of RESOLUTIONS) {
    const { horizontal, vertical } = ballon(pas)
    if (!Number.isInteger(horizontal)) continue
    const parBande = horizontal * vertical
    for (const bandes of BANDES_PLAUSIBLES) {
      if (bandes * parBande === nombreDeValeurs) {
        trouves.push({ pas, horizontal, vertical, parBande, bandes, exact: true })
      }
    }
    if (nombreDeValeurs % parBande === 0) {
      const bandes = nombreDeValeurs / parBande
      if (!trouves.some((t) => t.pas === pas && t.bandes === bandes)) {
        trouves.push({ pas, horizontal, vertical, parBande, bandes, exact: false })
      }
    }
  }
  return trouves
}

for (const nom of ['cls-3300.CF1', 'Coax8.CF2']) {
  const tampon = readFileSync(join(PROJET, 'tests/fichiers', nom))
  console.log(`\n════════ ${nom} — ${tampon.length} octets`)

  console.log(`  premier octet : 0x${tampon[0].toString(16)}`)
  console.log(`  version à 0x14 : « ${tampon.toString('latin1', 0x14, 0x19)} »`)
  console.log(`  marqueur à 0x1a : ${tampon.toString('hex', 0x1a, 0x1c)}`)

  console.log('\n  ── Les chaînes lisibles ──')
  const textes = chaines(tampon)
  for (const { position, texte } of textes.slice(0, 12)) {
    console.log(`  0x${position.toString(16).padStart(6, '0')}  ${texte.slice(0, 62)}`)
  }
  if (textes.length > 12) console.log(`  … et ${textes.length - 12} autre(s)`)

  console.log('\n  ── Les suites de valeurs en décibels ──')
  const plages = plagesDeDb(tampon)
  if (plages.length === 0) console.log('  aucune suite assez longue')
  let total = 0
  for (const { debut, fin } of plages) {
    const valeurs = lireFlottants(tampon, debut, fin)
    total += valeurs.length
    const extrait = valeurs.slice(0, 6).map((v) => v.toFixed(1)).join(' · ')
    // **La part de zéros est affichée, et c'est le garde-fou de tout le
    // script.** Un long remplissage de zéros passe tous les critères — ce sont
    // des flottants finis, dans la plage des décibels — et se factorise
    // magnifiquement. La première analyse a ainsi « trouvé » 30 bandes de 72×37
    // dans un bloc de 80 168 valeurs **toutes nulles**. Une plage majoritairement
    // nulle n'est pas une donnée : c'est de la place réservée.
    const nuls = valeurs.filter((v) => v === 0).length
    const partNulle = Math.round((nuls / valeurs.length) * 100)
    console.log(
      `  0x${debut.toString(16).padStart(6, '0')} → 0x${fin.toString(16).padStart(6, '0')}` +
        `  ${String(valeurs.length).padStart(6)} valeurs  ${String(partNulle).padStart(3)} % nuls` +
        `${partNulle > 50 ? '  ← remplissage, pas des données' : ''}  [${extrait}…]`
    )
  }
  console.log(`  total : ${total} valeurs`)

  console.log('\n  ── Découpages qui tomberaient juste ──')
  for (const { debut, fin } of plages) {
    const n = (fin - debut) / 4
    const decoupages = decoupagesPlausibles(n)
    if (decoupages.length === 0) {
      console.log(`  0x${debut.toString(16).padStart(6, '0')} (${n} valeurs) : aucun`)
      continue
    }
    for (const d of decoupages) {
      console.log(
        `  0x${debut.toString(16).padStart(6, '0')} (${n} valeurs) : ` +
          `${d.bandes} bande(s) × ${d.horizontal}×${d.vertical} au pas de ${d.pas}°` +
          `${d.exact ? '  ← nombre de bandes plausible' : ''}`
      )
    }
  }
}

console.log(`
════════ Une hypothèse séduisante, et pourquoi elle est fausse

L'arithmétique semblait tomber juste : CF2 contenait de quoi loger 30 bandes de
72 × 37 au pas de 5°, CF1 une dizaine de bandes de 36 × 19 au pas de 10°. C'est
exactement le genre de coïncidence qui donne envie d'écrire le lecteur.

**Elle a été mise à l'épreuve et elle est tombée.** Un ballon de directivité a
une propriété que l'arithmétique ignore : **aux deux pôles, tous les azimuts
décrivent le même point du monde**, donc leurs valeurs doivent être identiques.
Le test montre des écarts de 40 dB là où il faudrait zéro — et là où il donne
zéro, c'est parce que le bloc est **entièrement nul**. Le découpage comptait du
remplissage.

Sans ce contrôle, on aurait écrit un lecteur qui rend des directivités fausses
avec l'aplomb des vraies, et Acustika aurait conseillé des placements faux avec
une explication parfaitement articulée.

════════ Ce que cette analyse ne dit pas

Elle repère des suites de nombres qui se comportent comme des décibels, et des
découpages arithmétiquement compatibles avec un ballon de directivité. **Cela ne
suffit pas à écrire un lecteur.** Il manque toujours l'ordre : quelle bande
vient en premier, l'azimut avant l'élévation ou l'inverse, et où commence le
zéro angulaire. Trois inconnues qu'aucune arithmétique ne tranche, et dont
chacune produit une carte de couverture crédible et fausse.

Les deux chemins qui les trancheraient restent ceux du CONTEXTE :
  1. un fichier **.CIF**, en texte, que CLF Authoring compile en CF1/CF2 ;
  2. **CLF Viewer**, en relevant deux ou trois valeurs à l'écran — « à 1 kHz,
     −6 dB vers 45° » — ce qui transforme une hypothèse en certitude.

Les deux outils sont gratuits sur clfgroup.org. Tant qu'aucun des deux n'a été
utilisé, \`commun/polaire.js\` a raison de refuser un binaire avec un message qui
dit quoi faire.`)
