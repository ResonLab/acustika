/**
 * Lecture du ballon de directivité d'un fichier CLF binaire (`.CF1`, `.CF2`).
 *
 * **Ce module a été écrit le 16 août 2026, après trois hypothèses réfutées.**
 * Les deux premières tentatives devinaient un découpage et l'ajustaient sur des
 * valeurs connues ; elles sont tombées devant une mesure qu'elles n'avaient pas
 * servi à produire. Celle-ci ne devine rien : la disposition vient de la
 * **figure 1 de `CLF_specs.pdf`**, livrée avec CLF Authoring.
 *
 * ## La disposition, telle que la spécification la donne
 *
 * Deux angles, nommés en section 12.3 de la spécification :
 *
 * · **φ, *arc angle*** — 0° droit devant, **sur l'axe**, jusqu'à 180° à
 *   l'arrière ;
 * · **θ, *rotation angle*** — 0° en haut, 90° à gauche, 180° en bas, 270° à
 *   droite, **dans le sens antihoraire vu de l'arrière**.
 *
 * ```
 * un bloc par bande, les blocs se suivent sans séparateur
 * un bloc = 36 arcs × 19 points        (CF1, pas de 10°)
 *           72 arcs × 37 points        (CF2, pas de 5°)
 * φ varie le plus vite : les points d'un arc sont contigus
 * valeurs : dB relatifs à l'axe, flottants little-endian, 0 sur l'axe
 * ```
 *
 * ## Comment le ballon est repéré, et pourquoi pas par un offset écrit en dur
 *
 * **Par une propriété physique.** φ = 0 désigne l'axe, donc *le même point*
 * pour tous les arcs : ces valeurs doivent être identiques. Idem pour φ = 180,
 * le point arrière. On balaie les offsets possibles et on retient ceux où les
 * deux pôles sont constants **et** où le bloc varie réellement — un long
 * remplissage nul satisferait la première condition sans rien contenir.
 *
 * Un offset écrit en dur ne vaudrait que pour un fichier ; ce critère-ci vaut
 * pour tous, parce qu'il décrit une sphère et non un fichier.
 *
 * ## Ce que ce module ne sait pas, et qu'il ne faut pas lui faire dire
 *
 * **Les fréquences des bandes ne sont pas dans le binaire.** Cherchées sous
 * toutes les formes plausibles — entiers 16 et 32 bits, flottants — elles n'y
 * sont pas. Le fichier donne un *nombre* de bandes, pas leur position dans le
 * spectre. Ce module rend donc `nombreBandes` et **jamais des fréquences
 * inventées** : se tromper d'octave décalerait toute la directivité, et la
 * carte serait fausse avec l'aplomb d'une vraie.
 *
 * `frequencesSupposees()` existe pour l'interface, mais elle **porte son doute
 * dans son nom** et l'appelant doit faire confirmer.
 */

/** Taille d'un pas angulaire, en degrés, selon le type de fichier. */
const GEOMETRIE = {
  CF1: { pas: 10, points: 19, arcs: 36 },
  CF2: { pas: 5, points: 37, arcs: 72 }
}

/** Le seuil qui définit l'ouverture. −6 dB est la convention du métier. */
export const SEUIL_OUVERTURE_DB = -6

/**
 * Le type d'un fichier CLF, d'après son premier octet.
 *
 * `0x40` pour CF1, `0x41` pour CF2 — relevé sur les deux fichiers réels et sur
 * les quatorze exemples livrés avec le visualiseur.
 *
 * @param {Uint8Array} octets
 * @returns {'CF1' | 'CF2' | null}
 */
export function typeDeFichier(octets) {
  if (!octets || octets.length < 32) return null
  if (octets[0] === 0x40) return 'CF1'
  if (octets[0] === 0x41) return 'CF2'
  return null
}

/**
 * Lit les flottants little-endian d'un tampon.
 *
 * @param {Uint8Array} octets
 * @returns {Float32Array}
 */
function flottants(octets) {
  const alignes = octets.byteLength - (octets.byteLength % 4)
  const copie = new Uint8Array(octets.buffer.slice(octets.byteOffset, octets.byteOffset + alignes))
  return new Float32Array(copie.buffer)
}

/**
 * Un bloc de bande est-il plausible à cet indice ?
 *
 * Rend `null` si non, sinon l'étendue du bloc en dB. Les deux conditions sont
 * complémentaires : la constance aux pôles dit que c'est une sphère, l'étendue
 * dit qu'il y a une donnée dedans.
 *
 * @param {Float32Array} valeurs
 * @param {number} debut
 * @param {{ points: number, arcs: number }} geo
 * @returns {number | null}
 */
function etendueSiBloc(valeurs, debut, geo) {
  const { points, arcs } = geo
  const taille = points * arcs
  if (debut < 0 || debut + taille > valeurs.length) return null

  let mini = Infinity
  let maxi = -Infinity
  for (let i = debut; i < debut + taille; i += 1) {
    const v = valeurs[i]
    if (!Number.isFinite(v) || Math.abs(v) > 500) return null
    if (v < mini) mini = v
    if (v > maxi) maxi = v
  }

  // Les deux pôles : φ = 0 (l'axe) et φ = 180 (l'arrière) sont chacun un point
  // unique, donc identiques d'un arc à l'autre.
  let axeMin = Infinity
  let axeMax = -Infinity
  let arriereMin = Infinity
  let arriereMax = -Infinity
  for (let a = 0; a < arcs; a += 1) {
    const surAxe = valeurs[debut + a * points]
    const surArriere = valeurs[debut + a * points + points - 1]
    if (surAxe < axeMin) axeMin = surAxe
    if (surAxe > axeMax) axeMax = surAxe
    if (surArriere < arriereMin) arriereMin = surArriere
    if (surArriere > arriereMax) arriereMax = surArriere
  }
  if (axeMax - axeMin > 0.01 || arriereMax - arriereMin > 0.01) return null

  return maxi - mini
}

/**
 * Repère le ballon et rend ses bandes.
 *
 * **L'étendue minimale exigée pour l'amorce est délibérément haute** : on
 * cherche une bande franchement directive pour être sûr de tomber sur le
 * ballon, puis on remonte et on redescend de bloc en bloc avec un critère plus
 * souple. Une bande grave est presque omnidirectionnelle — l'exiger directive
 * ferait manquer le début du ballon.
 *
 * @param {Uint8Array} octets
 * @returns {{ type: 'CF1'|'CF2', offset: number, nombreBandes: number,
 *   geometrie: { pas: number, points: number, arcs: number },
 *   bandes: Float32Array[] }}
 */
export function lireBallon(octets) {
  const type = typeDeFichier(octets)
  if (!type) {
    throw new Error(
      "Ce fichier n'est pas un CLF binaire reconnu : son premier octet ne vaut " +
        'ni 0x40 (CF1) ni 0x41 (CF2).'
    )
  }

  const geo = GEOMETRIE[type]
  const taille = geo.points * geo.arcs
  const valeurs = flottants(octets)

  let amorce = -1
  for (let debut = 0; debut + taille <= valeurs.length; debut += 1) {
    const etendue = etendueSiBloc(valeurs, debut, geo)
    if (etendue !== null && etendue >= 10) {
      amorce = debut
      break
    }
  }
  if (amorce < 0) {
    throw new Error(
      "Aucun ballon n'a été trouvé dans ce fichier : aucun bloc ne présente des " +
        'valeurs constantes sur l’axe et à l’arrière.'
    )
  }

  let premier = amorce
  while (etendueSiBloc(valeurs, premier - taille, geo) !== null) premier -= taille

  const bandes = []
  for (let p = premier; etendueSiBloc(valeurs, p, geo) !== null; p += taille) {
    bandes.push(valeurs.slice(p, p + taille))
  }

  return {
    type,
    offset: premier * 4,
    nombreBandes: bandes.length,
    geometrie: geo,
    bandes
  }
}

/**
 * L'atténuation le long d'un arc, du plus proche de l'axe au plus lointain.
 *
 * @param {Float32Array} bande
 * @param {{ points: number }} geo
 * @param {number} indiceArc
 * @returns {number[]}
 */
export function arc(bande, geo, indiceArc) {
  const base = indiceArc * geo.points
  return Array.from(bande.slice(base, base + geo.points))
}

/**
 * L'angle où une courbe passe sous le seuil, par interpolation linéaire.
 *
 * **Interpolation et non arrondi au point le plus proche** : au pas de 10°,
 * arrondir ferait varier l'ouverture par bonds de 20°. C'est la même raison
 * que dans `polaire.js`.
 *
 * Rend `null` si la courbe ne redescend jamais sous le seuil — le visualiseur
 * écrit alors 360°.
 *
 * @param {number[]} courbe
 * @param {number} pas
 * @param {number} [seuil]
 * @returns {number | null}
 */
export function angleAuSeuil(courbe, pas, seuil = SEUIL_OUVERTURE_DB) {
  for (let i = 1; i < courbe.length; i += 1) {
    if (courbe[i] <= seuil) {
      const avant = courbe[i - 1]
      const apres = courbe[i]
      if (avant === apres) return (i - 1) * pas
      const fraction = (avant - seuil) / (avant - apres)
      return (i - 1 + fraction) * pas
    }
  }
  return null
}

/**
 * L'ouverture à −6 dB d'une bande, dans un plan.
 *
 * Un plan est décrit par ses deux arcs opposés. D'après la figure 1 : θ = 0°
 * est en haut et θ = 90° à gauche, donc le plan **horizontal** est fait des
 * arcs à 90° et 270°, et le plan **vertical** des arcs à 0° et 180°.
 *
 * @param {Float32Array} bande
 * @param {{ pas: number, points: number, arcs: number }} geo
 * @param {'horizontal' | 'vertical'} plan
 * @returns {number} L'ouverture en degrés ; 360 si elle ne redescend jamais.
 */
export function ouverture(bande, geo, plan) {
  const quart = geo.arcs / 4
  const [a, b] = plan === 'horizontal' ? [quart, 3 * quart] : [0, 2 * quart]
  const cote1 = angleAuSeuil(arc(bande, geo, a), geo.pas)
  const cote2 = angleAuSeuil(arc(bande, geo, b), geo.pas)
  if (cote1 === null || cote2 === null) return 360
  return cote1 + cote2
}

/**
 * Les ouvertures horizontales et verticales de toutes les bandes.
 *
 * C'est **la seule chose qu'Acustika consomme** d'un fichier de directivité :
 * le reste du ballon est plus riche que ce que le modèle sait exploiter.
 *
 * @param {Uint8Array} octets
 * @returns {{ type: string, offset: number, nombreBandes: number,
 *   horizontales: number[], verticales: number[] }}
 */
export function ouverturesParBande(octets) {
  const ballon = lireBallon(octets)
  return {
    type: ballon.type,
    offset: ballon.offset,
    nombreBandes: ballon.nombreBandes,
    horizontales: ballon.bandes.map((b) => ouverture(b, ballon.geometrie, 'horizontal')),
    verticales: ballon.bandes.map((b) => ouverture(b, ballon.geometrie, 'vertical'))
  }
}

/**
 * Les fréquences que porteraient ces bandes **si** la série commence à 125 Hz.
 *
 * **Le nom porte le doute, et il doit le garder.** Les fréquences ne sont pas
 * écrites dans le binaire : elles y ont été cherchées en entiers 16 et 32 bits
 * et en flottants, elles n'y sont pas. Cette série est vérifiée sur les deux
 * fichiers connus — `cls-3300.CF1` (8 bandes, 125 Hz à 16 kHz) et
 * `Active_halfsphere.CF1` (6 bandes, 125 Hz à 4 kHz) — et rien ne garantit
 * qu'un troisième fichier commence là.
 *
 * **L'interface doit faire confirmer**, jamais afficher ces valeurs comme
 * acquises : se tromper d'octave décale toute la directivité.
 *
 * @param {number} nombreBandes
 * @returns {number[]}
 */
export function frequencesSupposees(nombreBandes) {
  return Array.from({ length: nombreBandes }, (_, i) => 125 * 2 ** i)
}
