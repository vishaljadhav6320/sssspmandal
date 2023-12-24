// Smooth scrolling when clicking on navigation links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

$(document).ready(function() {
    $("[unique-script-id='w-w-dm-id'] .list").click(function() {
        const selectedCategory = $(this).data('filter');
        if (selectedCategory === 'all') {
            $("[unique-script-id='w-w-dm-id'] .project").show('1000');
        } else {
            $("[unique-script-id='w-w-dm-id'] .project").hide();
            $("[unique-script-id='w-w-dm-id'] .project[data-category='" + selectedCategory + "']").show('1000');
        }
        $(this).addClass('active').siblings().removeClass('active');
    });
});
