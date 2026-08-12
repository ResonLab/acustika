/**
 * Déclarations de types pour `salle.js`.
 *
 * Le calcul est en JavaScript pour que Node, l'application et un navigateur
 * chargent le même fichier. Ce fichier-ci n'en décrit que les types : aucune
 * logique, donc aucune divergence possible.
 */
export const BANDES: number[]

/** Ce que mesure un coefficient : une fraction par m², ou une aire par objet. */
export type UniteAbsorption = 'surface' | 'objet'

export interface Materiau {
  id: string
  /** Clé de traduction — ce module ne sait pas quelle langue est affichée. */
  cle: string
  parUnite: UniteAbsorption
  alpha: Record<number, number>
}

export const MATERIAUX: Materiau[]

/**
 * Une paroi ou un lot d'objets.
 *
 * `aire` pour un matériau au mètre carré, `nombre` pour un matériau à l'objet —
 * un spectateur n'a pas de surface au sol, il a une absorption propre.
 */
export interface SurfaceSalle {
  materiauId: string
  aire?: number
  nombre?: number
}

export function coefficient(materiauId: string, bande: number): number
export function aireAbsorption(surfaces: SurfaceSalle[], bande: number): number
export function surfaceTotale(surfaces: SurfaceSalle[]): number

export function rt60Sabine(volume: number, aireAbsorptionM2: number): number
export function rt60Eyring(
  volume: number,
  surfaceParois: number,
  aireAbsorptionM2: number
): number
export function constanteSalle(surfaceParois: number, aireAbsorptionM2: number): number

export function facteurDirectivite(ouvertureDegres: number): number
export function indiceDirectivite(ouvertureDegres: number): number
export function distanceCritique(q: number, r: number): number

export function puissanceDepuisNiveau1m(niveau1m: number, ouvertureDegres: number): number
export function niveauReverbere(niveau1m: number, ouvertureDegres: number, r: number): number

export interface MateriauxSalle {
  sol: string
  plafond: string
  murs: string
}

export function surfacesDepuisContour(
  aireAuSol: number,
  perimetre: number,
  hauteur: number,
  materiaux: MateriauxSalle
): SurfaceSalle[]

/** Tout ce qu'on veut savoir d'une salle dans une bande, d'un seul appel. */
export interface AnalyseSalle {
  bande: number
  aireAbsorption: number
  surfaceParois: number
  alphaMoyen: number
  constanteSalle: number
  rt60Sabine: number
  rt60Eyring: number
  facteurDirectivite: number
  indiceDirectivite: number
  distanceCritique: number
}

export function analyserSalle(
  volume: number,
  surfaces: SurfaceSalle[],
  bande: number,
  ouvertureDegres: number
): AnalyseSalle
