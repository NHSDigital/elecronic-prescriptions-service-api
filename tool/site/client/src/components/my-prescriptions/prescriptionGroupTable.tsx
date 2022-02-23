import {Label, Checkboxes, Table} from "nhsuk-react-components"
import React, {FormEvent, useContext} from "react"
import {AppContext} from "../.."
import {redirect} from "../../browser/navigation"
import {axiosInstance} from "../../requests/axiosInstance"
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
  const {baseUrl} = useContext(AppContext)
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
              <Table.Cell>
                <Label>{prescription}</Label>
                <Checkboxes id={`prescription.${prescription}`}>
                  <Checkboxes.Box
                    id={`prescription.${prescription}.box`}
                    name={`prescription.${prescription}.box`}
                    type="checkbox"
                    onChange={e => addToComparePrescriptions(
                      baseUrl,
                      name,
                      prescription,
                      e
                    )}
                  >
                    Add to Compare
                  </Checkboxes.Box>
                </Checkboxes>
              </Table.Cell>
              <Table.Cell>
                <PrescriptionActions prescriptionId={prescription} {...actions} />
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </Table.Panel>
  )
}

async function addToComparePrescriptions(
  baseUrl: string,
  name: string,
  id: string,
  event: FormEvent<HTMLInputElement>
) {
  const addToCompare = ((event.target) as HTMLInputElement).checked
  const removeFromCompare = !addToCompare
  if (addToCompare) {
    const comparePrescriptions = (await axiosInstance.post(`${baseUrl}api/compare-prescriptions`, {name: name.toLowerCase().replace(" ", "_"), id})).data
    if (comparePrescriptions.prescription1 && comparePrescriptions.prescription2) {
      redirect(`${baseUrl}compare-prescriptions`)
    }
  } else if (removeFromCompare) {
    await axiosInstance.post(`${baseUrl}api/compare-prescriptions`, {name: "", id: ""})
  }
}
