/**
 * Created by elisei on 06.04.2018.
 */
const log = console.log;

const http = require('http');
const path = require('path');
const ecstatic = require('ecstatic');
const socketIO = require('socket.io');

const PLAYER_COLOR = ["blue",  "green", "yellow", "violet"];
let io;
let rooms  = {};
let clientsRoom = {};
let clients = {};
let players = {};
let lastPlayerId = 12;
let CELLS_ON_WIDTH = 10;
let CELLS_ON_HEIGHT = 10;
let CELL_WIDTH = 48;
const random = (min, max) =>
    Math.floor(Math.random() * (max - min) + min);

const server = http.createServer(
    ecstatic({
        root: path.resolve(__dirname, '../public')
    })
).listen(3000, ()=>{
    io = socketIO.listen(server);
    io.on('connection', client =>{
        log("Client connected");
        clients[client.id] = client;
        lastPlayerId += 1;
        players[client.id] = new Player(lastPlayerId, `Guest #${lastPlayerId}`, client.id);

        client.on('disconnect', () => onClientDisconnect(client));
        client.on('getAllRooms', () => getAllRooms(client));
        client.on('createRoom', () => createRoom(client));
        client.on("enterRoom", (roomId) => enterRoom(client, roomId));
        client.on('leaveRoom', () => leaveRoom(client));
        client.on('getRoomMates', () => getRoomMates(client));

        client.on('startGame', () => startGame(client));
        client.on('movePlayer', (data) => movePlayer(client, data));
        client.on('stopMovingPlayer', (data) => stopMovingPlayer(client, data));
        client.on('placeBomb', (data) => placeBomb(client));
    })
});


class Point{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
}

class Bomb{
    constructor(id, x, y, power){
        this.id = id;
        this.x =  x;
        this.y = y;
        this.power = power;
    }
}

var RoomState = {"WAITING_PLAYERS":1, "GAME_STARTED":2, "GAME_STOPEED":3};
Object.freeze(RoomState);
class Room{
    constructor(name, id, maxPlayersCount, onScoreChanged){
        var players = [];


        const dX = [0, 1, 0, -1];
        const dY = [1, 0, -1, 0];
        const dx = [0, 1, 2, 0, 0];
        const dy = [0, 0, 0, 1, 2];
        const ddx = [1, -1, -1, 1];
        const ddy = [1, 1, -1, -1];
        const x0 = [0, CELLS_ON_WIDTH - 1, CELLS_ON_WIDTH - 1, 0];
        const y0 = [0, 0, CELLS_ON_HEIGHT - 1, CELLS_ON_HEIGHT - 1];
        const BRICK_BROKE_SCORE = 10;
        const PLAYER_KILL_SCORE = 100;


        this.name = name;
        this.id = id;
        this.maxPlayersCount = maxPlayersCount;
        this.roomState = RoomState.WAITING_PLAYERS;
        this.playGround = [];
        this.bombs = {};
        this.crtBombId = 0;
        this.onScoreChanged = onScoreChanged;

        this.addPlayer = (client) => {
            if(players.length >= this.maxPlayersCount)
                return false;
            if(this.roomState != RoomState.WAITING_PLAYERS)
                return false;
            players.push(client);
            return true;
        };
        this.removePlayer = (client) => {
            if(this.roomState != RoomState.WAITING_PLAYERS)
                return false;
            let index = players.indexOf(client);
            if(index >= 0)
                players.splice(index, 1);
        };
        this.getPlayers = () => {return players;};
        this.toNetwork = () => {
            this.playersCount = players.length;
            return this;
        };

        this.leavedBombPosition = (player, line, column) => {
            if(player.lastBombPosition){
                if(line == player.lastBombPosition.y &&
                    column == player.lastBombPosition.x)
                    return false;

                this.playGround[player.lastBombPosition.y][player.lastBombPosition.x] = -3;
                player.lastBombPosition = undefined;
                console.log('leavedBomPosition');
                return true;
            }
            return false;

        };

        this.collide = (player, speed) =>{
            var res;
            var newPosition = new Point(
                player.position.x + speed.x,
                player.position.y + speed.y
            );
            var line = Math.floor(newPosition.y / CELL_WIDTH);
            var column = Math.floor(newPosition.x / CELL_WIDTH);


            if(line < 0 || line >= CELLS_ON_HEIGHT
                || column < 0 || column >= CELLS_ON_WIDTH)
                return true;
            if(!(player.lastBombPosition && player.lastBombPosition.x == column &&
                player.lastBombPosition.y == line)  &&
                this.playGround[line][column] != 0)
                return true;

            this.leavedBombPosition(player, line, column);
            return false;
        };

        this.placeBomb = (player, onExplode) =>{
            var bomb, playGround = this.playGround;
            var scores = this.scores;
            var players = this.getPlayers();
            var onScoreChanged = this.onScoreChanged;
            var onPlayerKilled = this.onPlayerKilled;
            var onPlayerLoose = this.onPlayerLoose;
            var onPlayerWon = this.onPlayerWon;

            if(player.killed) return;
            if(player.crtBombs >= player.maxBombs) return undefined;

            var line = Math.floor(player.position.y / CELL_WIDTH);
            var column = Math.floor(player.position.x / CELL_WIDTH);
            var jumaDeCellWidth = CELL_WIDTH / 2;

            if (this.playGround[line][column] !== 0)
                return undefined;

            bomb = new Bomb(
                this.crtBombId++,
                column * CELL_WIDTH + jumaDeCellWidth,
                line * CELL_WIDTH + jumaDeCellWidth,
                player.bombPower
            );
            this.playGround[line][column] = bomb.id;

            player.lastBombPosition = new Point(column, line);
            player.crtBombs += 1;

            setTimeout(function(){
                var places = [];
                var brokenBlocks = [];
                var scoreChanged = false;

                player.crtBombs -= 1;
                playGround[line][column] = 0;

                places.push(new Point(
                    column ,
                    line
                ));
                for(let index = 0; index < 4; index ++){
                    let shouldStop = false;

                    for(let z = 1; z < player.bombPower; z++){
                        let newX = column + dX[index] * z;
                        let newY = line + dY[index] * z;

                        if(newX < 0 || newX >= CELLS_ON_WIDTH) break;
                        if(newY < 0 || newY >= CELLS_ON_HEIGHT) break;
                        if(playGround[newY][newX] == -1) break;
                        if(playGround[newY][newX] == -2) shouldStop = true;

                        places.push(new Point(
                            newX,
                            newY
                        ));
                        if(shouldStop){
                            brokenBlocks.push(new Point(newX, newY));
                            playGround[newY][newX] = 0;
                            scores[player.id] += BRICK_BROKE_SCORE;
                            scoreChanged = true;
                            break;
                        }
                    }
                }

                for(let index in players){
                    var cPlayer = players[index];
                    if(cPlayer.killed) continue;

                    var pLine = Math.floor(cPlayer.position.y / CELL_WIDTH);
                    var pColumn = Math.floor(cPlayer.position.x / CELL_WIDTH);
                    for(let index2 in places){
                        var place = places[index2];
                        if(place.x == pColumn && place.y == pLine){
                            if(cPlayer.id != player.id){
                                //it another player
                                scores[player.id] += PLAYER_KILL_SCORE;
                                scoreChanged = true;
                                cPlayer.justKilled = true;
                            }
                            else{
                                //autoKill
                                cPlayer.justKilled = true;
                            }
                            break;
                        }
                    }
                }

                places = places.map(function(item){return new Point(
                    item.x * CELL_WIDTH + jumaDeCellWidth,
                    item.y * CELL_WIDTH + jumaDeCellWidth
                )});
                onExplode(Object.assign({}, bomb, {fire:places, brokenBlocks:brokenBlocks}));
                if(scoreChanged) onScoreChanged(scores);
                let alive = 0;
                let lastPlayer = undefined;
                for(let index in players){
                    var cPlayer = players[index];
                    if(cPlayer.justKilled){
                        onPlayerKilled(cPlayer);
                        onPlayerLoose(cPlayer);
                        cPlayer.justKilled = false;
                        cPlayer.killed = true;
                    }
                    else if(!cPlayer.killed){
                        alive += 1;
                        lastPlayer = cPlayer;
                    }
                }
                if(players.length > 1 && alive == 1){
                    onPlayerWon(lastPlayer);
                }

            }, 3000);

            return bomb;
        };

        this.startGame = () => {
            if(this.roomState !== RoomState.WAITING_PLAYERS) return;

            this.roomState = RoomState.GAME_STARTED;

            this.playGround = new Array(CELLS_ON_HEIGHT);
            for(let i=0; i < CELLS_ON_HEIGHT; i ++){
                this.playGround[i] = new Array(CELLS_ON_WIDTH);
                this.playGround[i].fill(0);
            }

            let i = 0, x, y;
            while(i < CELLS_ON_HEIGHT * CELLS_ON_WIDTH * 0.2){
                x = random(0, CELLS_ON_WIDTH);
                y = random(0, CELLS_ON_HEIGHT);
                if(this.playGround[y][x] == 0){
                    this.playGround[y][x] = -1;
                    i += 1;
                }
            }

            i = 0;
            while(i < CELLS_ON_HEIGHT * CELLS_ON_WIDTH * 0.5){
                x = random(0, CELLS_ON_WIDTH);
                y = random(0, CELLS_ON_HEIGHT);
                if(this.playGround[y][x] == 0){
                    this.playGround[y][x] = -2;
                    i += 1;
                }
            }

            for(let i=0; i < x0.length; i++){
                let x = x0[i];
                let y = y0[i];
                for(let j=0; j < dx.length; j++){
                    this.playGround[y + ddy[i] * dy[j]][x + ddx[i] * dx[j]] = 0 ;
                }
            }


            this.scores = {};
            for(let index in players){
                let player = players[index];
                this.scores[player.id] = 0;
                player.color = PLAYER_COLOR[index];
                player.position = new Point(x0[index] * CELL_WIDTH + CELL_WIDTH/ 2, y0[index] * CELL_WIDTH + CELL_WIDTH);
                player.maxBombs = 1;
                player.crtBombs = 0;
                player.bombPower = 2;
                player.killed = false;
                player.justKilled = false;
            }


        };
    }
}


class Player{
    constructor(id, name, socketId){
        this.id = id;
        this.name = name;

        this.getClientSocketId = () => socketId;
    }
}


function getAllRooms(client){
    for(var roomId in rooms){
        rooms[roomId].toNetwork()
    }
    client.emit("allRooms", rooms);
}

let lastRoomId = -1;
function createRoom(client){
    ++lastRoomId;
    var room = new Room(`room ${lastRoomId}`, lastRoomId, 4);

    room.onScoreChanged = function(scores){
        emitToPlayers(room, 'scoreChanged', scores);
    };
    room.onPlayerKilled = function(player){
        emitToPlayers(room, 'playerKilled', player);
    };
    room.onPlayerLoose = function(player){
        clients[player.getClientSocketId()].emit('gameLost');
    };
    room.onPlayerWon = function(player){
        clients[player.getClientSocketId()].emit('gameWon');
    };

    rooms[lastRoomId] = room;
    clientsRoom[client.id] = room;
    room.addPlayer(players[client.id]);
    client.emit("myRoomCreated", room.toNetwork());
    for(var clientId in clients){
        if(clientId !== client.id){
            clients[clientId].emit("roomCreated", room.toNetwork());
        }
    }
}

function roomClientsAnnounce(room, event, client){
    var issuer = players[client.id];
    var roomPlayersList = room.getPlayers();
    for(var index in roomPlayersList){
        var roomPlayer = roomPlayersList[index];
        var playerClientId = roomPlayer.getClientSocketId();
        if(playerClientId !== client.id){
            var cClient = clients[playerClientId];
            if(cClient)
                cClient.emit(event, issuer);
        }
    }
}

function emitToPlayers(room, event, data){
    var players = room.getPlayers();
    for(var index in players){
        var player = players[index];
        clients[player.getClientSocketId()].emit(event, data);
    }
}

function enterRoom(client, roomId){
    if(!(roomId in rooms)){
        console.log(`Invalid roomId ${roomId}`);
        return;
    }

    var room = rooms[roomId];
    clientsRoom[client.id] = room;
    if(room.addPlayer(players[client.id])){
        roomClientsAnnounce(room, "roomMateConnected", client);
        client.emit("roomEntered", roomId);
        io.emit("roomChanged", room.toNetwork());
    }
}

function leaveRoom(client){
    var room = clientsRoom[client.id];
    if(room === undefined) return;

    room.removePlayer(players[client.id]);
    if(room.getPlayers().length == 0){
        console.log(`Deleting room with id: ${room.id}`);
        io.emit("roomClosed", room.toNetwork());
        delete rooms[room.id];
    }
    else{
        roomClientsAnnounce(room, "roomMateDisconnected", client);
        io.emit("roomChanged", room.toNetwork());
    }
    delete clientsRoom[client.id];
}

function getRoomMates(clientSocket){
    let room = clientsRoom[clientSocket.id];
    if(room === undefined) return;

    clientSocket.emit("roomMates", room.getPlayers().filter(player => player.getClientSocketId() != clientSocket.id));
}


function startGame(clientSocket){
    let room = clientsRoom[clientSocket.id];
    if(room === undefined) return;

    room.startGame();
    let roomPlayers = room.getPlayers();
    for(var index in roomPlayers){
        let player = roomPlayers[index];
        clients[player.getClientSocketId()].emit("gameStarted", {
            "room": room.toNetwork(),
            "players": roomPlayers,
            "myId": player.id
        });
    }
    io.emit("roomChanged", room.toNetwork());
}

function movePlayer(clientSocket, data){
    let room = clientsRoom[clientSocket.id];
    if(room == undefined) return;

    let roomPlayers = room.getPlayers();

    let movingPlayer = players[clientSocket.id];
    if(room.collide(movingPlayer, data.speed)){
        data.speed = {x:0, y:0};
    }
    for(var index in roomPlayers){
        let player = roomPlayers[index];

        clients[player.getClientSocketId()].emit("movePlayer", {
            player: movingPlayer,
            direction: data.direction,
            speed: data.speed,
        });
    }
    movingPlayer.position = new Point(
        movingPlayer.position.x + data.speed.x,
        movingPlayer.position.y + data.speed.y
    );
}

function stopMovingPlayer(clientSocket, data){
    let room = clientsRoom[clientSocket.id];
    if(room == undefined) return;

    let roomPlayers = room.getPlayers();

    let movingPlayer = players[clientSocket.id];
    for(var index in roomPlayers){
        let player = roomPlayers[index];
        clients[player.getClientSocketId()].emit("stopMovingPlayer", {
            player: movingPlayer,
            direction: data.direction,
        });
    }
}

function placeBomb(clientSocket){
    let player = players[clientSocket.id];
    let room = clientsRoom[clientSocket.id];
    if(room == undefined) return;

    let bomb = room.placeBomb(player, bomb => emitToPlayers(room, 'bombExploded', bomb));
    if(bomb === undefined) return;

    emitToPlayers(room, 'bombPlaced', bomb);
}

function onClientDisconnect(client){
    leaveRoom(client);
    delete clients[client.id];
    delete players[client.id];
}




