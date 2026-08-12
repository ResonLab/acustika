// L'application : ce qui doit rester vrai même quand l'interface bouge.
//
// On ne lance pas Electron ici — ce serait long et fragile. On vérifie les
// règles qui, si elles cassaient, donneraient une application qui a l'air de
// marcher tout en produisant des résultats faux ou en perdant du travail.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
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
/**
 * À l'inverse, un projet ancien à qui il manque un champ doit s'ouvrir.
 *
 * **Ce contrôle comparait une chaîne du code source** — `...projetVide(), ...projet` —
 * et il a échoué le jour où la même fusion a été écrite sur plusieurs lignes.
 * Le code était juste, le test disait non. Un contrôle qui ne distingue pas une
 * régression d'un retour à la ligne finit par être contourné, et c'est alors
 * qu'il laissera passer la vraie régression.
 *
 * Il ouvre donc maintenant **un vrai fichier**. Node 24 dépouille les types, si
 * bien que le domaine s'importe tel quel, sans compilation ni empaqueteur.
 */
const dossierTemporaire = mkdtempSync(join(tmpdir(), 'acustika-'))
try {
  const { lireProjet } = await import('../src/main/domaines/projet.ts')

  // Un projet d'avant la salle : ni `salle`, ni `bande`.
  const ancien = join(dossierTemporaire, 'ancien.acustika')
  writeFileSync(
    ancien,
    JSON.stringify({
      nom: 'Ancien',
      largeur: 10,
      profondeur: 10,
      zones: [],
      enceintes: [],
      version: 1
    }),
    'utf-8'
  )
  const relu = lireProjet(ancien)
  verifier('un projet ancien s’ouvre au lieu d’être refusé', relu.nom === 'Ancien')
  verifier('un champ absent reçoit sa valeur par défaut', relu.bande === 1000)
  verifier('la salle absente est créée', typeof relu.salle === 'object' && relu.salle !== null)
  verifier(
    'une salle créée d’office est inactive',
    relu.salle?.active === false,
    'des matériaux inventés donneraient une réverbération inventée'
  )

  // Une salle **partielle** : le piège que la fusion superficielle laisse passer.
  // Sans fusion en profondeur, `spectateurs` resterait indéfini et l'absorption
  // deviendrait NaN — silencieusement, en contaminant toute la carte.
  const partiel = join(dossierTemporaire, 'partiel.acustika')
  writeFileSync(
    partiel,
    JSON.stringify({
      nom: 'Partiel',
      largeur: 10,
      profondeur: 10,
      zones: [],
      enceintes: [],
      bande: 1000,
      salle: { hauteur: 8, active: true },
      version: 1
    }),
    'utf-8'
  )
  const reluPartiel = lireProjet(partiel)
  verifier('une salle partielle garde ce qui était écrit', reluPartiel.salle?.hauteur === 8)
  verifier(
    'une salle partielle complète ce qui manquait',
    typeof reluPartiel.salle?.spectateurs === 'number' &&
      typeof reluPartiel.salle?.sol === 'string',
    'sinon l’absorption vaudrait NaN sans que rien ne le signale'
  )
} finally {
  rmSync(dossierTemporaire, { recursive: true, force: true })
}

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
