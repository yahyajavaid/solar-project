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

        // Observe elements for animation
        document.querySelectorAll('.content-card, .feature-item, .value-item, .stats-section, .cta-section').forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(element);
        });

        // Add counter animation for stats
        function animateCounters() {
            const counters = document.querySelectorAll('.stat-number');
            counters.forEach(counter => {
                const target = counter.textContent;
                const isPercentage = target.includes('%');
                const isCurrency = target.includes('₨');
                const isKPlus = target.includes('K+');
                const isDecimal = target.includes('.');
                
                let numericTarget = parseFloat(target.replace(/[^\d.]/g, ''));
                if (isKPlus) numericTarget *= 1000;
                
                let current = 0;
                const increment = numericTarget / 50;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= numericTarget) {
                        current = numericTarget;
                        clearInterval(timer);
                    }
                    
                    let displayValue = Math.floor(current);
                    if (isDecimal && current >= numericTarget) displayValue = numericTarget;
                    if (isKPlus) displayValue = Math.floor(displayValue / 1000) + 'K+';
                    if (isCurrency) displayValue = '₨' + displayValue;
                    if (isPercentage) displayValue = displayValue + '%';
                    if (target.includes('/7')) displayValue = displayValue + '/7';
                    
                    counter.textContent = displayValue;
                }, 50);
            });
        }

        // Trigger counter animation when stats section is visible
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    statsObserver.unobserve(entry.target);
                }
            });
        });

        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            statsObserver.observe(statsSection);
        }