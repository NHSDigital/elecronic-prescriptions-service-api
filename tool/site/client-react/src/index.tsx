import * as React from "react"
import {PageContainer} from "./components/pageContainer"
import PrescriptionSummary from "./components/prescription-summary/prescriptionSummary"
import * as ReactDOM from "react-dom"
import {Button} from "nhsuk-react-components"
import {OperationOutcome} from "fhir/r4"
import axios from "axios"
import {BrowserRouter, Switch, Route} from "react-router-dom"
import ClaimPage from "./components/claim/claimPage"
import SearchPage from "./pages/searchPage"

const customWindow = window as Record<string, any>

interface signResponse {
  redirectUri?: string
  prepareErrors?: Array<OperationOutcome>
}

// TODO: move this to page/component
async function sendSignRequest(baseUrl: string) {
  try {
    const response = await axios.post<signResponse>(`${baseUrl}prescribe/sign`)
    if (response.data.prepareErrors) {
      const prepareErrors = response.data.prepareErrors
      prepareErrors
        .flatMap(error => error.issue)
        .filter(issue => issue.severity === "error")
        .filter(issue => !issue.diagnostics.startsWith("Unable to find matching profile for urn:uuid:"))
        .map(issue => issue.diagnostics)
        .forEach(diagnostic => console.log(diagnostic))
        // TODO display the above errors on ui
    } else if (response.data.redirectUri) {
      //TODO REACT redirect when router
      window.location.href = response.data.redirectUri
    } else {
      console.log(`Unable to sign prescription, this is most likely because your session has expired. Please try to change-auth or login again`)
    }
  } catch (e) {
    console.log(e)
  }
}

async function startApplication (baseUrl: string): Promise<void> {
  const urlParams = new URLSearchParams(window.location.search)
  const content = (
    <PageContainer>
      <BrowserRouter>
        <Switch>
          <Route path={`${baseUrl}prescribe/edit`}>
            <PrescriptionSummary
              baseUrl={baseUrl}
              prescriptionId={urlParams.get("prescription_id")}
            />
            <div>
              <Button onClick={() => sendSignRequest(baseUrl)}>Send</Button>
              <Button secondary href={baseUrl}>Back</Button>
            </div>
          </Route>
          <Route path={`${baseUrl}search`}>
            <SearchPage baseUrl={baseUrl} prescriptionId={urlParams.get("prescription_id")} />
          </Route>
          <Route path={`${baseUrl}dispense/claim`}>
            <ClaimPage baseUrl={baseUrl} prescriptionId={urlParams.get("prescription_id")}/>
          </Route>
        </Switch>
      </BrowserRouter>
    </PageContainer>
  )
  ReactDOM.render(content, document.getElementById("root"))
}

customWindow.startApplication = startApplication
