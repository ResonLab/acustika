// La physique d'Acustika, vérifiée contre des valeurs connues à la main.
//
// « Vérifier les calculs contre des valeurs connues avant d'afficher quoi que
// ce soit » : une carte de couleurs est très convaincante, même fausse.
//
// Aucun outillage : Node 24 exécute le TypeScript tel quel.
import {
  additionnerNiveaux,
  angleDepuisAxe,
  attenuationAngulaire,
  celeriteSon,
  distance,
  DISTANCE_MINIMALE,
  niveauADistance,
  niveauEnUnPoint,
  niveauTotal,
  retardDAppoint,
  retardMs
} from '../commun/acoustique.ts'

let echecs = 0
function verifier(intitule, condition, detail = '') {
  if (!condition) echecs += 1
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${intitule}`)
  if (!condition && detail) console.log(`        ${detail}`)
}

const proche = (obtenu, attendu, tolerance = 0.01) => Math.abs(obtenu - attendu) <= tolerance

console.log('\n=== Célérité du son ===')

verifier('343 m/s à 20 °C', proche(celeriteSon(20), 343.2, 0.2), celeriteSon(20).toFixed(2))
verifier('331 m/s à 0 °C', proche(celeriteSon(0), 331.3, 0.2), celeriteSon(0).toFixed(2))
verifier('il fait plus chaud, le son va plus vite', celeriteSon(25) > celeriteSon(20))

console.log('\n=== Retard de propagation ===')

// Le chiffre que tout technicien connaît : environ 2,9 ms par mètre.
verifier('1 mètre ≈ 2,9 ms', proche(retardMs(1), 2.914, 0.005), retardMs(1).toFixed(3))
verifier('34,32 mètres ≈ 100 ms', proche(retardMs(34.32), 100, 0.2), retardMs(34.32).toFixed(2))
verifier('une distance nulle donne un retard nul', retardMs(0) === 0)

let refusDistance = null
try {
  retardMs(-5)
} catch (erreur) {
  refusDistance = erreur.message
}
verifier('une distance négative est refusée', refusDistance !== null, refusDistance ?? 'aucune erreur')

console.log('\n=== Atténuation en distance ===')

// La règle des 6 dB par doublement de distance.
verifier('à 1 m, on retrouve le niveau de référence', proche(niveauADistance(100, 1), 100))
verifier('doubler la distance retire 6,02 dB', proche(niveauADistance(100, 2), 93.98))
verifier('quadrupler en retire 12,04 dB', proche(niveauADistance(100, 4), 87.96))
verifier('à 10 m, on perd 20 dB', proche(niveauADistance(100, 10), 80))

// Le piège annoncé : une distance nulle ferait exploser le calcul.
verifier(
  'une distance nulle ne fait pas exploser le niveau',
  Number.isFinite(niveauADistance(100, 0)),
  String(niveauADistance(100, 0))
)
verifier(
  'elle est ramenée à la distance minimale, pas à zéro',
  proche(niveauADistance(100, 0), niveauADistance(100, DISTANCE_MINIMALE))
)

console.log('\n=== Addition de niveaux ===')

// Deux sources décorrélées de même niveau : +3,01 dB. Pas +6, pas le double.
verifier('deux sources égales donnent +3,01 dB', proche(additionnerNiveaux([90, 90]), 93.01))
verifier('quatre sources égales donnent +6,02 dB', proche(additionnerNiveaux([90, 90, 90, 90]), 96.02))
verifier(
  'une source 10 dB plus faible ajoute presque rien',
  proche(additionnerNiveaux([90, 80]), 90.41)
)
verifier('une seule source ne change pas', proche(additionnerNiveaux([90]), 90))
verifier('aucune source donne moins l’infini', additionnerNiveaux([]) === -Infinity)

console.log('\n=== Directivité ===')

verifier('dans l’axe, aucune atténuation', attenuationAngulaire(0, 90) === 0)
verifier('au bord du cône à −6 dB, il manque 6 dB', proche(attenuationAngulaire(45, 90), -6))
verifier('la moitié du chemin coûte 1,5 dB', proche(attenuationAngulaire(22.5, 90), -1.5))
verifier('au-delà du cône, ça continue de descendre', attenuationAngulaire(90, 90) < -6)
verifier('le signe de l’angle est sans importance', attenuationAngulaire(-45, 90) === attenuationAngulaire(45, 90))

// L'ouverture dépend de la fréquence : plus directif dans l'aigu.
verifier(
  'à 30°, une enceinte large couvre mieux qu’une directive',
  attenuationAngulaire(30, 120) > attenuationAngulaire(30, 60)
)

console.log('\n=== Géométrie ===')

verifier('distance en trois dimensions', proche(distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }), 5))
verifier(
  'un point dans l’axe donne 0°',
  proche(angleDepuisAxe({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }), 0)
)
verifier(
  'un point perpendiculaire donne 90°',
  proche(angleDepuisAxe({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 0, y: 5, z: 0 }), 90)
)
verifier(
  'un point sur la source ne casse pas le calcul',
  angleDepuisAxe({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }) === 0
)

console.log('\n=== Niveau en un point ===')

const enceinte = {
  nom: 'Gauche',
  position: { x: 0, y: 0, z: 3 },
  visee: { x: 10, y: 0, z: 1.5 },
  niveau1m: 100,
  ouverture: { 1000: 90 }
}

// À 10 m dans l'axe : 100 − 20·log10(10) = 80 dB, à la directivité près.
const dansLAxe = niveauEnUnPoint(enceinte, { x: 10, y: 0, z: 1.5 }, 1000)
verifier('à 10 m dans l’axe, environ 80 dB', proche(dansLAxe, 80, 0.6), dansLAxe.toFixed(2))

const horsAxe = niveauEnUnPoint(enceinte, { x: 7, y: 7, z: 1.5 }, 1000)
verifier('hors de l’axe, le niveau est plus bas', horsAxe < dansLAxe)

let refusBande = null
try {
  niveauEnUnPoint(enceinte, { x: 5, y: 0, z: 1.5 }, 125)
} catch (erreur) {
  refusBande = erreur.message
}
verifier(
  'une bande sans ouverture définie est signalée, pas devinée',
  refusBande !== null && refusBande.includes('125'),
  refusBande ?? 'aucune erreur'
)

const deux = niveauTotal([enceinte, { ...enceinte, nom: 'Droite' }], { x: 10, y: 0, z: 1.5 }, 1000)
verifier('deux enceintes identiques ajoutent 3 dB', proche(deux, dansLAxe + 3.01, 0.02))

console.log('\n=== Retard d’appoint ===')

// Un rappel à 20 m d'une scène à 40 m : il doit attendre les 20 m manquants,
// plus la marge qui garde la localisation sur la scène.
const retard = retardDAppoint(40, 20)
verifier('le rappel attend le son de la scène, plus la marge', proche(retard, 68.3, 0.5), retard.toFixed(2))
verifier(
  'la marge est bien comprise dedans',
  proche(retard - 10, retardMs(40) - retardMs(20), 0.01)
)
verifier(
  'un appoint plus éloigné que la scène ne donne pas de retard négatif',
  retardDAppoint(10, 40) === 0
)

console.log(echecs === 0 ? '\nACOUSTIQUE : TOUS LES TESTS PASSENT' : `\n${echecs} TEST(S) EN ECHEC`)
process.exitCode = echecs === 0 ? 0 : 1
