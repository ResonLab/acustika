import { useState } from 'react'
import { BANDES_OCTAVE } from '../../../../commun/acoustique.js'
import type { ModeleEnceinte } from '../../../partage/types'

/**
 * La bibliothèque d'enceintes : le « stock » où l'on choisit avant de poser.
 *
 * L'ouverture est réglable **bande par bande**, et c'est volontaire : une
 * enceinte est très directive dans l'aigu et quasi omnidirectionnelle dans le
 * grave. Une valeur unique donnerait des cartes qui rassurent et des conseils
 * qui trompent.
 */
export default function Bibliotheque({
  enceintes,
  onChangement
}: {
  enceintes: ModeleEnceinte[]
  onChangement: () => void
}): React.JSX.Element {
  const [edition, setEdition] = useState<ModeleEnceinte | null>(null)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  function nouvelle(): void {
    const ouverture: Record<number, number> = {}
    for (const bande of BANDES_OCTAVE) ouverture[bande] = 90
    setEdition({
      id: '',
      nom: '',
      marque: '',
      niveau1m: 96,
      ouverture,
      source: 'Saisi à la main'
    })
  }

  async function enregistrer(): Promise<void> {
    if (!edition) return
    setErreur('')
    try {
      if (edition.id) await window.api.bibliotheque.modifier(edition)
      else await window.api.bibliotheque.ajouter(edition)
      setEdition(null)
      onChangement()
    } catch (e) {
      setErreur((e as Error).message)
    }
  }

  async function supprimer(id: string): Promise<void> {
    await window.api.bibliotheque.supprimer(id)
    onChangement()
  }

  async function importer(): Promise<void> {
    setErreur('')
    setMessage('')
    const resultat = await window.api.bibliotheque.importerCsv()
    if (!resultat) return
    onChangement()
    setMessage(`${resultat.ajoutees} enceinte(s) importée(s).`)
    if (resultat.erreurs.length > 0) setErreur(resultat.erreurs.join(' · '))
  }

  return (
    <div className="page">
      <div className="barre-outils">
        <button onClick={nouvelle}>+ Nouvelle enceinte</button>
        <button className="discret" onClick={importer}>
          Importer un CSV…
        </button>
      </div>

      <p className="avertissement">
        <strong>Les enceintes livrées sont des gabarits génériques</strong>, pas des modèles du
        commerce. Corrigez le niveau et les ouvertures avec la fiche technique réelle : une
        directivité inventée donne un placement faux avec l&apos;air d&apos;être sûr. Le format
        ouvert visé est le <strong>CLF</strong> ; en attendant, le CSV permet la saisie.
      </p>

      {message && <p className="succes">{message}</p>}
      {erreur && <p className="erreur">{erreur}</p>}

      {edition && (
        <div className="carte">
          <h2>{edition.id ? 'Modifier' : 'Nouvelle enceinte'}</h2>
          <div className="formulaire">
            <label>
              Nom
              <input
                value={edition.nom}
                onChange={(e) => setEdition({ ...edition, nom: e.target.value })}
                autoFocus
              />
            </label>
            <label>
              Marque
              <input
                value={edition.marque}
                onChange={(e) => setEdition({ ...edition, marque: e.target.value })}
              />
            </label>
            <label>
              Niveau à 1 m (dB)
              <input
                type="number"
                value={edition.niveau1m}
                onChange={(e) => setEdition({ ...edition, niveau1m: Number(e.target.value) })}
              />
            </label>
            <label>
              Provenance des données
              <input
                value={edition.source}
                onChange={(e) => setEdition({ ...edition, source: e.target.value })}
              />
            </label>
          </div>

          <h3>Ouverture à −6 dB, par bande</h3>
          <div className="formulaire">
            {BANDES_OCTAVE.map((bande) => (
              <label key={bande}>
                {bande} Hz
                <input
                  type="number"
                  value={edition.ouverture[bande] ?? 90}
                  onChange={(e) =>
                    setEdition({
                      ...edition,
                      ouverture: { ...edition.ouverture, [bande]: Number(e.target.value) }
                    })
                  }
                />
              </label>
            ))}
          </div>

          <div className="barre-boutons">
            <button onClick={enregistrer}>Enregistrer</button>
            <button className="discret" onClick={() => setEdition(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="carte defilable">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Marque</th>
              <th>Niveau 1 m</th>
              {BANDES_OCTAVE.map((bande) => (
                <th key={bande}>{bande}</th>
              ))}
              <th>Provenance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {enceintes.map((enceinte) => (
              <tr key={enceinte.id}>
                <td>{enceinte.nom}</td>
                <td>{enceinte.marque || '—'}</td>
                <td>{enceinte.niveau1m} dB</td>
                {BANDES_OCTAVE.map((bande) => (
                  <td key={bande}>{enceinte.ouverture[bande] ?? '—'}°</td>
                ))}
                <td className="discret">{enceinte.source}</td>
                <td>
                  <button className="discret" onClick={() => setEdition(enceinte)}>
                    Modifier
                  </button>
                  <button className="discret" onClick={() => supprimer(enceinte.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {enceintes.length === 0 && (
              <tr>
                <td colSpan={11} className="discret">
                  La bibliothèque est vide.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
