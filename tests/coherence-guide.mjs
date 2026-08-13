import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Le guide de prise en main, et ses deux pages.
 *
 * **Le texte vit dans `src/partage/guide.ts` et nulle part ailleurs.** Cette
 * suite refuse que les pages en divergent — c'est le même mécanisme que pour
 * les conditions, et pour la même raison : une explication périmée est pire
 * qu'une explication absente, parce qu'on la suit.
 *
 * Elle refuse aussi qu'une étape perde son **piège**. Les pièges sont la moitié
 * de la valeur du guide : la distance négative d'une perche de face, le bloc de
 * gradateurs qui mange des canaux DMX, le seuil à zéro qui ne surveille rien.
 * Ce sont exactement les choses qu'on ne devine pas et qui coûtent une soirée.
 */
const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const lire = (relatif) => readFileSync(join(RACINE, relatif), 'utf-8').replaceAll('\r\n', '\n')

let echecs = 0
const echec = (message) => {
  console.log(`  ÉCHEC : ${message}`)
  echecs += 1
}

const source = lire('src/partage/guide.ts')
const pageFr = lire('docs/guide.html')
const pageEn = lire('docs/en/guide.html')

/* ── 1. Autant de sections et d'étapes des deux côtés ────────────────────── */

const bloc = source.slice(source.indexOf('export const GUIDE'), source.indexOf("/** Ce qu'on retient"))

const sections = bloc.split(/\n  \{\n    titre:/).length - 1
const etapes = [...bloc.matchAll(/\n      \{\n        titre:/g)].length
const pieges = [...bloc.matchAll(/\n        piege:/g)].length

if (sections < 4) echec(`seulement ${sections} sections lues dans guide.ts — le format a changé`)
if (etapes < 6) echec(`seulement ${etapes} étapes lues dans guide.ts — le format a changé`)

for (const [nom, page] of [
  ['docs/guide.html', pageFr],
  ['docs/en/guide.html', pageEn]
]) {
  const h2 = [...page.matchAll(/<h2 class="titre reveal">/g)].length
  const h3 = [...page.matchAll(/<h3>/g)].length
  const p = [...page.matchAll(/class="piege"/g)].length

  if (h2 !== sections) echec(`${nom} : ${h2} sections affichées, ${sections} dans la source`)
  if (h3 !== etapes) echec(`${nom} : ${h3} étapes affichées, ${etapes} dans la source`)
  if (p !== pieges) echec(`${nom} : ${p} pièges affichés, ${pieges} dans la source`)
}

/* ── 2. Chaque texte de la source se retrouve dans sa page ───────────────── */

/**
 * Les textes sont relevés **par leur place dans la structure**, pas à leur
 * longueur : un titre court et un texte long se distinguent par où ils sont
 * écrits, jamais par leur taille. Le proxy de longueur a déjà produit un faux
 * échec sur les conditions, et **un faux échec use un contrôle aussi sûrement
 * qu'un faux succès**.
 */
const francais = []
const anglais = []
for (const trouve of bloc.matchAll(/(fr|en): (['"])((?:[^\\]|\\.)*?)\2/g)) {
  ;(trouve[1] === 'fr' ? francais : anglais).push(trouve[3])
}

if (francais.length !== anglais.length) {
  echec(`${francais.length} textes en français, ${anglais.length} en anglais`)
}

// Une traduction vide laisserait les comptes égaux et ferait disparaître une
// étape entière de la page anglaise, sans que rien ne le signale.
for (const [numero, texte] of anglais.entries()) {
  if (texte.trim().length < 10) {
    echec(
      `le texte anglais n° ${numero + 1} est vide ou quasi vide — ` +
        `en français : « ${(francais[numero] ?? '').slice(0, 50)}… »`
    )
  }
}

const normaliser = (texte) => texte.replaceAll("\\'", "'")

for (const texte of francais) {
  if (!pageFr.includes(normaliser(texte))) {
    echec(`texte absent de docs/guide.html : « ${texte.slice(0, 58)}… »`)
    break
  }
}
for (const texte of anglais) {
  if (!pageEn.includes(normaliser(texte))) {
    echec(`texte absent de docs/en/guide.html : « ${texte.slice(0, 58)}… »`)
    break
  }
}

/* ── 3. Ce qui ne doit jamais disparaître du guide ───────────────────────── */

/**
 * Les trois pièges qui font la valeur du guide.
 *
 * **Les tournures surveillées évitent toute apostrophe** : c'est exactement ce
 * qui avait rendu le contrôle des conditions de Scenika incapable d'échouer —
 * des phrases à apostrophe droite comparées à des pages à apostrophe
 * typographique, qui ne pouvaient jamais correspondre tout en affichant OK.
 */
const essentiels = [
  ['avec l’aplomb des vrais', pageFr, 'français'],
  ['with the confidence of right ones', pageEn, 'anglais'],
  ['devient trompeur', pageFr, 'français'],
  ['becomes misleading', pageEn, 'anglais'],
  ['champ direct seul', pageFr, 'français'],
  ['direct field alone', pageEn, 'anglais'],
  ['reste une proposition', pageFr, 'français'],
  ['stays a proposal', pageEn, 'anglais']
]
for (const [phrase, page, langue] of essentiels) {
  if (!page.includes(phrase)) {
    echec(`le piège « ${phrase} » a disparu de la page en ${langue}`)
  }
  // Une tournure introuvable des deux côtés serait un contrôle mort : il
  // passerait sans rien vérifier, ce qui est pire qu'un contrôle absent.
  if (!source.includes(phrase)) {
    echec(
      `la tournure « ${phrase} » (${langue}) ne figure plus dans guide.ts : ` +
        'ce contrôle ne vérifierait plus rien'
    )
  }
}

/* ── 4. Le guide suit l'ordre dans lequel l'application ne refuse rien ───── */

// L'ordre n'est pas décoratif : on ne peut pas poser un appareil absent de
// l'inventaire, ni le patcher sans bloc déclaré. Un guide qui inverse deux
// étapes envoie le lecteur droit sur un message d'erreur.
const ordreAttendu = ['bibliothèque', 'salle', 'enceintes', 'salle', 'conseil']
const titres = [...pageFr.matchAll(/<h2 class="titre reveal">([^<]*)</g)].map((m) =>
  m[1].toLowerCase()
)
ordreAttendu.forEach((mot, index) => {
  if (!titres[index]?.includes(mot)) {
    echec(
      `l'étape ${index + 1} devrait parler de « ${mot} », elle dit « ${titres[index] ?? '—'} » : ` +
        "l'ordre du guide est celui dans lequel l'application ne refuse rien"
    )
  }
})

console.log(
  echecs === 0
    ? `GUIDE COHÉRENT (${sections} sections, ${etapes} étapes, ${pieges} pièges, deux langues)`
    : `${echecs} PROBLÈME(S) SUR LE GUIDE`
)
process.exit(echecs === 0 ? 0 : 1)
