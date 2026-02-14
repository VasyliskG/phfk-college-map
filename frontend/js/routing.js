/**
 * Модуль маршрутизації з підтримкою різних типів вузлів
 */

class RouteManager {
  constructor() {
    this.routeFrom = document.getElementById('route-from');
    this.routeTo = document.getElementById('route-to');
    this.buildBtn = document.getElementById('build-route-btn');
    this.clearBtn = document.getElementById('clear-route-btn');
    this.routeInfo = document.getElementById('route-info');
    this.currentRoute = null;
    this.onRouteBuiltCallback = null;

    this.init();
  }

  init() {
    this.buildBtn.addEventListener('click', () => this.buildRoute());
    this.clearBtn.addEventListener('click', () => this.clearRoute());
  }

  async populateRoomSelects(rooms) {
    // Тільки кімнати та важливі точки для вибору
    const options = rooms
    .sort((a, b) => a.roomId.localeCompare(b.roomId))
    .map(room =>
        `<option value="${room.nodeId}">${room.label} (${room.floor} пов.)</option>`
    ).join('');

    // Додаємо спеціальні точки (вхід, сходи)
    const specialOptions = `
      <optgroup label="Спеціальні точки">
        <option value="entrance">🚪 Головний вхід (1 пов.)</option>
        <option value="stairs_1">🪜 Сходи 1 (1 пов.)</option>
        <option value="stairs_2">🪜 Сходи 2 (1 пов.)</option>
      </optgroup>
    `;

    const roomOptions = `<optgroup label="Кімнати">${options}</optgroup>`;

    this.routeFrom.innerHTML = '<option value="">-- Звідки --</option>' + specialOptions + roomOptions;
    this.routeTo.innerHTML = '<option value="">-- Куди --</option>' + specialOptions + roomOptions;
  }

  async buildRoute() {
    const from = this.routeFrom.value;
    const to = this.routeTo.value;

    if (!from || !to) {
      alert('⚠️ Оберіть початкову та кінцеву точки');
      return;
    }

    if (from === to) {
      alert('⚠️ Початкова та кінцева точки не можуть бути однаковими');
      return;
    }

    // Показуємо індикатор завантаження
    this.buildBtn.disabled = true;
    this.buildBtn.textContent = '⏳ Будуємо маршрут...';

    const routeData = await API.getRoute(from, to);

    this.buildBtn.disabled = false;
    this.buildBtn.textContent = 'Побудувати маршрут';

    if (!routeData) {
      alert('❌ Не вдалося побудувати маршрут між цими точками');
      return;
    }

    this.currentRoute = routeData;
    this.displayRouteInfo(routeData);
    this.clearBtn.style.display = 'block';

    if (this.onRouteBuiltCallback) {
      this.onRouteBuiltCallback(routeData);
    }
  }

  displayRouteInfo(routeData) {
    const { path, distance } = routeData;

    // Підрахунок кроків по типах вузлів
    const graphData = window.mapRenderer?.graphData;
    let doorCount = 0;
    let stairsCount = 0;

    if (graphData) {
      path.forEach(nodeId => {
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (node) {
          if (node.type === 'door') doorCount++;
          if (node.type === 'stairs') stairsCount++;
        }
      });
    }

    this.routeInfo.innerHTML = `
      <div style="background: #E3F2FD; padding: 12px; border-radius: 6px; border-left: 4px solid #2196F3;">
        <strong style="color: #1976D2;">📍 Маршрут побудовано</strong><br>
        <div style="margin-top: 8px; font-size: 13px; color: #555;">
          📏 Відстань: <strong>${distance} м</strong><br>
          🚶 Точок маршруту: <strong>${path.length}</strong><br>
          ${doorCount > 0 ? `🚪 Дверей: <strong>${doorCount}</strong><br>` : ''}
          ${stairsCount > 0 ? `🪜 Сходів: <strong>${stairsCount}</strong><br>` : ''}
        </div>
      </div>
    `;

    this.routeInfo.classList.add('show');
  }

  clearRoute() {
    this.currentRoute = null;
    this.routeInfo.innerHTML = '';
    this.routeInfo.classList.remove('show');
    this.clearBtn.style.display = 'none';
    this.routeFrom.value = '';
    this.routeTo.value = '';

    if (this.onRouteBuiltCallback) {
      this.onRouteBuiltCallback(null);
    }
  }

  onRouteBuilt(callback) {
    this.onRouteBuiltCallback = callback;
  }
}
