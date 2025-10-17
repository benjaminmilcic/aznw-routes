// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// const ip = '10.213.204.38';
const ip = 'localhost';


export const environment = {
  firebase: {
    projectId: 'aznw-1753b',
    appId: '1:881209153407:web:4d2619f64cf2f3b2632c4a',
    storageBucket: 'aznw-1753b.appspot.com',
    apiKey: 'AIzaSyBzuR3T7b8V2iC-K5-0wmfqRxnjWnh8QGs',
    authDomain: 'aznw-1753b.firebaseapp.com',
    messagingSenderId: '881209153407',
  },
  stripe: {
    //old PHP API => createApi: `http://${ip}:80/create.php`,
    // new spring boot API => createApi: `https://${ip}:8443/api/v2/stripe`,
    // new nest api:
    createApi: `http://${ip}:3000/stripe`,
    returnUrl: `http://${ip}:4200`,
  },
  guestbook: {
    // new spring boot API =>
    //                        getAllPostsApi: `https://${ip}:8443/api/v2/guestbook`,
    //                        addPostApi: `https://${ip}:8443/api/v2/guestbook`,
    //                        filesUrl: `https://${ip}:8443/api/v2/guestbook/files`,
    // new nest api:
    getAllPostsApi: `http://${ip}:3000/guestbook`,
    addPostApi: `http://${ip}:3000/guestbook`,
    filesUrl: `http://${ip}:3000/files`,
  },
  contact: {
    // new spring boot API => form2mailApi: `https://${ip}:8443/api/v2/form2mail`,
    // new nest api:
    form2mailApi: `http://${ip}:3000/form2email`,
  },
  auth: {
    // old firebase solution =>
    //                          getJokesFile: `https://aznw-1753b-default-rtdb.europe-west1.firebasedatabase.app/vicevi.json`,
    //                          login: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBzuR3T7b8V2iC-K5-0wmfqRxnjWnh8QGs`,
    //                          signup: `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyBzuR3T7b8V2iC-K5-0wmfqRxnjWnh8QGs`,
    // new nest solution:
    getJokesFile: `http://${ip}:3000/auth/jokes`,
    login: `http://${ip}:3000/auth/login`,
    signup: `http://${ip}:3000/auth/signup`,
  },
  moorhuhn: {
    moorhuhnApi: `http://${ip}:3000/moorhuhn`,
  },
  error: {
    errorMessageApi: `http://${ip}:3000/error2email`,
  },
  yahtzeeGame: {
    webSocketsUrl: `http://10.250.248.38:3000/yahtzee-game`, //je nach aktueller IP anpassen
  },
  geoLocation: {
    reverseGeoCodeApi: `http://${ip}:3000/geolocation/reverse-geocode`,
    geoCodeApi: `http://${ip}:3000/geolocation/geocode`,
    citiesApi: `http://${ip}:3000/geolocation/cities`,
  },
  googleLogin: {
    loginApi: `http://${ip}:3000/auth/google`,
  },
  recipes: {
    recipesApi: `http://${ip}:3000/recipes`,
    filesUrl: `http://${ip}:3000/files`,
  },
  production: false,
  version: new Date().getTime(),
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
