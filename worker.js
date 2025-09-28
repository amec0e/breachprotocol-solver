class BreachProtocolSolverWorker {
    constructor() {
        this.hexCodes = [];
    }

    setHexCodes(hexCodes) {
        this.hexCodes = hexCodes;
    }

    checkDaemonsCompleted(pathValues, daemonSequences) {
        const completed = [];
        
        const hexPath = pathValues.map(val => {
            const valInt = parseInt(val);
            return (valInt >= 1 && valInt <= 10) ? this.hexCodes[valInt - 1] : null;
        }).filter(hex => hex !== null);
        
        for (let d = 0; d < daemonSequences.length; d++) {
            const daemonCodes = daemonSequences[d];
            const daemonLen = daemonCodes.length;
            
            for (let start = 0; start <= hexPath.length - daemonLen; start++) {
                let match = true;
                for (let i = 0; i < daemonLen; i++) {
                    if (hexPath[start + i] !== daemonCodes[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    completed.push(d);
                    break;
                }
            }
        }
        
        return completed;
    }

    couldCompleteNewDaemon(pathValues, currentCompleted, daemonSequences) {
        const hexPath = pathValues.map(val => {
            const valInt = parseInt(val);
            return (valInt >= 1 && valInt <= 10) ? this.hexCodes[valInt - 1] : null;
        }).filter(hex => hex !== null);
        
        for (let d = 0; d < daemonSequences.length; d++) {
            if (currentCompleted.includes(d)) continue;
            
            const daemonCodes = daemonSequences[d];
            const daemonLen = daemonCodes.length;
            
            for (let start = Math.max(0, hexPath.length - daemonLen); start < hexPath.length; start++) {
                let matchLength = 0;
                for (let i = 0; i < Math.min(daemonLen, hexPath.length - start); i++) {
                    if (hexPath[start + i] === daemonCodes[i]) {
                        matchLength++;
                    } else {
                        break;
                    }
                }
                
                if (matchLength > 0 && matchLength < daemonLen) {
                    return true;
                }
            }
        }
        
        return false;
    }

    findOptimalPath(grid, gridWidth, gridHeight, bufferSize, daemonSequences, maxPaths, sortInterval, maxSolutions = 5) {
        const startTime = performance.now();
        const solutions = new Map();
        
        const queue = [];
        const visited = new Map();
        
        for (let startCol = 0; startCol < gridWidth; startCol++) {
            const startVal = grid[startCol];
            if (startVal !== 0) {
                const initialState = {
                    row: 0,
                    col: startCol,
                    isHorizontal: false,
                    path: [{row: 0, col: startCol, value: startVal}],
                    visitedCells: new Set([`0,${startCol}`]),
                    remainingMoves: bufferSize - 1,
                    completedDaemons: this.checkDaemonsCompleted([startVal], daemonSequences)
                };
                
                queue.push(initialState);
            }
        }
        
        let processedPaths = 0;
        const maxDaemons = daemonSequences.length;
        let lastProgressUpdate = 0;
        let lastSortTime = 0;
        
        while (queue.length > 0 && processedPaths < maxPaths) {
            if (processedPaths - lastProgressUpdate >= 1000) {
                const progress = Math.min((processedPaths / maxPaths) * 100, 100);
                const currentTime = performance.now();
                const elapsed = (currentTime - startTime) / 1000;
                
                const bestSolutionCount = solutions.size > 0 ? 
                    Math.max(...Array.from(solutions.values()).map(s => s.count)) : 0;
                
                postMessage({
                    type: 'progress',
                    progress: progress,
                    processedPaths: processedPaths,
                    maxPaths: maxPaths,
                    daemonsFound: bestSolutionCount,
                    totalDaemons: maxDaemons,
                    elapsedTime: elapsed
                });
                
                lastProgressUpdate = processedPaths;
            }
            
            if (processedPaths - lastSortTime >= sortInterval) {
                queue.sort((a, b) => {
                    const aCompleted = a.completedDaemons.length;
                    const bCompleted = b.completedDaemons.length;
                    if (aCompleted !== bCompleted) return bCompleted - aCompleted;
                    return a.path.length - b.path.length;
                });
                lastSortTime = processedPaths;
            }
            
            const current = queue.shift();
            processedPaths++;
            
            const pathValues = current.path.map(p => p.value);
            const completed = this.checkDaemonsCompleted(pathValues, daemonSequences);
            const count = completed.length;
            const length = current.path.length;
            const daemonKey = completed.sort((a, b) => a - b).join(',');
            
            if (!solutions.has(daemonKey) || 
                count > solutions.get(daemonKey).count ||
                (count === solutions.get(daemonKey).count && length < solutions.get(daemonKey).length)) {
                
                const coords = current.path.map(p => `${p.row},${p.col}`).join(';');
                const values = current.path.map(p => p.value.toString()).join(';');
                
                solutions.set(daemonKey, {
                    path: [...current.path],
                    completed: [...completed],
                    count: count,
                    length: length,
                    coords: coords,
                    values: values
                });
            }
            
            const stateKey = `${current.row},${current.col},${current.isHorizontal},${Array.from(current.visitedCells).sort().join('|')}`;
            
            if (visited.has(stateKey)) {
                const prevResult = visited.get(stateKey);
                if (prevResult.count >= count && prevResult.length <= length) {
                    continue;
                }
            }
            
            visited.set(stateKey, { count, length });
            
            if (count === maxDaemons) {

            }
            
            if (current.remainingMoves > 0) {
                const nextMoves = [];
                
                if (!current.isHorizontal) {
                    for (let newRow = 0; newRow < gridHeight; newRow++) {
                        const cellKey = `${newRow},${current.col}`;
                        if (newRow !== current.row && !current.visitedCells.has(cellKey)) {
                            const idx = newRow * gridWidth + current.col;
                            if (idx < grid.length) {
                                const val = grid[idx];
                                if (val !== 0) {
                                    nextMoves.push({
                                        row: newRow,
                                        col: current.col,
                                        value: val,
                                        isHorizontal: true
                                    });
                                }
                            }
                        }
                    }
                } else {
                    for (let newCol = 0; newCol < gridWidth; newCol++) {
                        const cellKey = `${current.row},${newCol}`;
                        if (newCol !== current.col && !current.visitedCells.has(cellKey)) {
                            const idx = current.row * gridWidth + newCol;
                            if (idx < grid.length) {
                                const val = grid[idx];
                                if (val !== 0) {
                                    nextMoves.push({
                                        row: current.row,
                                        col: newCol,
                                        value: val,
                                        isHorizontal: false
                                    });
                                }
                            }
                        }
                    }
                }
                
                for (const move of nextMoves) {
                    const newVisited = new Set(current.visitedCells);
                    newVisited.add(`${move.row},${move.col}`);
                    
                    const newPath = [...current.path, {
                        row: move.row, 
                        col: move.col, 
                        value: move.value
                    }];
                    
                    const newPathValues = newPath.map(p => p.value);
                    const newCompleted = this.checkDaemonsCompleted(newPathValues, daemonSequences);
                    
                    if (current.path.length > 3 && newCompleted.length <= current.completedDaemons.length) {
                        const couldComplete = this.couldCompleteNewDaemon(newPathValues, current.completedDaemons, daemonSequences);
                        if (!couldComplete) {
                            continue;
                        }
                    }
                    
                    queue.push({
                        row: move.row,
                        col: move.col,
                        isHorizontal: move.isHorizontal,
                        path: newPath,
                        visitedCells: newVisited,
                        remainingMoves: current.remainingMoves - 1,
                        completedDaemons: newCompleted
                    });
                }
            }
        }
        
        const endTime = performance.now();
        const totalTime = (endTime - startTime) / 1000;
        const solutionArray = Array.from(solutions.values())
            .filter(solution => solution.count > 0)
            .sort((a, b) => {
                if (a.count !== b.count) return b.count - a.count;
                return a.length - b.length;
            })
            .slice(0, maxSolutions);
        
        if (solutionArray.length === 0) {
            return {
                solutions: [],
                processedPaths: processedPaths,
                totalTime: totalTime
            };
        }
        
        return {
            solutions: solutionArray,
            processedPaths: processedPaths,
            totalTime: totalTime
        };
    }
}

const solverWorker = new BreachProtocolSolverWorker();

self.onmessage = function(e) {
    const { grid, gridWidth, gridHeight, bufferSize, daemonSequences, maxPaths, sortInterval, hexCodes, maxSolutions } = e.data;
    solverWorker.setHexCodes(hexCodes);
    const result = solverWorker.findOptimalPath(grid, gridWidth, gridHeight, bufferSize, daemonSequences, maxPaths, sortInterval, maxSolutions);
    
    postMessage({
        type: 'complete',
        result: result
    });
};