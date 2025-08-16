/**
 * GridModel class manages the data structure and state of the cellular automaton grid.
 * This class handles the two-dimensional grid of cells, tracking their states and ages,
 * and provides methods for manipulating and querying cell data with toroidal topology.
 */

import { STATE } from '../constants/state.js';

export class GridModel {
    /**
     * Creates a new GridModel instance with specified dimensions and cell size.
     * Initializes the primary grid and auxiliary grids for tracking cell ages.
     * 
     * @param {number} columns - The number of columns in the grid
     * @param {number} rows - The number of rows in the grid
     * @param {number} cellSize - The pixel size of each cell for rendering
     * 
     * @property {number} columns - Width of the grid in cells
     * @property {number} rows - Height of the grid in cells
     * @property {number} cellSize - Size of each cell in pixels for display purposes
     * @property {Uint8Array} grid - Primary grid storing current cell states
     * @property {Uint8Array} next - Buffer grid for computing next generation
     * @property {Uint8Array} gAge - Grid tracking age of diseased cells (generations since infection)
     * @property {Uint8Array} yAge - Grid tracking age of contested cells (generations in contested state)
     */
    constructor(columns, rows, cellSize) {
        this.columns = columns;
        this.rows = rows;
        this.cellSize = cellSize;
        this.initializeGrids();
    }

    /**
     * Initializes all grid arrays with the current dimensions.
     * Creates typed arrays for efficient memory usage and performance.
     * 
     * Arrays created:
     * - grid: Main grid storing cell states (STATE.EMPTY, STATE.SPECIES_A, etc.)
     * - next: Double-buffer for calculating next generation without overwriting current
     * - gAge: Disease age tracker for infected cells (0-255 generations)
     * - yAge: Contested age tracker for disputed territory (0-255 generations)
     * 
     * Uses Uint8Array for memory efficiency, limiting values to 0-255 range.
     */
    initializeGrids() {
        const size = this.columns * this.rows;
        this.grid = new Uint8Array(size);
        this.next = new Uint8Array(size);
        // disease age
        this.gAge = new Uint8Array(size);
        // contested age
        this.yAge = new Uint8Array(size);
    }

    /**
     * Converts 2D grid coordinates to a 1D array index.
     * Used internally to access elements in the flat typed arrays.
     * 
     * @param {number} x - The x coordinate (column) in the grid
     * @param {number} y - The y coordinate (row) in the grid
     * @returns {number} The corresponding index in the 1D array
     * 
     * The formula (y * columns + x) maps 2D coordinates to row-major order.
     * The bitwise OR with 0 ensures integer conversion for performance.
     */
    idx(x, y) {
        return (y * this.columns + x) | 0;
    }

    /**
     * Wraps a coordinate value to implement toroidal (torus) topology.
     * Ensures coordinates wrap around grid edges, creating a seamless surface.
     * 
     * @param {number} x - The coordinate value to wrap
     * @param {number} n - The dimension size (columns or rows) to wrap within
     * @returns {number} The wrapped coordinate within [0, n-1] range
     * 
     * Toroidal topology means:
     * - The left edge connects to the right edge
     * - The top edge connects to the bottom edge
     * - Creates a continuous surface without boundaries
     * 
     * This allows patterns to move off one edge and reappear on the opposite edge.
     */
    wrap(x, n) {
        x %= n;
        return x < 0 ? x + n : x;
    }

    /**
     * Resizes the grid to new dimensions, optionally preserving existing content.
     * Handles both expansion and contraction of the grid while maintaining data integrity.
     * 
     * @param {number} newColumns - The new number of columns for the grid
     * @param {number} newRows - The new number of rows for the grid
     * @param {number} cellSize - The new cell size in pixels
     * @param {boolean} keepContent - Whether to preserve existing cell data (default: false)
     * 
     * When keepContent is true:
     * - Preserves the overlapping region between old and new dimensions
     * - Data outside the new bounds is discarded
     * - New areas are initialized to empty state
     * 
     * When keepContent is false:
     * - All grids are reinitialized to empty state
     * - Provides a clean slate for new patterns
     * 
     * Uses bitwise OR for integer conversion to ensure array indices are valid.
     */
    resize(newColumns, newRows, cellSize, keepContent = false) {
        const oldGrid = this.grid;
        const oldColumns = this.columns;
        const oldRows = this.rows;

        this.columns = newColumns | 0;
        this.rows = newRows | 0;
        this.cellSize = cellSize | 0;

        this.initializeGrids();

        if (keepContent && oldGrid && oldGrid.length) {
            // Copy overlapping region
            const minColumns = Math.min(this.columns, oldColumns);
            const minRows = Math.min(this.rows, oldRows);

            for (let row = 0; row < minRows; row++) {
                for (let column = 0; column < minColumns; column++) {
                    const oldIdx = row * oldColumns + column;
                    const newIdx = this.idx(column, row);
                    this.grid[newIdx] = oldGrid[oldIdx];
                }
            }
        }
    }

    /**
     * Sets the state of a cell at the specified coordinates.
     * Also manages the age counters for diseased and contested cells.
     * 
     * @param {number} column - The x coordinate of the cell
     * @param {number} row - The y coordinate of the cell
     * @param {number} value - The new state value from STATE constants
     * 
     * Age management logic:
     * - When a cell becomes non-diseased, its disease age is reset to 0
     * - When a cell becomes non-contested, its contested age is reset to 0
     * - This ensures age counters only track current state duration
     * 
     * Valid state values are defined in STATE constants:
     * - STATE.EMPTY: No living cell
     * - STATE.SPECIES_A: Red species cell
     * - STATE.SPECIES_B: Blue species cell
     * - STATE.DISEASED: Infected/diseased cell
     * - STATE.CONTESTED: Territory disputed between species
     */
    setCell(column, row, value) {
        const index = this.idx(column, row);
        this.grid[index] = value;

        if (value !== STATE.DISEASED) {
            this.gAge[index] = 0;
        }
        if (value !== STATE.CONTESTED) {
            this.yAge[index] = 0;
        }
    }

    /**
     * Gets the current state of a cell at the specified coordinates.
     * 
     * @param {number} column - The x coordinate of the cell
     * @param {number} row - The y coordinate of the cell
     * @returns {number} The current state value of the cell
     * 
     * Returns one of the STATE constant values representing the cell's condition.
     */
    getCell(column, row) {
        return this.grid[this.idx(column, row)];
    }

    /**
     * Clears all cells in the grid, resetting to empty state.
     * Also resets all age counters to zero.
     * 
     * This method provides a complete reset of the simulation state:
     * - All cells become STATE.EMPTY (value 0)
     * - All disease ages reset to 0
     * - All contested ages reset to 0
     * 
     * Useful for starting fresh simulations or clearing the board.
     */
    clear() {
        this.grid.fill(0);
        this.gAge.fill(0);
        this.yAge.fill(0);
    }

    /**
     * Counts the neighbors of each type surrounding a given cell.
     * Uses Moore neighborhood (8 surrounding cells) with toroidal wrapping.
     * 
     * @param {number} x - The x coordinate of the center cell
     * @param {number} y - The y coordinate of the center cell
     * @returns {Object} An object containing counts for each cell type:
     *   - A: Number of Species A neighbors
     *   - B: Number of Species B neighbors
     *   - G: Number of diseased neighbors (Green/Grey)
     *   - Y: Number of contested neighbors (Yellow)
     * 
     * The Moore neighborhood includes all 8 cells surrounding the center:
     * ```
     * NW  N  NE
     * W  [C]  E
     * SW  S  SE
     * ```
     * 
     * Toroidal wrapping ensures cells at grid edges have 8 neighbors by
     * connecting to cells on the opposite edge of the grid.
     * 
     * This information is critical for applying cellular automaton rules,
     * determining births, deaths, infections, and territorial disputes.
     */
    getNeighborCounts(x, y) {
        let counts = {
            A: 0,
            B: 0,
            G: 0,
            Y: 0
        };

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;

                const nx = this.wrap(x + dx, this.columns);
                const ny = this.wrap(y + dy, this.rows);
                const state = this.grid[this.idx(nx, ny)];

                switch (state) {
                    case STATE.SPECIES_A: counts.A++; break;
                    case STATE.SPECIES_B: counts.B++; break;
                    case STATE.DISEASED: counts.G++; break;
                    case STATE.CONTESTED: counts.Y++; break;
                }
            }
        }

        return counts;
    }
}
