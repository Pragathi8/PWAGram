const functions = require("firebase-functions");
const admin = require("firebase-admin"); //gives access to firebase database
const cors = require("cors")({ origin: true }); // helps to send right headers
const webPush = require("web-push");
const formidable = require("formidable");
const fs = require("fs");
const UUID = require("uuid-v4");
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
const serviceAccount = require("./pwagram-fb-key.json");
const gcconfig = {
  projectId: "pwagram08",
  keyFilename: "pwagram-fb-key.json"
};
const gcs = require("@google-cloud/storage")(gcconfig);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pwagram08.firebaseio.com/"
});
exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const uuid = UUID();
    const formData = new formidable.IncomingForm();
    formData.parse(request, (err, fields, files) => {
      fs.rename(files.file.path, "/tmp/" + files.file.name);
      const bucket = gcs.bucket("pwagram08.appspot.com");
      bucket.upload(
        "/tmp/" + files.file.name,
        {
          uploadType: "media",
          metadata: {
            metadata: {
              ContentType: files.file.type,
              firebaseStorageDownloadTokens: uuid
            }
          }
        },
        (err, file) => {
          if (!err) {
            admin
              .database()
              .ref("posts")
              .push({
                id: fields.id,
                title: fields.title,
                location: fields.location,
                image:
                  "https://firebasestorage.googleapis.com/v0/b/" +
                  bucket.name +
                  "/o/" +
                  encodeURIComponent(file.name) +
                  "?alt=media&token=" +
                  uuid
              })
              .then(() => {
                webPush.setVapidDetails(
                  "mailto:pragathin1996@gmail.com",
                  "BPoVpjHTaWhKIh5vg17-fcMTOdM2pBa9X6z_-wd2lYqGLPnY77AN5KC7hUjrRj4tYBMq8owjdxdmHjz1aDuIsBk",
                  "cmgYuHn8FgEOxl2_pccfWrNoYDonsPVjTWxvg4NGtqw"
                );
                return admin
                  .database()
                  .ref("subcriptions")
                  .once("value");
              })
              .then(subscriptions => {
                subscriptions.forEach(sub => {
                  let pushConfig = {
                    endpoint: sub.val().endpoint,
                    keys: {
                      auth: sub.val().keys.auth,
                      p256dh: sub.val().keys.p256dh
                    }
                  };
                  webPush
                    .sendNotification(
                      pushConfig,
                      JSON.stringify({
                        title: "New Post",
                        content: "New Post added!",
                        openURL: "/help"
                      })
                    )
                    .catch(err => {
                      console.log(err);
                    });
                });
                response
                  .status(201)
                  .json({ message: "Date Stored", id: fields.id });
              })
              .catch(err => {
                response.status(500).json({ error: err });
              });
          } else {
            console.log(err);
          }
        }
      );
    });
  });
});
