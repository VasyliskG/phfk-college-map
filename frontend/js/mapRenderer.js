/**
 * Рендерер карти на основі Leaflet
 * Підтримка типів вузлів: waypoint, door, room, stairs, entrance
 */

class MapRenderer {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.currentFloor = 1;
    this.markers = {};
    this.routeLayer = null;
    this.graphData = null;
    this.roomsData = null;
    this.floorImageLayers = {};

    // Розміри зображення
    this.imageWidth = 2048;
    this.imageHeight = 512;
    this.imageOffsetY = 500;

    // Налаштування відображення різних типів вузлі��
    this.nodeStyles = {
      waypoint: {
        radius: 4,
        color: '#9E9E9E',
        fillColor: '#BDBDBD',
        fillOpacity: 0.6,
        showLabel: false
      },
      door: {
        radius: 6,
        color: '#FF9800',
        fillColor: '#FFB74D',
        fillOpacity: 0.8,
        showLabel: true,
        icon: '🚪'
      },
      room: {
        radius: 10,
        color: '#2196F3',
        fillColor: '#64B5F6',
        fillOpacity: 0.9,
        showLabel: true,
        icon: '📍'
      },
      stairs: {
        radius: 12,
        color: '#F44336',
        fillColor: '#EF5350',
        fillOpacity: 0.9,
        showLabel: true,
        icon: '🪜'
      },
      entrance: {
        radius: 14,
        color: '#4CAF50',
        fillColor: '#66BB6A',
        fillOpacity: 1,
        showLabel: true,
        icon: '🚪',
        pulse: true
      }
    };

    this.init();
  }

  init() {
    // Initialize the Leaflet map with bounds viscosity to prevent panning outside the floor image
    this.map = L.map(this.containerId, {
      crs: L.CRS.Simple,
      minZoom: -3,
      maxZoom: 2,
      zoomControl: true,
      attributionControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      // Prevent the user from panning the map too far from the image
      maxBoundsViscosity: 1.0
    });

    const bounds = [
      [-this.imageOffsetY, 0],
      [this.imageHeight - this.imageOffsetY, this.imageWidth]
    ];

    // Fit the map to the floor image bounds and then restrict panning to those bounds
    this.map.fitBounds(bounds, { padding: [20, 20] });

    // Центруємо на вході (or center of image) with a comfortable zoom
    const centerLat = (bounds[0][0] + bounds[1][0]) / 2;
    const centerLng = (bounds[0][1] + bounds[1][1]) / 2;
    this.map.setView([this.imageHeight * 0.2 - this.imageOffsetY || centerLat, this.imageWidth / 2 || centerLng], -1);

    // Restrict map panning to the image area so the UI stays tidy
    this.map.setMaxBounds(bounds);

    console.log('✅ Leaflet map initialized');
    console.log(`📐 Image: ${this.imageWidth}x${this.imageHeight}, Offset: ${this.imageOffsetY}px`);
  }

  async loadData() {
    this.graphData = await API.getGraph();
    this.roomsData = await API.getRooms();

    console.log('📊 Graph loaded:', this.graphData.nodes.length, 'nodes');
    console.log('🏠 Rooms loaded:', this.roomsData.rooms?.length || 0, 'rooms');

    this.loadFloorImages();
    this.renderFloor(this.currentFloor);
  }

  loadFloorImages() {
    const imageBounds = [
      [-this.imageOffsetY, 0],
      [this.imageHeight - this.imageOffsetY, this.imageWidth]
    ];

    for (let floor = 1; floor <= 4; floor++) {
      const imageUrl = `images/floors/floor-${floor}.webp`;

      const imageLayer = L.imageOverlay(imageUrl, imageBounds, {
        opacity: 1,
        interactive: false,
        errorOverlayUrl: this.createPlaceholderImage(floor)
      });

      this.floorImageLayers[floor] = imageLayer;
    }
  }

  createPlaceholderImage(floor) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${this.imageWidth}" height="${this.imageHeight}">
        <rect width="${this.imageWidth}" height="${this.imageHeight}" fill="#f5f5f5"/>
        <text x="${this.imageWidth/2}" y="100" 
              font-family="Arial" font-size="32" fill="#999" text-anchor="middle">
          Поверх ${floor}
        </text>
        <text x="${this.imageWidth/2}" y="140" 
              font-family="Arial" font-size="16" fill="#ccc" text-anchor="middle">
          ${this.imageWidth}×${this.imageHeight}
        </text>
        <rect x="${this.imageWidth/2 - 80}" y="${this.imageHeight - 100}" 
              width="160" height="60" fill="#4CAF50" stroke="#2E7D32" stroke-width="3"/>
        <text x="${this.imageWidth/2}" y="${this.imageHeight - 65}" 
              font-family="Arial" font-size="24" fill="white" font-weight="bold" text-anchor="middle">
          🚪 ВХІД
        </text>
      </svg>
    `;

    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  renderFloor(floorNumber) {
    this.currentFloor = floorNumber;
    this.clearMarkers();
    this.hideAllFloorImages();

    if (this.floorImageLayers[floorNumber]) {
      this.floorImageLayers[floorNumber].addTo(this.map);
    }

    // Фільтруємо вузли за поверхом
    const floorNodes = this.graphData.nodes.filter(node => node.floor === floorNumber);

    console.log(`🏢 Floor ${floorNumber}: ${floorNodes.length} nodes`);

    // Групуємо вузли за типом
    const nodesByType = {
      waypoint: [],
      door: [],
      room: [],
      stairs: [],
      entrance: []
    };

    floorNodes.forEach(node => {
      const type = node.type || 'waypoint';
      if (nodesByType[type]) {
        nodesByType[type].push(node);
      }
    });

    // Відображаємо вузли в порядку: waypoints → doors → rooms → stairs → entrance
    Object.keys(nodesByType).forEach(type => {
      nodesByType[type].forEach(node => {
        const invertedY = this.imageHeight - node.y - this.imageOffsetY;
        const marker = this.createMarker(node, invertedY);
        this.markers[node.id] = marker;
      });
    });

    console.log('📍 Rendered:',
        `${nodesByType.room.length} rooms, `,
        `${nodesByType.door.length} doors, `,
        `${nodesByType.stairs.length} stairs, `,
        `${nodesByType.entrance.length} entrances`
    );
  }

  hideAllFloorImages() {
    Object.values(this.floorImageLayers).forEach(layer => {
      if (this.map.hasLayer(layer)) {
        this.map.removeLayer(layer);
      }
    });
  }

  createMarker(node, invertedY) {
    const type = node.type || 'waypoint';
    const style = this.nodeStyles[type];

    if (!style) {
      console.warn(`Unknown node type: ${type}`);
      return;
    }

    // Створюємо маркер відповідно до типу
    let marker;

    if (style.showLabel) {
      // Маркер з іконкою для важливих точок
      const iconHtml = `
        <div style="
          width: ${style.radius * 2}px; 
          height: ${style.radius * 2}px;
          background: ${style.fillColor};
          border: 2px solid ${style.color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${style.radius}px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ${style.pulse ? 'animation: pulse 2s infinite;' : ''}
        ">
          ${style.icon || ''}
        </div>
      `;

      const icon = L.divIcon({
        className: `node-marker node-${type}`,
        html: iconHtml,
        iconSize: [style.radius * 2, style.radius * 2]
      });

      marker = L.marker([invertedY, node.x], { icon }).addTo(this.map);
    } else {
      // Простий кружечок для waypoints
      marker = L.circleMarker([invertedY, node.x], {
        radius: style.radius,
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        weight: 1
      }).addTo(this.map);
    }

    // Popup з інформацією
    const roomInfo = this.getRoomInfoByNodeId(node.id);

    marker.bindPopup(`
      <div style="min-width: 150px;">
        <strong>${this.getNodeDisplayName(node)}</strong><br>
        <small style="color: #666;">
          ID: ${node.id}<br>
          Тип: ${this.getTypeLabel(type)}<br>
          Поверх: ${node.floor}<br>
          Координати: (${node.x}, ${node.y})
          ${roomInfo ? `<br><br><strong>${roomInfo.label}</strong>` : ''}
        </small>
      </div>
    `);

    marker.on('click', () => {
      console.log(`📍 Clicked:`, node);
    });

    return marker;
  }

  getNodeDisplayName(node) {
    const roomInfo = this.getRoomInfoByNodeId(node.id);
    if (roomInfo) {
      return roomInfo.label;
    }

    // Генеруємо назву на основі ID
    if (node.id.startsWith('node_')) {
      return `Кімната ${node.id.replace('node_', '')}`;
    }
    if (node.id.startsWith('d')) {
      return `Двері ${node.id.replace('d', '')}`;
    }
    if (node.id === 'entrance') {
      return 'Головний вхід';
    }
    if (node.id.startsWith('stairs_')) {
      return `Сходи ${node.id.replace('stairs_', '')}`;
    }

    return node.id;
  }

  getRoomInfoByNodeId(nodeId) {
    if (!this.roomsData || !this.roomsData.rooms) return null;
    return this.roomsData.rooms.find(room => room.nodeId === nodeId);
  }

  getTypeLabel(type) {
    const labels = {
      waypoint: 'Точка переходу',
      door: 'Двері',
      room: 'Кімната',
      stairs: 'Сходи',
      entrance: 'Вхід'
    };
    return labels[type] || type;
  }

  highlightRoom(nodeId) {
    const node = this.graphData.nodes.find(n => n.id === nodeId);
    if (!node) {
      console.warn(`Node ${nodeId} not found`);
      return;
    }

    if (node.floor !== this.currentFloor) {
      this.switchFloor(node.floor);
    }

    const marker = this.markers[nodeId];
    if (marker) {
      marker.openPopup();
      const invertedY = this.imageHeight - node.y - this.imageOffsetY;
      this.map.setView([invertedY, node.x], 0);
    }
  }

  drawRoute(routeData) {
    this.clearRoute();

    if (!routeData || !routeData.path) return;

    const { path } = routeData;

    const routeCoords = path
    .map(nodeId => {
      const node = this.graphData.nodes.find(n => n.id === nodeId);
      if (!node) return null;

      const invertedY = this.imageHeight - node.y - this.imageOffsetY;
      return [invertedY, node.x, node.floor, node.type];
    })
    .filter(coord => coord !== null);

    const currentFloorCoords = routeCoords
    .filter(coord => coord[2] === this.currentFloor)
    .map(coord => [coord[0], coord[1]]);

    if (currentFloorCoords.length > 1) {
      this.routeLayer = L.polyline(currentFloorCoords, {
        color: '#2196F3',
        weight: 6,
        opacity: 0.8,
        smoothFactor: 1,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '10, 5'
      }).addTo(this.map);

      this.addRouteArrows(currentFloorCoords);

      // Підсвічуємо початкову та кінцеву точки
      this.highlightRouteEndpoints(routeCoords);

      this.map.fitBounds(this.routeLayer.getBounds(), { padding: [50, 50] });

      console.log('🗺️ Route drawn:', currentFloorCoords.length, 'points on floor', this.currentFloor);
    }

    const floors = [...new Set(routeCoords.map(c => c[2]))];
    if (floors.length > 1) {
      this.showMultiFloorWarning(floors);
    }
  }

  highlightRouteEndpoints(routeCoords) {
    if (routeCoords.length < 2) return;

    const start = routeCoords[0];
    const end = routeCoords[routeCoords.length - 1];

    // Маркер старту
    if (start[2] === this.currentFloor) {
      const startIcon = L.divIcon({
        className: 'route-endpoint',
        html: '<div style="background: #4CAF50; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">A</div>',
        iconSize: [24, 24]
      });
      L.marker([start[0], start[1]], { icon: startIcon }).addTo(this.map);
    }

    // Маркер фінішу
    if (end[2] === this.currentFloor) {
      const endIcon = L.divIcon({
        className: 'route-endpoint',
        html: '<div style="background: #F44336; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">B</div>',
        iconSize: [24, 24]
      });
      L.marker([end[0], end[1]], { icon: endIcon }).addTo(this.map);
    }
  }

  addRouteArrows(coords) {
    if (coords.length < 2) return;

    for (let i = 1; i < coords.length; i += 3) {
      const start = coords[i - 1];
      const end = coords[i];

      const midLat = (start[0] + end[0]) / 2;
      const midLng = (start[1] + end[1]) / 2;

      const angle = Math.atan2(end[0] - start[0], end[1] - start[1]) * 180 / Math.PI;

      const arrowIcon = L.divIcon({
        className: 'route-arrow',
        html: `<div style="transform: rotate(${angle}deg); color: #2196F3; font-size: 18px; text-shadow: 0 0 3px white;">▲</div>`,
        iconSize: [20, 20]
      });

      L.marker([midLat, midLng], { icon: arrowIcon }).addTo(this.map);
    }
  }

  showMultiFloorWarning(floors) {
    const routeInfo = document.getElementById('route-info');
    const warning = document.createElement('div');
    warning.className = 'multi-floor-warning';
    warning.innerHTML = `
      ⚠️ Маршрут через ${floors.length} поверхи: ${floors.join(', ')}<br>
      <small>Перемкніть поверх щоб побачити весь маршрут</small>
    `;
    routeInfo.appendChild(warning);
  }

  clearRoute() {
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }

    // Видаляємо стрілки та endpoints
    this.map.eachLayer(layer => {
      if (layer.options && layer.options.icon) {
        const className = layer.options.icon.options.className;
        if (className === 'route-arrow' || className === 'route-endpoint') {
          this.map.removeLayer(layer);
        }
      }
    });

    // Очищаємо попередження
    const warnings = document.querySelectorAll('.multi-floor-warning');
    warnings.forEach(w => w.remove());
  }

  clearMarkers() {
    Object.values(this.markers).forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.markers = {};
  }

  switchFloor(floorNumber) {
    this.renderFloor(floorNumber);

    const routeManager = window.routeManager;
    if (routeManager && routeManager.currentRoute) {
      this.drawRoute(routeManager.currentRoute);
    }
  }
}
