const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class ProducerCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.producer, org, loc_col, loc_row);
        this.org.anatomy.is_producer = true;
    }

    performFunction() {
        if (this.org.anatomy.is_mover && !Hyperparams.moversCanProduce)
            return;
        var env = this.org.env;
        var prob = Hyperparams.foodProdProb;
        var real_c = this.getRealCol();
        var real_r = this.getRealRow();
        var loc = Hyperparams.growableNeighbors[Math.floor(Math.random() * Hyperparams.growableNeighbors.length)]
            var loc_c=loc[0];
            var loc_r=loc[1];
            var cell = env.grid_map.cellAt(real_c+loc_c, real_r+loc_r);
            if (cell == null || cell.state != CellStates.empty)return;
        if(Hyperparams.soilFertility){
                    //if(cell.fertility<Hyperparams.fertilityUsedPerFoodProduced) return; // prevents generating food if fertility is less than 1
                    //prob = prob+(prob * (cell.fertility / Hyperparams.maxFertility));
                    prob = prob*(0.5 +1.5* (cell.fertility / Hyperparams.maxFertility));

                }
        if (Math.random() * 100 <= prob) {
            
            if (cell != null && cell.state == CellStates.empty){
                if(Hyperparams.soilFertility){
                    cell.fertility = Math.max(0,cell.fertility - Hyperparams.fertilityUsedPerFoodProduced);// clamp fertility- prevents negative fertility
                }
                    env.changeCell(real_c+loc_c, real_r+loc_r, CellStates.food, null);
                return;
            }
        }
    }
}

module.exports = ProducerCell;
