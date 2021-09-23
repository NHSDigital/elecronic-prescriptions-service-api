import * as uuid from "uuid"
import {
  fhir,
  hl7V3,
  ProcessCase,
  TaskCase
} from "@models"
import {
  convertFhirMessageToSignedInfoMessage,
  convertFragmentsToHashableFormat,
  convertMomentToISODate,
  convertParentPrescription,
  createParametersDigest,
  extractFragments,
  getResourcesOfType,
  isRepeatDispensing,
  typeGuards,
  writeXmlStringCanonicalized
} from "@coordinator"
import * as crypto from "crypto"
import fs from "fs"
import moment from "moment"
import {ElementCompact} from "xml-js"
import pino from "pino"

const privateKeyPath = process.env.SIGNING_PRIVATE_KEY_PATH
const x509CertificatePath = process.env.SIGNING_CERT_PATH

const isProd = process.env.APIGEE_ENVIRONMENT === "prod"

export async function updatePrescriptions(
  orderCases: Array<ProcessCase>,
  orderUpdateCases: Array<ProcessCase>,
  dispenseCases: Array<ProcessCase>,
  taskCases: Array<TaskCase>,
  claimCases: Array<ProcessCase>,
  logger: pino.Logger
): Promise<void> {
  const replacements = new Map<string, string>()

  let signPrescriptionFn: typeof signPrescription = () => {
    return
  }

  if (fs.existsSync(privateKeyPath) && fs.existsSync(x509CertificatePath)) {
    signPrescriptionFn = signPrescription
  } else {
    console.warn("No private key / x509 certifcate found, signing has been skipped")
  }

  orderCases.forEach(processCase => {
    const prepareBundle = processCase.prepareRequest ?? processCase.request
    const processBundle = processCase.request
    const firstGroupIdentifier = getResourcesOfType.getMedicationRequests(processBundle)[0].groupIdentifier

    const originalBundleIdentifier = processBundle.identifier.value
    const newBundleIdentifier = uuid.v4()
    replacements.set(originalBundleIdentifier, newBundleIdentifier)

    const originalShortFormId = firstGroupIdentifier.value
    let newShortFormId = originalShortFormId
    // some prescriptions have static shortFormIds
    if (processCase.statusText !== "400-INVALID-CHECKSUM") {
      newShortFormId = generateShortFormId(originalShortFormId)
    }
    replacements.set(originalShortFormId, newShortFormId)

    const originalLongFormId = getLongFormIdExtension(firstGroupIdentifier.extension).valueIdentifier.value
    const newLongFormId = uuid.v4()
    replacements.set(originalLongFormId, newLongFormId)

    setPrescriptionIds(prepareBundle, newBundleIdentifier, newShortFormId, newLongFormId)
    setPrescriptionIds(processBundle, newBundleIdentifier, newShortFormId, newLongFormId)

    if (isProd) {
      setProdPatient(prepareBundle)
      setProdPatient(processBundle)
      setProdAdditonalInstructions(prepareBundle)
      setProdAdditonalInstructions(processBundle)
    }

    const medicationRequests = [
      ...getResourcesOfType.getMedicationRequests(prepareBundle),
      ...getResourcesOfType.getMedicationRequests(processBundle)
    ]
    if (processCase.isSuccess && isRepeatDispensing(medicationRequests)) {
      setValidityPeriod(medicationRequests)
    }

    signPrescriptionFn(processCase, prepareBundle, processBundle, originalShortFormId, logger)
  })

  orderUpdateCases.forEach(processCase => {
    const bundle = processCase.request
    const firstGroupIdentifier = getResourcesOfType.getMedicationRequests(bundle)[0].groupIdentifier

    const originalBundleIdentifier = bundle.identifier.value
    const newBundleIdentifier = uuid.v4()
    replacements.set(originalBundleIdentifier, newBundleIdentifier)

    const originalShortFormId = firstGroupIdentifier.value
    const newShortFormId = replacements.get(originalShortFormId)

    const originalLongFormId = getLongFormIdExtension(firstGroupIdentifier.extension).valueIdentifier.value
    const newLongFormId = replacements.get(originalLongFormId)

    setPrescriptionIds(bundle, newBundleIdentifier, newShortFormId, newLongFormId)

    if (isProd) {
      setProdPatient(bundle)
    }
  })

  dispenseCases.forEach(dispenseCase => {
    const bundle = dispenseCase.request
    const firstMedicationDispense = getResourcesOfType.getMedicationDispenses(bundle)[0]
    const firstAuthorizingPrescription = firstMedicationDispense.authorizingPrescription[0]
    const groupIdentifierExtension =
      getMedicationDispenseGroupIdentifierExtension(firstAuthorizingPrescription.extension)

    const originalBundleIdentifier = bundle.identifier.value
    const newBundleIdentifier = uuid.v4()
    replacements.set(originalBundleIdentifier, newBundleIdentifier)

    const shortFormIdExtension = getMedicationDispenseShortFormIdExtension(groupIdentifierExtension.extension)
    const originalShortFormId = shortFormIdExtension.valueIdentifier.value
    const newShortFormId = replacements.get(originalShortFormId)

    const longFormIdExtension = getMedicationDispenseLongFormIdExtension(groupIdentifierExtension.extension)
    const originalLongFormId = longFormIdExtension.valueIdentifier.value
    const newLongFormId = replacements.get(originalLongFormId)

    setPrescriptionIds(bundle, newBundleIdentifier, newShortFormId, newLongFormId)
  })

  taskCases.forEach(returnCase => {
    const task = returnCase.request
    if (typeGuards.isTask(task)) {
      const newTaskIdentifier = uuid.v4()

      const originalShortFormId = task.groupIdentifier.value
      const newShortFormId = replacements.get(originalShortFormId)

      const originalFocusId = task.focus.identifier.value
      const newFocusId = replacements.get(originalFocusId)

      setTaskIds(task, newTaskIdentifier, newShortFormId, newFocusId)
    }
  })

  claimCases.forEach(claimCase => {
    const bundle = claimCase.request
    const prescriptionReference = getResourcesOfType.getClaim(bundle).prescription
    const groupIdentifierExtension = getMedicationDispenseGroupIdentifierExtension(prescriptionReference.extension)

    const originalBundleIdentifier = bundle.identifier.value
    const newBundleIdentifier = uuid.v4()
    replacements.set(originalBundleIdentifier, newBundleIdentifier)

    const shortFormIdExtension = getMedicationDispenseShortFormIdExtension(groupIdentifierExtension.extension)
    const originalShortFormId = shortFormIdExtension.valueIdentifier.value
    const newShortFormId = replacements.get(originalShortFormId)

    const longFormIdExtension = getMedicationDispenseLongFormIdExtension(groupIdentifierExtension.extension)
    const originalLongFormId = longFormIdExtension.valueIdentifier.value
    const newLongFormId = replacements.get(originalLongFormId)

    setPrescriptionIds(bundle, newBundleIdentifier, newShortFormId, newLongFormId)
  })
}

export function setPrescriptionIds(
  bundle: fhir.Bundle,
  newBundleIdentifier: string,
  newShortFormId: string,
  newLongFormId: string
): void {
  bundle.identifier.value = newBundleIdentifier
  getResourcesOfType.getMedicationRequests(bundle).forEach(medicationRequest => {
    const groupIdentifier = medicationRequest.groupIdentifier
    groupIdentifier.value = newShortFormId
    getLongFormIdExtension(groupIdentifier.extension).valueIdentifier.value = newLongFormId
  })
  getResourcesOfType.getMedicationDispenses(bundle)
    .flatMap(medicationDispense => medicationDispense.authorizingPrescription)
    .forEach(authorizingPrescription => {
      const groupIdentifierExtension = getMedicationDispenseGroupIdentifierExtension(authorizingPrescription.extension)
      const longFormIdExtension = getMedicationDispenseLongFormIdExtension(groupIdentifierExtension.extension)
      longFormIdExtension.valueIdentifier.value = newLongFormId
      const shortFormIdExtension = getMedicationDispenseShortFormIdExtension(groupIdentifierExtension.extension)
      shortFormIdExtension.valueIdentifier.value = newShortFormId
    })
  getResourcesOfType.getResourcesOfType<fhir.Claim>(bundle, "Claim").forEach(claim => {
    const groupIdentifierExtension = getMedicationDispenseGroupIdentifierExtension(claim.prescription.extension)
    const longFormIdExtension = getMedicationDispenseLongFormIdExtension(groupIdentifierExtension.extension)
    longFormIdExtension.valueIdentifier.value = newLongFormId
    const shortFormIdExtension = getMedicationDispenseShortFormIdExtension(groupIdentifierExtension.extension)
    shortFormIdExtension.valueIdentifier.value = newShortFormId
  })
}

export function setTaskIds(
  task: fhir.Task,
  newTaskIdentifier: string,
  newShortFormId: string,
  newFocusId: string
): void {
  task.identifier[0].value = newTaskIdentifier
  task.groupIdentifier.value = newShortFormId
  task.focus.identifier.value = newFocusId
}

export function generateShortFormId(originalShortFormId?: string): string {
  const _PRESC_CHECKDIGIT_VALUES = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ+"
  const hexString = (uuid.v4()).replace(/-/g, "").toUpperCase()
  const first = hexString.substring(0, 6)
  const middle = originalShortFormId?.substring(7, 13) ?? "A12345"
  const last = hexString.substring(12, 17)
  let prescriptionID = `${first}-${middle}-${last}`
  const prscID = prescriptionID.replace(/-/g, "")
  const prscIDLength = prscID.length
  let runningTotal = 0
  let checkValue
  const strings = prscID.split("")
  strings.forEach((character, index) => {
    runningTotal = runningTotal + parseInt(character, 36) * (2 ** (prscIDLength - index))
  })
  checkValue = (38 - runningTotal % 37) % 37
  checkValue = _PRESC_CHECKDIGIT_VALUES.substring(checkValue, checkValue + 1)
  prescriptionID += checkValue
  return prescriptionID
}

function setValidityPeriod(medicationRequests: Array<fhir.MedicationRequest>) {
  const start = convertMomentToISODate(moment.utc())
  const end = convertMomentToISODate(moment.utc().add(1, "month"))
  medicationRequests.forEach(medicationRequest => {
    const validityPeriod = medicationRequest.dispenseRequest.validityPeriod
    validityPeriod.start = start
    validityPeriod.end = end
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setProdAdditonalInstructions(bundle: fhir.Bundle) {
  // todo: add "TEST PRESCRIPTION DO NOT DISPENSE or similar"
}

function setProdPatient(bundle: fhir.Bundle) {
  const patient = getResourcesOfType.getPatient(bundle)
  const nhsNumberIdentifier = getNhsNumberIdentifier(patient)
  nhsNumberIdentifier.value = "9990548609"
  patient.name = [
    {
      "use": "usual",
      "family": "XXTESTPATIENT-TGNP",
      "given": [
        "DONOTUSE"
      ],
      "prefix": [
        "MR"
      ]
    }
  ]
  patient.gender = "male"
  patient.birthDate = "1932-01-06"
  patient.address = [
    {
      "use": "home",
      "line": [
        "1 Trevelyan Square",
        "Boar Lane",
        "Leeds",
        "West Yorkshire"
      ],
      "postalCode": "LS1 6AE"
    }
  ]
}

function signPrescription(
  processCase: ProcessCase,
  prepareRequest: fhir.Bundle,
  processRequest: fhir.Bundle,
  originalShortFormId: string,
  logger: pino.Logger
) {
  if (!processCase.isSuccess) {
    return
  }

  prepareRequest = removeResourcesOfType(prepareRequest, "Provenance")
  const provenancesCheck = prepareRequest.entry.filter(e => e.resource.resourceType === "Provenance")
  if (provenancesCheck.length > 0) {
    throw new Error("Could not remove provenance, this must be removed to get a fresh timestamp")
  }
  const prepareResponse = convertFhirMessageToSignedInfoMessage(prepareRequest, logger)
  const digestParameter = prepareResponse.parameter.find(p => p.name === "digest") as fhir.StringParameter
  const timestampParameter = prepareResponse.parameter.find(p => p.name === "timestamp") as fhir.StringParameter
  const digest = Buffer.from(digestParameter.valueString, "base64").toString("utf-8")
  const digestWithoutNamespace = digest
    .replace(`<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">`, `<SignedInfo>`)
  const signature = crypto.sign("sha1", Buffer.from(digest, "utf-8"), {
    key: fs.readFileSync(privateKeyPath, "utf-8"),
    padding: crypto.constants.RSA_PKCS1_PADDING
  }).toString("base64")
  const certificate = fs.readFileSync(x509CertificatePath, "utf-8")
  const certificateValue = certificate.split("\n")[1].trimEnd()
  const xmlDSig = `
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  ${digestWithoutNamespace}
  <SignatureValue>${signature}</SignatureValue>
  <KeyInfo>
      <X509Data>
          <X509Certificate>${certificateValue}</X509Certificate>
      </X509Data>
  </KeyInfo>
</Signature>
`
  const provenance = getResourcesOfType.getProvenances(processRequest)[0]
  provenance.signature[0].when = timestampParameter.valueString
  provenance.signature[0].data = Buffer.from(xmlDSig, "utf-8").toString("base64")

  try {
    const signatureVerifier = crypto.createVerify("RSA-SHA1")
    signatureVerifier.update(digest)
    const verified = signatureVerifier.verify(certificate, signature, "base64")
    if (!verified) {
      throw new Error("Signature failed verification")
    }
  } catch {
    throw new Error("Signature failed verification")
  }

  checkDigestMatchesPrescription(processRequest, originalShortFormId, logger)
}

function getExtension<T extends fhir.Extension>(extensions: Array<fhir.Extension>, url: string): T {
  return extensions.find(extension => extension.url === url) as T
}

function getLongFormIdExtension(extensions: Array<fhir.Extension>): fhir.IdentifierExtension {
  return getExtension(extensions, "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionId")
}

function getMedicationDispenseGroupIdentifierExtension(extensions: Array<fhir.Extension>) {
  return getExtension(extensions, "https://fhir.nhs.uk/StructureDefinition/Extension-DM-GroupIdentifier")
}

function getMedicationDispenseShortFormIdExtension(extensions: Array<fhir.Extension>): fhir.IdentifierExtension {
  return getExtension(extensions, "shortForm")
}

function getMedicationDispenseLongFormIdExtension(extensions: Array<fhir.Extension>): fhir.IdentifierExtension {
  return getExtension(extensions, "UUID")
}

function getNhsNumberIdentifier(fhirPatient: fhir.Patient) {
  return fhirPatient
    .identifier
    .filter(identifier => identifier.system === "https://fhir.nhs.uk/Id/nhs-number")[0]
}

function checkDigestMatchesPrescription(processBundle: fhir.Bundle, originalShortFormId: string, logger: pino.Logger) {
  const prescriptionRoot = convertParentPrescription(processBundle, logger)
  const signatureRoot = extractSignatureRootFromPrescriptionRoot(prescriptionRoot)
  const digestFromSignature = extractDigestFromSignatureRoot(signatureRoot)
  const digestFromPrescription = calculateDigestFromPrescriptionRoot(prescriptionRoot)
  const digestMatches = digestFromPrescription === digestFromSignature
  if (!digestMatches) {
    throw new Error(`Digest did not match for example with prescription id: ${originalShortFormId}`)
  }
}

function extractSignatureRootFromPrescriptionRoot(prescriptionRoot: hl7V3.ParentPrescription): ElementCompact {
  const prescription = prescriptionRoot.pertinentInformation1.pertinentPrescription
  return prescription.author.signatureText
}

function extractDigestFromSignatureRoot(signatureRoot: ElementCompact) {
  const signature = signatureRoot.Signature
  const signedInfo = signature.SignedInfo
  signedInfo._attributes = {
    xmlns: signature._attributes.xmlns
  }
  return writeXmlStringCanonicalized({SignedInfo: signedInfo})
}

function calculateDigestFromPrescriptionRoot(prescriptionRoot: hl7V3.ParentPrescription) {
  const parentPrescription = prescriptionRoot
  const fragments = extractFragments(parentPrescription)
  const fragmentsToBeHashed = convertFragmentsToHashableFormat(fragments)
  const digestFromPrescriptionBase64 = createParametersDigest(fragmentsToBeHashed)
  return Buffer.from(digestFromPrescriptionBase64, "base64").toString("utf-8")
}

function removeResourcesOfType(fhirBundle: fhir.Bundle, resourceType: string): fhir.Bundle {
  const entriesToRetain = fhirBundle.entry.filter(entry => entry.resource.resourceType !== resourceType)
  return {
    ...fhirBundle,
    entry: entriesToRetain
  }
}
