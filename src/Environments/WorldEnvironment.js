const Environment = require('./Environment');
const Renderer = require('../Rendering/Renderer');
const GridMap = require('../Grid/GridMap');
const Organism = require('../Organism/Organism');
const CellStates = require('../Organism/Cell/CellStates');
const EnvironmentController = require('../Controllers/EnvironmentController');
const Hyperparams = require('../Hyperparameters.js');
const FossilRecord = require('../Stats/FossilRecord');
const WorldConfig = require('../WorldConfig');
const SerializeHelper = require('../Utils/SerializeHelper');
const Species = require('../Stats/Species');
const Seasons = require('./Seasons');
const SeasonStats = require('../Stats/SeasonStats');
const MIN_DECAY_RATE=0.25;

class WorldEnvironment extends Environment{
    constructor(engine, cell_size) {
        super();
        this.engine = engine;
        this.renderer = new Renderer('env-canvas', 'env', cell_size);
        this.controller = new EnvironmentController(this, this.renderer.canvas);
        this.num_rows = Math.ceil(this.renderer.height / cell_size);
        this.num_cols = Math.ceil(this.renderer.width / cell_size);
        this.grid_map = new GridMap(this.num_cols, this.num_rows, cell_size);
        this.resetFertility();
        this.organisms = [];
        this.walls = [];
        this.total_mutability = 0;
        this.largest_cell_count = 0;
        this.reset_count = 0;
        this.total_ticks = 0;
        this.data_update_rate = 100;
        this.seasons = new Seasons();
        this.food_queue=[]; // track food that transitions food -> decaying
        this.decay_queue=[]; // track decaying food that transitions decaying food -> empty cell + increase cell fertility
        this.decay_clock=0; //clock changes according to season extending food life in winter.
        FossilRecord.setEnv(this);
    }

    update() {
        this.seasons.update(this.total_ticks);
        this.decay_clock += this.decayRate();
        SeasonStats.update(this);
        var to_remove = [];
        for (var i in this.organisms) {
            var org = this.organisms[i];
            if (!org.living || !org.update()) {
                to_remove.push(i);
            }
        }
        if(Hyperparams.foodDecay)
            this.decayFood();
        if(Hyperparams.soilFertility)
            this.decayingFoodToFertiliser();

        this.removeOrganisms(to_remove);
        if (Hyperparams.foodDropProb > 0) {
            this.generateFood();
        }
        this.total_ticks ++;
        if (this.total_ticks % this.data_update_rate == 0) {
            FossilRecord.updateData();
            this.updateSeasonDisplay();
        }
    }

    updateSeasonDisplay() {
        if (WorldConfig.headless && this.total_ticks % 1000 != 0) return;
        let pct = Math.round(this.seasons.factor * 100);
        $('#season-display').text('Season: ' + this.seasons.name() + ' (food ' + pct + '%)');
    }

    render() {
        if (WorldConfig.headless) {
            this.renderer.cells_to_render.clear();
            return;
        }
        this.renderer.renderCells();
        this.renderer.renderHighlights();
    }

    renderFull() {
        this.renderer.renderFullGrid(this.grid_map.grid);
    }

    removeOrganisms(org_indeces) {
        let start_pop = this.organisms.length;
        for (var i of org_indeces.reverse()){
            this.total_mutability -= this.organisms[i].mutability;
            this.organisms.splice(i, 1);
        }
        if (this.organisms.length === 0 && start_pop > 0) {
            if (WorldConfig.auto_pause)
                $('.pause-button')[0].click();
            else if(WorldConfig.auto_reset) {
                this.reset_count++;
                this.reset(false);
            }
        }
    }

    OriginOfLife() {
        var center = this.grid_map.getCenter();
        var org = new Organism(center[0], center[1], this);
        org.anatomy.addDefaultCell(CellStates.mouth, 0, 0);
        org.anatomy.addDefaultCell(CellStates.producer, 1, 1);
        org.anatomy.addDefaultCell(CellStates.producer, -1, -1);
        this.addOrganism(org);
        FossilRecord.addSpecies(org, null);
    }

    addOrganism(organism) {
        organism.updateGrid();
        this.total_mutability += organism.mutability;
        this.organisms.push(organism);
        if (organism.anatomy.cells.length > this.largest_cell_count) 
            this.largest_cell_count = organism.anatomy.cells.length;
    }

    canAddOrganism() {
        return this.organisms.length < Hyperparams.maxOrganisms || Hyperparams.maxOrganisms < 0;
    }

    averageMutability() {
        if (this.organisms.length < 1)
            return 0;
        if (Hyperparams.useGlobalMutability) {
            return Hyperparams.globalMutability;
        }
        return this.total_mutability / this.organisms.length;
    }

    changeCell(c, r, state, owner) {
        super.changeCell(c, r, state, owner);
        const cell = this.grid_map.cellAt(c, r);
        this.renderer.addToRender(this.grid_map.cellAt(c, r));
        if(state == CellStates.wall)
            this.walls.push(this.grid_map.cellAt(c, r));
        if(Hyperparams.foodDecay && state == CellStates.food){
            cell.food_tick = this.decay_clock;
            this.food_queue.push({cell: cell, tick: this.decay_clock});
        }
        if(Hyperparams.soilFertility && state == CellStates.decaying_food){
            cell.decay_tick = this.decay_clock;
            this.decay_queue.push({cell:cell,tick:this.decay_clock});
        }
            
    }

    clearWalls() {
        for(var wall of this.walls){
            let wcell = this.grid_map.cellAt(wall.col, wall.row);
            if (wcell && wcell.state == CellStates.wall)
                this.changeCell(wall.col, wall.row, CellStates.empty, null);
        }
    }

    clearOrganisms() {
        for (var org of this.organisms)
            org.die();
        this.organisms = [];
    }
    
    clearDeadOrganisms() {
        let to_remove = [];
        for (let i in this.organisms) {
            let org = this.organisms[i];
            if (!org.living)
                to_remove.push(i);
        }
        this.removeOrganisms(to_remove);
    }

    generateFood() {
        var num_food = Math.max(Math.floor(this.grid_map.cols*this.grid_map.rows*Hyperparams.foodDropProb/50000), 1)
        var prob = Hyperparams.foodDropProb * this.seasons.factor;
        for (var i=0; i<num_food; i++) {
            if (Math.random() <= prob){
                var c=Math.floor(Math.random() * this.grid_map.cols);
                var r=Math.floor(Math.random() * this.grid_map.rows);

                if (this.grid_map.cellAt(c, r).state == CellStates.empty){
                    this.changeCell(c, r, CellStates.food, null);
                }
            }
        }
    }

    reset(confirm_reset=true, reset_life=true) {
        if (confirm_reset && !confirm('The current environment will be lost. Proceed?'))
            return false;
        let restart = false;
        if (this.engine.running) {
            this.engine.last_fps = this.engine.fps;
            this.engine.stop();
            restart = true;
        }
        this.organisms = [];
        this.grid_map.fillGrid(CellStates.empty, !WorldConfig.clear_walls_on_reset);
        this.resetFertility();
        this.renderer.renderFullGrid(this.grid_map.grid);
        this.total_mutability = 0;
        this.total_ticks = 0;
        this.decay_clock=0;
        this.largest_cell_count = 0;
        this.seasons.reset();
        SeasonStats.reset();
        this.food_queue =[];
        this.decay_queue =[];
        FossilRecord.clear_record();
        if (reset_life)
            this.OriginOfLife();
        if (restart)
            this.engine.start(this.engine.last_fps);
        return true;
    }

    resizeGridColRow(cell_size, cols, rows) {
        this.renderer.cell_size = cell_size;
        this.renderer.fillShape(rows*cell_size, cols*cell_size);
        this.grid_map.resize(cols, rows, cell_size);
        this.resetFertility();
    }

    resizeFillWindow(cell_size) {
        this.renderer.cell_size = cell_size;
        this.renderer.fillWindow('env');
        this.num_cols = Math.ceil(this.renderer.width / cell_size);
        this.num_rows = Math.ceil(this.renderer.height / cell_size);
        this.grid_map.resize(this.num_cols, this.num_rows, cell_size);
        this.resetFertility();
    }

    serialize() {
        this.clearDeadOrganisms();
        let env = SerializeHelper.copyNonObjects(this);
        env.grid = this.grid_map.serialize();
        env.organisms = [];
        for (let org of this.organisms){
            env.organisms.push(org.serialize());
        }
        env.fossil_record = FossilRecord.serialize();
        env.controls = Hyperparams;
        return env;
    }

    loadRaw(env) { // species name->stats map, evolution controls, 
        this.organisms = [];
        SeasonStats.reset(); // season stats are not saved with worlds
        this.food_queue =[];
        this.decay_queue =[];
        FossilRecord.clear_record();
        let cell_size = env.grid.cell_size ? env.grid.cell_size : this.grid_map.cell_size;
        this.resizeGridColRow(cell_size, env.grid.cols, env.grid.rows)
        this.grid_map.loadRaw(env.grid);
        for (let wall of env.grid.walls) {
            this.walls.push(this.grid_map.cellAt(wall.c, wall.r));
        }
        

        // create species map
        let species = {};
        for (let name in env.fossil_record.species) {
            let s = new Species(null, null, 0);
            SerializeHelper.overwriteNonObjects(env.fossil_record.species[name], s)
            species[name] = s; // the species needs an anatomy obj still
        }

        for (let orgRaw of env.organisms) {
            let org = new Organism(orgRaw.col, orgRaw.row, this);
            org.loadRaw(orgRaw);
            this.addOrganism(org);
            let s = species[orgRaw.species_name];
            if (!s){ // ideally, every organisms species should exists, but there is a bug that misses some species sometimes
                s = new Species(org.anatomy, null, env.total_ticks);
                species[orgRaw.species_name] = s;
            }
            if (!s.anatomy) {
                //if the species doesn't have anatomy we need to initialize it
                s.anatomy = org.anatomy;
                s.calcAnatomyDetails();
            }
            s.name = orgRaw.species_name;
            org.species = s;
        }
        for (let name in species)
            FossilRecord.addSpeciesObj(species[name]);
        FossilRecord.loadRaw(env.fossil_record);
        SerializeHelper.overwriteNonObjects(env, this);
        if ($('#override-controls').is(':checked'))
            Hyperparams.loadJsonObj(env.controls)
        this.resetFertility();

        if(Hyperparams.foodDecay)
            this.rebuildFoodQueue();
        if(Hyperparams.soilFertility){
            this.rebuildDecayQueue();
        }
        this.renderer.renderFullGrid(this.grid_map.grid);
    }
    decayFood(){
        let i = 0;
        while(i<this.food_queue.length){
            const entry = this.food_queue[i];
            const cell = entry.cell;
        if(cell.state!==CellStates.food||cell.food_tick != entry.tick){
            i++;
            continue;
        }
        if(this.decay_clock-entry.tick < Hyperparams.foodDecayTicks){
            break;
        }

        this.changeCell(cell.col,cell.row,CellStates.decaying_food,null);
        i++;

        }
        this.food_queue.splice(0,i);

    }

    rebuildFoodQueue(){
        this.food_queue =[];
        for(const col of this.grid_map.grid){
            for (const cell of col){
                if (cell.state === CellStates.food){
                    cell.food_tick = this.decay_clock;
                    this.food_queue.push({cell: cell, tick: this.decay_clock});
                }
            }
        }
    }

    decayingFoodToFertiliser(){
        let i = 0;
        while(i<this.decay_queue.length){
            const entry = this.decay_queue[i];
            const cell = entry.cell;
        if(cell.state!==CellStates.decaying_food||cell.decay_tick != entry.tick){
            i++;
            continue;
        }
        if(this.decay_clock-entry.tick < Hyperparams.decayToFertiliser){
            break;
        }
        
        cell.fertility = Math.min(Hyperparams.maxFertility,cell.fertility+Hyperparams.fertilityPerDecay);
        this.changeCell(cell.col,cell.row,CellStates.empty,null);
        i++;

        }
        this.decay_queue.splice(0,i);

    }

    rebuildDecayQueue(){
        this.decay_queue =[];
        for(const col of this.grid_map.grid){
            for (const cell of col){
                if (cell.state === CellStates.decaying_food){
                    cell.decay_tick = this.decay_clock;
                    this.decay_queue.push({cell: cell, tick: this.decay_clock});
                }
            }
        }
    }

    resetFertility(){
        for(const col of this.grid_map.grid){
            for(const cell of col){
                cell.fertility = Hyperparams.baseFertility;
            }
        }
    }
    decayRate(){
        return MIN_DECAY_RATE+(1-MIN_DECAY_RATE)*this.seasons.factor;
    }


}

module.exports = WorldEnvironment;

