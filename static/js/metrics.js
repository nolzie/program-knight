// Program Knight - Metrics System
// This file provides an extensible framework for adding custom metrics

/**
 * METRIC COMPONENT FRAMEWORK
 * 
 * To add a new metric:
 * 
 * 1. Define your metric object with the following structure:
 *    {
 *      id: 'unique_metric_id',           // Unique identifier
 *      name: 'Metric Display Name',       // Shown in UI
 *      description: 'What this metric does', // Optional description
 *      calculate: (programData) => {     // Function that receives program data
 *        // Your calculation logic here
 *        return calculatedValue;         // Return any data structure you need
 *      },
 *      render: (container, data) => {    // Function to render the metric
 *        // container: DOM element to render into
 *        // data: result from calculate()
 *        // Build your UI here
 *      }
 *    }
 * 
 * 2. Register your metric:
 *    MetricRegistry.register(myMetric);
 * 
 * 3. That's it! The metric will automatically appear in the metrics section.
 * 
 * Example metric components are provided below.
 */

// Central registry for all metrics
const MetricRegistry = {
    metrics: [],
    
    register(metric) {
        // Validate required fields
        if (!metric.id || !metric.name || !metric.calculate || !metric.render) {
            console.error('Invalid metric format. Required: id, name, calculate, render');
            return;
        }
        
        // Check for duplicate IDs
        if (this.metrics.find(m => m.id === metric.id)) {
            console.warn(`Metric with id "${metric.id}" already exists. Overwriting.`);
            this.metrics = this.metrics.filter(m => m.id !== metric.id);
        }
        
        this.metrics.push(metric);
        console.log(`Registered metric: ${metric.name}`);
    },
    
    unregister(metricId) {
        this.metrics = this.metrics.filter(m => m.id !== metricId);
    },
    
    getAll() {
        return this.metrics;
    },
    
    getById(id) {
        return this.metrics.find(m => m.id === id);
    },
    
    // Clear all metrics (useful for testing)
    clear() {
        this.metrics = [];
    }
};

// Helper functions commonly used by metrics
const MetricHelpers = {
    // Flatten all exercises from program data
    getAllExercises(programData) {
        const exercises = [];
        Object.entries(programData).forEach(([dayIndex, dayExercises]) => {
            dayExercises.forEach(entry => {
                exercises.push({
                    ...entry,
                    dayIndex: parseInt(dayIndex)
                });
            });
        });
        return exercises;
    },
    
    // Calculate total sets for a muscle (with auxiliary weighting)
    calculateMuscleVolume(programData, muscleName, auxiliaryThreshold = 40) {
        let totalSets = 0;
        
        Object.values(programData).forEach(dayExercises => {
            dayExercises.forEach(entry => {
                const { exercise, sets } = entry;
                const numSets = sets.length;
                
                // Primary muscle
                if (exercise.primary_muscle === muscleName) {
                    totalSets += numSets;
                }
                
                // Auxiliary muscles (weighted)
                if (exercise.auxiliary_muscles && exercise.auxiliary_muscles[muscleName]) {
                    const efficiency = exercise.auxiliary_muscles[muscleName];
                    if (efficiency >= auxiliaryThreshold) {
                        totalSets += numSets * (efficiency / 100);
                    }
                }
            });
        });
        
        return Math.round(totalSets * 10) / 10;
    },
    
    // Calculate frequency (days per week) for a muscle
    calculateMuscleFrequency(programData, muscleName, auxiliaryThreshold = 40) {
        const daysHit = new Set();
        
        Object.entries(programData).forEach(([dayIndex, dayExercises]) => {
            dayExercises.forEach(entry => {
                const { exercise } = entry;
                
                // Check if this muscle is targeted on this day
                if (exercise.primary_muscle === muscleName) {
                    daysHit.add(dayIndex);
                } else if (exercise.auxiliary_muscles && exercise.auxiliary_muscles[muscleName]) {
                    if (exercise.auxiliary_muscles[muscleName] >= auxiliaryThreshold) {
                        daysHit.add(dayIndex);
                    }
                }
            });
        });
        
        return daysHit.size;
    },
    
    // Get all unique movement patterns in the program
    getMovementPatterns(programData) {
        const patterns = new Set();
        
        Object.values(programData).forEach(dayExercises => {
            dayExercises.forEach(entry => {
                if (entry.exercise.movement_pattern) {
                    patterns.add(entry.exercise.movement_pattern);
                }
            });
        });
        
        return patterns;
    },
    
    // Get all unique muscles targeted
    getAllMuscles(programData, auxiliaryThreshold = 40) {
        const muscles = new Set();
        
        Object.values(programData).forEach(dayExercises => {
            dayExercises.forEach(entry => {
                const { exercise } = entry;
                muscles.add(exercise.primary_muscle);
                
                if (exercise.auxiliary_muscles) {
                    Object.entries(exercise.auxiliary_muscles).forEach(([muscle, efficiency]) => {
                        if (efficiency >= auxiliaryThreshold) {
                            muscles.add(muscle);
                        }
                    });
                }
            });
        });
        
        return Array.from(muscles).sort();
    },
    
    // Calculate total weekly volume (all sets)
    getTotalWeeklySets(programData) {
        let total = 0;
        Object.values(programData).forEach(dayExercises => {
            dayExercises.forEach(entry => {
                total += entry.sets.length;
            });
        });
        return total;
    }
};

// ============================================================
// EXAMPLE METRIC COMPONENTS
// ============================================================

// 1. Volume Per Muscle Metric
const VolumePerMuscleMetric = {
    id: 'volume_per_muscle',
    name: 'Volume per Muscle Group',
    description: 'Shows weekly sets per muscle with target ranges',
    
    calculate(programData) {
        const muscles = MetricHelpers.getAllMuscles(programData);
        const data = [];
        
        muscles.forEach(muscle => {
            const volume = MetricHelpers.calculateMuscleVolume(programData, muscle);
            if (volume > 0) {
                data.push({
                    muscle,
                    volume,
                    target: VOLUME_TARGETS[muscle] || null
                });
            }
        });
        
        // Sort by volume descending
        return data.sort((a, b) => b.volume - a.volume);
    },
    
    render(container, data) {
        if (data.length === 0) {
            container.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    Add exercises to see volume metrics
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <table class="w-full text-sm">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="text-left p-2 rounded-tl-lg">Muscle</th>
                        <th class="text-center p-2">Sets/Week</th>
                        <th class="text-center p-2 rounded-tr-lg">Target</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${data.map(({ muscle, volume, target }) => {
                        let statusClass = 'text-gray-600';
                        let statusText = '';
                        
                        if (target) {
                            if (volume < target.min) {
                                statusClass = 'text-yellow-600';
                                statusText = '↓';
                            } else if (volume > target.max) {
                                statusClass = 'text-red-600';
                                statusText = '↑';
                            } else {
                                statusClass = 'text-green-600';
                                statusText = '✓';
                            }
                        }
                        
                        return `
                            <tr>
                                <td class="p-2">${muscle}</td>
                                <td class="text-center p-2 ${statusClass} font-medium">${volume} ${statusText}</td>
                                <td class="text-center p-2 text-gray-500">${target ? `${target.min}-${target.max}` : '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
};

// 2. Movement Patterns Metric
const MovementPatternsMetric = {
    id: 'movement_patterns',
    name: 'Movement Patterns',
    description: 'Shows which key movement patterns are covered',
    
    patterns: [
        { key: 'horizontal_push', label: 'Horizontal Push (Bench, Push-ups)' },
        { key: 'vertical_push', label: 'Vertical Push (Overhead Press)' },
        { key: 'horizontal_pull', label: 'Horizontal Pull (Rows)' },
        { key: 'vertical_pull', label: 'Vertical Pull (Pull-ups, Lat Pulldown)' },
        { key: 'squat', label: 'Squat Pattern' },
        { key: 'hinge', label: 'Hinge Pattern (Deadlift, RDL)' },
        { key: 'carry', label: 'Carry/Loaded Movement' }
    ],
    
    calculate(programData) {
        const covered = MetricHelpers.getMovementPatterns(programData);
        
        return this.patterns.map(pattern => ({
            ...pattern,
            covered: covered.has(pattern.key)
        }));
    },
    
    render(container, data) {
        container.innerHTML = `
            <div class="space-y-2">
                ${data.map(pattern => {
                    const checkboxClass = pattern.covered 
                        ? 'bg-knight-blue border-knight-blue' 
                        : 'bg-white border-gray-300';
                    const textClass = pattern.covered 
                        ? 'text-knight-blue-deep font-medium' 
                        : 'text-gray-600';
                    const checkIcon = pattern.covered 
                        ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' 
                        : '';
                    
                    return `
                        <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <div class="w-5 h-5 rounded flex items-center justify-center ${checkboxClass} border-2 transition-colors">
                                ${checkIcon}
                            </div>
                            <span class="flex-1 ${textClass}">${pattern.label}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
};

// 3. Weekly Overview Metric (example of a more complex metric)
const WeeklyOverviewMetric = {
    id: 'weekly_overview',
    name: 'Weekly Overview',
    description: 'Summary statistics for the week',
    
    calculate(programData) {
        const totalExercises = MetricHelpers.getAllExercises(programData).length;
        const totalSets = MetricHelpers.getTotalWeeklySets(programData);
        const totalMuscles = MetricHelpers.getAllMuscles(programData).length;
        const patterns = MetricHelpers.getMovementPatterns(programData);
        
        // Calculate average sets per day
        const daysWithWorkouts = Object.values(programData).filter(day => day.length > 0).length;
        const avgSetsPerDay = daysWithWorkouts > 0 ? Math.round(totalSets / daysWithWorkouts) : 0;
        
        return {
            totalExercises,
            totalSets,
            totalMuscles,
            patternsCovered: patterns.size,
            daysWithWorkouts,
            avgSetsPerDay
        };
    },
    
    render(container, data) {
        if (data.totalExercises === 0) {
            container.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    Add exercises to see weekly overview
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-knight-blue">${data.totalExercises}</div>
                    <div class="text-xs text-gray-600">Total Exercises</div>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-knight-blue">${data.totalSets}</div>
                    <div class="text-xs text-gray-600">Total Sets</div>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-knight-blue">${data.totalMuscles}</div>
                    <div class="text-xs text-gray-600">Muscles Targeted</div>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-knight-blue">${data.patternsCovered}</div>
                    <div class="text-xs text-gray-600">Movement Patterns</div>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-knight-blue">${data.daysWithWorkouts}</div>
                    <div class="text-xs text-gray-600">Training Days</div>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-knight-blue">${data.avgSetsPerDay}</div>
                    <div class="text-xs text-gray-600">Avg Sets/Day</div>
                </div>
            </div>
        `;
    }
};

// 4. Training Split Metric (shows which days have workouts)
const TrainingSplitMetric = {
    id: 'training_split',
    name: 'Training Split',
    description: 'Visual representation of training days',
    
    dayNames: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    
    calculate(programData) {
        return this.dayNames.map((name, index) => {
            const exercises = programData[index] || [];
            const totalSets = exercises.reduce((sum, entry) => sum + entry.sets.length, 0);
            
            return {
                name,
                index,
                exerciseCount: exercises.length,
                totalSets,
                hasWorkout: exercises.length > 0
            };
        });
    },
    
    render(container, data) {
        container.innerHTML = `
            <div class="flex gap-2 justify-between">
                ${data.map(day => `
                    <div class="flex-1 text-center">
                        <div class="text-xs text-gray-500 mb-1">${day.name}</div>
                        <div class="h-16 rounded-lg flex flex-col items-center justify-center ${day.hasWorkout ? 'bg-knight-blue text-white' : 'bg-gray-100 text-gray-400'}">
                            ${day.hasWorkout ? `
                                <div class="text-lg font-bold">${day.totalSets}</div>
                                <div class="text-xs opacity-75">sets</div>
                            ` : '<div class="text-xs">Rest</div>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
};

// Make metric components globally available
// (they're already defined above, this just ensures they're in global scope)
if (typeof window !== 'undefined') {
    window.MetricRegistry = MetricRegistry;
    window.MetricHelpers = MetricHelpers;
    window.VolumePerMuscleMetric = VolumePerMuscleMetric;
    window.MovementPatternsMetric = MovementPatternsMetric;
    window.WeeklyOverviewMetric = WeeklyOverviewMetric;
    window.TrainingSplitMetric = TrainingSplitMetric;
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MetricRegistry, MetricHelpers, VolumePerMuscleMetric, MovementPatternsMetric, WeeklyOverviewMetric, TrainingSplitMetric };
}
