/**
 * API клієнт для взаємодії з backend
 */

const API_BASE_URL = (() => {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }

  // Production
  return 'https://api.phfk-college-map.website/api';
})();

const API = {
  /**
   * Отримати всі кімнати
   */
  async getRooms() {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`);
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return await response.json();
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return { rooms: [] };
    }
  },

  /**
   * Отримати кімнату за ID
   */
  async getRoom(roomId) {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`);
      if (!response.ok) throw new Error('Room not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching room:', error);
      return null;
    }
  },

  /**
   * Отримати граф для маршрутизації
   */
  async getGraph() {
    try {
      const response = await fetch(`${API_BASE_URL}/graph`);
      if (!response.ok) throw new Error('Failed to fetch graph');
      return await response.json();
    } catch (error) {
      console.error('Error fetching graph:', error);
      return { nodes: [], edges: [] };
    }
  },

  /**
   * Пошук кімнат
   */
  async searchRooms(query) {
    try {
      const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (error) {
      console.error('Error searching rooms:', error);
      return { results: [], count: 0 };
    }
  },

  /**
   * Побудувати маршрут
   */
  async getRoute(fromNodeId, toNodeId) {
    try {
      const response = await fetch(`${API_BASE_URL}/route?from=${fromNodeId}&to=${toNodeId}`);
      if (!response.ok) throw new Error('Route not found');
      return await response.json();
    } catch (error) {
      console.error('Error getting route:', error);
      return null;
    }
  }
};
