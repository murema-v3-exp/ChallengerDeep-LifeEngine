const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class MetabolismChart extends ChartController {
    constructor() {
        super("Mean Mover Metabolism", "Metabolism");
    }

    setData() {
        this.clear();
        this.data.push({
            type: "line",
            markerType: "none",
            color: 'black',
            showInLegend: true,
            name: "metabolism",
            legendText: "Mean metabolism of living movers",
            dataPoints: FossilRecord.metabolism_stats.map(stats => ({x: stats.tick, y: stats.mean}))
        });
    }

    updateData() {
        this.setData();
    }
}

module.exports = MetabolismChart;
