// These define the responses from plcdirectory
interface PDSService {
  type: string;
  serviceEndpoint: string;
}

interface PLCDirectoryResponse {
  alsoKnownAs?: string[];
  service?: PDSService[];
}

// And this is a fix for D1Result marking success as a "true"
// instead of the boolean that it should be according to docs.
interface ProperD1Result extends Omit<D1Result, "success"> {
  success: boolean;
}
