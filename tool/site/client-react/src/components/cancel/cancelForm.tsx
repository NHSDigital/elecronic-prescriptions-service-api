import * as React from "react"
import {Button, Form, Fieldset} from "nhsuk-react-components"
import {Formik} from "formik"
import ButtonList from "../../components/buttonList"
import BackButton from "../../components/backButton"
import RadioField from "../radioField"

interface CancelFormProps {
  prescriptionId?: string
  medications: Array<any>
  onSubmit: (values: CancelFormValues) => void
}

const CancelForm: React.FC<CancelFormProps> = ({
  prescriptionId,
  medications,
  onSubmit
}) => {
  const initialValues: CancelFormValues = getInitialValues(prescriptionId)

  return (
    <Formik<CancelFormValues> initialValues={initialValues} onSubmit={values => onSubmit(values)}>
      {formik =>
        <Form onSubmit={formik.handleSubmit} onReset={formik.handleReset}>
          <Fieldset>
            <RadioField
              name="cancellationReason"
              label="Choose a reason for cancellation"
              defaultValue="0001"
              fieldRadios={[
                {
                  value: "0001",
                  text: "Prescribing Error"
                },
                {
                  value: "0002",
                  text: "Clinical contra-indication"
                },
                {
                  value: "0003",
                  text: "Change to medication treatment regime"
                },
                {
                  value: "0004",
                  text: "Clinical grounds"
                },
                {
                  value: "0005",
                  text: "At the Patient's request"
                },
                {
                  value: "0006",
                  text: "At the Pharmacist's request"
                },
                {
                  value: "0007",
                  text: "Notification of Death"
                },
                {
                  value: "0008",
                  text: "Patient deducted - other reason"
                },
                {
                  value: "0009",
                  text: "Patient deducted - registered with new practice"
                }
              ]}
            />
            <RadioField
              name="cancellationUser"
              label="Choose a cancellation user"
              defaultValue="0001"
              fieldRadios={[
                {
                  value: "same-as-original-author",
                  text: "Use original author"
                },
                {
                  value: "R8006",
                  text: "Admin - Medical Secetary Access Role"
                }
              ]}
            />
            <RadioField
              name="cancellationMedication"
              label="Choose a medication to cancel"
              fieldRadios={medications}
            />
          </Fieldset>
          <ButtonList>
            <Button type="submit">Cancel</Button>
            <BackButton/>
          </ButtonList>
        </Form>
      }
    </Formik>
  )
}

function getInitialValues(prescriptionId: string): CancelFormValues {
  return {}
}

export default CancelForm

export interface CancelFormValues {}

export interface MedicationRadio {
  value: string
  text: string
}