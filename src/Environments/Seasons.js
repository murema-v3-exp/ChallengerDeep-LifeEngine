const Hyperparams = require('../Hyperparameters');

// Seasons are a repeating cycle that scales how much food the world produces.
// It only changes food production, so any extinction still comes from the organisms themselves.
//
// factor = 1 in peak summer, (1 - winterSeverity) in deep winter.
// Other features (soil, seeds, metabolism) can read env.seasons.factor.

class Seasons {
    constructor() {
        this.reset();
    }

    reset() {
        this.factor = 1;
        this.half = null; // 'summer' (more food) or 'winter' (less food) half of the year; null when off
        // random-mode state: the current half-year swing (summer to winter or winter to summer)
        this.swing_start_tick = 0;
        this.swing_length = this.halfYear();
        this.swing_from = 1;
        this.swing_to = 1 - this.severity();
    }

    halfYear() {
        return Math.max(1, Hyperparams.seasonLength / 2);
    }

    severity() {
        let s = parseFloat(Hyperparams.winterSeverity);
        return Math.min(Math.max(s, 0), 1);
    }

    update(tick) {
        if (!Hyperparams.seasonsEnabled) {
            this.factor = 1;
            this.half = null;
            return;
        }
        if (Hyperparams.seasonMode == 'random')
            this.factor = this.randomFactor(tick);
        else
            this.factor = this.regularFactor(tick);
    }

    // Smooth cosine wave: summer at tick 0, winter halfway through the year.
    regularFactor(tick) {
        let phase = (tick % Hyperparams.seasonLength) / Hyperparams.seasonLength;
        let winterness = (1 - Math.cos(2 * Math.PI * phase)) / 2; // 0 = summer, 1 = winter
        this.half = (phase >= 0.25 && phase < 0.75) ? 'winter' : 'summer';
        return 1 - this.severity() * winterness;
    }

    // Same smooth shape, but each half-year has a random length (50%-150% of normal)
    // and each winter has a random harshness (50%-150% of the set severity, capped at 1).
    randomFactor(tick) {
        let progress = (tick - this.swing_start_tick) / this.swing_length;
        if (progress >= 1 || progress < 0) {
            this.startNextSwing(tick);
            progress = 0;
        }
        let eased = (1 - Math.cos(Math.PI * progress)) / 2;
        // winter is the half of the cycle centred on the lowest point
        let heading_to_winter = this.swing_to < this.swing_from;
        if (heading_to_winter)
            this.half = progress >= 0.5 ? 'winter' : 'summer';
        else
            this.half = progress < 0.5 ? 'winter' : 'summer';
        return this.swing_from + (this.swing_to - this.swing_from) * eased;
    }

    startNextSwing(tick) {
        let was_heading_to_winter = this.swing_to < this.swing_from;
        this.swing_from = this.swing_to;
        if (was_heading_to_winter) {
            this.swing_to = 1; // back to summer
        } else {
            let harshness = this.severity() * (0.5 + Math.random());
            this.swing_to = 1 - Math.min(harshness, 1);
        }
        this.swing_start_tick = tick;
        this.swing_length = Math.max(1, Math.round(this.halfYear() * (0.5 + Math.random())));
    }

    name() {
        if (!Hyperparams.seasonsEnabled) return 'Off';
        let winterness = this.severity() > 0 ? (1 - this.factor) / this.severity() : 0;
        if (winterness < 0.25) return 'Summer';
        if (winterness > 0.75) return 'Winter';
        return 'Changing';
    }
}

module.exports = Seasons;
