/**
 * formatTime.js — Shared time-formatting utility.
 *
 * Used by Dashboard.js and SessionView.js (previously duplicated in both).
 *
 * @param {number} seconds - Total seconds to format
 * @returns {string} MM:SS string, e.g. "04:35"
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

module.exports = { formatTime };
