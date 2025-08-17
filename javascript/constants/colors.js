import { STATE } from './state.js';

export let COLORS = {
    [STATE.EMPTY]: '#000000',
    [STATE.SPECIES_A]: '#e74c3c',
    [STATE.SPECIES_B]: '#3498db',
    [STATE.DISEASED]: '#2ecc71',
    [STATE.CONTESTED]: '#f1c40f'
};

/**
 * Updates the color for a specific state
 * @param {number} state - The state to update (from STATE constants)
 * @param {string} color - The new color in hex format
 */
export function updateColor(state, color) {
    COLORS[state] = color;
    
    // Save to localStorage
    localStorage.setItem('cellColors', JSON.stringify(COLORS));
    
    // Update CSS variables for legend
    updateCSSColors();
}

/**
 * Loads colors from localStorage if available
 */
export function loadColors() {
    const saved = localStorage.getItem('cellColors');
    if (saved) {
        try {
            const savedColors = JSON.parse(saved);
            // Only update non-empty colors
            Object.keys(savedColors).forEach((key) => {
                if (key !== String(STATE.EMPTY)) {
                    COLORS[key] = savedColors[key];
                }
            });
            updateCSSColors();
        } catch (e) {
            console.error('Failed to load saved colors:', e);
        }
    }
}

/**
 * Updates CSS custom properties for legend display
 */
function updateCSSColors() {
    const root = document.documentElement;
    root.style.setProperty('--color-empty', COLORS[STATE.EMPTY]);
    root.style.setProperty('--color-species-a', COLORS[STATE.SPECIES_A]);
    root.style.setProperty('--color-species-b', COLORS[STATE.SPECIES_B]);
    root.style.setProperty('--color-diseased', COLORS[STATE.DISEASED]);
    root.style.setProperty('--color-contested', COLORS[STATE.CONTESTED]);
}

/**
 * Resets colors to defaults
 */
export function resetColors() {
    COLORS = {
        [STATE.EMPTY]: '#000000',
        [STATE.SPECIES_A]: '#e74c3c',
        [STATE.SPECIES_B]: '#3498db',
        [STATE.DISEASED]: '#2ecc71',
        [STATE.CONTESTED]: '#f1c40f'
    };
    localStorage.removeItem('cellColors');
    updateCSSColors();
}
