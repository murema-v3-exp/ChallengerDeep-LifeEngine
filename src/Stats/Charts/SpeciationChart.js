const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class SpeciationChart extends ChartController {
    constructor() {
        super("Speciation & Extinction",
            "Species per 100 Ticks",
            "Spikes in new species mark bursts of diversification; spikes in extinctions mark die-offs.");
    }

    setData() {
        this.clear();
        this.data.push(this.lineSeries("speciation", "New species per 100 ticks", 'blue'));
        this.data.push(this.lineSeries("extinction", "Extinctions per 100 ticks", 'red'));
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        this.data[0].dataPoints.push({x:t, y:FossilRecord.speciation_rates[i]});
        this.data[1].dataPoints.push({x:t, y:FossilRecord.extinction_rates[i]});
    }
}

module.exports = SpeciationChart;
