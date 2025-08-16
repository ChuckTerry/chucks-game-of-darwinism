/**
 * Renderer class handles the visual representation of the cellular automaton grid.
 * This class manages the HTML5 canvas rendering, translating the grid's data model
 * into colored cells that display the current state of the simulation.
 */

import { STATE } from '../constants/state.js';
import { COLORS } from '../constants/colors.js';

export class Renderer {
    /**
     * Creates a new Renderer instance for drawing the grid to a canvas element.
     * Initializes the 2D rendering context and sets appropriate canvas dimensions.
     * 
     * @param {HTMLCanvasElement} canvas - The HTML canvas element for rendering
     * @param {GridModel} gridModel - The grid model containing cell data to render
     * 
     * @property {HTMLCanvasElement} canvas - Reference to the canvas element for drawing
     * @property {CanvasRenderingContext2D} context - 2D rendering context for drawing operations
     * @property {GridModel} gridModel - Reference to the grid model for accessing cell states
     * 
     * The renderer uses the HTML5 Canvas API for efficient 2D graphics rendering,
     * providing smooth visual updates as the simulation evolves.
     */
    constructor(canvas, gridModel) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.gridModel = gridModel;
        this.updateCanvasSize();
    }

    /**
     * Updates the canvas dimensions to match the current grid size.
     * Ensures the canvas pixel dimensions align with the grid's cell count and size.
     * 
     * Canvas sizing calculation:
     * - Width = number of columns × cell size in pixels
     * - Height = number of rows × cell size in pixels
     * 
     * This method should be called whenever:
     * - The grid is resized (different row/column count)
     * - The cell size changes (zoom in/out functionality)
     * - Initial setup during construction
     * 
     * Note: Changing canvas width/height properties automatically clears the canvas,
     * so a redraw is typically needed after calling this method.
     * 
     * The canvas size directly affects:
     * - Visual resolution and clarity of the grid
     * - Performance (larger canvases require more rendering time)
     * - User interaction accuracy (pointer event mapping)
     */
    updateCanvasSize() {
        this.canvas.width = this.gridModel.columns * this.gridModel.cellSize;
        this.canvas.height = this.gridModel.rows * this.gridModel.cellSize;
    }

    /**
     * Renders the entire grid to the canvas, drawing each cell with its appropriate color.
     * Performs a complete redraw of the grid based on the current state of all cells.
     * 
     * Rendering process:
     * 1. Clears the entire canvas to remove previous frame
     * 2. Iterates through all grid positions (row by row, column by column)
     * 3. Skips empty cells for performance (no need to draw black on black)
     * 4. Draws filled rectangles for non-empty cells using state-specific colors
     * 
     * Color mapping (defined in COLORS constant):
     * - STATE.EMPTY: Not drawn (canvas background is black)
     * - STATE.SPECIES_A: Red cells representing first species
     * - STATE.SPECIES_B: Blue cells representing second species
     * - STATE.CONTESTED: Yellow cells for disputed territory
     * - STATE.DISEASED: Green/grey cells for infected/dying cells
     * 
     * Performance considerations:
     * - Empty cells are skipped to reduce draw calls
     * - Uses fillRect for efficient rectangle rendering
     * - Batch operations by setting fillStyle once per state type would be more efficient
     *   for very large grids, but current approach is simpler and sufficient
     * 
     * This method is called:
     * - After each simulation step during animation
     * - After user interactions (painting, erasing)
     * - After grid modifications (clear, randomize)
     * - When visualization needs to be refreshed
     */
    draw() {
        const grid = this.gridModel;
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let row = 0; row < grid.rows; row++) {
            for (let column = 0; column < grid.columns; column++) {
                const state = grid.getCell(column, row);
                if (state === STATE.EMPTY) continue;

                this.context.fillStyle = COLORS[state];
                this.context.fillRect(
                    column * grid.cellSize,
                    row * grid.cellSize,
                    grid.cellSize,
                    grid.cellSize
                );
            }
        }
    }
}
