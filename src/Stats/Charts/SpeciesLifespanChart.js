const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class SpeciesLifespanChart extends ChartController {
    constructor() {
        super("Species Lifespans", "Number of Extinct Species");
        this.chart.options.axisX.title = "Lifespan (Ticks from Origin to Extinction)";
        this.num_bins = 20;
    }

    setData() {
        this.clear();
        let lifespans = Array.from(FossilRecord.extinct_species.values(), s => s.lifespan)
            .filter(l => l >= 0)
            .sort((a, b) => a - b);
        let width = this.binWidth(lifespans.length ? lifespans[lifespans.length-1] : 0);
        let bins = {};
        for (let l of lifespans) {
            let b = Math.floor(l / width);
            bins[b] = (bins[b] || 0) + 1;
        }
        let series = {
            type: "column",
            color: "steelblue",
            showInLegend: false,
            name: "lifespans",
            toolTipContent: "{range} ticks: {y} species",
            dataPoints: []
        };
        let max_bin = lifespans.length ? Math.floor(lifespans[lifespans.length-1] / width) : -1;
        for (let b = 0; b <= max_bin; b++) {
            series.dataPoints.push({
                x: b * width + width / 2,
                y: bins[b] || 0,
                range: (b * width) + "–" + ((b + 1) * width)
            });
        }
        this.data.push(series);
        this.updateNote(lifespans);
    }

    // the histogram summarises all extinct species, so rebuild it rather than appending
    updateData() {
        this.setData();
    }

    setMinimum() {
        this.chart.options.axisX.minimum = 0;
    }

    // a round bin width giving roughly num_bins bins
    binWidth(max) {
        let raw = Math.max(max / this.num_bins, 1);
        let mag = Math.pow(10, Math.floor(Math.log10(raw)));
        for (let m of [1, 2, 5, 10]) {
            if (m * mag >= raw) return m * mag;
        }
    }

    updateNote(lifespans) {
        let n = lifespans.length;
        let text = "Only species that went extinct after reaching " + FossilRecord.min_discard +
            " total members are recorded (up to the most recent " + FossilRecord.extinct_record_limit + "). ";
        if (n > 0) {
            let mean = lifespans.reduce((a, b) => a + b, 0) / n;
            let median = lifespans[Math.floor(n / 2)];
            text += "n = " + n + ", mean = " + Math.round(mean) + " ticks, median = " + median + " ticks. " +
                "A long right tail means most species die young while a few persist.";
        }
        else {
            text += "No species have been recorded as extinct yet.";
        }
        $('#chart-note').text(text);
    }
}

module.exports = SpeciesLifespanChart;
