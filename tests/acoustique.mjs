// La physique d'Acustika, vérifiée contre des valeurs connues à la main.
//
// « Vérifier les calculs contre des valeurs connues avant d'afficher quoi que
// ce soit » : une carte de couleurs est très convaincante, même fausse.
//
// Aucun outillage : Node 24 exécute le TypeScript tel quel.
import {
  additionnerNiveaux,
  altitudeDuSol,
  calculerCarte,
  couvertureSalle,
  couvertureZone,
  encadrement,
  pointDansPolygone,
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
} from '../commun/acoustique.js'

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

console.log('\n=== Carte de couverture ===')

const salle = { largeur: 10, profondeur: 12, hauteurOreilles: 1.2 }
const uneEnceinte = {
  nom: 'Centre',
  position: { x: 5, y: 0, z: 3 },
  visee: { x: 5, y: 12, z: 1.2 },
  niveau1m: 100,
  ouverture: { 1000: 90 }
}

const carte = calculerCarte(salle, [uneEnceinte], 1000, 0.5)
verifier(
  'la grille a la taille de la salle',
  carte.niveaux.length === 24 && carte.niveaux[0].length === 20,
  `${carte.niveaux.length} x ${carte.niveaux[0].length}`
)
verifier('aucun point ne vaut l’infini', carte.niveaux.every((l) => l.every(Number.isFinite)))
verifier('le niveau baisse quand on s’éloigne', carte.niveaux[0][10] > carte.niveaux[23][10])
verifier(
  'les statistiques sont cohérentes',
  carte.minimum <= carte.moyenne &&
    carte.moyenne <= carte.maximum &&
    proche(carte.ecart, carte.maximum - carte.minimum)
)

// Le point qui décidera du conseil de placement : reculer une enceinte trop
// proche du premier rang rend la couverture plus régulière.
const reculee = calculerCarte(salle, [{ ...uneEnceinte, position: { x: 5, y: -4, z: 3 } }], 1000, 0.5)
verifier(
  'une enceinte reculée donne une couverture plus régulière',
  reculee.ecart < carte.ecart,
  `${reculee.ecart.toFixed(1)} dB contre ${carte.ecart.toFixed(1)} dB`
)

let refusPas = null
try {
  calculerCarte(salle, [uneEnceinte], 1000, 0)
} catch (erreur) {
  refusPas = erreur.message
}
verifier('un pas nul est refusé', refusPas !== null, refusPas ?? 'aucune erreur')

let refusSansEnceinte = null
try {
  calculerCarte(salle, [], 1000)
} catch (erreur) {
  refusSansEnceinte = erreur.message
}
verifier('une carte sans enceinte est refusée', refusSansEnceinte !== null)

console.log('\n=== Zones dessinées librement ===')

const carre = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 }
]
verifier('un point au centre est dans le contour', pointDansPolygone(carre, { x: 5, y: 5 }))
verifier('un point dehors ne l’est pas', !pointDansPolygone(carre, { x: 15, y: 5 }))

// Une forme en L : c'est là qu'un simple rectangle englobant se trompe.
const formeEnL = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 4 },
  { x: 4, y: 4 },
  { x: 4, y: 10 },
  { x: 0, y: 10 }
]
verifier('un point dans la branche du L est dedans', pointDansPolygone(formeEnL, { x: 2, y: 8 }))
verifier(
  'le creux du L est bien exclu',
  !pointDansPolygone(formeEnL, { x: 8, y: 8 }),
  'un rectangle englobant l’aurait accepté'
)

const cadre = encadrement(formeEnL)
verifier(
  'l’encadrement couvre toute la forme',
  cadre.xMin === 0 && cadre.xMax === 10 && cadre.yMin === 0 && cadre.yMax === 10
)

console.log('\n=== Pentes ===')

const gradins = {
  nom: 'Gradins',
  contour: [
    { x: 0, y: 12 },
    { x: 10, y: 12 },
    { x: 10, y: 20 },
    { x: 0, y: 20 }
  ],
  hauteurOreilles: 1.2,
  pentePourcent: 15,
  directionPenteDegres: 90
}

verifier('au premier rang, le sol est à son altitude', proche(altitudeDuSol(gradins, { x: 5, y: 12 }), 0))
// 8 mètres à 15 % : 1,20 m de plus. Le dernier rang voit par-dessus les autres.
verifier(
  'huit mètres à 15 % montent de 1,20 m',
  proche(altitudeDuSol(gradins, { x: 5, y: 20 }), 1.2),
  altitudeDuSol(gradins, { x: 5, y: 20 }).toFixed(3)
)
verifier(
  'sans pente déclarée, le sol est plat',
  altitudeDuSol({ ...gradins, pentePourcent: 0 }, { x: 5, y: 20 }) === 0
)

console.log('\n=== Couverture par zones ===')

const parterre = {
  nom: 'Parterre',
  contour: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 12 },
    { x: 0, y: 12 }
  ],
  hauteurOreilles: 1.2
}
const enceinteSalle = {
  nom: 'Centre',
  position: { x: 5, y: -2, z: 4 },
  visee: { x: 5, y: 14, z: 1.2 },
  niveau1m: 100,
  ouverture: { 1000: 90 }
}

const couverture = couvertureZone(parterre, [enceinteSalle], 1000, 0.5)
verifier('la zone est parcourue point par point', couverture.points.length === 480, String(couverture.points.length))
verifier('aucun point ne vaut l’infini', couverture.points.every((p) => Number.isFinite(p.niveau)))
verifier(
  'chaque point porte sa hauteur d’écoute',
  couverture.points.every((p) => proche(p.z, 1.2))
)

const surGradins = couvertureZone(gradins, [enceinteSalle], 1000, 0.5)
verifier(
  'sur les gradins, les oreilles montent avec le sol',
  surGradins.points.some((p) => p.z > 2) && surGradins.points.every((p) => p.z >= 1.2)
)

const salleEntiere = couvertureSalle([parterre, gradins], [enceinteSalle], 1000, 0.5)
verifier('les deux zones sont calculées', salleEntiere.zones.length === 2)

// Le point qui compte : l'écart de la salle est celui du pire au meilleur point,
// pas la moyenne des écarts. Une salle dont le balcon est 12 dB en dessous
// n'est pas bien couverte, même si chaque zone prise seule est régulière.
verifier(
  'l’écart de la salle englobe celui de chaque zone',
  salleEntiere.ecart >= Math.max(...salleEntiere.zones.map((z) => z.ecart)),
  `${salleEntiere.ecart.toFixed(1)} dB contre ${salleEntiere.zones
    .map((z) => z.ecart.toFixed(1))
    .join(' et ')}`
)

let refusContour = null
try {
  couvertureZone({ ...parterre, contour: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }, [enceinteSalle], 1000)
} catch (erreur) {
  refusContour = erreur.message
}
verifier(
  'une zone à moins de trois sommets est refusée',
  refusContour !== null && refusContour.includes('trois sommets'),
  refusContour ?? 'aucune erreur'
)

let refusVide = null
try {
  couvertureSalle([], [enceinteSalle], 1000)
} catch (erreur) {
  refusVide = erreur.message
}
verifier('une salle sans zone est refusée', refusVide !== null)

console.log(echecs === 0 ? '\nACOUSTIQUE : TOUS LES TESTS PASSENT' : `\n${echecs} TEST(S) EN ECHEC`)
process.exitCode = echecs === 0 ? 0 : 1
