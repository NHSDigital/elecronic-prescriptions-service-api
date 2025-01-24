import * as React from "react"
import {Page} from "./components/page"
import SignPage from "./pages/signPage"
import {BrowserRouter, Route, Routes} from "react-router"
import {createRoot} from "react-dom/client"
import ClaimPage from "./pages/claimPage"
import DispensePage from "./pages/dispensePage"
import {CookiesProvider} from "react-cookie"
import SendPage from "./pages/sendPage"
import HomePage from "./pages/homePage"
import PrescriptionSearchPage from "./pages/prescriptionSearchPage"
import ReleasePage from "./pages/releasePage"
import CancelPage from "./pages/cancelPage"
import MyPrescriptionsPage from "./pages/myPrescriptionsPage"
import LoginPage from "./pages/loginPage"
import ValidatePage from "./pages/validatePage"
import ReturnPage from "./pages/returnPage"
import WithdrawPage from "./pages/withdrawPage"
import LoadPage from "./pages/loadPage"
import {Environment} from "./services/environment"
import LogoutPage from "./pages/logoutPage"
import ConfigPage from "./pages/configPage"
import ComparePage from "./pages/comparePage"
import ViewPrescriptionPage from "./pages/viewPrescriptionPage"
import {PageFullWidth} from "./components/pageFullWidth"
import {PageContainer} from "./components/pageContainer"
import DoseToTextPage from "./pages/doseToTextPage"

const customWindow = window as Record<string, any>

export interface AppContextValue {
  baseUrl: string
  environment: Environment
}

export const AppContext = React.createContext<AppContextValue>({baseUrl: "/", environment: "int"})

async function startApplication(baseUrl: string, environment: Environment): Promise<void> {
  const urlParams = new URLSearchParams(window.location.search)
  const content = (
    <AppContext.Provider value={{baseUrl, environment}}>
      <CookiesProvider>
        <Page>
          <BrowserRouter>
            <Routes>
              <Route path={`${baseUrl}/`} element={
                <PageContainer>
                  <HomePage />
                </PageContainer>}>

              </Route>
              <Route path={`${baseUrl}dose-to-text`} element={
                <PageContainer>
                  <DoseToTextPage/>
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}config`} element={
                <PageContainer>
                  <ConfigPage/>
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}my-prescriptions`} element={
                <PageContainer>
                  <MyPrescriptionsPage/>
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}login`} element={
                <PageContainer>
                  <LoginPage separateAuth={urlParams.get("separate_auth")}/>
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}logout`} element={
                <PageContainer>
                  <LogoutPage/>
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}prescribe/load`} element={
                <PageContainer>
                  <LoadPage/>
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}prescribe/edit`} element={
                <PageContainer>
                  <SignPage/>
                </PageContainer>}>
              </Route>

              <Route path={`${baseUrl}prescribe/send`} element={
                <PageContainer>
                  <SendPage token={urlParams.get("token")} state={urlParams.get("state")}/>
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}prescribe/cancel`} element={
                <PageContainer>
                  <CancelPage prescriptionId={urlParams.get("prescription_id")}/>
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}dispense/release`} element={
                <PageContainer>
                  <ReleasePage prescriptionId={urlParams.get("prescription_id")}/>
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}dispense/return`} element={
                <PageContainer>
                  <ReturnPage prescriptionId={urlParams.get("prescription_id")} />
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}dispense/withdraw`} element={
                <PageContainer>
                  <WithdrawPage prescriptionId={urlParams.get("prescription_id")} />
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}dispense/dispense`} element={
                <PageContainer>
                  <DispensePage prescriptionId={urlParams.get("prescription_id")} amendId={urlParams.get("amend_id")} />
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}dispense/claim`} element={
                <PageContainer>
                  <ClaimPage prescriptionId={urlParams.get("prescription_id")} amend={!!urlParams.get("amend")}/>
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}search`} element={
                <PageContainer>
                  <PrescriptionSearchPage prescriptionId={urlParams.get("prescription_id")} />
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}view`} element={
                <PageContainer>
                  <ViewPrescriptionPage prescriptionId={urlParams.get("prescription_id")} />
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}validate`} element={
                <PageContainer>
                  <ValidatePage />
                </PageContainer>}>
              </Route>
              <Route path={`${baseUrl}compare-prescriptions`} element={
                <PageFullWidth>
                  <ComparePage />
                </PageFullWidth>}>
              </Route>
            </Routes>
          </BrowserRouter>
        </Page>
      </CookiesProvider>
    </AppContext.Provider>
  )
  const root = createRoot(document.getElementById("root"))
  root.render(content)
}

customWindow.startApplication = startApplication
