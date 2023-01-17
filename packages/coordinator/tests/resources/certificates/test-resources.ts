/**
 * Mock certificates for signature verification unit tests.
 */

import path from "path"
import * as fs from "fs"
import {fromBER} from "asn1js"
import {Certificate, CertificateRevocationList} from "pkijs"


const readFile = (filename: string): string => {
  const filePath = path.join(__dirname, `./${filename}`)
  return fs.readFileSync(filePath, "utf-8")
}

// Source https://gist.github.com/adisbladis/c84e533e591b1737fedd26658021fef2
const decodeCertificate = (contents: string): Certificate => {
  const b64 = contents.replace(/(-----(BEGIN|END) CERTIFICATE-----|[\n\r])/g, "")
  const der = Buffer.from(b64, "base64")
  const ber = new Uint8Array(der).buffer
  const asn1 = fromBER(ber)
  return new Certificate({schema: asn1.result})
}

const decodeCrl = (contents: string): CertificateRevocationList => {
  const b64 = contents.replace(/(-----(BEGIN|END) X509 CRL-----|[\n\r])/g, "")
  const der = Buffer.from(b64, "base64")
  const ber = new Uint8Array(der).buffer
  const asn1crl = fromBER(ber)
  return new CertificateRevocationList({schema: asn1crl.result})
}

type MockCertificates = { [key: string]: Certificate }

const validCertificates: MockCertificates = {
  certificate: decodeCertificate(
    readFile("certs/validSmartcard.pem")
  )
}

const revokedCertificates: MockCertificates = {
  cessationOfOperation: decodeCertificate(
    readFile("certs/cessationOfOperation.pem")
  ),
  keyCompromise: decodeCertificate(
    readFile("certs/keyCompromise.pem")
  ),
  cACompromise: decodeCertificate(
    readFile("certs/cACompromise.pem")
  )
}

const revocationList: CertificateRevocationList = decodeCrl(
  readFile("crl/ca.crl")
)

export type {MockCertificates}
export {
  validCertificates,
  revokedCertificates,
  revocationList
}
