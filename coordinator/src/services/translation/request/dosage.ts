import {fhir} from "@models"
import {getNumericValueAsString, isTruthy} from "../common"
import {LosslessNumber} from "lossless-json"
import moment from "moment"

export function stringifyDosage(dosageInstruction: fhir.Dosage): string {
  const dosageParts = [
    stringifyMethod(dosageInstruction),
    stringifyDose(dosageInstruction),
    stringifyRate(dosageInstruction),
    stringifyDuration(dosageInstruction),
    stringifyFrequencyAndPeriod(dosageInstruction),
    stringifyOffsetAndWhen(dosageInstruction),
    stringifyDayOfWeek(dosageInstruction),
    stringifyTimeOfDay(dosageInstruction),
    stringifyRoute(dosageInstruction),
    stringifySite(dosageInstruction),
    stringifyAsNeeded(dosageInstruction),
    stringifyBounds(dosageInstruction)
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

function stringifyOffsetAndWhen(dosage: fhir.Dosage) {
  const repeat = dosage.timing?.repeat
  const offset = repeat?.offset
  const when = repeat?.when
  if (!offset && !when) {
    return []
  }

  const elements = []

  if (offset) {
    const offsetMinutesStr = getNumericValueAsString(offset)
    const offsetMinutesInt = parseInt(offsetMinutesStr)
    const [offsetValue, offsetUnit] = getOffsetValueAndUnit(offsetMinutesInt)
    elements.push(
      offsetValue, " ", pluraliseUnit(offsetUnit, offsetValue), " "
    )
  }

  const whenDisplays = when.map(whenElement => stringifyEventTiming(whenElement))
  elements.push(...getListWithSeparators(whenDisplays))

  return elements
}

function getOffsetValueAndUnit(offsetMinutes: number) {
  if (offsetMinutes % 60 !== 0) {
    return [offsetMinutes.toString(), "minute"]
  }

  const offsetHours = offsetMinutes / 60
  if (offsetHours % 24 !== 0) {
    return [offsetHours.toString(), "hour"]
  }

  const offsetDays = offsetHours / 24
  return [offsetDays.toString(), "day"]
}

function stringifyDayOfWeek(dosage: fhir.Dosage) {
  const repeat = dosage?.timing?.repeat
  const dayOfWeek = repeat?.dayOfWeek
  if (!dayOfWeek?.length) {
    return []
  }

  const elements = [
    "on "
  ]

  const dayOfWeekDisplays = dayOfWeek.map(dayOfWeekElement => getDayOfWeekDisplay(dayOfWeekElement))
  elements.push(...getListWithSeparators(dayOfWeekDisplays))

  return elements
}

function stringifyTimeOfDay(dosage: fhir.Dosage) {
  const repeat = dosage?.timing?.repeat
  const timeOfDay = repeat?.timeOfDay
  if (!timeOfDay?.length) {
    return []
  }

  const elements = [
    "at "
  ]

  const formattedTimeOfDays = timeOfDay.map(timeOfDayElement => formatTime(timeOfDayElement))
  elements.push(...getListWithSeparators(formattedTimeOfDays))

  return elements
}

function stringifyRoute(dosage: fhir.Dosage) {
  if (!dosage.route) {
    return []
  }
  return dosage.route.coding?.map(coding => coding.display)
}

function stringifySite(dosage: fhir.Dosage) {
  if (!dosage.site) {
    return []
  }
  return dosage.site.coding?.map(coding => coding.display)
}

function stringifyAsNeeded(dosage: fhir.Dosage) {
  if (dosage.asNeededCodeableConcept) {
    if (!dosage.asNeededCodeableConcept.coding?.length) {
      throw new Error("No entries in asNeededCodeableConcept.")
    }
    const asNeededDisplays = dosage.asNeededCodeableConcept.coding?.map(coding => coding.display)
    return ["as required for ", ...getListWithSeparators(asNeededDisplays)]
  } else if (dosage.asNeededBoolean) {
    return ["as required"]
  } else {
    return []
  }
}

function stringifyBounds(dosage: fhir.Dosage) {
  const repeat = dosage.timing?.repeat
  const boundsDuration = repeat?.boundsDuration
  const boundsRange = repeat?.boundsRange
  const boundsPeriod = repeat?.boundsPeriod
  if (boundsDuration) {
    return [
      "for ", stringifyQuantityValue(boundsDuration), " ", stringifyPluralQuantityUnit(boundsDuration)
    ]
  } else if (boundsRange) {
    //TODO - pluralising units as per the guide, but there's no constraint on the code system - what if the unit is "d"?
    const lowUnit = stringifyPluralQuantityUnit(boundsRange.low)
    const highUnit = stringifyPluralQuantityUnit(boundsRange.high)
    const elements = [
      "for ", stringifyQuantityValue(boundsRange.low)
    ]
    if (lowUnit !== highUnit) {
      elements.push(
        " ", lowUnit
      )
    }
    elements.push(
      " to ", stringifyQuantityValue(boundsRange.high), " ", highUnit
    )
    return elements
  } else if (boundsPeriod) {
    //TODO - boundsPeriod is not in the guide, but is allowed by FHIR - check we're representing it correctly
    if (boundsPeriod.start && boundsPeriod.end) {
      return [
        "from ", formatDate(boundsPeriod.start), " to ", formatDate(boundsPeriod.end)
      ]
    } else if (boundsPeriod.start) {
      return [
        "from ", formatDate(boundsPeriod.start)
      ]
    } else {
      return [
        "until ", formatDate(boundsPeriod.end)
      ]
    }
  } else {
    return []
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

function stringifyEventTiming(eventTiming: fhir.EventTiming) {
  switch (eventTiming) {
    case fhir.EventTiming.MORNING:
      return "during the morning"
    case fhir.EventTiming.EARLY_MORNING:
      return "during the early morning"
    case fhir.EventTiming.LATE_MORNING:
      return "during the late morning"
    case fhir.EventTiming.NOON:
      return "around 12:00pm"
    case fhir.EventTiming.AFTERNOON:
      return "during the afternoon"
    case fhir.EventTiming.EARLY_AFTERNOON:
      return "during the early afternoon"
    case fhir.EventTiming.LATE_AFTERNOON:
      return "during the late afternoon"
    case fhir.EventTiming.EVENING:
      return "during the evening"
    case fhir.EventTiming.EARLY_EVENING:
      return "during the early evening"
    case fhir.EventTiming.LATE_EVENING:
      return "during the late evening"
    case fhir.EventTiming.NIGHT:
      return "during the night"
    case fhir.EventTiming.AFTER_SLEEP:
      return "once asleep"
    case fhir.EventTiming.BEFORE_SLEEP:
      return "before sleep"
    case fhir.EventTiming.UPON_WAKING:
      return "upon waking"
    case fhir.EventTiming.AT_MEAL:
      return "at a meal"
    case fhir.EventTiming.AT_BREAKFAST:
      return "at breakfast"
    case fhir.EventTiming.AT_LUNCH:
      return "at lunch"
    case fhir.EventTiming.AT_DINNER:
      return "at dinner"
    case fhir.EventTiming.BEFORE_MEAL:
      return "before a meal"
    case fhir.EventTiming.BEFORE_BREAKFAST:
      return "before breakfast"
    case fhir.EventTiming.BEFORE_LUNCH:
      return "before lunch"
    case fhir.EventTiming.BEFORE_DINNER:
      return "before dinner"
    case fhir.EventTiming.AFTER_MEAL:
      return "after a meal"
    case fhir.EventTiming.AFTER_BREAKFAST:
      return "after breakfast"
    case fhir.EventTiming.AFTER_LUNCH:
      return "after lunch"
    case fhir.EventTiming.AFTER_DINNER:
      return "after dinner"
    default:
      throw new Error("Unhandled EventTiming " + eventTiming)
  }
}

function getDayOfWeekDisplay(dayOfWeek: fhir.DayOfWeek) {
  switch (dayOfWeek) {
    case fhir.DayOfWeek.MONDAY:
      return "Monday"
    case fhir.DayOfWeek.TUESDAY:
      return "Tuesday"
    case fhir.DayOfWeek.WEDNESDAY:
      return "Wednesday"
    case fhir.DayOfWeek.THURSDAY:
      return "Thursday"
    case fhir.DayOfWeek.FRIDAY:
      return "Friday"
    case fhir.DayOfWeek.SATURDAY:
      return "Saturday"
    case fhir.DayOfWeek.SUNDAY:
      return "Sunday"
    default:
      throw new Error("Unhandled DayOfWeek " + dayOfWeek)
  }
}

function formatTime(time: string) {
  const timeMoment = moment.utc(time, ["HH:mm:ss.SSSSSSSSS", "HH:mm:ss"], true)
  if (!timeMoment.isValid()) {
    throw new Error("Invalid time of day " + time)
  }

  if (timeMoment.get("seconds") === 0) {
    return timeMoment.format("HH:mm")
  }

  return timeMoment.format("HH:mm:ss")
}

function formatDate(dateTime: string) {
  const dateTimeMoment = moment.utc(dateTime, moment.ISO_8601, true)
  if (!dateTimeMoment.isValid()) {
    throw new Error("Invalid dateTime " + dateTime)
  }
  return dateTimeMoment.format("DD/MM/YYYY")
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

function getListWithSeparators(list: Array<string>) {
  const elements: Array<string> = []

  list.forEach((listElement, index) => {
    elements.push(listElement)
    if (index < list.length - 2) {
      elements.push(", ")
    } else if (index < list.length - 1) {
      elements.push(" and ")
    }
  })

  return elements
}
