let solarChart = null;
let cachedData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

const SYSTEM_EFFICIENCY = 0.87;
const STANDARD_IRRADIANCE = 1000; // W/m²

function getSolarPosition(latitude, longitude, date) {
  const lat = latitude * Math.PI / 180;
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180) * Math.PI / 180;
  const hourAngle = (date.getHours() + date.getMinutes() / 60 - 12) * 15 * Math.PI / 180;
  const elevation = Math.asin(Math.sin(lat) * Math.sin(declination) + 
                             Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle));
  return Math.max(0, Math.sin(elevation));
}

function getSunriseSunset(latitude, longitude, date) {
  const lat = latitude * Math.PI / 180;
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180) * Math.PI / 180;
  const hourAngle = Math.acos(-Math.tan(lat) * Math.tan(declination));
  const sunrise = 12 - hourAngle * 180 / Math.PI / 15;
  const sunset = 12 + hourAngle * 180 / Math.PI / 15;
  return {
    sunrise: Math.max(0, Math.min(24, sunrise)),
    sunset: Math.max(0, Math.min(24, sunset))
  };
}

function isCacheValid() {
  return cachedData && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION);
}

function destroyChart() {
  if (solarChart && typeof solarChart.destroy === 'function') {
    solarChart.destroy();
    solarChart = null;
  }
}

async function getForecast() {
  const panelSizeInput = document.getElementById("panelSize").value;
  if (!panelSizeInput || parseFloat(panelSizeInput) <= 0) {
    document.getElementById("result").innerHTML = "⚠️ <strong>Please enter a valid panel size (in kW).</strong>";
    document.getElementById("result").className = "error";
    return;
  }

  const panelSize = parseFloat(panelSizeInput);
  const forecastBtn = document.getElementById("forecastBtn");
  forecastBtn.disabled = true;
  document.getElementById("result").innerHTML = "📡 <span class='loading'></span> Getting your location and solar forecast data...";
  document.getElementById("result").className = "";

  if (!navigator.geolocation) {
    document.getElementById("result").innerHTML = "❌ <strong>Geolocation not supported by your browser.</strong>";
    document.getElementById("result").className = "error";
    forecastBtn.disabled = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    try {
      let weatherData;
      
      // Check cache first
      if (isCacheValid()) {
        console.log("Using cached weather data");
        weatherData = cachedData;
      } else {
        console.log("Fetching fresh weather data from local server");
        
        // Fetch from your local server
        const response = await fetch(`https://solarscope-backend.onrender.com/api/weather?lat=${lat}&lon=${lon}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Server error: ${response.status} - ${errorData.message || response.statusText}`);
        }
        
        weatherData = await response.json();
        console.log("Weather data from local server:", weatherData);
        
        // Cache the response
        cachedData = weatherData;
        cacheTimestamp = Date.now();
      }
      
      processWeatherData(weatherData, panelSize, lat, lon);
      
    } catch (err) {
      console.error("Error fetching weather data:", err);
      
      // Provide more specific error messages
      let errorMessage = "❌ <strong>Weather service unavailable.</strong> ";
      
      if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
        errorMessage += "Request timed out. Please check your connection and try again.";
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage += "Cannot connect to local server. Please make sure it's running on port 3001.";
      } else if (err.message.includes('Server error: 429')) {
        errorMessage += "Too many requests. Please wait a moment before trying again.";
      } else if (err.message.includes('Server error: 401')) {
        errorMessage += "Weather service authentication error. Please contact support.";
      } else if (err.message.includes('Server error')) {
        errorMessage += err.message.includes('-') ? err.message.split('-')[1].trim() : "Server returned an error.";
      } else {
        errorMessage += "Please try again later.";
      }
      
      document.getElementById("result").innerHTML = errorMessage;
      document.getElementById("result").className = "error";
      document.getElementById("chartContainer").style.display = "none";
      document.getElementById("weatherDetails").innerHTML = "";
      document.getElementById("forecastDays").innerHTML = "";
    }
    
    forecastBtn.disabled = false;
  }, (error) => {
    let errorMsg = "❌ <strong>Location access denied.</strong> ";
    switch(error.code) {
      case error.PERMISSION_DENIED:
        errorMsg += "Please allow location access and try again."; 
        break;
      case error.POSITION_UNAVAILABLE:
        errorMsg += "Location information unavailable."; 
        break;
      case error.TIMEOUT:
        errorMsg += "Location request timed out."; 
        break;
      default:
        errorMsg += "An unknown error occurred.";
        break;
    }
    document.getElementById("result").innerHTML = errorMsg;
    document.getElementById("result").className = "error";
    forecastBtn.disabled = false;
  });
}

function processWeatherData(data, panelSize, lat, lon) {
  const location = data.resolvedAddress || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  const days = data.days;
  
  if (!days || days.length === 0) {
    throw new Error("No weather data available in response");
  }
  
  const today = days[0];
  const todayDate = new Date(today.datetime);
  const sunTimes = getSunriseSunset(lat, lon, todayDate);
  const todayHourlyData = processHourlyData(today.hours, todayDate, lat, lon, panelSize, sunTimes);
  
  displayTodaysForecast(location, todayHourlyData, lat, lon);
  
  const upcomingDays = days.slice(1, 3);
  displayUpcomingDays(upcomingDays, lat, lon, panelSize);
}

function formatHourDecimalToTime(decimalHour) {
  const hours = Math.floor(decimalHour);
  const minutes = Math.round((decimalHour - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function processHourlyData(hours, date, lat, lon, panelSize, sunTimes) {
  const hourlyData = [];
  let totalOutput = 0;
  
  for (let hour of hours) {
    const hourNum = parseInt(hour.datetime.split(':')[0]);
    const hourDate = new Date(date);
    hourDate.setHours(hourNum);
    
    // Skip hours outside daylight
    if (hourNum < Math.floor(sunTimes.sunrise) || hourNum > Math.ceil(sunTimes.sunset)) {
      continue;
    }
    
    const solarRadiation = hour.solarradiation || 0;
    const solarPosition = getSolarPosition(lat, lon, hourDate);
    
    let output = 0;
    if (solarRadiation > 0) {
      const adjustedRadiation = solarRadiation * solarPosition;
      output = panelSize * SYSTEM_EFFICIENCY * (adjustedRadiation / STANDARD_IRRADIANCE);
    }
    
    // Convert Fahrenheit to Celsius for temperature
    const tempF = hour.temp || 0;
    const tempC = ((tempF - 32) * 5 / 9);
    
    const hourData = {
      hour: hourNum,
      time: hour.datetime.substring(0, 5),
      temp: Math.round(tempC),
      humidity: hour.humidity || 0,
      wind: hour.windspeed || 0,
      cloudcover: hour.cloudcover || 0,
      visibility: hour.visibility || 0,
      conditions: hour.conditions || "Clear",
      solarradiation: solarRadiation,
      precipprob: hour.precipprob || 0,
      output: Math.max(0, output)
    };
    
    hourlyData.push(hourData);
    totalOutput += hourData.output;
  }
  
  return { hourlyData, totalOutput, sunTimes };
}

function displayTodaysForecast(location, data, lat, lon) {
  const { hourlyData, totalOutput, sunTimes } = data;
  const sunriseStr = formatHourDecimalToTime(sunTimes.sunrise);
  const sunsetStr = formatHourDecimalToTime(sunTimes.sunset);
  
  document.getElementById("result").innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
      <div style="text-align: center;">
        <div style="font-size: 1.3rem; font-weight: bold; color: #3498db;">${location}</div>
        <div style="color: #666;">📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 1.3rem; font-weight: bold; color: #27ae60;">${totalOutput.toFixed(2)} kWh</div>
        <div style="color: #666;">📈 Total Output Today</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 1.3rem; font-weight: bold; color: #f39c12;">${sunriseStr} - ${sunsetStr}</div>
        <div style="color: #666;">☀️ Daylight Hours</div>
      </div>
    </div>
  `;
  
  document.getElementById("result").className = "success";
  displayChart(hourlyData);
  displayDetailedTable(hourlyData);
}

function displayChart(hourlyData) {
  destroyChart();
  const ctx = document.getElementById('solarChart').getContext('2d');
  const labels = hourlyData.map(d => d.time);
  const outputData = hourlyData.map(d => parseFloat(d.output.toFixed(2)));
  
  solarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Solar Output (kWh/hour)',
        data: outputData,
        backgroundColor: 'rgba(52, 152, 219, 0.8)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 2,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: true } },
      scales: {
        x: { title: { display: true, text: 'Time of Day' } },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Energy Output (kWh)' },
          ticks: { callback: function(value) { return value + ' kWh'; } }
        }
      }
    }
  });
  
  document.getElementById("chartContainer").style.display = "block";
}

function displayDetailedTable(hourlyData) {
  const tableRows = hourlyData.map(data => `
    <tr>
      <td><strong>${data.time}</strong></td>
      
      <td>${data.humidity}%</td>
      <td>${data.wind.toFixed(1)} m/s</td>
      <td>${data.cloudcover}%</td>
      <td>${data.visibility} km</td>
      <td>${data.precipprob}%</td>
      <td>${data.conditions}</td>
      <td><strong>${data.output.toFixed(2)} kWh</strong></td>
    </tr>
  `).join("");
  
  document.getElementById("weatherDetails").innerHTML = `
    <h3>📊 Today's Detailed Hourly Forecast</h3>
    <table>
      <tr>
        <th>Time</th>
        <th>Temp</th>
        <th>Humidity</th>
        <th>Wind</th>
        <th>Clouds</th>
        <th>Visibility</th>
        <th>Rain Prob</th>
        <th>Conditions</th>
        <th>Solar Output</th>
      </tr>
      ${tableRows}
    </table>
  `;
}

function displayUpcomingDays(days, lat, lon, panelSize) {
  const dayCards = days.map((day, index) => {
    const date = new Date(day.datetime);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const sunTimes = getSunriseSunset(lat, lon, date);
    const hourlyData = processHourlyData(day.hours, date, lat, lon, panelSize, sunTimes);
    const peakHour = hourlyData.hourlyData.reduce((max, current) => 
      current.output > max.output ? current : max, { output: 0, time: "N/A" });
    const sunriseStr = formatHourDecimalToTime(sunTimes.sunrise);
    const sunsetStr = formatHourDecimalToTime(sunTimes.sunset);
    
    return `
      <div class="day-card">
        <h3>${dayName}</h3>
        <div class="day-stats">
          <div class="stat-item">
            <div class="stat-value">${hourlyData.totalOutput.toFixed(1)} kWh</div>
            <div class="stat-label">Total Output</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${peakHour.output.toFixed(1)} kWh</div>
            <div class="stat-label">Peak @ ${peakHour.time}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${sunriseStr}</div>
            <div class="stat-label">Sunrise</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${sunsetStr}</div>
            <div class="stat-label">Sunset</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
  
  document.getElementById("forecastDays").innerHTML = dayCards;
}

// Event listeners
document.getElementById('panelSize').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    getForecast();
  }
});

window.addEventListener('beforeunload', function() {
  destroyChart();
});

// Optional: Add a function to test server connectivity
async function testServerConnection() {
  try {
    const response = await fetch('http://localhost:3001/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('✅ Local server is running and accessible');
      return true;
    } else {
      console.warn('⚠️ Local server responded with error:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Cannot connect to local server:', error);
    return false;
  }
}

// Test server connection on page load (optional)
// testServerConnection();
