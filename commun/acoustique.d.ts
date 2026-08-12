/**
 * Déclarations de types pour `acoustique.js`.
 *
 * Le calcul est en JavaScript pour que le navigateur, Node et l'application
 * chargent le même fichier. Ce fichier-ci n'en décrit que les types : aucune
 * logique, donc aucune divergence possible.
 */
export const BANDES_OCTAVE: number[]
export const DISTANCE_MINIMALE: number

export interface Point {
  x: number
  y: number
  z: number
}

export interface Point2D {
  x: number
  y: number
}

export interface Enceinte {
  nom: string
  position: Point
  visee: Point
  niveau1m: number
  ouverture: Record<number, number>
  retardMs?: number
}

export interface Zone {
  nom: string
  contour: Point2D[]
  hauteurOreilles: number
  altitude?: number
  pentePourcent?: number
  directionPenteDegres?: number
}

export interface PointCalcule {
  x: number
  y: number
  z: number
  niveau: number
}

export interface CouvertureZone {
  nom: string
  points: PointCalcule[]
  minimum: number
  maximum: number
  moyenne: number
  ecart: number
}

export function celeriteSon(temperatureCelsius?: number): number
export function distance(a: Point, b: Point): number
export function retardMs(distanceMetres: number, temperatureCelsius?: number): number
export function niveauADistance(
  niveauReference: number,
  distanceMetres: number,
  distanceReference?: number
): number
export function additionnerNiveaux(niveaux: number[]): number
export function attenuationAngulaire(angleDegres: number, ouvertureDegres: number): number
export function angleDepuisAxe(source: Point, axe: Point, cible: Point): number
export function niveauEnUnPoint(enceinte: Enceinte, cible: Point, bande: number): number
export function niveauTotal(
  enceintes: Enceinte[],
  cible: Point,
  bande: number,
  niveauReverbereDb?: number
): number
export function retardDAppoint(
  distancePrincipale: number,
  distanceAppoint: number,
  margeMs?: number,
  temperatureCelsius?: number
): number
export function altitudeDuSol(zone: Zone, point: Point2D): number
export function pointDansPolygone(contour: Point2D[], point: Point2D): boolean
export function encadrement(contour: Point2D[]): {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}
export function couvertureZone(
  zone: Zone,
  enceintes: Enceinte[],
  bande: number,
  pas?: number,
  niveauReverbereDb?: number
): CouvertureZone
export function couvertureSalle(
  zones: Zone[],
  enceintes: Enceinte[],
  bande: number,
  pas?: number,
  niveauReverbereDb?: number
): { zones: CouvertureZone[]; minimum: number; maximum: number; ecart: number }

export interface Reglage {
  hauteur: number
  ecartement: number
  distanceVisee: number
}

export interface Effet {
  reglage: 'hauteur' | 'ecartement' | 'distanceVisee'
  depuis: number
  vers: number
  ecartSeul: number
  gain: number
}

export interface Conseil {
  actuel: Reglage
  propose: Reglage
  ecartActuel: number
  ecartPropose: number
  gain: number
  essais: number
  effets: Effet[]
}

export function reglageActuel(enceintes: Enceinte[]): Reglage
export function appliquerReglage(enceintes: Enceinte[], reglage: Reglage): Enceinte[]
export function conseillerPlacement(
  zones: Zone[],
  enceintes: Enceinte[],
  bande: number,
  pas?: number,
  niveauReverbereDb?: number
): Conseil

export interface RetardCalcule {
  nom: string
  principale: boolean
  distanceM: number
  retardMs: number
}

export const MARGE_LOCALISATION_MS: number
export function retardsDAlignement(
  enceintes: Enceinte[],
  indexPrincipale?: number,
  margeMs?: number,
  temperatureCelsius?: number
): RetardCalcule[]

export interface PointCoupe {
  y: number
  sol: number
  oreilles: number
  niveau: number | null
}

export interface EnceinteEnCoupe {
  nom: string
  y: number
  z: number
  viseeY: number
  viseeZ: number
  piqueDegres: number
}

export interface Coupe {
  x: number
  points: PointCoupe[]
  enceintes: EnceinteEnCoupe[]
}

export function profilCoupe(
  zones: Zone[],
  enceintes: Enceinte[],
  x: number,
  bande: number,
  pas?: number,
  niveauReverbereDb?: number
): Coupe
