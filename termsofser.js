 // Smooth scrolling for navigation and TOC links
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

        // Add scroll animations to sections
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

        // Observe sections for animation
        document.querySelectorAll('.section, .terms-icon, .key-term').forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(element);
        });

        // Highlight current section in TOC
        const sections = document.querySelectorAll('.section[id]');
        const tocLinks = document.querySelectorAll('.toc-list a');

        function highlightCurrentSection() {
            let currentSection = '';
            
            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= 100 && rect.bottom >= 100) {
                    currentSection = section.id;
                }
            });

            tocLinks.forEach(link => {
                if (link.getAttribute('href') === `#${currentSection}`) {
                    link.style.color = 'var(--primary)';
                    link.style.fontWeight = '600';
                } else {
                    link.style.color = 'var(--gray-300)';
                    link.style.fontWeight = '400';
                }
            });
        }

        window.addEventListener('scroll', highlightCurrentSection);
        highlightCurrentSection(); // Initial call

        // Add hover effects to key terms
        document.querySelectorAll('.key-term').forEach(term => {
            term.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px) scale(1.02)';
            });
            
            term.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(-3px) scale(1)';
            });
        });

        // Add interactive effects to highlight boxes
        document.querySelectorAll('.highlight-box, .info-box').forEach(box => {
            box.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 10px 25px rgba(0,245,255,0.1)';
            });
            
            box.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            });
        });