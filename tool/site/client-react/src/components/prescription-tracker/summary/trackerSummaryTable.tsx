import {ActionLink, Table} from "nhsuk-react-components"
import {PrescriptionDetailProps} from "../detail/prescriptionDetails"
import React from "react"

interface TrackerSummaryTableProps {
  prescriptions: Array<PrescriptionDetailProps>
  setSelectedPrescriptionId: React.Dispatch<React.SetStateAction<string>>
}

const TrackerSummaryTable: React.FC<TrackerSummaryTableProps> = ({
  prescriptions,
  setSelectedPrescriptionId
}) => {
  const actionLinkStyle: React.CSSProperties = {
    marginBottom: "0"
  }
  return (
    <Table caption="Prescription Search Results">
      <Table.Head>
        <Table.Row>
          <Table.Cell>ID</Table.Cell>
          <Table.Cell>NHS Number</Table.Cell>
          <Table.Cell>Status</Table.Cell>
          <Table.Cell>Creation Date</Table.Cell>
          <Table.Cell/>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {prescriptions.map(prescription => (
          <Table.Row key={prescription.id}>
            <Table.Cell>{prescription.id}</Table.Cell>
            <Table.Cell>{prescription.patientNhsNumber}</Table.Cell>
            <Table.Cell>{prescription.status}</Table.Cell>
            <Table.Cell>{prescription.creationDate}</Table.Cell>
            <Table.Cell>
              <ActionLink style={actionLinkStyle} onClick={() => setSelectedPrescriptionId(prescription.id)}>
                View Details
              </ActionLink>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

export default TrackerSummaryTable
