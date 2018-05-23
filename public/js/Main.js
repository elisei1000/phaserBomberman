/**
 * Created by elisei on 10.04.2018.
 */
class Main{
    constructor(){
        console.log('Main -> constructor')
    }

    create(){
        console.log('Main - create');
        const random = (min, max) =>
            Math.floor(Math.random() * (max - min) + min);

        this.game.stage.backgroundColor = 0xebebeb;
        ['New Game', 'Load Game'].forEach(state => {

            let text = this.game.add.text(
                random(0, this.game.world.width),
                random(0, this.game.world.height),
                state
            );
            text.anchor.set(0.5, 0,5);
            text.inputEnabled = true;
            text.input.enableDrag();
            text.events.onInputUp.add(() => this.game.state.start(state), this);
        })
    }


}