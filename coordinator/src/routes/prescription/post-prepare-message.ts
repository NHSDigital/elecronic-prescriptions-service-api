import * as translator from "../../services/translation/translation-service";
import {Bundle} from "../../model/fhir-resources";
import Hapi from "@hapi/hapi";
import {validatingHandler} from "../util";

const CONTENT_TYPE = 'application/fhir+json; fhirVersion=4.0'

export default [
    /*
      Convert a FHIR prescription into the HL7 V3 signature fragments to be signed by the prescriber.
    */
    {
        method: 'POST',
        path: '/Prepare',
        handler: validatingHandler(
            false,
            (requestPayload: Bundle, responseToolkit: Hapi.ResponseToolkit) => {
                const response = translator.convertFhirMessageToSignedInfoMessage(requestPayload)
                return responseToolkit.response(response).code(200).header('Content-Type', CONTENT_TYPE)
            }
        )
    }
]
