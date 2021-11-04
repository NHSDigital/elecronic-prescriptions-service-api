import * as React from "react"
import {CSSProperties} from "react"
import {Button, Details} from "nhsuk-react-components"
import Pre from "./pre"
import {FhirResource} from "fhir/r4"
import ButtonList from "./buttonList"

interface MessageExpandersProps {
  fhirRequest: FhirResource
  hl7V3Request: string
  fhirResponse: FhirResource
  hl7V3Response: string
}

const MessageExpanders: React.FC<MessageExpandersProps> = ({
  fhirRequest,
  hl7V3Request,
  fhirResponse,
  hl7V3Response
}) => (
  <Details.ExpanderGroup>
    <MessageExpander
      name="Request (FHIR)"
      message={JSON.stringify(fhirRequest, null, 2)}
      mimeType="application/json"
    />
    <MessageExpander
      name="Request (HL7 V3)"
      message={hl7V3Request}
      mimeType="text/xml"
    />
    <MessageExpander
      name="Response (FHIR)"
      message={JSON.stringify(fhirResponse, null, 2)}
      mimeType="application/json"
    />
    <MessageExpander
      name="Response (HL7 V3)"
      message={hl7V3Response}
      mimeType="text/xml"
    />
  </Details.ExpanderGroup>
)

interface MessageExpanderProps {
  name: string
  message: string
  mimeType: string
}

const MessageExpander: React.FC<MessageExpanderProps> = ({
  name,
  message,
  mimeType
}) => {
  const buttonStyle: CSSProperties = {
    marginBottom: 0
  }
  const downloadHref = `data:${mimeType};charset=utf-8,${encodeURIComponent(message)}`
  return (
    <Details expander>
      <Details.Summary>{name}</Details.Summary>
      <Details.Text>
        <ButtonList>
          <Button style={buttonStyle} onClick={() => navigator.clipboard.writeText(message)}>Copy</Button>
          <Button style={buttonStyle} download="message" href={downloadHref}>Download</Button>
        </ButtonList>
        <Pre>{message}</Pre>
      </Details.Text>
    </Details>
  )
}

export default MessageExpanders
