const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class MouthCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.mouth, org, loc_col, loc_row);
    }

    performFunction() {
        var env = this.org.env;
        var real_c = this.getRealCol();
        var real_r = this.getRealRow();
        for (var loc of Hyperparams.edibleNeighbors){
            var cell = env.grid_map.cellAt(real_c+loc[0], real_r+loc[1]);
            this.eatNeighbor(cell, env);
            if (this.org.appetite > 1 && cell != null && cell.state == CellStates.producer &&
                cell.owner != null && cell.owner != this.org && cell.owner.living) {
                const probability = Math.min(1, Math.max(0, this.org.appetite - 1));
                if (Math.random() < probability) {
                    this.org.food_collected++;
                    cell.owner.harm();
                }
            }
        }
    }

    eatNeighbor(n_cell, env) {
        if (n_cell == null)
            return;
        if (n_cell.state == CellStates.food||
            (n_cell.state == CellStates.decaying_food && this.org.anatomy.has_acid_stomach)
        ){
            env.changeCell(n_cell.col, n_cell.row, CellStates.empty, null);
            this.org.food_collected++;
        }
    }
}

module.exports = MouthCell;