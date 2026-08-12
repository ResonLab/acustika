/**
 * La salle : absorption, réverbération, champ diffus, distance critique.
 *
 * **C'est ce qui manquait le plus pour se rapprocher d'EASE.** Jusqu'ici
 * Acustika calculait un champ direct et rien d'autre : la même carte sortait
 * pour une église et pour un studio traité, alors que ce sont deux salles
 * opposées. Une enceinte parfaitement placée dans un modèle sans réverbération
 * peut être inutilisable dans la vraie salle, et rien ne le montrait.
 *
 * **Ce que ce module fait, et il faut être précis là-dessus** : il traite la
 * salle en **champ diffus statistique** — Sabine, Eyring, constante de salle.
 * Il suppose l'énergie réverbérée uniformément répartie, ce qui est faux près
 * des parois, faux dans une salle très absorbante d'un seul côté, et faux dans
 * un volume long et étroit. C'est le modèle qu'utilisent les abaques depuis
 * cent ans, et il est très utile ; ce n'est pas du lancer de rayons.
 *
 * **Ce qu'il ne fait pas** : les réflexions individuelles, les échos francs,
 * les modes propres du grave, la diffusion. Un écho de fond de salle ne se
 * verra pas ici. C'est écrit dans les conditions d'utilisation, et ça doit le
 * rester.
 *
 * Aucune dépendance : ni interface, ni base, ni Electron. Il tourne dans
 * l'application, dans les tests, et dans un navigateur.
 */

/** Les bandes d'octave traitées, en hertz. */
export const BANDES = [125, 250, 500, 1000, 2000, 4000, 8000]

/**
 * Coefficients d'absorption par matériau et par bande d'octave.
 *
 * **Ce sont des valeurs de tables publiées, pas des mesures.** Un même matériau
 * varie facilement de 30 % d'une source à l'autre selon la pose, l'épaisseur et
 * le support — un panneau de 50 mm posé au mur n'absorbe pas comme le même
 * panneau décollé de 100 mm. Elles servent à comparer des salles et à
 * dimensionner, jamais à certifier.
 *
 * `parUnite` dit ce que la valeur mesure : `surface` pour un coefficient sans
 * dimension appliqué à des mètres carrés, `objet` pour une absorption en mètres
 * carrés sabine par personne ou par siège — un spectateur n'a pas de surface au
 * sol, il a une absorption propre.
 */
export const MATERIAUX = [
  {
    id: 'betonBrut',
    cle: 'materiau.betonBrut',
    parUnite: 'surface',
    alpha: { 125: 0.01, 250: 0.01, 500: 0.02, 1000: 0.02, 2000: 0.02, 4000: 0.03, 8000: 0.03 }
  },
  {
    id: 'platre',
    cle: 'materiau.platre',
    parUnite: 'surface',
    alpha: { 125: 0.02, 250: 0.02, 500: 0.03, 1000: 0.04, 2000: 0.05, 4000: 0.05, 8000: 0.05 }
  },
  {
    id: 'cloisonPlatre',
    cle: 'materiau.cloisonPlatre',
    parUnite: 'surface',
    alpha: { 125: 0.29, 250: 0.1, 500: 0.05, 1000: 0.04, 2000: 0.07, 4000: 0.09, 8000: 0.09 }
  },
  {
    id: 'vitrage',
    cle: 'materiau.vitrage',
    parUnite: 'surface',
    alpha: { 125: 0.35, 250: 0.25, 500: 0.18, 1000: 0.12, 2000: 0.07, 4000: 0.04, 8000: 0.04 }
  },
  {
    id: 'parquet',
    cle: 'materiau.parquet',
    parUnite: 'surface',
    alpha: { 125: 0.15, 250: 0.11, 500: 0.1, 1000: 0.07, 2000: 0.06, 4000: 0.07, 8000: 0.07 }
  },
  {
    id: 'moquette',
    cle: 'materiau.moquette',
    parUnite: 'surface',
    alpha: { 125: 0.02, 250: 0.06, 500: 0.14, 1000: 0.37, 2000: 0.6, 4000: 0.65, 8000: 0.65 }
  },
  {
    id: 'rideauLourd',
    cle: 'materiau.rideauLourd',
    parUnite: 'surface',
    alpha: { 125: 0.14, 250: 0.35, 500: 0.55, 1000: 0.72, 2000: 0.7, 4000: 0.65, 8000: 0.65 }
  },
  {
    id: 'dallesMinerales',
    cle: 'materiau.dallesMinerales',
    parUnite: 'surface',
    alpha: { 125: 0.35, 250: 0.45, 500: 0.6, 1000: 0.7, 2000: 0.75, 4000: 0.75, 8000: 0.75 }
  },
  {
    id: 'laine50',
    cle: 'materiau.laine50',
    parUnite: 'surface',
    alpha: { 125: 0.15, 250: 0.45, 500: 0.8, 1000: 0.95, 2000: 0.98, 4000: 0.98, 8000: 0.98 }
  },
  {
    id: 'laine100',
    cle: 'materiau.laine100',
    parUnite: 'surface',
    alpha: { 125: 0.4, 250: 0.85, 500: 1.0, 1000: 1.0, 2000: 1.0, 4000: 1.0, 8000: 1.0 }
  },
  {
    id: 'siegeVide',
    cle: 'materiau.siegeVide',
    parUnite: 'objet',
    alpha: { 125: 0.15, 250: 0.2, 500: 0.25, 1000: 0.3, 2000: 0.35, 4000: 0.35, 8000: 0.35 }
  },
  {
    id: 'publicAssis',
    cle: 'materiau.publicAssis',
    parUnite: 'objet',
    alpha: { 125: 0.25, 250: 0.35, 500: 0.42, 1000: 0.46, 2000: 0.5, 4000: 0.5, 8000: 0.5 }
  }
]

const PAR_ID = new Map(MATERIAUX.map((m) => [m.id, m]))

/**
 * Absorption d'un matériau dans une bande.
 *
 * Une bande inconnue rend la valeur de la bande la plus proche plutôt que zéro :
 * zéro voudrait dire « parfaitement réfléchissant », ce qui est une affirmation
 * forte, et fausse.
 */
export function coefficient(materiauId, bande) {
  const materiau = PAR_ID.get(materiauId)
  if (!materiau) throw new Error(JSON.stringify({ cle: 'salle.materiauInconnu', id: materiauId }))
  if (materiau.alpha[bande] !== undefined) return materiau.alpha[bande]

  const disponibles = Object.keys(materiau.alpha).map(Number)
  const proche = disponibles.reduce((a, b) => (Math.abs(b - bande) < Math.abs(a - bande) ? b : a))
  return materiau.alpha[proche]
}

/**
 * Aire d'absorption équivalente, en mètres carrés sabine.
 *
 * C'est la somme des surfaces multipliées par leur coefficient, plus
 * l'absorption des objets comptés à l'unité. **C'est la seule grandeur qui
 * compte** : deux salles de même volume et de même aire d'absorption
 * réverbèrent pareil, quelle que soit la façon dont l'absorption est répartie.
 * C'est aussi la limite du modèle — la répartition, elle, compte pour de vrai.
 *
 * `surfaces` : `{ materiauId, aire }` en m², ou `{ materiauId, nombre }` pour
 * les matériaux comptés à l'objet.
 */
export function aireAbsorption(surfaces, bande) {
  let total = 0
  for (const surface of surfaces) {
    const materiau = PAR_ID.get(surface.materiauId)
    if (!materiau) {
      throw new Error(JSON.stringify({ cle: 'salle.materiauInconnu', id: surface.materiauId }))
    }
    const quantite = materiau.parUnite === 'objet' ? (surface.nombre ?? 0) : (surface.aire ?? 0)
    if (quantite < 0) throw new Error('salle.quantiteNegative')
    total += quantite * coefficient(surface.materiauId, bande)
  }
  return total
}

/** Surface totale des parois, en m² — les objets comptés à l'unité en sont exclus. */
export function surfaceTotale(surfaces) {
  let total = 0
  for (const surface of surfaces) {
    const materiau = PAR_ID.get(surface.materiauId)
    if (materiau && materiau.parUnite === 'surface') total += surface.aire ?? 0
  }
  return total
}

/**
 * Temps de réverbération de Sabine, en secondes.
 *
 * RT60 = 0,161 · V / A. La formule la plus connue de l'acoustique, et celle qui
 * se vérifie de tête. **Elle surestime dès que la salle est absorbante** : à
 * absorption totale (A = S), elle donne encore un temps non nul, ce qui est
 * absurde. C'est pour cela qu'Eyring existe.
 */
export function rt60Sabine(volume, aireAbsorptionM2) {
  if (!(volume > 0)) throw new Error('salle.volumePositif')
  // Division protégée : une salle sans aucune absorption n'existe pas, mais
  // une saisie vide, si. Rendre l'infini plutôt qu'un NaN silencieux.
  if (!(aireAbsorptionM2 > 0)) return Infinity
  return (0.161 * volume) / aireAbsorptionM2
}

/**
 * Temps de réverbération d'Eyring, en secondes.
 *
 * RT60 = 0,161 · V / (−S · ln(1 − alpha)). Plus juste que Sabine dès que
 * l'absorption moyenne dépasse ~0,2, et **elle tend correctement vers zéro**
 * quand la salle devient anéchoïque, là où Sabine reste bloquée sur une valeur.
 *
 * Elle est toujours inférieure ou égale à Sabine : c'est vérifié dans les tests,
 * parce qu'une inversion des deux passerait inaperçue à l'œil.
 */
export function rt60Eyring(volume, surfaceParois, aireAbsorptionM2) {
  if (!(volume > 0)) throw new Error('salle.volumePositif')
  if (!(surfaceParois > 0)) throw new Error('salle.surfacePositive')
  if (!(aireAbsorptionM2 > 0)) return Infinity

  const alphaMoyen = Math.min(aireAbsorptionM2 / surfaceParois, 0.9999)
  // À alpha = 1 le logarithme diverge : la salle absorbe tout, il n'y a pas de
  // réverbération du tout. Le plafond à 0,9999 rend un temps très court plutôt
  // qu'une division par zéro.
  const denominateur = -surfaceParois * Math.log(1 - alphaMoyen)
  if (!(denominateur > 0)) return 0
  return (0.161 * volume) / denominateur
}

/**
 * Constante de salle R, en mètres carrés.
 *
 * R = S·alpha / (1 − alpha). C'est elle qui pilote le niveau du champ
 * réverbéré : plus R est grand, plus la salle est « morte ». Une salle
 * parfaitement absorbante a un R infini et **aucun** champ réverbéré, ce qui
 * est le comportement attendu en plein air.
 */
export function constanteSalle(surfaceParois, aireAbsorptionM2) {
  if (!(surfaceParois > 0)) throw new Error('salle.surfacePositive')
  if (!(aireAbsorptionM2 > 0)) return 0

  const alphaMoyen = aireAbsorptionM2 / surfaceParois
  if (alphaMoyen >= 1) return Infinity
  return (surfaceParois * alphaMoyen) / (1 - alphaMoyen)
}

/**
 * Facteur de directivité Q, à partir de l'ouverture à −6 dB.
 *
 * **Approximation par un cône** : Q = 2 / (1 − cos(theta/2)), où theta est
 * l'ouverture. Une enceinte réelle n'a pas un lobe conique — elle a une
 * ouverture horizontale et une verticale différentes, et des lobes secondaires
 * qui portent de l'énergie hors de l'axe. Ce Q est donc **optimiste** : la
 * vraie directivité est plus faible, donc le champ réverbéré un peu plus fort
 * que calculé ici.
 *
 * C'est assumé et affiché : Acustika ne connaît des enceintes que leur
 * ouverture par bande, et inventer une directivité complète à partir de ça
 * serait exactement le genre de faux aplomb que ce projet refuse.
 */
export function facteurDirectivite(ouvertureDegres) {
  if (!(ouvertureDegres > 0) || ouvertureDegres >= 360) {
    throw new Error('salle.ouvertureHorsLimites')
  }
  const demiAngle = (ouvertureDegres / 2) * (Math.PI / 180)
  const denominateur = 1 - Math.cos(demiAngle)
  if (!(denominateur > 0)) return Infinity
  return 2 / denominateur
}

/** Indice de directivité, en dB : DI = 10·log10(Q). */
export function indiceDirectivite(ouvertureDegres) {
  const q = facteurDirectivite(ouvertureDegres)
  return q === Infinity ? Infinity : 10 * Math.log10(q)
}

/**
 * Distance critique, en mètres.
 *
 * **C'est la grandeur la plus utile de tout ce module.** Au-delà d'elle, le
 * champ réverbéré domine le champ direct : monter le niveau ne fait plus qu'y
 * ajouter de la soupe, et l'intelligibilité cesse de s'améliorer. Un spectateur
 * assis à trois fois la distance critique n'entendra pas mieux parce qu'on a
 * poussé l'ampli — il faut rapprocher une source, pas monter le gain.
 *
 * rc = sqrt(Q·R / 16pi), soit environ 0,141·sqrt(Q·R).
 */
export function distanceCritique(q, r) {
  if (!(q > 0)) throw new Error('salle.directivitePositive')
  if (!(r > 0)) return 0
  if (r === Infinity || q === Infinity) return Infinity
  return Math.sqrt((q * r) / (16 * Math.PI))
}

/**
 * Puissance acoustique équivalente, en dB, déduite du niveau à un mètre.
 *
 * Acustika décrit ses enceintes par leur niveau à un mètre dans l'axe, comme
 * les fiches techniques. Le champ réverbéré, lui, dépend de la puissance
 * **totale** rayonnée : une enceinte très directive à 100 dB à un mètre envoie
 * beaucoup moins d'énergie dans la salle qu'une enceinte omnidirectionnelle au
 * même niveau. Sans cette conversion, une enceinte serrée paraîtrait aussi
 * gênante qu'une large, ce qui est exactement le contraire de la vérité.
 *
 * Lw = L1m + 10·log10(4pi) − DI.
 */
export function puissanceDepuisNiveau1m(niveau1m, ouvertureDegres) {
  const di = indiceDirectivite(ouvertureDegres)
  if (di === Infinity) throw new Error('salle.ouvertureHorsLimites')
  return niveau1m + 10 * Math.log10(4 * Math.PI) - di
}

/**
 * Niveau du champ réverbéré, en dB — uniforme dans toute la salle.
 *
 * Lrev = Lw + 10·log10(4 / R). Il ne dépend pas de la distance : c'est la
 * définition même du champ diffus, et c'est ce qui rend la distance critique
 * lisible sur une carte — au-delà, la couleur cesse de changer.
 */
export function niveauReverbere(niveau1m, ouvertureDegres, r) {
  if (!(r > 0)) return -Infinity
  if (r === Infinity) return -Infinity
  const lw = puissanceDepuisNiveau1m(niveau1m, ouvertureDegres)
  return lw + 10 * Math.log10(4 / r)
}

/**
 * Décrit une salle à partir de son contour, de sa hauteur et de ses matériaux.
 *
 * Le sol et le plafond prennent l'aire du contour, les murs son périmètre
 * multiplié par la hauteur. C'est exact pour un volume droit — ce que sont la
 * plupart des salles — et faux pour une voûte ou un plafond incliné, auquel cas
 * il faut saisir les surfaces à la main.
 */
export function surfacesDepuisContour(aireAuSol, perimetre, hauteur, materiaux) {
  if (!(aireAuSol > 0)) throw new Error('salle.airePositive')
  if (!(hauteur > 0)) throw new Error('salle.hauteurPositive')
  if (!(perimetre > 0)) throw new Error('salle.perimetrePositif')

  return [
    { materiauId: materiaux.sol, aire: aireAuSol },
    { materiauId: materiaux.plafond, aire: aireAuSol },
    { materiauId: materiaux.murs, aire: perimetre * hauteur }
  ]
}

/**
 * Tout ce qu'on veut savoir d'une salle dans une bande, d'un seul appel.
 *
 * Rend un objet plutôt que plusieurs valeurs éparses : ces grandeurs se lisent
 * ensemble — un RT60 sans la distance critique ne dit pas où poser une
 * enceinte, et une distance critique sans RT60 ne dit pas pourquoi.
 */
export function analyserSalle(volume, surfaces, bande, ouvertureDegres) {
  const a = aireAbsorption(surfaces, bande)
  const s = surfaceTotale(surfaces)
  const r = constanteSalle(s, a)
  const q = facteurDirectivite(ouvertureDegres)

  return {
    bande,
    aireAbsorption: a,
    surfaceParois: s,
    alphaMoyen: s > 0 ? a / s : 0,
    constanteSalle: r,
    rt60Sabine: rt60Sabine(volume, a),
    rt60Eyring: rt60Eyring(volume, s, a),
    facteurDirectivite: q,
    indiceDirectivite: indiceDirectivite(ouvertureDegres),
    distanceCritique: distanceCritique(q, r)
  }
}

/* ── L'intelligibilité ──────────────────────────────────────────────────── */

/**
 * Perte d'articulation des consonnes, en pourcent — formule de Peutz.
 *
 * **C'est le pas le plus proche d'EASE que ce modèle permette**, et il faut
 * être précis sur ce que ça vaut. EASE calcule un STI à partir de réponses
 * impulsionnelles complètes, obtenues par lancer de rayons. Peutz, lui, donne
 * une estimation en forme fermée à partir de trois choses qu'on a déjà : le
 * temps de réverbération, le volume et la directivité. C'est le calcul qu'un
 * acousticien fait au dos d'une enveloppe, et il est utile depuis 1971.
 *
 * %ALcons = 200 · d² · RT60² / (V · Q)
 *
 * **Au-delà de 3,16 fois la distance critique, la formule sature** à 9 · RT60 :
 * le champ réverbéré domine tellement qu'éloigner l'auditeur n'y change plus
 * rien. Sans ce plafond, la formule donnerait des valeurs absurdes au fond
 * d'une grande salle — un défaut connu qu'il faut traiter, pas ignorer.
 *
 * Plus le nombre est petit, mieux on comprend : 2 % est excellent, 15 % est la
 * limite du tolérable pour de la parole.
 */
export function pourcentAlcons(distance, rt60, volume, q, distanceCritiqueM) {
  if (!(distance >= 0)) throw new Error('salle.distancePositive')
  if (!(volume > 0)) throw new Error('salle.volumePositif')
  if (!(q > 0)) throw new Error('salle.directivitePositive')
  // Une salle sans réverbération ne dégrade rien : l'articulation est parfaite.
  if (!(rt60 > 0)) return 0

  const sature = 9 * rt60
  if (distanceCritiqueM > 0 && distance > 3.16 * distanceCritiqueM) return sature

  const valeur = (200 * distance * distance * rt60 * rt60) / (volume * q)
  // Le plafond vaut aussi en deçà : la formule peut le dépasser dans une salle
  // petite et très réverbérante, où elle cesse d'avoir un sens.
  return Math.min(valeur, sature)
}

/**
 * Indice de transmission de la parole, déduit de %ALcons.
 *
 * STI = 0,9482 − 0,1845 · ln(%ALcons). C'est la conversion publiée qui relie
 * les deux échelles ; elle redonne bien les correspondances de table — 2 % vaut
 * 0,82, 10 % vaut 0,52, 15 % vaut 0,45.
 *
 * **Ce STI est une estimation issue d'un modèle statistique**, pas une mesure
 * ni un calcul par réponse impulsionnelle. Il ignore les réflexions
 * individuelles, donc il ne voit pas un écho de fond de salle — qui peut
 * détruire l'intelligibilité sans changer ni le RT60 ni la distance critique.
 * L'écran doit le dire, et il le dit.
 */
export function stiDepuisAlcons(alcons) {
  if (!(alcons >= 0)) throw new Error('salle.alconsPositif')
  // Une articulation parfaite : la formule diverge en zéro, l'échelle plafonne
  // de toute façon à 1.
  if (alcons <= 0) return 1
  return Math.min(1, Math.max(0, 0.9482 - 0.1845 * Math.log(alcons)))
}

/**
 * Le jugement qui accompagne un STI, sous forme de clé.
 *
 * Les seuils sont ceux de la norme CEI 60268-16. Ce module ne sait pas quelle
 * langue la fenêtre affiche : il rend une clé, pas une phrase.
 */
export function jugementSti(sti) {
  if (sti >= 0.75) return 'sti.excellent'
  if (sti >= 0.6) return 'sti.bon'
  if (sti >= 0.45) return 'sti.acceptable'
  if (sti >= 0.3) return 'sti.mediocre'
  return 'sti.mauvais'
}
