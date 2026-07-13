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

// ============================================================================
// PROGRESO GLOBAL DEL JUGADOR (persiste entre reinicios de escena/fase)
// hasDoubleJumpBoots se desbloquea al derrotar al Centinela Marciano
// (Nivel 2 - Fase 2). Hasta entonces, el doble salto está desactivado en
// TODAS las fases del Nivel 1 y el Nivel 2.
// ============================================================================
let playerProgress = {
    hasDoubleJumpBoots: false
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
        { w: 800, h: 40 }, { w: 700, h: 40 }, { w: 1200, h: 40 },{ w: 600, h: 40 },{ w: 400, h: 40 },{ w: 500, h: 40 },{ w: 900, h: 40 },
        { w: 200, h: 20 }, { w: 150, h: 20 }, { w: 120, h: 20 }, { w: 100, h: 20 }, {w: 200, h: 20 }
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

    // --- Botas de doble salto (recompensa al derrotar al Centinela Marciano) ---
    // NOTA DE ARTE: no se subió ningún archivo "botas.png" en Recursos todavía,
    // así que se genera un ícono placeholder por canvas. Cuando exista el arte
    // definitivo, basta con reemplazar este bloque por
    // scene.load.image('botas', 'Recursos/botas.png') en el preload().
    if (!scene.textures.exists('boots_tex')) {
        let bCanvas = scene.textures.createCanvas('boots_tex', 32, 24);
        let bCtx = bCanvas.context;
        bCtx.fillStyle = '#7c3aed';
        bCtx.fillRect(2, 4, 12, 16);
        bCtx.fillRect(18, 4, 12, 16);
        bCtx.fillStyle = '#a855f7';
        bCtx.fillRect(2, 14, 12, 6);
        bCtx.fillRect(18, 14, 12, 6);
        bCtx.fillStyle = '#e9d5ff';
        bCtx.fillRect(2, 4, 12, 3);
        bCtx.fillRect(18, 4, 12, 3);
        bCanvas.refresh();
    }

    // --- Partículas ---
    createParticleTexture(scene, 'part_white', '#ffffff');
    createParticleTexture(scene, 'part_magenta', '#ec4899');
    createParticleTexture(scene, 'part_yellow', '#facc15');
    createParticleTexture(scene, 'part_red', '#ef4444');
    createParticleTexture(scene, 'part_green', '#10b981');
    createParticleTexture(scene, 'part_orange', '#fb923c');
    createParticleTexture(scene, 'part_cyan', '#22d3ee');

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
// CLASE BASE - Toda la lógica común a los 3 niveles
// ============================================================================
class BasePlanetScene extends Phaser.Scene {
    constructor(config) {
        super({ key: config.key });
        this.levelConfig = config;
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

        // --- Sistema de oxígeno (solo para niveles con usesOxygen: true) ---
        this.usesOxygen = !!this.levelConfig.usesOxygen;
        this.oxygenMax = this.levelConfig.oxygenMax || 100;
        this.oxygenCurrent = this.oxygenMax;

        this.textureOffsets = {
            frontal:        { x: 1.5, y: 2 },
            derecha:        { x: 3, y: 1 },
            izquierda:      { x: -3, y: 1 },
            saltoDerecha:   { x: 4, y: 2 },
            saltoIzquierda: { x: -4, y: 2 }
        };
    }

    preload() {
        this.load.image('marciano', 'Recursos/marciano.png');
        this.load.image('frontal', 'Recursos/frontal.png');
        this.load.image('derecha', 'Recursos/derecha.png');
        this.load.image('izquierda', 'Recursos/izquierda.png');
        this.load.image('saltoDerecha', 'Recursos/saltoDerecha.png');
        this.load.image('saltoIzquierda', 'Recursos/saltoIzquierda.png');
        if (this.levelConfig.portalTexture === 'nave') {
            this.load.image('nave', 'Recursos/nave.png');
        } else if (this.levelConfig.portalTexture === 'nave1') {
            this.load.image('nave1', 'Recursos/nave1.png');
        }
        if (this.levelConfig.usesOxygen) {
            this.load.image('oxygen_pickup', 'Recursos/oxygen.png');
        }
    }

    create() {
        this.isGameOver = false;
        this.isGameWon = false;

        createSharedTextures(this);
        this.physics.resume();
        this.lastActionTime = this.time.now;

        const levelWidth = 3200;
        const levelHeight = 576;
        const cfg = this.levelConfig;

        this.physics.world.gravity.y = cfg.gravity;
        this.physics.world.setBounds(0, 0, levelWidth, levelHeight + 100);
        this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);

        // Grupos que cada nivel va a llenar en createLevelContent()
        this.platforms = this.physics.add.staticGroup();
        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.gems = this.physics.add.group({ allowGravity: false });

        // --- Hook: cada planeta arma su fondo, plataformas, gemas y portal ---
        this.createLevelContent();

        this.movingPlatforms.getChildren().forEach(p => p.body.setImmovable(true));
        this.totalGems = this.gems.getChildren().length;

        // --- Personaje (posición inicial también viene de config) ---
        this.player = this.physics.add.sprite(cfg.playerStart.x, cfg.playerStart.y, 'frontal');
        this.player.setCollideWorldBounds(false);
        this.player.body.setGravityY(cfg.gravity);
        this.player.body.setMaxVelocity(cfg.maxVelocityX, cfg.maxVelocityY);
        this.player.setOrigin(0.5, 0.5);
        this.player.setAlpha(0);
        this.player.body.setSize(20, cfg.hitboxHeight || 32);

        this.playerVisual = this.add.sprite(cfg.playerStart.x, cfg.playerStart.y, 'frontal');
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

        if (this.usesOxygen) {
            document.getElementById('hud-item-gems').style.display = 'none';
            document.getElementById('hud-item-oxygen').style.display = 'flex';
            this.updateOxygenHUD();
        } else {
            document.getElementById('hud-item-gems').style.display = 'flex';
            document.getElementById('hud-item-oxygen').style.display = 'none';
            this.updateHUDText();
        }

        // Restaura los textos por defecto de la pantalla de derrota (por si un intento
        // anterior en este mismo nivel murió por falta de oxígeno)
        const goTitleEl = document.getElementById('gameover-title');
        const goTextEl = document.getElementById('gameover-text');
        if (goTitleEl) goTitleEl.innerText = '¡CONEXIÓN PERDIDA!';
        if (goTextEl) goTextEl.innerText = 'Te has desvanecido en el vacío.';

        ensureHudOptionsButton();
        document.getElementById('game-hud').classList.add('active');
        document.getElementById('hud-status').innerText = cfg.hudStatusText;
        document.getElementById('hud-status').className = 'hud-value neon-glow-cyan';
    }

    update(time, delta) {
        if (this.isGameOver || this.isGameWon) return;
        const cfg = this.levelConfig;

        // --- Consumo de oxígeno con el paso del tiempo (solo niveles con usesOxygen) ---
        if (this.usesOxygen) {
            this.oxygenCurrent -= (cfg.oxygenDepletionRate || 3) * (delta / 1000);
            if (this.oxygenCurrent <= 0) {
                this.oxygenCurrent = 0;
                this.updateOxygenHUD();
                this.handleGameOver('oxygen');
                return;
            }
            this.updateOxygenHUD();
        }

        let isMovingLeft = this.cursors.left.isDown || this.keyA.isDown;
        let isMovingRight = this.cursors.right.isDown || this.keyD.isDown;

        if (isMovingLeft) {
            this.player.setVelocityX(-cfg.moveSpeed);
            this.playerVisual.setAngle(-cfg.tiltAngle);
            this.lastMovedDir = 'left';
            this.lastActionTime = this.time.now;
        } else if (isMovingRight) {
            this.player.setVelocityX(cfg.moveSpeed);
            this.playerVisual.setAngle(cfg.tiltAngle);
            this.lastMovedDir = 'right';
            this.lastActionTime = this.time.now;
        } else {
            this.player.setVelocityX(this.player.body.velocity.x * cfg.friction);
            this.playerVisual.setAngle(0);
        }

        let texOffset = this.textureOffsets[this.playerVisual.texture.key] || { x: 0, y: 0 };
        this.playerVisual.x = this.player.x + texOffset.x;
        this.playerVisual.y = this.player.y + this.visualOffsetY + texOffset.y;

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
            const landPart = this.add.particles(this.player.x, this.player.y + 16, cfg.landParticleColor, {
                speed: { min: 5, max: 40 }, angle: { min: 200, max: 340 },
                scale: { start: 0.8, end: 0 }, alpha: { start: 0.5, end: 0 },
                lifespan: 300, quantity: 4, blendMode: 'ADD'
            });
            landPart.explode();
        }
        this.wasOnGround = onGround;

        // --- Movimiento de plataformas móviles (rangos definidos en config) ---
        this.movingPlatforms.getChildren().forEach(p => {
            if (p.name === 'vertical') {
                if (p.y <= cfg.verticalPlatformRange.top) p.body.setVelocityY(cfg.verticalPlatformSpeed);
                else if (p.y >= cfg.verticalPlatformRange.bottom) p.body.setVelocityY(-cfg.verticalPlatformSpeed);
            } else if (p.name === 'horizontal') {
                if (p.x <= cfg.horizontalPlatformRange.left) p.body.setVelocityX(cfg.horizontalPlatformSpeed);
                else if (p.x >= cfg.horizontalPlatformRange.right) p.body.setVelocityX(-cfg.horizontalPlatformSpeed);
            }
        });

        if (this.player.y > 600) this.handleGameOver();
    }

    checkJump() {
        if (this.isGameOver || this.isGameWon) return;
        const cfg = this.levelConfig;
        let onGround = this.player.body.blocked.down || this.player.body.touching.down;

        if (onGround) {
            this.player.setVelocityY(cfg.jumpVelocity);
            this.jumpCount = 1;
            this.lastActionTime = this.time.now;
            this.playJumpEffects();
        } else if (this.jumpCount === 1 && playerProgress.hasDoubleJumpBoots) {
            this.player.setVelocityY(cfg.doubleJumpVelocity);
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
        const particleColor = isDouble ? 'part_red' : this.levelConfig.jumpParticleColor;
        const jumpPart = this.add.particles(this.player.x, this.player.y + 16, particleColor, {
            speed: { min: 10, max: 60 }, angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 }, alpha: { start: 0.7, end: 0 },
            lifespan: 350, quantity: isDouble ? 10 : 6, blendMode: 'ADD'
        });
        jumpPart.explode();
    }

    collectGem(player, gem) {
        gem.disableBody(true, true);

        if (this.usesOxygen) {
            this.oxygenCurrent = Math.min(this.oxygenMax, this.oxygenCurrent + (this.levelConfig.oxygenPerPickup || 20));
            this.updateOxygenHUD();
            const oxyPart = this.add.particles(gem.x, gem.y, 'part_cyan', {
                speed: { min: 30, max: 90 }, angle: { min: 0, max: 360 },
                scale: { start: 1.2, end: 0 }, alpha: { start: 0.8, end: 0 },
                lifespan: 500, quantity: 8, blendMode: 'ADD'
            });
            oxyPart.explode();
            return;
        }

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

    updateOxygenHUD() {
        const pct = Math.max(0, Math.round((this.oxygenCurrent / this.oxygenMax) * 100));
        const fillEl = document.getElementById('hud-oxygen-fill');
        const valueEl = document.getElementById('hud-oxygen-value');
        if (fillEl) {
            fillEl.style.width = pct + '%';
            fillEl.classList.remove('ox-warn', 'ox-critical');
            if (pct <= 20) fillEl.classList.add('ox-critical');
            else if (pct <= 50) fillEl.classList.add('ox-warn');
        }
        if (valueEl) valueEl.innerText = pct + '%';
    }

    handleGameOver(reason) {
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

        if (reason === 'oxygen') {
            document.getElementById('hud-status').innerText = this.levelConfig.oxygenGameOverText || 'SIN OXÍGENO';
            document.getElementById('gameover-title').innerText = '¡SIN OXÍGENO!';
            document.getElementById('gameover-text').innerText = 'Te has quedado sin oxígeno y te has ahogado en el vacío del espacio.';
        } else {
            document.getElementById('hud-status').innerText = this.levelConfig.gameOverText;
            document.getElementById('gameover-title').innerText = '¡CONEXIÓN PERDIDA!';
            document.getElementById('gameover-text').innerText = 'Te has desvanecido en el vacío.';
        }
        document.getElementById('hud-status').className = 'hud-value neon-text-red';

        this.time.delayedCall(800, () => {
            document.getElementById('gameover-overlay').classList.add('active');
            document.getElementById('game-hud').classList.remove('active');
        });
    }

    winGame() {
        if (this.isGameWon || this.isGameOver) return;
        const cfg = this.levelConfig;

        if (!this.usesOxygen && this.collectedGems < this.totalGems) {
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
        if (this.portalParticles) this.portalParticles.stop();
        this.player.body.enable = false;

        this.tweens.add({
            targets: this.playerVisual,
            x: this.portal.x, y: this.portal.y,
            scaleX: 0, scaleY: 0, alpha: 0, rotation: 6.28,
            duration: 700, ease: 'Power2.easeOut',
            onComplete: () => {
                document.querySelector('.win-panel h2').innerText = cfg.winTitle;
                document.querySelector('.win-panel p').innerText = cfg.winText;
                document.getElementById('btn-next-level').style.display = cfg.isLastLevel ? 'none' : 'inline-block';

                if (this.usesOxygen) {
                    document.getElementById('win-gems-row').style.display = 'none';
                    document.getElementById('win-oxygen-row').style.display = 'flex';
                    document.getElementById('win-oxygen').innerText = Math.round((this.oxygenCurrent / this.oxygenMax) * 100) + '%';
                } else {
                    document.getElementById('win-gems-row').style.display = 'flex';
                    document.getElementById('win-oxygen-row').style.display = 'none';
                    document.getElementById('win-gems').innerText = `${this.collectedGems} / ${this.totalGems}`;
                }
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
// NIVEL 1 - LUNA - Solo config + layout propio
// ============================================================================
class Level1Scene extends BasePlanetScene {
    constructor() {
        super({
            key: 'Level1Scene',
            gravity: 350,
            maxVelocityX: 350, maxVelocityY: 600,
            hitboxHeight: 40,
            moveSpeed: 220,
            tiltAngle: 6,
            friction: 0.9,
            jumpVelocity: -280, doubleJumpVelocity: -240,
            jumpParticleColor: 'part_white',
            landParticleColor: 'part_white',
            portalTexture: 'nave1',
            playerStart: { x: 100, y: 450 },
            verticalPlatformRange: { top: 250, bottom: 526 },
            verticalPlatformSpeed: 100,
            horizontalPlatformRange: { left: 1750, right: 2150 },
            horizontalPlatformSpeed: 200,
            hudStatusText: 'SECTOR LUNAR',
            gameOverText: 'SEÑAL PERDIDA',
            winTitle: '¡LUNA COLONIZADA!',
            winText: '¡Rumbo a Marte, el siguiente objetivo!',
            isLastLevel: false,
            // --- Sistema de oxígeno (reemplaza a las gemas en este nivel) ---
            usesOxygen: true,
            oxygenMax: 100,
            oxygenDepletionRate: 2,   // % de oxígeno perdido por segundo
            oxygenPerPickup: 20,      // % de oxígeno recuperado por tanque
            oxygenGameOverText: 'SIN OXÍGENO'
        });
    }

    createLevelContent() {
        // --- Fondo: Tierra distante ---
        let earth = this.add.sprite(900, 160, 'earth_tex');
        earth.setDisplaySize(160, 160);
        earth.setScrollFactor(0.01);

        for (let i = 0; i < 200; i++) {
            let x = Phaser.Math.Between(0, 3200);
            let y = Phaser.Math.Between(0, 456);
            let size = Phaser.Math.Between(1, 2);
            let alpha = Phaser.Math.FloatBetween(0.3, 0.8);
            let starColor = Phaser.Utils.Array.GetRandom([0xffffff, 0xa5f3fc, 0xcbd5e1]);
            let star = this.add.circle(x, y, size, starColor, alpha);
            star.setScrollFactor(Phaser.Math.FloatBetween(0.01, 0.12));
        }

        // --- Plataformas estáticas ---
        this.platforms.create(400, 556, 'plat_moon_800');
        this.platforms.create(1600, 556, 'plat_moon_500');
        this.platforms.create(2700, 556, 'plat_moon_1200');
        this.platforms.create(985, 520, 'plat_moon_150');
        this.platforms.create(1525, 320, 'plat_moon_200');
        //this.platforms.create(1780, 300, 'plat_moon_150');
        this.platforms.create(2250, 420, 'plat_moon_200');
        this.platforms.create(2480, 330, 'plat_moon_200');
        //this.platforms.create(2750, 240, 'plat_moon_150');
        this.platforms.refresh();

        // --- Plataformas móviles ---
        let verticalPlat = this.movingPlatforms.create(1225, 556, 'plat_moon_100');
        verticalPlat.name = 'vertical';
        verticalPlat.body.setVelocityY(-80);
        verticalPlat.body.setFriction(1, 1);
        

        let horizontalPlat = this.movingPlatforms.create(2100, 300, 'plat_moon_120');
        horizontalPlat.name = 'horizontal';
        horizontalPlat.body.setVelocityX(100);
        horizontalPlat.body.setFriction(1, 1);

        // --- Portal / Destino final: nave1 ---
        this.portal = this.physics.add.sprite(3050, 496, 'nave1');
        this.portal.setDisplaySize(320, 320);
        this.portal.body.allowGravity = false;
        this.portal.body.setImmovable(true);

        this.portalParticles = this.add.particles(this.portal.x, this.portal.y, 'part_green', {
            speedY: { min: -100, max: -30 }, speedX: { min: -20, max: 20 },
            scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 },
            lifespan: 1000, frequency: 100, blendMode: 'ADD'
        });

        // --- Tanques de oxígeno (reemplazan a las gemas en este nivel) ---
        const oxygenCoords = [
            {x: 300, y: 460}, /*{x: 600, y: 440},*/ {x: 1000, y: 450}, {x: 1500, y: 500},
            {x: 1550, y: 250}, /*{x: 1780, y: 120},*/ {x: 2020, y: 250}, {x: 2250, y: 300},
            {x: 2480, y: 200}, {x: 2750, y: 120}
        ];

        oxygenCoords.forEach(coord => {
            let tank = this.gems.create(coord.x, coord.y, 'oxygen_pickup');
            tank.setDisplaySize(28, 28);
            tank.body.setImmovable(true);
            this.tweens.add({
                targets: tank, y: coord.y - 12,
                duration: 1800 + Phaser.Math.Between(-300, 300),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        });
    }
}
// ============================================================================
// NIVEL 2 - MARTE (Level2Scene) - Compuesto por 2 FASES con jefes
// Fase 1: "Robot Soldado" bloquea el portal ('nave') hacia la Fase 2
// Fase 2: "Centinela Marciano" bloquea la nave2 (salida hacia el Nivel 3)
//
// La barra de vida sigue siendo el OXÍGENO (igual que en el Nivel 1), pero
// aquí ya no se recolectan tanques: se recarga presionando la tecla "F"
// (con un pequeño tiempo de reutilización). Lo que se recolecta ahora es
// GASOLINA: hacen falta 10 unidades como mínimo (repartidas entre las 2
// fases: 7 en la Fase 1 y 8 en la Fase 2) para poder avanzar al Nivel 3.
//
// NOTA DE ARTE: los enemigos todavía no tienen sprite propio, así que se
// reutilizan las texturas del jugador con un tinte de color (setTint) para
// poder diferenciarlos visualmente mientras no exista el arte definitivo.
// ============================================================================
class Level2Scene extends Phaser.Scene {
    constructor() {
        super({ key: 'Level2Scene' });
    }

    init(data) {
        // --- Fase actual (1 o 2) y gasolina acumulada entre fases ---
        this.phase = (data && data.phase === 2) ? 2 : 1;
        this.collectedGasoline = (data && typeof data.gasoline === 'number') ? data.gasoline : 0;
        this.gasolineNeeded = 10;

        this.wasOnGround = true;
        this.jumpCount = 0;
        this.isGameOver = false;
        this.isGameWon = false;
        this.isTransitioningPhase = false;
        this.lastMovedDir = 'right';
        this.lastActionTime = 0;
        this.visualOffsetY = -4;
        this.optionsPausedPhysics = false;

        // --- Oxígeno: sigue siendo la barra de vida en todo el Nivel 2 ---
        this.oxygenMax = 100;
        this.oxygenCurrent = this.oxygenMax;
        this.oxygenDepletionRate = 1.4;      // % de oxígeno perdido por segundo
        this.OXYGEN_RECHARGE_AMOUNT = 25;    // % que recupera la tecla F
        this.OXYGEN_RECHARGE_COOLDOWN = 4000; // ms de espera entre usos de F
        this.oxygenRechargeReadyAt = 0;

        this.textureOffsets = {
            frontal:        { x: 0, y: 0 },
            derecha:        { x: 0, y: 0 },
            izquierda:      { x: 0, y: 0 },
            saltoDerecha:   { x: 0, y: 0 },
            saltoIzquierda: { x: 0, y: 0 }
        };

        // --- Estado de combate ---
        this.bossDefeated = false;
        this.playerInvulnerableUntil = 0;
        this.playerHasWeapon = (data && data.hasWeapon === true) ? true : false;
        // --- Sistema de series de balas (amarilla → roja → morada, ciclo de 3) ---
        this.bulletSeriesIndex = 0;  // 0=amarilla, 1=roja, 2=morada
        this.bulletSeries = ['balaAmarilla', 'balaRoja', 'balaMorada'];
        // Serie del soldado (independiente)
        this.bossBulletSeriesIndex = 0;
    }

    preload() {
        this.load.image('marciano', 'Recursos/marciano.png');
        this.load.image('frontal', 'Recursos/frontal.png');
        this.load.image('derecha', 'Recursos/derecha.png');
        this.load.image('izquierda', 'Recursos/izquierda.png');
        this.load.image('saltoDerecha', 'Recursos/saltoDerecha.png');
        this.load.image('saltoIzquierda', 'Recursos/saltoIzquierda.png');
        this.load.image('gasolina', 'Recursos/gasolina.png');
        this.load.image('arma', 'Recursos/arma.png');
        this.load.image('nave', 'Recursos/nave.png');
        // --- Sprites del soldado (jefe fase 1) ---
        this.load.image('soldadoDerecha', 'Recursos/soldadoDerecha.png');
        this.load.image('soldadoIzquierda', 'Recursos/soldadoIzquierda.png');
        this.load.image('soldadoSaltoDerecha', 'Recursos/soldadoSaltoDerecha.png');
        this.load.image('soldadoSaltoIzquierda', 'Recursos/soldadoSaltoIzquierda.png');
        // --- Sprites del Centinela Marciano (jefe fase 2) ---
        this.load.image('marcianoDerecha', 'Recursos/marcianoDerecha.png');
        this.load.image('marcianoIzquierda', 'Recursos/marcianoIzquierda.png');
        this.load.image('marcianoFrontal', 'Recursos/marcianoFrontal.png');
        this.load.image('marcianoSaltoDerecha', 'Recursos/marcianoSaltoDerecha.png');
        this.load.image('marcianoSaltoIzquierda', 'Recursos/marcianoSaltoIzquierda.png');
        this.load.image('marcianoVueloDerecha', 'Recursos/marcianoVueloDerecha.png');
        this.load.image('marcianoVueloIzquierda', 'Recursos/marcianoVueloIzquierda.png');
        // --- Sprites del jugador con arma ---
        this.load.image('derechaArma', 'Recursos/derechaArma.png');
        this.load.image('izquierdaArma', 'Recursos/izquierdaArma.png');
        this.load.image('saltoDerechaArma', 'Recursos/saltoDerechaArma.png');
        this.load.image('saltoIzquierdaArma', 'Recursos/SaltolzquierdaArma.png');
        // --- Sprites de balas ---
        this.load.image('balaAmarilla', 'Recursos/balaAmarilla.png');
        this.load.image('balaRoja', 'Recursos/balaRoja.png');
        this.load.image('balaMorada', 'Recursos/balaMorada.png');
        if (this.phase === 2) {
            this.load.image('nave2', 'Recursos/nave2.png');
        }
    }

    create() {
        this.isGameOver = false;
        this.isGameWon = false;
        this.isTransitioningPhase = false;

        createSharedTextures(this);
        this.physics.resume();
        this.lastActionTime = this.time.now;

        const levelWidth = 3200;
        const levelHeight = 576;

        this.physics.world.gravity.y = 620; // Gravedad marciana (intermedia entre Luna y Tierra)
        this.physics.world.setBounds(0, 0, levelWidth, levelHeight + 100);
        this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);

        // --- Fondo: cielo rojizo con polvo suspendido (igual en ambas fases) ---
        for (let i = 0; i < 150; i++) {
            let x = Phaser.Math.Between(0, levelWidth);
            let y = Phaser.Math.Between(0, levelHeight - 100);
            let size = Phaser.Math.Between(1, 3);
            let alpha = Phaser.Math.FloatBetween(0.15, 0.5);
            let dustColor = Phaser.Utils.Array.GetRandom([0xfca5a5, 0xf97316, 0xfdba74]);
            let dust = this.add.circle(x, y, size, dustColor, alpha);
            dust.setScrollFactor(Phaser.Math.FloatBetween(0.02, 0.15));
        }

        // --- Grupos compartidos entre ambas fases ---
        this.platforms = this.physics.add.staticGroup();
        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.gasolinaGroup = this.physics.add.group({ allowGravity: false });
        this.armaGroup = this.physics.add.group({ allowGravity: false });
        this.bootsGroup = this.physics.add.group({ allowGravity: false });
        this.playerBullets = this.physics.add.group({ allowGravity: false });
        this.enemyBullets = this.physics.add.group({ allowGravity: false });
        this.enemyDrones = this.physics.add.group({ allowGravity: false });
        this.enemyArcProjectiles = this.physics.add.group({ allowGravity: true });
        this.laserGraphics = this.add.graphics();

        this.boss = null;
        this.bossHpBarBg = null;
        this.bossHpBarFill = null;

        // --- Hook: cada fase arma su propio layout, gasolina y jefe ---
        if (this.phase === 1) {
            this.createPhase1Content();
        } else {
            this.createPhase2Content();
        }

        this.movingPlatforms.getChildren().forEach(p => p.body.setImmovable(true));

        // --- Personaje ---
        this.player = this.physics.add.sprite(this.playerStart.x, this.playerStart.y, 'frontal');
        this.player.setCollideWorldBounds(false);
        this.player.body.setGravityY(620);
        this.player.body.setMaxVelocity(400, 800);
        this.player.setOrigin(0.5, 0.5);
        this.player.setAlpha(0);
        this.player.body.setSize(32, 32);

        this.playerVisual = this.add.sprite(this.playerStart.x, this.playerStart.y, 'frontal');
        this.playerVisual.setOrigin(0.5, 0.5);
        this.playerVisual.setDisplaySize(48, 48);
        this.playerVisual.setVisible(true);
        this.playerVisual.setActive(true);

        // --- Colisiones y solapamientos ---
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.movingPlatforms);
        this.physics.add.overlap(this.player, this.gasolinaGroup, this.collectGasolina, null, this);
        this.physics.add.overlap(this.player, this.armaGroup, this.collectArma, null, this);
        this.physics.add.overlap(this.player, this.bootsGroup, this.collectBoots, null, this);
        this.physics.add.overlap(this.player, this.portal, this.winGame, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.handleBulletHit, null, this);
        this.physics.add.overlap(this.player, this.enemyDrones, this.handleDroneContact, null, this);
        this.physics.add.overlap(this.player, this.enemyArcProjectiles, this.handleArcProjectileHit, null, this);
        if (this.boss) {
            this.physics.add.overlap(this.player, this.boss, this.handleBossContact, null, this);
            this.physics.add.overlap(this.playerBullets, this.boss, this.handlePlayerBulletHitBoss, null, this);
        }

        // --- Controles ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyF = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

        this.input.keyboard.on('keydown-SPACE', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-UP', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-W', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-F', () => { this.rechargeOxygen(); });
        this.input.keyboard.on('keydown-R', () => { this.firePlayerWeapon(); });
        this.input.keyboard.on('keydown-ESC', () => { openOptionsOverlay(); });

        // --- Cámara y HUD ---
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        document.querySelector('#hud-item-gems .hud-label').innerText = 'GASOLINA:';
        document.getElementById('hud-item-gems').style.display = 'flex';
        document.getElementById('hud-item-oxygen').style.display = 'flex';
        const winGemsLabel = document.getElementById('win-gems-label');
        if (winGemsLabel) winGemsLabel.innerText = 'Gasolina recolectada:';
        document.getElementById('gameover-title').innerText = '¡CONEXIÓN PERDIDA!';
        document.getElementById('gameover-text').innerText = 'Te has desvanecido en el vacío.';

        this.updateGasolinaHUD();
        this.updateOxygenHUD();
        ensureHudOptionsButton();
        document.getElementById('game-hud').classList.add('active');
        document.getElementById('hud-status').innerText = this.phase === 1 ? 'SECTOR MARCIANO - FASE 1' : 'SECTOR MARCIANO - FASE 2';
        document.getElementById('hud-status').className = 'hud-value neon-glow-cyan';
    }

    // ========================================================================
    // FASE 1 - Llanura marciana + Robot Soldado
    // Construye el mapa, coleccionables de gasolina y crea al jefe.
    // Todos los setDisplaySize y body.setSize del soldado están aquí abajo,
    // buscando el bloque "── TAMAÑO VISUAL" y "── HITBOX del soldado".
    // ========================================================================
    createPhase1Content() {
        this.platforms.create(400, 556, 'plat_mars_800');
        this.platforms.create(1450, 556, 'plat_mars_700');
        this.platforms.create(2600, 556, 'plat_mars_1200');
        this.platforms.create(1000, 500, 'plat_mars_150');
        this.platforms.create(1450, 400, 'plat_mars_200');
        this.platforms.create(1650, 350, 'plat_mars_150');
        this.platforms.create(2150, 440, 'plat_mars_200');
        this.platforms.create(2400, 360, 'plat_mars_200');
        this.platforms.create(2650, 270, 'plat_mars_150');
        this.platforms.refresh();

        let verticalPlat = this.movingPlatforms.create(1200, 380, 'plat_mars_100');
        verticalPlat.name = 'vertical';
        verticalPlat.body.setVelocityY(-100);
        verticalPlat.body.setFriction(1, 1);

        let horizontalPlat = this.movingPlatforms.create(1900, 380, 'plat_mars_120');
        horizontalPlat.name = 'horizontal';
        horizontalPlat.body.setVelocityX(120);
        horizontalPlat.body.setFriction(1, 1);

        this.verticalPlatformRange = { top: 250, bottom: 470 };
        this.verticalPlatformSpeed = 100;
        this.horizontalPlatformRange = { left: 1750, right: 2050 };
        this.horizontalPlatformSpeed = 120;

        // --- Portal hacia la Fase 2 (bloqueado hasta vencer al Robot Soldado) ---
        this.portal = this.physics.add.sprite(3050, 420, 'nave');
        this.portal.body.allowGravity = false;
        this.portal.body.setImmovable(true);
        this.portal.body.setSize(160, 320);

        // --- Gasolina: 7 unidades en esta fase ---
        const gasCoords = [
            {x: 400, y: 480}, {x: 600, y: 420}, {x: 900, y: 370}, {x: 1200, y: 220},
            {x: 1450, y: 320}, {x: 1650, y: 230}, {x: 2400, y: 280}
        ];
        gasCoords.forEach(coord => this.spawnGasolina(coord.x, coord.y));

        this.playerStart = { x: 100, y: 450 };

        // --- Jefe: Robot Soldado ---
        this.boss = this.physics.add.sprite(2200, 500, 'soldadoDerecha');
        // ── TAMAÑO VISUAL del soldado ──────────────────────────────────────────
        // setDisplaySize(ancho, alto) → píxeles en pantalla, independiente del PNG original.
        // Cambia aquí para agrandar/achicar el sprite visible.
        this.boss.setDisplaySize(52, 52);

        // ── HITBOX del soldado ─────────────────────────────────────────────────
        // setSize(w, h)      → tamaño de la caja de colisión en px (mundo físico).
        // setOffset(x, y)    → desplaza la hitbox respecto al origen del sprite
        //                      para centrarla cuando el displaySize ≠ tamaño natural del PNG.
        // Fórmula de centrado: offsetX = (spriteNaturalW - hitboxW) / 2
        //                      offsetY = (spriteNaturalH - hitboxH)   ← ancla en los pies
        // Ajusta estos valores si la hitbox no coincide visualmente (activa debug:true en Phaser).
        this.boss.body.allowGravity = true;
        this.boss.body.setGravityY(620);
        this.boss.body.setSize(30, 44);
        this.boss.body.setOffset(11, 8); // centra la hitbox dentro del sprite 52×52
        this.boss.body.setMaxVelocity(200, 800);
        this.physics.add.collider(this.boss, this.platforms);
        this.physics.add.collider(this.boss, this.movingPlatforms);

        this.bossType = 'soldado';
        this.bossHp = 3;
        this.bossMaxHp = 3;
        this.bossState = 'patrol';      // patrol | chase | shooting | cover
        this.bossFacing = -1;           // -1 izquierda, 1 derecha
        this.bossPatrolRange = { left: 2000, right: 2700 };
        this.bossPatrolSpeed = 60;
        this.bossChaseSpeed = 115;
        this.bossChaseStopDist = 220;   // distancia a la que deja de perseguir y dispara
        // --- Zona de combate específica: si el jugador entra aquí, el soldado
        // lo persigue y ataca sin importar si lo "ve" o no (ya no depende de
        // una distancia de visión ni de estar mirando hacia él). ---
        this.bossAttackZone = { left: this.bossPatrolRange.left - 250, right: this.bossPatrolRange.right + 250 };
        this.bossNextActionAt = 0;
        this.bossShotsFired = 0;
        this.bossInvulnerable = false;

        this.createBossHpBar();
    }

    // ========================================================================
    // FASE 2 - Cañón marciano + Centinela Marciano
    // Construye el mapa, coleccionables y crea al Centinela.
    // Todos los setDisplaySize y body.setSize del centinela están aquí abajo,
    // buscando el bloque "── TAMAÑO VISUAL" y "── HITBOX del Centinela".
    // ========================================================================
    createPhase2Content() {
        this.platforms.create(400, 556, 'plat_mars_800');
        this.platforms.create(1450, 556, 'plat_mars_700');
        this.platforms.create(2700, 556, 'plat_mars_1200');
        this.platforms.create(900, 520, 'plat_mars_150');
        this.platforms.create(1350, 580, 'plat_mars_200');
        this.platforms.create(1700, 500, 'plat_mars_150');
        this.platforms.create(2150, 620, 'plat_mars_200');
        this.platforms.create(2450, 530, 'plat_mars_200');
        this.platforms.refresh();

        let horizontalPlat = this.movingPlatforms.create(1950, 550, 'plat_mars_120');
        horizontalPlat.name = 'horizontal';
        horizontalPlat.body.setVelocityX(110);
        horizontalPlat.body.setFriction(1, 1);

        this.verticalPlatformRange = { top: 250, bottom: 470 };
        this.verticalPlatformSpeed = 100;
        this.horizontalPlatformRange = { left: 1800, right: 2100 };
        this.horizontalPlatformSpeed = 110;

        // --- nave2: salida final del Nivel 2 (bloqueada hasta vencer al Centinela) ---
        this.portal = this.physics.add.sprite(3050, 520, 'nave2');
        this.portal.setDisplaySize(220, 220);
        this.portal.body.allowGravity = false;
        this.portal.body.setImmovable(true);
        this.portal.body.setSize(140, 200);

        // --- Gasolina: 8 unidades en esta fase ---
        const gasCoords = [
            {x: 350, y: 480}, {x: 650, y: 420}, {x: 950, y: 380}, {x: 1350, y: 260},
            {x: 1700, y: 240}, {x: 2150, y: 340}, {x: 2450, y: 250}, {x: 2750, y: 480}
        ];
        gasCoords.forEach(coord => this.spawnGasolina(coord.x, coord.y));

        this.playerStart = { x: 100, y: 450 };

        // --- Jefe: Centinela Marciano ---
        //this.boss.name = "CENTINELA";
        this.boss = this.physics.add.sprite(2300, 460, 'marcianoFrontal');
        
        // ── TAMAÑO VISUAL del Centinela Marciano ──────────────────────────────
        // Cambia setDisplaySize(ancho, alto) para escalar el sprite en pantalla.
        this.boss.setDisplaySize(48, 48);

        // ── HITBOX del Centinela ───────────────────────────────────────────────
        // setSize(w, h)   → caja de colisión física.
        // setOffset(x, y) → corrección de posición de la hitbox.
        // Sprite visible: 48×48 px. Hitbox recortada al cuerpo real del marciano:
        //   · Anchura 26px (deja 11px de margen a cada lado para las antenas/brazos)
        //   · Altura  38px (deja 5px arriba para la cabeza y 5px abajo para los pies)
        //   · Offset  (11, 5) centra la caja dentro del sprite
        this.boss.body.allowGravity = false;
        this.boss.body.setImmovable(false);
        this.boss.body.setSize(26, 38);
        this.boss.body.setOffset(11, 5); // centra la hitbox dentro del sprite 48×48
        this.physics.add.collider(this.boss, this.platforms);
        this.physics.add.collider(this.boss, this.movingPlatforms);

        //ChatGPT
        this.boss.setVisible(true);
        this.boss.setAlpha(1);
        this.boss.setDepth(100);

        this.bossType = 'centinela';
        this.bossHp = 4;
        //console.log("HP inicial:", this.bossHp);
        this.bossMaxHp = 4;
        this.bossBaseY = this.boss.y;
        this.bossFacing = -1;
        this.bossPatrolRange = { left: 2000, right: 2600 };
        this.bossPatrolSpeed = 40;
        this.bossNextArcShotAt = this.time.now + 2000;
        this.bossNextDroneAt = this.time.now + 3000;
        this.bossLaserActive = false;
        this.bossInvulnerable = false; // el escudo frontal se resuelve en handleBossContact

        // --- Alterna entre volar y caminar por el suelo ---
        this.bossMoveMode = 'fly';
        this.bossNextModeSwitchAt = this.time.now + Phaser.Math.Between(4500, 7500);
        this.bossFloatTween = this.tweens.add({
            targets: this.boss, y: this.bossBaseY - 20,
            duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // --- Cobertura aleatoria entre ataques (además de la lógica de escudo frontal) ---
        this.bossCovering = false;
        this.bossCoverEndAt = 0;
        this.bossNextRandomCoverAt = this.time.now + Phaser.Math.Between(5000, 9000);

        this.createBossHpBar();
    }

    // ========================================================================
    // GASOLINA (recolectable de este nivel)
    // ========================================================================
    // ── spawnGasolina(x, y) ──────────────────────────────────────────────────
    // Crea un coleccionable de gasolina en la posición indicada.
    // ┌─ TAMAÑO VISUAL ──────────────────────────────────────────────────────┐
    // │  gas.setDisplaySize(ancho, alto) → cambia aquí para escalar el icono │
    // └──────────────────────────────────────────────────────────────────────┘
    spawnGasolina(x, y) {
        let gas = this.gasolinaGroup.create(x, y, 'gasolina');
        gas.setDisplaySize(26, 26); // ← tamaño visual del coleccionable de gasolina
        gas.body.setImmovable(true);
        this.tweens.add({
            targets: gas, y: y - 12,
            duration: 1500 + Phaser.Math.Between(-200, 200),
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    collectGasolina(player, gas) {
        gas.disableBody(true, true);
        this.collectedGasoline++;
        this.updateGasolinaHUD();
        const part = this.add.particles(gas.x, gas.y, 'part_orange', {
            speed: { min: 40, max: 120 }, angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 }, alpha: { start: 0.9, end: 0 },
            lifespan: 400, quantity: 12, blendMode: 'ADD'
        });
        part.explode();
    }

    updateGasolinaHUD() {
        document.getElementById('hud-gems').innerText = `${this.collectedGasoline} / ${this.gasolineNeeded}`;
    }

    // ========================================================================
    // OXÍGENO (barra de vida) - recarga manual con la tecla F
    // ========================================================================
    rechargeOxygen() {
        if (this.isGameOver || this.isGameWon || this.isTransitioningPhase) return;
        const now = this.time.now;
        if (now < this.oxygenRechargeReadyAt) {
            this.showFloatingText(this.player.x, this.player.y - 40, 'RECARGA EN ESPERA', '#f87171');
            return;
        }
        this.oxygenCurrent = Math.min(this.oxygenMax, this.oxygenCurrent + this.OXYGEN_RECHARGE_AMOUNT);
        this.oxygenRechargeReadyAt = now + this.OXYGEN_RECHARGE_COOLDOWN;
        this.updateOxygenHUD();
        this.showFloatingText(this.player.x, this.player.y - 40, '+OXÍGENO', '#22d3ee');

        const part = this.add.particles(this.player.x, this.player.y, 'part_cyan', {
            speed: { min: 30, max: 90 }, angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 }, alpha: { start: 0.8, end: 0 },
            lifespan: 500, quantity: 10, blendMode: 'ADD'
        });
        part.explode();
    }

    updateOxygenHUD() {
        const pct = Math.max(0, Math.round((this.oxygenCurrent / this.oxygenMax) * 100));
        const fillEl = document.getElementById('hud-oxygen-fill');
        const valueEl = document.getElementById('hud-oxygen-value');
        if (fillEl) {
            fillEl.style.width = pct + '%';
            fillEl.classList.remove('ox-warn', 'ox-critical');
            if (pct <= 20) fillEl.classList.add('ox-critical');
            else if (pct <= 50) fillEl.classList.add('ox-warn');
        }
        if (valueEl) valueEl.innerText = pct + '%';
    }

    showFloatingText(x, y, msg, color) {
        let t = this.add.text(x, y, msg, {
            fontFamily: 'Orbitron', fontSize: '14px', fontWeight: '700',
            fill: color, stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    }

    // ========================================================================
    // BUCLE PRINCIPAL
    // ========================================================================
    update(time, delta) {
        if (this.isGameOver || this.isGameWon || this.isTransitioningPhase) return;

        // --- Consumo de oxígeno con el paso del tiempo ---
        this.oxygenCurrent -= this.oxygenDepletionRate * (delta / 1000);
        if (this.oxygenCurrent <= 0) {
            this.oxygenCurrent = 0;
            this.updateOxygenHUD();
            this.handleGameOver('oxygen');
            return;
        }
        this.updateOxygenHUD();

        // --- Movimiento del jugador ---
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

        let texOffset = this.textureOffsets[this.playerVisual.texture.key] || { x: 0, y: 0 };
        this.playerVisual.x = this.player.x + texOffset.x;
        this.playerVisual.y = this.player.y + this.visualOffsetY + texOffset.y;

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
                if (p.y <= this.verticalPlatformRange.top) p.body.setVelocityY(this.verticalPlatformSpeed);
                else if (p.y >= this.verticalPlatformRange.bottom) p.body.setVelocityY(-this.verticalPlatformSpeed);
            } else if (p.name === 'horizontal') {
                if (p.x <= this.horizontalPlatformRange.left) p.body.setVelocityX(this.horizontalPlatformSpeed);
                else if (p.x >= this.horizontalPlatformRange.right) p.body.setVelocityX(-this.horizontalPlatformSpeed);
            }
        });

        if (this.player.y > 600) { this.handleGameOver(); return; }

        // --- IA del jefe activo ---
        if (this.boss && this.boss.active) {
            if (this.bossType === 'soldado') this.updateRobotSoldado(time, delta);
            else if (this.bossType === 'centinela') this.updateCentinelaMarciano(time, delta);
        }

        this.updateBossHpBar();
        this.cleanupProjectiles();
    }

    checkJump() {
        if (this.isGameOver || this.isGameWon || this.isTransitioningPhase) return;
        let onGround = this.player.body.blocked.down || this.player.body.touching.down;

        if (onGround) {
            this.player.setVelocityY(-380);
            this.jumpCount = 1;
            this.lastActionTime = this.time.now;
            this.playJumpEffects();
        } else if (this.jumpCount === 1 && playerProgress.hasDoubleJumpBoots) {
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

    // ========================================================================
    // JEFE 1: ROBOT SOLDADO (Fase 1)
    // Patrulla su zona; si el jugador entra a su ZONA DE COMBATE (un área
    // específica del mapa, no una "visión" por distancia/ángulo) lo persigue
    // caminando hacia él. Al alcanzarlo se planta y dispara una ráfaga de 3
    // balas, luego se cubre (invulnerable) unos segundos antes de repetir.
    // Nunca avanza hacia un borde sin suelo: si detecta el vacío adelante,
    // salta hacia atrás, hacia una zona segura, en vez de caer.
    // ========================================================================
    // ── updateRobotSoldado(time, delta) ──────────────────────────────────────
    // Máquina de estados del Robot Soldado. Se llama cada frame desde update().
    // Estados posibles:
    //   'patrol'   → camina de lado a lado en su zona (bossPatrolRange)
    //   'chase'    → persigue al jugador cuando entra en bossAttackZone
    //   'shooting' → se detiene y dispara 3 balas (bossShotsFired < 3)
    //   'cover'    → se agacha, invulnerable (bossInvulnerable=true), ~1.8s
    //
    // Variables clave para afinar el comportamiento:
    //   this.bossChaseStopDist  → distancia a la que para de correr y empieza a disparar
    //   this.bossChaseSpeed     → velocidad de persecución (px/seg)
    //   this.bossPatrolSpeed    → velocidad de patrulla
    //   this.bossNextActionAt   → timestamp del próximo cambio de acción
    updateRobotSoldado(time, delta) {
        const boss = this.boss;
        const dx = this.player.x - boss.x;
        const dist = Math.abs(dx);

        // Zona de combate específica: entrar aquí activa la persecución,
        // sin importar si el jugador está dentro del "campo de visión".
        const playerInZone = this.player.x > this.bossAttackZone.left &&
                              this.player.x < this.bossAttackZone.right;

        if (this.bossState === 'patrol') {
            this.bossPatrolStep();
            if (playerInZone && time > this.bossNextActionAt) {
                this.bossState = 'chase';
                this.bossNextActionAt = time + 200;
            }
        } else if (this.bossState === 'chase') {
            if (!playerInZone) {
                boss.setVelocityX(0);
                this.bossState = 'patrol';
                return;
            }

            this.bossFacing = dx < 0 ? -1 : 1;
            boss.setTexture(this.bossFacing === 1 ? 'soldadoDerecha' : 'soldadoIzquierda');
            boss.setFlipX(false);

            if (dist > this.bossChaseStopDist) {
                if (this.bossGroundAhead(this.bossFacing)) {
                    boss.setVelocityX(this.bossFacing * this.bossChaseSpeed);
                } else {
                    // A punto de caer al vacío persiguiendo: salta hacia atrás,
                    // de vuelta a una plataforma segura, en lugar de caer.
                    this.bossJumpToSafety(this.bossFacing);
                }
            } else {
                boss.setVelocityX(0);
                if (time > this.bossNextActionAt) {
                    this.bossState = 'shooting';
                    this.bossNextActionAt = time + 250;
                }
            }
        } else if (this.bossState === 'shooting') {
            boss.setVelocityX(0);
            this.bossFacing = dx < 0 ? -1 : 1;
            boss.setTexture(this.bossFacing === 1 ? 'soldadoDerecha' : 'soldadoIzquierda');
            boss.setFlipX(false);
            if (this.bossShotsFired < 3 && time > this.bossNextActionAt) {
                this.fireBossBullet(boss.x + (this.bossFacing * 20), boss.y - 4, this.bossFacing);
                this.bossShotsFired++;
                this.bossNextActionAt = time + 280;
            } else if (this.bossShotsFired >= 3) {
                this.bossState = 'cover';
                this.bossInvulnerable = true;
                boss.setAlpha(0.5);
                boss.setTexture(this.bossFacing === 1 ? 'soldadoSaltoDerecha' : 'soldadoSaltoIzquierda');
                boss.setDisplaySize(52, 40);
                this.bossNextActionAt = time + 1800;
            }
        } else if (this.bossState === 'cover') {
            boss.setVelocityX(0);
            if (time > this.bossNextActionAt) {
                this.bossInvulnerable = false;
                boss.setAlpha(1);
                boss.setTexture(this.bossFacing === 1 ? 'soldadoDerecha' : 'soldadoIzquierda');
                boss.setDisplaySize(52, 52);
                this.bossState = playerInZone ? 'chase' : 'patrol';
                this.bossNextActionAt = time + (this.bossState === 'chase' ? 300 : 800);
                this.bossShotsFired = 0;
            }
        }
    }

    // --- Movimiento de patrulla normal, respetando también el borde de la plataforma ---
    // ── bossPatrolStep() ─────────────────────────────────────────────────────
    // Mueve al soldado de lado a lado dentro de bossPatrolRange.
    // Invierte la dirección si llega al borde del rango O si no hay suelo adelante.
    bossPatrolStep() {
        const boss = this.boss;
        const hittingRangeEdge = boss.x <= this.bossPatrolRange.left || boss.x >= this.bossPatrolRange.right;
        const noGroundAhead = !this.bossGroundAhead(this.bossFacing);

        if (hittingRangeEdge || noGroundAhead) {
            this.bossFacing *= -1;
        }
        boss.setVelocityX(this.bossFacing * this.bossPatrolSpeed);
        // Sprite según dirección
        if (this.bossType === 'soldado') {
            boss.setTexture(this.bossFacing === 1 ? 'soldadoDerecha' : 'soldadoIzquierda');
        }
        boss.setFlipX(false); // sprites direccionales no necesitan flip
    }

    // ── bossGroundAhead(dir) ─────────────────────────────────────────────────
    // Sensor de suelo: lanza un overlapRect pequeño justo delante y debajo del
    // boss. Devuelve true si hay plataforma, false si hay vacío.
    // Ajusta los números si el soldado sigue cayendo al vacío (aumenta 34→50)
    // o si se frena antes de tiempo (reduce 34→20).
    bossGroundAhead(dir) {
        const boss = this.boss;
        const checkX = boss.x + dir * 34;
        const checkY = boss.y + 24;
        const bodies = this.physics.overlapRect(checkX - 6, checkY, 12, 26, true, true);
        return bodies.length > 0;
    }

    // --- Evita caer al vacío: salta en dirección contraria, hacia zona segura ---
    bossJumpToSafety(dir) {
        const boss = this.boss;
        if (boss.body.blocked.down) {
            boss.setVelocityY(-380);
        }
        this.bossFacing = -dir;
        boss.setVelocityX(this.bossFacing * 90);
        boss.setFlipX(this.bossFacing === -1);
    }

    // ── fireBossBullet(x, y, dir) ────────────────────────────────────────────
    // Dispara una bala enemiga desde la posición del soldado.
    // Alterna entre balaAmarilla → balaRoja → balaMorada en series de 3 (cíclico).
    // dir: 1 = dispara a la derecha, -1 = dispara a la izquierda.
    // ┌─ TAMAÑO VISUAL de la bala enemiga ───────────────────────────────────┐
    // │  bullet.setDisplaySize(ancho, alto) → escala el sprite de la bala    │
    // │  Velocidad de la bala: dir * 320  (px/seg) → ajusta el número        │
    // └──────────────────────────────────────────────────────────────────────┘
    fireBossBullet(x, y, dir) {
        // Alterna entre las 3 balas en series cíclicas
        const bulletTex = this.bulletSeries[this.bossBulletSeriesIndex % 3];
        this.bossBulletSeriesIndex++;
        let bullet = this.enemyBullets.create(x, y, bulletTex);
        bullet.setDisplaySize(32, 18); // ← tamaño visual de la bala del soldado
        bullet.body.setAllowGravity(false);
        bullet.setVelocityX(dir * 320);
        if (dir < 0) bullet.setFlipX(true);
        bullet.damage = 12;
        bullet.spawnTime = this.time.now;
    }

    // ========================================================================
    // ARMA DEL JUGADOR (tecla R, desbloqueada al derrotar al Robot Soldado)
    // Dispara en 8 direcciones: derecha, izquierda, arriba, abajo y las 4
    // diagonales a 45°, según las teclas de movimiento que estén presionadas
    // en el momento de disparar (si no hay ninguna, dispara hacia donde mira
    // el jugador). Cada dirección usa por ahora un sprite reciclado del
    // personaje como placeholder — sustituir más adelante por el arte real
    // del proyectil de cada dirección (ej. Recursos/bala_derecha.png, etc.).
    // ========================================================================
    // ── firePlayerWeapon() ───────────────────────────────────────────────────
    // Disparo del jugador (tecla R). Requiere haber recogido el arma.
    // Determina la dirección (dx, dy) según las teclas presionadas en ese momento.
    // Sin tecla de dirección → dispara hacia donde mira el jugador (lastMovedDir).
    // weaponNextFireAt controla la cadencia: 320ms entre disparos.
    // ┌─ AJUSTAR CADENCIA ───────────────────────────────────────────────────┐
    // │  this.weaponNextFireAt = now + 320  → ms entre disparos (menos = más rápido)│
    // └──────────────────────────────────────────────────────────────────────┘
    firePlayerWeapon() {
        if (!this.playerHasWeapon) return;
        if (this.isGameOver || this.isGameWon || this.isTransitioningPhase) return;

        const now = this.time.now;
        if (now < (this.weaponNextFireAt || 0)) return;
        this.weaponNextFireAt = now + 320; // ← cadencia de disparo en ms

        const left = this.cursors.left.isDown || this.keyA.isDown;
        const right = this.cursors.right.isDown || this.keyD.isDown;
        const up = this.cursors.up.isDown || this.keyW.isDown;
        const down = this.cursors.down.isDown;

        let dx = 0, dy = 0;
        if (left) dx = -1; else if (right) dx = 1;
        if (up) dy = -1; else if (down) dy = 1;

        // Sin ninguna dirección presionada: dispara hacia donde mira el jugador
        if (dx === 0 && dy === 0) {
            dx = (this.lastMovedDir === 'left') ? -1 : 1;
        }

        this.spawnPlayerBullet(dx, dy);
    }

    // --- Placeholders de sprite por dirección (8 secciones, una por cada disparo) ---
    getPlayerBulletSpriteDef(dx, dy) {
        const defs = {
            '1,0':   { tex: 'derecha',        angle: 0   }, // derecha
            '-1,0':  { tex: 'izquierda',      angle: 0   }, // izquierda
            '0,-1':  { tex: 'saltoDerecha',   angle: -90 }, // arriba
            '0,1':   { tex: 'saltoIzquierda', angle: 90  }, // abajo
            '1,-1':  { tex: 'saltoDerecha',   angle: -45 }, // arriba-derecha (45°)
            '-1,-1': { tex: 'saltoIzquierda', angle: 45  }, // arriba-izquierda (45°)
            '1,1':   { tex: 'derecha',        angle: 45  }, // abajo-derecha (45°)
            '-1,1':  { tex: 'izquierda',      angle: -45 }  // abajo-izquierda (45°)
        };
        return defs[`${dx},${dy}`] || defs['1,0'];
    }

    // ── spawnPlayerBullet(dx, dy) ────────────────────────────────────────────
    // Crea un proyectil del jugador en 8 direcciones (dx/dy son -1, 0 o 1).
    // Alterna sprites en serie cíclica: balaAmarilla → balaRoja → balaMorada.
    // ┌─ TAMAÑO VISUAL de la bala del jugador ───────────────────────────────┐
    // │  bullet.setDisplaySize(ancho, alto) → escala el sprite del proyectil │
    // │  Velocidad: const speed = 420  (px/seg) → ajusta el número           │
    // └──────────────────────────────────────────────────────────────────────┘
    spawnPlayerBullet(dx, dy) {
        // Seleccionar sprite de bala según serie cíclica (amarilla→roja→morada)
        const bulletTex = this.bulletSeries[this.bulletSeriesIndex % 3];
        this.bulletSeriesIndex++;

        let bullet = this.playerBullets.create(this.player.x, this.player.y - 4, bulletTex);
        bullet.setDisplaySize(36, 20); // ← tamaño visual de la bala del jugador
        // Rotar la bala según dirección de disparo
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        bullet.setAngle(angle);
        if (dx < 0) bullet.setFlipX(true);
        bullet.body.setAllowGravity(false);

        const speed = 420;
        const norm = Math.sqrt(dx * dx + dy * dy) || 1;
        bullet.setVelocity((dx / norm) * speed, (dy / norm) * speed);
        bullet.damage = 1;
        bullet.spawnTime = this.time.now;

        const muzzle = this.add.particles(this.player.x, this.player.y - 4, 'part_cyan', {
            speed: { min: 20, max: 60 }, scale: { start: 0.8, end: 0 }, alpha: { start: 0.8, end: 0 },
            lifespan: 150, quantity: 6, blendMode: 'ADD'
        });
        muzzle.explode();
    }
    // ── handlePlayerBulletHitBoss(obj1, obj2) ────────────────────────────────
    // Callback de overlap entre playerBullets y el boss.
    // IMPORTANTE: Phaser puede entregar los objetos en cualquier orden,
    // por eso identificamos quién es quién comparando con this.boss.
    // No usar los nombres de los parámetros como garantía de orden.
    handlePlayerBulletHitBoss(obj1, obj2) {
        // Phaser no garantiza el orden de los parámetros en overlap,
        // así que detectamos quién es quién comparando con this.boss
        const boss   = (obj1 === this.boss) ? obj1 : obj2;
        const bullet = (obj1 === this.boss) ? obj2 : obj1;

        // Destruir la bala
        if (bullet && bullet.active) {
            bullet.destroy();
        }

        // Si el jefe ya murió, está invulnerable o inactivo, ignorar
        if (this.bossDefeated || !boss || !boss.active || this.bossInvulnerable) {
            return;
        }

        this.bossInvulnerable = true;
        this.damageBoss(1);

        // Flash de daño solo si sigue vivo
        if (this.bossHp > 0 && boss.active) {
            boss.setTintFill(0xffffff);
            this.time.delayedCall(150, () => {
                if (boss && boss.active) {
                    boss.clearTint();
                }
                this.bossInvulnerable = false;
            });
        } else {
            this.bossInvulnerable = false;
        }
    }


    // ========================================================================
    // JEFE 2: CENTINELA MARCIANO (Fase 2)
    // Alterna entre volar y caminar por el suelo. Patrulla y dispara un rayo
    // continuo cuando encara al jugador, invoca drones pequeños y lanza
    // proyectiles con trayectoria parabólica. Tiene un escudo frontal: solo
    // recibe daño por pisotón si se le golpea por detrás (el arma sí puede
    // dañarlo desde cualquier ángulo). Además, de forma aleatoria, se cubre
    // unos instantes entre ataques (queda invulnerable, igual que el Robot
    // Soldado al cubrirse).
    // ========================================================================
    
    // ── updateCentinelaMarciano(time, delta) ─────────────────────────────────
    // IA del Centinela Marciano (jefe Fase 2). Se llama cada frame desde update().
    // Comportamientos activos en paralelo:
    //   · Patrulla horizontal entre bossPatrolRange.left / .right
    //   · Alterna modo 'fly' (flota, tween suave) ↔ 'ground' (camina con gravedad)
    //     cada bossNextModeSwitchAt ms (aleatorio 4.5-7.5s)
    //   · Rayo continuo (laserGraphics) cuando encara al jugador a <650px de distancia
    //     y en la misma banda vertical (±90px). Daña 6%/s de oxígeno.
    //   · Proyectil parabólico (fireArcProjectile) cada ~3-4.2s
    //   · Invocación de drones (spawnDrone) cada ~4.5-6s
    //   · Cobertura aleatoria (bossCovering=true) cada ~5-9s → invulnerable ~1.2-1.9s
    //
    // Para cambiar el sprite según estado: busca el bloque al final de esta función
    // con el comentario "Sprite según modo de movimiento".
    updateCentinelaMarciano(time, delta) {
        
    const boss = this.boss;
        boss.setVisible(true);
        boss.setAlpha(1);
    
    // Si el jefe está derrotado, no actualizar
    if (this.bossDefeated || !boss.active) return;

    // --- Alternar entre volar y caminar por el suelo ---
    if (time > this.bossNextModeSwitchAt) {
        this.toggleCentinelaMoveMode();
        this.bossNextModeSwitchAt = time + Phaser.Math.Between(4500, 7500);
    }

    // --- Cobertura aleatoria: se protege un instante entre ataques ---
    if (!this.bossCovering && time > this.bossNextRandomCoverAt) {
        this.startCentinelaCover(time);
    }
    if (this.bossCovering) {
        boss.setVelocityX(0);
        if (time > this.bossCoverEndAt) {
            this.endCentinelaCover(time);
        }
        return;
    }

    // --- Patrulla ---
    if (this.bossMoveMode === 'ground' && !this.bossGroundAhead(this.bossFacing)) {
        this.bossFacing *= -1;
    }
    boss.setVelocityX(this.bossFacing * this.bossPatrolSpeed);
    if (boss.x <= this.bossPatrolRange.left) this.bossFacing = 1;
    else if (boss.x >= this.bossPatrolRange.right) this.bossFacing = -1;
    boss.setFlipX(this.bossFacing === -1);

    const dx = this.player.x - boss.x;
    const facingPlayer = (dx < 0 && this.bossFacing === -1) || (dx > 0 && this.bossFacing === 1);
    const dist = Math.abs(dx);
    const sameHeightBand = Math.abs(this.player.y - boss.y) < 90;

    // --- Rayo continuo ---
    if (facingPlayer && sameHeightBand && dist < 650) {
        this.bossLaserActive = true;
        this.oxygenCurrent = Math.max(0, this.oxygenCurrent - 6 * (delta / 1000));
        this.laserGraphics.clear();
        this.laserGraphics.lineStyle(4, 0xff4d6d, 0.85);
        this.laserGraphics.beginPath();
        this.laserGraphics.moveTo(boss.x, boss.y);
        this.laserGraphics.lineTo(this.player.x, this.player.y);
        this.laserGraphics.strokePath();

        if (this.oxygenCurrent <= 0) {
            this.oxygenCurrent = 0;
            this.updateOxygenHUD();
            this.handleGameOver('oxygen');
            return;
        }
    } else {
        this.bossLaserActive = false;
        this.laserGraphics.clear();
    }

    // --- Proyectil parabólico ---
    if (time > this.bossNextArcShotAt) {
        this.fireArcProjectile();
        this.bossNextArcShotAt = time + Phaser.Math.Between(3000, 4200);
    }

    // --- Invocación de drones ---
    if (time > this.bossNextDroneAt) {
        this.spawnDrone();
        this.bossNextDroneAt = time + Phaser.Math.Between(4500, 6000);
    }

    // Sprite según modo de movimiento y dirección
    if (this.bossMoveMode === 'fly') {
        boss.setTexture(this.bossFacing === 1 ? 'marcianoVueloDerecha' : 'marcianoVueloIzquierda');
    } else {
        boss.setTexture(this.bossFacing === 1 ? 'marcianoDerecha' : 'marcianoIzquierda');
    }
    boss.setFlipX(false);
    boss.setAlpha(1);
    boss.setVisible(true);
    boss.setDisplaySize(48, 48);
}

    // --- Cambia entre volar (flotando a altura fija) y caminar por el suelo ---
    toggleCentinelaMoveMode() {
        const boss = this.boss;
        if (this.bossMoveMode === 'fly') {
            // Antes de aterrizar, confirma que haya suelo debajo; si no, lo intenta más tarde
            const hasGroundBelow = this.physics.overlapRect(boss.x - 10, boss.y, 20, 260, true, true).length > 0;
            if (!hasGroundBelow) return;

            this.bossMoveMode = 'ground';
            if (this.bossFloatTween) this.bossFloatTween.stop();
            boss.body.allowGravity = true;
        } else {
            this.bossMoveMode = 'fly';
            /*
            boss.body.allowGravity = false;
            boss.setVelocityY(0);
            */
            boss.body.allowGravity = false;
boss.setVelocity(0, 0);

boss.setPosition(boss.x, this.bossBaseY);
boss.body.reset(boss.x, this.bossBaseY);

            boss.y = this.bossBaseY;
            this.bossFloatTween = this.tweens.add({
                targets: boss, y: this.bossBaseY - 20,
                duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        }
    }

    startCentinelaCover(time) {
        this.bossCovering = true;
        this.bossInvulnerable = true;
        this.bossLaserActive = false;
        this.laserGraphics.clear();
        this.boss.setAlpha(0.45);
        this.bossCoverEndAt = time + Phaser.Math.Between(1200, 1900);
    }

    endCentinelaCover(time) {
        this.bossCovering = false;
        this.bossInvulnerable = false;
        this.boss.setAlpha(1);
        this.bossNextRandomCoverAt = time + Phaser.Math.Between(5000, 9000);
    }

    // ── fireArcProjectile() ──────────────────────────────────────────────────
    // El Centinela lanza un proyectil parabólico con gravedad real.
    // Vuela en arco hacia donde está el jugador (velX horizontal + velY negativa).
    // ┌─ AJUSTES ────────────────────────────────────────────────────────────┐
    // │  proj.setDisplaySize(w,h)  → tamaño visual del proyectil            │
    // │  body.setGravityY(500)     → curvatura del arco (más = más curvo)   │
    // │  dirX * 180                → velocidad horizontal                   │
    // │  -260                      → impulso vertical inicial (más - = más alto)│
    // └──────────────────────────────────────────────────────────────────────┘
    fireArcProjectile() {
        const boss = this.boss;
        let proj = this.enemyArcProjectiles.create(boss.x, boss.y, 'part_red');
        proj.setDisplaySize(12, 12); // ← tamaño visual del proyectil parabólico
        proj.setTint(0xff6b81);
        proj.body.setAllowGravity(true);
        proj.body.setGravityY(500);
        const dirX = this.player.x < boss.x ? -1 : 1;
        proj.setVelocity(dirX * 180, -260);
        proj.damage = 15;
        proj.spawnTime = this.time.now;
    }

    // ── spawnDrone() ─────────────────────────────────────────────────────────
    // El Centinela invoca un dron pequeño que vuela hacia el jugador.
    // El jugador puede destruirlo saltando encima (handleDroneContact).
    // ┌─ AJUSTES ────────────────────────────────────────────────────────────┐
    // │  drone.setDisplaySize(w,h) → tamaño visual del dron                 │
    // │  physics.moveTo(..., 90)   → velocidad del dron en px/seg           │
    // │  drone.damage = 10         → daño que hace al contacto (% oxígeno)  │
    // └──────────────────────────────────────────────────────────────────────┘
    spawnDrone() {
        const boss = this.boss;
        let drone = this.enemyDrones.create(boss.x, boss.y + 10, 'balaMorada');
        drone.setDisplaySize(30, 30); // ← tamaño visual del dron
        // Sin tinte: el sprite balaMorada ya tiene el color morado propio
        drone.body.setAllowGravity(false);
        drone.damage = 10;
        drone.spawnTime = this.time.now;

        // Apuntar hacia el jugador y rotar el sprite en esa dirección
        const angle = Phaser.Math.Angle.Between(boss.x, boss.y + 10, this.player.x, this.player.y);
        drone.setRotation(angle);

        this.physics.moveTo(drone, this.player.x, this.player.y, 90);
    }

    // ========================================================================
    // IMPACTOS Y DAÑO
    // ========================================================================
    handleBulletHit(player, bullet) {
        bullet.destroy();
        this.damagePlayer(bullet.damage || 12);
    }

    handleArcProjectileHit(player, proj) {
        proj.destroy();
        this.damagePlayer(proj.damage || 15);
    }

    handleDroneContact(player, drone) {
        // Si el jugador cae encima del dron lo destruye sin recibir daño
        if (this.player.body.velocity.y > 0 && this.player.y < drone.y) {
            drone.destroy();
            this.player.setVelocityY(-260);
            const part = this.add.particles(drone.x, drone.y, 'part_magenta', {
                speed: { min: 40, max: 100 }, scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 },
                lifespan: 300, quantity: 8, blendMode: 'ADD'
            });
            part.explode();
            return;
        }
        drone.destroy();
        this.damagePlayer(drone.damage || 10);
    }

    damagePlayer(amount) {
        if (this.time.now < this.playerInvulnerableUntil) return;
        this.oxygenCurrent = Math.max(0, this.oxygenCurrent - amount);
        this.updateOxygenHUD();
        this.playerInvulnerableUntil = this.time.now + 500;
        this.cameras.main.shake(120, 0.008);
        this.playerVisual.setTint(0xff6666);
        this.time.delayedCall(150, () => { if (this.playerVisual.active) this.playerVisual.clearTint(); });

        if (this.oxygenCurrent <= 0) this.handleGameOver('oxygen');
    }

    // ── handleBossContact(player, boss) ──────────────────────────────────────
    // Callback de overlap entre el jugador y el sprite del jefe activo.
    // PISOTÓN (caer encima del boss) → daña al boss y rebota al jugador hacia arriba.
    // CONTACTO LATERAL/FRONTAL      → daña al jugador y lo empuja hacia atrás.
    // El umbral de pisotón usa body.bottom y body.top para mayor precisión que .y/.y.
    // Si el boss está cubierto (bossCovering=true), el contacto no daña al jugador.
    handleBossContact(player, boss) {
    // Si el jefe está derrotado o inactivo, ignorar
    if (this.bossDefeated || !boss.active || this.isGameOver || this.isGameWon) return;
    if (this.bossInvulnerable) return;

    // ── DETECCIÓN DE PISOTÓN ──────────────────────────────────────────────────
    // Condiciones: jugador cae (velocityY > 0) Y la parte inferior del jugador
    // está por encima del centro del boss. Ajusta el margen (+24) si el pisotón
    // no se registra o se registra demasiado fácil.
    const playerBottom = this.player.body.bottom;      // borde inferior real de la hitbox del jugador
    const bossMidY     = boss.body.top + boss.body.height * 0.5; // mitad superior del boss
    const stompingFromAbove = this.player.body.velocity.y > 0 && playerBottom < bossMidY + 24;
    let validHit = stompingFromAbove;

    //lógica de disparo solo por la espalda:
    /*
    if (this.bossType === 'centinela') {
        const behindSide = this.bossFacing === -1 ? (this.player.x > boss.x) : (this.player.x < boss.x);
        validHit = stompingFromAbove && behindSide;
    }
    */

    if (validHit) {
        this.player.setVelocityY(-280);
        this.damageBoss(1);
    } else {
        // Solo daña al jugador si el jefe NO está cubriéndose
        if (!this.bossCovering) {
            this.damagePlayer(15);
            const pushDir = this.player.x < boss.x ? -1 : 1;
            this.player.setVelocityX(pushDir * 200);
        }
    }
}

    // --- Aplica daño al jefe activo (usado tanto por el pisotón como por el arma) ---
    // ── damageBoss(amount) ───────────────────────────────────────────────────
    // Aplica 'amount' puntos de daño al jefe activo.
    // Fuentes de daño: pisotón (amount=1) y balas del jugador (amount=1).
    // Si bossHp llega a 0 → llama a defeatBoss().
    // El flash blanco solo se aplica si el boss sobrevive al golpe,
    // para evitar que quede blanco al ser destruido en el mismo frame.
    damageBoss(amount) {
        if (!this.boss || !this.boss.active || this.bossDefeated) return;
        this.bossHp -= amount;
        // Flash blanco solo si el jefe sigue vivo después del golpe
        if (this.bossHp > 0) {
            this.boss.setTintFill(0xffffff);
            this.time.delayedCall(120, () => {
                if (this.boss && this.boss.active) {
                    this.boss.clearTint();
                }
            });
        }
        if (this.bossHp <= 0) {
            this.defeatBoss();
        }
    }

    // ── defeatBoss() ─────────────────────────────────────────────────────────
    // Ejecuta la muerte del jefe: partículas de explosión, destruye el sprite,
    // elimina la barra de vida y hace aparecer la recompensa (arma o botas).
    // · Fase 1 → spawnArma()  (si el jugador no tiene arma)
    // · Fase 2 → spawnBoots() (si el jugador no tiene botas de doble salto)
    defeatBoss() {
        this.bossDefeated = true;
        const bx = this.boss.x, by = this.boss.y;
        this.boss.destroy();
        if (this.bossHpBarBg) this.bossHpBarBg.destroy();
        if (this.bossHpBarFill) this.bossHpBarFill.destroy();
        this.laserGraphics.clear();
        if (this.bossFloatTween) { this.bossFloatTween.stop(); this.bossFloatTween = null; }

        const part = this.add.particles(bx, by, 'part_red', {
            speed: { min: 60, max: 180 }, scale: { start: 1.6, end: 0 }, alpha: { start: 1, end: 0 },
            lifespan: 600, quantity: 30, blendMode: 'ADD'
        });
        part.explode();

        this.showFloatingText(bx, by - 30, this.phase === 1 ? '¡ROBOT DERROTADO!' : '¡CENTINELA DERROTADO!', '#22d3ee');

        // --- Recompensas ---
        if (this.bossType === 'soldado' && !this.playerHasWeapon) {
            this.spawnArma(bx, by - 10);
        } else if (this.bossType === 'centinela' && !playerProgress.hasDoubleJumpBoots) {
            this.spawnBoots(bx, by - 10);
        }
    }

    // ========================================================================
    // ARMA (recompensa por derrotar al Robot Soldado)
    // ========================================================================
    // ── spawnArma(x, y) ──────────────────────────────────────────────────────
    // Hace aparecer el arma droppeable cuando el Robot Soldado es derrotado.
    // El jugador la recoge con overlap → collectArma() → playerHasWeapon = true.
    // ┌─ TAMAÑO VISUAL ──────────────────────────────────────────────────────┐
    // │  arma.setDisplaySize(ancho, alto) → escala del sprite del arma       │
    // └──────────────────────────────────────────────────────────────────────┘
    spawnArma(x, y) {
        let arma = this.armaGroup.create(x, y, 'arma');
        arma.setDisplaySize(46, 18); // ← tamaño visual del arma droppeable
        arma.body.setImmovable(true);
        arma.body.setAllowGravity(true);
        this.tweens.add({
            targets: arma, y: y - 10,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    collectArma(player, arma) {
        arma.disableBody(true, true);
        this.playerHasWeapon = true;
        this.showFloatingText(player.x, player.y - 40, '¡ARMA CONSEGUIDA!', '#22d3ee');
        const part = this.add.particles(arma.x, arma.y, 'part_cyan', {
            speed: { min: 40, max: 120 }, angle: { min: 0, max: 360 },
            scale: { start: 1.3, end: 0 }, alpha: { start: 0.9, end: 0 },
            lifespan: 450, quantity: 16, blendMode: 'ADD'
        });
        part.explode();
    }

    // ========================================================================
    // BOTAS DE DOBLE SALTO (recompensa por derrotar al Centinela Marciano)
    // Desbloquea el doble salto de forma permanente (Nivel 1 y Nivel 2).
    // ========================================================================
    // ── spawnBoots(x, y) ─────────────────────────────────────────────────────
    // Hace aparecer las botas de doble salto cuando el Centinela es derrotado.
    // Recompensa permanente: desbloquea playerProgress.hasDoubleJumpBoots = true.
    // ┌─ TAMAÑO VISUAL ──────────────────────────────────────────────────────┐
    // │  boots.setDisplaySize(ancho, alto) → escala del sprite de las botas  │
    // └──────────────────────────────────────────────────────────────────────┘
    spawnBoots(x, y) {
        let boots = this.bootsGroup.create(x, y, 'boots_tex');
        boots.setDisplaySize(36, 28); // ← tamaño visual de las botas droppeable
        boots.body.setImmovable(true);
        boots.body.setAllowGravity(true);
        this.tweens.add({
            targets: boots, y: y - 10,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    collectBoots(player, boots) {
        boots.disableBody(true, true);
        playerProgress.hasDoubleJumpBoots = true;
        this.showFloatingText(player.x, player.y - 40, '¡BOTAS DE DOBLE SALTO CONSEGUIDAS!', '#a855f7');
        const part = this.add.particles(boots.x, boots.y, 'part_magenta', {
            speed: { min: 40, max: 120 }, angle: { min: 0, max: 360 },
            scale: { start: 1.3, end: 0 }, alpha: { start: 0.9, end: 0 },
            lifespan: 450, quantity: 16, blendMode: 'ADD'
        });
        part.explode();
    }

    // ── createBossHpBar() ────────────────────────────────────────────────────
    // Crea la barra de vida que flota encima del boss.
    // ┌─ AJUSTAR POSICIÓN/TAMAÑO de la barra ────────────────────────────────┐
    // │  -40   → distancia vertical sobre el boss (más negativo = más arriba)│
    // │  50    → ancho total de la barra en px                               │
    // │  6     → alto de la barra en px                                      │
    // └──────────────────────────────────────────────────────────────────────┘
    createBossHpBar() {
        this.bossHpBarBg = this.add.rectangle(this.boss.x, this.boss.y - 40, 50, 6, 0x000000, 0.6);
        this.bossHpBarFill = this.add.rectangle(this.boss.x - 25, this.boss.y - 40, 50, 6, 0xff4444).setOrigin(0, 0.5);
    }

    updateBossHpBar() {
        if (!this.boss || !this.boss.active || !this.bossHpBarBg) return;
        this.bossHpBarBg.setPosition(this.boss.x, this.boss.y - 40);
        this.bossHpBarFill.setPosition(this.boss.x - 25, this.boss.y - 40);
        const pct = Math.max(0, this.bossHp / this.bossMaxHp);
        this.bossHpBarFill.width = 50 * pct;
    }

    // ── cleanupProjectiles() ─────────────────────────────────────────────────
    // Elimina proyectiles que ya salieron de la pantalla o llevan demasiado
    // tiempo activos, para evitar acumulación de objetos en memoria.
    // Límites de vida: balas enemigas 4s, balas jugador 2s, drones 6s.
    cleanupProjectiles() {
        const now = this.time.now;
        const camLeft = this.cameras.main.scrollX - 150;
        const camRight = this.cameras.main.scrollX + this.cameras.main.width + 150;

        this.enemyBullets.getChildren().forEach(b => {
            if (b.x < camLeft || b.x > camRight || now - b.spawnTime > 4000) b.destroy();
        });
        this.playerBullets.getChildren().forEach(b => {
            if (b.x < camLeft || b.x > camRight || b.y < -100 || b.y > 700 || now - b.spawnTime > 2000) b.destroy();
        });
        this.enemyArcProjectiles.getChildren().forEach(p => {
            if (p.y > 620 || now - p.spawnTime > 4000) p.destroy();
        });
        this.enemyDrones.getChildren().forEach(d => {
            if (now - d.spawnTime > 6000) d.destroy();
        });
    }

    // ========================================================================
    // DERROTA / VICTORIA
    // ========================================================================
    handleGameOver(reason) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.cameras.main.shake(250, 0.015);
        this.laserGraphics.clear();

        const failParticles = this.add.particles(this.player.x, this.player.y, 'part_red', {
            speed: { min: 40, max: 150 }, scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 }, lifespan: 600, quantity: 25, blendMode: 'ADD'
        });
        failParticles.explode();

        this.player.setVisible(false);
        this.playerVisual.setVisible(false);

        if (reason === 'oxygen') {
            document.getElementById('hud-status').innerText = 'SIN OXÍGENO';
            document.getElementById('gameover-title').innerText = '¡SIN OXÍGENO!';
            document.getElementById('gameover-text').innerText = 'Te has quedado sin oxígeno y te has ahogado en el vacío del espacio.';
        } else {
            document.getElementById('hud-status').innerText = 'CONEXIÓN PERDIDA';
            document.getElementById('gameover-title').innerText = '¡CONEXIÓN PERDIDA!';
            document.getElementById('gameover-text').innerText = 'Te has desvanecido en el vacío.';
        }
        document.getElementById('hud-status').className = 'hud-value neon-text-red';

        this.time.delayedCall(800, () => {
            document.getElementById('gameover-overlay').classList.add('active');
            document.getElementById('game-hud').classList.remove('active');
        });
    }

    winGame() {
        if (this.isGameWon || this.isGameOver || this.isTransitioningPhase) return;

        if (!this.bossDefeated) {
            const msg = this.phase === 1 ? '¡DERROTA AL ROBOT SOLDADO!' : '¡DERROTA AL CENTINELA MARCIANO!';
            this.showBlockedWarning(msg);
            return;
        }

        if (this.phase === 1) {
            // --- Transición interna a la Fase 2 (todavía no es el fin del nivel) ---
            this.isTransitioningPhase = true;
            this.physics.pause();
            this.player.body.enable = false;
            this.tweens.add({
                targets: this.playerVisual,
                x: this.portal.x, y: this.portal.y,
                scaleX: 0, scaleY: 0, alpha: 0, rotation: 6.28,
                duration: 700, ease: 'Power2.easeOut',
                onComplete: () => {
                    this.scene.restart({ phase: 2, gasoline: this.collectedGasoline, hasWeapon: this.playerHasWeapon });
                }
            });
            return;
        }

        // --- Fase 2: fin real del Nivel 2 ---
        if (this.collectedGasoline < this.gasolineNeeded) {
            this.showBlockedWarning(`¡NECESITAS AL MENOS ${this.gasolineNeeded} GASOLINAS!`);
            return;
        }

        this.isGameWon = true;
        this.physics.pause();
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

                document.getElementById('win-gems-row').style.display = 'flex';
                document.getElementById('win-oxygen-row').style.display = 'none';
                document.getElementById('win-gems').innerText = `${this.collectedGasoline} / ${this.gasolineNeeded}`;
                document.getElementById('win-overlay').classList.add('active');
                document.getElementById('game-hud').classList.remove('active');
            }
        });
    }

    showBlockedWarning(msg) {
        let warningText = this.add.text(this.player.x, this.player.y - 45, msg, {
            fontFamily: 'Orbitron', fontSize: '16px', fontWeight: '900',
            fill: '#facc15', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: warningText, y: warningText.y - 30, alpha: 0,
            duration: 2000, onComplete: () => warningText.destroy()
        });

        if (this.player.x < this.portal.x) {
            this.player.setVelocityX(-220); this.player.setVelocityY(-180);
        } else {
            this.player.setVelocityX(220); this.player.setVelocityY(-180);
        }
    }

    // ── setPlayerTexture(key) ────────────────────────────────────────────────
    // Cambia el sprite visible del jugador.
    // Si playerHasWeapon=true, sustituye automáticamente por el sprite con arma.
    // Mapa de sustitución: derecha→derechaArma, izquierda→izquierdaArma, etc.
    // Llama a setDisplaySize(48,48) en cada cambio para mantener el tamaño fijo.
    // ┌─ TAMAÑO VISUAL del jugador ──────────────────────────────────────────┐
    // │  setDisplaySize(48, 48) → cambia aquí para escalar al personaje      │
    // └──────────────────────────────────────────────────────────────────────┘
    setPlayerTexture(key) {
        // Si el jugador tiene el arma, usar sprites armados
        let finalKey = key;
        if (this.playerHasWeapon) {
            const armedMap = {
                'derecha':        'derechaArma',
                'izquierda':      'izquierdaArma',
                'saltoDerecha':   'saltoDerechaArma',
                'saltoIzquierda': 'saltoIzquierdaArma'
            };
            finalKey = armedMap[key] || key;
        }
        if (this.playerVisual.texture.key !== finalKey) {
            this.playerVisual.setTexture(finalKey);
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

        this.textureOffsets = {
        frontal:        { x: 0, y: 0 },
        derecha:        { x: 0, y: 0 },
        izquierda:      { x: 0, y: -3 },   // <- ajustá este valor
        saltoDerecha:   { x: 0, y: 0 },    // <- ajustá si hace falta
        saltoIzquierda: { x: 0, y: 0 }     // <- ajustá si hace falta
    };
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
        //this.player.name = "PLAYER";
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
        document.getElementById('hud-item-gems').style.display = 'flex';
        document.getElementById('hud-item-oxygen').style.display = 'none';
        document.getElementById('gameover-title').innerText = '¡CONEXIÓN PERDIDA!';
        document.getElementById('gameover-text').innerText = 'Te has desvanecido en el vacío.';
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

                document.getElementById('win-gems-row').style.display = 'flex';
                document.getElementById('win-oxygen-row').style.display = 'none';
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
            //this.scene.start('Level2Scene');
            
            this.scene.start('Level2Scene', {
                phase: 2,
                gasoline: 10,
                hasWeapon: true
            });
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
            debug: true
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