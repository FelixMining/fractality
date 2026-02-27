/**
 * Signal de création : permet au bouton + de la navbar d'ouvrir directement
 * le formulaire de création au prochain montage de la page cible.
 */

let _shouldCreate = false

export function signalCreate(): void {
  _shouldCreate = true
}

export function consumeCreate(): boolean {
  if (_shouldCreate) {
    _shouldCreate = false
    return true
  }
  return false
}
