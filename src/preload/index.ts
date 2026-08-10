import { contextBridge, ipcRenderer } from 'electron'
import type { ModeleEnceinte, Projet, ProjetOuvert } from '../partage/types'

/** Le pont sécurisé : seule porte entre l'interface et le système. */
const api = {
  bibliotheque: {
    lister: (): Promise<ModeleEnceinte[]> => ipcRenderer.invoke('bibliotheque:lister'),
    ajouter: (enceinte: Omit<ModeleEnceinte, 'id'>): Promise<ModeleEnceinte> =>
      ipcRenderer.invoke('bibliotheque:ajouter', enceinte),
    modifier: (enceinte: ModeleEnceinte): Promise<ModeleEnceinte> =>
      ipcRenderer.invoke('bibliotheque:modifier', enceinte),
    supprimer: (id: string): Promise<void> => ipcRenderer.invoke('bibliotheque:supprimer', id),
    importerCsv: (): Promise<{ ajoutees: number; erreurs: string[] } | null> =>
      ipcRenderer.invoke('bibliotheque:importerCsv'),
    importerPolaire: (): Promise<{
      nom: string
      ouverture: Record<number, number>
      avertissements: string[]
    } | null> => ipcRenderer.invoke('bibliotheque:importerPolaire')
  },

  projet: {
    nouveau: (): Promise<Projet> => ipcRenderer.invoke('projet:nouveau'),
    ouvrir: (): Promise<ProjetOuvert | null> => ipcRenderer.invoke('projet:ouvrir'),
    enregistrer: (
      projet: Projet,
      chemin: string | null
    ): Promise<{ chemin: string; nom: string } | null> =>
      ipcRenderer.invoke('projet:enregistrer', projet, chemin)
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
