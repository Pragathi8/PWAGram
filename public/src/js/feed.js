const shareImageButton = document.querySelector("#share-image-button");
const createPostArea = document.querySelector("#create-post");
const closeCreatePostModalButton = document.querySelector(
  "#close-create-post-modal-btn"
);
const sharedMomentsArea = document.querySelector("#shared-moments");
const form = document.querySelector("form");
const titleInput = document.querySelector("#title");
const locationInput = document.querySelector("#location");
const videoPlayer = document.querySelector("#player");
const canvasElement = document.querySelector("#canvas");
const captureButton = document.querySelector("#capture-btn");
const imagePicker = document.querySelector("#image-picker");
const imagePickerArea = document.querySelector("#pick-image");
const locationButton = document.querySelector("#location-btn");
const locationLoader = document.querySelector("#location-loader");

let picture;
let fetchedLocation = { lat: 0, lng: 0 };

locationButton.addEventListener("click", event => {
  if (!("geolocation" in navigator)) {
    return;
  }
  let sawAlert = false;

  locationButton.style.display = "none";
  locationLoader.style.display = "block";

  navigator.geolocation.getCurrentPosition(
    position => {
      locationButton.style.display = "inline";
      locationLoader.style.display = "none";
      fetchedLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      // fetch(
      //   `https://maps.googleapis.com/maps/api/geocode/json?latlng=${fetchedLocation.lat},${fetchedLocation.lng}&key=AIzaSyC2GTpq1Ed24ujcNfQD7UX5J8oFZ5mx-Fs`
      // ).then(res => {
      //   return res.json().then(data => {
      //     console.log(data);
      //   });
      // });
      locationInput.value = "In Kolar";
      document.querySelector("#manual-location").classList.add("is-focused");
    },
    err => {
      console.log(err);
      locationButton.style.display = "inline";
      locationLoader.style.display = "none";
      if (!sawAlert) {
        alert("Couldn't fetch the location, please enter manually!");
        sawAlert = true;
      }
      fetchedLocation = { lat: 0, lng: 0 };
    },
    {
      timeout: 7000
    }
  );
});

const initializeLocation = () => {
  if (!("geolocation" in navigator)) {
    locationButton.style.display = "none";
  }
};

const initializeMedia = () => {
  if (!("mediaDevices" in navigator)) {
    navigator.mediaDevices = {};
  }

  if (!("getUserMedia" in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = constraints => {
      let getUserMedia =
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      if (!getUserMedia) {
        return Promise.reject(new Error("GetUserMedia is not implemented!"));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(stream => {
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = "block";
    })
    .catch(err => {
      imagePickerArea.style.display = "block";
    });
};

captureButton.addEventListener("click", event => {
  canvasElement.style.display = "block";
  videoPlayer.style.display = "none";
  captureButton.style.display = "none";
  let context = canvasElement.getContext("2d");
  context.drawImage(
    videoPlayer,
    0,
    0,
    canvas.width,
    videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width)
  );
  videoPlayer.srcObject.getVideoTracks().forEach(track => {
    track.stop();
  });

  picture = dataURItoBlob(canvasElement.toDataURL());
});

imagePicker.addEventListener("change", event => {
  picture = event.target.files[0];
});

function openCreatePostModal() {
  setTimeout(() => {
    createPostArea.style.transform = "translateY(0)";
  }, 1);
  initializeMedia();
  initializeLocation();
  if (deferredPrompt) {
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(function(choiceResult) {
      console.log(choiceResult.outcome);

      if (choiceResult.outcome === "dismissed") {
        console.log("User cancelled installation");
      } else {
        console.log("User added to home screen");
      }
    });

    deferredPrompt = null;
  }

  //to unregister the SW on click of (+) button
  // if ("serviceWorker" in navigator) {
  //   navigator.serviceWorker.getRegistrations().then(registrations => {
  //     for (let i = 0; i < registrations.length; i++) {
  //       registrations[i].unregister();
  //     }
  //   });
  // }
}

function closeCreatePostModal() {
  imagePickerArea.style.display = "none";
  videoPlayer.style.display = "none";
  canvasElement.style.display = "none";
  locationButton.style.display = "inline";
  locationLoader.style.display = "none";
  captureButton.style.display = "inline";
  if (videoPlayer.srcObject) {
    videoPlayer.srcObject.getVideoTracks().forEach(track => {
      track.stop();
    });
  }
  setTimeout(() => {
    createPostArea.style.transform = "translateY(100vh)";
  }, 1);
}

//currently not using. Allows us to save assets in cache on demand
const onSaveButtonClicked = event => {
  console.log("clicked");
  if ("caches" in window) {
    caches.open("user-requested").then(cache => {
      cache.addAll(["https://httpbin.org/get", "/src/images/sf-boat.jpg"]);
    });
  }
};

shareImageButton.addEventListener("click", openCreatePostModal);

closeCreatePostModalButton.addEventListener("click", closeCreatePostModal);

const clearCards = () => {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
};

const createCard = data => {
  var cardWrapper = document.createElement("div");
  cardWrapper.className = "shared-moment-card mdl-card mdl-shadow--2dp";
  var cardTitle = document.createElement("div");
  cardTitle.className = "mdl-card__title";
  cardTitle.style.backgroundImage = "url(" + data.image + ")";
  cardTitle.style.backgroundSize = "cover";
  cardTitle.style.backgroundPositionX = "center";
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement("h2");
  cardTitleTextElement.style.color = "white";
  cardTitleTextElement.className = "mdl-card__title-text";
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement("div");
  cardSupportingText.className = "mdl-card__supporting-text";
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = "center";
  // const cardSaveButton = document.createElement("button");
  // cardSaveButton.textContent = "Save";
  // cardSaveButton.addEventListener("click", onSaveButtonClicked);
  // cardSupportingText.appendChild(cardSaveButton);
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
};

const updateUI = data => {
  clearCards();
  for (let i = 0; i < data.length; i++) {
    createCard(data[i]);
  }
};

const url = "https://pwagram08.firebaseio.com/posts.json";
let networkDataReceived = false;

fetch(url)
  .then(function(res) {
    return res.json();
  })
  .then(function(data) {
    networkDataReceived = true;
    console.log("from web", data);
    let dataArray = [];
    for (let key in data) {
      dataArray.push(data[key]);
    }
    updateUI(dataArray);
  });

if ("indexedDB" in window) {
  readAllData("posts").then(data => {
    if (!networkDataReceived) {
      console.log("From cache", data);
      updateUI(data);
    }
  });
}

const sendData = () => {
  const id = new Date().toISOString();
  const postData = new FormData();
  postData.append("id", id);
  postData.append("title", titleInput.value);
  postData.append("location", locationInput.value);
  postData.append("rawLocationLat", fetchedLocation.lat);
  postData.append("rawLocationLng", fetchedLocation.lng);
  postData.append("file", picture, id + ".png");

  fetch("https://us-central1-pwagram08.cloudfunctions.net/storePostData", {
    method: "POST",
    body: postData
  })
    .then(res => {
      console.log("sent data", res);
      if (res.ok) {
        res.json().then(resData => {
          console.log(resData);
        });
      }
    })
    .catch(err => {
      console.log(err);
    });
};

form.addEventListener("submit", event => {
  event.preventDefault();

  if (titleInput.value.trim() === "" || locationInput.value.trim() === "") {
    alert("Please enter valid data!!!");
    return;
  }
  closeCreatePostModal();

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready.then(sw => {
      const post = {
        id: new Date().toISOString(),
        title: titleInput.value,
        location: locationInput.value,
        picture: picture,
        rawLocation: fetchedLocation
      };
      writeData("sync-posts", post)
        .then(() => {
          sw.sync.register("sync-new-post");
        })
        .then(() => {
          const snackbarContainer = document.querySelector(
            "#confirmation-toast"
          );
          const data = { message: "Your post is saved for syncing!" };
          snackbarContainer.MaterialSnackbar.showSnackbar(data);
        })
        .catch(err => {
          console.log(err);
        });
    });
  } else {
    sendData();
  }
});
