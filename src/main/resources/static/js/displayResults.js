let map, routePolyline, currentPositionMarker, chart;
let allPoints, filteredPoints, distances;
let startMarker, endMarker;
const MAX_DISTANCE_THRESHOLD = 0.5; // for mouse
const MIN_DISTANCE_THRESHOLD = 0.1; // to filter close points




// possibly remove some of the junk in analysisResults


function initializeMap(results) {
    allPoints = results.allPoints;
    filteredPoints = filterClosePoints(allPoints);

    map = L.map('map').setView([allPoints[0].lat, allPoints[0].lon, 13], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let routePoints = allPoints.map(point => [point.lat, point.lon]);
    routePolyline = L.polyline(routePoints, {color: 'red'}).addTo(map);

    map.fitBounds(routePolyline.getBounds());

    
    //STATIC markers
    L.marker([results.startLat, results.startLon]).addTo(map)
        .bindPopup('Start: ' + results.startLocation);
    L.marker([results.endLat, results.endLon]).addTo(map)
        .bindPopup('End: ' + results.endLocation);
    

    
    
    let startPoint = allPoints[0];

    // for routing
    /*
    let endPoint = allPoints[allPoints.length - 1]
    

    startMarker = L.marker([startPoint.lat, startPoint.lon], {draggable: true}).addTo(map)
        .bindPopup('Start');
    endMarker = L.marker([endPoint.lat, endPoint.lon], {draggable: true}).addTo(map)
        .bindPopup('End');
    
    startMarker.on("dragend", (event) => onMarkerDragEnd(event, "start"));
    endMarker.on("dragend", (event) => onMarkerDragEnd(event, "end"));
    */

    // marker for current position
    currentPositionMarker = L.circleMarker([startPoint.lat, startPoint.lon], {
        color: 'blue',
        fillColor: '#30f',
        fillOpacity: 0.8,
        radius: 8
    }).addTo(map);

    // Add mousemove event listener to the map
    map.on('mousemove', onMapMouseMove);

    // Don't delete allPoints 

}



// For the graph to take out kinks the trackpoints cannot be too close
// I will filter the close ones out for the purposes of the graph
// This may be used in some place other than the graph maybe create a more global variable if so

function createAltitudeGraph(allPoints) {

    distances = [0];
    let elevations = [];
    let slopes = [];
    let totalDistance = 0;

    for (let i = 0; i < filteredPoints.length; i++) {
        let point = filteredPoints[i];
        elevations.push(point.ele);

        if (i > 0) {
            let prevPoint = filteredPoints[i-1];
            let segmentDistance = calculateDistance(prevPoint, point);
            totalDistance += segmentDistance;
            distances.push(totalDistance);

            let elevationChange = point.ele - prevPoint.ele;
            let segmentDistanceMeters = segmentDistance * 1000; //metres
            let slope = (elevationChange / segmentDistanceMeters) * 100; // in percentage
            slopes.push(slope);
        } else {
            slopes.push(0); // First point has no slope
        }
    }
    
// Make slope go on right of graph
    let ctx = document.getElementById('altitudeChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: distances.map(d => d.toFixed(2)),
            datasets: [{
                label: 'Elevation',
                data: elevations,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1, // Affects curve of line
                pointRadius: 0,
                yAxisID: "y-elevation"
            },
            {
                label: 'Slope',
                data: slopes,
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
                pointRadius: 0,
                yAxisID: 'y-slope',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Distance (km)'
                    },
                    max: totalDistance,
                },
                "y-elevation": {
                    type: "linear",
                    position: "left",
                    title: {
                        display: true,
                        text: 'Elevation (m)'
                    }
                },
                "y-slope": {
                    type: "linear",
                    position: "right",
                    title: {
                        display: true,
                        text: "Slope (%)"
                    }
                }

            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || "";
                            if (label) {
                                label += ": ";
                            }
                            if (context.parsed.y !== null) {
                                if (context.datasetIndex === 0) {
                                    label += context.parsed.y.toFixed(2) + "m";
                                } else {
                                    label += context.parsed.y.toFixed(2) + "%";
                                }
                            }
                            return label;
                        }
                    }
                },
                crosshair: {
                    // vertical line in graph.. that follows
                    line: {
                        color: "#808080",
                        width: 1
                    },
                    zoom: {
                        enabled: false,
                    }
                }
            },
            hover: {
                mode: 'index',
                intersect: false
            },
            onHover: (event, elements) => { // event
                if (elements.length > 0) {
                    const index = elements[0].index;
                    updateMapPosition(allPoints[index], false);
                }
            }
        }
    });
}

// just apply same logic as before
function filterClosePoints(points) {
    // haha
    if (points.length < 2) return points;

    let filteredPoints = [points[0]];
    let lastPoint = points[0];

    for (let i = 1; i < points.length; i++) {
        let currentPoint = points[i];
        let distance = calculateDistance(lastPoint, currentPoint);

        if (distance >= MIN_DISTANCE_THRESHOLD) {
            filteredPoints.push(currentPoint);
            lastPoint = currentPoint;
        }
    }

    if (lastPoint !== points[points.length - 1]) {
        filteredPoints.push(points[points.length - 1]);
    } 

    return filteredPoints;
// maybe at some point decouple the slope and ele as ele does not create kinks in graph
}


// PURELY FOR LIVE MOVEMENT OF MARKER BI-DIRECTIONALITY

function updateMapPosition(point, updateChart = true) { // and chart pos
    if (map && currentPositionMarker) {
        currentPositionMarker.setLatLng([point.lat, point.lon]);
    }
    
    if (updateChart && chart && point.index !== undefined) {
        chart.setActiveElements([
            {datasetIndex: 0, index: point.index},
            {datasetIndex: 1, index: point.index}
        ]);
        chart.tooltip.setActiveElements([
            {datasetIndex: 0, index: point.index},
            {datasetIndex: 1, index: point.index}
        ]);
        chart.update();
    }
}


function onMapMouseMove(e) {
    if (routePolyline) {
        const closestPoint = findClosestPointOnRoute(e.latlng);
        if (closestPoint) {
            const distance = map.distance(e.latlng, [closestPoint.lat, closestPoint.lon]);
            if (distance <= MAX_DISTANCE_THRESHOLD * 1000) { // Convert km to meters
                updateMapPosition(closestPoint);
            }
        }
    }
}

// FOR GRAPHS

function findClosestPointOnRoute(latlng) {
    let minDistance = Infinity;
    let closestPoint = null;

    filteredPoints.forEach((point, index) => { 
        const distance = map.distance(latlng, [point.lat, point.lon]);
        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
            closestPoint.index = index;  
        }
    });

    return closestPoint;
}

function calculateDistance(point1, point2) {
    const R = 6371;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lon - point1.lon) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function displayAnalysisResults(results) {
    const resultsDiv = document.getElementById('analysisResults');
    resultsDiv.innerHTML = `
        <p>Start Location: ${results.startLocation}</p>
        <p>End Location: ${results.endLocation}</p>
        <p>Total Distance: ${results.totalDistanceKm.toFixed(2)} km</p>
        <p>Start Coordinates: ${results.startLat.toFixed(6)}, ${results.startLon.toFixed(6)}</p>
        <p>End Coordinates: ${results.endLat.toFixed(6)}, ${results.endLon.toFixed(6)}</p>
    `;
}

document.addEventListener('DOMContentLoaded', function() {
    const analysisResults = JSON.parse(sessionStorage.getItem('analysisResults'));
    
    if (analysisResults) {
        displayAnalysisResults(analysisResults);
        initializeMap(analysisResults);
        createAltitudeGraph(analysisResults.allPoints);
    } else {
        document.getElementById('analysisResults').innerHTML = '<p>No analysis results available.</p>';
    }
});