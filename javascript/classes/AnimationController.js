/**
 * AnimationController class manages the animation loop and playback controls for the simulation.
 * This class handles play/pause functionality, frame rate control, and coordinates the
 * simulation stepping with visual rendering to create smooth animations.
 */

const playBtn = document.getElementById('play-button');
const stepBtn = document.getElementById('step-button');
const speed = document.getElementById('speed');
const fpsDisplay = document.getElementById('fps');

export class AnimationController {
    /**
     * Creates a new AnimationController instance to manage simulation playback.
     * 
     * @param {SimulationEngine} simulation - The simulation engine that processes cellular automaton rules
     * @param {Renderer} renderer - The renderer responsible for drawing the simulation state to canvas
     * @param {HistoryRenderer} historyRenderer - The history renderer for tracking cell changes over time
     * 
     * @property {SimulationEngine} simulation - Reference to the simulation engine for stepping through generations
     * @property {Renderer} renderer - Reference to the renderer for updating visual display
     * @property {HistoryRenderer} historyRenderer - Reference to the history renderer for tracking changes
     * @property {boolean} running - Current playback state: true when animation is playing, false when paused
     * @property {number} lastTick - Timestamp of the last animation frame, used for frame rate limiting
     * @property {number} targetFPS - Target frames per second for the animation (1-60 fps)
     */
    constructor(simulation, renderer, historyRenderer) {
        this.simulation = simulation;
        this.renderer = renderer;
        this.historyRenderer = historyRenderer;
        this.running = false;
        this.lastTick = 0;
        this.targetFPS = 12;
        
        this.setupControls();
    }

    /**
     * Initializes and binds all animation control elements to their event handlers.
     * Sets up listeners for:
     * - Play/Pause button: Toggles animation playback
     * - Step button: Advances simulation by one generation when paused
     * - Speed slider: Adjusts animation frame rate
     * 
     * Also performs initial speed configuration from the slider's default value.
     */
    setupControls() {
        playBtn.addEventListener('click', () => this.togglePlay());
        stepBtn.addEventListener('click', () => this.step());
        speed.addEventListener('input', () => this.updateSpeed());
        
        this.updateSpeed();
    }

    /**
     * Toggles the animation between playing and paused states.
     * When playing, starts the animation loop. When paused, stops the loop.
     * This method acts as a convenience wrapper around play() and pause().
     */
    togglePlay() {
        if (this.running) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Starts the animation playback loop.
     * Updates the UI to show pause button and begins requesting animation frames.
     * The animation will continue running until pause() is called.
     * 
     * Side effects:
     * - Sets running flag to true
     * - Changes play button text to pause symbol
     * - Removes primary button styling
     * - Resets frame timing
     * - Initiates requestAnimationFrame loop
     */
    play() {
        this.running = true;
        playBtn.textContent = '⏸ Pause';
        playBtn.classList.remove('primary');
        this.lastTick = 0;
        requestAnimationFrame((ts) => this.loop(ts));
    }

    /**
     * Pauses the animation playback.
     * Stops the animation loop and updates UI to show play button.
     * The simulation state is preserved and can be resumed with play().
     * 
     * Side effects:
     * - Sets running flag to false
     * - Changes pause button text back to play symbol
     * - Restores primary button styling
     * - Stops requestAnimationFrame loop
     */
    pause() {
        this.running = false;
        playBtn.textContent = '▶ Play';
        playBtn.classList.add('primary');
    }

    /**
     * Advances the simulation by exactly one generation/step.
     * Only works when the animation is paused to prevent conflicts with the animation loop.
     * Useful for frame-by-frame analysis of the cellular automaton's evolution.
     * 
     * This method will:
     * 1. Check if animation is paused
     * 2. Execute one simulation step if paused
     * 3. Immediately render the new state
     * 4. Track changes in the history overlay
     */
    step() {
        if (!this.running) {
            this.simulation.step();
            this.renderer.draw();
            this.historyRenderer.trackChanges();
        }
    }

    /**
     * The main animation loop that runs continuously while playing.
     * Implements frame rate limiting to maintain consistent animation speed.
     * Uses requestAnimationFrame for smooth, browser-optimized rendering.
     * 
     * @param {number} timestamp - High-resolution timestamp provided by requestAnimationFrame
     * 
     * The loop:
     * 1. Checks if animation should continue running
     * 2. Calculates if enough time has passed for the next frame
     * 3. Steps the simulation and renders if frame interval is met
     * 4. Recursively schedules the next frame
     * 
     * Frame timing is controlled by targetFPS to allow variable speed playback.
     */
    loop(timestamp) {
        if (!this.running) return;
        
        const interval = 1000 / Math.max(1, this.targetFPS);
        
        if (timestamp - this.lastTick >= interval) {
            this.lastTick = timestamp;
            this.simulation.step();
            this.renderer.draw();
            this.historyRenderer.trackChanges();
        }
        
        requestAnimationFrame((ts) => this.loop(ts));
    }

    /**
     * Updates the animation speed based on the speed slider value.
     * Reads the current slider position and sets the target frame rate.
     * Also updates the FPS display to show the current speed setting.
     * 
     * The speed value is interpreted as frames per second (FPS):
     * - Lower values (1-5 fps): Slow animation for detailed observation
     * - Medium values (10-20 fps): Standard animation speed
     * - Higher values (30-60 fps): Fast animation for rapid evolution
     */
    updateSpeed() {
        this.targetFPS = parseInt(speed.value, 10);
        fpsDisplay.textContent = this.targetFPS + ' fps';
    }
}
