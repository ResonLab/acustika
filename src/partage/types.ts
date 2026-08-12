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

/**
 * La salle elle-même : ce qui absorbe, et combien.
 *
 * **Sans elle, Acustika calculait la même carte pour une église et pour un
 * studio traité.** Le champ direct ne dépend pas des murs ; tout le reste si.
 *
 * Le modèle est statistique — Sabine, Eyring, constante de salle — donc il
 * suppose l'énergie réverbérée uniformément répartie. C'est faux près des
 * parois et dans un volume long et étroit, et c'est écrit dans les conditions
 * d'utilisation. Ce n'est pas du lancer de rayons, et ça ne prétend pas l'être.
 */
export interface Salle {
  /** Hauteur sous plafond, en mètres — elle donne le volume et les murs. */
  hauteur: number
  /** Matériaux des trois grandes surfaces, par identifiant. */
  sol: string
  plafond: string
  murs: string
  /**
   * Nombre de spectateurs assis.
   *
   * Ils se comptent à l'unité, pas au mètre carré : un spectateur n'a pas de
   * surface au sol, il a une absorption propre. Une salle pleine peut avoir
   * deux fois l'absorption de la même salle vide — c'est la première cause
   * d'écart entre une balance faite à vide et le résultat en représentation.
   */
  spectateurs: number
  /**
   * Prendre la réverbération en compte dans la carte.
   *
   * Réglable, parce qu'un plein air n'a pas de salle du tout et qu'un
   * utilisateur qui n'a pas encore décrit ses matériaux ne doit pas voir une
   * carte fausse par des valeurs par défaut.
   */
  active: boolean
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
  /**
   * La salle. **Facultative** : les projets enregistrés avant son arrivée n'en
   * ont pas, et doivent continuer de s'ouvrir. Un fichier qu'on ne sait plus
   * relire est une perte de travail, pas une montée de version.
   */
  salle?: Salle
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
