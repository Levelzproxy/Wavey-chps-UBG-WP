/* Scramjet 2 service worker.
 * The controller package owns the actual proxying; this file only wires it up
 * and gives it a scope that covers the proxy prefix (the folder this file is
 * served from), so it works at a domain root and at /repo/ on GitHub Pages.
 */
importScripts("controller/controller.sw.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (self.$scramjetController && self.$scramjetController.shouldRoute(event)) {
    event.respondWith(self.$scramjetController.route(event));
  }
});
