import { useEffect } from 'react'
import { useCavio } from '../store/store'

// Motor de simulación DEMO: avanza el estado cada segundo cuando está activo.
export function useSimulationEngine(): void {
  const { state, simulation } = useCavio()
  const running = state.simulation.running

  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => {
      simulation.tick()
    }, 1000)
    return () => window.clearInterval(interval)
  }, [running, simulation])
}
