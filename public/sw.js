importScripts("/src/js/idb.js");
importScripts("/src/js/utility.js");

const CACHE_STATIC_NAME = "static-v40";
const CACHE_DYNAMIC_NAME = "dynamic-v3";
const STATIC_FILES = [
  "/",
  "/index.html",
  "/offline.html",
  "/src/js/app.js",
  "/src/js/utility.js",
  "/src/js/feed.js",
  "/src/js/idb.js",
  "/src/js/promise.js",
  "/src/js/fetch.js",
  "/src/js/material.min.js",
  "/src/css/app.css",
  "/src/css/feed.css",
  "/src/images/main-image.jpg",
  "https://fonts.googleapis.com/css?family=Roboto:400,700",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css"
];

{
  // const trimCache = (cacheName, maxItems) => {
  //   caches.open(cacheName).then(cache => {
  //     cache.keys().then(keys => {
  //       if (keys.length > maxItems) {
  //         cache.delete(keys[0]).then(trimCache(cacheName, maxItems));
  //       }
  //     });
  //   });
  // };
}

self.addEventListener("install", event => {
  console.log("[Service Worker] Installing Service Worker ...", event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(cache => {
      console.log("[SW] pre-caching app shell");
      cache.addAll(STATIC_FILES);
    })
  );
});

self.addEventListener("activate", event => {
  console.log("[Service Worker] Activating Service Worker ....", event);
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log("[SW] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

const isInArray = (string, array) => {
  var cachePath;
  if (string.indexOf(self.origin) === 0) {
    // request targets domain where we serve the page from (i.e. NOT a CDN)
    console.log("matched ", string);
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
};

//cache, then network
self.addEventListener("fetch", event => {
  const url = "https://pwagram08.firebaseio.com/posts.json";

  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clonedRes = response.clone();
        //first clear data within IDB
        clearAllData("posts")
          .then(() => {
            return clonedRes.json();
          })
          .then(data => {
            for (let key in data) {
              //also store response in IndexedDB
              writeData("posts", data[key]);
            }
          });
        return response;
      })
    );
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    event.respondWith(caches.match(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        } else {
          return fetch(event.request)
            .then(res => {
              return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
                // trimCache(CACHE_DYNAMIC_NAME, 3);
                cache.put(event.request.url, res.clone());
                return res;
              });
            })
            .catch(err => {
              return caches.open(CACHE_STATIC_NAME).then(cache => {
                if (event.request.headers.get("accept").includes("text/html")) {
                  return cache.match("/offline.html");
                }
              });
            });
        }
      })
    );
  }
});

{
  //cache with network fallback
  // self.addEventListener("fetch", function(event) {
  //   event.respondWith(
  //     caches.match(event.request).then(response => {
  //       if (response) {
  //         return response;
  //       } else {
  //         return fetch(event.request)
  //           .then(res => {
  //             return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
  //               cache.put(event.request.url, res.clone());
  //               return res;
  //             });
  //           })
  //           .catch(err => {
  //             return caches.open(CACHE_STATIC_NAME).then(cache => {
  //               return cache.match("/offline.html");
  //             });
  //           });
  //       }
  //     })
  //   );
  // });
  //cache-only strategy
  // self.addEventListener("fetch", function(event) {
  //   event.respondWith(caches.match(event.request));
  // });
  //Network-only strategy
  // self.addEventListener("fetch", function(event) {
  //   event.respondWith(fetch(event.request));
  // });
  //Network with cache-fallback
  // self.addEventListener("fetch", function(event) {
  //   event.respondWith(
  //     fetch(event.request)
  //       .then(response => {
  //         return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
  //           cache.put(event.request.url, response.clone());
  //           return res;
  //         });
  //       })
  //       .catch(err => {
  //         return caches.match(event.request);
  //       })
  //   );
  // });
}

self.addEventListener("sync", event => {
  console.log("[SW] background syncing is in progress", event);
  if (event.tag === "sync-new-post") {
    console.log("[SW] syncing new post");
    event.waitUntil(
      readAllData("sync-posts").then(data => {
        for (let dt of data) {
          const postData = new FormData();
          postData.append("id", dt.id);
          postData.append("title", dt.title);
          postData.append("location", dt.location);
          postData.append("rawLocationLat", dt.rawLocation.lat);
          postData.append("rawLocationLng", dt.rawLocation.lng);
          postData.append("file", dt.picture, dt.id + ".png");

          fetch(
            "https://us-central1-pwagram08.cloudfunctions.net/storePostData",
            {
              method: "POST",
              body: postData
            }
          )
            .then(res => {
              console.log("[SW] sent data", res);
              if (res.ok) {
                res.json().then(resData => {
                  deleteItemFromData("sync-posts", resData.id);
                });
              }
            })
            .catch(err => console.log(err));
        }
      })
    );
  }
});

self.addEventListener("notificationclick", event => {
  let notification = event.notification;
  let action = event.action;
  console.log("[sw] notification", notification);
  if (action === "confirm") {
    console.log("[SW] confirm was choosen");
    notification.close();
  } else {
    console.log("action", action);
    event.waitUntil(
      clients.matchAll().then(clis => {
        let client = clis.find(c => {
          return c.visibilityState === "visible";
        });

        if (client !== undefined) {
          client.navigate(notification.data.url);
          client.focus();
        } else {
          clients.openWindow(notification.data.url);
        }
        notification.close();
      })
    );
  }
});

self.addEventListener("notificationclose", event => {
  console.log("Notification was closed", event);
});

self.addEventListener("push", event => {
  console.log("[sw] push notification received", event);
  let data = {
    title: "New!",
    content: "Something new happened!",
    openUrl: "/"
  };
  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  let options = {
    body: data.content,
    icon: "/src/images/icons/app-icon-96x96.png",
    badge: "/src/images/icons/app-icon-96x96.png",
    data: {
      url: data.openUrl
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
