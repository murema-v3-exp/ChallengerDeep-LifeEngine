// SeasonStats: splits the run into summer and winter periods and counts what
// happens in each one (births, deaths, speciations, extinctions, population).
// It only observes the simulation; it never changes it.
//
// A "summer" is the half of the year with more food, a "winter" the half with less
// (see Seasons.half). Periods cut short by a reset or by switching seasons on/off
// are marked partial and left out of the summer vs winter totals.

const PERIOD_LIMIT = 2000; // keep at most this many periods

const SeasonStats = {
    reset() {
        this.periods = [];   // completed periods, oldest first
        this.current = null; // the period in progress
        this.version = (this.version || 0) + 1; // bumps on reset and whenever a period completes, so the UI knows to redraw
    },

    // called once at the start of every tick, after the seasons have updated
    update(env) {
        let half = env.seasons.half; // 'summer', 'winter' or null when seasons are off
        let tick = env.total_ticks;
        let pop = env.organisms.length;

        if (!this.current || this.current.season !== half) {
            if (this.current) {
                // a period that ends because seasons were switched off didn't finish naturally
                this.closeCurrent(tick, pop, half === null);
            }
            if (half) {
                // the very first period after a reset or switching on starts part-way through
                let partial = this.periods.length === 0 || this.periods[this.periods.length-1].season === null;
                this.openPeriod(half, tick, pop, partial);
            }
            else {
                this.current = null;
            }
        }
        if (this.current) {
            let c = this.current;
            c.pop_min = Math.min(c.pop_min, pop);
            c.pop_max = Math.max(c.pop_max, pop);
            c.pop_sum += pop;
            c.samples++;
            c.food_min = Math.min(c.food_min, env.seasons.factor);
        }
    },

    openPeriod(season, tick, pop, partial) {
        let number = 1;
        for (let p of this.periods)
            if (p.season === season) number++;
        this.current = {
            season: season,
            number: number,        // e.g. winter 3
            partial: partial,
            start_tick: tick,
            end_tick: null,
            births: 0,
            deaths: 0,
            speciations: 0,
            extinctions: 0,        // every species that died out, including tiny one-off mutants
            major_extinctions: 0,  // only species that had reached a real population first
            pop_start: pop,
            pop_end: null,
            pop_min: pop,
            pop_max: pop,
            pop_sum: 0,
            samples: 0,
            food_min: 1,           // lowest season food factor reached
        };
    },

    closeCurrent(tick, pop, partial=false) {
        let c = this.current;
        c.end_tick = tick;
        c.pop_end = pop;
        if (partial) c.partial = true;
        this.periods.push(c);
        // remember that seasons were switched off, so the next period counts as partial
        if (partial) this.periods.push({season: null});
        while (this.periods.length > PERIOD_LIMIT)
            this.periods.shift();
        this.current = null;
        this.version++;
    },

    // hooks called from FossilRecord
    recordBirth()     { if (this.current) this.current.births++; },
    recordDeath()     { if (this.current) this.current.deaths++; },
    recordSpeciation(){ if (this.current) this.current.speciations++; },
    recordExtinction(major) {
        if (!this.current) return;
        this.current.extinctions++;
        if (major) this.current.major_extinctions++;
    },

    completedPeriods() {
        return this.periods.filter(p => p.season !== null);
    },

    // summer vs winter totals over complete (non-partial) periods
    totals() {
        let out = {};
        for (let season of ['summer', 'winter']) {
            let ps = this.completedPeriods().filter(p => p.season === season && !p.partial);
            let t = {periods: ps.length, ticks: 0, births: 0, deaths: 0, speciations: 0,
                     extinctions: 0, major_extinctions: 0, pop_sum: 0, samples: 0,
                     pop_change_sum: 0, pop_change_n: 0, lowest_pop: null};
            for (let p of ps) {
                t.ticks += p.end_tick - p.start_tick;
                t.births += p.births;
                t.deaths += p.deaths;
                t.speciations += p.speciations;
                t.extinctions += p.extinctions;
                t.major_extinctions += p.major_extinctions;
                t.pop_sum += p.pop_sum;
                t.samples += p.samples;
                if (p.pop_start > 0) {
                    t.pop_change_sum += (p.pop_end - p.pop_start) / p.pop_start * 100;
                    t.pop_change_n++;
                }
                if (t.lowest_pop === null || p.pop_min < t.lowest_pop)
                    t.lowest_pop = p.pop_min;
            }
            t.avg_pop = t.samples > 0 ? t.pop_sum / t.samples : 0;
            t.avg_pop_change = t.pop_change_n > 0 ? t.pop_change_sum / t.pop_change_n : 0;
            let per1000 = (n) => t.ticks > 0 ? n / t.ticks * 1000 : 0;
            t.birth_rate = per1000(t.births);
            t.death_rate = per1000(t.deaths);
            t.speciation_rate = per1000(t.speciations);
            t.extinction_rate = per1000(t.extinctions);
            t.major_extinction_rate = per1000(t.major_extinctions);
            out[season] = t;
        }
        let all_major = out.summer.major_extinctions + out.winter.major_extinctions;
        out.winter_share_major = all_major > 0 ? out.winter.major_extinctions / all_major * 100 : null;
        let all_ext = out.summer.extinctions + out.winter.extinctions;
        out.winter_share_all = all_ext > 0 ? out.winter.extinctions / all_ext * 100 : null;
        return out;
    },

    toCSV() {
        let cols = ['season', 'number', 'partial', 'start_tick', 'end_tick', 'length_ticks',
                    'births', 'deaths', 'speciations', 'extinctions', 'major_extinctions',
                    'pop_start', 'pop_end', 'pop_change_pct', 'pop_min', 'pop_max', 'avg_pop', 'lowest_food_pct'];
        let rows = [cols.join(',')];
        let ps = this.completedPeriods();
        if (this.current) ps = ps.concat([Object.assign({}, this.current, {partial: true, in_progress: true})]);
        for (let p of ps) {
            let end = p.end_tick === null ? null : p.end_tick;
            let change = (p.pop_start > 0 && p.pop_end !== null) ? ((p.pop_end - p.pop_start) / p.pop_start * 100).toFixed(1) : '';
            rows.push([
                p.season, p.number, p.partial ? (p.in_progress ? 'in progress' : 'yes') : 'no',
                p.start_tick, end === null ? '' : end, end === null ? '' : end - p.start_tick,
                p.births, p.deaths, p.speciations, p.extinctions, p.major_extinctions,
                p.pop_start, p.pop_end === null ? '' : p.pop_end, change, p.pop_min, p.pop_max,
                p.samples > 0 ? (p.pop_sum / p.samples).toFixed(1) : '',
                Math.round(p.food_min * 100),
            ].join(','));
        }
        return rows.join('\n');
    },
};

SeasonStats.reset();

module.exports = SeasonStats;
