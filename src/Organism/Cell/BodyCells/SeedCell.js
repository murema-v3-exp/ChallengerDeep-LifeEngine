const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class SeedCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.seed, org, loc_col, loc_row);
        this.org.anatomy.has_seed = true;
    }
}

module.exports = SeedCell