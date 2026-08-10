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

// L'avertissement a quitté le composant le jour où l'interface est devenue
// traduisible : il vit maintenant dans `i18n.ts`. **Le contrôle a suivi le
// texte** — laissé sur le composant, il aurait échoué alors que rien n'était
// cassé, puis on l'aurait supprimé, et l'honnêteté n'aurait plus été vérifiée
// du tout.
//
// Et il porte désormais sur **les deux langues** : un avertissement présent en
// français mais vidé en anglais ne protège que la moitié des utilisateurs, et
// c'est exactement le genre d'oubli qu'une traduction laisse passer.
const bibliotheque = lire('src/renderer/src/pages/Bibliotheque.tsx')
const traductions = lire('src/partage/i18n.ts')

verifier(
  "l'écran affiche l'avertissement sur les gabarits",
  bibliotheque.includes("t('biblio.avertissementFort')")
)
verifier(
  'les gabarits sont annoncés comme génériques en français',
  traductions.includes('gabarits génériques')
)
verifier(
  'les gabarits sont annoncés comme génériques en anglais',
  /generic templates/i.test(traductions)
)

console.log('\n=== La légende dit la vérité ===')

// Une légende qui ne correspond pas à sa carte trompe au lieu d'aider : on
// croit lire une échelle, on lit autre chose. Les deux listes de couleurs
// doivent donc rester identiques, et rien ne le garantirait sans ce contrôle.
const planAffichage = lire('src/renderer/src/pages/Plan.tsx')
const styles = lire('src/renderer/src/styles.css')

const couleursDeLaCarte = [...planAffichage.matchAll(/\[(\d+), (\d+), (\d+)\]/g)].map(
  (m) => `${m[1]}, ${m[2]}, ${m[3]}`
)
const couleursDeLaLegende = [...styles.matchAll(/rgb\((\d+), (\d+), (\d+)\)/g)].map(
  (m) => `${m[1]}, ${m[2]}, ${m[3]}`
)

verifier(
  'la légende reprend les couleurs de la carte, dans le même ordre',
  couleursDeLaCarte.length > 0 &&
    couleursDeLaCarte.length === couleursDeLaLegende.length &&
    couleursDeLaCarte.every((c, i) => c === couleursDeLaLegende[i]),
  `carte : ${couleursDeLaCarte.join(' · ')}
        légende : ${couleursDeLaLegende.join(' · ')}`
)

console.log(echecs === 0 ? '\nAPPLICATION : TOUS LES TESTS PASSENT' : `\n${echecs} TEST(S) EN ECHEC`)
process.exitCode = echecs === 0 ? 0 : 1
