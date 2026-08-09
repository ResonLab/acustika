/** Types partagés entre les trois couches : main, preload, renderer. */

export interface Point2D {
  x: number
  y: number
}

/**
 * Une enceinte de la bibliothèque — le « stock » d'enceintes.
 *
 * `ouverture` donne l'angle à −6 dB **par bande d'octave** : une enceinte est
 * très directive dans l'aigu et quasi omnidirectionnelle dans le grave.
 * Une valeur unique donnerait de mauvais conseils, c'est écrit dans CONTEXTE.md.
 */
export interface ModeleEnceinte {
  id: string
  nom: string
  marque: string
  /** Niveau à un mètre dans l'axe, en dB. */
  niveau1m: number
  /** Ouverture horizontale à −6 dB, en degrés, par bande. */
  ouverture: Record<number, number>
  /** D'où viennent ces chiffres : fiche technique, mesure, estimation. */
  source: string
}

/** Une enceinte posée dans un projet : un modèle, une position, une visée. */
export interface EnceintePlacee {
  id: string
  modeleId: string
  /** Position au sol, en mètres. */
  position: Point2D
  /** Hauteur d'accrochage, en mètres. */
  hauteur: number
  /** Point visé au sol : c'est lui qui donne l'axe. */
  visee: Point2D
  /** Hauteur du point visé — permet de piquer vers le bas. */
  hauteurVisee: number
  /** Décalage de niveau appliqué à cette enceinte, en dB. */
  gainDb: number
  /** Retard appliqué, en millisecondes. */
  retardMs: number
  active: boolean
}

/**
 * Une zone d'écoute : un contour dessiné librement, avec sa pente.
 * Un parterre, un balcon et des gradins n'ont ni la même forme ni la même
 * hauteur — et c'est là que les placements se jouent.
 */
export interface ZoneEcoute {
  id: string
  nom: string
  contour: Point2D[]
  hauteurOreilles: number
  altitude: number
  /** Pente du sol en %, 10 % = 10 cm par mètre. */
  pentePourcent: number
  /** Direction de la montée : 0° = +x, 90° = +y. */
  directionPenteDegres: number
}

export interface Projet {
  nom: string
  /** Emprise du plan, en mètres. Sert au cadrage, pas au calcul. */
  largeur: number
  profondeur: number
  zones: ZoneEcoute[]
  enceintes: EnceintePlacee[]
  /** Bande d'octave affichée. */
  bande: number
  /** Version du format de fichier, pour pouvoir le faire évoluer sans perte. */
  version: number
}

export interface ProjetOuvert {
  chemin: string
  projet: Projet
}

/** Résultat affiché à côté de la carte, zone par zone. */
export interface StatistiquesZone {
  nom: string
  minimum: number
  maximum: number
  moyenne: number
  ecart: number
}
