import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  appliquerReglage,
  conseillerPlacement,
  couvertureSalle,
  MARGE_LOCALISATION_MS,
  profilCoupe,
  retardsDAlignement,
  type Conseil,
  type Effet,
  type RetardCalcule
} from '../../../../commun/acoustique.js'
import { aire, FORMES, perimetre } from '../../../../commun/formes.js'
import {
  analyserSalle,
  jugementSti,
  MATERIAUX,
  niveauReverbere,
  pourcentAlcons,
  stiDepuisAlcons,
  surfacesDepuisContour
} from '../../../../commun/salle.js'
import { t, traduireErreur } from '../../../partage/i18n'
import type {
  EnceintePlacee,
  ModeleEnceinte,
  Point2D,
  Projet,
  ZoneEcoute
} from '../../../partage/types'

/**
 * Le plan : on dessine les zones, on y pose les enceintes, on les oriente, et
 * la couverture se recalcule.
 *
 * C'est l'écran qui rapproche le plus Acustika d'un logiciel comme EASE : une
 * vue du dessus qu'on manipule directement, plutôt qu'un formulaire de
 * coordonnées. Un placement se juge à l'œil et se corrige au doigt.
 *
 * **Le calcul n'est pas ici.** Il vient de `commun/acoustique.js`, vérifié
 * contre des valeurs connues à la main. Cet écran ne fait que dessiner et
 * déplacer des points : une carte de couleurs est très convaincante même
 * lorsqu'elle est fausse.
 */

type Outil = 'main' | 'zone' | 'forme' | 'enceinte'

const COULEURS = [
  [26, 20, 48],
  [80, 52, 168],
  [140, 96, 220],
  [230, 160, 170],
  [255, 201, 97]
]

/** Amplitude de l'échelle de couleurs, en dB sous le maximum. */
const PLAGE_DB = 24

/** Largeur maximale de la toile en pixels propres, indépendante de sa taille affichée. */
const LARGEUR_TOILE = 900

/**
 * Hauteur maximale de la toile.
 *
 * **Elle n'existait pas, et la toile suivait aveuglément la proportion de la
 * salle** : une salle de 12 × 18 m donnait 1350 pixels de haut, affichés 1564,
 * dans une fenêtre de 827. La page faisait deux écrans et demi, et **on ne
 * pouvait jamais voir le plan et ses chiffres en même temps** — or c'est
 * exactement le geste du métier : bouger une enceinte et regarder l'écart.
 *
 * Borner la hauteur ne coûte plus rien **depuis qu'on peut agrandir et
 * déplacer la vue** : ce qu'on perd en taille d'ensemble se retrouve au
 * Ctrl+molette. Sans le déplacement de vue, ce plafond aurait rendu une salle
 * profonde illisible ; avec lui, il la rend simplement maniable.
 */
const HAUTEUR_TOILE_MAX = 620

/** Le cadrage d'origine : la salle remplit la toile, sans décalage. */
const VUE_AJUSTEE = { zoom: 1, x: 0, y: 0 }

/** En deçà on ne distingue plus rien ; au-delà on compte les pixels. */
const ZOOM_MIN = 0.25
const ZOOM_MAX = 16

/** Un cran de molette. Multiplicatif : agrandir puis réduire doit revenir au même. */
const PAS_DE_ZOOM = 1.15

/**
 * En deçà de cet écart en pixels, la grille métrique n'est plus dessinée.
 *
 * Un quadrillage plus serré que quelques pixels ne se lit pas : il remplit la
 * carte d'un gris uniforme qui masque la couverture au lieu de la situer.
 */
const GRILLE_LISIBLE_PX = 6

/**
 * Le pas de la grille de calcul, en mètres.
 *
 * **Il était écrit deux fois** : une fois passé à `couvertureSalle()`, une fois
 * recopié dans la taille des carrés dessinés. Les deux doivent être égaux pour
 * que la carte pave sans trou ni recouvrement — c'est « une formule = un seul
 * endroit » appliquée à une constante, et le jour où l'un des deux aurait
 * changé, la carte serait devenue une grille de points sans que rien ne le
 * signale.
 */
const PAS_CARTE = 0.4

function couleurNiveau(fraction: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, fraction)) * (COULEURS.length - 1)
  const i = Math.min(COULEURS.length - 2, Math.floor(t))
  const reste = t - i
  const [r1, v1, b1] = COULEURS[i]
  const [r2, v2, b2] = COULEURS[i + 1]
  return [
    Math.round(r1 + (r2 - r1) * reste),
    Math.round(v1 + (v2 - v1) * reste),
    Math.round(b1 + (b2 - b1) * reste)
  ]
}

function identifiant(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Met un effet en phrase, dans la langue de l'interface.
 *
 * Le sens de la variation change le verbe — monter ou descendre, écarter ou
 * resserrer. Dire « changer la hauteur de 1,5 m à 4 m » serait exact et
 * inutile : ce qu'on veut lire, c'est le geste à faire.
 */
function decrireEffet(effet: Effet): string {
  const depuis = effet.depuis.toFixed(1)
  const vers = effet.vers.toFixed(1)
  const monte = effet.vers > effet.depuis

  if (effet.reglage === 'hauteur') {
    return t(monte ? 'conseil.effetHauteur' : 'conseil.effetHauteurBaisse', { depuis, vers })
  }
  if (effet.reglage === 'ecartement') {
    return t(monte ? 'conseil.effetEcartement' : 'conseil.effetEcartementResserre', {
      depuis,
      vers
    })
  }
  return t(monte ? 'conseil.effetVisee' : 'conseil.effetViseeProche', { depuis, vers })
}

export default function Plan({
  projet,
  modifierProjet,
  enceintesDisponibles
}: {
  projet: Projet
  modifierProjet: (projet: Projet) => void
  enceintesDisponibles: ModeleEnceinte[]
}): React.JSX.Element {
  const toile = useRef<HTMLCanvasElement>(null)
  const [outil, setOutil] = useState<Outil>('main')
  const [contourEnCours, setContourEnCours] = useState<Point2D[]>([])
  const [modeleChoisi, setModeleChoisi] = useState<string>('')
  const [selection, setSelection] = useState<string | null>(null)
  // Ce qu'on est en train de faire glisser : une enceinte ou sa visée.
  const [glisse, setGlisse] = useState<{ id: string; quoi: 'position' | 'visee' } | null>(null)
  const [erreur, setErreur] = useState('')

  /**
   * Ce qu'on regarde du plan : un agrandissement, et le point du monde qui
   * tombe dans le coin haut-gauche de la toile.
   *
   * **Le décalage est en mètres, jamais en pixels.** En pixels il faudrait le
   * recorriger à chaque changement de taille de fenêtre ou de dimensions de
   * salle, et on l'oublierait quelque part. En mètres il désigne un endroit de
   * la salle, ce qui garde son sens quoi qu'il arrive à la toile — c'est le
   * même raisonnement que les positions en fractions du plan de Scenika.
   *
   * `zoom` à 1 et décalage nul redonnent exactement le cadrage d'avant : la
   * salle remplit la toile. **La vue ne fait pas partie du projet** et n'est
   * pas enregistrée dans le fichier : où l'on regardait en travaillant ne
   * décrit pas la salle, et deux personnes qui s'échangent un projet n'ont
   * aucune raison de partager un cadrage.
   */
  const [vue, setVue] = useState(VUE_AJUSTEE)
  /**
   * Le dernier point de l'écran pendant un déplacement de vue.
   *
   * Une référence et non un état : il change à chaque mouvement de souris et
   * ne se dessine pas. En état, il redéclencherait un rendu par mouvement en
   * plus de celui que la vue provoque déjà.
   */
  const glisseVue = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!modeleChoisi && enceintesDisponibles.length > 0) setModeleChoisi(enceintesDisponibles[0].id)
  }, [enceintesDisponibles, modeleChoisi])

  const modeleParId = useMemo(
    () => new Map(enceintesDisponibles.map((m) => [m.id, m])),
    [enceintesDisponibles]
  )

  /** Les enceintes du projet, traduites pour le module de calcul. */
  const enceintesCalcul = useMemo(
    () =>
      projet.enceintes
        .filter((e) => e.active && modeleParId.has(e.modeleId))
        .map((e) => {
          const modele = modeleParId.get(e.modeleId)!
          return {
            nom: modele.nom,
            position: { x: e.position.x, y: e.position.y, z: e.hauteur },
            visee: { x: e.visee.x, y: e.visee.y, z: e.hauteurVisee },
            niveau1m: modele.niveau1m + e.gainDb,
            ouverture: modele.ouverture,
            retardMs: e.retardMs
          }
        }),
    [projet.enceintes, modeleParId]
  )

  /* ── La salle ─────────────────────────────────────────────────────────── */

  const salle = projet.salle

  function modifierSalle(champs: Partial<NonNullable<Projet['salle']>>): void {
    if (!salle) return
    modifierProjet({ ...projet, salle: { ...salle, ...champs } })
  }

  /**
   * L'analyse de la salle dans la bande affichée.
   *
   * Les surfaces sont déduites du contour **des zones réunies** : c'est
   * l'emprise réelle du volume, alors que `projet.largeur × profondeur` n'est
   * qu'un cadrage d'affichage. Une salle décrite par ses zones donne donc les
   * bons murs sans qu'on ait rien à ressaisir.
   *
   * L'ouverture retenue est celle de la première enceinte active : le facteur
   * de directivité sert à situer la distance critique, et la donner par
   * enceinte multiplierait les chiffres sans rien apporter — on veut savoir si
   * la salle est un problème, pas comparer six rayons.
   */
  const analyse = useMemo(() => {
    if (!salle?.active || projet.zones.length === 0) return null

    const aireAuSol = projet.zones.reduce((total, zone) => total + aire(zone.contour), 0)
    const perimetreTotal = projet.zones.reduce((total, zone) => total + perimetre(zone.contour), 0)
    if (!(aireAuSol > 0) || !(perimetreTotal > 0)) return null

    const premiere = enceintesCalcul[0]
    const ouverture = premiere?.ouverture?.[projet.bande] ?? 90

    try {
      const surfaces = [
        ...surfacesDepuisContour(aireAuSol, perimetreTotal, salle.hauteur, {
          sol: salle.sol,
          plafond: salle.plafond,
          murs: salle.murs
        }),
        { materiauId: 'publicAssis', nombre: salle.spectateurs }
      ]
      const volume = aireAuSol * salle.hauteur
      const resultat = analyserSalle(volume, surfaces, projet.bande, ouverture)

      /**
       * Le champ réverbéré total, somme énergétique de toutes les enceintes.
       *
       * **Chaque enceinte excite la salle selon sa propre directivité**, pas
       * selon celle de la première : une 40° et une 120° au même niveau à un
       * mètre n'y versent pas la même énergie. Prendre une seule ouverture pour
       * tout le monde sous-estimerait la soupe d'un système mixte — exactement
       * le cas où l'on a besoin du chiffre.
       */
      const energie = enceintesCalcul.reduce((total, e) => {
        const ouvertureE = e.ouverture?.[projet.bande]
        if (ouvertureE === undefined) return total
        const niveau = niveauReverbere(e.niveau1m, ouvertureE, resultat.constanteSalle)
        return Number.isFinite(niveau) ? total + 10 ** (niveau / 10) : total
      }, 0)
      const reverbere = energie > 0 ? 10 * Math.log10(energie) : -Infinity

      return { ...resultat, volume, ouverture, reverbere }
    } catch {
      // Une salle mal décrite ne doit pas casser l'écran : la carte reste en
      // champ direct, et le panneau affichera que la salle n'est pas prise en
      // compte. Un plantage ici masquerait tout le reste du travail.
      return null
    }
  }, [salle, projet.zones, projet.bande, enceintesCalcul])

  const couverture = useMemo(() => {
    if (projet.zones.length === 0 || enceintesCalcul.length === 0) return null
    try {
      const zones = projet.zones.map((z) => ({
        nom: z.nom,
        contour: z.contour,
        hauteurOreilles: z.hauteurOreilles,
        altitude: z.altitude,
        pentePourcent: z.pentePourcent,
        directionPenteDegres: z.directionPenteDegres
      }))
      return couvertureSalle(zones, enceintesCalcul, projet.bande, PAS_CARTE, analyse?.reverbere)
    } catch (e) {
      setErreur(traduireErreur((e as Error).message))
      return null
    }
    // `analyse` est une dépendance à part entière : sans elle, changer un
    // matériau ou cocher « tenir compte de la salle » ne redessinerait rien.
    // Le code serait juste et l'écran figé — la pire des deux.
  }, [projet.zones, projet.bande, enceintesCalcul, analyse])

  /**
   * La part du public assise au-delà de la distance critique.
   *
   * **C'est la mesure honnête d'une salle, et elle remplace l'écart** dès que la
   * réverbération entre en jeu. Le champ réverbéré étant uniforme, il aplatit
   * l'écart de niveau : une salle à 3,5 s de RT60 affiche un écart d'un
   * décibel, ce qui ressemble à une couverture parfaite et n'en est pas une.
   *
   * Ce qui compte alors n'est plus « le niveau est-il régulier » mais « qui
   * entend encore la source plutôt que la salle ». Au-delà de la distance
   * critique, monter le gain n'améliore plus rien : il faut rapprocher une
   * source, ou traiter la salle.
   */
  const partHorsCritique = useMemo(() => {
    if (!analyse || !couverture || enceintesCalcul.length === 0) return null
    const rc = analyse.distanceCritique
    if (!Number.isFinite(rc) || rc <= 0) return null

    let total = 0
    let dehors = 0
    for (const zone of couverture.zones) {
      for (const point of zone.points) {
        total += 1
        // La distance à l'enceinte **la plus proche** : c'est elle qui fournit
        // le champ direct dominant en ce point.
        const plusProche = Math.min(
          ...enceintesCalcul.map((e) =>
            Math.hypot(e.position.x - point.x, e.position.y - point.y, e.position.z - point.z)
          )
        )
        if (plusProche > rc) dehors += 1
      }
    }
    return total > 0 ? dehors / total : null
  }, [analyse, couverture, enceintesCalcul])

  /**
   * L'intelligibilité de la parole, estimée par la formule de Peutz.
   *
   * **C'est ce qui rapproche le plus Acustika d'EASE**, et il faut être précis
   * sur ce que ça vaut. EASE calcule un STI à partir de réponses
   * impulsionnelles obtenues par lancer de rayons. Peutz donne une estimation
   * en forme fermée à partir de trois choses qu'on a déjà — RT60, volume,
   * directivité. C'est le calcul du dos d'enveloppe, et il est utile.
   *
   * Ce qu'on affiche, c'est **le pire point** et la part du public sous 0,50 :
   * une moyenne de STI ne veut rien dire, parce que personne n'est assis à la
   * moyenne. Ce qui compte est de savoir si quelqu'un ne comprendra pas.
   */
  const intelligibilite = useMemo(() => {
    if (!analyse || !couverture || enceintesCalcul.length === 0) return null
    const rt60 = analyse.rt60Eyring
    if (!Number.isFinite(rt60) || rt60 <= 0) return null

    let pire = 1
    let total = 0
    let sousSeuil = 0
    for (const zone of couverture.zones) {
      for (const point of zone.points) {
        const plusProche = Math.min(
          ...enceintesCalcul.map((e) =>
            Math.hypot(e.position.x - point.x, e.position.y - point.y, e.position.z - point.z)
          )
        )
        try {
          const sti = stiDepuisAlcons(
            pourcentAlcons(
              plusProche,
              rt60,
              analyse.volume,
              analyse.facteurDirectivite,
              analyse.distanceCritique
            )
          )
          total += 1
          if (sti < pire) pire = sti
          if (sti < 0.5) sousSeuil += 1
        } catch {
          // Un point impossible à évaluer ne doit pas emporter tout l'écran.
        }
      }
    }
    if (total === 0) return null
    return { pire, partSousSeuil: sousSeuil / total }
  }, [analyse, couverture, enceintesCalcul])

  /**
   * Échelle d'ajustement : combien de pixels pour un mètre quand la salle
   * remplit exactement la toile. C'est ce qui existait seul jusqu'ici.
   */
  const echelleAjustee = useCallback(() => {
    const largeurPixels = toile.current?.width ?? 800
    const hauteurPixels = toile.current?.height ?? 600
    return Math.min(largeurPixels / projet.largeur, hauteurPixels / projet.profondeur)
  }, [projet.largeur, projet.profondeur])

  /** Échelle réellement dessinée, agrandissement compris. */
  const echelle = useCallback(
    () => echelleAjustee() * vue.zoom,
    [echelleAjustee, vue.zoom]
  )

  /**
   * Mètres → pixels, et l'inverse.
   *
   * **Ces deux fonctions sont le seul passage entre le monde et l'écran, et
   * elles doivent le rester.** Le niveau affiché sous le curseur est lu dans la
   * grille par le chemin retour : si l'aller et le retour cessaient d'être
   * exactement inverses, le chiffre annoncé désignerait un autre point que le
   * pixel survolé — et rien ne le montrerait tant qu'on ne déplace ni n'agrandit
   * la vue. C'est la règle « une formule = un seul endroit » appliquée à un
   * système de coordonnées.
   */
  const versEcran = useCallback(
    (point: Point2D) => {
      const e = echelle()
      return { x: (point.x - vue.x) * e, y: (point.y - vue.y) * e }
    },
    [echelle, vue.x, vue.y]
  )

  const versMetres = useCallback(
    (x: number, y: number): Point2D => {
      const e = echelle()
      // Arrondi au centimètre : à fort agrandissement on place au centimètre,
      // et c'est déjà plus fin que ce qu'on accroche sur un vrai pont.
      return {
        x: Number((vue.x + x / e).toFixed(2)),
        y: Number((vue.y + y / e).toFixed(2))
      }
    },
    [echelle, vue.x, vue.y]
  )

  /* ── Dessin ─────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = toile.current
    if (!canvas) return
    const pinceau = canvas.getContext('2d')
    if (!pinceau) return

    const e = echelle()
    pinceau.fillStyle = '#0b0912'
    pinceau.fillRect(0, 0, canvas.width, canvas.height)

    // Grille métrique : sans repère de distance, une carte ne veut rien dire.
    // **Elle passe par `versEcran` comme tout le reste** : multiplier par
    // l'échelle sans retirer le décalage la laisserait collée à la toile
    // pendant que la salle glisse dessous.
    // **Elle couvre la toile, pas la salle**, et c'est un correctif du
    // 16 août 2026, signalé par l'utilisateur. Elle allait de 0 à
    // `projet.largeur` : tant que la salle remplissait la toile, personne ne
    // pouvait le voir. Depuis qu'on dézoome, la salle occupe un coin et la
    // grille s'arrêtait à son bord, laissant le reste nu — comme si le plan
    // n'existait plus au-delà. *Le zoom n'a pas créé le défaut, il l'a rendu
    // visible ; c'est le contour de la salle qui dit où elle s'arrête, pas la
    // grille.*
    if (e >= GRILLE_LISIBLE_PX) {
      pinceau.strokeStyle = 'rgba(255,255,255,0.06)'
      pinceau.lineWidth = 1

      // Les bornes visibles, en mètres, déduites des coins de la toile par le
      // chemin retour. On les prend dans les deux sens : rien ne garantit que
      // le coin haut-gauche de l'écran soit le minimum en mètres.
      const coins = [versMetres(0, 0), versMetres(canvas.width, canvas.height)]
      const xMin = Math.floor(Math.min(coins[0].x, coins[1].x))
      const xMax = Math.ceil(Math.max(coins[0].x, coins[1].x))
      const yMin = Math.floor(Math.min(coins[0].y, coins[1].y))
      const yMax = Math.ceil(Math.max(coins[0].y, coins[1].y))

      for (let m = xMin; m <= xMax; m += 1) {
        const haut = versEcran({ x: m, y: yMin })
        const bas = versEcran({ x: m, y: yMax })
        pinceau.beginPath()
        pinceau.moveTo(haut.x, haut.y)
        pinceau.lineTo(bas.x, bas.y)
        pinceau.stroke()
      }
      for (let m = yMin; m <= yMax; m += 1) {
        const gauche = versEcran({ x: xMin, y: m })
        const droite = versEcran({ x: xMax, y: m })
        pinceau.beginPath()
        pinceau.moveTo(gauche.x, gauche.y)
        pinceau.lineTo(droite.x, droite.y)
        pinceau.stroke()
      }
    }

    // La couverture, point par point, dans chaque zone.
    if (couverture) {
      const maximum = couverture.maximum
      const cote = Math.max(2, PAS_CARTE * e)
      for (const zone of couverture.zones) {
        for (const point of zone.points) {
          const [r, v, b] = couleurNiveau((point.niveau - (maximum - PLAGE_DB)) / PLAGE_DB)
          pinceau.fillStyle = `rgb(${r},${v},${b})`
          const p = versEcran(point)
          // **Les bords sont rabattus sur la grille de pixels.** Des carrés
          // jointifs posés à des coordonnées fractionnaires sont adoucis sur
          // leurs quatre côtés, et les demi-pixels laissés entre eux dessinent
          // un quadrillage sombre par-dessus la carte. Le lecteur le prend pour
          // une donnée alors qu'il vient du rendu — et une carte de couleurs
          // est déjà bien assez convaincante sans motif inventé.
          const gauche = Math.floor(p.x - cote / 2)
          const haut = Math.floor(p.y - cote / 2)
          pinceau.fillRect(
            gauche,
            haut,
            Math.ceil(p.x + cote / 2) - gauche,
            Math.ceil(p.y + cote / 2) - haut
          )
        }
      }
    }

    // Les contours de zones, par-dessus.
    pinceau.lineWidth = 2
    for (const zone of projet.zones) {
      if (zone.contour.length < 2) continue
      pinceau.strokeStyle = 'rgba(181,140,255,0.9)'
      pinceau.beginPath()
      zone.contour.forEach((sommet, index) => {
        const p = versEcran(sommet)
        if (index === 0) pinceau.moveTo(p.x, p.y)
        else pinceau.lineTo(p.x, p.y)
      })
      pinceau.closePath()
      pinceau.stroke()

      const premier = versEcran(zone.contour[0])
      pinceau.fillStyle = 'rgba(255,255,255,0.75)'
      pinceau.font = '12px system-ui'
      pinceau.fillText(zone.nom, premier.x + 6, premier.y + 14)
    }

    // La zone en cours de dessin.
    if (contourEnCours.length > 0) {
      pinceau.strokeStyle = '#ffc961'
      pinceau.setLineDash([5, 4])
      pinceau.beginPath()
      contourEnCours.forEach((sommet, index) => {
        const p = versEcran(sommet)
        if (index === 0) pinceau.moveTo(p.x, p.y)
        else pinceau.lineTo(p.x, p.y)
      })
      pinceau.stroke()
      pinceau.setLineDash([])
      for (const sommet of contourEnCours) {
        const p = versEcran(sommet)
        pinceau.fillStyle = '#ffc961'
        pinceau.beginPath()
        pinceau.arc(p.x, p.y, 4, 0, Math.PI * 2)
        pinceau.fill()
      }
    }

    // Les enceintes, avec leur axe : sans l'axe, on ne sait pas ce qu'elles visent.
    for (const enceinte of projet.enceintes) {
      const position = versEcran(enceinte.position)
      const visee = versEcran(enceinte.visee)
      const choisie = enceinte.id === selection

      pinceau.strokeStyle = enceinte.active ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)'
      pinceau.setLineDash([4, 4])
      pinceau.beginPath()
      pinceau.moveTo(position.x, position.y)
      pinceau.lineTo(visee.x, visee.y)
      pinceau.stroke()
      pinceau.setLineDash([])

      pinceau.fillStyle = enceinte.active ? '#ffffff' : '#6b6480'
      pinceau.beginPath()
      pinceau.arc(position.x, position.y, choisie ? 9 : 7, 0, Math.PI * 2)
      pinceau.fill()
      if (choisie) {
        pinceau.strokeStyle = '#ffc961'
        pinceau.lineWidth = 2
        pinceau.stroke()
      }

      pinceau.fillStyle = 'rgba(255,255,255,0.6)'
      pinceau.beginPath()
      pinceau.arc(visee.x, visee.y, 4, 0, Math.PI * 2)
      pinceau.fill()
    }
  }, [projet, couverture, contourEnCours, selection, echelle, versEcran])

  /* ── La vue : agrandir et déplacer ──────────────────────────────────────── */

  /**
   * Agrandit ou réduit **autour d'un point de la toile**, qui ne bouge pas.
   *
   * Agrandir autour du coin ferait fuir ce qu'on regarde hors de l'écran : on
   * viserait un détail, on l'agrandirait, et il faudrait le rechercher. Le
   * point sous le curseur est donc tenu fixe — on écrit qu'il désigne le même
   * mètre avant et après, et on en déduit le décalage.
   */
  function agrandirAutour(facteur: number, pixelX: number, pixelY: number): void {
    setVue((precedente) => {
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, precedente.zoom * facteur))
      // Butée atteinte : ne rien déplacer, sinon la vue dérive alors que
      // l'agrandissement ne change plus.
      if (zoom === precedente.zoom) return precedente

      const base = echelleAjustee()
      const avant = base * precedente.zoom
      const apres = base * zoom
      if (!(avant > 0) || !(apres > 0)) return precedente

      // Le mètre visé par le curseur, qui doit rester sous le curseur.
      const mondeX = precedente.x + pixelX / avant
      const mondeY = precedente.y + pixelY / avant
      return { zoom, x: mondeX - pixelX / apres, y: mondeY - pixelY / apres }
    })
  }

  /** Déplace la vue d'un nombre de pixels d'écran. */
  function deplacerVue(pixelsX: number, pixelsY: number): void {
    setVue((precedente) => {
      const e = echelleAjustee() * precedente.zoom
      if (!(e > 0)) return precedente
      return { ...precedente, x: precedente.x + pixelsX / e, y: precedente.y + pixelsY / e }
    })
  }

  /**
   * La molette, posée **à la main et non passive**, et c'est tout l'enjeu.
   *
   * `Ctrl` + molette est aussi le raccourci d'agrandissement d'Electron : sans
   * `preventDefault()`, **toute l'interface grossit** — menus, panneaux et
   * texte compris — pendant que la carte, elle, ne bouge pas. React pose ses
   * écouteurs de molette en mode passif, où `preventDefault()` est ignoré sans
   * rien dire : `onWheel` ne peut donc pas faire ce travail, et le seul moyen
   * est `addEventListener` avec `{ passive: false }`.
   *
   * Vérifié en lançant l'application, pas en relisant : c'est exactement le
   * genre de défaut qu'aucune suite ne voit.
   */
  useEffect(() => {
    const canvas = toile.current
    if (!canvas) return

    function aLaMolette(evenement: WheelEvent): void {
      evenement.preventDefault()

      if (evenement.ctrlKey) {
        const pixels = pixelsDeLaToile(evenement.clientX, evenement.clientY)
        if (!pixels) return
        // Vers le haut (deltaY négatif) on se rapproche.
        agrandirAutour(evenement.deltaY < 0 ? PAS_DE_ZOOM : 1 / PAS_DE_ZOOM, pixels.x, pixels.y)
        return
      }

      // Sans Ctrl, la molette déplace : verticalement, ou horizontalement avec
      // Maj. On déplace la vue dans le sens inverse du geste, comme partout.
      if (evenement.shiftKey) deplacerVue(evenement.deltaY, 0)
      else deplacerVue(evenement.deltaX, evenement.deltaY)
    }

    canvas.addEventListener('wheel', aLaMolette, { passive: false })
    return () => canvas.removeEventListener('wheel', aLaMolette)
    // `echelleAjustee` change avec les dimensions de la salle : sans elle en
    // dépendance, l'écouteur garderait l'ancienne et déplacerait de travers.
  }, [echelleAjustee])

  /* ── Interactions ───────────────────────────────────────────────────────── */

  /**
   * Les pixels de la toile sous un point de l'écran.
   *
   * La toile a une taille propre (900 px) et une taille affichée que le CSS
   * décide : sans ce facteur, tout se décale dès que la fenêtre n'a pas la
   * bonne largeur. Séparé de `positionSouris` parce que la molette arrive par
   * un évènement natif, qui n'est pas un `React.MouseEvent`.
   */
  function pixelsDeLaToile(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvas = toile.current
    if (!canvas) return null
    const cadre = canvas.getBoundingClientRect()
    if (cadre.width === 0) return null
    const facteur = canvas.width / cadre.width
    return { x: (clientX - cadre.left) * facteur, y: (clientY - cadre.top) * facteur }
  }

  function positionSouris(evenement: React.MouseEvent<HTMLCanvasElement>): Point2D {
    const pixels = pixelsDeLaToile(evenement.clientX, evenement.clientY)
    if (!pixels) return { x: 0, y: 0 }
    return versMetres(pixels.x, pixels.y)
  }

  /**
   * La tolérance d'attrapage, en mètres, à agrandissement donné.
   *
   * **Elle ne peut pas rester fixe à 0,6 m.** Agrandi douze fois, un demi-mètre
   * couvre la moitié de la toile : on attraperait une enceinte sans jamais
   * pouvoir cliquer à côté d'elle. Réduit, l'inverse : la cible deviendrait
   * plus petite qu'un pixel. Ce qu'on veut est une tolérance constante **à
   * l'écran** — une dizaine de pixels, quel que soit l'agrandissement.
   */
  function toleranceAttrapage(): number {
    const e = echelle()
    return e > 0 ? 12 / e : 0.6
  }

  function enceinteSous(point: Point2D): { id: string; quoi: 'position' | 'visee' } | null {
    const tolerance = toleranceAttrapage()
    for (const enceinte of projet.enceintes) {
      if (Math.hypot(enceinte.visee.x - point.x, enceinte.visee.y - point.y) < tolerance) {
        return { id: enceinte.id, quoi: 'visee' }
      }
      if (Math.hypot(enceinte.position.x - point.x, enceinte.position.y - point.y) < tolerance) {
        return { id: enceinte.id, quoi: 'position' }
      }
    }
    return null
  }

  function auClic(evenement: React.MouseEvent<HTMLCanvasElement>): void {
    const point = positionSouris(evenement)
    setErreur('')

    if (outil === 'zone') {
      setContourEnCours((precedent) => [...precedent, point])
      return
    }

    if (outil === 'enceinte') {
      const modele = modeleParId.get(modeleChoisi)
      if (!modele) {
        setErreur(t('plan.choisirEnceinte'))
        return
      }
      const nouvelle: EnceintePlacee = {
        id: identifiant(),
        modeleId: modele.id,
        position: point,
        hauteur: 3,
        // Visée par défaut vers le fond de la salle : c'est le cas courant, et
        // une visée nulle donnerait un axe indéfini.
        visee: { x: point.x, y: Math.min(projet.profondeur, point.y + 8) },
        hauteurVisee: 1.2,
        gainDb: 0,
        retardMs: 0,
        active: true
      }
      modifierProjet({ ...projet, enceintes: [...projet.enceintes, nouvelle] })
      setSelection(nouvelle.id)
      return
    }

    const attrapee = enceinteSous(point)
    setSelection(attrapee ? attrapee.id : null)
  }

  function auPresse(evenement: React.MouseEvent<HTMLCanvasElement>): void {
    // **Le bouton du milieu déplace la vue, quel que soit l'outil.** Il ne sert
    // à rien d'autre ici, et c'est le geste des logiciels de plan : on n'a pas
    // à quitter l'outil en cours pour se déplacer, ce qui obligerait à le
    // reprendre ensuite et ferait perdre un contour en cours de tracé.
    if (evenement.button === 1) {
      evenement.preventDefault()
      glisseVue.current = { x: evenement.clientX, y: evenement.clientY }
      return
    }
    if (outil !== 'main') return
    const attrapee = enceinteSous(positionSouris(evenement))
    if (attrapee) setGlisse(attrapee)
  }

  /**
   * Le niveau sous le curseur.
   *
   * On lit le point calculé le plus proche plutôt que de recalculer : la carte
   * affichée et le chiffre annoncé doivent venir de la **même** grille. Deux
   * calculs pour le même endroit finiraient par se contredire d'un dixième de
   * décibel, et c'est le genre d'écart qui fait douter de tout le reste.
   */
  function lireSousLeCurseur(point: Point2D): void {
    if (!couverture) {
      setSousCurseur(null)
      return
    }

    let plusProche: { niveau: number; distance: number } | null = null
    for (const zone of couverture.zones) {
      for (const p of zone.points) {
        const d = Math.hypot(p.x - point.x, p.y - point.y)
        if (!plusProche || d < plusProche.distance) plusProche = { niveau: p.niveau, distance: d }
      }
    }

    // Au-delà d'un demi-pas de grille, on est hors zone : mieux vaut le dire
    // que d'afficher le niveau d'un point situé ailleurs.
    const dansUneZone = plusProche !== null && plusProche.distance <= 0.6
    setSousCurseur({
      x: point.x,
      y: point.y,
      niveau: dansUneZone ? plusProche!.niveau : null
    })
  }

  function auDeplacement(evenement: React.MouseEvent<HTMLCanvasElement>): void {
    // Le déplacement de vue passe avant tout le reste : pendant qu'on tire le
    // plan, on ne pose ni ne déplace quoi que ce soit.
    if (glisseVue.current) {
      const cadre = evenement.currentTarget.getBoundingClientRect()
      const facteur = cadre.width > 0 ? evenement.currentTarget.width / cadre.width : 1
      deplacerVue(
        (glisseVue.current.x - evenement.clientX) * facteur,
        (glisseVue.current.y - evenement.clientY) * facteur
      )
      glisseVue.current = { x: evenement.clientX, y: evenement.clientY }
      return
    }

    lireSousLeCurseur(positionSouris(evenement))
    if (!glisse) return
    const point = positionSouris(evenement)
    modifierProjet({
      ...projet,
      enceintes: projet.enceintes.map((e) =>
        e.id === glisse.id
          ? glisse.quoi === 'position'
            ? { ...e, position: point }
            : { ...e, visee: point }
          : e
      )
    })
  }

  /** Une zone neuve, quelle que soit la façon dont son contour a été obtenu. */
  function zoneNeuve(contour: Point2D[]): ZoneEcoute {
    return {
      id: identifiant(),
      nom: t('plan.zoneNumerotee', { numero: projet.zones.length + 1 }),
      contour,
      hauteurOreilles: 1.2,
      altitude: 0,
      pentePourcent: 0,
      directionPenteDegres: 90
    }
  }

  function terminerZone(): void {
    if (contourEnCours.length < 3) {
      setErreur(t('plan.zoneTroisPoints'))
      return
    }
    modifierProjet({ ...projet, zones: [...projet.zones, zoneNeuve(contourEnCours)] })
    setContourEnCours([])
    setOutil('main')
  }

  /* ── Les formes préfaites ────────────────────────────────────────────── */

  const [formeChoisie, setFormeChoisie] = useState(FORMES[0].id)
  const [dimensions, setDimensions] = useState<Record<string, number>>(() =>
    Object.fromEntries(FORMES[0].parametres.map((p) => [p.nom, p.defaut]))
  )

  const forme = FORMES.find((f) => f.id === formeChoisie) ?? FORMES[0]

  /** Changer de forme réinitialise ses cotes : elles n'ont pas les mêmes noms. */
  function changerDeForme(id: string): void {
    const suivante = FORMES.find((f) => f.id === id)
    if (!suivante) return
    setFormeChoisie(id)
    setDimensions(Object.fromEntries(suivante.parametres.map((p) => [p.nom, p.defaut])))
    setErreur('')
  }

  /**
   * L'aperçu de l'aire, recalculé à chaque frappe.
   *
   * Il rend visible une cote absurde avant de poser la forme — et surtout, il
   * rend visible **le refus** : une dimension nulle ou un fer à cheval plus
   * court que son rayon lèvent, et l'aperçu affiche alors le motif au lieu d'un
   * nombre. Sans lui, l'utilisateur cliquerait « Poser » pour découvrir l'erreur.
   */
  const apercu = useMemo(() => {
    try {
      return { aire: aire(forme.construire({ x: 0, y: 0 }, dimensions)), refus: '' }
    } catch (e) {
      return { aire: 0, refus: traduireErreur((e as Error).message) }
    }
  }, [forme, dimensions])

  /**
   * Pose la forme au centre du plan.
   *
   * **Au centre, et pas là où l'on a cliqué** : une salle occupe tout le plan,
   * et la recadrer ensuite est un geste, alors que retrouver une forme posée
   * hors champ n'en est pas un.
   */
  function poserLaForme(): void {
    setErreur('')
    try {
      const centre = { x: projet.largeur / 2, y: projet.profondeur / 2 }
      const contour = forme.construire(centre, dimensions)
      modifierProjet({ ...projet, zones: [...projet.zones, zoneNeuve(contour)] })
      setOutil('main')
    } catch (e) {
      setErreur(traduireErreur((e as Error).message))
    }
  }

  const [conseil, setConseil] = useState<Conseil | null>(null)
  const [conseilEnCours, setConseilEnCours] = useState(false)

  /**
   * Le conseil de placement.
   *
   * Il n'est **pas** recalculé à chaque geste, contrairement à la carte : il
   * essaie plusieurs centaines de placements, et le lancer tout seul figerait
   * l'écran dès qu'on déplace une enceinte. C'est l'utilisateur qui le demande.
   *
   * Le calcul vit dans `commun/acoustique.js`, avec la règle qu'il applique.
   */
  function chercherUnMeilleurPlacement(): void {
    setErreur('')
    setConseilEnCours(true)
    // Un temps mort laisse React peindre « Recherche en cours… » avant de
    // bloquer le fil : sans lui, l'utilisateur voit l'écran se figer sans
    // savoir pourquoi.
    setTimeout(() => {
      try {
        const zones = projet.zones.map((z) => ({
          nom: z.nom,
          contour: z.contour,
          hauteurOreilles: z.hauteurOreilles,
          altitude: z.altitude,
          pentePourcent: z.pentePourcent,
          directionPenteDegres: z.directionPenteDegres
        }))
        // **Le conseil raisonne sur le champ direct seul, et il le faut.**
        //
        // Le champ réverbéré est uniforme : ajouté à la carte, il écrase les
        // écarts. Dans une salle à 3,5 s de RT60, l'écart mesuré tombe de 20 dB
        // à 1 dB — et comme le conseil retient le placement dont l'écart est le
        // plus faible, il conclurait qu'une cathédrale est parfaitement
        // couverte. Un niveau plat obtenu par la réverbération n'est pas une
        // bonne couverture, c'est de la soupe.
        //
        // Ce qu'un placement peut réellement contrôler, c'est le champ direct.
        // La réverbération, elle, se corrige en traitant la salle ou en
        // rapprochant une source — ce que dit la distance critique affichée à
        // côté. Vérifié en le mesurant, pas en le supposant.
        setConseil(conseillerPlacement(zones, enceintesCalcul, projet.bande, 1))
      } catch (e) {
        setErreur(traduireErreur((e as Error).message))
        setConseil(null)
      } finally {
        setConseilEnCours(false)
      }
    }, 30)
  }

  /**
   * Applique le placement proposé aux enceintes du projet.
   *
   * On repasse par `appliquerReglage`, le même transformateur que le conseil a
   * utilisé pour évaluer : appliquer autrement donnerait un placement différent
   * de celui qui a été mesuré, et l'écart annoncé deviendrait un mensonge.
   */
  function appliquerLeConseil(): void {
    if (!conseil) return
    const transformees = appliquerReglage(enceintesCalcul, conseil.propose)

    let rang = 0
    const enceintes = projet.enceintes.map((e) => {
      if (!e.active || !modeleParId.has(e.modeleId)) return e
      const nouvelle = transformees[rang]
      rang += 1
      return {
        ...e,
        position: { x: nouvelle.position.x, y: nouvelle.position.y },
        hauteur: nouvelle.position.z ?? e.hauteur,
        visee: { x: nouvelle.visee.x, y: nouvelle.visee.y }
      }
    })

    modifierProjet({ ...projet, enceintes })
    setConseil(null)
  }

  const [sousCurseur, setSousCurseur] = useState<{ x: number; y: number; niveau: number | null } | null>(
    null
  )
  const [coupeVisible, setCoupeVisible] = useState(false)
  const toileCoupe = useRef<HTMLCanvasElement>(null)

  /**
   * La coupe est prise à l'abscisse de l'enceinte choisie, sinon au milieu de
   * la salle : c'est là qu'on regarde quand on règle un piqué.
   */
  const xCoupe = useMemo(() => {
    const choisie = projet.enceintes.find((e) => e.id === selection)
    return choisie ? choisie.position.x : projet.largeur / 2
  }, [projet.enceintes, projet.largeur, selection])

  const coupe = useMemo(() => {
    if (!coupeVisible || projet.zones.length === 0) return null
    try {
      const zones = projet.zones.map((z) => ({
        nom: z.nom,
        contour: z.contour,
        hauteurOreilles: z.hauteurOreilles,
        altitude: z.altitude,
        pentePourcent: z.pentePourcent,
        directionPenteDegres: z.directionPenteDegres
      }))
      return profilCoupe(zones, enceintesCalcul, xCoupe, projet.bande, PAS_CARTE, analyse?.reverbere)
    } catch {
      // La coupe est un confort : si elle ne peut pas être tracée, on ne
      // dérange pas l'utilisateur avec une erreur — la carte, elle, l'aurait
      // déjà signalée.
      return null
    }
  }, [coupeVisible, projet.zones, projet.bande, enceintesCalcul, xCoupe, analyse])

  const [retards, setRetards] = useState<RetardCalcule[] | null>(null)

  /**
   * Aligne les rappels sur la première enceinte, prise pour façade.
   *
   * `retardsDAlignement` vit dans `commun/acoustique.js`, avec la règle qu'il
   * applique. Ici on ne fait que reporter le résultat sur le projet.
   */
  function alignerLesRappels(): void {
    setErreur('')
    try {
      const calcules = retardsDAlignement(enceintesCalcul)
      setRetards(calcules)

      let rang = 0
      const enceintes = projet.enceintes.map((e) => {
        if (!e.active || !modeleParId.has(e.modeleId)) return e
        const retard = calcules[rang]
        rang += 1
        return { ...e, retardMs: Math.round(retard.retardMs * 10) / 10 }
      })
      modifierProjet({ ...projet, enceintes })
    } catch (e) {
      setErreur(traduireErreur((e as Error).message))
      setRetards(null)
    }
  }

  /**
   * Dessine la coupe : le sol, la ligne d'oreilles, les enceintes et leur visée.
   *
   * L'échelle verticale est **la même que l'horizontale** tant qu'elle tient.
   * Étirer la hauteur rendrait le dessin plus lisible et les angles faux — or
   * c'est précisément un angle qu'on vient juger ici.
   */
  useEffect(() => {
    const canvas = toileCoupe.current
    if (!canvas || !coupe) return
    const pinceau = canvas.getContext('2d')
    if (!pinceau) return

    const points = coupe.points
    const yMin = points[0]?.y ?? 0
    const yMax = points[points.length - 1]?.y ?? 1
    const hauteurMax = Math.max(
      6,
      ...points.map((p) => p.oreilles),
      ...coupe.enceintes.map((e) => e.z)
    )

    const e = canvas.width / Math.max(1, yMax - yMin)
    canvas.height = Math.min(260, Math.round(hauteurMax * e) + 30)
    const versX = (y: number) => (y - yMin) * e
    const versY = (z: number) => canvas.height - 15 - z * e

    pinceau.fillStyle = '#0b0912'
    pinceau.fillRect(0, 0, canvas.width, canvas.height)

    // Le sol.
    pinceau.strokeStyle = 'rgba(255,255,255,0.45)'
    pinceau.lineWidth = 2
    pinceau.beginPath()
    points.forEach((point, index) => {
      const x = versX(point.y)
      const y = versY(point.sol)
      if (index === 0) pinceau.moveTo(x, y)
      else pinceau.lineTo(x, y)
    })
    pinceau.stroke()

    // La ligne d'oreilles : c'est elle qu'il faut arroser.
    pinceau.strokeStyle = 'rgba(181,140,255,0.7)'
    pinceau.setLineDash([4, 4])
    pinceau.beginPath()
    points.forEach((point, index) => {
      const x = versX(point.y)
      const y = versY(point.oreilles)
      if (index === 0) pinceau.moveTo(x, y)
      else pinceau.lineTo(x, y)
    })
    pinceau.stroke()
    pinceau.setLineDash([])

    // Les enceintes et leur visée.
    for (const enceinte of coupe.enceintes) {
      const x = versX(enceinte.y)
      const y = versY(enceinte.z)
      pinceau.strokeStyle = 'rgba(255,255,255,0.55)'
      pinceau.lineWidth = 1.5
      pinceau.beginPath()
      pinceau.moveTo(x, y)
      pinceau.lineTo(versX(enceinte.viseeY), versY(enceinte.viseeZ))
      pinceau.stroke()

      pinceau.fillStyle = '#ffffff'
      pinceau.beginPath()
      pinceau.arc(x, y, 5, 0, Math.PI * 2)
      pinceau.fill()
    }
  }, [coupe])

  const enceinteSelectionnee = projet.enceintes.find((e) => e.id === selection) ?? null

  // La toile garde la proportion de la salle — c'est ce qui fait qu'à
  // l'ajustement, elle la remplit exactement dans les deux sens — mais tient
  // désormais dans une boîte bornée. On fait entrer la salle dans cette boîte,
  // au lieu de fixer une largeur et de subir la hauteur qui en découle.
  const echelleToile = Math.min(
    LARGEUR_TOILE / projet.largeur,
    HAUTEUR_TOILE_MAX / projet.profondeur
  )
  const largeurToile = Math.round(projet.largeur * echelleToile)
  const hauteurToile = Math.round(projet.profondeur * echelleToile)

  return (
    <div className="plan">
      <div className="barre-outils">
        <button className={outil === 'main' ? 'actif' : ''} onClick={() => setOutil('main')}>
          {t('plan.deplacer')}
        </button>
        <button
          className={outil === 'zone' ? 'actif' : ''}
          onClick={() => {
            setOutil('zone')
            setContourEnCours([])
          }}
        >
          {t('plan.dessinerZone')}
        </button>
        <button
          className={outil === 'forme' ? 'actif' : ''}
          onClick={() => {
            setOutil('forme')
            setContourEnCours([])
            setErreur('')
          }}
        >
          {t('forme.poser')}
        </button>
        <button
          className={outil === 'enceinte' ? 'actif' : ''}
          onClick={() => setOutil('enceinte')}
        >
          {t('plan.poserEnceinte')}
        </button>

        <select value={modeleChoisi} onChange={(e) => setModeleChoisi(e.target.value)}>
          {enceintesDisponibles.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </select>

        <select
          value={projet.bande}
          onChange={(e) => modifierProjet({ ...projet, bande: Number(e.target.value) })}
        >
          {[125, 250, 500, 1000, 2000, 4000, 8000].map((bande) => (
            <option key={bande} value={bande}>
              {bande} Hz
            </option>
          ))}
        </select>

        {/*
          La vue, avec son agrandissement affiché et de quoi revenir.
          **Le bouton de retour n'est pas un ornement** : une vue perdue est le
          moyen le plus court de croire un projet vide. On peut sortir la salle
          de l'écran en trois coups de molette, et rien à l'écran ne le dirait.
        */}
        <span className="vue-reglages">
          <button
            className="discret"
            onClick={() => agrandirAutour(1 / PAS_DE_ZOOM, largeurToile / 2, hauteurToile / 2)}
            disabled={vue.zoom <= ZOOM_MIN}
            title={t('vue.reduireAide')}
          >
            −
          </button>
          <span className="discret vue-facteur">{t('vue.facteur', { zoom: vue.zoom.toFixed(1) })}</span>
          <button
            className="discret"
            onClick={() => agrandirAutour(PAS_DE_ZOOM, largeurToile / 2, hauteurToile / 2)}
            disabled={vue.zoom >= ZOOM_MAX}
            title={t('vue.agrandirAide')}
          >
            +
          </button>
          <button
            className="discret"
            onClick={() => setVue(VUE_AJUSTEE)}
            disabled={vue.zoom === 1 && vue.x === 0 && vue.y === 0}
          >
            {t('vue.ajuster')}
          </button>
        </span>

        {outil === 'zone' && (
          <>
            <button onClick={terminerZone}>
              {t('plan.fermerZone', { points: contourEnCours.length })}
            </button>
            <button className="discret" onClick={() => setContourEnCours([])}>
              {t('action.annuler')}
            </button>
          </>
        )}
      </div>

      {outil === 'forme' && (
        <div className="barre-outils barre-formes">
          <select value={formeChoisie} onChange={(e) => changerDeForme(e.target.value)}>
            {FORMES.map((f) => (
              <option key={f.id} value={f.id}>
                {t(f.cle as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>

          {forme.parametres.map((parametre) => (
            <label key={parametre.nom} className="cote">
              {t(parametre.cle as Parameters<typeof t>[0])}
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={dimensions[parametre.nom] ?? parametre.defaut}
                onChange={(e) =>
                  setDimensions({ ...dimensions, [parametre.nom]: Number(e.target.value) })
                }
              />
            </label>
          ))}

          <button onClick={poserLaForme} disabled={apercu.refus !== ''}>
            {t('forme.ajouter')}
          </button>

          <span className={apercu.refus ? 'erreur' : 'discret'}>
            {apercu.refus || t('forme.aire', { aire: apercu.aire.toFixed(1) })}
          </span>
          <span className="discret">{t('forme.explication')}</span>
        </div>
      )}

      {erreur && <p className="erreur">{erreur}</p>}

      {/*
        Les gestes sont écrits, pas devinés. Un mécanisme qu'on ne découvre
        qu'en essayant au hasard n'existe qu'à moitié — c'est la même leçon que
        la fonction posée dans le code et qu'aucun bouton n'appelait.
      */}
      <p className="discret plan-aide">{t('vue.aide')}</p>

      <div className="plan-corps">
        <canvas
          ref={toile}
          width={largeurToile}
          height={hauteurToile}
          onClick={auClic}
          onMouseDown={auPresse}
          onMouseMove={auDeplacement}
          onMouseUp={() => {
            setGlisse(null)
            glisseVue.current = null
          }}
          onMouseLeave={() => {
            setGlisse(null)
            // Relâcher le déplacement en sortant : sans cela, revenir sur la
            // toile ferait bondir la vue de toute la distance parcourue dehors.
            glisseVue.current = null
            setSousCurseur(null)
          }}
          style={{ cursor: outil === 'main' ? 'grab' : 'crosshair' }}
        />

        <aside className="panneau">
          {projet.zones.length > 0 && (
            <>
              <h2>{t('coupe.titre')}</h2>
              <p className="discret">{t('coupe.explication')}</p>
              <button className="discret" onClick={() => setCoupeVisible(!coupeVisible)}>
                {coupeVisible ? t('coupe.cacher') : t('coupe.montrer')}
              </button>

              {coupe && (
                <div className="coupe">
                  <p className="discret">{t('coupe.abscisse', { x: xCoupe.toFixed(1) })}</p>
                  <canvas ref={toileCoupe} width={320} height={160} />
                  <p className="legende-coupe">
                    <span className="trait-sol" /> {t('coupe.sol')}
                    <span className="trait-oreilles" /> {t('coupe.oreilles')}
                  </p>
                  <ul>
                    {coupe.enceintes.map((enceinte) => (
                      <li key={enceinte.nom}>
                        {enceinte.piqueDegres >= 0
                          ? t('coupe.pique', {
                              nom: enceinte.nom,
                              angle: enceinte.piqueDegres.toFixed(1)
                            })
                          : t('coupe.releve', {
                              nom: enceinte.nom,
                              angle: Math.abs(enceinte.piqueDegres).toFixed(1)
                            })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {couverture && (
            <>
              <h2>{t('plan.couverture')}</h2>

              <div className="echelle" role="img" aria-label={t('echelle.titre')}>
                <span>{(couverture.maximum - PLAGE_DB).toFixed(0)} dB</span>
                <div className="echelle-bande" />
                <span>{couverture.maximum.toFixed(0)} dB</span>
              </div>
              <p className="discret">
                {t('echelle.relatif', { haut: couverture.maximum.toFixed(1) })}
              </p>

              {sousCurseur && (
                <p className="sous-curseur">
                  {sousCurseur.niveau === null
                    ? t('curseur.horsZone')
                    : t('curseur.niveau', {
                        niveau: sousCurseur.niveau.toFixed(1),
                        x: sousCurseur.x.toFixed(1),
                        y: sousCurseur.y.toFixed(1)
                      })}
                </p>
              )}

              <p className="chiffre-large">
                <strong>{couverture.ecart.toFixed(1)} dB</strong>
                <span>{t('plan.ecartSalle')}</span>
              </p>
              <p className="discret">{t('plan.ecartExplication')}</p>
              {salle?.active && analyse && (
                <p className="avertissement">{t('salle.ecartTrompeur')}</p>
              )}

              <table>
                <thead>
                  <tr>
                    <th>{t('plan.zone')}</th>
                    <th>{t('plan.moyenne')}</th>
                    <th>{t('plan.ecart')}</th>
                  </tr>
                </thead>
                <tbody>
                  {couverture.zones.map((zone) => (
                    <tr key={zone.nom}>
                      <td>{zone.nom}</td>
                      <td>{zone.moyenne.toFixed(1)}</td>
                      <td>{zone.ecart.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {!couverture && (
            <p className="discret">{t('plan.riendAfficher')}</p>
          )}

          {enceintesCalcul.length > 1 && (
            <>
              <h2>{t('retard.titre')}</h2>
              <p className="discret">
                {t('retard.explication', { marge: MARGE_LOCALISATION_MS })}
              </p>
              <button onClick={alignerLesRappels}>
                {t('retard.calculer')}
              </button>

              {retards && (
                <div className="retards">
                  <p className="succes">{t('retard.applique')}</p>
                  <ul>
                    {retards.map((r) => (
                      <li key={r.nom}>
                        {r.principale
                          ? `${r.nom} — ${t('retard.facade')}`
                          : t('retard.ligne', {
                              nom: r.nom,
                              distance: r.distanceM.toFixed(1),
                              retard: r.retardMs.toFixed(1)
                            })}
                      </li>
                    ))}
                  </ul>
                  <p className="avertissement">{t('retard.reserve')}</p>
                </div>
              )}
            </>
          )}

          {enceintesCalcul.length > 0 && projet.zones.length > 0 && (
            <>
              <h2>{t('conseil.titre')}</h2>
              <p className="discret">{t('conseil.critere')}</p>

              <button onClick={chercherUnMeilleurPlacement} disabled={conseilEnCours}>
                {conseilEnCours ? t('conseil.enCours') : t('conseil.chercher')}
              </button>

              {conseil && (
                <div className="conseil">
                  <p className="discret">{t('conseil.essais', { essais: conseil.essais })}</p>

                  {conseil.gain <= 0.01 ? (
                    <p>{t('conseil.rienDeMieux', { essais: conseil.essais })}</p>
                  ) : (
                    <>
                      <p className="chiffre-large">
                        <strong>−{conseil.gain.toFixed(1)} dB</strong>
                        <span>
                          {t('conseil.gain', {
                            avant: conseil.ecartActuel.toFixed(1),
                            apres: conseil.ecartPropose.toFixed(1)
                          })}
                        </span>
                      </p>

                      <h3>{t('conseil.pourquoi')}</h3>
                      <ul>
                        {conseil.effets.map((effet) => (
                          <li key={effet.reglage}>
                            {decrireEffet(effet)} — {t('conseil.apporte', { gain: effet.gain.toFixed(1) })}
                          </li>
                        ))}
                      </ul>

                      <button onClick={appliquerLeConseil}>
                        {t('conseil.appliquer')}
                      </button>
                    </>
                  )}

                  <p className="avertissement">{t('conseil.reserve')}</p>
                </div>
              )}
            </>
          )}

          {enceinteSelectionnee && (
            <>
              <h2>{t('plan.enceinteChoisie')}</h2>
              <label>
                {t('plan.hauteur')}
                <input
                  type="number"
                  step="0.1"
                  value={enceinteSelectionnee.hauteur}
                  onChange={(e) =>
                    modifierProjet({
                      ...projet,
                      enceintes: projet.enceintes.map((x) =>
                        x.id === enceinteSelectionnee.id
                          ? { ...x, hauteur: Number(e.target.value) }
                          : x
                      )
                    })
                  }
                />
              </label>
              <label>
                {t('plan.gain')}
                <input
                  type="number"
                  step="0.5"
                  value={enceinteSelectionnee.gainDb}
                  onChange={(e) =>
                    modifierProjet({
                      ...projet,
                      enceintes: projet.enceintes.map((x) =>
                        x.id === enceinteSelectionnee.id
                          ? { ...x, gainDb: Number(e.target.value) }
                          : x
                      )
                    })
                  }
                />
              </label>
              <button
                className="discret"
                onClick={() =>
                  modifierProjet({
                    ...projet,
                    enceintes: projet.enceintes.filter((x) => x.id !== enceinteSelectionnee.id)
                  })
                }
              >
                {t('plan.retirerEnceinte')}
              </button>
            </>
          )}

          {salle && (
            <>
              <h2>{t('salle.titre')}</h2>

              <label className="conditions-case">
                <input
                  type="checkbox"
                  checked={salle.active}
                  onChange={(e) => modifierSalle({ active: e.target.checked })}
                />
                {t('salle.active')}
              </label>

              {!salle.active && <p className="discret">{t('salle.inactive')}</p>}

              <label>
                {t('salle.hauteur')}
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={salle.hauteur}
                  onChange={(e) => modifierSalle({ hauteur: Number(e.target.value) })}
                />
              </label>

              {(['sol', 'plafond', 'murs'] as const).map((surface) => (
                <label key={surface}>
                  {t(`salle.${surface}` as Parameters<typeof t>[0])}
                  <select
                    value={salle[surface]}
                    onChange={(e) => modifierSalle({ [surface]: e.target.value })}
                  >
                    {MATERIAUX.filter((m) => m.parUnite === 'surface').map((m) => (
                      <option key={m.id} value={m.id}>
                        {t(m.cle as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              <label>
                {t('salle.spectateurs')}
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={salle.spectateurs}
                  onChange={(e) => modifierSalle({ spectateurs: Number(e.target.value) })}
                />
              </label>
              <p className="discret">{t('salle.spectateursExplication')}</p>

              {analyse && (
                <div className="analyse-salle">
                  <p>{t('salle.volume', { volume: analyse.volume.toFixed(0) })}</p>
                  <p>{t('salle.aireAbsorption', { aire: analyse.aireAbsorption.toFixed(0) })}</p>
                  <p>
                    {t('salle.rt60', {
                      sabine: analyse.rt60Sabine.toFixed(2),
                      eyring: analyse.rt60Eyring.toFixed(2)
                    })}
                  </p>
                  <p className="discret">{t('salle.rt60Explication')}</p>
                  <p className="avertissement">
                    {t('salle.distanceCritique', {
                      distance: analyse.distanceCritique.toFixed(1)
                    })}
                  </p>
                  <p className="discret">{t('salle.distanceCritiqueExplication')}</p>
                  {partHorsCritique !== null && (
                    <>
                      <p className="avertissement">
                        {t('salle.partHorsCritique', {
                          part: (partHorsCritique * 100).toFixed(0)
                        })}
                      </p>
                      <p className="discret">{t('salle.partHorsCritiqueExplication')}</p>
                    </>
                  )}

                  {intelligibilite && (
                    <>
                      <h3>{t('sti.titre')}</h3>
                      <p className="avertissement">
                        {t('sti.valeur', {
                          sti: intelligibilite.pire.toFixed(2),
                          jugement: t(jugementSti(intelligibilite.pire) as Parameters<typeof t>[0])
                        })}
                      </p>
                      <p>
                        {t('sti.partSousSeuil', {
                          part: (intelligibilite.partSousSeuil * 100).toFixed(0)
                        })}
                      </p>
                      <p className="discret">{t('sti.seuils')}</p>
                      <p className="discret">{t('sti.methode')}</p>
                      <p className="discret">{t('sti.reserve')}</p>
                    </>
                  )}
                  <p className="discret">{t('salle.modeleStatistique')}</p>
                  <p className="discret">{t('materiau.valeursIndicatives')}</p>
                </div>
              )}
            </>
          )}

          {projet.zones.length > 0 && (
            <>
              <h2>{t('plan.zones')}</h2>
              {projet.zones.map((zone) => (
                <div key={zone.id} className="zone-reglage">
                  <strong>{zone.nom}</strong>
                  <label>
                    {t('plan.pente')}
                    <input
                      type="number"
                      step="1"
                      value={zone.pentePourcent}
                      onChange={(e) =>
                        modifierProjet({
                          ...projet,
                          zones: projet.zones.map((z) =>
                            z.id === zone.id ? { ...z, pentePourcent: Number(e.target.value) } : z
                          )
                        })
                      }
                    />
                  </label>
                  <button
                    className="discret"
                    onClick={() =>
                      modifierProjet({
                        ...projet,
                        zones: projet.zones.filter((z) => z.id !== zone.id)
                      })
                    }
                  >
                    {t('action.supprimer')}
                  </button>
                </div>
              ))}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
