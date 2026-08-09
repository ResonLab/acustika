import { app, dialog, ipcMain } from 'electron'
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
