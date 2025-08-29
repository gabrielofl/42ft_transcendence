// EventBus - Sistema de eventos desacoplado para WebSocket

import { GameEvent } from '../types/websocket';

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Suscribe un callback a un tipo de evento específico
   * @param eventType - Tipo de evento a escuchar
   * @param callback - Función a ejecutar cuando ocurra el evento
   */
  public subscribe(eventType: string, callback: Function): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  /**
   * Desuscribe un callback de un tipo de evento
   * @param eventType - Tipo de evento
   * @param callback - Función a desuscribir
   */
  public unsubscribe(eventType: string, callback: Function): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Publica un evento a todos los suscriptores
   * @param event - Evento a publicar
   */
  public publish(event: GameEvent): void {
    const callbacks = this.listeners.get(event.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(event.payload);
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
      }
    });
  }

  /**
   * Publica un evento simple (crea el objeto GameEvent automáticamente)
   * @param eventType - Tipo de evento
   * @param payload - Datos del evento
   */
  public publishSimple(eventType: string, payload: any): void {
    const event: GameEvent = {
      type: eventType,
      payload,
      timestamp: Date.now()
    };
    this.publish(event);
  }

  /**
   * Limpia todos los listeners
   */
  public clear(): void {
    this.listeners.clear();
  }

  /**
   * Obtiene el número de listeners para un tipo de evento
   * @param eventType - Tipo de evento
   */
  public getListenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.length || 0;
  }
}
