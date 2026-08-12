import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

/**
 * Les conditions affichées dans l'application et celles publiées sur le site
 * doivent dire la même chose.
 *
 * **Le piège que cette suite empêche** : modifier le texte dans
 * `src/partage/conditions.ts` et oublier de régénérer les pages, ou l'inverse.
 * L'utilisateur lirait alors sur le site autre chose que ce qu'il a accepté
 * dans l'application — et personne ne saurait laquelle des deux versions
 * l'engage.
 *
 * C'est la même vérification que dans Scenika et Ohmnia, pour la même raison.
 */
const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lire = (relatif) => readFileSync(join(RACINE, relatif), 'utf-8').replaceAll('\r\n', '\n')

let echecs = 0
const echec = (message) => {
  console.log(`  ÉCHEC : ${message}`)
  echecs += 1
}

const source = lire('src/partage/conditions.ts')

/* ── 1. Le texte du code se retrouve sur les deux pages ──────────────────── */

const pageFr = lire('docs/conditions.html')
const pageEn = lire('docs/en/terms.html')

// Les paragraphes sont les longues chaînes du fichier source. On ne compare
// pas les courtes : « fr », « en » et les clés techniques n'ont rien à faire
// sur une page.
const bloc = source.slice(
  source.indexOf('export const CONDITIONS_UTILISATION'),
  source.indexOf('/** Ce qu’on retient')
)

const francais = []
const anglais = []
for (const trouve of bloc.matchAll(/(fr|en): (['"])((?:[^\\]|\\.)*?)\2/g)) {
  const [, langue, , texte] = trouve
  if (texte.length < 60) continue
  ;(langue === 'fr' ? francais : anglais).push(texte)
}

if (francais.length < 12) {
  echec(`seulement ${francais.length} paragraphes français trouvés — le format a changé`)
}
if (anglais.length !== francais.length) {
  echec(`${francais.length} paragraphes en français, ${anglais.length} en anglais`)
}

const normaliser = (texte) => texte.replaceAll("\\'", "'")

for (const paragraphe of francais) {
  if (!pageFr.includes(normaliser(paragraphe))) {
    echec(`paragraphe absent de docs/conditions.html : « ${paragraphe.slice(0, 60)}… »`)
  }
}
for (const paragraphe of anglais) {
  if (!pageEn.includes(normaliser(paragraphe))) {
    echec(`paragraphe absent de docs/en/terms.html : « ${paragraphe.slice(0, 60)}… »`)
  }
}

/* ── 2. La version affichée suit celle du code ───────────────────────────── */

const version = source.match(/VERSION_CONDITIONS = '([^']+)'/)?.[1]
if (!version) echec('VERSION_CONDITIONS introuvable')
else {
  for (const [nom, page] of [['docs/conditions.html', pageFr], ['docs/en/terms.html', pageEn]]) {
    if (!page.includes(`VERSION ${version}`)) {
      echec(`${nom} n'affiche pas « VERSION ${version} »`)
    }
  }
}

/* ── 3. Ce qui ne doit jamais disparaître ────────────────────────────────── */

// Le point 2 est la raison d'être de ces conditions : ni le calcul ni le
// conseil de placement ne remplacent une étude acoustique. Une carte de
// couleurs — et plus encore un placement recommandé — est très convaincante
// même quand elle est fausse. Si quelqu'un allège un jour ce point, cette
// suite doit le dire, et pas seulement en français.
const engagements = [
  ['ne remplacent une étude acoustique', pageFr, 'français'],
  ['replace an acoustic study', pageEn, 'anglais'],
  ['une proposition fondée sur un modèle simplifié', pageFr, 'français'],
  ['not a certainty, it is a proposal', pageEn, 'anglais'],
  ['ne ressemble jamais exactement au modèle', pageFr, 'français'],
  ['never exactly matches the model', pageEn, 'anglais']
]
for (const [phrase, page, langue] of engagements) {
  if (!page.includes(phrase)) {
    echec(`la mise en garde « ${phrase} » a disparu de la page en ${langue}`)
  }
}

// Ce contrôle-ci a un précédent qui n'a pas mordu au premier essai chez
// Scenika : les phrases de référence portaient une apostrophe droite, les
// pages une apostrophe typographique. Il ne pouvait donc **jamais** échouer,
// tout en affichant OK — le pire cas de figure. Les tournures retenues ici
// évitent l'apostrophe, et le contrôle ci-dessous vérifie qu'elles existent
// bien dans la source : une tournure introuvable des deux côtés serait à
// nouveau un contrôle mort.
for (const [phrase, , langue] of engagements) {
  if (!source.includes(phrase)) {
    echec(
      `la tournure « ${phrase} » (${langue}) ne figure plus dans conditions.ts : ` +
        'ce contrôle ne vérifierait plus rien'
    )
  }
}

/* ── 4. L'écran d'acceptation ne peut pas être contourné ─────────────────── */

const ecran = lire('src/renderer/src/components/ConditionsUtilisation.tsx')
if (!/disabled=\{!luJusquauBout\}/.test(ecran)) {
  echec("la case s'active sans que le texte ait été lu jusqu'au bout")
}
if (!/disabled=\{!coche\}/.test(ecran)) {
  echec("le bouton d'acceptation ne dépend plus de la case")
}

const app = lire('src/renderer/src/App.tsx')
if (!app.includes('if (!conditionsAcceptees)')) {
  echec("l'application ne bloque plus sur l'écran des conditions")
}
if (!app.includes('VERSION_CONDITIONS')) {
  echec("l'acceptation n'est plus liée à la version : un texte modifié passerait sans relecture")
}

/* ── 5. Les pages existent et sont servables ─────────────────────────────── */

for (const page of ['docs/conditions.html', 'docs/en/terms.html']) {
  if (!existsSync(join(RACINE, page))) echec(`${page} est absent`)
}

console.log(
  echecs === 0
    ? `CONDITIONS COHÉRENTES (${francais.length} paragraphes, version ${version}, deux langues)`
    : `${echecs} PROBLÈME(S) SUR LES CONDITIONS`
)
process.exit(echecs === 0 ? 0 : 1)
