import { Field, Formik } from "formik"
import {Checkboxes, Fieldset, Table} from "nhsuk-react-components"
import React from "react"
import PrescriptionActions from "../prescriptionActions"

interface PrescriptionGroupTableProps {
  name: string
  description: string
  prescriptions: Array<string>
  actions: PrescriptionActionProps
}

interface PrescriptionActionProps {
  view?: boolean
  release?: boolean
  verify?: boolean
  releaseReturn?: boolean
  withdraw?: boolean
  dispense?: boolean
  claim?: boolean
}

export const PrescriptionGroupTable: React.FC<PrescriptionGroupTableProps> = ({
  name,
  description,
  prescriptions,
  actions
}) => {
  if (!prescriptions.length) {
    return null
  }
  return (
    <Table.Panel heading={name}>
      <Table caption={description}>
        <Table.Head>
          <Table.Row>
            <Table.Cell>ID</Table.Cell>
            <Table.Cell>Actions</Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {prescriptions.map((prescription, index) =>
            <Table.Row key={index}>
              <Table.Cell>{prescription}</Table.Cell>
              <Table.Cell>
                <PrescriptionActions prescriptionId={prescription} {...actions}/>
                <Checkboxes id={`prescription.${prescription}`}>
                  <Formik<any> initialValues={null} onSubmit={null}>
                    <Fieldset>
                    <Field
                      id={`prescription.${prescription}.box`}
                      name={`prescription.${prescription}.box`}
                      type="checkbox" as={Checkboxes.Box}
                    >
                      Add to Compare
                    </Field>
                    </Fieldset>
                  </Formik>
                </Checkboxes>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </Table.Panel>
  )
}
