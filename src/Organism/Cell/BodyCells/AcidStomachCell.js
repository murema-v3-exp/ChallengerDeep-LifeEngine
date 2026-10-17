const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");

class AcidStomachCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.acid_stomach, org, loc_col, loc_row);
        this.org.anatomy.has_acid_stomach = true;
    }

    
}

module.exports = AcidStomachCell;