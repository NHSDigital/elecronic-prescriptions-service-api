import React, {useContext} from "react"
import {useNavigate} from "react-router"
import LongRunningTask from "../components/common/longRunningTask"
import PrescriptionSearchResultsDetail from "../components/prescription-tracker/prescriptionSearchResultsDetail"
import {AppContext} from "../index"
import {FullPrescriptionDetails, retrieveFullPrescriptionDetails} from "./prescriptionSearchPage"

interface ViewPrescriptionPageProps {
  prescriptionId?: string
}

const ViewPrescriptionPage: React.FC<ViewPrescriptionPageProps> = ({
  prescriptionId
}) => {
  const {baseUrl} = useContext(AppContext)
  const navigate = useNavigate()

  return (
    <LongRunningTask<FullPrescriptionDetails>
      task={() => retrieveFullPrescriptionDetails(baseUrl, prescriptionId)}
      loadingMessage="Retrieving full prescription details."
    >
      {prescriptionDetails => <PrescriptionSearchResultsDetail prescriptionDetails={prescriptionDetails} back={() => navigate(-1)}/>}
    </LongRunningTask>
  )
}

export default ViewPrescriptionPage
