var globalData; // This will hold the fetched data
var oneMonthData;
var oneMonthFilteredData;
var sixMonthData;
var sixMonthFilteredData;
var oneYearData;
var oneYearFilteredData;


var currentData;

// Get the dimensions of the dataVisualization div
const datavizDiv = document.querySelector('.dataVisualization');
const divWidth = datavizDiv.offsetWidth;
const divHeight = datavizDiv.offsetHeight;

// set the dimensions and margins of the graph
const width = divWidth;
const height = divHeight;

// append the svg object to the body of the page
const svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width)
    .attr("height", height);

// Create a group element to hold the circles
const g = svg.append("g");

// Create a zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.1, 20]) // Set the minimum and maximum zoom levels
  .on("zoom", zoomed);

// Apply the zoom behavior to the SVG
svg.call(zoom);

// Zoom handler function
function zoomed({ transform }) {
  g.attr("transform", transform);
}

// Load and visualize data
function loadListeningData() {
    return fetch("data/Audio_2023-2024.json")
        .then(response => response.json())
        .then(data => {
            globalData = data; // Store the data in the global variable
            console.log("Data loaded and stored globally:", globalData);
            filterDataByTime(); // create the time constrainted arrays
        })
        .catch(error => {
            console.error("Error loading the data:", error);
        });
}

function filterDataByTime() {
    // date that the spotify data was requested
    const now = new Date('February 28, 2024 11:28:00');

    // Helper function to subtract months from the current date
    function subtractMonths(numOfMonths) {
        let date = new Date(now);
        date.setMonth(date.getMonth() - numOfMonths);
        return date;
    }

    // Calculate the dates for filtering
    const oneMonthAgo = subtractMonths(1);
    const sixMonthsAgo = subtractMonths(6);
    const oneYearAgo = subtractMonths(12);

    // Filter the globalData based on these dates
    oneMonthData = globalData.filter(item => new Date(item.ts) >= oneMonthAgo);
    console.log("One Month Data:", oneMonthData);
    oneMonthFilteredData = aggregateSongData(oneMonthData);
    console.log("One Month Filtered Data:", oneMonthFilteredData);

    sixMonthData = globalData.filter(item => new Date(item.ts) >= sixMonthsAgo);
    console.log("Six Months Data:", sixMonthData);
    sixMonthFilteredData = aggregateSongData(sixMonthData);
    console.log("Six Month Filtered Data:", sixMonthFilteredData);

    oneYearData = globalData.filter(item => new Date(item.ts) >= oneYearAgo);
    console.log("One Year Data:", oneYearData);
    oneYearFilteredData = aggregateSongData(oneYearData);
    console.log("One Year Filtered Data:", oneYearFilteredData);
}

function aggregateSongData(data) {
    const songMap = new Map();

    data.forEach(item => {
        const uri = item.spotify_track_uri;
        const hour = new Date(item.ts).getHours(); // Convert timestamp to hour to categorize the time of day

        // Initialize if new
        if (!songMap.has(uri)) {
            songMap.set(uri, {
                uri: uri,
                ts: item.ts,
                trackName: item.master_metadata_track_name,
                artistName: item.master_metadata_album_artist_name,
                albumName: item.master_metadata_album_album_name,
                plays: 0,
                timePlayed: 0,
                morningPlays: 0,
                afternoonPlays: 0,
                eveningPlays: 0,
                nightPlays: 0,
                peakListen: ""
            });
        }

        // Fetch and update existing data
        let songData = songMap.get(uri);
        songData.plays++;
        songData.timePlayed += Number(item.ms_played); // Ensure ms_played is a number

        // Increment count based on time of day
        if (hour >= 6 && hour < 12) { // Morning
            songData.morningPlays++;
        } else if (hour >= 12 && hour < 18) { // Afternoon
            songData.afternoonPlays++;
        } else if (hour >= 18 && hour < 21) { // Evening
            songData.eveningPlays++;
        } else { // Night
            songData.nightPlays++;
        }

        songData.peakListen = mostPlaysPeriod(songData);

        // Put updated data back into map
        songMap.set(uri, songData);
    });

    // Convert map to array to return
    return Array.from(songMap.values());
}


function getSelectedTimePeriod() {
    const selectedTime = document.querySelector('input[name="state-d"]:checked').id;
    console.log("Selected Time Period:", selectedTime);
    return selectedTime;
}

function getSelectedParameter() {
    const selectedParameter = document.querySelector('input[name="state-f"]:checked').id;
    console.log("Selected Parameter:", selectedParameter);
    return selectedParameter;
}

function visualizeData(data, parameter) {
    currentData = data;
    console.log("Current Data To Be Displayed:", currentData);

    if (!currentData || currentData.length === 0) {
        console.error("Data not yet loaded or is empty.");
        return;
    }

    var maxVal;

    if(parameter === "Time Listened"){
        maxVal = d3.max(currentData, d => d.timePlayed);
    }

    if(parameter === "Plays"){
        maxVal = d3.max(currentData, d => d.plays);
    }

    // Size scale for circles based on max val
    var size = d3.scaleSqrt() // Using square root scale for better visual differentiation
      .domain([0, maxVal])
      .range([5, 300]);

    function playsOrTime(d){
        if(parameter === "Time Listened"){
            return d.timePlayed;
        }

        if(parameter === "Plays"){
            return d.plays;
        }
    }

    // Remove existing circles if any (this is crucial if you call visualizeData multiple times)
    svg.selectAll('g > circle').remove()

    // Initialize the circles
    var node = g.selectAll("circle")
      .data(currentData)
      .enter()
      .append("circle")
        .attr("class", "node")
        .attr("r", d => size(playsOrTime(d)))
        .attr("cx", width / 2)
        .attr("cy", height / 2)
        .style("fill", "green")
        .style("fill-opacity", 0.7)
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .on("mouseover", async function(event, d) {
            document.getElementById("songTitle").textContent = d.trackName;
        
            document.getElementById("artistName").textContent = d.artistName;

            document.getElementById("timeListened").textContent = formatTime(d.timePlayed);

            document.getElementById("plays").textContent = d.plays;

            document.getElementById("peakTime").textContent = d.peakListen;

            // // Update the sidebar image
            // const albumArtUrl = await getAlbumArtUrl(d.uri);
            // document.getElementById("albumArt").src = albumArtUrl || "path/to/default/image.jpg";
        })
        .on("mousemove", function(event) {
            Tooltip
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseleave", function() {
            // Reset the song duration
            document.getElementById("songDuration").textContent = "";
        
            // Reset the song title
            document.getElementById("songTitle").textContent = 0;
        
            // Reset the artist name
            document.getElementById("artistName").textContent = "";
        });

        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.1)); // Example: zoom out to 50%

    // force simulation
    var simulation = d3.forceSimulation(currentData)
        .force("charge", d3.forceManyBody().strength(5))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => size(playsOrTime(d)) + 20))
        .on("tick", () => {
            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        })
        .on("end", function() {
            // Stop the simulation after initial positioning
            simulation.stop();
    });
}

function formatTime(ms) {
    // Convert milliseconds to seconds
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    // Calculate remaining seconds and minutes after accounting for hours and minutes
    seconds = seconds % 60;
    minutes = minutes % 60;

    // Format output string
    return `${hours} hours ${minutes} minutes ${seconds} seconds`;
}

function mostPlaysPeriod(song) {
    // Extracting play counts
    let periods = [
        { name: "Morning", plays: song.morningPlays },
        { name: "Afternoon", plays: song.afternoonPlays },
        { name: "Evening", plays: song.eveningPlays },
        { name: "Night", plays: song.nightPlays }
    ];

    // Sorting periods by the number of plays in descending order
    periods.sort((a, b) => b.plays - a.plays);

    // Returning the period with the most plays
    return periods[0].name;
}

svg.on("mousedown.zoom", null) // Reset the default mouse behavior
  .on("dblclick.zoom", null) // Disable double-click to zoom
  .on("touchstart.zoom", null) // Reset the default touch behavior
  .on("wheel.zoom", null) // Disable scrolling to zoom
  .on("mousemove.zoom", mouseMoved)
  .on("touchmove.zoom", touchMoved)
  .on("mousewheel.zoom", mouseWheeled)
  .on("touchend.zoom", touchEnded);

// Mouse move event handler
function mouseMoved(event) {
  event.preventDefault();
  if (event.which === 1) {
    zoom.translateBy(svg, event.movementX, event.movementY);
  }
}

// Touch move event handler
function touchMoved(event) {
  event.preventDefault();
  zoom.translateBy(svg, event.touches[0].movementX, event.touches[0].movementY);
}

// Mouse wheel event handler
function mouseWheeled(event) {
  event.preventDefault();
  zoom.scaleBy(svg, 1 + event.deltaY * -0.01);
}

// Touch end event handler
function touchEnded(event) {
  event.preventDefault();
  if (event.touches.length === 0) {
    zoom.scaleTo(svg, 1);
  }
}

function getAlbumArtUrl(trackUri) {
    const albumId = trackUri.split(":")[2];
    const corsProxyUrl = "https://cors-anywhere.herokuapp.com/";
    const albumArtUrl = `${corsProxyUrl}https://i.scdn.co/image/${albumId}/640x640.jpg`;
    const origin = window.location.origin; // Get the origin of the current site

    return fetch(albumArtUrl, {
        headers: {
            'Origin': origin // Include the Origin header
        }
    })
    .then(response => response.url) // Return the final album art URL
    .catch(error => {
        console.error('Error fetching album art:', error);
        return ""; // Return an empty string or a default image URL if there's an error
    });
}

function visualizeDataHelper(){
    var selectedTime2 = getSelectedTimePeriod(); // Ensure this is checked after data is loaded
    var selectedParameter2 = getSelectedParameter(); // Ensure this is checked after data is loaded

    if (selectedTime2 === "1 Month") {
        visualizeData(oneMonthFilteredData, selectedParameter2);
    } else if (selectedTime2 === "6 Months") {
        visualizeData(sixMonthFilteredData, selectedParameter2);
    } else if (selectedTime === "1 Year") {
        visualizeData(oneYearFilteredData, selectedParameter2);
    }
}

// Adjust the DOMContentLoaded handler to use the promise
document.addEventListener("DOMContentLoaded", function(){
    loadListeningData().then(() => {
        const selectedTime = getSelectedTimePeriod(); // Ensure this is checked after data is loaded
        console.log("Selected Time Period after data load:", selectedTime);

        const selectedParameter = getSelectedParameter(); // Ensure this is checked after data is loaded
        console.log("Selected Parameter after data load:", selectedTime);

        if (selectedTime === "1 Month") {
            visualizeData(oneMonthFilteredData, selectedParameter);
        } else if (selectedTime === "6 Months") {
            visualizeData(sixMonthFilteredData, selectedParameter);
        } else if (selectedTime === "1 Year") {
            visualizeData(oneYearFilteredData, selectedParameter);
        }
    });
});