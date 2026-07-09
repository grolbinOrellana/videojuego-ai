// ============================================================================
// ESCENA DE JUEGO PRINCIPAL - NIVEL 1 (GameScene) - Estilo Synthwave
// Aquí se gestiona toda la física del primer nivel, colisiones y gemas.
// ============================================================================
class GameScene extends Phaser.Scene {
    constructor() {
        super({key: 'GameScene'});
    }

    // ------------------------------------------------------------------------
    // 1. INICIALIZACIÓN
    // Se ejecuta al arrancar la escena. Reinicia los contadores y estados.
    // ------------------------------------------------------------------------
    init() {
        this.collectedGems = 0; // Contador de gemas recogidas
        this.totalGems = 0;     // Total de gemas disponibles en el nivel
        this.wasOnGround = true;// Bandera para detectar transiciones aire->suelo
        this.jumpCount = 0;     // Contador de saltos para permitir doble salto
        this.isGameOver = false;// Evita que la derrota se ejecute múltiples veces
        this.isGameWon = false; // Evita que la victoria se ejecute múltiples veces
        this.lastMovedDir = 'right'; // Dirección inicial mirando a la derecha
        this.lastActionTime = 0;     // Timestamp de la última acción del jugador
    }

    // ------------------------------------------------------------------------
    // 2. PRE-CARGA
    // Carga los sprites del jugador y genera texturas de neón antes del render.
    // ------------------------------------------------------------------------
    preload() {
        // Cargar los sprites del personaje principal desde la carpeta de Recursos
        this.load.image('frontal', 'Recursos/frontal.png');
        this.load.image('derecha', 'Recursos/derecha.png');
        this.load.image('izquierda', 'Recursos/izquierda.png');
        this.load.image('saltoDerecha', 'Recursos/saltoDerecha.png');
        this.load.image('saltoIzquierda', 'Recursos/saltoIzquierda.png');

        // Genera todas las texturas de neón y de luna usando la API Canvas de Phaser
        this.createNeonTextures();
    }

    // ------------------------------------------------------------------------
    // 3. CREACIÓN
    // Construye el mundo, el jugador, las plataformas y los controles de entrada.
    // ------------------------------------------------------------------------
    create() {
        // Registrar el tiempo inicial de acción
        this.lastActionTime = this.time.now;

        // Configuración de límites del nivel 1
        const levelWidth = 3200;
        const levelHeight = 576;
        
        // Define los bordes del sistema de física (Arcade Physics).
        this.physics.world.setBounds(0, 0, levelWidth, levelHeight + 100);
        this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);

        // --- 3.1 FONDO DE PARALLAX (Synthwave) ---
        // Genera 150 estrellas de neón
        for (let i = 0; i < 150; i++) {
            let x = Phaser.Math.Between(0, levelWidth);
            let y = Phaser.Math.Between(0, levelHeight - 100);
            let size = Phaser.Math.Between(1, 3);
            let alpha = Phaser.Math.FloatBetween(0.2, 0.7);
            let starColor = Phaser.Utils.Array.GetRandom([0xffffff, 0x00e5ff, 0xec4899]);
            let star = this.add.circle(x, y, size, starColor, alpha);
            star.setScrollFactor(Phaser.Math.FloatBetween(0.02, 0.15));
        }

        // Montañas/Líneas vectoriales de fondo
        /*let bgGraphics = this.add.graphics();
        bgGraphics.setScrollFactor(0.05);
        bgGraphics.lineStyle(2, 0x8b5cf6, 0.15);
        bgGraphics.beginPath();
        bgGraphics.moveTo(0, 500);
        bgGraphics.lineTo(250, 280);
        bgGraphics.lineTo(500, 480);
        bgGraphics.lineTo(750, 220);
        bgGraphics.lineTo(1000, 450);
        bgGraphics.lineTo(1250, 310);
        bgGraphics.lineTo(1500, 490);
        bgGraphics.lineTo(1750, 200);
        bgGraphics.lineTo(2000, 470);
        bgGraphics.lineTo(2250, 250);
        bgGraphics.lineTo(2500, 480);
        bgGraphics.lineTo(2750, 280);
        bgGraphics.lineTo(3000, 500);
        bgGraphics.strokePath();
*/
        // --- 3.2 ESTRUCTURAS: PLATAFORMAS ESTÁTICAS (Nivel 1) ---
        this.platforms = this.physics.add.staticGroup();

        // Suelos (Grounds)
        this.platforms.create(400, 556, 'plat_800');   
        this.platforms.create(1450, 556, 'plat_700');  
        this.platforms.create(2600, 556, 'plat_1200'); 

        // Plataformas elevadas
        this.platforms.create(900, 500, 'plat_150');   
        this.platforms.create(1450, 400, 'plat_200');  
        this.platforms.create(1650, 310, 'plat_150');  
        this.platforms.create(2150, 440, 'plat_200');  
        this.platforms.create(2400, 360, 'plat_200');  
        this.platforms.create(2650, 270, 'plat_150');  

        this.platforms.refresh();

        // --- 3.3 ESTRUCTURAS: PLATAFORMAS MÓVILES ---
        this.movingPlatforms = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });

        let verticalPlat = this.movingPlatforms.create(1200, 380, 'plat_100');
        verticalPlat.name = 'vertical';
        verticalPlat.body.setVelocityY(-100);
        verticalPlat.body.setFriction(1, 1);

        let horizontalPlat = this.movingPlatforms.create(1900, 380, 'plat_120');
        horizontalPlat.name = 'horizontal';
        horizontalPlat.body.setVelocityX(120);
        horizontalPlat.body.setFriction(1, 1);

        this.movingPlatforms.getChildren().forEach(p => {
            p.body.setImmovable(true);
        });

        // --- 3.4 ESTRUCTURAS: PORTAL DE META ---
        this.portal = this.physics.add.sprite(3050, 496, 'portal_tex');
        this.portal.body.allowGravity = false;
        this.portal.body.setImmovable(true);
        
        this.portalParticles = this.add.particles(this.portal.x, this.portal.y, 'part_green', {
            speedY: { min: -100, max: -30 },
            speedX: { min: -20, max: 20 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 1000,
            frequency: 100,
            blendMode: 'ADD'
        });

        // --- 3.5 ESTRUCTURAS: GEMAS COLECCIONABLES ---
        this.gems = this.physics.add.group({
            allowGravity: false
        });

        const gemCoords = [
            {x: 400, y: 480},
            {x: 600, y: 420},
            {x: 900, y: 370},      
            {x: 1200, y: 220},     
            {x: 1450, y: 320},     
            {x: 1650, y: 230},     
            {x: 1950, y: 280},     
            {x: 2150, y: 360},     
            {x: 2400, y: 280},     
            {x: 2650, y: 190}      
        ];

        gemCoords.forEach(coord => {
            let gem = this.gems.create(coord.x, coord.y, 'gem_tex');
            gem.body.setImmovable(true);
            
            this.tweens.add({
                targets: gem,
                y: coord.y - 12,
                duration: 1500 + Phaser.Math.Between(-200, 200),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        this.totalGems = gemCoords.length;

        // --- 3.6 PERSONAJE (Cuerpo Físico y Objeto Visual) ---
        this.player = this.physics.add.sprite(100, 450, 'frontal');
        this.player.setCollideWorldBounds(false); 
        this.player.body.setGravityY(1000);       
        this.player.body.setMaxVelocity(400, 800);
        this.player.setOrigin(0.5, 0.5);
        this.player.setAlpha(0);                  
        this.player.body.setSize(32, 32);         

        this.playerVisual = this.add.sprite(100, 450, 'frontal');
        this.playerVisual.setOrigin(0.5, 0.5);
        this.playerVisual.setDisplaySize(48, 48); 



        // --- 3.7 COLISIONES ---
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.movingPlatforms);
        this.physics.add.overlap(this.player, this.gems, this.collectGem, null, this);
        this.physics.add.overlap(this.player, this.portal, this.winGame, null, this);

        // --- 3.8 CONTROLES ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

        this.input.keyboard.on('keydown-SPACE', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-UP', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-W', () => { this.checkJump(); });

        // --- 3.9 CÁMARA Y HUD ---
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        
        this.updateHUDText();
        document.getElementById('game-hud').classList.add('active');
        document.getElementById('hud-status').innerText = 'ACTIVO';
        document.getElementById('hud-status').className = 'hud-value neon-glow-cyan';
    }

    // ------------------------------------------------------------------------
    // 4. ACTUALIZACIÓN PERIÓDICA (update)
    // ------------------------------------------------------------------------
    update() {
        if (this.isGameOver || this.isGameWon) return;

        let isMovingLeft = this.cursors.left.isDown || this.keyA.isDown;
        let isMovingRight = this.cursors.right.isDown || this.keyD.isDown;

        // --- 4.1 MOVIMIENTO HORIZONTAL Y REGISTRO DE ACCIONES ---
        if (isMovingLeft) {
            this.player.setVelocityX(-260);
            this.playerVisual.setAngle(-8);
            this.lastMovedDir = 'left';
            this.lastActionTime = this.time.now; // Actualizar tiempo de acción
        } else if (isMovingRight) {
            this.player.setVelocityX(260);
            this.playerVisual.setAngle(8);
            this.lastMovedDir = 'right';
            this.lastActionTime = this.time.now; // Actualizar tiempo de acción
        } else {
            this.player.setVelocityX(0);
            this.playerVisual.setAngle(0);
        }

        // Alinear visual
        this.playerVisual.x = this.player.x;
        this.playerVisual.y = this.player.y;

        // --- 4.2 LÓGICA DE TEXTURA CON DELAY DE 5 SEGUNDOS ---
        let onGround = this.player.body.blocked.down || this.player.body.touching.down;
        let textureToUse = 'frontal';

        if (!onGround) {
            // Si está en el aire, es una acción (actualiza tiempo)
            this.lastActionTime = this.time.now;
            
            if (isMovingLeft || this.lastMovedDir === 'left') {
                textureToUse = 'saltoIzquierda';
            } else {
                textureToUse = 'saltoDerecha';
            }
        } else {
            // En el suelo
            if (isMovingLeft) {
                textureToUse = 'izquierda';
            } else if (isMovingRight) {
                textureToUse = 'derecha';
            } else {
                // Estado quieto: comprobar si han transcurrido 5 segundos (5000ms) sin hacer nada
                if (this.time.now - this.lastActionTime >= 1500) {
                    textureToUse = 'frontal'; // Volver al frontal después del retraso
                } else {
                    // Mantener el sprite de la última dirección de movimiento
                    textureToUse = (this.lastMovedDir === 'left') ? 'izquierda' : 'derecha';
                }
            }
        }

        this.setPlayerTexture(textureToUse);

        // --- 4.3 ATERRIZAJE ---
        if (onGround && !this.wasOnGround) {
            this.jumpCount = 0;
            this.lastActionTime = this.time.now;
            
            this.tweens.add({
                targets: this.playerVisual,
                displayWidth: 48 * 1.3,
                displayHeight: 48 * 0.7,
                duration: 80,
                yoyo: true,
                repeat: 0,
                onComplete: () => {
                    this.playerVisual.setDisplaySize(48, 48);
                }
            });

            const landPart = this.add.particles(this.player.x, this.player.y + 16, 'part_white', {
                speed: { min: 10, max: 60 },
                angle: { min: 200, max: 340 },
                scale: { start: 0.8, end: 0 },
                alpha: { start: 0.6, end: 0 },
                lifespan: 250,
                quantity: 6,
                blendMode: 'ADD'
            });
            landPart.explode();
        }

        this.wasOnGround = onGround;

        // Plataformas móviles
        this.movingPlatforms.getChildren().forEach(p => {
            if (p.name === 'vertical') {
                if (p.y <= 250) {
                    p.body.setVelocityY(100);
                } else if (p.y >= 470) {
                    p.body.setVelocityY(-100);
                }
            } else if (p.name === 'horizontal') {
                if (p.x <= 1750) {
                    p.body.setVelocityX(120);
                } else if (p.x >= 2050) {
                    p.body.setVelocityX(-120);
                }
            }
        });

        if (this.player.y > 600) {
            this.handleGameOver();
        }
    }

    // ------------------------------------------------------------------------
    // 5. ACCIONES
    // ------------------------------------------------------------------------
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
            displayWidth: 48 * 0.7,
            displayHeight: 48 * 1.3,
            duration: 100,
            yoyo: true,
            repeat: 0,
            onComplete: () => {
                this.playerVisual.setDisplaySize(48, 48);
            }
        });

        const particleColor = isDouble ? 'part_red' : 'part_white';
        const jumpPart = this.add.particles(this.player.x, this.player.y + 16, particleColor, {
            speed: { min: 20, max: 90 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 300,
            quantity: isDouble ? 12 : 8,
            blendMode: 'ADD'
        });
        jumpPart.explode();
    }

    collectGem(player, gem) {
        gem.disableBody(true, true);
        this.collectedGems++;
        this.updateHUDText();

        const gemPart = this.add.particles(gem.x, gem.y, 'part_yellow', {
            speed: { min: 40, max: 120 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.9, end: 0 },
            lifespan: 400,
            quantity: 12,
            blendMode: 'ADD'
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
            speed: { min: 40, max: 150 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            quantity: 25,
            blendMode: 'ADD'
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

        // --- LÓGICA DE COLECCIÓN DE GEMAS OBLIGATORIA ---
        if (this.collectedGems < this.totalGems) {
            // Alerta visual de advertencia flotante sobre la cabeza del jugador
            let warningText = this.add.text(this.player.x, this.player.y - 45, '¡NECESITAS TODAS LAS GEMAS!', {
                fontFamily: 'Orbitron',
                fontSize: '18px',
                fontWeight: '900',
                fill: '#facc15',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);

            this.tweens.add({
                targets: warningText,
                y: warningText.y - 30,
                alpha: 0,
                duration: 1500,
                onComplete: () => warningText.destroy()
            });

            // Rebote físico hacia atrás alejado del portal
            if (this.player.x < this.portal.x) {
                this.player.setVelocityX(-220);
                this.player.setVelocityY(-180);
            } else {
                this.player.setVelocityX(220);
                this.player.setVelocityY(-180);
            }
            return;
        }

        this.isGameWon = true;
        this.physics.pause();
        this.portalParticles.stop();
        this.player.body.enable = false;

        this.tweens.add({
            targets: this.playerVisual,
            x: this.portal.x,
            y: this.portal.y,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            rotation: 6.28,
            duration: 700,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Personalizar el menú de victoria para el Nivel 1
                document.querySelector('.win-panel h2').innerText = '¡NIVEL 1 SUPERADO!';
                document.querySelector('.win-panel p').innerText = '¡Sistema inicial pirateado!';
                document.getElementById('btn-next-level').style.display = 'inline-block'; // Activar paso al nivel 2

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

    // ------------------------------------------------------------------------
    // 6. GENERADOR DE TEXTURAS DINÁMICAS (Canvas)
    // ------------------------------------------------------------------------
    createNeonTextures() {
        // Texturas Synthwave
        this.createPlatformTexture('plat_800', 800, 40, '#ec4899', '#8b5cf6');
        this.createPlatformTexture('plat_700', 700, 40, '#ec4899', '#8b5cf6');
        this.createPlatformTexture('plat_1200', 1200, 40, '#ec4899', '#8b5cf6');
        this.createPlatformTexture('plat_200', 200, 20, '#d946ef', '#6366f1');
        this.createPlatformTexture('plat_150', 150, 20, '#d946ef', '#6366f1');
        this.createPlatformTexture('plat_120', 120, 20, '#00e5ff', '#3b82f6');
        this.createPlatformTexture('plat_100', 100, 20, '#00e5ff', '#3b82f6');

        // Texturas Lunares (Gris con cráteres y luz blanca/plateada)
        this.createPlatformTexture('plat_moon_800', 800, 40, '#e2e8f0', '#94a3b8', true);
        this.createPlatformTexture('plat_moon_700', 700, 40, '#e2e8f0', '#94a3b8', true);
        this.createPlatformTexture('plat_moon_1200', 1200, 40, '#e2e8f0', '#94a3b8', true);
        this.createPlatformTexture('plat_moon_200', 200, 20, '#ffffff', '#cbd5e1', true);
        this.createPlatformTexture('plat_moon_150', 150, 20, '#ffffff', '#cbd5e1', true);
        this.createPlatformTexture('plat_moon_120', 120, 20, '#a5f3fc', '#06b6d4', true); // móviles cian lunar
        this.createPlatformTexture('plat_moon_100', 100, 20, '#a5f3fc', '#06b6d4', true);

        // Textura del Portal
        let ptCanvas = this.textures.createCanvas('portal_tex', 40, 80);
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

        // Textura de las Gemas
        let gCanvas = this.textures.createCanvas('gem_tex', 16, 16);
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

        // Partículas
        this.createParticleTexture('part_white', '#ffffff');
        this.createParticleTexture('part_magenta', '#ec4899');
        this.createParticleTexture('part_yellow', '#facc15');
        this.createParticleTexture('part_red', '#ef4444');
        this.createParticleTexture('part_green', '#10b981');

        // Textura de la Tierra (Fondo Nivel Lunar)
        let earthCanvas = this.textures.createCanvas('earth_tex', 128, 128);
        let eCtx = earthCanvas.context;
        let eGrad = eCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
        eGrad.addColorStop(0, '#e0f2fe'); // Núcleo luminoso
        eGrad.addColorStop(0.3, '#38bdf8'); // Atmósfera
        eGrad.addColorStop(0.6, '#0284c7'); // Océanos
        eGrad.addColorStop(0.8, '#16a34a'); // Continentes
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

    createPlatformTexture(key, width, height, startColor, endColor, isMoon = false) {
        let canvas = this.textures.createCanvas(key, width, height);
        let ctx = canvas.context;

        if (isMoon) {
            // Fondo gris roca lunar
            ctx.fillStyle = '#1e293b'; 
            ctx.fillRect(0, 0, width, height);

            // Dibujar cráteres lunares circulares oscuros
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#334155';
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
            // Plataforma clásica neón
            ctx.fillStyle = 'rgba(10, 8, 20, 0.9)';
            ctx.fillRect(0, 0, width, height);
        }

        // Borde brillante superior
        let grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, startColor);
        grad.addColorStop(0.5, endColor);
        grad.addColorStop(1, startColor);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(width, 2);
        ctx.stroke();

        ctx.strokeStyle = isMoon ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);

        canvas.refresh();
    }

    createParticleTexture(key, hexColor) {
        let canvas = this.textures.createCanvas(key, 6, 6);
        let ctx = canvas.context;
        ctx.fillStyle = hexColor;
        ctx.fillRect(0, 0, 6, 6);
        canvas.refresh();
    }
}

// ============================================================================
// ESCENA DE JUEGO - NIVEL 2 (Level2Scene) - Estilo Lunar (Luna / Baja Gravedad)
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
    }

    preload() {
        // Los sprites ya están cargados en el nivel 1, pero se aseguran en caso de entrada directa
        this.load.image('frontal', 'Recursos/frontal.png');
        this.load.image('derecha', 'Recursos/derecha.png');
        this.load.image('izquierda', 'Recursos/izquierda.png');
        this.load.image('saltoDerecha', 'Recursos/saltoDerecha.png');
        this.load.image('saltoIzquierda', 'Recursos/saltoIzquierda.png');
    }

    create() {
        this.lastActionTime = this.time.now;

        // Configuración de límites del nivel 2 (Luna)
        const levelWidth = 3200;
        const levelHeight = 576;

        // Sobrescribimos la gravedad física del motor Arcade para simular gravedad de la Luna (Baja gravedad)
        this.physics.world.gravity.y = 350; // Gravedad baja (lunar) en lugar de 800

        this.physics.world.setBounds(0, 0, levelWidth, levelHeight + 100);
        this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);

        // --- 1. FONDO DE PARALLAX ESPACIAL LUNAR ---
        // Planeta Tierra gigante flotando al fondo
        let earth = this.add.sprite(900, 160, 'earth_tex');
        earth.setDisplaySize(160, 160);
        earth.setScrollFactor(0.01); // Se desplaza increíblemente lento para simular distancia estelar

        // Estrellas de fondo
        for (let i = 0; i < 200; i++) {
            let x = Phaser.Math.Between(0, levelWidth);
            let y = Phaser.Math.Between(0, levelHeight - 120);
            let size = Phaser.Math.Between(1, 2);
            let alpha = Phaser.Math.FloatBetween(0.3, 0.8);
            let starColor = Phaser.Utils.Array.GetRandom([0xffffff, 0xa5f3fc, 0xcbd5e1]);
            let star = this.add.circle(x, y, size, starColor, alpha);
            star.setScrollFactor(Phaser.Math.FloatBetween(0.01, 0.12));
        }

        // --- 2. ESTRUCTURAS: PLATAFORMAS ESTÁTICAS DE LA LUNA ---
        this.platforms = this.physics.add.staticGroup();

        // Suelos rocosos lunares
        this.platforms.create(400, 556, 'plat_moon_800');   // Suelo lunar 1
        this.platforms.create(1500, 556, 'plat_moon_700');  // Suelo lunar 2
        this.platforms.create(2700, 556, 'plat_moon_1200'); // Suelo lunar 3 (meta)

        // Rocas flotantes lunares a alturas mayores (gracias a la baja gravedad el salto es enorme)
        this.platforms.create(950, 400, 'plat_moon_150');   
        this.platforms.create(1550, 320, 'plat_moon_200');  
        this.platforms.create(1780, 240, 'plat_moon_150');  
        this.platforms.create(2250, 420, 'plat_moon_200');  
        this.platforms.create(2480, 330, 'plat_moon_200');  
        this.platforms.create(2750, 240, 'plat_moon_150');  

        this.platforms.refresh();

        // --- 3. ESTRUCTURAS: PLATAFORMAS MÓVILES LUNARES ---
        this.movingPlatforms = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });

        // Ascensor vertical lunar
        let verticalPlat = this.movingPlatforms.create(1250, 300, 'plat_moon_100');
        verticalPlat.name = 'vertical';
        verticalPlat.body.setVelocityY(-80);
        verticalPlat.body.setFriction(1, 1);

        // Plataforma deslizante horizontal en la segunda gran brecha
        let horizontalPlat = this.movingPlatforms.create(2020, 300, 'plat_moon_120');
        horizontalPlat.name = 'horizontal';
        horizontalPlat.body.setVelocityX(100);
        horizontalPlat.body.setFriction(1, 1);

        this.movingPlatforms.getChildren().forEach(p => {
            p.body.setImmovable(true);
        });

        // --- 4. META (PORTAL LUNAR) ---
        this.portal = this.physics.add.sprite(3050, 496, 'portal_tex');
        this.portal.body.allowGravity = false;
        this.portal.body.setImmovable(true);
        
        this.portalParticles = this.add.particles(this.portal.x, this.portal.y, 'part_green', {
            speedY: { min: -100, max: -30 },
            speedX: { min: -20, max: 20 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 1000,
            frequency: 100,
            blendMode: 'ADD'
        });

        // --- 5. ESTRUCTURAS: MONEDAS LUNARES ---
        this.gems = this.physics.add.group({
            allowGravity: false
        });

        // Posiciones de las 10 gemas flotando alto por la luna
        const gemCoords = [
            {x: 400, y: 440},
            {x: 600, y: 380},
            {x: 950, y: 280},      
            {x: 1250, y: 150},     
            {x: 1550, y: 200},     
            {x: 1780, y: 120},     
            {x: 2020, y: 180},     
            {x: 2250, y: 300},     
            {x: 2480, y: 200},     
            {x: 2750, y: 120}      
        ];

        gemCoords.forEach(coord => {
            let gem = this.gems.create(coord.x, coord.y, 'gem_tex');
            gem.body.setImmovable(true);
            
            this.tweens.add({
                targets: gem,
                y: coord.y - 12,
                duration: 1800 + Phaser.Math.Between(-300, 300),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        this.totalGems = gemCoords.length;

        // --- 6. PERSONAJE (Alineamiento especial de baja gravedad) ---
        this.player = this.physics.add.sprite(100, 450, 'frontal');
        this.player.setCollideWorldBounds(false); 
        this.player.body.setGravityY(400); // Gravedad reducida también en el cuerpo físico
        this.player.body.setMaxVelocity(350, 600); // Velocidades máximas en órbita
        this.player.setOrigin(0.5, 0.5);
        this.player.setAlpha(0);                  
        this.player.body.setSize(32, 32);         

        this.playerVisual = this.add.sprite(100, 450, 'frontal');
        this.playerVisual.setOrigin(0.5, 0.5);
        this.playerVisual.setDisplaySize(48, 48);



        // --- 7. COLISIONES ---
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.movingPlatforms);
        this.physics.add.overlap(this.player, this.gems, this.collectGem, null, this);
        this.physics.add.overlap(this.player, this.portal, this.winGame, null, this);

        // --- 8. CONTROLES ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

        this.input.keyboard.on('keydown-SPACE', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-UP', () => { this.checkJump(); });
        this.input.keyboard.on('keydown-W', () => { this.checkJump(); });

        // --- 9. CÁMARA Y HUD ---
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        
        this.updateHUDText();
        document.getElementById('game-hud').classList.add('active');
        document.getElementById('hud-status').innerText = 'SECTOR LUNAR';
        document.getElementById('hud-status').className = 'hud-value neon-glow-cyan';
    }

    update() {
        if (this.isGameOver || this.isGameWon) return;

        let isMovingLeft = this.cursors.left.isDown || this.keyA.isDown;
        let isMovingRight = this.cursors.right.isDown || this.keyD.isDown;

        // --- MOVIMIENTO HORIZONTAL LUNAR (Inercia leve) ---
        if (isMovingLeft) {
            this.player.setVelocityX(-220); // Velocidad ligeramente menor por inercia orbital
            this.playerVisual.setAngle(-6);
            this.lastMovedDir = 'left';
            this.lastActionTime = this.time.now;
        } else if (isMovingRight) {
            this.player.setVelocityX(220);
            this.playerVisual.setAngle(6);
            this.lastMovedDir = 'right';
            this.lastActionTime = this.time.now;
        } else {
            // Desaceleración suave para dar sensación de inercia espacial
            this.player.setVelocityX(this.player.body.velocity.x * 0.9);
            this.playerVisual.setAngle(0);
        }

        // Alinear visual
        this.playerVisual.x = this.player.x;
        this.playerVisual.y = this.player.y;

        // --- LÓGICA DE TEXTURA CON RETRASO DE 5 SEGUNDOS ---
        let onGround = this.player.body.blocked.down || this.player.body.touching.down;
        let textureToUse = 'frontal';

        if (!onGround) {
            this.lastActionTime = this.time.now;
            
            if (isMovingLeft || this.lastMovedDir === 'left') {
                textureToUse = 'saltoIzquierda';
            } else {
                textureToUse = 'saltoDerecha';
            }
        } else {
            if (isMovingLeft) {
                textureToUse = 'izquierda';
            } else if (isMovingRight) {
                textureToUse = 'derecha';
            } else {
                if (this.time.now - this.lastActionTime >= 5000) {
                    textureToUse = 'frontal';
                } else {
                    textureToUse = (this.lastMovedDir === 'left') ? 'izquierda' : 'derecha';
                }
            }
        }

        this.setPlayerTexture(textureToUse);

        // --- ATERRIZAJE FLOTANTE LUNAR ---
        if (onGround && !this.wasOnGround) {
            this.jumpCount = 0;
            this.lastActionTime = this.time.now;
            
            // Squash más suave y flotante al caer en la Luna
            this.tweens.add({
                targets: this.playerVisual,
                displayWidth: 48 * 1.2,
                displayHeight: 48 * 0.8,
                duration: 100,
                yoyo: true,
                repeat: 0,
                onComplete: () => {
                    this.playerVisual.setDisplaySize(48, 48);
                }
            });

            // Partículas
            const landPart = this.add.particles(this.player.x, this.player.y + 16, 'part_white', {
                speed: { min: 5, max: 40 },
                angle: { min: 200, max: 340 },
                scale: { start: 0.8, end: 0 },
                alpha: { start: 0.5, end: 0 },
                lifespan: 300,
                quantity: 4,
                blendMode: 'ADD'
            });
            landPart.explode();
        }

        this.wasOnGround = onGround;

        // Movimiento de plataformas
        this.movingPlatforms.getChildren().forEach(p => {
            if (p.name === 'vertical') {
                if (p.y <= 160) {
                    p.body.setVelocityY(80);
                } else if (p.y >= 430) {
                    p.body.setVelocityY(-80);
                }
            } else if (p.name === 'horizontal') {
                if (p.x <= 1850) {
                    p.body.setVelocityX(100);
                } else if (p.x >= 2150) {
                    p.body.setVelocityX(-100);
                }
            }
        });

        if (this.player.y > 600) {
            this.handleGameOver();
        }
    }

    // Saltos flotantes (menor fuerza por menor gravedad física)
    checkJump() {
        if (this.isGameOver || this.isGameWon) return;

        let onGround = this.player.body.blocked.down || this.player.body.touching.down;

        if (onGround) {
            this.player.setVelocityY(-280); // Fuerza de salto reducida
            this.jumpCount = 1;
            this.lastActionTime = this.time.now;
            this.playJumpEffects();
        } else if (this.jumpCount === 1) {
            this.player.setVelocityY(-240); // Fuerza del doble salto lunar
            this.jumpCount = 2;
            this.lastActionTime = this.time.now;
            this.playJumpEffects(true);
        }
    }

    playJumpEffects(isDouble = false) {
        this.tweens.add({
            targets: this.playerVisual,
            displayWidth: 48 * 0.75,
            displayHeight: 48 * 1.25,
            duration: 120,
            yoyo: true,
            repeat: 0,
            onComplete: () => {
                this.playerVisual.setDisplaySize(48, 48);
            }
        });

        const particleColor = isDouble ? 'part_red' : 'part_white';
        const jumpPart = this.add.particles(this.player.x, this.player.y + 16, particleColor, {
            speed: { min: 10, max: 60 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 350,
            quantity: isDouble ? 10 : 6,
            blendMode: 'ADD'
        });
        jumpPart.explode();
    }

    collectGem(player, gem) {
        gem.disableBody(true, true);
        this.collectedGems++;
        this.updateHUDText();

        const gemPart = this.add.particles(gem.x, gem.y, 'part_yellow', {
            speed: { min: 30, max: 90 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 500,
            quantity: 8,
            blendMode: 'ADD'
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
            speed: { min: 40, max: 150 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            quantity: 25,
            blendMode: 'ADD'
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

        // --- LÓGICA DE COLECCIÓN DE GEMAS OBLIGATORIA ---
        if (this.collectedGems < this.totalGems) {
            let warningText = this.add.text(this.player.x, this.player.y - 45, '¡NECESITAS TODAS LAS GEMAS!', {
                fontFamily: 'Orbitron',
                fontSize: '18px',
                fontWeight: '900',
                fill: '#facc15',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);

            this.tweens.add({
                targets: warningText,
                y: warningText.y - 30,
                alpha: 0,
                duration: 1500,
                onComplete: () => warningText.destroy()
            });

            if (this.player.x < this.portal.x) {
                this.player.setVelocityX(-220);
                this.player.setVelocityY(-180);
            } else {
                this.player.setVelocityX(220);
                this.player.setVelocityY(-180);
            }
            return;
        }

        this.isGameWon = true;
        this.physics.pause();
        this.portalParticles.stop();
        this.player.body.enable = false;

        this.tweens.add({
            targets: this.playerVisual,
            x: this.portal.x,
            y: this.portal.y,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            rotation: 6.28,
            duration: 700,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Personalizar el menú de victoria para el Nivel 2
                document.querySelector('.win-panel h2').innerText = '¡MISIÓN COMPLETADA!';
                document.querySelector('.win-panel p').innerText = '¡Has colonizado la Luna con éxito!';
                document.getElementById('btn-next-level').style.display = 'none'; // Fin de la campaña

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
// Gestiona el menú principal en HTML overlay que flota encima del lienzo del juego.
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

        const playBtn = document.getElementById('btn-play');
        playBtn.onclick = () => {
            document.getElementById('menu-overlay').classList.remove('active');
            this.scene.start('GameScene'); // Iniciar Nivel 1
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
    // Añadimos la escena del Nivel 2 a la cola de Phaser
    scene: [MainMenuScene, GameScene, Level2Scene]
};

const game = new Phaser.Game(configN1);

// ============================================================================
// VINCULACIÓN DE BOTONES HTML (Gestores de eventos globales fuera de Phaser)
// ============================================================================

// Variable global que rastrea qué escena de nivel está activa actualmente
let currentLevelKey = 'GameScene';

const restartActiveScene = () => {
    document.getElementById('win-overlay').classList.remove('active');
    document.getElementById('gameover-overlay').classList.remove('active');
    
    // Reiniciar la escena de nivel que esté activa usando su clave guardada
    game.scene.stop(currentLevelKey);
    game.scene.start(currentLevelKey);
};

document.getElementById('btn-restart-win').onclick = restartActiveScene;
document.getElementById('btn-restart-fail').onclick = restartActiveScene;

// Mapeado del botón de siguiente nivel para avanzar de Nivel 1 a Nivel 2
document.getElementById('btn-next-level').onclick = () => {
    document.getElementById('win-overlay').classList.remove('active');
    document.getElementById('btn-next-level').style.display = 'none';
    
    // Cambiar al Nivel 2 y actualizar la variable de rastreo
    game.scene.stop(currentLevelKey);
    currentLevelKey = 'Level2Scene';
    game.scene.start('Level2Scene');
};
