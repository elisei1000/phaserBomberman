/**
 * Created by elisei on 10.04.2018.
 */
class NewGame{

    preload(){

    }

    create(){
        this.myRoomCreatedListener = this.myRoomCreatedListener.bind(this);
        this.game.connection.on("myRoomCreated", this.myRoomCreatedListener);
        this.game.connection.emit("createRoom");
    }


    myRoomCreatedListener(room){
        console.log(room);
        this.game.connection.off("myRoomCreated", this.myRoomCreatedListener);
        this.game.roomId = room.id;
        this.game.state.start("Room");
    }


}
