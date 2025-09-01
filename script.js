class BreachProtocolSolver {
    constructor() {
        this.hexCodes = ["1C", "55", "BD", "E9", "7A", "FF", "C4", "B2", "3F", "8E"];
        this.grid = [];
        this.daemonSequences = [];
        this.bufferSize = 4;
        this.gridWidth = 5;
        this.gridHeight = 5;
        this.daemonCount = 1;
        this.currentGridPosition = 0;
        this.selectedDaemonInput = null;
        this.daemonInputs = [];
        this.worker = null;
        this.maxPaths = 100000;
        this.sortInterval = 200;
        this.initializeButtonGroups();
    }

    generateHexButtons(containerSelector, additionalClass = '') {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let i = 0; i < this.hexCodes.length; i++) {
            const button = document.createElement('div');
            button.className = `hex-button ${additionalClass}`.trim();
            button.dataset.value = (i + 1).toString();
            button.textContent = `${i + 1}: ${this.hexCodes[i]}`;
            container.appendChild(button);
        }
    }

    initializeButtonGroups() {
        document.querySelectorAll('#gridSizeButtons .option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#gridSizeButtons .option-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.gridWidth = this.gridHeight = parseInt(e.target.dataset.size);
            });
        });

        document.querySelectorAll('#bufferSizeButtons .option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#bufferSizeButtons .option-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.bufferSize = parseInt(e.target.dataset.buffer);
            });
        });

        document.querySelectorAll('#daemonCountButtons .option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#daemonCountButtons .option-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.daemonCount = parseInt(e.target.dataset.count);
            });
        });
    }

    parseDaemonFromInputs(daemonIndex) {
        const daemonInputs = this.daemonInputs[daemonIndex];
        const sequence = [];
        
        for (let input of daemonInputs) {
            if (input.value && input.value !== 0) {
                sequence.push(this.hexCodes[input.value - 1]);
            }
        }
        
        return sequence.length > 0 ? sequence : null;
    }

    updateProgress(progress, processedPaths, maxPaths, daemonsFound, totalDaemons, elapsedTime) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const debugInfo = document.getElementById('debugInfo');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (progressText) {
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = Math.floor(elapsedTime % 60);
            progressText.textContent = `${progress.toFixed(1)}% - ${minutes}m ${seconds}s elapsed`;
        }
        
        if (debugInfo) {
            debugInfo.innerHTML = `
                <div>Paths: ${processedPaths}/${maxPaths}</div>
                <div>Daemons Found: ${daemonsFound}/${totalDaemons}</div>
            `;
            debugInfo.style.display = 'block';
        }
    }

    showProgressUI() {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        this.updateProgress(0, 0, this.maxPaths, 0, this.daemonSequences.length, 0);
    }

    hideProgressUI() {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    solve() {
        const solveBtn = document.getElementById('solveBtn');
        const originalText = solveBtn.textContent;
        solveBtn.textContent = 'Solving...';
        solveBtn.disabled = true;
        
        this.showProgressUI();
        
        try {
            this.daemonSequences = [];
            
            for (let i = 0; i < this.daemonCount; i++) {
                const sequence = this.parseDaemonFromInputs(i);
                if (sequence) {
                    this.daemonSequences.push(sequence);
                }
            }
            
            if (this.daemonSequences.length === 0) {
                alert('Please fill in at least one daemon sequence.');
                this.hideProgressUI();
                solveBtn.textContent = originalText;
                solveBtn.disabled = false;
                return;
            }
            
            if (this.grid.some(val => val === 0)) {
                alert('Please fill in some grid values first.');
                this.hideProgressUI();
                solveBtn.textContent = originalText;
                solveBtn.disabled = false;
                return;
            }
            
            this.worker = new Worker('worker.js');
            
            this.worker.onmessage = (e) => {
                if (e.data.type === 'progress') {
                    this.updateProgress(
                        e.data.progress,
                        e.data.processedPaths,
                        e.data.maxPaths,
                        e.data.daemonsFound,
                        e.data.totalDaemons,
                        e.data.elapsedTime
                    );
                } else if (e.data.type === 'complete') {
                    this.hideProgressUI();
                    displaySolution(e.data.result);
                    solveBtn.textContent = originalText;
                    solveBtn.disabled = false;
                    this.worker.terminate();
                    this.worker = null;
                }
            };
            
            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                alert('An error occurred while solving. Please try again.');
                this.hideProgressUI();
                solveBtn.textContent = originalText;
                solveBtn.disabled = false;
                if (this.worker) {
                    this.worker.terminate();
                    this.worker = null;
                }
            };
            
            this.worker.postMessage({
                grid: this.grid,
                gridWidth: this.gridWidth,
                gridHeight: this.gridHeight,
                bufferSize: this.bufferSize,
                daemonSequences: this.daemonSequences,
                maxPaths: this.maxPaths,
                sortInterval: this.sortInterval,
                hexCodes: this.hexCodes
            });
            
        } catch (error) {
            console.error('Error solving:', error);
            alert('An error occurred while solving. Please try again.');
            this.hideProgressUI();
            solveBtn.textContent = originalText;
            solveBtn.disabled = false;
        }
    }
}

const solver = new BreachProtocolSolver();

function solve() {
    solver.solve();
}

function generateGrid() {
    solver.currentGridPosition = 0;
    
    const gridContainer = document.getElementById('gridContainer');
    const grid = document.getElementById('grid');
    
    grid.style.gridTemplateColumns = `repeat(${solver.gridWidth}, 1fr)`;
    grid.innerHTML = '';
    solver.grid = new Array(solver.gridWidth * solver.gridHeight).fill(0);
    
    for (let i = 0; i < solver.gridWidth * solver.gridHeight; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.id = `cell-${i}`;
        cell.textContent = '--';
        cell.onclick = () => clearGridCell(i);
        grid.appendChild(cell);
    }
    
    gridContainer.style.display = 'block';
    document.getElementById('daemonSetup').style.display = 'block';
    
    solver.generateHexButtons('#gridHexCodes');
    document.querySelectorAll('#gridHexCodes .hex-button').forEach(button => {
        button.onclick = () => addHexToGrid(parseInt(button.dataset.value));
    });
}

function generateDaemons() {
    const daemonInputsContainer = document.getElementById('daemonInputs');
    const hexMapping = document.getElementById('daemonHexMapping');
    const solveBtn = document.getElementById('solveBtn');
    
    daemonInputsContainer.innerHTML = '';
    solver.daemonInputs = [];
    solver.selectedDaemonInput = null;
    
    for (let i = 0; i < solver.daemonCount; i++) {
        const daemonContainer = document.createElement('div');
        daemonContainer.className = 'daemon-container';
        
        const daemonHeader = document.createElement('div');
        daemonHeader.className = 'daemon-header';
        
        const daemonTitle = document.createElement('h4');
        daemonTitle.className = 'daemon-title';
        daemonTitle.textContent = `Daemon ${i + 1}`;
        
        const clearBtn = document.createElement('button');
        clearBtn.className = 'daemon-clear-btn';
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = () => clearDaemon(i);
        
        daemonHeader.appendChild(daemonTitle);
        daemonHeader.appendChild(clearBtn);
        
        const daemonSequence = document.createElement('div');
        daemonSequence.className = 'daemon-sequence';
        
        const daemonInputArray = [];
        for (let j = 0; j < 6; j++) {
            const hexInput = document.createElement('div');
            hexInput.className = 'daemon-hex-input empty';
            hexInput.dataset.daemon = i;
            hexInput.dataset.position = j;
            
            hexInput.onclick = () => {
                const inputObj = solver.daemonInputs[i][j];
                if (inputObj.value !== 0) {
                    clearDaemonInput(i, j);
                } else {
                    selectDaemonInput(i, j);
                }
            };
            
            const inputObj = {
                element: hexInput,
                value: 0,
                daemon: i,
                position: j
            };
            
            daemonInputArray.push(inputObj);
            daemonSequence.appendChild(hexInput);
        }
        
        solver.daemonInputs.push(daemonInputArray);
        
        daemonContainer.appendChild(daemonHeader);
        daemonContainer.appendChild(daemonSequence);
        daemonInputsContainer.appendChild(daemonContainer);
    }
    
    daemonInputsContainer.style.display = 'block';
    hexMapping.style.display = 'block';
    solveBtn.style.display = 'block';
    
    solver.generateHexButtons('#daemonHexCodes', 'daemon-hex');
    setupDaemonHexButtons();
}

function selectDaemonInput(daemonIndex, position) {
    document.querySelectorAll('.daemon-hex-input').forEach(input => {
        input.classList.remove('selected');
    });
    
    const inputObj = solver.daemonInputs[daemonIndex][position];
    inputObj.element.classList.add('selected');
    solver.selectedDaemonInput = inputObj;
}

function clearDaemonInput(daemonIndex, position) {
    const inputObj = solver.daemonInputs[daemonIndex][position];
    
    inputObj.value = 0;
    inputObj.element.textContent = '';
    inputObj.element.classList.remove('filled');
    inputObj.element.classList.add('empty');
    
    selectDaemonInput(daemonIndex, position);
}

function setupDaemonHexButtons() {
    document.querySelectorAll('.daemon-hex').forEach(button => {
        button.onclick = () => {
            if (solver.selectedDaemonInput) {
                const value = parseInt(button.dataset.value);
                const hexCode = solver.hexCodes[value - 1];
                
                solver.selectedDaemonInput.value = value;
                solver.selectedDaemonInput.element.textContent = hexCode;
                solver.selectedDaemonInput.element.classList.remove('empty');
                solver.selectedDaemonInput.element.classList.add('filled');
                
                const daemonIndex = solver.selectedDaemonInput.daemon;
                const currentPosition = solver.selectedDaemonInput.position;
                
                for (let i = currentPosition + 1; i < 6; i++) {
                    const nextInput = solver.daemonInputs[daemonIndex][i];
                    if (nextInput.value === 0) {
                        selectDaemonInput(daemonIndex, i);
                        break;
                    }
                }
            } else {
                alert('Please select a daemon input slot first by clicking on it.');
            }
        };
    });
}

function clearDaemon(daemonIndex) {
    const daemonInputArray = solver.daemonInputs[daemonIndex];
    
    for (let inputObj of daemonInputArray) {
        inputObj.value = 0;
        inputObj.element.textContent = '';
        inputObj.element.classList.remove('filled', 'selected');
        inputObj.element.classList.add('empty');
    }
    
    solver.selectedDaemonInput = null;
}

function addHexToGrid(value) {
    if (solver.grid.every(val => val !== 0)) {
        alert('Grid is full!');
        return;
    }
    
    while (solver.currentGridPosition < solver.grid.length && solver.grid[solver.currentGridPosition] !== 0) {
        solver.currentGridPosition++;
    }
    
    if (solver.currentGridPosition < solver.grid.length) {
        solver.grid[solver.currentGridPosition] = value;
        const cell = document.getElementById(`cell-${solver.currentGridPosition}`);
        const hexCode = solver.hexCodes[value - 1];
        cell.textContent = hexCode;
        cell.classList.add('filled');
        solver.currentGridPosition++;
    } else {
        alert('Grid is full!');
    }
}

function clearGridCell(index) {
    solver.grid[index] = 0;
    const cell = document.getElementById(`cell-${index}`);
    cell.textContent = '--';
    cell.classList.remove('filled');
    
    solver.currentGridPosition = 0;
    while (solver.currentGridPosition < solver.grid.length && solver.grid[solver.currentGridPosition] !== 0) {
        solver.currentGridPosition++;
    }
}

function clearGrid() {
    for (let i = 0; i < solver.grid.length; i++) {
        solver.grid[i] = 0;
        const cell = document.getElementById(`cell-${i}`);
        if (cell) {
            cell.textContent = '--';
            cell.classList.remove('filled');
        }
    }
    solver.currentGridPosition = 0;
}

function displaySolution(solution) {
    const solutionDiv = document.getElementById('solution');
    const pathDiv = document.getElementById('solutionPath');
    const statusDiv = document.getElementById('daemonStatus');
    const solutionGridSection = document.getElementById('solutionGridSection');
    
    if (solution.count === 0) {
        pathDiv.innerHTML = '<p style="color: #ff6b6b;">No daemons can be completed with this buffer size.</p>';
        statusDiv.innerHTML = '';
        solutionGridSection.style.display = 'none';
        solutionDiv.style.display = 'block';
        return;
    }
    
    pathDiv.innerHTML = '';
    
    let statusHTML = '<div class="daemon-status">';
    statusHTML += '<h4>Unlocked Daemons:</h4>';
    for (let daemonIdx of solution.completed) {
        const daemonStr = solver.daemonSequences[daemonIdx].join(',');
        statusHTML += `<div class="unlocked-daemon">${daemonIdx + 1}. ${daemonStr}</div>`;
    }
    
    if (solution.completed.length < solver.daemonSequences.length) {
        statusHTML += '<h4>Locked Daemons:</h4>';
        for (let i = 0; i < solver.daemonSequences.length; i++) {
            if (!solution.completed.includes(i)) {
                const daemonStr = solver.daemonSequences[i].join(',');
                statusHTML += `<div class="locked-daemon">${i + 1}. ${daemonStr}</div>`;
            }
        }
    }
    
    if (solution.totalTime !== undefined && solution.totalTime !== null) {
        const minutes = Math.floor(solution.totalTime / 60);
        const seconds = Math.floor(solution.totalTime % 60);
        const milliseconds = Math.floor((solution.totalTime % 1) * 1000);
        
        statusHTML += `<div class="solution-stats" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(0, 255, 65, 0.3);">`;
        statusHTML += `<h4>Solution Statistics:</h4>`;
        statusHTML += `<div>Selected Grid Size: ${solver.gridWidth}x${solver.gridHeight}</div>`;
        statusHTML += `<div>Selected Buffer Size: ${solver.bufferSize}</div>`;
        statusHTML += `<div>Paths Explored: ${solution.processedPaths || 'Unknown'}</div>`;
        statusHTML += `<div>Time: ${minutes}m ${seconds}s ${milliseconds}ms</div>`;
        statusHTML += `</div>`;
    } else {
        statusHTML += `<div class="solution-stats" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(0, 255, 65, 0.3);">`;
        statusHTML += `<h4>Solution Statistics:</h4>`;
        statusHTML += `<div>Selected Grid Size: ${solver.gridWidth}x${solver.gridHeight}</div>`;
        statusHTML += `<div>Selected Buffer Size: ${solver.bufferSize}</div>`;
        statusHTML += `<div>Paths Explored: ${solution.processedPaths || 'Unknown'}</div>`;
        statusHTML += `<div>Time: Not available</div>`;
        statusHTML += `</div>`;
    }
    
    statusHTML += '</div>';
    
    statusDiv.innerHTML = statusHTML;
    
    displaySolutionGrid(solution);
    
    solutionDiv.style.display = 'block';
    solutionGridSection.style.display = 'block';
    document.getElementById('resetBtn').style.display = 'block';
}

function displaySolutionGrid(solution) {
    const coords = solution.coords.split(';');
    const solutionMap = {};
    
    for (let step = 0; step < coords.length; step++) {
        const [row, col] = coords[step].split(',').map(Number);
        const idx = row * solver.gridWidth + col;
        solutionMap[idx] = step + 1;
    }
    
    let gridHTML = '<div class="grid-wrapper"><div class="solution-grid-container">';
    gridHTML += '<div class="grid" style="grid-template-columns: repeat(' + solver.gridWidth + ', 1fr);">';
    
    for (let i = 0; i < solver.gridHeight; i++) {
        for (let j = 0; j < solver.gridWidth; j++) {
            const idx = i * solver.gridWidth + j;
            const num = solver.grid[idx];
            let cellContent = '';
            let cellClass = 'grid-cell';
            
            if (num > 0) {
                const hexCode = solver.hexCodes[num - 1];
                if (idx in solutionMap) {
                    const stepNum = solutionMap[idx];
                    cellContent = `<div class="hex-code">${hexCode}</div><div class="step-number">${stepNum}</div>`;
                    cellClass += ' solution-path';
                } else {
                    cellContent = hexCode;
                }
            } else {
                cellContent = '--';
            }
            
            gridHTML += `<div class="${cellClass}">${cellContent}</div>`;
        }
    }
    
    gridHTML += '</div></div></div>';
    document.getElementById('solutionGrid').innerHTML = gridHTML;
}

function reset() {
    if (solver.worker) {
        solver.worker.terminate();
        solver.worker = null;
    }
    
    solver.hideProgressUI();
    
    document.getElementById('gridContainer').style.display = 'none';
    document.getElementById('daemonSetup').style.display = 'none';
    document.getElementById('daemonInputs').style.display = 'none';
    document.getElementById('daemonHexMapping').style.display = 'none';
    document.getElementById('solveBtn').style.display = 'none';
    document.getElementById('solution').style.display = 'none';
    document.getElementById('solutionGridSection').style.display = 'none';
    document.getElementById('resetBtn').style.display = 'none';
    
    document.querySelectorAll('#gridSizeButtons .option-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#bufferSizeButtons .option-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#daemonCountButtons .option-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#gridSizeButtons .option-btn[data-size="5"]').classList.add('active');
    document.querySelector('#bufferSizeButtons .option-btn[data-buffer="4"]').classList.add('active');
    document.querySelector('#daemonCountButtons .option-btn[data-count="1"]').classList.add('active');
    
    solver.grid = [];
    solver.daemonSequences = [];
    solver.daemonInputs = [];
    solver.currentGridPosition = 0;
    solver.selectedDaemonInput = null;
    solver.gridWidth = solver.gridHeight = 5;
    solver.bufferSize = 4;
    solver.daemonCount = 1;
}

document.addEventListener('DOMContentLoaded', function() {
    solver.generateHexButtons('#gridHexCodes');
    solver.generateHexButtons('#daemonHexCodes', 'daemon-hex');
});