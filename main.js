/*
  MAIN.JS
  - Core JavaScript for the Monitoring and Evaluation Network Forum.
  - Handles interactivity for the countdown timer, accordion, and loading animation.
*/

document.addEventListener('DOMContentLoaded', () => {

  // 1. Handle the initial loading animation
  // Fades the page in by removing the 'loading' class from the body.
  // The transition is handled in CSS.
  document.body.classList.remove('loading');

  // 2. Initialize the countdown timer
  const countdownElement = document.getElementById('countdown');
  if (countdownElement) {
    // Set the date for the event
    // TODO: Confirm the exact time and timezone for the event
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
        <div class="countdown__item">
          <span class="countdown__number">${days}</span>
          <span class="countdown__label">Days</span>
        </div>
        <div class="countdown__item">
          <span class="countdown__number">${hours}</span>
          <span class="countdown__label">Hours</span>
        </div>
        <div class="countdown__item">
          <span class="countdown__number">${minutes}</span>
          <span class="countdown__label">Minutes</span>
        </div>
        <div class="countdown__item">
          <span class="countdown__number">${seconds}</span>
          <span class="countdown__label">Seconds</span>
        </div>
      `;
    };

    const countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call
  }

  // 3. Initialize the accordion functionality
  const accordionItems = document.querySelectorAll('.accordion__item');
  accordionItems.forEach(item => {
    const button = item.querySelector('.accordion__button');
    const content = item.querySelector('.accordion__content');

    if (button && content) {
      button.addEventListener('click', () => {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';

        // This version allows multiple accordions to be open at once.
        // To close others when one is opened, we would add the logic from the previous attempt here.
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

  // 4. Handle header fade on scroll
  const header = document.querySelector('.header');
  if (header) {
    const handleScroll = () => {
      const headerHeight = header.offsetHeight;
      const scrollPosition = window.scrollY;

      // Start fading only when user scrolls down
      if (scrollPosition > 0) {
        // Calculate opacity: 0 at top, 1 when header is about to scroll out of view
        let opacity = scrollPosition / (headerHeight * 0.9); // Adjust 0.9 to control fade speed
        opacity = Math.min(opacity, 1); // Ensure opacity doesn't exceed 1

        // Use a CSS custom property to set the opacity on the ::before pseudo-element
        header.style.setProperty('--header-overlay-opacity', opacity);
      } else {
        header.style.setProperty('--header-overlay-opacity', 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }
});
