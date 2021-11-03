import * as React from "react"
import {CSSProperties, ReactNode} from "react"

interface ButtonListProps {
  children: ReactNode
}

const ButtonList: React.FC<ButtonListProps> = ({
  children
}) => {
  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    gap: "1em"
  }
  return (
    <div style={containerStyle}>
      {children}
    </div>
  )
}

export default ButtonList
