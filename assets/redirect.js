(function () {
  "use strict";

  function initializeRedirect() {
    var page = document.querySelector(".redirect-page");
    var destinationLink = document.querySelector("[data-redirect-destination]");
    var countdown = document.querySelector("[data-redirect-countdown]");
    var status = document.querySelector("[data-redirect-status]");
    var metaRefresh = document.querySelector('meta[http-equiv="refresh"]');

    if (!page || !destinationLink || !countdown || !status) {
      return;
    }

    var destination = destinationLink.href;
    var delay = Number.parseInt(page.getAttribute("data-redirect-delay"), 10);

    if (!Number.isFinite(delay) || delay < 1) {
      delay = 3;
    }

    // The meta refresh remains in the document until JavaScript is ready, so
    // the same page still works when scripts are blocked or unavailable.
    if (metaRefresh) {
      metaRefresh.remove();
    }

    page.classList.add("redirect-js-enabled");

    var remaining = delay;
    var updateStatus = function (message) {
      countdown.textContent = String(remaining);
      status.textContent = message;
    };

    updateStatus(
      "Redirecting in " + remaining + (remaining === 1 ? " second." : " seconds.")
    );

    var timer = window.setInterval(function () {
      remaining -= 1;

      if (remaining <= 0) {
        window.clearInterval(timer);
        status.textContent = "Opening the form now.";
        window.location.replace(destination);
        return;
      }

      updateStatus(
        "Redirecting in " + remaining + (remaining === 1 ? " second." : " seconds.")
      );
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeRedirect, { once: true });
  } else {
    initializeRedirect();
  }
})();
