import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Ce qui existe dans le code sans être atteignable à l'écran.
 *
 * **C'est la panne la moins soupçonnée de toute la maison**, et elle est
 * arrivée trois fois : `appliquerRepartition` de Lumika, écrite, exposée par le
 * pont, et qu'aucun bouton n'appelait ; l'écran des conditions de Scenika, dont
 * le garde-fou fonctionnait parfaitement derrière un CSS manquant qui empêchait
 * de défiler ; et le logo d'Acustika, jamais écrit alors que l'en-tête lui
 * gardait une place. Aucune relecture ne voit ces cas-là : le code est correct,
 * les suites sont vertes, et la fonction n'existe pas pour l'utilisateur.
 *
 * Ce contrôle cherche donc **le contraire de ce qui manque** : ce qui est là et
 * qu'on ne peut pas atteindre.
 *
 * 1. une opération du pont que personne n'appelle ;
 * 2. une fonction exportée d'un module commun que personne n'importe ;
 * 3. une classe CSS employée dans le code et qui n'a **aucune règle** — le cas
 *    Scenika, le plus grave, parce que l'élément existe et ne se voit pas ;
 * 4. une règle CSS dont plus aucune classe ne porte le nom — moins grave, mais
 *    c'est la trace d'un morceau d'interface retiré à moitié.
 */

const PROJET = join(dirname(fileURLToPath(import.meta.url)), '..')

let echecs = 0
function verifier(intitule, condition, detail = '') {
  if (!condition) echecs += 1
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${intitule}`)
  if (!condition && detail) console.log(`        ${detail}`)
}

/** Tous les fichiers d'un dossier, récursivement, filtrés par extension. */
function fichiers(dossier, extensions) {
  const trouves = []
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) trouves.push(...fichiers(chemin, extensions))
    else if (extensions.some((e) => entree.endsWith(e))) trouves.push(chemin)
  }
  return trouves
}

/**
 * Le code que l'utilisateur peut atteindre : les écrans et leurs composants.
 *
 * **Le pont et le processus principal en sont exclus exprès.** Une opération
 * appelée uniquement par le pont qui la déclare n'est atteignable par personne :
 * c'est précisément ce qu'on cherche.
 */
const SOURCES_ECRAN = fichiers(join(PROJET, 'src/renderer'), ['.tsx', '.ts'])
const codeEcran = SOURCES_ECRAN.map((f) => readFileSync(f, 'utf8')).join('\n')

/** Le texte est nettoyé de ses commentaires : un appel cité en exemple n'en est pas un. */
function sansCommentaires(texte) {
  return texte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const codeEcranVif = sansCommentaires(codeEcran)

console.log('\n── Les opérations du pont ──')

// Le pont déclare `domaine: { operation: ... }`. On relève les deux niveaux
// pour pouvoir chercher `api.domaine.operation` dans les écrans.
const preload = sansCommentaires(readFileSync(join(PROJET, 'src/preload/index.ts'), 'utf8'))
const corpsApi = preload.slice(preload.indexOf('const api = {'))
const operations = []
let domaineCourant = null
for (const ligne of corpsApi.split('\n')) {
  const domaine = ligne.match(/^ {2}(\w+): \{/)
  if (domaine) domaineCourant = domaine[1]
  const operation = ligne.match(/^ {4}(\w+):/)
  if (operation && domaineCourant) operations.push(`${domaineCourant}.${operation[1]}`)
}

verifier(
  'le pont expose des opérations, et on sait les lire',
  operations.length > 0,
  `${operations.length} opération(s) relevée(s)`
)

const pontOrphelin = operations.filter((op) => !codeEcranVif.includes(`api.${op}`))
verifier(
  'chaque opération du pont est appelée par un écran',
  pontOrphelin.length === 0,
  pontOrphelin.length > 0
    ? `jamais appelée(s) : ${pontOrphelin.join(', ')} — exposée(s) mais hors d’atteinte`
    : `${operations.length} opération(s), toutes atteignables`
)

console.log('\n── Les modules communs ──')

const MODULES = fichiers(join(PROJET, 'commun'), ['.js'])
const codeToutSaufCommun = [
  ...SOURCES_ECRAN,
  ...fichiers(join(PROJET, 'src/main'), ['.ts']),
  ...fichiers(join(PROJET, 'src/partage'), ['.ts']),
  ...fichiers(join(PROJET, 'tests'), ['.mjs'])
]
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

const communOrphelin = []
for (const module of MODULES) {
  const source = sansCommentaires(readFileSync(module, 'utf8'))
  const nom = relative(PROJET, module).replace(/\\/g, '/')
  for (const trouve of source.matchAll(/^export (?:function|const) (\w+)/gm)) {
    const symbole = trouve[1]
    // On cherche le symbole ailleurs que dans son propre fichier.
    const autres = MODULES.filter((m) => m !== module)
      .map((m) => sansCommentaires(readFileSync(m, 'utf8')))
      .join('\n')
    const employe = new RegExp(`\\b${symbole}\\b`).test(codeToutSaufCommun + '\n' + autres)
    if (!employe) communOrphelin.push(`${nom} → ${symbole}`)
  }
}

verifier(
  'chaque fonction exportée d’un module commun est employée quelque part',
  communOrphelin.length === 0,
  communOrphelin.join(' · ')
)

console.log('\n── Le CSS et les classes ──')

// **Les commentaires CSS sont retirés d'abord.** Sans cela, un commentaire qui
// cite un nom de fichier — « voir Plan.tsx » — déclare une classe `.tsx` qui
// n'existe pas, et le contrôle signale un défaut inventé. Un faux échec use un
// contrôle aussi sûrement qu'un faux succès.
const css = readFileSync(join(PROJET, 'src/renderer/src/styles.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
)

/**
 * Les classes déclarées par une règle CSS. On garde chaque segment d'un
 * sélecteur composé : `.marque strong` déclare bien `.marque`.
 */
const classesDeclarees = new Set()
for (const trouve of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) classesDeclarees.add(trouve[1])

/**
 * Les classes employées par le code, y compris dans un ternaire.
 *
 * **Les opérandes de comparaison sont retirés avant tout.** Dans
 * `className={outil === 'main' ? 'actif' : ''}`, seule `actif` est une classe :
 * `main` est le nom d'un outil. Les relever toutes faisait accuser à tort dix
 * classes de n'avoir aucune règle — et c'est le premier jet de ce fichier qui
 * l'a fait. Un filtre trop large produit des faux échecs qu'on remarque ; il
 * fallait quand même le corriger plutôt que de lui ajouter des exceptions, une
 * exception étant la porte par laquelle il cesserait de regarder.
 */
const classesEmployees = new Set()
for (const trouve of codeEcranVif.matchAll(/className=(?:"([^"]*)"|\{([^}]*)\})/g)) {
  const brut = (trouve[1] ?? trouve[2] ?? '').replace(/[!=]==?\s*['"`][^'"`]*['"`]/g, '')
  if (trouve[1] !== undefined) {
    for (const classe of brut.split(/\s+/)) if (classe) classesEmployees.add(classe)
    continue
  }
  for (const morceau of brut.matchAll(/['"`]([^'"`]*)['"`]/g)) {
    for (const classe of morceau[1].split(/\s+/)) if (classe) classesEmployees.add(classe)
  }
}

verifier(
  'on relève bien des classes des deux côtés',
  classesDeclarees.size > 5 && classesEmployees.size > 5,
  `${classesEmployees.size} employée(s), ${classesDeclarees.size} déclarée(s)`
)

// **Le cas Scenika** : une classe posée sur un élément et qui n'a aucune règle.
// L'élément existe, occupe sa place, et ne fait rien de ce qu'on croit.
const sansRegle = [...classesEmployees].filter((c) => !classesDeclarees.has(c))
verifier(
  'aucune classe employée n’est dépourvue de règle CSS',
  sansRegle.length === 0,
  sansRegle.length > 0
    ? `sans aucune règle : ${sansRegle.join(', ')} — l’élément existe et ne se voit pas`
    : ''
)

// L'autre sens : une règle qui ne s'applique plus à rien. Moins grave, mais
// c'est la trace d'un morceau d'interface retiré à moitié — comme `.pastille`
// restée après l'arrivée du logo.
const CLASSES_HORS_ECRAN = new Set([
  // Le thème et la racine, posés ailleurs que par du JSX.
  'app'
])
const sansPorteur = [...classesDeclarees].filter(
  (c) => !classesEmployees.has(c) && !CLASSES_HORS_ECRAN.has(c)
)
verifier(
  'aucune règle CSS ne vise une classe que plus personne ne porte',
  sansPorteur.length === 0,
  sansPorteur.length > 0 ? `plus portée(s) : ${sansPorteur.join(', ')}` : ''
)

console.log(
  echecs === 0
    ? '\nATTEIGNABLE : tout ce qui existe est atteignable'
    : `\n${echecs} PROBLÈME(S) D’ATTEIGNABILITÉ`
)
process.exitCode = echecs === 0 ? 0 : 1
