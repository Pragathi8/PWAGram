importScripts("workbox-sw.prod.v2.1.3.js");
importScripts("/src/js/idb.js");
importScripts("/src/js/utility.js");

const workboxSW = new self.WorkboxSW();

workboxSW.router.registerRoute(
  /.*(?:googleapis|gstatic)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: "google-fonts",
    cacheExpiration: {
      maxEntries: 4,
      maxAgeSeconds: 60 * 60 * 24 * 30
    }
  })
);

workboxSW.router.registerRoute(
  "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css",
  workboxSW.strategies.staleWhileRevalidate({ cacheName: "material-css" })
);

workboxSW.router.registerRoute(
  /.*(?:firebasestorage\.googleapis)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({ cacheName: "post-images" })
);

workboxSW.router.registerRoute(
  "https://pwagram08.firebaseio.com/posts.json",
  args => {
    return fetch(args.event.request).then(response => {
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
    });
  }
);

workboxSW.router.registerRoute(
  routeData => {
    return routeData.event.request.headers.get("accept").includes("text/html");
  },
  args => {
    return caches.match(args.event.request).then(response => {
      if (response) {
        return response;
      } else {
        return fetch(args.event.request)
          .then(res => {
            return caches.open("dynamic").then(cache => {
              // trimCache(CACHE_DYNAMIC_NAME, 3);
              cache.put(args.event.request.url, res.clone());
              return res;
            });
          })
          .catch(err => {
            return caches.match("/offline.html").then(res => {
              return res;
            });
          });
      }
    });
  }
);

workboxSW.precache([
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "6350d2b0dd4c2bfac7dc3b69b70339b6"
  },
  {
    "url": "manifest.json",
    "revision": "d11c7965f5cfba711c8e74afa6c703d7"
  },
  {
    "url": "offline.html",
    "revision": "71312f78b045f8643e08579fa906bdd0"
  },
  {
    "url": "src/css/app.css",
    "revision": "59d917c544c1928dd9a9e1099b0abd71"
  },
  {
    "url": "src/css/feed.css",
    "revision": "65a72fceb62aff94ae824edee6e4fb35"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  },
  {
    "url": "src/js/app.min.js",
    "revision": "ec9ee2a6bdfa1e49d463dcf64b20ae5b"
  },
  {
    "url": "src/js/feed.min.js",
    "revision": "e2c483c97b7dfddfc55f2b6b3e82010a"
  },
  {
    "url": "src/js/fetch.min.js",
    "revision": "a61b77b41205b0a6ecc232d5c76b175a"
  },
  {
    "url": "src/js/idb.min.js",
    "revision": "741857752710b399a90d31d1d249f8d8"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "713af0c6ce93dbbce2f00bf0a98d0541"
  },
  {
    "url": "src/js/promise.min.js",
    "revision": "c78450c3155e6dbafa91344ea1e35b89"
  },
  {
    "url": "src/js/utility.min.js",
    "revision": "5015ebb5014ff12ae45b46fd42ce9929"
  }
]);

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
