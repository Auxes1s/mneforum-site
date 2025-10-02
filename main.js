document.addEventListener('DOMContentLoaded', () => {
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

    const initSlideshow = () => {
        const slideshowContainer = document.querySelector('.slideshow-container');
        if (!slideshowContainer) return;

        // INSTRUCTIONS:
        // 1. Add your image files to the `assets/slideshow` directory.
        // 2. Run the `generate_image_list.py` script in your terminal by typing:
        //    python generate_image_list.py
        // 3. The script will print a list of image paths. Copy that list.
        // 4. Paste the copied list here, replacing the existing placeholder paths.
        const images = [
            'assets/slideshow/placeholder1.svg',
            'assets/slideshow/placeholder2.svg',
            'assets/slideshow/placeholder3.svg'
        ];

        let currentIndex = 0;

        // Fisher-Yates (aka Knuth) Shuffle function to randomize the image order
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        // Shuffle the images array initially so the order is random from the start
        shuffleArray(images);

        // Create and append slide elements to the DOM based on the shuffled order
        images.forEach(src => {
            const slide = document.createElement('div');
            slide.className = 'slide';
            const img = document.createElement('img');
            img.src = src;
            img.alt = 'Slideshow image';
            slide.appendChild(img);
            slideshowContainer.appendChild(slide);
        });

        const slides = slideshowContainer.querySelectorAll('.slide');

        function showNextSlide() {
            // Hide all slides before showing the next one
            slides.forEach(slide => {
                slide.style.display = 'none';
            });

            // Show the current slide
            if (slides[currentIndex]) {
                slides[currentIndex].style.display = 'block';
            }

            // Move to the next index
            currentIndex++;

            // If we've shown all images, re-shuffle the order and start over
            if (currentIndex >= slides.length) {
                currentIndex = 0;
                // Re-shuffle the image sources and update the img elements
                shuffleArray(images);
                slides.forEach((slide, index) => {
                    slide.querySelector('img').src = images[index];
                });
            }
        }

        // Display the first slide immediately
        if (slides.length > 0) {
            showNextSlide();
        }

        // Change slide every 5 seconds
        setInterval(showNextSlide, 5000);
    };

    initCountdown();
    initAccordions();
    initSlideshow();
});