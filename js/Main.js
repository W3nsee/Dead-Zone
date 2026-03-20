// === LOGICA ANTI-CRASHEOS Y EVENTOS ===
let prevScreen = 'screen-main'; 
let isPaused = false; // Nueva variable global para aislar la pausa del jugador

function showScreen(idToShow) {
    const screens = ['screen-main', 'screen-pause', 'screen-multiplayer', 'screen-options', 'screen-gameover'];
    screens.forEach(s => { 
        let el = document.getElementById(s); 
        if(el) el.style.display = 'none'; 
    });
    
    let target = document.getElementById(idToShow); 
    if(target) target.style.display = 'flex';
    
    let ui = document.getElementById('ui-layer'); 
    if(ui) ui.style.display = 'flex';
    
    let hud = document.getElementById('room-code-hud');
    if(hud) hud.style.display = 'none';
}

function addEvt(id, eventType, callback) { 
    let el = document.getElementById(id); 
    if(el) el.addEventListener(eventType, callback); 
}

function actualizarCartelSala(codigo, esHost) {
    let hud = document.getElementById('room-code-hud');
    if(!hud) {
        hud = document.createElement('div'); hud.id = 'room-code-hud';
        hud.style.position = 'absolute'; hud.style.top = '15px'; hud.style.left = '50%'; hud.style.transform = 'translateX(-50%)';
        hud.style.background = 'rgba(0,0,0,0.7)'; hud.style.padding = '8px 25px';
        hud.style.borderRadius = '12px'; hud.style.fontWeight = '900'; hud.style.fontSize = '22px'; 
        hud.style.zIndex = '100'; hud.style.pointerEvents = 'none'; hud.style.textShadow = '2px 2px 4px black';
        hud.style.letterSpacing = '3px'; hud.style.fontFamily = 'monospace';
        hud.style.display = 'none'; 
        document.body.appendChild(hud);
    }
    let color = esHost ? '#2ecc71' : '#3498db'; 
    hud.style.border = `2px solid ${color}`;
    hud.style.color = color;
    hud.innerText = `SALA: ${codigo}`;
}

addEvt('card-classic', 'click', () => { 
    try {
        resumeAudio(); isGameActive = true; isPaused = false; isMultiplayer = false; isLobby = false; 
        let ui = document.getElementById('ui-layer'); if(ui) ui.style.display = 'none'; 
        resetGame(); if(!isMobile) controls.lock(); 
    } catch(e) { console.error("Error iniciando partida:", e); }
});

addEvt('card-multiplayer', 'click', () => {
    showScreen('screen-multiplayer');
    if(!peer) {
        let randomID = Math.random().toString(36).substring(2, 7).toUpperCase(); peer = new Peer(randomID); 
        peer.on('open', (id) => { 
            myRoomId = id; let codeEl = document.getElementById('my-room-code'); if(codeEl) codeEl.innerText = id; 
            let bHost = document.getElementById('btn-start-host'); if(bHost) bHost.style.display = 'inline-block'; 
            actualizarCartelSala(id, true); 
        });
        peer.on('connection', (conn) => { 
            conn.on('open', () => {
                connections.push(conn); setupMultiplayerConnection(conn); 
                otherPlayersMeshes[conn.peer] = createOtherPlayerMesh(0x2980b9); 
                let audio = audioPickupBase.cloneNode(); audio.volume = 1.0; audio.play().catch(()=>{}); 
            });
        });
    } else {
        actualizarCartelSala(myRoomId, true);
    }
});

addEvt('btn-back-main', 'click', () => { showScreen('screen-main'); });
addEvt('btn-start-host', 'click', () => { isHost = true; isMultiplayer = true; iniciarPartidaMultijugador(); });
addEvt('btn-join-room', 'click', () => { 
    let roomCode = document.getElementById('join-room-code'); if(!roomCode || roomCode.value==="") return; 
    let conn = peer.connect(roomCode.value.toUpperCase()); 
    conn.on('open', () => { 
        isHost = false; isMultiplayer = true; connections.push(conn); setupMultiplayerConnection(conn); 
        actualizarCartelSala(roomCode.value.toUpperCase(), false); 
        iniciarPartidaMultijugador(); 
    }); 
});

addEvt('btn-resume', 'click', () => { 
    let ui = document.getElementById('ui-layer'); if(ui) ui.style.display = 'none'; 
    resumeAudio(); isPaused = false; prevTime = performance.now(); 
    if(!isMobile) controls.lock(); 
});

addEvt('btn-options', 'click', () => { prevScreen = 'screen-main'; showScreen('screen-options'); }); 
addEvt('btn-options-pause', 'click', () => { prevScreen = 'screen-pause'; showScreen('screen-options'); }); 
addEvt('btn-back', 'click', () => { showScreen(prevScreen); }); 

addEvt('btn-quit', 'click', () => { location.reload(); }); 
addEvt('btn-restart', 'click', () => { location.reload(); }); 
addEvt('btn-tomenu-death', 'click', () => { location.reload(); });

function resetGame() {
    puntos = 500; salud = 100; granadas = 2; oleadaActual = 1; zombiesRestantes = 5; estadoOleada = "activa"; zombiesVivos = 0; holdStartProgress = 0; holdingStart = false;
    misArmas.pistola = { mag: 15, res: 90, desbloqueada: true }; misArmas.escopeta = { mag: 8, res: 32, desbloqueada: false }; misArmas.rifle = { mag: 30, res: 150, desbloqueada: false };
    isPaused = false;
    
    try {
        zombiesArray.forEach(z => { scene.remove(z.mesh); if(z.audio && z.audio.isPlaying) z.audio.stop(); }); 
        zombiesArray.length = 0; 
        medkits.forEach(m => scene.remove(m)); medkits.length = 0; 
        activeBullets.forEach(b => scene.remove(b.mesh)); activeBullets.length = 0;
    } catch(e) {}

    equipWeapon('pistola'); recargando = false; isAiming = false; isSprinting = false; isCrouching = false; isSliding = false;
    let rt = document.getElementById('reload-text'); if(rt) rt.style.display = 'none'; 
    
    let hud = document.getElementById('room-code-hud');
    if (hud) hud.style.display = isMultiplayer ? 'block' : 'none';
    
    actualizarHUD();
}

function actualizarHUD() {
    let pEl = document.getElementById('points-val'); if(pEl) pEl.innerText = puntos;
    let hEl = document.getElementById('health-text'); if(hEl) hEl.innerText = Math.round(salud);
    let hBar = document.getElementById('health-bar-fill'); if(hBar) hBar.style.width = salud + '%';
    let estadoArma = misArmas[armaActual]; let ammoEl = document.getElementById('ammo-hud');
    if(ammoEl) { ammoEl.style.color = (estadoArma.mag === 0 && estadoArma.res === 0) ? "red" : "white"; ammoEl.innerText = `${estadoArma.mag} / ${estadoArma.res}`; }
    let gEl = document.getElementById('grenade-val'); if(gEl && !isMobile) gEl.innerText = granadas;
    let wVal = document.getElementById('wave-val'); if(wVal) wVal.innerText = oleadaActual;
    let wSub = document.getElementById('wave-sub'); 
    if(wSub) {
        if (isLobby) wSub.innerText = "SALA DE ESPERA";
        else wSub.innerText = estadoOleada === "activa" ? `Zombies Restantes: ${zombiesRestantes + zombiesVivos}` : "Preparación...";
    }
    let s1 = document.getElementById('slot-1'); if(s1) s1.className = 'inv-slot unlocked' + (armaActual === 'pistola' ? ' active' : '');
    let s2 = document.getElementById('slot-2'); if(s2) s2.className = 'inv-slot' + (misArmas.escopeta.desbloqueada ? ' unlocked' : '') + (armaActual === 'escopeta' ? ' active' : '');
    let s3 = document.getElementById('slot-3'); if(s3) s3.className = 'inv-slot' + (misArmas.rifle.desbloqueada ? ' unlocked' : '') + (armaActual === 'rifle' ? ' active' : '');
}

function mostrarDinero(cantidad) {
    puntos += cantidad; actualizarHUD(); const pop = document.getElementById('money-popup');
    if(pop) { pop.innerText = "+$" + cantidad; pop.style.transition = 'none'; pop.style.opacity = '1'; pop.style.transform = 'translateY(0px)'; setTimeout(() => { pop.style.transition = 'all 0.5s ease-out'; pop.style.opacity = '0'; pop.style.transform = 'translateY(-30px)'; }, 50); }
}

function recargarArma() {
    let conf = armasConfig[armaActual]; let state = misArmas[armaActual]; if (recargando || state.mag === conf.magSize || state.res === 0) return;
    recargando = true; isAiming = false; isSprinting = false; let rt = document.getElementById('reload-text'); if(rt) rt.style.display = 'block'; 
    let audio = audioReloadBase.cloneNode(); audio.volume = baseVolumes.reload * globalVolMulti; audio.play().catch(e => {});
    setTimeout(() => { const balas = Math.min(conf.magSize - state.mag, state.res); state.mag += balas; state.res -= balas; recargando = false; if(rt) rt.style.display = 'none'; actualizarHUD(); }, 1500);
}

function procesarDisparo(time) {
    let conf = armasConfig[armaActual]; let state = misArmas[armaActual]; if (state.mag <= 0) { recargarArma(); return; }
    state.mag--; actualizarHUD(); lastShootTime = time; muzzleFlashTimer = 3; muzzleFlashLight.intensity = 2; muzzleFlashLight.position.set(camera.position.x, camera.position.y - 0.13, camera.position.z);
    activeWeaponGroup.position.z += isAiming ? 0.02 : 0.05; activeWeaponGroup.rotation.x += isAiming ? 0.01 : 0.05;
    let snd = armaActual === 'escopeta' ? audioShootEscopeta : (armaActual === 'rifle' ? audioShootRifle : audioShootPistola); let audioObj = snd.cloneNode(); audioObj.volume = baseVolumes.shoot * globalVolMulti; audioObj.play().catch(e => {});
    for(let i = 0; i < conf.pellets; i++) {
        let dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        if(conf.spread > 0) { dir.x += (Math.random()-0.5)*conf.spread; dir.y += (Math.random()-0.5)*conf.spread; dir.z += (Math.random()-0.5)*conf.spread; }
        dir.normalize(); const bullet = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.8), new THREE.MeshBasicMaterial({color: 0xffdd00})); bullet.position.copy(camera.position); bullet.position.y -= 0.1; 
        bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1), dir); scene.add(bullet); activeBullets.push({ mesh: bullet, dir: dir, speed: conf.bulletSpeed, dmg: conf.dmg, life: 2.0 });
    }
}

function lanzarGranada() {
    if (granadas <= 0) return; granadas--; actualizarHUD(); let audio = audioThrow.cloneNode(); audio.volume = baseVolumes.throw * globalVolMulti; audio.play().catch(e=>{});
    const gMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshPhongMaterial({color: 0x005500})); gMesh.position.copy(camera.position);
    let dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize(); let vel = dir.multiplyScalar(22); vel.y += 6; scene.add(gMesh); activeGrenades.push({ mesh: gMesh, vel: vel, timer: 100 }); 
}

function checkShopInteraction() {
    let prompt = document.getElementById('interact-prompt'); let btnMob = document.getElementById('btn-interact');
    
    if (isLobby) {
        if (isHost) {
            if(prompt) { prompt.innerText = `Mantén [${formatKey(keyMap.interact)}] para INICIAR (${connections.length} Jugador/es)`; prompt.style.display = 'block'; }
            if(btnMob) { btnMob.style.display = 'flex'; btnMob.innerText = `INICIAR`; }
        } else {
            let totalPlayers = Object.keys(otherPlayersData).length + 1;
            if(prompt) { prompt.innerText = `Esperando al Host... (${totalPlayers} Jugadores en sala)`; prompt.style.display = 'block'; }
            if(btnMob) { btnMob.style.display = 'none'; }
        }
        return; 
    }

    currentShopTarget = null; let closestDist = 4;
    if(prompt) prompt.style.display = 'none'; if(btnMob) btnMob.style.display = 'none';
    tiendas.forEach(t => {
        let dist = camera.position.distanceTo(t.group.position);
        if (dist < closestDist) {
            closestDist = dist; currentShopTarget = t; let accion = (!misArmas[t.tipo] || misArmas[t.tipo]?.desbloqueada) ? "Munición" : "Comprar";
            if(!isMobile && prompt) { prompt.innerText = `[${formatKey(keyMap.interact)}] ${accion} ${t.nombre} ($${t.precio})`; prompt.style.display = 'block'; } 
            else if(btnMob) { btnMob.style.display = 'flex'; btnMob.innerText = `$${t.precio}`; }
        }
    });
}

function procesarCompra(t) {
    if (puntos >= t.precio) {
        puntos -= t.precio; let audio = audioBuy.cloneNode(); audio.volume = baseVolumes.buy * globalVolMulti; audio.play().catch(e=>{});
        if (t.tipo === 'granadas') { granadas = Math.min(4, granadas + 2); } else { if (!misArmas[t.tipo].desbloqueada) { misArmas[t.tipo].desbloqueada = true; equipWeapon(t.tipo); } else { misArmas[t.tipo].res = armasConfig[t.tipo].maxRes; } }
        actualizarHUD();
    }
}

// === CONTROLES PC ===
let moveF = false, moveB = false, moveL = false, moveR = false; const controls = new THREE.PointerLockControls(camera, document.body); if(!isMobile) cameraGroup.add(controls.getObject());

// CORRECCIÓN: Al desbloquear el ratón, solo se pausa al jugador local, pero el juego (servidor) sigue corriendo
controls.addEventListener('unlock', () => { 
    isAiming = false; isSprinting = false; isCrouching = false; isShooting = false; 
    if (isGameActive && salud > 0 && !isLobby) { 
        isPaused = true; 
        showScreen('screen-pause'); 
    } 
});

document.addEventListener('keydown', (e) => {
    if (waitingForKeyAction) { if (e.code === 'Escape') return; keyMap[waitingForKeyAction] = e.code; activeKeyBtn.classList.remove('waiting'); activeKeyBtn.innerText = formatKey(e.code); waitingForKeyAction = null; activeKeyBtn = null; return; }
    if (!isGameActive || isPaused || (!controls.isLocked && !isMobile)) return;
    if (e.code === keyMap.forward) moveF = true; if (e.code === keyMap.backward) moveB = true; if (e.code === keyMap.left) moveL = true; if (e.code === keyMap.right) moveR = true;
    if (e.code === keyMap.sprint && !isAiming && !recargando && !isCrouching) isSprinting = true; if (e.code === keyMap.jump && canJump && !recargando && !isCrouching && !isSliding) { velocity.y = 12.0; canJump = false; }
    if (e.code === keyMap.reload) recargarArma(); if (e.code === keyMap.grenade) lanzarGranada();
    if (e.code === keyMap.interact) { if (isLobby && isHost) holdingStart = true; else if (currentShopTarget && !isLobby) procesarCompra(currentShopTarget); } 
    if (e.code === keyMap.crouch) { if (isSprinting && (moveF || moveL || moveR) && !isSliding) { isSliding = true; slideTimer = 35; let audio = audioSlide.cloneNode(); audio.volume = baseVolumes.slide * globalVolMulti; audio.play().catch(e=>{}); } isCrouching = true; }
    if (e.code === keyMap.wp1 && misArmas.pistola.desbloqueada && !recargando) equipWeapon('pistola'); if (e.code === keyMap.wp2 && misArmas.escopeta.desbloqueada && !recargando) equipWeapon('escopeta'); if (e.code === keyMap.wp3 && misArmas.rifle.desbloqueada && !recargando) equipWeapon('rifle');
});

document.addEventListener('keyup', (e) => {
    if (e.code === keyMap.forward) moveF = false; if (e.code === keyMap.backward) moveB = false; if (e.code === keyMap.left) moveL = false; if (e.code === keyMap.right) moveR = false;
    if (e.code === keyMap.sprint) isSprinting = false; if (e.code === keyMap.crouch) { isCrouching = false; isSliding = false; }
    if (e.code === keyMap.interact) holdingStart = false;
});

document.addEventListener('mousedown', (e) => { if ((controls.isLocked || isMobile) && !recargando && !isLobby && !isPaused) { if (e.button === 0) { isShooting = true; let t = performance.now(); if (!armasConfig[armaActual].auto && t - lastShootTime >= armasConfig[armaActual].cooldownMs) { procesarDisparo(t); if(isMultiplayer && connections.length>0) { if(isHost) connections.forEach(c=>c.send({type:'shoot'})); else connections[0].send({type:'shoot'}); } } } else if (e.button === 2) { isAiming = true; isSprinting = false; } } });
document.addEventListener('mouseup', (e) => { if (e.button === 0) isShooting = false; if (e.button === 2) isAiming = false; });

// === CONTROLES MÓVILES ===
let joyActive = false, joyId = null, joyStartX, joyStartY; let lookId = null, lookLastX, lookLastY; const euler = new THREE.Euler(0, 0, 0, 'YXZ');
if(isMobile) {
    let jz = document.getElementById('joystick-zone'); let jk = document.getElementById('joystick-knob'); let lz = document.getElementById('look-zone');
    if(jz) {
        jz.addEventListener('touchstart', (e) => { e.preventDefault(); let touch = e.changedTouches[0]; joyId = touch.identifier; joyActive = true; let rect = jz.getBoundingClientRect(); joyStartX = rect.left + rect.width/2; joyStartY = rect.top + rect.height/2; updateJoystick(touch.clientX, touch.clientY); }, {passive: false});
        jz.addEventListener('touchmove', (e) => { e.preventDefault(); for(let i=0; i<e.changedTouches.length; i++) { if(e.changedTouches[i].identifier === joyId) updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY); } }, {passive: false});
        const endJoy = (e) => { for(let i=0; i<e.changedTouches.length; i++) { if(e.changedTouches[i].identifier === joyId) { joyActive = false; joyId = null; if(jk) jk.style.transform = `translate(-50%, -50%)`; moveF = moveB = moveL = moveR = false; } } }; jz.addEventListener('touchend', endJoy); jz.addEventListener('touchcancel', endJoy);
    }
    function updateJoystick(x, y) { let dx = x - joyStartX, dy = y - joyStartY; let dist = Math.sqrt(dx*dx + dy*dy); let maxDist = 40; if(dist > maxDist) { dx = (dx/dist)*maxDist; dy = (dy/dist)*maxDist; } if(jk) jk.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; moveF = dy < -10; moveB = dy > 10; moveL = dx < -10; moveR = dx > 10; }
    if(lz) {
        lz.addEventListener('touchstart', (e) => { e.preventDefault(); let touch = e.changedTouches[0]; lookId = touch.identifier; lookLastX = touch.clientX; lookLastY = touch.clientY; }, {passive: false});
        lz.addEventListener('touchmove', (e) => { e.preventDefault(); if(!isGameActive || isPaused) return; for(let i=0; i<e.changedTouches.length; i++) { let touch = e.changedTouches[i]; if(touch.identifier === lookId) { let mX = touch.clientX - lookLastX; let mY = touch.clientY - lookLastY; euler.setFromQuaternion(camera.quaternion); euler.y -= mX * 0.005; euler.x -= mY * 0.005; euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.x)); camera.quaternion.setFromEuler(euler); lookLastX = touch.clientX; lookLastY = touch.clientY; } } }, {passive: false});
        const endLook = (e) => { for(let i=0; i<e.changedTouches.length; i++) { if(e.changedTouches[i].identifier === lookId) lookId = null; } }; lz.addEventListener('touchend', endLook); lz.addEventListener('touchcancel', endLook);
    }
    addEvt('btn-shoot', 'touchstart', (e)=>{ e.preventDefault(); if(isLobby || isPaused) return; isShooting=true; let t = performance.now(); if(!armasConfig[armaActual].auto && t - lastShootTime >= armasConfig[armaActual].cooldownMs) { procesarDisparo(t); if(isMultiplayer && connections.length>0) { if(isHost) connections.forEach(c=>c.send({type:'shoot'})); else connections[0].send({type:'shoot'}); } } });
    addEvt('btn-shoot', 'touchend', (e)=>{ e.preventDefault(); isShooting=false; }); addEvt('btn-jump', 'touchstart', (e)=>{ e.preventDefault(); if(canJump && !isPaused){velocity.y=12; canJump=false;} });
    addEvt('btn-reload', 'touchstart', (e)=>{ e.preventDefault(); if(!isPaused) recargarArma(); }); 
    addEvt('btn-interact', 'touchstart', (e)=>{ e.preventDefault(); if(isLobby && isHost) holdingStart = true; else if(currentShopTarget && !isLobby && !isPaused) procesarCompra(currentShopTarget); });
    addEvt('btn-interact', 'touchend', (e)=>{ e.preventDefault(); holdingStart = false; });
    addEvt('btn-swap', 'touchstart', (e)=>{ e.preventDefault(); if(!isPaused){ if(armaActual==='pistola' && misArmas.escopeta.desbloqueada) equipWeapon('escopeta'); else if(armaActual==='escopeta' && misArmas.rifle.desbloqueada) equipWeapon('rifle'); else equipWeapon('pistola'); } });
}

camera.position.y = 1.6; const velocity = new THREE.Vector3(); const direction = new THREE.Vector3(); let prevTime = performance.now();

function handleGameOver() {
    isGameActive = false; if(!isMobile) controls.unlock();
    let gs = document.getElementById('gameover-stats'); if(gs) gs.innerText = `Ronda Alcanzada: ${oleadaActual} | Dinero Obtenido: $${puntos}`; showScreen('screen-gameover');
}

// === BUCLE PRINCIPAL (ANIMATE) ===
function animate() {
    requestAnimationFrame(animate); 
    if (!isGameActive) return; // Si estamos en el menú de inicio no hacemos nada
    
    const time = performance.now(); const delta = Math.min((time - prevTime) / 1000, 0.1); 
    
    // RED MULTIJUGADOR AVANZADA (N-Jugadores)
    if (isMultiplayer) {
        let eul = new THREE.Euler(0,0,0, 'YXZ'); eul.setFromQuaternion(camera.quaternion);
        
        if (isHost) {
            otherPlayersData[myRoomId] = { x: camera.position.x, y: camera.position.y - 1.6, z: camera.position.z, rot: eul.y, isPaused: isPaused };
            
            let zombiesData = zombiesArray.map(z => ({
                id: z.id, x: z.mesh.position.x, y: z.mesh.position.y, z: z.mesh.position.z,
                rotY: z.mesh.rotation.y, hp: z.hp, maxHp: z.maxHp
            }));
            
            let waveData = { oleada: oleadaActual, restantes: zombiesRestantes, vivos: zombiesVivos, estado: estadoOleada };

            if (Math.random() < 0.5 && connections.length > 0) { 
                connections.forEach(c => c.send({ 
                    type: 'world_state', hostId: myRoomId, players: otherPlayersData, 
                    zombies: zombiesData, waveInfo: waveData 
                }));
            }
        } else {
            if (Math.random() < 0.5 && connections.length > 0) { 
                connections[0].send({ type: 'player_pos', x: camera.position.x, y: camera.position.y - 1.6, z: camera.position.z, rot: eul.y, isPaused: isPaused });
            }
        }

        for (let id in otherPlayersData) {
            if (id === myRoomId || !otherPlayersMeshes[id]) continue;
            let mesh = otherPlayersMeshes[id]; let target = otherPlayersData[id];
            mesh.position.lerp(new THREE.Vector3(target.x, target.y, target.z), 0.2);
            let diff = target.rot - mesh.rotation.y; while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2; mesh.rotation.y += diff * 0.2;
        }
    }

    if (!isPaused) checkShopInteraction();

    if (isLobby) {
        if (isHost && holdingStart) {
            holdStartProgress += delta;
            let prompt = document.getElementById('interact-prompt'); 
            if(prompt) prompt.innerText = `INICIANDO... ${Math.floor((holdStartProgress/1.5)*100)}%`;
            
            if (holdStartProgress >= 1.5) { 
                isLobby = false; holdingStart = false;
                connections.forEach(c => c.send({ type: 'start_game' }));
                actualizarHUD(); let audio = audioReloadBase.cloneNode(); audio.play().catch(()=>{});
                if(prompt) prompt.style.display='none';
            }
        } else { holdStartProgress = Math.max(0, holdStartProgress - delta * 2); }
    } else {
        // --- IA Y OLEADAS (El servidor Host siempre calcula esto, esté en pausa o no) ---
        if (!isMultiplayer || isHost) {
            if (estadoOleada === "activa") {
                if (zombiesRestantes > 0 && zombiesVivos < maxZombiesEnMapa) spawnZombie();
                else if (zombiesRestantes === 0 && zombiesVivos === 0) { estadoOleada = "descanso"; tiempoEntreOleadas = 5; let ws = document.getElementById('wave-sub'); if(ws) ws.innerText = `Siguiente ronda en 5s`; }
            } else if (estadoOleada === "descanso") {
                tiempoEntreOleadas -= delta;
                if (tiempoEntreOleadas <= 0) { oleadaActual++; zombiesRestantes = 5 + (oleadaActual * 3); maxZombiesEnMapa = Math.min(15, 5 + oleadaActual); estadoOleada = "activa"; actualizarHUD(); } 
                else { let ws = document.getElementById('wave-sub'); if(ws) ws.innerText = `Siguiente en: ${Math.ceil(tiempoEntreOleadas)}s`; }
            }
            if (Math.random() < 0.001) spawnMedkit();
        }

        for (let i = medkits.length - 1; i >= 0; i--) { medkits[i].rotation.y += 0.02; if (!isPaused && camera.position.distanceTo(medkits[i].position) < 1.5 && salud < 100) { salud = Math.min(100, salud + 50); actualizarHUD(); scene.remove(medkits[i]); medkits.splice(i, 1); let audio = audioPickupBase.cloneNode(); audio.volume = baseVolumes.pickup * globalVolMulti; audio.play().catch(e=>{}); } }

        if (!isPaused && isShooting && armasConfig[armaActual].auto && time - lastShootTime >= armasConfig[armaActual].cooldownMs) { procesarDisparo(time); if(isMultiplayer && connections.length>0) { if(isHost) connections.forEach(c=>c.send({type:'shoot'})); else connections[0].send({type:'shoot'}); } }

        for(let i = activeBullets.length - 1; i >= 0; i--) {
            let b = activeBullets[i]; b.life -= delta; if (b.life <= 0) { scene.remove(b.mesh); activeBullets.splice(i, 1); continue; } 
            let moveDist = b.speed * delta; raycaster.set(b.mesh.position, b.dir); 
            const intersects = raycaster.intersectObjects([...zombiesArray.map(z=>z.mesh), ...obstacles], true);
            
            if (intersects.length > 0 && intersects[0].distance <= moveDist) {
                let obj = intersects[0].object; 
                if(obj.userData.isZombie) { 
                    let rootGroup = obj.parent; if(rootGroup.parent && rootGroup.parent.type === "Group") rootGroup = rootGroup.parent; 
                    let zObj = zombiesArray.find(z => z.mesh === rootGroup); 
                    
                    if(zObj) { 
                        let part = obj.userData.part || 'body'; let mult = (part === 'head') ? 2.0 : (part === 'limb') ? 0.7 : 1.0; let dmg = Math.round(b.dmg * mult);
                        if (!isMultiplayer || isHost) damageZombie(zObj.id, dmg, part, intersects[0].point); 
                        else {
                            connections[0].send({ type: 'hit_zombie', zId: zObj.id, damage: dmg, part: part, hitPoint: { x: intersects[0].point.x, y: intersects[0].point.y, z: intersects[0].point.z }});
                            spawnFloatingDamage(dmg, part, intersects[0].point);
                        }
                    } 
                }
                scene.remove(b.mesh); activeBullets.splice(i, 1);
            } else { b.mesh.position.addScaledVector(b.dir, moveDist); }
        }

        for(let i = activeGrenades.length - 1; i >= 0; i--) {
            let g = activeGrenades[i]; g.vel.y -= 9.8 * delta * 2; g.mesh.position.addScaledVector(g.vel, delta); if (g.mesh.position.y <= 0.15) { g.mesh.position.y = 0.15; g.vel.y = Math.abs(g.vel.y) * 0.4; g.vel.x *= 0.8; g.vel.z *= 0.8; }
            g.timer--; if (g.timer <= 0) { let audio = audioBoom.cloneNode(); audio.volume = baseVolumes.boom * globalVolMulti; audio.play().catch(e=>{}); let fo = document.getElementById('flash-overlay'); if(fo) { fo.style.opacity = '0.8'; setTimeout(() => fo.style.opacity = '0', 100); } zombiesArray.forEach((z) => { if(g.mesh.position.distanceTo(z.mesh.position) < 8) damageZombie(z.id, 150, 'body', z.mesh.position); }); scene.remove(g.mesh); activeGrenades.splice(i, 1); }
        }

        const camFwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).setY(0).normalize(); const camRight = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion).setY(0).normalize(); let blipsHTML = '';
        
        // --- MOVIMIENTO ZOMBIE (Búsqueda del jugador activo más cercano) ---
        zombiesArray.forEach(zObj => {
            let z = zObj.mesh; zObj.hpGroup.lookAt(camera.position); 
            
            // 1. Encontrar al jugador NO PAUSADO más cercano
            let closestPos = null;
            let minDist = Infinity;

            if (!isPaused && !isLobby) {
                let dist = camera.position.distanceTo(z.position);
                if (dist < minDist) { minDist = dist; closestPos = camera.position.clone(); }
            }

            if (isMultiplayer) {
                for (let id in otherPlayersData) {
                    if (id === myRoomId) continue;
                    let p = otherPlayersData[id];
                    if (!p.isPaused) {
                        let pPos = new THREE.Vector3(p.x, p.y + 1.6, p.z);
                        let dist = pPos.distanceTo(z.position);
                        if (dist < minDist) { minDist = dist; closestPos = pPos; }
                    }
                }
            }

            // Radar Visual (Apunta al zombie más cercano a MI cámara si no estoy pausado)
            if (!isPaused) {
                const distToMe = camera.position.distanceTo(z.position);
                if (distToMe > 2 && distToMe < 20) { let dirToZombie = new THREE.Vector3().subVectors(z.position, camera.position).setY(0).normalize(); let angle = Math.atan2(dirToZombie.dot(camRight), dirToZombie.dot(camFwd)); blipsHTML += `<div class="blip-wrapper" style="transform: rotate(${angle}rad); opacity: ${1 - (distToMe/20)};"><div class="blip-arc"></div></div>`; }
            }
            
            if (!isMultiplayer || isHost) {
                // LÓGICA DEL HOST / SINGLEPLAYER
                if (closestPos) {
                    z.lookAt(closestPos.x, z.position.y, closestPos.z); 
                    const dirToPlayer = new THREE.Vector3().subVectors(closestPos, z.position); dirToPlayer.y = 0; const dist = dirToPlayer.length();

                    if (dist > 1.2) {
                        dirToPlayer.normalize(); const startX = z.position.x; z.position.x += dirToPlayer.x * zObj.speed * delta; if (boundingBoxes.some(b => new THREE.Box3().setFromObject(z).intersectsBox(b))) z.position.x = startX; const startZ = z.position.z; z.position.z += dirToPlayer.z * zObj.speed * delta; if (boundingBoxes.some(b => new THREE.Box3().setFromObject(z).intersectsBox(b))) z.position.z = startZ;
                        const walkCycle = time * 0.01 * (zObj.speed/2.5); zObj.lLeg.rotation.x = Math.sin(walkCycle) * 0.5; zObj.rLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5; zObj.lArm.rotation.x = -0.2; zObj.rArm.rotation.x = -0.2; zObj.lArm.rotation.z = Math.sin(walkCycle) * 0.1; zObj.rArm.rotation.z = -Math.sin(walkCycle) * 0.1; zObj.head.rotation.z = Math.sin(walkCycle * 0.5) * 0.1;
                    } else {
                        zObj.lLeg.rotation.x = 0; zObj.rLeg.rotation.x = 0; zObj.head.rotation.z = 0; zObj.lArm.rotation.x = Math.abs(Math.sin(time*0.02))*0.8; zObj.rArm.rotation.x = Math.abs(Math.sin(time*0.02 + 1))*0.8;
                        // Daño si el objetivo soy yo (el Host)
                        if (!isPaused && minDist === camera.position.distanceTo(z.position) && time - lastDamageTime > 1000) {
                            salud -= 20; actualizarHUD(); lastDamageTime = time; let dOv = document.getElementById('damage-overlay'); if(dOv) { dOv.style.opacity = '0.5'; setTimeout(() => dOv.style.opacity = '0', 200); } if (salud <= 0) handleGameOver();
                        }
                    }
                } else {
                    // Todos están pausados, animacion de idle
                    zObj.lLeg.rotation.x = 0; zObj.rLeg.rotation.x = 0; zObj.lArm.rotation.x = -0.1; zObj.rArm.rotation.x = -0.1;
                }
            } else {
                // LÓGICA DEL CLIENTE (Solo Animaciones y daño local)
                if (closestPos && closestPos.distanceTo(z.position) > 1.2) {
                    const walkCycle = time * 0.01 * 1.5; 
                    zObj.lLeg.rotation.x = Math.sin(walkCycle) * 0.5; zObj.rLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5; 
                    zObj.lArm.rotation.x = -0.2; zObj.rArm.rotation.x = -0.2; 
                    zObj.lArm.rotation.z = Math.sin(walkCycle) * 0.1; zObj.rArm.rotation.z = -Math.sin(walkCycle) * 0.1; 
                    zObj.head.rotation.z = Math.sin(walkCycle * 0.5) * 0.1;
                } else {
                    zObj.lLeg.rotation.x = 0; zObj.rLeg.rotation.x = 0; zObj.head.rotation.z = 0; zObj.lArm.rotation.x = Math.abs(Math.sin(time*0.02))*0.8; zObj.rArm.rotation.x = Math.abs(Math.sin(time*0.02 + 1))*0.8;
                    // El cliente se hace daño si el zombie está atacando Y él es el objetivo cercano
                    if (!isPaused && camera.position.distanceTo(z.position) <= 1.2 && time - lastDamageTime > 1000) {
                        salud -= 20; actualizarHUD(); lastDamageTime = time; let dOv = document.getElementById('damage-overlay'); if(dOv) { dOv.style.opacity = '0.5'; setTimeout(() => dOv.style.opacity = '0', 200); } if (salud <= 0) handleGameOver();
                    }
                }
            }
        });
        if (!isPaused) { let va = document.getElementById('visual-audio-container'); if(va) va.innerHTML = blipsHTML; }
    }

    // --- MANEJO DE MOVIMIENTO DEL JUGADOR (Ignorar input si está pausado) ---
    if (recargando) { 
        currentTargetPosition.set(0.3, -0.4, -0.2); activeWeaponGroup.rotation.x -= (activeWeaponGroup.rotation.x + 0.8) * 0.1; 
    } else { 
        if (!isPaused) {
            currentTargetPosition.copy(isAiming ? aimPosition : hipPosition); 
            if (!isAiming && (moveF || moveB || moveL || moveR)) { currentTargetPosition.y += Math.sin(time * (isSprinting?0.015:0.008)) * (isSprinting?0.02:0.01); currentTargetPosition.x += Math.cos(time * (isSprinting?0.0075:0.004)) * (isSprinting?0.01:0.005); } 
        }
        activeWeaponGroup.rotation.x -= (activeWeaponGroup.rotation.x) * 0.1; 
    }
    activeWeaponGroup.position.lerp(currentTargetPosition, 0.2); camera.fov += ((isAiming ? aimFOV : normalFOV) - camera.fov) * 0.15; camera.updateProjectionMatrix(); let ch = document.getElementById('crosshair'); if(ch) ch.style.transform = isAiming ? 'translate(-50%, -50%) scale(0.5)' : 'translate(-50%, -50%) scale(1)';
    
    if (!isPaused) {
        let speed = isAiming ? 25.0 : isSliding ? 130.0 : isCrouching ? 20.0 : (isSprinting && (moveF||moveL||moveR||moveB)) ? 90.0 : 50.0; 
        if(isSliding) { slideTimer--; if(slideTimer<=0){isSliding=false; isCrouching=true;} }
        if(isMobile) { 
            let forward = new THREE.Vector3(0,0,-1); let right = new THREE.Vector3(1,0,0);
            forward.applyQuaternion(camera.quaternion); forward.y = 0; forward.normalize(); right.applyQuaternion(camera.quaternion); right.y = 0; right.normalize(); 
            if(moveF) { velocity.x += forward.x * speed * delta; velocity.z += forward.z * speed * delta; } if(moveB) { velocity.x -= forward.x * speed * delta; velocity.z -= forward.z * speed * delta; } if(moveR) { velocity.x += right.x * speed * delta; velocity.z += right.z * speed * delta; } if(moveL) { velocity.x -= right.x * speed * delta; velocity.z -= right.z * speed * delta; } 
        } else { 
            direction.z = Number(moveF) - Number(moveB); direction.x = Number(moveR) - Number(moveL); direction.normalize(); if (moveF || moveB) velocity.z -= direction.z * speed * delta; if (moveL || moveR) velocity.x -= direction.x * speed * delta; 
        }
    }
    
    // Fricción y gravedad se aplican siempre (incluso en pausa) para que no te quedes flotando o resbalando
    velocity.x -= velocity.x * 10.0 * delta; velocity.z -= velocity.z * 10.0 * delta; 

    const playerBox = new THREE.Box3(); const oldX = camera.position.x; if(isMobile) camera.position.x += velocity.x * delta; else controls.moveRight(-velocity.x * delta); playerBox.setFromCenterAndSize(camera.position, new THREE.Vector3(1, 2, 1)); if (boundingBoxes.some(b => playerBox.intersectsBox(b))) camera.position.x = oldX;
    const oldZ = camera.position.z; if(isMobile) camera.position.z += velocity.z * delta; else controls.moveForward(-velocity.z * delta); playerBox.setFromCenterAndSize(camera.position, new THREE.Vector3(1, 2, 1)); if (boundingBoxes.some(b => playerBox.intersectsBox(b))) camera.position.z = oldZ;
    velocity.y -= 30.0 * delta; camera.position.y += velocity.y * delta; let targetHeight = (isCrouching || isSliding) ? 0.7 : 1.6; if (canJump) camera.position.y += (targetHeight - camera.position.y) * 0.2; if (camera.position.y < targetHeight) { velocity.y = 0; camera.position.y = targetHeight; canJump = true; }
    camera.position.x = Math.max(-49, Math.min(49, camera.position.x)); camera.position.z = Math.max(-49, Math.min(49, camera.position.z));

    if (muzzleFlashTimer > 0) muzzleFlashTimer--; else muzzleFlashLight.intensity = 0;
    prevTime = time; renderer.render(scene, camera);
}
animate();