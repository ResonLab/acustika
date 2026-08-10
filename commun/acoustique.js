/**
 * La physique d'Acustika — **un seul endroit pour chaque formule**.
 *
 * Règle héritée d'Ohmnia, et qui vaut ici plus qu'ailleurs : une carte de
 * couleurs est très convaincante, même quand elle est fausse. Tout ce qui est
 * calculé ici est donc vérifié contre des valeurs connues à la main, avant
 * qu'on affiche quoi que ce soit.
 *
 * Ce fichier ne dépend de rien : ni interface, ni fichier de projet.
 *
 * **Écrit en JavaScript, types en JSDoc**, comme le calcul DMX de Scenika et
 * pour la même raison : il doit tourner dans un navigateur (la carte), dans
 * Node (les tests) et plus tard dans l'application. Une formule qui a besoin
 * d'être compilée pour atteindre l'un des trois finit dupliquée le jour où
 * l'outil gêne.
 *
 * **Ce que ce module ne fait pas encore**, et qu'il ne faut pas laisser croire :
 * il ignore les réflexions sur les parois, la réverbération, et la directivité
 * dépendante de la fréquence au-delà de ce qu'on lui donne. Il calcule un champ
 * direct. C'est déjà utile — c'est ce qui décide d'un placement — mais ce n'est
 * pas une simulation de salle.
 */

/** Bandes d'octave retenues, en hertz. */
export const BANDES_OCTAVE = [125, 250, 500, 1000, 2000, 4000, 8000]

/**
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * Célérité du son dans l'air, en mètres par seconde.
 *
 * Elle dépend de la température : 343 m/s à 20 °C, mais 331 à 0 °C. Une salle
 * pleine monte facilement à 25 °C, ce qui déplace les retards de près de 1 %.
 * Autant le calculer plutôt que de figer 343.
 */
/**
 * @param {number} [temperatureCelsius]
 * @returns {number}
 */
export function celeriteSon(temperatureCelsius = 20) {
  return 331.3 * Math.sqrt(1 + temperatureCelsius / 273.15)
}

/** Distance entre deux points, en mètres. */
/**
 * @param {Point} a
 * @param {Point} b
 * @returns {number}
 */
export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

/**
 * Retard de propagation, en millisecondes.
 * Environ 2,9 ms par mètre à 20 °C — le chiffre que tout technicien connaît.
 */
/**
 * @param {number} distanceMetres
 * @param {number} [temperatureCelsius]
 * @returns {number}
 */
export function retardMs(distanceMetres, temperatureCelsius = 20) {
  if (distanceMetres < 0) throw new Error('Une distance ne peut pas être négative.')
  return (distanceMetres / celeriteSon(temperatureCelsius)) * 1000
}

/**
 * Distance minimale prise en compte, en mètres.
 *
 * Un point de calcul exactement sur une enceinte donnerait une division par
 * zéro et un niveau infini — une seule case rouge ferait basculer toute
 * l'échelle de couleurs de la carte. À dix centimètres, on est de toute façon
 * dans le champ proche, où le modèle ne vaut plus rien.
 */
export const DISTANCE_MINIMALE = 0.1

/**
 * Niveau à une distance donnée, en décibels.
 *
 * En champ libre, une source ponctuelle perd environ 6 dB chaque fois que la
 * distance double. `niveauReference` est mesuré à `distanceReference`, un mètre
 * par convention pour la sensibilité d'une enceinte.
 */
/**
 * @param {number} niveauReference
 * @param {number} distanceMetres
 * @param {number} [distanceReference]
 * @returns {number}
 */
export function niveauADistance(niveauReference, distanceMetres, distanceReference = 1) {
  if (distanceReference <= 0) {
    throw new Error('La distance de référence doit être supérieure à zéro.')
  }
  const distanceSure = Math.max(distanceMetres, DISTANCE_MINIMALE)
  return niveauReference - 20 * Math.log10(distanceSure / distanceReference)
}

/**
 * Somme énergétique de plusieurs niveaux, en décibels.
 *
 * **Ce calcul suppose des sources décorrélées** : deux enceintes identiques
 * donnent +3 dB. En réalité, deux sources cohérentes peuvent s'ajouter jusqu'à
 * +6 dB ou s'annuler complètement selon leur déphasage. Tant que le déphasage
 * n'est pas modélisé, l'interface doit le dire au lieu de laisser croire à une
 * précision qu'on n'a pas.
 */
/**
 * @param {number[]} niveaux
 * @returns {number}
 */
export function additionnerNiveaux(niveaux) {
  if (niveaux.length === 0) return -Infinity
  const somme = niveaux.reduce((total, niveau) => total + 10 ** (niveau / 10), 0)
  return 10 * Math.log10(somme)
}

/**
 * Atténuation due à l'angle, en décibels (valeur négative ou nulle).
 *
 * Modèle simple et assumé : on donne l'angle d'ouverture à −6 dB de l'enceinte,
 * et l'atténuation suit une courbe qui vaut 0 dans l'axe et −6 dB au bord du
 * cône. Au-delà, elle continue de croître au lieu de couper net : une coupure
 * franche dessinerait un bord net sur la carte, ce qu'aucune enceinte ne fait.
 *
 * **L'ouverture dépend de la fréquence** : une enceinte est très directive dans
 * l'aigu et quasi omnidirectionnelle dans le grave. C'est pourquoi l'ouverture
 * est un paramètre par bande, et non une constante par enceinte.
 */
/**
 * @param {number} angleDegres
 * @param {number} ouvertureDegres
 * @returns {number}
 */
export function attenuationAngulaire(angleDegres, ouvertureDegres) {
  if (ouvertureDegres <= 0) {
    throw new Error("L'angle d'ouverture doit être supérieur à zéro.")
  }
  const demiOuverture = ouvertureDegres / 2
  const rapport = Math.abs(angleDegres) / demiOuverture
  // −6 dB exactement au bord du cône, puis décroissance continue.
  return -6 * rapport ** 2
}

/** Angle entre l'axe d'une enceinte et un point, en degrés. */
/**
 * @param {Point} source
 * @param {Point} axe
 * @param {Point} cible
 * @returns {number}
 */
export function angleDepuisAxe(source, axe, cible) {
  const vecteurAxe = { x: axe.x - source.x, y: axe.y - source.y, z: axe.z - source.z }
  const vecteurCible = { x: cible.x - source.x, y: cible.y - source.y, z: cible.z - source.z }

  const normeAxe = Math.hypot(vecteurAxe.x, vecteurAxe.y, vecteurAxe.z)
  const normeCible = Math.hypot(vecteurCible.x, vecteurCible.y, vecteurCible.z)
  if (normeAxe === 0 || normeCible === 0) return 0

  const produit =
    vecteurAxe.x * vecteurCible.x + vecteurAxe.y * vecteurCible.y + vecteurAxe.z * vecteurCible.z
  // Le cosinus peut sortir de [-1, 1] par arrondi : acos rendrait NaN.
  const cosinus = Math.min(1, Math.max(-1, produit / (normeAxe * normeCible)))
  return (Math.acos(cosinus) * 180) / Math.PI
}

/**
 * @typedef {object} Enceinte
 * @property {string} nom
 * @property {Point} position
 * @property {Point} visee Un point vers lequel l'enceinte est dirigée.
 * @property {number} niveau1m Niveau à un mètre dans l'axe, en dB.
 * @property {Record<number, number>} ouverture Ouverture à −6 dB, en degrés,
 *   par bande d'octave.
 * @property {number} [retardMs] Retard appliqué à cette enceinte, en ms.
 */

/**
 * Niveau produit par une enceinte en un point, pour une bande donnée.
 * Champ direct seulement : ni réflexion, ni absorption de l'air.
 */
/**
 * @param {Enceinte} enceinte
 * @param {Point} cible
 * @param {number} bande
 * @returns {number}
 */
export function niveauEnUnPoint(enceinte, cible, bande) {
  const ouverture = enceinte.ouverture[bande]
  if (ouverture === undefined) {
    throw new Error(
      `L'enceinte « ${enceinte.nom} » n'a pas d'ouverture définie pour la bande ${bande} Hz.`
    )
  }

  const d = distance(enceinte.position, cible)
  const angle = angleDepuisAxe(enceinte.position, enceinte.visee, cible)
  return niveauADistance(enceinte.niveau1m, d) + attenuationAngulaire(angle, ouverture)
}

/** Niveau total de plusieurs enceintes en un point, pour une bande donnée. */
/**
 * @param {Enceinte[]} enceintes
 * @param {Point} cible
 * @param {number} bande
 * @returns {number}
 */
export function niveauTotal(enceintes, cible, bande) {
  return additionnerNiveaux(enceintes.map((e) => niveauEnUnPoint(e, cible, bande)))
}

/**
 * Retard à appliquer à une enceinte d'appoint pour qu'elle arrive **après** la
 * source principale, en millisecondes.
 *
 * On ajoute volontairement quelques millisecondes : l'oreille localise la
 * source qui arrive en premier (effet Haas). Sans cette marge, l'auditeur
 * entend le renfort et non la scène, ce qui est exactement ce qu'on cherche à
 * éviter en posant un rappel.
 */
/**
 * @param {number} distancePrincipale
 * @param {number} distanceAppoint
 * @param {number} [margeMs]
 * @param {number} [temperatureCelsius]
 * @returns {number}
 */
export function retardDAppoint(
  distancePrincipale,
  distanceAppoint,
  margeMs = 10,
  temperatureCelsius = 20
) {
  const retard =
    retardMs(distancePrincipale, temperatureCelsius) -
    retardMs(distanceAppoint, temperatureCelsius) +
    margeMs
  // Un retard négatif n'a pas de sens : l'appoint est alors plus loin que la
  // source principale, et c'est la marge seule qui s'applique.
  return Math.max(0, retard)
}

/* ── La carte de couverture ──────────────────────────────────────────────── */

/**
 * Une salle rectangulaire, vue du dessus. Le premier objet réaliste d'Acustika.
 * @typedef {object} Salle
 * @property {number} largeur En mètres, selon x.
 * @property {number} profondeur En mètres, selon y.
 * @property {number} hauteurOreilles Hauteur du plan de calcul, en mètres.
 */

/**
 * @typedef {object} Carte
 * @property {number[][]} niveaux Grille des niveaux en dB, lignes selon y.
 * @property {number} pas Distance entre deux points, en mètres.
 * @property {number} minimum
 * @property {number} maximum
 * @property {number} moyenne
 * @property {number} ecart Écart entre le point le plus fort et le plus faible.
 */

/**
 * Calcule la couverture sur un plan horizontal, à hauteur d'oreilles.
 *
 * **Le calcul vit ici, pas dans la page qui l'affiche.** Une carte de couleurs
 * est très convaincante même quand elle est fausse : la seule protection est
 * que le calcul soit au même endroit que ses vérifications.
 *
 * `ecart` est la mesure qui comptera pour le conseil de placement : une bonne
 * couverture n'est pas une couverture forte, c'est une couverture **régulière**.
 *
 * @param {Salle} salle
 * @param {Enceinte[]} enceintes
 * @param {number} bande
 * @param {number} [pas] Résolution en mètres. 0,5 m suffit à l'œil.
 * @returns {Carte}
 */
export function calculerCarte(salle, enceintes, bande, pas = 0.5) {
  if (pas <= 0) throw new Error('Le pas de la grille doit être supérieur à zéro.')
  if (salle.largeur <= 0 || salle.profondeur <= 0) {
    throw new Error('Les dimensions de la salle doivent être supérieures à zéro.')
  }
  if (enceintes.length === 0) throw new Error('Il faut au moins une enceinte.')

  const colonnes = Math.max(1, Math.round(salle.largeur / pas))
  const lignes = Math.max(1, Math.round(salle.profondeur / pas))

  /** @type {number[][]} */
  const niveaux = []
  let minimum = Infinity
  let maximum = -Infinity
  let somme = 0
  let nombre = 0

  for (let j = 0; j < lignes; j += 1) {
    /** @type {number[]} */
    const ligne = []
    for (let i = 0; i < colonnes; i += 1) {
      // Le centre de la case, pas son coin : un point pile sur le mur ou sur
      // une enceinte fausserait les extrêmes de l'échelle.
      const cible = {
        x: (i + 0.5) * pas,
        y: (j + 0.5) * pas,
        z: salle.hauteurOreilles
      }
      const niveau = niveauTotal(enceintes, cible, bande)
      ligne.push(niveau)
      if (niveau < minimum) minimum = niveau
      if (niveau > maximum) maximum = niveau
      somme += niveau
      nombre += 1
    }
    niveaux.push(ligne)
  }

  return {
    niveaux,
    pas,
    minimum,
    maximum,
    moyenne: somme / nombre,
    ecart: maximum - minimum
  }
}

/* ── Zones d'écoute quelconques, et pentes ───────────────────────────────── */

/**
 * Une zone d'écoute : un contour dessiné librement, avec sa pente.
 *
 * Une salle n'est presque jamais un rectangle plat. Un parterre, un balcon et
 * des gradins n'ont ni la même forme ni la même hauteur, et c'est justement là
 * que les placements se jouent : le dernier rang d'un balcon est le point qu'on
 * oublie et qui n'entend rien.
 *
 * @typedef {object} Zone
 * @property {string} nom
 * @property {Point2D[]} contour Sommets du polygone, en mètres, dans l'ordre.
 * @property {number} hauteurOreilles Hauteur d'écoute au-dessus du sol de la zone.
 * @property {number} [altitude] Hauteur du sol au point de référence. 0 par défaut.
 * @property {number} [pentePourcent] Pente du sol, en %. 10 % = 10 cm par mètre.
 * @property {number} [directionPenteDegres] Direction de la montée, 0° = +x,
 *   90° = +y. La pente monte dans cette direction.
 */

/**
 * @typedef {object} Point2D
 * @property {number} x
 * @property {number} y
 */

/**
 * Le point du contour qui sert d'origine à la pente : le premier sommet.
 * Choisi une fois pour toutes pour que la même zone donne toujours les mêmes
 * altitudes, quel que soit l'ordre dans lequel on calcule.
 * @param {Zone} zone
 * @returns {Point2D}
 */
function origineDeLaPente(zone) {
  return zone.contour[0]
}

/**
 * Altitude du sol en un point de la zone, en mètres.
 * @param {Zone} zone
 * @param {Point2D} point
 * @returns {number}
 */
export function altitudeDuSol(zone, point) {
  const pente = (zone.pentePourcent ?? 0) / 100
  if (pente === 0) return zone.altitude ?? 0

  const origine = origineDeLaPente(zone)
  const angle = ((zone.directionPenteDegres ?? 0) * Math.PI) / 180
  // Distance parcourue dans la direction de la montée, projetée.
  const avancee = (point.x - origine.x) * Math.cos(angle) + (point.y - origine.y) * Math.sin(angle)
  return (zone.altitude ?? 0) + avancee * pente
}

/**
 * Le point est-il dans le polygone ? Algorithme du lancer de rayon.
 *
 * Un point exactement sur une arête est ambigu par nature ; on ne cherche pas à
 * trancher, une case de grille au bord ne change rien à un placement.
 *
 * @param {Point2D[]} contour
 * @param {Point2D} point
 * @returns {boolean}
 */
export function pointDansPolygone(contour, point) {
  let dedans = false
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i, i += 1) {
    const a = contour[i]
    const b = contour[j]
    const traverse = a.y > point.y !== b.y > point.y
    if (!traverse) continue
    const x = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (point.x < x) dedans = !dedans
  }
  return dedans
}

/**
 * Le rectangle qui contient la zone. Sert à ne pas parcourir toute la salle
 * pour une zone qui n'en occupe qu'un coin.
 * @param {Point2D[]} contour
 * @returns {{ xMin: number, xMax: number, yMin: number, yMax: number }}
 */
export function encadrement(contour) {
  const xs = contour.map((p) => p.x)
  const ys = contour.map((p) => p.y)
  return {
    xMin: Math.min(...xs),
    xMax: Math.max(...xs),
    yMin: Math.min(...ys),
    yMax: Math.max(...ys)
  }
}

/**
 * @typedef {object} PointCalcule
 * @property {number} x
 * @property {number} y
 * @property {number} z Hauteur d'oreilles réelle, pente comprise.
 * @property {number} niveau
 */

/**
 * @typedef {object} CouvertureZone
 * @property {string} nom
 * @property {PointCalcule[]} points
 * @property {number} minimum
 * @property {number} maximum
 * @property {number} moyenne
 * @property {number} ecart
 */

/**
 * Couverture d'une zone quelconque, pente comprise.
 *
 * Contrairement à `calculerCarte`, qui suppose un rectangle plat, cette
 * fonction n'énumère que les points **dans** le contour et place chacun à la
 * hauteur que lui donne la pente. Le calcul de niveau, lui, ne change pas :
 * c'est toujours `niveauTotal`, déjà vérifié.
 *
 * @param {Zone} zone
 * @param {Enceinte[]} enceintes
 * @param {number} bande
 * @param {number} [pas]
 * @returns {CouvertureZone}
 */
export function couvertureZone(zone, enceintes, bande, pas = 0.5) {
  if (pas <= 0) throw new Error('Le pas de la grille doit être supérieur à zéro.')
  if (zone.contour.length < 3) {
    throw new Error(`La zone « ${zone.nom} » doit avoir au moins trois sommets.`)
  }
  if (enceintes.length === 0) throw new Error('Il faut au moins une enceinte.')

  const cadre = encadrement(zone.contour)
  /** @type {PointCalcule[]} */
  const points = []
  let minimum = Infinity
  let maximum = -Infinity
  let somme = 0

  for (let y = cadre.yMin + pas / 2; y < cadre.yMax; y += pas) {
    for (let x = cadre.xMin + pas / 2; x < cadre.xMax; x += pas) {
      if (!pointDansPolygone(zone.contour, { x, y })) continue

      const z = altitudeDuSol(zone, { x, y }) + zone.hauteurOreilles
      const niveau = niveauTotal(enceintes, { x, y, z }, bande)
      points.push({ x, y, z, niveau })
      if (niveau < minimum) minimum = niveau
      if (niveau > maximum) maximum = niveau
      somme += niveau
    }
  }

  if (points.length === 0) {
    throw new Error(
      `La zone « ${zone.nom} » est trop petite pour un pas de ${pas} m : aucun point à calculer.`
    )
  }

  return {
    nom: zone.nom,
    points,
    minimum,
    maximum,
    moyenne: somme / points.length,
    ecart: maximum - minimum
  }
}

/**
 * Couverture de plusieurs zones, avec le bilan d'ensemble.
 *
 * **L'écart qui compte est celui de toute la salle**, pas la moyenne des
 * écarts : une salle où le parterre est régulier et le balcon 12 dB en dessous
 * n'est pas une salle bien couverte, même si chaque zone prise isolément l'est.
 *
 * @param {Zone[]} zones
 * @param {Enceinte[]} enceintes
 * @param {number} bande
 * @param {number} [pas]
 * @returns {{ zones: CouvertureZone[], minimum: number, maximum: number, ecart: number }}
 */
export function couvertureSalle(zones, enceintes, bande, pas = 0.5) {
  if (zones.length === 0) throw new Error('Il faut au moins une zone d’écoute.')

  const calculees = zones.map((zone) => couvertureZone(zone, enceintes, bande, pas))
  const minimum = Math.min(...calculees.map((z) => z.minimum))
  const maximum = Math.max(...calculees.map((z) => z.maximum))

  return { zones: calculees, minimum, maximum, ecart: maximum - minimum }
}

/* ── Le conseil de placement ─────────────────────────────────────────────── */

/**
 * @typedef {object} Reglage
 * @property {number} hauteur Hauteur d'accrochage, en mètres.
 * @property {number} ecartement Écartement entre les enceintes, en mètres.
 * @property {number} distanceVisee Distance du point visé, en mètres.
 */

/**
 * @typedef {object} Effet
 * @property {'hauteur'|'ecartement'|'distanceVisee'} reglage
 * @property {number} depuis
 * @property {number} vers
 * @property {number} ecartSeul Écart obtenu en ne changeant que ce réglage-là.
 * @property {number} gain Écart économisé par ce seul changement, en dB.
 */

/**
 * @typedef {object} Conseil
 * @property {Reglage} actuel
 * @property {Reglage} propose
 * @property {number} ecartActuel
 * @property {number} ecartPropose
 * @property {number} gain Écart économisé, en dB. Positif si le conseil aide.
 * @property {number} essais Nombre de placements évalués.
 * @property {Effet[]} effets Ce que chaque réglage apporte, mesuré séparément.
 */

/** Les réglages explorés. Volontairement courts : le conseil doit répondre. */
const PLAGES = {
  hauteur: [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6],
  facteurEcartement: [0.5, 0.7, 0.85, 1, 1.15, 1.3, 1.5],
  facteurVisee: [0.4, 0.55, 0.7, 0.85, 1]
}

/** Le milieu des enceintes : c'est autour de lui qu'on écarte ou resserre. */
function milieu(enceintes) {
  const somme = enceintes.reduce(
    (total, e) => ({ x: total.x + e.position.x, y: total.y + e.position.y }),
    { x: 0, y: 0 }
  )
  return { x: somme.x / enceintes.length, y: somme.y / enceintes.length }
}

/** Le point le plus éloigné du public : c'est lui qui fixe l'échelle de visée. */
function distanceMaximale(zones, depuis) {
  let maximum = 0
  for (const zone of zones) {
    for (const point of zone.contour) {
      const d = Math.hypot(point.x - depuis.x, point.y - depuis.y)
      if (d > maximum) maximum = d
    }
  }
  return maximum
}

/**
 * Le réglage tel qu'il est aujourd'hui, lu sur les enceintes posées.
 * @param {Enceinte[]} enceintes
 * @returns {Reglage}
 */
export function reglageActuel(enceintes) {
  const centre = milieu(enceintes)
  const ecartement =
    enceintes.length < 2
      ? 0
      : Math.max(...enceintes.map((e) => Math.hypot(e.position.x - centre.x, e.position.y - centre.y))) * 2

  const distanceVisee =
    enceintes.reduce(
      (total, e) => total + Math.hypot(e.visee.x - e.position.x, e.visee.y - e.position.y),
      0
    ) / enceintes.length

  return {
    hauteur: enceintes.reduce((total, e) => total + (e.position.z ?? 0), 0) / enceintes.length,
    ecartement,
    distanceVisee
  }
}

/**
 * Applique un réglage à un jeu d'enceintes, sans toucher au reste.
 *
 * On ne réinvente pas des positions : on **transforme celles de l'utilisateur**.
 * Proposer un placement qui ignore où il a jugé possible d'accrocher quelque
 * chose serait un conseil inapplicable, donc inutile.
 *
 * @param {Enceinte[]} enceintes
 * @param {Reglage} reglage
 * @returns {Enceinte[]}
 */
export function appliquerReglage(enceintes, reglage) {
  const centre = milieu(enceintes)
  const actuel = reglageActuel(enceintes)
  const facteur = actuel.ecartement > 0 ? reglage.ecartement / actuel.ecartement : 1

  return enceintes.map((enceinte) => {
    const position = {
      x: centre.x + (enceinte.position.x - centre.x) * facteur,
      y: centre.y + (enceinte.position.y - centre.y) * facteur,
      z: reglage.hauteur
    }

    // La direction de visée est conservée ; seule sa portée change, ce qui
    // revient à piquer plus ou moins bas.
    const vers = {
      x: enceinte.visee.x - enceinte.position.x,
      y: enceinte.visee.y - enceinte.position.y
    }
    const longueur = Math.hypot(vers.x, vers.y) || 1
    const visee = {
      x: position.x + (vers.x / longueur) * reglage.distanceVisee,
      y: position.y + (vers.y / longueur) * reglage.distanceVisee,
      z: enceinte.visee.z ?? 0
    }

    return { ...enceinte, position, visee }
  })
}

/**
 * Cherche le placement dont la couverture est la plus régulière.
 *
 * **Le critère est unique et explicite** : l'écart de niveau sur toute la
 * salle, entre le point le plus fort et le plus faible. Pas la moyenne, pas le
 * niveau maximal — une salle bien couverte n'est pas une salle forte, c'est une
 * salle où tout le monde entend la même chose.
 *
 * **Le conseil rend aussi de quoi l'expliquer.** Pour chaque réglage, on mesure
 * ce qu'il apporte *seul*, en ne changeant que lui. Sans cela le résultat est
 * un nombre tombé du ciel, et personne ne fait confiance à un nombre tombé du
 * ciel — l'outil ne servirait alors à rien.
 *
 * **C'est une proposition, jamais une certitude.** Le modèle ne connaît ni les
 * murs, ni le public, ni le mobilier. L'interface doit le dire.
 *
 * @param {Zone[]} zones
 * @param {Enceinte[]} enceintes
 * @param {number} bande
 * @param {number} [pas] Résolution de la grille, en mètres.
 * @returns {Conseil}
 */
export function conseillerPlacement(zones, enceintes, bande, pas = 1) {
  if (zones.length === 0) throw new Error('Il faut au moins une zone d’écoute pour conseiller un placement.')
  if (enceintes.length === 0) throw new Error('Il faut au moins une enceinte pour conseiller un placement.')

  const actuel = reglageActuel(enceintes)
  const centre = milieu(enceintes)
  const portee = distanceMaximale(zones, centre) || 1

  const ecartDe = (reglage) =>
    couvertureSalle(zones, appliquerReglage(enceintes, reglage), bande, pas).ecart

  const ecartActuel = ecartDe(actuel)

  let meilleur = actuel
  let ecartPropose = ecartActuel
  let essais = 0

  for (const hauteur of PLAGES.hauteur) {
    for (const facteurEcartement of PLAGES.facteurEcartement) {
      for (const facteurVisee of PLAGES.facteurVisee) {
        const candidat = {
          hauteur,
          ecartement: actuel.ecartement * facteurEcartement,
          distanceVisee: portee * facteurVisee
        }
        essais += 1
        const ecart = ecartDe(candidat)
        if (ecart < ecartPropose - 0.01) {
          ecartPropose = ecart
          meilleur = candidat
        }
      }
    }
  }

  // Ce que chaque réglage apporte seul : on part du placement actuel et on ne
  // change qu'une chose. C'est la seule façon honnête de dire « pourquoi ».
  const effets = []
  for (const reglage of ['hauteur', 'ecartement', 'distanceVisee']) {
    if (Math.abs(meilleur[reglage] - actuel[reglage]) < 0.01) continue
    const seul = { ...actuel, [reglage]: meilleur[reglage] }
    const ecartSeul = ecartDe(seul)
    effets.push({
      reglage,
      depuis: actuel[reglage],
      vers: meilleur[reglage],
      ecartSeul,
      gain: ecartActuel - ecartSeul
    })
  }
  effets.sort((a, b) => b.gain - a.gain)

  return {
    actuel,
    propose: meilleur,
    ecartActuel,
    ecartPropose,
    gain: ecartActuel - ecartPropose,
    essais,
    effets
  }
}

/* ── Les retards d'alignement ────────────────────────────────────────────── */

/**
 * @typedef {object} RetardCalcule
 * @property {string} nom
 * @property {boolean} principale
 * @property {number} distanceM Distance à l'enceinte principale, en mètres.
 * @property {number} retardMs Retard à appliquer, en millisecondes.
 */

/**
 * La marge qui garde la localisation sur la scène.
 *
 * Un rappel réglé au retard exact arrive **en même temps** que la façade :
 * l'oreille place alors la source au milieu, ou sur le rappel. En le retardant
 * d'une dizaine de millisecondes de plus, l'effet de précédence fait entendre
 * la scène — le rappel ne fait plus que renforcer. C'est le réglage que tout
 * technicien applique, et l'oublier s'entend tout de suite.
 */
export const MARGE_LOCALISATION_MS = 10

/**
 * Aligne des rappels sur une enceinte principale.
 *
 * **L'hypothèse est simple et assumée** : le son de la façade met, pour
 * atteindre le rappel, le temps de parcourir la distance qui les sépare. Le
 * rappel attend donc ce temps-là, plus la marge. C'est la règle de terrain, et
 * elle vaut pour un public réparti derrière le rappel.
 *
 * **Ce que ce calcul ne fait pas** : il ne tient pas compte de l'endroit précis
 * où l'auditeur se trouve. Un spectateur placé entre la façade et le rappel
 * entendra un alignement différent — un alignement parfait partout n'existe
 * pas, c'est une contrainte physique, pas une limite de l'outil.
 *
 * @param {Enceinte[]} enceintes
 * @param {number} [indexPrincipale] L'enceinte de référence, la façade.
 * @param {number} [margeMs]
 * @param {number} [temperatureCelsius]
 * @returns {RetardCalcule[]}
 */
export function retardsDAlignement(
  enceintes,
  indexPrincipale = 0,
  margeMs = MARGE_LOCALISATION_MS,
  temperatureCelsius = 20
) {
  if (enceintes.length === 0) {
    throw new Error('Il faut au moins une enceinte pour calculer des retards.')
  }
  const principale = enceintes[indexPrincipale]
  if (!principale) {
    throw new Error(`Aucune enceinte à la position ${indexPrincipale} : impossible de s’y aligner.`)
  }

  return enceintes.map((enceinte, index) => {
    if (index === indexPrincipale) {
      return { nom: enceinte.nom, principale: true, distanceM: 0, retardMs: 0 }
    }
    const distanceM = distance(principale.position, enceinte.position)
    return {
      nom: enceinte.nom,
      principale: false,
      distanceM,
      retardMs: retardMs(distanceM, temperatureCelsius) + margeMs
    }
  })
}
