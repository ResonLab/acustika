import { useCallback, useEffect, useState } from 'react'
import Plan from './pages/Plan'
import Bibliotheque from './pages/Bibliotheque'
import ConditionsUtilisation from './components/ConditionsUtilisation'
import LogoAcustika from './components/LogoAcustika'
import type { ModeleEnceinte, Projet } from '../../partage/types'
import { definirLangue, LANGUES, t, traduireErreur, type Langue } from '../../partage/i18n'
import { VERSION_CONDITIONS } from '../../partage/conditions'

/**
 * La version des conditions acceptées par ce poste.
 *
 * Incrémenter `VERSION_CONDITIONS` fait donc réapparaître l'écran : on ne
 * modifie pas des conditions dans le dos de quelqu'un qui les a acceptées.
 */
const CLE_CONDITIONS = 'acustika-conditions-acceptees'

function conditionsDejaAcceptees(): boolean {
  try {
    return localStorage.getItem(CLE_CONDITIONS) === VERSION_CONDITIONS
  } catch {
    // Navigation privée ou stockage refusé : on redemande l'acceptation.
    return false
  }
}

/**
 * La langue est propre au poste : elle vit dans le navigateur, pas dans le
 * fichier de projet. Un projet transmis à un confrère ne doit pas lui imposer
 * la langue de celui qui l'a créé.
 */
const CLE_LANGUE = 'acustika-langue'

function langueInitiale(): Langue {
  try {
    const memorisee = localStorage.getItem(CLE_LANGUE)
    if (memorisee === 'fr' || memorisee === 'en') return memorisee
  } catch {
    // Navigation privée ou stockage refusé : on part du français.
  }
  return 'fr'
}

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
  const [langueActive, setLangueActive] = useState<Langue>(langueInitiale)
  const [conditionsAcceptees, setConditionsAcceptees] = useState(conditionsDejaAcceptees)

  // Avant le premier rendu des enfants : sans cela, ils s'afficheraient une
  // fois dans la langue précédente.
  definirLangue(langueActive)

  function changerLangue(nouvelle: Langue): void {
    definirLangue(nouvelle)
    setLangueActive(nouvelle)
    try {
      localStorage.setItem(CLE_LANGUE, nouvelle)
    } catch {
      // Le choix ne survivra pas à la fermeture, mais l'écran suit quand même.
    }
  }

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
      setMessage(traduireErreur((e as Error).message))
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
      setMessage(t('app.enregistre', { nom: resultat.nom }))
    } catch (e) {
      setMessage(traduireErreur((e as Error).message))
    }
  }

  async function nouveau(): Promise<void> {
    // Un projet non enregistré ne disparaît pas sans qu'on le dise.
    if (modifie && !confirm(t('app.abandonner'))) {
      return
    }
    setProjet(await window.api.projet.nouveau())
    setChemin(null)
    setModifie(false)
  }

  // L'écran des conditions passe avant tout le reste : des conditions qu'on
  // peut contourner d'un clic ne sont pas des conditions.
  if (!conditionsAcceptees) {
    return (
      <ConditionsUtilisation
        onAccepter={() => {
          try {
            localStorage.setItem(CLE_CONDITIONS, VERSION_CONDITIONS)
          } catch {
            // Le choix ne survivra pas à la fermeture, mais l'écran s'ouvre.
          }
          setConditionsAcceptees(true)
        }}
      />
    )
  }

  if (!projet) return <div className="app" />

  return (
    <div className="app">
      <header className="entete">
        <div className="marque">
          <LogoAcustika taille={30} />
          <div>
            <strong>Acustika</strong>
            <span className="discret">
              {chemin ? chemin.split(/[\\/]/).pop() : t('app.projetNonEnregistre')}
              {modifie ? ' •' : ''}
            </span>
          </div>
        </div>

        <nav>
          <button className={onglet === 'plan' ? 'actif' : ''} onClick={() => setOnglet('plan')}>
            {t('app.plan')}
          </button>
          <button
            className={onglet === 'bibliotheque' ? 'actif' : ''}
            onClick={() => setOnglet('bibliotheque')}
          >
            {t('app.bibliotheque')}
          </button>
        </nav>

        <div className="actions">
          <button className="discret" onClick={nouveau}>
            {t('app.nouveau')}
          </button>
          <button className="discret" onClick={ouvrir}>
            {t('app.ouvrir')}
          </button>
          <button onClick={() => enregistrer(false)}>{t('app.enregistrer')}</button>
          <button className="discret" onClick={() => enregistrer(true)}>
            {t('app.enregistrerSous')}
          </button>

          <select
            aria-label={t('param.langue')}
            value={langueActive}
            onChange={(e) => changerLangue(e.target.value as Langue)}
          >
            {LANGUES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nom}
              </option>
            ))}
          </select>
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
