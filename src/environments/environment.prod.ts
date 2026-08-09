const ip = 'benjaminmilcic.site';

// @ts-ignore
const stripeKey = process.env['STRIPE_PUBLISHABLE_KEY'] || '';
const geoapifyKey = process.env['GEOAPIFY_API_KEY'] || '';
const maptilerKey = process.env['MAPTILER_API_KEY'] || '';
const elevenLabsKey = process.env['ELEVENLABS_API_KEY'] || '';
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
    createApi: `https://${ip}:3000/stripe`,
    returnUrl: `https://auf-zu-neuen-welten.de`,
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
    getAllPostsApi: `https://${ip}:3000/guestbook`,
    addPostApi: `https://${ip}:3000/guestbook`,
    filesUrl: `https://${ip}:3000/files`,
  },
  contact: {
    // old nest API => form2mailApi: `https://nest-form2mail.adaptable.app/`,
    // new spring boot API => form2mailApi: `https://87.106.117.170:8443/api/v2/form2mail`,
    // new spring boot API with url name => form2mailApi: `https://${ip}:8443/api/v2/form2mail`,
    // new nest api:
    form2mailApi: `https://${ip}:3000/form2email`,
  },
  auth: {
    // old firebase solution =>
    //                          getJokesFile: `https://aznw-1753b-default-rtdb.europe-west1.firebasedatabase.app/vicevi.json`,
    //                          login: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBzuR3T7b8V2iC-K5-0wmfqRxnjWnh8QGs`,
    //                          signup: `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyBzuR3T7b8V2iC-K5-0wmfqRxnjWnh8QGs`,
    // new nest solution:
    getJokesFile: `https://${ip}:3000/auth/jokes`,
    login: `https://${ip}:3000/auth/login`,
    signup: `https://${ip}:3000/auth/signup`,
    elevenLabsKey: elevenLabsKey,
  },
  moorhuhn: {
    moorhuhnApi: `https://${ip}:3000/moorhuhn`,
  },
  triviaQuiz: {
    randomQuestionsApi: `https://${ip}:3000/trivia/questions/random`,
  },
  error: {
    errorMessageApi: `https://${ip}:3000/error2email`,
  },
  geoLocation: {
    reverseGeoCodeApi: `https://${ip}:3000/geolocation/reverse-geocode`,
    geoCodeApi: `https://${ip}:3000/geolocation/geocode`,
    citiesApi: `https://${ip}:3000/geolocation/cities`,
  },
  googleLogin: {
    loginApi: `https://${ip}:3000/auth/google`,
  },
  recipes: {
    recipesApi: `https://${ip}:3000/recipes`,
    filesUrl: `https://${ip}:3000/files`,
    translationEmail: 'benjamin.milcic@gmail.com', // Für MyMemory API - erhöht Limit auf 50k chars/day
  },
  analytics: {
    sendData: `https://${ip}:3000/analytics/visitor-data`,
  },
  geoapify: {
    apiKey: geoapifyKey,
  },
  maptiler: {
    apiKey: maptilerKey,
  },
  telegram: {
    apiUrl: `https://${ip}:3000/telegram`,
    webSocketsUrl: `https://${ip}:3000/telegramws`,
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
    workerUrl: 'https://little-sky-725e.benjamin-milcic.workers.dev/',
  },
  search: {
    embedUrl: 'https://little-sky-725e.benjamin-milcic.workers.dev/embed',
  },
  production: true,
  version: new Date().getTime(),
};
