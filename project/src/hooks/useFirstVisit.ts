import { useState } from 'react'

/**
 * Set a nivel de módulo — persiste mientras el módulo JS esté cargado
 * (toda la sesión de la app), pero se resetea al recargar/cerrar.
 */
const _visited = new Set<string>()

/**
 * Devuelve true solo la primera vez que se visita una página en la sesión.
 * Las visitas posteriores (navegar de vuelta) devuelven false,
 * lo que permite saltar animaciones de entrada.
 */
export function useFirstVisit(key: string): boolean {
  const [isFirst] = useState(() => {
    if (_visited.has(key)) return false
    _visited.add(key)
    return true
  })
  return isFirst
}
