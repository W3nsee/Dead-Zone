// === SISTEMA MULTIJUGADOR PEERJS AVANZADO (HOST-RELAY) ===
let peer = null; 
let connections = []; // Ahora soporta múltiples jugadores
let isMultiplayer = false; let isHost = false; let myRoomId = "";

let otherPlayersMeshes = {}; // { id: Grupo 3D }
let otherPlayersData = {};   // { id: {x, y, z, rot} }

function createOtherPlayerMesh(colorHex) {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshPhongMaterial({ color: 0xffccaa }); 
    const shirtMat = new THREE.MeshPhongMaterial({ color: colorHex || 0x2980b9 }); 
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinMat); head.position.set(0, 1.7, 0); group.add(head);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), shirtMat); body.position.set(0, 1.15, 0); group.add(body);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.3), new THREE.MeshPhongMaterial({color:0x111})); gun.position.set(0.35, 1.3, -0.2); group.add(gun);
    group.position.set(0, -100, 0); scene.add(group); return group;
}

function setupMultiplayerConnection(conn) {
    conn.on('data', (data) => {
        if (isHost) {
            // El Host recibe el movimiento de los clientes
            if (data.type === 'player_pos') {
                otherPlayersData[conn.peer] = { x: data.x, y: data.y, z: data.z, rot: data.rot };
            } else if (data.type === 'shoot') {
                playShootSound();
                // El Host avisa a los demás que alguien disparó
                connections.forEach(c => { if(c.peer !== conn.peer) c.send({type:'shoot'}); });
            }
        } else {
            // El Cliente recibe el estado del mundo desde el Host
            if (data.type === 'start_game') {
                isLobby = false; actualizarHUD();
            } else if (data.type === 'world_state') {
                let allPlayers = data.players;
                for (let id in allPlayers) {
                    if (id === myRoomId) continue; // No me renderizo a mi mismo
                    if (!otherPlayersMeshes[id]) {
                        let isHostPlayer = (id === data.hostId);
                        // El Host es Rojo, los Invitados son Azules
                        otherPlayersMeshes[id] = createOtherPlayerMesh(isHostPlayer ? 0xc0392b : 0x2980b9); 
                    }
                    otherPlayersData[id] = allPlayers[id];
                }
            } else if (data.type === 'shoot') {
                playShootSound();
            }
        }
    });

    conn.on('close', () => {
        if(otherPlayersMeshes[conn.peer]) { scene.remove(otherPlayersMeshes[conn.peer]); delete otherPlayersMeshes[conn.peer]; }
        delete otherPlayersData[conn.peer];
        connections = connections.filter(c => c.peer !== conn.peer);
    });
}

function playShootSound() {
    let snd = audioShootPistola.cloneNode(); snd.volume = baseVolumes.shoot * globalVolMulti * 0.5; snd.play().catch(()=>{});
}

function iniciarPartidaMultijugador() {
    let sm = document.getElementById('screen-multiplayer'); if(sm) sm.style.display = 'none';
    let ul = document.getElementById('ui-layer'); if(ul) ul.style.display = 'none';
    resumeAudio(); isGameActive = true; isLobby = true; resetGame();
    
    // Spawn ligeramente separado para que no nazcan encimados
    camera.position.set((Math.random()-0.5)*4, 1.6, (Math.random()-0.5)*4); 
    
    // Auto-Lock del ratón (con pequeño retraso para evitar bloqueos del navegador)
    if(!isMobile && typeof controls !== 'undefined') {
        setTimeout(()=> { try { controls.lock(); } catch(e){} }, 100); 
    }
}