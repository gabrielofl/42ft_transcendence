// Tournament Event Bus - Sistema de eventos internos para comunicación entre sistemas
// Permite comunicación desacoplada entre game manager y tournament system

/**
 * Event Bus singleton para manejar eventos de torneos
 * Permite que diferentes sistemas se comuniquen sin acoplamiento directo
 */
class TournamentEventBus {
  constructor() {
    this.listeners = new Map();
    console.log('🎯 Tournament Event Bus initialized');
  }
  
  /**
   * Emite un evento a todos los listeners registrados
   * @param {string} event - Nombre del evento
   * @param {any} data - Datos del evento
   */
  emit(event, data) {
    const handlers = this.listeners.get(event) || [];
    console.log(`📡 Emitting event '${event}' to ${handlers.length} listeners:`, data);
    
    handlers.forEach((handler, index) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`❌ Error in event handler ${index} for event '${event}':`, error);
      }
    });
  }
  
  /**
   * Registra un listener para un evento específico
   * @param {string} event - Nombre del evento
   * @param {function} handler - Función que maneja el evento
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    console.log(`👂 Registered listener for event '${event}' (total: ${this.listeners.get(event).length})`);
  }
  
  /**
   * Remueve un listener específico
   * @param {string} event - Nombre del evento
   * @param {function} handler - Función a remover
   */
  off(event, handler) {
    const handlers = this.listeners.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      console.log(`🔇 Removed listener for event '${event}' (remaining: ${handlers.length})`);
    }
  }
  
  /**
   * Remueve todos los listeners de un evento
   * @param {string} event - Nombre del evento
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
      console.log(`🧹 Removed all listeners for event '${event}'`);
    } else {
      this.listeners.clear();
      console.log('🧹 Removed all listeners from event bus');
    }
  }
  
  /**
   * Obtiene información de debug sobre el estado del event bus
   */
  getDebugInfo() {
    const info = {};
    for (const [event, handlers] of this.listeners.entries()) {
      info[event] = handlers.length;
    }
    return info;
  }
}

// Exportar instancia singleton
export const tournamentEventBus = new TournamentEventBus();

// Eventos disponibles:
// - 'matchResult': { tournamentId, matchId, winner, results }
// - 'tournamentUpdate': { tournamentId, updateType, data }
// - 'bracketUpdate': { tournamentId, bracket }
