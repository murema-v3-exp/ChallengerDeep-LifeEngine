const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class DiversityChart extends ChartController {
    constructor() {
        super("Species Diversity",
            "Shannon Index (H)",
            "Shannon H = -Σ p·ln(p) over species population shares; e^H is the 'effective' number of equally common species. " +
            "Simpson = chance two random organisms belong to different species (0 = one species dominates, near 1 = very even).");
        this.useSecondaryAxis("Simpson Index", 1);
    }

    setData() {
        this.clear();
        this.data.push(this.lineSeries("shannon", "Shannon index (left)", 'purple'));
        this.data.push(this.lineSeries("simpson", "Simpson index (right)", 'orange', true));
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        this.data[0].dataPoints.push({x:t, y:FossilRecord.shannon[i]});
        this.data[1].dataPoints.push({x:t, y:FossilRecord.simpson[i]});
    }
}

module.exports = DiversityChart;
