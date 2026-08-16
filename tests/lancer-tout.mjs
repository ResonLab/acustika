import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DOSSIER = dirname(fileURLToPath(import.meta.url))

const SUITES = [
  ['Physique et couverture', 'acoustique.mjs'],
  ['Formes préfaites', 'formes.mjs'],
  ['Salle et réverbération', 'salle.mjs'],
  ['Application', 'application.mjs'],
  ['Données polaires', 'polaire.mjs'],
  // Le lecteur du CLF binaire. Il se compare à des largeurs relevées dans CLF
  // Viewer, qui n'ont servi à rien pour l'écrire : c'est ce qui en fait une
  // épreuve et non un ajustement.
  ['Lecture du CLF binaire', 'clf.mjs'],
  ['Traductions', 'traductions.mjs'],
  ['Effets React et leurs dépendances', 'effets-react.mjs'],
  ['Ce qui existe est-il atteignable', 'atteignable.mjs'],
  ['Cohérence du site', 'coherence-site.mjs'],
  ['Cohérence des conditions', 'coherence-conditions.mjs'],
  ['Cohérence du guide', 'coherence-guide.mjs']
]

let echecs = 0
for (const [intitule, fichier] of SUITES) {
  process.stdout.write(`\n──────── ${intitule}\n`)
  try {
    const sortie = execFileSync(process.execPath, [join(DOSSIER, fichier)], { encoding: 'utf-8' })
    const lignes = sortie.trim().split('\n')
    console.log(`  ${lignes[lignes.length - 1]}`)
  } catch (erreur) {
    echecs += 1
    console.log(erreur.stdout ?? String(erreur))
    console.log('  ÉCHEC')
  }
}

console.log(
  `\n════════ ${echecs === 0 ? 'TOUTES LES VÉRIFICATIONS PASSENT' : `${echecs} SUITE(S) EN ÉCHEC`}`
)
process.exit(echecs === 0 ? 0 : 1)
