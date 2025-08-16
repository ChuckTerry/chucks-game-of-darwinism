/**
 * HistoryRenderer class manages the history overlay canvas that tracks cell changes over time.
 * This overlay visualizes the cumulative history of the simulation with specific coloring rules
 * for different cell states, creating a heat-map like visualization of activity.
 */

import { STATE } from '../constants/state.js';

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
        this.isVisible = false;
        
        // Initialize the history canvas with black background
        this.initializeHistory();
        
        // Store previous grid state to detect changes
        this.previousGrid = new Uint8Array(gridModel.grid.length);
        this.updatePreviousGrid();
    }
    
    /**
     * Initializes the history canvas by filling it completely with black.
     * This represents the initial state where no activity has occurred yet.
     */
    initializeHistory() {
        this.updateCanvasSize();
        this.context.fillStyle = 'black';
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
     * Updates the stored previous grid state with the current grid state.
     * This is used to detect changes between frames.
     */
    updatePreviousGrid() {
        for (let i = 0; i < this.gridModel.grid.length; i++) {
            this.previousGrid[i] = this.gridModel.grid[i];
        }
    }
    
    /**
     * Tracks changes in the grid and updates the history overlay accordingly.
     * This method should be called after each simulation step or user interaction.
     * 
     * Color rules for the overlay:
     * - Red/Blue Species (STATE.SPECIES_A/B): Painted with corresponding color at 0.04 opacity
     * - Empty (STATE.EMPTY): Painted black at 0.005 opacity
     * - Contested (STATE.CONTESTED): Painted yellow at 0.09 opacity
     * - Diseased (STATE.DISEASED): Painted black at 0.18 opacity
     */
    trackChanges() {
        const grid = this.gridModel;
        
        for (let row = 0; row < grid.rows; row++) {
            for (let column = 0; column < grid.columns; column++) {
                const index = row * grid.columns + column;
                const currentState = grid.grid[index];
                const previousState = this.previousGrid[index];
                               const x = column * grid.cellSize;
                const y = row * grid.cellSize;
                
                // Apply the appropriate color based on the current state
                switch (currentState) {
                    case STATE.SPECIES_A:
                        this.context.fillStyle = 'rgba(231, 76, 60, 0.04)';
                        break;
                    case STATE.SPECIES_B:
                        this.context.fillStyle = 'rgba(52, 152, 219, 0.04)';
                        break;
                    case STATE.EMPTY:
                        this.context.fillStyle = 'rgba(0, 0, 0, 0.007)';
                        break;
                    case STATE.CONTESTED:
                        this.context.fillStyle = 'rgba(241, 196, 15, 0.09)';
                        break;
                    case STATE.DISEASED:
                        this.context.fillStyle = 'rgba(230, 230, 230, 0.18)';
                        break;
                }
                
                this.context.fillRect(x, y, grid.cellSize, grid.cellSize);
            }
        }
        
        // Update the previous grid state for the next comparison
        this.updatePreviousGrid();
    }
    
    /**
     * Clears the history overlay, resetting it to solid black.
     * This does not affect the main simulation canvas.
     */
    clearHistory() {
        this.context.fillStyle = 'black';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Sets the visibility of the overlay canvas.
     * 
     * @param {boolean} visible - Whether the overlay should be visible
     */
    setVisible(visible) {
        this.isVisible = visible;
        this.canvas.style.display = visible ? 'block' : 'none';
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
        // Update the previous grid array size
        this.previousGrid = new Uint8Array(columns * rows);
        
        // Update canvas size and clear history
        this.updateCanvasSize();
        this.clearHistory();
        this.updatePreviousGrid();
    }
}
