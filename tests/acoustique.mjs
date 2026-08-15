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
  CANDIDATS_PAR_RECHERCHE,
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
  MARGE_DOMAINE,
  MARGE_LOCALISATION_MS,
  profilCoupe
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

console.log('\n=== La vue en coupe ===')

// Des gradinsCoupe : le sol monte de 15 % sur la profondeur. C'est exactement le cas
// où la vue du dessus ne suffit plus.
const gradinsCoupe = [
  {
    nom: 'Gradins',
    contour: [
      { x: 0, y: 4 },
      { x: 12, y: 4 },
      { x: 12, y: 20 },
      { x: 0, y: 20 }
    ],
    hauteurOreilles: 1.2,
    altitude: 0,
    pentePourcent: 15,
    directionPenteDegres: 90
  }
]

const facadeCoupe = [
  {
    nom: 'Façade',
    position: { x: 6, y: 0, z: 5 },
    visee: { x: 6, y: 14, z: 2 },
    niveau1m: 100,
    ouverture: ouvertureLarge
  }
]

const coupe = profilCoupe(gradinsCoupe, facadeCoupe, 6, 1000, 0.5)

// 16 m de profondeur, un point tous les 0,5 m, prélevés au centre des mailles.
verifier('la coupe couvre toute la zone', coupe.points.length === 32, String(coupe.points.length))
verifier('la coupe est prise à l’abscisse demandée', coupe.x === 6)

// Le sol monte : 16 m à 15 % font 2,40 m.
const premier = coupe.points[0]
const dernier = coupe.points[coupe.points.length - 1]
verifier(
  'le sol monte avec la pente',
  proche(dernier.sol - premier.sol, 2.325, 0.05),
  `${premier.sol.toFixed(2)} m -> ${dernier.sol.toFixed(2)} m`
)
verifier(
  'les oreilles montent avec le sol',
  proche(dernier.oreilles - dernier.sol, 1.2, 0.01)
)
verifier(
  'un niveau est calculé partout dans la zone',
  coupe.points.every((p) => p.niveau !== null && Number.isFinite(p.niveau))
)

// Le piqué : l'enceinte est à 5 m, vise 2 m à 14 m de distance. Elle descend
// de 3 m sur 14, soit environ 12°.
const piqueFacade = coupe.enceintes[0].piqueDegres
verifier(
  'le piqué est compté sous l’horizontale',
  piqueFacade > 0 && proche(piqueFacade, 12.1, 0.5),
  `${piqueFacade.toFixed(1)}°`
)

// Une enceinte qui vise plus haut qu'elle pointe vers le haut : le signe doit
// s'inverser, sinon on ne verrait pas la différence entre piquer et relever.
const versLeHaut = profilCoupe(
  gradinsCoupe,
  [{ ...facadeCoupe[0], position: { x: 6, y: 0, z: 1 }, visee: { x: 6, y: 14, z: 3 } }],
  6,
  1000,
  1
)
verifier(
  'une enceinte qui relève a un piqué négatif',
  versLeHaut.enceintes[0].piqueDegres < 0,
  `${versLeHaut.enceintes[0].piqueDegres.toFixed(1)}°`
)

// Hors zone, on ne calcule rien plutôt que d'inventer.
const zoneEtroite = [
  {
    ...gradinsCoupe[0],
    contour: [
      { x: 0, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 20 },
      { x: 0, y: 20 }
    ],
    pentePourcent: 0
  }
]
const horsZone = profilCoupe(zoneEtroite, facadeCoupe, 10, 1000, 1)
verifier(
  'hors des zones, aucun niveau n’est inventé',
  horsZone.points.every((p) => p.niveau === null)
)

refuseAvec('une coupe sans zone est refusée', () => profilCoupe([], facadeCoupe, 6, 1000), 'zone')
refuseAvec('un pas nul est refusé', () => profilCoupe(gradinsCoupe, facadeCoupe, 6, 1000, 0), 'supérieur à zéro')


// ── Le conseil ne sort jamais une enceinte de la salle ──────────────────────
//
// **Defaut reel, signale par l'utilisateur** : « faire un meilleur emplacement »
// sortait l'enceinte du rectangle prefait. La recherche fait varier
// l'ecartement et rien ne verifiait que les positions restaient dans la salle.
//
// **Le cas a ete refait deux fois, et les deux premiers ne discriminaient pas.**
//
// Le premier : des enceintes serrees au centre ne peuvent pas atteindre les
// murs, le facteur d'ecartement explore etant borne.
//
// Le second etait pire, et sa panne est instructive. Sa zone portait
// `hauteurSol` la ou le module lit `hauteurOreilles` : chaque point d'ecoute se
// retrouvait a une altitude NaN, tous les niveaux devenaient NaN, l'ecart
// devenait -Infinity, et la comparaison `ecart < ecartPropose - 0.01` n'etait
// **jamais** vraie. La recherche tournait en entier sans jamais retenir un
// candidat : le conseil rendait le placement de depart, inchange. Les enceintes
// restaient donc dans la salle **parce qu'elles ne bougeaient pas**, et le test
// passait la contrainte entierement desactivee. Un test qui ne peut pas echouer.
//
// **Ce qui discrimine vraiment est ailleurs.** Ecarter des enceintes ne les
// sort de la salle que si elles sont deja **plus larges que le public** — le
// cas reel d'un systeme accroche en dehors du bloc de sieges. Ici : un public
// de 10 m de large dans une salle de 20 m de profondeur, deux enceintes posees
// 3 m au-dela de chaque bord. Sans la contrainte, la recherche les ecarte
// jusqu'a 2 m **hors de la salle** — et ce placement impossible gagne 3,9 dB
// contre 3,8 dB pour le meilleur placement applicable. C'est le piege entier :
// la mauvaise reponse est meilleure sur le critere.
{
  const publicEtroit = [
    {
      nom: 'Parterre',
      contour: [
        { x: 5, y: 0 },
        { x: 15, y: 0 },
        { x: 15, y: 20 },
        { x: 5, y: 20 }
      ],
      hauteurOreilles: 1.2,
      altitude: 0,
      pentePourcent: 0,
      directionPenteDegres: 90
    }
  ]
  // **120° et non 90°, et ce n'est pas un detail de decor.** Verifie en
  // desactivant la contrainte : a 90° et 110°, la recherche ramene d'elle-meme
  // les enceintes a 6 / 14, dans la salle — le controle geometrique ne pouvait
  // alors pas echouer. Il faut une ouverture assez large pour que les ecarter
  // paie encore. La bascule se situe entre 110° et 120°.
  const ouvertureTresLarge = Object.fromEntries(BANDES_OCTAVE.map((b) => [b, 120]))
  const largesDejaDehors = [
    { nom: 'G', position: { x: 2, y: 1, z: 3 }, visee: { x: 2, y: 12, z: 1 }, niveau1m: 100, ouverture: ouvertureTresLarge },
    { nom: 'D', position: { x: 18, y: 1, z: 3 }, visee: { x: 18, y: 12, z: 1 }, niveau1m: 100, ouverture: ouvertureTresLarge }
  ]

  const conseil = conseillerPlacement(publicEtroit, largesDejaDehors, 1000, 2)
  const proposees = appliquerReglage(largesDejaDehors, conseil.propose)

  // **D'abord : le conseil doit avoir vraiment travaille.** C'est ce garde-fou
  // qui manquait, et c'est lui qui aurait signale la zone mal formee. Un
  // conseil qui ne bouge rien satisfait n'importe quelle contrainte.
  verifier(
    'le conseil mesure un ecart reel et propose mieux',
    Number.isFinite(conseil.ecartActuel) && conseil.gain > 0.5 && conseil.effets.length > 0,
    `ecart ${conseil.ecartActuel.toFixed(2)} -> ${conseil.ecartPropose.toFixed(2)}, ${conseil.effets.length} effet(s)`
  )

  // Les bornes sont calculees ici, a la main, depuis ce que l'utilisateur a
  // dessine : le public va de 5 a 15, les enceintes de 2 a 18, donc l'extreme
  // est 2 et 18. Seule la marge vient du module — la recopier la ferait
  // silencieusement mentir le jour ou elle change.
  const xMin = 2 - MARGE_DOMAINE
  const xMax = 18 + MARGE_DOMAINE
  const dedans = proposees.every((e) => e.position.x >= xMin && e.position.x <= xMax)
  verifier(
    'le placement conseille garde les enceintes dans la salle',
    dedans,
    `x ${proposees.map((e) => e.position.x.toFixed(1)).join(' / ')} — autorise [${xMin}, ${xMax}]`
  )

  // Et la contrainte a bel et bien refuse des candidats : sans elle, la
  // recherche parcourt la grille entiere. Cette verification-ci mord meme si la
  // geometrie cessait un jour de discriminer.
  verifier(
    'la contrainte refuse effectivement des candidats',
    conseil.essais > 0 && conseil.essais < CANDIDATS_PAR_RECHERCHE,
    `${conseil.essais} essais sur ${CANDIDATS_PAR_RECHERCHE} candidats`
  )
}

// **Les quatre bornes du domaine, chacune eprouvee seule.**
//
// Le cas symetrique ci-dessus ne suffisait pas, et c'est le sabotage qui l'a
// dit : `appliquerReglage` ecarte les deux enceintes symetriquement autour de
// leur milieu, si bien que dans une salle symetrique elles franchissent les
// bornes basse et haute **en meme temps**. Refuser sur une seule des deux
// suffisait alors a rejeter le candidat, et retirer l'autre ne changeait rien.
// Trois bornes sur quatre pouvaient disparaitre sans que rien echoue.
//
// La reponse est une salle **decentree** — le public deborde largement d'un
// cote — ou une seule borne peut mordre, passee dans les quatre orientations.
// Le meme dessin donne ainsi quatre epreuves : x bas, x haut, y bas, y haut.
{
  const ouvertureTresLarge = Object.fromEntries(BANDES_OCTAVE.map((b) => [b, 120]))

  /** Le dessin de reference : public de -8 a 15, enceintes a 4 et 18. */
  const contourType = [
    { x: -8, y: 0 },
    { x: 15, y: 0 },
    { x: 15, y: 20 },
    { x: -8, y: 20 }
  ]
  const enceintesType = [
    { nom: 'G', position: { x: 4, y: 1 }, visee: { x: 4, y: 12 } },
    { nom: 'D', position: { x: 18, y: 1 }, visee: { x: 18, y: 12 } }
  ]

  // Les quatre orientations. Une symetrie inverse le sens de parcours du
  // contour : `pointDansPolygone` doit rester indifferent au sens, et le fait
  // que les quatre orientations trouvent le meme ecart le montre.
  const orientations = {
    'x croissant': (p) => ({ x: p.x, y: p.y }),
    'x decroissant': (p) => ({ x: -p.x, y: p.y }),
    'y croissant': (p) => ({ x: p.y, y: p.x }),
    'y decroissant': (p) => ({ x: p.y, y: -p.x })
  }

  for (const [sens, tourner] of Object.entries(orientations)) {
    const zone = [
      {
        nom: 'Parterre',
        contour: contourType.map(tourner),
        hauteurOreilles: 1.2,
        altitude: 0,
        pentePourcent: 0,
        directionPenteDegres: 90
      }
    ]
    const enceintes = enceintesType.map((e) => ({
      nom: e.nom,
      position: { ...tourner(e.position), z: 3 },
      visee: { ...tourner(e.visee), z: 1 },
      niveau1m: 100,
      ouverture: ouvertureTresLarge
    }))

    const conseil = conseillerPlacement(zone, enceintes, 1000, 2)
    const proposees = appliquerReglage(enceintes, conseil.propose)

    // Les extremes dessines, releves sur ce que l'on vient de construire.
    const points = [...zone[0].contour, ...enceintes.map((e) => e.position)]
    const bornes = {
      xMin: Math.min(...points.map((p) => p.x)) - MARGE_DOMAINE,
      xMax: Math.max(...points.map((p) => p.x)) + MARGE_DOMAINE,
      yMin: Math.min(...points.map((p) => p.y)) - MARGE_DOMAINE,
      yMax: Math.max(...points.map((p) => p.y)) + MARGE_DOMAINE
    }
    const dedans = proposees.every(
      (e) =>
        e.position.x >= bornes.xMin &&
        e.position.x <= bornes.xMax &&
        e.position.y >= bornes.yMin &&
        e.position.y <= bornes.yMax
    )

    verifier(
      `le domaine tient dans une salle decentree — ${sens}`,
      dedans && conseil.gain > 0.5,
      `positions ${proposees
        .map((e) => `(${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)})`)
        .join(' ')} — bornes x [${bornes.xMin}, ${bornes.xMax}] y [${bornes.yMin}, ${bornes.yMax}], gain ${conseil.gain.toFixed(2)}`
    )
  }
}

// Une zone mal formee ne doit plus produire un conseil muet : c'est la panne
// decrite juste au-dessus, et elle se refuse maintenant au lieu de rendre
// « votre placement est deja le meilleur » sur un calcul qui n'a rien mesure.
refuseAvec(
  'une zone sans hauteur d’oreilles est refusée, pas ignorée',
  () =>
    conseillerPlacement(
      [{ nom: 'Parterre', contour: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 14 }, { x: 0, y: 14 }], hauteurSol: 0 }],
      posesMal,
      1000,
      2
    ),
  'hauteur'
)

console.log(echecs === 0 ? '\nACOUSTIQUE : TOUS LES TESTS PASSENT' : `\n${echecs} TEST(S) EN ECHEC`)
process.exitCode = echecs === 0 ? 0 : 1
