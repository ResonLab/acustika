// L'application : ce qui doit rester vrai même quand l'interface bouge.
//
// On ne lance pas Electron ici — ce serait long et fragile. On vérifie les
// règles qui, si elles cassaient, donneraient une application qui a l'air de
// marcher tout en produisant des résultats faux ou en perdant du travail.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PROJET = join(dirname(fileURLToPath(import.meta.url)), '..')
const lire = (relatif) => readFileSync(join(PROJET, relatif), 'utf-8')

let echecs = 0
function verifier(intitule, condition, detail = '') {
  if (!condition) echecs += 1
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${intitule}`)
  if (!condition && detail) console.log(`        ${detail}`)
}

console.log('\n=== Le calcul ne vit qu’à un seul endroit ===')

const plan = lire('src/renderer/src/pages/Plan.tsx')
verifier('le plan appelle le module partagé', plan.includes("from '../../../../commun/acoustique.js'"))

// Un écran qui recalculerait lui-même donnerait une carte que les tests ne
// couvrent pas. Une carte de couleurs est très convaincante même quand elle
// est fausse : c'est la raison d'être de cette vérification.
const recopies = ['function couvertureZone', 'function niveauTotal', 'function niveauADistance']
  .filter((nom) => plan.includes(nom))
verifier('le plan ne redéfinit aucune fonction de calcul', recopies.length === 0, recopies.join(', '))

console.log('\n=== La couche métier reste sans Electron ===')

// Même règle que dans Ohmnia : ce qui est dans domaines/ doit pouvoir tourner
// ailleurs que dans une fenêtre.
for (const fichier of ['src/main/domaines/bibliotheque.ts', 'src/main/domaines/projet.ts']) {
  verifier(`${fichier} n'importe pas Electron`, !/from 'electron'/.test(lire(fichier)))
}

console.log('\n=== Le format de projet se relit ===')

const projet = lire('src/main/domaines/projet.ts')
verifier('le format porte un numéro de version', projet.includes('VERSION_FORMAT'))
// Ouvrir sans broncher un fichier écrit par une version plus récente, c'est
// écraser des champs qu'on ne comprend pas : le refus est délibéré.
verifier(
  'un projet plus récent que l’application est refusé, pas tronqué',
  projet.includes('version plus récente')
)
// À l'inverse, un projet ancien à qui il manque un champ doit s'ouvrir.
verifier(
  'un projet ancien reçoit les champs manquants',
  projet.includes('...projetVide(), ...projet')
)

console.log('\n=== Rien ne se perd en silence ===')

const app = lire('src/renderer/src/App.tsx')
verifier(
  'un projet modifié non enregistré est signalé',
  app.includes('modifie') && app.includes('confirm(')
)

console.log('\n=== L’honnêteté reste affichée ===')

const bibliotheque = lire('src/renderer/src/pages/Bibliotheque.tsx')
verifier(
  'les gabarits sont annoncés comme génériques, pas comme des modèles réels',
  bibliotheque.includes('gabarits génériques')
)

console.log(echecs === 0 ? '\nAPPLICATION : TOUS LES TESTS PASSENT' : `\n${echecs} TEST(S) EN ECHEC`)
process.exitCode = echecs === 0 ? 0 : 1
