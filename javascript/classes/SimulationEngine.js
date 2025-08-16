/**
 * SimulationEngine class implements the core cellular automaton rules and evolution logic.
 * This class processes each generation of the simulation, applying complex rules that govern
 * cell birth, death, survival, infection, and species competition dynamics.
 */

import { STATE } from '../constants/state.js';

const SPECIES_ACTIVE = [STATE.SPECIES_A, STATE.SPECIES_B, STATE.CONTESTED];

export class SimulationEngine {
    /**
     * Creates a new SimulationEngine instance to process the cellular automaton rules.
     * Links the grid data model with the rule parameters to compute cell evolution.
     * 
     * @param {GridModel} gridModel - The grid model containing cell state data
     * @param {RuleParameters} ruleParams - The parameters controlling simulation behavior
     * 
     * @property {GridModel} gridModel - Reference to the grid for accessing and updating cell states
     * @property {RuleParameters} ruleParams - Reference to parameters that define rule thresholds
     */
    constructor(gridModel, ruleParams) {
        this.gridModel = gridModel;
        this.ruleParams = ruleParams;
    }

    /**
     * Ages a diseased cell and determines if it should die or persist.
     * Diseased cells have a limited lifespan controlled by the tau parameter.
     * 
     * @param {number} index - The 1D array index of the diseased cell
     * @param {Object} params - The current simulation parameters
     * 
     * Disease progression:
     * - Each generation increments the disease age counter
     * - When age reaches tau threshold, the cell dies (becomes empty)
     * - Otherwise, the cell remains diseased for another generation
     * 
     * The tau parameter acts as a time-to-live for infected cells:
     * - Lower tau values: Diseases clear quickly, less spreading
     * - Higher tau values: Diseases persist longer, more contagion potential
     * 
     * This mechanism prevents permanent infection zones and allows
     * populations to recover from disease outbreaks over time.
     */
    ageDiseasedCell(index, params) {
        const grid = this.gridModel;
        const isStale = grid.gAge[index] >= params.tau;
        grid.next[index] = isStale ? STATE.EMPTY : STATE.DISEASED;
        grid.gAge[index] = isStale ? 0 : (grid.gAge[index] + 1) | 0;
    }

    /**
     * Checks if a healthy cell should become infected based on diseased neighbors.
     * Implements both strong and weak infection mechanisms for disease spread.
     * 
     * @param {number} state - The current state of the cell being checked
     * @param {Object} neighbors - Count of each neighbor type (A, B, G, Y)
     * @param {Object} params - The current simulation parameters
     * @returns {boolean} True if the cell should become infected, false otherwise
     * 
     * Infection mechanisms:
     * 
     * 1. Strong infection (istr parameter):
     *    - Any active cell with enough diseased neighbors becomes infected
     *    - Threshold set by istr (strict interaction) parameter
     *    - Affects all cells equally regardless of their strength
     * 
     * 2. Weak infection (iweak parameter):
     *    - Only affects "weak" cells (isolated with ≤1 same-species neighbor)
     *    - Requires fewer diseased neighbors than strong infection
     *    - Simulates vulnerability of isolated individuals
     * 
     * Only living cells (Species A, B, or Contested) can be infected.
     * Empty and already diseased cells are immune to infection.
     * 
     * This dual-threshold system creates realistic disease dynamics where:
     * - Dense populations resist disease better (herd immunity)
     * - Isolated cells are more vulnerable (lack of support)
     * - Disease spreads in waves through populations
     */
    checkInfection(state, neighbors, params) {
        if (!SPECIES_ACTIVE.includes(state)) {
            return false;
        }

        const isWeak = this.isWeakCell(state, neighbors);
        const strongInfection = neighbors.G >= params.istr;
        const weakInfection = params.iweak > 0 && neighbors.G >= params.iweak && isWeak;

        return strongInfection || weakInfection;
    }

    /**
     * Resolves the fate of contested cells based on neighboring species dominance.
     * Contested cells represent disputed territory that can be claimed by either species.
     * 
     * @param {number} index - The 1D array index of the contested cell
     * @param {Object} neighbors - Raw neighbor counts (A, B, G, Y)
     * @param {number} SA - Effective Species A strength (includes contested boost)
     * @param {number} SB - Effective Species B strength (includes contested boost)
     * @param {Object} params - The current simulation parameters
     * 
     * Resolution rules:
     * 
     * 1. Species A claims: If SA ≥ cmin AND SA - SB ≥ marg
     *    - Species A has minimum presence (cmin)
     *    - Species A advantage exceeds margin (marg)
     * 
     * 2. Species B claims: If SB ≥ cmin AND SB - SA ≥ marg
     *    - Species B has minimum presence (cmin)
     *    - Species B advantage exceeds margin (marg)
     * 
     * 3. Decay to empty: If insufficient neighbors OR age ≥ ydec
     *    - Too few total neighbors (isolation)
     *    - Contested too long without resolution (ydec threshold)
     * 
     * 4. Remain contested: Otherwise
     *    - Neither species has clear dominance
     *    - Continues aging toward eventual decay
     * 
     * Parameters:
     * - cmin: Minimum cell count for territory claim
     * - marg: Required advantage margin for victory
     * - ydec: Maximum generations in contested state
     * 
     * This creates dynamic border regions where species compete for territory.
     */
    handleContestedCell(index, neighbors, SA, SB, params) {
        const grid = this.gridModel;

        if ((SA >= params.cmin) && (SA - SB >= params.marg)) {
            grid.next[index] = STATE.SPECIES_A;
        } else if ((SB >= params.cmin) && (SB - SA >= params.marg)) {
            grid.next[index] = STATE.SPECIES_B;
        } else if ((neighbors.A + neighbors.B < 2) || (grid.yAge[index] + 1 >= params.ydec)) {
            grid.next[index] = STATE.EMPTY;
            grid.yAge[index] = 0;
        } else {
            grid.next[index] = STATE.CONTESTED;
            grid.yAge[index] = (grid.yAge[index] + 1) | 0;
        }
    }

    /**
     * Determines if an empty cell should give birth to new life.
     * Implements reproduction rules based on neighboring species populations.
     * 
     * @param {number} index - The 1D array index of the empty cell
     * @param {number} SA - Effective Species A strength (includes contested boost)
     * @param {number} SB - Effective Species B strength (includes contested boost)
     * @param {Object} params - The current simulation parameters
     * 
     * Birth outcomes:
     * 
     * 1. Contested birth: Both species meet birth threshold
     *    - Creates disputed territory when both can reproduce
     *    - Represents competition for the same ecological niche
     * 
     * 2. Species A birth: Only Species A meets threshold
     *    - Uncontested reproduction for Species A
     * 
     * 3. Species B birth: Only Species B meets threshold
     *    - Uncontested reproduction for Species B
     * 
     * 4. Remain empty: Neither species meets threshold
     *    - Insufficient neighbors for reproduction
     * 
     * The birth parameter sets the minimum neighbor count for reproduction:
     * - Lower values: Rapid growth, aggressive expansion
     * - Higher values: Slower growth, stable populations
     * 
     * Contested births create interesting dynamics at species boundaries,
     * leading to complex patterns and territorial disputes.
     */
    handleEmptyCell(index, SA, SB, params) {
        const grid = this.gridModel;
        if (SA >= params.birth && SB >= params.birth) {
            grid.next[index] = STATE.CONTESTED;
            grid.yAge[index] = 0;
        } else if (SA >= params.birth && SB < params.birth) {
            grid.next[index] = STATE.SPECIES_A;
        } else if (SB >= params.birth && SA < params.birth) {
            grid.next[index] = STATE.SPECIES_B;
        } else {
            grid.next[index] = STATE.EMPTY;
        }
    }

    /**
     * Processes survival and competition for species cells (A or B).
     * Determines if a living cell survives, dies, or becomes contested.
     * 
     * @param {number} index - The 1D array index of the species cell
     * @param {number} state - Current cell state (SPECIES_A or SPECIES_B)
     * @param {Object} neighbors - Raw neighbor counts (A, B, G, Y)
     * @param {number} SA - Effective Species A strength
     * @param {number} SB - Effective Species B strength
     * @param {Object} params - The current simulation parameters
     * 
     * Survival conditions (all must be met):
     * 1. Same-species neighbors ≥ smin (minimum for survival)
     * 2. Same-species neighbors ≤ smax (maximum before overcrowding)
     * 3. Same-species neighbors < over (overpopulation threshold)
     * 4. Opposite-species neighbors < over (competitive pressure)
     * 
     * Competition check:
     * - If opposite species has sufficient strength (≥ cmin)
     * - AND advantage margin (≥ marg)
     * - Cell becomes contested (territorial dispute)
     * 
     * Outcomes:
     * 1. Contested: Strong opposition challenges territory
     * 2. Survives: All survival conditions met, no strong opposition
     * 3. Dies: Fails survival conditions (becomes empty)
     * 
     * Parameters affecting survival:
     * - smin/smax: Goldilocks zone for population density
     * - over: Death from overcrowding
     * - cmin/marg: Competition thresholds
     * 
     * This creates complex population dynamics with:
     * - Stable colonies in optimal density ranges
     * - Death from isolation or overcrowding
     * - Territorial battles at species boundaries
     */
    handleSpeciesCell(index, state, neighbors, SA, SB, params) {
        const grid = this.gridModel;
        const isSpeciesA = state === STATE.SPECIES_A;

        const nSame = isSpeciesA ? neighbors.A : neighbors.B;
        const nOpp = isSpeciesA ? neighbors.B : neighbors.A;
        const Ssame = isSpeciesA ? SA : SB;
        const Sopp = isSpeciesA ? SB : SA;

        const survives = (nSame >= params.smin && nSame <= params.smax) &&
            (nSame < params.over) && (nOpp < params.over);
        const contested = (Sopp >= params.cmin) && (Sopp - Ssame >= params.marg);

        if (contested) {
            grid.next[index] = STATE.CONTESTED;
            grid.yAge[index] = 0;
        } else if (survives) {
            grid.next[index] = state;
        } else {
            grid.next[index] = STATE.EMPTY;
        }
    }

    /**
     * Determines if a cell is "weak" based on its isolation from same-species neighbors.
     * Weak cells are more vulnerable to disease and other negative effects.
     * 
     * @param {number} state - The current state of the cell
     * @param {Object} neighbors - Count of each neighbor type
     * @returns {boolean} True if the cell is weak/isolated, false otherwise
     * 
     * Weakness criteria by cell type:
     * - Species A: Weak if ≤1 Species A neighbors (isolated red cells)
     * - Species B: Weak if ≤1 Species B neighbors (isolated blue cells)
     * - Contested: Weak if either species has ≤1 neighbors (unstable dispute)
     * - Others: Never considered weak
     * 
     * Weak cells represent:
     * - Isolated individuals without community support
     * - Frontier cells at colony edges
     * - Vulnerable populations susceptible to disease
     * 
     * This concept adds realism by making isolated cells more vulnerable,
     * encouraging clustering behavior and creating natural selection pressure
     * for cells to maintain connections with their species.
     */
    isWeakCell(state, neighbors) {
        if (state === STATE.SPECIES_A) return neighbors.A <= 1;
        if (state === STATE.SPECIES_B) return neighbors.B <= 1;
        if (state === STATE.CONTESTED) return Math.min(neighbors.A, neighbors.B) <= 1;
        return false;
    }

    /**
     * Executes one generation step of the cellular automaton simulation.
     * Processes all cells according to the rule system and advances the grid state.
     * 
     * The step process:
     * 1. Retrieves current parameter values from rule settings
     * 2. Iterates through every cell in the grid
     * 3. Applies rules to determine each cell's next state
     * 4. Swaps the current and next grid buffers
     * 
     * Double buffering technique:
     * - Current state read from grid.grid
     * - Next state written to grid.next
     * - Buffers swapped at end to avoid read/write conflicts
     * - Ensures all cells update simultaneously (synchronous CA)
     * 
     * This method is called:
     * - Automatically by AnimationController during playback
     * - Manually when user clicks step button
     * - By any system needing to advance the simulation
     * 
     * The synchronous update ensures that all cells see the same
     * neighborhood state when computing their next state, which is
     * essential for proper cellular automaton behavior.
     */
    step() {
        const params = this.ruleParams.getValues();
        const grid = this.gridModel;

        for (let column = 0; column < grid.rows; column++) {
            for (let row = 0; row < grid.columns; row++) {
                this.updateCell(row, column, params);
            }
        }

        // Swap buffers
        const temp = grid.grid;
        grid.grid = grid.next;
        grid.next = temp;
    }

    /**
     * Updates a single cell according to the cellular automaton rules.
     * Applies the complete rule hierarchy to determine the cell's next state.
     * 
     * @param {number} column - The x coordinate of the cell
     * @param {number} row - The y coordinate of the cell
     * @param {Object} params - The current simulation parameters
     * 
     * Rule evaluation hierarchy (in order of precedence):
     * 
     * 1. **Infection Check** - Highest priority
     *    - Living cells near disease become infected
     *    - Overrides all other state transitions
     * 
     * 2. **Disease Progression** - For diseased cells
     *    - Ages the disease, potentially clearing it
     *    - Diseased cells cannot transition to other states
     * 
     * 3. **Birth Rules** - For empty cells
     *    - Determines if new life should spawn
     *    - Can create new species cells or contested zones
     * 
     * 4. **Survival Rules** - For species cells
     *    - Checks survival conditions
     *    - Handles competition and territorial disputes
     * 
     * 5. **Contest Resolution** - For contested cells
     *    - Resolves territorial disputes
     *    - Can award territory or decay to empty
     * 
     * Effective strength calculation:
     * - SA = A neighbors + 0.5 × Y × A (contested cells boost by 50%)
     * - SB = B neighbors + 0.5 × Y × B (contested cells boost by 50%)
     * 
     * This boost represents contested cells lending partial support
     * to both species, creating interesting dynamics at boundaries.
     * 
     * The rule hierarchy ensures consistent behavior and prevents
     * conflicting state transitions. Disease takes precedence to
     * model its disruptive effect on populations.
     */
    updateCell(column, row, params) {
        const grid = this.gridModel;
        const index = grid.idx(column, row);
        const state = grid.grid[index];
        const neighbors = grid.getNeighborCounts(column, row);

        // 1 Check for infection
        if (this.checkInfection(state, neighbors, params)) {
            grid.next[index] = STATE.DISEASED;
            grid.gAge[index] = 0;
            return;
        }

        // 2 If currently diseased, age the cell
        if (state === STATE.DISEASED) {
            return this.ageDiseasedCell(index, params);
        }

        // Calculate effective counts
        // contested cells bolster each neighbor by an additional 0.5
        const SA = neighbors.A + 0.5 * neighbors.Y * neighbors.A;
        const SB = neighbors.B + 0.5 * neighbors.Y * neighbors.B;

        // 3 For empty cells, determine species birth
        if (state === STATE.EMPTY) {
            return this.handleEmptyCell(index, SA, SB, params);
        }

        // 4 For occupied cells, determine survival
        if (state === STATE.SPECIES_A || state === STATE.SPECIES_B) {
            return this.handleSpeciesCell(index, state, neighbors, SA, SB, params);
        }

        // 5 Resolve contested cells
        if (state === STATE.CONTESTED) {
            return this.handleContestedCell(index, neighbors, SA, SB, params);
        }

        // Fallback to empty
        grid.next[index] = STATE.EMPTY;
    }
}
