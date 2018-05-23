/**
 * Created by elisei on 11.04.2018.
 */
class Room{

    constructor(){

    }

    create(){
        this.roomMatesTexts = [];

        this.gameStartedListener = this.gameStartedListener.bind(this);
        this.roomMatesListener = this.roomMatesListener.bind(this);
        this.roomMateConnectedListener = this.roomMateConnectedListener.bind(this);
        this.roomMateDisconnectedListener = this.roomMateDisconnectedListener.bind(this);
        this.game.connection.on("gameStarted", this.gameStartedListener);
        this.game.connection.on("roomMateConnected", this.roomMateConnectedListener);
        this.game.connection.on("roomMateDisconnected", this.roomMateDisconnectedListener);
        this.game.connection.on("roomMates", this.roomMatesListener);

        var backButton = this.game.add.text(20, 20, "Back");
        backButton.anchor.set(0, 0);
        backButton.inputEnabled = true;
        backButton.events.onInputUp.add(() => {
            this.game.connection.emit("leaveRoom");
            this.clean();
            this.game.state.start("Main")
        });

        let titleText = this.game.add.text(20, 60, "Connected Players to this room");
        titleText.anchor.set(0, 0);

        var me = this.game.add.text(20, 90, "Me");
        me.anchor.set(0, 0);
        me.addColor("#0040a5", 0);

        var startButton = this.game.add.text(this.game.world.width - 20, 20, "Start");
        startButton.anchor.set(1, 0);
        startButton.inputEnabled = true;
        startButton.events.onInputUp.add(() => {
            this.game.connection.emit("startGame");
        });

        this.game.connection.emit("getRoomMates");
    }


    gameStartedListener(game){
        console.log(game);
        this.game.players = {};
        for(let index in game.players){
            let player = game.players[index];
            this.game.players[player.id] = player;
        }
        this.game.room = game.room;
        this.game.myId = game.myId;
        this.clean();
        this.game.state.start("Game");
    }

    roomMatesListener(roomMates){
        console.log("Connected roomMates");
        console.log(roomMates);

        this.roomMates = {};
        for(let index in roomMates){
            let player = roomMates[index];
            this.roomMates[player.id] = player;
        }
        this.roomChanged = true;
    }

    roomMateConnectedListener(roomMate){
        console.log(`Connected roomMate: ${JSON.stringify(roomMate)}`);
        this.roomMates[roomMate.id] = roomMate;
        this.roomChanged = true;
    }

    roomMateDisconnectedListener(roomMate){
        let existingRoomMate = this.roomMates[roomMate.id];
        console.log(`RoomMate disconnected: ${JSON.stringify(roomMate)}`);
        if(existingRoomMate === undefined) return;

        delete this.roomMates[existingRoomMate.id];
        this.roomChanged = true;
    }

    showAllTexts(){
        var playersId = Object.keys(this.roomMates);
        for(let i = 0; i < Math.min(this.roomMatesTexts.length, playersId.length); i++){
            this.roomMatesTexts[i].data = playersId[i];
            this.roomMatesTexts[i].setText(this.roomMates[playersId[i]].name);
        }

        if(this.roomMatesTexts.length < playersId.length){
            for(let i = this.roomMatesTexts.length; i < playersId.length; i++){
                let player = this.roomMates[playersId[i]];
                let text = this.game.add.text(
                    20,
                    i * 30 + 120,
                    `${player.name}`);
                text.anchor.set(0, 0);
                text.inputEnabled = true;
                text.data = playersId[i];
                if(player.playersCount == player.maxPlayersCount)
                    text.addColor("#a30000", 0);
                else
                    text.addColor("#007400", 0);
                this.roomMatesTexts.push(text);
            }
        }
        else if(this.roomMatesTexts.length > playersId.length) {
            for(var i = playersId.length; i < this.roomMatesTexts.length; i++)
                this.roomMatesTexts[i].destroy();

            this.roomMatesTexts.splice(
                playersId.length,
                this.roomMatesTexts.length - playersId.length)
        }
        this.roomChanged = false;
    }

    clean(){
        this.game.connection.off("roomMateConnected", this.roomMateConnectedListener);
        this.game.connection.off("roomMates", this.roomMatesListener);
        this.game.connection.off("roomMateDisconnected", this.roomMateDisconnectedListener);
    }

    update(){
        if(this.roomChanged === true){
            console.log("Rooms changed");
            this.showAllTexts();
        }
    }


}