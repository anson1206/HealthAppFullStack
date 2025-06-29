import { processHeartRateData } from "../HealthMetrics/HeartRateProcessor";
import { processActiveEnergyData } from "../HealthMetrics/ProcessActiveEnergy";
import { processWorkoutData } from "../fileprocessing/processWorkoutData";

//compresses health data by sampling heart rate and energy data
export const compressHealthData = (healthData) => {
    const compressed = {
        heartRates: [],
        energyData: [],
        workouts: healthData.workouts || [] // Keep workouts as is
    };
    
    // Sample heart rate data - keep every 5th reading
    if (healthData.heartRates && healthData.heartRates.length > 0) {
        compressed.heartRates = healthData.heartRates.filter((_, index) => index % 5 === 0);
        console.log(`Heart rate data compressed: ${healthData.heartRates.length} → ${compressed.heartRates.length}`);
    }
    
    // Sample energy data - keep every 3rd reading
    if (healthData.energyData && healthData.energyData.length > 0) {
        compressed.energyData = healthData.energyData.filter((_, index) => index % 3 === 0);
        console.log(`Energy data compressed: ${healthData.energyData.length} → ${compressed.energyData.length}`);
    }
    
    return compressed;
};

export function processFile(fileContent) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, "text/xml");

        const heartRates = processHeartRateData(xmlDoc);
        const energyData = processActiveEnergyData(xmlDoc);
        const workouts = processWorkoutData(xmlDoc);

        return { heartRates, energyData, workouts };
    } catch (error) {
        console.error("Error processing file:", error);
        return { error: "Failed to process file. Please ensure it is a valid HealthKit XML file." };
    }
}