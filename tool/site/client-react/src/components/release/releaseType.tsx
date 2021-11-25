import * as React from "react"
import {Input, Textarea} from "nhsuk-react-components"
import {Field} from "formik"
import RadioField from "../../components/radioField"

interface ReleaseTypeProps {
  initialValue: string
  value: string
  error?: string
}

const ReleaseType: React.FC<ReleaseTypeProps> = ({
  initialValue,
  value,
  error
}) => {
  return (
    <>
      <RadioField
        name="releaseType"
        label="Choose how you want to release prescription(s)"
        error={error}
        fieldRadios={[
          {
            value: "all",
            text: "All nominated prescriptions for the below pharmacy",
            defaultChecked: initialValue === "all"
          },
          {
            value: "prescriptionId",
            text: "A single prescription by ID",
            defaultChecked: initialValue === "prescriptionId"
          },
          {
            value: "custom",
            text: "With a FHIR release message"
          }
        ]}
      />
      {value === "prescriptionId" &&
        <Field
          id="prescriptionId"
          name="prescriptionId"
          as={Input}
          width={30}
          label="Prescription ID"
        />
      }
      {value === "custom" &&
        <Field
          id="customReleaseFhir"
          name="customReleaseFhir"
          as={Textarea}
          rows={20}
          label="Paste a FHIR release message"
        />
      }
    </>
  )
}

export default ReleaseType
