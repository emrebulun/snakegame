import './style.css'

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRID_SIZE = 20;
const TILE_COUNT_X = 40;
const TILE_COUNT_Y = 30;
const CANVAS_WIDTH = GRID_SIZE * TILE_COUNT_X;
const CANVAS_HEIGHT = GRID_SIZE * TILE_COUNT_Y;
const GAME_SPEED = 100;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Game State
let snake = [];
let food = { x: 0, y: 0 };
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let score = 0;
let gameLoopId;
let lastTime = 0;
let isGameOver = false;
let particles = [];
let playerName = '';

// UI Elements
const scoreEl = document.getElementById('score');
const currentPlayerNameEl = document.getElementById('current-player-name');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score-value');
const restartBtn = document.getElementById('restart-btn');
const playerNameInput = document.getElementById('player-name');
const newRecordEl = document.getElementById('new-record');
const leaderboardListEl = document.getElementById('leaderboard-list');
const leaderboardListGameOverEl = document.getElementById('leaderboard-list-gameover');

// Leaderboard Management
function getLeaderboard() {
  const data = localStorage.getItem('snake-leaderboard');
  return data ? JSON.parse(data) : [];
}

function saveToLeaderboard(name, score) {
  const leaderboard = getLeaderboard();
  leaderboard.push({ name, score, date: new Date().toISOString() });
  leaderboard.sort((a, b) => b.score - a.score);
  // Keep top 10
  const top10 = leaderboard.slice(0, 10);
  localStorage.setItem('snake-leaderboard', JSON.stringify(top10));
  return top10;
}

function renderLeaderboard(containerEl) {
  const leaderboard = getLeaderboard();
  if (leaderboard.length === 0) {
    containerEl.innerHTML = '<p style="text-align: center; color: #64748b;">Henüz kayıt yok</p>';
    return;
  }

  containerEl.innerHTML = leaderboard.map((entry, index) => {
    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    return `
      <div class="leaderboard-item ${rankClass}">
        <span class="leaderboard-rank">${medal}</span>
        <span class="leaderboard-name">${entry.name}</span>
        <span class="leaderboard-score">${entry.score}</span>
      </div>
    `;
  }).join('');
}

function isNewRecord(score) {
  const leaderboard = getLeaderboard();
  if (leaderboard.length < 10) return true;
  return score > leaderboard[leaderboard.length - 1].score;
}

// Initialize
renderLeaderboard(leaderboardListEl);

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * 2 - 1;
    this.life = 1.0;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= 0.02;
  }

  draw(ctx) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

function initGame() {
  // Get player name
  playerName = playerNameInput.value.trim() || 'Oyuncu';
  currentPlayerNameEl.textContent = playerName;

  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  isGameOver = false;
  particles = [];
  scoreEl.textContent = score;
  placeFood();

  startScreen.classList.remove('active');
  gameOverScreen.classList.remove('active');

  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  lastTime = 0;
  gameLoopId = requestAnimationFrame(gameLoop);
}

function placeFood() {
  let valid = false;
  while (!valid) {
    food.x = Math.floor(Math.random() * TILE_COUNT_X);
    food.y = Math.floor(Math.random() * TILE_COUNT_Y);

    valid = !snake.some(segment => segment.x === food.x && segment.y === food.y);
  }
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 10; i++) {
    particles.push(new Particle(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE + GRID_SIZE / 2, color));
  }
}

function update(timestamp) {
  if (isGameOver) return;

  if (timestamp - lastTime > GAME_SPEED) {
    moveSnake();
    lastTime = timestamp;
  }

  particles.forEach((p, index) => {
    p.update();
    if (p.life <= 0) particles.splice(index, 1);
  });
}

function moveSnake() {
  direction = nextDirection;

  let head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // Wrap around edges (teleportation)
  if (head.x < 0) head.x = TILE_COUNT_X - 1;
  if (head.x >= TILE_COUNT_X) head.x = 0;
  if (head.y < 0) head.y = TILE_COUNT_Y - 1;
  if (head.y >= TILE_COUNT_Y) head.y = 0;

  // Self Collision
  if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);

  // Eat Food
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    createExplosion(food.x, food.y, '#f472b6');
    placeFood();
  } else {
    snake.pop();
  }
}

function draw() {
  // Clear Canvas
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw Food
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#f472b6';
  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  ctx.arc(
    food.x * GRID_SIZE + GRID_SIZE / 2,
    food.y * GRID_SIZE + GRID_SIZE / 2,
    GRID_SIZE / 2 - 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw Snake
  snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? '#86efac' : '#4ade80';
    ctx.shadowBlur = index === 0 ? 20 : 10;
    ctx.shadowColor = '#4ade80';

    const x = segment.x * GRID_SIZE;
    const y = segment.y * GRID_SIZE;
    const size = GRID_SIZE - 2;

    ctx.fillRect(x + 1, y + 1, size, size);
  });
  ctx.shadowBlur = 0;

  // Draw Particles
  particles.forEach(p => p.draw(ctx));
}

function gameLoop(timestamp) {
  update(timestamp);
  draw();
  if (!isGameOver) {
    gameLoopId = requestAnimationFrame(gameLoop);
  }
}

function gameOver() {
  isGameOver = true;
  finalScoreEl.textContent = score;

  // Save to leaderboard
  saveToLeaderboard(playerName, score);

  // Check if new record
  if (isNewRecord(score)) {
    newRecordEl.classList.add('show');
  } else {
    newRecordEl.classList.remove('show');
  }

  // Update leaderboards
  renderLeaderboard(leaderboardListGameOverEl);

  gameOverScreen.classList.add('active');
}

// Input Handling
window.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      if (direction.y === 0) nextDirection = { x: 0, y: -1 };
      e.preventDefault();
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      if (direction.y === 0) nextDirection = { x: 0, y: 1 };
      e.preventDefault();
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      if (direction.x === 0) nextDirection = { x: -1, y: 0 };
      e.preventDefault();
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      if (direction.x === 0) nextDirection = { x: 1, y: 0 };
      e.preventDefault();
      break;
    case ' ':
      if (startScreen.classList.contains('active')) {
        initGame();
      }
      e.preventDefault();
      break;
  }
});

restartBtn.addEventListener('click', () => {
  startScreen.classList.add('active');
  gameOverScreen.classList.remove('active');
  renderLeaderboard(leaderboardListEl);
  playerNameInput.focus();
});

// Focus name input on load
playerNameInput.focus();

// Initial Draw
draw();
