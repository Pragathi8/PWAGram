let deferredPrompt;
let enableNotificationsButtons = document.querySelectorAll(
  ".enable-notifications"
);

if (!window.Promise) {
  window.Promise = Promise;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(function() {
      console.log("Service worker registered!");
    })
    .catch(function(err) {
      console.log(err);
    });
}

window.addEventListener("beforeinstallprompt", function(event) {
  console.log("beforeinstallprompt fired");
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

const displayConfirmNotification = () => {
  if ("serviceWorker" in navigator) {
    const options = {
      body: "You successfully Subscribed to our Notification Service",
      icon: "/src/images/icons/app-icon-96x96.png",
      image: "/src/images/sf-boat.jpg",
      dir: "ltr",
      lang: "en-US", //BCP 47
      vibrate: [100, 50, 200],
      badge: "/src/images/icons/app-icon-96x96.png",
      tag: "confirm-notification",
      renotify: true,
      actions: [
        {
          action: "confirm",
          title: "Okay",
          icon: "/src/images/icons/app-icon-96x96.png"
        },
        {
          action: "cancel",
          title: "Cancel",
          icon: "/src/images/icons/app-icon-96x96.png"
        }
      ]
    };

    navigator.serviceWorker.ready.then(swReg => {
      swReg.showNotification("Successfully Subscribed!", options);
    });
  }
};

const configurePushSub = () => {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  let reg;
  navigator.serviceWorker.ready
    .then(swReg => {
      reg = swReg;
      return swReg.pushManager.getSubscription();
    })
    .then(sub => {
      if (sub === null) {
        //create a new subscription
        let vapidPublicKey =
          "BKxqQqWvfWAFtKbtz2j3gY5R-eKfKNfXco1arjNSKBWDrlcWRpi4cw_xmjzqBD03Vw7oiDvZeAr8cTsnIZKvwRE";
        let convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidPublicKey
        });
      } else {
        //we have a subscription
      }
    })
    .then(newSub => {
      return fetch("https://pwagram08.firebaseio.com/subscriptions.json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(newSub)
      });
    })
    .then(res => {
      if (res.ok) {
        displayConfirmNotification();
      }
    })
    .catch(err => {
      console.log(err);
    });
};

const askForNotificationPermission = () => {
  Notification.requestPermission(result => {
    console.log("user choice", result);
    if (result !== "granted") {
      console.log("No notification permission granted!");
    } else {
      // displayConfirmNotification();
      configurePushSub();
    }
  });
};

if ("Notification" in window && "serviceWorker" in navigator) {
  for (let i = 0; i < enableNotificationsButtons.length; i++) {
    enableNotificationsButtons[i].style.display = "inline-block";
    enableNotificationsButtons[i].addEventListener(
      "click",
      askForNotificationPermission
    );
  }
}
