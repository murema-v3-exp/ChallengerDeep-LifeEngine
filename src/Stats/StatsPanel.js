const PopulationChart = require("./Charts/PopulationChart");
const SpeciesChart = require("./Charts/SpeciesChart");
const MutationChart = require("./Charts/MutationChart");
const CellsChart = require("./Charts/CellsChart");
const SpeciesPopulationChart = require("./Charts/SpeciesPopulationChart");
const BirthsDeathsChart = require("./Charts/BirthsDeathsChart");
const SpeciationChart = require("./Charts/SpeciationChart");
const DiversityChart = require("./Charts/DiversityChart");
const SpeciesLifespanChart = require("./Charts/SpeciesLifespanChart");
const DominantSpeciesChart = require("./Charts/DominantSpeciesChart");
const FoodChart = require("./Charts/FoodChart");
const LifeHistoryChart = require("./Charts/LifeHistoryChart");
const LifeHistorySuccessChart = require("./Charts/LifeHistorySuccessChart");
const SeasonalChart = require("./Charts/SeasonalChart");
const FossilRecord = require("./FossilRecord");
const SeasonStats = require("./SeasonStats");


// order must match the options in #chart-option
const ChartSelections = [PopulationChart, SpeciesChart, CellsChart, MutationChart, SpeciesPopulationChart,
    BirthsDeathsChart, SpeciationChart, DiversityChart, SpeciesLifespanChart, DominantSpeciesChart,
    FoodChart, LifeHistoryChart, LifeHistorySuccessChart, SeasonalChart];

class StatsPanel {
    constructor(env) {
        this.defineControls();
        this.chart_selection = 0;
        this.setChart();
        this.env = env;
        this.last_reset_count=env.reset_count;
        this.season_stats_drawn = null;
    }

    setChart(selection=this.chart_selection) {
        this.chart_controller = new ChartSelections[selection]();
        this.chart_controller.setData();
        this.chart_controller.render();
    }

    startAutoRender() {
        this.setChart();
        this.render_loop = setInterval(function(){this.updateChart();}.bind(this), 1000);
    }

    stopAutoRender() {
        clearInterval(this.render_loop);
    }

    defineControls() {
        $('#chart-option').change ( function() {
            this.chart_selection = $("#chart-option")[0].selectedIndex;
            this.setChart();
        }.bind(this));
        $('#download-season-stats').click(function() {
            let blob = new Blob([SeasonStats.toCSV()], {type: 'text/csv'});
            let link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'season_stats.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        });
    }

    // redraws the summer vs winter table, but only when a season has finished
    updateSeasonStats() {
        if (this.season_stats_drawn === SeasonStats.version) return;
        this.season_stats_drawn = SeasonStats.version;
        let t = SeasonStats.totals();
        if (t.summer.periods === 0 && t.winter.periods === 0) {
            $('#season-stats').html('<p>Turn on seasons to collect summer vs winter stats. Totals appear once a full summer and winter have passed.</p>');
            return;
        }
        let f = (n, d=1) => (n === null || n === undefined) ? '–' : Number(n).toFixed(d);
        let row = (label, key, d=1) => '<tr><td>' + label + '</td><td>' + f(t.summer[key], d) + '</td><td>' + f(t.winter[key], d) + '</td></tr>';
        let html = '<table class="season-table" style="border-collapse: collapse;">' +
            '<tr><th style="text-align:left; padding-right:12px;"></th><th style="padding-right:12px;">Summer</th><th>Winter</th></tr>' +
            row('Complete periods', 'periods', 0) +
            row('Average population', 'avg_pop') +
            row('Average population change per period (%)', 'avg_pop_change') +
            row('Lowest population', 'lowest_pop', 0) +
            row('Births per 1000 ticks', 'birth_rate') +
            row('Deaths per 1000 ticks', 'death_rate') +
            row('Speciations per 1000 ticks', 'speciation_rate') +
            row('Extinctions per 1000 ticks (all)', 'extinction_rate') +
            row('Major extinctions per 1000 ticks', 'major_extinction_rate', 2) +
            row('Major extinctions (total)', 'major_extinctions', 0) +
            '</table>';
        if (t.winter_share_major !== null)
            html += '<p>' + f(t.winter_share_major, 0) + '% of major extinctions happened in winter (' +
                t.winter.major_extinctions + ' of ' + (t.winter.major_extinctions + t.summer.major_extinctions) + ').</p>';
        html += '<p style="font-size: smaller;">Major extinctions = species that reached ' + FossilRecord.min_discard +
            ' total members before dying out. Partial periods (cut short by a reset or switching seasons on/off) are left out.</p>';
        $('#season-stats').html(html);
    }

    updateChart() {
        if (this.last_reset_count < this.env.reset_count){
            this.reset()
        }
        this.last_reset_count = this.env.reset_count;
        this.chart_controller.updateData();
        this.chart_controller.render();
    }

    updateDetails() {
        var org_count = this.env.organisms.length;
        $('#org-count').text("Total Population: " + org_count);
        $('#species-count').text("Number of Species: " + FossilRecord.numExtantSpecies());
        let top_species = FossilRecord.getMostPopulousSpecies();
        if (top_species)
            $('#top-species').text("Most Populous Species: \"" + top_species.name + "\" (" + top_species.population + " organisms, " +
                (this.env.total_ticks - top_species.start_tick) + " ticks old, lineage depth " + top_species.generation + ")");
        else    
            $('#top-species').text("Most Populous Species: None");
        $('#largest-org').text("Largest Organism Ever: " + this.env.largest_cell_count + " cells");
        let shannon = FossilRecord.latest('shannon') || 0;
        $('#diversity').text("Species Diversity (Shannon): " + shannon.toFixed(2) + " (≈ " + Math.exp(shannon).toFixed(1) + " effective species)");
        $('#extinct-count').text("Extinct Species Recorded: " + FossilRecord.numExtinctSpecies());
        $('#food-count').text("Food Cells: " + FossilRecord.latest('food_counts'));
        $('#avg-mut').text("Average Mutation Rate: " + Math.round(this.env.averageMutability() * 100) / 100);
        this.updateSeasonStats();
    }

    reset() {
        this.setChart();
    }
    
}

module.exports = StatsPanel;