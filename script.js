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
        this.maxSolutions = 20;
        this.currentSolutions = [];
        this.selectedSolutionIndex = 0;
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
                <div>Daemons Found: ${daemonsFound}/${this.daemonSequences.length}</div>
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
        this.currentSolutions = [];
        this.selectedSolutionIndex = 0;
        
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
                    this.displaySolutions(e.data.result);
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
                hexCodes: this.hexCodes,
                maxSolutions: this.maxSolutions
            });
            
        } catch (error) {
            console.error('Error solving:', error);
            alert('An error occurred while solving. Please try again.');
            this.hideProgressUI();
            solveBtn.textContent = originalText;
            solveBtn.disabled = false;
        }
    }

    displaySolutions(result) {
        const solutions = result.solutions;
        if (!solutions || solutions.length === 0) {
            this.displayNoSolution(result);
            return;
        }

        this.currentSolutions = solutions;
        this.selectedSolutionIndex = 0;
        this.displayPrimarySolution(solutions[0], result);

        if (solutions.length > 1) {
            this.displayAlternativeSolutions(solutions);
        }

        document.getElementById('solution').style.display = 'block';
        document.getElementById('solutionGridSection').style.display = 'block';
        document.getElementById('resetBtn').style.display = 'block';
    }

    displayNoSolution(result) {
        const solutionDiv = document.getElementById('solution');
        const pathDiv = document.getElementById('solutionPath');
        const statusDiv = document.getElementById('daemonStatus');
        const solutionGridSection = document.getElementById('solutionGridSection');
        
        pathDiv.innerHTML = '<p style="color: #ff6b6b;">No daemons can be completed with this buffer size.</p>';
        statusDiv.innerHTML = '';
        solutionGridSection.style.display = 'none';
        solutionDiv.style.display = 'block';
        document.getElementById('resetBtn').style.display = 'block';
    }

    displayPrimarySolution(solution, result) {
        const solutionDiv = document.getElementById('solution');
        
        solutionDiv.innerHTML = `
            <h3>🗺️ Solution</h3>
            <div id="solutionPath"></div>
            <div id="daemonStatus"></div>
        `;
        
        const newPathDiv = document.getElementById('solutionPath');
        const newStatusDiv = document.getElementById('daemonStatus');
        
        newPathDiv.innerHTML = '';
        
        let statusHTML = '<div class="daemon-status">';
        statusHTML += '<h4>Unlocked Daemons:</h4>';
        for (let daemonIdx of solution.completed) {
            const daemonStr = this.daemonSequences[daemonIdx].join(',');
            statusHTML += `<div class="unlocked-daemon">${daemonIdx + 1}. ${daemonStr}</div>`;
        }
        
        if (solution.completed.length < this.daemonSequences.length) {
            statusHTML += '<h4>Locked Daemons:</h4>';
            for (let i = 0; i < this.daemonSequences.length; i++) {
                if (!solution.completed.includes(i)) {
                    const daemonStr = this.daemonSequences[i].join(',');
                    statusHTML += `<div class="locked-daemon">${i + 1}. ${daemonStr}</div>`;
                }
            }
        }
        
        if (result.totalTime !== undefined && result.totalTime !== null) {
            const minutes = Math.floor(result.totalTime / 60);
            const seconds = Math.floor(result.totalTime % 60);
            const milliseconds = Math.floor((result.totalTime % 1) * 1000);
            
            statusHTML += `<div class="solution-stats" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(0, 255, 65, 0.3);">`;
            statusHTML += `<h4>Solution Statistics:</h4>`;
            statusHTML += `<div>Selected Grid Size: ${this.gridWidth}x${this.gridHeight}</div>`;
            statusHTML += `<div>Selected Buffer Size: ${this.bufferSize}</div>`;
            statusHTML += `<div>Paths Explored: ${result.processedPaths || 'Unknown'}</div>`;
            statusHTML += `<div>Time: ${minutes}m ${seconds}s ${milliseconds}ms</div>`;
            statusHTML += `<div>Solutions Found: ${this.currentSolutions.length}</div>`;
            statusHTML += `</div>`;
        } else {
            statusHTML += `<div class="solution-stats" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(0, 255, 65, 0.3);">`;
            statusHTML += `<h4>Solution Statistics:</h4>`;
            statusHTML += `<div>Selected Grid Size: ${this.gridWidth}x${this.gridHeight}</div>`;
            statusHTML += `<div>Selected Buffer Size: ${this.bufferSize}</div>`;
            statusHTML += `<div>Paths Explored: ${result.processedPaths || 'Unknown'}</div>`;
            statusHTML += `<div>Time: Not available</div>`;
            statusHTML += `<div>Solutions Found: ${this.currentSolutions.length}</div>`;
            statusHTML += `</div>`;
        }
        
        statusHTML += '</div>';
        newStatusDiv.innerHTML = statusHTML;
        
        this.displaySolutionGrid(solution);
    }

    displayAlternativeSolutions(solutions) {
        const solutionDiv = document.getElementById('solution');
        
        const alternativeCount = solutions.length - 1;
        
        let alternativesHTML = `
            <div class="alternatives-section" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(0, 255, 65, 0.3);">
                <div class="alternatives-header" style="display: flex; align-items: center; gap: 10px;">
                    <h4 style="color: #ffff00; text-shadow: 0 0 5px #ffff00; margin: 0;">Alternative Solutions: ${alternativeCount} found</h4>
                    <button id="toggleAlternativesBtn" onclick="solver.toggleAlternatives()" style="
                        padding: 5px 10px; 
                        background: #00ff41; 
                        color: #000; 
                        border: none; 
                        cursor: pointer; 
                        font-family: 'Courier New', monospace; 
                        font-size: 12px; 
                        font-weight: bold;
                        border-radius: 3px;
                        transition: all 0.3s;
                    " onmouseover="this.style.background='#ffff00'" onmouseout="this.style.background='#00ff41'">Show</button>
                </div>
                <div id="alternativesList" style="display: none; margin-top: 15px;">
        `;
        
        const primarySolution = solutions[0];
        const primaryDaemonsList = primarySolution.completed.map(d => d + 1).join(', ');
        alternativesHTML += `
            <div class="alternative-solution selected" style="margin: 10px 0; padding: 10px; border: 2px solid #00ff41; background: rgba(0, 255, 65, 0.1); cursor: pointer;" 
                 onclick="solver.selectSolution(0)">
                <div style="color: #ffff00;">Solution 1 (Current) - ${primarySolution.count} daemon(s)</div>
                <div style="color: #00ff41; font-size: 14px;">Daemons: ${primaryDaemonsList}</div>
            </div>
        `;
        
        solutions.slice(1).forEach((solution, index) => {
            const daemonsList = solution.completed.map(d => d + 1).join(', ');
            alternativesHTML += `
                <div class="alternative-solution" style="margin: 10px 0; padding: 10px; border: 1px solid rgba(0, 255, 65, 0.3); cursor: pointer; transition: all 0.3s;" 
                     onclick="solver.selectSolution(${index + 1})"
                     onmouseover="this.style.borderColor='#ffff00'; this.style.backgroundColor='rgba(255, 255, 0, 0.1)'"
                     onmouseout="this.style.borderColor='rgba(0, 255, 65, 0.3)'; this.style.backgroundColor='transparent'">
                    <div style="color: #ffff00;">Solution ${index + 2} - ${solution.count} daemon(s)</div>
                    <div style="color: #00ff41; font-size: 14px;">Daemons: ${daemonsList}</div>
                </div>
            `;
        });
        
        alternativesHTML += '</div></div>';
        solutionDiv.innerHTML += alternativesHTML;
    }

    selectSolution(solutionIndex) {
        if (solutionIndex < 0 || solutionIndex >= this.currentSolutions.length) {
            return;
        }

        this.selectedSolutionIndex = solutionIndex;
        const selectedSolution = this.currentSolutions[solutionIndex];

        this.displaySolutionGrid(selectedSolution);

        document.querySelectorAll('.alternative-solution').forEach((element, index) => {
            if (index === solutionIndex) {
                element.classList.add('selected');
                element.style.border = '2px solid #00ff41';
                element.style.backgroundColor = 'rgba(0, 255, 65, 0.1)';
                const titleDiv = element.querySelector('div');
                if (titleDiv) {
                    titleDiv.textContent = titleDiv.textContent.replace(/\(Current\)/g, '').replace(/ - /, ' (Current) - ');
                }
            } else {
                element.classList.remove('selected');
                element.style.border = '1px solid rgba(0, 255, 65, 0.3)';
                element.style.backgroundColor = 'transparent';
                const titleDiv = element.querySelector('div');
                if (titleDiv) {
                    titleDiv.textContent = titleDiv.textContent.replace(' (Current)', '');
                }
            }
        });
    }

    toggleAlternatives() {
        const alternativesList = document.getElementById('alternativesList');
        const toggleBtn = document.getElementById('toggleAlternativesBtn');
        
        if (alternativesList.style.display === 'none') {
            alternativesList.style.display = 'block';
            toggleBtn.textContent = 'Hide';
        } else {
            alternativesList.style.display = 'none';
            toggleBtn.textContent = 'Show';
        }
    }

    displaySolutionGrid(solution) {
        const coords = solution.coords.split(';');
        const solutionMap = {};
        
        for (let step = 0; step < coords.length; step++) {
            const [row, col] = coords[step].split(',').map(Number);
            const idx = row * this.gridWidth + col;
            solutionMap[idx] = step + 1;
        }
        
        let gridHTML = '<div class="grid-wrapper"><div class="solution-grid-container">';
        gridHTML += '<div class="grid" style="grid-template-columns: repeat(' + this.gridWidth + ', 1fr);">';
        
        for (let i = 0; i < this.gridHeight; i++) {
            for (let j = 0; j < this.gridWidth; j++) {
                const idx = i * this.gridWidth + j;
                const num = this.grid[idx];
                let cellContent = '';
                let cellClass = 'grid-cell';
                
                if (num > 0) {
                    const hexCode = this.hexCodes[num - 1];
                    if (idx in solutionMap) {
                        const stepNum = solutionMap[idx];
                        cellContent = `<div class="hex-code">${hexCode}</div><div class="step-number">${stepNum}</div>`;
                        cellClass += ' display-solution-path';
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
    solver.currentSolutions = [];
    solver.selectedSolutionIndex = 0;
}

document.addEventListener('DOMContentLoaded', function() {
    solver.generateHexButtons('#gridHexCodes');
    solver.generateHexButtons('#daemonHexCodes', 'daemon-hex');
});