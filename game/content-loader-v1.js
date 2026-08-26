(function (root, document) {
  'use strict';

  const PACK_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,47}[a-z0-9])?$/;
  const params = new URLSearchParams(root.location.search);
  const fallbackId = document.documentElement.dataset.casePack || 'forum-v1';
  const requestedId = params.get('pack') || fallbackId;
  let registered = false;
  let resolvePack;
  let rejectPack;

  root.BuzzContentReady = new Promise(function (resolve, reject) {
    resolvePack = resolve;
    rejectPack = reject;
  });

  root.BuzzCasePacks = {
    requestedId: requestedId,
    register: function (id, pack) {
      if (registered || id !== requestedId) return false;
      registered = true;
      root.BuzzContent = pack;
      resolvePack(pack);
      return true;
    }
  };

  if (!PACK_PATTERN.test(requestedId)) {
    rejectPack(new Error('Case-pack names may contain only lowercase letters, numbers, and hyphens.'));
    return;
  }

  const script = document.createElement('script');
  script.src = 'cases/' + requestedId + '.js';
  script.onload = function () {
    if (!registered) rejectPack(new Error('The case pack loaded but did not register as "' + requestedId + '".'));
  };
  script.onerror = function () {
    rejectPack(new Error('Case pack "' + requestedId + '" could not be loaded.'));
  };
  document.head.appendChild(script);
}(window, document));

