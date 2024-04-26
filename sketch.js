let zoomLevel = 1.0;
let maxPlays = 0;
let dataReady = false;

// listening data
let jsonData;
let rawData;
let oneMonthData;
let oneMonthDataTimeSorted = new Map();
let oneMonthDataPlaysSorted = new Map();
let sixMonthData;
let sixMonthDataTimeSorted = new Map();
let sixMonthDataPlaysSorted = new Map();
let oneYearData;
let oneYearDataTimeSorted = new Map();
let oneYearDataPlaysSorted = new Map();

// function to laod and parse the JSON file
function loadJSON(callback) {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', 'Audio_2023-2024.json', true); // Change the filename here
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

function init(filename){
  return fetch(filename)
  .then(response => response.json())
  .then(jsonData => {
      rawData = new Map(); // Initialize rawData as a Map
      
      jsonData.forEach(item => {
          let parsedDate = new Date(item.ts);
          let key = item.spotify_track_uri;
          let value = {
            date: parsedDate,
            hour: parsedDate.getHours(),
            plays: 0,
            morningListens: 0,
            afternoonListens: 0,
            eveningListens: 0,
            nightListens: 0,
            song: item.master_metadata_track_name,
            artist: item.master_metadata_album_artist_name,
            album: item.master_metadata_album_album_name,
            // songLink: "http://open.spotify.com/track/" + (item.spotify_track_uri).substring(13)
          };

          for(let entry of rawData){
            if(entry[0] === key){
              // increases the timePlayed
              entry[1].timePlayed += item.hours;
  
              // increases the number of plays tracker
              entry[1].plays++;
  
              // increases the time sections listen counters
              // Morning
              if(6 <= entry[1].hour < 12){
                entry[1].morningListens++;
              }
  
              // Afternoon
              if(12 <= entry[1].hour < 18){
                entry[1].afternoonListens++;
              }
  
              // Evening
              if(18 <= entry[1].hour < 21){
                entry[1].eveningListens++;
              }
              
              // Night
              if(0 <= entry[1].hour < 6 || 2100 <= entry[1].time <= 24){
                entry[1].nightListens++;
              }
            }
          }

          // Manage duplicates and data aggregation
          if (rawData.has(key)) {
              let existing = rawData.get(key);
              existing.plays += item.plays; // Assuming plays is a property to be aggregated
              rawData.set(key, existing);
          } else {
              rawData.set(key, value);
          }
      });

      createMaps(); // Organize the data into the categorized data sets
      console.log("init function done");
      return;
  });
}

// function that creates the 3 time constrained data sets and their organized counterparts
function createMaps(){
  const now = new Date();

  function subtractMonths(numOfMonths){
    let date = new Date(now);
    date.setMonth(date.getMonth() - numOfMonths);
    return date;
  }

  let oneMonthAgo = subtractMonths(1);
  let sixMonthsAgo = subtractMonths(6);
  let oneYearAgo = subtractMonths(12);

  oneMonthData = new Map();
  sixMonthData = new Map();
  oneYearData = new Map();

  console.log("time constrained maps created");
  console.log(oneMonthDataTimeSorted);

  rawData.forEach((value, key) => {
    if (value.date >= oneYearAgo) {
        oneYearData.set(key, value);
        if (value.date >= sixMonthsAgo) {
            sixMonthData.set(key, value);
            if (value.date >= oneMonthAgo) {
                oneMonthData.set(key, value);
            }
        }
    }
  });

  oneMonthDataTimeSorted = sortByTime(oneMonthData);
  oneMonthDataPlaysSorted = sortByPlays(oneMonthData);
  sixMonthDataTimeSorted = sortByTime(sixMonthData);
  sixMonthDataPlaysSorted = sortByPlays(sixMonthData);
  oneYearDataTimeSorted = sortByTime(oneYearData);
  oneYearDataPlaysSorted = sortByPlays(oneYearData);

  console.log("createMaps function done");
  return;
}

function sortByTime(dataMap) {
  // Convert the map to an array of [key, value] pairs
  let sortedArray = Array.from(dataMap).sort((a, b) => {
      return a[1].time - b[1].time;
  });

  // Convert the array back to a map and return it
  console.log("sortByTime function done");
  return new Map(sortedArray);
}

function sortByPlays(dataMap) {
  // Convert the map to an array of [key, value] pairs
  let sortedArray = Array.from(dataMap).sort((a, b) => {
      return b[1].plays - a[1].plays;  // Note the order b-a for descending sort
  });

  // Convert the array back to a map and return it
  console.log("sortByPlays function done");
  return new Map(sortedArray);
}

function updateMaxPlays(data){
  data.forEach((value, key) => {
    if(value.plays > maxPlays){
      maxPlays = value.plays;
    }
  });
}

// main draw function
function draw() {
  if(!dataReady) return;
  background(0);
  scale(zoomLevel);

  let x = 50;
  const y = height / 2;

  oneMonthDataTimeSorted.forEach((value, key) =>{
    const diameter = map(value.plays, 0, maxPlays, 10, 100);
    ellipse(x, y, diameter, diameter);

    fill(255);
    noStroke();
    textAlign(Center, Center);
    textSize(10);
    text(`${value.song} by ${value.artist}`, x, y);

    x+= diameter + 20;
  });
}

function setup() {
  var canvas = createCanvas(windowWidth-400, windowHeight-(windowHeight*0.2));
  canvas.parent("sketch");
  frameRate(60);

  init("data/Audio_2023-2024.json").then(() => {
    updateMaxPlays(oneMonthDataTimeSorted); // Ensure max plays is calculated after data is ready
    console.log("oneMonthDataTimeSorted size:", oneMonthDataTimeSorted.size);
    dataReady = true; // Set the data ready flag to true after everything is set up
  });
}

function zoomIn() {
    // Zoom in by 10%
    zoomLevel *= 1.1;
}

function zoomOut(){
    //Zoom out by 10%
    zoomLevel *= 0.9;
}

function windowResized() {
  resizeCanvas(windowWidth-400, windowHeight-(windowHeight*0.2));
}
