const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class LifeHistorySuccessChart extends ChartController {
    constructor() {
        super("Reproduction vs. Species Success");
        this.chart.options.axisX.title = "Avg. Offspring per Organism";
        this.chart.options.axisY = {title: "Peak Population (log scale)", logarithmic: true};
        this.min_deaths = 5; // species need this many dead members for a meaningful average
    }

    setData() {
        this.clear();
        let extinct = this.scatterSeries("extinct", "Extinct species", 'gray');
        let extant = this.scatterSeries("extant", "Living species", 'blue');
        let points = [];
        for (let s of FossilRecord.extinct_species.values()) {
            if (s.deaths >= this.min_deaths)
                points.push([extinct, s.name, s.av_offspring, s.peak_pop, s.av_death_age]);
        }
        for (let s of Object.values(FossilRecord.extant_species)) {
            if (s.deaths >= this.min_deaths) {
                let peak = Math.max(s.peak_pop || 0, s.population);
                points.push([extant, s.name, s.total_offspring / s.deaths, peak, s.total_death_age / s.deaths]);
            }
        }
        for (let [series, name, offspring, peak, age] of points) {
            series.dataPoints.push({
                x: Math.round(offspring * 100) / 100,
                y: peak,
                species: name,
                age: Math.round(age)
            });
        }
        this.data.push(extinct, extant);
        this.updateNote(points);
    }

    // points summarise every species, so rebuild rather than appending
    updateData() {
        this.setData();
    }

    setMinimum() {
        this.chart.options.axisX.minimum = 0;
    }

    scatterSeries(name, legend_text, color) {
        return {
            type: "scatter",
            markerSize: 5,
            color: color,
            showInLegend: true,
            name: name,
            legendText: legend_text,
            toolTipContent: "{species}: peak {y}, {x} offspring/organism, avg. age at death {age} ticks",
            dataPoints: []
        };
    }

    updateNote(points) {
        let text = "Each dot is a species with at least " + this.min_deaths + " dead members. ";
        if (points.length >= 3) {
            let log_peaks = points.map(p => Math.log10(p[3]));
            let r_off = pearson(points.map(p => p[2]), log_peaks);
            let r_age = pearson(points.map(p => p[4]), log_peaks);
            text += "Correlation with log peak population (n = " + points.length + "): " +
                "offspring r = " + fmt(r_off) + ", age at death r = " + fmt(r_age) + ". " +
                "r near +1 means species that reproduce more / live longer tend to grow larger.";
        }
        else {
            text += "Not enough species yet to compute correlations.";
        }
        $('#chart-note').text(text);
    }
}

function pearson(xs, ys) {
    let n = xs.length;
    let mx = xs.reduce((a, b) => a + b, 0) / n;
    let my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
        sxy += (xs[i] - mx) * (ys[i] - my);
        sxx += (xs[i] - mx) ** 2;
        syy += (ys[i] - my) ** 2;
    }
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
}

function fmt(r) {
    return isNaN(r) ? "n/a" : r.toFixed(2);
}

module.exports = LifeHistorySuccessChart;
