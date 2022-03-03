import * as React from "react"
import {useContext} from "react"
import {Button, Details, SummaryList} from "nhsuk-react-components"
import styled from "styled-components"
import {DispenseEventProps} from "./dispenseEventTable"
import {LineItemTable} from "./lineItemTable"
import {AppContext} from "../../.."
import ButtonList from "../../common/buttonList"

const StyledList = styled(SummaryList)`
  padding: 0px 24px 0px 24px;
`

interface DispenseEventTableRowProps extends DispenseEventProps {
  prescriptionId: string
}

export const DispenseEventTableRow: React.FC<DispenseEventTableRowProps> = ({
  dispenseEventId,
  prescriptionStatus,
  eventDate,
  items,
  prescriptionId
}) => {
  const {baseUrl} = useContext(AppContext)
  const encodedIds = [encodeURIComponent(prescriptionId), encodeURIComponent(dispenseEventId)]
  const amendUrl = `${baseUrl}dispense/dispense?prescription_id=${encodedIds[0]}&amend_id=${encodedIds[1]}`

  return (
    <Details expander>
      <Details.Summary>{eventDate}</Details.Summary>
      <StyledList>
        <SummaryList.Row>
          <SummaryList.Key>ID</SummaryList.Key>
          <SummaryList.Value>{dispenseEventId}</SummaryList.Value>
        </SummaryList.Row>
        <SummaryList.Row>
          <SummaryList.Key>Event Date</SummaryList.Key>
          <SummaryList.Value>{eventDate}</SummaryList.Value>
        </SummaryList.Row>
        <SummaryList.Row>
          <SummaryList.Key>Prescription Status</SummaryList.Key>
          <SummaryList.Value>{prescriptionStatus}</SummaryList.Value>
        </SummaryList.Row>
      </StyledList>
      <Details.Text>
        <LineItemTable items={items}/>
        <ButtonList>
          <Button href={amendUrl}>Amend</Button>
        </ButtonList>
      </Details.Text>
    </Details>
  )
}
