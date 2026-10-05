const CellStates = require("../../Organism/Cell/CellStates");
const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

const TROPHIC_CELLS = [CellStates.producer, CellStates.mouth, CellStates.killer];

class FoodChart extends ChartController {
    constructor() {
        super("Food & Trophic Structure",
            "Food Cells on Map",
            "Right axis: share of all living cells that are producers (plants), mouths (eaters) or killers (predators). " +
            "Watch for the world shifting between producer-driven and predator-driven phases.");
        this.useSecondaryAxis("% of Living Cells", 100);
    }

    setData() {
        this.clear();
        this.data.push(this.lineSeries("food", "Food cells (left)", 'black'));
        for (let c of TROPHIC_CELLS)
            this.data.push(this.lineSeries(c.name, "% " + c.name + " cells (right)", c.color, true));
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        this.data[0].dataPoints.push({x:t, y:FossilRecord.food_counts[i]});
        let shares = FossilRecord.cell_shares[i] || {};
        for (let j = 0; j < TROPHIC_CELLS.length; j++) {
            let share = shares[TROPHIC_CELLS[j].name];
            this.data[j+1].dataPoints.push({x:t, y:share === undefined ? null : share});
        }
    }
}

module.exports = FoodChart;
