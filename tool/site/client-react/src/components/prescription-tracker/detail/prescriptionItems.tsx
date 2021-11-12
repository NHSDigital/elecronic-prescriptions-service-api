import * as React from "react"
import {Table} from "nhsuk-react-components"
import {Task} from "fhir/r4"
import {getDispenseStatusExtension} from "../../../fhir/customExtensions"

interface PrescriptionItemsProps {
  items: Array<PrescriptionItemProps>
}

export interface PrescriptionItemProps {
  identifier: string
  dispenseStatus: string
}

export function createPrescriptionItemProps(task: Task): Array<PrescriptionItemProps> {
  return task.input.map(input => {
    return {
      identifier: input.valueReference.identifier.value,
      dispenseStatus: getDispenseStatusExtension(input.extension).valueCoding.display
    }
  })
}

export const PrescriptionItems: React.FC<PrescriptionItemsProps> = ({
  items
}) => {
  return (
    <Table.Panel heading="Items">
      <Table caption="Item summary">
        <Table.Head>
          <Table.Row>
            <Table.Cell>Identifier</Table.Cell>
            <Table.Cell>Status</Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {items.map((item, index) => <PrescriptionItemRow key={index} {...item}/>)}
        </Table.Body>
      </Table>
    </Table.Panel>
  )
}

const PrescriptionItemRow: React.FC<PrescriptionItemProps> = ({
  identifier,
  dispenseStatus
}) => <Table.Row>
  <Table.Cell>{identifier}</Table.Cell>
  <Table.Cell>{dispenseStatus}</Table.Cell>
</Table.Row>
