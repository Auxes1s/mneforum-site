document.addEventListener('DOMContentLoaded', () => {
    // Function to handle countdown timer
    const initCountdown = () => {
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;

        const eventDate = new Date('2025-09-29T09:00:00').getTime();
        const updateCountdown = () => {
            const now = new Date().getTime();
            const distance = eventDate - now;

            if (distance < 0) {
                countdownElement.innerHTML = '<p>The event has started!</p>';
                clearInterval(countdownInterval);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            countdownElement.innerHTML = `
                <div class="countdown__item"><span class="countdown__number">${days}</span><span class="countdown__label">Days</span></div>
                <div class="countdown__item"><span class="countdown__number">${hours}</span><span class="countdown__label">Hours</span></div>
                <div class="countdown__item"><span class="countdown__number">${minutes}</span><span class="countdown__label">Minutes</span></div>
                <div class="countdown__item"><span class="countdown__number">${seconds}</span><span class="countdown__label">Seconds</span></div>
            `;
        };
        const countdownInterval = setInterval(updateCountdown, 1000);
        updateCountdown();
    };

    // Function to handle accordion logic
    const initAccordions = () => {
        const accordions = document.querySelectorAll('.accordion');
        accordions.forEach(accordion => {
            const items = accordion.querySelectorAll(':scope > .accordion__item');
            items.forEach(item => {
                const button = item.querySelector(':scope > .accordion__button');
                const content = item.querySelector(':scope > .accordion__content');

                if (button && content) {
                    button.addEventListener('click', () => {
                        const isExpanded = button.getAttribute('aria-expanded') === 'true';

                        if (isExpanded) {
                            button.setAttribute('aria-expanded', 'false');
                            content.style.maxHeight = null;
                        } else {
                            button.setAttribute('aria-expanded', 'true');
                            content.style.maxHeight = content.scrollHeight + 'px';
                        }
                    });
                }
            });
        });
    };

    // Initialize all components
    initCountdown();
    initAccordions();
});