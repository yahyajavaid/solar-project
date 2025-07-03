    (function(){
      const predefined = { 
        fan: 75, 
        tv: 100, 
        ac: 1500, 
        fridge: 150, 
        light: 10, 
        laptop: 65, 
        washing: 500,
        microwave: 800,
        dishwasher: 1200,
        heater: 2000,
        router: 15,
        printer: 50
      };
      
      const sel = document.getElementById('applianceSelect');
      const watt = document.getElementById('applianceWatt');
      const hrs = document.getElementById('applianceHours');
      const addBtn = document.getElementById('add-btn');
      const calcBtn = document.getElementById('calc-btn');
      const sz = document.getElementById('solarSize');
      const eff = document.getElementById('efficiency');
      const batAh = document.getElementById('batteryAh');
      const batV = document.getElementById('batteryV');
      const listEl = document.getElementById('applianceList');
      const tblCont = document.getElementById('applianceTableContainer').querySelector('.table-container');
      const empty = document.getElementById('emptyState');
      const res = document.getElementById('results');
      const grid = res.querySelector('.results-grid');
      
      let apps = JSON.parse(localStorage.getItem('solarscope_appliances') || '[]');
      
      // Populate Select with appliances
      Object.entries(predefined).forEach(([k, v]) => {
        const name = k.charAt(0).toUpperCase() + k.slice(1);
        sel.appendChild(new Option(name, k));
      });
      
      // Validation
      const valid = (el, min = 1) => {
        const v = parseFloat(el.value);
        return !isNaN(v) && v >= min;
      };
      
      const updAdd = () => {
        const wValid = valid(watt);
        const hValid = valid(hrs, 0.1);
        
        const wattError = document.getElementById('watt-error');
        const hoursError = document.getElementById('hours-error');
        
        if (wValid) {
          wattError.classList.remove('show');
        } else {
          wattError.classList.add('show');
        }
        
        if (hValid) {
          hoursError.classList.remove('show');
        } else {
          hoursError.classList.add('show');
        }
        
        addBtn.disabled = !(wValid && hValid);
      };
      
      const updCalc = () => {
        const ok = valid(sz, 0.1) && valid(eff, 50) && valid(batAh);
        calcBtn.disabled = !(ok && apps.length);
      };
      
      // Render List
      function render() {
        listEl.innerHTML = '';
        if (!apps.length) {
          tblCont.style.display = 'none';
          empty.style.display = 'block';
        } else {
          tblCont.style.display = 'table';
          empty.style.display = 'none';
          apps.forEach((a, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${a.name}</td>
              <td>${a.watts}W</td>
              <td>${a.hours}h</td>
              <td>${a.kWh.toFixed(2)}</td>
            `;
            const td = document.createElement('td');
            const btn = document.createElement('button');
            btn.textContent = 'Remove';
            btn.className = 'btn btn-danger';
            btn.addEventListener('click', () => {
              apps.splice(i, 1);
              save();
              render();
              updCalc();
            });
            td.append(btn);
            tr.append(td);
            listEl.append(tr);
            
            // Add animation
            tr.classList.add('fade-in');
          });
        }
      }
      
      function save() {
        localStorage.setItem('solarscope_appliances', JSON.stringify(apps));
      }
      
      // Events
      sel.addEventListener('change', () => {
        if (!sel.value || sel.value === '') {
          watt.value = '';
          watt.readOnly = false;
        } else {
          watt.value = predefined[sel.value];
          watt.readOnly = true;
        }
        updAdd();
      });
      
      watt.addEventListener('input', updAdd);
      hrs.addEventListener('input', updAdd);
      
      addBtn.addEventListener('click', () => {
        const w = parseFloat(watt.value);
        const h = parseFloat(hrs.value);
        const k = w * h / 1000;
        apps.push({
          name: sel.options[sel.selectedIndex].text,
          watts: w,
          hours: h,
          kWh: k
        });
        save();
        render();
        updAdd();
        updCalc();
        
        // Reset form
        sel.value = '';
        watt.value = '';
        hrs.value = '';
        watt.readOnly = false;
      });
      
      [sz, eff, batAh, batV].forEach(el => el.addEventListener('input', updCalc));
      
      calcBtn.addEventListener('click', () => {
        const totalLoad = apps.reduce((s, { kWh }) => s + kWh, 0);
        const generatedEnergy = parseFloat(sz.value) * parseFloat(eff.value) / 100 * 5.5;
        const batteryCapacity = parseFloat(batAh.value) * parseFloat(batV.value) / 1000;
        const backupHours = batteryCapacity / (totalLoad / 24);
        const systemStatus = generatedEnergy >= totalLoad ? 'Sufficient' : 'Insufficient';
        const surplus = generatedEnergy - totalLoad;

        grid.innerHTML = '';
        
        const results = [
          [totalLoad, 'Total Daily Load (kWh)'],
          [generatedEnergy, 'Estimated Generation (kWh)'],
          [batteryCapacity, 'Battery Capacity (kWh)'],
          [backupHours, 'Backup Duration (hrs)'],
          [systemStatus, 'System Status'],
          [surplus, 'Energy Surplus/Deficit (kWh)']
        ];
        
        results.forEach(([v, label], index) => {
          const card = document.createElement('div');
          card.className = 'result-card fade-in';
          card.style.animationDelay = `${index * 0.1}s`;
          
          // Add special styling for system status
          if (label === 'System Status') {
            if (v === 'Sufficient') {
              card.classList.add('status-sufficient');
            } else {
              card.classList.add('status-insufficient');
            }
          }
          
          card.innerHTML = `
            <div class="result-value">${typeof v === 'number' ? v.toFixed(2) : v}</div>
            <div class="result-label">${label}</div>
          `;
          grid.append(card);
        });
        
        res.classList.add('show');
        res.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      
      // Smooth scrolling for navigation links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href'));
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        });
      });

      // Add scroll animations
      const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      }, observerOptions);

      // Observe cards for animation
      document.querySelectorAll('.card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
      });
      
      // Initialize
      render();
      updCalc();
    })();