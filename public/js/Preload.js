/**
 * Created by elisei on 06.04.2018.
 */
class Preload{

    constructor(){
        console.log('Preload');
    }


    preload(){
        console.log('Preload - preload');
        this.preloadBar = this.add.graphics(0, 0);
        this.preloadBar.lineStyle(3, 0xFFFFFF, 1);
        this.preloadBar.moveTo(0, this.game.height/2);
        this.preloadBar.lineTo(this.game.width, this.game.height/2);
        this.preloadBar.scale.x = 0;

        this.load.spritesheet(
            'bomb',
            "/assets/Bomb/bomb_sprite.png",
            48,
            48
        );
        this.load.spritesheet(
            "violet_man",
            "/assets/Bomberman/man_violet_sprite.png",
            64,
            128
        );
        this.load.spritesheet(
            "yellow_man",
            "/assets/Bomberman/man_yellow_sprite.png",
            64,
            128
        );
        this.load.spritesheet(
            "blue_man",
            "/assets/Bomberman/man_blue_sprite.png",
            64,
            128
        );
        this.load.spritesheet(
            "green_man",
            "/assets/Bomberman/man_green_sprite.png",
            64,
            128
        );
        this.load.spritesheet(
            "fire",
            "/assets/Flame/fire_sprite.png",
            48,
            48
        );
        this.load.spritesheet("eBlock", "/assets/Blocks/SolidBlock.png");
        this.load.spritesheet("fBlock", "/assets/Blocks/ExplodableBlock.png");
        this.load.spritesheet("backgroundTile", "assets/Blocks/BackgroundTile.png");
    }


    create(){
        console.log('Preload - create');
        this.preloadBar.scale.x = 0.5;

        this.game.connection = io.connect();
        this.preloadBar.scale.x = 1;
        this.state.start('Main')
    }
}