// Add functionality to display the overlay when "View" is clicked
    document.addEventListener('DOMContentLoaded', function() {
        // Get all "View" buttons
        var viewButtons = document.querySelectorAll('.view-btn');
        
        // Loop through all buttons and add click event
        viewButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                var project = this.closest('.project');
                var overlay = project.querySelector('.overlay');
                overlay.style.display = 'flex'; // Show overlay
            });
        });

        // Get all "Close" buttons inside overlays
        var closeButtons = document.querySelectorAll('.close');
        
        // Loop through all close buttons and add click event
        closeButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                var overlay = this.closest('.overlay');
                overlay.style.display = 'none'; // Hide overlay
            });
        });
    });