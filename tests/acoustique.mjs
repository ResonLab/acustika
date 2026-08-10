// La physique d'Acustika, vérifiée contre des valeurs connues à la main.
//
// « Vérifier les calculs contre des valeurs connues avant d'afficher quoi que
// ce soit » : une carte de couleurs est très convaincante, même fausse.
//
// Aucun outillage : Node 24 exécute le TypeScript tel quel.
import {
  additionnerNiveaux,
  altitudeDuSol,
  appliquerReglage,
  BANDES_OCTAVE,
  conseillerPlacement,
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
  retardMs,
  retardsDAlignement,
  MARGE_LOCALISATION_MS
} from '../commun/acoustique.js'

let echecs = 0
function verifier(intitule, condition, detail = '') {
  if (!condition) echecs += 1
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${intitule}`)
  if (!condition && detail) console.log(`        ${detail}`)
}

/** Vérifie qu'un appel est refusé, et que le message dit bien quoi. */
function refuseAvec(intitule, action, extrait) {
  let message = null
  try {
    action()
  } catch (erreur) {
    message = erreur.message
  }
  verifier(
    intitule,
    message !== null && message.includes(extrait),
    message ?? 'aucune erreur levée'
  )
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


console.log('\n=== Le conseil de placement ===')

// Une salle profonde avec une enceinte posée trop bas et trop près : le cas
// que le conseil doit savoir redresser. Le premier rang est écrasé, le fond
// n'a plus rien — c'est exactement l'écart qu'on cherche à réduire.
const salleProfonde = [
  {
    nom: 'Parterre',
    contour: [
      { x: 0, y: 2 },
      { x: 12, y: 2 },
      { x: 12, y: 24 },
      { x: 0, y: 24 }
    ],
    hauteurOreilles: 1.2,
    altitude: 0,
    pentePourcent: 0,
    directionPenteDegres: 90
  }
]

const ouvertureLarge = Object.fromEntries(BANDES_OCTAVE.map((b) => [b, 90]))
const posesMal = [
  {
    nom: 'Gauche',
    position: { x: 4, y: 0, z: 1.5 },
    visee: { x: 4, y: 4, z: 1.2 },
    niveau1m: 100,
    ouverture: ouvertureLarge
  },
  {
    nom: 'Droite',
    position: { x: 8, y: 0, z: 1.5 },
    visee: { x: 8, y: 4, z: 1.2 },
    niveau1m: 100,
    ouverture: ouvertureLarge
  }
]

const conseil = conseillerPlacement(salleProfonde, posesMal, 1000, 1)

verifier(
  'le conseil évalue plusieurs centaines de placements',
  conseil.essais > 100,
  `${conseil.essais} essais`
)
verifier(
  'il trouve une couverture plus régulière que le placement de départ',
  conseil.gain > 0 && conseil.ecartPropose < conseil.ecartActuel,
  `${conseil.ecartActuel.toFixed(1)} dB -> ${conseil.ecartPropose.toFixed(1)} dB`
)

// Le conseil doit être applicable : on recalcule la couverture avec le
// placement proposé et on vérifie qu'on retrouve bien l'écart annoncé. Sans
// cela, il annoncerait un chiffre qu'il ne sait pas reproduire.
const verifie = couvertureSalle(
  salleProfonde,
  appliquerReglage(posesMal, conseil.propose),
  1000,
  1
)
verifier(
  'le placement proposé donne bien l’écart annoncé',
  Math.abs(verifie.ecart - conseil.ecartPropose) < 0.01,
  `annoncé ${conseil.ecartPropose.toFixed(2)} · recalculé ${verifie.ecart.toFixed(2)}`
)

verifier(
  'il explique ce que chaque réglage apporte',
  conseil.effets.length > 0 && conseil.effets.every((e) => typeof e.gain === 'number'),
  JSON.stringify(conseil.effets.map((e) => `${e.reglage} ${e.gain.toFixed(1)} dB`))
)
verifier(
  'les explications sont classées, le plus utile en premier',
  conseil.effets.every((e, i) => i === 0 || conseil.effets[i - 1].gain >= e.gain)
)

// Monter les enceintes doit faire partie de la réponse sur une salle profonde :
// c'est le geste qui rapproche le fond sans écraser le premier rang.
verifier(
  'il conseille de monter les enceintes trop basses',
  conseil.propose.hauteur > conseil.actuel.hauteur,
  `${conseil.actuel.hauteur} m -> ${conseil.propose.hauteur} m`
)

// Un placement déjà bon ne doit pas être « amélioré » de force : un conseil qui
// bouge tout à chaque fois n'inspire aucune confiance.
const conseilDuBon = conseillerPlacement(
  salleProfonde,
  appliquerReglage(posesMal, conseil.propose),
  1000,
  1
)
verifier(
  'un placement déjà bon n’est pas dégradé',
  conseilDuBon.ecartPropose <= conseil.ecartPropose + 0.01,
  `${conseilDuBon.ecartPropose.toFixed(2)} vs ${conseil.ecartPropose.toFixed(2)}`
)

refuseAvec(
  'sans zone, le conseil est refusé en français',
  () => conseillerPlacement([], posesMal, 1000),
  'zone'
)
refuseAvec(
  'sans enceinte, le conseil est refusé en français',
  () => conseillerPlacement(salleProfonde, [], 1000),
  'enceinte'
)

console.log('\n=== Retards d’alignement ===')

const facade = {
  nom: 'Façade',
  position: { x: 6, y: 0, z: 4 },
  visee: { x: 6, y: 20, z: 1.2 },
  niveau1m: 100,
  ouverture: ouvertureLarge
}
const rappel = {
  nom: 'Rappel',
  position: { x: 6, y: 20, z: 3 },
  visee: { x: 6, y: 30, z: 1.2 },
  niveau1m: 95,
  ouverture: ouvertureLarge
}

const retards = retardsDAlignement([facade, rappel])
verifier('la façade ne se retarde pas elle-même', retards[0].retardMs === 0 && retards[0].principale)
// La distance est bien celle des trois dimensions : la façade est accrochée à
// 4 m, le rappel à 3, et ce mètre de dénivelé compte. Comparer à `retardMs(20)`
// faisait échouer ce test — c'était le test qui avait tort.
verifier(
  'le rappel attend le son de la façade, plus la marge',
  proche(retards[1].retardMs, retardMs(retards[1].distanceM) + MARGE_LOCALISATION_MS, 0.001),
  `${retards[1].retardMs.toFixed(2)} ms pour ${retards[1].distanceM.toFixed(3)} m`
)
verifier(
  'la distance tient compte de la hauteur d’accrochage',
  retards[1].distanceM > 20,
  retards[1].distanceM.toFixed(3)
)
verifier(
  'vingt mètres donnent environ 58 ms, plus 10 de marge',
  proche(retards[1].retardMs, 68.3, 0.5),
  retards[1].retardMs.toFixed(1)
)

// La marge n'est pas décorative : sans elle, l'oreille place la source au
// milieu au lieu de la scène.
const sansMarge = retardsDAlignement([facade, rappel], 0, 0)
verifier(
  'la marge est bien ce qui sépare les deux réglages',
  proche(retards[1].retardMs - sansMarge[1].retardMs, MARGE_LOCALISATION_MS, 0.01)
)

// Il fait plus chaud, le son va plus vite, le rappel attend moins.
const chaud = retardsDAlignement([facade, rappel], 0, MARGE_LOCALISATION_MS, 30)
verifier('par temps chaud, le rappel attend moins', chaud[1].retardMs < retards[1].retardMs)

refuseAvec(
  'sans enceinte, le calcul est refusé en français',
  () => retardsDAlignement([]),
  'enceinte'
)
refuseAvec(
  'une enceinte principale inexistante est signalée',
  () => retardsDAlignement([facade], 4),
  's’y aligner'
)

console.log(echecs === 0 ? '\nACOUSTIQUE : TOUS LES TESTS PASSENT' : `\n${echecs} TEST(S) EN ECHEC`)
process.exitCode = echecs === 0 ? 0 : 1
