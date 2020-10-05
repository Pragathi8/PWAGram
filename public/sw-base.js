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

workboxSW.precache([]);

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
