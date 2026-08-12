/**
 * Déclarations de types pour `formes.js`.
 *
 * La géométrie est en JavaScript pour que Node, l'application et — le jour où
 * elle existera — la page web chargent le même fichier. Ce fichier-ci n'en
 * décrit que les types : aucune logique, donc aucune divergence possible.
 */
export interface Point2D {
  x: number
  y: number
}

export function rectangle(centre: Point2D, largeur: number, profondeur: number): Point2D[]
export function carre(centre: Point2D, cote: number): Point2D[]
export function cercle(centre: Point2D, rayon: number, segments?: number): Point2D[]
export function demiCercle(centre: Point2D, rayon: number, segments?: number): Point2D[]
export function eventail(
  centre: Point2D,
  largeurScene: number,
  largeurFond: number,
  profondeur: number
): Point2D[]
export function ferACheval(
  centre: Point2D,
  largeur: number,
  profondeur: number,
  segments?: number
): Point2D[]

export function aire(contour: Point2D[]): number
export function perimetre(contour: Point2D[]): number

/** Un paramètre saisissable d'une forme. `cle` est une clé de traduction. */
export interface ParametreForme {
  nom: string
  cle: string
  defaut: number
}

/**
 * Une forme proposée à l'écran.
 *
 * `construire` reçoit les paramètres saisis, nommés d'après `parametres[].nom`.
 */
export interface FormePrefaite {
  id: string
  cle: string
  parametres: ParametreForme[]
  construire: (centre: Point2D, parametres: Record<string, number>) => Point2D[]
}

export const FORMES: FormePrefaite[]
