import { useEffect, useRef, useState } from 'react'
import {
  CONDITIONS_UTILISATION,
  RESUME_CONDITIONS,
  URL_CONDITIONS,
  URL_CONDITIONS_EN,
  VERSION_CONDITIONS
} from '../../../partage/conditions'
import { langue, t } from '../../../partage/i18n'

/**
 * L'écran d'acceptation des conditions, au premier lancement.
 *
 * **La case ne s'active qu'après défilement complet du texte.** Ce n'est pas
 * une formalité déguisée : le point 2 dit que ni le calcul ni le conseil de
 * placement ne remplacent une étude acoustique, et c'est précisément ce qu'il
 * ne faut pas découvrir après coup. Une case cochable d'emblée serait cochée
 * sans rien lire.
 *
 * **L'écran bloque l'application.** Repris d'Ohmnia et de Scenika, et pour la
 * même raison : des conditions qu'on peut ignorer d'un clic ne sont pas des
 * conditions.
 */
interface Props {
  onAccepter: () => void
}

export default function ConditionsUtilisation({ onAccepter }: Props): React.JSX.Element {
  const [luJusquauBout, setLuJusquauBout] = useState(false)
  const [coche, setCoche] = useState(false)
  const texte = useRef<HTMLDivElement>(null)

  const en = langue() === 'en'

  function auDefilement(): void {
    const zone = texte.current
    if (!zone) return
    // Une marge de quelques pixels : sur certains écrans, le défilement
    // n'atteint jamais le dernier pixel exactement, et la case resterait
    // grisée sans qu'on comprenne pourquoi.
    const enBas = zone.scrollTop + zone.clientHeight >= zone.scrollHeight - 12
    if (enBas) setLuJusquauBout(true)
  }

  /**
   * **Un texte qui tient sans défiler est un texte déjà lu.**
   *
   * Sinon l'écran devient un piège dont on ne sort pas : il n'y a rien à faire
   * défiler, `onScroll` ne se déclenche jamais, et la case reste grise pour
   * toujours — l'application ne démarre plus. Cela arrive sur un très grand
   * écran, et cela arrivait dans Scenika dès que la feuille de style manquait :
   * bug réel, trouvé en lançant l'application, pas en la relisant.
   */
  useEffect(() => {
    const zone = texte.current
    if (!zone) return
    if (zone.scrollHeight <= zone.clientHeight + 12) setLuJusquauBout(true)
  }, [])

  return (
    <div className="conditions-ecran">
      <div className="conditions-carte">
        <h1>{t('conditions.titre')}</h1>
        <p className="discret">
          {t('conditions.version', { version: VERSION_CONDITIONS })}
        </p>

        <div className="conditions-texte" ref={texte} onScroll={auDefilement}>
          {CONDITIONS_UTILISATION.map((section) => (
            <section key={section.titre.fr}>
              <h2>{en ? section.titre.en : section.titre.fr}</h2>
              {section.paragraphes.map((paragraphe, index) => (
                <p key={index}>{en ? paragraphe.en : paragraphe.fr}</p>
              ))}
            </section>
          ))}
        </div>

        <p className="avertissement">{en ? RESUME_CONDITIONS.en : RESUME_CONDITIONS.fr}</p>

        {!luJusquauBout && <p className="discret">{t('conditions.defilerJusquauBout')}</p>}

        <label className="conditions-case">
          <input
            type="checkbox"
            checked={coche}
            disabled={!luJusquauBout}
            onChange={(e) => setCoche(e.target.checked)}
          />
          {t('conditions.jaiLu')}
        </label>

        <div className="barre-boutons">
          <button disabled={!coche} onClick={onAccepter}>
            {t('conditions.accepter')}
          </button>
          <a
            className="discret"
            href={en ? URL_CONDITIONS_EN : URL_CONDITIONS}
            target="_blank"
            rel="noreferrer"
          >
            {t('conditions.lireSurLeSite')}
          </a>
        </div>
      </div>
    </div>
  )
}
