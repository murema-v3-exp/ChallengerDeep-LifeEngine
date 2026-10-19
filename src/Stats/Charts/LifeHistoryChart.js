const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class LifeHistoryChart extends ChartController {
    constructor() {
        super("Organism Life History",
            "Avg. Age at Death (Ticks)",
            "Averages over the organisms that died since the previous sample. " +
            "Gaps mean nothing died in that interval.");
        this.useSecondaryAxis("Avg. Offspring per Organism");
    }

    setData() {
        this.clear();
        this.data.push(this.lineSeries("age", "Avg. age at death (left)", 'black'));
        this.data.push(this.lineSeries("offspring", "Avg. offspring per organism (right)", 'green', true));
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        this.data[0].dataPoints.push({x:t, y:FossilRecord.av_death_ages[i]});
        this.data[1].dataPoints.push({x:t, y:FossilRecord.av_offspring[i]});
    }
}

module.exports = LifeHistoryChart;
