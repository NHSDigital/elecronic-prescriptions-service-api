import {fhir} from "@models"
import {telecom} from "./telecom"

export const practitionerRole: fhir.PractitionerRole = {
  resourceType: "PractitionerRole",
  id: "16708936-6397-4e03-b84f-4aaa790633e0",
  identifier: [
    {
      system: "https://fhir.nhs.uk/Id/sds-role-profile-id",
      value: "555086415105"
    }
  ],
  practitioner: {
    identifier: {
      "system": "https://fhir.hl7.org.uk/Id/gphc-number",
      "value": "1231234"
    },
    display: "Jackie Clark"
  },
  organization: {
    reference: "Organization/organization"
  },
  code: [
    {
      coding: [
        {
          system: "https://fhir.hl7.org.uk/CodeSystem/UKCore-SDSJobRoleName",
          code: "R8000",
          display: "Clinical Practitioner Access Role"
        }
      ]
    }
  ],
  telecom: [telecom]
}
