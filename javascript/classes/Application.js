/**
 * Application class serves as the main orchestrator for the cellular automaton simulation.
 * This class initializes all major components, coordinates their interactions, and manages
 * the application-level functionality including user input handling, keyboard shortcuts,
 * and initial pattern seeding for the simulation.
 */

import { RuleParameters } from './RuleParameters.js';
import { GridModel } from './GridModel.js';
import { Renderer } from './Renderer.js';
import { HistoryRenderer } from './HistoryRenderer.js';
import { SimulationEngine } from './SimulationEngine.js';
import { InteractionHandler } from './InteractionHandler.js';
import { AnimationController } from './AnimationController.js';
import { STATE } from '../constants/state.js';

const canvas = document.getElementById('primary-view');
const historyCanvas = document.getElementById('history-overlay');
const clearBtn = document.getElementById('clear-button');
const clearHistoryBtn = document.getElementById('clear-history-button');
const randBtn = document.getElementById('rand-button');
const colsInput = document.getElementById('cols');
const rowsInput = document.getElementById('rows');
const cellPxInput = document.getElementById('cellPx');
const resizeBtn = document.getElementById('resizeBtn');
const toggleOverlayBtn = document.getElementById('toggle-overlay');
const overlayControls = document.querySelector('.overlay-controls');
const overlayOpacitySlider = document.getElementById('overlay-opacity');
const opacityValue = document.getElementById('opacity-value');


export class Application {
    /**
     * Creates a new Application instance and initializes the entire simulation system.
     * Sets up all components, event listeners, and seeds the grid with an initial pattern.
     * 
     * @property {RuleParameters} ruleParams - Manages simulation parameters and rule configurations
     * @property {GridModel} gridModel - Handles the cellular grid data structure and cell states
     * @property {Renderer} renderer - Responsible for drawing the grid to the canvas
     * @property {HistoryRenderer} historyRenderer - Manages the history overlay visualization
     * @property {SimulationEngine} simulation - Processes cellular automaton rules and evolution
     * @property {InteractionHandler} interaction - Manages user interactions with the grid
     * @property {AnimationController} animation - Controls animation playback and frame timing
     */
    constructor() {
        this.initializeComponents();
        this.setupEventListeners();
        this.seedInitialPattern();
    }

    /**
     * Initializes all major components of the simulation in the correct dependency order.
     * Creates instances of each system component with appropriate configuration from UI inputs.
     * 
     * The initialization order is important:
     * 1. RuleParameters - Provides configuration for simulation rules
     * 2. GridModel - Creates the data structure for storing cell states
     * 3. Renderer - Sets up canvas rendering for the grid
     * 4. SimulationEngine - Implements the cellular automaton logic
     * 5. InteractionHandler - Enables user interaction with cells
     * 6. AnimationController - Manages the animation loop
     * 
     * Grid dimensions and cell size are read from the UI input elements.
     */
    initializeComponents() {
        const columns = parseInt(colsInput.value, 10);
        const rows = parseInt(rowsInput.value, 10);
        const cellSize = parseInt(cellPxInput.value, 10);

        this.ruleParams = new RuleParameters();
        this.gridModel = new GridModel(columns, rows, cellSize);
        this.renderer = new Renderer(canvas, this.gridModel);
        this.historyRenderer = new HistoryRenderer(historyCanvas, this.gridModel);
        this.simulation = new SimulationEngine(this.gridModel, this.ruleParams);
        this.interaction = new InteractionHandler(canvas, this.gridModel, this.renderer, this.historyRenderer);
        this.animation = new AnimationController(this.simulation, this.renderer, this.historyRenderer);
    }

    /**
     * Sets up all event listeners for UI controls and keyboard shortcuts.
     * Binds button clicks and keyboard events to their corresponding actions.
     * 
     * UI Controls:
     * - Clear button: Resets the grid to empty state
     * - Random button: Generates a random pattern on the grid
     * - Resize button: Changes grid dimensions based on input values
     * 
     * Keyboard Shortcuts:
     * - Space: Toggle play/pause animation
     * - N: Step forward one generation (when paused)
     * - R: Randomize the grid
     * - C: Clear the grid
     * 
     * Keyboard events are ignored when focus is on input elements to prevent
     * interference with text entry.
     */
    setupEventListeners() {
        clearBtn.addEventListener('click', () => this.clear());
        clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        randBtn.addEventListener('click', () => this.randomize());
        resizeBtn.addEventListener('click', () => this.resize());
        
        // Overlay controls
        toggleOverlayBtn.addEventListener('click', () => this.toggleOverlay());
        overlayOpacitySlider.addEventListener('input', (e) => {
            const opacity = e.target.value / 100;
            this.historyRenderer.setOpacity(opacity);
            opacityValue.textContent = `${e.target.value}%`;
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    this.animation.togglePlay();
                    break;
                case 'n':
                    if (!this.animation.running) {
                        this.animation.step();
                    }
                    break;
                case 'r':
                    this.randomize();
                    break;
                case 'c':
                    this.clear();
                    break;
            }
        });
    }

    /**
     * Clears all cells in the grid, resetting them to empty state.
     * Immediately redraws the canvas to reflect the empty grid.
     * This method is useful for resetting the simulation to a blank slate.
     */
    clear() {
        this.gridModel.clear();
        this.renderer.draw();
    }

    /**
     * Generates a random pattern on the grid based on current parameter settings.
     * First clears the grid, then populates it with cells according to density parameters.
     * 
     * The randomization process:
     * 1. Clears the existing grid
     * 2. For each cell position, checks against the density parameter
     * 3. If a cell should be created, determines its type:
     *    - Diseased cells: Created based on gdensity (growth density) parameter
     *    - Species A or B: Randomly assigned with 50/50 probability
     * 
     * The density parameter controls the overall cell population (0-100%),
     * while gdensity controls the proportion of diseased cells within that population.
     */
    randomize() {
        this.clear();
        const params = this.ruleParams.getValues();

        for (let index = 0; index < this.gridModel.grid.length; index++) {
            if (Math.random() < params.density) {
                if (Math.random() < params.gdensity) {
                    this.gridModel.grid[index] = STATE.DISEASED;
                } else {
                    this.gridModel.grid[index] = Math.random() < 0.5
                        ? STATE.SPECIES_A
                        : STATE.SPECIES_B;
                }
            }
        }

        this.renderer.draw();
    }

    /**
     * Resizes the grid to new dimensions specified in the UI input fields.
     * Validates input values to ensure they fall within acceptable ranges.
     * 
     * Input validation ranges:
     * - Columns: 10-512 cells (clamped to range)
     * - Rows: 10-512 cells (clamped to range)
     * - Cell size: 2-20 pixels (clamped to range)
     * 
     * After resizing:
     * 1. Updates the grid model with new dimensions
     * 2. Adjusts the canvas size to fit the new grid
     * 3. Redraws the grid (content is not preserved during resize)
     * 
     * Note: The resize operation clears existing cell data by default.
     */
    resize() {
        const columns = Math.max(10, Math.min(512, parseInt(colsInput.value, 10)));
        const rows = Math.max(10, Math.min(512, parseInt(rowsInput.value, 10)));
        const cellSize = Math.max(2, Math.min(20, parseInt(cellPxInput.value, 10)));

        this.gridModel.resize(columns, rows, cellSize, false);
        this.renderer.updateCanvasSize();
        this.historyRenderer.handleResize(columns, rows, cellSize);
        this.renderer.draw();
    }

    /**
     * Seeds the grid with an initial demonstration pattern.
     * Creates a symmetrical starting configuration that showcases key simulation features.
     * 
     * The seeded pattern includes:
     * 1. Red cluster (Species A): A small glider-like pattern on the left side
     *    - Positioned at (center_x - 8, center_y)
     *    - Pattern: 3-cell horizontal line with two additional cells forming an "L" shape
     * 
     * 2. Blue cluster (Species B): Mirror of the red cluster on the right side
     *    - Positioned at (center_x + 8, center_y)
     *    - Same pattern as Species A for symmetry
     * 
     * 3. Contested border: A horizontal line of contested cells at the center
     *    - Creates a boundary zone between the two species
     *    - Spans 7 cells centered at the grid midpoint
     * 
     * 4. Scattered disease: A line of diseased cells above the main patterns
     *    - Positioned 6 cells above center
     *    - Creates potential for infection dynamics
     * 
     * This initial configuration demonstrates species competition, disease spread,
     * and contested territory dynamics in the cellular automaton.
     */
    seedInitialPattern() {
        const cx = Math.floor(this.gridModel.columns / 2);
        const cy = Math.floor(this.gridModel.rows / 2);

        // Red cluster (Species A)
        const redPattern = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 2]];
        redPattern.forEach(([dx, dy]) => {
            this.gridModel.setCell(cx - 8 + dx, cy + dy, STATE.SPECIES_A);
        });

        // Blue cluster (Species B)
        const bluePattern = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 2]];
        bluePattern.forEach(([dx, dy]) => {
            this.gridModel.setCell(cx + 8 + dx, cy + dy, STATE.SPECIES_B);
        });

        // Contested border
        for (let k = -3; k <= 3; k++) {
            this.gridModel.setCell(cx + k, cy, STATE.CONTESTED);
        }

        // Scattered disease
        for (let k = 0; k < 6; k++) {
            const x = this.gridModel.wrap(cx - 3 + k, this.gridModel.columns);
            const y = this.gridModel.wrap(cy - 6, this.gridModel.rows);
            this.gridModel.setCell(x, y, STATE.DISEASED);
        }

        this.renderer.draw();
    }

    /**
     * Toggles the visibility of the history overlay canvas.
     * Also toggles the visibility of overlay-specific controls.
     */
    toggleOverlay() {
        const isVisible = !this.historyRenderer.isVisible;
        this.historyRenderer.setVisible(isVisible);
        overlayControls.style.display = isVisible ? 'block' : 'none';
        toggleOverlayBtn.textContent = isVisible ? 'Hide History' : 'Show History';
    }

    /**
     * Clears the history overlay canvas without affecting the main simulation.
     * Resets the history tracking to start fresh from the current state.
     */
    clearHistory() {
        this.historyRenderer.clearHistory();
    }
}
