// FAQ Accordion Functionality
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                const isActive = question.classList.contains('active');
                
                // Close all other open FAQs
                document.querySelectorAll('.faq-question.active').forEach(activeQuestion => {
                    if (activeQuestion !== question) {
                        activeQuestion.classList.remove('active');
                        activeQuestion.nextElementSibling.classList.remove('active');
                    }
                });
                
                // Toggle current FAQ
                if (isActive) {
                    question.classList.remove('active');
                    answer.classList.remove('active');
                } else {
                    question.classList.add('active');
                    answer.classList.add('active');
                }
            });
        });

        // Search Functionality
        const searchBox = document.getElementById('searchBox');
        const sections = document.querySelectorAll('.section');
        const faqItems = document.querySelectorAll('.faq-item');

        searchBox.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            if (searchTerm === '') {
                // Show all sections and items
                sections.forEach(section => {
                    section.style.display = 'block';
                });
                faqItems.forEach(item => {
                    item.style.display = 'block';
                });
                return;
            }
            
            // Filter FAQ items
            faqItems.forEach(item => {
                const question = item.querySelector('.faq-question').textContent.toLowerCase();
                const answer = item.querySelector('.faq-answer-content').textContent.toLowerCase();
                
                if (question.includes(searchTerm) || answer.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Hide sections that have no visible items
            sections.forEach(section => {
                const visibleItems = section.querySelectorAll('.faq-item[style="display: block;"], .faq-item:not([style])');
                const hasVisibleItems = Array.from(section.querySelectorAll('.faq-item')).some(item => 
                    item.style.display !== 'none'
                );
                
                if (hasVisibleItems) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
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
        sections.forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(section);
        });

        // Auto-expand first FAQ in each section for better UX
        document.addEventListener('DOMContentLoaded', () => {
            // Optional: Auto-expand the first FAQ in the first section
            const firstFaq = document.querySelector('.faq-question');
            if (firstFaq) {
                // Uncomment the lines below if you want the first FAQ to be open by default
                // firstFaq.classList.add('active');
                // firstFaq.nextElementSibling.classList.add('active');
            }
        });