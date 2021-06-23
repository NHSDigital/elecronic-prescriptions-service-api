import {fhir} from "@models"
import {getNumericValueAsString, isTruthy} from "../common"
import {LosslessNumber} from "lossless-json"

export function stringifyDosage(dosageInstruction: fhir.Dosage): string {
  const dosageParts = [
    stringifyMethod(dosageInstruction),
    stringifyDose(dosageInstruction),
    stringifyRate(dosageInstruction),
    stringifyDuration(dosageInstruction),
    stringifyFrequencyAndPeriod(dosageInstruction)
  ]
  if (dosageParts.some(part => part?.some(element => !element))) {
    console.error(dosageParts)
    throw new Error("Null or undefined dosage element - required field not populated.")
  }
  return dosageParts.map(part => part?.join("")).filter(isTruthy).join(" ")
}

function stringifyMethod(dosageInstruction: fhir.Dosage) {
  const method = dosageInstruction.method
  if (!method) {
    return []
  }
  //TODO - is this correct? - page says no specific formatting required
  //TODO - if display isn't present we might need to get this from the system and code
  // not sure whether we'll need to lookup in a map or use the code directly
  return method.coding?.map(coding => coding?.display)
}

function stringifyDose(dosageInstruction: fhir.Dosage) {
  const doseAndRate = dosageInstruction.doseAndRate
  const doseQuantity = doseAndRate?.doseQuantity
  const doseRange = doseAndRate?.doseRange
  if (doseQuantity) {
    return [
      stringifyQuantityValue(doseQuantity), " ", stringifyQuantityUnit(doseQuantity)
    ]
  } else if (doseRange) {
    const lowUnit = stringifyQuantityUnit(doseRange.low)
    const highUnit = stringifyQuantityUnit(doseRange.high)
    const elements = [
      stringifyQuantityValue(doseRange.low)
    ]
    if (lowUnit !== highUnit) {
      elements.push(
        " ", lowUnit
      )
    }
    elements.push(
      " to ", stringifyQuantityValue(doseRange.high), " ", highUnit
    )
    return elements
  } else {
    return []
  }
}

function stringifyRate(dosageInstruction: fhir.Dosage) {
  const doseAndRate = dosageInstruction.doseAndRate
  const rateRatio = doseAndRate?.rateRatio
  const rateRange = doseAndRate?.rateRange
  const rateQuantity = doseAndRate?.rateQuantity
  if (rateRatio) {
    const numerator = rateRatio.numerator
    const denominator = rateRatio.denominator
    if (isOne(denominator?.value)) {
      return [
        "at a rate of ",
        stringifyQuantityValue(numerator),
        " ",
        stringifyQuantityUnit(numerator),
        " per ",
        stringifyQuantityUnit(denominator)
      ]
    } else {
      return [
        "at a rate of ",
        stringifyQuantityValue(numerator),
        " ",
        stringifyQuantityUnit(numerator),
        " every ",
        stringifyQuantityValue(denominator),
        " ",
        stringifyPluralQuantityUnit(denominator)
      ]
    }
  } else if (rateRange) {
    const lowRateQuantity = rateRange.low
    const highRateQuantity = rateRange.high
    const lowUnit = stringifyQuantityUnit(lowRateQuantity)
    const highUnit = stringifyQuantityUnit(highRateQuantity)
    const elements = [
      "at a rate of ", stringifyQuantityValue(lowRateQuantity)
    ]
    if (lowUnit !== highUnit) {
      elements.push(
        " ", lowUnit
      )
    }
    elements.push(
      " to ", stringifyQuantityValue(highRateQuantity), " ", highUnit
    )
    return elements
  } else if (rateQuantity) {
    return [
      "at a rate of ", stringifyQuantityValue(rateQuantity), " ", stringifyQuantityUnit(rateQuantity)
    ]
  } else {
    return []
  }
}

function stringifyDuration(dosage: fhir.Dosage) {
  const repeat = dosage.timing?.repeat
  const duration = repeat?.duration
  const durationMax = repeat?.durationMax
  const durationUnit = repeat?.durationUnit
  if (duration) {
    const elements = [
      "over ", stringifyNumericValue(duration), " ", stringifyPluralUnitOfTime(durationUnit, duration)
    ]
    if (durationMax) {
      elements.push(
        " (maximum ", stringifyNumericValue(durationMax), " ", stringifyPluralUnitOfTime(durationUnit, durationMax), ")"
      )
    }
    elements.push(".")
    return elements
  } else {
    return []
  }
}

function stringifyFrequencyAndPeriod(dosage: fhir.Dosage) {
  const repeat = dosage.timing?.repeat
  const frequency = repeat?.frequency
  const frequencyMax = repeat?.frequencyMax

  const period = repeat?.period
  const periodMax = repeat?.periodMax
  const periodUnit = repeat?.periodUnit

  if (!frequency && !frequencyMax) {
    if (!period && !periodMax) {
      return []
    } else if (isOne(period) && !periodMax) {
      return [
        stringifyReciprocalUnitOfTime(periodUnit)
      ]
    } else {
      //TODO - why is this fine when period is 1 but not otherwise?
      throw new Error("Period or periodMax specified without a frequency and period is not 1.")
    }
  }

  if (isOne(frequency) && !frequencyMax) {
    if (!period && !periodMax) {
      return [
        "once"
      ]
    } else if (isOne(period) && !periodMax) {
      return [
        "once ", ...stringifyStandardPeriod(dosage)
      ]
    } else {
      return stringifyStandardPeriod(dosage)
    }
  }

  if (isTwo(frequency) && !frequencyMax) {
    if (!period && !periodMax) {
      return [
        "twice"
      ]
    } else {
      return [
        "twice ", ...stringifyStandardPeriod(dosage)
      ]
    }
  }

  const elements = stringifyStandardFrequency(dosage)
  if (period || periodMax) {
    elements.push(
      " ", ...stringifyStandardPeriod(dosage)
    )
  }
  return elements
}

function stringifyStandardFrequency(dosage: fhir.Dosage) {
  const repeat = dosage.timing?.repeat
  const frequency = repeat?.frequency
  const frequencyMax = repeat?.frequencyMax
  if (frequency && frequencyMax) {
    return [
      stringifyNumericValue(frequency), " to ", stringifyNumericValue(frequencyMax), " times"
    ]
  } else if (frequency) {
    return [
      stringifyNumericValue(frequency), " times"
    ]
  } else {
    return [
      "up to ", stringifyNumericValue(frequencyMax), " times"
    ]
  }
}

function stringifyStandardPeriod(dosage: fhir.Dosage) {
  const repeat = dosage.timing?.repeat
  const period = repeat?.period
  const periodMax = repeat?.periodMax
  const periodUnit = repeat?.periodUnit
  if (periodMax) {
    return [
      "every ",
      stringifyNumericValue(period),
      " to ",
      stringifyNumericValue(periodMax),
      " ",
      stringifyPluralUnitOfTime(periodUnit, periodMax)
    ]
  } else if (isOne(period)) {
    return [
      getIndefiniteArticleForUnitOfTime(periodUnit), " ", stringifyUnitOfTime(periodUnit)
    ]
  } else {
    return [
      "every ", stringifyNumericValue(period), " ", stringifyPluralUnitOfTime(periodUnit, period)
    ]
  }
}

function stringifyQuantityValue(quantity: fhir.Quantity) {
  const value = quantity?.value
  return stringifyNumericValue(value)
}

function stringifyNumericValue(value: string | LosslessNumber) {
  if (value) {
    return getNumericValueAsString(value)
  }
  return null
}

function stringifyPluralQuantityUnit(quantity: fhir.Quantity) {
  const unit = stringifyQuantityUnit(quantity)
  return pluraliseUnit(unit, quantity?.value)
}

function stringifyPluralUnitOfTime(unitOfTime: fhir.UnitOfTime, value: string | LosslessNumber) {
  const unit = stringifyUnitOfTime(unitOfTime)
  return pluraliseUnit(unit, value)
}

function stringifyUnitOfTime(unitOfTime: fhir.UnitOfTime) {
  switch (unitOfTime) {
    case fhir.UnitOfTime.SECOND:
      return "second"
    case fhir.UnitOfTime.MINUTE:
      return "minute"
    case fhir.UnitOfTime.HOUR:
      return "hour"
    case fhir.UnitOfTime.DAY:
      return "day"
    case fhir.UnitOfTime.WEEK:
      return "week"
    case fhir.UnitOfTime.MONTH:
      return "month"
    case fhir.UnitOfTime.YEAR:
      return "year"
    default:
      throw new Error("Unhandled unit of time " + unitOfTime)
  }
}

function stringifyReciprocalUnitOfTime(periodUnit: fhir.UnitOfTime) {
  switch (periodUnit) {
    case fhir.UnitOfTime.SECOND:
      return "every second"
    case fhir.UnitOfTime.MINUTE:
      return "every minute"
    case fhir.UnitOfTime.HOUR:
      return "hourly"
    case fhir.UnitOfTime.DAY:
      return "daily"
    case fhir.UnitOfTime.WEEK:
      return "weekly"
    case fhir.UnitOfTime.MONTH:
      return "monthly"
    case fhir.UnitOfTime.YEAR:
      return "annually"
    default:
      throw new Error("Unhandled unit of time " + periodUnit)
  }
}

function getIndefiniteArticleForUnitOfTime(unitOfTime: fhir.UnitOfTime) {
  if (unitOfTime === fhir.UnitOfTime.HOUR) {
    return "an"
  } else {
    return "a"
  }
}

function stringifyQuantityUnit(quantity: fhir.Quantity) {
  const unit = quantity?.unit
  if (unit) {
    return unit
  }
  //TODO - if unit isn't present we might need to get this from the system and code
  // not sure whether we'll need to lookup in a map or use the code directly
  return null
}

/**
 * Naive implementation for now, can handle special cases later if needed
 */
function pluraliseUnit(unit: string, value: string | LosslessNumber) {
  if (unit) {
    if (!value || isOne(value)) {
      return unit
    } else {
      return `${unit}s`
    }
  }
  return null
}

function isOne(numericValue: string | LosslessNumber) {
  //TODO - compare number instead of string? what about 1.00?
  return stringifyNumericValue(numericValue) === "1"
}

function isTwo(numericValue: string | LosslessNumber) {
  //TODO - compare number instead of string? what about 2.00?
  return stringifyNumericValue(numericValue) === "2"
}
