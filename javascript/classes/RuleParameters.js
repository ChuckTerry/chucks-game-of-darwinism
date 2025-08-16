/**
 * RuleParameters class manages the simulation parameters for the cellular automaton.
 * This class binds HTML range slider inputs to their corresponding display outputs
 * and provides methods to retrieve the current parameter values for the simulation engine.
 */
export class RuleParameters {
    /**
     * Creates a new RuleParameters instance and initializes all parameter sliders.
     */
    constructor() {
        this.setupSliders();
    }

    /**
     * Initializes and binds all simulation parameter sliders to their display elements.
     * Each parameter controls a specific aspect of the cellular automaton's behavior:
     * @property {HTMLElement} BIRTH - Birth threshold
     * Minimum number of neighbors required for a dead cell to become alive (reproduction rule)
     * @property {HTMLElement} Smin - Survival minimum
     * Minimum number of neighbors required for a living cell to survive to the next generation
     * @property {HTMLElement} Smax - Survival maximum
     * Maximum number of neighbors a living cell can have and still survive (prevents overcrowding)
     * @property {HTMLElement} OVER - Overpopulation threshold
     * Number of neighbors above which a cell dies from overcrowding/resource depletion
     * @property {HTMLElement} Cmin - Cell minimum
     * Minimum cell count or density threshold for certain behaviors to activate in the simulation
     * @property {HTMLElement} MARG - Margin parameter
     * Buffer zone or tolerance value used in cell state transitions and boundary conditions
     * @property {HTMLElement} Istrict - Strict interaction range
     * Distance/strength for strong cell-to-cell interactions (immediate neighbors)
     * @property {HTMLElement} Iweak - Weak interaction range
     * Distance/strength for weaker cell-to-cell interactions (extended neighborhood)
     * @property {HTMLElement} TAU - Time constant
     * Controls the speed of state transitions or decay rates in the cellular automaton dynamics
     * @property {HTMLElement} Ydec - Y-axis decay
     * Rate at which influence or effects decay along the vertical axis of the grid
     * @property {HTMLElement} dens - Initial density
     * Percentage of cells that are alive when randomly initializing the grid (0-100%)
     * @property {HTMLElement} gdens - Growth density
     * Target density percentage for cell growth patterns or secondary initialization (0-100%)
     */
    setupSliders() {
        this.BIRTH = this.bindRange('BIRTH', 'BIRTHv');
        this.Smin = this.bindRange('Smin', 'Sminv');
        this.Smax = this.bindRange('Smax', 'Smaxv');
        this.OVER = this.bindRange('OVER', 'OVERv');
        this.Cmin = this.bindRange('Cmin', 'Cminv');
        this.MARG = this.bindRange('MARG', 'MARGv');
        this.Istrict = this.bindRange('Istrict', 'Istrictv');
        this.Iweak = this.bindRange('Iweak', 'Iweakv');
        this.TAU = this.bindRange('TAU', 'TAUv');
        this.Ydec = this.bindRange('Ydec', 'Ydecv');
        this.dens = this.bindRange('dens', 'densv', (v) => v + '%');
        this.gdens = this.bindRange('gdens', 'gdensv', (v) => v + '%');
    }

    /**
     * Binds a range input slider to its corresponding output display element.
     * Creates a two-way synchronization between the slider and its displayed value.
     * 
     * @param {string} id - The HTML ID of the range input element
     * @param {string} outputId - The HTML ID of the output display element
     * @param {Function} formatter - Optional function to format the displayed value (e.g., adding "%" symbol for percentage values)
     * @returns {HTMLElement} The range input element for further reference
     */
    bindRange(id, outputId, formatter = (v) => v) {
        const element = document.getElementById(id);
        const output = document.getElementById(outputId);

        const sync = () => {
            output.textContent = formatter(element.value);
        };

        element.addEventListener('input', sync);
        sync();

        return element;
    }

    /**
     * Retrieves the current values of all simulation parameters.
     * Converts slider values to appropriate data types and scales for the simulation engine.
     * 
     * @returns {Object} An object containing all parameter values:
     *   - birth: Birth threshold for cell reproduction
     *   - smin: Minimum neighbors for survival
     *   - smax: Maximum neighbors for survival  
     *   - over: Overpopulation death threshold
     *   - cmin: Minimum cell count threshold
     *   - marg: Margin/buffer parameter
     *   - istr: Strict interaction strength
     *   - iweak: Weak interaction strength
     *   - tau: Time constant for transitions
     *   - ydec: Vertical decay rate
     *   - density: Initial cell density (0.0 to 1.0)
     *   - gdensity: Growth density target (0.0 to 1.0)
     */
    getValues() {
        return {
            birth: parseInt(this.BIRTH.value, 10),
            smin: parseInt(this.Smin.value, 10),
            smax: parseInt(this.Smax.value, 10),
            over: parseInt(this.OVER.value, 10),
            cmin: parseInt(this.Cmin.value, 10),
            marg: parseInt(this.MARG.value, 10),
            istr: parseInt(this.Istrict.value, 10),
            iweak: parseInt(this.Iweak.value, 10),
            tau: parseInt(this.TAU.value, 10),
            ydec: parseInt(this.Ydec.value, 10),
            density: parseInt(this.dens.value, 10) / 100,
            gdensity: parseInt(this.gdens.value, 10) / 100
        };
    }
}
