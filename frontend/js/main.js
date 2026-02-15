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

  // Expose to window for other modules that reference window.routeManager / window.mapRenderer
  window.routeManager = routeManager;
  window.mapRenderer = mapRenderer;
  window.searchManager = searchManager;

  // Завантажити дані
  await mapRenderer.loadData();

  // Заповнити селекти для маршрутів
  const roomsData = await API.getRooms();
  await routeManager.populateRoomSelects(roomsData.rooms);

  // Налаштувати обробники подій
  setupFloorSwitcher();
  setupSearchHandler();
  setupRouteHandler();
  setupPopularButtons();
  // route panel toggle removed per layout changes

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
 * Додає кнопку для показу/приховування панелі побудови маршруту
 */
function setupRoutePanelToggle() {
  const routePanel = document.querySelector('.route-panel');
  if (!routePanel) return;

  // Create toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'toggle-route-panel-btn';
  toggleBtn.className = 'toggle-route-panel';
  toggleBtn.type = 'button';

  const hidden = localStorage.getItem('routePanelHidden') === 'true';
  toggleBtn.textContent = hidden ? 'Показати меню' : 'Приховати меню';

  // Insert button at the top of the route-panel
  routePanel.insertBefore(toggleBtn, routePanel.firstChild);

  if (hidden) {
    routePanel.classList.add('collapsed');
  }

  toggleBtn.addEventListener('click', () => {
    const isHidden = routePanel.classList.toggle('collapsed');
    localStorage.setItem('routePanelHidden', isHidden ? 'true' : 'false');
    toggleBtn.textContent = isHidden ? 'Показати меню' : 'Приховати меню';
  });
}

/**
 * Налаштувати кнопки "популярні" — натискання одразу будує маршрут від входу
 */
function setupPopularButtons() {
  const popularBtns = document.querySelectorAll('.popular-btn');
  if (!popularBtns || popularBtns.length === 0) return;

  popularBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const roomAttr = btn.dataset.room;
      if (!roomAttr) return;

      // Map popular keys to nodeIds (use node_1 as main entrance)
      let targetNodeId = null;
      if (roomAttr === '304') targetNodeId = 'node_304';
      else if (roomAttr === '327') targetNodeId = 'node_327';
      else if (roomAttr === 'library') targetNodeId = 'node_342';
      else if (roomAttr === 'director') targetNodeId = 'node_338a';
      else {
        // fallback: if numeric, try node_<room>
        if (/^\d+$/.test(roomAttr)) targetNodeId = `node_${roomAttr}`;
      }

      if (!targetNodeId) {
        alert('Не вдалося знайти цільову аудиторію для побудови маршруту.');
        return;
      }

      if (!window.routeManager) {
        alert('Менеджер маршрутів недоступний');
        return;
      }

      // Ensure selects are populated
      if (!window.routeManager.routeTo || window.routeManager.routeTo.options.length === 0) {
        const roomsData = await API.getRooms();
        await window.routeManager.populateRoomSelects(roomsData.rooms);
      }

      // Set 'from' to main entrance node_1 if present, otherwise leave as-is or pick first option
      const fromOptions = Array.from(window.routeManager.routeFrom.options).map(o => o.value);
      if (fromOptions.includes('node_1')) {
        window.routeManager.routeFrom.value = 'node_1';
      } else if (!window.routeManager.routeFrom.value && fromOptions.length > 0) {
        window.routeManager.routeFrom.value = fromOptions[0];
      }

      // Set destination and call buildRoute() to perform the same API request as the build button
      window.routeManager.routeTo.value = targetNodeId;
      try {
        window.routeManager.buildRoute();
      } catch (err) {
        console.error('Error building route from popular button', err);
        alert('Помилка при побудові маршруту');
      }
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
