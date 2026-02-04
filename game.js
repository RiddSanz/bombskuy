/**
 * BOMBSKUY GAME
 * Developed for Dicoding / Client Side Module
*/

(function () {
    // --- Project Configuration ---
    var CONFIG = {
        canvasWidth: 1000,
        canvasHeight: 550, // 600 - 50 HUD
        tileSize: 50, // 20 cols x 11 rows
        rows: 11,
        cols: 20,
        assets: {
            background: 'MODULE_CLIENT_MEDIA/Images/background.jpg',
            charDown: 'MODULE_CLIENT_MEDIA/Images/char_down.png',
            charLeft: 'MODULE_CLIENT_MEDIA/Images/char_left.png',
            charRight: 'MODULE_CLIENT_MEDIA/Images/char_right.png',
            charUp: 'MODULE_CLIENT_MEDIA/Images/char_up.png',
            dogDown: 'MODULE_CLIENT_MEDIA/Images/dog_down.png',
            dogLeft: 'MODULE_CLIENT_MEDIA/Images/dog_left.png',
            dogRight: 'MODULE_CLIENT_MEDIA/Images/dog_right.png',
            dogUp: 'MODULE_CLIENT_MEDIA/Images/dog_up.png',
            heart: 'MODULE_CLIENT_MEDIA/Images/heart.png',
            ice: 'MODULE_CLIENT_MEDIA/Images/ice.png',
            tnt: 'MODULE_CLIENT_MEDIA/Images/tnt.png',
            wall: 'MODULE_CLIENT_MEDIA/Images/wall.png',
            wallCrack: 'MODULE_CLIENT_MEDIA/Images/wall_crack.png'
        }
    };

    // --- Game State ---
    var state = {
        username: '',
        difficulty: 'easy',
        lives: 3,
        score: 0,
        timer: 0, // In seconds
        startTime: 0,
        isPlaying: false,
        isPaused: false,
        lastTime: 0,

        // Entities
        map: [], // 2D array: 0=Empty, 1=Stone, 2=Brick, 3=Bomb, 4=Heart, 5=TNT, 6=Ice
        player: {},
        dogs: [],
        bombs: [],
        explosions: []
    };

    // --- DOM Elements ---
    var screens = {
        welcome: document.getElementById('welcome-screen'),
        difficulty: document.getElementById('difficulty-screen'),
        game: document.getElementById('game-interface'),
    };

    var modals = {
        pause: document.getElementById('pause-modal'),
        gameOver: document.getElementById('game-over-modal'),
        leaderboard: document.getElementById('leaderboard-modal'),
        instruction: document.getElementById('instruction-modal'),
        countdown: document.getElementById('countdown-overlay')
    };

    var inputUsername = document.getElementById('username');
    var btnPlay = document.getElementById('btn-play');
    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');

    var hud = {
        lives: document.getElementById('hud-lives'),
        timer: document.getElementById('hud-timer'),
        score: document.getElementById('hud-score')
    };

    // --- Initialization ---
    function init() {
        initEventListeners();
        loadAssets(); // Preload logic if needed
    }

    function initEventListeners() {
        // Welcome
        inputUsername.addEventListener('input', function () {
            btnPlay.disabled = this.value.trim().length === 0;
        });

        btnPlay.addEventListener('click', function () {
            state.username = inputUsername.value.trim();
            showScreen('difficulty');
        });

        document.getElementById('btn-instruction-main').addEventListener('click', function () {
            modals.instruction.style.display = 'flex';
        });
        document.getElementById('btn-close-instruction').addEventListener('click', function () {
            modals.instruction.style.display = 'none';
        });

        // Difficulty
        var diffButtons = document.querySelectorAll('.btn-difficulty');
        for (var i = 0; i < diffButtons.length; i++) {
            diffButtons[i].addEventListener('click', function () {
                var diff = this.getAttribute('data-difficulty');
                startGame(diff);
            });
        }

        document.getElementById('btn-back-welcome').addEventListener('click', function () {
            showScreen('welcome');
        });

        // HUD & Modals
        document.getElementById('btn-pause-hud').addEventListener('click', togglePause);
        document.getElementById('btn-continue').addEventListener('click', togglePause);
        document.getElementById('btn-quit').addEventListener('click', quitGame);
        document.getElementById('btn-retry').addEventListener('click', function () {
            modals.gameOver.style.display = 'none';
            showScreen('difficulty');
        });
        document.getElementById('btn-save-score').addEventListener('click', saveScore);
        document.getElementById('btn-leaderboard').addEventListener('click', showLeaderboard);
        document.getElementById('btn-close-leaderboard').addEventListener('click', function () {
            modals.leaderboard.style.display = 'none';
            // Show Game Over modal again
            modals.gameOver.style.display = 'flex';
        });

        // Leaderboard Tabs
        var tabs = document.querySelectorAll('.tab-btn');
        for (var j = 0; j < tabs.length; j++) {
            tabs[j].addEventListener('click', function () {
                document.querySelector('.tab-btn.active').classList.remove('active');
                this.classList.add('active');
                renderLeaderboardList(this.getAttribute('data-sort'));
            });
        }

        // Global Input
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    }

    function showScreen(screenName) {
        for (var key in screens) {
            screens[key].classList.remove('active');
        }
        if (screens[screenName]) screens[screenName].classList.add('active');
    }

    // --- Game Flow ---
    function startGame(difficulty) {
        state.difficulty = difficulty;
        state.lives = 3;
        state.score = 0;

        var dogCount = 1;
        if (difficulty === 'medium') dogCount = 2;
        if (difficulty === 'hard') dogCount = 3;

        generateMap();
        spawnPlayer();
        spawnDogs(dogCount);

        state.bombs = [];
        state.explosions = [];
        state.isPlaying = false;
        state.isPaused = false;

        showScreen('game');
        updateHUD();

        startCountdown(function () {
            state.isPlaying = true;
            state.startTime = Date.now();
            requestAnimationFrame(gameLoop);
        });
    }

    function startCountdown(cb) {
        var count = 3;
        modals.countdown.style.display = 'flex';
        var text = document.getElementById('countdown-text');
        text.innerText = count;

        var interval = setInterval(function () {
            count--;
            if (count > 0) {
                text.innerText = count;
            } else {
                clearInterval(interval);
                modals.countdown.style.display = 'none';
                if (cb) cb();
            }
        }, 1000);
    }

    function togglePause() {
        if (!state.isPlaying) return;
        state.isPaused = !state.isPaused;
        modals.pause.style.display = state.isPaused ? 'flex' : 'none';
    }

    function quitGame() {
        state.isPlaying = false;
        modals.pause.style.display = 'none';
        modals.gameOver.style.display = 'none';
        showScreen('welcome');
        inputUsername.value = '';
        btnPlay.disabled = true;
    }

    function gameOver(isWin) {
        console.log("Game Over Function Start. Win:", isWin);
        state.isPlaying = false;

        var modal = document.getElementById('game-over-modal');
        if (!modal) {
            console.error("Critical: Game Over Modal ID not found in DOM");
            alert("VICTORY! Score: " + state.score + " (Modal Missing)");
            return;
        }

        // Force style
        modal.style.display = 'flex';
        modal.style.zIndex = '10000'; // Force Z-index
        console.log("Modal display set to flex, zIndex 10000");

        var title = document.getElementById('game-over-title');
        if (title) {
            if (isWin) {
                title.innerText = "VICTORY!";
                title.style.color = "#f1c40f";
                state.score += 500;
            } else {
                title.innerText = "GAME OVER";
                title.style.color = "#e74c3c";
            }
        }

        // Ensure buttons are clickable
        document.getElementById('btn-save-score').disabled = false;

        if (document.getElementById('go-player')) document.getElementById('go-player').innerText = state.username;
        if (document.getElementById('go-time')) document.getElementById('go-time').innerText = formatTime(state.timer);
        if (document.getElementById('go-score')) document.getElementById('go-score').innerText = state.score;

        console.log("Game Over Function End");
    }

    // --- Input Handling ---
    var keys = {};
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            togglePause();
            return;
        }
        keys[e.key] = true;
        // Bomb
        if (e.key === ' ' && state.isPlaying && !state.isPaused) {
            placeBomb();
        }
    }
    function handleKeyUp(e) {
        keys[e.key] = false;
    }

    // --- Map & Entities ---
    function generateMap() {
        state.map = [];
        for (var r = 0; r < CONFIG.rows; r++) {
            var row = [];
            for (var c = 0; c < CONFIG.cols; c++) {
                // Border (Stone)
                if (r === 0 || r === CONFIG.rows - 1 || c === 0 || c === CONFIG.cols - 1) {
                    row.push(1);
                } else {
                    // Inside
                    // Fixed Stones at even coordinates relative to grid? 
                    // Standard: (2,2), (2,4) ... if (0,0) is wall.
                    // If r,c are indices:
                    // r=0 Wall. r=1 Empty/Brick. r=2 Stone Pattern?
                    if (r % 2 === 0 && c % 2 === 0) {
                        row.push(1); // Stone
                    } else {
                        // Bricks
                        // Safe zone: Top-Left (1,1), (1,2), (2,1)
                        // Player spawns at 1,1
                        if ((r === 1 && c === 1) || (r === 1 && c === 2) || (r === 2 && c === 1)) {
                            row.push(0); // Empty
                        } else {
                            // 25% chance of brick
                            row.push(Math.random() < 0.25 ? 2 : 0);
                        }
                    }
                }
            }
            state.map.push(row);
        }
    }

    function spawnPlayer() {
        state.player = {
            // Spawn at (1,1) -> 50+5, 50+5
            pixelX: CONFIG.tileSize + 5,
            pixelY: CONFIG.tileSize + 5,
            width: 40,
            height: 40,
            speed: 3,
            direction: 'down',
            tntRange: 1,
            isFrozen: false,
            frozenEnd: 0,
            invulnerableEnd: 0,
            // Stat tracking for leaderboard
            wallsDestroyed: 0,
            tntCollected: 0,
            iceCollected: 0
        };
    }

    function spawnDogs(count) {
        state.dogs = [];
        for (var i = 0; i < count; i++) {
            var r, c;
            // Find empty spot far from player
            do {
                r = Math.floor(Math.random() * CONFIG.rows);
                c = Math.floor(Math.random() * CONFIG.cols);
            } while (state.map[r][c] !== 0 || (r < 3 && c < 3)); // Adjusted safe zone for dogs

            state.dogs.push({
                pixelX: c * CONFIG.tileSize + 5,
                pixelY: r * CONFIG.tileSize + 5,
                width: 40,
                height: 40,
                speed: (state.difficulty === 'easy' ? 1 : 2),
                direction: 'down',
                changeDirTime: 0
            });
        }
    }

    // --- Game Loop ---
    function gameLoop() {
        if (!state.isPlaying) return;

        if (!state.isPaused) {
            update();
            draw();
        }
        requestAnimationFrame(gameLoop);
    }

    function update() {
        var now = Date.now();

        // Timer
        state.timer = Math.floor((now - state.startTime) / 1000);
        updateHUD();

        var player = state.player;

        // Handle Frozen
        if (player.isFrozen) {
            if (now > player.frozenEnd) player.isFrozen = false;
            else return; // Skip movement
        }

        // Player Movement (WASD / Arrows)
        var dx = 0;
        var dy = 0;
        var speed = player.speed;

        if (keys['ArrowUp'] || keys['w'] || keys['W']) { dy = -speed; player.direction = 'up'; }
        else if (keys['ArrowDown'] || keys['s'] || keys['S']) { dy = speed; player.direction = 'down'; }
        else if (keys['ArrowLeft'] || keys['a'] || keys['A']) { dx = -speed; player.direction = 'left'; }
        else if (keys['ArrowRight'] || keys['d'] || keys['D']) { dx = speed; player.direction = 'right'; }

        if (dx !== 0 || dy !== 0) {
            var newX = player.pixelX + dx;
            var newY = player.pixelY + dy;

            // Collision Check (Rectangle vs Grid)
            // Use a smaller hitbox for player collision to allow "sliding" feel
            // Player is 40x40. Let's check 30x30 centered for movement.
            var hitW = 30;
            var hitH = 30;
            var offsetX = (player.width - hitW) / 2;
            var offsetY = (player.height - hitH) / 2;

            if (!checkCollision(newX + offsetX, player.pixelY + offsetY, hitW, hitH)) {
                player.pixelX = newX;
            }
            if (!checkCollision(player.pixelX + offsetX, newY + offsetY, hitW, hitH)) {
                player.pixelY = newY;
            }

            // Item Pickup (Use full size)
            checkItemPickup(player);
        }

        // Dog Logic
        state.dogs.forEach(function (dog) {
            updateDog(dog, player, now);
        });

        // Check Player vs Dog
        if (now > player.invulnerableEnd) {
            for (var i = 0; i < state.dogs.length; i++) {
                if (rectIntersect(player.pixelX, player.pixelY, player.width, player.height,
                    state.dogs[i].pixelX, state.dogs[i].pixelY, state.dogs[i].width, state.dogs[i].height)) {
                    takeDamage();
                    break;
                }
            }
        }

        // Check Explosions
        updateBombs(now);
    }

    function takeDamage() {
        if (state.lives <= 0) return; // Prevent double death/negative lives

        state.lives--;
        state.player.invulnerableEnd = Date.now() + 2000; // 2s Invuln
        updateHUD();

        if (state.lives <= 0) {
            gameOver();
        }
    }

    function updateDog(dog, player, now) {
        // Simple AI: Move towards player or random
        // Grid coords
        var dogCol = Math.floor((dog.pixelX + 20) / CONFIG.tileSize);
        var dogRow = Math.floor((dog.pixelY + 20) / CONFIG.tileSize);
        var pCol = Math.floor((player.pixelX + 20) / CONFIG.tileSize);
        var pRow = Math.floor((player.pixelY + 20) / CONFIG.tileSize);

        // Move logic
        var dx = 0, dy = 0;

        // Simple tracking
        if (Math.random() < 0.05) { // 5% chance to change random direction
            // Random wander
            var dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            var r = dirs[Math.floor(Math.random() * 4)];
            dog.dx = r[0] * dog.speed;
            dog.dy = r[1] * dog.speed;
        } else {
            // Track Player
            if (pCol > dogCol) dog.dx = dog.speed;
            else if (pCol < dogCol) dog.dx = -dog.speed;
            else dog.dx = 0;

            if (pRow > dogRow) dog.dy = dog.speed;
            else if (pRow < dogRow) dog.dy = -dog.speed;
            else dog.dy = 0;

            // Prioritize major axis
            if (Math.abs(pCol - dogCol) > Math.abs(pRow - dogRow)) {
                dog.dy = 0;
            } else {
                dog.dx = 0;
            }
        }

        // Apply move with collision
        if (dog.dx) {
            if (!checkCollision(dog.pixelX + dog.dx, dog.pixelY, dog.width, dog.height, true)) {
                dog.pixelX += dog.dx;
                if (dog.dx > 0) dog.direction = 'right'; else dog.direction = 'left';
            }
        }
        if (dog.dy) {
            if (!checkCollision(dog.pixelX, dog.pixelY + dog.dy, dog.width, dog.height, true)) {
                dog.pixelY += dog.dy;
                if (dog.dy > 0) dog.direction = 'down'; else dog.direction = 'up';
            }
        }
    }

    function checkCollision(x, y, w, h, isDog) {
        // Check 4 corners
        var tl = isSolid(x, y, isDog);
        var tr = isSolid(x + w, y, isDog);
        var bl = isSolid(x, y + h, isDog);
        var br = isSolid(x + w, y + h, isDog);
        return tl || tr || bl || br;
    }

    function isSolid(px, py, isDog) {
        var c = Math.floor(px / CONFIG.tileSize);
        var r = Math.floor(py / CONFIG.tileSize);

        if (c < 0 || c >= CONFIG.cols || r < 0 || r >= CONFIG.rows) return true;

        var tile = state.map[r][c];

        // Stone or Brick
        if (tile === 1 || tile === 2) return true;

        // Bomb (Solid)
        for (var i = 0; i < state.bombs.length; i++) {
            if (state.bombs[i].col === c && state.bombs[i].row === r) {
                // If player checks collision vs bomb, allow movement (to prevent trap)
                if (!isDog && rectIntersect(px, py, 1, 1, c * 50, r * 50, 50, 50)) {
                    return false; // NOT Solid for player
                }
                return true; // Solid for dogs or if logic fails
            }
        }
        return false;
    }

    // --- Bomb Logic ---
    function placeBomb() {
        // Center
        var cx = state.player.pixelX + 20;
        var cy = state.player.pixelY + 20;
        var c = Math.floor(cx / CONFIG.tileSize);
        var r = Math.floor(cy / CONFIG.tileSize);

        // Check existing
        for (var i = 0; i < state.bombs.length; i++) {
            if (state.bombs[i].col === c && state.bombs[i].row === r) return;
        }

        state.bombs.push({
            col: c,
            row: r,
            timer: Date.now() + 5000,
            range: state.player.tntRange
        });
    }

    function updateBombs(now) {
        // Explode
        for (var i = state.bombs.length - 1; i >= 0; i--) {
            var b = state.bombs[i];
            if (now >= b.timer) {
                explode(b, i);
            }
        }
        // Remove Explosions
        for (var j = state.explosions.length - 1; j >= 0; j--) {
            if (now > state.explosions[j].endTime) {
                state.explosions.splice(j, 1);
            } else {
                // Check collision with Player & Dogs
                checkExplosionHit(state.explosions[j]);
            }
        }
    }

    function explode(bomb, idx) {
        state.bombs.splice(idx, 1);
        createExplosion(bomb.col, bomb.row);

        var dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        dirs.forEach(function (d) {
            for (var k = 1; k <= bomb.range; k++) {
                var nc = bomb.col + d[0] * k;
                var nr = bomb.row + d[1] * k;
                if (!isValid(nc, nr)) break;

                var cell = state.map[nr][nc];
                if (cell === 1) break; // Stone
                if (cell === 2) {
                    // Destroy Brick
                    state.map[nr][nc] = 0;
                    state.player.wallsDestroyed++;
                    createExplosion(nc, nr);
                    // Spawn Item (Chance)
                    spawnItem(nc, nr);
                    break;
                }
                createExplosion(nc, nr);
            }
        });
    }

    function createExplosion(c, r) {
        state.explosions.push({
            col: c,
            row: r,
            endTime: Date.now() + 500 // 0.5s duration
        });
    }

    function checkExplosionHit(exp) {
        var ex = exp.col * CONFIG.tileSize;
        var ey = exp.row * CONFIG.tileSize;
        var ew = CONFIG.tileSize;

        // Player
        if (Date.now() > state.player.invulnerableEnd) {
            if (rectIntersect(state.player.pixelX, state.player.pixelY, state.player.width, state.player.height, ex, ey, ew, ew)) {
                takeDamage();
            }
        }

        // Dogs
        for (var i = state.dogs.length - 1; i >= 0; i--) {
            var d = state.dogs[i];
            if (rectIntersect(d.pixelX, d.pixelY, d.width, d.height, ex, ey, ew, ew)) {
                // Dog dies
                state.dogs.splice(i, 1);
                state.score += 100;

                // WIN CONDITION
                if (state.dogs.length === 0) {
                    setTimeout(function () {
                        gameOver(true);
                    }, 500); // Small delay for satisfaction
                }
            }
        }
    }

    // --- Items ---
    function spawnItem(c, r) {
        // 4=Heart, 5=TNT, 6=Ice
        var rand = Math.random();
        if (rand < 0.1) state.map[r][c] = 4; // Heart
        else if (rand < 0.2) state.map[r][c] = 5; // TNT
        else if (rand < 0.3) state.map[r][c] = 6; // Ice
    }

    function checkItemPickup(p) {
        // Center
        var cx = p.pixelX + 20;
        var cy = p.pixelY + 20;
        var c = Math.floor(cx / CONFIG.tileSize);
        var r = Math.floor(cy / CONFIG.tileSize);

        if (state.map[r][c] >= 4) {
            var item = state.map[r][c];
            state.map[r][c] = 0; // Remove

            if (item === 4) { // Heart (Broken Heart? Req: "Broken Heart: Decreases the player’s hearts")
                // Ah "broken heart" -> bad item.
                state.lives--;
                updateHUD();
                if (state.lives <= 0) gameOver();
            } else if (item === 5) { // TNT
                p.tntRange *= 2; // "Doubles range"
                p.tntCollected++;
            } else if (item === 6) { // Ice
                p.isFrozen = true;
                p.frozenEnd = Date.now() + 5000;
                p.iceCollected++;
            }
        }
    }

    // --- Rendering ---
    var loadedImages = {};
    function loadAssets() {
        for (var k in CONFIG.assets) {
            var img = new Image();
            img.src = CONFIG.assets[k];
            loadedImages[CONFIG.assets[k]] = img;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

        // Draw Map & Items
        for (var r = 0; r < CONFIG.rows; r++) {
            for (var c = 0; c < CONFIG.cols; c++) {
                var cell = state.map[r][c];
                var x = c * CONFIG.tileSize;
                var y = r * CONFIG.tileSize;

                if (cell === 1) drawImg(CONFIG.assets.wall, x, y);
                else if (cell === 2) drawImg(CONFIG.assets.wallCrack, x, y);
                else if (cell === 4) drawImg(CONFIG.assets.heart, x + 10, y + 10, 30, 30);
                else if (cell === 5) drawImg(CONFIG.assets.tnt, x + 10, y + 10, 30, 30);
                else if (cell === 6) drawImg(CONFIG.assets.ice, x + 10, y + 10, 30, 30);
            }
        }

        // Bombs
        state.bombs.forEach(function (b) {
            var x = b.col * CONFIG.tileSize + 25;
            var y = b.row * CONFIG.tileSize + 25;

            // Bomb Animation (Pulse)
            var pulse = Math.sin(Date.now() / 200) * 2;

            ctx.beginPath();
            ctx.arc(x, y, 20 + pulse, 0, Math.PI * 2);
            ctx.fillStyle = 'black';
            ctx.fill();
            // Pulse red center
            ctx.beginPath();
            ctx.arc(x, y, 10 + pulse / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
        });

        // Explosions
        ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
        state.explosions.forEach(function (e) {
            ctx.fillRect(e.col * CONFIG.tileSize, e.row * CONFIG.tileSize, CONFIG.tileSize, CONFIG.tileSize);
        });

        // Dogs
        state.dogs.forEach(function (d) {
            var img = CONFIG.assets.dogDown;
            if (d.direction === 'up') img = CONFIG.assets.dogUp;
            else if (d.direction === 'left') img = CONFIG.assets.dogLeft;
            else if (d.direction === 'right') img = CONFIG.assets.dogRight;

            // Wobble
            var wobbleY = 0;
            // Dogs are always "moving" effectively in updates
            if (d.dx !== 0 || d.dy !== 0) {
                wobbleY = Math.sin(Date.now() / 100) * 3;
            }
            drawImg(img, d.pixelX, d.pixelY + wobbleY, d.width, d.height);
        });

        // Player
        var p = state.player;
        if (state.lives > 0) {
            // Blink if invuln
            if (Date.now() < p.invulnerableEnd && Math.floor(Date.now() / 100) % 2 === 0) {
                // Skip draw (blink)
            } else {
                var pImg = CONFIG.assets.charDown;
                if (p.direction === 'up') pImg = CONFIG.assets.charUp;
                else if (p.direction === 'left') pImg = CONFIG.assets.charLeft;
                else if (p.direction === 'right') pImg = CONFIG.assets.charRight;

                // Walking Animation (Wobble)
                var pWobble = 0;
                var isMoving = (keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'] || keys['w'] || keys['s'] || keys['a'] || keys['d']);
                if (isMoving && !p.isFrozen) {
                    pWobble = Math.sin(Date.now() / 100) * 3;
                }

                drawImg(pImg, p.pixelX, p.pixelY + pWobble, p.width, p.height);

                if (p.isFrozen) {
                    ctx.fillStyle = 'rgba(52, 152, 219, 0.5)';
                    ctx.fillRect(p.pixelX, p.pixelY, p.width, p.height);
                }
            }
        }
    }

    function drawImg(src, x, y, w, h) {
        if (loadedImages[src] && loadedImages[src].complete) {
            ctx.drawImage(loadedImages[src], x, y, w || CONFIG.tileSize, h || CONFIG.tileSize);
        }
    }

    // --- Utilities ---
    function updateHUD() {
        hud.lives.innerText = state.lives;
        hud.timer.innerText = formatTime(state.timer);
        hud.score.innerText = state.score;
    }

    function formatTime(sec) {
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function isValid(c, r) {
        return c >= 0 && c < CONFIG.cols && r >= 0 && r < CONFIG.rows;
    }

    function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
    }

    // --- Leaderboard ---
    function saveScore() {
        // Save to localstorage
        var games = JSON.parse(localStorage.getItem('bombskuy_games') || '[]');
        games.push({
            player: state.username,
            score: state.score,
            time: formatTime(state.timer),
            walls: state.player.wallsDestroyed,
            tnt: state.player.tntCollected,
            ice: state.player.iceCollected
        });
        localStorage.setItem('bombskuy_games', JSON.stringify(games));
        alert('Score Saved!');
        document.getElementById('btn-save-score').disabled = true;
    }

    function showLeaderboard() {
        modals.gameOver.style.display = 'none'; // Close game over if open
        modals.leaderboard.style.display = 'flex';
        renderLeaderboardList('walls'); // Default sort
    }

    function renderLeaderboardList(sortKey) {
        var list = document.getElementById('leaderboard-list');
        list.innerHTML = '';
        var games = JSON.parse(localStorage.getItem('bombskuy_games') || '[]');

        // Sort
        games.sort(function (a, b) {
            return b[sortKey] - a[sortKey]; // Descending
        });

        games.forEach(function (g, i) {
            var li = document.createElement('li');
            li.innerHTML = '<span>' + (i + 1) + '. ' + g.player + '</span><span>' + g[sortKey] + ' (' + sortKey + ')</span>';
            list.appendChild(li);
        });
    }

    // Start
    init();

})();
