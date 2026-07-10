// ============================================================================
// ORDEN DE NIVELES DE LA CAMPAÑA
// Level1Scene = Luna | Level2Scene = Marte | Level3Scene = Júpiter (base)
// ============================================================================
const LEVEL_ORDER = ['Level1Scene', 'Level2Scene', 'Level3Scene'];

function getNextLevelKey(currentKey) {
    const idx = LEVEL_ORDER.indexOf(currentKey);
    if (idx === -1 || idx === LEVEL_ORDER.length - 1) return null;
    return LEVEL_ORDER[idx + 1];
}

// ============================================================================
// OPCIONES GLOBALES (Volumen) - Placeholders sin audio real todavía
// ============================================================================
let gameOptions = {
    musicVolume: 50,
    gameVolume: 50
};

function ensureOptionsOverlay() {
    if (document.getElementById('options-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'options-overlay';
    overlay.className = 'overlay'; // reutiliza el estilo de overlay existente (blur + fade)

    overlay.innerHTML = `
        <div class="glass-panel">
            <h2 class="neon-text-green" style="color:#00e5ff; text-shadow:0 0 10px rgba(0,229,255,0.5), 0 0 20px rgba(0,229,255,0.2);">OPCIONES</h2>

            <div class="instructions" style="text-align:left;">
                <label style="display:block; margin-bottom:6px; font-size:0.95rem; color:#cbd5e1;">
                    Volumen de la música: <span id="opt-music-value" class="highlight">50</span>%
                </label>
                <input type="range" id="opt-music-slider" min="0" max="100" value="50" style="width:100%; margin-bottom:18px;">

                <label style="display:block; margin-bottom:6px; font-size:0.95rem; color:#cbd5e1;">
                    Volumen del juego: <span id="opt-game-value" class="highlight">50</span>%
                </label>
                <input type="range" id="opt-game-slider" min="0" max="100" value="50" style="width:100%;">
            </div>

            <button id="opt-close-btn" class="btn-neon blue">
                <span class="btn-text">CERRAR</span>
                <span class="btn-glow"></span>
            </button>
        </div>
    `;
    document.getElementById('app-container').appendChild(overlay);

    const musicSlider = document.getElementById('opt-music-slider');
    const gameSlider = document.getElementById('opt-game-slider');
    const musicValue = document.getElementById('opt-music-value');
    const gameValue = document.getElementById('opt-game-value');

    musicSlider.value = gameOptions.musicVolume;
    gameSlider.value = gameOptions.gameVolume;
    musicValue.innerText = gameOptions.musicVolume;
    gameValue.innerText = gameOptions.gameVolume;

    musicSlider.oninput = () => {
        gameOptions.musicVolume = parseInt(musicSlider.value, 10);
        musicValue.innerText = gameOptions.musicVolume;
        // TODO: cuando se agreguen los recursos de audio reales, aplicar aquí,
        // por ejemplo: musicTrack.setVolume(gameOptions.musicVolume / 100);
    };

    gameSlider.oninput = () => {
        gameOptions.gameVolume = parseInt(gameSlider.value, 10);
        gameValue.innerText = gameOptions.gameVolume;
        // TODO: cuando se agreguen los recursos de audio reales (SFX), aplicar aquí,
        // por ejemplo: sound.setVolume(gameOptions.gameVolume / 100);
    };

    document.getElementById('opt-close-btn').onclick = () => {
        closeOptionsOverlay();
    };
}

function openOptionsOverlay() {
    ensureOptionsOverlay();
    document.getElementById('options-overlay').classList.add('active');

    const activeScene = game.scene.getScene(currentLevelKey);
    if (activeScene && game.scene.isActive(currentLevelKey)) {
        activeScene.optionsPausedPhysics = true;
        activeScene.physics.pause();
    }
}

function closeOptionsOverlay() {
    const overlayEl = document.getElementById('options-overlay');
    if (overlayEl) overlayEl.classList.remove('active');

    const activeScene = game.scene.getScene(currentLevelKey);
    if (activeScene && game.scene.isActive(currentLevelKey) && activeScene.optionsPausedPhysics) {
        activeScene.optionsPausedPhysics = false;
        if (!activeScene.isGameOver && !activeScene.isGameWon) {
            activeScene.physics.resume();
        }
    }
}

// ============================================================================
// GENERADOR DE TEXTURAS DINÁMICAS (COMPARTIDO ENTRE TODOS LOS NIVELES)
// ============================================================================
function createSharedTextures(scene) {
    // --- Plataformas temáticas: Luna (gris), Marte (rojiza), Júpiter (dorada/tostada) ---
    const themes = [
        { prefix: 'moon',    rock: '#1e293b', crater: '#0f172a', borderA: '#e2e8f0', borderB: '#94a3b8' },
        { prefix: 'mars',    rock: '#7c2d12', crater: '#431407', borderA: '#f97316', borderB: '#dc2626' },
        { prefix: 'jupiter', rock: '#78350f', crater: '#451a03', borderA: '#fbbf24', borderB: '#f59e0b' }
    ];

    const sizes = [
        { w: 800, h: 40 }, { w: 700, h: 40 }, { w: 1200, h: 40 },
        { w: 200, h: 20 }, { w: 150, h: 20 }, { w: 120, h: 20 }, { w: 100, h: 20 }
    ];

    themes.forEach(theme => {
        sizes.forEach(size => {
            createPlatformTexture(
                scene,
                `plat_${theme.prefix}_${size.w}`,
                size.w, size.h,
                theme.borderA, theme.borderB,
                theme.rock, theme.crater
            );
        });
    });

    // --- Portal de meta ---
    if (!scene.textures.exists('portal_tex')) {
        let ptCanvas = scene.textures.createCanvas('portal_tex', 40, 80);
        let ptCtx = ptCanvas.context;
        ptCtx.strokeStyle = '#10b981';
        ptCtx.lineWidth = 4;
        ptCtx.strokeRect(4, 4, 32, 72);

        let ptGrad = ptCtx.createLinearGradient(0, 0, 40, 0);
        ptGrad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        ptGrad.addColorStop(0.5, 'rgba(52, 211, 153, 0.6)');
        ptGrad.addColorStop(1, 'rgba(16, 185, 129, 0.3)');
        ptCtx.fillStyle = ptGrad;
        ptCtx.fillRect(6, 6, 28, 68);
        ptCanvas.refresh();
    }

    // --- Gemas ---
    if (!scene.textures.exists('gem_tex')) {
        let gCanvas = scene.textures.createCanvas('gem_tex', 16, 16);
        let gCtx = gCanvas.context;
        gCtx.fillStyle = '#facc15';
        gCtx.beginPath();
        gCtx.moveTo(8, 0);
        gCtx.lineTo(16, 8);
        gCtx.lineTo(8, 16);
        gCtx.lineTo(0, 8);
        gCtx.closePath();
        gCtx.fill();
        gCtx.fillStyle = '#ffffff';
        gCtx.beginPath();
        gCtx.moveTo(8, 3);
        gCtx.lineTo(13, 8);
        gCtx.lineTo(8, 13);
        gCtx.lineTo(3, 8);
        gCtx.closePath();
        gCtx.fill();
        gCanvas.refresh();
    }

    // --- Partículas ---
    createParticleTexture(scene, 'part_white', '#ffffff');
    createParticleTexture(scene, 'part_magenta', '#ec4899');
    createParticleTexture(scene, 'part_yellow', '#facc15');
    createParticleTexture(scene, 'part_red', '#ef4444');
    createParticleTexture(scene, 'part_green', '#10b981');
    createParticleTexture(scene, 'part_orange', '#fb923c');

    // --- Tierra (fondo Nivel 1: Luna) ---
    if (!scene.textures.exists('earth_tex')) {
        let earthCanvas = scene.textures.createCanvas('earth_tex', 128, 128);
        let eCtx = earthCanvas.context;
        let eGrad = eCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
        eGrad.addColorStop(0, '#e0f2fe');
        eGrad.addColorStop(0.3, '#38bdf8');
        eGrad.addColorStop(0.6, '#0284c7');
        eGrad.addColorStop(0.8, '#16a34a');
        eGrad.addColorStop(1, '#08070d');
        eCtx.fillStyle = eGrad;
        eCtx.beginPath();
        eCtx.arc(64, 64, 60, 0, Math.PI * 2);
        eCtx.fill();
        eCtx.strokeStyle = '#38bdf8';
        eCtx.lineWidth = 2;
        eCtx.stroke();
        earthCanvas.refresh();
    }

    // --- Júpiter gigante gaseoso (fondo Nivel 3) ---
    if (!scene.textures.exists('jupiter_bg_tex')) {
        createGasGiantTexture(scene, 'jupiter_bg_tex', 220, [
            '#e8c39e', '#c97b4a', '#f0d9b5', '#b5651d', '#e8c39e', '#a0522d', '#d9a066'
        ]);
    }
}

function createPlatformTexture(scene, key, width, height, borderStart, borderEnd, rockColor = null, craterColor = null) {
    if (scene.textures.exists(key)) return;

    let canvas = scene.textures.createCanvas(key, width, height);
    let ctx = canvas.context;

    if (rockColor) {
        // Fondo rocoso temático (Luna / Marte / Júpiter)
        ctx.fillStyle = rockColor;
        ctx.fillRect(0, 0, width, height);

        // Cráteres/manchas oscuras
        ctx.fillStyle = craterColor || '#000000';
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1.5;
        for (let i = 20; i < width; i += 60) {
            let cx = i + Phaser.Math.Between(-10, 10);
            let cy = Phaser.Math.Between(15, 30);
            let cr = Phaser.Math.Between(4, 9);
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    } else {
        // Plataforma clásica neón (sin usar actualmente, se mantiene por compatibilidad)
        ctx.fillStyle = 'rgba(10, 8, 20, 0.9)';
        ctx.fillRect(0, 0, width, height);
    }

    // Borde brillante superior
    let grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, borderStart);
    grad.addColorStop(0.5, borderEnd);
    grad.addColorStop(1, borderStart);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(width, 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    canvas.refresh();
}

function createParticleTexture(scene, key, hexColor) {
    if (scene.textures.exists(key)) return;

    let canvas = scene.textures.createCanvas(key, 6, 6);
    let ctx = canvas.context;
    ctx.fillStyle = hexColor;
    ctx.fillRect(0, 0, 6, 6);
    canvas.refresh();
}

function createGasGiantTexture(scene, key, size, bandColors) {
    if (scene.textures.exists(key)) return;

    let canvas = scene.textures.createCanvas(key, size, size);
    let ctx = canvas.context;

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.clip();

    const bandHeight = size / bandColors.length;
    bandColors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, i * bandHeight, size, bandHeight + 2);
    });
    ctx.restore();

    ctx.strokeStyle = bandColors[0];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();

    canvas.refresh();
}

// ============================================================================
// UTILIDAD COMPARTIDA: botón de opciones dentro del HUD de juego
// ============================================================================
function ensureHudOptionsButton() {
    let hudOptionsBtn = document.getElementById('hud-options-btn');
    if (!hudOptionsBtn) {
        hudOptionsBtn = document.createElement('div');
        hudOptionsBtn.id = 'hud-options-btn';
        hudOptionsBtn.className = 'hud-item';
        hudOptionsBtn.style.cursor = 'pointer';
        hudOptionsBtn.style.pointerEvents = 'all';
        hudOptionsBtn.innerHTML = `<span class="hud-label">☰</span><span class="hud-value neon-glow-cyan">OPCIONES</span>`;
        hudOptionsBtn.onclick = () => openOptionsOverlay();
        document.getElementById('game-hud').appendChild(hudOptionsBtn);
    }
}

// ============================================================================
// NIVEL 1 - LUNA (Level1Scene) - Baja gravedad
// ============================================================================
class Level1Scene extends Phaser.Scene {
    constructor() {
        super({key: 'Level1Scene'});
    }

    init() {
        this.collectedGems = 0;
        this.totalGems = 0;
        this.wasOnGround = true;
        this.jumpCount = 0;
        this.isGameOver = false;
        this.isGameWon = false;
        this.lastMovedDir = 'right';
        this.lastActionTime = 0;
        this.visualOffsetY = -4;
        this.optionsPausedPhysics = false;
    }

    preload() {
        this.load.image('frontal', 'Recursos/frontal.png');
        this.load.image('derecha', 'Recursos/derecha.png');
        this.load.image('izquierda', 'Recursos/izquierda.png');
        this.load.image('saltoDerecha', 'Recursos/saltoDerecha.png');
        this.load.image('saltoIzquierda', 'Recursos/saltoIzquierda.png');
    }

    create() {
        this.isGameOver = false;
        this.isGameWon = false;

        createSharedTextures(this);
        this.physics.resume();
        this.lastActionTime = this.time.now;

        const levelWidth = 3200;
        const levelHeight = 576;

        this.physics.world.gravity.y = 350; // Gravedad lunar

        this.physics.world.setBounds(0, 0, levelWidth, levelHeight + 100);
        this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);

        // --- Fondo: Tierra distante ---
        let earth = this.add.sprite(900, 160, 'earth_tex');
        earth.setDisplaySize(160, 160);
        earth.setScrollFactor(0.01);

        for (let i = 0; i < 200; i++) {
            let x = Phaser.Math.Between(0, levelWidth);
            let y = Phaser.Math.Between(0, levelHeight - 120);
            let size = Phaser.Math.Between(1, 2);
            let alpha = Phaser.Math.FloatBetween(0.3, 0.8);
            let starColor = Phaser.Utils.Array.GetRandom([0xffffff, 0xa5f3fc, 0xcbd5e1]);
            let star = this.add.circle(x, y, size, starColor, alpha);
            star.setScrollFactor(Phaser.Math.FloatBetween(0.01, 0.12));
        }

        // --- Plataformas estáticas lunares ---
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(400, 556, 'plat_moon_800');
        this.platforms.create(1500, 556, 'plat_moon_700');
        this.platforms.create(2700, 556, 'plat_moon_1200');
        this.platforms.create(950, 400, 'plat_moon_150');
        this.platforms.create(1550, 320, 'plat_moon_200');
        this.platforms.create(1780, 240, 'plat_moon_150');
        this.platforms.create(2250, 420, 'plat_moon_200');
        this.platforms.create(2480, 330, 'plat_moon_200');
        this.platforms.create(2750, 240, 'plat_moon_150');
        this.platforms.refresh();

        // --- Plataformas móviles ---
        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });

        let verticalPlat = this.movingPlatforms.create(1250, 300, 'plat_moon_100');
        verticalPlat.name = 'vertical';
        verticalPlat.body.setVelocityY(-80);
        verticalPlat.body.setFriction(1, 1);

        let horizontalPlat = this.movingPlatforms.create(2020, 300, 'plat_moon_120');
        horizontalPlat.name = 'horizontal';
        horizontalPlat.body.setVelocityX(100);
        horizontalPlat.body.setFriction(1, 1);

        this.movingPlatforms.getChildren().forEach(p => p.body.setImmovable(true));

        // --- Portal ---
        this.portal = this.physics.add.sprite(3050, 496, 'portal_tex');
        this.portal.body.allowGravity = false;
        this.portal.body.setImmovable(true);

        this.portalParticles = this.add.particles(this.portal.x, this.portal.y, 'part_green', {
            speedY: { min: -100, max: -30 }, speedX: { min: -20, max: 20 },
            scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 },
            lifespan: 1000, frequency: 100, blendMode: 'ADD'
        });

        // --- Gemas ---
        this.gems = this.physics.add.group({ allowGravity: false });
        const gemCoords = [
            {x: 400, y: 440}, {x: 600, y: 380}, {x: 950, y: 280}, {x: 1250, y: 150},
            {x: 1550, y: 200}, {x: 1780, y: 120}, {x: 2020, y: 180}, {x: 2250, y: 300},
            {x: 2480, y: 200}, {x: 2750, y: 120}
        ];

        gemCoords.forEach(coord => {
            let gem = this.gems.create(coord.x, coord.y, 'gem_tex');
            gem.body.setImmovable(true);
            this.tweens.add({
                targets: gem, y: coord.y - 12,
                duration: 1800 + Phaser.Math.Between(-300, 300),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        });
        this.totalGems = gemCoords.length;

        // --- Personaje ---
        this.player = this.physics.add.sprite(100, 450, 'frontal');
        this.player.setCollideWorldBounds(false);
        this.player.body.setGravityY(400);
        this.player.body.setMaxVelocity(350, 600);
        this.player.setOrigin(0.5, 0.5);
        this.player.setAlpha(0);
        this.player.body.setSize(32, 32);

        this.playerVisual = this.add.sprite(100, 450, 'frontal');
        this.playerVisual.setOrigin(0.5, 0.5);
        this.playerVisual.setDisplaySize(48, 48);
        this.playerVisual.setVisible(true);
        this.playerVisual.setActive(true);

        // --- Colisiones ---
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.movingPlatforms);
        this.physics.add.overlap(this.player, this.gems, this.collectGem, null, this);
        this.physics.add.overlap(this.player, this.portal, this.winGame, null, this);

        // --- Controles ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

        this.input.keyboard.on('keydown-SPACE', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-UP', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-W', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-ESC', () => { openOptionsOverlay(); });

        // --- Cámara y HUD ---
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.updateHUDText();
        ensureHudOptionsButton();
        document.getElementById('game-hud').classList.add('active');
        document.getElementById('hud-status').innerText = 'SECTOR LUNAR';
        document.getElementById('hud-status').className = 'hud-value neon-glow-cyan';
    }

    update() {
        if (this.isGameOver || this.isGameWon) return;

        let isMovingLeft = this.cursors.left.isDown || this.keyA.isDown;
        let isMovingRight = this.cursors.right.isDown || this.keyD.isDown;

        if (isMovingLeft) {
            this.player.setVelocityX(-220);
            this.playerVisual.setAngle(-6);
            this.lastMovedDir = 'left';
            this.lastActionTime = this.time.now;
        } else if (isMovingRight) {
            this.player.setVelocityX(220);
            this.playerVisual.setAngle(6);
            this.lastMovedDir = 'right';
            this.lastActionTime = this.time.now;
        } else {
            this.player.setVelocityX(this.player.body.velocity.x * 0.9);
            this.playerVisual.setAngle(0);
        }

        this.playerVisual.x = this.player.x;
        this.playerVisual.y = this.player.y + this.visualOffsetY;

        let onGround = this.player.body.blocked.down || this.player.body.touching.down;
        let textureToUse = 'frontal';

        if (!onGround) {
            this.lastActionTime = this.time.now;
            textureToUse = (isMovingLeft || this.lastMovedDir === 'left') ? 'saltoIzquierda' : 'saltoDerecha';
        } else {
            if (isMovingLeft) {
                textureToUse = 'izquierda';
            } else if (isMovingRight) {
                textureToUse = 'derecha';
            } else {
                if (this.time.now - this.lastActionTime >= 750) {
                    textureToUse = 'frontal';
                } else {
                    textureToUse = (this.lastMovedDir === 'left') ? 'izquierda' : 'derecha';
                }
            }
        }
        this.setPlayerTexture(textureToUse);

        if (onGround && !this.wasOnGround) {
            this.jumpCount = 0;
            this.lastActionTime = this.time.now;
            this.tweens.add({
                targets: this.playerVisual,
                displayWidth: 48 * 1.2, displayHeight: 48 * 0.8,
                duration: 100, yoyo: true, repeat: 0,
                onComplete: () => this.playerVisual.setDisplaySize(48, 48)
            });
            const landPart = this.add.particles(this.player.x, this.player.y + 16, 'part_white', {
                speed: { min: 5, max: 40 }, angle: { min: 200, max: 340 },
                scale: { start: 0.8, end: 0 }, alpha: { start: 0.5, end: 0 },
                lifespan: 300, quantity: 4, blendMode: 'ADD'
            });
            landPart.explode();
        }
        this.wasOnGround = onGround;

        this.movingPlatforms.getChildren().forEach(p => {
            if (p.name === 'vertical') {
                if (p.y <= 160) p.body.setVelocityY(80);
                else if (p.y >= 430) p.body.setVelocityY(-80);
            } else if (p.name === 'horizontal') {
                if (p.x <= 1850) p.body.setVelocityX(100);
                else if (p.x >= 2150) p.body.setVelocityX(-100);
            }
        });

        if (this.player.y > 600) this.handleGameOver();
    }

    checkJump() {
        if (this.isGameOver || this.isGameWon) return;
        let onGround = this.player.body.blocked.down || this.player.body.touching.down;

        if (onGround) {
            this.player.setVelocityY(-280);
            this.jumpCount = 1;
            this.lastActionTime = this.time.now;
            this.playJumpEffects();
        } else if (this.jumpCount === 1) {
            this.player.setVelocityY(-240);
            this.jumpCount = 2;
            this.lastActionTime = this.time.now;
            this.playJumpEffects(true);
        }
    }

    playJumpEffects(isDouble = false) {
        this.tweens.add({
            targets: this.playerVisual,
            displayWidth: 48 * 0.75, displayHeight: 48 * 1.25,
            duration: 120, yoyo: true, repeat: 0,
            onComplete: () => this.playerVisual.setDisplaySize(48, 48)
        });
        const particleColor = isDouble ? 'part_red' : 'part_white';
        const jumpPart = this.add.particles(this.player.x, this.player.y + 16, particleColor, {
            speed: { min: 10, max: 60 }, angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 }, alpha: { start: 0.7, end: 0 },
            lifespan: 350, quantity: isDouble ? 10 : 6, blendMode: 'ADD'
        });
        jumpPart.explode();
    }

    collectGem(player, gem) {
        gem.disableBody(true, true);
        this.collectedGems++;
        this.updateHUDText();
        const gemPart = this.add.particles(gem.x, gem.y, 'part_yellow', {
            speed: { min: 30, max: 90 }, angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 }, alpha: { start: 0.8, end: 0 },
            lifespan: 500, quantity: 8, blendMode: 'ADD'
        });
        gemPart.explode();
    }

    updateHUDText() {
        document.getElementById('hud-gems').innerText = `${this.collectedGems} / ${this.totalGems}`;
    }

    handleGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.cameras.main.shake(250, 0.015);

        const failParticles = this.add.particles(this.player.x, this.player.y, 'part_red', {
            speed: { min: 40, max: 150 }, scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 }, lifespan: 600, quantity: 25, blendMode: 'ADD'
        });
        failParticles.explode();

        this.player.setVisible(false);
        this.playerVisual.setVisible(false);

        document.getElementById('hud-status').innerText = 'SEÑAL PERDIDA';
        document.getElementById('hud-status').className = 'hud-value neon-text-red';

        this.time.delayedCall(800, () => {
            document.getElementById('gameover-overlay').classList.add('active');
            document.getElementById('game-hud').classList.remove('active');
        });
    }

    winGame() {
        if (this.isGameWon || this.isGameOver) return;

        if (this.collectedGems < this.totalGems) {
            let warningText = this.add.text(this.player.x, this.player.y - 45, '¡NECESITAS TODAS LAS GEMAS!', {
                fontFamily: 'Orbitron', fontSize: '18px', fontWeight: '900',
                fill: '#facc15', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5);

            this.tweens.add({
                targets: warningText, y: warningText.y - 30, alpha: 0,
                duration: 1500, onComplete: () => warningText.destroy()
            });

            if (this.player.x < this.portal.x) {
                this.player.setVelocityX(-220); this.player.setVelocityY(-180);
            } else {
                this.player.setVelocityX(220); this.player.setVelocityY(-180);
            }
            return;
        }

        this.isGameWon = true;
        this.physics.pause();
        this.portalParticles.stop();
        this.player.body.enable = false;

        this.tweens.add({
            targets: this.playerVisual,
            x: this.portal.x, y: this.portal.y,
            scaleX: 0, scaleY: 0, alpha: 0, rotation: 6.28,
            duration: 700, ease: 'Power2.easeOut',
            onComplete: () => {
                document.querySelector('.win-panel h2').innerText = '¡LUNA COLONIZADA!';
                document.querySelector('.win-panel p').innerText = '¡Rumbo a Marte, el siguiente objetivo!';
                document.getElementById('btn-next-level').style.display = 'inline-block';

                document.getElementById('win-gems').innerText = `${this.collectedGems} / ${this.totalGems}`;
                document.getElementById('win-overlay').classList.add('active');
                document.getElementById('game-hud').classList.remove('active');
            }
        });
    }

    setPlayerTexture(key) {
        if (this.playerVisual.texture.key !== key) {
            this.playerVisual.setTexture(key);
            this.playerVisual.setDisplaySize(48, 48);
        }
    }
}

// ============================================================================
// NIVEL 2 - MARTE (Level2Scene) - Gravedad marciana (intermedia)
// ============================================================================
class Level2Scene extends Phaser.Scene {
    constructor() {
        super({key: 'Level2Scene'});
    }

    init() {
        this.collectedGems = 0;
        this.totalGems = 0;
        this.wasOnGround = true;
        this.jumpCount = 0;
        this.isGameOver = false;
        this.isGameWon = false;
        this.lastMovedDir = 'right';
        this.lastActionTime = 0;
        this.visualOffsetY = -4;
        this.optionsPausedPhysics = false;
    }

    preload() {
        this.load.image('frontal', 'Recursos/frontal.png');
        this.load.image('derecha', 'Recursos/derecha.png');
        this.load.image('izquierda', 'Recursos/izquierda.png');
        this.load.image('saltoDerecha', 'Recursos/saltoDerecha.png');
        this.load.image('saltoIzquierda', 'Recursos/saltoIzquierda.png');
    }

    create() {
        this.isGameOver = false;
        this.isGameWon = false;

        createSharedTextures(this);
        this.physics.resume();
        this.lastActionTime = this.time.now;

        const levelWidth = 3200;
        const levelHeight = 576;

        this.physics.world.gravity.y = 620; // Gravedad marciana (intermedia entre Luna y Tierra)

        this.physics.world.setBounds(0, 0, levelWidth, levelHeight + 100);
        this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);

        // --- Fondo: cielo rojizo con polvo suspendido ---
        for (let i = 0; i < 150; i++) {
            let x = Phaser.Math.Between(0, levelWidth);
            let y = Phaser.Math.Between(0, levelHeight - 100);
            let size = Phaser.Math.Between(1, 3);
            let alpha = Phaser.Math.FloatBetween(0.15, 0.5);
            let dustColor = Phaser.Utils.Array.GetRandom([0xfca5a5, 0xf97316, 0xfdba74]);
            let dust = this.add.circle(x, y, size, dustColor, alpha);
            dust.setScrollFactor(Phaser.Math.FloatBetween(0.02, 0.15));
        }

        // --- Plataformas estáticas marcianas ---
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(400, 556, 'plat_mars_800');
        this.platforms.create(1450, 556, 'plat_mars_700');
        this.platforms.create(2600, 556, 'plat_mars_1200');
        this.platforms.create(900, 500, 'plat_mars_150');
        this.platforms.create(1450, 400, 'plat_mars_200');
        this.platforms.create(1650, 310, 'plat_mars_150');
        this.platforms.create(2150, 440, 'plat_mars_200');
        this.platforms.create(2400, 360, 'plat_mars_200');
        this.platforms.create(2650, 270, 'plat_mars_150');
        this.platforms.refresh();

        // --- Plataformas móviles ---
        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });

        let verticalPlat = this.movingPlatforms.create(1200, 380, 'plat_mars_100');
        verticalPlat.name = 'vertical';
        verticalPlat.body.setVelocityY(-100);
        verticalPlat.body.setFriction(1, 1);

        let horizontalPlat = this.movingPlatforms.create(1900, 380, 'plat_mars_120');
        horizontalPlat.name = 'horizontal';
        horizontalPlat.body.setVelocityX(120);
        horizontalPlat.body.setFriction(1, 1);

        this.movingPlatforms.getChildren().forEach(p => p.body.setImmovable(true));

        // --- Portal ---
        this.portal = this.physics.add.sprite(3050, 496, 'portal_tex');
        this.portal.body.allowGravity = false;
        this.portal.body.setImmovable(true);

        this.portalParticles = this.add.particles(this.portal.x, this.portal.y, 'part_green', {
            speedY: { min: -100, max: -30 }, speedX: { min: -20, max: 20 },
            scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 },
            lifespan: 1000, frequency: 100, blendMode: 'ADD'
        });

        // --- Gemas ---
        this.gems = this.physics.add.group({ allowGravity: false });
        const gemCoords = [
            {x: 400, y: 480}, {x: 600, y: 420}, {x: 900, y: 370}, {x: 1200, y: 220},
            {x: 1450, y: 320}, {x: 1650, y: 230}, {x: 1950, y: 280}, {x: 2150, y: 360},
            {x: 2400, y: 280}, {x: 2650, y: 190}
        ];

        gemCoords.forEach(coord => {
            let gem = this.gems.create(coord.x, coord.y, 'gem_tex');
            gem.body.setImmovable(true);
            this.tweens.add({
                targets: gem, y: coord.y - 12,
                duration: 1500 + Phaser.Math.Between(-200, 200),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        });
        this.totalGems = gemCoords.length;

        // --- Personaje ---
        this.player = this.physics.add.sprite(100, 450, 'frontal');
        this.player.setCollideWorldBounds(false);
        this.player.body.setGravityY(620);
        this.player.body.setMaxVelocity(400, 800);
        this.player.setOrigin(0.5, 0.5);
        this.player.setAlpha(0);
        this.player.body.setSize(32, 32);

        this.playerVisual = this.add.sprite(100, 450, 'frontal');
        this.playerVisual.setOrigin(0.5, 0.5);
        this.playerVisual.setDisplaySize(48, 48);
        this.playerVisual.setVisible(true);
        this.playerVisual.setActive(true);

        // --- Colisiones ---
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.movingPlatforms);
        this.physics.add.overlap(this.player, this.gems, this.collectGem, null, this);
        this.physics.add.overlap(this.player, this.portal, this.winGame, null, this);

        // --- Controles ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

        this.input.keyboard.on('keydown-SPACE', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-UP', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-W', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-ESC', () => { openOptionsOverlay(); });

        // --- Cámara y HUD ---
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.updateHUDText();
        ensureHudOptionsButton();
        document.getElementById('game-hud').classList.add('active');
        document.getElementById('hud-status').innerText = 'SECTOR MARCIANO';
        document.getElementById('hud-status').className = 'hud-value neon-glow-cyan';
    }

    update() {
        if (this.isGameOver || this.isGameWon) return;

        let isMovingLeft = this.cursors.left.isDown || this.keyA.isDown;
        let isMovingRight = this.cursors.right.isDown || this.keyD.isDown;

        if (isMovingLeft) {
            this.player.setVelocityX(-260);
            this.playerVisual.setAngle(-8);
            this.lastMovedDir = 'left';
            this.lastActionTime = this.time.now;
        } else if (isMovingRight) {
            this.player.setVelocityX(260);
            this.playerVisual.setAngle(8);
            this.lastMovedDir = 'right';
            this.lastActionTime = this.time.now;
        } else {
            this.player.setVelocityX(0);
            this.playerVisual.setAngle(0);
        }

        this.playerVisual.x = this.player.x;
        this.playerVisual.y = this.player.y + this.visualOffsetY;

        let onGround = this.player.body.blocked.down || this.player.body.touching.down;
        let textureToUse = 'frontal';

        if (!onGround) {
            this.lastActionTime = this.time.now;
            textureToUse = (isMovingLeft || this.lastMovedDir === 'left') ? 'saltoIzquierda' : 'saltoDerecha';
        } else {
            if (isMovingLeft) {
                textureToUse = 'izquierda';
            } else if (isMovingRight) {
                textureToUse = 'derecha';
            } else {
                if (this.time.now - this.lastActionTime >= 750) {
                    textureToUse = 'frontal';
                } else {
                    textureToUse = (this.lastMovedDir === 'left') ? 'izquierda' : 'derecha';
                }
            }
        }
        this.setPlayerTexture(textureToUse);

        if (onGround && !this.wasOnGround) {
            this.jumpCount = 0;
            this.lastActionTime = this.time.now;
            this.tweens.add({
                targets: this.playerVisual,
                displayWidth: 48 * 1.3, displayHeight: 48 * 0.7,
                duration: 80, yoyo: true, repeat: 0,
                onComplete: () => this.playerVisual.setDisplaySize(48, 48)
            });
            const landPart = this.add.particles(this.player.x, this.player.y + 16, 'part_orange', {
                speed: { min: 10, max: 60 }, angle: { min: 200, max: 340 },
                scale: { start: 0.8, end: 0 }, alpha: { start: 0.6, end: 0 },
                lifespan: 250, quantity: 6, blendMode: 'ADD'
            });
            landPart.explode();
        }
        this.wasOnGround = onGround;

        this.movingPlatforms.getChildren().forEach(p => {
            if (p.name === 'vertical') {
                if (p.y <= 250) p.body.setVelocityY(100);
                else if (p.y >= 470) p.body.setVelocityY(-100);
            } else if (p.name === 'horizontal') {
                if (p.x <= 1750) p.body.setVelocityX(120);
                else if (p.x >= 2050) p.body.setVelocityX(-120);
            }
        });

        if (this.player.y > 600) this.handleGameOver();
    }

    checkJump() {
        if (this.isGameOver || this.isGameWon) return;
        let onGround = this.player.body.blocked.down || this.player.body.touching.down;

        if (onGround) {
            this.player.setVelocityY(-380);
            this.jumpCount = 1;
            this.lastActionTime = this.time.now;
            this.playJumpEffects();
        } else if (this.jumpCount === 1) {
            this.player.setVelocityY(-340);
            this.jumpCount = 2;
            this.lastActionTime = this.time.now;
            this.playJumpEffects(true);
        }
    }

    playJumpEffects(isDouble = false) {
        this.tweens.add({
            targets: this.playerVisual,
            displayWidth: 48 * 0.7, displayHeight: 48 * 1.3,
            duration: 100, yoyo: true, repeat: 0,
            onComplete: () => this.playerVisual.setDisplaySize(48, 48)
        });
        const particleColor = isDouble ? 'part_red' : 'part_orange';
        const jumpPart = this.add.particles(this.player.x, this.player.y + 16, particleColor, {
            speed: { min: 20, max: 90 }, angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 },
            lifespan: 300, quantity: isDouble ? 12 : 8, blendMode: 'ADD'
        });
        jumpPart.explode();
    }

    collectGem(player, gem) {
        gem.disableBody(true, true);
        this.collectedGems++;
        this.updateHUDText();
        const gemPart = this.add.particles(gem.x, gem.y, 'part_yellow', {
            speed: { min: 40, max: 120 }, angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 }, alpha: { start: 0.9, end: 0 },
            lifespan: 400, quantity: 12, blendMode: 'ADD'
        });
        gemPart.explode();
    }

    updateHUDText() {
        document.getElementById('hud-gems').innerText = `${this.collectedGems} / ${this.totalGems}`;
    }

    handleGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.cameras.main.shake(250, 0.015);

        const failParticles = this.add.particles(this.player.x, this.player.y, 'part_red', {
            speed: { min: 40, max: 150 }, scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 }, lifespan: 600, quantity: 25, blendMode: 'ADD'
        });
        failParticles.explode();

        this.player.setVisible(false);
        this.playerVisual.setVisible(false);

        document.getElementById('hud-status').innerText = 'CONEXIÓN PERDIDA';
        document.getElementById('hud-status').className = 'hud-value neon-text-red';

        this.time.delayedCall(800, () => {
            document.getElementById('gameover-overlay').classList.add('active');
            document.getElementById('game-hud').classList.remove('active');
        });
    }

    winGame() {
        if (this.isGameWon || this.isGameOver) return;

        if (this.collectedGems < this.totalGems) {
            let warningText = this.add.text(this.player.x, this.player.y - 45, '¡NECESITAS TODAS LAS GEMAS!', {
                fontFamily: 'Orbitron', fontSize: '18px', fontWeight: '900',
                fill: '#facc15', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5);

            this.tweens.add({
                targets: warningText, y: warningText.y - 30, alpha: 0,
                duration: 1500, onComplete: () => warningText.destroy()
            });

            if (this.player.x < this.portal.x) {
                this.player.setVelocityX(-220); this.player.setVelocityY(-180);
            } else {
                this.player.setVelocityX(220); this.player.setVelocityY(-180);
            }
            return;
        }

        this.isGameWon = true;
        this.physics.pause();
        this.portalParticles.stop();
        this.player.body.enable = false;

        this.tweens.add({
            targets: this.playerVisual,
            x: this.portal.x, y: this.portal.y,
            scaleX: 0, scaleY: 0, alpha: 0, rotation: 6.28,
            duration: 700, ease: 'Power2.easeOut',
            onComplete: () => {
                document.querySelector('.win-panel h2').innerText = '¡MARTE ASEGURADO!';
                document.querySelector('.win-panel p').innerText = 'Próxima parada: la órbita de Júpiter.';
                document.getElementById('btn-next-level').style.display = 'inline-block';

                document.getElementById('win-gems').innerText = `${this.collectedGems} / ${this.totalGems}`;
                document.getElementById('win-overlay').classList.add('active');
                document.getElementById('game-hud').classList.remove('active');
            }
        });
    }

    setPlayerTexture(key) {
        if (this.playerVisual.texture.key !== key) {
            this.playerVisual.setTexture(key);
            this.playerVisual.setDisplaySize(48, 48);
        }
    }
}

// ============================================================================
// NIVEL 3 - JÚPITER / LUNA JOVIANA (Level3Scene) - BASE INICIAL
// Escena base y funcional, pensada para expandirse más adelante con más
// plataformas, obstáculos propios y mecánicas específicas del planeta.
// ============================================================================
class Level3Scene extends Phaser.Scene {
    constructor() {
        super({key: 'Level3Scene'});
    }

    init() {
        this.collectedGems = 0;
        this.totalGems = 0;
        this.wasOnGround = true;
        this.jumpCount = 0;
        this.isGameOver = false;
        this.isGameWon = false;
        this.lastMovedDir = 'right';
        this.lastActionTime = 0;
        this.visualOffsetY = -4;
        this.optionsPausedPhysics = false;
    }

    preload() {
        this.load.image('frontal', 'Recursos/frontal.png');
        this.load.image('derecha', 'Recursos/derecha.png');
        this.load.image('izquierda', 'Recursos/izquierda.png');
        this.load.image('saltoDerecha', 'Recursos/saltoDerecha.png');
        this.load.image('saltoIzquierda', 'Recursos/saltoIzquierda.png');
    }

    create() {
        this.isGameOver = false;
        this.isGameWon = false;

        createSharedTextures(this);
        this.physics.resume();
        this.lastActionTime = this.time.now;

        const levelWidth = 3200;
        const levelHeight = 576;

        this.physics.world.gravity.y = 900; // Alta gravedad efectiva (luna joviana densa, ajustable)

        this.physics.world.setBounds(0, 0, levelWidth, levelHeight + 100);
        this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);

        // --- Fondo: Júpiter gigante dominando el cielo ---
        let jupiter = this.add.sprite(1600, 150, 'jupiter_bg_tex');
        jupiter.setDisplaySize(260, 260);
        jupiter.setScrollFactor(0.01);

        for (let i = 0; i < 150; i++) {
            let x = Phaser.Math.Between(0, levelWidth);
            let y = Phaser.Math.Between(0, levelHeight - 100);
            let size = Phaser.Math.Between(1, 2);
            let alpha = Phaser.Math.FloatBetween(0.3, 0.7);
            let starColor = Phaser.Utils.Array.GetRandom([0xffffff, 0xfef3c7, 0xfde68a]);
            let star = this.add.circle(x, y, size, starColor, alpha);
            star.setScrollFactor(Phaser.Math.FloatBetween(0.01, 0.1));
        }

        // --- Plataformas base (simples, listas para ampliar) ---
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(400, 556, 'plat_jupiter_800');
        this.platforms.create(1450, 556, 'plat_jupiter_700');
        this.platforms.create(2600, 556, 'plat_jupiter_1200');
        this.platforms.create(900, 480, 'plat_jupiter_150');
        this.platforms.create(1450, 380, 'plat_jupiter_200');
        this.platforms.create(1900, 300, 'plat_jupiter_150');
        this.platforms.create(2350, 400, 'plat_jupiter_200');
        this.platforms.refresh();

        // --- Plataformas móviles base ---
        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });

        let verticalPlat = this.movingPlatforms.create(1200, 380, 'plat_jupiter_100');
        verticalPlat.name = 'vertical';
        verticalPlat.body.setVelocityY(-110);
        verticalPlat.body.setFriction(1, 1);

        let horizontalPlat = this.movingPlatforms.create(2050, 350, 'plat_jupiter_120');
        horizontalPlat.name = 'horizontal';
        horizontalPlat.body.setVelocityX(130);
        horizontalPlat.body.setFriction(1, 1);

        this.movingPlatforms.getChildren().forEach(p => p.body.setImmovable(true));

        // --- Portal ---
        this.portal = this.physics.add.sprite(3050, 496, 'portal_tex');
        this.portal.body.allowGravity = false;
        this.portal.body.setImmovable(true);

        this.portalParticles = this.add.particles(this.portal.x, this.portal.y, 'part_green', {
            speedY: { min: -100, max: -30 }, speedX: { min: -20, max: 20 },
            scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 },
            lifespan: 1000, frequency: 100, blendMode: 'ADD'
        });

        // --- Gemas (set base, ampliable) ---
        this.gems = this.physics.add.group({ allowGravity: false });
        const gemCoords = [
            {x: 400, y: 480}, {x: 700, y: 400}, {x: 900, y: 350}, {x: 1450, y: 300},
            {x: 1900, y: 220}, {x: 2350, y: 300}, {x: 2650, y: 200}
        ];

        gemCoords.forEach(coord => {
            let gem = this.gems.create(coord.x, coord.y, 'gem_tex');
            gem.body.setImmovable(true);
            this.tweens.add({
                targets: gem, y: coord.y - 12,
                duration: 1500 + Phaser.Math.Between(-200, 200),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        });
        this.totalGems = gemCoords.length;

        // --- Personaje ---
        this.player = this.physics.add.sprite(100, 450, 'frontal');
        this.player.setCollideWorldBounds(false);
        this.player.body.setGravityY(900);
        this.player.body.setMaxVelocity(420, 850);
        this.player.setOrigin(0.5, 0.5);
        this.player.setAlpha(0);
        this.player.body.setSize(32, 32);

        this.playerVisual = this.add.sprite(100, 450, 'frontal');
        this.playerVisual.setOrigin(0.5, 0.5);
        this.playerVisual.setDisplaySize(48, 48);
        this.playerVisual.setVisible(true);
        this.playerVisual.setActive(true);

        // --- Colisiones ---
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.movingPlatforms);
        this.physics.add.overlap(this.player, this.gems, this.collectGem, null, this);
        this.physics.add.overlap(this.player, this.portal, this.winGame, null, this);

        // --- Controles ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

        this.input.keyboard.on('keydown-SPACE', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-UP', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-W', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-ESC', () => { openOptionsOverlay(); });

        // --- Cámara y HUD ---
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.updateHUDText();
        ensureHudOptionsButton();
        document.getElementById('game-hud').classList.add('active');
        document.getElementById('hud-status').innerText = 'ÓRBITA DE JÚPITER';
        document.getElementById('hud-status').className = 'hud-value neon-glow-cyan';
    }

    update() {
        if (this.isGameOver || this.isGameWon) return;

        let isMovingLeft = this.cursors.left.isDown || this.keyA.isDown;
        let isMovingRight = this.cursors.right.isDown || this.keyD.isDown;

        if (isMovingLeft) {
            this.player.setVelocityX(-270);
            this.playerVisual.setAngle(-8);
            this.lastMovedDir = 'left';
            this.lastActionTime = this.time.now;
        } else if (isMovingRight) {
            this.player.setVelocityX(270);
            this.playerVisual.setAngle(8);
            this.lastMovedDir = 'right';
            this.lastActionTime = this.time.now;
        } else {
            this.player.setVelocityX(0);
            this.playerVisual.setAngle(0);
        }

        this.playerVisual.x = this.player.x;
        this.playerVisual.y = this.player.y + this.visualOffsetY;

        let onGround = this.player.body.blocked.down || this.player.body.touching.down;
        let textureToUse = 'frontal';

        if (!onGround) {
            this.lastActionTime = this.time.now;
            textureToUse = (isMovingLeft || this.lastMovedDir === 'left') ? 'saltoIzquierda' : 'saltoDerecha';
        } else {
            if (isMovingLeft) {
                textureToUse = 'izquierda';
            } else if (isMovingRight) {
                textureToUse = 'derecha';
            } else {
                if (this.time.now - this.lastActionTime >= 750) {
                    textureToUse = 'frontal';
                } else {
                    textureToUse = (this.lastMovedDir === 'left') ? 'izquierda' : 'derecha';
                }
            }
        }
        this.setPlayerTexture(textureToUse);

        if (onGround && !this.wasOnGround) {
            this.jumpCount = 0;
            this.lastActionTime = this.time.now;
            this.tweens.add({
                targets: this.playerVisual,
                displayWidth: 48 * 1.3, displayHeight: 48 * 0.7,
                duration: 80, yoyo: true, repeat: 0,
                onComplete: () => this.playerVisual.setDisplaySize(48, 48)
            });
            const landPart = this.add.particles(this.player.x, this.player.y + 16, 'part_white', {
                speed: { min: 10, max: 60 }, angle: { min: 200, max: 340 },
                scale: { start: 0.8, end: 0 }, alpha: { start: 0.6, end: 0 },
                lifespan: 250, quantity: 6, blendMode: 'ADD'
            });
            landPart.explode();
        }
        this.wasOnGround = onGround;

        this.movingPlatforms.getChildren().forEach(p => {
            if (p.name === 'vertical') {
                if (p.y <= 250) p.body.setVelocityY(110);
                else if (p.y >= 470) p.body.setVelocityY(-110);
            } else if (p.name === 'horizontal') {
                if (p.x <= 1850) p.body.setVelocityX(130);
                else if (p.x >= 2200) p.body.setVelocityX(-130);
            }
        });

        if (this.player.y > 600) this.handleGameOver();
    }

    checkJump() {
        if (this.isGameOver || this.isGameWon) return;
        let onGround = this.player.body.blocked.down || this.player.body.touching.down;

        if (onGround) {
            this.player.setVelocityY(-460);
            this.jumpCount = 1;
            this.lastActionTime = this.time.now;
            this.playJumpEffects();
        } else if (this.jumpCount === 1) {
            this.player.setVelocityY(-420);
            this.jumpCount = 2;
            this.lastActionTime = this.time.now;
            this.playJumpEffects(true);
        }
    }

    playJumpEffects(isDouble = false) {
        this.tweens.add({
            targets: this.playerVisual,
            displayWidth: 48 * 0.7, displayHeight: 48 * 1.3,
            duration: 100, yoyo: true, repeat: 0,
            onComplete: () => this.playerVisual.setDisplaySize(48, 48)
        });
        const particleColor = isDouble ? 'part_red' : 'part_white';
        const jumpPart = this.add.particles(this.player.x, this.player.y + 16, particleColor, {
            speed: { min: 20, max: 90 }, angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 },
            lifespan: 300, quantity: isDouble ? 12 : 8, blendMode: 'ADD'
        });
        jumpPart.explode();
    }

    collectGem(player, gem) {
        gem.disableBody(true, true);
        this.collectedGems++;
        this.updateHUDText();
        const gemPart = this.add.particles(gem.x, gem.y, 'part_yellow', {
            speed: { min: 40, max: 120 }, angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 }, alpha: { start: 0.9, end: 0 },
            lifespan: 400, quantity: 12, blendMode: 'ADD'
        });
        gemPart.explode();
    }

    updateHUDText() {
        document.getElementById('hud-gems').innerText = `${this.collectedGems} / ${this.totalGems}`;
    }

    handleGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.cameras.main.shake(250, 0.015);

        const failParticles = this.add.particles(this.player.x, this.player.y, 'part_red', {
            speed: { min: 40, max: 150 }, scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 }, lifespan: 600, quantity: 25, blendMode: 'ADD'
        });
        failParticles.explode();

        this.player.setVisible(false);
        this.playerVisual.setVisible(false);

        document.getElementById('hud-status').innerText = 'SEÑAL PERDIDA';
        document.getElementById('hud-status').className = 'hud-value neon-text-red';

        this.time.delayedCall(800, () => {
            document.getElementById('gameover-overlay').classList.add('active');
            document.getElementById('game-hud').classList.remove('active');
        });
    }

    winGame() {
        if (this.isGameWon || this.isGameOver) return;

        if (this.collectedGems < this.totalGems) {
            let warningText = this.add.text(this.player.x, this.player.y - 45, '¡NECESITAS TODAS LAS GEMAS!', {
                fontFamily: 'Orbitron', fontSize: '18px', fontWeight: '900',
                fill: '#facc15', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5);

            this.tweens.add({
                targets: warningText, y: warningText.y - 30, alpha: 0,
                duration: 1500, onComplete: () => warningText.destroy()
            });

            if (this.player.x < this.portal.x) {
                this.player.setVelocityX(-220); this.player.setVelocityY(-180);
            } else {
                this.player.setVelocityX(220); this.player.setVelocityY(-180);
            }
            return;
        }

        this.isGameWon = true;
        this.physics.pause();
        this.portalParticles.stop();
        this.player.body.enable = false;

        this.tweens.add({
            targets: this.playerVisual,
            x: this.portal.x, y: this.portal.y,
            scaleX: 0, scaleY: 0, alpha: 0, rotation: 6.28,
            duration: 700, ease: 'Power2.easeOut',
            onComplete: () => {
                document.querySelector('.win-panel h2').innerText = '¡CAMPAÑA COMPLETADA!';
                document.querySelector('.win-panel p').innerText = '¡Has conquistado la órbita de Júpiter!';
                document.getElementById('btn-next-level').style.display = 'none'; // Último nivel disponible por ahora

                document.getElementById('win-gems').innerText = `${this.collectedGems} / ${this.totalGems}`;
                document.getElementById('win-overlay').classList.add('active');
                document.getElementById('game-hud').classList.remove('active');
            }
        });
    }

    setPlayerTexture(key) {
        if (this.playerVisual.texture.key !== key) {
            this.playerVisual.setTexture(key);
            this.playerVisual.setDisplaySize(48, 48);
        }
    }
}

// ============================================================================
// ESCENA DE MENÚ DE INICIO (MainMenuScene)
// ============================================================================
class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        document.getElementById('menu-overlay').classList.add('active');
        document.getElementById('win-overlay').classList.remove('active');
        document.getElementById('gameover-overlay').classList.remove('active');
        document.getElementById('game-hud').classList.remove('active');

        const optOverlay = document.getElementById('options-overlay');
        if (optOverlay) optOverlay.classList.remove('active');

        // --- BOTÓN NIVEL 1 (Luna) ---
        const playBtn = document.getElementById('btn-play');
        playBtn.querySelector('.btn-text').innerText = 'NIVEL 1 - LUNA';
        playBtn.onclick = () => {
            document.getElementById('menu-overlay').classList.remove('active');
            currentLevelKey = 'Level1Scene';
            this.scene.start('Level1Scene');
        };

        // --- BOTÓN NIVEL 2 (Marte) ---
        let level2Btn = document.getElementById('btn-play-level2');
        if (!level2Btn) {
            level2Btn = document.createElement('button');
            level2Btn.id = 'btn-play-level2';
            level2Btn.className = playBtn.className;
            level2Btn.innerHTML = `<span class="btn-text">NIVEL 2 - MARTE</span><span class="btn-glow"></span>`;
            level2Btn.style.marginTop = '14px';
            playBtn.insertAdjacentElement('afterend', level2Btn);
        }
        level2Btn.onclick = () => {
            document.getElementById('menu-overlay').classList.remove('active');
            currentLevelKey = 'Level2Scene';
            this.scene.start('Level2Scene');
        };

        // --- BOTÓN NIVEL 3 (Júpiter) ---
        let level3Btn = document.getElementById('btn-play-level3');
        if (!level3Btn) {
            level3Btn = document.createElement('button');
            level3Btn.id = 'btn-play-level3';
            level3Btn.className = playBtn.className;
            level3Btn.innerHTML = `<span class="btn-text">NIVEL 3 - JÚPITER</span><span class="btn-glow"></span>`;
            level3Btn.style.marginTop = '14px';
            level2Btn.insertAdjacentElement('afterend', level3Btn);
        }
        level3Btn.onclick = () => {
            document.getElementById('menu-overlay').classList.remove('active');
            currentLevelKey = 'Level3Scene';
            this.scene.start('Level3Scene');
        };

        // --- BOTÓN OPCIONES ---
        let optionsBtn = document.getElementById('btn-options-menu');
        if (!optionsBtn) {
            optionsBtn = document.createElement('button');
            optionsBtn.id = 'btn-options-menu';
            optionsBtn.className = 'btn-neon blue';
            optionsBtn.innerHTML = `<span class="btn-text">OPCIONES</span><span class="btn-glow"></span>`;
            optionsBtn.style.marginTop = '20px';
            level3Btn.insertAdjacentElement('afterend', optionsBtn);
        }
        optionsBtn.onclick = () => {
            openOptionsOverlay();
        };
    }
}

// ============================================================================
// CONFIGURACIÓN GLOBAL DEL JUEGO
// ============================================================================
const configN1 = {
    type: Phaser.AUTO,
    width: 1024,
    height: 576,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: [MainMenuScene, Level1Scene, Level2Scene, Level3Scene]
};

const game = new Phaser.Game(configN1);

// ============================================================================
// VINCULACIÓN DE BOTONES HTML (Gestores de eventos globales fuera de Phaser)
// ============================================================================

// Variable global que rastrea qué escena de nivel está activa actualmente
let currentLevelKey = 'Level1Scene';

const restartActiveScene = () => {
    document.getElementById('win-overlay').classList.remove('active');
    document.getElementById('gameover-overlay').classList.remove('active');

    const activeScene = game.scene.getScene(currentLevelKey);
    if (activeScene) {
        activeScene.scene.restart();
    }
};

document.getElementById('btn-restart-win').onclick = restartActiveScene;
document.getElementById('btn-restart-fail').onclick = restartActiveScene;

// --- BOTÓN "VOLVER AL MENÚ PRINCIPAL" al morir (creado dinámicamente) ---
const restartFailBtn = document.getElementById('btn-restart-fail');

let menuBtnFail = document.getElementById('btn-menu-fail');
if (!menuBtnFail) {
    menuBtnFail = document.createElement('button');
    menuBtnFail.id = 'btn-menu-fail';
    menuBtnFail.className = restartFailBtn.className;
    menuBtnFail.innerHTML = `<span class="btn-text">VOLVER AL MENÚ PRINCIPAL</span><span class="btn-glow"></span>`;
    menuBtnFail.style.marginTop = '14px';
    restartFailBtn.insertAdjacentElement('afterend', menuBtnFail);
}

menuBtnFail.onclick = () => {
    document.getElementById('gameover-overlay').classList.remove('active');
    const activeScene = game.scene.getScene(currentLevelKey);
    if (activeScene) {
        activeScene.scene.stop();
    }
    game.scene.start('MainMenuScene');
};

// Botón de siguiente nivel: avanza según el orden Luna -> Marte -> Júpiter
document.getElementById('btn-next-level').onclick = () => {
    document.getElementById('win-overlay').classList.remove('active');
    document.getElementById('btn-next-level').style.display = 'none';

    const nextLevel = getNextLevelKey(currentLevelKey);
    if (nextLevel) {
        game.scene.stop(currentLevelKey);
        currentLevelKey = nextLevel;
        game.scene.start(nextLevel);
    }
};