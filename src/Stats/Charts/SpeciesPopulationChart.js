const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class SpeciesPopulationChart extends ChartController {
    constructor() {
        super("Population by Species",
            "Organisms",
            "Shows the 10 species with the highest peak population in the recorded window. " +
            "Only the 20 largest species are recorded each tick, so smaller species read as 0. " +
            "Click a legend entry to hide/show it.");
        this.num_shown = 10;
        this.hidden = new Set(); // legend toggles, kept across updates
        this.chart.options.legend = {
            cursor: "pointer",
            itemclick: function(e) {
                let name = e.dataSeries.name;
                if (this.hidden.has(name)) this.hidden.delete(name);
                else this.hidden.add(name);
                e.dataSeries.visible = !this.hidden.has(name);
                this.chart.render();
            }.bind(this)
        };
    }

    setData() {
        this.data.length = 0;
        let top = this.topSpecies();
        for (let name of top) {
            let label = FossilRecord.speciesIsExtant(name) ? name : name + " (extinct)";
            this.data.push(this.makeSeries(name, label));
        }
        let other = this.makeSeries("other", "All other species");
        other.color = 'gray';
        other.lineDashType = "dash";
        this.data.push(other);

        for (let i in FossilRecord.tick_record) {
            let t = FossilRecord.tick_record[i];
            let pops = FossilRecord.species_pops[i] || {};
            let shown_total = 0;
            for (let j = 0; j < top.length; j++) {
                let p = pops[top[j]] || 0;
                shown_total += p;
                this.data[j].dataPoints.push({x:t, y:p});
            }
            let rest = Math.max(0, FossilRecord.pop_counts[i] - shown_total);
            this.data[top.length].dataPoints.push({x:t, y:rest});
        }
    }

    // The set of top species changes over time, so rebuild the whole chart each update
    updateData() {
        this.setData();
    }

    makeSeries(name, label) {
        return {
            type: "line",
            markerType: "none",
            showInLegend: true,
            name: name,
            legendText: label,
            visible: !this.hidden.has(name),
            dataPoints: []
        };
    }

    // names of the species with the highest peak population across the record
    topSpecies() {
        let peaks = {};
        for (let pops of FossilRecord.species_pops) {
            for (let name in pops) {
                if (!peaks[name] || pops[name] > peaks[name])
                    peaks[name] = pops[name];
            }
        }
        return Object.keys(peaks)
            .sort((a, b) => peaks[b] - peaks[a])
            .slice(0, this.num_shown);
    }
}

module.exports = SpeciesPopulationChart;
