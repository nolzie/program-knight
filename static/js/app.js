// Program Knight - Main Application

console.log('Program Knight loaded!');

// DOM Elements
const addExerciseBtn = document.getElementById('add-exercise-btn');
const addExerciseModal = document.getElementById('add-exercise-modal');
const cancelModalBtn = document.getElementById('cancel-modal');
const exerciseSearch = document.getElementById('exercise-search');
const movementPatternFilter = document.getElementById('movement-pattern-filter');
const exerciseList = document.getElementById('exercise-list');
const calendarDays = document.querySelectorAll('.calendar-day');

// Exercise Config Modal Elements
const exerciseConfigModal = document.getElementById('exercise-config-modal');
const cancelConfigModalBtn = document.getElementById('cancel-config-modal');
const saveExerciseConfigBtn = document.getElementById('save-exercise-config');
const configExerciseName = document.getElementById('config-exercise-name');
const configExerciseMuscle = document.getElementById('config-exercise-muscle');
const configSetsInput = document.getElementById('config-sets');
const setsContainer = document.getElementById('sets-container');

// Track current filters
let currentSearchTerm = '';
let currentMovementPattern = '';

// Store exercises globally
let exercises = [];

// Track current exercise being configured
let currentExerciseConfig = null;
let currentTargetDay = null;

// Track program data: { dayIndex: [exerciseData, ...], ... }
// dayIndex: 0=Mon, 1=Tue, ..., 6=Sun
let programData = {};

// Initialize program data structure
function initProgramData() {
    for (let i = 0; i < 7; i++) {
        programData[i] = [];
    }
}

// Movement patterns we care about
const MOVEMENT_PATTERNS = [
    { key: 'horizontal_push', label: 'Horizontal Push (Bench, Push-ups)' },
    { key: 'vertical_push', label: 'Vertical Push (Overhead Press)' },
    { key: 'horizontal_pull', label: 'Horizontal Pull (Rows)' },
    { key: 'vertical_pull', label: 'Vertical Pull (Pull-ups, Lat Pulldown)' },
    { key: 'squat', label: 'Squat Pattern' },
    { key: 'hinge', label: 'Hinge Pattern (Deadlift, RDL)' },
    { key: 'carry', label: 'Carry/Loaded Movement' }
];

// Target volume ranges per muscle group (sets per week)
const VOLUME_TARGETS = {
    'Chest': { min: 12, max: 20 },
    'Upper Chest': { min: 8, max: 16 },
    'Back': { min: 12, max: 20 },
    'Lats': { min: 10, max: 18 },
    'Upper Back': { min: 10, max: 18 },
    'Quads': { min: 10, max: 16 },
    'Hamstrings': { min: 8, max: 14 },
    'Glutes': { min: 8, max: 14 },
    'Shoulders': { min: 12, max: 20 },
    'Side Delts': { min: 12, max: 20 },
    'Rear Delts': { min: 10, max: 18 },
    'Front Delts': { min: 8, max: 14 },
    'Biceps': { min: 10, max: 18 },
    'Triceps': { min: 10, max: 18 },
    'Brachialis': { min: 8, max: 14 },
    'Calves': { min: 8, max: 14 },
    'Abs': { min: 10, max: 20 },
    'Core': { min: 10, max: 20 },
    'Forearms': { min: 8, max: 12 },
    'Traps': { min: 8, max: 14 },
    'Glute Medius': { min: 8, max: 14 },
    'Adductors': { min: 6, max: 12 },
    'Tibialis': { min: 6, max: 12 },
    'Hip Flexors': { min: 6, max: 10 },
    'Rotator Cuff': { min: 8, max: 14 },
    'Rhomboids': { min: 8, max: 14 },
    'Obliques': { min: 8, max: 14 },
    'Lower Back': { min: 10, max: 16 }
};

// Update the metrics UI using the metrics framework
function updateMetricsUI() {
    const metricsContainer = document.getElementById('metrics-container');
    if (!metricsContainer) {
        console.warn('Metrics container not found');
        return;
    }
    
    // Check if MetricRegistry is available (metrics.js loaded)
    if (typeof MetricRegistry === 'undefined') {
        console.warn('MetricRegistry not available - metrics.js not loaded');
        // Fallback: just clear container
        metricsContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Metrics loading...</p>';
        return;
    }
    
    // Get all registered metrics
    const allMetrics = MetricRegistry.getAll();
    
    if (allMetrics.length === 0) {
        metricsContainer.innerHTML = '<p class="col-span-full text-center text-gray-500 p-4">No metrics registered</p>';
        return;
    }
    
    // Clear container and rebuild
    metricsContainer.innerHTML = '';
    
    // Create a card for each metric
    allMetrics.forEach(metric => {
        const metricCard = document.createElement('div');
        metricCard.className = 'bg-white rounded-xl shadow-md p-4';
        metricCard.innerHTML = `
            <h3 class="text-lg font-semibold text-knight-blue-deep mb-3">${metric.name}</h3>
            ${metric.description ? `<p class="text-sm text-gray-500 mb-3">${metric.description}</p>` : ''}
            <div class="metric-content"></div>
        `;
        
        const contentDiv = metricCard.querySelector('.metric-content');
        
        try {
            // Calculate metric data
            const data = metric.calculate(programData);
            // Render metric
            metric.render(contentDiv, data);
        } catch (error) {
            console.error(`Error rendering metric "${metric.name}":`, error);
            contentDiv.innerHTML = '<p class="text-red-500 text-sm">Error calculating metric</p>';
        }
        
        metricsContainer.appendChild(metricCard);
    });
}

// Get day index from calendar day element
function getDayIndex(dayElement) {
    const days = Array.from(calendarDays);
    return days.indexOf(dayElement);
}

initProgramData();

// Modal functionality
addExerciseBtn.addEventListener('click', () => {
    addExerciseModal.classList.remove('hidden');
    // Clear form
    document.getElementById('new-exercise-name').value = '';
    document.getElementById('new-exercise-primary-muscle').value = '';
    document.getElementById('new-exercise-movement-pattern').value = '';
    document.getElementById('new-exercise-equipment').value = '';
    document.getElementById('aux-muscles-container').innerHTML = '';
});

cancelModalBtn.addEventListener('click', () => {
    addExerciseModal.classList.add('hidden');
});

addExerciseModal.addEventListener('click', (e) => {
    if (e.target === addExerciseModal) {
        addExerciseModal.classList.add('hidden');
    }
});

// Add auxiliary muscle input
const addAuxMuscleBtn = document.getElementById('add-aux-muscle-btn');
const auxMusclesContainer = document.getElementById('aux-muscles-container');

addAuxMuscleBtn.addEventListener('click', () => {
    const auxMuscleRow = document.createElement('div');
    auxMuscleRow.className = 'flex items-center gap-2 aux-muscle-row';
    auxMuscleRow.innerHTML = `
        <select class="aux-muscle-select flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-knight-blue">
            <option value="">Select muscle...</option>
            <option value="Chest">Chest</option>
            <option value="Upper Chest">Upper Chest</option>
            <option value="Back">Back</option>
            <option value="Lats">Lats</option>
            <option value="Upper Back">Upper Back</option>
            <option value="Quads">Quads</option>
            <option value="Hamstrings">Hamstrings</option>
            <option value="Glutes">Glutes</option>
            <option value="Shoulders">Shoulders</option>
            <option value="Side Delts">Side Delts</option>
            <option value="Rear Delts">Rear Delts</option>
            <option value="Front Delts">Front Delts</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Brachialis">Brachialis</option>
            <option value="Calves">Calves</option>
            <option value="Abs">Abs</option>
            <option value="Core">Core</option>
            <option value="Forearms">Forearms</option>
            <option value="Traps">Traps</option>
            <option value="Glute Medius">Glute Medius</option>
            <option value="Adductors">Adductors</option>
            <option value="Tibialis">Tibialis</option>
            <option value="Lower Back">Lower Back</option>
            <option value="Hip Flexors">Hip Flexors</option>
            <option value="Rotator Cuff">Rotator Cuff</option>
            <option value="Rhomboids">Rhomboids</option>
            <option value="Obliques">Obliques</option>
        </select>
        <input type="number" class="aux-muscle-percentage w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-knight-blue" placeholder="%" min="1" max="100" value="50">
        <button class="remove-aux-muscle text-red-500 hover:text-red-700 px-2" title="Remove">×</button>
    `;
    
    auxMuscleRow.querySelector('.remove-aux-muscle').addEventListener('click', () => {
        auxMuscleRow.remove();
    });
    
    auxMusclesContainer.appendChild(auxMuscleRow);
});

// Save new exercise
document.getElementById('save-new-exercise').addEventListener('click', () => {
    const name = document.getElementById('new-exercise-name').value.trim();
    const primaryMuscle = document.getElementById('new-exercise-primary-muscle').value;
    const movementPattern = document.getElementById('new-exercise-movement-pattern').value;
    const equipment = document.getElementById('new-exercise-equipment').value;
    
    if (!name || !primaryMuscle || !movementPattern || !equipment) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Collect auxiliary muscles
    const auxiliaryMuscles = {};
    document.querySelectorAll('.aux-muscle-row').forEach(row => {
        const muscle = row.querySelector('.aux-muscle-select').value;
        const percentage = parseInt(row.querySelector('.aux-muscle-percentage').value);
        if (muscle && percentage) {
            auxiliaryMuscles[muscle] = percentage;
        }
    });
    
    // Create new exercise
    const newExercise = {
        id: Math.max(...exercises.map(e => e.id), 0) + 1,
        name: name,
        primary_muscle: primaryMuscle,
        auxiliary_muscles: auxiliaryMuscles,
        movement_pattern: movementPattern,
        equipment: equipment
    };
    
    // Add to exercises array
    exercises.push(newExercise);
    
    // Save custom exercises to localStorage
    saveCustomExercises();
    
    // Re-render exercise list
    renderExercises(exercises);
    
    // Close modal
    addExerciseModal.classList.add('hidden');
    
    console.log('Added new exercise:', newExercise);
});

// Save custom exercises to localStorage
function saveCustomExercises() {
    const customExercises = exercises.filter(e => e.id > 75); // Only save custom exercises
    localStorage.setItem('customExercises', JSON.stringify(customExercises));
}

// Load custom exercises from localStorage
function loadCustomExercises() {
    const saved = localStorage.getItem('customExercises');
    if (saved) {
        const customExercises = JSON.parse(saved);
        customExercises.forEach(exercise => {
            // Check if exercise already exists
            if (!exercises.find(e => e.id === exercise.id)) {
                exercises.push(exercise);
            }
        });
    }
}

// Exercise Config Modal functionality
function openExerciseConfigModal(exercise, targetDay) {
    currentExerciseConfig = exercise;
    currentTargetDay = targetDay;
    
    configExerciseName.textContent = exercise.name;
    configExerciseMuscle.textContent = `${exercise.primary_muscle} • ${exercise.movement_pattern.replace(/_/g, ' ')}`;
    configSetsInput.value = 3;
    
    generateSetRows(3);
    exerciseConfigModal.classList.remove('hidden');
}

function generateSetRows(numSets) {
    setsContainer.innerHTML = '';
    for (let i = 1; i <= numSets; i++) {
        const setRow = document.createElement('div');
        setRow.className = 'flex items-center gap-3';
        setRow.innerHTML = `
            <span class="text-sm font-medium text-gray-600 w-12">Set ${i}</span>
            <div class="flex-1">
                <input type="number" placeholder="Reps" min="1" max="100" value="10"
                       class="set-reps w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-knight-blue">
            </div>
            <div class="flex-1">
                <select class="set-rir w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-knight-blue">
                    <option value="0">RIR 0 (Failure)</option>
                    <option value="1">RIR 1</option>
                    <option value="2" selected>RIR 2</option>
                    <option value="3">RIR 3</option>
                    <option value="4">RIR 4+</option>
                </select>
            </div>
        `;
        setsContainer.appendChild(setRow);
    }
}

configSetsInput.addEventListener('input', (e) => {
    const numSets = parseInt(e.target.value) || 3;
    if (numSets >= 1 && numSets <= 10) {
        generateSetRows(numSets);
    }
});

cancelConfigModalBtn.addEventListener('click', () => {
    exerciseConfigModal.classList.add('hidden');
    currentExerciseConfig = null;
    currentTargetDay = null;
});

exerciseConfigModal.addEventListener('click', (e) => {
    if (e.target === exerciseConfigModal) {
        exerciseConfigModal.classList.add('hidden');
        currentExerciseConfig = null;
        currentTargetDay = null;
    }
});

saveExerciseConfigBtn.addEventListener('click', () => {
    if (!currentExerciseConfig || !currentTargetDay) return;
    
    const numSets = parseInt(configSetsInput.value) || 3;
    const setRows = setsContainer.querySelectorAll('.flex');
    const sets = [];
    
    setRows.forEach((row, index) => {
        const reps = row.querySelector('.set-reps').value || 10;
        const rir = row.querySelector('.set-rir').value || 2;
        sets.push({
            set: index + 1,
            reps: parseInt(reps),
            rir: parseInt(rir)
        });
    });
    
    // Get day index and save to program data
    const dayIndex = getDayIndex(currentTargetDay);
    if (dayIndex !== -1) {
        const exerciseEntry = {
            exercise: currentExerciseConfig,
            sets: sets,
            id: Date.now() // Unique ID for this exercise instance
        };
        programData[dayIndex].push(exerciseEntry);
        
        // Add exercise to calendar day with delete button
        addExerciseToCalendarUI(currentTargetDay, exerciseEntry, dayIndex);
    }
    
    // Update metrics
    updateMetricsUI();
    
    // Close modal
    exerciseConfigModal.classList.add('hidden');
    currentExerciseConfig = null;
    currentTargetDay = null;
});

// Function to add exercise element to calendar with delete functionality
function addExerciseToCalendarUI(dayElement, exerciseEntry, dayIndex) {
    const placeholder = dayElement.querySelector('.text-gray-400');
    if (placeholder) placeholder.remove();
    
    const exerciseEl = document.createElement('div');
    exerciseEl.className = 'exercise-entry bg-knight-blue text-white p-2 rounded mb-2 text-sm relative group';
    exerciseEl.dataset.exerciseId = exerciseEntry.id;
    exerciseEl.dataset.dayIndex = dayIndex;
    exerciseEl.innerHTML = `
        <button class="delete-exercise absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600" title="Delete exercise">
            ×
        </button>
        <div class="font-medium pr-4">${exerciseEntry.exercise.name}</div>
        <div class="text-xs opacity-75">${exerciseEntry.sets.length} sets • ${exerciseEntry.sets.map(s => `${s.reps}@${s.rir}RIR`).join(', ')}</div>
    `;
    
    // Add delete event listener
    const deleteBtn = exerciseEl.querySelector('.delete-exercise');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteExerciseFromDay(dayIndex, exerciseEntry.id, exerciseEl, dayElement);
    });
    
    dayElement.appendChild(exerciseEl);
}

// Function to delete exercise from a day
function deleteExerciseFromDay(dayIndex, exerciseId, exerciseElement, dayElement) {
    // Remove from programData
    programData[dayIndex] = programData[dayIndex].filter(entry => entry.id !== exerciseId);
    
    // Remove from UI
    exerciseElement.remove();
    
    // If no exercises left, show placeholder
    const remainingExercises = dayElement.querySelectorAll('.exercise-entry');
    if (remainingExercises.length === 0) {
        dayElement.innerHTML = '<span class="text-sm text-gray-400">Drop here</span>';
    }
    
    // Update metrics
    updateMetricsUI();
    
    console.log('Deleted exercise from day', dayIndex);
}

// Save/Export/Import button event listeners
document.getElementById('save-program-btn').addEventListener('click', () => {
    saveProgramToLocalStorage();
    alert('Program saved successfully!');
});

document.getElementById('export-program-btn').addEventListener('click', () => {
    const filename = prompt('Enter program name (optional):', 'my-program');
    exportProgramToFile(filename);
});

document.getElementById('import-program-btn').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
});

document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (confirm('This will replace your current program. Continue?')) {
            importProgramFromFile(file);
        }
    }
    // Reset input so same file can be selected again
    e.target.value = '';
});

// Helper function to format auxiliary muscles
function formatAuxMuscles(auxMuscles) {
    if (!auxMuscles || Object.keys(auxMuscles).length === 0) {
        return 'None';
    }
    return Object.entries(auxMuscles)
        .map(([muscle, efficiency]) => `${muscle} (${efficiency}%)`)
        .join(', ');
}

// Render exercises in the sidebar
function renderExercises(exercisesToRender) {
    exerciseList.innerHTML = exercisesToRender.map(exercise => `
        <div class="exercise-card bg-gray-50 p-3 rounded-lg cursor-move hover:shadow-md transition border-l-4 border-knight-blue" data-id="${exercise.id}">
            <h3 class="font-medium text-gray-800">${exercise.name}</h3>
            <p class="text-sm text-knight-grey">${exercise.primary_muscle} • ${formatAuxMuscles(exercise.auxiliary_muscles)}</p>
            <p class="text-xs text-gray-400 mt-1">${exercise.equipment}</p>
        </div>
    `).join('');
    
    // Re-attach drag listeners to new cards
    setupDragListeners();
}

// Filter function that combines search and movement pattern
function applyFilters() {
    const filtered = exercises.filter(exercise => {
        // Check search term
        const matchesSearch = !currentSearchTerm || 
            exercise.name.toLowerCase().includes(currentSearchTerm) ||
            exercise.primary_muscle.toLowerCase().includes(currentSearchTerm) ||
            exercise.equipment.toLowerCase().includes(currentSearchTerm);
        
        // Check movement pattern
        const matchesPattern = !currentMovementPattern || 
            exercise.movement_pattern === currentMovementPattern;
        
        return matchesSearch && matchesPattern;
    });
    renderExercises(filtered);
}

// Search functionality
exerciseSearch.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value.toLowerCase();
    applyFilters();
});

// Movement pattern filter
movementPatternFilter.addEventListener('change', (e) => {
    currentMovementPattern = e.target.value;
    applyFilters();
});

// Drag and drop setup
function setupDragListeners() {
    const exerciseCards = document.querySelectorAll('.exercise-card');
    exerciseCards.forEach(card => {
        card.setAttribute('draggable', 'true');
        
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'copy';
            card.style.opacity = '0.5';
            const exerciseId = card.dataset.id;
            e.dataTransfer.setData('text/plain', exerciseId);
            console.log('Started dragging:', card.querySelector('h3').textContent);
        });
        
        card.addEventListener('dragend', () => {
            card.style.opacity = '1';
        });
    });
}

calendarDays.forEach(day => {
    day.addEventListener('dragover', (e) => {
        e.preventDefault();
        day.classList.add('drag-over');
    });
    
    day.addEventListener('dragleave', () => {
        day.classList.remove('drag-over');
    });
    
    day.addEventListener('drop', (e) => {
        e.preventDefault();
        day.classList.remove('drag-over');
        const exerciseId = e.dataTransfer.getData('text/plain');
        const exercise = exercises.find(ex => ex.id == exerciseId);
        
        if (exercise) {
            console.log('Dropped exercise:', exercise.name);
            openExerciseConfigModal(exercise, day);
        }
    });
});

// Fetch exercises from API
async function loadExercises() {
    try {
        const response = await fetch('/api/exercises');
        exercises = await response.json();
        console.log('Loaded', exercises.length, 'exercises');
        renderExercises(exercises);
    } catch (error) {
        console.error('Error loading exercises:', error);
        exerciseList.innerHTML = '<p class="text-red-500 text-sm">Error loading exercises. Please refresh.</p>';
    }
}

// Load exercises when page loads
loadExercises();

// Load custom exercises from localStorage after base exercises load
setTimeout(() => {
    loadCustomExercises();
    renderExercises(exercises);
}, 100);

// Initialize metrics after page loads
document.addEventListener('DOMContentLoaded', () => {
    // Register built-in metrics if MetricRegistry is available
    if (typeof MetricRegistry !== 'undefined') {
        // Register example metrics (Volume Per Muscle, Movement Patterns, etc.)
        if (typeof VolumePerMuscleMetric !== 'undefined') {
            MetricRegistry.register(VolumePerMuscleMetric);
        }
        if (typeof MovementPatternsMetric !== 'undefined') {
            MetricRegistry.register(MovementPatternsMetric);
        }
        if (typeof WeeklyOverviewMetric !== 'undefined') {
            MetricRegistry.register(WeeklyOverviewMetric);
        }
        if (typeof TrainingSplitMetric !== 'undefined') {
            MetricRegistry.register(TrainingSplitMetric);
        }
        
        // Initial metrics render
        updateMetricsUI();
    }
    
    // Load saved program data if exists
    loadProgramFromLocalStorage();
});

// ==================== LOCAL SAVE/LOAD FUNCTIONALITY ====================

// Save program to localStorage
function saveProgramToLocalStorage() {
    const programDataToSave = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        programData: programData,
        exercises: exercises.filter(e => e.id <= 75).map(e => e.id) // Save refs to base exercises
    };
    
    localStorage.setItem('programKnightProgram', JSON.stringify(programDataToSave));
    console.log('Program saved to localStorage');
    
    // Also trigger auto-save to file
    autoSaveToFile();
}

// Load program from localStorage
function loadProgramFromLocalStorage() {
    const saved = localStorage.getItem('programKnightProgram');
    if (!saved) {
        console.log('No saved program found in localStorage');
        return;
    }
    
    try {
        const savedData = JSON.parse(saved);
        
        if (savedData.programData) {
            // Clear current program data
            initProgramData();
            
            // Restore program data
            Object.keys(savedData.programData).forEach(dayIndex => {
                const dayExercises = savedData.programData[dayIndex];
                programData[dayIndex] = dayExercises;
                
                // Re-render exercises to calendar
                const dayElement = calendarDays[dayIndex];
                if (dayElement && dayExercises.length > 0) {
                    // Clear placeholder
                    const placeholder = dayElement.querySelector('.text-gray-400');
                    if (placeholder) placeholder.remove();
                    
                    // Add exercises
                    dayExercises.forEach(exerciseEntry => {
                        addExerciseToCalendarUI(dayElement, exerciseEntry, parseInt(dayIndex));
                    });
                }
            });
            
            updateMetricsUI();
            console.log('Program loaded from localStorage (saved at:', savedData.savedAt, ')');
        }
    } catch (error) {
        console.error('Error loading program from localStorage:', error);
    }
}

// Auto-save program data to a JSON file
function autoSaveToFile() {
    const programDataToSave = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        programData: programData
    };
    
    const blob = new Blob([JSON.stringify(programDataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a hidden download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `program-knight-autosave-${new Date().toISOString().split('T')[0]}.json`;
    
    // Store the URL for manual download
    window.lastAutoSaveUrl = url;
    window.lastAutoSaveFilename = downloadLink.download;
    
    console.log('Program auto-saved (ready for download)');
}

// Export program to JSON file
function exportProgramToFile(filename = null) {
    const programDataToSave = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        programName: filename || 'My Program',
        programData: programData,
        exercises: exercises.filter(e => e.id <= 75).map(e => ({ id: e.id, name: e.name }))
    };
    
    const blob = new Blob([JSON.stringify(programDataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename ? `${filename}.json` : `program-knight-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    URL.revokeObjectURL(url);
    console.log('Program exported to file');
}

// Import program from JSON file
function importProgramFromFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (importedData.programData) {
                // Clear current calendar
                calendarDays.forEach((day, index) => {
                    day.innerHTML = '<span class="text-sm text-gray-400">Drop here</span>';
                });
                
                // Clear program data
                initProgramData();
                
                // Restore program data
                Object.keys(importedData.programData).forEach(dayIndex => {
                    const dayExercises = importedData.programData[dayIndex];
                    programData[dayIndex] = dayExercises;
                    
                    // Re-render exercises to calendar
                    const dayElement = calendarDays[dayIndex];
                    if (dayElement && dayExercises.length > 0) {
                        // Clear placeholder
                        const placeholder = dayElement.querySelector('.text-gray-400');
                        if (placeholder) placeholder.remove();
                        
                        // Add exercises
                        dayExercises.forEach(exerciseEntry => {
                            addExerciseToCalendarUI(dayElement, exerciseEntry, parseInt(dayIndex));
                        });
                    }
                });
                
                // Save to localStorage
                saveProgramToLocalStorage();
                
                // Update metrics
                updateMetricsUI();
                
                alert('Program imported successfully!');
                console.log('Program imported from file (exported at:', importedData.exportedAt, ')');
            } else {
                alert('Invalid program file format');
            }
        } catch (error) {
            console.error('Error importing program:', error);
            alert('Error importing program. Please check the file format.');
        }
    };
    
    reader.readAsText(file);
}

// Auto-save when program data changes
function triggerAutoSave() {
    // Debounce auto-save to avoid saving too frequently
    if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
    }
    
    window.autoSaveTimeout = setTimeout(() => {
        saveProgramToLocalStorage();
    }, 2000); // Auto-save 2 seconds after last change
}

// Modify saveExerciseConfigBtn to trigger auto-save
saveExerciseConfigBtn.addEventListener('click', () => {
    if (!currentExerciseConfig || !currentTargetDay) return;
    
    const numSets = parseInt(configSetsInput.value) || 3;
    const setRows = setsContainer.querySelectorAll('.flex');
    const sets = [];
    
    setRows.forEach((row, index) => {
        const reps = row.querySelector('.set-reps').value || 10;
        const rir = row.querySelector('.set-rir').value || 2;
        sets.push({
            set: index + 1,
            reps: parseInt(reps),
            rir: parseInt(rir)
        });
    });
    
    // Get day index and save to program data
    const dayIndex = getDayIndex(currentTargetDay);
    if (dayIndex !== -1) {
        const exerciseEntry = {
            exercise: currentExerciseConfig,
            sets: sets,
            id: Date.now() // Unique ID for this exercise instance
        };
        programData[dayIndex].push(exerciseEntry);
        
        // Add exercise to calendar day with delete button
        addExerciseToCalendarUI(currentTargetDay, exerciseEntry, dayIndex);
    }
    
    // Update metrics
    updateMetricsUI();
    
    // Trigger auto-save
    triggerAutoSave();
    
    // Close modal
    exerciseConfigModal.classList.add('hidden');
    currentExerciseConfig = null;
    currentTargetDay = null;
});

// Modify delete function to trigger auto-save
function deleteExerciseFromDay(dayIndex, exerciseId, exerciseElement, dayElement) {
    // Remove from programData
    programData[dayIndex] = programData[dayIndex].filter(entry => entry.id !== exerciseId);
    
    // Remove from UI
    exerciseElement.remove();
    
    // If no exercises left, show placeholder
    const remainingExercises = dayElement.querySelectorAll('.exercise-entry');
    if (remainingExercises.length === 0) {
        dayElement.innerHTML = '<span class="text-sm text-gray-400">Drop here</span>';
    }
    
    // Update metrics
    updateMetricsUI();
    
    // Trigger auto-save
    triggerAutoSave();
    
    console.log('Deleted exercise from day', dayIndex);
}
