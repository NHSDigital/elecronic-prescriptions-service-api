import * as React from "react"
import {useState} from "react"
import {Button, Details, Form, Label} from "nhsuk-react-components"
import Pre from "../pre"
import {Bundle, FhirResource, Task} from "fhir/r4"
import {createPrescriptionDetailProps, PrescriptionDetails} from "./detail/prescriptionDetails"
import {createPrescriptionItemProps, PrescriptionItems} from "./detail/prescriptionItems"
import ButtonList from "../buttonList"
import {Field, Formik} from "formik"
import {MaskedInput} from "nhsuk-react-components-extensions"
import TrackerSummaryTable from "./summary/trackerSummaryTable"

interface PrescriptionSearchProps {
  baseUrl: string
  prescriptionId?: string
}

interface PrescriptionSearchCriteria {
  prescriptionId: string
  patientId: string
}

function toURLSearchParams(searchCriteria: PrescriptionSearchCriteria) {
  const searchParams = new URLSearchParams()
  if (searchCriteria.prescriptionId) {
    const prescriptionIdForSearch = searchCriteria.prescriptionId.toUpperCase()
    searchParams.set("focus:identifier", prescriptionIdForSearch)
  }
  if (searchCriteria.patientId) {
    const patientIdForSearch = searchCriteria.patientId.replace(/ /g, "")
    searchParams.set("patient:identifier", patientIdForSearch)
  }
  return searchParams
}

const PrescriptionSearch: React.FC<PrescriptionSearchProps> = ({
  baseUrl,
  prescriptionId
}) => {
  const [searchResults, setSearchResults] = useState<Bundle>()
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>()

  async function handleSearch(searchCriteria: PrescriptionSearchCriteria) {
    const searchParams = toURLSearchParams(searchCriteria)
    const response = await fetch(`${baseUrl}tracker?${searchParams.toString()}`)
    //TODO - check for error response
    const bundle: Bundle = await response.json()
    setSearchResults(bundle)
  }

  function handleReset() {
    setSearchResults(undefined)
    setSelectedPrescriptionId(undefined)
  }

  const initialValues = {
    prescriptionId: prescriptionId ?? "",
    patientId: ""
  }

  if (selectedPrescriptionId) {
    const selectedTask = searchResults.entry
      .map(entry => entry.resource)
      .filter(isTask)
      .find(task => task.focus.identifier.value === selectedPrescriptionId)
    const prescription = createPrescriptionDetailProps(selectedTask)
    const prescriptionItems = createPrescriptionItemProps(selectedTask)
    return <>
      <Label isPageHeading>Prescription Details</Label>
      <PrescriptionDetails {...prescription} />
      <PrescriptionItems items={prescriptionItems}/>
      <Details expander>
        <Details.Summary>Show FHIR</Details.Summary>
        <Details.Text>
          <Pre>{JSON.stringify(selectedTask, null, 2)}</Pre>
        </Details.Text>
      </Details>
      <ButtonList>
        <Button secondary onClick={() => setSelectedPrescriptionId(undefined)}>Back</Button>
      </ButtonList>
    </>
  }

  if (searchResults) {
    const prescriptions = searchResults.entry
      .map(entry => entry.resource)
      .filter(isTask)
      .map(task => createPrescriptionDetailProps(task))
    return <>
      <Label isPageHeading>Search Results</Label>
      <TrackerSummaryTable prescriptions={prescriptions} setSelectedPrescriptionId={setSelectedPrescriptionId}/>
      <Details expander>
        <Details.Summary>Show FHIR</Details.Summary>
        <Details.Text>
          <Pre>{JSON.stringify(searchResults, null, 2)}</Pre>
        </Details.Text>
      </Details>
      <ButtonList>
        <Button secondary onClick={handleReset}>Back</Button>
      </ButtonList>
    </>
  }

  //TODO - move to separate component
  return (
    <Formik<PrescriptionSearchCriteria> initialValues={initialValues} onSubmit={values => handleSearch(values)}>
      {formik => (
        <Form onSubmit={formik.handleSubmit} onReset={formik.handleReset}>
          <Label isPageHeading>Search for a Prescription</Label>
          <Field
            id="prescriptionId"
            name="prescriptionId"
            label="Prescription ID"
            hint="Use the short form here, e.g. E3E6FA-A83008-41F09Y"
            width={20}
            mask="******-******-******"
            maskChar=""
            autoComplete="off"
            as={MaskedInput}
          />
          <Field
            id="patientId"
            name="patientId"
            label="NHS Number"
            width={10}
            mask="999 999 9999"
            maskChar=""
            autoComplete="off"
            as={MaskedInput}
          />
          <ButtonList>
            <Button type="submit">Search</Button>
            <Button secondary href={baseUrl}>Back</Button>
          </ButtonList>
        </Form>
      )}
    </Formik>
  )
}

function isTask(resource: FhirResource): resource is Task {
  return resource.resourceType === "Task"
}

export default PrescriptionSearch
