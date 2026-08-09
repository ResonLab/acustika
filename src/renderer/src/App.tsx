import { useCallback, useEffect, useState } from 'react'
import Plan from './pages/Plan'
import Bibliotheque from './pages/Bibliotheque'
import type { ModeleEnceinte, Projet } from '../../partage/types'

/**
 * Acustika, application à documents : un projet est un fichier qu'on ouvre,
 * enregistre et transmet. Le titre porte donc le nom du fichier et un point
 * quand il reste des modifications non enregistrées — sans quoi on ferme sans
 * savoir qu'on perd une heure de travail.
 */
export default function App(): React.JSX.Element {
  const [onglet, setOnglet] = useState<'plan' | 'bibliotheque'>('plan')
  const [projet, setProjet] = useState<Projet | null>(null)
  const [chemin, setChemin] = useState<string | null>(null)
  const [modifie, setModifie] = useState(false)
  const [enceintes, setEnceintes] = useState<ModeleEnceinte[]>([])
  const [message, setMessage] = useState('')

  const rechargerBibliotheque = useCallback(async () => {
    setEnceintes(await window.api.bibliotheque.lister())
  }, [])

  useEffect(() => {
    window.api.projet.nouveau().then(setProjet)
    rechargerBibliotheque()
  }, [rechargerBibliotheque])

  function modifierProjet(nouveau: Projet): void {
    setProjet(nouveau)
    setModifie(true)
  }

  async function ouvrir(): Promise<void> {
    setMessage('')
    try {
      const ouvert = await window.api.projet.ouvrir()
      if (!ouvert) return
      setProjet(ouvert.projet)
      setChemin(ouvert.chemin)
      setModifie(false)
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  async function enregistrer(sousUnAutreNom = false): Promise<void> {
    if (!projet) return
    setMessage('')
    try {
      const resultat = await window.api.projet.enregistrer(projet, sousUnAutreNom ? null : chemin)
      if (!resultat) return
      setChemin(resultat.chemin)
      setModifie(false)
      setMessage(`Enregistré : ${resultat.nom}`)
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  async function nouveau(): Promise<void> {
    // Un projet non enregistré ne disparaît pas sans qu'on le dise.
    if (modifie && !confirm('Le projet en cours a des modifications non enregistrées. Continuer ?')) {
      return
    }
    setProjet(await window.api.projet.nouveau())
    setChemin(null)
    setModifie(false)
  }

  if (!projet) return <div className="app" />

  return (
    <div className="app">
      <header className="entete">
        <div className="marque">
          <span className="pastille" />
          <div>
            <strong>Acustika</strong>
            <span className="discret">
              {chemin ? chemin.split(/[\\/]/).pop() : 'Projet non enregistré'}
              {modifie ? ' •' : ''}
            </span>
          </div>
        </div>

        <nav>
          <button className={onglet === 'plan' ? 'actif' : ''} onClick={() => setOnglet('plan')}>
            Plan
          </button>
          <button
            className={onglet === 'bibliotheque' ? 'actif' : ''}
            onClick={() => setOnglet('bibliotheque')}
          >
            Bibliothèque
          </button>
        </nav>

        <div className="actions">
          <button className="discret" onClick={nouveau}>
            Nouveau
          </button>
          <button className="discret" onClick={ouvrir}>
            Ouvrir…
          </button>
          <button onClick={() => enregistrer(false)}>Enregistrer</button>
          <button className="discret" onClick={() => enregistrer(true)}>
            Enregistrer sous…
          </button>
        </div>
      </header>

      {message && <p className="message">{message}</p>}

      <main>
        {onglet === 'plan' && (
          <Plan
            projet={projet}
            modifierProjet={modifierProjet}
            enceintesDisponibles={enceintes}
          />
        )}
        {onglet === 'bibliotheque' && (
          <Bibliotheque enceintes={enceintes} onChangement={rechargerBibliotheque} />
        )}
      </main>
    </div>
  )
}
