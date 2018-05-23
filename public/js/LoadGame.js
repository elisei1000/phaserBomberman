/**
 * Created by elisei on 10.04.2018.
 */

class LoadGame{
    constructor(){
        this.rooms = [];
        this.roomMatesTexts = [];
    }

    create(){
        this.rooms = [];
        this.roomMatesTexts = [];
        this.roomStates = {
            1: "WAITING PLAYERS",
            2 : "GAME STARTED",
            3 : "GAME STOPPED"
        };

        this.roomEnteredListener = this.roomEnteredListener.bind(this);
        this.allRoomsListener = this.allRoomsListener.bind(this);
        this.roomClosedListener = this.roomClosedListener.bind(this);
        this.roomCreatedListener = this.roomCreatedListener.bind(this);
        this.roomChangedListener = this.roomChangedListener.bind(this);
        this.roomClickListener = this.roomClickListener.bind(this);

        this.game.connection.on("roomEntered", this.roomEnteredListener);
        this.game.connection.on("allRooms", this.allRoomsListener);
        this.game.connection.on("roomClosed", this.roomClosedListener);
        this.game.connection.on("roomCreated", this.roomCreatedListener);
        this.game.connection.on("roomChanged", this.roomChangedListener);


        var backButton = this.game.add.text(20, 20, "Back");
        backButton.anchor.set(0, 0);
        backButton.inputEnabled = true;
        backButton.events.onInputUp.add(() => {
            this.game.connection.emit("leaveRoom");
            this.clean();
            this.game.state.start("Main")
        });


        this.showAllTexts();

        this.game.connection.emit("getAllRooms");
    }

    showAllTexts(){
        var roomsIds = Object.keys(this.rooms);
        for(let i = 0; i < Math.min(this.roomMatesTexts.length, roomsIds.length); i++){
            let room = this.rooms[roomsIds[i]];
            let text = this.roomMatesTexts[i];
            text.data = roomsIds[i];
            text.setText(`${room.name} (${room.playersCount}/${room.maxPlayersCount}) - ${this.roomStates[room.roomState]}`);
            if(room.playersCount == room.maxPlayersCount)
                text.addColor("#a30000", 0);
            else
                text.addColor("#007400", 0);
        }

        if(this.roomMatesTexts.length < roomsIds.length){
            for(let i = this.roomMatesTexts.length; i < roomsIds.length; i++){
                let room = this.rooms[roomsIds[i]];
                let text = this.game.add.text(
                    20,
                    i * 30 + 50,
                    `${room.name} (${room.playersCount}/${room.maxPlayersCount}) - ${this.roomStates[room.roomState]}`);
                text.anchor.set(0, 0);
                text.inputEnabled = true;
                text.data = roomsIds[i];
                text.events.onInputUp.add( this.roomClickListener);
                if(room.playersCount == room.maxPlayersCount)
                    text.addColor("#a30000", 0);
                else
                    text.addColor("#007400", 0);
                this.roomMatesTexts.push(text);
            }
        }
        else if(this.roomMatesTexts.length > roomsIds.length) {
            for(var i = roomsIds.length; i < this.roomMatesTexts.length; i++)
                this.roomMatesTexts[i].destroy();

            this.roomMatesTexts.splice(
                roomsIds.length,
                 this.roomMatesTexts.length - roomsIds.length)
        }
        this.roomsChanged = false;

    }

    allRoomsListener(rooms){
        this.rooms = rooms;
        this.roomsChanged = true;
    }

    roomEnteredListener(roomId){
        this.clean();
        this.game.state.start("Room");
    }

    roomClickListener(object, pointer, isOver){
        console.log(object.data);
        this.game.connection.emit("enterRoom", object.data);
    }

    roomClosedListener(room){
        var existingRoom = this.rooms[room.id];
        console.log(`Room closed ${JSON.stringify(room)}`);
        if(existingRoom) {
            this.roomsChanged = true;
            delete this.rooms[room.id];
        }
    }

    roomCreatedListener(room){
        console.log(`Room created ${JSON.stringify(room)}`);
        this.roomsChanged = true;
        this.rooms[room.id] = room;
    }

    roomChangedListener(room){
        console.log(`Room changed ${JSON.stringify(room)}`);
        this.rooms[room.id] = room;
        this.roomsChanged = true;
    }

    update(){
        if(this.roomsChanged === true){
            console.log("Rooms changed")
            this.showAllTexts();
        }
    }

    clean(){
        this.game.connection.removeListener("roomEntered", this.roomEnteredListener);
        this.game.connection.removeListener("allRooms", this.allRoomsListener);
        this.game.connection.removeListener("roomClosed", this.roomClosedListener);
        this.game.connection.removeListener("roomCreated", this.roomCreatedListener);
        this.game.connection.removeListener("roomChanged", this.roomChangedListener);
    }
}
