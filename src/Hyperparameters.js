const Neighbors = require("./Grid/Neighbors");

const Hyperparams = {
    setDefaults: function() {
        this.lifespanMultiplier = 100;
        this.foodProdProb = 5;
        this.killableNeighbors = Neighbors.adjacent;
        this.edibleNeighbors = Neighbors.adjacent;
        this.growableNeighbors = Neighbors.adjacent;

        this.useGlobalMutability = false;
        this.globalMutability = 5;
        this.addProb = 25;
        this.changeProb = 25;
        this.removeProb = 25;
        this.brainMutationChance = 25;
        this.mutationSymmetryChance = 10;
        
        this.rotationEnabled = true;

        this.foodBlocksReproduction = true;
        this.moversCanProduce = false;

        this.instaKill = false;
        this.dontKillSameSpecies = false;

        this.lookRange = 30;
        this.seeThroughSelf = false;
        this.evolveIndependentEyeDecisions = true;

        this.foodDropProb = 0;

        this.extraMoverFoodCost = 0;

        this.defaultAppetite = 1;
        this.minAppetite = 1;
        this.maxAppetite = 2;
        this.appetiteMutationRate = 0;
        this.appetiteMutationStep = 0.1;

        this.maxOrganisms = -1;

        // Seasons
        this.seasonsEnabled = false;
        this.seasonMode = 'regular';   // 'regular' or 'random'
        this.seasonLength = 4000;      // ticks for one full summer to winter to summer cycle
        this.winterSeverity = 0.8;     // 0 = no change, 1 = no food at all in deep winter

        this.foodDecayTicks = 1000;
        this.foodDecay = false;

        this.soilFertility = false;
        this.decayToFertiliser = 1000;
        this.fertilityPerDecay = 1;
        this.fertilityUsedPerFoodProduced = 1;
        this.maxFertility = 10; 
        this.baseFertility = 5;

    },

    loadJsonObj(obj) {
        Object.assign(this, {defaultAppetite: 1, minAppetite: 1, maxAppetite: 2,
            appetiteMutationRate: 0, appetiteMutationStep: 0.1});
        for (let key in obj) {
            this[key] = obj[key];
        }
    }
}

Hyperparams.setDefaults();

module.exports = Hyperparams;