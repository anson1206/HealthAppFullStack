import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/authContexts";
import { doSignOut } from "../firebase/auth";
import { processFile, compressHealthData } from "./fileprocessing/FileProcessor";
import HeartRateSummary from "./fileprocessing/HeartRateSummary";
import EnergySummary from "./fileprocessing/EnergySummary";
import WorkoutsPieChart from "./HealthMetrics/WorkoutPieChart";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LineChart from "./fileprocessing/LineGraph";
import { saveUserHealthData, getUserHealthData, updateUserHealthData } from "../firebase/healthDataService";
import {doc, setDoc, serverTimestamp} from 'firebase/firestore';
import { db } from "../firebase/firebase";
function Dashboard() {
    const { currentUser, userLoggedIn } = useAuth();
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [heartRates, setHeartRates] = useState([]);
    const [energyData, setEnergyData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [hasHealthData, setHasHealthData] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const testFirestore = async () =>{
        if(!currentUser){
            console.error("No user is currently logged in.");
            return;
        }
        try{
            console.log("Testing Firestore write operation...");
            console.log('Current User ID:', currentUser.uid);

            const testRef = doc(db, 'test' , currentUser.uid);
            await setDoc(testRef, {
                message: "Hello from HealthApp!",
                timestamp: serverTimestamp(),
                userEmail: currentUser.email
            });
            console.log("Firestore write operation successful!");
            setErrorMessage("");
        }catch (error) {
            console.error("Error writing to Firestore:", error);
            setErrorMessage("Failed to write to Firestore. Please try again later.");
            if(error.code === 'permission-denied') {
                setErrorMessage("You do not have permission to write to Firestore. Please check your authentication status.");
            }else if(error.code === 'unavailable') {
                setErrorMessage("Firestore service is currently unavailable. Please try again later.");
            }else{
                setErrorMessage("An unexpected error occurred while writing to Firestore. Please try again.");
            }
        }
    }

    useEffect(() => {
        if (!userLoggedIn) {
            navigate("/login");
        } else if (currentUser) {
            const initializeData = async () => {
               await testFirestore();
               await loadUserHealthData();
            };
            initializeData();
        }
    }, [userLoggedIn, navigate, currentUser]);

    const loadUserHealthData = async () => {
        setLoading(true);
        setErrorMessage("");
        
        try {
            const userData = await getUserHealthData(currentUser.uid);
            
            if (userData) {
                setHeartRates(userData.heartRates || []);
                setEnergyData(userData.energyData || []);
                setWorkouts(userData.workouts || []);
                setHasHealthData(true);
                
                if (userData.lastUpdated) {
                    setLastUpdated(userData.lastUpdated.toDate());
                }
                
                console.log('User health data loaded:', userData);
            } else {
                setHasHealthData(false);
                console.log('No existing health data found');
            }
        } catch (error) {
            console.error('Error loading user health data:', error);
            setErrorMessage('Failed to load your health data. Please try refreshing the page.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await doSignOut();
            navigate("/login");
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log("File selected:", file.name);
            setSelectedFile(file);
        }
    };

 const handleUpload = async () => {
    if (selectedFile && currentUser) {
        setLoading(true);
        setErrorMessage("");
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const fileContent = event.target.result;
                const result = processFile(fileContent);
                
                if (result.error) {
                    setErrorMessage(result.error);
                } else {
                    // Check data size and compress if needed
                    const dataSize = JSON.stringify(result).length;
                    console.log(`Health data size: ${(dataSize / 1024 / 1024).toFixed(2)} MB`);
                    
                    let finalData = result;
                    if (dataSize > 500000) { // If larger than 500KB
                        console.log('Compressing data due to size...');
                        finalData = compressHealthData(result);
                        setErrorMessage("Large dataset detected. Data has been sampled to improve performance.");
                    }
                    
                    // Save to Firebase
                    if (hasHealthData) {
                        await updateUserHealthData(currentUser.uid, finalData);
                    } else {
                        await saveUserHealthData(currentUser.uid, finalData);
                    }
                    
                    // Update local state
                    setHeartRates(finalData.heartRates || []);
                    setEnergyData(finalData.energyData || []);
                    setWorkouts(finalData.workouts || []);
                    setHasHealthData(true);
                    setLastUpdated(new Date());
                    setSelectedDate(null);
                    
                    // Clear file input
                    setSelectedFile(null);
                    const fileInputs = document.querySelectorAll('input[type="file"]');
                    fileInputs.forEach(input => input.value = '');
                    
                    console.log('Health data saved successfully');
                }
            } catch (error) {
                console.error('Error processing and saving health data:', error);
                setErrorMessage('Failed to process and save your health data. The file might be too large.');
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(selectedFile);
    } else {
        setErrorMessage("Please select a file first.");
    }
};

    // Filter heart rates for the selected date 
    const filteredHeartData = selectedDate
        ? heartRates.filter((d) => {
              const recordDate = new Date(d.date);
              return (
                  recordDate.getFullYear() === selectedDate.getFullYear() &&
                  recordDate.getMonth() === selectedDate.getMonth() &&
                  recordDate.getDate() === selectedDate.getDate()
              );
          })
        : [];

    const filteredEnergyData = selectedDate
        ? energyData.filter((d) => {
            const recordDate = new Date(d.date);
            return (
                recordDate.getFullYear() === selectedDate.getFullYear() &&
                recordDate.getMonth() === selectedDate.getMonth() &&
                recordDate.getDate() === selectedDate.getDate()
            );
        })
        : [];

    // Chart data and options
    const chartData = {
        labels: filteredHeartData.map((d) =>
            new Date(d.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        ),
        datasets: [
            {
                label: "Heart Rate BPM",
                data: filteredHeartData.map((d) => d.heartRate),
                borderColor: "rgba(75,192,192,1)",
                backgroundColor: "rgba(75,192,192,0.2)",
                fill: false,
                tension: 0.1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: { display: true, text: "Time" },
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 10,
                },
            },
            y: {
                title: { display: true, text: "BPM" },
            },
        },
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <div className="text-white text-xl">Loading your health dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-r from-purple-500 to-pink-500">
            <header className="w-full bg-white shadow-md py-4 px-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Health Dashboard</h1>
                    {currentUser && (
                        <p className="text-sm text-gray-600">Welcome, {currentUser.email}</p>
                    )}
                    {lastUpdated && (
                        <p className="text-xs text-gray-500">
                            Last updated: {lastUpdated.toLocaleDateString()} at {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
                >
                    Logout
                </button>
            </header>

            <div className="container mx-auto px-4 py-8">
                {errorMessage && (
                    <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
                        <p>{errorMessage}</p>
                    </div>
                )}

                {!hasHealthData ? (
                    <div className="bg-white rounded-lg shadow-md p-6 mx-4">
                        <h2 className="text-2xl font-bold mb-4">
                            Upload your health data to get started
                        </h2>
                        <p className="text-gray-600 mb-4">
                            To get started, please upload your health data file in XML format.
                            Go to Health App → Profile → Export Health Data.
                        </p>
                        <div className="mb-4">
                            <input
                                type="file"
                                accept=".xml"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                className="mb-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile || loading}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition disabled:opacity-50"
                            >
                                {loading ? "Processing..." : "Upload Health Data"}
                            </button>
                        </div>
                        
                        {/* Instructions */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                            <h3 className="text-lg font-semibold text-blue-800 mb-2">
                                How to Export Your Apple Health Data
                            </h3>
                            <ol className="list-decimal list-inside space-y-1 text-blue-700 text-sm">
                                <li>Open the Health app on your iPhone</li>
                                <li>Tap your profile picture in the top right</li>
                                <li>Scroll down and tap "Export All Health Data"</li>
                                <li>Tap "Export" to confirm</li>
                                <li>Share or save the export.xml file</li>
                                <li>Upload the file here to view your health dashboard</li>
                            </ol>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Your Health Data</h2>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept=".xml"
                                        onChange={(e) => setSelectedFile(e.target.files[0])}
                                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                    />
                                    <button
                                        onClick={handleUpload}
                                        disabled={!selectedFile || loading}
                                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
                                    >
                                        {loading ? "Updating..." : "Update Data"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Use a grid with two columns on large screens */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Date Picker, Summaries & Line Chart */}
                            <div className="space-y-6">
                                {/* Date Picker */}
                                <div className="bg-white rounded-lg shadow-md p-6">
                                    <h3 className="text-lg font-bold text-center mb-4">
                                        Select a Date to Filter Data
                                    </h3>
                                    <DatePicker
                                        selected={selectedDate}
                                        onChange={(date) => setSelectedDate(date)}
                                        dateFormat="yyyy/MM/dd"
                                        placeholderText="Click to select a date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                    {selectedDate && (
                                        <button
                                            onClick={() => setSelectedDate(null)}
                                            className="mt-2 text-sm text-blue-500 hover:underline"
                                        >
                                            Clear date filter
                                        </button>
                                    )}
                                </div>

                                {/* Summaries & Line Chart */}
                                <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                                    {heartRates.length > 0 && (
                                        <div className="grid grid-cols-1 gap-4">
                                            <EnergySummary energyData={filteredEnergyData} />
                                            <HeartRateSummary heartRates={filteredHeartData} />
                                        </div>
                                    )}
                                    {selectedDate && filteredHeartData.length > 0 ? (
                                        <div className="w-full h-[500px] p-4 bg-gray-50 rounded-lg shadow-lg">
                                            <LineChart data={chartData} options={chartOptions} />
                                        </div>
                                    ) : (
                                        selectedDate && (
                                            <p className="text-center text-gray-600">
                                                No heart rate data available for {selectedDate.toLocaleDateString()}.
                                            </p>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Right Column - Workout Pie Chart */}
                            <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                                {workouts && workouts.length > 0 ? (
                                    <WorkoutsPieChart workouts={workouts} />
                                ) : (
                                    <p className="text-center text-gray-600">
                                        No workout data available.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;