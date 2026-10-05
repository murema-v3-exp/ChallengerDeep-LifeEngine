const CellStates = require("../Organism/Cell/CellStates");
let FossilRecord = undefined; // workaround to a circular dependency problem
const getFossilRecord = () => {
    if (!FossilRecord)
        FossilRecord = require("./FossilRecord");
    return FossilRecord;
}

class Species {
    constructor(anatomy, ancestor, start_tick) {
        this.anatomy = anatomy;
        this.ancestor = ancestor; // eventually need to garbage collect ancestors to avoid memory problems
        this.population = 1;
        this.cumulative_pop = 1;
        this.peak_pop = 1;
        this.start_tick = start_tick;
        this.end_tick = -1;
        this.name = Math.random().toString(36).substr(2, 10);
        this.extinct = false;
        // number of speciation events between this species and the origin of life
        this.generation = ancestor ? (ancestor.generation || 0) + 1 : 0;
        this.ancestor_name = ancestor ? ancestor.name : null;
        // life history of members that have died
        this.deaths = 0;
        this.total_death_age = 0;
        this.total_offspring = 0;
        this.calcAnatomyDetails();
    }

    calcAnatomyDetails() {
        if (!this.anatomy) return;
        var cell_counts = {};
        for (let c of CellStates.living) {
            cell_counts[c.name] = 0;
        }
        for (let cell of this.anatomy.cells) {
            cell_counts[cell.state.name]+=1;
        }
        this.cell_counts=cell_counts;
    }

    addPop() {
        this.population++;
        this.cumulative_pop++;
        if (this.population > (this.peak_pop || 0))
            this.peak_pop = this.population;
    }

    recordDeath(org) {
        this.deaths = (this.deaths || 0) + 1;
        this.total_death_age = (this.total_death_age || 0) + org.lifetime;
        this.total_offspring = (this.total_offspring || 0) + org.num_offspring;
    }

    decreasePop() {
        this.population--;
        if (this.population <= 0) {
            this.extinct = true;
            getFossilRecord().fossilize(this);
        }
    }

    lifespan() {
        return this.end_tick - this.start_tick;
    }

    // plain data kept in the fossil record after extinction
    summarize() {
        return {
            name: this.name,
            start_tick: this.start_tick,
            end_tick: this.end_tick,
            lifespan: this.lifespan(),
            cumulative_pop: this.cumulative_pop,
            peak_pop: this.peak_pop || this.cumulative_pop,
            generation: this.generation || 0,
            ancestor_name: this.ancestor_name || null,
            deaths: this.deaths || 0,
            av_death_age: this.deaths ? this.total_death_age / this.deaths : null,
            av_offspring: this.deaths ? this.total_offspring / this.deaths : null,
        };
    }
}

module.exports = Species;