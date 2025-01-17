import {render} from "@testing-library/react"
import {screen, waitFor} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import {expect} from "@jest/globals"
import ReleaseForm from "../../../src/components/release/releaseForm"
import userEvent from "@testing-library/user-event"
import {MemoryRouter} from "react-router"

const prescriptionId = "7A9089-A83008-56A03J"

test("Fields default to current values for nominated release", async () => {
  const {container} = render(
    <MemoryRouter>
      <ReleaseForm onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const releaseTypeContainer = await screen.findByLabelText<HTMLElement>("Choose how you want to release prescription(s)")
  const releaseTypeRadios = releaseTypeContainer.getElementsByClassName("nhsuk-radios__input") as HTMLCollectionOf<HTMLInputElement>
  expect(releaseTypeRadios).toHaveLength(3)
  expect(releaseTypeRadios[0].value).toEqual("all")
  expect(releaseTypeRadios[0].checked).toBeTruthy()
  expect(releaseTypeRadios[1].value).toEqual("prescriptionId")
  expect(releaseTypeRadios[1].checked).toBeFalsy()
  expect(releaseTypeRadios[2].value).toEqual("custom")
  expect(releaseTypeRadios[2].checked).toBeFalsy()

  const pharmacyContainer = await screen.findByLabelText<HTMLElement>("Pharmacy to release prescriptions to")
  const pharmacyRadios = pharmacyContainer.getElementsByClassName("nhsuk-radios__input") as HTMLCollectionOf<HTMLInputElement>
  expect(pharmacyRadios).toHaveLength(3)
  expect(pharmacyRadios[0].value).toEqual("VNFKT")
  expect(pharmacyRadios[0].checked).toBeFalsy()
  expect(pharmacyRadios[1].value).toEqual("YGM1E")
  expect(pharmacyRadios[1].checked).toBeFalsy()
  expect(pharmacyRadios[2].value).toEqual("custom")
  expect(pharmacyRadios[2].checked).toBeFalsy()

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Fields default to current values for patient release", async () => {
  const {container} = render(
    <MemoryRouter>
      <ReleaseForm prescriptionId={prescriptionId} onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const releaseTypeContainer = await screen.findByLabelText<HTMLElement>("Choose how you want to release prescription(s)")
  const releaseTypeRadios = releaseTypeContainer.getElementsByClassName("nhsuk-radios__input") as HTMLCollectionOf<HTMLInputElement>
  expect(releaseTypeRadios).toHaveLength(3)
  expect(releaseTypeRadios[0].value).toEqual("all")
  expect(releaseTypeRadios[0].checked).toBeFalsy()
  expect(releaseTypeRadios[1].value).toEqual("prescriptionId")
  expect(releaseTypeRadios[1].checked).toBeTruthy()
  expect(releaseTypeRadios[2].value).toEqual("custom")
  expect(releaseTypeRadios[2].checked).toBeFalsy()

  const pharmacyContainer = await screen.findByLabelText<HTMLElement>("Pharmacy to release prescriptions to")
  const pharmacyRadios = pharmacyContainer.getElementsByClassName("nhsuk-radios__input") as HTMLCollectionOf<HTMLInputElement>
  expect(pharmacyRadios).toHaveLength(3)
  expect(pharmacyRadios[0].value).toEqual("VNFKT")
  expect(pharmacyRadios[0].checked).toBeFalsy()
  expect(pharmacyRadios[1].value).toEqual("YGM1E")
  expect(pharmacyRadios[1].checked).toBeFalsy()
  expect(pharmacyRadios[2].value).toEqual("custom")
  expect(pharmacyRadios[2].checked).toBeFalsy()

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Prescription Id Field is required when releasing by prescription Id", async () => {
  const {container} = render(
    <MemoryRouter>
      <ReleaseForm onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const releaseTypeContainer = await screen.findByLabelText<HTMLElement>("Choose how you want to release prescription(s)")
  const releaseTypeRadios = releaseTypeContainer.getElementsByClassName("nhsuk-radios__input") as HTMLCollectionOf<HTMLInputElement>
  userEvent.click(releaseTypeRadios[1])
  userEvent.click(screen.getByText("Release"))

  await waitFor(() => screen.getByText("You must enter a 'Prescription ID' to release to when releasing a single prescription"))
  expect(screen.getByLabelText("Prescription ID")).toBeTruthy()

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Fhir Field is required when releasing a custom fhir release message", async () => {
  const {container} = render(
    <MemoryRouter>
      <ReleaseForm onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  const releaseTypeContainer = await screen.findByLabelText<HTMLElement>("Choose how you want to release prescription(s)")
  const releaseTypeRadios = releaseTypeContainer.getElementsByClassName("nhsuk-radios__input") as HTMLCollectionOf<HTMLInputElement>
  userEvent.click(releaseTypeRadios[2])
  userEvent.click(screen.getByText("Release"))

  await waitFor(() => screen.getByText("You must enter a FHIR release message when selecting 'With a FHIR release message'"))
  expect(screen.getByLabelText("Paste a FHIR release message")).toBeTruthy()

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Pharmacy to release to is always required", async () => {
  const {container} = render(
    <MemoryRouter>
      <ReleaseForm onSubmit={jest.fn}/>
    </MemoryRouter>
  )

  userEvent.click(screen.getByText("Release"))

  await waitFor(() => screen.getByText("You must select a pharmacy to release to"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})
