// Add some interactive effects
        document.addEventListener('DOMContentLoaded', function() {
            // Animate progress bar randomly
            const progressBar = document.querySelector('.progress-bar');
            
            setInterval(() => {
                const randomWidth = Math.floor(Math.random() * 30) + 60; // 60-90%
                progressBar.style.width = randomWidth + '%';
            }, 4000);

            // Add hover effects to feature items
            document.querySelectorAll('.feature-item').forEach(item => {
                item.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-5px) scale(1.05)';
                });
                
                item.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                });
            });

            // Smooth scrolling for navigation links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    // For under construction page, you might want to redirect to home
                    // or show a message that the section is coming soon
                    alert('This section is coming soon! We\'ll redirect you to our available tools.');
                    // window.location.href = '/'; // Redirect to homepage
                });
            });
        });