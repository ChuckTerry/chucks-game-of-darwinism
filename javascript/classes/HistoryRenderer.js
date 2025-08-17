/**
 * HistoryRenderer class manages the history overlay canvas that tracks cell changes over time.
 * This overlay visualizes the cumulative history of the simulation with specific coloring rules
 * for different cell states, creating a heat-map like visualization of activity.
 */

import { STATE } from '../constants/state.js';
import { COLORS } from '../constants/colors.js';

export class HistoryRenderer {
    /**
     * Creates a new HistoryRenderer instance for tracking and rendering cell history.
     * 
     * @param {HTMLCanvasElement} canvas - The overlay canvas element for history rendering
     * @param {GridModel} gridModel - The grid model to track changes from
     */
    constructor(canvas, gridModel) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.gridModel = gridModel;
        this.updateColors();
        this.initializeHistory();
    }
    
    /**
     * Converts a hex color to RGBA with specified opacity
     * @param {string} hex - Hex color string (e.g., '#e74c3c')
     * @param {number} opacity - Opacity value between 0 and 1
     * @returns {string} RGBA color string
     */
    hexToRGBA(hex, opacity) {
        // Remove the # if present
        hex = hex.replace('#', '');
        
        // Parse the hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    /**
     * Initializes the history canvas by filling it completely with black.
     * This represents the initial state where no activity has occurred yet.
     */
    initializeHistory() {
        this.updateCanvasSize();
        this.context.fillStyle = this.colors.clear;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Updates the canvas dimensions to match the current grid size.
     * Should be called when the grid is resized.
     */
    updateCanvasSize() {
        this.canvas.width = this.gridModel.columns * this.gridModel.cellSize;
        this.canvas.height = this.gridModel.rows * this.gridModel.cellSize;
    }
    
    /**
     * Tracks changes in the grid and updates the history overlay accordingly.
     * This method should be called after each simulation step or user interaction.
     */
    trackChanges() {
        const grid = this.gridModel;
        
        for (let row = 0; row < grid.rows; row++) {
            for (let column = 0; column < grid.columns; column++) {
                const index = row * grid.columns + column;
                const currentState = grid.grid[index];
                const x = column * grid.cellSize;
                const y = row * grid.cellSize;
                this.context.fillStyle = this.colors[currentState];
                this.context.fillRect(x, y, grid.cellSize, grid.cellSize);
            }
        }
    }

    updateColors() {
        this.colors = {
            [STATE.SPECIES_A]: this.hexToRGBA(COLORS[STATE.SPECIES_A], 0.04),
            [STATE.SPECIES_B]: this.hexToRGBA(COLORS[STATE.SPECIES_B], 0.04),
            [STATE.EMPTY]: this.hexToRGBA(COLORS[STATE.EMPTY], 0.007),
            [STATE.CONTESTED]: this.hexToRGBA(COLORS[STATE.CONTESTED], 0.09),
            [STATE.DISEASED]: this.hexToRGBA(COLORS[STATE.DISEASED], 0.18),
            clear: this.hexToRGBA(COLORS[STATE.EMPTY], 1)
        };
    }
    
    /**
     * Clears the history overlay, resetting it to solid black.
     * This does not affect the main simulation canvas.
     */
    clearHistory() {
        this.context.fillStyle = this.colors.clear;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Sets the opacity of the overlay canvas.
     * 
     * @param {number} opacity - Opacity value between 0 and 1
     */
    setOpacity(opacity) {
        this.canvas.style.opacity = opacity;
    }
    
    /**
     * Handles grid resize by updating canvas dimensions and clearing history.
     * 
     * @param {number} columns - New number of columns
     * @param {number} rows - New number of rows
     * @param {number} cellSize - New cell size in pixels
     */
    handleResize(columns, rows, cellSize) {
        // Update canvas size and clear history
        this.updateCanvasSize();
        this.clearHistory();

    }
}
