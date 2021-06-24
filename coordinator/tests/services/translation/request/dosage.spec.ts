import {stringifyDosage} from "../../../../src/services/translation/request/dosage"
import {LosslessNumber} from "lossless-json"
import {fhir} from "@models"

describe("overall", () => {
  test("all fields are optional", () => {
    const result = stringifyDosage({})
    expect(result).toEqual("")
  })

  test("all fields are concatenated in the correct order", () => {
    const result = stringifyDosage({
      method: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "417924000",
          display: "Apply"
        }]
      },
      doseAndRate: {
        doseQuantity: {
          value: new LosslessNumber(100),
          unit: "milligram",
          system: "http://unitsofmeasure.org",
          code: "mg"
        },
        rateQuantity: {
          value: new LosslessNumber(10),
          unit: "milligram per kilogram and hour",
          system: "http://unitsofmeasure.org",
          code: "mg/(kg.h)"
        }
      },
      timing: {
        repeat: {
          duration: new LosslessNumber(2),
          durationMax: new LosslessNumber(12),
          durationUnit: fhir.UnitOfTime.HOUR,
          frequency: new LosslessNumber(2),
          period: new LosslessNumber(1),
          periodUnit: fhir.UnitOfTime.DAY,
          offset: new LosslessNumber(60),
          when: [
            fhir.EventTiming.BEFORE_LUNCH
          ],
          dayOfWeek: [
            fhir.DayOfWeek.MONDAY
          ],
          timeOfDay: [
            "12:00:00"
          ],
          boundsDuration: {
            value: new LosslessNumber("3"),
            unit: "day"
          }
        }
      },
      route: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "34206005",
          display: "subcutaneous route"
        }]
      },
      site: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "368209003",
          display: "Right arm"
        }]
      },
      asNeededBoolean: true
    })
    // eslint-disable-next-line max-len
    expect(result).toEqual("Apply 100 milligram at a rate of 10 milligram per kilogram and hour over 2 hours (maximum 12 hours). twice a day 1 hour before lunch on Monday at 12:00 subcutaneous route Right arm as required for 3 days")
  })
})

describe("method", () => {
  test("method is added correctly", () => {
    const result = stringifyDosage({
      method: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "417924000",
          display: "Apply"
        }]
      }
    })
    expect(result).toEqual("Apply")
  })

  test("missing display results in an error", () => {
    expect(() => stringifyDosage({
      method: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "417924000"
        }]
      }
    })).toThrow(Error)
  })
})

describe("dose", () => {
  describe("doseQuantity", () => {
    test("doseQuantity is added correctly", () => {
      const result = stringifyDosage({
        doseAndRate: {
          doseQuantity: {
            "value": new LosslessNumber(10),
            "unit": "milligram"
          }
        }
      })
      expect(result).toEqual("10 milligram")
    })

    test("missing value results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          doseQuantity: {
            "unit": "milligram"
          }
        }
      })).toThrow(Error)
    })

    test("missing unit results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          doseQuantity: {
            "value": new LosslessNumber(10)
          }
        }
      })).toThrow(Error)
    })
  })

  describe("doseRange", () => {
    test("doseRange is added correctly (low and high units equal)", () => {
      const result = stringifyDosage({
        doseAndRate: {
          doseRange: {
            low: {
              "value": new LosslessNumber(10),
              "unit": "milligram"
            },
            high: {
              "value": new LosslessNumber(20),
              "unit": "milligram"
            }
          }
        }
      })
      expect(result).toEqual("10 to 20 milligram")
    })

    test("doseRange is added correctly (low and high units not equal)", () => {
      const result = stringifyDosage({
        doseAndRate: {
          doseRange: {
            low: {
              "value": new LosslessNumber(500),
              "unit": "milligram"
            },
            high: {
              "value": new LosslessNumber(1),
              "unit": "gram"
            }
          }
        }
      })
      expect(result).toEqual("500 milligram to 1 gram")
    })

    test("missing low value results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          doseRange: {
            low: {
              "unit": "milligram"
            },
            high: {
              "value": new LosslessNumber(20),
              "unit": "milligram"
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing high value results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          doseRange: {
            low: {
              "value": new LosslessNumber(10),
              "unit": "milligram"
            },
            high: {
              "unit": "milligram"
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing high unit results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          doseRange: {
            low: {
              "value": new LosslessNumber(10),
              "unit": "milligram"
            },
            high: {
              "value": new LosslessNumber(20)
            }
          }
        }
      })).toThrow(Error)
    })
  })
})

describe("rate", () => {
  describe("rateRatio", () => {
    test("rateRatio is added correctly (denominator = 1)", () => {
      const result = stringifyDosage({
        doseAndRate: {
          rateRatio: {
            numerator: {
              value: new LosslessNumber(100),
              unit: "millilitre"
            },
            denominator: {
              value: new LosslessNumber(1),
              unit: "hour"
            }
          }
        }
      })
      expect(result).toEqual("at a rate of 100 millilitre per hour")
    })

    test("rateRatio is added correctly (denominator > 1)", () => {
      const result = stringifyDosage({
        doseAndRate: {
          rateRatio: {
            numerator: {
              value: new LosslessNumber(100),
              unit: "millilitre"
            },
            denominator: {
              value: new LosslessNumber(2),
              unit: "hour"
            }
          }
        }
      })
      expect(result).toEqual("at a rate of 100 millilitre every 2 hours")
    })

    test("missing numerator value results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          rateRatio: {
            numerator: {
              unit: "millilitre"
            },
            denominator: {
              value: new LosslessNumber(2),
              unit: "hour"
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing numerator unit results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          rateRatio: {
            numerator: {
              value: new LosslessNumber(100)
            },
            denominator: {
              value: new LosslessNumber(2),
              unit: "hour"
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing denominator value results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          rateRatio: {
            numerator: {
              value: new LosslessNumber(100),
              unit: "millilitre"
            },
            denominator: {
              unit: "hour"
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing denominator unit results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          rateRatio: {
            numerator: {
              value: new LosslessNumber(100),
              unit: "millilitre"
            },
            denominator: {
              value: new LosslessNumber(2)
            }
          }
        }
      })).toThrow(Error)
    })
  })

  describe("rateRange", () => {
    test("rateRange is added correctly (low and high units equal)", () => {
      const result = stringifyDosage({
        doseAndRate: {
          rateRange: {
            low: {
              value: new LosslessNumber(1),
              unit: "liter per minute"
            },
            high: {
              value: new LosslessNumber(2),
              unit: "liter per minute"
            }
          }
        }
      })
      expect(result).toEqual("at a rate of 1 to 2 liter per minute")
    })

    test("rateRange is added correctly (low and high units not equal)", () => {
      const result = stringifyDosage({
        doseAndRate: {
          rateRange: {
            low: {
              value: new LosslessNumber(500),
              unit: "milliliter per minute"
            },
            high: {
              value: new LosslessNumber(1),
              unit: "liter per minute"
            }
          }
        }
      })
      expect(result).toEqual("at a rate of 500 milliliter per minute to 1 liter per minute")
    })

    test("missing low value results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          rateRange: {
            low: {
              unit: "liter per minute"
            },
            high: {
              value: new LosslessNumber(2),
              unit: "liter per minute"
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing high value results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          rateRange: {
            low: {
              value: new LosslessNumber(1),
              unit: "liter per minute"
            },
            high: {
              unit: "liter per minute"
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing high unit results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          rateRange: {
            low: {
              value: new LosslessNumber(1),
              unit: "liter per minute"
            },
            high: {
              value: new LosslessNumber(2)
            }
          }
        }
      })).toThrow(Error)
    })
  })

  describe("rateQuantity", () => {
    test("rateQuantity is added correctly", () => {
      const result = stringifyDosage({
        doseAndRate: {
          rateQuantity: {
            value: new LosslessNumber(10),
            unit: "milligram per kilogram and hour"
          }
        }
      })
      expect(result).toEqual("at a rate of 10 milligram per kilogram and hour")
    })

    test("missing value results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          rateQuantity: {
            unit: "milligram per kilogram and hour"
          }
        }
      })).toThrow(Error)
    })

    test("missing unit results in an error", () => {
      expect(() => stringifyDosage({
        doseAndRate: {
          rateQuantity: {
            value: new LosslessNumber(10)
          }
        }
      })).toThrow(Error)
    })
  })
})

describe("duration", () => {
  test("duration is added correctly when durationMax is not present (duration = 1)", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          duration: new LosslessNumber(1),
          durationUnit: fhir.UnitOfTime.HOUR
        }
      }
    })
    expect(result).toEqual("over 1 hour.")
  })

  test("duration is added correctly when durationMax is not present (duration > 1)", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          duration: new LosslessNumber(2),
          durationUnit: fhir.UnitOfTime.HOUR
        }
      }
    })
    expect(result).toEqual("over 2 hours.")
  })

  test("duration is added correctly when durationMax is present (durationMax = 1)", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          duration: new LosslessNumber(1),
          durationMax: new LosslessNumber(1),
          durationUnit: fhir.UnitOfTime.HOUR
        }
      }
    })
    expect(result).toEqual("over 1 hour (maximum 1 hour).")
  })

  test("duration is added correctly when durationMax is present (durationMax > 1)", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          duration: new LosslessNumber(1),
          durationMax: new LosslessNumber(2),
          durationUnit: fhir.UnitOfTime.HOUR
        }
      }
    })
    expect(result).toEqual("over 1 hour (maximum 2 hours).")
  })

  test("missing durationUnit results in an error", () => {
    expect(() => stringifyDosage({
      timing: {
        repeat: {
          duration: new LosslessNumber(1)
        }
      }
    })).toThrow(Error)
  })
})

describe("frequency and period", () => {
  describe("no frequency", () => {
    test("follows general case if frequencyMax is present", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequencyMax: new LosslessNumber(2),
            period: new LosslessNumber(1),
            periodUnit: fhir.UnitOfTime.DAY
          }
        }
      })
      expect(result).toEqual("up to 2 times a day")
    })

    test("period is added correctly (period = 1)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            period: new LosslessNumber(1),
            periodUnit: fhir.UnitOfTime.DAY
          }
        }
      })
      expect(result).toEqual("daily")
    })

    test("results in an error if periodMax is present (period = 1)", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            period: new LosslessNumber(1),
            periodMax: new LosslessNumber(2),
            periodUnit: fhir.UnitOfTime.DAY
          }
        }
      })).toThrow(Error)
    })

    test("missing periodUnit results in an error (period = 1)", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            period: new LosslessNumber(1)
          }
        }
      })).toThrow(Error)
    })

    test("invalid periodUnit results in an error (period = 1)", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            period: new LosslessNumber(1),
            periodUnit: "ms" as fhir.UnitOfTime
          }
        }
      })).toThrow(Error)
    })

    test("results in an error (period != 1)", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            period: new LosslessNumber(2),
            periodUnit: fhir.UnitOfTime.DAY
          }
        }
      })).toThrow(Error)
    })
  })

  describe("frequency = 1", () => {
    test("follows general case if frequencyMax is present", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(1),
            frequencyMax: new LosslessNumber(2)
          }
        }
      })
      expect(result).toEqual("1 to 2 times")
    })

    test("frequency is added correctly (period not present)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(1)
          }
        }
      })
      expect(result).toEqual("once")
    })

    test("frequency and period are added correctly (period = 1, periodUnit = h)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(1),
            period: new LosslessNumber(1),
            periodUnit: fhir.UnitOfTime.HOUR
          }
        }
      })
      expect(result).toEqual("once an hour")
    })

    test("frequency and period are added correctly (period = 1, periodUnit = d)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(1),
            period: new LosslessNumber(1),
            periodUnit: fhir.UnitOfTime.DAY
          }
        }
      })
      expect(result).toEqual("once a day")
    })

    test("frequency and period are added correctly if periodMax is present (period = 1)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(1),
            period: new LosslessNumber(1),
            periodMax: new LosslessNumber(2),
            periodUnit: fhir.UnitOfTime.HOUR
          }
        }
      })
      expect(result).toEqual("every 1 to 2 hours")
    })

    test("frequency and period are added correctly (period > 1)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(1),
            period: new LosslessNumber(8),
            periodUnit: fhir.UnitOfTime.HOUR
          }
        }
      })
      expect(result).toEqual("every 8 hours")
    })
  })

  describe("frequency = 2", () => {
    test("follows general case if frequencyMax is present", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(2),
            frequencyMax: new LosslessNumber(3)
          }
        }
      })
      expect(result).toEqual("2 to 3 times")
    })

    test("frequency is added correctly (period not present)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(2)
          }
        }
      })
      expect(result).toEqual("twice")
    })

    test("frequency and period are added correctly (period present)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(2),
            period: new LosslessNumber(8),
            periodUnit: fhir.UnitOfTime.HOUR
          }
        }
      })
      expect(result).toEqual("twice every 8 hours")
    })
  })

  describe("general case", () => {
    test("frequency is added correctly when frequency and frequencyMax are present", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(4),
            frequencyMax: new LosslessNumber(8)
          }
        }
      })
      expect(result).toEqual("4 to 8 times")
    })

    test("frequency is added correctly when frequency is present", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(4)
          }
        }
      })
      expect(result).toEqual("4 times")
    })

    test("frequency is added correctly when frequencyMax is present", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequencyMax: new LosslessNumber(8)
          }
        }
      })
      expect(result).toEqual("up to 8 times")
    })

    test("period is added correctly when periodMax is present", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(3),
            period: new LosslessNumber(4),
            periodMax: new LosslessNumber(8),
            periodUnit: fhir.UnitOfTime.HOUR
          }
        }
      })
      expect(result).toEqual("3 times every 4 to 8 hours")
    })

    test("period is added correctly when periodMax is not present (period = 1)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(3),
            period: new LosslessNumber(1),
            periodUnit: fhir.UnitOfTime.HOUR
          }
        }
      })
      expect(result).toEqual("3 times an hour")
    })

    test("period is added correctly when periodMax is not present (period > 1)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(3),
            period: new LosslessNumber(4),
            periodUnit: fhir.UnitOfTime.HOUR
          }
        }
      })
      expect(result).toEqual("3 times every 4 hours")
    })

    test("missing periodUnit results in an error", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(3),
            period: new LosslessNumber(2)
          }
        }
      })).toThrow(Error)
    })

    test("periodMax with no period results in an error", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            frequency: new LosslessNumber(3),
            periodMax: new LosslessNumber(2),
            periodUnit: fhir.UnitOfTime.HOUR
          }
        }
      })).toThrow(Error)
    })
  })
})

describe("offset and when", () => {
  test("offset and when are added correctly (offset in minutes)", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          offset: new LosslessNumber(90),
          when: [
            fhir.EventTiming.BEFORE_MEAL
          ]
        }
      }
    })
    expect(result).toEqual("90 minutes before a meal")
  })

  test("offset and when are added correctly (offset in hours)", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          offset: new LosslessNumber(60),
          when: [
            fhir.EventTiming.AFTER_BREAKFAST
          ]
        }
      }
    })
    expect(result).toEqual("1 hour after breakfast")
  })

  test("offset and when are added correctly (offset in days!?)", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          offset: new LosslessNumber(2880),
          when: [
            fhir.EventTiming.BEFORE_LUNCH
          ]
        }
      }
    })
    expect(result).toEqual("2 days before lunch")
  })

  test("when is added correctly (no offset)", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          when: [
            fhir.EventTiming.AFTER_SLEEP
          ]
        }
      }
    })
    expect(result).toEqual("once asleep")
  })

  test("multiple whens are added correctly", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          when: [
            fhir.EventTiming.AT_BREAKFAST,
            fhir.EventTiming.AT_LUNCH,
            fhir.EventTiming.AT_DINNER
          ]
        }
      }
    })
    expect(result).toEqual("at breakfast, at lunch and at dinner")
  })

  test("invalid when results in an error", () => {
    expect(() => stringifyDosage({
      timing: {
        repeat: {
          offset: new LosslessNumber(60),
          when: [
            "bob" as fhir.EventTiming
          ]
        }
      }
    })).toThrow(Error)
  })

  test("missing when results in an error", () => {
    expect(() => stringifyDosage({
      timing: {
        repeat: {
          offset: new LosslessNumber(60)
        }
      }
    })).toThrow(Error)
  })
})

describe("dayOfWeek", () => {
  test("single entry is added correctly", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          dayOfWeek: [
            fhir.DayOfWeek.MONDAY
          ]
        }
      }
    })
    expect(result).toEqual("on Monday")
  })

  test("multiple entries are added correctly", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          dayOfWeek: [
            fhir.DayOfWeek.MONDAY,
            fhir.DayOfWeek.WEDNESDAY,
            fhir.DayOfWeek.FRIDAY
          ]
        }
      }
    })
    expect(result).toEqual("on Monday, Wednesday and Friday")
  })

  test("invalid day of week results in an error", () => {
    expect(() => stringifyDosage({
      timing: {
        repeat: {
          dayOfWeek: [
            "bob" as fhir.DayOfWeek
          ]
        }
      }
    })).toThrow(Error)
  })
})

describe("timeOfDay", () => {
  test("single entry is added correctly", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          timeOfDay: [
            "12:00:00"
          ]
        }
      }
    })
    expect(result).toEqual("at 12:00")
  })

  test("multiple entries are added correctly", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          timeOfDay: [
            "08:00:00",
            "12:00:00",
            "16:00:00",
            "20:00:00"
          ]
        }
      }
    })
    expect(result).toEqual("at 08:00, 12:00, 16:00 and 20:00")
  })

  test("time format includes seconds when required", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          timeOfDay: [
            "12:00:30"
          ]
        }
      }
    })
    expect(result).toEqual("at 12:00:30")
  })

  test("milliseconds are ignored", () => {
    const result = stringifyDosage({
      timing: {
        repeat: {
          timeOfDay: [
            "12:00:00.500"
          ]
        }
      }
    })
    expect(result).toEqual("at 12:00")
  })

  test("invalid time results in an error", () => {
    expect(() => stringifyDosage({
      timing: {
        repeat: {
          timeOfDay: [
            "12:99"
          ]
        }
      }
    })).toThrow(Error)
  })
})

describe("route", () => {
  test("route is added correctly", () => {
    const result = stringifyDosage({
      route: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "26643006",
          display: "oral"
        }]
      }
    })
    expect(result).toEqual("oral")
  })

  test("missing display results in an error", () => {
    expect(() => stringifyDosage({
      route: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "26643006"
        }]
      }
    })).toThrow(Error)
  })
})

describe("site", () => {
  test("site is added correctly", () => {
    const result = stringifyDosage({
      site: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "8966001",
          display: "Left eye"
        }]
      }
    })
    expect(result).toEqual("Left eye")
  })

  test("missing display results in an error", () => {
    expect(() => stringifyDosage({
      site: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "8966001"
        }]
      }
    })).toThrow(Error)
  })
})

describe("asNeeded", () => {
  describe("asNeededBoolean", () => {
    test("asNeededBoolean is added correctly when set to true", () => {
      const result = stringifyDosage({
        asNeededBoolean: true
      })
      expect(result).toEqual("as required")
    })

    test("asNeededBoolean has no effect when set to false", () => {
      const result = stringifyDosage({
        asNeededBoolean: false
      })
      expect(result).toEqual("")
    })
  })

  describe("asNeededCodeableConcept", () => {
    test("single entry is added correctly", () => {
      const result = stringifyDosage({
        asNeededCodeableConcept: {
          coding: [{
            system: "http://snomed.info/sct",
            code: "422587007",
            display: "nausea"
          }]
        }
      })
      expect(result).toEqual("as required for nausea")
    })

    test("multiple entries are added correctly", () => {
      const result = stringifyDosage({
        asNeededCodeableConcept: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "422587007",
              display: "Nausea"
            },
            {
              system: "http://snomed.info/sct",
              code: "4473006",
              display: "Migraine with aura"
            },
            {
              system: "http://snomed.info/sct",
              code: "3199001",
              display: "Sprain of shoulder joint"
            }
          ]
        }
      })
      expect(result).toEqual("as required for Nausea, Migraine with aura and Sprain of shoulder joint")
    })

    test("missing coding results in an error", () => {
      expect(() => stringifyDosage({
        asNeededCodeableConcept: {
          coding: []
        }
      })).toThrow(Error)
    })

    test("missing display results in an error", () => {
      expect(() => stringifyDosage({
        asNeededCodeableConcept: {
          coding: [{
            system: "http://snomed.info/sct",
            code: "3199001"
          }]
        }
      })).toThrow(Error)
    })
  })
})

describe("bounds", () => {
  describe("boundsDuration", () => {
    test("boundsDuration is added correctly", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            boundsDuration: {
              value: new LosslessNumber(3),
              unit: "day"
            }
          }
        }
      })
      expect(result).toEqual("for 3 days")
    })

    test("missing value results in an error", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            boundsDuration: {
              unit: "day"
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing unit results in an error", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            boundsDuration: {
              value: new LosslessNumber(3)
            }
          }
        }
      })).toThrow(Error)
    })
  })

  describe("boundsRange", () => {
    test("boundsRange is added correctly (low and high units equal)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            boundsRange: {
              low: {
                value: new LosslessNumber(3),
                unit: "day"
              },
              high: {
                value: new LosslessNumber(5),
                unit: "day"
              }
            }
          }
        }
      })
      expect(result).toEqual("for 3 to 5 days")
    })

    test("boundsRange is added correctly (low and high units not equal)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            boundsRange: {
              low: {
                value: new LosslessNumber(10),
                unit: "minute"
              },
              high: {
                value: new LosslessNumber(1),
                unit: "hour"
              }
            }
          }
        }
      })
      expect(result).toEqual("for 10 minutes to 1 hour")
    })

    test("missing low value results in an error", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            boundsRange: {
              low: {
                unit: "minute"
              },
              high: {
                value: new LosslessNumber(1),
                unit: "hour"
              }
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing low unit results in an error", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            boundsRange: {
              low: {
                value: new LosslessNumber(10)
              },
              high: {
                value: new LosslessNumber(1),
                unit: "hour"
              }
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing high value results in an error", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            boundsRange: {
              low: {
                value: new LosslessNumber(10),
                unit: "minute"
              },
              high: {
                unit: "hour"
              }
            }
          }
        }
      })).toThrow(Error)
    })

    test("missing high unit results in an error", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            boundsRange: {
              low: {
                value: new LosslessNumber(10),
                unit: "minute"
              },
              high: {
                value: new LosslessNumber(1)
              }
            }
          }
        }
      })).toThrow(Error)
    })
  })

  describe("boundsPeriod", () => {
    test("boundsPeriod is added correctly (start only)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            boundsPeriod: {
              start: "2021-06-24"
            }
          }
        }
      })
      expect(result).toEqual("from 24/06/2021")
    })

    test("boundsPeriod is added correctly (start and end)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            boundsPeriod: {
              start: "2021-06-24",
              end: "2021-07-24"
            }
          }
        }
      })
      expect(result).toEqual("from 24/06/2021 to 24/07/2021")
    })

    test("boundsPeriod is added correctly (end only)", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            boundsPeriod: {
              end: "2021-07-24"
            }
          }
        }
      })
      expect(result).toEqual("until 24/07/2021")
    })

    test("time component is ignored", () => {
      const result = stringifyDosage({
        timing: {
          repeat: {
            boundsPeriod: {
              start: "2021-06-24T10:45:00.000Z"
            }
          }
        }
      })
      expect(result).toEqual("from 24/06/2021")
    })

    test("invalid date results in an error", () => {
      expect(() => stringifyDosage({
        timing: {
          repeat: {
            boundsPeriod: {
              start: "2021-06-35T10:45:00.000Z"
            }
          }
        }
      })).toThrow(Error)
    })
  })
})
