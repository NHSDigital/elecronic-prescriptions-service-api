import {Button} from "nhsuk-react-components"
import React from "react"
import {useNavigate} from "react-router"

export const BackButton : React.FC = () => {
  const navigate = useNavigate()
  return <Button type="button" secondary onClick={() => navigate(-1)}>Back</Button>
}

export default BackButton
