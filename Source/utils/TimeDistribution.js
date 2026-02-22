/**
 * Recalculates module percentages and durations based on availability.
 * If a module has no available items, its percentage is redistributed
 * proportionally among the remaining active modules.
 * 
 * @param {Array} modules - Array of { id, type, percentage, target }
 * @param {Function} isAvailableFn - Function(module) => boolean
 * @param {number} totalMinutes - Total session time
 * @returns {Array} - Array of modules with updated 'adjustedPercentage' and 'duration' (seconds)
 */
function distributeTime(modules, isAvailableFn, totalMinutes) {
    // 1. Identification
    const activeModules = [];
    const emptyModules = [];

    modules.forEach(mod => {
        if (isAvailableFn(mod)) {
            activeModules.push({ ...mod });
        } else {
            emptyModules.push({ ...mod });
        }
    });

    // If all empty, return empty (or handle gracefully)
    if (activeModules.length === 0) return [];

    // 2. Redistribution
    // Calculate total weight of active modules
    const currentActiveSum = activeModules.reduce((sum, m) => sum + m.percentage, 0);

    // Calculate weight to redistribute (from empty modules)
    // Actually, we just want to normalize the active modules to sum to 100%
    // NewPercentage = (OldPercentage / CurrentActiveSum) * 100

    const redistributableModules = activeModules.map(mod => {
        const newPct = (mod.percentage / currentActiveSum) * 100;
        return {
            ...mod,
            adjustedPercentage: newPct,
            duration: Math.floor(totalMinutes * 60 * (newPct / 100))
        };
    });

    return redistributableModules;
}

module.exports = { distributeTime };
