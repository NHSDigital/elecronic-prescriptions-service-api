import * as React from "react"
import {Table} from "nhsuk-react-components"
import {
  getTaskBusinessStatusExtension
} from "../../../fhir/customExtensions"
import {VALUE_SET_PRESCRIPTION_STATUS} from "../../../fhir/reference-data/valueSets"
import {Bundle} from "fhir/r4"
import {getMedicationDispenseResources} from "../../../fhir/bundleResourceFinder"
import {MedicationDispense} from "../../../fhir/helpers"
import {formatDateAndTime} from "../../../formatters/dates"
import {DispenseEventTableRow} from "./dispenseEventTableRow"

interface DispenseEventsTableProps {
  prescriptionId: string
  events: Array<DispenseEventProps>
}

export interface DispenseEventProps {
  identifier: string
  prescriptionStatus: string
  eventDate: string
  items: Array<DispenseEventItemChanges>
}

export interface DispenseEventItemChanges {
  itemMedicationCode: string
  itemMedicationName: string
  itemStatus: string
  quantity: string
}

export const DispenseEventTable: React.FC<DispenseEventsTableProps> = ({
  prescriptionId,
  events
}) => {
  const lastEventIndex = events.length - 1
  return (
    <Table.Panel heading="Dispense Events">
      <Table>
        <Table.Body>
          {events.map(
            (event, index) => <DispenseEventTableRow
              key={index}
              prescriptionId={prescriptionId}
              lastEvent={index === lastEventIndex}
              {...event}
            />
          )}
        </Table.Body>
      </Table>
    </Table.Panel>
  )
}

export function createPrescriptionDispenseEvents(dispenseNotifications: Array<Bundle>): Array<DispenseEventProps> {
  return dispenseNotifications.map(createPrescriptionDispenseEvent)
}

function createPrescriptionDispenseEvent(dispenseNotification: Bundle): DispenseEventProps {
  const medicationDispenses = getMedicationDispenseResources(dispenseNotification)
  const firstMedicationDispense = medicationDispenses[0]

  const prescriptionStatusExtension = getTaskBusinessStatusExtension(firstMedicationDispense.extension)
  const prescriptionStatusCode = prescriptionStatusExtension.valueCoding.code
  const prescriptionStatus = VALUE_SET_PRESCRIPTION_STATUS.find(status => status.code === prescriptionStatusCode).display

  return {
    identifier: dispenseNotification.identifier.value,
    prescriptionStatus,
    eventDate: formatDateAndTime(firstMedicationDispense.whenHandedOver),
    items: medicationDispenses.map(createDispenseEventItemChanges)
  }
}

function createDispenseEventItemChanges(medicationDispense: MedicationDispense): DispenseEventItemChanges {
  const medicationCoding = medicationDispense.medicationCodeableConcept.coding[0]
  const {value, unit} = medicationDispense.quantity
  return {
    itemMedicationCode: medicationCoding.code,
    itemMedicationName: medicationCoding.display,
    itemStatus: medicationDispense.type.coding[0].display,
    quantity: `${value} ${unit}`
  }
}
