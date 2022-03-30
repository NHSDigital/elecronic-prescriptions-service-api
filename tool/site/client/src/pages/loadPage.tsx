import {Field, Formik} from "formik"
import {Button, Fieldset, Form, Input, Label, Textarea, ErrorSummary} from "nhsuk-react-components"
import * as React from "react"
import {useContext, useEffect, useState} from "react"
import BackButton from "../components/common/backButton"
import ButtonList from "../components/common/buttonList"
import RadioField from "../components/common/radioField"
import {AppContext} from "../index"
import {Bundle} from "fhir/r4"
import {axiosInstance} from "../requests/axiosInstance"
import {getResponseDataIfValid} from "../requests/getValidResponse"
import {createPrescriptionsFromExcelFile} from "../services/test-packs"
import {readPrescriptionsFromFiles} from "../services/file-upload"
import {updateBundleIds, updateValidityPeriod} from "../fhir/helpers"

interface LoadFormValues {
  prescriptionPath: string
  prescriptionTextArea?: string
}

interface LoadResponse {
  redirectUri: string
}

interface LoadPageErrors {
  details: Array<string>
}

function isLoadResponse(response: unknown): response is LoadResponse {
  return (response as LoadResponse).redirectUri !== undefined
}

const LoadPage: React.FC = () => {
  const {baseUrl} = useContext(AppContext)

  const initialValues: LoadFormValues = {
    prescriptionPath: "primary-care/acute/nominated-pharmacy/medical-prescriber"
  }

  const [prescriptionFilesUploaded, setPrescriptionFilesUploaded] = useState([])
  const [prescriptionsInTestPack, setPrescriptionsInTestPack] = useState([])
  const [loadFormValues, setLoadFormValues] = useState<LoadFormValues>()
  const [loadPageErrors, setLoadPageErrors] = useState<LoadPageErrors>({details:[]})

  useEffect(() => {
    (async() => {
      if (loadFormValues) {

        setLoadPageErrors({details: []})

        const bundles = await getBundles(baseUrl, loadFormValues, prescriptionsInTestPack, prescriptionFilesUploaded)

        if (!bundles.length) {
          setLoadPageErrors({details: ["Unable to read prescription(s)"]})
        }

        bundles.forEach(bundle => {
          updateBundleIds(bundle)
          updateValidityPeriod(bundle)
        })

        const loadResponses = await uploadBundlesInBatchesOfTen(bundles)

        window.location.href = encodeURI(loadResponses[0].redirectUri)
      }

      async function uploadBundlesInBatchesOfTen(bundles: Bundle[]) {
        const loadResponses: Array<LoadResponse> = []
        const chunkSize = 10
        for (let i = 0; i < bundles.length; i += chunkSize) {
          const chunk = bundles.slice(i, i + chunkSize)
          const response = await axiosInstance.post<LoadResponse>(`${baseUrl}prescribe/edit`, chunk)
          loadResponses.push(getResponseDataIfValid(response, isLoadResponse))
        }
        return loadResponses
      }
    })()
  }, [baseUrl, loadFormValues, prescriptionsInTestPack, prescriptionFilesUploaded, setLoadPageErrors])

  function uploadPrescriptionFiles(target: EventTarget): void {
    setLoadPageErrors({details: []})
    setPrescriptionFilesUploaded(undefined)

    const files = (target as HTMLInputElement).files
    if (!files.length) {
      return
    }
    readPrescriptionsFromFiles(files, prescriptionFilesUploaded, setPrescriptionFilesUploaded)
  }

  function uploadPrescriptionTestPack(target: EventTarget) {
    setLoadPageErrors({details: []})
    setPrescriptionsInTestPack(undefined)

    const files = (target as HTMLInputElement).files
    createPrescriptionsFromExcelFile(files[0], setPrescriptionsInTestPack, setLoadPageErrors)
  }

  return (
    <>
      <Label isPageHeading>Load prescription(s)</Label>
      <Formik<LoadFormValues> onSubmit={setLoadFormValues} initialValues={initialValues}>
        {formik =>
          <Form onSubmit={formik.handleSubmit} onReset={formik.handleReset}>
            <Fieldset>
              <RadioField
                name="prescriptionPath"
                label="Select a prescription to load"
                onClick={() => setLoadPageErrors({details: []})}
                defaultValue={initialValues.prescriptionPath}
                fieldRadios={[
                  {
                    value: "primary-care/acute/nominated-pharmacy/medical-prescriber",
                    text: "Primary Care - Acute (nominated)"
                  },
                  // {
                  //   value: "primary-care/repeat-prescribing",
                  //   text: "Primary Care - Repeat Prescribing (nominated)"
                  // },
                  // {
                  //   value: "primary-care/repeat-dispensing/nominated-pharmacy/medical-prescriber/author/gmc/responsible-party/medication-list/din",
                  //   text: "Primary Care - Repeat Dispensing (nominated)"
                  // },
                  {
                    value: "secondary-care/community/acute/nominated-pharmacy/clinical-practitioner",
                    text: "Secondary Care - Acute (nominated)"
                  },
                  // {
                  //   value: "secondary-care/community/acute/no-nominated-pharmacy/clinical-practitioner",
                  //   text: "Secondary Care - Acute"
                  // },
                  // {
                  //   value: "secondary-care/community/repeat-dispensing/nominated-pharmacy/clinical-practitioner/single-medication-request",
                  //   text: "Secondary Care - Repeat Dispensing (nominated)"
                  // },
                  {
                    value: "custom",
                    text: "Custom"
                  }
                ]}
              />
              {formik.values.prescriptionPath === "custom" &&
              <>
                <Label>Paste a FHIR prescription</Label>
                <Field
                  id="prescriptionTextArea"
                  name="prescriptionTextArea"
                  as={Textarea}
                  rows={10}
                />
                <Label>Upload Test Pack</Label>
                <Input
                  type="file"
                  accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={e => uploadPrescriptionTestPack(e.target)}
                />
                <Label>Upload FHIR prescription files</Label>
                <Input
                  type="file"
                  multiple
                  accept="application/json"
                  onChange={e => uploadPrescriptionFiles(e.target)}
                />
              </>
              }
            </Fieldset>
            <ButtonList>
              <Button type="submit">View</Button>
              <BackButton />
            </ButtonList>
          </Form>
        }
      </Formik>
      {!!loadPageErrors.details.length &&
        <ErrorSummary aria-labelledby="error-summary-title" role="alert" tabIndex={-1}>
          <ErrorSummary.Title id="error-summary-title">The following error(s) occured</ErrorSummary.Title>
          <ErrorSummary.Body>
            {loadPageErrors.details.map(detail =>
              <ErrorSummary.Item style={{color: "black"}}>{detail}</ErrorSummary.Item>
            )}
            <ErrorSummary.List>
            </ErrorSummary.List>
          </ErrorSummary.Body>
        </ErrorSummary>
      }
    </>
  )
}

async function getBundles(
  baseUrl: string,
  loadFormValues: LoadFormValues,
  prescriptionsInTestPack: Array<string>,
  prescriptionFilesUploaded: Array<string>
): Promise<Array<Bundle>> {

  if (loadFormValues.prescriptionPath === "custom") {

    const textPrescription =
      loadFormValues.prescriptionTextArea
        ? loadFormValues.prescriptionTextArea
        : undefined

    return [textPrescription, ...prescriptionFilesUploaded, ...prescriptionsInTestPack]
      .filter(Boolean)
      .map(string => {
        let bundle: Bundle
        try {
          bundle = JSON.parse(string)
          if (!bundle.entry.length) {
            throw new Error()
          }
        } catch {
          return null
        }
        return bundle
      })
      .filter(Boolean)
  }

  const examplePrescription = (await axiosInstance.get<Bundle>(
    `${baseUrl}static/examples/${loadFormValues.prescriptionPath}/1-Prepare-Request-200_OK.json`
  )).data

  return [examplePrescription]
}

export default LoadPage
