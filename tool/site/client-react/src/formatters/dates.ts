import * as moment from "moment"

const ISO_DATE_TIME_FORMAT = "YYYY-MM-DD[T]HH:mm:ssZ"

export function formatDate(date: string): string {
  return formatMomentAsDate(moment.utc(date))
}

export function formatMomentAsDate(date: moment.Moment): string {
  return date.format("DD-MMM-YYYY")
}

export function formatCurrentDate(): string {
  return moment.utc().format("DD-MMM-YYYY")
}

export function formatCurrentDateTimeIsoFormat(): string {
  return moment.utc().format(ISO_DATE_TIME_FORMAT)
}
