/**
 * Les formes de salle préfaites.
 *
 * Dessiner un rectangle point par point à la souris donne un rectangle qui
 * n'en est pas un : les côtés ne sont pas parallèles, l'aire est fausse de
 * quelques pour cent, et **toute la couverture calculée hérite de cette
 * approximation**. Or la plupart des salles sont des rectangles, des éventails
 * ou des demi-cercles. Les poser exactement coûte un clic et supprime l'erreur.
 *
 * **Ce module ne dépend de rien** — ni interface, ni base, ni Electron — pour la
 * même raison que `acoustique.js` : il tourne dans l'application et dans les
 * tests, et il tournera dans la page web le jour où elle existera.
 *
 * Toutes les formes sont rendues **en sens trigonométrique** et fermées
 * implicitement : le dernier point rejoint le premier, sans le répéter. C'est
 * ce qu'attend `pointDansPolygone()`.
 */

/**
 * Nombre de segments d'un arc complet.
 *
 * **48 n'est pas un chiffre rond par hasard.** L'aire d'un polygone régulier
 * inscrit vaut (n / 2pi)·sin(2pi/n) fois celle du disque, soit un déficit
 * d'environ **2pi² / 3n²** — 0,29 % à 48 segments. C'est deux ordres de
 * grandeur sous l'incertitude d'un coefficient d'absorption, qu'on connaît au
 * mieux à 10 % près. Monter à 200 segments alourdirait chaque test
 * d'appartenance sans rien gagner de mesurable, et ces tests sont refaits pour
 * **chaque point de la carte**.
 *
 * *Ce chiffre a d'abord été écrit à moitié — 0,15 %, la moitié du vrai. C'est
 * `tests/formes.mjs` qui l'a corrigé, en comparant à pi·r² calculé à part.
 * Une valeur attendue recopiée depuis le code qu'elle vérifie n'aurait rien vu.*
 */
const SEGMENTS_ARC = 48

/** Arrondi au millimètre : un contour n'a pas besoin de plus, et se relit. */
function mm(valeur) {
  return Math.round(valeur * 1000) / 1000
}

function point(x, y) {
  return { x: mm(x), y: mm(y) }
}

/**
 * Un rectangle, posé sur ses axes.
 *
 * `centre` est le centre géométrique, pas un coin : c'est ce qu'on vise quand
 * on pose une forme au milieu d'un plan.
 */
export function rectangle(centre, largeur, profondeur) {
  if (!(largeur > 0) || !(profondeur > 0)) {
    throw new Error('formes.dimensionsPositives')
  }
  const dx = largeur / 2
  const dy = profondeur / 2
  return [
    point(centre.x - dx, centre.y - dy),
    point(centre.x + dx, centre.y - dy),
    point(centre.x + dx, centre.y + dy),
    point(centre.x - dx, centre.y + dy)
  ]
}

/** Un carré : le rectangle dont les deux côtés sont égaux. */
export function carre(centre, cote) {
  return rectangle(centre, cote, cote)
}

/**
 * Un cercle, approché par un polygone régulier.
 *
 * Le rayon est celui du cercle **circonscrit** : les sommets sont sur le
 * cercle, les côtés à l'intérieur. L'aire du polygone est donc légèrement
 * inférieure à pi·r² — de moins de 0,15 % à 48 segments, voir SEGMENTS_ARC.
 */
export function cercle(centre, rayon, segments = SEGMENTS_ARC) {
  if (!(rayon > 0)) throw new Error('formes.rayonPositif')
  if (!(segments >= 3)) throw new Error('formes.troisSegments')

  const sommets = []
  for (let i = 0; i < segments; i += 1) {
    const angle = (2 * Math.PI * i) / segments
    sommets.push(point(centre.x + rayon * Math.cos(angle), centre.y + rayon * Math.sin(angle)))
  }
  return sommets
}

/**
 * Un demi-cercle, le diamètre côté scène.
 *
 * C'est la forme du parterre d'un amphithéâtre : la scène est au sud, le public
 * s'ouvre en éventail vers le nord. Le diamètre est donc **au bas** du contour,
 * et l'arc monte vers les +y.
 */
export function demiCercle(centre, rayon, segments = SEGMENTS_ARC) {
  if (!(rayon > 0)) throw new Error('formes.rayonPositif')
  if (!(segments >= 3)) throw new Error('formes.troisSegments')

  // Le demi-cercle porte la moitié des segments d'un cercle complet : à rayon
  // égal, ses côtés font la même longueur que ceux du cercle.
  const pas = Math.max(2, Math.round(segments / 2))
  const sommets = []
  for (let i = 0; i <= pas; i += 1) {
    const angle = (Math.PI * i) / pas
    sommets.push(point(centre.x + rayon * Math.cos(angle), centre.y + rayon * Math.sin(angle)))
  }
  return sommets
}

/**
 * Un éventail : un trapèze qui s'ouvre en s'éloignant de la scène.
 *
 * **C'est la forme de salle la plus répandue après le rectangle**, et celle qui
 * change le plus un placement : les spectateurs des derniers rangs sont
 * beaucoup plus écartés que ceux du premier, donc plus loin de l'axe des
 * enceintes. Un rectangle posé à leur place mentirait sur les bords.
 *
 * `largeurScene` est le petit côté, près de la scène ; `largeurFond` le grand.
 */
export function eventail(centre, largeurScene, largeurFond, profondeur) {
  if (!(largeurScene > 0) || !(largeurFond > 0) || !(profondeur > 0)) {
    throw new Error('formes.dimensionsPositives')
  }
  const dy = profondeur / 2
  const ds = largeurScene / 2
  const df = largeurFond / 2
  return [
    point(centre.x - ds, centre.y - dy),
    point(centre.x + ds, centre.y - dy),
    point(centre.x + df, centre.y + dy),
    point(centre.x - df, centre.y + dy)
  ]
}

/**
 * Un fer à cheval : le parterre d'un théâtre à l'italienne.
 *
 * Deux côtés droits près de la scène, puis un arc au fond. C'est la forme
 * classique d'une salle de théâtre, et elle n'est ni un rectangle ni un
 * demi-cercle — la traiter comme l'un ou l'autre fausse les bords, là
 * précisément où la couverture est difficile.
 */
export function ferACheval(centre, largeur, profondeur, segments = SEGMENTS_ARC) {
  if (!(largeur > 0) || !(profondeur > 0)) {
    throw new Error('formes.dimensionsPositives')
  }
  if (!(segments >= 3)) throw new Error('formes.troisSegments')

  const rayon = largeur / 2
  // L'arc du fond occupe un demi-disque ; il faut donc de la place pour lui.
  // Sans ce refus, une profondeur trop faible replierait le contour sur
  // lui-même et produirait un polygone croisé, dont l'aire n'a aucun sens.
  const droit = profondeur - rayon
  if (!(droit > 0)) throw new Error('formes.ferAChevalTropCourt')

  const dy = profondeur / 2
  const sommets = [
    point(centre.x - rayon, centre.y - dy),
    point(centre.x + rayon, centre.y - dy)
  ]

  const pas = Math.max(2, Math.round(segments / 2))
  const centreArc = centre.y - dy + droit
  for (let i = 0; i <= pas; i += 1) {
    const angle = (Math.PI * i) / pas
    sommets.push(point(centre.x + rayon * Math.cos(angle), centreArc + rayon * Math.sin(angle)))
  }
  return sommets
}

/**
 * L'aire d'un contour, en mètres carrés — formule du lacet.
 *
 * Elle sert à deux choses : afficher l'aire d'une zone, et **alimenter le
 * calcul de réverbération**, qui a besoin des surfaces réelles. La valeur
 * absolue rend le résultat indépendant du sens de parcours.
 */
export function aire(contour) {
  if (!Array.isArray(contour) || contour.length < 3) return 0
  let somme = 0
  for (let i = 0; i < contour.length; i += 1) {
    const a = contour[i]
    const b = contour[(i + 1) % contour.length]
    somme += a.x * b.y - b.x * a.y
  }
  return Math.abs(somme) / 2
}

/**
 * Le périmètre d'un contour, en mètres.
 *
 * Sert au calcul de la surface des murs : périmètre × hauteur.
 */
export function perimetre(contour) {
  if (!Array.isArray(contour) || contour.length < 2) return 0
  let somme = 0
  for (let i = 0; i < contour.length; i += 1) {
    const a = contour[i]
    const b = contour[(i + 1) % contour.length]
    somme += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return somme
}

/**
 * Les formes proposées, avec leurs paramètres.
 *
 * **Cette table est la seule source** : l'interface la parcourt pour construire
 * ses boutons et ses champs. Ajouter une forme ici la fait apparaître à l'écran
 * sans toucher au composant — et surtout, aucune liste de formes ne peut
 * diverger de la liste des fonctions.
 *
 * Les libellés sont des **clés de traduction**, pas des phrases : ce module ne
 * sait pas quelle langue la fenêtre affiche.
 */
export const FORMES = [
  {
    id: 'rectangle',
    cle: 'forme.rectangle',
    parametres: [
      { nom: 'largeur', cle: 'forme.largeur', defaut: 12 },
      { nom: 'profondeur', cle: 'forme.profondeur', defaut: 18 }
    ],
    construire: (centre, p) => rectangle(centre, p.largeur, p.profondeur)
  },
  {
    id: 'carre',
    cle: 'forme.carre',
    parametres: [{ nom: 'cote', cle: 'forme.cote', defaut: 12 }],
    construire: (centre, p) => carre(centre, p.cote)
  },
  {
    id: 'cercle',
    cle: 'forme.cercle',
    parametres: [{ nom: 'rayon', cle: 'forme.rayon', defaut: 8 }],
    construire: (centre, p) => cercle(centre, p.rayon)
  },
  {
    id: 'demiCercle',
    cle: 'forme.demiCercle',
    parametres: [{ nom: 'rayon', cle: 'forme.rayon', defaut: 10 }],
    construire: (centre, p) => demiCercle(centre, p.rayon)
  },
  {
    id: 'eventail',
    cle: 'forme.eventail',
    parametres: [
      { nom: 'largeurScene', cle: 'forme.largeurScene', defaut: 10 },
      { nom: 'largeurFond', cle: 'forme.largeurFond', defaut: 18 },
      { nom: 'profondeur', cle: 'forme.profondeur', defaut: 20 }
    ],
    construire: (centre, p) => eventail(centre, p.largeurScene, p.largeurFond, p.profondeur)
  },
  {
    id: 'ferACheval',
    cle: 'forme.ferACheval',
    parametres: [
      { nom: 'largeur', cle: 'forme.largeur', defaut: 14 },
      { nom: 'profondeur', cle: 'forme.profondeur', defaut: 20 }
    ],
    construire: (centre, p) => ferACheval(centre, p.largeur, p.profondeur)
  }
]
