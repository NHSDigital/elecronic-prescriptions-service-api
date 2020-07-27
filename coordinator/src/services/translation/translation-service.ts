import * as XmlJs from 'xml-js'
import * as codes from "../../model/hl7-v3-datatypes-codes"
import * as core from "../../model/hl7-v3-datatypes-core"
import * as prescriptions from "../../model/hl7-v3-prescriptions"
import * as fhir from "../../model/fhir-resources"
import * as crypto from "crypto-js"
import {createSendMessagePayload} from "./send-message-payload";
import {canonicaliseAttribute, namespacedCopyOf, sortAttributes, writeXmlStringCanonicalized} from "./xml";
import {convertParentPrescription} from "./parent-prescription";

export function convertFhirMessageToHl7V3ParentPrescriptionMessage(fhirMessage: fhir.Bundle): string {
    const options = {
        compact: true,
        ignoreComment: true,
        spaces: 4,
        attributeValueFn: canonicaliseAttribute,
        attributesFn: sortAttributes
    } as unknown as XmlJs.Options.JS2XML
    const root = {
        _declaration: {
            _attributes: {
                version: "1.0",
                encoding: "UTF-8"
            }
        },
        PORX_IN020101UK31: namespacedCopyOf(convertBundleToSendMessagePayload(fhirMessage))
    }
    //TODO - call canonicalize function instead? this leaves spaces in which makes the response easier to read
    return XmlJs.js2xml(root, options)
}

export function convertBundleToSendMessagePayload(fhirBundle: fhir.Bundle): core.SendMessagePayload<prescriptions.ParentPrescriptionRoot> {
    const parentPrescription = convertParentPrescription(fhirBundle)
    const parentPrescriptionRoot = new prescriptions.ParentPrescriptionRoot(parentPrescription)
    const interactionId = codes.Hl7InteractionIdentifier.PARENT_PRESCRIPTION_URGENT
    const authorAgentPerson = parentPrescription.pertinentInformation1.pertinentPrescription.author.AgentPerson
    return createSendMessagePayload(interactionId, authorAgentPerson, parentPrescriptionRoot)
}

export function convertFhirMessageToHl7V3SignedInfoMessage(fhirMessage: fhir.Bundle): string {
    const parentPrescription = convertParentPrescription(fhirMessage)
    const fragmentsToBeHashed = extractSignatureFragments(parentPrescription);
    const fragmentsToBeHashedStr = writeXmlStringCanonicalized(fragmentsToBeHashed);
    const digestValue = crypto.SHA1(fragmentsToBeHashedStr).toString(crypto.enc.Base64)
    const signedInfo = createSignedInfo(digestValue)
    const xmlString = writeXmlStringCanonicalized(signedInfo)
    const parameters = new fhir.Parameters([
        {
            name: "message-digest",
            valueString: xmlString
        }
    ])
    return JSON.stringify(parameters, null, 2)
}

export function extractSignatureFragments(parentPrescription: prescriptions.ParentPrescription): XmlJs.ElementCompact {
    const pertinentPrescription = parentPrescription.pertinentInformation1.pertinentPrescription
    const fragments = []

    fragments.push({
        time: namespacedCopyOf(pertinentPrescription.author.time),
        id: namespacedCopyOf(pertinentPrescription.id[0])
    })

    fragments.push({
        AgentPerson: namespacedCopyOf(pertinentPrescription.author.AgentPerson)
    })

    fragments.push({
        recordTarget: namespacedCopyOf(parentPrescription.recordTarget)
    })

    pertinentPrescription.pertinentInformation2.forEach(
        pertinentInformation2 => fragments.push({
            pertinentLineItem: namespacedCopyOf(pertinentInformation2.pertinentLineItem)
        })
    )

    return {
        FragmentsToBeHashed: {
            Fragment: fragments
        }
    } as XmlJs.ElementCompact
}

function createSignedInfo(digestValue: string): XmlJs.ElementCompact {
    return {
        SignedInfo: {
            CanonicalizationMethod: new AlgorithmIdentifier("http://www.w3.org/2001/10/xml-exc-c14n#"),
            SignatureMethod: new AlgorithmIdentifier("http://www.w3.org/2000/09/xmldsig#rsa-sha1"),
            Reference: {
                Transforms: {
                    Transform: new AlgorithmIdentifier("http://www.w3.org/2001/10/xml-exc-c14n#")
                },
                DigestMethod: new AlgorithmIdentifier("http://www.w3.org/2000/09/xmldsig#sha1"),
                DigestValue: digestValue
            }
        }
    } as XmlJs.ElementCompact
}

class AlgorithmIdentifier implements XmlJs.ElementCompact {
    _attributes: {
        Algorithm: string
    }

    constructor(algorithm: string) {
        this._attributes = {
            Algorithm: algorithm
        }
    }
}
