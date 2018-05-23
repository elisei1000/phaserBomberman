/**
 * Created by elisei on 10.04.2018.
 */

const Directions ={LEFT:'Left', UP: 'Up', DOWN:'Down', RIGHT:'Right'};
const SPEED = 1;
class Speed{

    constructor(x, y){
        this.x = x;
        this.y = y;
    }
}

class Game{
    constructor(){
        this.onSocketConnected = this.onSocketConnected.bind(this);
        this.onSocketDisconnected = this.onSocketDisconnected.bind(this);
        this.onMovePlayer = this.onMovePlayer.bind(this);
        this.onStopMovingPlayer = this.onStopMovingPlayer.bind(this);
        this.onBombPlaced = this.onBombPlaced.bind(this);
        this.onBombExploded = this.onBombExploded.bind(this);
        this.onScoreChanged = this.onScoreChanged.bind(this);
    }



    create(){
        let height, width, game, offsetY = 160, playGround, gameHeight, gameWidth;
        this.offsetY = offsetY;
        this.events = [];
        game = this.game;

        game.world.setBounds(0, 0, 480, 640);
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.camera.setBoundsToWorld();

        height = game.world.height;
        width = game.world.width;

        playGround = this.playGround = game.room.playGround;
        gameHeight = this.gameHeight = playGround.length;
        gameWidth = this.gameWidth = playGround[0].length;
        this.tileWidth = (height - offsetY) / gameHeight;


        this.createBackground(width, height);
        this.createBlocks();
        this.createPlayers();
        this.createScores();
        this.bombs = {};

        this.cursors = game.input.keyboard.createCursorKeys();
        let fireButton = this.firebutton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
        fireButton.onDown.add(this.fire, this);
        this.lastMove = Directions.DOWN;
        this.lastStopped = true;


        let socket = this.socket = game.connection;
        socket.on('movePlayer', this.onMovePlayer);
        socket.on('stopMovingPlayer', this.onStopMovingPlayer);
        socket.on('bombPlaced', this.onBombPlaced);
        socket.on('bombExploded', this.onBombExploded);
        socket.on('scoreChanged', this.onScoreChanged);
    }

    createPlayers(){
        let players,
            game,
            offsetY = this.offsetY,
            player, drawnPlayer;

        game = this.game;
        players = game.players;
        let drawnPlayers = this.drawnPlayers = {};
        const scaleY = this.tileWidth / 128 * 2 ;
        console.log(players);
        for(let id in players){
            let player = players[id];
            let drawnPlayer = game.add.sprite(
                player.position.x,
                offsetY + player.position.y,
                `${player.color}_man`,

            );

            game.physics.enable(drawnPlayer, Phaser.Physics.ARCADE);

            drawnPlayer.scale.setTo(scaleY, scaleY);
            drawnPlayer.anchor.set(0.5, 0.9);

            drawnPlayer.animations.add('moveLeft',  [ 8,  9, 10, 11, 12, 13, 14, 15], 15, true);
            drawnPlayer.animations.add('moveRight', [ 0,  1,  2,  3,  4,  5,  6,  7], 15, true);
            drawnPlayer.animations.add('moveUp',    [16, 17, 18, 19, 20, 21, 22, 23], 15, true);
            drawnPlayer.animations.add('moveDown',  [24, 25, 26, 27, 28, 29, 30, 31], 15, true);
            drawnPlayer.animations.add('stopLeft', [8], 1, true);
            drawnPlayer.animations.add('stopRight', [0], 1, true);
            drawnPlayer.animations.add('stopUp', [16], 1, true);
            drawnPlayer.animations.add('stopDown', [24], 1, true);

            drawnPlayers[player.id] = drawnPlayer;
        }
        this.drawnPlayer = drawnPlayers[game.myId];
        this.player = players[game.myId];
        this.drawnPlayer.bringToTop();
    }

    createBackground(worldWidth, worldHeight){
        let offsetY = this.offsetY;
        let background = this.background = this.game.add.sprite(
            0,
            offsetY,
            "backgroundTile");

        background.scale.setTo(
            worldWidth / background.width,
            (worldHeight - offsetY) / background.height
        );

    }

    createBlocks(){
        let game = this.game,
            scale,
            offsetY = this.offsetY,
            tileWidth = this.tileWidth,
            playGround = game.room.playGround,
            blocksGroup,
            gameWidth,
            gameHeight;
        let blocks = this.blocksElems = [];

        blocksGroup = this.blocksGroup = game.add.group(this.game.world,
                                                'blocksGroup',
                                                false,
                                                true,
                                                Phaser.Physics.ARCADE);

        playGround = game.room.playGround;
        gameWidth = this.gameWidth;
        gameHeight = this.gameHeight;

        for(let i = 0; i < gameHeight; i++) {
            blocks[i] = [];
            for (let j = 0; j < gameWidth; j++)
                blocks[i].push(undefined);
        }

        scale = tileWidth / 64 ;
        for(let y = 0; y < gameHeight; y++){
            var line = playGround[y];
            for(let x = 0; x < gameWidth; x++){
                let block;
                switch (line[x]){
                    case -1:
                    {
                        block = blocksGroup.create(
                            x * tileWidth,
                            offsetY + y * tileWidth,
                            "fBlock");
                        break;
                    }
                    case -2:
                    {
                        block = blocksGroup.create(
                            x * tileWidth,
                            offsetY + y * tileWidth,
                            "eBlock"
                        );
                        break;
                    }
                }
                if(block){
                    block.scale.setTo(scale, scale);
                    blocks[y][x] = block;
                }
            }
        }
    }

    createScore(player, position, textColor){
        let {game} = this;
        let score = game.add.text(position.x, position.y, player.name + ": 0");
        score.anchor.set(0, 0);
        score.addColor(textColor, 0);
        return score;
    }

    createScores(){
        let {game} = this;
        let {players} = game;
        let scoreTexts = this.scoreTexts = {};
        let index = 1;
        game.add.text(20, 10, "Scores");
        scoreTexts[this.player.id] = this.createScore(this.player, {x: 20, y: 50}, "red");

        for(var id in players){
            let player = players[id];
            if(player.name !== this.player.name){
                scoreTexts[player.id] = this.createScore(player, {x: 20 + index % 2 * 200, y: 50 + index / 2 * 50}, "black");
                index += 1;
            }
        }
    }

    update(){
        let {game, drawnPlayer, player,  cursors, lastMove, socket, lastStopped, events} = this;
        let cDir = undefined;
        let speed = undefined;

        if(cursors.right.isDown){
            cDir = Directions.RIGHT;
            speed = new Speed(SPEED, 0);
        }
        else if (cursors.left.isDown){
            cDir = Directions.LEFT;
            speed = new Speed(-SPEED, 0);
        }
        else if (cursors.up.isDown){
            cDir = Directions.UP;
            speed = new Speed(0, -SPEED);
        }
        else if(cursors.down.isDown){
            cDir = Directions.DOWN;
            speed = new Speed(0, SPEED);
        }

        if(cDir !== undefined){
            //drawnPlayer.animations.play(`move${cDir}`);
            this.lastMove = cDir;
            socket.emit('movePlayer', {
                speed: speed,
                direction: cDir,
            });
            this.lastStopped = false;
        }
        else{
            if(!lastStopped){
                //drawnPlayer.animations.play(`stop${lastMove}`);
                socket.emit('stopMovingPlayer', {
                    direction: lastMove
                });
                this.lastStopped = true;
            }

        }


    }

    fire(){
        console.log('placeBomb');
        this.socket.emit('placeBomb', {});
    }

    onSocketConnected(){

    }

    onSocketDisconnected(){

    }

    onMovePlayer(data){
        let {player, speed, direction} = data;
        let drawnPlayer = this.drawnPlayers[player.id];
        this.game.players[player.id] = player;

        console.log(direction);
        drawnPlayer.y = this.offsetY + player.position.y;
        drawnPlayer.x = player.position.x;
        drawnPlayer.body.velocity.x = speed.x;
        drawnPlayer.body.velocity.y = speed.y;
        drawnPlayer.animations.play(`move${direction}`);
    }

    onStopMovingPlayer(data){
        let {player, direction} = data;
        this.game.players[player.id] = player;
        let drawnPlayer = this.drawnPlayers[player.id];

        drawnPlayer.y = this.offsetY + player.position.y;
        drawnPlayer.x = player.position.x;
        drawnPlayer.body.velocity.x = 0;
        drawnPlayer.body.velocity.y = 0;
        drawnPlayer.animations.play(`stop${direction}`);
    }

    onBombPlaced(bombData){
        let {offsetY, game} = this;
        let bomb = game.add.sprite(
            bombData.x,
            offsetY + bombData.y,
            `bomb`,
        );

        const scale = this.tileWidth / 48;

        bomb.scale.setTo(scale / 1.5);
        bomb.anchor.set(0.5, 0.5);
        bomb.animations.add('misting', [0, 1, 2], 1, true);

        game.physics.enable(bomb, Phaser.Physics.ARCADE);

        bomb.animations.play("misting");

        bombData.phaserElem = bomb;
        this.bombs[bombData.id] = bombData;

        for(let index in this.players){
            this.drawnPlayers[index].bringToTop();
        }
        this.drawnPlayer.bringToTop();
    }

    onBombExploded(bomb){
        var {game, offsetY, blocksElems} = this;
        var fires = [], scale;
        this.bombs[bomb.id].phaserElem.destroy();
        delete this.bombs[bomb.id];


        scale = this.tileWidth / 48 / 1.5;
        for(var index in bomb.fire){
            var firePoint = bomb.fire[index];
            var fireSpread = game.add.sprite(
                firePoint.x,
                firePoint.y + offsetY,
                'fire'
            );
            fireSpread.scale.setTo(scale);
            fireSpread.anchor.set(0.5, 0.5);
            game.physics.enable(fireSpread, Phaser.Physics.ARCADE);
            fireSpread.animations.add('play', [0, 1, 2, 3, 4], 5, true);
            fireSpread.animations.play('play');
            fires.push(fireSpread);
        }

        bomb.brokenBlocks.forEach(function(point){blocksElems[point.y][point.x].destroy()});

        setTimeout(function(){
            fires.forEach(function(item){item.destroy()});
        }, 500);
    }


    onScoreChanged(scores){
        let {scoreTexts, game} = this;
        let {players} = game;
        for(var id in scores){
            scoreTexts[id].setText(`${players[id].name}: ${scores[id]}`);
        }
    }
}
