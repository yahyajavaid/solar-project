  document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM fully loaded');
            
            // Tab navigation
            document.querySelectorAll('.tab-nav button').forEach(btn => {
                btn.addEventListener('click', function() {
                    console.log('Tab clicked:', this.dataset.target);
                    document.querySelectorAll('.tab-nav button').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    document.getElementById('roiSection').style.display = this.dataset.target === 'roiSection' ? '' : 'none';
                    document.getElementById('batterySection').style.display = this.dataset.target === 'batterySection' ? '' : 'none';
                });
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
        });

        // Technical details toggle
        function toggleTechnicalDetails() {
            const content = document.getElementById('technicalContent');
            const icon = document.getElementById('toggleIcon');
            if (content.style.display === 'none' || content.style.display === '') {
                content.style.display = 'block';
                icon.textContent = '▲';
            } else {
                content.style.display = 'none';
                icon.textContent = '▼';
            }
        }

        // IESCO Tariff Slabs 2024-25
        const tariffSlabs = [
            { min: 0, max: 100, rate: 23.59 },
            { min: 101, max: 200, rate: 30.07 },
            { min: 201, max: 300, rate: 34.26 },
            { min: 301, max: 400, rate: 39.15 },
            { min: 401, max: 500, rate: 41.36 },
            { min: 501, max: 600, rate: 42.78 },
            { min: 601, max: 700, rate: 43.92 },
            { min: 701, max: Infinity, rate: 48.84 }
        ];

        const regionalFactors = {
            punjab: 1550,
            sindh: 1700,
            kpk: 1450,
            balochistan: 1850,
            islamabad: 1520
        };

        function calculateSlabBill(units) {
            let bill = 0;
            let remainingUnits = units;
            for (let slab of tariffSlabs) {
                if (remainingUnits <= 0) break;
                const slabMin = slab.min;
                const slabMax = slab.max === Infinity ? remainingUnits + slabMin - 1 : slab.max;
                const slabSize = slabMax - slabMin + 1;
                const unitsInThisSlab = Math.min(remainingUnits, slabSize);
                if (units >= slabMin) {
                    bill += unitsInThisSlab * slab.rate;
                    remainingUnits -= unitsInThisSlab;
                }
            }
            return bill;
        }

        function calculateWeightedAverageRate(monthlyUnits) {
            return monthlyUnits > 0 ? calculateSlabBill(monthlyUnits) / monthlyUnits : 0;
        }

        function calculateIRR(cashFlows, guess = 0.1) {
            const maxIterations = 100;
            const tolerance = 1e-6;
            for (let i = 0; i < maxIterations; i++) {
                let npv = 0;
                let dnpv = 0;
                cashFlows.forEach((cf, year) => {
                    const discount = Math.pow(1 + guess, year);
                    npv += cf / discount;
                    if (year > 0) {
                        dnpv -= year * cf / Math.pow(1 + guess, year + 1);
                    }
                });
                if (Math.abs(npv) < tolerance) return guess;
                if (Math.abs(dnpv) < tolerance) break;
                guess = guess - npv / dnpv;
                if (guess < -0.99) guess = -0.99;
                if (guess > 10) guess = 10;
            }
            return guess;
        }

        function calculateROI() {
            console.log('ROI calculation started');
            
            const monthlyConsumption = parseFloat(document.getElementById('monthlyConsumption').value);
            const systemSize = parseFloat(document.getElementById('systemSize').value);
            const region = document.getElementById('region').value;
            const systemCostPerKW = parseFloat(document.getElementById('systemCostPerKW').value);

            const discountRate = 0.08;
            const electricityInflation = 0.12;
            const generalInflation = 0.08;
            const systemDegradation = 0.005;
            const maintenanceRate = 0.015;
            const analysisYears = 25;

            // Apply derate factor to production
            const DERATE_FACTOR = 0.76; // 0.80 (performance ratio) × 0.95 (misc losses)

            if (!monthlyConsumption || !systemSize || !region || !systemCostPerKW) {
                alert('Please fill in all required fields');
                return;
            }

            const annualConsumption = monthlyConsumption * 12;
            // Apply derate factor to regional production
            const annualProduction = systemSize * regionalFactors[region] * DERATE_FACTOR;
            const systemCost = systemSize * systemCostPerKW;
            const avgTariffRate = calculateWeightedAverageRate(monthlyConsumption);

            const usableProductionRatio = Math.min(1, annualProduction / annualConsumption);
            const systemUtilization = (Math.min(annualProduction, annualConsumption) / annualProduction) * 100;

            const cashFlows = [-systemCost];
            let cumulativeDiscountedCashFlow = -systemCost;
            let paybackYear = null;

            for (let year = 1; year <= analysisYears; year++) {
                const yearlyProduction = annualProduction * Math.pow(1 - systemDegradation, year - 1);
                const usableProduction = Math.min(yearlyProduction, annualConsumption);
                const inflatedTariffRate = avgTariffRate * Math.pow(1 + electricityInflation, year - 1);
                const energySavings = usableProduction * inflatedTariffRate;
                const maintenanceCost = systemCost * maintenanceRate * Math.pow(1 + generalInflation, year - 1);
                const netCashFlow = energySavings - maintenanceCost;
                cashFlows.push(netCashFlow);
                const discountedCashFlow = netCashFlow / Math.pow(1 + discountRate, year);
                cumulativeDiscountedCashFlow += discountedCashFlow;
                if (paybackYear === null && cumulativeDiscountedCashFlow > 0) {
                    paybackYear = year;
                }
            }

            const irr = calculateIRR(cashFlows);
            const totalROI = (cashFlows.slice(1).reduce((sum, cf) => sum + cf, 0) / systemCost) * 100;
            const firstYearSavings = cashFlows[1];
            const fiveYearSavings = cashFlows.slice(1, 6).reduce((sum, cf) => sum + cf, 0);
            const lifetimeSavings = cashFlows.slice(1).reduce((sum, cf) => sum + cf, 0);
            const monthlySavings = firstYearSavings / 12;

            document.getElementById('fiveYearSavings').textContent = `Rs ${fiveYearSavings.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
            document.getElementById('monthlySavings').textContent = `Rs ${monthlySavings.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
            document.getElementById('yearlySavings').textContent = `Rs ${firstYearSavings.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
            document.getElementById('lifetimeSavings').textContent = `Rs ${lifetimeSavings.toLocaleString(undefined, {maximumFractionDigits: 0})}`;

            document.getElementById('irr').textContent = `${(irr * 100).toFixed(1)}%`;
            document.getElementById('paybackPeriod').textContent = paybackYear ? `${paybackYear} years` : 'Never';
            document.getElementById('totalROI').textContent = `${totalROI.toFixed(1)}%`;
            document.getElementById('systemEfficiency').textContent = `${systemUtilization.toFixed(1)}%`;

            const irrCard = document.getElementById('irrCard');
            irrCard.className = 'result-card-small ' + (irr > discountRate ? 'positive' : 'negative');

            generateRecommendations(systemSize, annualConsumption, annualProduction, systemUtilization, region);

            document.getElementById('results').classList.add('show');
            document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
            
            console.log('ROI calculation completed');
        }

        function generateRecommendations(systemSize, consumption, production, utilization, region) {
            const regionFactor = regionalFactors[region];
            const recommendedSize = consumption / regionFactor;
            let recommendations = '<h4>System Recommendations</h4>';
            if (utilization < 80) {
                recommendations += `<p><strong>⚠️ Oversized System:</strong> Your system is only ${utilization.toFixed(1)}% utilized. Consider reducing to ${recommendedSize.toFixed(1)}kW for better financial returns.</p>`;
            } else if (utilization > 95) {
                recommendations += `<p><strong>📈 Well-sized System:</strong> Your system utilization is ${utilization.toFixed(1)}%, which is excellent for off-grid applications.</p>`;
            } else {
                recommendations += `<p><strong>✅ Good System Size:</strong> Your system utilization is ${utilization.toFixed(1)}%, which is reasonable for off-grid use.</p>`;
            }
            recommendations += `<p><strong>Optimal Size:</strong> For your ${consumption.toLocaleString()} kWh annual consumption in ${region.charAt(0).toUpperCase() + region.slice(1)}, the optimal system size would be ${recommendedSize.toFixed(1)}kW.</p>`;
            if (production > consumption) {
                const excessProduction = production - consumption;
                recommendations += `<p><strong>Excess Production:</strong> Your system produces ${excessProduction.toLocaleString()} kWh more than you consume annually. This excess cannot be monetized in off-grid systems.</p>`;
            }
            document.getElementById('recommendations').innerHTML = recommendations;
        }

        function calculateBatteryCapacity() {
            console.log('Battery calculation started');
            
            // Get input values
            const batteryInput = document.getElementById('batteryMonthlyConsumption');
            const roiInput = document.getElementById('monthlyConsumption');
            const backupDaysInput = document.getElementById('backupDays');
            const batteryDODInput = document.getElementById('batteryDOD');
            const systemVoltageInput = document.getElementById('systemVoltage');
            
            console.log('Input elements found:', {
                batteryInput: !!batteryInput,
                roiInput: !!roiInput,
                backupDaysInput: !!backupDaysInput,
                batteryDODInput: !!batteryDODInput,
                systemVoltageInput: !!systemVoltageInput
            });
            
            // Get monthly consumption - try battery input first, then ROI input
            let monthlyConsumption = 0;
            if (batteryInput && batteryInput.value && parseFloat(batteryInput.value) > 0) {
                monthlyConsumption = parseFloat(batteryInput.value);
                console.log('Using battery input:', monthlyConsumption);
            } else if (roiInput && roiInput.value && parseFloat(roiInput.value) > 0) {
                monthlyConsumption = parseFloat(roiInput.value);
                console.log('Using ROI input:', monthlyConsumption);
            }
            
            // Get other values with defaults
            const backupDays = backupDaysInput ? parseFloat(backupDaysInput.value) || 2 : 2;
            const batteryDOD = batteryDODInput ? parseFloat(batteryDODInput.value) / 100 || 0.8 : 0.8;
            const systemVoltage = systemVoltageInput ? parseFloat(systemVoltageInput.value) || 24 : 24;

            console.log('All values:', {
                monthlyConsumption,
                backupDays,
                batteryDOD,
                systemVoltage
            });

            if (!monthlyConsumption || monthlyConsumption <= 0) {
                alert('Please enter your monthly consumption in the Battery Calculator or use the ROI Calculator first');
                console.log('Stopping - no valid monthly consumption');
                return;
            }

            console.log('Proceeding with battery calculation...');

            // Calculate battery requirements
            const dailyConsumption = monthlyConsumption / 30;
            const dailyConsumptionWh = dailyConsumption * 1000;
            const totalEnergyNeeded = dailyConsumptionWh * backupDays;
            const batteryCapacityWh = totalEnergyNeeded / batteryDOD;
            const batteryCapacityAh = batteryCapacityWh / systemVoltage;

            console.log('Calculation results:', {
                dailyConsumption,
                dailyConsumptionWh,
                totalEnergyNeeded,
                batteryCapacityWh,
                batteryCapacityAh
            });

            // Generate recommendation
            let recommendation = '<h4>🔋 Battery Capacity Recommendation</h4>';
            recommendation += `<p><strong>Daily Consumption:</strong> ${dailyConsumption.toFixed(1)} kWh (${dailyConsumptionWh.toFixed(0)} Wh)</p>`;
            recommendation += `<p><strong>Backup Duration:</strong> ${backupDays} days</p>`;
            recommendation += `<p><strong>Total Energy Storage Needed:</strong> ${(batteryCapacityWh/1000).toFixed(1)} kWh</p>`;
            recommendation += `<p><strong>Battery Bank Capacity Required:</strong> ${batteryCapacityAh.toFixed(0)} Ah at ${systemVoltage}V</p>`;

            recommendation += `<h5><strong>💡 Practical Battery Configuration Options:</strong></h5>`;
            
            if (systemVoltage == 12) {
                const batteries100Ah = Math.ceil(batteryCapacityAh / 100);
                const batteries200Ah = Math.ceil(batteryCapacityAh / 200);
                recommendation += `<p>📦 <strong>Option 1:</strong> ${batteries100Ah} x 100Ah batteries (12V) = ${batteries100Ah * 100}Ah total capacity</p>`;
                recommendation += `<p>📦 <strong>Option 2:</strong> ${batteries200Ah} x 200Ah batteries (12V) = ${batteries200Ah * 200}Ah total capacity</p>`;
            } else if (systemVoltage == 24) {
                const batteries100Ah = Math.ceil(batteryCapacityAh / 100);
                const batteries150Ah = Math.ceil(batteryCapacityAh / 150);
                recommendation += `<p>📦 <strong>Option 1:</strong> ${batteries100Ah * 2} x 100Ah batteries wired in series-parallel (24V system) = ${batteries100Ah * 100}Ah capacity</p>`;
                recommendation += `<p>📦 <strong>Option 2:</strong> ${batteries150Ah * 2} x 150Ah batteries wired in series-parallel (24V system) = ${batteries150Ah * 150}Ah capacity</p>`;
            } else { // 48V
                const batteries100Ah = Math.ceil(batteryCapacityAh / 100);
                const batteries200Ah = Math.ceil(batteryCapacityAh / 200);
                recommendation += `<p>📦 <strong>Option 1:</strong> ${batteries100Ah * 4} x 100Ah batteries wired in series-parallel (48V system) = ${batteries100Ah * 100}Ah capacity</p>`;
                recommendation += `<p>📦 <strong>Option 2:</strong> ${batteries200Ah * 4} x 200Ah batteries wired in series-parallel (48V system) = ${batteries200Ah * 200}Ah capacity</p>`;
            }

            recommendation += `<div style="background: rgba(255,215,0,0.1); padding: 1rem; border-radius: 8px; margin-top: 1rem; border-left: 4px solid #ffd700;">`;
            recommendation += `<p><strong>💰 Important Note:</strong> Battery costs are typically Rs 15,000-25,000 per 100Ah unit and are not included in the ROI calculation above. Consider adding battery replacement costs every 5-8 years for accurate financial planning.</p>`;
            recommendation += `</div>`;

            // Display results
            const recommendationElement = document.getElementById('batteryRecommendation');
            console.log('Recommendation element found:', !!recommendationElement);
            
            if (recommendationElement) {
                recommendationElement.innerHTML = recommendation;
                recommendationElement.style.display = 'block';
                recommendationElement.scrollIntoView({ behavior: 'smooth' });
                console.log('Battery results displayed successfully!');
            } else {
                console.error('Could not find batteryRecommendation element');
                alert('Error displaying results. Please refresh the page and try again.');
            }
        }