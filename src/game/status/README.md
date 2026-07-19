# Status Runtime

`StatusRuntime` is the single owner for timed buffs, debuffs, damage-over-time, healing-over-time, movement modifiers, control effects, shields and future passive effects.

Systems should apply statuses by definition ID and read derived values from the runtime rather than adding bespoke timers to actors.
