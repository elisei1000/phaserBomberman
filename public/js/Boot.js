/**
 * Created by elisei on 06.04.2018.
 */
class Boot{
    constructor(){
        console.log('Boot');
    }


    preload(){
        console.log('Boot - preload');
    }


    create(){
        console.log('Boot - create');
        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.pageAlignHorizontally = true;
        this.game.state.start("Preload");
    }

}