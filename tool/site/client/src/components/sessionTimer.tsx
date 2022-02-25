import {Label} from "nhsuk-react-components"
import React, {useContext, useEffect, useState} from "react"
import {useCookies} from "react-cookie"
import styled from "styled-components"
import {AppContext} from ".."
import {isRedirect, redirect} from "../browser/navigation"
import {axiosInstance} from "../requests/axiosInstance"

const Timer = styled(Label)`
  float: right;
  color: white;
`

export const SessionTimer: React.FC = () => {
  const {baseUrl} = useContext(AppContext)
  const [cookies] = useCookies()

  const accessTokenFetched = cookies["Access-Token-Fetched"]
  const lastTokenRefresh = cookies["Last-Token-Refresh"] ?? cookies["Access-Token-Fetched"]

  const calculateTimeToTokenExpiry = () => {
    const now = getUtcEpochSeconds()
    return /*cookies["Refresh-Token-Expires-In"]*/ 60 - (now - accessTokenFetched)
  }

  const calculateTimeToRefresh = () => {
    const now = getUtcEpochSeconds()
    return /*cookies["Token-Expires-In"]*/ 20 - (now - lastTokenRefresh)
  }

  const [tokenExpiresIn, setTokenExpiresIn] = useState(calculateTimeToTokenExpiry())
  const [timeTillRefresh, setTimeTillRefresh] = useState(calculateTimeToRefresh())
  const [refreshTokenInProgress, setRefreshTokenInProgress] = useState(false)

  const refreshToken = async() => {
    const result = (await axiosInstance.post(`${baseUrl}auth/refresh`)).data
    if (isRedirect(result)) {
      redirect(result.redirectUri)
    }
  }

  const nonRedirectRoutes = [`${baseUrl}login`, `${baseUrl}logout`, `${baseUrl}prescribe/send`]
  const [redirectRequired, setRedirectRequired] = useState(
    !nonRedirectRoutes.includes(window.location.pathname)
  )

  useEffect(() => {
    setTimeout(() => {
      const tokenExpiresIn = calculateTimeToTokenExpiry()
      const timeToRefresh = calculateTimeToRefresh()

      if (timeTillRefresh <= 0) {
        if (!refreshTokenInProgress) {
          setRefreshTokenInProgress(true)
          refreshToken().then(() => setRefreshTokenInProgress(false))
        }
      }

      if (tokenExpiresIn <= 0) {
        if (redirectRequired) {
          setRedirectRequired(false)
          redirect(`${baseUrl}logout`)
        }
      }

      setTokenExpiresIn(tokenExpiresIn)
      setTimeTillRefresh(timeToRefresh)
    }, 1000)
  })

  const createTimeIntervals = (timeLeft: number) => {
    return timeLeft > 0
      ? {
        minutes: Math.floor((timeLeft / 60) % 60),
        seconds: Math.floor((timeLeft) % 60)
      }
      : {}
  }

  const timeIntervals = createTimeIntervals(tokenExpiresIn)

  const timerIntervalElements = Object.keys(timeIntervals).map((interval, index) => {
    return <span key={index}>
      {timeIntervals[interval]} {interval}{" "}
    </span>
  })

  if (!timerIntervalElements.length) {
    return null
  }

  return (
    <Timer>{timerIntervalElements}</Timer>
  )
}

function getUtcEpochSeconds() {
  return Date.now() / 1000
}

export default SessionTimer
