const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class PopulationChart extends ChartController {
    constructor() {
        super("Population", "Organisms",
            "Right axis (dashed): food production as a % of normal. Dips are winters; it stays at 100% when seasons are off.");
        this.useSecondaryAxis("Food production (% of normal)", 100);
    }

    setData() {
        this.clear();
        this.data.push({
                type: "line",
                markerType: "none",
                color: 'black',
                showInLegend: true, 
                name: "pop1",
                legendText: "Total Population",
                dataPoints: []
            }
        );
        let season = this.lineSeries("season", "Season food production (right)", 'teal', true);
        season.lineDashType = "dash";
        this.data.push(season);
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        var p = FossilRecord.pop_counts[i];
        this.data[0].dataPoints.push({x:t, y:p});
        let s = FossilRecord.season_factors[i];
        this.data[1].dataPoints.push({x:t, y:s === undefined ? null : s});
    }
}

module.exports = PopulationChart;