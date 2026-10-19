const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class DominantSpeciesChart extends ChartController {
    constructor() {
        super("Dominant Species",
            "Age of Dominant Species (Ticks)");
        this.useSecondaryAxis("Lineage Depth (Speciation Events)");
    }

    setData() {
        this.clear();
        let age = this.lineSeries("age", "Age of most populous species (left)", 'black');
        age.toolTipContent = "{species}: {y} ticks old";
        let gen = this.lineSeries("generation", "Lineage depth of most populous species (right)", 'teal', true);
        gen.toolTipContent = "{species}: {y} speciation events from the origin";
        this.data.push(age, gen);
        this.addAllDataPoints();
        this.updateNote();
    }

    updateData() {
        super.updateData();
        this.updateNote();
    }

    addDataPoint(i) {
        var t = FossilRecord.tick_record[i];
        var name = FossilRecord.dominant_names[i];
        this.data[0].dataPoints.push({x:t, y:FossilRecord.dominant_ages[i], species:name});
        this.data[1].dataPoints.push({x:t, y:FossilRecord.dominant_generations[i], species:name});
    }

    updateNote() {
        let changes = 0;
        let names = FossilRecord.dominant_names;
        for (let i = 1; i < names.length; i++) {
            if (names[i] && names[i-1] && names[i] !== names[i-1]) changes++;
        }
        $('#chart-note').text("The most populous species changed " + changes + " times in the recorded window. " +
            "A drop in age means a new species took the lead; rising lineage depth means the leaders are descendants of earlier leaders.");
    }
}

module.exports = DominantSpeciesChart;
