function setupMultiplayerConnection(conn) {
    conn.on('data', (data) => {
        if (isHost) {
            if (data.type === 'player_pos') {
                otherPlayersData[conn.peer] = { x: data.x, y: data.y, z: data.z, rot: data.rot };
            } else if (data.type === 'hit_zombie') {
                // El Host procesa el daño real
                damageZombie(data.zId, data.damage, data.part, data.hitPoint);
            } else if (data.type === 'shoot') {
                connections.forEach(c => { if(c.peer !== conn.peer) c.send({type:'shoot'}); });
                playShootSound();
            }
        } else {
            if (data.type === 'world_state') {
                // Sincronizar jugadores
                for (let id in data.players) {
                    if (id === myRoomId) continue;
                    if (!otherPlayersMeshes[id]) {
                        otherPlayersMeshes[id] = createOtherPlayerMesh(id === data.hostId ? 0xc0392b : 0x2980b9);
                    }
                    otherPlayersData[id] = data.players[id];
                }
                // Sincronizar zombies y oleada
                syncClientZombies(data.zombies);
                oleadaActual = data.waveInfo.oleada;
                zombiesRestantes = data.waveInfo.restantes;
                zombiesVivos = data.waveInfo.vivos;
                estadoOleada = data.waveInfo.estado;
                actualizarHUD();
            } else if (data.type === 'shoot') {
                playShootSound();
            }
        }
    });

    conn.on('close', () => {
        if(otherPlayersMeshes[conn.peer]) scene.remove(otherPlayersMeshes[conn.peer]);
        delete otherPlayersMeshes[conn.peer];
        delete otherPlayersData[conn.peer];
        connections = connections.filter(c => c.peer !== conn.peer);
    });
}