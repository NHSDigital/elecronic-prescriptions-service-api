import {render, waitFor} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import DispenseForm from "../../../src/components/dispense/dispenseForm"
import {staticLineItemInfoArray, staticPrescriptionInfo} from "./props"
import {LineItemStatus, PrescriptionStatus} from "../../../src/fhir/reference-data/valueSets"
import {expect} from "@jest/globals"
import userEvent from "@testing-library/user-event"
import {MemoryRouter} from "react-router"

test("Fields default to current values", async () => {
  const {container} = render(
    <MemoryRouter>
      <DispenseForm lineItems={staticLineItemInfoArray} prescription={staticPrescriptionInfo} onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const statusFields = await screen.findAllByLabelText<HTMLSelectElement>("Status")
  expect(statusFields).toHaveLength(3)
  expect(statusFields[0].value).toEqual(LineItemStatus.WITH_DISPENSER)
  expect(statusFields[1].value).toEqual(LineItemStatus.NOT_DISPENSED)
  expect(statusFields[2].value).toEqual(PrescriptionStatus.WITH_DISPENSER)

  const nonDispensingReasonFields = screen.getAllByLabelText<HTMLSelectElement>("Reason")
  expect(nonDispensingReasonFields).toHaveLength(1)
  expect(nonDispensingReasonFields[0].value).toEqual("0011")

  const itemWithoutDispenses = screen.getAllByText<HTMLSelectElement>("Quantity Currently Dispensed")
  expect(itemWithoutDispenses).toHaveLength(1)

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Reason field is shown when status is set to not dispensed", async () => {
  const {container} = render(
    <MemoryRouter>
      <DispenseForm lineItems={staticLineItemInfoArray} prescription={staticPrescriptionInfo} onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const nonDispensingReasonFields = await screen.findAllByLabelText<HTMLSelectElement>("Reason")
  const statusFields = screen.getAllByLabelText<HTMLSelectElement>("Status")
  const initialCount = nonDispensingReasonFields.length

  userEvent.selectOptions(statusFields[0], LineItemStatus.NOT_DISPENSED)
  await waitFor(() =>
    expect(screen.queryAllByLabelText("Reason")).toHaveLength(initialCount + 1)
  )

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Reason field is hidden when status is not set to not dispensed", async () => {
  const {container} = render(
    <MemoryRouter>
      <DispenseForm lineItems={staticLineItemInfoArray} prescription={staticPrescriptionInfo} onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const nonDispensingReasonFields = await screen.findAllByLabelText<HTMLSelectElement>("Reason")
  const statusFields = screen.getAllByLabelText<HTMLSelectElement>("Status")
  const initialCount = nonDispensingReasonFields.length

  userEvent.selectOptions(statusFields[1], LineItemStatus.WITH_DISPENSER)
  await waitFor(() =>
    expect(screen.queryAllByLabelText("Reason")).toHaveLength(initialCount - 1)
  )

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Quantity field is shown when status is set to partial dispensed", async () => {
  const {container} = render(
    <MemoryRouter>
      <DispenseForm lineItems={staticLineItemInfoArray} prescription={staticPrescriptionInfo} onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const statusFields = screen.getAllByLabelText<HTMLSelectElement>("Status")

  userEvent.selectOptions(statusFields[0], LineItemStatus.PARTIALLY_DISPENSED)
  const quantityField = await screen.findAllByLabelText<HTMLSelectElement>("Quantity Dispensed")
  await waitFor(() =>
    expect(quantityField).toHaveLength(1)
  )

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Quantity field is hidden when status is not set to partial dispensed", async () => {
  const {container} = render(
    <MemoryRouter>
      <DispenseForm lineItems={staticLineItemInfoArray} prescription={staticPrescriptionInfo} onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const statusFields = screen.getAllByLabelText<HTMLSelectElement>("Status")

  userEvent.selectOptions(statusFields[0], LineItemStatus.WITH_DISPENSER)
  await waitFor(() =>
    expect(screen.queryAllByLabelText("Quantity Dispensed")).toHaveLength(0)
  )

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Reason field value is reset when hidden", async () => {
  const {container} = render(
    <MemoryRouter>
      <DispenseForm lineItems={staticLineItemInfoArray} prescription={staticPrescriptionInfo} onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const reasonFields = await screen.findAllByLabelText<HTMLSelectElement>("Reason")
  const statusFields = screen.getAllByLabelText<HTMLSelectElement>("Status")
  const initialCount = reasonFields.length
  const initialValue = reasonFields[0].value

  await React.act(async () => {
    await userEvent.selectOptions(reasonFields[0], "0001")
  })
  expect(reasonFields[0].value).not.toEqual(initialValue)

  await React.act(async () => {
    await userEvent.selectOptions(statusFields[1], LineItemStatus.DISPENSED)
  })
  await waitFor(() =>
    expect(screen.queryAllByLabelText("Reason")).toHaveLength(initialCount - 1)
  )

  await React.act(async () => {
    await userEvent.selectOptions(statusFields[1], LineItemStatus.NOT_DISPENSED)
  })
  await waitFor(() =>
    expect(screen.queryAllByLabelText("Reason")).toHaveLength(initialCount)
  )
  expect(screen.getByLabelText<HTMLSelectElement>("Reason").value).toEqual(initialValue)

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Prescription status updates to suggested value when line item status is changed", async () => {
  const {container} = render(
    <MemoryRouter>
      <DispenseForm lineItems={staticLineItemInfoArray} prescription={staticPrescriptionInfo} onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const statusFields = screen.getAllByLabelText<HTMLSelectElement>("Status")
  const initialPrescriptionStatus = statusFields[2].value

  userEvent.selectOptions(statusFields[0], LineItemStatus.PARTIALLY_DISPENSED)
  userEvent.selectOptions(statusFields[1], LineItemStatus.PARTIALLY_DISPENSED)
  await waitFor(() => {
    const statusFields = screen.getAllByLabelText<HTMLSelectElement>("Status")
    expect(statusFields[2].value).not.toEqual(initialPrescriptionStatus)
    expect(statusFields[2].value).toEqual(PrescriptionStatus.PARTIALLY_DISPENSED)
  })

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Prescription status is not updated automatically if field has been touched", async () => {
  const {container} = render(
    <MemoryRouter>
      <DispenseForm lineItems={staticLineItemInfoArray} prescription={staticPrescriptionInfo} onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const statusFields = screen.getAllByLabelText<HTMLSelectElement>("Status")
  userEvent.selectOptions(statusFields[2], PrescriptionStatus.DISPENSED)
  userEvent.selectOptions(statusFields[0], LineItemStatus.PARTIALLY_DISPENSED)
  userEvent.selectOptions(statusFields[1], LineItemStatus.PARTIALLY_DISPENSED)
  await waitFor(() => {
    const statusFields = screen.getAllByLabelText<HTMLSelectElement>("Status")
    expect(statusFields[2].value).toEqual(PrescriptionStatus.DISPENSED)
  })

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Dispense Different Medication checkbox is present for paracetamol 500 (60)", async () => {
  const {container} = render(
    <MemoryRouter>
      <DispenseForm lineItems={staticLineItemInfoArray} prescription={staticPrescriptionInfo} onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  await waitFor(() => {
    expect(screen.queryAllByText("Dispense Different Medication")).toHaveLength(1)
  })

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})
