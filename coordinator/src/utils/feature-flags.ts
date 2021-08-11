import pino from "pino"

export function getPrescribeEnabled(): boolean {
  return process.env.PRESCRIBE_ENABLED === "true"
}

export function getDispenseEnabled(): boolean {
  return process.env.DISPENSE_ENABLED === "true"
}

export function getDoseToTextMode(logger: pino.Logger): DoseToTextMode {
  const mode = process.env.DOSE_TO_TEXT_MODE
  if (mode in DoseToTextMode) {
    return mode as DoseToTextMode
  }
  if (mode) {
    logger.warn(`Invalid dose to text mode "${mode}". Using "DISABLED".`)
  }
  return DoseToTextMode.DISABLED
}

export enum DoseToTextMode {
  DISABLED = "DISABLED",
  AUDIT = "AUDIT"
}
