// Prépare `docs/` pour être servi — en local comme sur GitHub Pages.
//
// Le problème qu'il résout : GitHub Pages ne sert que la racine du dépôt ou le
// dossier `docs/`. Or `carte-couverture.html` importe la physique, qui vit dans
// `commun/acoustique.js`, **hors de `docs/`**. Un `../commun/acoustique.js`
// remonte au-dessus de la racine servie : la page se chargerait, et la carte
// serait morte. En local, servie depuis la racine du dépôt, on ne le verrait
// pas — c'est le piège déjà payé sur Scenika.
//
// La réponse n'est pas de recopier le fichier dans le dépôt : une formule vit à
// un seul endroit, c'est la règle numéro un de la maison, et elle vaut ici plus
// qu'ailleurs — une carte de couleurs est très convaincante même quand elle est
// fausse. On en fait donc une copie **au moment de publier**, ignorée par git.
import { mkdirSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PROJET = join(dirname(fileURLToPath(import.meta.url)), '..')
const CIBLE = join(PROJET, 'docs/commun')

mkdirSync(CIBLE, { recursive: true })
copyFileSync(join(PROJET, 'commun/acoustique.js'), join(CIBLE, 'acoustique.js'))

console.log('Site prêt : docs/commun/acoustique.js copié depuis commun/acoustique.js')
