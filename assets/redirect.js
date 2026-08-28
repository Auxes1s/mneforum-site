(function () {
    var body = document.body;
    var destinationLink = document.querySelector('[data-redirect-destination]');
    var count = document.querySelector('[data-redirect-count]');
    if (!body || !destinationLink || !count) return;

    var remaining = Number(body.getAttribute('data-redirect-seconds') || '5');
    if (!Number.isFinite(remaining) || remaining < 1) remaining = 5;
    var destination = destinationLink.href;
    count.textContent = String(remaining);

    var timer = window.setInterval(function () {
        remaining -= 1;
        count.textContent = String(Math.max(remaining, 0));
        if (remaining <= 0) {
            window.clearInterval(timer);
            window.location.replace(destination);
        }
    }, 1000);
}());
