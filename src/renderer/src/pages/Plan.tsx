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
import { aire, FORMES } from '../../../../commun/formes.js'
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
      return couvertureSalle(zones, enceintesCalcul, projet.bande, 0.4)
    } catch (e) {
      setErreur(traduireErreur((e as Error).message))
      return null
    }
  }, [projet.zones, projet.bande, enceintesCalcul])

  /** Échelle : combien de pixels pour un mètre. */
  const echelle = useCallback(() => {
    const largeurPixels = toile.current?.width ?? 800
    const hauteurPixels = toile.current?.height ?? 600
    return Math.min(largeurPixels / projet.largeur, hauteurPixels / projet.profondeur)
  }, [projet.largeur, projet.profondeur])

  const versEcran = useCallback(
    (point: Point2D) => ({ x: point.x * echelle(), y: point.y * echelle() }),
    [echelle]
  )

  const versMetres = useCallback(
    (x: number, y: number): Point2D => {
      const e = echelle()
      return { x: Number((x / e).toFixed(2)), y: Number((y / e).toFixed(2)) }
    },
    [echelle]
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
    pinceau.strokeStyle = 'rgba(255,255,255,0.06)'
    pinceau.lineWidth = 1
    for (let m = 0; m <= projet.largeur; m += 1) {
      pinceau.beginPath()
      pinceau.moveTo(m * e, 0)
      pinceau.lineTo(m * e, projet.profondeur * e)
      pinceau.stroke()
    }
    for (let m = 0; m <= projet.profondeur; m += 1) {
      pinceau.beginPath()
      pinceau.moveTo(0, m * e)
      pinceau.lineTo(projet.largeur * e, m * e)
      pinceau.stroke()
    }

    // La couverture, point par point, dans chaque zone.
    if (couverture) {
      const maximum = couverture.maximum
      const cote = Math.max(2, 0.4 * e)
      for (const zone of couverture.zones) {
        for (const point of zone.points) {
          const [r, v, b] = couleurNiveau((point.niveau - (maximum - PLAGE_DB)) / PLAGE_DB)
          pinceau.fillStyle = `rgb(${r},${v},${b})`
          pinceau.fillRect(point.x * e - cote / 2, point.y * e - cote / 2, cote, cote)
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

  /* ── Interactions ───────────────────────────────────────────────────────── */

  function positionSouris(evenement: React.MouseEvent<HTMLCanvasElement>): Point2D {
    const cadre = evenement.currentTarget.getBoundingClientRect()
    const facteur = evenement.currentTarget.width / cadre.width
    return versMetres(
      (evenement.clientX - cadre.left) * facteur,
      (evenement.clientY - cadre.top) * facteur
    )
  }

  function enceinteSous(point: Point2D): { id: string; quoi: 'position' | 'visee' } | null {
    // 0,6 m de tolérance : assez pour attraper le point sans le chercher.
    for (const enceinte of projet.enceintes) {
      if (Math.hypot(enceinte.visee.x - point.x, enceinte.visee.y - point.y) < 0.6) {
        return { id: enceinte.id, quoi: 'visee' }
      }
      if (Math.hypot(enceinte.position.x - point.x, enceinte.position.y - point.y) < 0.6) {
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
      return profilCoupe(zones, enceintesCalcul, xCoupe, projet.bande, 0.4)
    } catch {
      // La coupe est un confort : si elle ne peut pas être tracée, on ne
      // dérange pas l'utilisateur avec une erreur — la carte, elle, l'aurait
      // déjà signalée.
      return null
    }
  }, [coupeVisible, projet.zones, projet.bande, enceintesCalcul, xCoupe])

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

      <div className="plan-corps">
        <canvas
          ref={toile}
          width={900}
          height={Math.round((900 * projet.profondeur) / projet.largeur)}
          onClick={auClic}
          onMouseDown={auPresse}
          onMouseMove={auDeplacement}
          onMouseUp={() => setGlisse(null)}
          onMouseLeave={() => {
            setGlisse(null)
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
              <button className="action-ecriture" onClick={alignerLesRappels}>
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

                      <button className="action-ecriture" onClick={appliquerLeConseil}>
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
