'use strict';

/*
 * GitHub Pages отдаёт .mobileconfig как application/octet-stream,
 * из-за чего iOS не устанавливает профиль. Service worker возвращает
 * файл с правильным Content-Type.
 *
 * Кроме того, при повторном заходе на корень сайта worker сразу отдаёт
 * профиль — установка начинается без промежуточной страницы.
 */

var PROFILE_NAME = 'max-block.mobileconfig';
var PROFILE_URL = new URL(PROFILE_NAME + '?v=1', self.location.href).href;
var SCOPE_PATH = new URL('./', self.location.href).pathname;

self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
    var request = event.request;
    if (request.method !== 'GET') return;

    var url;
    try {
        url = new URL(request.url);
    } catch (e) {
        return;
    }

    if (url.origin !== self.location.origin) return;

    var isProfile = url.pathname.endsWith('/' + PROFILE_NAME);
    var isRoot = request.mode === 'navigate' &&
        (url.pathname === SCOPE_PATH || url.pathname === SCOPE_PATH + 'index.html');

    if (!isProfile && !isRoot) return;

    event.respondWith(serveProfile());
});

function serveProfile() {
    return fetch(PROFILE_URL, { cache: 'no-store', credentials: 'same-origin' })
        .then(function (response) {
            if (!response.ok) return response;
            return response.arrayBuffer().then(function (body) {
                return new Response(body, {
                    status: 200,
                    statusText: 'OK',
                    headers: {
                        'Content-Type': 'application/x-apple-aspen-config',
                        'Content-Disposition': 'inline; filename="max-block.mobileconfig"',
                        'Cache-Control': 'no-store, no-cache, must-revalidate'
                    }
                });
            });
        });
}
