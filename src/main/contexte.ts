import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Où vivent les données de l'application, et quelle version tourne.
 *
 * Renseigné une fois au démarrage par la couche Electron. Le reste du code
 * n'importe jamais Electron — même règle que dans Ohmnia et Scenika.
 *
 * Attention : Acustika est une **application à documents**. Ce dossier ne
 * contient pas les projets — un projet est un fichier que l'utilisateur range
 * où il veut. Il ne contient que ce qui appartient à l'application : la
 * bibliothèque d'enceintes.
 */
interface Contexte {
  dossierDonnees: string
  version: string
}

let contexte: Contexte | null = null

export function definirContexte(valeurs: Contexte): void {
  contexte = valeurs
}

export function dossierDonnees(): string {
  if (!contexte) {
    throw new Error("Le contexte d'exécution n'a pas été défini.")
  }
  if (!existsSync(contexte.dossierDonnees)) {
    mkdirSync(contexte.dossierDonnees, { recursive: true })
  }
  return contexte.dossierDonnees
}

export function versionApplication(): string {
  if (!contexte) throw new Error("Le contexte d'exécution n'a pas été défini.")
  return contexte.version
}

/** Fichier de la bibliothèque d'enceintes. Un seul endroit décide de son nom. */
export function cheminBibliotheque(): string {
  return join(dossierDonnees(), 'enceintes.json')
}
