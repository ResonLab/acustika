import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { couvertureSalle } from '../../../../commun/acoustique.js'
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

type Outil = 'main' | 'zone' | 'enceinte'

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
      setErreur((e as Error).message)
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
        setErreur("Choisissez d'abord une enceinte dans la bibliothèque.")
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

  function auDeplacement(evenement: React.MouseEvent<HTMLCanvasElement>): void {
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

  function terminerZone(): void {
    if (contourEnCours.length < 3) {
      setErreur('Une zone demande au moins trois points.')
      return
    }
    const zone: ZoneEcoute = {
      id: identifiant(),
      nom: `Zone ${projet.zones.length + 1}`,
      contour: contourEnCours,
      hauteurOreilles: 1.2,
      altitude: 0,
      pentePourcent: 0,
      directionPenteDegres: 90
    }
    modifierProjet({ ...projet, zones: [...projet.zones, zone] })
    setContourEnCours([])
    setOutil('main')
  }

  const enceinteSelectionnee = projet.enceintes.find((e) => e.id === selection) ?? null

  return (
    <div className="plan">
      <div className="barre-outils">
        <button className={outil === 'main' ? 'actif' : ''} onClick={() => setOutil('main')}>
          Déplacer
        </button>
        <button
          className={outil === 'zone' ? 'actif' : ''}
          onClick={() => {
            setOutil('zone')
            setContourEnCours([])
          }}
        >
          Dessiner une zone
        </button>
        <button
          className={outil === 'enceinte' ? 'actif' : ''}
          onClick={() => setOutil('enceinte')}
        >
          Poser une enceinte
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
            <button onClick={terminerZone}>Fermer la zone ({contourEnCours.length} pts)</button>
            <button className="discret" onClick={() => setContourEnCours([])}>
              Annuler
            </button>
          </>
        )}
      </div>

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
          onMouseLeave={() => setGlisse(null)}
          style={{ cursor: outil === 'main' ? 'grab' : 'crosshair' }}
        />

        <aside className="panneau">
          {couverture && (
            <>
              <h2>Couverture</h2>
              <p className="chiffre-large">
                <strong>{couverture.ecart.toFixed(1)} dB</strong>
                <span>écart sur toute la salle</span>
              </p>
              <p className="discret">
                C&apos;est le chiffre qui compte : une salle bien couverte n&apos;est pas une salle
                forte, c&apos;est une salle où tout le monde entend la même chose.
              </p>

              <table>
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Moy.</th>
                    <th>Écart</th>
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
            <p className="discret">
              Dessinez une zone et posez une enceinte : la couverture apparaîtra ici.
            </p>
          )}

          {enceinteSelectionnee && (
            <>
              <h2>Enceinte choisie</h2>
              <label>
                Hauteur (m)
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
                Gain (dB)
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
                Retirer cette enceinte
              </button>
            </>
          )}

          {projet.zones.length > 0 && (
            <>
              <h2>Zones</h2>
              {projet.zones.map((zone) => (
                <div key={zone.id} className="zone-reglage">
                  <strong>{zone.nom}</strong>
                  <label>
                    Pente (%)
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
                    Supprimer
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
