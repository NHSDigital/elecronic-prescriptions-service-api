import {FhirPathBuilder, FhirPathReader} from "../../../models/common"
import {fhir} from "../../../models"
import {BundlePathBuilder} from "../../../models/common/fhir-path-builder/Bundle"
import {ClaimPathBuilder} from "../../../models/common/fhir-path-builder/Claim"
import {ParametersPathBuilder} from "../../../models/common/fhir-path-builder/Parameters"
import {TaskPathBuilder} from "../../../models/common/fhir-path-builder/Task"
import {
  isBundle,
  isClaim,
  isParameters,
  isTask
} from "../utils/type-guards"

const VALUE_NOT_PROVIDED = "NotProvided"

type PayloadIdentifiers = {
  payloadIdentifier: string
  patientNhsNumber: string
  senderOdsCode: string
  prescriptionShortFormId: string
}

interface FhirPathGetter {
  getPayloadIdentifier(): string
  getNhsNumber(): string
  getOdsCode(): string
  getPrescriptionNumber(): string
}

type FhirPathBuilderTypes = BundlePathBuilder | ClaimPathBuilder | ParametersPathBuilder | TaskPathBuilder

abstract class AbstractPathGetter<T extends FhirPathBuilderTypes> implements FhirPathGetter {
  protected readonly builder: T

  constructor(builder: T) {
    this.builder = builder
  }

  getPayloadIdentifier(): string {
    throw new Error("Method not implemented.")
  }
  getNhsNumber(): string {
    throw new Error("Method not implemented.")
  }
  getOdsCode(): string {
    throw new Error("Method not implemented.")
  }
  getPrescriptionNumber(): string {
    throw new Error("Method not implemented.")
  }
}

class BundlePathGetter extends AbstractPathGetter<BundlePathBuilder> {
  constructor() {
    super(new FhirPathBuilder().bundle())
  }

  getPayloadIdentifier = (): string => this.builder.identifier()
  getNhsNumber = (): string => this.builder.patient().nhsNumber()
  getOdsCode = (): string => this.builder.messageHeader().sender().identifier()
  getPrescriptionNumber = (): string => this.builder.medicationRequest().prescriptionShortFormId()
}

class ClaimPathGetter extends AbstractPathGetter<ClaimPathBuilder> {
  constructor() {
    super(new FhirPathBuilder().claim())
  }

  getPayloadIdentifier = (): string => this.builder.identifier()
  getNhsNumber = (): string => this.builder.patient().nhsNumber()
  getPrescriptionNumber= (): string => this.builder.prescription().shortFormId()

  // TODO: Check if https://nhsd-jira.digital.nhs.uk/browse/AEA-2638 changes anything
  getOdsCode = (): string => this.builder.organization().odsCode()
}

// TODO: Add examples for single patient and bulk release
class ParametersPathGetter extends AbstractPathGetter<ParametersPathBuilder> {
  constructor() {
    super(new FhirPathBuilder().parameters())
  }

  // Not available for Parameters type resources
  getPayloadIdentifier = (): string => ""

  // Not available for release request
  getNhsNumber= (): string => ""

  getOdsCode = (): string => this.builder.owner().odsCode()
  getPrescriptionNumber = (): string => this.builder.prescription().shortFormId()
}

class TaskPathGetter extends AbstractPathGetter<TaskPathBuilder> {
  constructor() {
    super(new FhirPathBuilder().task())
  }

  getPayloadIdentifier = (): string => this.builder.identifier()
  getNhsNumber = (): string => this.builder.nhsNumber()
  getOdsCode = (): string => this.builder.requester()
  getPrescriptionNumber = (): string => this.builder.prescriptionShortFormId()
}

const getPathBuilder = <T extends fhir.Resource>(payload: T): FhirPathGetter => {
  if (isBundle(payload)) {
    return new BundlePathGetter()
  } else if (isClaim(payload)) {
    return new ClaimPathGetter()
  } else if (isParameters(payload)) {
    return new ParametersPathGetter()
  } else if (isTask(payload)) {
    return new TaskPathGetter()
  } else {
    throw "Unsupported payload type"
  }
}

const readValueFromFhirPath = (reader: FhirPathReader, fhirPath: string): string => {
  if (fhirPath) return reader.read(fhirPath)
  else return VALUE_NOT_PROVIDED
}

const getPayloadIdentifiers = <T extends fhir.Resource>(payload: T): PayloadIdentifiers => {
  const reader = new FhirPathReader(payload)
  const builder = getPathBuilder(payload)

  return {
    payloadIdentifier: readValueFromFhirPath(reader, builder.getPayloadIdentifier()),
    patientNhsNumber: readValueFromFhirPath(reader, builder.getNhsNumber()),
    senderOdsCode: readValueFromFhirPath(reader, builder.getOdsCode()),
    prescriptionShortFormId: readValueFromFhirPath(reader, builder.getPrescriptionNumber())
  }
}

export {getPayloadIdentifiers}
export type {PayloadIdentifiers}
