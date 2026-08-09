/**
 * La physique d'Acustika — **un seul endroit pour chaque formule**.
 *
 * Règle héritée d'Ohmnia, et qui vaut ici plus qu'ailleurs : une carte de
 * couleurs est très convaincante, même quand elle est fausse. Tout ce qui est
 * calculé ici est donc vérifié contre des valeurs connues à la main, avant
 * qu'on affiche quoi que ce soit.
 *
 * Ce fichier ne dépend de rien : ni interface, ni fichier de projet. Node 24
 * l'exécute tel quel, sans compilation.
 *
 * **Ce que ce module ne fait pas encore**, et qu'il ne faut pas laisser croire :
 * il ignore les réflexions sur les parois, la réverbération, et la directivité
 * dépendante de la fréquence au-delà de ce qu'on lui donne. Il calcule un champ
 * direct. C'est déjà utile — c'est ce qui décide d'un placement — mais ce n'est
 * pas une simulation de salle.
 */

/** Bandes d'octave retenues, en hertz. */
export const BANDES_OCTAVE = [125, 250, 500, 1000, 2000, 4000, 8000] as const

export type BandeOctave = (typeof BANDES_OCTAVE)[number]

export interface Point {
  x: number
  y: number
  z: number
}

/**
 * Célérité du son dans l'air, en mètres par seconde.
 *
 * Elle dépend de la température : 343 m/s à 20 °C, mais 331 à 0 °C. Une salle
 * pleine monte facilement à 25 °C, ce qui déplace les retards de près de 1 %.
 * Autant le calculer plutôt que de figer 343.
 */
export function celeriteSon(temperatureCelsius = 20): number {
  return 331.3 * Math.sqrt(1 + temperatureCelsius / 273.15)
}

/** Distance entre deux points, en mètres. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

/**
 * Retard de propagation, en millisecondes.
 * Environ 2,9 ms par mètre à 20 °C — le chiffre que tout technicien connaît.
 */
export function retardMs(distanceMetres: number, temperatureCelsius = 20): number {
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
export function niveauADistance(
  niveauReference: number,
  distanceMetres: number,
  distanceReference = 1
): number {
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
export function additionnerNiveaux(niveaux: number[]): number {
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
export function attenuationAngulaire(angleDegres: number, ouvertureDegres: number): number {
  if (ouvertureDegres <= 0) {
    throw new Error("L'angle d'ouverture doit être supérieur à zéro.")
  }
  const demiOuverture = ouvertureDegres / 2
  const rapport = Math.abs(angleDegres) / demiOuverture
  // −6 dB exactement au bord du cône, puis décroissance continue.
  return -6 * rapport ** 2
}

/** Angle entre l'axe d'une enceinte et un point, en degrés. */
export function angleDepuisAxe(source: Point, axe: Point, cible: Point): number {
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

export interface Enceinte {
  nom: string
  position: Point
  /** Un point vers lequel l'enceinte est dirigée. */
  visee: Point
  /** Niveau à un mètre dans l'axe, en dB. */
  niveau1m: number
  /** Ouverture à −6 dB, en degrés, par bande d'octave. */
  ouverture: Record<number, number>
  /** Retard appliqué à cette enceinte, en millisecondes. */
  retardMs?: number
}

/**
 * Niveau produit par une enceinte en un point, pour une bande donnée.
 * Champ direct seulement : ni réflexion, ni absorption de l'air.
 */
export function niveauEnUnPoint(enceinte: Enceinte, cible: Point, bande: number): number {
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
export function niveauTotal(enceintes: Enceinte[], cible: Point, bande: number): number {
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
export function retardDAppoint(
  distancePrincipale: number,
  distanceAppoint: number,
  margeMs = 10,
  temperatureCelsius = 20
): number {
  const retard =
    retardMs(distancePrincipale, temperatureCelsius) -
    retardMs(distanceAppoint, temperatureCelsius) +
    margeMs
  // Un retard négatif n'a pas de sens : l'appoint est alors plus loin que la
  // source principale, et c'est la marge seule qui s'applique.
  return Math.max(0, retard)
}
