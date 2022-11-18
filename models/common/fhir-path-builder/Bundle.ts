import {AbstractPathBuilder} from "./AbstractBuilder"
import {MedicationRequestPathBuilder} from "./MedicationRequest"
import {MessageHeaderPathBuilder} from "./MessageHeader"
import {PatientPathBuilder} from "./Patient"

export class BundlePathBuilder extends AbstractPathBuilder {
  constructor(path: string) {
    super(path)
  }

  identifier(): string {
    return `${this.path}.identifier.value`
  }

  messageHeader(): MessageHeaderPathBuilder {
    return new MessageHeaderPathBuilder(`${this.path}.entry.resource.ofType(MessageHeader)`)
  }

  patient(): PatientPathBuilder {
    return new PatientPathBuilder(`${this.path}.entry.resource.ofType(Patient).first()`)
  }

  medicationRequest(): MedicationRequestPathBuilder {
    return new MedicationRequestPathBuilder(`${this.path}.entry.resource.ofType(MedicationRequest).first()`)
  }

  medicationRequests(): MedicationRequestPathBuilder {
    return new MedicationRequestPathBuilder(`${this.path}.entry.resource.ofType(MedicationRequest)`)
  }
}
