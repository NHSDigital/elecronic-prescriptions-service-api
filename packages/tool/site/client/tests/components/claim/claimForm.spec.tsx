import {noPriorClaimInitialValues, priorClaimInitialValues, staticProductInfo} from "./props"
import {render, waitFor} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import userEvent from "@testing-library/user-event"
import pretty from "pretty"
import * as React from "react"
import ClaimForm, {ClaimFormValues} from "../../../src/components/claim/claimForm"
import {renderWithContext} from "../../renderWithContext"
import {AppContextValue} from "../../../src"
import {internalDev} from "../../../src/services/environment"
import {MemoryRouter} from "react-router"

const baseUrl = "baseUrl/"
const context: AppContextValue = {baseUrl, environment: internalDev}

test("Form has no endorsement fields initially", async () => {
  const container = await renderClaimForm(noPriorClaimInitialValues)

  expect(screen.queryAllByLabelText(/Endorsement \d+ Type/)).toHaveLength(0)
  expect(screen.queryAllByLabelText(/Endorsement \d+ Supporting Information/)).toHaveLength(0)
  expect(screen.queryAllByText("Remove Endorsement")).toHaveLength(0)
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Clicking Add Endorsement button adds one set of endorsement fields", async () => {
  const container = await renderClaimForm(noPriorClaimInitialValues)

  await addEndorsement()

  expect(await screen.findByLabelText("Endorsement 1 Type")).toBeTruthy()
  expect(await screen.findByLabelText("Endorsement 1 Supporting Information")).toBeTruthy()
  expect(screen.queryByLabelText("Endorsement 2 Type")).toBeFalsy()
  expect(screen.queryByLabelText("Endorsement 2 Supporting Information")).toBeFalsy()
  expect(await screen.findAllByText("Remove Endorsement")).toHaveLength(1)
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Clicking Add Endorsement button twice adds two sets of endorsement fields", async () => {
  const container = await renderClaimForm(noPriorClaimInitialValues)

  await addEndorsement()
  await addEndorsement()

  expect(await screen.findByLabelText("Endorsement 2 Type")).toBeTruthy()
  expect(await screen.findByLabelText("Endorsement 2 Supporting Information")).toBeTruthy()
  expect(await screen.findAllByText("Remove Endorsement")).toHaveLength(2)
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Clicking Remove Endorsement button removes one set of endorsement fields", async () => {
  const container = await renderClaimForm(noPriorClaimInitialValues)
  await addEndorsement()
  await addEndorsement()

  await removeEndorsement()

  expect(screen.queryByLabelText("Endorsement 2 Type")).toBeFalsy()
  expect(screen.queryByLabelText("Endorsement 2 Supporting Information")).toBeFalsy()
  expect(await screen.findAllByText("Remove Endorsement")).toHaveLength(1)
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Clicking Claim button calls the callback with form values", async () => {
  const submit = jest.fn()
  render(<MemoryRouter><ClaimForm initialValues={noPriorClaimInitialValues} onSubmit={submit}/></MemoryRouter>)
  await enterValuesInAllFields()
  await userEvent.click(await screen.findByText("Claim"))
  await waitFor(() => expect(submit).toHaveBeenCalled())

  expect(submit).toHaveBeenCalledWith({
    exemption: {
      code: "0005",
      evidenceSeen: true
    },
    products: [{
      ...staticProductInfo,
      patientPaid: true,
      endorsements: [{
        code: "IP",
        id: 0,
        supportingInfo: "£210.91,100ml,Specials Ltd,Lic12345678,BN12345678"
      }]
    }]
  })
})

test("Prepopulated claim info renders properly", async () => {
  const container = await renderClaimForm(priorClaimInitialValues)

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

async function addEndorsement() {
  const initialEndorsementCount = screen.queryAllByText("Remove Endorsement").length
  await userEvent.click(screen.getByText("Add Endorsement"))
  await waitFor(async () =>
    expect(screen.queryAllByText("Remove Endorsement")).toHaveLength(initialEndorsementCount + 1)
  )
}

async function removeEndorsement() {
  const initialEndorsementCount = screen.queryAllByText("Remove Endorsement").length
  userEvent.click(screen.getAllByText("Remove Endorsement")[0])
  await waitFor(() =>
    expect(screen.queryAllByText("Remove Endorsement")).toHaveLength(initialEndorsementCount - 1)
  )
}

async function enterValuesInAllFields() {
  await addEndorsement()
  await userEvent.click(await screen.findByLabelText("Patient Paid"))
  await userEvent.selectOptions(await screen.findByLabelText("Endorsement 1 Type"), "IP")
  await userEvent.type(await screen.findByLabelText("Endorsement 1 Supporting Information"), "£210.91,100ml,Specials Ltd,Lic12345678,BN12345678")
  await userEvent.selectOptions(await screen.findByLabelText("Exemption Status"), "0005")
  await userEvent.click(await screen.findByLabelText("Evidence Seen"))
}

async function renderClaimForm(initialValues: ClaimFormValues) {
  const {container} = renderWithContext(<MemoryRouter><ClaimForm initialValues={initialValues} onSubmit={jest.fn}/></MemoryRouter>, context)
  await waitFor(() => screen.getByText("Claim"))
  return container
}
