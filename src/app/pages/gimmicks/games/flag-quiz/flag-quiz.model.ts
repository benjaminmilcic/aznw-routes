export interface FlaqQuizCountry {
  flags?: {
    png?: string;
    svg?: string;
    alt?: string;
  };
  name?: {
    common?: string;
    official?: string;
    nativeName?: {
      [countryCode: string]: {
        official?: string;
        common?: string;
      };
    };
  };
}

export interface MyMemoryResponse {
  responseData: {
    translatedText: string;
  };
  responseStatus: number;
}
