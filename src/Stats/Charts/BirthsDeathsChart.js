const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class BirthsDeathsChart extends ChartController {
    constructor() {
        super("Births & Deaths",
            "Organisms per 100 Ticks",
            "Turnover: a flat population with high births and deaths is constantly replacing itself.");
    }

    setData() {
        this.clear();
        this.data.push(this.lineSeries("births", "Births per 100 ticks", 'green'));
        this.data.push(this.lineSeries("deaths", "Deaths per 100 ticks", 'red'));
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        this.data[0].dataPoints.push({x:t, y:FossilRecord.birth_rates[i]});
        this.data[1].dataPoints.push({x:t, y:FossilRecord.death_rates[i]});
    }
}

module.exports = BirthsDeathsChart;
