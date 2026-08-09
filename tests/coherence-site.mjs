import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

/**
 * Vérifie que le site d'Acustika reste servable et que ses deux langues
 * restent alignées.
 *
 * Le piège que cette suite empêche : traduire une page, puis modifier la
 * française seule. Les deux divergent en silence, et la moitié des lecteurs
 * voit une version périmée sans que rien ne le signale.
 *
 * On ne peut pas comparer une traduction mot à mot — on compare la structure :
 * autant de sections, autant de cartes, autant de titres. Une section ajoutée
 * d'un seul côté se voit immédiatement.
 *
 * Elle contrôle aussi ce qui casse un site statique sans prévenir : un lien
 * mort, une image absente, une ressource chargée depuis un autre serveur.
 */
const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = join(RACINE, 'docs')

let echecs = 0
const echec = (message) => {
  console.log(`  ÉCHEC : ${message}`)
  echecs += 1
}

/* ── 1. Les deux langues ont la même structure ───────────────────────────── */

const fr = readFileSync(join(DOCS, 'index.html'), 'utf-8')
const cheminEn = join(DOCS, 'en/index.html')

if (!existsSync(cheminEn)) {
  echec('docs/en/index.html est absent')
} else {
  const en = readFileSync(cheminEn, 'utf-8')

  const compter = (html, motif) => (html.match(motif) ?? []).length
  const structures = [
    ['sections', /<section\b/g],
    ['cartes', /class="card reveal/g],
    ['titres de section', /<h2 class="titre/g],
    ['titres de carte', /<h3>/g],
    ['boutons', /class="btn\b/g]
  ]
  for (const [nom, motif] of structures) {
    const a = compter(fr, motif)
    const b = compter(en, motif)
    if (a !== b) echec(`${nom} : ${a} en français, ${b} en anglais`)
  }

  // Le CSS et le JavaScript doivent rester identiques : la version anglaise
  // est fabriquée par substitution de texte, elle n'a aucune raison d'avoir
  // sa propre mise en forme. Si les deux divergent, c'est qu'on a édité la
  // page traduite à la main — et la prochaine génération l'écrasera.
  const style = (html) => html.slice(html.indexOf('<style>'), html.indexOf('</style>'))
  if (style(fr) !== style(en)) {
    echec("le CSS des deux langues diffère — la page anglaise a été éditée à la main")
  }

  if (!/<html lang="en">/.test(en)) echec('docs/en/index.html ne déclare pas lang="en"')

  // Un mot français resté dans la page anglaise est le symptôme le plus
  // fréquent d'une substitution oubliée. On ne cherche pas tous les mots :
  // quelques-uns, très fréquents, suffisent à révéler l'oubli.
  const corps = en.slice(en.indexOf('<body'))
  const sansCommentaires = corps.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  for (const mot of [' Ce qu', ' Nos principes', 'Logiciel libre', 'la réponse</span>', 'Une salle']) {
    if (sansCommentaires.includes(mot)) {
      echec(`texte français resté dans la page anglaise : « ${mot.trim()} »`)
    }
  }
}

/* ── 2. La carte trouve sa physique une fois le site préparé ────────── */

// GitHub Pages ne sert que `docs/`. La physique, elle, vit dans `commun/`,
// **hors de `docs/`** — parce qu'elle tourne aussi dans l'application et dans
// les tests. Un import `../commun/acoustique.js` remonterait au-dessus de la
// racine servie : la page s'afficherait et la carte serait morte, sans erreur
// visible avant la mise en ligne. Piège déjà payé sur Scenika.
//
// D'où `npm run site:preparer`, qui en dépose une copie dans `docs/commun/`.
// La copie n'est jamais commitée : la formule vit à un seul endroit.
const pageCarte = readFileSync(join(DOCS, 'carte-couverture.html'), 'utf-8')
if (!pageCarte.includes("from './commun/acoustique.js'")) {
  echec("carte-couverture.html n'importe plus './commun/acoustique.js' — le site publié ne trouverait pas la physique")
}
if (existsSync(join(RACINE, 'docs/commun/acoustique.js'))) {
  const copie = readFileSync(join(RACINE, 'docs/commun/acoustique.js'), 'utf-8')
  const source = readFileSync(join(RACINE, 'commun/acoustique.js'), 'utf-8')
  if (copie !== source) {
    echec('docs/commun/acoustique.js a dérivé de commun/acoustique.js — relancer `npm run site:preparer`')
  }
}

/* ── 3. Aucun lien mort, aucune ressource externe ────────────────────────── */

const pages = [
  ...readdirSync(DOCS).filter((f) => f.endsWith('.html')).map((f) => ['.', f]),
  ...(existsSync(join(DOCS, 'en'))
    ? readdirSync(join(DOCS, 'en')).filter((f) => f.endsWith('.html')).map((f) => ['en', f])
    : [])
]

for (const [dossier, fichier] of pages) {
  const html = readFileSync(join(DOCS, dossier, fichier), 'utf-8')
  const etiquette = `${dossier === '.' ? '' : dossier + '/'}${fichier}`

  for (const [, cible] of html.matchAll(/href="([^"#:]+\.html)"/g)) {
    if (!existsSync(resolve(DOCS, dossier, cible))) echec(`lien mort dans ${etiquette} → ${cible}`)
  }
  for (const [, cible] of html.matchAll(/src="([^"]+\.(?:png|jpg|svg))"/g)) {
    if (!existsSync(resolve(DOCS, dossier, cible))) echec(`image absente dans ${etiquette} → ${cible}`)
  }
  for (const [, ancre] of html.matchAll(/href="#([^"]+)"/g)) {
    if (!html.includes(`id="${ancre}"`)) echec(`ancre morte dans ${etiquette} → #${ancre}`)
  }

  // GitHub Pages doit pouvoir servir ces fichiers seuls : rien ne doit être
  // chargé depuis un autre serveur, ni police, ni script, ni feuille de style.
  if (/<script[^>]+src=/.test(html)) echec(`${etiquette} charge un script externe`)
  if (/<link[^>]*rel="stylesheet"/.test(html)) echec(`${etiquette} charge une feuille de style externe`)
  for (const [, url] of html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)) {
    const permis = url.startsWith('https://github.com/ResonLab') ||
                   url.startsWith('https://resonlab.github.io')
    if (!permis) echec(`${etiquette} référence une ressource externe : ${url}`)
  }
}

console.log(
  echecs === 0
    ? `SITE COHÉRENT (${pages.length} pages, deux langues alignées)`
    : `${echecs} PROBLÈME(S) SUR LE SITE`
)
process.exit(echecs === 0 ? 0 : 1)
