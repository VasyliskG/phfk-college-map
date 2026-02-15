/**
 * Модуль пошуку кімнат
 */

class SearchManager {
  constructor() {
    this.searchInput = document.getElementById('search-input');
    this.searchResults = document.getElementById('search-results');
    this.onSelectCallback = null;

    this.init();
  }

  init() {
    // Debounce для пошуку (затримка 300мс)
    let timeout;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      const query = e.target.value.trim();

      if (query.length < 2) {
        this.hideResults();
        return;
      }

      timeout = setTimeout(() => this.performSearch(query), 300);
    });

    // Закрити результати при кліку поза ними
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.searchResults.contains(e.target)) {
        this.hideResults();
      }
    });
  }

  async performSearch(query) {
    const data = await API.searchRooms(query);
    this.displayResults(data.results);
  }

  displayResults(results) {
    if (results.length === 0) {
      this.searchResults.innerHTML = '<div class="search-result-item">Нічого не знайдено</div>';
      this.showResults();
      return;
    }

    this.searchResults.innerHTML = results.map(room => `
      <div class="search-result-item" data-room-id="${room.roomId}" data-node-id="${room.nodeId}">
        <div class="result-left">
          <div class="result-label">${room.label}</div>
          <div class="result-meta">${room.roomId} • ${room.floor} поверх • ${room.type}</div>
        </div>
        <div class="result-actions">
          <button class="route-to-btn" data-node-id="${room.nodeId}" title="Прокласти маршрут сюди">Прокласти</button>
        </div>
      </div>
    `).join('');

    // Додати обробники кліків
    this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const roomId = item.dataset.roomId;
        const nodeId = item.dataset.nodeId;
        this.selectRoom(roomId, nodeId);
        this.hideResults();
        this.searchInput.value = item.querySelector('.result-label').textContent;
      });
    });

    // Route buttons
    this.searchResults.querySelectorAll('.route-to-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent the parent click
        const nodeId = btn.dataset.nodeId;
        // If a RouteManager exists, use its helper to go to room
        if (window.routeManager && typeof window.routeManager.goToRoom === 'function') {
          window.routeManager.goToRoom(nodeId);
          this.hideResults();
          this.searchInput.value = btn.closest('.search-result-item').querySelector('.result-label').textContent;
        } else {
          // Fallback: select room
          const roomItem = btn.closest('.search-result-item');
          const roomId = roomItem.dataset.roomId;
          this.selectRoom(roomId, nodeId);
        }
      });
    });

    this.showResults();
  }

  selectRoom(roomId, nodeId) {
    if (this.onSelectCallback) {
      this.onSelectCallback(roomId, nodeId);
    }
  }

  onSelect(callback) {
    this.onSelectCallback = callback;
  }

  showResults() {
    this.searchResults.classList.add('show');
  }

  hideResults() {
    this.searchResults.classList.remove('show');
  }
}
