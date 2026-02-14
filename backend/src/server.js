const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Завантаження даних
const roomsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'rooms.json'), 'utf-8')
);
const graphData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'graph.json'), 'utf-8')
);

// ============================================
// API Endpoints
// ============================================

/**
 * GET /api/rooms
 * Повертає спи��ок всіх кімнат
 */
app.get('/api/rooms', (req, res) => {
  res.json(roomsData);
});

/**
 * GET /api/rooms/:id
 * Повертає конкретну кімнату за ID
 */
app.get('/api/rooms/:id', (req, res) => {
  const room = roomsData.rooms.find(r => r.roomId === req.params.id);
  if (room) {
    res.json(room);
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

/**
 * GET /api/graph
 * Повертає граф для маршрутизації
 */
app.get('/api/graph', (req, res) => {
  res.json(graphData);
});

/**
 * GET /api/search?q=query
 * Пошук кімнат за назвою або аліасами
 */
app.get('/api/search', (req, res) => {
  const query = req.query.q?.toLowerCase() || '';

  if (!query) {
    return res.json({ results: [] });
  }

  const results = roomsData.rooms.filter(room => {
    // Шукаємо в label
    if (room.label.toLowerCase().includes(query)) return true;

    // Шукаємо в aliases
    if (room.aliases.some(alias => alias.toLowerCase().includes(query))) return true;

    // Шукаємо за roomId
    if (room.roomId.toLowerCase().includes(query)) return true;

    return false;
  });

  res.json({
    results,
    query,
    count: results.length
  });
});

/**
 * GET /api/route?from=node1&to=node2
 * Обчислює найкоротший шлях між двома вузлами
 */
app.get('/api/route', (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      error: 'Missing parameters: from and to are required'
    });
  }

  // Перевіряємо чи існують вузли
  const fromNode = graphData.nodes.find(n => n.id === from);
  const toNode = graphData.nodes.find(n => n.id === to);

  if (!fromNode || !toNode) {
    return res.status(404).json({
      error: 'One or both nodes not found'
    });
  }

  // Виконуємо алгоритм Дейкстри
  const path = dijkstra(graphData, from, to);

  if (!path) {
    return res.status(404).json({
      error: 'No route found between these points'
    });
  }

  res.json({
    from,
    to,
    path,
    distance: calculatePathDistance(graphData, path)
  });
});

// ============================================
// Алгоритм Дейкстри
// ============================================

function dijkstra(graph, startId, endId) {
  const distances = {};
  const previous = {};
  const unvisited = new Set();

  // Ініціалізація
  graph.nodes.forEach(node => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  });
  distances[startId] = 0;

  // Побудова списку суміжності
  const adjacency = buildAdjacencyList(graph);

  while (unvisited.size > 0) {
    // Знаходимо вузол з найменшою відстанню
    let current = null;
    let minDistance = Infinity;

    unvisited.forEach(nodeId => {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        current = nodeId;
      }
    });

    if (current === null || current === endId) break;

    unvisited.delete(current);

    // Оновлюємо відстані до сусідів
    const neighbors = adjacency[current] || [];
    neighbors.forEach(({ to, weight }) => {
      if (unvisited.has(to)) {
        const newDistance = distances[current] + weight;
        if (newDistance < distances[to]) {
          distances[to] = newDistance;
          previous[to] = current;
        }
      }
    });
  }

  // Відновлюємо шлях
  if (distances[endId] === Infinity) return null;

  const path = [];
  let current = endId;
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  return path;
}

function buildAdjacencyList(graph) {
  const adjacency = {};

  graph.edges.forEach(edge => {
    // Прямий напрямок
    if (!adjacency[edge.from]) adjacency[edge.from] = [];
    adjacency[edge.from].push({ to: edge.to, weight: edge.weight });

    // Зворотній напрямок (граф неорієнтований)
    if (!adjacency[edge.to]) adjacency[edge.to] = [];
    adjacency[edge.to].push({ to: edge.from, weight: edge.weight });
  });

  return adjacency;
}

function calculatePathDistance(graph, path) {
  let totalDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const edge = graph.edges.find(
        e => (e.from === path[i] && e.to === path[i + 1]) ||
            (e.to === path[i] && e.from === path[i + 1])
    );
    if (edge) totalDistance += edge.weight;
  }

  return totalDistance;
}

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET /api/rooms`);
  console.log(`   GET /api/rooms/:id`);
  console.log(`   GET /api/graph`);
  console.log(`   GET /api/search?q=query`);
  console.log(`   GET /api/route?from=node1&to=node2`);
});
