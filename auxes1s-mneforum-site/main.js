/*
  MAIN.JS
  - Core JavaScript for the Monitoring and Evaluation Network Forum.
  - Handles interactivity for the countdown timer, accordion, and loading animation.
*/

document.addEventListener('DOMContentLoaded', () => {

  // 0. Set viewport height unit
  // This addresses the issue on mobile browsers where the viewport height changes
  // when the address bar hides/shows on scroll. By setting a CSS custom property
  // (--vh) to the window's inner height, we create a stable unit that can be
  // used in CSS to prevent layout shifts or "zooming" backgrounds.
  const setVh = () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight}px`);
  };

  // Set the value on initial load
  setVh();

  // Also set it on orientation change
  window.addEventListener('orientationchange', setVh);

  // 1. Handle the initial loading animation
  // Fades the page in by removing the 'loading' class from the body.
  // The transition is handled in CSS.
  document.body.classList.remove('loading');

  // 2. Initialize the countdown timer
  const countdownElement = document.getElementById('countdown');
  if (countdownElement) {
    // Set the date for the event.
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
        // Disable the button temporarily to prevent spamming during the transition.
        button.style.pointerEvents = 'none';
        setTimeout(() => {
          button.style.pointerEvents = 'auto';
        }, 300); // Must match the transition duration in style.css

        const isExpanded = button.getAttribute('aria-expanded') === 'true';

        // This version allows multiple accordions to be open at once.
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
  // This function creates a subtle effect where the header's background overlay
  // fades in as the user scrolls down the page. This helps to visually separate
  // the header from the content that scrolls beneath it.
  const header = document.querySelector('.header');
  if (header) {
    const handleScroll = () => {
      const headerHeight = header.offsetHeight;
      const scrollPosition = window.scrollY;

      // We only apply the effect once the user has started scrolling.
      if (scrollPosition > 0) {
        // The opacity is calculated based on how far the user has scrolled relative
        // to the height of the header. The fade is capped at 50% opacity to
        // ensure the background remains subtly visible.
        let opacity = scrollPosition / headerHeight;
        opacity = Math.min(opacity, 0.5); // Cap the opacity at 0.5

        // The calculated opacity is applied to a CSS custom property on the header.
        // This property is used by the .header::before pseudo-element in the CSS
        // to set its background opacity, creating the fade effect.
        header.style.setProperty('--header-overlay-opacity', opacity);
      } else {
        // When at the top of the page, the overlay is fully transparent.
        header.style.setProperty('--header-overlay-opacity', 0);
      }
    };

    // The scroll event is throttled by the browser using { passive: true } for
    // better performance, as we are not preventing the default scroll behavior.
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
});
