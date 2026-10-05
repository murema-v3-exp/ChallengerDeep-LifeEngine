const CellStates = require("../Organism/Cell/CellStates");
const SerializeHelper = require("../Utils/SerializeHelper");
const Species = require("./Species");

// parallel arrays sampled every data update, and the value used to pad saves that predate them
const RECORD_KEYS = {
    tick_record: null,
    pop_counts: null,
    species_counts: null,
    av_mut_rates: null,
    av_cells: null,
    av_cell_counts: {},
    species_pops: {},
    birth_rates: null,          // per 100 ticks
    death_rates: null,          // per 100 ticks
    speciation_rates: null,     // per 100 ticks
    extinction_rates: null,     // per 100 ticks
    shannon: null,
    simpson: null,
    dominant_names: null,
    dominant_ages: null,
    dominant_generations: null,
    food_counts: null,
    cell_shares: {},            // % of all living cells of each type
    av_death_ages: null,        // avg age of organisms that died since the last sample
    av_offspring: null,         // avg offspring of organisms that died since the last sample
};

const FossilRecord = {
    init: function(){
        this.extant_species = {};
        this.extinct_species = new Map(); // name -> summary object, oldest first

        // if an organism has fewer than this cumulative pop, discard them on extinction
        this.min_discard = 10;

        // keep at most this many extinct species, dropping the oldest
        this.extinct_record_limit = 5000;

        this.record_size_limit = 500; // store this many data points

        // only the most populous species are recorded each tick, to bound memory use
        this.species_pop_record_limit = 20;
    },

    setEnv: function(env) {
        this.env = env;
        this.setData();
    },

    addSpecies: function(org, ancestor) {
        var new_species = new Species(org.anatomy, ancestor, this.env.total_ticks);
        this.extant_species[new_species.name] = new_species;
        org.species = new_species;
        this.interval_speciations++;
        return new_species;
    },

    addSpeciesObj: function(species) {
        if (this.extant_species[species.name]) {
            console.warn('Tried to add already existing species. Add failed.');
            return;
        }
        this.extant_species[species.name] = species;
        return species;
    },

    changeSpeciesName: function(species, new_name) {
        if (this.extant_species[new_name]) {
            console.warn('Tried to change species name to an existing species name. Change failed.');
            return;
        }
        delete this.extant_species[species.name];
        species.name = new_name;
        this.extant_species[new_name] = species;
    },

    numExtantSpecies() {return Object.values(this.extant_species).length},
    numExtinctSpecies() {return this.extinct_species.size},
    speciesIsExtant(species_name) {return !!this.extant_species[species_name]},

    fossilize: function(species) {
        if (!this.extant_species[species.name]) {
            console.warn('Tried to fossilize non existing species.');
            return false;
        }
        species.end_tick = this.env.total_ticks;
        species.ancestor = undefined; // garbage collect ancestors
        delete this.extant_species[species.name];
        this.interval_extinctions++;
        if (species.cumulative_pop >= this.min_discard) {
            // store a lightweight summary rather than the species (and its anatomy)
            this.extinct_species.delete(species.name);
            this.extinct_species.set(species.name, species.summarize());
            if (this.extinct_species.size > this.extinct_record_limit)
                this.extinct_species.delete(this.extinct_species.keys().next().value);
            return true;
        }
        return false;
    },

    resurrect: function(species) {
        if (species.extinct) {
            species.extinct = false;
            this.extant_species[species.name] = species;
            this.extinct_species.delete(species.name);
        }
    },

    recordBirth() {
        this.interval_births++;
    },

    recordDeath(org) {
        this.interval_deaths++;
        this.interval_death_age_sum += org.lifetime;
        this.interval_offspring_sum += org.num_offspring;
    },

    resetIntervalCounters() {
        this.interval_births = 0;
        this.interval_deaths = 0;
        this.interval_speciations = 0;
        this.interval_extinctions = 0;
        this.interval_death_age_sum = 0;
        this.interval_offspring_sum = 0;
        this.last_sample_tick = this.env ? this.env.total_ticks : 0;
    },

    setData() {
        for (let key in RECORD_KEYS)
            this[key] = [];
        this.resetIntervalCounters();
        this.updateData();
    },

    updateData() {
        var tick = this.env.total_ticks;
        this.tick_record.push(tick);
        this.pop_counts.push(this.env.organisms.length);
        this.species_counts.push(this.numExtantSpecies());
        this.av_mut_rates.push(this.env.averageMutability());
        this.calcCellCountAverages();
        this.recordSpeciesPopulations();
        this.recordIntervalRates(tick);
        this.recordDiversity();
        this.recordDominantSpecies(tick);
        this.recordFoodAndCellShares();
        while (this.tick_record.length > this.record_size_limit) {
            for (let key in RECORD_KEYS)
                this[key].shift();
        }
    },

    recordIntervalRates(tick) {
        let dt = tick - this.last_sample_tick;
        let per100 = (count) => dt > 0 ? count / dt * 100 : 0;
        this.birth_rates.push(per100(this.interval_births));
        this.death_rates.push(per100(this.interval_deaths));
        this.speciation_rates.push(per100(this.interval_speciations));
        this.extinction_rates.push(per100(this.interval_extinctions));
        let deaths = this.interval_deaths;
        this.av_death_ages.push(deaths > 0 ? this.interval_death_age_sum / deaths : null);
        this.av_offspring.push(deaths > 0 ? this.interval_offspring_sum / deaths : null);
        this.resetIntervalCounters();
    },

    recordDiversity() {
        let total = 0;
        let species = Object.values(this.extant_species);
        for (let s of species)
            total += s.population;
        let shannon = 0, sum_sq = 0;
        if (total > 0) {
            for (let s of species) {
                if (s.population <= 0) continue;
                let p = s.population / total;
                shannon -= p * Math.log(p);
                sum_sq += p * p;
            }
        }
        this.shannon.push(shannon);
        this.simpson.push(total > 0 ? 1 - sum_sq : 0);
    },

    recordDominantSpecies(tick) {
        let s = this.getMostPopulousSpecies();
        this.dominant_names.push(s ? s.name : null);
        this.dominant_ages.push(s ? tick - s.start_tick : null);
        this.dominant_generations.push(s ? s.generation : null);
    },

    recordFoodAndCellShares() {
        let food = 0;
        for (let col of this.env.grid_map.grid) {
            for (let cell of col) {
                if (cell.state === CellStates.food) food++;
            }
        }
        this.food_counts.push(food);

        let counts = {};
        let total = 0;
        for (let c of CellStates.living)
            counts[c.name] = 0;
        for (let s of Object.values(this.extant_species)) {
            for (let name in s.cell_counts) {
                let n = s.cell_counts[name] * s.population;
                counts[name] += n;
                total += n;
            }
        }
        for (let name in counts)
            counts[name] = total > 0 ? counts[name] / total * 100 : 0;
        this.cell_shares.push(counts);
    },

    recordSpeciesPopulations() {
        let top = Object.values(this.extant_species)
            .sort((a, b) => b.population - a.population)
            .slice(0, this.species_pop_record_limit);
        let pops = {};
        for (let s of top) {
            pops[s.name] = s.population;
        }
        this.species_pops.push(pops);
    },

    calcCellCountAverages() {
        var total_org = 0;
        var cell_counts = {};
        for (let c of CellStates.living) {
            cell_counts[c.name] = 0;
        }
        var first=true;
        for (let s of Object.values(this.extant_species)) {
            if (!first && this.numExtantSpecies() > 10 && s.cumulative_pop < this.min_discard){
                continue;
            }
            for (let name in s.cell_counts) {
                cell_counts[name] += s.cell_counts[name] * s.population;
            }
            total_org += s.population;
            first=false;
        }
        if (total_org == 0) {
            this.av_cells.push(0);
            this.av_cell_counts.push(cell_counts);
            return;
        }

        var total_cells = 0;
        for (let c in cell_counts) {
            total_cells += cell_counts[c];
            cell_counts[c] /= total_org;
        }
        this.av_cells.push(total_cells / total_org);
        this.av_cell_counts.push(cell_counts);
    },

    getMostPopulousSpecies(){
        var max_pop = 0;
        var max_species = undefined;
        for (let s of Object.values(this.extant_species)) {
            if (s.population > max_pop) {
                max_pop = s.population;
                max_species = s;
            }
        }
        return max_species;
    },

    latest(key) {
        return this[key][this[key].length - 1];
    },

    clear_record() {
        this.extant_species = {};
        this.extinct_species = new Map();
        this.setData();
    },

    serialize() {
        this.updateData();
        let record = SerializeHelper.copyNonObjects(this);
        record.records = {};
        for (let key in RECORD_KEYS)
            record.records[key] = this[key];
        let species = {};
        for (let s of Object.values(this.extant_species)) {
            species[s.name] = SerializeHelper.copyNonObjects(s);
            delete species[s.name].name; // the name will be used as the key, so remove it from the value
        }
        record.species = species;
        record.extinct_species = Array.from(this.extinct_species.values());
        return record;
    },

    loadRaw(record) {
        SerializeHelper.overwriteNonObjects(record, this);
        for (let key in record.records) {
            this[key] = record.records[key];
        }
        // saves made before a statistic was recorded won't have it, so pad it out
        for (let key in RECORD_KEYS) {
            if (!record.records[key])
                this[key] = this.tick_record.map(() => RECORD_KEYS[key] === null ? null : {});
        }
        this.extinct_species = new Map();
        for (let s of record.extinct_species || [])
            this.extinct_species.set(s.name, s);
    }

}

FossilRecord.init();

module.exports = FossilRecord;
