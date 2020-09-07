import {ElementCompact} from "xml-js"
import {Text} from "./hl7-v3-datatypes-core"

class Code<T extends string> implements ElementCompact {
    _attributes: {
        codeSystem: T
        code: string
        displayName?: string
    }

    originalText?: Text

    constructor(system: T, code: string, desc?: string) {
      this._attributes = {
        codeSystem: system,
        code: code,
        displayName: desc
      }
    }
}

export class SexCode extends Code<"2.16.840.1.113883.2.1.3.2.4.16.25"> {
  constructor(code: string) {
    super("2.16.840.1.113883.2.1.3.2.4.16.25", code)
  }

    static UNKNOWN = new SexCode("0")
    static MALE = new SexCode("1")
    static FEMALE = new SexCode("2")
    static INDETERMINATE = new SexCode("9")
}

export class PatientCareProvisionTypeCode extends Code<"2.16.840.1.113883.2.1.3.2.4.17.37"> {
  constructor(code: string) {
    super("2.16.840.1.113883.2.1.3.2.4.17.37", code)
  }

    static PRIMARY_CARE = new PatientCareProvisionTypeCode("1")
}

export class SnomedCode extends Code<"2.16.840.1.113883.2.1.3.2.4.15"> {
  constructor(code: string, desc?: string) {
    super("2.16.840.1.113883.2.1.3.2.4.15", code, desc)
  }
}

export class SdsJobRoleCode extends Code<"1.2.826.0.1285.0.2.1.104"> {
  constructor(code: string) {
    super("1.2.826.0.1285.0.2.1.104", code)
  }
}

export class OrganizationTypeCode extends Code<"2.16.840.1.113883.2.1.3.2.4.17.94"> {
  constructor(code: string) {
    super("2.16.840.1.113883.2.1.3.2.4.17.94", code)
  }
}

export class PrescriptionAnnotationCode extends Code<"2.16.840.1.113883.2.1.3.2.4.17.30"> {
  constructor(code: string) {
    super("2.16.840.1.113883.2.1.3.2.4.17.30", code)
  }
}

export class PrescriptionTreatmentTypeCode extends Code<"2.16.840.1.113883.2.1.3.2.4.16.36"> {
  constructor(code: string) {
    super("2.16.840.1.113883.2.1.3.2.4.16.36", code)
  }

    static ACUTE = new PrescriptionTreatmentTypeCode("0001")
    static CONTINUOUS = new PrescriptionTreatmentTypeCode("0002")
    static CONTINUOUS_REPEAT_DISPENSING = new PrescriptionTreatmentTypeCode("0003")
}

export class DispensingSitePreferenceCode extends Code<"2.16.840.1.113883.2.1.3.2.4.17.21"> {
  constructor(code: string) {
    super("2.16.840.1.113883.2.1.3.2.4.17.21", code)
  }
}

export class PrescriptionEndorsementCode extends Code<"2.16.840.1.113883.2.1.3.2.4.16.32"> {
  constructor(code: string) {
    super("2.16.840.1.113883.2.1.3.2.4.16.32", code)
  }
}

export class PrescriptionTypeCode extends Code<"2.16.840.1.113883.2.1.3.2.4.17.25"> {
  constructor(code: string) {
    super("2.16.840.1.113883.2.1.3.2.4.17.25", code)
  }
}

class CodeWithoutSystem extends Code<undefined> {
  constructor(code: string) {
    super(undefined, code)
  }
}

export class Hl7StandardVersionCode extends CodeWithoutSystem {
    static V3_NPFIT_4_2_00 = new Hl7StandardVersionCode("V3NPfIT4.2.00")
}

export class ProcessingId extends CodeWithoutSystem {
    static PRODUCTION = new ProcessingId("P")
}

export class ProcessingMode extends CodeWithoutSystem {
    static ONLINE = new ProcessingMode("T")
}

export class AcceptAckCode extends CodeWithoutSystem {
    static NEVER = new AcceptAckCode("NE")
}

class Identifier<T extends string> implements ElementCompact {
    _attributes: {
        root: T
        extension?: string
    }

    constructor(root: T, extension?: string) {
      this._attributes = {
        root: root,
        extension: extension
      }
    }
}

export class GlobalIdentifier extends Identifier<string> {
    _attributes: {
        root: string
        extension: undefined
    }
    constructor(root: string) {
      isUUID(root) ? super(root.toUpperCase()) : super(root)
    }
}

export class TypeIdentifier extends Identifier<"2.16.840.1.113883.2.1.3.2.4.18.7"> {
  constructor(extension: string) {
    super("2.16.840.1.113883.2.1.3.2.4.18.7", extension)
  }
}

export class TemplateIdentifier extends Identifier<"2.16.840.1.113883.2.1.3.2.4.18.2"> {
  constructor(extension: string) {
    super("2.16.840.1.113883.2.1.3.2.4.18.2", extension)
  }
}

export class NhsNumber extends Identifier<"2.16.840.1.113883.2.1.4.1"> {
  constructor(extension: string) {
    super("2.16.840.1.113883.2.1.4.1", extension)
  }
}

export class SdsUniqueIdentifier extends Identifier<"1.2.826.0.1285.0.2.0.65"> {
  constructor(extension: string) {
    super("1.2.826.0.1285.0.2.0.65", extension)
  }
}

export class SdsRoleProfileIdentifier extends Identifier<"1.2.826.0.1285.0.2.0.67"> {
  constructor(extension: string) {
    super("1.2.826.0.1285.0.2.0.67", extension)
  }
}

export class BsaPrescribingIdentifier extends Identifier<"1.2.826.0.1285.0.2.1.54"> {
  constructor(extension: string) {
    super("1.2.826.0.1285.0.2.1.54", extension)
  }
}

export class ShortFormPrescriptionIdentifier extends Identifier<"2.16.840.1.113883.2.1.3.2.4.18.8"> {
  constructor(extension: string) {
    super("2.16.840.1.113883.2.1.3.2.4.18.8", extension)
  }
}

export class SdsOrganizationIdentifier extends Identifier<"1.2.826.0.1285.0.1.10"> {
  constructor(extension: string) {
    super("1.2.826.0.1285.0.1.10", extension)
  }
}

export class Hl7InteractionIdentifier extends Identifier<"2.16.840.1.113883.2.1.3.2.4.12"> {
  constructor(extension: string) {
    super("2.16.840.1.113883.2.1.3.2.4.12", extension)
  }

    static PARENT_PRESCRIPTION_URGENT = new Hl7InteractionIdentifier("PORX_IN020101SM31")
}

export class AccreditedSystemIdentifier extends Identifier<"1.2.826.0.1285.0.2.0.107"> {
  constructor(extension: string) {
    super("1.2.826.0.1285.0.2.0.107", extension)
  }
}

export class SdsJobRoleIdentifier extends Identifier<"1.2.826.0.1285.0.2.1.104"> {
  constructor(extension: string) {
    super("1.2.826.0.1285.0.2.1.104", extension)
  }
}

function isUUID(s: string): boolean {
  const re = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i
  return re.test(s)
}
