import { app, dialog, ipcMain } from 'electron'
import { lireDonneesPolaires } from '../../../commun/polaire.js'
import {
  ouverturesParBande,
  frequencesSupposees,
  repartirSurBandes,
  typeDeFichier
} from '../../../commun/clf.js'
import { BANDES_OCTAVE } from '../../../commun/acoustique.js'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import {
  ajouterEnceinte,
  importerCsv,
  listerEnceintes,
  modifierEnceinte,
  supprimerEnceinte
} from '../domaines/bibliotheque'
import { ecrireProjet, lireProjet, projetVide } from '../domaines/projet'
import type { ModeleEnceinte, Projet, ProjetOuvert } from '../../partage/types'

/**
 * Branchement sur la fenêtre. **Aucune logique ici** : elle vit dans
 * `../domaines/`. Ne restent que les boîtes de dialogue, qui ont besoin
 * d'Electron et qui n'ont de sens que sur le poste de l'utilisateur.
 */

const FILTRE_PROJET = { name: 'Projet Acustika', extensions: ['acustika'] }

export function enregistrerHandlers(): void {
  ipcMain.handle('bibliotheque:lister', () => listerEnceintes())

  ipcMain.handle('bibliotheque:ajouter', (_e, enceinte: Omit<ModeleEnceinte, 'id'>) =>
    ajouterEnceinte(enceinte)
  )

  ipcMain.handle('bibliotheque:modifier', (_e, enceinte: ModeleEnceinte) =>
    modifierEnceinte(enceinte)
  )

  ipcMain.handle('bibliotheque:supprimer', (_e, id: string) => supprimerEnceinte(id))

  ipcMain.handle('bibliotheque:importerCsv', async () => {
    const resultat = await dialog.showOpenDialog({
      title: 'Importer des enceintes depuis un CSV',
      filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }],
      properties: ['openFile']
    })
    if (resultat.canceled || resultat.filePaths.length === 0) return null
    return importerCsv(readFileSync(resultat.filePaths[0], 'utf-8'))
  })

  // L'import de données polaires : on lit le fichier ici, parce qu'ouvrir un
  // sélecteur n'a de sens que sur un poste. Le calcul, lui, vit dans
  // `commun/polaire.js` et `commun/clf.js`, avec leurs vérifications.
  //
  // **Le CLF binaire est lu depuis le 16 août 2026.** Le tri se fait sur le
  // premier octet — 0x40 pour CF1, 0x41 pour CF2 — et non sur l'extension :
  // un fichier renommé passerait sinon dans la mauvaise branche et rendrait
  // des nombres au hasard.
  ipcMain.handle('bibliotheque:importerPolaire', async () => {
    const resultat = await dialog.showOpenDialog({
      title: 'Importer des données polaires',
      filters: [
        { name: 'Données polaires', extensions: ['csv', 'txt', 'tsv', 'dat', 'cf1', 'cf2'] },
        { name: 'Tous les fichiers', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (resultat.canceled || resultat.filePaths.length === 0) return null

    const chemin = resultat.filePaths[0]
    const nom = basename(chemin).replace(/\.[^.]+$/, '')
    const brut = readFileSync(chemin)

    if (typeDeFichier(new Uint8Array(brut))) {
      const lu = ouverturesParBande(new Uint8Array(brut))
      const frequences = frequencesSupposees(lu.nombreBandes)

      const { ouverture, ignorees } = repartirSurBandes(
        lu.horizontales,
        frequences,
        BANDES_OCTAVE
      )

      // **Deux réserves, et aucune ne doit être noyée dans le succès.** Le
      // processus principal ne sait pas quelle langue la fenêtre affiche : ce
      // sont donc des clés, et la clé voyage avec ses valeurs en JSON.
      const avertissements = [
        // 1. Les fréquences ne sont pas dans le fichier. Les afficher sans le
        //    dire ferait passer une supposition pour une lecture.
        JSON.stringify({
          cle: 'clfBandesSupposees',
          premiere: frequences[0],
          derniere: frequences[frequences.length - 1]
        })
      ]

      // 2. Acustika ne modélise qu'une ouverture par bande, par un cône. Ce
      //    fichier en donne deux, et pour une colonne elles n'ont rien à voir —
      //    92° en horizontal contre 21° en vertical à 4 kHz sur la CLS-3300.
      //    Retenir l'horizontale sans le dire surestimerait la couverture
      //    verticale du tout au tout.
      const ecarts = lu.horizontales.map((h, i) => Math.abs(h - lu.verticales[i]))
      const ecartMax = Math.round(Math.max(...ecarts))
      if (ecartMax >= 20) {
        avertissements.push(JSON.stringify({ cle: 'clfHorizontaleRetenue', ecart: ecartMax }))
      }

      // 3. Acustika s'arrête à 8 kHz ; un CLF va souvent jusqu'à 16. Trouvé en
      //    lançant l'application : l'écran annonçait huit bandes lues et n'en
      //    affichait que sept, la dernière disparaissant sans un mot.
      if (ignorees.length > 0) {
        avertissements.push(
          JSON.stringify({ cle: 'clfBandesIgnorees', bandes: ignorees.join(', ') })
        )
      }

      return { nom, ouverture, avertissements }
    }

    const lecture = lireDonneesPolaires(brut.toString('utf-8'))
    return { nom, ouverture: lecture.ouverture, avertissements: lecture.avertissements }
  })

  ipcMain.handle('projet:nouveau', () => projetVide())

  ipcMain.handle('projet:ouvrir', async (): Promise<ProjetOuvert | null> => {
    const resultat = await dialog.showOpenDialog({
      title: 'Ouvrir un projet',
      filters: [FILTRE_PROJET],
      properties: ['openFile']
    })
    if (resultat.canceled || resultat.filePaths.length === 0) return null

    const chemin = resultat.filePaths[0]
    return { chemin, projet: lireProjet(chemin) }
  })

  ipcMain.handle('projet:enregistrer', async (_e, projet: Projet, chemin: string | null) => {
    let cible = chemin
    if (!cible) {
      const resultat = await dialog.showSaveDialog({
        title: 'Enregistrer le projet',
        defaultPath: join(app.getPath('documents'), `${projet.nom || 'projet'}.acustika`),
        filters: [FILTRE_PROJET]
      })
      if (resultat.canceled || !resultat.filePath) return null
      cible = resultat.filePath
    }

    ecrireProjet(cible, projet)
    return { chemin: cible, nom: basename(cible) }
  })
}
