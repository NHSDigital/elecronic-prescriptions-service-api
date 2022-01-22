import * as React from "react"
import {ReactNode} from "react"
import {Col, Container, Footer, Header, Row} from "nhsuk-react-components"
import {AppContext} from "../index"
import {useCookies} from "react-cookie"
import RefreshToken from "./refreshToken"

interface PageContainerProps {
  children?: ReactNode
}

export const PageContainer: React.FC = (props: PageContainerProps) => {
  const [cookies] = useCookies()

  const loggedIn = cookies["Access-Token-Set"]

  return (
    <AppContext.Consumer>
      {({baseUrl}) => (
        <>
          <Header transactional>
            <Header.Container>
              <Header.Logo href={baseUrl}/>
              <Header.ServiceName href={baseUrl}>EPSAT - Electronic Prescription Service API Tool</Header.ServiceName>
              <RefreshToken/>
            </Header.Container>
            <Header.Nav>
              <Header.NavItem href={baseUrl}>
                Home
              </Header.NavItem>
              <Header.NavItem href={`${baseUrl}my-prescriptions`}>
                My Prescriptions
              </Header.NavItem>
              {loggedIn
                ? <Header.NavItem href={`${baseUrl}logout`}>
                    Logout
                </Header.NavItem>
                : <Header.NavItem href={`${baseUrl}login`}>
                    Login
                </Header.NavItem>
              }
            </Header.Nav>
          </Header>
          <main className="nhsuk-main-wrapper" id="maincontent" role="main">
            <Container>
              <Row>
                <Col width="full">{props.children}</Col>
              </Row>
            </Container>
          </main>
          <Footer>
            <Footer.List>
              <Footer.ListItem href={baseUrl}>{ /*TODO*/}</Footer.ListItem>
            </Footer.List>
            <Footer.Copyright>&copy; Crown copyright</Footer.Copyright>
          </Footer>
        </>
      )}
    </AppContext.Consumer>
  )
}
