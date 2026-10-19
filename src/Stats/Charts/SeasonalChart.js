const SeasonStats = require("../SeasonStats");
const ChartController = require("./ChartController");

const COLORS = {summer: '#e69500', winter: 'steelblue'};

// One bar per completed summer or winter: how many major extinctions it had,
// with the lowest population in that period as a line on the right axis.
class SeasonalChart extends ChartController {
    constructor() {
        super("Summer vs Winter", "Major Extinctions in Period");
        this.useSecondaryAxis("Lowest Population in Period");
        this.drawn_version = null;
    }

    setData() {
        this.clear();
        this.drawn_version = SeasonStats.version;
        let periods = SeasonStats.completedPeriods();
        let bars = {
            type: "column",
            name: "extinctions",
            showInLegend: false,
            toolTipContent: "{label}: {y} major extinctions, {births} births, {deaths} deaths<br/>population {pop_start} → {pop_end} (lowest {pop_min})",
            dataPoints: []
        };
        let low = this.lineSeries("lowest", "Lowest population (right)", 'black', true);
        low.markerType = "circle";
        low.markerSize = 4;
        for (let p of periods) {
            let mid = (p.start_tick + p.end_tick) / 2;
            bars.dataPoints.push({
                x: mid,
                y: p.major_extinctions,
                color: COLORS[p.season],
                label: p.season + " " + p.number + (p.partial ? " (partial)" : ""),
                births: p.births, deaths: p.deaths,
                pop_start: p.pop_start, pop_end: p.pop_end, pop_min: p.pop_min,
            });
            low.dataPoints.push({x: mid, y: p.pop_min});
        }
        this.data.push(bars);
        this.data.push(low);
        this.updateNote(periods.length);
    }

    // rebuild only when a period has finished
    updateData() {
        if (this.drawn_version !== SeasonStats.version)
            this.setData();
    }

    setMinimum() {
        this.chart.options.axisX.minimum = 0;
    }

    updateNote(n) {
        let text = "Each bar is one finished season: orange = summer, blue = winter. Bar height = major extinctions " +
            "(species that had reached a real population). Black dots = lowest population in that season. ";
        if (n === 0)
            text += "No season has finished yet. Turn seasons on in Evolution Controls.";
        else {
            let t = SeasonStats.totals();
            if (t.winter_share_major !== null)
                text += Math.round(t.winter_share_major) + "% of major extinctions so far were in winter.";
        }
        $('#chart-note').text(text);
    }
}

module.exports = SeasonalChart;
