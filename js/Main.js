// === LOGICA ANTI-CRASHEOS Y EVENTOS ===
let prevScreen = 'screen-main'; 

function showScreen(idToShow) {
    const screens = ['screen-main', 'screen-pause', 'screen-multiplayer', 'screen-options', 'screen-gameover'];
    screens.forEach(s => { 
        let el = document.getElementById(s); 
        if(el) {
            if (el.style.display !== 'none' && s !== 'screen-options' && idToShow === 'screen-options') {
                prevScreen = s;
            }
            el.style.display = 'none'; 
        }
    });
    
    let target = document.getElementById(idToShow); if(target) target.style.display = 'flex';
    let ui = document.getElementById('ui-layer'); if(ui) ui.style.display = 'flex';
    let hud = document.getElementById('room-code-hud');
    if(hud) hud.style.display = 'none';
}

function addEvt(id, eventType, callback) { let el = document.getElementById(id); if(el) el.addEventListener(eventType, callback); }

// FIX POINTER LOCK: Ejecución inmediata
addEvt('btn-resume', 'click', () => { 
    document.getElementById('ui-layer').style.display = 'none'; 
    resumeAudio(); 
    isGameActive = true; 
    prevTime = performance.now(); 
    if(!isMobile) controls.lock(); 
});

// Resto de botones
addEvt('btn-options', 'click', () => showScreen('screen-options'));
addEvt('btn-back-options', 'click', () => showScreen(prevScreen));
addEvt('btn-quit', 'click', () => location.reload());
addEvt('btn-restart', 'click', () => location.reload());
addEvt('btn-tomenu-death', 'click', () => location.reload());

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    prevTime = time;

    if (!isGameActive) return;

    // --- SINCRONIZACIÓN DE RED ---
    if (isMultiplayer) {
        let eul = new THREE.Euler(0,0,0, 'YXZ'); 
        eul.setFromQuaternion(camera.quaternion);
        
        if (isHost) {
            otherPlayersData[myRoomId] = { x: camera.position.x, y: camera.position.y - 1.6, z: camera.position.z, rot: eul.y };
            let zombiesData = zombiesArray.map(z => ({
                id: z.id, x: z.mesh.position.x, y: z.mesh.position.y, z: z.mesh.position.z,
                rotY: z.mesh.rotation.y, hp: z.hp, maxHp: z.maxHp
            }));
            let waveData = { oleada: oleadaActual, restantes: zombiesRestantes, vivos: zombiesVivos, estado: estadoOleada };

            connections.forEach(c => {
                c.send({ type: 'world_state', hostId: myRoomId, players: otherPlayersData, zombies: zombiesData, waveInfo: waveData });
            });
        } else {
            if (peer && peer.open && connections[0]) {
                connections[0].send({ type: 'player_pos', x: camera.position.x, y: camera.position.y - 1.6, z: camera.position.z, rot: eul.y });
            }
        }
    }

    // --- LÓGICA DE JUEGO (IA solo Host o Singleplayer) ---
    if (!isMultiplayer || isHost) {
        if (estadoOleada === "activa") {
            if (zombiesRestantes > 0 && zombiesVivos < maxZombiesEnMapa) spawnZombie();
            else if (zombiesRestantes === 0 && zombiesVivos === 0) { 
                estadoOleada = "descanso"; 
                tiempoEntreOleadas = 5; 
            }
        } else if (estadoOleada === "descanso") {
            tiempoEntreOleadas -= delta;
            if (tiempoEntreOleadas <= 0) { 
                oleadaActual++; 
                zombiesRestantes = 5 + (oleadaActual * 3); 
                maxZombiesEnMapa = Math.min(15, 5 + oleadaActual); 
                estadoOleada = "activa"; 
                actualizarHUD(); 
            }
        }
    }

    // Movimiento Jugador y Balas (Simplificado para este bloque)
    updatePlayerMovement(delta);
    updateBullets(delta); // Dentro de updateBullets debe estar la lógica de hit_zombie explicada antes

    // Actualización Visual Zombies
    zombiesArray.forEach(zObj => {
        zObj.hpGroup.lookAt(camera.position);
        if (!isMultiplayer || isHost) {
            // IA REAL
            updateZombieAI(zObj, delta); 
        } else {
            // ANIMACIÓN VISUAL CLIENTE
            animateZombieLegs(zObj, time);
        }
    });

    renderer.render(scene, camera);
}