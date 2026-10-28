// WARNING: This file is completely overwritten on deploy.
// .github/workflows/deploy-dev.yml regenerates it in the step "Create the environment for
// the new server" before building. Changes here therefore only
// take effect in a local prod build. Whoever wants to change the production host
// changes the workflow - not this file.
//
// It is still kept up to date so that it doesn't mislead anyone:
// the old host benjaminmilcic.site is still running, with its own data.

const api = 'https://api.benjamin-milcic.dev';

// @ts-ignore
const stripeKey = process.env['STRIPE_PUBLISHABLE_KEY'] || '';
const geoapifyKey = process.env['GEOAPIFY_API_KEY'] || '';
const maptilerKey = process.env['MAPTILER_API_KEY'] || '';
const tmdbKey = process.env['TMDB_API_KEY'] || '';
const googleMapsKey = process.env['GOOGLE_MAPS_API_KEY'] || '';
const tinymceKey = process.env['TINYMCE_API_KEY'] || '';


export const environment = {
  stripePublishableKey: stripeKey,
  stripe: {
    // old PHP API => createApi: `api/stripe/create.php`,
    // new spring boot API => createApi: `https://87.106.117.170:8443/api/v2/stripe`,
    // new spring boot API with url name => createApi: `https://${ip}:8443/api/v2/stripe`,
    // new nest api:
    createApi: `${api}/stripe`,
    returnUrl: `https://benjamin-milcic.dev`,
  },
  guestbook: {
    // old PHP API =>
    //                 getAllPostsApi: `https://auf-zu-neuen-welten.de/api/posts/get/`,
    //                 addPostApi: `https://auf-zu-neuen-welten.de/api/posts/post/`,
    // new spring boot API =>
    //                  getAllPostsApi: `https://87.106.117.170:8443/api/v2/guestbook`,
    //                  addPostApi: `https://87.106.117.170:8443/api/v2/guestbook`,
    // new spring boot API with url name =>
    //                  getAllPostsApi: `https://${ip}:8443/api/v2/guestbook`,
    //                  addPostApi: `https://${ip}:8443/api/v2/guestbook`,
    //                  filesUrl: `https://${ip}:8443/api/v2/guestbook/files`,
    // new nest api:
    getAllPostsApi: `${api}/guestbook`,
    addPostApi: `${api}/guestbook`,
    filesUrl: `${api}/files`,
  },
  contact: {
    // old nest API => form2mailApi: `https://nest-form2mail.adaptable.app/`,
    // new spring boot API => form2mailApi: `https://87.106.117.170:8443/api/v2/form2mail`,
    // new spring boot API with url name => form2mailApi: `https://${ip}:8443/api/v2/form2mail`,
    // new nest api:
    form2mailApi: `${api}/form2email`,
  },
  auth: {
    // old firebase solution =>
    //                          getJokesFile: `https://aznw-1753b-default-rtdb.europe-west1.firebasedatabase.app/vicevi.json`,
    //                          login: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBzuR3T7b8V2iC-K5-0wmfqRxnjWnh8QGs`,
    //                          signup: `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyBzuR3T7b8V2iC-K5-0wmfqRxnjWnh8QGs`,
    // new nest solution:
    getJokesFile: `${api}/auth/jokes`,
    login: `${api}/auth/login`,
    signup: `${api}/auth/signup`,
    tts: `${api}/auth/tts`,
  },
  chat: {
    streamApi: `${api}/chat/stream`,
    sessionApi: `${api}/chat`,
    transcribeApi: `${api}/chat/transcribe`,
    speechApi: `${api}/chat/speech`,
  },
  availability: {
    availabilityApi: `${api}/availability`,
  },
  moorhuhn: {
    moorhuhnApi: `${api}/moorhuhn`,
  },
  triviaQuiz: {
    randomQuestionsApi: `${api}/trivia/questions/random`,
    questionsByNumbersApi: `${api}/trivia/questions/by-numbers`,
  },
  error: {
    errorMessageApi: `${api}/error2email`,
  },
  yahtzeeGame: {
    webSocketsUrl: `${api}/yahtzee-game`,
  },
  geoLocation: {
    reverseGeoCodeApi: `${api}/geolocation/reverse-geocode`,
    geoCodeApi: `${api}/geolocation/geocode`,
    citiesApi: `${api}/geolocation/cities`,
  },
  googleLogin: {
    loginApi: `${api}/auth/google`,
  },
  recipes: {
    recipesApi: `${api}/recipes`,
    filesUrl: `${api}/files`,
    translationEmail: 'benjamin.milcic@gmail.com', // For the MyMemory API - raises the limit to 50k chars/day
  },
  analytics: {
    sendData: `${api}/analytics/visitor-data`,
  },
  geoapify: {
    apiKey: geoapifyKey,
  },
  maptiler: {
    apiKey: maptilerKey,
  },
  telegram: {
    apiUrl: `${api}/telegram`,
    webSocketsUrl: `${api}/telegramws`,
  },
  tmdb: {
    apiKey: tmdbKey,
  },
  googleMaps: {
    apiKey: googleMapsKey,
  },
  tinymce: {
    apiKey: tinymceKey,
  },
  imagegen: {
    apiUrl: `${api}/imagegen`,
  },
  search: {
    embedUrl: `${api}/imagegen/embed`,
  },
  production: true,
  version: new Date().getTime(),
};
