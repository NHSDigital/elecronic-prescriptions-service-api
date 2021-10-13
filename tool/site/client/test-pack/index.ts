import * as XLSX from "xlsx"
import {pageData} from "../ui/state"
import {createNominatedPharmacies} from "./nominated_pharmacies"
import {createPatients} from "./patients"
import {createPrescribers} from "./prescribers"
import {createPrescriptions} from "./prescriptions"

export function initialiseTestPack(): void {
  document
    .getElementById("prescription-test-pack")
    .addEventListener("change", handleFileSelect, false)
}

function handleFileSelect(evt: Event) {
  const files = (evt.target as HTMLInputElement).files
  parseExcel(files[0])
}

const parseExcel = (file: Blob) => {
  const reader = new FileReader()

  reader.onload = function (e) {
    const data = e.target.result
    const workbook = XLSX.read(data, {
      type: "binary"
    })

    const patientRows = getRowsFromSheet("Patients", workbook)
    const prescriberRows = getRowsFromSheet("Prescribers", workbook, false)
    const nominatedPharmacyRows = getRowsFromSheet("Nominated_Pharmacies", workbook, false)
    const prescriptionRows = getRowsFromSheet("Prescriptions", workbook)
    // todo: sanity check user input and provide feedback if
    // patients and prescriber count doesn't match prescription count
    const patients = createPatients(patientRows)
    const prescribers = createPrescribers(prescriberRows)
    const nominatedPharmacies = createNominatedPharmacies(nominatedPharmacyRows)
    pageData.payloads = createPrescriptions(patients, prescribers, nominatedPharmacies, prescriptionRows)
  }

  reader.onerror = function (ex) {
    console.log(ex)
  }

  reader.readAsBinaryString(file)
}

function getRowsFromSheet(sheetName: string, workbook: XLSX.WorkBook, required = true) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet && required)
    throw new Error(`Could not find a sheet called '${sheetName}'`)
  //eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const rows = XLSX.utils.sheet_to_row_object_array(sheet)
  return rows
}
