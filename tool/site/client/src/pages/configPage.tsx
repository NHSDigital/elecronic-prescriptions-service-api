import * as React from "react"
import {useContext, useState} from "react"
import {Label, Button, Fieldset, Form, Checkboxes, Input, CrossIcon, TickIcon} from "nhsuk-react-components"
import {AppContext} from "../index"
import ButtonList from "../components/buttonList"
import {Field, Formik} from "formik"
import {axiosInstance} from "../requests/axiosInstance"
import BackButton from "../components/backButton"

interface ConfigFormValues {
  useSigningMock: boolean
  signingPrNumber: string
}

interface ConfigResponse {
  success: boolean
}

const ConfigPage: React.FC = () => {
  const {baseUrl} = useContext(AppContext)
  const [configFormValues] = useState<ConfigFormValues>()
  const [configUpdateSuccess, setConfigUpdateSuccess] = useState(undefined)
  const initialValues = {useSigningMock: false, signingPrNumber: undefined}

  const updateConfigTask = () => updateConfig(baseUrl, configFormValues, setConfigUpdateSuccess)

  if (configUpdateSuccess !== undefined) {
    return <>
      <Label isPageHeading>Config Saved {configUpdateSuccess ? <TickIcon/> : <CrossIcon/>}</Label>
      <ButtonList>
        <BackButton/>
      </ButtonList>
    </>
  }

  return (
    <>
      <Label isPageHeading>Config</Label>
      <Formik<ConfigFormValues> initialValues={initialValues} onSubmit={updateConfigTask}>
        {formik =>
          <Form onSubmit={formik.handleSubmit} onReset={formik.handleReset}>
            <Label bold>Signing</Label>
            <Fieldset>
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
