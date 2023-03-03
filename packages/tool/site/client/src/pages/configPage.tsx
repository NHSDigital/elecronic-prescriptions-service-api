import * as React from "react"
import {Label, Button, Fieldset, Form, Checkboxes, Input} from "nhsuk-react-components"
import {AppContext} from "../index"
import ButtonList from "../components/common/buttonList"
import {Field, Formik} from "formik"
import {axiosInstance} from "../requests/axiosInstance"
import BackButton from "../components/common/backButton"
import SuccessOrFail from "../components/common/successOrFail"

interface ConfigFormValues {
  useSigningMock: boolean
  epsPrNumber: string
  signingPrNumber: string
}

interface ConfigResponse {
  success: boolean
}

const ConfigPage: React.FC = () => {
  const {baseUrl} = React.useContext(AppContext)
  const [configUpdateSuccess, setConfigUpdateSuccess] = React.useState(undefined)
  const initialValues = {useSigningMock: false, epsPrNumber: "", signingPrNumber: ""}

  if (configUpdateSuccess !== undefined) {
    return <>
      <Label isPageHeading>Config Saved {<SuccessOrFail condition={configUpdateSuccess} />}</Label>
      <ButtonList>
        <BackButton/>
      </ButtonList>
    </>
  }

  return (
    <>
      <Label isPageHeading>Config</Label>
      <Formik<ConfigFormValues>
        initialValues={initialValues}
        onSubmit={values => updateConfig(baseUrl, values, setConfigUpdateSuccess)}
      >
        {formik =>
          <Form onSubmit={formik.handleSubmit} onReset={formik.handleReset}>
            <Label bold>EPS</Label>
            <Fieldset>
              <Field
                id="epsPrNumber"
                name="epsPrNumber"
                as={Input}
                width={30}
                label="EPS PR Number"
              />
              <Label bold>Signing</Label>
              <Checkboxes id="useSigningMockCheckboxes">
                <Field id="useSigningMock" name="useSigningMock" type="checkbox" as={Checkboxes.Box}>
                  Use Signing Mock
                </Field>
              </Checkboxes>
              {!formik.values.useSigningMock &&
                <Field
                  id="signingPrNumber"
                  name="signingPrNumber"
                  as={Input}
                  width={30}
                  label="Signing PR Number"
                />
              }
            </Fieldset>
            <ButtonList>
              <Button type="submit">Save</Button>
            </ButtonList>
          </Form>
        }
      </Formik>
    </>
  )
}

async function updateConfig(
  baseUrl: string,
  configFormValues: ConfigFormValues,
  setConfigUpdateSuccess: React.Dispatch<boolean>
): Promise<void> {
  const success = (await axiosInstance.post<ConfigResponse>(`${baseUrl}config`, configFormValues)).data.success
  setConfigUpdateSuccess(success)
}

export default ConfigPage
