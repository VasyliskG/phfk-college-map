/**
 * Головний файл додатку
 * Інтегрує всі модулі разом
 */

let mapRenderer;
let searchManager;
let routeManager;

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Starting PHFK College Map...');

  // Ініціалізація модулів
  mapRenderer = new MapRenderer('map');
  searchManager = new SearchManager();
  routeManager = new RouteManager();

  // Завантажити дані
  await mapRenderer.loadData();

  // Заповнити селекти для маршрутів
  const roomsData = await API.getRooms();
  await routeManager.populateRoomSelects(roomsData.rooms);

  // Налаштувати обробники подій
  setupFloorSwitcher();
  setupSearchHandler();
  setupRouteHandler();

  console.log('✅ Application ready');
});

/**
 * Налаштувати перемикач поверхів
 */
function setupFloorSwitcher() {
  const floorButtons = document.querySelectorAll('.floor-btn');

  floorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const floor = parseInt(btn.dataset.floor);

      // Оновити активну кнопку
      floorButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Перемкнути поверх на карті
      mapRenderer.switchFloor(floor);

      console.log('🏢 Switched to floor', floor);
    });
  });
}

/**
 * Налаштувати обробник пошуку
 */
function setupSearchHandler() {
  searchManager.onSelect((roomId, nodeId) => {
    console.log('🔍 Room selected:', roomId, nodeId);

    // Підсвітити кімнату на карті
    mapRenderer.highlightRoom(nodeId);

    // Показати інформацію про кімнату
    showRoomInfo(roomId);
  });
}

/**
 * Налаштувати обробник маршрутів
 */
function setupRouteHandler() {
  routeManager.onRouteBuilt((routeData) => {
    if (routeData) {
      console.log('🗺️ Route built:', routeData);
      mapRenderer.drawRoute(routeData);
    } else {
      console.log('🗑️ Route cleared');
      mapRenderer.clearRoute();
    }
  });
}

/**
 * Показати інформацію про кімнату
 */
async function showRoomInfo(roomId) {
  const room = await API.getRoom(roomId);
  if (!room) return;

  const roomInfoDiv = document.getElementById('room-info');
  roomInfoDiv.innerHTML = `
    <h3>${room.label}</h3>
    <p><strong>ID:</strong> ${room.roomId}</p>
    <p><strong>Поверх:</strong> ${room.floor}</p>
    <p><strong>Тип:</strong> ${room.type}</p>
    ${room.description ? `<p><strong>Опис:</strong> ${room.description}</p>` : ''}
  `;
  roomInfoDiv.style.display = 'block';
}
