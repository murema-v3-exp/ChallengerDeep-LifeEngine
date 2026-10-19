const Hyperparams = require("../../Hyperparameters");

// A cell state is used to differentiate type and render the cell
class CellState{
    constructor(name) {
        this.name = name;
        this.color = 'black';
    }

    render(ctx, cell, size) {
        ctx.fillStyle = this.color;
        ctx.fillRect(cell.x, cell.y, size, size);
    }
}

class Empty extends CellState {
    constructor() {
        super('empty');
        this.soil_colour = "brown"
    }
    render(ctx, cell, size){
        ctx.fillStyle = this.color;
        ctx.fillRect(cell.x,cell.y,size,size);
        if(!Hyperparams.soilFertility||!cell.fertility||cell.fertility<=0) return;
        const alpha = Math.min(cell.fertility/Hyperparams.maxFertility,1);
        ctx.globalAlpha = 0.1+0.8*alpha;
        ctx.fillStyle = this.soil_colour;
        ctx.fillRect(cell.x,cell.y,size,size);
        ctx.globalAlpha=1;
    }
}
class Food extends CellState {
    constructor() {
        super('food');
    }
}
class Wall extends CellState {
    constructor() {
        super('wall');
    }
}
class Mouth extends CellState {
    constructor() {
        super('mouth');
    }
}
class Producer extends CellState {
    constructor() {
        super('producer');
    }
}
class Mover extends CellState {
    constructor() {
        super('mover');
    }
}
class Killer extends CellState {
    constructor() {
        super('killer');
    }
}
class Armor extends CellState {
    constructor() {
        super('armor');
    }
}
class Eye extends CellState {
    constructor() {
        super('eye');
        this.slit_color = 'black';
    }
    render(ctx, cell, size) {
        ctx.fillStyle = this.color;
        ctx.fillRect(cell.x, cell.y, size, size);
        if(size <= 1)
            return;
        var half = size/2;
        var x = -(size)/8
        var y = -half;
        var h = size/2 + size/4;
        var w = size/4;
        ctx.translate(cell.x+half, cell.y+half);
        ctx.rotate((cell.cell_owner.getAbsoluteDirection() * 90) * Math.PI / 180);
        ctx.fillStyle = this.slit_color;
        ctx.fillRect(x, y, w, h);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}
class DecayingFood extends CellState {
    constructor() {
        super('decaying_food');
    }
}
class AcidStomach extends CellState{
    constructor(){
        super('acid_stomach');
    }
}

class Seed extends CellState {
    constructor() {super('seed');}
}

const CellStates = {
    empty: new Empty(),
    food: new Food(),
    wall: new Wall(),
    mouth: new Mouth(),
    producer: new Producer(),
    mover: new Mover(),
    killer: new Killer(),
    armor: new Armor(),
    eye: new Eye(),
    decaying_food: new DecayingFood(),
    acid_stomach: new AcidStomach,
    seed: new Seed(),
    defineLists() {
        this.all = [this.empty, this.food, this.wall, this.mouth, this.producer, this.mover, this.killer, this.armor, this.eye,this.decaying_food,this.acid_stomach,this.seed]
        this.living = [this.mouth, this.producer, this.mover, this.killer, this.armor, this.eye, this.acid_stomach,this.seed];
    },
    getRandomName: function() {
        return this.all[Math.floor(Math.random() * this.all.length)].name;
    },
    getRandomLivingType: function() {
        return this.living[Math.floor(Math.random() * this.living.length)];
    }
}

CellStates.defineLists();

module.exports = CellStates;
