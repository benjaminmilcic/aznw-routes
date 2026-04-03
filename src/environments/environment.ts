// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// const ip = '10.39.128.38';
const ip = 'localhost';
const localIp = '172.16.201.213'; //je nach aktueller IP anpassen

// @ts-ignore
const stripeKey = process.env['STRIPE_PUBLISHABLE_KEY'] || '';
const geoapifyKey = process.env['GEOAPIFY_API_KEY'] || '';
const maptilerKey = process.env['MAPTILER_API_KEY'] || '';
const elevenLabsKey = process.env['ELEVENLABS_API_KEY'] || '';

export const environment = {
  stripePublishableKey: stripeKey,
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
    elevenLabsKey: elevenLabsKey,
  },
  moorhuhn: {
    moorhuhnApi: `http://${ip}:3000/moorhuhn`,
  },
  error: {
    errorMessageApi: `http://${ip}:3000/error2email`,
  },
  yahtzeeGame: {
    webSocketsUrl: `http://${localIp}:3000/yahtzee-game`,
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
    translationEmail: 'benjamin.milcic@gmail.com', // Für MyMemory API - erhöht Limit auf 50k chars/day
  },
  analytics: {
    sendData: `http://${ip}:3000/analytics/visitor-data`,
  },
  geoapify: {
    apiKey: geoapifyKey,
  },
  maptiler: {
    apiKey: maptilerKey,
  },
  telegram: {
    apiUrl: `http://${ip}:3000/telegram`,
    webSocketsUrl: `http://${localIp}:3000/telegramws`,
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
