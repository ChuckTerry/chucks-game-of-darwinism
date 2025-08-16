/**
 * InteractionHandler class manages user interactions with the cellular automaton grid.
 * This class handles mouse/pointer events for drawing cells, provides brush tools for
 * different cell types, and enables intuitive editing of the simulation state.
 */

import { STATE } from '../constants/state.js';

const brushSelect= document.getElementById('brush');

export class InteractionHandler {
    /**
     * Creates a new InteractionHandler instance to manage user input on the grid.
     * Initializes painting state and sets up all interaction event listeners.
     * 
     * @param {HTMLCanvasElement} canvas - The canvas element where the grid is rendered
     * @param {GridModel} gridModel - The grid model containing cell data
     * @param {Renderer} renderer - The renderer for updating the visual display
     * @param {HistoryRenderer} historyRenderer - The history renderer for tracking cell changes
     * 
     * @property {HTMLCanvasElement} canvas - Reference to the canvas element for event binding
     * @property {GridModel} gridModel - Reference to the grid model for cell manipulation
     * @property {Renderer} renderer - Reference to the renderer for triggering redraws
     * @property {HistoryRenderer} historyRenderer - Reference to the history renderer for tracking changes
     * @property {boolean} painting - Flag indicating whether the user is actively painting
     * @property {number} brush - Current brush type (STATE value) for painting cells
     */
    constructor(canvas, gridModel, renderer, historyRenderer) {
        this.canvas = canvas;
        this.gridModel = gridModel;
        this.renderer = renderer;
        this.historyRenderer = historyRenderer;
        this.painting = false;
        this.brush = STATE.SPECIES_A;

        this.setupEventListeners();
    }

    /**
     * Sets up all event listeners for user interaction with the grid.
     * Configures mouse/pointer events for painting, erasing, and cycling cell states.
     * 
     * Event handlers configured:
     * 
     * 1. Brush selection: Updates the active brush type when dropdown changes
     *    - Available brushes: Species A (red), Species B (blue), Contested, Diseased
     * 
     * 2. Context menu: Prevents default right-click menu to enable custom right-click behavior
     * 
     * 3. Pointer down: Initiates painting or state cycling
     *    - Left click: Paint with selected brush
     *    - Left click + Shift: Erase (set to empty)
     *    - Right click: Cycle through cell states
     * 
     * 4. Pointer up: Stops painting when mouse/touch is released
     * 
     * 5. Pointer move: Continues painting while dragging
     *    - Drag with left button: Paint with brush
     *    - Drag with left button + Shift: Erase
     *    - Drag with right button: Cycle states
     * 
     * The painting flag ensures drawing only occurs during active interaction.
     */
    setupEventListeners() {
        brushSelect.addEventListener('change', () => {
            this.brush = parseInt(brushSelect.value, 10);
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        this.canvas.addEventListener('pointerdown', (event) => {
            this.painting = true;
            const [x, y] = this.eventToCell(event);

            if (event.button === 2) {
                // Right click: cycle through states
                const currentState = this.gridModel.getCell(x, y);
                this.gridModel.setCell(x, y, this.cycleState(currentState));
            } else {
                // Left click: paint with brush (shift to erase)
                const value = event.shiftKey ? STATE.EMPTY : this.brush;
                this.gridModel.setCell(x, y, value);
            }

            this.renderer.draw();
            this.historyRenderer.trackChanges();
        });

        window.addEventListener('pointerup', () => {
            this.painting = false;
        });

        this.canvas.addEventListener('pointermove', (event) => {
            if (!this.painting) return;

            const [x, y] = this.eventToCell(event);
            const value = event.shiftKey ? STATE.EMPTY :
                (event.buttons === 2 ? this.cycleState(this.gridModel.getCell(x, y)) : this.brush);

            this.gridModel.setCell(x, y, value);
            this.renderer.draw();
            this.historyRenderer.trackChanges();
        });
    }

    /**
     * Converts a pointer event's screen coordinates to grid cell coordinates.
     * Maps mouse/touch position to the corresponding cell in the grid.
     * 
     * @param {PointerEvent} event - The pointer event containing client coordinates
     * @returns {Array<number>} A tuple [x, y] representing the cell coordinates
     * 
     * The conversion process:
     * 1. Gets the canvas bounding rectangle for accurate positioning
     * 2. Calculates relative position within the canvas
     * 3. Scales the position to grid dimensions
     * 4. Clamps coordinates to valid grid bounds [0, columns-1] and [0, rows-1]
     * 
     * This method handles edge cases where pointer events may occur slightly
     * outside the canvas bounds, ensuring valid cell coordinates are always returned.
     * 
     * The scaling accounts for the canvas potentially being displayed at a different
     * size than the grid dimensions, maintaining accurate cell selection regardless
     * of canvas scaling or CSS sizing.
     */
    eventToCell(event) {
        const {left, top, width, height } = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - left) / width * this.gridModel.columns);
        const y = Math.floor((event.clientY - top) / height * this.gridModel.rows);

        return [
            Math.max(0, Math.min(this.gridModel.columns - 1, x)),
            Math.max(0, Math.min(this.gridModel.rows - 1, y))
        ];
    }

    /**
     * Cycles a cell's state to the next state in the predefined sequence.
     * Provides a quick way to iterate through all possible cell states.
     * 
     * @param {number} state - The current state of the cell
     * @returns {number} The next state in the cycle sequence
     * 
     * State cycle sequence:
     * 1. Empty (black) - No living cell
     * 2. Species A (red) - First species type
     * 3. Species B (blue) - Second species type
     * 4. Contested (yellow) - Territory disputed between species
     * 5. Diseased (green/grey) - Infected or dying cell
     * → Returns to Empty, completing the cycle
     * 
     * This cycling behavior is particularly useful for:
     * - Quickly testing different cell configurations
     * - Exploring how different states interact
     * - Setting up complex initial patterns
     * - Debugging simulation rules
     * 
     * The modulo operation ensures the cycle wraps around seamlessly.
     */
    cycleState(state) {
        // Cycle: Empty -> A -> B -> Contested -> Diseased -> Empty
        const cycle = [STATE.EMPTY, STATE.SPECIES_A, STATE.SPECIES_B,
        STATE.CONTESTED, STATE.DISEASED];
        const currentIndex = cycle.indexOf(state);
        return cycle[(currentIndex + 1) % cycle.length];
    }
}
