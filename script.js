// Multi-Species Life Simulation
// A cellular automaton with multiple species, disease, and contested states

// ==========================================
// Constants and Configuration
// ==========================================

// State encoding: 0=Empty (.), 1=A (red), 2=B (blue), 3=G (diseased), 4=Y (contested)
const STATE = {
    EMPTY: 0,
    SPECIES_A: 1,
    SPECIES_B: 2,
    DISEASED: 3,
    CONTESTED: 4
};

const COLORS = {
    [STATE.EMPTY]: "#000000",
    [STATE.SPECIES_A]: "#e74c3c",
    [STATE.SPECIES_B]: "#3498db",
    [STATE.DISEASED]: "#2ecc71",
    [STATE.CONTESTED]: "#f1c40f"
};

// ==========================================
// DOM References
// ==========================================

const elements = {
    canvas: document.getElementById("cv"),
    playBtn: document.getElementById("playBtn"),
    stepBtn: document.getElementById("stepBtn"),
    clearBtn: document.getElementById("clearBtn"),
    randBtn: document.getElementById("randBtn"),
    speed: document.getElementById("speed"),
    fpsDisplay: document.getElementById("fps"),
    colsInput: document.getElementById("cols"),
    rowsInput: document.getElementById("rows"),
    cellPxInput: document.getElementById("cellPx"),
    resizeBtn: document.getElementById("resizeBtn"),
    brushSelect: document.getElementById("brush")
};

const ctx = elements.canvas.getContext("2d");

// ==========================================
// Rule Parameters
// ==========================================

class RuleParameters {
    constructor() {
        this.setupSliders();
    }

    setupSliders() {
        this.BIRTH = this.bindRange("BIRTH", "BIRTHv");
        this.Smin = this.bindRange("Smin", "Sminv");
        this.Smax = this.bindRange("Smax", "Smaxv");
        this.OVER = this.bindRange("OVER", "OVERv");
        this.Cmin = this.bindRange("Cmin", "Cminv");
        this.MARG = this.bindRange("MARG", "MARGv");
        this.Istrict = this.bindRange("Istrict", "Istrictv");
        this.Iweak = this.bindRange("Iweak", "Iweakv");
        this.TAU = this.bindRange("TAU", "TAUv");
        this.Ydec = this.bindRange("Ydec", "Ydecv");
        this.dens = this.bindRange("dens", "densv", v => v + "%");
        this.gdens = this.bindRange("gdens", "gdensv", v => v + "%");
    }

    bindRange(id, outputId, formatter = (v) => v) {
        const element = document.getElementById(id);
        const output = document.getElementById(outputId);
        
        const sync = () => {
            output.textContent = formatter(element.value);
        };
        
        element.addEventListener("input", sync);
        sync();
        
        return element;
    }

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

// ==========================================
// Grid Model
// ==========================================

class GridModel {
    constructor(cols, rows, cellSize) {
        this.cols = cols;
        this.rows = rows;
        this.cellSize = cellSize;
        this.initializeGrids();
    }

    initializeGrids() {
        const size = this.cols * this.rows;
        this.grid = new Uint8Array(size);
        this.next = new Uint8Array(size);
        this.gAge = new Uint8Array(size); // disease age
        this.yAge = new Uint8Array(size); // contested age
    }

    idx(x, y) {
        return (y * this.cols + x) | 0;
    }

    wrap(x, n) {
        x %= n;
        return x < 0 ? x + n : x;
    }

    resize(newCols, newRows, cellSize, keepContent = false) {
        const oldGrid = this.grid;
        const oldCols = this.cols;
        const oldRows = this.rows;
        
        this.cols = newCols | 0;
        this.rows = newRows | 0;
        this.cellSize = cellSize | 0;
        
        this.initializeGrids();
        
        if (keepContent && oldGrid && oldGrid.length) {
            // Copy overlapping region
            const minCols = Math.min(this.cols, oldCols);
            const minRows = Math.min(this.rows, oldRows);
            
            for (let y = 0; y < minRows; y++) {
                for (let x = 0; x < minCols; x++) {
                    const oldIdx = y * oldCols + x;
                    const newIdx = this.idx(x, y);
                    this.grid[newIdx] = oldGrid[oldIdx];
                }
            }
        }
    }

    setCell(x, y, value) {
        const i = this.idx(x, y);
        this.grid[i] = value;
        
        if (value !== STATE.DISEASED) {
            this.gAge[i] = 0;
        }
        if (value !== STATE.CONTESTED) {
            this.yAge[i] = 0;
        }
    }

    getCell(x, y) {
        return this.grid[this.idx(x, y)];
    }

    clear() {
        this.grid.fill(0);
        this.gAge.fill(0);
        this.yAge.fill(0);
    }

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
                
                const nx = this.wrap(x + dx, this.cols);
                const ny = this.wrap(y + dy, this.rows);
                const state = this.grid[this.idx(nx, ny)];
                
                switch(state) {
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

// ==========================================
// Simulation Engine
// ==========================================

class SimulationEngine {
    constructor(gridModel, ruleParams) {
        this.gridModel = gridModel;
        this.ruleParams = ruleParams;
    }

    step() {
        const params = this.ruleParams.getValues();
        const grid = this.gridModel;
        
        for (let y = 0; y < grid.rows; y++) {
            for (let x = 0; x < grid.cols; x++) {
                this.updateCell(x, y, params);
            }
        }
        
        // Swap buffers
        const temp = grid.grid;
        grid.grid = grid.next;
        grid.next = temp;
    }

    updateCell(x, y, params) {
        const grid = this.gridModel;
        const i = grid.idx(x, y);
        const state = grid.grid[i];
        const neighbors = grid.getNeighborCounts(x, y);
        
        // Calculate effective counts (contested cells count as 0.5 for both)
        const SA = neighbors.A + 0.5 * neighbors.Y;
        const SB = neighbors.B + 0.5 * neighbors.Y;
        
        // 1. Disease trigger (highest priority)
        if (this.checkInfection(state, neighbors, params)) {
            grid.next[i] = STATE.DISEASED;
            grid.gAge[i] = 0;
            return;
        }
        
        // 2. Disease aging/decay
        if (state === STATE.DISEASED) {
            this.handleDiseasedCell(i, params);
            return;
        }
        
        // 3. Births on empty cells
        if (state === STATE.EMPTY) {
            this.handleEmptyCell(i, SA, SB, params);
            return;
        }
        
        // 4. Survival/contest for species A/B
        if (state === STATE.SPECIES_A || state === STATE.SPECIES_B) {
            this.handleSpeciesCell(i, state, neighbors, SA, SB, params);
            return;
        }
        
        // 5. Contested cell resolution
        if (state === STATE.CONTESTED) {
            this.handleContestedCell(i, neighbors, SA, SB, params);
            return;
        }
        
        // Default fallback
        grid.next[i] = STATE.EMPTY;
    }

    checkInfection(state, neighbors, params) {
        if (state !== STATE.SPECIES_A && state !== STATE.SPECIES_B && state !== STATE.CONTESTED) {
            return false;
        }
        
        const isWeak = this.isWeakCell(state, neighbors);
        const strongInfection = neighbors.G >= params.istr;
        const weakInfection = params.iweak > 0 && neighbors.G >= params.iweak && isWeak;
        
        return strongInfection || weakInfection;
    }

    isWeakCell(state, neighbors) {
        if (state === STATE.SPECIES_A) return neighbors.A <= 1;
        if (state === STATE.SPECIES_B) return neighbors.B <= 1;
        if (state === STATE.CONTESTED) return Math.min(neighbors.A, neighbors.B) <= 1;
        return false;
    }

    handleDiseasedCell(i, params) {
        const grid = this.gridModel;
        
        if (grid.gAge[i] + 1 >= params.tau) {
            grid.next[i] = STATE.EMPTY;
            grid.gAge[i] = 0;
        } else {
            grid.next[i] = STATE.DISEASED;
            grid.gAge[i] = (grid.gAge[i] + 1) | 0;
        }
    }

    handleEmptyCell(i, SA, SB, params) {
        const grid = this.gridModel;
        
        if (SA >= params.birth && SB < params.birth) {
            grid.next[i] = STATE.SPECIES_A;
        } else if (SB >= params.birth && SA < params.birth) {
            grid.next[i] = STATE.SPECIES_B;
        } else if (SA >= params.birth && SB >= params.birth) {
            grid.next[i] = STATE.CONTESTED;
            grid.yAge[i] = 0;
        } else {
            grid.next[i] = STATE.EMPTY;
        }
    }

    handleSpeciesCell(i, state, neighbors, SA, SB, params) {
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
            grid.next[i] = STATE.CONTESTED;
            grid.yAge[i] = 0;
        } else if (survives) {
            grid.next[i] = state;
        } else {
            grid.next[i] = STATE.EMPTY;
        }
    }

    handleContestedCell(i, neighbors, SA, SB, params) {
        const grid = this.gridModel;
        
        if ((SA >= params.cmin) && (SA - SB >= params.marg)) {
            grid.next[i] = STATE.SPECIES_A;
        } else if ((SB >= params.cmin) && (SB - SA >= params.marg)) {
            grid.next[i] = STATE.SPECIES_B;
        } else if ((neighbors.A + neighbors.B < 2) || (grid.yAge[i] + 1 >= params.ydec)) {
            grid.next[i] = STATE.EMPTY;
            grid.yAge[i] = 0;
        } else {
            grid.next[i] = STATE.CONTESTED;
            grid.yAge[i] = (grid.yAge[i] + 1) | 0;
        }
    }
}

// ==========================================
// Renderer
// ==========================================

class Renderer {
    constructor(canvas, gridModel) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.gridModel = gridModel;
        this.updateCanvasSize();
    }

    updateCanvasSize() {
        this.canvas.width = this.gridModel.cols * this.gridModel.cellSize;
        this.canvas.height = this.gridModel.rows * this.gridModel.cellSize;
    }

    draw() {
        const grid = this.gridModel;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let y = 0; y < grid.rows; y++) {
            for (let x = 0; x < grid.cols; x++) {
                const state = grid.getCell(x, y);
                if (state === STATE.EMPTY) continue;
                
                this.ctx.fillStyle = COLORS[state];
                this.ctx.fillRect(
                    x * grid.cellSize,
                    y * grid.cellSize,
                    grid.cellSize,
                    grid.cellSize
                );
            }
        }
    }
}

// ==========================================
// User Interaction
// ==========================================

class InteractionHandler {
    constructor(canvas, gridModel, renderer) {
        this.canvas = canvas;
        this.gridModel = gridModel;
        this.renderer = renderer;
        this.painting = false;
        this.brush = STATE.SPECIES_A;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        elements.brushSelect.addEventListener("change", () => {
            this.brush = parseInt(elements.brushSelect.value, 10);
        });
        
        this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
        
        this.canvas.addEventListener("pointerdown", (e) => {
            this.painting = true;
            const [x, y] = this.eventToCell(e);
            
            if (e.button === 2) {
                // Right click: cycle through states
                const currentState = this.gridModel.getCell(x, y);
                this.gridModel.setCell(x, y, this.cycleState(currentState));
            } else {
                // Left click: paint with brush (shift to erase)
                const value = e.shiftKey ? STATE.EMPTY : this.brush;
                this.gridModel.setCell(x, y, value);
            }
            
            this.renderer.draw();
        });
        
        window.addEventListener("pointerup", () => {
            this.painting = false;
        });
        
        this.canvas.addEventListener("pointermove", (e) => {
            if (!this.painting) return;
            
            const [x, y] = this.eventToCell(e);
            const value = e.shiftKey ? STATE.EMPTY : 
                         (e.buttons === 2 ? this.cycleState(this.gridModel.getCell(x, y)) : this.brush);
            
            this.gridModel.setCell(x, y, value);
            this.renderer.draw();
        });
    }

    eventToCell(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / rect.width * this.gridModel.cols);
        const y = Math.floor((e.clientY - rect.top) / rect.height * this.gridModel.rows);
        
        return [
            Math.max(0, Math.min(this.gridModel.cols - 1, x)),
            Math.max(0, Math.min(this.gridModel.rows - 1, y))
        ];
    }

    cycleState(state) {
        // Cycle: Empty -> A -> B -> Contested -> Diseased -> Empty
        const cycle = [STATE.EMPTY, STATE.SPECIES_A, STATE.SPECIES_B, 
                      STATE.CONTESTED, STATE.DISEASED];
        const currentIndex = cycle.indexOf(state);
        return cycle[(currentIndex + 1) % cycle.length];
    }
}

// ==========================================
// Animation Controller
// ==========================================

class AnimationController {
    constructor(simulation, renderer) {
        this.simulation = simulation;
        this.renderer = renderer;
        this.running = false;
        this.lastTick = 0;
        this.targetFPS = 12;
        
        this.setupControls();
    }

    setupControls() {
        elements.playBtn.addEventListener("click", () => this.togglePlay());
        elements.stepBtn.addEventListener("click", () => this.step());
        elements.speed.addEventListener("input", () => this.updateSpeed());
        
        this.updateSpeed();
    }

    togglePlay() {
        if (this.running) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.running = true;
        elements.playBtn.textContent = "⏸ Pause";
        elements.playBtn.classList.remove("primary");
        this.lastTick = 0;
        requestAnimationFrame((ts) => this.loop(ts));
    }

    pause() {
        this.running = false;
        elements.playBtn.textContent = "▶ Play";
        elements.playBtn.classList.add("primary");
    }

    step() {
        if (!this.running) {
            this.simulation.step();
            this.renderer.draw();
        }
    }

    loop(timestamp) {
        if (!this.running) return;
        
        const interval = 1000 / Math.max(1, this.targetFPS);
        
        if (timestamp - this.lastTick >= interval) {
            this.lastTick = timestamp;
            this.simulation.step();
            this.renderer.draw();
        }
        
        requestAnimationFrame((ts) => this.loop(ts));
    }

    updateSpeed() {
        this.targetFPS = parseInt(elements.speed.value, 10);
        elements.fpsDisplay.textContent = this.targetFPS + " fps";
    }
}

// ==========================================
// Application Controller
// ==========================================

class Application {
    constructor() {
        this.initializeComponents();
        this.setupEventListeners();
        this.seedInitialPattern();
    }

    initializeComponents() {
        const cols = parseInt(elements.colsInput.value, 10);
        const rows = parseInt(elements.rowsInput.value, 10);
        const cellSize = parseInt(elements.cellPxInput.value, 10);
        
        this.ruleParams = new RuleParameters();
        this.gridModel = new GridModel(cols, rows, cellSize);
        this.renderer = new Renderer(elements.canvas, this.gridModel);
        this.simulation = new SimulationEngine(this.gridModel, this.ruleParams);
        this.interaction = new InteractionHandler(elements.canvas, this.gridModel, this.renderer);
        this.animation = new AnimationController(this.simulation, this.renderer);
    }

    setupEventListeners() {
        elements.clearBtn.addEventListener("click", () => this.clear());
        elements.randBtn.addEventListener("click", () => this.randomize());
        elements.resizeBtn.addEventListener("click", () => this.resize());
        
        // Keyboard shortcuts
        window.addEventListener("keydown", (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
            
            switch(e.key.toLowerCase()) {
                case " ":
                    e.preventDefault();
                    this.animation.togglePlay();
                    break;
                case "n":
                    if (!this.animation.running) {
                        this.animation.step();
                    }
                    break;
                case "r":
                    this.randomize();
                    break;
                case "c":
                    this.clear();
                    break;
            }
        });
    }

    clear() {
        this.gridModel.clear();
        this.renderer.draw();
    }

    randomize() {
        this.clear();
        const params = this.ruleParams.getValues();
        
        for (let i = 0; i < this.gridModel.grid.length; i++) {
            if (Math.random() < params.density) {
                if (Math.random() < params.gdensity) {
                    this.gridModel.grid[i] = STATE.DISEASED;
                } else {
                    this.gridModel.grid[i] = Math.random() < 0.5 ? 
                                             STATE.SPECIES_A : STATE.SPECIES_B;
                }
            }
        }
        
        this.renderer.draw();
    }

    resize() {
        const cols = Math.max(10, Math.min(512, parseInt(elements.colsInput.value, 10)));
        const rows = Math.max(10, Math.min(512, parseInt(elements.rowsInput.value, 10)));
        const cellSize = Math.max(2, Math.min(20, parseInt(elements.cellPxInput.value, 10)));
        
        this.gridModel.resize(cols, rows, cellSize, false);
        this.renderer.updateCanvasSize();
        this.renderer.draw();
    }

    seedInitialPattern() {
        const cx = Math.floor(this.gridModel.cols / 2);
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
            const x = this.gridModel.wrap(cx - 3 + k, this.gridModel.cols);
            const y = this.gridModel.wrap(cy - 6, this.gridModel.rows);
            this.gridModel.setCell(x, y, STATE.DISEASED);
        }
        
        this.renderer.draw();
    }
}

// ==========================================
// Initialize Application
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    new Application();
});
