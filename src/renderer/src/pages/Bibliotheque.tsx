import { useState } from 'react'
import { BANDES_OCTAVE } from '../../../../commun/acoustique.js'
import type { ModeleEnceinte } from '../../../partage/types'
import { t, traduireErreur } from '../../../partage/i18n'

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
      source: t('biblio.saisiMain')
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
      setErreur(traduireErreur((e as Error).message))
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
    setMessage(t('biblio.importees', { nombre: resultat.ajoutees }))
    if (resultat.erreurs.length > 0) setErreur(resultat.erreurs.map(traduireErreur).join(' · '))
  }

  /**
   * Importe des données polaires et en déduit l'ouverture par bande.
   *
   * **Le résultat est proposé, pas enregistré.** Une directivité importée de
   * travers donnerait un placement faux avec l'aplomb d'un vrai : l'utilisateur
   * doit voir les chiffres avant qu'ils n'entrent dans la bibliothèque.
   */
  async function importerPolaire(): Promise<void> {
    setErreur('')
    setMessage('')
    try {
      const lecture = await window.api.bibliotheque.importerPolaire()
      if (!lecture) return

      // Les bandes que le fichier ne couvre pas gardent la valeur par défaut :
      // laisser un trou ferait échouer le calcul de niveau sur cette bande-là,
      // et l'utilisateur ne saurait pas pourquoi.
      const ouverture: Record<number, number> = {}
      for (const bande of BANDES_OCTAVE) ouverture[bande] = lecture.ouverture[bande] ?? 90

      setEdition({
        id: '',
        nom: lecture.nom,
        marque: '',
        niveau1m: 100,
        ouverture,
        source: t('biblio.importerPolaire')
      })
      setMessage(
        t('biblio.polaireLu', {
          nom: lecture.nom,
          bandes: Object.keys(lecture.ouverture).length
        })
      )
      if (lecture.avertissements.length > 0) setErreur(lecture.avertissements.join(' · '))
    } catch (e) {
      setErreur(traduireErreur((e as Error).message))
    }
  }

  return (
    <div className="page">
      <div className="barre-outils">
        <button onClick={nouvelle}>{t('biblio.nouvelle')}</button>
        <button className="discret" onClick={importer}>
          {t('biblio.importerCsv')}
        </button>
        <button className="discret" onClick={importerPolaire}>
          {t('biblio.importerPolaire')}
        </button>
      </div>

      <p className="avertissement">
        <strong>{t('biblio.avertissementFort')}</strong>
        {t('biblio.avertissementSuite')}
        <strong>CLF</strong>
        {t('biblio.avertissementFin')}
      </p>

      <p className="discret">{t('biblio.polaireExplication')}</p>
      <p className="discret">{t('biblio.clfNonLu')}</p>

      {message && <p className="succes">{message}</p>}
      {erreur && <p className="erreur">{erreur}</p>}

      {edition && (
        <div className="carte">
          <h2>{edition.id ? t('action.modifier') : t('biblio.titreNouvelle')}</h2>
          <div className="formulaire">
            <label>
              {t('biblio.nom')}
              <input
                value={edition.nom}
                onChange={(e) => setEdition({ ...edition, nom: e.target.value })}
                autoFocus
              />
            </label>
            <label>
              {t('biblio.marque')}
              <input
                value={edition.marque}
                onChange={(e) => setEdition({ ...edition, marque: e.target.value })}
              />
            </label>
            <label>
              {t('biblio.niveau1m')} (dB)
              <input
                type="number"
                value={edition.niveau1m}
                onChange={(e) => setEdition({ ...edition, niveau1m: Number(e.target.value) })}
              />
            </label>
            <label>
              {t('biblio.provenanceDonnees')}
              <input
                value={edition.source}
                onChange={(e) => setEdition({ ...edition, source: e.target.value })}
              />
            </label>
          </div>

          <h3>{t('biblio.ouverture')}</h3>
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
            <button onClick={enregistrer}>{t('action.enregistrer')}</button>
            <button className="discret" onClick={() => setEdition(null)}>
              {t('action.annuler')}
            </button>
          </div>
        </div>
      )}

      <div className="carte defilable">
        <table>
          <thead>
            <tr>
              <th>{t('biblio.nom')}</th>
              <th>{t('biblio.marque')}</th>
              <th>{t('biblio.niveau1m')}</th>
              {BANDES_OCTAVE.map((bande) => (
                <th key={bande}>{bande}</th>
              ))}
              <th>{t('biblio.provenance')}</th>
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
                    {t('action.modifier')}
                  </button>
                  <button className="discret" onClick={() => supprimer(enceinte.id)}>
                    {t('action.supprimer')}
                  </button>
                </td>
              </tr>
            ))}
            {enceintes.length === 0 && (
              <tr>
                <td colSpan={11} className="discret">
                  {t('biblio.vide')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
